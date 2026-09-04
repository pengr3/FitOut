# Stack Research — v1.1 Front-End Polish & Placeholder Design System

**Domain:** Design-system / token architecture + visual-QA layer over an already-shipped Next 16 + React 19 + Tailwind v4 marketplace app
**Researched:** 2026-08-11
**Confidence:** HIGH (theme mechanism — verified by compiling the real `globals.css`; contrast findings — computed; cropper React-19 compat — verified from package source; Playwright determinism — verified from installed `playwright@1.60.0` source). MEDIUM (email-client support data — caniemail, one page last updated 2023-03; VR-tool pricing).

> **Scope note.** This file **replaces** the v1.0 stack research at this path. It is **additive only** — it does not restate, revisit, or replace the v1.0 core stack (Next/Postgres/Drizzle/Better Auth/PayMongo/Inngest/Resend/Cloudinary), which is unchanged and remains authoritative in `CLAUDE.md § Technology Stack`. The v1.0 research document is recoverable at `git show a4e836e:.planning/research/STACK.md`.
>
> **If `CLAUDE.md § Technology Stack` is regenerated from this file, the v1.0 backend guidance will be lost.** Merge, do not overwrite.

---

## TL;DR — What v1.1 Actually Needs

**Four new packages. That's it.**

```
react-easy-crop@6.2.3        avatar cropper UI (class component → React 19 safe, verified)
@axe-core/playwright@4.12.1  WCAG AA gate in the e2e layer
culori@4.0.2                 (dev) oklch → WCAG contrast, token-pair gate at test time
eslint-plugin-jsx-a11y@6.10.2 (dev) promote from transitive to explicit; enable 34 rules, not 6
```

Everything else v1.1 needs is **already installed and either mis-wired or unmounted**:

- **Multi-theme** needs *zero* new packages. Tailwind v4's `@theme inline` already emits `var()` references into every utility — verified by compiling the real `src/app/globals.css` — so a `[data-theme]` attribute on *any element* re-skins its whole subtree. `next-themes@0.4.6` (installed, never mounted) drives an arbitrary theme list out of the box; its **default `attribute` is literally `"data-theme"`**.
- **Visual regression** needs *zero* new packages. `@playwright/test@1.60.0` ships `toHaveScreenshot`. What it needs is **config discipline**, not a tool.
- **Cover-frame preview** needs *zero* cropper. It is a focal-point picker, and `next-cloudinary@6.17.5` (installed) already exposes `crop`/`gravity`/`x`/`y`.
- **Email shell** needs *zero* packages by D-66 — and the research confirms D-66 is right for a second reason: **CSS custom properties are 45% supported in email and Gmail cannot declare them at all**, so token values must be *resolved to hex literals*, which a hand-written TS module does better than any email framework.

**The single highest-value finding in this document is not a package.** It is that four shipped token pairs fail the WCAG AA bar that D-131 makes a hard gate — including the coral CTA at **3.60:1** and the focus ring at **2.59:1**. See § Verified Defects.

---

## Recommended Stack

### Core Technologies

