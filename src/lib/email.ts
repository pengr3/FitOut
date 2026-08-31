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

// WR-01 — ONE escaper, two readers. `escapeHtml` was declared here; it now lives beside `renderEmail`
// in the shell, because both this module and the shell must escape with the SAME function or the
// guarantee is only as strong as whichever copy a given send happened to reach. A second
// implementation is the drift the move prevents; do not reintroduce one here.
//
// `renderOpsAlertDigest` below keeps its per-field calls exactly where they are: its output enters
// the shell through the one PRE-ESCAPED slot, which the renderer deliberately does not escape.
//
// EMAIL-01 — `renderEmail` is the ONE shell every send below composes. A sender states its message as
// an `EmailContent` (heading, paragraphs, one CTA) with RAW interpolations, and the renderer escapes
// every sink on the way into the HTML part while the plain-text twin keeps the raw strings. That is
// why the per-field `escapeHtml` locals that used to sit at the top of each sender are gone: escaping
// is now STRUCTURAL rather than remembered nineteen times. Do not reintroduce a local escape before
// handing a value to `renderEmail` — it would double-encode.
import { renderEmail, escapeHtml } from "@/lib/email-shell";

const key = process.env.RESEND_API_KEY;
const resend = key ? new Resend(key) : null;
const FROM = process.env.EMAIL_FROM ?? "FitOut <onboarding@resend.dev>";

async function send(to: string, subject: string, html: string, text: string) {
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
  const { error } = await resend.emails.send({ from: FROM, to, subject, html, text });
  if (error) console.error("resend error", error);
}

/**
 * `paragraphs: []` HERE AND IN `sendResetPassword` IS DELIBERATE, AND IT IS THE AUTHFB-01 BOUNDARY
 * WRITTEN IN CODE. The body that shipped was `Verify: <a href="…">…</a>` — a raw URL used as its own
 * visible label, which a shell button cannot carry. Replacing that with a labelled CTA is this
 * phase's ONE email copy change. Adding a sentence of explanation, an expiry line, or an "if you
 * didn't request this" line would be AUTHFB-01, which stays in the backlog by standing choice — the
 * shell making that work look near-free is not a licence to absorb it.
 *
 * The `url` goes in RAW. WR-01 still holds and holds more strictly: the shell escapes the href at the
 * one choke point, so no composition site can forget it. Escaping here as well would double-encode.
 */
export const sendVerificationEmail = (to: string, url: string) => {
  const { html, text } = renderEmail({
    heading: "Verify your email",
    paragraphs: [],
    cta: { label: "Verify email", href: url },
  });
  return send(to, "Verify your FitOut email", html, text);
};

export const sendResetPassword = (to: string, url: string) => {
  const { html, text } = renderEmail({
    heading: "Reset your password",
    paragraphs: [],
    cta: { label: "Reset password", href: url },
  });
  return send(to, "Reset your FitOut password", html, text);
};

// ---------------------------------------------------------------------------
// Lifecycle emails (D-66 — the first non-auth emails in the repo).
// ---------------------------------------------------------------------------
// The sole email transport for BOOK-06 and the request lifecycle: five thin sends, each mirroring the
// sendVerificationEmail shape (a heading + one body sentence + a single CTA) over the SAME send()
// helper above and the SAME shell — never a new email stack (D-66; React Email stays uninstalled,
// branding/retry hardening is Phase 7, WR-04).
//
// Contract discipline (06-UI-SPEC "Lifecycle email contract"):
//  - EVERY interpolated field — space title, booker label, quoted total, reference, CTA url — is
//    escaped before it enters the markup (WR-01 / T-06-06 tampering sink: a raw url in an href or a
//    raw title in HTML text is the injection vector). Since 15-03 that happens at the shell's ONE
//    choke point rather than in a local per sender: a sender hands `renderEmail` RAW strings and the
//    renderer escapes every sink. The rule is unchanged; what changed is that it can no longer be
//    forgotten at a composition site. Do NOT escape here as well — it would double-encode.
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
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * TRUST-02 AND TRUST-03 CLOSE HERE — the D-78 handoff the v1.1 audit found open
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * D-78 drew Phase 13's email boundary at the SHELL and handed these two CONTENT clauses to Phase 15,
 * which shipped the shell, the injection probe and the inbox walk and never executed the handoff.
 *
 *  · TRUST-02 — the reference rides the SUBJECT, not only the body. A booker hunting for a booking
 *    searches their inbox, and a mail client searches subjects first and collapses threads to them.
 *  · TRUST-03 — the cancellation policy is stated on the surface the booker KEEPS. A disclosure seen
 *    once at checkout is not one they can consult weeks later when deciding whether to cancel.
 *
 * ⚠ NOT ONE PERCENTAGE AND NOT ONE HOUR FIGURE IS TYPED IN THIS MODULE. `policyLabel` arrives FINISHED
 *   from `composePolicyEmailLine`, whose owner is `LADDER` — the same constant `quoteRefund` evaluates.
 *   Writing the sentence here instead would have made the emailed promise drift from the money math the
 *   first time a rung moved, and an email cannot be re-rendered after it is read.
 *
 * `policyLabel` is REQUIRED-AND-NULLABLE rather than optional, deliberately: there is exactly one call
 * site, so requiring it costs one line and buys a compiler census. The argument `DeadlineAnchorInput`
 * makes for `openCapacity` applies verbatim — an optional flag lets one surface silently keep rendering
 * the wrong thing and still typecheck. `null` means there is nothing to disclose (a null D-67 snapshot)
 * and the clause is OMITTED; an empty clause rendered as a clause is CR-01's disease.
 *
 * `renderEmail` and the shell are UNTOUCHED, and no send trigger is added, moved or removed — EMAIL-01,
 * EMAIL-02 and EMAIL-03 stay closed. The clause reaches both projections because the renderer projects
 * ONE `EmailContent` into html and text; there is no second body here to keep in sync.
 */
