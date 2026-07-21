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

/** The 11 `notification_type` enum values, as a literal tuple (mirrors schema.ts `notificationType`). */
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
 * the `notification_type` pgEnum. One member per enum value — all 11, exhaustively.
 */
export const notificationPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("booking_confirmed"),
    listingTitle: label,
    whenLabel: label,
    totalLabel: label,
    referenceLabel: label,
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
 * They are checked equal once, here, rather than trusted to stay in sync at eleven future call sites.
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
