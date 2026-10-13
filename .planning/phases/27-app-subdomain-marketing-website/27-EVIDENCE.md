# Phase27 actual production evidence — incomplete

Provider signed-delivery result 2026-10-13T13:05:35.708Z: Didit Sandbox provider Test Not Started reached the actual6bb webG8 function with200, fresh signed eventd5a49c51-c418-4c12-95bd-613a257175e2 and complete Sandbox envelope; four apex/app unsigned controls have direct400 and matched current function records. FivePOSTs total, one Didit send/no repeat observed through2026-10-13T12:55:55.215Z; no PayMongo send. Business/audit hashes, aliases, false Contact flags, provider metadata and14+1 scheduler registrations remain unchanged. The run ledger closed33.430seconds beyond its900-second limit after final UI selector failures: functional proofs are observed, strict packet execution is not accepted. No further send or configuration change occurred during the overrun. PayMongo LIVE signed delivery and actual Contact inquiry/reply remain pending; testing accounts stay unchanged, Contact disabled, phase20/21 and curated144/151 with seven requirements pending. Read27-PROVIDER-SIGNED-DELIVERY-RESULT.md/.json.


Signed-delivery preparation 2026-10-13T12:32:51Z: current disabled6bb webG8/Ops3qt pair and all eight aliases/three false values read back; 84/84 exact-source webhook tests pass. PayMongo LIVE has no eligible nonfinancial replay (only old payment history, Retry disabled). Didit's12 historical test failures were404; inspected unsent Not Started preview omits event_id/environment and has a stale timestamp. Fresh packet proposes four unsigned controls and one Didit diagnostic dispatch, maximum15minutes/up to three natural Didit attempts; no PayMongo send, deployment/configuration/account mutation or Contact enablement. The diagnostic can retain synthetic audit outcomes; a mismatch may appear in the existing automatic Ops digest. Preparation only: no delivery proof or phase count advances. Read27-PROVIDER-SIGNED-DELIVERY-PACKET.md and27-PROVIDER-SIGNED-DELIVERY-PREPARATION.json. Existing test accounts remain unchanged.


Owner test-account disposition recorded 2026-10-13T12:03:48.437Z: cancel the proposed account cleanup and preserve the existing test accounts as they are. No repair authority, attempt or Production credential was created. The deployed6bb6e3f7 customer-role guards remain; both Contact settings stay false. Retain the legacy flags-on staff identity as an explicit owner-approved testing fixture, not a repaired data invariant. Account cleanup is no longer awaiting approval. Provider signed delivery and actual inquiry/reply gates remain open; phase/requirement counts are unchanged. See 27-OPS11-TEST-ACCOUNT-DISPOSITION.md.

Earlier account-cleanup preparation is superseded by this owner decision.

OPS-11 disabled release accepted 2026-10-13T11:38:29.375Z: source6bb6e3f7, webG8ZbTT/Ops3qtket, all eight serving aliases and false Contact values verified. Staff page/action denial and customer control passed; 30/40GETs,1hostingPOST,0ContactPOSTs/account mutations/manual financial jobs. Receivers14/16triggers plus separate1 verified; both watchdogs ended. The legacy staff flag repair selected by the owner is prepared separately and awaiting its account-write approval. Provider signed delivery and actual inquiry/reply remain open. The35/35matrix remains dated588;20/21plans,144/151curated, sevenpending requirements. Read27-OPS11-DISABLED-ROLLOUT-RESULT.md and27-OPS11-ACCOUNT-REPAIR-PACKET.md.

Earlier preparation and588candidate sections below are dated history. The structured35-row matrix retains its original source labels; the accepted current pair is in ops11DisabledRelease.

OPS-11 preparation 2026-10-13T10:38:21.268Z: source6bb6e3f7 passes all six engineering gates and separate flags-on staff runtime proof. Serving Production remains58897a94; account repair/disabled rollout, provider signed delivery and actual inquiry/reply remain open. Contact disabled. Read27-OPS11-REPAIR-RESULT.md.

Current Production pair: exact58897a94 webCogas andOps5WY. Contact remains disabled. Matrix35/35. Protected current-Production configuration proof observesPayMongoLIVE andDiditSANDBOX with matching provider signing configuration; directCogas diagnostic andsuccessfulsigneddelivery are notclaimed. Provider delivery/inquiry/reply andOPS-11 gates remain. Plan09 stays20/21, curated144/151, all7requirements pending. Read27-PROVIDER-RUNTIME-COORDINATOR-RESULT.md; older sections retain their historical dates.

