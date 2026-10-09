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
