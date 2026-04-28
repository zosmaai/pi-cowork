# Cowork MVP v1 — Design

> **Date:** 2026-04-29
> **Status:** Validated design (brainstorm complete)

---

## Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Home directory | `~/pi-cowork/` | User's request. Keeps cowork data separate from pi's `~/.pi/agent/`. |
| Session storage | `~/pi-cowork/sessions/*.jsonl` | Cowork-owned. Same JSONL format as pi sessions. Flat list, no per-CWD subdirs for MVP. |
| Welcome screen | Smart summary + suggestions | Recent sessions + static action buttons for MVP. AI-personalized suggestions in later phase. |
| Navigation | Icon-only sidebar | 3 icons at bottom of session sidebar: 💬 Chat, ✓ Tasks, ⚙️ Settings |
| Right panel | Minimal, collapsible | Closed by default. Toggled via shortcut (`CMD+B` or `CMD+.`). Auto-shows during tool calls. |
| 3-layer architecture | GUI first, extension+skill later | Extension and skill bundle comes in Phase 1+. MVP owns everything in the Tauri app. |
| Session model | Fresh pi session per new chat | Each new session spawns `pi --mode json`, captures stream, saves to disk. |
| Streaming state | `useReducer` | Fixes the blank-screen race condition. Single source of truth, no stale closures. |

## Layout

```
┌───────────────────────────────────────────────────────┐
│                    Title Bar (native)                  │
├──────────┬────────────────────────────┬────────────────┤
│ Sessions │   Main Area                │ Right Panel    │
│   list   │   (Chat / Tasks /          │ (collapsible,  │
│          │    Settings)               │  closed by def)│
│          │                            │                │
│  ─────── │  ┌──────────────────────┐  │ • Tool calls   │
│  Session │  │ Messages / Content   │  │ • Artifacts    │
│    1     │  │                      │  │ • Cost/usage   │
│  Session │  │                      │  │                │
│    2     │  │                      │  │                │
│  Session │  └──────────────────────┘  │                │
│    3     │                            │                │
│          │  ┌──────────────────────┐  │                │
│  ─────── │  │  Composer            │  │                │
│  [💬][✓] │  │  [🎤] [📎] Send ►   │  │                │
│  [⚙️]   │  └──────────────────────┘  │                │
├──────────┴────────────────────────────┴────────────────┤
│  model: <provider/model> | tokens: <n> | pi connected ✓│
└────────────────────────────────────────────────────────┘
```

## Component Tree

```
src/
├── main.tsx
├── App.tsx                          # Layout shell
│
├── layouts/
│   └── AppLayout.tsx                 # 3-column grid (sidebar | main | right)
│
├── sidebar/
│   ├── Sidebar.tsx                   # Session list + bottom nav
│   ├── SessionList.tsx               # Scrollable session history
│   ├── SessionItem.tsx               # Single session row
│   └── NavIcons.tsx                  # [💬] [✓] [⚙️]
│
├── chat/
│   ├── ChatView.tsx                  # Messages + composer
│   ├── WelcomeScreen.tsx             # Start screen
│   ├── MessageList.tsx               # Scrollable messages
│   ├── MessageItem.tsx               # Single message
│   ├── ThinkingBlock.tsx             # Collapsible thinking
│   ├── ToolCallCard.tsx              # Tool execution display
│   └── Composer.tsx                  # Text + voice + file
│
├── tasks/
│   └── TasksView.tsx                 # Scheduled tasks
│
├── settings/
│   └── SettingsView.tsx              # Model, theme, about
│
├── panels/
│   └── RightPanel.tsx                # Tool calls, artifacts (collapsible)
│
├── hooks/
│   ├── usePiStream.ts                # useReducer-based (no races)
│   ├── usePiStatus.ts                # Pi installation check
│   └── useSessions.ts                # Read/write ~/pi-cowork/sessions/
│
├── lib/
│   ├── session-store.ts              # JSONL file CRUD
│   └── utils.ts
│
├── types/
│   ├── index.ts
│   └── pi-events.ts

```

## Data Flow

### Streaming (useReducer)
```typescript
type StreamAction =
  | { type: "START_STREAM"; prompt: string }
  | { type: "USER_MESSAGE_SENT"; message: ChatMessage }
  | { type: "TEXT_DELTA"; delta: string }
  | { type: "THINKING_DELTA"; delta: string }
  | { type: "TOOL_CALL_START"; toolCall: ToolCallInfo }
  | { type: "TOOL_CALL_UPDATE"; id: string; result: string; status: "running" | "completed" | "error"; isError?: boolean }
  | { type: "STREAM_COMPLETE"; usage?: UsageInfo }
  | { type: "STREAM_ERROR"; error: string }
  | { type: "ABORT_STREAM" }
  | { type: "RESET" };
```

### Session Store (pure functions)
```typescript
async function listSessions(dir: string): Promise<SessionMeta[]>
async function readSession(dir: string, id: string): Promise<SessionData>
async function writeSession(dir: string, data: SessionData): Promise<void>
async function deleteSession(dir: string, id: string): Promise<void>
```

### App State
- `App.tsx` owns: streamState, sessions[], activeSessionId, activeView, rightPanelOpen
- Components are presentational — no data-fetching inside them
- `useSessions()` hook calls session-store and returns state

## Coding Standards Applied
- **TypeScript strict mode** — no `any`, no implicit `any`
- **Biome** for linting + formatting (already configured)
- **Vitest** with `@testing-library/react` for component tests
- **Pure functions** for data layer (session-store is framework-agnostic)
- **useReducer** over multiple useState chains for complex state
- **Tailwind v4** with `@tailwindcss/vite` plugin
- **No data-fetching inside components** — hooks own all async state

## Future (Post-MVP)
- Cowork extension + skill bundle for cross-session personalization
- AI-powered welcome suggestions based on session analysis
- Voice input via whisper.cpp/system STT
- App store with configurable apps
