import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// PATCH /api/folders/[folderId] - Update folder name, instructions, or parentId
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folder = await db.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    const body = await request.json();
    const { name, instructions, parentId } = body;

    const updated = await db.folder.update({
      where: { id: folderId },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(instructions !== undefined ? { instructions } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Failed to update folder" },
      { status: 500 }
    );
  }
}

// DELETE /api/folders/[folderId] - Delete folder (cascade removes notes/subfolders)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ folderId: string }> }
) {
  try {
    const { folderId } = await params;
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folder = await db.folder.findUnique({
      where: { id: folderId },
    });

    if (!folder || folder.userId !== user.id) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    await db.folder.delete({ where: { id: folderId } });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error deleting folder:", error);
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 }
    );
  }
}
