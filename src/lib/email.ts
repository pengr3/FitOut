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

// D-92 — a COPY CONSTANT, not a trigger. See `sendRefundIssued`'s header for why importing it here is
// inside this phase's boundary and what it is asserted not to have moved.
import { ALL_RAILS_REFUND_WINDOW } from "@/lib/booking/refund-window";

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
 * Booking cancelled by the HOST → the HOST's OWN record (WR-04 / 07-17). The canceller's copy is a
 * different document from the booker's: they receive nothing, their guest is refunded in full, and they
 * may owe the D-71 fee. `feeLabel` is null when no fee was charged — the fee sentence is then omitted
 * entirely, never rendered as "₱0" (CR-01's rule applies to fees too). Dispatched exclusively by
 * `sendForType` on `payload.side === "host"`.
 */
export const sendHostCancellationRecord = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  refundLabel: string,
  feeLabel: string | null,
  bookingUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const refund = escapeHtml(refundLabel);
  const fee = feeLabel === null ? null : escapeHtml(feeLabel); // WR-01 — every interpolated field.
  const url = escapeHtml(bookingUrl); // WR-01 — never interpolate the raw url into an href.
  const feeSentence =
    fee === null ? "" : ` A ${fee} cancellation fee will be deducted from your next payout.`;
  return send(
    to,
    `You cancelled a booking — ${spaceTitle}`,
    `<p><strong>You cancelled this booking</strong></p>` +
      `<p>You cancelled the booking at ${space} on ${when}. Your guest is being refunded ${refund} in full, including the service fee.${feeSentence}</p>` +
      `<p><a href="${url}">View your bookings</a></p>`,
  );
};

/**
 * Refund issued → notifies the BOOKER. Fired when the refund is actually on its way, which is a separate
 * moment from the cancellation itself (the webhook is the single writer of terminal refund state, D-57).
 * Carries the settlement-timing note, because "refunded" without a timeframe reliably generates the
 * "where is my money" support thread a single sentence prevents.
 *
 * ⚠ THE SETTLEMENT-TIMING NOTE IS NOW READ FROM ITS ONE OWNER (D-92). The string that shipped in this
 * body was unsourced — a vague plural of "day" paired with a promise about the original payment method —
 * and it is superseded by `@/lib/booking/refund-window`, the SAME module the cancel review page and the
 * booking detail page read. A booker's screen and their inbox stating different windows for their own
 * money is a disclosure defect on a money path, not a copy nit, and removing it is the reason this phase
 * exists.
 *
 * WHY THIS IS NOT A D-78 VIOLATION, WRITTEN DOWN SO THE NEXT READER NEED NOT RE-DERIVE IT. D-78 puts
 * Phase 15's email shell off limits for send TRIGGERS: none may be added, moved or removed in this
 * phase, and Phase 15's SC#3 is that not a single one has. This edit changes a STRING inside an existing
 * body and imports the module that owns it. The `send` call, its subject line, its recipient, its
 * arguments, its one call site — `src/inngest/functions/notify.ts`'s `refund_issued` case — and the
 * conditions under which it fires are all byte-identical. `tests/booking/notify-emission.test.ts`
 * passing unchanged is the PROOF of that rather than the claim of it. SC#3 survives.
 *
 * THE RAIL-FREE SENTENCE IS THE RIGHT ONE HERE, and the reason is structural rather than a preference:
 * this function is handed a recipient, a title, a when-label, a refund label and a url. It is never
 * handed a rail, and giving it one would change its signature AND its call site — exactly what D-78
 * protects. `ALL_RAILS_REFUND_WINDOW` names every rail a FitOut booker could have used so they recognise
 * their own, without the email claiming to know which it was. If a future phase wants the per-rail
 * sentence in the inbox, that is a change to the notify payload and it belongs to the phase that owns
 * the shell.
 *
 * NOT run through `escapeHtml`, deliberately. WR-01's rule is about interpolated FIELDS — caller-supplied
 * values that reach an `href` or HTML text. This is a compile-time constant from this repository, in the
 * same category as the literal prose sitting beside it in the same template, which is likewise unescaped.
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
      `<p>We've issued a refund of ${refund} for your booking at ${space} on ${when}. ${ALL_RAILS_REFUND_WINDOW}</p>` +
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

// ---------------------------------------------------------------------------
// Phase-8 group-RSVP sends (D-122). Same contract header as above — thin plain-HTML sends over the SAME
// send()/escapeHtml() helpers. Dispatched EXCLUSIVELY by `sendForType` in notify.ts (D-83). These reach
// ACCOUNT recipients only; the guest-with-email path is the separate `sendGuestRsvpEmail` (email-only fn,
// RESEARCH Pitfall 2). EVERY interpolated field — including the guest-typed attendee name — is escapeHtml'd
// (G6 / T-08-08); `groupUrl` is the caller's ABSOLUTE ${BETTER_AUTH_URL}/... link.

/**
 * A group attendee RSVP'd → notifies the ORGANIZER. `attendeeLabel` is the attendee's display name
 * (guest-typed, untrusted — escaped). `answer` picks the sentence: "is coming" (yes) or "can't make it"
 * (no); it is a copy variant, never a rendered label. Calm, factual — the organizer is just tracking heads.
 */
