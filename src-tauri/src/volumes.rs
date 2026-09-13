use serde::Serialize;
#[cfg(any(target_os = "linux", target_os = "windows"))]
use serde_json::Value;
use std::fs;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::process::Command;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    pub id: String,
    pub name: String,
    pub path: String,
    pub filesystem: Option<String>,
    pub total_bytes: Option<u64>,
    pub free_bytes: Option<u64>,
    pub kind: String,
    pub platform: String,
    pub device: Option<String>,
    pub is_system: bool,
    pub format_eligible: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct EjectResult {
    pub ok: bool,
    pub path: String,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct RootEntry {
    pub name: String,
    pub is_dir: bool,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct DirCount {
    pub exists: bool,
    pub item_count: u64,
    pub bytes: Option<u64>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct WrapFile {
    pub name: String,
    pub folder: String,
    pub path: Option<String>,
    pub bytes: Option<u64>,
    pub width: Option<u32>,
    pub height: Option<u32>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ListedFile {
    pub name: String,
    pub path: String,
    pub bytes: u64,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeslaCamClip {
    pub name: String,
    pub path: String,
    pub bytes: u64,
    pub category: String,
    pub event_folder: Option<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct TeslaCamScan {
    pub present: bool,
    pub recent_clips: DirCount,
    pub saved_clips: DirCount,
    pub sentry_clips: DirCount,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct VolumeSnapshot {
    pub path: String,
    pub filesystem: Option<String>,
    pub total_bytes: Option<u64>,
    pub free_bytes: Option<u64>,
    pub root_entries: Vec<RootEntry>,
    pub tesla_cam: Option<TeslaCamScan>,
    pub light_show_files: Vec<String>,
    pub boombox_files: Vec<String>,
    pub has_lock_chime: bool,
    pub audio_files_at_root: Vec<String>,
    pub wrap_files: Vec<WrapFile>,
    pub tesla_cam_clips: Vec<TeslaCamClip>,
    pub light_show_listing: Vec<ListedFile>,
    pub boombox_listing: Vec<ListedFile>,
    pub lock_chime_file: Option<ListedFile>,
}

const AUDIO_EXT: &[&str] = &["mp3", "aac", "flac", "wav", "m4a", "ogg", "aiff"];

pub fn list_volumes() -> Result<Vec<Volume>, String> {
    #[cfg(target_os = "linux")]
    {
        list_volumes_linux()
    }
    #[cfg(target_os = "macos")]
    {
        list_volumes_macos()
    }
    #[cfg(target_os = "windows")]
    {
        list_volumes_windows()
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        Ok(Vec::new())
    }
}

pub fn scan_path(path: &str) -> Result<VolumeSnapshot, String> {
    let root = PathBuf::from(path);
    if !root.is_dir() {
        return Err(format!("路径不是目录：{path}"));
    }

    let mut root_entries = Vec::new();
    let mut tesla_cam = None;
    let mut light_show_files = Vec::new();
    let mut boombox_files = Vec::new();
    let mut has_lock_chime = false;
    let mut audio_files_at_root = Vec::new();
    let mut wrap_files = Vec::new();
    let mut tesla_cam_clips = Vec::new();
    let mut light_show_listing = Vec::new();
    let mut boombox_listing = Vec::new();
    let mut lock_chime_file = None;

    let reader = fs::read_dir(&root).map_err(|e| format!("无法读取目录 {path}：{e}"))?;
    for entry in reader {
        let entry = entry.map_err(|e| e.to_string())?;
        let name = entry.file_name().to_string_lossy().to_string();
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        root_entries.push(RootEntry {
            name: name.clone(),
            is_dir,
        });

        if !is_dir && name == "LockChime.wav" {
            has_lock_chime = true;
            lock_chime_file = listed_file(&entry.path());
        }

        if !is_dir && is_audio_file(&name) && name != "LockChime.wav" {
            audio_files_at_root.push(name.clone());
        }

        if is_dir && name == "TeslaCam" {
            tesla_cam = Some(scan_tesla_cam(&entry.path()));
            tesla_cam_clips = scan_tesla_cam_clips(&entry.path());
        }
        if is_dir && name == "LightShow" {
            light_show_listing = list_files_detailed(&entry.path());
            light_show_files = light_show_listing.iter().map(|f| f.name.clone()).collect();
        }
        if is_dir && name == "Boombox" {
            boombox_listing = list_files_detailed(&entry.path());
            boombox_files = boombox_listing.iter().map(|f| f.name.clone()).collect();
        }
        if is_dir && (name == "Wraps" || name == "LicensePlate") {
            wrap_files.extend(scan_wrap_files(&entry.path(), &name));
        }
    }

    root_entries.sort_by(|a, b| a.name.cmp(&b.name));

    let stats = volume_stats(&root);

    Ok(VolumeSnapshot {
        path: path.to_string(),
        filesystem: stats.filesystem,
        total_bytes: stats.total_bytes,
        free_bytes: stats.free_bytes,
        root_entries,
        tesla_cam,
        light_show_files,
        boombox_files,
        has_lock_chime,
        audio_files_at_root,
        wrap_files,
        tesla_cam_clips,
        light_show_listing,
        boombox_listing,
        lock_chime_file,
    })
}

pub fn read_file_head(path: &str, max_bytes: u32) -> Result<Vec<u8>, String> {
    let limit = (max_bytes as usize).clamp(1, 4096);
    let mut file = fs::File::open(path).map_err(|e| format!("无法读取文件 {path}：{e}"))?;
    let mut buf = vec![0u8; limit];
    let n = file.read(&mut buf).map_err(|e| format!("读取文件头失败：{e}"))?;
    buf.truncate(n);
    Ok(buf)
}

struct VolumeStats {
    filesystem: Option<String>,
    total_bytes: Option<u64>,
    free_bytes: Option<u64>,
}

fn volume_stats(path: &Path) -> VolumeStats {
    #[cfg(target_os = "linux")]
    {
        linux_stats(path)
    }
    #[cfg(target_os = "macos")]
    {
        macos_stats(path)
    }
    #[cfg(target_os = "windows")]
    {
        windows_stats(path)
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        VolumeStats {
            filesystem: None,
            total_bytes: None,
            free_bytes: None,
        }
    }
}

const VIDEO_EXT: &[&str] = &["mp4", "mov", "m4v"];

fn extension_in(name: &str, allowed: &[&str]) -> bool {
    Path::new(name)
        .extension()
        .and_then(|e| e.to_str())
        .map(|ext| allowed.iter().any(|a| ext.eq_ignore_ascii_case(a)))
        .unwrap_or(false)
}

fn is_audio_file(name: &str) -> bool {
    extension_in(name, AUDIO_EXT)
}

fn is_video_file(name: &str) -> bool {
    extension_in(name, VIDEO_EXT)
}

fn listed_file(path: &Path) -> Option<ListedFile> {
    let name = path.file_name()?.to_string_lossy().to_string();
    let bytes = fs::metadata(path).ok()?.len();
    Some(ListedFile {
        name,
        path: path.to_string_lossy().to_string(),
        bytes,
    })
}

fn list_files_detailed(path: &Path) -> Vec<ListedFile> {
    let mut files = Vec::new();
    let Ok(reader) = fs::read_dir(path) else {
        return files;
    };
    for entry in reader.flatten() {
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            if let Some(file) = listed_file(&entry.path()) {
                files.push(file);
            }
        }
    }
    files.sort_by(|a, b| a.name.cmp(&b.name));
    files
}

fn scan_tesla_cam_clips(root: &Path) -> Vec<TeslaCamClip> {
    let mut clips = Vec::new();
    collect_event_or_files(&root.join("RecentClips"), "recent", &mut clips);
    collect_event_or_files(&root.join("SavedClips"), "saved", &mut clips);
    collect_event_or_files(&root.join("SentryClips"), "sentry", &mut clips);
    clips.sort_by(|a, b| a.path.cmp(&b.path));
    clips
}

fn collect_event_or_files(dir: &Path, category: &str, out: &mut Vec<TeslaCamClip>) {
    let Ok(reader) = fs::read_dir(dir) else {
        return;
    };
    for entry in reader.flatten() {
        let is_dir = entry.file_type().map(|t| t.is_dir()).unwrap_or(false);
        if is_dir {
            let folder = entry.file_name().to_string_lossy().to_string();
            collect_clip_files(&entry.path(), category, Some(folder), out);
        } else if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            push_clip(&entry.path(), category, None, out);
        }
    }
}

fn collect_clip_files(dir: &Path, category: &str, event_folder: Option<String>, out: &mut Vec<TeslaCamClip>) {
    let Ok(reader) = fs::read_dir(dir) else {
        return;
    };
    for entry in reader.flatten() {
        if entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            push_clip(&entry.path(), category, event_folder.clone(), out);
        }
    }
}

fn push_clip(path: &Path, category: &str, event_folder: Option<String>, out: &mut Vec<TeslaCamClip>) {
    let name = path
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    if !is_video_file(&name) {
        return;
    }
    let bytes = fs::metadata(path).map(|m| m.len()).unwrap_or(0);
    out.push(TeslaCamClip {
        name,
        path: path.to_string_lossy().to_string(),
        bytes,
        category: category.to_string(),
        event_folder,
    });
}

fn scan_tesla_cam(path: &Path) -> TeslaCamScan {
    TeslaCamScan {
        present: true,
        recent_clips: count_dir(&path.join("RecentClips")),
        saved_clips: count_dir(&path.join("SavedClips")),
        sentry_clips: count_dir(&path.join("SentryClips")),
    }
}

fn count_dir(path: &Path) -> DirCount {
    if !path.is_dir() {
        return DirCount {
            exists: false,
            item_count: 0,
            bytes: None,
        };
    }
    let item_count = fs::read_dir(path)
        .map(|rd| rd.flatten().count() as u64)
        .unwrap_or(0);
    DirCount {
        exists: true,
        item_count,
        bytes: Some(dir_size(path)),
    }
}

fn dir_size(path: &Path) -> u64 {
    let Ok(reader) = fs::read_dir(path) else {
        return 0;
    };
    let mut total = 0;
    for entry in reader.flatten() {
        if let Ok(meta) = entry.metadata() {
            if meta.is_file() {
                total += meta.len();
            } else if meta.is_dir() {
                total += dir_size(&entry.path());
            }
        }
    }
    total
}

fn scan_wrap_files(path: &Path, folder: &str) -> Vec<WrapFile> {
    let Ok(reader) = fs::read_dir(path) else {
        return Vec::new();
    };
    let mut files = Vec::new();
    for entry in reader.flatten() {
        if !entry.file_type().map(|t| t.is_file()).unwrap_or(false) {
            continue;
        }
        let name = entry.file_name().to_string_lossy().to_string();
        let bytes = entry.metadata().ok().map(|m| m.len());
        let dims = png_dimensions(&entry.path());
        files.push(WrapFile {
            name,
            folder: folder.to_string(),
            path: Some(entry.path().to_string_lossy().to_string()),
            bytes,
            width: dims.map(|(w, _)| w),
            height: dims.map(|(_, h)| h),
        });
    }
    files.sort_by(|a, b| a.name.cmp(&b.name));
    files
}

fn png_dimensions(path: &Path) -> Option<(u32, u32)> {
    let mut file = fs::File::open(path).ok()?;
    let mut header = [0u8; 24];
    file.read_exact(&mut header).ok()?;
    if &header[0..8] != b"\x89PNG\r\n\x1a\n" {
        return None;
    }
    let width = u32::from_be_bytes(header[16..20].try_into().ok()?);
    let height = u32::from_be_bytes(header[20..24].try_into().ok()?);
    Some((width, height))
}

#[cfg(any(target_os = "linux", target_os = "windows"))]
fn parse_u64(value: &Value) -> Option<u64> {
    match value {
        Value::Number(n) => n.as_u64().or_else(|| n.as_f64().map(|f| f as u64)),
        Value::String(s) => s.replace(',', "").parse().ok(),
        _ => None,
    }
}

#[cfg(target_os = "linux")]
fn parse_bool(value: &Value) -> bool {
    match value {
        Value::Bool(b) => *b,
        Value::Number(n) => n.as_u64() == Some(1),
        Value::String(s) => matches!(s.to_ascii_lowercase().as_str(), "1" | "true" | "yes"),
        _ => false,
    }
}

#[cfg(any(target_os = "linux", target_os = "windows"))]
fn json_str(value: &Value) -> Option<String> {
    match value {
        Value::String(s) if !s.is_empty() && s != "null" => Some(s.clone()),
        _ => None,
    }
}

#[cfg(target_os = "windows")]
fn as_array(value: Value) -> Vec<Value> {
    match value {
        Value::Array(items) => items,
        Value::Null => Vec::new(),
        other => vec![other],
    }
}

#[cfg(target_os = "linux")]
fn is_system_mount(mount: &str) -> bool {
    matches!(
        mount,
        "/" | "/boot"
            | "/boot/efi"
            | "/home"
            | "/var"
            | "/usr"
            | "/tmp"
            | "/opt"
            | "/srv"
            | "/root"
            | "/snap"
    ) || mount.starts_with("/boot/")
        || mount.starts_with("/proc")
        || mount.starts_with("/sys")
        || mount.starts_with("/dev")
        || mount.starts_with("/run/user")
        || mount == "/run"
}

#[cfg(target_os = "linux")]
fn list_volumes_linux() -> Result<Vec<Volume>, String> {
    if let Ok(volumes) = list_volumes_lsblk() {
        if !volumes.is_empty() {
            return Ok(volumes);
        }
        if volumes.is_empty() {
            // lsblk succeeded but found nothing removable; still try mount-point heuristics
            let from_mounts = list_volumes_proc_mounts()?;
            if !from_mounts.is_empty() {
                return Ok(from_mounts);
            }
            return Ok(volumes);
        }
    }
    list_volumes_proc_mounts()
}

#[cfg(target_os = "linux")]
fn list_volumes_lsblk() -> Result<Vec<Volume>, String> {
    let output = Command::new("lsblk")
        .args([
            "-J",
            "-b",
            "-o",
            "NAME,LABEL,FSTYPE,SIZE,FSAVAIL,MOUNTPOINT,RM,TRAN,HOTPLUG,TYPE",
        ])
        .output()
        .map_err(|e| format!("无法执行 lsblk：{e}"))?;
    if !output.status.success() {
        return Err(format!(
            "lsblk 失败：{}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let parsed: Value = serde_json::from_slice(&output.stdout)
        .map_err(|e| format!("解析 lsblk JSON 失败：{e}"))?;
    let mut volumes = Vec::new();
    if let Some(devices) = parsed.get("blockdevices").and_then(|v| v.as_array()) {
        for device in devices {
            collect_lsblk_device(device, None, None, &mut volumes);
        }
    }
    Ok(volumes)
}

#[cfg(target_os = "linux")]
fn collect_lsblk_device(
    device: &Value,
    parent_tran: Option<&str>,
    parent_removable: Option<bool>,
    out: &mut Vec<Volume>,
) {
    let tran = json_str(device.get("tran").unwrap_or(&Value::Null));
    let tran_ref = tran.as_deref().or(parent_tran);
    let removable = parse_bool(device.get("rm").unwrap_or(&Value::Null))
        || parse_bool(device.get("hotplug").unwrap_or(&Value::Null))
        || parent_removable.unwrap_or(false)
        || tran_ref.map(|t| t.eq_ignore_ascii_case("usb")).unwrap_or(false);

    let mountpoint = json_str(device.get("mountpoint").unwrap_or(&Value::Null));
    if let Some(path) = mountpoint {
        if removable && !is_system_mount(&path) {
            let name = json_str(device.get("label").unwrap_or(&Value::Null))
                .or_else(|| json_str(device.get("name").unwrap_or(&Value::Null)))
                .unwrap_or_else(|| path.clone());
            let filesystem = json_str(device.get("fstype").unwrap_or(&Value::Null));
            let kind = if removable {
                "removable".into()
            } else {
                "external".into()
            };
            out.push(Volume {
                id: path.clone(),
                name,
                path: path.clone(),
                filesystem,
                total_bytes: device.get("size").and_then(parse_u64),
                free_bytes: device.get("fsavail").and_then(parse_u64),
                kind,
                platform: "linux".into(),
                device: json_str(device.get("name").unwrap_or(&Value::Null)),
                is_system: false,
                format_eligible: removable,
            });
        }
    }

    if let Some(children) = device.get("children").and_then(|v| v.as_array()) {
        for child in children {
            collect_lsblk_device(child, tran_ref, Some(removable), out);
        }
    }
}

#[cfg(target_os = "linux")]
fn list_volumes_proc_mounts() -> Result<Vec<Volume>, String> {
    let text = fs::read_to_string("/proc/mounts").map_err(|e| format!("无法读取 /proc/mounts：{e}"))?;
    let mut volumes = Vec::new();
    for line in text.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }
        let path = parts[1].replace("\\040", " ");
        if is_system_mount(&path) {
            continue;
        }
        let looks_external = path.starts_with("/media/")
            || path.starts_with("/run/media/")
            || (path.starts_with("/mnt/") && path != "/mnt/");
        if !looks_external {
            continue;
        }
        let stats = linux_stats(Path::new(&path));
        volumes.push(Volume {
            id: path.clone(),
            name: Path::new(&path)
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_else(|| path.clone()),
            path: path.clone(),
            filesystem: stats.filesystem.or_else(|| Some(parts[2].to_string())),
            total_bytes: stats.total_bytes,
            free_bytes: stats.free_bytes,
            kind: "external".into(),
            platform: "linux".into(),
            device: None,
            is_system: false,
            format_eligible: true,
        });
    }
    Ok(volumes)
}

#[cfg(target_os = "linux")]
fn linux_stats(path: &Path) -> VolumeStats {
    if let Ok(output) = Command::new("findmnt")
        .args(["-n", "-b", "-o", "FSTYPE,SIZE,AVAIL", "--target"])
        .arg(path)
        .output()
    {
        if output.status.success() {
            let line = String::from_utf8_lossy(&output.stdout);
            let cols: Vec<&str> = line.split_whitespace().collect();
            if cols.len() >= 3 {
                return VolumeStats {
                    filesystem: Some(cols[0].to_string()),
                    total_bytes: cols[1].parse().ok(),
                    free_bytes: cols[2].parse().ok(),
                };
            }
            if cols.len() == 1 {
                return VolumeStats {
                    filesystem: Some(cols[0].to_string()),
                    total_bytes: None,
                    free_bytes: None,
                };
            }
        }
    }

    if let Ok(output) = Command::new("df")
        .args(["-B1", "-T", "--output=fstype,size,avail"])
        .arg(path)
        .output()
    {
        if output.status.success() {
            let text = String::from_utf8_lossy(&output.stdout);
            if let Some(line) = text.lines().nth(1) {
                let cols: Vec<&str> = line.split_whitespace().collect();
                if cols.len() >= 3 {
                    return VolumeStats {
                        filesystem: Some(cols[0].to_string()),
                        total_bytes: cols[1].parse().ok(),
                        free_bytes: cols[2].parse().ok(),
                    };
                }
            }
        }
    }

    let fstype = fs::read_to_string("/proc/mounts").ok().and_then(|text| {
        let mut best: Option<(usize, String)> = None;
        let path_str = path.to_string_lossy();
        for line in text.lines() {
            let parts: Vec<&str> = line.split_whitespace().collect();
            if parts.len() < 3 {
                continue;
            }
            let mount = parts[1].replace("\\040", " ");
            if path_str.starts_with(&mount)
                && best.as_ref().map(|(len, _)| mount.len() > *len).unwrap_or(true)
            {
                best = Some((mount.len(), parts[2].to_string()));
            }
        }
        best.map(|(_, fs)| fs)
    });

    VolumeStats {
        filesystem: fstype,
        total_bytes: None,
        free_bytes: None,
    }
}

#[cfg(target_os = "macos")]
fn list_volumes_macos() -> Result<Vec<Volume>, String> {
    let entries = fs::read_dir("/Volumes").map_err(|e| format!("无法读取 /Volumes：{e}"))?;
    let mut volumes = Vec::new();
    for entry in entries.flatten() {
        let name = entry.file_name().to_string_lossy().to_string();
        if is_macos_system_volume(&name) {
            continue;
        }
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let info = diskutil_info(&path);
        if !should_list_volume(info.ok, info.is_system, info.usb, info.removable, info.disk_image)
        {
            continue;
        }
        volumes.push(Volume {
            id: path.to_string_lossy().to_string(),
            name: info.name.unwrap_or(name),
            path: path.to_string_lossy().to_string(),
            filesystem: info.filesystem,
            total_bytes: info.total_bytes,
            free_bytes: info.free_bytes,
            kind: info.kind,
            platform: "macos".into(),
            device: info.device,
            is_system: false,
            format_eligible: info.format_eligible,
        });
    }
    Ok(volumes)
}

#[cfg(target_os = "macos")]
fn is_macos_system_volume(name: &str) -> bool {
    name == "Macintosh HD"
        || name == "Macintosh HD - Data"
        || name.starts_with("com.apple.TimeMachine")
        || name.starts_with('.')
}

#[cfg(target_os = "macos")]
struct DiskutilInfo {
    name: Option<String>,
    filesystem: Option<String>,
    total_bytes: Option<u64>,
    free_bytes: Option<u64>,
    kind: String,
    device: Option<String>,
    is_system: bool,
    format_eligible: bool,
    ok: bool,
    usb: bool,
    removable: bool,
    disk_image: bool,
}

#[cfg(target_os = "macos")]
fn diskutil_info(path: &Path) -> DiskutilInfo {
    let mut info = DiskutilInfo {
        name: None,
        filesystem: None,
        total_bytes: None,
        free_bytes: None,
        kind: "external".into(),
        device: None,
        is_system: false,
        format_eligible: false,
        ok: false,
        usb: false,
        removable: false,
        disk_image: false,
    };
    let Ok(output) = Command::new("diskutil").args(["info"]).arg(path).output() else {
        return info;
    };
    if !output.status.success() {
        return info;
    }
    let text = String::from_utf8_lossy(&output.stdout);
    let mut internal = false;
    let mut mount_point = String::new();
    for line in text.lines() {
        let Some((key, value)) = line.split_once(':') else {
            continue;
        };
        let key = key.trim();
        let value = value.trim();
        match key {
            "Volume Name" if !value.is_empty() => info.name = Some(value.to_string()),
            "Device Identifier" if !value.is_empty() => info.device = Some(value.to_string()),
            "File System Personality" | "Type (Bundle)" if info.filesystem.is_none() => {
                if !value.is_empty() {
                    info.filesystem = Some(value.to_string());
                }
            }
            "Total Size" => info.total_bytes = parse_diskutil_bytes(value),
            "Volume Free Space" | "Container Free Space" if info.free_bytes.is_none() => {
                info.free_bytes = parse_diskutil_bytes(value);
            }
            "Mount Point" => mount_point = value.to_string(),
            "Device Location" if value.eq_ignore_ascii_case("Internal") => internal = true,
            "Protocol" => {
                let lower = value.to_ascii_lowercase();
                if lower.contains("disk image") || lower.contains("virtual") {
                    info.disk_image = true;
                }
                if lower.eq_ignore_ascii_case("usb") {
                    info.usb = true;
                    info.kind = "removable".into();
                }
            }
            "Removable Media" if value.to_ascii_lowercase().contains("removable") => {
                info.removable = true;
                info.kind = "removable".into();
            }
            _ => {}
        }
    }
    info.ok = info.device.is_some() || info.filesystem.is_some();
    let system_name = info
        .name
        .as_deref()
        .map(is_macos_system_volume)
        .unwrap_or(false);
    info.is_system = system_name
        || mount_point == "/"
        || mount_point == "/System/Volumes/Data"
        || (internal && !info.removable && !info.usb);
    info.format_eligible = !info.is_system && (info.removable || info.usb);
    info
}

#[cfg(target_os = "macos")]
fn parse_diskutil_bytes(value: &str) -> Option<u64> {
    let start = value.find('(')?;
    let rest = &value[start + 1..];
    let digits: String = rest.chars().take_while(|c| c.is_ascii_digit()).collect();
    digits.parse().ok()
}

#[cfg(target_os = "macos")]
fn macos_stats(path: &Path) -> VolumeStats {
    let info = diskutil_info(path);
    VolumeStats {
        filesystem: info.filesystem,
        total_bytes: info.total_bytes,
        free_bytes: info.free_bytes,
    }
}

#[cfg(target_os = "windows")]
fn list_volumes_windows() -> Result<Vec<Volume>, String> {
    let script = r#"
Get-CimInstance -ClassName Win32_LogicalDisk |
  Where-Object { $_.DriveType -eq 2 -or $_.DriveType -eq 3 } |
  Select-Object DeviceID, VolumeName, FileSystem, Size, FreeSpace, DriveType |
  ConvertTo-Json -Compress
"#;
    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", script])
        .output()
        .map_err(|e| format!("无法执行 PowerShell：{e}"))?;
    if !output.status.success() {
        return Err(format!(
            "PowerShell 枚举磁盘失败：{}",
            String::from_utf8_lossy(&output.stderr)
        ));
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let trimmed = stdout.trim();
    if trimmed.is_empty() {
        return Ok(Vec::new());
    }
    let parsed: Value =
        serde_json::from_str(trimmed).map_err(|e| format!("解析磁盘 JSON 失败：{e}"))?;
    let mut volumes = Vec::new();
    for item in as_array(parsed) {
        let device = json_str(item.get("DeviceID").unwrap_or(&Value::Null)).unwrap_or_default();
        if device.is_empty() {
            continue;
        }
        let drive_type = parse_u64(item.get("DriveType").unwrap_or(&Value::Null)).unwrap_or(0);
        // DriveType 2 = removable USB/SD. Local disks (including C: and D:) stay hidden.
        if drive_type != 2 {
            continue;
        }
        let path = if device.ends_with('\\') {
            device.clone()
        } else {
            format!("{device}\\")
        };
        let name = json_str(item.get("VolumeName").unwrap_or(&Value::Null))
            .filter(|s| !s.is_empty())
            .unwrap_or_else(|| device.clone());
        let removable = drive_type == 2;
        volumes.push(Volume {
            id: path.clone(),
            name,
            path: path.clone(),
            filesystem: json_str(item.get("FileSystem").unwrap_or(&Value::Null)),
            total_bytes: parse_u64(item.get("Size").unwrap_or(&Value::Null)),
            free_bytes: parse_u64(item.get("FreeSpace").unwrap_or(&Value::Null)),
            kind: if removable {
                "removable".into()
            } else {
                "external".into()
            },
            platform: "windows".into(),
            device: Some(device),
            is_system: false,
            format_eligible: removable,
        });
    }
    Ok(volumes)
}

#[cfg(target_os = "windows")]
fn windows_stats(path: &Path) -> VolumeStats {
    let script = format!(
        r#"
$p = '{}'
Get-CimInstance Win32_LogicalDisk | Where-Object {{ $p.StartsWith($_.DeviceID) }} |
  Select-Object -First 1 FileSystem, Size, FreeSpace |
  ConvertTo-Json -Compress
"#,
        path.display().to_string().replace('\'', "''")
    );
    let Ok(output) = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
    else {
        return VolumeStats {
            filesystem: None,
            total_bytes: None,
            free_bytes: None,
        };
    };
    if !output.status.success() {
        return VolumeStats {
            filesystem: None,
            total_bytes: None,
            free_bytes: None,
        };
    }
    let stdout = String::from_utf8_lossy(&output.stdout);
    let Ok(parsed) = serde_json::from_str::<Value>(stdout.trim()) else {
        return VolumeStats {
            filesystem: None,
            total_bytes: None,
            free_bytes: None,
        };
    };
    VolumeStats {
        filesystem: json_str(parsed.get("FileSystem").unwrap_or(&Value::Null)),
        total_bytes: parse_u64(parsed.get("Size").unwrap_or(&Value::Null)),
        free_bytes: parse_u64(parsed.get("FreeSpace").unwrap_or(&Value::Null)),
    }
}

/// Only USB / removable media belong in the UI. System volumes and failed probes stay hidden.
#[allow(dead_code)]
fn should_list_volume(
    info_ok: bool,
    is_system: bool,
    usb: bool,
    removable: bool,
    disk_image: bool,
) -> bool {
    info_ok && !is_system && !disk_image && (usb || removable)
}

fn normalize_mount_path(path: &str) -> String {
    let replaced = path.trim().replace('\\', "/");
    let mut out = replaced.trim_end_matches('/').to_string();
    if out.is_empty() && replaced.starts_with('/') {
        out = "/".into();
    }
    out
}

#[allow(dead_code)]
fn whole_disk_identifier(device: &str) -> String {
    let s = device.trim().trim_start_matches("/dev/");
    if let Some(rest) = s.strip_prefix("disk") {
        let digits = rest
            .chars()
            .take_while(|c| c.is_ascii_digit())
            .count();
        if digits > 0 {
            return format!("disk{}", &rest[..digits]);
        }
    }
    s.to_string()
}

fn find_ejectable_volume(path: &str) -> Result<Volume, String> {
    if path.trim().is_empty() {
        return Err("请先选择一个 U 盘。".into());
    }
    let volumes = list_volumes()?;
    let want = normalize_mount_path(path);
    let volume = volumes
        .into_iter()
        .find(|v| normalize_mount_path(&v.path) == want)
        .ok_or_else(|| "未在可移动 U 盘列表中找到该卷，已拒绝弹出。".to_string())?;
    if volume.is_system || !volume.format_eligible {
        return Err("该卷不是可弹出的 U 盘。".into());
    }
    Ok(volume)
}

pub fn eject_volume(path: &str) -> Result<EjectResult, String> {
    let volume = find_ejectable_volume(path)?;

    #[cfg(target_os = "linux")]
    {
        eject_linux(&volume)?;
    }

    #[cfg(target_os = "windows")]
    {
        eject_windows(&volume)?;
    }

    #[cfg(target_os = "macos")]
    {
        eject_macos(&volume)?;
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        return Err("当前平台不支持弹出 U 盘。".into());
    }

    Ok(EjectResult {
        ok: true,
        path: volume.path,
        message: format!("已安全弹出「{}」，可以拔出 U 盘。", volume.name),
    })
}

#[cfg(target_os = "macos")]
fn eject_macos(volume: &Volume) -> Result<(), String> {
    let target = volume
        .device
        .as_deref()
        .filter(|d| !d.is_empty())
        .map(whole_disk_identifier)
        .unwrap_or_else(|| volume.path.clone());

    let output = Command::new("diskutil")
        .args(["eject", &target])
        .output()
        .map_err(|e| format!("无法启动 diskutil：{e}"))?;
    if output.status.success() {
        return Ok(());
    }

    let fallback = Command::new("diskutil")
        .args(["eject", &volume.path])
        .output()
        .map_err(|e| format!("无法启动 diskutil：{e}"))?;
    if fallback.status.success() {
        return Ok(());
    }

    let err = String::from_utf8_lossy(&output.stderr);
    let extra = String::from_utf8_lossy(&fallback.stderr);
    let blob = format!("{err} {extra}").to_ascii_lowercase();
    if blob.contains("busy") || blob.contains("in use") || blob.contains("resource busy") {
        return Err("弹出失败：U 盘正被占用，请关闭正在访问该盘的程序后再试。".into());
    }
    let msg = if extra.trim().is_empty() {
        err.trim().to_string()
    } else {
        extra.trim().to_string()
    };
    Err(if msg.is_empty() {
        "diskutil 弹出失败。".into()
    } else {
        format!("diskutil 弹出失败：{msg}")
    })
}

#[cfg(target_os = "windows")]
fn eject_windows(volume: &Volume) -> Result<(), String> {
    let letter = volume
        .device
        .as_deref()
        .and_then(|d| d.chars().next())
        .or_else(|| volume.path.chars().next())
        .filter(|c| c.is_ascii_alphabetic())
        .ok_or_else(|| "无法解析 Windows 盘符。".to_string())?
        .to_ascii_uppercase();

    let script = format!(
        r#"
$ErrorActionPreference = 'Stop'
$letter = '{letter}'
$ns = (New-Object -ComObject Shell.Application).NameSpace(17)
$item = $ns.ParseName("${{letter}}:")
if ($null -eq $item) {{ $item = $ns.ParseName("${{letter}}:\") }}
if ($null -eq $item) {{ throw "找不到驱动器 ${{letter}}:" }}
$item.InvokeVerb('Eject')
Start-Sleep -Milliseconds 500
$still = Get-CimInstance Win32_LogicalDisk | Where-Object {{ $_.DeviceID -eq "${{letter}}:" }}
if ($still) {{
  throw '磁盘仍在使用中，请关闭正在访问该 U 盘的程序后再试。'
}}
"#,
        letter = letter
    );

    let output = Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|e| format!("无法启动 PowerShell 弹出：{e}"))?;
    if output.status.success() {
        return Ok(());
    }
    let err = String::from_utf8_lossy(&output.stderr);
    let msg = err.trim();
    if msg.to_ascii_lowercase().contains("in use") || msg.contains("仍在使用") {
        return Err("弹出失败：U 盘正被占用，请关闭正在访问该盘的程序后再试。".into());
    }
    Err(if msg.is_empty() {
        "弹出失败：系统未返回详细原因。".into()
    } else {
        format!("弹出失败：{msg}")
    })
}

#[cfg(target_os = "linux")]
fn eject_linux(volume: &Volume) -> Result<(), String> {
    let unmount = Command::new("udisksctl")
        .args(["unmount", "-p", &volume.path])
        .output();
    match unmount {
        Ok(out) if out.status.success() => {}
        Ok(out) => {
            let err = String::from_utf8_lossy(&out.stderr);
            return Err(if err.trim().is_empty() {
                "弹出失败：无法卸载该卷。".into()
            } else {
                format!("弹出失败：{}", err.trim())
            });
        }
        Err(_) => {
            return Err("Linux 上请使用文件管理器安全弹出，或安装 udisksctl。".into());
        }
    }

    if let Some(device) = volume.device.as_deref().filter(|d| !d.is_empty()) {
        let parent = linux_whole_disk(device);
        let node = if parent.starts_with("/dev/") {
            parent
        } else {
            format!("/dev/{parent}")
        };
        let _ = Command::new("udisksctl")
            .args(["power-off", "-b", &node])
            .output();
    }
    Ok(())
}

#[cfg(target_os = "linux")]
fn linux_whole_disk(device: &str) -> String {
    let s = device.trim().trim_start_matches("/dev/");
    if let Some(rest) = s.strip_prefix("nvme") {
        if let Some(p) = rest.rfind('p') {
            if rest[p + 1..].chars().all(|c| c.is_ascii_digit()) {
                return format!("nvme{}", &rest[..p]);
            }
        }
        return s.to_string();
    }
    if let Some(rest) = s.strip_prefix("mmcblk") {
        if let Some(p) = rest.rfind('p') {
            if rest[p + 1..].chars().all(|c| c.is_ascii_digit()) {
                return format!("mmcblk{}", &rest[..p]);
            }
        }
        return s.to_string();
    }
    let cut: String = s
        .chars()
        .rev()
        .skip_while(|c| c.is_ascii_digit())
        .collect::<String>()
        .chars()
        .rev()
        .collect();
    if cut.is_empty() {
        s.to_string()
    } else {
        cut
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::File;
    use std::io::Write;

    #[test]
    fn hides_system_and_unknown_volumes() {
        assert!(!should_list_volume(false, false, false, false, false));
        assert!(!should_list_volume(true, true, true, true, false));
        assert!(!should_list_volume(true, false, false, false, false));
        assert!(!should_list_volume(true, false, false, true, true));
        assert!(should_list_volume(true, false, true, false, false));
        assert!(should_list_volume(true, false, false, true, false));
    }

    #[test]
    fn whole_disk_strips_partition_suffix() {
        assert_eq!(whole_disk_identifier("disk5s1"), "disk5");
        assert_eq!(whole_disk_identifier("/dev/disk5s1"), "disk5");
        assert_eq!(whole_disk_identifier("disk5"), "disk5");
    }

    #[test]
    fn eject_rejects_unlisted_and_system_paths() {
        let err = eject_volume("/").unwrap_err();
        assert!(!err.is_empty());
        let missing = eject_volume("/Volumes/definitely-not-a-listed-usb").unwrap_err();
        assert!(missing.contains("拒绝弹出") || missing.contains("请先选择"));
    }

    #[test]
    fn scan_path_detects_tesla_layout() {
        let dir = std::env::temp_dir().join(format!("tesla-usb-scan-{}", std::process::id()));
        let _ = fs::remove_dir_all(&dir);
        fs::create_dir_all(dir.join("TeslaCam/RecentClips")).unwrap();
        fs::create_dir_all(dir.join("TeslaCam/SavedClips")).unwrap();
        File::create(dir.join("TeslaCam/RecentClips/a.mp4")).unwrap();
        fs::create_dir_all(dir.join("TeslaCam/SavedClips/2026-09-03_21-15-30")).unwrap();
        File::create(
            dir.join("TeslaCam/SavedClips/2026-09-03_21-15-30/2026-09-03_21-15-30-front.mp4"),
        )
        .unwrap();
        fs::create_dir_all(dir.join("LightShow")).unwrap();
        File::create(dir.join("LightShow/show1.fseq")).unwrap();
        File::create(dir.join("LightShow/show1.wav")).unwrap();
        File::create(dir.join("LockChime.wav")).unwrap();
        let mut extra = File::create(dir.join("song.mp3")).unwrap();
        extra.write_all(b"x").unwrap();
        fs::create_dir_all(dir.join("Wraps")).unwrap();
        let mut png = File::create(dir.join("Wraps/Sunset.png")).unwrap();
        // 24-byte PNG header: 1024x768
        png.write_all(&[
            0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D, 0x49, 0x48,
            0x44, 0x52, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00, 0x03, 0x00,
        ])
        .unwrap();

        let snap = scan_path(dir.to_str().unwrap()).unwrap();
        assert!(snap.tesla_cam.as_ref().unwrap().present);
        assert_eq!(snap.tesla_cam.as_ref().unwrap().recent_clips.item_count, 1);
        assert!(snap.tesla_cam.as_ref().unwrap().recent_clips.bytes.unwrap() > 0);
        assert_eq!(snap.light_show_files, vec!["show1.fseq", "show1.wav"]);
        assert!(snap.has_lock_chime);
        assert_eq!(snap.audio_files_at_root, vec!["song.mp3"]);
        assert_eq!(snap.wrap_files.len(), 1);
        assert_eq!(snap.wrap_files[0].name, "Sunset.png");
        assert_eq!(snap.wrap_files[0].width, Some(1024));
        assert_eq!(snap.wrap_files[0].height, Some(768));
        assert!(snap.wrap_files[0].path.as_ref().unwrap().ends_with("Sunset.png"));
        assert_eq!(snap.tesla_cam_clips.len(), 2);
        assert!(
            snap.tesla_cam_clips
                .iter()
                .any(|c| c.category == "recent" && c.name == "a.mp4")
        );
        assert!(snap.tesla_cam_clips.iter().any(|c| {
            c.category == "saved"
                && c.event_folder.as_deref() == Some("2026-09-03_21-15-30")
                && c.name == "2026-09-03_21-15-30-front.mp4"
        }));
        assert_eq!(snap.light_show_listing.len(), 2);
        assert_eq!(snap.lock_chime_file.as_ref().unwrap().name, "LockChime.wav");
        let head = read_file_head(dir.join("LightShow/show1.fseq").to_str().unwrap(), 8).unwrap();
        assert!(head.is_empty());
        let _ = fs::remove_dir_all(&dir);
    }
}
