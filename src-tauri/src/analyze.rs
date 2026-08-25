use serde::Serialize;
use std::io::Read;
use std::process::{Child, Command, ExitStatus, Stdio};
use std::time::{Duration, Instant};
use tauri::AppHandle;

use crate::binaries;

/// Analysis is a metadata fetch — a couple of seconds normally. Without a bound
/// a stalled yt-dlp leaves the UI on "Analyzing…" with no way out but killing
/// the app, since the frontend blocks a second attempt while one is in flight.
const ANALYZE_TIMEOUT: Duration = Duration::from_secs(90);

/// Sentinel for "we gave up waiting" — `src/lib/errors.ts` turns it into a
/// message that says to try again, rather than blaming the media.
pub const TIMED_OUT: &str = "__TIMEOUT__";

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct VideoMetadata {
    pub id: String,
    pub title: String,
    pub thumbnail_url: Option<String>,
    pub duration: Option<f64>,
    pub uploader: Option<String>,
    pub webpage_url: String,
    /// Distinct video heights available, highest first — drives the quality UI.
    pub available_qualities: Vec<u32>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistEntry {
    pub url: String,
    pub title: String,
    pub duration: Option<f64>,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PlaylistMetadata {
    pub title: String,
    pub uploader: Option<String>,
    pub webpage_url: String,
    /// Flat listing only — one entry per video, no formats. Each entry is
    /// analyzed properly when it reaches the queue.
    pub entries: Vec<PlaylistEntry>,
}

/// Untagged on purpose: a playlist is told apart by its `entries` field, which
/// a video never carries. Saves the frontend a discriminator it would only
/// have to keep in sync.
#[derive(Serialize)]
#[serde(untagged)]
pub enum Analysis {
    Video(VideoMetadata),
    Playlist(PlaylistMetadata),
}

#[tauri::command]
pub async fn analyze_url(
    app: AppHandle,
    url: String,
    include_playlist: bool,
) -> Result<Analysis, String> {
    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    let js_runtime = binaries::js_runtime_args(&app);
    // Analysis hits the same bot wall as the download, so it needs the same
    // session cookies — otherwise a URL that downloads fine can't be previewed.
    let cookies = crate::settings::cookie_args(&app);

    // Off the UI/runtime thread — yt-dlp metadata fetch takes ~1-2s.
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(&yt_dlp);
        // `--flat-playlist` only bites when the URL resolves to a playlist: entries
        // come back as bare links instead of a full extraction per video, which is
        // the difference between a second and a minute for a long list.
        cmd.args(["--dump-single-json", "--flat-playlist"]);
        // A "watch?v=X&list=Y" link is both a video and a playlist, and only the
        // person who pasted it knows which they meant. Default to the video —
        // that's what the link points at — and let the UI ask for the list.
        if !include_playlist {
            cmd.arg("--no-playlist");
        }
        cmd.args(binaries::solver_args());
        cmd.args(&js_runtime);
        cmd.args(&cookies);
        cmd.arg(&url);
        cmd.stdout(Stdio::piped()).stderr(Stdio::piped());
        binaries::prepare(&mut cmd);

        let mut child = cmd
            .spawn()
            .map_err(|e| format!("Could not start the downloader engine: {e}"))?;

        // Drain both pipes on their own threads. A JSON dump easily exceeds the
        // pipe buffer, and a full buffer would block yt-dlp forever — which the
        // timeout below would then report as a stall we caused ourselves.
        let mut out = child.stdout.take().expect("piped stdout");
        let mut err = child.stderr.take().expect("piped stderr");
        let out_thread = std::thread::spawn(move || {
            let mut buf = Vec::new();
            let _ = out.read_to_end(&mut buf);
            buf
        });
        let err_thread = std::thread::spawn(move || {
            let mut buf = String::new();
            let _ = err.read_to_string(&mut buf);
            buf
        });

        let status = wait_with_timeout(&mut child, ANALYZE_TIMEOUT).inspect_err(|_| {
            log::error!("analyze timed out after {}s", ANALYZE_TIMEOUT.as_secs());
        })?;
        let stdout = out_thread.join().unwrap_or_default();
        let stderr = err_thread.join().unwrap_or_default();

        if !status.success() {
            let stderr = stderr.trim().to_string();
            log::error!("analyze failed: {stderr}");
            return Err(stderr);
        }

        let json: serde_json::Value = serde_json::from_slice(&stdout)
            .map_err(|e| format!("Could not read media details: {e}"))?;

        if json.get("_type").and_then(|v| v.as_str()) == Some("playlist") {
            Ok(Analysis::Playlist(normalize_playlist(&json, &url)))
        } else {
            Ok(Analysis::Video(normalize(&json, &url)))
        }
    })
    .await
    .map_err(|e| format!("Analysis task failed: {e}"))?
}

