// CORE LOGIC - avoid editing unless assigned

export type EntryStatus =
  | "pending_ingestion"
  | "pending_summary"
  | "pending_review"
  | "approved"
  | "rejected"
  | "stale"
  | "archived";

export type ProvenanceType =
  | "from_survey"
  | "from_website"
  | "from_llm"
  | "from_manual_edit";

export interface NormalizedSurveyPayload {
  labName: string;
  facultyName: string;
  facultyEmail?: string;
  department: string;
  researchArea?: string;
  recruitingUndergrads: boolean;
  websiteUrl?: string;
  optionalNotes?: string;
  desiredSkills?: string;
  lastConfirmedBySubmitter?: string;
}

export interface IngestionValidationResult {
  valid: boolean;
  errors: string[];
}

export interface SummaryResult {
  provider: "mock" | "openai";
  promptVersion: string;
  outputText: string;
  structured?: {
    summary: string;
    qualifications: string;
    studentFit: string;
  };
}

export interface NewsletterEntry {
  labName: string;
  shortSummary: string;
  department: string;
  recruitingUndergrads: boolean;
  websiteUrl?: string;
  updatedAt: string;
}
