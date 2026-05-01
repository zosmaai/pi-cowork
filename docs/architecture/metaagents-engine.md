# MetaAgents Engine Architecture

**Status:** Stable (v0.2.0)  
**Location:** `metaagents/` crate in Cargo workspace

---

## Overview

The MetaAgents engine is a UI-agnostic agent harness built on the [`pi_agent_rust`](https://github.com/Dicklesworthstone/pi_agent_rust) SDK. It sits between the Tauri desktop shell (or any other consumer) and the pi SDK, providing:

- **Session lifecycle** — create, query, drop persistent agent sessions
- **Event bridging** — translate SDK events into stable `CoworkEvent` types
- **Configuration reading** — access pi's provider/model registry from `~/.pi/agent/`
- **Extension discovery** — enumerate installed pi extensions with metadata

The engine is designed to be reusable: Zosma Cowork (desktop GUI), future terminal UIs, and Zosma Code (IDE product) can all consume it without coupling to the pi SDK's internal shape.

---

## Module Map

```
metaagents/src/
├── lib.rs           # Public API surface, re-exports, version constants
├── engine.rs        # MetaAgentsEngine — session registry + convenience methods
├── session.rs       # Session — wraps AgentSessionHandle with event bridging
├── events.rs        # CoworkEvent enum — stable IPC types for consumers
├── config.rs        # ConfigSnapshot — reads settings.json + models.json
└── extensions.rs    # ExtensionInfo — discovers packages from pi directories
```

### `engine.rs` — MetaAgentsEngine

Central coordinator. Manages a `HashMap<SessionId, Arc<Session>>` behind an `RwLock`.

| Method | Purpose |
|--------|---------|
| `new()` | Create engine instance (no external deps) |
| `create_default_session(id)` | New session with default provider/model |
| `create_session_with_model(id, provider, model)` | New session with explicit model |
| `send_prompt(id, text)` | Send prompt, returns `(event_rx, join_handle)` |
| `drop_session(id)` | Remove and cleanup session |
| `list_sessions()` | List active session IDs |
| `set_session_model(id, provider, model)` | Switch model mid-session |

### `session.rs` — Session

Wraps a single `AgentSessionHandle`. Sets up dual-channel event bridging:

1. **Prompt-specific channel** (`mpsc::Receiver<CoworkEvent>`) — receives events for one prompt, closes when that prompt completes
2. **Session-wide subscriber** — catches lifecycle events (errors, unexpected terminations)

Uses `Arc<Mutex<AgentSessionHandle>>` for safe sharing across async tasks.

### `events.rs` — CoworkEvent

Stable enum matching the frontend `PiEvent` taxonomy exactly. This is the contract between engine and UI:

```rust
enum CoworkEvent {
    MessageStart { message },
    MessageUpdate { message, assistant_message_event },
    MessageEnd { message },
    ToolExecutionStart { tool_call_id, tool_name, args },
    ToolExecutionUpdate { tool_call_id, tool_name, partial_result },
    ToolExecutionEnd { tool_call_id, tool_name, result, is_error },
    AgentEnd,
    Done,
    Error { message },
}
```

Translation from SDK `AgentEvent` → `CoworkEvent` happens in `Session::new()` via the `EventListeners` callbacks.

### `config.rs` — Configuration Reader

Reads two files from `~/.pi/agent/`:

- **`settings.json`** — default provider, active model, extension packages list
- **`models.json`** — provider registry with model metadata (context window, reasoning support)

Returns a `ConfigSnapshot` (immutable at point-in-time). The Tauri layer caches this behind `Arc<RwLock<>>` and exposes a `reload_config` command.

### `extensions.rs` — Extension Discovery

Scans two locations for installed extensions:

1. **Local directory** — `~/.pi/agent/extensions/`
2. **Packages list** — packages declared in `settings.json` (supports `npm:`, local path, and `@scope/name` formats)

Returns `Vec<ExtensionInfo>` with id, name, version, description, and enabled status.

---

## Event Flow

```
User sends prompt
       │
       ▼
 Tauri command `send_prompt(session_id, prompt, channel)`
       │
       ▼
 MetaAgentsEngine::send_prompt() → Session::prompt()
       │
       ▼
 pi SDK AgentSessionHandle (in-process)
       │
       ├── on_event     ──→ CoworkEvent (MessageStart/Update/End)
       ├── on_tool_start ──→ CoworkEvent (ToolExecutionStart)
       ├── on_tool_end   ──→ CoworkEvent (ToolExecutionEnd)
       └── completion    ──→ CoworkEvent (AgentEnd, Done)
       │
       ▼ (mpsc channel)
 Tauri IPC Channel → React `usePiStream` hook
       │
       ▼
 useReducer (stream reducer) → UI render
```

---

## Tauri Integration (Thin Layer)

The Tauri backend (`src-tauri/src/lib.rs`) is a thin command handler (~150 LOC) that delegates to the engine:

- `AppState` holds `Arc<MetaAgentsEngine>` + `Arc<RwLock<ConfigSnapshot>>`
- Each `#[tauri::command]` maps 1:1 to an engine method or config operation
- Event streaming uses Tauri's `ipc::Channel<CoworkEvent>` for zero-copy serialization

---

## Design Decisions

| Decision | Rationale |
|----------|-----------|
| Engine is workspace crate, not published | YAGNI — publish when multiple consumers exist |
| `CoworkEvent` mirrors frontend types exactly | Avoids a translation layer in the React app |
| Config cached in Tauri, reloaded on demand | Settings files rarely change; avoids disk I/O on every command |
| Session uses `Arc<Mutex<>>` for handle sharing | SDK handle isn't `Sync`; Mutex is simplest safe wrapper |
| `pi_agent_rust` pinned to commit SHA | Prevents upstream breakage from surprise changes |

---

## Testing

- **Unit tests** — engine lifecycle (create/drop/list), config parsing, extension discovery
- **Smoke tests** — real SDK session creation + prompt round-trip
- **Total:** 47 Rust tests across the workspace

Run: `cargo test --workspace`
