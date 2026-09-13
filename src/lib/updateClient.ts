import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { githubUpdatesEnabled, parseDistributionChannel } from "./channel";
import { isTauri } from "./tauri";
import {
  browserAppInfo,
  evaluateRelease,
  GITHUB_RELEASES_LATEST_API,
  GITHUB_RELEASES_PAGE,
  isAllowedDownloadUrl,
  parseGithubRelease,
  parseHostArch,
  parseHostPlatform,
  parseReleasesAtom,
  sanitizeInstallerFilename,
  type AppInfo,
  type GithubAsset,
  type UpdateInfo,
} from "./update";

export interface DownloadProgress {
  downloaded: number;
  total: number | null;
}

interface RustAppInfo {
  version: string;
  platform: string;
  arch: string;
  distributionChannel?: string;
  githubUpdates?: boolean;
}

const SUCCESS_CACHE_MS = 10 * 60 * 1000;
const ERROR_CACHE_MS = 45 * 1000;

let inflight: Promise<unknown> | null = null;
let cached: { at: number; value: unknown } | null = null;
let lastError: { at: number; error: Error } | null = null;

export async function loadAppInfo(): Promise<AppInfo> {
  if (!isTauri()) return browserAppInfo();
  const info = await invoke<RustAppInfo>("app_info");
  const distributionChannel = parseDistributionChannel(info.distributionChannel);
  return {
    version: info.version,
    platform: parseHostPlatform(info.platform),
    arch: parseHostArch(info.arch),
    distributionChannel,
    githubUpdates: info.githubUpdates ?? distributionChannel === "github",
  };
}

async function fetchFromGithubApi(): Promise<unknown> {
  if (isTauri()) {
    return invoke<unknown>("fetch_latest_github_release");
  }
  const response = await fetch(GITHUB_RELEASES_LATEST_API, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  });
  if (!response.ok) {
    throw new Error(`http_${response.status}`);
  }
  return response.json();
}

async function fetchFromGithubAtom(): Promise<unknown> {
  if (isTauri()) {
    return parseReleasesAtom(await invoke<string>("fetch_github_releases_atom"));
  }
  throw new Error("http_403");
}

export async function fetchLatestReleaseJson(): Promise<unknown> {
  if (cached && Date.now() - cached.at < SUCCESS_CACHE_MS) {
    return cached.value;
  }
  if (lastError && Date.now() - lastError.at < ERROR_CACHE_MS) {
    throw lastError.error;
  }
  if (inflight) return inflight;

  inflight = (async () => {
    try {
      const value = await fetchFromGithubApi();
      cached = { at: Date.now(), value };
      lastError = null;
      return value;
    } catch (err) {
      try {
        const value = await fetchFromGithubAtom();
        cached = { at: Date.now(), value };
        lastError = null;
        return value;
      } catch {
        const error = err instanceof Error ? err : new Error(String(err));
        lastError = { at: Date.now(), error };
        throw error;
      }
    }
  })().finally(() => {
    inflight = null;
  });

  return inflight;
}

export async function checkForAppUpdate(): Promise<UpdateInfo> {
  if (!githubUpdatesEnabled()) {
    throw new Error("store_channel");
  }
  const [app, raw] = await Promise.all([loadAppInfo(), fetchLatestReleaseJson()]);
  if (!app.githubUpdates) {
    throw new Error("store_channel");
  }
  return evaluateRelease({
    currentVersion: app.version,
    platform: app.platform,
    arch: app.arch,
    release: parseGithubRelease(raw),
  });
}

export async function downloadUpdateAsset(asset: GithubAsset): Promise<string> {
  if (!githubUpdatesEnabled()) {
    throw new Error("store_channel");
  }
  if (!isTauri()) {
    throw new Error("desktop_only");
  }
  const filename = sanitizeInstallerFilename(asset.name);
  if (!filename || !isAllowedDownloadUrl(asset.browser_download_url)) {
    throw new Error("invalid_url");
  }
  return invoke<string>("download_update_asset", {
    url: asset.browser_download_url,
    filename,
    expectedSize: asset.size,
  });
}

export async function openUpdateInstaller(path: string): Promise<void> {
  if (!isTauri()) {
    throw new Error("desktop_only");
  }
  await invoke("open_update_installer", { path });
}

export async function openReleasePage(url = GITHUB_RELEASES_PAGE): Promise<void> {
  if (isTauri()) {
    await invoke("open_external_url", { url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}

export async function listenDownloadProgress(
  onProgress: (progress: DownloadProgress) => void,
): Promise<UnlistenFn> {
  if (!isTauri()) {
    return () => undefined;
  }
  return listen<DownloadProgress>("update-download-progress", (event) => {
    onProgress(event.payload);
  });
}
