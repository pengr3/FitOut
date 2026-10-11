# Phase 27 — Current external inventory

The opening JSON consolidates the latest observed facts and explicit partial statuses. The approved Stage A/B/C rollout is live at d67fbecf. Both Production database targets are owner-attested. Provider correspondence and final Contact/control/inbox observations remain incomplete. Earlier dated prose below retains historical observations.

Historical account-access snapshot follows.

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
  "observedAt": "2026-10-10T11:57:15.492Z",
  "rows": [
    {
      "id": "customer-project",
      "status": "observed",
      "owner": "Vercel account owner",
      "current": "Final C exact d67fbecf web dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW serves apex marketing/app subdomain; app verifiedTLS200.",
      "target": "fitout-web retains apex/www and adds app.fitout.live; same compatible source deployment",
      "observedAt": "2026-10-10T11:57:15.492Z",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "requiredProof": "Read back app alias attachment and verified TLS after approved change",
      "rollback": "Restore apex alias to dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv; retain old/new receivers"
    },
    {
      "id": "ops-project",
      "status": "observed",
      "owner": "Vercel account owner",
      "current": "Separate retained project final C dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ; existing staff session worked, sign-out isolates customer app, unauthenticated/customer-only ops cloaked.",
      "target": "Retain exact separate ops.fitout.live project attachment and host-only staff cookies",
      "observedAt": "2026-10-10T11:57:15.492Z",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "requiredProof": "Post-change staff login and app/apex session separation",
      "rollback": "Restore ops alias to dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS and original Production origin values"
    },
    {
      "id": "dns-tls-www",
      "status": "observed",
      "owner": "Vercel/DNS account owner",
      "current": "No DNS writes; normal HTTPS hostname validation succeeds; www->apex307 readback preserves full repeated path/query.",
      "target": "Valid apex/app/ops TLS; www.fitout.live 307 to https://fitout.live preserving path/query, later permanent only after acceptance",
      "observedAt": "2026-10-10T11:57:15.492Z",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "requiredProof": "Current authoritative DNS RRsets, app record target, certificate hostname/expiry, actual www GET/HEAD path/query redirect",
      "rollback": "Restore saved exact prior RRsets/TTL and alias settings; preserve sender-domain DNS"
    },
    {
      "id": "environment-scopes",
      "status": "partial",
      "owner": "Vercel account owner",
      "current": "Both Production primary app vars=https://app.fitout.live; Marketing=https://fitout.live; compatibility empty/runtime-unset; Ops unchanged; Contactfalse; exact Preview branch account isolation measured. Production DB target owner-attested, not decrypted-secret readback.",
      "target": "Production both app vars=https://app.fitout.live; MARKETING_APP_URL=https://fitout.live; ops unchanged; Contact false. Preview generated exact app authority plus explicit isolated ops/marketing aliases and schema-only DB",
      "observedAt": "2026-10-10T11:57:15.492Z",
      "source": "playwright/.cache/phase27-08/continuity-final-env-schema-20261010-3.json plus preview-runtime-proof-20261010.json and earlier allowlisted public-origin readback",
      "requiredProof": "Confirm exact runtime Production database binding for both projects; fresh exact-source cloud build/origin/session/provider proof still required. Existing b835 Preview proof does not accept the integrated candidate.",
      "rollback": "Restore both Production app vars=https://fitout.live; restore prior marketing key absence and ops origin; rebuild because NEXT_PUBLIC is baked"
    },
    {
      "id": "google-oauth",
      "status": "observed",
      "owner": "Google Cloud OAuth client owner",
      "current": "Fresh client readback app JS origin and localhost/apex/app callbacks; actual fresh app Google flows pass A/B/C; Publishing remains Testing/basic identity exception.",
      "target": "Add https://app.fitout.live origin and exact https://app.fitout.live/api/auth/callback/google; retain needed old registrations during bridge window",
      "requiredProof": "Current client/account/mode read-back, old/new exact entries, live state/consent roundtrip without code/state replay",
      "rollback": "Restore saved registrations; old apex OAuth codes restart sign-in rather than replay",
      "observedAt": "2026-10-10T11:57:15.492Z",
      "source": "playwright/.cache/phase27-08/production-provider-readback-20261010.json + production-browser-final-20261010.json"
    },
    {
      "id": "paymongo",
      "status": "partial",
      "owner": "PayMongo account owner",
      "current": "Fresh browser readback shows one Enabled apex webhook for five documented events, and actual old/new unsigned receivers return direct 400. Production mode/key correspondence and signed successful delivery remain unproved.",
      "target": "Direct old https://fitout.live/api/paymongo/webhook and new https://app.fitout.live/api/paymongo/webhook; browser success/cancel returns app; no financial events",
      "requiredProof": "Account-mode receiver/event/signature configuration read-back, retained old receiver, unsigned denial and bounded signed nonfinancial proof authority",
      "rollback": "Restore exact prior receiver/event registration; keep both direct handlers and unchanged signing/deduplication; checkout HOLD",
      "observedAt": "2026-10-10T12:06:50.450Z",
      "observationType": "Dated evidence consolidation and partial-status review; provider account readback times are retained in the cited sources, not asserted fresh here.",
      "source": "playwright/.cache/phase27-08/production-provider-readback-20261010.json"
    },
    {
      "id": "didit",
      "status": "partial",
      "owner": "Didit application owner",
      "current": "Retained October 9 browser observation identifies one active apex v3 webhook in the inspected CLMC Sandbox/Test application. Actual old/new unsigned receivers return direct 400. Production workflow binding and signed delivery remain unproved.",
      "target": "Direct old/new /api/didit/webhook; browser return https://app.fitout.live/host/verify; eligibility unchanged",
      "requiredProof": "Exact application/workflow receiver and signature/retry read-back; browser return; no real identity session required for inventory",
      "rollback": "Restore saved webhook/return registration; never redirect webhook POST or alter approval policy",
      "observedAt": "2026-10-10T12:06:50.450Z",
      "observationType": "Dated evidence consolidation and partial-status review; provider account readback times are retained in the cited sources, not asserted fresh here.",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-DEPLOYMENT-INVENTORY.md — dated October 9 authenticated didit browser readback section, plus .planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "providerReadbackDate": "2026-10-09"
    },
    {
      "id": "inngest",
      "status": "partial",
      "owner": "Inngest workspace owner",
      "current": "Retained October 9 browser observation shows one Production Active fitout app and 14 functions at the existing serve registration. Actual old/new unsigned receivers return direct 401. Current source/mode/signing correspondence remains partial; no registration or scheduler mutation performed.",
      "target": "Retain compatible old/new /api/inngest GET/HEAD/POST/PUT, registration on approved app origin without duplicate schedules",
      "requiredProof": "Current workspace/app serve URL, environment, registered functions, signing verification and exactly one active scheduler",
      "rollback": "Restore prior serve registration without creating duplicate schedules; retained direct apex endpoint",
      "observedAt": "2026-10-10T12:06:50.450Z",
      "observationType": "Dated evidence consolidation and partial-status review; provider account readback times are retained in the cited sources, not asserted fresh here.",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-DEPLOYMENT-INVENTORY.md — dated October 9 authenticated inngest browser readback section, plus .planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "providerReadbackDate": "2026-10-09"
    },
    {
      "id": "resend-sender",
      "status": "partial",
      "owner": "Resend sending-domain owner",
      "current": "Retained October 9 account observation shows verified send.fitout.live and send-only domain-scoped key metadata. The prior standalone transport test was delivered and owner receipt confirmed. New deployed Contact receipt/Reply-To/reply proof remains missing.",
      "target": "Retain verified send.fitout.live sender, fixed From, existing monitored SUPPORT_EMAIL and validated Contact Reply-To",
      "requiredProof": "Current DNS verification + sender/key scope read-back, provider acceptance under bounded authorized inquiry, without exposing key/message identifiers",
      "rollback": "Retain sender DNS/key; set Contact false first; restore previous sender config only if changed",
      "observedAt": "2026-10-10T12:06:50.450Z",
      "observationType": "Dated evidence consolidation and partial-status review; provider account readback times are retained in the cited sources, not asserted fresh here.",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-DEPLOYMENT-INVENTORY.md — dated October 9 authenticated resend-sender browser readback section, plus .planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "providerReadbackDate": "2026-10-09"
    },
    {
      "id": "support-mailbox",
      "status": "partial",
      "owner": "Existing SUPPORT_EMAIL mailbox owner",
      "current": "Owner confirmed monitored SUPPORT_EMAIL pengr.clmc.3@gmail.com, received the prior standalone transport test, and sent a reply whose arrival remains unproved. No new deployed Contact inquiry sent; new inquiry sender address is missing.",
      "target": "Existing monitored inbox receives one safe authorized inquiry and owner confirms Reply-To plus reply arrival",
      "requiredProof": "Named available owner, scoped inquiry authority and dated actual receipt/Reply-To/reply observation; no mailbox address or PII in packet",
      "rollback": "Disable Contact and retain recoverable failure; no new mailbox/ticketing system",
      "observedAt": "2026-10-10T12:06:50.450Z",
      "observationType": "Dated evidence consolidation and partial-status review; provider account readback times are retained in the cited sources, not asserted fresh here.",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-INBOX-AND-PREVIEW-READBACK-20261010.md + .planning/phases/27-app-subdomain-marketing-website/27-CUTOVER-PACKET.md supportInboxConfirmation and current inquiry gate"
    },
    {
      "id": "contact-waf-global",
      "status": "partial",
      "owner": "Vercel security and mailbox owners",
      "current": "Bounded approved no-mail test completed: distinct-network temporary WAF denial, deployed global429 Retry-After3311 and sequential local6th429 observed. Restored Stage C customer/ops pins, both savedflagsfalse, quota0 and temporaryguarddisabled; original logging rule remains active. Automatic quota alert and shared cross-instance per-IP proof pending.",
      "target": "Verified deployment-wide per-IP <=5/15min plus global mailbox <=100/hour before Contact true; process-local Map insufficient",
      "requiredProof": "Published enforcing rule + trusted ingress + distributed cross-region/global mailbox budget and bounded control test; account plan/limits checked",
      "rollback": "CONTACT_PRODUCTION_ENABLED=false on customer/ops deployments, redeploy, verify real 503 and retained form recovery",
      "observedAt": "2026-10-11T05:31:14.208Z",
      "observationType": "Actual mobile-carrier WAF evidence, Production HTTP probes, deployment/publicflag readback and exact-fingerprint fixture cleanup",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-BOUNDED-TEST-RESULT.md"
    },
    {
      "id": "deployment-revision",
      "status": "observed",
      "owner": "Vercel release owner",
      "current": "Final Stage C customer dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW and separate ops dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ are READY and promoted at exact d67fbecfa41e902cbf506c93dbcf53b60085e802. Original and Stage A rollback targets are retained. Owner walkthrough Preview aliases remain on b8358b11; separate exact-source Preview isolation is observed.",
      "target": "One exact reviewed Phase27 SHA recorded before approved deployment, then alias/build read-back",
      "observedAt": "2026-10-10T12:04:27.308Z",
      "source": ".planning/phases/27-app-subdomain-marketing-website/27-EVIDENCE.md",
      "requiredProof": "Approved final source SHA, build/environment binding, alias read-back and rollback candidates",
      "rollback": "Recorded exact READY deployment IDs above; restore env and rebuild where origins changed"
    }
  ],
  "currentContactAlertRelease": {
    "observedAt": "2026-10-11T06:32:08.155Z",
    "webDeployment": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
    "webRevision": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5",
    "opsUnchanged": {
      "host": "ops.fitout.live",
      "id": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
      "state": "READY",
      "sha": "d67fbecfa41e902cbf506c93dbcf53b60085e802"
    },
    "contactFlag": false,
    "primaryMigration": {
      "tag": "0038_contact_alert",
      "hash": "c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9",
      "ledgerEntries": 39,
      "when": 1791698400000
    },
    "monitor": {
      "app": "fitout-contact-alerts",
      "endpoint": "https://fitout.live/api/contact-alerts/inngest",
      "function": "contact-control-monitor",
      "cron": "1-59/5 * * * *",
      "syncedAt": "2026-10-11T06:19:21Z"
    },
    "recipient": "pengr.clmc.3@gmail.com",
    "syntheticDelivery": {
      "id": "p27-owner-alert-20261011-b61cb4a4",
      "createdAt": "2026-10-11T06:19:52.912Z",
      "providerId": "01a1299f-3ff8-7eff-a94c-783d416d5993",
      "sentAt": "2026-10-11T06:21:05.756Z",
      "providerStatus": "delivered",
      "ownerInboxConfirmed": true
    },
    "evidence": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-AUTOMATIC-ALERTS.md"
  }
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

