import { describe, expect, it } from "vitest";
import { isSameOriginMedia } from "./audioGraph";

describe("isSameOriginMedia", () => {
  it("treats relative, blob, and data URLs as same-origin", () => {
    expect(isSameOriginMedia("/demo/audio/tone.wav")).toBe(true);
    expect(isSameOriginMedia("./beep.mp3")).toBe(true);
    expect(isSameOriginMedia("blob:http://localhost/1")).toBe(true);
    expect(isSameOriginMedia("data:audio/wav;base64,AA")).toBe(true);
  });

  it("compares absolute URLs against the page origin", () => {
    expect(isSameOriginMedia("http://localhost:1420/demo/a.wav", "http://localhost:1420")).toBe(true);
    expect(isSameOriginMedia("https://asset.localhost/foo.wav", "http://localhost:1420")).toBe(false);
  });
});
