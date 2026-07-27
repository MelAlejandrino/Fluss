mod analyze;
mod binaries;
mod download;
mod files;
mod history;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(download::DownloadRegistry::default())
        .invoke_handler(tauri::generate_handler![
            analyze::analyze_url,
            download::start_download,
            download::cancel_download,
            download::has_active_downloads,
            download::force_cancel_all,
            files::open_file,
            files::reveal_in_folder,
            files::open_url,
            history::get_history,
            history::save_history,
            settings::get_settings,
            settings::save_settings,
            settings::default_download_dir,
            settings::engine_versions
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
