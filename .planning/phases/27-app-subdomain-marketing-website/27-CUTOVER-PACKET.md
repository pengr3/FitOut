# Phase 27 — Prepared cutover and rollback packet

**Prepared engineering and read-only inventory only. Cutover is blocked.** The
architecture is already authorized by D-16/D-17. The remaining checkpoint concerns
actual account prerequisites and exact external changes, not routine implementation
choices. The separately approved Google client-registration additions are saved,
and current-apex Google sign-in passed for the existing browser account. No
deployment, DNS change, live inquiry or fund movement occurred.
Task 27-08-03 is blocking-human and is reserved for the owner when available.

```json
{
  "targets": {
    "app": "https://app.fitout.live",
    "marketing": "https://fitout.live",
    "ops": "https://ops.fitout.live",
    "www": "https://www.fitout.live -> https://fitout.live"
  },
  "proposedRevision": "596b47460282d756a1a5882c4c2d86f18b7ff851",
  "candidateAcceptance": "All six clean-source full gates plus fresh cold/warm production probe pass locally. Exact account/preview/provider/Contact/compatibility-first prerequisites and scoped cutover acceptance remain pending. No deployment approval inferred.",
  "approvedRevision": null,
  "authority": {
    "status": "pending",
    "scope": null,
    "approvedAt": null
  },
  "holds": {
    "checkout": "HOLD",
    "payout": "HOLD",
    "legal": "HOLD"
  },
  "rollbackOwner": "Vercel release account owner; named operator confirmation pending",
  "monitoringOwner": "Release operator plus existing monitored SUPPORT_EMAIL owner; availability pending",
  "contact": {
    "enabled": false,
    "controlsVerified": false,
    "processLocalIsGlobal": false,
    "perIpPolicy": "Enforcing trusted-ingress deployment-wide <=5 attempts per 15 minutes per original client; account-wide proof pending",
    "globalBudget": "Distributed mailbox/global <=100 accepted inquiries per hour across all instances/regions, with owner alert and disable switch; concrete approved control pending",
    "disabledRecovery": "Keep CONTACT_PRODUCTION_ENABLED=false; verify real 503, retained fields, no delivery announcement; no development-mail fallback"
  },
  "receivers": [
    {
      "old": "https://fitout.live/api/paymongo/webhook",
      "target": "https://app.fitout.live/api/paymongo/webhook",
      "methods": "POST",
      "redirect": false
    },
    {
      "old": "https://fitout.live/api/didit/webhook",
      "target": "https://app.fitout.live/api/didit/webhook",
      "methods": "POST",
      "redirect": false
    },
    {
      "old": "https://fitout.live/api/inngest",
      "target": "https://app.fitout.live/api/inngest",
      "methods": "GET HEAD POST PUT",
      "redirect": false
    }
  ],
  "rollout": [
    "Record exact approved final SHA, current alias deployment IDs, DNS RRsets/TTL, Production env scopes and provider registrations; resolve high threats and failed engineering gates before external mutation",
    "Prepare compatibility revision retaining current apex app behavior during app-alias proof; do not activate final apex marketing before app origin is observed. This intermediate deployment requires a separately verified origin configuration/compatibility revision; final exact-host marketing source alone cannot serve old apex app at the same time",
    "Attach app.fitout.live to existing fitout-web; verify DNS/TLS and real app search/auth/returns/session cookies on approved revision. Retain ops project and old direct signed receivers",
    "Add exact Google app origin/callback and approved provider browser returns; migrate machine registrations only after both direct receiver URLs are proved, keeping one Inngest scheduler",
    "Set final both-project Production app vars=https://app.fitout.live, MARKETING_APP_URL=https://fitout.live, OPS_APP_URL unchanged; rebuild and promote exact reviewed final SHA; verify app/marketing/ops HTML/Link/RSC/cache/session matrix before announcing apex change",
    "Configure www 307 to apex with full path/query; preserve sending-domain DNS. Keep Contact false until published distributed controls and available inbox owner are proved",
    "Only after scoped authority and controls: enable Contact, read back exact deployment, authorize one safe inquiry, observe inbox/Reply-To/reply, then run deployed/live evidence validator"
  ],
  "rollback": [
    "On threshold breach disable Contact first, rebuild/redeploy both affected projects, verify real 503 and recoverable feedback",
    "Restore customer apex alias to dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv and ops alias to dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS only through scoped release authority",
    "Restore recorded Production BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL=https://fitout.live; remove newly added marketing variables only if absent before; retain OPS_APP_URL=https://ops.fitout.live; rebuild because public app URL is build-time",
    "Restore saved exact DNS RRsets/TTL and www redirect state if changed; keep app alias compatible until outstanding links drain; do not remove send.fitout.live records",
    "Restore exact saved Google/provider destinations and one Inngest registration; keep both direct signed receivers during rollback; never rotate signing keys or replay OAuth code/state",
    "Re-prove old app sign-in/search/reset/verify/deep links and isolated staff session; retain payment/payout/legal HOLD; record incident and unknown observations"
  ],
  "thresholds": [
    "Any unknown/lookalike host exposes account or staff content, cross-host session acceptance, wrong canonical/OG or internal namespace response: stop immediately and roll back",
    "Any receiver redirects, accepts absent/invalid signatures in production, loses full query/method continuity or duplicate Inngest scheduler appears: stop immediately",
    "Two consecutive health/search/auth checks fail or customer 5xx exceeds 1% over five minutes: rollback; operator checks every minute for first 15 minutes and every five minutes for next hour",
    "Contact accepts before verified global control, mailbox traffic exceeds100/hour, or controlled inquiry is absent after10minutes: disable immediately; never announce delivery proof",
    "Google state/TLS/cookie error, failed issued reset/verify link, or staff isolation failure: halt provider migration and revert scoped origin/registration changes"
  ]
}
```

