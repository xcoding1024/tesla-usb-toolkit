import { t } from "../i18n";
import type { ListedMediaFile, TeslaCamCategory, TeslaCamClipFile, Volume, VolumeSnapshot, WrapFile } from "./types";

export function displayVolumeName(volume: { id: string; name: string }): string {
  if (volume.id === "demo:full") return t.demo.fullName;
  return volume.name;
}

export interface DemoVolume extends Volume {
  snapshot: VolumeSnapshot;
}

const GB = 1024 * 1024 * 1024;
const MB = 1024 * 1024;

const CLIP_A = 3055;
const CLIP_B = 4989;
const TONE = 88278;
const LOCK = 88278;
const BEEP = 33062;
const PNG = { Sunset: 35244, Cyber: 91749, Mountain: 16759, too_big: 18803 } as const;
const FSEQ = { holiday: 4832, cyberpunk: 16032, aurora: 3872, lonely: 992 } as const;

function camClip(
  name: string,
  category: TeslaCamCategory,
  eventFolder: string | null,
  variant: "a" | "b" = "a",
): TeslaCamClipFile {
  return {
    name,
    path: variant === "a" ? "/demo/teslacam/clip-a.mp4" : "/demo/teslacam/clip-b.mp4",
    bytes: variant === "a" ? CLIP_A : CLIP_B,
    category,
    eventFolder,
  };
}

function eventClips(stamp: string, category: TeslaCamCategory, asFolder: boolean): TeslaCamClipFile[] {
  const cameras = ["front", "back", "left_repeater", "right_repeater"] as const;
  return cameras.map((camera, index) =>
    camClip(`${stamp}-${camera}.mp4`, category, asFolder ? stamp : null, index % 2 === 0 ? "a" : "b"),
  );
}

function media(name: string, path: string, bytes: number): ListedMediaFile {
  return { name, path, bytes };
}

function wrap(name: string, folder: string, bytes: number, width: number | null, height: number | null): WrapFile {
  return { name, folder, path: `/demo/wraps/${name}`, bytes, width, height };
}

const fullClips: TeslaCamClipFile[] = [
  ...eventClips("2026-09-03_21-15-30", "recent", false),
  ...eventClips("2026-09-03_21-16-30", "recent", false),
  ...eventClips("2026-09-03_22-01-00", "saved", true),
  ...eventClips("2026-09-03_23-10-12", "sentry", true),
];

const fullLightShowListing: ListedMediaFile[] = [
  media("holiday.fseq", "/demo/lightshow/holiday.fseq", FSEQ.holiday),
  media("holiday.wav", "/demo/audio/tone.wav", TONE),
  media("cyberpunk.fseq", "/demo/lightshow/cyberpunk.fseq", FSEQ.cyberpunk),
  media("cyberpunk.mp3", "/demo/audio/beep.mp3", BEEP),
  media("aurora.fseq", "/demo/lightshow/aurora.fseq", FSEQ.aurora),
  media("aurora.wav", "/demo/audio/tone.wav", TONE),
  media("lonely.fseq", "/demo/lightshow/lonely.fseq", FSEQ.lonely),
];

const fullBoomboxListing: ListedMediaFile[] = [
  media("horn.wav", "/demo/audio/tone.wav", TONE),
  media("siren.mp3", "/demo/audio/beep.mp3", BEEP),
  media("laugh.wav", "/demo/audio/lockchime.wav", LOCK),
];

const demoFull: VolumeSnapshot = {
  path: "/demo/TeslaUSB",
  filesystem: "exFAT",
  totalBytes: 128 * GB,
  freeBytes: 86 * GB,
  rootEntries: [
    { name: "TeslaCam", isDir: true },
    { name: "LightShow", isDir: true },
    { name: "Wraps", isDir: true },
    { name: "Boombox", isDir: true },
    { name: "LockChime.wav", isDir: false },
  ],
  teslaCam: {
    present: true,
    recentClips: { exists: true, itemCount: 8, bytes: 4 * CLIP_A + 4 * CLIP_B },
    savedClips: { exists: true, itemCount: 1, bytes: 2 * CLIP_A + 2 * CLIP_B },
    sentryClips: { exists: true, itemCount: 1, bytes: 2 * CLIP_A + 2 * CLIP_B },
  },
  lightShowFiles: fullLightShowListing.map((file) => file.name),
  boomboxFiles: fullBoomboxListing.map((file) => file.name),
  hasLockChime: true,
  audioFilesAtRoot: [],
  wrapFiles: [
    wrap("Sunset.png", "Wraps", PNG.Sunset, 1024, 1024),
    wrap("Cyber.png", "Wraps", PNG.Cyber, 1024, 768),
    wrap("Mountain.png", "Wraps", PNG.Mountain, 768, 768),
    wrap("too_big.png", "Wraps", 2 * MB, 2048, 2048),
  ],
  teslaCamClips: fullClips,
  lightShowListing: fullLightShowListing,
  boomboxListing: fullBoomboxListing,
  lockChimeFile: media("LockChime.wav", "/demo/audio/lockchime.wav", LOCK),
};

