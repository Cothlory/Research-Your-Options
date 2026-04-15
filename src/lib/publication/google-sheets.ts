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
  email: string;
  professor: string;
  recruiting: string;
  lastUpdate: string;
}

export interface GoogleSheetSyncResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  rowCount: number;
}

const SHEET_HEADERS = [
  "lab name",
  "summary",
  "qualifications",
  "link",
  "email",
  "professor",
  "recruiting",
  "last update",
];

const GOOGLE_SHEET_STATE_ID = "default";

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

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getOrCreateGoogleSheetState() {
  return prisma.googleSheetState.upsert({
    where: { id: GOOGLE_SHEET_STATE_ID },
    create: {
      id: GOOGLE_SHEET_STATE_ID,
      nextEmptyRow: 2,
    },
    update: {},
  });
}

async function setGoogleSheetNextEmptyRow(nextEmptyRow: number) {
  await prisma.googleSheetState.upsert({
    where: { id: GOOGLE_SHEET_STATE_ID },
    create: {
      id: GOOGLE_SHEET_STATE_ID,
      nextEmptyRow: Math.max(2, nextEmptyRow),
    },
    update: {
      nextEmptyRow: Math.max(2, nextEmptyRow),
    },
  });
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

async function ensureHeaders(token: string): Promise<void> {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = env.GOOGLE_SHEETS_TAB_NAME;

  const range = encodeURIComponent(`${tabName}!A1:H1`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ values: [SHEET_HEADERS] }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to write sheet headers: ${response.status} ${text}`);
  }
}

async function readSheetRows(token: string): Promise<string[][]> {
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = env.GOOGLE_SHEETS_TAB_NAME;

  const range = encodeURIComponent(`${tabName}!A2:H`);
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to read sheet rows: ${response.status} ${text}`);
  }

  const payload = (await response.json()) as { values?: string[][] };
  return payload.values ?? [];
}

function findFirstEmptyRow(
  existingRows: string[][],
  occupiedRows: Set<number>,
  preferredStartRow = 2,
): number {
  const startOffset = Math.max(0, preferredStartRow - 2);
  const scanLimit = Math.max(existingRows.length + 20, occupiedRows.size + 20);

  for (let offset = startOffset; offset < scanLimit; offset += 1) {
    const rowIndex = offset + 2;
    const row = existingRows[offset] ?? [];
    const isBlank = row.every((cell) => !String(cell ?? "").trim());

    if (isBlank && !occupiedRows.has(rowIndex)) {
      return rowIndex;
    }
  }

  for (let offset = 0; offset < startOffset; offset += 1) {
    const rowIndex = offset + 2;
    const row = existingRows[offset] ?? [];
    const isBlank = row.every((cell) => !String(cell ?? "").trim());

    if (isBlank && !occupiedRows.has(rowIndex)) {
      return rowIndex;
    }
  }

  return existingRows.length + 2;
}

