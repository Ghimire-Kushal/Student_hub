"use client";

import { useState, useTransition } from "react";
import { previewSyllabus, previewSyllabusFromPdf, confirmImport } from "./import-actions";
import type { ParsedSyllabus, ParsedSubject, ParsedUnit } from "@/lib/syllabus-import";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

type Step = "input" | "previewing" | "preview" | "importing" | "done";

interface Props {
  semesterId: string;
  onClose: () => void;
}

export function ImportSyllabus({ semesterId, onClose }: Props) {
  const [step, setStep] = useState<Step>("input");
  const [rawText, setRawText] = useState("");
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string | null>(null);
  const [syllabus, setSyllabus] = useState<ParsedSyllabus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Per-subject deletion state
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
    if (!syllabus) return { subjects: [] };
    const subjects: ParsedSubject[] = [];
    syllabus.subjects.forEach((s, si) => {
      if (deletedSubjects.has(si)) return;
      const deletedU = deletedUnits.get(si) ?? new Set();
      const units: ParsedUnit[] = s.units.filter((_, ui) => !deletedU.has(ui));
      subjects.push({ ...s, units });
    });
    return { subjects };
  }

  function handlePreview() {
    setError(null);
    setStep("previewing");
    startTransition(async () => {
      try {
        let result: ParsedSyllabus;
        if (pdfUrl) {
          result = await previewSyllabusFromPdf(semesterId, pdfUrl);
        } else {
          if (!rawText.trim()) {
            setError("Paste syllabus text or upload a PDF.");
            setStep("input");
            return;
          }
          result = await previewSyllabus(semesterId, rawText);
        }
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
              Paste your syllabus text below, or upload a PDF. Claude will extract subjects, units, and topics.
            </p>

            {/* PDF upload */}
            <div>
              <label className="block text-sm font-medium text-ink mb-2">Upload PDF (optional)</label>
              {pdfUrl ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-green-700">✓ {pdfName}</span>
                  <button
                    type="button"
                    onClick={() => { setPdfUrl(null); setPdfName(null); }}
                    className="text-xs text-red-500 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <UploadButton<OurFileRouter, "fileUploader">
                  endpoint="fileUploader"
                  onClientUploadComplete={(res: { ufsUrl?: string; url: string; name: string }[]) => {
                    if (res?.[0]) {
                      setPdfUrl(res[0].ufsUrl ?? res[0].url);
                      setPdfName(res[0].name);
                      setRawText("");
                    }
                  }}
                  onUploadError={(err: Error) => setError(`Upload error: ${err.message}`)}
                  appearance={{
                    button: "bg-accent text-white text-sm rounded-lg px-3 py-2 hover:bg-accent/90",
                    allowedContent: "text-xs text-ink-muted",
                  }}
                />
              )}
            </div>

            {!pdfUrl && (
              <div>
                <label className="block text-sm font-medium text-ink mb-1">Or paste syllabus text</label>
                <textarea
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  rows={10}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  placeholder="Unit 1: Introduction&#10;  - Topic A&#10;  - Topic B&#10;Unit 2: ..."
                />
              </div>
            )}

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-3 justify-end pt-2">
              <button onClick={onClose} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">
                Cancel
              </button>
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
            <p className="text-sm text-ink-muted">
              Review the parsed structure. Delete anything you don't need, then confirm.
            </p>

            <div className="space-y-3">
              {syllabus.subjects.map((subject, si) => {
                const isDeleted = deletedSubjects.has(si);
                return (
                  <div
                    key={si}
                    className={`border rounded-lg p-3 transition-opacity ${isDeleted ? "opacity-40" : "border-border"}`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <span className="text-xs font-mono text-accent">{subject.code}</span>
                        <span className="ml-2 text-sm font-semibold text-ink">{subject.name}</span>
                      </div>
                      {!isDeleted ? (
                        <button
                          onClick={() => deleteSubject(si)}
                          className="text-xs text-red-500 hover:underline shrink-0"
                        >
                          Remove subject
                        </button>
                      ) : (
                        <button
                          onClick={() => setDeletedSubjects((p) => { const n = new Set(p); n.delete(si); return n; })}
                          className="text-xs text-ink-muted hover:underline shrink-0"
                        >
                          Restore
                        </button>
                      )}
                    </div>

                    {!isDeleted && (
                      <div className="space-y-1.5 pl-2">
                        {subject.units.map((unit, ui) => {
                          const isUnitDeleted = deletedUnits.get(si)?.has(ui) ?? false;
                          return (
                            <div key={ui} className={`flex items-start justify-between gap-2 transition-opacity ${isUnitDeleted ? "opacity-40" : ""}`}>
                              <div>
                                <span className="text-xs text-ink-muted">Unit {unit.number}:</span>
                                <span className="ml-1 text-sm text-ink">{unit.name}</span>
                                <span className="ml-2 text-xs text-ink-muted">({unit.topics.length} topics)</span>
                              </div>
                              {!isUnitDeleted ? (
                                <button
                                  onClick={() => deleteUnit(si, ui)}
                                  className="text-xs text-red-400 hover:underline shrink-0"
                                >
                                  ×
                                </button>
                              ) : (
                                <button
                                  onClick={() => setDeletedUnits((p) => {
                                    const n = new Map(p);
                                    const s = new Set(n.get(si));
                                    s.delete(ui);
                                    n.set(si, s);
                                    return n;
                                  })}
                                  className="text-xs text-ink-muted hover:underline shrink-0"
                                >
                                  Restore
                                </button>
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
              <button
                onClick={() => setStep("input")}
                disabled={isPending}
                className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg"
              >
                Back
              </button>
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

        {/* Step: done */}
        {step === "done" && (
          <div className="flex-1 flex flex-col items-center justify-center gap-4 py-8">
            <div className="text-4xl">✓</div>
            <p className="text-base font-medium text-ink">Syllabus imported!</p>
            <p className="text-sm text-ink-muted text-center">
              Subjects, units, and topics have been added to this semester.
            </p>
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg"
            >
              Done
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
