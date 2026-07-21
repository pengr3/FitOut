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
import { requestExpirySweep } from "@/inngest/functions/request-expiry";
import { notify } from "@/inngest/functions/notify";
import { remindersSweep } from "@/inngest/functions/reminders";

// serve() verifies the Paymongo-style signed Inngest request with node crypto — Node runtime, not edge.
export const runtime = "nodejs";

// Fail-closed prod guard: a missing signing key in production is a boot failure, never a silent bypass.
if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error(
    "INNGEST_SIGNING_KEY is required in production (fail-closed: Inngest verifies the /api/inngest serve endpoint).",
  );
}

// serve() reads INNGEST_SIGNING_KEY / INNGEST_EVENT_KEY from env automatically; the guard above just makes
// a missing prod key fatal. Registers all FIVE functions — the FOUR crons on offset minutes so they never
// contend (Pitfall 4): the hourly payout sweep (05a, :00), the request-to-book expiry sweep (06-06, :15),
// the payout reconcile (05b, :30) and the D-85 reminder sweep (07-13, :45) — plus `notify` (07-07), the
// only EVENT-triggered function here: it listens for `fitout/notify` and fans one event out to the durable
// in-app notification row and the email (D-83/D-91).
//
// A function that is not in this array does not exist as far as Inngest is concerned — registration is
// DERIVED from this file at sync time, not stored anywhere else. An unregistered `notify` means every
// emitNotify call silently drops on the floor with no error at the emitter (which swallows by design), and
// an unregistered `remindersSweep` means the cron never ticks and NO reminder is ever sent — with nothing
// failing anywhere to say so.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [payoutSweep, payoutReconcile, requestExpirySweep, notify, remindersSweep],
});
