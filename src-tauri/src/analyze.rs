use serde::Serialize;
use std::process::Command;
use tauri::AppHandle;

use crate::binaries;

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

#[tauri::command]
pub async fn analyze_url(app: AppHandle, url: String) -> Result<VideoMetadata, String> {
    let yt_dlp = binaries::resolve(&app, "yt-dlp");
    let js_runtime = binaries::js_runtime_args(&app);

    // Off the UI/runtime thread — yt-dlp metadata fetch takes ~1-2s.
    tauri::async_runtime::spawn_blocking(move || {
        let mut cmd = Command::new(&yt_dlp);
        cmd.args(["--dump-single-json", "--no-playlist"]);
        cmd.args(&js_runtime);
        cmd.arg(&url);
        binaries::prepare(&mut cmd);

        let output = cmd
            .output()
            .map_err(|e| format!("Could not start the downloader engine: {e}"))?;

        if !output.status.success() {
            return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());
        }

        let json: serde_json::Value = serde_json::from_slice(&output.stdout)
            .map_err(|e| format!("Could not read media details: {e}"))?;

        Ok(normalize(&json, &url))
    })
    .await
    .map_err(|e| format!("Analysis task failed: {e}"))?
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
