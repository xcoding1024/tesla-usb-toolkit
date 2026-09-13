import { describe, expect, it } from "vitest";
import { t } from "../i18n";
import { DEMO_VOLUMES } from "./demo";
import { classifyFilesystem, evaluate } from "./rules";
import type { VolumeSnapshot } from "./types";

function baseSnapshot(overrides: Partial<VolumeSnapshot> = {}): VolumeSnapshot {
  return {
    path: "/mnt/usb",
    filesystem: "exFAT",
    totalBytes: 128 * 1024 * 1024 * 1024,
    freeBytes: 100 * 1024 * 1024 * 1024,
    rootEntries: [],
    teslaCam: null,
    lightShowFiles: [],
    boomboxFiles: [],
    hasLockChime: false,
    audioFilesAtRoot: [],
    wrapFiles: [],
    teslaCamClips: [],
    lightShowListing: [],
    boomboxListing: [],
    lockChimeFile: null,
    ...overrides,
  };
}

describe("classifyFilesystem", () => {
  it("accepts exFAT / FAT32 / ext", () => {
    expect(classifyFilesystem("exFAT").code).toBe("FS_OK");
    expect(classifyFilesystem("FAT32").code).toBe("FS_OK");
    expect(classifyFilesystem("vfat").code).toBe("FS_OK");
    expect(classifyFilesystem("ext4").code).toBe("FS_OK");
    expect(classifyFilesystem("MS-DOS FAT").code).toBe("FS_OK");
  });

  it("fails NTFS", () => {
    const result = classifyFilesystem("NTFS");
    expect(result.code).toBe("FS_FAIL_NTFS");
    expect(result.verdict).toBe("fail");
  });

  it("warns when unknown or missing", () => {
    expect(classifyFilesystem(null).code).toBe("FS_UNKNOWN");
    expect(classifyFilesystem("APFS").code).toBe("FS_UNKNOWN");
    expect(classifyFilesystem("APFS").verdict).toBe("warn");
  });
});

