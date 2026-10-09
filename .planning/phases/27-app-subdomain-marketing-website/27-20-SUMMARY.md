---
phase: 27-app-subdomain-marketing-website
plan: "20"
status: complete
subsystem: guarded-candidate-and-preview-proof
requirements-completed: []
completed: 2026-10-10
---

Completed both bounded preparation tasks: all six full source-guarded gates and fresh cold/warm proof on b8358b11, followed by exact-SHA paired isolated Preview builds and actual disposable-account write/session, cross-Preview auth-cookie rejection and disabled Contact503 proof. Final independent readback confirms production aliases/env metadata unchanged. No runtime/application source changed during the account proof.


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
