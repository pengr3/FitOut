// Notification payload validation (Zod 4) — the SINGLE write-boundary guard for the D-86 notification
// table. Clones the src/lib/validation/booking.ts contract: one schema owns the shape, and the shape is
// re-validated server-side at the point the durable row is written; nothing upstream is trusted.
//
// TWO GUARANTEES, DELIBERATELY STACKED — they are not redundant:
//   - COMPILE TIME: `NotificationPayload` (schema.ts) is a TS discriminated union, so the dropdown
//     renderer's exhaustive switch fails to compile when a `notification_type` value is added without a
//     branch. A missing case is a BUILD ERROR, never a blank row in someone's notification list.
//   - RUN TIME: this Zod mirror runs at `insertNotification`, so a payload that crossed the Inngest event
//     boundary (a network hop, JSON, and therefore fully outside TypeScript's reach) can never reach the
//     DB malformed. `event.data` arrives as `unknown` no matter what the emitter's types claimed.
// The `_PayloadUnionParity` assertion at the bottom makes the two unions provably the same set, so the
// runtime guard can never silently drift from the compile-time one.
//
// EVERY FIELD IS A PRE-COMPOSED DISPLAY STRING (D-86 / T-07-04): no ids to join at read time, no email
// addresses, no payment ids, no bank details, and no raw Dates — the caller composes the venue-local
// label with `composeWhenLabel` before it ever gets here.

import { z } from "zod";

import type { NotificationPayload } from "@/lib/db/schema";

/** The 20 `notification_type` enum values, as a literal tuple (mirrors schema.ts `notificationType`). */
export const notificationTypeValues = [
  "booking_confirmed",
  "request_received",
  "request_approved",
  "request_declined",
  "new_request_to_host",
  "booking_cancelled_by_booker",
  "booking_cancelled_by_host",
  "refund_issued",
  "reminder_pre_expiry",
  "reminder_pre_session",
  "reminder_pre_sla",
  // Phase-8 group RSVP kinds (D-122) — account recipients only (guests go through fitout/guest-email).
  "group_rsvp_received",
  "group_rsvp_confirmed",
  "group_cancelled",
  // Phase-18 OPS-05 kinds (D-245) — the host's STANDING rather than a booking. Added to the live enum
  // by drizzle/0028, which does nothing but ADD VALUE (PG 55P04).
  "listing_review_approved",
  "listing_review_rejected",
  "host_verification_approved",
  "host_verification_rejected",
  "host_suspended",
  // ENF-03's ops-cancellation copy — one type, two audiences, on the `side` discriminant.
  "booking_cancelled_by_ops",
] as const;

export type NotificationTypeValue = (typeof notificationTypeValues)[number];

/**
 * Every payload field is a rendered display string. `.max(200)` is a storage/abuse bound, not a design
 * constraint: a listing title is user-controlled (T-07-36) and a notification row is retained forever, so
 * an unbounded string is an unbounded row. `.min(1)` keeps an empty label out — a notification that renders
 * as a blank line is indistinguishable from a broken one.
 */
const label = z.string().min(1).max(200);

/**
 * A COMPOSED SENTENCE, not a label — the Phase-18 OPS-05 bound (D-245).
 *
 * ⚠ `label`'s 200 IS TOO SMALL FOR THESE, AND THE ARITHMETIC IS THE REASON RATHER THAN A PREFERENCE.
 * `reasonText` is what `composeReason` (src/lib/validation/ops.ts) built: a taxonomy sentence — the
 * longest is 57 characters — plus a space plus an operator note bounded at `REJECT_NOTE_MAX` = 280.
 * That is 338 characters of a value an operator legitimately typed, so a 200-character bound would
 * make `insertNotification` THROW on a perfectly valid rejection, burn four Inngest retries, and land
 * a `needs_attention` row — for the one notification whose whole purpose is to be delivered.
 *
 * 400 leaves headroom over that 338 without becoming a document. The REAL bound on the operator's text
 * is enforced upstream at the write boundary, where it belongs; this is the storage/abuse ceiling the
 * `label` comment above describes, sized for the field it actually holds.
 */
const sentence = z.string().min(1).max(400);

