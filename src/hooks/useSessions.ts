import { useState, useEffect, useCallback } from "react";
import {
	listSessions,
	deleteSession,
	type SessionMeta,
} from "@/lib/session-store";

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

	const createSession = useCallback((id: string) => {
		setActiveSessionId(id);
	}, []);

	const deleteSessionById = useCallback(
		async (id: string) => {
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
