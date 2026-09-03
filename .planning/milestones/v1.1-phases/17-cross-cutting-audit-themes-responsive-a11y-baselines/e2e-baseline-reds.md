# Phase 17 — the declared e2e baseline red set

**Base commit: `e439bf9`** (`e439bf95f75342100e0fd2ff5909d5b6a389d014`, branch `dev`, measured 2026-08-29).
**Scope: the `chromium` Playwright project only** — 281 tests in 33 files, confirmed by
`npx playwright test --project=chromium --list`.

## The contract

This file is the **denominator** for every Phase-17 e2e verdict.

- A failure that **is** on this list is **not** a Phase-17 regression. It was already red before the
  phase started, it has an owner elsewhere, and no Phase-17 assertion may be weakened to make it go away.
- A failure that is **not** on this list **is** a Phase-17 regression, and it is the phase's to explain.

> ⚠ **Do NOT add a row to this file to make a Phase-17 run read green.** A new red is a finding, not a
> denominator entry. This file is amended in exactly one way: it is re-measured at a named commit, and
> the new commit SHA replaces the one at the top in the same edit. Anything else turns the one artifact
> that makes a verdict readable into the thing that hides it.

## How this was measured

`npm run db:up` first (`fitout-db-1` up; `docker ps` non-empty), then `next dev` killed and `.next/`
deleted before the first run — that ordering is recorded twice in this repo (commit `6123766`, and again
inside `[16-D6]`'s own triage note) because a stale `.next` reclassified a failure during that triage.

Then **every one of the 33 spec files was run alone**, in its own `npx playwright test` invocation, at
`--workers=1`, against one long-lived dev server:

```
npx playwright test e2e/<file>.spec.ts --project=chromium --workers=1 --reporter=list
```

Per-file is not a convenience. A single full-suite invocation mixes two different populations — real
reds and shared-fixture races — into one unreadable list, which is the trap `17-RESEARCH.md` Pitfall 9
names. Every row below that reproduces was seen **twice**, in two separate invocations.

`playwright.config.ts` builds no `visual` project on `win32`, so nothing here speaks for GATE-01.

---

## The denominator — 10 rows

| # | Spec : line | Test | Signature (one line) | Class | Owner |
|---|---|---|---|---|---|
| 1 | `cancel.spec.ts:224` | re-opening the review screen for an already-cancelled booking redirects, never re-refunds | `getByText(/refund on its way/i)` never visible at `:241`; the redirect itself worked | reproducible | `[16-D6]` item 2 |
| 2 | `confirmation-decay.spec.ts:151` | the moment is a full screen, the detail starts below the fold, and a reload shows the ordinary page | `court · 375x667`: the moment measures **0px** against a `>= 603` floor at `:193` | reproducible | `[16-D6]` item 3 |
| 3 | `open-capacity.spec.ts:407` | 1 · the public drop-in page asks for a DAY, and no hour is offered anywhere on it | 90s timeout inside `pickDay` (`:370`) waiting for the enabled `September 1, 2026` day cell | undeclared | this file (new at `e439bf9`) |
| 4 | `hold-countdown.spec.ts:292` | `${theme}` · the header and countdown boxes are identical in all four states | timeout / detached frame under concurrent workers; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |
| 5 | `price-one-fact.spec.ts:313` | `${theme}` · both totals resolve to identical computed type | timeout / detached frame under concurrent workers; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |
| 6 | `reduced-motion.spec.ts:368` | with prefers-reduced-motion: `${reducedMotion}`, the grid declares no animation | intercepted click / bounce to `/` under concurrent workers; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |
| 7 | `shell.spec.ts:291` | `${composition.name}` · `${theme}` · the header and brand boxes are byte-identical | repeated bounce to `/` inside `helpers/booker-seed.ts:365-367`; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |
| 8 | `shell.spec.ts:1221` | a live checkout: 0 header anchors, 0 footers, and EXACTLY ONE anchor in `<main>` | same seed bounce; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |
| 9 | `shell.spec.ts:1302` | the host header paints a different surface and carries a different wordmark | same seed bounce; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |
| 10 | `stale-session-selfheal.spec.ts:90` | a stale session cookie self-heals: /login stays reachable after a password reset (QK-IR9) | timeout under concurrent workers; passes alone | contention | `[16-D6]` env set, `[16-D2]` class |

Rows 4–10 are the **seven** entries `[16-D6]`'s 2026-08-26 triage classified as environment/shared-fixture
races, carried here by reference. Every one of them **passed when run alone at `--workers=1` on this tree**
— which is the evidence for that class, not a contradiction of it. They are listed because a Phase-17 run
that happens to use several workers will meet them, and meeting one must not cost anybody an investigation.

### Cases blocked behind rows 2 and 3, not failing on their own

Both `confirmation-decay.spec.ts` (`:113`) and `open-capacity.spec.ts` (`:274`) are
`test.describe.configure({ mode: "serial" })`, so the first failure stops the file. **Three** cases in
`confirmation-decay.spec.ts` (`:254`, and `:392` in both themes) and **five** in `open-capacity.spec.ts`
(`:490`, `:553`, `:606`, `:658`, `:706`) report *did not run*. They are blocked, and no verdict — green or
red — may be read off them while rows 2 and 3 stand.

---

## Entries carried in the prior findings that did NOT reproduce at `e439bf9`

These are recorded so nobody re-derives them, and they are **deliberately outside the denominator above**.
Putting a passing test in the denominator is the more dangerous of the two mistakes: it pre-excuses a
future real regression on that exact line.

| Spec : line | Test | Prior claim | Measured at `e439bf9` | Class |
|---|---|---|---|---|
| `public-listing.spec.ts:385` | a draft listing 404s to the public | `[16-D6]` item 1: returns **200** instead of 404 | **8 passed**, twice, alone at `--workers=1` | did-not-reproduce |
| `availability.spec.ts:160` | bookable listing: venue-tz note, unselectable booked/blocked hours, adjacent range fill + full-day clear | `[260824-dbc]`: standing red | **4 passed**, twice, alone at `--workers=1` | did-not-reproduce |
| `availability.spec.ts:203` | range-fill: non-adjacent clean fill selects the whole run, then a 3rd click re-anchors | `[260824-dbc]`: standing red | as above | did-not-reproduce |
| `availability.spec.ts:236` | range-fill: a gap truncates the run to before the booked hour with a soft hint | `[260824-dbc]`: standing red | as above | did-not-reproduce |
| `availability.spec.ts:261` | published-but-not-payable listing: calendar renders read-only, slots not selectable | `[260824-dbc]`: the one *declared* standing red, and explicitly **not this phase's to close** | as above | did-not-reproduce |

`[260824-dbc]` itself records that this file's failing set *"is not stable run to run, which is its own
signal"* — `:261` passed in the very run that first surfaced the other three. Four green runs on one day do
not retire that instability; they only mean **`availability.spec.ts` is not in Phase 17's denominator**. If
it goes red during Phase 17, check it alone before attributing it to anything.

### The soft-404 is escalate-class, and stays escalate-class

`[16-D6]` item 1 diagnosed `public-listing.spec.ts:385` as a route-wide **soft-404**:
`src/app/listings/[id]/(detail)/loading.tsx` creates an implicit Suspense boundary, so Next flushes the
shell — committing `200` — before `notFound()` runs. It is **not** an authorisation hole (the body is the
not-found page and the draft's title is absent), and the same shape was predicted for **every**
`loading.tsx`-bearing route in `src/app` (~10 of them; 21 `loading.tsx` files on disk).

**It did not reproduce here, and that changes nothing about the disposition.** Neither the route directory
nor the Next version moved since the triage commit `d24b212` (`git log d24b212..HEAD -- 'src/app/listings/[id]/(detail)/'`
is empty; `next` is 16.2.7 in both), so a green today is an *environment* result, not a fix — and
`[16-D6]` already records that the production behaviour was **never measured** (`17-RESEARCH.md`
Assumption A6).

Per `17-RESEARCH.md` Open Question 3, this stays **escalate-class**: it is product/SEO behaviour across
~10 routes, the cheapest correct fix touches `loading.tsx` semantics, and absorbing it into an audit phase
is precisely the rewrite-inside-an-audit move D-199/D-200 exist to prevent. **Phase 17 does not fix it.**
Plan 17-13 carries it into `deferred-items.md`.

---

## Row 3 in detail — the one entry that is new at this commit

`open-capacity.spec.ts:407` is **not** in `[16-D6]`'s ten. It failed twice here, alone, at `--workers=1`,
with a 90s timeout inside `pickDay` (`:364-371`) waiting for an enabled, in-month `September 1, 2026` cell.

**The branch that differs between the triage date and today is the calendar's month hop, and it is
derived from the source rather than isolated by a control run.** The file pins its two fixture dates with

```ts
let offset = 3;
while (dayAt(offset).month !== dayAt(offset + 2).month) offset++;   // :126-127
const spotsDate = dayAt(offset);                                     // :129
const crossesMonth = spotsDate.month !== initMonth || …;             // :132
```

and `showMonthOf` (`:348-357`) navigates the grid **only** when `crossesMonth` is true. On 2026-08-26 —
the date of `[16-D6]`'s full-suite run, in which `open-capacity.spec.ts` did not appear among the ten
failures — `dayAt(3)` was 2026-08-29 and `crossesMonth` was **false**. On 2026-08-29 `dayAt(3)` is
2026-09-01 and `crossesMonth` is **true**. That is the only input that moved.

Stated plainly so the next reader does not over-read it: the *correlation* is measured, the *causation*
is inferred from the source. Whoever picks this up should confirm it by pinning the clock rather than by
agreeing with this paragraph. It is **not** Phase 17's by authorship — `open-capacity.spec.ts` was last
touched in Phase 9 and Phase 17 has changed no product code at the time this file was written — and it is
**not** Phase 17's to fix.

---

## What passes, so the denominator has a numerator

Every other spec file was green when run alone at `--workers=1` on this tree. The full per-file result:

| Result | Files |
|---|---|
| green alone | `auth-keyboard` · `availability` · `avatar-crop` · `calendar-hit-area` · `collision-in-place` · `error-leak` · `hold-countdown` · `host-dashboard` · `host-headings` · `host-inbox-hierarchy` · `login-persistence` · `mobile-booker-path` · `mode-switch` · `overflow-320` · `password-reset` · `photo-lightbox` · `price-one-fact` · `price-parity` · `public-listing` · `receipt-access` · `receipt-parity` · `receipt-print` · `reduced-motion` · `scroll-area-overflow` · `search-and-book` · `shell` · `skeleton-geometry` · `stale-session-selfheal` · `tabular-figures` · `zero-result-relax` (30 files) |
| red alone | `cancel` · `confirmation-decay` · `open-capacity` (3 files) |

`overflow-320.spec.ts` reports 15 skips and `shell.spec.ts` 1 — both are the specs' own declared skips and
neither is a failure.

---

*Phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines · plan 17-01*
*Measured: 2026-08-29 at `e439bf9`*
