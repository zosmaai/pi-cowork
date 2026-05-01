import type { AuthProviderPreset } from "@/hooks/useAuth";
import { Eye, EyeOff, Loader2, Sparkles, Star } from "lucide-react";
import { useState } from "react";

interface ProviderSetupProps {
	providers: AuthProviderPreset[];
	configuredProviders: string[];
	onSave: (providerId: string, apiKey: string) => Promise<void>;
	onCancel?: () => void;
}

export function ProviderSetup({ providers, configuredProviders, onSave, onCancel }: ProviderSetupProps) {
	const [selectedId, setSelectedId] = useState<string | null>(null);
	const [apiKey, setApiKey] = useState("");
	const [showKey, setShowKey] = useState(false);
	const [saving, setSaving] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const selectedProvider = providers.find((p) => p.id === selectedId);
	const recommended = providers.filter((p) => p.recommended);
	const others = providers.filter((p) => !p.recommended);

	const isConfigured = (id: string) => configuredProviders.includes(id);

	const handleSelect = (provider: AuthProviderPreset) => {
		setSelectedId(provider.id);
		setApiKey("");
		setError(null);
		setShowKey(false);
	};

	const handleSave = async () => {
		if (!selectedId || !apiKey.trim()) return;
		setSaving(true);
		setError(null);
		try {
			await onSave(selectedId, apiKey.trim());
			// Parent will handle navigation via callback or state change
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to save API key");
		} finally {
			setSaving(false);
		}
	};

	return (
		<div className="flex flex-col items-center justify-center h-full px-8 py-12 max-w-2xl mx-auto">
			{/* Header */}
			<div className="text-center mb-8">
				<div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
					<Sparkles className="w-7 h-7" style={{ color: "hsl(var(--primary))" }} />
				</div>
				<h1 className="text-3xl font-bold text-foreground mb-2">Connect an AI Provider</h1>
				<p className="text-sm text-muted-foreground max-w-md mx-auto">
					Choose a provider below and enter your API key to start using Zosma Cowork. Your key is stored locally on your machine.
				</p>
			</div>

			{/* Step 1: Provider selection */}
			<div className="w-full space-y-4">
				{recommended.length > 0 && (
					<>
						<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recommended</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{recommended.map((provider) => (
								<ProviderCard
									key={provider.id}
									provider={provider}
									selected={selectedId === provider.id}
									configured={isConfigured(provider.id)}
									onSelect={() => handleSelect(provider)}
								/>
							))}
						</div>
					</>
				)}

				{!selectedId && (
					<>
						<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">All Providers</h2>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
							{others.map((provider) => (
								<ProviderCard
									key={provider.id}
									provider={provider}
									selected={selectedId === provider.id}
									configured={isConfigured(provider.id)}
									onSelect={() => handleSelect(provider)}
								/>
							))}
						</div>
					</>
				)}

				{/* Step 2: API Key Input (shown when a provider is selected) */}
				{selectedProvider && (
					<div className="mt-6 space-y-4">
						<div
							className="rounded-xl border p-5 space-y-4"
							style={{ borderColor: "hsl(var(--border))" }}
						>
							<div className="flex items-center justify-between">
								<h3 className="text-sm font-medium text-foreground">
									API Key for {selectedProvider.name}
								</h3>
								<button
									type="button"
									onClick={() => setSelectedId(null)}
									className="text-xs text-muted-foreground hover:text-foreground"
								>
									← Back to providers
								</button>
							</div>

							{selectedProvider.signupUrl && (
								<p className="text-xs text-muted-foreground">
									Don't have a key?{" "}
									<a
										href={selectedProvider.signupUrl}
										target="_blank"
										rel="noopener noreferrer"
										className="text-primary hover:underline"
									>
										Get one from {selectedProvider.name} →
									</a>
								</p>
							)}

							<div>
								<label className="text-xs text-muted-foreground mb-1.5 block">
									API Key <span className="text-destructive">*</span>
								</label>
								<div className="relative">
									<input
										type={showKey ? "text" : "password"}
										value={apiKey}
										onChange={(e) => setApiKey(e.target.value)}
										placeholder={selectedProvider.apiKeyHint}
										className="w-full text-sm rounded-lg border bg-background px-3 py-2.5 pr-10 text-foreground font-mono focus:outline-none focus:ring-2"
										style={{ borderColor: "hsl(var(--border))" }}
										autoComplete="off"
										onKeyDown={(e) => {
											if (e.key === "Enter" && apiKey.trim()) handleSave();
										}}
									/>
									<button
										type="button"
										onClick={() => setShowKey(!showKey)}
										className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
									>
										{showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
									</button>
								</div>
							</div>

							{/* Actions */}
							<div className="flex items-center gap-3 pt-1">
								<button
									type="button"
									onClick={handleSave}
									disabled={!apiKey.trim() || saving}
									className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
									style={{
										background: "hsl(var(--primary))",
										color: "hsl(var(--primary-foreground))",
									}}
								>
									{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
									{saving ? "Saving..." : "Save & Continue"}
								</button>

								{onCancel && (
									<button
										type="button"
										onClick={onCancel}
										className="px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
									>
										Later
									</button>
								)}
							</div>

							{error && (
								<p className="text-xs" style={{ color: "hsl(var(--destructive))" }}>
									{error}
								</p>
							)}
						</div>
					</div>
				)}
			</div>

			{/* Learn more link */}
			<p className="mt-8 text-xs text-muted-foreground">
				Learn more about{" "}
				<a
					href="https://www.zosma.ai/zosma-cowork/ai-providers"
					target="_blank"
					rel="noopener noreferrer"
					className="text-primary hover:underline"
				>
					AI providers →
				</a>
			</p>
		</div>
	);
}

/* ------------------------------------------------------------------ */
/* Sub-components                                                     */
/* ------------------------------------------------------------------ */

function ProviderCard({
	provider,
	selected,
	configured,
	onSelect,
}: {
	provider: AuthProviderPreset;
	selected: boolean;
	configured: boolean;
	onSelect: () => void;
}) {
	return (
		<button
			type="button"
			onClick={onSelect}
			className={`text-left p-4 rounded-xl border transition-all ${
				selected ? "ring-2 ring-primary/50" : "hover:border-primary/50"
			}`}
			style={{
				borderColor: selected ? "hsl(var(--primary))" : "hsl(var(--border))",
				background: selected ? "hsl(var(--primary)/5)" : "hsl(var(--card))",
			}}
		>
			<div className="flex items-start justify-between mb-1">
				<span className="text-sm font-semibold text-foreground">{provider.name}</span>
				<div className="flex items-center gap-1.5">
					{provider.recommended && (
						<Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
					)}
					{configured && (
						<span className="text-[10px] bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full">
							Configured
						</span>
					)}
				</div>
			</div>
			<p className="text-xs text-muted-foreground leading-relaxed">{provider.description}</p>
		</button>
	);
}
