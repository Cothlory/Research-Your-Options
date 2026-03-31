// CORE LOGIC - avoid editing unless assigned

import type { SummaryResult } from "@/lib/types/domain";
import type { SummarizerProvider, SummaryInput } from "@/lib/llm/provider";

export class OpenAISummarizerProvider implements SummarizerProvider {
  constructor(private readonly apiKey: string) {}

  async summarize(input: SummaryInput): Promise<SummaryResult> {
    // TODO(owner=me): wire real OpenAI API call when credentials are available.
    return {
      provider: "openai",
      promptVersion: "openai-placeholder-v1",
      outputText: `${input.labName} focuses on ${input.researchArea ?? "research"}.`,
    };
  }
}
