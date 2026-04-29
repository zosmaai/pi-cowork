/**
 * StreamingIndicator — Premium skeleton shown when Pi is thinking/responding.
 *
 * Shows a contextual animation based on stream status:
 *   - thinking:   animated brain dots + "Thinking..." label
 *   - tool_call:  brief tool name flash + running indicator
 *   - responding: typing cursor shimmer
 *   - idle/error:  nothing
 */

import type { StreamStateStatus } from "@/chat/ChatView";

interface StreamingIndicatorProps {
	status: StreamStateStatus;
	currentToolName?: string;
	model?: string;
	provider?: string;
}

/** Elapsed time hook — returns seconds since `since` */
function useElapsedTime(since: number | null, running: boolean): number | null {
	const [elapsed, setElapsed] = React.useState<number | null>(null);
	React.useEffect(() => {
		if (!running || since === null) {
			setElapsed(null);
			return;
		}
		const tick = () => setElapsed(Math.floor((Date.now() - since) / 1000));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [since, running]);
	return elapsed;
}

import React from "react";

export function StreamingIndicator({
	status,
	currentToolName,
	model,
	provider,
}: StreamingIndicatorProps) {
	const [streamStart] = React.useState(() => Date.now());
	const isActive = status !== "idle" && status !== "error";
	const elapsed = useElapsedTime(isActive ? streamStart : null, isActive);

	if (status === "idle" || status === "error") return null;

	return (
		<div className="animate-fade-in flex items-center gap-2.5 px-6 py-2 text-xs select-none">
			{/* Animated status indicator */}
			{status === "thinking" && <ThinkingDots />}
			{status === "tool_call" && <ToolCallPulse />}
			{status === "responding" && <TypingCursor />}

			{/* Status label */}
			<span
				className="text-muted-foreground font-medium"
				style={{ color: "hsl(var(--status-active-fg))" }}
			>
				{status === "thinking" && "Thinking"}
				{status === "tool_call" && (currentToolName ? `Using ${currentToolName}` : "Running tool")}
				{status === "responding" && "Writing"}
			</span>

			{/* Elapsed time */}
			{elapsed !== null && (
				<span className="text-muted-foreground/50 tabular-nums">{formatElapsed(elapsed)}</span>
			)}

			{/* Model badge */}
			{model && (
				<span className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground">
					{provider}/{model}
				</span>
			)}
		</div>
	);
}

/** Three bouncing dots for "thinking" state */
function ThinkingDots() {
	return (
		<div className="flex items-center gap-0.5">
			{[0, 1, 2].map((i) => (
				<span
					key={i}
					className="w-1.5 h-1.5 rounded-full"
					style={{
						background: "hsl(var(--primary))",
						animation: `typing-dot 1.4s ease-in-out ${i * 0.2}s infinite`,
					}}
				/>
			))}
		</div>
	);
}

/** Pulsing dot for "tool call" state */
function ToolCallPulse() {
	return (
		<span
			className="w-2 h-2 rounded-full animate-pulse-dot"
			style={{ background: "hsl(var(--primary))" }}
		/>
	);
}

/** Typing cursor for "responding" state */
function TypingCursor() {
	return (
		<span
			className="inline-block w-0.5 h-3.5 rounded-sm"
			style={{
				background: "hsl(var(--primary))",
				animation: "pulse-dot 1s ease-in-out infinite",
			}}
		/>
	);
}

function formatElapsed(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s}s`;
}

/**
 * MessageSkeleton — Shimmer skeleton shown for initial load or when
 * the assistant message hasn't started streaming yet.
 */
export function MessageSkeleton() {
	return (
		<div className="flex gap-4 py-4 px-6 animate-fade-in">
			{/* Avatar skeleton */}
			<div
				className="w-8 h-8 rounded-lg flex-shrink-0 animate-shimmer"
				style={{
					backgroundImage:
						"linear-gradient(90deg, hsl(var(--skeleton-bg)) 25%, hsl(var(--skeleton-shine)) 50%, hsl(var(--skeleton-bg)) 75%)",
					backgroundSize: "200% 100%",
				}}
			/>
			<div className="flex-1 space-y-2.5">
				{/* Name + timestamp skeleton */}
				<div className="flex items-center gap-2">
					<div
						className="h-3.5 w-8 rounded animate-shimmer"
						style={{
							backgroundImage:
								"linear-gradient(90deg, hsl(var(--skeleton-bg)) 25%, hsl(var(--skeleton-shine)) 50%, hsl(var(--skeleton-bg)) 75%)",
							backgroundSize: "200% 100%",
						}}
					/>
					<div
						className="h-3 w-12 rounded animate-shimmer"
						style={{
							backgroundImage:
								"linear-gradient(90deg, hsl(var(--skeleton-bg)) 25%, hsl(var(--skeleton-shine)) 50%, hsl(var(--skeleton-bg)) 75%)",
							backgroundSize: "200% 100%",
						}}
					/>
				</div>
				{/* Line skeletons */}
				{[
					{ key: "skeleton-line-1", width: "90%" },
					{ key: "skeleton-line-2", width: "75%" },
					{ key: "skeleton-line-3", width: "50%" },
				].map((line, idx) => (
					<div
						key={line.key}
						className="h-3 rounded animate-shimmer"
						style={{
							width: line.width,
							backgroundImage:
								"linear-gradient(90deg, hsl(var(--skeleton-bg)) 25%, hsl(var(--skeleton-shine)) 50%, hsl(var(--skeleton-bg)) 75%)",
							backgroundSize: "200% 100%",
							animationDelay: `${idx * 150}ms`,
						}}
					/>
				))}
			</div>
		</div>
	);
}