```json
{
  "status": "incomplete-live-proof",
  "recordedAt": "2026-10-12T02:54:42.912Z",
  "matrixVersion": 1,
  "deployedRevision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
  "sourceManifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
  "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
  "deployments": {
    "customer": {
      "id": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "origin": "https://app.fitout.live"
    },
    "ops": {
      "id": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "origin": "https://ops.fitout.live"
    },
    "preview": {
      "id": "dpl_C9qrNjxKPHVk5jTsgvH1Cr9JFn9Q",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "origin": "https://fitout-mfuqlntu7-pengr3s-projects.vercel.app"
    }
  },
  "hostProviderControlMatrix": [
    {
      "id": "marketing-home",
      "host": "fitout.live",
      "url": "https://fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "marketing-home",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual HTTPS200 on marketing host; no redirect or internal-error marker.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:29.113Z"
    },
    {
      "id": "marketing-hosts",
      "host": "fitout.live",
      "url": "https://fitout.live/hosts",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "marketing-hosts",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual HTTPS200 on marketing host; no redirect or internal-error marker.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:30.643Z"
    },
    {
      "id": "marketing-players",
      "host": "fitout.live",
      "url": "https://fitout.live/players",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "marketing-players",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual HTTPS200 on marketing host; no redirect or internal-error marker.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:31.507Z"
    },
    {
      "id": "marketing-about",
      "host": "fitout.live",
      "url": "https://fitout.live/about",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "marketing-about",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual HTTPS200 on marketing host; no redirect or internal-error marker.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:32.572Z"
    },
    {
      "id": "marketing-faq",
      "host": "fitout.live",
      "url": "https://fitout.live/faq",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "marketing-faq",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual HTTPS200 on marketing host; no redirect or internal-error marker.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:33.138Z"
    },
    {
      "id": "marketing-contact",
      "host": "fitout.live",
      "url": "https://fitout.live/contact",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "marketing-contact",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual HTTPS200 on marketing host; no redirect or internal-error marker.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:33.688Z"
    },
    {
      "id": "app-home-only",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "app-home-only",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual customer search home200, correct search content and no-store response.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:35.935Z"
    },
    {
      "id": "www-full-query",
      "host": "www.fitout.live",
      "url": "https://www.fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "www-full-query",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual307 to apex with both supplied proof/keep query keys preserved.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:41.088Z"
    },
    {
      "id": "old-app-deep-link",
      "host": "fitout.live",
      "url": "https://fitout.live/profile",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "old-app-deep-link",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual307 to customer profile preserving supplied query.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:34.553Z"
    },
    {
      "id": "ops-front-door",
      "host": "ops.fitout.live",
      "url": "https://ops.fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "ops-front-door",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual Ops root404; separate staff /login200. Root never serves customer search.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:41.225Z"
    },
    {
      "id": "unknown-host-denied",
      "host": "lookalike.fitout.live",
      "url": "https://lookalike.fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "unknown-host-denied",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Real HTTPS404 at the Vercel ingress boundary, no redirect, cookie or app/marketing/internal-error content. Unknown host is denied before application routing; no claim that application code handled this unmapped host.",
      "proof": "playwright/.cache/phase27-08/remaining8-boundaries-http.json",
      "observedAt": "2026-10-11T22:17:47.395Z"
    },
    {
      "id": "internal-namespace-denied",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/marketing",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "internal-namespace-denied",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual internal /marketing namespace404.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:40.198Z"
    },
    {
      "id": "host-only-session-bridge",
      "host": "fitout.live",
      "url": "https://fitout.live/auth/session-check",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "host-only-session-bridge",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Genuine host-only old-origin fixture session remains valid through Stage B. After exact Stage C restoration it reaches new-host login200 without a loop; a separate new-host sign-in matches actor/role/capabilities, then its own session is signed out and confirmed null. No cookie transferred between hosts.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json",
      "observedAt": "2026-10-12T02:23:57.008Z"
    },
    {
      "id": "customer-ops-session-isolation",
      "host": "ops.fitout.live",
      "url": "https://ops.fitout.live/ops",
      "method": "GET",
      "deploymentId": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "customer-ops-session-isolation",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual owner customer profile authenticated, Ops /ops Page not found, then customer profile still authenticated. Browser host-cookie isolation without token export.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-auth-final.json",
      "observedAt": "2026-10-11T16:23:26.396Z"
    },
    {
      "id": "staff-customer-capability-denied",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/start-hosting",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "staff-customer-capability-denied",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual authenticated POST /start-hosting returned the staff denial via the deployed Server Action. Role staff, canBook/canHost false before and after; durable audit ineligible_role matches actor hash and request time; own new session signed out and verified cleared. Current alias/source binding retained.",
      "proof": "playwright/.cache/phase27-08/remaining8-staff-result-b17a3443-1a15-4582-ac19-4f7b87a9d5d5.json",
      "observedAt": "2026-10-11T23:10:37.295Z"
    },
    {
      "id": "stale-session-recovery",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/auth/session-check",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "stale-session-recovery",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Fabricated invalid session yields307 login and secure HttpOnly host-only deletion, no-store.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-supplemental-58897a94.json",
      "observedAt": "2026-10-11T15:42:04.973Z"
    },
    {
      "id": "google-fresh-state",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/api/auth/callback/google",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "google-fresh-state",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual sign-out, app login Google button, authenticated return and owner profile. Fresh end-to-end flow; callback query/state/token not inspected or collected.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-auth-final.json",
      "observedAt": "2026-10-11T16:23:26.396Z"
    },
    {
      "id": "issued-verify-token",
      "host": "fitout.live",
      "url": "https://fitout.live/api/auth/verify-email",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "issued-verify-token",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Genuine delivered fixture verification email issued at old fitout.live in Stage A. Original CTA clicked after current Cogas restoration without rewriting bearer URL; exact primary fixture email_verified changed false to true. Email delivery ID and redacted origin/query-key metadata retained; not an original October10 email.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json",
      "observedAt": "2026-10-12T02:29:07.401Z"
    },
    {
      "id": "issued-reset-token",
      "host": "fitout.live",
      "url": "https://fitout.live/reset-password",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "issued-reset-token",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Genuine delivered old-origin fixture reset CTA clicked after current Cogas restoration. Browser reaches Set a new password form at app.fitout.live while primary has one unexpired fixture-owned reset record. No password entered/submitted; bearer path/query omitted. Not an original October10 email.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json",
      "observedAt": "2026-10-12T02:37:08.801Z"
    },
    {
      "id": "next-link-rsc-history",
      "host": "fitout.live",
      "url": "https://fitout.live/hosts",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "next-link-rsc-history",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual browser Next Hosts click then back restored correct marketing URL, heading and title.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-browser-proofs-58897a94.json",
      "observedAt": "2026-10-11T15:42:50Z"
    },
    {
      "id": "rsc-prefetch-isolation",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "rsc-prefetch-isolation",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual app RSC prefetch contains customer search, excludes marketing hero.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-supplemental-58897a94.json",
      "observedAt": "2026-10-11T15:42:02.536Z"
    },
    {
      "id": "alternating-html-rsc-cache",
      "host": "fitout.live",
      "url": "https://fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "alternating-html-rsc-cache",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual alternating RSC/HTML and host requests retained expected content types and host-specific bodies.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-supplemental-58897a94.json",
      "observedAt": "2026-10-11T15:42:03.513Z"
    },
    {
      "id": "metadata-robots-sitemap",
      "host": "fitout.live",
      "url": "https://fitout.live/sitemap.xml",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "metadata-robots-sitemap",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual apex canonical plus expected marketing sitemap locations and robots sitemap.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-supplemental-58897a94.json",
      "observedAt": "2026-10-11T15:42:03.897Z"
    },
    {
      "id": "paymongo-old-direct",
      "host": "fitout.live",
      "url": "https://fitout.live/api/paymongo/webhook",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "paymongo-old-direct",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual unsigned empty POST reaches direct handler without redirect; signature/auth rejection, no valid event.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:42.837Z"
    },
    {
      "id": "paymongo-target-direct",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/api/paymongo/webhook",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "paymongo-target-direct",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual unsigned empty POST reaches direct handler without redirect; signature/auth rejection, no valid event.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:44.232Z"
    },
    {
      "id": "didit-old-direct",
      "host": "fitout.live",
      "url": "https://fitout.live/api/didit/webhook",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "didit-old-direct",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual unsigned empty POST reaches direct handler without redirect; signature/auth rejection, no valid event.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:43.284Z"
    },
    {
      "id": "didit-target-direct",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/api/didit/webhook",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "didit-target-direct",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual unsigned empty POST reaches direct handler without redirect; signature/auth rejection, no valid event.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:44.587Z"
    },
    {
      "id": "inngest-old-direct",
      "host": "fitout.live",
      "url": "https://fitout.live/api/inngest",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "inngest-old-direct",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual unsigned empty POST reaches direct handler without redirect; signature/auth rejection, no valid event.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:43.906Z"
    },
    {
      "id": "inngest-target-direct",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/api/inngest",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "inngest-target-direct",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual unsigned empty POST reaches direct handler without redirect; signature/auth rejection, no valid event.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:44.908Z"
    },
    {
      "id": "preview-account-isolation",
      "host": "fitout-mfuqlntu7-pengr3s-projects.vercel.app",
      "url": "https://fitout-mfuqlntu7-pengr3s-projects.vercel.app/",
      "method": "GET",
      "deploymentId": "dpl_C9qrNjxKPHVk5jTsgvH1Cr9JFn9Q",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "preview-account-isolation",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Same browser: Production owner profile authenticated, exact588 Preview home logged out and /profile returns login, Production profile still authenticated. Read-only owner-account count primary1/schema-only Preview0. No account/session/token export or new account.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-preview-isolation-final.json",
      "observedAt": "2026-10-11T16:30:51.047Z"
    },
    {
      "id": "contact-default-disabled",
      "host": "fitout.live",
      "url": "https://fitout.live/api/contact",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "contact-default-disabled",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual correct-Origin empty ContactPOST503 before parsing; savedflagsfalse.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:45.216Z"
    },
    {
      "id": "contact-trusted-ingress-per-ip",
      "host": "fitout.live",
      "url": "https://fitout.live/api/contact",
      "method": "POST",
      "deploymentId": "dpl_ED46Ed99PCUUhJrYSr6neFWTyu7m",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "contact-trusted-ingress-per-ip",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual cross-runtime 3+2 shared reservations; sixth429/825s and forged-header429/822s. Exact-source no-mail A/B, actual route pairs, ten total POSTs, Cogas restoration and exact cleanup verified.",
      "proof": "playwright/.cache/phase27-08/per-ip-api-trace-repaired-a19f3c88/control-binding.json",
      "observedAt": "2026-10-13T05:22:54.003Z",
      "controlTestProof": {
        "path": "playwright/.cache/phase27-08/per-ip-api-trace-repaired-a19f3c88/control-binding.json",
        "sha256": "f509100cd1a40fc5482c7b870ee1c61a713c104816a4f8077832ec62914f271c"
      }
    },
    {
      "id": "contact-distributed-global-budget",
      "host": "fitout.live",
      "url": "https://fitout.live/api/contact",
      "method": "POST",
      "deploymentId": "dpl_4NJowGQh9SUUX72Nx9Bi2h9ABkm9",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "contact-distributed-global-budget",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "99 owned seed reservations plus one real no-mail HTTP reservation created one natural incident. Distinct runtime denied with429/3512s; scheduled timers processed1 then0, one provider delivery and direct owner inbox receipt. Exact quota/incident cleanup, disabled Cogas restoration and14+1 functions preserved.",
      "proof": "playwright/.cache/phase27-08/global-alert-prepared-9ae3a34c/control-binding.json",
      "observedAt": "2026-10-13T06:38:54.780Z",
      "controlTestProof": {
        "path": "playwright/.cache/phase27-08/global-alert-prepared-9ae3a34c/control-binding.json",
        "sha256": "6ad75751931f88d92530d82662897ae6164a229d0fc4a326635f53116b053f32"
      }
    },
    {
      "id": "contact-disabled-recovery",
      "host": "fitout.live",
      "url": "https://fitout.live/api/contact",
      "method": "POST",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "contact-disabled-recovery",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "New disabled release actual503 while six marketing pages/customer/staff login are healthy. Inquiry form recovery not newly inferred.",
      "proof": "playwright/.cache/phase27-08/disabled-pair-http-58897a94-network.json",
      "observedAt": "2026-10-11T15:36:45.216Z"
    },
    {
      "id": "rollback-verified",
      "host": "app.fitout.live",
      "url": "https://app.fitout.live/",
      "method": "GET",
      "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "scenario": "rollback-verified",
      "expected": "Unchanged required Phase27 matrix contract",
      "status": "observed",
      "outcome": "pass",
      "observed": "Actual old/new primary and compatibility origins exercised through staged web A/B at exact588; all three web aliases restored to original Cogas in290.383seconds; Ops unchanged5WY. Old-only session recovery and both original delivered links pass; original single financial receiver restored with14 unchanged functions and separate Contact alert app. Final saved Stage C origins/flags, four baseline surfaces (including restored fallback404), direct unsigned400/401 boundaries, quota0/pendingalerts0 and exact fixture cleanup confirmed. Extended monitoring/forced failure not claimed.",
      "proof": "playwright/.cache/phase27-08/legacy-approved-execution-result.json",
      "observedAt": "2026-10-12T02:54:42.912Z"
    }
  ],
  "highThreats": [],
  "rollbackVerified": true,
  "contactControlsVerified": true,
  "contactEnabledReadback": false,
  "inquiryAuthority": "pending separate checkpoint",
  "inbox": {
    "owner": "project owner",
    "receipt": "pending deployed inquiry",
    "replyTo": "pending deployed inquiry",
    "reply": "pending deployed inquiry"
  },
  "holds": {
    "checkout": "HOLD",
    "payout": "HOLD",
    "legal": "HOLD"
  },
  "historicalLiveAcceptance": {
    "status": "incomplete-live-proof",
    "recordedAt": "2026-10-10T11:57:15.492Z",
    "matrixVersion": 1,
    "deployedRevision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
    "sourceManifestSha256": "da10f8a0faea204c810cbe544142971181c86bab0d252d5515ea3b671d8a8157",
    "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
    "deployments": {
      "customer": {
        "id": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "origin": "https://app.fitout.live"
      },
      "ops": {
        "id": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "origin": "https://ops.fitout.live"
      },
      "preview": {
        "id": "dpl_A9X3qDaZ92oV7DNB9TYVo65yMbay",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "origin": "https://fitout-qduqjxsvi-pengr3s-projects.vercel.app"
      }
    },
    "hostProviderControlMatrix": [
      {
        "id": "marketing-home",
        "host": "fitout.live",
        "url": "https://fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "marketing-home",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:32:54.344Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "marketing-hosts",
        "host": "fitout.live",
        "url": "https://fitout.live/hosts",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "marketing-hosts",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:32:55.228Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "marketing-players",
        "host": "fitout.live",
        "url": "https://fitout.live/players",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "marketing-players",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:32:56.315Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "marketing-about",
        "host": "fitout.live",
        "url": "https://fitout.live/about",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "marketing-about",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:32:57.387Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "marketing-faq",
        "host": "fitout.live",
        "url": "https://fitout.live/faq",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "marketing-faq",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:32:58.204Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "marketing-contact",
        "host": "fitout.live",
        "url": "https://fitout.live/contact",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "marketing-contact",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:32:58.825Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "app-home-only",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "app-home-only",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 200; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:02.597Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "www-full-query",
        "host": "www.fitout.live",
        "url": "https://www.fitout.live/?tag=a&tag=b&phase27=continuity",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "www-full-query",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "307 to apex root preserves repeated/full query exactly.",
        "observedAt": "2026-10-10T11:52:05.061Z",
        "proof": "playwright/.cache/phase27-08/production-www-root-query-20261010.json"
      },
      {
        "id": "old-app-deep-link",
        "host": "fitout.live",
        "url": "https://fitout.live/profile?tab=bookings&tag=a&tag=b&phase27=continuity",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "old-app-deep-link",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 307; no inappropriate redirect or internal error. Full repeated query preserved to app.",
        "observedAt": "2026-10-10T11:33:03.402Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "ops-front-door",
        "host": "ops.fitout.live",
        "url": "https://ops.fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "ops-front-door",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 404; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:05.188Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "unknown-host-denied",
        "host": "lookalike.fitout.live",
        "url": "https://lookalike.fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "unknown-host-denied",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 404; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:06.427Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "internal-namespace-denied",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/marketing",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "internal-namespace-denied",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 404; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:06.490Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "host-only-session-bridge",
        "host": "fitout.live",
        "url": "https://fitout.live/auth/session-check",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "host-only-session-bridge",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Normal old session-check bridge returns to authenticated app; app was initially anonymous at new host; no signed-cookie export. Staff sign-out does not end app session.",
        "observedAt": "2026-10-10T11:53:30Z",
        "proof": "playwright/.cache/phase27-08/production-browser-final-20261010.json"
      },
      {
        "id": "customer-ops-session-isolation",
        "host": "ops.fitout.live",
        "url": "https://ops.fitout.live/ops",
        "method": "GET",
        "deploymentId": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "customer-ops-session-isolation",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "After staff sign-out, Ops /ops is cloaked while customer app remains authenticated. Pre-existing staff console was accessible before sign-out.",
        "observedAt": "2026-10-10T11:53:30Z",
        "proof": "playwright/.cache/phase27-08/production-browser-final-20261010.json"
      },
      {
        "id": "staff-customer-capability-denied",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/start-hosting",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "staff-customer-capability-denied",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "unknown",
        "outcome": "pending",
        "observed": "No staff-only customer-origin credential/POST test. Existing staff continuity and customer-to-ops browser denial do not substitute.",
        "proof": "Pending actual observation",
        "observedAt": "2026-10-10T11:57:15.492Z"
      },
      {
        "id": "stale-session-recovery",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/auth/session-check",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "stale-session-recovery",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Malformed test cookie expires with Secure/HttpOnly and no Domain; no-store307 returns app login.",
        "observedAt": "2026-10-10T11:34:54.343Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-supplemental-20261010.json"
      },
      {
        "id": "google-fresh-state",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/api/auth/callback/google",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "google-fresh-state",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Fresh final app Google flow returns authenticated app home, with no code/state replay or credential copy.",
        "observedAt": "2026-10-10T11:53:30Z",
        "proof": "playwright/.cache/phase27-08/production-browser-final-20261010.json"
      },
      {
        "id": "issued-verify-token",
        "host": "fitout.live",
        "url": "https://fitout.live/api/auth/verify-email",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "issued-verify-token",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "unknown",
        "outcome": "pending",
        "observed": "Previously issued, still-valid owner verification link unavailable; fabricated invalid bridge is supporting evidence only.",
        "proof": "Pending actual observation",
        "observedAt": "2026-10-10T11:57:15.492Z"
      },
      {
        "id": "issued-reset-token",
        "host": "fitout.live",
        "url": "https://fitout.live/reset-password",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "issued-reset-token",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "unknown",
        "outcome": "pending",
        "observed": "Previously issued, still-valid owner reset link unavailable; fabricated invalid bridge is supporting evidence only.",
        "proof": "Pending actual observation",
        "observedAt": "2026-10-10T11:57:15.492Z"
      },
      {
        "id": "next-link-rsc-history",
        "host": "fitout.live",
        "url": "https://fitout.live/hosts",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "next-link-rsc-history",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Client-side Home/Hosts content and title update; Back/Forward restore correct marketing views; same-tab app entry journeys pass.",
        "observedAt": "2026-10-10T11:53:30Z",
        "proof": "playwright/.cache/phase27-08/production-browser-final-20261010.json"
      },
      {
        "id": "rsc-prefetch-isolation",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "rsc-prefetch-isolation",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Three app RSC prefetch responses contain app search, no marketing shell, correct text/x-component and private no-store policy.",
        "observedAt": "2026-10-10T11:33:19.952Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "alternating-html-rsc-cache",
        "host": "fitout.live",
        "url": "https://fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "alternating-html-rsc-cache",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Three rounds on both hosts keep marketing/app content separate; RSC content and vary headers match. Supplemental marketing RSC includes Good plans, no app search.",
        "observedAt": "2026-10-10T11:33:19.952Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "metadata-robots-sitemap",
        "host": "fitout.live",
        "url": "https://fitout.live/sitemap.xml",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "metadata-robots-sitemap",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Marketing six exact canonical URLs, robots allow public root and disallow internal/API routes, sitemap has six apex URLs, advertised social image returns PNG200. Unused unadvertised opengraph-image404 retained.",
        "observedAt": "2026-10-10T11:34:54.629Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-supplemental-20261010.json"
      },
      {
        "id": "paymongo-old-direct",
        "host": "fitout.live",
        "url": "https://fitout.live/api/paymongo/webhook",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "paymongo-old-direct",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 400; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:06.861Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "paymongo-target-direct",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/api/paymongo/webhook",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "paymongo-target-direct",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 400; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:07.193Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "didit-old-direct",
        "host": "fitout.live",
        "url": "https://fitout.live/api/didit/webhook",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "didit-old-direct",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 400; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:07.518Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "didit-target-direct",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/api/didit/webhook",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "didit-target-direct",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 400; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:07.866Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "inngest-old-direct",
        "host": "fitout.live",
        "url": "https://fitout.live/api/inngest",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "inngest-old-direct",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 401; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:08.182Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "inngest-target-direct",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/api/inngest",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "inngest-target-direct",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 401; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:08.510Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "preview-account-isolation",
        "host": "fitout-qduqjxsvi-pengr3s-projects.vercel.app",
        "url": "https://fitout-qduqjxsvi-pengr3s-projects.vercel.app/",
        "method": "GET",
        "deploymentId": "dpl_A9X3qDaZ92oV7DNB9TYVo65yMbay",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "preview-account-isolation",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Exact D67 Preview initially anonymous with zero bookable spaces; existing fixture login increases isolated session count1->2, while Production fixture counts remain0/0. No new bypass or protection change.",
        "observedAt": "2026-10-10T11:47:22.000Z",
        "proof": "playwright/.cache/phase27-08/production-exact-preview-isolation-20261010.json"
      },
      {
        "id": "contact-default-disabled",
        "host": "fitout.live",
        "url": "https://fitout.live/api/contact",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "contact-default-disabled",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual HTTPS 503; no inappropriate redirect or internal error. ",
        "observedAt": "2026-10-10T11:33:09.032Z",
        "proof": "playwright/.cache/phase27-08/production-stage-C-final-http-20261010.json"
      },
      {
        "id": "contact-trusted-ingress-per-ip",
        "host": "fitout.live",
        "url": "https://fitout.live/api/contact",
        "method": "POST",
        "deploymentId": "dpl_2GQFRsod2L9XsEegZJRKKRW7SMLT",
        "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
        "scenario": "contact-trusted-ingress-per-ip",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Actual apex Vercel ingress: A3/B2 no-mail reservations, distinct module UUIDs, sixth shared429 Retry-After844 despite B handling only3; spoof429/806 with identical5-attempt fingerprints. Independent mobile deny, exact disabled baseline restoration within151s and owned cleanup2 confirmed.",
        "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-VERCEL-INGRESS-RESULT.md",
        "observedAt": "2026-10-11T07:53:43.353Z"
      },
      {
        "id": "contact-distributed-global-budget",
        "host": "fitout.live",
        "url": "https://fitout.live/api/contact",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "contact-distributed-global-budget",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "unknown",
        "outcome": "pending",
        "observed": "Actual exact-source Production HTTP global429 with Retry-After3311 under owned100-reservation primary fixture; exact fixture unchanged and removed after recovery. Manual operator restore503 observed. Automatic quota alert notification remains unproved; row stays pending.",
        "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-BOUNDED-TEST-RESULT.md",
        "observedAt": "2026-10-11T05:31:14.208Z"
      },
      {
        "id": "contact-disabled-recovery",
        "host": "fitout.live",
        "url": "https://fitout.live/api/contact",
        "method": "POST",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "contact-disabled-recovery",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "observed",
        "outcome": "pass",
        "observed": "Disabled Contact gives recoverable failure, retains all synthetic fields and re-enables button; no delivery announcement; primary quota remains empty.",
        "observedAt": "2026-10-10T11:52:15.304Z",
        "proof": "playwright/.cache/phase27-08/production-browser-final-20261010.json"
      },
      {
        "id": "rollback-verified",
        "host": "app.fitout.live",
        "url": "https://app.fitout.live/",
        "method": "GET",
        "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
        "scenario": "rollback-verified",
        "expected": "Approved host/provider/control contract in Plan09 and required matrix",
        "status": "unknown",
        "outcome": "pending",
        "observed": "Actual scoped Contact test promotion followed by restore to Stage C disabled customer pin, savedflagfalse, Contact503 and all3surfaces200. Ops pin unchanged. Full origin/session/provider cutover rollback and failure-threshold evidence remain pending.",
        "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-BOUNDED-TEST-RESULT.md",
        "observedAt": "2026-10-11T05:31:14.208Z"
      }
    ],
    "highThreats": [
      "T-27-28: staff-only customer capability denial remains unobserved",
      "T-27-29: scoped ingress and synthetic alert proofs pass at their recorded sources; full same-candidate exhaustion-to-alert and rollback/control acceptance remain unproved; public Contact staysdisabled",
      "T-27-27: valid issued-link/rollback observations remain incomplete"
    ],
    "rollbackVerified": false,
    "contactControlsVerified": false,
    "contactEnabledReadback": false,
    "inquiryAuthority": "pending separate checkpoint",
    "inbox": {
      "owner": "project owner",
      "receipt": "pending deployed inquiry",
      "replyTo": "pending deployed inquiry",
      "reply": "pending deployed inquiry"
    },
    "holds": {
      "checkout": "HOLD",
      "payout": "HOLD",
      "legal": "HOLD"
    },
    "stageARollbackTargets": {
      "customer": "dpl_EawThnAR9vr4EEumpTHnpBh6yAYB",
      "ops": "dpl_GjHd59ThRnH73gmFbUjhGviN1ZQV"
    },
    "originalRollbackTargets": {
      "customer": "dpl_8PpCPij5v1zQiD8gDP14Ju54QAAv",
      "ops": "dpl_Ho1raNTZDcnQ4zwpDu2P19NX6QBS"
    },
    "monitoring": {
      "boundedRounds": 9,
      "boundedChecks": 36,
      "healthyChecks": 36,
      "firstBoundedRound": "2026-10-10T11:40:20.967Z",
      "lastBoundedRound": "2026-10-10T11:48:31.177Z",
      "proof": "playwright/.cache/phase27-08/production-stage-C-health-monitor-20261010.json",
      "limit": "Initial rollout probes plus nine minute-spaced rounds are observed; remaining hourly monitoring and full-account five-minute 5xx percentage are not claimed. Legacy observability query returned400; expected Inngest denial errors were the only inspected runtime clusters.",
      "finalHandoffHealth": {
        "proof": "playwright/.cache/phase27-08/production-final-handoff-health-20261010.json",
        "checks": 4,
        "healthyChecks": 4
      }
    },
    "releaseControls": {
      "autoAssignCustomDomains": false,
      "productionGitBranch": "dev",
      "remoteProductionBranchAdvanced": false,
      "releaseSourceBranch": "codex/phase27-cutover-d67fbecf",
      "reason": "Manual staging control remains while full live proof is incomplete and dev has not been aligned to the candidate. No shared dirty source was pushed.",
      "finalBrowserReadback": {
        "observedAt": "2026-10-10T12:04:27.308Z",
        "webAutoAssignCustomDomains": false,
        "opsAutoAssignCustomDomains": false,
        "source": "Existing signed-in browser Production Environment pages, both checkbox Value: 0"
      }
    },
    "sourceLimits": "Browser aggregate evidence records an observation window rather than exact per-action timestamps; actual HTTPS and branch readbacks have individual UTC timestamps. No bearer tokens/cookies/provider credentials/PII in proof.",
    "validation": {
      "validatedAt": "2026-10-10T12:04:27.308Z",
      "prepared": {
        "outcome": "pass",
        "exitCode": 0
      },
      "deployed": {
        "outcome": "fail",
        "exitCode": 1,
        "reason": "Six pending matrix scenarios, partial external inventory, unresolved high threats, and rollback/Contact controls unverified."
      },
      "live": {
        "outcome": "fail",
        "exitCode": 1,
        "reason": "Deployed-stage gaps plus actual receipt/Reply-To/reply and scoped inquiry/enabled readback missing."
      },
      "validatorRoot": "C:/Users/Admin/.codex/worktrees/phase27-production-continuity/FitOut",
      "sourceChanged": false
    },
    "contactVerificationLimit": "Approved production handleContact checks disabled flag before original-client identity and rate/quota logic. No-mail disabled probes cannot prove those live controls; no enablement or primary quota fixture was attempted.",
    "contactControlProgress": {
      "recordedAt": "2026-10-11T05:31:14.208Z",
      "result": "Bounded no-mail test completed; disabled deployment and saved flags restored; exact fixture removed; temporary guard disabled and published.",
      "source": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
      "testDeploymentId": "dpl_FTxX4Sa4pq8jcW21kmuwiV5vxUFW",
      "restoredCustomerId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
      "restoredOpsId": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
      "publicContactEnabled": false,
      "temporaryGuard": {
        "id": "rule_phase_27_restricted_contact_test_j9IM6v",
        "enabled": false,
        "cleanupPublished": true,
        "distinctNetworkDenialObserved": true,
        "originalLogRulePreserved": true
      },
      "globalQuotaHTTP": {
        "status": 429,
        "retryAfterSeconds": 3311,
        "proof": "playwright/.cache/phase27-08/contact-bounded-http-20261011.json",
        "requestId": "sin1::iad1::rw7l5-1791696332669-a73a54cbd492"
      },
      "rotatedHeaderProbes": {
        "statuses": [
          429,
          400,
          400,
          400,
          400,
          429
        ],
        "sixthRetryAfterSeconds": 895,
        "scope": "One ingress and sequential process observations; shared cross-instance per-IP enforcement not established."
      },
      "recovery": {
        "status": 503,
        "healthySurfaces": 3,
        "quotaRows": 0,
        "fieldsRetained": true,
        "proof": "playwright/.cache/phase27-08/contact-recovery-20261011.json"
      },
      "mailTransport": "No success response; global quota denied before send in exact source. Request trace reports no outgoing HTTP calls; direct PostgreSQL trace instrumentation is not established.",
      "automaticAlertVerified": false,
      "scopedRollbackObserved": true,
      "fullCutoverRollbackVerified": false,
      "evidence": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-BOUNDED-TEST-RESULT.md",
      "remainingGates": [
        "Automatic quota alert/notification and ongoing monitoring",
        "Actual shared per-IP ingress enforcement across instances",
        "Full cutover rollback acceptance",
        "Other staff capability, issued-link, provider, inbox and release-control gates"
      ],
      "holds": {
        "checkout": "HOLD",
        "payout": "HOLD",
        "legal": "HOLD"
      }
    },
    "currentContactAlertRelease": {
      "source": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5",
      "branch": "codex/phase27-contact-alerts-b61cb4a4",
      "deployment": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "aliases": [
        {
          "host": "fitout.live",
          "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
          "state": "READY",
          "sha": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
        },
        {
          "host": "app.fitout.live",
          "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
          "state": "READY",
          "sha": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
        },
        {
          "host": "ops.fitout.live",
          "id": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
          "state": "READY",
          "sha": "d67fbecfa41e902cbf506c93dbcf53b60085e802"
        }
      ],
      "migration": {
        "tag": "0038_contact_alert",
        "hash": "c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9",
        "ledgerEntries": 39,
        "when": 1791698400000
      },
      "recipient": "pengr.clmc.3@gmail.com",
      "contactEnabled": false,
      "scheduler": {
        "app": "fitout-contact-alerts",
        "endpoint": "https://fitout.live/api/contact-alerts/inngest",
        "function": "contact-control-monitor",
        "cron": "1-59/5 * * * *",
        "syncedAt": "2026-10-11T06:19:21Z"
      },
      "synthetic": {
        "id": "p27-owner-alert-20261011-b61cb4a4",
        "createdAt": "2026-10-11T06:19:52.912Z",
        "providerId": "01a1299f-3ff8-7eff-a94c-783d416d5993",
        "sentAt": "2026-10-11T06:21:05.756Z",
        "providerStatus": "delivered",
        "ownerInboxConfirmed": true
      },
      "checks": {
        "contactAndRouting": 186,
        "design": {
          "passed": 1510,
          "skipped": 6
        },
        "typescript": "pass after clearing failed-webpack generated type cache",
        "lint": "pass",
        "drizzleCheck": "pass",
        "cloudBuild": [
          "Cloning github.com/pengr3/FitOut (Branch: codex/phase27-contact-alerts-b61cb4a4, Commit: b61cb4a)",
          "Cloning completed: 4.119s",
          "Running \"vercel build\"",
          "npm warn deprecated serialize-error-cjs@0.1.4: Rolling release, please update to 0.2.0",
          "Running \"next build\"",
          "✓ Compiled successfully in 40.0s",
          "  Running TypeScript ...",
          "  Finished TypeScript in 34.2s ...",
          "Build Completed in /vercel/output [2m]"
        ]
      },
      "firstScheduledRun": {
        "id": "01M4MSYB70J1M05HRHPVN6PQQQ",
        "trigger": "inngest/scheduled.timer",
        "fireAt": "2026-10-11T06:21:00Z",
        "completedAt": "2026-10-11T06:21:06Z",
        "output": {
          "active": true,
          "pendingProcessed": 1,
          "quotaAvailable": true,
          "staleCount": 0
        }
      },
      "ownerConfirmation": {
        "receivedIn": "inbox",
        "reportedAt": "2026-10-11T06:22:30Z",
        "reportedAtPrecision": "approximate capture window",
        "source": "Owner reply: Received in inbox"
      },
      "secondScheduledRun": {
        "id": "01M4MT7G60J1M05HRHPVN6PQQQ",
        "trigger": "inngest/scheduled.timer",
        "fireAt": "2026-10-11T06:26:00Z",
        "completedAt": "2026-10-11T06:26:03Z",
        "output": {
          "active": true,
          "pendingProcessed": 0,
          "quotaAvailable": true,
          "staleCount": 0
        }
      },
      "finalDatabaseState": {
        "totalAlerts": 1,
        "syntheticAlerts": 1,
        "pendingAlerts": 0,
        "quotaRows": 0,
        "providerId": "01a1299f-3ff8-7eff-a94c-783d416d5993"
      },
      "proofFiles": {
        "runtime": "playwright/.cache/phase27-08/contact-alert-release-runtime.json",
        "deliveryScreenshot": "playwright/.cache/phase27-08/contact-alert-delivered-20261011.png",
        "secondCronScreenshot": "playwright/.cache/phase27-08/contact-alert-second-cron-20261011.png"
      },
      "existingInngestApp": {
        "id": "fitout",
        "functions": 14,
        "lastSync": "2026-10-11T06:16:08Z",
        "syncStatus": "Success",
        "destination": "https://fitout-6nx1msej4-pengr3s-projects.vercel.app/api/inngest",
        "observation": "Vercel automatically resynced the existing app while building the new Production deployment. Existing financial function source and signatures are unchanged; no manual financial scheduler edits or test invocation."
      },
      "runtime": {
        "observedAt": "2026-10-11T06:26:58.055Z",
        "checks": [
          {
            "url": "https://fitout.live/",
            "status": 200
          },
          {
            "url": "https://fitout.live/contact",
            "status": 200
          },
          {
            "url": "https://app.fitout.live/",
            "status": 200
          },
          {
            "url": "https://ops.fitout.live/login",
            "status": 200
          }
        ],
        "contact": {
          "status": 503,
          "requestId": "sin1::iad1::qhf2p-1791700020368-2a3d410880d7",
          "body": "{\"ok\":false,\"error\":\"Your message could not be sent. Please try again later.\"}"
        },
        "unsignedScheduler": {
          "status": 401,
          "redirected": false
        }
      }
    },
    "scopedIngressVerification": {
      "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "deployments": [
        "dpl_Dw7CfRqiPVYunAasT5A3SeRWNm6o",
        "dpl_2GQFRsod2L9XsEegZJRKKRW7SMLT"
      ],
      "restoredBaseline": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-VERCEL-INGRESS-RESULT.md",
      "observationCount": 30,
      "historicalD67Observations": 29,
      "singleReleaseAcceptance": false
    },
    "evidenceRole": "Dated original D67 topology matrix plus separately scoped58897a94 ingress observation; not current one-source release acceptance.",
    "releaseSourceReconciliation": {
      "recordedAt": "2026-10-11T09:33:12.518Z",
      "candidateRevision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "sourceManifestSha256": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
      "currentWeb": {
        "id": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
        "revision": "b61cb4a43c8dd4c10e7444014fb66646aba36ec5"
      },
      "currentOps": {
        "id": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ",
        "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802"
      },
      "engineeringGatesPassed": 6,
      "sourceAlignedPreparation": true,
      "singleReleaseAcceptance": false,
      "historicalMatrixObservations": 30,
      "permanentCandidateRolloutExecuted": false,
      "contactEnabled": false,
      "evidence": ".planning/phases/27-app-subdomain-marketing-website/27-RELEASE-SOURCE-RECONCILIATION.md"
    }
  },
  "disabledPairPromotion": {
    "observedAt": "2026-10-11T15:39:03.751Z",
    "promotedAt": "2026-10-11T15:35:33.056Z",
    "aliases": [
      {
        "host": "fitout.live",
        "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg"
      },
      {
        "host": "app.fitout.live",
        "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg"
      },
      {
        "host": "ops.fitout.live",
        "deploymentId": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4"
      }
    ],
    "builds": [
      {
        "id": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
        "url": "fitout-6dr93opgm-pengr3s-projects.vercel.app",
        "readyState": "READY",
        "target": "production",
        "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5"
      },
      {
        "id": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
        "url": "fitout-ajur9x7xb-pengr3s-projects.vercel.app",
        "readyState": "READY",
        "target": "production",
        "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5"
      }
    ],
    "originReadback": [
      {
        "project": "web",
        "key": "APP_COMPATIBILITY_ORIGIN",
        "value": ""
      },
      {
        "project": "web",
        "key": "MARKETING_APP_URL",
        "value": "https://fitout.live"
      },
      {
        "project": "web",
        "key": "BETTER_AUTH_URL",
        "value": "https://app.fitout.live"
      },
      {
        "project": "web",
        "key": "NEXT_PUBLIC_APP_URL",
        "value": "https://app.fitout.live"
      },
      {
        "project": "web",
        "key": "OPS_APP_URL",
        "value": "https://ops.fitout.live"
      },
      {
        "project": "ops",
        "key": "APP_COMPATIBILITY_ORIGIN",
        "value": ""
      },
      {
        "project": "ops",
        "key": "MARKETING_APP_URL",
        "value": "https://fitout.live"
      },
      {
        "project": "ops",
        "key": "BETTER_AUTH_URL",
        "value": "https://app.fitout.live"
      },
      {
        "project": "ops",
        "key": "NEXT_PUBLIC_APP_URL",
        "value": "https://app.fitout.live"
      },
      {
        "project": "ops",
        "key": "OPS_APP_URL",
        "value": "https://ops.fitout.live"
      }
    ],
    "buildSummaries": [
      [
        {
          "date": 1791732736076,
          "text": "Deployment completed"
        },
        {
          "date": 1791732727662,
          "text": "✓ Generating static pages using 1 worker (49/49) in 734ms"
        },
        {
          "date": 1791732725636,
          "text": "  Finished TypeScript in 24.6s ..."
        },
        {
          "date": 1791732700985,
          "text": "✓ Compiled successfully in 28.2s"
        }
      ],
      [
        {
          "date": 1791732822235,
          "text": "Deployment completed"
        },
        {
          "date": 1791732813303,
          "text": "✓ Generating static pages using 1 worker (49/49) in 745ms"
        },
        {
          "date": 1791732811268,
          "text": "  Finished TypeScript in 23.6s ..."
        },
        {
          "date": 1791732787706,
          "text": "✓ Compiled successfully in 27.5s"
        }
      ]
    ],
    "flagsScope": "Production savedflags beforebuild arefalse; runtimeemptybody503 verifiesdisabled gate; immutableenvsnapshotnotindependentlyavailable"
  },
  "supplementalStaffDenial": {
    "observedAt": "2026-10-11T15:45:46.534Z",
    "origin": "https://app.fitout.live",
    "actualEntryPoint": "Home navigation menu Start hosting; invokes activateHosting server action on current home route",
    "observed": "This account cannot activate hosting.",
    "audit": "Actual primary database latest activateHosting denial for owner-used staff account, reason=ineligible_role, timestamp2026-10-11 15:45:46.534355+00",
    "readback": {
      "role": "staff",
      "canBook": false,
      "canHost": false
    },
    "screenshot": "playwright/.cache/phase27-08/disabled-pair-staff-denial-58897a94.png",
    "scope": "Real authenticated staff action denial; exact matrix POST /start-hosting path is not inferred from the home-route UI action"
  },
  "freshObservedCount": 35,
  "supplementalSourceRecovery": {
    "recordedAt": "2026-10-11T16:28:21.813Z",
    "kind": "source-only recovery",
    "startedAt": "2026-10-11T16:06:14.555Z",
    "restoredAliasesAt": "2026-10-11T16:08:13.795Z",
    "baselineProof": "playwright/.cache/phase27-08/disabled-source-recovery-baseline.json",
    "restoredProof": "playwright/.cache/phase27-08/disabled-source-recovery-restored.json",
    "aliasReadback": [
      {
        "host": "fitout.live",
        "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
        "updatedAt": "2026-10-11T16:08:13.790Z"
      },
      {
        "host": "app.fitout.live",
        "deploymentId": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
        "updatedAt": "2026-10-11T16:08:13.795Z"
      },
      {
        "host": "ops.fitout.live",
        "deploymentId": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
        "updatedAt": "2026-10-11T16:08:06.214Z"
      }
    ],
    "baseline": {
      "web": "dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68",
      "ops": "dpl_9QYdHByiE7JzzqnGW4qVMS5grYFQ"
    },
    "restored": {
      "web": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
      "ops": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4"
    },
    "health": "Both baseline and restored probes: four public200, correct-Origin Contact503/no-store, old/new unsigned Inngest401/direct",
    "authenticatedProfileAfterRestore": true,
    "contactEnabled": false,
    "originChanged": false,
    "fullTopologyRollbackVerified": false
  },
  "monitoring": {
    "recordedAt": "2026-10-11T16:28:21.816Z",
    "originalProof": "playwright/.cache/phase27-08/disabled-pair-monitor-58897a94.json",
    "rounds": 19,
    "healthChecks": 76,
    "allRecordedHealthy": true,
    "first": "2026-10-11T15:37:59.936Z",
    "last": "2026-10-11T16:08:00.067Z",
    "sourceRecoveryWindow": {
      "start": "2026-10-11T16:06:14.555Z",
      "end": "2026-10-11T16:08:13.795Z"
    },
    "baselineRound": 18,
    "scope": "Round18 falls before both alias restores, so the monitor global revision label does not bind that round to58897a94. Rounds0..17 predate recovery. Raw proof retained unchanged.",
    "processStatus": "Original execution session no longer exists; capture stopped after19rounds. Missing later samples cannot be reconstructed.",
    "extendedWindowComplete": false
  },
  "finalDisabledReadbacks": "playwright/.cache/phase27-08/legacy-final-provider-and-cleanup.json",
  "remainingProofs": {
    "recordedAt": "2026-10-13T06:38:54.780Z",
    "observed": 35,
    "pending": [],
    "staffProviderBinding": "playwright/.cache/phase27-08/remaining8-staff-provider-binding.json",
    "legacyLinkAvailability": "playwright/.cache/phase27-08/remaining8-old-link-availability.json",
    "contactEnabled": false
  },
  "legacyContinuityExecution": {
    "recordedAt": "2026-10-12T02:54:42.912Z",
    "status": "completed-approved-legacy-packet; phase acceptance remains incomplete",
    "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "manifest": "8618880bf767b385d46ff9988bd2737c73f8de06bfeda396b322fa3dab96ac7a",
    "window": {
      "startedAt": "2026-10-12T02:18:51.968Z",
      "restoreBy": "2026-10-12T02:33:51.968Z",
      "watchdogRestoreAt": "2026-10-12T02:31:51.968Z",
      "source": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
      "ids": {
        "A": "dpl_GnVPs9UE2oUnodsESRd2xmbvJymW",
        "B": "dpl_FcvUSqNcmF82gbgKnmM8oDcLyYN7",
        "C": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg"
      },
      "contactEnabled": false
    },
    "restored": {
      "stage": "C",
      "at": "2026-10-12T02:23:42.351Z",
      "results": [
        {
          "alias": "fitout.live",
          "target": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
          "at": "2026-10-12T02:23:36.775Z",
          "exitCode": 0,
          "accepted": true,
          "oldDeploymentId": "dpl_FcvUSqNcmF82gbgKnmM8oDcLyYN7"
        },
        {
          "alias": "app.fitout.live",
          "target": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
          "at": "2026-10-12T02:23:39.659Z",
          "exitCode": 0,
          "accepted": true,
          "oldDeploymentId": "dpl_FcvUSqNcmF82gbgKnmM8oDcLyYN7"
        },
        {
          "alias": "fitout-web-psi.vercel.app",
          "target": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
          "at": "2026-10-12T02:23:42.350Z",
          "exitCode": 0,
          "accepted": true,
          "oldDeploymentId": "dpl_FcvUSqNcmF82gbgKnmM8oDcLyYN7"
        }
      ],
      "allAccepted": true,
      "opsChanged": false,
      "contactEnabled": false,
      "readbackStatus": "control plane accepted; root verifies exact aliases separately"
    },
    "stageA": "dpl_GnVPs9UE2oUnodsESRd2xmbvJymW",
    "stageB": "dpl_FcvUSqNcmF82gbgKnmM8oDcLyYN7",
    "unchangedOps": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
    "publicWindowSeconds": 290.383,
    "completed": [
      "host-only-session-bridge",
      "issued-verify-token",
      "issued-reset-token",
      "rollback-verified"
    ],
    "contactEnabled": false,
    "contactPostRequests": 0,
    "fixtureAccountsCreated": 1,
    "authEmailsRequested": 2,
    "fixtureCleanup": "Exact ID/email/creation-time/role/capabilities match, zero all inbound business records and audit; one fixture and one reset record removed; auth cascades confirmed zero accounts/sessions/verifications.",
    "financialInvocations": 0,
    "dnsChanges": 0,
    "migrations": 0,
    "secretRotations": 0,
    "projectWideSettingsChanged": false,
    "proofs": {
      "client": "playwright/.cache/phase27-08/legacy-fixture-client-result.json",
      "emailsScheduler": "playwright/.cache/phase27-08/legacy-original-email-and-scheduler-proof.json",
      "providerCleanup": "playwright/.cache/phase27-08/legacy-final-provider-and-cleanup.json",
      "health": "playwright/.cache/phase27-08/legacy-final-public-health.json",
      "watchdog": "playwright/.cache/phase27-08/legacy-window-watchdog.json"
    },
    "limits": [
      "Freshly issued genuine fixture links across controlled old-origin transition; not original October10 emails.",
      "Reset continuity ends at valid form; no password changed.",
      "Verification consumption proved by exact fixture email_verified=true; final iframe page UI success not claimed.",
      "Existing fallback alias returns baseline404 after Stage C; its Stage A/B200 does not imply permanent marketing support.",
      "Manual Inngest resync restores original immutable receiver and fourteen functions; provider no longer displays Git/Vercel metadata, so exact source is independently bound by Vercel deployment readback.",
      "Watchdog recorded 60 healthy reads and stopped on manual restore. No forced failure or broader hourly/5xx monitoring proof.",
      "Temporary Stage A/B immutable builds remain staged without the three public aliases; Ops never changed."
    ],
    "remaining": [
      "contact-trusted-ingress-per-ip",
      "contact-distributed-global-budget",
      "partial provider inventory",
      "separate flags-on staff data consistency gap",
      "controlled deployed inquiry and receipt/Reply-To/reply authority",
      "extended monitoring and release-control reconciliation"
    ],
    "automaticReview": [
      {
        "action": "project-wide autoAssignCustomDomains update",
        "applied": false,
        "resolution": "per-deployment suppression"
      },
      {
        "action": "new Stage A Ops build",
        "applied": false,
        "resolution": "existing unchanged Ops deployment in both pairs"
      },
      {
        "action": "current Stage B Resync",
        "applied": false,
        "resolution": "original sync inspection followed by verified exact original receiver override"
      }
    ]
  },
  "controlThreatResolution": {
    "id": "T-27-29",
    "observedAt": "2026-10-13T06:42:33.291Z",
    "source": "27-CONTACT-GLOBAL-ALERT-FRESH-RESULT.md",
    "scope": "Shared per-IP and global exhaustion-to-scheduled-alert controls, exact disabled recovery and cleanup accepted at58897a94. Public inquiry, receipt/Reply-To/reply and enablement remain separate pending gates."
  },
  "inventoryReconciliation": {
    "recordedAt": "2026-10-13T07:39:52.164Z",
    "revision": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "currentWeb": "dpl_CogasJRD4eqwEDh7yKtFT65i1Fmg",
    "currentOps": "dpl_5WYzByZ9jSXRZ8pr9v1i46ytL4L4",
    "closedInventoryRows": [
      "customer-project",
      "ops-project",
      "environment-scopes",
      "inngest"
    ],
    "remainingPartialRows": [
      {
        "id": "paymongo",
        "remainingProof": "Bind actual runtime credentials/mode to this account without exposing keys, then a separately scoped harmless signed nonfinancial proof or eligible existing delivery. Dashboard key existence and old local configuration do not supply deployment correspondence."
      },
      {
        "id": "didit",
        "remainingProof": "Establish which application/workflow/environment the actual deployment uses and resolve signed delivery correspondence. Historical failed Test deliveries require diagnosis; no real identity session, test event, live-mode switch or workflow edit performed."
      },
      {
        "id": "resend-sender",
        "remainingProof": "Only the separately authorized actual current-source inquiry/Reply-To/reply portion of this original row remains. No need to repeat the control alert or reveal a key."
      },
      {
        "id": "support-mailbox",
        "remainingProof": "One separately approved bounded harmless inquiry from a controlled reply-capable sender, actual readable owner receipt, matching Reply-To and reply arrival; Contact remainsfalse now."
      }
    ],
    "contactEnabled": false,
    "productionMutations": 0,
    "contactPosts": 0,
    "providerTestEvents": 0,
    "manualFinancialInvocations": 0,
    "applicationCodeChanges": 0,
    "phaseComplete": false,
    "proof": {
      "path": "playwright/.cache/phase27-08/inventory-reconcile-2026-10-13-78dca654/reconciliation-result.json",
      "sha256": "5a18fd19368c906b76d09edbb616cc2a7aca40427fd60018e42590b875fda9fe"
    }
  },
  "providerRuntimeConfiguration": {
    "observedAt": "2026-10-13T08:58:31.086Z",
    "resultSource": ".planning/phases/27-app-subdomain-marketing-website/27-PROVIDER-RUNTIME-COORDINATOR-RESULT.md",
    "diagnosticDeploymentId": "dpl_7GKcUipbZpTX5H13i9QfCGcySWtb",
    "acceptedBase": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "paymongoMode": "live",
    "diditEnvironment": "sandbox",
    "signingSecretsMatch": true,
    "scope": "Protected current-Production extension with qualified serving metadata/source continuity; no directCogas diagnostic",
    "successfulSignedProviderDeliveryObserved": false,
    "contactDisabled": true
  },
  "ops11PreparedRepair": {
    "sourceRevision": "6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3",
    "manifestSha256": "a8b68c81fffbe53301b4c9b9566a80116ca02d2a16d5e3b563591098b293a499",
    "status": "prepared-code-repair-verified",
    "result": ".planning/phases/27-app-subdomain-marketing-website/27-OPS11-REPAIR-RESULT.json",
    "resultSha256": "b05c9935ce3f568201d8efb47d679d99407d4d758da6623b85f4e289659140a6",
    "contactEnabled": false,
    "productionRolledOut": false,
    "accountChanged": false
  },
  "ops11DisabledRelease": {
    "sourceRevision": "6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3",
    "acceptedAt": "2026-10-13T11:38:29.375Z",
    "webDeploymentId": "dpl_G8ZbTTydH4XrhQ5Kpx3XrVrH1cQA",
    "opsDeploymentId": "dpl_3qtketSXoaeS6JMoCKa5KJznqzkL",
    "contactDisabled": true,
    "resultFile": "27-OPS11-DISABLED-ROLLOUT-RESULT.json",
    "resultSha256": "5c2e8bfb24b54be8db2d8a2f1e9a43d74f3a4a13a08f52dc1b86dd910826a637",
    "oldMatrixSourceRetained": "58897a9459cf31b7c8937254dc17ab61ae0ce1d5",
    "accountRepairStatus": "cancelled-owner-keeps-test-accounts",
    "accountRepairPacket": "27-OPS11-ACCOUNT-REPAIR-PACKET.md",
    "accountDispositionFile": "27-OPS11-TEST-ACCOUNT-DISPOSITION.md"
  },
  "ops11TestAccountRetention": {
    "recordedAt": "2026-10-13T12:03:48.437Z",
    "status": "cancelled-preserve-test-accounts",
    "decisionSource": "direct-user",
    "ownerInstruction": "oh no we don't have to touch our accounts made for testing its okay you don't have to touch and revert its status quo",
    "supersedes": "Earlier keep-staff/clear-capabilities preparation choice",
    "accountWritesAuthorized": false,
    "repairExecuted": false,
    "repairAttemptStarted": false,
    "productionCredentialRead": false,
    "retainExistingTestAccounts": true,
    "retainedLegacyTestAccount": {
      "id": "987a6470-5c2a-4fab-8816-a1d4dd78209d",
      "role": "staff",
      "canBook": true,
      "canHost": true
    },
    "deployedRoleGuardsRetained": true,
    "deploymentRollbackRequested": false,
    "contactDisabled": true,
    "dataInvariantRepaired": false,
    "testFixtureExceptionAccepted": true,
    "phaseComplete": false,
    "decisionFile": "27-OPS11-TEST-ACCOUNT-DISPOSITION.md"
  },
  "acceptedTestExceptions": [
    {
      "id": "ops11-retained-flags-on-staff-test-fixture",
      "recordedAt": "2026-10-13T12:03:48.437Z",
      "targetUserId": "987a6470-5c2a-4fab-8816-a1d4dd78209d",
      "decisionFile": "27-OPS11-TEST-ACCOUNT-DISPOSITION.md",
      "ownerInstruction": "oh no we don't have to touch our accounts made for testing its okay you don't have to touch and revert its status quo",
      "flagsIntentionallyRetained": true,
      "dataInvariantRepaired": false,
      "roleBoundaryStillEnforced": true,
      "accountCleanupCancelled": true
    }
  ],
  "providerSignedDelivery": {
    "source": "6bb6e3f74e2acb4b3fe9ec7c8de4fecc7a5f05d3",
    "result": ".planning/phases/27-app-subdomain-marketing-website/27-PROVIDER-SIGNED-DELIVERY-RESULT.json",
    "resultSha256": "f570eb694fa2d381e0c8192b14e1c25173d010b4546b3417bb6fe5980d9fea67",
    "functionalAssertions": {
      "fourUnsignedDirectFunctionDenials": true,
      "diditProviderOriginSandboxSignatureAccepted": true,
      "diditFreshCompleteEnvelopeObserved": true,
      "diditHarmlessNotStartedProcessing": true,
      "dispatchWithinFiveMinutes": true,
      "businessAndAuditUnchanged": true,
      "noAdditionalDiditRequestInObservedPeriod": true
    },
    "strictPacketExecutionAccepted": false,
    "durationLimitPassed": false,
    "overrunSeconds": 33.42999999999995,
    "diditSandboxSignedPathObserved": true,
    "paymongoLiveSignedDelivery": "pending",
    "contactDisabled": true,
    "testAccountsUnchanged": true
  }
}
```

