import type { TeslaCamCategory, TeslaCamClipFile, TeslaCamera } from "./types";

export const TESLA_CAMERAS = ["front", "back", "left_repeater", "right_repeater"] as const;

export interface TeslaClipTime {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  label: string;
  sortKey: string;
}

export interface ParsedTeslaName {
  eventId: string;
  time: TeslaClipTime | null;
  camera: TeslaCamera | null;
}

export interface TeslaCamEventGroup {
  id: string;
  label: string;
  sortKey: string;
  category: TeslaCamCategory;
  eventFolder: string | null;
  clips: TeslaCamListedClip[];
}

export interface TeslaCamListedClip extends TeslaCamClipFile {
  camera: TeslaCamera | null;
  time: TeslaClipTime | null;
}

const CLIP_NAME_RE =
  /^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})-(\d{2})(?:-(front|back|left_repeater|right_repeater))?$/i;

const CAMERA_RANK: Record<TeslaCamera, number> = {
  front: 0,
  back: 1,
  left_repeater: 2,
  right_repeater: 3,
};

export function isTeslaCamera(value: string): value is TeslaCamera {
  return (TESLA_CAMERAS as readonly string[]).includes(value);
}

export function isTeslaCamCategory(value: string): value is TeslaCamCategory {
  return value === "recent" || value === "saved" || value === "sentry";
}

function fileStem(fileName: string): string {
  const base = fileName.includes("/") ? (fileName.split("/").pop() ?? fileName) : fileName;
  const dot = base.lastIndexOf(".");
  return dot > 0 ? base.slice(0, dot) : base;
}

export function parseTeslaCamFileName(fileName: string): ParsedTeslaName {
  const stem = fileStem(fileName);
  const match = stem.match(CLIP_NAME_RE);
  if (!match) {
    return { eventId: stem, time: null, camera: null };
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = Number(match[6]);
  const cameraRaw = match[7]?.toLowerCase();
  const camera = cameraRaw && isTeslaCamera(cameraRaw) ? cameraRaw : null;
  const eventId = `${match[1]}-${match[2]}-${match[3]}_${match[4]}-${match[5]}-${match[6]}`;

  return {
    eventId,
    camera,
    time: {
      year,
      month,
      day,
      hour,
      minute,
      second,
      label: `${match[1]}-${match[2]}-${match[3]} ${match[4]}:${match[5]}:${match[6]}`,
      sortKey: `${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`,
    },
  };
}

export function groupTeslaCamClips(clips: TeslaCamClipFile[]): Record<TeslaCamCategory, TeslaCamEventGroup[]> {
  const buckets: Record<TeslaCamCategory, Map<string, TeslaCamEventGroup>> = {
    recent: new Map(),
    saved: new Map(),
    sentry: new Map(),
  };

  for (const clip of clips) {
    const nameParsed = parseTeslaCamFileName(clip.name);
    const folderParsed = clip.eventFolder ? parseTeslaCamFileName(clip.eventFolder) : null;
    const eventId = clip.eventFolder ?? nameParsed.eventId;
    const time = folderParsed?.time ?? nameParsed.time;
    const listed: TeslaCamListedClip = {
      ...clip,
      camera: nameParsed.camera,
      time: nameParsed.time ?? folderParsed?.time ?? null,
    };

    const map = buckets[clip.category];
    const existing = map.get(eventId);
    if (existing) {
      existing.clips.push(listed);
      continue;
    }
    map.set(eventId, {
      id: `${clip.category}:${eventId}`,
      label: time?.label ?? clip.eventFolder ?? eventId,
      sortKey: time?.sortKey ?? eventId,
      category: clip.category,
      eventFolder: clip.eventFolder,
      clips: [listed],
    });
  }

  const sortClips = (items: TeslaCamListedClip[]): TeslaCamListedClip[] =>
    [...items].sort((a, b) => {
      const rankA = a.camera ? CAMERA_RANK[a.camera] : 99;
      const rankB = b.camera ? CAMERA_RANK[b.camera] : 99;
      if (rankA !== rankB) return rankA - rankB;
      return a.name.localeCompare(b.name);
    });

  const sortGroups = (items: TeslaCamEventGroup[]): TeslaCamEventGroup[] =>
    [...items]
      .map((group) => ({ ...group, clips: sortClips(group.clips) }))
      .sort((a, b) => b.sortKey.localeCompare(a.sortKey) || a.label.localeCompare(b.label));

  return {
    recent: sortGroups([...buckets.recent.values()]),
    saved: sortGroups([...buckets.saved.values()]),
    sentry: sortGroups([...buckets.sentry.values()]),
  };
}
