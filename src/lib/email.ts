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

/**
 * HTML-escape a string before it is interpolated into email markup (WR-01). The verify/reset `url`
 * is library- and (for reset, via `redirectTo`) client-influenced; dropping it raw into an
 * `href="..."` attribute and into HTML text is an injection sink. We escape the five HTML-significant
 * characters so a value containing `"`, `<`, `>`, `&`, or `'` can never break out of the attribute
 * or inject markup — rather than trusting an upstream library to pre-escape content we concatenate.
 */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function send(to: string, subject: string, html: string) {
  if (!resend) {
    // WR-02 — the dev fallback logs the FULL email body, which includes the single-use
    // reset/verification link and its live token. That is acceptable locally but a credential
    // leak in production logs. Gate it strictly on a non-production environment: if RESEND_API_KEY
    // is ever missing in prod, fail loudly WITHOUT writing the token-bearing link to the logs.
    if (process.env.NODE_ENV === "production") {
      console.error(
        "RESEND_API_KEY missing in production — email NOT sent (link withheld from logs).",
      );
      return;
    }
    // Dev/test only: log the link instead of delivering so the flow can be followed locally.
    console.log(`[email:dev] to=${to} ${subject}\n${html}`);
    return;
  }
  const { error } = await resend.emails.send({ from: FROM, to, subject, html });
  if (error) console.error("resend error", error);
}

export const sendVerificationEmail = (to: string, url: string) => {
  const safe = escapeHtml(url); // WR-01 — never interpolate the raw url into HTML.
  return send(to, "Verify your FitOut email", `Verify: <a href="${safe}">${safe}</a>`);
};

export const sendResetPassword = (to: string, url: string) => {
  const safe = escapeHtml(url); // WR-01 — never interpolate the raw url into HTML.
  return send(to, "Reset your FitOut password", `Reset: <a href="${safe}">${safe}</a>`);
};
