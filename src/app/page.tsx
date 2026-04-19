import Link from "next/link";
import { FloatingNewsletterPanel } from "@/components/core/FloatingNewsletterPanel";
import {
  homeBullets,
  homeHero,
  homeQuickFacts,
  homeStarterChecklist,
  homeStudentResources,
  homeSystemSteps,
} from "@/content/home";

export default function Home() {
  return (
    <>
      <FloatingNewsletterPanel />
      <section className="mx-auto max-w-6xl px-4 py-12 md:py-14">
      <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
          <p className="inline-flex rounded-full bg-teal-100 px-3 py-1 text-xs font-extrabold uppercase tracking-[0.18em] text-teal-800">
            UVA Research Your Options
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-extrabold leading-tight text-slate-900 md:text-5xl">
            {homeHero.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700">{homeHero.subtitle}</p>

          <ul className="mt-6 space-y-3 text-sm text-slate-800">
            {homeBullets.map((item) => (
              <li key={item} className="flex items-start gap-2">
                <span className="mt-1.5 inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/opportunities"
              className="rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              Browse opportunities
            </Link>
            <a
              href="https://undergraduateresearch.virginia.edu/students/getting-started"
              target="_blank"
              rel="noreferrer"
              className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              UVA getting-started guide
            </a>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Platform at a glance</h2>
            <div className="mt-4 space-y-3">
              {homeQuickFacts.map((fact) => (
                <article key={fact.label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  <h3 className="text-xs font-extrabold uppercase tracking-[0.08em] text-slate-900">
                    {fact.label}
                  </h3>
                  <p className="mt-1 text-sm text-slate-700">{fact.value}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">What to do first</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-6 text-slate-700">
              {homeStarterChecklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 md:p-8">
        <h2 className="text-2xl font-extrabold text-slate-900">UVA resources for getting started</h2>
        <p className="mt-2 text-sm text-slate-700">
          Use these links to improve your outreach strategy, including cold email writing, and to
          find additional UVA guidance.
        </p>
        <div className="mt-5 grid gap-4 md:grid-cols-2">
          {homeStudentResources.map((resource) => (
            <a
              key={resource.title}
              href={resource.href}
              target="_blank"
              rel="noreferrer"
              className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <h3 className="text-base font-bold text-slate-900">{resource.title}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-700">{resource.description}</p>
              <p className="mt-3 text-xs font-semibold uppercase tracking-[0.08em] text-teal-700">
                Open resource
              </p>
            </a>
          ))}
        </div>
      </div>

      </section>
    </>
  );
}
