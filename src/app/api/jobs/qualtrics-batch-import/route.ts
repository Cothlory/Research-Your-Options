// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { flags } from "@/lib/config/env";
import { importQualtricsResponsesBatch } from "@/lib/services/qualtrics-batch-import-service";

interface BatchImportBody {
  waveId?: string;
  startDate?: string;
  endDate?: string;
}

function parseOptionalDate(value?: string): Date | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed;
}

export async function POST(req: Request) {
  if (!flags.cronEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "ENABLE_CRON_JOBS=false" });
  }

  const body = (await req.json().catch(() => ({}))) as BatchImportBody;

  const result = await importQualtricsResponsesBatch({
    waveId: body.waveId,
    startDate: parseOptionalDate(body.startDate),
    endDate: parseOptionalDate(body.endDate),
  });

  return NextResponse.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
