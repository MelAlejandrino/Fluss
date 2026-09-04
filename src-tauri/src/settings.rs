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

/// Browsers yt-dlp can read cookies from, best first, as (yt-dlp name, env var
/// holding the root, profile path under it). Chromium browsers live under
/// `%LOCALAPPDATA%` on Windows and Firefox/Opera under `%APPDATA%`, so the root
/// is per-entry rather than assumed.
///
/// Windows leads with Firefox on purpose: Chromium browsers there bind the
/// cookie key to the browser binary (DPAPI/App-Bound Encryption), so most
/// cookies won't decrypt — but yt-dlp only warns about those, while a browser
/// that isn't installed at all kills the run. A partial session beats none.
#[cfg(target_os = "windows")]
const CANDIDATES: &[(&str, &str, &str)] = &[
    ("firefox", "APPDATA", "Mozilla/Firefox/Profiles"),
    ("chrome", "LOCALAPPDATA", "Google/Chrome/User Data"),
    ("edge", "LOCALAPPDATA", "Microsoft/Edge/User Data"),
    (
        "brave",
        "LOCALAPPDATA",
        "BraveSoftware/Brave-Browser/User Data",
    ),
    ("vivaldi", "LOCALAPPDATA", "Vivaldi/User Data"),
    ("opera", "APPDATA", "Opera Software/Opera Stable"),
    ("chromium", "LOCALAPPDATA", "Chromium/User Data"),
];

#[cfg(target_os = "macos")]
const CANDIDATES: &[(&str, &str, &str)] = &[
    (
        "chrome",
        "HOME",
        "Library/Application Support/Google/Chrome",
    ),
    (
        "firefox",
        "HOME",
        "Library/Application Support/Firefox/Profiles",
    ),
    (
        "brave",
        "HOME",
        "Library/Application Support/BraveSoftware/Brave-Browser",
    ),
    ("edge", "HOME", "Library/Application Support/Microsoft Edge"),
    ("vivaldi", "HOME", "Library/Application Support/Vivaldi"),
    (
        "opera",
        "HOME",
        "Library/Application Support/com.operasoftware.Opera",
    ),
    ("chromium", "HOME", "Library/Application Support/Chromium"),
];

#[cfg(not(any(target_os = "windows", target_os = "macos")))]
const CANDIDATES: &[(&str, &str, &str)] = &[
    ("chrome", "HOME", ".config/google-chrome"),
    ("firefox", "HOME", ".mozilla/firefox"),
    ("brave", "HOME", ".config/BraveSoftware/Brave-Browser"),
    ("edge", "HOME", ".config/microsoft-edge"),
    ("vivaldi", "HOME", ".config/vivaldi"),
    ("opera", "HOME", ".config/opera"),
    ("chromium", "HOME", ".config/chromium"),
];

/// The first browser in [`CANDIDATES`] whose profile directory exists, or `None`
/// on a machine with none of them. `--cookies-from-browser` aborts the whole run
/// when the named browser isn't installed, so guessing a fixed name is the
/// difference between a download that works signed-out and one that never
/// starts.
pub fn detect_browser() -> Option<&'static str> {
    CANDIDATES
        .iter()
        .find(|(_, root, profiles)| {
            std::env::var_os(root).is_some_and(|r| Path::new(&r).join(profiles).exists())
        })
        .map(|(name, ..)| *name)
}

/// `--cookies-from-browser <name>` when the user enabled browser sign-in and a
/// supported browser is installed, else empty.
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
    cookie_args_from(&stored, detect_browser())
}

fn cookie_args_from(stored: &Value, browser: Option<&str>) -> Vec<String> {
    match (
        stored.get("useBrowserCookies").and_then(Value::as_bool),
        browser,
    ) {
        (Some(true), Some(browser)) => {
            vec!["--cookies-from-browser".into(), browser.into()]
        }
        _ => Vec::new(),
    }
}

/// True when yt-dlp died because it couldn't read the browser cookie store —
/// browser not really installed, profile never created, store locked or
/// undecryptable. The caller retries signed-out rather than failing the whole
/// download over an optional extra.
///
/// Deliberately narrow: the bot-wall message also says "cookies", but that one
/// is about *needing* a session, and re-running without one just wastes the
/// user's time.
pub fn is_cookie_failure(stderr: &str) -> bool {
    let e = stderr.to_lowercase();
    ["cookies database", "cookie database", "unsupported browser"]
        .iter()
        .any(|needle| e.contains(needle))
        || (e.contains("cookie") && e.contains("decrypt"))
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
    /// Browser the sign-in setting would read from, or `None` when this machine
    /// has none — Settings says so rather than offering a toggle that can't work.
    cookie_browser: Option<&'static str>,
}

