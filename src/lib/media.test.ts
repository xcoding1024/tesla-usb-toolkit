import { describe, expect, it } from "vitest";
import { DEMO_VOLUMES } from "./demo";
import { wavDurationMsFromHead } from "./media";

function pcmWavHead(dataBytes: number, sampleRate = 22050, channels = 1, bitsPerSample = 16): Uint8Array {
  const head = new Uint8Array(44);
  const view = new DataView(head.buffer);
  head.set([0x52, 0x49, 0x46, 0x46]); // RIFF
  view.setUint32(4, 36 + dataBytes, true);
  head.set([0x57, 0x41, 0x56, 0x45], 8); // WAVE
  head.set([0x66, 0x6d, 0x74, 0x20], 12); // fmt
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, channels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, (sampleRate * channels * bitsPerSample) / 8, true);
  view.setUint16(32, (channels * bitsPerSample) / 8, true);
  view.setUint16(34, bitsPerSample, true);
  head.set([0x64, 0x61, 0x74, 0x61], 36); // data
  view.setUint32(40, dataBytes, true);
  return head;
}

describe("wavDurationMsFromHead", () => {
  it("returns duration for PCM WAV headers", () => {
    expect(wavDurationMsFromHead(pcmWavHead(88_200))).toBe(2000);
  });

  it("returns null for non-WAV input", () => {
    expect(wavDurationMsFromHead(new Uint8Array([0, 1, 2]))).toBeNull();
  });
});

describe("demo audio assets", () => {
  it("keeps bundled demo audio large enough for browser duration UI", () => {
    const full = DEMO_VOLUMES.find((volume) => volume.id === "demo:full");
    expect(full).toBeDefined();
    const listing = full!.snapshot.lightShowListing.concat(full!.snapshot.boomboxListing);
    const cyberpunk = listing.find((file) => file.name === "cyberpunk.mp3");
    const laugh = listing.find((file) => file.name === "laugh.wav");
    expect(cyberpunk?.bytes).toBeGreaterThan(10_000);
    expect(laugh?.bytes).toBeGreaterThan(10_000);
    expect(full!.snapshot.lockChimeFile?.bytes).toBeGreaterThan(10_000);
  });
});
