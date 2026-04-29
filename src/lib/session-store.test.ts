import type { ChatMessage } from "@/types";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	chatMessagesToEvents,
	deleteSession,
	listSessions,
	piEventsToChatMessages,
	readSession,
	writeSession,
} from "./session-store";

vi.mock("@tauri-apps/api/path", () => ({
	homeDir: vi.fn().mockResolvedValue("/mock/home"),
	join: vi.fn().mockImplementation((...args) => args.join("/")),
}));

vi.mock("@tauri-apps/plugin-fs", () => ({
	readDir: vi.fn(),
	readTextFile: vi.fn(),
	writeTextFile: vi.fn(),
	mkdir: vi.fn(),
	remove: vi.fn(),
	exists: vi.fn(),
}));

import { exists, mkdir, readDir, readTextFile, remove, writeTextFile } from "@tauri-apps/plugin-fs";

const mockedReadDir = vi.mocked(readDir);
const mockedReadTextFile = vi.mocked(readTextFile);
const mockedWriteTextFile = vi.mocked(writeTextFile);
const mockedMkdir = vi.mocked(mkdir);
const mockedRemove = vi.mocked(remove);
const mockedExists = vi.mocked(exists);

describe("session-store", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("listSessions", () => {
		it("returns empty array when sessions dir does not exist", async () => {
			mockedExists.mockResolvedValue(false);
			const result = await listSessions();
			expect(result).toEqual([]);
		});

		it("returns empty array when no JSONL files", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([]);
			const result = await listSessions();
			expect(result).toEqual([]);
		});

		it("extracts metadata from session files", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{
					name: "2026-04-29T00-00-00Z_abc123.jsonl",
					isFile: true,
					isDirectory: false,
					isSymlink: false,
				},
			]);
			mockedReadTextFile.mockResolvedValue(
				[
					JSON.stringify({
						type: "session",
						id: "abc123",
						timestamp: "2026-04-29T00:00:00Z",
					}),
					JSON.stringify({
						type: "message_start",
						message: {
							role: "user",
							content: [{ type: "text", text: "Build the auth system" }],
						},
					}),
					JSON.stringify({ type: "done" }),
				].join("\n"),
			);

			const sessions = await listSessions();
			expect(sessions).toHaveLength(1);
			expect(sessions[0].id).toBe("abc123");
			expect(sessions[0].title).toBe("Build the auth system");
			expect(sessions[0].messageCount).toBe(1);
			expect(sessions[0].timestamp).toBeGreaterThan(0);
		});

		it("sorts sessions newest first", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{
					name: "2026-04-28T00-00-00Z_old.jsonl",
					isFile: true,
					isDirectory: false,
					isSymlink: false,
				},
				{
					name: "2026-04-29T00-00-00Z_new.jsonl",
					isFile: true,
					isDirectory: false,
					isSymlink: false,
				},
			]);
			mockedReadTextFile.mockImplementation(async (path) => {
				const str_path = String(path);
				if (str_path.includes("old")) {
					return [
						JSON.stringify({
							type: "session",
							id: "old",
							timestamp: "2026-04-28T00:00:00Z",
						}),
					].join("\n");
				}
				return [
					JSON.stringify({
						type: "session",
						id: "new",
						timestamp: "2026-04-29T00:00:00Z",
					}),
				].join("\n");
			});

			const sessions = await listSessions();
			expect(sessions).toHaveLength(2);
			expect(sessions[0].id).toBe("new");
			expect(sessions[1].id).toBe("old");
		});

		it("truncates long titles", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{ name: "test_long.jsonl", isFile: true, isDirectory: false, isSymlink: false },
			]);
			const longText = "a".repeat(100);
			mockedReadTextFile.mockResolvedValue(
				[
					JSON.stringify({
						type: "session",
						id: "long",
						timestamp: "2026-04-29T00:00:00Z",
					}),
					JSON.stringify({
						type: "message_start",
						message: {
							role: "user",
							content: [{ type: "text", text: longText }],
						},
					}),
				].join("\n"),
			);

			const sessions = await listSessions();
			expect(sessions[0].title.length).toBe(83); // 80 + "..."
			expect(sessions[0].title.endsWith("...")).toBe(true);
		});

		it("handles untitled sessions gracefully", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{
					name: "empty_session.jsonl",
					isFile: true,
					isDirectory: false,
					isSymlink: false,
				},
			]);
			mockedReadTextFile.mockResolvedValue(
				[
					JSON.stringify({
						type: "session",
						id: "empty",
						timestamp: "2026-04-29T00:00:00Z",
					}),
				].join("\n"),
			);

			const sessions = await listSessions();
			expect(sessions[0].title).toBe("Untitled session");
			expect(sessions[0].messageCount).toBe(0);
		});
	});

	describe("writeSession", () => {
		it("creates directory and writes JSONL file", async () => {
			mockedMkdir.mockResolvedValue(undefined);
			mockedWriteTextFile.mockResolvedValue(undefined);

			const events = [
				{
					type: "session",
					id: "test123",
					timestamp: "2026-04-29T00:00:00.000Z",
				},
				{ type: "done" },
			];

			await writeSession("test123", events as Record<string, unknown>[]);

			expect(mockedMkdir).toHaveBeenCalled();
			expect(mockedWriteTextFile).toHaveBeenCalled();
			const writeCall = mockedWriteTextFile.mock.calls[0];
			expect(writeCall[0]).toContain("2026-04-29T00-00-00-000Z_test123.jsonl");
		});
	});

	describe("readSession", () => {
		it("returns null when dir does not exist", async () => {
			mockedExists.mockResolvedValue(false);
			const result = await readSession("abc");
			expect(result).toBeNull();
		});

		it("returns null when session file not found", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{ name: "other.jsonl", isFile: true, isDirectory: false, isSymlink: false },
			]);
			const result = await readSession("abc");
			expect(result).toBeNull();
		});

		it("reads and parses session file", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{
					name: "session_abc123.jsonl",
					isFile: true,
					isDirectory: false,
					isSymlink: false,
				},
			]);
			mockedReadTextFile.mockResolvedValue(
				[
					JSON.stringify({
						type: "session",
						id: "abc123",
						timestamp: "2026-04-29T00:00:00Z",
					}),
					JSON.stringify({
						type: "message_start",
						message: {
							role: "user",
							content: [{ type: "text", text: "Hello" }],
						},
					}),
				].join("\n"),
			);

			const result = await readSession("abc123");
			expect(result).not.toBeNull();
			expect(result?.meta.id).toBe("abc123");
			expect(result?.meta.title).toBe("Hello");
			expect(result?.events).toHaveLength(2);
		});
	});

	describe("deleteSession", () => {
		it("removes the session file", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{ name: "delete_me.jsonl", isFile: true, isDirectory: false, isSymlink: false },
			]);
			mockedRemove.mockResolvedValue(undefined);

			await deleteSession("delete_me");
			expect(mockedRemove).toHaveBeenCalled();
		});

		it("does nothing when session not found", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([
				{ name: "other.jsonl", isFile: true, isDirectory: false, isSymlink: false },
			]);

			await deleteSession("not_found");
			expect(mockedRemove).not.toHaveBeenCalled();
		});
	});

	describe("piEventsToChatMessages", () => {
		it("converts user and assistant text messages", () => {
			const events = [
				{ type: "session", id: "s1", timestamp: "2026-04-29T00:00:00Z", version: 3, cwd: "/home" },
				{
					type: "message_start",
					message: { role: "user", content: [{ type: "text", text: "Hello pi" }], timestamp: 1000 },
				},
				{
					type: "message_end",
					message: { role: "user", content: [{ type: "text", text: "Hello pi" }], timestamp: 1000 },
				},
				{
					type: "message_start",
					message: {
						role: "assistant",
						content: [{ type: "text", text: "Hi there!" }],
						model: "gpt-4",
						provider: "openai",
						timestamp: 2000,
					},
				},
				{
					type: "message_end",
					message: {
						role: "assistant",
						content: [{ type: "text", text: "Hi there!" }],
						model: "gpt-4",
						provider: "openai",
						timestamp: 2000,
					},
				},
				{ type: "agent_end", messages: [] },
			];
			const messages = piEventsToChatMessages(events as Record<string, unknown>[]);
			expect(messages).toHaveLength(2);
			expect(messages[0].role).toBe("user");
			expect(messages[0].content).toBe("Hello pi");
			expect(messages[1].role).toBe("assistant");
			expect(messages[1].content).toBe("Hi there!");
			expect(messages[1].model).toBe("gpt-4");
		});

		it("extracts thinking blocks", () => {
			const events = [
				{
					type: "message_start",
					message: {
						role: "assistant",
						content: [
							{ type: "thinking", thinking: "Let me think..." },
							{ type: "text", text: "Answer" },
						],
					},
				},
				{
					type: "message_end",
					message: {
						role: "assistant",
						content: [
							{ type: "thinking", thinking: "Let me think..." },
							{ type: "text", text: "Answer" },
						],
					},
				},
			];
			const messages = piEventsToChatMessages(events as Record<string, unknown>[]);
			expect(messages).toHaveLength(1);
			expect(messages[0].thinking).toBe("Let me think...");
			expect(messages[0].content).toBe("Answer");
		});

		it("extracts tool calls in pi format", () => {
			const events = [
				{
					type: "message_start",
					message: {
						role: "assistant",
						content: [
							{ type: "toolCall", id: "call_1", name: "bash", arguments: { command: "ls" } },
						],
					},
				},
				{
					type: "message_end",
					message: {
						role: "assistant",
						content: [
							{ type: "toolCall", id: "call_1", name: "bash", arguments: { command: "ls" } },
						],
					},
				},
				{
					type: "tool_execution_end",
					toolCallId: "call_1",
					toolName: "bash",
					result: { content: [{ type: "text", text: "file.txt" }] },
					isError: false,
				},
			];
			const messages = piEventsToChatMessages(events as Record<string, unknown>[]);
			expect(messages).toHaveLength(1);
			expect(messages[0].toolCalls).toHaveLength(1);
			expect(messages[0].toolCalls?.[0].name).toBe("bash");
			expect(messages[0].toolCalls?.[0].result).toBe("file.txt");
		});

		it("skips custom role messages", () => {
			const events = [
				{
					type: "message_start",
					message: { role: "custom", customType: "memex-recall-reminder", content: "..." },
				},
				{
					type: "message_start",
					message: { role: "user", content: [{ type: "text", text: "hi" }] },
				},
				{ type: "message_end", message: { role: "user", content: [{ type: "text", text: "hi" }] } },
			];
			const messages = piEventsToChatMessages(events as Record<string, unknown>[]);
			expect(messages).toHaveLength(1);
			expect(messages[0].role).toBe("user");
		});

		it("converts multiple turn conversations", () => {
			const events = [
				{
					type: "message_start",
					message: { role: "user", content: [{ type: "text", text: "msg1" }] },
				},
				{
					type: "message_end",
					message: { role: "user", content: [{ type: "text", text: "msg1" }] },
				},
				{
					type: "message_start",
					message: { role: "assistant", content: [{ type: "text", text: "reply1" }] },
				},
				{
					type: "message_end",
					message: { role: "assistant", content: [{ type: "text", text: "reply1" }] },
				},
				{
					type: "message_start",
					message: { role: "user", content: [{ type: "text", text: "msg2" }] },
				},
				{
					type: "message_end",
					message: { role: "user", content: [{ type: "text", text: "msg2" }] },
				},
				{
					type: "message_start",
					message: { role: "assistant", content: [{ type: "text", text: "reply2" }] },
				},
				{
					type: "message_end",
					message: { role: "assistant", content: [{ type: "text", text: "reply2" }] },
				},
			];
			const messages = piEventsToChatMessages(events as Record<string, unknown>[]);
			expect(messages).toHaveLength(4);
			expect(messages[0].content).toBe("msg1");
			expect(messages[1].content).toBe("reply1");
			expect(messages[2].content).toBe("msg2");
			expect(messages[3].content).toBe("reply2");
		});
	});

	describe("chatMessagesToEvents", () => {
		it("converts simple user/assistant messages to event format", () => {
			const messages: ChatMessage[] = [
				{ id: "1", role: "user", content: "Hello", timestamp: 1000 },
				{ id: "2", role: "assistant", content: "Hi there!", timestamp: 2000 },
			];
			const events = chatMessagesToEvents("test-session", messages);
			expect(events[0]).toEqual({
				type: "session",
				version: 3,
				id: "test-session",
				timestamp: expect.any(String),
				cwd: "",
			});
			// Should have session + message_start/message_end pairs + agent_end
			expect(events.length).toBeGreaterThanOrEqual(5);
		});

		it("converts thinking and tool calls", () => {
			const messages: ChatMessage[] = [
				{
					id: "1",
					role: "assistant",
					content: "Result",
					timestamp: 1000,
					thinking: "Let me think",
					toolCalls: [
						{
							id: "tc1",
							name: "bash",
							args: { command: "ls" },
							status: "completed",
							result: "output",
						},
					],
				},
			];
			const events = chatMessagesToEvents("test", messages);
			// Should include thinking, text, toolCall in content, and tool_execution_end
			const messageStart = events.find((e) => e.type === "message_start");
			expect(messageStart).toBeDefined();
			const toolExecEnd = events.find((e) => e.type === "tool_execution_end");
			expect(toolExecEnd).toBeDefined();
		});

		it("round-trips through piEventsToChatMessages", () => {
			const messages: ChatMessage[] = [
				{ id: "1", role: "user", content: "Hello", timestamp: 1000 },
				{
					id: "2",
					role: "assistant",
					content: "Hi!",
					timestamp: 2000,
					model: "gpt-4",
					provider: "openai",
				},
			];
			const events = chatMessagesToEvents("round-trip", messages);
			const restored = piEventsToChatMessages(events);
			expect(restored).toHaveLength(2);
			expect(restored[0].role).toBe("user");
			expect(restored[0].content).toBe("Hello");
			expect(restored[1].role).toBe("assistant");
			expect(restored[1].content).toBe("Hi!");
		});
	});
});
