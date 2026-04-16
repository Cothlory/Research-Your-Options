// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/client";
import { sendIssueToSubscribersOnly } from "@/lib/publication/substack";

const ManualEmailSchema = z.object({
  issueId: z.string().trim().min(1).optional(),
  posters: z
    .array(
      z.object({
        labName: z.string().min(1),
        imageUrl: z.string().url(),
      }),
    )
    .default([]),
});

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = ManualEmailSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  let issueId = parsed.data.issueId;

  if (!issueId) {
    const latestIssue = await prisma.publicationIssue.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });

    if (!latestIssue) {
      return NextResponse.json(
        { ok: false, error: "No publication issue found. Export an issue first." },
        { status: 404 },
      );
    }

    issueId = latestIssue.id;
  }

  const result = await sendIssueToSubscribersOnly(issueId, parsed.data.posters);

  return NextResponse.json(
    {
      ...result,
      issueId,
    },
    {
      status: result.ok || result.skipped ? 200 : 500,
    },
  );
}
