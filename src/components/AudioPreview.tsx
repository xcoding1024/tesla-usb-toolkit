import { useEffect, useRef, useState } from "react";
import { t } from "../i18n";
import { attachMediaAnalyser, resumeAudioContext, toSameOriginSrc } from "../lib/audioGraph";
import { DEFAULT_BAR_COUNT, idleBars, mapFrequencyBars, updatePeaks } from "../lib/spectrum";
import { drawSpectrum } from "../lib/spectrumDraw";

function pauseOtherPreviews(current: HTMLAudioElement): void {
  document.querySelectorAll<HTMLAudioElement>(".audio-preview audio").forEach((el) => {
    if (el !== current && !el.paused) el.pause();
  });
}

export function AudioPreview({ src, label }: { src: string; label: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const freqRef = useRef<Uint8Array | null>(null);
  const peaksRef = useRef<number[]>(Array.from({ length: DEFAULT_BAR_COUNT }, () => 0));
  const playingRef = useRef(false);
  const [playableSrc, setPlayableSrc] = useState(src);

  useEffect(() => {
    let revoke = () => {};
    let cancelled = false;
    setPlayableSrc(src);
    analyserRef.current = null;
    void toSameOriginSrc(src)
      .then((resolved) => {
        if (cancelled) {
          resolved.revoke();
          return;
        }
        revoke = resolved.revoke;
        setPlayableSrc(resolved.url);
      })
      .catch(() => {
        /* keep the original src; spectrum may stay idle */
      });
    return () => {
      cancelled = true;
      revoke();
    };
  }, [src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onPlay = () => {
      playingRef.current = true;
      pauseOtherPreviews(audio);
      void resumeAudioContext().then(() => {
        const analyser = attachMediaAnalyser(audio);
        analyserRef.current = analyser;
        if (analyser && freqRef.current?.length !== analyser.frequencyBinCount) {
          freqRef.current = new Uint8Array(new ArrayBuffer(analyser.frequencyBinCount));
        }
      });
    };
    const onStop = () => {
      playingRef.current = false;
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onStop);
    audio.addEventListener("ended", onStop);
    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onStop);
      audio.removeEventListener("ended", onStop);
    };
  }, [playableSrc]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;

    const tick = (now: number) => {
      raf = requestAnimationFrame(tick);
      const dpr = window.devicePixelRatio || 1;
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      const pixelW = Math.max(1, Math.round(width * dpr));
      const pixelH = Math.max(1, Math.round(height * dpr));
      if (canvas.width !== pixelW || canvas.height !== pixelH) {
        canvas.width = pixelW;
        canvas.height = pixelH;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const analyser = analyserRef.current;
      const freq = freqRef.current;
      let bars: number[];
      if (playingRef.current && analyser && freq) {
        analyser.getByteFrequencyData(freq);
        bars = mapFrequencyBars(freq, DEFAULT_BAR_COUNT);
      } else if (reducedMotion) {
        bars = Array.from({ length: DEFAULT_BAR_COUNT }, () => 0.04);
      } else {
        bars = idleBars(now, DEFAULT_BAR_COUNT);
      }
      peaksRef.current = updatePeaks(bars, peaksRef.current, playingRef.current ? 0.016 : 0.04);
      drawSpectrum(ctx, width, height, bars, peaksRef.current);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) void audio.play();
    else audio.pause();
  };

  return (
    <div className="audio-preview">
      <button type="button" className="spectrum-stage" onClick={togglePlayback} aria-label={t.lightShow.spectrumToggle}>
        <canvas ref={canvasRef} className="spectrum-canvas" aria-hidden="true" />
        <span className="spectrum-caption">{t.lightShow.spectrumLabel}</span>
      </button>
      <div className="audio-row">
        <span>{label}</span>
        <audio ref={audioRef} controls preload="metadata" src={playableSrc} />
      </div>
    </div>
  );
}
