// CORE LOGIC - avoid editing unless assigned

import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET() {
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
