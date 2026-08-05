# Deferred items — quick task 260805-nb7

Out of scope for this task (which fixed DEF-IR9-01 in `tests/booking/hold-expiry.test.ts` only).
**Logged, deliberately NOT fixed.**

## Sibling date time bombs

Scanned: all of `tests/` and `e2e/` for hardcoded `20NN-MM-DD` calendar literals.
`e2e/` is **clean** — zero hardcoded date literals.

The failure mode is specific, so the list is tiered by it. A hardcoded date is only a *time bomb*
when it is fed to a code path whose guard is evaluated against **Postgres `now()`** — the JS clock
can be frozen (`vi.setSystemTime`, an injected `now` param), the DB clock cannot. That is exactly
what broke `hold-expiry.test.ts`: `createPendingHold`'s D-96 lead-time guard is SQL, not JS.

### Tier 1 — WILL go red on a known date (same shape as DEF-IR9-01)

A pinned window handed to `createPendingHold` / `placeHold`, whose SQL lead-time guard
(`MIN_LEAD_INSTANT_MINUTES` / `MIN_LEAD_REQUEST_HOURS`) refuses it once real time passes it.
**6 sites across 5 files.**

| # | file:line | pinned window | goes red on |
|---|-----------|---------------|-------------|
| 1 | `tests/booking/pending-hold.test.ts:34-35` | `2026-09-01T02:00Z` → `03:00Z` | 2026-09-01 |
| 2 | `tests/booking/state-machine.test.ts:57-58` | `2026-09-01T02:00Z` → `03:00Z` | 2026-09-01 |
| 3 | `tests/booking/request-lifecycle.test.ts:120-121` | `2026-10-01T02:00Z` → `03:00Z` | 2026-10-01 |
| 4 | `tests/booking/request-expiry.test.ts:69-70, 77-78` | `2026-11-01T*` (hour-templated) | 2026-11-01 |
| 5 | `tests/booking/request-lifecycle.test.ts:628-629` | `2026-11-02T02:00Z` → `03:00Z` | 2026-11-02 |
| 6 | `tests/booking/notify-emission.test.ts:505-506` | `2027-03-01T02:00Z` → `03:00Z` | 2027-03-01 |

Note #1 and #2 share a date: **2026-09-01 breaks two files at once**, ~4 weeks out. That is the
nearest fuse and the one worth pre-empting.

### Tier 2 — literals ALREADY in the past; green today, latent

Read-model-only fixtures. They pass because `getAvailability` takes an **injectable** `now` and the
pinned `NOW` is pinned right alongside the pinned day, so the pair stays internally consistent
forever. Harmless as written — but one added `createPendingHold`/`placeHold` call in any of these
files reproduces DEF-IR9-01 immediately, with no warning. **4 files.**

- `tests/availability/read-model.test.ts:23, 28-30` — `NOW` 2026-07-15 / slot `2026-08-02T22:00Z`
- `tests/search/availability-filter.test.ts:23-24, 31` — `DATE` 2026-08-03, `NOW` 2026-07-15
- `tests/search/open-capacity-search.test.ts:99-101, 115` — `DATE` 2026-08-03, `CLOSED_DATE` 2026-08-04, `NOW` 2026-07-15
- `tests/booking/request-lifecycle.test.ts:114-117` — `NOW` 2026-07-15 / slot `2026-08-02T22:00Z`
  (this file therefore appears in **both** tiers: its read-model anchor is Tier 2, its hold windows are Tier 1)

### Tier 3 — benign, do not "fix"

Pinned dates with no `now()`-evaluated guard anywhere on the path. Listed so a future sweep does not
re-litigate them:

- `tests/availability/exclusion-race.test.ts:86-133` — raw `INSERT`s proving the GiST EXCLUDE. The
  constraint has **no time awareness** at all (that is the whole point of the D-48 sweep), so these
  cannot rot.
- `tests/availability/blocks.test.ts:99-197` — `availability_block` CRUD + tz-conversion assertions;
  the expected instants are the *subject* of the test.
- `tests/availability/units.test.ts:21-24` — `createBooking` (the dormant auto-commit path); no lead guard.
- `tests/booking/service-fee-hold.test.ts:269-270` — a pure `quoteWindow` call, no DB.
- `tests/validation/booking-schemas.test.ts` (~10 sites) — Zod *shape* assertions; `2026-02-31` is
  deliberately an invalid calendar date.
- Frozen-clock tests (`tests/security/rate-limit*.test.ts`, `tests/profile/profile.test.ts`) — these
  drive `vi.setSystemTime`, so the literal IS the clock.

**Counts:** 6 Tier-1 sites / 5 files · 4 Tier-2 files · ~6 Tier-3 groups. `e2e/` clean.

### Suggested fix (when someone picks this up)

The pattern is already in the repo, twice over, and the two are complementary:

- `tests/booking/open-capacity-hold.test.ts:97-128` — `daysOut(n)` clock-relative helpers with the
  rationale stated in its header ("EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal").
- `tests/booking/hold-expiry.test.ts` (this task) — the same idea via **TZDate**, plus a `beforeAll`
  fixture self-check that asserts the derived window actually clears the guards it claims to.

Tier 1 is a mechanical port. Tier 2 needs no code change — only the Tier-1 discipline if those files
ever gain a write path.