const camClips = eventClips("2026-09-03_20-00-00", "recent", false).concat(
  eventClips("2026-09-03_18-30-00", "saved", true),
  eventClips("2026-09-03_19-05-00", "sentry", true).slice(0, 2),
);

const demoCam: VolumeSnapshot = {
  path: "/demo/TeslaCam",
  filesystem: "exFAT",
  totalBytes: 64 * GB,
  freeBytes: Math.round(32.1 * GB),
  rootEntries: [
    { name: "TeslaCam", isDir: true },
    { name: "song.mp3", isDir: false },
  ],
  teslaCam: {
    present: true,
    recentClips: { exists: true, itemCount: 4, bytes: 2 * CLIP_A + 2 * CLIP_B },
    savedClips: { exists: true, itemCount: 1, bytes: 2 * CLIP_A + 2 * CLIP_B },
    sentryClips: { exists: true, itemCount: 2, bytes: CLIP_A + CLIP_B },
  },
  lightShowFiles: [],
  boomboxFiles: [],
  hasLockChime: false,
  audioFilesAtRoot: ["song.mp3"],
  wrapFiles: [],
  teslaCamClips: camClips,
  lightShowListing: [],
  boomboxListing: [],
  lockChimeFile: null,
};

const demoLightShowListing: ListedMediaFile[] = [
  media("holiday.fseq", "/demo/lightshow/holiday.fseq", FSEQ.holiday),
  media("holiday.wav", "/demo/audio/tone.wav", TONE),
  media("orphan.fseq", "/demo/lightshow/lonely.fseq", FSEQ.lonely),
];

const demoLightShow: VolumeSnapshot = {
  path: "/demo/LightShow",
  filesystem: "exFAT",
  totalBytes: 32 * GB,
  freeBytes: 30 * GB,
  rootEntries: [{ name: "LightShow", isDir: true }],
  teslaCam: null,
  lightShowFiles: demoLightShowListing.map((file) => file.name),
  boomboxFiles: [],
  hasLockChime: false,
  audioFilesAtRoot: [],
  wrapFiles: [],
  teslaCamClips: [],
  lightShowListing: demoLightShowListing,
  boomboxListing: [],
  lockChimeFile: null,
};

const demoConflict: VolumeSnapshot = {
  path: "/demo/Conflict",
  filesystem: "FAT32",
  totalBytes: 64 * GB,
  freeBytes: 40 * GB,
  rootEntries: [
    { name: "TeslaCam", isDir: true },
    { name: "LightShow", isDir: true },
    { name: "release.tgz", isDir: false },
  ],
  teslaCam: {
    present: true,
    recentClips: { exists: true, itemCount: 0, bytes: 0 },
    savedClips: { exists: false, itemCount: 0, bytes: null },
    sentryClips: { exists: false, itemCount: 0, bytes: null },
  },
  lightShowFiles: ["show1.fseq", "show1.mp3"],
  boomboxFiles: [],
  hasLockChime: false,
  audioFilesAtRoot: [],
  wrapFiles: [],
  teslaCamClips: [],
  lightShowListing: [
    media("show1.fseq", "/demo/lightshow/holiday.fseq", FSEQ.holiday),
    media("show1.mp3", "/demo/audio/beep.mp3", BEEP),
  ],
  boomboxListing: [],
  lockChimeFile: null,
};

