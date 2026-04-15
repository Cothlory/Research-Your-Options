// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import {
  listProfessorContacts,
  replaceProfessorContacts,
  setProfessorContactState,
} from "@/lib/services/campaign-service";

const ReplaceProfessorSchema = z.object({
  emails: z.array(z.string().email()).min(1),
});

const ToggleProfessorSchema = z.object({
  email: z.string().email(),
  isActive: z.boolean(),
});

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const contacts = await listProfessorContacts();
  return NextResponse.json({ ok: true, contacts });
}

export async function PUT(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = ReplaceProfessorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await replaceProfessorContacts(parsed.data.emails);
  return NextResponse.json({ ok: true, ...result });
}

export async function PATCH(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = ToggleProfessorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await setProfessorContactState(parsed.data.email, parsed.data.isActive);
  return NextResponse.json({ ok: true, contact });
}