These are the load-bearing *mechanisms*, not all of them are packages.

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| **Tailwind CSS `@theme inline`** | 4.3.0 (installed) | The token bridge — the entire multi-theme mechanism | **Verified empirically** (see § 1): `@theme inline` emits the raw `var()` into each utility rule (`.bg-primary { background-color: var(--primary) }`), so the variable resolves *at the element*, not at `:root`. That is precisely what makes a subtree-scoped `[data-theme]` re-skin work — and therefore what makes side-by-side theme preview (D-128's proof) possible at all. Non-inline `@theme` **cannot** do this. |
| **Plain `:root` / `[data-theme="…"]` custom properties** | CSS | The swappable theme layer | Tailwind explicitly forbids nesting `@theme` under a selector ("theme variables are required to be defined top-level"). The documented pattern is: raw CSS custom properties in scoped selectors + `@theme inline` mapping them into utility namespaces. This is already the shape of the shipped `globals.css` — v1.1 generalizes `:root`/`.dark` into `:root, [data-theme="alpine"]` / `[data-theme="…"]`. |
| **next-themes** | **0.4.6 (already installed, never mounted)** | Persist + apply the selected theme name with no flash | Default `attribute` is `"data-theme"`; `themes` accepts an arbitrary string array; the provider renders a **blocking inline `<script>` as its first child** that reads `localStorage` and sets the attribute on `document.documentElement` *before* the rest of the subtree paints. No FOUC in the App Router provided the provider is the outermost element inside `<body>`. Verified against `node_modules/next-themes/dist/index.mjs`. |
| **@playwright/test** | **pin to `1.60.0` exactly (drop the caret)** | Visual-regression baselines (D-131) | Already a dev dependency. Baselines are byte-comparisons against a *specific browser build*; a caret range lets `npm i` pull 1.62.x, ship new Chromium binaries, and invalidate every baseline in one unrelated install. Pin exact, bump deliberately, regenerate baselines in the same commit. |
| **`mcr.microsoft.com/playwright:v1.60.0-noble`** | matches the pinned version | The **only** environment allowed to write baselines | See § 3 — this is not optional on this project. |

### Supporting Libraries

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **react-easy-crop** | **6.2.3** | Avatar crop UI (pan/zoom, `cropShape="round"`, fixed 1:1) | The avatar cropper only. Emits `croppedAreaPixels`; **does not produce an image** — you draw to a canvas yourself. React 19 safe: `Cropper` is a **class** component (`extends React.Component`) with `static defaultProps` — React 19 removed `defaultProps` for *function* components only, so this is unaffected. Verified by unpacking the published tarball. Peer: `react >=16.4.0`. One dep (`normalize-wheel`). Needs `import "react-easy-crop/react-easy-crop.css"` (subpath export exists) and `"use client"`. |
| **@axe-core/playwright** | **4.12.1** (bundles `axe-core@4.13.0`) | Automated WCAG 2.2 AA gate in e2e | Every polished surface, as a shared fixture. `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])` → **70 rules** in axe-core 4.13.0 (enumerated). Peer is `playwright-core >= 1.0.0` — no conflict with 1.60. Its `color-contrast` rule runs on *rendered* pixels, so it independently catches the § Verified Defects failures. |
| **culori** | **4.0.2** | oklch → WCAG contrast ratio, at test time | Dev-only. `wcagContrast('oklch(0.637 0.208 25)','oklch(0.985 0 0)')` → `3.60`. Lets a **Vitest** test assert every `(surface, foreground)` token pair in every theme without booting a browser — the cheap half of the AA gate, run on every commit, while axe covers the rendered half. Also `formatHex()` for the email palette (see § 6). Tree-shakeable, zero deps. |
| **eslint-plugin-jsx-a11y** | **6.10.2** — *already on disk*, hoisted transitively from `eslint-config-next@16.2.7` | Static a11y lint | Promote to an explicit `devDependency` (same version, no new code) so importing it in `eslint.config.mjs` is legitimate rather than relying on hoisting. Verified: `eslint-config-next` enables only **6** of its rules (`alt-text`, `aria-props`, `aria-proptypes`, `aria-unsupported-elements`, `role-has-required-aria-props`, `role-supports-aria-props`). The plugin exports `flatConfigs.recommended` (**34 rules**) and `flatConfigs.strict` (33). Adopt `flatConfigs.recommended` — a 28-rule uplift for one config line. Peer allows `eslint ^9`. |

### Already Installed — Repurpose, Do Not Re-add

| Package | Installed | v1.1 role |
|---------|-----------|-----------|
| `next-themes` | 0.4.6 | Mount it. Currently imported by exactly one file (`src/components/ui/sonner.tsx`) with **no provider anywhere** — see § Verified Defects #5. |
| `next-cloudinary` / `cloudinary` | 6.17.5 / 2.10.0 | `CldImage` `crop`/`gravity`/`x`/`y` (confirmed present in `@cloudinary-util/url-loader` `ImageOptions`) *is* the non-destructive cover-frame renderer. No cropper needed for covers. |
| `tw-animate-css` | 1.4.0 | Already the animation source for shadcn. Keep; `toHaveScreenshot` disables animations by default. |
| `@playwright/test` | 1.60.0 | Visual regression. Pin exact. |
| `vitest` | 4.1.8 | Host for the token-contrast gate. |
| `sonner`, `cmdk`, `react-day-picker`, `lucide-react`, `radix-ui`, `cva`, `tailwind-merge`, `clsx` | — | Unchanged. |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| **Playwright Docker image** | The *only* baseline-writing environment | `docker pull mcr.microsoft.com/playwright:v1.60.0-noble`. Tag must equal the pinned `@playwright/test` version. Playwright docs: "It is recommended to always pin your Docker image to a specific version." |
| **`next build && next start`** for the VR project | Screenshot a production build, never `next dev` | Dev serves the on-screen dev indicator, HMR sockets, and unminified CSS ordering. Next 16 also supports `devIndicators: false` in `next.config.ts` as a belt-and-braces measure (`appIsrStatus`/`buildActivity` were removed in v16.0.0). |
| **`page.clock.setFixedTime()`** | Freeze time for VR | FitOut renders a **live 15-minute hold countdown** (Phase 4) and relative date labels. These are guaranteed baseline churn. Freeze the clock rather than masking, so the *rendered text* stays in the baseline. |
| **`stylePath` screenshot stylesheet** | Neutralize remaining volatility | One `e2e/vr/screenshot.css` hiding Leaflet tile layers and any third-party iframe. Applied per-assertion or per-project. |
| **Docker Compose (existing)** | Seeded Postgres for VR fixtures | VR must run against **deterministic seed data** — see § 3 "The seed problem". |

---

## Installation

```bash
# Runtime (1 package)
npm install react-easy-crop@6.2.3

# Dev (3 packages; jsx-a11y is a promotion, not a new install)
npm install -D @axe-core/playwright@4.12.1 culori@4.0.2 eslint-plugin-jsx-a11y@6.10.2

# Pin Playwright exactly (edit package.json: "@playwright/test": "1.60.0" — no caret)
npm install -D @playwright/test@1.60.0 --save-exact

# Baseline environment
docker pull mcr.microsoft.com/playwright:v1.60.0-noble
```

No `--legacy-peer-deps` is required for any of these against React 19.2 / Next 16.2 / ESLint 9.

---

## § 1 — Tailwind v4 Multi-Theme Architecture (the mechanism)

### 1.1 The finding that makes it work — verified, not assumed

Compiling a fixture with `@tailwindcss/cli@4.3.0`:

**Input**
```css
@theme inline {
  --color-primary: var(--primary);
  --text-display: var(--type-display);
  --text-display--line-height: var(--type-display-lh);
  --text-display--font-weight: var(--type-display-fw);
  --radius-lg: var(--radius);
  --font-sans: var(--font-geist-sans);
}
:root, [data-theme="alpine"] { --primary: oklch(0.205 0 0); --radius: 0.625rem; --type-display: 1.75rem; --type-display-lh: 1.2; --type-display-fw: 600; }
[data-theme="dusk"]          { --primary: oklch(0.30 0.05 260); --radius: 0;       --type-display: 2rem;    --type-display-lh: 1.1; --type-display-fw: 700; }
```

**Compiled output (verbatim)**
```css
.rounded-lg   { border-radius: var(--radius); }
.bg-primary   { background-color: var(--primary); }
.font-sans    { font-family: var(--font-geist-sans); }
.text-display { font-size: var(--type-display);
                line-height: var(--tw-leading, var(--type-display-lh));
                font-weight: var(--tw-font-weight, var(--type-display-fw)); }
```

Three consequences, all load-bearing:

1. **The utility carries a `var()`, so it resolves at the element.** Any ancestor carrying `data-theme="dusk"` re-skins everything beneath it. **This works on any element, not just `<html>`** — which is exactly and only what makes D-128's side-by-side preview possible.
2. **`--text-*` modifiers participate.** Line-height and font-weight are also emitted as `var()`, so the *type scale itself* is theme-swappable, not just color. And the `var(--tw-leading, …)` wrapper means per-element `leading-*` utilities still override — no expressiveness is lost.
3. **`--radius-*` participates**, so "sharp-cornered brutalist theme" vs "soft Airbnb theme" is a token edit.

### 1.2 The counterexample — why non-inline `@theme` is fatal here

Same fixture with `@theme` (no `inline`):

```css
/* compiled */
@layer theme { :root, :host { --color-primary: var(--primary); } }
.bg-primary { background-color: var(--color-primary); }
```

`--color-primary` is *declared on `:root`*, so `var(--primary)` is resolved **on `<html>`**, and the computed result inherits downward as a fixed value. A `[data-theme="dusk"]` on a nested `<div>` changes `--primary` for that subtree, but `--color-primary` was already computed upstream. **The subtree does not re-skin.**

> Subtlety worth writing down so nobody "simplifies" this later: non-inline *appears* to work when the theme attribute sits on `<html>`, because `:root` and `[data-theme=…]` then target the same element and the cascade resolves them together. It breaks the moment you scope a theme to a subtree. Since side-by-side preview is the milestone's proof mechanism, **`@theme inline` is mandatory, not stylistic.**

### 1.3 Which layer each token belongs in

| Layer | Directive | Contents | Rule |
|-------|-----------|----------|------|
| **L1 — Theme scope** | plain CSS, `:root, [data-theme="x"] { … }` | Every value a brand direction may change: color, radius source, type-scale sources, elevation sources, font-family source | Never `@theme`. Tailwind forbids nesting `@theme` under a selector. |
| **L2 — Bridge** | `@theme inline { … }` | `--color-*`, `--font-*`, `--text-*` (+ modifiers), `--radius-*`, `--shadow-*` → `var(--…)` pointing at L1 | This is the *only* place a Tailwind namespace name appears. Utilities are generated from here. |
| **L3 — Invariants** | `@theme { … }` (non-inline) | Things no theme changes: `--spacing` base, `--breakpoint-*`, `--container-*`, `--ease-*`, `--animate-*` | Literal values. Non-inline is correct here precisely because they must never be subtree-overridable. |

### 1.4 Selector: data-attribute, not class — and why

Use `[data-theme="…"]`. Three reasons:

1. `next-themes@0.4.6`'s **default `attribute` is already `"data-theme"`** (verified in `dist/index.mjs`: `attribute: h = "data-theme"`), so no mapping config is needed.
2. Class-based selection forces next-themes into remove-all-then-add bookkeeping over the theme list; attributes are a single `setAttribute`.
3. `[data-theme]` composes cleanly with a *bare* `[data-theme]` selector for base rules that must re-apply per subtree (see 1.6).

Delete `@custom-variant dark (&:is(.dark *));` from `globals.css`. Under D-129 there is no `dark:` variant; leaving the variant defined invites the 66 removed classes to grow back.

### 1.5 Composing with shadcn's token names — keep them

**Do not rename the raw tokens.** Keep `--background`, `--primary`, `--brand`, `--radius`, `--popover`, `--border`, … exactly as shipped. Reasons:

- shadcn-generated components reference raw tokens **directly in inline styles**, not only through utilities. Live example in this repo, `src/components/ui/sonner.tsx`:
  ```tsx
  style={{ "--normal-bg": "var(--popover)", "--border-radius": "var(--radius)" } as React.CSSProperties}
  ```
  Renaming `--popover` silently breaks that and anything `npx shadcn add` emits next.
- The v1.0 codebase already follows the shadcn convention documented at `ui.shadcn.com/docs/theming` (surface + `-foreground` pair). Changing it costs a sweep and buys nothing.

Add **new** namespaced tokens only where shadcn has no convention: type scale (`--type-*`), elevation (`--elev-*`), font source (`--app-font-*`).

### 1.6 The concrete CSS to write

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "shadcn/tailwind.css";
/* NOTE: @custom-variant dark(...) is DELETED — D-129, light-only. */

/* ---------- L3: invariants (non-inline on purpose) ---------- */
@theme {
  /* nothing here yet; add --spacing / --breakpoint-* / --ease-* only when a real need appears.
     Tailwind's defaults already match the 02-UI-SPEC 8-point scale (p-1=4px … p-16=64px). */
}

/* ---------- L2: the bridge — every Tailwind namespace name lives here ---------- */
@theme inline {
  /* color — unchanged names, now sourced from the theme scope */
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-brand: var(--brand);
  --color-brand-foreground: var(--brand-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  /* … the rest of the shipped list, unchanged … */

  /* typography — FIXED (see § 2): points at the real next/font variable, not itself */
  --font-sans: var(--app-font-sans);
  --font-mono: var(--app-font-mono);
  --font-heading: var(--app-font-heading);

  /* semantic type ramp — swappable per theme */
  --text-display: var(--type-display);
  --text-display--line-height: var(--type-display-lh);
  --text-display--letter-spacing: var(--type-display-ls);
  --text-display--font-weight: var(--type-display-fw);
  --text-title: var(--type-title);
  --text-title--line-height: var(--type-title-lh);
  --text-title--font-weight: var(--type-title-fw);
  --text-heading: var(--type-heading);
  --text-heading--line-height: var(--type-heading-lh);
  --text-heading--font-weight: var(--type-heading-fw);
  --text-body: var(--type-body);
  --text-body--line-height: var(--type-body-lh);
  --text-label: var(--type-label);
  --text-label--line-height: var(--type-label-lh);
  --text-label--font-weight: var(--type-label-fw);
  --text-caption: var(--type-caption);
  --text-caption--line-height: var(--type-caption-lh);

  /* radius + elevation */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --shadow-card: var(--elev-card);
  --shadow-raised: var(--elev-raised);
  --shadow-overlay: var(--elev-overlay);
}

/* ---------- L1: theme scope. DEFAULT MUST ALSO BE ON :root (see 1.7) ---------- */
:root,
[data-theme="alpine"] {
  color-scheme: light;

  --app-font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --app-font-mono: var(--font-geist-mono), ui-monospace, monospace;
  --app-font-heading: var(--app-font-sans);

  --type-display: 1.75rem; --type-display-lh: 1.2;  --type-display-ls: -0.01em; --type-display-fw: 600;
  --type-title:   1.25rem; --type-title-lh:   1.25; --type-title-fw:   600;
  --type-heading: 1.125rem;--type-heading-lh: 1.35; --type-heading-fw: 600;
  --type-body:    1rem;    --type-body-lh:    1.5;
  --type-label:   0.875rem;--type-label-lh:   1.4;  --type-label-fw:   600;
  --type-caption: 0.8125rem;--type-caption-lh:1.4;

  --background: oklch(1 0 0);
  --foreground: oklch(0.145 0 0);
  --primary: oklch(0.205 0 0);
  --primary-foreground: oklch(0.985 0 0);
  --brand: oklch(0.58 0.208 25);          /* CORRECTED — see § Verified Defects #2 */
  --brand-foreground: oklch(0.985 0 0);
  --success: oklch(0.53 0.17 150);        /* CORRECTED */
  --success-foreground: oklch(0.985 0 0);
  --muted: oklch(0.97 0 0);
  --muted-foreground: oklch(0.541 0 0);   /* CORRECTED */
  --ring: oklch(0.58 0.208 25);           /* CORRECTED — brand-coloured focus ring, 4.76:1 */
  --border: oklch(0.922 0 0);
  --radius: 0.625rem;

  --elev-card:    0 1px 2px 0 oklch(0 0 0 / 0.04), 0 1px 3px 0 oklch(0 0 0 / 0.06);
  --elev-raised:  0 4px 6px -1px oklch(0 0 0 / 0.07), 0 2px 4px -2px oklch(0 0 0 / 0.05);
  --elev-overlay: 0 10px 24px -6px oklch(0 0 0 / 0.14);
}

/* A second, genuinely different placeholder direction — this file IS the D-128 proof. */
[data-theme="court"] {
  color-scheme: light;
  --app-font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --type-display: 2rem; --type-display-lh: 1.1; --type-display-ls: -0.02em; --type-display-fw: 700;
  /* … full override of every L1 token … */
  --brand: oklch(0.52 0.16 245);
  --radius: 0.125rem;
}

/* The dormant dark palette becomes a THEME, not a mode (D-129). Not offered in the picker yet. */
[data-theme="dark"] { color-scheme: dark; /* the existing .dark values, renamed */ }

@layer base {
  * { @apply border-border outline-ring/50; }
  body { @apply bg-background text-foreground; }
  html { @apply font-sans; }

  /* Re-establish inherited properties at every theme boundary so a PREVIEW SUBTREE
     picks up its own font, not the page's. Inherited props (font-family, color-scheme)
     were computed at :root and would otherwise inherit past the boundary. */
  [data-theme] { @apply font-sans; }
}
```

### 1.7 Two non-obvious rules

**(a) The default theme must be declared on `:root` as well as on its own attribute selector.**
`next-themes` sets the attribute from a client script; the **server-rendered HTML carries no `data-theme`**. If the default theme's tokens live only under `[data-theme="alpine"]`, the SSR'd markup has no token values at all for the instant before the script runs. `:root, [data-theme="alpine"] { … }` costs one selector and removes the whole class of problem. It also means preview panels for the default theme render identically whether or not they carry the attribute.

**(b) Inherited properties must be re-declared at the theme boundary.**
`font-family` and `color-scheme` inherit. Tailwind emits `--default-font-family: var(--font-sans)` on `:root`, computed there. A `[data-theme="court"]` `<div>` overriding `--app-font-sans` changes utilities *inside* it (because those are `var()`-based) but does **not** change the inherited `font-family` on the div itself. `@layer base { [data-theme] { @apply font-sans } }` fixes it in one line.

### 1.8 next-themes wiring — exact

```tsx
// src/components/theme-provider.tsx
"use client";
import { ThemeProvider as NextThemeProvider } from "next-themes";

export const THEMES = ["alpine", "court", "dusk"] as const;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <NextThemeProvider
      attribute="data-theme"        // 0.4.6 default, stated explicitly for the reader
      themes={[...THEMES]}
      defaultTheme="alpine"
      enableSystem={false}          // D-129: no OS-driven switching
      enableColorScheme={false}     // see note below — MUST be false for custom theme names
      disableTransitionOnChange     // suppresses a full-page transition flash on swap
      storageKey="fitout-theme"
    >
      {children}
    </NextThemeProvider>
  );
}
```

```tsx
// src/app/layout.tsx
<html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
  <body className="min-h-full flex flex-col">
    <ThemeProvider>{children}</ThemeProvider>
  </body>
