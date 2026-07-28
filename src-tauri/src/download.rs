use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::Path;
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant, SystemTime};
use tauri::{AppHandle, Emitter, State};

use crate::binaries;

// Our progress lines are tagged so we can tell them apart from yt-dlp's other
// stderr output (warnings, errors).
const PROGRESS_TAG: &str = "__FLUSSPROGRESS__";
const FILE_TAG: &str = "__FLUSSFILE__";
const META_TAG: &str = "__FLUSSMETA__";
const PROGRESS_TEMPLATE: &str = concat!(
    "download:__FLUSSPROGRESS__ ",
    "%(progress.downloaded_bytes)s %(progress.total_bytes)s ",
    "%(progress.total_bytes_estimate)s %(progress.speed)s %(progress.eta)s"
);

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadOptions {
    pub url: String,
    pub output_directory: String,
    pub format: String,
    pub quality: Option<String>,
    #[serde(default)]
    pub overwrite: bool,
    #[serde(default)]
    pub keep_partial: bool,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
    pub file_path: String,
}

#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct ProgressEvent {
    download_id: String,
    progress: f64,
    downloaded_bytes: Option<f64>,
    total_bytes: Option<f64>,
    speed: Option<f64>,
    eta: Option<f64>,
    status: String,
}

/// Fired once per download as soon as yt-dlp resolves the metadata — before any
/// bytes move. Lets bulk items (enqueued from a bare URL, no upfront analyze)
/// pick up a real title and thumbnail instead of the raw URL and a blank frame.
#[derive(Serialize, Clone)]
#[serde(rename_all = "camelCase")]
struct MetaEvent {
    download_id: String,
    title: String,
    thumbnail_url: Option<String>,
}

/// Splits a `__FLUSSMETA__` payload. Thumbnail URLs contain no spaces, so the
/// title is simply everything after the first one. Missing fields arrive as the
/// literal "NA" from yt-dlp.
fn parse_meta(id: &str, payload: &str) -> MetaEvent {
    let (thumb, title) = payload.split_once(' ').unwrap_or((payload, ""));
    MetaEvent {
        download_id: id.to_string(),
        title: title.to_string(),
        thumbnail_url: (thumb != "NA" && !thumb.is_empty()).then(|| thumb.to_string()),
    }
}

#[derive(Clone)]
struct Job {
    child: Arc<Mutex<Child>>,
    cancelled: Arc<AtomicBool>,
}

/// download_id → running process. Cleared when a download ends.
#[derive(Default)]
pub struct DownloadRegistry(Mutex<HashMap<String, Job>>);

/// Sentinel returned when a download was cancelled by the user (vs. failed).
pub const CANCELLED: &str = "__CANCELLED__";
/// Sentinel for an output directory that is gone or not writable. The frontend
/// turns these into a friendly message (see `src/lib/errors.ts`).
pub const NO_OUTPUT_DIR: &str = "__NODIR__";
pub const NO_WRITE_PERMISSION: &str = "__NOWRITE__";

/// The output directory must exist and accept a file before we spawn yt-dlp —
/// otherwise the failure surfaces as opaque engine stderr minutes later.
fn check_output_directory(dir: &str) -> Result<(), String> {
    let path = Path::new(dir);
    if !path.is_dir() {
        return Err(NO_OUTPUT_DIR.to_string());
    }
    // ponytail: write-and-delete probe. Racy in theory, but it catches the real
    // cases (read-only volume, no ACL) that a metadata check misses on Windows.
    let probe = path.join(".fluss-write-test");
    match fs::write(&probe, b"") {
        Ok(()) => {
            let _ = fs::remove_file(&probe);
            Ok(())
        }
        Err(_) => Err(NO_WRITE_PERMISSION.to_string()),
    }
}

