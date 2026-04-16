import { describe, expect, it } from "vitest";
import {
  applyPosterAssets,
  buildAutoPosterAssets,
  buildSnapshotCardImageUrl,
  buildSubstackImageOnlyHtml,
  buildSubstackImageOnlyMarkdown,
  normalizePosterAssets,
} from "../../src/lib/publication/substack-template";

describe("substack template helpers", () => {
  it("builds encoded card image url from base url", () => {
    const url = buildSnapshotCardImageUrl("https://example.edu/", "snap 1");
    expect(url).toBe("https://example.edu/api/publication/cards?snapshotId=snap%201");
  });

  it("creates automatic poster assets for all snapshots", () => {
    const posters = buildAutoPosterAssets("https://example.edu", [
      {
        id: "snap-1",
        lab: { labName: "Lab A" },
      },
      {
        id: "snap-2",
        lab: { labName: "Lab B" },
      },
    ]);

    expect(posters).toEqual([
      {
        labName: "Lab A",
        imageUrl: "https://example.edu/api/publication/cards?snapshotId=snap-1",
      },
      {
        labName: "Lab B",
        imageUrl: "https://example.edu/api/publication/cards?snapshotId=snap-2",
      },
    ]);
  });

  it("prefers manually passed poster url over auto-generated one", () => {
    const autoMap = normalizePosterAssets([
      {
        labName: "Lab A",
        imageUrl: "https://auto.example/a.png",
      },
    ]);

    const mergedMap = normalizePosterAssets([
      ...Array.from(autoMap.entries()).map(([labName, imageUrl]) => ({ labName, imageUrl })),
      {
        labName: "Lab A",
        imageUrl: "https://manual.example/a.png",
      },
    ]);

    const entries = applyPosterAssets([{ labName: "Lab A" }], mergedMap);
    expect(entries[0]?.imageUrl).toBe("https://manual.example/a.png");
  });

  it("renders image-only markdown blocks for each lab", () => {
    const markdown = buildSubstackImageOnlyMarkdown("Issue 1", "fall-2026", [
      {
        labName: "Lab A",
        imageUrl: "https://example.edu/a.png",
      },
      {
        labName: "Lab B",
      },
    ]);

    expect(markdown).toContain("# Issue 1");
    expect(markdown).toContain("Semester: fall-2026");
    expect(markdown).toContain("![Lab A card](https://example.edu/a.png)");
    expect(markdown).toContain("## Lab B");
    expect(markdown).toContain("_Card image unavailable_");
    expect(markdown).not.toContain("Qualifications:");
  });

  it("renders html image blocks for each lab", () => {
    const html = buildSubstackImageOnlyHtml("Issue 2", "spring-2027", [
      {
        labName: "Lab A",
        imageUrl: "https://example.edu/a.png",
      },
      {
        labName: "Lab B",
      },
    ]);

    expect(html).toContain("<h1");
    expect(html).toContain("Issue 2");
    expect(html).toContain("spring-2027");
    expect(html).toContain('alt="Lab A card"');
    expect(html).toContain("https://example.edu/a.png");
    expect(html).toContain("Card image unavailable");
  });
});
