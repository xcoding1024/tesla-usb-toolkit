use crate::volumes::{self, Volume};
use serde::Serialize;

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FormatCapabilities {
    pub platform: String,
    pub can_format: bool,
    pub requires_privilege: bool,
    pub supported_filesystems: Vec<String>,
    pub message: String,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FormatPreview {
    pub path: String,
    pub name: String,
    pub current_filesystem: Option<String>,
    pub target_filesystem: String,
    pub eligible: bool,
    pub will_execute: bool,
    pub warning: String,
    pub blockers: Vec<String>,
}

#[derive(Debug, Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct FormatResult {
    pub ok: bool,
    pub filesystem: String,
    pub path: String,
    pub message: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum FormatFs {
    ExFat,
    Fat32,
    MsDos,
}

impl FormatFs {
    pub fn as_id(self) -> &'static str {
        match self {
            FormatFs::ExFat => "exfat",
            FormatFs::Fat32 => "fat32",
            FormatFs::MsDos => "msdos",
        }
    }

    pub fn parse(raw: &str) -> Result<Self, String> {
        let key: String = raw
            .chars()
            .filter(|c| c.is_ascii_alphanumeric())
            .map(|c| c.to_ascii_lowercase())
            .collect();
        match key.as_str() {
            "exfat" => Ok(FormatFs::ExFat),
            "fat32" | "vfat" | "fat" => Ok(FormatFs::Fat32),
            "msdos" | "msdosfat" | "msdosfat32" => Ok(FormatFs::MsDos),
            _ => Err(format!("不支持的目标文件系统：{raw}。可选 exFAT / FAT32 / MS-DOS FAT。")),
        }
    }
}

pub fn format_capabilities() -> FormatCapabilities {
    #[cfg(target_os = "windows")]
    {
        FormatCapabilities {
            platform: "windows".into(),
            can_format: true,
            requires_privilege: true,
            supported_filesystems: vec!["exfat".into(), "fat32".into()],
            message: "Windows 使用 Format-Volume / format 格式化可移动盘，通常需要管理员权限。".into(),
        }
    }
    #[cfg(target_os = "macos")]
    {
        FormatCapabilities {
            platform: "macos".into(),
            can_format: true,
            requires_privilege: true,
            supported_filesystems: vec!["exfat".into(), "fat32".into(), "msdos".into()],
            message: "macOS 使用 diskutil eraseVolume；MS-DOS FAT 为磁盘工具中的 FAT 名称。".into(),
        }
    }
    #[cfg(target_os = "linux")]
    {
        FormatCapabilities {
            platform: "linux".into(),
            can_format: false,
            requires_privilege: true,
            supported_filesystems: vec!["exfat".into(), "fat32".into()],
            message: "Linux 环境不执行实际格式化（需要 root / mkfs）。请在 Windows 或 macOS 使用，或手动运行 mkfs.exfat / mkfs.vfat。".into(),
        }
    }
    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        FormatCapabilities {
            platform: "unknown".into(),
            can_format: false,
            requires_privilege: true,
            supported_filesystems: Vec::new(),
            message: "当前平台不支持格式化。".into(),
        }
    }
}

