// CORE LOGIC - avoid editing unless assigned

import type { NormalizedSurveyPayload } from "@/lib/types/domain";

export function buildLabMatchKey(payload: NormalizedSurveyPayload): string {
  const labName = payload.labName.toLowerCase().trim();
  const facultyEmail = payload.facultyEmail?.toLowerCase().trim();
  const facultyName = payload.facultyName.toLowerCase().trim();

  return `${labName}::${facultyEmail || facultyName}`;
}
