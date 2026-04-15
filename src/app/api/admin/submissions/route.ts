// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  // TODO(owner=me): replace with real admin auth check.
  const snapshots = await prisma.labSnapshot.findMany({
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

  return NextResponse.json(snapshots);
}
