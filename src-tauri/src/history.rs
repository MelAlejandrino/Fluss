use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::store;

// Persisted as a JSON array in the app-data dir (PLAN §31 — no SQLite). Rust
// just reads/writes the blob; the frontend owns the item shape.
fn history_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("history.json"))
}

#[tauri::command]
pub fn get_history(app: AppHandle) -> Result<Value, String> {
    store::read_json(&history_file(&app)?, Value::Array(vec![]))
}

#[tauri::command]
pub fn save_history(app: AppHandle, items: Value) -> Result<(), String> {
    store::write_json(&history_file(&app)?, &items)
}
