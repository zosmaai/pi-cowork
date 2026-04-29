import { ChatMessageItem } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import type { ChatMessage } from "@/types";
import { Loader2, Square } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";

interface ChatViewProps {
	messages: ChatMessage[];
	streamingMessage: ChatMessage | null;
	isRunning: boolean;
	status: StreamStateStatus;
	error: string | null;
	onSend: (text: string) => void;
	onAbort: () => void;
}

type StreamStateStatus = "idle" | "thinking" | "tool_call" | "responding" | "error";

export function ChatView({
	messages,
	streamingMessage,
	isRunning,
	status,
	error,
	onSend,
	onAbort,
}: ChatViewProps) {
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<{ focus: () => void }>(null);
	const isUserScrolledUp = useRef(false);

	// Detect if user has manually scrolled up
	const handleScroll = useCallback(() => {
		const container = scrollContainerRef.current;
		if (!container) return;
		const { scrollTop, scrollHeight, clientHeight } = container;
		// If user is more than 100px from bottom, consider them "scrolled up"
		isUserScrolledUp.current = scrollHeight - scrollTop - clientHeight > 100;
	}, []);

	// Auto-scroll to bottom when new content arrives, unless user scrolled up
	// biome-ignore lint/correctness/useExhaustiveDependencies: scroll effect only needs to trigger when message content changes
	useEffect(() => {
		if (!isUserScrolledUp.current) {
			messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
		}
	}, [messages.length, streamingMessage?.content.length, streamingMessage?.thinking?.length]);

	const allMessages = streamingMessage ? [...messages, streamingMessage] : messages;

	const isEmpty = messages.length === 0 && !streamingMessage;

	return (
		<>
			<div ref={scrollContainerRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
				{isEmpty ? (
					<div className="flex flex-col items-center justify-center h-full gap-5 px-8">
						<div className="text-4xl">✦</div>
						<h1 className="text-2xl font-semibold text-foreground">What are you working on?</h1>
						<p className="text-muted-foreground text-sm max-w-md text-center">
							Start a new session to chat with Pi.
						</p>
					</div>
				) : (
					<div className="pb-4">
						{allMessages.map((msg, idx) => (
							<ChatMessageItem
								key={msg.id}
								message={msg}
								isLatest={idx === allMessages.length - 1}
							/>
						))}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Error display */}
			{error && (
				<div className="px-4 py-2 bg-destructive/10 border-t border-destructive/20">
					<p className="text-sm text-destructive">{error}</p>
				</div>
			)}

			{/* Status bar during streaming */}
			{isRunning && (
				<div className="flex items-center justify-between px-4 py-2 border-t bg-card">
					<div className="flex items-center gap-2 text-xs text-muted-foreground">
						<Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
						<span className="capitalize">{status.replace("_", " ")}</span>
						{streamingMessage?.model && (
							<span className="text-[10px] bg-muted px-1.5 py-0.5 rounded">
								{streamingMessage.provider}/{streamingMessage.model}
							</span>
						)}
					</div>
					<button
						type="button"
						onClick={onAbort}
						className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
					>
						<Square className="w-3 h-3 fill-current" />
						Stop
					</button>
				</div>
			)}

			<MessageInput ref={inputRef} onSend={onSend} disabled={isRunning} />
		</>
	);
}
