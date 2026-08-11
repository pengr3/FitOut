# Phase 10: Design-System Foundation & Theme Runtime - Context

**Gathered:** 2026-08-11
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase delivers **the token contract itself and the runtime that swaps it** — one place where colour,
type, radius, elevation, spacing and motion live; two named themes that re-skin the entire app with zero
component edits; and the measured, already-shipped defects fixed *before* any visual baseline exists.

**No surface is redesigned in this phase.** Search, listing detail, checkout, host tooling, auth and email
are Phases 12–15. The only component edits here are the mechanical ones the token contract forces:
the 29 literal `bg-brand …` recipes become a CVA variant, the 10 app-code `dark:` occurrences and the
19 raw palette classes become tokens, and the 14 arbitrary `text-[NNpx]` values become scale steps.

**Explicitly NOT in this phase** (each belongs to a later one, do not absorb):
- Playwright's fail-open VR config fix (GATE-01) — **Phase 11**
- The token-driven OG / share image (SHELL-04) — **Phase 11**
- The three named card patterns (DS-11) — **Phase 11**
- Loading / error / empty state families (STATE-\*) — **Phase 11**
- Any per-surface polish, header, or footer — **Phases 11–15**

</domain>

<decisions>
## Implementation Decisions

### Theme #2 — identity and reach

- **D-01:** Theme #2 travels on **colour, shape AND type** — a different hue family *and* a different
  radius, type scale and density. Rationale: `grove` is D-128's enforcement test, and a colour-only
  second theme gives DS-02 (type scale) and DS-03 (elevation) no enforcement surface at all — they
  would rest on the leak lint alone.
- **D-02:** Theme #2's character is **deep & generous** — forest/teal accent, radius `10px → 20px`,
  larger display type, pronounced elevation. Hue travels the widest gap available from coral
  (red → green), and radius/scale move *up* rather than down, so a value hardcoded near today's
  geometry cannot hide.
- **D-03:** **Both themes are light-background.** A dark-background theme would re-introduce exactly
  the doubled visual-QA surface D-129 removed. The dormant `.dark` block stays dormant.
- **D-04:** The themes are named **`court`** (the coral direction) and **`grove`** (the forest one).
  Venue metaphors, deliberately **hue-independent** — D-127 expects the placeholder tint to change,
  and a name like `coral` would either lie after a re-tint or force a `data-theme` rename across
  tests, baseline filenames and the generated token module.
- **D-05:** **Colour, type, radius and elevation are per-theme; the spacing grid and motion tokens are
  global.** Motion is a budget, not a brand expression — DS-04 caps it at 320ms with a reduced-motion
  reset, and making it themeable invites a theme to blow the cap. A constant spacing grid also keeps
  layouts from reflowing between themes, so a two-theme visual diff stays interpretable.

### Theme runtime and switching

- **D-06:** **No runtime theme switcher ships to users.** The app always renders `court`. Theme switching
  is a development/preview affordance only. These are placeholder brand directions being compared
  (D-127), not a user preference — a booker choosing a brand palette is a confusing product, not a feature.
- **D-07:** The theme is applied via a **mounted `next-themes` `ThemeProvider` at the root with a fixed
  default**, not a static `data-theme` attribute — one mechanism shared between the app and the preview
  page. **Consequence: DS-14's `suppressHydrationWarning` on `<html>` is genuinely load-bearing, not
  belt-and-braces**, because next-themes' script mutates `documentElement` pre-paint.
- **D-08:** Two override paths, one per consumer:
  - **Tests:** Playwright seeds next-themes' storage key via `addInitScript` before navigation. No app
    surface, nothing to gate, works on every route. **This is the seam Phase 11's theme-swap smoke and
    Phase 17's two-theme axe pass both depend on** — it must exist and be documented here.
  - **Humans:** a `?theme=` query param honoured **only outside production**, so a reviewer can walk a
    real checkout flow in `grove` rather than only seeing the preview page.
