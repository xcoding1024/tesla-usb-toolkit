import { t } from "../i18n";
import type { PageId } from "../state";
import { useAppState } from "../state";
import { useAppUpdate } from "../updateState";
import {
  IconCamera,
  IconCar,
  IconGear,
  IconHome,
  IconNote,
  IconSparkle,
  IconUsb,
  TeslaMark,
} from "./icons";

function NavButton({
  id,
  label,
  icon: Icon,
  badge,
}: {
  id: PageId;
  label: string;
  icon: typeof IconHome;
  badge?: boolean;
}) {
  const { page, setPage } = useAppState();
  return (
    <button
      type="button"
      className={page === id ? "nav-item active" : "nav-item"}
      onClick={() => setPage(id)}
    >
      <Icon className="nav-icon" />
      <span>{label}</span>
      {badge ? <i className="nav-badge" aria-label={t.settings.updateBannerAction} /> : null}
    </button>
  );
}

export function Sidebar() {
  const { locale } = useAppState();
  const { info } = useAppUpdate();
  const primary: { id: PageId; label: string; icon: typeof IconHome }[] = [
    { id: "overview", label: t.nav.overview, icon: IconHome },
    { id: "format", label: t.nav.format, icon: IconUsb },
    { id: "dashcam", label: t.nav.dashcam, icon: IconCar },
    { id: "lightShow", label: t.nav.lightShow, icon: IconSparkle },
    { id: "wraps", label: t.nav.wraps, icon: IconCamera },
    { id: "lockChime", label: t.nav.lockChime, icon: IconNote },
  ];

  return (
    <aside className="sidebar">
      <div className="brand">
        <TeslaMark className="brand-mark" />
        <div>
          <strong>{t.app.name}</strong>
        </div>
      </div>
      <nav className="nav" key={locale}>
        {primary.map((item) => (
          <NavButton key={item.id} {...item} />
        ))}
      </nav>
      <nav className="nav nav-secondary">
        <NavButton
          id="settings"
          label={t.nav.settings}
          icon={IconGear}
          badge={Boolean(info?.updateAvailable)}
        />
      </nav>
    </aside>
  );
}
