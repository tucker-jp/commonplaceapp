import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { hashPassword, validatePasswordStrength } from "@/lib/password";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Validate password strength
    const { valid, errors } = validatePasswordStrength(password);
    if (!valid) {
      return NextResponse.json(
        { error: errors.join(", ") },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await db.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 }
      );
    }

    // Hash password and create user
    const hashedPassword = await hashPassword(password);

    const user = await db.user.create({
      data: {
        email,
        name: name || null,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    // Create default folders for new user
    await db.folder.createMany({
      data: [
        { name: "Fragments", type: "FRAGMENTS", userId: user.id },
        { name: "Ideas", type: "FRAGMENTS", userId: user.id },
        { name: "Tasks", type: "FRAGMENTS", userId: user.id },
        { name: "Journal", type: "FRAGMENTS", userId: user.id },
      ],
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Failed to create account" },
      { status: 500 }
    );
  }
}
