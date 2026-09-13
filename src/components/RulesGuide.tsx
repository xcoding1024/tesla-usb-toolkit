import { t } from "../i18n";
import { FORMAT_OPTIONS, optionCopy } from "../lib/format";

export function RulesGuide() {
  const contentRows = [
    { type: t.rules.typeDashcam, feature: t.rules.featureDashcam, preview: t.rules.previewDashcam },
    { type: t.rules.typeTrack, feature: t.rules.featureTrack, preview: t.rules.previewTrack },
    { type: t.rules.typeLight, feature: t.rules.featureLight, preview: t.rules.previewLight },
    { type: t.rules.typeWraps, feature: t.rules.featureWraps, preview: t.rules.previewWraps },
    { type: t.rules.typeBoombox, feature: t.rules.featureBoombox, preview: t.rules.previewBoombox },
    { type: t.rules.typeMusic, feature: t.rules.featureMusic, preview: t.rules.previewMusic },
  ];

  return (
    <>
      <section className="glass-card">
        <h2>{t.rules.formatTitle}</h2>
        <table className="guide-table">
          <thead>
            <tr>
              <th>{t.rules.colFormat}</th>
              <th>{t.rules.colUse}</th>
              <th>{t.rules.colNote}</th>
            </tr>
          </thead>
          <tbody>
            {FORMAT_OPTIONS.map((option) => {
              const copy = optionCopy(option.id);
              return (
                <tr key={option.id}>
                  <td>{copy.label}</td>
                  <td>{copy.use}</td>
                  <td>{copy.help}</td>
                </tr>
              );
            })}
            <tr>
              <td>{t.rules.extName}</td>
              <td>{t.rules.extUse}</td>
              <td>{t.rules.extNote}</td>
            </tr>
            <tr>
              <td>{t.rules.ntfsName}</td>
              <td>{t.rules.ntfsUse}</td>
              <td>{t.rules.ntfsNote}</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="glass-card">
        <h2>{t.rules.contentTitle}</h2>
        <table className="guide-table">
          <thead>
            <tr>
              <th>{t.rules.colType}</th>
              <th>{t.rules.colFeature}</th>
              <th>{t.rules.colPreview}</th>
            </tr>
          </thead>
          <tbody>
            {contentRows.map((row) => (
              <tr key={row.type}>
                <td>{row.type}</td>
                <td>
                  <code>{row.feature}</code>
                </td>
                <td>{row.preview}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="muted">{t.rules.more}</p>
    </>
  );
}
