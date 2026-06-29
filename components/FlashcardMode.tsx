"use client";

import { useState, useCallback, useEffect, useRef, useTransition } from "react";
import { MarkdownMath } from "./MarkdownMath";
import { logStudySession } from "@/app/actions/study-session";

interface Question {
  id: string;
  title: string;
  body: string | null;
}

interface Props {
  questions: Question[];
  onClose: () => void;
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function FlashcardMode({ questions, onClose }: Props) {
  const [deck] = useState(() => shuffle(questions));
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [results, setResults] = useState<Record<string, "knew" | "review">>({});
  const [done, setDone] = useState(false);
  const [loggedMin, setLoggedMin] = useState<number | null>(null);
  const startTime = useRef(Date.now());
  const [, startTransition] = useTransition();

  const current = deck[index];

  const answer = useCallback((verdict: "knew" | "review") => {
    setResults((prev) => {
      const next = { ...prev, [current.id]: verdict };
      if (index + 1 >= deck.length) {
        const elapsed = Math.max(1, Math.round((Date.now() - startTime.current) / 60000));
        setLoggedMin(elapsed);
        startTransition(() => logStudySession(elapsed));
        setDone(true);
      } else {
        setIndex((i) => i + 1);
        setFlipped(false);
      }
      return next;
    });
  }, [current?.id, index, deck.length]);

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { onClose(); return; }
      if (done) return;
      if (e.key === " " || e.key === "Enter") { if (!flipped) setFlipped(true); e.preventDefault(); return; }
      if (flipped) {
        if (e.key === "ArrowLeft" || e.key === "r") answer("review");
        if (e.key === "ArrowRight" || e.key === "k") answer("knew");
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [done, flipped, answer, onClose]);

  const knewCount = Object.values(results).filter((v) => v === "knew").length;
  const reviewList = deck.filter((q) => results[q.id] === "review");

  if (done) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Flashcard session complete" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
        <div className="bg-paper border border-border rounded-xl p-8 w-full max-w-lg shadow-xl text-center">
          <div className="text-4xl mb-3">{knewCount === deck.length ? "🎉" : "📚"}</div>
          <h2 className="text-xl font-semibold text-ink mb-1">Session complete</h2>
          <p className="text-ink-muted text-sm mb-1">
            {knewCount} / {deck.length} knew it
          </p>
          {loggedMin !== null && (
            <p className="text-xs text-accent mb-6">✓ Logged {loggedMin} min to your study log</p>
          )}

          {reviewList.length > 0 && (
            <div className="text-left mb-6">
              <p className="text-sm font-medium text-ink mb-2">Review these again:</p>
              <ul className="space-y-1.5">
                {reviewList.map((q) => (
                  <li key={q.id} className="text-sm bg-white border border-border rounded-lg px-3 py-2 text-ink">
                    {q.title}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex gap-3 justify-center">
            <button
              onClick={onClose}
              className="px-5 py-2 text-sm border border-border text-ink-muted hover:text-ink rounded-lg"
            >
              Close
            </button>
            <button
              onClick={() => {
                setIndex(0); setFlipped(false); setResults({}); setDone(false);
                setLoggedMin(null); startTime.current = Date.now();
              }}
              className="px-5 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg"
            >
              Practice again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="dialog" aria-modal="true" aria-label="Flashcard practice" className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
      <div className="bg-paper border border-border rounded-xl w-full max-w-lg shadow-xl flex flex-col" style={{ minHeight: 420 }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-sm text-ink-muted">{index + 1} / {deck.length}</span>
          <div className="flex-1 mx-4 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${(index / deck.length) * 100}%` }}
            />
          </div>
          <button onClick={onClose} aria-label="Close flashcard session" className="text-ink-muted hover:text-ink text-xl leading-none">&times;</button>
        </div>

        {/* Card */}
        <div
          className="flex-1 flex flex-col items-center justify-center px-6 py-8 cursor-pointer select-none"
          onClick={() => !flipped && setFlipped(true)}
        >
          {!flipped ? (
            <div className="text-center">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-4">Question</p>
              <h2 className="text-lg font-semibold text-ink leading-snug">{current.title}</h2>
              <p className="text-sm text-ink-muted mt-6">Tap or press Space to reveal answer</p>
            </div>
          ) : (
            <div className="w-full">
              <p className="text-xs font-medium uppercase tracking-wide text-ink-muted mb-3">Answer</p>
              <h3 className="font-semibold text-ink mb-3">{current.title}</h3>
              {current.body ? (
                <MarkdownMath>{current.body}</MarkdownMath>
              ) : (
                <p className="text-sm text-ink-muted italic">No answer text added.</p>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="border-t border-border px-5 py-4 flex gap-3">
          {!flipped ? (
            <button
              onClick={() => setFlipped(true)}
              className="flex-1 py-2.5 text-sm font-medium text-white bg-accent hover:bg-accent/90 rounded-lg transition-colors"
            >
              Show answer
            </button>
          ) : (
            <>
              <button
                onClick={() => answer("review")}
                className="flex-1 py-2.5 text-sm font-medium border border-red-200 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                Review <span className="hidden sm:inline text-xs opacity-60">(← / R)</span>
              </button>
              <button
                onClick={() => answer("knew")}
                className="flex-1 py-2.5 text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50 rounded-lg transition-colors"
              >
                Knew it ✓ <span className="hidden sm:inline text-xs opacity-60">(→ / K)</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
