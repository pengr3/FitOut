---
phase: 02-listings-host-onboarding
verified: 2026-08-01T12:40:00Z
status: human_needed
score: 4/4 success criteria verified
overrides_applied: 0
retroactive: true
retroactive_reason: "Phase 2 shipped 2026-07-10 without running the verification gate — discovered by the v1.0 milestone audit (2026-08-01), which flagged LIST-01..06 + PAY-04 as orphaned because they appeared in no VERIFICATION.md anywhere in the milestone. This report is a first-hand re-verification against the CURRENT codebase, not a reconstruction of the 2026-07-10 state."
human_verification:
  - test: "Complete PayMongo hosted Linked-Accounts onboarding (KYC) end to end from /host, return via the return_url, and confirm the merchant.activated webhook flips payoutsEnabled=true and the listing becomes bookable"
    expected: "The hosted onboarding redirect resolves, PayMongo delivers merchant.activated for the stored paymongo_account_id, host_payout.payouts_enabled becomes true, and the public listing CTA changes from 'Not bookable yet' to 'Book this space'"
    why_human: "PayMongo Platforms / Linked Accounts is sales-gated and NOT enabled on this account — the same standing external blocker recorded in 05-VERIFICATION.md and 02-UAT.md test 11. The webhook branch itself IS proven by tests/paymongo/webhook-merchant-activated.test.ts (signature-verified, idempotent, both activate and decline arms), but the real hosted-KYC round trip cannot be exercised."
    status: "OPEN (re-checked 2026-08-05) — unchanged. PayMongo's Platforms beta is still not enabled on this account, so the hosted-KYC round trip has never been walked. This is the entry that keeps the phase at human_needed."
  - test: "Upload a listing photo through the wizard against real Cloudinary credentials"
    expected: "The CldUploadWidget obtains a signature from /api/cloudinary/sign, uploads directly to Cloudinary, and the photo persists with a position and renders as the cover at position 0"
    why_human: "The server-side Cloudinary secret (CLOUDINARY_CLOUD_NAME / CLOUDINARY_API_KEY / CLOUDINARY_API_SECRET) is NOT present in the current .env.local — only the two NEXT_PUBLIC_* client vars are. The signing logic is proven by tests/listing/cloudinary-sign.test.ts and the flow was exercised against real Cloudinary during the 2026-07-10 UAT (02-UAT.md test 8), but it cannot be re-exercised in the current environment."
    status: "DISCHARGED on historical evidence (2026-08-05) — 02-UAT.md test 8 'Photo upload + reorder | upload >=3, drag-reorder, first = cover' is recorded pass ('✅ after env + signature fixes'), and that UAT's own verdict line states 'Verified against real Postgres + real Cloudinary'. A human did walk this against real Cloudinary on 2026-07-10. It CANNOT be re-exercised today (server-side secret still absent), so this is discharged on the historical record, not re-observed."
---

# Phase 2: Listings & Host Onboarding — Verification Report

**Phase Goal:** A host can publish a real, sellable listing — details, photos, pricing, and booking mode — and complete payout onboarding, with **bookability (not listing creation)** gated on payout readiness so a slot can never be sold to an unpayable host.

**Verified:** 2026-08-01T12:40:00Z
**Status:** human_needed
**Re-verification:** Retroactive — this phase never ran its verification gate at the time (see frontmatter `retroactive_reason`).

## Why this report exists

The v1.0 milestone audit found Phase 2 to be the only phase in the milestone with no VERIFICATION.md.
Its requirements (LIST-01…06, PAY-04) were therefore **orphaned** — present in the REQUIREMENTS.md
traceability table and in six SUMMARYs, but absent from every VERIFICATION.md in the project. Phase 2
did produce `02-UAT.md` (complete, 8/11 pass), `02-SECURITY.md` (`threats_open: 0`, ASVS L2) and
`02-VALIDATION.md` (`nyquist_compliant: true`) — the gate that was skipped is specifically the
goal-backward verification.

