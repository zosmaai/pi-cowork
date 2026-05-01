import { useExtensions } from "@/hooks/useExtensions";
import { usePiStatus } from "@/hooks/usePiStatus";
import { useProviders } from "@/hooks/useProviders";
import type { ExtensionInfo, ModelInfo, ProviderInfo } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import {
	ChevronRight,
	Cpu,
	FolderOpen,
	Info,
	Monitor,
	Plus,
	Puzzle,
	Save,
	Settings,
	Trash2,
	X,
} from "lucide-react";
import { useCallback, useState } from "react";

// ============================================================================
// Provider configuration types
// ============================================================================

/** Quick-add provider presets that users can one-click add. */
interface ProviderPreset {
	id: string;
	name: string;
	baseUrl: string;
	api: string;
	apiKeyHint: string;
	description: string;
}

const PROVIDER_PRESETS: ProviderPreset[] = [
	{
		id: "openai",
		name: "OpenAI",
		baseUrl: "https://api.openai.com/v1",
		api: "openai-completions",
		apiKeyHint: "sk-...",
		description: "GPT-4o, GPT-4.1, o3, o4-mini",
	},
	{
		id: "anthropic",
		name: "Anthropic",
		baseUrl: "https://api.anthropic.com/v1",
		api: "anthropic",
		apiKeyHint: "sk-ant-...",
		description: "Claude Sonnet 4, Claude Haiku 3.5",
	},
	{
		id: "google",
		name: "Google Gemini",
		baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
		api: "openai-completions",
		apiKeyHint: "AIza...",
		description: "Gemini 2.5 Pro, Gemini 2.5 Flash",
	},
	{
		id: "groq",
		name: "Groq",
		baseUrl: "https://api.groq.com/openai/v1",
		api: "openai-completions",
		apiKeyHint: "gsk_...",
		description: "Llama, Mixtral, Gemma (fast inference)",
	},
	{
		id: "together",
		name: "Together AI",
		baseUrl: "https://api.together.xyz/v1",
		api: "openai-completions",
		apiKeyHint: "tgpv...",
		description: "DeepSeek, Qwen, Llama hosted",
	},
	{
		id: "xai",
		name: "xAI",
		baseUrl: "https://api.x.ai/v1",
		api: "openai-completions",
		apiKeyHint: "xai-...",
		description: "Grok 3, Grok 3 Mini",
	},
];

/** Model entry for the provider editor. */
interface EditableModel {
	id: string;
	name: string;
	contextWindow: number;
	maxTokens: number;
}

/** A provider being edited in the UI. */
interface EditableProvider {
	id: string;
	baseUrl: string;
	api: string;
	apiKey: string;
	models: EditableModel[];
}

// ============================================================================
// Sub-components
// ============================================================================

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

