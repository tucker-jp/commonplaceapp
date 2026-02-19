"use client";

import { useEffect, useRef, useState } from "react";
import { getTagColor } from "@/lib/tagColors";

interface Note {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  originalText: string;
  createdAt: string;
  folder: { id: string; name: string };
}

interface Folder {
  id: string;
  name: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderScope, setFolderScope] = useState("");
  const [aiQuery, setAiQuery] = useState("");
  const [aiAnswer, setAiAnswer] = useState("");
  const [aiResults, setAiResults] = useState<Note[]>([]);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isAsking, setIsAsking] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const searchTitle = useRef<HTMLInputElement>(null);
  const searchSummary = useRef<HTMLInputElement>(null);
  const searchTags = useRef<HTMLInputElement>(null);
  const searchOriginal = useRef<HTMLInputElement>(null);

  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await fetch("/api/folders");
        if (res.ok) {
          const data: Folder[] = await res.json();
          setFolders(data);
        }
      } catch {
        // ignore folder load errors for search scope
      }
    }
    loadFolders();
  }, []);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      return (
        target.isContentEditable ||
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      );
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return;

      const isSlash = e.key === "/";
      const isCmdK = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";

      if (isSlash || isCmdK) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams({ q: query.trim() });
      if (folderScope) {
        params.set("folderId", folderScope);
      }
      const res = await fetch(`/api/search?${params.toString()}`);
      if (res.ok) {
        const data: Note[] = await res.json();

        const titleOn = searchTitle.current?.checked ?? true;
        const summaryOn = searchSummary.current?.checked ?? true;
        const tagsOn = searchTags.current?.checked ?? true;
        const originalOn = searchOriginal.current?.checked ?? false;

        const q = query.trim().toLowerCase();
        const filtered = data.filter((note) => {
          if (titleOn && note.title?.toLowerCase().includes(q)) return true;
          if (summaryOn && note.summary?.toLowerCase().includes(q)) return true;
          if (tagsOn && note.tags.some((t) => t.toLowerCase().includes(q))) return true;
          if (originalOn && note.originalText.toLowerCase().includes(q)) return true;
          return false;
        });

        setResults(filtered);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;

    setIsAsking(true);
    setAiError(null);
    setAiAnswer("");
    setAiResults([]);

    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: aiQuery.trim(),
          folderId: folderScope || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI search failed");
      }

      const data = await res.json();
      setAiAnswer(data.answer || "");
      setAiResults(Array.isArray(data.notes) ? data.notes : []);
    } catch (error) {
      setAiError(error instanceof Error ? error.message : "AI search failed");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-semibold text-[var(--foreground)]">Search</h1>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <form onSubmit={handleSearch} className="relative flex-1">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your notes..."
            className="w-full px-5 py-3.5 pl-12 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-soft)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent text-base text-[var(--foreground)] placeholder-[var(--muted)]"
          />
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--muted)]">
            <svg
              aria-hidden="true"
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          {isSearching && (
            <div className="absolute right-4 top-1/2 -translate-y-1/2">
              <div className="animate-spin h-4 w-4 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
            </div>
          )}
        </form>

        <div className="flex items-center gap-3">
          <label
            htmlFor="folderScope"
            className="text-base text-[var(--muted)] whitespace-nowrap"
          >
            Scope
          </label>
          <select
            id="folderScope"
            value={folderScope}
            onChange={(e) => setFolderScope(e.target.value)}
            className="min-w-[200px] px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
          >
            <option value="">All folders</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Search field filters */}
      <div className="flex flex-wrap gap-4">
        {[
          { ref: searchTitle, label: "Title", defaultChecked: true },
          { ref: searchSummary, label: "Summary", defaultChecked: true },
          { ref: searchTags, label: "Tags", defaultChecked: true },
          { ref: searchOriginal, label: "Original Text", defaultChecked: false },
        ].map(({ ref, label, defaultChecked }) => (
          <label
            key={label}
            className="flex items-center gap-2 text-base text-[var(--foreground)] cursor-pointer"
          >
            <input
              ref={ref}
              type="checkbox"
              defaultChecked={defaultChecked}
              className="rounded accent-[var(--accent)]"
            />
            {label}
          </label>
        ))}
      </div>

      <form
        onSubmit={handleAiSearch}
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-[var(--shadow-soft)] space-y-4 hover-lift"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">AskNotes</h2>
            <p className="text-base text-[var(--muted)]">
              Ask in plain language to surface the most relevant notes.
            </p>
          </div>
          <button
            type="submit"
            disabled={isAsking || !aiQuery.trim()}
            className="px-5 py-2.5 text-base bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {isAsking ? "Thinking..." : "Ask AI"}
          </button>
        </div>

        <textarea
          value={aiQuery}
          onChange={(e) => setAiQuery(e.target.value)}
          rows={3}
          placeholder="e.g. What were the key action items from last week's meeting?"
          className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)] resize-none"
        />

        {aiError && <p className="text-sm text-red-500">{aiError}</p>}

        {aiAnswer && (
          <div className="bg-[var(--accent-soft)] border border-[var(--border)] rounded-xl p-4 text-base text-[var(--foreground)]">
            {aiAnswer}
          </div>
        )}

        {aiResults.length > 0 && (
          <div className="space-y-3">
            {aiResults.map((note) => (
              <div
                key={note.id}
                className="p-5 bg-[var(--card-strong)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] hover-lift"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    {note.title ?? "Untitled"}
                  </h3>
                  <span className="shrink-0 text-sm px-3 py-1 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-lg font-medium">
                    {note.folder.name}
                  </span>
                </div>
                {note.summary && (
                  <p className="mt-1.5 text-sm text-[var(--sidebar-ink)] line-clamp-2">
                    {note.summary}
                  </p>
                )}
                {note.tags.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {note.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 text-sm rounded-md font-medium ${getTagColor(tag)}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-sm text-[var(--muted)]">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </form>

{/* Results */}
      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((note) => (
            <div
              key={note.id}
              className="p-5 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] hover-lift"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="text-lg font-semibold text-[var(--foreground)]">{note.title ?? "Untitled"}</h2>
                <span className="shrink-0 text-sm px-3 py-1 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-lg font-medium">
                  {note.folder.name}
                </span>
              </div>
              {note.summary && (
                <p className="mt-1.5 text-sm text-[var(--sidebar-ink)] line-clamp-2">
                  {note.summary}
                </p>
              )}
              {note.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2.5 py-1 text-sm rounded-md font-medium ${getTagColor(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-sm text-[var(--muted)]">
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : hasSearched && !isSearching ? (
        <div className="text-center py-16">
          <span className="text-4xl text-[var(--muted)]">
            <svg
              aria-hidden="true"
              className="h-10 w-10 mx-auto"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" />
            </svg>
          </span>
          <h2 className="mt-4 text-xl font-semibold text-[var(--foreground)]">No results found</h2>
          <p className="mt-2 text-base text-[var(--muted)]">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--muted)]">
          <span className="text-4xl text-[var(--muted)]">
            <svg
              aria-hidden="true"
              className="h-10 w-10 mx-auto"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8L12 3z" />
              <path d="M19 5l.9 2.1L22 8l-2.1.9L19 11l-.9-2.1L16 8l2.1-.9L19 5z" />
            </svg>
          </span>
          <p className="mt-4 text-base">Search across all your captured notes</p>
        </div>
      )}
    </div>
  );
}
