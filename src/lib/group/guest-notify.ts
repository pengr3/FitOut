// The guest-email EMITTER (D-117/D-122) — the `fitout/guest-email` sibling of `notifications.ts:emitNotify`.
//
// WHY THIS MODULE EXISTS AT ALL, and it is not cosmetic: the Inngest FUNCTION
// (src/inngest/functions/guest-email.ts) calls `inngest.createFunction(...)` at MODULE SCOPE. Importing it
// from a server action — which is what naming its exported event constant would require — drags that
// registration into the action's module graph and executes it on every import of the action. This mirrors
// exactly how `NOTIFY_EVENT` and `emitNotify` live in `src/lib/notifications.ts` (the service) and NOT in
// `src/inngest/functions/notify.ts` (the function): the emit side is a plain, isomorphic lib module; the
// function file is the consumer of the name, never its owner.
//
// Pure/isomorphic: no "use client"/"use server" directive, so server actions, RSCs and the Inngest
// functions can all import it. `GuestRsvpEmail` is a TYPE-only import so nothing here pulls the Resend
// client into a caller's bundle.
//
// ⚠️ THE SAME TWO RULES `emitNotify` CARRIES APPLY HERE, for the same reasons:
//   1. CALL AFTER THE WRITE HAS COMMITTED, NEVER INSIDE A TRANSACTION. `inngest.send` is an outbound HTTP
//      call: inside a transaction it pins a pooled connection across a network hop, and a ROLLBACK would
//      leave an email already queued for an RSVP the database never recorded.
//   2. IT SWALLOWS ITS OWN TRANSPORT ERRORS. A guest confirmation is an amplifier of a seat that has
//      already been claimed, never a precondition for it — an RSVP must not fail because a queue blinked.
//
// PRIVACY (T-07-38 / T-08-09). The failure log records NOTHING about the recipient — not the address, not
// the error object, which can echo the payload straight back. The same discipline as the D-72 refund
// transfer catch in cancel-booking.ts, and the reason `guestEmailOnFailure` records only the kind.

import { inngest } from "@/inngest/client";
import type { GuestRsvpEmail } from "@/lib/email";

/** The Inngest event name. One name, one email-only function (the guest sibling of NOTIFY_EVENT). */
export const GUEST_EMAIL_EVENT = "fitout/guest-email" as const;

/**
 * Queue one guest-facing RSVP email. The CALLER owns the D-117 opt-in decision (only ever an address that
 * actively submitted an RSVP on the link) and the anti-spam rate limit — this function is the transport, so
 * that the policy lives at the one site that can see the request that justified the send.
 */
export async function emitGuestEmail(data: GuestRsvpEmail): Promise<void> {
  try {
    await inngest.send({ name: GUEST_EMAIL_EVENT, data });
  } catch {
    // No address, no error object — see the privacy note above.
    console.error("[guest-email] enqueue_failed", { kind: data.kind });
  }
}
