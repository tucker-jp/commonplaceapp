"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PRESET_TAGS } from "@/lib/tags";
import { getTagColor } from "@/lib/tagColors";

interface Note {
  id: string;
  originalText: string;
  title: string | null;
  summary: string | null;
  cleanedMemo: string | null;
  tags: string[];
  createdAt: string;
  folderId: string;
}

interface Folder {
  id: string;
  name: string;
  type: string;
  instructions: string | null;
  parentId: string | null;
  noteCount?: number;
}

type FolderModal =
  | { kind: "rename" }
  | { kind: "instructions" }
  | { kind: "delete" };

export default function FolderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const folderId = params.folderId as string;

  const [folder, setFolder] = useState<Folder | null>(null);
  const [allFolders, setAllFolders] = useState<Folder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Note edit state — click goes directly to edit (no intermediate expand step)
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editMemo, setEditMemo] = useState("");
  const [editOriginal, setEditOriginal] = useState("");
  const [editSummary, setEditSummary] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagSearch, setTagSearch] = useState("");
  const [moveFolderId, setMoveFolderId] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isDeletingNoteId, setIsDeletingNoteId] = useState<string | null>(null);
  const [noteError, setNoteError] = useState<string | null>(null);
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  // Multi-select / batch move state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMovingBatch, setIsMovingBatch] = useState(false);
  const [showBatchMoveModal, setShowBatchMoveModal] = useState(false);
  const [batchTargetFolderId, setBatchTargetFolderId] = useState("");

  // Folder action modal state
  const [folderModal, setFolderModal] = useState<FolderModal | null>(null);
  const [folderFormValue, setFolderFormValue] = useState("");
  const [isSavingFolder, setIsSavingFolder] = useState(false);
  const [folderError, setFolderError] = useState<string | null>(null);

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
    );
  };

  const closeAllModals = () => {
    setShowBatchMoveModal(false);
    setDeleteNoteId(null);
    setFolderModal(null);
    setBatchTargetFolderId("");
  };

  useEffect(() => {
    async function load() {
      try {
        const [foldersRes, notesRes] = await Promise.all([
          fetch("/api/folders"),
          fetch(`/api/notes?folderId=${folderId}`),
        ]);

        if (!foldersRes.ok || !notesRes.ok) {
          throw new Error("Failed to load data");
        }

        const foldersData: Folder[] = await foldersRes.json();
        const notesData: Note[] = await notesRes.json();

        const matched = foldersData.find((f) => f.id === folderId) ?? null;
        setFolder(matched);
        setAllFolders(foldersData);
        setNotes(notesData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [folderId]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape") return;
      if (!showBatchMoveModal && !deleteNoteId && !folderModal) return;
      if (isTypingTarget(e.target)) return;

      e.preventDefault();
      closeAllModals();
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showBatchMoveModal, deleteNoteId, folderModal]);

  // --- Note actions ---

  function startEdit(note: Note) {
    setEditingNoteId(note.id);
    setEditTitle(note.title ?? "");
    setEditMemo(note.cleanedMemo ?? "");
    setEditOriginal(note.originalText ?? "");
    setEditSummary(note.summary ?? "");
    setEditTags(note.tags);
    setTagSearch("");
    setMoveFolderId("");
    setNoteError(null);
  }

  function cancelEdit() {
    setEditingNoteId(null);
    setTagSearch("");
    setNoteError(null);
  }

  async function saveEdit(noteId: string) {
    setIsSavingNote(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          cleanedMemo: editMemo,
          summary: editSummary,
          tags: editTags,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNoteError(data.error ?? "Failed to save");
        return;
      }
      const updated: Note = await res.json();
      setNotes((prev) => prev.map((n) => (n.id === noteId ? updated : n)));
      setEditingNoteId(null);
    } catch {
      setNoteError("Failed to save");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function moveNote(noteId: string, targetFolderId: string) {
    if (!targetFolderId) return;
    setIsSavingNote(true);
    setNoteError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folderId: targetFolderId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setNoteError(data.error ?? "Failed to move");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setEditingNoteId(null);
    } catch {
      setNoteError("Failed to move");
    } finally {
      setIsSavingNote(false);
    }
  }

  async function confirmDeleteNote(noteId: string) {
    setIsDeletingNoteId(noteId);
    setNoteError(null);
    try {
      const res = await fetch(`/api/notes/${noteId}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setNoteError("Failed to delete note");
        return;
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setDeleteNoteId(null);
      setEditingNoteId(null);
    } catch {
      setNoteError("Failed to delete note");
    } finally {
      setIsDeletingNoteId(null);
    }
  }

  // --- Multi-select / batch move ---

  function toggleSelectMode() {
    setIsSelectMode((prev) => {
      if (prev) {
        // Exiting select mode — clear selection and close any editing
        setSelectedIds(new Set());
      }
      return !prev;
    });
    setEditingNoteId(null);
    setNoteError(null);
  }

  function toggleSelect(noteId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  }

  async function handleBatchMove() {
    if (!batchTargetFolderId || selectedIds.size === 0) return;
    setIsMovingBatch(true);
    try {
      await Promise.all(
        [...selectedIds].map((id) =>
          fetch(`/api/notes/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ folderId: batchTargetFolderId }),
          })
        )
      );
      setNotes((prev) => prev.filter((n) => !selectedIds.has(n.id)));
      setSelectedIds(new Set());
      setIsSelectMode(false);
      setShowBatchMoveModal(false);
      setBatchTargetFolderId("");
    } catch {
      // silently ignore — partial moves are acceptable
    } finally {
      setIsMovingBatch(false);
    }
  }

  // --- Folder actions ---

  function openFolderModal(kind: FolderModal["kind"]) {
    setFolderError(null);
    if (kind === "rename") setFolderFormValue(folder?.name ?? "");
    if (kind === "instructions") setFolderFormValue(folder?.instructions ?? "");
    setFolderModal({ kind });
  }

  function closeFolderModal() {
    setFolderModal(null);
    setFolderError(null);
  }

  async function handleFolderRename(e: React.FormEvent) {
    e.preventDefault();
    if (!folder || !folderFormValue.trim()) return;
    setIsSavingFolder(true);
    setFolderError(null);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: folderFormValue.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFolderError(data.error ?? "Failed to rename");
        return;
      }
      const updated: Folder = await res.json();
      setFolder((prev) => (prev ? { ...prev, name: updated.name } : prev));
      closeFolderModal();
    } catch {
      setFolderError("Failed to rename");
    } finally {
      setIsSavingFolder(false);
    }
  }

  async function handleFolderInstructions(e: React.FormEvent) {
    e.preventDefault();
    if (!folder) return;
    setIsSavingFolder(true);
    setFolderError(null);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: folderFormValue.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFolderError(data.error ?? "Failed to save");
        return;
      }
      const updated: Folder = await res.json();
      setFolder((prev) =>
        prev ? { ...prev, instructions: updated.instructions } : prev
      );
      closeFolderModal();
    } catch {
      setFolderError("Failed to save");
    } finally {
      setIsSavingFolder(false);
    }
  }

  async function handleFolderDelete() {
    if (!folder) return;
    setIsSavingFolder(true);
    setFolderError(null);
    try {
      const res = await fetch(`/api/folders/${folder.id}`, { method: "DELETE" });
      if (!res.ok && res.status !== 204) {
        setFolderError("Failed to delete folder");
        return;
      }
      router.push("/folders");
    } catch {
      setFolderError("Failed to delete folder");
    } finally {
      setIsSavingFolder(false);
    }
  }

  // Other folders to move notes to
  const otherFolders = allFolders.filter((f) => f.id !== folderId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link
            href="/folders"
            className="text-[var(--muted)] hover:text-[var(--accent)] transition-colors text-base flex-shrink-0"
          >
            ← Back
          </Link>
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold text-[var(--foreground)] truncate">
              {folder ? folder.name : "Folder"}
            </h1>
            <p className="text-base text-[var(--muted)]">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          {/* Multi-select / batch move controls */}
          {notes.length > 0 && (
            <>
              {isSelectMode ? (
                <>
                  <button
                    onClick={toggleSelectMode}
                    className="px-4 py-2 text-base text-[var(--foreground)] bg-[var(--accent-soft)] rounded-xl hover:bg-[var(--border)] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowBatchMoveModal(true)}
                    disabled={selectedIds.size === 0}
                    className="px-4 py-2 text-base bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-strong)] disabled:opacity-40 transition-colors"
                  >
                    Move {selectedIds.size > 0 ? selectedIds.size : ""} ▸
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleSelectMode}
                  className="px-4 py-2 text-base text-[var(--foreground)] bg-[var(--accent-soft)] rounded-xl hover:bg-[var(--border)] transition-colors"
                >
                  ☐ Move
                </button>
              )}
            </>
          )}

          {/* Folder actions dropdown */}
          {folder && (
            <div className="relative">
              <details className="group">
                <summary className="list-none cursor-pointer px-4 py-2.5 text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--accent-soft)] rounded-xl transition-colors select-none text-base">
                  ⋯ Actions
                </summary>
                <div className="absolute right-0 top-full mt-1 w-52 bg-[var(--card-strong)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-soft)] z-20 overflow-hidden">
                  <button
                    onClick={() => openFolderModal("rename")}
                    className="w-full text-left px-5 py-3 text-base text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                  >
                    Rename Folder
                  </button>
                  <button
                    onClick={() => openFolderModal("instructions")}
                    className="w-full text-left px-5 py-3 text-base text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                  >
                    Edit AI Instructions
                  </button>
                  <button
                    onClick={() => openFolderModal("delete")}
                    className="w-full text-left px-5 py-3 text-base text-red-600 hover:bg-red-50 transition-colors"
                  >
                    Delete Folder
                  </button>
                </div>
              </details>
            </div>
          )}
        </div>
      </div>

      {/* Notes List */}
      {notes.length > 0 ? (
        <div className="space-y-3">
          {notes.map((note) => {
            const isEditing = editingNoteId === note.id;
            const isDeleting = isDeletingNoteId === note.id;
            const isSelected = selectedIds.has(note.id);

            return (
              <div
                key={note.id}
                className={`bg-[var(--card)] rounded-2xl border overflow-hidden transition-all shadow-[var(--shadow-soft)] ${
                  isSelected
                    ? "border-[var(--accent)] ring-2 ring-[var(--accent-ring)]"
                    : "border-[var(--border)] hover:shadow-[var(--shadow-lift)]"
                }`}
              >
                {/* Card header */}
                <button
                  className="w-full text-left p-5 hover:bg-[var(--background)] transition-colors"
                  onClick={() => {
                    if (isSelectMode) {
                      toggleSelect(note.id);
                    } else if (isEditing) {
                      cancelEdit();
                    } else {
                      startEdit(note);
                    }
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Selection circle in select mode */}
                    {isSelectMode && (
                      <div
                        className={`mt-0.5 flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? "bg-[var(--accent)] border-[var(--accent)]"
                            : "border-[var(--border)]"
                        }`}
                      >
                        {isSelected && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h2 className="text-lg font-semibold text-[var(--foreground)]">
                          {note.title ?? "Untitled"}
                        </h2>
                        {!isSelectMode && (
                          <span className="text-[var(--muted)] flex-shrink-0 text-base mt-0.5">
                            {isEditing ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                      {note.summary && !isEditing && (
                        <p className="mt-1 text-base text-[var(--sidebar-ink)] line-clamp-2">
                          {note.summary}
                        </p>
                      )}
                      {note.tags.length > 0 && !isEditing && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
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
                  </div>
                </button>

                {/* Full detail / edit view — shown when isEditing and not in select mode */}
                {isEditing && !isSelectMode && (
                  <div className="border-t border-[var(--border)] p-4 space-y-4">
                    {/* In-progress overlay banner */}
                    {isSavingNote && (
                      <div className="flex items-center gap-2 px-4 py-3 bg-[var(--accent-soft)] border border-[var(--border)] rounded-xl text-base text-[var(--accent-strong)]">
                        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving…
                      </div>
                    )}

                    {noteError && (
                      <p className="text-base text-red-500">{noteError}</p>
                    )}

                    {/* 1. Title */}
                    <div>
                      <label className="block text-sm font-medium uppercase tracking-wide text-[var(--muted)] mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-4 py-3 text-base bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-[var(--shadow-soft)]"
                      />
                    </div>

                    {/* 2. Original Memo — read-only */}
                    {editOriginal && (
                      <div>
                        <label className="block text-sm font-medium uppercase tracking-wide text-[var(--muted)] mb-1">
                          Original
                        </label>
                        <textarea
                          value={editOriginal}
                          readOnly
                          rows={4}
                          className="w-full px-4 py-3 text-base bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--muted)] resize-none cursor-default"
                        />
                      </div>
                    )}

                    {/* 3. Cleaned Memo — editable */}
                    <div>
                      <label className="block text-sm font-medium uppercase tracking-wide text-[var(--muted)] mb-1">
                        Cleaned
                      </label>
                      <textarea
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        rows={6}
                        className="w-full px-4 py-3 text-base bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none shadow-[var(--shadow-soft)]"
                      />
                    </div>

                    {/* 4. Summary — editable */}
                    <div>
                      <label className="block text-sm font-medium uppercase tracking-wide text-[var(--muted)] mb-1">
                        Summary
                      </label>
                      <textarea
                        value={editSummary}
                        onChange={(e) => setEditSummary(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 text-base bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none shadow-[var(--shadow-soft)]"
                      />
                    </div>

                    {/* 5. Tags */}
                    <div>
                      <label className="block text-sm font-medium uppercase tracking-wide text-[var(--muted)] mb-2">
                        Tags
                      </label>
                      {/* Active tags with remove button */}
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {editTags.length === 0 && (
                          <span className="text-sm text-[var(--muted)] italic">No tags</span>
                        )}
                        {editTags.map((tag) => (
                          <div
                            key={tag}
                            className={`flex items-center gap-1 pl-3 pr-2 py-1 text-sm rounded-md font-medium ${getTagColor(tag)}`}
                          >
                            <Link
                              href={`/search?q=${encodeURIComponent(tag)}`}
                              onClick={(e) => e.stopPropagation()}
                              className="hover:underline"
                              title={`Search for "${tag}"`}
                            >
                              {tag}
                            </Link>
                            <button
                              type="button"
                              onClick={() => setEditTags((prev) => prev.filter((t) => t !== tag))}
                              className="opacity-50 hover:opacity-100 leading-none px-0.5 transition-opacity"
                              title={`Remove "${tag}"`}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                      {/* Searchable tag picker */}
                      {PRESET_TAGS.filter((t) => !editTags.includes(t)).length > 0 && (
                        <div className="relative">
                          <input
                            type="text"
                            value={tagSearch}
                            onChange={(e) => setTagSearch(e.target.value)}
                            onBlur={() => setTimeout(() => setTagSearch(""), 150)}
                            placeholder="+ Add tag…"
                            className="text-sm px-3 py-1.5 bg-[var(--card-strong)] border border-[var(--border)] rounded-lg text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)] w-44"
                          />
                          {tagSearch && (
                            <div className="absolute top-full left-0 mt-1 w-48 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl shadow-[var(--shadow-lift)] z-20 max-h-48 overflow-y-auto">
                              {PRESET_TAGS.filter(
                                (t) => !editTags.includes(t) && t.toLowerCase().includes(tagSearch.toLowerCase())
                              ).length === 0 ? (
                                <p className="px-3 py-2 text-sm text-[var(--muted)]">No matches</p>
                              ) : (
                                PRESET_TAGS.filter(
                                  (t) => !editTags.includes(t) && t.toLowerCase().includes(tagSearch.toLowerCase())
                                ).map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onMouseDown={() => {
                                      setEditTags((prev) => [...prev, tag]);
                                      setTagSearch("");
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[var(--accent-soft)] transition-colors"
                                  >
                                    {tag}
                                  </button>
                                ))
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Save / Delete */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(note.id)}
                        disabled={isSavingNote}
                        className="px-5 py-2.5 text-base bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all"
                      >
                        {isSavingNote ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-5 py-2.5 text-base bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setDeleteNoteId(note.id)}
                        disabled={isDeleting}
                        className="ml-auto px-4 py-2 text-base bg-red-50 text-red-600 rounded-xl hover:bg-red-100 disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    {/* Move to folder */}
                    {otherFolders.length > 0 && (
                      <div className="flex items-center gap-2 pt-3 border-t border-[var(--border)]">
                        <label className="text-sm text-[var(--muted)] flex-shrink-0">
                          Move to:
                        </label>
                        <select
                          value={moveFolderId}
                          onChange={(e) => setMoveFolderId(e.target.value)}
                          className="flex-1 px-3 py-1.5 text-sm bg-[var(--card-strong)] border border-[var(--border)] rounded text-[var(--foreground)] focus:outline-none focus:ring-1 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
                        >
                          <option value="">Select folder...</option>
                          {otherFolders.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.name}
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => moveNote(note.id, moveFolderId)}
                          disabled={!moveFolderId || isSavingNote}
                          className="px-5 py-2.5 text-base bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] disabled:opacity-40 transition-colors"
                        >
                          {isSavingNote ? (
                            <span className="flex items-center gap-1">
                              <svg className="animate-spin h-3 w-3" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                              </svg>
                              Moving…
                            </span>
                          ) : (
                            "Move →"
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <span className="text-5xl">📭</span>
          <h2 className="mt-4 text-xl font-semibold text-[var(--foreground)]">
            No notes yet
          </h2>
          <p className="mt-2 text-base text-[var(--muted)]">
            Capture something to add it to this folder
          </p>
        </div>
      )}

      {/* Batch Move Modal */}
      {showBatchMoveModal && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-md shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Move notes"
          >
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              Move {selectedIds.size} {selectedIds.size === 1 ? "note" : "notes"} to…
            </h2>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {otherFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBatchTargetFolderId(f.id)}
                  className={`w-full text-left px-5 py-3 rounded-xl text-base font-medium transition-colors ${
                    batchTargetFolderId === f.id
                      ? "bg-[var(--accent)] text-white"
                      : "bg-[var(--background)] text-[var(--foreground)] hover:bg-[var(--accent-soft)]"
                  }`}
                >
                  {f.name}
                </button>
              ))}
              {otherFolders.length === 0 && (
                <p className="text-base text-[var(--muted)] text-center py-4">
                  No other folders available
                </p>
              )}
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setShowBatchMoveModal(false);
                  setBatchTargetFolderId("");
                }}
                disabled={isMovingBatch}
                className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] disabled:opacity-50 transition-colors text-base font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchMove}
                disabled={!batchTargetFolderId || isMovingBatch}
                className="flex-1 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-strong)] disabled:opacity-50 transition-colors text-base font-medium"
              >
                {isMovingBatch ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Moving…
                  </span>
                ) : (
                  "Move →"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Note Confirmation Modal */}
      {deleteNoteId && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-md shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Delete note"
          >
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-2">
              Delete Note?
            </h2>
            <p className="text-base text-[var(--sidebar-ink)] mb-6">
              This cannot be undone.
            </p>
            {noteError && (
              <p className="text-base text-red-500 mb-4">{noteError}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={() => setDeleteNoteId(null)}
                className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteNote(deleteNoteId)}
                disabled={!!isDeletingNoteId}
                className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-base font-medium"
              >
                {isDeletingNoteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Rename Modal */}
      {folderModal?.kind === "rename" && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Rename folder"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">
              Rename Folder
            </h2>
            <form onSubmit={handleFolderRename} className="space-y-4">
              <input
                type="text"
                value={folderFormValue}
                onChange={(e) => setFolderFormValue(e.target.value)}
                placeholder="Folder name"
                required
                autoFocus
                className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
              />
              {folderError && (
                <p className="text-base text-red-500">{folderError}</p>
              )}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolder || !folderFormValue.trim()}
                  className="flex-1 px-5 py-2.5 bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all text-base font-medium"
                >
                  {isSavingFolder ? "Saving..." : "Rename"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Instructions Modal */}
      {folderModal?.kind === "instructions" && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Edit folder instructions"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-1">
              AI Instructions
            </h2>
            <p className="text-base text-[var(--muted)] mb-4">
              Custom instructions for this folder
            </p>
            <form onSubmit={handleFolderInstructions} className="space-y-4">
              <textarea
                value={folderFormValue}
                onChange={(e) => setFolderFormValue(e.target.value)}
                placeholder="e.g. Focus on actionable insights and key metrics"
                rows={5}
                autoFocus
                className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none shadow-[var(--shadow-soft)]"
              />
              {folderError && (
                <p className="text-base text-red-500">{folderError}</p>
              )}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolder}
                  className="flex-1 px-5 py-2.5 bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all text-base font-medium"
                >
                  {isSavingFolder ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Folder Delete Modal */}
      {folderModal?.kind === "delete" && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeAllModals();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Delete folder"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">
              Delete Folder?
            </h2>
            <p className="text-base text-[var(--sidebar-ink)] mb-6">
              Delete <strong>&quot;{folder?.name}&quot;</strong> and all its notes? This
              cannot be undone.
            </p>
            {folderError && (
              <p className="text-base text-red-500 mb-4">{folderError}</p>
            )}
            <div className="flex gap-4">
              <button
                onClick={closeFolderModal}
                className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleFolderDelete}
                disabled={isSavingFolder}
                className="flex-1 px-5 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors text-base font-medium"
              >
                {isSavingFolder ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
