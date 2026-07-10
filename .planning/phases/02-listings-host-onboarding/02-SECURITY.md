---
phase: 02
slug: listings-host-onboarding
status: draft
threats_open: 1
asvs_level: 2
created: 2026-07-10
---

# Phase 02 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Retroactive audit of an already-implemented phase (6 plans: 02-01..02-06). Every mitigation was
> verified against the actual code (grep + read + test execution) — SUMMARY.md self-attestations
> ("Threat Flags: None") were NOT accepted as evidence on their own.

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
| **T-04-SIGMATCH** | **Tampering** | **signed vs sent params (`/api/cloudinary/sign`)** | **mitigate** | **Declared: "signed param set == client param set; no extra params either side." NOT what's implemented — see Open Threats below.** | **OPEN** |
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

**26/27 closed. 1 open (BLOCKER per `block_on: open`).**

---

## OPEN — T-04-SIGMATCH (Tampering, signed vs sent Cloudinary upload params)

**Declared mitigation (02-04-PLAN.md `<threat_model>`):** "Signed param set == client param set (`{timestamp, folder}`); no extra params on either side (Pitfall 3)."

**What's actually implemented (`src/app/api/cloudinary/sign/route.ts` lines 80-90, introduced in commit `8d9c475`, dated 2026-07-10 — AFTER `02-04-SUMMARY.md` was written on 2026-07-09):**

```ts
// 5a. Live <CldUploadWidget> path — it posts its OWN paramsToSign ({ folder, source: "uw",
// timestamp }). We MUST sign that EXACT set (T-04-SIGMATCH) or Cloudinary returns "Invalid
// Signature", but first enforce the folder is scoped to the owned listing so a tampered client
// can't sign an upload into another host's folder. Return only the signature — the widget already
// holds the rest of the params (and its own timestamp).
if (paramsToSign) {
  if (paramsToSign.folder !== folder) {
    return new Response("Forbidden — upload folder out of scope", { status: 403 });
  }
  return Response.json({ signature: signUploadParams(paramsToSign) });
}
```

`paramsToSign` is read verbatim from the untrusted POST body (`route.ts` lines 41-47) with **no
allow-list of permitted keys** — the only check is that the `folder` field's value equals the
caller's own listing folder. Everything else in the object is signed as-is.

**Why this is a real gap, not a documentation nit:**
- Any authenticated host (capability escalation is self-service via `activateHosting`, and creating
  a draft listing requires no approval) can `POST /api/cloudinary/sign` with a `paramsToSign` body
  containing arbitrary additional Cloudinary upload parameters — e.g. `overwrite`, `public_id`,
  `notification_url`, `eager`, `tags`, `context`, `moderation` — as long as `folder` matches their
  own listing. The server will sign the *entire* object and return a valid signature Cloudinary will
  accept.
- This directly contradicts "no extra params either side" — the endpoint is supposed to be a fixed,
  minimal `{timestamp, folder}` scope (which is exactly what the test-covered JSON-body path, 5b,
  still does).
- This is the code path the REAL production upload flow uses: `photo-uploader.tsx`'s
  `<CldUploadWidget signatureEndpoint="/api/cloudinary/sign?listingId=...">` triggers the widget to
  POST its own `paramsToSign`, hitting path 5a — not the tested path 5b.
- `tests/listing/cloudinary-sign.test.ts` only exercises the `{listingId}` JSON-body path (5b) and
  asserts `Object.keys(signedParams).sort()).toEqual(["folder", "timestamp"])` — it never sends a
  `paramsToSign` body, so path 5a (the one real uploads use) has **zero test coverage** of the
  param-tampering boundary.
- `02-04-SUMMARY.md` (`## Threat Flags: None — ... no new security surface was introduced`) predates
  this commit by a day and is now a stale self-attestation, not evidence of the current code.

**Files searched:** `src/app/api/cloudinary/sign/route.ts`, `src/lib/cloudinary.ts` (`signUploadParams`
has no key allow-list either — it forwards whatever object it's given to
`cloudinary.utils.api_sign_request`), `tests/listing/cloudinary-sign.test.ts` (no `paramsToSign`
coverage), `tests/helpers/mocks.ts` (no allow-list enforcement in the mock either).

**Not sufficient to close this:** the folder-equality check alone, because it does not constrain any
key other than `folder` — an attacker can add unlimited additional signed parameters.

**Suggested remediation (for the next implementation pass — do NOT patch here, this file is
read-only per the auditor's role):** allow-list the permitted keys in `paramsToSign` before signing
(e.g. `{folder, source, timestamp}` only, rejecting the request if any other key is present), or
stop trusting client-supplied `paramsToSign` entirely and instead sign a server-computed
`{timestamp, folder, source: "uw"}` object independent of what the client sent.

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

**Verification performed (not just static grep):**
- `npx vitest run tests/paymongo/webhook-signature.test.ts tests/paymongo/webhook-merchant-activated.test.ts tests/paymongo/onboarding.test.ts tests/listing/crud.test.ts tests/listing/status-gate.test.ts tests/listing/cloudinary-sign.test.ts tests/listing/photos.test.ts tests/security/rate-limit.test.ts tests/security/audit.test.ts` → **9 files / 46 tests, all pass**
- `npx vitest run tests/listing/listing-public.test.ts tests/listing/bookability.test.ts tests/validation/listing-schema.test.ts tests/listing/geo-roundtrip.test.ts` → **4 files / 35 tests, all pass**
- `npx vitest run` (full suite) → **29 files / 135 tests, all pass**
- `git log` swept for post-SUMMARY commits touching security-critical files — found the T-04-SIGMATCH
  regression (commit `8d9c475`) that no SUMMARY or threat-model update accounts for.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log (none)
- [ ] `threats_open: 0` confirmed — **FALSE: 1 open (T-04-SIGMATCH)**
- [ ] `status: verified` set in frontmatter — **blocked, remains `draft`**

**Approval:** pending — T-04-SIGMATCH must be closed (allow-list `paramsToSign` keys or stop trusting
client-supplied params) and re-verified before this phase can ship (`block_on: open`).
