// CORE LOGIC - avoid editing unless assigned

import { createSign } from "node:crypto";
import { prisma } from "@/lib/db/client";
import { env, flags } from "@/lib/config/env";
import { logger } from "@/lib/logger";

const GOOGLE_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GOOGLE_SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

interface GoogleJwtClaims {
  iss: string;
  scope: string;
  aud: string;
  exp: number;
  iat: number;
}

export interface LabSheetRow {
  labName: string;
  summary: string;
  qualifications: string;
  link: string;
}

export interface GoogleSheetSyncResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  rowCount: number;
}

function base64UrlEncode(input: string): string {
  return Buffer.from(input, "utf8")
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function buildGoogleServiceJwt(claims: GoogleJwtClaims): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const signingInput = `${base64UrlEncode(JSON.stringify(header))}.${base64UrlEncode(JSON.stringify(claims))}`;
  const privateKey = env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY.replace(/\\n/g, "\n");
  const signature = createSign("RSA-SHA256").update(signingInput).sign(privateKey, "base64url");

  return `${signingInput}.${signature}`;
}

async function getGoogleAccessToken(): Promise<string> {
  const nowSeconds = Math.floor(Date.now() / 1000);

  const jwt = buildGoogleServiceJwt({
    iss: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: GOOGLE_SHEETS_SCOPE,
    aud: GOOGLE_TOKEN_ENDPOINT,
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  });

  const form = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion: jwt,
  });

  const response = await fetch(GOOGLE_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: form.toString(),
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to get Google access token: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { access_token?: string };
  if (!payload.access_token) {
    throw new Error("Google token response missing access_token");
  }

  return payload.access_token;
}

async function replaceSheetRows(rows: LabSheetRow[]): Promise<void> {
  const token = await getGoogleAccessToken();
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = env.GOOGLE_SHEETS_TAB_NAME;

  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };

  const clearRange = encodeURIComponent(`${tabName}!A:D`);
  const clearResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
    {
      method: "POST",
      headers,
      cache: "no-store",
    },
  );

  if (!clearResponse.ok) {
    const text = await clearResponse.text();
    throw new Error(`Failed to clear sheet: ${clearResponse.status} ${text}`);
  }

  const values = [
    ["lab name", "summary", "qualifications", "link"],
    ...rows.map((row) => [row.labName, row.summary, row.qualifications, row.link]),
  ];

  const updateRange = encodeURIComponent(`${tabName}!A1:D${values.length}`);
  const updateResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${updateRange}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers,
      body: JSON.stringify({ values }),
      cache: "no-store",
    },
  );

  if (!updateResponse.ok) {
    const text = await updateResponse.text();
    throw new Error(`Failed to update sheet: ${updateResponse.status} ${text}`);
  }
}

function coalesceQualifications(desiredSkills?: string | null, optionalNotes?: string | null): string {
  if (desiredSkills?.trim()) {
    return desiredSkills.trim();
  }
  if (optionalNotes?.trim()) {
    return optionalNotes.trim();
  }
  return "Not specified";
}

export async function syncLatestSnapshotsToGoogleSheet(): Promise<GoogleSheetSyncResult> {
  if (!flags.hasGoogleSheetsConfig) {
    return {
      ok: false,
      skipped: true,
      reason: "Google Sheets credentials missing",
      rowCount: 0,
    };
  }

  const snapshots = await prisma.labSnapshot.findMany({
    where: {
      isLatest: true,
      status: {
        in: ["pending_review", "approved", "stale"],
      },
    },
    include: { lab: true },
    orderBy: { createdAt: "desc" },
  });

  const rows: LabSheetRow[] = snapshots.map((snapshot) => ({
    labName: snapshot.lab.labName,
    summary: snapshot.summaryText ?? "Summary pending",
    qualifications: coalesceQualifications(snapshot.desiredSkills, snapshot.optionalNotes),
    link: snapshot.websiteUrl ?? "",
  }));

  try {
    await replaceSheetRows(rows);
    return {
      ok: true,
      rowCount: rows.length,
    };
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Unknown Google Sheets error";
    logger.error("Google Sheets sync failed", { detail });
    return {
      ok: false,
      reason: `Google Sheets sync failed: ${detail}`,
      rowCount: 0,
    };
  }
}
