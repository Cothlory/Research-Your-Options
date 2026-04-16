// CORE LOGIC - avoid editing unless assigned

import { NextRequest, NextResponse } from "next/server";
import { ImageResponse } from "next/og";
import { createElement } from "react";
import { prisma } from "@/lib/db/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UVA_BLUE = "#232D4B";
const UVA_ORANGE = "#E57200";
const UVA_LIGHT_BLUE = "#6DA9D2";
const UVA_WHITE = "#FFFFFF";

function trimText(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`;
}

function extractRequirements(value?: string | null): string[] {
  if (!value?.trim()) {
    return ["Not specified"];
  }

  const items = value
    .replace(/\r\n/g, "\n")
    .split(/\n|;/)
    .map((line) => line.replace(/^[-*\s]+/, "").replace(/^\d+[.)]\s*/, "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .map((line) => trimText(line, 84));

  return items.length > 0 ? items : ["Not specified"];
}

export async function GET(req: NextRequest) {
  const snapshotId = req.nextUrl.searchParams.get("snapshotId")?.trim();

  if (!snapshotId) {
    return NextResponse.json({ ok: false, error: "snapshotId is required" }, { status: 400 });
  }

  const snapshot = await prisma.labSnapshot.findUnique({
    where: { id: snapshotId },
    include: { lab: true },
  });

  if (!snapshot || !snapshot.isLatest || snapshot.status !== "approved") {
    return NextResponse.json({ ok: false, error: "Snapshot not found" }, { status: 404 });
  }

  const summary = trimText(snapshot.summaryText?.trim() || "Summary pending review.", 340);
  const requirements = extractRequirements(snapshot.desiredSkills ?? snapshot.optionalNotes);
  const websiteLabel = snapshot.websiteUrl
    ? trimText(snapshot.websiteUrl.replace(/^https?:\/\//, ""), 52)
    : "Link unavailable";
  const updatedAt = snapshot.lastVerifiedAt.toISOString().slice(0, 10);

  const h = createElement;

  return new ImageResponse(
    h(
      "div",
      {
        style: {
          width: "1200px",
          height: "1200px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px",
          backgroundColor: UVA_BLUE,
          color: UVA_WHITE,
          position: "relative",
          fontFamily: "Arial",
        },
      },
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "28px",
            paddingRight: "140px",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: "78px",
              fontWeight: 900,
              textTransform: "uppercase",
              lineHeight: 0.96,
              letterSpacing: "0.02em",
              display: "flex",
            },
          },
          trimText(snapshot.lab.labName, 84),
        ),
        h(
          "div",
          {
            style: {
              fontSize: "34px",
              lineHeight: 1.25,
              opacity: 0.96,
              display: "flex",
            },
          },
          summary,
        ),
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "22px",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: "54px",
              fontWeight: 900,
              textTransform: "uppercase",
              color: UVA_ORANGE,
              letterSpacing: "0.01em",
              display: "flex",
            },
          },
          "Minimum Requirements",
        ),
        h(
          "div",
          {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
          },
          ...requirements.map((item, index) =>
            h(
              "div",
              {
                key: `${snapshot.id}-req-${index}`,
                style: {
                  fontSize: "34px",
                  color: UVA_ORANGE,
                  lineHeight: 1.18,
                  display: "flex",
                },
              },
              `• ${item}`,
            ),
          ),
        ),
      ),
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          },
        },
        h(
          "div",
          {
            style: {
              fontSize: "52px",
              fontWeight: 900,
              textTransform: "uppercase",
              color: UVA_LIGHT_BLUE,
              letterSpacing: "0.01em",
              display: "flex",
            },
          },
          "Link To Lab Website",
        ),
        h(
          "div",
          {
            style: {
              fontSize: "42px",
              fontWeight: 700,
              color: UVA_LIGHT_BLUE,
              textDecoration: snapshot.websiteUrl ? "underline" : "none",
              textUnderlineOffset: "4px",
              display: "flex",
            },
          },
          websiteLabel,
        ),
      ),
      h(
        "div",
        {
          style: {
            position: "absolute",
            top: "44px",
            right: "44px",
            border: `2px solid ${UVA_WHITE}`,
            borderRadius: "999px",
            padding: "10px 18px",
            fontSize: "24px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "flex",
          },
        },
        snapshot.recruitingUndergrads ? "Recruiting" : "Not Recruiting",
      ),
      h(
        "div",
        {
          style: {
            position: "absolute",
            right: "44px",
            bottom: "28px",
            fontSize: "22px",
            opacity: 0.75,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            display: "flex",
          },
        },
        `Updated ${updatedAt}`,
      ),
    ),
    {
      width: 1200,
      height: 1200,
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=300",
      },
    },
  );
}
