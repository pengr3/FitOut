# Phase 27 — OPS-11 code repair verified

The staff/customer authorization repair is implemented and verified locally at **6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3**. **Production remains on58897a94, the existing staff account is unchanged, and Contact remains disabled.** The exact disabled rollout packet is prepared for review. This supporting gap repair does not complete another numbered plan or close Production acceptance.

## What changed and why

Current capability activation and staff conversion guard new grants, but older staff capabilities survived. The affected primary account987a6470-5c2a-4fab-8816-a1d4dd78209d, masked fr***@gmail.com, received staff access September14, then hosting September22 and booking September27. It has three old booking records and a saved payout destination. Its capability state is a separate owner decision; no account/financial/session record was edited.

Only positive customer-role equality now admits booking/hosting operations. A server-only reader checks the authoritative database role for mutation boundaries independently of session flags. Payout destination reads role with capability. All20 protected page/layout functions repeat the role check before protected reads/rendering. General account navigation hides customer capability switches for staff. Existing capability/ownership/validation/rate/origin/finance guards and background settlement/provider jobs remain intact.

The changes cover29 directly tested booking/cancellation, listing/photo/availability, request/verification, payout destination, organizer and reconciliation mutations plus the upload-signature route. Tests prove flags-on staff denial over a stale customer session, fail-closed null/unknown/deleted identities, positive customer admission, no business writes/provider calls and20 directly invoked page/layout denials. Seven fixture files now represent their customer roles explicitly or preserve the intended listing fault injection after the role read; guards were not relaxed for incomplete mocks.

## Exact source and engineering

- Clean manifest: a8b68c81fffbe53301b4c9b9566a80116ca02d2a16d5e3b563591098b293a499;1,113 source/config/test/assets entries.
- Git archive SHA256: 8feb311adca91cbbfa5c0eb27991ebc8f8f7c0e2dcc4cebc24f6484c8eb9a8ea.
- Canonical immutable export: .p27/22dfd169577d; run playwright/.cache/phase27-08/full-6bb6e3f7-14e13269-e36a-4a00-b19f-d6b703c3d34b.
- Every canonical gate's pre/post source guard passed. Separate built-server proof also kept the exact revision/manifest unchanged. No current runtime proof is attributed to a later documentation commit.

| Gate | Actual outcome |
|---|---|
| Unit |3,459 passed;5 existing skips;272 passed files and2 skipped files |
| Design |1,510 passed;6 existing skips;91 passed files |
| TypeScript |No diagnostics |
| ESLint |0 errors;33 existing warnings |
| Production build |Compiled;49/49 static pages generated |
| Canonical built-server browser |59 passed |
| Additional staff built-server proof |1 passed;38 HTML/Flight denials and upload403 |

The additional proof used a real local first-party flags-on staff session and an owned synthetic listing. All38 responses contained the neutral not-found body and withheld the protected listing sentinel;13 host HTML responses returned404, while6 booking/checkout HTML and19 Flight responses returned200 with that body. HTTP404 is therefore not claimed for every denial. There were no business writes after fixture setup, and exact local fixture cleanup completed. Status-only authorization checks are insufficient for these streaming responses.

## Production observations and boundary

Read-only primary census finds2 staff identities, one with both capabilitiestrue, and2 customer identities with roleuser; there are no null/unknown role rows. The affected account has no listings/host verification/ledger rows, one legacy payout row and one destination. Allthree booking windows have ended;2 remain historically recordedpending and1confirmed. No historical state is reclassified.

Read-only platform capture retains webCogas/Ops5WY, the eight Production aliases and owner's UI Preview. Web/Ops CONTACT_PRODUCTION_ENABLED=false and web CONTACT_INGRESS_VERIFICATION_MODE=false. No deployment, alias/environment/firewall/provider edit, Production fixture or mail was performed by this task.

The new code checks standing at authorization time; it does not claim serializing all business transactions against concurrent staff conversion. Existing conversion/activation lock semantics and regression tests remain unchanged. Sequential inline review is recorded; no independent-agent review is claimed.

## Preserved attempts and remaining work

The initial focused run passed30 checks, followed by52 blocking/Ops checks. The first broad affected run recorded137 failures,1,394 passes and5 existing skips across125 files: incomplete customer-session mocks and the shifted fault-injection read. The seven repaired suites passed176 checks. These earlier working-tree results are supporting history; the accepted preparation is the subsequent exact committed six-gate run and built-server proof above.

Prepare/approve/execute the exact disabled rollout, then observe its real staff/customer guard behavior and receiver recovery. Resolve the existing account's role/capability disposition separately without deleting or transferring financial records. Signed PayMongo/Didit delivery and actual Contact inquiry/Reply-To/reply remain separate scopes. Retain588's actual35/35 matrix,20/21 numbered plans,144/151 curated total, seven pending requirements and independent money/legal HOLDs until actual acceptance supports updates.

The JSON companion binds 57 actual capture files by SHA256. Original captures remain in the release worktree and byte-identical copies are retained in the shared workspace.

A separately hashed isolated harness also proves all20 flags-on staff page/layout functions deny before any protected select/execute. It ran one selected case (20 invocations), with nine unrelated copied cases filtered; it is supplementary proof, not another full suite. Application/source manifest stayed unchanged.

The unchanged phase validators report preparedPASS for the accepted588 records; deployedFAIL retains partial provider inventory and unresolved high threats; liveFAIL also retains actual inquiry/Reply-To/reply and its separate authority/enabled readback. Those old accepted packet approvals do not authorize the newly prepared6bb rollout. All final validator logs are captured.
