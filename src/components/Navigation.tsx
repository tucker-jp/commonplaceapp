"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  {
    href: "/",
    label: "Capture",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="9" y="2" width="6" height="11" rx="3" />
        <path d="M5 10v1a7 7 0 0014 0v-1" />
        <path d="M12 19v3" />
        <path d="M8 22h8" />
      </svg>
    ),
  },
  {
    href: "/folders",
    label: "Folders",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-3.5-3.5" />
      </svg>
    ),
  },
  {
    href: "/library",
    label: "Library",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h16" />
        <path d="M4 10h16" />
        <path d="M4 14h16" />
        <path d="M4 18h16" />
      </svg>
    ),
  },
  {
    href: "/ask",
    label: "AskNotes",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 5h12a4 4 0 014 4v1a4 4 0 01-4 4H9l-4 4v-4H4a4 4 0 01-4-4V9a4 4 0 014-4z" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 6h16" />
        <path d="M6 6v4" />
        <path d="M4 12h16" />
        <path d="M12 12v4" />
        <path d="M4 18h16" />
        <path d="M18 18v-4" />
      </svg>
    ),
  },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Don't render nav on auth pages
  if (pathname.startsWith("/auth")) return null;

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-80 flex-col bg-[var(--sidebar)] text-[var(--sidebar-ink)] border-r border-[var(--border)] shadow-[var(--shadow-soft)] z-30">
        {/* Logo */}
        <div className="px-6 py-6 border-b border-[var(--border)]">
          <Link href="/" className="flex items-center gap-4">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/70 text-[var(--accent-strong)] shadow-[var(--shadow-soft)]">
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 5h6a3 3 0 013 3v11a3 3 0 00-3-3H3z" />
                <path d="M21 5h-6a3 3 0 00-3 3v11a3 3 0 013-3h6z" />
              </svg>
            </span>
            <span className="font-semibold text-[var(--foreground)] text-2xl tracking-tight">
              CommonPlace
            </span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-4 py-5 space-y-1.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center gap-3 px-4 py-3.5 rounded-2xl text-lg font-medium transition-all ${
                  isActive
                    ? "bg-[var(--card-strong)] text-[var(--foreground)] shadow-[var(--shadow-soft)] border border-[var(--border)]"
                    : "text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-white/70"
                }`}
              >
                <span
                  className={`grid h-10 w-10 place-items-center rounded-xl transition-colors ${
                    isActive
                      ? "bg-[var(--accent-soft)] text-[var(--accent-strong)]"
                      : "bg-white/70 text-[var(--muted)] group-hover:text-[var(--foreground)]"
                  }`}
                >
                  <span className="h-5 w-5">{item.icon}</span>
                </span>
                <span className="tracking-tight">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        {status === "authenticated" && session?.user && (
          <div className="px-6 py-5 border-t border-[var(--border)]">
            <p className="text-sm text-[var(--muted)] truncate mb-2">
              {session.user.email}
            </p>
            <button
              onClick={() => signOut()}
              className="text-base text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Spacer so flex-1 main content sits to the right of the fixed sidebar */}
      <div className="hidden lg:block w-80 shrink-0" aria-hidden="true" />

      {/* ── Mobile bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[var(--sidebar)] border-t border-[var(--border)] z-30 flex">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-2 py-3 text-sm font-medium transition-colors ${
                isActive
                  ? "text-[var(--accent)]"
                  : "text-[var(--muted)] hover:text-[var(--foreground)]"
              }`}
            >
              <span className="h-5 w-5">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
