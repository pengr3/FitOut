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
//  - Deadline claims render the ROW's pre-composed capped label (payByLabel / respondByLabel — D-96/D-99,
//    CR-02). Config hour-constants must NEVER appear in email copy: the D-96 session-start cap means the
//    real deadline is frequently NOT "N hours from now", and a flat number is false in writing on exactly
//    the short-notice requests where the deadline matters most. A template with no deadline field states
//    NO number at all — a numberless claim cannot be false.
//  - Sends are invoked ONLY from the Inngest notify function (D-83), never fire-and-forget from an
//    action. A call site emits `inngest.send({ name: "fitout/notify" })` AFTER commit (see
//    src/lib/notifications.ts `emitNotify`); Inngest owns retry, backoff and per-run observability, and
//    a permanently-failed send writes a `needs_attention` audit row (D-90) instead of vanishing.
//    Do NOT reinstate `void sendXxx(...)` — that is the anti-pattern D-83 exists to remove. It is what
//    left WR-04 open since Phase 2: a `void`ed rejection is a swallowed failure with no retry, no
//    record, and nothing for an operator to look at.

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
 * hold. Reassures nothing was charged (D-63). `bookingUrl` is the caller's absolute /bookings/{id} link.
 *
 * DELIBERATELY STATES NO DEADLINE (CR-02): this payload carries no deadline field, and under the D-96
 * proportional split the host's real SLA is frequently far shorter than any flat hour count — so the
 * copy makes no numeric claim at all rather than a sometimes-false one.
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
      `<p>Your request to book ${space} on ${when} is with the host. We'll let you know as soon as they respond. You haven't been charged — you'll only pay if the host approves.</p>` +
      `<p><a href="${url}">View your request</a></p>`,
  );
};

/**
 * Request approved → pay now (booker) — fires from approveRequest. `totalLabel` is the server-frozen
 * formatMoney amount; `payByLabel` is the ROW's real payment deadline (the D-96 session-start-capped
 * expiry, read back off the approval UPDATE's RETURNING and pre-composed venue-local — CR-02: never a
 * flat hour count); `payUrl` is the caller's absolute /listings/{listingId}/book?hold={id} link.
 */
export const sendRequestApproved = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  totalLabel: string,
  payByLabel: string,
  payUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const total = escapeHtml(totalLabel);
  const payBy = escapeHtml(payByLabel); // WR-01 — carries a venue city string; escape like every field.
  const url = escapeHtml(payUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Approved — pay to confirm ${spaceTitle}`,
    `<p><strong>Your request was approved</strong></p>` +
      `<p>Good news — the host approved your booking for ${space} on ${when}. Pay ${total} by ${payBy} to lock it in.</p>` +
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
 * display name (untrusted — escaped), `totalLabel` the server-frozen guest-pays amount,
 * `respondByLabel` the ROW's real SLA deadline (the D-96 proportional-split expiry off the request
 * insert, pre-composed venue-local — CR-02: a flat hour count is false on exactly the short-notice
 * requests where the deadline matters most), `requestsUrl` the caller's absolute /host/requests link.
 */
export const sendNewRequestToHost = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  bookerLabel: string,
  totalLabel: string,
  respondByLabel: string,
  requestsUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const booker = escapeHtml(bookerLabel);
  const total = escapeHtml(totalLabel);
  const respondBy = escapeHtml(respondByLabel); // WR-01 — carries a venue city string; escape it.
  const url = escapeHtml(requestsUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `New booking request — ${spaceTitle}`,
    `<p><strong>New booking request</strong></p>` +
      `<p>${booker} requested ${space} on ${when} for ${total}. Respond by ${respondBy} to approve or decline.</p>` +
      `<p><a href="${url}">Review request</a></p>`,
  );
};

// ---------------------------------------------------------------------------
// Phase-7 cancellation + reminder sends (D-70/D-85/D-87). Same contract header as above.
// ---------------------------------------------------------------------------
// These six are dispatched EXCLUSIVELY by `sendForType` in src/inngest/functions/notify.ts — there is no
// other call site and there must not be one (D-83). Each takes a PRE-COMPOSED `whenLabel` and pre-formatted
// money labels, so no send here formats a time or does arithmetic.

/**
 * Booking cancelled by the BOOKER → notifies the HOST. Deliberately carries the booker label and the freed
 * window rather than the booker's refund amount: what the host needs to know is who cancelled and that the
 * slot is available again — the refund is the booker's side of the transaction, not the host's business.
 * Calm, no blame: a booker cancelling within the policy they were shown (D-81) did nothing wrong.
 */
export const sendBookingCancelledByBooker = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  bookerLabel: string,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const booker = escapeHtml(bookerLabel);
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Booking cancelled — ${spaceTitle}`,
    `<p><strong>A booking was cancelled</strong></p>` +
      `<p>${booker} cancelled their booking at ${space} on ${when}. That window is open for other guests again — nothing else is needed from you.</p>` +
      `<p><a href="${url}">View the booking</a></p>`,
  );
};

