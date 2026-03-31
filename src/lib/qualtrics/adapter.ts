// CORE LOGIC - avoid editing unless assigned

import type { NormalizedSurveyPayload } from "@/lib/types/domain";

interface QualtricsPayload {
  values?: Record<string, string | boolean | null | undefined>;
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

  return {
    labName: String(values.lab_name ?? "").trim(),
    facultyName: String(values.faculty_name ?? "").trim(),
    facultyEmail: String(values.faculty_email ?? "").trim() || undefined,
    department: String(values.department ?? "").trim(),
    researchArea: String(values.research_area ?? "").trim() || undefined,
    recruitingUndergrads: normalizeBoolean(values.recruiting_undergrads),
    websiteUrl: String(values.website_url ?? "").trim() || undefined,
    optionalNotes: String(values.optional_notes ?? "").trim() || undefined,
    desiredSkills: String(values.desired_skills ?? "").trim() || undefined,
    lastConfirmedBySubmitter:
      String(values.last_confirmed_by_submitter ?? "").trim() || undefined,
  };
}
