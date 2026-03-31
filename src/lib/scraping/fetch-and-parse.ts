// CORE LOGIC - avoid editing unless assigned

import * as cheerio from "cheerio";
import { logger } from "@/lib/logger";

export interface ScrapeResult {
  ok: boolean;
  sourceText: string;
  error?: string;
}

export async function fetchAndParseWebsiteText(websiteUrl?: string): Promise<ScrapeResult> {
  if (!websiteUrl) {
    return { ok: false, sourceText: "", error: "no website URL provided" };
  }

  try {
    const response = await fetch(websiteUrl, {
      headers: {
        "User-Agent": "ResearchStartersHubBot/0.1",
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return {
        ok: false,
        sourceText: "",
        error: `broken website fetch: ${response.status}`,
      };
    }

    const html = await response.text();
    const $ = cheerio.load(html);
    $("script,style,noscript").remove();
    const text = $("body").text().replace(/\s+/g, " ").trim();

    return {
      ok: true,
      sourceText: text.slice(0, 5000),
    };
  } catch (error) {
    logger.warn("Website fetch failed", { websiteUrl, error });
    return {
      ok: false,
      sourceText: "",
      error: "broken website fetch",
    };
  }
}
