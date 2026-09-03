# Phase 10: Design-System Foundation & Theme Runtime — Pattern Map

**Mapped:** 2026-08-11
**Files analyzed:** 31 create/modify groups (5 net-new infra, 13 net-new tests, 9 net-new source, 6 delete, plus 5 bulk-edit groups)
**Analogs found:** 22 with a real analog / 31 total (9 have **no analog** — see § No Analog Found)

> **Every count below was re-measured against the live tree in this session.** Where RESEARCH.md or
> CONTEXT.md states a number, § Measurement Verification records whether it holds. All of them do.

---

## File Classification

### Net-new infrastructure (Wave 0)

| New file | Role | Data flow | Closest analog | Match quality |
|---|---|---|---|---|
| `vitest.design.config.ts` | config | build/static | `vitest.config.ts` | **exact** (same defineConfig, same alias) |
| `config/design-leak-patterns.mjs` | config (shared constant list, plain ESM) | transform | `scripts/patch-kysely-adapter.mjs` (ESM + regex constants) · `src/lib/listing-vocab.ts` (single-source-of-truth vocabulary) | partial — `config/` does not exist |
| `src/lib/design/contrast-pairs.ts` | model (declared data inventory) | transform | `src/lib/listing-vocab.ts` | **exact** (as-const inventory + derived type + derived map) |
| `tests/design/helpers/compile-css.ts` | test-helper | file-I/O + transform | `tests/helpers/db.ts` naming/placement · `tests/use-server-exports.test.ts` fs conventions | role-match |
| `scripts/generate-design-tokens.mjs` | script (codegen) | file-I/O | `scripts/patch-kysely-adapter.mjs` | **exact** (only committed `.mjs` script; read→transform→write) |

### Net-new source (Waves 2 & 4)

| New file | Role | Data flow | Closest analog | Match quality |
|---|---|---|---|---|
| `src/components/theme/theme-provider.tsx` | provider (client) | event-driven | `src/components/ui/tooltip.tsx` (thin `"use client"` provider re-export) · `src/lib/listing-vocab.ts` (the `THEMES as const` half) | partial — **no React provider is mounted anywhere today** |
| `src/components/theme/theme-query-param.tsx` | hook/effect (client, renders null) | event-driven | `src/components/mode-switch.tsx` (client component conventions) | role-match |
| `src/components/theme/favicon-swap.tsx` | hook/effect (client, renders null) | event-driven | `src/components/mode-switch.tsx` | role-match |
| `src/app/dev/theme/page.tsx` | route (Server Component page) | request-response | `src/app/invite/[token]/page.tsx` | **exact** (root-level route deliberately outside `(app)`/`(host)`, header comment justifying placement, `metadata` export) |
| `src/lib/design/tokens.generated.ts` | model (generated, committed) | — | — | **none** — no generated/committed artifact exists in the repo |
| `public/icon-court.svg` · `public/icon-grove.svg` | asset (generated) | — | `src/components/listing/listing-map.tsx:32-35` (hand-written inline SVG) | partial |
| `e2e/helpers/theme.ts` | test-helper (Playwright) | — | `tests/helpers/` (naming) · `e2e/public-listing.spec.ts` (spec conventions) | partial — **`e2e/helpers/` does not exist; no `addInitScript` anywhere** |
| DS-10 status-tone module (`src/lib/design/status-tones.ts` or co-located) | model (closed union + recipe map) | transform | `src/components/booking/booking-status.ts:16-45` + `booking-status-badge.tsx:39-51` | **exact** |

### Net-new tests (`tests/design/**`)

| New file | Role | Data flow | Closest analog | Match quality |
|---|---|---|---|---|
| `tests/design/leak.test.ts` | test (source-tree guard) | file-I/O + static | `tests/use-server-exports.test.ts` | **exact** |
| `tests/design/dark-scope.test.ts` (THEME-05, pins **exactly 56**) | test (guard + pinned count) | file-I/O + static | `tests/use-server-exports.test.ts` (scan) + `tests/security/rate-limit-bound.test.ts:45-47,68-71` (pinned number + positive control) | **exact** (composite) |
| `tests/design/pair-drift.test.ts` | test (source-tree guard) | file-I/O + static | `tests/use-server-exports.test.ts` | **exact** |
| `tests/design/focus-recipe.test.ts` (DS-05 zero `ring-ring/50`) | test (source-tree guard) | file-I/O + static | `tests/use-server-exports.test.ts` | **exact** |
| `tests/design/scaffold-residue.test.ts` (DS-14) | test (fs assertions) | file-I/O | `tests/use-server-exports.test.ts` (fs imports) | role-match |
| `tests/design/contrast.test.ts` (DS-06/07) | test (unit, pure math) | transform | `tests/security/rate-limit-bound.test.ts` (pure unit, no DB) | role-match |
| `tests/design/token-drift.test.ts` (DS-12) | test (regen-diff) | file-I/O | `scripts/patch-kysely-adapter.mjs` (idempotency marker idea) | partial |
| `tests/design/font-cycle.test.ts` (DS-01) | test (compile-and-assert) | transform | — | **none** — no CSS-compiling test exists |
| `tests/design/motion-budget.test.ts` (DS-04) | test (parsed-token unit) | transform | `tests/security/rate-limit-bound.test.ts` | role-match |
| `tests/design/theme-tokens.test.ts` (THEME-02 key-set equality) | test (unit, set equality) | transform | `tests/security/rate-limit-bound.test.ts` | role-match |
| `tests/design/button-variants.test.ts` (DS-08/09) | test (CVA unit) | transform | `tests/booking/partial-grant-notice.test.tsx` (className assertions) | role-match |
| `tests/design/status-vocab.test.ts` (DS-10) | test (type + data) | transform | `tests/security/rate-limit-bound.test.ts` | role-match |
| `tests/design/theme-provider.test.tsx` (THEME-01) | test (jsdom render) | event-driven | `tests/booking/partial-grant-notice.test.tsx` | **exact** — ⚠ see § Landmine: the `.tsx` config trap |

### Modified files

| Modified file | Role | Data flow | Closest analog (for the *shape of the change*) | Match quality |
|---|---|---|---|---|
| `src/app/globals.css` | config (stylesheet) | — | itself, `:7-53` / `:55-94` / `:135-145` | **self** |
| `src/app/layout.tsx` | layout (root RSC) | request-response | `src/app/invite/[token]/page.tsx:56-60` (metadata block w/ justifying comment) | role-match |
| `src/components/ui/button.tsx` | component (CVA) | — | itself, `:7-42` | **self** |
| `src/components/ui/sonner.tsx` | component (client) | event-driven | itself, `:7-12` | **self** |
| 11 vendored `focus-visible:ring-ring/50` files | component (vendored) | — | `src/components/ui/button.tsx:8` | **exact** |
| 20 `<Button>` `bg-brand` call sites | component/page | — | `src/components/booking/book-cta.tsx:222` | **exact** |
| 5 status-badge call sites (DS-10) | component | — | `booking-status-badge.tsx:39-51` · `payout-state-badge.tsx:27-36` | **exact** |
| `src/components/listing/listing-map.tsx` | component (client) | — | itself, `:22,:29-39` | **self** |
| 6 palette-class files + `ui/dialog.tsx:42` | component/layout | — | — | mechanical |
| 5 `dark:` files (10 occurrences) | component/layout | — | — | mechanical |
| `package.json` | config | — | itself, `:5-23` | **self** |
| `eslint.config.mjs` | config (flat) | static analysis | itself, `:1-23` | **self** — but **no custom rule exists to copy** |
| DELETE `src/app/favicon.ico` + `public/{file,globe,next,vercel,window}.svg` | asset | — | — | mechanical |

