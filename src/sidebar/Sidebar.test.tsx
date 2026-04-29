import type { SessionMeta } from "@/lib/session-store";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { Sidebar } from "./Sidebar";

beforeAll(() => {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		value: vi.fn().mockImplementation((query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addListener: vi.fn(),
			removeListener: vi.fn(),
			addEventListener: vi.fn(),
			removeEventListener: vi.fn(),
			dispatchEvent: vi.fn(),
		})),
	});
});

const mockSessions: SessionMeta[] = [
	{ id: "1", title: "Build auth system", timestamp: Date.now(), messageCount: 5 },
	{ id: "2", title: "Fix login bug", timestamp: Date.now() - 3600000, messageCount: 3 },
];

const mockStatus = { installed: true, version: "0.1.0", path: "/usr/bin/pi" };

describe("Sidebar", () => {
	it("renders session list and nav icons", () => {
		render(
			<Sidebar
				sessions={mockSessions}
				activeSessionId={null}
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={vi.fn()}
				onDeleteSession={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);

		expect(screen.getByText("Build auth system")).toBeDefined();
		expect(screen.getByText("Fix login bug")).toBeDefined();
		expect(screen.getByLabelText("Tasks")).toBeDefined();
		expect(screen.getByLabelText("Settings")).toBeDefined();
	});

	it("highlights active session", () => {
		render(
			<Sidebar
				sessions={mockSessions}
				activeSessionId="1"
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={vi.fn()}
				onDeleteSession={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);

		const activeItem = screen.getByText("Build auth system").closest("[role='button']");
		expect(activeItem?.className).toContain("bg-sidebar-accent");
	});

	it("calls onNavigate when nav icon clicked", () => {
		const onNavigate = vi.fn();
		render(
			<Sidebar
				sessions={mockSessions}
				activeSessionId={null}
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={vi.fn()}
				onDeleteSession={vi.fn()}
				onNavigate={onNavigate}
			/>,
		);

		fireEvent.click(screen.getByLabelText("Tasks"));
		expect(onNavigate).toHaveBeenCalledWith("tasks");

		fireEvent.click(screen.getByLabelText("Settings"));
		expect(onNavigate).toHaveBeenCalledWith("settings");
	});

	it("shows empty state when no sessions", () => {
		render(
			<Sidebar
				sessions={[]}
				activeSessionId={null}
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={vi.fn()}
				onDeleteSession={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);

		expect(screen.getByText("No sessions yet")).toBeDefined();
	});

	it("shows loading state", () => {
		render(
			<Sidebar
				sessions={[]}
				activeSessionId={null}
				sessionsLoading={true}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={vi.fn()}
				onDeleteSession={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);

		expect(screen.getByText("Loading...")).toBeDefined();
	});

	it("calls onNewSession when new session button clicked", () => {
		const onNewSession = vi.fn();
		render(
			<Sidebar
				sessions={mockSessions}
				activeSessionId={null}
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={onNewSession}
				onSelectSession={vi.fn()}
				onDeleteSession={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByText("New session"));
		expect(onNewSession).toHaveBeenCalled();
	});

	it("calls onSelectSession when session clicked", () => {
		const onSelectSession = vi.fn();
		render(
			<Sidebar
				sessions={mockSessions}
				activeSessionId={null}
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={onSelectSession}
				onDeleteSession={vi.fn()}
				onNavigate={vi.fn()}
			/>,
		);

		fireEvent.click(screen.getByText("Build auth system"));
		expect(onSelectSession).toHaveBeenCalledWith("1");
	});

	it("calls onDeleteSession when delete button clicked", () => {
		const onDeleteSession = vi.fn();
		render(
			<Sidebar
				sessions={mockSessions}
				activeSessionId={null}
				sessionsLoading={false}
				status={mockStatus}
				activeView="chat"
				onNewSession={vi.fn()}
				onSelectSession={vi.fn()}
				onDeleteSession={onDeleteSession}
				onNavigate={vi.fn()}
			/>,
		);

		// The delete button is hidden until hover, but we can still find it by aria-label
		const deleteButtons = screen.getAllByLabelText(/Delete session/);
		fireEvent.click(deleteButtons[0]);
		expect(onDeleteSession).toHaveBeenCalledWith("1");
	});
});
