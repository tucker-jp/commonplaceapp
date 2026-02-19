import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/folders - List all folders
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folders = await db.folder.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { notes: true, longNotes: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const foldersWithCount = folders.map((folder: typeof folders[number]) => ({
      ...folder,
      noteCount: folder._count.notes + folder._count.longNotes,
    }));

    return NextResponse.json(foldersWithCount);
  } catch (error) {
    console.error("Error fetching folders:", error);
    return NextResponse.json(
      { error: "Failed to fetch folders" },
      { status: 500 }
    );
  }
}

// POST /api/folders - Create a new folder
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type = "FRAGMENTS", instructions } = body;

    if (!name) {
      return NextResponse.json(
        { error: "Folder name is required" },
        { status: 400 }
      );
    }

    if (typeof name === "string" && name.length > 100) {
      return NextResponse.json(
        { error: "Folder name exceeds maximum length (100 characters)" },
        { status: 400 }
      );
    }

    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = user.id;

    const { parentId } = body;

    const folder = await db.folder.create({
      data: {
        name,
        type,
        instructions,
        parentId: parentId || undefined,
        userId,
      },
    });

    return NextResponse.json(folder, { status: 201 });
  } catch (error) {
    console.error("Error creating folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 }
    );
  }
}
