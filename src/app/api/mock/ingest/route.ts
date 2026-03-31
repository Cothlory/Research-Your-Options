// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { mockQualtricsPayload } from "@/lib/qualtrics/mock-payload";
import { ingestSurveySubmission } from "@/lib/services/ingestion-service";

export async function POST() {
  const result = await ingestSurveySubmission({
    payload: mockQualtricsPayload,
    source: "manual",
  });

  return NextResponse.json(result, { status: result.ok ? 200 : 400 });
}
