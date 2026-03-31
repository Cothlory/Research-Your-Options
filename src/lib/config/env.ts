// CORE LOGIC - avoid editing unless assigned

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_API_BASE_URL: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_API_TOKEN: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_SURVEY_ID: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_WEBHOOK_SECRET: z.string().default("__PLACEHOLDER__"),
  OPENAI_API_KEY: z.string().default("__PLACEHOLDER__"),
  SUBSTACK_PUBLICATION_ENDPOINT: z.string().default("__PLACEHOLDER__"),
  SMTP_HOST: z.string().default("__PLACEHOLDER__"),
  SMTP_USER: z.string().default("__PLACEHOLDER__"),
  SMTP_PASS: z.string().default("__PLACEHOLDER__"),
  ENABLE_CRON_JOBS: z.string().default("false"),
  MOCK_MODE: z.string().default("true"),
  ADMIN_EMAIL: z.string().default("admin@example.edu"),
  ADMIN_PASSWORD: z.string().default("admin123"),
});

export const env = EnvSchema.parse(process.env);

export const flags = {
  isMockMode: env.MOCK_MODE === "true",
  cronEnabled: env.ENABLE_CRON_JOBS === "true",
};
