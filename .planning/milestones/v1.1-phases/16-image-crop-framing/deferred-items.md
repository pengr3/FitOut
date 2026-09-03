# Phase 16 — deferred items

Out-of-scope discoveries, logged rather than fixed (executor scope rule). Each names the file that
owns it, the plan that found it, and what a fix would cost.

---

## D1 — The zoom slider ships with NO accessible name

> **CLOSED — confirmed by the phase verifier 2026-08-26.** The vendored block now forwards the caller's
> `aria-label` to `SliderPrimitive.Thumb` when there is exactly one thumb, and drops it from the Root
> (`src/components/ui/slider.tsx:53-63,83`). `tests/profile/avatar-field.test.tsx:413` asserts
> `getByRole("slider", { name: AVATAR_ZOOM_LABEL })` and is green in the 2121-test run. The row below is
> kept because the MEASUREMENT is the useful part — the name was present in the source and absent from the
> accessibility tree, which is a class of defect nothing on screen shows.

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

> **DISCHARGED 2026-08-26 — Phase 16.1 plan 16.1-06, D-192.** Both leaking cases in
> `e2e/avatar-crop.spec.ts` now end by driving the SHIPPED `Remove photo` control, which runs
> `removeAvatarAction` → `destroyAvatar`: the asset is deleted and the row is nulled, from a test
> process that still holds no Cloudinary credential and still fabricates no response. No `afterAll`,
> no fixture, no seed. A local run of that spec now leaves nothing behind.
>
> **Two corrections to the row below, both measured on the live account and the live DB on
> 2026-08-26, because the fix could not be designed against what it originally said.**
>
> 1. **It was TWO cases per run, not one.** Three cases in the file perform a real upload; the third
>    (`…a SUCCESSFUL removal returns focus to a real control`) already pressed `Remove photo` and so
>    already cleaned up. The `Keep photo` focus case leaked a second asset alongside Delta-3's. Both
>    now have teardown, modelled on the third.
> 2. **The "cheapest correct handling" below points at an audit that does not exist and never will,
>    and it would not have worked anyway.** Phase 16.1 CONSIDERED a Cloudinary Admin-API diff sweep
>    and **DECLINED** it (D-187): with zero real host uploads in production everything orphaned is a
>    dev/test artefact, and none of it was worth the risk of an irreversible diff-driven delete; the
>    phase closed the SOURCES of new orphans instead. And these particular assets were never orphans
>    under that sweep's own definition — *bytes on Cloudinary with no DB row.* All 28 assets under
>    `fitout/avatars` have a matching `user.avatar_public_id` row (28 assets / 28 rows, sampled ids
>    all matching). They are **abandoned-but-REFERENCED**: a real `user` row for a throwaway account
>    nothing will ever read again. A diff sweep would have found **none** of them. Teardown is the
>    only mechanism that reaches them, which is why it is the fix rather than the alternative.
>
> Pinning the test user — the other alternative — was checked first and is the EXPENSIVE option, not
> the cheap one. `overwrite: true` + `public_id: userId` cannot make repeat runs idempotent because
> `e2e/helpers/avatar-session.ts:56` mints a fresh randomised
> `e2e.avatar.<Date.now()>.<random>@example.com` every run, and that helper's header refuses seeds
> and DB fixtures on the record; a fixed email fails signup on the second run against the unique
> constraint.
>
> The row below is kept because the MEASUREMENT is the useful part: it is the record of a test suite
> billing the account once per execution, which is invisible to CI by construction — no CI job holds
> a Cloudinary credential (`ci.yml:151`, `:757`, `:875`) and this spec is not among the specs CI runs.

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

**Cheapest correct handling** *(as recorded in 2026-08-25 — superseded; see the DISCHARGED block
above)*: it named Phase 16.1's orphaned-asset audit as existing scope (D-166 / D-169 knowingly
tolerates orphans), expecting it to sweep an `fitout/avatars/*` cohort whose user rows carry
`e2e.avatar.*` emails, with a teardown as the alternative. **That audit was declined (D-187), and it
could not have swept these assets in any case — every one of them is still referenced by a `user`
row, so a diff sweep sees nothing to delete.** The alternative was the answer, and it is what shipped.

**Suggested owner:** ~~Phase 16.1 (orphaned-asset audit)~~ — **closed by Phase 16.1 plan 16.1-06
(D-192), teardown on both leaking cases in `e2e/avatar-crop.spec.ts`.**

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

