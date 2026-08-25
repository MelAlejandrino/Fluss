use serde_json::Value;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

use crate::store;

// The unfinished queue, as a JSON array in the app-data dir — same arrangement
// as history: Rust reads and writes the blob, the frontend owns the shape.
//
// Kept separate from history.json on purpose. History is a permanent record the
// user curates; this is scratch state that is rewritten constantly and is safe
// to lose. Sharing one file would put the record at risk on every enqueue.
fn queue_file(app: &AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("queue.json"))
}

#[tauri::command]
pub fn get_queue(app: AppHandle) -> Result<Value, String> {
    store::read_json(&queue_file(&app)?, Value::Array(vec![]))
}

#[tauri::command]
pub fn save_queue(app: AppHandle, items: Value) -> Result<(), String> {
    store::write_json(&queue_file(&app)?, &items)
}
