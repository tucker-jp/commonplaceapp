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
  const [formType, setFormType] = useState<"FRAGMENTS" | "LONG">("FRAGMENTS");
  const [formInstructions, setFormInstructions] = useState("");
  const [formParentId, setFormParentId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

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

  function openCreateModal(parentId?: string) {
    setFormName("");
    setFormType("FRAGMENTS");
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
          type: formType,
          instructions: formInstructions.trim() || undefined,
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
    "w-full px-3 py-2 bg-white border border-[#e8ddd3] rounded-lg text-[#1c150d] placeholder-[#9a8478] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#1c150d]">Folders</h1>
        <button
          onClick={() => openCreateModal()}
          className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Folder
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-orange-500 border-t-transparent rounded-full" />
        </div>
      )}

      {/* Folders List */}
      {!isLoading && (
        <div className="space-y-2" ref={menuRef}>
          {displayFolders.map(({ folder, depth }) => (
            <div
              key={folder.id}
              style={{ marginLeft: depth * 20 }}
              className="relative"
            >
              <div className="flex items-center gap-2">
                {depth > 0 && (
                  <span className="text-[#9a8478] select-none mr-1 text-sm">└─</span>
                )}
                <Link
                  href={`/folders/${folder.id}`}
                  className="flex-1 block p-4 bg-white rounded-xl border border-[#e8ddd3] shadow-sm hover:shadow-md hover:border-orange-200 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{folder.type === "LONG" ? "📝" : "📁"}</span>
                      <div>
                        <h2 className="font-semibold text-[#1c150d]">{folder.name}</h2>
                        <p className="text-sm text-[#9a8478]">
                          {folder.noteCount} {folder.noteCount === 1 ? "note" : "notes"}
                        </p>
                      </div>
                    </div>
                    <span className="text-xs px-2 py-1 bg-[#f0e8df] text-[#7c5c47] rounded-md font-medium">
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
                    className="p-2 text-[#9a8478] hover:text-[#1c150d] rounded-lg hover:bg-[#f0e8df] transition-colors"
                    aria-label="Folder options"
                  >
                    ⋯
                  </button>
                  {openMenuId === folder.id && (
                    <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-[#e8ddd3] shadow-lg z-20 overflow-hidden">
                      <button
                        onClick={() => openRenameModal(folder)}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#3d2e22] hover:bg-[#faf6f0] transition-colors"
                      >
                        Rename
                      </button>
                      <button
                        onClick={() => openInstructionsModal(folder)}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#3d2e22] hover:bg-[#faf6f0] transition-colors"
                      >
                        Edit AI Instructions
                      </button>
                      <button
                        onClick={() => {
                          openCreateModal(folder.id);
                          setOpenMenuId(null);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-[#3d2e22] hover:bg-[#faf6f0] transition-colors"
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
          <span className="text-5xl">📂</span>
          <h2 className="mt-4 text-lg font-semibold text-[#1c150d]">No folders yet</h2>
          <p className="mt-2 text-[#9a8478]">Create your first folder to organize your notes</p>
          <button
            onClick={() => openCreateModal()}
            className="mt-5 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Create Folder
          </button>
        </div>
      )}

      {/* Create Modal */}
      {modal?.kind === "create" && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold text-[#1c150d] mb-5">
              {modal.parentId ? "Create Subfolder" : "Create New Folder"}
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#3d2e22] mb-1">Name</label>
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
              <div>
                <label className="block text-sm font-medium text-[#3d2e22] mb-1">Type</label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as "FRAGMENTS" | "LONG")}
                  className={inputClass}
                >
                  <option value="FRAGMENTS">Fragments</option>
                  <option value="LONG">Long Notes</option>
                </select>
              </div>
              {!modal.parentId && topLevelFolders.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-[#3d2e22] mb-1">
                    Parent Folder <span className="font-normal text-[#9a8478]">(optional)</span>
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
              <div>
                <label className="block text-sm font-medium text-[#3d2e22] mb-1">
                  Custom AI Instructions <span className="font-normal text-[#9a8478]">(optional)</span>
                </label>
                <textarea
                  value={formInstructions}
                  onChange={(e) => setFormInstructions(e.target.value)}
                  placeholder="e.g. Focus on actionable insights and key metrics"
                  rows={3}
                  className={`${inputClass} resize-none`}
                />
              </div>
              {formError && <p className="text-sm text-red-500">{formError}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm font-medium"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-[#1c150d] mb-5">Rename Folder</h2>
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
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !formName.trim()}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm font-medium"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-[#1c150d] mb-1">AI Instructions</h2>
            <p className="text-sm text-[#9a8478] mb-5">
              Custom instructions for <strong className="text-[#3d2e22]">{modal.folder.name}</strong>
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
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 disabled:opacity-50 transition-colors text-sm font-medium"
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
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl">
            <h2 className="text-xl font-bold text-[#1c150d] mb-2">Delete Folder?</h2>
            <p className="text-[#3d2e22] mb-6">
              Delete <strong>&quot;{modal.folder.name}&quot;</strong> and all its notes? This cannot be undone.
            </p>
            {formError && <p className="text-sm text-red-500 mb-4">{formError}</p>}
            <div className="flex gap-3">
              <button
                onClick={closeModal}
                className="flex-1 px-4 py-2 bg-[#f0e8df] text-[#3d2e22] rounded-lg hover:bg-[#e8ddd3] transition-colors text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isSubmitting}
                className="flex-1 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors text-sm font-medium"
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
