import { FolderOpen, FileText, Globe } from "lucide-react";

export function RightPanel() {
	return (
		<div className="w-[280px] flex flex-col gap-4 p-4 border-l bg-sidebar overflow-y-auto">
			{/* Progress */}
			<div className="rounded-xl border bg-card p-4">
				<h3 className="text-sm font-semibold text-foreground mb-3">Progress</h3>
				<div className="flex items-center gap-2">
					<div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
						<div className="w-2 h-2 rounded-full bg-primary" />
					</div>
					<div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
						<div className="w-2 h-2 rounded-full bg-primary" />
					</div>
					<div className="w-5 h-5 rounded-full border-2 border-border" />
				</div>
				<p className="text-xs text-muted-foreground mt-3">Steps will show as the task unfolds.</p>
			</div>

			{/* Artifacts */}
			<div className="rounded-xl border bg-card p-4">
				<h3 className="text-sm font-semibold text-foreground mb-3">Artifacts</h3>
				<div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
					<FileText className="w-5 h-5 text-muted-foreground" />
				</div>
				<p className="text-xs text-muted-foreground mt-3">
					Outputs created during the task land here.
				</p>
			</div>

			{/* Context */}
			<div className="rounded-xl border bg-card p-4">
				<h3 className="text-sm font-semibold text-foreground mb-3">Context</h3>
				<div className="flex items-center gap-2">
					<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
						<FolderOpen className="w-4 h-4 text-muted-foreground" />
					</div>
					<div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
						<FileText className="w-4 h-4 text-muted-foreground" />
					</div>
				</div>
				<p className="text-xs text-muted-foreground mt-3">
					Track the tools and files in use as pi works.
				</p>
			</div>

			{/* Suggested connectors */}
			<div className="rounded-xl border bg-card p-4">
				<div className="flex items-center justify-between mb-3">
					<h3 className="text-sm font-semibold text-foreground">Suggested connectors</h3>
				</div>
				<p className="text-xs text-muted-foreground mb-3">
					Pi uses connectors to browse websites, manage tasks, and more.
				</p>
				<div className="space-y-2">
					<button
						type="button"
						className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-accent transition-colors text-left"
					>
						<div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
							<Globe className="w-3.5 h-3.5 text-muted-foreground" />
						</div>
						<span className="text-xs font-medium text-foreground flex-1">GitHub</span>
						<span className="text-lg text-muted-foreground leading-none">+</span>
					</button>
					<button
						type="button"
						className="w-full flex items-center gap-3 px-3 py-2 rounded-lg border hover:bg-accent transition-colors text-left"
					>
						<div className="w-6 h-6 rounded bg-muted flex items-center justify-center">
							<FolderOpen className="w-3.5 h-3.5 text-muted-foreground" />
						</div>
						<span className="text-xs font-medium text-foreground flex-1">Local Files</span>
						<span className="text-lg text-muted-foreground leading-none">+</span>
					</button>
				</div>
			</div>
		</div>
	);
}
