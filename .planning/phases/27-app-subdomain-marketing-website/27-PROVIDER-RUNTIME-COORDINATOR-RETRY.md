# Phase 27 — repaired provider runtime coordinator retry

**Prepared; fresh approval required.** Attempt `p27-provider-runtime-coordinator-retry-20261013` under packet `p27-provider-runtime-20261013`. This replaces the failed local signing handoff. It does not reuse the first packet's exhausted build allowance.

The first attempt created one protected READY build but sent zero diagnostic/provider requests. Local IPC was denied. Public domains stayed on the disabled Cogas/5WY pair; the approved generated-alias alignment and original Inngest restoration are verified. See `27-PROVIDER-RUNTIME-ATTEMPT-RESULT.md` for the retained failure history.

## Exact amended execution

Use the same accepted588 base and unchanged three diagnostic route/module/config files. In one authorized Node process, `run-coordinator.mjs` creates the ephemeral Ed25519 key, exports only its public key into the isolated source, stages once, retains the private KeyObject while browser restoration/readbacks occur, and runs the unchanged signed driver. The private key is never exported, written, logged or transferred through IPC. The process drops its reference on exit. It writes only public configuration, artifact hashes, IDs, comparison output and request status journals.

| Limit | Fresh attempt |
|---|---|
| Build | One new protected web Production-target build, accepted588 plus reviewed diagnostic; `--prod --skip-domain`, current Production provider inheritance, both Contact flagsfalse |
| Build wait | At most30minutes; unknown creation outcome is investigated read-only with packet/attempt metadata, never resubmitted |
| Lease | At most60minutes from coordinator key creation; each signed claim at most5minutes; at least5minutes of lease headroom before reads |
| Diagnostic requests | Three GETs: unsigned denial, one signed read, expired-claim denial; no retries or extra health probes to the diagnostic route |
| Provider reads | At mostfour GETs, exactly the original packet's PayMongo hook and Didit workflow/list/destination detail |
| Generated alias | If Vercel assigns only `fitout-web-pengr3s-projects.vercel.app` to this new build, point that one alias back to Cogas and verify it; no other alias assignment/promotion permitted |
| Inngest | Restore only original immutable Cogas receiver with its existing managed query preserved; verify the same14 function IDs/triggers and separate1 Contact monitor; no manual financial job |
| Public Contact | Disabled at all times; zero Contact POSTs, inquiry/alert mail, quota fixtures or database writes |
| Other exclusions | No provider mutations, keys/credential rotation, workflow or environment switching, identity session, test webhook, payment/refund/merchant event, Ops rollout, firewall or DNS edit |

Before key creation, the coordinator requires exact fresh owner authority, an exclusive no-restart marker, all reviewed artifact hashes, fresh14+1 baseline registration readbacks, exact public/generated alias pins, both web false flags and Ops false Contact flag, unchanged seven provider-variable metadata entries and project protection. `stageOnce` occurs only once. After READY it validates actual project/team/attempt/base metadata, aligns only the explicitly approved generated alias if needed, and verifies zero aliases on the new build. It waits for a nonsecret `reconciled.json` tied to the actual deployment ID and observed after staging before allowing the three requests. The owner enters login credentials directly if needed; no key handoff is requested.

The existing original protected build is retained, with no usable signing key and its original hard expiry. It is not reused, deleted or promoted. The new protected alias-free build is retained with its own expiry. Unknown stage outcome, remote build failure, metadata/flag drift, reconciliation failure, expiry or unknown request outcome closes this attempt without another build/request retry. If a failed stage left the generated alias on the exactly identified owned build, only its approved Cogas alignment is permitted; financial receiver restoration still uses the original captured managed query. Record actual recovery readbacks before concluding.

## Local validation and source binding

Reviewed bundle SHA-256 `328d42a3767c0d28f26ede7603a7d2f7cf5afac152c46e4a57a2ee8d65cbbc37`; ten artifacts in `runtime-proof/`, listed in `playwright/.cache/phase27-08/provider-runtime-coordinator-retry-20261013/reviewed-artifacts.json`. The unchanged probe, route, driver, export helper and inert config retain their original hashes. Added coordinator, lifecycle tests and concrete CLI adapter are included in this new bundle.

All43 offline checks pass: original34 plus9 coordinator cases. The same-process case proves that the generated public key verifies the actual driver signatures without private-key export or IPC; simulated preflight/export/staging/readiness/reconciliation/request failures never retry. The concrete live runner refuses prepared/prior authority before any CLI action. Adapter syntax check passes. The exported route's earlier installed-Next typecheck remains valid because its bytes are unchanged. The future remote build still must reach READY; no live runtime result is claimed now.

Future operator command (only after recording this fresh exact approval and fresh registration readback):

```powershell
& 'C:\Users\Admin\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe' 'C:\Users\Admin\Roaming\FitOut\.planning\phases\27-app-subdomain-marketing-website\runtime-proof\run-coordinator.mjs'
```

Keep that process running while using the Codex browser to restore the receiver. The handoff file contains only actual deployment ID, observation time, originalReceiverVerified, financialFunctions14 and contactFunctions1. It contains no managed query, signing key or signed headers. After execution, capture full runtime comparison output, exact Didit console workflow/destination ID correspondence, unchanged variables, baseline false flags/public pair, generated alias and14+1 registrations. Bind original archive plus final three added-file hashes rather than Vercel's inferred parent-checkout Git SHA. Drop the key reference and run the honest phase evidence checks; configuration equality does not supply successful signed delivery, inquiry/reply or OPS-11 acceptance.

Approval requested: **“Approve this exact single-process provider-runtime retry: one fresh protected build, three diagnostic GETs, four provider GETs maximum, generated-alias Cogas alignment and original Inngest restoration; keep Contact disabled.”**

```json
{
  "schemaVersion":1,
  "status":"prepared-awaiting-fresh-approval",
  "packetId":"p27-provider-runtime-20261013",
  "attemptId":"p27-provider-runtime-coordinator-retry-20261013",
  "source":"58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "manifest":"8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
  "bundleSha256":"328d42a3767c0d28f26ede7603a7d2f7cf5afac152c46e4a57a2ee8d65cbbc37",
  "limits":{"productionBuilds":1,"diagnosticGets":3,"providerGets":4,"buildWaitSeconds":1800,"hardLeaseSeconds":3600,"contactPosts":0},
  "generatedAlias":"fitout-web-pengr3s-projects.vercel.app",
  "generatedAliasTarget":"dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
  "approvedAt":null,
  "ownerInstruction":null,
  "contactDisabled":true,
  "observedRuntime":null
}
```
