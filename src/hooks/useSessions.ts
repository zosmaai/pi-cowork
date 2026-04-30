import { type SessionMeta, deleteSession, listSessions } from "@/lib/session-store";
import { invoke } from "@tauri-apps/api/core";
import { useCallback, useEffect, useState } from "react";

export function useSessions() {
	const [sessions, setSessions] = useState<SessionMeta[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);

	const refresh = useCallback(async () => {
		setLoading(true);
		try {
			const list = await listSessions();
			setSessions(list);
		} catch (err) {
			console.error("Failed to load sessions:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const createSession = useCallback(async (id: string) => {
		// Create the session in the metaagents engine.
		try {
			await invoke("create_session", { sessionId: id });
		} catch (err) {
			console.error("Failed to create engine session:", err);
		}
		setActiveSessionId(id);
	}, []);

	const deleteSessionById = useCallback(
		async (id: string) => {
			// Drop the session from the engine.
			try {
				await invoke("delete_session", { sessionId: id });
			} catch {
				// Session may not exist in the engine, that's fine.
			}
			await deleteSession(id);
			if (activeSessionId === id) {
				setActiveSessionId(null);
			}
			await refresh();
		},
		[activeSessionId, refresh],
	);

	return {
		sessions,
		activeSessionId,
		loading,
		createSession,
		deleteSession: deleteSessionById,
		refresh,
	};
}
