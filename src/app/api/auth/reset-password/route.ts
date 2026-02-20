import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumePasswordResetToken } from "@/lib/password-reset";
import { hashPassword, validatePasswordStrength } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!token || !password) {
      return NextResponse.json(
        { error: "Token and password are required" },
        { status: 400 }
      );
    }

    const { valid, errors } = validatePasswordStrength(password);
    if (!valid) {
      return NextResponse.json(
        { error: errors.join(", ") },
        { status: 400 }
      );
    }

    const record = await consumePasswordResetToken(token);
    if (!record) {
      return NextResponse.json(
        { error: "Invalid or expired reset token" },
        { status: 400 }
      );
    }

    const hashedPassword = await hashPassword(password);
    await db.user.update({
      where: { id: record.userId },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Reset password error:", error);
    return NextResponse.json(
      { error: "Failed to reset password" },
      { status: 500 }
    );
  }
}