export const sendBookingConfirmed = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  reference: string,
  bookingUrl: string,
  policyLabel: string | null,
) => {
  // Two STATEMENTS, not one sentence: the booking fact, then the money terms. Concatenating the policy
  // onto the first line would bury the terms inside the confirmation a booker skims past.
  const paragraphs = [`You're booked at ${spaceTitle} on ${whenLabel}. Booking reference ${reference}.`];
  if (policyLabel !== null) paragraphs.push(policyLabel);

  const { html, text } = renderEmail({
    heading: "Booking confirmed",
    paragraphs,
    cta: { label: "View your booking", href: bookingUrl },
  });
  // The reference goes in RAW. The shell escapes every sink on the way into the HTML part, and a local
  // escape here would double-encode (WR-01 — one escaper, never a second copy).
  return send(to, `Your FitOut booking is confirmed — ${spaceTitle} (${reference})`, html, text);
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
  const { html, text } = renderEmail({
    heading: "Request sent",
    paragraphs: [
      `Your request to book ${spaceTitle} on ${whenLabel} is with the host. We'll let you know as soon as they respond. You haven't been charged — you'll only pay if the host approves.`,
    ],
    cta: { label: "View your request", href: bookingUrl },
  });
  return send(to, `We sent your request — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "Your request was approved",
    paragraphs: [
      `Good news — the host approved your booking for ${spaceTitle} on ${whenLabel}. Pay ${totalLabel} by ${payByLabel} to lock it in.`,
    ],
    cta: { label: "Pay now", href: payUrl },
  });
  return send(to, `Approved — pay to confirm ${spaceTitle}`, html, text);
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
  // The branch chooses the heading and the sentence, never two whole documents: the two wordings
  // differ by a heading and a paragraph, and building the shell twice would let them drift apart.
  const heading = opts?.expired ? "This request expired" : "This request wasn't available";
  const body = opts?.expired
    ? `Your request to book ${spaceTitle} for ${whenLabel} expired before the host responded. You haven't been charged.`
    : `Unfortunately the host couldn't take your booking for ${spaceTitle} on ${whenLabel}. You haven't been charged.`;
  const { html, text } = renderEmail({
    heading,
    paragraphs: [body],
    // The one CTA without a caller-supplied link — the APP_URL constant and its fallback are unmoved.
    cta: { label: "Find another space", href: `${APP_URL}/` },
  });
  return send(to, `Your request for ${spaceTitle} wasn't available`, html, text);
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
  const { html, text } = renderEmail({
    heading: "New booking request",
    paragraphs: [
      `${bookerLabel} requested ${spaceTitle} on ${whenLabel} for ${totalLabel}. Respond by ${respondByLabel} to approve or decline.`,
    ],
    cta: { label: "Review request", href: requestsUrl },
  });
  return send(to, `New booking request — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "A booking was cancelled",
    paragraphs: [
      `${bookerLabel} cancelled their booking at ${spaceTitle} on ${whenLabel}. That window is open for other guests again — nothing else is needed from you.`,
    ],
    cta: { label: "View the booking", href: bookingUrl },
  });
  return send(to, `Booking cancelled — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "The host cancelled this booking",
    paragraphs: [
      `We're sorry — the host cancelled your booking at ${spaceTitle} on ${whenLabel}. You're getting a full refund of ${refundLabel}, including the service fee.`,
    ],
    cta: { label: "View the booking", href: bookingUrl },
  });
  return send(to, `Your booking was cancelled — ${spaceTitle}`, html, text);
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
  // CR-01 — a null fee omits the sentence entirely rather than rendering a zero.
  const feeSentence =
    feeLabel === null ? "" : ` A ${feeLabel} cancellation fee will be deducted from your next payout.`;
  const { html, text } = renderEmail({
    heading: "You cancelled this booking",
    paragraphs: [
      `You cancelled the booking at ${spaceTitle} on ${whenLabel}. Your guest is being refunded ${refundLabel} in full, including the service fee.${feeSentence}`,
    ],
    cta: { label: "View your bookings", href: bookingUrl },
  });
  return send(to, `You cancelled a booking — ${spaceTitle}`, html, text);
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
 * THE CONSTANT NOW PASSES THROUGH THE SHELL'S ESCAPER, AND THAT WAS MEASURED RATHER THAN ASSUMED (15-03).
 * It used to be interpolated unescaped, deliberately: WR-01's rule is about caller-supplied FIELDS, and
 * this is a compile-time constant from this repository, in the same category as the literal prose beside
 * it. Under the shell the whole sentence is a `paragraphs` entry, which the renderer escapes — so the
 * question stopped being one of principle and became one of fact. The fact: the constant's literal value
 * is "Refunds to GCash and Maya are usually back within 24 hours; a card can take up to 30 days,
 * depending on your bank." It contains NONE of the five HTML-significant characters (`&`, `<`, `>`, `"`,
 * `'`), so `escapeHtml(value) === value` and the rendered sentence is byte-identical to the one that
 * shipped. If a future edit to that constant introduces one of those characters, the booker-facing
 * disclosure changes silently — a money-path disclosure contract is not a copy nit, so measure again.
 */
export const sendRefundIssued = (
  to: string,
  spaceTitle: string,
  whenLabel: string,
  refundLabel: string,
  bookingUrl: string,
) => {
  const { html, text } = renderEmail({
    heading: "Your refund is on its way",
    paragraphs: [
      `We've issued a refund of ${refundLabel} for your booking at ${spaceTitle} on ${whenLabel}. ${ALL_RAILS_REFUND_WINDOW}`,
    ],
    cta: { label: "View the booking", href: bookingUrl },
  });
  return send(to, `Refund on its way — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "Your approved booking is waiting",
    paragraphs: [
      `The host approved ${spaceTitle} on ${whenLabel}, and we're holding it until ${payByLabel}. Pay ${totalLabel} whenever you're ready to confirm it. You haven't been charged anything yet.`,
    ],
    cta: { label: "Pay now", href: payUrl },
  });
  return send(to, `Still holding your spot — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "Your session is coming up",
    paragraphs: [`A reminder that ${spaceTitle} is booked for ${whenLabel}.`],
    cta: { label: "View the booking", href: bookingUrl },
  });
  return send(to, `Coming up — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "A request is waiting for your answer",
    paragraphs: [
      `${bookerLabel} asked to book ${spaceTitle} on ${whenLabel}. Let them know by ${respondByLabel} — if you don't, we'll decline it for you and free the slot.`,
    ],
    cta: { label: "Review request", href: requestsUrl },
  });
  return send(to, `Still waiting on you — ${spaceTitle}`, html, text);
};

