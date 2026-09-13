export type FsVerdict = "ok" | "fail" | "warn";
export type FsCode = "FS_OK" | "FS_FAIL_NTFS" | "FS_UNKNOWN";
export type PurposeId =
  | "dashcam"
  | "trackMode"
  | "lightShow"
  | "boombox"
  | "music"
  | "paintShop"
  | "empty";

export interface Volume {
  id: string;
  name: string;
  path: string;
  filesystem: string | null;
  totalBytes: number | null;
  freeBytes: number | null;
  kind: string;
  platform: string;
  device?: string | null;
  isSystem?: boolean;
  formatEligible?: boolean;
}

export type FormatFsId = "exfat" | "fat32" | "msdos";

export interface FormatCapabilities {
  platform: string;
  canFormat: boolean;
  requiresPrivilege: boolean;
  supportedFilesystems: FormatFsId[];
  message: string;
}

export interface FormatPreview {
  path: string;
  name: string;
  currentFilesystem: string | null;
  targetFilesystem: string;
  eligible: boolean;
  willExecute: boolean;
  warning: string;
  blockers: string[];
}

export interface FormatResult {
  ok: boolean;
  filesystem: string;
  path: string;
  message: string;
}

export interface EjectResult {
  ok: boolean;
  path: string;
  message: string;
}

export interface RootEntry {
  name: string;
  isDir: boolean;
}

export interface DirCount {
  exists: boolean;
  itemCount: number;
  bytes?: number | null;
}

export interface TeslaCamScan {
  present: boolean;
  recentClips: DirCount;
  savedClips: DirCount;
  sentryClips: DirCount;
}

export interface WrapFile {
  name: string;
  folder: string;
  path?: string | null;
  bytes: number | null;
  width: number | null;
  height: number | null;
}

export type TeslaCamera = "front" | "back" | "left_repeater" | "right_repeater";
export type TeslaCamCategory = "recent" | "saved" | "sentry";

export interface TeslaCamClipFile {
  name: string;
  path: string;
  bytes: number;
  category: TeslaCamCategory;
  eventFolder: string | null;
}

export interface ListedMediaFile {
  name: string;
  path: string;
  bytes: number;
}

export interface VolumeSnapshot {
  path: string;
  filesystem: string | null;
  totalBytes: number | null;
  freeBytes: number | null;
  rootEntries: RootEntry[];
  teslaCam: TeslaCamScan | null;
  lightShowFiles: string[];
  boomboxFiles: string[];
  hasLockChime: boolean;
  audioFilesAtRoot: string[];
  wrapFiles: WrapFile[];
  teslaCamClips: TeslaCamClipFile[];
  lightShowListing: ListedMediaFile[];
  boomboxListing: ListedMediaFile[];
  lockChimeFile: ListedMediaFile | null;
}

export interface Purpose {
  id: PurposeId;
  label: string;
  confidence: "high" | "medium" | "low";
}

export interface LightShowPair {
  name: string;
  sequence: string;
  audio: string;
  sequenceFile?: ListedMediaFile;
  audioFile?: ListedMediaFile;
}

export interface WrapAsset extends WrapFile {
  notes: string[];
}

export interface DetectionReport {
  path: string;
  filesystem: {
    verdict: FsVerdict;
    type: string | null;
    code: FsCode;
    message: string;
  };
  purposes: Purpose[];
  conflicts: { id: string; message: string }[];
  content: {
    teslaCam?: {
      ready: boolean;
      status: "ready" | "inUse" | "emptyShell";
      recentClips: DirCount;
      savedClips: DirCount;
      sentryClips: DirCount;
      clips: TeslaCamClipFile[];
    };
    lightShow?: {
      shows: LightShowPair[];
      orphans: string[];
      files: ListedMediaFile[];
    };
    boombox?: {
      files: string[];
      hasLockChime: boolean;
      listing: ListedMediaFile[];
      lockChimeFile: ListedMediaFile | null;
    };
    wraps?: {
      folderPresent: boolean;
      assets: WrapAsset[];
      validCount: number;
      tooMany: boolean;
    };
    trackMode?: { present: boolean };
    music?: { rootAudioCount: number };
    updateFiles: string[];
    namingIssues: string[];
    capacityWarning?: string;
  };
  tips: string[];
}
