use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Manager};

/// Shared setup for every yt-dlp invocation.
pub fn prepare(cmd: &mut Command) {
    // Force UTF-8 I/O so non-ASCII filenames round-trip through stdout intact.
    // yt-dlp maps Windows-illegal chars to fullwidth forms (e.g. `|` → `｜`,
    // U+FF5C); without this they get mangled by the ANSI codepage and the path
    // we capture no longer matches the file on disk.
    cmd.env("PYTHONUTF8", "1");
    cmd.env("PYTHONIOENCODING", "utf-8");
    no_window(cmd);
}

#[cfg(target_os = "windows")]
fn no_window(cmd: &mut Command) {
    use std::os::windows::process::CommandExt;
    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    cmd.creation_flags(CREATE_NO_WINDOW);
}

#[cfg(not(target_os = "windows"))]
fn no_window(_cmd: &mut Command) {}

/// Path to a bundled binary if it's actually present in resources, else None.
/// Used for `--ffmpeg-location` (only pass it when we really ship ffmpeg).
pub fn bundled_path(app: &AppHandle, name: &str) -> Option<PathBuf> {
    let file_name = with_exe_suffix(name);
    let resource_dir = app.path().resource_dir().ok()?;
    let bundled = resource_dir
        .join("binaries")
        .join(platform_dir())
        .join(&file_name);
    bundled.exists().then_some(bundled)
}

/// Resolve a binary by base name ("yt-dlp" / "ffmpeg").
///
/// Prefers the bundled copy; during development (before binaries are bundled)
/// falls back to the bare name so the OS resolves it via PATH.
pub fn resolve(app: &AppHandle, name: &str) -> PathBuf {
    bundled_path(app, name).unwrap_or_else(|| PathBuf::from(with_exe_suffix(name)))
}

/// `--js-runtimes deno:<path>` when a bundled deno exists, else empty. yt-dlp
/// needs a JS runtime for full YouTube extraction; in dev it finds deno on PATH
/// on its own, so we only point it at the bundled copy.
pub fn js_runtime_args(app: &AppHandle) -> Vec<String> {
    match bundled_path(app, "deno") {
        Some(deno) => vec!["--js-runtimes".into(), format!("deno:{}", deno.to_string_lossy())],
        None => vec![],
    }
}

fn platform_dir() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else {
        "linux"
    }
}

fn with_exe_suffix(name: &str) -> String {
    if cfg!(target_os = "windows") {
        format!("{name}.exe")
    } else {
        name.to_string()
    }
}
