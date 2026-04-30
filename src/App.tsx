import { ChatView } from "@/chat/ChatView";
import { RightPanel } from "@/components/RightPanel";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { usePiStatus } from "@/hooks/usePiStatus";
import { type StreamState, usePiStream } from "@/hooks/usePiStream";
import { useSessions } from "@/hooks/useSessions";
import {
	chatMessagesToEvents,
	piEventsToChatMessages,
	readSession,
	writeSession,
} from "@/lib/session-store";
import { SettingsView } from "@/settings/SettingsView";
import { Sidebar } from "@/sidebar/Sidebar";
import { TasksView } from "@/tasks/TasksView";
import type { ChatMessage } from "@/types";
import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Hook that returns a stable function reference that always calls the latest version
 * of the given callback. This is the "latest ref" pattern — it lets us subscribe to
 * events (keydown, stream completion) with a stable effect, while always reading
 * the current closure values.
 *
 * Equivalent to React 19's useEffectEvent, but compatible with older versions.
 */
function useLatest<T extends (...args: never[]) => unknown>(callback: T): T {
	const ref = useRef(callback);
	ref.current = callback;
	return useCallback(((...args: Parameters<T>) => ref.current(...args)) as T, []);
}

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

	// Persistent chat history that survives stream resets
	const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

	// Refs for accessing latest values in effects without adding deps
	const chatHistoryRef = useRef<ChatMessage[]>(chatHistory);
	chatHistoryRef.current = chatHistory;

	// Track the previous isRunning state to detect stream completion
	const prevIsRunningRef = useRef(false);

	// Use a ref for session ID to avoid React state timing issues
	const currentSessionIdRef = useRef<string | null>(null);

	// Stable callback refs for effect subscriptions
	const stableSaveSessionToDisk = useLatest(
		useCallback(
			(messages: ChatMessage[]) => {
				const sessionId = currentSessionIdRef.current;
				if (!sessionId || messages.length === 0) return;

				const events = chatMessagesToEvents(sessionId, messages);
				writeSession(sessionId, events)
					.then(() => {
						refreshSessions();
					})
					.catch((err) => console.error("[cowork] Failed to save session:", err));
			},
			[refreshSessions],
		),
	);

	// Keep ref in sync with state
	useEffect(() => {
		if (activeSessionId) {
			currentSessionIdRef.current = activeSessionId;
		}
	}, [activeSessionId]);

	// Handle stream completion — merge accumulated stream messages into history.
	// Refs provide latest values without re-subscribing the effect.
	const streamStateRef = useRef(streamState);
	streamStateRef.current = streamState;

	// We need isRunning as a separate reactive value to trigger the effect
	// on transitions, while reading all other state from refs.
	const isRunning = streamState.isRunning;

	useEffect(() => {
		const wasRunning = prevIsRunningRef.current;
		prevIsRunningRef.current = isRunning;

		// Detect: stream just finished (transition from running → idle)
		if (wasRunning && !isRunning) {
			const state = streamStateRef.current;
			if (state.messages.length === 0) return;

			const history = chatHistoryRef.current;

			// Find the user message that started this stream
			const streamUserMsg = state.messages.find((m) => m.role === "user");
			const streamUserContent = streamUserMsg?.content || "";

			// Find where in history this user message starts
			let overlapStart = -1;
			for (let i = history.length - 1; i >= 0; i--) {
				if (history[i].role === "user" && history[i].content === streamUserContent) {
					overlapStart = i;
					break;
				}
			}

			const finalMessages = state.messages.map((m) => ({ ...m, isStreaming: false }));

			if (overlapStart >= 0) {
				const newHistory = [...history.slice(0, overlapStart), ...finalMessages];
				setChatHistory(newHistory);
				stableSaveSessionToDisk(newHistory);
			} else {
				const newHistory = [...history, ...finalMessages];
				setChatHistory(newHistory);
				stableSaveSessionToDisk(newHistory);
			}
		}
	}, [isRunning, stableSaveSessionToDisk]);

	// Stable handler ref for keyboard shortcuts — always calls latest version
	const handleNewSessionRef = useLatest(function handleNewSession() {
		// Save current session first
		if (currentSessionIdRef.current && chatHistoryRef.current.length > 0) {
			stableSaveSessionToDisk(chatHistoryRef.current);
		}

		const id = crypto.randomUUID();
		currentSessionIdRef.current = id;
		createSession(id);
		setChatHistory([]);
		streamDispatch({ type: "RESET" });
	});

	// Keyboard shortcuts — registered once, handler reads latest values via stable ref
	useEffect(() => {
		function handleKeyDown(e: KeyboardEvent) {
			// CMD+B: Toggle right panel
			if ((e.metaKey || e.ctrlKey) && e.key === "b") {
				e.preventDefault();
				setRightPanelOpen((prev) => !prev);
			}

			// CMD+N: New session
			if ((e.metaKey || e.ctrlKey) && e.key === "n") {
				e.preventDefault();
				handleNewSessionRef();
			}

			// Escape: Focus input
			if (e.key === "Escape" && !e.metaKey && !e.ctrlKey && !e.altKey) {
				const textarea = document.querySelector(
					"textarea[placeholder]",
				) as HTMLTextAreaElement | null;
				textarea?.focus();
			}

			// CMD+K: Reserved for command palette (future)
			if ((e.metaKey || e.ctrlKey) && e.key === "k") {
				e.preventDefault();
				// TODO: Open command palette
			}
		}
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [handleNewSessionRef]);

	function handleSend(text: string) {
		// Auto-create a session if none exists
		if (!currentSessionIdRef.current) {
			const id = crypto.randomUUID();
			currentSessionIdRef.current = id;
			createSession(id);
		}
		void startStream(text, currentSessionIdRef.current);
	}

	async function handleSelectSession(id: string) {
		// Save current session first
		if (currentSessionIdRef.current && chatHistoryRef.current.length > 0) {
			stableSaveSessionToDisk(chatHistoryRef.current);
		}

		currentSessionIdRef.current = id;
		createSession(id);

		const data = await readSession(id);
		if (data?.events) {
			const loadedMessages = piEventsToChatMessages(data.events);
			setChatHistory(loadedMessages);
			streamDispatch({ type: "LOAD_SESSION", messages: loadedMessages });
		} else {
			setChatHistory([]);
			streamDispatch({ type: "RESET" });
		}
	}

	// Build the display messages: chat history + active stream
	const displayMessages = buildDisplayMessages(chatHistory, streamState);

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
				onNewSession={handleNewSessionRef}
				onSelectSession={handleSelectSession}
				onDeleteSession={(id: string) => {
					if (currentSessionIdRef.current === id) {
						currentSessionIdRef.current = null;
						setChatHistory([]);
					}
					deleteSession(id);
				}}
				onNavigate={setActiveView}
			/>

			{/* Main content */}
			<main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden">
				{activeView === "chat" && (
					<ChatView
						messages={displayMessages}
						streamingMessage={streamState.streamingMessage}
						isRunning={streamState.isRunning}
						status={streamState.status}
						error={streamState.error}
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

/**
 * Merge chat history with active stream state to produce display messages.
 * - If not streaming and no stream messages: show history only
 * - If streaming: show history followed by stream messages/streaming message
 * - Deduplicate overlap between history tail and stream messages head
 */
function buildDisplayMessages(history: ChatMessage[], streamState: StreamState): ChatMessage[] {
	// No active stream — just show history
	if (
		!streamState.isRunning &&
		streamState.messages.length === 0 &&
		!streamState.streamingMessage
	) {
		return history;
	}

	// Stream has messages — merge with history
	if (streamState.messages.length === 0) {
		return history;
	}

	const streamFirstUser = streamState.messages.find((m) => m.role === "user");
	let overlapIdx = -1;
	if (streamFirstUser) {
		for (let i = history.length - 1; i >= 0; i--) {
			if (history[i].role === "user" && history[i].content === streamFirstUser.content) {
				overlapIdx = i;
				break;
			}
		}
	}

	if (overlapIdx >= 0) {
		return [...history.slice(0, overlapIdx), ...streamState.messages];
	}

	return [...history, ...streamState.messages];
}

export default App;
