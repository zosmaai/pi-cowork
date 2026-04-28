import type { ChatMessage as ChatMessageType } from "@/types";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface ChatMessageProps {
	message: ChatMessageType;
}

export function ChatMessageItem({ message }: ChatMessageProps) {
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
				<span className="px-3 py-1 rounded-full bg-surface-800/50 text-surface-500 text-xs">
					{message.content}
				</span>
			</div>
		);
	}

	return (
		<div className={`flex gap-4 py-4 px-6 ${isUser ? "bg-surface-900/30" : "bg-transparent"}`}>
			<div className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium">
				{isUser ? (
					<div className="w-8 h-8 rounded-lg bg-surface-700 text-surface-200 flex items-center justify-center">
						You
					</div>
				) : (
					<div className="w-8 h-8 rounded-lg bg-primary-600 text-white flex items-center justify-center">
						π
					</div>
				)}
			</div>
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2 mb-1">
					<span className="text-sm font-medium text-surface-200">{isUser ? "You" : "Pi"}</span>
					<span className="text-xs text-surface-600">
						{new Date(message.timestamp).toLocaleTimeString([], {
							hour: "2-digit",
							minute: "2-digit",
						})}
					</span>
				</div>
				<div className="prose prose-invert prose-sm max-w-none text-surface-200">
					<ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
				</div>
				{!isUser && (
					<div className="flex gap-2 mt-2">
						<button
							type="button"
							onClick={() => copyToClipboard(message.content)}
							className="text-xs text-surface-500 hover:text-surface-300 transition-colors"
						>
							{copied ? "Copied!" : "Copy"}
						</button>
					</div>
				)}
			</div>
		</div>
	);
}
