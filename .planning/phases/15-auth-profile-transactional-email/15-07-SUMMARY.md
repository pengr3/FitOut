---
phase: 15-auth-profile-transactional-email
plan: 07
subsystem: ui
tags: [nextjs, app-router, design-system, accessibility, forms, auth, live-regions]

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    provides: "plan 15-06's `(auth)` layout (one `<main>`, one wordmark on a quiet ground) and the `PanelCard.titleAs` union widened to admit the top heading level"
  - phase: 11-shell-and-navigation
    provides: "`PanelCard` itself (DS-11's third and last card container) and the allow-list ↔ inventory pairing procedure"
  - phase: 14-host-tooling
    provides: "plans 14-12/14-13's precedent that a conversion and its allow-list row deletion are ONE commit, and Phase 14's live-region rule"
provides:
  - "all four `(auth)` pages compose `PanelCard`; zero raw `<Card>` survives on any auth screen"
  - "each auth document renders exactly one `<h1>` in every branch — they rendered none at all before"
  - "exactly one accent-filled element per auth viewport, and zero in the two form-replacing branches"
  - "`ALLOWED_RAW_CARD` 9 → 5; the Phase-15 block is empty and kept as a comment saying why"
  - "`EXPECTED_SURFACES` 16 → 20, adopted-half 14 → 18, repo-wide brand total 24 → 28"
  - "the M1 measurement (signup intent pair at 320px) settled by a ruler rather than reasoned"
affects: [15-08-profile, 15-09-live-regions, 15-11-visual-baselines]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A pattern-card placed OUTSIDE a Suspense boundary so the document's heading is present in every state the boundary can show, rather than appearing as data resolves"
    - "A live region demoted in the same commit that restyles around it, with the removed role named descriptively in the comment that explains the removal"

key-files:
  created: []
  modified:
    - "src/app/(auth)/login/page.tsx"
    - "src/app/(auth)/forgot-password/page.tsx"
    - "src/app/(auth)/signup/page.tsx"
    - "src/app/(auth)/reset-password/page.tsx"
    - "tests/design/card-pattern-coverage.test.ts"
    - "tests/design/brand-recipe.test.ts"

key-decisions:
  - "No `AuthCard` pattern was extracted — the four allow-list rows' own warning was honoured, not overruled. What makes the four screens one composition is four `PanelCard` call sites sharing ONE layout"
  - "M1 measured, not predicted: the intent pair is 124px x 38px per button at 320px — one line at 14px/600, so the `sm:`-stacking fallback was NOT needed and the shipped `grid-cols-2` stands"
  - "The reset page's `PanelCard` sits OUTSIDE the Suspense boundary, which is what makes its `<h1>` present in all three of that document's states rather than appearing as the token resolves"
  - "The signup intent pair keeps the neutral control fill (D-21) — that is why the brand total moved by 4 across two commits and not by 5"
  - "Three prose mentions were de-quoted (`booking-row.tsx:112`'s precedent) because this plan's own greps count those strings in those files"

patterns-established:
  - "A pinned inventory that has TWO counts over the same list (`EXPECTED_SURFACES` and the adopted-half length) must see both go red, because a conversion mis-recorded as a refusal satisfies the first and fails the second"

requirements-completed: []
requirements-advanced: [AUTHUI-01, AUTHUI-03]

# Metrics
duration: 38min
completed: 2026-08-24
---

# Phase 15 Plan 07: The Four Auth Cards Adopt the Pattern Summary

**All four `(auth)` pages now compose `PanelCard` at the top heading level — the four documents that
rendered no `<h1>` at all now render exactly one each, in every branch — with one coral on the one
primary action per screen, two first-paint live regions demoted, and both pinned inventories moved
only after their red was watched.**

## Performance

- **Duration:** 38 min
- **Started:** 2026-08-24T19:40:00Z
- **Completed:** 2026-08-24T20:18:00Z
- **Tasks:** 2 of 2
- **Files modified:** 6

## Accomplishments

- **Zero raw `<Card>` survives on any auth screen.** Four `Card`/`CardHeader`/`CardTitle`/
  `CardDescription`/`CardContent` blocks became four `PanelCard` call sites. No padding and no
  vertical-rhythm utility was added at any of the four — the pattern's own `CardContent` supplies
  both, and this tree puts block padding on `Card` itself, so a child that asks again pays it twice.
