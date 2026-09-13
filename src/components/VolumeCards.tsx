import { interpolate, t } from "../i18n";
import { displayVolumeName } from "../lib/demo";
import { availablePercent, formatFreeOfTotal, usageTone, usedRatio } from "../lib/format";
import { evaluate, kindLabel } from "../lib/rules";
import type { PurposeId, Volume } from "../lib/types";
import { useAppState } from "../state";
import { IconCamera, IconCar, IconNote, IconUsb, IconWarn } from "./icons";

function fallbackSubtitle(volume: Volume): string {
  return `${volume.filesystem ?? "—"} · ${kindLabel(volume.kind)}`;
}

function CardIcon({ purposes }: { purposes: PurposeId[] }) {
  if (purposes.includes("dashcam")) return <IconCar className="card-glyph" />;
  if (purposes.includes("lightShow")) return <IconCamera className="card-glyph" />;
  if (purposes.includes("music") || purposes.includes("boombox")) return <IconNote className="card-glyph" />;
  if (purposes.includes("empty")) return <IconUsb className="card-glyph" />;
  return <IconWarn className="card-glyph" />;
}

export function VolumeCards() {
  const { volumes, selectedId, selectVolume, demoById, folderOnly } = useAppState();

  if (volumes.length === 0) {
    return <p className="muted">{t.overview.noVolumes}</p>;
  }

  return (
    <ul className="volume-cards">
      {volumes.map((volume) => {
        const demo = demoById.get(volume.id);
        const report = demo ? evaluate(demo.snapshot) : null;
        const purposes = report?.purposes.map((p) => p.id) ?? [];
        const subtitle = report
          ? report.purposes.map((p) => p.label).join(" · ")
          : fallbackSubtitle(volume);
        const avail = availablePercent(volume.totalBytes, volume.freeBytes);
        const used = usedRatio(volume.totalBytes, volume.freeBytes) ?? 0;
        const tone = usageTone(avail);
        const selected = volume.id === selectedId && !folderOnly;
        return (
          <li key={volume.id}>
            <button type="button" className={selected ? "volume-card selected" : "volume-card"} onClick={() => selectVolume(volume.id)}>
              <div className={`card-icon tone-${tone}`}>
                <CardIcon purposes={purposes} />
              </div>
              <div className="card-body">
                <div className="card-head">
                  <strong>{displayVolumeName(volume)}</strong>
                  <span>{subtitle}</span>
                </div>
                <div className={`usage-bar ${tone}`}>
                  <i style={{ width: `${Math.round(used * 100)}%` }} />
                </div>
                <div className="card-meta">
                  <span>
                    {volume.totalBytes != null
                      ? formatFreeOfTotal(volume.totalBytes, volume.freeBytes)
                      : t.overview.unknownSize}
                  </span>
                  <span>{avail == null ? "—" : interpolate(t.overview.available, { percent: avail })}</span>
                </div>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
