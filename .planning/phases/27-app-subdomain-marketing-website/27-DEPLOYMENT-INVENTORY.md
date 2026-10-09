# Phase 27 — Current external inventory

Read-only snapshot: 2026-10-08 19:36–19:44 UTC (2026-10-09 Manila). No settings,
deployment, provider event or email was changed. Phase23 is historical only.
Authenticated Vercel connector calls used explicit team/project scope. Environment
listing used decrypt=false; only allowlisted nonsecret origin values were read
individually. Secret presence is not proof of provider registration or key validity.

Vercel project/domain/alias/deployment/environment APIs were accessible. No provider
connector for Google OAuth administration, PayMongo, Didit, Inngest or Resend is
available in this executor. Installed authenticated vercel/gcloud CLIs were not
found. Public web reads of the four hosts failed in the web tool, so HTTP/TLS
content remains unproved here. No request used a protection bypass.

```json
{
  "observedAt": "2026-10-08T19:44:00Z",
  "rows": [
    {"id":"customer-project","status":"observed","owner":"Vercel account owner","current":"fitout-web owns verified fitout.live and www.fitout.live; app.fitout.live absent from project domains and alias lookup returned 404","target":"fitout-web retains apex/www and adds app.fitout.live; same compatible source deployment","observedAt":"2026-10-08T19:36:47Z","source":"Vercel list_project_domains + get_alias, explicit account scope","requiredProof":"Read back app alias attachment and verified TLS after approved change","rollback":"Restore apex alias to dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv; retain old/new receivers"},
    {"id":"ops-project","status":"observed","owner":"Vercel account owner","current":"fitout-ops owns verified ops.fitout.live; alias points to dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS","target":"Retain exact separate ops.fitout.live project attachment and host-only staff cookies","observedAt":"2026-10-08T19:38:20Z","source":"Vercel project domains + alias read-back, filtered nonsecret fields","requiredProof":"Post-change staff login and app/apex session separation","rollback":"Restore ops alias to dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS and original Production origin values"},
    {"id":"dns-tls-www","status":"partial","owner":"Vercel/DNS account owner","current":"fitout.live zone is verified with ns1.vercel-dns.com/ns2.vercel-dns.com; apex/www/ops domains verified. www redirect and redirectStatusCode are null. Actual DNS RRsets, certificate chain and HTTP www behavior unknown","target":"Valid apex/app/ops TLS; www.fitout.live 307 to https://fitout.live preserving path/query, later permanent only after acceptance","observedAt":"2026-10-08T19:38:20Z","source":"Vercel list_domains/list_project_domains; public web tool inaccessible","requiredProof":"Current authoritative DNS RRsets, app record target, certificate hostname/expiry, actual www GET/HEAD path/query redirect","rollback":"Restore saved exact prior RRsets/TTL and alias settings; preserve sender-domain DNS"},
    {"id":"environment-scopes","status":"partial","owner":"Vercel account owner","current":"Both Production projects BETTER_AUTH_URL/NEXT_PUBLIC_APP_URL=https://fitout.live, OPS_APP_URL=https://ops.fitout.live. MARKETING_APP_URL/MARKETING_PREVIEW_URL/CONTACT_PRODUCTION_ENABLED absent. Preview OPS_APP_URL also production ops; other Preview origin/database isolation unknown","target":"Production both app vars=https://app.fitout.live; MARKETING_APP_URL=https://fitout.live; ops unchanged; Contact false. Preview generated exact app authority plus explicit isolated ops/marketing aliases and schema-only DB","observedAt":"2026-10-08T19:37:50Z","source":"Vercel filter_project_envs decrypt=false and individually allowlisted get_project_env","requiredProof":"Scope/branch read-back including no production credentials/DB in Preview; separate build-time and runtime origin observation","rollback":"Restore both Production app vars=https://fitout.live; restore prior marketing key absence and ops origin; rebuild because NEXT_PUBLIC is baked"},
    {"id":"google-oauth","status":"unknown","owner":"Google Cloud OAuth client owner","current":"Unknown current authorized origins and redirect URIs; secret presence is not registration proof","target":"Add https://app.fitout.live origin and exact https://app.fitout.live/api/auth/callback/google; retain needed old registrations during bridge window","requiredProof":"Current client/account/mode read-back, old/new exact entries, live state/consent roundtrip without code/state replay","rollback":"Restore saved registrations; old apex OAuth codes restart sign-in rather than replay"},
    {"id":"paymongo","status":"unknown","owner":"PayMongo account owner","current":"Unknown current receiver URL, event subscription, signing configuration and browser-return behavior","target":"Direct old https://fitout.live/api/paymongo/webhook and new https://app.fitout.live/api/paymongo/webhook; browser success/cancel returns app; no financial events","requiredProof":"Account-mode receiver/event/signature configuration read-back, retained old receiver, unsigned denial and bounded signed nonfinancial proof authority","rollback":"Restore exact prior receiver/event registration; keep both direct handlers and unchanged signing/deduplication; checkout HOLD"},
    {"id":"didit","status":"unknown","owner":"Didit application owner","current":"Unknown current application mode, workflow receiver and signing/retry settings","target":"Direct old/new /api/didit/webhook; browser return https://app.fitout.live/host/verify; eligibility unchanged","requiredProof":"Exact application/workflow receiver and signature/retry read-back; browser return; no real identity session required for inventory","rollback":"Restore saved webhook/return registration; never redirect webhook POST or alter approval policy"},
    {"id":"inngest","status":"unknown","owner":"Inngest workspace owner","current":"Unknown serve registration, environment and signing config; web Production event/signing keys present, ops list lacks them","target":"Retain compatible old/new /api/inngest GET/HEAD/POST/PUT, registration on approved app origin without duplicate schedules","requiredProof":"Current workspace/app serve URL, environment, registered functions, signing verification and exactly one active scheduler","rollback":"Restore prior serve registration without creating duplicate schedules; retained direct apex endpoint"},
    {"id":"resend-sender","status":"unknown","owner":"Resend sending-domain owner","current":"Unknown current sender-domain verification, send-only key scope and actual delivery acceptance; Production key presence only observed","target":"Retain verified send.fitout.live sender, fixed From, existing monitored SUPPORT_EMAIL and validated Contact Reply-To","requiredProof":"Current DNS verification + sender/key scope read-back, provider acceptance under bounded authorized inquiry, without exposing key/message identifiers","rollback":"Retain sender DNS/key; set Contact false first; restore previous sender config only if changed"},
    {"id":"support-mailbox","status":"unknown","owner":"Existing SUPPORT_EMAIL mailbox owner","current":"Unknown current monitoring owner/availability and actual Contact inbox/Reply-To/reply proof","target":"Existing monitored inbox receives one safe authorized inquiry and owner confirms Reply-To plus reply arrival","requiredProof":"Named available owner, scoped inquiry authority and dated actual receipt/Reply-To/reply observation; no mailbox address or PII in packet","rollback":"Disable Contact and retain recoverable failure; no new mailbox/ticketing system"},
    {"id":"contact-waf-global","status":"unknown","owner":"Vercel security and mailbox owners","current":"Unknown usable account controls; active firewall config API returned 404 config-not-found, not proof of account-wide budgets","target":"Verified deployment-wide per-IP <=5/15min plus global mailbox <=100/hour before Contact true; process-local Map insufficient","requiredProof":"Published enforcing rule + trusted ingress + distributed cross-region/global mailbox budget and bounded control test; account plan/limits checked","rollback":"CONTACT_PRODUCTION_ENABLED=false on customer/ops deployments, redeploy, verify real 503 and retained form recovery"},
    {"id":"deployment-revision","status":"observed","owner":"Vercel release owner","current":"Apex dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv and ops dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS READY; both Git SHA 3645558085e81fed38d644c7b50c64ce921a72ad","target":"One exact reviewed Phase27 SHA recorded before approved deployment, then alias/build read-back","observedAt":"2026-10-08T19:36:47Z","source":"Vercel production list_deployments + get_alias","requiredProof":"Approved final source SHA, build/environment binding, alias read-back and rollback candidates","rollback":"Recorded exact READY deployment IDs above; restore env and rebuild where origins changed"}
  ]
}
```

