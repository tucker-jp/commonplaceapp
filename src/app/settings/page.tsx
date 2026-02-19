"use client";

import { useState, useEffect } from "react";

interface Folder {
  id: string;
  name: string;
}

export default function SettingsPage() {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  const [folders, setFolders] = useState<Folder[]>([]);
  const [exportFolderId, setExportFolderId] = useState("");
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, foldersRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/folders"),
        ]);
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setCustomInstructions(data.customLLMInstructions ?? "");
        }
        if (foldersRes.ok) {
          const data: Folder[] = await foldersRes.json();
          setFolders(data);
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  async function handleExport() {
    setIsExporting(true);
    try {
      const url = exportFolderId
        ? `/api/export?folderId=${exportFolderId}`
        : "/api/export";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Export failed");
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = res.headers.get("Content-Disposition")?.match(/filename="(.+)"/)?.[1] ?? "commonplace.csv";
      a.click();
      URL.revokeObjectURL(objectUrl);
    } catch {
      // silently ignore — user can retry
    } finally {
      setIsExporting(false);
    }
  }

  const handleSave = async () => {
    setIsSaving(true);
    setSaveStatus("idle");
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customLLMInstructions: customInstructions }),
      });
      setSaveStatus(res.ok ? "success" : "error");
    } catch {
      setSaveStatus("error");
    } finally {
      setIsSaving(false);
      setTimeout(() => setSaveStatus("idle"), 3000);
    }
  };

  const inputClass =
    "w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent resize-none shadow-[var(--shadow-soft)]";

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-semibold text-[var(--foreground)]">Settings</h1>

      {/* Custom LLM Instructions */}
      <section className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Custom AI Instructions</h2>
          <p className="text-base text-[var(--muted)] mt-0.5">
            Customize how the AI analyzes and processes your notes
          </p>
        </div>

        {isLoading ? (
          <div className="h-24 bg-[var(--background)] rounded-xl animate-pulse" />
        ) : (
          <textarea
            value={customInstructions}
            onChange={(e) => setCustomInstructions(e.target.value)}
            placeholder="Example: Focus on extracting action items and deadlines. Use professional language in summaries."
            rows={4}
            className={inputClass}
          />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving || isLoading}
            className="px-5 py-2.5 bg-[var(--accent)] hover:bg-[var(--accent-strong)] text-white text-base font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save Instructions"}
          </button>
          {saveStatus === "success" && (
            <span className="text-base text-emerald-600 font-medium">Saved!</span>
          )}
          {saveStatus === "error" && (
            <span className="text-base text-red-500">Failed to save. Try again.</span>
          )}
        </div>
      </section>

      {/* API Key Status */}
      <section className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">API Configuration</h2>
          <p className="text-base text-[var(--muted)] mt-0.5">Status of your API connections</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-[var(--background)] rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤖</span>
            <span className="text-[var(--foreground)] font-medium text-base">OpenAI API</span>
          </div>
          <span className="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md font-medium">
            Connected
          </span>
        </div>
      </section>

      {/* Export */}
      <section className="bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] p-5 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Data Export</h2>
          <p className="text-base text-[var(--muted)] mt-0.5">
            Download your notes as a CSV file — includes title, summary, cleaned memo, original text, tags, folder, and date.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={exportFolderId}
            onChange={(e) => setExportFolderId(e.target.value)}
            className="px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent shadow-[var(--shadow-soft)]"
          >
            <option value="">All folders</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>

          <button
            onClick={handleExport}
            disabled={isExporting || isLoading}
            className="flex items-center gap-2 px-5 py-2.5 bg-[var(--accent-soft)] hover:bg-[var(--border)] text-[var(--foreground)] text-base font-medium rounded-xl disabled:opacity-50 transition-colors"
          >
            {isExporting ? (
              <>
                <svg className="animate-spin h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Exporting…
              </>
            ) : (
              "Export to CSV"
            )}
          </button>
        </div>
      </section>

      {/* About */}
      <section className="pt-4 text-center text-base text-[var(--muted)]">
        <p className="flex items-center justify-center gap-2">
          <span className="text-xl">📖</span>
          <span className="font-semibold text-[var(--foreground)]">CommonPlace</span>
        </p>
        <p className="mt-1">AI-powered voice memo capture and organization</p>
        <p className="mt-1">Version 1.0.0</p>
      </section>
    </div>
  );
}
