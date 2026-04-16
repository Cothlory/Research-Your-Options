// CORE LOGIC - avoid editing unless assigned

import { z } from "zod";
import { env, flags } from "@/lib/config/env";
import { logger } from "@/lib/logger";

const LlmUpdateDecisionSchema = z.object({
  fieldsToUpdate: z.array(z.string()).default([]),
  suggestReject: z.boolean(),
  rejectReason: z.string().max(220).nullable().optional(),
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
}

export interface UpdateFieldCandidate {
  field: string;
  previousValue: string;
  nextValue: string;
}

export interface UpdateEvaluationInput {
  labName: string;
  websiteText?: string;
  changedFields: UpdateFieldCandidate[];
}

export interface UpdateEvaluationResult {
  fieldsToUpdate: string[];
  suggestReject: boolean;
  rejectReason?: string;
}

const NON_LAB_SIGNALS = [
  "restaurant",
  "real estate",
  "hotel",
  "airbnb",
  "wedding",
  "barbershop",
  "beauty salon",
  "tax service",
  "ecommerce",
];

const LAB_SIGNALS = [
  "research",
  "lab",
  "university",
  "faculty",
  "graduate",
  "publication",
  "professor",
  "phd",
];

function heuristicRejectDecision(websiteText?: string): { suggestReject: boolean; rejectReason?: string } {
  const content = (websiteText ?? "").toLowerCase();

  if (!content.trim()) {
    return { suggestReject: false };
  }

  const hasNonLabSignal = NON_LAB_SIGNALS.some((signal) => content.includes(signal));
  const hasLabSignal = LAB_SIGNALS.some((signal) => content.includes(signal));

  if (hasNonLabSignal && !hasLabSignal) {
    return {
      suggestReject: true,
      rejectReason: "Website content appears unrelated to an academic research lab.",
    };
  }

  return { suggestReject: false };
}

function fallbackEvaluation(input: UpdateEvaluationInput): UpdateEvaluationResult {
  const rejectDecision = heuristicRejectDecision(input.websiteText);

  return {
    fieldsToUpdate: input.changedFields.map((field) => field.field),
    suggestReject: rejectDecision.suggestReject,
    rejectReason: rejectDecision.rejectReason,
  };
}

function buildPrompt(input: UpdateEvaluationInput): string {
  const fieldBlock = input.changedFields
    .map((field) => {
      return [
        `Field: ${field.field}`,
        `Old: ${field.previousValue || "(empty)"}`,
        `New: ${field.nextValue || "(empty)"}`,
      ].join("\n");
    })
    .join("\n\n");

  return [
    `Lab name: ${input.labName}`,
    "Changed fields:",
    fieldBlock,
    "",
    "Website text excerpt:",
    (input.websiteText ?? "(missing website text)").slice(0, 5000),
    "",
    "Task:",
    "1) Return fieldsToUpdate containing only truly meaningful updates.",
    "2) suggestReject=true only if this likely is not a real academic lab listing.",
    "3) Keep rejectReason concise and factual when suggestReject=true.",
  ].join("\n");
}

export async function evaluateFieldUpdatesWithLlm(
  input: UpdateEvaluationInput,
): Promise<UpdateEvaluationResult> {
  if (input.changedFields.length === 0) {
    return { fieldsToUpdate: [], suggestReject: false };
  }

  const allowedFields = input.changedFields.map((field) => field.field);

  if (flags.isMockMode || !env.OPENAI_API_KEY || env.OPENAI_API_KEY === "__PLACEHOLDER__") {
    return fallbackEvaluation(input);
  }

  const endpoint = `${env.OPENAI_BASE_URL.replace(/\/$/, "")}/chat/completions`;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: env.OPENAI_MODEL,
        temperature: 0,
        messages: [
          {
            role: "system",
            content:
              "You validate university lab update diffs. Return strict JSON only with fieldsToUpdate, suggestReject, rejectReason.",
          },
          {
            role: "user",
            content: buildPrompt(input),
          },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "lab_update_decision",
            strict: true,
            schema: {
              type: "object",
              additionalProperties: false,
              properties: {
                fieldsToUpdate: {
                  type: "array",
                  items: {
                    type: "string",
                    enum: allowedFields,
                  },
                },
                suggestReject: {
                  type: "boolean",
                },
                rejectReason: {
                  anyOf: [{ type: "string" }, { type: "null" }],
                },
              },
              required: ["fieldsToUpdate", "suggestReject", "rejectReason"],
            },
          },
        },
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`LLM update evaluator failed (${response.status}): ${body}`);
    }

    const payload = (await response.json()) as ChatCompletionResponse;
    const content = payload.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("LLM update evaluator missing message content");
    }

    const parsed = LlmUpdateDecisionSchema.parse(JSON.parse(content));
    const fieldsToUpdate = parsed.fieldsToUpdate.filter((field) => allowedFields.includes(field));

    return {
      fieldsToUpdate,
      suggestReject: parsed.suggestReject,
      rejectReason: parsed.rejectReason ?? undefined,
    };
  } catch (error) {
    logger.warn("LLM update evaluator failed; using fallback decisions", { error });
    return fallbackEvaluation(input);
  }
}
