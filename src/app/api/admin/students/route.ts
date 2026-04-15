// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/client";

const AddStudentSchema = z.object({
  email: z.string().email(),
});

const RemoveStudentSchema = z.object({
  email: z.string().email(),
});

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const students = await prisma.studentSubscriber.findMany({
    orderBy: { email: "asc" },
  });

  return NextResponse.json({ ok: true, students });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = AddStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const student = await prisma.studentSubscriber.upsert({
    where: { email: normalizeEmail(parsed.data.email) },
    create: {
      email: normalizeEmail(parsed.data.email),
      isActive: true,
      unsubscribedAt: null,
    },
    update: {
      isActive: true,
      unsubscribedAt: null,
    },
  });

  return NextResponse.json({ ok: true, student });
}

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = RemoveStudentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedEmail = normalizeEmail(parsed.data.email);

  const result = await prisma.studentSubscriber.deleteMany({
    where: { email: normalizedEmail },
  });

  return NextResponse.json({
    ok: true,
    email: normalizedEmail,
    deletedCount: result.count,
  });
}
