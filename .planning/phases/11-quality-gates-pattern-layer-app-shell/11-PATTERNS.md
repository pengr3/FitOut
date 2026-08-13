# Phase 11: Quality Gates, Pattern Layer & App Shell - Pattern Map

**Mapped:** 2026-08-13
**Files analyzed:** 78 new / modified files across 13 families
**Analogs found:** 62 with an in-repo analog / 78 (16 have none — § No Analog Found)

> **How to read this.** Every row names a real file at a real line. Where a family has one shape
> repeated N times (18 × `loading.tsx`), the family is mapped once and the per-file variance is
> stated. Where **no** analog exists, that is said outright rather than papered over with a
> plausible-looking one — inventing an analog is how a pattern layer becomes a junk drawer, and two
> of this phase's biggest families (`error.tsx`, `opengraph-image.tsx`) genuinely have none.

---

## File Classification

### A. CI (new — created from nothing)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `.github/workflows/ci.yml` | config | batch | **none — no CI has ever existed here** | none |
| `.github/workflows/baselines.yml` (or a `workflow_dispatch` job in `ci.yml`) | config | batch | **none** | none |

### B. Tooling config (modified)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `playwright.config.ts` | config | request-response | itself (31 lines, one `chromium` project) | self |
| `package.json` (exact-pin `@playwright/test`) | config | — | `package.json` `scripts.build` chain | self |
| `.gitignore` (+`*-win32.png`, `*-darwin.png`) | config | — | `.gitignore` § "typescript" / § "testing" blocks | self |

### C. Typed inventory modules (`src/lib/design/**`, `src/lib/**`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/design/measurements.ts` | config/inventory | — | `src/lib/design/status-tones.ts` | exact |
| `src/lib/design/selector-contract.ts` (D-31) | config/inventory | — | `src/lib/design/status-tones.ts` + `contrast-pairs.ts` | exact |
| `src/lib/design/contrast-pairs.ts` (+2 pairs, +3 exclusions) | config/inventory | — | itself, lines 118+ | self |
| `src/lib/site.ts` (`SUPPORT_EMAIL`) | config | — | `src/lib/payments/config.ts` (named-constant idiom) | role-match |
| `src/lib/nav.ts` (host drawer link data) | config/inventory | — | `src/lib/listing-vocab.ts` / `status-tones.ts` | role-match |

