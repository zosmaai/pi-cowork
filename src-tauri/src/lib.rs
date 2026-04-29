use serde::Serialize;
use std::sync::Arc;
use tokio::io::{AsyncBufReadExt, BufReader};
use tokio::process::{Child, Command};
use tokio::sync::Mutex;

#[derive(Serialize)]
struct PiStatus {
    installed: bool,
    version: Option<String>,
    path: Option<String>,
}

#[derive(Serialize, Clone, Debug)]
struct PiEvent {
    #[serde(flatten)]
    data: serde_json::Value,
}

#[derive(Default)]
struct AppState {
    running_child: Arc<Mutex<Option<Child>>>,
}

#[tauri::command]
async fn check_pi_status() -> Result<PiStatus, String> {
    let which_output = std::process::Command::new("which")
        .arg("pi")
        .output()
        .map_err(|e| format!("Failed to run which: {}", e))?;

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
                let v = String::from_utf8_lossy(&output.stdout).trim().to_string();
                Some(v)
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

#[tauri::command]
async fn install_pi() -> Result<String, String> {
    let output = std::process::Command::new("npm")
        .args(["install", "-g", "@mariozechner/pi-coding-agent"])
        .output()
        .map_err(|e| format!("Failed to run npm install: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!(
            "npm install failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

#[tauri::command]
async fn run_pi_command(args: Vec<String>) -> Result<String, String> {
    let output = std::process::Command::new("pi")
        .args(&args)
        .output()
        .map_err(|e| format!("Failed to run pi: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).to_string())
    } else {
        Err(format!(
            "pi command failed: {}",
            String::from_utf8_lossy(&output.stderr)
        ))
    }
}

#[tauri::command]
async fn run_pi_stream(
    args: Vec<String>,
    channel: tauri::ipc::Channel<PiEvent>,
    state: tauri::State<'_, AppState>,
) -> Result<(), String> {
    // Kill any existing child first
    {
        let mut guard = state.running_child.lock().await;
        if let Some(mut child) = guard.take() {
            let _ = child.kill().await;
            let _ = child.wait().await;
        }
    }

    let mut child = Command::new("pi")
        .args(&args)
        .arg("--mode")
        .arg("json")
        .arg("--print")
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn pi: {}", e))?;

    let stdout = child
        .stdout
        .take()
        .ok_or_else(|| "Failed to capture stdout".to_string())?;

    let stderr = child
        .stderr
        .take()
        .ok_or_else(|| "Failed to capture stderr".to_string())?;

    // Store the child so it can be aborted
    {
        let mut guard = state.running_child.lock().await;
        *guard = Some(child);
    }

    // Drain stderr in a background task to prevent pipe buffer deadlock.
    // If stderr fills its pipe buffer (64KB on Linux), the pi process
    // would block on write, causing a deadlock since we're also reading stdout.
    let stderr_reader = BufReader::new(stderr);
    let stderr_handle = tokio::spawn(async move {
        let mut stderr_lines = stderr_reader.lines();
        while let Ok(Some(line)) = stderr_lines.next_line().await {
            eprintln!("[cowork] pi stderr: {}", line);
        }
    });

    let reader = BufReader::new(stdout);
    let mut lines = reader.lines();

    while let Ok(Some(line_str)) = lines.next_line().await {
        if line_str.trim().is_empty() {
            continue;
        }
        match serde_json::from_str::<serde_json::Value>(&line_str) {
            Ok(value) => {
                let _ = channel.send(PiEvent { data: value });
            }
            Err(_) => {
                let _ = channel.send(PiEvent {
                    data: serde_json::json!({
                        "type": "log",
                        "level": "info",
                        "message": line_str
                    }),
                });
            }
        }
    }

    // Wait for process to finish and clear from state
    {
        let mut guard = state.running_child.lock().await;
        if let Some(mut child) = guard.take() {
            match child.wait().await {
                Ok(status) if !status.success() => {
                    let _ = channel.send(PiEvent {
                        data: serde_json::json!({
                            "type": "error",
                            "message": format!("pi exited with code: {:?}", status.code())
                        }),
                    });
                }
                Err(e) => {
                    let _ = channel.send(PiEvent {
                        data: serde_json::json!({
                            "type": "error",
                            "message": format!("Failed to wait for pi: {}", e)
                        }),
                    });
                }
                _ => {}
            }
        }
    }

    // Ensure stderr drain task completes
    let _ = stderr_handle.await;

    let _ = channel.send(PiEvent {
        data: serde_json::json!({ "type": "done" }),
    });

    Ok(())
}

#[tauri::command]
async fn abort_pi(state: tauri::State<'_, AppState>) -> Result<bool, String> {
    let mut guard = state.running_child.lock().await;
    if let Some(mut child) = guard.take() {
        match child.kill().await {
            Ok(_) => {
                let _ = child.wait().await;
                Ok(true)
            }
            Err(e) => Err(format!("Failed to kill pi process: {}", e)),
        }
    } else {
        Ok(false)
    }
}

#[tauri::command]
async fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to Pi Cowork.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_notification::init())
        .manage(AppState::default())
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
            greet,
            check_pi_status,
            install_pi,
            run_pi_command,
            run_pi_stream,
            abort_pi
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