### Resend authenticated readback — 2026-10-09 13:43 Manila (05:43 UTC)

The user completed Resend login directly. Domains lists `send.fitout.live` as
**Verified**. Its detail page states the domain is ready to send, provider Vercel,
region **Tokyo (`ap-northeast-1`)**. The Records panel shows DKIM TXT Verified and
both SPF MX/TXT Verified; Sending is enabled and Receiving is disabled. The
Configuration panel selects Opportunistic TLS. No DNS, tracking, TLS or sending
setting was changed. These are provider readbacks, not independent authoritative
DNS resolution or a bounded Contact delivery test.

API keys lists `fitout-production-mail` with **Sending access**. Its detail page
restricts that key to `send.fitout.live`. The list also contains other Full-access
keys; no key was opened to reveal its value, created, edited, revoked or rotated.
The named send-only key's correspondence to the deployed `RESEND_API_KEY` remains
unverified, because no secret comparison was requested or performed.

The initial authenticated Emails page displays provider Delivered statuses for
existing application mail. No message was opened or sent; recipients, subjects,
message IDs and bodies are excluded from evidence. These historical provider
statuses do not establish Contact inbox receipt, Reply-To correctness, a delivered
reply or an available monitoring owner.

Browser account access is now observed for Google Cloud, PayMongo, Didit, Inngest,
Resend and Vercel. This completes the requested login/access pass; it does not prove
every account permission, production binding, signature, control or cutover check.
No provider settings, DNS, deployment, inquiry or release HOLD changed.

