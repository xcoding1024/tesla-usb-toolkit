import { describe, expect, it } from "vitest";
import { t } from "../i18n";
import {
  collectUpdateFiles,
  isUpdateLikeName,
  validateWrapAsset,
  WRAP_MAX_BYTES,
} from "./wraps";

describe("update file heuristics", () => {
  it("recognizes firmware/map archives and ignores ordinary media", () => {
    expect(isUpdateLikeName("release.tgz")).toBe(true);
    expect(isUpdateLikeName("firmware")).toBe(true);
    expect(isUpdateLikeName("map-update")).toBe(true);
    expect(isUpdateLikeName("holiday.fseq")).toBe(false);
    expect(isUpdateLikeName("LockChime.wav")).toBe(false);
    expect(collectUpdateFiles(["song.mp3", "firmware.img", "Wraps"])).toEqual(["firmware.img"]);
  });
});

describe("wrap validation (custom-wraps)", () => {
  it("accepts template-sized PNG under 1 MB", () => {
    expect(
      validateWrapAsset({
        name: "Sunset.png",
        folder: "Wraps",
        bytes: 400000,
        width: 1024,
        height: 1024,
      }),
    ).toEqual([]);
    expect(
      validateWrapAsset({
        name: "Cyber.png",
        folder: "Wraps",
        bytes: 380000,
        width: 1024,
        height: 768,
      }),
    ).toEqual([]);
  });

  it("flags format, name, size and pixel issues", () => {
    const notes = validateWrapAsset({
      name: "notes!.jpg",
      folder: "Wraps",
      bytes: WRAP_MAX_BYTES + 10,
      width: 2048,
      height: 128,
    });
    expect(notes).toContain(t.wraps.noteNeedPng);
    expect(notes).toContain(t.wraps.noteNameChars);
    expect(notes).toContain(t.wraps.noteTooLarge);
    expect(notes).toContain(t.wraps.noteBadSize);
  });
});
