import { EmptyState } from "../components/EmptyState";
import { interpolate, t } from "../i18n";
import { formatBytes } from "../lib/format";
import { toMediaSrc } from "../lib/media";
import type { ListedMediaFile } from "../lib/types";
import { useAppState } from "../state";

function AudioItem({ file, label }: { file: ListedMediaFile; label: string }) {
  const { tauri } = useAppState();
  const src = toMediaSrc(file.path, tauri);
  return (
    <li>
      <div>
        <strong>{file.name}</strong>
        <span className="muted">{formatBytes(file.bytes)}</span>
      </div>
      {src ? (
        <div className="audio-row">
          <span>{label}</span>
          <audio controls preload="metadata" src={src} />
        </div>
      ) : (
        <p className="muted">{t.preview.noMedia}</p>
      )}
    </li>
  );
}

export function LockChimePage() {
  const { report, busy, targetPath } = useAppState();
  const boombox = report?.content.boombox;
  const hasContent = Boolean(boombox);

  if (!targetPath && !report) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.lockChime.title}</h1>
        </header>
        <EmptyState title={t.content.noTarget} body={t.overview.scanWaiting} />
      </div>
    );
  }

  if (!hasContent && !busy) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.lockChime.title}</h1>
        </header>
        <EmptyState title={t.lockChime.emptyTitle} body={t.lockChime.emptyBody} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.lockChime.title}</h1>
      </header>
      {busy && !boombox ? <p className="muted">{t.content.scanning}</p> : null}
      {boombox ? (
        <>
          <section className="glass-card drive-detail">
            <dl>
              <div>
                <dt>{t.lockChime.lockFile}</dt>
                <dd>{boombox.hasLockChime ? t.lockChime.found : t.lockChime.missing}</dd>
              </div>
              <div>
                <dt>{t.lockChime.boombox}</dt>
                <dd>
                  {boombox.files.length > 0
                    ? interpolate(t.lockChime.boomboxCount, { count: boombox.files.length })
                    : t.lockChime.boomboxEmpty}
                </dd>
              </div>
            </dl>
            {!boombox.hasLockChime ? <p className="muted">{t.lockChime.addLock}</p> : null}
            {boombox.files.length === 0 ? <p className="muted">{t.lockChime.addBoombox}</p> : null}
            {boombox.files.length > 5 ? <p className="banner">{t.lockChime.boomboxLimit}</p> : null}
          </section>
          {boombox.lockChimeFile ? (
            <section className="glass-card">
              <h2>{t.lockChime.lockFile}</h2>
              <ul className="file-list">
                <AudioItem file={boombox.lockChimeFile} label={t.lockChime.listenLock} />
              </ul>
            </section>
          ) : null}
          {boombox.listing.length > 0 ? (
            <section className="glass-card">
              <h2>{t.lockChime.boombox}</h2>
              <ul className="file-list">
                {boombox.listing.map((file) => (
                  <AudioItem key={file.name} file={file} label={t.lockChime.listenBoombox} />
                ))}
              </ul>
            </section>
          ) : boombox.files.length > 0 ? (
            <section className="glass-card">
              <ul className="file-list">
                {boombox.files.map((file) => (
                  <li key={file}>
                    <strong>{file}</strong>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
