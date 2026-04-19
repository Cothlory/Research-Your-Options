// CORE LOGIC - avoid editing unless assigned

import Link from "next/link";

export function NavBar() {
  return (
    <header className="border-b border-slate-200 bg-[var(--background)]">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-extrabold tracking-wide text-slate-900">
          Research Starters Hub
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium text-slate-700">
          <Link href="/opportunities">Opportunities</Link>
          <Link href="/about">About</Link>
          <Link href="/faq">FAQ</Link>
          <Link href="/admin">Admin</Link>
        </div>
      </nav>
    </header>
  );
}
