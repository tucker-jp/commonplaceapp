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
    try {
      // Single request: analyze + categorize + save
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save note");
      }

      const { folderName } = await res.json();
      setSuccessMessage(`Saved to ${folderName}!`);
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
    <div className="flex flex-col items-center gap-8 py-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-[#1c150d] mb-2">Capture a Thought</h1>
        <p className="text-[#9a8478]">Record a voice memo or type your thought</p>
      </div>

      <RecordButton
        isRecording={isRecording}
        onRecordingStart={() => setIsRecording(true)}
        onRecordingStop={() => setIsRecording(false)}
        onRecordingComplete={handleRecordingComplete}
        disabled={isProcessing}
      />

      {isProcessing && (
        <div className="flex items-center gap-2 text-orange-600 text-sm font-medium">
          <div className="animate-spin h-4 w-4 border-2 border-orange-500 border-t-transparent rounded-full" />
          Processing…
        </div>
      )}

      {successMessage && !isProcessing && (
        <div className="w-full max-w-md p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
          <p className="text-sm text-emerald-700 font-medium">{successMessage}</p>
        </div>
      )}

      {error && !isProcessing && (
        <div className="w-full max-w-md p-4 bg-red-50 border border-red-200 rounded-xl">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {transcription && !isRecording && (
        <div className="w-full max-w-md p-4 bg-white rounded-xl border border-[#e8ddd3] shadow-sm">
          <p className="text-xs font-medium uppercase tracking-wide text-[#9a8478] mb-2">
            Transcription
          </p>
          <p className="text-[#1c150d] text-sm">{transcription}</p>
        </div>
      )}

      <div className="flex items-center gap-4 w-full max-w-md">
        <div className="flex-1 h-px bg-[#e8ddd3]" />
        <span className="text-[#9a8478] text-sm">or type</span>
        <div className="flex-1 h-px bg-[#e8ddd3]" />
      </div>

      <NoteInput onSubmit={handleTextSubmit} disabled={isProcessing || isRecording} />
    </div>
  );
}
