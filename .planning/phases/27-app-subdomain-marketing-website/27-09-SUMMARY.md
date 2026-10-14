---
phase: 27-app-subdomain-marketing-website
plan: "09"
status: complete
subsystem: production-boundaries-and-owner-observed-contact
tags: [vercel, nextjs, resend, inngest, contact, source-provenance]
requires:
  - phase: "27-08"
    provides: Approved reversible cutover and source-bound engineering evidence
provides:
  - Deployed app/marketing/Ops topology and observed transition/provider boundaries
  - Shared Contact ingress/global-budget-to-alert proofs with truthful variant/source labels
  - One current6bb controlled inquiry with named owner receipt, Reply-To and reply arrival
affects: [marketing-release, future-ui-review, public-contact-release]
requirements-completed: [DOMAIN-03, DOMAIN-01, DOMAIN-02, MKT-01, MKT-02, MKT-03, CONTACT-01]
key-files:
  created:
    - .planning/phases/27-app-subdomain-marketing-website/27-CONTACT-INQUIRY-DELIVERY-RESULT.md
    - .planning/phases/27-app-subdomain-marketing-website/27-CONTACT-INQUIRY-DELIVERY-RESULT.json
  modified:
    - .planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md
    - .planning/phases/27-app-subdomain-marketing-website/27-DEPLOYMENT-INVENTORY.md
coverage:
  - id: deployed-boundaries
    description: App/marketing/Ops partition, legacy/auth/service continuity and rollback
    requirement: DOMAIN-03
    verification:
      - kind: e2e
        ref: 27-EVIDENCE.md — preserved35scenario matrix and current OPS-11 release supplement
        status: pass
      - kind: other
        ref: node scripts/verify-phase27-evidence.mjs --stage deployed
        status: pass
    human_judgment: false
  - id: contact-round-trip
    description: One controlled inquiry arrives, Reply-To matches sender, normal reply reaches sender inbox
    requirement: CONTACT-01
    verification:
      - kind: manual_procedural
        ref: Direct owner answer Yes—all three confirmed for P27-CONTACT-20261014-6BB, recorded2026-10-14T00:13:29Z
        status: pass
      - kind: other
        ref: node scripts/verify-phase27-evidence.mjs --stage live
        status: pass
    human_judgment: true
    rationale: Named mailbox owner supplied the actual receipt/Reply-To/reply observations; Resend acceptance alone was insufficient
duration: multi-session
completed: 2026-10-14
---

# Plan09 — observed cutover and real Contact round trip

The public app and marketing origins are partitioned, Ops remains isolated, and the current6bb Contact inquiry completed the actual owner-confirmed email round trip. Contact remains disabled outside the completed controlled window by explicit owner direction.

Both original tasks are complete. The authorized cutovers and provider/session/legacy readbacks are retained with their actual deployment IDs and source cohorts. The final owner explicitly confirmed original support-inbox receipt, Reply addressed to the validated sender, and normal reply arrival in the sender inbox. Prepared, deployed and live evidence validation pass without changing the authoritative verifier.

## Actual execution and source boundaries

- Current disabled Production: webG8ZbTTydH4XrhQ5Kpx3XrVrH1cQA and Ops3qtketSXoaeS6JMoCKa5KJznqzkL, source6bb6e3f7. Fresh October14 read-only checks retain all8aliases/3false flags,quota0/pending0/retainedalert1 unchanged.
- The35/35 matrix and per-IP/global exhaustion-to-natural-alert proofs remain dated at58897a94. Contact code hashes are identical across588/6bb; current6bb staff/customer denials and the inquiry are separate direct proofs. No historical runtime row was relabelled.
- The successful inquiry used the sole protected native6bb build, with one browserPOST200 and Resend01a13655-48fc-7bf4-8d9e-b8fa22c37953. Original64.170second window stopped without sending when the trace omitted Git revision. The explicitly authorized source-join follow-up retained that null field, verified official same-ID Git metadata/native manifest and restoredG8 after69.242seconds.
- One fresh build/one27.872second cloud machine,5ContactPOSTs/5API GETs cumulatively across the two windows, one real inquiry. Exactly2matched quota rows were removed underlock27018,1; originalalert/Log/systemmitigations/14+1functions preserved. Only ownedT removed and official404 verified; only staging worktree archived.
- Owner confirms the reference and allthree mailbox outcomes on October14. No message was resent. The final reply was a normal owner-mailbox reply, not a second app transport send.

## Validation

Retained exact6bb full gates:3459unit passes with5existing skips,1510design passes with6existing skips,59built-server browser passes, TypeScript clean, ESLint0errors/33existing warnings, successful production build. The additional staff runtime proved38denials/upload403. The actual checker and controlled variants retain their own observer/source/capture digests. Fresh closure runs of the unchanged deployed and live validators pass. This documentation-only closure does not claim fresh execution of unchanged full suites.

Source/key links were reviewed: Proxy checks exact authorities and legacy routes; absolute app URLs wire same-tab handoffs; explicit hosting activation goes through server authority; Contact formPOST routes through handleContact to accepted Resend transport and fixed SUPPORT_EMAIL; shared database quota precedes mail; separate Inngest Contact monitor is independent of financial jobs.

## Decisions and deviations retained

Owner kept testing accounts unchanged; no account cleanup was executed. PayMongo satisfies the original safely-denied signature plus explicit destination alternative; successfulLIVE financial delivery/public-key attribution remain separate unproved finance gaps. The Didit diagnostic's33.430second closeout overrun remains a strict packet failure; functional observations are not retroactive timing approval. Every failed staging/window attempt and repaired source/observer discrepancy stays in history. The two nonnumbered repair runbooks have supporting completion records; they do not add numbered plans to the curated21.

## Outcome

Plan09 is complete. Phase goal verification and tracking closure follow this completion record. Public Contact, checkout/payout and binding-terms release remain on their existing owner-directed holds. UI refinement comments and deferred development/test observations are separate follow-up work, not hidden repairs or public release authorization.

Evidence:27-EVIDENCE.md,27-DEPLOYMENT-INVENTORY.md,27-CONTACT-INQUIRY-DELIVERY-RESULT.md/.json,27-OPS11-DISABLED-ROLLOUT-RESULT.md,27-PAYMONGO-ACCEPTANCE-RECONCILIATION.md and the retained bounded control/provider packets.
