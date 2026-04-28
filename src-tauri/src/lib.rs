use serde::Serialize;
use std::process::Command;
use tauri::Emitter;

#[derive(Serialize)]
struct PiStatus {
    installed: bool,
    version: Option<String>,
    path: Option<String>,
}

#[tauri::command]
async fn check_pi_status() -> Result<PiStatus, String> {
    // Check if pi is in PATH
    let which_output = Command::new("which")
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

    // Check version if installed
    let version = if path.is_some() {
        match Command::new("pi").arg("--version").output() {
            Ok(output) if output.status.success() => {
                let v = String::from_utf8_lossy(&output.stdout)
                    .trim()
                    .to_string();
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
    // Try npm install -g pi-coding-agent
    let output = Command::new("npm")
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
    let output = Command::new("pi")
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
async fn greet(name: String) -> String {
    format!("Hello, {}! Welcome to Pi Cowork.", name)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_notification::init())
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
            run_pi_command
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
