"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { ResourceType } from "@prisma/client";
import { deleteResource } from "@/app/actions/resource";
import { ConfirmDialog } from "./ConfirmDialog";

interface Resource {
  id: string;
  type: ResourceType;
  title: string;
  body: string | null;
  imageUrl: string | null;
  fileUrl: string | null;
  fileName: string | null;
}

export function ResourceCard({ resource, unitId }: { resource: Resource; unitId: string }) {
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <>
      <div className="bg-white border border-border rounded-xl overflow-hidden">
        <div className="flex items-start gap-3 px-4 py-3">
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex-1 text-left min-w-0"
          >
            <h3 className="font-medium text-ink truncate">{resource.title}</h3>
            {!expanded && resource.body && (
              <p className="text-xs text-ink-muted mt-0.5 line-clamp-1">{resource.body}</p>
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
            {resource.body && (
              <p className="text-sm text-ink whitespace-pre-wrap">{resource.body}</p>
            )}
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