export const sendGroupRsvpReceived = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  attendeeLabel: string,
  answer: "yes" | "no",
  groupUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const attendee = escapeHtml(attendeeLabel); // T-08-08 — guest-typed name; escape like every field.
  const url = escapeHtml(groupUrl); // WR-01 — never interpolate the raw url into an href.
  const verdict = answer === "yes" ? "is coming" : "can't make it";
  return send(
    to,
    `New RSVP — ${spaceTitle}`,
    `<p><strong>New RSVP for your group booking</strong></p>` +
      `<p>${attendee} ${verdict} to ${space} on ${when}.</p>` +
      `<p><a href="${url}">View your group</a></p>`,
  );
};

/**
 * RSVP confirmed → notifies an ATTENDEE with an account. Reassures they're on the list; the organizer pays,
 * so there is nothing for them to settle (group v1 = organizer-pays, RSVP/headcount only).
 */
export const sendGroupRsvpConfirmed = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  groupUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const url = escapeHtml(groupUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `You're on the list — ${spaceTitle}`,
    `<p><strong>You're confirmed for the group</strong></p>` +
      `<p>You're set for ${space} on ${when}. The organizer has the booking covered — just show up.</p>` +
      `<p><a href="${url}">View the details</a></p>`,
  );
};

/**
 * The group booking was cancelled → notifies a reachable, confirmed ("yes") ATTENDEE. States plainly that
 * the session is off so no one turns up to a booking that no longer exists.
 */
export const sendGroupCancelled = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  groupUrl: string,
) => {
  const space = escapeHtml(spaceTitle);
  const when = escapeHtml(whenLabel);
  const url = escapeHtml(groupUrl); // WR-01 — never interpolate the raw url into an href.
  return send(
    to,
    `Group booking cancelled — ${spaceTitle}`,
    `<p><strong>This group booking was cancelled</strong></p>` +
      `<p>The booking at ${space} on ${when} is no longer happening — you don't need to go.</p>` +
      `<p><a href="${url}">View the details</a></p>`,
  );
};

// ---------------------------------------------------------------------------
// Phase-8 guest-with-email send (D-122 · GROUP-03/04 · RESEARCH Pitfall 2 / RESOLVED A2).
// ---------------------------------------------------------------------------
// A guest attendee RSVP'd via the invite link but has NO account — so NO durable `notification` row is ever
// written for them (notification.recipientId is a NOT NULL FK to user.id). This send is therefore dispatched
// by the SEPARATE email-only Inngest fn `fitout/guest-email` (src/inngest/functions/guest-email.ts), never
// by fitout/notify. It uses the SAME private send()/escapeHtml() helpers as every other send — the guest
// path needs no new integration, and the [email:dev] fallback logs locally when RESEND_API_KEY is unset.

/** The whole input to the email-only guest send. No user.id → no durable row (RESEARCH Pitfall 2). `kind`
 *  is a copy variant, not a rendered label. `href` is the caller's ABSOLUTE invite/details link. */
export type GuestRsvpEmail = {
  to: string;
  kind: "rsvp_confirmed" | "group_cancelled";
  listingTitle: string;
  whenLabel: string;
  href: string;
};

/**
 * The guest-with-email RSVP send. EVERY interpolated field — the guest-facing title, the venue-local when
 * label, and the invite href — is escapeHtml'd (G6 / T-08-08). Returns a JSON-serializable result so it can
 * be the body of an Inngest `step.run`. Does NOT throw when RESEND_API_KEY is unset: `send` falls back to the
 * [email:dev] console log, so the guest path works in dev/test with no Resend key.
 */
export const sendGuestRsvpEmail = async (d: GuestRsvpEmail): Promise<{ sent: true }> => {
  const space = escapeHtml(d.listingTitle);
  const when = escapeHtml(d.whenLabel);
  const url = escapeHtml(d.href); // WR-01 — never interpolate the raw url into an href.
  if (d.kind === "rsvp_confirmed") {
    await send(
      d.to,
      `You're on the list — ${d.listingTitle}`,
      `<p><strong>Your RSVP is confirmed</strong></p>` +
        `<p>You're set for ${space} on ${when}. The organizer has the booking covered — just show up.</p>` +
        `<p><a href="${url}">View the details</a></p>`,
    );
  } else {
    await send(
      d.to,
      `Group booking cancelled — ${d.listingTitle}`,
      `<p><strong>This group booking was cancelled</strong></p>` +
        `<p>The booking at ${space} on ${when} is no longer happening — you don't need to go.</p>` +
        `<p><a href="${url}">View the details</a></p>`,
    );
  }
  return { sent: true };
};