Owner follow-up: invalidate the existing ops share-link protection bypass that
appeared in raw connector output during this read. It was neither created nor used;
no credential value, identifier or token is retained here. This is an account-owner
prerequisite, with no credential mutation authorized by this packet.

Current provider facts remain unknown. Historic Phase23 claims and installed local
signature tests must not be promoted to current account observations.

## Browser readback — 2026-10-09 Manila

The user authorized read-only provider inspection through the Codex browser and will
enter login credentials directly when required. No account setting was changed.

- Google Cloud project `fitout-505104` (FitOut), project number `146998383967`, is
  accessible in the signed-in browser. Its credentials list shows one Web application
  OAuth client, `FitOut Client 1`, created August 10, 2026. The public client identifier
  is `146998383967-h27qqn2rp51k9m3favsm391hlrt6nv0l.apps.googleusercontent.com`.
- That client's authorized JavaScript origins list is empty. Its sole authorized
  redirect URI is `http://localhost:3000/api/auth/callback/google`. Neither production
  apex nor the proposed app callback appears in this inspected client.
- Audience is External, publishing status Testing, with zero test users. Publish is
  disabled and the page directs the owner to complete Branding. App name is FitOut;
  homepage, privacy-policy URL, terms URL and authorized domains are empty. Support
  and developer contact fields are populated; their personal values are not retained.
