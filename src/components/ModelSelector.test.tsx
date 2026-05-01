import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
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

	it("shows checkmark on current model", () => {
		render(
			<ModelSelector
				models={mockModels}
				currentModelId="gpt-4o"
				onSelect={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("GPT-4o"));
		expect(screen.getByText("✓")).toBeTruthy();
	});

	it("falls back to model ID when model not found", () => {
		render(
			<ModelSelector
				models={mockModels}
				currentModelId="unknown-model"
				onSelect={vi.fn()}
			/>,
		);
		expect(screen.getByText("unknown-model")).toBeTruthy();
	});

	it("shows Default when no model selected", () => {
		render(
			<ModelSelector
				models={mockModels}
				onSelect={vi.fn()}
			/>,
		);
		expect(screen.getByText("Default")).toBeTruthy();
	});
});
