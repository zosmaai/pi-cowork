import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

const mockSessions = [
	{
		id: "session-1",
		title: "First Session",
		lastMessage: "Hello there",
		timestamp: Date.now() - 1000 * 60 * 5, // 5 minutes ago
	},
	{
		id: "session-2",
		title: "Second Session",
		lastMessage: "How are you?",
		timestamp: Date.now() - 1000 * 60 * 60 * 2, // 2 hours ago
	},
];

function renderSidebar(props = {}) {
	const defaultProps = {
		view: "chat",
		sessions: mockSessions,
		activeSessionId: "session-1",
		onSessionSelect: vi.fn(),
		onNewSession: vi.fn(),
		onDeleteSession: vi.fn(),
	};
	return render(<Sidebar {...defaultProps} {...props} />);
}

describe("Sidebar", () => {
	describe("view switching", () => {
		it("renders chat sessions view by default", () => {
			renderSidebar();
			expect(screen.getByText("Sessions")).toBeInTheDocument();
		});

		it("renders files explorer view", () => {
			renderSidebar({ view: "files" });
			expect(screen.getByText("Explorer")).toBeInTheDocument();
			expect(screen.getByText("No folder open")).toBeInTheDocument();
		});

		it("renders settings view", () => {
			renderSidebar({ view: "settings" });
			expect(screen.getByText("Settings")).toBeInTheDocument();
			expect(screen.getByText("Theme")).toBeInTheDocument();
			expect(screen.getByText("Model Provider")).toBeInTheDocument();
		});

		it("renders prompts view", () => {
			renderSidebar({ view: "prompts" });
			expect(screen.getByText("Prompts")).toBeInTheDocument();
			expect(screen.getByText("Coming soon")).toBeInTheDocument();
		});

		it("renders commands view", () => {
			renderSidebar({ view: "commands" });
			expect(screen.getByText("Commands")).toBeInTheDocument();
			expect(screen.getByText("Coming soon")).toBeInTheDocument();
		});
	});

	describe("chat sessions", () => {
		it("renders empty state when no sessions", () => {
			renderSidebar({ sessions: [] });
			expect(screen.getByText("No sessions yet")).toBeInTheDocument();
			expect(screen.getByText("Start a session")).toBeInTheDocument();
		});

		it("calls onNewSession from empty state", async () => {
			const onNewSession = vi.fn();
			const user = userEvent.setup();
			renderSidebar({ sessions: [], onNewSession });
			await user.click(screen.getByText("Start a session"));
			expect(onNewSession).toHaveBeenCalledTimes(1);
		});

		it("renders session list", () => {
			renderSidebar();
			expect(screen.getByText("First Session")).toBeInTheDocument();
			expect(screen.getByText("Second Session")).toBeInTheDocument();
			expect(screen.getByText("Hello there")).toBeInTheDocument();
			expect(screen.getByText("How are you?")).toBeInTheDocument();
		});

		it("marks active session", () => {
			renderSidebar({ activeSessionId: "session-1" });
			expect(screen.getByText("Active")).toBeInTheDocument();
		});

		it("calls onSessionSelect when clicking a session", async () => {
			const onSessionSelect = vi.fn();
			const user = userEvent.setup();
			renderSidebar({ onSessionSelect });
			await user.click(screen.getByText("Second Session"));
			expect(onSessionSelect).toHaveBeenCalledWith("session-2");
		});

		it("calls onNewSession when clicking the plus button", async () => {
			const onNewSession = vi.fn();
			const user = userEvent.setup();
			renderSidebar({ onNewSession });
			const newButton = screen.getByRole("button", { name: /new session/i });
			await user.click(newButton);
			expect(onNewSession).toHaveBeenCalledTimes(1);
		});

		it("calls onDeleteSession when clicking delete", async () => {
			const onDeleteSession = vi.fn();
			const user = userEvent.setup();
			renderSidebar({ onDeleteSession });
			await user.click(screen.getByRole("button", { name: "Delete session Second Session" }));
			expect(onDeleteSession).toHaveBeenCalledWith("session-2");
		});
	});
});
