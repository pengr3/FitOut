# Architecture Research — v1.1 Front-End Polish & Placeholder Design System

**Domain:** Design-system + visual-polish layer over an already-shipped Next.js 16 App Router marketplace
**Researched:** 2026-08-11
**Confidence:** HIGH for the token/theme mechanics, App Router boundary semantics, container queries and email-client CSS support (all verified against current official docs, plus direct inspection of the shipped codebase). MEDIUM for the visual-regression baseline-budget recommendation (a judgement call, not a documented standard).

> **This file replaces the v1.0 domain-architecture research** that previously lived at this path (backend/marketplace structure, written 2026-06-03). That version is preserved in git at commit `91ce00e` and should be archived to `.planning/milestones/v1.0-research/` by the orchestrator. Nothing in this document redesigns the backend.

---

## Standard Architecture

The whole milestone is one idea: **insert a value layer between "what a component asks for" and "what colour/size it gets", and make a second theme the test that the layer has no holes.** Everything else — patterns, states, responsive, email, baselines — is either machinery that makes the layer cheap to use, or a gate that proves it was used.

### System Overview — the token cascade

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  TIER 1 — PRIMITIVES         src/styles/tokens/themes/<theme>.css            │
│  Raw ramps. Named for WHAT THEY ARE. One set per theme. Never referenced      │
│  by a component, ever.                                                        │
│    --ramp-coral-500  --ramp-neutral-050…950  --ramp-green-600                │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ (same file, second block)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  TIER 2 — SEMANTIC ROLES     src/styles/tokens/themes/<theme>.css            │
│  Named for the ROLE they play. This IS shadcn's vocabulary, kept verbatim,   │
│  plus the handful of roles shadcn has no word for.                            │
│    --background --foreground --card --popover --primary --secondary          │
│    --muted --accent --destructive --border --input --ring                     │
│    --brand --brand-foreground --success --success-foreground   (FitOut, ship'd)│
│    --surface-sunken --surface-sunken-foreground                (NEW, v1.1)    │
│    --radius  --shadow-raised --shadow-overlay                  (NEW, v1.1)    │
│    --text-display --text-heading --text-body --text-label      (NEW, v1.1)    │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │ @theme inline  (src/styles/tokens/contract.css)
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  TIER 3 — UTILITY REGISTRATION   ONE file. Values-free. Never per-theme.     │
│    --color-background: var(--background);   → bg-background / text-background │
│    --shadow-raised:    var(--shadow-raised);→ shadow-raised                   │
│    --text-display:     var(--text-display); → text-display                    │
└───────────────────────────────┬──────────────────────────────────────────────┘
                                │
┌───────────────────────────────▼──────────────────────────────────────────────┐
│  CONSUMERS                                                                    │
│  src/components/ui/**       30 vendored shadcn primitives — UNFORKED          │
│  src/components/patterns/** NEW: PageHeader, EmptyState, ErrorState, …        │
│  src/components/{domain}/** availability, booking, group, host, listing, …    │
│  src/app/**                 27 route files                                    │
└──────────────────────────────────────────────────────────────────────────────┘
                                │
                  ┌─────────────┴──────────────┐
                  │  values needed as LITERALS │
                  ▼                            ▼
        scripts/gen-palette.ts  ──────▶  src/lib/theme/palette.generated.ts
                                                │
                        ┌───────────────────────┼───────────────────────┐
                        ▼                       ▼                       ▼
              src/lib/email/shell.ts   src/app/global-error.tsx   listing-map.tsx
              (inline styles —         (Next 16: does NOT get     (Leaflet SVG
               CSS vars unusable        your global styles)        marker fill)
               in email)
```

The right-hand branch is the load-bearing subtlety of this milestone: **there are exactly three places where a token value cannot arrive as a CSS custom property**, and all three are solved by one generated module rather than three hand-copied hex strings.

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| `src/styles/tokens/themes/*.css` | Every colour/size VALUE in the product, per theme | One file per theme; primitives + semantic mappings; scoped `:root, [data-theme="x"]` (default) or `[data-theme="x"]` |
| `src/styles/tokens/contract.css` | The NAME registry — which tokens exist as Tailwind utilities | A single `@theme inline` block. Contains no values. |
| `src/app/globals.css` | Entry point + base layer only | `@import "tailwindcss"` → theme files → contract → `@layer base` |
| `src/lib/theme/themes.ts` | The theme REGISTRY (ids + labels + default) | Plain TS `as const`. Four consumers: provider, switcher, Playwright projects, palette generator. |
| `src/components/theme/theme-provider.tsx` | Runtime theme selection + persistence | `next-themes` `attribute="data-theme"`, `enableSystem={false}` |
| `src/components/ui/**` | Vendored shadcn primitives | Upstream-owned. Edit only to delete `dark:` classes (D-129). |
| `src/components/patterns/**` | Domain-ignorant compositions: header, empty, error, skeleton, stat, list, section, sticky bar | **Server Components by default** — no `"use client"` |
| `src/components/{domain}/**` | Everything that knows a booking/listing/payout exists | Unchanged ownership; restyled in place |
| `src/lib/email/**` | The branded email shell + the resolved palette | Plain string templating; no new email stack (D-66) |
| `e2e/visual/**` | Baselines per route × theme × viewport | Playwright projects derived from `themes.ts` |

---

## Recommended Project Structure

New files marked **[NEW]**, changed files **[MOD]**, everything else is context.

```
src/
├── app/
│   ├── globals.css                       [MOD] shrinks to imports + @layer base
│   ├── layout.tsx                        [MOD] suppressHydrationWarning, ThemeProvider,
│   │                                           real metadata, font var fix
│   ├── error.tsx                         [NEW] root segment error boundary
│   ├── global-error.tsx                  [NEW] inlines its own styles (see §3)
│   ├── not-found.tsx                     [NEW] styled 404 inside the root layout
│   ├── loading.tsx                       [NEW] search-home skeleton
│   ├── (preview)/preview/page.tsx        [NEW] side-by-side theme gallery (D-128 proof surface)
│   ├── (app)/
│   │   ├── layout.tsx                    [MOD] Suspense-wrap the notifications read (see §3)
│   │   ├── bookings/loading.tsx          existing — restyle onto patterns/
│   │   ├── bookings/error.tsx            [NEW]
│   │   ├── bookings/[id]/not-found.tsx   [NEW] the owner-gated calm copy (04-UI-SPEC)
│   │   └── profile/loading.tsx           [NEW]
│   ├── (auth)/layout.tsx                 [MOD] bg-zinc-50/dark:bg-black → --surface-sunken
│   ├── (host)/host/
│   │   ├── layout.tsx                    [MOD] same Suspense fix + token swap
│   │   ├── loading.tsx  error.tsx        [NEW]
│   │   ├── bookings/loading.tsx …        [NEW] per-segment
│   │   ├── earnings/loading.tsx          [NEW]
│   │   └── requests/loading.tsx          [NEW]
│   ├── listings/[id]/
│   │   ├── loading.tsx  not-found.tsx    [NEW]
│   │   └── book/loading.tsx  error.tsx   [NEW]
│   └── invite/[token]/not-found.tsx      [NEW]
│
├── styles/                               [NEW DIRECTORY]
│   └── tokens/
│       ├── contract.css                  [NEW] the ONE @theme inline block
│       └── themes/
│           ├── coral.css                 [NEW] D-127 placeholder; `:root, [data-theme="coral"]`
│           ├── slate.css                 [NEW] the PROOF theme (D-128)
│           └── dusk.css                  [LATER] the dormant dark block (D-129), not wired in v1.1
│
├── components/
│   ├── theme/                            [NEW DIRECTORY]
│   │   ├── theme-provider.tsx            [NEW] "use client"
│   │   └── theme-switcher.tsx            [NEW] "use client", mounted-guard
│   ├── patterns/                         [NEW DIRECTORY] — see §2 for the decision rule
│   │   ├── page-header.tsx               h1 + lede + optional action slot
│   │   ├── section.tsx                   Separator + h2 + body rhythm
│   │   ├── empty-state.tsx               the dashed shell, currently copy-pasted 5×
│   │   ├── error-state.tsx               role="alert" + retry slot
│   │   ├── card-grid-skeleton.tsx        the 6-card grid, needed by BOTH loading.tsx and SearchResults
│   │   ├── panel-skeleton.tsx            single-block skeleton
│   │   ├── stat-card.tsx                 host earnings/payouts figures
│   │   ├── data-list.tsx                 label/value rows (NOT PriceBreakdown — money is domain)
│   │   ├── form-section.tsx              wizard step scaffold
│   │   ├── responsive-dialog.tsx         bottom-sheet ↔ centred dialog, ONE component (§5)
│   │   └── sticky-action-bar.tsx         mobile CTA bar, CSS-positioned (§4/§5)
│   ├── ui/**                             [MOD] delete 26 `dark:` classes across 16 files
│   └── {availability,booking,group,host,listing,notifications,search}/**   [MOD] restyle
│
├── lib/
│   ├── theme/
│   │   ├── themes.ts                     [NEW] the registry — 4 consumers
│   │   └── palette.generated.ts          [NEW] committed build artifact (do not hand-edit)
│   ├── nav.ts                            [NEW] the nav link list, one source, two placements (§5)
│   └── email/                            [MOD-MOVE] src/lib/email.ts → src/lib/email/
│       ├── index.ts                      [NEW] re-exports — every `@/lib/email` import keeps working
│       ├── send.ts                       [MOD] the existing file, verbatim send()/escapeHtml()
│       ├── shell.ts                      [NEW] renderEmail(blocks) — the branded layout
│       └── (palette imported from lib/theme/palette.generated.ts)
│
scripts/
└── gen-palette.ts                        [NEW] CSS → resolved sRGB hex → palette.generated.ts

tests/
└── theme/
    ├── palette-drift.test.ts             [NEW] regenerates in memory, asserts byte-equality
    └── no-raw-color.test.ts              [NEW] lint-as-test: no --ramp-* outside styles/tokens,
                                                no hex/raw-palette utilities in src/components

e2e/
└── visual/                               [NEW DIRECTORY]
    ├── freeze.css                        stylePath: kill animation/transition/caret
    ├── booker.visual.spec.ts
    ├── host.visual.spec.ts
    ├── auth.visual.spec.ts
    └── __screenshots__/{projectName}/…   baselines (see §8)
```

### Structure Rationale

- **`src/styles/` rather than more of `src/app/globals.css`.** `components.json` points `tailwind.css` at `src/app/globals.css`, and `npx shadcn add` writes new CSS variables into that file. Keeping `globals.css` as the *entry* preserves that contract — anything shadcn injects lands somewhere visible and obviously not-yet-migrated — while the contract and the per-theme values live in files a human owns. Do **not** repoint `components.json`.
- **One file per theme, containing both tiers.** The alternative (one `primitives.css` + per-theme override files) reads cleaner but is wrong here: two themes with genuinely different hues need different *ramps*, not just different mappings. Putting a theme's ramp and its role mapping in one file means adding a theme is adding one file, and a reviewer can read a whole theme in one screen.
- **`patterns/` as a sibling of `ui/`, not a subfolder.** `ui/` is upstream territory. A subfolder invites `shadcn add` to think it owns things, and blurs the "never hand-edit" rule that keeps the 30 vendored components cheap to update.
- **`lib/theme/` not `lib/tokens/`.** The module is consumed by the provider, the switcher, the test matrix and the generator — "theme" is the shared noun in all four.

---

## Architectural Patterns

### Pattern 1 — Three-tier tokens, with shadcn's names AS the semantic layer

**What:** Primitives (`--ramp-*`) → semantic roles (shadcn's names, verbatim, plus FitOut extensions) → Tailwind utility registration (`@theme inline`).

**The key decision: do NOT invent a parallel semantic vocabulary.** The tempting move is a FitOut namespace — `--color-surface-raised`, `--color-text-muted` — sitting alongside shadcn's `--card`, `--muted-foreground`. Reject it, for three reasons:

1. The 30 vendored `ui/` components emit `bg-background`, `text-muted-foreground`, `border-border`. A parallel vocabulary either forks them (forbidden) or leaves two utility names for the same value, which is a drift generator, not a contract.
2. shadcn's `X` / `X-foreground` pairing already *is* a semantic contract. It is under-specified (no elevation, no type scale) but not wrong.
3. Five locked UI-SPECs (`02` through `09`) are written in this vocabulary — `--muted`, `--brand`, `--success`, the 60/30/10 split. Renaming invalidates five approved contracts for zero gain.

So the semantic layer is: shadcn's set, **kept**, plus exactly the roles it lacks.

**What primitives buy you, given that.** The split still matters, because without it a theme file is 40 hand-tuned oklch literals with no internal relationships, and "make the coral slightly warmer" is 6 edits that must stay consistent. With it, a theme file is ~14 ramp values and ~30 one-line mappings; the mappings are near-identical across themes, so a diff between two themes shows *only* the design decisions.

The other half of the split's value is enforcement: **`--ramp-*` may appear only inside `src/styles/tokens/themes/`.** That is a one-line grep, and it is the mechanical form of "no component references a raw value."

**Roles to ADD in v1.1 (the complete list — resist adding more):**

| New token | Why it must exist | Evidence from the shipped code |
|---|---|---|
| `--surface-sunken` / `--surface-sunken-foreground` | The "app chrome / recessed page" role. There is no shadcn token for it, so it leaked as raw values. | `src/app/(auth)/layout.tsx:15` `bg-zinc-50 dark:bg-black`; `src/app/(host)/host/layout.tsx:84` `bg-zinc-50 dark:bg-zinc-900` |
| `--text-display` `--text-heading` `--text-body` `--text-label` (Tailwind `--text-*` namespace) | The 4-size/2-weight contract is currently expressed as arbitrary values, so "the type scale" is not a token at all. | `sm:text-[28px]` in `src/app/page.tsx:122`, `src/app/listings/[id]/page.tsx`, and the reserve page |
| `--shadow-raised` `--shadow-overlay` (Tailwind `--shadow-*`) | Elevation is currently ad-hoc (`ring-1 ring-foreground/10`, default `shadow`). A theme cannot change elevation without a token. | `src/components/listing/listing-map-panel.tsx:36` |

**Do NOT add:** a scarcity amber, a sold-out red, a spots-left green, per-status surface tints. 09-UI-SPEC settles this and the alpha-of-token idiom (`bg-brand/10 border-brand/30`) already gives soft tints that follow the theme automatically.

**Example — the shape of a theme file:**

```css
/* src/styles/tokens/themes/coral.css — the D-127 placeholder. Imported FIRST. */
:root,
[data-theme="coral"] {
  /* TIER 1 — primitives. Never referenced outside this directory. */
  --ramp-neutral-000: oklch(1 0 0);
  --ramp-neutral-050: oklch(0.985 0 0);
  --ramp-neutral-100: oklch(0.97 0 0);
  --ramp-neutral-200: oklch(0.922 0 0);
  --ramp-neutral-500: oklch(0.556 0 0);
  --ramp-neutral-900: oklch(0.205 0 0);
  --ramp-neutral-950: oklch(0.145 0 0);
  --ramp-coral-500:   oklch(0.637 0.208 25);
  --ramp-green-600:   oklch(0.62 0.17 150);
  --ramp-red-600:     oklch(0.577 0.245 27.325);

  /* TIER 2 — semantic roles. shadcn's names, verbatim. */
  --background: var(--ramp-neutral-000);
  --foreground: var(--ramp-neutral-950);
  --card: var(--ramp-neutral-000);
  --card-foreground: var(--ramp-neutral-950);
  --muted: var(--ramp-neutral-100);
  --muted-foreground: var(--ramp-neutral-500);
  --border: var(--ramp-neutral-200);
  --ring: var(--ramp-neutral-500);
  --brand: var(--ramp-coral-500);
  --brand-foreground: var(--ramp-neutral-050);
  --success: var(--ramp-green-600);
  --destructive: var(--ramp-red-600);

  /* TIER 2 — FitOut extensions (v1.1). */
  --surface-sunken: var(--ramp-neutral-050);
  --surface-sunken-foreground: var(--ramp-neutral-950);
  --shadow-raised: 0 1px 2px oklch(0 0 0 / 6%), 0 4px 12px oklch(0 0 0 / 5%);
  --shadow-overlay: 0 12px 32px oklch(0 0 0 / 12%);

  --radius: 0.625rem;
}
```

```css
/* src/styles/tokens/contract.css — NAMES ONLY. Never edited by a theme phase. */
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  /* … every existing mapping from globals.css, unchanged … */
  --color-surface-sunken: var(--surface-sunken);
  --color-surface-sunken-foreground: var(--surface-sunken-foreground);

  --font-sans: var(--font-geist-sans);      /* ← the bug fix; see below */
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-geist-sans);

  --text-display: 1.75rem;   --text-display--line-height: 1.2;
  --text-heading: 1.25rem;   --text-heading--line-height: 1.25;
  --text-body:    1rem;      --text-body--line-height: 1.5;
  --text-label:   0.875rem;  --text-label--line-height: 1.4;

  --shadow-raised: var(--shadow-raised);
  --shadow-overlay: var(--shadow-overlay);

  --radius-sm: calc(var(--radius) * 0.6);
  /* … existing radius scale … */
}
```

**Three mechanics that will bite if not stated explicitly:**

1. **`inline` is load-bearing and must stay.** `@theme inline { --color-background: var(--background) }` compiles to `.bg-background { background-color: var(--background) }` — the utility reads the outer variable *at the element*, so a nested `[data-theme]` re-skins its subtree. Drop `inline` and Tailwind emits `:root { --color-background: var(--background) }` plus a utility reading `--color-background`; the substitution happens once at `:root`, and nested theming silently stops working. The side-by-side preview (§ Theme runtime) depends entirely on this. *(Tailwind docs: `inline` makes "the utility class use the resolved value instead of a variable reference".)*
2. **`[data-theme="x"]`, never `html[data-theme="x"]`.** The attribute selector must match at any depth or the preview gallery cannot nest themes.
3. **`:root` and `[data-theme]` have equal specificity (0,1,0), so source order decides.** The default theme must therefore be written `:root, [data-theme="coral"] { … }` and imported **first**; every other theme file is imported after it. Get this backwards and the second theme appears to work in the switcher but not on first paint, or vice versa — a confusing, intermittent-looking failure.

**Trade-offs:** the three-tier cascade adds one indirection when debugging in DevTools (`bg-card` → `--card` → `--ramp-neutral-000`). Acceptable; DevTools shows the resolved value on the computed panel. The bigger cost is discipline: primitives are only useful if nothing outside the token directory touches them, which is why the grep test is not optional.

**Scaffold residue to fix in the same phase (all in `src/app/globals.css` / `src/app/layout.tsx`):**

- `--font-sans: var(--font-sans)` (`globals.css:10`) is **self-referential**. A circular custom-property reference is invalid-at-computed-value-time, so `html { @apply font-sans }` resolves to nothing and every heading in the product renders in a browser default while `font-mono` (correctly wired to `--font-geist-mono`) works. Fix: `--font-sans: var(--font-geist-sans)`. **This must land before any typographic decision is made**, or every type judgement in every later phase is made against the wrong face.
- `metadata` is still `"Create Next App" / "Generated by create next app"` (`layout.tsx:15-18`).
- `@custom-variant dark (&:is(.dark *))` (`globals.css:5`) — keep the `.dark` token block dormant per D-129, but the variant itself can go once the 66 `dark:` classes are removed.

---

### Pattern 2 — The theme runtime, and the two different jobs it has

`next-themes@0.4.6` is already installed and unmounted. Two distinct mechanisms, because "switch the app's theme" and "compare two themes side by side" are not the same problem.

**(a) App-wide, persisted — the swap mechanism.**

```tsx
// src/components/theme/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemes } from "next-themes";
import { THEME_IDS, DEFAULT_THEME } from "@/lib/theme/themes";

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemes
      attribute="data-theme"          // NOT class — `.dark` stays dormant (D-129)
      themes={[...THEME_IDS]}          // passing `themes` REPLACES the default light/dark set
      defaultTheme={DEFAULT_THEME}
      enableSystem={false}             // D-129: light-only; no prefers-color-scheme coupling
      disableTransitionOnChange
      storageKey="fitout-theme"
    >
      {children}
    </NextThemes>
  );
}
```

`src/app/layout.tsx` **must** gain `suppressHydrationWarning` on `<html>` — next-themes mutates that element in a pre-paint inline script, so without it React logs a hydration mismatch on every page. This is a one-word change that is easy to miss and produces a permanent console error.

The switcher (`src/components/theme/theme-switcher.tsx`) needs the standard mounted-guard (`useTheme()` returns `undefined` until mounted). Where it goes is a product call, not an architecture one; the architectural constraint is only that it must be reachable from the two shells (`(app)/layout.tsx`, `(host)/host/layout.tsx`) and from `/` — which is *not* inside a route group and currently has **no header at all**. That gap is itself a v1.1 finding: `/`, `/listings/[id]`, `/listings/[id]/book` and `/invite/[token]` render with no chrome whatsoever.

**(b) Side-by-side, not persisted — the D-128 proof surface.**

Because tokens cascade from any element, side-by-side comparison needs no provider, no iframe and no JavaScript:

```tsx
// src/app/(preview)/preview/page.tsx  — a Server Component
{THEMES.map((t) => (
  <div key={t.id} data-theme={t.id} className="bg-background text-foreground …">
    <h2>{t.label}</h2>
    <TokenSwatches />   {/* every semantic role, rendered as itself */}
    <PatternGallery />  {/* every patterns/ component in every state */}
    <SurfaceSamples />  {/* a real search card, a real price breakdown, a real empty state */}
  </div>
))}
```

This page is the enforcement artifact D-128 describes: a value that leaked into a component renders identically in both columns, and that is visible at a glance. It is also the cheapest possible visual-regression target — one screenshot covers the entire token contract.

**`src/lib/theme/themes.ts` is the single registry, with four consumers.** Adding a theme must be: add a CSS file, add one line here. If a fifth consumer appears, it reads this file too.

```ts
export const THEMES = [
  { id: "coral", label: "Coral — Airbnb-calm (placeholder)" },
  { id: "slate", label: "Slate — cool neutral" },
] as const;
export type ThemeId = (typeof THEMES)[number]["id"];
export const THEME_IDS = THEMES.map((t) => t.id) as readonly ThemeId[];
export const DEFAULT_THEME: ThemeId = "coral";
```

---

### Pattern 3 — The patterns layer, and the decision rule that keeps it from becoming a junk drawer

**Yes, introduce it.** Not on aesthetic grounds — on the grounds that D-131 makes designed loading/empty/error states a hard gate on **every** async surface, and the repo already shows what happens without a shared layer: `src/components/search/search-results.tsx` hand-rolls three separate `rounded-xl border border-dashed p-8 text-center` blocks (lines 170, 204, 242), and 09-UI-SPEC instructs the executor to "reuse the shipped dashed-border empty-state shell" by *copying it from `availability-calendar.tsx:193-206`*. That is a design system propagated by copy-paste. Multiply it by 27 routes × 3 states and the milestone produces 80 near-identical, independently-drifting blocks.

**The decision rule — three questions, in order, first "yes" wins:**

1. **Does it import a server action, a domain type, product copy, or anything under `@/lib/{booking,payments,listing,group,search,availability}`?** → it belongs in `src/components/{domain}/`. *Money, time, availability and status are domain by definition.*
2. **Would `npx shadcn add <name>` create or overwrite it?** → `src/components/ui/`. *Upstream owns it; we do not hand-edit it (except deleting `dark:` classes).*
3. **Otherwise** → `src/components/patterns/`.

The operative test for question 3, stated as a sentence a planner can apply without thinking: **could this component be dropped into a completely different product by changing only its props?** `EmptyState` yes. `PriceBreakdown` no (it knows about service fees, PHP, and the frozen-quote contract). `StatCard` yes. `PayoutSummary` no.

**Two additional hard rules for `patterns/`:**

- **No `"use client"` unless the pattern's own behaviour requires it.** A pattern that goes client drags every surface that composes it toward the client boundary — the exact D-130 hazard. Currently only `responsive-dialog.tsx` (Radix) and `sticky-action-bar.tsx` (if it needs scroll state) have a case; `page-header`, `empty-state`, `error-state`, `section`, `data-list`, `stat-card`, `form-section` and every skeleton are Server Components.
- **No product copy.** `EmptyState` takes `title`, `body`, `icon`, `actions`. It never contains the string "No spaces match those filters" — that sentence is owned by the surface, and by the UI-SPEC that approved it.

**Initial inventory, each justified by existing duplication rather than speculation:**

| Pattern | Replaces | Sites today |
|---|---|---|
| `empty-state.tsx` | the dashed-border shell | `search-results.tsx` ×3, `availability-calendar.tsx`, `date-pass-picker.tsx` |
| `error-state.tsx` | `role="alert"` + heading + body + retry | `search-results.tsx:170`, the day-fetch error in the calendar |
| `card-grid-skeleton.tsx` | the 6-card skeleton grid | `search-results.tsx:71`, and the new `app/loading.tsx` needs the *identical* thing (§4) |
| `panel-skeleton.tsx` | single-block skeleton | 09-UI-SPEC § 2b day panel; every new `loading.tsx` |
| `page-header.tsx` | `h1` + lede + optional actions | `/`, `/bookings`, `/profile`, `/host`, `/host/listings`, `/host/bookings`, `/host/requests`, `/host/earnings` — inline in ~10 pages |
| `section.tsx` | `<Separator/>` + `h2` + body | `listings/[id]/page.tsx` ×5 |
| `stat-card.tsx` | figure + label + delta | `/host/earnings`, `/host/payouts`, `/host` dashboard |
| `data-list.tsx` | label/value rows | `/bookings/[id]`, `/host/bookings/[id]`, confirmation details |
| `form-section.tsx` | wizard step scaffold | `wizard.tsx` (9 steps), `profile-form.tsx`, the auth forms |

**One thing NOT to do:** the two headers. `src/app/(app)/layout.tsx:38-42` and `src/app/(host)/host/layout.tsx:56-60` carry an explicit, identical, twice-written instruction: *"There IS no shared header component… D-04 deliberately made the host shell distinct… Do NOT refactor the two headers into one here."* Extracting a presentational `patterns/nav-bar.tsx` that both compose (keeping two distinct headers with distinct content) does not violate that, but it is optional and low-value; merging them violates D-04. Leave it, and put the note in the phase plan so a polish executor does not "helpfully" unify them.

---

### Pattern 4 — Loading / empty / error in the App Router

**The mechanics, from the Next 16 docs (verified):**

- `loading.tsx` wraps `not-found.js`, `page.js` and nested `layout.js` in a Suspense boundary. It does **not** wrap `layout.js`, `template.js` or `error.js` *in the same segment*.
- `error.tsx` must be `"use client"`; it wraps `loading.js`, `not-found.js`, `page.js` and nested layouts. It does **not** wrap the layout above it in the same segment. Root-layout errors need `global-error.tsx`.
- **`global-error.tsx` does not receive your global styles.** The Next 16 docs state this outright: *"global-error and the built-in 500 page render their own document and do not include your global styles, so an app-level theme toggle (a class or data-theme attribute) won't reach them."* This is the second of the three literal-value sites.
- **Version note for this repo:** `next@16.2.7` is installed. The `retry` prop is stable only from **16.3.0** (`unstable_retry` in 16.2.0). Write `error.tsx` against **`reset`** today and leave a `// TODO(next@16.3): retry()` marker, or the first phase to write an error boundary picks an API that does not exist yet.

