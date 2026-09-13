import { describe, expect, it } from "vitest";
import { buildFseqHeader, parseFseqHeader } from "./fseq";

describe("parseFseqHeader", () => {
  it("reads Tesla-compatible v2 uncompressed metadata", () => {
    const header = buildFseqHeader({
      channelCount: 48,
      frameCount: 50,
      stepTimeMs: 20,
    });
    const info = parseFseqHeader(header);
    expect(info.validHeader).toBe(true);
    expect(info.magic).toBe("PSEQ");
    expect(info.versionMajor).toBe(2);
    expect(info.versionMinor).toBe(0);
    expect(info.channelCount).toBe(48);
    expect(info.frameCount).toBe(50);
    expect(info.stepTimeMs).toBe(20);
    expect(info.durationMs).toBe(1000);
    expect(info.compression).toBe("none");
    expect(info.teslaOk).toBe(true);
    expect(info.issues).toEqual([]);
  });

  it("accepts 200-channel sequences used by some Tesla models", () => {
    const info = parseFseqHeader(
      buildFseqHeader({ channelCount: 200, frameCount: 30, stepTimeMs: 25, versionMinor: 2 }),
    );
    expect(info.teslaOk).toBe(true);
    expect(info.durationMs).toBe(750);
    expect(info.versionMinor).toBe(2);
  });

  it("flags short buffers, bad magic, compression and channel counts", () => {
    expect(parseFseqHeader(new Uint8Array([1, 2, 3])).issues).toContain("too_short");

    const badMagic = buildFseqHeader({ channelCount: 48, frameCount: 10, stepTimeMs: 20 });
    badMagic.set([0x46, 0x53, 0x45, 0x51], 0);
    expect(parseFseqHeader(badMagic).issues).toContain("bad_magic");
    expect(parseFseqHeader(badMagic).teslaOk).toBe(false);

    const compressed = buildFseqHeader({
      channelCount: 48,
      frameCount: 10,
      stepTimeMs: 20,
      compression: 1,
    });
    const compressedInfo = parseFseqHeader(compressed);
    expect(compressedInfo.compression).toBe("zstd");
    expect(compressedInfo.issues).toContain("compressed");

    const channels = parseFseqHeader(
      buildFseqHeader({ channelCount: 5120, frameCount: 10, stepTimeMs: 20 }),
    );
    expect(channels.issues).toContain("bad_channels");
  });

  it("warns on unvalidated versions without failing the header", () => {
    const info = parseFseqHeader(
      buildFseqHeader({ channelCount: 48, frameCount: 10, stepTimeMs: 20, versionMajor: 2, versionMinor: 1 }),
    );
    expect(info.validHeader).toBe(true);
    expect(info.teslaOk).toBe(true);
    expect(info.issues).toEqual(["version_unvalidated"]);
  });
});
