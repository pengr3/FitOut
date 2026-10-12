# Phase27 — Contact test deployment-binding gap

Status: confirmed constraint; proposed repair not implemented. No acceptance validator or application source changed.

Current source58897a94, web Cogas, Contactfalse. src/lib/contact.ts checks the production enable flag before trusted IP, local/shared rate limits, and the verification-mode branch. Vercel builds capture env configuration per deployment. A request to the current disabled immutable build cannot exercise quota enforcement.

The offline validator scripts/verify-phase27-evidence.mjs requires every customer matrix row deploymentId equal live.deployments.customer.id (currently Cogas). A correctly recorded enabled no-mail variant has a different actual immutable deployment ID and is rejected. Setting its row to Cogas would fabricate deployment provenance. Changing the current candidate to a temporary enabled build would invalidate the existing33 real observations and contradict the restored disabled release. The strict current contract cannot be fulfilled by this test topology.

The previous scoped per-IP test already supplies exact588 source, two actual distinct runtimes, genuine Vercel ingress and strict quota fingerprints; it restored the earlier b61 baseline. Retain those actual IDs/source/time. Do not repeat a live window merely to relabel history. Global exhaustion-to-alert is still genuinely missing as one causal live flow.

Proposed repair for planning: permit only these two Contact rows to carry a typed controlled-test binding: actual test deployment IDs, exact candidate revision and source manifest, baseline/current restoration IDs, explicit deployment-config diff limited to two Contact flags, independent actual WAF restriction/denial, runtime marker/request/quota fingerprints, current packet authority, bounded timer/restoration/cleanup, fixed control-alert recipient and matched scheduler/provider evidence. Keep all ordinary marketing/auth/provider rows strictly bound to the current immutable customer/ops/preview IDs. Reject mismatched source, unapproved config, arbitrary historical test IDs, absent distinct runtimes, unproved no-mail mode, incomplete restoration, nonzero inquiry delivery, missing or duplicate alert, and unknown cleanup.

A validator change is itself in SOURCE_SCOPE (scripts/) and changes the captured manifest. Therefore a proper repair needs a planned code/test change, meaningful negative validator tests, a new exact source capture and six engineering gates before new single-source acceptance. Do not silently patch the checker, weaken existing assertions or reuse588 engineering digests for changed verification code. Existing33 observations and approved completed packets remain their recorded history.

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
