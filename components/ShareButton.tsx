"use client";

import { useState, useTransition } from "react";
import { generateShareToken, revokeShareToken } from "@/app/actions/share";

interface Props {
  courseId: string;
  shareToken: string | null;
}

export function ShareButton({ courseId, shareToken }: Props) {
  const [token, setToken] = useState(shareToken);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  const shareUrl = token
    ? `${typeof window !== "undefined" ? window.location.origin : ""}/share/${token}`
    : null;

  function handleGenerate() {
    startTransition(async () => {
      const t = await generateShareToken(courseId);
      setToken(t);
    });
  }

  function handleRevoke() {
    startTransition(async () => {
      await revokeShareToken(courseId);
      setToken(null);
      setCopied(false);
    });
  }

  function handleCopy() {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (!token) {
    return (
      <button
        onClick={handleGenerate}
        disabled={isPending}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-ink-muted hover:text-ink hover:border-ink rounded-lg transition-colors disabled:opacity-50"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
        {isPending ? "Generating…" : "Share"}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-green-200 text-green-700 rounded-lg hover:bg-green-50 transition-colors"
      >
        {copied ? "✓ Copied!" : "Copy link"}
      </button>
      <button
        onClick={handleRevoke}
        disabled={isPending}
        className="text-xs text-red-500 hover:underline disabled:opacity-50"
      >
        Revoke
      </button>
    </div>
  );
}
