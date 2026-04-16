// CORE LOGIC - avoid editing unless assigned

import { z } from "zod";
import type { IngestionValidationResult, NormalizedSurveyPayload } from "@/lib/types/domain";

export const QualtricsNormalizedSchema = z.object({
  labName: z.string().trim().min(1, "missing lab name"),
  facultyName: z.string().trim().min(1).default("Unknown Faculty"),
  facultyEmail: z.string().email().optional().or(z.literal("")).transform((v) => v || undefined),
  researchArea: z.string().optional(),
  recruitingUndergrads: z.boolean({
    error: "missing recruiting status",
  }),
  websiteUrl: z
    .string()
    .url("invalid URL")
    .optional()
    .or(z.literal(""))
    .transform((v) => v || undefined),
  optionalNotes: z.string().optional(),
  desiredSkills: z.string().optional(),
  lastConfirmedBySubmitter: z.string().optional(),
});

export function validateNormalizedPayload(
  payload: NormalizedSurveyPayload,
): IngestionValidationResult {
  const parsed = QualtricsNormalizedSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      valid: false,
      errors: parsed.error.issues.map((issue) => issue.message),
    };
  }
  return { valid: true, errors: [] };
}