29/35 matrix scenarios are observed; six remain pending. All seven requirement boxes remain pending. Ops was signed out during the isolation check; the customer app session remains signed in. Existing owner Preview aliases remain on b8358b11.


### October 11 restricted Contact guard preflight

2026-10-10T21:32:10.541Z: Vercel login restored. Temporary rule rule_phase_27_restricted_contact_test_j9IM6v was scoped to exact Production POST /api/contact on fitout.live, staged/published as plain Log, and one marked empty-body probe produced one match with one original verifier IP captured privately. Rule was then edited, published and reopened with an additional original-IP Does not equal condition and plain Deny. No upgrade or system bypass occurred. Verifier POST returned503. Codex browser synthetic example.invalid submission also returned503, so it does not prove independent denial; no distinct original IP is claimed. Owner mobile-data probe requested and pending. Four completed preflight POSTs, both flags false, primary quota_rows0, no fixture or temporary enabled deployment, no email. HTTP request trace for initial probe shows no outgoing requests. Counts remain20/21,144/151,29/35, all seven requirements pending.

Saved ignored evidence contact-guard-preflight-20261011.json and contact-temporary-guard-20261011.png. Individual request logs supply503 and no outgoing APIs; custom-rule traffic supplies the single Log match. Hobby custom queries are read-only and the12h runtime-log request was rejected by retention; corrected15m runtime events were empty, so request-list evidence was used. No automatic alert, actual deployed global quota execution or rollback is claimed.


