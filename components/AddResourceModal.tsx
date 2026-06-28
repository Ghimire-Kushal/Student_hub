"use client";

import { useState } from "react";
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
  const [fileUrl, setFileUrl] = useState("");
  const [fileName, setFileName] = useState("");
  const [type, setType] = useState<ResourceType>(defaultType);

  async function action(fd: FormData) {
    fd.set("imageUrl", imageUrl);
    fd.set("fileUrl", fileUrl);
    fd.set("fileName", fileName);
    fd.set("type", type);
    await createResource(unitId, fd);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/30">
      <div className="bg-paper border border-border rounded-xl p-6 w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-ink mb-4">Add resource</h2>

        <form action={action} className="space-y-4">
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
          </div>

          {/* Image upload */}
          <div>
            <label className="block text-sm font-medium text-ink mb-2">Image (optional)</label>
            {imageUrl ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-green-700">✓ Image uploaded</span>
                <button type="button" onClick={() => setImageUrl("")} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "imageUploader">
                endpoint="imageUploader"
                onClientUploadComplete={(res) => {
                  if (res?.[0]) setImageUrl(res[0].ufsUrl ?? res[0].url);
                }}
                onUploadError={(err) => alert(`Upload error: ${err.message}`)}
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
                <button type="button" onClick={() => { setFileUrl(""); setFileName(""); }} className="text-xs text-red-500 hover:underline">Remove</button>
              </div>
            ) : (
              <UploadButton<OurFileRouter, "fileUploader">
                endpoint="fileUploader"
                onClientUploadComplete={(res) => {
                  if (res?.[0]) {
                    setFileUrl(res[0].ufsUrl ?? res[0].url);
                    setFileName(res[0].name);
                  }
                }}
                onUploadError={(err) => alert(`Upload error: ${err.message}`)}
                appearance={{
                  button: "bg-accent text-white text-sm rounded-lg px-3 py-2 hover:bg-accent/90",
                  allowedContent: "text-xs text-ink-muted",
                }}
              />
            )}
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-ink-muted hover:text-ink border border-border rounded-lg">
              Cancel
            </button>
            <button type="submit" className="px-4 py-2 text-sm text-white bg-accent hover:bg-accent/90 rounded-lg">
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
