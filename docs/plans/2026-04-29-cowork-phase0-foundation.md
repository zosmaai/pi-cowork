# Phase 0: Foundation - Implementation Plan

> **REQUIRED SUB-SKILL:** Use the executing-plans skill to implement this plan task-by-task.

**Goal:** Fix the chat stream race condition, establish the `~/.zosmaai/cowork/` home directory, build the three-column layout with session history sidebar, and stub out Tasks/Settings views for the Cowork MVP.

**Architecture:** Rewrite `usePiStream` with `useReducer` to eliminate the blank-screen race condition. Use `@tauri-apps/plugin-fs` for session file CRUD (list, read, write, delete) - zero Rust code needed, hot-reload compatible. Frontend `session-store.ts` wraps the plugin calls. Tests mock the plugin. Restructure App.tsx into a clean three-column layout (sidebar | main | right panel) with icon-only navigation. Each session is a fresh `pi --mode json` invocation; events are captured and persisted to disk.

**Tech Stack:** React 19, TypeScript, Tailwind v4, Tauri v2 + `@tauri-apps/plugin-fs`, Vitest + @testing-library/react

---

### Task 1: Session store (using @tauri-apps/plugin-fs)

**TDD scenario:** New feature - full TDD cycle

**Dependencies:**
```bash
npm install @tauri-apps/plugin-fs
```

**Files:**
- Create: `src/lib/session-store.ts`
- Create: `src/lib/session-store.test.ts`
- Modify: `src-tauri/capabilities/default.json` (add FS permissions)

**Context:** Uses `@tauri-apps/plugin-fs` for file I/O (`readTextFile`, `writeTextFile`, `readDir`, `mkdir`, `remove`, `exists`). Zero Rust code. Hot-reload compatible. Tests mock the plugin. Session JSONL files live in `~/.zosmaai/cowork/sessions/`.

**Schemas:**
```typescript
interface SessionMeta { id: string; title: string; timestamp: number; messageCount: number; }
interface SessionData { meta: SessionMeta; events: Record<string, unknown>[]; }
```

**Step 1: Write failing frontend test**

```typescript
// src/lib/session-store.test.ts
import { describe, it, expect, vi, beforeEach } from "vitest";
import { listSessions, writeSession, deleteSession, readSession } from "./session-store";

// Mock the FS plugin - runs in Node.js during tests
vi.mock("@tauri-apps/plugin-fs", () => ({
  readDir: vi.fn(),
  readTextFile: vi.fn(),
  writeTextFile: vi.fn(),
  mkdir: vi.fn(),
  remove: vi.fn(),
  exists: vi.fn(),
}));

import { readDir, readTextFile } from "@tauri-apps/plugin-fs";

describe("session-store", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("listSessions returns empty array when no files", async () => {
    vi.mocked(readDir).mockResolvedValue([]);
    const result = await listSessions();
    expect(result).toEqual([]);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/session-store.test.ts`
Expected: FAIL - module not found

**Step 3: Write minimal frontend implementation**

