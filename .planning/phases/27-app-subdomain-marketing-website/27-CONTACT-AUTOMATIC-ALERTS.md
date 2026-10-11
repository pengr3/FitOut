# Contact automatic alerts — implemented and live-tested

Owner explicitly authorized implementation/testing using pengr.clmc.3@gmail.com while keeping Contact disabled. This adds Contact-only code and migration to original Plan09 scope.

Automatic Contact alerts are live on web dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68 / b61cb4a43c8dd4c10e7444014fb66646aba36ec5. Separate app fitout-contact-alerts, signed receiver https://fitout.live/api/contact-alerts/inngest, every five minutes. Primary ledger39 with additive0038 hash c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9. First real scheduled run 01M4MSYB70J1M05HRHPVN6PQQQ processed1 synthetic incident; Resend delivered 01a1299f-3ff8-7eff-a94c-783d416d5993 and owner confirmed inbox receipt. Next scheduled run 01M4MT7G60J1M05HRHPVN6PQQQ processed0; one test email, no duplicate. Contact remains false/503, quota0, Ops stays D67. No public inquiry was sent. Other Plan09 evidence and money/legal HOLDs remain.

## Controls

The100th shared reservation atomically records a durable incident; real incidents are suppressed for a rolling hour across backends. The monitor holds the quota lock before reading wall time/state. Inspection runs every five minutes with concurrency1 and five retries. Preview is inactive. Public Contact false does not disable monitoring.

Resend receives one stable idempotency key/body per incident. Failed delivery stays pending; acceptance records the provider ID. Uncertain incidents older than23hours require manual review rather than blind replay beyond provider24hour idempotency retention. Quota-unavailability alerts use scheduler-persisted steps independently of appDB with a stable key/body per UTC calendar hour, distinct from rolling-hour global-incident suppression.

Incident ID/time and aggregate state only; no inquiry, sender, IP, payment data or raw error messages. Contact app is separate. Vercel automatically resynced the existing fitout app to the new Production deployment while building it (06:16:08 UTC); its 14 existing functions and financial source/signatures are retained. No manual financial scheduler edits or test invocation. Automatic platform destination refresh is recorded separately from unchanged money-job source.

## Tests and build

Contact/routing/scheduler186/186 passed in isolated local testDB with clean containment. Scoped lint, TypeScript and Drizzle check passed. Full design gate1510 passed,6 skipped with bounded workers. Retained initial design run1508 passed/2 timed out/6 skipped under concurrent build load; focused rerun52 passed. TypeScript passed after clearing stale generated types from the failed webpack diagnostic.

Local Turbopack refused the existing dependency junction; webpack failed on existing client node:crypto import. These are not build passes. The exact Git Vercel build compiled40s, finished TypeScript34.2s and became READY before manual promotion. No bundler/config/gate workaround.

## Migration and live audit

Isolated schema-only Preview br-silent-glade-b31mruln validated table/checks/index. Primary br-divine-lake-b3in9zag applied0038 once in a guarded transaction requiring prior38 ledger entries, exact0037 hash and no existing alert table. Now39 entries with correct0038 hash. No earlier migration replay. One marked synthetic alert row retained as audit; Contact quota remains empty.

First cron fired06:21 UTC, sent one email06:21:05 UTC. Resend marked Delivered and owner confirmed inbox receipt. Second automatic cron output and final runtime readbacks below establish the duplicate check. Outage/retry branches covered locally; no production DB outage or real quota exhaustion induced in this alert test. This is not a public Contact inquiry/Reply-To roundtrip.

Implementation remains in the isolated managed release checkout and dedicated Git branch. Shared dev has a divergent migration journal and unrelated dirty app changes; runtime source is not blindly copied there. Planning records updated in both checkouts.

## Remaining acceptance

Plan09/Phase27 remain incomplete: shared per-IP ingress across instances, staff capability denial, genuine issued-link continuity, full topology rollback, provider/release-control reconciliation and actual public Contact inquiry receipt/reply. Previous 29/35 matrix observations are dated D67 history; this scoped release does not relabel old rows as new-source proof. Contact remains disabled until the owner changes that instruction. Counts stay 20/21 plans, 144/151 curated, all seven requirements pending. Prepared validator passes; deployed/live acceptance validators still fail for these missing observations, partial inventory and unresolved high threats. This successful alert test does not waive them.

## Observed proof

Recorded 2026-10-11T06:32:08.155Z.