Latest bounded Contact test: see .planning/phases/27-app-subdomain-marketing-website/27-CONTACT-BOUNDED-TEST-RESULT.md. All six complete matrix gates remain pending; partial evidence does not increment29/35.

## Automatic Contact alerts — October 11

Automatic Contact alerts are live on web dpl_9cVVMaYaB4j9PgK8RGX2R8q1yE68 / b61cb4a43c8dd4c10e7444014fb66646aba36ec5. Separate app fitout-contact-alerts, signed receiver https://fitout.live/api/contact-alerts/inngest, every five minutes. Primary ledger39 with additive0038 hash c09257eb07ccee4a840abd0400283313d0821973bc8c64a0d10dc993a993f4d9. First real scheduled run 01M4MSYB70J1M05HRHPVN6PQQQ processed1 synthetic incident; Resend delivered 01a1299f-3ff8-7eff-a94c-783d416d5993 and owner confirmed inbox receipt. Next scheduled run 01M4MT7G60J1M05HRHPVN6PQQQ processed0; one test email, no duplicate. Contact remains false/503, quota0, Ops stays D67. No public inquiry was sent. Other Plan09 evidence and money/legal HOLDs remain.

Read .planning/phases/27-app-subdomain-marketing-website/27-CONTACT-AUTOMATIC-ALERTS.md. Earlier D67/source-only scope and pending-alert paragraphs are dated history superseded by this owner-authorized Contact extension. No other original Plan09 gate waived.


