// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { regenerateSummary } from "@/lib/services/review-service";

const RegenerateSchema = z.object({
  snapshotId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = RegenerateSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  await regenerateSummary(parsed.data.snapshotId, "mock-admin");
  return NextResponse.json({ ok: true });
}