async function upsertRowsByEmail(rows: LabSheetRow[]): Promise<void> {
  if (rows.length === 0) {
    return;
  }

  const token = await getGoogleAccessToken();
  const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
  const tabName = env.GOOGLE_SHEETS_TAB_NAME;

  await ensureHeaders(token);
  const existingRows = await readSheetRows(token);
  const sheetState = await getOrCreateGoogleSheetState();

  const existingEmailToRow = new Map<string, number>();
  existingRows.forEach((row, index) => {
    const email = normalizeEmail(String(row[4] ?? ""));
    if (email) {
      existingEmailToRow.set(email, index + 2);
    }
  });

  const normalizedEmails = rows.map((row) => normalizeEmail(row.email));
  const mappings = await prisma.googleSheetEmailMapping.findMany({
    where: {
      email: {
        in: normalizedEmails,
      },
    },
  });

  const mappingByEmail = new Map(mappings.map((mapping) => [normalizeEmail(mapping.email), mapping]));
  const occupiedRows = new Set<number>();

  for (const mapped of mappings) {
    occupiedRows.add(mapped.rowIndex);
  }

  for (const rowIndex of existingEmailToRow.values()) {
    occupiedRows.add(rowIndex);
  }

  const updates: Array<{ range: string; values: string[][] }> = [];
  const mappingUpdates: Array<{ email: string; rowIndex: number }> = [];

  for (const row of rows) {
    const normalizedEmail = normalizeEmail(row.email);
    if (!normalizedEmail) {
      continue;
    }

    const mappedRow = mappingByEmail.get(normalizedEmail)?.rowIndex;
    const existingRow = existingEmailToRow.get(normalizedEmail);

    let rowIndex = mappedRow ?? existingRow;

    if (!rowIndex) {
      rowIndex = findFirstEmptyRow(existingRows, occupiedRows, sheetState.nextEmptyRow);
      occupiedRows.add(rowIndex);
    }

    updates.push({
      range: `${tabName}!A${rowIndex}:H${rowIndex}`,
      values: [[
        row.labName,
        row.summary,
        row.qualifications,
        row.link,
        normalizedEmail,
        row.professor,
        row.recruiting,
        row.lastUpdate,
      ]],
    });

    mappingUpdates.push({ email: normalizedEmail, rowIndex });
  }

  if (updates.length === 0) {
    return;
  }

  const batchResponse = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        valueInputOption: "RAW",
        data: updates,
      }),
      cache: "no-store",
    },
  );

  if (!batchResponse.ok) {
    const text = await batchResponse.text();
    throw new Error(`Failed to batch update sheet rows: ${batchResponse.status} ${text}`);
  }

  const nextEmptyRow = findFirstEmptyRow(existingRows, occupiedRows, sheetState.nextEmptyRow);

  await prisma.$transaction([
    ...mappingUpdates.map((mapping) =>
      prisma.googleSheetEmailMapping.upsert({
        where: { email: mapping.email },
        create: {
          email: mapping.email,
          rowIndex: mapping.rowIndex,
        },
        update: {
          rowIndex: mapping.rowIndex,
        },
      }),
    ),
    prisma.googleSheetState.upsert({
      where: { id: GOOGLE_SHEET_STATE_ID },
      create: {
        id: GOOGLE_SHEET_STATE_ID,
        nextEmptyRow,
      },
      update: {
        nextEmptyRow,
      },
    }),
  ]);
}

export async function removeFacultyRowsFromGoogleSheet(
  facultyEmails: string[],
): Promise<GoogleSheetSyncResult> {
  const uniqueEmails = [...new Set(facultyEmails.map(normalizeEmail).filter(Boolean))];

  if (uniqueEmails.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: "No faculty emails provided for row removal",
      rowCount: 0,
    };
  }

  const state = await getOrCreateGoogleSheetState();
  const rowIndexes = new Set<number>();

  const mappings = await prisma.googleSheetEmailMapping.findMany({
    where: {
      email: {
        in: uniqueEmails,
      },
    },
  });

  for (const mapping of mappings) {
    rowIndexes.add(mapping.rowIndex);
  }

  if (flags.hasGoogleSheetsConfig) {
    const token = await getGoogleAccessToken();
    await ensureHeaders(token);
    const existingRows = await readSheetRows(token);

    existingRows.forEach((row, index) => {
      const email = normalizeEmail(String(row[4] ?? ""));
      if (email && uniqueEmails.includes(email)) {
        rowIndexes.add(index + 2);
      }
    });

    if (rowIndexes.size > 0) {
      const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
      const tabName = env.GOOGLE_SHEETS_TAB_NAME;

      const updates = [...rowIndexes].map((rowIndex) => ({
        range: `${tabName}!A${rowIndex}:H${rowIndex}`,
        values: [["", "", "", "", "", "", "", ""]],
      }));

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values:batchUpdate`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            valueInputOption: "RAW",
            data: updates,
          }),
          cache: "no-store",
        },
      );

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Failed to clear sheet rows: ${response.status} ${text}`);
      }
    }
  }

  await prisma.googleSheetEmailMapping.deleteMany({
    where: {
      email: {
        in: uniqueEmails,
      },
    },
  });

  const minRemoved = rowIndexes.size > 0 ? Math.min(...rowIndexes) : state.nextEmptyRow;
  await setGoogleSheetNextEmptyRow(Math.min(state.nextEmptyRow, minRemoved));

  return {
    ok: true,
    rowCount: rowIndexes.size,
  };
}

