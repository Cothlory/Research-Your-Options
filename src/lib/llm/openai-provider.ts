// CORE LOGIC - avoid editing unless assigned

import { z } from "zod";
import type { SummaryResult } from "@/lib/types/domain";
import type { SummarizerProvider, SummaryInput } from "@/lib/llm/provider";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";

const StructuredSummarySchema = z.object({
  summary: z.string().min(20).max(900),
  qualifications: z.array(z.string().min(2).max(160)).min(1).max(3),
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

function trimToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ")}.`;
}

function toBulletLines(items: string[]): string {
  return items.slice(0, 3).map((item) => `- ${item.trim()}`).join("\n");
}

function normalizePhrase(text?: string | null): string {
  if (!text) {
    return "";
  }

  return text
    .replace(/\s+/g, " ")
    .replace(/^[\s,;:.]+|[\s,;:.]+$/g, "")
    .trim();
}

function extractTemplatePart(summary: string, marker: string): string | undefined {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`${escaped}\\s+([^.]*)\\.?`, "i");
  const match = summary.match(regex);
  const value = normalizePhrase(match?.[1]);
  return value || undefined;
}

function buildTemplateSummary(
  input: SummaryInput,
  focusField?: string,
  topics?: string,
): string {
  const labName = normalizePhrase(input.labName) || "This lab";
  const professor = normalizePhrase(input.facultyName) || "the professor";
  const focus = normalizePhrase(focusField) || normalizePhrase(input.researchArea) || "ongoing research";
  const currentTopics =
    normalizePhrase(topics) ||
    normalizePhrase(input.researchArea) ||
    "projects listed on the lab website";

  return trimToWords(
    `${labName}, led by ${professor}, focuses on ${focus}. Current topics include ${currentTopics}.`,
    70,
  );
}

export class OpenAISummarizerProvider implements SummarizerProvider {
  constructor(
    private readonly apiKey: string,
    private readonly baseUrl: string,
    private readonly model: string,
  ) {}

  private buildPrompt(input: SummaryInput): string {
    return [
      `Lab name: ${input.labName}`,
      `Professor name: ${input.facultyName ?? "not provided"}`,
      `Research area: ${input.researchArea ?? "not provided"}`,
      `Survey notes: ${input.surveyNotes ?? "not provided"}`,
      "Website text:",
      input.websiteText?.slice(0, 4000) ?? "not provided",
      "",
      "Return only evidence-backed details from the website text.",
      "summary must be <= 70 words and follow this exact two-sentence pattern:",
      "<Lab name>, led by <Professor name>, focuses on <focus field>. Current topics include <topic 1>, <topic 2>, ...",
      "Do not include staffing details like students, interns, visitors, team size, or onboarding process.",
      "qualifications must be 1-3 concise bullet candidates.",
      "Set suggestReject=true when this looks not like a real research lab listing.",
      "rejectReason should be short and specific if suggestReject=true, otherwise set rejectReason to null.",
    ].join("\n");
  }

  private fallbackSummary(input: SummaryInput): SummaryResult {
    const summary = buildTemplateSummary(input);

    return {
      provider: "openai",
      promptVersion: `${env.OPENAI_SUMMARY_SCHEMA_VERSION}-fallback`,
      outputText: summary,
      structured: {
        summary,
        qualifications: "- Basic interest in the topic\n- Willingness to learn\n- Consistent communication",
        suggestReject: false,
      },
    };
  }

  async summarize(input: SummaryInput): Promise<SummaryResult> {
    const endpoint = `${this.baseUrl.replace(/\/$/, "")}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          temperature: 0.2,
          messages: [
            {
              role: "system",
              content:
                "You summarize university labs for undergraduate audiences. Return only valid JSON.",
            },
            {
              role: "user",
              content: this.buildPrompt(input),
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "lab_intro_schema",
              strict: true,
              schema: {
                type: "object",
                additionalProperties: false,
                properties: {
                  summary: {
                    type: "string",
                    description: "Student-facing summary, no more than 100 words.",
                  },
                  qualifications: {
                    type: "array",
                    minItems: 1,
                    maxItems: 3,
                    items: {
                      type: "string",
                    },
                    description: "Up to 3 concise minimum qualifications.",
                  },
                  suggestReject: {
                    type: "boolean",
                    description: "True only when the content likely does not represent a research lab listing.",
                  },
                  rejectReason: {
                    anyOf: [{ type: "string" }, { type: "null" }],
                    description: "Short reason for suggestReject=true.",
                  },
                },
                required: ["summary", "qualifications", "suggestReject", "rejectReason"],
              },
            },
          },
        }),
        cache: "no-store",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI request failed (${response.status}): ${errorText}`);
      }

      const payload = (await response.json()) as ChatCompletionResponse;
      const content = payload.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error("OpenAI response missing message content");
      }

      const structured = StructuredSummarySchema.parse(JSON.parse(content));
      const focusFromSummary = extractTemplatePart(structured.summary, "focuses on");
      const topicsFromSummary = extractTemplatePart(structured.summary, "current topics include");
      const summary = buildTemplateSummary(input, focusFromSummary, topicsFromSummary);
      const qualifications = toBulletLines(structured.qualifications);

      return {
        provider: "openai",
        promptVersion: env.OPENAI_SUMMARY_SCHEMA_VERSION,
        outputText: summary,
        structured: {
          summary,
          qualifications,
          suggestReject: structured.suggestReject,
          rejectReason: structured.rejectReason ?? undefined,
        },
      };
    } catch (error) {
      logger.warn("OpenAI summarization failed; using fallback summary", {
        error,
        model: this.model,
      });
      return this.fallbackSummary(input);
    }
  }
}
