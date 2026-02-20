"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TrackerType = "BOOK" | "MOVIE" | "MUSIC";
type TrackerStatus = "PLANNED" | "IN_PROGRESS" | "COMPLETED";

interface TrackerItem {
  id: string;
  type: TrackerType;
  status: TrackerStatus;
  title: string;
  creator: string | null;
  rating: number | null;
  notes: string | null;
  tags: string[];
  isRecommendation: boolean;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
}

const typeLabels: Record<TrackerType, string> = {
  BOOK: "Books",
  MOVIE: "Movies",
  MUSIC: "Music",
};

export default function LibraryPage() {
  const [items, setItems] = useState<TrackerItem[]>([]);
  const [activeType, setActiveType] = useState<TrackerType>("BOOK");
  const [yearFilter, setYearFilter] = useState("");
  const [listMode, setListMode] = useState<"completed" | "recommended">(
    "completed"
  );
  const [sortKey, setSortKey] = useState<"title" | "creator" | "rating">(
    "title"
  );
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [creator, setCreator] = useState("");
  const [rating, setRating] = useState("");
  const [notes, setNotes] = useState("");
  const [entryMode, setEntryMode] = useState<"RECOMMENDED" | "COMPLETED">(
    "RECOMMENDED"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importMode, setImportMode] = useState<"completed" | "recommended">("completed");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{
    added: number;
    skipped: number;
    errors: string[];
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const creatorRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef<HTMLSelectElement>(null);
  const ratingRef = useRef<HTMLInputElement>(null);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const yearOptions = useMemo(() => {
    const current = new Date().getFullYear();
    return Array.from({ length: 6 }, (_, idx) => String(current - idx));
  }, []);

  const creatorLabel =
    activeType === "BOOK" ? "Author" : activeType === "MOVIE" ? "Director" : "Artist";

  const handleEnterToNext = (
    event: React.KeyboardEvent,
    nextRef: React.RefObject<HTMLElement | null>
  ) => {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.metaKey ||
      event.ctrlKey ||
      event.altKey
    ) {
      return;
    }
    event.preventDefault();
    nextRef.current?.focus();
  };

  const handleSort = (key: "title" | "creator" | "rating") => {
    setSortKey((current) => {
      if (current === key) {
        setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
        return current;
      }
      setSortDir(key === "rating" ? "desc" : "asc");
      return key;
    });
  };

  const sortedItems = useMemo(() => {
    const sorted = [...items];
    sorted.sort((a, b) => {
      if (sortKey === "rating") {
        const aVal = a.rating ?? -1;
        const bVal = b.rating ?? -1;
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }

      const aVal =
        sortKey === "title"
          ? a.title.toLowerCase()
          : (a.creator ?? "").toLowerCase();
      const bVal =
        sortKey === "title"
          ? b.title.toLowerCase()
          : (b.creator ?? "").toLowerCase();
      const result = aVal.localeCompare(bVal);
      return sortDir === "asc" ? result : -result;
    });
    return sorted;
  }, [items, sortDir, sortKey]);

  const sortSuffix = (key: "title" | "creator" | "rating") => {
    if (sortKey !== key) return "";
    if (key === "rating") {
      return sortDir === "asc" ? " (Low-High)" : " (High-Low)";
    }
    return sortDir === "asc" ? " (A-Z)" : " (Z-A)";
  };

  const formatRating = (value: number | null) => {
    if (value === null || Number.isNaN(value)) return "N/A";
    const rounded = Math.round(value * 100) / 100;
    return rounded
      .toFixed(2)
      .replace(/\.00$/, "")
      .replace(/(\.\d)0$/, "$1");
  };

  useEffect(() => {
    const handleClick = () => setOpenMenuId(null);
    window.addEventListener("click", handleClick);
    return () => window.removeEventListener("click", handleClick);
  }, []);


  const loadItems = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("type", activeType);
      if (yearFilter) params.set("year", yearFilter);
      if (listMode === "recommended") {
        params.set("recommendations", "1");
      } else {
        params.set("recommendations", "0");
        params.set("status", "COMPLETED");
      }

      const res = await fetch(`/api/library?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to load library items");
      }
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load library items");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeType, yearFilter, listMode]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const isRecommendation = entryMode === "RECOMMENDED";
      const status = isRecommendation ? "PLANNED" : "COMPLETED";
      const finishedAt = isRecommendation ? undefined : new Date().toISOString();

      const parsedRating = rating.trim() ? Number.parseFloat(rating) : undefined;

      const res = await fetch("/api/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          creator: creator.trim() || undefined,
          rating: Number.isFinite(parsedRating) ? parsedRating : undefined,
          notes: notes.trim() || undefined,
          type: activeType,
          status,
          isRecommendation,
          finishedAt,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create item");
      }

      setTitle("");
      setCreator("");
      setRating("");
      setNotes("");
      await loadItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMarkCompleted = async (item: TrackerItem) => {
    try {
      await fetch(`/api/library/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isRecommendation: false,
          status: "COMPLETED",
          finishedAt: new Date().toISOString(),
        }),
      });
      await loadItems();
    } catch {
      setError("Failed to update item");
    }
  };

  const handleDelete = async (itemId: string) => {
    try {
      await fetch(`/api/library/${itemId}`, { method: "DELETE" });
      await loadItems();
    } catch {
      setError("Failed to delete item");
    }
  };

  const handleImport = useCallback(async () => {
    if (!importFile) return;
    setIsImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("file", importFile);
      formData.append("type", activeType);
      formData.append("mode", importMode);

      const res = await fetch("/api/library/import", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Import failed");
      }

      const result = await res.json();
      setImportResult(result);
      if (result.added > 0) {
        await loadItems();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setIsImporting(false);
    }
  }, [importFile, activeType, importMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeImportModal = () => {
    setShowImportModal(false);
    setImportFile(null);
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">Library</h1>
          <p className="text-base text-[var(--muted)]">
            Track what you plan to read, watch, and listen to.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {(["BOOK", "MOVIE", "MUSIC"] as TrackerType[]).map((type) => (
          <button
            key={type}
            onClick={() => setActiveType(type)}
            className={`px-4 py-2 rounded-xl text-base font-medium transition-colors ${
              activeType === type
                ? "bg-[var(--card-strong)] text-[var(--foreground)] shadow-[var(--shadow-soft)] border border-[var(--border)]"
                : "bg-transparent text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            {typeLabels[type]}
          </button>
        ))}

        <button
          onClick={() => setShowImportModal(true)}
          className="ml-auto px-4 py-2 rounded-xl text-base font-medium bg-[var(--card-strong)] text-[var(--muted)] hover:text-[var(--foreground)] border border-[var(--border)] transition-colors"
        >
          Import CSV
        </button>
      </div>

      <form
        onSubmit={handleCreate}
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-[var(--shadow-soft)] space-y-4"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">
              Add {typeLabels[activeType]}
            </h2>
            <p className="text-base text-[var(--muted)]">Quickly add a new item to track.</p>
          </div>
          <button
            type="submit"
            disabled={isSubmitting || !title.trim()}
            className="px-5 py-2.5 text-base bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {isSubmitting ? "Saving..." : "Add item"}
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <input
            ref={titleRef}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            onKeyDown={(e) => handleEnterToNext(e, creatorRef)}
            className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)]"
          />
          <input
            ref={creatorRef}
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
            placeholder={creatorLabel}
            onKeyDown={(e) => handleEnterToNext(e, modeRef)}
            className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)]"
          />
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <select
            ref={modeRef}
            value={entryMode}
            onChange={(e) =>
              setEntryMode(e.target.value as "RECOMMENDED" | "COMPLETED")
            }
            onKeyDown={(e) => handleEnterToNext(e, ratingRef)}
            className="px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)]"
          >
            <option value="RECOMMENDED">Recommended</option>
            <option value="COMPLETED">Completed</option>
          </select>
          <input
            ref={ratingRef}
            value={rating}
            onChange={(e) => setRating(e.target.value)}
            type="number"
            step="0.01"
            min="0"
            max="10"
            inputMode="decimal"
            placeholder="Rating (0-10)"
            onKeyDown={(e) => handleEnterToNext(e, notesRef)}
            className="px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)]"
          />
        </div>

        <textarea
          ref={notesRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          placeholder="Optional notes"
          className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] resize-none"
        />
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-2">
          <button
            onClick={() => setListMode("completed")}
            className={`px-4 py-2 rounded-xl text-base font-medium transition-colors ${
              listMode === "completed"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--card-strong)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Completed
          </button>
          <button
            onClick={() => setListMode("recommended")}
            className={`px-4 py-2 rounded-xl text-base font-medium transition-colors ${
              listMode === "recommended"
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--card-strong)] text-[var(--muted)] hover:text-[var(--foreground)]"
            }`}
          >
            Recommended
          </button>
        </div>

        <select
          value={yearFilter}
          onChange={(e) => setYearFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)]"
        >
          <option value="">All years</option>
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="w-full p-4 bg-red-50 border border-red-200 rounded-2xl text-sm text-red-700">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-10">
          <div className="animate-spin h-6 w-6 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      ) : items.length > 0 ? (
        <div className="overflow-x-auto rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)]">
          <table className="w-full text-base">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--card-strong)]">
                <th className="text-left px-5 py-3 text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => handleSort("title")}
                    className="hover:text-[var(--foreground)] transition-colors"
                  >
                    Title{sortSuffix("title")}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => handleSort("creator")}
                    className="hover:text-[var(--foreground)] transition-colors"
                  >
                    {creatorLabel}
                    {sortSuffix("creator")}
                  </button>
                </th>
                <th className="text-center px-4 py-3 text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
                  <button
                    type="button"
                    onClick={() => handleSort("rating")}
                    className="hover:text-[var(--foreground)] transition-colors"
                  >
                    Rating{sortSuffix("rating")}
                  </button>
                </th>
                <th className="text-left px-4 py-3 text-sm font-medium text-[var(--muted)] uppercase tracking-wide">
                  Notes
                </th>
                <th className="px-4 py-3 text-right">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedItems.map((item, i) => (
                <tr
                  key={item.id}
                  className={`group border-b border-[var(--border)] last:border-0 ${
                    i % 2 === 0 ? "bg-[var(--card)]" : "bg-[var(--background)]"
                  }`}
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-[var(--foreground)]">{item.title}</p>
                  </td>
                  <td className="px-4 py-4 text-[var(--sidebar-ink)]">
                    {item.creator || "N/A"}
                  </td>
                  <td className="px-4 py-4 text-center text-[var(--foreground)]">
                    {formatRating(item.rating)}
                  </td>
                  <td className="px-4 py-4 text-[var(--muted)]">
                    {item.notes ? (
                      <p className="text-sm line-clamp-2">{item.notes}</p>
                    ) : (
                      <span className="text-sm">None</span>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    {listMode === "recommended" && (
                      <button
                        onClick={() => handleMarkCompleted(item)}
                        className="mr-2 px-3 py-1.5 text-sm text-[var(--foreground)] bg-[var(--accent-soft)] rounded-lg hover:bg-[var(--border)] transition-colors"
                      >
                        Mark completed
                      </button>
                    )}
                    <div className="relative inline-block text-left">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenMenuId((prev) => (prev === item.id ? null : item.id));
                        }}
                        className="opacity-0 group-hover:opacity-100 transition-opacity px-3 py-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)]"
                        aria-label="Item actions"
                      >
                        ...
                      </button>
                      {openMenuId === item.id && (
                        <div
                          className="absolute right-0 mt-1 w-36 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-soft)] overflow-hidden z-20"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-16 text-[var(--muted)]">
          <p className="text-base">No items yet for this view.</p>
        </div>
      )}

      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div
            className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg w-full max-w-md mx-4 p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-[var(--foreground)]">
                Import {typeLabels[activeType]}
              </h2>
              <button
                onClick={closeImportModal}
                className="text-[var(--muted)] hover:text-[var(--foreground)] text-xl leading-none px-1"
              >
                &times;
              </button>
            </div>

            {importResult ? (
              <div className="space-y-3">
                <p className="text-base text-[var(--foreground)]">
                  {importResult.added} item{importResult.added !== 1 ? "s" : ""} added
                  {importResult.skipped > 0 && (
                    <>, {importResult.skipped} duplicate{importResult.skipped !== 1 ? "s" : ""} skipped</>
                  )}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="text-sm text-red-600 space-y-1 max-h-32 overflow-y-auto">
                    {importResult.errors.map((err, i) => (
                      <p key={i}>{err}</p>
                    ))}
                  </div>
                )}
                <button
                  onClick={closeImportModal}
                  className="w-full px-4 py-2.5 text-base bg-[var(--card-strong)] border border-[var(--border)] rounded-xl hover:bg-[var(--border)] transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                      Import as
                    </label>
                    <select
                      value={importMode}
                      onChange={(e) =>
                        setImportMode(e.target.value as "completed" | "recommended")
                      }
                      className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)]"
                    >
                      <option value="completed">Completed</option>
                      <option value="recommended">Recommended</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-[var(--muted)] mb-1">
                      CSV file
                    </label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv"
                      onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                      className="w-full text-base text-[var(--foreground)] file:mr-3 file:px-4 file:py-2 file:rounded-xl file:border file:border-[var(--border)] file:bg-[var(--card-strong)] file:text-[var(--foreground)] file:font-medium file:cursor-pointer"
                    />
                  </div>

                  <p className="text-sm text-[var(--muted)]">
                    Expected columns: Title, Author/Director/Artist, Rating, Notes
                  </p>
                </div>

                <button
                  onClick={handleImport}
                  disabled={!importFile || isImporting}
                  className="w-full px-4 py-2.5 text-base bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all"
                >
                  {isImporting ? "Importing..." : "Import"}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
