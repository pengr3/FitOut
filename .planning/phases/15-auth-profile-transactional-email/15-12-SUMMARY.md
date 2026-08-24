---
phase: 15-auth-profile-transactional-email
plan: 12
subsystem: accessibility
tags: [keyboard, focus-order, playwright, a11y, wcag-2-1-1, threat-mitigation, gap-closure]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's D-162 composition — the wordmark-above-one-card `(auth)` layout whose wordmark is stop 1 on all six documents, and whose prose argues it keeps the browser-default indicator"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-07's ten-press walk on `/reset-password?token=abc123` — the format precedent, the T-15-25 mitigation this plan widens, and the `tabIndex` note it carries forward"
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-10's Phase-15 `ROUTES` block — the fixed-literal reset token and account-less forgot-password fixtures, whose reasoning this plan reuses rather than re-derives"
  - phase: 12-responsive-and-polish
    provides: "`overflow-320.spec.ts`'s `FocusReading` / `readFocus` / `expectRing`, the `expectReachable` 15s allowance, the 40-press bound and the WATCHED RED convention"
provides:
  - "`e2e/auth-keyboard.spec.ts` — six auth documents, 59 stops, the focus sequence written out as data and re-checked by a command"
  - "`e2e/helpers/focus.ts` — one definition of `FocusReading` / `readFocus` / `expectRing`, shared by the 320px harness and the keyboard walk"
  - "an indicator measured on every one of the 59 stops (73 including the `/signup` 320 repeat), against `overflow-320.spec.ts`'s two per route"
  - "the wordmark proven FIRST and proven to keep the browser default — `(auth)/layout.tsx`'s prose turned into three assertions"
  - "T-15-25 asserted on more than 15-07 left it: forward AND backward, matched on the field NAME, and mutation-proven twice"
  - "a reverse walk and a positive-`tabindex` census per document — the two checks a forward-only walk cannot make"
