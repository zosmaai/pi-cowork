import { describe, it, expect } from "vitest";
import { streamReducer, INITIAL_STATE } from "./usePiStream";
import type { ChatMessage, ToolCallInfo } from "@/types";

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
		expect(state.streamingMessage!.role).toBe("assistant");
		expect(state.streamingMessage!.isStreaming).toBe(true);
		expect(state.streamingMessage!.content).toBe("");
	});

	it("TEXT_DELTA accumulates into streaming message", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "Hello " });
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "world" });

		expect(state.streamingMessage!.content).toBe("Hello world");
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

		expect(state.streamingMessage!.thinking).toBe("Let me think...");
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

		expect(state.streamingMessage!.model).toBe("claude-sonnet-4-5");
		expect(state.streamingMessage!.provider).toBe("anthropic");
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

		expect(state.streamingMessage!.toolCalls).toHaveLength(1);
		expect(state.streamingMessage!.toolCalls![0].name).toBe("bash");
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

		expect(state.streamingMessage!.toolCalls![0].status).toBe("completed");
		expect(state.streamingMessage!.toolCalls![0].result).toBe(
			"file1.txt file2.txt",
		);
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

		expect(state.streamingMessage!.toolCalls![0].status).toBe("error");
		expect(state.streamingMessage!.toolCalls![0].isError).toBe(true);
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

	it("ABORT_STREAM clears running state", () => {
		let state = streamReducer(INITIAL_STATE, {
			type: "START_STREAM",
			prompt: "Hi",
		});
		state = streamReducer(state, { type: "TEXT_DELTA", delta: "Partial..." });
		state = streamReducer(state, { type: "ABORT_STREAM" });

		expect(state.isRunning).toBe(false);
		expect(state.status).toBe("idle");
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

	it("ignores unknown actions", () => {
		const state = streamReducer(INITIAL_STATE, {
			type: "UNKNOWN_ACTION" as any,
		});
		expect(state).toEqual(INITIAL_STATE);
	});
});
