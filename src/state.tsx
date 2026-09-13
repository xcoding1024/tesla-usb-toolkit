import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getLocale, interpolate, setLocale as persistLocale, subscribeLocale, t, type Locale } from "./i18n";
import { DEMO_VOLUMES, displayVolumeName, type DemoVolume } from "./lib/demo";
import { isVisibleUsbVolume, validateEjectRequest } from "./lib/format";
import { evaluate } from "./lib/rules";
import {
  ejectVolume as invokeEject,
  formatCapabilities as fetchFormatCapabilities,
  formatVolume as invokeFormat,
  isTauri,
  listVolumes,
  pickFolder,
  scanPath,
} from "./lib/tauri";
import type { DetectionReport, EjectResult, FormatCapabilities, FormatResult, Volume } from "./lib/types";

export type PageId = "overview" | "format" | "dashcam" | "lightShow" | "wraps" | "lockChime" | "settings";

interface AppStateValue {
  page: PageId;
  setPage: (page: PageId) => void;
  tauri: boolean;
  volumes: Volume[];
  selectedId: string | null;
  customPath: string;
  selectedVolume: Volume | null;
  targetPath: string;
  folderOnly: boolean;
  report: DetectionReport | null;
  busy: boolean;
  error: string | null;
  statusNote: string | null;
  formatOpen: boolean;
  setFormatOpen: (open: boolean) => void;
  capabilities: FormatCapabilities | null;
  selectVolume: (id: string) => void;
  setCustomPath: (path: string) => void;
  refreshVolumes: () => Promise<void>;
  runDetect: () => Promise<void>;
  chooseFolder: () => Promise<void>;
  runFormat: (filesystem: string, label: string, confirmed: boolean) => Promise<FormatResult | null>;
  runEject: () => Promise<EjectResult | null>;
  demoById: Map<string, DemoVolume>;
  locale: Locale;
  setLocale: (locale: Locale) => void;
}

const AppStateContext = createContext<AppStateValue | null>(null);

