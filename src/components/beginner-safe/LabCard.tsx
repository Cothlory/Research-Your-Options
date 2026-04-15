"use client";

// BEGINNER SAFE - teammate task area

import { format } from "date-fns";
import { StatusBadge } from "@/components/beginner-safe/StatusBadge";

export interface LabCardModel {
  id: string;
  labName: string;
  recruitingUndergrads: boolean;
  researchArea?: string | null;
  summaryText?: string | null;
  websiteUrl?: string | null;
  updatedAt: string;
}

export function LabCard({ lab }: { lab: LabCardModel }) {
  const updated = format(new Date(lab.updatedAt), "MMM d, yyyy");

  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <h3 className="text-lg font-bold text-slate-900">{lab.labName}</h3>
        <StatusBadge
          label={lab.recruitingUndergrads ? "Recruiting" : "Not Recruiting"}
          tone={lab.recruitingUndergrads ? "success" : "warning"}
        />
      </div>
      <p className="mt-2 text-sm text-slate-700">{lab.summaryText || "Summary pending review."}</p>
      {lab.researchArea ? (
        <p className="mt-2 text-sm text-slate-600">
          <span className="font-semibold">Research area:</span> {lab.researchArea}
        </p>
      ) : null}
      {lab.websiteUrl ? (
        <a
          href={lab.websiteUrl}
          className="mt-3 inline-block text-sm font-semibold text-indigo-700 underline-offset-2 hover:underline"
          target="_blank"
          rel="noreferrer"
        >
          Lab website
        </a>
      ) : null}
      <p className="mt-4 text-xs font-medium text-slate-500">Last updated: {updated}</p>
    </article>
  );
}
