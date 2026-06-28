"use client";

import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";

interface Props {
  children: string;
}

export function MarkdownMath({ children }: Props) {
  return (
    <div className="markdown-body text-sm text-ink">
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          h1: ({ children: c }) => <h1 className="text-lg font-semibold font-serif mt-3 mb-1">{c}</h1>,
          h2: ({ children: c }) => <h2 className="text-base font-semibold font-serif mt-3 mb-1">{c}</h2>,
          h3: ({ children: c }) => <h3 className="text-sm font-semibold mt-2 mb-1">{c}</h3>,
          p: ({ children: c }) => <p className="mb-2 leading-relaxed">{c}</p>,
          ul: ({ children: c }) => <ul className="list-disc pl-5 mb-2 space-y-0.5">{c}</ul>,
          ol: ({ children: c }) => <ol className="list-decimal pl-5 mb-2 space-y-0.5">{c}</ol>,
          li: ({ children: c }) => <li className="leading-relaxed">{c}</li>,
          code: ({ inline, children: c, ...props }: { inline?: boolean; children?: React.ReactNode; [key: string]: unknown }) =>
            inline ? (
              <code className="font-mono text-xs bg-accent-light text-accent px-1 py-0.5 rounded" {...props}>{c}</code>
            ) : (
              <code className="block font-mono text-xs bg-gray-50 border border-border rounded-lg p-3 overflow-x-auto mb-2 whitespace-pre" {...props}>{c}</code>
            ),
          blockquote: ({ children: c }) => (
            <blockquote className="border-l-2 border-accent pl-3 italic text-ink-muted mb-2">{c}</blockquote>
          ),
          table: ({ children: c }) => (
            <div className="overflow-x-auto mb-2">
              <table className="text-xs border-collapse border border-border w-full">{c}</table>
            </div>
          ),
          th: ({ children: c }) => <th className="border border-border px-2 py-1 bg-accent-light font-semibold text-left">{c}</th>,
          td: ({ children: c }) => <td className="border border-border px-2 py-1">{c}</td>,
          strong: ({ children: c }) => <strong className="font-semibold">{c}</strong>,
          em: ({ children: c }) => <em className="italic">{c}</em>,
          hr: () => <hr className="border-border my-3" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