#[tauri::command]
pub async fn engine_versions(app: AppHandle) -> Result<EngineVersions, String> {
    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    let ffmpeg = binaries::resolve(&app, "ffmpeg");
    tauri::async_runtime::spawn_blocking(move || EngineVersions {
        yt_dlp: version_of(&yt_dlp, &["--version"], parse_yt_dlp_version),
        ffmpeg: version_of(&ffmpeg, &["-version"], parse_ffmpeg_version),
        cookie_browser: detect_browser(),
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
            // Not every non-zero exit is a failure to report as one: yt-dlp
            // exits 100 when a package manager owns the install, which is an
            // outcome the user needs explained, not an error dialog.
            if is_package_manager_install(&text) {
                log::info!("engine update declined: {}", text.trim());
                return Ok(package_manager_outcome());
            }
            log::error!("engine update failed: {}", text.trim());
            return Err(text.trim().to_string());
        }
        log::info!("engine update: {}", text.trim());
        Ok(parse_update(&text))
    })
    .await
    .map_err(|e| format!("Update task failed: {e}"))?
}

/// yt-dlp refuses to update itself when pip, winget or a distro package owns
/// the install — it names whichever one it found, so match on all of them.
fn is_package_manager_install(out: &str) -> bool {
    let lower = out.to_lowercase();
    lower.contains("package manager")
        || lower.contains("not a self-updating build")
        || lower.contains("with pip")
        || lower.contains("from pypi")
}

/// Says who *can* update it. "Fluss can't" on its own leaves the user stuck on
/// a broken extractor with nowhere to go, and a stale yt-dlp is the single most
/// common cause of a download failing.
fn package_manager_outcome() -> EngineUpdate {
    EngineUpdate {
        message: concat!(
            "This engine was installed by a package manager, so Fluss can't update it. ",
            "Update it there instead — for a pip install, `pip install -U yt-dlp`."
        )
        .to_string(),
        updated: false,
    }
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
    } else if is_package_manager_install(out) {
        return package_manager_outcome();
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
    out.split_whitespace().nth(2).unwrap_or(UNKNOWN).to_string()
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
            cookie_args_from(&json!({ "useBrowserCookies": true }), Some("firefox")),
            vec!["--cookies-from-browser", "firefox"]
        );
        // Nothing installed to read from: download signed-out rather than let
        // yt-dlp abort on a browser that isn't there.
        assert!(cookie_args_from(&json!({ "useBrowserCookies": true }), None).is_empty());
        // Off is the default — reading the user's cookie store is opt-in, so
        // anything other than a literal `true` must leave it alone. Includes the
        // old string-valued setting from before this became a toggle.
        assert!(
            cookie_args_from(&json!({ "useBrowserCookies": false }), Some("firefox")).is_empty()
        );
        assert!(
            cookie_args_from(&json!({ "useBrowserCookies": "yes" }), Some("firefox")).is_empty()
        );
        assert!(
            cookie_args_from(&json!({ "cookiesBrowser": "chrome" }), Some("firefox")).is_empty()
        );
        assert!(cookie_args_from(&json!({}), Some("firefox")).is_empty());
        assert!(cookie_args_from(&Value::Null, Some("firefox")).is_empty());
    }

    #[test]
    fn only_a_broken_cookie_store_triggers_the_signed_out_retry() {
        assert!(is_cookie_failure(
            "ERROR: could not find firefox cookies database in None"
        ));
        assert!(is_cookie_failure(
            "ERROR: Could not copy Chrome cookie database"
        ));
        assert!(is_cookie_failure("ERROR: unsupported browser: safari"));
        assert!(is_cookie_failure(
            "ERROR: failed to decrypt cookie with DPAPI"
        ));
        // The bot wall is the opposite problem — retrying without the session
        // fails the same way, slower.
        assert!(!is_cookie_failure(
            "ERROR: [youtube] xyz: Sign in to confirm you're not a bot. Use --cookies-from-browser"
        ));
        assert!(!is_cookie_failure("ERROR: Video unavailable"));
    }

    #[test]
    fn detection_never_invents_a_browser() {
        // Whatever this machine has, the name must be one yt-dlp accepts.
        if let Some(name) = detect_browser() {
            assert!(CANDIDATES.iter().any(|(c, ..)| *c == name));
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
            parse_ffmpeg_version(
                "ffmpeg version 7.1 Copyright (c) 2000-2024 the FFmpeg developers"
            ),
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

    #[test]
    fn a_pip_install_is_an_outcome_not_an_error() {
        // Verbatim from yt-dlp 2026.07.04, which exits 100 saying this.
        let out = "Current version: stable@2026.07.04 from yt-dlp/yt-dlp
                   Latest version: stable@2026.08.19 from yt-dlp/yt-dlp
                   ERROR: You installed yt-dlp with pip or using the wheel from PyPi;                    Use that to update";
        assert!(is_package_manager_install(out));

        let result = parse_update(out);
        assert!(!result.updated);
        // The message has to name the way out, not just refuse.
        assert!(
            result.message.contains("pip install -U yt-dlp"),
            "{}",
            result.message
        );
    }

    #[test]
    fn a_real_update_is_not_mistaken_for_a_package_manager() {
        let out = "Updated yt-dlp to stable@2026.08.19";
        assert!(!is_package_manager_install(out));
        assert!(parse_update(out).updated);
    }
}
