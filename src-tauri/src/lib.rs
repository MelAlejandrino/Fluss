mod analyze;
mod binaries;
mod download;
mod files;
mod history;
mod settings;
mod store;
mod tray;

use std::sync::atomic::{AtomicBool, Ordering};
use tauri::{window::Color, Manager, State, Theme};

/// `--color-app` from src/index.css, per theme. The window sits behind the
/// webview, so this is what shows in the moment before the first paint and in
/// the not-yet-repainted strip while a window is being dragged larger. Left
/// unset it is white, which flashes hard against the dark theme.
///
/// Keep in sync with index.css and the pre-paint script in index.html.
const APP_BG_LIGHT: Color = Color(0xEC, 0xEF, 0xED, 0xFF);
const APP_BG_DARK: Color = Color(0x0E, 0x11, 0x0F, 0xFF);

/// When the tray "Quit" is clicked, we set this flag before calling window.close()
/// so the on_window_event handler lets the close through instead of hiding to tray.
struct ForceQuit(AtomicBool);

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
        .manage(ForceQuit(AtomicBool::new(false)))
        .setup(|app| {
            log::info!("Fluss {} started", app.package_info().version);
            if let Err(e) = tray::build_tray(app.handle()) {
                log::warn!("system tray setup failed: {e}");
            }
            apply_window_background(app.handle());
            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                let force = window.state::<ForceQuit>();
                if force.0.swap(false, Ordering::SeqCst) {
                    return; // real quit — let the window close
                }
                if settings::minimize_to_tray(window.app_handle()) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
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
            settings::engine_versions,
            settings::update_engine,
            force_quit
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// Paint the window in the app's own background colour instead of white.
///
/// Resolves the saved preference the same way the frontend does — an explicit
/// choice wins, "system" (and a missing/corrupt settings file) falls back to
/// whatever the OS reports. Best-effort: an unsupported platform or an
/// unreadable setting just leaves the default, so this can never block startup.
pub(crate) fn apply_window_background(app: &tauri::AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };
    let dark = match settings::theme_preference(app).as_str() {
        "dark" => true,
        "light" => false,
        _ => window.theme().map(|t| t == Theme::Dark).unwrap_or(false),
    };
    let color = if dark { APP_BG_DARK } else { APP_BG_LIGHT };
    if let Err(e) = window.set_background_color(Some(color)) {
        log::debug!("window background not applied: {e}");
    }
}

/// Called by the tray "Quit" menu. Sets the force-quit flag then closes the
/// window — the on_window_event handler sees the flag and lets it through.
#[tauri::command]
fn force_quit(state: State<'_, ForceQuit>, app: tauri::AppHandle) {
    state.0.store(true, Ordering::SeqCst);
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.close();
    }
}
