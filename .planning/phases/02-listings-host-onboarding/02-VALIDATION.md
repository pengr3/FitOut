---
phase: 2
slug: listings-host-onboarding
status: validated
nyquist_compliant: true
wave_0_complete: true
created: 2026-06-04
validated: 2026-07-10
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
| LIST-01 | Create/edit listing persists core fields under the owner | T-IDOR | Ownership-scoped writes (`hostId === session.user.id`) | integration | `vitest run tests/listing/crud.test.ts` | ✅ | ✅ green |
| LIST-02 | Photo metadata persists + reorder rewrites positions atomically; cover = pos 0 | — | — | integration | `vitest run tests/listing/photos.test.ts` | ✅ | ✅ green |
| LIST-02 | Sign endpoint requires session + signs only allowed params, scoped to owned listing | T-UPLOAD | Session + ownership gate before minting signature | unit | `vitest run tests/listing/cloudinary-sign.test.ts` | ✅ | ✅ green |
| LIST-03 | Both rates required to publish; stored as integer cents; positive | T-PRICE | Server-side Zod re-validation; never trust client price | unit | `vitest run tests/validation/listing-schema.test.ts` | ✅ | ✅ green |
| LIST-04 | `booking_mode` stored (instant/request), sane default | — | — | integration | (covered by crud.test.ts) | ✅ | ✅ green |
| LIST-05 | status draft→published gated; unlist preserves data; soft-delete sets deletedAt | T-STATUS | Server-set status only; gated publish action | integration | `vitest run tests/listing/status-gate.test.ts` | ✅ | ✅ green |
| LIST-05 / D-02 | Publish blocked when <3 photos OR email unverified OR missing core field | T-STATUS | Strict server-side publish gate | integration | (status-gate.test.ts) | ✅ | ✅ green |
| LIST-06 | Public detail page reachable without session; unlisted/draft 404 to public | T-PII | Public projection excludes exact street + non-published | E2E | `playwright test e2e/public-listing.spec.ts` | ✅ | ✅ green |
| LIST-06 / D-09 | `publicListing` allow-list withholds exact street/coords unless `showExactAddress`; fuzzes coords | T-PII | Explicit public allow-list projection; exact point never leaves server pre-opt-in | integration | `vitest run tests/listing/listing-public.test.ts` | ✅ | ✅ green |
| PAY-04 | `merchant.activated` sets payoutsEnabled=true (host flag); `merchant.declined` auto-reverts bookability | T-WEBHOOK | Webhook/server-set only (D-14 auto-revert) | integration | `vitest run tests/paymongo/webhook-merchant-activated.test.ts` | ✅ | ✅ green |
| PAY-04 | Webhook rejects invalid `Paymongo-Signature` (400, incl. malformed/length-mismatch); idempotent on duplicate event id | T-SPOOF | `Paymongo-Signature` HMAC-SHA256 verify + idempotency by event id | unit | `vitest run tests/paymongo/webhook-signature.test.ts` | ✅ | ✅ green |
| PAY-04 | Onboarding creates a Linked Account once (reuse stored id); rate-limit → deny + audit | T-IDOR | Session + ownership; row-locked create-once; rate-limited + audited (WR-06) | unit | `vitest run tests/paymongo/onboarding.test.ts` | ✅ | ✅ green |
| D-15 | `deriveBookable` truth table (published × verified × payouts) | T-PRIV | Bookability purely derived, never client-settable | unit | `vitest run tests/listing/bookability.test.ts` | ✅ | ✅ green |
| D-10 | Coordinates round-trip (no lat/lng axis swap) | — | — | integration | `vitest run tests/listing/geo-roundtrip.test.ts` | ✅ | ✅ green |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

> **Audited 2026-07-10:** all rows verified against the live suite — `npx vitest run` = 29 files / 138 tests pass; `npx playwright test e2e/public-listing.spec.ts` = 3/3 pass (repeated 3× clean after the seed fix below). WR-06 (privileged-action rate-limit + audit) additionally covered by `tests/security/rate-limit.test.ts` + `tests/security/audit.test.ts` (green) — tracked in 02-SECURITY.md rather than as a functional-requirement row here.

---

## Wave 0 Requirements

