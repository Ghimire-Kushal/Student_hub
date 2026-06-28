"use client";

import { useState, useCallback } from "react";
import { MarkdownMath } from "./MarkdownMath";

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

  const current = deck[index];

  const answer = useCallback((verdict: "knew" | "review") => {
    setResults((prev) => ({ ...prev, [current.id]: verdict }));
    if (index + 1 >= deck.length) {
      setDone(true);
    } else {
      setIndex((i) => i + 1);
      setFlipped(false);
    }
  }, [current?.id, index, deck.length]);

  const knewCount = Object.values(results).filter((v) => v === "knew").length;
  const reviewList = deck.filter((q) => results[q.id] === "review");

  if (done) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
        <div className="bg-paper border border-border rounded-xl p-8 w-full max-w-lg shadow-xl text-center">
          <div className="text-4xl mb-3">{knewCount === deck.length ? "🎉" : "📚"}</div>
          <h2 className="text-xl font-semibold text-ink mb-1">Session complete</h2>
          <p className="text-ink-muted text-sm mb-6">
            {knewCount} / {deck.length} knew it
          </p>

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
              onClick={() => { setIndex(0); setFlipped(false); setResults({}); setDone(false); }}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
      <div className="bg-paper border border-border rounded-xl w-full max-w-lg shadow-xl flex flex-col" style={{ minHeight: 420 }}>
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border">
          <span className="text-sm text-ink-muted">{index + 1} / {deck.length}</span>
          <div className="flex-1 mx-4 h-1.5 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all"
              style={{ width: `${((index) / deck.length) * 100}%` }}
            />
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink text-xl leading-none">&times;</button>
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
              <p className="text-sm text-ink-muted mt-6">Tap to reveal answer</p>
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
                Review
              </button>
              <button
                onClick={() => answer("knew")}
                className="flex-1 py-2.5 text-sm font-medium border border-green-200 text-green-700 hover:bg-green-50 rounded-lg transition-colors"
              >
                Knew it ✓
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
