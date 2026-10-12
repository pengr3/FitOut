# Phase 27 — Remaining live proofs, one by one

The approved legacy packet is complete. Fresh acceptance is33/35; the per-IP and global-budget Contact scenarios remain pending. Contact stays disabled. Plan09 remains incomplete (20/21 phase plans;144/151 curated plans). Earlier explanations below are dated history; the JSON rows are current.

| Check | Current result | Next step |
|---|---|---|
| Unknown host | Passed: real HTTPS404, no redirect or app/marketing content | Record exact current release binding |
| Old-host-only session | Passed genuine old-only session and independent new-host login | Recorded exact588 controlled transition |
| Staff capability denial | Passed: authenticated exact POST denied; flags unchanged, own session cleared, durable audit matched | Recorded with current deployment/source binding |
| Old verification email | Passed original delivered fixture CTA after restoration | Captured exact primary email_verified change |
| Old reset email | Passed original delivered fixture CTA and valid form | No password submitted; exact fixture removed |
| Per-IP ingress | Historical exact-source no-mail proof retained | A newly scoped current-deployment no-mail test; keep public Contact disabled |
| Global budget and alert | Historical quota and alert proofs use separate releases | Complete same-deployment exhaustion/alert test under separate no-mail authority |
| Full rollback | Passed actual origins/session/links/provider restoration | Preserve current disabled pins; extended monitoring still pending |

The staff tester uses a new first-party login session. It refuses non-staff accounts or customer capabilities already on, sends one action POST and signs out its own new session. Passwords and cookies are never saved in evidence or copied from the owner browser. Initial terminal-unavailable cancellation and HTTP400 login rejection are retained as failed preconditions; neither attempted the hosting action.

The controlled legacy/rollback packet is prepared at27-LEGACY-CONTINUITY-ROLLBACK-PACKET.md. It requires an exact new scope because it temporarily changes the public origin topology and creates/removes one fixture with two auth emails. It does not enable Contact. Preparing it is not an approval or a pass.

The two Contact controls cannot be exercised through the current503 guard. A future operator-only no-mail window must be separately bounded and approved; no flag, firewall, quota fixture, inquiry transport or alert fixture was changed this turn.

