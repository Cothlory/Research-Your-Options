// CORE LOGIC - avoid editing unless assigned

import { prisma } from "@/lib/db/client";
import { renderNewsletterIssue } from "@/lib/publication/newsletter";

export async function generatePublicationIssue(title: string, semesterLabel: string) {
  const snapshots = await prisma.labSnapshot.findMany({
    where: {
      isLatest: true,
      status: "approved",
    },
    include: {
      lab: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const entries = snapshots.map((snapshot) => ({
    labName: snapshot.lab.labName,
    shortSummary: snapshot.summaryText ?? "Summary pending manual edit.",
    department: snapshot.lab.department,
    recruitingUndergrads: snapshot.recruitingUndergrads,
    websiteUrl: snapshot.websiteUrl ?? undefined,
    updatedAt: snapshot.lastVerifiedAt.toISOString(),
  }));

  const rendered = renderNewsletterIssue(title, semesterLabel, entries);

  return prisma.publicationIssue.create({
    data: {
      title,
      semesterLabel,
      issueStatus: "exported",
      generatedHtml: rendered.html,
      generatedMarkdown: rendered.markdown,
    },
  });
}
