// CORE LOGIC - avoid editing unless assigned

import { env, flags } from "@/lib/config/env";
import type { SummarizerProvider } from "@/lib/llm/provider";
import { MockSummarizerProvider } from "@/lib/llm/mock-provider";
import { OpenAISummarizerProvider } from "@/lib/llm/openai-provider";

export function getSummarizerProvider(): SummarizerProvider {
  if (flags.isMockMode || !env.OPENAI_API_KEY || env.OPENAI_API_KEY === "__PLACEHOLDER__") {
    return new MockSummarizerProvider();
  }
  return new OpenAISummarizerProvider(env.OPENAI_API_KEY, env.OPENAI_BASE_URL, env.OPENAI_MODEL);
}