```typescript
// src/lib/session-store.ts
import { readTextFile, writeTextFile, readDir, mkdir, remove, exists } from "@tauri-apps/plugin-fs";
import { join, homeDir } from "@tauri-apps/api/path";

export interface SessionMeta {
  id: string;
  title: string;
  timestamp: number;
  messageCount: number;
}

export interface SessionData {
  meta: SessionMeta;
  events: Record<string, unknown>[];
}

async function sessionDir(): Promise<string> {
  const home = await homeDir();
  return join(home, ".zosmaai", "cowork", "sessions");
}

function extractTitle(lines: string[]): string {
  for (const line of lines) {
    try {
      const e = JSON.parse(line);
      if (e.type === "message_start" && e.message?.role === "user") {
        const text = e.message.content?.[0]?.text || "";
        return text.length > 80 ? text.slice(0, 80) + "..." : text;
      }
    } catch { /* skip */ }
  }
  return "Untitled session";
}

export async function listSessions(): Promise<SessionMeta[]> {
  const dir = await sessionDir();

  const dirExists = await exists(dir);
  if (!dirExists) return [];

  const entries = await readDir(dir);
  const jsonlFiles = entries
    .filter(e => e.name?.endsWith(".jsonl"))
    .sort((a, b) => (b.name || "").localeCompare(a.name || ""));

  const sessions: SessionMeta[] = [];
  for (const file of jsonlFiles) {
    const content = await readTextFile(join(dir, file.name!));
    const lines = content.trim().split("\n");
    if (lines.length === 0) continue;

    const header = JSON.parse(lines[0]);
    const userMsgs = lines.filter(l => {
      try {
        const e = JSON.parse(l);
        return e.type === "message_start" && e.message?.role === "user";
      } catch { return false; }
    });

    sessions.push({
      id: header.id || file.name!.replace(".jsonl", ""),
      title: extractTitle(lines),
      timestamp: new Date(header.timestamp).getTime(),
      messageCount: userMsgs.length,
    });
  }
  return sessions;
}

export async function writeSession(id: string, events: Record<string, unknown>[]): Promise<void> {
  const dir = await sessionDir();
  await mkdir(dir, { recursive: true });

  const header = events[0];
  const ts = (header.timestamp as string) || new Date().toISOString();
  const safeTs = ts.replace(/[:.]/g, "-");
  const filename = `${safeTs}_${id}.jsonl`;
  const content = events.map(e => JSON.stringify(e)).join("\n") + "\n";
  await writeTextFile(join(dir, filename), content);
}

export async function readSession(id: string): Promise<SessionData | null> {
  const dir = await sessionDir();
  const dirExists = await exists(dir);
  if (!dirExists) return null;

  const entries = await readDir(dir);
  const match = entries.find(e => e.name?.includes(id));
  if (!match) return null;

  const content = await readTextFile(join(dir, match.name!));
  const lines = content.trim().split("\n");
  const events = lines.map(l => JSON.parse(l));
  const header = events[0] as Record<string, unknown>;

  return {
    meta: {
      id: (header.id as string) || id,
      title: extractTitle(lines),
      timestamp: new Date(header.timestamp as string).getTime(),
      messageCount: events.filter(e => (e as any).type === "message_start" && (e as any).message?.role === "user").length,
    },
    events,
  };
}

export async function deleteSession(id: string): Promise<void> {
  const dir = await sessionDir();
  const dirExists = await exists(dir);
  if (!dirExists) return;

  const entries = await readDir(dir);
  const match = entries.find(e => e.name?.includes(id));
  if (match) {
    await remove(join(dir, match.name!));
  }
}
```

**Step 4: Run tests to verify they pass**

Run: `npx vitest run src/lib/session-store.test.ts`
Expected: PASS

**Step 5: Add remaining frontend tests**

```typescript
it("writeSession calls invoke with correct args", async () => {
  vi.mocked(invoke).mockResolvedValue(undefined);
  const events = [{ type: "session", id: "abc" }];
  await writeSession("abc", events);
  expect(invoke).toHaveBeenCalledWith("write_session", {
    id: "abc",
    events: [JSON.stringify(events[0])],
  });
});

it("readSession calls invoke with id", async () => {
  vi.mocked(invoke).mockResolvedValue({ meta: { id: "abc", title: "Test", timestamp: 0, messageCount: 0 }, events: [] });
  const result = await readSession("abc");
  expect(result).not.toBeNull();
  expect(invoke).toHaveBeenCalledWith("read_session", { id: "abc" });
});

it("deleteSession calls invoke with id", async () => {
  vi.mocked(invoke).mockResolvedValue(undefined);
  await deleteSession("abc");
  expect(invoke).toHaveBeenCalledWith("delete_session", { id: "abc" });
});
```

**Step 6: Run all frontend tests to verify**

Run: `npx vitest run src/lib/session-store.test.ts`
Expected: ALL PASS (4 tests)

**Step 7: Configure capabilities**

Add FS permissions to `src-tauri/capabilities/default.json`:

Parse the session header to extract the title:

```typescript
// In the test:
it("extracts title from session file", async () => {
  const content = [
    JSON.stringify({ type: "session", id: "abc", timestamp: "2026-04-29T00:00:00Z" }),
    JSON.stringify({ type: "message_start", message: { role: "user", content: [{ type: "text", text: "Build the auth system" }] } }),
    JSON.stringify({ type: "done" }),
  ].join("\n");
  vi.mocked(readDir).mockResolvedValue([{ name: "test_abc.jsonl" } as any]);
  vi.mocked(readTextFile).mockResolvedValue(content);

  const sessions = await listSessions();
  expect(sessions).toHaveLength(1);
  expect(sessions[0].title).toBe("Build the auth system");
  expect(sessions[0].messageCount).toBe(1);
});
```

**Step 8: Configure capabilities**

Add to `src-tauri/capabilities/default.json`:

```json
{
  "$schema": "../gen/schemas/desktop-schema.json",
  "identifier": "default",
  "description": "Default capabilities for Zosma Cowork",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "shell:allow-open",
    "notification:default",
    {
      "identifier": "shell:allow-execute",
      "allow": [{
        "args": ["-c", { "validator": "\\S+" }],
        "cmd": "sh",
        "name": "sh",
        "sidecar": false
      }]
    },
    "fs:default",
    { "identifier": "fs:allow-read-text-file", "allow": [{ "path": "$HOME/.zosmaai/cowork/**" }] },
    { "identifier": "fs:allow-write-text-file", "allow": [{ "path": "$HOME/.zosmaai/cowork/**" }] },
    { "identifier": "fs:allow-read-dir", "allow": [{ "path": "$HOME/.zosmaai/cowork/**" }] },
    { "identifier": "fs:allow-mkdir", "allow": [{ "path": "$HOME/.zosmaai/cowork/**" }] },
    { "identifier": "fs:allow-remove", "allow": [{ "path": "$HOME/.zosmaai/cowork/**" }] },
    { "identifier": "fs:allow-exists", "allow": [{ "path": "$HOME/.zosmaai/cowork/**" }] }
  ]
}
```

Also register the FS plugin in `src-tauri/src/lib.rs`:
```rust
.plugin(tauri_plugin_fs::init())
```

**Step 10: Run all tests and commit**

```bash
npx vitest run src/lib/session-store.test.ts
```
Expected: ALL PASS

```bash
git add src/lib/session-store.ts src/lib/session-store.test.ts src-tauri/capabilities/default.json src-tauri/Cargo.toml src-tauri/src/lib.rs
git commit -m "feat: add session store with JSONL persistence via @tauri-apps/plugin-fs"
```

---

### Task 2: useSessions hook

**TDD scenario:** New feature - full TDD cycle

**Files:**
- Create: `src/hooks/useSessions.test.ts`
- Create: `src/hooks/useSessions.ts`

**Step 1: Write failing test**

```typescript
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSessions } from "./useSessions";

vi.mock("@/lib/session-store", () => ({
  listSessions: vi.fn(),
  writeSession: vi.fn(),
  deleteSession: vi.fn(),
  readSession: vi.fn(),
}));

import * as store from "@/lib/session-store";

describe("useSessions", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("loads sessions on mount", async () => {
    const mockList = vi.mocked(store.listSessions);
    mockList.mockResolvedValue([
      { id: "1", title: "Test", timestamp: Date.now(), messageCount: 3 },
    ]);

    const { result } = renderHook(() => useSessions());
    await act(async () => {}); // flush effects

    expect(result.current.sessions).toHaveLength(1);
    expect(result.current.loading).toBe(false);
  });
});
```

**Step 2-4:** Run → fails → implement → passes

```typescript
import { useState, useEffect, useCallback } from "react";
import { listSessions, deleteSession, type SessionMeta } from "@/lib/session-store";

export function useSessions() {
  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await listSessions();
    setSessions(list);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const createSession = useCallback((id: string) => {
    setActiveSessionId(id);
  }, []);

  const deleteSessionById = useCallback(async (id: string) => {
    await deleteSession(id);
    if (activeSessionId === id) setActiveSessionId(null);
    await refresh();
  }, [activeSessionId, refresh]);

  return { sessions, activeSessionId, loading, createSession, deleteSession: deleteSessionById, refresh };
}
```

**Step 5:** Run tests, verify, commit

