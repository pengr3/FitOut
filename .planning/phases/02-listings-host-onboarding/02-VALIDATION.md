---
phase: 2
slug: listings-host-onboarding
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-06-04
---

# Phase 2 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.
> Derived from `02-RESEARCH.md` § Validation Architecture.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.8 (unit + integration, node env; jsdom per-file pragma) + Playwright 1.60 (E2E) |
| **Config file** | `vitest.config.ts` (include `tests/**/*.test.ts(x)`), `playwright.config.ts` |
| **Quick run command** | `npm test` (→ `vitest run`, single pass, no watch) |
| **Full suite command** | `npm test && npm run test:e2e` |
| **Estimated runtime** | ~10–20 seconds (Vitest); E2E adds a couple minutes |
| **Integration DB** | Isolated per-worker Postgres schema via `tests/helpers/db.ts` (replays `./drizzle` migrations); test auth via `tests/helpers/auth.ts`. Migration must make `CREATE EXTENSION IF NOT EXISTS postgis` idempotent so the harness replays cleanly. |

---

## Sampling Rate

- **After every task commit:** Run the single relevant test file (e.g. `vitest run tests/listing/bookability.test.ts`) — <5s unit, a few seconds for a schema-isolated integration file.
- **After every plan wave:** Run `npm test` (full Vitest suite).
- **Before `/gsd-verify-work`:** `npm test && npm run test:e2e` must be green.
- **Max feedback latency:** ~20 seconds (quick), full suite under a few minutes.

---

## Per-Task Verification Map

> Task IDs populated during planning. Requirement → test mapping is fixed below (from research); the planner assigns each row to a concrete task/wave.

| Requirement | Behavior | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|-------------|----------|------------|-----------------|-----------|-------------------|-------------|--------|
| LIST-01 | Create/edit listing persists core fields under the owner | T-IDOR | Ownership-scoped writes (`hostId === session.user.id`) | integration | `vitest run tests/listing/crud.test.ts` | ❌ W0 | ⬜ pending |
| LIST-02 | Photo metadata persists + reorder rewrites positions atomically; cover = pos 0 | — | — | integration | `vitest run tests/listing/photos.test.ts` | ❌ W0 | ⬜ pending |
| LIST-02 | Sign endpoint requires session + signs only allowed params, scoped to owned listing | T-UPLOAD | Session + ownership gate before minting signature | unit | `vitest run tests/listing/cloudinary-sign.test.ts` | ❌ W0 | ⬜ pending |
| LIST-03 | Both rates required to publish; stored as integer cents; positive | T-PRICE | Server-side Zod re-validation; never trust client price | unit | `vitest run tests/validation/listing-schema.test.ts` | ❌ W0 | ⬜ pending |
| LIST-04 | `booking_mode` stored (instant/request), sane default | — | — | integration | (covered by crud.test.ts) | ❌ W0 | ⬜ pending |
| LIST-05 | status draft→published gated; unlist preserves data; soft-delete sets deletedAt | T-STATUS | Server-set status only; gated publish action | integration | `vitest run tests/listing/status-gate.test.ts` | ❌ W0 | ⬜ pending |
| LIST-05 / D-02 | Publish blocked when <3 photos OR email unverified OR missing core field | T-STATUS | Strict server-side publish gate | integration | (status-gate.test.ts) | ❌ W0 | ⬜ pending |
| LIST-06 | Public detail page reachable without session; unlisted/draft 404 to public | T-PII | Public projection excludes exact street + non-published | integration/E2E | `playwright test e2e/public-listing.spec.ts` | ❌ W0 | ⬜ pending |
| PAY-04 | `account.updated` payouts_enabled=true flips host flag; =false auto-reverts bookability | T-WEBHOOK | Webhook/server-set only (D-14 auto-revert) | integration | `vitest run tests/stripe/webhook-account-updated.test.ts` | ❌ W0 | ⬜ pending |
| PAY-04 | Webhook rejects invalid signature (400); idempotent on duplicate event id | T-SPOOF | `constructEvent` sig verify + idempotency by event.id | unit | `vitest run tests/stripe/webhook-signature.test.ts` | ❌ W0 | ⬜ pending |
| D-15 | `deriveBookable` truth table (published × verified × payouts) | T-PRIV | Bookability purely derived, never client-settable | unit | `vitest run tests/listing/bookability.test.ts` | ❌ W0 | ⬜ pending |
| D-10 | Coordinates round-trip (no lat/lng axis swap) | — | — | integration | `vitest run tests/listing/geo-roundtrip.test.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/listing/bookability.test.ts` — pure `deriveBookable` truth table (D-15)
- [ ] `tests/validation/listing-schema.test.ts` — draft vs publish Zod, integer-cents, both-rates (LIST-03/D-02)
- [ ] `tests/listing/crud.test.ts` — create/edit/ownership (LIST-01/04)
- [ ] `tests/listing/photos.test.ts` — persist + atomic reorder + cover (LIST-02)
- [ ] `tests/listing/cloudinary-sign.test.ts` — session gate + signed-param set (LIST-02)
- [ ] `tests/listing/status-gate.test.ts` — publish gate, unlist, soft-delete (LIST-05/D-02)
- [ ] `tests/listing/geo-roundtrip.test.ts` — PostGIS point round-trip, axis order (D-10)
- [ ] `tests/stripe/webhook-signature.test.ts` — `generateTestHeaderString` + invalid-sig 400 + idempotency (PAY-04)
- [ ] `tests/stripe/webhook-account-updated.test.ts` — flag flip + auto-revert (PAY-04/D-14)
- [ ] `e2e/public-listing.spec.ts` — un-gated view + draft/unlisted 404 (LIST-06)
- [ ] Shared: extend `tests/helpers/mocks.ts` with a Stripe mock (account create/retrieve + `constructEvent`/`generateTestHeaderString`); make `CREATE EXTENSION IF NOT EXISTS postgis` idempotent in the migration.
- [ ] Framework install: none — Vitest + Playwright already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Stripe-hosted onboarding redirect + return/refresh round-trip | PAY-04 | Hosted Stripe UI is external; full KYC flow not automatable in CI | Run `stripe listen --forward-to localhost:3000/api/stripe/webhook`; start onboarding from host dashboard; complete Express test KYC; confirm `account.updated` flips `payouts_enabled` and listing becomes bookable |
| Cloudinary direct-to-client upload widget (real browser) | LIST-02 | `CldUploadWidget` opens a real widget; signature path verified in unit test but full upload is browser-driven | In dev, open the wizard photo step, upload ≥3 images, reorder, confirm cover = first; verify assets land under `fitout/listings/<listingId>` |
| Leaflet/OSM map + Photon/LocationIQ autocomplete render | LIST-01/D-11 | Map tiles + autocomplete are third-party network UI | Open listing detail page; confirm approximate fuzzed circle vs exact pin per the show-exact toggle |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
