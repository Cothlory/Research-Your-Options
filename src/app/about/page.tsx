// BEGINNER SAFE - teammate task area

import Link from "next/link";

const highlights = [
  {
    title: "Why We Built It",
    body: "Students told us that research opportunities were hard to discover and compare. We built a single place where opportunities are current, readable, and easier to act on.",
  },
  {
    title: "Who It Supports",
    body: "The platform supports students exploring labs, faculty sharing updates with less friction, and admins who review and publish trusted information.",
  },
  {
    title: "How Trust Is Maintained",
    body: "Every listing carries a visible timestamp, and updates only appear after review. If a lab does not respond in a cycle, the previous approved entry remains clearly dated.",
  },
];

const walkthrough = [
  "Faculty receive a periodic survey link and submit recruiting updates.",
  "Ingestion validates responses and optionally enriches details from lab websites.",
  "Admins review summaries, edit when needed, and approve the latest snapshot.",
  "Approved snapshots power the student opportunities page and newsletter exports.",
];

const screenLinks = [
  {
    label: "Opportunities Listing",
    href: "/opportunities",
    description: "Student-facing cards with recruiting status, summary, and last-updated timestamp.",
  },
  {
    label: "Admin Dashboard",
    href: "/admin",
    description: "Review queue and publication controls for keeping information accurate.",
  },
  {
    label: "FAQ",
    href: "/faq",
    description: "Common questions from students and faculty discovered during interviews.",
  },
];

export default function AboutPage() {
  return (
    <section className="mx-auto max-w-5xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">About Research Your Options</h1>
      <p className="mt-4 max-w-3xl text-slate-700">
        Research Your Options helps undergraduate students discover research opportunities by turning
        faculty survey responses into clear, reviewed listings and newsletter-ready updates.
      </p>

      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {highlights.map((item) => (
          <article key={item.title} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-slate-900">
              {item.title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">{item.body}</p>
          </article>
        ))}
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">Team Story</h2>
        <p className="mt-3 text-slate-700">
          This MVP was built in UVA ENGR 1020 through user interviews, workflow mapping, and rapid
          iteration with faculty and student feedback.
        </p>
        <p className="mt-3 text-slate-700">
          Our goal is practical: reduce discovery friction, increase confidence for first outreach,
          and keep maintenance manageable for labs.
        </p>
      </div>

      <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-xl font-bold text-slate-900">How The Product Works</h2>
        <ol className="mt-3 list-decimal space-y-2 pl-5 text-slate-700">
          {walkthrough.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>
    </section>
  );
}