```bash
npx vitest run src/hooks/useSessions.test.ts
git add src/hooks/useSessions.ts src/hooks/useSessions.test.ts
git commit -m "feat: add useSessions hook"
```

---

### Task 3: Rewrite usePiStream with useReducer

**TDD scenario:** Modifying tested code - run existing tests first

**Files:**
- Modify: `src/hooks/usePiStream.ts`
- Modify: `src/hooks/usePiStream.test.ts`
- Modify: `src/types/index.ts` (add UsageInfo type)

**Step 1: Run existing tests**

Run: `npx vitest run src/hooks/`
Expected: See current test status (there may not be existing tests for usePiStream)

**Step 2: Define StreamState + action types in usePiStream.ts**

```typescript
export interface StreamState {
  messages: ChatMessage[];
  streamingMessage: ChatMessage | null;
  isRunning: boolean;
  status: "idle" | "thinking" | "tool_call" | "responding" | "error";
  error: string | null;
}

export interface UsageInfo {
  input: number;
  output: number;
  totalTokens: number;
  cost: number;
}

type StreamAction =
  | { type: "START_STREAM"; prompt: string }
  | { type: "TEXT_DELTA"; delta: string }
  | { type: "THINKING_DELTA"; delta: string }
  | { type: "TOOL_CALL_START"; toolCall: ToolCallInfo }
  | { type: "TOOL_CALL_UPDATE"; id: string; result: string; status: "running" | "completed" | "error"; isError?: boolean }
  | { type: "STREAM_COMPLETE"; usage?: UsageInfo }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "ABORT_STREAM" }
  | { type: "RESET" };
```

**Step 3: Write reducer tests**

```typescript
import { describe, it, expect } from "vitest";
import { streamReducer, INITIAL_STATE } from "./usePiStream";

describe("streamReducer", () => {
  it("START_STREAM creates user message and assistant placeholder", () => {
    const state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hello" });
    expect(state.isRunning).toBe(true);
    expect(state.status).toBe("thinking");
    expect(state.messages).toHaveLength(1);
    expect(state.messages[0].role).toBe("user");
    expect(state.messages[0].content).toBe("Hello");
    expect(state.streamingMessage).not.toBeNull();
    expect(state.streamingMessage!.isStreaming).toBe(true);
  });

  it("TEXT_DELTA accumulates into streaming message", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hi" });
    state = streamReducer(state, { type: "TEXT_DELTA", delta: "Hello " });
    state = streamReducer(state, { type: "TEXT_DELTA", delta: "world" });
    expect(state.streamingMessage!.content).toBe("Hello world");
    expect(state.status).toBe("responding");
  });

  it("THINKING_DELTA accumulates into thinking", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hi" });
    state = streamReducer(state, { type: "THINKING_DELTA", delta: "Let me think..." });
    expect(state.streamingMessage!.thinking).toBe("Let me think...");
    expect(state.status).toBe("thinking");
  });

  it("TOOL_CALL_START adds tool call to streaming message", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "X" });
    state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: { id: "tc1", name: "bash", args: { command: "ls" }, status: "running" } });
    expect(state.streamingMessage!.toolCalls).toHaveLength(1);
    expect(state.streamingMessage!.toolCalls[0].name).toBe("bash");
    expect(state.status).toBe("tool_call");
  });

  it("TOOL_CALL_UPDATE updates existing tool call", () => {
    const tc: ToolCallInfo = { id: "tc1", name: "bash", args: {}, status: "running" };
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "X" });
    state = streamReducer(state, { type: "TOOL_CALL_START", toolCall: tc });
    state = streamReducer(state, { type: "TOOL_CALL_UPDATE", id: "tc1", result: "done", status: "completed" });
    expect(state.streamingMessage!.toolCalls[0].status).toBe("completed");
    expect(state.streamingMessage!.toolCalls[0].result).toBe("done");
  });

  it("STREAM_COMPLETE moves streaming message to messages", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hi" });
    state = streamReducer(state, { type: "TEXT_DELTA", delta: "Answer" });
    state = streamReducer(state, { type: "STREAM_COMPLETE" });
    expect(state.isRunning).toBe(false);
    expect(state.streamingMessage).toBeNull();
    expect(state.messages).toHaveLength(2); // user + assistant
    expect(state.messages[1].content).toBe("Answer");
  });

  it("ABORT_STREAM clears running state", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hi" });
    state = streamReducer(state, { type: "ABORT_STREAM" });
    expect(state.isRunning).toBe(false);
    expect(state.status).toBe("idle");
  });

  it("STREAM_ERROR sets error", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hi" });
    state = streamReducer(state, { type: "STREAM_ERROR", error: "Something broke" });
    expect(state.isRunning).toBe(false);
    expect(state.error).toBe("Something broke");
  });

  it("RESET returns initial state", () => {
    let state = streamReducer(INITIAL_STATE, { type: "START_STREAM", prompt: "Hi" });
    state = streamReducer(state, { type: "RESET" });
    expect(state).toEqual(INITIAL_STATE);
  });
});
```

