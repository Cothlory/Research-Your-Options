import { describe, expect, it } from "vitest";
import { mapQualtricsToNormalized } from "../../src/lib/qualtrics/adapter";

describe("qualtrics adapter", () => {
  it("maps values from changed question keys using question labels", () => {
    const payload = {
      values: {
        QID11: "Computational Imaging Lab",
        QID12: "Dr. Ada Lin",
        QID13: "ada.lin@virginia.edu",
        QID14: "engineering.virginia.edu/labs/imaging",
        QID15: "No",
        QID16: "Computer vision and medical imaging",
        QID17: "Python, linear algebra",
      },
      questionLabels: {
        QID11: "What is your lab name?",
        QID12: "Professor name",
        QID13: "Faculty contact email",
        QID14: "Lab website link",
        QID15: "Are you recruiting undergraduates this semester?",
        QID16: "Research topic",
        QID17: "Desired skills",
      },
    };

    const mapped = mapQualtricsToNormalized(payload);

    expect(mapped.labName).toBe("Computational Imaging Lab");
    expect(mapped.facultyName).toBe("Dr. Ada Lin");
    expect(mapped.facultyEmail).toBe("ada.lin@virginia.edu");
    expect(mapped.recruitingUndergrads).toBe(false);
    expect(mapped.researchArea).toBe("Computer vision and medical imaging");
    expect(mapped.desiredSkills).toBe("Python, linear algebra");
    expect(mapped.websiteUrl).toBe("https://engineering.virginia.edu/labs/imaging");
    expect(mapped.department).toBe("Unknown Department");
  });

  it("maps shifted QID11 email and QID10 recruiting fields", () => {
    const payload = {
      values: {
        QID8_TEXT: "RAISE Group",
        QID2_TEXT: "Ferdinando Fioretto",
        QID11_TEXT: "kfw4mu@virginia.edu",
        QID4_TEXT: "https://nandofioretto.github.io/group/",
        QID5_TEXT: "Has basic knowledge in AI agents",
        QID10: 1,
      },
    };

    const mapped = mapQualtricsToNormalized(payload);

    expect(mapped.labName).toBe("RAISE Group");
    expect(mapped.facultyName).toBe("Ferdinando Fioretto");
    expect(mapped.facultyEmail).toBe("kfw4mu@virginia.edu");
    expect(mapped.recruitingUndergrads).toBe(true);
    expect(mapped.websiteUrl).toBe("https://nandofioretto.github.io/group/");
    expect(mapped.desiredSkills).toContain("Has basic knowledge in AI agents");
  });

  it("maps qualifications from Q6 textbox when provided", () => {
    const payload = {
      values: {
        Q8: "NLP Lab",
        Q2: "Dr. Mei Chen",
        Q6: "Python\nLinear algebra\nExperience with transformers",
      },
    };

    const mapped = mapQualtricsToNormalized(payload);

    expect(mapped.desiredSkills).toBe("Python\nLinear algebra\nExperience with transformers");
  });
});