#[tauri::command]
pub async fn start_download(
    app: AppHandle,
    registry: State<'_, DownloadRegistry>,
    id: String,
    options: DownloadOptions,
) -> Result<DownloadResult, String> {
    check_output_directory(&options.output_directory)?;

    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    let ffmpeg = binaries::bundled_path(&app, "ffmpeg");
    let mut args = build_args(&options, ffmpeg.as_deref());
    // Insert the JS-runtime flag before the trailing URL.
    let js_runtime = binaries::js_runtime_args(&app);
    if !js_runtime.is_empty() {
        let url = args.pop().expect("url is the last arg");
        args.extend(js_runtime);
        args.push(url);
    }

    let mut cmd = Command::new(&yt_dlp);
    cmd.args(&args).stdout(Stdio::piped()).stderr(Stdio::piped());
    binaries::prepare(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| {
        log::error!("download {id}: could not spawn yt-dlp: {e}");
        format!("Could not start the downloader engine: {e}")
    })?;
    log::info!(
        "download {id}: started ({} {}) → {}",
        options.format,
        options.quality.as_deref().unwrap_or("best"),
        options.output_directory
    );

    let stdout = child.stdout.take().expect("piped stdout");
    let stderr = child.stderr.take().expect("piped stderr");

    let child = Arc::new(Mutex::new(child));
    let cancelled = Arc::new(AtomicBool::new(false));
    registry.0.lock().unwrap().insert(
        id.clone(),
        Job {
            child: child.clone(),
            cancelled: cancelled.clone(),
        },
    );

    let result = {
        let app = app.clone();
        let id = id.clone();
        let child = child.clone();
        tauri::async_runtime::spawn_blocking(move || {
            run_to_completion(app, id, child, stdout, stderr, &options.output_directory, options.keep_partial)
        })
        .await
        .map_err(|e| format!("Download task failed: {e}"))?
    };

    registry.0.lock().unwrap().remove(&id);

    match result {
        Ok(file_path) => {
            log::info!("download {id}: completed");
            Ok(DownloadResult { file_path })
        }
        Err(err) if cancelled.load(Ordering::SeqCst) => {
            let _ = err;
            log::info!("download {id}: cancelled by user");
            Err(CANCELLED.to_string())
        }
        Err(err) => {
            log::error!("download {id}: failed — {err}");
            Err(err)
        }
    }
}

#[tauri::command]
pub fn cancel_download(registry: State<'_, DownloadRegistry>, id: String) {
    if let Some(job) = registry.0.lock().unwrap().get(&id) {
        log::info!("download {id}: cancelling");
        job.cancelled.store(true, Ordering::SeqCst);
        // ponytail: kills yt-dlp; an in-flight ffmpeg merge child may linger
        // briefly. Process-group kill if that ever matters.
        let _ = job.child.lock().unwrap().kill();
    }
}

/// Returns true if there is at least one download in progress (downloading
/// or processing). Used by the app lifecycle to prevent accidental close.
#[tauri::command]
pub fn has_active_downloads(registry: State<'_, DownloadRegistry>) -> bool {
    !registry.0.lock().unwrap().is_empty()
}

/// Cancels every active download and kills their child processes.
/// Used when the user confirms "Quit" with active downloads.
#[tauri::command]
pub fn force_cancel_all(registry: State<'_, DownloadRegistry>) {
    let jobs = registry.0.lock().unwrap().clone();
    for (_, job) in jobs.iter() {
        job.cancelled.store(true, Ordering::SeqCst);
        let _ = job.child.lock().unwrap().kill();
    }
}

/// Removes incomplete media files in the output directory that are likely
/// leftover partial downloads. Targets files that look like active partial
/// artifacts (created in the last 24 hours or with no matching completed file).
fn cleanup_partial_files(output_directory: &str) {
    let dir = Path::new(output_directory);
    let Ok(entries) = fs::read_dir(dir) else {
        return;
    };
    let now = SystemTime::now();
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() {
            continue;
        }
        let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("").to_lowercase();
        if !matches!(ext.as_str(), "mp4" | "mp3" | "mkv" | "webm" | "m4a" | "flv" | "avi" | "mov" | "wmv" | "part" | "tmp" | "downloading") {
            continue;
        }
        let metadata = match entry.metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };
        let modified = match metadata.modified() {
            Ok(t) => t,
            Err(_) => continue,
        };
        let elapsed = now.duration_since(modified).unwrap_or_default();
        if elapsed < Duration::from_secs(86400) {
            let _ = fs::remove_file(&path);
        }
    }
}

