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

  const filtered = resources.filter((r) => r.type === tab);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t) => {
          const count = resources.filter((r) => r.type === t.type).length;
          return (
            <button
              key={t.type}
              onClick={() => setTab(t.type)}
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

      {/* Resources */}
      <div className="space-y-4">
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
