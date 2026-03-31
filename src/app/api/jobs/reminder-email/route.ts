// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { flags } from "@/lib/config/env";

export async function POST() {
  if (!flags.cronEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "ENABLE_CRON_JOBS=false" });
  }

  // TODO(owner=me): implement reminder email delivery integration.
  return NextResponse.json({ ok: true, message: "Reminder placeholder executed." });
}
