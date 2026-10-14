# Phase 27 — bounded OPS-11 repair

Supporting Plan 09 gap work, authorized by the owner's October 13 instruction to continue with the recommended staff access repair. This is not another numbered phase plan. Contact remains disabled. The serving web/Ops pair remains source 58897a9459cf31b7c8937254dc17ab61ae0ce1d5 until an exact reviewed source rollout is authorized and observed.

## Confirmed problem and provenance

OPS-11/D-275 requires staff identities to be separate from customer booking/hosting capabilities. Current activation and staff grant/conversion code enforces the rule for new writes, but existing booking, hosting, upload and organizer paths include session/ownership/capability guards without a positive customer-role check.

Read-only primary observations on misty-bar-13534461 / br-divine-lake-b3in9zag / neondb identify exactly one flags-on staff account: 987a6470-5c2a-4fab-8816-a1d4dd78209d, masked fr***@gmail.com. Staff grant succeeded September 14; hosting activation succeeded September 22; booking activation succeeded September 27. The account has three old booking records, no listings, no host verification, one legacy payout row, one payout destination and no payout ledger rows. It does not match the documented host@fitout.test seed or the owner's support Gmail. Both flags remain true. Its three bookings have ended; two remain recorded as pending and one confirmed. No historical financial state is repaired or reclassified here.

Capture: playwright/.cache/phase27-08/ops11-repair-20261013/primary-provenance.json. The two preliminary count queries that referenced nonexistent columns failed read-only and made no changes. No account, session, fixture, mail, provider, alias or Contact mutation was performed in Production.

## Implementation and verification

1. Add one positive customer role predicate. Staff, null and unknown roles fail closed.
2. Add a server-only identity reader that resolves current database standing independently of session capability flags. Apply it to direct booking/cancellation, host request/verification, listing/photo/availability, group organizer, payment reconciliation and upload-signature boundaries. Payout destination reads role alongside its existing authoritative capability read.
3. Repeat customer-role checks in all 20 protected page/layout functions before protected reads or rendering. Keep existing capability, ownership, validation, rate, origin and finance guards. Suppress customer capability switches for staff in the general account shell. Public browsing, profile access, guest RSVP and background settlement/provider receivers retain their existing contracts.
4. Behavior tests use isolated local fitout_test only. Prove flags-on staff denial despite a stale customer session, null/unknown/deleted identity denial, valid customer admission, 29 direct mutation boundaries, upload refusal and 20 directly invoked page/layout functions. Compare mutations with anonymous refusal and check no business writes/provider calls. Preserve customer UI fixtures by supplying their real role; do not loosen the guard for incomplete mocks.
5. Commit the isolated source, then run the six canonical immutable-source engineering gates. Add a separate source-bound built-server HTML/Flight test with a real local first-party flags-on staff session and exact synthetic cleanup. Report streaming status separately from protected-data denial. No independent-agent review is claimed; execution/review is inline.

## Release and account decision

Prepare a concrete source-bound disabled web/Ops rollout/recovery packet only after local gates succeed. The old 588 matrix cannot be relabeled as live proof of a new application revision. Contact flags remain false, public topology/provider settings remain the baseline, and any automatic Inngest registration side effect must be restored and checked against the same 14 financial plus one separate Contact function. Do not invoke jobs or financial actions.

The existing flags-on account is a separate owner decision. Recommended repair is to retain its staff role and clear only both customer capability flags using the existing role-policy lock and an attributed audit. Its bookings, payout records, credentials and sessions must not be deleted or transferred. No account write is authorized by this preparation; identify the exact target/current state and receive the concrete account disposition before any change. Do not demote staff, migrate records or silently clear historical state.

The new guards check standing at the authorization decision; they do not claim serializing every business transaction against a concurrent staff conversion. Existing activation/conversion lock tests remain relevant. Production acceptance, Plan 09, all seven requirements and the independent checkout/payout/legal HOLDs remain open.
