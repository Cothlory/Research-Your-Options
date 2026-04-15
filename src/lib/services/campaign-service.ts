// CORE LOGIC - avoid editing unless assigned

import { subDays } from "date-fns";
import { CampaignStatus, Prisma } from "@prisma/client";
import { env, flags } from "@/lib/config/env";
import { prisma } from "@/lib/db/client";
import { semesterLabelFromDate } from "@/lib/domain/snapshot";
import { sendBulkEmail, type EmailMessage } from "@/lib/email/smtp";
import { logger } from "@/lib/logger";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function uniqueNormalizedEmails(emails: string[]): string[] {
  const unique = new Set<string>();

  for (const email of emails) {
    const normalized = normalizeEmail(email);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return [...unique];
}

function parseMonthDay(monthDay: string, year: number): Date | null {
  const [monthRaw, dayRaw] = monthDay.split("-");
  const month = Number.parseInt(monthRaw, 10);
  const day = Number.parseInt(dayRaw, 10);

  if (!Number.isFinite(month) || !Number.isFinite(day)) {
    return null;
  }

  const date = new Date(Date.UTC(year, month - 1, day, 13, 0, 0));
  if (date.getUTCMonth() + 1 !== month || date.getUTCDate() !== day) {
    return null;
  }

  return date;
}

function campaignLabel(date: Date): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function appendCampaignQuery(url: string, waveId: string, appUserId?: string): string {
  const parsed = new URL(url);
  parsed.searchParams.set(env.QUALTRICS_WAVE_EMBEDDED_DATA_KEY, waveId);
  if (appUserId) {
    parsed.searchParams.set("appUserId", appUserId);
  }
  return parsed.toString();
}

function buildInvitationMessage(
  facultyEmail: string,
  surveyLink: string,
  campaignDateLabel: string,
  graceDays: number,
): EmailMessage {
  const deadline = new Date();
  deadline.setUTCDate(deadline.getUTCDate() + graceDays);

  const subject = `[Research Starters Hub] Semester Lab Update Survey (${campaignDateLabel})`;
  const text = [
    "Hello,",
    "",
    "Please share your latest lab recruiting information for undergraduate students.",
    `Survey link: ${surveyLink}`,
    `Please submit within ${graceDays} days (by ${deadline.toISOString().slice(0, 10)}).`,
    "",
    "This helps students discover currently active lab opportunities.",
    "Thank you!",
  ].join("\n");

  return {
    to: facultyEmail,
    subject,
    text,
  };
}

function buildReminderMessage(
  facultyEmail: string,
  surveyLink: string,
  campaignDateLabel: string,
): EmailMessage {
  return {
    to: facultyEmail,
    subject: `[Reminder] Lab Update Survey (${campaignDateLabel})`,
    text: [
      "Hello,",
      "",
      "This is a reminder to complete your lab update survey.",
      `Survey link: ${surveyLink}`,
      "",
      "If you already submitted, please ignore this reminder.",
      "Thank you!",
    ].join("\n"),
  };
}

async function getFallbackProfessorEmailsFromEnv(): Promise<string[]> {
  return uniqueNormalizedEmails(env.QUALTRICS_PROFESSOR_EMAILS.split(","));
}

export async function getProfessorEmailsForCampaign(): Promise<string[]> {
  const contacts = await prisma.professorContact.findMany({
    where: { isActive: true },
    select: { email: true },
  });

  if (contacts.length > 0) {
    return uniqueNormalizedEmails(contacts.map((contact) => contact.email));
  }

  return getFallbackProfessorEmailsFromEnv();
}

export async function replaceProfessorContacts(emails: string[]) {
  const normalized = uniqueNormalizedEmails(emails);

  await prisma.$transaction(async (tx) => {
    await tx.professorContact.updateMany({ data: { isActive: false } });

    for (const email of normalized) {
      await tx.professorContact.upsert({
        where: { email },
        create: { email, isActive: true },
        update: { isActive: true },
      });
    }
  });

  return {
    total: normalized.length,
  };
}

export async function listProfessorContacts() {
  return prisma.professorContact.findMany({
    where: { isActive: true },
    orderBy: { email: "asc" },
  });
}

export async function listProfessorContactsWithStatus(
  now: Date = new Date(),
): Promise<ProfessorContactStatusItem[]> {
  const contacts = await prisma.professorContact.findMany({
    where: { isActive: true },
    orderBy: { email: "asc" },
  });

  const lastCampaign = await prisma.surveyCampaign.findFirst({
    where: {
      status: {
        in: [CampaignStatus.launched, CampaignStatus.closed],
      },
      label: {
        not: {
          startsWith: "manual-",
        },
      },
    },
    orderBy: [{ launchedAt: "desc" }, { scheduledFor: "desc" }],
  });

  const items: ProfessorContactStatusItem[] = [];

  for (const contact of contacts) {
    const normalizedEmail = normalizeEmail(contact.email);

    const invitation = lastCampaign
      ? await prisma.surveyInvitation.findFirst({
          where: {
            campaignId: lastCampaign.id,
            facultyEmail: normalizedEmail,
          },
          orderBy: { sentAt: "desc" },
        })
      : null;

    let statusSinceLastSurvey: ProfessorSurveyStatus = "not_received";

    if (invitation?.rejectedAt) {
      statusSinceLastSurvey = "rejected";
    } else if (invitation?.respondedAt) {
      statusSinceLastSurvey = "received";
    } else if (invitation && lastCampaign && isInvitationExpired(lastCampaign, invitation, now)) {
      statusSinceLastSurvey = "expired";
    }

    const latestApprovedSnapshot = await prisma.labSnapshot.findFirst({
      where: {
        status: "approved",
        lab: {
          facultyEmail: {
            equals: normalizedEmail,
            mode: "insensitive",
          },
        },
      },
      include: {
        lab: true,
      },
      orderBy: { lastVerifiedAt: "desc" },
    });

    items.push({
      email: normalizedEmail,
      isActive: contact.isActive,
      statusSinceLastSurvey,
      lastLabUpdateAt: latestApprovedSnapshot?.lastVerifiedAt.toISOString(),
      labName: latestApprovedSnapshot?.lab.labName,
      waveId: lastCampaign?.label,
    });
  }

  return items;
}

export async function setProfessorContactState(email: string, isActive: boolean) {
  const normalized = normalizeEmail(email);

  if (!normalized) {
    throw new Error("Email is required");
  }

  return prisma.professorContact.upsert({
    where: { email: normalized },
    create: { email: normalized, isActive },
    update: { isActive },
  });
}

export async function sendManualSurveyInvitations(inputEmails?: string[]): Promise<ManualSurveySendResult> {
  if (!flags.hasSmtpConfig) {
    return {
      ok: false,
      skipped: true,
      reason: "SMTP configuration missing",
      delivered: [],
      failed: [],
    };
  }

  if (!env.QUALTRICS_SURVEY_LINK || env.QUALTRICS_SURVEY_LINK === "__PLACEHOLDER__") {
    return {
      ok: false,
      skipped: true,
      reason: "QUALTRICS_SURVEY_LINK missing",
      delivered: [],
      failed: [],
    };
  }

  const emails = uniqueNormalizedEmails(inputEmails ?? (await getProfessorEmailsForCampaign()));

  if (emails.length === 0) {
    return {
      ok: false,
      skipped: true,
      reason: "No professor emails selected",
      delivered: [],
      failed: [],
    };
  }

  const now = new Date();
  const suffix = now.toISOString().replace(/[-:.TZ]/g, "").slice(0, 14);
  const waveId = `manual-${suffix}`;

  const campaign = await prisma.surveyCampaign.create({
    data: {
      label: waveId,
      semesterLabel: semesterLabelFromDate(now),
      scheduledFor: now,
      surveyLink: env.QUALTRICS_SURVEY_LINK,
      graceDays: flags.campaignGraceDays,
      status: CampaignStatus.launched,
      launchedAt: now,
    },
  });

  const messages = emails.map((facultyEmail) =>
    buildInvitationMessage(
      facultyEmail,
      appendCampaignQuery(campaign.surveyLink, waveId, facultyEmail),
      waveId,
      campaign.graceDays,
    ),
  );

  const sent = await sendBulkEmail(messages);

  if (sent.delivered.length > 0) {
    await prisma.surveyInvitation.createMany({
      data: sent.delivered.map((facultyEmail) => ({
        campaignId: campaign.id,
        facultyEmail,
        source: "manual",
        suppressExpiry: true,
        sentAt: now,
      })),
      skipDuplicates: true,
    });
  }

  await prisma.auditLog.create({
    data: {
      entityType: "SurveyCampaign",
      entityId: campaign.id,
      action: "manual_send_campaign",
      actorType: "admin",
      metadata: {
        delivered: sent.delivered.length,
        failed: sent.failed.length,
      } as Prisma.InputJsonValue,
    },
  });

  return {
    ok: sent.failed.length === 0,
    waveId,
    delivered: sent.delivered,
    failed: sent.failed,
  };
}

async function ensureCampaignsForYear(year: number): Promise<number> {
  if (!env.QUALTRICS_SURVEY_LINK || env.QUALTRICS_SURVEY_LINK === "__PLACEHOLDER__") {
    return 0;
  }

  let created = 0;

  for (const monthDay of flags.campaignDates) {
    const date = parseMonthDay(monthDay, year);
    if (!date) {
      logger.warn("Invalid SURVEY_CAMPAIGN_DATES entry", { monthDay, year });
      continue;
    }

    const label = campaignLabel(date);

    await prisma.surveyCampaign.upsert({
      where: { label },
      create: {
        label,
        semesterLabel: semesterLabelFromDate(date),
        scheduledFor: date,
        surveyLink: env.QUALTRICS_SURVEY_LINK,
        graceDays: flags.campaignGraceDays,
      },
      update: {
        surveyLink: env.QUALTRICS_SURVEY_LINK,
        graceDays: flags.campaignGraceDays,
      },
    });

    created += 1;
  }

  return created;
}

export async function ensureScheduledCampaigns(now: Date = new Date()) {
  const year = now.getUTCFullYear();
  const nextYear = year + 1;

  await ensureCampaignsForYear(year);

  // Keep next year's first campaign dates ready when running in the second half.
  if (now.getUTCMonth() >= 6) {
    await ensureCampaignsForYear(nextYear);
  }
}

interface LaunchCampaignOptions {
  now?: Date;
  professorEmails?: string[];
}

export type ProfessorSurveyStatus = "received" | "not_received" | "expired" | "rejected";

export interface ProfessorContactStatusItem {
  email: string;
  isActive: boolean;
  statusSinceLastSurvey: ProfessorSurveyStatus;
  lastLabUpdateAt?: string;
  labName?: string;
  waveId?: string;
}

interface ManualSurveySendResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  waveId?: string;
  delivered: string[];
  failed: string[];
}

