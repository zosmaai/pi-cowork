# Zosma Cowork Telemetry — Spec & Architecture

**Status:** Draft v1 | **Visibility:** Closed Source  
**Target:** Post-launch (Phase 4.4 in MVP roadmap)

---

## Problem Statement

Anyone can download Zosma Cowork and start using it. Without telemetry, we're flying blind:
- We don't know how many people are using the app
- We don't know which features get used
- We don't know what's broken until someone files an issue
- We can't prioritize features based on actual usage

## Design Principles

1. **Opt-in only** — users explicitly consent on first launch, can toggle off anytime
2. **No PII** — no emails, no names, no file paths, no prompt content
3. **Minimal payload** — small JSON events, batched to reduce network overhead
4. **Closed-source backend** — the service itself is proprietary; the client-side SDK is open-source
5. **Self-hosted** — we own the infrastructure and data

## What We Track

### Events (Anonymous)

| Event | Properties | Purpose |
|-------|-----------|---------|
| `app_launch` | version, os, os_version, architecture | MAU, version distribution |
| `session_created` | version, model_provider, model_name | Model popularity |
| `message_sent` | version, has_attachments, has_mentions | Engagement depth |
| `stream_complete` | version, duration_ms, tokens_approx | Performance signals |
| `stream_error` | version, error_type, error_message | Error rates by type |
| `feature_used` | version, feature_name (e.g., "voice_input", "file_attach") | Feature adoption |
| `settings_changed` | version, setting_key (e.g., "telemetry_enabled", "theme") | Config changes |

### Crash Reports (Opt-in)

| Property | Value |
|----------|-------|
| app_version | "0.2.0" |
| os | "darwin" / "linux" / "windows" |
| os_version | "15.4" |
| stack_trace | Rust panic or JS unhandled error |
| timestamp | ISO 8601 |

### What We Explicitly Do NOT Track

- Prompt content or responses
- File names or paths
- User identity (no email, no name)
- API keys or auth tokens
- Network traffic to LLM providers
- Clipboard contents
- Screenshot data

## Architecture

```
┌──────────────────────────┐
│   Zosma Cowork Desktop   │
│                          │
│  TelemetryClient (Rust)  │  ← Tauri command, batches events
│  - In-memory queue       │  ← max 50 events, flush on interval/shutdown
│  - Opt-in check          │  ← reads settings.json
│  - UUID generation       │  ← anonymous device ID (stored locally)
│                          │
│  POST /api/v1/events     │  → https://telemetry.zosma.ai/api/v1/events
└──────────┬───────────────┘
           │ HTTPS
           ▼
┌──────────────────────────┐
│   Telemetry Service      │  ← Closed source, self-hosted on GKE
│                          │
│  Hono (Fastify) API      │
│  /api/v1/events  POST    │  ← Accepts batch of events
│  /api/v1/crash  POST     │  ← Crash reports
│  /health         GET     │  ← Health check
│                          │
│  SQLite (single file)    │  ← Simple storage, no DB admin overhead
│  - events table          │
│  - crashes table         │
│  - devices table (UUIDs) │
│                          │
│  Admin Dashboard (basic) │  ← Password-protected web UI
│  /admin/dashboard        │  ← MAU, events, errors
└──────────────────────────┘
```

## Client-Side Implementation (Cowork App)

### Storage (`~/.zosmaai/cowork/settings.json`)

```json
{
  "telemetry": {
    "enabled": true,
    "device_id": "anon_abc123def456"
  }
}
```

- `device_id`: Generated once on first launch (random UUID v4)
- `enabled`: Defaults to `false` — user must explicitly opt-in

### Opt-In Flow

On first launch (or when telemetry is not configured):

```
┌─────────────────────────────────────────────┐
│  Help us improve Zosma Cowork?              │
│                                             │
│  Share anonymous usage data so we can       │
│  prioritize features and fix bugs.          │
│  No personal data, no prompt content.       │
│  You can change this anytime in Settings.   │
│                                             │
│              [Share Data]  [Not Now]        │
└─────────────────────────────────────────────┘
```

### Rust Tauri Command (`src-tauri/src/telemetry.rs`)

```rust
#[tauri::command]
async fn send_telemetry_event(
    app: tauri::AppHandle,
    event_type: String,
    properties: serde_json::Value,
) -> Result<(), String> {
    let settings = load_settings();
    if !settings.telemetry.enabled {
        return Ok(()); // silently skip
    }

    let payload = TelemetryBatch {
        device_id: settings.telemetry.device_id,
        events: vec![TelemetryEvent {
            event_type,
            properties,
            timestamp: Utc::now(),
            app_version: env!("CARGO_PKG_VERSION").to_string(),
            os: std::env::consts::OS.to_string(),
        }],
    };

    // Batch in memory, flush every 30s or on shutdown
    app.state::<TelemetryQueue>().push(payload);
    Ok(())
}
```

### Event Emission Points (Frontend)

| Location | Event | When |
|----------|-------|------|
| `App.tsx` mount | `app_launch` | On app start |
| Session creation | `session_created` | New session button clicked |
| Message send | `message_sent` | User sends a message |
| Stream end | `stream_complete` | Agent response complete |
| Stream error | `stream_error` | Stream fails |
| Settings toggle | `settings_changed` | Telemetry setting changed |

## Server-Side Implementation (Telemetry Service)

### Tech Stack

| Component | Choice | Why |
|-----------|--------|-----|
| Runtime | Node.js 22 LTS | Consistent with metaservice |
| Framework | Hono | Lightweight, fast, TypeScript-native |
| Storage | SQLite (better-sqlite3) | Zero ops overhead, single file |
| Deployment | Docker + GKE | Matches existing infra |
| Dashboard | Basic HTML/CSS (no framework) | Minimal admin UI |