/// Progress lines and the final path both arrive on stdout (yt-dlp writes the
/// `--progress-template` there); stderr carries warnings/errors and is drained
/// on its own thread to avoid a pipe-buffer deadlock.
fn run_to_completion(
    app: AppHandle,
    id: String,
    child: Arc<Mutex<Child>>,
    stdout: impl Read,
    stderr: impl Read + Send + 'static,
    output_directory: &str,
    keep_partial: bool,
) -> Result<String, String> {
    let stderr_thread = std::thread::spawn(move || {
        BufReader::new(stderr)
            .lines()
            .map_while(Result::ok)
            .filter(|l| !l.trim().is_empty())
            .collect::<Vec<String>>()
    });

    let mut file_path = String::new();
    let mut last_emit = Instant::now() - Duration::from_secs(1);
    // Once a stream reaches 100%, everything after is the audio stream + merge
    // (`--print` sends yt-dlp's "[download] Destination:" lines to stderr, so we
    // infer the phase from the progress values themselves). Report the tail as
    // "processing" → the UI shows "Finalizing…" instead of a jarring restart.
    let mut seen_full = false;

    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        if let Some(rest) = line.strip_prefix(PROGRESS_TAG) {
            let status = if seen_full { "processing" } else { "downloading" };
            if let Some(ev) = parse_progress(&id, rest.trim(), status) {
                if last_emit.elapsed() >= Duration::from_millis(120) {
                    let _ = app.emit("download-progress", ev.clone());
                    last_emit = Instant::now();
                }
                // Read from every line (not just emitted ones) so we never miss
                // the stream-complete transition to a throttle gap.
                if ev.progress >= 0.999 {
                    seen_full = true;
                }
            }
        } else if let Some(path) = line.trim().strip_prefix(FILE_TAG) {
            file_path = path.to_string();
        } else if let Some(meta) = line.trim().strip_prefix(META_TAG) {
            let _ = app.emit("download-meta", parse_meta(&id, meta));
        }
    }

    let status = child.lock().unwrap().wait().map_err(|e| e.to_string())?;
    let stderr_lines = stderr_thread.join().unwrap_or_default();

    if status.success() {
        Ok(file_path)
    } else {
        // Keep the tail — the actionable error is usually last.
        let tail = stderr_lines
            .iter()
            .rev()
            .take(6)
            .rev()
            .cloned()
            .collect::<Vec<_>>()
            .join("\n");
        if !keep_partial {
            cleanup_partial_files(output_directory);
        }
        Err(tail)
    }
}

fn parse_progress(id: &str, line: &str, status: &str) -> Option<ProgressEvent> {
    let f = line.split_whitespace().collect::<Vec<_>>();
    if f.len() < 5 {
        return None;
    }
    let num = |s: &str| -> Option<f64> {
        match s {
            "NA" | "None" | "" => None,
            v => v.parse::<f64>().ok(),
        }
    };
    let downloaded = num(f[0]);
    let total = num(f[1]).or_else(|| num(f[2]));
    let progress = match (downloaded, total) {
        (Some(d), Some(t)) if t > 0.0 => (d / t).clamp(0.0, 1.0),
        _ => 0.0,
    };
    Some(ProgressEvent {
        download_id: id.to_string(),
        progress,
        downloaded_bytes: downloaded,
        total_bytes: total,
        speed: num(f[3]),
        eta: num(f[4]),
        status: status.to_string(),
    })
}

/// yt-dlp format selector for a quality choice. A specific height caps the
/// resolution; "best" (or anything unrecognized) leaves it uncapped.
fn video_format(quality: Option<&str>) -> String {
    // Any "<height>p" caps the resolution; "best"/unknown stays uncapped.
    let height = quality
        .and_then(|q| q.strip_suffix('p'))
        .and_then(|d| d.parse::<u32>().ok());
    match height {
        Some(h) => format!("bv*[height<={h}]+ba/b[height<={h}]"),
        None => "bv*+ba/b".to_string(),
    }
}

