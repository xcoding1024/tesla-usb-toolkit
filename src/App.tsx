import { DriveSwitcher } from "./components/DriveSwitcher";
import { FormatDialog } from "./components/FormatDialog";
import { Sidebar } from "./components/Sidebar";
import { DashcamPage } from "./pages/DashcamPage";
import { FormatPage } from "./pages/FormatPage";
import { LightShowPage } from "./pages/LightShowPage";
import { LockChimePage } from "./pages/LockChimePage";
import { OverviewPage } from "./pages/OverviewPage";
import { SettingsPage } from "./pages/SettingsPage";
import { WrapsPage } from "./pages/WrapsPage";
import { resetScrollTop } from "./lib/scroll";
import { AppStateProvider, useAppState } from "./state";
import { UpdateProvider, useAppUpdate } from "./updateState";
import { applyDocumentLocale, interpolate, t } from "./i18n";
import { githubUpdatesEnabled } from "./lib/channel";
import { applyWindowTitle } from "./lib/tauri";
import { useEffect, useRef } from "react";
import "./App.css";

function Shell() {
  const { page, setPage, error, statusNote, refreshVolumes, runDetect, runEject, selectedVolume, folderOnly, busy, locale } =
    useAppState();
  const { info } = useAppUpdate();
  const pageScrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    resetScrollTop(pageScrollRef.current);
  }, [page]);

  useEffect(() => {
    applyDocumentLocale(locale);
    void applyWindowTitle(t.app.windowTitle);
  }, [locale]);

  return (
    <div className="app-shell">
      <Sidebar />
      <div className="main-column">
        <header className="topbar">
          <DriveSwitcher />
          <button type="button" className="ghost compact" onClick={() => void runDetect()} disabled={busy}>
            {busy ? t.actions.scanning : t.actions.rescan}
          </button>
          <button
            type="button"
            className="ghost compact"
            disabled={busy || !selectedVolume || folderOnly}
            onClick={() => void runEject()}
          >
            {t.actions.eject}
          </button>
          <button type="button" className="ghost compact" onClick={() => void refreshVolumes()}>
            {t.actions.refresh}
          </button>
        </header>
        {statusNote ? <p className="banner">{statusNote}</p> : null}
        {error ? <p className="banner error">{error}</p> : null}
        {githubUpdatesEnabled() && info?.updateAvailable && page !== "settings" ? (
          <p className="banner update">
            <span>{interpolate(t.settings.updateBanner, { version: info.latestVersion })}</span>
            <button type="button" className="linkish" onClick={() => setPage("settings")}>
              {t.settings.updateBannerAction}
            </button>
          </p>
        ) : null}
        <div className="page-scroll" ref={pageScrollRef}>
          {page === "overview" ? <OverviewPage /> : null}
          {page === "format" ? <FormatPage /> : null}
          {page === "dashcam" ? <DashcamPage /> : null}
          {page === "lightShow" ? <LightShowPage /> : null}
          {page === "wraps" ? <WrapsPage /> : null}
          {page === "lockChime" ? <LockChimePage /> : null}
          {page === "settings" ? <SettingsPage /> : null}
        </div>
      </div>
      <FormatDialog />
    </div>
  );
}

export default function App() {
  return (
    <AppStateProvider>
      <UpdateProvider>
        <Shell />
      </UpdateProvider>
    </AppStateProvider>
  );
}