function isInvitationExpired(
  campaign: { launchedAt: Date | null; graceDays: number; status: CampaignStatus },
  invitation: { sentAt: Date; suppressExpiry: boolean; respondedAt: Date | null },
  now: Date,
): boolean {
  if (invitation.suppressExpiry || invitation.respondedAt) {
    return false;
  }

  if (campaign.status === CampaignStatus.closed) {
    return true;
  }

  const baseline = campaign.launchedAt ?? invitation.sentAt;
  const deadline = new Date(baseline);
  deadline.setUTCDate(deadline.getUTCDate() + campaign.graceDays);

  return deadline <= now;
}

export async function launchDueCampaigns(options?: LaunchCampaignOptions) {
  const now = options?.now ?? new Date();
  await ensureScheduledCampaigns(now);

  const dueCampaigns = await prisma.surveyCampaign.findMany({
    where: {
      status: CampaignStatus.scheduled,
      scheduledFor: {
        lte: now,
      },
    },
    orderBy: { scheduledFor: "asc" },
  });

  if (dueCampaigns.length === 0) {
    return {
      launchedCampaigns: 0,
      invitationsSent: 0,
      invitationFailures: 0,
      skipped: false,
      reason: "No due campaigns",
    };
  }

  const professorEmails = uniqueNormalizedEmails(
    options?.professorEmails ?? (await getProfessorEmailsForCampaign()),
  );

  if (professorEmails.length === 0) {
    return {
      launchedCampaigns: 0,
      invitationsSent: 0,
      invitationFailures: 0,
      skipped: true,
      reason: "No professor emails configured",
    };
  }

  let launchedCampaigns = 0;
  let invitationsSent = 0;
  let invitationFailures = 0;

  for (const campaign of dueCampaigns) {
    const campaignWaveId = campaign.label;
    const campaignDateLabel = campaign.label;

    const messages = professorEmails.map((facultyEmail) => {
      const link = appendCampaignQuery(campaign.surveyLink, campaignWaveId, facultyEmail);
      return buildInvitationMessage(facultyEmail, link, campaignDateLabel, campaign.graceDays);
    });

    const sent = await sendBulkEmail(messages);

    if (sent.skipped) {
      return {
        launchedCampaigns,
        invitationsSent,
        invitationFailures: invitationFailures + professorEmails.length,
        skipped: true,
        reason: sent.reason,
      };
    }

    invitationFailures += sent.failed.length;
    invitationsSent += sent.delivered.length;

    await prisma.$transaction(async (tx) => {
      await tx.surveyCampaign.update({
        where: { id: campaign.id },
        data: {
          status: CampaignStatus.launched,
          launchedAt: now,
        },
      });

      if (sent.delivered.length > 0) {
        await tx.surveyInvitation.createMany({
          data: sent.delivered.map((facultyEmail) => ({
            campaignId: campaign.id,
            facultyEmail,
            source: "scheduled",
            suppressExpiry: false,
            sentAt: now,
          })),
          skipDuplicates: true,
        });
      }

      await tx.auditLog.create({
        data: {
          entityType: "SurveyCampaign",
          entityId: campaign.id,
          action: "launch_campaign",
          actorType: "system",
          metadata: {
            delivered: sent.delivered.length,
            failed: sent.failed.length,
            invitationCount: professorEmails.length,
          } as Prisma.InputJsonValue,
        },
      });
    });

    launchedCampaigns += 1;
  }

  return {
    launchedCampaigns,
    invitationsSent,
    invitationFailures,
    skipped: false,
  };
}