- Correspondence to the deployed production OAuth client remains **unknown**. The
  scoped Vercel metadata read confirms a Production `GOOGLE_CLIENT_ID` entry marked
  sensitive. Its read-only GET returned metadata without a public identifier value;
  no `GOOGLE_CLIENT_SECRET` was requested. Do not label this browser client production
  or infer that production Google sign-in is broken from this unrelated-client possibility.
- PayMongo opens at `https://dashboard.paymongo.com/login`. Its settings and mode
  remain unknown until the user signs in. Didit, Inngest and Resend remain uninspected
  in this browser session. The pending login is not evidence of missing account ownership.

Readback saved: 2026-10-09 10:56:07 AM Manila (02:56:07 UTC). Sources:
visible Google Credentials/client/Audience/Branding pages, PayMongo login page, and
allowlisted Vercel Production client-ID metadata. No secrets, changes, provider tests,
live inquiry or deployment occurred. Domain/cutover/Contact authority remains pending.

### PayMongo authenticated readback and production OAuth follow-up

Readback saved: 2026-10-09 04:32:27 UTC. The user completed PayMongo login directly in
the Codex browser. Settings → Webhooks shows one registered endpoint, Enabled:
`https://fitout.live/api/paymongo/webhook`. Its five subscriptions are
`checkout_session.payment.paid`, `merchant.activated`, `merchant.declined`,
`payment.refunded` and `payment.refund.updated`. The endpoint Overview confirms
the same URL, Enabled status and events. No app-subdomain receiver is listed.
Account live/test mode is not explicitly shown in these inspected settings;
signing-secret correctness and real signed delivery remain unverified. No secret
was revealed, delivery replayed, endpoint edited or financial action taken. Account
balances, transaction details and personal account identifiers are excluded here.

Production OAuth correspondence is the next check. Vercel's browser was opened at
the existing `fitout-web` environment-settings destination and redirected to login.
The connector session and browser session are separate: connector client-ID metadata
is available, but its value was not returned. The user has been asked to sign in
directly before inspecting only the public `GOOGLE_CLIENT_ID` value and comparing it
with the observed Google client. This is a pending login/readback, not cutover authority.

### Vercel client-ID visibility confirmed; application-session checkpoint

Readback saved: 2026-10-09 04:55:39 UTC. The user completed Vercel browser login.
The `fitout-web` Environment Variables page, filtered to `GOOGLE_CLIENT_ID`, shows
one Production entry added September 8. Its editor explicitly identifies it as
Secret/write-only: saved values cannot be revealed and cannot be changed to Config.
Copy to Clipboard is disabled. The Value field is empty, not a readback of an empty
configured client ID. The editor was cancelled; no variable or setting was changed.
This explains why the connector GET also returned metadata without the value.

A read-only navigation to `https://fitout.live/login` redirected to the app root.
The visible Navigation menu contains Profile, Switch to hosting and Sign out,
confirming an existing signed-in FitOut session in this browser. The Google sign-in
entry is therefore unavailable without ending that app session. The user has been
asked whether to sign out only this session and begin Google sign-in solely to read
the public OAuth client identifier, stopping before credentials/consent. No sign-out
or OAuth initiation has occurred; production client correspondence remains unknown.
The session screenshot is retained only under ignored Playwright cache for the handoff.

### Production Google OAuth client confirmed — 2026-10-09 05:11 UTC

