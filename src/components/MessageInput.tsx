import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";

interface MessageInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
}

export interface MessageInputHandle {
	focus: () => void;
}

export const MessageInput = forwardRef<MessageInputHandle, MessageInputProps>(
	({ onSend, disabled }, ref) => {
		const [text, setText] = useState("");
		const textareaRef = useRef<HTMLTextAreaElement>(null);

		useImperativeHandle(ref, () => ({
			focus: () => textareaRef.current?.focus(),
		}));

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

		return (
			<form onSubmit={handleSubmit} className="p-4">
				<div className="rounded-2xl border bg-card shadow-sm">
					<textarea
						ref={textareaRef}
						value={text}
						onChange={(e) => setText(e.target.value)}
						onKeyDown={handleKeyDown}
						placeholder="How can I help you today?"
						rows={1}
						disabled={disabled}
						className="w-full resize-none rounded-t-2xl bg-transparent px-4 pt-3 pb-2 text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
					/>
					<div className="flex items-center justify-between px-3 pb-3">
						<button
							type="button"
							className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
						>
							<svg
								xmlns="http://www.w3.org/2000/svg"
								width="14"
								height="14"
								viewBox="0 0 24 24"
								fill="none"
								stroke="currentColor"
								strokeWidth="2"
								strokeLinecap="round"
								strokeLinejoin="round"
								aria-label="Folder"
							>
								<title>Folder</title>
								<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
							</svg>
							Work in a folder
						</button>
						<div className="flex items-center gap-2">
							<span className="text-xs text-muted-foreground">Sonnet 4.5</span>
							<button
								type="submit"
								disabled={disabled || !text.trim()}
								className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
							>
								Let&apos;s go →
							</button>
						</div>
					</div>
				</div>
			</form>
		);
	},
);

MessageInput.displayName = "MessageInput";
