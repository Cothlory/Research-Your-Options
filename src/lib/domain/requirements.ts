// CORE LOGIC - avoid editing unless assigned

interface RequirementExtractionOptions {
  maxItems?: number;
  maxWordsPerItem?: number;
}

const DEFAULT_MAX_ITEMS = 3;
const DEFAULT_MAX_WORDS = 18;

const INVALID_VALUES = new Set([
  "0",
  "1",
  "error",
  "err",
  "unknown",
  "undefined",
  "not specified",
  "not available",
  "yes",
  "no",
  "true",
  "false",
  "n/a",
  "na",
  "none",
  "null",
]);

const REQUIREMENT_KEYWORDS = [
  "must",
  "required",
  "requirement",
  "comfortable",
  "experience",
  "knowledge",
  "familiar",
  "ability",
  "willing",
  "safety",
  "biosafety",
  "ppe",
  "protocol",
  "technique",
  "skill",
  "python",
  "matlab",
  "r ",
  "communication",
  "motivation",
  "interest",
];

function trimToWords(text: string, maxWords: number): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return words.slice(0, maxWords).join(" ");
}

function splitIntoSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return [];
  }

  const sentences = normalized
    .split(/[.!?]\s+/)
    .map((value) => value.trim())
    .filter(Boolean);

  return sentences.length > 1 ? sentences : [normalized];
}

function cleanCandidate(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/^no\s+(real|specific)?\s*requirements?\s+except\s+for\s+/i, "")
    .replace(/^it\s+helps\s+if\s+(the\s+)?applicant\s+(has|is)\s+/i, "")
    .replace(/^if\s+joining\s+the\s+lab[^:]*:\s*/i, "")
    .replace(/^applicants?\s+(must|should|are\s+expected\s+to)\s+/i, "")
    .replace(/^requirements?\s*:\s*/i, "")
    .replace(/^minimum\s+requirements?\s*:\s*/i, "")
    .replace(/,\s*which\s+may\s+include\b.*$/i, "")
    .replace(/,\s*including\b.*$/i, "")
    .replace(/^[,;:.\-\s]+|[,;:.\-\s]+$/g, "")
    .trim();
}

function isNumericArtifact(text: string): boolean {
  const numericCharacters = text.replace(/\D+/g, "").length;
  const hasLetters = /[a-z]/i.test(text);
  return !hasLetters && numericCharacters >= 8;
}

function hasRequirementSignal(text: string): boolean {
  const normalized = ` ${text.toLowerCase()} `;
  return REQUIREMENT_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isPlaceholderArtifact(text: string): boolean {
  const normalized = text.toLowerCase().trim();

  if (INVALID_VALUES.has(normalized)) {
    return true;
  }

  if (/^(error|err)\b[:\s-]*/i.test(normalized) && normalized.length <= 40) {
    return true;
  }

  if (/^\(?not\s+specified\)?$/i.test(normalized)) {
    return true;
  }

  return false;
}

interface CandidateLine {
  text: string;
  explicitBullet: boolean;
}

function parseCandidateLines(value: string): CandidateLine[] {
  return value
    .replace(/\r\n/g, "\n")
    .replace(/[•●▪]/g, "\n- ")
    .split(/\n|;/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line) => {
      const explicitBullet = /^[-*]\s+/.test(line) || /^\d+[.)]\s+/.test(line);
      const cleaned = line.replace(/^[-*]\s+/, "").replace(/^\d+[.)]\s+/, "").trim();
      return cleaned ? [{ text: cleaned, explicitBullet }] : [];
    });
}

export function extractRequirementBullets(
  value?: string | null,
  options?: RequirementExtractionOptions,
): string[] {
  if (!value?.trim()) {
    return [];
  }

  const maxItems = options?.maxItems ?? DEFAULT_MAX_ITEMS;
  const maxWordsPerItem = options?.maxWordsPerItem ?? DEFAULT_MAX_WORDS;

  const parsedLines = parseCandidateLines(value);
  if (parsedLines.length === 0) {
    return [];
  }

  const hasExplicitBullets = parsedLines.some((line) => line.explicitBullet);
  const baseCandidates = hasExplicitBullets
    ? parsedLines.filter((line) => line.explicitBullet).map((line) => line.text)
    : parsedLines.flatMap((line) => splitIntoSentences(line.text));

  const cleaned = baseCandidates
    .map(cleanCandidate)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .filter((line) => !isPlaceholderArtifact(line))
    .filter((line) => !isNumericArtifact(line));

  const filtered =
    hasExplicitBullets || cleaned.length <= maxItems
      ? cleaned
      : (() => {
          const signaled = cleaned.filter(hasRequirementSignal);
          return signaled.length > 0 ? signaled : cleaned;
        })();

  const unique = new Set<string>();
  const results: string[] = [];

  for (const line of filtered) {
    const compact = trimToWords(line, maxWordsPerItem);
    const key = compact.toLowerCase();

    if (!compact || unique.has(key)) {
      continue;
    }

    unique.add(key);
    results.push(compact);

    if (results.length >= maxItems) {
      break;
    }
  }

  return results;
}

export function formatRequirementBullets(
  value?: string | null,
  options?: RequirementExtractionOptions,
): string | null {
  const bullets = extractRequirementBullets(value, options);
  if (bullets.length === 0) {
    return null;
  }

  return bullets.map((line) => `- ${line}`).join("\n");
}
