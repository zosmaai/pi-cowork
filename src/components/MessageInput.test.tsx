import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { MessageInput } from "./MessageInput";

describe("MessageInput", () => {
	it("renders textarea and send button", () => {
		render(<MessageInput onSend={vi.fn()} />);
		expect(screen.getByPlaceholderText(/How can I help/i)).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /let's go/i })).toBeInTheDocument();
	});

	it("calls onSend with trimmed text when submitting", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();
		render(<MessageInput onSend={onSend} />);
		const textarea = screen.getByPlaceholderText(/How can I help/i);
		await user.type(textarea, "Hello pi");
		await user.keyboard("{Enter}");
		expect(onSend).toHaveBeenCalledWith("Hello pi");
	});

	it("does not call onSend when Shift+Enter is pressed", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();
		render(<MessageInput onSend={onSend} />);
		const textarea = screen.getByPlaceholderText(/How can I help/i);
		await user.type(textarea, "Hello pi");
		await user.keyboard("{Shift>}{Enter}{/Shift}");
		expect(onSend).not.toHaveBeenCalled();
		expect(textarea).toHaveValue("Hello pi\n");
	});

	it("clears textarea after sending", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();
		render(<MessageInput onSend={onSend} />);
		const textarea = screen.getByPlaceholderText(/How can I help/i);
		await user.type(textarea, "Hello pi");
		await user.keyboard("{Enter}");
		expect(textarea).toHaveValue("");
	});

	it("does not send when text is empty or whitespace only", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();
		render(<MessageInput onSend={onSend} />);
		const textarea = screen.getByPlaceholderText(/How can I help/i);
		await user.type(textarea, "   ");
		await user.keyboard("{Enter}");
		expect(onSend).not.toHaveBeenCalled();
	});

	it("disables textarea and button when disabled prop is true", () => {
		render(<MessageInput onSend={vi.fn()} disabled />);
		expect(screen.getByPlaceholderText(/How can I help/i)).toBeDisabled();
		expect(screen.getByRole("button", { name: /let's go/i })).toBeDisabled();
	});

	it("disables send button when text is empty", () => {
		render(<MessageInput onSend={vi.fn()} />);
		expect(screen.getByRole("button", { name: /let's go/i })).toBeDisabled();
	});

	it("calls onSend when clicking the send button", async () => {
		const onSend = vi.fn();
		const user = userEvent.setup();
		render(<MessageInput onSend={onSend} />);
		const textarea = screen.getByPlaceholderText(/How can I help/i);
		await user.type(textarea, "Click send");
		await user.click(screen.getByRole("button", { name: /let's go/i }));
		expect(onSend).toHaveBeenCalledWith("Click send");
	});
});
