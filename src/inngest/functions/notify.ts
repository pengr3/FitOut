// The `fitout/notify` fan-out (MANAGE-03 · D-83/D-90/D-91) — the FOURTH Inngest function in the codebase
// and the FIRST that is event-triggered rather than a cron. It is the single thing that turns "something
// happened to a booking" into the two channels a human actually sees.
//
// WHY THIS EXISTS AT ALL. Before D-83 every lifecycle email was `void sendXxx(...)` at the call site: no
// retry, no backoff, no record, and a rejected promise swallowed into an unhandled rejection. That is what
// left WR-04 open since Phase 2 — a failed send was not merely unreliable, it was INVISIBLE. Moving the
// send behind Inngest buys retry and per-run observability; `onFailure` closes the last hole by making
// permanent failure leave a mark instead of nothing.
//
// THE TWO STEPS AND THEIR ORDER (D-91) — this is the design, not an implementation detail:
//   1. `write-notification` — the durable in-app row. FIRST, because a local DB write is faster and far
//      more reliable than an SMTP hop across the internet. The row is the thing that always lands.
//   2. `send-email` — the best-effort amplifier. SECOND, in its OWN step, therefore with its OWN retries.
//      When Inngest retries the run, step (1) is MEMOIZED and does not re-execute, so an email retry can
//      never produce a second notification row. That memoization is precisely what makes D-91's
//      two-channel parity hold without a dedupe key, a TTL, or an application-level "already sent?" check.
// Reversed, a permanently-failing email would leave NO record at all — the user would be told nothing and
// we would know nothing. The ordering is the reliability guarantee.
//
// WHAT THIS FUNCTION DOES NOT DO. It never decides WHETHER something is worth notifying about — the
// emitting action decided that when it called `emitNotify` after its commit. It never derives state from
// the database. It reads its whole input off the event, which is why the payload carries pre-composed
// display strings (D-86): a notification must render the same tomorrow as it did today, even if the
// listing has since been retitled or the booking has moved on.

import { inngest } from "@/inngest/client";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import type { NotificationPayload } from "@/lib/db/schema";
import {
  NOTIFY_EVENT,
  insertNotification,
  type NotifyEvent,
} from "@/lib/notifications";
import {
  sendBookingConfirmed,
  sendBookingCancelledByBooker,
  sendBookingCancelledByHost,
  sendNewRequestToHost,
  sendRefundIssued,
  sendReminderPreExpiry,
  sendReminderPreSession,
  sendReminderPreSla,
  sendRequestApproved,
  sendRequestDeclined,
  sendRequestReceived,
} from "@/lib/email";

/** The per-step outcome, JSON-serializable across the Inngest step boundary (the request-expiry idiom). */
export type SendForTypeResult = { sent: boolean; reason?: "no_email" };

/**
 * Dispatch one notification to its email template.
 *
 * EXHAUSTIVE BY CONSTRUCTION, WITH NO `default` CLAUSE. The `never` assignment after the switch is the
 * whole point: add a value to the `notification_type` enum without mapping it here and `payload` is no
 * longer `never` at that line, so the BUILD fails. A fallback clause would have turned that into a silent
 * runtime no-op — a notification type that quietly emails nobody, forever, with a green test suite.
 *
 * Switches on `payload.type` rather than the top-level `type` because only the former narrows the payload
 * union; `notifyEventSchema` refines the two to be equal, so they cannot disagree.
 *
 * A null `email` returns EARLY and does not throw. A recipient without a usable address is a normal state,
 * not a failure: the durable in-app row has already been written by step (1) and that is the channel that
 * matters. Throwing here would burn four retries and then raise a `needs_attention` alert about a
 * condition no operator can act on, drowning the real alerts.
 */
