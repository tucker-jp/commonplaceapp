"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setIsLoading(false);
      setError(data.error || "Registration failed");
      return;
    }

    // Auto-login after successful registration
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl: "/",
    });

    setIsLoading(false);

    if (result?.ok) {
      router.push("/");
      router.refresh();
    } else {
      setError("Account created. Please sign in.");
      router.push("/auth/login");
    }
  };

  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--card)] rounded-2xl shadow-[var(--shadow-soft)] border border-[var(--border)] p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
          Create your account
        </h2>

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

          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Name <span className="text-[var(--muted)]">(optional)</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-[var(--border)] rounded-lg bg-[var(--card-strong)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] shadow-[var(--shadow-soft)]"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-[var(--foreground)] mb-1"
            >
              Password
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
              Confirm Password
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

          {error && (
            <p className="text-sm text-rose-600">{error}</p>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-strong)] disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
          >
            {isLoading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Already have an account?{" "}
          <Link
            href="/auth/login"
            className="text-[var(--accent)] hover:text-[var(--accent-strong)] font-medium"
          >
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
