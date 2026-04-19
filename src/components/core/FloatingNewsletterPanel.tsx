"use client";

import { useState } from "react";
import { NewsletterSignupForm } from "@/components/beginner-safe/NewsletterSignupForm";

export function FloatingNewsletterPanel() {
  const [isOpen, setIsOpen] = useState(true);

  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-0 z-40 md:bottom-auto md:top-1/2 md:-translate-y-1/2">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="rounded-l-xl border border-slate-300 bg-white px-3 py-3 text-xs font-extrabold uppercase tracking-[0.08em] text-slate-800 shadow-lg transition hover:bg-slate-50"
          aria-label="Open newsletter signup panel"
        >
          Stay in the loop
        </button>
      </div>
    );
  }

  return (
    <aside className="fixed bottom-4 right-4 z-40 w-[min(23rem,calc(100vw-2rem))] rounded-2xl border border-slate-300 bg-white shadow-xl md:bottom-auto md:top-1/2 md:-translate-y-1/2">
      <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-900">
          Stay in the loop
        </h2>
        <button
          type="button"
          onClick={() => setIsOpen(false)}
          className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
          aria-label="Collapse newsletter signup panel"
        >
          Collapse
        </button>
      </div>
      <div className="px-4 pb-4">
        <p className="mt-3 text-sm text-slate-700">
          Get curated opportunity updates generated from reviewed faculty submissions.
        </p>
        <NewsletterSignupForm />
      </div>
    </aside>
  );
}
