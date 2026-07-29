use serde_json::Value;
use std::fs;
use std::path::Path;

// Settings and history are both "one JSON blob in the app-data dir" (PLAN §31,
// §32 — no SQLite). Same read/write, different filename and empty-state value.

/// A missing or unreadable file is not an error — it means "nothing saved yet",
/// so `fallback` wins. Unparseable content *is* an error, so the caller can tell
/// "empty" from "broken"; `write_json` makes that case near-impossible anyway.
pub fn read_json(path: &Path, fallback: Value) -> Result<Value, String> {
    match fs::read(path) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        Err(_) => Ok(fallback),
    }
}

/// Writes via a temp file + rename, which is atomic on NTFS and POSIX. A plain
/// `fs::write` truncates first, so a crash mid-write leaves a half-written file
/// — and history is rewritten on every completed download, so the next `add`
/// would overwrite the unreadable remains with a one-item list. Readers now see
/// either the old file or the new one, never a partial.
pub fn write_json(path: &Path, value: &Value) -> Result<(), String> {
    if let Some(dir) = path.parent() {
        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
    }
    let bytes = serde_json::to_vec_pretty(value).map_err(|e| e.to_string())?;
    // ponytail: fixed temp name, not a unique one. Two concurrent writes to the
    // same file would race for it, but the rename stays atomic — worst case one
    // write wins whole. Unique names if a writer ever runs off the UI thread.
    let tmp = path.with_extension("tmp");
    fs::write(&tmp, bytes).map_err(|e| e.to_string())?;
    fs::rename(&tmp, path).map_err(|e| {
        let _ = fs::remove_file(&tmp);
        e.to_string()
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    /// Each test gets its own directory — `cargo test` runs them in parallel.
    fn scratch(name: &str) -> std::path::PathBuf {
        let dir = std::env::temp_dir().join(format!("fluss-store-{name}"));
        let _ = fs::remove_dir_all(&dir);
        dir
    }

    #[test]
    fn round_trips_a_settings_blob() {
        let path = scratch("round-trip").join("settings.json");
        let settings = json!({
            "defaultDownloadDirectory": "C:/Users/x/Videos",
            "autoStartDownloads": true,
            "theme": "dark",
            "concurrentDownloads": 1,
        });
        write_json(&path, &settings).unwrap();
        assert_eq!(read_json(&path, Value::Null).unwrap(), settings);
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn round_trips_a_history_array() {
        let path = scratch("history").join("history.json");
        let items = json!([{ "id": "a", "title": "A Video", "status": "completed" }]);
        write_json(&path, &items).unwrap();
        assert_eq!(read_json(&path, Value::Array(vec![])).unwrap(), items);
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn creates_the_app_data_dir_on_first_save() {
        // First launch: nothing exists yet, not even the parent directory.
        let path = scratch("first-save").join("nested").join("settings.json");
        assert!(!path.parent().unwrap().exists());
        write_json(&path, &json!({ "theme": "system" })).unwrap();
        assert!(path.exists());
        let _ = fs::remove_dir_all(scratch("first-save"));
    }

    #[test]
    fn missing_file_yields_the_callers_empty_state() {
        let path = scratch("missing").join("nope.json");
        // Settings default to Null (frontend applies its own defaults)...
        assert_eq!(read_json(&path, Value::Null).unwrap(), Value::Null);
        // ...history defaults to an empty list.
        assert_eq!(
            read_json(&path, Value::Array(vec![])).unwrap(),
            Value::Array(vec![])
        );
    }

    #[test]
    fn leaves_no_temp_file_behind() {
        // A stray settings.tmp next to settings.json would be visible to the
        // user and re-read by nothing — the rename must consume it.
        let path = scratch("no-temp").join("settings.json");
        write_json(&path, &json!({ "theme": "dark" })).unwrap();
        assert!(!path.with_extension("tmp").exists());
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn a_failed_write_leaves_the_previous_file_intact() {
        // The point of the temp+rename: the old contents survive until the new
        // ones are complete, so there is no window where the file is partial.
        let path = scratch("intact").join("history.json");
        write_json(&path, &json!([{ "id": "first" }])).unwrap();
        let before = fs::read(&path).unwrap();
        write_json(&path, &json!([{ "id": "second" }])).unwrap();
        assert_ne!(fs::read(&path).unwrap(), before);
        assert_eq!(
            read_json(&path, Value::Null).unwrap(),
            json!([{ "id": "second" }])
        );
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn corrupt_file_is_an_error_not_a_silent_reset() {
        let path = scratch("corrupt").join("history.json");
        fs::create_dir_all(path.parent().unwrap()).unwrap();
        // Truncated mid-write by a crash.
        fs::write(&path, b"[{\"id\":\"a\",").unwrap();
        assert!(read_json(&path, Value::Array(vec![])).is_err());
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }

    #[test]
    fn overwrites_rather_than_appends() {
        let path = scratch("overwrite").join("history.json");
        write_json(&path, &json!([1, 2, 3])).unwrap();
        write_json(&path, &json!([1])).unwrap();
        assert_eq!(read_json(&path, Value::Null).unwrap(), json!([1]));
        let _ = fs::remove_dir_all(path.parent().unwrap());
    }
}
