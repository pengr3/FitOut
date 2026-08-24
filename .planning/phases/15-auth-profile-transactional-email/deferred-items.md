# Phase 15 — Deferred Items

Out-of-scope discoveries logged rather than fixed. Each names the file, what is wrong, and why it
was left alone.

---

## [15-11] `visual-baselines.ts`'s head paragraph is stale by two phases

**File:** `src/lib/design/visual-baselines.ts:36-40`

The scoping-rule section reads:

> TWENTY-ONE OF THE 51 ROWS ARE BLOCKED (`global-error` for a structural reason that has nothing to
> do with data, and twenty Phase-13 rows on a credential boundary and a missing fixture), so a
> complete run commits 30 PNGs; anyone reading "51 baselines" as "51 files" is wrong by exactly
> those twenty-one, which is why the count is stated here and pinned in `surfaces.spec.ts`.

Three of those numbers have been wrong since plan 13-15 moved the inventory to 66, and plan 15-11
moved it again. Current truth: **74 declared, 38 blocked, 36 shootable.**

**Why deferred:** pre-existing drift from 13-15/14-16, not caused by plan 15-11's change; that
plan's action says *"Touch nothing else in the file"*; and the file's **canonical** arithmetic lives
in the `BaselineCountIsSeventyFour` docblock, which plan 15-11 did update in full (including the
36-shot / two-replacements split). No gate reads this paragraph — it is a comment.

**What fixing it looks like:** replace the three numbers and the parenthetical breakdown, and add
the Phase-14 and Phase-15 contributions. One paragraph, no code.

---

## [15-11] `EXPECTED_BLOCKED`'s neighbouring prose still says "ONE ENTRY AS OF PLAN 12-14"

**File:** `e2e/visual/surfaces.spec.ts` — the docblock immediately above `EXPECTED_BLOCKED`

The list has held 21 entries since plan 13-15 and 22 since 15-11. The paragraph's *argument* (a
surface joining the blocked list must do so deliberately; a surface leaving it is coverage won) is
still correct and still load-bearing — only its count is stale.

**Why deferred:** pre-existing, a comment, and the block-level notes that 13-15, 14-16 and 15-11
each added directly above their own entries already state the real per-phase counts.

---

## [15-11] AUTHUI-03's keyboard and AA clauses are not evidenced — the requirement stays unticked

**Requirement:** *"The auth screens hold the same five gates as every other surface — 320px,
keyboard, AA, designed states, and a baseline."*

Three of five hold: **320px** (15-07's measurements + 15-10's standing 40-case
`overflow-320.spec.ts` harness), **designed states** (`(auth)/error.tsx`, the two form-replacing
branches measured in 15-07, and `loading-coverage.test.ts` affirmatively refusing a `loading.tsx`
for these routes), and **baseline** (plan 15-11, comparison run `32752143309`).

**KEYBOARD — the gap.** The phase's only keyboard evidence is 15-07's ten-press tab walk on
`/reset-password?token=abc123`, and 15-07 states plainly that it exists to discharge **T-15-25**
(the hidden token input must never receive focus). That is a threat mitigation about one input.
`/login`, `/signup` and `/forgot-password` have **no recorded keyboard walk**, and grepping `e2e/`
for a Tab press returns only `overflow-320.spec.ts`, a geometry harness.

**What closing it looks like:** a tab-order walk over all four screens, recorded as 15-07 recorded
its one — the focus sequence written out, not asserted. The wordmark is the first tabbable element
on all four and keeps the browser-default indicator (`(auth)/layout.tsx` argues why), so the walk
should confirm that too.

**AA — the gap.** `tests/design/contrast.test.ts` is a **token-layer** gate: ≥39 declared pairings
and ≥24 tokens per theme, both themes. It proves the palette clears AA; it cannot see a surface
composing two legal tokens in a combination no pairing row covers. Phase 15's only contrast-adjacent
line is 15-07's `git diff --exit-code src/lib/design/contrast-pairs.ts` → exit 0, which asserts *no
new pairing was declared* — a negative check, not a measurement.

This matters specifically because **D-162 changed the composition under it**: the wordmark now sits
directly on `bg-muted` where the public header previously supplied its own surface.
`(auth)/layout.tsx` cites `foreground` on `muted` at 18.16 court / 16.89 grove, but that pairing was
declared and measured in an earlier phase against a different composition.

**What closing it looks like:** measure the ink-on-ground pairs the four auth screens actually
render, and declare any that are not already rows in `contrast-pairs.ts`.

**Why this is a planning gap rather than an execution failure:** `15-VALIDATION.md` maps AUTHUI-03
to exactly three rows — `15-10-02`, `15-11-01`, `15-11-02` — **all three now discharged**. It never
maps a keyboard row or an AA row to the requirement at all, so two of its five clauses were never
sampled.

---

## [15-11] `gate-visual` was RED on `dev` for days, and the 15-11 dispatch cleared it as a side effect

