use tauri::Manager;
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_window_state::{AppHandleExt, StateFlags};

// What's remembered about the window between launches
const WINDOW_STATE: StateFlags = StateFlags::SIZE
    .union(StateFlags::POSITION)
    .union(StateFlags::MAXIMIZED);

// Passed by the system when the app starts at login (see the autostart plugin below)
const AUTOSTART_ARG: &str = "--autostart";

fn launched_by_autostart() -> bool {
    std::env::args().any(|arg| arg == AUTOSTART_ARG)
}

fn show_main_window(app: &tauri::AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.unminimize();
        let _ = window.show();
        let _ = window.set_focus();
    }
}

// Lets the frontend decide whether to stay in the tray after starting at login
#[tauri::command]
fn started_at_login() -> bool {
    launched_by_autostart()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Must come first: a second launch just brings up the running app
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec![AUTOSTART_ARG]),
        ))
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        // Remembers folders the user picked in the dialog across restarts
        .plugin(tauri_plugin_persisted_scope::init())
        // Opens links (Settings → About) in the system browser
        .plugin(tauri_plugin_opener::init())
        // Daily reminders (see src/reminders.js)
        .plugin(tauri_plugin_notification::init())
        // Reopens the window with the size, position and maximized state it
        // had. Not its visibility (starting in the tray is the app's choice)
        // nor full screen. On Wayland the desktop places windows itself, so
        // there only the size and maximized state come back.
        .plugin(
            tauri_plugin_window_state::Builder::new()
                .with_state_flags(WINDOW_STATE)
                .build(),
        )
        // The plugin writes the state when the app quits; closing to the tray
        // only hides the window, so write it then too, in case the app never
        // quits normally (shutdown, a crash)
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { .. } = event {
                let _ = window.app_handle().save_window_state(WINDOW_STATE);
            }
        })
        .invoke_handler(tauri::generate_handler![started_at_login])
        .setup(|app| {
            // The window starts hidden (tauri.conf.json). A normal launch shows it
            // right away; after starting at login the frontend shows it unless the
            // user chose to start minimized in the tray.
            if !launched_by_autostart() {
                show_main_window(app.handle());
            }

            // Clicking a reminder brings up the app, also from the tray. As far as
            // the system reports it: on Windows only while the notification is on
            // screen (not from the Action Center), and only in the installed app.
            let handle = app.handle().clone();
            app.notification().on_action(move |action| {
                if action.action_id() == "tap" {
                    show_main_window(&handle);
                }
            })?;
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
