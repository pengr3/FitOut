---
phase: 02
slug: listings-host-onboarding
status: verified
threats_open: 0
asvs_level: 2
created: 2026-07-10
updated: 2026-07-10
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Retroactive audit of an already-implemented phase (6 plans: 02-01..02-06). Every mitigation was
> verified against the actual code (grep + read + test execution) — SUMMARY.md self-attestations
> ("Threat Flags: None") were NOT accepted as evidence on their own.
>
> **Re-audit (2026-07-10):** the single prior BLOCKER, T-04-SIGMATCH, was remediated (commits
> `3165eea` RED / `d1fb76b` GREEN) and independently re-verified against the live code and a real
> test run — see "Resolved — T-04-SIGMATCH" below. **0 open threats.**
>
> **Config note:** the project default is `security_block_on: high` / `security_asvs_level: 1`. This
> audit (and the original) ran at the stricter `block_on: open` / `asvs_level: 2`. `threats_open: 0`
> satisfies both the stricter audit config and the project default.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|----------------|
| schema/migration → test harness | Migration SQL replayed verbatim into isolated schemas | DDL (PostGIS extension, listing tables) |
| money/status columns → future client writes | hourlyRateCents/dayRateCents/maxOccupancy/status/payoutsEnabled | Money-adjacent columns, writes gated in later plans |
| session → privileged capability flip | activateHosting/activateBooking escalate canHost (unlocks PayMongo payouts) | Capability flags |
| client bundle → secrets | PAYMONGO_*/CLOUDINARY_* secrets must never reach the client | Server env vars |
| client wizard → server actions | Every listing field (price, capacity, status, address) | Listing form data |
| one host → another host's listing | Edit/publish/unlist/delete must be owner-scoped | Listing rows (IDOR) |
| browser → Cloudinary (direct) | Bytes bypass the server; server only mints a scoped, ownership-checked signature | Cloudinary upload signature + params |
| anonymous public → listing data | Unauthenticated `/listings/[id]` must expose only published listings, only public fields | Listing detail data |
| stored exact address → public projection | Exact street + exact coordinates must not leak before host opts in | Address/geo data |
| PayMongo → webhook handler | Only Paymongo-Signature-verified events may write payoutsEnabled | Payout state |
| one host → another host's PayMongo Linked Account | Onboarding must operate only on the caller's own host_payout row | PayMongo account id |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation | Status |
|-----------|----------|-----------|-------------|------------|--------|
| T-02-PRIV | Elevation of Privilege | `host_payout.payoutsEnabled` / `listing.status` | mitigate | Columns default false/draft, no client-write path; `deriveBookable` pure | closed |
| T-02-PII | Information Disclosure | exact street address columns | mitigate | `showExactAddress` defaults false; public projection is Plan 05's job | closed |
| T-02-FLOAT | Tampering | money columns | mitigate | Integer `cents` columns + `publishSchema.int().positive()` | closed |
| T-02-GEO | Tampering | PostGIS location | mitigate (accept→mitigate) | `mode:"xy"` `{x:lng,y:lat}` + geo-roundtrip test | closed |
| T-02-WR06 | Elevation of Privilege / DoS | capability-activate server actions | mitigate | Per-identity rate limit (5/60s) + audit trail | closed |
| T-02-AUDIT | Repudiation | privileged escalation actions | mitigate | `recordAudit` logs actorId + action + outcome | closed |
| T-02-SECRET | Information Disclosure | PAYMONGO_SECRET_KEY / PAYMONGO_WEBHOOK_SECRET | mitigate | Documented server-only in `.env.example`, no `NEXT_PUBLIC_` prefix | closed |
| T-03-IDOR | Elevation of Privilege | saveListingStep/publish/unlist/softDelete | mitigate | `assertOwnership` before every write | closed |
| T-03-STATUS | Elevation of Privilege | `listing.status` | mitigate | status set only inside `publishListing`/`unlistListing`, never from client body | closed |
| T-03-PRICE | Tampering | hourlyRateCents/dayRateCents/maxOccupancy | mitigate | `publishSchema.int().positive()` re-validated against the persisted row | closed |
| T-03-PII | Information Disclosure | exact street address | mitigate | `showExactAddress` defaults off; wizard stores toggle only | closed |
| T-03-INPUT | Tampering | autocomplete lat/lng | mitigate | `publishSchema` requires lat/lng; lng→x, lat→y axis order enforced on write+read | closed |
| T-04-UPLOAD | Tampering / DoS | `/api/cloudinary/sign` | mitigate | Session + rate limit (30/60s) + ownership check before signing | closed |
| T-04-IDOR | Elevation of Privilege | persist/reorder/remove + sign | mitigate | `assertOwnership` on every action and before minting a signature | closed |
| T-04-SECRET | Information Disclosure | CLOUDINARY_API_SECRET | mitigate | Signed server-side only; never returned in the response body | closed |
| T-04-ORPHAN | Tampering | removed/abandoned assets | mitigate | `removePhoto` calls `destroyListingPhoto({ invalidate: true })` | closed |
| T-04-SIGMATCH | Tampering | signed vs sent params (`/api/cloudinary/sign`) | mitigate | `ALLOWED_SIGN_KEYS = {folder, source, timestamp}` allow-list rejects any other key with 400 before signing — `src/app/api/cloudinary/sign/route.ts:35,92-104` | closed |
| T-05-PII | Information Disclosure | exact street address / exact coordinates | mitigate | `publicListing` allow-list drops addressLine1/2/postalCode, fuzzes coords unless `showExactAddress` | closed |
| T-05-NONPUB | Information Disclosure | draft/unlisted listings | mitigate | RSC `notFound()` when `status !== "published"`; e2e proves 404 | closed |
| T-05-BOOKABLE | Spoofing (false affordance) | book CTA | mitigate | CTA derived from `deriveBookable`, never `status` alone | closed |
| T-05-OWNERLEAK | Information Disclosure | host info on the public page | mitigate | Reuses `publicProfile()` allow-list (Phase 1) | closed |
| T-06-SPOOF | Spoofing / Tampering | `/api/paymongo/webhook` | mitigate | HMAC-SHA256 verify, byte-length guard before `timingSafeEqual`, 400 on any failure (never 500) | closed |
| T-06-REPLAY | Tampering | webhook double-delivery | mitigate | `paymongo_event` idempotency ledger keyed by event id | closed |
| T-06-PRIV | Elevation of Privilege | `payoutsEnabled` / `paymongoAccountId` | mitigate | Webhook is the single writer of `payoutsEnabled`; onboarding action never touches it | closed |
| T-06-IDOR | Elevation of Privilege | `startPayoutOnboarding` | mitigate | Row-locked create-once on the caller's own `host_payout` row; rate-limited + audited | closed |
| T-06-SECRET | Information Disclosure | PAYMONGO_SECRET_KEY / PAYMONGO_WEBHOOK_SECRET | mitigate | Server-only env, production fail-closed boot guard, `runtime="nodejs"` | closed |
| T-06-LINK | Information Disclosure / Tampering | hosted onboarding link URL | mitigate | Fresh single-use link minted every call/refresh, never persisted | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

