"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const navItems = [
  { href: "/", label: "Capture", icon: "🎙️" },
  { href: "/folders", label: "Folders", icon: "📁" },
  { href: "/search", label: "Search", icon: "🔍" },
  { href: "/settings", label: "Settings", icon: "⚙️" },
];

export function Navigation() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  // Don't render nav on auth pages
  if (pathname.startsWith("/auth")) return null;

  return (
    <>
      {/* ── Desktop sidebar ── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-screen w-56 flex-col bg-[#3b1f0f] z-30">
        {/* Logo */}
        <div className="px-5 py-6 border-b border-white/10">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="text-2xl leading-none">📖</span>
            <span className="font-bold text-white text-lg tracking-tight">
              CommonPlace
            </span>
          </Link>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? "bg-orange-500 text-white"
                    : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span className="text-base leading-none">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + logout */}
        {status === "authenticated" && session?.user && (
          <div className="px-4 py-5 border-t border-white/10">
            <p className="text-xs text-white/40 truncate mb-2">
              {session.user.email}
            </p>
            <button
              onClick={() => signOut()}
              className="text-sm text-white/60 hover:text-white transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </aside>

      {/* Spacer so flex-1 main content sits to the right of the fixed sidebar */}
      <div className="hidden lg:block w-56 shrink-0" aria-hidden="true" />

      {/* ── Mobile bottom tab bar ── */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-[#3b1f0f] border-t border-white/10 z-30 flex">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href ||
            (item.href !== "/" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-colors ${
                isActive ? "text-orange-400" : "text-white/50 hover:text-white/80"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