/// Waits for `child`, killing it and returning [`TIMED_OUT`] once `limit`
/// elapses. `std::process` has no timed wait, so this polls — the interval only
/// bounds how late we notice an exit, not how long analysis takes.
fn wait_with_timeout(child: &mut Child, limit: Duration) -> Result<ExitStatus, String> {
    let deadline = Instant::now() + limit;
    loop {
        match child.try_wait().map_err(|e| e.to_string())? {
            Some(status) => return Ok(status),
            None if Instant::now() >= deadline => {
                let _ = child.kill();
                let _ = child.wait(); // reap it, so the pipes close
                return Err(TIMED_OUT.to_string());
            }
            None => std::thread::sleep(Duration::from_millis(50)),
        }
    }
}



fn normalize(json: &serde_json::Value, fallback_url: &str) -> VideoMetadata {
    let str_field = |key: &str| json.get(key).and_then(|v| v.as_str()).map(String::from);

    VideoMetadata {
        id: str_field("id").unwrap_or_default(),
        title: str_field("title").unwrap_or_else(|| "Untitled".to_string()),
        thumbnail_url: str_field("thumbnail"),
        duration: json.get("duration").and_then(|v| v.as_f64()),
        uploader: str_field("uploader").or_else(|| str_field("channel")),
        webpage_url: str_field("webpage_url").unwrap_or_else(|| fallback_url.to_string()),
        available_qualities: available_qualities(json),
    }
}

fn normalize_playlist(json: &serde_json::Value, fallback_url: &str) -> PlaylistMetadata {
    let str_field = |key: &str| json.get(key).and_then(|v| v.as_str()).map(String::from);

    let entries = json
        .get("entries")
        .and_then(|e| e.as_array())
        .map(|entries| {
            entries
                .iter()
                // A channel page is a playlist of playlists ("Videos", "Shorts").
                // Those tabs are dropped rather than queued — each would expand
                // into a second list, which is not what one download row means.
                .filter(|e| e.get("_type").and_then(|t| t.as_str()) != Some("playlist"))
                .filter_map(|e| {
                    let url = e
                        .get("url")
                        .or_else(|| e.get("webpage_url"))
                        .and_then(|u| u.as_str())?;
                    Some(PlaylistEntry {
                        url: url.to_string(),
                        title: e
                            .get("title")
                            .and_then(|t| t.as_str())
                            .unwrap_or("Untitled")
                            .to_string(),
                        duration: e.get("duration").and_then(|d| d.as_f64()),
                    })
                })
                .collect()
        })
        .unwrap_or_default();

    PlaylistMetadata {
        title: str_field("title").unwrap_or_else(|| "Playlist".to_string()),
        uploader: str_field("uploader").or_else(|| str_field("channel")),
        webpage_url: str_field("webpage_url").unwrap_or_else(|| fallback_url.to_string()),
        entries,
    }
}