const demoNtfs: VolumeSnapshot = {
  path: "/demo/NTFS",
  filesystem: "NTFS",
  totalBytes: 256 * GB,
  freeBytes: 200 * GB,
  rootEntries: [
    { name: "TeslaCam", isDir: true },
    { name: "Boombox", isDir: true },
    { name: "LockChime.wav", isDir: false },
  ],
  teslaCam: {
    present: true,
    recentClips: { exists: true, itemCount: 2, bytes: CLIP_A + CLIP_B },
    savedClips: { exists: true, itemCount: 1, bytes: CLIP_A },
    sentryClips: { exists: true, itemCount: 0, bytes: 0 },
  },
  lightShowFiles: [],
  boomboxFiles: ["horn.wav", "beep.mp3"],
  hasLockChime: true,
  audioFilesAtRoot: [],
  wrapFiles: [],
  teslaCamClips: [
    camClip("2026-09-03_10-00-00-front.mp4", "recent", null, "a"),
    camClip("2026-09-03_10-00-00-back.mp4", "recent", null, "b"),
    camClip("2026-09-03_11-00-00-front.mp4", "saved", "2026-09-03_11-00-00", "a"),
  ],
  lightShowListing: [],
  boomboxListing: [
    media("horn.wav", "/demo/audio/tone.wav", TONE),
    media("beep.mp3", "/demo/audio/beep.mp3", BEEP),
  ],
  lockChimeFile: media("LockChime.wav", "/demo/audio/lockchime.wav", LOCK),
};

const demoWraps: VolumeSnapshot = {
  path: "/demo/Wraps",
  filesystem: "exFAT",
  totalBytes: 16 * GB,
  freeBytes: 15 * GB,
  rootEntries: [{ name: "Wraps", isDir: true }],
  teslaCam: null,
  lightShowFiles: [],
  boomboxFiles: [],
  hasLockChime: false,
  audioFilesAtRoot: [],
  wrapFiles: [
    wrap("Sunset.png", "Wraps", PNG.Sunset, 1024, 1024),
    wrap("Cyber.png", "Wraps", PNG.Cyber, 1024, 768),
    wrap("too_big.png", "Wraps", 2 * MB, 2048, 2048),
    { name: "notes!.jpg", folder: "Wraps", path: null, bytes: 80000, width: null, height: null },
  ],
  teslaCamClips: [],
  lightShowListing: [],
  boomboxListing: [],
  lockChimeFile: null,
};

export const DEMO_VOLUMES: DemoVolume[] = [
  {
    id: "demo:full",
    name: "Tesla USB（演示）",
    path: demoFull.path,
    filesystem: demoFull.filesystem,
    totalBytes: demoFull.totalBytes,
    freeBytes: demoFull.freeBytes,
    kind: "removable",
    platform: "demo",
    device: "demo-disk-full",
    isSystem: false,
    formatEligible: true,
    snapshot: demoFull,
  },
  {
    id: "demo:cam",
    name: "Tesla USB",
    path: demoCam.path,
    filesystem: demoCam.filesystem,
    totalBytes: demoCam.totalBytes,
    freeBytes: demoCam.freeBytes,
    kind: "removable",
    platform: "demo",
    device: "demo-disk0",
    isSystem: false,
    formatEligible: true,
    snapshot: demoCam,
  },
  {
    id: "demo:lightshow",
    name: "LightShow",
    path: demoLightShow.path,
    filesystem: demoLightShow.filesystem,
    totalBytes: demoLightShow.totalBytes,
    freeBytes: demoLightShow.freeBytes,
    kind: "removable",
    platform: "demo",
    device: "demo-disk1",
    isSystem: false,
    formatEligible: true,
    snapshot: demoLightShow,
  },
  {
    id: "demo:wraps",
    name: "Wraps",
    path: demoWraps.path,
    filesystem: demoWraps.filesystem,
    totalBytes: demoWraps.totalBytes,
    freeBytes: demoWraps.freeBytes,
    kind: "removable",
    platform: "demo",
    device: "demo-disk4",
    isSystem: false,
    formatEligible: true,
    snapshot: demoWraps,
  },
  {
    id: "demo:conflict",
    name: "Mixed Drive",
    path: demoConflict.path,
    filesystem: demoConflict.filesystem,
    totalBytes: demoConflict.totalBytes,
    freeBytes: demoConflict.freeBytes,
    kind: "removable",
    platform: "demo",
    device: "demo-disk2",
    isSystem: false,
    formatEligible: true,
    snapshot: demoConflict,
  },
  {
    id: "demo:ntfs",
    name: "NTFS Drive",
    path: demoNtfs.path,
    filesystem: demoNtfs.filesystem,
    totalBytes: demoNtfs.totalBytes,
    freeBytes: demoNtfs.freeBytes,
    kind: "external",
    platform: "demo",
    device: "demo-disk3",
    isSystem: false,
    formatEligible: true,
    snapshot: demoNtfs,
  },
];
