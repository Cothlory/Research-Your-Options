// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { approveSnapshot, editSummary, rejectSnapshot } from "@/lib/services/review-service";

const ReviewSchema = z.object({
  snapshotId: z.string().min(1),
  action: z.enum(["approve", "reject", "edit_summary"]),
  summaryText: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ReviewSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const actorId = "mock-admin";

  if (parsed.data.action === "approve") {
    const snapshot = await approveSnapshot(parsed.data.snapshotId, actorId);
    return NextResponse.json({ ok: true, snapshot });
  }

  if (parsed.data.action === "reject") {
    const snapshot = await rejectSnapshot(parsed.data.snapshotId, actorId);
    return NextResponse.json({ ok: true, snapshot });
  }

  await editSummary(parsed.data.snapshotId, parsed.data.summaryText ?? "", actorId);
  return NextResponse.json({ ok: true });
}
