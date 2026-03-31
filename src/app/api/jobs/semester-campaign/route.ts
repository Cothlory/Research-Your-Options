// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { flags } from "@/lib/config/env";

export async function POST() {
  if (!flags.cronEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "ENABLE_CRON_JOBS=false" });
  }

  // TODO(owner=me): implement survey campaign email orchestration.
  return NextResponse.json({ ok: true, message: "Semester campaign placeholder executed." });
}