### D. DB-free gate tests (`tests/design/**`, ~14 new)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/design/server-only-guards.test.ts` (D-34) | test (AST) | batch | **`tests/use-server-exports.test.ts`** | exact |
| `tests/design/selector-contract.test.ts` (D-31/D-32) | test (AST + source scan) | batch | `tests/use-server-exports.test.ts` + `tests/design/leak.test.ts:211-249` | exact |
| `tests/design/loading-coverage.test.ts` (STATE-01, async-default rule) | test (AST) | batch | `tests/use-server-exports.test.ts` (`hasUseServerDirective` → `isAsyncDefaultExport`) | exact |
| `tests/design/skeleton-measurements.test.ts` (AC#16) | test (source scan) | batch | `tests/design/leak.test.ts` (per-file literal scan) | exact |
| `tests/design/skeleton-a11y.test.tsx` (AC#18) | test (jsdom render) | batch | `tests/design/theme-nesting-render.test.tsx` (the `// @vitest-environment jsdom` pragma) | exact |
| `tests/design/error-boundaries.test.ts` (AC#19) | test (AST) | batch | `tests/use-server-exports.test.ts` | exact |
| `tests/design/global-error.test.ts` (AC#21) | test (source scan) | batch | `tests/design/scaffold-residue.test.ts` (raw-source structural assertions) | exact |
| `tests/design/invite-notfound-parity.test.ts` (AC#22) | test (import equality) | batch | `tests/design/status-vocab.test.ts` (pins values by import) | role-match |
| `tests/design/empty-state-adoption.test.ts` (AC#23) | test (source scan) | batch | `tests/design/scaffold-residue.test.ts` (asserts an absence) | exact |
| `tests/design/site-contacts.test.ts` (D-26, **inverted**) | test (source scan) | batch | `tests/design/scaffold-residue.test.ts` | exact |
| `tests/design/legal-copy.test.ts` (AC#9/#10) | test (source scan) | batch | `tests/design/scaffold-residue.test.ts` | exact |
| `tests/design/og-routes.test.ts` (AC#12/#13/#14) | test (AST) | batch | `tests/use-server-exports.test.ts` | exact |
| `tests/design/sheet-absent.test.ts` (AC#26/#27/#28) | test (source scan) | batch | `tests/design/elevation-z.test.ts` (the `shadow-sticky` zero-inventory precedent) | exact |
| `tests/design/gitignore-baselines.test.ts` (D-30) | test (repo-config + git) | batch | `tests/design/scaffold-residue.test.ts` (nearest); **no test shells out to `git` today** | partial |
| `tests/design/sticky-offset.test.ts` (the `lg:sticky` count) | test (source scan) | batch | `tests/design/leak.test.ts` | exact |

### E. DB gate tests (`tests/availability/**`)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `tests/availability/open-capacity-exclude.test.ts` (extend the catalog assertion, D-33) | test (integration) | CRUD | **itself, lines 139-153** | self |
| The D-33 hand-run mutation record (header block on the extended spec) | doc-in-code | — | `tests/use-server-exports.test.ts:25-62` + `e2e/scroll-area-overflow.spec.ts:59-109` | exact |

### F. E2E / Playwright

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `e2e/price-parity.spec.ts` (D-35) | test (e2e, self-seeding) | CRUD | **`e2e/search-and-book.spec.ts`** | exact |
| `e2e/visual/*.spec.ts` (the `visual` project) | test (e2e, screenshot) | request-response | `e2e/reduced-motion.spec.ts` / `scroll-area-overflow.spec.ts` (the `/dev/theme` DB-free driver) | role-match |
| `e2e/visual/freeze.css` | config | — | **none** | none |
| `e2e/overflow-320.spec.ts` (RESP-01, AC#29) | test (e2e, measurement) | request-response | `e2e/scroll-area-overflow.spec.ts:143-223` | role-match |
| `e2e/shell.spec.ts` (AC#2/#3/#4/#5) | test (e2e, measurement) | request-response | `e2e/scroll-area-overflow.spec.ts` (`page.evaluate` + `boundingBox`) | role-match |

### G. GATE-05 module surgery

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/lib/payments/fees.ts` (**new — split out of `config.ts`**) | config/constants | — | `src/lib/payments/config.ts:55-67` (the three rows that move) | exact |
| `src/lib/payments/config.ts` (14 exports stay, 3 leave, no guard) | config/constants | — | self | self |
| `src/lib/payments/service-fee.ts` (+`server-only`) | utility (pure compute) | transform | `src/lib/booking/all-in-rate.ts:18-19` (the "pure/isomorphic" header that must be **rewritten**) | self |
| `src/lib/booking/all-in-rate.ts` (+`server-only`) | utility (pure compute) | transform | self | self |
| `src/lib/booking/pricing.ts` (+`server-only`) | utility (pure compute) | transform | self | self |
| `src/lib/availability/{slots,read-model,units}.ts` (+`server-only`, computing modules only) | utility | transform | self | self |
| `src/components/listing/listing-card.tsx` (violation #1) | component | request-response | **`src/components/search/search-result-card.tsx`** | exact |
| `src/components/availability/availability-calendar.tsx` (violation #2, lines 346 + 411) | component | request-response | `src/components/search/search-result-card.tsx:122-139` | partial |

### H. App Router state files

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| 18 × `loading.tsx` | route (state) | request-response | **`src/app/(app)/bookings/loading.tsx`** (+ `(host)/host/listings/loading.tsx` for the grid shape) | exact |
| 5 × `error.tsx` | route (state, `"use client"`) | event-driven | **NONE — zero error boundaries exist in this repo** | none |
| 1 × `src/app/global-error.tsx` | route (state, `"use client"`) | event-driven | **NONE**; only `src/lib/design/tokens.generated.ts` supplies its colour mechanism | none |
| 3 × `not-found.tsx` | route (state) | request-response | **NONE**; copy/oracle source is `src/app/invite/[token]/page.tsx:71-72` | none |

### I. Shell restructure (the riskiest edits)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(app)/layout.tsx` (Suspense split) | layout | request-response | **itself** — the split must preserve lines 28-31 and 54-68 exactly | self |
| `src/app/(host)/host/layout.tsx` (Suspense split) | layout | request-response | **itself** — lines 32-45, 49-54, 69-83 | self |
| `src/app/(auth)/layout.tsx` (remove the duplicate wordmark) | layout | request-response | self, lines 24-31 | self |
| `src/app/listings/[id]/page.tsx:346` (`lg:top-8` → `lg:top-20`) | route | request-response | self | self |

### J. The pattern layer (`src/components/patterns/**` — the directory does not exist yet)

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `patterns/result-card.tsx` | component (RSC) | request-response | **`src/components/search/search-result-card.tsx:166-276`** | exact |
| `patterns/row-card.tsx` | component (RSC) | request-response | **`src/components/booking/booking-row.tsx:58-99`** | exact |
| `patterns/panel-card.tsx` | component (RSC) | request-response | `src/components/ui/card.tsx:5-93` (`Card`/`CardFooter`) | role-match |
| `patterns/empty-state.tsx` | component (RSC) | request-response | **`src/components/search/search-results.tsx:201-215`** (shell A — the geometry that wins) | exact |
| `patterns/error-state.tsx` | component (`"use client"`) | event-driven | `src/components/search/search-results.tsx:169-181` | exact |
| `patterns/card-grid-skeleton.tsx` | component (RSC) | — | `src/app/(host)/host/listings/loading.tsx:10-18` | exact |
| `patterns/row-list-skeleton.tsx` | component (RSC) | — | `src/app/(app)/bookings/loading.tsx:21-25` | exact |
| `patterns/panel-skeleton.tsx` | component (RSC) | — | `src/components/ui/skeleton.tsx` + `bookings/loading.tsx:18` | role-match |
| `patterns/page-header.tsx` | component (RSC) | — | `src/app/(app)/bookings/loading.tsx:12-15` (the shipped `h1` + lede shape) | role-match |
| `patterns/site-chrome.tsx` | component (partial client) | — | **`src/app/(host)/host/layout.tsx:87-132`** (the widest of the three headers) | exact |
| `patterns/site-footer.tsx` | component (RSC) | — | **none** (no footer exists app-wide) | none |
| `patterns/responsive-dialog.tsx` | component (`"use client"`) | event-driven | `src/components/listing/listing-card.tsx:31-41` (the vendored-`Dialog` composition idiom) | role-match |

### K. Legal routes

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(legal)/layout.tsx` | layout | request-response | `src/app/(auth)/layout.tsx` (a group layout that only supplies a container) | role-match |
| `src/app/(legal)/terms/page.tsx`, `.../privacy/page.tsx` | route | request-response | **none — no long-form prose surface exists**; container idiom from `invite/[token]/page.tsx:83-86` | partial |

### L. Share / meta

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/opengraph-image.tsx`, `listings/[id]/opengraph-image.tsx`, `invite/[token]/opengraph-image.tsx` | route (image) | transform | **NONE — zero `next/og` routes, zero `opengraph-image.*` files exist** | none |
| `listings/[id]/page.tsx` + `invite/[token]/page.tsx` → `generateMetadata` | route (metadata) | request-response | **NONE — zero `generateMetadata` exports exist**; nearest is the static `metadata` at `src/app/layout.tsx:104-108` and `invite/[token]/page.tsx:58-64` | partial |

### M. Dev surface

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/dev/theme/page.tsx` (+ sections 10-14) | route | — | **itself** — `Section` helper at lines 139-162, sections 1-9 already rendered | self |

---

## Pattern Assignments

### D. Design gate tests — the single most-copied analog in the phase

**Analog: `tests/use-server-exports.test.ts`.** Every new `tests/design/**` gate copies **four** things
from it. `11-CONTEXT.md` names two; there are four, and the last two are what stop a new gate being
vacuous.

**1. The OBSERVED RED header block** (lines 25-62) — the exact format D-30, D-33 and D-36 must follow:

```ts
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// OBSERVED RED. Written and run BEFORE any source change (HEAD = b0ce3bc, `git status --short -- src/`
// empty), 7 August 2026. `npx vitest run tests/use-server-exports.test.ts`, exit code 1. Observed
// output, VERBATIM (its `367|` line pointer is as-run, i.e. before this block replaced the
// placeholder that stood here while the run was taken, so it now sits a few lines lower):
//
//    ❯ tests/use-server-exports.test.ts (4 tests | 1 failed) 20ms
//        × every "use server" module in src/ exports only async functions 13ms
//   …
//   + [
//   +   "src/app/actions/avatar.ts:25 exports AVATAR_MAX_BYTES — not an async function: `5 * 1024 * 1024`",
//   +   "src/app/actions/avatar.ts:31 exports avatarFileSchema — not an async function: `z`",
//   + ]
//   …
// Both offenders named, at the right lines, and NOTHING else — the other 15 real `"use server"`
// modules in src/ came back clean, so this is not a scanner that fails on everything. […]
// A guard that has never been watched failing is not a guard, so that run is
// recorded here rather than asserted from memory.
```

Load-bearing elements the planner must require of every OBSERVED RED in this phase: **the HEAD sha
and a clean `git status`**, **the exact command**, **the exit code**, **the verbatim output**, and a
sentence stating *what did **not** fail* (proof the gate is not a scanner that fails on everything).
The same convention exists in e2e form at `e2e/scroll-area-overflow.spec.ts:59-109`, which adds a
before/after measurement table and a **GREEN RUN** line — copy that variant for GATE-01's
few-pixel-shift proof.

**2. AST scanning, never grep** (lines 104-151):

```ts
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

const SRC_DIR = resolve(process.cwd(), "src");

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

function parse(fileName: string, text: string): ts.SourceFile {
  return ts.createSourceFile(
    fileName, text, ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    fileName.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
}

/** True only when the directive sits in the module's DIRECTIVE PROLOGUE. */
function hasUseServerDirective(sf: ts.SourceFile): boolean {
  for (const stmt of sf.statements) {
    const isDirective = ts.isExpressionStatement(stmt) && ts.isStringLiteral(stmt.expression);
    if (!isDirective) return false;          // prologue is over
    if ((stmt.expression as ts.StringLiteral).text === "use server") return true;
  }
  return false;
}
```

> **For D-34's guard-presence test the shape changes but the mechanism does not.** `import
> "server-only"` is an `ImportDeclaration` with **no import clause** and a `moduleSpecifier` of
> `"server-only"` — not a directive-prologue string literal. The predicate is
> `ts.isImportDeclaration(stmt) && !stmt.importClause && (stmt.moduleSpecifier as ts.StringLiteral).text === "server-only"`.
> **This is why grep is banned here specifically:** research measured that a naive
> `grep -rn "server-only" src/` returns **6 hits across 5 files and every one is a comment** — the
> real count of `import "server-only"` statements is **zero**. A grep-based guard would pass on prose
> today and would keep passing after every guard was deleted.

**3. The guard-the-guard assertion** (lines 315-318) — this is the anti-vacuity clause, and every new
gate needs its own:

```ts
// Guard-the-guard: if the scanner silently stopped finding server modules (a moved directory, a
// broken directive check), the real assertion below would pass vacuously — which is the exact
// failure mode this whole file was written to prevent.
it("finds the server-action modules it is supposed to be policing", () => {
  expect(serverModules.length).toBeGreaterThan(10);
  expect(serverModules).toContain("src/app/actions/avatar.ts");
});
```

**4. Both-directions self-tests on synthetic fixtures** (lines 320-369) — assert what the rule
**flags** *and* what it **exempts**, against strings never written to disk:

```ts
it("does not mistake a comment or a string for the directive", () => {
  const commentOnly = parse("fake-comment.ts",
    '// Pure/isomorphic: no "use client"/"use server" directive here.\nexport const X = 1;\n');
  expect(hasUseServerDirective(commentOnly)).toBe(false);
  const real = parse("fake-real.ts", '"use server";\nexport const N = 1;\n');
  expect(hasUseServerDirective(real)).toBe(true);
});
```

`tests/design/infra.test.ts:5-9` states the principle in one sentence the planner can quote:
*"A pattern list proven only against true positives is indistinguishable from one that matches
everything, and a pattern that silently matches nothing is a gate that is permanently green."*

**5. The "NOT COVERED" footer** (lines 89-102) — every gate in this repo ends its header with an
explicit blind-spot list *"so the next reader under-trusts this file rather than over-trusts it."*

---

**Analog for the *home* of every new gate: `vitest.design.config.ts`.** Its header is a hard
constraint, not commentary (lines 17-22):

```ts
// THERE IS NO `globalSetup` AND NO `setupFiles` HERE, BY DESIGN.
//
//   Those two keys are exactly what makes `vitest.config.ts` require Docker. Adding either one to
//   this file — even "just to share a helper" — silently reintroduces the Docker dependency and
//   breaks the DB-free guarantee this config exists to provide. If a design test ever needs a
//   database, it is not a design test.
```

```ts
export default defineConfig({
  plugins: [react()],
  resolve: { alias: { "@": resolve(__dirname, "./src") } },
  test: {
    globals: true,
    environment: "node",
    include: ["tests/design/**/*.test.ts", "tests/design/**/*.test.tsx"],
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
  },
});
```

Two consequences the planner must carry: (a) **the `.tsx` gate** (`skeleton-a11y`) must use the
per-file pragma `// @vitest-environment jsdom` — the config stays `node`; (b) `vitest.config.ts`
carries a matching `exclude: ["tests/design/**"]`, so a new design `.tsx` file lands in exactly one
config. Both halves are load-bearing.

---

**Analog for the raw-source scanners** (`skeleton-measurements`, `legal-copy`, `empty-state-adoption`,
`site-contacts`, `global-error`): `tests/design/leak.test.ts:211-249`, which walks string literals via
AST so a class name inside a comment cannot be mistaken for a call site:

```ts
function scanText(path: string, text: string): Violation[] {
  const lines = text.split(/\r?\n/);
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const violations: Violation[] = [];
  const visit = (node: ts.Node): void => {
    let chunk: string | null = null;
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) chunk = node.text;
    else if (ts.isTemplateHead(node) || ts.isTemplateMiddle(node) || ts.isTemplateTail(node)) chunk = node.text;
    if (chunk !== null) {
      const line = sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;
      if (!isExempt(lines, line))
        for (const hit of leaksIn(chunk))
          violations.push(`${path}:${line} ${hit.label} \`${hit.match}\` — use a design token (DS-13 / D-15)`);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return violations;
}
```

**Analog for asserting an ABSENCE** (`sheet-absent`, `empty-state-adoption`, `site-contacts` in its
inverted form, `gitignore-baselines`): `tests/design/scaffold-residue.test.ts:16-20` explains why the
absence needs a permanent test at all —

```
// WHY THE DELETIONS ARE ASSERTED AT ALL, given they already happened. A deletion has no symptom. The
// realistic way `favicon.ico` comes back is not a revert — it is `npx create-next-app` output being
// copied in, or a merge resurrecting a file nobody is looking for.
```

---

### E. `tests/availability/open-capacity-exclude.test.ts` (test, CRUD) — D-33's standing assertion

**Analog: itself, lines 139-153.** Copy the query verbatim; the namespace scope is the load-bearing
part and its own comment says so.

```ts
it("the live constraint definition carries the narrow", async () => {
  // Read the constraint back out of the ISOLATED schema's catalog (the dev `public` schema carries a
  // same-named constraint, so the namespace scope is load-bearing, not decoration). […]
  const [{ def }] = (await testDb.client`
    SELECT pg_get_constraintdef(c.oid) AS def
    FROM pg_constraint c
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE c.conname = 'booking_no_overlap' AND n.nspname = ${testDb.schema}`) as unknown as {
    def: string;
  }[];
  expect(def).toContain("open_capacity = false");
  expect(def).toContain("'cancelled'"); // the occupying complement set is unchanged
});
```

**The spec D-33's OBSERVED RED runs against: `tests/availability/exclusion-race.test.ts`.** Its
`makeRacingClients` two-connection harness (lines 82-108) is what a dropped constraint turns green,
and its header (lines 9-11) already states the intended failure mode in this phase's language:

```ts
const [a, b] = makeRacingClients(testDb.schema, 2); // two INDEPENDENT connections, one schema
try {
  const results = await Promise.allSettled([
    ins(a, "bk_a", 1, "2026-08-01T02:00:00Z", "2026-08-01T03:00:00Z"),
    ins(b, "bk_b", 1, "2026-08-01T02:00:00Z", "2026-08-01T03:00:00Z"),
  ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  const rejected = results.find((r) => r.status === "rejected") as PromiseRejectedResult | undefined;
  expect(isConflict(rejected!.reason)).toBe(true);
  const [{ n }] = await testDb.client`
    SELECT count(*)::int AS n FROM booking
    WHERE listing_id = ${LISTING} AND unit = 1 AND starts_at = '2026-08-01T02:00:00Z'`;
  expect(n).toBe(1);
} finally { await a.end(); await b.end(); }
```

> Note the accepted-codes set at lines 44-45 (`23P01` **or** `40P01`). A mutation record that quotes
> only `23P01` will look wrong to a future reader; quote the constant.

---

### F. `e2e/price-parity.spec.ts` (test, self-seeding e2e)

**Analog: `e2e/search-and-book.spec.ts`.** Four load-bearing details, all measured.

**Imports + the connection fallback** (lines 28-41) — the fallback matters because *"the Playwright
process doesn't load `.env`"*:

```ts
import { test, expect, type Page, type BrowserContext } from "@playwright/test";
import { randomUUID } from "node:crypto";
import postgres from "postgres";

const BASE = "http://localhost:3000";
const VENUE_TZ = "Asia/Manila";

// The Playwright process doesn't load .env; fall back to the deterministic dev URL (as tests/helpers/db.ts).
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";

const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
```

**Unique ids per run** (lines 44-51) — never fixed ids:

```ts
const hostId = `e2e_sb_host_${randomUUID()}`;
const listingId = `e2e_sb_listing_${randomUUID()}`;
const bookerEmail = `e2e.searchbook.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
```

**Cascade-correct teardown** (lines 198-207) — the order is the pattern:

```ts
test.afterAll(async () => {
  // Bookings FIRST (booker_id is ON DELETE RESTRICT), then the host (cascades listing/photos/hours/tags),
  // then the signed-up booker. Order is load-bearing — mirrors availability.spec.ts:134-141.
  await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
  await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
  await sql.end();
});
```

**The seeded shape to copy** (lines 100-132): an `instant` listing whose host is payouts-enabled,
`operating_hours` for all 7 days, three `listing_photo` rows, one `listing_activity_tag`. The spec's
`pickWindow` / `selectTargetDay` helpers (lines 209-232) drive the calendar to a `+3 days` venue-local
window — reuse them; do **not** re-derive the date math.

> **What price-parity narrows to:** drive search → listing → `Book this space` → the reserve page, read
> `[data-testid="price-total"]`, and compare against `SELECT quoted_total_cents FROM booking WHERE …`.
> D-35 requires **exactly one spec** and **no production secret** — the flow stops before the PayMongo
> hosted checkout, which the analog's header already documents as un-automatable.

---

### F(2). `e2e/visual/**` and the measurement specs

**Analog for the DB-free driver page: `e2e/reduced-motion.spec.ts:58` and
`e2e/scroll-area-overflow.spec.ts:120` — both `const PAGE = "/dev/theme"`,** with the reason stated at
`scroll-area-overflow.spec.ts:26-30`:

```
// WHY `/dev/theme` AND NOT THE NOTIFICATION PANEL. The panel needs an authenticated session and 20
// seeded rows; a gate with those dependencies is a gate that stops running the first time the seed
// changes. `/dev/theme` needs neither […] and it is the page `reduced-motion.spec.ts` already drives.
```

This is the same argument `11-UI-SPEC.md` § GATE-01 makes for baselining only DB-free surfaces.

**Analog for the theme seam: `e2e/helpers/theme.ts:45-59`** — call it on the **context**, before the
first `goto`:

```ts
export async function seedTheme(context: BrowserContext, theme: ThemeName): Promise<void> {
  await context.addInitScript(
    ([key, value]) => {
      try { window.localStorage.setItem(key, value); }
      catch { /* about:blank and other opaque origins */ }
    },
    [THEME_STORAGE_KEY, theme] as const,
  );
}
```

The key is **imported from the provider**, never duplicated — lines 3-9 explain that a duplicated
literal makes the swap smoke *"go green while screenshotting the same theme twice"*, which is exactly
AC#30's failure mode. Lines 17-22 of that file also state *"NO VISUAL-REGRESSION BASELINE MAY BE
CAPTURED IN THIS PHASE"* — **that sentence refers to Phase 10 and is now satisfied; the plan that
lands the `visual` project should amend it** rather than leave a stale prohibition in the tree.

**Analog for anti-vacuity in a measurement spec: `e2e/scroll-area-overflow.spec.ts:215-223`** — assert
the page renders the thing under test *before* asserting anything about it:

```ts
/** Trap 1: assert the page renders the thing under test before asserting anything about it. */
function expectReachable(count: number) {
  expect(
    count,
    `${PAGE} rendered NO [data-slot="scroll-area-viewport"] — every width assertion in this file ` +
      "passes vacuously against a page with no ScrollArea on it, so this is a failure, not a skip.",
  ).toBeGreaterThanOrEqual(1);
}
```

**Analog for the ±2px skeleton assertion (AC#17) and the 320px overflow check (AC#29):** the
`page.evaluate` measurement harness at `scroll-area-overflow.spec.ts:143-172` — a typed measurement
object returned from the browser, asserted in Node with a named tolerance constant
(`const TOLERANCE_PX = 0.5`, line 123).

> ⚠ **Correction to the phase inputs.** `11-RESEARCH.md` marks RESP-01's harness as *"⚠ harness exists
> (10-16)"*. Measured: **no `setViewportSize` call and no `documentElement.scrollWidth` assertion exists
> anywhere in `e2e/`.** What exists is the *measurement idiom* above, on a single default-width viewport.
> The 320px sweep across 12 routes × 2 themes is net-new work — size it as such.

---

### G. GATE-05 — the module split and the two live violations

**The deny-list module split (research finding, not in D-34's literal text).**
`src/lib/payments/config.ts` exports **17 constants of three kinds**; guarding it whole fails the build
on `slot-picker.tsx:43` and `request-row.tsx:34`, which import lead-time constants legitimately.

| Stays in `config.ts` (no guard) | Moves to new `src/lib/payments/fees.ts` (+`server-only`) |
|---|---|
| `PAYMENT_WINDOW_MINUTES`, `APPROVAL_SLA_HOURS`, `APPROVAL_PAYMENT_WINDOW_HOURS`, `MIN_LEAD_REQUEST_HOURS`, `MIN_LEAD_INSTANT_MINUTES`, `MIN_APPROVE_WINDOW_HOURS`, `PRE_EXPIRY_REMINDER_HOURS`, `PRE_SLA_REMINDER_HOURS`, `PRE_SESSION_BOOKER_REMINDER_HOURS`, `PRE_SESSION_HOST_REMINDER_HOURS`, `CHECKOUT_LEASE_TTL_SECONDS`, `PAYOUT_DELAY_HOURS`, `PAYOUT_RETRY_BACKOFF_HOURS`, `PAYOUT_RETRY_MAX_AGE_HOURS` | **`SERVICE_FEE_BPS`** (`config.ts:59`), **`COMMISSION_RATE_BPS`** (`config.ts:13`), **`HOST_CANCEL_FEE_CENTS`** (`config.ts:67`) |

`fees.ts` copies `config.ts`'s own module contract, restated for the guard:

```ts
// (config.ts:1-10, the header that fees.ts inherits and must amend)
// Tunable payment constants … the exported NAME is imported everywhere, never a hardcoded literal.
// …
// Pure/isomorphic: no "use client"/"use server" directive, so Server Components, server actions, the
// commission calculator, and the payout sweep can all import it.
```

> **That last sentence must be rewritten in every guarded module, not left standing.** `service-fee.ts:16-17`
> and `all-in-rate.ts:18-19` both carry a near-identical "pure/isomorphic, anyone can import it"
> paragraph. Adding `import "server-only"` makes those comments **false**, and a false header comment
> is precisely what `use-server-exports.test.ts` was written after. Each guarded file's header gets a
> one-line replacement naming D-34 and the reason.

**Violation #1 — `src/components/listing/listing-card.tsx`.** Line 1 is `"use client"`; line 43 is
`import { allInRateParts } from "@/lib/booking/all-in-rate";`; lines 202-215 call it:

```tsx
const priceParts: string[] = [];
if (listing.occupancyMode === "open_capacity") {
  priceParts.push(
    ...allInRateParts(
      { hourlyRateCents: …, dayRateCents: …, perHeadPriceCents: …, occupancyMode: … },
      listing.currency,
    ),
  );
} else { /* raw rates via formatMoney — no fee arithmetic */ }
```

**The fix's analog is its own sibling, `src/components/search/search-result-card.tsx:122-139`,** which
already does it correctly and explains why in a comment the plan can lift verbatim:

```tsx
// Already formatted SERVER-SIDE in the search query mapping (src/lib/search/query.ts → allInRateParts):
// this card is rendered from a "use client" shell, so composing the fee here would put SERVICE_FEE_BPS
// in the browser bundle, where a non-public env override does not reach it — the browse rate would
// silently keep showing 5% while checkout charged the configured rate. Zero arithmetic in this file.
const priceParts = listing.allInRateParts;
```

…consumed as a plain pre-formatted string with `tabular-nums` (lines 247-252), which is also AC#33's
shape:

```tsx
<p className="text-sm tabular-nums">
  {priceParts.length ? priceParts.join(" · ") : "Price on request"}
</p>
{priceParts.length > 0 && (
  <p className="text-sm text-muted-foreground">Service fee included</p>
)}
```

**Violation #2 — `src/components/availability/availability-calendar.tsx` (NOT named in CONTEXT.md).**
Line 32 imports `computeServiceFee`; it is called at **346** and **411**, on the **public**
`/listings/[id]` page:

```ts
// :346
const cents = spaceCents == null ? null : computeServiceFee(spaceCents, serviceFeeBps).allInCents;
// :411
const cents = perHeadPriceCents == null
  ? null
  : computeServiceFee(perHeadPriceCents * passes, serviceFeeBps).allInCents;
```

> **This one has no clean analog and is genuinely harder than #1.** The component already receives
> `serviceFeeBps` as a *prop from the server*, and both call sites are **per-selection** — the figure
> depends on the window or pass count the booker just picked, so "move it to the server" is not a
> one-line change the way it is for `listing-card.tsx`. Two candidate shapes, both needing a decision
> the planner should take explicitly: pass a **pre-computed rate table** keyed by hours/passes, or keep
> a client-side multiply of a **server-computed all-in unit rate** (which keeps `SERVICE_FEE_BPS` out of
> the bundle without a table). Do not let D-36's one-file description size this plan.

**Enforcement, per research:** `import "server-only"` needs **no npm install** (Next aliases it and
declares the module in `node_modules/next/types/global.d.ts:57`) and **is enforced by Turbopack**. A
plan proposing `npm install server-only` is a recorded-decision reversal.

---

### H(1). 18 × `loading.tsx` (route state, request-response)

**Analog: `src/app/(app)/bookings/loading.tsx`** — the one existing skeleton that already encodes the
measurement idea. Full file (27 lines):

```tsx
// Skeleton for /bookings. Row heights match the real rows (a card is p-4 around a 48px thumbnail, so ~80px)
// so the list does not jump when the data lands — the shell, the title and the tab strip all stay put and
// only the rows swap in (07-UI-SPEC § 1, Loading).

import { Skeleton } from "@/components/ui/skeleton";

const PLACEHOLDER_ROWS = [0, 1, 2, 3];

export default function BookingsLoading() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="text-xl font-semibold tracking-tight">Your bookings</h1>
      <p className="mt-2 max-w-prose text-sm text-muted-foreground">
        Everything you&apos;ve booked, and everything you&apos;ve booked before.
      </p>
      <div className="mt-8"><Skeleton className="h-11 w-52 rounded-lg" /></div>
      <div className="mt-8 space-y-3" aria-hidden="true">
        {PLACEHOLDER_ROWS.map((i) => (<Skeleton key={i} className="h-20 w-full rounded-xl" />))}
      </div>
    </div>
  );
}
```

**Three things to copy, one to fix, one to add:**

- **Copy** the page-shell duplication (container width, `h1`, lede) so only the data region swaps.
- **Copy** the `aria-hidden="true"` on the pulse-bar region.
- **Copy** the reasoning comment — it already documents the "80px = `p-4` around a 48px thumb" derivation.
- **Fix:** `h-20` (line 23) is the literal that `measurements.ts`'s `ROW_CARD_HEIGHT` replaces. This is
  the **first** conversion target and the concrete example AC#16 exists to prevent.
- **Add:** the `role="status"` + `aria-busy="true"` wrapper with an `sr-only` name (AC#18). The shipped
  file has **`aria-hidden` only and no `role="status"`** — so it is currently in violation of the
  contract it otherwise models. Say so in the plan.

**Grid variant analog: `src/app/(host)/host/listings/loading.tsx:10-18`** — the 6-card `aspect-[4/3]`
grid that becomes `CardGridSkeleton`:

```tsx
<div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
  {Array.from({ length: 6 }).map((_, i) => (
    <div key={i} className="space-y-3">
      <Skeleton className="aspect-[4/3] w-full rounded-xl" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
    </div>
  ))}
</div>
```

Primitive: `src/components/ui/skeleton.tsx` (13 lines) — `"animate-pulse rounded-md bg-muted"`. It is
already `animate-pulse`, which the UI-SPEC exempts from the 320ms cap. Do not add a duration token.

### H(2). 5 × `error.tsx` + `global-error.tsx` + 3 × `not-found.tsx` — **NO ANALOG**

**Measured: this repository contains zero `error.tsx`, zero `global-error.tsx` and zero
`not-found.tsx` files.** There is nothing to copy and the planner must not invent a lookalike. Anchor
these to the UI-SPEC's props contract and the two in-repo *fragments* that do exist:

- **The error-state visual/copy shape** exists inline at `src/components/search/search-results.tsx:169-181`
  and is the analog for `patterns/error-state.tsx`, not for the boundary file:

```tsx
{fetchError ? (
  <div className="rounded-xl border border-dashed p-8 text-center" role="alert">
    <p className="font-semibold">Something went wrong loading spaces</p>
    <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">
      We couldn&apos;t load spaces just now. Try again.
    </p>
    <Button variant="secondary" className="mt-4 min-h-11"
      onClick={() => startTransition(() => router.refresh())}>Try again</Button>
  </div>
) : …}
```

  Note it has **one** action — the UI-SPEC requires **two** (`Try again` + a group-specific route out),
  so this is a shape to extend, not to copy wholesale.

- **`global-error.tsx`'s colour mechanism** has exactly one sanctioned source:
  `src/lib/design/tokens.generated.ts:1-27`, whose header names this file's use case verbatim —
  *"a document-level error page that renders before the stylesheet … They need a literal — and a
  literal typed by hand drifts."* Read `THEME_TOKENS.court["--brand"].hex`; never write a hex.
  `tests/design/leak.test.ts` already scans `src/app/**`, so a raw hex there fails the build today.

- **`invite/[token]/not-found.tsx`'s copy source** is `src/app/invite/[token]/page.tsx:71-72`:

```ts
const INACTIVE_TITLE = "This invite is no longer active";
const INACTIVE_BODY = "Ask the organizer for the latest link.";
```

  ⚠ **These are module-private `const`s — they are NOT exported today.** The UI-SPEC's "imported, not
  retyped" requirement therefore needs an explicit move: either export them from the page (an extra
  named export on a `page.tsx`, which the plan should verify against Next 16's segment-export
  validation) or hoist them beside `GROUP_INACTIVE` in `src/lib/group/rsvp.ts`, which is where the
  same-shaped constant already lives and which the page's own comment (lines 68-70) points at:
  *"mirroring how 08-06 froze `GROUP_INACTIVE` into a single object: two literals in two branches are
  two things that can drift apart, and the moment they do, the difference between them is the oracle."*
  **The hoist is the analog-consistent choice.**

- **Build hazard (research caveat 2):** the root `not-found.tsx` and `global-error.tsx` **must reach no
  database**. `/_not-found` is prerendered `○` today; if it renders a shell component that reaches
  `@/lib/db`, the DB-free job-1 property collapses. Falsifiable by re-running the
  unreachable-`DATABASE_URL` build.

---

### I. `src/app/(app)/layout.tsx` + `src/app/(host)/host/layout.tsx` — the single riskiest edit

**Analog: the files themselves.** The split must be surgical. Current shape, in order:

```ts
// (app)/layout.tsx:28-31  — SECURITY GATE (T-04-06). STAYS BLOCKING.
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) { redirect("/login"); }

// (host)/host/layout.tsx:32-45 — the same, PLUS the capability gate (T-04-02). BOTH STAY BLOCKING.
if (!u.canHost) { redirect("/"); }

// (host) only, :49-54 — the pending-request badge count. Not a gate.
const [{ p } = { p: 0 }] = await db.select({ p: count() }).from(booking)
  .innerJoin(listing, eq(booking.listingId, listing.id))
  .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));

// BOTH, (app):54-68 / (host):69-83 — THE ONLY PART THAT MOVES INTO THE ASYNC CHILD.
let unreadCount = 0;
let notificationItems: NotificationItemData[] = [];
let notificationsFailed = false;
try {
  const [unread, rows, now] = await Promise.all([
    countUnread(db, session.user.id),
    listRecent(db, session.user.id, NOTIFICATIONS_MAX_LIMIT),
    readDbNow(db),
  ]);
  unreadCount = unread;
  notificationItems = toNotificationItems(rows, now);
} catch (err) {
  console.error("[notifications] bell_read_failed", { surface: "app", err });
  notificationsFailed = true;
}
```

**Three properties the async child must preserve byte-for-byte**, each with an in-file citation:

1. **Owner-scoped IN THE QUERY** on `session.user.id` (T-07-82) — `(app)/layout.tsx:51-52`:
   *"Both reads are OWNER-SCOPED IN THE QUERY on session.user.id (T-07-82) — never post-filtered, and
   never from anything the request supplied."* The child receives `session.user.id` as a **prop from
   the still-blocking parent**, never re-reads the session.
2. **The database clock** — `readDbNow(db)`, because *"a skewed client clock would otherwise render
   'in 3 hours' on a notification that just arrived."*
3. **The try/catch degradation** — `(app)/layout.tsx:52-53`: *"a notification read is an AMBIENT
   convenience, and it must never take down the shell that carries the session gate."*

**The header markup being replaced** (`(host)/host/layout.tsx:87-132` — the widest of the three) is the
analog for `patterns/site-chrome.tsx`'s slots. Copy the link classes byte-for-byte:

```tsx
<header className="flex items-center justify-between border-b bg-muted px-4 py-3">
  <Link href="/host" className="text-lg font-semibold tracking-tight">
    FitOut <span className="text-muted-foreground">· Hosting</span>
  </Link>
  <div className="flex items-center gap-3">
    <ModeSwitch current="host" canBook={u.canBook ?? false} canHost={u.canHost ?? false} />
    <Link href="/host/earnings" className="text-sm font-medium underline-offset-4 hover:underline">Earnings</Link>
    <Link href="/host/requests" className="inline-flex items-center gap-1.5 text-sm font-medium underline-offset-4 hover:underline">
      Requests
      {pendingRequests > 0 && (
        <Badge variant="secondary" aria-label={`${pendingRequests} requests to review`}>{pendingRequests}</Badge>
      )}
    </Link>
    <NotificationBell unreadCount={unreadCount} items={notificationItems} error={notificationsFailed} />
    <Link href="/profile" className="text-sm font-medium underline-offset-4 hover:underline">Profile</Link>
  </div>
</header>
```

⚠ **Both files carry an explicit in-file instruction not to merge the headers** (`(app):38-45`,
`(host):56-63`): *"There IS no shared header component … D-04 deliberately made the host shell distinct
… Do NOT refactor the two headers into one here."* `11-UI-SPEC.md` honours it by sharing only the
**box**. **Those comments must be amended in the same edit**, not silently contradicted — a stale
prohibition beside the thing it prohibits is the drift this phase exists to end.

⚠ **`(app)/layout.tsx:98-106`** carries a "mount the Toaster exactly once at the shared ancestor" note
and warns *"Do NOT also mount it per-page underneath this."* The restructure must not orphan or
duplicate that mount.

---

### J. The pattern layer

**`patterns/result-card.tsx`** — analog `src/components/search/search-result-card.tsx:166-276`. Copy
the whole-card `<Link>` + focus recipe verbatim; its comment explains why the offset **colour** is
load-bearing:

```tsx
<Link
  href={href}
  // DS-05: this recipe set an offset WIDTH without an offset COLOUR, so the 2px band around a
  // focused search result painted Tailwind's default offset — a hardcoded white — instead of
  // --background. On grove's tinted background that is a visible white halo […]
  className="group block rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
>
  <Card className="h-full gap-0 overflow-hidden pt-0 transition-shadow group-hover:bg-muted/40 group-hover:shadow-overlay">
    <AspectRatio ratio={4 / 3} className="bg-muted">…</AspectRatio>
    <CardContent className="space-y-1 py-4">…</CardContent>
  </Card>
</Link>
```

The `group-hover:bg-muted/40` here is the exact pairing that becomes the **2 new `CONTRAST_PAIRS` rows**
(`over: "background"`, not `over: "card"`). Badges are inline on the type line, never overlaid on the
photo — `search-result-card.tsx:191-194` records the reason.

**`patterns/row-card.tsx`** — analog `src/components/booking/booking-row.tsx:58-99`. The overlay-link
form is a declared DS-05 exception, and the shipped code already carries it:

```tsx
<CardContent className="space-y-3 p-4">
  <div className="flex items-start gap-3">
    <div className="size-12 shrink-0 overflow-hidden rounded-md bg-muted">…</div>
    <div className="min-w-0 flex-1">
      {/* The whole card is the link to the detail page — an overlay pseudo-element rather than a
          wrapping anchor, so the inline CTA below stays a sibling and never nests inside it. */}
      <Link href={`/bookings/${row.bookingId}`}
        className="truncate text-sm font-semibold outline-none after:absolute after:inset-0 after:rounded-xl focus-visible:after:ring-2 focus-visible:after:ring-ring">
        {row.spaceTitle}
      </Link>
      <p className="text-sm text-muted-foreground">{row.whenLabel}</p>
    </div>
    <div className="flex shrink-0 flex-col items-end gap-1">…</div>
  </div>
```

Note the deliberate **absence of `ring-offset`** — UI-SPEC § RowCard records this as a declared
exception; do not "fix" it.

**`patterns/panel-card.tsx`** — analog `src/components/ui/card.tsx:5-21` (`Card`) and `:82-92`
(`CardFooter`, already `border-t bg-muted/50 p-4`, matching the UI-SPEC's `footer` prop). The
`ring-1 ring-foreground/10` on line 15 is the hairline that becomes the third new `EXCLUDED_PAIRS` row.

**`patterns/empty-state.tsx`** — analog `src/components/search/search-results.tsx:201-215` (shell A,
the geometry the UI-SPEC says wins):

```tsx
<div className="rounded-xl border border-dashed p-8 text-center">
  <SearchXIcon className="mx-auto size-6 text-muted-foreground" aria-hidden="true" />
  <p className="mt-3 font-semibold">No spaces match those filters</p>
  <p className="mx-auto mt-1 max-w-prose text-sm text-muted-foreground">Try widening your search.</p>
  <div className="mt-5 flex flex-wrap items-center justify-center gap-2">…</div>
</div>
```

⚠ **The `<p className="font-semibold">` is exactly the "no heading element" defect the pattern fixes**
— the component's `titleAs` prop (`"h2" | "h3"`, default `"h2"`) replaces it. **The 8 conversion sites,
measured:** `search-results.tsx:170,204,242` (shell A) and `(app)/bookings/page.tsx:138,151`,
`(host)/host/requests/page.tsx:140`, `(host)/host/listings/page.tsx:88`,
`(host)/host/bookings/page.tsx:191` (shell B, all `p-10` → `p-8`).

> **Out-of-inventory `border-dashed` sites the source scan will also hit** (AC#23 says *zero survive
> outside the pattern*): `(host)/host/earnings/page.tsx:180`, `(host)/host/page.tsx:149`,
> `availability-calendar.tsx:258,265,272`, `date-pass-picker.tsx:292,299,306,323`,
> `photo-uploader.tsx:180`. That is **11 more** than the 8 the UI-SPEC inventories. The plan must
> either convert them, or scope AC#23's assertion (e.g. `src/app/**` + `search-results.tsx`) with a
> stated reason — an unscoped assertion lands red on files this phase never touches.

**`patterns/responsive-dialog.tsx`** — analog: the vendored-`Dialog` composition already used at
`src/components/listing/listing-card.tsx:31-41`. `DialogContent` takes `className`, so the mobile
presentation is a class override, **not a fork** of `src/components/ui/dialog.tsx`.

**`patterns/site-footer.tsx`** — **no analog**; nothing in the app renders a footer. Anchor entirely to
`11-UI-SPEC.md` § The Footer. Its one in-repo dependency is `src/lib/site.ts` (new), and the copy
comes from `src/app/layout.tsx:107` (`description: "Book gyms, courts and studios by the hour."`) —
**imported, one owner**, not retyped.

---

### C. Typed inventories

**Analog: `src/lib/design/status-tones.ts:74-108`** — the exact shape D-31's `selector-contract.ts`
follows (const tuple → derived union → total `Record`, so an addition without a recipe is a *compile*
error):

```ts
export const STATUS_TONES = ["neutral", "positive", "attention", "soft-accent"] as const;
export type StatusTone = (typeof STATUS_TONES)[number];
export type StatusToneRecipe = { surface: string; text: string; icon: string };
export const STATUS_TONE_RECIPES: Record<StatusTone, StatusToneRecipe> = { … };
```

**Analog for a row-with-a-reason inventory: `src/lib/design/contrast-pairs.ts:99-116`** — every row
carries a mandatory `note`, and the file's header states why an inventory beats a derived set:

```ts
export type ContrastPair = {
  readonly fg: string;
  readonly bg: string;
  readonly bar: number;
  readonly alpha?: { readonly value: number; readonly over: string };
  readonly fgAlpha?: number;
  readonly note: string;   // ← mandatory; a row without a reason is not a row
};
```

**Why these modules live at `src/lib/design/`** — `contrast-pairs.ts:11-14`:

```
// WHY THIS MODULE LIVES AT `src/lib/design/`. The leak gate scans `src/app/**` and
// `src/components/**` only (see `config/design-leak-patterns.mjs` → LEAK_SCAN_PREFIXES). This file
// necessarily names tokens and bars, and a future edit may want a literal; keeping it outside the
// scanned tree means it can be honest without needing a per-line exemption.
```

That paragraph is the direct justification for putting **`measurements.ts`** there too (it names
`h-20`, `aspect-[4/3]`, `min-w-44` — all of which a call-site scanner would otherwise flag), and for
**`selector-contract.ts`** naming all 14 `data-testid` strings in one place.

**Analog for a committed generated/declared module with a drift gate: `src/lib/design/tokens.generated.ts:1-27`
+ `tests/design/token-drift.test.ts`** — the D-18 precedent D-31 explicitly follows.

**`src/lib/site.ts`** — analog `src/lib/payments/config.ts:1-10`'s named-constant contract
(*"the exported NAME is imported everywhere, never a hardcoded literal"*). One export:
`export const SUPPORT_EMAIL: string | null = null;` plus the D-26 reason and the pointer to the
inverted gate.

---

### B. `playwright.config.ts` — self-analog, four edits

Current file (31 lines) has **no snapshot config**, one project, and `webServer: npm run dev`:

```ts
export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: { baseURL: "http://localhost:3000", trace: "on-first-retry" },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: { command: "npm run dev", url: "http://localhost:3000",
               reuseExistingServer: !process.env.CI, timeout: 120_000 },
});
```

Edits: (1) `updateSnapshots: "none"` **unconditionally** (D-28); (2) a second `visual` project that
hard-skips off-Linux with a named reason (D-29); (3) `testDir` / `testMatch` so `e2e/visual/**` is the
visual project's only input; (4) exact-pin `@playwright/test` at `1.60.0` in `package.json` (it is
`^1.60.0` today, resolving to 1.60.0).

⚠ **`reuseExistingServer: !process.env.CI` is an inherited trap for every new browser spec.** Both
`reduced-motion.spec.ts:45-51` and `scroll-area-overflow.spec.ts:49-56` carry the same warning: a dev
server left running across a checkout serves a stale stylesheet and produces a false red (or, in the
visual project, a **baseline captured from stale CSS**). Copy that warning into the visual specs.

### B(2). `.gitignore` — self-analog, and D-30's standing test

Measured: **zero `*.png` rules** and no platform-suffix rules. The file's existing block style is the
pattern (a `#` section heading + rules), e.g.:

```
# typescript
*.tsbuildinfo
next-env.d.ts
```

D-30's standing test asserts **both** halves — the rules exist AND git tracks zero matching files.
The "git tracks zero" half has **no in-repo precedent** (no test shells out to `git` today); the
closest posture is `tests/design/scaffold-residue.test.ts`, which asserts deletions via `existsSync`.
The plan must decide between `execFileSync("git", ["ls-files", …])` and a filesystem walk, and state
why. Research measured the real filename shape: `shot-visual-win32.png` (project name + `{platform}`),
so the rules do match.

---

### K/L. Legal routes and share/meta

**`(legal)` group layout** — analog `src/app/(auth)/layout.tsx` (36 lines): a group layout whose only
job is a container. Note the UI-SPEC removes that file's centred wordmark (lines 24-31) in the same
phase, because `site-chrome` supplies it.

**Prose container** — no long-form surface exists. The nearest container idiom is
`src/app/invite/[token]/page.tsx:83-86` (`<main className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">`).
The UI-SPEC's `max-w-prose px-4 py-12 sm:py-16` follows the same shape with a different measure.

**`generateMetadata` — NO ANALOG.** Measured: `src/app/` contains **three** `export const metadata`
declarations (`layout.tsx:104`, `invite/[token]/page.tsx:60`, `dev/theme/page.tsx:87`) and **zero**
`generateMetadata` functions. The two that matter:

```ts
// src/app/layout.tsx:104-108 — the template every per-route title composes through.
export const metadata: Metadata = {
  metadataBase: resolveMetadataBase(),
  title: { default: "FitOut", template: "%s · FitOut" },
  description: "Book gyms, courts and studios by the hour.",
};
```

```ts
// src/app/invite/[token]/page.tsx:58-64 — the security properties AC#13 says must survive the
// conversion to generateMetadata. Its own comment states the stakes.
/**
 * The URL of this page CONTAINS the credential, so it must never be indexed and must never travel in a
 * `Referer` header. Both are one line each here and unfixable after a crawler has already been through.
 */
export const metadata: Metadata = {
  title: "You're invited · FitOut",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};
```

`resolveMetadataBase()` (`layout.tsx:95-102`) already exists and already falls back to
`http://localhost:3000` — the OG image URL will be localhost-absolute until `NEXT_PUBLIC_APP_URL` is
set. Carry that as a second `human_needed` item, not a bug.

**`opengraph-image.tsx` — NO ANALOG.** Measured: no `opengraph-image.*`, no `icon.*`, no `apple-*`
files anywhere under `src/app`, and no `next/og` import in the tree. The only in-repo anchors are
`src/lib/design/tokens.generated.ts` (the hex source satori must read) and the leak gate that already
bans a raw hex under `src/app/**`. The *font-buffer* requirement, the `alt` export and the
serve-the-root-card-on-failure wrapper are all net-new — no pattern to copy.

### M. `/dev/theme` sections 10-14

**Analog: the file itself.** Nine sections exist (`Section` calls at lines 175, 190, 231, 255, 263,
273, 329, 347, 364); the new ones continue the sequence. The helper (lines 139-162):

```tsx
/** One section inside a pane. The heading renders in the PANE's theme, so headings compare too. */
function Section({ index, title, note, children }: {
  index: number; title: string; note?: string; children: React.ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="space-y-1">
        <h2 className="text-heading">{index}. {title}</h2>
        {note ? <p className={cn("text-label", "text-muted-foreground")}>{note}</p> : null}
      </div>
      {children}
    </section>
  );
}
```

And the one-function-called-twice rule (lines 164-170), which the new sections must not break:

```tsx
/**
 * The section sequence, rendered identically in both panes.
 *
 * ONE function called twice, rather than two copies — a preview whose panes can drift is a preview
 * that will eventually attribute a difference to the theme that actually came from the markup.
 */
function ThemePane({ name }: { name: string }) { … }
```

Also copy `export const metadata` at lines 87-90 (`robots: { index: false, follow: false }`) — the
route is already noindexed and 404s in production.

---

## Shared Patterns

### 1. The OBSERVED RED convention
**Source:** `tests/use-server-exports.test.ts:25-62` (vitest form) · `e2e/scroll-area-overflow.spec.ts:59-109` (browser form, with a measurement table + GREEN RUN line)
**Apply to:** the workflow header (D-30, two kinds), the extended constraint spec (D-33), the GATE-05 plan (D-36).
**Required elements:** HEAD sha + clean `git status`, exact command, exit code, verbatim output, and a sentence naming what did **not** fail.

### 2. AST over grep
**Source:** `tests/use-server-exports.test.ts:65-72, 104-151` · `tests/design/leak.test.ts:211-249`
**Apply to:** every `tests/design/**` gate that reads `src/`. Five existing design tests already use `ts.createSourceFile` (`focus-recipe:194`, `leak:215`, `pair-drift:409`, `status-vocab:214,333`).
**Non-negotiable for D-34:** a `server-only` grep returns 6 comment-only hits and 0 real imports today.

### 3. Guard-the-guard + both-directions self-tests
**Source:** `tests/use-server-exports.test.ts:315-318` (found-what-it-polices) and `:320-369` (flags **and** exempts, on synthetic fixtures) · rationale at `tests/design/infra.test.ts:5-9`
**Apply to:** all ~14 new design gates and both new e2e measurement specs (`expectReachable`, `scroll-area-overflow.spec.ts:215-223`).

### 4. The "NOT COVERED" blind-spot footer
**Source:** `tests/use-server-exports.test.ts:89-102` · `contrast-pairs.ts:22-36` · `e2e/scroll-area-overflow.spec.ts:112-118`
**Apply to:** every new gate and every new inventory module. *"so the next reader under-trusts this file rather than over-trusts it."*

### 5. Typed inventory, never markdown
**Source:** `src/lib/design/status-tones.ts:74-108` · `contrast-pairs.ts:99-116` · `tokens.generated.ts:1-27`
**Apply to:** `selector-contract.ts`, `measurements.ts`, `nav.ts`, `Z_SHEET_INVENTORY`.
**Shape:** `as const` tuple → derived union → total `Record` → every row carries a mandatory reason string.

### 6. Assert the zero, with its reason
**Source:** `contrast-pairs.ts:34-36` (`EXCLUDED_PAIRS` with reasons) · the `shadow-sticky` precedent recorded at `src/app/dev/theme/page.tsx:96-107` and pinned by `tests/design/elevation-z.test.ts`
**Apply to:** `Z_SHEET_INVENTORY = {}` (AC#27), the `global-error` theme-swap exclusion (AC#30), the `SUPPORT_EMAIL`-null footer assertion (D-26).
**Rule:** *a zero that is asserted is a contract; a zero that is merely true is an invitation.*

### 7. DB-free by construction
**Source:** `vitest.design.config.ts:17-22` (no `globalSetup`/`setupFiles`) · `e2e/scroll-area-overflow.spec.ts:26-30` (`/dev/theme` needs no auth, no DB, no seed)
**Apply to:** every new gate; CI job 1; every baselined surface.

### 8. Owner-scoped in the query, gates stay blocking
**Source:** `(app)/layout.tsx:28-31, 51-52` · `(host)/host/layout.tsx:32-45, 65-66`
**Apply to:** the Suspense restructure. `getSession` + both `redirect()`s stay blocking; the child gets `session.user.id` as a prop; the try/catch degradation survives.

### 9. Pre-formatted money strings across the boundary
**Source:** `src/components/search/search-result-card.tsx:122-139` (the reasoning) and `:247-252` (the render)
**Apply to:** `ResultCard`, `listing-card.tsx`'s fix, `availability-calendar.tsx`'s fix, the checkout total's `data-testid="price-total"`.
**Rule (D-130 restated):** a client component may receive money as a **pre-formatted string**; never the inputs to compute one. `tabular-nums` is mandatory on every money figure.

### 10. A false header comment is a defect
**Source:** `tests/use-server-exports.test.ts:16-23` (a green test masking a dead feature) · `src/lib/payments/service-fee.ts:16-17` and `all-in-rate.ts:18-19` (the "pure/isomorphic, anyone can import it" paragraphs that `server-only` invalidates)
**Apply to:** every guarded module, both group layouts' "do NOT refactor the two headers" notes, and `e2e/helpers/theme.ts:17-22`'s now-satisfied baseline prohibition.

---

## No Analog Found

The planner should use `11-UI-SPEC.md` and `11-RESEARCH.md` for these, not a lookalike from the tree.

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `.github/workflows/ci.yml` | config | batch | **No CI has ever existed** — no `.github/`, no husky, no git hooks. Every detail comes from research (service-label vs `localhost` addressing, `postgis/postgis:18-3.6` not `:18`, `mcr.microsoft.com/playwright:v1.60.0-noble`, `--ipc=host`, unreachable-`DATABASE_URL` on job 1). |
| `.github/workflows/baselines.yml` | config | batch | Same. Plus the `GITHUB_TOKEN`-push-triggers-nothing consequence and the `github.event_name` concurrency-group fix. |
| `src/app/error.tsx` and 4 group siblings | route (client) | event-driven | **Zero error boundaries exist.** Props contract from installed `next@16.2.7` types: `{ error, reset, unstable_retry }` — write against `reset`. |
| `src/app/global-error.tsx` | route (client) | event-driven | No precedent for a document-rendering, style-less surface. Colour mechanism only from `tokens.generated.ts`. |
| `src/app/not-found.tsx` (+2 segment siblings) | route | request-response | **Zero `not-found.tsx` files exist.** |
| `src/app/opengraph-image.tsx` (+2) | route (image) | transform | **Zero `next/og` routes, zero `opengraph-image.*` files.** Font-buffer loading, the `alt` export and the never-5xx wrapper are all net-new. |
| `generateMetadata` conversions | route (metadata) | request-response | **Zero `generateMetadata` exports exist** — only three static `metadata` objects. |
| `src/components/patterns/site-footer.tsx` | component | — | No footer renders anywhere in the app. |
| `e2e/visual/freeze.css` | config | — | No CSS asset exists under `e2e/`. |
| `src/app/(legal)/{terms,privacy}/page.tsx` | route | request-response | No long-form prose surface exists; the app's first. |
| `e2e/overflow-320.spec.ts` (the 320px sweep) | test (e2e) | request-response | **No `setViewportSize` and no `scrollWidth`/`clientWidth` assertion exists in `e2e/`** — contra `11-RESEARCH.md`'s "harness exists (10-16)". Only the measurement *idiom* transfers. |
| `tests/design/gitignore-baselines.test.ts` (the "git tracks zero" half) | test | batch | No test shells out to `git`. |
| `src/lib/payments/fees.ts` | config | — | Net-new module; content is a **move** from `config.ts:13,59,67`, so the analog is the source lines rather than a sibling file. |

---

## Scope Alarms (raise, do not absorb)

1. **GATE-06 is intact.** Every mapping above is TypeScript / TSX / config / test surgery. `drizzle/`
   is at **0025** (`drizzle/0025_audit_resolved_by.sql` is the last file) and **nothing in this map
   implies a migration.** The `payments/config.ts` split is module surgery only. If a plan proposes a
   migration, that is a GATE-06 alarm.
2. **Zero packages.** `server-only` is aliased by Next (no install), `next/og` is a subpath of the
   installed `next@16.2.7`. A plan proposing `npm install server-only`, `@tailwindcss/typography`,
   `vaul`, or `npx shadcn add sheet` is a recorded-decision reversal.
3. **`availability-calendar.tsx` is materially larger than D-36 describes** — per-selection arithmetic
   at two call sites, requiring a props-contract decision. Size the GATE-05 plan for it.
4. **`border-dashed` inventory is 19 sites, not 8.** AC#23's assertion needs an explicit scope or 11
   more conversions.
5. **`INACTIVE_TITLE`/`INACTIVE_BODY` are not exported** — the "imported, not retyped" requirement
   needs a hoist (recommended: beside `GROUP_INACTIVE` in `src/lib/group/rsvp.ts`).
6. **The existing `bookings/loading.tsx` has no `role="status"`** — the file the phase treats as its
   model is itself in violation of AC#18.

---

## Metadata

**Analog search scope:** `src/app/**`, `src/components/**`, `src/lib/**`, `tests/**`, `e2e/**`,
`drizzle/`, repo root config (`.gitignore`, `package.json`, `playwright.config.ts`,
`vitest.design.config.ts`).
**Files read in full or in targeted ranges:** 34.
**Repo state at mapping time:** branch `dev`, drizzle at `0025`, `@playwright/test` declared `^1.60.0`,
no `.github/`, no `src/components/patterns/`, `tests/design/` holds 23 files + 2 helpers.
**Pattern extraction date:** 2026-08-13