describe("evaluate", () => {
  it("passes TeslaCam clip listings through to the report", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [{ name: "TeslaCam", isDir: true }],
        teslaCam: {
          present: true,
          recentClips: { exists: true, itemCount: 1, bytes: 100 },
          savedClips: { exists: false, itemCount: 0, bytes: null },
          sentryClips: { exists: false, itemCount: 0, bytes: null },
        },
        teslaCamClips: [
          {
            name: "2026-09-03_21-15-30-front.mp4",
            path: "/demo/teslacam/clip-a.mp4",
            bytes: 3055,
            category: "recent",
            eventFolder: null,
          },
        ],
      }),
    );
    expect(report.content.teslaCam?.clips).toHaveLength(1);
    expect(report.content.teslaCam?.clips[0]?.name).toBe("2026-09-03_21-15-30-front.mp4");
  });

  it("detects TeslaCam subdir counts and in-use status", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [{ name: "TeslaCam", isDir: true }],
        teslaCam: {
          present: true,
          recentClips: { exists: true, itemCount: 4 },
          savedClips: { exists: true, itemCount: 1 },
          sentryClips: { exists: true, itemCount: 2 },
        },
      }),
    );
    expect(report.purposes.map((p) => p.id)).toContain("dashcam");
    expect(report.content.teslaCam?.status).toBe("inUse");
    expect(report.content.teslaCam?.recentClips.itemCount).toBe(4);
    expect(report.content.teslaCam?.sentryClips.itemCount).toBe(2);
  });

  it("flags TeslaCam naming typos", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [{ name: "teslacam", isDir: true }],
      }),
    );
    expect(report.content.namingIssues.some((n) => n.includes("teslacam"))).toBe(true);
    expect(report.tips.some((t) => t.includes("TeslaCam"))).toBe(true);
  });

  it("pairs LightShow fseq with wav/mp3 and reports orphans", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [{ name: "LightShow", isDir: true }],
        lightShowFiles: ["show1.fseq", "show1.wav", "lonely.fseq", "solo.mp3"],
      }),
    );
    expect(report.purposes.map((p) => p.id)).toContain("lightShow");
    expect(report.content.lightShow?.shows).toEqual([
      { name: "show1", sequence: "show1.fseq", audio: "show1.wav" },
    ]);
    expect(report.content.lightShow?.orphans).toEqual(["lonely.fseq", "solo.mp3"]);
    expect(report.tips.some((t) => t.includes(".fseq"))).toBe(true);
  });

  it("conflicts when LightShow and root TeslaCam coexist", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [
          { name: "TeslaCam", isDir: true },
          { name: "LightShow", isDir: true },
        ],
        teslaCam: {
          present: true,
          recentClips: { exists: false, itemCount: 0 },
          savedClips: { exists: false, itemCount: 0 },
          sentryClips: { exists: false, itemCount: 0 },
        },
        lightShowFiles: ["a.fseq", "a.mp3"],
      }),
    );
    expect(report.conflicts.some((c) => c.id === "lightshow-teslacam")).toBe(true);
    expect(report.tips).toContain(t.rules.tipSeparateLightShow);
  });

  it("detects Boombox and LockChime.wav", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [
          { name: "Boombox", isDir: true },
          { name: "LockChime.wav", isDir: false },
        ],
        boomboxFiles: ["horn.wav"],
        hasLockChime: true,
      }),
    );
    expect(report.purposes.map((p) => p.id)).toContain("boombox");
    expect(report.content.boombox?.hasLockChime).toBe(true);
  });

  it("treats NTFS as hard fail while still listing purposes", () => {
    const report = evaluate(
      baseSnapshot({
        filesystem: "NTFS",
        rootEntries: [{ name: "TeslaCam", isDir: true }],
        teslaCam: {
          present: true,
          recentClips: { exists: true, itemCount: 1 },
          savedClips: { exists: false, itemCount: 0 },
          sentryClips: { exists: false, itemCount: 0 },
        },
      }),
    );
    expect(report.filesystem.verdict).toBe("fail");
    expect(report.conflicts.some((c) => c.id === "ntfs")).toBe(true);
    expect(report.purposes.map((p) => p.id)).toContain("dashcam");
  });

  it("marks empty disks and warns on small capacity", () => {
    const report = evaluate(
      baseSnapshot({
        filesystem: null,
        totalBytes: 16 * 1024 * 1024 * 1024,
        rootEntries: [],
      }),
    );
    expect(report.purposes[0]?.id).toBe("empty");
    expect(report.content.capacityWarning).toBeDefined();
    expect(report.filesystem.code).toBe("FS_UNKNOWN");
  });

  it("evaluates bundled demo snapshots without throwing", () => {
    for (const volume of DEMO_VOLUMES) {
      const report = evaluate(volume.snapshot);
      expect(report.path).toBe(volume.path);
      expect(report.filesystem.code).toBeTruthy();
    }
  });

  it("puts a full-content demo volume first for browser preview", () => {
    const full = DEMO_VOLUMES[0];
    expect(full?.id).toBe("demo:full");
    const report = evaluate(full.snapshot);
    expect(report.content.teslaCam?.recentClips.itemCount).toBeGreaterThan(0);
    expect(report.content.teslaCam?.savedClips.itemCount).toBeGreaterThan(0);
    expect(report.content.teslaCam?.sentryClips.itemCount).toBeGreaterThan(0);
    expect(report.content.lightShow?.shows.length).toBeGreaterThan(1);
    expect(report.content.lightShow?.orphans).toEqual(["lonely.fseq"]);
    expect(report.content.wraps?.validCount).toBeGreaterThan(0);
    expect(report.content.wraps?.assets.some((asset) => asset.notes.length > 0)).toBe(true);
    expect(report.content.boombox?.hasLockChime).toBe(true);
    expect(report.content.boombox?.files.length).toBeGreaterThan(0);
    expect(report.content.teslaCam?.clips.some((clip) => clip.path.startsWith("/demo/teslacam/"))).toBe(true);
    expect(report.content.wraps?.assets.some((asset) => asset.path?.startsWith("/demo/wraps/"))).toBe(true);
    expect(report.content.lightShow?.shows.some((show) => show.audioFile?.path.startsWith("/demo/audio/"))).toBe(
      true,
    );
    expect(report.content.boombox?.lockChimeFile?.path).toBe("/demo/audio/lockchime.wav");
  });

  it("flags LightShow + update package conflict", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [
          { name: "LightShow", isDir: true },
          { name: "release.tgz", isDir: false },
        ],
        lightShowFiles: ["a.fseq", "a.wav"],
      }),
    );
    expect(report.conflicts.some((c) => c.id === "lightshow-update")).toBe(true);
    expect(report.content.updateFiles).toEqual(["release.tgz"]);
  });

  it("annotates Wraps PNG validity and counts", () => {
    const report = evaluate(
      baseSnapshot({
        rootEntries: [{ name: "Wraps", isDir: true }],
        wrapFiles: [
          { name: "Sunset.png", folder: "Wraps", bytes: 400000, width: 1024, height: 1024 },
          { name: "bad.jpg", folder: "Wraps", bytes: 80000, width: null, height: null },
        ],
      }),
    );
    expect(report.purposes.map((p) => p.id)).toContain("paintShop");
    expect(report.content.wraps?.validCount).toBe(1);
    expect(report.content.wraps?.assets).toHaveLength(2);
    expect(report.content.wraps?.assets[1]?.notes.length).toBeGreaterThan(0);
  });
});
