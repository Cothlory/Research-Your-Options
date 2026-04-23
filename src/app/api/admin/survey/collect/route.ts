// CORE LOGIC - avoid editing unless assigned

import { subDays } from "date-fns";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { importQualtricsResponsesBatch } from "@/lib/services/qualtrics-batch-import-service";
import { getSurveyAutomationSettings } from "@/lib/services/survey-settings-service";

const ManualCollectSchema = z.object({
  waveId: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

function parseOptionalDate(raw?: string): Date | undefined {
  if (!raw) {
    return undefined;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = ManualCollectSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await getSurveyAutomationSettings();
  const endDate = parseOptionalDate(parsed.data.endDate) ?? new Date();
  const startDate = parseOptionalDate(parsed.data.startDate) ?? subDays(endDate, settings.graceDays);

  const result = await importQualtricsResponsesBatch({
    waveId: parsed.data.waveId,
    startDate,
    endDate,
  });

  const isSuccessful = result.ok || result.skipped || result.partial;

  return NextResponse.json(result, {
    status: isSuccessful ? 200 : 500,
  });
}
