import { openai, MODELS, TEMPERATURES } from "@/lib/openai";
import { PRESET_TAGS } from "@/lib/tags";
import type { Analysis } from "@/types";

// ─── Shared prompt building blocks ─────────────────────────────────────────
// Edit these sections independently to tune AI behavior.

/** What each output field should look like. */
const OUTPUT_FIELDS = `Return JSON with:
- "folder": Exact folder name from the list that best fits (if none fit, use the first one)
- "title": 3-6 word factual title — no fluff, no "Note about…"
- "summary": ONE sentence. What is this note about and why does it matter? Be direct.
- "cleanedMemo": The note rewritten — fix grammar, cut filler words and repetition, keep every fact. Do NOT add context or pad length.
- "tags": Array of 1-3 tags chosen ONLY from: {PRESET_TAGS}
- "action_required": true if the note implies something needs to be done
- "location_relevant": true if the note is tied to a specific place
- "calendar_event": event object if a date/time is mentioned, else null`;

/** Rules for calendar event extraction. */
const CALENDAR_RULES = `CALENDAR EVENT RULES:
- Only create if text mentions a date AND/OR time
- dateText: exact date phrase from the text (e.g. "next Friday", "January 15th")
- timeText: exact time phrase (e.g. "at noon", "4pm") or null if none
- duration: estimate in minutes (60 for appointments, 120 for longer events, null for all-day)
- isAllDay: true only for explicit all-day events
- location: venue if mentioned, else null
- notes: anything else relevant to the event, else null
Format: {"title":"…","dateText":"…","timeText":"…","duration":60,"location":null,"notes":null,"isAllDay":false}`;

/** Tag constraint reminder. */
const TAG_RULES = `RULES:
- Tags must come ONLY from the preset list — never invent tags
- summary must be a single sentence — not a paragraph
- cleanedMemo should be shorter than or equal to the original, never longer`;

// ─── Prompts ────────────────────────────────────────────────────────────────

const MERGED_PROMPT = `You analyze a note, pick the best folder for it, and extract structured data.

Available folders: {FOLDERS}

${OUTPUT_FIELDS}

${CALENDAR_RULES}

${TAG_RULES}

{CUSTOM_INSTRUCTIONS}`;

const ANALYSIS_PROMPT = `You analyze a note that belongs to the "{CATEGORY}" folder and extract structured data.

${OUTPUT_FIELDS}

${CALENDAR_RULES}

${TAG_RULES}

{CUSTOM_INSTRUCTIONS}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPrompt(template: string, vars: Record<string, string>): string {
  return Object.entries(vars).reduce(
    (acc, [key, val]) => acc.replaceAll(`{${key}}`, val),
    template
  );
}

function customBlock(customInstructions?: string): string {
  return customInstructions?.trim()
    ? `ADDITIONAL INSTRUCTIONS:\n${customInstructions.trim()}`
    : "";
}

function safeTagFilter(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string =>
    PRESET_TAGS.includes(t as (typeof PRESET_TAGS)[number])
  );
}

// ─── Exports ────────────────────────────────────────────────────────────────

export async function analyzeAndCategorize(
  text: string,
  folders: { id: string; name: string }[],
  customInstructions?: string
): Promise<Analysis & { folder: string }> {
  const folderNames = folders.map((f) => f.name);
  const firstFolder = folderNames[0] || "other";

  const prompt = buildPrompt(MERGED_PROMPT, {
    FOLDERS: folderNames.join(", "),
    PRESET_TAGS: PRESET_TAGS.join(", "),
    CUSTOM_INSTRUCTIONS: customBlock(customInstructions),
  });

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.ANALYSIS,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      temperature: TEMPERATURES.ANALYSIS,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from model");

    const parsed = JSON.parse(content) as Analysis & { folder: string };
    const matchedFolder =
      folderNames.find(
        (f) => f.toLowerCase() === (parsed.folder || "").toLowerCase()
      ) || firstFolder;

    return {
      folder: matchedFolder,
      title: parsed.title || "Untitled Note",
      summary: parsed.summary || text.slice(0, 120),
      cleanedMemo: parsed.cleanedMemo || text,
      tags: safeTagFilter(parsed.tags),
      action_required: Boolean(parsed.action_required),
      location_relevant: Boolean(parsed.location_relevant),
      calendar_event: parsed.calendar_event || null,
    };
  } catch (error) {
    console.error("analyzeAndCategorize error:", error);
    return {
      folder: firstFolder,
      title: "Untitled Note",
      summary: text.slice(0, 120),
      cleanedMemo: text,
      tags: [],
      action_required: false,
      location_relevant: false,
      calendar_event: null,
    };
  }
}

export async function analyzeNote(
  text: string,
  category: string,
  customInstructions?: string
): Promise<Analysis> {
  const prompt = buildPrompt(ANALYSIS_PROMPT, {
    CATEGORY: category,
    PRESET_TAGS: PRESET_TAGS.join(", "),
    CUSTOM_INSTRUCTIONS: customBlock(customInstructions),
  });

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.ANALYSIS,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: text },
      ],
      temperature: TEMPERATURES.ANALYSIS,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response from model");

    const parsed = JSON.parse(content) as Analysis;

    return {
      title: parsed.title || "Untitled Note",
      summary: parsed.summary || text.slice(0, 120),
      cleanedMemo: parsed.cleanedMemo || text,
      tags: safeTagFilter(parsed.tags),
      action_required: Boolean(parsed.action_required),
      location_relevant: Boolean(parsed.location_relevant),
      calendar_event: parsed.calendar_event || null,
    };
  } catch (error) {
    console.error("analyzeNote error:", error);
    return {
      title: "Untitled Note",
      summary: text.slice(0, 120),
      cleanedMemo: text,
      tags: [],
      action_required: false,
      location_relevant: false,
      calendar_event: null,
    };
  }
}
