import { ChatMessageItem } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { RightPanel } from "@/components/RightPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { Sidebar } from "@/sidebar/Sidebar";
import { usePiStatus } from "@/hooks/usePiStatus";
import { usePiStream } from "@/hooks/usePiStream";
import { useSessions } from "@/hooks/useSessions";
import { Loader2, CheckSquare, Settings, Square } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

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

	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<{ focus: () => void }>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [
		streamState.messages,
		streamState.streamingMessage?.content,
		streamState.streamingMessage?.thinking,
		scrollToBottom,
	]);

	// Keyboard shortcuts
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === "b") {
				e.preventDefault();
				setRightPanelOpen((prev) => !prev);
			}
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
				e.preventDefault();
				inputRef.current?.focus();
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
					<>
						<div className="flex-1 overflow-y-auto">
							{streamState.messages.length === 0 &&
							!streamState.streamingMessage ? (
								<div className="flex flex-col items-center justify-center h-full gap-5 px-8">
									<div className="text-4xl">✦</div>
									<h1 className="text-2xl font-semibold text-foreground">
										What are you working on?
									</h1>
									<p className="text-muted-foreground text-sm max-w-md text-center">
										Start a new session to chat with Pi.
									</p>
								</div>
							) : (
								<div className="pb-4">
									{streamState.messages.map((msg) => (
										<ChatMessageItem
											key={msg.id}
											message={msg}
										/>
									))}
									{streamState.streamingMessage && (
										<ChatMessageItem
											message={streamState.streamingMessage}
										/>
									)}
									<div ref={messagesEndRef} />
								</div>
							)}
						</div>

						{/* Status bar during streaming */}
						{streamState.isRunning && (
							<div className="flex items-center justify-between px-4 py-2 border-t bg-card">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
									<span className="capitalize">
										{streamState.status.replace("_", " ")}
									</span>
									{streamState.streamingMessage?.model && (
										<span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
											{streamState.streamingMessage.provider}/
											{streamState.streamingMessage.model}
										</span>
									)}
								</div>
								<button
									type="button"
									onClick={abortStream}
									className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
								>
									<Square className="w-3 h-3 fill-current" />
									Stop
								</button>
							</div>
						)}

						<MessageInput
							ref={inputRef}
							onSend={handleSend}
							disabled={streamState.isRunning}
						/>
					</>
				)}

				{activeView === "tasks" && (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="flex flex-col items-center gap-3">
							<CheckSquare className="w-10 h-10 opacity-40" />
							<p className="text-sm">Tasks coming soon</p>
						</div>
					</div>
				)}

				{activeView === "settings" && (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="flex flex-col items-center gap-3">
							<Settings className="w-10 h-10 opacity-40" />
							<p className="text-sm">Settings coming soon</p>
						</div>
					</div>
				)}
			</main>

			{/* Right panel */}
			{rightPanelOpen && <RightPanel />}
		</>
	);
}

export default App;
