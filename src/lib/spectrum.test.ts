import { describe, expect, it } from "vitest";
import { bassEnergy, idleBars, mapFrequencyBars, updatePeaks } from "./spectrum";

describe("mapFrequencyBars", () => {
  it("returns zeros for empty or silent bins", () => {
    expect(mapFrequencyBars([], 8)).toEqual(Array.from({ length: 8 }, () => 0));
    expect(mapFrequencyBars(new Uint8Array(64), 8).every((value) => value === 0)).toBe(true);
  });

  it("keeps the requested bar count", () => {
    const bins = new Uint8Array(128);
    bins.fill(80);
    expect(mapFrequencyBars(bins, 48)).toHaveLength(48);
  });

  it("puts low-frequency energy in the first bars", () => {
    const bins = new Uint8Array(128);
    bins[1] = 255;
    const bars = mapFrequencyBars(bins, 16);
    expect(bars[0]).toBeGreaterThan(0.8);
    expect(Math.max(...bars.slice(4))).toBe(0);
  });

  it("puts high-frequency energy in the last bars", () => {
    const bins = new Uint8Array(128);
    bins[127] = 255;
    const bars = mapFrequencyBars(bins, 16);
    expect(bars[15]).toBeGreaterThan(0.8);
    expect(Math.max(...bars.slice(0, 12))).toBe(0);
  });
});

describe("updatePeaks", () => {
  it("rises with the current bars and decays when they drop", () => {
    const risen = updatePeaks([0.8, 0.2], [0.1, 0.1], 0.05);
    expect(risen[0]).toBe(0.8);
    expect(risen[1]).toBe(0.2);

    const fallen = updatePeaks([0.1, 0.1], risen, 0.05);
    expect(fallen[0]).toBeCloseTo(0.75);
    expect(fallen[1]).toBeCloseTo(0.15);
  });
});

describe("bassEnergy", () => {
  it("averages the leading bars", () => {
    expect(bassEnergy([0.2, 0.4, 0.6, 1], 2)).toBeCloseTo(0.3);
    expect(bassEnergy([])).toBe(0);
  });
});

describe("idleBars", () => {
  it("stays inside 0..amplitude", () => {
    const bars = idleBars(1_200, 48, 0.32);
    expect(bars).toHaveLength(48);
    expect(Math.min(...bars)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...bars)).toBeLessThanOrEqual(0.32);
  });
});
