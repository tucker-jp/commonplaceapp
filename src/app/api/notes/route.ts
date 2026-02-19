import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/notes - List all notes (with optional folderId filter)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId");

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        ...(folderId ? { folderId } : {}),
      },
      include: {
        folder: {
          select: { name: true },
        },
        calendarEvent: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

// POST /api/notes - Create a new note
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      originalText,
      cleanedMemo,
      title,
      summary,
      tags = [],
      actionRequired = false,
      locationRelevant = false,
      latitude,
      longitude,
      placeName,
      audioUrl,
      imageUrls = [],
      folderId,
      calendarEvent,
    } = body;

    if (!originalText) {
      return NextResponse.json(
        { error: "Original text is required" },
        { status: 400 }
      );
    }

    if (typeof originalText === "string" && originalText.length > 50_000) {
      return NextResponse.json(
        { error: "Text exceeds maximum length (50,000 characters)" },
        { status: 400 }
      );
    }

    if (typeof title === "string" && title.length > 500) {
      return NextResponse.json(
        { error: "Title exceeds maximum length (500 characters)" },
        { status: 400 }
      );
    }

    if (!folderId) {
      return NextResponse.json(
        { error: "Folder ID is required" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const note = await db.note.create({
      data: {
        originalText,
        cleanedMemo,
        title,
        summary,
        tags,
        actionRequired,
        locationRelevant,
        latitude,
        longitude,
        placeName,
        audioUrl,
        imageUrls,
        folderId,
        userId,
        calendarEvent: calendarEvent
          ? {
              create: {
                title: calendarEvent.title,
                date: new Date(calendarEvent.date),
                duration: calendarEvent.duration,
                location: calendarEvent.location,
                notes: calendarEvent.notes,
                isAllDay: calendarEvent.isAllDay,
              },
            }
          : undefined,
      },
      include: {
        folder: {
          select: { name: true },
        },
        calendarEvent: true,
      },
    });

    return NextResponse.json(note, { status: 201 });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}