/**
 * The CTA target. Bounded like a label, but additionally required to be a same-origin absolute path or an
 * http(s) URL (T-07-36). `escapeHtml` in email.ts stops attribute BREAKOUT; it does not stop a
 * `javascript:` or `data:` scheme, which survives escaping intact and is a live XSS sink the moment the
 * dropdown renders it as an anchor. The scheme has to be rejected here, at the write boundary, because
 * this row is durable and will be rendered by surfaces that have not been written yet.
 */
const href = z
  .string()
  .min(1)
  .max(500)
  .refine((v) => v.startsWith("/") || v.startsWith("https://") || v.startsWith("http://"), {
    message: "href must be a root-relative path or an http(s) URL.",
  });

/**
 * The runtime mirror of `NotificationPayload`, keyed on the same `type` discriminant as the TS union and
 * the `notification_type` pgEnum. One member per enum value — all 20, exhaustively.
 */
export const notificationPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("booking_confirmed"),
    listingTitle: label,
    whenLabel: label,
    totalLabel: label,
    referenceLabel: label,
    // TRUST-03 (D-RPT-01): the pre-composed cancellation-policy sentence. Optional because ABSENT is a
    // real state — a null D-67 snapshot has nothing to disclose — and `label`-bounded like every other
    // display string, so a 200-char cap applies to the durable row.
    policyLabel: label.optional(),
    href,
  }),
  z.object({
    type: z.literal("request_received"),
    listingTitle: label,
    whenLabel: label,
    totalLabel: label,
    href,
  }),
  z.object({
    type: z.literal("request_approved"),
    listingTitle: label,
    whenLabel: label,
    totalLabel: label,
    payByLabel: label,
    href,
  }),
  z.object({
    type: z.literal("request_declined"),
    listingTitle: label,
    whenLabel: label,
    reasonLabel: label.optional(),
    // Copy variant, not a label — see the field comment on schema.ts NotificationPayload.
    expired: z.boolean(),
    href,
  }),
  z.object({
    type: z.literal("new_request_to_host"),
    listingTitle: label,
    whenLabel: label,
    bookerLabel: label,
    totalLabel: label,
    respondByLabel: label,
    href,
  }),
  z.object({
    type: z.literal("booking_cancelled_by_booker"),
    listingTitle: label,
    whenLabel: label,
    bookerLabel: label,
    href,
  }),
  z.object({
    type: z.literal("booking_cancelled_by_host"),
    listingTitle: label,
    whenLabel: label,
    refundLabel: label,
    // WR-04 (07-17): the audience discriminant — required at the write boundary so every NEW row
    // declares who its copy addresses. Durable pre-07-17 rows (written before this field existed) are
    // never re-validated; renderers treat a missing side as booker.
    side: z.enum(["booker", "host"]),
    // Host-side only, and only when the charged fee > 0 (a "₱0 fee" would be CR-01's disease anew).
    feeLabel: label.optional(),
    href,
  }),
  z.object({
    type: z.literal("refund_issued"),
    listingTitle: label,
    whenLabel: label,
    refundLabel: label,
    href,
  }),
  z.object({
    type: z.literal("reminder_pre_expiry"),
    listingTitle: label,
    whenLabel: label,
    totalLabel: label,
    payByLabel: label,
    href,
  }),
  z.object({
    type: z.literal("reminder_pre_session"),
    listingTitle: label,
    whenLabel: label,
    href,
  }),
  z.object({
    type: z.literal("reminder_pre_sla"),
    listingTitle: label,
    whenLabel: label,
    bookerLabel: label,
    respondByLabel: label,
    href,
  }),
  // ── Phase-8 group RSVP kinds (D-122). Account recipients only; the _PayloadUnionParity weld below breaks
  //    the build if these drift from schema.ts's NotificationPayload.
  z.object({
    type: z.literal("group_rsvp_received"),
    listingTitle: label,
    whenLabel: label,
    attendeeLabel: label,
    // Copy variant, not a label — see the field comment on schema.ts NotificationPayload.
    answer: z.enum(["yes", "no"]),
    href,
  }),
  z.object({
    type: z.literal("group_rsvp_confirmed"),
    listingTitle: label,
    whenLabel: label,
    href,
  }),
  z.object({
    type: z.literal("group_cancelled"),
    listingTitle: label,
    whenLabel: label,
    href,
  }),
  // ── Phase-18 OPS-05 kinds (D-245). THE COPY IS THE PAYLOAD — see the long note on schema.ts's
  //    `NotificationPayload` for why these store composed sentences where every other kind stores data.
  //    Bounded by `sentence` (400) rather than `label` (200) because `reasonText` legitimately reaches
  //    338 characters; see the `sentence` declaration above for the arithmetic.
  z.object({
    type: z.literal("listing_review_approved"),
    heading: sentence,
    lead: sentence,
    ctaLabel: label,
    href,
  }),
  z.object({
    type: z.literal("listing_review_rejected"),
    heading: sentence,
    lead: sentence,
    reasonText: sentence,
    tail: sentence,
    ctaLabel: label,
    href,
  }),
  z.object({
    type: z.literal("host_verification_approved"),
    heading: sentence,
    lead: sentence,
    ctaLabel: label,
    href,
  }),
  z.object({
    type: z.literal("host_verification_rejected"),
    heading: sentence,
    lead: sentence,
    reasonText: sentence,
    tail: sentence,
    ctaLabel: label,
    href,
  }),
  z.object({
    type: z.literal("host_suspended"),
    heading: sentence,
    // OPTIONAL, and ABSENT on every write: 18-UI-SPEC § Telling the host opens this body with the
    // operator's own sentence. Declared so the shared body composer has one total shape to join.
    lead: sentence.optional(),
    reasonText: sentence,
    tail: sentence,
    ctaLabel: label,
    href,
  }),
  z.object({
    type: z.literal("booking_cancelled_by_ops"),
    heading: sentence,
    lead: sentence,
    // WR-04's audience discriminant, on a new type. Required at the write boundary — there are no
    // durable pre-existing rows of this kind, so unlike `booking_cancelled_by_host` there is no
    // backward-compatible missing-`side` case to tolerate.
    side: z.enum(["booker", "host"]),
    ctaLabel: label,
    href,
  }),
]);

