"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ResourceType } from "@prisma/client";
import { deleteResource } from "@/app/actions/resource";
import { addTag, removeTag } from "@/app/actions/resource-tags";
import { ConfirmDialog } from "./ConfirmDialog";
import { MarkdownMath } from "./MarkdownMath";

const PRESET_TAGS = ["5-marks", "10-marks", "numerical", "frequently-asked", "definition"];

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

export function ResourceCard({ resource, unitId }: { resource: Resource; unitId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [, startTransition] = useTransition();

  const isQuestion = resource.type === "PAST_QUESTIONS";

  function handleAddTag(tag: string) {
    const t = tag.trim();
    if (!t) return;
    setTagInput("");
    startTransition(() => addTag(resource.id, unitId, t));
  }

  return (
    <>
      <div className="bg-white dark:bg-[#231F1B] border border-border rounded-xl overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left min-w-0"
          >
            <h3 className="font-medium text-ink truncate">{resource.title}</h3>
            {!expanded && resource.body && (
              <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{resource.body}</p>
            )}
            {/* Tag chips preview when collapsed */}
            {!expanded && resource.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1">
                {resource.tags.map((t) => (
                  <span key={t} className="text-xs px-1.5 py-0.5 bg-accent-light text-accent rounded-full">{t}</span>
                ))}
              </div>
            )}
          </button>
          <button
            onClick={() => setDeleting(true)}
            className="text-ink-muted hover:text-red-500 transition-colors text-xl leading-none flex-shrink-0"
          >
            ×
          </button>
        </div>

        {expanded && (
          <div className="px-4 pb-4 space-y-3 border-t border-border pt-3">
            {resource.body && <MarkdownMath>{resource.body}</MarkdownMath>}
            {resource.imageUrl && (
              <div className="rounded-lg overflow-hidden border border-border">
                <Image
                  src={resource.imageUrl}
                  alt={resource.title}
                  width={800}
                  height={450}
                  className="w-full h-auto object-cover"
                />
              </div>
            )}
            {resource.fileUrl && (
              <a
                href={resource.fileUrl}
                download={resource.fileName ?? true}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-ink hover:bg-accent-light hover:border-accent transition-colors"
              >
                <span>📎</span>
                <span className="truncate max-w-xs">{resource.fileName ?? "Download file"}</span>
              </a>
            )}

            {/* Tags section for questions */}
            {isQuestion && (
              <div className="pt-1">
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {resource.tags.map((t) => (
                    <span key={t} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-accent-light text-accent rounded-full">
                      {t}
                      <button
                        onClick={() => startTransition(() => removeTag(resource.id, unitId, t))}
                        className="hover:text-red-500 leading-none"
                        aria-label={`Remove tag ${t}`}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Preset quick-add chips */}
                <div className="flex flex-wrap gap-1 mb-2">
                  {PRESET_TAGS.filter((p) => !resource.tags.includes(p)).map((p) => (
                    <button
                      key={p}
                      onClick={() => startTransition(() => addTag(resource.id, unitId, p))}
                      className="text-xs px-2 py-0.5 border border-dashed border-border text-ink-muted rounded-full hover:border-accent hover:text-accent transition-colors"
                    >
                      + {p}
                    </button>
                  ))}
                </div>

                {/* Custom tag input */}
                <form
                  onSubmit={(e) => { e.preventDefault(); handleAddTag(tagInput); }}
                  className="flex gap-2"
                >
                  <input
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    placeholder="Custom tag…"
                    className="flex-1 text-xs px-2 py-1 border border-border rounded-lg bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                  <button
                    type="submit"
                    className="text-xs px-2 py-1 bg-accent text-white rounded-lg hover:bg-accent/90"
                  >
                    Add
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={deleting}
        title="Delete resource?"
        description={`Delete "${resource.title}"?`}
        onConfirm={() => {
          startTransition(() => deleteResource(resource.id, unitId));
          setDeleting(false);
        }}
        onCancel={() => setDeleting(false)}
      />
    </>
  );
}