**The finding that actually matters for this codebase:** the docs' caveat — *"If the layout accesses uncached or runtime data (e.g. cookies(), headers(), or uncached fetches), loading.js will not show a fallback for it… navigation blocks until the layout finishes rendering"* — applies directly. `src/app/(app)/layout.tsx` awaits `auth.api.getSession({ headers })` **plus three DB queries** (`countUnread`, `listRecent`, `readDbNow`), and `(host)/host/layout.tsx` awaits the same three plus a pending-request `count()`. So today, adding `loading.tsx` under either group buys nothing on a cross-group navigation: the browser sits on the old page while four round-trips complete, then everything appears at once.

**The fix, and it is a restructure not a rewrite:** the session check must stay blocking — it is the security gate that `redirect()`s (T-04-06 / T-04-02). The *ambient* notification read must not. Move it into an async child and suspend it:

```tsx
// src/app/(app)/layout.tsx  — sketch
const session = await auth.api.getSession({ headers: await headers() });   // stays blocking: it is the gate
if (!session?.user) redirect("/login");

return (
  <div className="flex min-h-full flex-col">
    <header …>
      <ModeSwitch … />
      <Suspense fallback={<BellSkeleton />}>
        {/* async Server Component: owns countUnread + listRecent + readDbNow */}
        <NotificationBellSlot userId={session.user.id} />
      </Suspense>
      …
    </header>
    <main className="flex flex-1 flex-col">{children}</main>
    <Toaster />
  </div>
);
```

