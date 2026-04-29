import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useSessions } from "./useSessions";

vi.mock("@/lib/session-store", () => ({
	listSessions: vi.fn(),
	writeSession: vi.fn(),
	deleteSession: vi.fn(),
	readSession: vi.fn(),
}));

import * as store from "@/lib/session-store";

describe("useSessions", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("loads sessions on mount", async () => {
		const mockList = vi.mocked(store.listSessions);
		mockList.mockResolvedValue([
			{ id: "1", title: "Test", timestamp: Date.now(), messageCount: 3 },
		]);

		const { result } = renderHook(() => useSessions());

		// Wait for effect to fire
		await act(async () => {
			await new Promise((r) => setTimeout(r, 0));
		});

		expect(result.current.sessions).toHaveLength(1);
		expect(result.current.loading).toBe(false);
	});

	it("starts with empty sessions and loading true", () => {
		const { result } = renderHook(() => useSessions());

		expect(result.current.sessions).toEqual([]);
		expect(result.current.loading).toBe(true);
		expect(result.current.activeSessionId).toBeNull();
	});

	it("createSession sets activeSessionId", async () => {
		const { result } = renderHook(() => useSessions());

		await act(async () => {
			result.current.createSession("session-123");
		});

		expect(result.current.activeSessionId).toBe("session-123");
	});

	it("deleteSession removes session and refreshes list", async () => {
		const mockDelete = vi.mocked(store.deleteSession);
		const mockList = vi.mocked(store.listSessions);
		mockDelete.mockResolvedValue(undefined);
		mockList.mockResolvedValue([]);

		const { result } = renderHook(() => useSessions());

		// Set active session
		await act(async () => {
			result.current.createSession("to-delete");
		});

		// Delete it
		await act(async () => {
			await result.current.deleteSession("to-delete");
		});

		expect(mockDelete).toHaveBeenCalledWith("to-delete");
		expect(result.current.activeSessionId).toBeNull();
	});
});