### Approved Google registration saved and apex sign-in verified — October 9

At approximately 13:51 Manila (05:51 UTC), following the user's explicit
“okay approved” reply to the exact unsaved proposal, Save was applied to
`FitOut Client 1` in project `fitout-505104`. Reopening the exact client from Google
confirmed persistence of authorized JavaScript origin `https://app.fitout.live`
and all three redirect URIs:

- `http://localhost:3000/api/auth/callback/google` (retained).
- `https://fitout.live/api/auth/callback/google` (added).
- `https://app.fitout.live/api/auth/callback/google` (added).

The initial save navigation went to a blank page rather than displaying a success
toast; persistence is proved by the subsequent fresh client-page readback, not
the click alone. Cropped readback screenshots excluding account identity and
client-secret fields are retained only in ignored Playwright cache as
`oauth-origin-saved.jpg` and `oauth-callbacks-saved.jpg`.

A fresh `https://fitout.live/login` → Continue with Google request then returned
to the FitOut app root. The Navigation menu displayed Profile, Switch to hosting
and Sign out, confirming an authenticated application session. The existing
Google browser account completed authorization automatically; no credentials,
account selection or consent button were entered/clicked. This establishes a
successful current-apex roundtrip for that browser account, resolving the observed
`redirect_uri_mismatch` on this fresh attempt. It does not prove first-time consent,
all users or the future app-domain roundtrip. A cropped successful-session screenshot
is retained as ignored `oauth-apex-signin-success.jpg`. No OAuth state, code, raw
authorization/callback URL, account identity or credential is retained.