---

## Pattern Assignments

### 1. `tests/design/*.test.ts` — the source-tree guard tests (leak, dark-scope, focus-recipe, pair-drift)

**Analog:** `tests/use-server-exports.test.ts` — the repo's one existing mechanical guard that walks `src/`.
This is the single highest-value analog in the phase. Copy its **structure and its discipline**, not just its imports.

**Imports + tree walk** (`tests/use-server-exports.test.ts:104-125`):
```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

const SRC_DIR = resolve(process.cwd(), "src");

/** A single illegal export, rendered as one readable line for the failure diff. */
type Violation = string;

/** Collect every .ts/.tsx file under a directory, recursively. */
function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, out);
    } else if (/\.tsx?$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}
```

**Windows path normalisation — load-bearing on this box** (`:302`):
```ts
const label = relative(process.cwd(), file).split("\\").join("/");
```
Without this the failure messages (and any path-prefix filter such as "is this under `src/components/ui/`?")
break on Windows. The leak gate's D-17 vendored-scope split and THEME-05's exclusion both depend on a
forward-slash path comparison — **copy this line verbatim**.

**Scan-once-at-module-level, assert-in-`it`** (`:296-310`):
```ts
function scanSrc(): { serverModules: string[]; violations: Violation[] } {
  const serverModules: string[] = [];
  const violations: Violation[] = [];
  for (const file of collectSourceFiles(SRC_DIR)) {
    const sf = parse(file, readFileSync(file, "utf8"));
    if (!hasUseServerDirective(sf)) continue;
    const label = relative(process.cwd(), file).split("\\").join("/");
    serverModules.push(label);
    violations.push(...findIllegalExports(sf, label));
  }
  return { serverModules, violations };
}

describe('the "use server" module contract', () => {
  const { serverModules, violations } = scanSrc();
```

**Guard-the-guard — non-negotiable in this repo** (`:312-318`):
```ts
  // Guard-the-guard: if the scanner silently stopped finding server modules (a moved directory, a
  // broken directive check), the real assertion below would pass vacuously — which is the exact
  // failure mode this whole file was written to prevent.
  it("finds the server-action modules it is supposed to be policing", () => {
    expect(serverModules.length).toBeGreaterThan(10);
    expect(serverModules).toContain("src/app/actions/avatar.ts");
  });
```
Every `tests/design/` scanner needs this. The leak test's version: assert the scan visited a known count of
files (30 in `src/components/ui/`, and `src/components/listing/listing-map.tsx` must be in the scanned set).

**Self-test on a synthetic fixture, before the real assertion** (`:337-369`) — the analog parses an inline
string and asserts both what the rule flags *and* what it exempts. The leak test must do exactly this for
RESEARCH § L14's two false-positive classes: `"see #3388 for details"` must **not** flag, and
`bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` must **not** flag.

**The authoritative assertion is a one-liner against an empty array** (`:371-373`):
```ts
  it('every "use server" module in src/ exports only async functions', () => {
    expect(violations).toEqual([]);
  });
```

**The observed-red header block** (`:26-62`) — a ~40-line comment recording the verbatim failing run before
any source change. This repo's convention is that *a guard that has never been watched failing is not a
guard*. DS-13's Wave 5 "deliberately inject a leak" task should be recorded in the leak test's header in
exactly this format.

---

### 2. `tests/design/dark-scope.test.ts` — the pinned-count assertion (THEME-05's "exactly 56")

**Analog:** `tests/security/rate-limit-bound.test.ts`

**Pinning a number as the number, not a copy of it** (`:45-47`):
```ts
  it("pins the ceiling at 50,000 (the number, not a copy of it)", () => {
    expect(RATE_LIMIT_MAX_BUCKETS).toBe(50_000);
  });
```

**Positive control — the pattern that stops a vacuous pass** (`:62-71`):
```ts
      // Every first hit is ALLOWED: bounding the store must not turn into a stealth global limiter.
      expect(allowed).toBe(FLOOD);

      // THE ASSERTION CR-04 EXISTS FOR.
      expect(__rateLimitBucketCount()).toBeLessThanOrEqual(RATE_LIMIT_MAX_BUCKETS);

      // POSITIVE CONTROL: the keys really were distinct, so an unbounded store WOULD have held 60,000.
      // Without this the case above would also pass against a limiter that silently stored nothing.
      expect(__rateLimitBucketCount()).toBeLessThan(FLOOD);
      expect(__rateLimitBucketCount()).toBeGreaterThan(0);
```

**Documenting an accepted deviation as a test, not a comment** (`:126-128`):
```ts
describe("T-08-36 — the accepted eviction tradeoff, written down", () => {
  it("gives a LIVE key evicted under flood a fresh window on its next hit", () => {
```
THEME-05's `exactly 56 in src/components/ui/**` is the same shape: the count *is* the record of D-129's
deliberate vendored exemption. Write it as `expect(vendoredDarkCount).toBe(56)` with the D-129 rationale in
the `it()` name, plus the positive control that the scanner really visited all 14 vendored files.

---

### 3. `vitest.design.config.ts`

**Analog:** `vitest.config.ts` — copy the alias, drop the DB machinery.

**Imports + alias to copy verbatim** (`vitest.config.ts:1-34`):
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
```

**What must NOT be copied** (`vitest.config.ts:57-59`) — these two lines are exactly what makes the existing
config need Docker + Postgres (RESEARCH L8):
```ts
    setupFiles: ["tests/setup.ts"],
    // Runs ONCE in the main process, around the whole suite (it does NOT inherit setupFiles).
    globalSetup: ["tests/global-setup.ts"],
```

**Include/exclude shape to adapt** (`:60-62`):
```ts
    include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"],
    // E2E specs live in /e2e and are run by Playwright, not Vitest.
    exclude: ["e2e/**", "node_modules/**", ".next/**"],
```

**Header-comment convention:** `vitest.config.ts:5-27` is a 23-line block explaining *why* each knob exists,
including which layers are load-bearing. `vitest.design.config.ts` should carry the equivalent: why a second
config exists at all (L8), and why it has no `globalSetup`.

**⚠ Landmine — the `.tsx` config trap.** `vitest.config.ts:60` includes `tests/**/*.test.tsx`. If
`tests/design/theme-provider.test.tsx` (THEME-01) is written as `.tsx`, the **main** config will also pick it
up and pay the Postgres preflight — which is why VALIDATION.md's THEME-01 row says `npm test -- …` rather
than `npm run test:design`. Either (a) give the design config `include: ["tests/design/**/*.test.ts?(x)"]`
plus `environment: "node"` with the `// @vitest-environment jsdom` pragma per file (the repo's existing
opt-in mechanism — see `tests/booking/partial-grant-notice.test.tsx:1`), and **also** add
`exclude: ["tests/design/**"]` to `vitest.config.ts`; or (b) accept that THEME-01 requires the DB config.
The planner must choose explicitly — the current draft leaves THEME-01 needing Docker.

