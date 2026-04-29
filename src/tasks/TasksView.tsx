import { CheckSquare, Clock } from "lucide-react";

export function TasksView() {
	return (
		<div className="flex-1 flex flex-col items-center justify-center h-full text-muted-foreground gap-4">
			<div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
				<CheckSquare className="w-8 h-8 opacity-40" />
			</div>
			<div className="text-center">
				<h2 className="text-lg font-medium text-foreground mb-1">Tasks</h2>
				<p className="text-sm max-w-sm">
					Scheduled prompts and recurring tasks will appear here. Ask Pi to schedule something for
					you.
				</p>
			</div>
			<div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
				<Clock className="w-3.5 h-3.5" />
				<span>Coming in Phase 2</span>
			</div>
		</div>
	);
}
