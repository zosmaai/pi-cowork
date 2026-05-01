import type { ChatMessage, ToolCallInfo } from "@/types";
import type {
	CoworkErrorPayload,
	PiErrorEvent,
	PiEvent,
	PiMessageUpdateEvent,
	PiToolCall,
	PiToolExecutionEndEvent,
	PiToolExecutionUpdateEvent,
} from "@/types/pi-events";
import { Channel, invoke } from "@tauri-apps/api/core";
import { useCallback, useReducer, useRef } from "react";

export interface StreamState {
	messages: ChatMessage[];
	streamingMessage: ChatMessage | null;
	isRunning: boolean;
	status: "idle" | "thinking" | "tool_call" | "responding" | "error";
	error: string | null;
	/** Structured error payload from the backend (v0.3.0+). */
	errorPayload: CoworkErrorPayload | null;
}

export type StreamAction =
	| { type: "START_STREAM"; prompt: string }
	| { type: "TEXT_DELTA"; delta: string }
	| { type: "THINKING_DELTA"; delta: string }
	| { type: "MODEL_INFO"; model: string; provider: string }
	| { type: "TOOL_CALL_START"; toolCall: ToolCallInfo }
	| {
			type: "TOOL_CALL_UPDATE";
			id: string;
			result: string;
			status: "running" | "completed" | "error";
			isError?: boolean;
	  }
	| { type: "TURN_RESET" }
	| { type: "STREAM_COMPLETE" }
	| { type: "STREAM_ERROR"; error: string; errorPayload?: CoworkErrorPayload }
	| { type: "ABORT_STREAM" }
	| { type: "LOAD_SESSION"; messages: ChatMessage[] }
	| { type: "RESET" };

export const INITIAL_STATE: StreamState = {
	messages: [],
	streamingMessage: null,
	isRunning: false,
	status: "idle",
	error: null,
	errorPayload: null,
};

export function streamReducer(state: StreamState, action: StreamAction): StreamState {
	switch (action.type) {
		case "START_STREAM":
			return {
				...INITIAL_STATE,
				isRunning: true,
				status: "thinking",
				messages: [
					{
						id: crypto.randomUUID(),
						role: "user",
						content: action.prompt,
						timestamp: Date.now(),
					},
				],
				streamingMessage: {
					id: crypto.randomUUID(),
					role: "assistant",
					content: "",
					thinking: "",
					isStreaming: true,
					toolCalls: [],
					timestamp: Date.now(),
				},
			};

		/**
		 * TURN_RESET — accumulates into the SAME assistant message.
		 *
		 * When pi starts a new assistant message in its agentic loop (e.g. after
		 * receiving a tool result), we DON'T create a new message. Instead we
		 * keep the same streaming message, preserve all accumulated tool calls,
		 * and reset content/thinking so the next turn's output overwrites.
		 *
		 * This gives a single "Pi" message per user prompt, with all tool calls
		 * shown as a timeline within it — exactly like the pi TUI.
		 */
		case "TURN_RESET": {
			const msg = state.streamingMessage;
			if (!msg) return state;
			return {
				...state,
				streamingMessage: {
					...msg,
					// Reset content: previous turn's text was typically empty
					// (model called a tool) or just working text. The final
					// turn will have the real response.
					content: "",
					thinking: "",
					// Keep accumulated tool calls across all turns
					toolCalls: msg.toolCalls || [],
					isStreaming: true,
				},
				status: "thinking",
			};
		}

		case "TEXT_DELTA": {
			const msg = state.streamingMessage;
			if (!msg) return state;
			return {
				...state,
				streamingMessage: { ...msg, content: msg.content + action.delta },
				status: "responding",
			};
		}

		case "THINKING_DELTA": {
			const msg = state.streamingMessage;
			if (!msg) return state;
			return {
				...state,
				streamingMessage: {
					...msg,
					thinking: (msg.thinking || "") + action.delta,
				},
				status: "thinking",
			};
		}

		case "MODEL_INFO": {
			const msg = state.streamingMessage;
			if (!msg) return state;
			return {
				...state,
				streamingMessage: {
					...msg,
					model: action.model,
					provider: action.provider,
				},
			};
		}

		case "TOOL_CALL_START": {
			const msg = state.streamingMessage;
			if (!msg) return state;
			// Deduplicate by tool call ID
			const existing = msg.toolCalls || [];
			if (existing.some((tc) => tc.id === action.toolCall.id)) {
				return state;
			}
			return {
				...state,
				streamingMessage: {
					...msg,
					toolCalls: [...existing, action.toolCall],
				},
				status: "tool_call",
			};
		}

		case "TOOL_CALL_UPDATE": {
			const msg = state.streamingMessage;
			if (!msg || !msg.toolCalls) return state;
			return {
				...state,
				streamingMessage: {
					...msg,
					toolCalls: msg.toolCalls.map((tc) =>
						tc.id === action.id
							? {
									...tc,
									status: action.status,
									result: action.result,
									isError: action.isError,
								}
							: tc,
					),
				},
			};
		}

		case "STREAM_COMPLETE": {
			const msg = state.streamingMessage;
			if (!msg) {
				return { ...state, isRunning: false, status: "idle", streamingMessage: null };
			}
			return {
				...state,
				isRunning: false,
				status: "idle",
				messages: [...state.messages, { ...msg, isStreaming: false }],
				streamingMessage: null,
			};
		}

		case "STREAM_ERROR":
			return {
				...state,
				isRunning: false,
				status: "idle",
				error: action.error,
				errorPayload: action.errorPayload ?? null,
			};

		case "ABORT_STREAM": {
			// Save partial message if it has meaningful content
			const current = state.streamingMessage;
			const hasContent =
				current &&
				(current.content ||
					current.thinking ||
					(current.toolCalls && current.toolCalls.length > 0));
			if (hasContent) {
				return {
					...state,
					isRunning: false,
					status: "idle",
					messages: [...state.messages, { ...current, isStreaming: false }],
					streamingMessage: null,
				};
			}
			return { ...state, isRunning: false, status: "idle" };
		}

		case "LOAD_SESSION":
			return {
				...INITIAL_STATE,
				messages: action.messages,
			};

		case "RESET":
			return INITIAL_STATE;

		default:
			return state;
	}
}

