import type { ChatMessage as ChatMessageType } from "@/types";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallCard } from "./ToolCallCard";

interface ChatMessageProps {
	message: ChatMessageType;
	/** Whether this is the latest message in the chat — used to default-expand tool calls */
	isLatest?: boolean;
}

export function ChatMessageItem({ message, isLatest = false }: ChatMessageProps) {
	const [copied, setCopied] = useState(false);
	const isUser = message.role === "user";
	const isSystem = message.role === "system";

	async function copyToClipboard(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch {
			// fallback
		}
	}

	if (isSystem) {
		return (
			<div className="flex justify-center py-2">
				<span className="px-3 py-1 rounded-full bg-muted text-muted-foreground text-xs">
					{message.content}
				</span>
			</div>
		);
	}

	return (
		<div className={`flex gap-4 py-4 px-6 ${isUser ? "bg-secondary/50" : "bg-transparent"}`}>
			<div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium">
				{isUser ? (
					<div className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold">
						You
					</div>
				) : (
					<div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
						Pi
					</div>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="text-sm font-medium text-foreground">{isUser ? "You" : "Pi"}</span>
					<span className="text-xs text-muted-foreground">
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
					{message.model && (
						<span className="text-[10px] text-muted-foreground/60 bg-muted px-1.5 py-0.5 rounded">
							{message.provider}/{message.model}
						</span>
					)}
					{message.isStreaming && (
						<span className="inline-flex items-center gap-1 text-[10px] text-primary">
							<span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
							streaming
						</span>
					)}
				</div>

				{/* Thinking block */}
				{!isUser && message.thinking && (
					<ThinkingBlock
						thinking={message.thinking}
						isThinking={message.isStreaming && message.thinking.length > 0}
					/>
				)}

				{/* Tool calls — only latest message defaults expanded */}
				{!isUser && message.toolCalls && message.toolCalls.length > 0 && (
					<div className="mb-2">
						{message.toolCalls.map((tc, idx) => (
							<ToolCallCard
								key={tc.id}
								toolCall={tc}
								defaultExpanded={isLatest && idx === (message.toolCalls?.length ?? 0) - 1}
							/>
						))}
					</div>
				)}

				{/* Content */}
				<div className="prose prose-sm max-w-none text-foreground">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>
						{message.content || (message.isStreaming ? "▋" : "")}
					</ReactMarkdown>
				</div>

				{!isUser && message.content && (
					<div className="flex gap-2 mt-2">
						<button
							type="button"
							onClick={() => copyToClipboard(message.content)}
							className="text-xs text-muted-foreground hover:text-foreground transition-colors"
						>
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
