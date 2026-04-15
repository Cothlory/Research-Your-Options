// CORE LOGIC - avoid editing unless assigned

import { createHmac, timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { env } from "@/lib/config/env";

export const ADMIN_SESSION_COOKIE_NAME = "ryo_admin_session";

const SESSION_TTL_SECONDS = 60 * 60 * 12;

interface AdminSessionPayload {
  email: string;
  exp: number;
}

function base64UrlEncode(value: string): string {
  return Buffer.from(value, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function base64UrlDecode(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4 || 4)) % 4);
  return Buffer.from(padded, "base64").toString("utf8");
}

function adminSecret(): string {
  return `${env.ADMIN_EMAIL}:${env.ADMIN_PASSWORD}`;
}

function signPayload(payload: string): string {
  return createHmac("sha256", adminSecret()).update(payload).digest("hex");
}

function safeCompare(a: string, b: string): boolean {
  const aBuffer = Buffer.from(a, "utf8");
  const bBuffer = Buffer.from(b, "utf8");

  if (aBuffer.length !== bBuffer.length) {
    return false;
  }

  return timingSafeEqual(aBuffer, bBuffer);
}

export function createAdminSessionToken(email: string): string {
  const payload: AdminSessionPayload = {
    email,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signature = signPayload(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifyAdminSessionToken(token?: string): boolean {
  if (!token) {
    return false;
  }

  const [encodedPayload, signature] = token.split(".");
  if (!encodedPayload || !signature) {
    return false;
  }

  const expectedSignature = signPayload(encodedPayload);
  if (!safeCompare(signature, expectedSignature)) {
    return false;
  }

  try {
    const payload = JSON.parse(base64UrlDecode(encodedPayload)) as AdminSessionPayload;
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp <= now) {
      return false;
    }

    return payload.email.toLowerCase() === env.ADMIN_EMAIL.toLowerCase();
  } catch {
    return false;
  }
}

export function setAdminSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: ADMIN_SESSION_COOKIE_NAME,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export function requireAdminApiAuth(req: NextRequest): NextResponse | null {
  const token = req.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value;

  if (!verifyAdminSessionToken(token)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
