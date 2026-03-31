"use client";

// BEGINNER SAFE - teammate task area

import { useState } from "react";

export function NewsletterSignupForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();

    if (!email.includes("@")) {
      setMessage("Please enter a valid email address.");
      return;
    }

    const res = await fetch("/api/newsletter-signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    if (!res.ok) {
      setMessage("Could not save your signup right now.");
      return;
    }

    setMessage("You are subscribed. Watch for the next issue.");
    setEmail("");
  }

  return (
    <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-2xl bg-slate-50 p-4">
      <label htmlFor="newsletter-email" className="text-sm font-semibold text-slate-800">
        Join the research opportunities newsletter
      </label>
      <input
        id="newsletter-email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your_email@virginia.edu"
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
      />
      <button
        type="submit"
        className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white hover:bg-slate-800"
      >
        Sign up
      </button>
      {message ? <p className="text-sm text-slate-700">{message}</p> : null}
    </form>
  );
}
