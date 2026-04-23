// CORE LOGIC - avoid editing unless assigned

import { Prisma } from "@prisma/client";
import { flags } from "@/lib/config/env";
import { prisma } from "@/lib/db/client";

const SETTINGS_ENTITY_TYPE = "SurveyAutomationSettings";
const SETTINGS_ENTITY_ID = "default";
const SETTINGS_ACTION = "upsert";

export interface SurveyAutomationSettings {
  campaignDates: string[];
  graceDays: number;
}

interface RawSurveyAutomationSettings {
  campaignDates?: unknown;
  graceDays?: unknown;
}

function parsePositiveInt(raw: unknown, fallback: number): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return parsed;
}

function isValidMonthDay(value: string): boolean {
  const match = value.match(/^(\d{2})-(\d{2})$/);
  if (!match) {
    return false;
  }

  const month = Number.parseInt(match[1], 10);
  const day = Number.parseInt(match[2], 10);

  if (month < 1 || month > 12 || day < 1 || day > 31) {
    return false;
  }

  const probe = new Date(Date.UTC(2026, month - 1, day, 12, 0, 0));
  return probe.getUTCMonth() + 1 === month && probe.getUTCDate() === day;
}

function normalizeCampaignDates(values: unknown): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();

  for (const value of values) {
    const token = String(value ?? "").trim();
    if (!isValidMonthDay(token)) {
      continue;
    }

    unique.add(token);
  }

  return [...unique];
}

function defaultSettings(): SurveyAutomationSettings {
  return {
    campaignDates: [...flags.campaignDates],
    graceDays: flags.campaignGraceDays,
  };
}

export async function getSurveyAutomationSettings(): Promise<SurveyAutomationSettings> {
  const latest = await prisma.auditLog.findFirst({
    where: {
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: SETTINGS_ENTITY_ID,
      action: SETTINGS_ACTION,
    },
    orderBy: { createdAt: "desc" },
    select: {
      metadata: true,
    },
  });

  const fallback = defaultSettings();

  if (!latest?.metadata || typeof latest.metadata !== "object" || Array.isArray(latest.metadata)) {
    return fallback;
  }

  const raw = latest.metadata as unknown as RawSurveyAutomationSettings;
  const campaignDates = normalizeCampaignDates(raw.campaignDates);
  const graceDays = parsePositiveInt(raw.graceDays, fallback.graceDays);

  return {
    campaignDates: campaignDates.length > 0 ? campaignDates : fallback.campaignDates,
    graceDays,
  };
}

export async function saveSurveyAutomationSettings(
  input: SurveyAutomationSettings,
  actorId?: string,
): Promise<SurveyAutomationSettings> {
  const campaignDates = normalizeCampaignDates(input.campaignDates);
  const graceDays = parsePositiveInt(input.graceDays, flags.campaignGraceDays);

  const normalized: SurveyAutomationSettings = {
    campaignDates: campaignDates.length > 0 ? campaignDates : [...flags.campaignDates],
    graceDays,
  };

  await prisma.auditLog.create({
    data: {
      entityType: SETTINGS_ENTITY_TYPE,
      entityId: SETTINGS_ENTITY_ID,
      action: SETTINGS_ACTION,
      actorType: "admin",
      actorId,
      metadata: {
        campaignDates: normalized.campaignDates,
        graceDays: normalized.graceDays,
      } as Prisma.InputJsonValue,
    },
  });

  return normalized;
}
