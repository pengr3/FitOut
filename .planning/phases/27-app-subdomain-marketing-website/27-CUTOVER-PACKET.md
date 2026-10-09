# Phase 27 — Prepared cutover and rollback packet

**Prepared engineering and read-only inventory only. Cutover is blocked.** The
architecture is already authorized by D-16/D-17. The remaining checkpoint concerns
actual account prerequisites and exact external changes, not routine implementation
choices. No deployment, DNS/provider change, live inquiry or fund movement occurred.
Task 27-08-03 is blocking-human and is reserved for the owner when available.

```json
{
  "targets": {"app":"https://app.fitout.live","marketing":"https://fitout.live","ops":"https://ops.fitout.live","www":"https://www.fitout.live -> https://fitout.live"},
  "proposedRevision":"Phase27 dev candidate; execution base 1afc5fc3b48d27bd292bbe96ecc11abe2944862a; exact reviewed final SHA required before deployment",
  "approvedRevision":null,
  "authority":{"status":"pending","scope":null,"approvedAt":null},
  "holds":{"checkout":"HOLD","payout":"HOLD","legal":"HOLD"},
  "rollbackOwner":"Vercel release account owner; named operator confirmation pending",
  "monitoringOwner":"Release operator plus existing monitored SUPPORT_EMAIL owner; availability pending",
  "contact":{"enabled":false,"controlsVerified":false,"processLocalIsGlobal":false,"perIpPolicy":"Enforcing trusted-ingress deployment-wide <=5 attempts per 15 minutes per original client; account-wide proof pending","globalBudget":"Distributed mailbox/global <=100 accepted inquiries per hour across all instances/regions, with owner alert and disable switch; concrete approved control pending","disabledRecovery":"Keep CONTACT_PRODUCTION_ENABLED=false; verify real 503, retained fields, no delivery announcement; no development-mail fallback"},
  "receivers":[
    {"old":"https://fitout.live/api/paymongo/webhook","target":"https://app.fitout.live/api/paymongo/webhook","methods":"POST","redirect":false},
    {"old":"https://fitout.live/api/didit/webhook","target":"https://app.fitout.live/api/didit/webhook","methods":"POST","redirect":false},
    {"old":"https://fitout.live/api/inngest","target":"https://app.fitout.live/api/inngest","methods":"GET HEAD POST PUT","redirect":false}
  ],
  "rollout":[
    "Record exact approved final SHA, current alias deployment IDs, DNS RRsets/TTL, Production env scopes and provider registrations; resolve high threats and failed engineering gates before external mutation",
    "Prepare compatibility revision retaining current apex app behavior during app-alias proof; do not activate final apex marketing before app origin is observed. This intermediate deployment requires a separately verified origin configuration/compatibility revision; final exact-host marketing source alone cannot serve old apex app at the same time",
    "Attach app.fitout.live to existing fitout-web; verify DNS/TLS and real app search/auth/returns/session cookies on approved revision. Retain ops project and old direct signed receivers",
    "Add exact Google app origin/callback and approved provider browser returns; migrate machine registrations only after both direct receiver URLs are proved, keeping one Inngest scheduler",
    "Set final both-project Production app vars=https://app.fitout.live, MARKETING_APP_URL=https://fitout.live, OPS_APP_URL unchanged; rebuild and promote exact reviewed final SHA; verify app/marketing/ops HTML/Link/RSC/cache/session matrix before announcing apex change",
    "Configure www 307 to apex with full path/query; preserve sending-domain DNS. Keep Contact false until published distributed controls and available inbox owner are proved",
    "Only after scoped authority and controls: enable Contact, read back exact deployment, authorize one safe inquiry, observe inbox/Reply-To/reply, then run deployed/live evidence validator"
  ],
  "rollback":[
    "On threshold breach disable Contact first, rebuild/redeploy both affected projects, verify real 503 and recoverable feedback",
    "Restore customer apex alias to dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv and ops alias to dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS only through scoped release authority",
    "Restore recorded Production BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL=https://fitout.live; remove newly added marketing variables only if absent before; retain OPS_APP_URL=https://ops.fitout.live; rebuild because public app URL is build-time",
    "Restore saved exact DNS RRsets/TTL and www redirect state if changed; keep app alias compatible until outstanding links drain; do not remove send.fitout.live records",
    "Restore exact saved Google/provider destinations and one Inngest registration; keep both direct signed receivers during rollback; never rotate signing keys or replay OAuth code/state",
    "Re-prove old app sign-in/search/reset/verify/deep links and isolated staff session; retain payment/payout/legal HOLD; record incident and unknown observations"
  ],
  "thresholds":[
    "Any unknown/lookalike host exposes account or staff content, cross-host session acceptance, wrong canonical/OG or internal namespace response: stop immediately and roll back",
    "Any receiver redirects, accepts absent/invalid signatures in production, loses full query/method continuity or duplicate Inngest scheduler appears: stop immediately",
    "Two consecutive health/search/auth checks fail or customer 5xx exceeds 1% over five minutes: rollback; operator checks every minute for first 15 minutes and every five minutes for next hour",
    "Contact accepts before verified global control, mailbox traffic exceeds100/hour, or controlled inquiry is absent after10minutes: disable immediately; never announce delivery proof",
    "Google state/TLS/cookie error, failed issued reset/verify link, or staff isolation failure: halt provider migration and revert scoped origin/registration changes"
  ]
}
```

