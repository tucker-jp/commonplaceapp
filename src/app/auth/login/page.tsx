"use client";

import { Suspense } from "react";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });

    setIsLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
    } else if (result?.ok) {
      router.push(callbackUrl);
      router.refresh();
    }
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
      </div>

      {error && (
        <p className="text-sm text-rose-600">{error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-[var(--accent)] hover:bg-[var(--accent-strong)] disabled:opacity-60 text-white font-medium rounded-lg transition-colors"
      >
        {isLoading ? "Signing in..." : "Sign in"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="w-full max-w-sm">
      <div className="bg-[var(--card)] rounded-2xl shadow-[var(--shadow-soft)] border border-[var(--border)] p-8">
        <h2 className="text-xl font-semibold text-[var(--foreground)] mb-6">
          Sign in to your account
        </h2>

        <Suspense
          fallback={
            <div className="h-48 flex items-center justify-center text-[var(--muted)]">
              Loading...
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-[var(--muted)]">
          Don&apos;t have an account?{" "}
          <Link
            href="/auth/register"
            className="text-[var(--accent)] hover:text-[var(--accent-strong)] font-medium"
          >
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
