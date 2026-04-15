// CORE LOGIC - avoid editing unless assigned

import type { NormalizedSurveyPayload } from "@/lib/types/domain";

interface QualtricsPayload {
  values?: Record<string, string | boolean | null | undefined>;
}

function pickFirstString(values: Record<string, unknown>, keys: string[]): string | undefined {
  for (const key of keys) {
    const value = values[key];

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed) {
        return trimmed;
      }
      continue;
    }

    if (typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
  }

  return undefined;
}

function normalizeWebsiteUrl(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  if (value.includes(".")) {
    return `https://${value}`;
  }

  return value;
}

function normalizeBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true" || value === "1";
  }
  return false;
}

export function mapQualtricsToNormalized(payload: QualtricsPayload): NormalizedSurveyPayload {
  const values = payload.values ?? {};

  const labName = pickFirstString(values, ["lab_name", "labName", "QID8_TEXT", "QID8"]);
  const facultyName = pickFirstString(values, [
    "faculty_name",
    "facultyName",
    "QID2_TEXT",
    "QID2",
  ]);
  const facultyEmail = pickFirstString(values, [
    "faculty_email",
    "facultyEmail",
    "QID9_TEXT",
    "QID9",
  ]);
  const department = pickFirstString(values, [
    "department",
    "dept",
    "QID3_TEXT",
    "QID3",
  ]);
  const websiteUrl = normalizeWebsiteUrl(
    pickFirstString(values, [
    "website_url",
    "websiteUrl",
    "QID4_TEXT",
    "QID4",
    ]),
  );
  const qualifications = pickFirstString(values, [
    "desired_skills",
    "optional_notes",
    "QID5_TEXT",
    "QID5",
  ]);
  const researchArea = pickFirstString(values, ["research_area", "QID6_TEXT", "QID6"]);
  const recruitingValue =
    values.recruiting_undergrads ?? values.recruiting ?? values.QID1 ?? values.QID1_TEXT;
  const lastConfirmedBySubmitter = pickFirstString(values, [
    "last_confirmed_by_submitter",
    "QID7_TEXT",
    "QID7",
  ]);

  return {
    labName: labName ?? "",
    facultyName: facultyName ?? "",
    facultyEmail,
    department: department ?? "Unknown Department",
    researchArea,
    recruitingUndergrads: normalizeBoolean(recruitingValue),
    websiteUrl,
    optionalNotes: qualifications,
    desiredSkills: qualifications,
    lastConfirmedBySubmitter,
  };
}
