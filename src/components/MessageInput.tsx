import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface MessageInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	modelLabel?: string;
}

export interface MessageInputHandle {
	focus: () => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
	({ onSend, disabled, modelLabel }, ref) => {
		const [text, setText] = useState("");
		const textareaRef = useRef<HTMLTextAreaElement>(null);

		useImperativeHandle(ref, () => ({
			focus: () => textareaRef.current?.focus(),
		}));

		// Auto-resize textarea
		// biome-ignore lint/correctness/useExhaustiveDependencies: textareaRef is stable
		useEffect(() => {
			const textarea = textareaRef.current;
			if (!textarea) return;
			textarea.style.height = "auto";
			textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
		}, [text]);

		function handleSubmit(e?: React.FormEvent) {
			e?.preventDefault();
			const trimmed = text.trim();
			if (!trimmed || disabled) return;
			onSend(trimmed);
			setText("");
			if (textareaRef.current) {
				textareaRef.current.style.height = "auto";
			}
		}

		function handleKeyDown(e: React.KeyboardEvent) {
			if (e.key === "Enter" && !e.shiftKey) {
				e.preventDefault();
				handleSubmit();
			}
		}

		const placeholder = disabled
			? "Pi is thinking..."
			: "Message Pi... (Enter to send, Shift+Enter for newline)";

		return (
			<form onSubmit={handleSubmit} className="p-4">
				<div className="rounded-2xl border bg-card shadow-sm focus-within:ring-1 focus-within:ring-primary/30">
					<textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder={placeholder}
						rows={1}
						disabled={disabled}
						className="w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3 pb-2 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
					/>
					<div className="flex items-center justify-between px-3 pb-3">
						<span className="text-xs text-muted-foreground/60">{modelLabel || "Pi"}</span>
						<button
							type="submit"
							disabled={disabled || !text.trim()}
							className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
						>
							Send →
						</button>
					</div>
				</div>
			</form>
		);
	},
);

MessageInput.displayName = "MessageInput";
