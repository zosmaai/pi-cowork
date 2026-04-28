import { ChatMessageItem } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import { RightPanel } from "@/components/RightPanel";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { TaskCard } from "@/components/TaskCard";
import { ThemeToggle } from "@/components/ThemeToggle";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { usePiStatus } from "@/hooks/usePiStatus";
import { usePiStream } from "@/hooks/usePiStream";
import type { ChatMessage, ToolCallInfo } from "@/types";
import {
	AlertCircle,
	BarChart3,
	FileCode,
	FileText,
	FolderOpen,
	Loader2,
	Mail,
	MessageSquare,
	Plus,
	Settings,
	Sparkles,
	Square,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface Session {
	id: string;
	title: string;
	lastMessage: string;
	timestamp: number;
	messages: ChatMessage[];
}

const TABS = [
	{ value: "chat", label: "Chat" },
	{ value: "files", label: "Files" },
	{ value: "tools", label: "Tools" },
	{ value: "settings", label: "Settings" },
];

const TASKS = [
	{ icon: FileText, label: "Create a file" },
	{ icon: BarChart3, label: "Crunch data" },
	{ icon: Sparkles, label: "Make a prototype" },
	{ icon: FolderOpen, label: "Organize files" },
	{ icon: Mail, label: "Draft a message" },
	{ icon: FileCode, label: "Write some code" },
];

function App() {
	const { status, loading: statusLoading, refetch } = usePiStatus();
	const { state: streamState, startStream, abortStream, reset: resetStream } = usePiStream();
	const [activeView, setActiveView] = useState("chat");
	const [sessions, setSessions] = useState<Session[]>([]);
	const [activeSessionId, setActiveSessionId] = useState<string | undefined>();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<{ focus: () => void }>(null);

	// Track streaming message separately so we can show it in real-time
	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: scrollToBottom is stable useCallback
	useEffect(() => {
		scrollToBottom();
	}, [messages, streamState.message?.content, streamState.message?.thinking]);

	// Keyboard shortcuts
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "K") {
				e.preventDefault();
				inputRef.current?.focus();
			}
			if ((e.ctrlKey || e.metaKey) && e.key === "n" && activeView === "chat") {
				e.preventDefault();
				handleNewSession();
			}
			if (e.key === "Escape") {
				const active = document.activeElement;
				if (active instanceof HTMLElement && active.tagName === "TEXTAREA") {
					active.blur();
				}
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [activeView]);

	// Convert streaming state to a ChatMessage for rendering
	const streamingMessage: ChatMessage | null = streamState.message
		? {
				id: streamState.message.id,
				role: "assistant",
				content: streamState.message.content,
				timestamp: Date.now(),
				thinking: streamState.message.thinking,
				toolCalls: streamState.message.toolCalls.map(
					(tc): ToolCallInfo => ({
						id: tc.id,
						name: tc.name,
						args: tc.args,
						status: tc.status,
						result: tc.result,
						isError: tc.isError,
					}),
				),
				isStreaming: streamState.message.isStreaming,
				model: streamState.message.model,
				provider: streamState.message.provider,
			}
		: null;

	// When stream finishes, add the completed message to history
	// biome-ignore lint/correctness/useExhaustiveDependencies: only depend on isRunning and message existence
	useEffect(() => {
		const msg = streamState.message;
		if (!streamState.isRunning && msg && !msg.isStreaming) {
			// Stream just finished - add to messages
			const completed: ChatMessage = {
				id: msg.id,
				role: "assistant",
				content: msg.content,
				timestamp: Date.now(),
				thinking: msg.thinking,
				toolCalls: msg.toolCalls.map(
					(tc): ToolCallInfo => ({
						id: tc.id,
						name: tc.name,
						args: tc.args,
						status: tc.status,
						result: tc.result,
						isError: tc.isError,
					}),
				),
				isStreaming: false,
				model: msg.model,
				provider: msg.provider,
			};
			setMessages((prev) => {
				// Replace the streaming placeholder if it exists
				const filtered = prev.filter((m) => m.id !== msg.id);
				return [...filtered, completed];
			});
			resetStream();
		}
	}, [streamState.isRunning, streamState.message, resetStream]);

	function handleNewSession() {
		const newSession: Session = {
			id: crypto.randomUUID(),
			title: `Session ${sessions.length + 1}`,
			lastMessage: "",
			timestamp: Date.now(),
			messages: [],
		};
		setSessions((prev) => [newSession, ...prev]);
		setActiveSessionId(newSession.id);
		setMessages([]);
		resetStream();
	}

	function handleSessionSelect(id: string) {
		setActiveSessionId(id);
		const session = sessions.find((s) => s.id === id);
		setMessages(session?.messages ?? []);
		resetStream();
	}

	function handleDeleteSession(id: string) {
		setSessions((prev) => prev.filter((s) => s.id !== id));
		if (activeSessionId === id) {
			setActiveSessionId(undefined);
			setMessages([]);
		}
	}

	async function handleSend(text: string) {
		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: text,
			timestamp: Date.now(),
		};
		setMessages((prev) => [...prev, userMsg]);

		// Start streaming
		await startStream(text);
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
			{/* Left sidebar */}
			<aside className="w-[260px] flex flex-col border-r bg-sidebar shrink-0">
				<div className="p-3">
					<SegmentedControl options={TABS} value={activeView} onChange={setActiveView} />
				</div>

				{activeView === "chat" && (
					<>
						<div className="px-3 pb-2">
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
							{sessions.length === 0 ? (
								<div className="px-3 py-4 text-sm text-muted-foreground">No sessions yet</div>
							) : (
								<div className="space-y-0.5">
									{sessions.map((session) => (
										<button
											key={session.id}
											type="button"
											onClick={() => handleSessionSelect(session.id)}
											className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-sm transition-colors group ${
												activeSessionId === session.id
													? "bg-sidebar-accent text-sidebar-accent-foreground"
													: "text-sidebar-foreground hover:bg-sidebar-accent/50"
											}`}
										>
											<MessageSquare className="w-4 h-4 shrink-0 opacity-60" />
											<span className="truncate flex-1">{session.title}</span>
											<button
												type="button"
												onClick={(e) => {
													e.stopPropagation();
													handleDeleteSession(session.id);
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
					</>
				)}

				{activeView !== "chat" && (
					<div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
						{activeView === "files" && "Files explorer coming soon"}
						{activeView === "tools" && "Tools coming soon"}
						{activeView === "settings" && "Settings coming soon"}
					</div>
				)}

				<div className="p-3 border-t border-sidebar-border">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<div className="w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
								Pi
							</div>
							<div className="leading-tight">
								<div className="text-xs font-medium text-sidebar-foreground">Pi Cowork</div>
								<div className="text-[10px] text-muted-foreground">{status.version || "Ready"}</div>
							</div>
						</div>
						<ThemeToggle />
					</div>
				</div>
			</aside>

			{/* Center */}
			<main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
				{activeView === "chat" && (
					<>
						<div className="flex-1 overflow-y-auto">
							{messages.length === 0 && !streamingMessage ? (
								<div className="flex flex-col items-center justify-center h-full gap-5 px-8">
									<div className="text-4xl">✦</div>
									<h1 className="text-2xl font-semibold text-foreground">
										Let&apos;s knock something off your list
									</h1>

									<div className="flex items-start gap-3 max-w-lg w-full px-4 py-3 rounded-xl border bg-card">
										<AlertCircle className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
										<p className="text-sm text-muted-foreground">
											Cowork is an early research preview. New improvements ship frequently.
										</p>
									</div>

									<div className="grid grid-cols-2 gap-3 max-w-lg w-full">
										{TASKS.map((task) => (
											<TaskCard
												key={task.label}
												icon={task.icon}
												label={task.label}
												onClick={() => inputRef.current?.focus()}
											/>
										))}
									</div>
								</div>
							) : (
								<div className="pb-4">
									{messages.map((msg) => (
										<ChatMessageItem key={msg.id} message={msg} />
									))}
									{streamingMessage && <ChatMessageItem message={streamingMessage} />}
									<div ref={messagesEndRef} />
								</div>
							)}
						</div>

						{/* Status bar during streaming */}
						{streamState.isRunning && (
							<div className="flex items-center justify-between px-4 py-2 border-t bg-card">
								<div className="flex items-center gap-2 text-xs text-muted-foreground">
									<Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
									<span className="capitalize">{streamState.status.replace("_", " ")}</span>
									{streamState.message?.model && (
										<span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
											{streamState.message.provider}/{streamState.message.model}
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

						<MessageInput ref={inputRef} onSend={handleSend} disabled={streamState.isRunning} />
					</>
				)}

				{activeView === "files" && (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="flex flex-col items-center gap-3">
							<FolderOpen className="w-10 h-10 opacity-40" />
							<p className="text-sm">No folder open</p>
						</div>
					</div>
				)}

				{activeView === "tools" && (
					<div className="flex-1 flex items-center justify-center text-muted-foreground">
						<div className="flex flex-col items-center gap-3">
							<Sparkles className="w-10 h-10 opacity-40" />
							<p className="text-sm">Tools coming soon</p>
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

			<RightPanel />
		</>
	);
}

export default App;
