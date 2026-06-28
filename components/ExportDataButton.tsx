"use client";

export function ExportDataButton() {
  return (
    <a
      href="/api/export"
      download
      className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-border text-ink-muted hover:text-ink hover:border-ink rounded-lg transition-colors"
    >
      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export my data
    </a>
  );
}