```json
{
  "recordedAt": "2026-10-12T02:54:42.912Z",
  "ownerConstraint": "Continue autonomously with available steps; keep Contact disabled",
  "rows": [
    {
      "id": "unknown-host-denied",
      "status": "observed",
      "result": "Actual HTTPS404, no redirect or customer/marketing/internal-error marker.",
      "proof": "playwright/.cache/phase27-08/remaining8-boundaries-http.json"
    },
    {
      "id": "host-only-session-bridge",
      "status": "observed",
      "result": "Genuine host-only old-origin fixture session remains valid through Stage B. After exact Stage C restoration it reaches new-host login200 without a loop; a separate new-host sign-in matches actor/role/capabilities, then its own session is signed out and confirmed null. No cookie transferred between hosts.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json"
    },
    {
      "id": "staff-customer-capability-denied",
      "status": "observed",
      "result": "Authenticated exact POST /start-hosting denied with unchanged flags-off staff role; own session cleared; alias/source and durable audit match.",
      "proof": "playwright/.cache/phase27-08/remaining8-staff-result-b17a3443-1a15-4582-ac19-4f7b87a9d5d5.json"
    },
    {
      "id": "issued-verify-token",
      "status": "observed",
      "result": "Genuine delivered fixture verification email issued at old fitout.live in Stage A. Original CTA clicked after current Cogas restoration without rewriting bearer URL; exact primary fixture email_verified changed false to true. Email delivery ID and redacted origin/query-key metadata retained; not an original October10 email.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json"
    },
    {
      "id": "issued-reset-token",
      "status": "observed",
      "result": "Genuine delivered old-origin fixture reset CTA clicked after current Cogas restoration. Browser reaches Set a new password form at app.fitout.live while primary has one unexpired fixture-owned reset record. No password entered/submitted; bearer path/query omitted. Not an original October10 email.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json"
    },
    {
      "id": "contact-trusted-ingress-per-ip",
      "status": "pending",
      "result": "Current public disabled gate returns503 before quota enforcement. Retain the completed historical588 no-mail test with its original IDs; never rebind it to current immutable deployments.",
      "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-VERCEL-INGRESS-RESULT.md"
    },
    {
      "id": "contact-distributed-global-budget",
      "status": "pending",
      "result": "Current Contactfalse prevents exercising the complete HTTP exhaustion-to-alert chain. D67 quota and b61 alert proofs remain separate, not a same-deployment pass.",
      "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-AUTOMATIC-ALERTS.md"
    },
    {
      "id": "rollback-verified",
      "status": "observed",
      "result": "Actual old/new primary and compatibility origins exercised through staged web A/B at exact588; all three web aliases restored to original Cogas in290.383seconds; Ops unchanged5WY. Old-only session recovery and both original delivered links pass; original single financial receiver restored with14 unchanged functions and separate Contact alert app. Final saved Stage C origins/flags, four baseline surfaces (including restored fallback404), direct unsigned400/401 boundaries, quota0/pendingalerts0 and exact fixture cleanup confirmed. Extended monitoring/forced failure not claimed.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json"
    }
  ],
  "noApplicationSourceChanged": true,
  "noCredentialsPersisted": true,
  "contactEnabled": false,
  "freshObservedCount": 33,
  "pendingCount": 2,
  "staffProviderBinding": "playwright/.cache/phase27-08/remaining8-staff-provider-binding.json",
  "dataConsistencyFinding": {
    "aggregate": [
      {
        "checked_at": "2026-10-11T23:15:21.097Z",
        "both_capabilities_staff_rows": "1",
        "known_seed_matching_rows": "0"
      }
    ],
    "scope": "Separate staff account; capability activation role guard protects new grants. Existing booking and host gates include capability-only checks, so flags-on staff data requires investigation. No account changed or live business action attempted."
  },
  "legacyExecution": {
    "client": "playwright/.cache/phase27-08/legacy-fixture-client-result.json",
    "emailsScheduler": "playwright/.cache/phase27-08/legacy-original-email-and-scheduler-proof.json",
    "providerCleanup": "playwright/.cache/phase27-08/legacy-final-provider-and-cleanup.json",
    "health": "playwright/.cache/phase27-08/legacy-final-public-health.json",
    "watchdog": "playwright/.cache/phase27-08/legacy-window-watchdog.json"
  }
}
```

A separate primary staff account has both customer capabilities enabled. The tested staff account has both off. Existing committed booking and host gates include capability-only checks; this is recorded as a separate data-consistency gap without changing any account. The earlier known seed email does not match this aggregate finding.

Validation on the release worktree: prepared PASS; deployed/live FAIL with the six genuinely pending matrix cases, partial external inventory, unresolved high threats, full rollback/Contact controls and live inquiry authority/receipt checks. The exact staff and unknown-host rows are no longer validator failures. Logs: playwright/.cache/phase27-08/remaining8-verify-{prepared,deployed,live}.log. No application source or deployed settings changed.


Latest checkpoint 2026-10-12T02:54:42.912Z: Approved legacy packet executed. Exact588 web A/B staged with deployment-only origin overrides, original web Cogas aliases restored in290.383seconds, Ops5WY unchanged. Old-only session, genuine original verification/reset links and full origin/session/provider rollback pass. Original Inngest receiver restored with14 functions; separate Contact monitor unchanged. Exact disposable fixture/auth rows cleaned after zero-business checks. Contactfalse throughout; zero ContactPOSTs, two auth emails, no password/financial invocation/DNS/migration/global-setting change. Fresh33/35; two Contact scenarios plus inventory/staff-data/inquiry/monitoring/release-control gates remain. Plan09 20/21, curated144/151, all7requirements pending. Read27-LEGACY-CONTINUITY-EXECUTION.md.
