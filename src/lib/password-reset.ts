import crypto from "crypto";
import { db } from "@/lib/db";

const RESET_TOKEN_TTL_MINUTES = 60;

export function hashResetToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function createPasswordResetToken(userId: string) {
  await db.passwordResetToken.deleteMany({ where: { userId } });

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = hashResetToken(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await db.passwordResetToken.create({
    data: {
      userId,
      tokenHash,
      expiresAt,
    },
  });

  return token;
}

export async function consumePasswordResetToken(token: string) {
  const tokenHash = hashResetToken(token);
  const record = await db.passwordResetToken.findUnique({
    where: { tokenHash },
  });

  if (!record) {
    return null;
  }

  if (record.expiresAt < new Date()) {
    await db.passwordResetToken.delete({ where: { tokenHash } });
    return null;
  }

  await db.passwordResetToken.delete({ where: { tokenHash } });
  return record;
}
