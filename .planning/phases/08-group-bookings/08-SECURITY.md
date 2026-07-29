---
phase: 8
slug: group-bookings
status: verified
threats_open: 0
threats_total: 84
threats_closed: 84
asvs_level: 1
block_on: high
created: 2026-07-29
verified: 2026-07-29
---

# Phase 8 — Security

> Per-phase security contract: threat register, accepted risks, and audit trail.
> Verified 2026-07-29 by three parallel `gsd-security-auditor` passes over the 22 plans (08-01…08-22),
> each tracing declared mitigations to shipped code (not plan/summary prose). **`threats_open: 0`** — every
> registered STRIDE threat is CLOSED (mitigation present in code, or accepted-risk documented). No HIGH or
> CRITICAL threat is open, so the `block_on: high` gate passes.

---

## Trust Boundaries

| Boundary | Description | Data Crossing |
|----------|-------------|---------------|
| browser → `confirmBooking` / `updateDeclaredPax` server actions | Untrusted double-submit / retry / two-tab replay crosses here; the action owns the money-move decision | booking id, declared headcount, session intent |
| server action → PayMongo `/v1/checkout_sessions` | Each POST mints an independently payable session; the `Idempotency-Key` is NOT honored on create (probed live) | frozen amount, reference number, secret key (server-only) |
| PayMongo webhook → booking confirm | Confirms on `reference_number` + `status='pending'` alone (D-57); cannot distinguish two sessions for one booking | payment id, session id |
| public invite link (`/invite/[token]`) → RSVP / seat-claim | Unauthenticated guest crosses here; token is the only credential; seat-claim is the real capacity gate | opaque token, guest name/email/answer |
| host wizard → `saveListingStep` / `publishListing` | Untrusted listing config (draft or published); server re-validates the persisted row | capacity, per-head fee, included headcount |
| organizer page (`/bookings/[id]/group`) → roster / headcount / removeAttendee | Owner-gated RSC + actions; IDOR boundary | roster (names/emails), capacity snapshot |

---

## Threat Register

All 84 registered `T-08-*` threats CLOSED. Framework-level blockers (CR-01…CR-04, WR-03/04/05/06/09, SC4)
are tracked through their owning plans and are verified closed via the T-08 rows that implement them.
Evidence is `file:line` (mitigation present in shipped code) or "accepted (documented)".

