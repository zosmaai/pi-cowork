import { RightPanel } from "@/components/RightPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Sidebar } from "@/sidebar/Sidebar";
import { ChatView } from "@/chat/ChatView";
import { TasksView } from "@/tasks/TasksView";
import { SettingsView } from "@/settings/SettingsView";
import { usePiStatus } from "@/hooks/usePiStatus";
import { usePiStream } from "@/hooks/usePiStream";
import { useSessions } from "@/hooks/useSessions";
import { writeSession } from "@/lib/session-store";
import { useEffect, useState } from "react";

function App() {
	const { status, loading: statusLoading, refetch } = usePiStatus();
	const { state: streamState, startStream, abortStream } = usePiStream();
	const {
		sessions,
		activeSessionId,
		loading: sessionsLoading,
		createSession,
		deleteSession,
	} = useSessions();

	const [activeView, setActiveView] = useState<"chat" | "tasks" | "settings">(
		"chat",
	);
	const [rightPanelOpen, setRightPanelOpen] = useState(false);

	// Save session to disk when stream completes
	useEffect(() => {
		if (
			!streamState.isRunning &&
			streamState.messages.length > 0 &&
			activeSessionId
		) {
			const events = [
				{
					type: "session",
					id: activeSessionId,
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
			writeSession(activeSessionId, events).catch(console.error);
		}
	}, [streamState.isRunning, streamState.messages, activeSessionId]);

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
		await startStream(text);
	}

	function handleNewSession() {
		const id = crypto.randomUUID();
		createSession(id);
	}

	if (statusLoading) {
		return (
			<div className="flex-1 flex items-center justify-center bg-background">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
					<p className="text-muted-foreground text-sm">
						Checking pi installation...
					</p>
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
				onSelectSession={createSession}
				onDeleteSession={deleteSession}
				onNavigate={setActiveView}
			/>

			{/* Main content */}
			<main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
				{activeView === "chat" && (
					<ChatView
						streamState={streamState}
						onSend={handleSend}
						onAbort={abortStream}
					/>
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
