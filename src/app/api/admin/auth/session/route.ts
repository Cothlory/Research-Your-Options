// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/config/env";
import { ADMIN_SESSION_COOKIE_NAME, verifyAdminSessionToken } from "@/lib/auth/admin-session";

export async function GET(req: NextRequest) {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;
  const authenticated = verifyAdminSessionToken(token);

  return NextResponse.json({
    ok: true,
    authenticated,
    email: authenticated ? env.ADMIN_EMAIL : undefined,
  });
}
