---
phase: 12-booker-path-search-listing-checkout
reviewed: 2026-08-18T19:18:42Z
depth: standard
files_reviewed: 91
files_reviewed_list:
  - .github/workflows/baselines.yml
  - e2e/calendar-hit-area.spec.ts
  - e2e/helpers/booker-seed.ts
  - e2e/helpers/overflow.ts
  - e2e/helpers/visual-drive.ts
  - e2e/hold-countdown.spec.ts
  - e2e/mobile-booker-path.spec.ts
  - e2e/open-capacity.spec.ts
  - e2e/overflow-320.spec.ts
  - e2e/photo-lightbox.spec.ts
  - e2e/price-one-fact.spec.ts
  - e2e/price-parity.spec.ts
  - e2e/public-listing.spec.ts
  - e2e/reduced-motion.spec.ts
  - e2e/search-and-book.spec.ts
  - e2e/shell.spec.ts
  - e2e/skeleton-geometry.spec.ts
  - e2e/visual/surfaces.spec.ts
  - e2e/visual/theme-swap.spec.ts
  - e2e/zero-result-relax.spec.ts
  - scripts/seed-baseline-fixtures.ts
  - scripts/verify-baselines-workflow.mjs
  - src/app/(host)/host/listings/page.tsx
  - src/app/(public)/page.tsx
  - src/app/dev/theme/page.tsx
  - src/app/globals.css
  - src/app/listings/[id]/(detail)/loading.tsx
  - src/app/listings/[id]/(detail)/page.tsx
  - src/app/listings/[id]/book/layout.tsx
  - src/app/listings/[id]/book/loading.tsx
  - src/app/listings/[id]/book/page.tsx
  - src/components/availability/availability-calendar.tsx
  - src/components/availability/booking-panel.tsx
  - src/components/availability/date-pass-picker.tsx
  - src/components/availability/slot-picker.tsx
  - src/components/availability/slot-selection.ts
  - src/components/booking/book-cta.tsx
  - src/components/booking/booking-sticky-bar.tsx
  - src/components/booking/checkout-sticky-bar.tsx
  - src/components/booking/hold-countdown.tsx
  - src/components/booking/hold-expired-state.tsx
  - src/components/booking/hold-provider.tsx
  - src/components/booking/hold-publisher.tsx
  - src/components/booking/price-breakdown.tsx
  - src/components/booking/price-disclosure.tsx
  - src/components/booking/rail-rate-headline.tsx
  - src/components/booking/reserve-actions.tsx
  - src/components/booking/reserve-view.tsx
  - src/components/booking/service-fee-popover.tsx
  - src/components/listing/host-block.tsx
  - src/components/listing/key-facts.tsx
  - src/components/listing/photo-gallery.tsx
  - src/components/listing/photo-lightbox.tsx
  - src/components/patterns/card-grid-skeleton.tsx
  - src/components/patterns/responsive-dialog.tsx
  - src/components/search/relax-band.tsx
  - src/components/search/search-bar.tsx
  - src/components/search/search-results.tsx
  - src/components/ui/collapsible.tsx
  - src/lib/booking/all-in-table.ts
  - src/lib/design/contrast-pairs.ts
  - src/lib/design/live-regions.ts
  - src/lib/design/measurements.ts
  - src/lib/design/selector-contract.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/search/query.ts
  - src/lib/search/relaxation.ts
  - src/lib/search/window-params.ts
  - src/lib/validation/booking.ts
  - tests/availability/availability-calendar.test.tsx
  - tests/availability/date-pass-picker.test.tsx
  - tests/booking/all-in-table.test.ts
  - tests/booking/hold-countdown.test.tsx
  - tests/booking/partial-grant-notice.test.tsx
  - tests/booking/reserve-actions.test.tsx
  - tests/design/brand-recipe.test.ts
  - tests/design/contrast.test.ts
  - tests/design/elevation-z.test.ts
  - tests/design/infra.test.ts
  - tests/design/leak.test.ts
  - tests/design/live-regions.test.tsx
  - tests/design/price-surface.test.ts
  - tests/design/sheet-absent.test.ts
  - tests/design/skeleton-a11y.test.tsx
  - tests/design/skeleton-measurements.test.ts
  - tests/listing/key-facts.test.tsx
  - tests/listing/photo-gallery.test.tsx
  - tests/search/relaxation-ladder.test.ts
  - tests/search/search-card-open.test.tsx
  - tests/search/search-results-states.test.tsx
  - tests/validation/search-window.test.ts
