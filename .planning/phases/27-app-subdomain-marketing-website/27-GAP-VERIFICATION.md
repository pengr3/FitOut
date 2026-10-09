# D-23 candidate local verification — October10

Revision `b8358b11a63aadef2c84c9eb64b78be0a07ddcd4`; manifest `e51bbc5b9df9c302bf354eb1e48a9c2ac0080e2d3c2cbba321f35ec992ec9467`. All six guarded full gates pass; migration SQL/journal/snapshot and quota source are bound. Full report: `playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/gates/report.json`. Fresh cold proof: `playwright/.cache/phase27-08/full-b8358b11-e6a236dc-6265-43d2-badc-2b5d97eaeda3/final-cold-22c5c0cf-c25e-4012-aaa2-062cc7f9deeb/report.json`.

| Gate | Actual outcome |
|---|---|
| vitest | 260 files passed, 2 existing skips; 3359 tests passed, 5 existing skips |
| vitest | 91 files passed; 1510 tests passed, 6 existing skips |
| typescript | No TypeScript diagnostics. |
| eslint | 33 problems (0 errors, 33 warnings) |
| next-build | ✓ Compiled successfully in 45s; ✓ Generating static pages using 7 workers (46/46) in 5.4s; Finalizing page optimization ... |
| playwright | 59 passed (1.5m) |

Prior596 candidate and all failed4d31 full-attempt artifacts remain byte-bound. Unit/design retain only existing5/6 skips, browser zero skips. Original08/09 and all seven requirements remain pending. Contact off, no production migration/deployment, all HOLDs preserved. Plan20 paired Preview runtime proof is pending. G18 cold-dev timing, G17 Menu ambiguity and G07 unrelated map ownership remain explicit deferred gaps.


## Deployed Preview readback and access checkpoint — October 10

All six guarded gates and fresh cold/warm proof pass on committed revision `b8358b11a63aadef2c84c9eb64b78be0a07ddcd4`. A dedicated Git branch `codex/phase27-preview-20261010` was pushed at that exact SHA. Both projects track `dev` for Production, so this new branch generated Preview builds only. Vercel reports READY, target null, matching commit metadata for web `dpl_xNdTdc1zHGHVehoLQNSwuQbSM3yj` and ops `dpl_c8f7NmZndNfFrLbUszGLxZqAGCQt`. The three dedicated origins listed above are now assigned: app/marketing to the web deployment, ops to its own deployment.

Existing authenticated browser observations: the owner remains signed in on `fitout.live`; customer Preview shows Log in/Sign up with no bookable spaces; ops root is cloaked and `/login` shows staff sign-in. Marketing Open App and legal links point to the dedicated Preview app. A synthetic example.invalid Contact submission shows failure, retains entered fields and reenables Send message without a success announcement. The browser did not capture HTTP status, so this is UI failure proof rather than a claimed 503 readback. Separate explicit Neon readback still shows user/session/account/booking counts all zero and the original two synthetic quota rows. No positive deployment write-binding proof is claimed.

Production alias readbacks remain web `dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv` and ops `dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS`. No production alias, deployment, migration or Contact switch was changed.

Direct automated requests receive Vercel Authentication protection. Automatic approval review rejected temporary protected-access share links because that particular access-control bypass lacks explicit owner approval. No link was created and protection was not disabled. Positive disposable-account write binding, actual signed-cookie cross-origin rejection beyond ordinary browser host-cookie separation, and exact deployed Contact HTTP status remain pending. Plan 20 is incomplete; original 08/09 and requirements remain pending.

Retained secret-free proof: `playwright/.cache/phase27-08/preview-browser-checkpoint-20261010.json`. Screenshot: `playwright/.cache/phase27-08/preview-contact-disabled-20261010.png`. Read the concrete approval scope in 27-20-PREVIEW-ACCESS-CHECKPOINT.md.


## Completed bounded Preview verification — October 10

The owner explicitly approved the described temporary 23-hour access links by saying “go ahead execute.” Link/cookie bytes remained private. Initial access attempts were rejected by Vercel login despite link creation; recreating access invalidated earlier test access, so verification ran sequentially per origin with an accepted private protection cookie. These failures remain retained and were not counted as passed tests. The first disposable signup request returned400 because the harness omitted required firstName; a safe diagnostic identified MISSING_FIELD. Adding the existing required field to the harness resolved it without application/source changes.

Actual final outcomes at 2026-10-09T19:30:15.979Z:

| Observed check | Result |
|---|---|
| Anonymous app Preview session | HTTP200, null session |
| One disposable signup | HTTP200; returned user ID matches exactly one row read from explicit br-silent-glade-b31mruln |
| Owned app Preview session | HTTP200; matches the same disposable user |
| Disabled marketing Contact | HTTP503, ok=false; no real delivery/provider credential available |
| Ops anonymous session | HTTP200, null session |
| Replay actual app Preview auth cookie to ops | HTTP200, null session; cookie rejected |
| Explicit branch after all stages | users1, sessions1, accounts1, bookings0 |

The existing signed-in production browser remains separate from anonymous customer Preview through normal host-only cookie behavior. No production token was exported or forcibly replayed; that stronger production/deployed matrix remains in original08/09. This bounded preparation completion does not claim all live session scenarios or any requirement are accepted. Both Preview deployments remain READY at b8358b11. Final API readbacks reconfirm all production environment metadata unchanged (web33 entries, ops32), real Preview provider keys absent, Contact false, and production aliases pinned to their original deployment IDs.

Proof: `playwright/.cache/phase27-08/preview-runtime-proof-20261010.json`, SHA256 `e5b637cbb0019877112e3063b23e0f9c28f59253739c0e252c4bb5194e3f1cff`. Independent final readback: `playwright/.cache/phase27-08/preview-final-readback-20261010.json`, SHA256 `2bb4e4b2bbb72d3bc02323b96d277ee6b5c3ea6bbe54784516cb08fefbbb9804`. Final browser screenshot: `playwright/.cache/phase27-08/preview-contact-disabled-final-20261010.png`.

Retained failed harness/access attempts (no secret bytes):
- `playwright/.cache/phase27-08/preview-runtime-failed-05d715fb-750d-4ef9-a4a0-5b4d33ad6842.json` — SHA256 `f3ffc87a177a228cc051db655956b12e77e3667e923428d6b72434b6fd0155eb`
- `playwright/.cache/phase27-08/preview-runtime-failed-09be3428-2ac7-4816-afa7-2d6baf6e92c3.json` — SHA256 `33d6b3502f2cfccda22c3916ad82b6624aecf6b721bcafc70dc8300789ecb823`
- `playwright/.cache/phase27-08/preview-runtime-failed-c5b19446-de44-4d4e-b598-86ea5b688690.json` — SHA256 `81b06c04104cb27a84f17f7d7efb1e36fddc8f15c4dd73afa7f0d35817ca165b`

Plan20 completed its two bounded preparation tasks. Counts are18/20 and142/150; original08/09 and all seven requirements remain pending. The original production checkpoint still requires exact cutover authority, compatibility rollout/prerequisites and the full observed live matrix/Contact inquiry-reply. No production migration/deployment, additional real mail or fund movement occurred. Checkout/payout/legal HOLD persists.