pub fn preview_format(path: &str, filesystem: &str) -> Result<FormatPreview, String> {
    let fs = FormatFs::parse(filesystem)?;
    let caps = format_capabilities();
    if !caps.supported_filesystems.iter().any(|id| id == fs.as_id()) && caps.can_format {
        return Err(format!("当前平台不支持 {}。", fs.as_id()));
    }

    let mut blockers = Vec::new();
    if is_forbidden_path(path) {
        blockers.push("路径被判定为系统盘或系统挂载点，已拒绝格式化。".into());
    }

    let volume = find_listed_volume(path);
    let (name, current, eligible_flag, is_system) = match &volume {
        Some(v) => (v.name.clone(), v.filesystem.clone(), v.format_eligible, v.is_system),
        None => {
            blockers.push("未在可移动/外部卷列表中找到该路径，拒绝格式化（文件夹目标不可格式化）。".into());
            (path.to_string(), None, false, false)
        }
    };

    if is_system {
        blockers.push("该卷被标记为系统盘。".into());
    }
    if volume.is_some() && !eligible_flag {
        blockers.push("该卷不是可安全格式化的可移动磁盘。".into());
    }

    let eligible = blockers.is_empty();
    let will_execute = eligible && caps.can_format;
    let warning = if !eligible {
        blockers.join(" ")
    } else if !caps.can_format {
        caps.message.clone()
    } else {
        format!(
            "即将把「{name}」格式化为 {}，盘上全部数据将被清空。",
            fs.as_id()
        )
    };

    Ok(FormatPreview {
        path: path.to_string(),
        name,
        current_filesystem: current,
        target_filesystem: fs.as_id().to_string(),
        eligible,
        will_execute,
        warning,
        blockers,
    })
}

pub fn format_volume(
    path: &str,
    filesystem: &str,
    label: &str,
    confirmed: bool,
) -> Result<FormatResult, String> {
    if !confirmed {
        return Err("未确认：格式化是破坏性操作，请在界面勾选确认后再试。".into());
    }
    let fs = FormatFs::parse(filesystem)?;
    let preview = preview_format(path, filesystem)?;
    if !preview.eligible {
        return Err(if preview.blockers.is_empty() {
            preview.warning
        } else {
            preview.blockers.join(" ")
        });
    }

    let volume = find_listed_volume(path).ok_or_else(|| "卷已消失，已中止格式化。".to_string())?;
    let label = sanitize_label(label, fs);

    #[cfg(target_os = "linux")]
    {
        let _ = (&volume, &label);
        return Err(format_capabilities().message);
    }

    #[cfg(target_os = "windows")]
    {
        format_windows(&volume, fs, &label)?;
    }

    #[cfg(target_os = "macos")]
    {
        format_macos(&volume, fs, &label)?;
    }

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        let _ = (&volume, &label);
        return Err("当前平台不支持格式化。".into());
    }

    #[cfg(any(target_os = "windows", target_os = "macos"))]
    {
        Ok(FormatResult {
            ok: true,
            filesystem: fs.as_id().into(),
            path: path.into(),
            message: format!("已将「{}」格式化为 {}。", preview.name, fs.as_id()),
        })
    }
}

fn find_listed_volume(path: &str) -> Option<Volume> {
    let Ok(volumes) = volumes::list_volumes() else {
        return None;
    };
    let want = normalize_path(path);
    volumes.into_iter().find(|v| normalize_path(&v.path) == want)
}

pub fn sanitize_label(raw: &str, fs: FormatFs) -> String {
    let cleaned: String = raw
        .chars()
        .filter(|c| c.is_ascii_alphanumeric() || *c == ' ' || *c == '-' || *c == '_')
        .collect::<String>()
        .trim()
        .to_string();
    let fallback = if cleaned.is_empty() {
        "TESLA".to_string()
    } else {
        cleaned
    };
    let max = if matches!(fs, FormatFs::ExFat) { 15 } else { 11 };
    fallback.chars().take(max).collect()
}

