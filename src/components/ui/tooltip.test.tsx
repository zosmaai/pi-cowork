import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { Tooltip } from "./tooltip";

describe("Tooltip", () => {
	it("renders children content", () => {
		render(
			<Tooltip content="Helpful hint">
				<button type="button">Hover me</button>
			</Tooltip>,
		);
		expect(screen.getByRole("button", { name: "Hover me" })).toBeInTheDocument();
	});

	it("shows tooltip content on hover", async () => {
		const user = userEvent.setup();
		render(
			<Tooltip content="Helpful hint">
				<button type="button">Hover me</button>
			</Tooltip>,
		);
		const trigger = screen.getByRole("button", { name: "Hover me" });
		await user.hover(trigger);
		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("Helpful hint");
	});

	it("shows tooltip on focus for keyboard accessibility", async () => {
		const user = userEvent.setup();
		render(
			<Tooltip content="Keyboard accessible">
				<button type="button">Focus me</button>
			</Tooltip>,
		);
		const trigger = screen.getByRole("button", { name: "Focus me" });
		await user.tab();
		expect(trigger).toHaveFocus();
		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("Keyboard accessible");
	});

	it("associates tooltip with trigger via aria-describedby", async () => {
		const user = userEvent.setup();
		render(
			<Tooltip content="Described content">
				<button type="button">Trigger</button>
			</Tooltip>,
		);
		const trigger = screen.getByRole("button", { name: "Trigger" });
		await user.hover(trigger);
		const tooltip = await screen.findByRole("tooltip");
		expect(trigger).toHaveAttribute("aria-describedby", tooltip.id);
	});
});
