import { describe, expect, it } from "vitest";
import { extractRequirementBullets, formatRequirementBullets } from "../../src/lib/domain/requirements";

describe("requirements extraction", () => {
  it("keeps explicit bullet requirements and drops intro prose", () => {
    const input = `No real requirements except for displaying motivation and high level of interest in the topic. It helps if the applicant has done some initial research into our lab focus and can align their goals and interests with the lab's. If joining the lab the applicant must be comfortable with the following:
- following strict safety guidelines and wearing required PPE
- learning polymer synthesis techniques, which may include the use of specific protocols and safety measures
- learning to culture human cells and following biosafety guidelines`;

    const items = extractRequirementBullets(input);

    expect(items).toEqual([
      "following strict safety guidelines and wearing required PPE",
      "learning polymer synthesis techniques",
      "learning to culture human cells and following biosafety guidelines",
    ]);
  });

  it("returns markdown bullets with line breaks", () => {
    const input = `- prior lab safety training\n- careful documentation habits\n- willingness to collaborate`;

    const formatted = formatRequirementBullets(input);

    expect(formatted).toBe(
      "- prior lab safety training\n- careful documentation habits\n- willingness to collaborate",
    );
  });

  it("filters numeric artifacts", () => {
    const items = extractRequirementBullets("8999999761581421");

    expect(items).toEqual([]);
  });
});