/// Translate structured options into yt-dlp arguments. URLs are data — passed
/// as a discrete arg, never interpolated into a shell string.
fn build_args(options: &DownloadOptions, ffmpeg: Option<&Path>) -> Vec<String> {
    // Video filenames carry the resolution so the same source at different
    // qualities produces distinct files instead of colliding (yt-dlp would
    // otherwise skip the second as "already downloaded"). Audio has no
    // resolution, so it stays clean.
    let output_template = match options.format.as_str() {
        "mp3" => format!("{}/%(title)s.%(ext)s", options.output_directory),
        _ => format!("{}/%(title)s [%(height)sp].%(ext)s", options.output_directory),
    };

    let mut args: Vec<String> = vec![
        // The frozen yt-dlp.exe ignores PYTHONUTF8/PYTHONIOENCODING and encodes
        // `--print` output with the ANSI codepage using errors='ignore', so
        // astral chars (emoji) are silently dropped from the path we capture and
        // open/reveal then can't find the file. This forces UTF-8 on its side.
        "--encoding".into(),
        "utf-8".into(),
        "--no-playlist".into(),
        "--no-simulate".into(),
        "--newline".into(),
        // Force progress output even though our stdio is piped (non-TTY),
        // otherwise yt-dlp stays silent and no events fire.
        "--progress".into(),
        "--progress-template".into(),
        PROGRESS_TEMPLATE.into(),
    ];

    match options.format.as_str() {
        "mp3" => {
            // Audio-only; quality is a video concept, so it's ignored here.
            args.push("-x".into());
            args.push("--audio-format".into());
            args.push("mp3".into());
        }
        // Default / "mp4": best video+audio (capped by quality), merged to mp4.
        _ => {
            args.push("-f".into());
            args.push(video_format(options.quality.as_deref()));
            args.push("--merge-output-format".into());
            args.push("mp4".into());
        }
    }

    if let Some(ffmpeg) = ffmpeg {
        args.push("--ffmpeg-location".into());
        args.push(ffmpeg.to_string_lossy().into_owned());
    }

    if options.overwrite {
        args.push("--force-overwrites".into());
    }
    if options.keep_partial {
        // Keep intermediate fragment files instead of cleaning them up.
        args.push("--keep-fragments".into());
    }

    args.push("-o".into());
    args.push(output_template);
    args.push("--print".into());
    // Thumbnail first — it has no spaces, so the title can be the rest of the line.
    args.push(format!("before_dl:{META_TAG}%(thumbnail)s %(title)s"));
    args.push("--print".into());
    args.push(format!("after_move:{FILE_TAG}%(filepath)s"));
    args.push(options.url.clone());
    args
}

#[cfg(test)]
mod tests {
    use super::*;

    fn opts(format: &str) -> DownloadOptions {
        DownloadOptions {
            url: "https://example.com/watch?v=x".into(),
            output_directory: "/out".into(),
            format: format.into(),
            quality: Some("best".into()),
            overwrite: false,
            keep_partial: false,
        }
    }

    #[test]
    fn mp4_merges_to_mp4_and_url_is_last() {
        let args = build_args(&opts("mp4"), None);
        assert!(args.windows(2).any(|w| w == ["--merge-output-format", "mp4"]));
        assert_eq!(args.last().unwrap(), "https://example.com/watch?v=x");
        // Without this the captured %(filepath)s loses emoji and open/reveal 404s.
        assert!(args.windows(2).any(|w| w == ["--encoding", "utf-8"]));
        // Resolution in the filename so qualities don't collide.
        assert!(args.iter().any(|a| a.contains("%(title)s [%(height)sp].%(ext)s")));
        // Title + thumbnail resolve before download starts (bulk-queued items
        // have no upfront analyze to get them from otherwise).
        assert!(args
            .iter()
            .any(|a| a.contains("before_dl:__FLUSSMETA__%(thumbnail)s %(title)s")));
    }

    #[test]
    fn meta_splits_thumbnail_from_title() {
        let ev = parse_meta("d1", "https://img/1.jpg A Video");
        assert_eq!(ev.thumbnail_url.as_deref(), Some("https://img/1.jpg"));
        assert_eq!(ev.title, "A Video");
        // Titles with spaces survive — only the first space is a separator.
        let ev = parse_meta("d1", "https://img/1.jpg A Video: Part 2");
        assert_eq!(ev.title, "A Video: Part 2");
    }