**Step 4: Run reducer tests to verify they fail**

Run: `npx vitest run src/hooks/usePiStream.test.ts`
Expected: FAIL - functions not defined

**Step 5: Implement the reducer + updated hook**

```typescript
export const INITIAL_STATE: StreamState = {
  messages: [],
  streamingMessage: null,
  isRunning: false,
  status: "idle",
  error: null,
};

export function streamReducer(state: StreamState, action: StreamAction): StreamState {
  switch (action.type) {
    case "START_STREAM":
      return {
        ...INITIAL_STATE,
        isRunning: true,
        status: "thinking",
        messages: [
          { id: crypto.randomUUID(), role: "user" as const, content: action.prompt, timestamp: Date.now() },
        ],
        streamingMessage: {
          id: crypto.randomUUID(),
          role: "assistant" as const,
          content: "",
          thinking: "",
          isStreaming: true,
          toolCalls: [],
          timestamp: Date.now(),
        },
      };

    case "TEXT_DELTA": {
      const msg = state.streamingMessage;
      if (!msg) return state;
      return { ...state, streamingMessage: { ...msg, content: msg.content + action.delta }, status: "responding" };
    }

    case "THINKING_DELTA": {
      const msg = state.streamingMessage;
      if (!msg) return state;
      return { ...state, streamingMessage: { ...msg, thinking: msg.thinking + action.delta }, status: "thinking" };
    }

    case "TOOL_CALL_START": {
      const msg = state.streamingMessage;
      if (!msg) return state;
      return { ...state, streamingMessage: { ...msg, toolCalls: [...msg.toolCalls, action.toolCall] }, status: "tool_call" };
    }

    case "TOOL_CALL_UPDATE": {
      const msg = state.streamingMessage;
      if (!msg) return state;
      return {
        ...state,
        streamingMessage: {
          ...msg,
          toolCalls: msg.toolCalls.map((tc) =>
            tc.id === action.id ? { ...tc, status: action.status, result: action.result, isError: action.isError } : tc
          ),
        },
      };
    }

    case "STREAM_COMPLETE": {
      const msg = state.streamingMessage;
      if (!msg) return { ...state, isRunning: false, status: "idle", streamingMessage: null };
      return {
        ...state,
        isRunning: false,
        status: "idle",
        messages: [...state.messages, { ...msg, isStreaming: false }],
        streamingMessage: null,
      };
    }

    case "STREAM_ERROR":
      return { ...state, isRunning: false, status: "idle", error: action.error };

    case "ABORT_STREAM":
      return { ...state, isRunning: false, status: "idle" };

    case "RESET":
      return INITIAL_STATE;

    default:
      return state;
  }
}
```

