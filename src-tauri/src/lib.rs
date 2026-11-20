use std::{fs, path::PathBuf};

use serde::{Deserialize, Serialize};
use serde_json::Value;
use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, WindowEvent,
};
use tauri_plugin_window_state::{Builder as WindowStateBuilder, StateFlags};

const ALLOWED_FILES: [&str; 3] = ["todo.json", "memo.json", "settings.json"];

fn default_json(file_name: &str) -> &'static str {
    match file_name {
        "todo.json" => "[]",
        "memo.json" => r#"{"content":"","updatedAt":null}"#,
        "settings.json" => {
            r#"{"themeMode":"auto","alwaysOnTop":false,"editingLocked":false,"window":{"x":null,"y":null,"width":650,"height":420}}"#
        }
        _ => "{}",
    }
}

fn validate_file_name(file_name: &str) -> Result<(), String> {
    if ALLOWED_FILES.contains(&file_name) {
        Ok(())
    } else {
        Err("unsupported data file".to_string())
    }
}

fn data_file_path(app: &AppHandle, file_name: &str) -> Result<PathBuf, String> {
    validate_file_name(file_name)?;

    let dir = app
        .path()
        .app_data_dir()
        .map_err(|error| error.to_string())?;
    fs::create_dir_all(&dir).map_err(|error| error.to_string())?;

    Ok(dir.join(file_name))
}

#[tauri::command]
fn read_data_file(app: AppHandle, file_name: String) -> Result<Value, String> {
    let path = data_file_path(&app, &file_name)?;

    if !path.exists() {
        fs::write(&path, default_json(&file_name)).map_err(|error| error.to_string())?;
    }

    let content = fs::read_to_string(&path).map_err(|error| error.to_string())?;

    serde_json::from_str(&content).map_err(|error| error.to_string())
}

#[tauri::command]
fn write_data_file(app: AppHandle, file_name: String, data: Value) -> Result<(), String> {
    let path = data_file_path(&app, &file_name)?;
    let content = serde_json::to_string_pretty(&data).map_err(|error| error.to_string())?;

    fs::write(path, content).map_err(|error| error.to_string())?;
    if file_name == "todo.json" { let _ = app.emit("todos-changed", ()); }
    Ok(())
}

#[derive(Clone, Deserialize, Serialize)]
struct AreaPoint { x: f64, y: f64 }
#[derive(Clone, Deserialize, Serialize)]
struct AreaSize { width: f64, height: f64 }
#[derive(Clone, Deserialize, Serialize)]
struct PetArea { position: AreaPoint, size: AreaSize }

#[tauri::command]
fn start_pet_area_selection(app: AppHandle, window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "pet" { return Err("pet window required".into()); }
    let monitor = window.current_monitor().map_err(|e| e.to_string())?.ok_or("monitor unavailable")?;
    let area = monitor.work_area();
    let picker = app.get_webview_window("pet-area").ok_or("area picker unavailable")?;
    picker.set_position(area.position).map_err(|e| e.to_string())?;
    picker.set_size(area.size).map_err(|e| e.to_string())?;
    picker.emit("pet-area-opened", ()).map_err(|e| e.to_string())?;
    picker.show().map_err(|e| e.to_string())?;
    if let Err(error) = picker.set_focus() { let _ = picker.hide(); return Err(error.to_string()); }
    Ok(())
}

