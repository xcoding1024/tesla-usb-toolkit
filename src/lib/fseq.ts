/** Falcon Player / teslamotors/light-show FSEQ v2 header (little-endian). */

export type FseqCompression = "none" | "zstd" | "zlib" | "unknown";

export type FseqIssue =
  | "too_short"
  | "bad_magic"
  | "bad_offset"
  | "no_frames"
  | "step_too_small"
  | "bad_channels"
  | "compressed"
  | "duration_too_long"
  | "version_unvalidated";

export interface FseqInfo {
  validHeader: boolean;
  magic: string;
  versionMajor: number | null;
  versionMinor: number | null;
  channelDataOffset: number | null;
  channelCount: number | null;
  frameCount: number | null;
  stepTimeMs: number | null;
  durationMs: number | null;
  compression: FseqCompression;
  teslaOk: boolean;
  issues: FseqIssue[];
}

const TESLA_CHANNELS = new Set([48, 200]);
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

function u16le(bytes: Uint8Array, offset: number): number {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function u32le(bytes: Uint8Array, offset: number): number {
  return (
    bytes[offset] |
    (bytes[offset + 1] << 8) |
    (bytes[offset + 2] << 16) |
    (bytes[offset + 3] << 24)
  ) >>> 0;
}

function ascii(bytes: Uint8Array, start: number, end: number): string {
  return String.fromCharCode(...bytes.subarray(start, end));
}

function compressionOf(code: number): FseqCompression {
  if (code === 0) return "none";
  if (code === 1) return "zstd";
  if (code === 2) return "zlib";
  return "unknown";
}

export function emptyFseqInfo(issues: FseqIssue[]): FseqInfo {
  return {
    validHeader: false,
    magic: "",
    versionMajor: null,
    versionMinor: null,
    channelDataOffset: null,
    channelCount: null,
    frameCount: null,
    stepTimeMs: null,
    durationMs: null,
    compression: "unknown",
    teslaOk: false,
    issues,
  };
}

/** Parse the first 21+ bytes of an .fseq file (Tesla validator layout). */
export function parseFseqHeader(bytes: Uint8Array): FseqInfo {
  if (bytes.byteLength < 21) {
    return emptyFseqInfo(["too_short"]);
  }

  const magic = ascii(bytes, 0, 4);
  const channelDataOffset = u16le(bytes, 4);
  const versionMinor = bytes[6];
  const versionMajor = bytes[7];
  const channelCount = bytes.byteLength >= 14 ? u32le(bytes, 10) : 0;
  const frameCount = bytes.byteLength >= 18 ? u32le(bytes, 14) : 0;
  const stepTimeMs = bytes[18];
  const compressionCode = bytes.byteLength >= 21 ? bytes[20] : 255;
  const compression = compressionOf(compressionCode);
  const durationMs = frameCount * stepTimeMs;

  const issues: FseqIssue[] = [];
  if (magic !== "PSEQ") issues.push("bad_magic");
  if (channelDataOffset < 24) issues.push("bad_offset");
  if (frameCount < 1) issues.push("no_frames");
  if (stepTimeMs < 15) issues.push("step_too_small");
  if (!TESLA_CHANNELS.has(channelCount)) issues.push("bad_channels");
  if (compression !== "none") issues.push("compressed");
  if (durationMs > FOUR_HOURS_MS) issues.push("duration_too_long");
  if (versionMajor !== 2 || (versionMinor !== 0 && versionMinor !== 2)) {
    issues.push("version_unvalidated");
  }

  const hardErrors = issues.filter((issue) => issue !== "version_unvalidated");
  const validHeader = magic === "PSEQ" && channelDataOffset >= 24 && frameCount >= 1;

  return {
    validHeader,
    magic,
    versionMajor,
    versionMinor,
    channelDataOffset,
    channelCount,
    frameCount,
    stepTimeMs,
    durationMs,
    compression,
    teslaOk: hardErrors.length === 0,
    issues,
  };
}

export function buildFseqHeader(input: {
  channelCount: number;
  frameCount: number;
  stepTimeMs: number;
  channelDataOffset?: number;
  versionMajor?: number;
  versionMinor?: number;
  compression?: number;
}): Uint8Array {
  const bytes = new Uint8Array(32);
  bytes.set([0x50, 0x53, 0x45, 0x51], 0); // PSEQ
  const offset = input.channelDataOffset ?? 32;
  bytes[4] = offset & 0xff;
  bytes[5] = (offset >> 8) & 0xff;
  bytes[6] = input.versionMinor ?? 0;
  bytes[7] = input.versionMajor ?? 2;
  bytes[8] = 32;
  bytes[9] = 0;
  const ch = input.channelCount;
  bytes[10] = ch & 0xff;
  bytes[11] = (ch >> 8) & 0xff;
  bytes[12] = (ch >> 16) & 0xff;
  bytes[13] = (ch >> 24) & 0xff;
  const frames = input.frameCount;
  bytes[14] = frames & 0xff;
  bytes[15] = (frames >> 8) & 0xff;
  bytes[16] = (frames >> 16) & 0xff;
  bytes[17] = (frames >> 24) & 0xff;
  bytes[18] = input.stepTimeMs & 0xff;
  bytes[20] = input.compression ?? 0;
  return bytes;
}