Then rewrite `usePiStream` to use the reducer:
```typescript
export function usePiStream() {
  const [state, dispatch] = useReducer(streamReducer, INITIAL_STATE);

  const startStream = useCallback(async (prompt: string) => {
    dispatch({ type: "START_STREAM", prompt });

    const channel = new Channel<PiEvent>();
    channel.onmessage = (event: PiEvent) => {
      switch (event.type) {
        case "message_update": {
          const ame = (event as PiMessageUpdateEvent).assistantMessageEvent;
          switch (ame.type) {
            case "text_delta": dispatch({ type: "TEXT_DELTA", delta: ame.delta }); break;
            case "thinking_delta": dispatch({ type: "THINKING_DELTA", delta: ame.delta }); break;
            case "toolcall_end": {
              const tc = ame.toolCall;
              let args: Record<string, unknown> = {};
              try { args = JSON.parse(tc.function.arguments); } catch { args = { raw: tc.function.arguments }; }
              dispatch({ type: "TOOL_CALL_START", toolCall: { id: tc.id, name: tc.function.name, args, status: "running" as const } });
              break;
            }
          }
          break;
        }
        case "tool_execution_update": {
          const e = event as PiToolExecutionUpdateEvent;
          dispatch({ type: "TOOL_CALL_UPDATE", id: e.toolCallId, result: e.partialResult.content.map(c => c.text).join(""), status: "running" as const });
          break;
        }
        case "tool_execution_end": {
          const e = event as PiToolExecutionEndEvent;
          dispatch({ type: "TOOL_CALL_UPDATE", id: e.toolCallId, result: e.result.content.map(c => c.text).join(""), status: e.isError ? "error" as const : "completed" as const, isError: e.isError });
          break;
        }
        case "done": dispatch({ type: "STREAM_COMPLETE" }); break;
        case "error": dispatch({ type: "STREAM_ERROR", error: (event as { message: string }).message }); break;
      }
    };

    try {
      await invoke("run_pi_stream", { args: [prompt], channel });
    } catch (err) {
      dispatch({ type: "STREAM_ERROR", error: err instanceof Error ? err.message : String(err) });
    }
  }, []);

  const abortStream = useCallback(async () => {
    dispatch({ type: "ABORT_STREAM" });
    try { await invoke<boolean>("abort_pi"); } catch { /* ignore */ }
  }, []);

  return { state, startStream, abortStream, dispatch };
}
```

**Step 6: Run all tests**

Run: `npx vitest run src/hooks/usePiStream.test.ts`
Expected: ALL PASS

**Step 7: Commit**

```bash
git add src/hooks/usePiStream.ts src/hooks/usePiStream.test.ts
git commit -m "fix: rewrite usePiStream with useReducer to eliminate race conditions"
```

---

### Task 4: Restructure App.tsx layout

**TDD scenario:** Modifying tested code - run existing tests first

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.test.tsx`

**Step 1: Run existing App tests**

Run: `npx vitest run src/App.test.tsx`
Expected: See current test status

**Step 2: Rewrite App.tsx**

Remove the `SegmentedControl` with 4 tabs. Replace with three-column layout:
- Left sidebar (Sidebar component with sessions + nav)
- Main area (ChatView / TasksView / SettingsView)
- Right panel (collapsible, CMD+B toggle)

```typescript
function App() {
  const { status, loading: statusLoading, refetch } = usePiStatus();
  const { state: streamState, startStream, abortStream } = usePiStream();
  const { sessions, activeSessionId, loading: sessionsLoading, createSession, deleteSession } = useSessions();
  const [activeView, setActiveView] = useState<"chat" | "tasks" | "settings">("chat");
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  // CMD+B to toggle right panel
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        setRightPanelOpen(prev => !prev);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  async function handleSend(text: string) {
    await startStream(text);
  }

  if (statusLoading) return <LoadingScreen />;
  if (!status?.installed) return <WelcomeScreen status={status!} onRefetch={refetch} />;

  return (
    <Sidebar
      sessions={sessions}
      activeSessionId={activeSessionId}
      onSelectSession={createSession}
      onDeleteSession={deleteSession}
      activeView={activeView}
      onNavigate={setActiveView}
    />
    <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
      {activeView === "chat" && <ChatView streamState={streamState} onSend={handleSend} onAbort={abortStream} />}
      {activeView === "tasks" && <TasksView />}
      {activeView === "settings" && <SettingsView />}
    </main>
    {rightPanelOpen && <RightPanel streamState={streamState} onClose={() => setRightPanelOpen(false)} />}
  );
}
```

**Step 3-5:** Run tests → update → verify

**Step 6:** Commit

```bash
git add src/App.tsx
git commit -m "refactor: restructure App into 3-column layout with nav icons"
```

---

### Task 5: Sidebar components

**TDD scenario:** New feature - full TDD cycle

**Files:**
- Create: `src/sidebar/Sidebar.tsx`
- Create: `src/sidebar/SessionList.tsx`
- Create: `src/sidebar/SessionItem.tsx`
- Create: `src/sidebar/NavIcons.tsx`
- Create: `src/sidebar/Sidebar.test.tsx`

**Step 1: Write Sidebar test**

```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Sidebar } from "./Sidebar";
import type { SessionMeta } from "@/lib/session-store";

