"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { UnitStatus } from "@prisma/client";
import { createUnit, deleteUnit, setUnitStatus } from "@/app/actions/unit";
import { updateSyllabus } from "@/app/actions/course";
import { buildUnitsFromSyllabus } from "@/app/actions/build-units";
import { ConfirmDialog } from "./ConfirmDialog";
import { statusColors } from "@/lib/theme";

interface Unit {
  id: string;
  number: number;
  name: string;
  status: UnitStatus;
  courseId: string;
  hasContent: boolean; // true if unit has any topics or resources
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
  const [editingSyllabus, setEditingSyllabus] = useState(false);
  const [syllabusText, setSyllabusText] = useState(course.syllabus ?? "");
  const [syllabusError, setSyllabusError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [isSavingSyllabus, startSyllabusTransition] = useTransition();
  const [buildError, setBuildError] = useState<string | null>(null);
  const [buildDone, setBuildDone] = useState<string | null>(null);
  const [isBuildingUnits, startBuildTransition] = useTransition();

  function handleBuildUnits() {
    setBuildError(null);
    setBuildDone(null);
    startBuildTransition(async () => {
      try {
        const { created } = await buildUnitsFromSyllabus(course.id);
        setBuildDone(`Created ${created} unit${created !== 1 ? "s" : ""} — refresh to see them.`);
      } catch (e) {
        setBuildError(e instanceof Error ? e.message : "Failed to build units.");
      }
    });
  }

  function saveSyllabus() {
    setSyllabusError(null);
    startSyllabusTransition(async () => {
      try {
        await updateSyllabus(course.id, syllabusText);
        setEditingSyllabus(false);
      } catch (e) {
        setSyllabusError(e instanceof Error ? e.message : "Failed to save.");
      }
    });
  }

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
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <span className="text-sm font-medium text-ink">Course Syllabus</span>
            {editingSyllabus ? (
              <div className="flex items-center gap-2">
                {syllabusError && <span className="text-xs text-red-500">{syllabusError}</span>}
                <button
                  onClick={() => { setEditingSyllabus(false); setSyllabusText(course.syllabus ?? ""); setSyllabusError(null); }}
                  className="text-sm text-ink-muted hover:text-ink"
                >
                  Cancel
                </button>
                <button
                  onClick={saveSyllabus}
                  disabled={isSavingSyllabus}
                  className="text-sm px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50"
                >
                  {isSavingSyllabus ? "Saving…" : "Save"}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setEditingSyllabus(true)}
                className="inline-flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit
              </button>
            )}
          </div>

          {/* Content */}
          {editingSyllabus ? (
            <textarea
              value={syllabusText}
              onChange={(e) => setSyllabusText(e.target.value)}
              rows={20}
              autoFocus
              placeholder="Paste or type the course syllabus here…"
              className="w-full px-4 py-4 font-mono text-sm text-ink bg-white resize-y focus:outline-none"
            />
          ) : (
            <div className="p-6">
              {syllabusText ? (
                <pre className="font-mono text-sm text-ink whitespace-pre-wrap">{syllabusText}</pre>
              ) : (
                <p className="text-ink-muted text-sm italic">No syllabus added yet. Click &ldquo;Edit&rdquo; to add one.</p>
              )}
            </div>
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
                      aria-label={`Delete unit "${unit.name}"`}
                      className="text-ink-muted hover:text-red-500 transition-colors ml-1 text-lg leading-none"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          {/* Build from syllabus — shown when no units exist but syllabus text is present */}
          {units.length === 0 && course.syllabus?.trim() && (
            <div className="bg-accent-light border border-accent/20 rounded-xl px-4 py-4 text-center space-y-2">
              <p className="text-sm text-ink">
                This course has a saved syllabus but no units yet.
              </p>
              {buildDone ? (
                <p className="text-sm text-green-700 font-medium">{buildDone}</p>
              ) : (
                <button
                  onClick={handleBuildUnits}
                  disabled={isBuildingUnits}
                  className="px-4 py-2 bg-accent text-white text-sm rounded-lg hover:bg-accent/90 disabled:opacity-50"
                >
                  {isBuildingUnits ? "Building…" : "Build units from syllabus"}
                </button>
              )}
              {buildError && <p className="text-xs text-red-600">{buildError}</p>}
            </div>
          )}

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
