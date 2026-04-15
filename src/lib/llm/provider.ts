// CORE LOGIC - avoid editing unless assigned

import type { SummaryResult } from "@/lib/types/domain";

export interface SummaryInput {
  labName: string;
  facultyName?: string;
  researchArea?: string;
  surveyNotes?: string;
  websiteText?: string;
}

export interface SummarizerProvider {
  summarize(input: SummaryInput): Promise<SummaryResult>;
}
