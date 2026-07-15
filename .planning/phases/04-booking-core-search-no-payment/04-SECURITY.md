---
phase: 4
slug: booking-core-search-no-payment
status: verified
threats_open: 0
asvs_level: 1
created: 2026-07-15
---

# Phase 4 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Register authored at plan time (all 8 plans carry a `<threat_model>` block) and
> verified against the implemented source by `gsd-security-auditor` on 2026-07-15.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| URL searchParams → server (RSC) | Every search param is attacker-controllable; validated by `searchParamsSchema.safeParse` (default-city fallback) before any SQL | lat/lng/radius/category/priceMax/page/sort |
| validated params → SQL | Post-Zod values are still bound via Drizzle `sql` params — never concatenated into `ST_DWithin`/ranges | numeric + enum query inputs |
| client booking selection → server | Picked window / quoted total / idempotency key are untrusted; shape-validated by `bookingCreateSchema`, price + occupancy re-derived server-side | window, quotedTotalCents, idempotencyKey |
| booker input → hold insert | Client-supplied window/price is untrusted; server re-derives price (`quoteWindow`) and relies on the DB EXCLUDE constraint for occupancy | booking window, price snapshot |
| concurrent connections → booking table | Two racing bookers cross here; the `booking_no_overlap` GiST EXCLUDE constraint (not app code) is the sole arbiter | pending/confirmed booking rows |
| read model → availability surfaces | The read model is the single authority for what is free; drift silently corrupts calendar + search | occupancy (confirmed + unexpired pending) |
| client → placeHold / confirmBooking | Untrusted; the actions re-check session, `canBook`, `deriveBookable`, ownership, and expiry server-side | booking state transitions |
| client countdown → confirm | The client timer is a display cue only; the server re-checks `expires_at > now()` as the sole expiry authority | hold expiry |
| URL /listings/[id]/book?hold= → RSC | Reserve page reads ONLY the caller's own hold (owner-gate); non-owner id → 404 | hold id |
| URL /bookings/[id] → RSC | Confirmation is owner-gated; guessing an id yields `notFound()` | booking id (opaque UUID) |
| E2E seed → dev DB | Spec writes/reads the shared dev DB; unique `randomUUID` ids + cascade-correct teardown prevent cross-run corruption | test rows |

---

## Threat Register