### Project Structure

```
zosma-telemetry/          # Closed-source repo (SensaLab org)
├── src/
│   ├── index.ts          # Main server entry
│   ├── routes/
│   │   ├── events.ts     # POST /api/v1/events
│   │   └── crashes.ts    # POST /api/v1/crash
│   ├── db/
│   │   ├── schema.sql    # Table definitions
│   │   └── queries.ts    # Parameterized queries
│   ├── middleware/
│   │   └── admin-auth.ts # Basic auth for /admin/*
│   └── dashboard/        # Static files for admin UI
│       └── index.html
├── package.json
├── Dockerfile
├── docker-compose.yml    # Local dev
└── README.md
```

### Database Schema

```sql
-- Devices (anonymous)
CREATE TABLE devices (
    device_id TEXT PRIMARY KEY,
    first_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    last_seen_at TEXT NOT NULL DEFAULT (datetime('now')),
    os TEXT,
    os_version TEXT,
    app_version TEXT
);

-- Events
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL REFERENCES devices(device_id),
    event_type TEXT NOT NULL,
    properties TEXT DEFAULT '{}',  -- JSON blob
    timestamp TEXT NOT NULL,
    app_version TEXT,
    os TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Crashes
CREATE TABLE crashes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL REFERENCES devices(device_id),
    stack_trace TEXT,
    error_type TEXT,
    app_version TEXT,
    os TEXT,
    os_version TEXT,
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Indexes for common queries
CREATE INDEX idx_events_device ON events(device_id);
CREATE INDEX idx_events_type ON events(event_type);
CREATE INDEX idx_events_timestamp ON events(timestamp);
CREATE INDEX idx_crashes_timestamp ON crashes(timestamp);
```

### API Endpoints

#### POST /api/v1/events

Accepts a batch of events:

```json
{
  "device_id": "anon_abc123",
  "events": [
    {
      "event_type": "app_launch",
      "properties": {},
      "timestamp": "2026-05-02T18:00:00Z"
    },
    {
      "event_type": "session_created",
      "properties": { "model_provider": "anthropic", "model_name": "claude-sonnet-4-20250514" },
      "timestamp": "2026-05-02T18:01:00Z"
    }
  ]
}
```

Response: `{"ok": true, "received": 2}`

#### POST /api/v1/crash

```json
{
  "device_id": "anon_abc123",
  "stack_trace": "...",
  "error_type": "rust_panic",
  "app_version": "0.2.0",
  "os": "darwin",
  "timestamp": "2026-05-02T18:05:00Z"
}
```

Response: `{"ok": true}`

#### GET /admin/dashboard

Password-protected HTML dashboard showing:
- Active devices (last 30 days)
- Events by type (bar chart)
- Error rate trend
- Top models used
- Recent crashes

## Bug Reporting Flow

### In-App "Report a Bug" Button

Located in Settings sidebar:

```
┌─────────────────────────────────────────────┐
│  Report a Bug                               │
│                                             │
│  Describe what went wrong:                  │
│  ┌───────────────────────────────────────┐  │
│  │                                       │  │
│  │                                       │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ☑ Include anonymized logs (last 100 lines) │
│                                             │
│  [Submit via GitHub]  [Copy to Clipboard]   │
└─────────────────────────────────────────────┘
```

### Submission Options

1. **GitHub Issue** — Opens browser with pre-filled issue template + logs as gist
2. **Clipboard** — Copies formatted bug report for manual posting

### Bug Report Format

```markdown
## Bug Report

**App Version:** 0.2.0  
**OS:** macOS 15.4  
**Date:** 2026-05-02

### Description
<User's description>

### Steps to Reproduce
1. ...
2. ...

### Expected Behavior
...

### Actual Behavior
...

### Logs
<Anonymized last 100 lines of app log>
```

## Deployment

### Dockerfile

```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package.json pnpm-lock.yaml ./
RUN corepack enable && pnpm install --frozen-lockfile
COPY src/ ./src/
EXPOSE 3000
CMD ["pnpm", "start"]
```

### Environment Variables

| Variable | Required | Default | Purpose |
|----------|----------|---------|---------|
| `PORT` | No | 3000 | HTTP port |
| `DB_PATH` | No | /data/telemetry.db | SQLite file path |
| `ADMIN_PASSWORD` | Yes | — | Dashboard password (bcrypt hash) |
| `MAX_BATCH_SIZE` | No | 100 | Max events per request |

### GKE Deployment (Phase 4.5)

- Single deployment, 1 replica (low traffic expected initially)
- PersistentVolume for SQLite data
- Ingress with TLS via cert-manager
- Horizontal pod autoscaler: min 1, max 3

## Phased Rollout

| Phase | Timeline | Scope |
|-------|----------|-------|
| **Phase A** | Post-launch | Client-side SDK in Cowork app (opt-in dialog, event queue, batching) |
| **Phase B** | Week 2 | Telemetry service MVP (Hono + SQLite, events endpoint, basic dashboard) |
| **Phase C** | Week 3 | Crash reporting integration + bug report flow in Cowork |
| **Phase D** | Week 4 | Dashboard improvements (charts, retention, model popularity) |

## Privacy & Legal

- No GDPR cookie banner needed (no cookies, no PII)
- Include telemetry section in privacy policy
- Data retention: 1 year (auto-purge old events)
- User can request data deletion via settings (local device_id reset)

---

*This document is a living artifact. Update as decisions are made.*
