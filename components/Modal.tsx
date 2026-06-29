"use client";

import { useEffect, useRef } from "react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Modal({ open, onClose, title, children }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (open) ref.current?.showModal();
    else ref.current?.close();
  }, [open]);

  if (!open) return null;

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      className="rounded-xl border border-border bg-paper p-6 shadow-xl backdrop:bg-ink/30 w-full max-w-md mx-4 sm:mx-auto"
    >
      <h2 className="text-lg font-semibold text-ink mb-4">{title}</h2>
      {children}
    </dialog>
  );
}