pub fn is_forbidden_path(path: &str) -> bool {
    let trimmed = path.trim();
    if trimmed.is_empty() {
        return true;
    }
    let unified = normalize_path(trimmed);
    let lower = unified.to_ascii_lowercase();

    if lower == "c:" || lower == "c:/" || lower == "c:\\" {
        return true;
    }
    if lower.starts_with("c:/") || lower.starts_with("c:\\") {
        return true;
    }

    const EXACT: &[&str] = &[
        "/",
        "/boot",
        "/boot/efi",
        "/home",
        "/usr",
        "/bin",
        "/sbin",
        "/etc",
        "/var",
        "/opt",
        "/root",
        "/tmp",
        "/dev",
        "/proc",
        "/sys",
        "/run",
        "/system",
        "/applications",
        "/library",
        "/users",
        "/private",
        "/volumes/macintosh hd",
        "/volumes/macintosh hd - data",
    ];
    if EXACT.contains(&lower.as_str()) {
        return true;
    }

    const PREFIXES: &[&str] = &[
        "/boot/",
        "/usr/",
        "/bin/",
        "/sbin/",
        "/etc/",
        "/var/",
        "/dev/",
        "/proc/",
        "/sys/",
        "/system/",
        "/applications/",
        "/library/",
        "/users/",
        "/private/",
        "/volumes/macintosh hd",
    ];
    PREFIXES.iter().any(|prefix| lower.starts_with(prefix))
}

fn normalize_path(path: &str) -> String {
    let replaced = path.trim().replace('\\', "/");
    let mut out = replaced.trim_end_matches('/').to_string();
    if out.is_empty() && replaced.starts_with('/') {
        out = "/".into();
    }
    // Keep Windows drive root as "E:" after stripping slash.
    out
}

#[cfg(target_os = "windows")]
fn format_windows(volume: &Volume, fs: FormatFs, label: &str) -> Result<(), String> {
    if matches!(fs, FormatFs::MsDos) {
        return Err("Windows 请使用 FAT32，而不是 MS-DOS FAT。".into());
    }
    let letter = drive_letter(&volume.path).ok_or_else(|| "无法解析 Windows 盘符。".to_string())?;
    let fs_arg = match fs {
        FormatFs::ExFat => "exFAT",
        FormatFs::Fat32 => "FAT32",
        FormatFs::MsDos => "FAT32",
    };

    let script = format!(
        r#"
$ErrorActionPreference = 'Stop'
try {{
  Format-Volume -DriveLetter {letter} -FileSystem {fs_arg} -NewFileSystemLabel '{label}' -Full:$false -Force -Confirm:$false | Out-Null
  'OK'
}} catch {{
  Write-Error $_.Exception.Message
  exit 1
}}
"#,
        letter = letter,
        fs_arg = fs_arg,
        label = label.replace('\'', "''"),
    );

    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-NonInteractive", "-Command", &script])
        .output()
        .map_err(|e| format!("无法启动 PowerShell 格式化：{e}"))?;
    if output.status.success() {
        return Ok(());
    }

    let err = String::from_utf8_lossy(&output.stderr);
    let fallback = std::process::Command::new("cmd")
        .args([
            "/C",
            "format",
            &format!("{letter}:"),
            &format!("/FS:{fs_arg}"),
            "/Q",
            "/Y",
            &format!("/V:{label}"),
        ])
        .output();

    match fallback {
        Ok(out) if out.status.success() => Ok(()),
        Ok(out) => {
            let extra = String::from_utf8_lossy(&out.stderr);
            Err(privilege_or_raw(&err, &extra))
        }
        Err(_) => Err(privilege_or_raw(&err, "")),
    }
}

#[cfg(target_os = "windows")]
fn drive_letter(path: &str) -> Option<char> {
    let c = path.chars().next()?;
    if c.is_ascii_alphabetic() && path.chars().nth(1) == Some(':') {
        Some(c.to_ascii_uppercase())
    } else {
        None
    }
}

#[cfg(target_os = "windows")]
fn privilege_or_raw(primary: &str, secondary: &str) -> String {
    let blob = format!("{primary} {secondary}").to_ascii_lowercase();
    if blob.contains("access") || blob.contains("denied") || blob.contains("privilege") || blob.contains("administrator")
    {
        "格式化失败：需要管理员权限。请以管理员身份重新运行本应用。".into()
    } else {
        let msg = if secondary.trim().is_empty() {
            primary.trim().to_string()
        } else {
            format!("{} {}", primary.trim(), secondary.trim())
        };
        if msg.is_empty() {
            "格式化失败：系统未返回详细原因。".into()
        } else {
            format!("格式化失败：{msg}")
        }
    }
}