The user approved only these client-registration additions. Audience publishing,
branding edits, secrets, deployments, DNS and other provider destinations were not
changed. The previously observed External/Testing audience remains outside this
approval; full production audience readiness and app-domain proof remain pending.
Contact remains disabled; checkout/payout/legal HOLD and phase completion are unchanged.

### Continuation: current host, DNS and customer environment readbacks — October 9

At 06:04:10–06:04:13 UTC (14:04 Manila), anonymous requests without cookies or
protection bypass independently resolved and authenticated TLS for apex, www, app
and ops. Normal hostname/certificate validation succeeded with TLS1.3; the
certificate subject is CN=*.fitout.live, issuer Let's Encrypt YR2, expiry
2026-12-10T03:13:43Z. No certificate-validation override was used.

| Anonymous HEAD request | Result | Meaning |
|---|---|---|
| https://fitout.live/ | 200 | Current apex responds; does not identify its source revision. |
| https://www.fitout.live/phase27-readback?probe=path-query | 404; no Location | Planned www path/query redirect is absent on this probe; GET remains unmeasured. |
| https://app.fitout.live/ | 404; x-vercel-error=DEPLOYMENT_NOT_FOUND | DNS/TLS exist but app has no functioning Vercel destination. |
| https://ops.fitout.live/ | 404; no-store/private | Root cloak is consistent with its intended policy; staff login is not tested by this request. |