</html>
```

**Why `enableColorScheme={false}`** — from the 0.4.6 source:
```js
let g = ["light","dark"].includes(defaultTheme) ? defaultTheme : null,
    D = ["light","dark"].includes(resolved) ? resolved : g;
document.documentElement.style.colorScheme = D;   // → null for "alpine"
```
With custom theme names it writes `null`, **removing** `color-scheme` and handing form controls, scrollbars and `<input type=date>` back to the OS preference. On a dark-mode OS that produces dark native widgets inside a light app. Set it to `false` and declare `color-scheme: light` in each theme's L1 block instead (done above). This is also a visual-regression stability requirement.

**Why no flash-of-wrong-theme** — from the same source, the provider returns:
```js
React.createElement(Ctx.Provider, { value }, React.createElement(ThemeScript, {...}), children)
```
The `<script>` is a **synchronous, non-deferred inline script rendered before `children`**. HTML parsing blocks on it, it sets the attribute on `document.documentElement`, and only then does the rest of `<body>` parse. This holds **only if the provider is the outermost thing inside `<body>`** — mount it in a nested layout and everything above it paints unthemed.

> **Doc-drift warning.** Context7's next-themes entry (sourced from the repo's `main` branch `_autodocs`) documents a standalone **`ThemeScript`** component with an `attribute={['class','data-mode']}` array API. **`next-themes@0.4.6` does not export `ThemeScript`** — verified against `dist/index.d.ts`, which exports only `ThemeProvider`, `useTheme`, and three types. 0.4.6 is also the current `latest` on npm. Do not plan around `ThemeScript`.

### 1.9 Side-by-side preview — the mechanism is NOT next-themes

next-themes manages exactly one global attribute on `<html>`. For D-128's "several candidate directions compared on real screens", the preview page renders its own scoped subtrees:

```tsx
{THEMES.map((t) => (
  <div key={t} data-theme={t} className="bg-background text-foreground rounded-lg border p-6">
    <ThemeSpecimen />          {/* buttons, badges, cards, inputs, calendar, price, empty state */}
  </div>
))}
```

This works *because* of § 1.1 and nothing else. It also means the preview route doubles as the **VR kitchen-sink page** (§ 3.6) and as the leak detector: any component that hardcoded a colour will render identically in all three panels, which is visible at a glance and catchable by a screenshot diff.

---

## § 2 — Typography

### 2.1 The `--font-sans` defect, stated exactly

`src/app/globals.css:10` declares `--font-sans: var(--font-sans);` inside `@theme inline`. Compiling the **real file** with `@tailwindcss/cli@4.3.0` produces:

```css
@layer theme { :root, :host {
  --font-sans: var(--font-sans);                    /* line 6  — self-referential */
  --default-font-family: var(--font-sans);          /* line 58 — poisoned by the cycle */
  --font-heading: var(--font-sans);                 /* line 60 — poisoned by the cycle */
} }
html { font-family: var(--default-font-family, ui-sans-serif, system-ui, sans-serif, …); }  /* line 83 */
.font-sans    { font-family: var(--font-sans); }    /* line 1443 */
```

Per CSS Custom Properties §3, a custom property in a dependency cycle computes to the **guaranteed-invalid value**. So:

- `--font-sans` → guaranteed-invalid.
- `--default-font-family: var(--font-sans)` (no fallback) → also guaranteed-invalid.
- `html { font-family: var(--default-font-family, ui-sans-serif, system-ui, …) }` — the property *is* guaranteed-invalid, so the `var()` **fallback list is substituted**. The page therefore renders in **`ui-sans-serif` / system UI**, not in a browser serif default.
- `.font-sans` and `.font-heading` have **no fallback** → invalid at computed-value time → inherit → same system font.

**Net observable effect: Geist is downloaded on every page load and never applied. Every surface in the shipped app renders in the OS system font.** The blast radius includes `--font-heading`, which is consumed by `src/components/ui/card.tsx:41` and `src/components/ui/dialog.tsx:133` — i.e. every card title and dialog title in the product.

### 2.2 Correct wiring

```css
/* L2 */
@theme inline {
  --font-sans:    var(--app-font-sans);
  --font-mono:    var(--app-font-mono);
  --font-heading: var(--app-font-heading);
}
/* L1 */
:root, [data-theme="alpine"] {
  --app-font-sans:    var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif;
  --app-font-mono:    var(--font-geist-mono), ui-monospace, monospace;
  --app-font-heading: var(--app-font-sans);
}
```

Three properties of this shape:
1. **No cycle** — `--font-sans` points at a differently-named source.
2. **A font change is a one-line token edit.** Swap `Geist` → `Inter` in `layout.tsx` (`variable: "--font-inter"`) and change `--app-font-sans` to `var(--font-inter), …`. Zero component edits.
3. **A theme can change the family**, because `--app-font-*` sits in L1 and `@theme inline` inlines the reference (`.font-sans { font-family: var(--app-font-sans) }` — verified in § 1.1's compiled output).
4. **Always terminate with a literal fallback stack inside the var.** `var(--font-geist-sans), ui-sans-serif, …` means a missing next/font className degrades to system UI instead of nuking `font-family`. This is the guard the current code lacks.

`next/font/google` remains correct and needs no change: it self-hosts (no runtime network request → **deterministic for VR**), emits a CSS custom property via `variable:`, and applies it through the `<html>` className. Keep `Geist`/`Geist_Mono` for the placeholder (D-127: cheapest to swap).

### 2.3 The type scale as tokens

Use **semantic names**, not t-shirt sizes: `text-display`, `text-title`, `text-heading`, `text-body`, `text-label`, `text-caption`. Components then name intent, and a theme is free to change what "display" *means* without a component sweep. Sizes above extend the 02-UI-SPEC 4-role contract (Display 28 / Heading 20 / Body 16 / Label 14) to the six roles a full app needs, preserving its two-weight rule (400 / 600).

Two mechanics worth knowing:

- The **double-dash modifier syntax** (`--text-display--line-height`, `--text-display--letter-spacing`, `--text-display--font-weight`) is a documented Tailwind v4 feature and, verified above, survives `@theme inline` — the modifiers are emitted as `var()` too.
- The compiled utility is `line-height: var(--tw-leading, var(--type-display-lh))`, so a per-element `leading-7` or `text-display/7` still wins. Nothing is lost by baking defaults into the scale.

Do **not** delete Tailwind's default `--text-xs … --text-5xl`. The semantic ramp is additive; the numeric scale stays available as an escape hatch and for anything not yet classified. Reaching for `--text-*: initial` to force the semantic ramp is a lint problem, not a token problem.

---

## § 3 — Visual Regression Testing

### 3.1 Recommendation

**Playwright's native `toHaveScreenshot`, baselines committed to git, generated exclusively inside `mcr.microsoft.com/playwright:v1.60.0-noble`.** No new package. Named upgrade path: **Argos** (`@argos-ci/playwright@7.4.3`) if PR-time diff *review* becomes the bottleneck.

### 3.2 Cross-platform determinism on Windows — the direct answer

**Yes. Baselines must be generated in Docker (Linux) to be stable. Windows-native baselines are unusable by CI, on two independent grounds.**

**Ground 1 — they are named differently, and the mismatch fails *open*.** Verified from the installed `playwright@1.60.0`:

- `node_modules/playwright/lib/index.js:347` — an auto-fixture sets `testInfo.snapshotSuffix = process.platform`.
- `node_modules/playwright/lib/worker/workerProcessEntry.js:2658` — the default template is
  `{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}`.

So this box writes `home-chromium-win32.png` and Linux CI looks for `home-chromium-linux.png`. And the default `updateSnapshots` is **`'missing'`** — quoting the installed type definitions verbatim: *"`'missing'` — Missing snapshots are created, for example when authoring a new test and running it for the first time. This is the default."* **A CI run that finds no baseline silently writes one and passes.** The gate would be decorative.

**Ground 2 — they are rendered differently.** Windows composes text through DirectWrite with ClearType subpixel antialiasing; the Linux container uses FreeType/fontconfig with grayscale AA. Every glyph edge differs. No `threshold` setting reconciles them without making the gate blind to real regressions. Playwright's own wording: *"Browser rendering can vary based on the host OS, version, settings, hardware, power source (battery vs. power adapter), headless mode, and other factors. For consistent screenshots, run tests in the same environment where the baseline screenshots were generated."*

### 3.3 The config

```ts
// playwright.config.ts — VR additions
export default defineConfig({
  testDir: "e2e",
  updateSnapshots: process.env.CI ? "none" : "missing",   // closes the fail-open hole
  expect: {
    toHaveScreenshot: {
      // ONE baseline set. Legitimate only because baselines are ONLY ever written in the container.
      pathTemplate: "{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}",
      maxDiffPixelRatio: 0.002,   // ~2 px in 1000 — absorbs AA noise, catches a shifted element
      threshold: 0.15,            // stricter than the 0.2 default
      animations: "disabled",     // already the default; stated so nobody "optimises" it away
      caret: "hide",              // already the default
      scale: "css",               // already the default; keeps 320px baselines small
    },
  },
  projects: [
    /* existing functional projects unchanged */
    { name: "vr-320",  testMatch: /vr\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 320,  height: 720  } } },
    { name: "vr-768",  testMatch: /vr\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 768,  height: 1024 } } },
    { name: "vr-1280", testMatch: /vr\/.*\.spec\.ts/, use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900  } } },
  ],
});
```

`{projectName}` in the path template is what separates viewports — one directory per viewport, no name collisions, and a viewport can be regenerated in isolation.

**Baseline regeneration command (the only sanctioned way to write a baseline):**
```bash
docker run --rm --network host -v "$PWD:/w" -w /w \
  mcr.microsoft.com/playwright:v1.60.0-noble \
  npx playwright test --project=vr-1280 --update-snapshots=changed
