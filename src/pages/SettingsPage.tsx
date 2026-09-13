import { RulesGuide } from "../components/RulesGuide";
import { t, type Locale } from "../i18n";
import { capabilityCopy } from "../lib/format";
import { useAppState } from "../state";

export function SettingsPage() {
  const { tauri, capabilities, refreshVolumes, locale, setLocale } = useAppState();

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.settings.title}</h1>
      </header>

      <section className="glass-card">
        <h2>{t.settings.about}</h2>
        <p>{t.settings.aboutBody}</p>
      </section>

      <section className="glass-card">
        <h2>{t.settings.language}</h2>
        <label className="field">
          <select
            value={locale}
            onChange={(event) => setLocale(event.target.value as Locale)}
          >
            <option value="en">{t.settings.languageEn}</option>
            <option value="zh">{t.settings.languageZh}</option>
          </select>
        </label>
        <p className="muted">{t.settings.languageHint}</p>
      </section>

      <section className="glass-card">
        <h2>{t.settings.runtime}</h2>
        <p>{tauri ? t.settings.desktopMode : t.settings.browserMode}</p>
        {capabilities ? (
          <p className="muted">
            {capabilities.platform} · {capabilityCopy(capabilities.platform)}
          </p>
        ) : null}
        <button type="button" className="ghost" onClick={() => void refreshVolumes()}>
          {t.actions.refresh}
        </button>
      </section>

      <header className="page-head">
        <h2>{t.settings.rules}</h2>
      </header>
      <RulesGuide />
    </div>
  );
}