Everything below was checked **first-hand against the current codebase, a live Postgres, and freshly
re-run tests** in this session. Nothing is taken from the SUMMARYs' narrative.

---

## Goal Achievement

### Observable Truths (ROADMAP Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | A host can create and edit a listing with title, description, space type, address, capacity and amenities, and upload multiple ordered photos — **without first completing payout onboarding** | ✓ VERIFIED | `createDraftListing` / `saveListingStep` (`src/app/actions/listing.ts:83,104`) are session- + ownership-gated and never consult payout state; `assertOwnership` (`listing.ts:67`) is the IDOR guard. The D-08 vocabulary is one typed module (`src/lib/listing-vocab.ts` — `SPACE_TYPES`, `ACTIVITY_TAGS`, `AMENITIES` + label maps). Photos: `persistPhoto` / `reorderPhotos` / `removePhoto` (`src/app/actions/listing-photo.ts:80,121,165`); the uploader is `CldUploadWidget` + `@dnd-kit` (`photo-uploader.tsx:16-35,154`). **The payout-independence is the load-bearing half** — `publishListing` reads `emailVerified` and photo count, never `payoutsEnabled`. |
| 2 | A host can set an hourly rate and a day rate, choose instant-book or request-to-book, and set listing status (draft / published / unlisted) | ✓ VERIFIED | `publishSchema` (`src/lib/validation/listing.ts:155`) requires `bookingMode: z.enum(bookingModeValues)` and, for `exclusive` listings, both `hourlyRateCents` and `dayRateCents` as positive integers (moved to a `superRefine` in Phase 9 so drop-in listings stay publishable — the exclusive branch is unchanged and still guarded by the both-rates cases). Live DB confirms `hourly_rate_cents`/`day_rate_cents` are `integer` (cents, never float) and `booking_mode`/`status` are real pg enums with `'instant'`/`'draft'` defaults. `status` is set **only** by `publishListing` / `unlistListing` / `softDeleteListing` — never from a client body. |
| 3 | Anyone can view a published listing's detail page with photos, description, amenities, location, price and a book CTA | ✓ VERIFIED | `src/app/listings/[id]/page.tsx` is an un-gated RSC; `if (!row \|\| row.listing.status !== "published") notFound()` (line 113-114) makes draft/unlisted 404 to the public. `publicListing()` (`src/lib/listing-public.ts:108`) is an explicit allow-list that withholds `addressLine1`/`addressLine2`/`postalCode` and **fuzzes the coordinates** unless the host opted into `showExactAddress`. **E2E re-run live in this session: 3/3 passed** (`e2e/public-listing.spec.ts` — page renders, draft 404s, unlisted 404s). |
| 4 | A host completes payout (KYC) onboarding, and a listing only becomes bookable once the host's payouts are enabled, tracked via the activation webhook | ✓ VERIFIED (code) / real hosted-KYC round trip is human-gated | `deriveBookable` (`src/lib/bookability.ts:16-21`) is a pure three-way AND: `status === "published" && host.emailVerified && host.payoutsEnabled`. `payoutsEnabled` has **exactly two writers in the entire `src/` tree**, both inside the signature-verified webhook (`src/app/api/paymongo/webhook/route.ts:464` activate, `:471` decline/deactivate) — grep-confirmed; every other occurrence is a read. D-14 auto-revert is therefore free: flipping the flag false makes every listing non-bookable with zero per-listing writes. `startPayoutOnboarding` (`paymongo-connect.ts:89`) is rate-limited + audited and creates at most one Linked Account under a `SELECT … FOR UPDATE` row lock (`:64-78`). |

**Score: 4/4 success criteria verified.**

> Note on the roadmap wording: criterion 4 says "Stripe Connect". The provider was revised to **PayMongo**
> per D-20 (2026-07-09, PROJECT.md Key Decisions — Stripe has no PH acquiring and no QRPh). The
> criterion is verified against PayMongo Linked Accounts, which is the decided design, not a deviation.

---