```
`--update-snapshots=changed` updates non-matching and creates missing, but leaves matching baselines byte-identical — so the diff in the PR is exactly the set of screens that actually changed. (`--update-snapshots` with no value also means `changed`.)

### 3.4 Flake control — the FitOut-specific list

| Source | Control |
|--------|---------|
| **Web fonts** | `next/font` self-hosts, so no network flake. Still `await page.evaluate(() => document.fonts.ready)` before the first assertion — `font-display: swap` can otherwise capture the fallback metrics. |
| **Enter/exit animations** (`tw-animate-css` + Radix) | `animations: "disabled"` is the **default** for `toHaveScreenshot` — it stops CSS animations, CSS transitions *and* Web Animations and fast-forwards them to their end state. Nothing extra required. |
| **Text caret** | `caret: "hide"` — default. |
| **The 15-minute hold countdown** and relative timestamps | `await page.clock.setFixedTime(new Date("2026-03-01T09:00:00Z"))` **before** `page.goto`. Freeze rather than mask, so the rendered copy stays under test. |
| **Leaflet map tiles** (remote, non-deterministic) | `stylePath: "e2e/vr/screenshot.css"` hiding `.leaflet-tile-pane`, or `mask: [page.locator(".leaflet-container")]`. Prefer `stylePath` — masking paints a magenta box that itself becomes part of the baseline. |
| **Cloudinary-delivered photos** | Seed listings with a **fixed, committed** set of public IDs. Cloudinary `f_auto` can change the delivered encoder over time; pin `f_jpg`/`f_png` in VR fixtures if drift appears. |
| **Scrollbars** | Overlay vs classic scrollbars differ. `scale: "css"` + a fixed viewport in the container makes this consistent; do not run VR headed on Windows. |
| **Dev-server chrome** | Screenshot `next build && next start`, never `next dev`; optionally `devIndicators: false`. |
| **The seed problem** | VR must run against a **deterministic dataset**. Use `npm run db:test:setup` + a frozen VR seed (fixed IDs, fixed `FIT-` reference, fixed prices). A random seed makes every baseline a lie. This is the largest hidden cost of D-131 and belongs in the first v1.1 phase, not the last. |

### 3.5 Baseline storage and git strategy

- **Commit baselines to the repo**, at `e2e/__screenshots__/{project}/…`. They are the contract; a hosted service holding the contract off-repo is a worse trade for a solo dev than a slightly larger repo.
- Add `*.png binary -diff` (or `-text`) to `.gitattributes` under that path so git never attempts textual merges and PR diffs stay readable.
- Budget the size: at `scale: "css"`, viewport-only (not `fullPage`) PNGs run roughly 30–120 KB. **Prefer viewport screenshots plus a handful of targeted `expect(locator).toHaveScreenshot()` component shots over `fullPage: true`** — full-page shots of a long listing page are both large and maximally churn-prone (one paragraph reflow moves everything below it).
- **Never** hand-edit or regenerate baselines outside the container. Add an npm script (`vr:update`) that *is* the docker command so the wrong path is never the convenient one.

### 3.6 Scoping themes × viewports without combinatorial explosion

Naïve matrix: `surfaces × themes × viewports` = 25 × 3 × 3 = **225 baselines**. Unmaintainable.

**Recommended split — 3 themes cost 9 extra baselines, not 150:**

| Axis | Coverage |
|------|----------|
| **Surfaces × viewports, default theme only** | Every polished surface at `vr-320`, `vr-768`, `vr-1280`. ≈ 25 × 3 = **75**. |
| **Themes** | The `/preview` kitchen-sink route **only**, at 3 viewports × 3 themes = **9**. |
| **States** (loading / empty / error, D-131) | Component-scoped `expect(locator).toHaveScreenshot()` at **one** viewport (`vr-768`). ≈ 25 shots. |

**Rationale, and it is the point of D-128:** a second theme is not there to re-verify layout — layout is theme-invariant by construction. It is there to prove *no component hardcoded a value*. A kitchen-sink page rendering every variant of every component in three `data-theme` panels proves that **more directly and more cheaply** than re-shooting 25 product pages, because a leaked hex shows up as three identical cells in a row. Re-shooting product pages per theme buys near-zero additional signal for 6× the maintenance.

Total ≈ **110 baselines**, all regenerable with one command.

### 3.7 Alternatives — named, with the recommendation

| Tool | Current state | Verdict for this project |
|------|---------------|--------------------------|
| **Playwright native** | `toHaveScreenshot`, in `@playwright/test@1.60.0` | ✅ **Adopt.** Zero cost, zero new dependency, self-hosted, baselines in git, and the project already has a Playwright suite and config. |
| **Argos** (`@argos-ci/playwright@7.4.3`, pub. 2026-08-10) | Open-source uploader + hosted review UI, free tier, first-class Playwright integration | ⭐ **The named upgrade path.** Switching is *additive* — replace `toHaveScreenshot` with `argosScreenshot(page, name)`; baselines move off-repo to the service. Adopt only if reviewing PNG diffs in git becomes the actual pain. |
| **Chromatic** | ~$179/mo starter (35k snapshots, as of 06/2026); Storybook-centric | ❌ **No.** FitOut has no Storybook, and building one purely to feed Chromatic is a larger project than v1.1's VR requirement. |
| **Percy** (BrowserStack) | Cloud-only, from ~$39/mo, 5k free snapshots/mo | ❌ **No.** Cloud-only conflicts with "self-hosted CI"; pays for cross-browser breadth this milestone does not need (Chromium-only is the shipped config). |
| **Lost Pixel** | **Repository archived by the owner on 22 Apr 2026 — read-only. Team sunset the product.** Last publish 3.22.0, Nov 2024. | 🚫 **Ruled out.** Do not adopt. |
| **BackstopJS** | Self-hosted, still maintained | ❌ Duplicates a browser driver the project already runs. Only relevant if Playwright were absent. |

---

## § 4 — Image Cropping

### 4.1 The reframing that removes half the problem

The two requirements are **not** the same problem and should not share a library:

| Requirement | Nature | Solution |
|-------------|--------|----------|
| **Destructive 400×400 avatar crop** | User picks a square region; the stored asset *is* that square | `react-easy-crop` + canvas → Blob → existing server action |
| **Non-destructive cover-frame preview** (what 16:9 and 4:3 each cut off) | User picks a **focal point**; the original is preserved; every consumer crops differently at delivery | **No cropper.** Store a normalized focal point; render with `CldImage crop="fill" gravity="xy_center" x y` (`next-cloudinary`, already installed) |

The cover requirement is a *gravity picker*, not a cropper. A cropper produces one rectangle; a listing cover is consumed at 16:9 (hero), 4:3 (search card), 1:1 (map popover), and whatever the next layout needs. Baking a rectangle is the wrong data model — it is exactly the "non-destructive" constraint in the requirement. Confirmed that `@cloudinary-util/url-loader`'s `ImageOptions` (which `CldImageProps` extends) exposes `crop`, `gravity`, `x`, `y`.

### 4.2 Avatar cropper — recommendation

**`react-easy-crop@6.2.3`.**

- **React 19: SAFE, verified from the published tarball.** `Cropper` is `declare class Cropper extends React.Component<CropperProps, State>` with `static defaultProps`. React 19 removed `defaultProps` support for **function** components only; class-component `defaultProps` is untouched. This is the one risk the question flags, and it is not present here.
- Peer range `react >=16.4.0 && react-dom >=16.4.0` — React 19.2 satisfies it. No `--legacy-peer-deps`.
- Published **2026-07-24** (actively maintained). One dependency (`normalize-wheel`).
- Requires `"use client"` and `import "react-easy-crop/react-easy-crop.css"` (v6 ships styles as a separate file with a declared subpath export — v5's inline styles are gone; missing this import yields an invisible/unpositioned cropper).
- Gives `cropShape="round"`, `aspect={1}`, zoom + drag, keyboard support (`onKeyDown`/`keyboardStep` — relevant to D-131's keyboard gate), and `onCropComplete(percentArea, pixelArea)`.
- **Emits coordinates only.** You draw `pixelArea` onto a `<canvas>` and `canvas.toBlob(...)` yourself — about 25 lines.

**Integration point:** `src/app/actions/avatar.ts` takes `FormData` containing a `File` validated by `avatarFileSchema` (`image/*`, ≤5 MB) and calls `uploadAvatar()` in `src/lib/cloudinary.ts`, which currently applies `{ width: 400, height: 400, crop: "fill", gravity: "face" }`. The change is minimal and *server-shaped*:

1. Client: crop → canvas → `toBlob("image/webp", 0.92)` → `new File([blob], "avatar.webp", { type: "image/webp" })` → same `FormData`, same action. **The server action signature and all its threat-model guards (T-04-04/05/06) are untouched.**
2. Server: drop `gravity: "face"` (the user has now chosen the framing; auto-face would silently re-crop their choice). **Keep `crop: "fill", width: 400, height: 400`** as a defensive normalizer — a hostile client can still POST a non-square file, and the existing comment ("a hostile aspect ratio cannot blow up storage") documents exactly why that guard must stay.

**EXIF hazard, and the reason to crop client-side rather than ship coordinates:** Chrome applies `image-orientation: from-image` by default, so a rotated JPEG *displays* rotated but its raw pixel buffer is not. Sending crop coordinates to Cloudinary would require both sides to agree on orientation. Rendering through a canvas resolves orientation once, on the client, in the same coordinate space the user actually saw. Use `createImageBitmap(file, { imageOrientation: "from-image" })` as the canvas source to make that explicit.

### 4.3 Cover-frame preview — recommendation

**No new library.** Store `coverFocalX`/`coverFocalY` as normalized `0..1` numerics on the listing photo row.

- **Picker UI:** the cover image at natural aspect with draggable crosshair, plus two live preview boxes (`aspect-video` 16:9 and `aspect-[4/3]`) that are plain `<div>`s with `background-image` + `background-position: calc(x*100%) calc(y*100%)` / `background-size: cover`. No canvas, no library — this is CSS.
- **Delivery:** `<CldImage src={publicId} crop="fill" gravity="xy_center" x={Math.round(fx*w)} y={Math.round(fy*h)} width={…} height={…} />`, or `gravity="auto"` when no focal point is set.
- **Why this satisfies "non-destructive":** the uploaded original is never modified. Change the hero to 21:9 next quarter and every existing listing re-crops correctly with no re-upload and no migration.

### 4.4 Rejected candidates

| Candidate | Version | Verdict |
|-----------|---------|---------|
| **react-image-crop** | 11.1.2 (2026-06-21), zero deps, peer `react >=16.13.1` | Credible and React-19 safe. Rejected for the avatar because it is a *marquee selection over a static image* — the user drags a box, not the image. For a square avatar, pan-and-zoom (Instagram/Airbnb model) is the interaction people expect and is easier on a 320px viewport. **Keep as the fallback** if a rectangular free-select need appears. |
| **react-advanced-cropper** | 0.20.1 — **last published 2025-03-01, ~17 months stale** | Rejected on maintenance risk. No React 19 statement anywhere. Most featureful of the three, and that is the problem: more surface, no maintainer. |
| **react-cropper** / **cropperjs** | react-cropper 2.3.3 (last published **2023-04**) pinned to `cropperjs@^1`; cropperjs is now **2.1.1** (web components, breaking) | Rejected. The React wrapper is 3 years stale and pinned to a superseded major. Using cropperjs 2 directly means hand-wiring custom elements into React 19 — new risk for no gain. |
| **Cloudinary Upload Widget `cropping: true`** | — | **Ruled out for the listing uploader, as the brief states — confirmed verbatim from Cloudinary's docs:** *"Cropping is supported only with single-file uploading so make sure to also set the `multiple` widget parameter to `false`."* The 20-photo batch uploader (`src/components/listing/photo-uploader.tsx`) requires `multiple: true`. Also rejected for the avatar: the avatar path deliberately routes bytes through a server action so the `api_secret` never reaches the client, and the widget's own chrome cannot be themed by the v1.1 token contract — a hosted modal in someone else's design system is precisely the "unfinished" seam this milestone exists to remove. |

---

## § 5 — Accessibility Tooling

Three layers, cheapest first. All three are needed; none subsumes another.

### 5.1 Lint (free — the package is already on disk)

`eslint-plugin-jsx-a11y@6.10.2` arrives transitively via `eslint-config-next@16.2.7`, which enables **6** of its rules. Promote it to an explicit devDependency and enable the recommended set (**34** rules — a 28-rule uplift):

```js
// eslint.config.mjs
import jsxA11y from "eslint-plugin-jsx-a11y";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  jsxA11y.flatConfigs.recommended,   // 34 rules; `strict` (33) is available but noisier
  globalIgnores([ /* unchanged */ ]),
]);
```
Catches: missing labels, click-handlers on non-interactive elements, `tabIndex` misuse, unreachable custom controls, redundant roles. Catches **nothing** about contrast or focus visibility.

### 5.2 Contrast gate at test time (Vitest + culori) — the layer most projects skip

Parse the token blocks out of `src/app/globals.css` and assert every declared `(surface, foreground)` pair, **for every theme**, in a plain Vitest test:

```ts
import { wcagContrast } from "culori";

