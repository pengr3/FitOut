---
phase: 17-cross-cutting-audit-themes-responsive-a11y-baselines
reviewed: 2026-08-30T14:30:00Z
depth: standard
diff_base: e439bf9
files_reviewed: 43
files_reviewed_list:
  - e2e/auth-keyboard.spec.ts
  - e2e/avatar-crop.spec.ts
  - e2e/axe-sweep.spec.ts
  - e2e/helpers/axe.ts
  - e2e/helpers/nowrap.ts
  - e2e/helpers/theme.ts
  - e2e/helpers/visual-drive.ts
  - e2e/host-headings.spec.ts
  - e2e/keyboard-composites.spec.ts
  - e2e/mobile-booker-path.spec.ts
  - e2e/one-tree.spec.ts
  - e2e/overflow-320.spec.ts
  - package.json
  - src/app/(app)/dev-throw-app/page.tsx
  - src/app/(auth)/dev-throw-auth/page.tsx
  - src/app/(host)/host/dev-throw/page.tsx
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/app/(host)/host/listings/page.tsx
  - src/app/(legal)/dev-throw-legal/page.tsx
  - src/app/listings/[id]/(detail)/page.tsx
  - src/components/availability/availability-calendar.tsx
  - src/components/group/group-refresh.tsx
  - src/components/group/regenerate-link-button.tsx
  - src/components/group/remove-attendee-button.tsx
  - src/components/listing/listing-card.tsx
  - src/components/patterns/site-chrome.tsx
  - src/components/search/search-bar.tsx
  - src/components/search/search-results.tsx
  - src/components/theme/theme-provider.tsx
  - src/components/ui/slider.tsx
  - src/lib/design/contrast-pairs.ts
  - src/lib/design/selector-contract.ts
  - src/lib/design/visual-baselines.ts
  - src/lib/dev/today-override.ts
  - tests/design/brand-recipe.test.ts
  - tests/design/focus-definition.test.ts
  - tests/design/gitignore-baselines.test.ts
  - tests/design/legal-copy.test.ts
  - tests/design/loading-coverage.test.ts
  - tests/design/money-path-invariants.test.ts
  - tests/design/one-tree.test.ts
  - tests/design/pair-drift.test.ts
  - tests/security/dev-today-override.test.ts
findings:
  critical: 0
  warning: 6
  info: 5
  total: 11
status: issues_found
---

# Phase 17: Code Review Report

**Reviewed:** 2026-08-30
**Depth:** standard (per-file, with cross-file tracing on the `?today=` seam)
**Files Reviewed:** 43 (baseline PNGs and `.planning/` artefacts excluded)
**Status:** issues_found — **0 Critical**, 6 Warning, 5 Info

## Summary

