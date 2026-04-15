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
                    qualifications: [
                      "Basic Python",
                      "Willingness to learn data analysis workflows",
                    ],
                    suggestReject: false,
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
      facultyName: "Dr. Ada Lin",
      researchArea: "AI for education",
      surveyNotes: "Open to beginners",
      websiteText: "We build and evaluate AI learning assistants.",
    });

    expect(result.provider).toBe("openai");
    expect(result.structured?.qualifications).toContain("- Basic Python");
    expect(result.structured?.suggestReject).toBe(false);
    expect(result.outputText).toContain("AI Education Lab, led by Dr. Ada Lin, focuses on");
    expect(result.outputText).toContain("Current topics include");
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
      facultyName: "Prof. Wang",
      researchArea: "distributed systems",
    });

    expect(result.provider).toBe("openai");
    expect(result.outputText).toContain("Systems Lab, led by Prof. Wang, focuses on");
    expect(result.promptVersion).toContain("fallback");
  });

  it("sends strict schema with rejectReason in required", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  summary: "The lab studies trustworthy machine learning methods for real-world decision support.",
                  qualifications: ["Python"],
                  suggestReject: false,
                  rejectReason: null,
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
    );

    vi.stubGlobal("fetch", fetchMock);

    const provider = new OpenAISummarizerProvider(
      "fake-key",
      "https://api.openai.com/v1",
      "gpt-4.1-mini",
    );

    await provider.summarize({
      labName: "Schema Test Lab",
      websiteText: "Research website",
    });

    const [, requestInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(requestInit.body));
    const required = body.response_format.json_schema.schema.required as string[];

    expect(required).toContain("rejectReason");
  });
});
