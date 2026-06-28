"use client";

import { useState } from "react";
import { Modal } from "./Modal";
import { CourseForm } from "./CourseForm";

export function AddCourseButton({ semesterId }: { semesterId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="px-4 py-2 text-sm bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors font-medium flex-shrink-0"
      >
        + Add subject
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add subject">
        <CourseForm semesterId={semesterId} onClose={() => setOpen(false)} />
      </Modal>
    </>
  );
}
