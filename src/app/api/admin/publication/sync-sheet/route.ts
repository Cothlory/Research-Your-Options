// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { requireAdminApiAuth } from "@/lib/auth/admin-session";
import { syncLatestSnapshotsToGoogleSheet } from "@/lib/publication/google-sheets";

export async function POST(req: NextRequest) {
  const unauthorized = requireAdminApiAuth(req);
  if (unauthorized) {
    return unauthorized;
  }

  const result = await syncLatestSnapshotsToGoogleSheet();
  return NextResponse.json(result, { status: result.ok || result.skipped ? 200 : 500 });
}
