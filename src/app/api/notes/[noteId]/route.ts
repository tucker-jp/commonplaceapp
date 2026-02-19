import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/notes/[noteId] - Update note (move, edit title/text/tags)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
    });

    if (!note || note.userId !== user.id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const body = await request.json();
    const { folderId, title, cleanedMemo, summary, tags } = body;

    // Verify target folder belongs to the current user
    if (folderId !== undefined) {
      const targetFolder = await db.folder.findUnique({
        where: { id: folderId },
        select: { userId: true },
      });
      if (!targetFolder || targetFolder.userId !== user.id) {
        return NextResponse.json({ error: "Target folder not found" }, { status: 404 });
      }
    }

    const updated = await db.note.update({
      where: { id: noteId },
      data: {
        ...(folderId !== undefined ? { folderId } : {}),
        ...(title !== undefined ? { title } : {}),
        ...(cleanedMemo !== undefined ? { cleanedMemo } : {}),
        ...(summary !== undefined ? { summary } : {}),
        ...(tags !== undefined ? { tags } : {}),
      },
      include: {
        folder: { select: { name: true } },
        calendarEvent: true,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { error: "Failed to update note" },
      { status: 500 }
    );
  }
}

// DELETE /api/notes/[noteId] - Delete note (cascade removes calendarEvent)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  try {
    const { noteId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const note = await db.note.findUnique({
      where: { id: noteId },
    });

    if (!note || note.userId !== user.id) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    await db.note.delete({ where: { id: noteId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
}