**27/27 closed. 0 open.**

---

## Resolved — T-04-SIGMATCH (Tampering, signed vs sent Cloudinary upload params)

**Prior finding (2026-07-10, first pass):** `/api/cloudinary/sign` path 5a (the live
`<CldUploadWidget>` path, driven by `paramsToSign` in the POST body) signed the client-supplied
object verbatim, validating only that `paramsToSign.folder` matched the caller's own listing folder.
Any authenticated host could add arbitrary Cloudinary upload keys (`public_id`, `notification_url`,
`eager`, `overwrite`, `tags`, `context`, `moderation`, …) and receive a valid signature for them —
contradicting the declared mitigation ("signed param set == client param set; no extra params either
side"). Path 5a had zero test coverage of this boundary at the time.

**Fix (commits `3165eea` RED / `d1fb76b` GREEN, both 2026-07-10, on `dev`):** a fixed
`ALLOWED_SIGN_KEYS = {"folder", "source", "timestamp"}` allow-list is now enforced in path 5a
*before* `signUploadParams` is ever called. Verified independently in this re-audit (not taken from
the commit message or SUMMARY):

- **`src/app/api/cloudinary/sign/route.ts:35`** — `const ALLOWED_SIGN_KEYS = new Set(["folder",
  "source", "timestamp"])`, exactly the minimal set `<CldUploadWidget>` sends (confirmed against
  `src/components/listing/photo-uploader.tsx:155`, the only `CldUploadWidget` consumer in the repo,
  and against `src/lib/cloudinary.ts` — `signUploadParams`/`signListingUpload` have no other
  callers anywhere in `src/`).
- **`route.ts:92-98`** — path 5a computes `Object.keys(paramsToSign).find((k) =>
  !ALLOWED_SIGN_KEYS.has(k))`; any key outside the allow-list short-circuits to `400` *before*
  `signUploadParams` is reached — no signature is minted for a tampered body, closing the exact gap
  the prior audit found.
- **`route.ts:99-103`** — the pre-existing folder-scope check (`paramsToSign.folder !== folder` →
  `403`) is intact and now runs *after* the allow-list check (read the diff of `d1fb76b`: it is a
  pure addition, 17 insertions / 3 deletions, touching only the comment block and the new guard —
  the folder check, session gate (step 1), listingId resolution (step 2), rate limit (step 3, 30/60s
  keyed on `session.user.id`), and ownership lookup (step 4) are byte-for-byte unchanged).
- **Path 5b** (`route.ts:106-116`, the `{listingId}` JSON-body path used by the primary test suite)
  is untouched by the fix — still signs a server-computed `{timestamp, folder}` only, never touching
  client-supplied params at all.
- **`src/lib/cloudinary.ts`** — `signUploadParams` remains a generic signer with no key enforcement
  of its own (by design; its JSDoc says "Callers MUST validate/scope sensitive params … BEFORE
  calling this"). This is acceptable because the route (the single call site) now fully constrains
  the input before every call — verified there is no other code path in `src/` that calls
  `signUploadParams` or `signListingUpload`.

**Test coverage added (`tests/listing/cloudinary-sign.test.ts`, path-5a block, lines 188-249):**
- `"rejects a paramsToSign body with a key outside the {folder, source, timestamp} allow-list"` —
  sends `public_id` and `notification_url` as extra keys with an otherwise-valid body; asserts `400`,
  asserts `signSpy` (the mocked `cloudinary.utils.api_sign_request`) was **never called**, and asserts
  the string `"mock-signature"` never appears in the response body.
- `"signs a clean paramsToSign of exactly {folder, source, timestamp}"` — the widget happy path;
  asserts `200`, `signature: "mock-signature"`, and that the signed key set is exactly
  `["folder", "source", "timestamp"]`.
- `"returns 403 when paramsToSign.folder points outside the owned listing's folder"` — allow-listed
  keys, wrong folder value → `403`, `signSpy` never called (proves the allow-list didn't weaken the
  folder-scope gate).

**Independent re-verification performed in this re-audit (not accepted from SUMMARY/commit
message):**
- Read the live route and signer source in full (not a keyword grep) and traced every call site of
  `signUploadParams`/`signListingUpload`/`CldUploadWidget` in `src/` — confirmed no bypass path.
- `git show d1fb76b` — confirmed the diff is additive-only (allow-list check + comment update); the
  session/ownership/rate-limit/folder-scope gates are unmodified.
- `npx vitest run tests/listing/cloudinary-sign.test.ts` → **1 file / 9 tests, all pass** (6 pre-existing
  + 3 new path-5a tests).
- `npx vitest run` (full suite) → **29 files / 138 tests, all pass**.
- `npx tsc --noEmit` → clean (exit 0).
- Adversarial probing of the allow-list itself:
  - Empty `paramsToSign: {}` → no extra key found, but `folder` is `undefined !== folder` → `403`,
    no signature minted. Not a bypass.
  - `paramsToSign` as an array → `Object.keys()` yields numeric-index keys (`"0"`, …), none in the
    allow-list → `400`. Not a bypass.
  - `paramsToSign: null` → filtered out by the `body.paramsToSign &&` truthiness check in the
    body-parsing step (route.ts:52) before `paramsToSign` is ever assigned; falls through to path 5b
    (server-computed, safe). Not a bypass.
  - JSON body with a literal `"__proto__"` key → `JSON.parse` (ES2015+) creates it as an own
    enumerable data property via `CreateDataProperty`, not a prototype-chain write, so
    `Object.keys()` includes `"__proto__"` as a normal key → rejected as an extra key (`400`). Not a
    bypass (and no prototype pollution occurs either way, since nothing in the route or
    `cloudinary.utils.api_sign_request` merges the object onto a shared prototype).
  - Allow-listed keys with a non-string `folder` (e.g. an object) → fails the strict `!==` folder
    comparison against the server-computed string → `403`. Not a bypass.
  - Confirmed path 5b cannot be reached with attacker-controlled params at all (server computes
    `{timestamp, folder}` itself; client input only selects the target `listingId`, which is still
    ownership-checked at step 4 before either path runs).
- No residual gap found. **T-04-SIGMATCH is CLOSED.**

---

## Unregistered Flags

None found beyond the register. All 6 SUMMARY.md files' `## Threat Flags` sections (present in
Plans 04/05/06; absent in Plans 01/02/03) report "None" / no section, and an independent sweep of
git history for security-relevant files touched outside the plan/summary lifecycle (`git log` on
`src/app/api/cloudinary/sign/route.ts`, `src/lib/cloudinary.ts`, `src/app/api/paymongo/webhook/route.ts`,
`src/lib/paymongo.ts`, `src/app/actions/listing.ts`, `src/app/actions/listing-photo.ts`,
`src/app/actions/paymongo-connect.ts`, `src/lib/listing-public.ts`, `src/app/listings/`) found exactly
one post-summary commit touching a security-critical file: `8d9c475`, which is the source of the
T-04-SIGMATCH gap above (tracked there, not as a separate unregistered flag, since T-04-SIGMATCH
already names this exact boundary). The other post-summary commit found (`bc6a057`, UAT fix to
`validation/listing.ts`/`address-autocomplete.tsx`/`wizard.tsx` making `postalCode` optional and
adding a city name-fallback) is a correctness/UX fix with no security-relevant field — postal code
was never part of any declared mitigation.

**Re-audit sweep (2026-07-10):** `git show --stat` on the two remediation commits (`3165eea` test-only,
`d1fb76b` route-only, both scoped exactly to `src/app/api/cloudinary/sign/route.ts` and
`tests/listing/cloudinary-sign.test.ts`) confirms no new attack surface was introduced by the fix — it
narrows an existing boundary, it doesn't add one. No new unregistered flags.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|

No accepted risks. (T-02-GEO's `accept→mitigate` disposition resolved to a full `mitigate` — see
Threat Register above — so no entry belongs here.)

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-10 | 27 | 26 | 1 | gsd-security-auditor |
| 2026-07-10 | 27 | 27 | 0 | gsd-security-auditor (re-audit) |

**First-pass verification performed (not just static grep):**
- `npx vitest run tests/paymongo/webhook-signature.test.ts tests/paymongo/webhook-merchant-activated.test.ts tests/paymongo/onboarding.test.ts tests/listing/crud.test.ts tests/listing/status-gate.test.ts tests/listing/cloudinary-sign.test.ts tests/listing/photos.test.ts tests/security/rate-limit.test.ts tests/security/audit.test.ts` → **9 files / 46 tests, all pass**
- `npx vitest run tests/listing/listing-public.test.ts tests/listing/bookability.test.ts tests/validation/listing-schema.test.ts tests/listing/geo-roundtrip.test.ts` → **4 files / 35 tests, all pass**
- `npx vitest run` (full suite) → **29 files / 135 tests, all pass**
- `git log` swept for post-SUMMARY commits touching security-critical files — found the T-04-SIGMATCH
  regression (commit `8d9c475`) that no SUMMARY or threat-model update accounts for.

**Re-audit verification performed (2026-07-10, independent — not accepted from SUMMARY or commit
message; see "Resolved — T-04-SIGMATCH" above for full detail):**
- Read `src/app/api/cloudinary/sign/route.ts` and `src/lib/cloudinary.ts` in full; traced every
  call site of the signer functions and the `CldUploadWidget` consumer.
- `git show d1fb76b` — confirmed the fix diff is additive-only; session/ownership/rate-limit/folder
  gates unmodified; path 5b untouched.
- `npx vitest run tests/listing/cloudinary-sign.test.ts` → **1 file / 9 tests, all pass**.
- `npx vitest run` (full suite) → **29 files / 138 tests, all pass**.
- `npx tsc --noEmit` → clean (exit 0).
- Adversarial probing (empty object, array, null, `__proto__` key, non-string folder, path-5b
  reachability) — no bypass found.
- Config cross-check: project default is `security_block_on: high` / `security_asvs_level: 1`; this
  audit ran at the stricter `block_on: open` / `asvs_level: 2` (matching the first pass).
  `threats_open: 0` satisfies both.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (none)
- [x] `threats_open: 0` confirmed — 27/27 closed, independently re-verified 2026-07-10
- [x] `status: verified` set in frontmatter

**Approval:** granted — T-04-SIGMATCH closed (allow-list enforced in `route.ts` path 5a, commits
`3165eea`/`d1fb76b`, independently re-verified against live code and a passing test run). Phase 02
has 0 open threats and may ship.