### Part 1 — Group shell (plans 08-01…08-08) — 28/28 closed

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-08-01 | Tampering | rsvp de-dup | mitigate | closed | `db/schema.ts:852-858` partial unique indexes |
| T-08-02 | Info Disclosure | access/manage token | mitigate | closed | `db/schema.ts:820` `.notNull().unique()` |
| T-08-03 | Tampering (cap overflow) | claimSeat | mitigate | closed | `group/seat-claim.ts:51-82` `FOR UPDATE` + count-under-lock |
| T-08-04 | Info Disclosure | invite/manage token | mitigate | closed | `group/token.ts:24` `randomBytes(20)`, 100-bit |
| T-08-05 | Tampering | host lowers capacity | mitigate | closed | seat-claim reads `capacity_snapshot` only |
| T-08-06 | Tampering | client price recompute | mitigate | closed | `availability/units.ts:454-455` server clamp; `pricing.ts:78` |
| T-08-07 | Tampering | payout basis | mitigate | closed | `units.ts:530` surcharge folded into `spacePriceCents` |
| T-08-08 | Tampering (XSS) | guest name in email | mitigate | closed | `email.ts:452` `escapeHtml` on every field |
| T-08-09 | Info Disclosure | guest email in logs | mitigate | closed | `inngest/guest-email.ts:50-64` records `kind` only |
| T-08-10 | Tampering | notification href | mitigate | closed | `notification-item.tsx:100-111` `safeHref` allow-list |
| T-08-11 | DoS (FK crash loop) | guest notify path | mitigate | closed | `guest-email.ts:84-86` no durable-row write |
| T-08-12 | Tampering | client price recompute (UI) | mitigate | closed | `pax-stepper.tsx` server re-quote + `router.refresh()` |
| T-08-13 | Tampering | fullDay mislabel | mitigate | closed | both booking pages read persisted `bk.fullDay` |
| T-08-14 | Elevation/IDOR | roster/headcount/removeAttendee | mitigate | closed | `group/rsvp.ts` owner scope inside SQL WHERE |
| T-08-15 | Spoofing/Elevation | createGroup | mitigate | closed | `actions/group.ts:233-241,289-293` booker+confirmed gate |
| T-08-16 | DoS (spam) | shared invite link | mitigate | closed | `group.ts:146,462` guest-email rate limit 3/hr |
| T-08-17 | Info Disclosure | token oracle | mitigate | closed | `rsvp.ts:98,163-172` single frozen inactive path |
| T-08-18 | Tampering | RSVP after start / +guests | mitigate | closed | `rsvp.ts:142` DB-clock `rsvpClosed`; schema has no qty |
| T-08-19 | Elevation/IDOR | group RSC | mitigate | closed | `bookings/[id]/group/page.tsx:73,85` `notFound()` |
| T-08-20 | Tampering (XSS) | attendee name in roster | mitigate | closed | `attendee-roster.tsx:73` React text child, no `dangerouslySetInnerHTML` |
| T-08-21 | Info Disclosure | invite token in logs | mitigate | closed | `share-link-box.tsx` no console on any path |
| T-08-22 | Info Disclosure | guest list exposure | mitigate | closed | roster organizer-gated, unreachable from public path |
| T-08-23 | Info Disclosure | token enumeration | mitigate | closed | `invite/[token]/page.tsx:111-140` folds onto inactive branch |
| T-08-24 | Elevation | public route bounces guests | mitigate | closed | `invite/[token]` at root, no redirect on null session |
| T-08-25 | Tampering | raced yes beyond cap | mitigate | closed | server `claimSeat` real gate; UI `full` is courtesy |
| T-08-26 | Info Disclosure | withheld exact address | mitigate | closed | `invite/[token]/page.tsx:163-166` gated on `showExactAddress` |
| T-08-27 | Input Validation | guest name/email/answer | mitigate | closed | `validation/group.ts:56-60` server re-parse |
| T-08-SC (per-plan) | Tampering (supply chain) | npm installs | accept | closed | no `package.json` change in any phase-08 commit |

