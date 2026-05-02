# MetaAgents Upgrade Plan — zosma-cowork

**Date:** 2026-04-30
**Status:** Complete (v0.2.0)
**Companion to:** [`metaagents/docs/plans/2026-04-30-metaagents-vision-phase1.md`](../../metaagents/docs/plans/2026-04-30-metaagents-vision-phase1.md)

> **Goal:** Upgrade the existing `pi-cowork` (now `zosma-cowork`) project to match the MetaAgents vision — replacing the `pi --mode json` subprocess with the in-process `pi_agent_rust` SDK, introducing a clean `metaagents` engine layer, and preparing the codebase for the Zosma Cowork product line.
>
> **Constraint:** App must remain functional at every step. No long broken-state periods.

---

## 1. Why Upgrade Instead of Rewrite

### Keep
- ✅ **React frontend** — `useReducer` stream handling is correct, tool call timeline works, sessions persist, three-panel layout is good. Estimated 80% of frontend code stays.
- ✅ **Tauri v2 shell** — already configured with plugins (`fs`, `notification`, `shell`, `log`). Working CI for builds.
- ✅ **Type system** — `pi-events.ts` covers the full pi event taxonomy. The `ChatMessage` / `ToolCallInfo` types match what we need.
- ✅ **Theme + components** — Tailwind v4, Radix UI tooltips, custom warm cream/dark theme.

### Replace
- 🔄 **Rust backend** — currently 200 LOC of subprocess management. Replace with in-process `pi_agent_rust` SDK + a new `metaagents` engine library.
- 🔄 **Process model** — `pi --mode json --print` (one-shot per prompt) → persistent `AgentSessionHandle` (multi-turn, steerable).

### Add
- ➕ **`metaagents/` Rust library** — engine wrapping the SDK
- ➕ **Extension management UI** — list/toggle/install pi extensions from the GUI
- ➕ **Model selector** — dropdown in composer to switch providers/models
- ➕ **Configuration bridge** — read/write pi's `~/.pi/agent/settings.json` from the GUI

### Defer (Out of Scope for This Upgrade)
- ❌ Custom extension registry (Phase 3)
- ❌ Custom model router (Phase 3)
- ❌ Task scheduler UI (Phase 2)
- ❌ Cowork Apps with declarative manifests (Phase 2)
- ❌ Voice input (Phase 2)
- ❌ Repo rename (do at end of upgrade)

---

## 2. Target Architecture (Post-Upgrade)

```
zosma-cowork/                             # repo root
├── metaagents/                           # 🆕 Rust engine library
│   ├── Cargo.toml                        # depends on pi_agent_rust
│   └── src/
│       ├── lib.rs                        # public API
│       ├── engine.rs                     # MetaAgentsEngine struct
│       ├── session.rs                    # Session manager (wraps AgentSessionHandle)
│       ├── config.rs                     # Reads pi settings, manages providers
│       ├── extensions.rs                 # Discovers ~/.pi/agent/extensions/
│       └── events.rs                     # Event types for IPC (matches frontend)
├── src-tauri/                            # ✏️ Tauri binary (now thin)
│   ├── Cargo.toml                        # adds: metaagents = { path = "../metaagents" }
│   └── src/
│       ├── main.rs
│       └── lib.rs                        # Tauri commands → call into metaagents
├── src/                                  # ✅ React frontend (mostly unchanged)
│   ├── chat/
│   ├── components/
│   ├── settings/                         # ✏️ extended with extensions/models UI
│   ├── sidebar/
│   ├── hooks/
│   │   ├── usePiStream.ts                # ✅ unchanged (events stay typed the same)
│   │   ├── useSessions.ts                # ✅ unchanged
│   │   ├── useExtensions.ts              # 🆕 new hook
│   │   └── useProviders.ts               # 🆕 new hook
│   └── ...
├── docs/
│   ├── 2026-04-30-metaagents-upgrade-plan.md   # this file
│   └── ...
├── Cargo.toml                            # 🆕 workspace root
└── ...
```

### Key Architectural Properties