/**
 * Booking cancelled by the HOST → notifies the BOOKER. States the FULL refund plainly and up front (D-70:
 * the booker gets everything back regardless of the listing's tier). The booker did not choose this, so the
 * money answer comes first, before any suggestion that they go and find somewhere else.
 */
export const sendBookingCancelledByHost = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  refundLabel: string,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const refund = escapeHtml(refundLabel);
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Your booking was cancelled — ${spaceTitle}`,
    `<p><strong>The host cancelled this booking</strong></p>` +
      `<p>We're sorry — the host cancelled your booking at ${space} on ${when}. You're getting a full refund of ${refund}, including the service fee.</p>` +
      `<p><a href="${url}">View the booking</a></p>`,
  );
};

/**
 * Refund issued → notifies the BOOKER. Fired when the refund is actually on its way, which is a separate
 * moment from the cancellation itself (the webhook is the single writer of terminal refund state, D-57).
 * Carries the settlement-timing note, because "refunded" without a timeframe reliably generates the
 * "where is my money" support thread a single sentence prevents.
 */
export const sendRefundIssued = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  refundLabel: string,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const refund = escapeHtml(refundLabel);
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Refund on its way — ${spaceTitle}`,
    `<p><strong>Your refund is on its way</strong></p>` +
      `<p>We've issued a refund of ${refund} for your booking at ${space} on ${when}. Refunds usually land back on your original payment method within a few days.</p>` +
      `<p><a href="${url}">View the booking</a></p>`,
  );
};

/**
 * Pre-expiry reminder (D-85 #1) → the BOOKER with an approved-but-unpaid booking. The highest-value
 * reminder in the set: it is the one D-89 explicitly accepted risk on when the channel stack was fixed at
 * email + in-app.
 *
 * TONE IS LOAD-BEARING (C6) — calm, never urgent, no countdown theatre. Under pay-on-approval (D-63) a
 * lapse costs the booker a SLOT, never money: nothing was ever charged, so there is nothing to be alarmed
 * about and manufacturing alarm would be dishonest. `payByLabel` is the pre-composed venue-local deadline;
 * the window is never re-derived here.
 */
export const sendReminderPreExpiry = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  totalLabel: string,
  payByLabel: string,
  payUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const total = escapeHtml(totalLabel);
  const payBy = escapeHtml(payByLabel);
  const url = escapeHtml(payUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Still holding your spot — ${spaceTitle}`,
    `<p><strong>Your approved booking is waiting</strong></p>` +
      `<p>The host approved ${space} on ${when}, and we're holding it until ${payBy}. Pay ${total} whenever you're ready to confirm it. You haven't been charged anything yet.</p>` +
      `<p><a href="${url}">Pay now</a></p>`,
  );
};

/**
 * Pre-session reminder (D-85 #2 and #3) → BOTH the booker and the host. One send serves both sides: the
 * copy is deliberately side-neutral, because the recipient already knows which side of the booking they are
 * on and a split would be two templates to keep in sync for no gain. Fires once per side, guaranteed by the
 * `booking_reminder` UNIQUE(booking_id, kind) claim — never by an Inngest dedupe TTL (D-87).
 */
export const sendReminderPreSession = (
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
    `Coming up — ${spaceTitle}`,
    `<p><strong>Your session is coming up</strong></p>` +
      `<p>A reminder that ${space} is booked for ${when}.</p>` +
      `<p><a href="${url}">View the booking</a></p>`,
  );
};

/**
 * Pre-SLA reminder (D-85 #4) → the HOST sitting on a pending request. `respondByLabel` is the pre-composed
 * venue-local deadline rather than an hour count from config, because a D-96 cap-shortened SLA means the
 * real deadline is frequently NOT the configured hour count from now — printing a flat number would be
 * wrong on exactly the short-notice requests where the reminder matters most.
 */
export const sendReminderPreSla = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  bookerLabel: string,
  respondByLabel: string,
  requestsUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const booker = escapeHtml(bookerLabel);
  const respondBy = escapeHtml(respondByLabel);
  const url = escapeHtml(requestsUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Still waiting on you — ${spaceTitle}`,
    `<p><strong>A request is waiting for your answer</strong></p>` +
      `<p>${booker} asked to book ${space} on ${when}. Let them know by ${respondBy} — if you don't, we'll decline it for you and free the slot.</p>` +
      `<p><a href="${url}">Review request</a></p>`,
  );
};
