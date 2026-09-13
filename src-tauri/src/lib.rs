mod format;
mod volumes;

use format::{FormatCapabilities, FormatPreview, FormatResult};
use volumes::{EjectResult, Volume, VolumeSnapshot};

#[tauri::command]
fn list_volumes() -> Result<Vec<Volume>, String> {
    volumes::list_volumes()
}

#[tauri::command]
fn scan_path(path: String) -> Result<VolumeSnapshot, String> {
    volumes::scan_path(&path)
}

#[tauri::command]
fn read_file_head(path: String, max_bytes: u32) -> Result<Vec<u8>, String> {
    volumes::read_file_head(&path, max_bytes)
}

#[tauri::command]
fn format_capabilities() -> FormatCapabilities {
    format::format_capabilities()
}

#[tauri::command]
fn preview_format(path: String, filesystem: String) -> Result<FormatPreview, String> {
    format::preview_format(&path, &filesystem)
}

#[tauri::command]
fn format_volume(
    path: String,
    filesystem: String,
    label: String,
    confirmed: bool,
) -> Result<FormatResult, String> {
    format::format_volume(&path, &filesystem, &label, confirmed)
}

#[tauri::command]
fn eject_volume(path: String) -> Result<EjectResult, String> {
    volumes::eject_volume(&path)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            list_volumes,
            scan_path,
            read_file_head,
            format_capabilities,
            preview_format,
            format_volume,
            eject_volume
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