    #[test]
    fn meta_tolerates_a_missing_thumbnail() {
        let ev = parse_meta("d1", "NA A Video");
        assert_eq!(ev.thumbnail_url, None);
        assert_eq!(ev.title, "A Video");
        // No space at all: nothing usable, but it must not panic.
        let ev = parse_meta("d1", "NA");
        assert_eq!(ev.thumbnail_url, None);
        assert_eq!(ev.title, "");
    }

    #[test]
    fn quality_caps_height() {
        assert_eq!(video_format(Some("best")), "bv*+ba/b");
        assert_eq!(video_format(None), "bv*+ba/b");
        assert_eq!(video_format(Some("360p")), "bv*[height<=360]+ba/b[height<=360]");
        assert_eq!(video_format(Some("1080p")), "bv*[height<=1080]+ba/b[height<=1080]");
        assert_eq!(video_format(Some("2160p")), "bv*[height<=2160]+ba/b[height<=2160]");
    }

    #[test]
    fn mp4_360p_passes_height_cap_to_yt_dlp() {
        let mut o = opts("mp4");
        o.quality = Some("360p".into());
        let args = build_args(&o, None);
        assert!(args.iter().any(|a| a.contains("height<=360")));
    }

    #[test]
    fn mp3_extracts_audio_with_clean_name() {
        let args = build_args(&opts("mp3"), None);
        assert!(args.contains(&"-x".to_string()));
        assert!(args.windows(2).any(|w| w == ["--audio-format", "mp3"]));
        // Audio has no resolution — keep the filename clean.
        assert!(args.iter().any(|a| a.contains("%(title)s.%(ext)s")));
        assert!(!args.iter().any(|a| a.contains("%(height)s")));
    }

    #[test]
    fn overwrite_and_keep_partial_flags() {
        let base = build_args(&opts("mp4"), None);
        assert!(!base.contains(&"--force-overwrites".to_string()));
        assert!(!base.contains(&"--keep-fragments".to_string()));

        let mut o = opts("mp4");
        o.overwrite = true;
        o.keep_partial = true;
        let args = build_args(&o, None);
        assert!(args.contains(&"--force-overwrites".to_string()));
        assert!(args.contains(&"--keep-fragments".to_string()));
    }

    #[test]
    fn ffmpeg_location_only_when_bundled() {
        assert!(!build_args(&opts("mp4"), None).contains(&"--ffmpeg-location".to_string()));
        let with = build_args(&opts("mp4"), Some(Path::new("/bin/ffmpeg")));
        assert!(with.contains(&"--ffmpeg-location".to_string()));
    }

    #[test]
    fn missing_output_directory_is_rejected_before_spawn() {
        let missing = std::env::temp_dir().join("fluss-does-not-exist-xyz");
        assert_eq!(
            check_output_directory(&missing.to_string_lossy()),
            Err(NO_OUTPUT_DIR.to_string())
        );
        // A real, writable directory passes.
        assert_eq!(check_output_directory(&std::env::temp_dir().to_string_lossy()), Ok(()));
    }

    #[test]
    fn a_file_is_not_a_valid_output_directory() {
        let file = std::env::temp_dir().join("fluss-not-a-dir.txt");
        fs::write(&file, b"x").unwrap();
        assert_eq!(
            check_output_directory(&file.to_string_lossy()),
            Err(NO_OUTPUT_DIR.to_string())
        );
        let _ = fs::remove_file(&file);
    }

    #[test]
    fn parses_progress_with_totals() {
        let ev = parse_progress("d1", "500 1000 1000 250 4", "downloading").unwrap();
        assert_eq!(ev.progress, 0.5);
        assert_eq!(ev.downloaded_bytes, Some(500.0));
        assert_eq!(ev.speed, Some(250.0));
        assert_eq!(ev.eta, Some(4.0));
        assert_eq!(ev.status, "downloading");
    }

    #[test]
    fn parses_progress_with_na_total_falls_back_to_estimate() {
        let ev = parse_progress("d1", "500 NA 2000 250 NA", "processing").unwrap();
        assert_eq!(ev.total_bytes, Some(2000.0));
        assert_eq!(ev.progress, 0.25);
        assert_eq!(ev.eta, None);
        assert_eq!(ev.status, "processing");
    }
}
