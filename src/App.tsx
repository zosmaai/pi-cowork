import { useState, useCallback, useRef, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { usePiStatus } from "@/hooks/usePiStatus";
import { WelcomeScreen } from "@/components/WelcomeScreen";
import { ChatMessageItem } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import type { ChatMessage } from "@/types";

function App() {
	const { status, loading: statusLoading, refetch } = usePiStatus();
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [isThinking, setIsThinking] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);

	const scrollToBottom = useCallback(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, []);

	useEffect(() => {
		scrollToBottom();
	}, [messages, scrollToBottom]);

	async function handleSend(text: string) {
		const userMsg: ChatMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content: text,
			timestamp: Date.now(),
		};

		setMessages((prev) => [...prev, userMsg]);
		setIsThinking(true);

		try {
			// For now, run pi with the message as an argument
			// In the future this should use a proper session API
			const output = await invoke<string>("run_pi_command", {
				args: [text],
			});

			const assistantMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: output || "(no output)",
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, assistantMsg]);
		} catch (err) {
			const errorMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: "assistant",
				content: `**Error:** ${err instanceof Error ? err.message : String(err)}`,
				timestamp: Date.now(),
			};
			setMessages((prev) => [...prev, errorMsg]);
		} finally {
			setIsThinking(false);
		}
	}

	if (statusLoading) {
		return (
			<div className="flex items-center justify-center h-full">
				<div className="flex flex-col items-center gap-3">
					<div className="w-8 h-8 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
					<p className="text-surface-400 text-sm">Checking pi installation...</p>
				</div>
			</div>
		);
	}

	// Show welcome screen if pi is not installed
	if (!status?.installed) {
		return <WelcomeScreen status={status!} onRefetch={refetch} />;
	}

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<header className="flex items-center justify-between px-6 py-3 border-b border-surface-800 bg-surface-950/80 backdrop-blur">
				<div className="flex items-center gap-3">
					<div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center font-bold text-sm">
						π
					</div>
					<div>
						<h1 className="text-sm font-semibold text-surface-100">Pi Cowork</h1>
						<div className="flex items-center gap-1.5">
							<span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
							<span className="text-xs text-surface-500">
								{status.version || "pi ready"}
							</span>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={() => setMessages([])}
						className="px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
					>
						New Session
					</button>
					<button
						type="button"
						onClick={refetch}
						className="px-3 py-1.5 rounded-lg text-xs text-surface-400 hover:text-surface-200 hover:bg-surface-800 transition-colors"
					>
						Refresh
					</button>
				</div>
			</header>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto">
				{messages.length === 0 ? (
					<div className="flex flex-col items-center justify-center h-full gap-4 text-surface-500">
						<div className="text-5xl">🥧</div>
						<p className="text-lg font-medium text-surface-400">
							Welcome to Pi Cowork
						</p>
						<p className="text-sm max-w-sm text-center">
							Start typing to send commands to pi. This runs pi in
							one-shot mode — full session support coming soon.
						</p>
					</div>
				) : (
					<div className="pb-4">
						{messages.map((msg) => (
							<ChatMessageItem key={msg.id} message={msg} />
						))}
						{isThinking && (
							<div className="flex gap-4 py-4 px-6">
								<div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center text-sm font-medium flex-shrink-0">
									π
								</div>
								<div className="flex items-center gap-1">
									<div className="w-2 h-2 rounded-full bg-surface-500 animate-bounce" style={{ animationDelay: "0ms" }} />
									<div className="w-2 h-2 rounded-full bg-surface-500 animate-bounce" style={{ animationDelay: "150ms" }} />
									<div className="w-2 h-2 rounded-full bg-surface-500 animate-bounce" style={{ animationDelay: "300ms" }} />
								</div>
							</div>
						)}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Input */}
			<MessageInput onSend={handleSend} disabled={isThinking} />
		</div>
	);
}

export default App;