const PAIRS = [
  ["--background", "--foreground", 4.5],
  ["--muted", "--muted-foreground", 4.5],
  ["--brand", "--brand-foreground", 4.5],
  ["--success", "--success-foreground", 4.5],
  ["--primary", "--primary-foreground", 4.5],
  ["--background", "--ring", 3.0],      // WCAG 2.2 SC 1.4.11 Non-text Contrast
] as const;

for (const theme of THEMES)
  for (const [bg, fg, min] of PAIRS)
    expect(wcagContrast(tokens[theme][bg], tokens[theme][fg])).toBeGreaterThanOrEqual(min);
```

Why this layer earns its place: it runs in **milliseconds on every commit**, it covers themes that no screenshot exists for yet, and — decisively — **it would have caught all four defects in § Verified Defects before v1.0 shipped.** It is the direct enforcement of D-128 ("one token contract") at the contract level rather than the render level. `culori` is the right tool: `wcagContrast()` accepts `oklch()` strings directly and does the sRGB relative-luminance conversion internally; `formatHex()` is reused for the email palette (§ 6).

### 5.3 Rendered-page gate (Playwright + axe)

```ts
// e2e/fixtures/a11y.ts
import AxeBuilder from "@axe-core/playwright";
export const WCAG_AA = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"] as const;

export async function expectNoA11yViolations(page, testInfo) {
  const results = await new AxeBuilder({ page }).withTags([...WCAG_AA]).analyze();
  await testInfo.attach("axe", { body: JSON.stringify(results, null, 2), contentType: "application/json" });
  expect(results.violations).toEqual([]);
}
```

Verified against `axe-core@4.13.0`: all five tags exist and together select **70 rules**; `color-contrast` carries tags `wcag2aa, wcag143`. Because axe measures *rendered* pixels it catches what the token gate cannot — text over an image, a `muted-foreground` label that landed on a `card` instead of `background`, a disabled state below threshold.

**Attach the scan to the report rather than only asserting**, so a CI failure ships the offending selectors instead of a bare `[] !== [Object]`.

**Limits, stated plainly** (Playwright's own docs): *"many accessibility problems can only be discovered through manual testing."* Automated tooling does not verify focus order, that a focus indicator is *visible*, that an error message is *useful*, or that a custom calendar is *operable*. D-131's keyboard-operability gate needs a scripted keyboard walk (`page.keyboard.press("Tab")` + `expect(locator).toBeFocused()`) on the booking-critical flows, not just an axe pass.

### 5.4 Explicitly not recommended

- **`@axe-core/react@4.12.1`** — dev-time console reporter, patches `react-dom` at runtime. Overlaps `@axe-core/playwright` entirely, adds a React-internals coupling on React 19, and reports to a console nobody reads in CI. Skip.
- **`jest-axe` / `vitest-axe`** — running axe against jsdom is misleading: jsdom computes no layout and no cascade, so `color-contrast` (the rule that matters most here) is silently skipped. Real-browser axe or nothing.
- **APCA / `apca-w3`** — perceptually better than WCAG 2.x, but WCAG 2.2 AA is the stated gate (D-131) and APCA is not normative in WCAG 2.2. Using it would mean passing a gate nobody asked for while failing the one that was.

---

## § 6 — Transactional Email Shell (D-66 respected: zero new packages)

### 6.1 The constraint is also the correct engineering answer

**CSS custom properties are unusable in email — 45.24% support, and Gmail's failure mode is the worst possible one.** From caniemail: Gmail (desktop webmail, iOS, Android, mobile webmail), Fastmail and Mail.ru **support `var()` but do not support declaring custom properties**. Outlook Windows (all versions), Outlook macOS, Yahoo, AOL, Thunderbird and Samsung Email support neither.

So `var(--brand)` in an email is not a degradation — it is an undefined reference that drops the declaration. **Token values must be resolved to literal values at build or send time. They can never be referenced as `var()`.** This is not a limitation to work around; it is the reason a hand-written TS palette module beats any email framework here.

**And they must be resolved to `#RRGGBB`, not `oklch()`.** Modern colour functions sit at **21.21%** support — Outlook Windows 2007–2019, Outlook.com, Samsung and Thunderbird have none. Worse, caniemail's Gmail note: *"using this syntax for an inline style will remove all inline styles applied to that element."* An `oklch()` in an inline style attribute makes Gmail discard **the entire attribute**, taking the font, colour and padding with it. Hex is mandatory.

