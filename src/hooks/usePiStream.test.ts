import type { ToolCallInfo } from "@/types";
import { describe, expect, it } from "vitest";
import { INITIAL_STATE, streamReducer } from "./usePiStream";

describe("streamReducer", () => {
	it("START_STREAM creates user message and assistant placeholder", () => {
		const state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hello pi",
		});

		expect(state.isRunning).toBe(true);
		expect(state.status).toBe("thinking");
		expect(state.messages).toHaveLength(1);
		expect(state.messages[0].role).toBe("user");
		expect(state.messages[0].content).toBe("Hello pi");
		expect(state.streamingMessage).not.toBeNull();
		expect(state.streamingMessage?.role).toBe("assistant");
		expect(state.streamingMessage?.isStreaming).toBe(true);
		expect(state.streamingMessage?.content).toBe("");
	});

	it("TEXT_DELTA accumulates into streaming message", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "Hello " });
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "world" });

		expect(state.streamingMessage?.content).toBe("Hello world");
		expect(state.status).toBe("responding");
	});

	it("THINKING_DELTA accumulates into thinking", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, {
			type: "THINKING_DELTA",
			delta: "Let me think...",
		});

		expect(state.streamingMessage?.thinking).toBe("Let me think...");
		expect(state.status).toBe("thinking");
	});

	it("MODEL_INFO updates model and provider", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, {
			type: "MODEL_INFO",
			model: "claude-sonnet-4-5",
			provider: "anthropic",
		});

		expect(state.streamingMessage?.model).toBe("claude-sonnet-4-5");
		expect(state.streamingMessage?.provider).toBe("anthropic");
	});

	it("TOOL_CALL_START adds tool call to streaming message", () => {
		const tc: ToolCallInfo = {
			id: "tc1",
			name: "bash",
			args: { command: "ls" },
			status: "running",
		};

		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "X",
		});
		state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: tc });

		expect(state.streamingMessage?.toolCalls).toHaveLength(1);
		expect(state.streamingMessage?.toolCalls?.[0].name).toBe("bash");
		expect(state.status).toBe("tool_call");
	});

	it("TOOL_CALL_UPDATE updates existing tool call", () => {
		const tc: ToolCallInfo = {
			id: "tc1",
			name: "bash",
			args: {},
			status: "running",
		};

		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "X",
		});
		state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: tc });
		state = streamReducer(state, {
			type: "TOOL_CALL_UPDATE",
			id: "tc1",
			result: "file1.txt file2.txt",
			status: "completed",
		});

		expect(state.streamingMessage?.toolCalls?.[0].status).toBe("completed");
		expect(state.streamingMessage?.toolCalls?.[0].result).toBe("file1.txt file2.txt");
	});

	it("TOOL_CALL_UPDATE marks error correctly", () => {
		const tc: ToolCallInfo = {
			id: "tc1",
			name: "bash",
			args: {},
			status: "running",
		};

		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "X",
		});
		state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: tc });
		state = streamReducer(state, {
			type: "TOOL_CALL_UPDATE",
			id: "tc1",
			result: "Command not found",
			status: "error",
			isError: true,
		});

		expect(state.streamingMessage?.toolCalls?.[0].status).toBe("error");
		expect(state.streamingMessage?.toolCalls?.[0].isError).toBe(true);
	});

	it("STREAM_COMPLETE moves streaming message to messages", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "Done" });
		state = streamReducer(state, { type: "STREAM_COMPLETE" });

		expect(state.isRunning).toBe(false);
		expect(state.status).toBe("idle");
		expect(state.streamingMessage).toBeNull();
		expect(state.messages).toHaveLength(2); // user + assistant
		expect(state.messages[1].content).toBe("Done");
		expect(state.messages[1].isStreaming).toBe(false);
	});

	it("ABORT_STREAM saves partial content when present", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "Partial..." });
		state = streamReducer(state, { type: "ABORT_STREAM" });

		expect(state.isRunning).toBe(false);
		expect(state.status).toBe("idle");
		// Partial content should be saved to messages
		expect(state.messages).toHaveLength(2);
		expect(state.messages[1].content).toBe("Partial...");
		expect(state.messages[1].isStreaming).toBe(false);
	});

	it("ABORT_STREAM without content just clears running state", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "ABORT_STREAM" });

		expect(state.isRunning).toBe(false);
		expect(state.status).toBe("idle");
		// No assistant message should be added (empty content)
		expect(state.messages).toHaveLength(1);
	});

	it("STREAM_ERROR sets error and stops", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, {
			type: "STREAM_ERROR",
			error: "Something broke",
		});

		expect(state.isRunning).toBe(false);
		expect(state.status).toBe("idle");
		expect(state.error).toBe("Something broke");
	});

	it("RESET returns initial state", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "RESET" });

		expect(state).toEqual(INITIAL_STATE);
	});

	it("NEW_ASSISTANT_MESSAGE finalizes current streaming message and starts fresh", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "First response" });
		state = streamReducer(state, { type: "NEW_ASSISTANT_MESSAGE" });

		// Previous message should be finalized in messages
		expect(state.messages).toHaveLength(2); // user + first assistant
		expect(state.messages[1].content).toBe("First response");
		expect(state.messages[1].isStreaming).toBe(false);

		// New streaming message should be empty and streaming
		expect(state.streamingMessage).not.toBeNull();
		expect(state.streamingMessage?.content).toBe("");
		expect(state.streamingMessage?.isStreaming).toBe(true);

		// Second turn text should append to new streaming message
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "Second response" });
		expect(state.streamingMessage?.content).toBe("Second response");

		// STREAM_COMPLETE should add second message
		state = streamReducer(state, { type: "STREAM_COMPLETE" });
		expect(state.messages).toHaveLength(3); // user + 2 assistants
		expect(state.messages[2].content).toBe("Second response");
	});

	it("TOOL_CALL_START deduplicates by id", () => {
		const tc: ToolCallInfo = {
			id: "tc1",
			name: "bash",
			args: { command: "ls" },
			status: "running",
		};

		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "X",
		});
		state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: tc });
		state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: tc }); // duplicate

		expect(state.streamingMessage?.toolCalls).toHaveLength(1); // not 2
	});

	it("ignores unknown actions", () => {
		const state = streamReducer(INITIAL_STATE, {
			type: "UNKNOWN_ACTION",
		} as unknown as import("./usePiStream").StreamAction);
		expect(state).toEqual(INITIAL_STATE);
	});
});
