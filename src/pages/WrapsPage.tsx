import { useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PreviewDialog } from "../components/PreviewDialog";
import { interpolate, t } from "../i18n";
import { formatBytes } from "../lib/format";
import { toMediaSrc } from "../lib/media";
import type { WrapAsset } from "../lib/types";
import { useAppState } from "../state";

export function WrapsPage() {
  const { report, busy, targetPath, tauri } = useAppState();
  const wraps = report?.content.wraps;
  const updates = report?.content.updateFiles ?? [];
  const wrapConflict = report?.conflicts.find((item) => item.id === "wraps-update");
  const [preview, setPreview] = useState<WrapAsset | null>(null);
  const previewSrc = toMediaSrc(preview?.path, tauri);

  if (!targetPath && !report) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.wraps.title}</h1>
        </header>
        <EmptyState title={t.content.noTarget} body={t.overview.scanWaiting} />
      </div>
    );
  }

  if (!wraps && !busy) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.wraps.title}</h1>
        </header>
        <EmptyState title={t.wraps.emptyTitle} body={t.wraps.emptyBody} />
      </div>
    );
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.wraps.title}</h1>
      </header>
      {busy && !wraps ? <p className="muted">{t.content.scanning}</p> : null}
      {wraps ? (
        <>
          <section className="glass-card">
            <h2>{t.wraps.folder}</h2>
            <p>
              {wraps.folderPresent ? t.dashcam.present : t.dashcam.missing}
              {" · "}
              {interpolate(t.wraps.count, { count: wraps.assets.length })}
              {" · "}
              {interpolate(t.wraps.validCount, { count: wraps.validCount })}
            </p>
            {wraps.tooMany ? <p className="banner">{t.wraps.tooMany}</p> : null}
            {wrapConflict ? <p className="banner error">{wrapConflict.message}</p> : null}
            {updates.length > 0 ? (
              <p className="muted">
                {t.content.updateFiles}：{updates.join("、")}
              </p>
            ) : null}
            <p className="muted">{t.wraps.addHint}</p>
          </section>

          {wraps.assets.length > 0 ? (
            <section className="glass-card">
              <div className="wrap-grid">
                {wraps.assets.map((asset) => {
                  const src = toMediaSrc(asset.path, tauri);
                  return (
                    <button
                      key={`${asset.folder}/${asset.name}`}
                      type="button"
                      className="wrap-tile"
                      onClick={() => setPreview(asset)}
                    >
                      {src ? (
                        <img src={src} alt={asset.name} className="wrap-thumb" />
                      ) : (
                        <div className="wrap-thumb placeholder">{t.wraps.noPreview}</div>
                      )}
                      <strong>{asset.name}</strong>
                      <span className="muted">
                        {asset.width != null && asset.height != null
                          ? interpolate(t.wraps.dimensions, { width: asset.width, height: asset.height })
                          : t.wraps.unknownDim}
                        {" · "}
                        {formatBytes(asset.bytes)}
                      </span>
                      {asset.notes.length > 0 ? (
                        <small className="warn-notes">{asset.notes.join(" ")}</small>
                      ) : (
                        <small className="ok-notes">{t.detect.noTips}</small>
                      )}
                    </button>
                  );
                })}
              </div>
            </section>
          ) : (
            <EmptyState title={t.wraps.emptyTitle} body={t.wraps.emptyBody} />
          )}
        </>
      ) : null}

      <PreviewDialog open={preview != null} title={t.wraps.imagePreview} onClose={() => setPreview(null)}>
        {preview ? (
          <>
            {previewSrc ? (
              <img src={previewSrc} alt={preview.name} className="preview-image" />
            ) : (
              <p className="muted">{t.wraps.noPreview}</p>
            )}
            <p>
              <strong>{preview.name}</strong>
            </p>
            <p className="muted">
              {preview.folder}
              {" · "}
              {formatBytes(preview.bytes)}
              {" · "}
              {preview.width != null && preview.height != null
                ? interpolate(t.wraps.dimensions, { width: preview.width, height: preview.height })
                : t.wraps.unknownDim}
            </p>
            {preview.notes.length > 0 ? (
              <p className="warn-notes">{preview.notes.join(" ")}</p>
            ) : (
              <p className="ok-notes">{t.detect.noTips}</p>
            )}
          </>
        ) : null}
      </PreviewDialog>
    </div>
  );
}