export interface ClosedCampaignWindow {
  campaignId: string;
  waveId: string;
  startDate: Date;
  endDate: Date;
}

interface ReminderRunResult {
  remindersSent: number;
  reminderFailures: number;
  closedCampaigns: number;
  closedCampaignWindows: ClosedCampaignWindow[];
  skipped: boolean;
  reason?: string;
}

export async function sendReminderEmails(now: Date = new Date()): Promise<ReminderRunResult> {
  const threshold = subDays(now, flags.campaignGraceDays);

  const invitations = await prisma.surveyInvitation.findMany({
    where: {
      respondedAt: null,
      reminderSentAt: null,
      suppressExpiry: false,
      sentAt: { lte: threshold },
      campaign: {
        status: CampaignStatus.launched,
      },
    },
    include: {
      campaign: true,
    },
  });

  if (invitations.length === 0) {
    const closedCampaignWindows = await closeExpiredCampaigns(now);
    return {
      remindersSent: 0,
      reminderFailures: 0,
      closedCampaigns: closedCampaignWindows.length,
      closedCampaignWindows,
      skipped: false,
      reason: "No reminder candidates",
    };
  }

  const messages = invitations.map((invitation) =>
    buildReminderMessage(
      invitation.facultyEmail,
      appendCampaignQuery(
        invitation.campaign.surveyLink,
        invitation.campaign.label,
        invitation.facultyEmail,
      ),
      invitation.campaign.label,
    ),
  );

  const sent = await sendBulkEmail(messages);

  if (sent.skipped) {
    return {
      remindersSent: 0,
      reminderFailures: invitations.length,
      closedCampaigns: 0,
      closedCampaignWindows: [],
      skipped: true,
      reason: sent.reason,
    };
  }

  if (sent.delivered.length > 0) {
    await prisma.surveyInvitation.updateMany({
      where: {
        id: {
          in: invitations
            .filter((invitation) => sent.delivered.includes(invitation.facultyEmail))
            .map((invitation) => invitation.id),
        },
      },
      data: { reminderSentAt: now },
    });
  }

  const closedCampaignWindows = await closeExpiredCampaigns(now);

  return {
    remindersSent: sent.delivered.length,
    reminderFailures: sent.failed.length,
    closedCampaigns: closedCampaignWindows.length,
    closedCampaignWindows,
    skipped: false,
  };
}

