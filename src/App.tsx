import { ChatMessageItem } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { RightPanel } from "@/components/RightPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { usePiStatus } from "@/hooks/usePiStatus";
import { usePiStream } from "@/hooks/usePiStream";
import { useSessions } from "@/hooks/useSessions";
import {
	Loader2,
	MessageSquare,
	CheckSquare,
	Settings,
	Plus,
	Trash2,
	Square,
} from "lucide-react";
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
			{/* Left sidebar */}
			<aside className="w-[240px] flex flex-col border-r bg-sidebar shrink-0">
				<div className="p-3 border-b border-sidebar-border">
					<button
						type="button"
						onClick={handleNewSession}
						className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
					>
						<Plus className="w-4 h-4" />
						New session
					</button>
				</div>

				<div className="flex-1 overflow-y-auto px-3">
					<div className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 py-2">
						Recents
					</div>
					{sessionsLoading ? (
						<div className="px-3 py-4 text-sm text-muted-foreground">
							Loading...
						</div>
					) : sessions.length === 0 ? (
						<div className="px-3 py-4 text-sm text-muted-foreground">
							No sessions yet
						</div>
					) : (
						<div className="space-y-0.5">
							{sessions.map((session) => (
								<button
									key={session.id}
									type="button"
									onClick={() => createSession(session.id)}
									className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group ${
										activeSessionId === session.id
											? "bg-sidebar-accent text-sidebar-accent-foreground"
											: "text-sidebar-foreground hover:bg-sidebar-accent/50"
									}`}
								>
									<MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
									<span className="truncate flex-1">
										{session.title}
									</span>
									<button
										type="button"
										onClick={(e) => {
											e.stopPropagation();
											deleteSession(session.id);
										}}
										className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-sidebar-accent/80 transition-opacity shrink-0"
										aria-label={`Delete session ${session.title}`}
									>
										<Trash2 className="w-3 h-3" />
									</button>
								</button>
							))}
						</div>
					)}
				</div>

				{/* Nav icons */}
				<div className="mt-auto border-t border-sidebar-border p-2">
					<div className="flex justify-around">
						<button
							type="button"
							onClick={() => setActiveView("chat")}
							aria-label="Chat"
							className={`p-2 rounded-lg transition-colors ${
								activeView === "chat"
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-muted-foreground hover:text-sidebar-foreground"
							}`}
						>
							<MessageSquare className="w-5 h-5" />
						</button>
						<button
							type="button"
							onClick={() => setActiveView("tasks")}
							aria-label="Tasks"
							className={`p-2 rounded-lg transition-colors ${
								activeView === "tasks"
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-muted-foreground hover:text-sidebar-foreground"
							}`}
						>
							<CheckSquare className="w-5 h-5" />
						</button>
						<button
							type="button"
							onClick={() => setActiveView("settings")}
							aria-label="Settings"
							className={`p-2 rounded-lg transition-colors ${
								activeView === "settings"
									? "bg-sidebar-accent text-sidebar-accent-foreground"
									: "text-muted-foreground hover:text-sidebar-foreground"
							}`}
						>
							<Settings className="w-5 h-5" />
						</button>
					</div>
				</div>

				{/* Footer */}
				<div className="p-3 border-t border-sidebar-border">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
								Pi
							</div>
							<div className="leading-tight">
								<div className="text-xs font-medium text-sidebar-foreground">
									Pi Cowork
								</div>
								<div className="text-[10px] text-muted-foreground">
									{status.version || "Ready"}
								</div>
							</div>
						</div>
						<ThemeToggle />
					</div>
				</div>
			</aside>

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