export async function sendForType(event: NotifyEvent): Promise<SendForTypeResult> {
  const to = event.email;
  if (to === null) return { sent: false, reason: "no_email" };

  const payload = event.payload;
  switch (payload.type) {
    case "booking_confirmed":
      await sendBookingConfirmed(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.referenceLabel,
        payload.href,
      );
      return { sent: true };

    case "request_received":
      await sendRequestReceived(to, payload.listingTitle, payload.whenLabel, payload.href);
      return { sent: true };

    case "request_approved":
      await sendRequestApproved(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.totalLabel,
        payload.href,
      );
      return { sent: true };

    case "request_declined":
      await sendRequestDeclined(to, payload.listingTitle, payload.whenLabel, {
        expired: payload.expired,
      });
      return { sent: true };

    case "new_request_to_host":
      await sendNewRequestToHost(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.bookerLabel,
        payload.totalLabel,
        payload.href,
      );
      return { sent: true };

    case "booking_cancelled_by_booker":
      await sendBookingCancelledByBooker(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.bookerLabel,
        payload.href,
      );
      return { sent: true };

    case "booking_cancelled_by_host":
      await sendBookingCancelledByHost(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.refundLabel,
        payload.href,
      );
      return { sent: true };

    case "refund_issued":
      await sendRefundIssued(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.refundLabel,
        payload.href,
      );
      return { sent: true };

    case "reminder_pre_expiry":
      await sendReminderPreExpiry(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.totalLabel,
        payload.payByLabel,
        payload.href,
      );
      return { sent: true };

    case "reminder_pre_session":
      await sendReminderPreSession(to, payload.listingTitle, payload.whenLabel, payload.href);
      return { sent: true };

    case "reminder_pre_sla":
      await sendReminderPreSla(
        to,
        payload.listingTitle,
        payload.whenLabel,
        payload.bookerLabel,
        payload.respondByLabel,
        payload.href,
      );
      return { sent: true };
  }

  // Unreachable while the switch is exhaustive. A new notification_type without a branch above makes
  // `payload` non-never HERE, which is a compile error — see the doc comment.
  const unhandled: never = payload;
  throw new Error(
    `[notify] unhandled notification type: ${(unhandled as NotificationPayload).type}`,
  );
}

/**
 * The shape Inngest hands `onFailure`. It is implemented as a separate internal function bound to the
 * `inngest/function.failed` SYSTEM event, so the failed run's original event is nested one level down at
 * `event.data.event` (and the failed run's id is `event.data.run_id`, NOT the top-level `runId`).
 * Everything is optional here because this is a system-event body being read defensively — the audit row
 * is the last line of defence and must not itself throw on an unexpected shape.
 */
export type NotifyFailureArgs = {
  error: { message?: string };
  event: { data?: { event?: { data?: Partial<NotifyEvent> } } };
};

/**
 * D-90 — the permanent-failure sink. Fires ONLY after all retries are exhausted.
 *
 * `recordAudit` with `outcome: "needs_attention"` is the SAME operator-alert channel already used for
 * unrefundable-rail payments and failed auto-refunds (webhook/route.ts) and for failed payouts. Using it
 * again is deliberate: D-90 explicitly does NOT create an admin surface — FitOut has none today, and
 * building the first one is its own scope. What WR-04 actually requires is that a permanently-failed send
 * stops being invisible, which one audit row plus Inngest's own run history satisfies.
 *
 * Exported so the test can invoke it directly rather than driving the Inngest runtime to exhaustion.
 *
 * Logs and audits the TYPE and the ids only — never the payload (user-controlled display strings) and
 * never the recipient's email address (T-07-38: an alert must not become the leak).
 */
export async function notifyOnFailure(args: NotifyFailureArgs): Promise<void> {
  const original = args.event?.data?.event?.data;
  const message = args.error?.message ?? "unknown error";
  await recordAudit({
    actorId: "system",
    action: "notify",
    outcome: "needs_attention",
    meta: {
      notifyType: original?.type ?? null,
      recipientId: original?.recipientId ?? null,
      bookingId: original?.bookingId ?? null,
      error: message,
    },
  });
  console.error("[notify-alert] permanently failed", { error: message });
}

// NOTE: inngest 4.13.0 uses the 2-arg createFunction(options, handler) form — the trigger lives in
// options.triggers (the older 3-arg `(config, trigger, handler)` skeleton in most online examples predates
// this API and will not compile here). Cloned from request-expiry.ts, not from the web.
export const notify = inngest.createFunction(
  {
    id: "notify",
    // Inngest's default, stated explicitly so the retry budget is auditable rather than implicit — the
    // number of attempts before D-90's needs_attention row is written is a policy decision, not a default
    // someone should have to look up.
    retries: 4,
    triggers: [{ event: NOTIFY_EVENT }],
    onFailure: async ({ error, event }) => {
      await notifyOnFailure({
        error: error as { message?: string },
        event: event as NotifyFailureArgs["event"],
      });
    },
  },
  async ({ event, step }) => {
    const data = event.data as NotifyEvent;
    // (1) The durable record — first, always. See the ordering rationale in the file header.
    await step.run("write-notification", () => insertNotification(db, data));
    // (2) The email — its own step, therefore its own retries; a retry re-runs ONLY this step because
    //     step (1) is memoized. That is what makes D-91's two-channel parity non-drifting.
    return await step.run("send-email", () => sendForType(data));
  },
);
