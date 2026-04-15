// CORE LOGIC - avoid editing unless assigned

import type { NormalizedSurveyPayload } from "@/lib/types/domain";

interface QualtricsPayload {
  values?: Record<string, unknown>;
  embeddedData?: Record<string, unknown>;
  responseValues?: Record<string, unknown>;
  labels?: Record<string, unknown>;
  questionLabels?: Record<string, unknown>;
  [key: string]: unknown;
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

function pickFirstRawValue(values: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(values, key)) {
      return values[key];
    }
  }

  return undefined;
}

function isPrimitiveValue(value: unknown): value is string | number | boolean {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed || undefined;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function tokenize(value: string): string[] {
  const normalized = value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();

  return normalized.split(/[^a-z0-9]+/).filter(Boolean);
}

function keywordMatchesToken(tokens: string[], keyword: string): boolean {
  const normalizedKeyword = keyword.toLowerCase().replace(/[^a-z0-9]+/g, "");
  if (!normalizedKeyword) {
    return false;
  }

  return tokens.some(
    (token) =>
      token === normalizedKeyword ||
      token.startsWith(normalizedKeyword) ||
      normalizedKeyword.startsWith(token),
  );
}

function matchesKeywordGroups(value: string, groups: string[][]): boolean {
  const tokens = tokenize(value);
  if (tokens.length === 0) {
    return false;
  }

  return groups.some((group) => group.every((keyword) => keywordMatchesToken(tokens, keyword)));
}

function pickByKeyPattern(values: Record<string, unknown>, groups: string[][]): string | undefined {
  for (const [key, value] of Object.entries(values)) {
    if (!matchesKeywordGroups(key, groups)) {
      continue;
    }

    const parsed = toNonEmptyString(value);
    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function pickRawByKeyPattern(values: Record<string, unknown>, groups: string[][]): unknown {
  for (const [key, value] of Object.entries(values)) {
    if (matchesKeywordGroups(key, groups)) {
      return value;
    }
  }

  return undefined;
}

function pickByQuestionLabels(
  values: Record<string, unknown>,
  labels: Record<string, string>,
  groups: string[][],
): string | undefined {
  for (const [key, label] of Object.entries(labels)) {
    if (!matchesKeywordGroups(label, groups)) {
      continue;
    }

    const parsed = toNonEmptyString(values[key]);
    if (parsed) {
      return parsed;
    }
  }

  return undefined;
}

function pickRawByQuestionLabels(
  values: Record<string, unknown>,
  labels: Record<string, string>,
  groups: string[][],
): unknown {
  for (const [key, label] of Object.entries(labels)) {
    if (matchesKeywordGroups(label, groups)) {
      return values[key];
    }
  }

  return undefined;
}

function collectFlatValues(payload: QualtricsPayload): Record<string, unknown> {
  const merged: Record<string, unknown> = {};

  for (const source of [payload.values, payload.embeddedData, payload.responseValues]) {
    if (!source || typeof source !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      if (isPrimitiveValue(value)) {
        merged[key] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(payload)) {
    if (
      key === "values" ||
      key === "embeddedData" ||
      key === "responseValues" ||
      key === "labels" ||
      key === "questionLabels"
    ) {
      continue;
    }

    if (isPrimitiveValue(value)) {
      merged[key] = value;
    }
  }

  return merged;
}

function collectQuestionLabels(payload: QualtricsPayload): Record<string, string> {
  const labels: Record<string, string> = {};

  for (const source of [payload.labels, payload.questionLabels]) {
    if (!source || typeof source !== "object") {
      continue;
    }

    for (const [key, value] of Object.entries(source)) {
      const label = toNonEmptyString(value);
      if (label) {
        labels[key] = label;
      }
    }
  }

  return labels;
}

function normalizeEmail(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    return normalized;
  }

  return undefined;
}

function pickEmailByPattern(values: Record<string, unknown>): string | undefined {
  for (const [key, rawValue] of Object.entries(values)) {
    if (!matchesKeywordGroups(key, [["email"], ["mail"]])) {
      continue;
    }

    const value = toNonEmptyString(rawValue);
    const email = normalizeEmail(value);
    if (email) {
      return email;
    }
  }

  return undefined;
}

function pickAnyEmail(values: Record<string, unknown>): string | undefined {
  for (const rawValue of Object.values(values)) {
    const value = toNonEmptyString(rawValue);
    const email = normalizeEmail(value);
    if (email) {
      return email;
    }
  }

  return undefined;
}

function sanitizeSurveyTextValue(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const normalized = trimmed.toLowerCase();
  if (
    normalized === "0" ||
    normalized === "1" ||
    normalized === "yes" ||
    normalized === "no" ||
    normalized === "true" ||
    normalized === "false" ||
    normalized === "n/a" ||
    normalized === "na" ||
    normalized === "none" ||
    normalized === "null"
  ) {
    return undefined;
  }

  return trimmed;
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

  if (typeof value === "number") {
    return value !== 0;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    const compact = normalized.replace(/\s+/g, "");

    if (["true", "1", "yes", "y", "recruiting", "accepting", "open"].includes(compact)) {
      return true;
    }

    if (["false", "0", "no", "n", "notrecruiting", "notaccepting", "closed"].includes(compact)) {
      return false;
    }

    if (normalized.includes("not recruiting") || normalized.includes("not accepting")) {
      return false;
    }

    if (normalized.includes("recruit") || normalized.includes("accept")) {
      return true;
    }
  }

  return false;
}

export function mapQualtricsToNormalized(payload: QualtricsPayload): NormalizedSurveyPayload {
  const values = collectFlatValues(payload);
  const labels = collectQuestionLabels(payload);

  const labName =
    pickFirstString(values, ["lab_name", "labName", "QID8_TEXT", "QID8"]) ??
    pickByQuestionLabels(values, labels, [["lab", "name"], ["research", "group", "name"]]) ??
    pickByKeyPattern(values, [["lab", "name"], ["research", "group", "name"]]);

  const facultyName =
    pickFirstString(values, ["faculty_name", "facultyName", "QID2_TEXT", "QID2"]) ??
    pickByQuestionLabels(
      values,
      labels,
      [["faculty", "name"], ["professor", "name"], ["pi", "name"], ["investigator", "name"]],
    ) ??
    pickByKeyPattern(
      values,
      [["faculty", "name"], ["professor", "name"], ["pi", "name"], ["investigator", "name"]],
    );

  const facultyEmail =
    normalizeEmail(
      pickFirstString(values, ["faculty_email", "facultyEmail", "QID9_TEXT", "QID9", "QID11_TEXT", "QID11"]) ??
        pickByQuestionLabels(
          values,
          labels,
          [["faculty", "email"], ["professor", "email"], ["pi", "email"], ["contact", "email"]],
        ) ??
        pickByKeyPattern(
          values,
          [["faculty", "email"], ["professor", "email"], ["pi", "email"], ["contact", "email"]],
        ),
    ) ?? pickEmailByPattern(values) ?? pickAnyEmail(values);

  const department =
    pickFirstString(values, ["department", "dept", "QID3_TEXT", "QID3"]) ??
    pickByQuestionLabels(values, labels, [["department"], ["school"], ["program"]]) ??
    pickByKeyPattern(values, [["department"], ["school"], ["program"]]);

  const websiteUrl = normalizeWebsiteUrl(
    pickFirstString(values, ["website_url", "websiteUrl", "QID4_TEXT", "QID4"]) ??
      pickByQuestionLabels(values, labels, [["website"], ["url"], ["link"]]) ??
      pickByKeyPattern(values, [["website"], ["url"], ["link"]]),
  );

  const desiredSkillsRaw =
    pickFirstString(values, ["desired_skills", "desiredSkills", "Q6_TEXT", "Q6"]) ??
    pickByQuestionLabels(values, labels, [["desired", "skill"], ["qualification"], ["requirements"]]) ??
    pickByKeyPattern(values, [["desired", "skill"], ["qualification"], ["requirements"]]);

  const desiredSkills = sanitizeSurveyTextValue(desiredSkillsRaw);

  const optionalNotesRaw =
    pickFirstString(values, ["optional_notes", "optionalNotes"]) ??
    pickByQuestionLabels(values, labels, [["optional", "note"], ["additional", "note"], ["comment"]]) ??
    pickByKeyPattern(values, [["optional", "note"], ["additional", "note"], ["comment"]]);

  const optionalNotes = sanitizeSurveyTextValue(optionalNotesRaw);

  const qualificationsRaw =
    pickFirstString(values, ["QID5_TEXT", "QID5"]) ??
    pickByQuestionLabels(values, labels, [["skill"], ["qualification"], ["requirements"], ["note"]]) ??
    pickByKeyPattern(values, [["skill"], ["qualification"], ["requirements"], ["note"]]);

  const qualifications = sanitizeSurveyTextValue(qualificationsRaw);

  const researchArea =
    pickFirstString(values, ["research_area", "QID6_TEXT", "QID6"]) ??
    pickByQuestionLabels(values, labels, [["research", "area"], ["research", "topic"], ["topic"]]) ??
    pickByKeyPattern(values, [["research", "area"], ["research", "topic"], ["topic"]]);

  const recruitingValue =
    pickFirstRawValue(values, ["recruiting_undergrads", "recruiting", "QID1", "QID1_TEXT", "QID10", "QID10_TEXT"]) ??
    pickRawByQuestionLabels(
      values,
      labels,
      [["recruit", "undergrad"], ["recruiting"], ["undergrad", "position"], ["accept", "undergrad"]],
    ) ??
    pickRawByKeyPattern(
      values,
      [["recruit", "undergrad"], ["recruiting"], ["undergrad", "position"], ["accept", "undergrad"]],
    );

  const lastConfirmedBySubmitter =
    pickFirstString(values, ["last_confirmed_by_submitter", "QID7_TEXT", "QID7"]) ??
    pickByQuestionLabels(values, labels, [["last", "confirm"], ["confirm", "date"], ["last", "updated"]]) ??
    pickByKeyPattern(values, [["last", "confirm"], ["confirm", "date"], ["last", "updated"]]);

  const resolvedNotes = optionalNotes ?? qualifications;
  const resolvedSkills = desiredSkills ?? qualifications;

  return {
    labName: labName ?? "",
    facultyName: facultyName ?? "",
    facultyEmail,
    department: department ?? "Unknown Department",
    researchArea,
    recruitingUndergrads: normalizeBoolean(recruitingValue),
    websiteUrl,
    optionalNotes: resolvedNotes,
    desiredSkills: resolvedSkills,
    lastConfirmedBySubmitter,
  };
}