#[tauri::command]
fn finish_pet_area_selection(app: AppHandle, window: tauri::WebviewWindow, area: PetArea) -> Result<(), String> {
    if window.label() != "pet-area" { return Err("area picker required".into()); }
    let values = [area.position.x, area.position.y, area.size.width, area.size.height];
    let scale = window.scale_factor().map_err(|e| e.to_string())?;
    let size = window.inner_size().map_err(|e| e.to_string())?;
    if values.iter().any(|v| !v.is_finite()) || area.position.x < 0.0 || area.position.y < 0.0
        || area.size.width < 200.0 || area.size.height < 240.0
        || (area.position.x + area.size.width) * scale > f64::from(size.width) + 1.0
        || (area.position.y + area.size.height) * scale > f64::from(size.height) + 1.0 {
        return Err("invalid pet area".into());
    }
    let origin = window.inner_position().map_err(|e| e.to_string())?;
    let physical = PetArea {
        position: AreaPoint { x: (f64::from(origin.x) + area.position.x * scale).round(), y: (f64::from(origin.y) + area.position.y * scale).round() },
        size: AreaSize { width: (area.size.width * scale).round(), height: (area.size.height * scale).round() },
    };
    app.emit("pet-area-selected", physical).map_err(|e| e.to_string())?;
    window.hide().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn cancel_pet_area_selection(app: AppHandle, window: tauri::WebviewWindow) -> Result<(), String> {
    if window.label() != "pet-area" { return Err("area picker required".into()); }
    window.hide().map_err(|e| e.to_string())?;
    app.emit("pet-area-closed", ()).map_err(|e| e.to_string())
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    }
}

fn set_pet_visible(app: &AppHandle, visible: bool) -> Result<bool, String> {
    let window = app.get_webview_window("pet").ok_or("pet window is unavailable")?;
    let result = if visible { window.show() } else { window.hide() };
    result.map_err(|error| error.to_string())?;
    let _ = app.emit("pet-visibility-changed", visible);
    Ok(visible)
}

#[tauri::command]
fn get_pet_visibility(app: AppHandle) -> Result<bool, String> {
    app.get_webview_window("pet").ok_or("pet window is unavailable")?
        .is_visible().map_err(|error| error.to_string())
}

#[tauri::command]
fn set_pet_visibility(app: AppHandle, visible: bool) -> Result<bool, String> {
    set_pet_visible(&app, visible)
}

#[tauri::command]
fn toggle_pet_visibility(app: AppHandle) -> Result<bool, String> {
    let visible = get_pet_visibility(app.clone())?;
    set_pet_visible(&app, !visible)
}

#[tauri::command]
fn open_main_window(app: AppHandle) {
    show_main_window(&app);
}

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let show_item = MenuItem::with_id(app, "show", "显示", true, None::<&str>)?;
    let pin_item = MenuItem::with_id(app, "pin", "置顶", true, None::<&str>)?;
    let lock_item = MenuItem::with_id(app, "lock", "锁定", true, None::<&str>)?;
    let pet_item = MenuItem::with_id(app, "pet", "显示/隐藏桌宠", true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &pin_item, &lock_item, &pet_item, &quit_item])?;
    let icon = tauri::image::Image::from_bytes(include_bytes!("../icons/icon.png"))?;

    TrayIconBuilder::with_id("main-tray")
        .icon(icon)
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id().as_ref() {
            "show" => show_main_window(app),
            "pin" => {
                let _ = app.emit("tray-toggle-pin", ());
            }
            "lock" => {
                let _ = app.emit("tray-toggle-lock", ());
            }
            "quit" => app.exit(0),
            "pet" => { let _ = toggle_pet_visibility(app.clone()); }
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                show_main_window(tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .plugin(
            WindowStateBuilder::default()
                .with_state_flags(StateFlags::POSITION | StateFlags::SIZE)
                .build(),
        )
        .invoke_handler(tauri::generate_handler![read_data_file, write_data_file, get_pet_visibility, set_pet_visibility, toggle_pet_visibility, open_main_window, start_pet_area_selection, finish_pet_area_selection, cancel_pet_area_selection])
        .setup(|app| {
            create_tray(app.handle())?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let WindowEvent::CloseRequested { api, .. } = event {
                api.prevent_close();
                if window.label() == "pet" {
                    let _ = set_pet_visible(window.app_handle(), false);
                } else if window.label() == "pet-area" {
                    let _ = window.hide();
                    let _ = window.app_handle().emit("pet-area-closed", ());
                } else {
                    let _ = window.hide();
                }
            }
            if let WindowEvent::Focused(false) = event {
                if window.label() == "pet-area" {
                    let _ = window.hide();
                    let _ = window.app_handle().emit("pet-area-closed", ());
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running MemoFlow");
}
