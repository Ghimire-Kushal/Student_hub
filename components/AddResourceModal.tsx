"use client";

import { useState, useTransition } from "react";
import { ResourceType } from "@prisma/client";
import { createResource } from "@/app/actions/resource";
import { UploadButton } from "@uploadthing/react";
import type { OurFileRouter } from "@/lib/uploadthing";

const TYPE_LABELS: Record<ResourceType, string> = {
  NOTES: "Notes",
  PAST_PAPERS: "Past Papers",
  PAST_QUESTIONS: "Past Questions",
  KEY_NOTES: "Key Notes",
};

interface Props {
  unitId: string;
  defaultType: ResourceType;
  onClose: () => void;
}

export function AddResourceModal({ unitId, defaultType, onClose }: Props) {
  const [imageUrl, setImageUrl] = useState("");
  const [imageKey, setImageKey] = useState("");
  const [fileUrl, setFileUrl] = useState("");
  const [fileKey, setFileKey] = useState("");
  const [fileName, setFileName] = useState("");
  const [type, setType] = useState<ResourceType>(defaultType);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(fd: FormData) {
    const title = fd.get("title");
    if (typeof title !== "string" || !title.trim()) {
      setError("Title is required.");
      return;
    }
    fd.set("imageUrl", imageUrl);
    fd.set("imageKey", imageKey);
    fd.set("fileUrl", fileUrl);
    fd.set("fileKey", fileKey);
    fd.set("fileName", fileName);
    fd.set("type", type);
    setError(null);
    startTransition(async () => {
      try {
        await createResource(unitId, fd);
        onClose();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to save resource.");
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
      <div className="bg-paper border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-ink mb-4">Add resource</h2>

        <form action={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-ink mb-1">Type</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
              name="type"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
            >
              {(Object.keys(TYPE_LABELS) as ResourceType[]).map((t) => (
                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Title</label>
            <input
              name="title"
              required
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent"
              placeholder="e.g. Lecture notes week 3"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1">Body text</label>
            <textarea
              name="body"
              rows={4}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-white text-ink focus:outline-none focus:ring-2 focus:ring-accent resize-none"
              placeholder="Notes, summary, or question text…"
            />
            <p className="text-xs text-ink-muted mt-1">
              Markdown + math supported — inline <code className="font-mono">$...$</code> and block <code className="font-mono">$$...$$</code>
            </p>
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Image (optional)</label>
            {imageUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-700">✓ Image uploaded</span>
                <button type="button" onClick={() => { setImageUrl(""); setImageKey(""); }} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "imageUploader">
                endpoint="imageUploader"
                onClientUploadComplete={(res: { ufsUrl?: string; url: string; key?: string }[]) => {
                  if (res?.[0]) {
                    setImageUrl(res[0].ufsUrl ?? res[0].url);
                    setImageKey(res[0].key ?? "");
                  }
                }}
                onUploadError={(err: Error) => setError(`Image upload failed: ${err.message}`)}
                appearance={{
                  button: "bg-accent text-white text-sm rounded-lg px-3 py-2 hover:bg-accent/90",
                  allowedContent: "text-xs text-ink-muted",
                }}
              />
            )}
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">File — PDF / PPT / DOC (optional)</label>
            {fileUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-700">✓ {fileName}</span>
                <button type="button" onClick={() => { setFileUrl(""); setFileKey(""); setFileName(""); }} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "fileUploader">
                endpoint="fileUploader"
                onClientUploadComplete={(res: { ufsUrl?: string; url: string; name: string; key?: string }[]) => {
                  if (res?.[0]) {
                    setFileUrl(res[0].ufsUrl ?? res[0].url);
                    setFileKey(res[0].key ?? "");
                    setFileName(res[0].name);
                  }
                }}
                onUploadError={(err: Error) => setError(`File upload failed: ${err.message}`)}
                appearance={{
                  button: "bg-accent text-white text-sm rounded-lg px-3 py-2 hover:bg-accent/90",
                  allowedContent: "text-xs text-ink-muted",
                }}
              />
            )}
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg disabled:opacity-50"
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
