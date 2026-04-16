// CORE LOGIC - avoid editing unless assigned

import { prisma } from "@/lib/db/client";
import { env, flags } from "@/lib/config/env";
import { sendBulkEmail, type EmailAttachment } from "@/lib/email/smtp";
import { logger } from "@/lib/logger";
import {
  applyPosterAssets,
  buildAutoPosterAssets,
  buildSubstackImageOnlyHtml,
  buildSubstackImageOnlyMarkdown,
  normalizePosterAssets,
  type PosterAssetInput,
  type SubstackImageEntry,
} from "@/lib/publication/substack-template";

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

interface SubscriberEmailSendResult {
  sent: number;
  failed: number;
  skipped?: boolean;
  reason?: string;
}

interface IssuePublicationContent {
  issue: {
    id: string;
    title: string;
    semesterLabel: string;
  };
  markdown: string;
  html: string;
  imageEntries: SubstackImageEntry[];
}

function isLocalOrInsecureImageUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    const hostname = parsed.hostname.toLowerCase();
    const isLocalHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const isPrivateIpv4 =
      /^10\./.test(hostname) ||
      /^192\.168\./.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(hostname);

    return parsed.protocol === "http:" || isLocalHost || isPrivateIpv4;
  } catch {
    return false;
  }
}

function extensionFromContentType(contentType: string): string {
  if (contentType === "image/png") {
    return "png";
  }
  if (contentType === "image/jpeg") {
    return "jpg";
  }
  if (contentType === "image/webp") {
    return "webp";
  }
  if (contentType === "image/gif") {
    return "gif";
  }
  if (contentType === "image/svg+xml") {
    return "svg";
  }

  return "png";
}

async function buildInlineEmailAssets(content: IssuePublicationContent): Promise<{
  html: string;
  attachments: EmailAttachment[];
}> {
  const cidEntries: SubstackImageEntry[] = [...content.imageEntries];
  const attachments: EmailAttachment[] = [];

  for (let i = 0; i < cidEntries.length; i += 1) {
    const entry = cidEntries[i];
    if (!entry?.imageUrl || !isLocalOrInsecureImageUrl(entry.imageUrl)) {
      continue;
    }

    try {
      const response = await fetch(entry.imageUrl, { cache: "no-store" });
      if (!response.ok) {
        logger.warn("Skipping inline image attach: image URL fetch failed", {
          labName: entry.labName,
          status: response.status,
        });
        continue;
      }

      const contentType = (response.headers.get("content-type") || "image/png")
        .split(";")[0]
        .trim()
        .toLowerCase();

      if (!contentType.startsWith("image/")) {
        logger.warn("Skipping inline image attach: non-image content type", {
          labName: entry.labName,
          contentType,
        });
        continue;
      }

      const imageBuffer = Buffer.from(await response.arrayBuffer());
      if (imageBuffer.byteLength === 0) {
        logger.warn("Skipping inline image attach: empty image content", {
          labName: entry.labName,
        });
        continue;
      }

      const cid = `lab-card-${i}-${Date.now()}@research-options`;
      const extension = extensionFromContentType(contentType);

      attachments.push({
        filename: `lab-card-${i + 1}.${extension}`,
        content: imageBuffer,
        contentType,
        cid,
        disposition: "inline",
      });

      cidEntries[i] = {
        ...entry,
        imageUrl: `cid:${cid}`,
      };
    } catch (error) {
      logger.warn("Skipping inline image attach: unexpected fetch error", {
        labName: entry.labName,
        error,
      });
    }
  }

  if (attachments.length === 0) {
    return {
      html: content.html,
      attachments: [],
    };
  }

  return {
    html: buildSubstackImageOnlyHtml(content.issue.title, content.issue.semesterLabel, cidEntries),
    attachments,
  };
}