This preserves the owner-scoped-in-the-query rule (T-07-82), preserves the try/catch degradation, and makes every `loading.tsx` below it actually fire.

**Boundary placement, by route — and which surfaces are which:**

| Route | `loading.tsx` (server data) | `error.tsx` | `not-found.tsx` | In-component state (client-owned) |
|---|---|---|---|---|
| `/` | **[NEW]** header + bar + `CardGridSkeleton` | **[NEW]** | — | `SearchResults` owns `isPending` skeleton, zero-result, cold-start, fetch error — **all four already exist and stay** |
| `/listings/[id]` | **[NEW]** gallery + rail + calendar skeleton | **[NEW]** | **[NEW]** "This space isn't available" | `AvailabilityCalendar`/`DatePassPicker` own day-loading, day-error, closed-day, no-hours (09-UI-SPEC § 2b) |
| `/listings/[id]/book` | **[NEW]** summary + breakdown skeleton | **[NEW]** | inherits root | `ReserveView` owns the expiry swap; `ReserveActions` owns submitting |
| `/bookings` | exists **[MOD]** onto `patterns/` | **[NEW]** | — | `BookingsTabs` owns tab-empty states |
| `/bookings/[id]` | **[NEW]** | **[NEW]** | **[NEW]** the owner-gated calm copy (04-UI-SPEC line 167) | cancel/group dialogs own their own pending state |
| `/host`, `/host/bookings`, `/host/requests`, `/host/earnings`, `/host/listings` | **[NEW]** each | **[NEW]** at `(host)/host/` | — | `RequestRow`, `PayoutRow`, `HostCancelDialog` own submitting/error |
| `(auth)/*` | not needed (no server data) | **[NEW]** at `(auth)/` | — | each page is `"use client"` and owns submitting/error already |
| `/invite/[token]` | **[NEW]** | **[NEW]** | **[NEW]** expired/invalid token | `RsvpForm` owns its states |
| root | **[NEW]** `app/loading.tsx` | **[NEW]** `app/error.tsx` | **[NEW]** `app/not-found.tsx` | `app/global-error.tsx` **[NEW]**, self-styled |

