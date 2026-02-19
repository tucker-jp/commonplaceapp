"use client";

import { useState } from "react";

interface NoteInputProps {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
}

export function NoteInput({
  onSubmit,
  disabled = false,
  placeholder = "Type your thought here...",
}: NoteInputProps) {
  const [text, setText] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (text.trim()) {
      onSubmit(text.trim());
      setText("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Cmd/Ctrl + Enter
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={5}
          className="w-full px-5 py-4 bg-[var(--card-strong)] border border-[var(--border)] rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-lg text-[var(--foreground)] placeholder-[var(--muted)] shadow-[var(--shadow-soft)]"
        />

        <div className="flex items-center justify-between mt-2">
          <p className="hidden sm:block text-sm text-[var(--muted)]">
            Cmd/Ctrl + Enter to submit
          </p>

          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="px-6 py-3 bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white text-base font-semibold rounded-xl hover:brightness-105 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] focus:ring-offset-2 focus:ring-offset-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Capture
          </button>
        </div>
      </div>
    </form>
  );
}
