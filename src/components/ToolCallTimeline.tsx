/**
 * ToolCallTimeline — Compact inline tool call display inspired by pi TUI.
 *
 * Instead of stacked accordion cards, tool calls render as a single
 * compact timeline with:
 *   - A vertical line connecting steps
 *   - Status dots (running: pulsing accent, done: green check, error: red)
 *   - Tool name as inline text
 *   - Click to expand args/result
 *   - Running tool gets a subtle animated progress line
 */

import { cn } from "@/lib/utils";
import type { ToolCallInfo } from "@/types";
import { AlertCircle, Check, ChevronRight, Clock, Loader2, Terminal } from "lucide-react";
import { useState } from "react";

interface ToolCallTimelineProps {
	toolCalls: ToolCallInfo[];
	defaultExpanded?: boolean;
	isLatest?: boolean;
}

export function ToolCallTimeline({
	toolCalls,
	defaultExpanded = false,
	isLatest,
}: ToolCallTimelineProps) {
	if (toolCalls.length === 0) return null;

	return (
		<div className="my-2 animate-fade-in">
			<div className="flex flex-col">
				{toolCalls.map((tc, idx) => (
					<ToolCallItem
						key={tc.id}
						toolCall={tc}
						isLast={idx === toolCalls.length - 1}
						defaultExpanded={defaultExpanded || (isLatest && idx === toolCalls.length - 1)}
					/>
				))}
			</div>
		</div>
	);
}

interface ToolCallItemProps {
	toolCall: ToolCallInfo;
	isLast: boolean;
	defaultExpanded?: boolean;
}

function ToolCallItem({ toolCall, isLast, defaultExpanded }: ToolCallItemProps) {
	const [expanded, setExpanded] = useState(defaultExpanded ?? false);

	const isRunning = toolCall.status === "running";
	const isCompleted = toolCall.status === "completed";
	const isError = toolCall.status === "error";
	const hasDetail = (toolCall.result !== undefined && toolCall.result !== "") || expanded;

	return (
		<div className="flex gap-2.5 group">
			{/* Timeline column */}
			<div className="flex flex-col items-center flex-shrink-0 w-4">
				{/* Status dot */}
				<div className="flex items-center justify-center w-4 h-4 mt-0.5">
					{isRunning ? (
						<Loader2
							className="w-3 h-3 animate-spin-slow"
							style={{ color: "hsl(var(--tool-running-fg))" }}
						/>
					) : isCompleted ? (
						<Check className="w-3 h-3" style={{ color: "hsl(var(--tool-complete-fg))" }} />
					) : isError ? (
						<AlertCircle className="w-3 h-3" style={{ color: "hsl(var(--tool-error-fg))" }} />
					) : null}
				</div>

				{/* Connecting line */}
				{!isLast && (
					<div
						className={cn("w-px flex-1 min-h-3", isRunning && "animate-pulse")}
						style={{
							background: isRunning
								? "hsl(var(--tool-running-fg))"
								: "hsl(var(--tool-timeline-line))",
							opacity: isRunning ? 0.5 : 0.4,
						}}
					/>
				)}
			</div>

			{/* Content column */}
			<div className={cn("flex-1 min-w-0", isLast ? "" : "pb-2")}>
				{/* Tool name row — always visible */}
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="flex items-center gap-1.5 w-full text-left group/btn"
				>
					<Terminal className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
					<span
						className={cn(
							"text-xs font-mono font-medium truncate transition-colors",
							isRunning
								? "text-foreground"
								: "text-muted-foreground group-hover/btn:text-foreground",
						)}
					>
						{toolCall.name}
					</span>

					{isRunning && (
						<span
							className="text-[10px] px-1.5 py-0 rounded-sm font-medium"
							style={{
								background: "hsl(var(--tool-running-bg))",
								color: "hsl(var(--tool-running-fg))",
							}}
						>
							running
						</span>
					)}

					{hasDetail && !isRunning && (
						<ChevronRight
							className={cn(
								"w-3 h-3 text-muted-foreground/50 transition-transform",
								expanded && "rotate-90",
							)}
						/>
					)}
				</button>

				{/* Expanded detail */}
				{expanded && (
					<div className="mt-1.5 animate-fade-in space-y-1.5">
						{/* Arguments */}
						{Object.keys(toolCall.args).length > 0 && (
							<div className="rounded-md p-2" style={{ background: "hsl(var(--muted) / 0.5)" }}>
								<div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">
									Input
								</div>
								<pre className="text-[11px] text-foreground overflow-x-auto font-mono leading-relaxed">
									{formatArgs(toolCall.args)}
								</pre>
							</div>
						)}

						{/* Result */}
						{toolCall.result !== undefined && toolCall.result !== "" && (
							<div
								className={cn("rounded-md p-2", isError && "border border-destructive/20")}
								style={{
									background: isError ? "hsl(var(--error-subtle))" : "hsl(var(--success-subtle))",
								}}
							>
								<div
									className={cn(
										"text-[10px] uppercase tracking-wider mb-1 font-medium",
										isError ? "text-destructive" : "text-muted-foreground",
									)}
								>
									{isError ? "Error" : "Result"}
								</div>
								<pre className="text-[11px] text-foreground whitespace-pre-wrap overflow-x-auto max-h-40 overflow-y-auto font-mono leading-relaxed">
									{truncateResult(toolCall.result)}
								</pre>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}

/** Format args for display */
function formatArgs(args: Record<string, unknown>): string {
	try {
		return JSON.stringify(args, null, 2);
	} catch {
		return String(args);
	}
}

/** Truncate long results */
function truncateResult(result: string, maxLen = 2000): string {
	if (result.length <= maxLen) return result;
	return `${result.slice(0, maxLen)}\n... (truncated)`;
}

/**
 * ToolCallSummary — Inline badge-style summary shown in the message header.
 * E.g. "3 tools · 2 done · 1 running"
 */
export function ToolCallSummary({ toolCalls }: { toolCalls: ToolCallInfo[] }) {
	const running = toolCalls.filter((tc) => tc.status === "running").length;
	const completed = toolCalls.filter((tc) => tc.status === "completed").length;
	const errors = toolCalls.filter((tc) => tc.status === "error").length;

	const parts: string[] = [];
	if (completed > 0) parts.push(`${completed} done`);
	if (running > 0) parts.push(`${running} running`);
	if (errors > 0) parts.push(`${errors} failed`);

	return (
		<span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
			<Clock className="w-3 h-3" />
			{toolCalls.length} tool{toolCalls.length !== 1 ? "s" : ""}
			{parts.length > 0 && (
				<>
					<span className="text-muted-foreground/40">·</span>
					{parts.join(" · ")}
				</>
			)}
		</span>
	);
}
