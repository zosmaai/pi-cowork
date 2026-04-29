import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteSession, listSessions, readSession, writeSession } from "./session-store";

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
			mockedReadDir.mockResolvedValue([{ name: "2026-04-29T00-00-00Z_abc123.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);
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
				{ name: "2026-04-28T00-00-00Z_old.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry,
				{ name: "2026-04-29T00-00-00Z_new.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry,
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
			mockedReadDir.mockResolvedValue([{ name: "test_long.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);
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
			mockedReadDir.mockResolvedValue([{ name: "empty_session.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);
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
			mockedReadDir.mockResolvedValue([{ name: "other.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);
			const result = await readSession("abc");
			expect(result).toBeNull();
		});

		it("reads and parses session file", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([{ name: "session_abc123.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);
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
			mockedReadDir.mockResolvedValue([{ name: "delete_me.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);
			mockedRemove.mockResolvedValue(undefined);

			await deleteSession("delete_me");
			expect(mockedRemove).toHaveBeenCalled();
		});

		it("does nothing when session not found", async () => {
			mockedExists.mockResolvedValue(true);
			mockedReadDir.mockResolvedValue([{ name: "other.jsonl", isFile: true, isDirectory: false, isSymlink: false } as import("@tauri-apps/plugin-fs").DirEntry]);

			await deleteSession("not_found");
			expect(mockedRemove).not.toHaveBeenCalled();
		});
	});
});