## Requirements Coverage

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|----------------|-------------|--------|----------|
| LIST-01 | 02-01, 02-02, 02-03 | Create/edit a listing with title, description, space type, address, capacity, amenities | ✓ SATISFIED | `createDraftListing`/`saveListingStep`/`assertOwnership` (`listing.ts:83,104,67`); `draftSchema` accepts partials, `publishSchema` requires the core set; `listing-vocab.ts` is the single D-08 vocabulary; live `listing` table carries every column. `tests/listing/crud.test.ts` green. |
| LIST-02 | 02-04 | Upload and order multiple photos | ✓ SATISFIED | `persistPhoto`/`reorderPhotos`/`removePhoto` (`listing-photo.ts:80,121,165`); position rewrite is transactional, position 0 = cover; `photo-uploader.tsx` wires `signatureEndpoint="/api/cloudinary/sign?listingId=…"` + `@dnd-kit` drag AND keyboard move controls. `tests/listing/photos.test.ts` + `tests/listing/cloudinary-sign.test.ts` green. Real-Cloudinary upload is human-gated (no server secret in the current env). |
| LIST-03 | 02-01, 02-03 | Hourly rate and day rate | ✓ SATISFIED | Both required as positive integer cents for `exclusive` listings via `publishSchema`'s `superRefine` (`EXCLUSIVE_RATES_REQUIRED_MESSAGE`); live columns are `integer`. `tests/validation/listing-schema.test.ts` green. |
| LIST-04 | 02-01, 02-03 | Instant-book vs request-to-book per listing | ✓ SATISFIED | `bookingMode` is a required enum in `publishSchema`; live `booking_mode` pg enum defaults `'instant'`. Downstream proof: 06-VERIFICATION.md verifies `placeHold` forks on `listing.bookingMode` — the field is load-bearing, not decorative. |
| LIST-05 | 02-01, 02-03 | Listing status (draft / published / unlisted) | ✓ SATISFIED | `publishListing` is the **single sanctioned draft→published transition** (`listing.ts:381-385`, comment states this); `unlistListing`/`softDeleteListing` own the other transitions. No client body can set `status`. `tests/listing/status-gate.test.ts` green. |
| LIST-06 | 02-05 | Public listing detail page | ✓ SATISFIED | Un-gated RSC + `notFound()` on non-published + `publicListing()` allow-list with coordinate fuzzing. **`e2e/public-listing.spec.ts` re-run live: 3/3 passed.** `tests/listing/listing-public.test.ts` green. |
| PAY-04 | 02-06 | Payout onboarding gates bookability | ✓ SATISFIED (code) / **human-gated for the live KYC round trip** | `deriveBookable` is the un-bypassable gate and is re-derived server-side at every sell point (see Key Links). Webhook is signature-verified before parsing, idempotent by event id, and is the only writer of `payoutsEnabled`. `tests/paymongo/webhook-signature.test.ts` + `tests/paymongo/webhook-merchant-activated.test.ts` + `tests/paymongo/onboarding.test.ts` green. The hosted Linked-Accounts redirect is blocked on PayMongo's sales-gated Platforms beta (external, standing since Phase 2 — `02-UAT.md` test 11). |

