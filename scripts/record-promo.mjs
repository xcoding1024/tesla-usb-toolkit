/**
 * Record the README promo GIF from the browser demo UI.
 *
 *   npm run promo
 *   node scripts/record-promo.mjs
 *
 * Steps: start Vite if needed → Playwright tour → ffmpeg GIF.
 * Requires ffmpeg. First run installs Playwright into scripts/.promo-tools (gitignored).
 *
 * Env:
 *   PROMO_SPEED  encode speed, e.g. 1.25 makes the GIF 25% faster (default 1)
 */
import { spawn, spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { mkdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PLAYWRIGHT_PKG = "playwright@1.55.1";
const APP_URL = "http://localhost:1420";
const VIEW_WIDTH = 1280;
const CHROME_HEIGHT = 36;
const APP_HEIGHT = 820;
const VIEW_HEIGHT = APP_HEIGHT + CHROME_HEIGHT;
const GIF_WIDTH = 960;
const GIF_FPS = 14;
const MAX_GIF_BYTES = 8 * 1024 * 1024;
const ENCODE_SPEED = Math.max(1, Number(process.env.PROMO_SPEED || 1.15));
const TRIM_START_SEC = 0.45;

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const toolsDir = join(root, "scripts", ".promo-tools");
const outGif = join(root, "docs", "promo", "tour.gif");

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadPlaywright() {
  try {
    return await import("playwright");
  } catch {
    await mkdir(toolsDir, { recursive: true });
    const install = spawnSync(
      "npm",
      ["install", "--prefix", toolsDir, "--no-package-lock", "--no-fund", "--no-audit", PLAYWRIGHT_PKG],
      {
        stdio: "inherit",
        cwd: root,
        shell: process.platform === "win32",
      },
    );
    if (install.status !== 0) {
      throw new Error("Failed to install playwright into scripts/.promo-tools");
    }
    const entry = join(toolsDir, "node_modules", "playwright", "index.mjs");
    const mod = await import(pathToFileURL(entry).href);
    if (mod?.chromium) return mod;
    if (mod?.default?.chromium) return mod.default;
    const require = createRequire(join(toolsDir, "node_modules", "playwright", "package.json"));
    return require("playwright");
  }
}

function ffmpegBin() {
  const candidates = ["ffmpeg", "/opt/homebrew/bin/ffmpeg", "/usr/local/bin/ffmpeg"];
  for (const bin of candidates) {
    const check = spawnSync(bin, ["-version"], { encoding: "utf8" });
    if (check.status === 0) return bin;
  }
  throw new Error("ffmpeg is required on PATH to encode docs/promo/tour.gif");
}

async function appIsUp() {
  try {
    const response = await fetch(APP_URL, { signal: AbortSignal.timeout(1500) });
    return response.ok;
  } catch {
    return false;
  }
}

async function waitForApp(timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    if (await appIsUp()) return;
    await sleep(400);
  }
  throw new Error(`Timed out waiting for ${APP_URL}`);
}

async function ensureDevServer() {
  if (await appIsUp()) {
    return () => {};
  }
  const child = spawn("npm", ["run", "dev"], {
    cwd: root,
    stdio: "inherit",
    shell: process.platform === "win32",
  });
  await waitForApp();
  return () => {
    child.kill("SIGTERM");
  };
}

async function dressPage(page) {
  await page.addStyleTag({
    content: `
      .banner { display: none !important; }
      .promo-chrome {
        height: ${CHROME_HEIGHT}px;
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 14px;
        background: #12141c;
        border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        font: 12px/1 Inter, "Noto Sans SC", system-ui, sans-serif;
        color: #c5d0da;
        flex-shrink: 0;
        letter-spacing: 0.01em;
      }
      .promo-dots { display: flex; gap: 6px; }
      .promo-dots i {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        display: block;
      }
      .promo-dots i:nth-child(1) { background: #ff5f57; }
      .promo-dots i:nth-child(2) { background: #febc2e; }
      .promo-dots i:nth-child(3) { background: #28c840; }
      html, body { height: 100%; overflow: hidden; }
      body.promo-recording { display: flex; flex-direction: column; }
      #root { flex: 1; height: auto !important; min-height: 0 !important; }
      .app-shell { height: 100% !important; min-height: 0 !important; }
    `,
  });
  await page.evaluate(() => {
    document.body.classList.add("promo-recording");
    if (!document.querySelector(".promo-chrome")) {
      const bar = document.createElement("div");
      bar.className = "promo-chrome";
      bar.innerHTML =
        '<span class="promo-dots"><i></i><i></i><i></i></span><span>Tesla USB Toolkit</span>';
      document.body.prepend(bar);
    }
    const hideDemoCopy = () => {
      for (const el of document.querySelectorAll("p.muted")) {
        const text = el.textContent ?? "";
        if (
          text.includes("browser preview") ||
          text.includes("does not format") ||
          text.includes("does not eject") ||
          text.includes("npm run tauri")
        ) {
          el.style.display = "none";
        }
      }
    };
    hideDemoCopy();
    if (!document.body.dataset.promoObserver) {
      document.body.dataset.promoObserver = "1";
      new MutationObserver(hideDemoCopy).observe(document.body, { childList: true, subtree: true });
    }
  });
}

async function selectVolume(page, volumeId) {
  const switcher = page.locator('select[aria-label="Switch scan/format target"]');
  await switcher.hover();
  await sleep(80);
  await switcher.selectOption(volumeId);
  await page.waitForFunction(
    (id) => document.querySelector('select[aria-label="Switch scan/format target"]')?.value === id,
    volumeId,
  );
}

async function goNav(page, label) {
  const button = page.getByRole("button", { name: label, exact: true });
  await button.scrollIntoViewIfNeeded();
  await button.hover();
  await sleep(70);
  await button.click();
}

async function reveal(page, locator) {
  await locator.scrollIntoViewIfNeeded();
}

async function runTour(page) {
  await page.waitForSelector(".app-shell");
  await page.getByRole("heading", { name: "Identify Tesla USB contents" }).waitFor();
  await page.getByRole("heading", { name: "Detection report" }).waitFor();
  await sleep(700);
  await reveal(page, page.getByRole("heading", { name: "Connected volumes" }));
  await sleep(350);
  await reveal(page, page.getByRole("heading", { name: "Detection report" }));
  await sleep(700);

  await selectVolume(page, "demo:conflict");
  const mixedConflict = page.getByText("This Light Show drive has possible map/firmware update files");
  await mixedConflict.waitFor();
  await reveal(page, mixedConflict);
  await sleep(900);
  await selectVolume(page, "demo:full");
  await page.getByRole("heading", { name: "Detection report" }).waitFor();
  await sleep(400);

  await goNav(page, "Dashcam");
  await page.getByRole("heading", { name: "Dashcam / Sentry" }).waitFor();
  const play = page.locator(".file-list button", { hasText: "Play" }).first();
  await play.scrollIntoViewIfNeeded();
  await play.hover();
  await sleep(80);
  await play.click();
  await page.locator("dialog.preview-dialog video").waitFor({ state: "visible" });
  await sleep(1100);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await sleep(180);

  await selectVolume(page, "demo:lightshow");
  await goNav(page, "Light Show");
  await page.locator(".show-card").first().waitFor();
  await page.locator(".fseq-meta").first().waitFor();
  await page.locator(".show-card").first().scrollIntoViewIfNeeded();
  await sleep(1200);

  await selectVolume(page, "demo:full");
  await goNav(page, "Wraps");
  const sakura = page.locator(".wrap-tile").filter({ hasText: "Sakura.png" });
  await sakura.waitFor();
  await page.locator(".wrap-grid").waitFor();
  await sleep(700);
  await sakura.scrollIntoViewIfNeeded();
  await sakura.hover();
  await sleep(80);
  await sakura.click();
  await page.locator("dialog.preview-dialog img.preview-image").waitFor({ state: "visible" });
  await sleep(1300);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await sleep(400);

  await goNav(page, "Lock Chime");
  await page.getByRole("heading", { name: /Lock chime/i }).waitFor();
  await sleep(900);

  await goNav(page, "Format");
  await page.getByRole("heading", { name: "Format", exact: true }).waitFor();
  const formatButton = page.getByRole("button", { name: "Format this drive" });
  await formatButton.hover();
  await sleep(80);
  await formatButton.click();
  await page.locator("dialog.format-dialog").waitFor({ state: "visible" });
  const confirm = page.locator("dialog.format-dialog .confirm-row input[type='checkbox']");
  await confirm.hover();
  await sleep(80);
  await confirm.check();
  await sleep(1100);
  await page.locator("dialog.format-dialog").getByRole("button", { name: "Cancel", exact: true }).click();
  await sleep(180);

  await goNav(page, "Overview");
  await page.getByRole("heading", { name: "Identify Tesla USB contents" }).waitFor();
  await sleep(600);
}

function encodeGif(inputVideo, outputGif, { width, fps, maxColors }) {
  const speed = ENCODE_SPEED === 1 ? "" : `setpts=${(1 / ENCODE_SPEED).toFixed(3)}*PTS,`;
  const vf = `${speed}fps=${fps},scale=${width}:-1:flags=lanczos,split[s0][s1];[s0]palettegen=max_colors=${maxColors}:stats_mode=diff[p];[s1][p]paletteuse=dither=bayer:bayer_scale=5`;
  const result = spawnSync(
    ffmpegBin(),
    ["-y", "-ss", String(TRIM_START_SEC), "-i", inputVideo, "-vf", vf, "-loop", "0", outputGif],
    { cwd: root, encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(result.stderr || "ffmpeg failed to encode the promo GIF");
  }
}

async function shrinkGif(inputVideo, outputGif) {
  const attempts = [
    { width: GIF_WIDTH, fps: GIF_FPS, maxColors: 160 },
    { width: GIF_WIDTH, fps: 12, maxColors: 128 },
    { width: 800, fps: 12, maxColors: 96 },
  ];
  for (const attempt of attempts) {
    encodeGif(inputVideo, outputGif, attempt);
    const { size } = await stat(outputGif);
    console.log(`Encoded ${attempt.width}px @ ${attempt.fps}fps (${attempt.maxColors} colors): ${(size / 1024 / 1024).toFixed(2)} MB`);
    if (size <= MAX_GIF_BYTES) return size;
  }
  const { size } = await stat(outputGif);
  console.warn(`GIF is still ${(size / 1024 / 1024).toFixed(2)} MB (target < 8 MB)`);
  return size;
}

async function main() {
  ffmpegBin();
  const playwright = await loadPlaywright();
  const playwrightCli = join(toolsDir, "node_modules", ".bin", "playwright");
  spawnSync(playwrightCli, ["install", "chromium"], {
    stdio: "inherit",
    cwd: root,
    shell: process.platform === "win32",
  });

  const stopServer = await ensureDevServer();
  const workDir = join(tmpdir(), "tesla-usb-toolkit-promo");
  await rm(workDir, { recursive: true, force: true });
  await mkdir(workDir, { recursive: true });
  await mkdir(join(root, "docs", "promo"), { recursive: true });

  const browser = await playwright.chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
    deviceScaleFactor: 1,
    recordVideo: {
      dir: workDir,
      size: { width: VIEW_WIDTH, height: VIEW_HEIGHT },
    },
    locale: "en-US",
  });
  await context.addInitScript(() => {
    localStorage.setItem("tesla-toolkit.locale", "en");
    const style = document.createElement("style");
    style.dataset.promoBanner = "1";
    style.textContent = "html, body { background: #07080e !important; } .banner { display: none !important; }";
    document.documentElement.style.background = "#07080e";
    document.documentElement.appendChild(style);
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  try {
    await page.goto(APP_URL, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".app-shell");
    await dressPage(page);
    await sleep(250);
    await runTour(page);
  } finally {
    await context.close();
    await browser.close();
    stopServer();
  }

  const { readdir } = await import("node:fs/promises");
  const recorded = (await readdir(workDir)).find((name) => name.endsWith(".webm"));
  if (!recorded) {
    throw new Error("Playwright did not write a recording");
  }
  const videoPath = join(workDir, recorded);
  const size = await shrinkGif(videoPath, outGif);
  await rm(workDir, { recursive: true, force: true });
  console.log(`Wrote ${outGif} (${(size / 1024 / 1024).toFixed(2)} MB)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
