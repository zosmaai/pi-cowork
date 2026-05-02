# Phase E: Frontend Updates Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Wire the React frontend to the new engine-backed Tauri commands, add extension/model management UI, and enable model selection in the chat composer.

**Architecture:** Phase D already migrated the Tauri backend to use the in-process `MetaAgentsEngine`. The hooks `useExtensions.ts`, `useProviders.ts`, and `usePiStream.ts` already invoke the correct engine commands (`list_extensions`, `list_providers`, `send_prompt`, `create_session`, etc.). This phase focuses on **surfacing these hooks in the UI** — a new Settings panel with extensions/models sections and a model selector in the chat composer. No Rust changes needed.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Radix UI, Lucide icons, Tauri v2 IPC

---

## What's Already Done (Phase D)

- ✅ `src/hooks/usePiStream.ts` — calls `invoke("send_prompt", ...)` and lazy `invoke("create_session", ...)`
- ✅ `src/hooks/useSessions.ts` — calls `invoke("create_session")` and `invoke("delete_session")`
- ✅ `src/hooks/useExtensions.ts` — calls `invoke("list_extensions")`
- ✅ `src/hooks/useProviders.ts` — calls `invoke("list_providers")` and `invoke("set_active_model")`
- ✅ `src/types/index.ts` — has `ExtensionInfo`, `ProviderInfo`, `ModelInfo`, `ConfigPayload`
- ✅ Tauri commands: `list_extensions`, `list_providers`, `set_active_model`, `reload_config`

## What This Phase Adds

| Component | Change |
|-----------|--------|
| `SettingsView.tsx` | Add Extensions list with enable/disable toggles, Models section with provider/model selection |
| `MessageInput.tsx` | Add model selector dropdown next to Send button |
| `ChatView.tsx` | Pass model info through to MessageInput |
| `App.tsx` | Wire `useExtensions`/`useProviders`, pass callbacks down |

---

## Task 1: SettingsView — Extensions Section

**TDD scenario:** Modifying untested UI code — write component test first

**Files:**
- Modify: `src/settings/SettingsView.tsx`
- Create: `src/settings/SettingsView.test.tsx`

**Step 1: Write the test for extensions rendering**

Create `src/settings/SettingsView.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";

// Mock Tauri invoke
vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
	Channel: vi.fn(),
}));

// Mock useExtensions hook
const mockExtensions = [
	{
		id: "test-ext",
		name: "Test Extension",
		version: "1.0.0",
		description: "A test extension",
		enabled: true,
		source: "npm" as const,
	},
];

vi.mock("@/hooks/useExtensions", () => ({
	useExtensions: () => ({
		extensions: mockExtensions,
		loading: false,
		refresh: vi.fn(),
	}),
}));

vi.mock("@/hooks/usePiStatus", () => ({
	usePiStatus: () => ({
		status: { installed: true, version: "1.0.0", path: "/usr/bin/pi" },
		loading: false,
		refetch: vi.fn(),
	}),
}));

vi.mock("@/hooks/useProviders", () => ({
	useProviders: () => ({
		config: null,
		providers: [],
		loading: false,
		refresh: vi.fn(),
		setModel: vi.fn(),
		modelsForProvider: () => [],
	}),
}));

import { render, screen } from "@testing-library/react";
import { SettingsView } from "./SettingsView";

describe("SettingsView", () => {
	it("renders extensions section with extension items", () => {
		render(<SettingsView />);
		expect(screen.getByText("Extensions")).toBeTruthy();
		expect(screen.getByText("Test Extension")).toBeTruthy();
		expect(screen.getByText("A test extension")).toBeTruthy();
	});

	it("shows extension version badge", () => {
		render(<SettingsView />);
		expect(screen.getByText("v1.0.0")).toBeTruthy();
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/settings/SettingsView.test.tsx`
Expected: FAIL — SettingsView doesn't render "Extensions" section yet

**Step 3: Implement extensions section in SettingsView**

Update `src/settings/SettingsView.tsx` to add the extensions section:

```tsx
import { useExtensions } from "@/hooks/useExtensions";
import { usePiStatus } from "@/hooks/usePiStatus";
import { useProviders } from "@/hooks/useProviders";
import { Extension, FolderOpen, Info, Monitor, Settings } from "lucide-react";
import type { ExtensionInfo } from "@/types";

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
				className={`text-xs px-2 py-0.5 rounded-full ${ext.enabled ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-muted text-muted-foreground"}`}
			>
				{ext.enabled ? "Active" : "Disabled"}
			</span>
		</div>
	);
}

