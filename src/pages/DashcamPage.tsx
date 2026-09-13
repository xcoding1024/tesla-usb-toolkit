import { useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PreviewDialog } from "../components/PreviewDialog";
import { interpolate, t } from "../i18n";
import { formatBytes } from "../lib/format";
import { toMediaSrc } from "../lib/media";
import { groupTeslaCamClips, type TeslaCamEventGroup, type TeslaCamListedClip } from "../lib/teslaCam";
import type { DirCount, TeslaCamCategory, TeslaCamera } from "../lib/types";
import { useAppState } from "../state";

function camStatusLabel(status: "ready" | "inUse" | "emptyShell"): string {
  if (status === "inUse") return t.detect.camInUse;
  if (status === "ready") return t.detect.camReady;
  return t.detect.camEmpty;
}

function cameraLabel(camera: TeslaCamera | null): string {
  if (!camera) return t.dashcam.camera.unknown;
  return t.dashcam.camera[camera];
}

function ClipRow({ label, count }: { label: string; count: DirCount }) {
  return (
    <div>
      <dt>{label}</dt>
      <dd>
        {count.exists
          ? `${interpolate(t.dashcam.items, { count: count.itemCount })} · ${interpolate(t.dashcam.size, { size: formatBytes(count.bytes) })}`
          : t.dashcam.none}
      </dd>
    </div>
  );
}

function CategoryBlock({
  category,
  label,
  count,
  groups,
  onPlay,
}: {
  category: TeslaCamCategory;
  label: string;
  count: DirCount;
  groups: TeslaCamEventGroup[];
  onPlay: (clip: TeslaCamListedClip) => void;
}) {
  const [open, setOpen] = useState(category === "recent");
  const [openEvents, setOpenEvents] = useState<Record<string, boolean>>({});

  return (
    <section className="glass-card">
      <button
        type="button"
        className="fold-head"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <strong>{label}</strong>
        <span className="muted">
          {count.exists
            ? `${interpolate(t.dashcam.items, { count: count.itemCount })} · ${interpolate(t.dashcam.eventCount, { count: groups.length })}`
            : t.dashcam.none}
          {" · "}
          {open ? t.actions.collapse : t.actions.expand}
        </span>
      </button>
      {open ? (
        groups.length === 0 ? (
          <p className="muted">{t.dashcam.noClips}</p>
        ) : (
          <ul className="event-list">
            {groups.map((group) => {
              const eventOpen = openEvents[group.id] ?? groups[0]?.id === group.id;
              return (
                <li key={group.id} className="event-item">
                  <button
                    type="button"
                    className="fold-head nested"
                    aria-expanded={eventOpen}
                    onClick={() =>
                      setOpenEvents((current) => ({ ...current, [group.id]: !eventOpen }))
                    }
                  >
                    <span>
                      {group.eventFolder ? group.eventFolder : group.label}
                      <small className="muted">
                        {group.eventFolder ? ` · ${group.label}` : ""}
                        {" · "}
                        {interpolate(t.dashcam.clipCount, { count: group.clips.length })}
                      </small>
                    </span>
                    <span className="muted">{eventOpen ? t.actions.collapse : t.actions.expand}</span>
                  </button>
                  {eventOpen ? (
                    <ul className="file-list">
                      {group.clips.map((clip) => (
                        <li key={`${clip.category}/${clip.eventFolder ?? ""}/${clip.name}`}>
                          <div>
                            <strong>
                              {cameraLabel(clip.camera)}
                              {" · "}
                              {clip.name}
                            </strong>
                            <span className="muted">
                              {clip.time
                                ? interpolate(t.dashcam.capturedAt, { time: clip.time.label })
                                : t.dashcam.unknownTime}
                              {" · "}
                              {formatBytes(clip.bytes)}
                            </span>
                          </div>
                          <button type="button" className="ghost compact" onClick={() => onPlay(clip)}>
                            {t.actions.play}
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )
      ) : null}
    </section>
  );
}

export function DashcamPage() {
  const { report, busy, targetPath, tauri } = useAppState();
  const cam = report?.content.teslaCam;
  const naming = report?.content.namingIssues.filter((issue) => issue.includes("TeslaCam")) ?? [];
  const groups = useMemo(() => groupTeslaCamClips(cam?.clips ?? []), [cam?.clips]);
  const [preview, setPreview] = useState<TeslaCamListedClip | null>(null);
  const previewSrc = toMediaSrc(preview?.path, tauri);

  if (!targetPath && !report) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.dashcam.title}</h1>
        </header>
        <EmptyState title={t.content.noTarget} body={t.overview.scanWaiting} />
      </div>
    );
  }

  if (!cam && !busy) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.dashcam.title}</h1>
        </header>
        <EmptyState title={t.dashcam.emptyTitle} body={t.dashcam.emptyBody} />
        {naming.length > 0 ? (
          <section className="glass-card">
            <ul>
              {naming.map((issue) => (
                <li key={issue}>{issue}</li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.dashcam.title}</h1>
      </header>
      {busy && !cam ? <p className="muted">{t.content.scanning}</p> : null}
      {cam ? (
        <>
          <section className="glass-card drive-detail">
            <dl>
              <div>
                <dt>{t.dashcam.folder}</dt>
                <dd>{t.dashcam.present}</dd>
              </div>
              <div>
                <dt>{t.dashcam.readyState}</dt>
                <dd>
                  <span className={`badge ${cam.status === "inUse" || cam.status === "ready" ? "ok" : "warn"}`}>
                    {camStatusLabel(cam.status)}
                  </span>
                </dd>
              </div>
              <ClipRow label={t.dashcam.recent} count={cam.recentClips} />
              <ClipRow label={t.dashcam.saved} count={cam.savedClips} />
              <ClipRow label={t.dashcam.sentry} count={cam.sentryClips} />
            </dl>
            {report?.content.trackMode ? <p className="muted">{t.dashcam.trackMode}</p> : null}
            {report?.content.capacityWarning ? <p>{report.content.capacityWarning}</p> : null}
          </section>

          <CategoryBlock
            category="recent"
            label={t.dashcam.recent}
            count={cam.recentClips}
            groups={groups.recent}
            onPlay={setPreview}
          />
          <CategoryBlock
            category="saved"
            label={t.dashcam.saved}
            count={cam.savedClips}
            groups={groups.saved}
            onPlay={setPreview}
          />
          <CategoryBlock
            category="sentry"
            label={t.dashcam.sentry}
            count={cam.sentryClips}
            groups={groups.sentry}
            onPlay={setPreview}
          />
        </>
      ) : null}

      <PreviewDialog
        open={preview != null}
        title={t.dashcam.videoPreview}
        onClose={() => setPreview(null)}
      >
        {preview ? (
          <>
            <p>
              <strong>
                {cameraLabel(preview.camera)} · {preview.name}
              </strong>
            </p>
            <p className="muted">
              {preview.time
                ? interpolate(t.dashcam.capturedAt, { time: preview.time.label })
                : t.dashcam.unknownTime}
              {" · "}
              {formatBytes(preview.bytes)}
            </p>
            {previewSrc ? (
              <video className="preview-player" controls autoPlay src={previewSrc} />
            ) : (
              <p className="muted">{t.preview.noMedia}</p>
            )}
          </>
        ) : null}
      </PreviewDialog>
    </div>
  );
}
