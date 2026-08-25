import { useEffect } from "react";

export default function ConfirmDialog({
  title,
  message,
  confirmLabel = "Delete",
  pendingLabel,
  pending = false,
  onConfirm,
  onCancel,
}) {
  useEffect(() => {
    if (pending) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onCancel, pending]);

  return (
    <div
      className="confirm-dialog"
      role="alertdialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="confirm-dialog-backdrop" onClick={pending ? undefined : onCancel} />
      <div className="confirm-dialog-panel">
        <h3>{title}</h3>
        <p>{message}</p>
        <div className="confirm-dialog-actions">
          <button
            type="button"
            className="btn btn-outline"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-primary confirm-dialog-confirm"
            onClick={onConfirm}
            disabled={pending}
            autoFocus
          >
            {pending ? pendingLabel || "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
