/**
 * StatusBar — Premium real-time status shown during streaming.
 *
 * Features:
 *   - Elapsed time counter
 *   - Current state label (thinking / running [tool] / writing)
 *   - Tool call progress (n/total)
 *   - Gradient progress bar for running tools
 *   - Abort button
 */

import type { ChatMessage } from "@/types";
import { Loader2, Square, Terminal } from "lucide-react";
import { useEffect, useState } from "react";

type StreamStateStatus = "idle" | "thinking" | "tool_call" | "responding" | "error";

interface StatusBarProps {
	isRunning: boolean;
	status: StreamStateStatus;
	streamingMessage: ChatMessage | null;
	onAbort: () => void;
}

export function StatusBar({ isRunning, status, streamingMessage, onAbort }: StatusBarProps) {
	const [elapsed, setElapsed] = useState(0);
	const [startTime] = useState(() => Date.now());

	// Elapsed time counter
	useEffect(() => {
		if (!isRunning) {
			setElapsed(0);
			return;
		}
		const tick = () => setElapsed(Math.floor((Date.now() - startTime) / 1000));
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	}, [isRunning, startTime]);

	if (!isRunning) return null;

	const toolCalls = streamingMessage?.toolCalls || [];
	const runningTool = toolCalls.find((tc) => tc.status === "running");
	const completedTools = toolCalls.filter(
		(tc) => tc.status === "completed" || tc.status === "error",
	).length;
	const totalTools = toolCalls.length;

	const statusLabel =
		status === "thinking"
			? "Thinking"
			: status === "tool_call"
				? runningTool
					? runningTool.name
					: "Running tool"
				: status === "responding"
					? "Writing"
					: status === "error"
						? "Error"
						: status;

	return (
		<div
			className="flex items-center justify-between px-4 py-2 border-t animate-fade-in"
			style={{
				background: "hsl(var(--status-bg))",
				borderColor: "hsl(var(--status-divider))",
			}}
		>
			<div className="flex items-center gap-2.5">
				{/* Spin icon */}
				<Loader2
					className="w-3.5 h-3.5 animate-spin"
					style={{ color: "hsl(var(--status-active-fg))" }}
				/>

				{/* Primary status label */}
				<span className="text-xs font-medium" style={{ color: "hsl(var(--status-active-fg))" }}>
					{statusLabel}
				</span>

				{/* Tool name if applicable */}
				{status === "tool_call" && runningTool && (
					<span className="flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/60 px-1.5 py-0 rounded font-mono">
						<Terminal className="w-2.5 h-2.5" />
						{runningTool.name}
					</span>
				)}

				{/* Tool progress */}
				{totalTools > 0 && (
					<span className="text-[10px] text-muted-foreground tabular-nums">
						{completedTools}/{totalTools} tools
					</span>
				)}

				{/* Separator */}
				<span className="text-muted-foreground/30">·</span>

				{/* Elapsed time */}
				<span className="text-[10px] text-muted-foreground/60 tabular-nums font-mono">
					{formatElapsed(elapsed)}
				</span>

				{/* Model badge */}
				{streamingMessage?.model && (
					<>
						<span className="text-muted-foreground/30">·</span>
						<span className="text-[10px] text-muted-foreground/50 bg-muted/40 px-1.5 py-0 rounded font-mono">
							{streamingMessage.provider}/{streamingMessage.model}
						</span>
					</>
				)}
			</div>

			{/* Abort button */}
			<button
				type="button"
				onClick={onAbort}
				className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs text-destructive hover:bg-destructive/10 transition-colors"
			>
				<Square className="w-3 h-3 fill-current" />
				Stop
			</button>
		</div>
	);
}

function formatElapsed(seconds: number): string {
	if (seconds < 60) return `${seconds}s`;
	const m = Math.floor(seconds / 60);
	const s = seconds % 60;
	return `${m}m ${s.toString().padStart(2, "0")}s`;
}
