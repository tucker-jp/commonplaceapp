export type TrackerType = "BOOK" | "MOVIE" | "MUSIC";

export type RecommendationCandidate = {
  type: TrackerType;
  title: string;
  reason: string;
};

const intentPatterns: Array<{ type: TrackerType; regex: RegExp }> = [
  {
    type: "MOVIE",
    regex: /\b(?:need|should|want|plan|remember|gotta|have to|must)\s+to\s+(?:watch|see)\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "BOOK",
    regex: /\b(?:need|should|want|plan|remember|gotta|have to|must)\s+to\s+read\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "MUSIC",
    regex: /\b(?:need|should|want|plan|remember|gotta|have to|must)\s+to\s+listen(?:\s+to)?\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "MOVIE",
    regex: /\b(?:watch|see)\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "BOOK",
    regex: /\bread\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "MUSIC",
    regex: /\blisten(?:\s+to)?\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "MOVIE",
    regex: /\b(?:recommend|recommended)\s+(?:watch|see)\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "BOOK",
    regex: /\b(?:recommend|recommended)\s+read\s+([^.\n!?;,]+)/gi,
  },
  {
    type: "MUSIC",
    regex: /\b(?:recommend|recommended)\s+listen(?:\s+to)?\s+([^.\n!?;,]+)/gi,
  },
];

const quotedPattern = /\b(watch|see|read|listen)(?:\s+to)?\s+["']([^"']+)["']/gi;

const ignoredTitles = new Set([
  "it",
  "this",
  "that",
  "something",
  "a movie",
  "a book",
  "a song",
  "a podcast",
  "a show",
]);

const trailingStopwords = [
  "with",
  "for",
  "because",
  "so",
  "after",
  "before",
  "when",
  "while",
  "tonight",
  "today",
  "tomorrow",
  "later",
  "again",
];

function cleanTitle(raw: string) {
  let title = raw.replace(/\s+/g, " ").trim();
  title = title.replace(/^[\s"']+|[\s"']+$/g, "");
  title = title.replace(/\(([^)]+)\)$/g, "").trim();

  for (const word of trailingStopwords) {
    const pattern = new RegExp(`\\s+${word}\\b.*$`, "i");
    if (pattern.test(title)) {
      title = title.replace(pattern, "").trim();
    }
  }

  return title;
}

export function normalizeTitle(title: string) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function mapVerbToType(verb: string): TrackerType {
  if (verb === "read") return "BOOK";
  if (verb === "listen") return "MUSIC";
  return "MOVIE";
}

export function extractRecommendationCandidates(text: string): RecommendationCandidate[] {
  const candidates: RecommendationCandidate[] = [];
  const seen = new Set<string>();
  const normalizedText = text.replace(/\s+/g, " ");

  for (const match of normalizedText.matchAll(quotedPattern)) {
    const verb = match[1]?.toLowerCase();
    const rawTitle = match[2] ?? "";
    const title = cleanTitle(rawTitle);
    if (!title) continue;
    if (title.toLowerCase().startsWith("out ")) continue;
    if (ignoredTitles.has(title.toLowerCase())) continue;
    const type = mapVerbToType(verb);
    const key = `${type}:${normalizeTitle(title)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    candidates.push({ type, title, reason: "quoted-intent" });
  }

  for (const pattern of intentPatterns) {
    for (const match of normalizedText.matchAll(pattern.regex)) {
      const rawTitle = match[1] ?? "";
      const title = cleanTitle(rawTitle);
      if (!title) continue;
      if (title.toLowerCase().startsWith("out ")) continue;
      if (ignoredTitles.has(title.toLowerCase())) continue;
      const key = `${pattern.type}:${normalizeTitle(title)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      candidates.push({ type: pattern.type, title, reason: "intent" });
    }
  }

  return candidates;
}
