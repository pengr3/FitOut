# Phase27 actual production evidence — incomplete

Exact approved source is deployed through separate Stage A/B/C builds. This records actual facts and six outstanding matrix scenarios; it does not complete Plan09 or release Contact/payments/legal. Browser aggregate clock entries are approximate capture windows; exact HTTP/database readbacks carry their own times.

```json
{
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
      "deploymentId": "dpl_Ez9zfWHoNoYwTS72RJxEuUbnhrtW",
      "revision": "d67fbecfa41e902cbf506c93dbcf53b60085e802",
      "scenario": "contact-trusted-ingress-per-ip",
      "expected": "Approved host/provider/control contract in Plan09 and required matrix",
      "status": "unknown",
      "outcome": "pending",
      "observed": "Temporary WAF independently denied owner mobile carrier while verifier reached disabled handler. Enabled exact-source sequential probes with rotated synthetic forwarding headers returned429,400,400,400,400,429; sixth Retry-After895. Process observation only; shared cross-instance per-IP admission proof remains pending. Temporary guard disabled after recovery.",
      "proof": ".planning/phases/27-app-subdomain-marketing-website/27-CONTACT-BOUNDED-TEST-RESULT.md",
      "observedAt": "2026-10-11T05:31:14.208Z"
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
    "T-27-29: production Contact enforcement/alert control unproved; public send remains disabled",
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
