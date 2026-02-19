import { NextRequest, NextResponse } from "next/server";
import { analyzeAndCategorize } from "@/services/analysis";
import { getCurrentUser } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  extractRecommendationCandidates,
  normalizeTitle,
  TrackerType,
} from "@/lib/recommendations";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { text } = body;

    if (!text) {
      return NextResponse.json(
        { error: "No text provided" },
        { status: 400 }
      );
    }

    // Fetch folders and settings from DB (never trust client data for instructions)
    const [folders, settings] = await Promise.all([
      db.folder.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
      }),
      db.settings.findUnique({ where: { userId: user.id } }),
    ]);

    if (folders.length === 0) {
      return NextResponse.json(
        { error: "No folders available. Please create a folder first." },
        { status: 400 }
      );
    }

    // Build combined instructions: global + per-folder
    const globalInstructions = settings?.customLLMInstructions ?? "";
    const foldersWithInstructions = folders.filter((f) => f.instructions);
    const folderInstructionBlock =
      foldersWithInstructions.length > 0
        ? "FOLDER-SPECIFIC INSTRUCTIONS:\n" +
          foldersWithInstructions
            .map((f) => `- ${f.name}: ${f.instructions}`)
            .join("\n")
        : "";

    const combinedInstructions = [globalInstructions, folderInstructionBlock]
      .filter(Boolean)
      .join("\n\n");

    // Single LLM call: categorize + analyze
    const { folder: folderName, ...analysis } = await analyzeAndCategorize(
      text,
      folders.map((f) => ({ id: f.id, name: f.name })),
      combinedInstructions || undefined
    );

    // Look up folder by name from the DB-fetched list
    const folder = folders.find((f) => f.name === folderName);
    if (!folder) {
      return NextResponse.json(
        { error: `Folder "${folderName}" not found` },
        { status: 400 }
      );
    }

    // Save note to DB
    const calendarEvent = analysis.calendar_event as Record<string, unknown> | null;
    const note = await db.note.create({
      data: {
        originalText: text,
        cleanedMemo: analysis.cleanedMemo,
        title: analysis.title,
        summary: analysis.summary,
        tags: analysis.tags,
        actionRequired: analysis.action_required,
        locationRelevant: analysis.location_relevant,
        folderId: folder.id,
        userId: user.id,
        calendarEvent: calendarEvent
          ? {
              create: {
                title: calendarEvent.title as string,
                date: new Date(calendarEvent.date as string),
                duration: calendarEvent.duration as number | null,
                location: calendarEvent.location as string | null,
                notes: calendarEvent.notes as string | null,
                isAllDay: Boolean(calendarEvent.isAllDay),
              },
            }
          : undefined,
      },
      include: {
        folder: { select: { name: true } },
        calendarEvent: true,
      },
    });

    let recommendations = {
      created: 0,
      skipped: 0,
      error: null as string | null,
    };

    try {
      const trackerItem = (db as { trackerItem?: typeof db.note }).trackerItem;
      if (!trackerItem) {
        recommendations.error = "Recommendations not available until migrations run.";
      } else {
        const candidates = extractRecommendationCandidates(text);

        if (candidates.length > 0) {
          for (const candidate of candidates) {
            const titleNormalized = normalizeTitle(candidate.title);
            if (!titleNormalized) {
              recommendations.skipped += 1;
              continue;
            }

            const existing = await trackerItem.findUnique({
              where: {
                userId_type_titleNormalized: {
                  userId: user.id,
                  type: candidate.type as TrackerType,
                  titleNormalized,
                },
              },
            });

            if (existing) {
              recommendations.skipped += 1;
              continue;
            }

            await trackerItem.create({
              data: {
                userId: user.id,
                type: candidate.type as TrackerType,
                status: "PLANNED",
                title: candidate.title,
                titleNormalized,
                tags: [],
                source: "NOTE_AUTO",
                isRecommendation: true,
                sourceNoteId: note.id,
              },
            });

            recommendations.created += 1;
          }
        }
      }
    } catch (error) {
      console.error("Recommendation extraction failed:", error);
      recommendations.error = "Recommendations could not be saved.";
    }

    return NextResponse.json({ note, folderName, recommendations });
  } catch (error) {
    console.error("Analysis API error:", error);
    return NextResponse.json(
      { error: "Failed to analyze note" },
      { status: 500 }
    );
  }
}
