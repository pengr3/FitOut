# Phase 12: Booker Path — Search → Listing → Checkout - Pattern Map

**Mapped:** 2026-08-18
**Files analyzed:** 13 Wave-0 test files + 8 new source modules + 9 modified surfaces = 30
**Analogs found:** 26 / 30 (4 have no analog — see § No Analog Found)

---

## How to read this (and what is deliberately NOT here)

`12-RESEARCH.md` already carries the file inventory, the architecture patterns and the code
examples. **Nothing in that document is repeated here.** This file answers one question only:

> *For each file this phase must CREATE, which existing file already does the same kind of thing,
> and what exactly should be copied out of it?*

Where RESEARCH already nails a mechanism, the row says **see `12-RESEARCH.md` § X** and moves on.

**Two things this map adds that no other artefact carries:**

1. Four Wave-0 files have **no analog in the repo at all** (§ No Analog Found). Those are the
   plan's real risk, not the ten that do.
2. Three repo-wide gates will fail an executor's build for reasons that are invisible from
   RESEARCH.md's inventory tables (§ Repo-Wide Conventions). The `selector-contract` one is
   **bidirectional** — declaring a testid without rendering it fails just as hard as the reverse.

---

## File Classification

### New files — Wave 0 tests

| New file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `e2e/photo-lightbox.spec.ts` | e2e / a11y | request-response (seeded) | `e2e/public-listing.spec.ts` | exact |
| `e2e/calendar-hit-area.spec.ts` | e2e / rendering | measurement | `e2e/skeleton-geometry.spec.ts` | exact |
| `e2e/price-one-fact.spec.ts` | e2e / rendering | measurement | `e2e/skeleton-geometry.spec.ts` + `e2e/price-parity.spec.ts` | split analog |
| `e2e/mobile-booker-path.spec.ts` | e2e / viewport | request-response | `e2e/overflow-320.spec.ts` (viewport) + `e2e/shell.spec.ts` (signup+widths) | split analog |
| `e2e/hold-countdown.spec.ts` | e2e / rendering | time-driven | `e2e/shell.spec.ts` (box stability) — **clock half has NO analog** | partial |
| `e2e/zero-result-relax.spec.ts` | e2e | request-response | `e2e/price-parity.spec.ts` (search→URL driving) | role-match |
| `e2e/collision-in-place.spec.ts` | e2e | event-driven (seeded conflict) | `e2e/availability.spec.ts` + `e2e/open-capacity.spec.ts:260` | exact |
| `tests/listing/key-facts.test.tsx` | unit (jsdom) | render | `tests/listing/listing-card.test.tsx` | exact |
| `tests/listing/photo-gallery.test.tsx` | unit (jsdom) | render | `tests/listing/listing-card.test.tsx` | exact |
| `tests/search/search-results-states.test.tsx` | unit (jsdom) | render | `tests/search/search-card-open.test.tsx` | exact |
| `tests/search/relaxation-ladder.test.ts` | integration (DB) | CRUD/query | `tests/search/availability-filter.test.ts` | exact |
| `tests/design/price-surface.test.ts` | design gate | source scan | `tests/design/sheet-absent.test.ts` | exact |
| `tests/design/live-regions.test.ts` | design gate | source scan + a11y | `tests/design/sheet-absent.test.ts` + `tests/design/skeleton-a11y.test.tsx` | split analog |

### New files — source

| New file | Role | Data flow | Closest analog | Match |
|---|---|---|---|---|
| `src/lib/design/live-regions.ts` | typed inventory | declaration | `src/lib/design/selector-contract.ts` | exact |
| photo mosaic + lightbox island (`listing/`) | component | presentational + overlay | `src/components/listing/photo-gallery.tsx` (mosaic) + `patterns/responsive-dialog.tsx` (overlay) | split analog |
| key-facts strip (`listing/`) | component | presentational | **no `<dl>` exists in `src/`** — see § No Analog Found | none |
| relaxation band (`search/`) | component | presentational + URL mutation | `search-results.tsx:172-185` (inline block) + `:90-117` (`pushWith`) | role-match |
| collision notice (`booking/`) | component | event-driven | `book-cta.tsx:235-240` | exact |
| `booking/hold-provider.tsx` | provider | pub-sub | `availability-calendar.tsx` `BookingSelectionProvider` (`:82-101`) | exact |
| checkout header countdown slot | component | time-driven | `booking/hold-countdown.tsx` | exact |
| sticky bottom bars (listing + checkout) | component | presentational | **`shadow-sticky` has zero call sites** — see § No Analog Found | none |

### Modified surfaces

| Modified file | Role | The convention an executor must not break |
|---|---|---|
| `src/components/booking/price-breakdown.tsx` | component | Server Component today; C7 grep tripwire; zero arithmetic; `price-total` hook |
| `src/components/availability/availability-calendar.tsx` | component (`"use client"`) | 5 named exports; `AllInTable` is a lookup; `components={{DayButton}}` seam |
| `src/components/ui/calendar.tsx` | vendored primitive | **do not edit** — override via `className` / `components` |
| `src/components/search/search-results.tsx` | component (`"use client"`) | URL is the single source of filter state; `[11-18]` error block is frozen |
| `src/components/booking/book-cta.tsx` | component (`"use client"`) | server sentence is the ruling; one `role="status"`; never imports server-only constants |
| `src/app/listings/[id]/book/page.tsx` + `layout.tsx` | route | layout is an RSC; `brandHref={null}`; owner-gated hold read |
| `src/app/(public)/page.tsx` | route (RSC) | every param through `searchParamsSchema` |
| `src/components/listing/photo-gallery.tsx` | component | **server-safe, no hooks** — the RSC renders it directly |
| `src/lib/booking/all-in-table.ts` | lib | server-only by transitivity via `service-fee.ts` |