findings:
  critical: 1
  warning: 3
  info: 2
  total: 6
status: issues_found
fixed:
  applied: [CR-01, WR-01, WR-02, WR-03]
  out_of_scope: [IN-01, IN-02]
  remaining:
    critical: 0
    warning: 0
    info: 2
  fixed_at: 2026-08-19
  commits:
    CR-01: ceccc55
    WR-01: fd9d82d
    WR-02: 2b02f99
    WR-03: cafc5bb
---

# Phase 12: Code Review Report

**Reviewed:** 2026-08-18T19:18:42Z
**Depth:** standard
**Files Reviewed:** 91 (full pattern-matching sweep on all 91; deep per-file read on ~35 money/correctness-path files; see "Deprioritised" section for the rest)
**Status:** issues_found

## Summary

This phase's source is unusually heavily annotated — nearly every file carries multi-paragraph
rationale blocks for decisions already made, several of which explicitly assert accessibility or
correctness properties as "load-bearing" and back them with test-suite line references. That density
made the review slower but also made one class of defect easy to catch: **claims made in comments
that the code does not actually implement.** The most serious finding below (CR-01) is exactly that
shape — three files and the project's own live-region registry assert that a focus-move happens on
hold expiry, and it does not exist anywhere in the tree.

I traced the money path in depth: `all-in-table.ts` → `PriceBreakdown` → `ReserveActions` →
`confirmBooking`, the hold lifecycle (`HoldProvider`/`HoldPublisher`/`HoldCountdown`), the two-stage
search query (`query.ts`) and the STATE-03 relaxation ladder (`relaxation.ts`, `(public)/page.tsx`,
`relax-band.tsx`, `search-bar.tsx`). I did not find a reintroduced check-then-insert race, a
client-trusted price/time, or an injection vector — the exclusion-constraint discipline and the
server-only money-computation guard (GATE-05) both appear to hold structurally, matching what the
project's own comments claim. What I did find is one real accessibility/correctness defect on the
checkout path that the existing test gates cannot see (they scan text, not runtime behaviour), one
UX-honesty bug in the search relaxation ladder's error path, and a couple of smaller timing/duplication
issues.

## Critical Issues

### CR-01: Hold-expiry focus move is documented as load-bearing and does not exist

**File:** `src/components/booking/hold-expired-state.tsx:17-20`, `src/components/booking/reserve-view.tsx` (whole file), `src/components/booking/hold-countdown.tsx:33`, `src/lib/design/live-regions.ts:649-669`

**Issue:** Three separate files assert, in comments treated as part of the accessibility contract, that
when a booker's hold expires and `ReserveView` swaps the page to `HoldExpiredState`, **focus is
programmatically moved to the primary recovery CTA**:

- `hold-expired-state.tsx:17-20`: *"the parent moves focus to the primary recovery CTA... That focus
  move is not a nicety here — it is the half of the pair that earns dropping the interrupting level,
  and removing it would make this comment false."*
- `hold-countdown.tsx:33`: *"`HoldExpiredState`, whose `role="status"` region announces the expiry and
  which also moves focus"*
- `live-regions.ts:649-669` (the project's own GATE-03 live-region registry, used to justify banning
  `aria-live="assertive"` on this route under "Rule 7"): *"the parent moves focus to the primary
  recovery CTA, which is what makes the event impossible to miss and simultaneously puts the keyboard
  user on the way out... removing the focus move would make this row's argument false."*

I read the actual implementation. `ReserveView` (the only consumer of `HoldExpiredState` on this
route, `reserve-view.tsx:73`) contains no `useRef`, no `useEffect`, no `tabIndex`, and no `.focus()`
call of any kind — its entire body is the JSX I quoted above. `HoldExpiredState` itself
(`hold-expired-state.tsx:34-58`) renders `<CardContent role="status">` with no `tabIndex` and no
mount effect either. I confirmed by grep that the sibling feature this pattern is modelled on —
`collision-notice.tsx` (STATE-07/D-55, plan 12-13) — **does** implement the focus move correctly
(`tabIndex={-1}` + `ref.current?.focus()` in a mount effect, `collision-notice.tsx:124-138`). Hold
expiry has no such code anywhere in the tree.

