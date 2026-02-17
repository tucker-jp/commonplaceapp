"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [customInstructions, setCustomInstructions] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    async function loadSettings() {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setCustomInstructions(data.customLLMInstructions ?? "");
        }
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

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
    "w-full px-4 py-3 bg-white border border-[#e8ddd3] rounded-xl text-[#1c150d] placeholder-[#9a8478] focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent resize-none";

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-[#1c150d]">Settings</h1>

      {/* Custom LLM Instructions */}
      <section className="bg-white rounded-2xl border border-[#e8ddd3] shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1c150d]">Custom AI Instructions</h2>
          <p className="text-sm text-[#9a8478] mt-0.5">
            Customize how the AI analyzes and processes your notes
          </p>
        </div>

        {isLoading ? (
          <div className="h-24 bg-[#faf6f0] rounded-xl animate-pulse" />
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
            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
          >
            {isSaving ? "Saving..." : "Save Instructions"}
          </button>
          {saveStatus === "success" && (
            <span className="text-sm text-emerald-600 font-medium">Saved!</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-500">Failed to save. Try again.</span>
          )}
        </div>
      </section>

      {/* API Key Status */}
      <section className="bg-white rounded-2xl border border-[#e8ddd3] shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1c150d]">API Configuration</h2>
          <p className="text-sm text-[#9a8478] mt-0.5">Status of your API connections</p>
        </div>

        <div className="flex items-center justify-between p-3 bg-[#faf6f0] rounded-xl">
          <div className="flex items-center gap-3">
            <span className="text-xl">🤖</span>
            <span className="text-[#1c150d] font-medium text-sm">OpenAI API</span>
          </div>
          <span className="px-2.5 py-1 text-xs bg-emerald-100 text-emerald-700 rounded-md font-medium">
            Connected
          </span>
        </div>
      </section>

      {/* Export */}
      <section className="bg-white rounded-2xl border border-[#e8ddd3] shadow-sm p-6 space-y-4">
        <div>
          <h2 className="text-lg font-semibold text-[#1c150d]">Data Export</h2>
          <p className="text-sm text-[#9a8478] mt-0.5">Export your notes to CSV format</p>
        </div>

        <button className="px-4 py-2 bg-[#f0e8df] hover:bg-[#e8ddd3] text-[#3d2e22] text-sm font-medium rounded-lg transition-colors">
          Export All Notes
        </button>
      </section>

      {/* About */}
      <section className="pt-4 text-center text-sm text-[#9a8478]">
        <p className="flex items-center justify-center gap-2">
          <span className="text-xl">📖</span>
          <span className="font-semibold text-[#3d2e22]">CommonPlace</span>
        </p>
        <p className="mt-1">AI-powered voice memo capture and organization</p>
        <p className="mt-1">Version 1.0.0</p>
      </section>
    </div>
  );
}
