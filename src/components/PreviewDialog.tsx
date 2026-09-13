import { useEffect, useRef, type ReactNode } from "react";
import { t } from "../i18n";

export function PreviewDialog({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open) {
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="format-dialog preview-dialog"
      aria-labelledby="preview-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="modal preview-modal" role="document">
        <header className="preview-head">
          <h2 id="preview-title">{title}</h2>
          <button type="button" className="ghost compact" onClick={onClose}>
            {t.actions.close}
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