## Deployed evidence contract

Engineering schemaVersion 2 requires typed runner totals and the bounded terminal summary to
match the retained log bytes, valid start/finish ordering, and explicit tested source context.
The historical six full gates retain their real results, including eight unit and nine design
failures. Their source provenance is unavailable: no scoped source manifest/revision was captured
at execution time. They tested a preserved dirty working tree and establish neither a clean
candidate SHA nor a deployed SHA. Prepared validation accepts that honest limitation; deployed/live
validation rejects it. New captures include revision, dirty state, capture time, scoped file hashes
and manifest digest. Dirty captures cannot be relabeled as clean or deployed source, and all
deployed gate captures must match the deployed source revision and manifest digest. Byte hashes
and summary checks establish structural consistency only, not proof of execution or authenticity.

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
`FitOut Client 1` in project `fitout-505104` is the deployed client. Google currently
rejects its apex callback with `redirect_uri_mismatch`; the client permits only
localhost. Proposed registration changes for this exact client are:

- Retain `http://localhost:3000/api/auth/callback/google`.
- Add `https://fitout.live/api/auth/callback/google` to restore the current receiver
  and retain it throughout the compatibility window.
- Add `https://app.fitout.live/api/auth/callback/google` before the app-origin cutover.
- Add the planned JavaScript origin `https://app.fitout.live`.

These are reviewable proposed changes only. No registration was saved, audience
published or test user added. The current External/Testing audience, zero test users
and incomplete Branding must also be resolved within separately authorized scope;
adding callbacks alone does not prove production readiness. Fresh apex/app sign-in
and consent verification remain required. The inventory records the nonsecret probe
evidence without OAuth state/code or account identity.

After the Resend access pass, the exact Google client was reopened and these three
additions were prepared in its unsaved browser form, retaining localhost. **Save
has not been clicked**; no registration change is effective. The cropped review
screenshot is ignored `playwright/.cache/phase27-08/oauth-callback-registration-draft.jpg`.
Approval is requested only for saving these origin/callback additions to this
client; it does not authorize publishing the audience, changing secrets, deploying
Phase27, changing DNS or releasing Contact/payments/payout/legal HOLD. If the form
is lost, reconstruct it from this exact proposal and reread before applying any
subsequent explicit approval. Rollback removes only the added entries and retains
the recorded original localhost callback; account readback and bounded fresh
sign-in observation follow a saved change.

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

- Failed engineering gates and any real integration defects need disposition;
  final exact approved deployable SHA and deployed high-threat proof are pending; independent code re-review is clean.
- Compatibility-first intermediate deployment/origin proof described above.
- DNS RRsets/TLS and actual www behavior; preview account isolation read-back.
- Current Google/PayMongo/Didit/Inngest/Resend account settings and owners.
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
provider, deployment, DNS or mail mutation occurred; Contact remains disabled, plans 08/09
incomplete, all seven requirements unchecked and checkout/payout/legal HOLD immutable.