/** Single provider edit form. */
function ProviderEditForm({
	provider,
	onUpdate,
	onDelete,
}: {
	provider: EditableProvider;
	onUpdate: (updated: EditableProvider) => void;
	onDelete: () => void;
}) {
	const addModel = () => {
		onUpdate({
			...provider,
			models: [
				...provider.models,
				{
					id: "",
					name: "",
					contextWindow: 128000,
					maxTokens: 8192,
				},
			],
		});
	};

	const updateModel = (idx: number, model: EditableModel) => {
		const models = [...provider.models];
		models[idx] = model;
		onUpdate({ ...provider, models });
	};

	const removeModel = (idx: number) => {
		const models = provider.models.filter((_, i) => i !== idx);
		onUpdate({ ...provider, models });
	};

	return (
		<div className="space-y-3 p-3 rounded-lg border" style={{ borderColor: "hsl(var(--border))" }}>
			{/* Header */}
			<div className="flex items-center justify-between">
				<span className="text-sm font-medium text-foreground">{provider.id}</span>
				<button
					type="button"
					onClick={onDelete}
					className="p-1 rounded hover:bg-destructive/10 transition-colors"
					style={{ color: "hsl(var(--destructive))" }}
					title="Remove provider"
				>
					<Trash2 className="w-3.5 h-3.5" />
				</button>
			</div>

			{/* API type */}
			<div>
				<label htmlFor={`${provider.id}-api`} className="text-xs text-muted-foreground mb-1 block">API Type</label>
				<select
					id={`${provider.id}-api`}
					value={provider.api}
					onChange={(e) => onUpdate({ ...provider, api: e.target.value })}
					className="w-full text-sm rounded-lg border bg-background px-3 py-1.5 text-foreground focus:outline-none focus:ring-1"
					style={{ borderColor: "hsl(var(--border))" }}
				>
					<option value="openai-completions">OpenAI Compatible</option>
					<option value="anthropic">Anthropic</option>
				</select>
			</div>

			{/* Base URL */}
			<div>
				<label htmlFor={`${provider.id}-baseUrl`} className="text-xs text-muted-foreground mb-1 block">Base URL</label>
				<input
					id={`${provider.id}-baseUrl`}
					type="text"
					value={provider.baseUrl}
					onChange={(e) => onUpdate({ ...provider, baseUrl: e.target.value })}
					placeholder="https://api.openai.com/v1"
					className="w-full text-sm rounded-lg border bg-background px-3 py-1.5 text-foreground font-mono focus:outline-none focus:ring-1"
					style={{ borderColor: "hsl(var(--border))" }}
				/>
			</div>

			{/* API Key */}
			<div>
				<label htmlFor={`${provider.id}-apiKey`} className="text-xs text-muted-foreground mb-1 block">
					API Key <span className="text-destructive">*</span>
				</label>
				<input
					id={`${provider.id}-apiKey`}
					type="password"
					value={provider.apiKey}
					onChange={(e) => onUpdate({ ...provider, apiKey: e.target.value })}
					placeholder="sk-..."
					className="w-full text-sm rounded-lg border bg-background px-3 py-1.5 text-foreground font-mono focus:outline-none focus:ring-1"
					style={{ borderColor: "hsl(var(--border))" }}
				/>
			</div>

			{/* Models list */}
			<div>
				<div className="flex items-center justify-between mb-1">
					<span className="text-xs text-muted-foreground">Models</span>
					<button
						type="button"
						onClick={addModel}
						className="text-xs text-primary hover:underline flex items-center gap-1"
					>
						<Plus className="w-3 h-3" /> Add model
					</button>
				</div>
				<div className="space-y-2">
					{provider.models.map((model, idx) => (
						<div
							key={model.id || `model-${idx}`}
							className="flex items-center gap-2 rounded-lg border p-2"
							style={{ borderColor: "hsl(var(--border))" }}
						>
							<div className="flex-1 space-y-1">
								<input
									type="text"
									value={model.id}
									onChange={(e) => updateModel(idx, { ...model, id: e.target.value })}
									placeholder="Model ID (e.g., gpt-4o)"
									className="w-full text-xs rounded bg-muted px-2 py-1 text-foreground font-mono focus:outline-none"
								/>
								<input
									type="text"
									value={model.name}
									onChange={(e) => updateModel(idx, { ...model, name: e.target.value })}
									placeholder="Display name"
									className="w-full text-xs rounded bg-muted px-2 py-1 text-foreground focus:outline-none"
								/>
								<div className="flex gap-2">
									<input
										type="number"
										value={model.contextWindow}
										onChange={(e) =>
											updateModel(idx, { ...model, contextWindow: Number(e.target.value) })
										}
										placeholder="Context window"
										className="w-24 text-[10px] rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono focus:outline-none"
									/>
									<input
										type="number"
										value={model.maxTokens}
										onChange={(e) =>
											updateModel(idx, { ...model, maxTokens: Number(e.target.value) })
										}
										placeholder="Max tokens"
										className="w-20 text-[10px] rounded bg-muted px-2 py-0.5 text-muted-foreground font-mono focus:outline-none"
									/>
								</div>
							</div>
							<button
								type="button"
								onClick={() => removeModel(idx)}
								className="p-1 rounded hover:bg-destructive/10 shrink-0 transition-colors"
								style={{ color: "hsl(var(--muted-foreground))" }}
							>
								<X className="w-3 h-3" />
							</button>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

// ============================================================================
// Main Settings View
// ============================================================================

export function SettingsView() {
	const { status } = usePiStatus();
	const { extensions, loading: extensionsLoading } = useExtensions();
	const { config, providers, loading: providersLoading, modelsForProvider, refresh } = useProviders();

	// Provider editor state
	const [editing, setEditing] = useState(false);
	const [editableProviders, setEditableProviders] = useState<EditableProvider[]>([]);
	const [showQuickAdd, setShowQuickAdd] = useState(false);
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [saveSuccess, setSaveSuccess] = useState(false);

	// Load editable providers from backend
	const loadEditableProviders = useCallback(async () => {
		try {
			const raw = await invoke<{ providers?: Record<string, unknown> }>("get_models_config");
			const providersMap = raw.providers || {};
			const editable: EditableProvider[] = Object.entries(providersMap).map(([id, cfg]) => {
				const config = cfg as Record<string, unknown>;
				const models = (config.models as Array<Record<string, unknown>>) || [];
				return {
					id,
					baseUrl: (config.baseUrl as string) || "",
					api: (config.api as string) || "openai-completions",
					apiKey: (config.apiKey as string) || "",
					models: models.map((m) => ({
						id: (m.id as string) || "",
						name: (m.name as string) || "",
						contextWindow: (m.contextWindow as number) || 128000,
						maxTokens: (m.maxTokens as number) || 8192,
					})),
				};
			});
			setEditableProviders(editable);
		} catch (err) {
			console.error("[cowork] Failed to load models config:", err);
		}
	}, []);

	// Save providers to backend
	const handleSave = async () => {
		setSaving(true);
		setSaveError(null);
		setSaveSuccess(false);

		try {
			const providersObj: Record<string, unknown> = {};
			for (const p of editableProviders) {
				providersObj[p.id] = {
					baseUrl: p.baseUrl,
					api: p.api,
					apiKey: p.apiKey,
					compat: {
						supportsDeveloperRole: p.api !== "anthropic",
						supportsReasoningEffort: false,
					},
					models: p.models
						.filter((m) => m.id.trim())
						.map((m) => ({
							id: m.id,
							name: m.name || m.id,
							reasoning: false,
							input: ["text"],
							contextWindow: m.contextWindow,
							maxTokens: m.maxTokens,
							cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
						})),
				};
			}

			await invoke("save_models_config", { content: { providers: providersObj } });
			await refresh();

			setSaveSuccess(true);
			setEditing(false);
			setTimeout(() => setSaveSuccess(false), 3000);
		} catch (err) {
			setSaveError(err instanceof Error ? err.message : String(err));
		} finally {
			setSaving(false);
		}
	};

	// Add a preset provider
	const addPreset = (preset: ProviderPreset) => {
		if (editableProviders.some((p) => p.id === preset.id)) return;
		setEditableProviders([
			...editableProviders,
			{
				id: preset.id,
				baseUrl: preset.baseUrl,
				api: preset.api,
				apiKey: "",
				models: [
					{
						id: "",
						name: "",
						contextWindow: 128000,
						maxTokens: 8192,
					},
				],
			},
		]);
		setShowQuickAdd(false);
	};

	// Start editing
	const startEditing = () => {
		loadEditableProviders();
		setEditing(true);
		setShowQuickAdd(false);
		setSaveError(null);
		setSaveSuccess(false);
	};

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

				{/* Providers Section */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<div className="flex items-center gap-2">
							<Cpu className="w-4 h-4 text-muted-foreground" />
							<h2 className="text-sm font-semibold text-foreground">Models &amp; Providers</h2>
							{config?.defaultModel && (
								<span className="text-xs text-muted-foreground">
									Default: {config.defaultModel}
								</span>
							)}
						</div>
						{!editing && (
							<button
								type="button"
								onClick={startEditing}
								className="text-xs text-primary hover:underline flex items-center gap-1"
							>
								Configure
							</button>
						)}
					</div>

					{/* Editing mode: provider forms */}
					{editing ? (
						<div className="space-y-3">
							{/* Quick-add presets */}
							{showQuickAdd && (
								<div className="rounded-xl border bg-card p-3 space-y-2">
									<div className="flex items-center justify-between">
										<span className="text-xs font-medium text-foreground">Add Provider</span>
										<button
											type="button"
											onClick={() => setShowQuickAdd(false)}
											className="text-muted-foreground hover:text-foreground"
										>
											<X className="w-3.5 h-3.5" />
										</button>
									</div>
									<div className="grid grid-cols-2 gap-2">
										{PROVIDER_PRESETS.filter(
											(p) => !editableProviders.some((ep) => ep.id === p.id),
										).map((preset) => (
											<button
												key={preset.id}
												type="button"
												onClick={() => addPreset(preset)}
												className="text-left p-2 rounded-lg border hover:bg-muted transition-colors"
												style={{ borderColor: "hsl(var(--border))" }}
											>
												<div className="text-xs font-medium text-foreground">
													{preset.name}
												</div>
												<div className="text-[10px] text-muted-foreground mt-0.5">
													{preset.description}
												</div>
											</button>
										))}
									</div>
									<div className="pt-1">
										<button
											type="button"
											onClick={() => {
												const id = `custom-${Date.now()}`;
												setEditableProviders([
													...editableProviders,
													{
														id,
														baseUrl: "",
														api: "openai-completions",
														apiKey: "",
														models: [],
													},
												]);
												setShowQuickAdd(false);
											}}
											className="text-xs text-muted-foreground hover:text-foreground"
										>
											+ Custom provider
										</button>
									</div>
								</div>
							)}

							{/* Provider edit forms */}
							{editableProviders.map((p) => (
								<ProviderEditForm
									key={p.id}
									provider={p}
									onUpdate={(updated) => {
										setEditableProviders(
											editableProviders.map((ep) => (ep.id === p.id ? updated : ep)),
										);
									}}
									onDelete={() => {
										setEditableProviders(editableProviders.filter((ep) => ep.id !== p.id));
									}}
								/>
							))}

							<div className="space-y-2">
								{/* Quick-add trigger */}
								<button
									type="button"
									onClick={() => setShowQuickAdd(!showQuickAdd)}
									className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-dashed text-sm text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
									style={{ borderColor: "hsl(var(--border))" }}
								>
									<Plus className="w-4 h-4" />
									Add provider
								</button>

								{/* Save / Cancel buttons */}
								<div className="flex items-center gap-2 pt-2">
									<button
										type="button"
										onClick={handleSave}
										disabled={saving}
										className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium transition-all hover:opacity-90 disabled:opacity-50"
										style={{
											background: "hsl(var(--primary))",
											color: "hsl(var(--primary-foreground))",
										}}
									>
										<Save className="w-3.5 h-3.5" />
										{saving ? "Saving..." : "Save & Reload"}
									</button>
									<button
										type="button"
										onClick={() => {
											setEditing(false);
											setShowQuickAdd(false);
											setSaveError(null);
										}}
										className="px-3 py-2 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
									>
										Cancel
									</button>
								</div>

								{/* Save feedback */}
								{saveError && (
									<p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>
										{saveError}
									</p>
								)}
								{saveSuccess && (
									<p className="text-xs" style={{ color: "hsl(var(--success))" }}>
										Providers saved successfully. Models will update on next prompt.
									</p>
								)}
							</div>
						</div>
					) : (
						/* Read-only providers list */
						<div className="rounded-xl border bg-card p-4 divide-y divide-border">
							{providersLoading ? (
								<div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
							) : providers.length === 0 ? (
								<div className="py-4 text-center text-sm text-muted-foreground">
									No providers configured.
									<button
										type="button"
										onClick={startEditing}
										className="block mx-auto mt-2 text-primary hover:underline text-xs"
									>
										Add your first provider
									</button>
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
					)}
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
							~/zosma-cowork
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
								<span>Agent Status</span>
								<span className="text-foreground">
									{status?.installed ? "Installed" : "Not installed"}
								</span>
							</div>
							{status?.version && (
								<div className="flex justify-between">
									<span>Agent Version</span>
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
