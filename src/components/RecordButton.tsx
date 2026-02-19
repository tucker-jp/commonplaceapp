"use client";

import { useRef, useState, useEffect } from "react";

interface RecordButtonProps {
  isRecording: boolean;
  onRecordingStart: () => void;
  onRecordingStop: () => void;
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
  maxDuration?: number; // in seconds
}

export function RecordButton({
  isRecording,
  onRecordingStart,
  onRecordingStop,
  onRecordingComplete,
  disabled = false,
  maxDuration = 90,
}: RecordButtonProps) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [duration, setDuration] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Timer for recording duration
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
      interval = setInterval(() => {
        setDuration((d) => {
          if (d >= maxDuration) {
            stopRecording();
            return d;
          }
          return d + 1;
        });
      }, 1000);
    } else {
      setDuration(0);
    }
    return () => clearInterval(interval);
  }, [isRecording, maxDuration]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        onRecordingComplete(audioBlob);

        // Stop all tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(1000); // Collect data every second
      onRecordingStart();
    } catch (err) {
      console.error("Error starting recording:", err);
      setError("Could not access microphone. Please grant permission.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
      onRecordingStop();
    }
  };

  const handleClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`relative w-40 h-40 rounded-full transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-[var(--accent-soft)] disabled:opacity-50 disabled:cursor-not-allowed
          ${isRecording
            ? "bg-rose-600 hover:bg-rose-700 scale-105 shadow-[var(--shadow-lift)]"
            : "bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] hover:brightness-105 shadow-[var(--shadow-lift)]"
          }`}
      >
        {/* Pulse animation when recording */}
        {isRecording && (
          <span className="absolute inset-0 rounded-full bg-rose-500 animate-ping opacity-30" />
        )}

        {/* Icon */}
        <span className="relative text-white text-6xl">
          {isRecording ? "⏹️" : "🎙️"}
        </span>
      </button>

      {/* Duration display */}
      {isRecording && (
        <div className="text-center">
          <p className="text-3xl font-mono text-rose-600">
            {formatDuration(duration)}
          </p>
          <p className="text-base text-[var(--muted)]">
            Max {formatDuration(maxDuration)}
          </p>
        </div>
      )}

      {/* Instructions */}
      {!isRecording && !error && (
        <p className="text-base text-[var(--muted)]">
          Tap to start recording
        </p>
      )}

      {/* Error message */}
      {error && (
        <p className="text-base text-rose-600 text-center max-w-xs">
          {error}
        </p>
      )}
    </div>
  );
}
