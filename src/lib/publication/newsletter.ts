// CORE LOGIC - avoid editing unless assigned

import type { NewsletterEntry } from "@/lib/types/domain";

export interface NewsletterIssueRender {
  markdown: string;
  html: string;
}

export function renderNewsletterIssue(
  title: string,
  semesterLabel: string,
  entries: NewsletterEntry[],
): NewsletterIssueRender {
  const markdownBlocks = entries.map((entry) => {
    return [
      `## ${entry.labName}`,
      `${entry.shortSummary}`,
      `- Recruiting: ${entry.recruitingUndergrads ? "Yes" : "No"}`,
      `- Website: ${entry.websiteUrl ?? "N/A"}`,
      `- Last updated: ${entry.updatedAt}`,
    ].join("\n");
  });

  const markdown = [`# ${title}`, `Semester: ${semesterLabel}`, "", ...markdownBlocks].join("\n\n");

  const htmlCards = entries
    .map(
      (entry) => `
        <article style="padding:16px;border:1px solid #d4d4d8;border-radius:12px;margin-bottom:12px;">
          <h2 style="margin:0 0 8px 0;">${entry.labName}</h2>
          <p style="margin:0 0 8px 0;">${entry.shortSummary}</p>
          <ul style="margin:0;padding-left:18px;">
            <li><strong>Recruiting:</strong> ${entry.recruitingUndergrads ? "Yes" : "No"}</li>
            <li><strong>Website:</strong> ${entry.websiteUrl ?? "N/A"}</li>
            <li><strong>Last updated:</strong> ${entry.updatedAt}</li>
          </ul>
        </article>
      `,
    )
    .join("\n");

  const html = `
    <section style="font-family: ui-sans-serif, system-ui; max-width: 680px; margin: 0 auto;">
      <h1>${title}</h1>
      <p><strong>Semester:</strong> ${semesterLabel}</p>
      ${htmlCards}
    </section>
  `;

  return { markdown, html };
}
