// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { subMonths } from "date-fns";
import { prisma } from "@/lib/db/client";
import { flags } from "@/lib/config/env";

export async function POST() {
  if (!flags.cronEnabled) {
    return NextResponse.json({ ok: false, skipped: true, reason: "ENABLE_CRON_JOBS=false" });
  }

  const threshold = subMonths(new Date(), 8);

  const stale = await prisma.labSnapshot.updateMany({
    where: {
      isLatest: true,
      status: "approved",
      lastVerifiedAt: {
        lt: threshold,
      },
    },
    data: {
      status: "stale",
    },
  });

  return NextResponse.json({ ok: true, updated: stale.count });
}
