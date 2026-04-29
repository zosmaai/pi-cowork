import type { StreamState } from "@/hooks/usePiStream";
import { AlertCircle, Check, Loader2, Terminal, X } from "lucide-react";

interface RightPanelProps {
	streamState: StreamState;
	onClose: () => void;
}

export function RightPanel({ streamState, onClose }: RightPanelProps) {
	const toolCalls = streamState.streamingMessage?.toolCalls || [];
	const hasTools = toolCalls.length > 0;

	return (
		<div className="w-[280px] flex flex-col gap-4 p-4 border-l bg-sidebar overflow-y-auto shrink-0">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-foreground">Context</h3>
				<button
					type="button"
					onClick={onClose}
					className="p-1 rounded hover:bg-sidebar-accent transition-colors"
					aria-label="Close panel"
				>
					<X className="w-4 h-4 text-muted-foreground" />
				</button>
			</div>

			{/* Status */}
			<div className="rounded-xl border bg-card p-4">
				<h3 className="text-sm font-semibold text-foreground mb-3">Status</h3>
				<div className="flex items-center gap-2">
					{streamState.isRunning ? (
						<>
							<Loader2 className="w-4 h-4 animate-spin text-primary" />
							<span className="text-xs text-muted-foreground capitalize">
								{streamState.status.replace("_", " ")}
							</span>
						</>
					) : (
						<>
							<Check className="w-4 h-4 text-emerald-500" />
							<span className="text-xs text-muted-foreground">Idle</span>
						</>
					)}
				</div>
				{streamState.streamingMessage?.model && (
					<p className="text-[10px] text-muted-foreground mt-2">
						{streamState.streamingMessage.provider}/{streamState.streamingMessage.model}
					</p>
				)}
			</div>

			{/* Tool calls */}
			{hasTools && (
				<div className="rounded-xl border bg-card p-4">
					<h3 className="text-sm font-semibold text-foreground mb-3">
						Tool Calls ({toolCalls.length})
					</h3>
					<div className="space-y-2">
						{toolCalls.map((tc) => (
							<div
								key={tc.id}
								className={`rounded-lg border p-2 ${
									tc.status === "running"
										? "bg-primary/5 border-primary/20"
										: tc.status === "error"
											? "bg-destructive/5 border-destructive/20"
											: "bg-emerald-500/5 border-emerald-500/20"
								}`}
							>
								<div className="flex items-center gap-2">
									{tc.status === "running" ? (
										<Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
									) : tc.status === "error" ? (
										<AlertCircle className="w-3.5 h-3.5 text-destructive" />
									) : (
										<Check className="w-3.5 h-3.5 text-emerald-500" />
									)}
									<Terminal className="w-3.5 h-3.5 text-muted-foreground" />
									<span className="text-xs font-medium text-foreground flex-1">{tc.name}</span>
								</div>
								{tc.result && (
									<pre className="mt-1 text-[10px] text-muted-foreground bg-muted/50 rounded p-1.5 overflow-x-auto whitespace-pre-wrap">
										{tc.result}
									</pre>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Usage */}
			{streamState.messages.length > 0 && (
				<div className="rounded-xl border bg-card p-4">
					<h3 className="text-sm font-semibold text-foreground mb-3">Session</h3>
					<div className="space-y-1 text-xs text-muted-foreground">
						<div className="flex justify-between">
							<span>Messages</span>
							<span className="text-foreground">{streamState.messages.length}</span>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}