async function closeExpiredCampaigns(now: Date): Promise<ClosedCampaignWindow[]> {
  const launched = await prisma.surveyCampaign.findMany({
    where: {
      status: CampaignStatus.launched,
      label: {
        not: {
          startsWith: "manual-",
        },
      },
      launchedAt: {
        not: null,
      },
    },
    select: {
      id: true,
      label: true,
      launchedAt: true,
      graceDays: true,
    },
  });

  const closableCampaigns = launched.filter((campaign) => {
      const launchedAt = campaign.launchedAt;
      if (!launchedAt) {
        return false;
      }
      const cutoff = new Date(launchedAt);
      cutoff.setUTCDate(cutoff.getUTCDate() + campaign.graceDays);
      return cutoff <= now;
    });

  const closableIds = closableCampaigns.map((campaign) => campaign.id);

  if (closableIds.length === 0) {
    return [];
  }

  await prisma.surveyCampaign.updateMany({
    where: {
      id: { in: closableIds },
      status: CampaignStatus.launched,
    },
    data: {
      status: CampaignStatus.closed,
      closedAt: now,
    },
  });

  return closableCampaigns.map((campaign) => {
    const launchedAt = campaign.launchedAt ?? subDays(now, campaign.graceDays);
    return {
      campaignId: campaign.id,
      waveId: campaign.label,
      startDate: launchedAt,
      endDate: now,
    };
  });
}

