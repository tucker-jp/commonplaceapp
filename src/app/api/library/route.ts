import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeTitle, TrackerType } from "@/lib/recommendations";
import { openai, MODELS, TEMPERATURES } from "@/lib/openai";

const trackerTypes: TrackerType[] = ["BOOK", "MOVIE", "MUSIC"];
const trackerStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED"] as const;

type CreatorGuessPayload = {
  creator?: string | null;
};

async function guessCreator(type: TrackerType, title: string) {
  const prompt = `Return JSON with a single field "creator".
If the creator is unknown, return null.
Use author for books, director for movies, and artist for music.`;

  const response = await openai.chat.completions.create({
    model: MODELS.ANALYSIS,
    messages: [
      { role: "system", content: prompt },
      { role: "user", content: `Type: ${type}\nTitle: ${title}` },
    ],
    temperature: TEMPERATURES.ANALYSIS,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (!content) return null;
  const parsed = JSON.parse(content) as CreatorGuessPayload;
  const creator = typeof parsed.creator === "string" ? parsed.creator.trim() : "";
  return creator || null;
}

// GET /api/library?type=&status=&year=&recommendations=
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type")?.toUpperCase() as TrackerType | null;
    const status = searchParams.get("status")?.toUpperCase();
    const year = searchParams.get("year");
    const recommendationsParam = searchParams.get("recommendations");
    const recommendations =
      recommendationsParam === "1" || recommendationsParam === "true";
    const excludeRecommendations =
      recommendationsParam === "0" || recommendationsParam === "false";

    const where: Record<string, unknown> = {
      userId: user.id,
    };

    if (type && trackerTypes.includes(type)) {
      where.type = type;
    }

    if (status && trackerStatuses.includes(status as (typeof trackerStatuses)[number])) {
      where.status = status;
    }

    if (recommendations) {
      where.isRecommendation = true;
    } else if (excludeRecommendations) {
      where.isRecommendation = false;
    }

    if (year && /^\d{4}$/.test(year)) {
      const start = new Date(Number(year), 0, 1);
      const end = new Date(Number(year) + 1, 0, 1);
      where.OR = [
        { finishedAt: { gte: start, lt: end } },
        { finishedAt: null, createdAt: { gte: start, lt: end } },
      ];
    }

    const items = await db.trackerItem.findMany({
      where,
      orderBy: [{ finishedAt: "desc" }, { createdAt: "desc" }],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching library items:", error);
    return NextResponse.json(
      { error: "Failed to fetch library items" },
      { status: 500 }
    );
  }
}

// POST /api/library - create a tracker item
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    const type = typeof body?.type === "string" ? body.type.toUpperCase() : "";
    const creatorInput =
      typeof body?.creator === "string" ? body.creator.trim() : "";

    let rating: number | undefined;
    if (typeof body?.rating === "number" && Number.isFinite(body.rating)) {
      rating = body.rating;
    } else if (typeof body?.rating === "string" && body.rating.trim()) {
      const parsed = Number.parseFloat(body.rating);
      if (Number.isFinite(parsed)) {
        rating = parsed;
      }
    }

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }
    if (title.length > 500) {
      return NextResponse.json(
        { error: "Title exceeds maximum length (500 characters)" },
        { status: 400 }
      );
    }
    if (!trackerTypes.includes(type as TrackerType)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }

    const titleNormalized = normalizeTitle(title);
    if (!titleNormalized) {
      return NextResponse.json({ error: "Invalid title" }, { status: 400 });
    }

    const existing = await db.trackerItem.findUnique({
      where: {
        userId_type_titleNormalized: {
          userId: user.id,
          type: type as TrackerType,
          titleNormalized,
        },
      },
    });

    if (existing) {
      return NextResponse.json({ item: existing, existing: true });
    }

    let status =
      typeof body?.status === "string" &&
      trackerStatuses.includes(body.status.toUpperCase())
        ? body.status.toUpperCase()
        : "PLANNED";

    const isRecommendation = Boolean(body?.isRecommendation);
    if (isRecommendation) {
      status = "PLANNED";
    } else if (status !== "COMPLETED") {
      status = "COMPLETED";
    }

    const item = await db.trackerItem.create({
      data: {
        userId: user.id,
        type: type as TrackerType,
        status,
        title,
        titleNormalized,
        creator: creatorInput || undefined,
        rating,
        notes: typeof body?.notes === "string" ? body.notes.trim() : undefined,
        tags: Array.isArray(body?.tags) ? body.tags : [],
        isRecommendation,
        startedAt: body?.startedAt ? new Date(body.startedAt) : undefined,
        finishedAt: !isRecommendation && body?.finishedAt ? new Date(body.finishedAt) : undefined,
      },
    });

    let finalItem = item;
    if (!creatorInput) {
      try {
        const creator = await guessCreator(type as TrackerType, title);
        if (creator) {
          finalItem = await db.trackerItem.update({
            where: { id: item.id },
            data: { creator },
          });
        }
      } catch (error) {
        console.error("Creator auto-fill failed:", error);
      }
    }

    return NextResponse.json({ item: finalItem });
  } catch (error) {
    console.error("Error creating library item:", error);
    return NextResponse.json(
      { error: "Failed to create library item" },
      { status: 500 }
    );
  }
}
