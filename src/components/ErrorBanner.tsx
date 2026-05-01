import type { CoworkErrorPayload } from "@/types/pi-events";
import {
	AlertCircle,
	AlertTriangle,
	ChevronDown,
	ChevronUp,
	RefreshCw,
	ServerOff,
	WifiOff,
} from "lucide-react";
import { useState } from "react";

interface ErrorBannerProps {
	error: string;
	errorPayload: CoworkErrorPayload | null;
	onRetry?: () => void;
	onSwitchModel?: () => void;
}

/**
 * Rich error banner that replaces the raw error text in ChatView.
 *
 * Shows:
 * - Contextual icon based on error code
 * - User-friendly message
 * - Provider/model chips (when available)
 * - Action buttons (retry, switch model)
 * - Expandable raw error details for debugging
 */
export function ErrorBanner({ error, errorPayload, onRetry, onSwitchModel }: ErrorBannerProps) {
	const [showDetails, setShowDetails] = useState(false);

	const code = errorPayload?.code;
	const provider = errorPayload?.provider;
	const model = errorPayload?.model;
	const details = errorPayload?.details;
	const retryable = errorPayload?.retryable ?? false;

	// Pick icon based on error code
	const Icon = getIconForCode(code);
	const title = getTitleForCode(code);

	return (
		<div
			className="border-t animate-fade-in"
			style={{
				background: "hsl(var(--error-subtle))",
				borderColor: "hsl(var(--destructive) / 0.2)",
			}}
		>
			<div className="px-4 py-3 space-y-2">
				{/* Main error line */}
				<div className="flex items-start gap-3">
					<div
						className="mt-0.5 shrink-0"
						style={{ color: "hsl(var(--destructive))" }}
					>
						<Icon className="w-5 h-5" />
					</div>
					<div className="flex-1 min-w-0">
						<p
							className="text-sm font-medium"
							style={{ color: "hsl(var(--destructive))" }}
						>
							{title}
						</p>
						<p
							className="text-sm mt-0.5"
							style={{ color: "hsl(var(--foreground))" }}
						>
							{errorPayload?.message || error}
						</p>

						{/* Provider/model chips */}
						{(provider || model) && (
							<div className="flex items-center gap-2 mt-2 flex-wrap">
								{provider && (
									<span
										className="text-xs px-2 py-0.5 rounded-full font-mono"
										style={{
											background: "hsl(var(--destructive) / 0.1)",
											color: "hsl(var(--destructive))",
										}}
									>
										{provider}
									</span>
								)}
								{model && (
									<span
										className="text-xs px-2 py-0.5 rounded-full font-mono"
										style={{
											background: "hsl(var(--muted))",
											color: "hsl(var(--muted-foreground))",
										}}
									>
										{model}
									</span>
								)}
							</div>
						)}
					</div>
				</div>

				{/* Action buttons */}
				<div className="flex items-center gap-2 pl-8">
					{retryable && onSwitchModel && (
						<button
							type="button"
							onClick={onSwitchModel}
							className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors hover:opacity-80"
							style={{
								background: "hsl(var(--primary) / 0.15)",
								color: "hsl(var(--primary))",
							}}
						>
							<RefreshCw className="w-3 h-3" />
							Try different model
						</button>
					)}
					{onRetry && (
						<button
							type="button"
							onClick={onRetry}
							className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md font-medium transition-colors hover:opacity-80"
							style={{
								background: "hsl(var(--accent))",
								color: "hsl(var(--accent-foreground))",
							}}
						>
							<RefreshCw className="w-3 h-3" />
							Retry
						</button>
					)}

					{/* Show raw details toggle */}
					{details && (
						<button
							type="button"
							onClick={() => setShowDetails(!showDetails)}
							className="inline-flex items-center gap-1 text-xs rounded-md transition-colors"
							style={{ color: "hsl(var(--muted-foreground))" }}
						>
							{showDetails ? (
								<ChevronUp className="w-3 h-3" />
							) : (
								<ChevronDown className="w-3 h-3" />
							)}
							{showDetails ? "Hide details" : "Show details"}
						</button>
					)}
				</div>

				{/* Expandable raw error details */}
				{showDetails && details && (
					<div className="pl-8">
						<pre
							className="text-[11px] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed"
							style={{
								background: "hsl(var(--muted) / 0.4)",
								color: "hsl(var(--muted-foreground))",
							}}
						>
							{details}
						</pre>
					</div>
				)}
			</div>
		</div>
	);
}

/** Pick an appropriate icon for the error code. */
function getIconForCode(code?: string): typeof AlertCircle {
	switch (code) {
		case "provider_error":
		case "model_unavailable":
			return ServerOff;
		case "connection_refused":
			return WifiOff;
		case "authentication":
		case "rate_limited":
		case "timeout":
			return AlertTriangle;
		default:
			return AlertCircle;
	}
}

/** Get a human-readable title for the error code. */
function getTitleForCode(code?: string): string {
	switch (code) {
		case "provider_error":
			return "Provider Error";
		case "model_unavailable":
			return "Model Unavailable";
		case "connection_refused":
			return "Connection Error";
		case "authentication":
			return "Authentication Error";
		case "rate_limited":
			return "Rate Limited";
		case "timeout":
			return "Request Timeout";
		case "session_not_found":
			return "Session Error";
		case "aborted":
			return "Stream Aborted";
		default:
			return "Error";
	}
}
