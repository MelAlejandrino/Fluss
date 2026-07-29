use std::path::Path;
use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;

// Sentinel the UI maps to "moved or deleted".
const MISSING: &str = "missing";

/// History outlives the files it points at — a download can be moved or deleted
/// between finishing and the user clicking Open. Check before handing the path
/// to the OS, which would otherwise fail with something unreadable.
fn ensure_exists(path: &str) -> Result<(), String> {
    if Path::new(path).exists() {
        Ok(())
    } else {
        Err(MISSING.into())
    }
}

/// Open a file with its default application.
#[tauri::command]
pub fn open_file(app: AppHandle, path: String) -> Result<(), String> {
    ensure_exists(&path)?;
    app.opener()
        .open_path(path, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Open a URL in the default browser.
#[tauri::command]
pub fn open_url(app: AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| e.to_string())
}

/// Reveal a file in the OS file manager, highlighting it.
#[tauri::command]
pub fn reveal_in_folder(app: AppHandle, path: String) -> Result<(), String> {
    ensure_exists(&path)?;
    app.opener()
        .reveal_item_in_dir(&path)
        .map_err(|e| e.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_deleted_file_reports_missing() {
        let path = std::env::temp_dir().join("fluss-files-gone.mp4");
        let _ = std::fs::remove_file(&path);
        assert_eq!(
            ensure_exists(&path.to_string_lossy()),
            Err(MISSING.to_string())
        );
        assert_eq!(ensure_exists(""), Err(MISSING.to_string()));
    }

    #[test]
    fn an_existing_file_passes() {
        let path = std::env::temp_dir().join("fluss-files-here.mp4");
        std::fs::write(&path, b"x").unwrap();
        assert_eq!(ensure_exists(&path.to_string_lossy()), Ok(()));
        let _ = std::fs::remove_file(&path);
    }
}
