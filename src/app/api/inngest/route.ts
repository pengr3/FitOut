// The /api/inngest serve endpoint — the mount point Inngest invokes to run BOTH payout crons.
//
// ORDERING (the entire reason former Plan 05 was split): this file STATICALLY imports `payoutSweep` from
// Plan 05a's payout-sweep.ts (a landed prior-wave artifact) AND `payoutReconcile` from Plan 05b's
// payout-reconcile.ts. It is created LAST — after both function files exist — so `tsc` resolves both
// imports with no TS2307. A route.ts that preceded either function file would never compile.
//
// FAIL-CLOSED (T-05-26, mirrors the paymongo.ts / auth.ts WR-03 boot guards): in PRODUCTION the serve
// endpoint MUST verify inbound Inngest requests via INNGEST_SIGNING_KEY. We throw at module load if it is
// missing in prod so a misconfigured deploy is a boot FAILURE, not a silently-unverified endpoint an
// unauthenticated caller could hit. dev/test/build tolerate its absence — the Inngest Dev Server needs no
// keys (`npx inngest-cli@latest dev`), and `next build` must not require prod secrets.

import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { payoutSweep } from "@/inngest/functions/payout-sweep";
import { payoutReconcile } from "@/inngest/functions/payout-reconcile";
import { paymentReconcile } from "@/inngest/functions/payment-reconcile";
import { requestExpirySweep } from "@/inngest/functions/request-expiry";
import { notify } from "@/inngest/functions/notify";
import { guestEmail } from "@/inngest/functions/guest-email";
import { remindersSweep } from "@/inngest/functions/reminders";
import { opsAlertDigest } from "@/inngest/functions/ops-alert-digest";

// serve() verifies the Paymongo-style signed Inngest request with node crypto — Node runtime, not edge.
export const runtime = "nodejs";

// Fail-closed prod guard: a missing signing key in production is a boot failure, never a silent bypass.
// The `phase-production-build` phase is exempted — NEXT_PHASE is that value ONLY during `next build`'s
// data-collection pass, never at runtime serving, so the guard still fires on a real production boot.
if (
  process.env.NODE_ENV === "production" &&
  process.env.NEXT_PHASE !== "phase-production-build" &&
  !process.env.INNGEST_SIGNING_KEY
) {
  throw new Error(
    "INNGEST_SIGNING_KEY is required in production (fail-closed: Inngest verifies the /api/inngest serve endpoint).",
  );
}

// serve() reads INNGEST_SIGNING_KEY / INNGEST_EVENT_KEY from env automatically; the guard above just makes
// a missing prod key fatal. Registers all EIGHT functions — the SIX crons on offset minutes so they never
// contend (Pitfall 4): the hourly payout sweep (05a, :00), the request-to-book expiry sweep (06-06, :15),
// the payout reconcile (05b, :30) and the D-85 reminder sweep (07-13, :45), plus the DAILY ops alert digest
// (quick 260810-j3z, 08:50 Asia/Manila — minute :50, which none of the four hourly crons occupy), plus the
// 13.1-02 PAYMENT reconcile (`2-59/5`, i.e. :02 and every five minutes after — a start minute none of the
// five above occupy) — plus
// `notify` (07-07), the only EVENT-triggered function here: it listens for `fitout/notify` and fans one
// event out to the durable in-app notification row and the email (D-83/D-91).
//
// A function that is not in this array does not exist as far as Inngest is concerned — registration is
// DERIVED from this file at sync time, not stored anywhere else. An unregistered `notify` means every
// emitNotify call silently drops on the floor with no error at the emitter (which swallows by design), and
// an unregistered `remindersSweep` means the cron never ticks and NO reminder is ever sent — with nothing
// failing anywhere to say so. The same is true of `opsAlertDigest`, and it is the sharpest case of all:
// unregistered, the daily digest of UNRESOLVED `needs_attention` money alerts never sends, the rows go back
// to being a thing only a psql session can see, and — because a cron that does not tick raises no error
// anywhere — NOTHING FAILS TO SAY SO. `guestEmail` (08-04) is the SECOND event-triggered function: it
// listens for `fitout/guest-email` and sends the guest-with-email RSVP send email-only, writing NO durable
// row (a guest has no user.id; RESEARCH Pitfall 2). Unregistered, every guest RSVP email silently drops on
// the floor.
//
// AND THE NEWEST ENTRY IS THE SHARPEST CASE THIS ARGUMENT HAS EVER HAD. `paymentReconcile` is the one job
// standing between a booker who PAID and nothing at all. Leave it out of this array and it does not exist:
// every lost `checkout_session.payment.paid` webhook stays lost, silently, exactly as it does today — the
// money is captured, the booking sits `pending` until its hold is swept, and because a cron that never
// ticks raises no error anywhere, the only detector left is the customer's own complaint. That is precisely
// how the two 2026-08-21 evidence bookings were found, one of them three days late.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    payoutSweep,
    payoutReconcile,
    paymentReconcile,
    requestExpirySweep,
    notify,
    guestEmail,
    remindersSweep,
    opsAlertDigest,
  ],
});