## Shared per-IP process test — October 11

Shared per-IP enforcement passed through HTTP in three independent local Node processes with three distinct Postgres backends. Eight concurrent attempts reserved exactly five slots; the other three received 429. Each process handled at most three race requests, so its local five-attempt cap could not explain the denials. A restarted process was still denied by the stored quota. Missing trusted identity returned 403; a second IP and an expired IP window could reserve slots. No email was sent. All 233 Contact and host-routing tests, TypeScript, and scoped lint passed, with clean test database containment. Both production flags remain false, public Contact returns 503, and the production database has zero quota rows and one previously sent alert with none pending. Test commit: 3aaf4bb4; production source: b61cb4a4. Actual Vercel client-IP handling across deployed instances remains unverified. Counts remain 20/21 phase plans, 144/151 curated plans, 29/35 historical matrix observations, and all seven requirements pending. See 27-CONTACT-PER-IP-INSTANCE-TEST.md.


## Actual Vercel ingress preparation — October 11

Actual Vercel ingress preparation: no-mail verification candidate 58897a94 is committed on codex/phase27-contact-ingress-58897a94. Both protected Preview builds are READY (web dpl_C9qrNjxKPHVk5jTsgvH1Cr9JFn9Q; Ops Preview dpl_CHPg7gJKmrFVKNUz6QaFgJL6b4TK). Cloud web build compiled in 25.9s and finished TypeScript in 27.9s. Contact/routing 237 passed; full design 1510 passed, 6 skipped; types/lint pass and test database containment is clean. The exact saved narrow Deny rule is now published active while Contact stays disabled, with the original Log rule unchanged. The allowed verifier returned 503 and all four health reads returned 200; primary quota is zero and retained alert state is one sent/zero pending. Production aliases remain web b61cb4a4 and Ops D67, with both saved flags false. No Production test build, promotion, fixture, inquiry email or financial invocation occurred. Await exact amended-packet approval and the owner mobile-data denial, including matching provider evidence. The live window has not started and the matrix row stays pending. Read 27-CONTACT-VERCEL-INGRESS-TEST-PACKET.md. Counts and all money/legal HOLDs are unchanged.


