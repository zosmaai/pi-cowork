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
		<div className="mb-3">
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className={cn(
					"flex items-center gap-1.5 text-xs font-medium transition-colors",
					isThinking ? "text-primary animate-pulse" : "text-muted-foreground hover:text-foreground",
				)}
			>
				<Brain className="w-3.5 h-3.5" />
				<span>{isThinking ? "Thinking..." : "Thought process"}</span>
				{expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
			</button>
			{expanded && (
				<div className="mt-1.5 pl-5 text-xs text-muted-foreground/80 whitespace-pre-wrap leading-relaxed">
					{thinking || "..."}
				</div>
			)}
		</div>
	);
}