- **D-09 (Claude's discretion — user delegated):** THEME-04's side-by-side preview lives at a **single
  `/dev/theme` route** with a one-line `notFound()` guard when `NODE_ENV === "production"`. Not a `(dev)`
  route group — that is scaffolding for dev surfaces that do not exist. Rationale the user supplied:
  FitOut is not live, and branding will be locked before it is, so the preview is a temporary tool and
  production-gating is cheap insurance rather than a design constraint.
- **D-10 (Claude's discretion — user delegated):** The preview page renders **real components fed by
  static fixture props**, typed against the components via `ComponentProps<typeof X>` so fixture drift
  is a compile error rather than a silent lie. **Not seeded DB data** — Phase 11 and Phase 17 will
  screenshot this page, and the local UAT seed is not a committed fixture, so a DB-backed preview would
  break or render empty on a fresh clone and in CI.
  (Roadmap SC#3 already settles that it shows **real screens, not swatches** — that was not re-litigated.)

### Contrast corrections — how far AA may move the palette

- **D-11:** The 3.60:1 coral CTA failure is fixed by **darkening `--brand` itself**, not by introducing a
  second brand token and not by darkening the label. One value changes and every surface follows; there
  is no per-call-site judgement about which coral to use — a judgement the leak lint could not make.
  **The accent will visibly deepen everywhere. That is accepted.**
- **D-12:** The exact corrected value is **derived, not picked**: the `culori` test solves for the
  **lightest** coral at hue 25 that clears 4.5:1 against `--brand-foreground`. This retains the maximum
  brand brightness AA permits, re-derives if the bar or the foreground ever moves, and settles `--success`
  and `--destructive` by the same rule instead of three separate hand-picks.
  **This closes the milestone's one genuinely open value.** Neither STACK's `#da2d34` nor PITFALLS'
  `#d33a3c` is adopted, and they are explicitly **not** averaged — both documents self-flag their
  oklch→sRGB math as not tool-verified, and the roadmap already names the `culori` test as the authority.
- **D-13:** DS-06's "every pair actually used on a surface" is resolved as a **declared inventory of legal
  foreground/background pairings, plus a companion drift check that fails when a component uses a pairing
  absent from the list.** The inventory stays readable and reviewable; the drift check is what stops it
  going stale — which is the only real objection to a hand-maintained list, and it is exactly the gap that
  let PITFALLS find failing pairs (brand-on-muted 3.45, success-on-background 3.39) that STACK's headline
  four missed. Every pair must clear the bar **in both themes**.
- **D-14:** **Green retreats to the icon.** Status text is ink on a neutral tint (comfortably past 4.5:1);
  the hue lives in the icon/dot, which only has to clear the 3:1 non-text bar — so `--success` barely has
  to move. This implements DS-10's "icon + text, never colour-only" directly, rather than darkening a
  filled green badge, which is the colour-carries-meaning pattern DS-10 pushes back on.

### The leak gate

- **D-15:** **DS-13's ban is widened beyond its literal wording** to include raw Tailwind palette classes
  (`bg-zinc-50`, `text-emerald-800`, `bg-black`, `bg-white`, …) alongside hex, `rgb(`, `oklch(` and
  arbitrary `text-[NNpx]`. **Recorded as a deliberate, cited expansion of DS-13.** Reason: a palette class
  is the most common way a colour actually leaks in this codebase, and a theme swap leaves it frozen —
  without this, THEME-05 fixes the 5 known files and nothing stops a 6th being added next week, quietly
  making the `grove` proof a lie. Measured cost: **20 occurrences across 6 files.**
- **D-16:** Enforced by **both ESLint and Vitest, off one shared exported pattern list.** ESLint gives a
  squiggle at the moment of typing and fails `next build`; the Vitest test is the authoritative gate and
  lives alongside DS-06's contrast test and DS-12's drift check. One source of truth, two consumers, no
  drift between them.
- **D-17:** The gate **scans `src/components/ui/**` too — no vendored exemption.** Measured: the 30
  vendored primitives contain **0 raw hex and exactly 1 `bg-black`**, so they are already essentially
  token-pure and this costs one fix. **This is deliberately a different call from D-129's `dark:`
  reasoning, and the difference is quantitative:** D-129 exempted 56 occurrences across 14 files because
  stripping them would permanently fork shadcn; here the exposure is 1-in-30, so the vendor-fork risk from
  a future `npx shadcn add` does not outweigh leaving the files where every card, dialog and button is
  defined invisible to the gate.
- **D-18:** DS-12's generated token module is **committed to the repo, with a CI check that regenerates it
  and fails on any diff.** Readable in review, works on a fresh clone with no build step, and the
  regen-diff check is the guard. Not build-time-generated-and-gitignored (breaks fresh-clone editor
  navigation and test import ordering), and emphatically not hand-written-plus-an-equality-test — that is
  close to what already existed when `BRAND_CORAL = "#E8484E"` drifted from the live `#ef4445` unnoticed.

### Identity, type and control tokens

- **D-19:** The favicon is a **themed letterform SVG** — an "F" in Geist on the theme's brand colour, read
  from the token contract. No asset is commissioned (D-127 holds), it re-skins with the theme so it is one
  more thing the `grove` swap proves, and Phase 11's SHELL-04 share image extends the same idea rather
  than inventing one. **The OG/share image itself stays in Phase 11.**
- **D-20:** Headings use **one family differentiated by weight and tracking**. `--font-heading` remains an
  alias to `--font-sans` (both Geist), and the heading steps of the type scale carry their own **per-theme**
  weight and tracking tokens — `court` tight semibold, `grove` looser and heavier. No second font download,
  and D-127 stays clean: no typeface has been chosen, even provisionally. The `--font-heading` token is
  **kept** (not dropped) so real branding later has a seam to slot a display face into.
- **D-21:** An un-varianted `<Button>` **stays neutral** (`--primary`, near-black); booker CTAs opt in with
  `variant="brand"`. Matches the roadmap's stated hierarchy (brand → default → outline → ghost → link) and
  protects `02-UI-SPEC.md`'s deliberate 10%-accent budget — coral appears only where someone asked for it.
  All 29 literal recipes are edited to the explicit variant.
- **D-22:** DS-09's 44px is an **explicit `size="touch"` CVA size, opted into per call site** — not a
  responsive default. Readable in the code, and it never silently changes a dense host table's mobile
  rendering. **Consequence to carry forward: this makes Phase 17's a11y audit the mechanism that catches
  misses**, since nothing enforces it automatically.

### Claude's Discretion

The user explicitly delegated **D-09** and **D-10** (preview page location, gating, and data source),
with the stated reason that FitOut is not live yet and branding will be locked before launch — so the
preview is a temporary tool and should not attract structure. Both decisions are recorded above with
their rationale; the planner may adjust the mechanics but not the intent (single route, cheap production
guard, deterministic fixture data).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### The measured defect list — read this first
- `.planning/research/SUMMARY.md` § *The Verified Defect List (consolidated)* — every row is a
  measurement with `file:line`, not a claim. This is the highest-value table for this phase.
- `.planning/research/SUMMARY.md` § *Where the Researchers Disagreed* — items 3 and 5 are the open
  `--brand` value and the STACK-vs-PITFALLS contrast-pair mismatch, both resolved by **D-12** and **D-13** above.
- `.planning/research/SUMMARY.md` § *Decision Items Requiring a Human Call* — all three are now closed
  (D-132 focus ring, D-129-amended `dark:` scope, D-133 theme count). **Do not reopen them.**

### Token and theme mechanics
- `.planning/research/STACK.md` — compiled the real `globals.css` with `@tailwindcss/cli@4.3.0`; the
  `@theme inline` mechanism, the `--font-sans` cycle, `--text-*` modifier survival.
- `.planning/research/ARCHITECTURE.md` — Pattern 1 (keep shadcn's semantic token names; its named
  Anti-Pattern AP-1 explains why), Pattern 2 (`data-theme` not `class`).
- `.planning/research/PITFALLS.md` — Pitfall 6 (the `BRAND_CORAL` leak), Pitfall 7 (the full 11-pair
  contrast audit — **the working list for the correction task**), Pitfall 11 (the grep-measured 56/10
  `dark:` split), Pitfall 12 (`ui/sonner.tsx` mis-theming), AP-2 (dropping `@theme inline` silently
  kills nested `[data-theme]` theming while the app-wide switcher still appears to work).

### Binding prior contracts
- `.planning/milestones/v1.0-ui-specs/02-UI-SPEC.md` §93 — the accent is **not** used for form focus
  rings; the deliberate 10%-accent budget. Binds **D-21**; already resolved for the ring by D-132.
- `.planning/milestones/v1.0-ui-specs/02-UI-SPEC.md` §223 — **contains a verified-false claim** (asserts
  the coral CTA is ≈≥4.5:1; the real value is 3.60:1). Do not treat this line as authority; **D-12** supersedes it.
- `.planning/ROADMAP.md` § *Phase 10* and § *Cross-Cutting Constraints (v1.1)* — the five hard gates,
  the ordering invariants, and GATE-06 (zero schema migrations).
- `.planning/REQUIREMENTS.md` § *Design System (DS)* and § *Theming (THEME)* — the 18 requirement texts.
- `.planning/PROJECT.md` § *Key Decisions* — D-127 through D-136.

### Design direction (unpackaged — see warning below)
- `.planning/sketches/MANIFEST.md` — the Phase-3 sketch direction this milestone continues: calm,
  Airbnb-like, coral as the single accent, warm neutrals, occupancy as a normal state never an error.

> ⚠ `.planning/sketches/` has raw sketches but **no packaged findings skill**. Run
> `/gsd-sketch --wrap-up` to make those findings available to downstream agents; until then the
> MANIFEST above is the only accessible record.

</canonical_refs>

<code_context>
## Existing Code Insights

### Measured baseline (re-run during this discussion, 2026-08-11 — supersedes stale figures)

| Leak class | app code | `src/components/ui/**` (vendored) |
|---|---|---|
| Raw hex | **2** (both `src/components/listing/listing-map.tsx` — the known drift) | **0** |
| `rgb(` / `oklch(` in TSX | 0 | 0 |
| Arbitrary `text-[NNpx]` | **14** across 10 files | 0 |
| Raw Tailwind palette classes | **19** across 5 files | **1** (`bg-black`) |
| Literal `bg-brand …` recipes | **29** | — |
| `dark:` occurrences | **10** across 5 files | **56** across 14 files |

**The `dark:` figure confirms D-129-as-amended exactly** (10 app-code across 5 files) and refutes
ARCHITECTURE.md's unreconciled "26 across 16 files". The `dark:` count/scope gap the research flagged as
needing a fresh grep at planning time **is now closed** — no need to re-measure.

Total leak-gate cleanup for this phase: **~64 edits across ~20 files.** Small enough to finish here,
which is what makes turning the gate on in Phase 10 (rather than deferring it) viable.

The 14 `text-[NNpx]` sites: `booking-row.tsx`, `refund-breakdown.tsx`, `headcount-meter.tsx`,
`payout-summary.tsx`, `notification-bell.tsx`, `bookings/[id]/cancel/page.tsx`, `bookings/[id]/page.tsx`,
`listings/[id]/book/page.tsx`, `listings/[id]/page.tsx`, `app/page.tsx`.

The 5 app-code `dark:` files: `src/app/(auth)/layout.tsx`, `src/app/(auth)/login/page.tsx`,
`src/app/(auth)/signup/page.tsx`, `src/app/(host)/host/layout.tsx`,
`src/components/booking/bookings-tabs.tsx`.

### Reusable assets
- **`@theme inline` is already present** in `src/app/globals.css:7` and is **load-bearing, not stylistic**
  — it is the entire mechanism behind THEME-04's nested `[data-theme]` preview. Three researchers verified
  this independently. **Never drop `inline`**; the app-wide switcher keeps working when you do, which is
  what makes the failure easy to miss.
- **`next-themes@0.4.6` is already a dependency** but **no provider has ever mounted** — which is why
  `src/components/ui/sonner.tsx:8` currently follows the OS colour scheme (toasts render dark on a
  dark-mode OS inside a "light-only" app). THEME-01's sonner fix must map `court`/`grove` → `light`
  explicitly rather than passing a named theme through to a prop that accepts only `light|dark|system`.
- **`--brand` / `--brand-foreground` / `--success` / `--success-foreground` tokens already exist** in both
  `:root` and `.dark`. This phase corrects their values and adds the theme layer around them; it does not
  invent the vocabulary.
- **`eslint.config.mjs` and `vitest.config.ts` both exist**, and `tests/ops/` + `tests/security/` are the
  established home for mechanical guard tests — the contrast test, the leak test and the drift checks
  belong in that convention, not in a new top-level structure.
- **The radius scale is already derived** (`--radius-sm/md/lg/xl/2xl/3xl/4xl` are all `calc()` off a single
  `--radius`), so per-theme radius is a **one-value change per theme**, not seven.

### Established patterns
- **Keep shadcn's raw token names as the semantic layer.** 4-of-4 researcher convergence: the 30 vendored
  primitives reference `bg-background` / `text-muted-foreground` directly (including in inline styles),
  five approved UI-SPECs are written in that vocabulary, and renaming either forks the vendor or creates
  two names for one value. **Do not invent a parallel vocabulary.**
- Shadow usage today is `shadow-none` ×5, `shadow-md` ×4, `shadow-sm` ×3, `shadow-xs` ×1, `shadow-lg` ×1 —
  five values collapsing into DS-03's three named steps, so some surfaces will visibly gain or lose depth.
- Z-index usage today is `z-10` ×12, `z-50` ×9, `z-0` ×2 — mapping onto DS-03's four-step scale
  (sticky bar < sheet < dialog < toast). Note for Phase 18: Leaflet's `z-index: 1000` will collide with
  `z-50` overlays, and this scale is the arbiter.

### Integration points
- `src/app/layout.tsx` — the root layout carries all of it: the `ThemeProvider` mount (D-07),
  `suppressHydrationWarning` (D-07 makes it load-bearing), the real `title`/`description`/`metadataBase`,
  and the font variables. It currently reads `title: "Create Next App"`.
- `src/app/globals.css` — the `@theme inline` block, `:root`, the dormant `.dark`, and the new
  `[data-theme="court"]` / `[data-theme="grove"]` blocks.
- `src/components/ui/button.tsx` — the CVA home for the `brand` variant (D-21) and the `touch` size (D-22).
- `src/components/listing/listing-map.tsx:22,34` — the two raw hex, replaced by imports from the generated
  token module (D-18). This file is the concrete proof of why that module exists.
- `src/app/global-error.tsx` and `src/lib/email.ts` — the other non-CSS consumers of the generated module;
  both sit **outside** the leak gate's scanned tree (`src/components/**`, `src/app/**`) except
  `global-error.tsx`, which must import constants rather than inline literals.

</code_context>

<specifics>
## Specific Ideas

- **`grove` is a deliberate opposite, not a variation.** Forest/teal accent, radius up to 20px, larger
  display type, pronounced elevation — chosen because moving radius and scale *up* (rather than the more
  obvious "tighter and cooler" direction) means a value hardcoded near today's geometry cannot coincidentally
  pass. It should read as a plausible alternate brand direction, not a test fixture.
- **The favicon should re-skin with the theme.** A themed letterform is a small thing that makes the theme
  swap visible in the browser tab — one more surface the `grove` proof covers.
- **"The accent will visibly deepen."** The user accepted a visible change to the coral rather than
  preserving today's exact hue via a second token. Do not reintroduce a `--brand-strong` escape hatch to
  "keep the coral" — that was considered and rejected in favour of one value with no call-site judgement.

</specifics>

<deferred>
## Deferred Ideas

- **A user-facing theme switcher** — considered and rejected for v1.1 (D-06). If real branding later ships
  more than one direction as a genuine product feature, it needs its own requirement, a11y story and 320px
  layout. Not a Phase 10 item and not a v1.1 item.
- **A per-theme heading typeface** (`grove` loading a genuinely different Google face) — the strongest
  possible proof that `--font-heading` is token-driven, but rejected because D-127 says v1.1 makes no
  typeface choice, even provisionally. The `--font-heading` seam is kept (D-20) so this is cheap to revisit
  when real branding lands.
- **`brand-soft` — a second accented button level** for surfaces with more than one accented control.
  Deliberately not decided before Phase 12 shows which surfaces actually need it. Revisit at Phase 12 if
  checkout or the listing rail demands it.
- **A responsive-default touch size** (44px below the tablet breakpoint automatically) — rejected in favour
  of the explicit `size="touch"` (D-22) because it would change every existing button's mobile rendering at
  once, including dense host tables. If Phase 17's audit finds many missed call sites, this is the
  documented alternative.
- **DS-03's elevation collapse direction** (which of today's five shadow values round up vs down into the
  three named steps) — surfaced and consciously left to the planner as mechanical, given the three-step
  scale and per-theme elevation are both locked.

</deferred>

---

*Phase: 10-Design-System Foundation & Theme Runtime*
*Context gathered: 2026-08-11*
