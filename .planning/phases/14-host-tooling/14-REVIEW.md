---
phase: 14-host-tooling
reviewed: 2026-08-24T01:40:00Z
depth: standard
files_reviewed: 34
files_reviewed_list:
  - src/lib/booking/bookings-query.ts
  - src/lib/booking/when-label.ts
  - src/lib/availability/week-strip.ts
  - src/lib/host/bookings-copy.ts
  - src/lib/host/requests-signal.ts
  - src/lib/design/measurements.ts
  - src/lib/design/selector-contract.ts
  - src/lib/design/live-regions.ts
  - src/lib/design/accent-uses.ts
  - src/lib/design/contrast-pairs.ts
  - src/lib/design/status-tones.ts
  - src/lib/design/visual-baselines.ts
  - src/app/(host)/host/page.tsx
  - src/app/(host)/host/loading.tsx
  - src/app/(host)/host/requests/page.tsx
  - src/app/(host)/host/requests/loading.tsx
  - src/app/(host)/host/bookings/page.tsx
  - src/app/(host)/host/bookings/loading.tsx
  - src/app/(host)/host/earnings/page.tsx
  - src/app/(host)/host/earnings/loading.tsx
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/app/(host)/host/listings/[id]/edit/page.tsx
  - src/app/(host)/host/listings/[id]/edit/loading.tsx
  - src/app/(host)/host/listings/[id]/availability/page.tsx
  - src/app/(host)/host/listings/[id]/availability/loading.tsx
  - src/components/host/host-agenda.tsx
  - src/components/host/host-signals.tsx
  - src/components/host/publish-checklist.tsx
  - src/components/host/request-row.tsx
  - src/components/availability/week-strip.tsx
  - src/components/availability/weekly-hours-editor.tsx
  - src/components/availability/blocks-editor.tsx
  - src/components/booking/request-countdown.tsx
  - src/components/listing/address-autocomplete.tsx
  - src/components/listing/photo-uploader.tsx
  - src/components/patterns/row-list-skeleton.tsx
  - tests/booking/agenda-query.test.ts
  - tests/security/bookings-owner-scope.test.ts
  - tests/availability/week-strip.test.ts
  - tests/listing/wizard-save-state.test.tsx
  - tests/design/live-regions.test.tsx
  - e2e/overflow-320.spec.ts
  - e2e/host-headings.spec.ts
findings:
  critical: 0
  warning: 4
  info: 5
  total: 9
status: issues_found
fixed_at: 2026-08-24T02:30:00Z
fix_scope: warnings
dispositions:
  WR-01: { status: fixed, commit: ab2d2ce }
  WR-02: { status: fixed, commit: 1c2e3e7 }
  WR-03: { status: fixed, commit: f0a6490 }
  WR-04: { status: fixed, commit: 013c33d }
  IN-01: { status: not_fixed, reason: out_of_scope }
  IN-02: { status: not_fixed, reason: out_of_scope }
  IN-03: { status: fixed, commit: 1c2e3e7, note: "carried free by WR-02's functional-updater change" }
  IN-04: { status: not_fixed, reason: out_of_scope }
  IN-05: { status: not_fixed, reason: out_of_scope }
---

# Phase 14: Code Review Report

**Reviewed:** 2026-08-24T01:40:00Z
**Depth:** standard
**Files Reviewed:** 34 source files (+ 9 test/spec files read for assertion strength)
**Status:** issues_found

## Summary

The load-bearing new logic — `queryHostAgenda` — holds up under adversarial reading. Owner scoping is a
bound `l.host_id = $1` inside the statement on **both** UNION-ALL buckets; the status filter is the
single spliced `ACTIVE_STATUS_SQL` (`NOT IN ('cancelled','declined')`) on both halves, so a row cannot
fall through both; the day predicate projects `b.starts_at` and the bound instant into the **per-row**
`l.timezone` column; the clock is a bound parameter, read once per request via `readDbNow(db)` and
threaded into the query, the badges and the countdown reason on both `/host` and `/host/requests`; and
nothing caller-supplied reaches `sql.raw`. `tests/booking/agenda-query.test.ts` and the four new
`bookings-owner-scope` cases are genuinely mutation-verified — I re-read the fixtures and they are
falsifiable, not decorative.

