// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "Realtime webhook ingestion is disabled. Use /api/jobs/qualtrics-batch-import.",
    },
    { status: 410 },
  );
}