### 6.2 The shell, under D-66

One new file, no new dependency, same `send()` / `escapeHtml()` helpers in `src/lib/email.ts`:

```ts
// src/lib/email/theme.ts — the ONLY place email colours exist. Hex literals, resolved from tokens.
export const EMAIL = {
  brand:       "#da2d34",  // oklch(0.58 0.208 25)   — corrected --brand
  brandText:   "#fafafa",  // oklch(0.985 0 0)
  fg:          "#0a0a0a",  // --foreground
  muted:       "#6f6f6f",  // corrected --muted-foreground
  border:      "#e5e5e5",  // --border
  surface:     "#ffffff",  // --background
  surfaceAlt:  "#f5f5f5",  // --muted
} as const;
```

**Keeping it honest without a build step:** a Vitest test asserts `formatHex(<oklch token from globals.css>) === EMAIL.<key>`. `culori` is already a dev dependency for § 5.2, so this costs nothing and makes a token change that forgets the email palette a **red test**, not a silent brand drift. This is the "resolved at build or send time" mechanism the question asks for, implemented as a compile-time constant with a test-time proof — which is strictly stronger than a runtime resolution because it cannot fail in production.

```ts
// src/lib/email/shell.ts — one function, plain template literal, all styles inline.
export function shell(opts: { preheader: string; heading: string; body: string; cta?: { label: string; url: string } }) { /* … */ }
```

### 6.3 The markup rules that actually matter

| Rule | Why |
|------|-----|
| **Tables for layout, `role="presentation"` on every one** | Tables remain the only layout method that works everywhere. `role="presentation"` stops screen readers announcing "table with 1 row" before every email — an a11y bug the app-side D-131 gate would never catch. |
| **All styling inline via `style=""`** | A `<style>` block is 78.26% supported, and Gmail strips it entirely when it appears in `<body>` (and caps it at 16 KB). Inline styles are the only reliable channel. **Do not add `juice` or any inliner** — the shell is a single function, so there is no duplication for an inliner to remove, and a build-step dependency is exactly what D-66 bars. |
| **Width on every `<td>` as BOTH an HTML attribute and an inline style** | Outlook's Word engine reads the attribute; modern clients read the style. |
| **600px max content width, centred by an outer 100% table** | Fits every preview pane; the `width="600"` attribute is the Word-engine fallback while `max-width:600px` caps modern clients. |
| **Hex colours only. No `oklch()`, no `var()`, no `rgb()` with slash-alpha** | § 6.1. |
| **A bulletproof CTA: `<a>` with `background-color` + `padding` inside a `<td>`** | A padded anchor inside a table cell is the widely-supported form. Skip VML unless a rounded-corner button in Outlook Windows is a stated requirement — Microsoft is ending Word-based Outlook desktop support in **October 2026**, so investing in VML now is a depreciating asset. |
| **A hidden preheader `<div>` as the first body node** | Controls the inbox preview line. FitOut's booking mails currently leak `"Booking confirmed"` markup into it. |
| **Every interpolated value through `escapeHtml()` — no exceptions** | Already the WR-01 contract in `src/lib/email.ts`. The shell must not become the place that forgets it. |

### 6.4 Dark mode in email — the honest answer

`@media (prefers-color-scheme: dark)` sits at **41.86%** and, decisively, **it requires a `<style>` block** — which is the one channel Gmail is unreliable about. Meanwhile the clients that matter most **force** dark mode regardless of what you write:

- **Outlook.com / Outlook Windows** inject `data-ogsc` / `data-ogsb` / `data-ogac` / `data-ogab` attributes and rewrite colours when the user is in dark mode.
- **Gmail** applies its own colour inversion on some platforms.

**Recommendation, consistent with D-129:** build the email shell **light-only** and make it *survive* forced inversion rather than trying to control it.

1. **Never rely on a white background for contrast.** Give every text block an explicit `color`, and every surface an explicit `background-color`. An inverted client that flips a background you never declared, over text you did declare, is how emails become black-on-black.
2. `<meta name="color-scheme" content="light">` and `<meta name="supported-color-schemes" content="light">` in `<head>` — a hint that Apple Mail and some Outlook builds honour.
3. **Do not ship a dark variant.** It doubles the QA surface (the exact D-129 reasoning), for a media query fewer than half of recipients evaluate, in a milestone whose branding is explicitly a placeholder (D-127).

---

## Verified Defects in the Shipped Codebase

Found while researching; each is a v1.1 blocker under an existing decision. All numbers computed with `culori@4.0.2`; all file findings verified by compiling or reading the actual files.

### #1 — `--font-sans` cycle: Geist is loaded on every page and never applied

`globals.css:10`. Confirmed by compiling the real file (§ 2.1). The whole product renders in `ui-sans-serif`/system UI. Blast radius includes `--font-heading`, used by `card.tsx:41` and `dialog.tsx:133`. **Fix in § 2.2. This alone changes the appearance of every screen, so it must land before any visual-regression baseline is generated** — otherwise every baseline is regenerated the day it's fixed.

### #2 — Four shipped token pairs FAIL the WCAG AA bar that D-131 makes a hard gate

| Pair | Rendered | Ratio | Required | Status |
|------|----------|-------|----------|--------|
| `--brand` / `--brand-foreground` (**the coral CTA**) | `#ef4445` / `#fafafa` | **3.60** | 4.5 (normal text) | ❌ **FAIL** |
| `--success` / `--success-foreground` (status badge) | `#03a14a` / `#fafafa` | **3.24** | 4.5 | ❌ **FAIL** |
| `--muted-foreground` on `--muted` (secondary text on cards) | `#737373` / `#f5f5f5` | **4.34** | 4.5 | ❌ **FAIL** |
| `--ring` on `--background` (**focus indicator**) | `#a1a1a1` / `#ffffff` | **2.59** | 3.0 (SC 1.4.11 Non-text Contrast) | ❌ **FAIL** |
| `--foreground` / `--background` | `#0a0a0a` / `#ffffff` | 19.79 | 4.5 | ✅ |
| `--primary` / `--primary-foreground` | `#171717` / `#fafafa` | 17.16 | 4.5 | ✅ |
| `--muted-foreground` on `--background` | `#737373` / `#ffffff` | 4.73 | 4.5 | ✅ (thin) |
| `--destructive` on `--background` | `#e7000b` / `#ffffff` | 4.91 | 4.5 | ✅ |

**`02-UI-SPEC.md` line 223 asserts** *"Coral CTA contrast: `oklch(0.637 0.208 25)` on white ≈ ≥4.5:1 with white foreground text — verify with the declared `--brand-foreground`."* **That claim is false — the real value is 3.60:1.** The verification it asks for was apparently never performed. This is the single clearest argument for the § 5.2 build-time contrast gate, and it is a nice illustration of D-128's thesis: the token contract needs a *test*, not a note in a spec.

**Corrected values (solved to clear 4.5:1 / 3:1 while preserving hue and as much chroma as possible):**

```css
--brand:            oklch(0.58 0.208 25);   /* #da2d34 — 4.56:1 on #fafafa (was 3.60) */
--success:          oklch(0.53 0.17 150);   /* #00852e — 4.69:1 on #fafafa (was 3.24) */
--muted-foreground: oklch(0.541 0 0);       /* #6f6f6f — 4.62:1 on muted, 5.04:1 on white */
--ring:             oklch(0.58 0.208 25);   /* = --brand, 4.76:1 on white (was 2.59) */
```

Making `--ring` equal `--brand` is deliberate: it fixes the contrast failure and makes the focus indicator a *branded* affordance that changes with the theme — a token win, not just a compliance patch. Note it contradicts `02-UI-SPEC` line 93 ("Accent is NOT used for … form focus rings"); that rule was written to protect the 10% accent budget, and a focus ring is transient rather than a persistent surface. **Flag for the phase planner as a deliberate, recorded deviation.**

### #3 — Scaffold metadata

`src/app/layout.tsx:16-17` still ships `title: "Create Next App"` / `description: "Generated by create next app"`. This is the browser tab title, the `<title>` in every shared link, and the OG fallback on **every page of a live marketplace**.

### #4 — `<html>` lacks `suppressHydrationWarning`

Required the moment `next-themes` is mounted (its script mutates `documentElement` before hydration). Currently absent from `layout.tsx:26`.

### #5 — `sonner` reads a theme from a provider that does not exist, and follows the OS

`src/components/ui/sonner.tsx:8` — `const { theme = "system" } = useTheme()`. With no `ThemeProvider` mounted, `useTheme()` returns next-themes' fallback context (`{ setTheme: () => {}, themes: [] }`), so `theme` is `undefined` → defaults to `"system"` → sonner resolves it from `prefers-color-scheme`. **On a dark-mode OS, toasts render dark inside a light-only app today.** Under D-129, pin it: `<Sonner theme="light" …>` (or map from the theme list once themes carry a light/dark hint). This is also a visual-regression stability requirement — an unpinned toast theme makes the baseline depend on the CI host's OS preference.

### #6 — `mode-switch.tsx` is NOT a dark-mode toggle

