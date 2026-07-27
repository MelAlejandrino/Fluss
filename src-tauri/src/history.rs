use serde_json::Value;
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

// Persisted as a JSON array in the app-data dir (PLAN §31 — no SQLite). Rust
// just reads/writes the blob; the frontend owns the item shape.
fn history_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("history.json"))
}

#[tauri::command]
pub fn get_history(app: AppHandle) -> Result<Value, String> {
    match fs::read(history_file(&app)?) {
        Ok(bytes) => serde_json::from_slice(&bytes).map_err(|e| e.to_string()),
        Err(_) => Ok(Value::Array(vec![])), // no file yet
    }
}

#[tauri::command]
pub fn save_history(app: AppHandle, items: Value) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let bytes = serde_json::to_vec_pretty(&items).map_err(|e| e.to_string())?;
    fs::write(dir.join("history.json"), bytes).map_err(|e| e.to_string())
}
