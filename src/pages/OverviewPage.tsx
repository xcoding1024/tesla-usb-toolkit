import { IconFolder, IconSparkle, UsbHero } from "../components/icons";
import { ReportView } from "../components/ReportView";
import { VolumeCards } from "../components/VolumeCards";
import { interpolate, t } from "../i18n";
import { useAppState } from "../state";

export function OverviewPage() {
  const { volumes, busy, runDetect, chooseFolder, report, setPage } = useAppState();

  return (
    <div className="overview">
      <section className="hero">
        <UsbHero />
        <div className="hero-copy">
          <h1>{t.app.heroTitle}</h1>
          <p>{t.app.heroSubtitle}</p>
          <div className="hero-actions">
            <button type="button" className="primary pill" disabled={busy} onClick={() => void runDetect()}>
              <IconSparkle className="btn-icon" />
              {busy ? t.actions.scanning : t.actions.rescan}
            </button>
            <button type="button" className="ghost pill" onClick={() => void chooseFolder()}>
              <IconFolder className="btn-icon" />
              {t.actions.pickFolder}
            </button>
          </div>
        </div>
      </section>

      <section className="volumes-panel">
        <header className="volumes-head">
          <h2>{t.overview.volumesTitle}</h2>
          <span className="status-dot">
            <i />
            {interpolate(t.overview.volumesCount, { count: volumes.length })}
          </span>
        </header>
        <VolumeCards />
      </section>

      <section className="scan-summary">
        <header className="page-head">
          <h2>{t.overview.scanTitle}</h2>
        </header>
        {report ? (
          <ReportView report={report} />
        ) : (
          <p className="muted">{busy ? t.content.scanning : t.overview.scanWaiting}</p>
        )}
        <p className="muted">
          <button type="button" className="linkish" onClick={() => setPage("settings")}>
            {t.overview.rulesHint}
          </button>
        </p>
      </section>
    </div>
  );
}
