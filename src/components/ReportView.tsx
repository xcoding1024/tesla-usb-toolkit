import { interpolate, t } from "../i18n";
import type { DetectionReport } from "../lib/types";

function camStatusLabel(status: "ready" | "inUse" | "emptyShell"): string {
  if (status === "inUse") return t.detect.camInUse;
  if (status === "ready") return t.detect.camReady;
  return t.detect.camEmpty;
}

function confidenceLabel(level: "high" | "medium" | "low"): string {
  if (level === "high") return t.detect.confidenceHigh;
  if (level === "medium") return t.detect.confidenceMedium;
  return t.detect.confidenceLow;
}

function joinNames(names: string[]): string {
  return names.join(t.report.listJoin);
}

export function EmptyReport() {
  return (
    <section className="empty-report">
      <h2>{t.detect.title}</h2>
      <p className="muted">{t.detect.empty}</p>
    </section>
  );
}

export function ReportView({ report }: { report: DetectionReport }) {
  return (
    <section className="report">
      <h2>{t.detect.title}</h2>
      <p className="muted">
        {interpolate(t.detect.pathValue, { label: t.detect.path, path: report.path })}
      </p>

      <article className={`glass-card verdict-${report.filesystem.verdict}`}>
        <h3>{t.detect.filesystem}</h3>
        <p>
          <span className={`badge ${report.filesystem.verdict}`}>{report.filesystem.code}</span>
          {report.filesystem.type ? ` ${report.filesystem.type}` : ""}
        </p>
        <p>{report.filesystem.message}</p>
      </article>

      <article className="glass-card">
        <h3>{t.detect.purposes}</h3>
        <ul className="chips">
          {report.purposes.map((purpose) => (
            <li key={purpose.id}>
              {purpose.label}
              <small>{confidenceLabel(purpose.confidence)}</small>
            </li>
          ))}
        </ul>
      </article>

      <article className="glass-card">
        <h3>{t.detect.conflicts}</h3>
        {report.conflicts.length === 0 ? (
          <p className="muted">{t.detect.noConflicts}</p>
        ) : (
          <ul>
            {report.conflicts.map((conflict) => (
              <li key={conflict.id}>{conflict.message}</li>
            ))}
          </ul>
        )}
      </article>

      <article className="glass-card">
        <h3>{t.detect.content}</h3>
        {report.content.teslaCam ? (
          <p>
            {interpolate(t.report.teslaCamLine, {
              status: camStatusLabel(report.content.teslaCam.status),
              recent: report.content.teslaCam.recentClips.exists
                ? report.content.teslaCam.recentClips.itemCount
                : t.report.none,
              saved: report.content.teslaCam.savedClips.exists
                ? report.content.teslaCam.savedClips.itemCount
                : t.report.none,
              sentry: report.content.teslaCam.sentryClips.exists
                ? report.content.teslaCam.sentryClips.itemCount
                : t.report.none,
            })}
          </p>
        ) : null}
        {report.content.trackMode ? <p>{t.report.trackModeFound}</p> : null}
        {report.content.lightShow ? (
          <div>
            <p>
              {interpolate(t.report.lightShowLine, { count: report.content.lightShow.shows.length }) +
                (report.content.lightShow.orphans.length > 0
                  ? interpolate(t.report.lightShowOrphans, { count: report.content.lightShow.orphans.length })
                  : "")}
            </p>
            {report.content.lightShow.shows.length > 0 ? (
              <ul>
                {report.content.lightShow.shows.map((show) => (
                  <li key={show.name}>
                    {interpolate(t.report.lightShowPair, {
                      name: show.name,
                      sequence: show.sequence,
                      audio: show.audio,
                    })}
                  </li>
                ))}
              </ul>
            ) : null}
            {report.content.lightShow.orphans.length > 0 ? (
              <p className="muted">
                {interpolate(t.report.orphansLabel, { names: joinNames(report.content.lightShow.orphans) })}
              </p>
            ) : null}
          </div>
        ) : null}
        {report.content.boombox ? (
          <p>
            {interpolate(t.report.boomboxLine, { count: report.content.boombox.files.length }) +
              (report.content.boombox.hasLockChime ? t.report.lockChimeFound : "")}
          </p>
        ) : null}
        {report.content.wraps ? (
          <p>
            {interpolate(t.report.wrapsLine, {
              count: report.content.wraps.assets.length,
              valid: report.content.wraps.validCount,
            })}
          </p>
        ) : null}
        {report.content.updateFiles.length > 0 ? (
          <p>
            {interpolate(t.detect.updateFilesValue, {
              label: t.content.updateFiles,
              names: joinNames(report.content.updateFiles),
            })}
          </p>
        ) : null}
        {report.content.music ? (
          <p>{interpolate(t.report.musicLine, { count: report.content.music.rootAudioCount })}</p>
        ) : null}
        {report.content.capacityWarning ? <p>{report.content.capacityWarning}</p> : null}
        {report.content.namingIssues.length > 0 ? (
          <ul>
            {report.content.namingIssues.map((issue) => (
              <li key={issue}>{issue}</li>
            ))}
          </ul>
        ) : null}
        {!report.content.teslaCam &&
        !report.content.lightShow &&
        !report.content.boombox &&
        !report.content.wraps &&
        !report.content.trackMode &&
        !report.content.music &&
        report.content.namingIssues.length === 0 ? (
          <p className="muted">{t.detect.noContent}</p>
        ) : null}
      </article>

      <article className="glass-card">
        <h3>{t.detect.tips}</h3>
        {report.tips.length === 0 ? (
          <p className="muted">{t.detect.noTips}</p>
        ) : (
          <ul>
            {report.tips.map((tip) => (
              <li key={tip}>{tip}</li>
            ))}
          </ul>
        )}
      </article>
    </section>
  );
}
