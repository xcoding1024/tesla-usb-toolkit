import { useEffect, useRef, useState } from "react";
import { interpolate, t } from "../i18n";
import { displayVolumeName } from "../lib/demo";
import {
  capabilityCopy,
  isOptionAvailable,
  optionCopy,
  optionsForPlatform,
  validateFormatRequest,
  type AppPlatform,
  type FormatFsId,
} from "../lib/format";
import { useAppState } from "../state";

function resolvePlatform(platform: string | undefined): AppPlatform {
  if (platform === "windows" || platform === "macos" || platform === "linux" || platform === "demo") {
    return platform;
  }
  return "web";
}

export function FormatDialog() {
  const {
    formatOpen,
    setFormatOpen,
    selectedVolume,
    folderOnly,
    capabilities,
    tauri,
    busy,
    runFormat,
  } = useAppState();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [fs, setFs] = useState<FormatFsId>("exfat");
  const [label, setLabel] = useState("TESLA");
  const [confirmed, setConfirmed] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [resultNote, setResultNote] = useState<string | null>(null);

  const platform = resolvePlatform(capabilities?.platform ?? selectedVolume?.platform);
  const options = optionsForPlatform(platform);

  const selectedCopy = optionCopy(fs);
  const available = isOptionAvailable(fs, platform);

  const volumeName = selectedVolume ? displayVolumeName(selectedVolume) : t.drive.none;

  function closeDialog() {
    setFormatOpen(false);
    dialogRef.current?.close();
  }

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (formatOpen) {
      setConfirmed(false);
      setLocalError(null);
      setResultNote(null);
      setFs("exfat");
      setLabel("TESLA");
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [formatOpen]);

  async function submit() {
    setLocalError(null);
    setResultNote(null);
    const check = validateFormatRequest({
      path: selectedVolume?.path ?? "",
      filesystem: fs,
      confirmed,
      label,
      formatEligible: selectedVolume?.formatEligible,
      isSystem: selectedVolume?.isSystem,
      folderOnly,
    });
    if (!check.ok) {
      setLocalError(check.error);
      return;
    }
    if (!available && platform !== "web" && platform !== "demo") {
      setLocalError(t.format.unavailableOnPlatform);
      return;
    }
    try {
      if (!tauri) {
        setResultNote(t.format.demoBlocked);
        return;
      }
      const result = await runFormat(check.filesystem, check.label, true);
      if (result && !result.ok) {
        setLocalError(result.message);
      } else if (result?.ok) {
        setResultNote(result.message);
      }
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="format-dialog"
      aria-labelledby="format-title"
      onCancel={(event) => {
        event.preventDefault();
        closeDialog();
      }}
      onClose={() => setFormatOpen(false)}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeDialog();
      }}
    >
      <div className="modal" role="document">
        <h2 id="format-title">{t.format.title}</h2>
        <p className="muted">
          {volumeName}
          {selectedVolume?.path ? ` · ${selectedVolume.path}` : ""}
        </p>

        <div className="danger-banner">
          <strong>{t.format.warningTitle}</strong>
          <p>{t.format.warningBody}</p>
        </div>

        <fieldset className="fs-picker">
          <legend>{t.format.chooseFs}</legend>
          {options.map((option) => {
            const copy = optionCopy(option.id);
            const enabled = isOptionAvailable(option.id, platform);
            return (
              <label key={option.id} className={fs === option.id ? "fs-option selected" : "fs-option"}>
                <input
                  type="radio"
                  name="filesystem"
                  value={option.id}
                  checked={fs === option.id}
                  disabled={!enabled && platform !== "web" && platform !== "demo"}
                  onChange={() => setFs(option.id)}
                />
                <span>
                  <strong>
                    {copy.label}
                    {option.recommended ? ` · ${t.actions.recommended}` : ""}
                  </strong>
                  <small>{copy.use}</small>
                </span>
              </label>
            );
          })}
        </fieldset>

        <p className="help-block">
          <strong>{t.format.helpTitle}</strong>
          {selectedCopy.help}
        </p>

        <label className="field">
          {t.format.label}
          <input value={label} onChange={(event) => setLabel(event.target.value)} placeholder={t.format.labelPlaceholder} />
        </label>

        <label className="confirm-row">
          <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
          <span>{interpolate(t.format.confirmCheck, { name: volumeName })}</span>
        </label>

        {localError ? <p className="banner error">{localError}</p> : null}
        {resultNote && resultNote !== capabilityCopy(capabilities?.platform) ? (
          <p className="banner">{resultNote}</p>
        ) : null}
        {capabilities && !capabilities.canFormat ? (
          <p className="banner">{capabilityCopy(capabilities.platform)}</p>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="ghost" onClick={closeDialog}>
            {t.actions.cancel}
          </button>
          <button type="button" className="danger" disabled={busy} onClick={() => void submit()}>
            {busy ? t.format.running : t.actions.confirmFormat}
          </button>
        </div>
      </div>
    </dialog>
  );
}
