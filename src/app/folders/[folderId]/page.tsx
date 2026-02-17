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

  // --- Note actions ---

  function startEdit(note: Note) {
    setEditingNoteId(note.id);
    setEditTitle(note.title ?? "");
    setEditMemo(note.cleanedMemo ?? "");
    setEditOriginal(note.originalText ?? "");
    setEditSummary(note.summary ?? "");
    setEditTags(note.tags);
    setMoveFolderId("");
    setNoteError(null);
  }

  function cancelEdit() {
    setEditingNoteId(null);
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
        <div className="animate-spin h-8 w-8 border-2 border-orange-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-12 text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/folders"
            className="text-[#9a8478] hover:text-orange-500 transition-colors text-sm"
          >
            ← Back
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-[#1c150d]">
              {folder ? folder.name : "Folder"}
            </h1>
            <p className="text-sm text-[#9a8478]">
              {notes.length} {notes.length === 1 ? "note" : "notes"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Multi-select / batch move controls */}
          {notes.length > 0 && (
            <>
              {isSelectMode ? (
                <>
                  <button
                    onClick={toggleSelectMode}
                    className="px-3 py-1.5 text-sm text-[#3d2e22] bg-[#f0e8df] rounded-lg hover:bg-[#e8ddd3] transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setShowBatchMoveModal(true)}
                    disabled={selectedIds.size === 0}
                    className="px-3 py-1.5 text-sm bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-40 transition-colors"
                  >
                    Move {selectedIds.size > 0 ? `${selectedIds.size} selected` : "selected"} ▸
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleSelectMode}
                  className="px-3 py-1.5 text-sm text-[#3d2e22] bg-[#f0e8df] rounded-lg hover:bg-[#e8ddd3] transition-colors"
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
                <summary className="list-none cursor-pointer px-3 py-2 text-[#9a8478] hover:text-[#1c150d] hover:bg-[#f0e8df] rounded-lg transition-colors select-none text-sm">
                  ⋯ Actions
                </summary>
                <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl border border-[#e8ddd3] shadow-lg z-20 overflow-hidden">
                  <button
                    onClick={() => openFolderModal("rename")}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#3d2e22] hover:bg-[#faf6f0] transition-colors"
                  >
                    Rename Folder
                  </button>
                  <button
                    onClick={() => openFolderModal("instructions")}
                    className="w-full text-left px-4 py-2.5 text-sm text-[#3d2e22] hover:bg-[#faf6f0] transition-colors"
                  >
                    Edit AI Instructions
                  </button>
                  <button
                    onClick={() => openFolderModal("delete")}
                    className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
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
                className={`bg-white rounded-xl border overflow-hidden transition-all shadow-sm ${
                  isSelected
                    ? "border-orange-400 ring-2 ring-orange-400/40"
                    : "border-[#e8ddd3] hover:shadow-md"
                }`}
              >
                {/* Card header */}
                <button
                  className="w-full text-left p-4 hover:bg-gray-100/60 dark:hover:bg-white/5 transition-colors"
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
                            ? "bg-orange-500 border-orange-500"
                            : "border-gray-300 dark:border-gray-600"
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
                        <h2 className="font-semibold text-[#1c150d]">
                          {note.title ?? "Untitled"}
                        </h2>
                        {!isSelectMode && (
                          <span className="text-[#9a8478] flex-shrink-0 text-sm mt-0.5">
                            {isEditing ? "▲" : "▼"}
                          </span>
                        )}
                      </div>
                      {note.summary && !isEditing && (
                        <p className="mt-1 text-sm text-[#3d2e22] line-clamp-2">
                          {note.summary}
                        </p>
                      )}
                      {note.tags.length > 0 && !isEditing && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
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
                  </div>
                </button>

                {/* Full detail / edit view — shown when isEditing and not in select mode */}
                {isEditing && !isSelectMode && (
                  <div className="border-t border-[#f0e8df] p-4 space-y-4">
                    {/* In-progress overlay banner */}
                    {isSavingNote && (
                      <div className="flex items-center gap-2 px-3 py-2 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg text-sm text-orange-700 dark:text-orange-300">
                        <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Saving…
                      </div>
                    )}

                    {noteError && (
                      <p className="text-sm text-red-500">{noteError}</p>
                    )}

                    {/* 1. Title */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[#9a8478] mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#e8ddd3] rounded-lg text-[#1c150d] placeholder-[#9a8478] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    {/* 2. Original Memo — read-only */}
                    {editOriginal && (
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-[#9a8478] mb-1">
                          Original
                        </label>
                        <textarea
                          value={editOriginal}
                          readOnly
                          rows={4}
                          className="w-full px-3 py-2 text-sm bg-[#faf6f0] border border-[#e8ddd3] rounded-lg text-[#9a8478] resize-none cursor-default"
                        />
                      </div>
                    )}

                    {/* 3. Cleaned Memo — editable */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[#9a8478] mb-1">
                        Cleaned
                      </label>
                      <textarea
                        value={editMemo}
                        onChange={(e) => setEditMemo(e.target.value)}
                        rows={6}
                        className="w-full px-3 py-2 text-sm bg-white border border-[#e8ddd3] rounded-lg text-[#1c150d] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none"
                      />
                    </div>

                    {/* 4. Summary — read-only */}
                    {editSummary && (
                      <div>
                        <label className="block text-xs font-medium uppercase tracking-wide text-[#9a8478] mb-1">
                          Summary
                        </label>
                        <textarea
                          value={editSummary}
                          readOnly
                          rows={3}
                          className="w-full px-3 py-2 text-sm bg-[#faf6f0] border border-[#e8ddd3] rounded-lg text-[#9a8478] resize-none cursor-default"
                        />
                      </div>
                    )}

                    {/* 5. Tags — toggle pills + search links */}
                    <div>
                      <label className="block text-xs font-medium uppercase tracking-wide text-[#9a8478] mb-2">
                        Tags
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {PRESET_TAGS.map((tag) => {
                          const selected = editTags.includes(tag);
                          return (
                            <div key={tag} className="relative group/tag">
                              <button
                                type="button"
                                onClick={() =>
                                  setEditTags((prev) =>
                                    selected
                                      ? prev.filter((t) => t !== tag)
                                      : [...prev, tag]
                                  )
                                }
                                className={`px-2 py-0.5 text-xs rounded-md font-medium transition-colors ${
                                  selected
                                    ? "bg-orange-500 text-white pr-6"
                                    : "bg-[#f0e8df] text-[#7c5c47] hover:bg-[#e8ddd3]"
                                }`}
                              >
                                {tag}
                              </button>
                              {/* Link to search for selected tags */}
                              {selected && (
                                <Link
                                  href={`/search?q=${encodeURIComponent(tag)}`}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 text-white/70 hover:text-white text-xs leading-none"
                                  title={`Search for "${tag}"`}
                                >
                                  ↗
                                </Link>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Save / Delete */}
                    <div className="flex gap-2 pt-1">
                      <button
                        onClick={() => saveEdit(note.id)}
                        disabled={isSavingNote}
                        className="px-4 py-1.5 text-sm bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all"
                      >
                        {isSavingNote ? "Saving..." : "Save changes"}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-1.5 text-sm bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => setDeleteNoteId(note.id)}
                        disabled={isDeleting}
                        className="ml-auto px-3 py-1.5 text-xs bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 disabled:opacity-50 transition-colors"
                      >
                        {isDeleting ? "Deleting..." : "Delete"}
                      </button>
                    </div>

                    {/* Move to folder */}
                    {otherFolders.length > 0 && (
                      <div className="flex items-center gap-2 pt-3 border-t border-[#f0e8df]">
                        <label className="text-xs text-[#9a8478] flex-shrink-0">
                          Move to:
                        </label>
                        <select
                          value={moveFolderId}
                          onChange={(e) => setMoveFolderId(e.target.value)}
                          className="flex-1 px-2 py-1 text-xs bg-white border border-[#e8ddd3] rounded text-[#1c150d] focus:outline-none focus:ring-1 focus:ring-orange-500"
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
                          className="px-3 py-1 text-xs bg-[#f0e8df] text-[#3d2e22] rounded hover:bg-[#e8ddd3] disabled:opacity-40 transition-colors"
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
          <span className="text-4xl">📭</span>
          <h2 className="mt-4 text-lg font-semibold text-[#1c150d]">
            No notes yet
          </h2>
          <p className="mt-2 text-[#9a8478]">
            Capture something to add it to this folder
          </p>
        </div>
      )}

      {/* Batch Move Modal */}
      {showBatchMoveModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-[#1c150d] mb-4">
              Move {selectedIds.size} {selectedIds.size === 1 ? "note" : "notes"} to…
            </h2>
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto">
              {otherFolders.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setBatchTargetFolderId(f.id)}
                  className={`w-full text-left px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    batchTargetFolderId === f.id
                      ? "bg-orange-500 text-white"
                      : "bg-[#faf6f0] text-[#3d2e22] hover:bg-[#f0e8df]"
                  }`}
                >
                  {f.name}
                </button>
              ))}
              {otherFolders.length === 0 && (
                <p className="text-sm text-[#9a8478] text-center py-4">
                  No other folders available
                </p>
              )}
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowBatchMoveModal(false);
                  setBatchTargetFolderId("");
                }}
                disabled={isMovingBatch}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleBatchMove}
                disabled={!batchTargetFolderId || isMovingBatch}
                className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h2 className="text-lg font-bold text-[#1c150d] mb-2">
              Delete Note?
            </h2>
            <p className="text-sm text-[#3d2e22] mb-6">
              This cannot be undone.
            </p>
            {noteError && (
              <p className="text-sm text-red-500 mb-4">{noteError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteNoteId(null)}
                className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={() => confirmDeleteNote(deleteNoteId)}
                disabled={!!isDeletingNoteId}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeletingNoteId ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Folder Rename Modal */}
      {folderModal?.kind === "rename" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-[#1c150d] mb-4">
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
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              {folderError && (
                <p className="text-sm text-red-500">{folderError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolder || !folderFormValue.trim()}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-[#1c150d] mb-1">
              AI Instructions
            </h2>
            <p className="text-sm text-[#9a8478] mb-4">
              Custom instructions for this folder
            </p>
            <form onSubmit={handleFolderInstructions} className="space-y-4">
              <textarea
                value={folderFormValue}
                onChange={(e) => setFolderFormValue(e.target.value)}
                placeholder="e.g. Focus on actionable insights and key metrics"
                rows={5}
                autoFocus
                className="w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none"
              />
              {folderError && (
                <p className="text-sm text-red-500">{folderError}</p>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeFolderModal}
                  className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingFolder}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg hover:from-orange-600 hover:to-amber-600 disabled:opacity-50 transition-all"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-[#1c150d] mb-2">
              Delete Folder?
            </h2>
            <p className="text-[#3d2e22] mb-6">
              Delete <strong>&quot;{folder?.name}&quot;</strong> and all its notes? This
              cannot be undone.
            </p>
            {folderError && (
              <p className="text-sm text-red-500 mb-4">{folderError}</p>
            )}
            <div className="flex gap-3">
              <button
                onClick={closeFolderModal}
                className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleFolderDelete}
                disabled={isSavingFolder}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors"
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
