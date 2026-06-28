"use client";

import { useState } from "react";
import { FlashcardMode } from "./FlashcardMode";

interface Question {
  id: string;
  title: string;
  body: string | null;
}

interface Props {
  questions: Question[];
}

export function PracticeButton({ questions }: Props) {
  const [open, setOpen] = useState(false);

  if (questions.length === 0) return null;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-ink-muted hover:text-ink hover:border-ink rounded-lg transition-colors"
        title="Practice past questions as flashcards"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        Practice questions ({questions.length})
      </button>

      {open && <FlashcardMode questions={questions} onClose={() => setOpen(false)} />}
    </>
  );
}
