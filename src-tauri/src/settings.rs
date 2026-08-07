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

/// Check if minimize-to-tray is enabled. Reads the setting directly from disk
/// so it works even before the frontend has loaded. Defaults to `false`.
pub fn minimize_to_tray(app: &AppHandle) -> bool {
    let Ok(path) = settings_file(app) else {
        return false;
    };
    let stored = store::read_json(&path, Value::Null).unwrap_or(Value::Null);
    stored
        .get("minimizeToTray")
        .and_then(Value::as_bool)
        .unwrap_or(false)
}

/// The saved theme preference: "light", "dark", or "system". Read from disk for
/// the same reason as `minimize_to_tray` — the window needs a background colour
/// before the frontend exists to tell it one.
pub fn theme_preference(app: &AppHandle) -> String {
    let Ok(path) = settings_file(app) else {
        return "system".into();
    };
    let stored = store::read_json(&path, Value::Null).unwrap_or(Value::Null);
    stored
        .get("theme")
        .and_then(Value::as_str)
        .unwrap_or("system")
        .to_string()
}

/// Stored settings blob, or Null if none saved yet (frontend applies defaults).
#[tauri::command]
pub fn get_settings(app: AppHandle) -> Result<Value, String> {
    store::read_json(&settings_file(&app)?, Value::Null)
}

#[tauri::command]
pub fn save_settings(app: AppHandle, settings: Value) -> Result<(), String> {
    store::write_json(&settings_file(&app)?, &settings)?;
    // The theme may have just changed. Repaint the window layer to match, or a
    // drag-resize afterwards shows a strip of the previous theme's background.
    crate::apply_window_background(&app);
    Ok(())
}

/// The browser we read cookies from. Not a user choice: on Windows, Chromium
/// (Chrome/Edge/Brave) binds its cookie-encryption key to the browser binary, so
/// no other process can decrypt the store — Firefox is the only one that can
/// work there. Elsewhere Chrome is the most common install and works fine.
fn preferred_browser() -> &'static str {
    if cfg!(target_os = "windows") {
        "firefox"
    } else {
        "chrome"
    }
}

/// `--cookies-from-browser <name>` when the user enabled browser sign-in, else
/// empty.
///
/// YouTube bot-walls signed-out requests once an IP looks suspicious ("Sign in
/// to confirm you're not a bot"); borrowing the user's real session is the
/// documented way through. Read here rather than passed from the frontend so
/// analyze and download can't drift apart — and so the browser name is ours,
/// never a string that arrives from outside.
pub fn cookie_args(app: &AppHandle) -> Vec<String> {
    let Ok(path) = settings_file(app) else {
        return Vec::new();
    };
    let stored = store::read_json(&path, Value::Null).unwrap_or(Value::Null);
    cookie_args_from(&stored)
}

fn cookie_args_from(stored: &Value) -> Vec<String> {
    match stored.get("useBrowserCookies").and_then(Value::as_bool) {
        Some(true) => vec!["--cookies-from-browser".into(), preferred_browser().into()],
        _ => Vec::new(),
    }
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

/// How `yt-dlp -U` went. Not a bool: "already current" and "updated" are both
/// success but read differently, and a PATH install managed by pip/winget cannot
/// self-update at all — telling the user it worked would be a lie.
#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct EngineUpdate {
    pub message: String,
    pub updated: bool,
}

/// yt-dlp's own updater. Extraction breaks whenever a site changes, and a newer
/// yt-dlp is nearly always the fix, so this is the most useful button in the app.
#[tauri::command]
pub async fn update_engine(app: AppHandle) -> Result<EngineUpdate, String> {
    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(&yt_dlp);
        cmd.arg("-U");
        binaries::prepare(&mut cmd);
        let out = cmd
            .output()
            .map_err(|e| format!("Could not start the downloader engine: {e}"))?;
        // yt-dlp reports the interesting part on stdout, failures on stderr.
        let text = format!(
            "{}{}",
            String::from_utf8_lossy(&out.stdout),
            String::from_utf8_lossy(&out.stderr)
        );
        if !out.status.success() {
            log::error!("engine update failed: {}", text.trim());
            return Err(text.trim().to_string());
        }
        log::info!("engine update: {}", text.trim());
        Ok(parse_update(&text))
    })
    .await
    .map_err(|e| format!("Update task failed: {e}"))?
}

