// Cancellation input validation (Zod 4). Clones the src/lib/validation/booking.ts contract: one schema owns
// the shape, and the shape is re-validated server-side at the point the durable write happens; nothing
// upstream is trusted.
//
// THE LOAD-BEARING RULE, AND THE REASON THIS FILE IS THREE LINES LONG: for a cancel, the client sends ONLY
// a booking id. The refund AMOUNT, the cancellation TIER, and the RUNG that tier awards are ALL derived
// server-side from the booking's own frozen snapshot — `booking.cancellation_policy` (the D-67 creation-time
// tier), `booking.space_price_cents` and `booking.service_fee_cents` (the D-74 frozen split) — evaluated
// against the Postgres clock.
//
// A client-supplied refund figure is the primary tampering vector for this surface (T-07-47): it is the one
// field an attacker would most like to control, and a schema that accepted it would make the server's
// recompute a formality that some future refactor could quietly skip. So there is DELIBERATELY no field to
// supply one — not an ignored field, not an optional field, no field.
//
// ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). A whole-file grep asserts that no money field name
// appears here at all. A grep is only a real guard if the very comment forbidding a string cannot trip it,
// so the forbidden names are NOT spelled out: they are any field carrying an amount, a tier, or a rung.
// If you are about to add one, the answer is no — read it off the booking row instead.

import { z } from "zod";

/** The entire cancel payload. One field, by design — see the header. */
export const cancellationSchema = z.object({
  bookingId: z.string().min(1),
});

export type CancellationInput = z.infer<typeof cancellationSchema>;

/**
 * The five HOST cancellation reasons (D-70 / 07-UI-SPEC § 4). The host path carries ONE more field than the
 * booker path, and it is not theatrical: D-70 requires an audit record against the host, the value is written
 * to `booking.decline_reason`, and the notification composer reads it. It is still not a money field — the
 * fee and the refund are both derived server-side exactly as the booker path derives its quote, so the
 * tripwire above holds unchanged.
 *
 * A closed union, not free text: an open string would be an unbounded value landing in an audit row and a
 * durable column, and the UI only ever offers these five.
 */
export const hostCancelReasons = [
  "space_unavailable",
  "double_booked",
  "maintenance",
  "guest_requested",
  "other",
] as const;

export const hostCancellationSchema = z.object({
  bookingId: z.string().min(1),
  reason: z.enum(hostCancelReasons),
});

export type HostCancellationInput = z.infer<typeof hostCancellationSchema>;
