// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { flags } from "@/lib/config/env";
import { launchDueCampaigns } from "@/lib/services/campaign-service";

interface SemesterCampaignBody {
  professorEmails?: string[];
}

export async function POST(req: Request) {
  if (!flags.cronEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "ENABLE_CRON_JOBS=false" });
  }

  const body = (await req.json().catch(() => ({}))) as SemesterCampaignBody;
  const result = await launchDueCampaigns({
    professorEmails: body.professorEmails,
  });

  return NextResponse.json({ ok: true, ...result });
}