## Deployed evidence contract

October9 clean-source preparation now binds an exact tested revision and source
captures without the shared checkout's unrelated changes. The typecheck and
production build fail on an existing space-type mismatch; full unit/design also
remain failed. This is progress in provenance, not a deployable replacement.
The user retains scope and schedules these findings for gap planning. Do not
request deployment approval while the build/prerequisites are unresolved, and do
not treat later documentation commits as the tested source revision. See
27-CLEAN-SOURCE-PREPARATION.md for the actual retained attempts and source hashes.

Engineering schemaVersion 2 requires typed runner totals and the bounded terminal summary to
match the retained log bytes, valid start/finish ordering, and explicit tested source context.
The historical six full gates retain their real results, including eight unit and nine design
failures. Their source provenance is unavailable: no scoped source manifest/revision was captured
at execution time. They tested a preserved dirty working tree and establish neither a clean
candidate SHA nor a deployed SHA. Prepared validation accepts that honest limitation; deployed/live
validation rejects it. New captures include revision, dirty state, capture time, scoped file hashes
and manifest digest. Dirty captures cannot be relabeled as clean or deployed source, and all
active acceptance gate captures must match the deployed source revision and manifest digest. Byte hashes
and summary checks establish structural consistency only, not proof of execution or authenticity.

An optional `engineering.releaseCandidateVerification` now records an explicit
complete replacement run without rewriting old results. Its schemaVersion1,
nonempty disposition and `supersedesSha256=gateHistoryDigest(engineering)` bind
all retained original/review-fix gates. Its exact revision/sourceManifestSha256
bind six fresh full gates in the canonical order, run after the historical gates.
Each fresh source must be clean, captured before its gate and match that candidate
manifest; deployed/live additionally bind it to the actual approved deployment.
All old log/snapshot bytes, summaries, failure dispositions and provenance are
still validated. A partial, failed, dirty, focused-only or mismatched replacement
cannot pass deployment acceptance. Without an explicit replacement, the original
strict rules remain. No real replacement run is recorded yet; current full-suite
failures and missing external proof still block deployed/live validation.

`scripts/verify-phase27-evidence.mjs` now requires matrixVersion 1 and all 35 distinct
scenario IDs in REQUIRED_MATRIX. Each observation records the exact host/HTTPS URL/method,
scenario, expected and observed detail, explicit outcome="pass", proof reference, valid UTC timestamp, deployment ID
and matching deployed revision. Typed distinct customer/ops/preview deployment identities bind
each observation to its owning project; preview binds an explicit isolated HTTPS origin and
rejects a production-origin substitute. These readbacks remain pending. Coverage includes all six marketing pages, app/ops/www,
unknown/internal authorities, session/auth/token continuity, staff/customer separation,
Next Link/RSC/prefetch/cache/metadata, distinct old and target PayMongo/Didit/Inngest receivers,
preview account isolation, four Contact-control observations and rollback. No deployed matrix
has been observed. These checks establish structural consistency of supplied records only;
they do not authenticate observations or authorize deployment or Contact enablement.

## Exact environment proposal

| Project/scope | Key | Current read-back | Proposed value | Restore |
|---|---|---|---|---|
| fitout-web + fitout-ops / Production | BETTER_AUTH_URL | https://fitout.live | https://app.fitout.live | https://fitout.live |
| same / Production build | NEXT_PUBLIC_APP_URL | https://fitout.live | https://app.fitout.live | old value plus rebuild |
| same / Production | OPS_APP_URL | https://ops.fitout.live | retained | retained |
| same / Production | MARKETING_APP_URL | absent | https://fitout.live | restore absence |
| same / Production | CONTACT_PRODUCTION_ENABLED | absent | false until controls, then separately authorized true | false |
| same / Preview | app/marketing/ops origins | incomplete; preview ops currently production ops | exact isolated preview aliases and generated app authority, no production DB/credentials | saved scope/branch record |

