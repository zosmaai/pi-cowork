import { useRef } from "react";
import { ChatMessageItem } from "@/components/ChatMessage";
import { MessageInput } from "@/components/MessageInput";
import type { StreamState } from "@/hooks/usePiStream";
import { Loader2, Square } from "lucide-react";

interface ChatViewProps {
	streamState: StreamState;
	onSend: (text: string) => void;
	onAbort: () => void;
}

export function ChatView({ streamState, onSend, onAbort }: ChatViewProps) {
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<{ focus: () => void }>(null);

	return (
		<>
			<div className="flex-1 overflow-y-auto">
				{streamState.messages.length === 0 && !streamState.streamingMessage ? (
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
							<ChatMessageItem key={msg.id} message={msg} />
						))}
						{streamState.streamingMessage && (
							<ChatMessageItem message={streamState.streamingMessage} />
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
						onClick={onAbort}
						className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
					>
						<Square className="w-3 h-3 fill-current" />
						Stop
					</button>
				</div>
			)}

			<MessageInput
				ref={inputRef}
				onSend={onSend}
				disabled={streamState.isRunning}
			/>
		</>
	);
}