## Actual Vercel ingress completed — October11

Actual Vercel ingress passed at exact 58897a94 under the owner-approved bounded no-mail packet. A reserved3, distinct runtime B reserved2 and denied the sixth429 (Retry-After844); forged client-IP headers remained429 (806) with identical two quota fingerprints. Both aliases restored to disabled b61cb4a4 within151 seconds; saved flagsfalse, quota0, alert1sent/pending0, four health reads200, unsigned alert receiver401, OpsD67 unchanged. Exactly two owned rows removed under advisory lock. Temporary Deny disabled/published; original Log retained. Auto domain assignment restoredfalse. Automatic Inngest refresh reconciled with14 unchanged functions on a new disabled baseline-source build. No inquiry email or manual financial invocation. One matrix row now passes:30/35 dated observations (29 D67 history plus this scoped588 proof), not single-release acceptance. Plan09 remains incomplete,20/21 and144/151; all7requirements and money/legal HOLDs remain. Read 27-CONTACT-VERCEL-INGRESS-RESULT.md.


Offline live validator rerun after recording this result still FAILs. It specifically rejects contact-trusted-ingress-per-ip for candidate identity mismatch: the independently approved58897a94 scoped test is newer than the D67 engineering/cutover packet. The actual ingress test passed; it does not supply single-release acceptance. Other reported gaps are partial external inventory/high threats, staff capability denial, genuine issued verification/reset links, aggregate quota-to-alert chain, full rollback/Contact controls, actual inquiry receipt/Reply-To/reply and controlled inquiry authority. Preserve these failures and reconcile the release packet rather than weakening the validator or relabeling historical source evidence.