/**
 * The full `fitout/notify` event body, exactly as it travels on the wire under `data`.
 *
 * `recipientId` and `email` are resolved by the EMITTING action from an already-owner-gated row — they are
 * never client-supplied (T-07-38). Both `bookingId` and `email` are nullable: not every notification is
 * booking-scoped, and a recipient without a usable address still gets the durable in-app row (the email
 * step no-ops rather than failing — D-91's "the DB write is the thing that always lands").
 *
 * The object-level refine is the load-bearing bit: `type` is stored in the indexed `notification.type`
 * COLUMN while `payload.type` is the jsonb discriminant the renderer switches on. If those two disagree,
 * a row filters as one kind and renders as another — a silent, permanent inconsistency in durable history.
 * They are checked equal once, here, rather than trusted to stay in sync at twenty future call sites.
 */
export const notifyEventSchema = z
  .object({
    type: z.enum(notificationTypeValues),
    recipientId: z.string().min(1).max(128),
    bookingId: z.string().min(1).max(128).nullable(),
    email: z.email().nullable(),
    payload: notificationPayloadSchema,
  })
  .refine((v) => v.type === v.payload.type, {
    message: "notification type must match payload.type (the column and the jsonb discriminant must agree).",
    path: ["payload", "type"],
  });

// ---------------------------------------------------------------------------
// Compile-time parity between the Zod union and the TS union.
// ---------------------------------------------------------------------------
// Without this, the two unions are two hand-maintained lists that LOOK synchronised. Adding a field to
// schema.ts's NotificationPayload and forgetting it here would compile, pass lint, and then strip that
// field at the write boundary — the value would simply vanish on its way into jsonb, with no error
// anywhere. `Equals` is the invariant-position trick (mutually assignable, not merely one-way `extends`),
// so a field added on EITHER side and missing on the other is a type error on this line.
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Assert<T extends true> = T;
export type _PayloadUnionParity = Assert<
  Equals<z.infer<typeof notificationPayloadSchema>, NotificationPayload>
>;
