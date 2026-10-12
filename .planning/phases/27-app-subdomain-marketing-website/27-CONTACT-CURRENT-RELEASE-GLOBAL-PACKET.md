# Phase27 — Current release global-budget-to-alert packet

Second test, prepared separately. Contact stays disabled; execution follows the first test and another bounded authority checkpoint. No primary fixture, new deployment, Contact request or email was created during preparation.

Use two fresh protected exact-source Production no-mail variants with only deployment Contact/verification flags true/true; savedflagsfalse and all origins unchanged. Only apex alias changes. Re-prove the restricted WAF against a current distinct real network. Preserve Ops, app, original financial14 functions and separate Contact monitor.

Seed exactly99 recent reservations in one private-fingerprinted global row under advisory lock(27018,1), with pretestquota0 and no recent natural incident. This represents99 reservations, not99 requests or emails. Fresh runtimeG makes the real100th reservation and atomically creates one natural Contact incident; fresh runtimeH must deny globally with retry>900 while below local caps. Inspect runtime reserved/limited markers and exact persisted100/1 counts. No manual alert insertion or synthetic-flag rewrite is allowed.

Restore Cogas within5minutes (watchdog4minutes). Remove exact owned global/IP quota rows after restoration, before scheduled inspection can manufacture a second incident. The naturally created pending incident survives and is sent by the existing signed Contact-only cron, which runs while Contactfalse. Observe first scheduled run, delivered provider record, exact incident mail in owner Gmail, then next scheduled run with pendingProcessed0 and no duplicate. Never invoke a financial function or introduce another test recipient.

Expected one control email to pengr.clmc.3@gmail.com uses the normal subject “FitOut Contact alert: hourly quota exhausted”; no Contact inquiry is sent. Because the incident arose through the normal quota transaction its synthetic flag isfalse. Retain delivery metadata. After two scheduled observations and exact cleanup authority, remove only the captured test-owned incident to avoid suppressing a real alert for the next rolling hour. Preserve the earlier sent synthetic alert. If delivery is uncertain or fingerprints change, stop cleanup, keep Contact disabled and record the gap.

At most8 ContactPOSTs across all stages,2 enabled probes,5-minute public window and15-minute post-restoration scheduler observation budget. No authentication/account/booking/payout/DNS/credential/migration/global-setting changes. Do not extend budgets by assumption. The separate evidence-binding gap still applies; no canonical35/35 claim from a variant unbound to the current release.

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
  "localRehearsal": "pending Docker engine; failed precondition retained",
  "freshCanonicalObservedCount": 33,
  "id": "p27-current-global-alert-20261012",
  "order": 2,
  "dependsOn": [
    "First test restored and exact cleanup complete; primaryquota0/pendingalerts0",
    "Fresh independent guard denial and stable operator IP",
    "No recent real/non-synthetic Contact incident suppressing a new incident",
    "New separate bounded authority after first result"
  ],
  "test": {
    "productionBuilds": 2,
    "actualBuildIds": "not created",
    "freshRuntimesRequired": true,
    "deploymentOverrides": {
      "CONTACT_PRODUCTION_ENABLED": "true",
      "CONTACT_INGRESS_VERIFICATION_MODE": "true"
    },
    "autoAssignCustomDomains": false,
    "publicAliasesChanged": [
      "fitout.live"
    ],
    "windowSeconds": 300,
    "watchdogRestoreAtSeconds": 240,
    "maximumContactPosts": 8,
    "enabledWindowPosts": 2,
    "authAccountsCreated": 0,
    "quotaSeed": {
      "rows": 1,
      "key": "contact:global:v1",
      "recentTimestamps": 99,
      "source": "Database clock read under quota advisory lock; private exact JSON/expiry fingerprint; at most one hour TTL"
    },
    "alertFixtureInsertedManually": false,
    "expected": [
      {
        "build": "G",
        "request": 1,
        "status": 503,
        "result": "Real HTTP reservation becomes100th; exact one natural pending Contact incident atomically recorded; IP count1"
      },
      {
        "build": "H",
        "request": 1,
        "status": 429,
        "retryAfter": "greater than900 and at most3600",
        "result": "Different runtime shared global denial before local IP cap; global stays100, IP stays1, incident remains exactlyone"
      }
    ],
    "mailSafeguard": "Inquiry transport blocked in exact no-mail mode. One Contact control alert is expected from existing scheduled job, even after public Contact is restoredfalse.",
    "alert": {
      "recipient": "pengr.clmc.3@gmail.com",
      "maximumDistinctAlerts": 1,
      "subject": "FitOut Contact alert: hourly quota exhausted",
      "syntheticFlag": false,
      "reason": "The incident is created naturally by the real quota transaction, although99 prior reservations are synthetic. Do not modify its synthetic flag while full global quota exists; that would defeat deduplication.",
      "scheduler": "Existing separate fitout-contact-alerts/contact-control-monitor; scheduled.timer only; no manual financial invocation",
      "firstScheduledRun": "Match newly captured incident ID and natural creation time; actual pendingProcessed1, accepted Resend ID, DB sent_at, provider delivery and owner Gmail receipt",
      "secondScheduledRun": "Natural later run pendingProcessed0 and no duplicate provider acceptance",
      "maximumObservationMinutesAfterRestore": 15
    },
    "quotaCleanup": "Restore disabled apex first. Advisory lock exact global/IP rows, complete attempts/expiry/count fingerprints; remove2 rows promptly before monitor inspection can recreate an incident. Existing pending incident remains for natural scheduled delivery.",
    "alertCleanup": "After delivered/owner receipt and second scheduled duplicate check, remove only the naturally generated test-owned Contact alert whose exact ID/kind/created_at/attempt_count100/syntheticfalse/sent_at/provider_id match capture. Require exactly one new alert and preserve original previously sent synthetic alert. If mismatch or uncertain send, preserve row and document gap; no broad delete.",
    "restoration": "Exact Cogas apex; app/Ops unchanged; all savedflagsfalse; quotas0/pending0; originalfinancialreceiver14 and separate Contactapp1; no public inquiry."
  }
}
```