async function sendIssueToStudentSubscribers(
  content: IssuePublicationContent,
): Promise<SubscriberEmailSendResult> {
  const subscribers = await prisma.studentSubscriber.findMany({
    where: { isActive: true },
    select: { email: true },
  });

  if (subscribers.length === 0) {
    return {
      sent: 0,
      failed: 0,
      skipped: true,
      reason: "No active student subscribers",
    };
  }

  const inlineAssets = await buildInlineEmailAssets(content);

  const messages = subscribers.map((subscriber) => ({
    to: subscriber.email,
    subject: content.issue.title,
    text: content.markdown,
    html: inlineAssets.html,
    attachments: inlineAssets.attachments,
  }));

  const sent = await sendBulkEmail(messages);

  return {
    sent: sent.delivered.length,
    failed: sent.failed.length,
    skipped: sent.skipped,
    reason: sent.reason,
  };
}

async function buildIssuePublicationContent(
  issueId: string,
  posters: PosterAssetInput[],
): Promise<IssuePublicationContent> {
  const issue = await prisma.publicationIssue.findUnique({
    where: { id: issueId },
    select: {
      id: true,
      title: true,
      semesterLabel: true,
    },
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
  }));

  const automaticPosters = buildAutoPosterAssets(env.APP_BASE_URL, snapshots);
  const posterMap = normalizePosterAssets([...automaticPosters, ...posters]);
  const imageEntries = applyPosterAssets(entries, posterMap);

  return {
    issue,
    imageEntries,
    markdown: buildSubstackImageOnlyMarkdown(issue.title, issue.semesterLabel, imageEntries),
    html: buildSubstackImageOnlyHtml(issue.title, issue.semesterLabel, imageEntries),
  };
}

export async function sendIssueToSubscribersOnly(issueId: string, posters: PosterAssetInput[]) {
  const content = await buildIssuePublicationContent(issueId, posters);
  const fallback = await sendIssueToStudentSubscribers(content);

  return {
    ok: fallback.sent > 0 && fallback.failed === 0,
    published: false,
    skipped: fallback.skipped,
    reason: fallback.reason,
    subscriberFallbackCount: fallback.sent,
    markdownPreview: content.markdown,
  } satisfies PublishIssueResult;
}

export async function publishIssueToSubstack(issueId: string, posters: PosterAssetInput[]) {
  const content = await buildIssuePublicationContent(issueId, posters);

  if (!flags.hasSubstackConfig) {
    const fallback = await sendIssueToStudentSubscribers(content);

    const reason = fallback.reason
      ? `SUBSTACK_PUBLICATION_ENDPOINT is not configured; ${fallback.reason}`
      : "SUBSTACK_PUBLICATION_ENDPOINT is not configured";

    return {
      ok: fallback.sent > 0,
      published: false,
      skipped: true,
      reason,
      subscriberFallbackCount: fallback.sent,
      markdownPreview: content.markdown,
    } satisfies PublishIssueResult;
  }

  const payload: SubstackPostPayload = {
    title: content.issue.title,
    markdown: content.markdown,
    html: content.html,
    issueId: content.issue.id,
    semesterLabel: content.issue.semesterLabel,
    publish: true,
    send_email: true,
    author_id: env.SUBSTACK_AUTHOR_ID === "__PLACEHOLDER__" ? undefined : env.SUBSTACK_AUTHOR_ID,
  };

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const rawAuthCookie =
    env.SUBSTACK_AUTH_COOKIE && env.SUBSTACK_AUTH_COOKIE !== "__PLACEHOLDER__"
      ? env.SUBSTACK_AUTH_COOKIE.trim()
      : "";

  if (rawAuthCookie) {
    headers.Cookie = rawAuthCookie.includes("=") ? rawAuthCookie : `connect.sid=${rawAuthCookie}`;
  }

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
      markdownPreview: content.markdown,
    } satisfies PublishIssueResult;
  }

  await prisma.publicationIssue.update({
    where: { id: content.issue.id },
    data: { issueStatus: "published" },
  });

  return {
    ok: true,
    published: true,
    substackStatus: response.status,
    markdownPreview: content.markdown,
  } satisfies PublishIssueResult;
}
