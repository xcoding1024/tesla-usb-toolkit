import { t } from "../i18n";
import { displayVolumeName } from "../lib/demo";
import { capabilityCopy, formatFreeOfTotal } from "../lib/format";
import { kindLabel } from "../lib/rules";
import { useAppState } from "../state";

export function FormatPage() {
  const { selectedVolume, folderOnly, setFormatOpen, capabilities, busy, runEject } = useAppState();

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.nav.format}</h1>
      </header>

      {selectedVolume && !folderOnly ? (
        <section className="glass-card drive-detail">
          <h2>{displayVolumeName(selectedVolume)}</h2>
          <dl>
            <div>
              <dt>{t.drive.filesystem}</dt>
              <dd>{selectedVolume.filesystem ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.drive.kind}</dt>
              <dd>{kindLabel(selectedVolume.kind)}</dd>
            </div>
            <div>
              <dt>{t.drive.capacity}</dt>
              <dd>
                {formatFreeOfTotal(selectedVolume.totalBytes, selectedVolume.freeBytes)}
              </dd>
            </div>
            <div>
              <dt>{t.drive.path}</dt>
              <dd className="path">{selectedVolume.path}</dd>
            </div>
            <div>
              <dt>{t.drive.device}</dt>
              <dd>{selectedVolume.device ?? "—"}</dd>
            </div>
            <div>
              <dt>{t.drive.platform}</dt>
              <dd>{selectedVolume.platform}</dd>
            </div>
            <div>
              <dt>{t.format.title}</dt>
              <dd>
                {selectedVolume.isSystem
                  ? t.drive.systemDisk
                  : selectedVolume.formatEligible === false
                    ? t.drive.formatBlocked
                    : t.drive.formatEligible}
              </dd>
            </div>
          </dl>
          <div className="actions">
            <button
              type="button"
              className="ghost"
              disabled={busy || selectedVolume.isSystem || selectedVolume.formatEligible === false}
              onClick={() => void runEject()}
            >
              {t.actions.eject}
            </button>
            <button
              type="button"
              className="danger"
              disabled={busy || selectedVolume.isSystem || selectedVolume.formatEligible === false}
              onClick={() => setFormatOpen(true)}
            >
              {t.actions.format}
            </button>
          </div>
          {capabilities ? <p className="muted">{capabilityCopy(capabilities.platform)}</p> : null}
        </section>
      ) : (
        <p className="muted">{t.format.needVolume}</p>
      )}
    </div>
  );
}
