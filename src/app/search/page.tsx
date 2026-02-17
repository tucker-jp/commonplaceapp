"use client";

import { useState, useRef } from "react";
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

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Note[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const searchTitle = useRef<HTMLInputElement>(null);
  const searchSummary = useRef<HTMLInputElement>(null);
  const searchTags = useRef<HTMLInputElement>(null);
  const searchOriginal = useRef<HTMLInputElement>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsSearching(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query.trim())}`);
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-[#1c150d]">Search</h1>

      <form onSubmit={handleSearch} className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search your notes..."
          className="w-full px-4 py-3 pl-11 bg-white border border-[#e8ddd3] rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-[#1c150d] placeholder-[#9a8478]"
        />
        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9a8478] text-sm">🔍</span>
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
          </div>
        )}
      </form>

      {/* Search field filters */}
      <div className="flex flex-wrap gap-4">
        {[
          { ref: searchTitle, label: "Title", defaultChecked: true },
          { ref: searchSummary, label: "Summary", defaultChecked: true },
          { ref: searchTags, label: "Tags", defaultChecked: true },
          { ref: searchOriginal, label: "Original Text", defaultChecked: false },
        ].map(({ ref, label, defaultChecked }) => (
          <label key={label} className="flex items-center gap-2 text-sm text-[#3d2e22] cursor-pointer">
            <input
              ref={ref}
              type="checkbox"
              defaultChecked={defaultChecked}
              className="rounded accent-orange-500"
            />
            {label}
          </label>
        ))}
      </div>

      {/* Results */}
      {results.length > 0 ? (
        <div className="space-y-3">
          {results.map((note) => (
            <div
              key={note.id}
              className="p-4 bg-white rounded-xl border border-[#e8ddd3] shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <h2 className="font-semibold text-[#1c150d]">{note.title ?? "Untitled"}</h2>
                <span className="shrink-0 text-xs px-2 py-1 bg-[#f0e8df] text-[#7c5c47] rounded-md font-medium">
                  {note.folder.name}
                </span>
              </div>
              {note.summary && (
                <p className="mt-1.5 text-sm text-[#3d2e22] line-clamp-2">{note.summary}</p>
              )}
              {note.tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {note.tags.map((tag) => (
                    <span
                      key={tag}
                      className={`px-2 py-0.5 text-xs rounded-md font-medium ${getTagColor(tag)}`}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              <p className="mt-2 text-xs text-[#9a8478]">
                {new Date(note.createdAt).toLocaleDateString()}
              </p>
            </div>
          ))}
        </div>
      ) : hasSearched && !isSearching ? (
        <div className="text-center py-16">
          <span className="text-4xl">🔍</span>
          <h2 className="mt-4 text-lg font-semibold text-[#1c150d]">No results found</h2>
          <p className="mt-2 text-[#9a8478]">Try a different search term</p>
        </div>
      ) : (
        <div className="text-center py-16 text-[#9a8478]">
          <span className="text-4xl">✨</span>
          <p className="mt-4">Search across all your captured notes</p>
        </div>
      )}
    </div>
  );
}
