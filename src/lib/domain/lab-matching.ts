// CORE LOGIC - avoid editing unless assigned

import type { NormalizedSurveyPayload } from "@/lib/types/domain";

export function buildLabMatchKey(payload: NormalizedSurveyPayload): string {
  return `${payload.labName.toLowerCase().trim()}::${payload.department.toLowerCase().trim()}`;
}
