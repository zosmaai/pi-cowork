import { useCallback, useState } from "react";
import { Channel, invoke } from "@tauri-apps/api/core";
import type {
	PiEvent,
	PiMessageUpdateEvent,
	PiToolExecutionEndEvent,
	PiToolExecutionStartEvent,
	PiToolExecutionUpdateEvent,
} from "@/types/pi-events";

export interface StreamingMessage {
	id: string;
	role: "assistant";
	content: string;
	thinking: string;
	isThinking: boolean;
	isStreaming: boolean;
	toolCalls: StreamingToolCall[];
	model?: string;
	provider?: string;
	usage?: {
		input: number;
		output: number;
		totalTokens: number;
		cost: number;
	};
}

export interface StreamingToolCall {
	id: string;
	name: string;
	args: Record<string, unknown>;
	status: "running" | "completed" | "error";
	result?: string;
	isError?: boolean;
}

export interface StreamState {
	message: StreamingMessage | null;
	isRunning: boolean;
	status: "idle" | "thinking" | "tool_call" | "responding" | "retrying" | "compacting";
	queuedSteering: string[];
	queuedFollowUp: string[];
	error: string | null;
}

const INITIAL_STATE: StreamState = {
	message: null,
	isRunning: false,
	status: "idle",
	queuedSteering: [],
	queuedFollowUp: [],
	error: null,
};

export function usePiStream() {
	const [state, setState] = useState<StreamState>(INITIAL_STATE);
	const startStream = useCallback(async (prompt: string) => {
		setState({
			...INITIAL_STATE,
			isRunning: true,
			status: "thinking",
			message: {
				id: crypto.randomUUID(),
				role: "assistant",
				content: "",
				thinking: "",
				isThinking: true,
				isStreaming: true,
				toolCalls: [],
			},
		});

		const channel = new Channel<PiEvent>();

		channel.onmessage = (event: PiEvent) => {
			setState((prev) => {
				const next = { ...prev };

				switch (event.type) {
					case "agent_start":
						next.status = "thinking";
						break;

					case "turn_start":
						next.status = "thinking";
						break;

					case "message_update": {
						const msgEvent = event as PiMessageUpdateEvent;
						const ame = msgEvent.assistantMessageEvent;

						if (!next.message) {
							next.message = {
								id: crypto.randomUUID(),
								role: "assistant",
								content: "",
								thinking: "",
								isThinking: false,
								isStreaming: true,
								toolCalls: [],
							};
						}

						// Update model info from partial message
						if (msgEvent.message.model) {
							next.message.model = msgEvent.message.model;
						}
						if (msgEvent.message.provider) {
							next.message.provider = msgEvent.message.provider;
						}

						switch (ame.type) {
							case "thinking_start":
								next.message.isThinking = true;
								next.status = "thinking";
								break;

							case "thinking_delta":
								next.message.thinking += ame.delta;
								next.message.isThinking = true;
								next.status = "thinking";
								break;

							case "thinking_end":
								next.message.isThinking = false;
								break;

							case "text_start":
								next.status = "responding";
								break;

							case "text_delta":
								next.message.content += ame.delta;
								next.status = "responding";
								break;

							case "text_end":
								break;

							case "toolcall_start":
								next.status = "tool_call";
								break;

							case "toolcall_end": {
								const tc = ame.toolCall;
								const existing = next.message.toolCalls.find((t) => t.id === tc.id);
								if (!existing) {
									let args: Record<string, unknown> = {};
									try {
										args = JSON.parse(tc.function.arguments);
									} catch {
										args = { raw: tc.function.arguments };
									}
									next.message.toolCalls.push({
										id: tc.id,
										name: tc.function.name,
										args,
										status: "running",
									});
								}
								break;
							}

							case "done":
								next.status = "idle";
								break;

							case "error":
								next.error = `Stream error: ${ame.reason}`;
								break;
						}
						break;
					}

					case "tool_execution_start": {
						const te = event as PiToolExecutionStartEvent;
						if (next.message) {
							const tc = next.message.toolCalls.find((t) => t.id === te.toolCallId);
							if (tc) {
								tc.status = "running";
								tc.args = te.args;
							}
						}
						next.status = "tool_call";
						break;
					}

					case "tool_execution_update": {
						const te = event as PiToolExecutionUpdateEvent;
						if (next.message) {
							const tc = next.message.toolCalls.find((t) => t.id === te.toolCallId);
							if (tc) {
								tc.status = "running";
								tc.result = te.partialResult.content.map((c) => c.text).join("");
							}
						}
						break;
					}

					case "tool_execution_end": {
						const te = event as PiToolExecutionEndEvent;
						if (next.message) {
							const tc = next.message.toolCalls.find((t) => t.id === te.toolCallId);
							if (tc) {
								tc.status = te.isError ? "error" : "completed";
								tc.result = te.result.content.map((c) => c.text).join("");
								tc.isError = te.isError;
							}
						}
						break;
					}

					case "queue_update":
						next.queuedSteering = [...event.steering];
						next.queuedFollowUp = [...event.followUp];
						break;

					case "compaction_start":
						next.status = "compacting";
						break;

					case "compaction_end":
						next.status = "idle";
						break;

					case "auto_retry_start":
						next.status = "retrying";
						break;

					case "auto_retry_end":
						next.status = "idle";
						break;

					case "error":
						next.error = (event as { message: string }).message;
						break;

					case "done":
						next.isRunning = false;
						next.status = "idle";
						if (next.message) {
							next.message.isStreaming = false;
							next.message.isThinking = false;
						}
						break;

					case "agent_end": {
						next.isRunning = false;
						next.status = "idle";
						if (next.message && event.messages.length > 0) {
							const lastMsg = event.messages[event.messages.length - 1];
							if (lastMsg.usage) {
								next.message.usage = {
									input: lastMsg.usage.input,
									output: lastMsg.usage.output,
									totalTokens: lastMsg.usage.totalTokens,
									cost: lastMsg.usage.cost.total,
								};
							}
						}
						break;
					}
				}

				return next;
			});
		};

		try {
			await invoke("run_pi_stream", {
				args: [prompt],
				channel,
			});
		} catch (err) {
			setState((prev) => ({
				...prev,
				isRunning: false,
				status: "idle",
				error: err instanceof Error ? err.message : String(err),
				message: prev.message ? { ...prev.message, isStreaming: false, isThinking: false } : null,
			}));
		}
	}, []);

	const abortStream = useCallback(async () => {
		try {
			const killed = await invoke<boolean>("abort_pi");
			if (killed) {
				setState((prev) => ({
					...prev,
					isRunning: false,
					status: "idle",
					message: prev.message ? { ...prev.message, isStreaming: false, isThinking: false } : null,
				}));
			}
		} catch (err) {
			console.error("Failed to abort:", err);
		}
	}, []);

	const reset = useCallback(() => {
		setState(INITIAL_STATE);
	}, []);

	return {
		state,
		startStream,
		abortStream,
		reset,
	};
}
