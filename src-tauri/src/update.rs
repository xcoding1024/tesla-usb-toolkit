use std::fs::{self, File};
use std::io::Write;
use std::path::{Path, PathBuf};
use std::sync::OnceLock;
use std::time::Duration;

use futures_util::StreamExt;
use serde::Serialize;
use tauri::{AppHandle, Emitter};
use tauri_plugin_opener::OpenerExt;

const GITHUB_REPO: &str = "xcoding1024/tesla-usb-toolkit";
const LATEST_RELEASE_URL: &str =
    "https://api.github.com/repos/xcoding1024/tesla-usb-toolkit/releases/latest";
const ATOM_URL: &str = "https://github.com/xcoding1024/tesla-usb-toolkit/releases.atom";
const DOWNLOAD_PREFIX: &str =
    "https://github.com/xcoding1024/tesla-usb-toolkit/releases/download/";
const RELEASE_PAGE_PREFIX: &str = "https://github.com/xcoding1024/tesla-usb-toolkit";

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppInfo {
    pub version: String,
    pub platform: String,
    pub arch: String,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
struct DownloadProgress {
    downloaded: u64,
    total: Option<u64>,
}

fn http_client() -> Result<&'static reqwest::Client, String> {
    static CLIENT: OnceLock<reqwest::Client> = OnceLock::new();
    if let Some(client) = CLIENT.get() {
        return Ok(client);
    }
    let client = reqwest::Client::builder()
        .user_agent(format!("USB-Toolkit-for-Tesla/{}", env!("CARGO_PKG_VERSION")))
        .redirect(reqwest::redirect::Policy::limited(10))
        .build()
        .map_err(|err| err.to_string())?;
    let _ = CLIENT.set(client);
    CLIENT.get().ok_or_else(|| "http_client".to_string())
}

fn host_platform() -> &'static str {
    if cfg!(target_os = "windows") {
        "windows"
    } else if cfg!(target_os = "macos") {
        "macos"
    } else if cfg!(target_os = "linux") {
        "linux"
    } else {
        "unknown"
    }
}

fn host_arch() -> &'static str {
    match std::env::consts::ARCH {
        "x86_64" => "x86_64",
        "aarch64" => "aarch64",
        other => other,
    }
}

pub fn is_allowed_download_url(url: &str) -> bool {
    url.starts_with(DOWNLOAD_PREFIX)
}

pub fn is_allowed_release_url(url: &str) -> bool {
    url.starts_with(RELEASE_PAGE_PREFIX)
}

pub fn sanitize_installer_filename(name: &str) -> Result<String, String> {
    let base = name.trim();
    if base.is_empty() || base.contains('/') || base.contains('\\') || base.contains("..") {
        return Err("invalid_filename".into());
    }
    let lower = base.to_ascii_lowercase();
    if !(lower.ends_with(".dmg") || lower.ends_with(".msi") || lower.ends_with(".exe")) {
        return Err("invalid_filename".into());
    }
    Ok(base.to_string())
}

fn download_dir() -> Result<PathBuf, String> {
    dirs::download_dir()
        .or_else(dirs::home_dir)
        .ok_or_else(|| "no_download_dir".to_string())
}

#[tauri::command]
pub fn app_info() -> AppInfo {
    AppInfo {
        version: env!("CARGO_PKG_VERSION").into(),
        platform: host_platform().into(),
        arch: host_arch().into(),
    }
}

#[tauri::command]
pub async fn fetch_latest_github_release() -> Result<serde_json::Value, String> {
    let response = http_client()?
        .get(LATEST_RELEASE_URL)
        .header("Accept", "application/vnd.github+json")
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|err| err.to_string())?;
    if !response.status().is_success() {
        return Err(format!("http_{}", response.status().as_u16()));
    }
    response.json().await.map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn fetch_github_releases_atom() -> Result<String, String> {
    let response = http_client()?
        .get(ATOM_URL)
        .timeout(Duration::from_secs(30))
        .send()
        .await
        .map_err(|err| err.to_string())?;
    if !response.status().is_success() {
        return Err(format!("http_{}", response.status().as_u16()));
    }
    response.text().await.map_err(|err| err.to_string())
}

#[tauri::command]
pub async fn download_update_asset(
    app: AppHandle,
    url: String,
    filename: String,
    expected_size: Option<u64>,
) -> Result<String, String> {
    if !is_allowed_download_url(&url) {
        return Err("invalid_url".into());
    }
    let filename = sanitize_installer_filename(&filename)?;
    let dest = download_dir()?.join(&filename);
    if let Some(expected) = expected_size {
        if expected > 0 && dest.is_file() {
            if let Ok(meta) = dest.metadata() {
                if meta.len() == expected {
                    return Ok(dest.to_string_lossy().into_owned());
                }
            }
        }
    }

    let response = http_client()?
        .get(&url)
        .send()
        .await
        .map_err(|err| err.to_string())?;
    if !response.status().is_success() {
        return Err(format!("http_{}", response.status().as_u16()));
    }

    let total = response.content_length().or(expected_size);
    let part = dest.with_file_name(format!("{filename}.part"));
    if let Some(parent) = dest.parent() {
        fs::create_dir_all(parent).map_err(|err| err.to_string())?;
    }
    let mut file = File::create(&part).map_err(|err| err.to_string())?;
    let mut downloaded = 0_u64;
    let mut stream = response.bytes_stream();
    while let Some(chunk) = stream.next().await {
        let bytes = match chunk {
            Ok(bytes) => bytes,
            Err(err) => {
                let _ = fs::remove_file(&part);
                return Err(err.to_string());
            }
        };
        if let Err(err) = file.write_all(&bytes) {
            let _ = fs::remove_file(&part);
            return Err(err.to_string());
        }
        downloaded += bytes.len() as u64;
        let _ = app.emit(
            "update-download-progress",
            DownloadProgress {
                downloaded,
                total,
            },
        );
    }
    drop(file);
    fs::rename(&part, &dest).map_err(|err| {
        let _ = fs::remove_file(&part);
        err.to_string()
    })?;
    Ok(dest.to_string_lossy().into_owned())
}

#[tauri::command]
pub fn open_update_installer(app: AppHandle, path: String) -> Result<(), String> {
    let file = Path::new(&path);
    let name = file
        .file_name()
        .and_then(|value| value.to_str())
        .ok_or_else(|| "invalid_filename".to_string())?;
    sanitize_installer_filename(name)?;
    if !file.is_file() {
        return Err("missing_file".into());
    }
    app.opener()
        .open_path(&path, None::<&str>)
        .map_err(|err| err.to_string())
}

#[tauri::command]
pub fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    if !is_allowed_release_url(&url) {
        return Err("invalid_url".into());
    }
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|err| err.to_string())
}

#[allow(dead_code)]
pub fn github_repo() -> &'static str {
    GITHUB_REPO
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn allows_only_this_repo_download_urls() {
        assert!(is_allowed_download_url(
            "https://github.com/xcoding1024/tesla-usb-toolkit/releases/download/v0.1.0/app.dmg"
        ));
        assert!(!is_allowed_download_url("https://evil.example/app.dmg"));
    }

    #[test]
    fn rejects_unsafe_installer_names() {
        assert!(sanitize_installer_filename("USB.Toolkit.for.Tesla_0.1.0_aarch64.dmg").is_ok());
        assert!(sanitize_installer_filename("../app.dmg").is_err());
        assert!(sanitize_installer_filename("notes.txt").is_err());
    }
}
