# Plan 09 — Actual Vercel ingress verification packet

Prepared 2026-10-11T07:14:31.077Z. Source: 58897a9459cf31b7c8937254dc17ab61ae0ce1d5, branch codex/phase27-contact-ingress-58897a94. This remains Phase 27/Plan 09. Phase 28 is not defined in the current roadmap.

The owner instructed "go ahead continue" after the restricted-window explanation. Preparation is verified; both protected Preview builds are READY. Exact amended source/window approval has been requested and is pending. The live window has not started: the current production release is unchanged, Contact remains disabled, and no production quota fixture or inquiry has been created. This packet makes the no-mail mechanism and different-runtime evidence concrete; do not silently reuse the completed D67 window as authority for a different source or broader operation.

## Exact candidate and no-mail safeguard

Only Contact runtime code changes: a module-initialized anonymous UUID and CONTACT_INGRESS_VERIFICATION_MODE. When that server-only flag is exactly true, the handler still enforces its existing production-enable, exact Host/Origin, trusted-IP, local/sender and shared quota boundaries. It records only instanceId plus reservation status (reserved, limited or unavailable). After a successful shared reservation it returns the existing generic 503 before calling sendContactInquiry. Actual quota denials retain 429 and their real Retry-After. No response contains the runtime marker, and no IP, inquiry, sender, header, credential or raw error is logged. Without the flag, normal delivery behavior is unchanged. The mode cannot override CONTACT_PRODUCTION_ENABLED=false.

The source commit also contains focused tests and .env.example documentation. No migration, new endpoint, dependency, payment/payout source or provider secret changes. Shared dev runtime is not overwritten.

237 Contact/host-routing tests, TypeScript, scoped lint and the full design suite (1510 passed, 6 skipped) pass. Real isolated HTTP mode test: three independent processes reserve exactly five slots from eight contenders, return three shared denials, and call mail transport zero times. A replacement process receives a distinct marker and remains denied. Initial run retained three failures from the incomplete CRLF-sensitive local edit; repaired final run passes with clean test database containment.

## Current production baseline

- Web: dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68, source b61cb4a43c8dd4c10e7444014fb66646aba36ec5. Both fitout.live and app.fitout.live alias readbacks match. This is the immediate disabled rollback pin.
- Ops: dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ, retained D67. No Ops promotion is included.
- Both saved production Contact flags are false. Current public Contact returns 503; all four root/contact/customer/Ops-login reads return 200. Unsigned Contact alert receiver returns 401 without a redirect.
- Read-only primary inspection: contact_quota rows 0; contact_alert rows 1, pending 0. The one previously sent synthetic alert is retained.
- Vercel browser is authenticated. Saved temporary rule rule_phase_27_restricted_contact_test_j9IM6v is now published active for the disabled-Contact preflight; its conditions are exact Production POST /api/contact on fitout.live AND original IP Does not equal the private verifier IP, action Deny. Original edge Log rule remains enabled. No paid upgrade or system bypass.
- The firewall-config API returned 404; actual rule state and conditions were verified through the dashboard. Runtime-log API returned no records for the baseline request; request-list/detail evidence is required if this API does not expose the live markers.

## Readiness sequence — Contact stays publicly disabled

1. Wait for exact-source protected Preview builds and retain actual build diagnostics. Do not promote a Preview bound to the isolated Preview database onto production traffic. No share-link/protection bypass is included.
2. Prepare two fresh immutable web Production test deployments A and B from exactly 58897a94 with CONTACT_PRODUCTION_ENABLED=true and CONTACT_INGRESS_VERIFICATION_MODE=true captured in both. Require their other origins, primary database binding and provider settings to match the current approved production release; automatic domain assignment must remain disabled. They receive no public traffic during preparation. Restore the saved project Contact flag false and verification mode false before starting the live window.
3. Production builds may automatically refresh the existing fitout Inngest app to an immutable deployment URL, as observed during the previous alert release. Record before/after registration and all 14 unchanged functions. No financial job invocation or manual financial function/signature change. Prepare a final disabled Production build from the original b61cb4a4 with both flagsfalse if needed to return automatic registration to the baseline source before the window. If registration changes cannot be reconciled, stop preparation with Contact disabled; do not report it unchanged.
4. Verify the operator's fresh original IP privately from current Vercel request evidence. Reuse only the exact saved restriction, updating its private IP if needed, and publish it while Contact is still disabled. Verify the operator still reaches 503. The owner submits one synthetic inquiry from mobile data with Wi-Fi off; Vercel must show a denial from a genuinely distinct original IP. A generic form error alone is insufficient. If original IP changes, guard enforcement is unproved, or the UI requires an upgrade, stop.
5. Re-read both test deployments, flags, aliases, saved/published rule, primary quota 0 and pending alerts 0 immediately before promotion. Verify no-mail mode is part of the exact source and captured configuration. No provider key needs to be displayed or changed. Active operator must have the disabled rollback action ready.