**The rule, stated so a planner does not have to re-derive it:**

> A route needs a `loading.tsx` if its `page.tsx` `await`s anything. A component needs its own three states if it owns a `useTransition`, a `useState` fetch, or a server-action call. **A route can need both** — and when it does, the two skeletons must be the *same component*, not two lookalikes.

`/` is exactly that case and is worth calling out because it is counter-intuitive. `SearchResults` wraps its `router.push` in `startTransition`, so React keeps the current UI and flags `isPending` rather than falling back to `loading.tsx`. That in-component skeleton is correct and must not be deleted. `loading.tsx` covers the *other* path — first load and hard navigation. Both must render `patterns/card-grid-skeleton.tsx`, or the same page will visibly shimmer two different ways depending on how you arrived.

**Granularity restructure permitted by D-130:** `src/app/listings/[id]/page.tsx` currently `await`s `getAvailability` and (for drop-in listings) `getOpenMonthAvailability` before rendering *anything* — so the photo gallery, title, amenities, map and price rail all wait on the calendar read. Moving the availability read into an async child under `<Suspense fallback={<CalendarSkeleton/>}>` lets the page paint immediately and stream the calendar in. Data fetching stays in a Server Component; nothing moves client-side; the initial-paint improvement is free. Same shape applies to `/host` and `/host/earnings`.

---

### Pattern 5 — Restructuring layout without moving logic client-side (D-130)

**The pattern already exists in this repo and is documented in its own header comment.** `src/components/booking/reserve-view.tsx` states it: *"The RSC does the owner-gate + server-frozen data read and renders the listing summary + PriceBreakdown as SERVER nodes, then hands them here as `summary`/`breakdown` props so this island ships almost no JS."* v1.1's job is to name it and apply it everywhere, not to invent it.

**Server shell → slot props → client island:**

```tsx
// page.tsx — a Server Component. Owns the data, the money, the timezone math.
export default async function Page() {
  const row = await read(db, id);                          // server-only
  const breakdown = <PriceBreakdown … />;                  // a SERVER node
  const totalLabel = formatMoney(row.quotedTotalCents, DISPLAY_CURRENCY);

  return (
    <InteractiveShell            // "use client" — layout + local UI state ONLY
      breakdown={breakdown}      // ReactNode slot: rendered on the server
      totalLabel={totalLabel}    // a formatted STRING, never the inputs
      action={confirmBooking}    // a server action reference
    />
  );
}
```

**Three rules that make it enforceable:**

1. **A client component may receive money and time as a pre-formatted string. It may never receive the inputs needed to compute one.** No `hourlyRateCents` + `hours`, no `serviceFeeBps` it looks up itself, no raw `Date` needing venue-tz math.
2. **A client boundary is a leaf or a shell — never a middle layer that re-fetches.** A shell takes `ReactNode` slots and owns layout/local state. A leaf owns one control. Anything in between becomes a data-fetching client component, which is the thing D-130 forbids.
3. **A module that reads a non-`NEXT_PUBLIC_` env value may never be imported by a `"use client"` module.** `SERVICE_FEE_BPS` and `OPEN_LOW_STOCK_MAX` are the live examples. The repo already has `tests/use-server-exports.test.ts` as precedent for enforcing a boundary rule with a test; extend the idea.

#### Temptation 1 — the sticky booking rail on `/listings/[id]`

**The pull:** the `<aside>` needs to know the picker's live selection, needs to become a fixed bottom bar at 320px, and might want a scroll-triggered shadow. All three read as "make the aside a client component."

**Why that is a money bug, not a style choice.** The rail composes `allInRateParts`, `SERVICE_FEE_BPS`, `computeServiceFee` and the cancellation ladder. `SERVICE_FEE_BPS` is a **non-public** env value: in a client bundle it is not inlined, so a configured override silently reverts to the default and the browse price disagrees with what checkout charges. This exact trap is already recorded twice in the codebase — at `availability-calendar.tsx:236-242`, and verbatim at `search-result-card.tsx:131-134`, where the all-in rate has to be composed in `src/lib/search/query.ts` precisely *because* the card is rendered from a `"use client"` shell. That is a D-75 violation reached purely by moving a wrapper.

**The correct alternative, which is what is already there:** the `<aside>` stays server-rendered. The parts that need live selection are already separate client *leaves* — `RailSelectionSummary`, `RailPassSummary`, `BookCta` — each receiving `serviceFeeBps` as a server-threaded prop. For the three pressures:

- **Sticky:** `position: sticky` is CSS. `lg:sticky lg:top-8` is already on the Card and needs no JS.
- **Mobile bottom bar:** do **not** render a second copy of `<BookCta>` — two instances of the same client island double-mount and double-fire. Move the *one* instance with CSS. The rail becomes `fixed inset-x-0 bottom-0 z-40 border-t lg:static lg:border-t-0`, with the non-essential blocks `hidden lg:block`, plus `pb-[max(1rem,env(safe-area-inset-bottom))]` and a spacer so content is not occluded. `patterns/sticky-action-bar.tsx` owns that positioning so every surface that needs it gets the identical treatment.
- **Scroll shadow:** if genuinely wanted, a 5-line `IntersectionObserver` client component that toggles a class on a wrapper. It observes; it does not own the price.

#### Temptation 2 — the map + list split on `/`

**The pull:** "a map needs coordinates in the browser, and panning should refetch, so lift the results into a client component that fetches."

**What that breaks, specifically.** `src/app/page.tsx` re-validates every URL param through `searchParamsSchema` before it reaches the query (T-04-PARAMTAMPER), and `deriveBookable` inclusion is enforced **inside** the Stage-1 SQL and deliberately never re-derived per card. A client fetcher means a client-callable search endpoint, client-chosen bbox/radius, and a second place where "which listings are bookable" could be decided. It also breaks the URL-as-state contract (D-32: shareable, SEO-indexable, Back works).

