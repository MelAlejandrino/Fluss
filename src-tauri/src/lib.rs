mod analyze;
mod binaries;
mod download;
mod files;
mod history;
mod settings;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Logs to stderr in dev and to the OS log dir in release, so a user can
        // send a file when a download misbehaves (PLAN §46). URLs stay at debug
        // level — they can carry tokens in query params.
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        // Signed in-app updates (PLAN §29 is engine versions; this is Fluss
        // itself). `process` provides the relaunch after install.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .manage(download::DownloadRegistry::default())
        .setup(|app| {
            log::info!("Fluss {} started", app.package_info().version);
            Ok(())
        })
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