## Disabled58897a94 Production update

2026-10-11T15:58:10.380Z: Current public web/Ops now serve exact58897a94 under new owner authority. 24/35 fresh rows; original30 dated multi-source rows archived intact under historicalLiveAcceptance. Staff capability denial is supplemental actual proof, not a forged exact-path observation. Contact remainsdisabled. Plan09 incomplete.


## Remaining live proofs — October 12 Manila

Fresh acceptance is 29/35 at exact 58897a94. Unknown-host ingress denial and authenticated exact POST /start-hosting now pass with real proof. Staff flags remained false and its temporary session was cleared; the durable audit and unchanged alias bind the request. Six matrix cases remain pending. Original pre-move links are unavailable/expired; the prepared controlled-transition packet is not executed or approved. Contact remains disabled. Plan 09, all seven requirements, full rollback, extended monitoring, external inventory and remaining Contact controls stay pending. One separate primary staff account with both customer capabilities true is logged as a new data-consistency gap; the passing test applies only to its identified flags-off account.


Current per-IP update 2026-10-13T05:22:54.003Z: fresh repaired-driver actual ten-POST test passes, original disabled Production restored in143.571seconds, exact2owned quota rows removed, primary0/1/0, original schedulers14+1 preserved, savedflagsfalse, guarddisabledversion19. Original staging family retained; independent fresh attempt p27-per-ip-api-trace-repaired-20261013-a19f3c88 explicitly bound. Matrix34/35. Global-budget proof, inventory/high-threat/inquiry and other phase gates remain pending; no phase completion.


