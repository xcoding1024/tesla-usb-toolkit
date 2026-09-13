import { bassEnergy } from "./spectrum";

function fillRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
  } else {
    ctx.moveTo(x + radius, y);
    ctx.arcTo(x + w, y, x + w, y + h, radius);
    ctx.arcTo(x + w, y + h, x, y + h, radius);
    ctx.arcTo(x, y + h, x, y, radius);
    ctx.arcTo(x, y, x + w, y, radius);
    ctx.closePath();
  }
  ctx.fill();
}

export function drawSpectrum(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  bars: readonly number[],
  peaks: readonly number[],
): void {
  ctx.clearRect(0, 0, width, height);

  const background = ctx.createLinearGradient(0, 0, 0, height);
  background.addColorStop(0, "#141628");
  background.addColorStop(0.55, "#0c0e18");
  background.addColorStop(1, "#160814");
  ctx.fillStyle = background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = "rgba(139, 92, 255, 0.12)";
  ctx.lineWidth = 1;
  for (let g = 1; g <= 3; g++) {
    const gy = 12 + ((height - 28) * g) / 4;
    ctx.beginPath();
    ctx.moveTo(10, gy);
    ctx.lineTo(width - 10, gy);
    ctx.stroke();
  }

  const bass = bassEnergy(bars);
  if (bass > 0.04) {
    const glow = ctx.createRadialGradient(width * 0.5, height, 8, width * 0.5, height, width * 0.7);
    glow.addColorStop(0, `rgba(225, 78, 201, ${0.12 + bass * 0.35})`);
    glow.addColorStop(1, "rgba(139, 92, 255, 0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, width, height);
  }

  const padX = 14;
  const padTop = 18;
  const stripH = 6;
  const stripGap = 10;
  const barAreaH = Math.max(8, height - padTop - stripH - stripGap - 8);
  const gap = bars.length > 0 ? Math.min(4, Math.max(2, (width - padX * 2) / bars.length / 5)) : 0;
  const barW = bars.length > 0 ? (width - padX * 2 - gap * (bars.length - 1)) / bars.length : 0;

  for (let i = 0; i < bars.length; i++) {
    const x = padX + i * (barW + gap);
    const level = Math.min(1, Math.max(0, (bars[i] ?? 0) * 1.15));
    const visual = 0.08 + level * 0.92;
    const h = Math.max(4, visual * barAreaH);
    const y = padTop + barAreaH - h;
    const grad = ctx.createLinearGradient(x, y + h, x, y);
    grad.addColorStop(0, "#6a3dff");
    grad.addColorStop(0.38, "#9b6cff");
    grad.addColorStop(0.72, "#f15bd6");
    grad.addColorStop(1, "#fff0fb");
    if (level > 0.2) {
      ctx.save();
      ctx.shadowColor = "rgba(225, 78, 201, 0.55)";
      ctx.shadowBlur = 10;
      ctx.fillStyle = grad;
      fillRoundRect(ctx, x, y, Math.max(1, barW), h, Math.min(4, barW / 2));
      ctx.restore();
    } else {
      ctx.fillStyle = grad;
      fillRoundRect(ctx, x, y, Math.max(1, barW), h, Math.min(4, barW / 2));
    }

    const peak = Math.min(1, 0.08 + Math.max(0, (peaks[i] ?? 0) * 1.15) * 0.92);
    if (peak > 0.1) {
      const py = padTop + barAreaH - peak * barAreaH;
      ctx.fillStyle = "rgba(255, 240, 252, 0.92)";
      fillRoundRect(ctx, x, py, Math.max(1, barW), 2, 1);
    }

    const stripY = height - 11;
    ctx.fillStyle = `rgba(225, 78, 201, ${0.18 + level * 0.82})`;
    fillRoundRect(ctx, x, stripY, Math.max(1, barW), stripH, 2);
  }
}
