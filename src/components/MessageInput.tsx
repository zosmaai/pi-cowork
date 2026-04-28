import { useEffect, useRef, useState } from "react";

interface MessageInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
}

export function MessageInput({ onSend, disabled }: MessageInputProps) {
	const [text, setText] = useState("");
	const textareaRef = useRef<HTMLTextAreaElement>(null);

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
		<form
			onSubmit={handleSubmit}
			className="flex items-end gap-3 p-4 border-t border-surface-800 bg-surface-950"
		>
			<div className="flex-1 relative">
				<textarea
					ref={textareaRef}
					value={text}
					onChange={(e) => setText(e.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Ask pi anything... (Shift+Enter for new line)"
					rows={1}
					disabled={disabled}
					className="w-full resize-none rounded-xl bg-surface-900 border border-surface-800 px-4 py-3 pr-12 text-surface-100 placeholder-surface-500 focus:outline-none focus:ring-2 focus:ring-primary-600/50 focus:border-primary-600/50 disabled:opacity-50"
				/>
			</div>
			<button
				type="submit"
				disabled={disabled || !text.trim()}
				className="flex-shrink-0 w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-500 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="18"
					height="18"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
					role="img"
					aria-label="Send message"
				>
					<path d="m22 2-7 20-4-9-9-4Z" />
					<path d="M22 2 11 13" />
				</svg>
			</button>
		</form>
	);
}