**All 7 phase requirements satisfied in code.** PAY-04 carries a human item for the external round trip
only; the gate it produces is fully proven.

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|---------|--------|---------|
| `src/lib/db/schema.ts` | listing + photo + amenity + activity_tag + host_payout tables | ✓ VERIFIED | Live `\d listing` confirms all 31 columns incl. `location geometry(Point,4326)`, `show_exact_address`, `currency` default `'php'` |
| `src/lib/listing-vocab.ts` | D-08 locked vocabulary, single typed module | ✓ VERIFIED | `SPACE_TYPES`, `ACTIVITY_TAGS`, `AMENITIES` + value arrays + label maps |
| `src/lib/validation/listing.ts` | `draftSchema` + `publishSchema` shared client/server | ✓ VERIFIED | Both exported (`:108`, `:155`) |
| `src/lib/bookability.ts` | `deriveBookable` — the un-bypassable sell gate | ✓ VERIFIED | 21 lines, pure, no I/O; module header documents the boundary intent |
| `drizzle/0001_enable_postgis.sql` | `CREATE EXTENSION IF NOT EXISTS postgis` | ✓ VERIFIED | File present; **live DB confirms `postgis` and `btree_gist` both installed** |
| `src/app/actions/listing.ts` | create/save/publish/unlist/softDelete | ✓ VERIFIED | All five exported |
| `src/app/actions/listing-photo.ts` | persist/reorder/remove | ✓ VERIFIED | All three exported |
| `src/app/api/cloudinary/sign/route.ts` | session + ownership + rate-limited signature endpoint | ✓ VERIFIED | 401 no session (`:41`), 429 over budget (`:67-70`), 403 non-owner (`:81-82`), 403 folder out of scope (`:101`) |
| `src/lib/listing-public.ts` | `publicListing` allow-list projection | ✓ VERIFIED | Exact street + postcode withheld and coordinates fuzzed unless `showExactAddress` |
| `src/app/listings/[id]/page.tsx` | public un-gated detail RSC | ✓ VERIFIED | `notFound()` on non-published; `deriveBookable` drives the CTA |
| `src/app/actions/paymongo-connect.ts` | `startPayoutOnboarding`, rate-limited + audited, create-once | ✓ VERIFIED | `rateLimit`, `recordAudit`, `SELECT … FOR UPDATE` create-once |
| `src/app/api/paymongo/webhook/route.ts` | signature-verified, idempotent merchant.activated/declined | ✓ VERIFIED | Prod boot guard `:36`; signature verify before parse; `paymongo_event` dedupe insert; both arms present |
| `src/lib/rate-limit.ts` + `src/lib/audit.ts` | WR-06 closure helpers | ✓ VERIFIED | Both present and consumed by `capability.ts`, `paymongo-connect.ts`, the sign route |
| `e2e/public-listing.spec.ts` | LIST-06 E2E | ✓ VERIFIED | **3/3 passed live in this session** |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|----|--------|---------|
| `publishListing` | `publishSchema` + photo count + `emailVerified` | server-side re-validation of the **persisted row** | ✓ WIRED | `listing.ts:320-360` re-parses from the DB row, never client state; comment says so explicitly for `cancellationPolicy` |
| `photo-uploader.tsx` | `/api/cloudinary/sign` | `signatureEndpoint` prop | ✓ WIRED | `photo-uploader.tsx:155` |
| `/api/cloudinary/sign` | the listing row | `row.hostId !== session.user.id → 403` | ✓ WIRED | `route.ts:77-82` |
| webhook | `host_payout.payoutsEnabled` | `merchant.activated` → privileged update keyed by `paymongo_account_id` | ✓ WIRED | `webhook/route.ts:461-474` |
| webhook flag | `deriveBookable` | pure derivation, zero per-listing writes (D-14) | ✓ WIRED | Grep proves 2 writers / N readers |
| `deriveBookable` | Phase 4/6/9 sell points | re-derived server-side at each | ✓ WIRED | `placeHold` (`booking.ts:174`), `placeOpenHold` (`booking.ts:411`), listing page (`page.tsx:122`), host listings grid (`listings/page.tsx:54`); search Stage-1 inlines the same predicate with a "KEEP IN SYNC" comment |
| `paymongo-connect.ts` | `host_payout.paymongoAccountId` | one Linked Account under a row lock, persisted server-side before redirect | ✓ WIRED | `:61-78` |

---

## Security Invariants

