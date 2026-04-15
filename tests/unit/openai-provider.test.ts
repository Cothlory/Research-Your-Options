import { afterEach, describe, expect, it, vi } from "vitest";
import { OpenAISummarizerProvider } from "../../src/lib/llm/openai-provider";

describe("openai summarizer provider", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns structured summary when OpenAI responds with valid JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    summary:
                      "The lab studies applied AI for educational systems and offers mentored project roles for undergraduates.",
                    qualifications: "Basic Python and willingness to learn data analysis workflows.",
                    studentFit:
                      "Good fit for students who enjoy experimentation and regular team collaboration.",
                  }),
                },
              },
            ],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      ),
    );

    const provider = new OpenAISummarizerProvider(
      "fake-key",
      "https://api.openai.com/v1",
      "gpt-4.1-mini",
    );

    const result = await provider.summarize({
      labName: "AI Education Lab",
      researchArea: "AI for education",
      surveyNotes: "Open to beginners",
      websiteText: "We build and evaluate AI learning assistants.",
    });

    expect(result.provider).toBe("openai");
    expect(result.structured?.qualifications).toContain("Python");
    expect(result.outputText).toContain("Minimum qualifications");
  });

  it("falls back to deterministic text when API call fails", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network unavailable")));

    const provider = new OpenAISummarizerProvider(
      "fake-key",
      "https://api.openai.com/v1",
      "gpt-4.1-mini",
    );

    const result = await provider.summarize({
      labName: "Systems Lab",
      researchArea: "distributed systems",
    });

    expect(result.provider).toBe("openai");
    expect(result.outputText).toContain("Systems Lab");
    expect(result.promptVersion).toContain("fallback");
  });
});