**Evidence:** CI run **`32566576437`** (2026-08-22, two days before Phase 15 began) already failed
`gate-visual` on a broad set — `auth-login`, `booking-confirmed`, `booking-group`, `booking-moment`,
`booking-not-found`, `checkout`, `collision-notice`, `dev-theme`, `global-error`, … including
`grove` variants. Run **`32751395157`** (immediately before the 15-11 regeneration) still failed on
ten of them plus `auth-login`.

The 15-11 generation run `32751407382` re-minted **ten surfaces this plan never touched**:
`collision-notice-1280`, `listing-detail-{320,768,1280}`, `listing-sheet-375`,
`search-relax-band-{320,1280}`, `search-results-{320,768,1280}`. `gate-visual` is now green for the
first time since at least 2026-08-22.

**The finding:** `--update-snapshots` accepts whatever was on screen that day. Ten references were
replaced without anyone reading the diff, so **whatever product change drifted those surfaces
between 2026-08-22 and now is baked into the new baselines as "correct"**. `baselines.yml`'s own
header states the principle — *writing is not comparing* — and its warning step says so out loud on
every run.

**Not this plan's to fix:** the drift predates the phase, and plan 15-11 changed no rendered pixel
(`visual-baselines.ts` is imported by nothing in `src/` — only by three files under `e2e/`). But the
green gate is now younger than the drift it accepted, and the verifier should know that before
reading `gate-visual` green as evidence about those ten surfaces.

**What closing it looks like:** identify what changed those ten between 2026-08-22 and 2026-08-25
(git log over `src/app/(public)`, `src/app/listings`, the search and collision components), and
confirm the re-minted references are correct rather than merely current. Eight of the ten moved by
5–32 bytes (antialiasing noise); `search-results-1280` (+2098 B) and `search-relax-band-1280`
(+1666 B) moved meaningfully and are the two worth looking at first.

---

## [15-12] The `/signup` intent pair is TWO tab stops, not one — WAI-ARIA would prefer one plus arrow keys

**Evidence:** the tab-order walk plan 15-12 added (`e2e/auth-keyboard.spec.ts`) records `/signup` as
14 stops, and stops 2 and 3 are both members of the intent radio group:

```
a:FitOut@main → button[radio]:Book a space → button[radio]:Host a space → input[text]:First name → …
```

`src/app/(auth)/signup/page.tsx` renders the pair as two native `<button type="button" role="radio">`
elements inside a `role="radiogroup"`, with **no roving tabindex** — so each is independently
focusable and a keyboard user tabs *through* the group rather than into it and along it with arrows.

**Why it is an observation and not a defect:** WCAG **2.1.1 (Keyboard) is satisfied either way** —
every control is reachable and operable from the keyboard, which is the conformance bar AUTHUI-03's
keyboard clause is written against. What differs is the **authoring practice** in the WAI-ARIA
Authoring Practices radiogroup pattern (one tab stop, arrow keys to move the selection), which is a
usability convention rather than a success criterion.

**Why 15-12 did not fix it:** adding roving tabindex plus arrow-key handling is a **behaviour
change** to a shipped control, on a plan whose contract is that it moves zero rendered pixels and
modifies nothing under `src/` (`git diff --exit-code src/` is one of its verification gates). Plan
15-07 also froze that pair's markup byte-identical while restyling everything around it, with its own
reasoning written beside it. Changing the interaction contract inside a test-only gap-closure plan
would be exactly the scope creep the phase's gap-closure pass exists to avoid.

**What closing it looks like:** a small plan that gives the group a roving tabindex (selected member
`tabIndex={0}`, the other `tabIndex={-1}`), adds ArrowLeft/ArrowRight/ArrowUp/ArrowDown handling that
moves focus AND selection, and updates `/signup`'s declared sequence in `e2e/auth-keyboard.spec.ts`
from 14 stops to 13 — the walk is already the gate that would catch a half-done version.

---

## [15-12] `overflow-320.spec.ts`'s AC#30 target-size scan races the surface it measures

**Evidence, measured 25 August 2026 across five runs of
`npx playwright test e2e/overflow-320.spec.ts --project=chromium`:**

| run | tree | result |
|---|---|---|
| 1 (pre-task baseline) | `HEAD`, unmodified | **60 passed / 15 skipped**, exit 0 |
| 2 | 15-12's helper extraction applied | 1 failed — `the confirmed detail, no query · grove` |
| 3 | 15-12's helper extraction applied | 1 failed — `the confirmed detail, no query · court` |
| 4 | **`git checkout --` reverted to HEAD**, `--grep "AC#30"` | 1 failed — **`the receipt · court`** |
| 5 | 15-12's extraction applied, `--retries=2` (the CI policy) | **59 passed / 1 flaky / 15 skipped, exit 0** |

Every failure is the same assertion, `expectTargets` at `overflow-320.spec.ts:1266`:

```
Error: the confirmed detail, no query · court · 320px: the target-size scan found ZERO
interactive controls INSIDE the surface. … An empty list is a page that did not render or a
selector that stopped matching, never a clean result.
expect(received).toBeGreaterThan(expected)   Expected: > 0   Received: 0
```

