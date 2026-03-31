// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { ingestSurveySubmission } from "@/lib/services/ingestion-service";

export async function POST(req: NextRequest) {
  const provided = req.headers.get("x-qualtrics-signature") ?? "";
  if (
    env.QUALTRICS_WEBHOOK_SECRET !== "__PLACEHOLDER__" &&
    provided !== env.QUALTRICS_WEBHOOK_SECRET
  ) {
    return NextResponse.json({ ok: false, error: "invalid webhook secret" }, { status: 401 });
  }

  const payload = await req.json();
  const result = await ingestSurveySubmission({ payload, source: "qualtrics" });
  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
