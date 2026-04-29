import { ChatView } from "@/chat/ChatView";
import { RightPanel } from "@/components/RightPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { usePiStatus } from "@/hooks/usePiStatus";
import { usePiStream } from "@/hooks/usePiStream";
import { useSessions } from "@/hooks/useSessions";
import { writeSession, readSession } from "@/lib/session-store";
import { SettingsView } from "@/settings/SettingsView";
import { Sidebar } from "@/sidebar/Sidebar";
import { TasksView } from "@/tasks/TasksView";
import { useEffect, useRef, useState } from "react";

function App() {
	const { status, loading: statusLoading, refetch } = usePiStatus();
	const { state: streamState, startStream, abortStream, dispatch: streamDispatch } = usePiStream();
	const {
		sessions,
		activeSessionId,
		loading: sessionsLoading,
		createSession,
		deleteSession,
		refresh: refreshSessions,
	} = useSessions();

	const [activeView, setActiveView] = useState<"chat" | "tasks" | "settings">("chat");
	const [rightPanelOpen, setRightPanelOpen] = useState(false);

	// Use a ref for session ID to avoid React state timing issues
	const currentSessionIdRef = useRef<string | null>(null);

	// Keep ref in sync with state
	useEffect(() => {
		if (activeSessionId) {
			currentSessionIdRef.current = activeSessionId;
		}
	}, [activeSessionId]);

	// Save session to disk when stream completes
	useEffect(() => {
		if (!streamState.isRunning && streamState.messages.length > 0 && currentSessionIdRef.current) {
			const events = [
				{
					type: "session",
					id: currentSessionIdRef.current,
					timestamp: new Date().toISOString(),
				},
				...streamState.messages.map((msg) => ({
					type: "message_start",
					message: {
						role: msg.role,
						content: [{ type: "text", text: msg.content }],
						...(msg.thinking ? { thinking: msg.thinking } : {}),
					},
				})),
			];
			console.log("[cowork] Saving session:", currentSessionIdRef.current, "messages:", streamState.messages.length);
			writeSession(currentSessionIdRef.current, events)
				.then(() => {
					console.log("[cowork] Session saved successfully");
					refreshSessions();
				})
				.catch((err) => console.error("[cowork] Failed to save session:", err));
		}
	}, [streamState.isRunning, streamState.messages, refreshSessions]);

	// Keyboard shortcuts
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "b") {
				e.preventDefault();
				setRightPanelOpen((prev) => !prev);
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	async function handleSend(text: string) {
		// Auto-create a session if none exists
		if (!currentSessionIdRef.current) {
			const id = crypto.randomUUID();
			currentSessionIdRef.current = id;
			createSession(id);
			console.log("[cowork] Auto-created session:", id);
		}
		await startStream(text);
	}

	function handleNewSession() {
		const id = crypto.randomUUID();
		currentSessionIdRef.current = id;
		createSession(id);
		console.log("[cowork] New session:", id);
	}

	async function handleSelectSession(id: string) {
		currentSessionIdRef.current = id;
		createSession(id);
		const data = await readSession(id);
		if (data?.events) {
			// Convert stored events back to ChatMessage format
			const loadedMessages: Array<{
				id: string;
				role: "user" | "assistant";
				content: string;
				timestamp: number;
				thinking?: string;
			}> = [];
			for (const event of data.events) {
				if (event.type === "message_start" && event.message) {
					const msg = event.message as {
						role: string;
						content: Array<{ type: string; text: string }>;
						thinking?: string;
					};
					const text = msg.content?.[0]?.text || "";
					loadedMessages.push({
						id: crypto.randomUUID(),
						role: msg.role as "user" | "assistant",
						content: text,
						timestamp: Date.now(),
						thinking: msg.thinking,
					});
				}
			}
			// Need to dispatch LOAD_SESSION — but we need the dispatch function
			// For now, just log it. We'll need to expose dispatch from usePiStream
			streamDispatch({ type: "LOAD_SESSION", messages: loadedMessages as unknown as import("@/types").ChatMessage[] });
		}
	}

	if (statusLoading) {
		return (
			<div className="flex-1 flex items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-muted-foreground text-sm">Checking pi installation...</p>
				</div>
			</div>
		);
	}

	if (!status?.installed) {
		return (
			<div className="flex-1 bg-background">
				{status ? <WelcomeScreen status={status} onRefetch={refetch} /> : null}
			</div>
		);
	}

	return (
		<>
			<Sidebar
				sessions={sessions}
				activeSessionId={activeSessionId}
				sessionsLoading={sessionsLoading}
				status={status}
				activeView={activeView}
				onNewSession={handleNewSession}
				onSelectSession={handleSelectSession}
				onDeleteSession={(id: string) => {
					if (currentSessionIdRef.current === id) {
						currentSessionIdRef.current = null;
					}
					deleteSession(id);
				}}
				onNavigate={setActiveView}
			/>

			{/* Main content */}
			<main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
				{activeView === "chat" && (
					<ChatView streamState={streamState} onSend={handleSend} onAbort={abortStream} />
				)}

				{activeView === "tasks" && <TasksView />}

				{activeView === "settings" && <SettingsView />}
			</main>

			{/* Right panel */}
			{rightPanelOpen && (
				<RightPanel streamState={streamState} onClose={() => setRightPanelOpen(false)} />
			)}
		</>
	);
}

export default App;
