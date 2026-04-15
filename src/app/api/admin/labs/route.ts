// CORE LOGIC - avoid editing unless assigned

import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/client";

const DeleteLabSchema = z.object({
  labId: z.string().min(1),
});

export async function DELETE(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const body = await req.json();
  const parsed = DeleteLabSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.lab.delete({
        where: { id: parsed.data.labId },
      });

      await tx.auditLog.create({
        data: {
          entityType: "Lab",
          entityId: parsed.data.labId,
          action: "delete_lab",
          actorType: "admin",
          actorId: "session-admin",
        },
      });
    });

    return NextResponse.json({ ok: true, deletedLabId: parsed.data.labId });
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return NextResponse.json({ ok: false, error: "Lab not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: false, error: "Failed to delete lab" }, { status: 500 });
  }
}
