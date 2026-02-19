"use client";

import { useEffect, useRef, useState } from "react";
import { getTagColor } from "@/lib/tagColors";

interface Note {
  id: string;
  title: string | null;
  summary: string | null;
  tags: string[];
  originalText: string;
  createdAt: string;
  folder: { id: string; name: string };
}

interface Folder {
  id: string;
  name: string;
}

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  notes?: Note[];
};

function buildSnippet(text: string, max = 160) {
  if (text.length <= max) return text;
  return `${text.slice(0, max)}...`;
}

export default function AskNotesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isAsking, setIsAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [folderScope, setFolderScope] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function loadFolders() {
      try {
        const res = await fetch("/api/folders");
        if (res.ok) {
          const data: Folder[] = await res.json();
          setFolders(data);
        }
      } catch {
        // ignore folder load errors for scope
      }
    }
    loadFolders();
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isAsking]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const question = input.trim();
    if (!question) return;

    setInput("");
    setError(null);

    const userMessage: Message = {
      id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      role: "user",
      content: question,
    };
    setMessages((prev) => [...prev, userMessage]);

    setIsAsking(true);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: question,
          folderId: folderScope || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "AI search failed");
      }

      const data = await res.json();
      const assistantMessage: Message = {
        id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        role: "assistant",
        content: data.answer || "Here are the most relevant notes I found.",
        notes: Array.isArray(data.notes) ? data.notes : [],
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "AI search failed");
    } finally {
      setIsAsking(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-semibold text-[var(--foreground)]">AskNotes</h1>
          <p className="text-base text-[var(--muted)]">
            Chat with your notes to surface answers and connections.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <label
            htmlFor="askScope"
            className="text-base text-[var(--muted)] whitespace-nowrap"
          >
            Scope
          </label>
          <select
            id="askScope"
            value={folderScope}
            onChange={(e) => setFolderScope(e.target.value)}
            className="min-w-[200px] px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
          >
            <option value="">All folders</option>
            {folders.map((folder) => (
              <option key={folder.id} value={folder.id}>
                {folder.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-4">
        {messages.length === 0 ? (
          <div className="text-center py-16 text-[var(--muted)]">
            <span className="text-4xl text-[var(--muted)]">
              <svg
                aria-hidden="true"
                className="h-10 w-10 mx-auto"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4 5h12a4 4 0 014 4v1a4 4 0 01-4 4H9l-4 4v-4H4a4 4 0 01-4-4V9a4 4 0 014-4z" />
              </svg>
            </span>
            <p className="mt-4 text-base">
              Ask about decisions, summaries, or anything inside your notes.
            </p>
          </div>
        ) : (
          messages.map((message) => {
            const isUser = message.role === "user";
            return (
              <div
                key={message.id}
                className={`flex ${isUser ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`w-full max-w-3xl rounded-2xl border shadow-[var(--shadow-soft)] p-5 ${
                    isUser
                      ? "bg-[var(--accent-soft)] border-[var(--border)]"
                      : "bg-[var(--card)] border-[var(--border)]"
                  }`}
                >
                  <p className="text-sm uppercase tracking-wide text-[var(--muted)] mb-2">
                    {isUser ? "You" : "AskNotes"}
                  </p>
                  <p className="text-base text-[var(--foreground)] whitespace-pre-wrap">
                    {message.content}
                  </p>

                  {message.notes && message.notes.length > 0 && (
                    <div className="mt-4 space-y-3">
                      <p className="text-sm text-[var(--muted)]">
                        Related notes ({message.notes.length})
                      </p>
                      {message.notes.map((note) => (
                        <div
                          key={note.id}
                          className="p-4 bg-[var(--card-strong)] rounded-2xl border border-[var(--border)] shadow-[var(--shadow-soft)] hover-lift"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-semibold text-[var(--foreground)]">
                              {note.title ?? "Untitled"}
                            </h3>
                            <span className="shrink-0 text-xs px-2.5 py-1 bg-[var(--accent-soft)] text-[var(--foreground)] rounded-lg font-medium">
                              {note.folder.name}
                            </span>
                          </div>
                          <p className="mt-1.5 text-sm text-[var(--sidebar-ink)]">
                            {buildSnippet(note.summary ?? note.originalText)}
                          </p>
                          {note.tags.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {note.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className={`px-2.5 py-1 text-xs rounded-md font-medium ${getTagColor(tag)}`}
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
        {isAsking && (
          <div className="flex justify-start">
            <div className="w-full max-w-3xl rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-[var(--shadow-soft)] p-5">
              <p className="text-sm uppercase tracking-wide text-[var(--muted)] mb-2">
                AskNotes
              </p>
              <p className="text-base text-[var(--foreground)]">Thinking...</p>
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-[var(--shadow-soft)] space-y-4"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold text-[var(--foreground)]">Ask a question</h2>
            <p className="text-base text-[var(--muted)]">
              Try "What did I plan for the product launch?" or "Summarize my travel ideas."
            </p>
          </div>
          <button
            type="submit"
            disabled={isAsking || !input.trim()}
            className="px-5 py-2.5 text-base bg-[linear-gradient(135deg,var(--accent),var(--accent-strong))] text-white rounded-xl hover:brightness-105 disabled:opacity-50 transition-all"
          >
            {isAsking ? "Asking..." : "Ask AI"}
          </button>
        </div>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          rows={3}
          placeholder="Ask in plain language..."
          className="w-full px-4 py-3 bg-[var(--card-strong)] border border-[var(--border)] rounded-xl text-base text-[var(--foreground)] placeholder-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)] resize-none"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
      </form>
    </div>
  );
}
