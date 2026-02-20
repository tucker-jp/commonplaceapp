import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/email";
// Trigger fresh deploy to pick up SMTP + NEXTAUTH_URL env vars

function getAppUrl(request: NextRequest) {
  if (process.env.APP_URL) return process.env.APP_URL;
  if (process.env.NEXTAUTH_URL) return process.env.NEXTAUTH_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return request.nextUrl.origin;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const rawEmail = typeof body?.email === "string" ? body.email : "";
    const email = rawEmail.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await db.user.findFirst({
      where: { email: { equals: email, mode: "insensitive" } },
      select: { id: true, email: true, name: true },
    });

    if (user) {
      const token = await createPasswordResetToken(user.id);
      const resetUrl = `${getAppUrl(request)}/auth/reset-password?token=${token}`;
      await sendPasswordResetEmail(user.email, { name: user.name ?? undefined, resetUrl });
    }

    return NextResponse.json({
      ok: true,
      message: "If you have an account with that email, a reset link has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Failed to request password reset" },
      { status: 500 }
    );
  }
}
