# Phase 27 — observed provider runtime configuration

**Bounded configuration proof completed. Contact remains disabled.** Runtime observation 2026-10-13T08:58:31.086Z; final platform readback 09:02:22.710Z. PayMongo uses LIVE secret/public modes; Didit accepts SANDBOX and uses the expected FitOut Host Verification workflow. Both registered webhook signing secrets match the runtime configuration privately. No financial event, identity session, test webhook, Contact submission or mail was sent.

| Provider check | Actual result |
|---|---|
| PayMongo runtime modes | secret=live, public=live, modesAgree=true |
| PayMongo hook | GET200; exact `hook_6UWbRKJQBt1CUnuhRfoFC6XE`, enabled, apex `/api/paymongo/webhook`, exact five events and provider LIVE mode match |
| PayMongo signing | Runtime webhook secret equals that hook's returned signing secret; boolean only, no secret output |
| Didit environment | sandbox, explicitly configured; production default was not used |
| Didit workflow | GET200; exact `63f24717-7167-4cee-867e-688284d4c2ee`, expected label, not archived |
| Didit callback | Accepted app-origin helper returns `https://app.fitout.live/host/verify` |
| Didit destination | List200, one exact apex destination; detail200 for `e887a8c1-7d92-4a14-9fc1-1a7f7efae154`, enabled, v3, exactly status.updated |
| Didit signing | Runtime secret equals the returned destination secret; boolean only |
| Operator boundaries | Unsigned GET404; signed GET200; expired signed GET404. Exactly three requests, four successful provider GET statuses, no retries |

The complete workflow UUID was independently observed in the console under organization `fe0feee2-9b63-4e40-90f8-36dc06890879` and application `8c987e39-86bd-452f-a18b-a5153beda380` (CLMC Sandbox). The console retained Test mode and the Active apex destination. Application correspondence follows the exact globally identified workflow plus application-scoped API-key retrieval, rather than a truncated prefix. The destination UUID came from the authenticated provider API; the console stats view does not independently display it. Its old Test-delivery summary remains 12 failures, last September 23, 2026; that is historical delivery debt, not a new failed check.

## Actual build, authority and recovery

Owner approved the exact coordinator retry after the first build's local key-handoff failure. Fresh build `dpl_7GKcUipbZpTX5H13i9QfCGcySWtb`, `fitout-9ygo7ybm3-pengr3s-projects.vercel.app`, is protected, READY and alias-free. Its accepted base is 58897a9459cf31b7c8937254dc17ab61ae0ce1d5, manifest 8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a, plus the three reviewed diagnostic files. All 2,404 original Git blobs match. Archive SHA-256 3f53df5520314a308ff5699918b5c7edf1f58750618969f9a4ceee4e6fa512fd. Final added files:

- route.ts:06891a030b8d0b53795e35a901a0344643c2f88ad78c0213a8f1791941ca9149
- probe.mjs:b6a09e472f2bfc9c738f86de15f2a944f1046f7266b3acf21a4c9d945291da2a
- public config:9ca0f70c06e4646de1020258b2f483387c102a7b8cf4a2b643e3ced2a9813898

Vercel inferred the parent checkout's 1ab05b8 Git SHA; the accepted base is established by verified archive blobs and explicit source/attempt metadata, not that inferred SHA. The diagnostic extension is not promoted or substituted for the serving release.

The coordinator's first local preflight falsely rejected Vercel's actual protection object because the API omits a synthetic enabled field. Before any key, export, build or request, read-only inspection proved the same team/project and `deploymentType:all_except_custom_domains`. The parser was corrected to accept that representation while rejecting null, explicitfalse, weaker scope and wrong owner/project. The zero-action refusal and original marker are retained. The still-unused approved one-build allowance was resumed; a separate exclusive build marker now guards actual submission. Five added security-boundary checks bring the offline suite to48 passing; final helper bundle 42f7c9628a1d8914f78fe4602c57c9a6e9a05d85fdd03bebacf273fcbdcfb312. This repair changed only the local observer, not the approved server probe or live action limits.

On READY, the explicitly approved generated alias was aligned to Cogas and verified. Automatic Inngest refresh moved `fitout` to the fresh build at 08:52:27Z. The original immutable Cogas receiver was restored with its exact private managed query. All 14 function IDs and all 16 event/cron trigger entries match the original capture; the two ops-alert-digest cron entries changed visible/hidden ordering only. Separate Contact app retained one function. Nonsecret reconciliation readback released the driver at 08:58:00.633Z, after recovery. Final receiver/monitor readbacks retained 14+1; no financial job was manually invoked.

Request journal: 08:58:20.894–26.608Z404;08:58:26.610–33.039Z200;08:58:33.041–36.928Z404. The coordinator exited successfully and dropped its private KeyObject reference without exporting, saving or logging it. Only public configuration and allowlisted results remain. Hard lease ends09:49:30.794Z. Both diagnostic builds remain protected and alias-free; no deletion or promotion occurred.

Final web remains `dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg`; Ops `dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4`. Apex/app/retired fallback and generated web alias point to Cogas; Ops unchanged. Both web Contact flags and Ops Contact flag remainfalse. Seven provider variable IDs/scopes/update times match before/after and predate Cogas. No provider key, workflow/environment setting, firewall, DNS or database fixture changed.

## Scope of acceptance and next gaps

This is direct observation of current Production project configuration on the protected staged extension. Serving-release correspondence has supporting unchanged-metadata/source/inheritance evidence; it is not historic plaintext secret retrieval or a direct Cogas diagnostic. PayMongo's public key is proven LIVE-mode only, not independently attributed to the same account as the secret key.

Both runtime-configuration uncertainties are resolved within that explicit scope. Successful signed provider delivery/processing remains unproved. The PayMongo inventory row retains its separately scoped harmless signed nonfinancial delivery requirement. The Didit row retains historical Test-delivery/retry diagnosis and a suitable current signed-delivery proof; no real identity session is required by inventory, and none was created. No automatic switch from Didit sandbox to live is authorized. Resend inquiry/Reply-To/reply and OPS-11 remain separate gaps.

Evidence cache: `playwright/.cache/phase27-08/provider-runtime-coordinator-retry-20261013/`. It contains actual authority, parser refusal/repair history,48-test TAP, reviewed hashes, source export/final added hashes, actual READY deployment, recovered registrations, exact3-request journal, allowlisted runtime-proof.json, process finish record and final platform readback. Provider secrets, signed request headers, managed query and private signing key are absent from captures.

Matrix 35/35, 20/21 plans, seven pending requirements and money/legal HOLDs remain unchanged. Provider rows remainpartial for their explicit delivery gaps; this report does not complete Phase27.
