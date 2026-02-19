import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { normalizeTitle, TrackerType } from "@/lib/recommendations";

const trackerTypes: TrackerType[] = ["BOOK", "MOVIE", "MUSIC"];
const trackerStatuses = ["PLANNED", "IN_PROGRESS", "COMPLETED"] as const;

// PATCH /api/library/[itemId]
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const data: Record<string, unknown> = {};

    if (typeof body?.title === "string") {
      const title = body.title.trim();
      const titleNormalized = normalizeTitle(title);
      if (!title || !titleNormalized) {
        return NextResponse.json({ error: "Invalid title" }, { status: 400 });
      }
      data.title = title;
      data.titleNormalized = titleNormalized;
    }

    if (typeof body?.type === "string") {
      const type = body.type.toUpperCase();
      if (!trackerTypes.includes(type as TrackerType)) {
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
      }
      data.type = type;
    }

    if (typeof body?.status === "string") {
      const status = body.status.toUpperCase();
      if (!trackerStatuses.includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      data.status = status;
    }

    if (typeof body?.creator === "string") {
      data.creator = body.creator.trim();
    }

    if (typeof body?.rating === "number" && Number.isFinite(body.rating)) {
      data.rating = body.rating;
    } else if (typeof body?.rating === "string" && body.rating.trim()) {
      const parsed = Number.parseFloat(body.rating);
      if (Number.isFinite(parsed)) {
        data.rating = parsed;
      }
    }

    if (typeof body?.notes === "string") {
      data.notes = body.notes.trim();
    }

    if (Array.isArray(body?.tags)) {
      data.tags = body.tags;
    }

    if (typeof body?.isRecommendation === "boolean") {
      data.isRecommendation = body.isRecommendation;
      if (body.isRecommendation) {
        data.status = "PLANNED";
        data.finishedAt = null;
      }
    }

    if (body?.startedAt) {
      data.startedAt = new Date(body.startedAt);
    }

    if (body?.finishedAt) {
      data.finishedAt = new Date(body.finishedAt);
    }

    if (data.status === "COMPLETED") {
      data.isRecommendation = false;
    }

    if (data.isRecommendation === false && data.status !== "COMPLETED") {
      data.status = "COMPLETED";
    }

    const existing = await db.trackerItem.findFirst({
      where: { id: itemId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const item = await db.trackerItem.update({
      where: { id: itemId },
      data,
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating library item:", error);
    return NextResponse.json(
      { error: "Failed to update library item" },
      { status: 500 }
    );
  }
}

// DELETE /api/library/[itemId]
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ itemId: string }> }
) {
  try {
    const { itemId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await db.trackerItem.findFirst({
      where: { id: itemId, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.trackerItem.delete({
      where: { id: itemId },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error deleting library item:", error);
    return NextResponse.json(
      { error: "Failed to delete library item" },
      { status: 500 }
    );
  }
}
