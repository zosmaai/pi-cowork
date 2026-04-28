import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatMessageItem } from "./ChatMessage";
import type { ChatMessage } from "@/types";

const mockWriteText = vi.fn();
vi.stubGlobal("navigator", {
	...navigator,
	clipboard: {
		writeText: mockWriteText,
	},
});

function createMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
	return {
		id: "msg-1",
		role: "user",
		content: "Hello world",
		timestamp: Date.now(),
		...overrides,
	};
}

describe("ChatMessageItem", () => {
	beforeEach(() => {
		mockWriteText.mockClear();
	});

	it("renders user message", () => {
		render(<ChatMessageItem message={createMessage({ role: "user" })} />);
		// Use getAllByText because "You" appears in avatar and name
		expect(screen.getAllByText("You").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Hello world")).toBeInTheDocument();
	});

	it("renders assistant message", () => {
		render(<ChatMessageItem message={createMessage({ role: "assistant" })} />);
		expect(screen.getAllByText("Pi").length).toBeGreaterThanOrEqual(1);
		expect(screen.getByText("Hello world")).toBeInTheDocument();
	});

	it("renders system message", () => {
		render(
			<ChatMessageItem message={createMessage({ role: "system", content: "System update" })} />,
		);
		expect(screen.getByText("System update")).toBeInTheDocument();
		expect(screen.queryByText("You")).not.toBeInTheDocument();
		expect(screen.queryByText("Pi")).not.toBeInTheDocument();
	});

	it("renders markdown content", () => {
		render(
			<ChatMessageItem
				message={createMessage({
					role: "assistant",
					content: "# Heading\n\nSome **bold** text",
				})}
			/>,
		);
		expect(screen.getByRole("heading", { name: "Heading" })).toBeInTheDocument();
		// Bold text is wrapped in <strong>; query by element
		const strong = screen.getByText("bold");
		expect(strong.tagName.toLowerCase()).toBe("strong");
	});

	it("shows timestamp for non-system messages", () => {
		const now = new Date();
		const timeString = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
		render(<ChatMessageItem message={createMessage({ timestamp: now.getTime() })} />);
		expect(screen.getByText(timeString)).toBeInTheDocument();
	});

	it("shows copy button for assistant messages", () => {
		render(<ChatMessageItem message={createMessage({ role: "assistant" })} />);
		expect(screen.getByRole("button", { name: "Copy" })).toBeInTheDocument();
	});

	it("does not show copy button for user messages", () => {
		render(<ChatMessageItem message={createMessage({ role: "user" })} />);
		expect(screen.queryByRole("button", { name: "Copy" })).not.toBeInTheDocument();
	});

	it("shows copied feedback after clicking copy", async () => {
		const user = userEvent.setup();
		render(<ChatMessageItem message={createMessage({ role: "assistant", content: "Copy me" })} />);
		await user.click(screen.getByRole("button", { name: "Copy" }));
		expect(screen.getByText("Copied!")).toBeInTheDocument();
		// Wait for the 2s timeout to expire
		await new Promise((r) => setTimeout(r, 2100));
		expect(screen.queryByText("Copied!")).not.toBeInTheDocument();
	});
});
