# Phase 27 — PayMongo and Didit runtime configuration proof

**Prepared, awaiting owner approval.** Packet `p27-provider-runtime-20261013`, prepared 2026-10-13T08:04:52.774Z. Contact stays disabled throughout. Preparation made zero provider calls, deployments, Contact POSTs or application-release changes.

This checks which provider configuration the current web Production environment actually uses without asking the owner to recall secret values. It reports mode labels, nonsecret identifiers, fixed destinations and comparison booleans. Credentials and signing secrets remain inside the server process. No payment, refund, merchant activation, identity session or test webhook is created.

## Exact scope and bounds

| Item | Bound |
|---|---|
| Source | Accepted `58897a9459cf31b7c8937254dc17ab61ae0ce1d5`, manifest `8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a`, plus the three reviewed diagnostic files below |
| Target | Team `team_EZAfhT8qJ6msqrCzas3rvdjG`, web project `prj_my7iigeFoojFO2QmXYYfr49p8uiz` only |
| Staging | At most one new protected Production-target build, `--prod --skip-domain`; no alias assignment, promotion or replacement of the serving release |
| Build deadline | Wait at most 30 minutes from submission; unknown creation outcome is investigated read-only, never resubmitted |
| Diagnostic lease | Hard expiry at most 60 minutes after build submission; each signed request lasts at most 5 minutes and names the actual immutable deployment host |
| Diagnostic requests | Three GETs total: unsigned denial, one signed configuration read, expired-signature denial; no automatic retries |
| Provider requests | At most four GETs from the one signed read: one PayMongo webhook; one Didit workflow; one Didit destination list; one uniquely matched Didit destination detail |
| Provider transport | Fixed official HTTPS hosts, no redirects, no retries, 5-second deadline per GET, maximum 256 KiB per response; whole route maximum 30 seconds |
| Contact | Both `CONTACT_PRODUCTION_ENABLED` and `CONTACT_INGRESS_VERIFICATION_MODE` must equal literal `false`; zero Contact POSTs, fixture rows or mail |
| Other changes | No provider settings, credentials, global environment variables, firewall rules, DNS, Ops deployment, database rows, identity decisions or financial jobs changed/invoked |
| Integration recovery | If Vercel automatically moves Inngest's `fitout` registration, restore only its original receiver, preserving the private managed query, and verify the same 14 functions; separate Contact monitor remains one function |

Public aliases remain web `dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg` and Ops `dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4`. The diagnostic is only at the new protected immutable deployment's `/api/phase27-provider-proof`. Its guard rejects custom aliases, other hosts, queries, missing or invalid signatures, expired claims, wrong source, Preview, HEAD/POST, and enabled/missing Contact flags. Deployment Protection remains enabled.

## What will be observed

**PayMongo:** classify the runtime secret/public keys as live, test or unknown; report mode agreement. Retrieve exactly `hook_6UWbRKJQBt1CUnuhRfoFC6XE` using the runtime secret key. Compare its ID/type, enabled state, mode, apex destination and exact five subscribed events against the retained inventory. Compare the returned `secret_key` with runtime `PAYMONGO_WEBHOOK_SECRET` privately using constant-time equality, returning only a boolean. This attributes the secret key to the registered hook; public-key account correspondence is not established by matching mode alone.

**Didit:** report effective `DIDIT_ENVIRONMENT` with the accepted webhook handler's actual production default (`live` only when absent), configured workflow UUID, and the callback computed by accepted `absoluteAppUrl('/host/verify')`. Retrieve that exact workflow with the runtime API key; compare its ID, expected label and archived state. List the same key's webhook destinations and select only a unique exact `https://fitout.live/api/didit/webhook` destination with a valid UUID. Retrieve it once and compare ID, URL, enabled state, v3, exactly `status.updated`, and its `secret_shared_key` against runtime `DIDIT_WEBHOOK_SECRET` privately. The response contains only IDs, enums, HTTP statuses and booleans. Match the full workflow/destination UUIDs read-only to the console's organization/application; a displayed prefix alone cannot establish application correspondence.

