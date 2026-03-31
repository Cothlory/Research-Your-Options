// CORE LOGIC - avoid editing unless assigned

import type { EntryStatus } from "@/lib/types/domain";

const validTransitions: Record<EntryStatus, EntryStatus[]> = {
  pending_ingestion: ["pending_summary", "rejected"],
  pending_summary: ["pending_review", "rejected"],
  pending_review: ["approved", "rejected"],
  approved: ["stale", "archived"],
  rejected: ["pending_review", "archived"],
  stale: ["approved", "archived"],
  archived: [],
};

export function canTransitionStatus(from: EntryStatus, to: EntryStatus): boolean {
  return validTransitions[from].includes(to);
}
