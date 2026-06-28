"use client";

import { useState, useTransition } from "react";
import { previewSyllabus, confirmImport } from "./import-actions";
import type { ParsedSyllabus, ParsedSubject, ParsedUnit } from "@/lib/syllabus-import";

type Step = "input" | "previewing" | "preview" | "importing" | "done";

interface Props {
  semesterId: string;
  onClose: () => void;
}

export function ImportSyllabus({ semesterId, onClose }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [syllabus, setSyllabus] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [deletedSubjects, setDeletedSubjects] = useState<Set<number>>(new Set());
  const [deletedUnits, setDeletedUnits] = useState<Map<number, Set<number>>>(new Map());

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
          const json = await res.json();
          if (!res.ok) throw new Error(json.error ?? "PDF extraction failed");
          text = json.text as string;
        }

        if (!text.trim()) {
          setError("Paste syllabus text or upload a PDF.");
          setStep("input");
          return;
        }

        const result = await previewSyllabus(semesterId, text);
        setSyllabus(result);
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
      setError("Nothing left to import — restore at least one subject.");
      return;
    }
    setError(null);
    setStep("importing");
    startTransition(async () => {
      try {
        await confirmImport(semesterId, filtered);
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
          <h2 className="text-lg font-semibold text-ink">Import from syllabus</h2>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">&times;</button>
        </div>

        {/* Step: input */}
        {(step === "input" || step === "previewing") && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <p className="text-sm text-ink-muted">
              Paste your syllabus text, or upload a PDF. Claude will extract subjects, units, and topics.
            </p>

            <div>
              <label className="block text-sm font-medium text-ink mb-1">Upload PDF (optional)</label>
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
                  className="text-sm text-ink-muted"
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
                  placeholder="Unit 1: Introduction&#10;  - Topic A&#10;  - Topic B"
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
                {isPending ? "Parsing…" : "Preview import"}
              </button>
            </div>
          </div>
        )}

        {/* Step: preview */}
        {(step === "preview" || step === "importing") && syllabus && (
          <div className="flex-1 overflow-y-auto space-y-4">
            <p className="text-sm text-ink-muted">Review the parsed structure. Delete anything you don&apos;t need, then confirm.</p>

            <div className="space-y-3">
              {syllabus.subjects.map((subject, si) => {
                const isDeleted = deletedSubjects.has(si);
                return (
                  <div key={si} className={`border rounded-lg p-3 transition-opacity ${isDeleted ? "opacity-40" : "border-border"}`}>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
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
                      <div className="space-y-1 pl-2">
                        {subject.units.map((unit, ui) => {
                          const isUnitDeleted = deletedUnits.get(si)?.has(ui) ?? false;
                          return (
                            <div key={ui} className={`flex items-center justify-between gap-2 ${isUnitDeleted ? "opacity-40" : ""}`}>
                              <span className="text-sm text-ink">
                                <span className="text-ink-muted">Unit {unit.number}:</span> {unit.name}
                                <span className="ml-1 text-xs text-ink-muted">({unit.topics.length})</span>
                              </span>
                              {!isUnitDeleted ? (
                                <button onClick={() => deleteUnit(si, ui)} className="text-xs text-red-400 hover:underline shrink-0">×</button>
                              ) : (
                                <button onClick={() => setDeletedUnits((p) => { const n = new Map(p); const s = new Set(n.get(si)); s.delete(ui); n.set(si, s); return n; })} className="text-xs text-ink-muted hover:underline shrink-0">↩</button>
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

        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="text-4xl">✓</div>
            <p className="text-base font-medium text-ink">Syllabus imported!</p>
            <button onClick={onClose} className="px-5 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}
