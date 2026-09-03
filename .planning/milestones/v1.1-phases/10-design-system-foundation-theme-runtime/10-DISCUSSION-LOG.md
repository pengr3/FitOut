# Phase 10: Design-System Foundation & Theme Runtime - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-11
**Phase:** 10-Design-System Foundation & Theme Runtime
**Areas discussed:** Second theme's identity, Theme switching surface, How far AA may move coral, What the leak gate bans, Identity residue, Type scale, Button hierarchy, Touch size

---

## Second theme's identity

### Q1 — How far should theme #2 travel from the coral direction?

| Option | Description | Selected |
|--------|-------------|----------|
| Colour + shape + type | Different hue family AND radius, type scale, density. Strongest proof — a hardcoded padding, radius or font-size leaks as visibly as a colour. | ✓ |
| Colour + shape only | Different hue and radius/elevation, same type scale. Text never reflows, so VR diffs stay purely chromatic. | |
| Colour only | Same geometry and type. Cheapest, but DS-02 and DS-03 get no enforcement test at all. | |

### Q2 — What character should theme #2 have? (light background assumed either way)

| Option | Description | Selected |
|--------|-------------|----------|
| Cool & compact | Slate/indigo, radius 10→4px, tighter ramp, flat elevation. Plausible as facility-booking software. | |
| Deep & generous | Forest/teal, radius 10→20px, larger display type, pronounced elevation. Widest hue gap; moves radius/scale up. | ✓ |
| Mono & sharp | Near-monochrome, radius 2px, dense type, no shadows. Brutal leak detector but a test fixture, not a candidate direction. | |

**Notes:** The light-background constraint was stated rather than asked — a dark-background theme would re-introduce exactly the doubled QA surface D-129 removed.

### Q3 — How should the two themes be named?

| Option | Description | Selected |
|--------|-------------|----------|
| Venue metaphor | `court` / `grove`. Hue-independent, so a re-tint doesn't make the name lie. | ✓ |
| By hue | `coral` / `forest`. Most legible, but lies or forces a rename when branding lands. | |
| By role | `default` / `alt`. Zero churn, but carries no information in a side-by-side preview. | |

### Q4 — Which token families live inside each theme block vs. stay global?

| Option | Description | Selected |
|--------|-------------|----------|
| Colour, type, radius, elevation | Those four per-theme; spacing and motion global. Motion is a budget (320ms cap), constant spacing keeps VR diffs interpretable. | ✓ |
| Everything themeable | Max enforcement surface; every value duplicated, layouts reflow between themes. | |
| Colour, type, radius | Elevation also global — but then DS-03 gets no theme-swap enforcement. | |

---

## Theme switching surface

### Q1 — Who can switch themes in the shipped app?

| Option | Description | Selected |
|--------|-------------|----------|
| Nobody — dev/preview only | App always renders `court`; switching lives behind a non-production affordance. | ✓ |
| Anyone — a real switcher | Visible chrome control, persisted. Ships a feature v1.1 has no requirement for. | |
| Signed-in staff only | Env/account-gated. Middle ground, but a gating mechanism with no precedent in the codebase. | |

### Q2 — How does the shipped app apply a theme?

| Option | Description | Selected |
|--------|-------------|----------|
| Static attribute on `<html>` | Zero JS, zero flash, `suppressHydrationWarning` becomes belt-and-braces. | |
| next-themes, fixed default | One mechanism shared with the preview page; inline pre-paint script on every page; `suppressHydrationWarning` becomes genuinely required. | ✓ |

### Q3 — How does a test or human render an arbitrary route in `grove`?

| Option | Description | Selected |
|--------|-------------|----------|
| localStorage seed + non-prod param | Playwright seeds via `addInitScript`; separate `?theme=` param for humans outside production. | ✓ |
| localStorage seed only | One mechanism, no URL surface — but humans can't walk real flows in `grove` without devtools. | |
| Query param only | One mechanism for both, works without JS — but puts a theme lever in every route's URL space. | |

### Q4 — Where does the preview live, and what data backs it?