- [x] `tests/listing/bookability.test.ts` — pure `deriveBookable` truth table (D-15)
- [x] `tests/validation/listing-schema.test.ts` — draft vs publish Zod, integer-cents, both-rates (LIST-03/D-02)
- [x] `tests/listing/crud.test.ts` — create/edit/ownership (LIST-01/04)
- [x] `tests/listing/photos.test.ts` — persist + atomic reorder + cover (LIST-02)
- [x] `tests/listing/cloudinary-sign.test.ts` — session gate + signed-param set (LIST-02)
- [x] `tests/listing/status-gate.test.ts` — publish gate, unlist, soft-delete (LIST-05/D-02)
- [x] `tests/listing/geo-roundtrip.test.ts` — PostGIS point round-trip, axis order (D-10)
- [x] `tests/listing/listing-public.test.ts` — public allow-list projection + coord fuzzing + PII-leak guard (LIST-06/D-09) *(added by Plan 05)*
- [x] `tests/paymongo/webhook-signature.test.ts` — `mockPayMongo.signWebhook` + invalid/malformed-sig 400 + idempotency (PAY-04)
- [x] `tests/paymongo/webhook-merchant-activated.test.ts` — flag flip + auto-revert (PAY-04/D-14)
- [x] `tests/paymongo/onboarding.test.ts` — Linked Account created once (reuse) + rate-limit deny+audit (PAY-04/WR-06)
- [x] `e2e/public-listing.spec.ts` — un-gated view + draft/unlisted 404 (LIST-06)
- [x] Shared: extended `tests/helpers/mocks.ts` with a PayMongo mock (`createLinkedAccount`/`createOnboardingLink` + `signWebhook` → valid `Paymongo-Signature`); `CREATE EXTENSION IF NOT EXISTS postgis` made idempotent in `drizzle/0001_enable_postgis.sql`.
- [x] Framework install: none — Vitest + Playwright already present.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| PayMongo hosted onboarding redirect + return/refresh round-trip | PAY-04 | Hosted PayMongo Linked-Accounts KYC is external; full flow not automatable in CI; needs PayMongo Platforms beta enablement | Forward the PayMongo webhook to localhost via a tunnel (ngrok/cloudflared → `/api/paymongo/webhook`); start onboarding from the host dashboard; complete Linked-Account hosted KYC; confirm `merchant.activated` flips `payoutsEnabled` and the listing becomes bookable |
| Cloudinary direct-to-client upload widget (real browser) | LIST-02 | `CldUploadWidget` opens a real widget; signature path verified in unit test but full upload is browser-driven | In dev, open the wizard photo step, upload ≥3 images, reorder, confirm cover = first; verify assets land under `fitout/listings/<listingId>` |
| Leaflet/OSM map + Photon/LocationIQ autocomplete render | LIST-01/D-11 | Map tiles + autocomplete are third-party network UI | Open listing detail page; confirm approximate fuzzed circle vs exact pin per the show-exact toggle |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 20s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ✅ validated 2026-07-10 — every Phase-2 requirement has a green automated test.

---

## Validation Audit 2026-07-10

Reconciled the pre-execution draft map against the executed codebase and the live test suite.

| Metric | Count |
|--------|-------|
| Requirement rows audited | 14 |
| COVERED (green) | 14 |
| PARTIAL | 0 |
| MISSING | 0 |
| Gaps found | 1 (test-quality) |
| Resolved | 1 |
| Escalated | 0 |

**Suite evidence:** `npx vitest run` → 29 files / 138 tests pass, 0 fail, 0 todo, 0 skip. `npx playwright test e2e/public-listing.spec.ts` → 3/3 pass (verified 3× consecutively clean).

**Gap resolved — flaky E2E seed (`e2e/public-listing.spec.ts`):** the throwaway host email was keyed on `Date.now()`, so under Playwright `fullyParallel` two workers running `beforeAll` in the same millisecond collided on `user_email_unique` (reproduced ~1 run in 4 → intermittently red). Fixed by keying the seed email on the already-`randomUUID()`-unique `hostId` (`e2e.host.${hostId}@example.com`) — test-only change, impl untouched. Now deterministic and green across repeated runs.

**Environmental note (not a code defect):** during the audit a long-running, wedged Turbopack dev server (`Jest worker … exceeding retry limit`, `write EPIPE` loop) made every `/listings/[id]` request 500. Restarting the dev server + clearing `.next` restored correct 200/404 behavior; the route itself is sound.

**Out-of-scope observation (tracked separately):** a Radix `Tooltip` SSR hydration warning at `src/app/listings/[id]/page.tsx:267` (`<span>` inside `<TooltipTrigger asChild>` for the "Not bookable yet" affordance). Client-recovered — does not 500 and does not fail the E2E — so it is not a validation-coverage gap, but is worth a follow-up cleanup.
