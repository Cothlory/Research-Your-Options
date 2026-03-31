// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { mockQualtricsPayload } from "@/lib/qualtrics/mock-payload";
import { ingestSurveySubmission } from "@/lib/services/ingestion-service";

export async function POST() {
  // TODO(owner=me): replace with real Qualtrics polling adapter.
  const result = await ingestSurveySubmission({
    payload: mockQualtricsPayload,
    source: "qualtrics",
  });

  return NextResponse.json({ ok: true, mode: "mock-poll", result });
}
