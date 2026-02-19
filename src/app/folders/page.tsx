"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Folder {
  id: string;
  name: string;
  type: string;
  instructions: string | null;
  parentId: string | null;
  noteCount: number;
}

type ModalMode =
  | { kind: "create"; parentId?: string }
  | { kind: "rename"; folder: Folder }
  | { kind: "instructions"; folder: Folder }
  | { kind: "delete"; folder: Folder };

export default function FoldersPage() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modal, setModal] = useState<ModalMode | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formInstructions, setFormInstructions] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isTypingTarget = (target: EventTarget | null) => {
    if (!(target instanceof HTMLElement)) return false;
    return (
      target.isContentEditable ||
      ["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)
    );
  };

  async function loadFolders() {
    try {
      const res = await fetch("/api/folders");
      if (res.ok) {
        const data = await res.json();
        setFolders(data);
      }
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadFolders();
  }, []);

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenuId(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && modal) {
        e.preventDefault();
        closeModal();
        return;
      }

      if (modal || e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) {
        return;
      }

      if (e.key.toLowerCase() === "n") {
        e.preventDefault();
        openCreateModal();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modal]);

  function openCreateModal(parentId?: string) {
    setFormName("");
    setFormInstructions("");
    setFormParentId(parentId ?? "");
    setFormError(null);
    setModal({ kind: "create", parentId });
  }

  function openRenameModal(folder: Folder) {
    setFormName(folder.name);
    setFormError(null);
    setModal({ kind: "rename", folder });
    setOpenMenuId(null);
  }

  function openInstructionsModal(folder: Folder) {
    setFormInstructions(folder.instructions ?? "");
    setFormError(null);
    setModal({ kind: "instructions", folder });
    setOpenMenuId(null);
  }

  function openDeleteModal(folder: Folder) {
    setFormError(null);
    setModal({ kind: "delete", folder });
    setOpenMenuId(null);
  }

  function closeModal() {
    setModal(null);
    setFormError(null);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch("/api/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formName.trim(),
          type: "FRAGMENTS",
          parentId: formParentId || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Failed to create folder");
        return;
      }
      closeModal();
      await loadFolders();
    } catch {
      setFormError("Failed to create folder");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.kind !== "rename" || !formName.trim()) return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/folders/${modal.folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName.trim() }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Failed to rename folder");
        return;
      }
      closeModal();
      await loadFolders();
    } catch {
      setFormError("Failed to rename folder");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSaveInstructions(e: React.FormEvent) {
    e.preventDefault();
    if (modal?.kind !== "instructions") return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/folders/${modal.folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ instructions: formInstructions.trim() || null }),
      });
      if (!res.ok) {
        const data = await res.json();
        setFormError(data.error ?? "Failed to save instructions");
        return;
      }
      closeModal();
      await loadFolders();
    } catch {
      setFormError("Failed to save instructions");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (modal?.kind !== "delete") return;
    setIsSubmitting(true);
    setFormError(null);
    try {
      const res = await fetch(`/api/folders/${modal.folder.id}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 204) {
        setFormError("Failed to delete folder");
        return;
      }
      closeModal();
      await loadFolders();
    } catch {
      setFormError("Failed to delete folder");
    } finally {
      setIsSubmitting(false);
    }
  }

  // Build hierarchical display order
  function buildDisplayOrder(allFolders: Folder[]): { folder: Folder; depth: number }[] {
    const topLevel = allFolders.filter((f) => !f.parentId);
    const result: { folder: Folder; depth: number }[] = [];

    function addWithChildren(folder: Folder, depth: number) {
      result.push({ folder, depth });
      const children = allFolders.filter((f) => f.parentId === folder.id);
      children.forEach((child) => addWithChildren(child, depth + 1));
    }

    topLevel.forEach((f) => addWithChildren(f, 0));
    const placed = new Set(result.map((r) => r.folder.id));
    allFolders.filter((f) => !placed.has(f.id)).forEach((f) => result.push({ folder: f, depth: 0 }));

    return result;
  }

  const displayFolders = buildDisplayOrder(folders);
  const topLevelFolders = folders.filter((f) => !f.parentId);

  const inputClass =
    "w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-[var(--shadow-soft)]";

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-semibold text-[var(--foreground)]">Folders</h1>
        <button
          onClick={() => openCreateModal()}
          className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white text-base font-medium rounded-xl transition-colors"
        >
          + New Folder
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-[var(--accent)] border-t-transparent rounded-full" />
        </div>
      )}

      {/* Folders List */}
      {!isLoading && (
        <div className="space-y-3" ref={menuRef}>
          {displayFolders.map(({ folder, depth }) => (
            <div
              key={folder.id}
              style={{ marginLeft: Math.min(depth, 3) * 20 }}
              className="relative"
            >
              <div className="flex items-center gap-3">
                {depth > 0 && (
                  <span className="text-[var(--muted)] select-none mr-1 text-base">└─</span>
                )}
                <Link
                  href={`/folders/${folder.id}`}
                  className="flex-1 block px-5 py-4 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] hover:border-[var(--accent-soft)] transition-all hover-lift"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-3xl">{folder.type === "LONG" ? "📝" : "📁"}</span>
                      <div>
                        <h2 className="text-2xl font-semibold text-[var(--foreground)]">{folder.name}</h2>
                        <p className="text-sm text-[var(--muted)]">
                          {folder.noteCount} {folder.noteCount === 1 ? "note" : "notes"}
                        </p>
                      </div>
                    </div>
                    <span className="text-sm px-3 py-1 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-lg font-medium">
                      {folder.type === "LONG" ? "Long Note" : "Fragments"}
                    </span>
                  </div>
                </Link>

                {/* Three-dot menu */}
                <div className="relative flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === folder.id ? null : folder.id);
                    }}
                    className="p-3 text-[var(--muted)] hover:text-[var(--foreground)] rounded-xl hover:bg-[var(--accent-soft)] transition-colors"
                    aria-label="Folder options"
                  >
                    ⋯
                  </button>
                  {openMenuId === folder.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-[var(--card-strong)] rounded-xl border border-[var(--border)] shadow-[var(--shadow-soft)] z-20 overflow-hidden">
                      <button
                        onClick={() => openRenameModal(folder)}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => openInstructionsModal(folder)}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                      >
                        Edit AI Instructions
                      </button>
                      <button
                        onClick={() => {
                          openCreateModal(folder.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                      >
                        Add Subfolder
                      </button>
                      <button
                        onClick={() => openDeleteModal(folder)}
                        className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && folders.length === 0 && (
        <div className="text-center py-16">
          <span className="text-6xl">📂</span>
          <h2 className="mt-4 text-xl font-semibold text-[var(--foreground)]">No folders yet</h2>
          <p className="mt-2 text-base text-[var(--muted)]">
            Create your first folder to organize your notes
          </p>
          <button
            onClick={() => openCreateModal()}
            className="mt-6 px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white text-base font-medium rounded-xl transition-colors"
          >
            Create Folder
          </button>
        </div>
      )}

      {/* Create Modal */}
      {modal?.kind === "create" && (
        <div
          className="fixed inset-0 bg-transparent flex items-start justify-end z-50 p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-7 w-full max-w-md shadow-[var(--shadow-lift)] border border-[var(--border)] mt-2 max-h-[calc(100vh-3rem)] overflow-y-auto sheet-enter"
            role="dialog"
            aria-modal="true"
            aria-label="Create folder"
          >
            <h2 className="text-xl font-semibold text-[var(--foreground)] mb-4">
              New Folder
            </h2>
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="block text-base font-medium text-[var(--foreground)] mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Folder name"
                  required
                  autoFocus
                  className={inputClass}
                />
              </div>
              {!modal.parentId && topLevelFolders.length > 0 && (
                <div>
                  <label className="block text-base font-medium text-[var(--foreground)] mb-1">
                    Parent Folder{" "}
                    <span className="font-normal text-[var(--muted)]">(optional)</span>
                  </label>
                  <select
                    value={formParentId}
                    onChange={(e) => setFormParentId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">None — top-level</option>
                    {topLevelFolders.map((f) => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-4 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-strong)] disabled:opacity-50 transition-colors text-base font-medium"
                >
                  {isSubmitting ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rename Modal */}
      {modal?.kind === "rename" && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Rename folder"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-6">Rename Folder</h2>
            <form onSubmit={handleRename} className="space-y-4">
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Folder name"
                required
                autoFocus
                className={inputClass}
              />
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-strong)] disabled:opacity-50 transition-colors text-base font-medium"
                >
                  {isSubmitting ? "Saving..." : "Rename"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Instructions Modal */}
      {modal?.kind === "instructions" && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Edit AI instructions"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-1">AI Instructions</h2>
            <p className="text-base text-[var(--muted)] mb-6">
              Custom instructions for{" "}
              <strong className="text-[var(--foreground)]">{modal.folder.name}</strong>
            </p>
            <form onSubmit={handleSaveInstructions} className="space-y-4">
              <textarea
                value={formInstructions}
                onChange={(e) => setFormInstructions(e.target.value)}
                placeholder="e.g. Focus on actionable insights and key metrics"
                rows={5}
                autoFocus
                className={`${inputClass} resize-none`}
              />
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-5 py-2.5 bg-[var(--accent)] text-white rounded-xl hover:bg-[var(--accent-strong)] disabled:opacity-50 transition-colors text-base font-medium"
                >
                  {isSubmitting ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {modal?.kind === "delete" && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="Delete folder"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-2">Delete Folder?</h2>
            <p className="text-base text-[var(--sidebar-ink)] mb-6">
              Delete <strong>&quot;{modal.folder.name}&quot;</strong> and all its notes? This cannot be undone.
            </p>
            {formError && <p className="text-sm text-red-500 mb-4">{formError}</p>}
            <div className="flex gap-4">
              <button
                onClick={closeModal}
                className="flex-1 px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 px-5 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors text-base font-medium"
              >
                {isSubmitting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
