// The `fitout/guest-email` fan-out (GROUP-03/GROUP-04 · D-122 · RESEARCH Pitfall 2 / RESOLVED A2) — the
// email-only sibling of `fitout/notify`, and the SINGLE most important structural finding of Phase 8.
//
// WHY A SECOND FUNCTION AT ALL. A group attendee can RSVP through the invite link WITHOUT a FitOut account
// (GROUP-03). `notification.recipientId` is `text().notNull().references(user.id)` and the durable-row
// insert helper ALWAYS writes a row first — so routing a guest-with-email confirmation through
// `fitout/notify` would fail the recipientId FK, throw inside the Inngest step, burn four retries, and
// finally raise a `needs_attention` audit no operator can act on (the FK crash loop, T-08-11). The remedy
// (RESOLVED A2) is this: a separate function that clones the D-83 retry/`onFailure` reliability envelope but
// has ONLY a send-email step and writes NO durable row. The absence of that durable-row step is the
// DEFINING property of this path — it is what makes a guest (no user.id) reachable at all.
//
// WHAT DOES NOT LIVE HERE. The EMIT site — the opt-in guard (D-117: only an address that actively submitted
// an RSVP on the link is ever emailed; a blank-email guest gets NO send) and its rate-limit — is wired by
// 08-06 AFTER the seat-claim commits, exactly as `emitNotify` is called after a booking commit. This file
// is the transport, not the policy.
//
// PRIVACY. `onFailure` records a `needs_attention` audit so a permanently-failed guest send is never
// invisible (the WR-04 lesson), but it records the KIND and the reason ONLY — NEVER the guest's email
// address (T-07-38 / T-08-09: an alert must not become the leak). The address appears in no log line here.

import { inngest } from "@/inngest/client";
import { recordAudit } from "@/lib/audit";
import { sendGuestRsvpEmail, type GuestRsvpEmail } from "@/lib/email";

/** The Inngest event name. One name, one email-only function (the guest sibling of NOTIFY_EVENT). */
export const GUEST_EMAIL_EVENT = "fitout/guest-email" as const;

/**
 * The shape Inngest hands `onFailure`, read defensively. Bound to the `inngest/function.failed` SYSTEM
 * event, so the failed run's original event is nested one level down at `event.data.event`. Everything is
 * optional because this is the last line of defence and must not itself throw on an unexpected shape.
 */
export type GuestEmailFailureArgs = {
  error: { message?: string };
  event: { data?: { event?: { data?: Partial<GuestRsvpEmail> } } };
};

/**
 * The permanent-failure sink (D-90 envelope, cloned from notify.ts). Fires ONLY after all retries are
 * exhausted. Records the KIND and the error message — and DELIBERATELY NOT `to`: the guest's email address
 * must never reach an audit entry or a log line (T-07-38 / T-08-09). Exported so the test can invoke it
 * directly rather than driving the Inngest runtime to exhaustion.
 */
export async function guestEmailOnFailure(args: GuestEmailFailureArgs): Promise<void> {
  const original = args.event?.data?.event?.data;
  const message = args.error?.message ?? "unknown error";
  await recordAudit({
    actorId: "system",
    action: "guest-email",
    outcome: "needs_attention",
    meta: {
      // NEVER the guest address (T-07-38 / T-08-09). Only the kind + the reason survive.
      guestEmailKind: original?.kind ?? null,
      error: message,
    },
  });
  console.error("[guest-email-alert] permanently failed", { error: message });
}

// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the trigger lives in
// options.triggers. Cloned from notify.ts, not from the web.
export const guestEmail = inngest.createFunction(
  {
    id: "guest-email",
    // Same explicit retry budget as `notify` — the number of attempts before D-90's needs_attention row is
    // written is a policy decision, stated rather than inherited as a default.
    retries: 4,
    triggers: [{ event: GUEST_EMAIL_EVENT }],
    onFailure: async ({ error, event }) => {
      await guestEmailOnFailure({
        error: error as { message?: string },
        event: event as GuestEmailFailureArgs["event"],
      });
    },
  },
  async ({ event, step }) => {
    const data = event.data as GuestRsvpEmail;
    // ONLY a send-email step. There is NO durable-row step — a guest has no user.id, so there is no
    // durable row to write; that absence is the whole reason this function exists (RESEARCH Pitfall 2).
    return await step.run("send-email", () => sendGuestRsvpEmail(data));
  },
);
