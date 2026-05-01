# Zosma Cowork

**English** | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A desktop AI coworker powered by the [pi agent SDK](https://github.com/Dicklesworthstone/pi_agent_rust) — streaming, thinking, tool calls, multi-turn sessions, and steering, all in a beautiful native app.

![pi-cowork-screenshot](./assets/screenshot.png)

## Features

- **In-process agent runtime** — The pi agent SDK runs directly inside the app (no subprocess, no CLI dependency at runtime)
- **Multi-turn sessions** — Full conversation continuity with persistent session history
- **Streaming responses** — See the agent think, write, and call tools in real-time
- **Thinking blocks** — Expandable reasoning from the model
- **Tool call timeline** — Live bash/edit/write tool calls with args and results
- **Session management** — Persistent chat sessions saved to `~/.zosmaai/cowork/`
- **Light & dark mode** — Warm cream light mode, warm charcoal dark mode
- **Keyboard shortcuts** — `Cmd/Ctrl+Shift+K` to focus, `Cmd/Ctrl+N` for new session
- **Abort & steering** — Stop a running agent mid-turn, send follow-up steering messages
- **Claude-inspired UI** — 3-column layout with sidebar, workspace, and info panel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri v2 Desktop App                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   Left Sidebar  │  │  Center Workspace│  │Right Panel │  │
│  │  (Sessions)     │  │  (Chat/Welcome)  │  │(Progress)  │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
│           ▲                                              │
│           │ React + Tailwind CSS v4                      │
│  ┌────────┴─────────────────────────────────────────────┐│
│  │  metaagents Engine (Rust, in-process)                ││
│  │  • Session management — create, drop, list           ││
│  │  • Event bridging — SDK events → typed CoworkEvents  ││
│  │  • Config reader — reads ~/.pi/agent/ settings       ││
│  │  • Extension discovery — scans installed packages     ││
│  └────────────┬─────────────────────────────────────────┘│
│               │ pi_agent_rust SDK                         │
│               │ (QuickJS extensions, providers, tools)    │
│               ▼                                           │
│        LLM Providers (OpenAI, Anthropic, ...)            │
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Desktop Shell | Tauri v2, Rust, Tokio |
| Agent Engine | [metaagents](./metaagents/) — Rust wrapper around `pi_agent_rust` SDK |
| Agent SDK | [`pi_agent_rust`](https://github.com/Dicklesworthstone/pi_agent_rust) — in-process runtime with QuickJS extensions |
| Testing | Vitest, Testing Library, jsdom, `cargo test` |
| Linting | Biome (frontend), Clippy (Rust) |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/) 1.85+

### Quick Start

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev:frontend

# Run full Tauri app (frontend + Rust backend + metaagents engine)
npm run dev
```

### Scripts

```bash
npm run lint          # Biome lint
npm run typecheck     # TypeScript check
npm run test          # Vitest run
npm run validate      # lint + typecheck + test
npm run format        # Biome format

# Tauri
npm run build:frontend
npm run build         # Build release binary

# Rust
cargo test --workspace    # All Rust tests (engine + Tauri)
cargo clippy --workspace  # Lint Rust code
```

## Config & Data

| What | Location | Notes |
|------|----------|-------|
| LLM providers & API keys | `~/.zosmaai/agent/settings.json` | Managed by the app |
| Model definitions | `~/.zosmaai/agent/models.json` | Managed by the app |
| Extensions & skills | `~/.zosmaai/agent/extensions/` | Local extensions directory |
| Session history | `~/.zosmaai/cowork/` | Managed by pi-cowork |

## Event Streaming

The metaagents engine translates SDK `AgentEvent`s into typed `CoworkEvent`s, sent to the frontend via Tauri channels:

| Event | UI Effect |
|-------|-----------|
| `thinking_start/delta/end` | Expandable thinking block |
| `text_start/delta/end` | Streaming markdown content |
| `toolcall_start/delta/end` | Tool call card with args |
| `tool_execution_start/update/end` | Live execution status & output |
| `compaction_start/end` | Status indicator |
| `auto_retry_start/end` | Retry countdown |
| `queue_update` | Pending steering/follow-up queue |
| `done` | Finalize message, enable input |

## Project Structure

```
pi-cowork/
├── metaagents/                   # Agent engine (Rust library)
│   └── src/
│       ├── lib.rs                # Public API + re-exports
│       ├── engine.rs             # MetaAgentsEngine — session management
│       ├── session.rs            # Session wrapper around SDK handle
│       ├── events.rs             # CoworkEvent types for IPC
│       ├── config.rs             # Reads ~/.pi/agent/ settings
│       └── extensions.rs         # Discovers installed extensions
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── ChatMessage.tsx       # Message with thinking + tool calls
│   │   ├── ThinkingBlock.tsx     # Expandable reasoning
│   │   ├── ToolCallTimeline.tsx  # Tool execution timeline
│   │   ├── MessageInput.tsx      # Chat input
│   │   └── ui/                   # Primitives (tooltip, badge, etc.)
│   ├── hooks/
│   │   ├── usePiStream.ts        # Streaming state machine (useReducer)
│   │   └── useSessions.ts        # Session persistence
│   ├── types/
│   │   ├── index.ts              # ChatMessage, ToolCallInfo
│   │   └── pi-events.ts          # CoworkEvent types
│   ├── App.tsx                   # Main 3-column layout
│   └── App.css                   # Tailwind theme (light + dark)
├── src-tauri/                    # Tauri desktop shell
│   └── src/
│       ├── main.rs               # Entry point
│       └── lib.rs                # Tauri commands → metaagents engine
├── docs/                         # Architecture & plans
└── .github/workflows/            # CI/CD
```

## License

MIT © [Zosma AI](https://zosma.ai)
