import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/search?q=<query> - Search notes
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim();

    if (!q) {
      return NextResponse.json([]);
    }

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        OR: [
          { title: { contains: q, mode: "insensitive" } },
          { summary: { contains: q, mode: "insensitive" } },
          { originalText: { contains: q, mode: "insensitive" } },
          { tags: { has: q } },
        ],
      },
      include: {
        folder: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error searching notes:", error);
    return NextResponse.json(
      { error: "Failed to search notes" },
      { status: 500 }
    );
  }
}
