import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeTitle, TrackerType } from "@/lib/recommendations";

const TRACKER_TYPES: TrackerType[] = ["BOOK", "MOVIE", "MUSIC"];

// Flexible column name mapping
const TITLE_ALIASES = new Set(["title", "name"]);
const CREATOR_ALIASES = new Set([
  "creator",
  "author",
  "director",
  "artist",
  "by",
  "writer",
]);
const RATING_ALIASES = new Set(["rating", "score", "stars"]);
const NOTES_ALIASES = new Set(["notes", "note", "comments", "comment", "description"]);

function mapColumns(headers: string[]) {
  let titleCol = -1;
  let creatorCol = -1;
  let ratingCol = -1;
  let notesCol = -1;

  headers.forEach((h, i) => {
    const key = h.toLowerCase().trim();
    if (TITLE_ALIASES.has(key)) titleCol = i;
    else if (CREATOR_ALIASES.has(key)) creatorCol = i;
    else if (RATING_ALIASES.has(key)) ratingCol = i;
    else if (NOTES_ALIASES.has(key)) notesCol = i;
  });

  return { titleCol, creatorCol, ratingCol, notesCol };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const type = (formData.get("type") as string)?.toUpperCase() as TrackerType;
    const mode = formData.get("mode") as string; // "completed" or "recommended"

    if (!file) {
      return NextResponse.json({ error: "CSV file is required" }, { status: 400 });
    }
    if (!TRACKER_TYPES.includes(type)) {
      return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
    if (mode !== "completed" && mode !== "recommended") {
      return NextResponse.json({ error: "Mode must be 'completed' or 'recommended'" }, { status: 400 });
    }

    const csvText = await file.text();
    const parsed = Papa.parse<string[]>(csvText, {
      skipEmptyLines: true,
    });

    if (parsed.errors.length > 0 && parsed.data.length === 0) {
      return NextResponse.json(
        { error: "Failed to parse CSV file" },
        { status: 400 }
      );
    }

    const rows = parsed.data;
    if (rows.length === 0) {
      return NextResponse.json(
        { error: "CSV file is empty" },
        { status: 400 }
      );
    }

    // Detect if first row is a header
    const firstRow = rows[0];
    const { titleCol, creatorCol, ratingCol, notesCol } = mapColumns(firstRow);
    const hasHeader = titleCol !== -1;

    // If no header detected, assume columns: Title, Creator, Rating, Notes
    const cols = hasHeader
      ? { titleCol, creatorCol, ratingCol, notesCol }
      : { titleCol: 0, creatorCol: 1, ratingCol: 2, notesCol: 3 };

    const dataRows = hasHeader ? rows.slice(1) : rows;

    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    const isRecommendation = mode === "recommended";
    const status = isRecommendation ? "PLANNED" : "COMPLETED";
    const finishedAt = isRecommendation ? null : new Date();

    for (let i = 0; i < dataRows.length; i++) {
      const row = dataRows[i];
      const rowNum = hasHeader ? i + 2 : i + 1; // 1-indexed, accounting for header

      const rawTitle = cols.titleCol < row.length ? row[cols.titleCol]?.trim() : "";
      if (!rawTitle) {
        errors.push(`Row ${rowNum}: missing title, skipped`);
        continue;
      }

      if (rawTitle.length > 500) {
        errors.push(`Row ${rowNum}: title too long (max 500), skipped`);
        continue;
      }

      const titleNormalized = normalizeTitle(rawTitle);
      if (!titleNormalized) {
        errors.push(`Row ${rowNum}: invalid title, skipped`);
        continue;
      }

      // Check for duplicate
      const existing = await db.trackerItem.findUnique({
        where: {
          userId_type_titleNormalized: {
            userId: user.id,
            type,
            titleNormalized,
          },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const rawCreator =
        cols.creatorCol >= 0 && cols.creatorCol < row.length
          ? row[cols.creatorCol]?.trim()
          : "";
      const rawRating =
        cols.ratingCol >= 0 && cols.ratingCol < row.length
          ? row[cols.ratingCol]?.trim()
          : "";
      const rawNotes =
        cols.notesCol >= 0 && cols.notesCol < row.length
          ? row[cols.notesCol]?.trim()
          : "";

      let rating: number | undefined;
      if (rawRating) {
        const parsed = Number.parseFloat(rawRating);
        if (Number.isFinite(parsed)) {
          rating = parsed;
        }
      }

      await db.trackerItem.create({
        data: {
          userId: user.id,
          type,
          status,
          title: rawTitle,
          titleNormalized,
          creator: rawCreator || undefined,
          rating,
          notes: rawNotes || undefined,
          tags: [],
          source: "IMPORT",
          isRecommendation,
          finishedAt,
        },
      });

      added++;
    }

    return NextResponse.json({ added, skipped, errors });
  } catch (error) {
    console.error("Error importing library items:", error);
    return NextResponse.json(
      { error: "Failed to import library items" },
      { status: 500 }
    );
  }
}
