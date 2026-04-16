import { describe, expect, it } from "vitest";
import { renderNewsletterIssue } from "../../src/lib/publication/newsletter";

describe("newsletter renderer", () => {
  it("renders markdown and html output", () => {
    const result = renderNewsletterIssue("Issue", "spring-2026", [
      {
        labName: "Lab A",
        shortSummary: "Summary",
        recruitingUndergrads: true,
        updatedAt: "2026-03-01",
      },
    ]);

    expect(result.markdown).toContain("Lab A");
    expect(result.html).toContain("<article");
  });
});
