import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ActivityBar } from "./ActivityBar";

describe("ActivityBar", () => {
	it("renders all navigation items", () => {
		render(<ActivityBar activeView="chat" onViewChange={() => {}} />);
		expect(screen.getByLabelText("Chat")).toBeInTheDocument();
		expect(screen.getByLabelText("Files")).toBeInTheDocument();
		expect(screen.getByLabelText("Prompts")).toBeInTheDocument();
		expect(screen.getByLabelText("Commands")).toBeInTheDocument();
		expect(screen.getByLabelText("Settings")).toBeInTheDocument();
	});

	it("marks the active view", () => {
		render(<ActivityBar activeView="chat" onViewChange={() => {}} />);
		const chatButton = screen.getByLabelText("Chat");
		expect(chatButton).toHaveAttribute("data-active", "true");
	});

	it("calls onViewChange when a nav item is clicked", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();
		render(<ActivityBar activeView="chat" onViewChange={handleChange} />);
		await user.click(screen.getByLabelText("Files"));
		expect(handleChange).toHaveBeenCalledWith("files");
	});

	it("does not call onViewChange when clicking the already active view", async () => {
		const handleChange = vi.fn();
		const user = userEvent.setup();
		render(<ActivityBar activeView="chat" onViewChange={handleChange} />);
		await user.click(screen.getByLabelText("Chat"));
		expect(handleChange).not.toHaveBeenCalled();
	});
});
