"use client";

import { useRef } from "react";
import { createSemester, updateSemester } from "@/app/actions/semester";

interface Props {
  onClose: () => void;
  existing?: { id: string; name: string; terminalDate: string | null };
}

export function SemesterForm({ onClose, existing }: Props) {
  const ref = useRef<HTMLFormElement>(null);

  async function action(formData: FormData) {
    if (existing) {
      await updateSemester(existing.id, formData);
    } else {
      await createSemester(formData);
    }
    onClose();
  }

  return (
    <form ref={ref} action={action} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Name</label>
        <input
          name="name"
          required
          defaultValue={existing?.name}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
          placeholder="e.g. Semester II"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink mb-1">Terminal exam date</label>
        <input
          name="terminalDate"
          type="date"
          defaultValue={existing?.terminalDate?.slice(0, 10) ?? ""}
          className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </div>
      <div className="flex gap-3 justify-end pt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">
          Cancel
        </button>
        <button type="submit" className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg">
          {existing ? "Save" : "Create"}
        </button>
      </div>
    </form>
  );
}
