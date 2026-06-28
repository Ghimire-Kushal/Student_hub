"use client";

import { useState } from "react";
import Link from "next/link";
import { ProgressRing } from "./ProgressRing";
import { ConfirmDialog } from "./ConfirmDialog";
import { Modal } from "./Modal";
import { SemesterForm } from "./SemesterForm";
import { deleteSemester, archiveSemester } from "@/app/actions/semester";

interface Props {
  semester: {
    id: string;
    name: string;
    terminalDate: string | null;
    archived: boolean;
    _count: { courses: number };
    pct: number;
    complete: boolean;
  };
}

export function SemesterCard({ semester }: Props) {
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);

  const daysLeft = semester.terminalDate
    ? Math.ceil((new Date(semester.terminalDate).getTime() - Date.now()) / 86400000)
    : null;

  return (
    <>
      <div className="relative group bg-white border border-border rounded-xl p-5 hover:shadow-md transition-shadow">
        {semester.complete && (
          <span className="absolute top-3 right-3 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
            ✓ Complete
          </span>
        )}

        <Link href={`/semester/${semester.id}`} className="block">
          <div className="flex items-start gap-4">
            <ProgressRing pct={semester.pct} size={52} stroke={5} />
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-ink text-base truncate">{semester.name}</h2>
              <p className="text-sm text-ink-muted mt-0.5">
                {semester._count.courses} subject{semester._count.courses !== 1 ? "s" : ""}
                {" · "}
                {semester.pct}% done
              </p>
              {daysLeft !== null && (
                <p className={`text-xs mt-1 font-mono ${daysLeft <= 14 ? "text-red-600 font-semibold" : "text-ink-muted"}`}>
                  {daysLeft > 0 ? `${daysLeft}d to terminal` : "Terminal passed"}
                </p>
              )}
            </div>
          </div>
        </Link>

        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <button
            onClick={() => setEditing(true)}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => archiveSemester(semester.id, !semester.archived)}
            className="text-xs text-ink-muted hover:text-ink transition-colors"
          >
            {semester.archived ? "Restore" : "Archive"}
          </button>
          <button
            onClick={() => setDeleting(true)}
            className="text-xs text-red-500 hover:text-red-700 transition-colors ml-auto"
          >
            Delete
          </button>
        </div>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title="Edit semester">
        <SemesterForm
          onClose={() => setEditing(false)}
          existing={{
            id: semester.id,
            name: semester.name,
            terminalDate: semester.terminalDate,
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleting}
        title="Delete semester?"
        description={`This will permanently delete "${semester.name}" and all its subjects, units, and resources.`}
        onConfirm={async () => {
          await deleteSemester(semester.id);
          setDeleting(false);
        }}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
