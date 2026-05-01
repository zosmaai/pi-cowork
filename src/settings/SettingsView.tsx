import { useExtensions } from "@/hooks/useExtensions";
import { usePiStatus } from "@/hooks/usePiStatus";
import { useProviders } from "@/hooks/useProviders";
import type { ExtensionInfo, ModelInfo, ProviderInfo } from "@/types";
import { ChevronRight, Cpu, FolderOpen, Info, Monitor, Puzzle, Settings } from "lucide-react";
import { useState } from "react";

function ProviderSection({
	provider,
	models,
	isDefault,
}: {
	provider: ProviderInfo;
	models: ModelInfo[];
	isDefault: boolean;
}) {
	const [expanded, setExpanded] = useState(false);

	return (
		<div>
			<button
				type="button"
				onClick={() => setExpanded(!expanded)}
				className="flex items-center justify-between w-full py-2 text-left"
			>
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground">{provider.name}</span>
					<span className="text-xs text-muted-foreground">{models.length} models</span>
					{isDefault && (
						<span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">
							Default
						</span>
					)}
				</div>
				<ChevronRight
					className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`}
				/>
			</button>
			{expanded && (
				<div className="pl-4 pb-2 space-y-1">
					{models.map((model) => (
						<div key={model.id} className="flex items-center justify-between py-1">
							<span className="text-sm text-foreground">{model.name}</span>
							<div className="flex items-center gap-2">
								{model.reasoning && (
									<span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 px-1.5 py-0.5 rounded">
										Reasoning
									</span>
								)}
								<span className="text-xs text-muted-foreground">
									{(model.contextWindow / 1000).toFixed(0)}K ctx
								</span>
							</div>
						</div>
					))}
				</div>
			)}
		</div>
	);
}
function ExtensionCard({ ext }: { ext: ExtensionInfo }) {
	return (
		<div className="flex items-start justify-between gap-3 py-2">
			<div className="flex-1 min-w-0">
				<div className="flex items-center gap-2">
					<span className="text-sm font-medium text-foreground truncate">{ext.name}</span>
					<span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
						v{ext.version}
					</span>
				</div>
				<p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{ext.description}</p>
			</div>
			<span
				className={`text-xs px-2 py-0.5 rounded-full shrink-0 ${
					ext.enabled
						? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
						: "bg-muted text-muted-foreground"
				}`}
			>
				{ext.enabled ? "Active" : "Disabled"}
			</span>
		</div>
	);
}

export function SettingsView() {
	const { status } = usePiStatus();
	const { extensions, loading: extensionsLoading } = useExtensions();
	const { config, providers, loading: providersLoading, modelsForProvider } = useProviders();

	return (
		<div className="flex-1 overflow-y-auto p-8">
			<div className="max-w-lg mx-auto space-y-8">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center">
						<Settings className="w-5 h-5" />
					</div>
					<div>
						<h1 className="text-xl font-semibold text-foreground">Settings</h1>
						<p className="text-sm text-muted-foreground">Configure Zosma Cowork</p>
					</div>
				</div>

				{/* Extensions Section */}
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Puzzle className="w-4 h-4 text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">Extensions</h2>
						<span className="text-xs text-muted-foreground">{extensions.length} installed</span>
					</div>
					<div className="rounded-xl border bg-card p-4 divide-y divide-border">
						{extensionsLoading ? (
							<div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
						) : extensions.length === 0 ? (
							<div className="py-4 text-center text-sm text-muted-foreground">
								No extensions found. Install via{" "}
								<code className="text-xs bg-muted px-1 rounded">pi install &lt;package&gt;</code>
							</div>
						) : (
							extensions.map((ext) => <ExtensionCard key={ext.id} ext={ext} />)
						)}
					</div>
				</div>

				{/* Models Section */}
				<div className="space-y-3">
					<div className="flex items-center gap-2">
						<Cpu className="w-4 h-4 text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">Models</h2>
						{config?.defaultModel && (
							<span className="text-xs text-muted-foreground">
								Default: {config.defaultModel}
							</span>
						)}
					</div>
					<div className="rounded-xl border bg-card p-4 divide-y divide-border">
						{providersLoading ? (
							<div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
						) : providers.length === 0 ? (
							<div className="py-4 text-center text-sm text-muted-foreground">
								No providers configured. Check{" "}
								<code className="text-xs bg-muted px-1 rounded">~/.pi/agent/models.json</code>
							</div>
						) : (
							providers.map((p) => (
								<ProviderSection
									key={p.id}
									provider={p}
									models={modelsForProvider(p.id)}
									isDefault={config?.defaultProvider === p.id}
								/>
							))
						)}
					</div>
				</div>

				{/* General Section */}
				<div className="space-y-4">
					<div className="flex items-center gap-2">
						<Monitor className="w-4 h-4 text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">General</h2>
					</div>
					<div className="rounded-xl border bg-card p-4">
						<div className="flex items-center gap-3 mb-3">
							<FolderOpen className="w-5 h-5 text-muted-foreground" />
							<h3 className="text-sm font-medium text-foreground">Home Directory</h3>
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
								<span className="text-foreground">0.2.0</span>
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
