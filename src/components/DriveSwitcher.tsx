import { t } from "../i18n";
import { displayVolumeName } from "../lib/demo";
import { useAppState } from "../state";

export function DriveSwitcher() {
  const { volumes, selectedId, customPath, selectVolume, folderOnly } = useAppState();

  return (
    <label className="drive-switcher">
      <span>{t.drive.current}</span>
      <select
        value={folderOnly ? "" : (selectedId ?? "")}
        onChange={(event) => {
          if (event.target.value) selectVolume(event.target.value);
        }}
        aria-label={t.drive.switcherLabel}
      >
        {folderOnly ? <option value="">{customPath}</option> : null}
        {volumes.length === 0 ? <option value="">{t.drive.none}</option> : null}
        {volumes.map((volume) => (
          <option key={volume.id} value={volume.id}>
            {displayVolumeName(volume)}
          </option>
        ))}
      </select>
    </label>
  );
}
