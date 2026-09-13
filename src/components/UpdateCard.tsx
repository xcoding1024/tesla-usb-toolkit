import { interpolate, t } from "../i18n";
import { githubUpdatesEnabled } from "../lib/channel";
import { formatBytes } from "../lib/format";
import { isTauri } from "../lib/tauri";
import { GITHUB_RELEASES_PAGE } from "../lib/update";
import { updateProgressLabel, updateProgressRatio, useAppUpdate } from "../updateState";

export function UpdateCard() {
  const {
    phase,
    info,
    error,
    progress,
    currentVersion,
    checkForUpdate,
    downloadAndInstall,
    openInstaller,
    openGithub,
  } = useAppUpdate();

  if (!githubUpdatesEnabled()) {
    return (
      <section className="glass-card">
        <h2>{t.settings.update}</h2>
        <p>{interpolate(t.settings.currentVersion, { version: currentVersion })}</p>
        <p>{t.settings.storeUpdates}</p>
        <p className="muted">{t.settings.storeUpdatesHint}</p>
      </section>
    );
  }

  const checking = phase === "checking";
  const downloading = phase === "downloading";
  const available = Boolean(info?.updateAvailable);
  const assetLabel = info?.asset
    ? info.asset.size > 0
      ? interpolate(t.settings.updateAsset, {
          name: info.asset.name,
          size: formatBytes(info.asset.size),
        })
      : info.asset.name
    : null;

  return (
    <section className="glass-card">
      <h2>{t.settings.update}</h2>
      <p>{interpolate(t.settings.currentVersion, { version: currentVersion })}</p>
      {info && !available && !info.developmentBuild ? (
        <p className="muted">{interpolate(t.settings.upToDate, { version: info.latestVersion })}</p>
      ) : null}
      {info?.developmentBuild ? (
        <p className="muted">
          {interpolate(t.settings.updateDevBuild, {
            current: info.currentVersion,
            latest: info.latestVersion,
          })}
        </p>
      ) : null}
      {available ? (
        <div className="update-available">
          <p>{interpolate(t.settings.updateAvailable, { version: info?.latestVersion ?? "" })}</p>
          {assetLabel ? <p className="muted">{assetLabel}</p> : <p className="muted">{t.settings.updateNoAsset}</p>}
          {info?.releaseNotes ? (
            <>
              <h3>{t.settings.updateNotes}</h3>
              <pre className="update-notes">{info.releaseNotes}</pre>
            </>
          ) : null}
        </div>
      ) : null}
      {downloading ? (
        <div className="update-progress-wrap" aria-live="polite">
          <div className="update-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100}>
            <i style={{ width: `${Math.round(updateProgressRatio(progress) * 100)}%` }} />
          </div>
          <p className="muted">{updateProgressLabel(progress)}</p>
        </div>
      ) : null}
      {phase === "downloaded" ? <p className="ok-notes">{t.settings.downloadComplete}</p> : null}
      {error ? <p className="banner error">{error}</p> : null}
      {!isTauri() ? <p className="muted">{t.settings.updateBrowserHint}</p> : null}
      <div className="actions update-actions">
        <button
          type="button"
          className="ghost"
          disabled={checking || downloading}
          onClick={() => void checkForUpdate(true)}
        >
          {checking ? t.settings.checkingUpdate : t.settings.checkUpdate}
        </button>
        {available ? (
          <button
            type="button"
            className="primary"
            disabled={downloading || (!info?.asset && isTauri())}
            onClick={() => void downloadAndInstall()}
          >
            {downloading ? t.settings.downloadingUpdateShort : t.settings.downloadUpdate}
          </button>
        ) : null}
        {phase === "downloaded" ? (
          <button type="button" className="primary" onClick={() => void openInstaller()}>
            {t.settings.openInstaller}
          </button>
        ) : null}
        {isTauri() ? (
          <button type="button" className="ghost" onClick={() => void openGithub()}>
            {t.settings.openReleasePage}
          </button>
        ) : (
          <a
            className="ghost"
            href={info?.releaseUrl || GITHUB_RELEASES_PAGE}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.settings.openReleasePage}
          </a>
        )}
      </div>
    </section>
  );
}
