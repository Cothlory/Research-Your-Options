// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/client";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q")?.toLowerCase().trim() ?? "";
  const recruiting = req.nextUrl.searchParams.get("recruiting")?.trim();

  const snapshots = await prisma.labSnapshot.findMany({
    where: {
      isLatest: true,
      status: "approved",
      ...(recruiting ? { recruitingUndergrads: recruiting === "true" } : {}),
      ...(query
        ? {
            OR: [
              { lab: { labName: { contains: query, mode: "insensitive" } } },
              { researchArea: { contains: query, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { lab: true },
    orderBy: { lastVerifiedAt: "desc" },
  });

  return NextResponse.json(
    snapshots.map((item) => ({
      id: item.id,
      labName: item.lab.labName,
      recruitingUndergrads: item.recruitingUndergrads,
      researchArea: item.researchArea,
      summaryText: item.summaryText,
      websiteUrl: item.websiteUrl,
      status: item.status,
      updatedAt: item.lastVerifiedAt,
    })),
  );
}
