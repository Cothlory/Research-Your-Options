// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { clearAdminSessionCookie } from "@/lib/auth/admin-session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
