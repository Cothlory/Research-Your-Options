// CORE LOGIC - avoid editing unless assigned

import nodemailer from "nodemailer";
import { env, flags } from "@/lib/config/env";
import { logger } from "@/lib/logger";

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export interface BulkEmailResult {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  delivered: string[];
  failed: string[];
}

let transporter: ReturnType<typeof nodemailer.createTransport> | null = null;

function getTransporter() {
  if (transporter) {
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: Number.parseInt(env.SMTP_PORT, 10),
    secure: env.SMTP_SECURE === "true",
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  return transporter;
}

export async function sendBulkEmail(messages: EmailMessage[]): Promise<BulkEmailResult> {
  if (!flags.hasSmtpConfig) {
    logger.warn("SMTP not configured; email send skipped", { messageCount: messages.length });
    return {
      ok: false,
      skipped: true,
      reason: "SMTP configuration missing",
      delivered: [],
      failed: messages.map((message) => message.to),
    };
  }

  const client = getTransporter();
  const delivered: string[] = [];
  const failed: string[] = [];

  for (const message of messages) {
    try {
      await client.sendMail({
        from: env.EMAIL_FROM,
        to: message.to,
        subject: message.subject,
        text: message.text,
        html: message.html,
      });
      delivered.push(message.to);
    } catch (error) {
      failed.push(message.to);
      logger.error("Failed to deliver SMTP message", {
        to: message.to,
        subject: message.subject,
        error,
      });
    }
  }

  return {
    ok: failed.length === 0,
    delivered,
    failed,
  };
}
