// Transactional email via Resend (verification + password-reset links).
//
// Dev fallback: when RESEND_API_KEY is unset, the email is NOT sent — instead the link
// is logged to the console (the `[email:dev]` marker), which is enough to follow the
// verify/reset flow locally and in tests without real delivery (RESEARCH §email helper).
//
// Call sites in auth.ts fire-and-forget (`void send...`) to avoid a timing side-channel
// and to keep auth responses fast (RESEARCH Pitfall 4 — do NOT await these from auth.ts).
//
// Source: resend.com/docs/send-with-nextjs.

import { Resend } from "resend";

const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
const FROM = process.env.EMAIL_FROM ?? "FitOut <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    // Dev fallback — no API key: log the link instead of delivering.
    console.log(`[email:dev] to=${to} ${subject}\n${html}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error("resend error", error);
}

export const sendVerificationEmail = (to: string, url: string) =>
  send(to, "Verify your FitOut email", `Verify: <a href="${url}">${url}</a>`);

export const sendResetPassword = (to: string, url: string) =>
  send(to, "Reset your FitOut password", `Reset: <a href="${url}">${url}</a>`);