---

### 4. `scripts/generate-design-tokens.mjs`

**Analog:** `scripts/patch-kysely-adapter.mjs` — the repo's only committed `.mjs` script.

**No shebang. Node-ESM imports, `process.cwd()`-rooted hard-coded paths, module-level constants** (`:15-27`):
```js
import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve(
  process.cwd(),
  "node_modules/@better-auth/kysely-adapter/dist",
);

const LOCAL_DEFS =
  '\nconst DEFAULT_MIGRATION_TABLE = "kysely_migration";' +
  '\nconst DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock";\n';

const MARKER = "/* fitout-kysely-patch */";
```
The `resolve(process.cwd(), "<literal>")` idiom is exactly what RESEARCH § Security V12 requires ("hard-code
both paths; never derive a write path from an argument"). **No argv handling exists in this script and none
is needed** — the generator takes no arguments.

**`main()` at the bottom, existence guard, counted summary via `console.log`** (`:63-81`):
```js
function main() {
  if (!existsSync(DIST)) {
    // Adapter not installed (or different layout) — nothing to patch.
    return;
  }
  const targets = readdirSync(DIST).filter(
    (f) => /sqlite-dialect.*\.mjs$/.test(f),
  );
  let patched = 0;
  for (const f of targets) {
    if (patchFile(resolve(DIST, f))) patched++;
  }
  console.log(
    `[patch-kysely-adapter] patched ${patched}/${targets.length} sqlite dialect file(s).`,
  );
}

main();
```
Copy the `[script-name] …` log prefix and the `n/total` summary shape.

**Idempotency marker** (`:30-31`) — `if (src.includes(MARKER)) return false;`. The generator's equivalent is
the `DO NOT EDIT` banner, which `token-drift.test.ts` then asserts round-trips byte-identically.

**Invocation convention** (`package.json:22`): `"postinstall": "node scripts/patch-kysely-adapter.mjs"` —
plain `node`, not `tsx`. `.ts` scripts in this repo use `tsx` (`package.json:14-18`); `.mjs` uses `node`.

---

### 5. `src/lib/design/contrast-pairs.ts` — the declared inventory (D-13)

**Analog:** `src/lib/listing-vocab.ts` — the repo's canonical "single source of truth vocabulary" module.

**Header comment naming itself as the single source of truth, and naming what it mirrors** (`:1-8`):
```ts
// D-08 locked v1 listing vocabulary — the SINGLE source of truth for space types, activity tags,
// and amenities. The wizard select/checkbox UIs, the shared Zod schemas, and the Phase-4 search
// filters all read from here so the values never drift. …
//
// Structure mirrors src/lib/profile.ts (a module of exported constants the rest of the app reads):
// each vocabulary is an `as const` array of { value, label }; from it we derive a value→label map
// and a bare-value tuple suitable for `z.enum(...)`.
```

**`as const` array → derived literal union → derived `Record` map** (`:18-42`):
```ts
export const SPACE_TYPES = [
  { value: "pickleball_court", label: "Pickleball court" },
  // …
] as const;

export type SpaceTypeValue = (typeof SPACE_TYPES)[number]["value"];

/** value → display label lookup (D-08). */
export const SPACE_TYPE_LABELS = Object.fromEntries(
  SPACE_TYPES.map((t) => [t.value, t.label]),
) as Record<SpaceTypeValue, string>;
```
`CONTRAST_PAIRS` follows exactly this: an `as const` array of `{ fg, bg, bar, alpha?, note }` and a derived
`TokenName` union. Note `contrast.test.ts` in RESEARCH § Code Examples uses `it.each(CONTRAST_PAIRS)` with
`$fg`/`$bg`/`$bar` — that requires the array elements to be plain objects, which this idiom gives.

**The type-derivation helper idiom** for extracting a bare tuple (`:10-13`) is available if the pair list
needs a `z.enum`-shaped export, but is probably unnecessary here.

**Also copy from `listing-vocab.ts`:** the `// ---------------------------------------------------------`
section-divider comment style (`:15-17`, `:44-46`, `:75-77`) — the pair inventory has natural groups (text
bars, non-text bars, alpha-composited, excluded-decorative).

**The blind-spot disclosure** RESEARCH Pattern 9 requires in the file header has a precedent in
`tests/use-server-exports.test.ts:89-102` ("NOT COVERED — real blind spots, listed so the next reader
under-trusts this file rather than over-trusts it"). Copy that heading and tone verbatim.

---

### 6. `src/components/ui/button.tsx` — the DS-08 `brand` variant and DS-09 `touch` size

**Analog:** itself. This is the full current `buttonVariants` block (`:7-42`), verbatim — it contains
**four** things this phase must change and **one** idiom the UI-SPEC says to reuse:

```ts
const buttonVariants = cva(
  "group/button inline-flex shrink-0 items-center justify-center rounded-lg border border-transparent bg-clip-padding text-sm font-medium whitespace-nowrap transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/80",
        outline:
          "border-border bg-background hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:border-input dark:bg-input/30 dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)] aria-expanded:bg-secondary aria-expanded:text-secondary-foreground",
        ghost:
          "hover:bg-muted hover:text-foreground aria-expanded:bg-muted aria-expanded:text-foreground dark:hover:bg-muted/50",
        destructive:
          "bg-destructive/10 text-destructive hover:bg-destructive/20 focus-visible:border-destructive/40 focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:hover:bg-destructive/30 dark:focus-visible:ring-destructive/40",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-8 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        xs: "h-6 gap-1 rounded-[min(var(--radius-md),10px)] px-2 text-xs in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 gap-1 rounded-[min(var(--radius-md),12px)] px-2.5 text-[0.8rem] in-data-[slot=button-group]:rounded-lg has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-9 gap-1.5 px-2.5 has-data-[icon=inline-end]:pr-2 has-data-[icon=inline-start]:pl-2",
        icon: "size-8",
        "icon-xs":
          "size-6 rounded-[min(var(--radius-md),10px)] in-data-[slot=button-group]:rounded-lg [&_svg:not([class*='size-'])]:size-3",
        "icon-sm":
          "size-7 rounded-[min(var(--radius-md),12px)] in-data-[slot=button-group]:rounded-lg",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

Concrete pointers keyed to this block:

| Line | Content | Phase-10 action |
|---|---|---|
| `:8` | `focus-visible:ring-ring/50` in the **base string** | DS-05 — drop `/50`; UI-SPEC's full recipe is `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background` (note the shipped base uses `ring-3`, not `ring-2` — the planner must reconcile) |
| `:8` | `text-sm font-medium` | Renders at the theme's **emphasis** weight after UI-SPEC's `--font-weight-medium` aliasing. Zero edits here; visible change. |
| `:12` | `default: "bg-primary text-primary-foreground hover:bg-primary/80"` | D-21 — stays neutral. UI-SPEC changes only the hover to the `color-mix` form. |
| `:16` | `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` | **The already-shipped `color-mix` idiom the UI-SPEC says to reuse for `brand` and `default` hovers.** Confirmed present. Also the exact string that makes a naive `oklch` leak pattern false-positive (L14) — the pattern must require the `(`. |
| `:20` | `destructive: "bg-destructive/10 … hover:bg-destructive/20 …"` | The new failing pair (L16, UI-SPEC row 22). Hover flips to solid `--destructive-foreground`. |
| `:27` | `text-[0.8rem]` in `size: sm` | One of 4 tolerated rem sites (UI-SPEC Resolved Q2). Leak pattern is **px-only** — must not match this. |
| `:23-35` | sizes are `h-8 / h-6 / h-7 / h-9` | `touch: "h-11 …"` is a genuinely new step; insert it in the `size` map following `default`'s shape |

**Export shape to preserve** (`:44-67`) — `buttonVariants` is already exported, which is what makes the
DS-08/DS-09 unit test (`buttonVariants({ size: "touch" })`) possible with no source change:
```ts
export { Button, buttonVariants }
```

**Cross-check for the CVA change:** `tests/booking/partial-grant-notice.test.tsx` asserts a `className` does
*not* contain `bg-brand` (VALIDATION.md § Regression watch). Its header at `:17-20` explains why it asserts
"over the classes that actually PAINT" rather than the base string — read that before changing the base.

---

### 7. The 20 `<Button>` `bg-brand` conversions

**Analog:** `src/components/booking/book-cta.tsx:222` — verified verbatim:
```tsx
        className="w-full bg-brand text-brand-foreground hover:bg-brand/90"
```
→ becomes `variant="brand"` with the layout class retained (`className="w-full"`).

**Counter-analogs — the 9 that must NOT be converted.** All three shapes verified in the live tree:
```tsx
// src/components/availability/slot-picker.tsx:210  — a data-[state=on] Toggle recipe, not a Button
"data-[state=on]:border-transparent data-[state=on]:bg-brand data-[state=on]:text-brand-foreground data-[state=on]:hover:bg-brand/90",
// src/components/availability/slot-picker.tsx:245  — a soft-accent info panel
"flex items-start gap-2 rounded-lg border border-brand/30 bg-brand/10 px-3 py-2 text-sm text-foreground"
// src/components/availability/spots-left-chip.tsx:64 — a Badge tint
className={cn(CHIP_BASE, "border-brand/30 bg-brand/10 text-foreground")}
```

**Verified distribution of the 29 lines across 19 files** (matches UI-SPEC's list exactly):
`bookings/[id]/page.tsx` ×3 · `slot-picker.tsx` ×3 · `wizard.tsx` ×3 · `expired-approval-state.tsx` ×2 ·
`host/page.tsx` ×2 · `host/listings/page.tsx` ×2 · `bookings/page.tsx` ×2 · and ×1 each in
`search-bar.tsx`, `notification-item.tsx`, `rsvp-form.tsx`, `create-group-button.tsx`,
`reserve-actions.tsx`, `payment-reversed-state.tsx`, `hold-expired-state.tsx`, `booking-row.tsx`,
`book-cta.tsx`, `spots-left-chip.tsx`, `date-pass-picker.tsx`, `availability-calendar.tsx`.

---

### 8. DS-10 — the closed status vocabulary + icon map

**Analogs:** `src/components/booking/booking-status.ts` (the type layer) and
`src/components/booking/booking-status-badge.tsx` (the recipe layer). The repo already implements
"icon + text, never colour-only" — DS-10 changes the **tone treatment**, not the structure.

**The closed union + view type** (`booking-status.ts:16-45`):
```ts
/** The booking status as STORED in the DB (mirrors the booking_status pgEnum, schema.ts:497). */
export type BookingDbStatus =
  | "pending" | "confirmed" | "cancelled" | "declined"
  | "completed" | "requested" | "approved";

/** The presentation view for one display status: label (side-specific) + tone (drives the badge recipe)
 *  + the lucide icon name (every badge is icon + text, NEVER colour-only — 07-UI-SPEC § Accessibility). */
export type BookingStatusView = {
  label: string;
  tone: "muted" | "outline" | "success";
  icon: "CircleDashed" | "Hourglass" | "CalendarCheck" | "CheckCircle2" | "Check" | "XCircle" | "Ban";
};
```
DS-10's four tones (`neutral | positive | attention | soft-accent`) **replace** this `tone` union. Note the
existing union is `"muted" | "outline" | "success"` — a rename, and `derivePayoutLedgerView` already emits
`"attention"` (see `payout-state-badge.tsx:42`). The planner must reconcile the two tone vocabularies.

**The `Record<Status, {Icon, …}>` recipe map — the exact shape UI-SPEC asks for**
(`booking-status-badge.tsx:21-51`):
```ts
import type { LucideIcon } from "lucide-react";
import { Ban, CalendarCheck, Check, CheckCircle2, CircleDashed, Hourglass, XCircle } from "lucide-react";

import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type BadgeVariant = "secondary" | "outline";

// Per-status badge recipe: a distinct icon + (variant | success className). Keyed by DISPLAY STATUS (not
// tone) because completed, declined and cancelled all share the neutral "muted" tone yet must show
// different icons (Check vs XCircle vs Ban) — the same reason payout-state-badge keys by state.
const BADGE_RECIPES: Record<
  BookingDisplayStatus,
  { Icon: LucideIcon; variant?: BadgeVariant; className?: string }
> = {
  pending: { Icon: CircleDashed, variant: "secondary" },
  requested: { Icon: Hourglass, variant: "secondary" },
  approved: { Icon: CalendarCheck, variant: "outline" },
  // The one semantic-success surface (mirrors the Paid payout badge). Never a CTA colour.
  confirmed: { Icon: CheckCircle2, className: "border-transparent bg-success text-success-foreground" },
  completed: { Icon: Check, variant: "secondary", className: "text-muted-foreground" },
  declined: { Icon: XCircle, variant: "secondary", className: "text-muted-foreground" },
  cancelled: { Icon: Ban, variant: "secondary", className: "text-muted-foreground" },
};
```
**`:47` is the retiring pair** — `bg-success text-success-foreground` at 3.24:1. Its twin is
`payout-state-badge.tsx:34` (identical string, identical comment). Both become
`bg-muted text-foreground` + `text-success` on the icon per D-14.

**The already-correct "attention is an Alert, not a badge" branch** (`payout-state-badge.tsx:41-49`):
```tsx
  // Failed / needs-attention → the destructive Alert pattern (icon + text), NOT a badge (05-UI-SPEC).
  if (view.tone === "attention") {
    return (
      <Alert variant="destructive" className="w-fit border-destructive/40 px-2 py-1">
        <AlertTriangle className="size-4" aria-hidden="true" />
        <AlertDescription className="text-destructive">{view.label}</AlertDescription>
      </Alert>
    );
  }
```
UI-SPEC § Status Vocabulary keeps this ("genuine failure *messages* keep the destructive Alert pattern").

**Icon rendering convention to preserve** (`booking-status-badge.tsx:76-81`):
```tsx
    <Badge variant={variant} className={cn("gap-1", className)}>
      <Icon className="size-3" aria-hidden="true" />
      {view.label}
    </Badge>
```

---

### 9. `src/app/layout.tsx` — DS-14 metadata + D-07 provider mount

**Analog:** itself, plus `src/app/invite/[token]/page.tsx` for the metadata comment convention.

**Current file, verbatim and complete** — every line of it is touched:
```tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Create Next App",
  description: "Generated by create next app",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
```
(Real line numbers: fonts `:5-13`, metadata `:15-18`, `<html>` `:26-29`, `<body>` `:30`.)

**Facts confirmed for the planner:**
- `--font-geist-sans` / `--font-geist-mono` are already on `<html>` via `.variable` (`:28`). **DS-01's fix is
  entirely in `globals.css`; `layout.tsx`'s font setup needs no change** — matches RESEARCH § Code Examples.
- There is **no provider of any kind** in the tree today, and **`<Toaster />` is mounted in four separate
  layouts/pages**, not at the root: `(app)/layout.tsx:103`, `(host)/host/listings/page.tsx:77`,
  `(host)/host/listings/[id]/availability/page.tsx:140`, `(host)/host/listings/[id]/edit/wizard.tsx:586`.
  If the `ThemeProvider` mounts at the root but the Toasters stay where they are, all four still sit
  *under* it — no move required. Verify this before planning a Toaster relocation.

**Metadata-comment convention** (`invite/[token]/page.tsx:56-59`) — a JSDoc block stating *why* the metadata
is what it is, immediately above the export:
```ts
/**
 * The URL of this page CONTAINS the credential, so it must never be indexed and must never travel in a
 * `Referer` header. Both are one line each here and unfixable after a crawler has already been through.
 */
export const metadata: Metadata = {
```
Apply the same to `suppressHydrationWarning` — D-07 makes it load-bearing, and a bare attribute reads as
belt-and-braces to the next reader.

---

### 10. `src/app/globals.css` — the token contract

**Analog:** itself. Three blocks, all verified present:

**`@theme inline` (`:7-53`) — extend, never replace.** Contains the DS-01 cycle at `:10` and the already-
derived radius chain at `:46-52`:
```css
@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --font-sans: var(--font-sans);          /* :10 — THE CYCLE (DS-01) */
  --font-mono: var(--font-geist-mono);
  --font-heading: var(--font-sans);       /* :12 — D-20 keeps this seam */
  /* … 13 --color-sidebar-* / --color-chart-* entries (UI-SPEC removes all 13) … */
  --radius-sm: calc(var(--radius) * 0.6);
  --radius-md: calc(var(--radius) * 0.8);
  --radius-lg: var(--radius);
  --radius-xl: calc(var(--radius) * 1.4);
  --radius-2xl: calc(var(--radius) * 1.8);
  --radius-3xl: calc(var(--radius) * 2.2);
  --radius-4xl: calc(var(--radius) * 2.6);
}
```
Confirms CONTEXT § Reusable assets: per-theme radius is **one value**, not seven.

**`:root` (`:55-94`) — the values to correct, and the comment style to preserve** (`:71-76`):
```css
  --destructive: oklch(0.577 0.245 27.325);
  /* FitOut Coral — the single brand accent (10% slot). See 02-UI-SPEC.md § New Tokens to Add. */
  --brand: oklch(0.637 0.208 25);
  --brand-foreground: oklch(0.985 0 0);
  /* Semantic success (status only, never a CTA) — payouts-enabled / published badges. */
  --success: oklch(0.62 0.17 150);
  --success-foreground: oklch(0.985 0 0);
```
The existing convention is a one-line `/* … */` above each semantic group, citing the UI-SPEC. Keep it, and
add the derived-value citation (`AA_EPSILON`, the solved ratio) per D-12.

**`.dark` (`:96-133`) stays dormant** (D-03) — but note it also defines `--brand`/`--success`, so THEME-02's
key-set equality test must scope itself to the `[data-theme]` blocks, not "every custom-property block".

**`@layer base` (`:135-145`) — the focus-recipe and reduced-motion home:**
```css
@layer base {
  * {
    @apply border-border outline-ring/50;   /* :137 — the outline-ring/50 to fix (DS-05) */
  }
  body {
    @apply bg-background text-foreground;
  }
  html {
    @apply font-sans;
  }
}
```
`:143`'s `@apply font-sans` is what makes the DS-01 cycle render *nothing* — the fix at `:10` reaches every
screen through this one line.

**`@custom-variant dark (&:is(.dark *));`** at `:5` — leave it (RESEARCH § State of the Art confirms it does
not collide with `[data-theme]` blocks).

---

### 11. `src/components/ui/sonner.tsx` — THEME-01's second half

**Analog:** itself (`:1-12`), and it is the type-lie the security section calls out:
```tsx
"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
```
`:12`'s `as` cast is the exact discipline failure RESEARCH § V5 names ("A cast is what let `sonner.tsx:8`
ship a type lie"). Replace with the explicit map, not a wider cast.

**Keep unchanged** (`:31-38`) — the inline style block reads tokens through `var()`, so it re-skins for free:
```tsx
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
```

---

### 12. `src/app/dev/theme/page.tsx` — the preview route

**Analog:** `src/app/invite/[token]/page.tsx` — the repo's precedent for a route placed at the app root,
deliberately outside `(app)`/`(host)`, with a header comment that says *why* and forbids moving it.

**The "why it lives here" header convention** (`:6-13`):
```
// ── WHY IT LIVES AT THE ROOT, OUTSIDE (app)/(host) (RESEARCH Pitfall 5 / T-08-24) ────────────────────
// `(app)/layout.tsx` calls `auth.api.getSession` and REDIRECTS to /login when there is none. A public
// route placed inside that group would therefore bounce every signed-out invitee to a login form …
// Do not move this route under a route group, and do not add a `redirect` on a null session.
```
`/dev/theme` needs the same block for D-09: single route, not a `(dev)` group, and — critically — the same
reason it must sit at the root: **`(app)/layout.tsx` redirects to `/login` on a null session**, so a preview
page inside `(app)` would be unreachable to the reviewer and to Phase 11/17's screenshots.

**`notFound()` convention** — the repo calls it inline, bare, no message
(`bookings/[id]/page.tsx:141,172,194`):
```ts
  if (!userId) notFound();
  if (!bk || bk.bookerId !== userId) notFound();
  if (!RENDERABLE.includes(bk.status)) notFound();
```
D-09's guard is the same one-liner: `if (process.env.NODE_ENV === "production") notFound();`

**Page-component conventions** (`src/app/page.tsx:1-24`): a long header comment naming the requirement IDs
and the screen states, then module-level `const` fixtures above the default export:
```ts
// The demand-side front door (D-29) — the search / browse home at `/`, replacing the Next.js scaffold.
// …
// States (UI-SPEC § Screen contract): default city view (D-30) · populated grid + sort + Load more (D-32) …

import { db } from "@/lib/db";
// …
// Single-city launch (CLAUDE.md): the default browse header + cold-start copy names the launch city.
const LAUNCH_CITY = "Manila";
```
Note `src/app/page.tsx:122` carries a `text-[28px]` — this page is both the layout analog and one of the 10
files in the DS-02 cleanup.

**Only 2 files in the whole app export `metadata`** (`layout.tsx`, `invite/[token]/page.tsx`) — a `metadata`
export on `/dev/theme` would be net-new-but-conventional; a `robots: { index: false }` entry mirrors
`invite/[token]/page.tsx`'s noindex precedent.

---

### 13. Client-effect components (`theme-query-param.tsx`, `favicon-swap.tsx`)

**Analog:** `src/components/mode-switch.tsx` — the repo's cleanest small client component.

**Directive first, then a header comment, then imports** (`:1-28`):
```tsx
"use client";

// Airbnb-style booker/host mode switch (D-04).
//
// Flips the user between "Booking" and "Hosting" context. … This control just navigates between them
// — the REAL capability gate is the per-page server check in src/app/(host)/host/layout.tsx
// (middleware/UI are optimistic only).

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDownIcon } from "lucide-react";

import { activateHosting, activateBooking } from "@/app/actions/capability";
import { Button } from "@/components/ui/button";
```
Import ordering: React/Next → third-party → blank line → `@/` app imports. `"use client"` sits **above** the
comment block, not below it.

**Named export with an inline-typed props object** (`:30-39`):
```tsx
export function ModeSwitch({
  current, canBook, canHost,
}: {
  /** Which context the current surface represents. */
  current: "book" | "host";
  canBook: boolean;
  canHost: boolean;
}) {
```
`ThemeQueryParam` and `FaviconSwap` take no props and return `null` — but keep the named-export style
(the repo uses named exports for components; only page/layout files use `export default`).

**The "UI is optimistic, the real gate is elsewhere" comment** at `:6-8` is directly reusable for
`ThemeQueryParam`: the `?theme=` handler is a dev affordance, and the real production guard is the
`NODE_ENV` build-time constant.

---

### 14. `e2e/helpers/theme.ts` and the Playwright seam

**Analog:** `tests/helpers/` (naming/placement) + `e2e/public-listing.spec.ts` (spec conventions).
**No `e2e/helpers/` directory exists, and there is zero `addInitScript` usage anywhere.** This is net-new.

**Spec header convention to copy** (`e2e/public-listing.spec.ts:1-16`) — states the requirement ID, what is
green, what is asserted, and what is deliberately out of the assertion path:
```
// LIST-06 / D-13 — the PUBLIC listing detail page is reachable WITHOUT a session; …
//
// External-network bits (Leaflet/OSM tiles) are deliberately OUT of the assertion path — they render
// client-side and are covered by 02-HUMAN-UAT.md manual checks.
```

**Import + serial-mode conventions** (`:18-19`, `:34`):
```ts
import { test, expect } from "@playwright/test";
import { randomUUID } from "node:crypto";
…
test.describe.configure({ mode: "serial" });
```

**`playwright.config.ts` facts that constrain THEME-04's e2e option:** `testDir: "e2e"`, `fullyParallel: true`,
one `chromium` project, and a `webServer` running `npm run dev` at `http://localhost:3000` with
`reuseExistingServer`. A THEME-04 Playwright spec therefore **boots the dev server**, which is a very
different cost profile from the sub-second design gate — reinforcing RESEARCH Open Question 5's preference
for the compiled-CSS fallback if the Wave-0 jsdom spike fails.

⚠ `playwright.config.ts` has **no `expect.toHaveScreenshot` config and no snapshot dir** — consistent with
L18 (no VR baselines this phase). Do not add one.

---

### 15. `src/components/listing/listing-map.tsx` — the generated-module consumer

**Analog:** itself. The two hex literals and the SVG-string generation pattern the favicon generator mirrors:
```tsx
const BRAND_CORAL = "#E8484E"; // --brand (FitOut Coral), matches the UI-SPEC accent.   // :22
…
/** A coral teardrop pin as an inline-SVG divIcon — avoids Leaflet's bundler-broken default marker
 *  images (no network fetch, no missing-icon squares) and matches the brand accent. */
function coralPin(): L.DivIcon {
  return L.divIcon({
    className: "listing-map-pin", // unstyled wrapper; the SVG carries all visuals
    html: `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="40" viewBox="0 0 28 40" aria-hidden="true">
      <path d="M14 0C6.3 0 0 6.1 0 13.6 0 23.8 14 40 14 40s14-16.2 14-26.4C28 6.1 21.7 0 14 0z" fill="${BRAND_CORAL}"/>
      <circle cx="14" cy="13.5" r="5" fill="#fff"/>
    </svg>`,
```
`:22` and `:34` are **the only two raw hex under the gate tree** (verified). The template-literal-SVG-with-
interpolated-token idiom at `:32-35` is the direct analog for `scripts/generate-design-tokens.mjs`'s
`icon-court.svg` / `icon-grove.svg` emission — and confirms Pitfall 10's point: this SVG uses a `<path>`, not
`<text>`, so the favicon letterform should too.

**This file is a `"use client"` component under `src/components/**` — inside the gate tree.** After the edit
it must import from `@/lib/design/tokens.generated`, which sits **outside** the tree (L15).

---

### 16. `package.json` — the build-gate wiring

**Analog:** itself (`:5-23`), verbatim:
```json
  "scripts": {
    "dev": "next dev",
    "dev:inngest": "npx inngest-cli@latest dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "db:up": "docker compose up -d db",
    "db:generate": "drizzle-kit generate",
    "db:migrate": "drizzle-kit migrate",
    "db:seed": "tsx scripts/seed.ts",
    "db:test:setup": "tsx scripts/db-test-setup.ts",
    "db:studio": "drizzle-kit studio",
    "ops:alerts": "tsx scripts/ops-alerts.ts list",
    "ops:alerts:resolve": "tsx scripts/ops-alerts.ts resolve",
    "ops:alerts:history": "tsx scripts/ops-alerts.ts history",
    "test": "vitest run",
    "test:e2e": "playwright test",
    "postinstall": "node scripts/patch-kysely-adapter.mjs"
  },
```
Conventions: `namespace:verb` naming (`db:*`, `ops:*`, `test:*`) → `test:design` fits. `.ts` scripts run via
`tsx`, `.mjs` via plain `node` → `"design:tokens": "node scripts/generate-design-tokens.mjs"`.
**`"build": "next build"` today runs neither lint nor tests — L1 confirmed.**

---

### 17. `eslint.config.mjs` — ⚠ no analog for the rule itself

**Analog:** itself for the flat-config *shape* only. Complete file (23 lines):
```js
import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    ".next/**", "out/**", "build/**", "next-env.d.ts",
    // Generated build output anywhere in the tree, plus stale git worktrees: the default
    // `.next/**` only matches the ROOT .next, so a nested `.claude/worktrees/<name>/.next`
    // full of generated Turbopack JS would otherwise flood lint with thousands of errors.
    ".claude/worktrees/**", "**/.next/**",
  ]),
]);

export default eslintConfig;
```
**There is no `plugins:` key, no `rules:` key, no `no-restricted-syntax`, and no custom rule anywhere in the
repo.** The inline flat-config plugin (RESEARCH Pattern 7) is entirely net-new — the only thing to copy here
is (a) the `defineConfig([...])` array shape, (b) that spread configs come first and overrides after, and
(c) the comment-above-each-entry convention.

**Existing escape-hatch precedent** for the leak rule's disable comment
(`src/components/listing/listing-card.tsx:234` and 4 others):
```tsx
          // eslint-disable-next-line @next/next/no-img-element
```
The leak rule's exemption should use the same `eslint-disable-next-line fitout/no-raw-design-value` form
rather than inventing a `/* design-token-exempt */` marker — one mechanism, already understood in this repo.

---

### 18. `tests/design/theme-provider.test.tsx` — the jsdom render test

**Analog:** `tests/booking/partial-grant-notice.test.tsx`

**The environment pragma must be line 1, above the header comment** (`:1-2`):
```tsx
// @vitest-environment jsdom

// OC-07 — the reduction notice, as an executable contract (09-UI-SPEC § 3, copy rule O6).
```

**Imports + `vi.hoisted` + next-module mocks** (`:35-55`):
```tsx
import * as React from "react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { render, screen, cleanup, within } from "@testing-library/react";

vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({
  notFound: () => { throw new Error("NEXT_NOT_FOUND"); },
  redirect: (to: string) => { throw new Error(`NEXT_REDIRECT:${to}`); },
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));
```
15 `.test.tsx` files in `tests/` already use this pragma; `@vitejs/plugin-react` is already wired in
`vitest.config.ts:29` (and must be carried into `vitest.design.config.ts` if any design test is `.tsx`).

**Assert over "the classes that actually PAINT"** (`:17-20`) — the lesson to carry into any CVA test:
```
//   (3) IT IS NOT AN ERROR. … Asserted over the classes that actually PAINT — the shipped Button base
//   carries `aria-invalid:`-prefixed alarm utilities that can never apply here, and counting those
//   would make the gate unpassable for every button in the repo while proving nothing about the colour
//   a booker sees (the 09-11 lesson).
```

---

## Shared Patterns

### A. The header comment is the deliverable

**Source:** `tests/use-server-exports.test.ts:1-102` · `vitest.config.ts:5-27` ·
`src/app/invite/[token]/page.tsx:1-39` · `tests/global-setup.ts:1-21`
**Apply to:** every net-new file in this phase.

Every non-trivial file in this repo opens with a comment block that states (1) the requirement/decision ID,
(2) what went wrong that made the file necessary, (3) what it covers, and (4) **what it does not cover**.
The `NOT COVERED — real blind spots, listed so the next reader under-trusts this file rather than
over-trusts it` heading (`use-server-exports.test.ts:89`) is the house style for section (4) and is exactly
what RESEARCH Pattern 9 asks for in `contrast-pairs.ts` and `pair-drift.test.ts`.

### B. Decision-ID citation in code

**Source:** `booking-status.ts:1` (`MANAGE-02 · D-79 / D-102`) · `listing-vocab.ts:1` (`D-08 locked`) ·
`globals.css:71` (`See 02-UI-SPEC.md § New Tokens to Add`) · `mode-switch.tsx:3` (`(D-04)`)
**Apply to:** all new design-system files.

Every design token, tone and gate in this phase traces to a `D-NN` in `10-CONTEXT.md`. The repo convention is
to cite the ID inline at the point of the decision, not in a separate doc.

### C. Windows path normalisation in any file-walking code

**Source:** `tests/use-server-exports.test.ts:302`
```ts
const label = relative(process.cwd(), file).split("\\").join("/");
```
**Apply to:** `leak.test.ts`, `dark-scope.test.ts`, `pair-drift.test.ts`, `focus-recipe.test.ts`,
`scaffold-residue.test.ts`, `scripts/generate-design-tokens.mjs`.
Every scope decision in this phase is a path-prefix test (`src/components/ui/` in vs out). On this box
`path.relative` emits backslashes.

### D. Positive control / guard-the-guard on every static gate

**Source:** `tests/use-server-exports.test.ts:312-318` · `tests/security/rate-limit-bound.test.ts:68-71`
**Apply to:** all five source-tree guards.
An empty-violations assertion passes just as happily against a scanner that visited zero files. Every gate
needs a companion `it()` asserting the scan found the files it is supposed to be policing.

### E. `as const` inventory → derived union → derived map

**Source:** `src/lib/listing-vocab.ts:18-42`
**Apply to:** `contrast-pairs.ts`, the DS-10 status-tone module, `THEMES` in `theme-provider.tsx`.
Note D-08's rationale ("so the values never drift") is the same argument D-16 makes for the shared leak
pattern list and D-18 makes for the generated token module.

### F. Never `as` on external input

**Source:** the anti-pattern lives at `src/components/ui/sonner.tsx:12` (`theme as ToasterProps["theme"]`);
the correct discipline is at `src/app/page.tsx:15-16` (`searchParamsSchema` re-validation with a comment
naming the threat ID).
**Apply to:** `theme-query-param.tsx` (`.includes()` allowlist, per RESEARCH § V5) and `sonner.tsx` itself.

### G. `cn()` for all className composition

**Source:** `src/lib/utils.ts` via `booking-status-badge.tsx:24,77` · `payout-state-badge.tsx:15,53`
```tsx
import { cn } from "@/lib/utils";
…
<Badge variant={variant} className={cn("gap-1", className)}>
```
**Apply to:** every component edit in Wave 3 and every fixture in `/dev/theme`.

---

## No Analog Found

The planner should use `10-RESEARCH.md` § Code Examples and § Architecture Patterns for these, and should
budget review time accordingly — each is a new mechanism in this codebase.

| File / mechanism | Role | Data flow | Reason |
|---|---|---|---|
| `config/design-leak-patterns.mjs` | config | transform | **The `config/` directory does not exist.** Nothing in the repo is shared between an ESM config file and a TS test. |
| ESLint inline flat-config plugin (in `eslint.config.mjs`) | config | static analysis | `eslint.config.mjs` has no `plugins:`, no `rules:`, no `no-restricted-syntax`. Zero custom rules exist. |
| `src/lib/design/tokens.generated.ts` | model (generated, committed) | — | **No generated-and-committed artifact exists anywhere** — grep for `DO NOT EDIT` / `@generated` / `AUTO-GENERATED` across `src/` and `scripts/` returns nothing. |
| `tests/design/helpers/compile-css.ts` | test-helper | file-I/O | No test compiles CSS. `postcss.config.mjs` is 7 lines and has never been driven programmatically. |
| `tests/design/font-cycle.test.ts` | test | transform | Same — no compile-and-assert test exists. |
| `src/components/theme/theme-provider.tsx` | provider (client) | event-driven | **No React context provider is mounted anywhere in the app.** `next-themes` is installed and never imported except by `ui/sonner.tsx:3`. |
| `e2e/helpers/theme.ts` | test-helper | — | `e2e/helpers/` does not exist; all 9 e2e specs are self-contained. No `addInitScript` usage anywhere. |
| `src/app/dev/theme/page.tsx` (as an *internal/dev* surface) | route | request-response | **There is no `src/app/dev/**` and no dev-only route of any kind.** `invite/[token]` is the closest *structural* analog (root-level, outside route groups) but is a production surface. |
| `public/icon-court.svg` / `icon-grove.svg` + `<link rel=icon>` swap | asset + client effect | — | `public/` contains only the 5 unreferenced scaffold SVGs. No icon generation, no `<link>` manipulation. |

---

## Measurement Verification

Every figure quoted by CONTEXT.md, RESEARCH.md and UI-SPEC.md, re-measured against the live tree on
2026-08-11. **All agree. No disagreements to flag.**

| Claim | Source | Measured | Verdict |
|---|---|---|---|
| 29 `bg-brand` lines across 19 files | RESEARCH L6, UI-SPEC | 29 lines, 19 files | ✅ |
| 20 of them on a `<Button>`, 9 not | UI-SPEC § 29/20/9 | Non-button shapes confirmed at `slot-picker.tsx:210,245,264`, `spots-left-chip.tsx:64`, `availability-calendar.tsx:236`, `date-pass-picker.tsx:262`, `notification-item.tsx:264`, `wizard.tsx:602,603` = 9 | ✅ |
| 10 app-code `dark:` across 5 files | CONTEXT, RESEARCH #10 | `(auth)/layout.tsx` 2 · `(auth)/login/page.tsx` 2 · `(auth)/signup/page.tsx` 3 · `(host)/host/layout.tsx` 1 · `bookings-tabs.tsx` 2 = **10 / 5 files** | ✅ |
| 56 vendored `dark:` across 14 files | CONTEXT, RESEARCH #10 | **56 occurrences, 14 files** | ✅ |
| 13 `focus-visible:ring-ring/50`, 11 vendored | RESEARCH #12, UI-SPEC | 13 across 13 files; 11 in `src/components/ui/` (badge, button, checkbox, input, radio-group, scroll-area, select, switch, tabs, textarea, toggle), 2 app (`(host)/host/bookings/page.tsx`, `bookings-tabs.tsx`) | ✅ |
| `outline-ring/50` in `globals.css:137` | RESEARCH #12 | present at `:137` | ✅ |
| 399 type-scale call sites | UI-SPEC § built-in ladder | xs 52 · sm 265 · base 17 · lg 13 · xl 32 · 2xl 20 = **399** | ✅ |
| 98 `font-semibold` / 70 `font-medium` / 12 `font-normal` / 34 `tracking-tight` / 24 `leading-tight` | RESEARCH #15, L12 | 98 / 70 / 12 / 34 / 24 | ✅ |
| 14 `text-[NNpx]` across 10 files (12×28px, 1×10px, 1×11px) | CONTEXT, RESEARCH #8 | 12 × `text-[28px]`, `booking-row.tsx:69` `text-[10px]`, `notification-bell.tsx:117` `text-[11px]` = **14 / 10 files** | ✅ |
| 4 × `text-[0.8rem]` vendored, tolerated | RESEARCH #8b, UI-SPEC Q2 | `button.tsx:27`, `calendar.tsx:93`, `calendar.tsx:102`, `toggle.tsx:20` | ✅ |
| 2 raw hex under the gate tree | RESEARCH #6 | `listing-map.tsx:22` `#E8484E`, `listing-map.tsx:34` `#fff` — **and nothing else** | ✅ |
| 19 app palette classes across 6 files + 1 vendored | RESEARCH L7 | 11 numbered across 5 files + 8 white/black across 3 files (`(auth)/layout.tsx` 2, `signup/page.tsx` 6) = **19 across 6 distinct files**; vendored: `ui/dialog.tsx:42` `bg-black` = 1. **Total 20 / 7 files** — exactly L7 | ✅ (CONTEXT's "19 across 5" is the undercount L7 already flagged) |
| Shadows: none×5, xs×1, sm×3, md×4, lg×1 = 14 | RESEARCH #13 | 5 / 1 / 3 / 4 / 1 = **14** | ✅ |
| Z: z-0×2, z-10×12, z-50×9 = 23 | RESEARCH #14 | 2 / 12 / 9 = **23** | ✅ |
| 5 starter SVGs, all unreferenced | RESEARCH #4 | `public/{file,globe,next,vercel,window}.svg` present; **zero references** in `src/` (the one `next.svg` grep hit is `calendar.tsx:35`'s `rdp-button\_next>svg` — a false positive) | ✅ |
| `src/app/favicon.ico` present | RESEARCH #4 | present | ✅ |
| 30 vendored primitives | UI-SPEC § Design System | `ls src/components/ui/` = **30** | ✅ |
| No CI | RESEARCH L2 | `.github/` does not exist | ✅ |
| `"build": "next build"` runs no lint/test | RESEARCH L1 | `package.json:8` | ✅ |
| `vitest.config.ts` has `globalSetup` | RESEARCH L8 | `:59` `globalSetup: ["tests/global-setup.ts"]` | ✅ |
| `@theme inline` at `globals.css:7` | UI-SPEC | `:7` | ✅ |
| `--font-sans: var(--font-sans)` cycle at `globals.css:10` | RESEARCH #1 | `:10` | ✅ |
| `layout.tsx` title = "Create Next App" | RESEARCH #2 | `:16` | ✅ |
| No `suppressHydrationWarning` | RESEARCH #3 | absent (`:26-29`) | ✅ |
| `button.tsx:16` `color-mix` idiom ships today | UI-SPEC § variant recipes | `:16` `hover:bg-[color-mix(in_oklch,var(--secondary),var(--foreground)_5%)]` | ✅ |
| Zero `prefers-reduced-motion` | RESEARCH #16 | zero | ✅ |
| `sonner.tsx:8` `useTheme()` + `:12` cast | RESEARCH #18 | `:8` `const { theme = "system" } = useTheme()`; `:12` `theme as ToasterProps["theme"]` | ✅ |

**One item the planner should note that no upstream doc states:** `<Toaster />` is mounted at **four**
separate sites (`(app)/layout.tsx:103`, `(host)/host/listings/page.tsx:77`,
`(host)/host/listings/[id]/availability/page.tsx:140`, `(host)/host/listings/[id]/edit/wizard.tsx:586`),
not once at the root. All four sit under `src/app/layout.tsx`, so a root `ThemeProvider` covers them — but a
plan task written as "fix the Toaster" must name all four call sites or, better, note that the fix is inside
`ui/sonner.tsx` and therefore reaches all four with one edit.

---

## Metadata

**Analog search scope:** `src/app/**`, `src/components/**`, `src/lib/**`, `tests/**`, `e2e/**`,
`scripts/**`, `public/**`, and every root-level config (`vitest.config.ts`, `eslint.config.mjs`,
`playwright.config.ts`, `postcss.config.mjs`, `package.json`, `tsconfig.json`, `components.json`).
**Files scanned:** full-tree greps over ~250 source files; 18 files read in full or in targeted ranges.
**Pattern extraction date:** 2026-08-11
