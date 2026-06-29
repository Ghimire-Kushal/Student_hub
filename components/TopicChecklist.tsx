"use client";

import { useState, useTransition } from "react";
import { createTopic, toggleTopic, deleteTopic } from "@/app/actions/topic";

interface Topic {
  id: string;
  text: string;
  done: boolean;
}

export function TopicChecklist({ unitId, topics }: { unitId: string; topics: Topic[] }) {
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-2">
      {topics.map((t) => (
        <div key={t.id} className={`flex items-center gap-3 group bg-white border border-border rounded-lg px-3 py-2.5 ${t.done ? "opacity-60" : ""}`}>
          <button
            onClick={() => startTransition(() => toggleTopic(t.id, unitId, !t.done))}
            className={`w-5 h-5 rounded border flex-shrink-0 flex items-center justify-center transition-colors ${t.done ? "bg-accent border-accent text-white" : "border-border hover:border-accent"}`}
          >
            {t.done && <span className="text-xs">✓</span>}
          </button>
          <span className={`flex-1 text-sm text-ink ${t.done ? "line-through" : ""}`}>{t.text}</span>
          <button
            onClick={() => startTransition(() => deleteTopic(t.id, unitId))}
            aria-label={`Delete topic "${t.text}"`}
            className="text-ink-muted hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-lg leading-none"
          >
            ×
          </button>
        </div>
      ))}

      {adding ? (
        <form
          action={async (fd) => {
            await createTopic(unitId, fd);
            setAdding(false);
          }}
          className="flex items-center gap-3 bg-white border border-accent/40 rounded-lg px-3 py-2.5"
        >
          <div className="w-5 h-5 rounded border border-border flex-shrink-0" />
          <input
            name="text"
            required
            autoFocus
            placeholder="Add topic…"
            className="flex-1 text-sm text-ink bg-transparent outline-none placeholder:text-ink-muted"
          />
          <button type="submit" className="text-sm text-accent font-medium hover:underline">Add</button>
          <button type="button" onClick={() => setAdding(false)} className="text-sm text-ink-muted hover:text-ink">Cancel</button>
        </form>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="w-full py-2.5 border-2 border-dashed border-border rounded-lg text-sm text-ink-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add topic
        </button>
      )}
    </div>
  );
}