export async function recordSurveyResponseForFacultyEmail(
  facultyEmail: string,
  snapshotId: string,
  options?: {
    waveId?: string;
    respondedAt?: Date;
  },
) {
  const normalizedEmail = normalizeEmail(facultyEmail);
  if (!normalizedEmail) {
    return { matched: false };
  }

  const invitation = await prisma.surveyInvitation.findFirst({
    where: {
      facultyEmail: normalizedEmail,
      respondedAt: null,
      campaign: {
        status: {
          in: [CampaignStatus.launched, CampaignStatus.scheduled, CampaignStatus.closed],
        },
        ...(options?.waveId ? { label: options.waveId } : {}),
      },
    },
    orderBy: {
      sentAt: "desc",
    },
    include: {
      campaign: true,
    },
  });

  if (!invitation) {
    return { matched: false };
  }

  await prisma.$transaction(async (tx) => {
    await tx.surveyInvitation.update({
      where: { id: invitation.id },
      data: {
        respondedAt: options?.respondedAt ?? new Date(),
        rejectedAt: null,
        responseSnapshotId: snapshotId,
      },
    });

    await tx.auditLog.create({
      data: {
        entityType: "SurveyCampaign",
        entityId: invitation.campaignId,
        action: "survey_response_received",
        actorType: "faculty",
        actorId: normalizedEmail,
        metadata: {
          snapshotId,
          waveId: options?.waveId,
        } as Prisma.InputJsonValue,
      },
    });
  });

  return {
    matched: true,
    campaignId: invitation.campaignId,
    invitationId: invitation.id,
  };
}

export async function markSurveyRejectedForFacultyEmail(
  facultyEmail: string,
  options?: { waveId?: string },
) {
  const normalizedEmail = normalizeEmail(facultyEmail);
  if (!normalizedEmail) {
    return { matched: false };
  }

  const invitation = await prisma.surveyInvitation.findFirst({
    where: {
      facultyEmail: normalizedEmail,
      respondedAt: {
        not: null,
      },
      rejectedAt: null,
      ...(options?.waveId
        ? {
            campaign: {
              label: options.waveId,
            },
          }
        : {}),
    },
    orderBy: {
      respondedAt: "desc",
    },
  });

  if (!invitation) {
    return { matched: false };
  }

  await prisma.surveyInvitation.update({
    where: { id: invitation.id },
    data: {
      rejectedAt: new Date(),
    },
  });

  return {
    matched: true,
    invitationId: invitation.id,
  };
}
