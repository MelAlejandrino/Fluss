use serde::Serialize;
use serde_json::Value;
use std::path::{Path, PathBuf};
use std::process::Command;
use tauri::{AppHandle, Manager};

use crate::{binaries, store};

fn settings_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("settings.json"))
}

/// Stored settings blob, or Null if none saved yet (frontend applies defaults).
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Value, String> {
    store::read_json(&settings_file(&app)?, Value::Null)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    store::write_json(&settings_file(&app)?, &settings)
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
        yt_dlp: version_of(&yt_dlp, &["--version"], parse_yt_dlp_version),
        ffmpeg: version_of(&ffmpeg, &["-version"], parse_ffmpeg_version),
    })
    .await
    .map_err(|e| e.to_string())
}

/// `yt-dlp --version` prints just "2025.06.30" — but nightly builds append a
/// second line, so take the first.
fn parse_yt_dlp_version(out: &str) -> String {
    match out.lines().next().unwrap_or("").trim() {
        "" => UNKNOWN.to_string(),
        v => v.to_string(),
    }
}

/// "ffmpeg version 7.1 Copyright ..." → the 3rd token.
fn parse_ffmpeg_version(out: &str) -> String {
    out.split_whitespace()
        .nth(2)
        .unwrap_or(UNKNOWN)
        .to_string()
}

const UNKNOWN: &str = "unknown";

fn version_of(bin: &Path, args: &[&str], parse: fn(&str) -> String) -> String {
    let mut cmd = Command::new(bin);
    cmd.args(args);
    binaries::prepare(&mut cmd);
    match cmd.output() {
        Ok(out) if out.status.success() => parse(&String::from_utf8_lossy(&out.stdout)),
        _ => "not found".to_string(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_the_yt_dlp_version() {
        assert_eq!(parse_yt_dlp_version("2025.06.30\n"), "2025.06.30");
        // Nightly prints a build line after the version.
        assert_eq!(
            parse_yt_dlp_version("2025.06.30.232839\nbuilt from abc123\n"),
            "2025.06.30.232839"
        );
        // Never surface an empty string in Settings.
        assert_eq!(parse_yt_dlp_version(""), UNKNOWN);
        assert_eq!(parse_yt_dlp_version("\n"), UNKNOWN);
    }

    #[test]
    fn reads_the_ffmpeg_version() {
        assert_eq!(
            parse_ffmpeg_version("ffmpeg version 7.1 Copyright (c) 2000-2024 the FFmpeg developers"),
            "7.1"
        );
        // Distro builds carry a suffix; keep it — it's still the version.
        assert_eq!(
            parse_ffmpeg_version("ffmpeg version 6.1.1-3ubuntu5 Copyright (c) 2000-2023"),
            "6.1.1-3ubuntu5"
        );
        // Fewer than 3 tokens must not panic.
        assert_eq!(parse_ffmpeg_version("ffmpeg version"), UNKNOWN);
        assert_eq!(parse_ffmpeg_version(""), UNKNOWN);
    }
}
