"use client";

// BEGINNER SAFE - teammate task area

import { format } from "date-fns";
import type { CSSProperties } from "react";
import Image from "next/image";

export interface LabCardModel {
  id: string;
  labName: string;
  recruitingUndergrads: boolean;
  researchArea?: string | null;
  summaryText?: string | null;
  qualifications?: string | null;
  websiteUrl?: string | null;
  updatedAt: string;
}

const UVA_BLUE = "#232D4B";
const UVA_ORANGE = "#E57200";
const UVA_WHITE = "#FFFFFF";
const UVA_LIGHT_BLUE = "#6DA9D2";

const summaryClampStyle: CSSProperties = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 5,
  overflow: "hidden",
};

function extractRequirements(value?: string | null): string[] {
  if (!value?.trim()) {
    return ["Not specified"];
  }

  const items = value
    .replace(/\r\n/g, "\n")
    .split(/\n|;/)
    .map((line) => line.replace(/^[-*\s]+/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3);

  return items.length > 0 ? items : ["Not specified"];
}

export function LabCard({ lab }: { lab: LabCardModel }) {
  const updated = format(new Date(lab.updatedAt), "MMM d, yyyy");
  const requirements = extractRequirements(lab.qualifications);
  const summary = lab.summaryText?.trim() || "Summary pending review.";
  const linkLabel = lab.websiteUrl ? `Visit ${lab.labName} website` : "Link unavailable";

  return (
    <article
      className="relative aspect-square w-full overflow-hidden rounded-sm p-6 shadow-[0_14px_36px_rgba(35,45,75,0.28)]"
      style={{ backgroundColor: UVA_BLUE, color: UVA_WHITE }}
    >
      <div className="grid h-full grid-rows-[minmax(0,1fr)_minmax(0,0.9fr)_auto] gap-5">
        <section className="min-h-0 pr-10">
          <h2 className="max-w-[95%] text-3xl font-black uppercase leading-[0.95] tracking-wide sm:text-4xl">
            {lab.labName}
          </h2>
          <p className="mt-4 text-[1.02rem] leading-snug text-white/92" style={summaryClampStyle}>
            {summary}
          </p>
        </section>

        <section className="min-h-0">
          <div className="flex items-end gap-2">
            <p
              className="text-[1.72rem] font-black uppercase leading-none tracking-wide sm:text-[2rem]"
              style={{ color: UVA_ORANGE }}
            >
              Minimum Requirements
            </p>
            <Image
              src="/assets/mark_o.svg"
              alt=""
              width={36}
              height={36}
              aria-hidden="true"
              className="mb-1 h-8 w-8 shrink-0"
            />
          </div>
          <ul className="mt-3 space-y-1 text-lg leading-tight" style={{ color: UVA_ORANGE }}>
            {requirements.map((item, index) => (
              <li
                key={`${lab.id}-req-${index}`}
                className="break-words whitespace-normal pl-4 leading-snug"
              >
                • {item}
              </li>
            ))}
          </ul>
        </section>

        <section className="pt-1">
          <div className="flex items-end gap-2">
            <p
              className="text-[1.72rem] font-black uppercase leading-none tracking-wide sm:text-[2rem]"
              style={{ color: UVA_LIGHT_BLUE }}
            >
              Link To Lab Website
            </p>
            <Image
              src="/assets/arrow_b.svg"
              alt=""
              width={40}
              height={40}
              aria-hidden="true"
              className="mb-1 h-8 w-8 shrink-0"
            />
          </div>
          {lab.websiteUrl ? (
            <a
              href={lab.websiteUrl}
              className="mt-3 inline-flex items-center text-2xl font-semibold leading-none underline decoration-2 underline-offset-4"
              style={{ color: UVA_LIGHT_BLUE }}
              target="_blank"
              rel="noreferrer"
            >
              {linkLabel}
            </a>
          ) : (
            <p className="mt-3 text-2xl font-semibold leading-none" style={{ color: UVA_LIGHT_BLUE }}>
              {linkLabel}
            </p>
          )}
        </section>
      </div>

      <div className="absolute right-4 top-4 rounded-full border px-2 py-1 text-[0.72rem] font-bold uppercase tracking-wide" style={{ borderColor: UVA_WHITE, color: UVA_WHITE }}>
        {lab.recruitingUndergrads ? "Recruiting" : "Not Recruiting"}
      </div>

      <p className="absolute bottom-3 right-4 text-xs font-semibold uppercase tracking-wide text-white/90">
        Updated {updated}
      </p>
    </article>
  );
}