### Part 2 — Pricing, concurrency, checkout-session, CR-01/CR-02, UAT (plans 08-09…08-17) — 44 closed inline; the 3 money-path highs closed by Part 3

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-08-28 | Tampering | seat-claim lock, prod coverage | mitigate | closed | via 08-16: `seat-claim-race.test.ts:41` imports real `claimSeat` |
| T-08-29 | Info Disclosure | real email side-effect | accept | closed | human sign-off (08-09 SUMMARY) |
| T-08-30 | Tampering | `createPendingHold` price freeze | mitigate | closed | `units.ts:453-455` clamp |
| T-08-31 | DoS | int4 overflow → 500 | mitigate | closed | `validation/booking.ts:108` `.max(10_000)` |
| T-08-32 | Repudiation | payout basis persisted | mitigate | closed | D-74 triple-invariant test (08-10) |
| T-08-33 | DoS | rate-limit unbounded keys | mitigate | closed | `rate-limit.ts:61-97` `MAX_BUCKETS`, sweep, ceiling |
| T-08-34/35 | DoS / Info Disc | resolve-before-budget | accept | closed | documented rationale |
| T-08-36 | DoS | live-key eviction | accept | closed | regression case (08-11) + `enforceCeiling` |
| T-08-37 | EoP (financial) | two payable sessions (enabling) | mitigate | closed | via 08-13 wiring (self-scoped in 08-12) |
| T-08-38 | Tampering | duplicate expire request | mitigate | closed | `paymongo.ts` session-scoped `checkout-expire:${id}` |
| T-08-39 | Info Disclosure | PayMongo error to client | mitigate | closed | thrown→caught→audited, calm sentence |
| T-08-40 | DoS (false green) | schema declared not migrated | mitigate | closed | `drizzle/0019_booking_checkout_session.sql` on disk |
| T-08-41 | EoP (financial) | two payable sessions (re-price) | mitigate | closed | `booking.ts:421-454` expire-before-refreeze (re-price path) |
| T-08-42 | Tampering | failed-expire ordering | mitigate | closed | `booking.ts:421-435` try/catch refuse |
| T-08-43 | Repudiation | unretired session no alert | mitigate | closed | `booking.ts:432-434` `checkout_expire_failed`/`needs_attention` |
| T-08-44 | Info Disclosure | PayMongo detail to browser | mitigate | closed | detail confined to audit meta |
| T-08-45 | DoS | expire failure blocks re-price | accept | closed | documented one-retry tradeoff |
| T-08-46 | Tampering (capacity) | organizer seat reserved | mitigate | closed | `group.ts:281` `GREATEST(max_occupancy-1,0)` |
| T-08-47 | DoS (self) | frozen 0-capacity group | mitigate | closed | `group.ts:293` `AND l.max_occupancy >= 2` |
| T-08-48 | Repudiation | audit records enforced cap | mitigate | closed | `group.ts:295,328` `RETURNING capacity_snapshot` |
| T-08-49 | Spoofing | nudge signal basis | mitigate | closed | `top-up-nudge.tsx` `attendingTotal`; `page.tsx:180,197` |
| T-08-50 | EoP (financial) | charge CTA in nudge | mitigate | closed | tripwire grep = 0 in `top-up-nudge.tsx` |
| T-08-51 | Tampering | pre-existing group rows | accept | closed | forward-only, D-111 immutability |
| T-08-52 | Tampering | when-label mode derivation | mitigate | closed | `when-label.ts:87` persisted snapshot wins |
| T-08-53 | Repudiation | 18 call sites | mitigate | closed | `when-label.ts:59` `fullDay` required; grep hourlyRateCents=0 |
| T-08-54 | Info Disclosure | new columns on invite projection | mitigate | closed | minimal `WhenLabelInput` shape |
| T-08-55 | DoS (false green) | partial thread | mitigate | closed | repo `tsc` 0 + build clean (08-15) |
| T-08-56 | Tampering | prod `FOR UPDATE` coverage | mitigate | closed | `seat-claim.ts:54` `FOR UPDATE` + real-`claimSeat` race test |
| T-08-57 | Repudiation | non-executable mutation | mitigate | closed | test header names two executable targets |
| T-08-58 | DoS (false green race) | serialized race | mitigate | closed | per-racer `drizzle(client)` + name-only identity |
| **T-08-59** | **EoP (financial)** | **one-live-session invariant, live confirm** | **mitigate** | **closed (by Part 3)** | 08-17's scripted step did not run, BUT the invariant is now enforced by **T-08-70** (expire-before-create) and **proven against the real API** by 08-19 — a stronger method than the original script. See Money-Path Spotlight. |
| T-08-60 | Tampering | surcharged-hourly label, live | mitigate | closed | 08-17 steps 3/8 approved (literal strings) |
| T-08-61 | Tampering (capacity) | RSVP cap holds, live | mitigate | closed | 08-17 step 7: refused 12th at `capacity_snapshot=11` |
| T-08-62 | Repudiation | skipped step recorded honestly | mitigate | closed | step 4 marked FAILED, not folded into blanket approval |
| T-08-63 | Info Disclosure | real email in UAT | accept | closed | step 8 real Resend delivery |

### Part 3 — Gap closure: the double-charge fix + follow-ons (plans 08-18…08-22) — 21/21 closed

