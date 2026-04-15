// CORE LOGIC - avoid editing unless assigned

import { prisma } from "@/lib/db/client";
import { env, flags } from "@/lib/config/env";
import { sendBulkEmail } from "@/lib/email/smtp";
import { logger } from "@/lib/logger";

export interface PosterAssetInput {
  labName: string;
  imageUrl: string;
}

interface SubstackPostPayload {
  title: string;
  markdown: string;
  html?: string;
  issueId: string;
  semesterLabel: string;
  publish: boolean;
  send_email: boolean;
  author_id?: string;
}

export interface PublishIssueResult {
  ok: boolean;
  published: boolean;
  skipped?: boolean;
  reason?: string;
  substackStatus?: number;
  subscriberFallbackCount?: number;
  markdownPreview: string;
}

function normalizePosterAssets(posters: PosterAssetInput[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const poster of posters) {
    const name = poster.labName.trim().toLowerCase();
    const url = poster.imageUrl.trim();
    if (name && url) {
      map.set(name, url);
    }
  }

  return map;
}

function buildSubstackTemplate(
  title: string,
  semesterLabel: string,
  entries: Array<{
    labName: string;
    summary: string;
    qualifications: string;
    websiteUrl?: string | null;
    updatedAt: string;
  }>,
  posters: Map<string, string>,
): string {
  const blocks = entries.map((entry) => {
    const posterUrl = posters.get(entry.labName.toLowerCase());

    const lines = [
      `## ${entry.labName}`,
      "",
      posterUrl ? `![${entry.labName} poster](${posterUrl})` : "",
      posterUrl ? "" : "",
      entry.summary,
      "",
      `- Qualifications: ${entry.qualifications}`,
      `- Lab Website: ${entry.websiteUrl ?? "N/A"}`,
      `- Last Updated: ${entry.updatedAt}`,
    ];

    return lines.filter((line, index) => !(line === "" && lines[index - 1] === "")).join("\n");
  });

  return [
    `# ${title}`,
    "",
    "Welcome to this issue of Research Starters Hub. Below are the newest lab updates for undergraduates.",
    "",
    `Semester: ${semesterLabel}`,
    "",
    ...blocks,
    "",
    "If you are interested in a lab, visit the website first and send a concise email introducing yourself.",
  ].join("\n");
}

async function sendIssueToStudentSubscribers(subject: string, markdownBody: string) {
  const subscribers = await prisma.studentSubscriber.findMany({
    where: { isActive: true },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return {
      sent: 0,
    };
  }

  const messages = subscribers.map((subscriber) => ({
    to: subscriber.email,
    subject,
    text: markdownBody,
  }));

  const sent = await sendBulkEmail(messages);
  return {
    sent: sent.delivered.length,
  };
}

export async function publishIssueToSubstack(issueId: string, posters: PosterAssetInput[]) {
  const issue = await prisma.publicationIssue.findUnique({
    where: { id: issueId },
  });

  if (!issue) {
    throw new Error("Publication issue not found");
  }

  const snapshots = await prisma.labSnapshot.findMany({
    where: {
      isLatest: true,
      status: "approved",
    },
    include: { lab: true },
    orderBy: { lastVerifiedAt: "desc" },
  });

  const entries = snapshots.map((snapshot) => ({
    labName: snapshot.lab.labName,
    summary: snapshot.summaryText ?? "Summary pending",
    qualifications: snapshot.desiredSkills ?? snapshot.optionalNotes ?? "Not specified",
    websiteUrl: snapshot.websiteUrl,
    updatedAt: snapshot.lastVerifiedAt.toISOString().slice(0, 10),
  }));

  const markdown = buildSubstackTemplate(
    issue.title,
    issue.semesterLabel,
    entries,
    normalizePosterAssets(posters),
  );

  if (!flags.hasSubstackConfig) {
    const fallback = await sendIssueToStudentSubscribers(issue.title, markdown);

    return {
      ok: fallback.sent > 0,
      published: false,
      skipped: true,
      reason: "SUBSTACK_PUBLICATION_ENDPOINT is not configured",
      subscriberFallbackCount: fallback.sent,
      markdownPreview: markdown,
    } satisfies PublishIssueResult;
  }

  const payload: SubstackPostPayload = {
    title: issue.title,
    markdown,
    html: issue.generatedHtml,
    issueId: issue.id,
    semesterLabel: issue.semesterLabel,
    publish: true,
    send_email: true,
    author_id: env.SUBSTACK_AUTHOR_ID === "__PLACEHOLDER__" ? undefined : env.SUBSTACK_AUTHOR_ID,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.SUBSTACK_API_TOKEN && env.SUBSTACK_API_TOKEN !== "__PLACEHOLDER__") {
    headers.Authorization = `Bearer ${env.SUBSTACK_API_TOKEN}`;
  }

  const response = await fetch(env.SUBSTACK_PUBLICATION_ENDPOINT, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    logger.error("Substack publish failed", { status: response.status, body });

    return {
      ok: false,
      published: false,
      substackStatus: response.status,
      reason: "Substack publish failed",
      markdownPreview: markdown,
    } satisfies PublishIssueResult;
  }

  await prisma.publicationIssue.update({
    where: { id: issue.id },
    data: { issueStatus: "published" },
  });

  return {
    ok: true,
    published: true,
    substackStatus: response.status,
    markdownPreview: markdown,
  } satisfies PublishIssueResult;
}
