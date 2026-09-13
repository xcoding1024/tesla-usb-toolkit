type AudioContextCtor = typeof AudioContext;

function audioContextCtor(): AudioContextCtor | undefined {
  if (typeof window === "undefined") return undefined;
  const webkit = (window as unknown as { webkitAudioContext?: AudioContextCtor }).webkitAudioContext;
  return window.AudioContext ?? webkit;
}

let sharedContext: AudioContext | null = null;
const analysers = new WeakMap<HTMLMediaElement, AnalyserNode>();

export function isSameOriginMedia(
  src: string,
  origin = typeof window !== "undefined" ? window.location.origin : "",
): boolean {
  if (src.startsWith("/") || src.startsWith("./") || src.startsWith("blob:") || src.startsWith("data:")) {
    return true;
  }
  if (!origin) return false;
  try {
    return new URL(src, origin).origin === origin;
  } catch {
    return false;
  }
}

export async function toSameOriginSrc(src: string): Promise<{ url: string; revoke: () => void }> {
  if (isSameOriginMedia(src)) return { url: src, revoke: () => {} };
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`failed to fetch audio: ${response.status}`);
  }
  const url = URL.createObjectURL(await response.blob());
  return { url, revoke: () => URL.revokeObjectURL(url) };
}

export function getAudioContext(): AudioContext | null {
  const Ctor = audioContextCtor();
  if (!Ctor) return null;
  if (!sharedContext || sharedContext.state === "closed") {
    sharedContext = new Ctor();
  }
  return sharedContext;
}

export async function resumeAudioContext(): Promise<AudioContext | null> {
  const ctx = getAudioContext();
  if (ctx && ctx.state === "suspended") await ctx.resume();
  return ctx;
}

export function attachMediaAnalyser(audio: HTMLMediaElement): AnalyserNode | null {
  const existing = analysers.get(audio);
  if (existing) return existing;
  const ctx = getAudioContext();
  if (!ctx) return null;
  try {
    const source = ctx.createMediaElementSource(audio);
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    analyser.smoothingTimeConstant = 0.78;
    analyser.minDecibels = -85;
    analyser.maxDecibels = -15;
    source.connect(analyser);
    analyser.connect(ctx.destination);
    analysers.set(audio, analyser);
    return analyser;
  } catch {
    return null;
  }
}