The retained read-only probe and filtered response/certificate observations are
ignored `playwright/.cache/phase27-08/read-current-hosts.ps1` and
`current-host-readback.json`. Resolver A answers and cached TTLs vary by host;
they are not relabeled as authoritative zone records.

Authenticated Vercel connector readbacks, explicit team scope, subsequently show:

- Customer project domains remain fitout.live, www.fitout.live and its Vercel
  project hostname. app.fitout.live is absent; www redirect/status fields are null.
- Zone apex ALIAS -> 5e81041e11df6426.vercel-dns-017.com and wildcard ALIAS ->
  cname.vercel-dns-017.com., both TTL60. No separate app/www/ops zone record is listed.
  The existing wildcard explains app resolution; an app DNS write is not currently
  required to explain or fix its missing project attachment.
- Nameservers are ns1.vercel-dns.com/ns2.vercel-dns.com. Domain configuration reports
  misconfigured=false and no conflicts. Sender DKIM/SPF/MX and DMARC records remain
  present; their contents are omitted and were not changed.
- fitout-web Production BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL both remain
  https://fitout.live; OPS_APP_URL remains https://ops.fitout.live. Individually
  read allowlisted nonsecret values confirm these fields. Metadata listing with
  decrypt=false shows MARKETING_APP_URL, MARKETING_PREVIEW_URL and
  CONTACT_PRODUCTION_ENABLED absent. Other secret values were not read.
- Preview lists production ops-origin metadata alongside auth/database/Inngest
  keys. Isolation is not established by key presence. Ops project's configuration
  and deployment identities above retain their October 8 timestamps.
- An explicitly scoped fitout-web active firewall-config GET again returns 404
  config-not-found. This is not proof of account incapability or absence of all
  platform protection; no published configuration proves the required shared limits.

No DNS, alias, environment, firewall, provider setting or deployment was mutated
during this continuation. The only approved external change remains the separately
recorded Google registration save. Plans 08/09 and all requirement counts are unchanged.

### Scope decision and Preview/ops readback — October 9 06:44 UTC

The user chose to keep the scope unchanged and log the existing baseline failures
for repair through gap planning after execution. deferred-items.md records them.
This is not authority for a provider/env/deployment change or Contact inquiry.

Continued explicit-team read-only connector calls confirm the customer project's
Preview OPS_APP_URL value is https://ops.fitout.live. The ops project also has
Preview OPS_APP_URL=https://ops.fitout.live. These are individually read nonsecret
values, not guesses from key presence. Both Preview scopes therefore point this
origin at production ops; the intended isolated Preview configuration is unproved.
No Preview sign-in, production credential read or database connection was attempted;
no cross-environment account disclosure is inferred from the origin setting alone.

