"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { previewSyllabusFromText, confirmDashboardImport, getUserSemesters } from "@/app/dashboard-import-actions";
import type { ParsedSyllabus, ParsedSubject, ParsedUnit } from "@/lib/syllabus-import";

type Step = "input" | "previewing" | "preview" | "importing" | "done";

interface SemesterOption { id: string; name: string }

interface Props {
  onClose: () => void;
}

export function DashboardImportModal({ onClose }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [syllabus, setSyllabus] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Semester selection state
  const [semesterMode, setSemesterMode] = useState<"new" | "existing">("new");
  const [semesterName, setSemesterName] = useState("");
  const [existingSemesters, setExistingSemesters] = useState<SemesterOption[]>([]);
  const [selectedSemesterId, setSelectedSemesterId] = useState("");

  // Per-subject/unit deletion
  const [deletedSubjects, setDeletedSubjects] = useState<Set<number>>(new Set());
  const [deletedUnits, setDeletedUnits] = useState<Map<number, Set<number>>>(new Map());

  const [importedSemesterId, setImportedSemesterId] = useState<string | null>(null);

  useEffect(() => {
    if (step === "preview") {
      getUserSemesters().then((sems) => {
        setExistingSemesters(sems);
        if (sems.length > 0) setSelectedSemesterId(sems[0].id);
      }).catch(() => {});
    }
  }, [step]);

  function deleteSubject(si: number) {
    setDeletedSubjects((prev) => new Set([...prev, si]));
  }

  function deleteUnit(si: number, ui: number) {
    setDeletedUnits((prev) => {
      const next = new Map(prev);
      const set = new Set(next.get(si) ?? []);
      set.add(ui);
      next.set(si, set);
      return next;
    });
  }

  function getFilteredSyllabus(): ParsedSyllabus {
    if (!syllabus) return { semester: { name: null }, subjects: [] };
    const subjects: ParsedSubject[] = [];
    syllabus.subjects.forEach((s, si) => {
      if (deletedSubjects.has(si)) return;
      const deletedU = deletedUnits.get(si) ?? new Set();
      const units: ParsedUnit[] = s.units.filter((_, ui) => !deletedU.has(ui));
      subjects.push({ ...s, units });
    });
    return { semester: syllabus.semester, subjects };
  }

  function handlePreview() {
    setError(null);
    setStep("previewing");

    startTransition(async () => {
      try {
        let text = rawText;

        if (pdfFile) {
          const fd = new FormData();
          fd.append("file", pdfFile);
          const res = await fetch("/api/parse-pdf", { method: "POST", body: fd });
          const json = await res.json() as { error?: string; text?: string };
          if (!res.ok) throw new Error(json.error ?? "PDF extraction failed");
          text = json.text ?? "";
        }

        if (!text.trim()) {
          setError("Paste syllabus text or upload a PDF.");
          setStep("input");
          return;
        }

        const result = await previewSyllabusFromText(text);
        setSyllabus(result);
        setSemesterName(result.semester.name ?? "");
        setDeletedSubjects(new Set());
        setDeletedUnits(new Map());
        setStep("preview");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse syllabus.");
        setStep("input");
      }
    });
  }

  function handleConfirm() {
    const filtered = getFilteredSyllabus();
    if (filtered.subjects.length === 0) {
      setError("Nothing to import — restore at least one subject.");
      return;
    }
    if (semesterMode === "new" && !semesterName.trim()) {
      setError("Enter a semester name.");
      return;
    }
    setError(null);
    setStep("importing");

    startTransition(async () => {
      try {
        const result = await confirmDashboardImport({
          syllabus: filtered,
          semesterId: semesterMode === "existing" ? selectedSemesterId : undefined,
          newSemesterName: semesterMode === "new" ? semesterName.trim() : undefined,
        });
        setImportedSemesterId(result.semesterId);
        setStep("done");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Import failed.");
        setStep("preview");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
      <div className="bg-paper border border-border rounded-xl p-6 w-full max-w-2xl shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-ink">Import syllabus</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">&times;</button>
        </div>

        {/* Input step */}
        {(step === "input" || step === "previewing") && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <p className="text-sm text-ink-muted">
              Upload a PDF or paste syllabus text. Claude will detect subjects, units, topics, and semester name automatically.
            </p>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Upload PDF</label>
              {pdfFile ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-700">✓ {pdfFile.name}</span>
                  <button type="button" onClick={() => setPdfFile(null)} className="text-xs text-red-500 hover:underline">Remove</button>
                </div>
              ) : (
                <input
                  type="file"
                  accept=".pdf"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) { setPdfFile(f); setRawText(""); } }}
                  className="text-sm text-ink-muted file:mr-3 file:px-3 file:py-1.5 file:border file:border-border file:rounded-lg file:text-sm file:text-ink file:bg-white hover:file:bg-accent-light file:cursor-pointer"
                />
              )}
            </div>

            {!pdfFile && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Or paste syllabus text</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Semester IV — BCSIT&#10;&#10;Subject: Digital Systems (CMP 174)&#10;Unit 1: Number Systems..."
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">Cancel</button>
              <button
                onClick={handlePreview}
                disabled={isPending}
                className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg disabled:opacity-50"
              >
                {isPending ? "Parsing…" : "Preview →"}
              </button>
            </div>
          </div>
        )}

        {/* Preview step */}
        {(step === "preview" || step === "importing") && syllabus && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Semester selection */}
            <div className="bg-white border border-border rounded-xl p-4 space-y-3">
              <p className="text-sm font-medium text-ink">Target semester</p>

              <div className="flex gap-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="radio" checked={semesterMode === "new"} onChange={() => setSemesterMode("new")} className="accent-accent" />
                  <span className="text-sm text-ink">Create new</span>
                </label>
                {existingSemesters.length > 0 && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" checked={semesterMode === "existing"} onChange={() => setSemesterMode("existing")} className="accent-accent" />
                    <span className="text-sm text-ink">Add to existing</span>
                  </label>
                )}
              </div>

              {semesterMode === "new" && (
                <input
                  type="text"
                  value={semesterName}
                  onChange={(e) => setSemesterName(e.target.value)}
                  placeholder="e.g. Semester IV"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                />
              )}

              {semesterMode === "existing" && (
                <select
                  value={selectedSemesterId}
                  onChange={(e) => setSelectedSemesterId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                >
                  {existingSemesters.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              )}
            </div>

            {/* Subject list */}
            <p className="text-sm text-ink-muted">Remove subjects or units you don&apos;t need:</p>

            <div className="space-y-3">
              {syllabus.subjects.map((subject, si) => {
                const isDeleted = deletedSubjects.has(si);
                return (
                  <div key={si} className={`border rounded-xl p-3 transition-opacity ${isDeleted ? "opacity-40 border-border" : "border-border bg-white"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0">
                        {subject.code && <span className="text-xs font-mono text-accent">{subject.code}</span>}
                        <span className={`${subject.code ? "ml-2" : ""} text-sm font-semibold text-ink`}>{subject.name}</span>
                        {subject.credits && <span className="ml-2 text-xs text-ink-muted">{subject.credits} cr</span>}
                      </div>
                      {!isDeleted ? (
                        <button onClick={() => deleteSubject(si)} className="text-xs text-red-500 hover:underline shrink-0">Remove</button>
                      ) : (
                        <button onClick={() => setDeletedSubjects((p) => { const n = new Set(p); n.delete(si); return n; })} className="text-xs text-ink-muted hover:underline shrink-0">Restore</button>
                      )}
                    </div>

                    {!isDeleted && (
                      <div className="space-y-1 pl-2 border-l border-border">
                        {subject.units.map((unit, ui) => {
                          const isUnitDeleted = deletedUnits.get(si)?.has(ui) ?? false;
                          return (
                            <div key={ui} className={`flex items-center justify-between gap-2 py-0.5 ${isUnitDeleted ? "opacity-40" : ""}`}>
                              <span className="text-sm text-ink truncate">
                                <span className="text-ink-muted text-xs">Unit {unit.number}:</span> {unit.name}
                                <span className="ml-1 text-xs text-ink-muted">({unit.topics.length} topics)</span>
                              </span>
                              {!isUnitDeleted ? (
                                <button onClick={() => deleteUnit(si, ui)} className="text-xs text-red-400 hover:underline shrink-0 ml-2">×</button>
                              ) : (
                                <button
                                  onClick={() => setDeletedUnits((p) => { const n = new Map(p); const s = new Set(n.get(si)); s.delete(ui); n.set(si, s); return n; })}
                                  className="text-xs text-ink-muted hover:underline shrink-0 ml-2"
                                >↩</button>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={() => setStep("input")} disabled={isPending} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">Back</button>
              <button
                onClick={handleConfirm}
                disabled={isPending}
                className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg disabled:opacity-50"
              >
                {isPending ? "Importing…" : `Import ${getFilteredSyllabus().subjects.length} subject(s)`}
              </button>
            </div>
          </div>
        )}

        {/* Done */}
        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8 text-center">
            <div className="text-5xl">✓</div>
            <p className="text-base font-semibold text-ink">Syllabus imported!</p>
            <p className="text-sm text-ink-muted">Your semester and subjects have been created.</p>
            <div className="flex gap-3">
              <button onClick={onClose} className="px-5 py-2 text-sm border border-border text-ink-muted hover:text-ink rounded-lg">Close</button>
              {importedSemesterId && (
                <button
                  onClick={() => { onClose(); router.push(`/semester/${importedSemesterId}`); }}
                  className="px-5 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg"
                >
                  View semester →
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
