import { Settings, FolderOpen, Info } from "lucide-react";
import { usePiStatus } from "@/hooks/usePiStatus";

export function SettingsView() {
	const { status } = usePiStatus();

	return (
		<div className="flex-1 overflow-y-auto p-8">
			<div className="max-w-lg mx-auto space-y-8">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
						<Settings className="w-5 h-5" />
					</div>
					<div>
						<h1 className="text-xl font-semibold text-foreground">Settings</h1>
						<p className="text-sm text-muted-foreground">
							Configure Pi Cowork
						</p>
					</div>
				</div>

				<div className="space-y-4">
					<div className="rounded-xl border bg-card p-4">
						<div className="flex items-center gap-3 mb-3">
							<FolderOpen className="w-5 h-5 text-muted-foreground" />
							<h3 className="text-sm font-medium text-foreground">
								Home Directory
							</h3>
						</div>
						<p className="text-xs text-muted-foreground font-mono bg-muted rounded-lg px-3 py-2">
							~/pi-cowork
						</p>
					</div>

					<div className="rounded-xl border bg-card p-4">
						<div className="flex items-center gap-3 mb-3">
							<Info className="w-5 h-5 text-muted-foreground" />
							<h3 className="text-sm font-medium text-foreground">About</h3>
						</div>
						<div className="space-y-2 text-sm text-muted-foreground">
							<div className="flex justify-between">
								<span>Version</span>
								<span className="text-foreground">0.1.0</span>
							</div>
							<div className="flex justify-between">
								<span>Pi Status</span>
								<span className="text-foreground">
									{status?.installed ? "Installed" : "Not installed"}
								</span>
							</div>
							{status?.version && (
								<div className="flex justify-between">
									<span>Pi Version</span>
									<span className="text-foreground">{status.version}</span>
								</div>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