| Invariant | Status | Evidence |
|-----------|--------|---------|
| `payoutsEnabled` / `paymongoAccountId` are never client-settable | ✓ VERIFIED | Grep over `src/`: `payoutsEnabled` is written in exactly two places, both in the webhook; `paymongoAccountId` is written only in `paymongo-connect.ts` under a row lock |
| Bookability gates **selling**, not listing creation | ✓ VERIFIED | `publishListing` never reads payout state; `deriveBookable` is consulted at the hold/CTA layer |
| Non-owner cannot edit, publish, unlist or delete another host's listing | ✓ VERIFIED | `assertOwnership` on every mutation; `WHERE … AND hostId = userId` on the update itself |
| Cloudinary signature endpoint is session + ownership + rate gated | ✓ VERIFIED | 401 / 403 / 429 all present; folder scope re-checked |
| Webhook verifies `Paymongo-Signature` before parsing, and is idempotent | ✓ VERIFIED | Verify-then-parse ordering; `paymongo_event` dedupe; prod boot guard on the secret (`:36`) |
| Exact street address and precise coordinates never leak without host opt-in | ✓ VERIFIED | `publicListing` allow-list + `fuzzCoordinate` |
| Privileged capability actions are rate-limited and audited (WR-06 carry-forward from Phase 1) | ✓ VERIFIED | `rateLimit` + `recordAudit` in `capability.ts` and `paymongo-connect.ts`; `tests/security/rate-limit.test.ts` + `audit.test.ts` green |

`02-SECURITY.md` independently records `threats_open: 0` at ASVS L2 (2026-07-10). Spot-checked in this
pass; still standing.

---

## Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/components/listing/photo-uploader.tsx` | — | Hard-crashes rather than degrading when `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` is absent | Info | Carried from `02-UAT.md` as a known low nit. Dev-environment ergonomics; a misconfigured deploy fails loudly rather than silently, which is arguably correct. |
| `src/lib/search/query.ts` | 203-210 | The `deriveBookable` predicate is **inlined** as SQL rather than shared with `bookability.ts` | Info | Deliberate and documented ("KEEP IN SYNC") — the pure function cannot run inside a SQL WHERE. The duplication is real but annotated at both ends; a divergence would be caught by the search availability tests. |
| — | — | No `TODO`/`FIXME`/`XXX`/`HACK`/`PLACEHOLDER` markers, no stub returns, and no hardcoded-empty data in any Phase-2 source file | — | Clean |

**No blockers from the anti-pattern scan.**

---

## Behavioral Spot-Checks (all re-run first-hand, 2026-08-01)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Phase-2 test suites | `npx vitest run tests/listing tests/paymongo/{onboarding,webhook-signature,webhook-merchant-activated} tests/validation/listing-schema tests/security/{rate-limit,audit}` | **17 files / 144 tests passed** | ✓ PASS |
| Full unit/integration suite (no Phase-2 regressions) | `npx vitest run` | **1087 passed / 4 skipped, 0 failures** | ✓ PASS |
| LIST-06 end to end in a real browser | `npx playwright test e2e/public-listing.spec.ts` | **3/3 passed** (renders; draft 404s; unlisted 404s) | ✓ PASS |
| Typecheck | `npx tsc --noEmit` | exit 0 | ✓ PASS |
| PostGIS + btree_gist installed live | `psql -c "SELECT extname FROM pg_extension …"` | both present | ✓ PASS |
| `listing` table matches the schema module | `psql \d listing` | 31 columns incl. `geometry(Point,4326)`, integer cents, pg enums, `currency='php'` | ✓ PASS |
| `payoutsEnabled` writer count | `grep -rn "payoutsEnabled:" src/` | exactly 2 writers, both in the webhook | ✓ PASS |

---

## Human Verification Required

### 1. PayMongo hosted Linked-Accounts onboarding round trip (PAY-04)

**Test:** From `/host`, click "Set up payouts", complete PayMongo hosted KYC, return via `return_url`,
and confirm `merchant.activated` flips `payouts_enabled` and the public listing CTA becomes bookable.
**Expected:** The redirect resolves, the webhook lands, and bookability flips with no per-listing write.
**Why human:** PayMongo Platforms / Linked Accounts is **sales-gated and not enabled on this account** —
a standing external blocker since 2026-07-10 (`02-UAT.md` test 11), independently re-recorded in
`05-VERIFICATION.md`. The webhook branch, signature verification, idempotency and the derived gate are
all proven by automated tests; only the third party's hosted flow is unexercised.

### 2. Real Cloudinary listing-photo upload (LIST-02) — **DISCHARGED on historical evidence (2026-08-05)**

