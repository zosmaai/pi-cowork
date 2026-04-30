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
