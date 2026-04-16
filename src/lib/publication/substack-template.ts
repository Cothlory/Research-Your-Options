// CORE LOGIC - avoid editing unless assigned

export interface PosterAssetInput {
  labName: string;
  imageUrl: string;
}

export interface SubstackImageEntry {
  labName: string;
  imageUrl?: string;
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
  const blocks = entries.map((entry) => {
    const lines = [
      `## ${entry.labName}`,
      "",
      entry.imageUrl ? `![${entry.labName} card](${entry.imageUrl})` : "_Card image unavailable_",
    ];

    return lines.join("\n");
  });

  return [
    `# ${title}`,
    "",
    `Semester: ${semesterLabel}`,
    "",
    "This issue contains all latest research opportunity cards.",
    "",
    ...blocks,
  ].join("\n");
}

export function buildSubstackImageOnlyHtml(
  title: string,
  semesterLabel: string,
  entries: SubstackImageEntry[],
): string {
  const safeTitle = escapeHtml(title);
  const safeSemesterLabel = escapeHtml(semesterLabel);

  const sections = entries
    .map((entry) => {
      const safeLabName = escapeHtml(entry.labName);

      if (!entry.imageUrl) {
        return [
          `<section style="margin: 0 0 24px;">`,
          `<h2 style="margin: 0 0 12px; color: #232d4b;">${safeLabName}</h2>`,
          `<p style="margin: 0; color: #475569;"><em>Card image unavailable</em></p>`,
          `</section>`,
        ].join("");
      }

      const safeImageUrl = escapeHtml(entry.imageUrl);

      return [
        `<section style="margin: 0 0 24px;">`,
        `<h2 style="margin: 0 0 12px; color: #232d4b;">${safeLabName}</h2>`,
        `<img src="${safeImageUrl}" alt="${safeLabName} card" style="display: block; width: 100%; max-width: 720px; height: auto; border-radius: 8px; border: 1px solid #e2e8f0;" />`,
        `</section>`,
      ].join("");
    })
    .join("");

  return [
    `<article style="font-family: Arial, sans-serif; line-height: 1.5; color: #0f172a;">`,
    `<h1 style="margin: 0 0 8px; color: #232d4b;">${safeTitle}</h1>`,
    `<p style="margin: 0 0 12px; color: #475569;"><strong>Semester:</strong> ${safeSemesterLabel}</p>`,
    `<p style="margin: 0 0 24px; color: #334155;">This issue contains all latest research opportunity cards.</p>`,
    sections,
    `</article>`,
  ].join("");
}