Fresh fitout-ops Production nonsecret readbacks retain BETTER_AUTH_URL and
NEXT_PUBLIC_APP_URL=https://fitout.live, OPS_APP_URL=https://ops.fitout.live.
Metadata listing with decrypt=false shows MARKETING_APP_URL, MARKETING_PREVIEW_URL
and CONTACT_PRODUCTION_ENABLED absent. Project domains remain verified
ops.fitout.live and fitout-ops.vercel.app, without a configured redirect. No alias
listing or protection-bypass URL was requested. Deployment IDs above retain their
earlier timestamps; this readback does not refresh source-SHA/build proof.

These configuration findings remain in-scope cutover prerequisites. They are not
covered by the user's deferral of unrelated test/design repairs. All changes and
controlled sends remain subject to the existing exact packet checkpoint.


## October9 blocker-repair readbacks (15:00–15:35 UTC)

Explicit-team Vercel get_project/list_project_domains/filter_project_envs/get_project_env
readbacks retain the existing rollback deployments. fitout-web has no app.fitout.live
project domain; www still has no redirect. Both project Preview OPS_APP_URL values
remain https://ops.fitout.live. fitout-web has a write-only Preview DATABASE_URL;
its actual branch is unproved. fitout-ops has no Preview DATABASE_URL entry in this
readback. Distinct Preview Inngest keys are present on web, but presence is not
provider/account isolation. The firewall config API returned404, which is not
proof of a global control. Runtime setting24.x is observed; the deployed patch
version is not. No settings, deployment or credentials were changed.


## October 10 continuation

The project owner confirms the monitored launch support inbox. One authorized standalone Resend transport test is Delivered with the expected Reply-To; owner receipt and a deployed Contact endpoint/reply are still pending. Preview has a hidden web database binding, no returned ops database binding and production ops origins in both projects. No dedicated schema-only Preview branch exists; isolation is unproved. Quota-table and dedicated Preview branch decisions remain pending. See 27-INBOX-AND-PREVIEW-READBACK-20261010.md; no settings or deployment changed.

## October 10 current continuation readback (04:54 UTC)

This section supersedes the earlier continuation paragraph. Plans18–20 completed:
schema-only Preview branch `br-silent-glade-b31mruln` exists, its reviewed quota
table/index and contention proof pass, and both isolated Preview deployments are
READY at b8358b11. Actual disposable signup/session, ops rejection of the app
Preview cookie and disabled Contact503 are recorded in 27-20-SUMMARY.md. The owner
confirmed the standalone transport email receipt and sent a reply; reply arrival
and a deployed Contact roundtrip remain unproved. The stable Preview stays pinned
for the owner's UI walkthrough. None of this proves production cutover.

Current nonsecret account readback is retained at
`playwright/.cache/phase27-08/compatibility-inventory-readback-20261010.json`:

- Production alias/deployment readbacks retain customer
  `dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv` and ops
  `dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS`, both READY at 36455580.
  The app subdomain is still not attached; www has no redirect. Web Production
  auth/public app variables remain apex, ops remains its existing dedicated host;
  marketing, compatibility and Contact variables are absent in Production scope.
