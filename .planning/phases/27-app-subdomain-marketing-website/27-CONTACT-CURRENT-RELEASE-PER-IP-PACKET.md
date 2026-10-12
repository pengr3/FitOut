# Phase27 — Current release per-IP test packet

Prepared for the first remaining Contact test. Contact remains disabled. No deployment, rule, quota fixture or email is changed by preparation. Prior approved test windows completed at their recorded restoration pins; this is a new exact scope at the current Cogas/5WY pair.

The current immutable web build cannot reach quota logic while its Contact flag isfalse. The proposed operator-only no-mail test would use two unaliased protected Production builds, created with per-deployment flags true/true, with saved project flagsfalse throughout. No application source, origin, Ops deployment or project-wide auto-assignment setting changes. Only apex Contact is exercised; app stays on original Cogas. Verify both test builds require protection at their immutable URLs; never create a share link or protection bypass.

The saved narrow Deny restriction is presently disabled. Before any test traffic, identify the current original operator IP privately, publish the exact Deny rule while Contactfalse and match one owner mobile-data denial from a different original IP. A generic phone error is insufficient. Preserve the original Log rule and system mitigations. Do not purchase upgrades. If owner/IP/guard evidence is unavailable, do not begin the window.

Staging can automatically refresh financial Inngest registration. Read before/after; restore exact original Cogas receiver and14 unchanged functions before the window. Do not rebuild Ops or mutate global settings. No financial job may be manually invoked. Contact alerts remain separate.

Fresh empty quotas are required. A serves3 valid no-mail requests; B serves2 then denies the sixth shared429. A/B runtime UUIDs must differ and B must be below its local IP cap. One forged-header probe must keep the same fingerprints and remain429. Stop at any200, inquiry transport call, new IP key, quota/alert mismatch, missing mode, unhealthy read, unavailable distinct-runtime marker, changed operator IP or elapsed budget; immediately restore Cogas while restriction remains.

Total maximum12 ContactPOSTs includes preflight, owner denial,7 enabled-window probes and final disabled recovery. Start a five-minute timer on apex assignment; independent watchdog restores at4minutes or after two consecutive health failures. Restore even if proof is incomplete. Exact-match cleanup never deletes unknown/changed rows. Neither a database cleanup nor temporary gate change is covered by this preparation request.

The validator binding conflict is recorded in27-CONTACT-TEST-BINDING-GAP.md. Keep actual test deployment IDs and source/config metadata. No current Cogas row can be relabeled as if it served an enabled quota request. A strict binding repair needs a separately planned implementation and fresh engineering source capture. Prefer resolving that before repeating an already-proved same-source scoped per-IP test. Canonical count remains33/35 until its contract is satisfied.

```json
{
  "preparedAt": "2026-10-12T03:25:21.086Z",
  "status": "prepared; not executed; fresh bounded authority required",
  "phase": 27,
  "plan": "27-09",
  "candidateRevision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "sourceManifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
  "baseline": {
    "web": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
    "ops": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
    "app": "https://app.fitout.live",
    "marketing": "https://fitout.live",
    "compatibility": "",
    "contactEnabled": false,
    "verificationMode": false
  },
  "guard": {
    "id": "rule_phase_27_restricted_contact_test_j9IM6v",
    "currentEnabled": false,
    "scope": "Production POST fitout.live/api/contact AND original IP does not equal fresh privately verified operator IP",
    "action": "Deny",
    "originalLogPreserved": true,
    "independentCurrentNetworkDenial": "required before any temporary request gate"
  },
  "globalSavedSettingsChanges": false,
  "opsChanges": false,
  "newDomains": false,
  "financialInvocations": 0,
  "migrations": 0,
  "credentialChanges": 0,
  "publicInquiryEmails": 0,
  "sourceCodeChanges": false,
  "approval": "Previous completed packets retain their original scope; no new window inferred from preparation-only continuation.",
  "bindingGap": "27-CONTACT-TEST-BINDING-GAP.md",
  "readOnlyPreflight": "playwright/.cache/phase27-08/contact-controls-prep-195aa046-4a0a-4089-92ce-4bc1a12d2854/production-readonly-preflight.json",
  "localRehearsal": {
    "status": "pass",
    "proof": "playwright/.cache/phase27-08/contact-controls-ready-be1b8a83-3a7a-4e42-88bd-70c36abd2ba5/report.json",
    "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "finishedAt": "2026-10-12T06:32:20.652Z",
    "ownedSchemaRemoved": true,
    "actualEmailsSent": 0,
    "limit": "Loopback real HTTP/isolated Postgres; scheduler step persistence and delivery stubbed; not live Vercel or provider acceptance"
  },
  "freshCanonicalObservedCount": 33,
  "id": "p27-current-per-ip-20261012",
  "order": 1,
  "test": {
    "productionBuilds": 2,
    "actualBuildIds": "not created",
    "deploymentOverrides": {
      "CONTACT_PRODUCTION_ENABLED": "true",
      "CONTACT_INGRESS_VERIFICATION_MODE": "true"
    },
    "autoAssignCustomDomains": false,
    "publicAliasesChanged": [
      "fitout.live"
    ],
    "aliasesUnchanged": [
      "app.fitout.live",
      "ops.fitout.live",
      "fitout-web-psi.vercel.app"
    ],
    "windowSeconds": 300,
    "watchdogRestoreAtSeconds": 240,
    "maximumContactPosts": 12,
    "enabledWindowPosts": 7,
    "authAccountsCreated": 0,
    "quotaSeedRows": 0,
    "alertEmails": 0,
    "mailSafeguard": "Exact approved no-mail branch returns503 after reservation and before inquiry transport; flags are deployment-only. Saved production flags remainfalse.",
    "expected": [
      {
        "build": "A",
        "requests": 3,
        "status": 503,
        "sharedGlobalAttempts": 3,
        "sharedIpAttempts": 3,
        "reservation": "reserved"
      },
      {
        "build": "B",
        "requests": 2,
        "status": 503,
        "sharedGlobalAttempts": 5,
        "sharedIpAttempts": 5,
        "reservation": "reserved"
      },
      {
        "build": "B",
        "requests": 1,
        "status": 429,
        "retryAfter": "1..900",
        "sharedGlobalAttempts": 5,
        "sharedIpAttempts": 5,
        "reservation": "limited"
      },
      {
        "build": "B",
        "requests": 1,
        "headers": "forged ordinary forwarding headers",
        "status": 429,
        "sharedGlobalAttempts": 5,
        "sharedIpAttempts": 5,
        "reservation": "limited"
      }
    ],
    "distinctRuntimeMarkersRequired": true,
    "cleanup": "Advisory lock(27018,1); totalquota2; remove only exact two privately captured keys, full attempts JSON and expiry timestamps matching five-reservation result. Preserve changed/unknown rows.",
    "restoration": "Restore only apex alias to exact Cogas; confirm unchanged app/Ops/fallback pins, saved flagsfalse, ordinary Contact503, all four health surfaces, direct unsigned receivers, primaryquota0/retainedalert1/pending0. Disable/publish only test Deny after restoration. Reconcile original14-function Inngest receiver without invoking jobs."
  }
}
```


Latest local readiness 2026-10-12T06:33:18.850Z: Docker engine responds, existing fitout-db-1 started, fitout_test read-only connection and host5432 reachability confirmed. Fresh exact588 isolated runtime rehearsal passed; source checks retained, unique schema removed. Live window unstarted, saved Production gates unchangedfalse. Earlier local runtime blockers remain dated history.