/// Distinct heights of the video-bearing formats, highest first.
fn available_qualities(json: &serde_json::Value) -> Vec<u32> {
    let mut heights: Vec<u32> = json
        .get("formats")
        .and_then(|f| f.as_array())
        .map(|formats| {
            formats
                .iter()
                .filter(|fmt| {
                    // Keep formats that actually carry video.
                    !matches!(fmt.get("vcodec").and_then(|v| v.as_str()), Some("none") | None)
                })
                .filter_map(|fmt| fmt.get("height").and_then(|h| h.as_u64()))
                .filter(|&h| h > 0)
                .map(|h| h as u32)
                .collect()
        })
        .unwrap_or_default();
    heights.sort_unstable();
    heights.dedup();
    heights.reverse();
    heights
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// A process that outlives any timeout we'd set in a test.
    fn slow_command() -> Command {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd");
            c.args(["/C", "ping -n 30 127.0.0.1"]);
            c
        } else {
            let mut c = Command::new("sleep");
            c.arg("30");
            c
        };
        cmd.stdout(Stdio::null()).stderr(Stdio::null());
        cmd
    }

    #[test]
    fn a_stalled_analysis_is_killed_not_waited_on_forever() {
        let mut child = slow_command().spawn().expect("spawn");
        let started = Instant::now();
        let result = wait_with_timeout(&mut child, Duration::from_millis(300));

        assert_eq!(result, Err(TIMED_OUT.to_string()));
        // Returned on the timeout, not after the process's own 30s.
        assert!(started.elapsed() < Duration::from_secs(5));
        // And it was actually killed — a second wait resolves immediately
        // rather than hanging, because the child is already reaped.
        assert!(child.try_wait().is_ok());
    }

    #[test]
    fn a_prompt_exit_returns_its_status() {
        let mut cmd = if cfg!(target_os = "windows") {
            let mut c = Command::new("cmd");
            c.args(["/C", "exit 0"]);
            c
        } else {
            Command::new("true")
        };
        cmd.stdout(Stdio::null()).stderr(Stdio::null());
        let mut child = cmd.spawn().expect("spawn");
        let status = wait_with_timeout(&mut child, Duration::from_secs(10)).expect("exited");
        assert!(status.success());
    }

    #[test]
    fn normalizes_a_full_payload() {
        let json = json!({
            "id": "abc123",
            "title": "A Video",
            "thumbnail": "https://img/1.jpg",
            "duration": 752.0,
            "uploader": "Someone",
            "webpage_url": "https://site/watch?v=abc123",
        });
        let m = normalize(&json, "https://fallback");
        assert_eq!(m.id, "abc123");
        assert_eq!(m.title, "A Video");
        assert_eq!(m.thumbnail_url.as_deref(), Some("https://img/1.jpg"));
        assert_eq!(m.duration, Some(752.0));
        assert_eq!(m.uploader.as_deref(), Some("Someone"));
        assert_eq!(m.webpage_url, "https://site/watch?v=abc123");
    }

    #[test]
    fn missing_fields_fall_back_instead_of_panicking() {
        let m = normalize(&json!({}), "https://fallback");
        assert_eq!(m.title, "Untitled");
        assert_eq!(m.webpage_url, "https://fallback");
        assert_eq!(m.id, "");
        assert!(m.thumbnail_url.is_none());
        assert!(m.available_qualities.is_empty());
    }

    #[test]
    fn uploader_falls_back_to_channel() {
        let m = normalize(&json!({ "channel": "The Channel" }), "u");
        assert_eq!(m.uploader.as_deref(), Some("The Channel"));
    }

    #[test]
    fn qualities_are_deduped_video_only_and_descending() {
        let json = json!({
            "formats": [
                { "vcodec": "none", "acodec": "mp4a", "height": 0 },      // audio-only
                { "vcodec": "avc1", "height": 720 },
                { "vcodec": "vp9",  "height": 1080 },
                { "vcodec": "avc1", "height": 720 },                       // duplicate
                { "acodec": "mp4a" },                                      // no vcodec key
                { "vcodec": "avc1", "height": 0 },                         // bogus height
            ]
        });
        assert_eq!(available_qualities(&json), vec![1080, 720]);
    }

    #[test]
    fn normalizes_a_playlist_and_drops_what_cannot_be_queued() {
        let json = json!({
            "_type": "playlist",
            "title": "Road Trip",
            "channel": "Someone",
            "webpage_url": "https://site/playlist?list=PL1",
            "entries": [
                { "url": "https://site/watch?v=a", "title": "One", "duration": 61.0 },
                { "webpage_url": "https://site/watch?v=b", "title": "Two" },
                // A channel tab: a list, not a video. Queuing it would expand
                // into another list.
                { "_type": "playlist", "url": "https://site/@x/shorts", "title": "Shorts" },
                // No link at all — nothing to download.
                { "title": "Private video" },
            ],
        });

        let p = normalize_playlist(&json, "https://fallback");
        assert_eq!(p.title, "Road Trip");
        assert_eq!(p.uploader.as_deref(), Some("Someone"));
        assert_eq!(p.entries.len(), 2);
        assert_eq!(p.entries[0].url, "https://site/watch?v=a");
        assert_eq!(p.entries[0].duration, Some(61.0));
        assert_eq!(p.entries[1].url, "https://site/watch?v=b");
    }

    #[test]
    fn a_playlist_serializes_with_entries_and_a_video_without() {
        let video = serde_json::to_value(Analysis::Video(normalize(
            &json!({ "id": "x", "title": "A Video" }),
            "https://site/watch?v=x",
        )))
        .unwrap();
        assert!(video.get("entries").is_none());

        let list = serde_json::to_value(Analysis::Playlist(normalize_playlist(
            &json!({ "_type": "playlist", "entries": [] }),
            "https://site/playlist?list=PL1",
        )))
        .unwrap();
        assert!(list.get("entries").is_some());
        // camelCase, like every other payload the frontend receives.
        assert!(list.get("webpageUrl").is_some());
    }
}
