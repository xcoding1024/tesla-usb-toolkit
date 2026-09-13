import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { t } from "../i18n";
import type { EjectResult, FormatCapabilities, FormatPreview, FormatResult, Volume, VolumeSnapshot } from "./types";

export function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export async function listVolumes(): Promise<Volume[]> {
  return invoke<Volume[]>("list_volumes");
}

export async function scanPath(path: string): Promise<VolumeSnapshot> {
  return invoke<VolumeSnapshot>("scan_path", { path });
}

export async function readFileHead(path: string, maxBytes = 64): Promise<number[]> {
  return invoke<number[]>("read_file_head", { path, maxBytes });
}

export async function formatCapabilities(): Promise<FormatCapabilities> {
  return invoke<FormatCapabilities>("format_capabilities");
}

export async function previewFormat(path: string, filesystem: string): Promise<FormatPreview> {
  return invoke<FormatPreview>("preview_format", { path, filesystem });
}

export async function formatVolume(input: {
  path: string;
  filesystem: string;
  label: string;
  confirmed: boolean;
}): Promise<FormatResult> {
  return invoke<FormatResult>("format_volume", input);
}

export async function ejectVolume(path: string): Promise<EjectResult> {
  return invoke<EjectResult>("eject_volume", { path });
}

export async function applyWindowTitle(title: string): Promise<void> {
  if (!isTauri()) return;
  try {
    const { getCurrentWindow } = await import("@tauri-apps/api/window");
    await getCurrentWindow().setTitle(title);
  } catch {
    // Window title is best-effort; the document title still updates.
  }
}

export async function pickFolder(): Promise<string | null> {
  const selected = await open({
    directory: true,
    multiple: false,
    title: t.actions.pickFolderTitle,
  });
  if (typeof selected === "string" && selected.length > 0) {
    return selected;
  }
  return null;
}