> **TRIAGED 2026-08-26 by the phase verifier, at `d24b212`.** D6 asked for triage before the phase
> gate is read off a full run. Done — the ten failures split **3 reproducible / 7 environment**, and
> the one that "reads like a real product regression" is now diagnosed. **No data is exposed by any
> of them.** Detail below; the original D6 text follows unchanged.
>
> **The re-measurement was done properly.** The first full run was taken against a dev server whose
> `.next` this session had overwritten with `npm run build` mid-flight — the same trap `6123766`
> records. So every candidate was re-run after killing `next dev`, deleting `.next`, and letting it
> rebuild, at `--workers=1`. That reclassified one failure and confirmed the rest.
>
> **REPRODUCIBLE (3).**
>
> 1. **`public-listing.spec.ts:385` — a draft listing 404s to the public. THE PRODUCT IS NOT LEAKING;
>    the STATUS CODE is wrong.** Measured over HTTP, outside Playwright: a draft returns **200**, and
>    the body is the not-found page — *"We couldn't find that page"* — with the draft's title
>    **absent** (checked against a draft with a real title, `KAI Sports Center`; the first two draft
>    rows have empty titles and would have made a `grep -F` leak-test vacuously true).
>    `page.tsx:252`'s gate (`status !== "published" → notFound()`) is correct and is firing.
>    **The cause is streaming, and it is route-wide, not draft-specific.** Isolated in two curls:
>    a *nonexistent* id on the same route is **also 200**, and a bogus path on a route with no
>    `loading.tsx` is a proper **404**. `src/app/listings/[id]/(detail)/loading.tsx` creates an
>    implicit Suspense boundary, so Next flushes the shell — committing 200 — before `notFound()` is
>    reached. **Every `loading.tsx`-bearing route in `src/app` has the same soft-404**, which is ~10
>    routes, not one. Impact is SEO/crawler correctness and any client keying off status; it is not
>    an authorisation hole. Verified in `next dev` — the mechanism is streaming, so production is
>    expected to behave the same, but that has NOT been measured.
> 2. **`cancel.spec.ts:224` — the safety property HOLDS; the copy assertion is what failed.** The
>    error context shows the redirect worked and the destination renders
>    `heading "This booking was cancelled"` at `/bookings/<id>/receipt`. The test died at line 241 on
>    `getByText(/refund on its way/i)`, **before** reaching its DB check at line 244 — so
>    *"never re-refunds"* was never disproven, and no double refund is in evidence. A status line
>    moved or was reworded out from under the assertion.
> 3. **`confirmation-decay.spec.ts:151`** — expected `/bookings`, got `/bookings/<id>`. A
>    navigation/decay-rule difference. Not money, not access.
>
> **ENVIRONMENT / CONTENTION (7)** — `hold-countdown:292`, `price-one-fact:313`, `reduced-motion:368`,
> `shell:291`, `shell:1221`, `shell:1302`, `stale-session-selfheal:90`. Every one is a timeout, a
> detached frame, an intercepted click, or a repeated bounce to `/` inside
> `helpers/booker-seed.ts:365-367`. **`reduced-motion:368` PASSED on the clean single-worker re-run**,
> which is what re-classified it out of the reproducible set.
>
> **None of the ten is Phase 16's** — `avatar-crop` is 33/33 and `overflow-320` is 64/64 *inside* the
> same failing run. **None is caught by CI**, which runs four gates and excludes eleven of the twelve
> e2e specs by decision (D-24); `price-parity` is the exception and it passes.
>
> **Suggested split for Phase 17:** the soft-404 is one fix in one place if `loading.tsx` is the
> agreed cause (or an accepted limitation to record); items 2 and 3 are assertion-vs-product
> questions someone must answer per surface; the seven are D2's per-file-fixture remedy.


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