The user explicitly approved signing out only the current FitOut browser session
and beginning Google sign-in to read its public client identifier, stopping before
credentials or consent. The production `/login` flow supplied exactly
`146998383967-h27qqn2rp51k9m3favsm391hlrt6nv0l.apps.googleusercontent.com`, matching
the inspected `FitOut Client 1` in Google Cloud project `fitout-505104`. This
supersedes the earlier **unknown correspondence** observations above; the original
JSON remains the dated October 8 snapshot.

Google rejected this actual production request with **Error 400:
`redirect_uri_mismatch`**. Its visible error details identify
`redirect_uri=https://fitout.live/api/auth/callback/google`. Combined with the
client's localhost-only registration, this establishes a current production
Google sign-in configuration failure before the Phase27 cutover. It does not prove
future app-origin sign-in or successful consent. Testing/audience/branding
prerequisites still require separate resolution and fresh verification.

The session sign-out completed and the probe ended at Google's rejection without
entering credentials, granting consent or completing a new FitOut sign-in. A
cropped error-details screenshot, excluding account identity, is retained only at
ignored `playwright/.cache/phase27-08/oauth-production-callback-error.jpg`. No raw
OAuth URL, state, code, error payload or credential is retained. The browser was
returned to `https://fitout.live/login`. No Google/Vercel setting was changed.

### Didit authenticated configuration readback — 2026-10-09

The existing browser session grants access to the Didit Business Console. Its
selected application explicitly shows **Test mode**, with verifications described
as simulated. This is the observed console scope, not proof of production key or
workflow correspondence. No mode switch was performed.

Webhooks shows one ACTIVE destination, `FitOut host verification`, at
`https://fitout.live/api/didit/webhook`, with one subscribed event. The destination
editor shows payload version `v3.0`; the event's selected name was not independently
established. The editor was cancelled without changing any field. No app-subdomain
destination appeared in the list. Signing configuration, delivery retries and actual
signature acceptance remain unverified; no secret was revealed or test sent.

The `FitOut Host Verification` graph workflow has identifier
`63f24717-7167-4cee-867e-688284d4c2ee` and displays `V1 LIVE`, a published workflow
version distinct from the application's Test mode. Its Settings panel displays no
Callback URL value, maximum retry attempts 7, retry window 7 days and session validity
7 days. These are workflow/end-user retry settings, not webhook delivery retries.
No graph, eligibility setting, version or session was changed. The local provider
source sends `callback: absoluteAppUrl(CALLBACK_PATH)` with each session request;
the blank console workflow field is therefore not evidence of a missing runtime
browser return. The deployed runtime return and production workflow binding remain
unverified. No identity-session details or personal identifiers are retained here.

### Inngest authenticated production registration — 2026-10-09

The browser is signed in to the Inngest account. In its **Production** environment,
the Active Apps list shows one app, `fitout`, with 14 functions. The app detail
shows Last sync **Success**, displayed timestamp October 8, 2026 at 6:47:16 PM
(dashboard timezone not established), SDK `4.13.0`, Next.js / JavaScript, and
registration method Serve. Its Vercel project link is `fitout-web` and deployment
link identifies `dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv`, matching the earlier apex
inventory. The serve destination's nonsecret origin/path is
`https://fitout-mketqxgc5-pengr3s-projects.vercel.app/api/inngest`, rather than apex
or app.fitout.live. Registered function names are checkout-retire-sweep,
didit-reconcile, guest-email, guest-email (failure), notify, notify (failure),
ops-alert-digest, payment-reconcile, payout-reconcile, payout-sweep,
reminders-sweep, request-expiry-sweep, settlement-account-probe and
settlement-reconcile. Several displayed triggers are schedules. A single listed
app does not establish globally unique schedulers across all workspaces/environments.

The destination displayed a Vercel protection-bypass credential in its query
string. That credential was neither requested, followed nor used; its value and
full URL are excluded from evidence. This is a separate current registration
observation from the earlier ops share-link exposure. The account owner must
coordinate invalidation/replacement with a verified replacement Inngest serve
registration so scheduled jobs are not disrupted. No credential was revoked or
rotated, app resynced, schedule changed, event triggered or function executed here.
Signing validation and old/new destination continuity remain unverified.

Resend is open at `https://resend.com/login`, awaiting direct user login. Domain
verification, sender/key scope and delivery evidence remain unknown.
