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

// serve() verifies the Paymongo-style signed Inngest request with node crypto — Node runtime, not edge.
export const runtime = "nodejs";

// Fail-closed prod guard: a missing signing key in production is a boot failure, never a silent bypass.
if (process.env.NODE_ENV === "production" && !process.env.INNGEST_SIGNING_KEY) {
  throw new Error(
    "INNGEST_SIGNING_KEY is required in production (fail-closed: Inngest verifies the /api/inngest serve endpoint).",
  );
}

// serve() reads INNGEST_SIGNING_KEY / INNGEST_EVENT_KEY from env automatically; the guard above just makes
// a missing prod key fatal. Registers BOTH crons so the hourly sweep (05a) and reconcile (05b) are invoked.
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [payoutSweep, payoutReconcile],
});