The phase's headline risk — the new `?today=` server seam on the public listing route — is **sound**, and
I say that from measurements rather than from reading the guard. It does **not** reach a money path, a
booking mutation, a price, or a listing selection; it cannot crash on hostile input; and its production
inertness test is genuinely non-vacuous. Details and the four probes are in
[§ The `?today=` seam — what I verified](#the-today-seam--what-i-verified) below.

What the review did surface is a cluster of **instrument defects**: five assertions or idioms that state a
property they do not enforce. That is exactly the defect class this phase named as its own target, so the
findings are weighted accordingly. One product-code defect is also reported: the wizard's progress bar was
given an accessible **name** this phase while its **value** never reaches the accessibility tree at all —
a bug in the vendored `ui/progress.tsx` that the phase's own new docblock mis-describes.

Nothing in this diff touches `src/lib/booking`, `src/lib/payments`, `src/app/actions/**` or `drizzle/`.
`tests/design/money-path-invariants.test.ts` was **tightened** (a byte-digest over `drizzle/` was added),
which is a net improvement to the money-path guard.

**Gates I re-ran on this tree:**

| Command | Result |
|---|---|
| `npx vitest run tests/security/dev-today-override.test.ts` | 17 passed |
| `npx vitest run --config vitest.design.config.ts` | 66 files, 1248 passed / 3 skipped |

Known deferred items `[17-D1]`…`[17-D26]` are **not** re-reported. Where a finding touches one, it says so.

---

## The `?today=` seam — what I verified

The four questions asked of `src/lib/dev/today-override.ts`, each answered with how it was checked.

**1. Can the guard be bypassed? What is the blast radius if the seam is live?**

The guard is sound and the blast radius outside production is display-only.

- `process.env.NODE_ENV === "production"` is the first statement (`src/lib/dev/today-override.ts:47`),
  and it matches the existing precedent verbatim (`src/components/theme/theme-query-param.tsx`). Any
  `next build` output — including a staging or preview deploy — sets `NODE_ENV=production`, so the seam is
  inert there. It is live only under `next dev`.
- `playwright.config.ts:111` boots `npm run dev`, so it **is** live where the baselines are shot. That
  half of the claim is true.
- **Where the override actually lands** (traced through `src/app/listings/[id]/(detail)/page.tsx`):
  `todayStartMs`/`horizonEndMs` (`:435-448`) → `openOnSearchedDay` (`:453-460`) → `initialDate` (`:463`)
  → `getAvailability(db, id, initialDate)` (`:469`) and `todayDate={todayLocal}` on the calendar
  (`:615`, `:794`, `:842`).
- **It cannot widen bookability.** `getAvailability` takes its own `now: Date = new Date()`
  (`src/lib/availability/read-model.ts:177`) and derives `past` / `beyond_horizon` / `too_soon` from that
  real clock (`:308-310`). The override is never passed as `now`. So a client-controlled "today" moves
  the calendar's *caption, today-ring and disabled matcher* and nothing else: a past day the picker no
  longer greys out still returns a grid of `past` slots, `seedSelectionFromWindow` (`page.tsx:171-198`)
  refuses to seed a run that is not `available`, and `placeHold` re-derives inside its own transaction
  behind the GiST `EXCLUDE` constraint. **No money path, no availability widening, no booking decision.**

**2. Is the parsing safe?**

Yes. `parsePickedDate` (`src/lib/search/window-params.ts:39-53`) is an anchored, non-backtracking regex
(`/^(\d{4})-(\d{2})-(\d{2})$/` — no nesting or alternation, so no ReDoS), followed by a range check and a
`Date.UTC` round-trip. I ran the parser standalone over hostile inputs: `2026-02-31` → `null`,
`2027-02-29` → `null`, `__proto__` → `null`, trailing space/newline → `null`, `0000-01-01` and
`0099-06-15` → `null` (the round-trip guard catches JS's 1900-offset for two-digit years). `\d` without
the `u` flag is ASCII-only, so no unicode-digit smuggling. Nothing is cast, nothing reaches SQL as a
string, no `Invalid Date` escapes — the function returns a plain `{year, month, day}` triple or `null`.
The one accepted extreme, `9999-12-31`, feeds `new TZDate(9999, 11, 31 + 90, tz)`, which is well inside
JS's date range and renders a calendar for the year 10000. Harmless, dev-only.

**3. Does the override reach anything beyond rendering?**

It reaches one DB read — `getAvailability` — with a bounded `{year, month, day}` triple, plus
`getOpenMonthAvailability` for one month. Neither mutates. See (1) for why the read cannot produce a
bookable past slot.

**4. Is the test vacuous?**

**No — and this is the important one, given the repo's history.** `tests/security/dev-today-override.test.ts`
carries an explicit positive control: `:29-33` stubs `NODE_ENV=production` and asserts `null` for
`"2026-09-16"`, and `:36-40` asserts the **same input** returns `{year: 2026, month: 9, day: 16}` without
the stub. I ran the file: both pass. That pair is conclusive — it proves the `NODE_ENV` read is dynamic
under Vitest (not statically replaced), so removing the guard would flip `:31` from `null` to the triple
and the test would go red. The suite additionally pins the guard's exact spelling, its position as the
first statement, and that the module reads no other env var. Three of its *other* assertions are weaker
than they read; those are WR-01, WR-02 and WR-03 below.

**The four `dev-throw` routes:** the security control holds, independently of the status code. In
production the first statement is `notFound()`, so `new Error(SENTINEL_LEAK_PROBE)` is never constructed.
For `/host/dev-throw` specifically, `src/app/(host)/host/layout.tsx:12-27` awaits the session and
redirects **before** the segment's `loading.tsx` Suspense boundary can flush, so an anonymous request is
answered by the redirect and never sees the host shell; only an already-authenticated host reaches the
soft-404, and the shell it receives is its own. That matches the probe recorded in the file's own header
(`SENTINEL_LEAK_PROBE x0`, `error-state x0`). The 200-vs-404 half is `[17-D2]` and is not re-reported.

---

## Critical Issues

None found.

---

## Warnings

### WR-01: The "no hand-rolled date regex" guard in the security test cannot detect a hand-rolled date regex

**File:** `tests/security/dev-today-override.test.ts:100`
**Severity:** Warning

**Issue.** The assertion is:

```ts
// No hand-rolled date regex in this file — the one in window-params.ts is the only one.
expect(SOURCE).not.toMatch(/\d\{4\}/);
```

In a JS regex literal, `\d` is the *digit* class and `\{` is a literal brace, so `/\d\{4\}/` matches
"a digit immediately followed by the characters `{4}`" — e.g. the string `2{4}`. It does **not** match the
source text `\d{4}`, because the character before `{` there is `d`, not a digit.

**Measured**, not inferred. I ran the exact assertion against a realistic offending line:

```
hypothetical line     : const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
test regex source     : \d\{4\}
test regex catches it?: false
intended regex catches it?: true      // /\\d\{\d+\}/
```

So the guard passes today and would also pass the day someone pastes a second date parser into
`today-override.ts` — which is precisely the drift the test's own comment says it prevents. It is
false safety, and false safety on the file that owns a query-parameter seam is worse than no assertion,
because the next reader will trust it.

**Fix:**

```ts
// `\\d` matches a LITERAL backslash-d in the source text; `\d` matches a digit and never will.
expect(SOURCE).not.toMatch(/\\d\{\d+\}/);
```

Add a red-watch line to the docblock recording that the corrected regex was tried against a synthetic
offender and matched.

---

### WR-02: `"is imported by exactly one route file"` asserts no count, and cannot fail when a second importer appears

**File:** `tests/security/dev-today-override.test.ts:109-121`
**Severity:** Warning

**Issue.** The test's name and its docblock both state a *blast-radius* property — *"A dev-only seam that
spreads is no longer a seam. If this count grows, the new call site needs its own argument for why a
request parameter may steer it."* The body computes no count. It reads one known file and asserts that
file contains the import:

```ts
const page = readFileSync(path.join(process.cwd(), "src/app/listings/[id]/(detail)/page.tsx"), "utf8");
expect(page).toContain('from "@/lib/dev/today-override"');
```

Adding `devTodayOverride` to a second route, a server action, or a client component leaves this green.
The property the test is named for is unenforced.

I confirmed the property currently **holds** — `grep -rn "today-override" src/` finds exactly one
non-comment importer, `src/app/listings/[id]/(detail)/page.tsx:96` — so this is an instrument defect,
not a live one.

**Fix:** walk the tree and assert the whole set, so the number is the assertion:

```ts
const importers = walk("src")
  .filter((f) => /\.tsx?$/.test(f))
  .filter((f) => /^\s*import .*["']@\/lib\/dev\/today-override["']/m.test(readFileSync(f, "utf8")));
expect(importers.map(rel).sort()).toEqual(["src/app/listings/[id]/(detail)/page.tsx"]);
```

---

### WR-03: `vi.stubEnv("NODE_ENV", "production")` is restored in the test body, so a real failure poisons every test after it

**File:** `tests/security/dev-today-override.test.ts:29-35`
**Severity:** Warning

**Issue.**

```ts
it("returns null for a PERFECTLY VALID date when NODE_ENV is production", () => {
  vi.stubEnv("NODE_ENV", "production");
  expect(devTodayOverride("2026-09-16")).toBeNull();
  vi.unstubAllEnvs();          // ← never reached if the expect throws
});
```

`expect` throws on failure, so `vi.unstubAllEnvs()` is skipped and the stub survives into the rest of the
file. **Verified** that Vitest will not clean it up automatically: `unstubEnvs` defaults to `false`
(`node_modules/vitest/dist/chunks/reporters.d.*.ts:2970-2974`, `defaults.9aQKnqFk.js:55`) and is set in
neither `vitest.config.ts` nor `vitest.design.config.ts` nor `tests/setup.ts`.

The consequence is specific and bad: if the production guard ever regresses, test 1 fails **and** leaks
`NODE_ENV=production`, which then fails the positive control at `:36` and every row of the parse table at
`:82-96`. One true finding is reported as seven, and the positive control — the thing that exists to prove
the suite is not vacuous — becomes the loudest false alarm in the output. A reader triaging that is being
actively misled about which assertion broke.

**Fix:**

```ts
afterEach(() => {
  vi.unstubAllEnvs();
});
```

(or set `unstubEnvs: true` in `vitest.config.ts`, which fixes the class rather than the instance).

---

### WR-04: The "skipped test that THROWS its reason" idiom does not put the reason in the run's output

**Files:**
`e2e/axe-sweep.spec.ts:889-891` · `e2e/one-tree.spec.ts:734-736` ·
`e2e/mobile-booker-path.spec.ts:1252-1254` · `e2e/overflow-320.spec.ts:958-960` and `:2221-2223`
**Severity:** Warning

**Issue.** Four files now carry this shape, each with a comment asserting what it buys:

```ts
// NAMED, never silent. The reason travels into the run's own output, which is what makes a
// gap in this sweep something a reader meets rather than something they have to notice.
test.skip(title, () => {
  throw new Error(`not measured: ${row.skip}`);
});
```

The body of a declared-skipped Playwright test is **never executed**, so the `throw` is dead code and
`row.skip` never reaches the report. The only thing the run prints is `title` — and in all five sites
`title` is built from the row name, the theme and the width, and contains no part of the reason.

**Verified** against the installed Playwright's own typings
(`node_modules/playwright/types/test.d.ts`, the `skip(title, body)` overload at `:4296`): *"You can
declare a skipped test, and Playwright will not run it."* Runtime skipping with a description is the
other overload — `test.skip(condition, description)` — which is called *inside* a running body and does
record its description.

So threat **T-17-45** (*"a bare `test.skip()` prints a grey line and says nothing, which is
indistinguishable in a run's output from a surface nobody thought to measure"*) is stated as closed and
is not closed. The gap still lives only in the source file.

**Provenance, stated so this is not mis-assigned:** the idiom is inherited, not invented — it is present
at the phase base commit in `e2e/overflow-320.spec.ts:721` and `:1348` (`git show e439bf9:...`). What this
phase did was propagate it to three more files and add two more sites, and re-state the false claim in
each.

**Fix** (either; the first is a one-line change per site):

```ts
// (a) put the reason where the reporter will actually print it
test.skip(`${title} — ${row.skip}`, () => {});

// (b) or use the runtime overload, whose description IS recorded as an annotation
test(title, async () => {
  test.skip(true, row.skip);
});
```

---

### WR-05: `ListingCard`'s new `titleAs` docblock justifies the default with a call site that does not exist, and the default is unreachable

**File:** `src/components/listing/listing-card.tsx:159` (the default) and `:196-213` (the docblock)
**Severity:** Warning

**Issue.** The docblock's central argument is:

> ⚠ THE DEFAULT IS THE SEARCH GRID'S LEVEL, AND IT IS CORRECT THERE — MEASURED (plan 17-07). On `/`
> the outline is `h1` "Find a space to play" → `h2` the results heading (`search-results.tsx:187`) →
> these titles, so `h3` is the right rung […] Changing the default to `h2` would have flattened the
> search grid's titles into siblings of the results heading they belong under.

**Measured: `/` does not render this component.** `src/components/search/search-results.tsx:116` renders
`SearchResultCard`, which composes `ResultCard`
(`src/components/search/search-result-card.tsx:41,248`), and that pattern hard-codes its title at
`src/components/patterns/result-card.tsx:153`:

```tsx
<h3 className="font-semibold leading-snug">{title}</h3>
```

`grep -rn "<ListingCard" src/` returns exactly **one** call site for this component —
`src/app/(host)/host/listings/page.tsx:170` — and it passes `titleAs="h2"`. (The only other `ListingCard`
identifier in `src/` is a *different, locally-declared* component inside
`src/app/listings/[id]/opengraph-image.tsx:72`.) `src/app/dev/theme/fixtures.ts:258` states the same fact
plainly: *"`ListingCard` is a HOST management surface."*

Two consequences:

1. The `"h3"` default is **dead configuration** — no call site exercises it, and no test covers it
   (`grep -rn "titleAs" tests/listing/` is empty).
2. The stated reason for keeping it is about a component the prop cannot reach, and the same claim is
   repeated in `deferred-items.md:854` (*"the same card is **correct** on `/`"*). The next person who
   adds a `ListingCard` will inherit an "argued, measured" default that was never measured for anything.

This is a documentation-truth defect with a real downstream cost, not a style nit: it is the same class
the phase itself lists as *"correcting a stale comment that promises coverage this phase did not build."*

**Fix:** correct the docblock to the measured facts — the card has one call site, it passes `h2`, the
`h3` default is currently unexercised, and `/`'s `h3` is `result-card.tsx:153`'s and is not settable —
or drop the default entirely and make `titleAs` required, so the one call site states its rung and a
second one has to think:

```ts
titleAs: TitleTag,       // no default; the page owns the rung
...
titleAs: "h2" | "h3";
```

---

### WR-06: The wizard progress bar was given a name this phase, but its **value** never reaches the accessibility tree

**File:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx:899` (the changed line);
root cause `src/components/ui/progress.tsx:8-20`
**Severity:** Warning

**Issue.** The change is:

```tsx
<Progress value={progress} aria-labelledby="wizard-step-progress-label" />
```

`aria-labelledby` is forwarded correctly (it rides `...props` onto `ProgressPrimitive.Root`). `value` is
**not**. The vendored wrapper destructures it out of the spread and uses it only for the indicator's CSS
transform:

```tsx
function Progress({ className, value, ...props }) {         // value removed from props
  return (
    <ProgressPrimitive.Root data-slot="progress" className={cn(...)} {...props}>
      <ProgressPrimitive.Indicator style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  );
}
```

**Verified** against the installed Radix build (`node_modules/@radix-ui/react-progress/dist/index.mjs`):
`value: valueProp = null` at `:16`, and `"aria-valuenow": isNumber(value) ? value : void 0` at `:35`.
With no `value` prop, Root is indeterminate and emits **no `aria-valuenow`**.

So the shipped element is `role="progressbar"` with a name, `aria-valuemin`/`aria-valuemax`, and no
current value — while the bar visibly fills to N%. That is WCAG 2.2 SC 4.1.2's **Value** clause, on a
booker-adjacent host surface: exactly the defect D-197 fixed one control over, on the slider, in this same
phase. The axe sweep did not catch it because `aria-valuenow` is *optional* for `progressbar` (an
indeterminate bar is legal ARIA), so no rule fires.

The new docblock at `wizard.tsx:880-884` also mis-describes the state it fixed:

> a `role="progressbar"` with no name at all […] so a screen-reader user heard a percentage with
> nothing saying what it measured.

There was no percentage to hear, before or after. The fix supplied the name; the value is still absent.

**Fix** (in the vendored primitive, which is where the bug is; one call site is affected):

```tsx
function Progress({ className, value, ...props }: React.ComponentProps<typeof ProgressPrimitive.Root>) {
  return (
    <ProgressPrimitive.Root data-slot="progress" value={value} className={cn(...)} {...props}>
      <ProgressPrimitive.Indicator style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </ProgressPrimitive.Root>
  );
}
```

and pin it — `getByRole("progressbar")` should carry `aria-valuenow` equal to `progress` at each step.
If the edit is out of scope for an audit phase, this belongs in `deferred-items.md` with the measurement
above, and the `wizard.tsx` docblock's "heard a percentage" sentence should be corrected in the same
commit.

---

## Info

### IN-01: `searchParams` is typed narrower than Next's runtime shape; the seam's reject table has no repeated-parameter row

**File:** `src/app/listings/[id]/(detail)/page.tsx:199-212`; test at `tests/security/dev-today-override.test.ts:82-96`
**Severity:** Info

Next's App Router hands `searchParams` values as `string | string[] | undefined`; the page declares
`today?: string` (as it already does for `date`, `start`, `end`, `resume`, `passes`). For `?today=a&today=b`
the runtime value is an array, and TypeScript cannot see it.

**Measured** against the real parser: a two-element array coerces to `"2026-09-16,2026-09-16"`, fails the
anchored regex, and returns `null` — so the current behaviour is safe. A **one-element** array does parse
(`String(["2026-09-16"]) === "2026-09-16"`), though Next does not produce one for a single occurrence.

The point is that the safety is incidental, and the seam's own "it parses, never trusts" table does not
cover it. Add a row so the property is pinned rather than lucky:

```ts
["a repeated parameter", ["2026-09-16", "2026-09-16"] as unknown as string],
```

and/or normalise at the call site: `devTodayOverride(Array.isArray(sp.today) ? undefined : sp.today)`.

---

### IN-02: Production inertness is proven behaviourally; the "dead-code eliminated out of the bundle" half is asserted, and nothing re-runs the probe

**Files:** `src/lib/dev/today-override.ts:24-29`; `17-14-SUMMARY.md:482-494`; `playwright.config.ts:111`
**Severity:** Info

The summary's production probe (dev `:3000` honours `&today=`, prod `:3101` does not, identical in every
field) is real evidence and I have no reason to doubt it. Two smaller things are worth naming:

- The stronger claim — *"the affordance is absent from the production bundle, not merely skipped"* — is
  about bundler output, and the probe measures behaviour. I did not verify it (it would take a full
  `next build` plus a grep of `.next/server`), and it is **not what the security property rests on**: the
  runtime guard is sufficient either way. Consider softening the sentence to what was measured, or
  recording a `grep` of the built server chunk as its evidence.
- Nothing in CI re-runs the production probe. `playwright.config.ts:111` boots `npm run dev`, so every
  e2e row — including the four `dev-throw` rows — exercises the *development* branch of all five guards.
  The unit test does pin the guard's spelling, position and single-env-read property, which is a good
  substitute; a `next build && next start` smoke asserting `?today=` is ignored and `/dev-throw-*` 404s
  would close the remaining gap cheaply.

---

### IN-03: The four dev-throw routes import a constant out of another route module

**Files:** `src/app/(app)/dev-throw-app/page.tsx:84` · `(auth)/dev-throw-auth/page.tsx:64` ·
`(host)/host/dev-throw/page.tsx:82` · `(legal)/dev-throw-legal/page.tsx:66`
**Severity:** Info

`import { SENTINEL_LEAK_PROBE } from "@/app/dev/throw/page";` pulls a *page module* — with its `metadata`
export and its default component — into four other route graphs, so that five route files share one
string. It works and leaks nothing (the constant is `"SENTINEL_LEAK_PROBE"`, and these are server
components). But a route file is not a module boundary anyone expects to import from, and any future
side effect added to `dev/throw/page.tsx` would now execute in four extra graphs.

**Fix:** move the constant to `src/lib/dev/sentinel.ts` and have all five routes import it from there.

---

### IN-04: `listingUrl`'s docblock overstates what the `&today=` pin buys

**File:** `e2e/helpers/visual-drive.ts:333-361`
**Severity:** Info

> ⚠ `&today=` IS WHAT STOPS THESE BASELINES EXPIRING

It stops them expiring *at the next day-rollover*, which is the real and worthwhile win. It does not stop
them expiring: `getAvailability` reads the real clock (`src/lib/availability/read-model.ts:177,308`), so
once wall-clock time passes `VRT_COLLISION.dayIso` every slot on the pinned day reads `past`,
`seedSelectionFromWindow` returns `null`, and `expectSelectionSeeded` (`visual-drive.ts:379-399`) goes
red — which is the loud, correct failure that file's shelf-life note already describes at `:94-99`.

The bound is stated elsewhere in the same file, so this is a wording fix, not a behaviour one: make the
headline sentence read *"stops these baselines expiring at the next day-rollover; the fixture's own
shelf life is unchanged and is described above."*

---

### IN-05: The loading-coverage route census now counts four dev-only routes as product pages

**File:** `tests/design/loading-coverage.test.ts` (`EXPECTED_PAGES` 29 → 33, `EXPECTED_NON_QUALIFYING` 8 → 12)
**Severity:** Info

The bump is arithmetically correct (the four new pages are sync default exports and cannot suspend, so
they join the non-qualifying side and `EXPECTED_QUALIFYING` does not move), and the failure message
already tells the next reader to decide rather than bump. The observation is only that the gate's numbers
now mean "route files on disk" rather than "product routes", and 4/33 of the census is unreachable in
production. Excluding `dev-throw*` from the walk — with a one-line reason, as `legal-copy.test.ts`'s new
`LEGAL_NON_PROSE` does — would keep the number meaning what its name says.

---

## What I checked and found sound

Stated so the absence of a finding is a measurement rather than an omission.

- **`e2e/helpers/axe.ts` / `e2e/helpers/nowrap.ts`** — both new helpers carry real vacuity floors
  (`passes.length > 0`, `scannedNodes >= MIN_SCANNED_NODES`; `toHaveCount(1)`, non-empty text,
  finite line-height, `clientHeight > 0`). Neither can report green on an empty or unrendered subject.
- **`tests/design/one-tree.test.ts` and `tests/design/focus-definition.test.ts`** — both open with
  guard-the-guard blocks (scanned-file floors, "really parsed every file it counted", a synthetic
  offender the classifier must flag, and a pointed-at-nothing control). These are the opposite of vacuous.
- **`src/components/ui/slider.tsx:121`** — `aria-disabled={props.disabled || undefined}` is correct:
  `disabled` is not destructured, so it is still on `props`; `false || undefined` omits the attribute
  rather than rendering the string `"false"`. The matching test flip in `e2e/avatar-crop.spec.ts`
  (`data-disabled` → `toBeDisabled()`) is also correct — verified that `"slider"` is in Playwright's
  `kAriaDisabledRoles` (`node_modules/playwright-core/lib/coreBundle.js`), so `toBeDisabled()` does read
  `aria-disabled` on this element.
- **The five `size="touch"` conversions** — `touch` is `h-11 … px-4` against `default`'s `h-8 … px-2.5`,
  so height is preserved and padding grows 12px, exactly as the call-site comments claim. The
  `remove-attendee-button.tsx` claim of *zero* width change also holds: `className="px-3"` wins over the
  variant's `px-4` under tailwind-merge, and the `has-data-[icon=*]` padding rules never fire because its
  `UserRoundMinusIcon` carries no `data-icon` attribute.
- **`tests/design/money-path-invariants.test.ts`** — the new `drizzle/` byte digest is sound:
  `migrations()` sorts before hashing, and `committedBytes()` strips only the CR of a CRLF pair.
- **`e2e/host-headings.spec.ts`'s new `collectOutline`** — the document-order comparator is correct for
  distinct nodes and for containment, and the outline walk is fronted by a `outline.length > 0` floor.
- **No debug artefacts, secrets or dangerous calls introduced.** A scan of every added line for
  `console.log` / `debugger` / `eval(` / `innerHTML` / `dangerouslySetInnerHTML` / credential literals
  returned one hit: `e2e/axe-sweep.spec.ts:170`'s `PASSWORD = "averylongpassword"`, the pre-existing
  e2e fixture password used by ten other specs.

---

_Reviewed: 2026-08-30_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
_Diff base: `e439bf9`_
