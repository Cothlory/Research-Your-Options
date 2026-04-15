// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { sendManualSurveyInvitations } from "@/lib/services/campaign-service";

const SendManualSurveySchema = z.object({
  emails: z.array(z.string().email()).optional(),
});

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json().catch(() => ({}));
  const parsed = SendManualSurveySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await sendManualSurveyInvitations(parsed.data.emails);
  return NextResponse.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
