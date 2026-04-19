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
  {
    q: "Who can use this platform?",
    a: "Any UVA undergraduate can browse opportunities. The content is especially designed to help first- and second-year students who are exploring research for the first time.",
  },
  {
    q: "Why are some labs not listed yet?",
    a: "A lab appears when there is an approved latest snapshot. If no new survey response arrives, the previous approved entry remains; if none has ever been approved, the lab will not appear.",
  },
  {
    q: "Should I email a lab even if I feel underqualified?",
    a: "Yes. Many labs value curiosity and commitment as much as prior experience. Use the listed requirements to tailor a concise, specific message showing why you are interested.",
  },
  {
    q: "How can I receive updates automatically?",
    a: "Use the newsletter signup on the home page. You can unsubscribe later through the standard email unsubscribe flow if your team enables it.",
  },
  {
    q: "Can faculty or admins fix mistakes quickly?",
    a: "Yes. Admins can edit summaries and republish issue content, and faculty can submit updated survey responses in the next outreach cycle.",
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
    </section>
  );
}
