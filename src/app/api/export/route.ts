import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/export?folderId=optional — download notes as CSV
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get("folderId") || undefined;

    const notes = await db.note.findMany({
      where: {
        userId: user.id,
        ...(folderId ? { folderId } : {}),
      },
      include: {
        folder: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    // Wrap value in double quotes, escaping any internal double quotes
    const cell = (val: string | null | undefined) =>
      `"${(val ?? "").replace(/"/g, '""')}"`;

    const headers = ["Title", "Summary", "Cleaned Memo", "Original Text", "Tags", "Folder", "Created At"];
    const rows = notes.map((note) => [
      cell(note.title),
      cell(note.summary),
      cell(note.cleanedMemo),
      cell(note.originalText),
      cell(note.tags.join("; ")),
      cell(note.folder.name),
      cell(new Date(note.createdAt).toISOString().slice(0, 10)),
    ]);

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

    const folderName = folderId ? (notes[0]?.folder?.name ?? "folder") : "all";
    const date = new Date().toISOString().slice(0, 10);
    const filename = `commonplace-${folderName}-${date}.csv`;

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Failed to export" }, { status: 500 });
  }
}
