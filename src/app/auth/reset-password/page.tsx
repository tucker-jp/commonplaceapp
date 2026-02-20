"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (!token) {
      setStatus("error");
      setMessage("Missing reset token.");
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match");
      return;
    }

    setStatus("loading");

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setStatus("error");
      setMessage(data.error || "Failed to reset password");
      return;
    }

    setStatus("success");
    setMessage("Password updated. You can sign in now.");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label
          htmlFor="password"
          className="block text-sm font-medium text-[var(--foreground)] mb-1"
        >
          New password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card-strong)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
        />
        <p className="mt-1 text-xs text-[var(--muted)]">
          8+ characters with at least one letter and number
        </p>
      </div>

      <div>
        <label
          htmlFor="confirmPassword"
          className="block text-sm font-medium text-[var(--foreground)] mb-1"
        >
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
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
        {status === "loading" ? "Updating..." : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--card)] rounded-2xl shadow-[var(--shadow-soft)] border border-[var(--border)] p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
          Choose a new password
        </h2>

        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-[var(--muted)]">
              Loading...
            </div>
          }
        >
          <ResetPasswordForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Ready to sign in?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--accent)] hover:text-[var(--accent-strong)] font-medium"
          >
            Go to login
          </Link>
        </p>
      </div>
    </div>
  );
}
