import { cn } from "@/lib/utils";
import { Brain, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";

interface ThinkingBlockProps {
	thinking: string;
	isThinking?: boolean;
}

export function ThinkingBlock({ thinking, isThinking }: ThinkingBlockProps) {
	const [expanded, setExpanded] = useState(true);

	if (!thinking && !isThinking) return null;

	return (
		<div className="mb-2">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={cn("flex items-center gap-1.5 text-xs font-medium transition-colors")}
				style={{
					color: isThinking ? "hsl(var(--thinking-active-fg))" : "hsl(var(--thinking-fg))",
				}}
			>
				<Brain className="w-3.5 h-3.5" />
				<span>{isThinking ? "Thinking..." : "Thought process"}</span>
				{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
			</button>
			{expanded && (
				<div
					className="mt-1.5 pl-5 text-xs whitespace-pre-wrap leading-relaxed animate-fade-in"
					style={{
						color: "hsl(var(--thinking-fg))",
						opacity: isThinking ? 1 : 0.8,
					}}
				>
					{thinking || "..."}
				</div>
			)}
		</div>
	);
}