**The correct alternative:** the map is a **client leaf that receives an already-filtered, already-projected pin array as props** — precisely what `ListingMapPanel` already does for a single listing (`dynamic(..., { ssr: false })` behind a thin `"use client"` wrapper, because `ssr: false` is not allowed in a Server Component). Map interaction *navigates*: pan/zoom writes `lat`/`lng`/`radius` to the URL via `router.push`, the RSC re-reads, re-validates through `searchParamsSchema`, and re-runs `searchListings`. Zero query logic in the browser, Back works, the search stays shareable. Only the projection crosses the boundary — `{ id, title, lat, lng, priceLabel }`, already fuzzed by `publicListing()` when `showExactAddress` is false.

**And take the opportunity to shrink the existing boundary.** `SearchResults` is `"use client"`, which transitively pulls `SearchResultCard` into the client bundle even though that file has no `"use client"` of its own. Restructure it to accept the grid as a `children`/`ReactNode` slot so the cards return to being server nodes:

```tsx
// page.tsx (RSC)
<SearchResults hasMore={hasMore} sort={sort} page={page} queryString={qs}
               grid={<ResultsGrid rows={results} searchedWindow={w} />}   // SERVER node
               alternatives={<ResultsGrid rows={nearbyAlternatives} />} />
```

`SearchResults` keeps exactly what it needs to be a client component — the sort `Select`, `Load more`, the escape hatches, `useTransition` — and stops being a reason for anything downstream to be client. This is a strict improvement to the D-75 posture *and* an information-hierarchy restructure D-130 explicitly permits.

#### Temptation 3 — instant price feedback at checkout

**The pull:** the pax stepper changes; recompute the total in the browser so it feels instant.

**The correct alternative is already shipped:** `PaxStepper` uses `useOptimistic` on the **count** and `router.refresh()` re-renders the server-frozen breakdown. Optimism is permitted on the count; never on the money. State the rule: *the only number a client may invent is one the server would have produced from the same client-side input with no server-side config involved.* Headcount qualifies. Price does not.

---

### Pattern 6 — Responsive: which query for which surface

Tailwind v4 ships container queries with no plugin (`@container`, `@sm:`/`@md:`, `@max-*`, named `@container/main` + `@sm/main:`, arbitrary `@min-[475px]:`, and the `--container-*` theme namespace).

**The rule:** *does this element's correct layout depend on the size of the **screen**, or on the size of the **box it was handed**?*

| Use viewport breakpoints (`sm:` `md:` `lg:`) | Use container queries (`@container` + `@sm:` `@max-md:`) |
|---|---|
| Page scaffolding: `lg:grid-cols-[1fr_360px]` on listing detail and reserve | `SearchResultCard` — 3-up grid on desktop (~330px), full width at 320px, and a *different* width again inside a map-split list or the "You might also like" row |
| The mobile CTA bar's `lg:hidden` / `lg:static` toggle | `BookingRow` / `HostBookingRow` — full page width vs inside a narrow panel |
| Header nav collapse to drawer at `md:` | `NotificationItem` — lives inside a ~360px popover today, may live on a full page later |
| Search bar's expand-to-dialog on mobile | `StatCard` — 1/2/4-up depending on the grid it lands in |
| Page padding rhythm (`py-8 sm:py-12`) | The availability day panel, which sits in a 1-col mobile stack and a 2-col desktop grid |

Concretely: put `@container` on the grid *item* wrapper (or the card root) and author the card's internals with `@max-[20rem]:` / `@sm:`. The card then renders correctly anywhere without the parent having to tell it where it is — which is the whole point, and is what makes a `patterns/` component genuinely reusable rather than reusable-if-you-remember-the-right-breakpoint.

**One tree, not mobile/desktop forks.** Four techniques, in order of preference:

1. **Reorder with CSS, never with conditional rendering.** `flex-col-reverse`, `order-*`, `grid-template-areas`. Author the DOM in reading/tab order; let CSS choose the visual order. `{isMobile ? <A/> : <B/>}` requires JS to know the viewport, breaks SSR, doubles the visual-regression surface, and duplicates content for screen readers and crawlers.
2. **Move one instance, do not render two.** The sticky CTA bar is the canonical case — one `<BookCta>`, repositioned by `fixed … lg:static`. Two instances of a client island double-mount, double-submit, and produce two focus targets.
3. **One dialog, two presentations.** Do **not** add shadcn `sheet` alongside `dialog`; that is two focus-trap implementations, two escape behaviours, and two sets of baselines for one concept. Compose instead: `patterns/responsive-dialog.tsx` wraps `ui/dialog` and passes bottom-anchored classes below `sm` (`bottom-0 top-auto translate-y-0 rounded-t-2xl max-h-[85dvh]`) and centred above. No fork of the vendored component — `DialogContent` already takes `className`.
4. **Drawer nav: one source of truth for the links, two placements for the DOM.** The link list cannot occupy two places in the DOM at once, so the honest structure is: the *content* is authored once (`src/lib/nav.ts` + a presentational `<NavLinks>`), and it is rendered in an inline `hidden md:flex` bar and inside the `md:hidden` drawer. Use `hidden` (not `sr-only`, not `opacity-0`) so the inactive copy leaves the accessibility tree and there is exactly one navigation landmark at any viewport.

**320px pressure points to plan for explicitly** (D-131's floor is a v1.0 deferred item being paid off here): the wizard's 8–9 step indicator, the availability month grid (7 columns of ≥44px targets is 308px before padding — it fits, but only just), `PriceBreakdown`'s two-column rows, and every use of `ui/table.tsx` on the host side. **Tables become definition lists below `@md`**, not horizontally scrolling tables — a scrolling table at 320px fails both usability and the keyboard gate.

---

### Pattern 7 — The email shell, and the token-drift problem answered plainly

**The constraint:** D-66 bars React Email and any new email stack. Sends are thin plain-HTML through the private `send()` / `escapeHtml()` helpers in `src/lib/email.ts`, dispatched exclusively from Inngest functions (D-83).

**File layout.** `src/lib/email.ts` becomes a directory so the shell and the palette have somewhere to live without a second import path:

```
src/lib/email/
├── index.ts     [NEW] re-exports every public send + type
├── send.ts      [MOD] today's file verbatim — send(), escapeHtml(), all 18 sends
└── shell.ts     [NEW] renderEmail() — the branded layout
```

Every existing import specifier is `@/lib/email` (verified across `src/inngest/functions/notify.ts`, `guest-email.ts`, `ops-alert-digest.ts`, `src/lib/auth.ts`, `src/lib/group/guest-notify.ts` and four test files), so `index.ts` keeps all of them working with zero edits. Do **not** leave both `email.ts` and `email/index.ts` in place — the resolution is ambiguous and will bite.

**The shell.**

```ts
// src/lib/email/shell.ts
export type EmailBlock =
  | { kind: "heading";   text: string }
  | { kind: "paragraph"; text: string }
  | { kind: "cta";       label: string; href: string }
  | { kind: "meta";      rows: Array<[label: string, value: string]> }
  | { kind: "table";     head: string[]; rows: string[][] };   // the ops digest

/** Blocks carry RAW text. This function is the ONE place text becomes markup,
 *  and the ONE place escapeHtml() is called. Call sites must NOT pre-escape. */
export function renderEmail(opts: { preheader: string; blocks: EmailBlock[] }): string;
```

Each send collapses from hand-built markup to a block list:

```ts
export const sendBookingConfirmed = (to, spaceTitle, whenLabel, reference, bookingUrl) =>
  send(to, `Your FitOut booking is confirmed — ${spaceTitle}`,
    renderEmail({
      preheader: `You're booked at ${spaceTitle} on ${whenLabel}.`,
      blocks: [
        { kind: "heading",   text: "Booking confirmed" },
        { kind: "paragraph", text: `You're booked at ${spaceTitle} on ${whenLabel}. Booking reference ${reference}.` },
        { kind: "cta",       label: "View your booking", href: bookingUrl },
      ],
    }));
