import { ChatMessageItem } from "@/components/ChatMessage";
import { ErrorBanner } from "@/components/ErrorBanner";
import { MessageInput } from "@/components/MessageInput";
import { StatusBar } from "@/components/StatusBar";
import { MessageSkeleton } from "@/components/StreamingIndicator";
import type { ChatMessage, ModelInfo } from "@/types";
import type { CoworkErrorPayload } from "@/types/pi-events";
import { useCallback, useEffect, useRef } from "react";

export type StreamStateStatus = "idle" | "thinking" | "tool_call" | "responding" | "error";

interface ChatViewProps {
	messages: ChatMessage[];
	streamingMessage: ChatMessage | null;
	isRunning: boolean;
	status: StreamStateStatus;
	error: string | null;
	errorPayload?: CoworkErrorPayload | null;
	onSend: (text: string) => void;
	onAbort: () => void;
	onRetry?: () => void;
	models?: ModelInfo[];
	currentModelId?: string;
	onModelSelect?: (provider: string, modelId: string) => void;
	/** When true, shows a setup prompt because no providers are configured. */
	noProviders?: boolean;
}

export function ChatView({
	messages,
	streamingMessage,
	isRunning,
	status,
	error,
	errorPayload,
	onSend,
	onAbort,
	onRetry,
	models,
	currentModelId,
	onModelSelect,
	noProviders,
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

	// Determine if we should show a skeleton during initial thinking
	const showSkeleton =
		isRunning && status === "thinking" && !streamingMessage?.content && !streamingMessage?.thinking;

	return (
		<>
			<div
				ref={scrollContainerRef}
				onScroll={handleScroll}
				className="flex-1 overflow-y-auto"
				style={{ scrollbarGutter: "stable" }}
			>
				{isEmpty ? (
					<div className="flex flex-col items-center justify-center h-full gap-5 px-8">
						<div className="text-4xl font-bold" style={{ color: "hsl(var(--primary))" }}>
							✦
						</div>
						{noProviders ? (
							<>
								<h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
									Welcome to Zosma Cowork
								</h1>
								<p
									className="text-sm max-w-md text-center"
									style={{ color: "hsl(var(--muted-foreground))" }}
								>
									No providers are configured yet. Go to{" "}
									<strong>Settings → Models &amp; Providers → Configure</strong>{" "}
									to add an API key and start chatting.
								</p>
								<div className="flex gap-3 pt-2">
									<button
										type="button"
										onClick={() => window.dispatchEvent(new CustomEvent("navigate", { detail: "settings" }))}
										className="px-4 py-2 rounded-lg text-sm font-medium transition-all hover:opacity-90"
										style={{
											background: "hsl(var(--primary))",
											color: "hsl(var(--primary-foreground))",
										}}
									>
										Configure Providers
									</button>
								</div>
							</>
						) : (
							<>
								<h1 className="text-2xl font-semibold" style={{ color: "hsl(var(--foreground))" }}>
									What are you working on?
								</h1>
								<p
									className="text-sm max-w-md text-center"
									style={{ color: "hsl(var(--muted-foreground))" }}
								>
									Start a new session to chat with Pi.
								</p>
							</>
						)}
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
						{/* Skeleton while waiting for first content */}
						{showSkeleton && <MessageSkeleton />}
						<div ref={messagesEndRef} />
					</div>
				)}
			</div>

			{/* Error display — rich banner with structured info */}
			{error && (
				<ErrorBanner
					error={error}
					errorPayload={errorPayload ?? null}
					onRetry={onRetry}
					onSwitchModel={onRetry}
				/>
			)}

			{/* Status bar during streaming */}
			<StatusBar
				isRunning={isRunning}
				status={status}
				streamingMessage={streamingMessage}
				onAbort={onAbort}
			/>

			<MessageInput ref={inputRef} onSend={onSend} disabled={isRunning} models={models} currentModelId={currentModelId} onModelSelect={onModelSelect} />
		</>
	);
}
