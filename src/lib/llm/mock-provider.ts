// CORE LOGIC - avoid editing unless assigned

import type { SummaryResult } from "@/lib/types/domain";
import type { SummarizerProvider, SummaryInput } from "@/lib/llm/provider";

export class MockSummarizerProvider implements SummarizerProvider {
  async summarize(input: SummaryInput): Promise<SummaryResult> {
    const research = input.researchArea ?? "interdisciplinary research";
    return {
      provider: "mock",
      promptVersion: "mock-v1",
      outputText: `${input.labName} studies ${research}. Undergraduate students can expect structured onboarding and practical project exposure.`,
    };
  }
}