I confirmed the four other structural claims the phase makes: `src/lib/availability/week-strip.ts` is
directive-free and pulls only a **type-only** import, so the client editor, the client strip and a
node-env unit test can all bind it; `persist()`'s widened `ListingResult` is handled at all three call
sites; `visitedKeys` is keyed by `StepKey` and survives the occupancy-mode switch; and no money
arithmetic occurs on any host surface (`/host` renders no money at all). `npx tsc --noEmit` is clean;
`vitest run --config vitest.design.config.ts` is 837/837; the host/listing/availability/booking unit
suites are 473/473.

What survives is four real defects and five quality items. None is a security or money defect. The two
that matter most are a **silent truncation** of the agenda list that is reachable by an ordinary
drop-in listing, and a **navigation control the phase newly made clickable but did not disable during
an in-flight autosave**, which lets a stale closure yank the host to a step they did not choose. Two
accessibility/structure claims made in comments and in a committed inventory are also measurably false.

---

## Fix pass — 24 August 2026

All four Warnings are **fixed**, one atomic commit each. Info findings were out of scope; IN-03 came free
with WR-02 and is marked below. Each finding's disposition is recorded at the head of its own section.

| Finding | Disposition | Commit |
|---|---|---|
| WR-01 silent agenda truncation | **fixed** | `ab2d2ce` |
| WR-02 the rail races the autosave | **fixed** | `1c2e3e7` |
| WR-03 flattened heading outline | **fixed** | `f0a6490` |
| WR-04 the live-region's false rationale | **fixed** | `013c33d` |
| IN-03 `Back` reads a closure | **fixed, free** | `1c2e3e7` |
| IN-01 · IN-02 · IN-04 · IN-05 | not fixed — out of scope for this pass | — |

**Every new assertion was observed failing against the defect it names**, and the observed output is
quoted in each commit message rather than predicted:

| Finding | Watched red | Restored |
|---|---|---|
| WR-01 query | 4 failed / 16 passed (case 7a green first — the fixture is genuine) | 20/20 |
| WR-01 render | 3 failed / 31 passed, note suppressed | 34/34 |
| WR-02 | 6 failed / 1 passed, unfixed source | 8/8 |
| WR-02 (5b) | 1 failed / 7 passed, captured read restored | 8/8 |
| WR-03 | 3 failed / 7 passed, `titleAs` reverted at both sites | 10/10 |
| WR-04 | 5 failed / 4 passed, `located`-driven region restored | 9/9 |

**Verification, all after the last commit:**

