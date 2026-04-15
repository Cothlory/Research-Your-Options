// CORE LOGIC - avoid editing unless assigned

import JSZip from "jszip";
import { subDays } from "date-fns";
import { env, flags } from "@/lib/config/env";
import { logger } from "@/lib/logger";
import { ingestSurveySubmission } from "@/lib/services/ingestion-service";
import { syncFacultyRowsToGoogleSheet } from "@/lib/publication/google-sheets";

interface QualtricsExportInitResponse {
  result?: {
    progressId?: string;
  };
}

interface QualtricsExportProgressResponse {
  result?: {
    status?: string;
    percentComplete?: number;
    fileId?: string;
  };
}

export interface BatchImportOptions {
  startDate?: Date;
  endDate?: Date;
  waveId?: string;
  timezone?: string;
}

export interface BatchImportResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  mode: "mock" | "qualtrics-export";
  startDate: string;
  endDate: string;
  waveId?: string;
  exported: number;
  imported: number;
  duplicates: number;
  filteredOut: number;
  failed: number;
  fileId?: string;
  googleSheetSync?: {
    ok: boolean;
    skipped?: boolean;
    reason?: string;
    rowCount: number;
  };
}

function buildHeaders() {
  return {
    "X-API-TOKEN": env.QUALTRICS_API_TOKEN,
    "Content-Type": "application/json",
  };
}

