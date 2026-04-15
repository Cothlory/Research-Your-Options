// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { publishIssueToSubstack } from "@/lib/publication/substack";

const PublishIssueSchema = z.object({
  issueId: z.string().min(1),
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
  const parsed = PublishIssueSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await publishIssueToSubstack(parsed.data.issueId, parsed.data.posters);

  return NextResponse.json(result, {
    status: result.ok || result.skipped ? 200 : 500,
  });
}
