"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "";

  const [email, setEmail] = useState(initialEmail);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setMessage(null);

    const res = await fetch("/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Failed to request password reset");
      return;
    }

    setStatus("sent");
    setMessage(
      data.message || "If you have an account with that email, a reset link has been sent."
    );
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="email"
          className="block text-sm font-medium text-[var(--foreground)] mb-1"
        >
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card-strong)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
        />
      </div>

      {message && (
        <p className={`text-sm ${status === "error" ? "text-rose-600" : "text-[var(--muted)]"}`}>
          {message}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-strong)] disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
      >
        {status === "loading" ? "Sending link..." : "Send reset link"}
      </button>
    </form>
  );
}

export default function ForgotPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--card)] rounded-2xl shadow-[var(--shadow-soft)] border border-[var(--border)] p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
          Reset your password
        </h2>

        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-[var(--muted)]">
              Loading...
            </div>
          }
        >
          <ForgotPasswordForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Remembered it?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--accent)] hover:text-[var(--accent-strong)] font-medium"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
