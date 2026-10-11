# Phase 27 — Remaining live proofs, one by one

The unknown-host and authenticated staff exact-route checks pass. Fresh acceptance is 29/35; six scenarios remain pending. Contact is still disabled, and Plan09 is still incomplete (20/21 phase plans;144/151 curated plans).

| Check | Current result | Next step |
|---|---|---|
| Unknown host | Passed: real HTTPS404, no redirect or app/marketing content | Record exact current release binding |
| Old-host-only session | Existing-session entrypoint works; old-only session not proved | Controlled old-origin session transition |
| Staff capability denial | Passed: authenticated exact POST denied; flags unchanged, own session cleared, durable audit matched | Recorded with current deployment/source binding |
| Old verification email | Original link unavailable; one-hour expiry confirmed | Issue a real fixture email before controlled origin retirement |
| Old reset email | Original link unavailable; no unexpired pre-move reset record | Real fixture reset link; stop at valid form, no password change |
| Per-IP ingress | Historical exact-source no-mail proof retained | A newly scoped current-deployment no-mail test; keep public Contact disabled |
| Global budget and alert | Historical quota and alert proofs use separate releases | Complete same-deployment exhaustion/alert test under separate no-mail authority |
| Full rollback | Source-only recovery passed | Controlled origins/session/provider rollback; restore current pins |

The staff tester uses a new first-party login session. It refuses non-staff accounts or customer capabilities already on, sends one action POST and signs out its own new session. Passwords and cookies are never saved in evidence or copied from the owner browser. Initial terminal-unavailable cancellation and HTTP400 login rejection are retained as failed preconditions; neither attempted the hosting action.

The controlled legacy/rollback packet is prepared at27-LEGACY-CONTINUITY-ROLLBACK-PACKET.md. It requires an exact new scope because it temporarily changes the public origin topology and creates/removes one fixture with two auth emails. It does not enable Contact. Preparing it is not an approval or a pass.

The two Contact controls cannot be exercised through the current503 guard. A future operator-only no-mail window must be separately bounded and approved; no flag, firewall, quota fixture, inquiry transport or alert fixture was changed this turn.

```json
{
  "recordedAt": "2026-10-11T23:15:09.667Z",
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
      "status": "pending",
      "result": "Existing-app-session old entrypoint works. A separately signed old-host-only session needs the controlled origin transition.",
      "proof": "playwright/.cache/phase27-08/remaining8-session-entrypoint-browser.json"
    },
    {
      "id": "staff-customer-capability-denied",
      "status": "observed",
      "result": "Authenticated exact POST /start-hosting denied with unchanged flags-off staff role; own session cleared; alias/source and durable audit match.",
      "proof": "playwright/.cache/phase27-08/remaining8-staff-result-b17a3443-1a15-4582-ac19-4f7b87a9d5d5.json"
    },
    {
      "id": "issued-verify-token",
      "status": "pending",
      "result": "Owner has no valid old links; default verification lifetime3600seconds. Prepare a genuine fresh old-origin email before controlled retirement.",
      "proof": "playwright/.cache/phase27-08/remaining8-old-link-availability.json"
    },
    {
      "id": "issued-reset-token",
      "status": "pending",
      "result": "Owner has no valid old links; reset lifetime3600seconds and zero unexpired pre-move reset records. No owner password change.",
      "proof": "playwright/.cache/phase27-08/remaining8-old-link-availability.json"
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
      "status": "pending",
      "result": "Source-only recovery is already proved. Full origins, sessions, links and provider recovery require the separately scoped controlled rollback.",
      "proof": ".planning/phases/27-app-subdomain-marketing-website/27-LEGACY-CONTINUITY-ROLLBACK-PACKET.md"
    }
  ],
  "noApplicationSourceChanged": true,
  "noCredentialsPersisted": true,
  "contactEnabled": false,
  "freshObservedCount": 29,
  "pendingCount": 6,
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
  }
}
```

A separate primary staff account has both customer capabilities enabled. The tested staff account has both off. Existing committed booking and host gates include capability-only checks; this is recorded as a separate data-consistency gap without changing any account. The earlier known seed email does not match this aggregate finding.

Validation on the release worktree: prepared PASS; deployed/live FAIL with the six genuinely pending matrix cases, partial external inventory, unresolved high threats, full rollback/Contact controls and live inquiry authority/receipt checks. The exact staff and unknown-host rows are no longer validator failures. Logs: playwright/.cache/phase27-08/remaining8-verify-{prepared,deployed,live}.log. No application source or deployed settings changed.