**It is not plan 15-12's:** run 4 is the decisive one — the file **reverted to `HEAD`** fails the same
assertion in the same block, on a different row. The row that fails varies run to run (`the receipt`,
`the confirmed detail` in either theme), and run 5 shows it **passes on retry**, which is the
signature of a race rather than a regression. 15-12 moved three focus declarations into
`e2e/helpers/focus.ts`; `expectTargets` neither calls nor is called by any of them, and it runs
*before* `expectVisibleFocus` in the case body.

**Not accumulated fixture state, checked rather than assumed.** The suspicion was that an aborted
serial block leaves rows behind — `booking_group.booking_id` is `ON DELETE RESTRICT`, so an orphan
group row would block `states.teardown()` from deleting a booking whose id (`e2e_p13sweep_confirmed`)
is a FIXED literal. Queried directly against the dev database after a failing run:

```
SELECT … FROM booking       WHERE id LIKE 'e2e_p13sweep%'  -> 0 rows
SELECT … FROM booking_group WHERE booking_id LIKE 'e2e_p13sweep%' -> 0 rows
SELECT count(*) FROM listing WHERE title LIKE 'E2E Phase13 Sweep%' -> 0
```

Teardown works. The database is clean between runs, so the cause is in-page timing.

**The likely mechanism:** the case's reachability `tell` (`booking-detail`) is satisfied by the
server-rendered detail shell, and `expectTargets` runs immediately after `expectNoOverflow` with no
wait for the surface's *actions* to paint. On a loaded box the scan can land after the shell and
before the buttons, and a zero-control read is exactly what the assertion's own message says it must
never treat as clean — so the assertion is behaving correctly and the instrument is under-synchronised.

**What closing it looks like:** give `expectTargets` its own precondition on the surface's first
action — a `expect(page.locator(SEL-inside-main)).not.toHaveCount(0, { timeout: 15_000 })` before the
`evaluate`, the same measured 15s allowance `expectReachable` already carries for the dev server's
on-demand compiles. That keeps the "zero is never clean" claim while removing the race that makes it
fire on a correct tree. Out of scope for 15-12, whose contract is that it changes no assertion, row
or count in that file.

---

## The colour-class classifier now has two implementations (plan 15-13, not a regression)

**Found:** while writing `tests/design/auth-contrast.test.ts`'s completeness census.

**What it is.** The rules for turning a class string into colour uses — split the variant chain at
bracket depth zero, then treat `text-<x>` / `bg-<x>` as a colour only when `<x>` is a declared colour
token — now exist twice in the repository: in `tests/design/pair-drift.test.ts` (`splitVariants`,
`classifyUtility`, `colourUsesIn`) and again in `tests/design/auth-contrast.test.ts`. The second copy
is faithful, and both files pin the same behaviours (`text-sm` / `text-center` / `text-balance` /
`text-heading` are not colours; `data-[state=on]:` splits at depth zero), so a drift in the direction
that matters is caught in both places. But it is still two implementations of one rule.

**Why it was not fixed in 15-13.** Plan 15-13 extracted the WCAG *maths* to
`tests/design/helpers/contrast-math.ts` precisely because two gates measuring one pairing must not be
able to disagree about a NUMBER. Classification is a weaker case — two classifiers disagreeing produce
two different *reports*, not two different ratios — and the fix is a different shape: it means lifting
a ~300-line scanner out of `pair-drift.test.ts`, a file 15-13's own verification requires to be left
byte-unchanged and re-run green. Doing it inside a gap-closure plan would have put an untouchable
gate's internals into a commit whose contract is "move no pixel and change no neighbouring gate".

**What closing it looks like.** A `tests/design/helpers/class-analysis.ts` beside `compile-css.ts` and
`contrast-math.ts`, exporting `splitVariants`, `classifyUtility` and `colourUsesIn`, imported by both
files — the same one-import-site rule (D-16) applied a third time, to the parsing. The move is
mechanical; the cost is that `pair-drift.test.ts`'s test count must be proven identical before and
after, exactly as `contrast.test.ts`'s 89 was for the maths extraction.

**Not urgent.** Nothing is currently wrong: the two copies agree, both are pinned, and the auth census
is the only consumer of the second one.

---

## `(auth)/error.tsx`'s header still describes the pre-D-162 composition (plan 15-13, cosmetic)

**Found:** while assembling the auth composition file set for the census.

`src/app/(auth)/error.tsx`'s opening comment says *"`(auth)/layout.tsx` renders `PublicHeader` and no
session gate"*. D-162 (plan 15-06) deleted the header from that layout and moved the wordmark into it;
`(auth)/layout.tsx` itself records the change at length. The boundary's own ARGUMENT is unaffected —
the route out is still `/login` because the visitor is still anonymous — and the file renders no
colour utility, so nothing measured in 15-13 depends on it.

**Why it was not fixed in 15-13.** Editing it would modify a file under `src/app/(auth)`, and that
plan's verification asserts `git diff --exit-code 'src/app/(auth)'` exits 0 — a comment-only edit
there would still have to be justified against a visual-baseline dispatch policy it cannot trigger but
also cannot be shown not to trigger without re-running CI. Correcting the sentence is a one-line
`docs(...)` change for whichever plan next has that file open.
