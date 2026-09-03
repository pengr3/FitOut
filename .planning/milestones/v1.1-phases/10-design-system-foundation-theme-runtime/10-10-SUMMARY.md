---
phase: 10-design-system-foundation-theme-runtime
plan: 10
subsystem: design-system
tags: [ds-10, status-vocabulary, closed-union, wcag, d-14, source-scan-gate, badge, a11y]

# Dependency graph
requires:
  - phase: 10-design-system-foundation-theme-runtime
    plan: 01
    provides: "`npm run test:design` — the DB-free Vitest gate this plan's proof joins (13 files / 226 tests before, 14 / 239 after)"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 03
    provides: "`--success` re-derived per theme and `--success-foreground` retained, which is what makes the glyph-on-fill pairing measure 3.83 / 3.84 instead of failing"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 05
    provides: "`src/lib/design/contrast-pairs.ts` — the 27-pair inventory every tone recipe's colours are drawn from, including the row that declares the ONE legal `--success-foreground` pairing"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 07
    provides: "`tests/design/focus-recipe.test.ts` — the reference walker, the Windows path normalisation and the guard-the-guard idiom this proof copies"
  - phase: 10-design-system-foundation-theme-runtime
    plan: 09
    provides: "`tests/design/brand-recipe.test.ts`'s per-file-map discipline, and the pinned 6-file accent map that is the reason `soft-accent`'s adopter could not be rewired here"
provides:
  - "DS-10 CLOSED: ONE `StatusTone` union of exactly four tones, with `STATUS_TONE_RECIPES` a TOTAL `Record` over it — a fifth tone without a recipe is TS2741, observed and reverted"
  - "`src/lib/design/status-tones.ts` — the vocabulary, plus the written audit trail mapping the two shipped vocabularies onto it"
  - "The filled green status badge retired at all FOUR sites; the single legal `--success-foreground` pairing pinned to the wizard BY NAME"
  - "Two colour-only chips (payouts-enabled, listing Live) gained the icon they never had"
  - "`tests/design/status-vocab.test.ts` (13 assertions) — the type, data and source proof, watched go red at 3 failed / 10 passed"
affects: [10-11, 10-12, 10-13, 11, 17]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A vocabulary is only closed if the map over it is TOTAL. `Record<StatusTone, Recipe>` turns a missing tone into TS2741 at the declaration site; a lookup with a fallback turns it into a chip that renders grey and nobody notices."
    - "When three tones must be distinguishable, assert the discriminator is DISTINCT, not merely that each tone has one. `neutral`/`positive`/`attention` share a surface AND a text colour by design, so `new Set(icons).size === 3` is the assertion that stops them collapsing into three names for one chip."
    - "`includes('text-success')` also matches `text-success-foreground` — the exact class the requirement declares illegal. Any class-presence check whose token has a longer sibling needs a `(?![\\w-])` boundary, or the gate reports the file carrying the BANNED class as a compliant call site."
    - "'Keep the existing icon' is a claim about the tree, not an instruction. Two of the four re-treated chips had no icon at all, which means they were colour-only — the defect the requirement exists to remove — and the plan text had them as already-compliant."
    - "A filled surface is legal when its child is provably a GLYPH and not a label. The test for 'is this a status or is this progress' is whether any branch of the element can render a text node; if none can, the non-text bar applies and the pairing is a different pairing."

key-files:
  created:
    - src/lib/design/status-tones.ts        # the closed union + the total recipe map + the reconciliation audit trail
    - tests/design/status-vocab.test.ts     # 13 assertions across the type, data and source layers
  modified:
    - src/components/booking/booking-status.ts        # tone retyped to StatusTone; 7 returns remapped
    - src/components/booking/booking-status-badge.tsx # confirmed onto the positive recipe; iconClassName slot added
    - src/components/host/payout-ledger-status.ts     # tone retyped to StatusTone; 5 returns remapped
    - src/components/host/payout-state-badge.tsx      # paid onto the positive recipe; attention Alert branch untouched
    - src/components/host/payout-banner.tsx           # positive recipe + the CheckCircle2 it never had
    - src/components/listing/listing-card.tsx         # Live onto the positive recipe + the icon it never had
    - src/app/(host)/host/listings/[id]/edit/wizard.tsx  # KEEPS its fill; both glyphs now aria-hidden; exemption documented
    - tests/booking/booking-status.test.ts            # tone assertions rewritten onto the union
    - tests/payments/earnings-view.test.ts            # tone assertions rewritten onto the union
    - .planning/phases/10-design-system-foundation-theme-runtime/deferred-items.md  # D-7 + a D-1 update

