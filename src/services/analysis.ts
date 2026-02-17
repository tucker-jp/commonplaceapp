import { openai, MODELS, TEMPERATURES } from "@/lib/openai";
import { PRESET_TAGS } from "@/lib/tags";
import type { Analysis } from "@/types";

const MERGED_PROMPT = `You analyze notes and determine which folder they belong to.

Available folders: {FOLDERS}

Return JSON with:
- "folder": Exact folder name from the list that best fits (if none fit well, use the first one)
- "title": Concise title (2-5 words)
- "summary": 2-4 sentence summary
- "cleanedMemo": Remove filler words, fix grammar, preserve all meaning
- "tags": Array of 2-4 tags chosen ONLY from this exact list: {PRESET_TAGS}. Pick whichever fit best.
- "action_required": Boolean for time-sensitive actions
- "location_relevant": Boolean for place-specific content
- "calendar_event": Event object if date/time mentioned, else null

CALENDAR EVENT RULES:
- Only create if text mentions BOTH date AND/OR time
- dateText: Extract the EXACT date phrase from text (e.g., "next Friday", "Monday", "January 15th")
- timeText: Extract the EXACT time phrase from text (e.g., "at noon", "4pm", "8:30am") or null if no time
- duration: Minutes estimate (60 for appointments, 120 for longer events, null for all-day)
- isAllDay: true only for explicit all-day events
- location: Optional venue
- notes: Optional additional event notes

CALENDAR EVENT FORMAT:
{"title": "Event Name", "dateText": "next Friday", "timeText": "at noon", "duration": 60, "location": null, "notes": null, "isAllDay": false}

IMPORTANT RULES:
- Tags must be chosen ONLY from the preset list provided — do not invent new tags
- The cleanedMemo should preserve ALL content but be more readable
- Summary should preserve the original meaning and key details

{CUSTOM_INSTRUCTIONS}`;

export async function analyzeAndCategorize(
  text: string,
  folders: { id: string; name: string }[],
  customInstructions?: string
): Promise<Analysis & { folder: string }> {
  const folderNames = folders.map((f) => f.name);
  const firstFolder = folderNames[0] || "other";

  const prompt = MERGED_PROMPT
    .replace("{FOLDERS}", folderNames.join(", "))
    .replace("{PRESET_TAGS}", PRESET_TAGS.join(", "))
    .replace(
      "{CUSTOM_INSTRUCTIONS}",
      customInstructions
        ? `\nADDITIONAL INSTRUCTIONS:\n${customInstructions}`
        : ""
    );

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.ANALYSIS,
      messages: [
        { role: "system", content: prompt },
        { role: "user", content: `Analyze this note: ${text}` },
      ],
      temperature: TEMPERATURES.ANALYSIS,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from analysis");
    }

    const parsed = JSON.parse(content) as Analysis & { folder: string };

    // Validate folder name matches one of the available folders
    const matchedFolder = folderNames.find(
      (f) => f.toLowerCase() === (parsed.folder || "").toLowerCase()
    );

    // Filter tags to only preset values
    const validTags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => PRESET_TAGS.includes(t as typeof PRESET_TAGS[number]))
      : [];

    return {
      folder: matchedFolder || firstFolder,
      title: parsed.title || "Untitled Note",
      summary: parsed.summary || text.slice(0, 200),
      cleanedMemo: parsed.cleanedMemo || text,
      tags: validTags,
      action_required: Boolean(parsed.action_required),
      location_relevant: Boolean(parsed.location_relevant),
      calendar_event: parsed.calendar_event || null,
    };
  } catch (error) {
    console.error("Analysis error:", error);
    return {
      folder: firstFolder,
      title: "Untitled Note",
      summary: text.slice(0, 200),
      cleanedMemo: text,
      tags: [],
      action_required: false,
      location_relevant: false,
      calendar_event: null,
    };
  }
}

const ANALYSIS_PROMPT = `Analyze this note for the "{CATEGORY}" folder. Return JSON with:
- "title": Concise title (2-5 words)
- "summary": 2-4 sentences optimized for "{CATEGORY}" folder
- "cleanedMemo": Remove filler words, fix grammar, preserve all meaning
- "tags": Array of 2-4 tags chosen ONLY from this exact list: {PRESET_TAGS}. Pick whichever fit best.
- "action_required": Boolean for time-sensitive actions
- "location_relevant": Boolean for place-specific content
- "calendar_event": Event object if date/time mentioned, else null

CALENDAR EVENT RULES:
- Only create if text mentions BOTH date AND/OR time
- dateText: Extract the EXACT date phrase from text (e.g., "next Friday", "Monday", "January 15th")
- timeText: Extract the EXACT time phrase from text (e.g., "at noon", "4pm", "8:30am") or null if no time
- duration: Minutes estimate (60 for appointments, 120 for longer events, null for all-day)
- isAllDay: true only for explicit all-day events
- location: Optional venue
- notes: Optional additional event notes

CALENDAR EVENT FORMAT:
{"title": "Event Name", "dateText": "next Friday", "timeText": "at noon", "duration": 60, "location": null, "notes": null, "isAllDay": false}

IMPORTANT RULES:
- Tags must be chosen ONLY from the preset list provided — do not invent new tags
- The cleanedMemo should preserve ALL content but be more readable
- Summary should preserve the original meaning and key details

{CUSTOM_INSTRUCTIONS}`;

export async function analyzeNote(
  text: string,
  category: string,
  customInstructions?: string
): Promise<Analysis> {
  const prompt = ANALYSIS_PROMPT
    .replace(/{CATEGORY}/g, category)
    .replace("{PRESET_TAGS}", PRESET_TAGS.join(", "))
    .replace(
      "{CUSTOM_INSTRUCTIONS}",
      customInstructions
        ? `\nADDITIONAL INSTRUCTIONS:\n${customInstructions}`
        : ""
    );

  try {
    const response = await openai.chat.completions.create({
      model: MODELS.ANALYSIS,
      messages: [
        {
          role: "system",
          content: prompt,
        },
        {
          role: "user",
          content: `Analyze this note: ${text}`,
        },
      ],
      temperature: TEMPERATURES.ANALYSIS,
      response_format: { type: "json_object" },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response content from analysis");
    }

    const parsed = JSON.parse(content) as Analysis;

    // Filter tags to only preset values
    const validTags = Array.isArray(parsed.tags)
      ? parsed.tags.filter((t): t is string => PRESET_TAGS.includes(t as typeof PRESET_TAGS[number]))
      : [];

    return {
      title: parsed.title || "Untitled Note",
      summary: parsed.summary || text.slice(0, 200),
      cleanedMemo: parsed.cleanedMemo || text,
      tags: validTags,
      action_required: Boolean(parsed.action_required),
      location_relevant: Boolean(parsed.location_relevant),
      calendar_event: parsed.calendar_event || null,
    };
  } catch (error) {
    console.error("Analysis error:", error);

    // Return basic analysis on error
    return {
      title: "Untitled Note",
      summary: text.slice(0, 200),
      cleanedMemo: text,
      tags: [],
      action_required: false,
      location_relevant: false,
      calendar_event: null,
    };
  }
}
