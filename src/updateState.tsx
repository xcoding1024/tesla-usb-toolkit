import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { interpolate, t } from "./i18n";
import { githubUpdatesEnabled } from "./lib/channel";
import { formatBytes } from "./lib/format";
import { isTauri } from "./lib/tauri";
import {
  checkForAppUpdate,
  downloadUpdateAsset,
  listenDownloadProgress,
  openReleasePage,
  openUpdateInstaller,
  type DownloadProgress,
} from "./lib/updateClient";
import { bundledAppVersion, type UpdateInfo } from "./lib/update";

export type UpdatePhase = "idle" | "checking" | "ready" | "downloading" | "downloaded";

interface UpdateStateValue {
  phase: UpdatePhase;
  info: UpdateInfo | null;
  error: string | null;
  progress: DownloadProgress | null;
  installerPath: string | null;
  currentVersion: string;
  checkForUpdate: (manual?: boolean) => Promise<void>;
  downloadAndInstall: () => Promise<void>;
  openInstaller: () => Promise<void>;
  openGithub: () => Promise<void>;
}

const UpdateContext = createContext<UpdateStateValue | null>(null);

function mapUpdateError(err: unknown, fallback: string): string {
  const raw = err instanceof Error ? err.message : String(err);
  if (raw.includes("http_403") || raw.toLowerCase().includes("rate limit")) {
    return t.settings.updateRateLimited;
  }
  if (raw.includes("store_channel")) return t.settings.storeUpdates;
  if (raw.includes("desktop_only")) return t.settings.updateBrowserHint;
  if (raw.includes("invalid_url") || raw.includes("invalid_filename") || raw.includes("http_")) {
    return fallback;
  }
  return fallback;
}

export function UpdateProvider({ children }: { children: ReactNode }) {
  const [phase, setPhase] = useState<UpdatePhase>("idle");
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [installerPath, setInstallerPath] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unlisten: (() => void) | undefined;
    void listenDownloadProgress((next) => {
      if (!cancelled) setProgress(next);
    }).then((fn) => {
      if (cancelled) fn();
      else unlisten = fn;
    });
    return () => {
      cancelled = true;
      unlisten?.();
    };
  }, []);

  const checkForUpdate = useCallback(async (manual = true) => {
    setError(null);
    setPhase("checking");
    try {
      const next = await checkForAppUpdate();
      setInfo(next);
      setPhase("ready");
    } catch (err) {
      setPhase("idle");
      if (manual) {
        setError(mapUpdateError(err, t.settings.updateCheckFailed));
      }
    }
  }, []);

  useEffect(() => {
    if (!isTauri() || !githubUpdatesEnabled()) return;
    const timer = window.setTimeout(() => {
      void checkForUpdate(false);
    }, 1200);
    return () => window.clearTimeout(timer);
  }, [checkForUpdate]);

  const downloadAndInstall = useCallback(async () => {
    if (!info?.asset) {
      setError(t.settings.updateNoAsset);
      return;
    }
    if (!isTauri()) {
      await openReleasePage(info.releaseUrl);
      return;
    }
    setError(null);
    setPhase("downloading");
    setProgress({ downloaded: 0, total: info.asset.size || null });
    try {
      const path = await downloadUpdateAsset(info.asset);
      setInstallerPath(path);
      setPhase("downloaded");
      await openUpdateInstaller(path);
    } catch (err) {
      setPhase("ready");
      setError(mapUpdateError(err, t.settings.updateDownloadFailed));
    }
  }, [info]);

  const openInstaller = useCallback(async () => {
    if (!installerPath) return;
    try {
      await openUpdateInstaller(installerPath);
    } catch (err) {
      setError(mapUpdateError(err, t.settings.updateOpenFailed));
    }
  }, [installerPath]);

  const openGithub = useCallback(async () => {
    try {
      await openReleasePage(info?.releaseUrl);
    } catch (err) {
      setError(mapUpdateError(err, t.settings.updateOpenFailed));
    }
  }, [info]);

  const value = useMemo<UpdateStateValue>(
    () => ({
      phase,
      info,
      error,
      progress,
      installerPath,
      currentVersion: info?.currentVersion ?? bundledAppVersion(),
      checkForUpdate,
      downloadAndInstall,
      openInstaller,
      openGithub,
    }),
    [checkForUpdate, downloadAndInstall, error, info, installerPath, openGithub, openInstaller, phase, progress],
  );

  return <UpdateContext.Provider value={value}>{children}</UpdateContext.Provider>;
}

export function useAppUpdate(): UpdateStateValue {
  const ctx = useContext(UpdateContext);
  if (!ctx) {
    throw new Error("useAppUpdate must be used within UpdateProvider");
  }
  return ctx;
}

export function updateProgressLabel(progress: DownloadProgress | null): string {
  if (!progress) return interpolate(t.settings.downloadingUpdate, { percent: 0 });
  if (progress.total && progress.total > 0) {
    const percent = Math.min(100, Math.round((progress.downloaded / progress.total) * 100));
    return interpolate(t.settings.downloadingUpdate, { percent });
  }
  return interpolate(t.settings.downloadingUpdateBytes, {
    downloaded: formatBytes(progress.downloaded),
  });
}

export function updateProgressRatio(progress: DownloadProgress | null): number {
  if (!progress?.total) return 0;
  return Math.min(1, progress.downloaded / progress.total);
}
