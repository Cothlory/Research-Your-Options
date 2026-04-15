// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { flags } from "@/lib/config/env";
import { sendReminderEmails } from "@/lib/services/campaign-service";
import { importQualtricsResponsesBatch } from "@/lib/services/qualtrics-batch-import-service";

export async function POST() {
  if (!flags.cronEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "ENABLE_CRON_JOBS=false" });
  }

  const result = await sendReminderEmails();

  const batchImports = [];
  for (const window of result.closedCampaignWindows) {
    const batchResult = await importQualtricsResponsesBatch({
      waveId: window.waveId,
      startDate: window.startDate,
      endDate: window.endDate,
    });
    batchImports.push(batchResult);
  }

  return NextResponse.json({ ok: true, ...result, batchImports });
}
