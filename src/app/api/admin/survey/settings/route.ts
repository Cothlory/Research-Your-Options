// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import {
  getSurveyAutomationSettings,
  saveSurveyAutomationSettings,
} from "@/lib/services/survey-settings-service";

const SurveySettingsSchema = z.object({
  campaignDates: z.array(z.string()).min(1),
  graceDays: z.number().int().min(1).max(60),
});

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const settings = await getSurveyAutomationSettings();
  return NextResponse.json({ ok: true, settings });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = SurveySettingsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const settings = await saveSurveyAutomationSettings(parsed.data);
  return NextResponse.json({ ok: true, settings });
}
