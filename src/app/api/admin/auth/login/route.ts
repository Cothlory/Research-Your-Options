// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/config/env";
import { createAdminSessionToken, setAdminSessionCookie } from "@/lib/auth/admin-session";

const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.trim().toLowerCase();
  const password = parsed.data.password;

  const valid =
    email === env.ADMIN_EMAIL.trim().toLowerCase() && password === env.ADMIN_PASSWORD;

  if (!valid) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const token = createAdminSessionToken(env.ADMIN_EMAIL);
  const response = NextResponse.json({ ok: true });
  setAdminSessionCookie(response, token);
  return response;
}