// ---------------------------------------------------------------------------
// Phase-8 group-RSVP sends (D-122). Same contract header as above — thin sends over the SAME send()
// helper and the SAME shell. Dispatched EXCLUSIVELY by `sendForType` in notify.ts (D-83). These reach
// ACCOUNT recipients only; the guest-with-email path is the separate `sendGuestRsvpEmail` (email-only fn,
// RESEARCH Pitfall 2). EVERY interpolated field — including the guest-typed attendee name — is escaped
// (G6 / T-08-08), at the shell's one choke point since 15-03 rather than in a local here; `groupUrl` is
// the caller's ABSOLUTE ${BETTER_AUTH_URL}/... link.

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
  const verdict = answer === "yes" ? "is coming" : "can't make it";
  // T-08-08 — `attendeeLabel` is guest-typed and goes in RAW; the shell escapes it with every other sink.
  const { html, text } = renderEmail({
    heading: "New RSVP for your group booking",
    paragraphs: [`${attendeeLabel} ${verdict} to ${spaceTitle} on ${whenLabel}.`],
    cta: { label: "View your group", href: groupUrl },
  });
  return send(to, `New RSVP — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "You're confirmed for the group",
    paragraphs: [
      `You're set for ${spaceTitle} on ${whenLabel}. The organizer has the booking covered — just show up.`,
    ],
    cta: { label: "View the details", href: groupUrl },
  });
  return send(to, `You're on the list — ${spaceTitle}`, html, text);
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
  const { html, text } = renderEmail({
    heading: "This group booking was cancelled",
    paragraphs: [
      `The booking at ${spaceTitle} on ${whenLabel} is no longer happening — you don't need to go.`,
    ],
    cta: { label: "View the details", href: groupUrl },
  });
  return send(to, `Group booking cancelled — ${spaceTitle}`, html, text);
};