export function AppStateProvider({ children }: { children: ReactNode }) {
  const tauri = isTauri();
  const [page, setPage] = useState<PageId>("overview");
  const [volumes, setVolumes] = useState<Volume[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [customPath, setCustomPath] = useState("");
  const [report, setReport] = useState<DetectionReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusNote, setStatusNote] = useState<string | null>(null);
  const [formatOpen, setFormatOpen] = useState(false);
  const [capabilities, setCapabilities] = useState<FormatCapabilities | null>(null);
  const [scanNonce, setScanNonce] = useState(0);
  const [locale, setLocaleState] = useState<Locale>(getLocale);
  const scanGen = useRef(0);

  useEffect(() => subscribeLocale(() => setLocaleState(getLocale())), []);

  const setLocale = useCallback((next: Locale) => {
    persistLocale(next);
    setLocaleState(next);
  }, []);

  const demoById = useMemo(() => {
    const map = new Map<string, DemoVolume>();
    for (const volume of DEMO_VOLUMES) {
      map.set(volume.id, volume);
    }
    return map;
  }, []);

  const refreshVolumes = useCallback(async () => {
    setError(null);
    if (!tauri) {
      setVolumes(DEMO_VOLUMES.filter(isVisibleUsbVolume));
      setSelectedId((current) => current ?? DEMO_VOLUMES[0]?.id ?? null);
      setStatusNote(t.status.browserPreview);
      setCapabilities({
        platform: "web",
        canFormat: false,
        requiresPrivilege: true,
        supportedFilesystems: ["exfat", "fat32", "msdos"],
        message: t.format.demoBlocked,
      });
      setScanNonce((n) => n + 1);
      return;
    }
    try {
      const found = (await listVolumes()).filter(isVisibleUsbVolume);
      setVolumes(found);
      if (found.length === 0) {
        setStatusNote(t.status.noVolumes);
        setSelectedId(null);
      } else {
        setStatusNote(
          interpolate(t.status.listed, {
            count: found.length,
            platform: found[0]?.platform ?? "unknown",
          }),
        );
        setSelectedId((current) => {
          if (current && found.some((v) => v.id === current)) return current;
          return found[0].id;
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setVolumes(DEMO_VOLUMES.filter(isVisibleUsbVolume));
      setSelectedId(DEMO_VOLUMES.filter(isVisibleUsbVolume)[0]?.id ?? null);
      setStatusNote(t.status.listFailed);
    }
    try {
      setCapabilities(await fetchFormatCapabilities());
    } catch {
      setCapabilities(null);
    }
    setScanNonce((n) => n + 1);
  }, [locale, tauri]);

  useEffect(() => {
    void refreshVolumes();
  }, [refreshVolumes]);

  const selectedVolume = volumes.find((v) => v.id === selectedId) ?? null;
  const targetPath = customPath.trim() || selectedVolume?.path || "";
  const folderOnly = Boolean(customPath.trim());

  const selectVolume = useCallback((id: string) => {
    setSelectedId(id);
    setCustomPath("");
    setError(null);
  }, []);

  const scanTarget = useCallback(
    async (path: string, volumeId: string | null, folderPath: string) => {
      const gen = ++scanGen.current;
      setError(null);
      const demo = volumeId && !folderPath.trim() ? demoById.get(volumeId) : undefined;
      if (demo) {
        setReport(evaluate(demo.snapshot));
        return;
      }
      if (!path) {
        setReport(null);
        return;
      }
      if (!tauri) {
        setError(t.status.browserNoScan);
        setReport(null);
        return;
      }
      setBusy(true);
      try {
        const snapshot = await scanPath(path);
        if (gen !== scanGen.current) return;
        setReport(evaluate(snapshot));
      } catch (err) {
        if (gen !== scanGen.current) return;
        setError(err instanceof Error ? err.message : String(err));
        setReport(null);
      } finally {
        if (gen === scanGen.current) setBusy(false);
      }
    },
    [demoById, locale, tauri],
  );

  useEffect(() => {
    void scanTarget(targetPath, selectedId, customPath);
  }, [customPath, scanNonce, scanTarget, selectedId, targetPath]);

  const runDetect = useCallback(async () => {
    setScanNonce((n) => n + 1);
  }, []);

  const chooseFolder = useCallback(async () => {
    if (!tauri) {
      setError(t.status.folderNeedsTauri);
      return;
    }
    try {
      const path = await pickFolder();
      if (path) {
        setCustomPath(path);
        setSelectedId(null);
        setError(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }, [tauri]);

  const runFormat = useCallback(
    async (filesystem: string, label: string, confirmed: boolean): Promise<FormatResult | null> => {
      if (!tauri) {
        throw new Error(t.format.demoBlocked);
      }
      if (!selectedVolume || folderOnly) {
        throw new Error(t.format.needVolume);
      }
      setBusy(true);
      setError(null);
      try {
        const result = await invokeFormat({
          path: selectedVolume.path,
          filesystem,
          label,
          confirmed,
        });
        if (result.ok) {
          setStatusNote(t.status.formattedRefresh);
          setFormatOpen(false);
          await refreshVolumes();
        }
        return result;
      } finally {
        setBusy(false);
      }
    },
    [folderOnly, refreshVolumes, selectedVolume, tauri],
  );

  const runEject = useCallback(async (): Promise<EjectResult | null> => {
    const check = validateEjectRequest({
      path: selectedVolume?.path ?? "",
      formatEligible: selectedVolume?.formatEligible,
      isSystem: selectedVolume?.isSystem,
      folderOnly,
    });
    if (!check.ok) {
      setError(check.error);
      return null;
    }
    if (!tauri) {
      setError(t.eject.demoBlocked);
      return null;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await invokeEject(check.path);
      if (result.ok) {
        setStatusNote(
          result.message ||
            interpolate(t.status.ejected, {
              name: selectedVolume ? displayVolumeName(selectedVolume) : "",
            }),
        );
        await refreshVolumes();
      } else {
        setError(result.message);
      }
      return result;
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      return null;
    } finally {
      setBusy(false);
    }
  }, [folderOnly, refreshVolumes, selectedVolume, tauri]);

  const value: AppStateValue = {
    page,
    setPage,
    tauri,
    volumes,
    selectedId,
    customPath,
    selectedVolume,
    targetPath,
    folderOnly,
    report,
    busy,
    error,
    statusNote,
    formatOpen,
    setFormatOpen,
    capabilities,
    selectVolume,
    setCustomPath,
    refreshVolumes,
    runDetect,
    chooseFolder,
    runFormat,
    runEject,
    demoById,
    locale,
    setLocale,
  };

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>;
}

export function useAppState(): AppStateValue {
  const ctx = useContext(AppStateContext);
  if (!ctx) {
    throw new Error("useAppState must be used within AppStateProvider");
  }
  return ctx;
}