## Bounded live window — maximum five minutes and twelve Contact POSTs

Start the timer at the first promotion. The firewall blocks every client except the operator for exact apex Contact POST. Contact is not enabled for the general public.

1. Promote ready A; confirm the apex and customer aliases read A. Submit three valid synthetic inquiries with distinct example.invalid sender addresses, no mobile and a harmless fixed message. All three must return 503 from the no-mail guard. Verify runtime events say reserved, and actual primary global/IP timestamp counts reach 3, with only the two expected quota keys. Capture their exact private fingerprints. No exhausted-global fixture is used, so this test does not manufacture a quota alert.
2. Promote ready B. Its anonymous runtime marker must differ from the markers already observed in A. Submit three more distinct synthetic senders from the same real network. The first two reserve (503); the third must return 429 with positive Retry-After at most 900 seconds and log limited. B has handled only three valid requests, below its local five-attempt IP cap. Primary global and the same HMAC IP row must each remain at five timestamps. This identifies shared enforcement through actual Vercel ingress across distinct deployments/runtimes; request IDs alone do not establish it.
3. If time/budget permits, one more valid request with forged X-Forwarded-For, X-Real-IP and x-vercel-forwarded-for must remain 429, log limited and create no extra IP key or reservation. Client headers must not move the actual identity. No sixth-mail success is expected or permitted. Optional wrong-Origin probe must be 403 and leave quota untouched.
4. Restore the exact current disabled web pin before five minutes expires, even if evidence is incomplete. Re-read aliases, saved Contact flag false, ordinary Contact 503, all four public health reads, Ops pin unchanged and signed receiver boundaries. Verification mode must befalse or absent in saved production config.
5. Under the quota advisory lock, remove ONLY the two test-owned rows whose keys, full attempts JSON and expiries match the captured expected fingerprints and five-reservation result, with the pretest empty state recorded. Never delete by a broad prefix, truncate, or remove changed/unknown rows. Re-read quota 0 and retained alert1/pending 0. If a fingerprint differs, preserve it, keep Contact disabled and inspect. Then disable/publish only the temporary Deny rule; preserve the original Log rule and history.

## Stop conditions and evidence limits

Any 200 response, inquiry-provider call, missing no-mail flag, wrong source/database, guard mismatch, unknown IP, unexpected quota key/count, quota-store error, unexpected alert, failed health read, absent distinct-runtime evidence or elapsed time ends the test by restoring the disabled pin while the restriction remains in place. Do not extend the window by assumption, induce outages, buy a plan, change DNS or credentials, or trigger any money/legal flow.

Capture exact deployment/environment/alias references, redacted provider request details, runtime markers, response status/Retry-After, quota fingerprints and cleanup/rollback timestamps. Mark contact-trusted-ingress-per-ip observed only if matching source and actual apex observations satisfy all of the above. Otherwise preserve the actual partial result and leave it pending. This does not prove real inquiry receipt/Reply-To/reply, genuine issued-link continuity, staff capability denial, complete topology rollback or remaining provider/release-control gates. Counts remain 20/21, 144/151 and historical matrix 29/35 until actual verification updates a specific row. All money/legal HOLDs persist.

## Owner handoff

The necessary independent-network check uses https://fitout.live/contact, mobile data with Wi-Fi off, name "FitOut ingress guard check", Email and Confirm Email "phase27-ingress@example.invalid", mobile blank, and message "Synthetic restricted ingress check. No delivery intended." Do not submit until the operator confirms the restriction is published and Contact is still disabled. The expected UI result is a send failure; acceptance additionally requires the dashboard's matching firewall denial. Login entry remains an owner handoff if any existing session expires.


## Verified preparation readback

