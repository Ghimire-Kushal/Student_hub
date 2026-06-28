"use client";

interface Props {
  href: string;
  label?: string;
}

export function ExportPdfButton({ href, label = "Export PDF" }: Props) {
  return (
    <button
      onClick={() => window.open(href, "_blank")}
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-ink-muted hover:text-ink hover:border-ink rounded-lg transition-colors"
      title="Open print view and save as PDF"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
      </svg>
      {label}
    </button>
  );
}
