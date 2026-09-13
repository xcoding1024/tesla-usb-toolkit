import { interpolate, t } from "../i18n";
import type {
  DetectionReport,
  DirCount,
  FsCode,
  FsVerdict,
  LightShowPair,
  ListedMediaFile,
  Purpose,
  VolumeSnapshot,
} from "./types";
import { annotateWraps, collectUpdateFiles } from "./wraps";

const SIXTY_FOUR_GB = 64 * 1024 * 1024 * 1024;

const FS_OK = new Set([
  "exfat",
  "fat32",
  "vfat",
  "msdos",
  "msdosfat",
  "ms-dos",
  "fat",
  "ext",
  "ext3",
  "ext4",
]);

const FS_FAIL = new Set(["ntfs"]);

function normalizeFs(raw: string): string {
  return raw.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function classifyFilesystem(raw: string | null): {
  verdict: FsVerdict;
  code: FsCode;
  type: string | null;
  message: string;
} {
  if (!raw || !raw.trim()) {
    return {
      verdict: "warn",
      code: "FS_UNKNOWN",
      type: null,
      message: t.rules.fsUnknown,
    };
  }
  const normalized = normalizeFs(raw);
  if (FS_FAIL.has(normalized)) {
    return {
      verdict: "fail",
      code: "FS_FAIL_NTFS",
      type: raw,
      message: t.rules.fsNtfs,
    };
  }
  if (FS_OK.has(normalized) || normalized.startsWith("ext")) {
    const preferred = normalized === "exfat";
    return {
      verdict: "ok",
      code: "FS_OK",
      type: raw,
      message: preferred ? t.rules.fsExfat : interpolate(t.rules.fsOkOther, { fs: raw }),
    };
  }
  return {
    verdict: "warn",
    code: "FS_UNKNOWN",
    type: raw,
    message: interpolate(t.rules.fsUnknownNamed, { fs: raw }),
  };
}

function compactName(name: string): string {
  return name.replace(/[\s_-]/g, "").toLowerCase();
}

function findTypo(entries: VolumeSnapshot["rootEntries"], exact: string): string | undefined {
  const compactExact = compactName(exact);
  return entries.find(
    (entry) => compactName(entry.name) === compactExact && entry.name !== exact,
  )?.name;
}

function pairLightShow(
  files: string[],
  listing: ListedMediaFile[] = [],
): { shows: LightShowPair[]; orphans: string[] } {
  const byName = new Map(listing.map((file) => [file.name, file]));
  const stems = new Map<string, { fseq?: string; audio?: string }>();
  for (const file of files) {
    const dot = file.lastIndexOf(".");
    if (dot <= 0) continue;
    const stem = file.slice(0, dot);
    const ext = file.slice(dot + 1).toLowerCase();
    const current = stems.get(stem) ?? {};
    if (ext === "fseq") {
      current.fseq = file;
    } else if (ext === "wav" || ext === "mp3") {
      if (!current.audio || ext === "wav") {
        current.audio = file;
      }
    }
    stems.set(stem, current);
  }

  const shows: LightShowPair[] = [];
  const orphans: string[] = [];
  for (const [name, pair] of stems) {
    if (pair.fseq && pair.audio) {
      const show: LightShowPair = { name, sequence: pair.fseq, audio: pair.audio };
      const sequenceFile = byName.get(pair.fseq);
      const audioFile = byName.get(pair.audio);
      if (sequenceFile) show.sequenceFile = sequenceFile;
      if (audioFile) show.audioFile = audioFile;
      shows.push(show);
    } else if (pair.fseq) {
      orphans.push(pair.fseq);
    } else if (pair.audio) {
      orphans.push(pair.audio);
    }
  }
  shows.sort((a, b) => a.name.localeCompare(b.name));
  orphans.sort();
  return { shows, orphans };
}

function emptyCount(): DirCount {
  return { exists: false, itemCount: 0 };
}

function teslaCamStatus(
  fsOk: boolean,
  present: boolean,
  recent: DirCount,
  saved: DirCount,
  sentry: DirCount,
): "ready" | "inUse" | "emptyShell" | undefined {
  if (!present) return undefined;
  const hasContent =
    (recent.exists && recent.itemCount > 0) ||
    (saved.exists && saved.itemCount > 0) ||
    (sentry.exists && sentry.itemCount > 0);
  if (hasContent) return "inUse";
  if (fsOk) return "ready";
  return "emptyShell";
}

export function evaluate(snapshot: VolumeSnapshot): DetectionReport {
  const filesystem = classifyFilesystem(snapshot.filesystem);
  const fsOk = filesystem.verdict === "ok";
  const rootNames = new Set(snapshot.rootEntries.map((e) => e.name));
  const hasTeslaCam = rootNames.has("TeslaCam") || Boolean(snapshot.teslaCam?.present);
  const hasLightShow = rootNames.has("LightShow") || snapshot.lightShowFiles.length > 0;
  const hasTrackMode = rootNames.has("TeslaTrackMode");
  const hasBoombox = rootNames.has("Boombox") || snapshot.boomboxFiles.length > 0;
  const hasWrapsFolder = rootNames.has("LicensePlate") || rootNames.has("Wraps");
  const wrapFiles = snapshot.wrapFiles ?? [];
  const hasPaintShop = hasWrapsFolder || wrapFiles.length > 0;
  const updateFiles = collectUpdateFiles(snapshot.rootEntries.map((entry) => entry.name));

  const namingIssues: string[] = [];
  const teslaCamTypo = findTypo(snapshot.rootEntries, "TeslaCam");
  if (teslaCamTypo) {
    namingIssues.push(interpolate(t.rules.typoTeslaCam, { name: teslaCamTypo }));
  }
  const lightShowTypo = findTypo(snapshot.rootEntries, "LightShow");
  if (lightShowTypo) {
    namingIssues.push(interpolate(t.rules.typoLightShow, { name: lightShowTypo }));
  }
  const trackTypo = findTypo(snapshot.rootEntries, "TeslaTrackMode");
  if (trackTypo) {
    namingIssues.push(interpolate(t.rules.typoTrackMode, { name: trackTypo }));
  }

  const purposes: Purpose[] = [];
  if (hasTeslaCam) {
    purposes.push({ id: "dashcam", label: t.rules.purposeDashcam, confidence: "high" });
  }
  if (hasTrackMode) {
    purposes.push({ id: "trackMode", label: t.rules.purposeTrackMode, confidence: "high" });
  }
  if (hasLightShow) {
    purposes.push({ id: "lightShow", label: t.rules.purposeLightShow, confidence: "high" });
  }
  if (hasBoombox || snapshot.hasLockChime) {
    purposes.push({ id: "boombox", label: t.rules.purposeBoombox, confidence: "high" });
  }
  if (snapshot.audioFilesAtRoot.length > 0) {
    purposes.push({ id: "music", label: t.rules.purposeMusic, confidence: "medium" });
  }
  if (hasPaintShop) {
    purposes.push({ id: "paintShop", label: t.rules.purposePaintShop, confidence: "medium" });
  }

  const conflicts: DetectionReport["conflicts"] = [];
  if (hasTeslaCam && hasLightShow) {
    conflicts.push({
      id: "lightshow-teslacam",
      message: t.rules.conflictLightShowCam,
    });
  }
  if (hasLightShow && updateFiles.length > 0) {
    conflicts.push({
      id: "lightshow-update",
      message: t.rules.conflictLightShowUpdate,
    });
  }
  if (hasPaintShop && updateFiles.length > 0) {
    conflicts.push({
      id: "wraps-update",
      message: t.rules.conflictWrapsUpdate,
    });
  }
  if (filesystem.code === "FS_FAIL_NTFS") {
    conflicts.push({
      id: "ntfs",
      message: t.rules.conflictNtfs,
    });
  }

  const lightShowListing = snapshot.lightShowListing ?? [];
  const lightShow = hasLightShow ? pairLightShow(snapshot.lightShowFiles, lightShowListing) : undefined;
  const recent = snapshot.teslaCam?.recentClips ?? emptyCount();
  const saved = snapshot.teslaCam?.savedClips ?? emptyCount();
  const sentry = snapshot.teslaCam?.sentryClips ?? emptyCount();
  const camStatus = teslaCamStatus(fsOk, hasTeslaCam, recent, saved, sentry);

  const tips: string[] = [];
  if (filesystem.code === "FS_FAIL_NTFS") {
    tips.push(t.rules.tipFormatNtfs);
  } else if (filesystem.code === "FS_UNKNOWN") {
    tips.push(t.rules.tipFormatUnknown);
  }
  if (!hasTeslaCam && teslaCamTypo) {
    tips.push(t.rules.tipRenameTeslaCam);
  } else if (!hasTeslaCam && !hasLightShow && !hasBoombox && !hasTrackMode) {
    tips.push(t.rules.tipCreateTeslaCam);
  }
  if (hasTeslaCam && camStatus === "emptyShell") {
    tips.push(t.rules.tipEmptyShell);
  }
  if (hasLightShow && hasTeslaCam) {
    tips.push(t.rules.tipSeparateLightShow);
  }
  if (lightShow && lightShow.orphans.length > 0) {
    tips.push(t.rules.tipPairFseq);
  }
  if (hasLightShow && updateFiles.length > 0) {
    tips.push(t.rules.tipRemoveLightShowUpdates);
  }
  if (hasPaintShop && updateFiles.length > 0) {
    tips.push(t.rules.tipRemoveWrapUpdates);
  }
  const wrapAssets = annotateWraps(wrapFiles);
  if (wrapAssets.some((asset) => asset.notes.length > 0)) {
    tips.push(t.rules.tipFixWraps);
  }
  if (wrapAssets.length > 10) {
    tips.push(t.rules.tipTooManyWraps);
  }
  if (saved.exists && saved.itemCount > 80) {
    tips.push(t.rules.tipManyClips);
  }
  if (hasTeslaCam && snapshot.audioFilesAtRoot.length > 0) {
    tips.push(t.rules.tipCamAndMusic);
  }
  if (snapshot.boomboxFiles.length > 5) {
    tips.push(t.rules.tipBoomboxLimit);
  }

  let capacityWarning: string | undefined;
  if (snapshot.totalBytes != null && snapshot.totalBytes < SIXTY_FOUR_GB) {
    capacityWarning = t.rules.capacitySmall;
    tips.push(capacityWarning);
  }

  if (purposes.length === 0) {
    purposes.push({
      id: "empty",
      label: t.rules.purposeEmpty,
      confidence: "low",
    });
  }

  return {
    path: snapshot.path,
    filesystem,
    purposes,
    conflicts,
    content: {
      teslaCam: hasTeslaCam
        ? {
            ready: fsOk && hasTeslaCam,
            status: camStatus ?? "emptyShell",
            recentClips: recent,
            savedClips: saved,
            sentryClips: sentry,
            clips: snapshot.teslaCamClips ?? [],
          }
        : undefined,
      lightShow: lightShow
        ? {
            ...lightShow,
            files: lightShowListing,
          }
        : undefined,
      boombox:
        hasBoombox || snapshot.hasLockChime
          ? {
              files: snapshot.boomboxFiles,
              hasLockChime: snapshot.hasLockChime,
              listing: snapshot.boomboxListing ?? [],
              lockChimeFile: snapshot.lockChimeFile ?? null,
            }
          : undefined,
      wraps:
        hasPaintShop
          ? {
              folderPresent: hasWrapsFolder,
              assets: wrapAssets,
              validCount: wrapAssets.filter((asset) => asset.notes.length === 0).length,
              tooMany: wrapAssets.length > 10,
            }
          : undefined,
      trackMode: hasTrackMode ? { present: true } : undefined,
      music:
        snapshot.audioFilesAtRoot.length > 0
          ? { rootAudioCount: snapshot.audioFilesAtRoot.length }
          : undefined,
      updateFiles,
      namingIssues,
      capacityWarning,
    },
    tips,
  };
}

export function kindLabel(kind: string): string {
  if (kind === "removable") return t.kind.removable;
  if (kind === "external") return t.kind.external;
  return t.kind.unknown;
}