export function SettingsView() {
	const { status } = usePiStatus();
	const { extensions, loading: extensionsLoading } = useExtensions();
	// useProviders is loaded here for the next task; we'll add the UI in Task 2
	useProviders();

	return (
		<div className="flex-1 overflow-y-auto p-8">
			<div className="max-w-lg mx-auto space-y-8">
				{/* Header */}
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
						<Extension className="w-4 h-4 text-muted-foreground" />
						<h2 className="text-sm font-semibold text-foreground">Extensions</h2>
						<span className="text-xs text-muted-foreground">{extensions.length} installed</span>
					</div>
					<div className="rounded-xl border bg-card p-4 divide-y divide-border">
						{extensionsLoading ? (
							<div className="py-4 text-center text-sm text-muted-foreground">Loading...</div>
						) : extensions.length === 0 ? (
							<div className="py-4 text-center text-sm text-muted-foreground">
								No extensions found. Install via <code className="text-xs bg-muted px-1 rounded">pi install &lt;package&gt;</code>
							</div>
						) : (
							extensions.map((ext) => <ExtensionCard key={ext.id} ext={ext} />)
						)}
					</div>
				</div>

				{/* Models Section — placeholder for Task 2 */}

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
							~/.zosmaai/cowork
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
```

**Step 4: Run test to verify it passes**

Run: `npx vitest run src/settings/SettingsView.test.tsx`
Expected: PASS

**Step 5: Run full test suite**

Run: `npm run validate`
Expected: All 84+ tests pass, typecheck clean

**Step 6: Commit**

```bash
git add src/settings/SettingsView.tsx src/settings/SettingsView.test.tsx
git commit -m "feat(settings): add extensions section with loaded extension cards"
```

---

## Task 2: SettingsView — Models Section

**TDD scenario:** Modifying tested UI — extend existing test

**Files:**
- Modify: `src/settings/SettingsView.tsx`
- Modify: `src/settings/SettingsView.test.tsx`

**Step 1: Add model rendering tests**

Append to `src/settings/SettingsView.test.tsx`:

Update the `useProviders` mock to return real data:

```tsx
const mockConfig = {
	defaultProvider: "openai",
	defaultModel: "gpt-4o",
	providers: [
		{ id: "openai", name: "OpenAI", api: "openai", modelCount: 3 },
		{ id: "anthropic", name: "Anthropic", api: "anthropic", modelCount: 2 },
	],
	models: [
		{ id: "gpt-4o", name: "GPT-4o", provider: "openai", reasoning: false, contextWindow: 128000, maxTokens: 16384 },
		{ id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", reasoning: false, contextWindow: 128000, maxTokens: 16384 },
		{ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", reasoning: true, contextWindow: 200000, maxTokens: 8192 },
	],
};

vi.mock("@/hooks/useProviders", () => ({
	useProviders: () => ({
		config: mockConfig,
		providers: mockConfig.providers,
		loading: false,
		refresh: vi.fn(),
		setModel: vi.fn(),
		modelsForProvider: (pid: string) => mockConfig.models.filter((m) => m.provider === pid),
	}),
}));
```

Add tests:

```tsx
it("renders models section with providers", () => {
	render(<SettingsView />);
	expect(screen.getByText("Models")).toBeTruthy();
	expect(screen.getByText("OpenAI")).toBeTruthy();
	expect(screen.getByText("Anthropic")).toBeTruthy();
});

it("shows default model indicator", () => {
	render(<SettingsView />);
	expect(screen.getByText("GPT-4o")).toBeTruthy();
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/settings/SettingsView.test.tsx`
Expected: FAIL — SettingsView doesn't render "Models" section yet

**Step 3: Implement models section**

Add to `SettingsView.tsx` between the Extensions and General sections. Replace the `useProviders()` call with a real destructured variable. Add a provider accordion or simple list:

```tsx
import type { ExtensionInfo, ModelInfo, ProviderInfo } from "@/types";
import { Cpu, ChevronRight } from "lucide-react";

function ProviderSection({ provider, models, isDefault }: { provider: ProviderInfo; models: ModelInfo[]; isDefault: boolean }) {
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
						<span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">Default</span>
					)}
				</div>
				<ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
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
```

In the component body:

```tsx
const { config, providers, loading: providersLoading, modelsForProvider } = useProviders();

// ... in JSX:
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
				No providers configured. Check <code className="text-xs bg-muted px-1 rounded">~/.pi/agent/models.json</code>
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
```

**Step 4: Run tests**

Run: `npx vitest run src/settings/SettingsView.test.tsx`
Expected: PASS

**Step 5: Run full validate**

Run: `npm run validate`

**Step 6: Commit**

```bash
git add src/settings/SettingsView.tsx src/settings/SettingsView.test.tsx
git commit -m "feat(settings): add models section with expandable provider/model list"
```

---

## Task 3: Model Selector in Composer

**TDD scenario:** New UI component — write tests first

**Files:**
- Create: `src/components/ModelSelector.tsx`
- Create: `src/components/ModelSelector.test.tsx`
- Modify: `src/components/MessageInput.tsx`
- Modify: `src/chat/ChatView.tsx`

**Step 1: Write ModelSelector tests**

Create `src/components/ModelSelector.test.tsx`:

```tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ModelSelector } from "./ModelSelector";

const mockModels = [
	{ id: "gpt-4o", name: "GPT-4o", provider: "openai", reasoning: false, contextWindow: 128000, maxTokens: 16384 },
	{ id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "openai", reasoning: false, contextWindow: 128000, maxTokens: 16384 },
	{ id: "claude-sonnet-4-5", name: "Claude Sonnet 4.5", provider: "anthropic", reasoning: true, contextWindow: 200000, maxTokens: 8192 },
];

describe("ModelSelector", () => {
	it("renders current model name", () => {
		render(
			<ModelSelector
				models={mockModels}
				currentModelId="gpt-4o"
				onSelect={vi.fn()}
			/>,
		);
		expect(screen.getByText("GPT-4o")).toBeTruthy();
	});

	it("opens dropdown on click", () => {
		render(
			<ModelSelector
				models={mockModels}
				currentModelId="gpt-4o"
				onSelect={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("GPT-4o"));
		expect(screen.getByText("Claude Sonnet 4.5")).toBeTruthy();
	});

	it("calls onSelect when a model is clicked", () => {
		const onSelect = vi.fn();
		render(
			<ModelSelector
				models={mockModels}
				currentModelId="gpt-4o"
				onSelect={onSelect}
			/>,
		);
		fireEvent.click(screen.getByText("GPT-4o"));
		fireEvent.click(screen.getByText("Claude Sonnet 4.5"));
		expect(onSelect).toHaveBeenCalledWith("anthropic", "claude-sonnet-4-5");
	});
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/ModelSelector.test.tsx`
Expected: FAIL — ModelSelector doesn't exist

**Step 3: Implement ModelSelector**

Create `src/components/ModelSelector.tsx`:

```tsx
import type { ModelInfo } from "@/types";
import { ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface ModelSelectorProps {
	models: ModelInfo[];
	currentModelId?: string;
	onSelect: (provider: string, modelId: string) => void;
}

export function ModelSelector({ models, currentModelId, onSelect }: ModelSelectorProps) {
	const [open, setOpen] = useState(false);
	const ref = useRef<HTMLDivElement>(null);

	// Close on outside click
	useEffect(() => {
		function handleClick(e: MouseEvent) {
			if (ref.current && !ref.current.contains(e.target as Node)) {
				setOpen(false);
			}
		}
		if (open) document.addEventListener("mousedown", handleClick);
		return () => document.removeEventListener("mousedown", handleClick);
	}, [open]);

	const current = models.find((m) => m.id === currentModelId);
	const label = current?.name || currentModelId || "Default";

	return (
		<div ref={ref} className="relative">
			<button
				type="button"
				onClick={() => setOpen(!open)}
				className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-muted"
			>
				<span className="max-w-[120px] truncate">{label}</span>
				<ChevronDown className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`} />
			</button>
			{open && (
				<div className="absolute bottom-full left-0 mb-1 w-56 rounded-lg border bg-popover shadow-lg z-50 py-1 max-h-60 overflow-y-auto">
					{models.map((model) => (
						<button
							key={model.id}
							type="button"
							onClick={() => {
								onSelect(model.provider, model.id);
								setOpen(false);
							}}
							className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center justify-between ${
								model.id === currentModelId ? "text-primary font-medium" : "text-foreground"
							}`}
						>
							<span className="truncate">{model.name}</span>
							{model.id === currentModelId && <span className="text-primary">✓</span>}
						</button>
					))}
				</div>
			)}
		</div>
	);
}
```

**Step 4: Run tests**

Run: `npx vitest run src/components/ModelSelector.test.tsx`
Expected: PASS

**Step 5: Wire ModelSelector into MessageInput**

Update `MessageInput.tsx` props:

```tsx
import { ModelSelector } from "./ModelSelector";
import type { ModelInfo } from "@/types";

interface MessageInputProps {
	onSend: (message: string) => void;
	disabled?: boolean;
	modelLabel?: string;
	models?: ModelInfo[];
	currentModelId?: string;
	onModelSelect?: (provider: string, modelId: string) => void;
}
```

In the bottom bar of the form, replace the static "Pi" label:

```tsx
<div className="flex items-center justify-between px-3 pb-3">
	{models && onModelSelect ? (
		<ModelSelector
			models={models}
			currentModelId={currentModelId}
			onSelect={onModelSelect}
		/>
	) : (
		<span className="text-xs" style={{ color: "hsl(var(--muted-foreground) / 0.6)" }}>
			{modelLabel || "Pi"}
		</span>
	)}
	<button ...>Send →</button>
</div>
```

**Step 6: Wire through ChatView**

In `ChatView.tsx`, add props:

```tsx
interface ChatViewProps {
	// ... existing
	models?: ModelInfo[];
	currentModelId?: string;
	onModelSelect?: (provider: string, modelId: string) => void;
}
```

Pass them to `MessageInput`:

```tsx
<MessageInput
	ref={inputRef}
	onSend={onSend}
	disabled={isRunning}
	models={models}
	currentModelId={currentModelId}
	onModelSelect={onModelSelect}
/>
```

**Step 7: Run full validate**

Run: `npm run validate`

**Step 8: Commit**

```bash
git add src/components/ModelSelector.tsx src/components/ModelSelector.test.tsx src/components/MessageInput.tsx src/chat/ChatView.tsx
git commit -m "feat(composer): add model selector dropdown to message input"
```

---

## Task 4: Wire Everything in App.tsx

**TDD scenario:** Integration wiring — manual verification + existing tests

**Files:**
- Modify: `src/App.tsx`

**Step 1: Import and use the providers hook in App**

In `App.tsx`, add:

```tsx
import { useProviders } from "@/hooks/useProviders";
```

In the component body:

```tsx
const { config, providers, modelsForProvider } = useProviders();
const allModels = config?.models ?? [];
```

**Step 2: Pass model data to ChatView**

Update the ChatView rendering:

```tsx
<ChatView
	messages={displayMessages}
	streamingMessage={streamState.streamingMessage}
	isRunning={streamState.isRunning}
	status={streamState.status}
	error={streamState.error}
	onSend={handleSend}
	onAbort={abortStream}
	models={allModels}
	currentModelId={config?.defaultModel ?? undefined}
	onModelSelect={async (provider, modelId) => {
		if (currentSessionIdRef.current) {
			await invoke("set_active_model", {
				payload: {
					sessionId: currentSessionIdRef.current,
					provider,
					modelId,
				},
			});
		}
	}}
/>
```

Note: `invoke` is already imported from `@tauri-apps/api/core` (used indirectly via hooks). If not directly imported, add the import.

**Step 3: Run full validate**

Run: `npm run validate`

**Step 4: Commit**

```bash
git add src/App.tsx
git commit -m "feat(app): wire providers hook and model selector to chat view"
```

---

## Task 5: End-to-End Smoke Test

**TDD scenario:** Manual verification — run the app and test each flow

**Prerequisites:** All previous tasks complete, all tests green.

**Step 1: Run full workspace validation**

```bash
cargo clippy --workspace -- -D warnings
npm run validate
```

Expected: No warnings, all tests pass.

**Step 2: Build and launch the app**

```bash
npm run dev
```

Verify each flow:
- [ ] Settings → Extensions: shows installed extensions with status badges
- [ ] Settings → Models: shows providers, expandable to see models
- [ ] Chat → Composer: model selector dropdown appears next to Send
- [ ] Chat → Model switch: select a different model, send a message, verify it uses the new model (check model badge on assistant message)
- [ ] Chat → Multi-turn: send 2+ messages in the same session, verify history persists
- [ ] Sessions → Create/delete: create a new session, switch between sessions, verify chat history loads correctly

**Step 3: Run cargo test for completeness**

```bash
cargo test --workspace
```

Expected: 47 tests pass.

**Step 4: Final commit**

```bash
git add -A
git commit -m "chore: phase E frontend updates complete — extensions, models, model selector"
```

---

## Verification Checklist (from upgrade plan)

- [x] `npm run validate` passes (lint + typecheck + tests)
- [ ] Extension list visible and shows installed extensions
- [ ] Model selector switches model
- [ ] Session creation/deletion calls hit the backend
- [ ] Multi-turn conversation works (NEW capability from Phase D, verify in this phase)
- [ ] No `pi` subprocesses in `ps` during normal use

---

*This plan covers Phase E of the MetaAgents upgrade. Phase F (Polish & Rebrand Prep) follows.*
