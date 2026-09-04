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

### Tier 1 — ✅ **CLOSED** by quick task **260806-gwt** (2026-08-06)

**All 6 sites converted. No Tier-1 window is a calendar literal any more** — every window handed to
`createPendingHold` / `placeHold` is derived from real `now()` at run time through the shared
`tests/helpers/dates.ts` (`venueWindow` + the `assertBookableWindow` fixture self-check). The 2026-09-01
double fuse, and the four behind it, cannot fire.

The original inventory is kept below as the historical record, with what each site derives from now.

A pinned window handed to `createPendingHold` / `placeHold`, whose SQL lead-time guard
(`MIN_LEAD_INSTANT_MINUTES` / `MIN_LEAD_REQUEST_HOURS`) refuses it once real time passes it.
**6 sites across 5 files.**

| # | file:line | pinned window | goes red on | now derives from |
|---|-----------|---------------|-------------|------------------|
| 1 | `tests/booking/pending-hold.test.ts:34-35` | `2026-09-01T02:00Z` → `03:00Z` | ~~2026-09-01~~ | `venueWindow({ hour: 10, minDaysOut: 3 })` → `W` |
| 2 | `tests/booking/state-machine.test.ts:57-58` | `2026-09-01T02:00Z` → `03:00Z` | ~~2026-09-01~~ | `venueWindow({ hour: 10, minDaysOut: 3 })` → `W` |
| 3 | `tests/booking/request-lifecycle.test.ts:120-121` | `2026-10-01T02:00Z` → `03:00Z` | ~~2026-10-01~~ | `venueWindow({ hour: 10, minDaysOut: 3 })` → `HOLD_W` |
| 4 | `tests/booking/request-expiry.test.ts:69-70, 77-78` | `2026-11-01T*` (hour-templated) | ~~2026-11-01~~ | `venueWindow({ hour: 2, minDaysOut: 3 })` → `BASE`; `windowAt(h)` templates off `BASE.day` in venue-local hours (still six disjoint windows) |
| 5 | `tests/booking/request-lifecycle.test.ts:628-629` | `2026-11-02T02:00Z` → `03:00Z` | ~~2026-11-02~~ | `venueWindow({ hour: 10, minDaysOut: 5 })` → `HR_W` (`minDaysOut: 5` is load-bearing: `approveRequest`'s `LEAST(now()+12h, starts_at)` cap needs `HR_START > now()+11h`) |
| 6 | `tests/booking/notify-emission.test.ts:505-506` | `2027-03-01T02:00Z` → `03:00Z` | ~~2027-03-01~~ | `venueWindow({ hour: 10, minDaysOut: 3 })` → `W` |

Note #1 and #2 share a date: **2026-09-01 breaks two files at once**, ~4 weeks out. That was the
nearest fuse and the one worth pre-empting. (It was pre-empted with ~26 days to spare.)

Venue-local hour 10 **is** `02:00Z` in Asia/Manila, so every converted window is venue-locally identical
to the literal it replaced — nothing about what these tests exercise changed.

**Anti-vacuity:** each of the six files carries a NEW dated mutation record in its header with verbatim
RED output, from a mutation targeting what THAT file uniquely proves on a case that runs through the
derived window. `hold-expiry.test.ts` re-ran its original MUTATION A to prove the extraction into the
shared helper was faithful rather than a hollowing.

### Tier 2 — **STILL OPEN, and still deliberately unfixed** (literals already in the past; green today, latent)

Re-confirmed 2026-08-06 (260806-gwt): these were NOT converted, on purpose. Each file's injected `NOW` is
pinned **right beside** its pinned day, so the pair stays internally consistent forever and the files are
harmless as written — `getAvailability` reasons entirely off the injected clock and never touches
Postgres `now()`. Converting them would be churn on working tests.

`tests/helpers/dates.ts` now makes a Tier-2 conversion **trivial** if one is ever wanted. **The trigger is
not a calendar date** — it is one of these files gaining a write path: the moment a
`createPendingHold` / `placeHold` call appears in any of them, that file reproduces DEF-IR9-01 immediately
and with no warning, and the fix is a one-line `venueWindow(...)` + `assertBookableWindow(...)`.

`tests/booking/request-lifecycle.test.ts` is the live illustration: it now holds **both** tiers side by
side, its family-A read-model anchor pinned and its families B/HR derived, with a header note saying not
to "unify" them.

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

### The landed pattern (Tier 1 used this; anything new should too)

**`tests/helpers/dates.ts`** — the single source of clock-relative fixture windows, landed by 260806-gwt.
It carries the full two-clocks rationale, so nobody has to re-derive why a pinned window is a time bomb.

```ts
import { venueWindow, assertBookableWindow } from "../helpers/dates";

const W = venueWindow({ hour: 10, minDaysOut: 3 }); // venue-local 10:00 == 02:00Z in Asia/Manila
const START = W.startUtc;
const END = W.endUtc;

beforeAll(() => { assertBookableWindow(W); /* ...rest of setup */ });
```

Rules that came out of the sweep and are worth keeping:
- **Pass `weekday` ONLY if the file seeds `operating_hours`** — verify with
  `grep -n "operatingHours\|operating_hours" <file>` rather than assuming. Neither `placeHold` nor
  `createPendingHold` consults operating hours on the write path, so pinning a weekday on a pure hold
  fixture is noise. (This premise was stated wrongly once during planning and caught in review —
  `request-lifecycle.test.ts` DOES seed hours, just not on its Tier-1 sites. Check, don't recall.)
- **`minDaysOut` can be load-bearing.** `approveRequest` caps `expires_at` at
  `LEAST(now() + APPROVAL_PAYMENT_WINDOW_HOURS, starts_at)`, so any case asserting the full 12h window
  needs its start more than 11h out. State the reason in the comment when it is.
- **Hour-templated fixtures keep templating** — rebase the template on `BASE.day` via `instantAt`, so the
  per-booking window distinctness that keeps seeded rows off `booking_no_overlap` is preserved.
- **Prove the conversion with a mutation.** A converted file that quietly stopped asserting is strictly
  worse than a test that fails on a known date.

Predecessors this generalises: `tests/booking/open-capacity-hold.test.ts:97-128` (`daysOut(n)`) and
`tests/booking/hold-expiry.test.ts` (the TZDate + `beforeAll` self-check version this was lifted from).

Tier 2 needs no code change — only this discipline if those files ever gain a write path.
