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
import { APPROVAL_SLA_HOURS, APPROVAL_PAYMENT_WINDOW_HOURS } from "@/lib/payments/config";

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

// ---------------------------------------------------------------------------
// Lifecycle emails (D-66 — the first non-auth emails in the repo).
// ---------------------------------------------------------------------------
// The sole email transport for BOOK-06 and the request lifecycle: five thin plain-HTML sends,
// each mirroring the sendVerificationEmail shape (a heading line + one body line + a single anchor
// CTA) over the SAME send()/escapeHtml() helpers above — never a new email stack (D-66; React Email
// stays uninstalled, branding/retry hardening is Phase 7, WR-04).
//
// Contract discipline (06-UI-SPEC "Lifecycle email contract"):
//  - EVERY interpolated field — space title, booker label, quoted total, reference, CTA url — is
//    escapeHtml'd before it enters the markup (WR-01 / T-06-06 tampering sink: a raw url in an href
//    or a raw title in HTML text is the injection vector).
//  - Time labels ALREADY name the venue timezone — the caller composes `{date}, {time} ({City} time)`
//    and passes it as whenLabel; these sends never format a time themselves.
//  - The approval SLA / payment window render as HOUR VALUES from config (never the internal constant
//    names) so Phase-7 policy tuning flows through automatically.
//  - Fire-and-forget at every call site (`void sendXxx(...)`, T-06-07): a Resend failure must never
//    reject a webhook ACK or block a server action — the consuming plans (06-04/05/06/07) own that.

/** App base URL for the one CTA without a caller-supplied link (declined → "Find another space").
 *  Uses the same BETTER_AUTH_URL app-URL convention as auth.ts / paymongo-connect.ts; falls back to a
 *  root-relative href so a missing env never yields a broken link. */
const APP_URL = process.env.BETTER_AUTH_URL ?? "";

/**
 * Booking confirmed (booker) — fires after a successful confirm (webhook payment.paid), covering both
 * instant and pay-on-approval. `whenLabel` already names the venue tz; `bookingUrl` is the caller's
 * absolute /bookings/{id} link; `reference` is the FIT-XXXXXXXX booking reference.
 */
export const sendBookingConfirmed = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  reference: string,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const ref = escapeHtml(reference);
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Your FitOut booking is confirmed — ${spaceTitle}`,
    `<p><strong>Booking confirmed</strong></p>` +
      `<p>You're booked at ${space} on ${when}. Booking reference ${ref}.</p>` +
      `<p><a href="${url}">View your booking</a></p>`,
  );
};

/**
 * Request received (booker) — fires from placeHold's request branch after minting the `requested`
 * hold. Names the approval SLA in hours and reassures nothing was charged (D-63). `bookingUrl` is the
 * caller's absolute /bookings/{id} link.
 */
export const sendRequestReceived = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `We sent your request — ${spaceTitle}`,
    `<p><strong>Request sent</strong></p>` +
      `<p>Your request to book ${space} on ${when} is with the host. You'll hear back within ${APPROVAL_SLA_HOURS} hours. You haven't been charged — you'll only pay if the host approves.</p>` +
      `<p><a href="${url}">View your request</a></p>`,
  );
};

/**
 * Request approved → pay now (booker) — fires from approveRequest. `totalLabel` is the server-frozen
 * formatMoney amount; `payUrl` is the caller's absolute /listings/{listingId}/book?hold={id} link. The
 * payment window renders as an hour VALUE from config.
 */
export const sendRequestApproved = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  totalLabel: string,
  payUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const total = escapeHtml(totalLabel);
  const url = escapeHtml(payUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Approved — pay to confirm ${spaceTitle}`,
    `<p><strong>Your request was approved</strong></p>` +
      `<p>Good news — the host approved your booking for ${space} on ${when}. Pay ${total} within ${APPROVAL_PAYMENT_WINDOW_HOURS} hours to lock it in.</p>` +
      `<p><a href="${url}">Pay now</a></p>`,
  );
};

/**
 * Request declined / expired (booker) — fires from declineRequest AND the SLA auto-decline sweep.
 * `opts.expired` picks the "expired before the host responded" wording; both reassure nothing was
 * charged (D-63). The CTA links back to search (no caller url — uses APP_URL).
 */
export const sendRequestDeclined = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  opts?: { expired?: boolean },
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const url = escapeHtml(`${APP_URL}/`); // WR-01 — escape even the app-root href.
  const heading = opts?.expired ? "This request expired" : "This request wasn't available";
  const body = opts?.expired
    ? `Your request to book ${space} for ${when} expired before the host responded. You haven't been charged.`
    : `Unfortunately the host couldn't take your booking for ${space} on ${when}. You haven't been charged.`;
  return send(
    to,
    `Your request for ${spaceTitle} wasn't available`,
    `<p><strong>${heading}</strong></p>` + `<p>${body}</p>` + `<p><a href="${url}">Find another space</a></p>`,
  );
};

/**
 * New booking request (host) — fires from placeHold's request branch. `bookerLabel` is the booker's
 * display name (untrusted — escaped), `totalLabel` the server-frozen guest-pays amount, `requestsUrl`
 * the caller's absolute /host/requests link. Names the SLA in hours.
 */
export const sendNewRequestToHost = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  bookerLabel: string,
  totalLabel: string,
  requestsUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const booker = escapeHtml(bookerLabel);
  const total = escapeHtml(totalLabel);
  const url = escapeHtml(requestsUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `New booking request — ${spaceTitle}`,
    `<p><strong>New booking request</strong></p>` +
      `<p>${booker} requested ${space} on ${when} for ${total}. Respond within ${APPROVAL_SLA_HOURS} hours to approve or decline.</p>` +
      `<p><a href="${url}">Review request</a></p>`,
  );
};
