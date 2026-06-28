"use client";

import Link from "next/link";
import { useTransition } from "react";
import { markUnitReviewed, markUnitNeedsWork } from "@/app/actions/unit";

interface DueUnit {
  id: string;
  number: number;
  name: string;
  nextReviewAt: string;
  courseId: string;
  courseName: string;
  semesterName: string;
}

interface ReviseUnit {
  id: string;
  number: number;
  name: string;
  courseId: string;
  courseName: string;
}

interface Props {
  dueUnits: DueUnit[];
  reviseUnits: ReviseUnit[];
}

function DueUnitRow({ unit }: { unit: DueUnit }) {
  const [, startTransition] = useTransition();
  const daysOverdue = Math.ceil((Date.now() - new Date(unit.nextReviewAt).getTime()) / 86400000);

  return (
    <div className="flex items-center gap-3 bg-white border border-purple-100 rounded-lg px-3 py-2">
      <span className="w-2 h-2 rounded-full bg-accent flex-shrink-0" />
      <Link href={`/unit/${unit.id}`} className="flex-1 min-w-0 hover:underline">
        <p className="text-sm text-ink font-medium truncate">{unit.name}</p>
        <p className="text-xs text-ink-muted">{unit.courseName} · {unit.semesterName}</p>
      </Link>
      <span className="text-xs text-accent font-mono shrink-0">
        {daysOverdue <= 0 ? "due today" : `${daysOverdue}d overdue`}
      </span>
      <button
        onClick={() => startTransition(() => markUnitReviewed(unit.id, unit.courseId))}
        className="text-xs px-2 py-1 border border-green-200 text-green-700 rounded hover:bg-green-50 transition-colors shrink-0"
        title="Mark as reviewed — advances interval"
      >
        Reviewed ✓
      </button>
      <button
        onClick={() => startTransition(() => markUnitNeedsWork(unit.id, unit.courseId))}
        className="text-xs px-2 py-1 border border-orange-200 text-orange-600 rounded hover:bg-orange-50 transition-colors shrink-0"
        title="Needs more work — returns to Revise"
      >
        Needs work
      </button>
    </div>
  );
}

function ReviseUnitRow({ unit }: { unit: ReviseUnit }) {
  return (
    <Link
      href={`/unit/${unit.id}`}
      className="flex items-center gap-3 bg-white border border-orange-100 rounded-lg px-3 py-2 hover:shadow-sm transition-shadow"
    >
      <span className="w-2 h-2 rounded-full bg-orange-400 flex-shrink-0" />
      <span className="text-sm text-ink font-medium flex-1 truncate">{unit.name}</span>
      <span className="text-xs text-ink-muted">{unit.courseName}</span>
    </Link>
  );
}

export function RevisionQueue({ dueUnits, reviseUnits }: Props) {
  const total = dueUnits.length + reviseUnits.length;
  if (total === 0) return null;

  return (
    <section className="mb-8 space-y-3">
      {dueUnits.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-accent uppercase tracking-wide mb-3">
            Due for revision ({dueUnits.length})
          </h2>
          <div className="space-y-2">
            {dueUnits.map((u) => <DueUnitRow key={u.id} unit={u} />)}
          </div>
        </div>
      )}

      {reviseUnits.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-orange-800 uppercase tracking-wide mb-3">
            Marked for revision ({reviseUnits.length})
          </h2>
          <div className="space-y-2">
            {reviseUnits.map((u) => <ReviseUnitRow key={u.id} unit={u} />)}
          </div>
        </div>
      )}
    </section>
  );
}
