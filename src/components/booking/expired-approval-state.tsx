"use client";

// D-97 — the lapsed-approval RECOVERY state. Rendered on /bookings/[id] when an approved request's payment
// window closed before the booker paid.
//
// THIS IS A RECOVERY STATE, NOT AN ERROR STATE. It clones the tone and shape of the calm `declined` landing
// in bookings/[id]/page.tsx exactly: a muted `secondary` badge, icon + text, no alarm colour anywhere, and
// one coral forward action. Copywriting contract C6 is the rule it is built to: a lapse costs a slot, never
// money (D-63 — nothing was ever charged), so the copy states that fact and stops. It must NOT manufacture
// urgency the system does not have. The forgiving payment window is the deliberate consequence of the
// D-82/D-87 channel decision (D-89), not an oversight for the copy to apologise for.
//
// WHY THE CTA IS CONDITIONAL (the researcher's call, 07-UI-SPEC § 10 / Open Question 10). The variant is
// chosen by a cheap availability read at RENDER time, because a one-click button that fails is worse than no
// button — the whole value of D-97 is that recovery costs nothing, and a click that bounces costs more than
// never having offered it. The read is not, and must never become, the gate: `reRequestSameWindow` re-mints
// through `createPendingHold`, so the booking_no_overlap EXCLUDE re-adjudicates the slot on every submit
// regardless of what this render decided. If the slot is taken in between, the action returns the SHIPPED
// "just taken" message through the toast and this page re-renders into the `Find another time` variant.
//
// WHY THE WHOLE COMPONENT IS A CLIENT LEAF rather than a server shell wrapping a client button: it needs
// pending state, a toast and a router push, and it is a presentational leaf whose every prop is already a
// pre-composed display string. There is no data access here to lose by crossing the boundary, and keeping the
// two variants in ONE file keeps the copy that distinguishes them side by side where a reader can compare it.

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TimerOffIcon } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { reRequestSameWindow } from "@/app/actions/re-request";

/**
 * Why the window cannot be re-requested, when it cannot.
 *   `free`        — genuinely open: variant A, the one-click resubmission.
 *   `taken`       — someone else now occupies it: variant B, with the locked copy.
 *   `unavailable` — open to nobody for another reason (the session has passed, it is now inside the
 *                   listing's minimum notice, the host closed those hours). Variant B, but NOT the "someone
 *                   else booked this" sentence — that would be a plain untruth, and C6 is a truthfulness
 *                   rule before it is a tone rule.
 */
export type ExpiredApprovalSlot = "free" | "taken" | "unavailable";

export function ExpiredApprovalState({
  bookingId,
  listingId,
  whenLabel,
  deadlineLabel,
  tzNote,
  slot,
}: {
  bookingId: string;
  listingId: string;
  /** Pre-composed venue-local window label, "{date}, {time} ({City} time)". */
  whenLabel: string;
  /**
   * Pre-composed venue-local deadline, or null when it is not knowable.
   *
   * It usually is not. Both retirement paths — the request-expiry cron and the in-transaction stale-hold
   * sweep — CLEAR `expires_at` when they flip the hold terminal, so by the time this state renders the
   * instant the window closed has not been retained anywhere. The copy therefore has two forms and the
   * deadline-free one is the common case; inventing a plausible-looking deadline from `starts_at` or from
   * APPROVAL_PAYMENT_WINDOW_HOURS would be telling the booker something we do not know.
   */
  deadlineLabel: string | null;
  tzNote: string;
  slot: ExpiredApprovalSlot;
}) {
  const router = useRouter();
  const [pending, setPending] = React.useState(false);

  async function handleReRequest() {
    if (pending) return; // double-click guard, before the disabled attribute can apply
    setPending(true);
    try {
      const res = await reRequestSameWindow(bookingId);
      if (res.ok) {
        toast.success("Request sent. We've asked the host again for the same time.");
        router.push(`/bookings/${res.bookingId}`);
        router.refresh();
      } else {
        // Every failure path is a CALM message — not yours / no longer resendable / just taken / going a
        // little fast. `router.refresh()` re-runs the availability read, so a slot taken between render and
        // submit resolves this surface into the `Find another time` variant on the spot.
        toast.error(res.error);
        setPending(false);
        router.refresh();
      }
    } catch (e) {
      setPending(false);
      throw e;
    }
  }

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <Card>
        <CardContent
          role="status"
          aria-live="polite"
          className="flex flex-col items-center gap-4 py-10 text-center"
        >
          {/* Muted secondary badge, icon + text — the same calm treatment every terminal lifecycle state
              gets. Never an alarm colour: an expiry is an expected outcome, not a failure. */}
          <Badge variant="secondary" className="gap-1.5 text-muted-foreground">
            <TimerOffIcon className="size-4" aria-hidden="true" />
            Expired
          </Badge>

          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">This approval expired</h1>
            <p className="mx-auto max-w-prose text-sm text-muted-foreground">
              {deadlineLabel
                ? `You had until ${deadlineLabel} to pay, so we released the slot. You weren't charged anything.`
                : "The payment window for this booking closed, so we released the slot. You weren't charged anything."}
            </p>
            <p className="text-sm text-muted-foreground">{whenLabel}</p>
            <p className="text-xs text-muted-foreground">{tzNote}</p>
          </div>

          {slot === "free" ? (
            // ── Variant A — the slot is still free. The ONE coral CTA on this surface (07-UI-SPEC accent #2).
            <div className="flex w-full flex-col items-center gap-2">
              <Button
                variant="brand"
                onClick={handleReRequest}
                disabled={pending}
                aria-disabled={pending}
                className="w-full sm:w-auto sm:min-w-64"
              >
                {pending ? "Sending…" : "Request these times again"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Same space, same time — we&apos;ll send the host a fresh request.
              </p>
            </div>
          ) : (
            // ── Variant B — the slot is gone. The resubmit button is DELIBERATELY not rendered at all: a
            // one-click recovery that fails is worse than no button. The forward action goes to the listing,
            // where the calendar can offer what is actually open.
            <div className="flex w-full flex-col items-center gap-2">
              <Button asChild variant="brand" className="w-full sm:w-auto sm:min-w-64">
                <Link href={`/listings/${listingId}`}>Find another time</Link>
              </Button>
              <p className="text-xs text-muted-foreground">
                {slot === "taken"
                  ? "Someone else booked this slot. There may be other times open."
                  : "This time isn't available any more. There may be other times open."}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