- **Every auth document has a heading now, and had none before.** `CardTitle` is a `<div>`; the four
  pages rendered no heading element anywhere. Measured after the swap: one `<h1>` per document, with
  the right text, in every branch — including forgot's post-submit state and reset's missing-token
  and token-read states.
- **One coral per viewport, measured against the resolved token rather than counted in source.**
  Each of the four screens paints exactly one element with the brand background, and on each it is
  the primary action by name. `Continue with Google` stays outline; every link stays neutral; the
  signup intent pair keeps the neutral control fill.
- **Two live regions demoted, one kept and named.** `ResetNotice` (login) and the missing-token
  notice (reset) both mount WITH their document and never change, so both lost their announcement
  roles — Phase 14's rule verbatim. The forgot page's post-submit sentence KEEPS its status role,
  because it really does replace the form in response to a submit, and it gained the accessible name
  `Reset request result` so the region is not announced unlabelled.
- **Both pinned inventories moved with their rows, never ahead of them,** across two commits, with
  three separate reds watched and quoted verbatim in the owning test's changelog.
- **The allow-list block emptied.** `ALLOWED_RAW_CARD` went 9 → 7 → 5. The Phase-15 block is kept as
  a comment that says why it is empty, the way Phase 14's is — an empty section that explains itself
  is what stops the next Phase-15 surface quietly re-opening it.

## The measurements (all taken at 320x568 against a real dev server, 24 Aug 2026)

### M1 — the signup intent pair at 320px (15-UI-SPEC § Measurements Owed)

**Observation, not prediction. The pair fits on one line and needs no `sm:` stacking.**