| Threat ID | Category | Component | Disposition | Mitigation (verified evidence) | Status |
|-----------|----------|-----------|-------------|--------------------------------|--------|
| T-04-RANGE | Tampering | read-model occupancy query (04-01) | mitigate | `'[)'` half-open bound + `listing_id` scoping identical to the EXCLUDE constraint; all Drizzle-bound — `read-model.ts:105-110` | closed |
| T-04-CLOCK | Tampering | lazy-expiry predicate (04-01) | mitigate | Expiry cut uses SQL `now()` (DB tx clock), not an injectable wall clock — `read-model.ts:108` | closed |
| T-04-MIGRATE | Repudiation | live-DB schema drift (04-01) | mitigate | Live `information_schema` introspection confirms hold/geog columns + indexes; migrations `0006`, `0007` | closed |
| T-04-ORIGIN | Tampering | searchParamsSchema lat/lng (04-02) | mitigate | lat `[-90,90]`, lng `[-180,180]`, radius `{2,5,10,25}`, `z.coerce.number` fails-safe on NaN — `validation/booking.ts:51-60` | closed |
| T-04-VOCAB | Tampering | category/sort params (04-02) | mitigate | `z.union` of `spaceTypeValues`/`activityTagValues` + `z.enum(["nearest","price"])` — `booking.ts:72,74` | closed |
| T-04-PRICEIN | Tampering | priceMax / page (04-02) | mitigate | `int().min(0)` bounds; negatives/oversized rejected by safeParse — `booking.ts:62,76` | closed |
| T-04-SQLI | Tampering | Stage-1 search SQL (04-03) | mitigate | Every user value `${...}` Drizzle-bound; no concatenation — `search/query.ts:127,160,162-167` | closed |
| T-04-RADIUS | Tampering | ST_DWithin radius (04-03) | mitigate | `::geography` cast on BOTH operands (meters); outlier-excluded test — `query.ts:160`, `radius.test.ts:39-41` | closed |
| T-04-BOOKDRIFT | Elevation | bookable-gate in SQL (04-03) | mitigate | Inlined `deriveBookable` predicate + sync comment; 3-reason test — `query.ts:154-159`, `bookability.ts:16-21`, `bookable-gate.test.ts:60-73` | closed |
| T-04-AVAILTRUTH | Tampering | availability filter (04-03) | mitigate | Stage-2 uses server-authoritative `getAvailability` only; no client claim — `query.ts:192` | closed |
| T-04-DOUBLEBOOK | Tampering | createPendingHold insert (04-04) | mitigate | GiST EXCLUDE constraint is sole arbiter; probe advisory; 23P01/40P01 → "just taken" — `availability/units.ts:230-274,291-292` | closed |
| T-04-PRICETAMPER | Tampering | quotedTotalCents (04-04) | mitigate | `quoteWindow` re-derives + freezes snapshot; client figure display-only — `booking/pricing.ts:55-69`, `units.ts:227` | closed |
| T-04-IDEMCONFLATE | Tampering | 23P01 vs own-hold/23505 (04-04) | mitigate | Own-hold pre-check + 23505 backstop return SAME booking; only 23P01/40P01 → taken — `units.ts:216-217,256-259,266-268` | closed |
| T-04-TXABORT | DoS | savepoint-less outer tx (04-04) | mitigate | Per-unit `tx.transaction` SAVEPOINT; 40P01 outer retry; SQLSTATE walks `.cause` — `units.ts:236,278`, `pg.ts:13-21` | closed |
| T-04-HOLDSPAM | DoS | inventory exhaustion (04-04) | mitigate | 15-min TTL + sweep-on-write + own-hold idempotency; auth required — `units.ts:116,216,221-224`, `actions/booking.ts:64-67` | closed |
| T-04-PARAMTAMPER | Tampering | page.tsx searchParams (04-05) | mitigate | `searchParamsSchema.safeParse` + `parse({})` fallback before `searchListings` — `app/page.tsx:51-52` | closed |
| T-04-XSSCARD | Tampering | SearchResultCard render (04-05) | mitigate | JSX auto-escape; `alt={title}`; no `dangerouslySetInnerHTML` — `search/search-result-card.tsx:107` | closed |
| T-04-BOOKCAP | Elevation | placeHold capability (04-06) | mitigate | Re-reads `canBook` + re-derives `deriveBookable` server-side (route group is not the gate) — `actions/booking.ts:69-74,93-108` | closed |
| T-04-COUNTDOWNBYPASS | Tampering | confirmBooking expiry (04-06) | mitigate | Atomic `UPDATE ... WHERE status='pending' AND expires_at > now()`; 0 rows → calm expiry — `actions/booking.ts:164-168` | closed |
| T-04-HOLDIDOR | Info-disc/Elevation | confirmBooking ownership (04-06) | mitigate | `bk.bookerId !== userId` → denied before any transition — `actions/booking.ts:147-153` | closed |
| T-04-GETHOLD | Tampering | hold creation boundary (04-06) | mitigate | `"use server"` POST + `redirect`; no GET render side-effect — `actions/booking.ts:1,131` | closed |
| T-04-CONFIRMIDOR | Info-disc/Elevation | /bookings/[id] (04-07) | mitigate | No session → `notFound()`; non-owner → `notFound()` (MUST-NOT-SKIP) — `app/bookings/[id]/page.tsx:47,64` | closed |
| T-04-RESERVEIDOR | Info-disc | /listings/[id]/book (04-07) | mitigate | Reads only the booker's own hold; non-owner → `notFound()` — `app/listings/[id]/book/page.tsx:51,71` | closed |
| T-04-ENUMID | Info-disc | booking id in URL (04-07) | mitigate | Opaque `randomUUID` id in URL; FIT- reference crypto-derived, non-sequential, display-only — `booking/reference.ts:30-44` | closed |
| T-04-GETDUP | Tampering | reserve page render (04-07) | mitigate | Reserve RSC only READS; hold minted by the `placeHold` POST — `app/listings/[id]/book/page.tsx:3-6,57-70` | closed |
| T-04-E2ESEED | DoS | dev-DB test data (04-08) | mitigate | Unique `randomUUID` ids per run + afterAll cascade delete (bookings first) — `e2e/search-and-book.spec.ts:37-38,148-154` | closed |
| T-04-E2EGATE | Elevation | Book requires canBook (04-08) | verify | E2E signs in a canBook booker and exercises the D-41 Book gate (not bypassed) — `search-and-book.spec.ts:133-160,218-220,258-260` | closed |
| T-04-SEEDID | Info-disc | seed script (04-02) | accept | Namespaced `seed_*` ids, public listing data only, no PII/secrets, idempotent cleanup — `scripts/seed.ts:22,48-61` | closed |
| T-04-ENUM | Info-disc | search results (04-05) | accept | `SearchResultRow` exposes only public listing fields; no booking/booker data — `search/query.ts:26-36,145-150` | closed |
| T-04-SC | Tampering | package installs (all plans) | accept | Zero new runtime/dev dependencies this phase (only a `db:seed` script) — `package.json` phase-4 diff | closed |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-04-01 | T-04-SEEDID | Seed script uses namespaced `seed_*` ids and public listing data only — no PII, no secrets, idempotent FK-safe cleanup. Bounded to dev/UAT seeding. | pengr3 (secure-phase) | 2026-07-15 |
| AR-04-02 | T-04-ENUM | Search surface exposes only public, bookable listing data (D-16); no booking or booker data reachable. Enumerating listings reveals nothing non-public. | pengr3 (secure-phase) | 2026-07-15 |
| AR-04-03 | T-04-SC | No new runtime or dev dependencies added this phase; nil incremental supply-chain exposure. Re-audit if packages are added later. | pengr3 (secure-phase) | 2026-07-15 |

*Accepted risks do not resurface in future audit runs.*

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-15 | 30 | 30 | 0 | gsd-security-auditor (opus) |

**Coverage:** 26 mitigate + 1 verify + 3 accept dispositions. All mitigate/verify controls located at their declared entry points with `file:line` evidence; both accept-disposition risks confirmed genuinely bounded; supply-chain confirmed nil. No OPEN threats, no escalations.

**Informational (not a registered gap):** the D-41 open-redirect guard `safeCallbackUrl` (`src/app/(auth)/login/page.tsx:58-62`) honors only relative `/…` paths and rejects `//evil.com` — present and correct, mapped to the existing auth surface.

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-15
