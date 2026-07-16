// The Inngest client — the single shared handle for the FitOut background-job runner (D-56, PAY-03).
//
// This is the FIRST async-scheduled job runner in the codebase. Inngest is the managed cron/durable-
// execution engine the T+24h payout sweep runs on (Research Standard Stack: no Redis, no worker, cross-
// platform dev server). This module defines ONLY the client so BOTH the cron functions (payout-sweep
// here in Plan 05a; payout-reconcile in Plan 05b) and the `serve()` route handler can import the same
// instance.
//
// NO signing-key guard belongs here: the client itself makes no authenticated outbound calls that need
// INNGEST_SIGNING_KEY. That key is consumed by the `/api/inngest` serve() endpoint that Plan 05b mounts
// (route.ts verifies inbound requests). Keeping the guard out of this file lets the mocked test suite and
// `next build` import the client without any Inngest env configured.

import { Inngest } from "inngest";

/** Shared Inngest client (app id "fitout"). Consumed by the payout crons + the Plan-05b serve() mount. */
export const inngest = new Inngest({ id: "fitout" });
