// CORE LOGIC - avoid editing unless assigned

import type { SummaryResult } from "@/lib/types/domain";
import type { SummarizerProvider, SummaryInput } from "@/lib/llm/provider";

export class MockSummarizerProvider implements SummarizerProvider {
  async summarize(input: SummaryInput): Promise<SummaryResult> {
    const research = input.researchArea ?? "interdisciplinary research";
    const professor = input.facultyName?.trim() || "the professor";
    const summary = `${input.labName}, led by ${professor}, focuses on ${research}. Current topics include ${research}.`;
    return {
      provider: "mock",
      promptVersion: "mock-v1",
      outputText: summary,
      structured: {
        summary,
        qualifications: "- Interest in the topic\n- Basic coursework exposure\n- Reliable communication",
        suggestReject: false,
      },
    };
  }
}