decisions:
  - "The two in-flight/closed treatments both collapse to `neutral`. `approved` and `processing` were never distinct TONES — they were a distinct BORDER wearing a tone's name — and their icons (CalendarCheck, ArrowLeftRight) were always the real discriminator."
  - "The `positive` recipe's classes are written LITERALLY at each of the four call sites, matching the repo's shipped convention (`spots-left-chip.tsx`), and pinned BY VALUE against `STATUS_TONE_RECIPES.positive` in the test. Importing the constant would have been terser and would have made the `text-success` acceptance criterion unsatisfiable at the banner; the test link buys the same anti-drift guarantee without that trade."
  - "`src/lib/design/status-tones.ts` lives outside `src/app/` and `src/components/`, so declaring `bg-brand/10` there cannot move the 6-file accent map `brand-recipe.test.ts` pins by name. Verified: 226/226 stayed green after Task 1."
  - "The listing card's three neutral status chips stay icon-free. They were never colour-carrying — their LABELS distinguish them — so `Icon` is optional on the return type rather than required."

metrics:
  duration: 22min
  tasks: 3
  files: 11
  completed: 2026-08-12
---

# Phase 10 Plan 10: Status Vocabulary (DS-10) Summary

One closed four-tone union replaces the two that had drifted apart, and the filled green badge is retired at every status site — the hue now lives in the icon and the vocabulary is a type rather than a claim in a spec.

## What Was Built

**Task 1 — `src/lib/design/status-tones.ts`** (commit `1d2be46`)

`STATUS_TONES = ["neutral", "positive", "attention", "soft-accent"] as const`, the derived `StatusTone`
union, and `STATUS_TONE_RECIPES` as a **total `Record`** over it. The totality is the whole mechanism:
a tone added without a recipe fails at the declaration, not at render.

