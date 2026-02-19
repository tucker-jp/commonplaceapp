import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { openai, MODELS, TEMPERATURES } from "@/lib/openai";
import { PRESET_TAGS } from "@/lib/tags";

type KeywordPayload = {
  keywords: string[];
  tags?: string[];
};

type AnswerPayload = {
  answer: string;
};

function normalizeList(items: unknown): string[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildSnippet(text: string | null | undefined, max = 280): string {
  if (!text) return "";
  return text.length > max ? `${text.slice(0, max)}...` : text;
}

async function extractKeywords(query: string): Promise<KeywordPayload | null> {
  const prompt = `Return JSON with:
- "keywords": 3-6 short keywords or short phrases
- "tags": 0-3 tags from this list if relevant: ${PRESET_TAGS.join(", ")}

Keep keywords concise and literal.`;

  const response = await openai.chat.completions.create({
    model: MODELS.ANALYSIS,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: query },
    ],
    temperature: TEMPERATURES.ANALYSIS,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;
  return JSON.parse(content) as KeywordPayload;
}

async function summarizeAnswer(query: string, notes: Array<{
  title: string | null;
  summary: string | null;
  cleanedMemo: string | null;
  originalText: string;
}>): Promise<string> {
  const context = notes
    .slice(0, 8)
    .map((note, idx) => {
      const title = note.title ? `Title: ${note.title}` : "Title: Untitled";
      const summary = buildSnippet(note.summary || note.cleanedMemo || note.originalText);
      return `Note ${idx + 1}\n${title}\nSummary: ${summary}`;
    })
    .join("\n\n");

  const prompt = `You answer questions using the provided notes.
If the notes do not contain enough information, say so briefly.
Return JSON with:
- "answer": 2-4 sentences, clear and direct.`;

  const response = await openai.chat.completions.create({
    model: MODELS.ANALYSIS,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `Question: ${query}\n\nNotes:\n${context}` },
    ],
    temperature: TEMPERATURES.ANALYSIS,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return "";
  const parsed = JSON.parse(content) as AnswerPayload;
  return parsed.answer || "";
}

// POST /api/ask - AI-assisted search and answer
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const query =
      typeof body?.query === "string" ? body.query.trim() : "";
    const folderId =
      typeof body?.folderId === "string" && body.folderId.trim()
        ? body.folderId.trim()
        : undefined;

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    let keywords = [query];
    let tags: string[] = [];

    try {
      const extracted = await extractKeywords(query);
      if (extracted) {
        const normalizedKeywords = normalizeList(extracted.keywords);
        if (normalizedKeywords.length > 0) {
          keywords = normalizedKeywords;
        }
        tags = normalizeList(extracted.tags).filter((tag) =>
          PRESET_TAGS.includes(tag as (typeof PRESET_TAGS)[number])
        );
      }
    } catch (error) {
      console.error("ask keyword extraction failed:", error);
    }

    const orFilters: Record<string, unknown>[] = keywords.flatMap((keyword) => [
      { title: { contains: keyword, mode: "insensitive" } },
      { summary: { contains: keyword, mode: "insensitive" } },
      { cleanedMemo: { contains: keyword, mode: "insensitive" } },
      { originalText: { contains: keyword, mode: "insensitive" } },
    ]);

    tags.forEach((tag) => {
      orFilters.push({ tags: { has: tag } });
    });

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        ...(folderId ? { folderId } : {}),
        OR: orFilters.length > 0 ? orFilters : undefined,
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    let answer = "";
    if (notes.length > 0) {
      try {
        answer = await summarizeAnswer(query, notes);
      } catch (error) {
        console.error("ask answer summarize failed:", error);
      }
    }

    if (!answer) {
      answer = notes.length
        ? "Here are the most relevant notes I found."
        : "No matching notes found for that question.";
    }

    return NextResponse.json({
      answer,
      notes,
      keywords,
      tags,
    });
  } catch (error) {
    console.error("Error in /api/ask:", error);
    return NextResponse.json(
      { error: "Failed to answer question" },
      { status: 500 }
    );
  }
}