| Option | Description | Selected |
|--------|-------------|----------|
| `/dev/theme`, `notFound()` in prod | Single route, one file to audit for the gate. | *(Claude's call)* |
| A `(dev)` route group | Layout-level gate inherited by future dev surfaces. | |
| Outside `src/app` entirely | Zero production risk, but no URL to open. | |
| Static fixture props | Deterministic in CI and on a fresh clone; drift caught by types. | *(Claude's call)* |
| Seeded DB data | Truthful, but breaks whenever the seed is absent or changes. | |
| Both — fixtures with a real-data mode | Most robust, most machinery. | |

**User's response:** *"you decide, keep in mind that we do not need to worry about prod right now as we are not yet live, and most probably when we go live we have already locked in and finalized our branding and final theme"* — and the same for the data question.

**Notes:** Delegated to Claude. Resolved as a single `/dev/theme` route with a one-line production guard (cheap insurance, not structure) and static fixture props typed via `ComponentProps<typeof X>` — chosen because Phase 11 and 17 will screenshot this page and the local UAT seed is not a committed fixture.

---

## How far AA may move coral

### Q1 — How should the 3.60:1 coral CTA failure be fixed?

| Option | Description | Selected |
|--------|-------------|----------|
| Darken the token | `--brand` moves darker until the label clears 4.5:1. One value, every surface follows. Accent visibly deepens. | ✓ |
| Keep coral, add `--brand-strong` | Today's coral survives for fills; a darker token for text/labels. Two values, per-call-site judgement the lint can't make. | |
| Darken the label side | Darken `--brand-foreground` instead. Preserves the accent but makes the CTA read as a warning chip. | |

### Q2 — What decides the exact corrected `--brand` value?

| Option | Description | Selected |
|--------|-------------|----------|
| Solve for the lightest passer | culori derives the lightest coral at hue 25 clearing 4.5:1. A rule, not a pick; settles `--success`/`--destructive` too. | ✓ |
| Adopt a research value, verify | Cite STACK or PITFALLS explicitly and confirm. Fast, but locks a number nothing re-derives. | |
| Pick by eye, then verify | Best aesthetic outcome; a subjective step with no derivation behind it. | |

**Notes:** Explicitly closes the milestone's one flagged-open value. Neither `#da2d34` nor `#d33a3c` is adopted, and they are not averaged.

### Q3 — How does the contrast test know which pairs are "actually used on a surface"?

| Option | Description | Selected |
|--------|-------------|----------|
| Declared inventory, drift-checked | Hand-maintained pair list PLUS a check that fails on any pairing absent from it. | ✓ |
| Declared inventory only | Simple and readable, but a newly invented pairing passes silently. | |
| Auto-derive from usage | Nothing hides, nothing goes stale — but false-positive-prone, and a flaky build gate gets disabled. | |

### Q4 — Does green survive as the positive status colour?

| Option | Description | Selected |
|--------|-------------|----------|
| Green on the icon only | Text is ink on a neutral tint; hue lives in the icon at the 3:1 bar. Implements DS-10's "icon + text" directly. | ✓ |
| Darken `--success` | Green badges survive as-is, just deeper — but a filled green badge is colour-carrying-meaning. | |
| No green at all | Strongest reading of DS-10; costs peripheral-vision scannability on host tables. | |

---

## What the leak gate bans

### Q1 — Widen DS-13 beyond its literal wording?

| Option | Description | Selected |
|--------|-------------|----------|
| Widen — ban palette classes too | Adds the Tailwind palette scale + white/black. Measured cost: 20 occurrences across 6 files. | ✓ |
| Keep DS-13 as written | Smallest diff, no scope argument — but misses the most common way a colour actually leaks here. | |
| Widen, warn on palette | Non-blocking warning for palette classes — but D-135's exact lesson is that a gate that never fails trains reviewers to scroll past it. | |

**Notes:** Presented alongside a fresh measurement showing the vendored primitives are already essentially token-pure (0 hex, 1 `bg-black`), which removed the vendor-fork objection that shaped D-129.

### Q2 — What enforces the leak ban?

| Option | Description | Selected |
|--------|-------------|----------|
| Both, one shared pattern list | One exported pattern module; ESLint for editor + build, Vitest as the authoritative gate. | ✓ |
| Vitest only | Colocated with the contrast test; no feedback until the suite runs. | |
| ESLint only | Fires while typing; can't share logic with the culori test. | |

### Q3 — How is the generated token module kept from drifting?

| Option | Description | Selected |
|--------|-------------|----------|
| Committed + regen-diff check | Checked in, CI regenerates and fails on diff. Readable in review, works on a fresh clone. | ✓ |
| Generated at build, gitignored | Cannot drift by construction; breaks fresh-clone navigation and test import ordering. | |
| Hand-written + equality test | Least machinery — and close to what existed when `BRAND_CORAL` drifted unnoticed. | |

### Q4 — Does the gate scan the 30 vendored primitives?

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, scan them | No exemption. Costs one `bg-black` fix; a future `npx shadcn add` could break the build at 1-in-30 odds. | ✓ |
| Exempt them | Mirrors D-129's reasoning — but blinds the gate to where every card, dialog and button is defined. | |
| Scan with a documented allowlist | Handles `npx shadcn add` without blanket exemption; an allowlist is a thing people add to rather than fix. | |

---

## Identity residue

### Q — What replaces the default Next favicon, given D-127 commissions no brand assets?

| Option | Description | Selected |
|--------|-------------|----------|
| Themed letterform SVG | "F" in Geist on the theme's brand colour, read from the token contract. Re-skins with the theme. | ✓ |
| Static neutral mark | Obviously a placeholder, zero token coupling — the one piece of identity the swap can't touch. | |
| Lucide glyph in brand colour | Themeable and legible, but reads as more of a real logo choice than a placeholder should. | |

**Notes:** Scoped to the favicon only — the OG/share image is Phase 11's SHELL-04.

---

## Type scale

### Q — Should headings differ from body by more than size?

| Option | Description | Selected |
|--------|-------------|----------|
| One family, weight + tracking | `--font-heading` stays an alias; heading steps carry per-theme weight/tracking. No second font, D-127 stays clean. | ✓ |
| Per-theme heading family | `grove` loads a different Google face — strongest proof `--font-heading` is real, but makes a typeface choice D-127 defers. | |
| Drop `--font-heading` | Fewest tokens, but no seam for a display face when real branding lands. | |

---

## Button hierarchy

### Q — What does an un-varianted `<Button>` render as?

| Option | Description | Selected |
|--------|-------------|----------|
| Stays neutral, brand explicit | `default` keeps `--primary`; CTAs opt in with `variant="brand"`. Protects the 10%-accent budget. | ✓ |
| `default` remaps to brand | Fewest edits, right colour by default — but coral spreads to every unconsidered button. | |
| Two brand levels | `brand` + `brand-soft`. Expresses real hierarchy, but a third judgement before Phase 12 shows the need. | |

---

## Touch size

### Q — How is DS-09's 44px applied?

| Option | Description | Selected |
|--------|-------------|----------|
| Explicit `size="touch"` | Named CVA size, opted into per call site. Readable; never silently changes a dense host table. | ✓ |
| Responsive default | Compliant everywhere with no discipline — but changes every existing button's mobile rendering at once. | |
| Responsive default + opt-out | Right default with an escape hatch; the opt-out is an a11y regression waiting to be used casually. | |

---

## Claude's Discretion

- **Preview page location and gating** (CONTEXT D-09) — user delegated with the reason that FitOut is not live and branding will be locked before launch.
- **Preview page data source** (CONTEXT D-10) — same delegation.

## Deferred Ideas

- A user-facing theme switcher — rejected for v1.1; needs its own requirement, a11y story and 320px layout if real branding ever ships multiple directions.
- A per-theme heading typeface (`grove` on a different Google face) — rejected under D-127; the `--font-heading` seam is kept so it's cheap to revisit.
- `brand-soft`, a second accented button level — deliberately not decided before Phase 12 shows which surfaces need it.
- A responsive-default touch size — rejected in favour of explicit `size="touch"`; documented as the alternative if Phase 17's audit finds many misses.
- DS-03's elevation collapse direction (which of five shadow values round up vs down into three steps) — surfaced and left to the planner as mechanical.
