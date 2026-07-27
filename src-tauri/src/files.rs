use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

// Sentinel the UI maps to "moved or deleted".
const MISSING: &str = "missing";

/// Open a file with its default application.
#[tauri::command]
pub fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(MISSING.into());
    }
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Reveal a file in the OS file manager, highlighting it.
#[tauri::command]
pub fn reveal_in_folder(app: AppHandle, path: String) -> Result<(), String> {
    if !Path::new(&path).exists() {
        return Err(MISSING.into());
    }
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}
