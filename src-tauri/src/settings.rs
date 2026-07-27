use serde::Serialize;
use serde_json::Value;
use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

use crate::binaries;

fn settings_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

/// Stored settings blob, or Null if none saved yet (frontend applies defaults).
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Value, String> {
    match fs::read(settings_file(&app)?) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        Err(_) => Ok(Value::Null),
    }
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(&settings).map_err(|e| e.to_string())?;
    fs::write(dir.join("settings.json"), bytes).map_err(|e| e.to_string())
}

/// The OS Videos folder — the sensible default output location.
#[tauri::command]
pub fn default_download_dir(app: AppHandle) -> Result<String, String> {
    app.path()
        .video_dir()
        .map(|p| p.to_string_lossy().into_owned())
        .map_err(|e| e.to_string())
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineVersions {
    yt_dlp: String,
    ffmpeg: String,
}

#[tauri::command]
pub async fn engine_versions(app: AppHandle) -> Result<EngineVersions, String> {
    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    let ffmpeg = binaries::resolve(&app, "ffmpeg");
    tauri::async_runtime::spawn_blocking(move || EngineVersions {
        yt_dlp: version_of(&yt_dlp, &["--version"], |s| {
            s.lines().next().unwrap_or("").trim().to_string()
        }),
        // "ffmpeg version 7.1 Copyright ..." → the 3rd token.
        ffmpeg: version_of(&ffmpeg, &["-version"], |s| {
            s.split_whitespace().nth(2).unwrap_or("unknown").to_string()
        }),
    })
    .await
    .map_err(|e| e.to_string())
}

fn version_of(bin: &Path, args: &[&str], parse: fn(&str) -> String) -> String {
    let mut cmd = Command::new(bin);
    cmd.args(args);
    binaries::prepare(&mut cmd);
    match cmd.output() {
        Ok(out) if out.status.success() => parse(&String::from_utf8_lossy(&out.stdout)),
        _ => "not found".to_string(),
    }
}
