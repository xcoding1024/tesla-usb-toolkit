import { t } from "../i18n";
import type { WrapAsset, WrapFile } from "./types";

/** teslamotors/custom-wraps：PNG，512–1024，≤1MB，文件名 ≤30 且仅字母数字/空格/_/-，U 盘最多约 10 张。 */
export const WRAP_MAX_BYTES = 1024 * 1024;
export const WRAP_MIN_DIM = 512;
export const WRAP_MAX_DIM = 1024;
export const WRAP_MAX_FILES = 10;
export const WRAP_NAME_MAX = 30;
export const WRAP_NAME_RE = /^[A-Za-z0-9 _-]+$/;

const UPDATE_EXT = /\.(tgz|tbz2|tar|img)$/i;
const UPDATE_HINT = /(firmware|map[-_ ]?update|software[-_ ]?update|release\.tgz)/i;
const UPDATE_EXACT = new Set(["firmware", "updates", "update", "mapupdate"]);

export function isUpdateLikeName(name: string): boolean {
  const trimmed = name.trim();
  if (!trimmed) return false;
  if (UPDATE_EXACT.has(trimmed.toLowerCase())) return true;
  return UPDATE_EXT.test(trimmed) || UPDATE_HINT.test(trimmed);
}

export function collectUpdateFiles(names: string[]): string[] {
  return names.filter(isUpdateLikeName).sort((a, b) => a.localeCompare(b));
}

export function validateWrapAsset(file: WrapFile): string[] {
  const notes: string[] = [];
  const isPng = file.name.toLowerCase().endsWith(".png");
  if (!isPng) {
    notes.push(t.wraps.noteNeedPng);
  }

  const stem = file.name.replace(/\.[^.]+$/, "");
  if (stem.length > WRAP_NAME_MAX) {
    notes.push(t.wraps.noteNameLong);
  }
  if (stem.length === 0 || !WRAP_NAME_RE.test(stem)) {
    notes.push(t.wraps.noteNameChars);
  }

  if (file.bytes != null && file.bytes > WRAP_MAX_BYTES) {
    notes.push(t.wraps.noteTooLarge);
  }

  if (file.width != null && file.height != null) {
    const wideOk = file.width >= WRAP_MIN_DIM && file.width <= WRAP_MAX_DIM;
    const tallOk = file.height >= WRAP_MIN_DIM && file.height <= WRAP_MAX_DIM;
    if (!wideOk || !tallOk) {
      notes.push(t.wraps.noteBadSize);
    }
  } else if (isPng) {
    notes.push(t.wraps.noteNoDimensions);
  }

  return notes;
}

export function annotateWraps(files: WrapFile[]): WrapAsset[] {
  return files.map((file) => ({ ...file, notes: validateWrapAsset(file) }));
}