- Google client readback confirms the saved app JavaScript origin and localhost,
  apex and app callbacks. Audience is External/Testing with zero test users.
  Branding name is FitOut, authorized domain fitout.live; home/privacy/terms URL
  fields are blank. Publishing remains unchanged. Installed Better Auth uses
  default email/profile/openid scopes with no added auth.ts scopes. Google's
  [identity-only exception](https://support.google.com/cloud/answer/15549945?hl=en)
  means Testing/zero test users alone is not evidence of blocked basic sign-in.
  This is a source-based inference; fresh new-host sign-in remains required.
- PayMongo retains one Enabled apex webhook and the same five subscriptions.
  No new destination, signing-secret reveal, event replay or financial action.
  The inspected endpoint page does not establish live/test mode or signed delivery.
- Didit explicitly shows CLMC Sandbox/Test mode, one Active apex destination,
  payload v3, one event. Production application/key/workflow correspondence and
  the selected event name remain unproved. No mode switch or identity session.
- Inngest Production has one Active fitout app, 14 functions, Serve/SDK4.13.0,
  still pinned to the recorded old deployment URL. Its credential query must be
  handled privately in coordinated registration replacement; no credential value
  is copied into this artifact. No sync, schedule or event mutation occurred.
- Resend send.fitout.live is Verified. No further email was sent.
- Explicit read-only Neon Production query on `br-divine-lake-b3in9zag` confirms
  `public.contact_quota` absent, existing migration ledger with 37 rows and latest
  timestamp1791388800000. The new quota journal timestamp is1791565875571.
  Production writes remain zero. Propose only the reviewed additive quota
  migration and normal ledger bookkeeping, with exact branch/SQL readback;
  never run schema push or replay old manual migrations.

Original08/09 remain incomplete. Compatibility staging proof is being prepared
locally; exact production setting/migration authority and deployed provider/inbox
proof remain pending. Checkout, payout and legal HOLD are unchanged.

Latest deployment readback is retained in
`playwright/.cache/phase27-08/continuity-final-deployments-20261010-2.json`.
Both production deployments remain READY at36455580 ondev; both owner Preview
deployments remain READY atb8358b11 on the isolated Preview branch. The earlier
`continuity-final-pins-20261010.json` correctly records aliases, but its deployment
rows contain IDs only; the new readback supplies state and source without filling
in missing historical observations. Production DATABASE_URL metadata is sensitive
and write-only, with no integration configuration/store mapping. That metadata
does not prove the actual production database binding; exact branch confirmation
is still required before any proposed production migration.

Final read-only account refresh (2026-10-10T07:30:01.843Z): all production/Preview deployment pins and five aliases remain unchanged. Both all-scope environment metadata sets match the earlier saved baseline (web42 entries, ops39); values were not decrypted. Explicit primary br-divine-lake-b3in9zag/neondb still has37 migration entries and no contact_quota. That explicit branch observation does not prove Vercel runtime binding. Sources: playwright/.cache/phase27-08/continuity-final-pins-20261010-3.json and playwright/.cache/phase27-08/continuity-final-env-schema-20261010-3.json.

## Exact packet approval — October 10

The exact packet action authority is now approved; runtime database binding remains unknown. Fresh read-only preflight playwright/.cache/phase27-08/approved-cutover-preflight-20261010.json at 2026-10-10T10:01:21Z confirms both Production aliases remain36455580 and all three owner Preview aliases stayb835. Both Production DATABASE_URL entries are sensitive with no configuration mapping. Explicit primary br-divine-lake-b3in9zag/neondb still has37 migration rows, latest1791388800000, and no contact_quota. These are explicit branch observations, not proof of either Vercel runtime database target. No external mutation.


Approved release source preparation (2026-10-10T10:08:34Z): exact d67fbecfa41e902cbf506c93dbcf53b60085e802 is published and read back at refs/heads/codex/phase27-cutover-d67fbecf in pengr3/FitOut. Browser environment rows confirm both projects track dev for Production and other unassigned branches use Preview. Automatic isolated Preview builds dpl_A9X3qDaZ92oV7DNB9TYVo65yMbay (web) and dpl_3eFqxwfjD2m7DPmeev4ytQ6B6Q1Z (ops) started; current states dpl_A9X3qDaZ92oV7DNB9TYVo65yMbay=BUILDING, dpl_3eFqxwfjD2m7DPmeev4ytQ6B6Q1Z=QUEUED. These are release-source preparation, not approved Stage A/B/C production deployments or final runtime acceptance. All five Production/walkthrough aliases are unchanged. No Production environment/domain/provider setting or migration changed; no Contact send. Read playwright/.cache/phase27-08/approved-release-branch-20261010.json. Actual both-project Production database binding remains required.


Final approved-source Preview build readback (2026-10-10T10:12:06Z): web dpl_A9X3qDaZ92oV7DNB9TYVo65yMbay and ops dpl_3eFqxwfjD2m7DPmeev4ytQ6B6Q1Z are both READY at exact d67fbecfa41e902cbf506c93dbcf53b60085e802 on codex/phase27-cutover-d67fbecf. Existing Production and all three b835 walkthrough aliases are freshly read back unchanged. Source publication/build preparation is complete; these isolated Preview builds are not Stage A/B/C Production builds and do not supply live runtime acceptance. No new access link, provider setting, Production environment/domain/migration or Contact inquiry. Both actual Production DATABASE_URL bindings remain the immediate human/account prerequisite. Authority is approved and must not be requested again. Counts stay19/21, original08/09 and all seven requirements pending. Proof: playwright/.cache/phase27-08/approved-release-builds-final-20261010.json.


Production preparation readback (2026-10-10T11:07:41.631Z): owner confirmed both runtime database targets (attestation, not decrypted secret). Reviewed0037 additive primary migration is actually applied:38 ledger entries, canonicalhash8b657d22…, expected empty table/columns/indexes. Both-project Stage A public Production settings read back and auto-domain assignment false; old deployments have not been represented as new live proof. Contact remains false and provider account edits require fresh readback. Plan09 is active; all live requirements pending.


Current live Stage A (2026-10-10T11:23:52.596Z): customer dpl_EawThnAR9vr4EEumpTHnpBh6yAYB and ops dpl_GjHd59ThRnH73gmFbUjhGviN1ZQV are READY exact d67fbecf and promoted. App verified/TLS200; apex retains app search, ops root/console404 for customer and distinct staff login200. Both old/new signed receivers deny unsigned requests directly (400/400/401). Google registered exact app origin plus retained localhost/apex/app callbacks; Stage A app Google login visibly succeeded. PayMongo enabled apex receiver retains five subscriptions; mode/signed delivery remain unproved. No provider registration edited. Stage B builds retain Contact false. Production active firewall config API returned404 config not found; distributed database admission is implemented/applied but production enforcement/alert proof remains pending. Controlled QRPh Test Court — Not Public appears in public search; record as existing listing-visibility gap, no listing mutation. Live source-bound proof retained in ignored cache; no requirement acceptance.


Final C current readback (2026-10-10T11:57:15.492Z): exact customer/ops IDs in27-EVIDENCE. Six marketing routes and app/staff front doors work; canonical/sitemap/advertised image facts observed; both old/new unsigned receivers remain direct. Auth/session/browser/mobile history and exact-source isolated Preview observations are retained. Provider production mode/key/workflow correspondence and remaining Contact control facts stay partial, not inferred from existing secret presence or old dashboard history. No real mail, funds, secrets, DNS or provider registration change. Auto-domain flag remainsfalse for manual release control; production branchdev has not been pushed. Current root/source drafts remain preserved.

## Automatic Contact alerts — October 11

Automatic Contact alerts are live on web dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68 / b61cb4a43c8dd4c10e7444014fb66646aba36ec5. Separate app fitout-contact-alerts, signed receiver https://fitout.live/api/contact-alerts/inngest, every five minutes. Primary ledger39 with additive0038 hash c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9. First real scheduled run 01M4MSYB70J1M05HRHPVN6PQQQ processed1 synthetic incident; Resend delivered 01a1299f-3ff8-7eff-a94c-783d416d5993 and owner confirmed inbox receipt. Next scheduled run 01M4MT7G60J1M05HRHPVN6PQQQ processed0; one test email, no duplicate. Contact remains false/503, quota0, Ops stays D67. No public inquiry was sent. Other Plan09 evidence and money/legal HOLDs remain.

Read .planning/phases/27-app-subdomain-marketing-website/27-CONTACT-AUTOMATIC-ALERTS.md. Earlier D67/source-only scope and pending-alert paragraphs are dated history superseded by this owner-authorized Contact extension. No other original Plan09 gate waived.