- `npx tsc --noEmit` → exit **0**
- `npm run test:design` → 50 files / **837 passed** / 3 skipped / **0 failed** (unchanged from baseline)
- `npx vitest run` (whole suite) → 181 files / **1883 passed** / 5 skipped / **0 failed**
- `npm run build` → exit **0**; the only lint warnings are pre-existing (underscore-prefixed unused vars,
  and `wizard.tsx:534`'s shipped React-Compiler note about RHF `watch()`). The new `useEffect` raised no
  exhaustive-deps warning.
- `git diff --stat drizzle/` → **empty**. Zero migrations.
- Playwright, **each spec run ALONE** per the phase's own discipline:
  `e2e/host-headings.spec.ts` **14 passed** · `e2e/skeleton-geometry.spec.ts` **14 passed** ·
  `e2e/overflow-320.spec.ts` **46 passed / 15 skipped**.
  ⚠ `host-headings` FAILED on its first invocation (`availability` — `[data-testid="week-strip"]` resolved
  to 0 elements, 122 polls over 60s). It was **not** a defect in the WR-03 change: `npm run build` had been
  run twice immediately before, and `next build` and `next dev` share `.next`, so Playwright reused a
  server standing on a build-clobbered cache. Killing the listener on :3000, `rm -rf .next` and re-running
  gave 14/14. Recorded rather than quietly re-run, because the first output looked exactly like a
  regression in the file that had just changed.

**Pinned files, as required:** `tests/design/brand-recipe.test.ts`, `tests/design/type-scale.test.ts`,
`src/components/host/payout-*.tsx`, `/host/earnings` and `drizzle/` were never opened.
`tests/listing/wizard-occupancy.test.tsx`, `tests/listing/wizard-rail.test.tsx` and
`tests/listing/wizard-save-state.test.tsx` are **unedited and green**.
⚠ `tests/listing/publish-checklist.test.tsx` took a **one-token** edit — see WR-02's disposition.

---

## Warnings

### WR-01: `/host`'s agenda silently truncates at 20 sessions, and drop-in listings reach that ceiling

> **✅ FIXED — `ab2d2ce`** · `fix(14): WR-01 the agenda says when the today cap truncated it`
>
> The bound stays; the silence goes. `queryHostAgenda` reads `LIMIT + 1` (the sentinel idiom the keyset
> pager in the same module already uses), discards the sentinel and returns `todayTruncated`.
> `HostAgenda` takes `truncated` as a **required** prop — an optional one is one a caller can forget,
> and forgetting it restores the defect exactly — and renders one calm line beneath the rows.
>
> **Two departures from the suggested fix, both deliberate.** (a) The sentence carries the RENDERED row
> count, not `HOST_AGENDA_TODAY_LIMIT`: this component renders in jsdom and the module holding the cap
> reaches for a database, so importing it would couple a server module into the component — and a fact
> about the list on screen is the stronger claim anyway. (b) No second route-out; the section's own
> "View all bookings" link is in the heading row in every state, and the sentence names where the rest
> are. A second control with the same accessible name to the same place is one affordance rendered twice.
>
> The docblock defending the cap as *"not a v1 shape"* was replaced with the drop-in arithmetic that
> makes it false. Boundary pinned from **both** sides in `agenda-query.test.ts` case 7 — at the cap and
> one past it — because a fixture on one side cannot tell a `>` from a `>=`. Five rendered cases in
> `agenda-states.test.tsx`, including the absence (a note that renders unconditionally is the same lie
> pointing the other way) and the calm-ink rule.
>
> One thing worth knowing: the calm-ink case is scoped to the note element, not the container. A
> container-wide alarm-token scan goes red on `ui/badge.tsx`'s `aria-invalid:` conditional inside the
> row card — shipped markup this finding does not touch — so a wider scan would have been measuring the
> badge and reporting it as this sentence's ink.

**File:** `src/lib/booking/bookings-query.ts:381`, `src/lib/booking/bookings-query.ts:546`, `src/components/host/host-agenda.tsx:180-190`

**Issue:** `HOST_AGENDA_TODAY_LIMIT = 20` bounds the `today` bucket, and `queryHostAgenda` returns
`{ today, next }` with no "there are more" signal of any kind — no total, no `hasMore`, no sentinel row.
`HostAgenda` renders `rows.map(...)` and stops. A host with 25 sessions today sees 20 under a heading
that reads **"Today"** and has no way to know five are missing.

The docblock defends the cap as *"a single host with more than this many sessions in one venue-local
day is not a v1 shape."* That is false for the occupancy mode this codebase already ships.
`placeOpenHold` → `createOpenCapacityHold` mints **one `booking` row per booker** for a drop-in day pass
(`src/app/actions/booking.ts:481-489`), and `maxOccupancy` on a drop-in listing is the *daily head cap*
— the wizard's own copy offers *"up to 30 people a day"*. Twenty-one distinct bookers on one day is an
ordinary Tuesday for a gym selling day passes, not a pathological row set.

Two aggravating factors: the truncation is silent in the same sense the phase's own comments condemn
elsewhere ("a UTC comparison gets that wrong SILENTLY"), and `tests/booking/agenda-query.test.ts` has
no case at or above the limit — grep for `HOST_AGENDA_TODAY_LIMIT` in `tests/` returns nothing, so a
future change to the cap or to the truncation behaviour is unobserved.

**Fix:** Read `LIMIT + 1` (the `toPage` sentinel idiom already in this module) and surface the overflow,
so the surface can say so rather than lying by omission:

```ts
export type HostAgenda = {
  today: BookingListRow[];
  /** True when the today bucket was capped — there are sessions this list does not show. */
  todayTruncated: boolean;
  next: BookingListRow | null;
};

// …inside the today bucket
        LIMIT ${HOST_AGENDA_TODAY_LIMIT + 1}
// …in the partition loop
  const truncated = today.length > HOST_AGENDA_TODAY_LIMIT;
  return {
    today: truncated ? today.slice(0, HOST_AGENDA_TODAY_LIMIT) : today,
    todayTruncated: truncated,
    next: today.length > 0 ? null : soonest,
  };
```

and in `host-agenda.tsx`, beneath the `<ul>`:

```tsx
{truncated ? (
  <p className="text-label text-muted-foreground">
    Showing the first {HOST_AGENDA_TODAY_LIMIT} of today&apos;s sessions.
  </p>
) : null}
```

Add a fixture at `HOST_AGENDA_TODAY_LIMIT + 1` rows to `tests/booking/agenda-query.test.ts` so the
boundary is pinned rather than assumed.

---

### WR-02: The new step-rail buttons are the only wizard navigation not disabled during an in-flight save, and a stale `step` closure overrides the host's choice

> **✅ FIXED — `1c2e3e7`** · `fix(14): WR-02 the rail and the checklist stop racing the autosave`
>
> Four changes. `disabled={saving}` on the rail's visited markers; `disabled` threaded into
> `PublishChecklist` and applied to `Fix` **and** to `Resend verification email`; the advance moves one
> step from the LIVE position (`stepForward`) instead of the captured index, with `Back` going the same
> way (`stepBack` — that is IN-03, free once the fourth change exists).
>
> **The fourth change is the one that is not about an attribute, and it is the departure from the
> suggested fix.** The suggestion put `setVisitedKeys` inside `setStep`'s updater; a React state updater
> must be pure, and under StrictMode's double-invoke that is a side effect fired twice. Instead **the
> arrival record moved**: `goToStep` no longer names its own destination, and an effect keyed on
> `currentKey` records arrival off the step the host is standing on. "Visited" now means what the word
> means, and no transition can be wrong about it — including one that resolves after an await. D-148 is
> untouched: still a set of step KEYS, still the rail's only authority. Nothing changes visibly, because
> an arriving step renders as `current` and `current` never consults the set.
>
> **⚠ ONE ASSERTION COULD NOT BE DRIVEN RED, AND THE FILE SAYS SO.** With every control behind the lock,
> the captured-index read has no reachable consequence *today*, so case (5b) reads it out of the SOURCE
> — the idiom `wizard-save-state.test.tsx` already uses for its no-scheduled-callback rule, for the same
> stated reason. It was observed red by restoring the old line (1 failed / 7 passed).
>
> **My first draft of case (5) claimed a rendered probe and the premise was false.** It walked a
> mid-flight occupancy switch, expecting the walked list to change under the advance. It cannot: the mode
> can only be changed on step 5 (`occupancy`, index 4) and BOTH walked lists hold `pricing` at index 5 —
> which is exactly what `deferred-items.md` `[14-09]` argued. The case was rewritten to state that limit
> and to remain the walk that WOULD expose it once D-148 is widened to allow a forward jump, which is
> what that deferred entry asks the widening plan to re-run. It was not forced into agreement.
>
> `tests/listing/wizard-save-race.test.tsx` is new — 8 cases, and the first wizard test to hold the
> autosave OPEN. The other three pin it to resolve immediately, which makes the in-flight window
> zero-width; that is why three files could assert this wizard from three directions and none could see
> this. Every in-flight case asserts the control is enabled at rest, disabled in flight and enabled again
> after, so a permanently-dead rail fails it too — and case (4) proves a REFUSED save lifts the lock, a
> failure mode the suggested fix does not mention and which would leave a host with a broken draft and no
> way to reach the field.
>
> **⚠ `tests/listing/publish-checklist.test.tsx` took a one-token edit**, flagged here rather than buried:
> that file is a pin. `disabled` is required at the public boundary (three placements render these rows;
> a default is one a placement can silently miss), so its one direct `<PublishChecklist>` render needed
> `disabled={false}`. Nothing it asserts moved. `wizard-rail.test.tsx`, `wizard-occupancy.test.tsx` and
> `wizard-save-state.test.tsx` are unedited and green.

**File:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx:889-908` (the rail button), `:606-616` (`saveAndContinue`), `:1728-1735` (the Back button)

**Issue:** Plan 14-09 converted the visited rail markers from inert `<span>`s into real `<button>`s.
Every *other* navigation affordance in the nav row is gated on the in-flight lock —
`disabled={step === 0 || saving}` on Back, `disabled={saving}` on the advance / publish / draft
control — but the rail buttons carry no `disabled` at all:

```tsx
<button
  type="button"
  onClick={() => goToStep(i)}
  aria-label={`Go back to step ${i + 1}: ${s.title}`}
  className={cn(STEP_MARKER_BOX, …)}
>
```

`saveAndContinue` then advances from a **closure-captured** `step`:

```ts
const res = await persist();
setSaving(false);
setSaveState(saveStateFor(res));
if (res.ok && step < steps.length - 1) goToStep(step + 1);   // `step` as of the click
```

Sequence a host can produce today: on step 3, press **Save and continue**; while the request is out,
press the rail marker for step 1 (`setStep(1)`); the save resolves and `goToStep(step + 1)` fires with
the stale `step === 3`, throwing the host to step 4. Nothing reports it. The same hole applies to
`PublishChecklist`'s **Fix** buttons, which plan 14-10 made reachable from the first step and which are
likewise undisabled (`publish-checklist.tsx:191-200`).

This is a genuine regression introduced by this phase: before 14-09 there was no reachable navigation
control that could race the save.

**Fix:** Gate the new controls on the same lock the shipped ones use, and make the advance read the
current index rather than the captured one:

```tsx
// wizard.tsx — the rail
<button type="button" onClick={() => goToStep(i)} disabled={saving} aria-label={…} …>

// wizard.tsx — the advance, off the clamped current position
if (res.ok) setStep((s) => {
  const next = Math.min(s + 1, steps.length - 1);
  setVisitedKeys((prev) => prev.has(steps[next].key) ? prev : new Set(prev).add(steps[next].key));
  return next;
});
```

and thread `saving` into `PublishChecklist` so its `Fix` / `Resend` buttons take `disabled` too.

---

### WR-03: The availability route's heading outline was flattened — two `<h3>`-level advisories became `<h2>`, in the same commit that deliberately preserved `titleAs="h3"` next door

> **✅ FIXED — `f0a6490`** · `fix(14): WR-03 restore the availability route's heading outline`
>
> `PanelCard` gains `titleAs?: "h2" | "h3"` — `EmptyState`'s prop, its union, its `const Title` idiom and
> its argument, adopted rather than invented, because that component's own docblock predicted this exact
> failure: *"a fixed level would push every adopter into either a skipped level or a wrong one."* Default
> stays `h2`, so all nine shipped call sites render the element they already rendered, and the diff is
> two attributes plus the prop.
>
> **Four cases assert the PROPERTY, not the spelling.** A case reading `titleAs` off the source would
> pass on a prop that is accepted and ignored, so `tests/availability/week-strip.test.tsx` (7)–(10)
> render `WeeklyHoursEditor` INSIDE the section heading the route gives it and count what comes out: no
> sibling `<h2>`; both panels level three by name; both still *real headings* (an outline is not repaired
> by demoting an entry to a `<p>` — the failure mode `EmptyState`'s own docblock names); and the strip
> level three wherever it is mounted. Any future panel added to that editor is covered with no edit here.
>
> **On the e2e blindness the finding asked me to weigh: NOT closed, and recorded rather than skipped.**
> `e2e/host-headings.spec.ts:93` documents that it says nothing about `<h2>` and below, which is why 28
> green states did not notice this. The honest fix is a skipped-level walk across that file's existing
> state table — a real addition to a spec that seeds a database and must be run alone, and one that
> belongs beside Phase 17's axe pass (`heading-order` is an axe rule, not a bespoke assertion). A
> one-route half-measure would produce a green that reads like coverage and is not. Written up in
> `deferred-items.md` as `[14-REVIEW WR-03]`, owner Phase 17, including what the new unit cases cover and
> the three things they explicitly cannot (they mount the editor, not the route; one route only; and a
> genuine `h1`→`h3` skip passes case 7 trivially).

**File:** `src/components/availability/weekly-hours-editor.tsx:196-201`, `src/components/availability/week-strip.tsx:105`, `src/app/(host)/host/listings/[id]/availability/page.tsx:201`

**Issue:** `PanelCard` renders its `title` prop as an unconditional `<h2 className="text-heading">`
(`src/components/patterns/panel-card.tsx:171`) — there is no level prop. Plan 14-12 moved the weekly
hours advisory onto it:

```diff
-  <h3 className="text-base font-semibold">Set your weekly hours</h3>
+  <PanelCard tone="muted" title="Set your weekly hours" description="…" />
```

and mounted `WeekStrip`, whose container is `<PanelCard title="Your week at a glance">` — a second new
`<h2>`. Both render **inside** `<section><h2 className="text-xl font-semibold">Weekly hours</h2>…`, so
the route's outline is now:

```
h1 Availability
  h2 Weekly hours
  h2 Set your weekly hours     ← was h3
  h2 Your week at a glance     ← new
  h2 Blocked dates
    h3 No blocked dates        ← correctly preserved
```

Three sibling `<h2>`s where two are subordinate content. The commit message for 14-13 states *"Every
word is byte-identical; only the box is new"* — the box is not the only thing that changed; the heading
**level** did. The inconsistency is internal to this phase: `blocks-editor.tsx:147` passes
`titleAs="h3"` with the comment *"because the page already heads this region with its own"* — the
identical reasoning that the two `PanelCard` sites violate.

Nothing catches it. `e2e/host-headings.spec.ts` documents its own blind spot at line 93: *"IT SAYS
NOTHING ABOUT `<h2>` AND BELOW. A surface whose sections skip from level one to level three has a
broken outline and passes this file completely."*

**Fix:** Give `PanelCard` the same escape hatch `EmptyState` already has, and use it on the two nested
sites:

```tsx
// panel-card.tsx
export type PanelCardProps = { …; titleAs?: "h2" | "h3"; };
export function PanelCard({ title, titleAs: TitleTag = "h2", … }) {
  …
  {title ? <TitleTag className="text-heading">{title}</TitleTag> : null}
}

// weekly-hours-editor.tsx / week-strip.tsx
<PanelCard tone="muted" titleAs="h3" title="Set your weekly hours" description="…" />
<PanelCard titleAs="h3" title="Your week at a glance">
```

---

### WR-04: `address-autocomplete.tsx`'s live-region discharge rests on a property that is false on the edit path, and no test exercises it

> **✅ FIXED — `013c33d`** · `fix(14): WR-04 make the address region's declared reason true, and verify it`
>
> **The first of the two offered options was taken: the code was changed, not the reason.** Correcting
> the inventory row to case (b) would have been the cheaper edit and the wrong half to move — a declared
> reason the code does not keep is the failure this phase's own live-region work exists to end, and the
> region's behaviour was genuinely wrong, not merely mis-described. It really did announce a fact on
> arrival on most edits.
>
> The located branch now reads `outcome`, a value only `handleSelect` writes and no prop can seed. The
> already-located fact renders as a plain paragraph beside the static hint, because it is a fact about
> the listing rather than the outcome of anything the host just did. One `LOCATED_SENTENCE` constant
> feeds both placements, so the two can never word it differently. The failure branch needed nothing —
> `error` was already written only by a lookup failing — so **both branches are resolutions now and
> neither is a seed**. Nothing on screen moved in any state, and 14-14's decision-7 rule (never the hint
> and the outcome at once) is re-asserted from the new side.
>
> **The inventory was amended too, but to record the correction rather than to accommodate it** — both
> the `LIVE_REGIONS` row and the `AUTHOR_NAMED_REGIONS` row now say where the emptiness comes from: case
> (a) is earned by the state's shape, not by the address step usually being quiet.
>
> `tests/listing/address-autocomplete.test.tsx` is new and is **the first test in this repository to
> mount this component at all**. 9 cases. The three seeded shapes are asserted separately — both props,
> coordinates only, label only — because `located` is an OR and a fixture passing both cannot say which
> one the region was reading. Two cases exist purely to stop the others being satisfiable by a worse
> surface: the sentence must still appear (outside the region), and a FAILED lookup must still fill the
> region, since every empty-region claim above is satisfied by an element that never fills.
>
> A standing note went into the inventory with it: **a claim about what a region HOLDS needs a render
> behind it.** That gate walks source; it can see that a region exists and is named, and structurally
> cannot see an element's text at mount — which is exactly what "empty until a lookup resolves" asserts.
> That, plus the component being `vi.mock`'d to `() => null` in all four wizard tests, is why a false
> claim survived a plan whose entire subject was this file.

**File:** `src/components/listing/address-autocomplete.tsx:227`, `src/components/listing/address-autocomplete.tsx:284-318`, `src/lib/design/live-regions.ts:1318-1326`

**Issue:** The discharge's stated mechanism — repeated in the file header, at the element, and in the
committed inventory row — is that the region *"holds only the RESOLVED OUTCOME"* and is
*"ALWAYS MOUNTED, TEXT EMPTY UNTIL A LOOKUP RESOLVES"*. `live-regions.ts`'s `address-lookup-result`
row files it under rationale **(a) NOTHING TO BE NAMED BY**, on the grounds that it is *"EMPTY until a
lookup resolves, which on the address step is most of the time a host spends there."*

That is false whenever the wizard is opened on a listing that already has an address:

```ts
const located = Boolean(hasCoordinates) || selectedLabel.length > 0;
```

`wizard.tsx:1175-1183` passes `hasCoordinates={hasCoords}` (derived from the seeded `values.lat` /
`values.lng`) **and** `initialLabel` composed from the stored address. So on an edit of a located
listing the region mounts on the location step already carrying *"Location set. Guests see an
approximate area until you choose to show the exact address."* — content present at mount, which is the
exact "announce on arrival" shape the header says the change removed. The static hint below it never
renders on that path either, so the "read in document order like every other hint" half of the discharge
applies only to brand-new drafts.

The claim is unverified as well as untrue: `AddressAutocomplete` is `vi.mock`'d to `() => null` in all
four wizard render tests (`tests/listing/{publish-checklist,wizard-occupancy,wizard-rail,wizard-save-state}.test.tsx`),
and `tests/design/live-regions.test.tsx` reads **source** via an AST walk, which cannot see a runtime
value. No test renders this component at all.

**Fix:** Either make the property true — hold the region's content in state that only a *resolution*
writes, so a seeded listing starts empty:

```ts
const [outcome, setOutcome] = useState<"located" | null>(null);
// handleSelect → setOutcome("located"); the seeded address renders as a plain <p>, not in the region
```

— or correct the inventory row to rationale **(b) TEXT OF ITS OWN, NAMED ANYWAY** with the trade stated,
as the `request-action-refusal` and `photo-uploader-requirement` rows already do. Either way add a
render test that mounts `AddressAutocomplete` with `hasCoordinates` both true and false and asserts the
region's text at mount, since the AST gate structurally cannot.

---

## Info

> **Info was out of scope for this fix pass.** IN-01, IN-02, IN-04 and IN-05 are **not fixed** and stand
> as written — each is a real item and none is a correctness or accessibility defect. IN-03 is **fixed**,
> because WR-02's change made it free rather than because scope was widened; see its own note.
>
> IN-05 deserves one line of triage even though it was not taken: its second half — `requests/page.tsx:165`
> falling back to `(r.expiresAt ?? new Date())`, so a `requested` row with a null `expires_at` renders as
> instantly **Expired** — is the sharpest thing left in this document. It is a wrong figure on the one
> surface whose entire subject is that deadline, and it is a bigger deal than its Info tier suggests.
> Whoever next opens `/host/requests` should take it first.

### IN-01: Page and loading-plate copy is still hand-typed twice on three of four host routes, under a comment claiming it cannot be

> **Not fixed — out of scope** (Info; this pass fixed Warnings only).

**File:** `src/app/(host)/host/requests/loading.tsx:28-40`, `src/app/(host)/host/requests/page.tsx:196-205`, `src/app/(host)/host/listings/[id]/availability/loading.tsx`, `.../availability/page.tsx:149-153`, `src/app/(host)/host/earnings/{page,loading}.tsx`

**Issue:** `src/lib/host/bookings-copy.ts` was created this phase precisely to stop a page and its plate
typing the same two strings — its docblock argues the point at length and `/host/bookings` now spreads
`{...HOST_BOOKINGS_HEADER}` on both sides. The other three host routes were left with two hand-typed
copies each. `requests/loading.tsx:29-32` nonetheless asserts *"it is the same component in the same
container, rendered twice. Neither half can move without the other going with it."* Only the container
constant binds them; the title and the lede are still two independent literals, and nothing in `tests/`
or `e2e/` compares a page's header text to its plate's (grep for `HOST_BOOKINGS_HEADER` outside the
module returns only the two `/host/bookings` call sites).

**Fix:** Mint `HOST_REQUESTS_HEADER`, `HOST_EARNINGS_HEADER` and `HOST_AVAILABILITY_HEADER` in
`src/lib/host/` beside `bookings-copy.ts` and spread them, or soften the comment to say what is
actually true (the container is shared; the copy is not).

### IN-02: Seven exports have no consumer outside their own module, and two docblocks justify the export by naming a test that does not import them

> **Not fixed — out of scope** (Info). One note for whoever takes it: `HOST_AGENDA_TODAY_LIMIT` is no
> longer in the unused-export set — `tests/booking/agenda-query.test.ts` imports it as of `ab2d2ce`, and
> its docblock now says so truthfully.

**File:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx:306`, `src/lib/booking/bookings-query.ts:381`, `src/components/host/host-signals.tsx:64`, `src/components/host/publish-checklist.tsx:93,96`, `src/lib/host/requests-signal.ts:44,58`

**Issue:** `SAVE_STATE_REGION_NAME`, `HOST_AGENDA_TODAY_LIMIT`, `SIGNALS_HEADING`,
`PUBLISH_CHECKLIST_TITLE`, `PUBLISH_CHECKLIST_UNMET_LEAD`, `requestsWaitingState` and
`REQUESTS_WAITING_REASON` are all `export`ed and referenced only inside their declaring file.
`SAVE_STATE_REGION_NAME`'s docblock says *"EXPORTED for the same reason `STEPS` is (plan 14-09):
`tests/listing/wizard-save-state.test.tsx` asserts these characters"* — that test's import block
(`tests/listing/wizard-save-state.test.tsx:105-113`) takes `STEPS` and the three save-state **labels**,
not the region name. The name is therefore duplicated as a literal in `live-regions.ts:1295`
(`name: "Save state"`) with nothing binding the two.

**Fix:** Either import the constant where the docblock says it is imported (have
`live-regions.test.tsx` resolve `SAVE_STATE_REGION_NAME` and compare it to the inventory's `name`, which
is what `address-autocomplete.tsx`'s equivalent docblock claims happens), or drop the `export` keyword
and the justification with it.

### IN-03: `Back` moved from a functional `setState` updater to a closure read

> **✅ FIXED, FREE — `1c2e3e7`** (inside the WR-02 commit). `Back` is now `stepBack`, i.e.
> `setStep((s) => Math.max(s - 1, 0))` — the shipped pre-14-09 form restored. It was genuinely free
> rather than scope creep: WR-02 moved arrival-recording out of the movers and into an effect on the
> current step key, which is the only thing that made `goToStep`'s recording load-bearing. Once that was
> gone, a relative move is one functional updater and the finding closes with it.

**File:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx:1731`

**Issue:** `onClick={() => setStep((s) => Math.max(0, s - 1))}` became `onClick={() => goToStep(step - 1)}`.
`goToStep` clamps, so the index stays valid, but two presses inside one batch now both compute
`step - 1` from the same captured value and land on the same step instead of moving back two. The
control is not disabled between presses (only during `saving`).

**Fix:** Keep the functional form inside `goToStep` for relative moves, e.g. add
`goBack()` that calls `setStep((s) => …)` and records the arrival off the resolved index.

### IN-04: `/host` issues the agenda read even when the component that consumes it is not rendered

> **Not fixed — out of scope** (Info). Note that the suggested one-liner now needs a third field:
> the fallback literal is `{ today: [], todayTruncated: false, next: null }` as of `ab2d2ce`, and
> `HostAgenda` is what will name it — `truncated` is a required prop.

**File:** `src/app/(host)/host/page.tsx:141`

**Issue:** `queryHostAgenda(db, …)` runs unconditionally, but `<HostAgenda …>` renders only inside
`hasListings ? … : <EmptyState …>`. A host with zero listings pays a two-bucket join that is
structurally guaranteed to return `{ today: [], next: null }`.

**Fix:** `const agenda = hasListings ? await queryHostAgenda(db, { hostId: session.user.id, now }) : { today: [], next: null };`
(the display map below already tolerates the empty shape).

### IN-05: The countdown that D-146 promoted to the loudest element on the row is driven by the browser clock

> **Not fixed — out of scope** (Info), but see the triage note at the head of this section: the
> null-deadline half renders a live request as instantly **Expired** and should be taken first.

**File:** `src/components/booking/request-countdown.tsx:164,188`, `src/app/(host)/host/requests/page.tsx:165`

**Issue:** `RequestCountdown` computes `target - Date.now()` at mount and per tick. That is a shipped,
documented "display cue only" decision and the DB clock remains the server-side authority — but this
phase moved the component to `emphasis="lead"`, making it the largest type in the row on all three
measured widths, so a host with a skewed clock now reads a wrong figure as the row's headline. Related:
`requests/page.tsx:165` falls back to `(r.expiresAt ?? new Date())`, so a `requested` row with a null
`expires_at` renders as instantly **Expired** on the one surface whose entire subject is that deadline.

**Fix:** Thread the already-read `now` (`readDbNow(db)`) into `RequestCountdown` as a `serverNow` prop
and compute `target - (serverNow + elapsedSinceMount)`, so the digits are anchored to the DB clock and
only the *elapsed* delta comes from the browser. For the null-deadline case, render the row without a
countdown rather than with an expired one.

---

_Reviewed: 2026-08-24T01:40:00Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