function isZipBuffer(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function wait(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}

function normalizeStringValue(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function parseDate(value: unknown): Date | undefined {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    if (!Number.isNaN(date.getTime())) {
      return date;
    }
  }

  return undefined;
}

function extractRecordsFromPayload(payload: unknown): Array<Record<string, unknown>> {
  if (Array.isArray(payload)) {
    return payload.filter(
      (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
    );
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const asObject = payload as Record<string, unknown>;
  const responses = asObject.responses;
  if (Array.isArray(responses)) {
    return responses.filter(
      (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
    );
  }

  const result = asObject.result;
  if (result && typeof result === "object") {
    const typedResult = result as Record<string, unknown>;

    const elements = typedResult.elements;
    if (Array.isArray(elements)) {
      return elements.filter(
        (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
      );
    }

    const nestedResponses = typedResult.responses;
    if (Array.isArray(nestedResponses)) {
      return nestedResponses.filter(
        (entry): entry is Record<string, unknown> => typeof entry === "object" && entry !== null,
      );
    }
  }

  return [];
}

function parseRawExportText(raw: string): Array<Record<string, unknown>> {
  const trimmed = raw.trim();
  if (!trimmed) {
    return [];
  }

  try {
    const parsed = JSON.parse(trimmed);
    return extractRecordsFromPayload(parsed);
  } catch {
    const lines = trimmed
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const records: Array<Record<string, unknown>> = [];
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed && typeof parsed === "object") {
          records.push(parsed as Record<string, unknown>);
        }
      } catch {
        // skip malformed lines
      }
    }
    return records;
  }
}

async function extractRecordsFromExportBuffer(
  buffer: Buffer,
  contentType: string | null,
): Promise<Array<Record<string, unknown>>> {
  const isZip = (contentType ?? "").includes("zip") || isZipBuffer(buffer);

  if (!isZip) {
    return parseRawExportText(buffer.toString("utf8"));
  }

  const zip = await JSZip.loadAsync(buffer);
  const files = Object.values(zip.files).filter((file) => !file.dir);

  if (files.length === 0) {
    return [];
  }

  const target =
    files.find((file) => file.name.toLowerCase().endsWith(".json")) ??
    files.find((file) => file.name.toLowerCase().endsWith(".ndjson")) ??
    files[0];

  const raw = await target.async("text");
  return parseRawExportText(raw);
}

async function startExport(startDate: Date, endDate: Date, timezone?: string): Promise<string> {
  const apiBase = env.QUALTRICS_API_BASE_URL.replace(/\/$/, "");
  const url = `${apiBase}/surveys/${env.QUALTRICS_SURVEY_ID}/export-responses`;

  const response = await fetch(url, {
    method: "POST",
    headers: buildHeaders(),
    body: JSON.stringify({
      format: "json",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      ...(timezone ? { timeZone: timezone } : {}),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Qualtrics export init failed (${response.status}): ${body}`);
  }

  const payload = (await response.json()) as QualtricsExportInitResponse;
  const progressId = payload.result?.progressId;

  if (!progressId) {
    throw new Error("Qualtrics export init missing progressId");
  }

  return progressId;
}

async function pollExport(progressId: string): Promise<string> {
  const apiBase = env.QUALTRICS_API_BASE_URL.replace(/\/$/, "");

  for (let attempt = 0; attempt < 120; attempt += 1) {
    const url = `${apiBase}/surveys/${env.QUALTRICS_SURVEY_ID}/export-responses/${progressId}`;
    const response = await fetch(url, {
      method: "GET",
      headers: buildHeaders(),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Qualtrics export poll failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as QualtricsExportProgressResponse;
    const status = payload.result?.status?.toLowerCase();
    const fileId = payload.result?.fileId;

    if ((status === "complete" || status === "completed") && fileId) {
      return fileId;
    }

    if (status === "failed" || status === "cancelled" || status === "canceled") {
      throw new Error(`Qualtrics export failed with status=${status}`);
    }

    await wait(1500);
  }

  throw new Error("Qualtrics export polling timed out");
}

async function downloadExport(fileId: string): Promise<Array<Record<string, unknown>>> {
  const apiBase = env.QUALTRICS_API_BASE_URL.replace(/\/$/, "");
  const url = `${apiBase}/surveys/${env.QUALTRICS_SURVEY_ID}/export-responses/${fileId}/file`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "X-API-TOKEN": env.QUALTRICS_API_TOKEN,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Qualtrics export download failed (${response.status}): ${body}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  return extractRecordsFromExportBuffer(buffer, response.headers.get("content-type"));
}

function collectValues(record: Record<string, unknown>): Record<string, unknown> {
  const values: Record<string, unknown> = {};

  const candidates = [record.values, record.embeddedData, record.responseValues];

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      Object.assign(values, candidate as Record<string, unknown>);
    }
  }

  return values;
}

function extractResponseId(record: Record<string, unknown>): string | undefined {
  return (
    normalizeStringValue(record.responseId) ??
    normalizeStringValue(record.ResponseID) ??
    normalizeStringValue(record.responseID)
  );
}

function extractSubmittedAt(record: Record<string, unknown>): Date | undefined {
  return (
    parseDate(record.endDate) ??
    parseDate(record.recordedDate) ??
    parseDate(record.submittedAt) ??
    parseDate(record.dateSubmitted)
  );
}

function extractWaveId(record: Record<string, unknown>, values: Record<string, unknown>): string | undefined {
  const key = env.QUALTRICS_WAVE_EMBEDDED_DATA_KEY;

  return (
    normalizeStringValue(values[key]) ??
    normalizeStringValue(record[key]) ??
    normalizeStringValue(record.waveId)
  );
}

export async function importQualtricsResponsesBatch(
  options?: BatchImportOptions,
): Promise<BatchImportResult> {
  const endDate = options?.endDate ?? new Date();
  const startDate = options?.startDate ?? subDays(endDate, flags.campaignGraceDays);

  if (!flags.hasQualtricsApiConfig) {
    return {
      ok: false,
      skipped: true,
      reason: "Qualtrics API credentials missing",
      mode: "mock",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      waveId: options?.waveId,
      exported: 0,
      imported: 0,
      duplicates: 0,
      filteredOut: 0,
      failed: 0,
    };
  }

  try {
    const progressId = await startExport(startDate, endDate, options?.timezone);
    const fileId = await pollExport(progressId);
    const records = await downloadExport(fileId);

    let imported = 0;
    let duplicates = 0;
    let filteredOut = 0;
    let failed = 0;
    const facultyEmailsToSync = new Set<string>();

    for (const record of records) {
      const values = collectValues(record);
      const responseId = extractResponseId(record);
      const waveId = extractWaveId(record, values);

      if (options?.waveId && waveId !== options.waveId) {
        filteredOut += 1;
        continue;
      }

      const submittedAt = extractSubmittedAt(record) ?? endDate;

      try {
        const payload = {
          ...record,
          values,
        };

        const result = await ingestSurveySubmission({
          payload,
          source: "qualtrics",
          qualtricsResponseId: responseId,
          submittedAt,
          waveId,
          syncGoogleSheet: false,
        });

        const facultyEmail =
          "facultyEmail" in result && typeof result.facultyEmail === "string"
            ? result.facultyEmail.trim().toLowerCase()
            : undefined;

        const duplicate = "duplicate" in result && result.duplicate === true;
        if (duplicate) {
          duplicates += 1;
          if (facultyEmail) {
            facultyEmailsToSync.add(facultyEmail);
          }
        } else if (result.ok) {
          imported += 1;
          if (!("needsConfirmation" in result && result.needsConfirmation === true)) {
            if (facultyEmail) {
              facultyEmailsToSync.add(facultyEmail);
            }
          }
        } else {
          failed += 1;
        }
      } catch (error) {
        failed += 1;
        logger.error("Failed to ingest Qualtrics response record", {
          error,
          responseId,
          waveId,
        });
      }
    }

    const googleSheetSync =
      facultyEmailsToSync.size > 0
        ? await syncFacultyRowsToGoogleSheet([...facultyEmailsToSync])
        : undefined;

    return {
      ok: failed === 0,
      mode: "qualtrics-export",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      waveId: options?.waveId,
      exported: records.length,
      imported,
      duplicates,
      filteredOut,
      failed,
      fileId,
      googleSheetSync,
    };
  } catch (error) {
    logger.error("Qualtrics batch import failed", {
      error,
      waveId: options?.waveId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    });

    return {
      ok: false,
      reason: "Qualtrics batch import failed",
      mode: "qualtrics-export",
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      waveId: options?.waveId,
      exported: 0,
      imported: 0,
      duplicates: 0,
      filteredOut: 0,
      failed: 0,
    };
  }
}