Current console observation is CLMC(Sandbox)/Test, application `8c987e39-86bd-452f-a18b-a5153beda380` in organization `fe0feee2-9b63-4e40-90f8-36dc06890879`, workflow prefix `63f24717`. If runtime uses another workflow/environment, record the finding and stop before any corrective configuration action. A provider 401/403/404, absent signing secret, duplicate destination or mismatch is an unresolved result, not permission to broaden reads, rotate keys or send test events.

## Preparation and reviewed artifacts

Reviewed files live in [runtime-proof](runtime-proof/). Only `route.ts`, `probe.mjs` and a public/inert `probe-config.json` are added under `src/app/api/phase27-provider-proof/` in the isolated export. They are not installed into the shared app or serving release. The wrapper uses the existing app-origin helper and imports no database, authentication session, payment handler, identity-session creator or Inngest function.

Artifact bundle SHA-256: `1238a9bedb6b3ef7862b8be925e13596bafe5106387f2623473e18a88d6c7cb2`.

| Artifact | SHA-256 |
|---|---|
| probe.mjs | b6a09e472f2bfc9c738f86de15f2a944f1046f7266b3acf21a4c9d945291da2a |
| route.ts | 06891a030b8d0b53795e35a901a0344643c2f88ad78c0213a8f1791941ca9149 |
| probe-config.json (prepared/inert) | 9a5c4f59eb8fd130fcd7131ad524631c33a75a6f1caf23ca51479fbe4f9cd980 |
| driver.mjs | 905cc7e832d5593c65fd3e1d8565ad29fa67f745cd8a5cee63ddc13287015a80 |
| prepare-export.mjs | efc2837578142377c9f3905a791d65747a4ae2e47430734bfe9e80aeb4ee4f59 |
| probe.test.mjs | 3ef8998d0238f9662c4058717794081b9bee6ea3cafa19cf186c07777171dc54 |
| driver.test.mjs | d64f0e453fd42a0e5cf91a05042974bdc302c773141196d8305c99dfd7de1810 |

All 34 offline checks pass, including denied requests making zero provider calls, secret-free output, ambiguity, error/timeout/oversized body containment, warm-instance replay denial, prepared-authority refusal, wrong deployment/protection refusal, durable no-retry marker and unknown request outcome refusal. The actual exported Next route typechecks with the installed Next/TypeScript declarations. This is not a complete new release build or live provider proof; the approved remote staged build must itself reach READY before any diagnostic request.

The inert export is `.p27/provider-proof-prepared-v2-20261013`. All 2,404 original files match their accepted Git blob hashes; archive SHA-256 `3f53df5520314a308ff5699918b5c7edf1f58750618969f9a4ceee4e6fa512fd`. The first export failed because Windows archive settings converted line endings; it is retained. The helper now uses command-scoped LF settings and verifies every blob. No shared Git setting changed.

Actual preparation capture: `playwright/.cache/phase27-08/provider-runtime-prepared/prepared-result.json`, with test TAP, isolated typecheck configuration, export result and hashes. No real credentials were read, copied or stored for these tests.

## Execution order after exact approval

1. Record owner approval with packet ID, source and time. Recheck the artifact hashes. Read the current serving pair, aliases, saved false flags, protection, provider env metadata and both Inngest registrations. Preserve the original financial receiver's managed query privately. If any pin, provider entry ID/target/update time, source, flag or function set drifts, stop and record it.
2. Generate one ephemeral Ed25519 key pair in operator-process memory. The private key never goes to arguments, logs, project settings or disk. Create one fresh accepted-source export using `prepareExport`, with recorded approval; change only the diagnostic config's `approved`, `publicKey` and absolute `notAfter` fields. Set its maximum lease to 60 minutes from build submission, hash the final three added files, and bind those hashes to this packet. The public key is not a credential.
3. Link only that owned export to the exact existing web/team IDs and stage once with `--prod --skip-domain`, keeping both Contact flags false at build/runtime. Inherit provider configuration directly from the existing Production environment; do not pull, recreate or override provider keys. Explicitly retain no custom-domain assignment. Inspect the actual new deployment ID, target, host, protection and READY state; then compare env metadata again.
4. Reconcile any automatic Inngest destination refresh **before probing**. Restore `fitout` to `https://fitout-6dr93opgm-pengr3s-projects.vercel.app/api/inngest` with its existing managed query preserved privately. Verify exactly the prior 14 function IDs/triggers and separate `fitout-contact-alerts` one function/cron. Do not invoke/rerun financial jobs. If restoration fails, stop diagnostic work and report the recovery requirement; do not silently accept the staged receiver.
5. Run `runProof` once using the actual verified deployment and in-memory private key. It writes an exclusive attempt marker before its first GET; a crash or unknown outcome forbids repeating the attempt. Use existing authenticated `vercel curl` access; signed operator headers go through curl stdin, not shell/process arguments. No debug, trace or unredacted header/body capture. Protection access failures stop the attempt without changing protection or Trusted Sources.
6. Save only the validated allowlisted report and sanitized request status/actual deployment references. Match Didit full IDs to read-only console metadata. Recheck baseline aliases/false flags and the 14+1 registrations, immediately restore original registration again if delayed integration drift occurred, and retain the protected diagnostic build with hard expiry. Drop the ephemeral private key and signed claims from memory; no public promotion or deployment deletion is included. No rows, mail or provider fixtures exist to clean up.

