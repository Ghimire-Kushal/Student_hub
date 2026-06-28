"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signOut } from "next-auth/react";
import { ThemeToggle } from "./ThemeToggle";

interface Props {
  userEmail?: string | null;
  searchAction?: (query: string) => void;
}

export function TopBar({ userEmail }: Props) {
  const [query, setQuery] = useState("");
  const router = useRouter();
  const [, startTransition] = useTransition();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      startTransition(() => router.push(`/?search=${encodeURIComponent(query.trim())}`));
    } else {
      startTransition(() => router.push("/"));
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-paper/90 backdrop-blur border-b border-border">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
        <span className="font-serif font-semibold text-ink text-lg flex-shrink-0">
          Study Tracker
        </span>

        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search units, subjects, topics…"
            className="w-full px-3 py-1.5 text-sm border border-border rounded-lg bg-white text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
        </form>

        <div className="flex items-center gap-3 ml-auto">
          <Link
            href="/profile"
            className="text-xs text-ink-muted hover:text-ink hidden sm:block transition-colors"
            title="Profile settings"
          >
            {userEmail}
          </Link>
          <ThemeToggle />
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-ink-muted hover:text-ink transition-colors"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
