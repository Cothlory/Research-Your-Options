// CORE LOGIC - avoid editing unless assigned

export interface PosterAssetInput {
  labName: string;
  imageUrl: string;
}

export interface SubstackImageEntry {
  labName: string;
  imageUrl?: string;
}

interface IndexedEntry {
  index: number;
  anchorId: string;
  entry: SubstackImageEntry;
}

interface IssueSummaryCopy {
  overview: string;
  guidance: string;
  highlight: string;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.trim();
  const normalized = trimmed.length > 0 ? trimmed : "http://localhost:3000";
  return normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}

function toAnchorToken(value: string): string {
  const token = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return token || "lab";
}

function indexEntries(entries: SubstackImageEntry[]): IndexedEntry[] {
  const used = new Set<string>();

  return entries.map((entry, idx) => {
    const index = idx + 1;
    const base = `${toAnchorToken(entry.labName)}-${index}`;

    let anchorId = `lab-${base}`;
    let suffix = 2;

    while (used.has(anchorId)) {
      anchorId = `lab-${base}-${suffix}`;
      suffix += 1;
    }

    used.add(anchorId);

    return {
      index,
      anchorId,
      entry,
    };
  });
}

function formatLabNameList(names: string[]): string {
  if (names.length === 0) {
    return "";
  }

  if (names.length === 1) {
    return names[0];
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  const head = names.slice(0, -1).join(", ");
  const tail = names[names.length - 1];

  return `${head}, and ${tail}`;
}

function buildIssueSummaryCopy(entries: SubstackImageEntry[], unavailableCount: number): IssueSummaryCopy {
  const previewNames = entries.slice(0, 3).map((entry) => entry.labName);
  const listedLabs = formatLabNameList(previewNames);
  const remainingCount = Math.max(0, entries.length - previewNames.length);

  const overview =
    entries.length === 0
      ? "This issue currently has no approved opportunities to show."
      : `This issue curates ${entries.length} approved undergraduate research opportunities with visual lab cards designed for quick comparison.`;

  const guidance =
    unavailableCount > 0
      ? `Use the quick index to jump between labs. ${unavailableCount} card${
          unavailableCount === 1 ? " is" : "s are"
        } still pending image generation and marked clearly below.`
      : "Use the quick index to jump between labs, compare requirements, and follow each card link for deeper outreach prep.";

  const highlight =
    entries.length === 0
      ? "As new approved snapshots are published, they will appear in this issue automatically."
      : `Featured in this issue: ${listedLabs}${remainingCount > 0 ? `, plus ${remainingCount} more` : ""}.`;

  return {
    overview,
    guidance,
    highlight,
  };
}

export function buildSnapshotCardImageUrl(baseUrl: string, snapshotId: string): string {
  const normalizedBaseUrl = normalizeBaseUrl(baseUrl);
  return `${normalizedBaseUrl}/api/publication/cards?snapshotId=${encodeURIComponent(snapshotId)}`;
}

export function buildAutoPosterAssets(
  baseUrl: string,
  snapshots: Array<{ id: string; lab: { labName: string } }>,
): PosterAssetInput[] {
  return snapshots
    .map((snapshot) => ({
      labName: snapshot.lab.labName,
      imageUrl: buildSnapshotCardImageUrl(baseUrl, snapshot.id),
    }))
    .filter((poster) => poster.labName.trim().length > 0);
}

export function normalizePosterAssets(posters: PosterAssetInput[]): Map<string, string> {
  const map = new Map<string, string>();

  for (const poster of posters) {
    const name = poster.labName.trim().toLowerCase();
    const url = poster.imageUrl.trim();
    if (name && url) {
      map.set(name, url);
    }
  }

  return map;
}

export function applyPosterAssets(
  entries: Array<{ labName: string }>,
  posters: Map<string, string>,
): SubstackImageEntry[] {
  return entries.map((entry) => ({
    labName: entry.labName,
    imageUrl: posters.get(entry.labName.toLowerCase()),
  }));
}

export function buildSubstackImageOnlyMarkdown(
  title: string,
  semesterLabel: string,
  entries: SubstackImageEntry[],
): string {
  const indexed = indexEntries(entries);
  const imageCount = entries.filter((entry) => Boolean(entry.imageUrl)).length;
  const unavailableCount = entries.length - imageCount;
  const summary = buildIssueSummaryCopy(entries, unavailableCount);

  const quickIndex = indexed.map((item) => `${item.index}. [${item.entry.labName}](#${item.anchorId})`);

  const blocks = indexed.map((item) => {
    const entry = item.entry;
    const lines = [
      `<a id="${item.anchorId}"></a>`,
      `## ${item.index}. ${entry.labName}`,
      "",
      entry.imageUrl ? `![${entry.labName} card](${entry.imageUrl})` : "_Card image unavailable_",
      "",
      "[Back to top](#issue-top)",
    ];

    return lines.join("\n");
  });

  return [
    `<a id="issue-top"></a>`,
    `# ${title}`,
    "",
    `Semester: ${semesterLabel}`,
    `Total opportunities: ${entries.length}`,
    `Cards available: ${imageCount}${unavailableCount > 0 ? ` (${unavailableCount} pending image)` : ""}`,
    "",
    "## Issue Summary",
    "",
    summary.overview,
    summary.guidance,
    summary.highlight,
    "",
    "## Quick Index",
    "",
    ...(quickIndex.length > 0 ? quickIndex : ["No labs available in this issue."]),
    "",
    ...blocks,
  ].join("\n");
}

export function buildSubstackImageOnlyHtml(
  title: string,
  semesterLabel: string,
  entries: SubstackImageEntry[],
): string {
  const indexed = indexEntries(entries);
  const imageCount = entries.filter((entry) => Boolean(entry.imageUrl)).length;
  const unavailableCount = entries.length - imageCount;
  const summary = buildIssueSummaryCopy(entries, unavailableCount);

  const safeTitle = escapeHtml(title);
  const safeSemesterLabel = escapeHtml(semesterLabel);
  const safeOverview = escapeHtml(summary.overview);
  const safeGuidance = escapeHtml(summary.guidance);
  const safeHighlight = escapeHtml(summary.highlight);

  const indexRows =
    indexed.length > 0
      ? indexed
          .map((item) => {
            const safeLabName = escapeHtml(item.entry.labName);

            return [
              `<tr>`,
              `<td style="padding: 6px 10px 6px 0; vertical-align: top; color: #64748b; font-weight: 600; width: 44px;">${item.index}.</td>`,
              `<td style="padding: 6px 0; vertical-align: top;">`,
              `<a href="#${item.anchorId}" style="color: #1d4ed8; text-decoration: none;">${safeLabName}</a>`,
              `</td>`,
              `</tr>`,
            ].join("");
          })
          .join("")
      : `<tr><td style="padding: 6px 0; color: #64748b;"><em>No labs available in this issue.</em></td></tr>`;

  const sections = indexed
    .map((item) => {
      const entry = item.entry;
      const safeLabName = escapeHtml(entry.labName);

      if (!entry.imageUrl) {
        return [
          `<section id="${item.anchorId}" style="margin: 0 0 28px; padding: 18px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">`,
          `<h2 style="margin: 0 0 12px; color: #232d4b; font-size: 24px; line-height: 1.2;">${item.index}. ${safeLabName}</h2>`,
          `<p style="margin: 0 0 12px; color: #64748b;"><em>Card image unavailable</em></p>`,
          `<p style="margin: 0;"><a href="#issue-top" style="color: #1d4ed8; text-decoration: none; font-size: 14px;">Back to top</a></p>`,
          `</section>`,
        ].join("");
      }

      const safeImageUrl = escapeHtml(entry.imageUrl);

      return [
        `<section id="${item.anchorId}" style="margin: 0 0 28px; padding: 18px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">`,
        `<h2 style="margin: 0 0 12px; color: #232d4b; font-size: 24px; line-height: 1.2;">${item.index}. ${safeLabName}</h2>`,
        `<img src="${safeImageUrl}" alt="${safeLabName} card" style="display: block; width: 100%; max-width: 720px; height: auto; border-radius: 10px; border: 1px solid #e2e8f0;" />`,
        `<p style="margin: 12px 0 0;"><a href="#issue-top" style="color: #1d4ed8; text-decoration: none; font-size: 14px;">Back to top</a></p>`,
        `</section>`,
      ].join("");
    })
    .join("");

  return [
    `<article id="issue-top" style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a; max-width: 760px; margin: 0 auto; background: #f8fafc; padding: 20px;">`,
    `<header style="margin: 0 0 22px; padding: 20px; border: 1px solid #dbeafe; border-radius: 14px; background: #eff6ff;">`,
    `<h1 style="margin: 0 0 10px; color: #232d4b; font-size: 34px; line-height: 1.2;">${safeTitle}</h1>`,
    `<p style="margin: 0 0 12px; color: #334155;"><strong>Semester:</strong> ${safeSemesterLabel}</p>`,
    `<p style="margin: 0 0 6px; color: #334155;"><strong>Total opportunities:</strong> ${entries.length}</p>`,
    `<p style="margin: 0; color: #334155;"><strong>Cards available:</strong> ${imageCount}${
      unavailableCount > 0 ? ` (${unavailableCount} pending image)` : ""
    }</p>`,
    `<p style="margin: 12px 0 0; color: #1e293b;">${safeOverview}</p>`,
    `<p style="margin: 8px 0 0; color: #334155;">${safeGuidance}</p>`,
    `<p style="margin: 8px 0 0; color: #334155;">${safeHighlight}</p>`,
    `</header>`,
    `<section style="margin: 0 0 22px; padding: 16px 18px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">`,
    `<h2 style="margin: 0 0 10px; color: #1e293b; font-size: 20px; line-height: 1.25;">Quick Index</h2>`,
    `<p style="margin: 0 0 10px; color: #64748b; font-size: 14px;">Jump directly to a specific lab card.</p>`,
    `<table role="presentation" cellpadding="0" cellspacing="0" style="width: 100%; border-collapse: collapse;">`,
    indexRows,
    `</table>`,
    `</section>`,
    sections,
    `</article>`,
  ].join("");
}