`src/components/mode-switch.tsx` is the **booker/host** context switch (D-04) and is load-bearing product functionality. `02-UI-SPEC` line 29's "Honor existing `mode-switch`" refers to *this*, not to a colour-scheme control. **Recorded here so the D-129 dark-mode cleanup does not delete it.**

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| `next-themes@0.4.6` | Hand-rolled cookie-based theme + server-rendered `data-theme` on `<html>` | If theme must be **server-known** (e.g. per-account branding, or a themed email preview rendered on the server). A cookie read in the root layout gives zero-flash *without* an inline script and no client bundle. Costs: no cross-tab sync, no `localStorage` fallback, and you re-implement `disableTransitionOnChange`. Not worth it for a placeholder-theme picker. |
| `next-themes@0.4.6` | `better-themes` (Context7-listed, "multiple custom themes", SSR) | Only if next-themes proves unable to express something. It cannot — 0.4.6 already takes an arbitrary `themes` array. Prefer the installed, 0-new-dependency option. |
| Playwright native VR | **Argos** `@argos-ci/playwright@7.4.3` | When reviewing PNG diffs in git PRs becomes the bottleneck, or when baselines start dominating repo size. Migration is additive (swap the assertion call). |
| Playwright native VR | Chromatic | Only if a Storybook is built for other reasons. Do not build one *for* Chromatic. |
| `react-easy-crop@6.2.3` | `react-image-crop@11.1.2` | If a **free-rectangle** selection (not pan/zoom) is needed — e.g. cropping a floor plan or a document, where the user must select an arbitrary region rather than frame a subject. |
| Client canvas crop → existing server action | Send crop rect → Cloudinary **incoming transformation** (`transformation: [{crop:'crop',x,y,width,height},{width:400,height:400,crop:'fill'}]`) | If avatar quality at 400px ever matters more than simplicity — Cloudinary's resampler beats canvas, and no pixels transit the browser twice. Costs: client and server must agree on EXIF orientation and coordinate space, which is the bug this trade avoids. Revisit only if quality complaints appear. |
| `culori@4.0.2` | `colorjs.io@0.7.1` | If APCA or Delta-E perceptual work is ever needed. Larger, and still pre-1.0 after years. `culori`'s `wcagContrast` is exactly the needed API. |
| Semantic type ramp (`text-body`) | Tailwind's numeric scale (`text-base`) | For one-off, non-systematic text. Do not delete the numeric scale — additive, not exclusive. |
| Committed PNG baselines | Git LFS for `e2e/__screenshots__/**` | If baselines exceed ~50 MB. At ~110 viewport-scoped PNGs this is years away; adding LFS now buys a clone-time footgun for no benefit. |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| **Non-inline `@theme` for any themeable token** | Emits `--color-x: var(--x)` on `:root`, so the value computes at `:root` and inherits down as a constant. A `[data-theme]` subtree does not re-skin — **side-by-side preview, D-128's proof mechanism, breaks.** Verified by compiling both forms. | `@theme inline` for the whole L2 bridge. |
| **`next-themes`' `ThemeScript` component** | **Does not exist in 0.4.6** (the installed and current-latest version). It appears in Context7 because Context7 indexes the repo's `main`-branch autodocs. Planning around it produces a build error. | `<ThemeProvider>` renders the script itself, as its first child. |
| **`enableColorScheme` (default `true`) with non-`light`/`dark` theme names** | Verified in source: writes `null`, **removing** `color-scheme`, so native widgets follow the OS. Dark scrollbars and date pickers inside a light app — and non-deterministic screenshots. | `enableColorScheme={false}` + explicit `color-scheme: light` per theme. |
| **`class`-based theme selection** | Forces remove-all-then-add over the theme list, collides with the `.dark` class D-129 is retiring, and buys nothing over an attribute. | `attribute="data-theme"` (next-themes' own default). |
| **`--font-sans: var(--font-sans)`** (the shipped line) | Self-referential ⇒ CSS dependency cycle ⇒ guaranteed-invalid ⇒ `.font-sans` and `.font-heading` fall back to the inherited/system font. Geist is downloaded and never used. | `--font-sans: var(--app-font-sans)`, with `--app-font-sans: var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`. |
| **A `var()` reference with no literal fallback in a font stack** | One missing `next/font` className silently nukes `font-family` on the whole document. | Always terminate: `var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif`. |
| **Windows-generated Playwright baselines** | Different filename (`-win32` vs `-linux`, verified in installed source) **and** different glyph rasterization (DirectWrite vs FreeType). CI can never consume them. | Generate **only** in `mcr.microsoft.com/playwright:v1.60.0-noble`, pinned to the installed version. |
| **Leaving `updateSnapshots` at its default** | Default is `'missing'` — *"Missing snapshots are created… This is the default."* A CI job with no baseline **writes one and passes.** The D-131 gate would be decorative. | `updateSnapshots: process.env.CI ? "none" : "missing"`. |
| **`^` on `@playwright/test`** | A routine `npm i` pulls new Chromium binaries and invalidates every baseline with no code change. | Pin exact (`1.60.0`); bump and regenerate in one deliberate commit. |
| **`fullPage: true` for most VR shots** | One paragraph reflow moves everything below it → a whole-page diff that hides the real change. Also large. | Viewport shots + targeted `expect(locator).toHaveScreenshot()`. |
| **Screenshotting `next dev`** | Dev indicator overlay, HMR, unminified CSS ordering. | `next build && next start`; optionally `devIndicators: false`. |
| **VR against randomized seed data** | Every baseline becomes a lie and every run a false positive. | A frozen VR seed (fixed IDs, prices, `FIT-` reference) + `page.clock.setFixedTime()`. |
| **Baselining every surface in every theme** | 25 × 3 × 3 = 225 baselines for near-zero extra signal. | Full surfaces in the default theme; a kitchen-sink `/preview` route for the other themes. |
| **Cloudinary Upload Widget `cropping: true`** | Cloudinary docs: *"Cropping is supported only with single-file uploading so make sure to also set the `multiple` widget parameter to `false`."* The 20-photo listing uploader needs `multiple: true`. Its chrome is also untouchable by the token contract. | `react-easy-crop` for the avatar; a focal-point picker + `CldImage` for covers. |
| **`react-cropper` / `react-advanced-cropper`** | Last published 2023-04 and 2025-03 respectively; `react-cropper` is pinned to the superseded `cropperjs@^1`. No React 19 statement from either. | `react-easy-crop@6.2.3` (published 2026-07-24, class component ⇒ React 19 safe). |
| **Lost Pixel** | **Repository archived 22 Apr 2026; product sunset.** | Playwright native, or Argos. |
| **React Email / MJML / Maizzle / `juice`** | Barred by **D-66**. Independently: a CSS inliner solves duplication that a single shell function does not have, and JSX email adds a render pipeline to a codebase whose entire email surface is ~8 template functions. | Plain template literals over the existing `send()` / `escapeHtml()` in `src/lib/email.ts`, plus one `EMAIL` hex-constants module. |
| **`var()` or `oklch()` inside email HTML** | Custom properties 45.24% (Gmail can use `var()` but cannot *declare* one); modern colour functions 21.21%, and Gmail **discards the entire inline style attribute** when it encounters one. | Hex literals from `src/lib/email/theme.ts`, kept in sync by a `culori`-based Vitest assertion. |
| **A dark-mode email variant** | 41.86% media-query support, needs a `<style>` block Gmail is unreliable about, and Outlook/Gmail force their own inversion anyway. Doubles QA surface — the exact D-129 reasoning. | Light-only, with every `color` **and** `background-color` explicitly declared so forced inversion cannot produce black-on-black. |
| **`jest-axe` / `vitest-axe` against jsdom** | jsdom computes no layout and no cascade, so `color-contrast` — the rule that matters most here — is silently skipped. A green test that proves nothing. | `@axe-core/playwright` in a real browser, plus the `culori` token gate. |
| **`@axe-core/react`** | Dev-console reporter that patches `react-dom` at runtime; fully overlapped by `@axe-core/playwright`; new React-internals coupling on React 19. | `@axe-core/playwright` only. |
| **Renaming shadcn's raw tokens** (`--background`, `--popover`, `--radius`, …) | shadcn components reference them **directly in inline styles** — live example at `src/components/ui/sonner.tsx` — and every future `npx shadcn add` emits the same names. | Keep the shipped names; add new namespaces only for `--type-*` / `--elev-*` / `--app-font-*`. |
| **Reviving `@custom-variant dark (&:is(.dark *))`** | Under D-129 there is no `dark:` variant; a live variant invites the 66 removed classes back. | Delete it; the dark palette returns later as `[data-theme="dark"]`. |

---

## Stack Patterns by Variant

**If a second theme turns out to need different spacing or breakpoints (not just colour/type/radius):**
- Move `--spacing` and `--breakpoint-*` out of L3 `@theme` into L1 + `@theme inline`.
- Because they are theme-invariant *by assumption*, not by necessity — and `--spacing` in particular is referenced by `calc(var(--spacing) * n)` in every spacing utility, so the indirection works identically. Revisit only on evidence; keeping them in L3 documents the intent that they don't change.

**If theme selection ever needs to be server-known (per-account branding, server-rendered email previews):**
- Drop `next-themes` for a cookie read in the root layout, rendering `data-theme` server-side.
- Because a client script cannot inform a Server Component. Zero flash comes free; you lose cross-tab sync.

**If baselines start dominating repo size (> ~50 MB):**
- Move to **Argos** (`@argos-ci/playwright@7.4.3`) rather than Git LFS.
- Because Argos also solves diff *review*, which LFS does not, and the migration is a one-line assertion swap.

**If the avatar cropper needs to also serve listing cover *rectangles* (a free-select, not a focal point):**
- Add `react-image-crop@11.1.2` alongside `react-easy-crop` rather than replacing it.
- Because the two interactions are genuinely different (frame-a-subject vs select-a-region) and each library is small and single-purpose. Do not force one library to do both.

**If Outlook Windows rounded-corner CTAs become a stated requirement:**
- Add VML conditional markup by hand in the shell's button helper.
- Because Microsoft is ending Word-based Outlook desktop support in October 2026 — do this only on a real complaint, never speculatively.

---

## Version Compatibility

| Package A | Compatible With | Notes |
|-----------|-----------------|-------|
| `tailwindcss` 4.3.0 / `@tailwindcss/postcss` 4.3.0 | Next 16.2.7, `shadcn` 4.10 | `@theme inline` + `--text-*` modifiers + scoped `[data-theme]` overrides all verified compiling against 4.3.0. `node_modules/shadcn/dist/tailwind.css` contributes only `@custom-variant`s and accordion keyframes — **no colour tokens** — so it cannot conflict with the token layers. |
| `next-themes` 0.4.6 | React 19.2 | Peer explicitly lists `^19`. **Exports only `ThemeProvider`, `useTheme` and 3 types** — no `ThemeScript`. 0.4.6 is the current npm `latest`. |
| `react-easy-crop` 6.2.3 | React 19.2 | Peer `react >=16.4.0`. Class component + `static defaultProps` — the React 19 function-component `defaultProps` removal does not apply. CSS at the `./react-easy-crop.css` subpath export. `sideEffects: false`. |
| `@axe-core/playwright` 4.12.1 | `@playwright/test` 1.60.0 | Peer `playwright-core >= 1.0.0`. Bundles `axe-core@4.13.0`, in which `wcag2a/wcag2aa/wcag21a/wcag21aa/wcag22aa` select **70 rules**. |
| `eslint-plugin-jsx-a11y` 6.10.2 | ESLint 9 + `eslint-config-next` 16.2.7 | Peer `eslint ^9`. **Already hoisted at `node_modules/eslint-plugin-jsx-a11y`** as a transitive of `eslint-config-next`. Exports `flatConfigs.recommended` (34 rules) / `flatConfigs.strict` (33). |
| `culori` 4.0.2 | Vitest 4.1.8 (Node) | Zero deps, ESM+CJS. `wcagContrast()` accepts `oklch()` strings directly. |
| `@playwright/test` 1.60.0 | `mcr.microsoft.com/playwright:v1.60.0-noble` | **Docker tag must equal the pinned package version** — Playwright docs: pin the image or browser executables are not found. Latest published is 1.62.1; upgrading is fine but regenerate baselines in the same commit. |
| `next-cloudinary` 6.17.5 | Next 16.2.7 / React 19 | `CldImageProps` extends `@cloudinary-util/url-loader`'s `ImageOptions`; `crop`, `gravity`, `x`, `y` confirmed present. |
| `sonner` 2.0.7 | `next-themes` 0.4.6 | `src/components/ui/sonner.tsx` already calls `useTheme()`. Once a provider is mounted it starts receiving a real value — **pin `theme="light"` under D-129** or it will follow whatever the theme name maps to. |

---

## Open Questions for Phase Planning

1. **Theme names and count.** Three is the recommendation (`alpine` = the shipped coral direction per D-127, plus two genuinely different candidates). The names above are placeholders; the count drives the § 3.6 baseline budget.
2. **Where `/preview` lives.** It must be reachable in the VR run but should not be a public route in production. `NODE_ENV`-gated route, or a route group excluded from the sitemap — a planner's call with a small security surface (it renders no user data).
3. **Whether the corrected `--ring: var(--brand)` is accepted**, given `02-UI-SPEC` line 93 bars accent-coloured focus rings. It fixes a hard AA failure and makes focus theme-aware; it needs an explicit decision record.
4. **VR seed strategy.** Deterministic fixtures are the largest hidden cost of D-131 and are a prerequisite for the *first* VR baseline, not the last. Reusing `scripts/seed.ts` with a fixed RNG seed vs. a separate `scripts/seed-vr.ts` is a real fork.
5. **Whether the type scale is theme-swappable in practice.** The mechanism supports it (verified). If all three placeholder themes share one scale, `--type-*` could collapse into L3 — cheaper, but forecloses a typographically distinct candidate. Recommendation: keep it in L1; it costs nothing.

---

## Sources

**Verified by execution against this repository (HIGHEST confidence — these are measurements, not claims):**
- Compiled `src/app/globals.css` and synthetic fixtures with `@tailwindcss/cli@4.3.0` — proved `@theme inline` emits `var()` into utilities (subtree themes work), non-inline `@theme` resolves at `:root` (subtree themes break), `--text-*` modifiers survive `inline`, and the `--font-sans` cycle poisons `--default-font-family` and `--font-heading`.
- `node_modules/next-themes/dist/index.mjs` + `index.d.ts` (0.4.6) — default `attribute: "data-theme"`; blocking inline `<script>` rendered as the provider's first child; `enableColorScheme` writes `null` for non-light/dark names; **no `ThemeScript` export**.
- `node_modules/playwright/lib/index.js:347` — `testInfo.snapshotSuffix = process.platform`.
- `node_modules/playwright/lib/worker/workerProcessEntry.js:2658` — default template `{snapshotDir}/{testFileDir}/{testFileName}-snapshots/{arg}{-projectName}{-snapshotSuffix}{ext}`.
- `node_modules/playwright/types/test.d.ts:1931-1954` — `updateSnapshots` defaults to `'missing'` ("Missing snapshots are created… This is the default"), verbatim.
- Unpacked `react-easy-crop@6.2.3` tarball — `declare class Cropper extends React.Component` with `static defaultProps`; `./react-easy-crop.css` subpath export.
- `culori@4.0.2` `wcagContrast()` over every shipped token pair — the § Verified Defects #2 table and the corrected oklch values.
- `axe-core@4.13.0` `getRules()` — tag inventory incl. `wcag22aa`; 70 rules across the five AA tags; `color-contrast` tagged `wcag2aa,wcag143`.
- `node_modules/eslint-config-next@16.2.7` — bundles `eslint-plugin-jsx-a11y@^6.10.0`, enables 6 rules; plugin hoisted at 6.10.2 exposing `flatConfigs.recommended` (34) / `strict` (33).
- `node_modules/@cloudinary-util/url-loader` `ImageOptions` — `crop` / `gravity` / `x` / `y` present.
- `node_modules/shadcn/dist/tailwind.css` — variants + keyframes only, no colour tokens.
- Repo reads: `src/app/globals.css`, `src/app/layout.tsx`, `src/components/ui/sonner.tsx`, `src/components/ui/card.tsx`, `src/components/ui/dialog.tsx`, `src/components/mode-switch.tsx`, `src/app/actions/avatar.ts`, `src/lib/cloudinary.ts`, `src/lib/email.ts`, `playwright.config.ts`, `eslint.config.mjs`, `components.json`.

**Context7 / official documentation (HIGH):**
- `/websites/tailwindcss` + `tailwindcss.com/docs/theme`, `/docs/font-size`, `/docs/font-family`, `/docs/colors`, `/docs/adding-custom-styles` — namespace table, `@theme inline` semantics and the scoping caveat, `@theme static`, `--*: initial`, `--text-*--line-height|--letter-spacing|--font-weight`, "theme variables must be defined top-level".
- `/pacocoursey/next-themes` — `themes` array, `value` mapping, `suppressHydrationWarning` requirement. *(Caveat: this entry documents `main`-branch `ThemeScript`, which 0.4.6 does not ship — flagged above.)*
- `/websites/playwright_dev` + `playwright.dev/docs/test-snapshots`, `/docs/api/class-pageassertions`, `/docs/api/class-testconfig`, `/docs/test-cli`, `/docs/docker` — full `toHaveScreenshot` option set with defaults (`animations:"disabled"`, `caret:"hide"`, `threshold:0.2`, `scale:"css"`), `snapshotPathTemplate` tokens, `--update-snapshots` modes, `--update-source-method`, the cross-environment consistency warning, `mcr.microsoft.com/playwright:v1.62.0-noble` tag convention and pinning advice.
- `ui.shadcn.com/docs/theming` — the surface/`-foreground` token convention, `@theme inline` wiring, custom-token pattern; **confirms no multi-theme guidance exists beyond light/dark**.
- `cloudinary.com/documentation/upload_widget_reference` — *"Cropping is supported only with single-file uploading so make sure to also set the `multiple` widget parameter to `false`."*
- `nextjs.org/docs/app/api-reference/config/next-config-js/devIndicators` (doc version 16.3.0) — `devIndicators: false`; `appIsrStatus`/`buildActivity` removed in v16.0.0.
- npm registry (`npm view`, 2026-08-11) — react-easy-crop 6.2.3, react-image-crop 11.1.2, react-advanced-cropper 0.20.1 (2025-03-01), react-cropper 2.3.3 (2023-04), cropperjs 2.1.1, @axe-core/playwright 4.12.1, axe-core 4.13.0, culori 4.0.2, eslint-plugin-jsx-a11y 6.10.2, @argos-ci/playwright 7.4.3, lost-pixel 3.22.0 (2024-11), next-themes 0.4.6 (`latest`), @playwright/test 1.62.1 (`latest`; 1.60.0 installed).

**Email-client support data (MEDIUM — caniemail is the field's standard reference; note stated update dates):**
- `caniemail.com/features/css-variables/` — **45.24%**; Gmail/Fastmail/Mail.ru support `var()` but cannot declare custom properties; Outlook Windows/macOS, Yahoo, AOL, Thunderbird: none.
- `caniemail.com/features/css-modern-color/` — `lch()`/`oklch()`/`lab()`/`oklab()` **21.21%**; not in Outlook Windows 2007-2019, Outlook.com, Samsung, Thunderbird; **Gmail note: an unsupported colour syntax in an inline style removes all inline styles on that element**.
- `caniemail.com/features/css-at-media-prefers-color-scheme/` — **41.86%** (page last updated 2023-03-08); Outlook injects `data-ogsc`/`data-ogac`/`data-ogsb`/`data-ogab` in dark mode.
- `caniemail.com/features/html-style/` — **78.26%**; Gmail strips `<style>` in `<body>` and caps at 16 KB; Outlook Windows requires `<style>` before use.

**MEDIUM / corroborated across multiple sources:**
- Lost Pixel archival — GitHub repo banner *"This repository was archived by the owner on Apr 22, 2026. It is now read-only"* (primary, HIGH) corroborated by 2026 tool round-ups.
- VR-tool pricing (Chromatic ~$179/mo starter as of 06/2026; Percy from ~$39/mo, 5k free snapshots) — vendor blogs and 2026 comparison round-ups; verify before purchase.
- HTML-email layout conventions (600px, `role="presentation"`, width as both attribute and inline style, MSO conditional width, VML for Outlook rounded corners, Word-engine desktop Outlook support ending October 2026) — multiple 2026 practitioner guides, consistent with each other.

---
*Stack research for: v1.1 Front-End Polish & Placeholder Design System (additive to the v1.0 stack)*
*Researched: 2026-08-11*
