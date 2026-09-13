import { interpolate, t } from "../i18n";

export type FormatFsId = "exfat" | "fat32" | "msdos";
export type AppPlatform = "windows" | "macos" | "linux" | "web" | "demo";

export interface FormatOption {
  id: FormatFsId;
  platforms: Exclude<AppPlatform, "web" | "demo">[];
  recommended?: boolean;
}

export const FORMAT_OPTIONS: FormatOption[] = [
  { id: "exfat", platforms: ["windows", "macos", "linux"], recommended: true },
  { id: "fat32", platforms: ["windows", "macos", "linux"] },
  { id: "msdos", platforms: ["macos"] },
];

export function optionCopy(id: FormatFsId): { label: string; use: string; help: string } {
  return t.format.options[id];
}

export function capabilityCopy(platform: string | undefined): string {
  if (platform === "windows") return t.settings.capabilityWindows;
  if (platform === "macos") return t.settings.capabilityMacos;
  if (platform === "linux") return t.settings.capabilityLinux;
  if (platform === "web" || platform === "demo") return t.format.demoBlocked;
  return t.settings.capabilityUnknown;
}

export function optionsForPlatform(platform: AppPlatform): FormatOption[] {
  if (platform === "web" || platform === "demo") {
    return FORMAT_OPTIONS;
  }
  return FORMAT_OPTIONS.filter((option) => option.platforms.includes(platform));
}

export function isOptionAvailable(id: FormatFsId, platform: AppPlatform): boolean {
  if (platform === "web" || platform === "demo") return true;
  return FORMAT_OPTIONS.some((option) => option.id === id && option.platforms.includes(platform));
}

export function normalizeFormatId(raw: string): FormatFsId | null {
  const key = raw.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (key === "exfat") return "exfat";
  if (key === "fat32" || key === "vfat" || key === "fat") return "fat32";
  if (key === "msdos" || key === "msdosfat" || key === "msdosfat32") return "msdos";
  return null;
}

const WINDOWS_SYSTEM = /^(c:|c:\\|c:\/)$/i;
const FORBIDDEN_EXACT = new Set([
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
  "/System",
  "/Applications",
  "/Library",
  "/Users",
  "/private",
  "/Volumes/Macintosh HD",
  "/Volumes/Macintosh HD - Data",
]);

const FORBIDDEN_PREFIXES = [
  "/boot/",
  "/usr/",
  "/bin/",
  "/sbin/",
  "/etc/",
  "/var/",
  "/dev/",
  "/proc/",
  "/sys/",
  "/System/",
  "/Applications/",
  "/Library/",
  "/Users/",
  "/private/",
  "/Volumes/Macintosh HD",
  "c:\\",
  "c:/",
];

export function normalizePath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/\/+$/, "") || path.trim();
}

/** 纯逻辑护栏：拒绝系统盘与常见系统挂载点。非绑定假设：枚举层仍会再判一次。 */
export function isForbiddenFormatPath(path: string): boolean {
  const trimmed = path.trim();
  if (!trimmed) return true;
  if (WINDOWS_SYSTEM.test(trimmed)) return true;
  const unified = normalizePath(trimmed);
  const lower = unified.toLowerCase();
  if (WINDOWS_SYSTEM.test(unified) || WINDOWS_SYSTEM.test(`${unified}/`)) return true;
  if (FORBIDDEN_EXACT.has(unified) || FORBIDDEN_EXACT.has(lower)) return true;
  return FORBIDDEN_PREFIXES.some((prefix) => lower.startsWith(prefix.toLowerCase()));
}

export function sanitizeVolumeLabel(raw: string, fs: FormatFsId): string {
  const cleaned = raw.replace(/[^\w\s-]/g, "").trim() || "TESLA";
  const max = fs === "exfat" ? 15 : 11;
  return cleaned.slice(0, max);
}

export interface FormatRequestInput {
  path: string;
  filesystem: string;
  confirmed: boolean;
  label?: string;
  formatEligible?: boolean;
  isSystem?: boolean;
  folderOnly?: boolean;
}

export interface FormatRequestOk {
  ok: true;
  filesystem: FormatFsId;
  path: string;
  label: string;
}

export interface FormatRequestErr {
  ok: false;
  error: string;
}

export interface EjectRequestInput {
  path: string;
  formatEligible?: boolean;
  isSystem?: boolean;
  folderOnly?: boolean;
}

export function isVisibleUsbVolume(volume: {
  isSystem?: boolean;
  formatEligible?: boolean;
}): boolean {
  return !volume.isSystem && volume.formatEligible !== false;
}

export function validateEjectRequest(input: EjectRequestInput): { ok: true; path: string } | FormatRequestErr {
  if (input.folderOnly) {
    return { ok: false, error: t.eject.needVolume };
  }
  const path = input.path.trim();
  if (!path) {
    return { ok: false, error: t.eject.needVolume };
  }
  if (input.isSystem || isForbiddenFormatPath(path)) {
    return { ok: false, error: t.eject.notEligible };
  }
  if (input.formatEligible === false) {
    return { ok: false, error: t.eject.notEligible };
  }
  return { ok: true, path };
}

export function validateFormatRequest(input: FormatRequestInput): FormatRequestOk | FormatRequestErr {
  if (input.folderOnly) {
    return { ok: false, error: t.format.needVolume };
  }
  const path = input.path.trim();
  if (!path) {
    return { ok: false, error: t.format.needVolume };
  }
  if (input.isSystem || isForbiddenFormatPath(path)) {
    return { ok: false, error: t.format.notEligible };
  }
  if (input.formatEligible === false) {
    return { ok: false, error: t.format.notEligible };
  }
  const filesystem = normalizeFormatId(input.filesystem);
  if (!filesystem) {
    return { ok: false, error: t.format.needVolume };
  }
  if (!input.confirmed) {
    return { ok: false, error: t.format.needConfirm };
  }
  return {
    ok: true,
    filesystem,
    path,
    label: sanitizeVolumeLabel(input.label ?? "", filesystem),
  };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes == null || Number.isNaN(bytes)) return t.format.unknownBytes;
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  const digits = unit === 0 ? 0 : value >= 10 ? 1 : 2;
  return `${value.toFixed(digits)} ${units[unit]}`;
}

/** 可用空间 / 总容量，总览与格式化页共用，避免一边显示已用、一边显示可用。 */
export function formatFreeOfTotal(
  totalBytes: number | null | undefined,
  freeBytes: number | null | undefined,
): string {
  if (totalBytes == null && freeBytes == null) return t.overview.unknownSize;
  return interpolate(t.drive.capacityValue, {
    free: formatBytes(freeBytes),
    total: formatBytes(totalBytes),
  });
}

export function usedRatio(totalBytes: number | null | undefined, freeBytes: number | null | undefined): number | null {
  if (totalBytes == null || freeBytes == null || totalBytes <= 0) return null;
  const used = Math.max(0, totalBytes - freeBytes);
  return Math.min(1, used / totalBytes);
}

export function availablePercent(totalBytes: number | null | undefined, freeBytes: number | null | undefined): number | null {
  if (totalBytes == null || freeBytes == null || totalBytes <= 0) return null;
  return Math.round((Math.max(0, freeBytes) / totalBytes) * 100);
}

export function usageTone(available: number | null): "ok" | "warn" | "unknown" {
  if (available == null) return "unknown";
  return available < 30 ? "warn" : "ok";
}
