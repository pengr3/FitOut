# Actual Vercel ingress — passed restricted no-mail test

Owner approved the exact amended packet at source 58897a9459cf31b7c8937254dc17ab61ae0ce1d5: "Approve this exact packet". This completes the contact-trusted-ingress-per-ip observation in Phase27/Plan09. Public Contact remains disabled. Recorded 2026-10-11T07:53:43.353Z.

The owner phone check produced three recent deny events on Globe Telecoms, exact Production POST fitout.live/api/contact, under rule_phase_27_restricted_contact_test_j9IM6v. Its original IP differed from the private verifier IP. Only the past-hour events were accepted; the earlier D67 denial was not reused. Redacted dashboard evidence and screenshot are in the ignored evidence directory.

## Real shared quota across two deployed runtimes

Both fresh web Production builds used exact source58897a94 and captured both Contact flags true during creation. Automatic custom-domain assignment was verified disabled; the live domains remained on the disabled baseline during staging. Saved flags were restored false before the live test. Runtime reserved events plus503 responses verify the configured no-mail branch; that branch returns before inquiry transport.

- A: dpl_Dw7CfRqiPVYunAasT5A3SeRWNm6o, fitout-2tdv1x7y7-pengr3s-projects.vercel.app. Anonymous runtime marker 3e2fe769-149d-466b-be2b-a7bf8e4c1226.
- B: dpl_2GQFRsod2L9XsEegZJRKKRW7SMLT, fitout-kbxx0d3im-pengr3s-projects.vercel.app. Anonymous runtime marker 7f2480b6-ae0a-4671-969d-6c014d114af8.

| Request | Deployment | Actual response | Shared reservation |
| --- | --- | --- | --- |
| 1–3 | A | 503 each | reserved3 |
| 4–5 | B | 503 each | reserved2 more |
| 6 | B | 429, Retry-After844 | limited; counts stay5 |
| 7, forged XFF/X-Real-IP/x-vercel-forwarded-for | B | 429, Retry-After806 | limited; same fingerprints |

B handled only three valid requests before the shared denial, below its process-local five-attempt cap. Its distinct anonymous marker and immutable deployment ID establish a different runtime; request IDs alone were not used as instance evidence. The primary database was empty before the test. After A it contained exactly global and HMAC-IP rows with3 attempts each; after B both held5 attempts. The forged-header request created no extra IP row or reservation. Raw IPs and inquiries were not stored or logged.

Window initialization 2026-10-11T07:46:11.353Z; both original aliases confirmed restored 2026-10-11T07:48:42.291Z, approximately151 seconds, below five minutes. Seven enabled-window Contact POSTs and one disabled-recovery Contact POST, below12. No optional wrong-Origin probe. Five reservations, two shared denials, zero inquiry transport branch executions.

## Restoration and cleanup

Vercel's direct rollback API returned402 because Hobby permits only the previous Production rollback. The already-authorized exact baseline dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68 / b61cb4a43c8dd4c10e7444014fb66646aba36ec5 was restored via promotion; both fitout.live and app.fitout.live readbacks match. No billing upgrade. Original quota fingerprints matched after spoof; a transaction acquired advisory lock(27018,1) and deleted exactly two rows only when keys, full attempts JSON, expiry timestamps and total row count matched. Cleanup 2026-10-11T07:49:48.584Z. Final quota0, alert1 and pending0.

Both saved web flags false; Ops Contact flag and deployment unchanged. Four public health reads200, ordinary Contact503, unsigned Contact scheduler POST401 without redirect. Temporary Deny rule disabled and published; original Log rule retained. Web automatic custom-domain assignment restoredfalse and checked through the Production redeploy dialog without submitting another build. Contact is disabled independently of the temporary firewall rule.

## Scheduler reconciliation and limits

Production staging automatically refreshed fitout registration to candidate B at07:42:25UTC. The approved disabled baseline-source reconciliation build dpl_RrmvYS6fTKedEcQKk1cxYLEtKNqB / b61cb4a4 then refreshed it at07:44:18UTC to https://fitout-b08esines-pengr3s-projects.vercel.app/api/inngest. All14 original function identities/triggers are retained, SDK4.13.0; source comparison changes only src/lib/contact.ts. The separate fitout-contact-alerts destination remains the apex signed receiver. Provider URL queries were redacted. No manual financial job invocation, financial source/signature change, new incident, inquiry email, database outage or real global exhaustion was induced.

This is one scoped newer-source observation, added to29 historical D67 matrix passes, yielding30/35 dated observations. It does not certify all scenarios on the current baseline, full topology/session/provider rollback, genuine issued auth links, staff-only capability denial, actual global-exhaustion-to-alert chain, provider inventory or real Contact inbox/Reply-To/reply. Phase27/Plan09 remain incomplete;20/21 phase plans,144/151 curated; all7requirements pending and money/legal HOLDs retained.

Evidence: contact-ingress-live-window-58897a94.json (each response/request ID), contact-ingress-runtime-A-58897a94.txt, contact-ingress-runtime-B-58897a94.txt, private contact-ingress-owned-fingerprints-58897a94.json, contact-ingress-final-proof-58897a94.json, contact-current-mobile-denial-20261011.txt/.png, contact-ingress-registration-baseline-restored-20261011.txt, contact-alert-release-runtime.json and contact-ingress-final-firewall-20261011.png, all in playwright/.cache/phase27-08. Local source verification retained237 Contact/routing tests,1510 design passes/6skip, types/lint pass; no repeated suite was needed for these documentation-only result edits.


Offline live validator rerun after recording this result still FAILs. It specifically rejects contact-trusted-ingress-per-ip for candidate identity mismatch: the independently approved58897a94 scoped test is newer than the D67 engineering/cutover packet. The actual ingress test passed; it does not supply single-release acceptance. Other reported gaps are partial external inventory/high threats, staff capability denial, genuine issued verification/reset links, aggregate quota-to-alert chain, full rollback/Contact controls, actual inquiry receipt/Reply-To/reply and controlled inquiry authority. Preserve these failures and reconcile the release packet rather than weakening the validator or relabeling historical source evidence.