**Why the existing gates do not catch this:** `tests/design/live-regions.test.tsx` (SCAN 1) is a
static source scan — it checks that `aria-live="assertive"` is absent and that `role="status"` is
present, both true here. It never renders `ReserveView`/`HoldExpiredState` and asserts
`document.activeElement`. I grepped the whole repo for `toHaveFocus`/`activeElement` and the only
hits are `collision-in-place.spec.ts`, `photo-lightbox.spec.ts`, `price-one-fact.spec.ts`, and
`availability-calendar.test.tsx` — none of them touch hold expiry. `reserve-actions.test.tsx` and
`hold-countdown.test.tsx` (both in this phase's file list) mount `ReserveActions`/`HoldCountdown` in
isolation, not `ReserveView`, so they cannot see the missing wiring either. `tsc`/`next build`/the
full suite all stay green because nothing in the toolchain executes and inspects this runtime
behaviour.

**Real-world consequence:** the project deliberately dropped `aria-live="assertive"` for hold expiry
specifically because a focus move was supposed to replace it (per Rule 7's own text: *"Where an event
must be noticed the mechanism is polite region + moved focus"*). With only the polite half shipped,
a screen-reader user whose hold expires mid-checkout gets a `role="status"` region that announces
nothing unless they happen to already be focused inside it, and their keyboard focus is left wherever
it was — potentially on a control (e.g. "Confirm & pay") that has just been unmounted from under
them. This is not a money-loss bug (the server is still the expiry authority and `confirmBooking`
re-validates), but it is a shipped violation of the project's own declared accessibility contract on
its most safety-critical route, self-documented as load-bearing in three places.

**Fix:** implement the same pattern `collision-notice.tsx` already uses. In `hold-expired-state.tsx`,
give the recovery `<CardContent>` (or a wrapping element) a `tabIndex={-1}` and focus it on mount:

```tsx
export function HoldExpiredState({ listingId }: { listingId: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    ref.current?.focus();
  }, []);
  return (
    <Card>
      <CardContent ref={ref} tabIndex={-1} role="status" className="...">
        ...
      </CardContent>
    </Card>
  );
}
```
Then add a render test (mount `ReserveView` with `timedOut`/`confirmFailed` true, or mount
`HoldExpiredState` directly, and assert `document.activeElement === container`) so this cannot silently
regress a second time.

## Warnings

### WR-01: Search relaxation ladder's exception path mislabels itself as "exhausted"

**File:** `src/app/(public)/page.tsx:108-133,239`

**Issue:** `relaxExhausted` is computed as:

```ts
relaxExhausted={relaxation === null && applicableRungs > 0}
```

`applicableRungs` (line 113-116) is a **static** count — it only calls each rung's pure `relax()`
transform to see whether there is anything to widen; it runs before any query executes. `relaxation`
is set inside a `try { relaxation = await runRelaxationLadder(...) } catch { /* best-effort */ }`
(lines 119-133). If `runRelaxationLadder` throws (e.g. a transient DB error inside one of the
`searchListings` calls it drives), the `catch` swallows it and `relaxation` stays `null` — exactly the
same state as "the ladder ran every applicable rung and all of them came back empty." `relaxExhausted`
therefore becomes `true` in both cases, and `search-results.tsx:333-336` renders: *"We widened the
search and still came up empty. Try a different day, or a different part of the city."* — a specific,
false claim about work that was never completed.

This directly contradicts the codebase's own stated rule for this exact prop
(`search-results.tsx:87-92`, restated at line 325): *"the Copywriting Contract's 'every rung
exhausted' row is a claim about work that was actually done, so it is only said when the ladder ran
and every applicable rung came back empty."* A crashed ladder is not "work that was actually done."

**Why the existing gates do not catch this:** `tests/search/search-results-states.test.tsx` passes
`relaxExhausted` directly as a prop into `<SearchResults>` (lines 228, 244, 257-259, 272) — it tests
the component's rendering of the flag, never the RSC's derivation of the flag, so it cannot see this
misattribution. `tests/search/relaxation-ladder.test.ts` tests `runRelaxationLadder` in isolation, not
the page's error-swallowing wrapper around it. There is no test that forces `searchListings`/the DB to
throw mid-ladder and asserts the resulting empty-state copy.

**Fix:** track whether the ladder actually completed, separately from whether it found nothing:

```ts
let relaxation: RelaxationOutcome | null = null;
let ladderFailed = false;
if (zeroResult && applicableRungs > 0) {
  try {
    relaxation = await runRelaxationLadder(...);
  } catch {
    ladderFailed = true;
  }
}
...
relaxExhausted={relaxation === null && applicableRungs > 0 && !ladderFailed}
```
(and consider surfacing `fetchError`-style copy instead of the exhausted-ladder copy when
`ladderFailed` is true, since the two are different failure modes for the booker.)

### WR-02: `HoldCountdown` can visually disagree with the rest of the page for up to ~1s after mount

**File:** `src/components/booking/hold-countdown.tsx:107-141`

**Issue:** `LiveCountdown`'s displayed `expired` state (`remaining <= 0`, computed at render time from
`useState(() => target - Date.now())`) can be `true` from the very first render if the client is slow
to hydrate near the end of a hold's TTL. However, `onExpireRef.current()` — which calls
`markExpired()` on the shared `HoldProvider` context, the only thing that causes `ReserveView` to swap
the whole page to `HoldExpiredState` (`reserve-view.tsx:73`) — is only invoked from inside the
`setInterval` callback (`hold-countdown.tsx:132-136`), which does not fire until roughly 1 second after
mount. In that window the header box already renders "Hold expired" (`hold-countdown.tsx:146-148`)
while the rest of the page — the price breakdown, the cancellation disclosure, the "Confirm & pay"
button — is still fully rendered and interactive, because `ReserveView` has not yet been told the hold
is over.

This is a narrow window (bounded by the interval period) and has no money impact — `confirmBooking`
re-validates `expires_at > now()` server-side regardless of what the client shows — but it is a
verifiable, self-contradicting UI state: the header says the hold is over, the body says it is not,
on the one route in the app where the project's own docs are most emphatic about a single source of
truth for this exact fact ("ReserveView flips the whole page... never a stale reserve form").

**Why the existing gates do not catch this:** `tests/booking/hold-countdown.test.tsx` uses fake timers
and advances them explicitly; it does not test the specific initial-render-already-past-expiry case
combined with a render of the parent `ReserveView` to observe the cross-component lag.

**Fix:** run the expiry check once synchronously on mount (in an effect, not during render) in addition
to the interval, e.g. call `onExpireRef.current()` immediately if `target - Date.now() <= 0` before the
first `setInterval` tick, or reduce to a single `requestAnimationFrame` pass before starting the
1-second interval.

### WR-03: `RADIUS_PRESETS`/`MAX_RADIUS` are hand-duplicated in three files despite this phase creating a canonical export

**File:** `src/components/search/search-bar.tsx:48`, `src/components/search/search-results.tsx:50-51`

**Issue:** `src/lib/validation/booking.ts:48-51` exports `RADIUS_PRESETS` and `MAX_RADIUS_KM`
specifically so "the ladder... reads the authority instead of restating it" and its own comment
states plainly: *"Three copies already ship (`search-bar.tsx`, `search-results.tsx` and this one)."*
Both of those two files are in this phase's file list and both still declare their own local
`const RADIUS_PRESETS = [2, 5, 10, 25] as const;` / `MAX_RADIUS` rather than importing the canonical
values this same phase introduced. This is a self-acknowledged duplication, not a hidden one, but it
means a future change to the preset ladder (e.g. adding a 50 km option) has three call sites to update
by hand, two of which give no compile-time signal if missed.

**Fix:** import `RADIUS_PRESETS`/`MAX_RADIUS_KM` from `@/lib/validation/booking` in both files instead
of re-declaring them.

## Info

### IN-01: Two unrelated types both named `SearchedWindow`

**File:** `src/lib/validation/booking.ts:125-129` vs `src/components/search/search-result-card.tsx:52-56`

**Issue:** `src/lib/validation/booking.ts` exports `SearchedWindow` as
`{ date: PickedDate | null; startHour: number | null; endHour: number | null }`, while
`search-result-card.tsx` (imported into the reviewed `search-results.tsx`) separately declares its own
`SearchedWindow` as `{ date?: string; start?: string; end?: string }` — raw, unvalidated strings. Both
are used correctly at their respective call sites (I traced `(public)/page.tsx`'s usage and confirmed
it matches the raw-string shape), so this is not presently a bug, but the identical name for two
structurally different types increases the chance a future edit imports the wrong one and gets a type
error far from the actual mistake, or — worse, if one is ever loosened — no type error at all.

**Fix:** rename one of the two (e.g. `SearchedWindowRaw` for the card's version, since it is the one
whose fields are pre-validation).

### IN-02: `date-pass-picker.tsx`'s month-availability fetch fails open with no user-visible signal

**File:** `src/components/availability/date-pass-picker.tsx:152-172`

**Issue:** When `getOpenMonthAvailability` throws, the effect sets `fullDates = []` for that month
(comment: *"A failed month read leaves that month's dates SELECTABLE, and that direction is
deliberate... a booker who picks a date that has since sold out gets the calm OC-13 refusal"*). That
reasoning is sound for correctness (the claim transaction is still the real gate), but there is no
`error`/toast/inline signal distinguishing "this month has no sold-out dates" from "we failed to load
which dates are sold out" — a booker could pick a date that visually looks open purely because the
fetch failed, and only discover the refusal after submitting. This is a UX/observability gap rather
than a correctness bug (matches the documented, deliberate fail-open design), so I am not marking it a
Warning, but it is worth a follow-up decision given how much other code on this path goes out of its
way to avoid "silently stale/plausible" states (`IN-03`/stale-clear rule cited repeatedly elsewhere in
this same file).

---

## Deprioritised coverage

Per the review's scope note, I did not perform an equally deep read of all 91 files. The following
received only the repo-wide pattern sweep (hardcoded secrets, `eval`/`innerHTML`, debug artifacts,
empty catches, loose equality, `any`) rather than a full per-file read, because they are lower-risk
(tests, e2e specs, CI/workflow config, pure design-token/measurement declarations, or host-side/
non-money surfaces):

- All files under `e2e/**` and `tests/**` (test reliability was checked only where it bore directly
  on a finding above — e.g. confirming no test covers CR-01/WR-01 — not for their own internal
  correctness).
- `.github/workflows/baselines.yml`, `scripts/seed-baseline-fixtures.ts`,
  `scripts/verify-baselines-workflow.mjs` — CI/tooling, not on the booker/money path.
- `src/app/globals.css`, `src/lib/design/contrast-pairs.ts`, `src/lib/design/measurements.ts`,
  `src/lib/design/selector-contract.ts`, `src/lib/design/visual-baselines.ts` — design-token/geometry
  declarations; skimmed for obviously wrong values but not exhaustively cross-checked against every
  consumer.
- `src/app/dev/theme/page.tsx` — dev-only route.
- `src/app/(host)/host/listings/page.tsx` — host-side surface; spot-checked its authz gating (session
  + `canHost` + owner-scoped queries all present and correct) but not reviewed line-by-line.
- `src/components/listing/host-block.tsx`, `photo-gallery.tsx`, `photo-lightbox.tsx` — read for
  obvious injection/XSS patterns (none found: no `dangerouslySetInnerHTML`, no `eval`) but not
  reviewed for full a11y/interaction correctness.
- `src/components/patterns/responsive-dialog.tsx`, `src/components/ui/collapsible.tsx`,
  `src/components/patterns/card-grid-skeleton.tsx` — read in full; no defects found, but lower
  scrutiny than the money-path files given they are thin/vendored wrappers.

Additionally, several components central to the flows reviewed above (`collision-notice.tsx`,
`partial-grant-notice.tsx`, `pax-stepper.tsx`, `pass-stepper.tsx`, `cancellation-policy-disclosure.tsx`,
`spots-left-chip.tsx`, and the server actions in `src/app/actions/booking.ts` /
`src/lib/booking/pricing.ts` / `src/lib/payments/service-fee.ts` / `src/lib/payments/checkout-lease.ts`)
are **outside** the 91-file review scope per the task's file list, but I read them where needed to
confirm or refute a finding (e.g. to confirm `collision-notice.tsx` correctly implements the focus-move
pattern that `hold-expired-state.tsx` is missing, and to confirm `computeServiceFee`'s single-rounding
guarantee that `all-in-table.ts` depends on). I did not review them independently for defects of their
own, since they were not in scope for this phase's review.

---

_Reviewed: 2026-08-18T19:18:42Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_

---

## Resolution — `/gsd:code-review 12 --fix` (2026-08-19)

All Critical and Warning findings are fixed and committed. `IN-01` and `IN-02` were left
untouched: `--all` was not passed, so Info findings were out of the fix scope by contract.

| Finding | Severity | Status | Commit |
|---------|----------|--------|--------|
| CR-01 | Critical | fixed + regression test | `ceccc55` |
| WR-01 | Warning | fixed | `fd9d82d` |
| WR-02 | Warning | fixed + 2 regression cases | `2b02f99` |
| WR-03 | Warning | fixed | `cafc5bb` |
| IN-01 | Info | open — out of fix scope | — |
| IN-02 | Info | open — out of fix scope | — |

**Gates re-run independently after the fixes:** `npx tsc --noEmit` exit 0 · `npx vitest run`
141 files / 1307 tests passed (was 140 / 1302 — the delta is the two new regression suites) ·
`npm run build` exit 0, 0 errors and the same 12 pre-existing lint warnings.

### Deliberate divergences from the suggested fixes

**CR-01 focus target — the recovery CTA, not `CardContent`.** The review's snippet mirrored
`collision-notice.tsx` by focusing the region. Two of the three contract sites say focus moves to
*the primary recovery CTA* specifically, and `live-regions.ts` names a different target for the
collision row on purpose. Focusing the region would have left those two sentences false, forcing a
choice between shipping a false comment and softening it — both forbidden. The ref rides the
`Back to availability` `Link`; the test asserts `document.activeElement` **is** that anchor, so a
ref dropped by Radix `Slot` composition cannot pass.

**CR-01 owner — `HoldExpiredState`, not `ReserveView`.** That state has two mounts: the live-expiry
swap at `reserve-view.tsx:73` and `book/page.tsx:129`'s direct render for a hold already dead on
arrival. A parent-owned effect covers one of them. The `live-regions.ts` row records this; nothing
was weakened.

**WR-01 — the optional half was declined.** The review suggested `fetchError`-style copy when the
ladder crashes. The booker's own search did run and genuinely returned nothing — only the widening
failed — so `fetchError` copy would substitute one false claim for another. A crashed ladder now
falls back to the shipped `Try widening your search.`; no copy was re-worded.

**WR-03 — one extra file.** `src/lib/validation/booking.ts`'s own doc comment still read
"Three copies already ship". Leaving it would have reproduced exactly the defect class CR-01 is about.

### Visual-baseline impact: none — no re-mint required

No fix alters rendered output on any baselined surface's happy path, which is what allows the
Task 3 dispatch to proceed against this code.

- **WR-01** — `ladderFailed` is set only inside the `catch`. On the seeded fixture the ladder
  succeeds, so `relaxExhausted` is unchanged; the zero-result band renders identically.
- **CR-01 / WR-02** — the focus move fires only from `HoldExpiredState`'s mount, and that component
  never mounts on a non-expired checkout render; WR-02's mount check returns on its first line for a
  live deadline. Both are pinned by explicit negative cases
  (`hold-expired-state.test.tsx` case 3, `hold-countdown.test.tsx` case 7) so a stray focus ring
  cannot reach the frozen-clock `/listings/[id]/book` baseline.
- **WR-03** — pure import refactor, verified element-for-element before deletion: all three sites
  declared `[2, 5, 10, 25] as const`, and the local `MAX_RADIUS` used the same
  `RADIUS_PRESETS[length - 1]` derivation as canonical `MAX_RADIUS_KM`.

### Regression tests were proven to fail without their fix

Each new suite was run with its fix temporarily neutered, then restored:
`hold-expired-state.test.tsx` cases (1) and (2) fail while negative case (3) still passes;
`hold-countdown.test.tsx` case (6) fails while negative case (7) still passes. Both are guards
against silent recurrence — CR-01's whole point is that a static source scan structurally cannot
see a missing focus move.