const mockSessions: SessionMeta[] = [
  { id: "1", title: "Build auth system", timestamp: Date.now(), messageCount: 5 },
  { id: "2", title: "Fix login bug", timestamp: Date.now() - 3600000, messageCount: 3 },
];

describe("Sidebar", () => {
  it("renders session list and nav icons", () => {
    render(<Sidebar sessions={mockSessions} activeSessionId={null} onSelectSession={vi.fn()} onDeleteSession={vi.fn()} activeView="chat" onNavigate={vi.fn()} />);
    expect(screen.getByText("Build auth system")).toBeDefined();
    expect(screen.getByText("Fix login bug")).toBeDefined();
    expect(screen.getByLabelText("Tasks")).toBeDefined();
    expect(screen.getByLabelText("Settings")).toBeDefined();
  });

  it("highlights active session", () => {
    render(<Sidebar sessions={mockSessions} activeSessionId="1" onSelectSession={vi.fn()} onDeleteSession={vi.fn()} activeView="chat" onNavigate={vi.fn()} />);
    const sessions = screen.getAllByRole("button").filter(b => b.textContent?.includes("Build auth"));
    expect(sessions.length).toBeGreaterThan(0);
  });

  it("calls onNavigate when nav icon clicked", () => {
    const onNavigate = vi.fn();
    render(<Sidebar sessions={mockSessions} activeSessionId={null} onSelectSession={vi.fn()} onDeleteSession={vi.fn()} activeView="chat" onNavigate={onNavigate} />);
    fireEvent.click(screen.getByLabelText("Tasks"));
    expect(onNavigate).toHaveBeenCalledWith("tasks");
  });

  it("shows empty state", () => {
    render(<Sidebar sessions={[]} activeSessionId={null} onSelectSession={vi.fn()} onDeleteSession={vi.fn()} activeView="chat" onNavigate={vi.fn()} />);
    expect(screen.getByText("No sessions yet")).toBeDefined();
  });
});
```

**Step 2-6:** TDD cycle for each component

Key component implementations:

```typescript
// Sidebar.tsx
export function Sidebar({ sessions, activeSessionId, onSelectSession, onDeleteSession, activeView, onNavigate }: SidebarProps) {
  return (
    <aside className="w-[240px] flex flex-col border-r bg-sidebar shrink-0">
      <div className="p-3 border-b border-sidebar-border">
        <button type="button" onClick={() => onSelectSession(crypto.randomUUID())}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors">
          <Plus className="w-4 h-4" />
          New session
        </button>
      </div>
      <SessionList sessions={sessions} activeSessionId={activeSessionId} onSelect={onSelectSession} onDelete={onDeleteSession} />
      <div className="mt-auto border-t border-sidebar-border p-2">
        <NavIcons activeView={activeView} onNavigate={onNavigate} />
      </div>
    </aside>
  );
}
```

```typescript
// NavIcons.tsx
import { MessageSquare, CheckSquare, Settings } from "lucide-react";

interface NavIconsProps {
  activeView: "chat" | "tasks" | "settings";
  onNavigate: (view: "chat" | "tasks" | "settings") => void;
}

