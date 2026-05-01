import type { PiStatus } from "@/types";
import { invoke } from "@tauri-apps/api/core";
import { useState } from "react";

interface WelcomeScreenProps {
	status: PiStatus;
	onRefetch: () => void;
}

export function WelcomeScreen({ status, onRefetch }: WelcomeScreenProps) {
	const [installing, setInstalling] = useState(false);
	const [installOutput, setInstallOutput] = useState("");
	const [installError, setInstallError] = useState("");

	async function handleInstall() {
		setInstalling(true);
		setInstallOutput("");
		setInstallError("");
		try {
			const output = await invoke<string>("install_pi");
			setInstallOutput(output);
			onRefetch();
		} catch (err) {
			setInstallError(err instanceof Error ? err.message : String(err));
		} finally {
			setInstalling(false);
		}
	}

	if (status.installed) {
		return (
			<div className="flex flex-col items-center justify-center h-full gap-6 p-8">
				<div className="text-6xl mb-2">🥧</div>
				<h1 className="text-3xl font-bold text-foreground">Zosma Cowork</h1>
				<div className="flex items-center gap-2 text-emerald-500">
					<span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
					<span>pi is installed</span>
				</div>
				{status.version && <p className="text-muted-foreground text-sm">{status.version}</p>}
				{status.path && <p className="text-muted-foreground text-xs font-mono">{status.path}</p>}
				<p className="text-muted-foreground max-w-md text-center">
					Ready to code. Start a new session or open an existing workspace.
				</p>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onRefetch}
						className="px-4 py-2 rounded-lg bg-secondary hover:bg-accent text-foreground transition-colors text-sm"
					>
						Refresh Status
					</button>
				</div>
			</div>
		);
	}

	return (
		<div className="flex flex-col items-center justify-center h-full gap-6 p-8">
			<div className="text-6xl mb-2">🥧</div>
			<h1 className="text-3xl font-bold text-foreground">Zosma Cowork</h1>
			<div className="flex items-center gap-2 text-amber-500">
				<span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
				<span>pi is not installed</span>
			</div>
			<p className="text-muted-foreground max-w-md text-center">
				Zosma Cowork requires the pi coding agent to be installed globally. Click below to install it
				via npm.
			</p>
			<button
				type="button"
				onClick={handleInstall}
				disabled={installing}
				className="px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90"
			>
				{installing ? "Installing..." : "Install pi coding agent"}
			</button>
			{installOutput && (
				<pre className="mt-4 p-4 rounded-lg bg-secondary text-foreground text-xs font-mono max-w-lg w-full max-h-48 overflow-auto border">
					{installOutput}
				</pre>
			)}
			{installError && (
				<div className="mt-4 p-4 rounded-lg bg-destructive/10 text-destructive text-sm max-w-lg w-full border border-destructive/20">
					{installError}
				</div>
			)}
		</div>
	);
}
