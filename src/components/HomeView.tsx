import { Code2, FileSearch, Lightbulb, ListTodo, Rocket, Sparkles } from "lucide-react";

/** Capability card shown on the welcome screen. */
interface CapabilityCard {
	icon: "code" | "debug" | "research" | "automate";
	title: string;
	description: string;
}

const CAPABILITIES: CapabilityCard[] = [
	{
		icon: "code",
		title: "Write & debug code",
		description: "Generate, fix, and explain code across any language or framework.",
	},
	{
		icon: "debug",
		title: "Debug like a pro",
		description: "Share errors, logs, or screenshots — get instant root-cause analysis.",
	},
	{
		icon: "research",
		title: "Research & learn",
		description: "Ask complex questions and get thorough, cited answers.",
	},
	{
		icon: "automate",
		title: "Automate tasks",
		description: "Run shell commands, manage files, and orchestrate workflows.",
	},
];

const SUGGESTIONS = [
	"Explain this codebase to me",
	"Help me debug a failing test",
	"Write a REST API endpoint",
	"Refactor this function for clarity",
	"What's the best way to structure a React app?",
	"Review my Terraform config",
];

/** Maps capability icon names to Lucide components. */
const ICON_MAP = {
	code: Code2,
	debug: Lightbulb,
	research: FileSearch,
	automate: ListTodo,
};

interface HomeViewProps {
	/** When true, shows the welcome screen (no credentials yet). */
	showWelcome: boolean;
	/** Callback to navigate to provider setup. */
	onConnectProvider?: () => void;
	/** Callback when a suggestion is clicked. */
	onSuggestion?: (text: string) => void;
}

export function HomeView({ showWelcome, onConnectProvider, onSuggestion }: HomeViewProps) {
	if (showWelcome) {
		return <WelcomeScreen onConnectProvider={onConnectProvider} />;
	}
	return <HomeScreen onSuggestion={onSuggestion} />;
}

/* ------------------------------------------------------------------ */
/* Welcome Screen (no credentials yet)                                */
/* ------------------------------------------------------------------ */

function WelcomeScreen({ onConnectProvider }: { onConnectProvider?: () => void }) {
	return (
		<div className="flex flex-col items-center justify-center h-full px-8 py-12 max-w-3xl mx-auto">
			{/* Hero */}
			<div className="text-center mb-10">
				<div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
					<Sparkles className="w-8 h-8" style={{ color: "hsl(var(--primary))" }} />
				</div>
				<h1 className="text-4xl font-bold text-foreground mb-3">Welcome to Zosma Cowork</h1>
				<p className="text-base text-muted-foreground max-w-lg mx-auto leading-relaxed">
					Your AI-powered coding companion. Connect an AI provider to get started — no local models required.
				</p>
			</div>

			{/* CTA */}
			{onConnectProvider && (
				<div className="mb-10">
					<button
						type="button"
						onClick={onConnectProvider}
						className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-semibold transition-all hover:opacity-90 hover:scale-[1.02]"
						style={{
							background: "hsl(var(--primary))",
							color: "hsl(var(--primary-foreground))",
						}}
					>
						<Rocket className="w-4 h-4" />
						Connect AI Provider
					</button>
				</div>
			)}

			{/* Capabilities */}
			<div className="grid grid-cols-2 gap-4 w-full max-w-xl">
				{CAPABILITIES.map((cap) => {
					const Icon = ICON_MAP[cap.icon];
					return (
						<div
							key={cap.title}
							className="p-4 rounded-xl border bg-card"
							style={{ borderColor: "hsl(var(--border))" }}
						>
							<Icon className="w-5 h-5 mb-2" style={{ color: "hsl(var(--primary))" }} />
							<h3 className="text-sm font-semibold text-foreground mb-1">{cap.title}</h3>
							<p className="text-xs text-muted-foreground leading-relaxed">{cap.description}</p>
						</div>
					);
				})}
			</div>

			{/* Learn more */}
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
/* Home Screen (credentials configured, no active chat)               */
/* ------------------------------------------------------------------ */

function HomeScreen({ onSuggestion }: { onSuggestion?: (text: string) => void }) {
	return (
		<div className="flex flex-col items-center justify-center h-full px-8 py-12 max-w-2xl mx-auto">
			{/* Header */}
			<div className="text-center mb-8">
				<h1 className="text-3xl font-bold text-foreground mb-2">What are you working on?</h1>
				<p className="text-sm text-muted-foreground">
					Start a conversation or pick a suggestion below.
				</p>
			</div>

			{/* Suggestion chips */}
			<div className="flex flex-wrap justify-center gap-2 max-w-lg">
				{SUGGESTIONS.map((text) => (
					<button
						key={text}
						type="button"
						onClick={() => onSuggestion?.(text)}
						className="px-4 py-2 rounded-full text-xs font-medium border transition-all hover:border-primary/50 hover:bg-primary/5"
						style={{ borderColor: "hsl(var(--border))", color: "hsl(var(--foreground))" }}
					>
						{text}
					</button>
				))}
			</div>
		</div>
	);
}
