use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter, Manager, State};

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
    /// Title from a previous attempt, used to restore partial files on retry.
    #[serde(default)]
    pub previous_title: Option<String>,
    /// The title as the queue knows it now. A playlist item has one before it
    /// ever runs, which is what lets a partial left by an earlier attempt be
    /// found even when this attempt isn't a retry of it.
    #[serde(default)]
    pub title: Option<String>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DownloadResult {
    pub file_path: String,
    /// The file was already in the folder, so yt-dlp skipped the transfer.
    ///
    /// Not a failure and not something to work around — re-fetching a file you
    /// already have is the wrong thing to do. It's reported because otherwise a
    /// playlist of twelve "downloads" in two seconds, with no progress bar and
    /// no bytes, looks like the app is broken.
    pub already_existed: bool,
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
/// No FFmpeg anywhere — bundled copy missing (a build that skipped
/// `scripts/fetch-binaries`, or antivirus quarantine) and none on PATH.
pub const NO_FFMPEG: &str = "__NOFFMPEG__";

/// The output directory must exist and accept a file before we spawn yt-dlp —
/// otherwise the failure surfaces as opaque engine stderr minutes later.
fn check_output_directory(dir: &str) -> Result<(), String> {
    let path = Path::new(dir);
    if !path.is_dir() {
        // Something is already there and it isn't a folder. Nothing to create,
        // and "no permission" would be the wrong thing to say about a file.
        if path.exists() {
            return Err(NO_OUTPUT_DIR.to_string());
        }
        // A playlist saves into a folder of its own name, which by definition
        // doesn't exist the first time. Create it — but only the last segment:
        // if the parent is missing too, the whole location is gone (unplugged
        // drive, deleted tree), and quietly rebuilding it would write files
        // somewhere the user is no longer looking.
        match path.parent() {
            Some(parent) if parent.is_dir() => {
                fs::create_dir_all(path).map_err(|_| NO_WRITE_PERMISSION.to_string())?;
            }
            _ => return Err(NO_OUTPUT_DIR.to_string()),
        }
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
    // Every format we offer is post-processed — merged to mp4 or re-encoded to
    // mp3 — so a missing FFmpeg means the download can only end in failure.
    // Say so now rather than after the transfer.
    if !binaries::ffmpeg_available(&app) {
        log::error!("download {id}: no ffmpeg bundled and none on PATH");
        return Err(NO_FFMPEG.to_string());
    }

    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    let ffmpeg = binaries::bundled_path(&app, "ffmpeg");
    // Intermediates always go to our scratch directory, even for "Keep partial
    // files" — the thumbnail written for cover art is not something the user asked
    // to keep, and it can't be told apart from their own images once it lands in
    // their folder. Genuine partials are moved back out below.
    let scratch = scratch_dir(&app, &id);
    // `options` moves into the worker below; keep what the cleanup needs.
    let output_directory = options.output_directory.clone();
    let keep_partial = options.keep_partial;
    // If the user keeps partial files and this is a retry, restore the
    // previous attempt's `.part`/`.ytdl` files from the output directory into
    // the fresh scratch directory so yt-dlp can find them and resume.
    // Not gated on "Keep partial files": that setting decides whether partials
    // are *kept* when a download stops, not whether an existing one is used. A
    // half-downloaded file sitting in the folder should be picked up however it
    // got there — an earlier run, a crash, or the setting being switched on
    // after the fact.
    // Owned, because `options` moves into the worker below and the cleanup that
    // runs afterwards needs to know whose partials are whose.
    let titles: Vec<String> = [options.previous_title.clone(), options.title.clone()]
        .into_iter()
        .flatten()
        .collect();
    let restored = match &scratch {
        Some(s) => restore_partial_files(s, &options.output_directory, &titles),
        None => 0,
    };
    let args = build_args(&options, ffmpeg.as_deref(), scratch.as_deref());
    let mut extra = binaries::js_runtime_args(&app);
    extra.extend(binaries::solver_args());
    let cookies = crate::settings::cookie_args(&app);
    let with_cookies = [extra.clone(), cookies.clone()].concat();

    // Shared across attempts so a cancel that lands during the first one is
    // still seen by the second, instead of quietly starting a download the user
    // just stopped.
    let cancelled = Arc::new(AtomicBool::new(false));
    log::info!(
        "download {id}: {} {} → {}",
        options.format,
        options.quality.as_deref().unwrap_or("best"),
        options.output_directory
    );
    let mut result = attempt(
        &app,
        &registry,
        &id,
        &yt_dlp,
        &args,
        &with_cookies,
        &cancelled,
    )
    .await;

    // Browser sign-in is an optional boost. If the cookie store turns out to be
    // unreadable — browser uninstalled but its folder left behind, profile never
    // created, store locked — fall back to a signed-out run rather than failing
    // a download that would have worked without it.
    if let Err(err) = &result
        && !cookies.is_empty()
        && !cancelled.load(Ordering::SeqCst)
        && crate::settings::is_cookie_failure(err)
    {
        log::warn!("download {id}: browser cookies unusable, retrying signed-out");
        result = attempt(&app, &registry, &id, &yt_dlp, &args, &extra, &cancelled).await;
    }

    registry.0.lock().unwrap().remove(&id);

    if let Some(dir) = &scratch {
        // Only a failed or cancelled attempt has leftovers worth keeping — a
        // finished download makes its own partials dead weight.
        //
        // `restored > 0` matters as much as the setting: this attempt took a
        // partial out of the user's folder, and the scratch directory is about
        // to be deleted. Putting it back is not a feature, it's not leaving
        // someone worse off than if we had never looked.
        if (keep_partial || restored > 0) && result.is_err() {
            preserve_partial_artifacts(dir, &output_directory);
        } else if result.is_err() {
            // "Keep partial files" is off and we took nothing from the folder,
            // so clear this download's own leftovers — and only its own. The
            // sweep used to take every partial in the directory, which in a
            // playlist folder is twenty-nine other videos' progress.
            cleanup_partial_files(&output_directory, &titles);
        }
        // Whatever is left is ours and unwanted, however this ended.
        let _ = fs::remove_dir_all(dir);
    }
    if let Ok((file_path, _)) = &result {
        // Clears this file's partials from an earlier cancelled attempt, which
        // otherwise stayed in the folder forever once the retry succeeded.
        clear_stale_artifacts(&output_directory, file_path);
    }

    match result {
        Ok((file_path, already_existed)) => {
            if already_existed {
                log::info!("download {id}: already in the output folder, nothing fetched");
            } else {
                log::info!("download {id}: completed");
            }
            Ok(DownloadResult {
                file_path,
                already_existed,
            })
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

/// Per-download scratch directory for yt-dlp's intermediates (`.part` files and
/// the thumbnail it writes before embedding it).
///
/// The point is that this directory is *ours*: it can be removed wholesale when
/// the download ends, however it ends. The alternative — deleting files from the
/// user's own output folder — is what caused the v0.5.0 data-loss bug, and an
/// embedded thumbnail adds `.webp`/`.png` leftovers that can't be swept by
/// extension there without risking the user's own images.
fn scratch_dir(app: &AppHandle, id: &str) -> Option<PathBuf> {
    let dir = app.path().app_cache_dir().ok()?.join("partials").join(id);
    fs::create_dir_all(&dir).ok()?;
    Some(dir)
}

/// True only for yt-dlp's own intermediates: the in-progress `.part`, its
/// numbered `.part-FragN` pieces, and the `.ytdl` resume record.
///
/// Deliberately narrow. The output directory is the user's own folder — very
/// often their Videos folder — so anything that could plausibly be a file they
/// made or downloaded elsewhere is off limits (PLAN §24: never delete user
/// files unless they are *known* partial artifacts).
fn is_partial_artifact(path: &Path) -> bool {
    let Some(ext) = path.extension().and_then(|e| e.to_str()) else {
        return false;
    };
    let ext = ext.to_ascii_lowercase();
    ext == "part" || ext == "ytdl" || ext.starts_with("part-frag")
}

/// Moves yt-dlp's partial artifacts out of our scratch directory into the output
/// folder, for users who turned "Keep partial files" on and expect to find them.
///
/// The thumbnail intermediate is deliberately excluded — it isn't a partial
/// download, just leftover scaffolding from embedding cover art, and it was the
/// stray `.webp`/`.png` a cancelled download used to leave behind.
fn preserve_partial_artifacts(scratch: &Path, output_directory: &str) {
    let Ok(entries) = fs::read_dir(scratch) else {
        return;
    };
    for entry in entries.flatten() {
        let from = entry.path();
        if !from.is_file() || !is_partial_artifact(&from) {
            continue;
        }
        let Some(name) = from.file_name() else {
            continue;
        };
        let to = Path::new(output_directory).join(name);
        // Rename is atomic within a volume, but the cache directory and the
        // output folder can sit on different drives — fall back to a copy.
        if fs::rename(&from, &to).is_err() {
            let _ = fs::copy(&from, &to);
        }
    }
}

/// Everything a filename and a title still have in common after yt-dlp has
/// rewritten it: letters and digits, lowercased, with every run of anything
/// else collapsed to one space.
///
/// yt-dlp does not put the raw title on disk. On Windows it rewrites the
/// characters the filesystem refuses — a colon, a pipe and a slash all become
/// lookalike fullwidth characters — and the exact set has changed between
/// releases. Matching on what survives *any* such rewrite is the only version
/// of this that keeps working; guessing the substitutions (this used to guess
/// an underscore) silently failed for every title containing punctuation.
fn normalize_for_match(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut pending_space = false;
    for c in s.chars() {
        if c.is_alphanumeric() {
            if pending_space && !out.is_empty() {
                out.push(' ');
            }
            pending_space = false;
            out.extend(c.to_lowercase());
        } else {
            pending_space = true;
        }
    }
    out
}

/// Scans the output directory for partial artifacts belonging to this download
/// and moves them into the scratch directory, where yt-dlp finds them and
/// resumes instead of fetching the video again.
///
/// Matching is a prefix test on the normalised names, because yt-dlp's template
/// puts the title first and appends its own suffixes:
/// `Some Title [1080p].f399.mp4.part`.
///
/// A wrong match is harmless by construction. Only `.part`/`.ytdl`/`.part-FragN`
/// files are ever touched — never the user's media — and yt-dlp uses a restored
/// file only if it matches the destination filename it computes for itself;
/// anything else is ignored and swept away with the scratch directory.
/// A prefix that ends on a word boundary.
///
/// Plain `starts_with` matches "Episode 1" against "Episode 10", and in a
/// playlist folder those are two different videos: Episode 1 would take
/// Episode 10's partial, yt-dlp would ignore the file it can't use, and the
/// scratch directory it now lives in gets deleted when Episode 1 finishes.
/// Numbered titles make that the common case, not an edge case.
fn starts_with_word(haystack: &str, needle: &str) -> bool {
    // Both sides are normalised to space-separated words, so the only valid
    // continuations are "nothing" and "another word".
    haystack == needle
        || (haystack.len() > needle.len()
            && haystack.starts_with(needle)
            && haystack.as_bytes()[needle.len()] == b' ')
}

/// Returns how many artifacts were taken out of the output directory. The
/// caller owes them back if this attempt doesn't finish — see `start_download`.
/// The partial artifacts in `output_directory` that belong to one download.
///
/// Everything that touches partials goes through here. A playlist puts thirty
/// videos in one folder, so "every `.part` in the directory" is never the right
/// set — it's twenty-nine other people's downloads plus yours.
fn partials_for(output_directory: &str, titles: &[String]) -> Vec<PathBuf> {
    let needles: Vec<String> = titles
        .iter()
        .map(|t| normalize_for_match(t))
        // A one- or two-character needle would prefix-match half the folder.
        // Nothing is worth matching on that basis.
        .filter(|n| n.chars().count() >= 3)
        .collect();
    if needles.is_empty() {
        return Vec::new();
    }

    let Ok(entries) = fs::read_dir(Path::new(output_directory)) else {
        return Vec::new();
    };
    entries
        .flatten()
        .map(|entry| entry.path())
        .filter(|path| path.is_file() && is_partial_artifact(path))
        .filter(|path| {
            let name = path.file_name().unwrap_or_default().to_string_lossy();
            let normalized = normalize_for_match(&name);
            needles
                .iter()
                .any(|needle| starts_with_word(&normalized, needle))
        })
        .collect()
}

/// Returns how many artifacts were taken out of the output directory. The
/// caller owes them back if this attempt doesn't finish — see `start_download`.
fn restore_partial_files(scratch: &Path, output_directory: &str, titles: &[String]) -> usize {
    let found = partials_for(output_directory, titles);
    for from in &found {
        let Some(name) = from.file_name() else {
            continue;
        };
        let to = scratch.join(name);
        log::info!("resuming from partial: {}", name.to_string_lossy());
        if fs::rename(from, &to).is_err() {
            let _ = fs::copy(from, &to);
            // Clean up the original when copy was used (cross-volume) so the
            // partial doesn't live in both directories simultaneously.
            let _ = fs::remove_file(from);
        }
    }
    found.len()
}

/// Removes the partial artifacts belonging to a file that has now downloaded in
/// full — including ones left in the folder by an earlier cancelled attempt,
/// which nothing used to clean up once the retry succeeded.
///
/// Scoped to that file's own name. Another download's `.part` may belong to a
/// transfer still in flight, and deleting it would corrupt that download.
fn clear_stale_artifacts(output_directory: &str, file_path: &str) {
    let Some(stem) = Path::new(file_path).file_stem().and_then(|s| s.to_str()) else {
        return;
    };
    let Ok(entries) = fs::read_dir(Path::new(output_directory)) else {
        return;
    };
    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_file() || !is_partial_artifact(&path) {
            continue;
        }
        // The dot matters. yt-dlp names every artifact `<stem>.<something>`, so
        // a bare `starts_with` also swallows a *different* download whose title
        // merely begins with this one's — "Song.mp3" finishing would delete
        // "Song Remix.mp3.part" and the resume it represents.
        let name = entry.file_name().to_string_lossy().into_owned();
        if name.len() > stem.len()
            && name.starts_with(stem)
            && name.as_bytes()[stem.len()] == b'.'
        {
            let _ = fs::remove_file(&path);
        }
    }
}

/// Clears the failed attempt's leftovers when "Keep partial files" is off.
fn cleanup_partial_files(output_directory: &str, titles: &[String]) {
    for path in partials_for(output_directory, titles) {
        let _ = fs::remove_file(&path);
    }
}

/// One yt-dlp run: build the final argument list, spawn, register the job so it
/// can be cancelled, and stream it to completion.
async fn attempt(
    app: &AppHandle,
    registry: &DownloadRegistry,
    id: &str,
    yt_dlp: &Path,
    args: &[String],
    flags: &[String],
    cancelled: &Arc<AtomicBool>,
) -> Result<(String, bool), String> {
    // The JS-runtime, solver and cookie flags go before the trailing URL.
    let mut args = args.to_vec();
    let url = args.pop().expect("url is the last arg");
    args.extend(flags.iter().cloned());
    args.push(url);

    let mut cmd = Command::new(yt_dlp);
    cmd.args(&args)
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    binaries::prepare(&mut cmd);

    let mut child = cmd.spawn().map_err(|e| {
        log::error!("download {id}: could not spawn yt-dlp: {e}");
        format!("Could not start the downloader engine: {e}")
    })?;
    let stdout = child.stdout.take().expect("piped stdout");
    let stderr = child.stderr.take().expect("piped stderr");

    let child = Arc::new(Mutex::new(child));
    registry.0.lock().unwrap().insert(
        id.to_string(),
        Job {
            child: child.clone(),
            cancelled: cancelled.clone(),
        },
    );

    let app = app.clone();
    let id = id.to_string();
    tauri::async_runtime::spawn_blocking(move || run_to_completion(app, id, child, stdout, stderr))
        .await
        .map_err(|e| format!("Download task failed: {e}"))?
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
) -> Result<(String, bool), String> {
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
    let mut already_existed = false;

    for line in BufReader::new(stdout).lines().map_while(Result::ok) {
        if is_already_downloaded(&line) {
            already_existed = true;
        }
        if let Some(rest) = line.strip_prefix(PROGRESS_TAG) {
            let status = if seen_full {
                "processing"
            } else {
                "downloading"
            };
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
        Ok((file_path, already_existed))
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
        Err(tail)
    }
}

/// yt-dlp's way of saying it didn't transfer anything: the file is already
/// there. It still runs post-processing over it afterwards, which is why the
/// download otherwise looks like a normal, extremely fast success.
fn is_already_downloaded(line: &str) -> bool {
    line.contains("has already been downloaded")
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
fn build_args(
    options: &DownloadOptions,
    ffmpeg: Option<&Path>,
    scratch: Option<&Path>,
) -> Vec<String> {
    // Video filenames carry the resolution so the same source at different
    // qualities produces distinct files instead of colliding (yt-dlp would
    // otherwise skip the second as "already downloaded"). Audio has no
    // resolution, so it stays clean.
    //
    // The template is relative and the directory comes from `-P home:` — yt-dlp
    // ignores every `-P` when the output template carries a path of its own, and
    // `-P temp:` is the only thing that keeps intermediates out of the user's
    // folder.
    let output_template = match options.format.as_str() {
        "mp3" => "%(title)s.%(ext)s".to_string(),
        _ => "%(title)s [%(height)sp].%(ext)s".to_string(),
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
        // Title/artist/date into the container, cover art into the file, so
        // players and file managers show something useful. Both formats we emit
        // (mp4, mp3) support this; ffmpeg does the work.
        "--embed-metadata".into(),
        // ponytail: always on, no setting. Add a toggle if someone actually
        // wants bare files.
        "--embed-thumbnail".into(),
        // Windows caps a full path at 260 characters, and ours already spends
        // ~120 of them on the scratch directory (app cache + a UUID) before
        // yt-dlp appends `.f399.mp4.part`. Past that limit the download dies
        // *after* transferring, with "unable to open for writing". A very long
        // title loses its `[720p]` suffix to the trim, which is a far better
        // outcome than losing the download.
        "--trim-filenames".into(),
        "120".into(),
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

    args.push("-P".into());
    args.push(format!("home:{}", options.output_directory));
    if let Some(scratch) = scratch {
        // `.part` files and the thumbnail yt-dlp writes before embedding it land
        // here instead of beside the user's media, so a cancelled download leaves
        // nothing behind in their folder.
        args.push("-P".into());
        args.push(format!("temp:{}", scratch.to_string_lossy()));
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
            title: None,
            overwrite: false,
            keep_partial: false,
            previous_title: None,
        }
    }

    #[test]
    fn mp4_merges_to_mp4_and_url_is_last() {
        let args = build_args(&opts("mp4"), None, None);
        assert!(
            args.windows(2)
                .any(|w| w == ["--merge-output-format", "mp4"])
        );
        assert_eq!(args.last().unwrap(), "https://example.com/watch?v=x");
        // Without this the captured %(filepath)s loses emoji and open/reveal 404s.
        assert!(args.windows(2).any(|w| w == ["--encoding", "utf-8"]));
        // Resolution in the filename so qualities don't collide.
        assert!(
            args.iter()
                .any(|a| a.contains("%(title)s [%(height)sp].%(ext)s"))
        );
        // Title + thumbnail resolve before download starts (bulk-queued items
        // have no upfront analyze to get them from otherwise).
        assert!(
            args.iter()
                .any(|a| a.contains("before_dl:__FLUSSMETA__%(thumbnail)s %(title)s"))
        );
    }

    #[test]
    fn long_titles_are_trimmed_to_survive_the_windows_path_limit() {
        for format in ["mp4", "mp3"] {
            let args = build_args(&opts(format), None, None);
            let i = args
                .iter()
                .position(|a| a == "--trim-filenames")
                .unwrap_or_else(|| panic!("{format} must cap the filename length"));
            assert_eq!(args[i + 1], "120");
        }
    }

    #[test]
    fn both_formats_embed_metadata_and_cover_art() {
        for format in ["mp4", "mp3"] {
            let args = build_args(&opts(format), None, None);
            assert!(args.contains(&"--embed-metadata".to_string()), "{format}");
            assert!(args.contains(&"--embed-thumbnail".to_string()), "{format}");
        }
    }

    #[test]
    fn intermediates_are_written_to_our_scratch_dir_not_the_users_folder() {
        // The thumbnail yt-dlp writes before embedding it is not a `.part` file,
        // so cancelling used to leave a stray .webp/.png in the output folder.
        // `-P temp:` keeps it (and the `.part`) somewhere we can delete wholesale.
        let scratch = Path::new("/scratch/abc");
        let args = build_args(&opts("mp3"), None, Some(scratch));
        assert!(args.windows(2).any(|w| w == ["-P", "home:/out"]));
        assert!(
            args.windows(2)
                .any(|w| w[0] == "-P" && w[1] == format!("temp:{}", scratch.display()))
        );
        // yt-dlp ignores every -P when the template carries its own path, so the
        // template must stay relative for any of the above to take effect.
        let template = args
            .iter()
            .position(|a| a == "-o")
            .map(|i| args[i + 1].clone())
            .expect("-o is passed");
        assert!(
            !template.contains("/out"),
            "template must be relative: {template}"
        );
    }

    #[test]
    fn a_completed_download_clears_its_own_leftovers_only() {
        let dir = std::env::temp_dir().join("fluss-stale-test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        let finished = dir.join("Video [720p].mp4");
        fs::write(&finished, b"x").unwrap();
        // This file's own leftovers, including from the cancelled first attempt.
        let mine = [
            "Video [720p].mp4.part",
            "Video [720p].mp4.part-Frag0",
            "Video [720p].ytdl",
        ];
        // Another download's partial — possibly still being written to right now.
        // The third is the one a plain prefix test gets wrong: a different video
        // whose name simply starts with this one's.
        let others = [
            "Other Video.mp4.part",
            "Video [1080p].mp4.part",
            "Video [720p] Extended.mp4.part",
        ];
        for f in mine.iter().chain(others.iter()) {
            fs::write(dir.join(f), b"x").unwrap();
        }

        clear_stale_artifacts(&dir.to_string_lossy(), &finished.to_string_lossy());

        for f in mine {
            assert!(
                !dir.join(f).exists(),
                "{f} belongs to a finished download — should be gone"
            );
        }
        for f in others {
            assert!(
                dir.join(f).exists(),
                "{f} is another download's — must not be touched"
            );
        }
        assert!(finished.exists(), "the downloaded file itself must survive");
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn keep_partial_recovers_partials_but_never_the_thumbnail() {
        let base = std::env::temp_dir().join("fluss-preserve-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();

        // What yt-dlp leaves in scratch when a download is cancelled mid-flight.
        for f in ["Video.mp4.part", "Video.mp4.part-Frag0", "Video.ytdl"] {
            fs::write(scratch.join(f), b"x").unwrap();
        }
        // The cover-art scaffolding — not a partial download, and the reason a
        // cancelled mp3 used to leave a stray image in the user's folder.
        for f in ["Video.webp", "Video.png"] {
            fs::write(scratch.join(f), b"x").unwrap();
        }

        preserve_partial_artifacts(&scratch, &out.to_string_lossy());

        for f in ["Video.mp4.part", "Video.mp4.part-Frag0", "Video.ytdl"] {
            assert!(
                out.join(f).exists(),
                "{f} was kept on purpose — must be recovered"
            );
        }
        for f in ["Video.webp", "Video.png"] {
            assert!(
                !out.join(f).exists(),
                "{f} is embedding junk — must not reach the user"
            );
        }
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn restore_partial_files_copies_matching_partials_to_scratch() {
        let base = std::env::temp_dir().join("fluss-restore-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();

        // Partial files left in the output directory from a cancelled attempt.
        for f in [
            "My Great Video [720p].mp4.part",
            "My Great Video [720p].mp4.part-Frag0",
            "My Great Video [720p].mp4.ytdl",
        ] {
            fs::write(out.join(f), b"x").unwrap();
        }
        // Another download's partials — title doesn't start with "My Great Video".
        fs::write(out.join("Totally Different Song.mp3.part"), b"x").unwrap();
        // Edge case: title is a substring but not at the start.
        fs::write(out.join("Not My Great Video.mp4.part"), b"x").unwrap();

        restore_partial_files(
            &scratch,
            &out.to_string_lossy(),
            &["My Great Video".to_string()],
        );

        // Matching partials should now be in the scratch directory.
        for f in [
            "My Great Video [720p].mp4.part",
            "My Great Video [720p].mp4.part-Frag0",
            "My Great Video [720p].mp4.ytdl",
        ] {
            assert!(
                scratch.join(f).exists(),
                "{f} should be restored to scratch"
            );
            assert!(
                !out.join(f).exists(),
                "{f} should be moved out of output dir"
            );
        }
        // Other downloads' partials remain in the output directory.
        assert!(out.join("Totally Different Song.mp3.part").exists());
        assert!(out.join("Not My Great Video.mp4.part").exists());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn restore_partial_files_normalises_colon_in_title() {
        let base = std::env::temp_dir().join("fluss-restore-sanitise-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();

        // Raw title "Video: Part 2" → sanitised to "Video_ Part 2" in filename.
        fs::write(out.join("Video_ Part 2 [720p].mp4.part"), b"x").unwrap();
        fs::write(out.join("Video_ Part 2 [720p].mp4.ytdl"), b"x").unwrap();

        restore_partial_files(
            &scratch,
            &out.to_string_lossy(),
            &["Video: Part 2".to_string()],
        );

        assert!(scratch.join("Video_ Part 2 [720p].mp4.part").exists());
        assert!(scratch.join("Video_ Part 2 [720p].mp4.ytdl").exists());
        assert!(!out.join("Video_ Part 2 [720p].mp4.part").exists());
        assert!(!out.join("Video_ Part 2 [720p].mp4.ytdl").exists());
        let _ = fs::remove_dir_all(&base);
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
        assert_eq!(
            video_format(Some("360p")),
            "bv*[height<=360]+ba/b[height<=360]"
        );
        assert_eq!(
            video_format(Some("1080p")),
            "bv*[height<=1080]+ba/b[height<=1080]"
        );
        assert_eq!(
            video_format(Some("2160p")),
            "bv*[height<=2160]+ba/b[height<=2160]"
        );
    }

    #[test]
    fn mp4_360p_passes_height_cap_to_yt_dlp() {
        let mut o = opts("mp4");
        o.quality = Some("360p".into());
        let args = build_args(&o, None, None);
        assert!(args.iter().any(|a| a.contains("height<=360")));
    }

    #[test]
    fn mp3_extracts_audio_with_clean_name() {
        let args = build_args(&opts("mp3"), None, None);
        assert!(args.contains(&"-x".to_string()));
        assert!(args.windows(2).any(|w| w == ["--audio-format", "mp3"]));
        // Audio has no resolution — keep the filename clean.
        assert!(args.iter().any(|a| a.contains("%(title)s.%(ext)s")));
        assert!(!args.iter().any(|a| a.contains("%(height)s")));
    }

    #[test]
    fn overwrite_and_keep_partial_flags() {
        let base = build_args(&opts("mp4"), None, None);
        assert!(!base.contains(&"--force-overwrites".to_string()));
        assert!(!base.contains(&"--keep-fragments".to_string()));

        let mut o = opts("mp4");
        o.overwrite = true;
        o.keep_partial = true;
        let args = build_args(&o, None, None);
        assert!(args.contains(&"--force-overwrites".to_string()));
        assert!(args.contains(&"--keep-fragments".to_string()));
    }

    #[test]
    fn ffmpeg_location_only_when_bundled() {
        assert!(!build_args(&opts("mp4"), None, None).contains(&"--ffmpeg-location".to_string()));
        let with = build_args(&opts("mp4"), Some(Path::new("/bin/ffmpeg")), None);
        assert!(with.contains(&"--ffmpeg-location".to_string()));
    }

    #[test]
    fn missing_output_directory_is_rejected_before_spawn() {
        // Two levels missing: the location itself is gone, not just the folder
        // a playlist would have made inside it.
        let root = std::env::temp_dir().join("fluss-does-not-exist-xyz");
        // This function creates directories now, so a previous run may have
        // left one here. Start from actually-missing or the test proves nothing.
        let _ = fs::remove_dir_all(&root);
        let missing = root.join("nor-this");
        assert_eq!(
            check_output_directory(&missing.to_string_lossy()),
            Err(NO_OUTPUT_DIR.to_string())
        );
        // A real, writable directory passes.
        assert_eq!(
            check_output_directory(&std::env::temp_dir().to_string_lossy()),
            Ok(())
        );
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
    fn cleanup_removes_only_yt_dlp_intermediates() {
        let dir = std::env::temp_dir().join("fluss-cleanup-test");
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(&dir).unwrap();

        // The user's own media, in their own download folder. A failed download
        // must never touch these (PLAN §24).
        let keep = [
            "Holiday.mp4",
            "Album.mp3",
            "Clip.mkv",
            "Recording.mov",
            "notes.txt",
        ];
        for f in keep {
            fs::write(dir.join(f), b"x").unwrap();
        }
        // yt-dlp's own leftovers from the failed attempt.
        let sweep = ["Video.mp4.part", "Video.mp4.part-Frag0", "Video.ytdl"];
        for f in sweep {
            fs::write(dir.join(f), b"x").unwrap();
        }

        // A sibling video's kept partial. A playlist puts them all in one
        // folder, and sweeping the directory wholesale took every one of them.
        fs::write(dir.join("Another Video.mp4.part"), b"x").unwrap();

        cleanup_partial_files(&dir.to_string_lossy(), &["Video".to_string()]);

        assert!(
            dir.join("Another Video.mp4.part").exists(),
            "another download's partial must survive"
        );

        for f in keep {
            assert!(
                dir.join(f).exists(),
                "{f} is the user's file — must survive"
            );
        }
        for f in sweep {
            assert!(
                !dir.join(f).exists(),
                "{f} is an artifact — should be cleaned up"
            );
        }
        let _ = fs::remove_dir_all(&dir);
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

    #[test]
    fn a_missing_playlist_folder_is_created_not_refused() {
        let base = std::env::temp_dir().join("fluss-outdir-create-test");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&base).unwrap();
        let target = base.join("Road Trip");

        assert!(!target.is_dir());
        assert_eq!(check_output_directory(&target.to_string_lossy()), Ok(()));
        assert!(
            target.is_dir(),
            "the playlist folder should have been created"
        );
        // And the write probe cleaned up after itself.
        assert!(!target.join(".fluss-write-test").exists());

        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn a_folder_whose_parent_is_gone_is_still_refused() {
        // The unplugged-drive case: rebuilding the tree here would put files
        // somewhere the user can't find, so it stays an error.
        let missing = std::env::temp_dir()
            .join("fluss-outdir-missing-test")
            .join("gone")
            .join("Road Trip");
        let _ = fs::remove_dir_all(std::env::temp_dir().join("fluss-outdir-missing-test"));

        assert_eq!(
            check_output_directory(&missing.to_string_lossy()),
            Err(NO_OUTPUT_DIR.to_string())
        );
        assert!(!missing.exists());
    }

    #[test]
    fn an_existing_folder_is_accepted_unchanged() {
        let dir = std::env::temp_dir().join("fluss-outdir-existing-test");
        fs::create_dir_all(&dir).unwrap();
        assert_eq!(check_output_directory(&dir.to_string_lossy()), Ok(()));
        let _ = fs::remove_dir_all(&dir);
    }

    #[test]
    fn restore_matches_the_names_yt_dlp_actually_writes_on_windows() {
        // The bug this covers: the needle used to be built by replacing illegal
        // characters with an underscore, but yt-dlp writes fullwidth lookalikes.
        // Every title with a colon, pipe or slash in it silently failed to match
        // and the video restarted from zero with its partial sitting right there.
        let base = std::env::temp_dir().join("fluss-restore-fullwidth-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();

        let on_disk = format!(
            "Ep 3{} Hooks {} Deep Dive [1080p].f399.mp4.part",
            "：", "｜"
        );
        fs::write(out.join(&on_disk), b"x").unwrap();
        // A different video that merely shares the opening word.
        fs::write(out.join("Ep 4 Something Else [1080p].f399.mp4.part"), b"x").unwrap();

        restore_partial_files(
            &scratch,
            &out.to_string_lossy(),
            &["Ep 3: Hooks | Deep Dive".to_string()],
        );

        assert!(
            scratch.join(&on_disk).exists(),
            "the partial should have been found"
        );
        assert!(
            out.join("Ep 4 Something Else [1080p].f399.mp4.part")
                .exists()
        );
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn restore_falls_back_to_the_current_title() {
        // Not a retry — a fresh attempt at a video whose partial is already in
        // the folder. There is no previous title, only the one the queue holds.
        let base = std::env::temp_dir().join("fluss-restore-current-title-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();
        fs::write(out.join("Some Video [720p].mp4.part"), b"x").unwrap();

        restore_partial_files(
            &scratch,
            &out.to_string_lossy(),
            &["Some Video".to_string()],
        );

        assert!(scratch.join("Some Video [720p].mp4.part").exists());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn restore_does_nothing_without_a_usable_title() {
        let base = std::env::temp_dir().join("fluss-restore-notitle-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();
        fs::write(out.join("Anything [720p].mp4.part"), b"x").unwrap();

        // Nothing to match on, and a two-character title is too short to match
        // on safely — it would prefix-match half the folder.
        restore_partial_files(&scratch, &out.to_string_lossy(), &[]);
        restore_partial_files(&scratch, &out.to_string_lossy(), &["A!".to_string()]);

        assert!(out.join("Anything [720p].mp4.part").exists());
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn normalize_survives_any_substitution_scheme() {
        // Same title, three ways of writing it to disk.
        let raw = normalize_for_match("Ep 3: Hooks | Deep Dive");
        assert_eq!(normalize_for_match("Ep 3_ Hooks _ Deep Dive"), raw);
        assert_eq!(
            normalize_for_match(&format!("Ep 3{} Hooks {} Deep Dive", "：", "｜")),
            raw
        );
        // And the filename yt-dlp builds from it still starts with the title.
        assert!(
            normalize_for_match("Ep 3_ Hooks _ Deep Dive [1080p].f399.mp4.part").starts_with(&raw)
        );
    }

    #[test]
    fn recognises_the_line_yt_dlp_prints_when_it_skips() {
        // Without this the download reports a plain success: no bytes, no
        // progress, done in a second. Re-queueing a playlist you already have
        // then looks like twelve broken downloads instead of twelve files that
        // were already there.
        assert!(is_already_downloaded(
            r"[download] C:\Users\me\Videos\Road Trip\Ep 1.mp3 has already been downloaded"
        ));
        assert!(!is_already_downloaded(
            "[download] 4.2% of 20.14MiB at 300KiB/s"
        ));
        assert!(!is_already_downloaded("[download] Destination: Ep 1.mp3"));
    }

    #[test]
    fn restore_does_not_take_a_sibling_episodes_partial() {
        // "Episode 1" is a character-prefix of "Episode 10", and in a playlist
        // folder those are two different videos. Taking the wrong one is not
        // harmless: yt-dlp ignores the file it can't use, and the scratch
        // directory it was moved into is deleted when this download finishes.
        let base = std::env::temp_dir().join("fluss-restore-sibling-test");
        let scratch = base.join("scratch");
        let out = base.join("out");
        let _ = fs::remove_dir_all(&base);
        fs::create_dir_all(&scratch).unwrap();
        fs::create_dir_all(&out).unwrap();
        fs::write(out.join("Episode 10 [1080p].f399.mp4.part"), b"x").unwrap();
        fs::write(out.join("Episode 1 [1080p].f399.mp4.part"), b"x").unwrap();

        let taken =
            restore_partial_files(&scratch, &out.to_string_lossy(), &["Episode 1".to_string()]);

        assert_eq!(taken, 1);
        assert!(scratch.join("Episode 1 [1080p].f399.mp4.part").exists());
        assert!(
            out.join("Episode 10 [1080p].f399.mp4.part").exists(),
            "episode 10's partial must be left alone"
        );
        let _ = fs::remove_dir_all(&base);
    }

    #[test]
    fn word_prefix_stops_at_a_word_boundary() {
        assert!(starts_with_word("episode 1", "episode 1"));
        assert!(starts_with_word(
            "episode 1 1080p f399 mp4 part",
            "episode 1"
        ));
        assert!(!starts_with_word(
            "episode 10 1080p f399 mp4 part",
            "episode 1"
        ));
        assert!(!starts_with_word("epi", "episode"));
    }
}