Global-budget/automatic-alert update 2026-10-13T06:38:54.780Z: approved fresh packet p27-global-alert-20261013-9ae3a34c completed exactly five Contact POSTs. Guarded no-mail window158.745seconds; global100/IP1, distinct runtime429/3512seconds, natural incident e68a2c7e-8425-4a93-8e87-0cd79c47284c, scheduled06:16 processed1 and06:21 processed0, exact one provider acceptance, owner Gmail receipt confirmed. Original disabled Cogas restored, both exact owned quota rows and only the new incident removed; primary0 quota/1 prior sent synthetic/0 pending. Guarddisabledv21; savedflagsfalse; original14 plus separate1 functions preserved. Typed eight-role proof validates; matrix35/35. Contact remains disabled. Inventory/high-threat/inquiry and other release gates still require their existing disposition; no phase completion claim.


Contact-control ledger reconciliation 2026-10-13T06:42:33.291Z: both actual controls pass; contact-waf-global now observed and the specifically obsolete T-27-29 control-exhaustion gap is closed with matched proof. OPS-11 staff-account consistency remains unresolved. Public inquiry/Reply-To/reply and provider inventory correspondence remain pending; Contact stays disabled. Prior prose is dated history.


Inventory reconciliation 2026-10-13T07:39:52.164Z: four former partial rows now observed(customer,Ops,environment scopes,Inngest) from fresh readbacks plus matched existing proof; remainingPayMongo/Didit runtime correspondence and real inquiry portions ofResend/mailbox remainpartial. LocalTEST/sandbox values are identified as dated clues. Contact staysdisabled; no deployment, provider edit/event, inquiry or manual financial job. Read27-INVENTORY-RECONCILIATION.md.
