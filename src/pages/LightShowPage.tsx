import { useEffect, useState } from "react";
import { AudioPreview } from "../components/AudioPreview";
import { EmptyState } from "../components/EmptyState";
import { interpolate, t } from "../i18n";
import { parseFseqHeader, type FseqInfo, type FseqIssue } from "../lib/fseq";
import { formatBytes } from "../lib/format";
import { readFileHead, toMediaSrc } from "../lib/media";
import type { LightShowPair, ListedMediaFile } from "../lib/types";
import { useAppState } from "../state";

function formatDuration(ms: number | null): string {
  if (ms == null) return t.dashcam.unknownTime;
  const seconds = ms / 1000;
  const value = seconds >= 10 ? seconds.toFixed(0) : seconds.toFixed(1);
  return interpolate(t.preview.seconds, { value });
}

function issueText(issue: FseqIssue): string {
  return t.lightShow.issues[issue];
}

function FseqMeta({ file }: { file: ListedMediaFile | undefined }) {
  const [info, setInfo] = useState<FseqInfo | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!file?.path) {
      setInfo(null);
      setFailed(false);
      return;
    }
    let cancelled = false;
    setFailed(false);
    void readFileHead(file.path, 64)
      .then((head) => {
        if (!cancelled) setInfo(parseFseqHeader(head));
      })
      .catch(() => {
        if (!cancelled) {
          setInfo(null);
          setFailed(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [file?.path]);

  if (!file) {
    return <p className="muted">{t.lightShow.fseqUnavailable}</p>;
  }

  return (
    <div className="fseq-meta">
      <h3>{t.lightShow.fseqMeta}</h3>
      <p className="muted">
        {file.name}
        {" · "}
        {interpolate(t.lightShow.fseqSize, { size: formatBytes(file.bytes) })}
      </p>
      {failed ? <p className="muted">{t.lightShow.fseqUnavailable}</p> : null}
      {info ? (
        <>
          <p>
            {info.frameCount != null ? interpolate(t.lightShow.fseqFrames, { count: info.frameCount }) : ""}
            {info.durationMs != null ? ` · ${interpolate(t.lightShow.fseqDuration, { duration: formatDuration(info.durationMs) })}` : ""}
            {info.channelCount != null ? ` · ${interpolate(t.lightShow.fseqChannels, { count: info.channelCount })}` : ""}
          </p>
          <p className="muted">
            {info.versionMajor != null && info.versionMinor != null
              ? interpolate(t.lightShow.fseqVersion, { major: info.versionMajor, minor: info.versionMinor })
              : ""}
            {info.stepTimeMs != null
              ? ` · ${interpolate(t.lightShow.fseqStep, { ms: info.stepTimeMs })}`
              : ""}
            {` · ${interpolate(t.lightShow.fseqCompression, { type: t.lightShow.compression[info.compression] })}`}
          </p>
          <p className={info.teslaOk ? "ok-notes" : "warn-notes"}>
            {info.teslaOk ? t.lightShow.fseqTeslaOk : info.validHeader ? t.lightShow.fseqTeslaWarn : t.lightShow.fseqTeslaFail}
          </p>
          {info.issues.length > 0 ? (
            <ul>
              {info.issues.map((issue) => (
                <li key={issue}>{issueText(issue)}</li>
              ))}
            </ul>
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function ShowCard({ show, files }: { show: LightShowPair; files: ListedMediaFile[] }) {
  const { tauri } = useAppState();
  const sequence = show.sequenceFile ?? files.find((file) => file.name === show.sequence);
  const audio = show.audioFile ?? files.find((file) => file.name === show.audio);
  const audioSrc = toMediaSrc(audio?.path, tauri);

  return (
    <li className="show-card">
      <div className="show-card-head">
        <strong>{show.name}</strong>
        <span className="muted">
          {interpolate(t.lightShow.pairFiles, { sequence: show.sequence, audio: show.audio })}
        </span>
      </div>
      {audioSrc ? (
        <AudioPreview src={audioSrc} label={t.lightShow.listenAudio} />
      ) : (
        <p className="muted">{t.preview.noMedia}</p>
      )}
      <FseqMeta file={sequence} />
    </li>
  );
}

export function LightShowPage() {
  const { report, busy, targetPath, tauri } = useAppState();
  const light = report?.content.lightShow;
  const conflicts =
    report?.conflicts.filter((item) => item.id === "lightshow-teslacam" || item.id === "lightshow-update") ?? [];
  const updates = report?.content.updateFiles ?? [];
  const naming = report?.content.namingIssues.filter((issue) => issue.includes("LightShow")) ?? [];
  const files = light?.files ?? [];

  if (!targetPath && !report) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.lightShow.title}</h1>
        </header>
        <EmptyState title={t.content.noTarget} body={t.overview.scanWaiting} />
      </div>
    );
  }

  if (!light && !busy) {
    return (
      <div className="page">
        <header className="page-head">
          <h1>{t.lightShow.title}</h1>
        </header>
        <EmptyState title={t.lightShow.emptyTitle} body={t.lightShow.emptyBody} />
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
        <h1>{t.lightShow.title}</h1>
      </header>
      {busy && !light ? <p className="muted">{t.content.scanning}</p> : null}
      {light ? (
        <>
          <section className="glass-card">
            <h2>{t.lightShow.folder}</h2>
            <p>
              {interpolate(t.lightShow.pairCount, { count: light.shows.length })}
              {light.orphans.length > 0
                ? ` · ${interpolate(t.lightShow.orphanCount, { count: light.orphans.length })}`
                : ""}
            </p>
            <p className="muted">{t.lightShow.addHint}</p>
            {light.shows.length > 0 ? (
              <ul className="show-list">
                {light.shows.map((show) => (
                  <ShowCard key={show.name} show={show} files={files} />
                ))}
              </ul>
            ) : null}
          </section>

          <section className="glass-card">
            <h2>{t.lightShow.orphans}</h2>
            {light.orphans.length === 0 ? (
              <p className="muted">{t.lightShow.noOrphans}</p>
            ) : (
              <ul className="file-list">
                {light.orphans.map((name) => {
                  const file = files.find((item) => item.name === name);
                  const isAudio = name.toLowerCase().endsWith(".wav") || name.toLowerCase().endsWith(".mp3");
                  const src = toMediaSrc(file?.path, tauri);
                  return (
                    <li key={name}>
                      <strong>{name}</strong>
                      {file ? <span className="muted">{formatBytes(file.bytes)}</span> : null}
                      {isAudio && src ? <AudioPreview src={src} label={t.lightShow.listenAudio} /> : null}
                      {name.toLowerCase().endsWith(".fseq") ? <FseqMeta file={file} /> : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="glass-card">
            <h2>{t.lightShow.conflicts}</h2>
            {conflicts.length === 0 && updates.length === 0 ? (
              <p className="muted">{t.detect.noConflicts}</p>
            ) : (
              <ul>
                {conflicts.map((item) => (
                  <li key={item.id}>{item.message}</li>
                ))}
                {updates.length > 0 ? (
                  <li>
                    {t.content.updateFiles}：{updates.join("、")}
                  </li>
                ) : null}
              </ul>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