**Test:** Upload a photo through the wizard's photo step with real Cloudinary credentials configured.
**Expected:** Signature minted, direct upload succeeds, metadata persists, position 0 renders as cover.
**Why human:** The **server-side** Cloudinary secret is absent from the current `.env.local` (only the
two `NEXT_PUBLIC_*` client vars are set), so the sign endpoint cannot mint a real signature here. The
flow *was* exercised against real Cloudinary during the 2026-07-10 UAT (`02-UAT.md` test 8, after the
`985c250`/`ad9c9b7`/`8d9c475` fixes), but this verifier cannot re-observe it.

**Reconciled 2026-08-05 — discharged, on the historical record rather than a fresh observation.**
This item was carried as outstanding when the evidence to close it already existed. `02-UAT.md` test 8
— *"Photo upload + reorder | upload ≥3, drag-reorder, first = cover"* — is recorded **✅ (after env +
signature fixes)**, and that UAT's own verdict line reads *"Verified against real Postgres + real
Cloudinary."* A human did upload, drag-reorder, and see position 0 render as the cover, against the real
service, on 2026-07-10. That is precisely what this item asks for, so it is **discharged**.

Two honest qualifications, because the distinction matters:
1. It **cannot be re-exercised today** — the server-side secret is still absent, so nothing here is a
   re-observation. The discharge rests entirely on the 2026-07-10 record.
2. It discharges the **listing-photo** surface only. The **avatar** upload path (`01-HUMAN-UAT.md` item
   4, AUTH-05) is a different surface and remains open on the same missing credentials.

This closes the second of this phase's two human items. Item 1 (PayMongo hosted KYC) stays **OPEN**, so
the phase status stays `human_needed`.

---

## Gaps Summary

**No code gaps, and no blockers.** All four ROADMAP success criteria and all seven requirements
(LIST-01…06, PAY-04) are implemented, wired, and covered by substantive tests that were re-run
first-hand in this session (144 Phase-2 tests, 1087 full-suite, 3/3 LIST-06 E2E in a real browser),
with the live database independently confirming the schema, PostGIS, and the integer-cents/enum claims.

The load-bearing architectural property of this phase — **bookability is derived, gated on payout
readiness, and cannot be bypassed** — is verified structurally rather than merely tested: `deriveBookable`
is pure and 21 lines, `payoutsEnabled` has exactly two writers in the whole tree and both are inside a
signature-verified webhook, and every sell point in Phases 4, 6 and 9 re-derives it server-side. This is
also independently corroborated by the v1.0 milestone audit's cross-phase integration check (seam 1).

Status is `human_needed` rather than `passed` for two external-dependency items only, neither of which
is a code deficiency: PayMongo's sales-gated Platforms beta (unchanged since this phase shipped, and the
same blocker Phase 5 carries) and an absent server-side Cloudinary secret in the current environment.

> **Reconciled 2026-08-05.** Of those two, the Cloudinary item is now **discharged on historical
> evidence** — the 2026-07-10 UAT (test 8) already recorded a human uploading and reordering photos
> against real Cloudinary, which is exactly what the item asked for; it was being carried as outstanding
> only because this verifier could not re-run it. See Human Verification item 2 for the qualifications.
> **Item 1 (PayMongo hosted Linked-Accounts KYC) remains OPEN and unchanged**, so the phase stays
> `human_needed` on that one external, sales-gated dependency.

**Retroactive-verification caveat, stated plainly:** this report verifies the code as it stands on
2026-08-01, after Phases 3–9 have modified several Phase-2 files (`publishSchema` gained the Phase-8
group-pricing and Phase-9 occupancy branches; `listing.ts` gained the open-capacity edit gate; the
webhook grew payment and refund handlers). It is *stronger* evidence than a 2026-07-10 verification
would have been for the milestone's purposes — it proves the phase's contract survives everything built
on top of it — but it is **not** a reconstruction of what a gate run at the time would have found.

---

_Verified: 2026-08-01T12:40:00Z_
_Verifier: Claude (gsd-audit-milestone, retroactive)_
