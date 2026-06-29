"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
}: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = "confirm-dialog-title";
  const descId = "confirm-dialog-desc";

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby={titleId}
      aria-describedby={descId}
      className="rounded-xl border border-border bg-paper p-6 w-full max-w-sm shadow-xl backdrop:bg-ink/30 mx-4 sm:mx-auto"
    >
      <h2 id={titleId} className="text-lg font-semibold text-ink mb-2">{title}</h2>
      <p id={descId} className="text-sm text-ink-muted mb-6">{description}</p>
      <div className="flex gap-3 justify-end">
        <button
          autoFocus
          onClick={onCancel}
          className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
        >
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