| Property | Before | After |
|----------|--------|-------|
| Agent lifetime | Per-prompt subprocess | Persistent in-process session |
| Session continuity | None (each prompt is fresh) | Full (history, steering, follow-up) |
| Tool call streaming | stdout JSON parsing | Direct Rust callbacks |
| Process count | N + 1 (Tauri + N pi processes) | 1 (Tauri only) |
| Startup latency | ~100ms per prompt (npm spawn) | <1ms (function call) |
| Compatibility with pi extensions | Yes (pi handles them) | Yes (via QuickJS in pi_agent_rust) |

---

## 3. Build Order — Step by Step

The plan is organized in 6 phases. Each phase ends with a fully working app.

---

### Phase A: Workspace Scaffold (1 day)

**Goal:** Convert the project into a Cargo workspace. No behavior changes yet.

| # | Task | File(s) |
|---|------|---------|
| A.1 | Create root `Cargo.toml` with `[workspace]` listing `metaagents` and `src-tauri` | `Cargo.toml` (new) |
| A.2 | Create empty `metaagents/` crate with stub `lib.rs` and `Cargo.toml` | `metaagents/` |
| A.3 | Add `metaagents = { path = "../metaagents" }` to `src-tauri/Cargo.toml` (unused for now) | `src-tauri/Cargo.toml` |
| A.4 | Verify `cargo build` works at root | — |
| A.5 | Verify `npm run dev` still works (full chat still functional via subprocess) | — |

**Checkpoint:** App still works exactly as before. Workspace is set up.

---

### Phase B: pi_agent_rust Integration (2-3 days)

**Goal:** Add `pi_agent_rust` as a dependency, get a "hello world" SDK call working alongside the existing subprocess.

| # | Task | File(s) |
|---|------|---------|
| B.1 | Add `pi = { git = "https://github.com/Dicklesworthstone/pi_agent_rust", branch = "main" }` (or vendor + path) to `metaagents/Cargo.toml`. Pin commit SHA for reproducibility. | `metaagents/Cargo.toml` |
| B.2 | Write `metaagents/src/lib.rs` with `pub use pi_agent_rust as pi;` and a smoke test | `metaagents/src/lib.rs` |
| B.3 | Add a `cargo test` that creates a session, sends a prompt, asserts a response. Mock or use real provider via env var. | `metaagents/tests/smoke.rs` |
| B.4 | Resolve any build errors (likely: native deps, rustc version, feature flags) | — |
| B.5 | Document required env vars for tests in README | `README.md` |

**Checkpoint:** Cargo test passes. SDK works in isolation.

**Risk to watch:**
- pi_agent_rust may have heavy dependencies (QuickJS native build). Make sure CI runners have required tools.
- Pin to a known-good commit. We don't want upstream breakage to break our build.

---

### Phase C: MetaAgents Engine Skeleton (3 days)

**Goal:** Build the engine API that Tauri will call. Still no UI changes.

#### C.1 — `metaagents/src/session.rs`
```rust
use pi::sdk::{AgentSessionHandle, SessionOptions, EventListeners};
use std::sync::Arc;
use tokio::sync::Mutex;

pub struct SessionId(pub String);

pub struct Session {
    pub id: SessionId,
    handle: Arc<Mutex<AgentSessionHandle>>,
}

impl Session {
    pub async fn new(id: SessionId, opts: SessionOptions) -> Result<Self, EngineError> { ... }
    pub async fn prompt(&self, text: &str) -> Result<(), EngineError> { ... }
    pub async fn abort(&self) -> Result<(), EngineError> { ... }
    pub async fn messages(&self) -> Result<Vec<Message>, EngineError> { ... }
    pub async fn set_model(&self, model: &str) -> Result<(), EngineError> { ... }
}
```

#### C.2 — `metaagents/src/engine.rs`
```rust
pub struct MetaAgentsEngine {
    sessions: Arc<RwLock<HashMap<String, Arc<Session>>>>,
    config: Config,
}

impl MetaAgentsEngine {
    pub fn new(config: Config) -> Self { ... }
    pub async fn create_session(&self, id: String, listeners: EventListeners) -> Result<Arc<Session>, EngineError>;
    pub async fn get_session(&self, id: &str) -> Option<Arc<Session>>;
    pub async fn drop_session(&self, id: &str) -> bool;
    pub fn list_extensions(&self) -> Result<Vec<ExtensionInfo>, EngineError>;
    pub fn list_providers(&self) -> Result<Vec<ProviderInfo>, EngineError>;
}
```