// ---------------------------------------------------------------------------
// Ops alert digest (quick 260810-j3z) — the daily UNRESOLVED `needs_attention` money-alert digest.
// ---------------------------------------------------------------------------
// Same contract as every block above: a thin plain-HTML send over the SAME private send()/escapeHtml()
// helpers, never a new email stack. Dispatched ONLY from an Inngest function
// (src/inngest/functions/ops-alert-digest.ts, the daily 08:50 Asia/Manila cron) per the D-83 rule already
// stated at lines 84-89 — do NOT reinstate a fire-and-forget `void sendOpsAlertDigest(...)` from an action
// or a script. This one is NOT a user-facing lifecycle email: its single recipient is the operator address
// in OPS_ALERT_EMAIL, and its subject line is the only notice anyone gets that real money is outstanding.
//
// THE `meta` COLUMN IS ABSENT, AND ITS ABSENCE IS THE CONTRACT (D-J3Z-02).
// `OpsDigestRow` mirrors `UnresolvedAlert` (src/lib/ops/alerts.ts) plus two DERIVED display fields, and
// like it has NO field for the audit table's jsonb `meta` column. That column carries booking ids, transfer
// ids and masked last-4s under an explicit COLUMN-LEVEL rule (D-72), restated verbatim at
// cancel-booking.ts:755-756: "No account number, no account name, no BIC — not in this audit meta, not in
// any log line, NOT IN ANY COLUMN." An email body is where that rule bites hardest, because email is an
// EXTERNAL service that forwards, archives and indexes — content that enters it does not come back out of
// anyone's control. Re-exporting `meta` here would therefore silently widen a column-level contract across
// a trust boundary, in the one direction that cannot be undone. Because the row type has no such field, an
// attempt to do it is a TYPE ERROR at the renderer rather than something a reviewer has to notice.
// The digest carries audit id / action / actor_id / created_at / age — enough to LOOK THE ROW UP, and
// nothing more. Reading the full row is a LOCAL psql or Drizzle Studio session; see
// .planning/ops/NEEDS-ATTENTION-RUNBOOK.md section 3.
//
// EVERY interpolated field is escapeHtml'd (WR-01). `action` and `actor_id` are free-text columns written
// from ~20 `recordAudit` call sites, so they are untrusted for HTML purposes exactly like every other field
// in this file — not because a call site is expected to be hostile, but because "trusted because we wrote
// it" is the assumption that makes an injection sink.

/**
 * One row as the digest renders it: the four columns `listUnresolvedAlerts` returns, plus the two DERIVED
 * display fields (`ageHours`, `aging`). Deliberately still has no `meta` — see the block above.
 */
export type OpsDigestRow = {
  id: string;
  action: string;
  actorId: string;
  createdAt: Date;
  ageHours: number;
  aging: boolean;
};

/**
 * PURE renderer, exported on purpose: the PII assertion reads this body DIRECTLY rather than only through
 * the transport, so the guarantee is pinned at the point the string is built, not merely at the point it is
 * handed to Resend. Aging rows carry a plain-text `— AGING` marker; never colour alone.
 *
 * `opts.truncated` states an honest "N+ unresolved — showing the N newest" line (D-J3Z-09) instead of
 * silently rendering a partial list as though it were the whole queue.
 */
export function renderOpsAlertDigest(
  rows: OpsDigestRow[],
  opts: { truncated: boolean; limit: number },
): string {
  const body = rows
    .map((r) => {
      const id = escapeHtml(r.id);
      const action = escapeHtml(r.action); // free-text column — WR-01.
      const actor = escapeHtml(r.actorId); // free-text column — WR-01.
      const created = escapeHtml(r.createdAt.toISOString());
      const age = `${r.ageHours}h${r.aging ? " — AGING" : ""}`;
      return (
        `<tr><td>${id}</td><td>${action}</td><td>${actor}</td>` +
        `<td>${created}</td><td>${escapeHtml(age)}</td></tr>`
      );
    })
    .join("");

  const note = opts.truncated
    ? `<p>${opts.limit}+ unresolved — showing the ${opts.limit} newest.</p>`
    : "";

  return (
    `<p><strong>FitOut ops — unresolved money alerts</strong></p>` +
    `<p>${rows.length} unresolved <code>needs_attention</code> audit row(s), newest first. ` +
    `Look a row up with <code>npm run ops:alerts</code>; discharge it with ` +
    `<code>npm run ops:alerts:resolve -- &lt;audit-id&gt;</code>. Procedure: ` +
    `.planning/ops/NEEDS-ATTENTION-RUNBOOK.md</p>` +
    note +
    `<table border="1" cellpadding="4" cellspacing="0">` +
    `<tr><th>Audit id</th><th>Action</th><th>Actor</th><th>Created (UTC)</th><th>Age</th></tr>` +
    body +
    `</table>`
  );
}

/**
 * Send the digest to the single operator address. Never called with an empty `rows` — the caller returns
 * before reaching here on a zero-row day (D-J3Z-05), because a daily "all clear" is how an alert channel
 * gets filtered to trash.
 */
export const sendOpsAlertDigest = (
  to: string,
  rows: OpsDigestRow[],
  opts: { truncated: boolean; limit: number },
) =>
  send(
    to,
    `FitOut ops — ${rows.length} unresolved money alert(s)`,
    renderOpsAlertDigest(rows, opts),
  );
