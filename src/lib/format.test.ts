import { describe, expect, it } from "vitest";
import { interpolate, t } from "../i18n";
import { DEMO_VOLUMES } from "./demo";
import {
  FORMAT_OPTIONS,
  availablePercent,
  formatBytes,
  formatFreeOfTotal,
  isForbiddenFormatPath,
  isOptionAvailable,
  isVisibleUsbVolume,
  normalizeFormatId,
  optionCopy,
  optionsForPlatform,
  sanitizeVolumeLabel,
  usedRatio,
  validateEjectRequest,
  validateFormatRequest,
} from "./format";

describe("format options (FORMAT_GUIDE)", () => {
  it("exposes exFAT / FAT32 / MS-DOS FAT with guide copy", () => {
    expect(FORMAT_OPTIONS.map((o) => o.id)).toEqual(["exfat", "fat32", "msdos"]);
    expect(optionCopy("exfat").help).toContain("large files");
    expect(optionCopy("fat32").help).toContain("4GB");
    expect(optionCopy("msdos").help).toContain("Disk Utility");
    expect(t.rules.ntfsNote).toContain("hard fail");
  });

  it("limits MS-DOS FAT to macOS; demo/web shows all for UI preview", () => {
    expect(isOptionAvailable("msdos", "macos")).toBe(true);
    expect(isOptionAvailable("msdos", "windows")).toBe(false);
    expect(isOptionAvailable("exfat", "windows")).toBe(true);
    expect(optionsForPlatform("windows").map((o) => o.id)).toEqual(["exfat", "fat32"]);
    expect(optionsForPlatform("web").map((o) => o.id)).toContain("msdos");
  });

  it("normalizes filesystem aliases", () => {
    expect(normalizeFormatId("exFAT")).toBe("exfat");
    expect(normalizeFormatId("FAT32")).toBe("fat32");
    expect(normalizeFormatId("MS-DOS FAT")).toBe("msdos");
    expect(normalizeFormatId("NTFS")).toBeNull();
  });
});

describe("format safety", () => {
  it("rejects system and empty paths", () => {
    expect(isForbiddenFormatPath("/")).toBe(true);
    expect(isForbiddenFormatPath("/boot")).toBe(true);
    expect(isForbiddenFormatPath("/Users/someone")).toBe(true);
    expect(isForbiddenFormatPath("C:\\")).toBe(true);
    expect(isForbiddenFormatPath("C:/Windows")).toBe(true);
    expect(isForbiddenFormatPath("/Volumes/Macintosh HD")).toBe(true);
    expect(isForbiddenFormatPath("")).toBe(true);
    expect(isForbiddenFormatPath("E:\\")).toBe(false);
    expect(isForbiddenFormatPath("/Volumes/TESLA")).toBe(false);
    expect(isForbiddenFormatPath("/run/media/user/USB")).toBe(false);
  });

  it("requires explicit confirm and eligible removable volume", () => {
    const base = {
      path: "E:\\",
      filesystem: "exFAT",
      confirmed: true,
      formatEligible: true,
      isSystem: false,
    };
    expect(validateFormatRequest(base).ok).toBe(true);
    expect(validateFormatRequest({ ...base, confirmed: false })).toEqual({
      ok: false,
      error: t.format.needConfirm,
    });
    expect(validateFormatRequest({ ...base, isSystem: true }).ok).toBe(false);
    expect(validateFormatRequest({ ...base, path: "C:\\" }).ok).toBe(false);
    expect(validateFormatRequest({ ...base, folderOnly: true }).ok).toBe(false);
    expect(validateFormatRequest({ ...base, formatEligible: false }).ok).toBe(false);
  });

  it("hides system and ineligible volumes from the UI", () => {
    expect(isVisibleUsbVolume({ formatEligible: true })).toBe(true);
    expect(isVisibleUsbVolume({ isSystem: true, formatEligible: true })).toBe(false);
    expect(isVisibleUsbVolume({ formatEligible: false })).toBe(false);
    expect(isVisibleUsbVolume({ isSystem: false, formatEligible: true })).toBe(true);
  });

  it("rejects ejecting system disks and folder targets", () => {
    const base = {
      path: "/Volumes/TESLA",
      formatEligible: true,
      isSystem: false,
    };
    expect(validateEjectRequest(base).ok).toBe(true);
    expect(validateEjectRequest({ ...base, isSystem: true }).ok).toBe(false);
    expect(validateEjectRequest({ ...base, path: "/Volumes/Macintosh HD" }).ok).toBe(false);
    expect(validateEjectRequest({ ...base, folderOnly: true }).ok).toBe(false);
    expect(validateEjectRequest({ ...base, formatEligible: false }).ok).toBe(false);
  });

  it("sanitizes volume labels to FAT limits", () => {
    expect(sanitizeVolumeLabel("Tesla USB!!", "exfat")).toBe("Tesla USB");
    expect(sanitizeVolumeLabel("THIS-IS-A-VERY-LONG-NAME", "fat32").length).toBeLessThanOrEqual(11);
  });
});

describe("i18n interpolate", () => {
  it("fills named placeholders", () => {
    expect(interpolate("{count} volume(s) connected", { count: 3 })).toBe("3 volume(s) connected");
    expect(interpolate(t.overview.volumesCount, { count: 3 })).toBe("3 volume(s) connected");
  });
});

describe("capacity helpers", () => {
  it("computes used ratio and available percent", () => {
    expect(usedRatio(100, 50)).toBe(0.5);
    expect(availablePercent(64, 32)).toBe(50);
    expect(availablePercent(null, 10)).toBeNull();
  });

  it("formats bytes with binary 1024 units", () => {
    expect(formatBytes(null)).toBe(t.format.unknownBytes);
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.00 KB");
    expect(formatBytes(10 * 1024)).toBe("10.0 KB");
    expect(formatBytes(64 * 1024 * 1024 * 1024)).toBe("64.0 GB");
  });

  it("uses the same free/total label on overview and format pages", () => {
    const gb = 1024 * 1024 * 1024;
    const total = 64 * gb;
    const free = Math.round(32.1 * gb);
    const used = total - free;

    // 旧口径：总览卡片写「已用 / 总容量」，格式化页写「可用 / 总容量」
    expect(formatBytes(used)).toBe("31.9 GB");
    expect(formatBytes(free)).toBe("32.1 GB");

    const overview = formatFreeOfTotal(total, free);
    const formatPage = formatFreeOfTotal(total, free);
    expect(overview).toBe(formatPage);
    expect(overview).toBe("32.1 GB available / 64.0 GB");
  });

  it("keeps demo volume capacity labels identical across call sites", () => {
    for (const volume of DEMO_VOLUMES) {
      expect(formatFreeOfTotal(volume.totalBytes, volume.freeBytes)).toBe(
        formatFreeOfTotal(volume.snapshot.totalBytes, volume.snapshot.freeBytes),
      );
    }
  });
});
