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
