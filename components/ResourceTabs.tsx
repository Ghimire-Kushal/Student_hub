"use client";

import { useState } from "react";
import { ResourceType } from "@prisma/client";
import { ResourceCard } from "./ResourceCard";
import { AddResourceModal } from "./AddResourceModal";

interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
  tags: string[];
}

const TABS: { type: ResourceType; label: string }[] = [
  { type: "NOTES", label: "Notes" },
  { type: "PAST_PAPERS", label: "Past Papers" },
  { type: "PAST_QUESTIONS", label: "Past Questions" },
  { type: "KEY_NOTES", label: "Key Notes" },
];

export function ResourceTabs({ unitId, resources }: { unitId: string; resources: Resource[] }) {
  const [tab, setTab] = useState<ResourceType>("NOTES");
  const [adding, setAdding] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const byTab = resources.filter((r) => r.type === tab);

  // Collect all tags for the current tab (only relevant for PAST_QUESTIONS)
  const allTags = tab === "PAST_QUESTIONS"
    ? [...new Set(byTab.flatMap((r) => r.tags))].sort()
    : [];

  const filtered = activeTag
    ? byTab.filter((r) => r.tags.includes(activeTag))
    : byTab;

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const count = resources.filter((r) => r.type === t.type).length;
          return (
            <button
              key={t.type}
              onClick={() => { setTab(t.type); setActiveTag(null); }}
              className={`px-4 py-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex items-center gap-1.5 ${tab === t.type ? "border-accent text-accent" : "border-transparent text-ink-muted hover:text-ink"}`}
            >
              {t.label}
              {count > 0 && (
                <span className="text-xs bg-accent-light text-accent rounded-full px-1.5 py-0.5 leading-none">{count}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Tag filter chips — only shown on Past Questions tab when tags exist */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          <button
            onClick={() => setActiveTag(null)}
            className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${!activeTag ? "bg-accent text-white border-accent" : "border-border text-ink-muted hover:border-accent hover:text-accent"}`}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${activeTag === tag ? "bg-accent text-white border-accent" : "border-border text-ink-muted hover:border-accent hover:text-accent"}`}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      {/* Resources */}
      <div className="space-y-4">
        {filtered.length === 0 && activeTag && (
          <p className="text-sm text-ink-muted text-center py-4">No questions tagged &ldquo;{activeTag}&rdquo;</p>
        )}
        {filtered.map((r) => (
          <ResourceCard key={r.id} resource={r} unitId={unitId} />
        ))}

        <button
          onClick={() => setAdding(true)}
          className="w-full py-3 border-2 border-dashed border-border rounded-xl text-sm text-ink-muted hover:border-accent hover:text-accent transition-colors"
        >
          + Add {TABS.find((t) => t.type === tab)?.label.toLowerCase()}
        </button>
      </div>

      {adding && (
        <AddResourceModal
          unitId={unitId}
          defaultType={tab}
          onClose={() => setAdding(false)}
        />
      )}
    </div>
  );
}
