// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { generatePublicationIssue } from "@/lib/services/publication-service";
import { semesterLabelFromDate } from "@/lib/domain/snapshot";

const ExportSchema = z.object({
  title: z.string().min(3).default("Research Starters Hub Issue"),
  semesterLabel: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = ExportSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const issue = await generatePublicationIssue(
    parsed.data.title,
    parsed.data.semesterLabel ?? semesterLabelFromDate(),
  );

  return NextResponse.json({ ok: true, issue });
}