```

**This is a security upgrade, and must be planned as one.** Today WR-01 is upheld by ~40 hand-written `escapeHtml()` calls at every interpolation site — correct, but by convention. Routing everything through typed blocks makes escaping structural: there is one choke point, and a call site *cannot* forget. The migration risk is double-escaping, so the contract must be stated in the type doc ("blocks take raw text") and the call-site `escapeHtml()` calls must be deleted in the same commit. Keep `escapeHtml` exported (`tests/auth/email-escaping.test.ts` and the ops-digest PII assertion depend on the current surface), and add a per-block-kind escaping test.

#### The token problem — the plain answer

**CSS custom properties cannot be used in email, so the values must be duplicated. They must be *generated*, not copied, and a test must fail when they drift.**

The evidence, not a hedge:

- caniemail puts CSS-variable support at **45.24%**.
- **Gmail (webmail and apps) supports the `var()` function but not the variable declaration** — so `var(--brand)` in a Gmail-delivered email resolves to nothing, or to whatever fallback you wrote. A theme-aware email in Gmail is an *unstyled* email.
- **Outlook Windows (2003–2019) has no support at all.**
- Every FitOut token is authored in `oklch()`, which fares worse than custom properties in email. Values must be emitted as **literal sRGB hex**, and inline on each element's `style` attribute (Gmail also strips/clips `<style>` blocks).

So: **resolved at generate time, duplicated into a committed artifact, guarded by a parity test.**

```
src/styles/tokens/themes/*.css     ← the single source of truth (Tailwind must read it)
            │
            │  scripts/gen-palette.ts
            │    parse → resolve semantic → primitive → convert oklch → sRGB hex
            ▼
src/lib/theme/palette.generated.ts ← committed build artifact, ~9 tokens per theme
            │
            ├──▶ src/lib/email/shell.ts        inline style="background:#ffffff;color:#252525"
            ├──▶ src/app/global-error.tsx      (Next 16: no global styles reach it)
            └──▶ src/components/listing/listing-map.tsx   (replaces the hardcoded `#E8484E` at line 22)
```

- `npm run gen:palette` writes the file.
- `tests/theme/palette-drift.test.ts` re-runs the generator in memory and asserts byte-equality with the committed file. **Change a theme token without regenerating and CI goes red** — the same discipline as a Drizzle migration-drift check. This is the answer to "how are the two copies kept from drifting": they are not two hand-maintained copies. One is derived, committed for reviewability, and mechanically verified.
- The oklch→sRGB conversion is ~30 lines (oklch → oklab → linear sRGB → gamma + clamp) with no dependency; `culori` is the alternative if a dependency is acceptable. Either way it lives only in the script, never at runtime.
- **Email needs a fraction of the contract** — roughly `background`, `foreground`, `card`, `muted`, `mutedForeground`, `border`, `brand`, `brandForeground`, `success`. No radius scale, no elevation, no type tokens beyond two sizes. Keep `EmailPalette` a deliberately narrow type so the generator is not asked to solve shadows-in-Outlook.
- **Which theme does an email use?** The default, resolved at send time from `DEFAULT_THEME` in `src/lib/theme/themes.ts`. Emails go to a person who has no `data-theme`, and per-recipient email theming would be a second drift source for zero product value. Say this out loud in the shell's header comment so nobody adds it later.
- **Email hardening beyond tokens** (all inside `renderEmail`, none of it a new dependency): a 600px single-column layout table with `role="presentation"`, inline styles on every element, `bgcolor` attributes alongside CSS for Outlook, a hidden preheader span, `alt` on any image, and a total body under ~102KB so Gmail does not clip it. Web fonts are out — use a system stack; Geist will not load in most clients and a mismatched fallback is worse than an honest one.

**Corollary worth surfacing to the roadmapper:** the same generated module retires `BRAND_CORAL = "#E8484E"` at `src/components/listing/listing-map.tsx:22` — a genuine token leak into a JS constant, created because Leaflet needs a literal for an SVG `fill`. Three literal-value consumers, one generated source. That is the entire drift story for the milestone.

---

## Data Flow

### Token resolution — build time and runtime

```
BUILD                                          RUNTIME (browser)
─────                                          ─────────────────
globals.css
  @import tailwindcss                          <html data-theme="coral">   ← next-themes pre-paint script
  @import tokens/themes/coral.css   ─────────▶    :root,[data-theme=coral]{ --card: var(--ramp-neutral-000) }
  @import tokens/themes/slate.css   ─────────▶    [data-theme=slate]{ --card: var(--ramp-slate-050) }
  @import tokens/contract.css
      @theme inline {
        --color-card: var(--card)   ─────────▶    .bg-card { background-color: var(--card) }
      }                                                        └── resolved AT THE ELEMENT
                                                                   ⇒ nested [data-theme] re-skins a subtree
```

### Theme switch

```
user picks "slate"
   → next-themes setTheme("slate")
   → localStorage["fitout-theme"] = "slate"
   → document.documentElement.dataset.theme = "slate"
   → CSS custom properties re-resolve; no re-render, no server round-trip, no rebuild
```

Nothing in this path touches React state below the provider, so a theme swap costs one attribute mutation. That is why the second theme is a cheap-but-total proof: if any component hardcoded a value, it visibly does not move.

### Server-shell / client-island request flow (D-130)

```
navigation
   → RSC page.tsx: auth gate → DB read → server-side money/tz composition
   → server nodes built (PriceBreakdown, summary, ResultsGrid)
   → passed as ReactNode slot props into the client shell
   → client shell renders layout + owns local UI state (countdown, pending, expiry swap)
   → user acts → server action  OR  router.push(new URL)
   → server re-validates params / re-reads / re-freezes  → RSC re-renders
```

The invariant to keep visible: **every arrow that carries a number points server → client, already formatted.** No arrow carries a rate, a bps, or an unformatted instant.

---

## Build Order

Justified by dependency, not sequence-as-intuition. Each item names what breaks if it moves.

### Foundational — nothing can be polished before these

**A. Token contract + theme runtime + second theme + scaffold residue.**
Files: `src/styles/tokens/**`, `src/app/globals.css`, `src/app/layout.tsx`, `src/lib/theme/themes.ts`, `src/components/theme/**`, `src/app/(preview)/preview/page.tsx`, `scripts/gen-palette.ts`, `src/lib/theme/palette.generated.ts`, the `dark:` strip across 16 files.

- Every later phase writes class names that reference tokens. Tokens authored later means those class names are wrong and a sweep is owed.
- **The second theme ships here, not later.** D-128 makes the second theme the enforcement test. Adding it in a final phase means every surface built in between is unverified, and the "audit" phase becomes a rewrite phase.
- **The `--font-sans` fix must be in this phase.** It is currently self-referential, so `font-sans` resolves to a browser default. Every typographic judgement made before the fix is made against the wrong face.
- **The 66 `dark:` classes go here.** They live mostly in `ui/` (26 across 16 vendored files). Left in, they appear in every visual baseline and in every second-theme audit as noise.
- The palette generator ships here because it is derived from the finished token values and because phase G depends on it.

**B. Quality-gate machinery + patterns layer + app shell states.**
Files: `src/components/patterns/**`, `src/app/{error,global-error,not-found,loading}.tsx`, per-group `error.tsx`, the `<Suspense>` fix in both group layouts, `playwright.config.ts` visual projects, `e2e/visual/freeze.css`, `tests/theme/*.test.ts`.

- D-131 gates *every* phase. If the machinery lands after the first surface phase, that phase invents its own empty/error/skeleton components and its own baseline conventions, and the second phase either copies them or re-does them. This is the single highest-leverage ordering decision in the milestone.
- Depends on A: baselines shot before the tokens are final are all invalid.
- The two group-layout `<Suspense>` fixes belong here because every route beneath them inherits the behaviour, and because a `loading.tsx` written in a surface phase would appear not to work.

### Parallelisable — disjoint file sets, shared read-only dependencies

Once A and B exist, C–G touch disjoint trees and share only `ui/`, `patterns/` and the tokens.

**C. Booker core** — `/`, `/listings/[id]`, `/listings/[id]/book`, `/bookings/**`.
Do this **first among the parallel set**: it holds all three restructure permissions (search results, listing detail, checkout), it is the highest-risk surface (every money and availability seam), and it is where the `patterns/` inventory gets its real stress test. If a pattern is wrong, it is cheaper to learn here than after three phases have adopted it.

**D. Host tooling** — `(host)/host/**`, including the wizard and the availability editor.

**E. Auth & profile** — `(auth)/**`, `/profile`.

**F. Group + open-capacity surfaces** — `/invite/[token]`, `/bookings/[id]/group`, the drop-in picker and its chips.

**G. Email shell** — `src/lib/email/**`. Depends on **A only** (it consumes `palette.generated.ts`); depends on nothing in C–F. Genuinely parallel from the moment A lands.

**H. Image crop/framing UI (backlog 999.2)** — depends on `patterns/responsive-dialog.tsx` (from B) and touches `photo-uploader.tsx` (host) and `profile-form.tsx` (profile). **Not** parallel with D and E — it collides with them. Sequence it into D/E or immediately after both.

### Must come last

**I. Cross-cutting audit.** Full second-theme sweep across every surface, full baseline generation, the 320px + keyboard + AA pass, and the leak tests turned from advisory into blocking. Definitionally an audit of everything before it. Its size is a function of how well A and B were done — which is the argument for doing them properly.

**Ordering summary:**

```
A (tokens/themes/runtime)
   └─▶ B (patterns + gates + shell states)
          ├─▶ C (booker core)   ─┐
          ├─▶ D (host)  ─┬─▶ H   │ parallel
          ├─▶ E (auth)  ─┘       │
          ├─▶ F (group/open)    ─┤
          └─▶ G (email)         ─┘
                                 └─▶ I (audit + full baselines)
```

**Contention risk to flag rather than pretend away:** C–F all import `patterns/`, so the first phase needing a new pattern adds it, and the others may conflict on that directory. Mitigation is to seed `patterns/` in B with the full inventory listed in §3 — even as thin, prop-complete stubs — so later phases *use* it rather than *grow* it.

---

## Visual-Regression Architecture

### Where baselines live and how they are organised

Default Playwright behaviour puts snapshots in `<spec>.spec.ts-snapshots/` next to the spec, with the browser+platform baked into the *filename*. That makes a theme/viewport matrix unreadable. Set an explicit template so the axes are directories:

```ts
// playwright.config.ts
snapshotPathTemplate: "e2e/visual/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
```

with `projectName` encoding theme × viewport (`coral-320`, `coral-768`, `coral-1280`, `slate-1280`). A reviewer can then see at a glance whether a diff is "the host pages at 320px" or "everything in the second theme."

Projects are **generated from `src/lib/theme/themes.ts`**, so adding a theme adds its projects automatically and cannot be forgotten:

```ts
const VIEWPORTS = { "320": 320, "768": 768, "1280": 1280 } as const;

projects: [
  { name: "chromium", use: { ...devices["Desktop Chrome"] } },   // the existing functional project
  ...THEME_IDS.flatMap((theme) =>
    Object.entries(VIEWPORTS)
      // full viewport sweep on the default theme; the proof theme only at 1280
      .filter(([w]) => theme === DEFAULT_THEME || w === "1280")
      .map(([w, width]) => ({
        name: `${theme}-${w}`,
        testDir: "e2e/visual",
        use: {
          ...devices["Desktop Chrome"],
          viewport: { width, height: 900 },
          // next-themes reads localStorage in its pre-paint script → no flash, fully deterministic
          storageState: undefined,
        },
        metadata: { theme },
      })),
  ),
],
```

with a fixture calling `page.addInitScript` to seed `localStorage["fitout-theme"]` from `testInfo.project.metadata.theme`.

### The baseline budget — and why the second theme is not a full sweep

27 routes × 2 themes × 3 viewports = 162 images, most of them redundant. Prescribe instead:

- **Default theme: every route × every viewport** (~27 × 3 = 81). Layout is a function of viewport, so the viewport axis has to be complete.
- **Second theme: 1280 only, on a curated set** — `/preview` (which by construction contains every token and every pattern state) plus one page per component family: `/`, `/listings/[id]`, `/listings/[id]/book`, `/host`, `/host/earnings`, `/login`. ~7 images.

The justification is that the second theme's job under D-128 is to prove **no hardcoded value leaked** — a property of *components*, not of *layouts*. `/preview` covers the component space more completely than 27 page screenshots would, at a fraction of the cost. ~88 images total, and every one of them is load-bearing.

### Determinism — the part that decides whether baselines are usable at all

This app renders live countdowns (`HoldCountdown`, `RequestCountdown`), relative "2h ago" notification labels, venue-local dates, Cloudinary photos and Leaflet raster tiles. Without pinning, the suite is a random-number generator.

- **Freeze the clock:** `page.clock.install({ time })` plus seeded fixtures. Non-negotiable — three surfaces render a ticking value.
- **Freeze motion:** `toHaveScreenshot({ stylePath: "e2e/visual/freeze.css" })` with `*,*::before,*::after{animation:none!important;transition:none!important;caret-color:transparent!important;scroll-behavior:auto!important}`. `tw-animate-css` and the `data-open:animate-in` variants from `shadcn/tailwind.css` make this mandatory.
- **Mask the non-deterministic:** `mask: [page.getByTestId("listing-photo"), page.getByTestId("map"), page.getByTestId("booking-reference")]`. Leaflet tiles come from the network and will never match twice.
- **Fonts are fine:** Geist is self-hosted through `next/font`, so there is no webfont race.
- **Platform caveat, and it matters for this repo specifically:** baselines are OS/browser/settings-specific. Development is on **win32**; CI will not be. Baselines generated on the dev box will fail on day one in CI. Add a script that generates inside the CI image:
  `docker run --rm -v "$PWD:/w" -w /w mcr.microsoft.com/playwright:v1.60.0-noble npx playwright test e2e/visual --update-snapshots`
  and make that the *only* sanctioned way to produce a baseline.

### Workflow when an intentional change invalidates 40 baselines

1. **Two commits, never one.** The cause (CSS/component change) and the effect (PNGs) land separately. `git show --stat` then answers the only question a reviewer has: *is there a cause?* A baseline-only commit with no accompanying source change is the smell that catches an accidental regression being blessed.
2. **Scope the regeneration; never blanket-update.** `npx playwright test e2e/visual/host.visual.spec.ts --update-snapshots=changed` — the flag takes `all | changed | missing | none`. `changed` rewrites only mismatching files, so untouched baselines keep their timestamps and stay out of the diff.
3. **Review the diff image, not the new baseline.** Keep the HTML reporter and read `*-diff.png` / `*-actual.png` before accepting. Accepting a PNG you have not diffed is accepting an unreviewed change.
4. **Serialise baseline updates.** Binary PNG merge conflicts are unresolvable — one branch updates baselines at a time. Treat a baseline update like a DB migration: rebase, regenerate, do not merge two.
5. **A token change is the one case where a mass update is expected** — and D-128 predicts it. Make it a rule with a mechanical check: a PR that touches `src/styles/tokens/**` **may** update every baseline; a PR that does not touch it **may not** update more than N. That is a five-line CI script and it converts "did you look at these?" from a reviewer's judgement into a gate.
6. `.gitattributes` already exists — add `*.png binary` so git stops trying to diff them, and keep the image count bounded (see the budget above) so the repo does not grow a hundred megabytes of coral rectangles.

---

## Anti-Patterns

### AP-1 — A parallel semantic vocabulary alongside shadcn's

**What people do:** introduce `--color-surface-raised` next to shadcn's `--card`, then either fork the 30 vendored components or live with two names for one value.
**Why it's wrong:** forking `ui/` forfeits `shadcn add`/upgrade forever; not forking leaves two vocabularies that drift silently. It also invalidates five approved UI-SPECs written in shadcn's vocabulary.
**Do this instead:** adopt shadcn's names *as* the semantic layer; add only the roles it genuinely lacks (`--surface-sunken`, `--text-*`, `--shadow-*`).

### AP-2 — Dropping `inline` from `@theme`

**What people do:** "clean up" `@theme inline` to `@theme` while reorganising, or write the new contract block without it.
**Why it's wrong:** the utility then reads a `:root`-scoped copy, and nested `[data-theme]` stops working — which silently kills the side-by-side preview that is D-128's proof mechanism. The failure is subtle: the app-wide switcher still appears to work.
**Do this instead:** keep `inline`, and put a comment in `contract.css` saying why.

### AP-3 — Wrapping a server subtree in a client component to make it sticky/animated/responsive

**What people do:** `"use client"` on the booking rail, the search results container, or a page section, to get scroll state or live selection.
**Why it's wrong:** it transitively client-ifies everything below, pulling `SERVICE_FEE_BPS` (a non-public env value) into the browser bundle where it silently reverts to a default — a D-75 price disagreement. The codebase already documents this trap twice (`availability-calendar.tsx:236-242`, `search-result-card.tsx:131-134`).
**Do this instead:** server shell → `ReactNode` slot props → client leaf. `position: sticky` needs no JS at all.

### AP-4 — Rendering a second copy of an interactive island for mobile

**What people do:** one `<BookCta>` in the desktop rail, another inside the mobile bottom bar, toggled by `hidden`/`lg:hidden`.
**Why it's wrong:** two mounts of a money-adjacent client component means two submit paths, two focus targets, and two places for the D-42 idempotency contract to be reasoned about.
**Do this instead:** one instance, repositioned by CSS (`fixed inset-x-0 bottom-0 lg:static`).

### AP-5 — Conditional rendering on viewport

**What people do:** `useMediaQuery()` → `{isMobile ? <MobileNav/> : <DesktopNav/>}`.
**Why it's wrong:** requires JS to know the viewport, so SSR emits the wrong branch and hydration flips it; doubles the component surface; doubles the baselines; and duplicates content for assistive tech and crawlers.
**Do this instead:** one tree, CSS ordering/visibility, container queries for component-level decisions.

### AP-6 — CSS custom properties in email

**What people do:** `<div style="background: var(--background)">` in the email shell, or a `<style>` block defining tokens.
**Why it's wrong:** ~45% client support; **Gmail supports `var()` but not the declaration**, so it resolves to nothing; **Outlook Windows supports neither**; and `oklch()` is worse than both. The result is an unstyled email in the two largest clients.
**Do this instead:** resolved literal sRGB hex, inline on each element, from the generated palette — with a drift test.

### AP-7 — Hand-maintaining the email palette

**What people do:** copy the hex values into `email.ts` once and add a comment "keep in sync with globals.css".
**Why it's wrong:** the comment is the entire enforcement mechanism, and it will lose. `BRAND_CORAL = "#E8484E"` at `listing-map.tsx:22` already carries exactly that comment and has already outlived at least one token revision.
**Do this instead:** generate, commit the artifact, and fail CI on drift.

### AP-8 — Writing `error.tsx` against `retry`

**What people do:** copy the current Next docs, which show `retry`.
**Why it's wrong:** `retry` is stable from 16.3.0; this repo is on **16.2.7**, where it is `unstable_retry`. The boundary will not work.
**Do this instead:** use `reset` today, with an explicit TODO for the 16.3 upgrade.

### AP-9 — Assuming `loading.tsx` covers the shell

**What people do:** add `loading.tsx` under `(app)` or `(host)` and expect instant navigation.
**Why it's wrong:** both group layouts `await` `getSession` plus three DB queries, and `loading.js` does not wrap the layout in its own segment — navigation blocks on all four.
**Do this instead:** keep the session gate blocking (it is the security boundary) and `<Suspense>`-wrap the ambient notification read.

### AP-10 — Merging the two headers

**What people do:** notice the duplication between `(app)/layout.tsx` and `(host)/host/layout.tsx` and unify them during a "polish" pass.
**Why it's wrong:** D-04 deliberately makes the host shell distinct; both files carry an explicit, identical "Do NOT refactor the two headers into one here" instruction.
**Do this instead:** leave two headers. Extracting a shared *presentational* nav-bar shell is permitted; merging the surfaces is not.

---

## Integration Points

### Internal boundaries

| Boundary | Communication | Notes |
|---|---|---|
| `styles/tokens/themes/*.css` → `styles/tokens/contract.css` | CSS custom properties, resolved at the element via `@theme inline` | Import order is load-bearing (default theme first) |
| `contract.css` → `ui/` + `patterns/` + domain components | Tailwind utility classes only | No component reads `--ramp-*`; enforced by grep test |
| `lib/theme/themes.ts` → provider, switcher, Playwright projects, palette generator | Plain TS import | One registry, four consumers — the anti-drift seam |
| RSC `page.tsx` → client shells | `ReactNode` slot props + pre-formatted strings + server-action references | Never raw cents, rates, bps, or unformatted instants (D-130) |
| Client islands → server | Server actions, or `router.push` of a validated URL | Map/pan/sort/paginate are *navigations*, not fetches |
| `styles/tokens/**` → `lib/theme/palette.generated.ts` | `scripts/gen-palette.ts`, verified by `tests/theme/palette-drift.test.ts` | The only sanctioned duplication of a token value |
| `palette.generated.ts` → email shell, `global-error.tsx`, Leaflet marker | Direct TS import of literal hex | The three sites where a CSS variable cannot reach |

### External services (unchanged by this milestone, but touched)

| Service | Integration pattern | v1.1 gotcha |
|---|---|---|
| Resend | `send()` in `src/lib/email/send.ts`, dispatched only from Inngest (D-83) | The shell changes the HTML, not the transport. Do not reinstate fire-and-forget sends. |
| Cloudinary | signed direct upload; images in listing galleries and avatars | Mask in visual baselines; the crop UI (H) is a *client-side framing preview* over the existing non-destructive transform URLs |
| Leaflet / OSM tiles | `dynamic(..., { ssr: false })` behind a `"use client"` wrapper | Tiles are network-non-deterministic — always masked in baselines |
| PayMongo | untouched | Checkout restructure must not alter the redirect or the webhook-as-sole-confirm-authority (D-130) |

---

## Scaling Considerations

Not user-scale — this is a front-end layer. The dimensions that actually grow are themes, surfaces and baselines.

| Growth | What breaks first | Adjustment |
|---|---|---|
| 2 → 5 themes | Baseline count (multiplicative) and the second-theme audit | Projects are already generated from `themes.ts`; keep non-default themes at one viewport on the curated set. `/preview` scales linearly and stays the primary proof. |
| 27 → 60 routes | `patterns/` becomes a junk drawer; every route needs 3 state files | Enforce the three-question rule at review; consider a route-group-scoped `loading.tsx`/`error.tsx` instead of per-segment where copy does not differ |
| Real branding replaces the placeholder | Nothing, if the milestone succeeded — one theme file plus a `gen:palette` run | This is the whole point of D-128. The measure of success is that the branding swap is a one-file diff plus a mass baseline update. |
| Dark mode returns (D-129 future) | It is just a theme file, but it doubles the visual-QA surface | `dusk.css` under the same mechanism; `enableSystem` stays false unless a product decision says otherwise |

**First bottleneck in practice:** baseline review fatigue. A mass baseline update that nobody actually looks at is worse than no baselines, because it converts a gate into a rubber stamp. That is why the budget (~88 images), the two-commit rule and the token-change CI check are architecture, not process trivia.

---

## Sources

**Verified against current official documentation (HIGH):**
- Tailwind CSS — [Theme variables](https://tailwindcss.com/docs/theme): `@theme` vs `@theme inline`, namespace table (`--color-*`, `--text-*`, `--radius-*`, `--shadow-*`, `--spacing-*`, `--container-*`), overriding under a selector.
- Tailwind CSS — [Dark mode](https://tailwindcss.com/docs/dark-mode): exact `@custom-variant` syntax for class and `[data-theme]` selector strategies.
- Tailwind CSS — [Responsive design](https://tailwindcss.com/docs/responsive-design): container queries built in — `@container`, `@sm:`/`@max-md:`, named containers, `@min-[475px]`, `--container-*`.
- Next.js — [loading.js](https://nextjs.org/docs/app/api-reference/file-conventions/loading) (docs v16.3.0): what `loading.js` wraps and does **not** wrap; the explicit caveat that a layout accessing `cookies()`/`headers()`/uncached data blocks navigation and is not covered by the fallback.
- Next.js — [error.js](https://nextjs.org/docs/app/api-reference/file-conventions/error) (docs v16.3.0): boundary scope, `"use client"` requirement, `reset` vs `retry`, **version history confirming `retry` stable at 16.3.0 / `unstable_retry` at 16.2.0**, and the statement that `global-error` does **not** receive global styles so an app-level `data-theme` cannot reach it.
- shadcn/ui — [Theming](https://ui.shadcn.com/docs/theming): the full token set, the background/foreground convention, `@theme inline` wiring, and the sanctioned way to add custom tokens.
- next-themes — [README](https://github.com/pacocoursey/next-themes): `themes` prop for arbitrary named themes ("when you pass `themes`, the default light/dark set is overridden"), `attribute="data-theme"`, `storageKey`, `forcedTheme`, `enableSystem`, the mounted-guard for hydration, and the pre-paint injection that prevents flash.
- Can I Email — [CSS variables (custom properties)](https://www.caniemail.com/features/css-variables/): **45.24% overall support**; Gmail supports `var()` but not the declaration; Outlook Windows 2003–2019 unsupported; Apple Mail / ProtonMail supported.
- Playwright — [Visual comparisons](https://playwright.dev/docs/test-snapshots): `toHaveScreenshot`, default `<spec>-snapshots/` layout, `snapshotPathTemplate` tokens, `--update-snapshots` modes, `stylePath`/`mask`, and the platform-specificity warning.

**Verified by direct inspection of the shipped codebase (HIGH):**
- `src/app/globals.css` (145 lines; the self-referential `--font-sans: var(--font-sans)` at line 10; `@theme inline` block; `:root` + dormant `.dark`).
- `src/app/layout.tsx` (scaffold metadata; `--font-geist-sans` / `--font-geist-mono`; no `suppressHydrationWarning`; no provider).
- `src/app/(app)/layout.tsx`, `src/app/(host)/host/layout.tsx` (blocking session gate + 3–4 DB reads in the layout; the twice-written "do not merge the headers" instruction; `bg-zinc-50` leaks).
- `src/components/booking/reserve-view.tsx` (the slot-prop pattern, already documented in-repo).
- `src/components/search/search-results.tsx` (client shell; three hand-rolled dashed empty/error states; the `isPending` skeleton).
- `src/components/search/search-result-card.tsx:131-134` (the "rendered from a `use client` shell, so composing the fee here would put `SERVICE_FEE_BPS` in the browser bundle" comment — the D-130 hazard, already hit once).
- `src/components/listing/listing-map-panel.tsx` (the `ssr:false`-behind-a-client-wrapper pattern) and `listing-map.tsx:22` (`BRAND_CORAL = "#E8484E"`).
- `src/lib/email.ts` (18 sends, private `send()`/`escapeHtml()`, D-66/D-83 contract headers, the exported `renderOpsAlertDigest` with its PII assertion).
- Import-specifier census: every consumer imports `@/lib/email` (5 source files + 4 test files).
- `dark:` census: **66 occurrences across 19 files**, 26 of them in 16 vendored `ui/` components.
- Hardcoded-colour census: 11 raw palette utilities, 9 black/white utilities, 4 hex literals — a small, tractable leak surface.
- Installed versions: `next 16.2.7`, `react 19.2.7`, `tailwindcss 4.3.0`, `next-themes 0.4.6` (installed, unmounted), `@playwright/test 1.60.0`, `shadcn 4.10.0`.
- `node_modules/shadcn/dist/tailwind.css` — contributes keyframes, `data-*` custom variants and one utility; **defines no colour tokens**, so it does not conflict with the contract.
- `.planning/milestones/v1.0-ui-specs/04-UI-SPEC.md` and `09-UI-SPEC.md` (the locked design-system vocabulary, the 60/30/10 contract, the 4-size/2-weight type contract, the "no new tokens" discipline).

**MEDIUM confidence (judgement, not documentation):**
- The ~88-image baseline budget and the default-theme-full-sweep / second-theme-curated split. Reasoned from the D-128 proof requirement, not from a documented standard; revisit after the first full baseline run.
- The `patterns/` initial inventory. Each entry is justified by observed duplication, but the exact cut between `patterns/` and domain folders will move on contact with phase C.
- The claim that dropping `inline` breaks nested `[data-theme]`. Mechanically sound and consistent with Tailwind's stated reason for the flag, but not spelled out in the docs as a nesting caveat — **prove it with the second theme in phase A** (which is D-128's job anyway).

---
*Architecture research for: v1.1 Front-End Polish & Placeholder Design System*
*Researched: 2026-08-11*
