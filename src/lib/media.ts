import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { isTauri } from "./tauri";

export function isBundledDemoPath(path: string): boolean {
  return path.startsWith("/demo/");
}

function isAlreadyUrl(path: string): boolean {
  return (
    isBundledDemoPath(path) ||
    path.startsWith("blob:") ||
    path.startsWith("asset:") ||
    path.startsWith("http://") ||
    path.startsWith("https://")
  );
}

/** Local disk path → asset: URL in Tauri; public `/demo/...` stays as-is in the browser. */
export function toMediaSrc(path: string | null | undefined, tauri = isTauri()): string | null {
  if (!path) return null;
  if (isAlreadyUrl(path)) return path;
  if (tauri) return convertFileSrc(path);
  return path;
}

/** Parse PCM WAV duration from the first bytes (fmt + data chunks). */
export function wavDurationMsFromHead(head: Uint8Array): number | null {
  if (head.length < 44) return null;
  if (head[0] !== 0x52 || head[1] !== 0x49 || head[2] !== 0x46 || head[3] !== 0x46) return null;
  if (head[8] !== 0x57 || head[9] !== 0x41 || head[10] !== 0x56 || head[11] !== 0x45) return null;

  let pos = 12;
  let sampleRate: number | null = null;
  let channels: number | null = null;
  let bitsPerSample: number | null = null;
  let dataBytes: number | null = null;

  while (pos + 8 <= head.length) {
    const chunkId = String.fromCharCode(head[pos]!, head[pos + 1]!, head[pos + 2]!, head[pos + 3]!);
    const chunkSize = head[pos + 4]! | (head[pos + 5]! << 8) | (head[pos + 6]! << 16) | (head[pos + 7]! << 24);
    pos += 8;
    if (chunkId === "fmt " && chunkSize >= 16 && pos + 16 <= head.length) {
      channels = head[pos + 2]! | (head[pos + 3]! << 8);
      sampleRate = head[pos + 4]! | (head[pos + 5]! << 8) | (head[pos + 6]! << 16) | (head[pos + 7]! << 24);
      bitsPerSample = head[pos + 14]! | (head[pos + 15]! << 8);
    } else if (chunkId === "data") {
      dataBytes = chunkSize;
      break;
    }
    pos += chunkSize + (chunkSize % 2);
  }

  if (sampleRate == null || channels == null || bitsPerSample == null || dataBytes == null) return null;
  if (sampleRate <= 0 || channels <= 0 || bitsPerSample <= 0 || dataBytes <= 0) return null;

  const bytesPerSecond = sampleRate * channels * (bitsPerSample / 8);
  return Math.round((dataBytes / bytesPerSecond) * 1000);
}

export async function readFileHead(path: string, maxBytes = 64): Promise<Uint8Array> {
  const limit = Math.max(1, Math.min(maxBytes, 4096));
  if (isAlreadyUrl(path)) {
    const response = await fetch(path);
    if (!response.ok) {
      throw new Error(`failed to read ${path}: ${response.status}`);
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    return buffer.subarray(0, limit);
  }
  const bytes = await invoke<number[]>("read_file_head", { path, maxBytes: limit });
  return Uint8Array.from(bytes);
}
