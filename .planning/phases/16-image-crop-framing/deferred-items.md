# Phase 16 — deferred items

Out-of-scope discoveries, logged rather than fixed (executor scope rule). Each names the file that
owns it, the plan that found it, and what a fix would cost.

---

## D1 — The zoom slider ships with NO accessible name

- **Found by:** plan 16-10, `tests/profile/avatar-field.test.tsx` (jsdom), 2026-08-25
- **Owner file:** `src/components/profile/image-crop-dialog.tsx` (plan 16-09's), the `<Slider>` call
- **Severity:** WCAG 2.2 SC 4.1.2 (Name, Role, Value) failure on a shipped control

**Measured, not inferred.** The element carrying `role="slider"` is Radix's THUMB
(`@radix-ui/react-slider/dist/index.mjs:430-434`), and its name is `props["aria-label"] || label`
where `label = getLabel(index, totalValues)` — which returns `undefined` for a single-value slider
(`:505-513`). The dialog passes `aria-label={AVATAR_ZOOM_LABEL}` to the vendored `Slider`, which
spreads it onto `SliderPrimitive.Root`; the Root renders a `<span data-slot="slider">` with **no
role**, so it contributes no accessible name to anything. Read out of a real render:

```
thumbAriaLabel : null
thumbLabelledBy: null
rootAriaLabel  : "Zoom"
rootRole       : null
queryAllByRole("slider", { name: "Zoom" }).length : 0
```

16-UI-SPEC § Surface contracts 2 specifies `aria-label="Zoom"` on the slider. It is present in the
source and absent from the accessibility tree — the same class of defect GATE-03's live-region gate
exists for (`role="status"` is `nameFrom:author`, so a region with perfect text can be unaddressable
and nothing on screen shows the difference).

**Why it was not fixed here.** `image-crop-dialog.tsx` is not in plan 16-10's `files_modified`; the
executor scope rule confines auto-fixes to issues the current task's own changes caused. A fix also
has to choose WHERE the name goes (`SliderPrimitive.Thumb`'s own `aria-label`, or a visible `<label>`
wired to the thumb), which is a design call the UI contract should make rather than an executor.

**Cheapest correct fix:** give the vendored `Slider` a way to name the thumb (it renders the thumbs
itself), or set the name on the thumb directly. Both are one line plus a rendering assertion.

**Suggested owner:** plan 16-13 (the phase's real-browser a11y pass) or a follow-up in 16-14…16-16.

---

## D2 — `overflow-320.spec.ts`'s Phase-13 confirmed-detail row is flaky under parallel workers

- **Found by:** plan 16-12, running the full `e2e/overflow-320.spec.ts` for the `/profile` rows, 2026-08-25
- **Owner file:** `e2e/overflow-320.spec.ts` (the AC#30/AC#22 Phase-13 table), or its fixture setup
- **Severity:** a false red on a green tree — the worst kind, because the next person spends the
  investigation on their own change

**Measured.** `npx playwright test e2e/overflow-320.spec.ts --project=chromium` (2 workers) failed on
`AC#30 / AC#22 … › the confirmed detail, no query · court` with `expectTargets`'s own non-vacuity
floor — zero controls collected:

```
> 868 |   ).toBeGreaterThan(0);
        at expectTargets (e2e\overflow-320.spec.ts:868:5)
1 failed · 14 skipped · 16 did not run · 44 passed
```

Re-run ALONE (`-g "the confirmed detail, no query"`, 1 worker): **2 passed**, both themes, 1.4s and
1.2s. So the surface renders and the selector still matches; the failure is a race in the fixture or
in the shared dev database the e2e run uses, not a layout regression.

**Why it was not fixed here.** Nothing in plan 16-12 touches a booking-detail surface — its files are
`src/lib/cloudinary.ts`, `src/app/actions/avatar.ts`, `src/components/profile/avatar-field.tsx`,
`src/lib/design/live-regions.ts` (prose only) and three test files. The `/profile` rows of this same
spec, which ARE this plan's surface, pass in both themes.

**Cheapest correct fix:** make the Phase-13 rows provision their own booking rather than reading one
another's, or serialise that describe block. Whichever it is, the fix belongs to whoever owns the
fixture, with a red watched under two workers first.

**Suggested owner:** the phase's real-browser plan (16-13) or a Phase-17 test-infrastructure pass.

---

## D3 — At a source of exactly 400px the disabled zoom row gives a reason that is not true

- **Found by:** plan 16-13, `e2e/avatar-crop.spec.ts` (real browser, `square-400.png`), 2026-08-25
- **Owner file:** `src/components/profile/image-crop-dialog.tsx` — the `zoomLocked` predicate
- **Severity:** copy correctness (rule F8), not a functional break. No user is blocked.

**Measured.** With `e2e/fixtures/square-400.png` (400x400) the crop dialog renders the zoom row
DISABLED **and** renders `AVATAR_SOFT_SOURCE_NOTE` — *"This photo is small, so it may look a little
soft."* A 400px source is pixel-for-pixel `AVATAR_OUTPUT_PX`; nothing about it is soft.

The predicate is `zoomLocked = maxZoom <= 1`, and `avatarMaxZoom(400) === 1`, so the note fires at
exactly the output size as well as below it. Rule F8 wants a disabled control to carry **its** reason,
and at 400 the real reason is *"there is no zoom headroom"*, not softness.

**Three documents, two of which disagree with each other.**

| Document | Says at 400px |
|---|---|
| `tests/design/avatar-zoom.test.ts:96` (IC-05's own worked row, 999.2, inherited by D-176) | *"400 x 400 — zoom row disabled **+ soft note**"* |
| `src/lib/avatar.ts` (`AVATAR_SOFT_SOURCE_NOTE` docblock) | *"when the shorter source side is **between** AVATAR_MIN_SOURCE_PX and AVATAR_OUTPUT_PX"* — reads exclusive |
| `e2e/fixtures/README.md` (16-04) and `16-13-PLAN.md` (b) | **no** note at 400 |

The shipped code matches IC-05, which is the settled contract D-176 says not to re-derive. So the
spec asserts what IC-05 and the code agree on, and the two later paraphrases are the ones that drifted.
**Recorded here because "the contract is self-consistent" is not the same as "the sentence is true."**

**Why it was not fixed here.** Plan 16-13's own `<verification>` requires
`git diff --exit-code src/components/profile/image-crop-dialog.tsx` to exit 0 — this plan asserts, it
does not change product code. It is also a COPY decision (narrow the predicate to `shorter < 400` and
keep one sentence, or split into two sentences and add a second literal), which the UI contract should
make rather than an executor.

**Cheapest correct fix:** either (a) accept IC-05 as written and soften the sentence so it is true at
400 too, or (b) gate the note on the source's shorter side rather than on `zoomLocked`, leaving the row
disabled with no note at exactly 400 — which then needs an answer for rule F8. One line either way,
plus the `square-400.png` row in `e2e/avatar-crop.spec.ts` and the paragraph in `e2e/fixtures/README.md`.

**Suggested owner:** plan 16-14 (the phase's remaining a11y/copy pass) or a PM ruling.

---

## D4 — The Delta-3 e2e case performs one real Cloudinary upload per run

- **Found by:** plan 16-13 (created by it), 2026-08-25
- **Owner file:** `e2e/avatar-crop.spec.ts` — the Delta-3 pending-save case
- **Severity:** operational housekeeping, not a defect

**What happens.** The case holds the avatar server action's request open to make the pending window
deterministic, asserts the three dismiss affordances are inert, then RELEASES the request to the real
server — because *"the dialog closes on success"* is not a claim a fabricated Next flight payload can
support, and hand-rolling one would be asserting against our own forgery. The action really uploads a
400x400 JPEG to `fitout/avatars/<the throwaway signup's user id>`.

The asset is orphaned the instant the test ends: the user row belongs to an `e2e.avatar.<timestamp>`
signup nothing ever reads again. **One orphan per execution of that one case.**

**Why it was not avoided.** The alternatives are worse: a fixture large enough to make the upload
"slow" is a race dressed as a test, and it can never assert the window CLOSED; a fabricated success
response asserts against the test's own invention rather than the server's behaviour.

**Cheapest correct handling:** Phase 16.1's orphaned-asset audit already exists as scope (D-166 /
D-169 knowingly tolerates orphans). It should expect an `fitout/avatars/*` cohort whose user rows have
`e2e.avatar.*` emails, and sweep them. Alternatively the e2e run gains a teardown that calls the
avatar destroy helper — which is a fixture-lifecycle decision, not this plan's.

**Suggested owner:** Phase 16.1 (orphaned-asset audit).

---

## D5 — §A5's cascade risk is REAL: DS-05's ring half does not paint on the crop area

- **Found by:** plan 16-13, `e2e/avatar-crop.spec.ts` (computed style on the focused stage), 2026-08-25
- **Owner file:** `src/components/profile/image-crop-dialog.tsx` — `classes.cropAreaClassName`
- **Severity:** dead code today, and the open half of 16-UI-SPEC Δ6 / IC-04's mask ring

**Measured on the focused stage, in Chromium:**

```
box-shadow : rgba(0, 0, 0, 0.5) 0px 0px 0px 139986px      <- the LIBRARY's scrim, not a ring
outline    : auto 1px lab(36.2 0 0.00000596046)           <- a real, opaque indicator
class      : reactEasyCrop_CropArea reactEasyCrop_CropAreaRound
             focus-visible:ring-2 focus-visible:ring-ring
             focus-visible:ring-offset-2 focus-visible:ring-offset-background
```

16-RESEARCH §A5 predicted this and flagged the class route as *"the right INTENT and not guaranteed
to win"*: `react-easy-crop` injects its stylesheet **unlayered** into the document head, Tailwind v4
utilities live in a cascade **layer**, and unlayered beats layered. Tailwind's `ring-*` compiles to
`box-shadow`, and `.reactEasyCrop_CropArea`'s own `box-shadow: 0 0 0 9999em` (IC-04's scrim) occupies
that property. **`STAGE_FOCUS_RECIPE` is dead on this element.**

**The surface is NOT ringless, and that is why this is a finding rather than a defect.** DS-05 has two
halves. The stylesheet half — `globals.css`'s base-layer `* { @apply border-border outline-ring }` —
colours the UA's own focus outline in `--ring` at **full alpha**, and that is what a keyboard user
sees. The e2e case asserts the two things that must hold however the cascade lands (an indicator is
painted; its colour carries no alpha) and deliberately does **not** assert "the box-shadow is the
scrim", which would encode today's cascade as a requirement and go red the day the route is fixed.

Watched red, 2026-08-25: diluting `outline-ring` to `outline-ring/50` in `globals.css` reddens the
alpha assertion with `oklab(0.449999 … / 0.5)`. Restored; tree clean.

**What is still owed.** 16-UI-SPEC Δ6 wants a **2px mask ring** and a dimmer scrim on the crop area,
and 16-RESEARCH's test map row 9 wants `borderWidth === "2px"` plus the 55% foreground scrim asserted.
Neither can land through `classes.cropAreaClassName` while the vendor rule is unlayered. §A5's routes:
**A** inline `style.cropAreaStyle` (wins outright, no inventory row, no diluted-token key), **B** the
class route plus a diluted-token inventory move (`EXPECTED_DILUTED_TOKENS` 20 → 21 at
`brand-recipe.test.ts:361`) — now measured to NOT win, so B is off the table unless the layer order
changes, **C** `disableAutomaticStylesInjection` and vendor the CSS ourselves.

`image-crop-dialog.tsx`'s header says *"Plan 16-13 measures which route wins in a real browser and
lands it with its inventory row."* **16-13 measured it. It did not land it** — 16-13's tasks do not
include the route, its `files_modified` is two e2e files, and its `<verification>` requires
`git diff --exit-code src/components/profile/image-crop-dialog.tsx` to exit 0.

**Cheapest correct fix:** route A. One `style={{ cropAreaStyle: … }}` prop, no inventory move, and the
existing e2e assertion keeps passing because it tests the outcome rather than the mechanism.

**Suggested owner:** plan 16-14.

---

## D6 — The full `chromium` e2e project is not green on this tree, and none of it is Phase 16's

- **Found by:** plan 16-13, running `npx playwright test --project=chromium` for its own
  `<verification>` bullet, 2026-08-25
- **Owner files:** `e2e/public-listing.spec.ts`, `e2e/cancel.spec.ts`, `e2e/confirmation-decay.spec.ts`
  (reproducible), plus `e2e/hold-countdown.spec.ts`, `e2e/host-headings.spec.ts`,
  `e2e/price-one-fact.spec.ts`, `e2e/reduced-motion.spec.ts` (parallel-contention only)
- **Severity:** the phase gate cannot be read off this command until it is triaged

**The run.** `218 passed · 8 failed · 16 skipped · 22 did not run` in 9.8 minutes at 4 workers. All
20 of plan 16-13's own cases passed. The eight failures split cleanly on re-run:

| Spec | Alone, 1 worker | Verdict |
|---|---|---|
| `public-listing.spec.ts` — *a draft listing 404s to the public* | **fails** (`404` expected, `200` received) | reproducible |
| `cancel.spec.ts` — *re-opening the review screen … never re-refunds* | **fails** (`getByText(/refund on its way/i)` not found) | reproducible |
| `confirmation-decay.spec.ts` — *the moment is a full screen …* | **fails** (`grove · 320x568`: the moment measured **0px** against a `>= 504` floor) | reproducible |
| `hold-countdown.spec.ts` | 4 passed | contention only (D2 class) |
| `host-headings.spec.ts` | passed in the isolation batch | contention only (D2 class) |
| `price-one-fact.spec.ts` | passed in the isolation batch | contention only (D2 class) |
| `reduced-motion.spec.ts` (x2) | passed in the isolation batch | contention only (D2 class) |

Note that `confirmation-decay` failed on a DIFFERENT case in the full run (`:254`) than alone
(`:151`), so that file has both problems at once.

**Why none of it is this plan's.** Two independent proofs, neither of them an argument:

1. `git diff --name-only 9b2d6f3~1 HEAD -- src/` returns **zero files**. Plan 16-13 changed
   `e2e/avatar-crop.spec.ts`, `e2e/helpers/avatar-session.ts` and this document, and nothing else.
   A draft listing serving 200 is not reachable from an additive spec file.
2. Every reproducible failure reproduces when its spec is run **alone**, with
   `e2e/avatar-crop.spec.ts` not collected at all.

**Why it was not fixed here.** Three different Phase-12/13 surfaces, product behaviour in at least
one of them (`404` vs `200` is a route-level authorisation outcome, not a test artifact), and the
executor scope rule confines auto-fixes to what the current task's own changes caused.

**What this costs the phase, stated plainly.** `16-13-PLAN.md`'s `<verification>` asks for
`npx playwright test --project=chromium` to exit 0 for the whole set. **It does not, and it did not
before this plan either.** The bullet's INTENT — no regression from this plan on the ~30 existing
specs — is met and is provable by the two points above. The literal bullet is not, and it cannot be
met by anything inside this plan's `files_modified`.

**Cheapest correct handling:** triage the three reproducible ones first (the draft-listing 404 is the
one that reads like a real product regression rather than a fixture race), then apply D2's remedy — a
per-file fixture rather than shared reads — to the contention set.

**Suggested owner:** plan 16-15, or a Phase-17 test-infrastructure pass. **This should be resolved
before the phase gate is read off a full `chromium` run.**


---

## D7 — The zoom thumb still exposes no `aria-disabled` when the row is locked

- **Found by:** plan 16-13 (recorded beside its `data-disabled` assertion), promoted to its own row by
  plan 16-14 while fixing D1, 2026-08-25
- **Owner file:** `src/components/ui/slider.tsx` (the vendored block), or Radix upstream
- **Severity:** minor. The control IS removed from the tab order, so no keyboard user can land on it
  and be told nothing; what is missing is the state on the element itself.

**Measured.** With a locked row (`square-400.png`, `small-300.png`) the thumb renders
`role="slider" data-disabled="" ` with **no** `tabindex` and **no** `aria-disabled`. Playwright's
`toBeDisabled()` reads `aria-disabled` on a non-native control, so it reports every state as ENABLED
here — which is why `e2e/avatar-crop.spec.ts` asserts `data-disabled` and the tab order instead.

**Why it was not fixed with D1.** D1 is a *name* defect — WCAG 2.2 SC 4.1.2's "Name" clause, a real
failure with a one-line fix inside a block we own. This is the "Value" clause on a control that is
already unreachable, and the fix is a policy call about whether a disabled slider should stay in the
accessibility tree with its state, or leave the tab order silently as Radix chose. The orchestrator
assigned 16-14 the name, not the policy.

**Cheapest correct fix:** `aria-disabled={props.disabled || undefined}` on `SliderPrimitive.Thumb`,
plus flipping the two e2e assertions to `toBeDisabled()` — but only after deciding whether the thumb
should also come back into the tab order, because a disabled control that announces its state and is
unreachable is a half-measure either way.

**Suggested owner:** a Phase-17 accessibility pass, alongside the milestone's court-only axe sweep.


---

## D8 — `price-parity.spec.ts` flakes on `/`'s streaming search bar (two `#search-category`)

- **Found by:** plan 16-14, running its named regression set, 2026-08-25
- **Owner file:** `e2e/price-parity.spec.ts:279`, or `src/app/(app)/loading.tsx`'s fallback
- **Severity:** a false red on a green tree — D2's family, on a different route

**Measured.** `npx playwright test e2e/price-parity.spec.ts --project=chromium --workers=1` failed
once and passed on an immediate identical re-run:

```
Error: locator.click: Error: strict mode violation:
locator('#search-category') resolved to 2 elements
  at price-parity.spec.ts:279  await page.locator("#search-category").click();
```

**The cause is already recorded in this tree, which is why this is a duplicate rather than a
discovery.** `src/lib/design/visual-baselines.ts:429` states it verbatim: *"`/` streams, and its own
`loading.tsx` renders a second `SearchBar` (measured in `e2e/helpers/booker-seed.ts`:
`#search-category` appears twice while the boundary resolves)"*. So for the window in which the
Suspense boundary is unresolved there really are two elements carrying that id, and a bare
`page.locator("#search-category")` is a race against the server's streaming speed.

**Why it is not plan 16-14's.** Two independent proofs. `git diff --name-only 8634bb1~1 HEAD` lists
eight files, none of which is reachable from `/`: the crop dialog, the vendored slider (whose only
importer in `src/` is that dialog), one e2e spec, one jsdom test, one generator, one fixture and two
`.planning` documents. And `src/components/search/search-bar.tsx` — the only place `#search-category`
is rendered — was last touched by `cafc5bb` on **2026-08-19**, in Phase 12.

**Cheapest correct fix:** wait for the boundary before clicking (the result grid's own hook, which
`visual-baselines.ts` already names as the only element that cannot exist in the pending shell), or
scope the locator to the resolved form. The duplicate id itself is the deeper issue and belongs with
whoever owns the fallback: two live elements sharing an id is invalid HTML regardless of how briefly.

**Suggested owner:** plan 16-15's e2e triage, with D2 and D6.


---

## D9 — the 12-10 booking-sheet row measures nothing: a modal retires all three AC#29 clauses

- **Found by:** plan 16-15, while building its own dialog-open row, 2026-08-26
- **Owner file:** `e2e/overflow-320.spec.ts` — the `/listings/[id] · sheet open` row (plan 12-10)
- **Severity:** a green gate on an unmeasured surface. Not a false red — the opposite, and worse.

**Measured, in real Chromium at 320x800, three readings.**

| reading | value |
|---|---|
| `getComputedStyle(document.body).overflow` on `/`, `/terms`, `/privacy`, `/login`, `/signup`, `/forgot-password`, `/reset-password` | **`visible`** |
| the same, on `/listings/[id]` with the booking sheet OPEN | **`hidden`** (and `position: relative`) |
| the same, on `/profile` with the crop dialog OPEN | **`hidden`** |

That is `react-remove-scroll`'s scroll lock, installed by the vendored dialog primitive. Its effect on
`expectNoOverflow` is total, and was measured by appending a **500px-wide `<div>` straight into the open
sheet**:

```
documentElement.scrollWidth 320   clientWidth 320   offenders []
```

**All three clauses go quiet at once.** `examined` is satisfied (156 elements). The document clause
cannot fire because `<body>` is now a 320px box that clips its own content. And the per-element clause
cannot fire twice over: `isClipped` walks ancestors up to — but not including — the document element,
so it walks **through** `<body>` and reports every element on the page as clipped; and separately
`DialogContent` itself computes `overflow-x: auto` (Tailwind's `overflow-y-auto` makes the other axis
compute to `auto` per CSS), so anything inside the overlay is clipped by the overlay's own box as well.

**So the row that plan 12-10 added specifically because "the sheet is where the 320px floor is
HARDEST" has never been able to fail.** Its `tell` is correct and its argument is right; the
measurement behind it is the part that was never checked.

**The fix already exists and is not applied to this row.** Plan 16-15 added
`expectNoOverflowWithin(page, selector, where)` to `e2e/helpers/overflow.ts` and an optional
`scope` field to `RouteRow`. Asked that way, the same injected div reports **`scrollWidth 532` against
`clientWidth 320`** and **48 named offenders** on the sheet (14 on the crop dialog). Closing this is one
line — `scope: '[data-testid="responsive-dialog"]'` on the sheet row.

**Why 16-15 did not close it.** Its plan says in as many words *"Add nothing else to this file"* and
*"do NOT refactor … that spec passes"*, and editing a pre-existing row is outside the one row this plan
is chartered to add. More honestly: turning the clause on for the sheet may well produce a **real red**
on a Phase-12 surface, and that is a finding somebody should be watching for rather than something to
discover inside a gate plan's own verification run. The scoped clause fires on the crop dialog today,
so the mechanism is proved; the sheet row is a one-line adoption plus whatever it then reports.

**Suggested owner:** whoever next touches the booking sheet, or a Phase-17 responsive sweep. It is
cheap and the diagnostic is already written.
