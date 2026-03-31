// BEGINNER SAFE - teammate task area

const faqs = [
  {
    q: "How often are lab opportunities updated?",
    a: "Survey outreach runs twice per semester. If a lab does not respond, the last approved version remains with its original timestamp.",
  },
  {
    q: "Does this guarantee a position in a lab?",
    a: "No. This is a starter hub that improves discovery and outreach, but each lab controls final selection.",
  },
  {
    q: "What if a summary looks inaccurate?",
    a: "All summaries are reviewable by admins, and manual edits can override generated text.",
  },
];

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-10">
      <h1 className="text-3xl font-extrabold text-slate-900">FAQ</h1>
      <div className="mt-6 space-y-4">
        {faqs.map((item) => (
          <article key={item.q} className="rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="font-bold text-slate-900">{item.q}</h2>
            <p className="mt-2 text-sm text-slate-700">{item.a}</p>
          </article>
        ))}
      </div>
      <p className="mt-6 text-sm text-slate-600">TODO(owner=teammate): Add 4-6 more FAQs from user interviews.</p>
    </section>
  );
}