The header carries the reconciliation as a table, so the merge is auditable rather than
archaeological — which shipped tone became which, and why. It also records the two facts the next
reader needs and cannot derive: that `--success-foreground` survives with exactly one legal pairing
(a non-text glyph on a filled `--success` surface, the wizard's progress marker) and is illegal as
text, and the binding copy rule that occupancy and unavailability are normal states, never errors,
never red.

Every colour in the map is drawn from `contrast-pairs.ts`'s declared inventory. No new pairing was
needed, so no row was added and no bar was loosened.

**Task 2 — both view layers retyped, four chips re-treated** (commit `f83873b`)

`BookingStatusView["tone"]` and `PayoutLedgerView["tone"]` are both `StatusTone` now. Twelve returns
across the two files were remapped. **No icon assignment and no label moved** — DS-10 changes the tone
treatment, never the words.

The four filled green chips took the `positive` recipe: `bg-muted` surface, `text-foreground` label,
`text-success` on the glyph alone. The wizard's completed-step marker **keeps** its fill and gained a
comment explaining why, plus `aria-hidden="true"` on both glyphs so the decorative claim is provable.

**Task 3 — `tests/design/status-vocab.test.ts`** (commit `5053169`)

13 assertions across three layers. Type: exactly four tones, a total map, D-14 structurally (the three
lifecycle tones share surface and ink and differ only in a **distinct** icon hue), and no slot of any
tone naming `--success-foreground`. Data: both derive functions driven over every status — both sides,
past and future — with a positive control so a collapse-to-`neutral` regression cannot pass. Source:
the retired pairing pinned to one named file, the four re-treated chips pinned as a **set**, and each
checked **by value** against the recipe.

## Verification Evidence

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npm run build` | exit 0 |
| `npm run test:design` | **239 passed / 14 files**, ~5s, no database (was 226 / 13) |
| `npm run test:design -- status-vocab` | 13 passed |
| Full DB suite (`npm test`) | **1197 passed / 4 skipped**, 132 files — unchanged from the wave-7 baseline |
| `npm run lint` | 0 errors, 9 warnings (all pre-existing, none in a touched file) |

**The compile gate was watched, not assumed.** A fifth tone was added to `STATUS_TONES` with no recipe:

```
src/lib/design/status-tones.ts(79,14): error TS2741: Property 'warning' is missing in type
'{ neutral: {…}; positive: {…}; attention: {…}; "soft-accent": {…}; }' but required in type
'Record<"neutral" | "positive" | "attention" | "soft-accent" | "warning", StatusToneRecipe>'.
```

`tsc` exit 2, then reverted to exit 0. The verbatim error is recorded in the test file's header.

**The source gate was watched go RED.** The retired pairing was reinstated on `payout-state-badge.tsx`'s
`paid` recipe: **3 failed / 10 passed**, on exactly the three assertions that should care (one-legal-site
count, four-call-site set, recipe-by-value), each naming the offending file. The ten type-layer
assertions stayed green, which is the correct blast radius. Reverted → 13 passed.

**The replacement classes COMPILE, not merely exist in source.** From the production build output:

```
.text-success{color:var(--success)}
.bg-muted,.bg-muted\/40{background-color:var(--muted)…
.text-foreground,.text-foreground\/60{color:var(--foreground)…
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Two shipped suites asserted the retired tone names**

- **Found during:** Task 2
- **Issue:** `tests/booking/booking-status.test.ts` (5 assertions) and `tests/payments/earnings-view.test.ts`
  (5 assertions) assert `.tone` against the old vocabulary. `tsc` does NOT catch this — `expect(x).toBe("success")`
  is type-correct against any string — so the retype passed the compiler and would have failed the suite.
  Neither file is in the plan's `files_modified`, though the plan's `<verification>` block anticipated it.
- **Fix:** Rewrote the tone assertions onto the union, and rewrote two of them to assert the **meaning**
  rather than the name of a treatment that no longer exists: "approved is neutral AND is not the positive
  signal", and "Processing is distinct from Held by its LABEL and icon rather than by its tone". Both
  files' headers now record what moved and what did not.
- **Files modified:** `tests/booking/booking-status.test.ts`, `tests/payments/earnings-view.test.ts`
- **Commit:** `f83873b`

**2. [Rule 2 - Missing critical functionality] The listing card's Live badge had NO icon**

- **Found during:** Task 2
- **Issue:** The plan says of `listing-card.tsx:80` — "replace … and keep the badge's existing icon."
  There is no existing icon. The Live chip was a green fill and a word, which makes it the one status on
  that tile a colour-blind reader could not distinguish, and it is precisely the colour-only pattern DS-10
  exists to remove. The plan flagged this for `payout-banner.tsx` and missed it here.
- **Fix:** Added `CheckCircle2` with `size-3 text-success` and `aria-hidden="true"`, and gave `statusBadge`
  an explicit return type with an **optional** `Icon`. The three neutral chips stay icon-free deliberately —
  they were never colour-carrying and their labels already distinguish them.
- **Files modified:** `src/components/listing/listing-card.tsx`
- **Commit:** `f83873b`

**3. [Rule 2 - Missing critical functionality] `aria-hidden` added to the wizard's `MinusIcon` too**

- **Found during:** Task 2
- **Issue:** The plan asks for `aria-hidden="true"` on the `CheckIcon` so the glyph is provably decorative.
  Its sibling branch renders a `MinusIcon` in the same span with the same role — an unnamed decorative
  glyph — and leaving it exposed makes the "this span contains no text" argument only half true.
- **Fix:** Added it to both branches.
- **Files modified:** `src/app/(host)/host/listings/[id]/edit/wizard.tsx`
- **Commit:** `f83873b`

### Counted Honestly, Not Absorbed

- **The plan's line references for the wizard were stale.** It cites `:1348-1358` / `:1351`; the marker
  was at `:1373` (now `:1385`). Every other line reference in the plan checked out.
- **The plan says "five shipped call sites change" but four of them are re-treatments and one is an
  exemption.** The re-treated set is four: confirmed, paid, payouts-enabled, Live. The fifth (the wizard)
  changes only by gaining `aria-hidden` and a comment. The test pins the four as a set and the fifth by
  name, so the distinction is now mechanical.
- **`soft-accent` has no adopter WIRED.** `spots-left-chip.tsx` already renders exactly those three
  classes literally, but rewiring it changes how many lines in that file match `bg-brand`, which
  `brand-recipe.test.ts` pins BY NAME as part of the DS-08 nine. The rewire and that gate have to move
  together and the file is not in this plan's scope. Logged as **D-7**, and the proof deliberately does
  not assert a soft-accent adopter — an assertion this plan is not allowed to make true.

### The Recurring Hazard, Avoided by Design

The grep-versus-comment collision (nine occurrences across this phase) did not recur, in three places
where it would have:

1. `status-tones.ts` must contain `text-success` on exactly **one** line, so the header describes
   `--success-foreground` in token form and never writes the utility class.
2. `status-tones.ts` must contain `bg-success` **zero** times, so the retired badge is described as "the
   filled green badge" throughout.
3. `wizard.tsx` must be the **only** line in `src/app` + `src/components` carrying the retired pairing, so
   its exemption comment explains the decision at length without ever quoting the class it exempts.

The test file names the pairing verbatim, which is legal because its walker roots at `src/`. That
asymmetry is stated in the header rather than assumed — and its cost is logged as a **D-1 update**, since
Tailwind's content scan roots at the repo and does not share the exemption.

## Acceptance Criteria

| Criterion | Result |
|---|---|
| `grep -c '"soft-accent"' src/lib/design/status-tones.ts` ≥ 1 | 2 |
| `grep -c "STATUS_TONE_RECIPES" src/lib/design/status-tones.ts` ≥ 1 | 2 |
| `grep -c "bg-success" src/lib/design/status-tones.ts` = 0 | 0 |
| `grep -c "text-success" src/lib/design/status-tones.ts` = 1 | 1 |
| `grep -c "never red" src/lib/design/status-tones.ts` ≥ 1 | 1 |
| `grep -rn "bg-success text-success-foreground" src/app src/components \| wc -l` = 1, in the wizard | 1, `wizard.tsx:1385` |
| `grep -c '"muted"\|"outline"' src/components/booking/booking-status.ts` = 0 | 0 |
| `grep -c '"muted"\|"outline"' src/components/host/payout-ledger-status.ts` = 0 | 0 |
| `grep -c "StatusTone"` in both view modules ≥ 1 | 3 and 3 |
| `grep -c "text-success" src/components/host/payout-banner.tsx` ≥ 1 | 1 |
| `npm run test:design -- status-vocab` exits 0 with ≥ 7 assertions | 13 |

## Threat Model Outcomes

| Threat ID | Disposition | Outcome |
|---|---|---|
| T-10-21 | mitigated | The tone is a closed union and the recipe map is a total `Record` — the gap is TS2741, observed. `status-vocab.test.ts` additionally drives both derive functions over every status with a positive control. |
| T-10-22 | accepted | Presentation only. Labels, icons and the D-102 derivation are byte-identical; no new data reaches the client (D-130 holds). |
| T-10-23 | mitigated | `--success-foreground` survives with one pairing, and the source scan pins the surviving occurrence to a single named file. A second filled green surface goes red at the file that added it, proven by the deliberate RED. |

## Known Stubs

None. Every tone in the union is reached by shipped code except `soft-accent`, whose recipe is correct
and whose surface already ships — literally rather than through the vocabulary. That is a wiring gap
documented as D-7, not a stub: no UI renders a placeholder and no data source is missing.

## Self-Check: PASSED

- `src/lib/design/status-tones.ts` — FOUND
- `tests/design/status-vocab.test.ts` — FOUND
- `src/components/booking/booking-status.ts` — FOUND
- `src/components/host/payout-ledger-status.ts` — FOUND
- Commit `1d2be46` — FOUND
- Commit `f83873b` — FOUND
- Commit `5053169` — FOUND
- `REQUIREMENTS.md` DS-10 — checked off, traceability row reads Complete
