// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/client";
import { removeFacultyRowsFromGoogleSheet } from "@/lib/publication/google-sheets";
import {
  listProfessorContactsWithStatus,
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

const AddProfessorSchema = z.object({
  email: z.string().email(),
});

const RemoveProfessorSchema = z.object({
  email: z.string().email(),
});

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const contacts = await listProfessorContactsWithStatus();
  return NextResponse.json({ ok: true, contacts });
}

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = AddProfessorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const contact = await setProfessorContactState(parsed.data.email, true);
  return NextResponse.json({ ok: true, contact });
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

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = RemoveProfessorSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const deleted = await prisma.$transaction(async (tx) => {
    const linkedLabs = await tx.lab.findMany({
      where: {
        facultyEmail: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
      select: { id: true },
    });

    const linkedLabIds = linkedLabs.map((lab) => lab.id);

    if (linkedLabIds.length > 0) {
      await tx.lab.deleteMany({
        where: { id: { in: linkedLabIds } },
      });
    }

    await tx.surveyInvitation.deleteMany({
      where: {
        facultyEmail: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    });

    const deletedProfessor = await tx.professorContact.deleteMany({
      where: { email: normalizedEmail },
    });

    await tx.auditLog.create({
      data: {
        entityType: "ProfessorContact",
        entityId: normalizedEmail,
        action: "hard_delete_professor",
        actorType: "admin",
        actorId: "session-admin",
        metadata: {
          deletedLabCount: linkedLabIds.length,
        },
      },
    });

    return {
      deletedProfessorCount: deletedProfessor.count,
      deletedLabCount: linkedLabIds.length,
    };
  });

  let googleSheet;
  try {
    googleSheet = await removeFacultyRowsFromGoogleSheet([normalizedEmail]);
  } catch (error) {
    googleSheet = {
      ok: false,
      reason: error instanceof Error ? error.message : "Failed to remove Google Sheet row",
      rowCount: 0,
    };
  }

  return NextResponse.json({
    ok: true,
    email: normalizedEmail,
    ...deleted,
    googleSheet,
  });
}