```json
{
  "source": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5",
  "branch": "codex/phase27-contact-alerts-b61cb4a4",
  "deployment": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
  "aliases": [
    {
      "host": "fitout.live",
      "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "state": "READY",
      "sha": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
    },
    {
      "host": "app.fitout.live",
      "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "state": "READY",
      "sha": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
    },
    {
      "host": "ops.fitout.live",
      "id": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
      "state": "READY",
      "sha": "d67fbecfa41e902cbf506c93dbcf53b60085e802"
    }
  ],
  "migration": {
    "tag": "0038_contact_alert",
    "hash": "c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9",
    "ledgerEntries": 39,
    "when": 1791698400000
  },
  "recipient": "pengr.clmc.3@gmail.com",
  "contactEnabled": false,
  "scheduler": {
    "app": "fitout-contact-alerts",
    "endpoint": "https://fitout.live/api/contact-alerts/inngest",
    "function": "contact-control-monitor",
    "cron": "1-59/5 * * * *",
    "syncedAt": "2026-10-11T06:19:21Z"
  },
  "synthetic": {
    "id": "p27-owner-alert-20261011-b61cb4a4",
    "createdAt": "2026-10-11T06:19:52.912Z",
    "providerId": "01a1299f-3ff8-7eff-a94c-783d416d5993",
    "sentAt": "2026-10-11T06:21:05.756Z",
    "providerStatus": "delivered",
    "ownerInboxConfirmed": true
  },
  "checks": {
    "contactAndRouting": 186,
    "design": {
      "passed": 1510,
      "skipped": 6
    },
    "typescript": "pass after clearing failed-webpack generated type cache",
    "lint": "pass",
    "drizzleCheck": "pass",
    "cloudBuild": [
      "Cloning github.com/pengr3/FitOut (Branch: codex/phase27-contact-alerts-b61cb4a4, Commit: b61cb4a)",
      "Cloning completed: 4.119s",
      "Running \"vercel build\"",
      "npm warn deprecated serialize-error-cjs@0.1.4: Rolling release, please update to 0.2.0",
      "Running \"next build\"",
      "✓ Compiled successfully in 40.0s",
      "  Running TypeScript ...",
      "  Finished TypeScript in 34.2s ...",
      "Build Completed in /vercel/output [2m]"
    ]
  },
  "firstScheduledRun": {
    "id": "01M4MSYB70J1M05HRHPVN6PQQQ",
    "trigger": "inngest/scheduled.timer",
    "fireAt": "2026-10-11T06:21:00Z",
    "completedAt": "2026-10-11T06:21:06Z",
    "output": {
      "active": true,
      "pendingProcessed": 1,
      "quotaAvailable": true,
      "staleCount": 0
    }
  },
  "ownerConfirmation": {
    "receivedIn": "inbox",
    "reportedAt": "2026-10-11T06:22:30Z",
    "reportedAtPrecision": "approximate capture window",
    "source": "Owner reply: Received in inbox"
  },
  "secondScheduledRun": {
    "id": "01M4MT7G60J1M05HRHPVN6PQQQ",
    "trigger": "inngest/scheduled.timer",
    "fireAt": "2026-10-11T06:26:00Z",
    "completedAt": "2026-10-11T06:26:03Z",
    "output": {
      "active": true,
      "pendingProcessed": 0,
      "quotaAvailable": true,
      "staleCount": 0
    }
  },
  "finalDatabaseState": {
    "totalAlerts": 1,
    "syntheticAlerts": 1,
    "pendingAlerts": 0,
    "quotaRows": 0,
    "providerId": "01a1299f-3ff8-7eff-a94c-783d416d5993"
  },
  "proofFiles": {
    "runtime": "playwright/.cache/phase27-08/contact-alert-release-runtime.json",
    "deliveryScreenshot": "playwright/.cache/phase27-08/contact-alert-delivered-20261011.png",
    "secondCronScreenshot": "playwright/.cache/phase27-08/contact-alert-second-cron-20261011.png"
  },
  "existingInngestApp": {
    "id": "fitout",
    "functions": 14,
    "lastSync": "2026-10-11T06:16:08Z",
    "syncStatus": "Success",
    "destination": "https://fitout-6nx1msej4-pengr3s-projects.vercel.app/api/inngest",
    "observation": "Vercel automatically resynced the existing app while building the new Production deployment. Existing financial function source and signatures are unchanged; no manual financial scheduler edits or test invocation."
  },
  "runtime": {
    "observedAt": "2026-10-11T06:26:58.055Z",
    "checks": [
      {
        "url": "https://fitout.live/",
        "status": 200
      },
      {
        "url": "https://fitout.live/contact",
        "status": 200
      },
      {
        "url": "https://app.fitout.live/",
        "status": 200
      },
      {
        "url": "https://ops.fitout.live/login",
        "status": 200
      }
    ],
    "contact": {
      "status": 503,
      "requestId": "sin1::iad1::qhf2p-1791700020368-2a3d410880d7",
      "body": "{\"ok\":false,\"error\":\"Your message could not be sent. Please try again later.\"}"
    },
    "unsignedScheduler": {
      "status": 401,
      "redirected": false
    }
  }
}
```