The lease expires without operator action. Warm-instance consumption is a local replay guard only; it is not a distributed request counter. The exclusive driver attempt marker, one private signing key and no-retry execution enforce this packet's operator request cap. The final deployment may remain protected for audit after expiry; obtaining access again or rerunning is outside this packet.

## Evidence boundaries and remaining gaps

This measures **a new diagnostic extension using current Production project configuration**, not the unmodified Cogas process. Serving-release correspondence additionally requires source identity, unchanged provider variable metadata predating Cogas, inherited staging configuration, actual deployment captures and the retained console mapping. Metadata continuity is supporting evidence, not decrypted historic secret evidence. If historic correspondence cannot be supported, leave it explicitly unresolved rather than relabel the diagnostic result as a direct Cogas observation.

Matching runtime/provider signing secrets establishes configuration correspondence. It does **not** prove successful signed provider delivery or event processing. No success row for those delivery gates is created by this packet. The PayMongo harmless signed-delivery requirement remains pending until separately scoped or supported by an existing exact-release delivery. Didit environment acceptance versus console Test mode is reviewed from observed results, never changed automatically.

35/35 matrix, 20/21 numbered plans, seven pending requirements and checkout/payout/legal HOLDs remain unchanged. OPS-11 and actual inquiry/Reply-To/reply are separate work. Contact remains disabled.

Technical contracts were checked against [PayMongo retrieve webhook](https://docs.paymongo.com/reference/retrieve-a-webhook), [webhook resource](https://docs.paymongo.com/do/reference/webhook-resource), [Didit retrieve workflow](https://docs.didit.me/management-api/workflows/get), [list destinations](https://docs.didit.me/management-api/webhook/list-destinations), and [destination detail](https://docs.didit.me/management-api/webhook/get-destination), plus the installed Next route/environment guides.

Approval requested: **“Approve this exact protected provider-runtime packet: one staged build, three diagnostic GETs, at most four provider GETs and original Inngest receiver restoration; keep Contact disabled.”**

```json
{
  "schemaVersion": 1,
  "id": "p27-provider-runtime-20261013",
  "status": "prepared-awaiting-owner-approval",
  "preparedAt": "2026-10-13T08:04:52.774Z",
  "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "manifest": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
  "bundleSha256": "1238a9bedb6b3ef7862b8be925e13596bafe5106387f2623473e18a88d6c7cb2",
  "baselineId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
  "opsId": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
  "projectId": "prj_my7iigeFoojFO2QmXYYfr49p8uiz",
  "teamId": "team_EZAfhT8qJ6msqrCzas3rvdjG",
  "limits": { "productionBuilds": 1, "diagnosticGets": 3, "providerGets": 4, "buildWaitSeconds": 1800, "hardLeaseSeconds": 3600, "signedClaimSeconds": 300, "contactPosts": 0, "providerWrites": 0 },
  "staging": { "id": null, "protected": true, "autoAssignCustomDomains": false, "providerOverrides": false, "savedEnvChanges": false },
  "approval": { "status": "prepared", "packetId": "p27-provider-runtime-20261013", "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5", "approvedAt": null, "ownerInstruction": null },
  "contactDisabled": true,
  "observedRuntime": null,
  "liveAccepted": false
}
```