Actual Vercel ingress preparation: no-mail verification candidate 58897a94 is committed on codex/phase27-contact-ingress-58897a94. Both protected Preview builds are READY (web dpl_C9qrNjxKPHVk5jTsgvH1Cr9JFn9Q; Ops Preview dpl_CHPg7gJKmrFVKNUz6QaFgJL6b4TK). Cloud web build compiled in 25.9s and finished TypeScript in 27.9s. Contact/routing 237 passed; full design 1510 passed, 6 skipped; types/lint pass and test database containment is clean. The exact saved narrow Deny rule is now published active while Contact stays disabled, with the original Log rule unchanged. The allowed verifier returned 503 and all four health reads returned 200; primary quota is zero and retained alert state is one sent/zero pending. Production aliases remain web b61cb4a4 and Ops D67, with both saved flags false. No Production test build, promotion, fixture, inquiry email or financial invocation occurred. Await exact amended-packet approval and the owner mobile-data denial, including matching provider evidence. The live window has not started and the matrix row stays pending. Read 27-CONTACT-VERCEL-INGRESS-TEST-PACKET.md. Counts and all money/legal HOLDs are unchanged.

```json
{
  "recordedAt": "2026-10-11T07:21:36.357Z",
  "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "branch": "codex/phase27-contact-ingress-58897a94",
  "flags": [
    {
      "project": "webFlag",
      "key": "CONTACT_PRODUCTION_ENABLED",
      "value": "false",
      "target": [
        "production"
      ]
    },
    {
      "project": "opsFlag",
      "key": "CONTACT_PRODUCTION_ENABLED",
      "value": "false",
      "target": [
        "production"
      ]
    }
  ],
  "previews": [
    {
      "role": "web",
      "id": "dpl_C9qrNjxKPHVk5jTsgvH1Cr9JFn9Q",
      "state": "READY",
      "url": "fitout-mfuqlntu7-pengr3s-projects.vercel.app",
      "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "target": null
    },
    {
      "role": "ops",
      "id": "dpl_CHPg7gJKmrFVKNUz6QaFgJL6b4TK",
      "state": "READY",
      "url": "fitout-5wkztts9i-pengr3s-projects.vercel.app",
      "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "target": null
    }
  ],
  "aliases": [
    {
      "host": "fitout.live",
      "projectId": "prj_my7iigeFoojFO2QmXYYfr49p8uiz",
      "deploymentId": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68"
    },
    {
      "host": "app.fitout.live",
      "projectId": "prj_my7iigeFoojFO2QmXYYfr49p8uiz",
      "deploymentId": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68"
    },
    {
      "host": "ops.fitout.live",
      "projectId": "prj_cUmYg0pQne8gkYKrHd8KY2O4rAQj",
      "deploymentId": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ"
    }
  ],
  "previewBuildLines": [
    "Cloning github.com/pengr3/FitOut (Branch: codex/phase27-contact-ingress-58897a94, Commit: 58897a9)",
    "Detected Next.js version: 16.2.7",
    "▲ Next.js 16.2.7 (Turbopack)",
    "✓ Compiled successfully in 25.9s",
    "  Running TypeScript ...",
    "  Finished TypeScript in 27.9s ...",
    "  Collecting page data using 1 worker ...",
    "  Generating static pages using 1 worker (0/49) ...",
    "  Generating static pages using 1 worker (12/49) \r",
    "  Generating static pages using 1 worker (24/49) \r",
    "  Generating static pages using 1 worker (36/49) \r",
    "✓ Generating static pages using 1 worker (49/49) in 764ms",
    "Build Completed in /vercel/output [60s]",
    "Deployment completed"
  ],
  "guard": {
    "id": "rule_phase_27_restricted_contact_test_j9IM6v",
    "active": true,
    "published": true,
    "scope": "Production POST fitout.live/api/contact except private original verifier IP",
    "independentCurrentDenial": "pending",
    "screenshot": "contact-ingress-guard-published-20261011.png"
  },
  "productionWindowStarted": false,
  "productionTestBuildsCreated": false,
  "runtimeAfterGuard": {
    "observedAt": "2026-10-11T07:15:48.279Z",
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
      "requestId": "sin1::iad1::rp4jw-1791702952182-9729dd2c00d7",
      "body": "{\"ok\":false,\"error\":\"Your message could not be sent. Please try again later.\"}"
    },
    "unsignedScheduler": {
      "status": 401,
      "redirected": false
    }
  },
  "primaryReadOnly": {
    "quota_rows": 0,
    "alert_rows": 1,
    "pending_alerts": 0
  },
  "tests": {
    "contactAndRouting": 237,
    "design": 1510,
    "designSkipped": 6,
    "typecheck": "passed",
    "lint": "passed",
    "containment": "clean"
  },
  "approval": "pending exact 58897a94 amended packet; owner continuation authorized preparation",
  "ownerMobileCheck": "requested; current independent denial pending"
}
```