Do not deploy the final split source directly over apex as a supposed
compatibility-only stage. Its marketing classification would switch apex at once.
First establish and verify an intermediate compatibility revision/configuration,
or record owner-approved coordinated app-alias/origin promotion with the explicit
temporary window and rollback. This unresolved rollout prerequisite blocks mutation.

## Provider and browser-return targets

Google authorized origin: `https://app.fitout.live`; exact URI:
`https://app.fitout.live/api/auth/callback/google`. Fresh app state is required;
old apex OAuth codes/state restart sign-in. Issued verify/reset token bridges preserve
checked callbacks. PayMongo browser success `/bookings/{id}?paid=1` and cancel
`/listings/{id}/book?hold={id}` use app authority; queries never confirm payment.
Didit browser return is app `/host/verify`. Retain old/new direct machine URLs above,
raw bytes, secrets, signatures, retries/deduplication and authorization. Do not send
financial events, real KYC sessions or re-enable retired payout onboarding.

Read-back every provider's account/mode, destinations, event lists and owner before
editing. Dated browser readbacks now identify the production Google client and
PayMongo receiver; other facts remain partial or unknown in the inventory. [Google OAuth docs](https://developers.google.com/identity/protocols/oauth2/web-server),
[PayMongo webhook resource](https://docs.paymongo.com/reference/webhook-resource),
and [Didit webhook docs](https://docs.didit.me/integration/webhooks) are reference
contracts, not current account proof.

### Concrete Google registration proposal following production readback

On October 9, the user-authorized bounded production login probe confirmed
`FitOut Client 1` in project `fitout-505104` is the deployed client. Before the
approved registration change, Google rejected its apex callback with
`redirect_uri_mismatch`; the client permitted only localhost. The exact changes
proposed and subsequently approved for this client are:

- Retain `http://localhost:3000/api/auth/callback/google`.
- Add `https://fitout.live/api/auth/callback/google` to restore the current receiver
  and retain it throughout the compatibility window.
- Add `https://app.fitout.live/api/auth/callback/google` before the app-origin cutover.
- Add the planned JavaScript origin `https://app.fitout.live`.

These registration additions were approved by the user and saved on October 9 at
approximately 13:51 Manila (05:51 UTC). A fresh reopening of the exact Google client
confirmed the app origin and all three callback entries persisted. The subsequent
fresh apex sign-in completed automatically through the existing Google browser
account and returned an authenticated FitOut session, resolving the observed apex
callback mismatch for this attempt. No credential or consent action was entered.
First-time consent, full audience readiness and app-domain sign-in remain unverified.
The previously observed External/Testing audience, zero test users and incomplete
Branding remain outside this registration approval. No audience was published or
test user added. The inventory records nonsecret evidence without OAuth state/code
or account identity.

After the Resend access pass, the exact Google client was reopened and these three
additions were prepared in its unsaved browser form, retaining localhost. The user
then approved saving those exact additions. The earlier cropped proposal review
screenshot is ignored `playwright/.cache/phase27-08/oauth-callback-registration-draft.jpg`.
Saved-state screenshots are `oauth-origin-saved.jpg` and `oauth-callbacks-saved.jpg`
in the same ignored cache; `oauth-apex-signin-success.jpg` records the bounded fresh
authenticated session. Approval applies only to these origin/callback additions to
this client; it does not authorize publishing the audience, changing secrets, deploying
Phase27, changing DNS or releasing Contact/payments/payout/legal HOLD. If the form
is reopened later, reread the saved configuration before proposing further changes.
Rollback removes only the added entries and retains the recorded original localhost
callback; this would restore the original apex mismatch and requires scoped authority.

October 9 Didit readback identifies the active apex webhook (v3.0, one event) in
an inspected Test-mode application; production workflow binding and signing proof
remain pending. Inngest Production currently serves one listed active `fitout` app
with 14 functions from the recorded Vercel deployment URL, not the apex or new app
origin. Preserve that working registration until the replacement's functions,
signatures and scheduling are verified. Its destination query displayed a Vercel
protection-bypass credential; coordinate owner replacement/invalidation without
interrupting scheduled jobs. The credential value/full URL is excluded from this
packet. No resync, credential mutation, provider test or mode change is authorized
by these readbacks.

October 9 Resend readback confirms `send.fitout.live` Verified in Tokyo, DKIM and
SPF records Verified, Sending enabled and Receiving disabled. The named
`fitout-production-mail` key has Sending access restricted to that domain. Its
deployment-secret correspondence remains unverified; do not reveal or compare
credential values to claim a match. Retain the existing sender DNS/key configuration.
Account access for all five requested providers and Vercel is now observed.
Monitored support inbox ownership and the bounded Contact receipt/Reply-To/reply
test remain unresolved; historical application mail is not Contact acceptance.

## Contact release prerequisite and controlled inquiry

The local Map is defense in depth only. Current [Vercel WAF documentation](https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting)
states counters are per region, with Hobby/Pro fixed windows limited to ten minutes.
Therefore a nominal WAF rule alone does not establish the required cross-region
15-minute per-IP policy or global mailbox cap. The security owner must provide a
concrete approved distributed control, its account capabilities, enforcement proof,
budget and alert owner. No infrastructure/package/schema change is authorized here.
If that cannot be proved, Contact remains disabled and CONTACT-01 remains blocked.

Only after controls and owner availability, propose **one** inquiry: name “FitOut
release check”; sender and confirm email the owner's controlled reply-capable address;
optional mobile blank; message “Phase27 domain transition check. Please confirm
receipt and reply.” No sensitive content, attachments or real customer data. No
inquiry has been sent. Record time/environment/accepted status and owner-observed
receipt, Reply-To correctness and reply arrival, omitting address, message IDs,
headers/tokens and message body from evidence. Provider acceptance alone is not receipt.

## Unresolved checkpoint prerequisites

- The user chose to retain scope and defer the eight unit/nine design baseline
  failures to later gap planning; deferred-items.md is the planning ledger. This
  resolves repair scheduling, not release acceptance. Final exact approved
  deployable SHA, fresh source-bound gates and deployed high-threat proof remain
  pending; independent review of the original four findings is clean.
- Compatibility-first intermediate deployment/origin proof described above.
- App attachment, www redirect and preview account isolation. October 9 readbacks
  establish zone records and valid TLS; app still returns DEPLOYMENT_NOT_FOUND,
  and the www HEAD path/query probe returns 404 without a redirect.
- Provider access/readbacks are available and the approved Google additions are
  saved; production modes/bindings, audience readiness, signatures, receiver
  continuity and named operating owners remain partially unverified.
- Published global Contact control, mailbox budget and available inbox owner.
- Scoped exact external mutation/inquiry authority, rollback and monitoring operator.
- Account owner invalidation of the existing ops share-link bypass exposed by a raw
  read-only tool response; no value is retained and no key was created/used/revoked.

Existing user architecture authorization remains valid. All fund movement, broader
payment/payout release and binding legal approval stay on **HOLD**.

## Review-fix source and verification update

All four reviewed engineering findings are implemented and independently closed.
Customer capability writes and all staff role writes now share the existing
role-policy lock, reread positive customer eligibility and deny zero-row updates.
Contact transport/body-read failures report uncertainty with values retained. The
version 1 deployed matrix requires 35 distinct successful typed observations with exact
customer/ops/isolated-preview deployment identities, plus runner/source consistency.
The validator checks supplied structure/bytes, not authenticity or execution attestation.

Separate review-fix records in 27-ENGINEERING-EVIDENCE.md show 147 focused tests, 87 final
evidence fixtures, types exit0, lint zero errors/34 existing warnings, canonical build
46/46 routes and 52 owned Chromium checks passing. Browser Windows teardown required
verified scoped Next process termination after all 52 cases; an unattributed dev
streaming TypeError between passing cases 47/48 is retained for independent assessment.
Successful tsc emitted no stdout and no raw file; its real terminal metadata/source03
are explicit. Four failed build attempts and their harness/generated/font dispositions
remain alongside the final pass.

These checks ran sequentially in the preserved dirty main checkout. Pre-gate bounded
snapshots include source/assets/configuration plus unrelated existing changes. Final
build/browser useHEAD 9859a5c with dirty manifests; this does not prove a clean candidate
or deployed revision. Historical full unit 8/design 9 failures and uncaptured historical
source context remain failed/unavailable. Final external candidate readback, central
review and all matrix/control/inbox observations still block acceptance. No account,
provider, deployment, DNS or mail mutation occurred during those local checks.
The later approved Google change is recorded separately. Contact remains disabled, plans 08/09
incomplete, all seven requirements unchecked and checkout/payout/legal HOLD immutable.


## Latest verified local repair (October 9)

15/17 plans complete; original 08 task 3 and plan 09 remain pending. All six full
gates and a fresh cold/warm production-server probe pass at 596b4746, with matching
source and manifest guards. See 27-GAP-VERIFICATION.md.
The Contact quota-table decision, Preview database isolation, support inbox owner
and exact account/cutover prerequisites remain pending. Contact is disabled and
checkout/payout/legal HOLD remains. No external mutation or requirement completion
is claimed. Retained source archives and logs remain available.

Later evidence bookkeeping and the offline synthetic-fixture update do not imply
full-gate verification of a later commit. The tested candidate remains 596b4746.