| Measured | Value |
|---|---|
| Card content box | **288px** wide, 16px padding → **256px** inner |
| Intent group | 256px, `grid-cols-2 gap-2` |
| `Book a space` / `Host a space` button | **124px x 38px each** (the spec's estimate was ~136px; the real gap-and-padding arithmetic gives 124) |
| Rendered type | 14px / line-height 20px / **weight 600** — the court medium-weight aliasing the spec flagged |
| Wrap? | **No.** 38px = 8px + 20px + 8px + 2px border = exactly one line. A wrapped label would measure 58px |
| `documentElement.scrollWidth` vs `clientWidth` | **320 = 320** — no horizontal overflow |

The spec's contingency was *"if they wrap, the fix is stacking the pair below `sm:`, never shrinking
the type."* They do not wrap, so **nothing was stacked and the shipped `grid-cols-2` stands**. The
shipped token recipe is byte-identical across the restyle.

### The other three screens, and the four submits (M2's 320px half)

| Route | h1 | `<main>` | submit height | scrollWidth vs clientWidth |
|---|---|---|---|---|
| `/login` | 1 — `Welcome back` | 1 | **44px** | 320 = 320 |
| `/signup` | 1 — `Create your FitOut account` | 1 | **44px** | 320 = 320 |
| `/forgot-password` | 1 — `Reset your password` | 1 | **44px** | 320 = 320 |
| `/reset-password?token=…` | 1 — `Set a new password` | 1 | **44px** | 320 = 320 |

Heading order on every one of them: `H1` (the card title) then the footer's two `H2`s. No level is
skipped and no second `h1` exists.

### The two form-replacing branches carry zero coral — verified, not assumed

| Branch | h1 | `<main>` | buttons in the document | accent-filled |
|---|---|---|---|---|
| forgot, post-submit | 1 | 1 | **0** | **0** |
| reset, missing token | 1 | 1 | **0** | **0** |

Both branches REPLACE the form rather than sitting beside it, so once there is no primary action
there is no coral. The forgot branch's one status region resolves the name `Reset request result`.
The reset branch reports **0** alert roles and **0** status roles — the demotion landed.

### T-15-25 — the reset token input is not tabbable, walked rather than inferred

A real ten-press tab walk on `/reset-password?token=abc123`:

```
a:FitOut → input[password] → button[submit]:Set new password → a:Back to log in
→ a:FitOut(footer) → a:Find a space → a:Host your space → a:Terms → a:Privacy
```

The hidden token input never receives focus. It is `type="hidden"` and its `offsetParent` is `null`
(no layout box, so not focusable). Recorded because the plan says *verify, do not assume* — and
because the input's `tabIndex` IDL property reads `0`, which looks alarming and means nothing: it is
the default value on every `<input>`, and a hidden input is not rendered and therefore not focusable.

### The accent census, resolved-token comparison

| Route | controls scanned | brand-filled | which |
|---|---|---|---|
| `/login` | 10 | **1** | `Log in` |
| `/signup` | 11 | **1** | `Sign up to book` |
| `/forgot-password` | 8 | **1** | `Send reset link` |
| `/reset-password?token=…` | 8 | **1** | `Set new password` |

## The reds, observed before any number moved

**Task 1 — three failures with the rows in and the numbers still at their old values:**

```
FAIL  tests/design/brand-recipe.test.ts > DS-08 / D-21 — coral appears on exactly the 22 buttons
someone asked for it > adopts the brand variant at exactly 24 call sites across src/app and
src/components
AssertionError: expected 26 to be 24 // Object.is equality
```

```
AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three `Replaces`
lists describe. A coverage gate whose inventory silently emptied passes every one of its own
assertions.: expected 18 to be 16 // Object.is equality
```

```
AssertionError: expected [ { …(4) }, { …(4) }, { …(4) }, …(13) ] to have a length of 14 but got 16
```

**Task 2 — the same three, one step further:**

```
AssertionError: expected 28 to be 26 // Object.is equality
AssertionError: … expected 20 to be 18 // Object.is equality
AssertionError: expected [ { …(4) }, { …(4) }, { …(4) }, …(15) ] to have a length of 16 but got 18
```

**The third pin was a discovery.** The plan named two numbers per file; `card-pattern-coverage.test.ts`
has a **third** — `expect(adopted).toHaveLength(14)` — that counts the ADOPTED half of the same list.
It is not redundant with `EXPECTED_SURFACES`: a conversion recorded as a `"refused"` row would satisfy
the size pin and fail this one. It moved 14 → 16 → 18 alongside the other two, each move with its own
red quoted in place.

## Task Commits

1. **Task 1: Login and forgot-password adopt the pattern** — `e237267` (feat)
2. *(durability checkpoint)* — `a07ccb6` (docs, interim summary)
3. **Task 2: Signup and reset-password adopt the pattern** — `0fe5e4d` (feat)
4. **De-quote three prose mentions this plan's own greps count** — `ac0941c` (docs)

**Plan metadata:** see the `docs(15-07)` commit that carries this file.

## Files Created/Modified

- `src/app/(auth)/login/page.tsx` — `PanelCard` at the top heading level; brand+touch submit; the
  `Forgot password?` link moved from the 12px step to 14px (the "or" divider keeps the smaller step
  because it is chrome, not a control); `ResetNotice` demoted, sentence and classes byte-identical.
- `src/app/(auth)/forgot-password/page.tsx` — same conversion; the post-submit region keeps its
  status role and gains `aria-label="Reset request result"`; the uniform sentence and its single
  branch untouched.
- `src/app/(auth)/signup/page.tsx` — same conversion; the intent radio pair's token recipe
  byte-identical; both shipped submit labels and the in-flight one unchanged.
- `src/app/(auth)/reset-password/page.tsx` — same conversion, with the panel OUTSIDE the Suspense
  boundary; missing-token notice demoted; the submit refusal keeps its alert role.
- `tests/design/card-pattern-coverage.test.ts` — 4 allow-list rows deleted (the block left behind as
  an explanatory comment), 4 `CARD_SURFACES` adopters added, two counts moved 16→20 and 14→18.
- `tests/design/brand-recipe.test.ts` — the repo-wide adoption total 24 → 28, with the reason and the
  observed red appended to the running changelog. The scoped total (19) and
  `EXPECTED_SURVIVING_ACCENT_LINES` are byte-identical.

## Decisions Made

- **No `AuthCard` pattern, and the refusal honours the allow-list rows rather than overruling them.**
  Their warning was that satisfying this gate by inventing a fourth boxed shape would be worse than
  the exemption. DS-11 says three containers. What makes the four screens one composition is four
  `PanelCard` call sites sharing ONE layout — same ground, same column width, same wordmark, same
  heading role, one coral each.
- **The reset page's panel sits outside the Suspense boundary.** Putting it inside would have made the
  `<h1>` appear and disappear under a screen reader as the token resolved. Outside, the heading is
  present in all three states that boundary can show. This is the same argument 15-06 used for putting
  `<main>` in the layout, applied one level down.
- **The scoped brand total (19) staying still while the repo-wide one moved is the cross-check, not a
  coincidence.** `(auth)` lives under `src/app/`, inside `ADOPTION_TREES` and outside all four
  `SCOPED_TREES`. If both had moved, something had landed in the booking/group/search trees.
- **Requirements advanced, not completed.** AUTHUI-03's own text ends "…and a baseline", which is plan
  15-11's; AUTHUI-01 spans the profile page too (15-08). Neither checkbox was ticked.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] A third pinned count in `card-pattern-coverage.test.ts` the plan did not name**

- **Found during:** Task 1, while watching the red
- **Issue:** The plan's inventory census named `ALLOWED_RAW_CARD`, `CARD_SURFACES` and
  `EXPECTED_SURFACES`. Running the gate with the rows added surfaced a third assertion over the same
  list — `expect(adopted).toHaveLength(14)` at :832 — which no amount of moving `EXPECTED_SURFACES`
  would satisfy.
- **Fix:** Moved it 14 → 16 in Task 1 and 16 → 18 in Task 2, each with its own observed red quoted in
  a comment beside it, and with a note recording WHY it is not redundant with the size pin: a
  conversion mis-recorded as a `"refused"` row satisfies the size and fails this.
- **Files modified:** `tests/design/card-pattern-coverage.test.ts`
- **Committed in:** `e237267`, `0fe5e4d`

**2. [Rule 1 - Stale claim] Two `it()` titles quoted the numbers this plan moved**

- **Found during:** Task 1
- **Issue:** `brand-recipe.test.ts`'s assertion was named *"adopts the brand variant at exactly 24 call
  sites"*. Moving the assertion to 26 and leaving the title at 24 ships a test whose own name is false
  — the defect class this phase exists to repair elsewhere. (`card-pattern-coverage.test.ts`'s
  equivalent title is a template literal over `EXPECTED_SURFACES` and needed nothing.)
- **Fix:** The title tracks the assertion: 24 → 26 → 28.
- **Not fixed, deliberately:** the enclosing `describe` reads *"coral appears on exactly the 22 buttons
  someone asked for it"*, which was already stale at 24 before this plan touched the file. Pre-existing
  and out of this plan's scope — logged below rather than swept in.
- **Files modified:** `tests/design/brand-recipe.test.ts`
- **Committed in:** `e237267`, `0fe5e4d`

**3. [Rule 3 - Blocking] Three prose mentions had to be de-quoted to satisfy this plan's own greps**

- **Found during:** post-Task-2 acceptance checks
- **Issue:** The plan asserts `grep -c 'titleAs="h1"'` returns **1** on login and signup, and that
  `grep -c 'reset=1'` on the reset page is **unchanged at 1** — while the same files' headers are
  required to *explain* the heading-level adoption and to promise the redirect did not move. A comment
  that quotes the mechanism it explains fails the gate that documents it. This is byte-for-byte the
  collision plan 15-06 hit four times on the layout.
- **Fix:** Those three are named descriptively in the prose ("the heading-level prop on the call
  below", "the post-success redirect to the login route with its notice flag"), following
  `booking-row.tsx:112`'s precedent, each with an in-file sentence saying why. The identifiers still
  appear at their call sites, which is what the criteria actually measure.
- **Files modified:** the three `(auth)` pages
- **Verification:** all four pages now report `titleAs="h1"` = 1; reset reports `reset=1` = 1, its
  pre-task value (confirmed against `68233f0`).
- **Committed in:** `ac0941c`

---

**Total deviations:** 3 auto-fixed (2 × Rule 3 blocking, 1 × Rule 1 stale claim). No Rule 4
situation arose; no architectural change was needed.
**Impact on plan:** None on scope. All three are inside files the plan already assigns to these
tasks. No behaviour, class, prop, testid, sentence or accessible name moved.

## Deferred / Out of Scope (logged, not fixed)

- **`brand-recipe.test.ts`'s `describe` title still says "exactly the 22 buttons".** Stale since the
  total reached 24, i.e. before this plan. Not this plan's regression and not in its file-level scope
  beyond the assertion it owns.
- **`(auth)/error.tsx` still claims the group's layout renders `PublicHeader` and no `<main>`.** Both
  halves went false in plan 15-06, which asserted that file unedited and handed the correction
  forward. **This plan does not own it either** — `error.tsx` is not in `files_modified`, and its
  verification block requires `git diff --name-only` to list only the six files. Left untouched and
  re-flagged here so it does not go quiet: it now has two plans' worth of provenance and still no
  owner. Whichever plan next edits that file should take it.

## Issues Encountered

**None that were regressions.** The dev server logs a `resend` 422 (`Invalid 'to' field … use our
testing email address instead of domains like example.com`) on every e2e signup and reset request.
That is the real Resend API refusing `@example.com` recipients in a dev environment with a live key;
the specs read the reset token straight from the dev `verification` table by design, so it changes
nothing. Pre-existing, unrelated to this plan, and recorded because the log line is alarming.

## Verification Results

| Check | Result |
|-------|--------|
| `npx tsc --noEmit` (run bare; the pipe-to-`tail` exit-code trap avoided) | exit 0 |
| `npm run test:design` | exit 0 — 52 files / **877 passed** / 3 skipped |
| `npx playwright test e2e/password-reset.spec.ts e2e/login-persistence.spec.ts` | **2 passed** |
| `git diff --exit-code` on both e2e specs | exit 0 — both unedited |
| `git diff --exit-code src/lib/design/{accent-uses,contrast-pairs,status-tones,selector-contract}.ts` | exit 0 — no new accent kind, pairing, tone or testid |
| `grep -c 'variant="destructive"'` on all four auth pages | 0 for each |
| `grep -c 'toBe(19)'` in `brand-recipe.test.ts` | 1 — the scoped map is untouched |
| `EXPECTED_SURVIVING_ACCENT_LINES` in `git diff` | unchanged |
| `git diff --name-only` across the plan | exactly the six files in `files_modified` |

**Acceptance greps, all four pages:** `<Card` 0 · `titleAs="h1"` 1 · `variant="brand"` 1 ·
`size="touch"` 1 each. `login`: status role 0, `text-xs` 1 (the "or" divider), `you@example.com` 1,
the reset sentence 1. `forgot`: `aria-label="Reset request result"` 1, `you@example.com` 1.
`signup`: `border-primary bg-primary` 1 (unchanged), `you@example.com` 1, alert role 1.
`reset`: alert role 1 (the submit refusal only), `type="hidden"` 1, `reset=1` 1 (its pre-task value).

`ALLOWED_RAW_CARD` has **5** rows; `EXPECTED_SURFACES` is **20**; the adopted half is **18**; the
repo-wide brand total is **28**.

## Known Stubs

None. No placeholder value, empty-array data source, mock, or "coming soon" copy was introduced.
Every sentence on all four screens is the sentence that shipped before this plan.

## Threat Flags

None — no new network endpoint, auth path, file access pattern or schema change. The plan's six
registered threats are all mitigated as written:

| Threat | How it was held |
|---|---|
| T-15-22 (enumeration) | The uniform forgot sentence is still one module constant with one reader, reached by one branch; the generic login refusal is unchanged. Both e2e specs pass unedited |
| T-15-23 (open redirect) | `safeCallbackPath` and every call site untouched; the module does not appear in the diff |
| T-15-24 (client capability grant) | `intent` still posts to the `signup` server action; no mapping moved client-side; no client default added |
| T-15-25 (token exposure) | Verified by a real tab walk (above), not by inspection: the hidden input never receives focus |
| T-15-26 (a11y announcements) | Two first-paint demotions, one genuine status region given a non-empty name, both `role="alert"` refusals kept |
| T-15-SC (package installs) | Zero installs. No `package.json` change |

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Plan 15-08 (profile) is unblocked**, and inherits two moving numbers: `EXPECTED_SURFACES` reaches
  **21** when `profile-form.tsx` joins `CARD_SURFACES`, and the adopted half reaches **19**. Both were
  deliberately left at 20/18 here — moving a count ahead of its rows is the one thing this file's
  procedure forbids.
- **Plan 15-09 (live regions) inherits a declaration that is now true of the markup.** The
  `aria-label="Reset request result"` row it declares exists on the forgot page as of `e237267`; the
  reset page's missing-token notice and login's `ResetNotice` are no longer live regions at all, so
  any row 15-09 holds for either of those must be a removal.
- **Plan 15-11 (baselines) inherits four screens whose geometry is now settled and measured** — the
  four tables above are the numbers to baseline against. AUTHUI-03's fifth gate (the baseline itself)
  is the only clause of that requirement this plan does not close.
- **Still ownerless:** `(auth)/error.tsx`'s two false header claims (see Deferred, above).

---
*Phase: 15-auth-profile-transactional-email*
*Completed: 2026-08-24*