export async function clearAllFacultyRowsFromGoogleSheet(): Promise<GoogleSheetSyncResult> {
  const state = await getOrCreateGoogleSheetState();

  if (flags.hasGoogleSheetsConfig) {
    const token = await getGoogleAccessToken();
    const spreadsheetId = env.GOOGLE_SHEETS_SPREADSHEET_ID;
    const tabName = env.GOOGLE_SHEETS_TAB_NAME;

    await ensureHeaders(token);

    const clearRange = encodeURIComponent(`${tabName}!A2:H`);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${clearRange}:clear`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        cache: "no-store",
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Failed to clear all sheet rows: ${response.status} ${text}`);
    }
  }

  await prisma.$transaction([
    prisma.googleSheetEmailMapping.deleteMany({}),
    prisma.googleSheetState.upsert({
      where: { id: GOOGLE_SHEET_STATE_ID },
      create: {
        id: GOOGLE_SHEET_STATE_ID,
        nextEmptyRow: 2,
      },
      update: {
        nextEmptyRow: 2,
      },
    }),
  ]);

  return {
    ok: true,
    rowCount: Math.max(0, state.nextEmptyRow - 2),
  };
}

async function buildSheetRowForFacultyEmail(email: string): Promise<LabSheetRow | null> {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return null;
  }

  const snapshot = await prisma.labSnapshot.findFirst({
    where: {
      status: "approved",
      lab: {
        facultyEmail: {
          equals: normalizedEmail,
          mode: "insensitive",
        },
      },
    },
    include: { lab: true },
    orderBy: { lastVerifiedAt: "desc" },
  });

  if (!snapshot) {
    return null;
  }

  return {
    labName: snapshot.lab.labName,
    summary: snapshot.summaryText ?? "Summary pending",
    qualifications: coalesceQualifications(snapshot.desiredSkills, snapshot.optionalNotes),
    link: snapshot.websiteUrl ?? "",
    email: normalizedEmail,
    professor: snapshot.lab.facultyName,
    recruiting: snapshot.recruitingUndergrads ? "yes" : "no",
    lastUpdate: snapshot.lastVerifiedAt.toISOString().slice(0, 10),
  };
}

export async function syncFacultyRowsToGoogleSheet(facultyEmails: string[]): Promise<GoogleSheetSyncResult> {
  if (!flags.hasGoogleSheetsConfig) {
    return {
      ok: false,
      skipped: true,
      reason: "Google Sheets credentials missing",
      rowCount: 0,
    };
  }

  const uniqueEmails = [...new Set(facultyEmails.map(normalizeEmail).filter(Boolean))];

  if (uniqueEmails.length === 0) {
    return {
      ok: true,
      rowCount: 0,
      skipped: true,
      reason: "No faculty emails provided for sheet sync",
    };
  }

  const rows: LabSheetRow[] = [];

  for (const email of uniqueEmails) {
    const row = await buildSheetRowForFacultyEmail(email);
    if (row) {
      rows.push(row);
    }
  }

  if (rows.length === 0) {
    return {
      ok: true,
      rowCount: 0,
      skipped: true,
      reason: "No approved lab rows found for provided faculty emails",
    };
  }

  try {
    await upsertRowsByEmail(rows);
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

export async function syncLatestSnapshotsToGoogleSheet(): Promise<GoogleSheetSyncResult> {
  const snapshots = await prisma.labSnapshot.findMany({
    where: {
      status: "approved",
      lab: {
        facultyEmail: {
          not: null,
        },
      },
    },
    include: { lab: true },
    orderBy: { lastVerifiedAt: "desc" },
  });

  const emails: string[] = [];
  const seen = new Set<string>();

  for (const snapshot of snapshots) {
    const email = normalizeEmail(snapshot.lab.facultyEmail ?? "");
    if (!email || seen.has(email)) {
      continue;
    }
    seen.add(email);
    emails.push(email);
  }

  return syncFacultyRowsToGoogleSheet(emails);
}