---

## Pattern Assignments — Wave 0 Playwright specs

### Shared spine every new e2e spec copies

Six things appear in every green spec in `e2e/` and must appear in every new one. They are the
difference between a gate and a rubber stamp, and each was earned by a watched red.

**1 · Direct-Postgres seed with per-run UUID ids + ordered teardown** — from
`e2e/price-parity.spec.ts:64-73, 155-169`:

```ts
const DATABASE_URL = process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
const hostId = `e2e_pp_host_${randomUUID()}`;      // never a fixed id — two runs must not collide

test.afterAll(async () => {
  // Order is LOAD-BEARING: booking rows first (booker_id is ON DELETE RESTRICT), then the host
  // (cascades listing → photos → hours → tags), then the signed-up booker.
  await sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id = ${listingId})`;
  await sql`DELETE FROM booking WHERE listing_id = ${listingId}`;
  await sql`DELETE FROM "user" WHERE id = ${hostId}`;
  await sql`DELETE FROM "user" WHERE email = ${bookerEmail}`;
  await sql.end();
});
```

**2 · `test.describe.configure({ mode: "serial" })` on any DB-seeding file** —
`e2e/public-listing.spec.ts:34-38` records why: under `fullyParallel` each worker re-runs
`beforeAll`/`afterAll` and the open/close churn intermittently drops the client mid-query
(`write CONNECTION_ENDED localhost:5432`).

**3 · `seedTheme` before the first `goto`, and the both-themes loop** — `e2e/helpers/theme.ts:57-71`,
driven as in `e2e/overflow-320.spec.ts:361-377`:

```ts
const THEMES = ["court", "grove"] as const;
for (const row of ROWS) for (const theme of THEMES) {
  test(`${row.name} · ${theme}`, async ({ page }) => {
    await seedTheme(page.context(), theme);          // context, not page; BEFORE goto
    await page.setViewportSize({ width: FLOOR_PX, height: 800 });
```

**4 · A reachability guard (`tell`) before any assertion** — `e2e/overflow-320.spec.ts:341-353`.
Every assertion in a measurement spec is "a number is small" or "a list is empty", and a blank page
satisfies both. Copy the 15s timeout too — it is a measured allowance for on-demand dev compiles.

**5 · `await page.evaluate(() => document.fonts.ready)` before any `boundingBox()`** —
`e2e/skeleton-geometry.spec.ts:255`. Without it every measurement races webfont metrics.

**6 · The inherited stale-CSS trap, restated in the header** — `e2e/overflow-320.spec.ts:37-43`.
`reuseExistingServer: !process.env.CI`; a dev server left running across a `git checkout` of
`measurements.ts` serves CSS that no longer matches the tree.

---

### `e2e/calendar-hit-area.spec.ts` (rendering, measurement) — BFLOW-05

**Analog: `e2e/skeleton-geometry.spec.ts`.** This is the closest match in the repo and should be
copied almost structurally: it is the only spec whose entire job is a `boundingBox()` comparison in
both themes, and it already carries the tolerance argument and the null-box guard Pitfall 2 needs.

**Copy the box reader verbatim** (`:228-249`) — the null-check is the load-bearing part:

```ts
async function boxOf(scope: Locator, selector: string, label: string): Promise<Box> {
  const target = scope.locator(selector).first();
  await expect(target, `${label}: no element matched \`${selector}\``).toHaveCount(1);
  const box = await target.boundingBox();
  expect(box, `${label}: \`${selector}\` matched but has no layout box (display:none?)`).not.toBeNull();
  return { width: box!.width, height: box!.height };
}

function expectSameBox(shape: string, theme: ThemeName, skeleton: Box, resolved: Box): void {
  const dw = Math.abs(skeleton.width - resolved.width);
  const dh = Math.abs(skeleton.height - resolved.height);
  const detail = `${shape} · ${theme}: … skeleton ${JSON.stringify(skeleton)} resolved ` +
    `${JSON.stringify(resolved)} — Δwidth ${…}, Δheight ${…}`;
  expect(dw, detail).toBeLessThanOrEqual(TOLERANCE_PX);
  expect(dh, detail).toBeLessThanOrEqual(TOLERANCE_PX);
}
```

**Also copy `:309-318`'s two-part shape:** an equality AND the absolute number, asserted separately.
*"Two boxes that agree at 96px are as 'equal' as two that agree at 80, and only one of those is
`ROW_CARD_HEIGHT`."* For BFLOW-05 that means: assert the day cell's height **is 44**, not merely that
it equals the skeleton's.

⚠ **Where the analog does NOT transfer.** `skeleton-geometry.spec.ts` drives `/dev/theme` at ONE
width, and its own NOT-COVERED footer (`:139-149`) names that as its blind spot. AC#14 needs
320/375/768/1280 on a **real seeded listing route**. Take the viewport loop from
`e2e/overflow-320.spec.ts:361-377` and the seed from `e2e/availability.spec.ts` — do not inherit
`/dev/theme`.

---

### `e2e/price-one-fact.spec.ts` (rendering, computed-style identity) — BFLOW-04

**Analogs: `e2e/skeleton-geometry.spec.ts` (the both-themes measurement loop) + `e2e/price-parity.spec.ts` (getting a booker to a hold).**

`price-parity.spec.ts:262-299` is the only path in the repo that walks signup → search → listing →
window → hold → `/book`. Copy it wholesale for the checkout half of the comparison:

```ts
await page.goto(`${BASE}/signup`);
await page.getByRole("radio", { name: "Book a space" }).click();   // intent → canBook (D-41)
…
await page.locator("#search-category").click();
await page.getByRole("option", { name: SPACE_TYPE_LABEL }).click();
await page.locator("#search-submit").click();
await pickWindow(page, "5:00 PM", "6:00 PM");
await page.getByRole("button", { name: "Book this space" }).click();
await page.waitForURL(/\/book\?hold=/);
```

⚠ **The venue-tz day math at `:88-104` and `pickWindow`/`selectTargetDay` at `:171-192` are marked
VERBATIM COPIES, not re-derivations** (`:44-50`): *"Timezone/DST math re-derived per spec is the top
booking-app failure mode (CLAUDE.md), so the rule is 'same math or none'."* Copy them byte-for-byte
into the new spec — the hoist into `e2e/helpers/` is a recorded, unclaimed follow-up.

**Copy `countHook` / `expectReachable` (`:207-232`) for the three-hook assertion.** It is a bounded
poll rather than a locator auto-wait, precisely so "renamed hook" and "slow page" stay
distinguishable. The new spec needs three instances of it — `price-total`, `rail-price-total`,
`sheet-price-total` — each asserted `.toBe(1)`, never `toBeGreaterThan(0)`.

⚠ **Do not touch `e2e/price-parity.spec.ts` itself.** Its header (`:19-25`) states the contract: its
only env input is `DATABASE_URL`, and *"if this spec ever grows to need a second secret, it has left
D-35's boundary and must be SPLIT."*

---

### `e2e/mobile-booker-path.spec.ts` (viewport) — RESP-02 / BFLOW-06

**Analog: `e2e/overflow-320.spec.ts` for the viewport harness; `e2e/shell.spec.ts:236-269` for the
width-loop-inside-one-test shape.**

The `RouteRow` table (`overflow-320.spec.ts:205-224`) is the right shape for the surfaces this spec
sweeps — each row carrying its own `tell`, and a `null` path carrying a **named** skip reason:

```ts
type RouteRow = {
  readonly name: string;
  readonly path: ((page: Page) => Promise<string | null>) | string | null;
  readonly skip?: string;   // Required when `path` is null — a silent skip is not a skip.
  readonly tell: string;    // A selector only THIS route renders.
};
```

Copy `firstListingPath` (`:193-203`) — the memoised, discovered listing id — rather than hardcoding a
seed row; the comment records that memoisation was worth four tests' whole 30s budget.

⚠ **The "exactly one availability request per day selection" AC has NO analog.** See § No Analog Found.

⚠ **AC#20 ("one `Book` button at 375 and at 1280") must use `getByRole`, never `getByTestId`** —
`12-RESEARCH.md` § Pattern 1 measured why: Playwright's role queries exclude a11y-hidden elements, so
the `max-lg:hidden` copy will not satisfy `=== 1` by accident; a testid query **would** find it.

---

### `e2e/collision-in-place.spec.ts` (seeded conflict) — STATE-07

**Analog: `e2e/availability.spec.ts`** — it is the only spec that seeds a *confirmed booking over a
specific hour on a single-unit listing* so that hour renders `aria-disabled`, which is exactly the
STATE-07 fixture. Its header (`:1-21`) states the whole recipe; `:125` is the booking insert.
`e2e/open-capacity.spec.ts:260` is the drop-in twin (`sold-out`).

**The spec's own idiom for reading a calm status region** — `open-capacity.spec.ts:455`:

```ts
const chip = page.getByRole("status").filter({ hasText: /Spots available|Only \d+ left|Fully booked/ });
```

⚠ **The "exactly one live region" AC:** count `getByRole("status")` **and** `getByRole("alert")`
across the whole document, and assert the total, not a per-selector count.
`book-cta.tsx:235-240`'s notice and the new collision notice must never both be mounted.

⚠ **The `23P01` leak assertion has an existing idiom to copy** — `e2e/error-leak.spec.ts`. Use it
rather than writing a fresh `expect(body).not.toContain(...)`.

⚠ **The seeded conflict must be created BETWEEN the booker's window selection and their Book click**,
or the hour renders struck-through on first paint and the collision never happens. There is no analog
for mid-test seeding; the closest is `open-capacity.spec.ts`'s serial cases where *"each case asserts
the state the previous one left behind"* (`:21`).

---

### `e2e/photo-lightbox.spec.ts` (e2e + a11y) — BFLOW-03

**Analog: `e2e/public-listing.spec.ts`.** Smallest, cleanest seeded-listing spec in the repo
(`:29-38` ids, `:40-88` seed, `:90-94` teardown), and it already seeds **three cover-first photos**
(`:68-73`) — the fixture the mosaic-fallback cases need, extended to 1/2/3/4/5/8.

```ts
await sql`
  INSERT INTO "listing_photo" (id, listing_id, public_id, url, position) VALUES
    (${randomUUID()}, ${publishedId}, ${"fitout/e2e/0"}, ${"https://example.com/e2e-0.jpg"}, ${0}),
    …
`;
```
Broken `src` is fine — `price-parity.spec.ts:138` records that *"the `<img>` exists"* is all these
assertions need.

**Focus-return and accessible-name assertions have no e2e precedent in this repo** — the closest
in-repo statement of the contract is `patterns/responsive-dialog.tsx:139-146`, which makes `title` a
required `string` because *"a dialog with no accessible name is a WCAG 4.1.2 failure and Radix warns
about it at runtime."* Assert the lightbox's computed name via
`page.getByRole("dialog", { name: /Photos of / })`, and assert it is **not**
`[data-testid="responsive-dialog"]` (RESEARCH § Validation Architecture, BFLOW-03 row).

---

### `e2e/zero-result-relax.spec.ts` (e2e) — STATE-03

**Analog: `e2e/price-parity.spec.ts:277-285`** — the only spec that drives the real search bar and
waits on the resulting URL:

```ts
await page.locator("#search-category").click();
await page.getByRole("option", { name: SPACE_TYPE_LABEL }).click();
await page.locator("#search-submit").click();
await page.waitForURL(new RegExp(`category=${SPACE_TYPE}`));
```

⚠ **Pitfall 6's resolution changes what AC#30 reads.** There is no chip component. The assertion
compares the **`SelectTrigger`'s rendered value string** (`search-bar.tsx:379-394`, `id="search-radius"`,
renders `{r} km`) against the band's changed-constraint substring. Locate by `#search-radius`, the
same `page.locator("#search-…")` idiom `price-parity.spec.ts` already uses for the category select.

⚠ **Undo needs the `relax=0` suppression flag decided first** (Pitfall 5 / Open Question 2), or the
"band unmounts" assertion is unsatisfiable. This is a **planner decision, not an executor one**.

---

## Pattern Assignments — Wave 0 Vitest files

### `tests/listing/key-facts.test.tsx` and `tests/listing/photo-gallery.test.tsx`

**Analog: `tests/listing/listing-card.test.tsx`.** Same directory, same jsdom pragma, same stubs.

```ts
// @vitest-environment jsdom            ← line 1, ALWAYS. vitest.config.ts's env is `node`.

vi.mock("next/link", () => ({
  default: ({ href, children, ...rest }: { href: string; children: React.ReactNode }
    & React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a href={href} {...rest}>{children}</a>,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
```
Header comment `:12-14` states the rule: *"`next/link` is stubbed to a plain anchor (App-Router
context is absent in jsdom)."*

**For the lightbox half of `photo-gallery.test.tsx`, add the ResizeObserver stub** from
`tests/availability/availability-calendar.test.tsx:62-68` — Radix primitives measure themselves and
jsdom implements no `ResizeObserver`:

```ts
class ResizeObserverStub { observe(){} unobserve(){} disconnect(){} }
globalThis.ResizeObserver = globalThis.ResizeObserver ?? (ResizeObserverStub as unknown as typeof ResizeObserver);
```

**Assertion style — find by visible label, never by class or DOM position**
(`availability-calendar.test.tsx:159-162`):

```ts
/** The available hour's chip — found by its own visible label, never by class or DOM position. */
function availableChip(): HTMLElement {
  return screen.getByText(AVAILABLE_LABEL).closest("button") as HTMLElement;
}
```

⚠ **`key-facts.test.tsx`'s `Units · 1 of N` rule (D-43) needs a NEGATIVE assertion**, in
`search-card-open.test.tsx`'s form — that file's whole design is asserting the absence of a claim
(`/\d:/` over the whole rendered text). The equivalent here: assert `4 courts` never appears **bare**
anywhere in the rendered strip.

---

### `tests/search/search-results-states.test.tsx` — STATE-03

**Analog: `tests/search/search-card-open.test.tsx`.** Same directory, same pragma, and its header
(`:26-66`) is the model for the *"written FIRST against unchanged `src/`, with the observed RED
recorded verbatim"* discipline this repo expects of a new red-anchor test.

`search-results.tsx` is `"use client"` and calls `useRouter` — stub `next/navigation` exactly as
`listing-card.test.tsx:34` does, and stub `next/link` for the cards it renders.

**Cold start (D-54) is asserted as a DOUBLE ABSENCE:** no band, no escape hatch. Use the
"regression pin" structure `search-card-open.test.tsx` case (9) uses — a case that stays green while
the new cases go red is what proves the new cases measure the new thing and not a broken render.

---

### `tests/search/relaxation-ladder.test.ts` — STATE-03 (integration, needs Docker)

**Analog: `tests/search/availability-filter.test.ts`.** Exact match: same directory, same
`searchListings` under test, same isolated-schema harness, same deterministic clock.

```ts
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { user, hostPayout, listing, operatingHours, availabilityBlock, booking } from "@/lib/db/schema";
import { searchParamsSchema } from "@/lib/validation/booking";
import { searchListings } from "@/lib/search/query";

const MANILA = "Asia/Manila";
const DATE = "2026-08-03";                                   // a Monday (dow 1) in every timezone
const NOW  = new Date("2026-07-15T00:00:00.000Z");           // ~19 days out → all slots future & in-horizon
```
⚠ `NOW` is **threaded as a parameter**, never taken from the wall clock (`:9-10`) — the ladder's rung
3/4 assertions depend on slot past/horizon state being deterministic.

**Seed from the canonical helper, not ad hoc** — `tests/helpers/seed.ts`. Its header states the
contract: it is *"the CANONICAL source of the search seed set's coordinates + their expected
great-circle distances,"* and `seed_listing_5` is deliberately ≈15.3 km out — **beyond the 10 km
default radius, which is exactly rung 1's fixture**. `seed_listing_4` is a gym tagged `basketball`,
which is the fixture for "the activity is never relaxed".

---

## Pattern Assignments — Wave 0 design-gate files

### `tests/design/price-surface.test.ts` — BFLOW-04

**Analog: `tests/design/sheet-absent.test.ts`.** It is the repo's canonical *source-absence* gate and
carries every guard a new one needs.

**Copy the four-part spine** (`:155-297`):

```ts
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { resolve, join, relative } from "node:path";
import { stripComments } from "./helpers/strip-comments";

/** WINDOWS PATH NORMALISATION — load-bearing rather than cosmetic. `path.relative` emits
 *  backslashes on this box; without this every prefix filter stops matching and every zero
 *  passes vacuously. */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

/** The scanner must open at least this many files before a zero means anything. */
const MIN_COMPONENT_FILES = 50;

// Comments stripped FIRST — the real files explain the hazard in prose, and a scan that
// counted prose would demand they stop explaining themselves.
const lines = stripComments(readFileSync(file, "utf8")).split("\n");
```

**Take the declared-exception-map shape from `Z_SHEET_INVENTORY` (`:197`)** — an empty
`Record<string, string>` whose emptiness IS the assertion, and where *"a row without a reason is not
a row."* That is the right shape for "`Est.` appears nowhere".

⚠ **This file is the FIRST committed test of the D-42 grep tripwire.** Measured this session: the two
whole-source greps guarding `price-breakdown.tsx` exist only as `<verify>` bash greps in Phase-7/11
plans — **there is no test file enforcing them today**, contrary to RESEARCH § Validation
Architecture's "existing grep-tripwire test ✅". Building it is net-new work, and it inherits the
tripwire's own rule: **the forbidden phrases may not be spelled contiguously in the test either**.
Encode them the way `payout-sweep.ts:63-66` does — *"spells the name in two pieces so the tripwire
does not trip on its own documentation"*. The three C7 phrases are enumerated in
`.planning/milestones/v1.0-ui-specs/07-UI-SPEC.md:413`.

⚠ **"Zero arithmetic in `price-breakdown.tsx`" needs an AST walk, not a regex.** The analog is
`tests/design/skeleton-measurements.test.ts:205-239` (`ts.createSourceFile` + `forEachChild`), whose
header records the reason directly: `price-breakdown.tsx` *"now explains at length why it must NOT"*
do the thing under test, and a text scan reports every such comment as a violation
(`card-pattern-coverage.test.ts:685`).

---

### `tests/design/live-regions.test.ts` + `src/lib/design/live-regions.ts` — GATE-03

**Analog for the module: `src/lib/design/selector-contract.ts`.** Copy its shape exactly — a const
tuple + a **total `Record`** over the derived union, with a mandatory `why`:

```ts
export const SELECTOR_IDS = [ "price-total", … ] as const;
export type SelectorId = (typeof SELECTOR_IDS)[number];
export type SelectorRow = { readonly why: string; readonly owner: string };
export const SELECTOR_CONTRACT: Record<SelectorId, SelectorRow> = { … };
```
Its header (`:19-36`) records the **observed** TS2741 red from deleting one row — that is the compile
gate the plan should watch, not assume. Do **not** use `Partial<Record<…>>` or an index signature;
`:35-36` states they *"would have compiled silently and shipped a hook nobody had declared a reason for."*

**For a type-level count assertion, copy `src/lib/design/visual-baselines.ts:628-636`:**

```ts
export type BaselineCountIsTwentySeven = Assert<
  (typeof VISUAL_BASELINES)["length"] extends 27 ? true : false
>;
```

**Analog for the accessible-name scan: `tests/design/skeleton-a11y.test.tsx`.** It is the precedent
that a `tests/design/**` file may be `.tsx` with `// @vitest-environment jsdom` on line 1 and still
run under the DB-free `vitest.design.config.ts`.

⚠ **The measured fact that shapes every new live region** (`skeleton-a11y.test.tsx:16-34`), and it is
GATE-03 rule 5's mechanism:

```
<div role="status"><span class="sr-only">Loading spaces</span></div>   → accessible name ""
the same div plus aria-label="Loading spaces"                          → "Loading spaces"
```
`role="status"` is `nameFrom: author`. Every new region needs **both** an `aria-label` (the NAME) and
an `sr-only` child (the live region's CONTENT). They are different mechanisms.

⚠ **`dom-accessibility-api` is never imported directly anywhere in this repo** — measured. It is used
*through* `@testing-library`'s `{ name }` option (`skeleton-a11y.test.tsx:163-165, 211`).
VALIDATION.md's "jsdom + `dom-accessibility-api`" should be read as that idiom, not a new import.

⚠ **`live-regions.test.ts` is doing two incompatible jobs.** A `.ts` source scan cannot compute
accessible names, and a `.tsx` render cannot scan files it does not import. Split it, or name the
file `.test.tsx` and do the scan in the same file — `sheet-absent.test.ts` shows the scan half,
`skeleton-a11y.test.tsx` the render half. Decide this in the plan, not at the keyboard.

---

## Pattern Assignments — new source modules

### The photo mosaic + lightbox island

**Mosaic analog: the shipped `src/components/listing/photo-gallery.tsx`.** Keep everything its header
(`:1-9`) claims — *"Presentational + server-safe (no hooks) so the public detail RSC can render it
directly"*, plain `<img>` on the stored Cloudinary `secure_url`, `AspectRatio` so the grid never
reflows, and the zero-photo branch at `:22-33`.

**Overlay analog: `src/components/patterns/responsive-dialog.tsx:184-208`** — for the two Radix
mechanics that are easy to get wrong, both of which the lightbox inherits:

```tsx
// Radix wires `aria-describedby` to its own generated id unconditionally, then warns when no
// Description renders under it. The documented opt-out must be spread CONDITIONALLY: JSX keeps a
// key whose value is `undefined`, so a ternary would strip the wiring in BOTH branches.
const describedBy: { "aria-describedby"?: undefined } = description ? {} : { "aria-describedby": undefined };
…
<DialogContent data-testid="…" className={…} {...describedBy}>
  <DialogHeader className={hideTitle ? "sr-only" : undefined}>
    <DialogTitle>{title}</DialogTitle>
```

⚠ **The lightbox is NOT `ResponsiveDialog`** (D-45) — it is a raw `ui/dialog` at full screen. But it
must copy `ResponsiveDialog`'s **required-title discipline** and its **`max-sm:` sizing style**
(`:107-122` uses `max-sm:` variants only, never a JS breakpoint). And `sheet-absent.test.ts:222`
scans for `/\[\d+vh\]/` — use `dvh`, and do not quote the banned unit in a comment.

### The relaxation band

**Analog: `search-results.tsx:90-117`** for the URL seam, and `:172-185` for an inline announced
block that is deliberately not an `EmptyState`:

```ts
/** Mutate the current params and navigate (soft push) so the RSC re-runs the search. */
const pushWith = React.useCallback((mutate: (p: URLSearchParams) => void, opts?: { resetPage?: boolean }) => {
  const p = new URLSearchParams(queryString);
  mutate(p);
  if (opts?.resetPage) p.delete("page");
  const qs = p.toString();
  startTransition(() => router.push(qs ? `/?${qs}` : "/"));
}, [queryString, router]);
```
Undo is one more `pushWith`. ⚠ `onShowNearby` at `:112-116` is the **all-at-once** broadener D-52
replaces — delete it, do not extend it.

### The collision notice

**Analog: `book-cta.tsx:150-161` (the branch) and `:235-240` (the render).** The branch's comment is
the rule the new notice must not silently break:

```ts
// taken / sold-out / not-bookable / invalid — calm neutral notice + refresh the calendar so it
// reflects reality. … The sentence itself comes from the server, which is also where the claim
// decided it — a second copy here would be a second source of truth, and the one that drifts is
// always the one nobody is looking at.
setNotice(result.error);
setPending(false);
if (result.reason === "taken" || result.reason === "sold-out") router.refresh();
```
```tsx
{notice && (<p role="status" className="text-center text-sm text-muted-foreground">{notice}</p>)}
```
⚠ **D-55 deliberately departs from that stated rule** (RESEARCH § Pattern 8 item 2 / assumption A5).
The plan must record the departure at the call site: *the server sentence is the ruling; the named
window line is a restatement of the booker's own selection.* Never `23P01`, never red, never
`assertive`, and the old `role="status"` notice must unmount when the collision notice mounts.

### `booking/hold-provider.tsx`

**Analog: `BookingSelectionProvider` / `useBookingSelection`, `availability-calendar.tsx:82-101`** —
the repo's one existing client context that a server-rendered subtree is wrapped in.
For the shape and the bidirectional-context finding, **see `12-RESEARCH.md` § Pattern 5.**

### The checkout header countdown slot

**Analog: `src/components/booking/hold-countdown.tsx:59-88`** — already the GATE-03 model, and the
two changes D-49 needs are surgical:

```tsx
const announcement = expired
  ? "Your hold has expired."                       // ← D-49 REMOVES this arm (rule 6: HoldExpiredState owns it)
  : remaining <= FINAL_MINUTE_MS && remaining > FINAL_MINUTE_MS - 1000
    ? "One minute left to confirm your booking." : "";
…
<p role="timer" aria-live="off" …>
  <span className={cn("tabular-nums", finalMinute && "text-destructive")} suppressHydrationWarning>
    {formatRemaining(remaining)}
  </span>
</p>
<p className="text-xs text-muted-foreground">We&apos;re holding this slot while you review.</p>  {/* ← moves to the rail */}
<span className="sr-only" aria-live="polite">{announcement}</span>
```
Keep the `onExpireRef` callback-ref pattern (`:38-57`) and `suppressHydrationWarning` (`:76`) — both
carry their reason inline.

---

## Modified surfaces — the local convention an executor must not break

| File | Convention, quoted from the file |
|---|---|
| `booking/price-breakdown.tsx` | *"Pure display, no hooks → a Server Component (no `"use client"`)"* (`:45`, the sentence Pitfall 1 makes false). **`data-testid="price-total"` is its only hook; three frozen money props; zero arithmetic.** Its C7 grep tripwire (`:26-31`) binds every copy edit **including comments**. |
| `availability/availability-calendar.tsx` | `"use client"`; five named exports (`BookingSelectionProvider`, `useBookingSelection`, `AvailabilityCalendar`, `RailSelectionSummary`, `RailPassSummary`) — external call sites depend on all five. `allIn: AllInTable` replaced `serviceFeeBps: number` **on purpose** (`:317-329`): *"Now nothing about the fee — not the rate, not the formula — is shipped at all."* |
| `ui/calendar.tsx` | **Never edited.** Overrides go through `className` (the `--cell-size` variable) or `components={{ DayButton }}` (`availability-calendar.tsx:249-258`). `classNames` is spread LAST at `:134`, so that path *replaces* rather than merges. |
| `search/search-results.tsx` | `"use client"`; the URL is the single source of filter state. **The inline fetch-error block (`:172-185`) is frozen** — `[11-18]` ruled it one-action and permanent, and it carries a 19-line comment saying so. `ResultsGrid` (`:56-70`) is where `RESULT_GRID_GAP` lands (D-57). |
| `booking/book-cta.tsx` | `"use client"`; renders `result.error`, never imports the server constant. One `role="status"`. `resume=1` auto-fire at `:177-183` — the D-59 "way back" link **must not carry it**. |
| `booking/reserve-view.tsx` | `"use client"`; owns the expiry swap; renders `<PanelCard sticky>` (`:88-92`) and receives `breakdown` as a **prop**, not an import. Header: *"Container swap only — Phase 12 owns the checkout redesign."* |
| `listings/[id]/book/layout.tsx` | Stays a **Server Component**. `SiteChrome brand="FitOut" brandHref={null}` at `:59`. Wrapping `{children}` in a client provider does not client-ify the page. |
| `(public)/page.tsx` | Every param through `searchParamsSchema.safeParse` — the new `relax` flag and the searched-window parse included (RESEARCH § Security V5). |
| `listing/photo-gallery.tsx` | Server-safe, no hooks. Prefer keeping it that way and adding a sibling client island (RESEARCH § Pattern 2). |

---

## Repo-Wide Conventions an Executor Will Trip On

### 1 · The `data-testid` gate is BIDIRECTIONAL and total

Both directions are asserted, and both fail `npm run build`:

- **Rendered but undeclared** — `tests/design/selector-contract.test.ts:420-432`. Adding
  `data-testid="collision-notice"` without a row is a build failure naming file, line and value.
- **Declared but not rendered** — `:442-462`. *"A hook nobody renders is a promise the contract makes
  on the tree's behalf and the tree does not keep… Ship the id or delete the row — the row is the claim."*
- **The complement check** — `:472-484` names both sets at once, because *"one of each is almost
  always ONE RENAME."*

⚠ **Consequence for plan sequencing:** a testid row and the component that renders it must land in
the **same commit**. A plan that declares Phase-12's ids up front, the way Phase 11's `owner` column
allowed, is red from the moment it lands. That allowance was discharged by plan 11-22 and is gone.

Adding a row also requires a non-decorative `why` (`selector-contract.ts:150-158`): *"A row whose
reason is 'so we can select it' is a row that should not exist."*

### 2 · Measurements, contrast pairs and baselines are the same shape

| Inventory | File | What a new value costs |
|---|---|---|
| Box classes | `src/lib/design/measurements.ts` | A literal `h-`/`w-`/`aspect-`/`size-`/`min-*`/`max-*` in any `patterns/*skeleton*.tsx` is banned by an **AST walk over string literals** (`skeleton-measurements.test.ts:139, 192-203`). `aspect-*` is banned in **every** form, named ratios included. |
| Colour pairs | `src/lib/design/contrast-pairs.ts` | 40 declared pairs + exclusions; every exclusion needs a stated reason. |
| Baselines | `src/lib/design/visual-baselines.ts` | Adding a row breaks `BaselineCountIsTwentySeven` under `tsc --noEmit` **in the same commit** (`:628-631`). |

⚠ `src/lib/design/**` sits **outside** the DS-13 leak gate's scanned tree
(`src/app/**` + `src/components/**` only) but **inside** Tailwind's `source("../")` root at `src/` —
`measurements.ts:22-26`: a "tidier" home outside `src/` *"would compile, typecheck, pass every gate —
and ship skeletons with no height."*

### 3 · `server-only` / GATE-05 boundary

`npm run build` = `lint && test:design && next build`. A `server-only` violation, a raw hex, an
arbitrary px type size, an undeclared testid or a literal box class in a skeleton all fail it today.
For what the widened `AllInTable` and the client-flipped `PriceBreakdown` must preserve, **see
`12-RESEARCH.md` § Pitfall 1 and § Code Examples.**

### 4 · Two Vitest configs, and one of them must stay DB-free

`vitest.design.config.ts` owns `tests/design/**` and has **no `globalSetup` and no `setupFiles`** —
deliberately, because it runs inside `next build`. Never add either key. Anything needing Postgres
goes under `tests/<area>/` with `tests/helpers/db.ts`.

### 5 · Clock-relative dates, never calendar literals

`availability-calendar.test.tsx:97-105`: *"Clock-relative, never a calendar literal: a hardcoded month
would eventually stop being the month react-day-picker renders."* Integration tests thread a fixed
`NOW` instead (`availability-filter.test.ts:24`). Several files (`open-capacity-replay.test.ts:75`,
`open-capacity-hours-rekey.test.ts:75`) carry their own tripwire forbidding a calendar-shaped literal.

### 6 · Every new gate carries a guard-the-guard and a watched red

Non-negotiable house style, and the reviewer will look for it:
- **Guard-the-guard first** — a file floor / element floor / token floor before any "is empty"
  assertion (`sheet-absent.test.ts:174-175`, `skeleton-measurements.test.ts:283-298`,
  `overflow-320.spec.ts:118-128`, `skeleton-a11y.test.tsx:141-148`).
- **A watched red, recorded verbatim in the header, with its blast radius** — every analog read for
  this map has one. `skeleton-geometry.spec.ts:108-136` is the model: the mutation, the exact error
  text, the pass/fail split, and "reverted".
- **A NOT COVERED footer** stating real blind spots *"so the next reader under-trusts this file"*.

---

## No Analog Found

Four items have nothing in the repo to copy. These are the plan's real risk.

| Item | Role | Data flow | Why no analog |
|---|---|---|---|
| `page.clock` (in `e2e/hold-countdown.spec.ts`) | e2e | time-driven | **Measured: zero occurrences of `page.clock` anywhere in `e2e/`.** Playwright 1.60.0 supports it (v1.45+). The only reference material is `12-RESEARCH.md` § Code Examples ("Freezing the clock" and "The announce-once assertion") and `playwright.dev/docs/api/class-clock`. ⚠ The docs' caveat is load-bearing: *install the clock BEFORE navigating.* Phase 11 recorded that no baselined surface rendered a clock and that the first one that does must add the freeze. |
| A request **counter** (`e2e/mobile-booker-path.spec.ts` AC#21) | e2e | request interception | The only `page.route` use in the repo is `e2e/helpers/served-document.ts:76`, and it *fulfills* documents rather than counting. Copy its install-then-`await ready`-then-goto ordering (`overflow-320.spec.ts:394-400`) but the counting predicate is net-new. ⚠ Server actions POST to the **current route URL** with a `Next-Action` header — filter on the header, not on a path, and **verify the header name against a real request before relying on it**. |
| The key-facts `<dl>` strip | component | presentational | Measured: no `<dl>`/`<dt>`/`<dd>` pattern exists in `src/`. Nearest neighbours are the amenity/meta rows on `(detail)/page.tsx` and `search-result-card.tsx:183-245`, neither of which is a definition list. The `<dl>` is a genuinely new markup shape and its a11y (one `<dt>`/`<dd>` pair per cell, the 2×2 collapse below 700px) has nothing to inherit. |
| `shadow-sticky` sticky bars | component | presentational | Phase 11 recorded `shadow-sticky` at **zero call sites** and named Phase 12 as the successor. Its `-1px` y-offset is an **upward** cast — `tests/design/elevation-z.test.ts` asserts it never appears on a top header. `--z-sheet` must stay at zero call sites (`sheet-absent.test.ts:197`); sticky bars are `z-(--z-sticky)`. See `12-RESEARCH.md` § Pattern 6. |

**Also net-new, though partially inheritable:** the committed enforcement of the D-42 grep tripwire
(§ `tests/design/price-surface.test.ts`) — no test enforces it today, only plan-time `<verify>` greps.

---

## Metadata

**Analog search scope:** `e2e/**` (16 specs + 3 helpers + 2 visual specs), `tests/**` (all 21 area
directories), `src/components/**`, `src/lib/design/**`, `src/lib/search/`, `src/app/listings/**`,
`src/app/(public)/`.

**Files read in full or in targeted ranges this session:** 24 —
`e2e/skeleton-geometry.spec.ts`, `e2e/overflow-320.spec.ts`, `e2e/price-parity.spec.ts`,
`e2e/public-listing.spec.ts`, `e2e/shell.spec.ts` (200-440), `e2e/helpers/theme.ts`,
`e2e/helpers/served-document.ts`, `e2e/availability.spec.ts` (head),
`tests/booking/reserve-actions.test.tsx`, `tests/availability/availability-calendar.test.tsx`,
`tests/design/skeleton-a11y.test.tsx`, `tests/design/sheet-absent.test.ts` (120-299),
`tests/design/skeleton-measurements.test.ts` (120-299), `tests/design/selector-contract.test.ts`
(418-490), `tests/listing/listing-card.test.tsx` (head), `tests/search/search-card-open.test.tsx`
(head), `tests/search/availability-filter.test.ts` (head), `tests/helpers/seed.ts` (head),
`src/lib/design/selector-contract.ts`, `src/lib/design/measurements.ts`,
`src/lib/design/visual-baselines.ts` (targeted), `src/components/listing/photo-gallery.tsx`,
`src/components/patterns/responsive-dialog.tsx` (90-209), `src/components/booking/hold-countdown.tsx`,
plus targeted ranges of `search-results.tsx`, `book-cta.tsx`, `availability-calendar.tsx`,
`price-breakdown.tsx`, `reserve-view.tsx`.

**Pattern extraction date:** 2026-08-18
**Line numbers:** as-measured this session. Re-verify any cited line before editing — RESEARCH
§ Pitfall 7 records one CONTEXT/UI-SPEC citation that had already drifted by 62 lines.
