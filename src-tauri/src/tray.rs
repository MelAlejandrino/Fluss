use tauri::{
    image::Image,
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

const TRAY_ID: &str = "fluss-main";
const MENU_OPEN: &str = "tray-open";
const MENU_QUIT: &str = "tray-quit";

// Embed the icon at compile time so it's always available at runtime.
const TRAY_ICON_BYTES: &[u8] = include_bytes!("../icons/32x32.png");

/// Builds the system tray icon with its context menu and event handlers.
pub fn build_tray(app: &AppHandle) -> Result<(), Box<dyn std::error::Error>> {
    let open_item = MenuItemBuilder::with_id(MENU_OPEN, "Open Fluss")
        .build(app)?;
    let quit_item = MenuItemBuilder::with_id(MENU_QUIT, "Quit")
        .build(app)?;

    let menu = MenuBuilder::new(app)
        .item(&open_item)
        .separator()
        .item(&quit_item)
        .build()?;

    let icon = Image::from_bytes(TRAY_ICON_BYTES)?;

    let tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .menu(&menu)
        .tooltip("Fluss — Media Downloader")
        .show_menu_on_left_click(false)
        .build(app)?;

    // Left-click (non-menu) on the tray icon shows the window.
    tray.on_tray_icon_event(|tray, event| {
        if let TrayIconEvent::Click { button, .. } = event {
            if button == tauri::tray::MouseButton::Left {
                show_main_window(tray.app_handle());
            }
        }
    });

    // Menu item clicks.
    tray.on_menu_event(|app, event| {
        match event.id().as_ref() {
            MENU_OPEN => show_main_window(app),
            MENU_QUIT => {
                let _ = app.emit("tray-quit-request", ());
            }
            _ => {}
        }
    });

    log::info!("system tray created");
    Ok(())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}