#[cfg(target_os = "macos")]
fn format_macos(volume: &Volume, fs: FormatFs, label: &str) -> Result<(), String> {
    let fs_arg = match fs {
        FormatFs::ExFat => "ExFAT",
        FormatFs::Fat32 => "FAT32",
        FormatFs::MsDos => "MS-DOS",
    };
    let target = volume
        .device
        .clone()
        .filter(|d| !d.is_empty())
        .unwrap_or_else(|| volume.path.clone());

    let output = std::process::Command::new("diskutil")
        .args(["eraseVolume", fs_arg, label, &target])
        .output()
        .map_err(|e| format!("无法启动 diskutil：{e}"))?;
    if output.status.success() {
        return Ok(());
    }
    let err = String::from_utf8_lossy(&output.stderr);
    let stdout = String::from_utf8_lossy(&output.stdout);
    let blob = format!("{err} {stdout}");
    if blob.to_ascii_lowercase().contains("not privileged")
        || blob.to_ascii_lowercase().contains("permission")
        || blob.to_ascii_lowercase().contains("authenticate")
    {
        return Err("格式化失败：需要管理员权限。请在授权对话框中允许，或使用管理员账户重试。".into());
    }
    let msg = if err.trim().is_empty() {
        stdout.trim().to_string()
    } else {
        err.trim().to_string()
    };
    Err(if msg.is_empty() {
        "diskutil 格式化失败。".into()
    } else {
        format!("diskutil 格式化失败：{msg}")
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_filesystem_aliases() {
        assert_eq!(FormatFs::parse("exFAT").unwrap(), FormatFs::ExFat);
        assert_eq!(FormatFs::parse("FAT32").unwrap(), FormatFs::Fat32);
        assert_eq!(FormatFs::parse("MS-DOS FAT").unwrap(), FormatFs::MsDos);
        assert!(FormatFs::parse("NTFS").is_err());
    }

    #[test]
    fn rejects_system_paths() {
        assert!(is_forbidden_path("/"));
        assert!(is_forbidden_path("/boot"));
        assert!(is_forbidden_path("/Users/someone"));
        assert!(is_forbidden_path("C:\\"));
        assert!(is_forbidden_path("C:/Windows"));
        assert!(is_forbidden_path("/Volumes/Macintosh HD"));
        assert!(!is_forbidden_path("E:\\"));
        assert!(!is_forbidden_path("/Volumes/TESLA"));
        assert!(!is_forbidden_path("/run/media/user/USB"));
    }

    #[test]
    fn label_falls_back_and_truncates() {
        assert_eq!(sanitize_label("!!!", FormatFs::ExFat), "TESLA");
        assert!(sanitize_label("THIS-IS-A-VERY-LONG-NAME", FormatFs::Fat32).len() <= 11);
    }

    #[test]
    fn preview_rejects_unknown_and_system_paths() {
        let preview = preview_format("/", "exFAT").unwrap();
        assert!(!preview.eligible);
        assert!(!preview.will_execute);
        assert!(!preview.blockers.is_empty());

        let missing = preview_format("/media/definitely-not-a-listed-volume", "exFAT").unwrap();
        assert!(!missing.eligible);
    }

    #[test]
    fn format_requires_confirm_and_does_not_touch_disk_on_linux() {
        let err = format_volume("/media/fake", "exFAT", "TESLA", false).unwrap_err();
        assert!(err.contains("未确认"));

        let result = format_volume("/", "exFAT", "TESLA", true);
        assert!(result.is_err());
    }

    #[test]
    fn linux_capabilities_surface_without_executing() {
        let caps = format_capabilities();
        assert!(!caps.supported_filesystems.is_empty());
        #[cfg(target_os = "linux")]
        {
            assert_eq!(caps.platform, "linux");
            assert!(!caps.can_format);
            assert!(caps.requires_privilege);
        }
    }
}
