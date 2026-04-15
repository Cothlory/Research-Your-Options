// CORE LOGIC - avoid editing unless assigned

import { z } from "zod";
import type { SummaryResult } from "@/lib/types/domain";
import type { SummarizerProvider, SummaryInput } from "@/lib/llm/provider";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/logger";

const StructuredSummarySchema = z.object({
  summary: z.string().min(40).max(480),
  qualifications: z.string().min(10).max(220),
  studentFit: z.string().min(10).max(220),
});

interface ChatCompletionResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
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
      `Research area: ${input.researchArea ?? "not provided"}`,
      `Survey notes: ${input.surveyNotes ?? "not provided"}`,
      "Website text:",
      input.websiteText?.slice(0, 4000) ?? "not provided",
      "",
      "Write concise, student-friendly copy in plain language.",
      "Avoid hype and unsupported claims.",
      "If data is missing, infer cautiously and mention uncertainty in neutral wording.",
    ].join("\n");
  }

  private fallbackSummary(input: SummaryInput): SummaryResult {
    return {
      provider: "openai",
      promptVersion: `${env.OPENAI_SUMMARY_SCHEMA_VERSION}-fallback`,
      outputText: `${input.labName} focuses on ${input.researchArea ?? "ongoing research"}. Students with ${input.surveyNotes ? "relevant background and interest" : "curiosity and willingness to learn"} are encouraged to explore the lab website and reach out.`,
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
                    description:
                      "2-4 sentences describing what the lab works on and what students might do.",
                  },
                  qualifications: {
                    type: "string",
                    description: "Minimum or preferred skills/experience for new undergrads.",
                  },
                  studentFit: {
                    type: "string",
                    description: "Who is likely to be a good fit and first practical next step.",
                  },
                },
                required: ["summary", "qualifications", "studentFit"],
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

      return {
        provider: "openai",
        promptVersion: env.OPENAI_SUMMARY_SCHEMA_VERSION,
        outputText: [
          structured.summary,
          `Minimum qualifications: ${structured.qualifications}`,
          `Student fit: ${structured.studentFit}`,
        ].join("\n"),
        structured,
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
