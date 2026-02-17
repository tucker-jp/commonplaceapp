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
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          rows={3}
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-white placeholder-gray-400"
        />

        <div className="flex items-center justify-between mt-2">
          <p className="text-xs text-gray-400">
            Press Cmd/Ctrl + Enter to submit
          </p>

          <button
            type="submit"
            disabled={disabled || !text.trim()}
            className="px-4 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-sm font-medium rounded-lg hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Capture
          </button>
        </div>
      </div>
    </form>
  );
}
