"use client";

import { useState } from "react";
import { ImportSyllabus } from "./ImportSyllabus";

interface Props {
  semesterId: string;
}

export function ImportSyllabusButton({ semesterId }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm border border-border text-ink-muted hover:text-ink hover:border-ink rounded-lg transition-colors"
      >
        Import from syllabus
      </button>
      {open && <ImportSyllabus semesterId={semesterId} onClose={() => setOpen(false)} />}
    </>
  );
}
