import { describe, expect, it, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
	invoke: vi.fn(),
	Channel: vi.fn(),
}));

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

const mockConfig = {
	defaultProvider: "openai",
	defaultModel: "gpt-4o",
	providers: [
		{ id: "openai", name: "OpenAI", api: "openai", modelCount: 2 },
		{ id: "anthropic", name: "Anthropic", api: "anthropic", modelCount: 1 },
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

	it("renders models section with providers", () => {
		render(<SettingsView />);
		expect(screen.getByText(/Models.*Providers/i)).toBeTruthy();
		expect(screen.getByText("OpenAI")).toBeTruthy();
		expect(screen.getByText("Anthropic")).toBeTruthy();
	});

	it("shows default model label", () => {
		render(<SettingsView />);
		expect(screen.getByText("Default: gpt-4o")).toBeTruthy();
	});
});
