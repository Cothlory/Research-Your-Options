import Link from "next/link";
import { NewsletterSignupForm } from "@/components/beginner-safe/NewsletterSignupForm";
import { homeBullets, homeHero } from "@/content/home";

export default function Home() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <div className="grid gap-10 md:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <p className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-800">
            UVA Undergraduate Research MVP
          </p>
          <h1 className="max-w-2xl text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            {homeHero.title}
          </h1>
          <p className="max-w-xl text-base leading-7 text-slate-700">{homeHero.subtitle}</p>
          <ul className="space-y-3 text-sm text-slate-800">
            {homeBullets.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/opportunities"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse opportunities
            </Link>
            <Link
              href="/admin"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Open admin dashboard
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold text-slate-900">Stay in the loop</h2>
          <p className="mt-2 text-sm text-slate-700">
            Get curated research opportunity updates generated from reviewed faculty submissions.
          </p>
          <NewsletterSignupForm />
        </div>
      </div>
    </section>
  );
}
