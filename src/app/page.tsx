"use client";

import { useState, useEffect } from "react";
import { RecordButton } from "@/components/RecordButton";
import { NoteInput } from "@/components/NoteInput";

interface Folder {
  id: string;
  name: string;
}

export default function Home() {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcription, setTranscription] = useState("");
  const [folders, setFolders] = useState<Folder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [recommendationWarning, setRecommendationWarning] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  useEffect(() => {
    fetch("/api/folders")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setFolders(data);
        }
      })
      .catch(() => setError("Failed to load folders"));
  }, []);

  const handleTextSubmit = async (text: string) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    setRecommendationWarning(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save note");
      }

      const data = await res.json();
      const { folderName } = data;
      setSuccessMessage(`Saved to ${folderName}`);
      if (data.recommendations?.error) {
        setRecommendationWarning(data.recommendations.error);
      }
      setTranscription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setError(null);
    setSuccessMessage(null);
    setRecommendationWarning(null);
    try {
      const formData = new FormData();
      formData.append("audio", audioBlob, "recording.webm");

      const transcribeRes = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!transcribeRes.ok) throw new Error("Transcription failed");
      const { text } = await transcribeRes.json();

      setTranscription(text);
      await handleTextSubmit(text);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="relative text-center pt-2 page-enter stagger-1">
        <button
          onClick={() => setShowAbout(true)}
          className="absolute right-0 top-0 mt-2 text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors cursor-pointer"
        >
          About
        </button>
        <h1 className="text-4xl font-semibold text-[var(--foreground)] mb-1">
          Capture a Thought
        </h1>
        <p className="text-base text-[var(--muted)]">
          Record a voice memo or type your thought
        </p>
      </div>

      {/* Record button */}
      <div className="flex justify-center page-enter stagger-2">
        <RecordButton
          isRecording={isRecording}
          onRecordingStart={() => setIsRecording(true)}
          onRecordingStop={() => setIsRecording(false)}
          onRecordingComplete={handleRecordingComplete}
          disabled={isProcessing}
        />
      </div>


      {/* Status notifications */}
      {isProcessing && (
        <div className="w-full p-5 bg-[var(--accent-soft)] border border-[var(--border)] rounded-2xl flex items-center gap-4 shadow-[var(--shadow-soft)]">
          <svg className="animate-spin h-6 w-6 flex-shrink-0 text-[var(--accent)]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div>
            <p className="font-semibold text-[var(--foreground)]">Analyzing your memo...</p>
            <p className="text-sm text-[var(--muted)] mt-0.5">Transcribing, tagging, and filing your thought</p>
          </div>
        </div>
      )}

      {successMessage && !isProcessing && (
        <div className="w-full p-5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-4 shadow-[var(--shadow-soft)]">
          <span className="text-3xl flex-shrink-0 text-emerald-700">
            <svg
              aria-hidden="true"
              className="h-7 w-7"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6L9 17l-5-5" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-emerald-800">{successMessage}</p>
            <p className="text-sm text-emerald-600 mt-0.5">Your thought has been captured and organized</p>
          </div>
        </div>
      )}

      {recommendationWarning && !isProcessing && (
        <div className="w-full p-5 bg-amber-50 border border-amber-200 rounded-2xl flex items-center gap-4 shadow-[var(--shadow-soft)]">
          <span className="text-2xl flex-shrink-0 text-amber-700">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.9L3.7 16.4a2 2 0 001.7 3h13.2a2 2 0 001.7-3L13.7 4.9a2 2 0 00-3.4 0z" />
            </svg>
          </span>
          <div>
            <p className="font-semibold text-amber-800">Recommendations not saved</p>
            <p className="text-sm text-amber-700 mt-0.5">{recommendationWarning}</p>
          </div>
        </div>
      )}

      {error && !isProcessing && (
        <div className="w-full p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-4">
          <span className="text-2xl flex-shrink-0 text-red-600">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 9v4" />
              <path d="M12 17h.01" />
              <path d="M10.3 4.9L3.7 16.4a2 2 0 001.7 3h13.2a2 2 0 001.7-3L13.7 4.9a2 2 0 00-3.4 0z" />
            </svg>
          </span>
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
      
{transcription && !isRecording && (
        <div className="w-full p-5 bg-[var(--card)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)]">
          <p className="text-xs font-semibold uppercase tracking-widest text-[var(--muted)] mb-2">
            Transcription
          </p>
          <p className="text-[var(--foreground)]">{transcription}</p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-4 text-[var(--muted)]">
        <div className="flex-1 h-px bg-[var(--border)]" />
        <span className="text-sm">or type</span>
        <div className="flex-1 h-px bg-[var(--border)]" />
      </div>

      {/* Text input - full width */}
      <div className="page-enter stagger-3">
        <NoteInput onSubmit={handleTextSubmit} disabled={isProcessing || isRecording} />
      </div>

      {/* About Modal */}
      {showAbout && (
        <div
          className="fixed inset-0 bg-[rgba(54,42,33,0.25)] backdrop-blur-sm flex items-start justify-center z-50 p-6 pt-12 overflow-y-auto sm:items-center sm:pt-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setShowAbout(false);
          }}
        >
          <div
            className="bg-[var(--card)] rounded-3xl p-8 w-full max-w-lg shadow-[var(--shadow-lift)] border border-[var(--border)]"
            role="dialog"
            aria-modal="true"
            aria-label="About CommonPlace"
          >
            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">What is a Commonplace Book?</h2>
            <p className="text-sm text-[var(--muted)] leading-relaxed mb-6">
              A commonplace book is a personal notebook used since the Renaissance to collect quotes, ideas, observations, and knowledge from reading and daily life. Thinkers like John Locke, Thomas Jefferson, and Marcus Aurelius kept commonplace books to organize their thoughts and make connections across subjects. CommonPlace brings this tradition to the digital age — capture your ideas by voice or text, and let AI help organize them.
            </p>

            <h2 className="text-2xl font-semibold text-[var(--foreground)] mb-4">How to Use CommonPlace</h2>
            <ul className="space-y-3 text-sm text-[var(--muted)] leading-relaxed mb-6">
              <li><span className="font-semibold text-[var(--foreground)]">Capture</span> — Record a voice memo or type a thought. AI transcribes, tags, and files it into the right folder automatically.</li>
              <li><span className="font-semibold text-[var(--foreground)]">Folders</span> — Browse and organize your notes. Create folders with custom AI instructions to control how notes are analyzed.</li>
              <li><span className="font-semibold text-[var(--foreground)]">Library</span> — Track books, movies, and music you{"'"}ve completed or want to check out. Import items from CSV.</li>
              <li><span className="font-semibold text-[var(--foreground)]">Ask</span> — Chat with AI about your notes. Select specific folders to search or ask across everything.</li>
              <li><span className="font-semibold text-[var(--foreground)]">Search</span> — Find notes by keyword or let AI help surface relevant thoughts.</li>
              <li><span className="font-semibold text-[var(--foreground)]">Settings</span> — Set global instructions that guide how AI processes all your notes.</li>
            </ul>

            <button
              onClick={() => setShowAbout(false)}
              className="w-full px-5 py-2.5 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-xl hover:bg-[var(--border)] transition-colors text-base font-medium cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
