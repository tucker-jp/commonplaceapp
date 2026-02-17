import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

// GET /api/settings - Get current user's settings
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await db.settings.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json(settings ?? { customLLMInstructions: null });
  } catch (error) {
    console.error("Error fetching settings:", error);
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Upsert current user's settings
export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { customLLMInstructions } = body;

    const settings = await db.settings.upsert({
      where: { userId: user.id },
      update: { customLLMInstructions },
      create: { userId: user.id, customLLMInstructions },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error saving settings:", error);
    return NextResponse.json(
      { error: "Failed to save settings" },
      { status: 500 }
    );
  }
}