// ---------------------------------------------------------------------------
// Phase-8 guest-with-email send (D-122 · GROUP-03/04 · RESEARCH Pitfall 2 / RESOLVED A2).
// ---------------------------------------------------------------------------
// A guest attendee RSVP'd via the invite link but has NO account — so NO durable `notification` row is ever
// written for them (notification.recipientId is a NOT NULL FK to user.id). This send is therefore dispatched
// by the SEPARATE email-only Inngest fn `fitout/guest-email` (src/inngest/functions/guest-email.ts), never
// by fitout/notify. It uses the SAME private send() helper and the SAME shell as every other send — the
// guest path needs no new integration, and the [email:dev] fallback logs locally when RESEND_API_KEY is unset.

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
 * label, and the invite href — is escaped (G6 / T-08-08), at the shell's one choke point since 15-03
 * rather than in a local here; the values below go in RAW. Returns a JSON-serializable result so it can
 * be the body of an Inngest `step.run`. Does NOT throw when RESEND_API_KEY is unset: `send` falls back to the
 * [email:dev] console log, so the guest path works in dev/test with no Resend key.
 */
export const sendGuestRsvpEmail = async (d: GuestRsvpEmail): Promise<{ sent: true }> => {
  // TWO `EmailContent` values, not one parameterised value. The cancelled variant is not a variant of
  // the confirmed one at the string level — different heading, different sentence, different subject —
  // and flattening them into one shape would quietly merge copy the spec pins separately.
  if (d.kind === "rsvp_confirmed") {
    const { html, text } = renderEmail({
      heading: "Your RSVP is confirmed",
      paragraphs: [
        `You're set for ${d.listingTitle} on ${d.whenLabel}. The organizer has the booking covered — just show up.`,
      ],
      cta: { label: "View the details", href: d.href },
    });
    await send(d.to, `You're on the list — ${d.listingTitle}`, html, text);
  } else {
    const { html, text } = renderEmail({
      heading: "This group booking was cancelled",
      paragraphs: [
        `The booking at ${d.listingTitle} on ${d.whenLabel} is no longer happening — you don't need to go.`,
      ],
      cta: { label: "View the details", href: d.href },
    });
    await send(d.to, `Group booking cancelled — ${d.listingTitle}`, html, text);
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
//
// AND HERE — UNIQUELY IN THIS FILE — THE ESCAPING IS LOCAL RATHER THAN AT THE CHOKE POINT. Every other
// sender hands `renderEmail` raw strings and the shell escapes them. This one's body is a data TABLE, so it
// enters through `EmailContent.tableHtml`, the single slot the renderer inserts RAW because its producer
// owns its own escaping. That is why the per-field `escapeHtml` calls below are the last ones left in this
// module, and why deleting one is not a tidy-up: it re-opens the sink the choke point exists to close.

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
 * handed to Resend.
 *
 * ⚠ THAT SENTENCE WAS ASPIRATIONAL UNTIL 15-04 — zero test files imported this function, and the sentinel
 * was only ever read off a captured send. `tests/ops/alert-digest.test.ts` now carries a direct-read case
 * BESIDE its transport-level one, and the two are complementary rather than redundant: the direct read pins
 * the string where it is built, the transport read proves the send actually carries what was built.
 *
 * Aging rows carry a plain-text `— AGING` marker; never colour alone. It is carried in BOTH projections,
 * because the operator most likely to be reading this at 08:50 is reading it on a phone.
 *
 * `opts.truncated` states an honest "N+ unresolved — showing the N newest" line (D-J3Z-09) instead of
 * silently rendering a partial list as though it were the whole queue.
 *
 * ── UNDER THE SHELL SINCE 15-04, AND THE TABLE IS THE ONE PRE-ESCAPED SLOT ───────────────────────────
 *
 * Returns `{ html, text }` from `renderEmail`, like the other eighteen sends. What differs is the body:
 * this one is a DATA TABLE, so it enters through `EmailContent.tableHtml` — the single field the renderer
 * inserts RAW — with a matching `tableText` so the plain-text twin does not silently lose the content.
 * Both projections come out of ONE map over `rows`, so a column added to the HTML cannot go missing from
 * the text. The per-field `escapeHtml` calls stay exactly where they are; see the block header above.
 *
 * Renders NO CTA. The focal point of an operator digest is the table, and a button here would put an
 * absolute URL in a document whose whole job is to be looked up locally.
 *
 * ── ONE STATED FORMATTING CHANGE (15-04), RECORDED RATHER THAN SLIPPED IN ────────────────────────────
 *
 * The runbook paragraph used to wrap its command strings in `<code>` elements and pre-escape the
 * angle-bracketed placeholder by hand. Paragraphs are escaped at the choke point now, so a `<code>`
 * element inside one would reach the operator as visible tag text. The wrappers are gone and the commands
 * are carried as plain text, with the placeholder written in its RAW angle-bracketed form (the renderer
 * escapes it back for the HTML part, and `text/plain` shows it correctly). Every command string is
 * byte-identical. An operator email that reads its commands as plain text is the same house style as the
 * `— AGING` marker.
 *
 * ── THE TABLE'S BORDER IS AN ATTRIBUTE, NOT A COLOUR (15-04) ─────────────────────────────────────────
 *
 * `border="1"` is unchanged from the shipped table, and no colour value is typed here. The alternative —
 * reading the rule token out of the generated token module in THIS file — would put a second palette
 * reader outside the shell and resolve it against a theme this function is never told, which is precisely
 * the drift EMAIL-02 exists to end. If this table ever wants a coloured rule, the honest change is on the
 * shell side: the renderer knows the theme, this function does not.
 */
export function renderOpsAlertDigest(
  rows: OpsDigestRow[],
  opts: { truncated: boolean; limit: number },
): { html: string; text: string } {
  // ONE map, two projections. A field added to the row below lands in both or in neither.
  const cells = rows.map((r) => {
    const age = `${r.ageHours}h${r.aging ? " — AGING" : ""}`;
    const created = r.createdAt.toISOString();
    return {
      html:
        `<tr><td>${escapeHtml(r.id)}</td>` +
        `<td>${escapeHtml(r.action)}</td>` + // free-text column — WR-01.
        `<td>${escapeHtml(r.actorId)}</td>` + // free-text column — WR-01.
        `<td>${escapeHtml(created)}</td><td>${escapeHtml(age)}</td></tr>`,
      // The plain-text twin takes the RAW strings — escaping `text/plain` would be the defect, not the fix.
      text: `${r.id} | ${r.action} | ${r.actorId} | ${created} | ${age}`,
    };
  });

  const tableHtml =
    `<table border="1" cellpadding="4" cellspacing="0">` +
    `<tr><th>Audit id</th><th>Action</th><th>Actor</th><th>Created (UTC)</th><th>Age</th></tr>` +
    cells.map((c) => c.html).join("") +
    `</table>`;

  const tableText = ["Audit id | Action | Actor | Created (UTC) | Age", ...cells.map((c) => c.text)].join(
    "\n",
  );

  const paragraphs = [
    `${rows.length} unresolved needs_attention audit row(s), newest first. ` +
      `Look a row up with npm run ops:alerts; discharge it with ` +
      `npm run ops:alerts:resolve -- <audit-id>. Procedure: .planning/ops/NEEDS-ATTENTION-RUNBOOK.md`,
  ];
  if (opts.truncated) {
    paragraphs.push(`${opts.limit}+ unresolved — showing the ${opts.limit} newest.`);
  }

  return renderEmail({
    heading: "FitOut ops — unresolved money alerts",
    paragraphs,
    tableHtml,
    tableText,
  });
}

/**
 * Send the digest to the single operator address. Never called with an empty `rows` — the caller returns
 * before reaching here on a zero-row day (D-J3Z-05), because a daily "all clear" is how an alert channel
 * gets filtered to trash.
 *
 * THE NINETEENTH AND LAST SENDER TO ADOPT THE SHELL (15-04). Its signature, its subject template literal,
 * its single call site and the conditions under which it fires are byte-identical. What changed is that
 * the plain-text part is now the REAL twin of the table: 15-03 had to pass a fourth argument the moment
 * `send` required one, and it passed the subject line restated rather than invent operator copy that
 * belonged to this plan. That interim is gone.
 */
export const sendOpsAlertDigest = (
  to: string,
  rows: OpsDigestRow[],
  opts: { truncated: boolean; limit: number },
) => {
  const { html, text } = renderOpsAlertDigest(rows, opts);
  return send(to, `FitOut ops — ${rows.length} unresolved money alert(s)`, html, text);
};
