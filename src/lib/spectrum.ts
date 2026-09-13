/** Tesla Light Show sequences use 48 or 200 channels; 48 bars keep the preview readable. */
export const DEFAULT_BAR_COUNT = 48;

/** Map analyser frequency bins to log-spaced bar heights in 0..1. */
export function mapFrequencyBars(bins: ArrayLike<number>, barCount: number): number[] {
  if (barCount <= 0) return [];
  const binCount = bins.length;
  if (binCount <= 1) return Array.from({ length: barCount }, () => 0);

  const minBin = 1;
  const maxBin = binCount - 1;
  const span = maxBin / minBin;
  const bars = new Array<number>(barCount);

  for (let i = 0; i < barCount; i++) {
    const start = Math.min(maxBin, Math.floor(minBin * span ** (i / barCount)));
    const rawEnd = Math.floor(minBin * span ** ((i + 1) / barCount));
    const end = i === barCount - 1 ? maxBin + 1 : Math.min(maxBin + 1, Math.max(start + 1, rawEnd));
    let peak = 0;
    for (let j = start; j < end; j++) {
      const value = bins[j] ?? 0;
      if (value > peak) peak = value;
    }
    bars[i] = (peak / 255) ** 0.72;
  }
  return bars;
}

/** Peak-hold caps: rise instantly, fall by `decay` each frame. */
export function updatePeaks(bars: number[], peaks: readonly number[], decay: number): number[] {
  const next = peaks.length === bars.length ? peaks.slice() : Array.from({ length: bars.length }, () => 0);
  for (let i = 0; i < bars.length; i++) {
    const current = bars[i] ?? 0;
    const held = next[i] ?? 0;
    next[i] = current >= held ? current : Math.max(0, held - decay);
  }
  return next;
}

export function bassEnergy(bars: readonly number[], count = 6): number {
  if (bars.length === 0) return 0;
  const n = Math.min(count, bars.length);
  let sum = 0;
  for (let i = 0; i < n; i++) sum += bars[i] ?? 0;
  return sum / n;
}

/** Soft traveling wave used while audio is paused. */
export function idleBars(nowMs: number, barCount: number, amplitude = 0.32): number[] {
  const bars = new Array<number>(barCount);
  const t = nowMs / 1000;
  for (let i = 0; i < barCount; i++) {
    const wave = 0.5 + 0.5 * Math.sin(t * 1.4 + i * 0.28);
    const envelope = 0.55 + 0.45 * Math.sin(t * 0.7 + i * 0.08);
    bars[i] = amplitude * wave * envelope;
  }
  return bars;
}