#### C.3 — `metaagents/src/events.rs`
Define a stable, serializable event type that mirrors the existing `PiEvent` types in `src/types/pi-events.ts`. The frontend already speaks this language.

```rust
#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(tag = "type", rename_all = "snake_case")]
pub enum CoworkEvent {
    MessageStart { message: AgentMessage },
    MessageUpdate { message: AgentMessage, assistant_message_event: AssistantMessageEvent },
    MessageEnd { message: AgentMessage },
    ToolExecutionStart { tool_call_id: String, tool_name: String, args: serde_json::Value },
    ToolExecutionUpdate { tool_call_id: String, tool_name: String, partial_result: ToolResult },
    ToolExecutionEnd { tool_call_id: String, tool_name: String, result: ToolResult, is_error: bool },
    AgentEnd,
    Done,
    Error { message: String },
}
```

#### C.4 — Bridge SDK callbacks → CoworkEvent

In `Session::new`, wire up `EventListeners::on_event`, `on_tool_start`, `on_tool_end`, `on_stream_event` to translate the pi SDK's native events into `CoworkEvent`. Caller provides a sender (`tokio::sync::mpsc::UnboundedSender<CoworkEvent>`).

#### C.5 — `metaagents/src/config.rs`

Read `~/.pi/agent/settings.json` to extract:
- Configured providers (OpenAI, Anthropic, Z.ai, etc.)
- Active model per provider
- API keys (paths only, never read the key value into the engine; pi reads it itself)

#### C.6 — `metaagents/src/extensions.rs`

Scan `~/.pi/agent/extensions/` and parse extension metadata. Return:
```rust
pub struct ExtensionInfo {
    pub id: String,
    pub name: String,
    pub version: String,
    pub description: String,
    pub enabled: bool,
}
```

**Checkpoint:** `cargo test --workspace` passes. Engine can create sessions, send prompts, receive events. Still no UI changes.

---

### Phase D: Tauri Backend Migration (2-3 days)

**Goal:** Replace `run_pi_stream` (subprocess) with engine-based handlers. Preserve the Tauri command names so the frontend works unchanged.

#### D.1 — Rewire `src-tauri/src/lib.rs`

Add `metaagents` import:
```rust
use metaagents::{MetaAgentsEngine, CoworkEvent, SessionOptions};

struct AppState {
    engine: Arc<MetaAgentsEngine>,
}
```

Replace `AppState::default()` with `AppState { engine: Arc::new(MetaAgentsEngine::new(...)) }`.

#### D.2 — New Tauri command: `create_session`

```rust
#[tauri::command]
async fn create_session(
    session_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state.engine.create_session(session_id, default_listeners()).await
        .map_err(|e| e.to_string())?;
    Ok(())
}
```

#### D.3 — Replace `run_pi_stream` with `send_prompt`

Old signature: `args: Vec<String>, channel, state` → spawns `pi` subprocess.

New signature:
```rust
#[tauri::command]
async fn send_prompt(
    session_id: String,
    prompt: String,
    channel: tauri::ipc::Channel<CoworkEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let session = state.engine.get_session(&session_id).await
        .ok_or("Session not found")?;
    let (tx, mut rx) = tokio::sync::mpsc::unbounded_channel();
    session.set_event_sink(tx);
    let prompt_handle = tokio::spawn(async move {
        session.prompt(&prompt).await
    });
    while let Some(evt) = rx.recv().await {
        let _ = channel.send(evt);
    }
    prompt_handle.await.map_err(|e| e.to_string())??;
    Ok(())
}
```

#### D.4 — Replace `abort_pi` with `abort_session`

```rust
#[tauri::command]
async fn abort_session(
    session_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    if let Some(session) = state.engine.get_session(&session_id).await {
        session.abort().await.map_err(|e| e.to_string())?;
        Ok(true)
    } else { Ok(false) }
}
```

#### D.5 — Add new commands

| Command | Purpose |
|---------|---------|
| `list_extensions` | Returns `Vec<ExtensionInfo>` from engine |
| `set_extension_enabled` | Toggle extension on/off via pi settings |
| `list_providers` | Returns configured providers + active models |
| `set_active_model` | Change model for a session |
| `delete_session` | Drop session from engine + delete persistence |

#### D.6 — Keep `check_pi_status` and `install_pi`

