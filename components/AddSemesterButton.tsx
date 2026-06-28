"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { SemesterForm } from "./SemesterForm";

export function AddSemesterButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium"
      >
        + New semester
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="New semester">
        <SemesterForm onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