export function NavIcons({ activeView, onNavigate }: NavIconsProps) {
  const items = [
    { view: "chat" as const, icon: MessageSquare, label: "Chat" },
    { view: "tasks" as const, icon: CheckSquare, label: "Tasks" },
    { view: "settings" as const, icon: Settings, label: "Settings" },
  ];

  return (
    <div className="flex justify-around">
      {items.map(({ view, icon: Icon, label }) => (
        <button key={view} type="button" onClick={() => onNavigate(view)}
          aria-label={label}
          className={`p-2 rounded-lg transition-colors ${activeView === view ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-muted-foreground hover:text-sidebar-foreground"}`}>
          <Icon className="w-5 h-5" />
        </button>
      ))}
    </div>
  );
}
```

**Step 7:** Run all tests, commit

```bash
npx vitest run src/sidebar/
git add src/sidebar/
git commit -m "feat: add sidebar with session list and nav icons"
```

---

### Task 6: ChatView + WelcomeScreen

**TDD scenario:** New feature - full TDD cycle

**Files:**
- Create: `src/chat/ChatView.tsx`
- Create: `src/chat/ChatView.test.tsx`
- Modify: `src/App.tsx` (wire up ChatView)
- Delete: unused components (ActivityBar, old Sidebar)

**Step 1-4:** Write WelcomeScreen tests → implement

WelcomeScreen shows:
- When sessions exist: recent sessions summary + "New session" button + suggestion buttons
- When no sessions: "What are you working on?" + suggestion buttons
- Suggestions: "Plan my day", "Write some code", "Research a topic"

**Step 5-8:** Write ChatView tests → implement

ChatView receives `streamState`, `onSend`, `onAbort` as props. Shows:
- MessageList (scrollable, messages from state + streaming message)
- Composer at bottom
- Status bar when streaming (model, tokens, stop button)
- WelcomeScreen when no messages and not streaming

**Step 9:** Run all tests + commit

```bash
npx vitest run src/chat/
git add src/chat/ src/components/WelcomeScreen.tsx
git commit -m "feat: add ChatView and updated WelcomeScreen"
```

---

### Task 7: TasksView + SettingsView (skeleton)

**TDD scenario:** New feature - full TDD cycle

**Files:**
- Create: `src/tasks/TasksView.tsx`
- Create: `src/tasks/TasksView.test.tsx`
- Create: `src/settings/SettingsView.tsx`
- Create: `src/settings/SettingsView.test.tsx`

TasksView: Shows "No scheduled tasks yet" with brief description. Will be populated in Phase 2.

SettingsView: Shows active model, theme toggle, home directory path, app version. Reads model info from pi status.

**Commit:**
```bash
git add src/tasks/ src/settings/
git commit -m "feat: add TasksView and SettingsView skeletons"
```

---

### Task 8: RightPanel component

**TDD scenario:** Modifying existing code

**Files:**
- Modify: `src/components/RightPanel.tsx`
- Modify: `src/components/RightPanel.test.tsx`

Collapsible panel with live tool call display. Shows:
- Tool calls from `streamState.streamingMessage.toolCalls`
- Usage/cost from completed messages
- Close button

Panel is closed by default, opened by CMD+B shortcut. Also auto-opens when a tool call starts.

**Commit:**
```bash
git add src/components/RightPanel.tsx
git commit -m "feat: collapsible RightPanel with live tool calls"
```

---

### Task 9: Wire up session persistence

**TDD scenario:** Modifying tested code - run existing tests first

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/hooks/usePiStream.ts`

On `STREAM_COMPLETE`, collect all events from the session and call `writeSession(id, events)`. On session click in sidebar, call `readSession(id)` and populate the message list. Add a `loadSession` action to the reducer to restore a session's messages.

**Commit:**
```bash
git add src/App.tsx src/hooks/usePiStream.ts
git commit -m "feat: wire up session persistence on stream complete"
```

---

## Task Dependency Graph

```
Task 1 (session-store) ──> Task 2 (useSessions hook)
                              │
Task 3 (useReducer) ─────────┤
                              ├──> Task 4 (App.tsx layout)
                              │       │
                              ├──> Task 5 (Sidebar) ──> Task 6 (ChatView)
                              │                            │
                              ├──> Task 7 (Tasks/Settings) │
                              │                            │
                              └──> Task 8 (RightPanel)     │
                                                           │
                                              Task 9 (wire persistence)
```

## Checkpoints for Review

1. **After Tasks 1-3** (foundation done - store, hook, reducer)
2. **After Tasks 5-6** (sidebar + chat UI functional)
3. **After Task 9** (everything wired - full MVP loop)