affects: [accessibility, 15-verification, 15-13, 15-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A focus SEQUENCE written out as data and asserted with one `toEqual` over the whole array, so an inserted stop prints as an insertion rather than as \"stop 4 differs\""
    - "A shared browser-side projection behind one `page.evaluate` with a mode parameter, so the focused reading and the unfocused baseline cannot describe the same element two different ways"
    - "A dev-server artifact excluded under ASSERTION (must be `nextjs-portal`, must be at the far edge) rather than filtered silently"
    - "A security assertion ordered BEFORE the assertion that would otherwise fire first, so a leak reports as a leak rather than as a diff"
    - "An indicator check that survives a fully-transparent ring — strip transparent layers, require a colour to remain"

key-files:
  created:
    - "e2e/auth-keyboard.spec.ts"
    - "e2e/helpers/focus.ts"
  modified:
    - "e2e/overflow-320.spec.ts"
    - ".planning/phases/15-auth-profile-transactional-email/deferred-items.md"

key-decisions:
  - "The dev overlay is PARTITIONED under assertion, not declared as a stop: `<nextjs-portal>` takes the last tab stop on every auth document but was absent on the first page load of a probe run, so declaring it would be flaky and ignoring it silently could hide a product control"
  - "`resetFocusToTop` walks backward with the keyboard before every forward walk — the post-submit branch removes the focused element, so Chromium resumes BELOW the wordmark and the walk would otherwise report a fact about how the document was reached rather than about the document"
  - "The T-15-25 block runs BEFORE the sequence assertion. Found by running M-B, not by reasoning: a tabbable token input also changes the sequence, and a leak reported as \"an array differs\" gets closed by editing the declaration"
  - "`expectIndicatorPaints` added beyond the plan's letter — `expectRing` plus the difference check both pass on a ring whose every layer is transparent, which is the unfailable-assertion shape this phase has shipped three of"
  - "The `/signup` intent pair being two tab stops is RECORDED as an observation and logged to `deferred-items.md`, not fixed — WCAG 2.1.1 is met, and changing it is a behaviour change this plan has no mandate for"

requirements-advanced: [AUTHUI-03]

metrics:
  duration: "~55 min"
  completed: 2026-08-25
  tasks: 2
  commits: 2
  files-created: 2
  files-modified: 2
  stops-recorded: 59
  indicators-measured: 73
  watched-reds: 3
---

# Phase 15 Plan 12: The Auth Surface's Tab Order, Recorded Summary

A standing Playwright harness that walks all six auth documents with real Tab presses, asserts the
focus sequence against 59 stop descriptors written out as data, measures a focus indicator on every
one of them, walks back to prove no trap, and hardens T-15-25 with two mutations proving it can fail
— without moving a single rendered pixel.

## What this closes

AUTHUI-03 is conjunctive across five gates and `15-VERIFICATION.md` found two never sampled. This
plan closes the **keyboard** one. Before it, the phase's only keyboard evidence was 15-07's ten-press
walk on `/reset-password?token=abc123`, which 15-07 states plainly exists to discharge T-15-25 — one
hidden input, one route. `/login`, `/signup` and `/forgot-password` had **zero** recorded keyboard
evidence. They now have a written-down sequence a command re-checks.

The AA gate remains 15-13's. **AUTHUI-03 is not ticked here** — `requirements-advanced` only.

## The six sequences, in 15-07's arrow format

All six were derived from source first and then **confirmed against real Chromium**. Where the
machine disagreed, the machine won — see Divergences. Total: **59 stops**.

**Footer tail** (identical on all six; five stops, because `SUPPORT_EMAIL` is `null` per D-26/D-161
so the mailto row renders nothing at all):

```
a:FitOut@contentinfo → a:Find a space@contentinfo → a:Host your space@contentinfo
→ a:Terms@contentinfo → a:Privacy@contentinfo
```

**1. `/login` — 12 stops**

```
a:FitOut@main → input[email]:Email → a:Forgot password?@main → input[password]:Password
→ button[submit]:Log in → button[button]:Continue with Google → a:Create an account@main
→ FOOTER TAIL
```

The third stop is the non-obvious one and it is **not a defect**: `Forgot password?` renders inside
the password field's label row, so in DOM order it precedes the input it sits above. That is exactly
15-UI-SPEC gate 2's *"inline links in source order"*. Recorded, not reordered.

**2. `/signup` — 14 stops**

```
a:FitOut@main → button[radio]:Book a space → button[radio]:Host a space → input[text]:First name
→ input[email]:Email → input[password]:Password → button[submit]:Sign up to book
→ button[button]:Continue with Google → a:Log in@main → FOOTER TAIL
```

**Both intent radios are tab stops.** Native `<button type="button" role="radio">` with no roving
tabindex, so each is independently focusable. WCAG 2.1.1 is satisfied either way; the WAI-ARIA
authoring practice would prefer one stop plus arrow keys. Logged to `deferred-items.md` with the
reasoning; **not fixed here** — that is a behaviour change on a shipped control, and 15-07 froze that
pair's markup byte-identical. The submit label is the DEFAULT (`Sign up to book`); nothing clicks a
radio before walking.

**3. `/forgot-password` — 9 stops**

```
a:FitOut@main → input[email]:Email → button[submit]:Send reset link → a:Back to log in@main
→ FOOTER TAIL
```

**4. `/forgot-password` · post-submit — 7 stops**

```
a:FitOut@main → a:Back to log in@main → FOOTER TAIL
```

The branch replaces the form: no field, no submit. Reached with a fixed, account-less literal
address, so no email is attempted (T-15-22 / T-03-02 — the branch is reached identically either way).

**5. `/reset-password?token=<fixed literal>` — 9 stops**

```
a:FitOut@main → input[password]:New password → button[submit]:Set new password
→ a:Back to log in@main → FOOTER TAIL
```

**This reproduces 15-07's nine stops exactly.** Nothing regressed between that plan and this one.

**6. `/reset-password` · missing token — 8 stops**

```
a:FitOut@main → a:Request a new link@main → a:Back to log in@main → FOOTER TAIL
```

**7th case — `/signup` at 320x568:** the identical 14-stop sequence. The narrow layout adds and
removes **no** tab stop. One narrow repeat rather than fourteen, because the claim it can falsify is
a property of the shared layout, and `/signup` is the auth document with the most layout to get wrong
(15-07 measured it: 544px card, the surface's only multi-column construct).

## The indicators

**73 focus indicators measured in real Chromium** — 59 across the six documents plus 14 on the
`/signup` 320 repeat — against `overflow-320.spec.ts`'s two per route. Four assertions on each:

1. the element matches `:focus-visible` after a **real** Tab press;
2. `expectRing` — a real outline with width, or a non-`none` box-shadow;
3. `expectIndicatorPaints` — something with a **colour** survives stripping fully-transparent layers;
4. the focused reading **differs** from the same element's unfocused reading.

This closes `tests/design/focus-recipe.test.ts`'s own stated blind spot for the auth composition:
*"This proves the class names are right. It does not prove a browser paints a visible ring."*

**The wordmark keeps the browser default on all six documents** — measured `outline: auto 1px`, no
box-shadow, `class="text-lg font-semibold tracking-tight block text-center"`, no `ring-` utility.
`(auth)/layout.tsx`'s own paragraph, turned into three assertions, with its sentence quoted in the
failure message so a future reader who "fixes" the wordmark by adding a ring is told why it is
deliberate.

**No focus trap, no positive tabindex.** Every document's Shift+Tab sequence is the exact reverse of
its Tab sequence, and the per-document census reports **0** positive `tabindex` values on all seven
cases.

## T-15-25 — stronger than 15-07 left it

15-07 asserted: one forward walk, ten presses, the hidden input never focused. This plan asserts:

| Claim | 15-07 | Now |
|---|---|---|
| the input is not reached walking **forward** | yes | yes, matched on the registered field **name** |
| the input is not reached walking **backward** | — | yes |
| `type="hidden"` | cited from a measurement | **re-measured** in the run |
| `offsetParent === null` | cited from a measurement | **re-measured** in the run |
| the input exists at all (anti-vacuity) | — | yes — exactly 1, or the gate fails |
| the assertion can fail | — | **proven twice** (M-B, M-B′) |

Matching on `name` rather than on `type` is load-bearing: an input that stopped being hidden is still
the token input and still has to be caught, so matching on `type="hidden"` would make the assertion
true *by* the very property whose loss it exists to detect.

15-07's note is carried into the file verbatim in substance — the input's `tabIndex` IDL property
reads `0`, which looks alarming and means nothing: it is the default on every `<input>`, and a hidden
input is not rendered and therefore not focusable. Without that sentence the next reader re-opens a
closed question.

## The reds, watched and transcribed

All three are transcribed **verbatim** in `e2e/auth-keyboard.spec.ts`'s header. Command for all
three: `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium`.

**M-A — the sequence assertion is real.** `tabIndex={-1}` on the wordmark `<Link>` in
`src/app/(auth)/layout.tsx` → **7 failed / 0 passed**. Every case, which is the correct blast radius:
the wordmark is stop 1 on all six documents and the seventh case is `/signup` repeated. Anything
smaller would have meant the walk was not seeing the layout.

```
Error: /login: the recorded tab order is not the one this file declares. …
- Expected  - 1
+ Received  + 0
  Array [
-   "a:FitOut@main",
    "input[email]:Email",
    "a:Forgot password?@main",
```

**M-B — T-15-25 is not vacuous.** The token input `type="hidden"` → `type="text"` in
`src/app/(auth)/reset-password/page.tsx` → **1 failed / 6 passed**, exactly the one document that
renders the input. The failure names T-15-25:

```
Error: /reset-password · with token (T-15-25): the token input is no longer `type="hidden"`.
Expected: "hidden"   Received: "text"
```

**M-B′ — the *walk* half of T-15-25 is not vacuous either.** M-B proves the `type` re-measurement can
fail; it does not prove the assertion that carries the threat can fail, because the type check
short-circuits first. Isolated by temporarily hoisting `expectTokenNeverFocused` above
`expectTokenInputInert` with M-B still applied → **1 failed / 6 passed**, caught by the walk itself:

```
Error: /reset-password · with token (T-15-25 — INFORMATION DISCLOSURE): the reset token input
RECEIVED FOCUS while walking forward. … 1 token input(s) were reached walking forward, and the
only acceptable number is zero.
+ Array [
+   "input[text]:",
+ ]
```

**Both source mutations reverted.** `git diff --exit-code src/app/(auth)/layout.tsx
'src/app/(auth)/reset-password/page.tsx'` exits 0, and `git diff --name-only src/` is empty.

## Divergences — where the machine disagreed with the plan's derivation

Both are **instrument** facts, not page defects. Neither was resolved by editing a page.

**1. `next dev` puts a tab stop in the document that the app does not ship.** The dev-tools indicator
mounts as `<nextjs-portal>` appended to `<body>` and takes the LAST stop on every auth document — but
on the first page load of a probe run it had not finished mounting and was absent. So it can be
neither declared as stop N+1 (flaky) nor ignored quietly. It is partitioned off by
`partitionDevOverlay`, and the partition is **asserted**: every dropped element must be a
`nextjs-portal`, and all of them must sit at the far edge of the raw sequence, so the exclusion can
never swallow a product control that appeared mid-order. It draws no indicator and does not even
match `:focus-visible`, so an `expectRing` on it would fail on a correct tree.

**2. The post-submit branch's forward walk started below the wordmark.** Probed: six stops beginning
`a:Back to log in@main`, with `a:FitOut@main` absent — while the **backward** walk on the same
document reached `a:FitOut@main` as its final stop. The cause is that the branch is reached by
CLICKING `Send reset link`, which removes the focused control from the document; Chromium keeps the
sequential-navigation starting point where that element was, so the next Tab resumes below the
wordmark. `resetFocusToTop` walks backward with the keyboard until focus leaves the document before
every forward walk, which makes the sequence a fact about the DOCUMENT rather than about how the
document was reached. Measured cost: 13 presses on `/login`, 16 on `/signup`, 2 on the post-submit
branch — all inside the 40-press bound.

Once corrected, **all six declared sequences reproduced exactly**: 12 / 14 / 9 / 7 / 9 / 8.

## Deviations from Plan

### Auto-fixed / auto-added

**1. [Rule 2 — missing critical functionality] `expectIndicatorPaints` added beyond the plan's letter**
- **Found during:** Task 2, while measuring the real box-shadow value.
- **Issue:** the plan's Part A specifies `expectRing` plus a focused-vs-unfocused difference check.
  Both pass on a ring whose every layer is fully transparent: `expectRing` only requires the string
  not be `none`, and the difference check passes because the unfocused reading *is* `none`. Two
  assertions agreeing about a surface that draws nothing is byte-for-byte the unfailable-gate shape
  this phase has already shipped three of.
- **Fix:** a third check that strips fully-transparent layers and requires a colour to remain,
  calibrated against the measured value — `lab(100 0 0) 0 0 0 2px` (the ring offset) and
  `lab(36.2 0 0.00000596046) 0 0 0 4px` (the ring). A bare link satisfies the claim the other way,
  through its real UA outline.
- **Files:** `e2e/auth-keyboard.spec.ts` · **Commit:** `8d5b41a`

**2. [Rule 1 — bug in this plan's own work] the T-15-25 block was ordered where it could not speak**
- **Found during:** Task 2, by running M-B rather than by reasoning.
- **Issue:** with the T-15-25 block after the sequence assertion — its natural reading order — the
  mutation failed on the tab-order `toEqual`: right case, right count, and a message saying only that
  an array differed. A token-exposure leak reported as *"the recorded tab order is not the one this
  file declares"* is a leak somebody triages as a stale declaration and closes by editing the
  declaration.
- **Fix:** the forward half of T-15-25 now runs BEFORE the sequence equality; the backward half after
  the reverse walk. M-B re-run to obtain a transcript that names the threat.
- **Files:** `e2e/auth-keyboard.spec.ts` · **Commit:** `8d5b41a`

**3. [Rule 3 — instrument correction] `resetFocusToTop`**
- See Divergence 2. Without it the post-submit case is red on a correct tree.
- **Files:** `e2e/helpers/focus.ts` · **Commit:** `310caf8`

### Acceptance criteria that needed a note rather than a change

**AC (Task 1): `grep -c "function readFocus\|function expectRing\|type FocusReading"
e2e/overflow-320.spec.ts` returns 0 — measured **1**.**

The criterion's stated meaning — *"the three declarations are gone from the spec"* — is **satisfied**:
the anchored check `grep -c "^type FocusReading\|^async function readFocus\|^function expectRing"`
returns **0**. The single remaining match is the **import line itself**, because TypeScript's inline
type-import syntax spells it `import { expectRing, readFocus, type FocusReading } from …` — which
contains the substring the criterion counts. The very next criterion requires that import to exist.

Not contorted to make the number match: splitting it into a second `import type` line would have
broken the following criterion (`grep -c "helpers/focus"` must return exactly **1**), and writing the
`type` keyword on its own line to dodge a substring would be code shaped by a grep. Recorded instead.

**AC (Task 1): `grep -c "helpers/focus"` returns 1 in each file — satisfied by naming the module
descriptively in prose**, following this repo's own `booking-row.tsx:112` precedent (*"Named
descriptively rather than quoted, because the DS-03 gate counts that string"*), which
`(auth)/layout.tsx` also cites. The import line is the only quoted occurrence in each file.

## The helper extraction is inert

`FocusReading`, `readFocus` and `expectRing` moved to `e2e/helpers/focus.ts` with **byte-identical
bodies**. `expectVisibleFocus` stayed in `overflow-320.spec.ts` — it is built on that file's
`inHeader` notion, and the auth documents render no site header at all since D-162.

The diff on `overflow-320.spec.ts` was read line by line: **it contains only the three deleted
declarations (replaced by two courtesy comments saying where they went) and one added import line.**
No `ROUTES` row, no `tell`, no assertion, no count, and no pre-existing comment was touched.

| run | tree | result |
|---|---|---|
| pre-task baseline | `HEAD`, unmodified | **60 passed / 15 skipped**, exit 0 |
| post-task, unscoped | extraction applied | **60 passed / 15 skipped**, exit 0 |

Run unscoped, exactly as the criterion requires. **The command was never narrowed to `--grep "AC#29"`
to make a number match** — the 40 figure in that block's docblock is one describe block's row
arithmetic, and the whole-file run is the inertness proof.

## A pre-existing flake found on the way, and proven not to be this plan's

Three intermediate runs of `overflow-320.spec.ts` failed in the **AC#30** block at `expectTargets`
("the target-size scan found ZERO interactive controls INSIDE the surface"), on a different row each
time. It was proven pre-existing rather than assumed:

- the file **reverted to `HEAD` with `git checkout --`** fails the same assertion in the same block
  (on `the receipt · court`);
- `--retries=2` (the CI policy) turns it green — **59 passed / 1 flaky / 15 skipped, exit 0** — which
  is the signature of a race, not a regression;
- accumulated fixture state was **checked, not assumed**: direct queries against the dev database
  after a failing run return 0 rows for `booking`, `booking_group` and the sweep's listing, so
  teardown works and the cause is in-page timing;
- `expectTargets` neither calls nor is called by anything this plan moved, and it runs *before*
  `expectVisibleFocus` in the case body.

Logged to `deferred-items.md` with the five-run table, the failure text, the DB queries and a
proposed fix. **Not fixed here** — out of scope, and this plan's contract forbids changing any
assertion in that file.

## Not one pixel moved

`git diff --exit-code src/` exits **0** at plan end. No visual baseline is affected, no CI dispatch
is needed, and the ten re-minted baselines from the 15-11 dispatch are untouched.

## Scope fence held

Nothing was touched for: EMAIL-03's real-client walk, AUTHUI-02's avatar-removal clause,
`src/lib/email.ts:54-55` (CR-01), the ten re-minted visual baselines, the stale comment arithmetic in
`visual-baselines.ts`, `tests/ops/alert-digest.test.ts` (15-14's), or the AA gate (15-13's).

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium` | exit 0, **7 passed** |
| `npx playwright test e2e/overflow-320.spec.ts --project=chromium` | exit 0, **60 passed / 15 skipped** |
| `git diff --exit-code src/` | exit 0 |
| `git diff --exit-code src/app/(auth)/layout.tsx 'src/app/(auth)/reset-password/page.tsx'` | exit 0 |

## Commits

| Commit | Task | What |
|---|---|---|
| `310caf8` | 1 | the shared focus helper, and the forward walk over six auth documents |
| `8d5b41a` | 2 | an indicator on every stop, the reverse walk, T-15-25 hardened, three reds |

## Known Stubs

None. This plan adds test infrastructure only; every assertion it declares is measured against a live
browser and every one that could be non-trivially vacuous was watched failing.

## Threat Flags

None. This plan introduces no network endpoint, auth path, file-access pattern or schema change. It
adds two files under `e2e/` and rewires three imports in a third; it installs no package
(`T-15-SC`: zero installs).

## Self-Check: PASSED

- `e2e/auth-keyboard.spec.ts` — FOUND (715 lines; `min_lines: 250`)
- `e2e/helpers/focus.ts` — FOUND (424 lines, 15 exports, all three moved declarations exported)
- `.planning/phases/15-auth-profile-transactional-email/15-12-SUMMARY.md` — FOUND
- commit `310caf8` — FOUND
- commit `8d5b41a` — FOUND
