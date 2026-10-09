**Current status:** bounded paired Preview verification completed; see the final October10 section. Earlier saved-only/access checkpoints are retained history.

# Phase 27 isolated Preview settings — October 10, 2026 Manila

D-23 authorizes these Preview-only repairs. Saved settings and branch proof are
complete; deployed isolation is a separate Plan 20 task after six complete gates.

## Actual branch and schema

Neon project `misty-bar-13534461` has a new dedicated branch named
`preview/phase27-20261010`, ID `br-silent-glade-b31mruln`. Console creation at
2026-10-09T17:14:19Z selected schema-only initialization from the production schema.
Independent API readback reports `init_source: parent-schema`, ready, nonprimary
and nondefault. The endpoint is
`ep-young-heart-b3h8o9yw-pooler.c-4.ap-southeast-1.aws.neon.tech`, database `neondb`.
No production rows were copied. Direct readback found zero user, session, account
and booking rows before fixtures, and those four counts remain zero afterward.

Only the reviewed additive `0034_contact_quota.sql` table/index was applied to
this explicit branch. Its three columns are key/text, attempts/jsonb and
expires_at/timestamptz, all required; key is primary and expiry is indexed.
This was a direct additive application, not a claim that a complete Drizzle
migration history was replayed or that production received the migration.

Actual Preview quota contention proof used eight distinct client connections,
executing the committed reservation algorithm after TypeScript erasure and
import binding for this owned Node process. Five reservations succeeded and
three were limited. Two synthetic hashed quota rows, five attempts each, remain
with bounded expiry; no raw IP or inquiry is stored and no mail was sent.
The initial verification helper attempts failed before quota writes; the Windows
module import was corrected to a file URL. Those outcomes do not replace the
successful application tests or the later actual branch contention proof.

Proof: `playwright/.cache/phase27-08/preview-quota-proof-20261010.json`.
Source revision `4d31a45ed4748d9f9e6efe3f1b4e7d38f59530c1`;
quota file SHA256 `6c4f26e2850e5ae036a488f37f66904339b083637e5326e809f014fc3f9d4f13`.
Console screenshot: `playwright/.cache/phase27-08/schema-only-preview-20261010.png`.

## Saved Vercel Preview bindings

Explicit team `pengr3s-projects` / `team_EZAfhT8qJ6msqrCzas3rvdjG`:

| Project | Preview-only database and auth |
|---|---|
| fitout-web / prj_my7iigeFoojFO2QmXYYfr49p8uiz | New branch database URL saved to WdUtlTSFzf7bN3ng; fresh independent auth secret saved |
| fitout-ops / prj_cUmYg0pQne8gkYKrHd8KY2O4rAQj | New branch database URL created as nYhVxh2W1RbWZWmo; another independent auth secret saved |

Both Preview targets have `CONTACT_PRODUCTION_ENABLED=false`. Real Resend,
PayMongo, Didit, Google secret and Cloudinary private credentials are absent.
The preexisting web Preview Inngest keys were cleared; decrypted readback of
those two entries confirms empty values. Their production entries were preserved.
The existing Inngest endpoint remains fail-closed without its signing key; no
Preview background job registration or provider destination is authorized here.
Ops retains its existing shared public Cloudinary name/API identifier; private
upload credentials remain absent. Public identifiers do not grant upload access.

Prepared exact Preview origins, saved separately to both Preview targets:

| Class | Origin |
|---|---|
| App / Better Auth / public app | https://fitout-p27-app-20261010.vercel.app |
| Marketing | https://fitout-p27-marketing-20261010.vercel.app |
| Ops | https://fitout-p27-ops-20261010.vercel.app |

All three alias lookups returned 404 before preparation. No existing alias was
reassigned. Aliases and new deployments remain Plan 20 work after full checks.
Metadata comparison across every production-targeted environment variable in
both projects confirms IDs, targets, types and update timestamps unchanged.
Private database/auth bytes are kept only in memory and an explicitly ignored
verification file; no credential bytes appear in this evidence.
Safe settings proof: `playwright/.cache/phase27-08/preview-saved-bindings-20261010.json`.

## Limits and next proof

Provider acknowledgement plus redacted metadata proves the requested settings
were saved. It does not reveal write-only secrets or prove an existing deployment
uses them. Plan 20 must pin fresh Preview deployments to the checked source,
assign only the dedicated aliases, prove disposable writes go to this branch,
reject production sessions, and observe disabled Contact. Those deployed claims
remain pending. Production quota migration, Contact enablement, original 08/09,
all seven requirements and checkout/payout/legal HOLD are unchanged.

The owner confirms the one transport-test email arrived and says they replied.
Reply arrival and a deployed Contact inquiry/reply round trip remain unproved;
no additional message was sent.


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
