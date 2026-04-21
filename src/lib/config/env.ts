// CORE LOGIC - avoid editing unless assigned

import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_API_BASE_URL: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_API_TOKEN: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_SURVEY_ID: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_SURVEY_LINK: z.string().default("__PLACEHOLDER__"),
  QUALTRICS_DEFAULT_TIMEZONE: z.string().default("America/New_York"),
  QUALTRICS_WAVE_EMBEDDED_DATA_KEY: z.string().default("waveId"),
  QUALTRICS_PROFESSOR_EMAILS: z.string().default(""),
  SURVEY_CAMPAIGN_DATES: z.string().default("02-01,04-01,09-01,11-01"),
  SURVEY_GRACE_DAYS: z.string().default("7"),
  OPENAI_API_KEY: z.string().default("__PLACEHOLDER__"),
  OPENAI_BASE_URL: z.string().default("https://api.openai.com/v1"),
  OPENAI_MODEL: z.string().default("gpt-4.1-mini"),
  OPENAI_SUMMARY_SCHEMA_VERSION: z.string().default("lab-intro-v1"),
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().default("__PLACEHOLDER__"),
  GOOGLE_SHEETS_TAB_NAME: z.string().default("Labs"),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().default("__PLACEHOLDER__"),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().default("__PLACEHOLDER__"),
  SUBSTACK_PUBLICATION_ENDPOINT: z.string().default("__PLACEHOLDER__"),
  SUBSTACK_API_TOKEN: z.string().default("__PLACEHOLDER__"),
  SUBSTACK_AUTH_COOKIE: z.string().default("__PLACEHOLDER__"),
  SUBSTACK_AUTHOR_ID: z.string().default("__PLACEHOLDER__"),
  SMTP_HOST: z.string().default("__PLACEHOLDER__"),
  SMTP_PORT: z.string().default("587"),
  SMTP_SECURE: z.string().default("false"),
  SMTP_USER: z.string().default("__PLACEHOLDER__"),
  SMTP_PASS: z.string().default("__PLACEHOLDER__"),
  EMAIL_FROM: z.string().default("research-hub@example.edu"),
  ENABLE_CRON_JOBS: z.string().default("false"),
  MOCK_MODE: z.string().default("true"),
  APP_BASE_URL: z.string().default("http://localhost:3000"),
  ADMIN_EMAIL: z.string().default("admin@example.edu"),
  ADMIN_PASSWORD: z.string().default("admin123"),
});

export const env = EnvSchema.parse(process.env);

function parsePositiveInt(raw: string, fallback: number): number {
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function isConfigured(value: string): boolean {
  const normalized = value.trim();
  return Boolean(normalized && normalized !== "__PLACEHOLDER__");
}

export const flags = {
  isMockMode: env.MOCK_MODE === "true",
  cronEnabled: env.ENABLE_CRON_JOBS === "true",
  campaignGraceDays: parsePositiveInt(env.SURVEY_GRACE_DAYS, 7),
  campaignDates: env.SURVEY_CAMPAIGN_DATES.split(",")
    .map((value) => value.trim())
    .filter(Boolean),
  hasSmtpConfig:
    isConfigured(env.SMTP_HOST) && isConfigured(env.SMTP_USER) && isConfigured(env.SMTP_PASS),
  hasGoogleSheetsConfig:
    isConfigured(env.GOOGLE_SHEETS_SPREADSHEET_ID) &&
    isConfigured(env.GOOGLE_SERVICE_ACCOUNT_EMAIL) &&
    isConfigured(env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
  hasSubstackConfig: isConfigured(env.SUBSTACK_PUBLICATION_ENDPOINT),
  hasQualtricsApiConfig:
    isConfigured(env.QUALTRICS_API_BASE_URL) &&
    isConfigured(env.QUALTRICS_API_TOKEN) &&
    isConfigured(env.QUALTRICS_SURVEY_ID),
};