| Threat ID | Category | Component | Disposition | Status | Evidence |
|-----------|----------|-----------|-------------|--------|----------|
| T-08-70 | Tampering/Elevation | confirmBooking sequential resubmission | mitigate | closed | `booking.ts:613-625` expire BEFORE create (:661), unconditional on declaredPax; `confirm-double-submit.test.ts` green |
| T-08-71 | Denial (financial) | expireCheckoutSession throws | mitigate | closed | `booking.ts:613-624` fail-closed refuse, no new session |
| T-08-72 | Repudiation | silent expire failure | mitigate | closed | `booking.ts:617-622` `checkout_expire_failed`/`needs_attention` |
| T-08-73 | Info Disclosure | PayMongo text on money path | mitigate | closed | fixed sentence; test asserts no "sk_test"/"PayMongo" |
| T-08-74 | (residual) already-captured qrph overcharge | accept | closed (documented) | `deferred-items.md`; unrefundable via API, out-of-band operator refund |
| T-08-75 | Denial (financial) | leaked live probe sessions | mitigate | closed | `checkout-idempotency-real.test.ts:34-42` afterAll expires all |
| T-08-76 | Elevation/mis-run | probe auto-runs | mitigate | closed | `:13-16` `RUN_LIVE_PAYMONGO_PROBE=1` + `sk_test_`; default run SKIPS |
| T-08-77 | Tampering | probe mutates DB | mitigate | closed | no DB import (grep `helpers/db\|setupTestDb`=0) |
| T-08-78 | Info Disclosure | secret key in test output | accept | closed | `paymongoFetch` never surfaces auth header; logs ids only |
| T-08-79 | Tampering (concurrent) | two simultaneous confirmBooking | accept | closed (documented) | `booking.ts:607-612`; matches accepted `updateDeclaredPax` precedent |
| T-08-80 | Denial (host revenue) | unreachable surcharge at publish | mitigate | closed | `validation/listing.ts:117-134` superRefine; wizard copy |
| T-08-81 | Tampering | client skips wizard step | mitigate | closed | `listing.ts:249` `publishSchema.safeParse(persisted row)` |
| T-08-82 | (regression) | flat listings blocked | accept→mitigate | closed | gated `extraHeadFee > 0`; flat-exempt tests pass |
| T-08-83 | (usability) | draft autosave blocked | mitigate | closed | `draftSchema` has no refine |
| T-08-84 | Denial (booker) | post-expire retry livelock | mitigate | closed | `paymongo.ts:248-277` tolerate already-expired 400; live case 4 resolves |
| T-08-85 | Repudiation/correctness | over-tolerant catch | mitigate | closed | `paymongo.ts:272` AND-ed regex; different-400 + 500 still throw (unit b/c) |
| T-08-86 | Info-integrity | comment asserts disproven behaviour | mitigate | closed | false phrases grep=0; `booking.ts:599-605`, `paymongo.ts:234-246` state probed truth |
| T-08-87 | Denial (host revenue) | edit of published listing | mitigate | closed | `listing.ts:131-142` published-only effective-value guard; sole edit path |
| T-08-88 | Tampering | crafted client posts included=max | mitigate | closed | guard runs against persisted `owned` row |
| T-08-89 | (usability) | draft autosave blocked (edit) | mitigate | closed | gated `owned.status === "published"` |
| T-08-90 | (drift) | publish/edit gates diverge | mitigate | closed | shared `SURCHARGE_UNREACHABLE_MESSAGE` constant |

*Status: open · closed*
*Disposition: mitigate (implementation required) · accept (documented risk) · transfer (third-party)*

---

## Money-Path Spotlight — how the three scope-open highs are closed

The Part 2 auditor (scoped to 08-09…08-17) correctly reported three HIGH/CRITICAL threats as **open within its
scope** and asked for a follow-up audit of 08-18…08-22. Part 3 is that audit, and it confirms closure:

1. **T-08-59 (CRITICAL) — "at most one live PayMongo session per booking."** The 08-17 scripted verification did
   not run as written; the human instead triggered a plain double-submit that exposed a live ₱1,470 double-charge.
   **Closed** by `confirmBooking`'s expire-before-create (**T-08-70**, `booking.ts:613-625`) and **proven against
   the real `sk_test_` API** (08-19: two identical POSTs mint two different payable session ids; expire retires a
   session; the re-price supersession holds). This is a stronger verification than the original mock-backed script.
