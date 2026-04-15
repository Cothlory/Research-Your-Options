// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const needConfirmation = await prisma.labSnapshot.findMany({
    where: {
      OR: [{ status: "pending_review" }, { needsConfirmation: true }],
    },
    include: {
      lab: true,
      summaryDrafts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const approvedSnapshots = await prisma.labSnapshot.findMany({
    where: {
      status: "approved",
    },
    include: {
      lab: true,
      summaryDrafts: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
  });

  const seenLabIds = new Set<string>();
  const allLabs = approvedSnapshots.filter((snapshot) => {
    if (seenLabIds.has(snapshot.labId)) {
      return false;
    }
    seenLabIds.add(snapshot.labId);
    return true;
  });

  return NextResponse.json({ needConfirmation, allLabs });
}