These are useful for the welcome flow when pi is not installed. They check for the `pi` CLI which is still our reference for extensions/skills paths. (Future: replace with engine-internal initialization once pi_agent_rust handles its own init.)

**Checkpoint:** Run the app. Send a prompt. Verify:
- Streaming text appears the same as before
- Tool calls fire correctly
- Abort works
- Multi-turn conversation works (this is NEW — wasn't possible before)
- `cargo clippy --workspace -- -D warnings` clean
- No `pi` subprocess spawned (verify via `ps`)

---

### Phase E: Frontend Updates (3-4 days)

**Goal:** Use the new commands, add extension/model UI.

#### E.1 — Update `usePiStream.ts` to use new commands

Replace:
```ts
await invoke("run_pi_stream", { args: [prompt], channel });
```
With:
```ts
// Create session lazily
if (!sessionId) {
    sessionId = crypto.randomUUID();
    await invoke("create_session", { sessionId });
}
await invoke("send_prompt", { sessionId, prompt, channel });
```

The reducer logic stays the same — events arrive identically (same Tauri channel + same event shapes).

#### E.2 — Update `abortStream`
```ts
await invoke("abort_session", { sessionId });
```

#### E.3 — New hook: `useExtensions.ts`
```ts
export function useExtensions() {
    const [extensions, setExtensions] = useState<ExtensionInfo[]>([]);
    const refresh = useCallback(async () => {
        const list = await invoke<ExtensionInfo[]>("list_extensions");
        setExtensions(list);
    }, []);
    const toggle = useCallback(async (id: string, enabled: boolean) => {
        await invoke("set_extension_enabled", { id, enabled });
        await refresh();
    }, [refresh]);
    useEffect(() => { refresh(); }, [refresh]);
    return { extensions, toggle, refresh };
}
```

#### E.4 — New hook: `useProviders.ts`
Similar pattern for providers and active model.

#### E.5 — Extend `SettingsView.tsx`
Add three sections:
1. **Models** — list providers, show active model per provider, allow model switch
2. **Extensions** — list installed pi extensions with enable/disable toggles
3. **Appearance** — theme toggle (already exists — move here)

#### E.6 — Add model selector to composer
Tiny dropdown next to the send button. Defaults to active model. Persists per-session.

#### E.7 — Update session lifecycle in `App.tsx`
When a new session is created in the GUI, call `invoke("create_session", { sessionId })`. When deleted, call `invoke("delete_session", { sessionId })`.

**Checkpoint:**
- App fully functional
- Extension list renders
- Toggling extension actually enables/disables it (verify by adding/removing from prompt context)
- Model selector switches model
- All Vitest tests pass: `npm run validate`

---

### Phase F: Polish & Rebrand Prep (1-2 days)

**Goal:** Clean up loose ends, prepare for repo rename.

| # | Task |
|---|------|
| F.1 | Update README with new architecture diagram |
| F.2 | Add architecture doc: `docs/architecture/metaagents-engine.md` |
| F.3 | Bump version to `0.2.0` (since it's a real backend rewrite) |
| F.4 | Migrate sessions storage location (optional): if moving `~/.pi/cowork/` → `~/.metaagents/`, write a one-time migration on app start |
| F.5 | Update `package.json` `name` field to `metaagents-cowork` | ✅ |
| F.6 | Update all internal imports/path references that say "pi-cowork" | ✅ |
| F.7 | Tag release `v0.2.0` and verify CI builds artifacts on all 3 platforms | ✅ |
| F.8 | Rename repo from `zosmaai/pi-cowork` → `zosmaai/zosma-cowork` | ⬅️ This task |

**Repo rename (do at end):**
- GitHub repo: `zosmaai/pi-cowork` → `zosmaai/zosma-cowork` (rename complete)
- Product name: Zosma Cowork
- Engine name: metaagents

---

## 4. Detailed Migration Mapping

### 4.1 Tauri Command Map

| Old | New | Notes |
|-----|-----|-------|
| `run_pi_stream(args, channel, state)` | `send_prompt(session_id, prompt, channel, state)` | Need to create session first |
| `abort_pi(state)` | `abort_session(session_id, state)` | Per-session abort |
| `run_pi_command(args)` | _Removed_ | Was unused or rare; if needed, expose engine `exec` |
| `check_pi_status` | _Keep_ | Still useful for welcome screen |
| `install_pi` | _Keep_ | Still useful for welcome screen |
| _New_ | `create_session(session_id)` | Explicit session lifecycle |
| _New_ | `delete_session(session_id)` | Explicit cleanup |
| _New_ | `list_extensions()` | Surface pi extensions in GUI |
| _New_ | `set_extension_enabled(id, enabled)` | Toggle |
| _New_ | `list_providers()` | Surface configured providers |
| _New_ | `set_active_model(session_id, model)` | Per-session model |

### 4.2 Frontend File Changes

| File | Change |
|------|--------|
| `src/hooks/usePiStream.ts` | Update `invoke` calls (~10 lines changed). Reducer logic unchanged. |
| `src/hooks/useSessions.ts` | Add `invoke("create_session")` / `invoke("delete_session")` calls |
| `src/hooks/useExtensions.ts` | 🆕 new file (~30 lines) |
| `src/hooks/useProviders.ts` | 🆕 new file (~30 lines) |
| `src/settings/SettingsView.tsx` | Extended with Extensions and Models sections |
| `src/components/MessageInput.tsx` | Add model selector dropdown next to send button |
| `src/types/index.ts` | Add `ExtensionInfo`, `ProviderInfo` types |
| `src/types/pi-events.ts` | Mostly unchanged — verify event shapes match `metaagents::events::CoworkEvent` |
| `src/App.tsx` | Wire `create_session` / `delete_session` calls |

**Estimated frontend churn:** ~300 lines added, ~50 lines changed. The bulk of the existing UI stays.

### 4.3 Rust Backend File Changes

| File | Change | Lines |
|------|--------|-------|
| `Cargo.toml` (root) | 🆕 workspace manifest | ~20 |
| `metaagents/Cargo.toml` | 🆕 | ~30 |
| `metaagents/src/lib.rs` | 🆕 | ~50 |
| `metaagents/src/engine.rs` | 🆕 | ~200 |
| `metaagents/src/session.rs` | 🆕 | ~250 |
| `metaagents/src/config.rs` | 🆕 | ~150 |
| `metaagents/src/extensions.rs` | 🆕 | ~120 |
| `metaagents/src/events.rs` | 🆕 | ~150 |
| `metaagents/tests/smoke.rs` | 🆕 | ~50 |
| `src-tauri/Cargo.toml` | Add `metaagents` path dep | +1 |
| `src-tauri/src/lib.rs` | Rewrite — drop subprocess code, delegate to engine | -150 / +100 |

**Estimated Rust churn:** ~1200 lines added (mostly the new engine), ~150 lines deleted from the Tauri backend.

---

## 5. Risk Register

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| `pi_agent_rust` build fails on contributor machines (native deps, OS-specific) | Medium | High | Pin commit, document required tooling, add CI matrix on Linux/macOS/Windows |
| Event shape drift — pi SDK events don't match what the React frontend expects | Medium | Medium | Phase C.3 builds `CoworkEvent` to match existing TypeScript types exactly. Add a "translation" layer if drift exists. |
| Breaking change in `pi_agent_rust` upstream | Medium | Medium | Pin to commit SHA, not branch. Vendor as a git submodule if needed. |
| Streaming throughput is worse in-process (unlikely but possible) | Low | Low | Profile before/after with a heavy tool-call workflow |
| Session persistence format changes between subprocess and SDK | Low | Medium | Keep the existing JSON event format. Engine writes `CoworkEvent`-shaped events that match the old format. |
| QuickJS extension runtime in pi_agent_rust has bugs that don't affect the pi CLI | Medium | Medium | Document known issues, allow falling back to subprocess mode if needed (escape hatch behind a feature flag) |
| Long-running session memory leak | Low | Medium | Add a session-drop / restart command in GUI |

---

## 6. Verification Checklist (per phase)

### Phase A
- [ ] `cargo build --workspace` succeeds
- [ ] `npm run dev` opens the app
- [ ] Sending a prompt still works (via existing subprocess code)

### Phase B
- [ ] `cargo test -p metaagents` passes
- [ ] Smoke test creates a session, sends a real prompt, receives a response

### Phase C
- [ ] Engine unit tests pass
- [ ] Multi-session test passes (create 3 sessions, send prompts, no cross-talk)
- [ ] Extensions discovered correctly (compare to `pi extensions` CLI output)

### Phase D
- [ ] `npm run dev` works
- [ ] Send a prompt → streaming works
- [ ] Tool calls render correctly
- [ ] Abort works
- [ ] Multi-turn conversation works (NEW capability)
- [ ] No `pi` subprocesses in `ps`

### Phase E
- [ ] `npm run validate` passes (lint + typecheck + tests)
- [ ] Extension list visible and toggle works
- [ ] Model selector switches model mid-conversation
- [ ] Session creation/deletion calls hit the backend

### Phase F
- [ ] CI builds .dmg, .msi, .AppImage successfully
- [ ] Tagged `v0.2.0` release published
- [ ] README, architecture docs updated
- [ ] Demo video / GIF recorded

---

## 7. Timeline Estimate

| Phase | Effort (solo) | Cumulative |
|-------|---------------|------------|
| A — Workspace scaffold | 1 day | 1 day |
| B — pi_agent_rust integration | 2-3 days | 3-4 days |
| C — Engine skeleton | 3 days | 6-7 days |
| D — Tauri backend migration | 2-3 days | 8-10 days |
| E — Frontend updates | 3-4 days | 11-14 days |
| F — Polish & rebrand prep | 1-2 days | 12-16 days |

**Total: ~2.5 to 3 weeks for a solo developer working full-time.**
**~1.5 weeks with a 2-person team (one Rust, one frontend).**

---

## 8. Decision Log (Pre-Build)

### D-1: Vendor pi_agent_rust or use git dependency?
**Decision:** Git dependency pinned to commit SHA. Vendor (git submodule or `cargo vendor`) only if upstream becomes unstable.
**Rationale:** Easier to upgrade, less repo bloat. SHA pin prevents surprises.

### D-2: Keep `~/.pi/cowork/` or move to `~/.metaagents/`?
**Decision:** Keep `~/.pi/cowork/` for Phase F upgrade. Add a migration path (one-time copy on first launch with the new schema) when we rebrand.
**Rationale:** Don't break existing users mid-upgrade. Migrate at the rebrand boundary.

### D-3: Should the engine be its own crate (publishable) or just a workspace member?
**Decision:** Workspace member only for now. Make it publishable later when other consumers (Zosma Code, third-party UIs) need it.
**Rationale:** YAGNI. Crate publishing has its own ceremony — defer until needed.

### D-4: Keep `check_pi_status` and `install_pi` commands?
**Decision:** Keep them. Even with in-process SDK, the `pi` CLI is still useful for: (1) diagnostics (welcome screen verifying installation), (2) running `pi install` for extension management.
**Rationale:** Pragmatic — these are auxiliary commands, not the hot path.

### D-5: Is "MetaAgents" the engine name in code, or is it just branding?
**Decision:** Code uses `metaagents` (lowercase, snake_case in Rust). Crates.io name (when published) will be `metaagents`. Brand uses "MetaAgents" in marketing.
**Rationale:** Lowercase matches Rust conventions and matches the user's preference ("metaagents (no caps etc.. all small)").

---

## 9. What's Different About v0.2.0 Users

After the upgrade, users will notice:

| Aspect | Before (v0.1.x) | After (v0.2.0) |
|--------|-----------------|----------------|
| Multi-turn conversation | ❌ each prompt is fresh | ✅ full session continuity |
| Steering / interrupts | ❌ kill the process | ✅ proper steering API |
| Startup latency per prompt | ~100-300ms (npm spawn) | ~1ms (function call) |
| Extension visibility | ❌ have to know the CLI | ✅ list in settings |
| Model switching | ❌ edit JSON config | ✅ dropdown in UI |
| Process count | 1 + N child pi processes | 1 only |

**This is the upgrade that makes Zosma Cowork worth recommending over the pi CLI for non-developers.**

---

## 10. Next Steps After This Upgrade

After v0.2.0 ships, the natural follow-ons (per the [vision doc](../../metaagents/docs/plans/2026-04-30-metaagents-vision-phase1.md)):

1. **Phase 2:** Cowork Apps (declarative manifests + auto-generated config panels) + task scheduling UI
2. **Phase 3:** Curated app registry + custom extension system
3. **Phase 4:** Zosma Code (swap React frontend for Monaco + terminal, reuse the engine)

The upgrade described in this document is the **foundation for all of those.**

---

*This is a living plan. Update as decisions are made and constraints surface.*
