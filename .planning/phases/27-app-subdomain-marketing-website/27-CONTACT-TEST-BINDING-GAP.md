# Phase27 — Contact test deployment-binding gap

Status: confirmed constraint; proposed repair not implemented. No acceptance validator or application source changed.

Current source58897a94, web Cogas, Contactfalse. src/lib/contact.ts checks the production enable flag before trusted IP, local/shared rate limits, and the verification-mode branch. Vercel builds capture env configuration per deployment. A request to the current disabled immutable build cannot exercise quota enforcement.

The offline validator scripts/verify-phase27-evidence.mjs requires every customer matrix row deploymentId equal live.deployments.customer.id (currently Cogas). A correctly recorded enabled no-mail variant has a different actual immutable deployment ID and is rejected. Setting its row to Cogas would fabricate deployment provenance. Changing the current candidate to a temporary enabled build would invalidate the existing33 real observations and contradict the restored disabled release. The strict current contract cannot be fulfilled by this test topology.

The previous scoped per-IP test already supplies exact588 source, two actual distinct runtimes, genuine Vercel ingress and strict quota fingerprints; it restored the earlier b61 baseline. Retain those actual IDs/source/time. Do not repeat a live window merely to relabel history. Global exhaustion-to-alert is still genuinely missing as one causal live flow.

Proposed repair for planning: permit only these two Contact rows to carry a typed controlled-test binding: actual test deployment IDs, exact candidate revision and source manifest, baseline/current restoration IDs, explicit deployment-config diff limited to two Contact flags, independent actual WAF restriction/denial, runtime marker/request/quota fingerprints, current packet authority, bounded timer/restoration/cleanup, fixed control-alert recipient and matched scheduler/provider evidence. Keep all ordinary marketing/auth/provider rows strictly bound to the current immutable customer/ops/preview IDs. Reject mismatched source, unapproved config, arbitrary historical test IDs, absent distinct runtimes, unproved no-mail mode, incomplete restoration, nonzero inquiry delivery, missing or duplicate alert, and unknown cleanup.

A validator change is itself in SOURCE_SCOPE (scripts/) and changes a new capture of that checkout. Its observer provenance must be recorded separately from the unchanged deployed588 source; old release gates cannot claim coverage of the new observer. If the repair is treated as a new application release revision, new exact source capture/six engineering gates and actual new release observations are required. A versioned observer-only repair can retain the archived588 release context with its own hash-bound validation tests. Read27-CONTACT-TEST-BINDING-REPAIR-PLAN.md before choosing/implementing this distinction. Do not silently patch the checker, weaken existing assertions or reuse588 engineering digests for changed verification code. Existing33 observations and approved completed packets remain their recorded history.

Until this decision is planned/implemented, live no-mail packets can supply supplemental correctly attributed evidence, but cannot close canonical current-deployment rows. Recommended sequence: resolve this binding repair first, then run only missing/relevant live evidence against the accepted source/config contract. Contact remains disabled throughout preparation.

```json
{
  "recordedAt": "2026-10-12T03:25:21.086Z",
  "status": "confirmed; repair proposal only",
  "currentCustomer": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
  "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "immutableCurrentFlag": false,
  "productionGuardBeforeQuota": true,
  "validatorRequiresOneImmutableCustomerId": true,
  "affectedRows": [
    "contact-trusted-ingress-per-ip",
    "contact-distributed-global-budget"
  ],
  "automaticAcceptanceExceptionImplemented": false,
  "sourceCodeChanged": false,
  "currentMatrixObserved": 33,
  "total": 35
}
```


Latest preparation:45 specification-prototype tests pass (hypothetical fixtures only); authoritative checker unchanged. Owner reports Docker Desktop running, but both observed engine connections and loopbackPostgres time out. Runtime stage count0, remote mutationfalse. Restart/own-PowerShell docker ps handoff pending.


Contact local readiness 2026-10-12T06:33:18.850Z: Docker desktop-linux responds. Existing stopped fitout-db-1 started without volume changes; pg_isready, fitout_test SQL and host5432 pass. Fresh exact588 isolated rehearsal passed: disabled gate no quota/mail; three-process/shared-backend race5 reservations/3 denials plus restart denial; global99 seed plus real HTTP100th slot, different-runtime global denial, one natural incident, first local monitor processes1/stub-alert1 and second0, no inquiry/real email. Unique owned schema removed. Both exact live packets remain unexecuted; verifier-binding repair still proposed, authoritative checker unchanged, Contactdisabled, currentmatrix33/35. Proof: playwright/.cache/phase27-08/contact-controls-ready-be1b8a83-3a7a-4e42-88bd-70c36abd2ba5/report.json.


Verifier-binding repair implemented 2026-10-12T06:51:07.882Z:191 actual checker/regression tests pass,0failed/skip; observer code captured and hash-bound independently of unchanged deployed588 source/archivedsix gates. Only two Contact rows support same-source no-mail variants with exact fresh authority, typed/hash-bound captures, real restriction/runtime/quota/scheduler evidence and baseline restoration. Ordinary33 identities unchanged. Current Contact tests stillunexecuted, flagsfalse, matrix33/35; no phase/count/requirement completion.


Current observer update 2026-10-12T07:32:41.134Z: strict separate protected-staging and live-window chronology implemented;206 actual checker/regression tests pass,0failed/skip. Fresh captured observer proof playwright/.cache/phase27-08/contact-binding-chronology-5e198bb9-5127-4891-8504-dc6c558adbde/observer-verification.json. The original191pass and intermediate203pass/2fixture-fail gates are retained as history. Exact588 application source/gates and33/35 current acceptance unchanged. A/B now READY, protected unsigned sign-in redirects confirmed, all public aliases remainCogas/5WY and savedflagsfalse. Inngest original Cogas receiver restored with14 unchanged functions after explicit owner approval. Temporary exact ContactDeny now published with fresh operator IP; operator503 confirmed; independent owner mobile report awaits provider correlation. First live window and owned quota cleanup require their exact bounded authority; global-budget test remains second andunexecuted.
