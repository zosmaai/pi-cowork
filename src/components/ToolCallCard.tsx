import { useState } from "react";
import { Check, ChevronDown, ChevronUp, Loader2, Terminal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ToolCallInfo } from "@/types";

interface ToolCallCardProps {
	toolCall: ToolCallInfo;
}

export function ToolCallCard({ toolCall }: ToolCallCardProps) {
	const [expanded, setExpanded] = useState(true);

	const statusIcon =
		toolCall.status === "running" ? (
			<Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
		) : toolCall.status === "error" ? (
			<X className="w-3.5 h-3.5 text-destructive" />
		) : (
			<Check className="w-3.5 h-3.5 text-emerald-500" />
		);

	const statusBg =
		toolCall.status === "running"
			? "bg-primary/5 border-primary/20"
			: toolCall.status === "error"
				? "bg-destructive/5 border-destructive/20"
				: "bg-emerald-500/5 border-emerald-500/20";

	return (
		<div className={cn("rounded-lg border mb-2 overflow-hidden", statusBg)}>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
			>
				{statusIcon}
				<Terminal className="w-3.5 h-3.5 text-muted-foreground" />
				<span className="text-xs font-medium text-foreground flex-1">{toolCall.name}</span>
				{expanded ? (
					<ChevronUp className="w-3 h-3 text-muted-foreground" />
				) : (
					<ChevronDown className="w-3 h-3 text-muted-foreground" />
				)}
			</button>
			{expanded && (
				<div className="px-3 pb-3 space-y-2">
					{/* Arguments */}
					<div className="rounded bg-muted/50 p-2">
						<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
							Arguments
						</div>
						<pre className="text-[11px] text-foreground overflow-x-auto">
							{JSON.stringify(toolCall.args, null, 2)}
						</pre>
					</div>
					{/* Result */}
					{toolCall.result !== undefined && (
						<div className="rounded bg-muted/50 p-2">
							<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
								{toolCall.isError ? "Error" : "Result"}
							</div>
							<pre className="text-[11px] text-foreground whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto">
								{toolCall.result}
							</pre>
						</div>
					)}
				</div>
			)}
		</div>
	);
}
