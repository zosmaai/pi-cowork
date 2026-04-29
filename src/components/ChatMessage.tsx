import type { ChatMessage as ChatMessageType } from "@/types";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ThinkingBlock } from "./ThinkingBlock";
import { ToolCallSummary, ToolCallTimeline } from "./ToolCallTimeline";

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
				<span
					className="px-3 py-1 rounded-full text-xs"
					style={{
						background: "hsl(var(--chat-system-bg))",
						color: "hsl(var(--chat-system-fg))",
					}}
				>
					{message.content}
				</span>
			</div>
		);
	}

	return (
		<div
			className="group flex gap-3 py-3 px-5 transition-colors animate-fade-in"
			style={{
				background: isUser ? "hsl(var(--chat-user-bg))" : "hsl(var(--chat-assistant-bg))",
			}}
		>
			{/* Avatar */}
			<div className="flex-shrink-0">
				{isUser ? (
					<div
						className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold"
						style={{
							background: "hsl(var(--chat-avatar-user-bg))",
							color: "hsl(var(--chat-avatar-user-fg))",
						}}
					>
						You
					</div>
				) : (
					<div
						className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
						style={{
							background: "hsl(var(--chat-avatar-assistant-bg))",
							color: "hsl(var(--chat-avatar-assistant-fg))",
						}}
					>
						Pi
					</div>
				)}
			</div>

			{/* Content */}
			<div className="flex-1 min-w-0">
				{/* Header row */}
				<div className="flex items-center gap-2 mb-0.5">
					<span className="text-xs font-medium" style={{ color: "hsl(var(--foreground))" }}>
						{isUser ? "You" : "Pi"}
					</span>
					<span className="text-[10px] text-muted-foreground tabular-nums">
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
					{message.model && (
						<span className="text-[10px] text-muted-foreground/50 bg-muted/60 px-1.5 py-0 rounded font-mono">
							{message.provider}/{message.model}
						</span>
					)}
					{message.isStreaming && (
						<span
							className="inline-flex items-center gap-1 text-[10px] font-medium"
							style={{ color: "hsl(var(--status-active-fg))" }}
						>
							<span
								className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
								style={{ background: "hsl(var(--primary))" }}
							/>
							streaming
						</span>
					)}
					{!isUser && message.toolCalls && message.toolCalls.length > 0 && !message.isStreaming && (
						<ToolCallSummary toolCalls={message.toolCalls} />
					)}
				</div>

				{/* Thinking block */}
				{!isUser && message.thinking && (
					<ThinkingBlock
						thinking={message.thinking}
						isThinking={message.isStreaming && message.thinking.length > 0}
					/>
				)}

				{/* Tool calls — compact timeline */}
				{!isUser && message.toolCalls && message.toolCalls.length > 0 && (
					<ToolCallTimeline
						toolCalls={message.toolCalls}
						isLatest={isLatest}
						defaultExpanded={isLatest}
					/>
				)}

				{/* Content */}
				{(message.content || message.isStreaming) && (
					<div
						className="prose prose-sm max-w-none"
						style={{ color: isUser ? "hsl(var(--chat-user-fg))" : "hsl(var(--chat-assistant-fg))" }}
					>
						<ReactMarkdown remarkPlugins={[remarkGfm]}>
							{message.content || (message.isStreaming ? "▋" : "")}
						</ReactMarkdown>
					</div>
				)}

				{/* Actions */}
				{!isUser && message.content && !message.isStreaming && (
					<div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
						<button
							type="button"
							onClick={() => copyToClipboard(message.content)}
							className="text-[11px] text-muted-foreground hover:text-foreground transition-colors"
						>
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
