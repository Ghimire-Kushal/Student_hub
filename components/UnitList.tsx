"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UnitStatus } from "@prisma/client";
import { createUnit, deleteUnit, setUnitStatus } from "@/app/actions/unit";
import { ConfirmDialog } from "./ConfirmDialog";
import { statusColors } from "@/lib/theme";

interface Unit {
  id: string;
  number: number;
  name: string;
  status: UnitStatus;
  courseId: string;
}

interface Course {
  id: string;
  lockOrder: boolean;
  syllabus: string | null;
  semesterId: string;
}

const STATUS_ORDER: UnitStatus[] = ["NONE", "ONGOING", "REVISE", "DONE"];

export function UnitList({ course, units }: { course: Course; units: Unit[] }) {
  const [tab, setTab] = useState<"units" | "syllabus">("units");
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const deletingUnit = units.find((u) => u.id === deletingId);

  function isLocked(unit: Unit): boolean {
    if (!course.lockOrder) return false;
    if (unit.number === 1) return false;
    const prev = units.find((u) => u.number === unit.number - 1);
    return prev?.status !== "DONE";
  }

  return (
    <div>
      {/* Tab switcher */}
      <div className="flex border-b border-border mb-6">
        {(["units", "syllabus"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === "syllabus" ? (
        <div className="bg-white border border-border rounded-xl p-6">
          {course.syllabus ? (
            <pre className="font-mono text-sm text-ink whitespace-pre-wrap">{course.syllabus}</pre>
          ) : (
            <p className="text-ink-muted text-sm">No syllabus added yet.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {units.map((unit) => {
            const locked = isLocked(unit);
            const colors = statusColors[unit.status];

            return (
              <div key={unit.id} className={`bg-white border rounded-xl transition-all ${locked ? "border-border opacity-60" : "border-border hover:shadow-sm"}`}>
                <div className="flex items-center gap-3 px-4 py-3">
                  <span className="font-mono text-xs text-ink-muted w-6 flex-shrink-0">{unit.number}</span>

                  {locked ? (
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{unit.name}</p>
                      <p className="text-xs text-ink-muted mt-0.5">
                        🔒 Complete Unit {unit.number - 1} to unlock
                      </p>
                    </div>
                  ) : (
                    <Link href={`/unit/${unit.id}`} className="flex-1 min-w-0 hover:underline">
                      <p className="font-medium text-ink truncate">{unit.name}</p>
                    </Link>
                  )}

                  {/* Status selector */}
                  {!locked && (
                    <select
                      value={unit.status}
                      onChange={(e) => {
                        startTransition(() => setUnitStatus(unit.id, course.id, e.target.value as UnitStatus));
                      }}
                      className="text-xs px-2 py-1 rounded-full border font-medium focus:outline-none focus:ring-2 focus:ring-accent"
                      style={{ backgroundColor: colors.bg, color: colors.text, borderColor: colors.border }}
                    >
                      {STATUS_ORDER.map((s) => (
                        <option key={s} value={s}>{statusColors[s].label}</option>
                      ))}
                    </select>
                  )}

                  {!locked && (
                    <button
                      onClick={() => setDeletingId(unit.id)}
                      className="text-ink-muted hover:text-red-500 transition-colors ml-1 text-lg leading-none"
                      title="Delete unit"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Add unit form */}
          {adding ? (
            <form
              action={async (fd) => {
                await createUnit(course.id, fd);
                setAdding(false);
              }}
              className="bg-white border border-accent/40 rounded-xl px-4 py-3 flex gap-3"
            >
              <input
                name="name"
                required
                autoFocus
                placeholder="Unit name…"
                className="flex-1 text-sm text-ink bg-transparent outline-none placeholder:text-ink-muted"
              />
              <button type="submit" className="text-sm text-accent font-medium hover:underline">Add</button>
              <button type="button" onClick={() => setAdding(false)} className="text-sm text-ink-muted hover:text-ink">Cancel</button>
            </form>
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-ink-muted hover:border-accent hover:text-accent transition-colors"
            >
              + Add unit
            </button>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingId}
        title="Delete unit?"
        description={`This will permanently delete "${deletingUnit?.name}" and all its topics and resources.`}
        onConfirm={async () => {
          if (deletingId) await deleteUnit(deletingId, course.id);
          setDeletingId(null);
        }}
        onCancel={() => setDeletingId(null)}
      />
    </div>
  );
}
