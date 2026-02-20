import nodemailer from "nodemailer";

type PasswordResetEmailOptions = {
  name?: string;
  resetUrl: string;
};

export async function sendPasswordResetEmail(
  to: string,
  { name, resetUrl }: PasswordResetEmailOptions
) {
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const emailFrom = process.env.EMAIL_FROM;

  if (!smtpHost || !smtpPort || !emailFrom) {
    console.warn("Email not configured. Password reset link:", resetUrl);
    return { sent: false, reason: "missing_email_config" };
  }

  const port = Number(smtpPort);
  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port,
    secure: port === 465,
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  });

  const greeting = name ? `Hi ${name},` : "Hello,";
  const subject = "Reset your CommonPlace password";
  const text = `${greeting}

We received a request to reset your CommonPlace password.

Reset your password: ${resetUrl}

If you did not request this, you can safely ignore this email.`;

  const html = `<p>${greeting}</p>
<p>We received a request to reset your CommonPlace password.</p>
<p><a href="${resetUrl}">Reset your password</a></p>
<p>If you did not request this, you can safely ignore this email.</p>`;

  await transporter.sendMail({
    from: emailFrom,
    to,
    subject,
    text,
    html,
  });

  return { sent: true };
}
