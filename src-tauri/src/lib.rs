//! Tauri backend for pi-cowork (Phase D: engine-backed).
//!
//! This module wires the `metaagents` engine into Tauri commands. The engine
//! replaces the old subprocess approach (`pi --mode json`) with in-process
//! SDK sessions, giving us multi-turn conversations, steering, and <1ms
//! prompt latency.

use std::sync::Arc;

use metaagents::config::{self, ConfigSnapshot, ModelInfo, ProviderInfo};
use metaagents::engine::MetaAgentsEngine;
use metaagents::events::CoworkEvent;
use metaagents::extensions::ExtensionInfo;
use serde::{Deserialize, Serialize};

// ---------------------------------------------------------------------------
// Types shared with the frontend
// ---------------------------------------------------------------------------

/// Pi CLI installation status (for the welcome screen).
#[derive(Serialize)]
struct PiStatus {
    installed: bool,
    version: Option<String>,
    path: Option<String>,
}

/// Result of creating a new session.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct CreateSessionResult {
    session_id: String,
}

/// Payload for `set_active_model`.
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct SetModelPayload {
    session_id: String,
    provider: String,
    model_id: String,
}

/// Full config snapshot for the frontend settings panel.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ConfigPayload {
    default_provider: Option<String>,
    default_model: Option<String>,
    providers: Vec<ProviderInfo>,
    models: Vec<ModelInfo>,
}

// ---------------------------------------------------------------------------
// App state
// ---------------------------------------------------------------------------

/// Global state shared across all Tauri commands.
///
/// Holds the engine (session manager) and a cached config snapshot.
struct AppState {
    engine: Arc<MetaAgentsEngine>,
    config: Arc<std::sync::RwLock<ConfigSnapshot>>,
}

// ---------------------------------------------------------------------------
// Commands — session lifecycle
// ---------------------------------------------------------------------------

/// Create a new agent session. Returns the session ID.
#[tauri::command]
async fn create_session(
    session_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<CreateSessionResult, String> {
    state
        .engine
        .create_default_session(session_id.clone())
        .await
        .map_err(|e| e.to_string())?;

    Ok(CreateSessionResult { session_id })
}

/// Create a session with a specific provider/model.
#[tauri::command]
async fn create_session_with_model(
    session_id: String,
    provider: String,
    model: String,
    state: tauri::State<'_, AppState>,
) -> Result<CreateSessionResult, String> {
    state
        .engine
        .create_session_with_model(session_id.clone(), provider, model)
        .await
        .map_err(|e| e.to_string())?;

    Ok(CreateSessionResult { session_id })
}

/// Send a prompt to an existing session. Events stream through the Tauri channel.
#[tauri::command]
async fn send_prompt(
    session_id: String,
    prompt: String,
    channel: tauri::ipc::Channel<CoworkEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    let (mut event_rx, join_handle) = state
        .engine
        .send_prompt(session_id, prompt)
        .await
        .map_err(|e| e.to_string())?;

    // Forward engine events to the Tauri channel until the stream ends.
    while let Some(event) = event_rx.recv().await {
        if channel.send(event).is_err() {
            // Channel closed — frontend probably navigated away.
            break;
        }
    }

    // Check the final result for errors.
    join_handle
        .await
        .map_err(|e| format!("prompt task panicked: {e}"))?
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Abort the current prompt in a session.
#[tauri::command]
async fn abort_session(
    session_id: String,
    _state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    // TODO: Wire up abort via the engine once the SDK exposes it.
    // For now, return false to indicate no abort happened.
    let _ = session_id;
    Ok(false)
}

/// Delete a session from the engine.
#[tauri::command]
async fn delete_session(
    session_id: String,
    state: tauri::State<'_, AppState>,
) -> Result<bool, String> {
    Ok(state.engine.drop_session(&session_id).await)
}

/// List active session IDs from the engine.
#[tauri::command]
async fn list_engine_sessions(
    state: tauri::State<'_, AppState>,
) -> Result<Vec<String>, String> {
    Ok(state.engine.list_sessions().await)
}

// ---------------------------------------------------------------------------
// Commands — extensions & models
// ---------------------------------------------------------------------------

/// Discover installed extensions from pi's directories.
#[tauri::command]
async fn list_extensions() -> Result<Vec<ExtensionInfo>, String> {
    Ok(metaagents::extensions::discover_extensions())
}

/// List configured providers and models from pi's settings.
#[tauri::command]
async fn list_providers(state: tauri::State<'_, AppState>) -> Result<ConfigPayload, String> {
    let config = state.config.read().unwrap_or_else(|e| e.into_inner());
    let defaults = config::default_model(&config);
    Ok(ConfigPayload {
        default_provider: defaults.as_ref().map(|(p, _)| p.clone()),
        default_model: defaults.as_ref().map(|(_, m)| m.clone()),
        providers: config.providers.clone(),
        models: config.models.clone(),
    })
}

/// Change the active model for a session.
#[tauri::command]
async fn set_active_model(
    payload: SetModelPayload,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    state
        .engine
        .set_session_model(payload.session_id, payload.provider, payload.model_id)
        .await
        .map_err(|e| e.to_string())
}

/// Reload config from disk (call after settings change).
#[tauri::command]
async fn reload_config(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let fresh = config::load_config();
    let mut guard = state.config.write().unwrap_or_else(|e| e.into_inner());
    *guard = fresh;
    Ok(())
}

// ---------------------------------------------------------------------------
// Commands — pi CLI (welcome flow)
// ---------------------------------------------------------------------------

/// Check if the pi CLI is installed.
#[tauri::command]
async fn check_pi_status() -> Result<PiStatus, String> {
    let which_output = std::process::Command::new("which")
        .arg("pi")
        .output()
        .map_err(|e| format!("Failed to run which: {e}"))?;

    let path = if which_output.status.success() {
        Some(
            String::from_utf8_lossy(&which_output.stdout)
                .trim()
                .to_string(),
        )
    } else {
        None
    };

    let version = if path.is_some() {
        match std::process::Command::new("pi").arg("--version").output() {
            Ok(output) if output.status.success() => {
                Some(String::from_utf8_lossy(&output.stdout).trim().to_string())
            }
            _ => None,
        }
    } else {
        None
    };

    Ok(PiStatus {
        installed: path.is_some(),
        version,
        path,
    })
}

/// Install the pi CLI globally via npm.
#[tauri::command]
async fn install_pi() -> Result<String, String> {
    let output = std::process::Command::new("npm")
        .args(["install", "-g", "@mariozechner/pi-coding-agent"])
        .output()
        .map_err(|e| format!("Failed to run npm install: {e}"))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!(
            "npm install failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

/// Get engine banner for diagnostics / about dialog.
#[tauri::command]
fn engine_banner() -> String {
    metaagents::banner()
}

// ---------------------------------------------------------------------------
// App entry
// ---------------------------------------------------------------------------

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let engine = Arc::new(MetaAgentsEngine::new());
    let config = Arc::new(std::sync::RwLock::new(config::load_config()));

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState { engine, config })
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            // Session lifecycle
            create_session,
            create_session_with_model,
            send_prompt,
            abort_session,
            delete_session,
            list_engine_sessions,
            // Extensions & models
            list_extensions,
            list_providers,
            set_active_model,
            reload_config,
            // Pi CLI (welcome flow)
            check_pi_status,
            install_pi,
            // Diagnostics
            engine_banner,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
