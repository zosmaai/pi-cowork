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
				<h1 className="text-3xl font-bold text-surface-100">Pi Cowork</h1>
				<div className="flex items-center gap-2 text-emerald-400">
					<span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
					<span>pi is installed</span>
				</div>
				{status.version && <p className="text-surface-400 text-sm">{status.version}</p>}
				{status.path && <p className="text-surface-500 text-xs font-mono">{status.path}</p>}
				<p className="text-surface-400 max-w-md text-center">
					Ready to code. Start a new session or open an existing workspace.
				</p>
				<div className="flex gap-3">
					<button
						type="button"
						onClick={onRefetch}
						className="px-4 py-2 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 transition-colors text-sm"
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
			<h1 className="text-3xl font-bold text-surface-100">Pi Cowork</h1>
			<div className="flex items-center gap-2 text-amber-400">
				<span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
				<span>pi is not installed</span>
			</div>
			<p className="text-surface-400 max-w-md text-center">
				Pi Cowork requires the pi coding agent to be installed globally. Click below to install it
				via npm.
			</p>
			<button
				type="button"
				onClick={handleInstall}
				disabled={installing}
				className="px-6 py-3 rounded-lg bg-primary-600 hover:bg-primary-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{installing ? "Installing..." : "Install pi coding agent"}
			</button>
			{installOutput && (
				<pre className="mt-4 p-4 rounded-lg bg-surface-900 text-surface-300 text-xs font-mono max-w-lg w-full max-h-48 overflow-auto border border-surface-800">
					{installOutput}
				</pre>
			)}
			{installError && (
				<div className="mt-4 p-4 rounded-lg bg-red-950/50 text-red-400 text-sm max-w-lg w-full border border-red-900">
					{installError}
				</div>
			)}
		</div>
	);
}