/**
 * Safely extract tool call info from pi's actual event format.
 * Pi emits toolCall with {type:"toolCall", id, name, arguments}
 * NOT the Anthropic-style {id, type:"function", function:{name,arguments}} format.
 */
function extractToolCallInfo(tc: PiToolCall): ToolCallInfo {
	// Handle pi's actual format: {type:"toolCall", id, name, arguments}
	if ("name" in tc && typeof tc.name === "string") {
		return {
			id: tc.id,
			name: tc.name,
			args: tc.arguments || {},
			status: "running" as const,
		};
	}
	// Handle legacy Anthropic-style format: {id, type:"function", function:{name,arguments}}
	const legacy = tc as unknown as {
		id: string;
		function?: { name: string; arguments: string };
	};
	let args: Record<string, unknown> = {};
	try {
		if (legacy.function?.arguments) {
			args = JSON.parse(legacy.function.arguments);
		}
	} catch {
		args = { raw: legacy.function?.arguments || "" };
	}
	return {
		id: legacy.id || tc.id,
		name: legacy.function?.name || "unknown",
		args,
		status: "running" as const,
	};
}

export function usePiStream() {
	const [state, dispatch] = useReducer(streamReducer, INITIAL_STATE);
	const streamingRef = useRef(state.streamingMessage);
	streamingRef.current = state.streamingMessage;

	const startStream = useCallback(async (prompt: string, sessionId?: string) => {
		dispatch({ type: "START_STREAM", prompt });

		// Lazily create a session if one isn't provided.
		let sid = sessionId;
		if (!sid) {
			sid = crypto.randomUUID();
			await invoke("create_session", { sessionId: sid });
		}

		const channel = new Channel<PiEvent>();

		channel.onmessage = (event: PiEvent) => {
			try {
				switch (event.type) {
					case "message_update": {
						const msgEvent = event as PiMessageUpdateEvent;
						const ame = msgEvent.assistantMessageEvent;

						// Extract model info from any message_update
						if (msgEvent.message?.model || msgEvent.message?.provider) {
							dispatch({
								type: "MODEL_INFO",
								model: msgEvent.message.model || "",
								provider: msgEvent.message.provider || "",
							});
						}

						switch (ame.type) {
							case "thinking_start":
								dispatch({ type: "THINKING_DELTA", delta: "" });
								break;
							case "thinking_delta":
								dispatch({ type: "THINKING_DELTA", delta: ame.delta });
								break;
							case "thinking_end":
								// Thinking block ended, no action needed
								break;
							case "text_start":
								// Text block starting, status transitions via TEXT_DELTA
								break;
							case "text_delta":
								dispatch({ type: "TEXT_DELTA", delta: ame.delta });
								break;
							case "text_end":
								// Text block ended, no action needed
								break;
							case "toolcall_start": {
								// Tool call arguments starting to stream
								// We'll create the tool call entry once toolcall_end arrives
								// with the full argument object
								break;
							}
							case "toolcall_delta":
								// Tool call arguments still streaming, ignore deltas
								break;
							case "toolcall_end": {
								const tc = ame.toolCall;
								dispatch({
									type: "TOOL_CALL_START",
									toolCall: extractToolCallInfo(tc),
								});
								break;
							}
							case "done":
								// Assistant message done, but stream may continue with tool results
								break;
							case "error": {
								const reason = ame.reason === "aborted" ? "Stream aborted" : "Stream error";
								dispatch({
									type: "STREAM_ERROR",
									error: reason,
									errorPayload: {
										message: reason,
										code: ame.reason === "aborted" ? "aborted" : "error",
										retryable: false,
									},
								});
								break;
							}
						}
						break;
					}

					case "message_start": {
						// When a new assistant message starts mid-stream (agentic turn),
						// reset content/thinking but KEEP accumulated tool calls in the
						// same message — this gives a single Pi message per user prompt
						// with all tool calls shown as a timeline within it.
						const msg = event.message;
						if (msg?.role === "assistant" && streamingRef.current) {
							dispatch({ type: "TURN_RESET" });
						}
						break;
					}

					case "message_end":
						// Message ended, but more may follow
						break;

					case "tool_execution_start": {
						// Tool is beginning execution
						break;
					}

					case "tool_execution_update": {
						const te = event as PiToolExecutionUpdateEvent;
						dispatch({
							type: "TOOL_CALL_UPDATE",
							id: te.toolCallId,
							result: te.partialResult.content.map((c) => c.text).join(""),
							status: "running",
						});
						break;
					}

					case "tool_execution_end": {
						const te = event as PiToolExecutionEndEvent;
						dispatch({
							type: "TOOL_CALL_UPDATE",
							id: te.toolCallId,
							result: te.result.content.map((c) => c.text).join(""),
							status: te.isError ? "error" : "completed",
							isError: te.isError,
						});
						break;
					}

					case "turn_end":
						// Turn ended, a new turn may start
						break;

					case "turn_start":
						// New turn starting
						break;

					case "agent_end": {
						dispatch({ type: "STREAM_COMPLETE" });
						break;
					}

					case "done":
						dispatch({ type: "STREAM_COMPLETE" });
						break;

					case "error": {
						const errEvent = event as PiErrorEvent;
						dispatch({
							type: "STREAM_ERROR",
							error: errEvent.message || "Unknown error",
							errorPayload: {
								message: errEvent.message || "Unknown error",
								details: errEvent.details,
								provider: errEvent.provider,
								model: errEvent.model,
								code: errEvent.code,
								retryable: errEvent.retryable ?? false,
							},
						});
						break;
					}

					// Ignore session, agent_start, queue_update, compaction, auto_retry, etc.
					default:
						break;
				}
			} catch (err) {
				console.error("[cowork] Error processing stream event:", err, event);
				// Don't crash the stream — continue processing events
			}
		};

		try {
			await invoke("send_prompt", {
				sessionId: sid,
				prompt,
				channel,
			});
		} catch (err) {
			dispatch({
				type: "STREAM_ERROR",
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}, []);

	const abortStream = useCallback(async (sessionId?: string) => {
		dispatch({ type: "ABORT_STREAM" });
		if (sessionId) {
			try {
				await invoke<boolean>("abort_session", { sessionId });
			} catch {
				// ignore
			}
		}
	}, []);

	return { state, startStream, abortStream, dispatch };
}
