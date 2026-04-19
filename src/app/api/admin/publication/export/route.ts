// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { generatePublicationIssue } from "@/lib/services/publication-service";
import { semesterLabelFromDate } from "@/lib/domain/snapshot";
import { syncLatestSnapshotsToGoogleSheet } from "@/lib/publication/google-sheets";

const ExportSchema = z.object({
  title: z.string().min(3).default("Research Your Options Issue"),
  semesterLabel: z.string().optional(),
  syncGoogleSheet: z.boolean().default(true),
});

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = ExportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const issue = await generatePublicationIssue(
    parsed.data.title,
    parsed.data.semesterLabel ?? semesterLabelFromDate(),
  );

  const googleSheet = parsed.data.syncGoogleSheet
    ? await syncLatestSnapshotsToGoogleSheet()
    : undefined;

  return NextResponse.json({ ok: true, issue, googleSheet });
}