> **CLOSED 2026-08-29 — plan 17-06.** The row carries `scope: '[data-testid="responsive-dialog"]'`
> and the measurement below is now the row's own trailing comment. The row is kept because the
> MEASUREMENT is the useful part, and because this item's diagnosis turned out to be exactly right in
> both directions.
>
> **Re-measured on the 17-06 tree rather than inherited.** Clean, in BOTH themes:
> `found true · examined 129 · scrollWidth 320 · clientWidth 320 · offenders []`. The 129 is the half
> that makes the empty list mean something — `expectNoOverflowWithin` asserts `found` and then
> `examined >= MIN_EXAMINED_ELEMENTS` before it asserts anything about width. Then the probe this item
> describes was re-run on the same tree, a 500px `<div>` appended straight into the open sheet:
> **`scrollWidth 532` against `clientWidth 320`, 48 named offenders** in court
> (`div.flex flex-col gap-2 right=516` first, the sheet's own month grid at `right=333` behind it).
> So the row can now fail, and the number this item predicted is the number it produced.
>
> **The sheet itself is clean — the finding was never that it overflowed.** It was that nobody could
> have known either way. `npx playwright test e2e/overflow-320.spec.ts --project=chromium --workers=1`
> reports **64 passed / 15 skipped** with the field in place.

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


---

## D10 — the wizard's cover-frame preview has no 320px row, and the existing wizard row cannot reach it

> **CLOSED 2026-08-26 — commit `6123766`.** The row exists, in both themes, and CROP-02 closed with it.
> Three things are worth carrying forward from doing it:
>
> 1. **The seam is the publish checklist's `Fix` link, not the step rail.** This item suggested adding
>    an `open` to `Phase14Row` and walking the rail. The rail is not walkable: `wizard.tsx` mounts with
>    only `STEPS[0]` in `visitedKeys`, so every marker past the first is an inert `<span>`. The `Fix`
>    link is a shipped control that calls `goToStep` and is reachable from the first step (14-10).
> 2. **An `open` that asserts its own arrival is not a guard.** The arrival check was written at the
>    end of the walk first; stubbing the walk to `return` early made the row PASS, because the early
>    return skipped the assertion meant to catch exactly that. It now lives on the row as `subject`,
>    asserted by the loop. **Copy that shape, not the AC#29 table's**, if either table grows another
>    walked row.
> 3. **The seeded photo count is load-bearing in both directions.** One, and only one: at zero the
>    uploader returns its empty state and there is no preview; at three `3+ photos` goes `done` and the
>    `Fix` link — the only seam — stops rendering.
>
> **And it found something no other row could.** Opening that disclosure at 320px measured `Fix`
> (20.3x20.3) and `Resend verification email` (156.1x20.3) against the 24px WCAG 2.5.8 AA bar. Both
> raised to the floor in the same commit. The inline exemption was considered and not relied on —
> taking it would have meant widening `collectControls`' filter to admit `inline-flex`, i.e. weakening
> a live gate to admit a newly-measured surface.
>
> The VRT half is deliberately NOT done — see CROP-02's block in `REQUIREMENTS.md` for why minting a
> baseline is the PM's call rather than a side effect of this.

<details><summary>The item as filed</summary>


- **Found by:** plan 16-15, Task 1, answering the question its own plan told it to ask, 2026-08-26
- **Owner file:** `e2e/overflow-320.spec.ts` — the AC#36 Phase-14 block
- **Severity:** a GATE-RESP gap on one of the two surfaces Phase 16 shipped. Not a red; an absence.

**The question 16-15's plan asked:** *"confirm, and record, that the WIZARD photos step is already a
row on this table … if it is NOT, say so explicitly and raise it rather than silently adding a route
this phase did not plan for."*

**Measured: it is not, and the row that looks like it is, is not.** `/host/listings/[id]/edit` IS a
row (AC#36 block), and its `tell` is `[data-testid="wizard-step-rail"]` — the rail, which every step
renders. The wizard opens on its FIRST step, so that row measures the basics step and has never seen
the photos step.

**Two independent things stand in the way, and neither is a scheduling problem.**

1. **No interaction seam.** `Phase14Row` has `name` / `path` / `tell` / `tellWhy` / `touch` /
   `touchWhy` and nothing else — no `open`, no equivalent. The AC#29 table above it HAS one
   (`RouteRow.open`, used by the booking sheet and, since this plan, by the crop dialog), but the two
   blocks are separate tables with separate drivers. And a URL is not an alternative: `wizard.tsx`
   holds the step in CLIENT state (`stepInList`) with no query parameter and no per-step route, so
   there is no path to point a row at.
2. **No photo in the fixture.** `grep -n "listing_photo" e2e/overflow-320.spec.ts` returns **nothing**
   — the host block seeds a listing, a booker and bookings, and no photos. `photo-uploader.tsx`
   returns its bespoke empty state before `CoverFramePreview` exists, so even a row that reached the
   photos step would photograph the empty state rather than the preview.

**What the preview's 320px risk actually is,** so whoever closes this knows what they are looking
for: the two frames are `w-32` inside a `flex … gap-2` row, i.e. 128 + 8 + 128 = **264px**, which
plan 16-06's own hand-off note says clears the gutters and does not wrap. That is an argument, not a
measurement, and this item is the measurement it is missing.

**Cheapest correct fix:** add an `open`-shaped seam to `Phase14Row` (the shape is already written one
table up), seed one `listing_photo` row into the host fixture, and add one row that walks the rail to
the photos step. ⚠ It is the SAME walk `wizard-cover-preview`'s `blocked` string in
`src/lib/design/visual-baselines.ts` says the VRT drive needs — so closing this and unblocking that
row are one piece of work, not two.

**Why 16-15 did not close it:** its Task 1 acceptance says *"Add nothing else to this file"* and
*"raise it rather than silently adding a route this phase did not plan for"*, in as many words.

**Suggested owner:** phase 16.1 (upload hardening — it owns `photo-uploader.tsx` already), or
whichever plan first needs a host drive.

</details>
