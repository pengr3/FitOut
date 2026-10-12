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
  "status": "Protected staging and disabled preflight performed; bounded live window not started or approved",
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
  "bindingGap": "Offline verifier repaired;206 actual tests pass. Actual control proofs still required.",
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
    "actualBuildIds": {
      "A": "dpl_DHkKWNWhmdbsugtzrPGPcJkmTeyN",
      "B": "dpl_ED46Ed99PCUUhJrYSr6neFWTyu7m"
    },
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
    "restoration": "Restore only apex alias to exact Cogas; confirm unchanged app/Ops/fallback pins, saved flagsfalse, ordinary Contact503, all four health surfaces, direct unsigned receivers, primaryquota0/retainedalert1/pending0. Disable/publish only test Deny after restoration. Reconcile original14-function Inngest receiver without invoking jobs.",
    "createdAt": {
      "A": "2026-10-12T06:57:56.807Z",
      "B": "2026-10-12T06:58:25.884Z"
    },
    "healthContract": [
      {
        "url": "https://fitout.live/",
        "expectedStatus": 200
      },
      {
        "url": "https://app.fitout.live/",
        "expectedStatus": 200
      },
      {
        "url": "https://fitout-web-psi.vercel.app/",
        "expectedStatus": 404
      },
      {
        "url": "https://ops.fitout.live/login",
        "expectedStatus": 200
      }
    ]
  },
  "stagingAuthority": {
    "status": "approved",
    "packetId": "p27-current-per-ip-20261012",
    "ownerInstruction": "okay go ahead with the verifier-binding repair, then continue the two Contact tests one by one. keep Contact disabled for now",
    "approvedAt": "2026-10-12T06:51:07.894Z",
    "approvalTimeSource": "Owner instruction recorded in repair-result.json before either protected build was requested; live-window authority remains separate",
    "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "manifest": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
    "baselineId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
    "opsId": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
    "projectId": "prj_my7iigeFoojFO2QmXYYfr49p8uiz"
  },
  "currentPreflight": {
    "proofDirectory": "playwright/.cache/phase27-08/per-ip-current-2fa626f8-b7a6-44ed-8abc-ee5523c1224b",
    "operatorRequests": 3,
    "ownerReportedAttempts": 1,
    "totalPostBudgetCharged": 4,
    "remainingEnabledProbes": 7,
    "finalDisabledRecovery": 1,
    "maximumPosts": 12,
    "operatorCurrentOriginalIpUniquelyProved": true,
    "publishedDeny": true,
    "operator503": true,
    "ownerReportedMobileData": true,
    "ownerReportedWifiOff": true,
    "independentProviderDenial": "not yet matched; do not start",
    "financialReceiverRestored": true,
    "financialFunctions": 14,
    "savedFlags": false,
    "quotaRows": 0,
    "alertRows": 1,
    "pendingAlerts": 0,
    "windowStarted": false
  }
}
```


Latest local readiness 2026-10-12T06:33:18.850Z: Docker engine responds, existing fitout-db-1 started, fitout_test read-only connection and host5432 reachability confirmed. Fresh exact588 isolated runtime rehearsal passed; source checks retained, unique schema removed. Live window unstarted, saved Production gates unchangedfalse. Earlier local runtime blockers remain dated history.


Current staged preparation 2026-10-12T07:42:22.310Z: both exact588 no-mail variants READY; unsigned immutable URLs redirect302 to Vercel sign-in, no bypass/share link. Apex/app/fallback retainCogas, Ops5WY, all saved Contactflagsfalse. Automatic Inngest refresh toB was restored after exact owner approval to original Cogas receiver with14 unchanged functions, no manual financial job. Temporary test rule was log-discovered with one uniquely marked current-hour request/originalIP, then restored to exact published Production POST fitout.live/api/contact originalIP-not-equal Deny. Operator503 passes. Owner reported one mobile-data/Wi-Fi-off attempt with uncertain-delivery form message; no current matching restriction denial has yet been observed. Three operatorPOSTs plus one owner attempt charge4 of12; do not ask for another submission or extend this budget by assumption. First public window remains unstarted and requires separate exact bounded authority, plus current independent denial. No quota fixture or alert email. Original fallback404 is the verified retired-domain contract (27-LEGACY-CONTINUITY-EXECUTION.md); preparation now tests that expected response instead of incorrectly demanding200. The initial incorrect health expectation record is retained.


First current-release preflight retained as incomplete 2026-10-12T07:48:40.036Z: owner Wi-Fi-off/mobile-data confirmation is recorded, but no current matching Vercel Deny through3:41PM Manila. Runtime Contact search shows only operator probes. No enabled window, quota reservation or mail. Current source observer206passes committedde06bd9d. Read 27-CONTACT-PER-IP-PREFLIGHT-RETRY.md for the exact unapproved two-request renewal; never request another phone submission under the old request budget.
