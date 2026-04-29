import type { ChatMessage, ToolCallInfo } from "@/types";
import type {
	PiEvent,
	PiMessageUpdateEvent,
	PiToolExecutionEndEvent,
	PiToolExecutionUpdateEvent,
	PiAgentEndEvent,
} from "@/types/pi-events";
import { Channel, invoke } from "@tauri-apps/api/core";
import { useCallback, useReducer } from "react";

export interface StreamState {
	messages: ChatMessage[];
	streamingMessage: ChatMessage | null;
	isRunning: boolean;
	status: "idle" | "thinking" | "tool_call" | "responding" | "error";
	error: string | null;
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
	| { type: "STREAM_COMPLETE" }
	| { type: "STREAM_ERROR"; error: string }
	| { type: "ABORT_STREAM" }
	| { type: "LOAD_SESSION"; messages: ChatMessage[] }
	| { type: "RESET" };

export const INITIAL_STATE: StreamState = {
	messages: [],
	streamingMessage: null,
	isRunning: false,
	status: "idle",
	error: null,
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
			return {
				...state,
				streamingMessage: {
					...msg,
					toolCalls: [...(msg.toolCalls || []), action.toolCall],
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
			};

		case "ABORT_STREAM":
			return { ...state, isRunning: false, status: "idle" };

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

export function usePiStream() {
	const [state, dispatch] = useReducer(streamReducer, INITIAL_STATE);

	const startStream = useCallback(async (prompt: string) => {
		dispatch({ type: "START_STREAM", prompt });

		const channel = new Channel<PiEvent>();

		channel.onmessage = (event: PiEvent) => {
			switch (event.type) {
				case "message_update": {
					const msgEvent = event as PiMessageUpdateEvent;
					const ame = msgEvent.assistantMessageEvent;

					if (msgEvent.message.model || msgEvent.message.provider) {
						dispatch({
							type: "MODEL_INFO",
							model: msgEvent.message.model || "",
							provider: msgEvent.message.provider || "",
						});
					}

					switch (ame.type) {
						case "thinking_delta":
							dispatch({ type: "THINKING_DELTA", delta: ame.delta });
							break;
						case "text_start":
							// Status transitions to responding via TEXT_DELTA
							break;
						case "text_delta":
							dispatch({ type: "TEXT_DELTA", delta: ame.delta });
							break;
						case "toolcall_end": {
							const tc = ame.toolCall;
							let args: Record<string, unknown> = {};
							try {
								args = JSON.parse(tc.function.arguments);
							} catch {
								args = { raw: tc.function.arguments };
							}
							dispatch({
								type: "TOOL_CALL_START",
								toolCall: {
									id: tc.id,
									name: tc.function.name,
									args,
									status: "running",
								},
							});
							break;
						}
						case "done":
							// Assistant message complete, but stream may continue with tool results
							break;
					}
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

				case "agent_end": {
					const ae = event as PiAgentEndEvent;
					// Extract usage from final message if available
					if (ae.messages.length > 0) {
						const lastMsg = ae.messages[ae.messages.length - 1];
						if (lastMsg.usage) {
							// Usage info is available but we don't have a specific action for it
							// The stream is complete anyway
						}
					}
					dispatch({ type: "STREAM_COMPLETE" });
					break;
				}

				case "done":
					dispatch({ type: "STREAM_COMPLETE" });
					break;

				case "error":
					dispatch({
						type: "STREAM_ERROR",
						error: (event as { message: string }).message,
					});
					break;
			}
		};

		try {
			await invoke("run_pi_stream", {
				args: [prompt],
				channel,
			});
		} catch (err) {
			dispatch({
				type: "STREAM_ERROR",
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}, []);

	const abortStream = useCallback(async () => {
		dispatch({ type: "ABORT_STREAM" });
		try {
			await invoke<boolean>("abort_pi");
		} catch {
			// ignore
		}
	}, []);

	return { state, startStream, abortStream, dispatch };
}
