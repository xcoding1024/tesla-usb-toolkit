import { describe, expect, it } from "vitest";
import type { TeslaCamClipFile } from "./types";
import { groupTeslaCamClips, parseTeslaCamFileName } from "./teslaCam";

describe("parseTeslaCamFileName", () => {
  it("parses timestamp and camera from Tesla clip names", () => {
    const parsed = parseTeslaCamFileName("2026-09-03_21-15-30-front.mp4");
    expect(parsed.eventId).toBe("2026-09-03_21-15-30");
    expect(parsed.camera).toBe("front");
    expect(parsed.time).toEqual({
      year: 2026,
      month: 9,
      day: 3,
      hour: 21,
      minute: 15,
      second: 30,
      label: "2026-09-03 21:15:30",
      sortKey: "2026-09-03T21:15:30",
    });
  });

  it("accepts repeater cameras and event-folder names", () => {
    expect(parseTeslaCamFileName("2026-09-03_21-15-30-left_repeater.mp4").camera).toBe("left_repeater");
    expect(parseTeslaCamFileName("2026-09-03_21-15-30-right_repeater.mp4").camera).toBe("right_repeater");
    expect(parseTeslaCamFileName("2026-09-03_21-15-30-back.mp4").camera).toBe("back");
    const folder = parseTeslaCamFileName("2026-09-03_22-01-00");
    expect(folder.camera).toBeNull();
    expect(folder.eventId).toBe("2026-09-03_22-01-00");
    expect(folder.time?.label).toBe("2026-09-03 22:01:00");
  });

  it("keeps unknown names listable without a camera", () => {
    const parsed = parseTeslaCamFileName("random-clip.mp4");
    expect(parsed.camera).toBeNull();
    expect(parsed.time).toBeNull();
    expect(parsed.eventId).toBe("random-clip");
  });
});

describe("groupTeslaCamClips", () => {
  const clip = (
    name: string,
    category: TeslaCamClipFile["category"],
    eventFolder: string | null = null,
  ): TeslaCamClipFile => ({
    name,
    path: `/demo/${name}`,
    bytes: 100,
    category,
    eventFolder,
  });

  it("groups RecentClips by timestamp and sorts cameras", () => {
    const groups = groupTeslaCamClips([
      clip("2026-09-03_21-16-30-back.mp4", "recent"),
      clip("2026-09-03_21-15-30-front.mp4", "recent"),
      clip("2026-09-03_21-15-30-right_repeater.mp4", "recent"),
      clip("2026-09-03_21-15-30-back.mp4", "recent"),
    ]);
    expect(groups.recent.map((g) => g.label)).toEqual(["2026-09-03 21:16:30", "2026-09-03 21:15:30"]);
    expect(groups.recent[1]?.clips.map((c) => c.camera)).toEqual(["front", "back", "right_repeater"]);
    expect(groups.saved).toEqual([]);
  });

  it("keeps SavedClips / SentryClips event folders as groups", () => {
    const groups = groupTeslaCamClips([
      clip("2026-09-03_22-01-00-front.mp4", "saved", "2026-09-03_22-01-00"),
      clip("2026-09-03_22-01-00-back.mp4", "saved", "2026-09-03_22-01-00"),
      clip("2026-09-03_23-10-12-front.mp4", "sentry", "2026-09-03_23-10-12"),
    ]);
    expect(groups.saved).toHaveLength(1);
    expect(groups.saved[0]?.eventFolder).toBe("2026-09-03_22-01-00");
    expect(groups.saved[0]?.clips).toHaveLength(2);
    expect(groups.sentry[0]?.label).toBe("2026-09-03 23:10:12");
  });
});
