import { describe, expect, it } from "vitest";
import { canTransitionStatus } from "../../src/lib/domain/status";

describe("status transitions", () => {
  it("allows normal transition path", () => {
    expect(canTransitionStatus("pending_review", "approved")).toBe(true);
  });

  it("blocks invalid transition", () => {
    expect(canTransitionStatus("approved", "pending_summary")).toBe(false);
  });
});
