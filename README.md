# Pi Cowork

**English** | [中文](./README.zh.md) | [Español](./README.es.md) | [日本語](./README.ja.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Português](./README.pt.md) | [Русский](./README.ru.md) | [한국어](./README.ko.md) | [हिंदी](./README.hi.md)

[![CI](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/ci.yml)
[![Release](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml/badge.svg)](https://github.com/zosmaai/pi-cowork/actions/workflows/release.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> A desktop GUI for the [pi coding agent](https://github.com/badlogic/pi-mono) — streaming, thinking, tool calls, and steering, all in a beautiful native app.

![pi-cowork-screenshot](./assets/screenshot.png)

## Features

- **Streaming responses** — See pi think, write, and call tools in real-time
- **Thinking blocks** — Expandable reasoning from the model
- **Tool execution cards** — Live bash/edit/write tool calls with args and results
- **Session management** — Persistent chat sessions with timestamps
- **Light & dark mode** — Warm cream light mode, warm charcoal dark mode
- **Keyboard shortcuts** — `Cmd/Ctrl+Shift+K` to focus, `Cmd/Ctrl+N` for new session
- **Abort & retry** — Stop a running agent, retry on errors
- **Claude-inspired UI** — 3-column layout with sidebar, workspace, and info panel

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  Tauri v2 Desktop App                                        │
│  ┌─────────────────┐  ┌──────────────────┐  ┌────────────┐  │
│  │   Left Sidebar  │  │  Center Workspace│  │Right Panel │  │
│  │  (Tabs/Recents) │  │  (Chat/Welcome)  │  │(Progress)  │  │
│  └─────────────────┘  └──────────────────┘  └────────────┘  │
│           ▲                                              │
│           │ React + Tailwind CSS v4                      │
│  ┌────────┴─────────────────────────────────────────────┐│
│  │  Rust Backend (Tokio async)                          ││
│  │  • run_pi_stream — spawns pi --mode json --print    ││
│  │  • abort_pi — kills running child process           ││
│  └──────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS v4, Radix UI |
| Backend | Tauri v2, Rust, Tokio |
| Testing | Vitest, Testing Library, jsdom |
| Linting | Biome |
| Shell | pi coding agent (`@mariozechner/pi-coding-agent`) |

## Development

### Prerequisites

- [Node.js](https://nodejs.org/) 22+
- [Rust](https://rustup.rs/)
- pi coding agent: `npm install -g @mariozechner/pi-coding-agent`

### Quick Start

```bash
# Install dependencies
npm install

# Run frontend dev server
npm run dev:frontend

# Run full Tauri app (frontend + Rust backend)
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
```

## Event Streaming

pi-cowork consumes pi's JSON event stream (`--mode json --print`) and maps it to React state:

| pi Event | UI Effect |
|----------|-----------|
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
├── assets/                       # Screenshots, icons, etc.
├── src/                          # React frontend
│   ├── components/               # UI components
│   │   ├── ChatMessage.tsx       # Message with thinking + tool calls
│   │   ├── ThinkingBlock.tsx     # Expandable reasoning
│   │   ├── ToolCallCard.tsx      # Tool execution card
│   │   ├── MessageInput.tsx      # Chat input
│   │   ├── TaskCard.tsx          # Welcome screen task grid
│   │   └── ui/                   # Primitives (tooltip, badge, etc.)
│   ├── hooks/
│   │   ├── usePiStatus.ts        # Pi installation check
│   │   └── usePiStream.ts        # Streaming state machine
│   ├── types/
│   │   ├── index.ts              # ChatMessage, ToolCallInfo
│   │   └── pi-events.ts          # Pi JSON event types
│   ├── App.tsx                   # Main 3-column layout
│   └── App.css                   # Tailwind theme (light + dark)
├── src-tauri/                    # Rust backend
│   └── src/
│       └── lib.rs                # Commands: run_pi_stream, abort_pi
└── .github/workflows/            # CI/CD
```

## License

MIT © [Zosma AI](https://zosma.ai)