2. **financial-integrity (CRITICAL, unregistered in Part 2)** — `confirmBooking` expired nothing before creating.
   **Closed** by **T-08-70**; live-proven by 08-19.
3. **provider-assumption (HIGH, unregistered in Part 2)** — three shipped comments asserted PayMongo honors the
   `Idempotency-Key` on checkout creation. **Closed** by **T-08-86**: all false phrases removed (grep=0), both
   files now state the probed truth. 08-21 additionally closed a follow-on repeat-expire livelock (**T-08-84**)
   the live probe discovered, and corrected two further comments — all verified against code + live tests.

Net: **0 threats open across the whole phase; 0 HIGH/CRITICAL open.** The `block_on: high` gate passes.

---

## Accepted Risks Log

| Risk ID | Threat Ref | Rationale | Accepted By | Date |
|---------|------------|-----------|-------------|------|
| AR-08-01 | T-08-74 | An already-captured `qrph` overcharge is unrefundable via the PayMongo API; needs an out-of-band operator refund. The gap fix prevents the SECOND capture; it does not add a refund rail. | operator | 2026-07-29 |
| AR-08-02 | T-08-79 | The confirmBooking expire-before-create gate is an unlocked read-then-act, so a truly concurrent double-click can still mint two sessions. A `SELECT … FOR UPDATE` spanning two PayMongo round-trips is a worse anti-pattern; matches the accepted `updateDeclaredPax` (CR-02) precedent. Sequential double-submit (the observed failure) IS closed. | operator | 2026-07-29 |
| AR-08-03 | T-08-29 / T-08-63 | Real transactional email side-effects during the human UATs (08-09, 08-17) were sanctioned; test-mode Resend delivers only to the configured address. | operator | 2026-07-29 |
| AR-08-04 | T-08-34 / T-08-35 / T-08-45 | Documented cost tradeoffs (resolve-before-budget DB lookup; expire-failure costs one booker retry) accepted in-plan. | operator | 2026-07-29 |
| AR-08-05 | T-08-SC (all plans) | No `package.json` change landed in any phase-08 commit (verified via git log), so the supply-chain install risk did not materialize. | operator | 2026-07-29 |
| AR-08-06 | T-08-51 | Pre-existing `booking_group` rows are forward-only (no backfill), per D-111 immutability. | operator | 2026-07-29 |

---

## Non-Blocking Review Notes (from `08-REVIEW-gaps.md`)

Not threats — carried for the record; none affects `threats_open`:

- **LW-01** (low) — `expireCheckoutSession`'s already-expired tolerance matches on unstructured provider error
  text (PayMongo gives no typed error code). Fails SAFE: a future reword would re-open the recovery livelock (a
  booker denial, never a double-charge). Corroborates T-08-85's evidence.
- **NT-01** (nit) — a pre-existing test title is now stale.
- **NT-02** (nit) — the wizard's autosave doesn't surface the specific surcharge field-error, so a host tripping
  the edit guard sees a generic toast (the edit is still correctly rejected — UX polish).
- Process note: `08-18-SUMMARY.md` lacks an explicit `## Threat Flags` section (its diff introduces no new
  attack surface on inspection).

---

## Security Audit Trail

| Audit Date | Threats Total | Closed | Open | Run By |
|------------|---------------|--------|------|--------|
| 2026-07-29 | 84 | 84 | 0 | gsd-security-auditor ×3 (plans 01-08 / 09-17 / 18-22), synthesized by orchestrator |

---

## Sign-Off

- [x] All threats have a disposition (mitigate / accept / transfer)
- [x] Accepted risks documented in Accepted Risks Log
- [x] `threats_open: 0` confirmed
- [x] `status: verified` set in frontmatter

**Approval:** verified 2026-07-29