/// Reads yt-dlp's update output. It exits 0 whether it updated, was already
/// current, or refused because a package manager owns the install, so the words
/// are the only signal.
fn parse_update(out: &str) -> EngineUpdate {
    let lower = out.to_lowercase();
    let updated = lower.contains("updated yt-dlp to") || lower.contains("updating to version");
    let message = if updated {
        // "Updated yt-dlp to stable@2025.06.30" → keep the version, drop the noise.
        out.lines()
            .find(|l| l.to_lowercase().contains("updated yt-dlp to"))
            .unwrap_or("The engine was updated.")
            .trim()
            .to_string()
    } else if lower.contains("up to date") || lower.contains("up-to-date") {
        "The engine is already up to date.".to_string()
    } else if lower.contains("package manager") || lower.contains("not a self-updating build") {
        // pip/winget/homebrew installs, and the dev fallback to PATH.
        "This engine was installed by a package manager, so Fluss can't update it."
            .to_string()
    } else {
        // Unrecognised but successful — show yt-dlp's own last word rather than
        // inventing an outcome.
        out.lines()
            .filter(|l| !l.trim().is_empty())
            .next_back()
            .unwrap_or("The engine is up to date.")
            .trim()
            .to_string()
    };
    EngineUpdate { message, updated }
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
    fn browser_cookies_are_off_unless_explicitly_enabled() {
        use serde_json::json;

        assert_eq!(
            cookie_args_from(&json!({ "useBrowserCookies": true })),
            vec!["--cookies-from-browser", preferred_browser()]
        );
        // Off is the default — reading the user's cookie store is opt-in, so
        // anything other than a literal `true` must leave it alone. Includes the
        // old string-valued setting from before this became a toggle.
        assert!(cookie_args_from(&json!({ "useBrowserCookies": false })).is_empty());
        assert!(cookie_args_from(&json!({ "useBrowserCookies": "yes" })).is_empty());
        assert!(cookie_args_from(&json!({ "cookiesBrowser": "chrome" })).is_empty());
        assert!(cookie_args_from(&json!({})).is_empty());
        assert!(cookie_args_from(&Value::Null).is_empty());
    }

    #[test]
    fn windows_never_picks_a_chromium_browser() {
        // Chrome/Edge/Brave cookies are undecryptable there (DPAPI/App-Bound
        // Encryption), so picking one would fail 100% of the time.
        if cfg!(target_os = "windows") {
            assert_eq!(preferred_browser(), "firefox");
        }
    }

    #[test]
    fn update_output_maps_to_the_right_outcome() {
        // yt-dlp exits 0 for all three of these, so the words are all we have.
        let done = parse_update("Latest version: 2025.06.30\nUpdated yt-dlp to stable@2025.06.30");
        assert!(done.updated);
        assert!(done.message.contains("2025.06.30"));

        let current = parse_update("yt-dlp is up to date (stable@2025.06.30)");
        assert!(!current.updated);
        assert!(current.message.contains("already up to date"));

        // A pip/winget install can't self-update — claiming success would be a lie.
        let managed = parse_update(
            "ERROR: You installed yt-dlp with a package manager or setup.py; Use that to update",
        );
        assert!(!managed.updated);
        assert!(managed.message.contains("package manager"));

        // Never surface an empty message, whatever yt-dlp prints.
        assert!(!parse_update("").message.is_empty());
        assert!(!parse_update("\n\n").message.is_empty());
    }

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
