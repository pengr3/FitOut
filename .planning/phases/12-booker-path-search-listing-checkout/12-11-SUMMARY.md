---
phase: 12-booker-path-search-listing-checkout
plan: 11
subsystem: booking
tags: [bflow-06, bflow-07, d-50, d-51, collapsible, registry-add, sticky-bar, gate-05, playwright, jsx-whitespace]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 01
    provides: "STICKY_BAR_HEIGHT / STICKY_BAR_CLEARANCE — the checkout bar's only two numbers, both spent here for the second and last time"
  - phase: 12-booker-path-search-listing-checkout
    plan: 03
    provides: "the checkout's minimal header, the hold context, the ONE way back — lifted out of `summary` here so it can be last at every width — and `e2e/helpers/booker-seed.ts`'s `placeHold`"
  - phase: 12-booker-path-search-listing-checkout
    plan: 04
    provides: "PriceBreakdown as a Client Component with `surface`; the string-literal total hooks"
  - phase: 12-booker-path-search-listing-checkout
    plan: 05
    provides: "the real breakdown on both surfaces, the AST zero-arithmetic scan, and `e2e/price-one-fact.spec.ts`"
  - phase: 12-booker-path-search-listing-checkout
    plan: 10
    provides: "`booking-sticky-bar.tsx` — the box this bar is built from, `hidden` as the duplication mechanism, and the three inventories this plan moves again"
provides:
  - "`ui/collapsible.tsx` — the milestone's ONE registry add, landed under its three conditions with ZERO new npm dependencies"
  - "`PriceDisclosure` — `Price details` + `{N} items`, 44px, Radix-wired aria, hiding the derivation and never the Total"
  - "`PriceBreakdown`'s `itemsDisclosure` boolean — not a third thing `surface` selects, and the item count reads the same booleans the render gates read"
  - "`CheckoutStickyBar` — `shadow-sticky`'s second and FINAL product call site, with the step's set now asserted CLOSED and both members proved bottom-anchored by reading their source"
  - "`ReserveActions` renders two boxes from one state, one action and one lease refusal"
  - "The heading that names the action: `Confirm and pay`, moved on the page and its skeleton in one commit"
  - "BFLOW-07's two strings — the pressed label and the at-rest line both name PayMongo, the amount and all four rails"
  - "`e2e/helpers/overflow.ts` — AC#29's measurement, shared by the seed-free route table and the seeded checkout"
affects: [12-12, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A registry add landed under conditions checked AT THE MOMENT IT LANDS — empty `package.json` diff, re-measured pins, the leak and focus scans — rather than after the consumer exists"
    - "A positive-control COUNT that moves with a new vendored file, so a primitive that leaks nothing is distinguishable from one the walker never opened"
    - "An inventory asserted as a CLOSED SET plus a mechanical property (every member anchors to `bottom-0` and carries no top anchor), rather than a count plus a prose claim about the files"
    - "A booker-facing sentence carrying an amount written as ONE template literal, because JSX text around an expression loses a space when the line wraps"
    - "A collapsed-region gate asserted three ways: the trigger's `aria-expanded`, the derivation's ABSENCE from the document, and the Total's ANCESTRY outside the region"

key-files:
  created:
    - "src/components/ui/collapsible.tsx"
    - "src/components/booking/price-disclosure.tsx"
    - "src/components/booking/checkout-sticky-bar.tsx"
    - "e2e/helpers/overflow.ts"
  modified:
    - "src/components/booking/price-breakdown.tsx"
    - "src/components/booking/reserve-actions.tsx"
    - "src/components/booking/reserve-view.tsx"
    - "src/app/listings/[id]/book/page.tsx"
    - "src/app/listings/[id]/book/loading.tsx"
    - "src/lib/design/selector-contract.ts"
    - "tests/design/leak.test.ts"
    - "tests/design/elevation-z.test.ts"
    - "tests/design/brand-recipe.test.ts"
    - "tests/booking/reserve-actions.test.tsx"
    - "tests/booking/partial-grant-notice.test.tsx"
    - "e2e/mobile-booker-path.spec.ts"
    - "e2e/overflow-320.spec.ts"
    - "e2e/price-parity.spec.ts"
    - "e2e/search-and-book.spec.ts"
    - "e2e/open-capacity.spec.ts"
    - "e2e/hold-countdown.spec.ts"
    - "e2e/shell.spec.ts"
    - "e2e/helpers/booker-seed.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "The disclosure is wired through a NEW BOOLEAN on `PriceBreakdown` rather than through `surface`. That file's header forbids `surface` growing to select a third thing, and the reason is that the moment it decides a row, an order or a figure, BFLOW-04's one-fact claim stops being a property of the code. `itemsDisclosure` changes no row, order, weight or figure — the same three lines, in the same order, with the same classes, inside a region that can be closed"
  - "The item count lives in `price-breakdown.tsx`, not at the call site, because the only place that knows how many lines rendered is the place that decides whether each one renders. It is built by FILTERING a list of the two render-gate booleans rather than by summing them: a `+` in any subtree touching a money prop is a violation by the AST scan's definition, and rightly so"
  - "The disclosure is NOT breakpoint-scoped. A JS media query is banned on this path, a second rendering would put two run lines in one document, and `forceMount` plus a CSS override of Radix's `hidden` forks the block this milestone vendored so as not to fork one. The desktop consequence is logged in deferred-items with the shape of the cheapest honest fix"
  - "The confirm control is DUPLICATED (`max-lg:hidden` inline, `lg:hidden` in the bar) rather than folded into a `BookCta`-style layout fork, and the brand inventory records that honestly at 22 rather than staying at 21. A map that reports one accent where a browser paints two is measuring the wrong thing; the accent BUDGET is untouched because the two are mutually exclusive"
  - "`overflow-320.spec.ts` stayed seed-free and the MEASUREMENT moved instead. `deferred-items.md` warns by name against a fifth DB-seeding spec sharing one Postgres; adding two seeded cases to a 26-case table would have made the cheapest gate in the suite depend on the flakiest thing in it"
  - "`e2e/price-parity.spec.ts` is NOT byte-unmodified this time, and the one byte is a heading pin the plan explicitly instructed to move. Its env surface is still `DATABASE_URL` alone (one `process.env` reference) and it is green"

patterns-established:
  - "Check a vendored block's landing conditions BEFORE writing its consumer — the revert is one command while the file has no callers"
  - "A grep for shipped copy must be case-INSENSITIVE and must include regex spellings: three assertions pinning this plan's heading were spelled `/review and book/i` and a case-sensitive literal grep found none of them"
  - "When a plan says a string is pinned somewhere, RUN the suite rather than grep it — every one of the four shipped assertions this plan moved was found by a red test, not by a search"

requirements-completed: [BFLOW-06, BFLOW-07]

# Metrics
duration: 3h05m
completed: 2026-08-18
---

# Phase 12 Plan 11: One Vendored Block, a Bar That Owns No State, and a Space That Disappeared Into a Line Break — Summary

**Checkout now hides how the price was built and never what it is — the derivation behind a 44px `Price details` disclosure built from the milestone's one registry add (zero new npm dependencies, three conditions checked as it landed), the Total outside it and byte-equal to a fixed confirm bar that owns no state and calls no action of its own — and the booker is told the amount, the rails and the destination before they leave, in a sentence that had to become a template literal because JSX silently ate the space between the amount and the word `on`.**

## Performance

- **Duration:** ~3h05m (20:55 → 24:00)
- **Tasks:** 3
- **Files:** 4 created, 19 modified (+1,370 / −208)

## Task Commits

1. **Task 1: Vendor the collapsible block under its three conditions, and build the disclosure** — `26ddcf8` (feat)
2. **Task 2: Single-column checkout and its sticky confirm bar** — `b3256c6` (feat)
3. **Task 3: Name the destination, and gate the mobile checkout** — `0719761` (feat)

## The registry add and its three conditions

Checked **before any consumer existed**, which is the whole point of the ordering: a revert is one command while the file has no callers.

| # | Condition | Result |
|---|---|---|
| 1 | `git diff --stat package.json` is EMPTY | **EMPTY.** Also `package-lock.json`: empty. `grep -n "@radix-ui/react-" src/components/ui/collapsible.tsx` → **no matches**; the block's only Radix import is `import { Collapsible as CollapsiblePrimitive } from "radix-ui"`, the single-package form `popover.tsx` and `dialog.tsx` already use. **ZERO new npm dependencies.** `components.json`'s `registries` is still `{}` |
| 2 | `tests/design/dark-scope.test.ts`'s two pins, re-measured | **UNCHANGED, delta 0.** Before: 44 occurrences / 13 files with hits. After: **44 / 13**. Neither pin was touched. The plan predicted this and it held — the fetched block contains **zero Tailwind classes** and therefore zero dark variants. ⚠ The UI-SPEC's figure of 54 is wrong and RESEARCH Pitfall 10 already recorded it; the numbers above were read off the file, not off the document |
| 3 | The leak and focus-recipe scans over the new file | **Both green, and one inventory moved.** No raw hex, no arbitrary type size, no half-alpha ring — the block carries no classes at all. But `leak.test.ts`'s positive control pins the vendored-primitive COUNT, which went **30 → 31**, moved in the same commit with the reason at the row and the new file named beside the count |

**Why condition 3's number had to move at all, stated because it looks like a formality and is not.** The real assertion in `leak.test.ts` is `toEqual([])` over the violations, and that did not move — the block leaks nothing. The count is the guard-the-guard: *a new primitive that leaks nothing is indistinguishable, to a violations list, from a new primitive the walker never opened.* Moving it is what ADMITTED the file to the gate rather than letting it appear quietly beside it.

## The measured findings

### 1. A space disappeared into a line break, on the money surface, and only the browser saw it

Task 3's at-rest line was written as ordinary JSX text around the amount:

```jsx
<p className="text-center text-xs text-muted-foreground">
  You&apos;ll pay {totalLabel} on PayMongo — card, GCash, Maya or QR Ph. We&apos;ll bring you
  straight back.
</p>
```

The rendered `textContent`, read off a real Chromium:

```
"You'll pay ₱993.99on PayMongo — card, GCash, Maya or QR Ph. We'll bring you straight back."
```

**No space between the amount and `on`.** A JSX text child that SPANS LINES has the leading whitespace of its first line stripped, so the space separating the expression from the next word went with the wrap. The sentence this replaced never hit it because it fitted on one source line.

Three things make this worth recording rather than just fixing. It is **invisible in the source** — the space is right there, on the same line as the expression. **No source gate can see it**: the leak scan, the copy greps, the AST money scan and `tsc` are all perfectly happy. And it is **on the one sentence that names an amount a booker is about to be charged**, where a missing space is the difference between a figure and a typo.

The fix is a single template literal — one text node, no JSX whitespace semantics at all — and the derivation is written at the element. It was found by the new e2e reading the rendered DOM, which is exactly the layer 12-UI-SPEC assigns this kind of claim to.

### 2. Four shipped assertions pinned copy this plan changed, and a case-sensitive grep found NONE of them

The plan says: *"where a test pins a string this phase changes, THE TEST MOVES IN THE SAME COMMIT."* A literal `grep -rn "Review and book"` returned only prose comments and the two render sites, so Task 2 was committed believing nothing pinned it. Three assertions did:

```
e2e/open-capacity.spec.ts:680   getByRole("heading", { name: /review and book/i })
e2e/price-parity.spec.ts:295    getByRole("heading", { name: /review and book/i })
e2e/search-and-book.spec.ts:277 getByRole("heading", { name: /review and book/i })
```

All three spell it **lower-case inside a regex**. A fourth, found the same way, was the old at-rest copy in `tests/booking/partial-grant-notice.test.tsx:334` (`You'll pay ₱367.50 now`).

**Every one was found by a red test, not by a search.** The rule this leaves behind: when a plan says a string is pinned somewhere, RUN the suite — a grep for shipped copy has to be case-insensitive AND has to anticipate regex spellings, and even then it will miss `/confirm & pay/i` written as `/^Confirm & pay$/`.

### 3. Duplicating the confirm control moved a fourth inventory, and hiding that would have been the wrong answer

The checkout action is now rendered twice — inline in the rail (`max-lg:hidden`) and in the bar (`lg:hidden`) — with `hidden` leaving exactly one reachable per width. `brand-recipe.test.ts` counts `variant="brand"` call sites and went **21 → 22**.

12-10's own note in that file celebrates the opposite outcome: `BookCta`'s `layout` fork *"stayed at 1 because its layout fork changes that button's size and width and never duplicates the element."* The same spelling was available here — one `<Button>` in a local layout component, rendered twice — and it was **rejected**: it would have held this number at 21 while the rendered document carried two coral buttons either way. A map that reports one accent where a browser paints two is measuring the wrong thing. Both notes now sit beside each other in that file, and the contrast is the record.

D-21's accent BUDGET is untouched, and that was checked rather than assumed: the two are mutually exclusive at every width, so a booker never sees two coral controls on this route.

### 4. The reassurance line and the refusal notice stay in the panel; only the CONTROL moves

A 64px bar has room for a label and an amount. The sentence naming the amount, the rails and the destination — BFLOW-07's at-rest half — belongs beside the money it describes, and the lease-refusal `role="status"` belongs where the booker is already reading.

So `ReserveActions` renders the panel's box (the inline control, the sentence, the notice) AND the bar, from ONE `pending`, ONE `handleConfirm`, ONE `confirmBooking` call site and ONE live region. `grep -rn "confirmBooking" src/components/booking/` finds exactly one call — `reserve-actions.tsx:106` — and one import; every other hit is prose. This is the same shape D-49 used when the countdown left the rail: **the words stay, the control moves.**

The residual, stated rather than hidden: a booker refused by the lease on a phone gets the notice in the panel, above the bar they pressed. It is a `role="status"`, so it is announced; it is not beside the thumb.

### 5. `shadow-sticky`'s "no top header" rule stopped being prose

The step's set is now asserted as a **closed set of two product surfaces** — an equality, not a floor — and the rule the map exists for is **measured** rather than restated: every file carrying `shadow-sticky` is read, and must contain `bottom-0` and must not carry a top anchor.

Every previous version of that block named the files and trusted a reader to check what they are. `/listings/[id]/book` renders a top header of its own (SHELL-03's minimal chrome) and is exactly the surface a future edit would reach for.

### 6. The way back was in the wrong place on a phone, and had been since 12-03

12-03 put the one labelled way back LAST inside `summary` — last on a desktop. On a phone the rail stacks BELOW the summary, so the escape hatch sat **between the booker and the price they came to check**. It is now `ReserveView`'s own slot, placed with one class (`lg:row-span-2` on the rail) plus grid auto-placement: DOM order is mobile reading order, and at `lg:` the rail spans both rows so the link falls into the cell directly under the summary — byte-identically where it has always rendered on a desktop. The grid container's class string is unchanged, and `shell.spec.ts`'s `<main>`-holds-exactly-one-anchor case is green.

## Watched reds (all run, all reverted, tree clean after each)

| # | Gate | Mutation | Observed |
|---|---|---|---|
| A | `reserve-actions.test.tsx` case (5) | the pressed label reverted to `Taking you to checkout…` | **1 failed / 5 passed** — `` expected 'Taking you to checkout…' to contain 'PayMongo' ``, with the message naming the shipped defect |
| B | `reserve-actions.test.tsx` case (4) | the at-rest line reverted to the shipped `…{total} now — cards, GCash, Maya, or QR Ph. Payments are processed securely.` | **1 failed / 5 passed** — `` expected 'You\'ll pay ₱735.00 now — cards, GCas…' to contain 'PayMongo' `` |
| C | `reserve-actions.test.tsx` case (6) | a `role="dialog"` interstitial with a `Yes, take me to PayMongo` button inserted in the pending state — D-51's exact refusal | **1 failed / 5 passed** — `` expected [ <div role="dialog" …> ] to have a length of +0 but got 1 ``, on the `baseElement` scan that exists because a Radix dialog portals out of the component's own subtree |
| D | `mobile-booker-path.spec.ts` checkout case | `PriceDisclosure`'s `children` moved to sit BESIDE `CollapsibleContent` instead of inside it — a disclosure that renders a trigger and hides nothing | **1 failed / 1 did not run** — `` court · checkout · 375px: the run line is in the document with the disclosure collapsed. The trigger is then decoration, and BFLOW-06's single-column claim is unmet on the surface it is stated for. Expected: 0 Received: 1 `` |

⚠ **"1 did not run" in D is `mode: "serial"`**, not a blind spot — the grove arm is exercised by every green run. All four reverted; `git diff` clean on `src/` after each.

**Probe C is the one that will earn its keep.** D-51 refuses an interstitial for a reason that is easy to forget and easy to override with good intentions: a fifteen-minute hold is expiring while the booker reads the confirmation, and pressing a terminal action IS the decision. A dialog is the single most likely thing a future well-meaning change adds to this surface.

## Accomplishments

- **BFLOW-06 is a measurement.** At 375px, in both themes: the bar is exactly **64px** with its bottom edge on the viewport's at `scrollY === 0` and a ≥44×44 action; the disclosure's trigger reports `aria-expanded="false"`; the run line and the `Service fee` line are **absent from the document** (Radix unmounts closed content); `price-total` is present and **`closest('[data-testid="price-disclosure"]')` is null** — the Total's position outside the region is asserted as ANCESTRY, which is the structural claim, rather than as visibility, which on an 812px phone is a question about scroll position; and the bar's text **contains the Total byte-for-byte**.
- **Expanding it was measured too, in both directions.** The run and fee lines appear, the Total does not move UP the page, it stays outside the region, and its own string is unchanged.
- **BFLOW-07's two strings both name PayMongo**, plus the amount and all four rails, and the negative half — no dialog, no additional control in the pressed state — is asserted with the same seriousness. The claim stops exactly where the repository says it must: `Confirm & pay` opens a hosted checkout, the tail is un-automatable, and the button is never pressed in a spec.
- **AC#23's checkout row now covers the RESOLVED body.** `overflow-320.spec.ts` measures this route pre-hydration and its own row now says what that cannot see; the resolved checkout — bar, disclosure, breakdown — is measured at **320px in both themes** through the SAME `expectNoOverflow`, in the spec that already mints a hold. Zero offenders.
- **The disclosure trigger is a `Button`**, so 44px (`size="touch"`, D-22) and the one app-wide DS-05 focus recipe arrive by composition rather than restatement, and `aria-expanded`/`aria-controls` are Radix's — hand-written nowhere.
- **Four inventories moved with the code, each with the reason at the row:** vendored primitives 30 → 31, `shadow-sticky` 13 → 14 named sites with the product half now a closed set of two, `z-(--z-sticky)` 12 → 13, brand 21 → 22.
- **`ui/sheet.tsx` is still absent**, `--z-sheet` still has zero call sites, `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 files), and `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` is **empty**.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] The disclosure could not be composed without a prop on `price-breakdown.tsx`**

- **Found during:** Task 1, before writing the consumer.
- **Issue:** `price-breakdown.tsx` is not in the plan's `files_modified`, but it renders the itemised lines AND the Total in one tree. Wrapping the whole component collapses the Total (forbidden); reaching into its DOM with structural CSS (`[&>div>div:first-child]`) is brittle against a money surface; re-rendering the lines outside it is a second money surface and a `price-one-fact` violation. There is no composition that satisfies "the derivation collapses, the Total never does" from outside the file.
- **Fix:** one optional boolean, `itemsDisclosure`, defaulting `false`. It is deliberately **not** a third thing `surface` selects — that file's header forbids it, and the reason survives: no row, order, weight or figure changes, only whether the same subtree sits inside a region that can be closed. The two render gates were lifted to named booleans so the item count and the lines read the SAME conditions, and the count is built by filtering rather than summing so the AST zero-arithmetic scan stays absolute.
- **Files:** `src/components/booking/price-breakdown.tsx`, `src/app/listings/[id]/book/page.tsx`
- **Verification:** `price-surface.test.ts` green (19 passed, unchanged); `price-one-fact.spec.ts` green; the rail and sheet render byte-identically (no call site passes the prop).
- **Committed in:** `26ddcf8`

**2. [Rule 1 - Bug] `partial-grant-notice.test.tsx`'s negative assertions went vacuous**

- **Found during:** Task 1 (`npx vitest run tests/booking` → 2 failed).
- **Issue:** two cases read the run line and the `Extra guests` line, which are now behind the collapsed disclosure. The two POSITIVE assertions failed loudly — but the same file's NEGATIVE ones (`not.toContain("/hr ×")`, `queryByText(/Extra guests/)` is null) would have gone green for free against a region that is not in the document. A gate deleting itself while reporting success is worse than one failing.
- **Fix:** `renderPage` presses the disclosure's real trigger, so every assertion in the file reads the tree it was written against. The collapsed state is asserted where it can be measured — 375px, in a browser.
- **Committed in:** `26ddcf8`

**3. [Rule 1 - Bug] `book/loading.tsx` would have announced a different screen than the one arriving**

- **Found during:** Task 2, grepping for the heading.
- **Issue:** the skeleton renders the `<h1>` verbatim. Changing only the page ships a flash of `Review and book` followed by `Confirm and pay`.
- **Fix:** moved in the same commit, with the duplication's OTHER consequence (a reachability guard built on this h1 passes against the skeleton) restated in its header. Three e2e files quote the heading in prose and were corrected too — a stated reason that has quietly become false is worse than no reason.
- **Files:** `src/app/listings/[id]/book/loading.tsx`, `e2e/helpers/booker-seed.ts`, `e2e/hold-countdown.spec.ts`, `e2e/shell.spec.ts`
- **Committed in:** `b3256c6`

**4. [Rule 1 - Bug] The at-rest line lost a space to JSX's line-wrap rule** — finding 1 above. Committed in `0719761`.

**5. [Rule 1 - Bug] Four shipped assertions pinned copy this plan changed** — finding 2 above. `e2e/price-parity.spec.ts:295`, `e2e/search-and-book.spec.ts:277`, `e2e/open-capacity.spec.ts:680` (the heading) and `tests/booking/partial-grant-notice.test.tsx:334` (the at-rest copy). Committed in `0719761`.

**6. [Rule 1 - Bug] `Total` as exact text now resolves to two elements, and the drop-in run line moved behind the disclosure**

- **Found during:** Task 3's suite run. `search-and-book.spec.ts:281` and `open-capacity.spec.ts:691` both call `getByText("Total", { exact: true })` — a strict-mode violation now that the bar renders its own `Total` label. `open-capacity.spec.ts:690` reads the per-person run line, which is inside the collapsed region.
- **Fix:** `.first()` on both `Total` reads (the breakdown's label is first in the DOM; the bar's is `lg:hidden` at those viewports), each with the reason at the site. The run line's case **presses the disclosure** rather than weakening the assertion — OC-08's claim is about that line's WORDING, which is only checkable against the line.
- **Committed in:** `0719761`

### Scope adjustments recorded rather than absorbed

- **Seven files outside `files_modified` were edited**, each because a gate or an acceptance criterion required it: `price-breakdown.tsx` and `book/loading.tsx` (deviations 1 and 3), `tests/design/leak.test.ts` (condition 3's count), `tests/design/brand-recipe.test.ts` (the duplicated accent), `tests/booking/partial-grant-notice.test.tsx` (deviations 2 and 5), and three e2e specs plus a helper carrying moved pins and stale prose.
- **`e2e/price-parity.spec.ts` is NOT byte-unmodified**, which every plan since 12-03 has been able to say. One line changed — the heading pin the plan explicitly instructed to move — with a note at the site. **Its env surface is unchanged**: `grep -c "process.env"` is still **1** (`DATABASE_URL`), and it is green.
- **The overflow MEASUREMENT was extracted to `e2e/helpers/overflow.ts` rather than a seeded row being added to `overflow-320.spec.ts`.** The plan says to extend that table; `deferred-items.md` warns by name against a fifth DB-seeding spec sharing one Postgres, and that table is a 26-case gate whose whole design principle is that it needs no fixture. The substance of the AC is delivered — the resolved checkout is measured at 320px in both themes with zero offenders — in the spec that already mints a hold, through one shared definition of the assertion. Both files say so at the site.
- **The disclosure is not breakpoint-scoped**, so the desktop rail collapses too. Logged in `deferred-items.md` with the three rejected alternatives and the shape of the cheapest honest fix (`defaultOpen` threaded from the RSC) if UAT wants it open.
- **12-07's mosaic item named 12-11 as its owner and was NOT paid.** Logged with the reason and re-homed to whichever plan next opens `mobile-booker-path.spec.ts`'s listing half.
- **`price-breakdown.tsx`'s itemised block keeps its original indentation** inside the new `items` const. Re-indenting is cosmetically tidier and makes the diff on a UAT-passed money surface far noisier than the change; the inner lines are byte-identical, which is a stronger thing to be able to say.

**Total deviations:** 6 auto-fixed (five Rule 1, one Rule 3). **No new dependency, no migration, no change to booking/payment/capacity/availability logic, and no money computation moved.**

## Issues Encountered

- **`e2e/public-listing.spec.ts:385`'s draft-404 is still RED and still pre-existing** — measured by 12-02, proved by 12-08 to survive a production build. Its `serial` scope accounts for the 4 that did not run in the full suite.
- **`e2e/shell.spec.ts:558` failed the full-suite run at a 2.0m timeout and passes in isolation** (19 passed, the SHELL-03 anchor case at 8.7s). This is the cross-file contention flake `deferred-items.md` records at [12-02]/[12-03]/[12-10]. Checked rather than assumed, because this plan MOVED the anchor that case counts: the recorded trio (`open-capacity + shell + search-and-book`) is **28 passed**, byte-identical to the figure 12-06, 12-07, 12-08, 12-09 and 12-10 all recorded.
- **`e2e/open-capacity.spec.ts` case 4 failed once in a two-file invocation and passed 6/6 in isolation**, with no code change between. Same family.
- **The `resend error … Invalid \`to\` field` lines in the WebServer log during the new checkout cases are expected** — the seeded booker signs up with an `@example.com` address, which Resend refuses in test mode. Pre-existing behaviour of `signUpBooker`, unrelated to this plan.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-11-SC | mitigated, and each condition checked at the moment it landed | `git diff --stat package.json` **empty**; only Radix import is the `radix-ui` single package; `components.json` `registries` still `{}`; the `dark:` pins re-measured at 44/13 with a delta of 0; the leak and focus scans run over the file and its vendored-primitive count moved with it |
| T-12-11-DOUBLECHARGE | accepted, and now stated at the call site | The `disabled`/`aria-disabled` pair is annotated as a courtesy in `handleConfirm`, naming the probed `Idempotency-Key` finding and pointing at the server-side lease + expire-before-create. Both boxes read ONE `pending`; `grep -rn "confirmBooking" src/components/booking/` finds one call and one import |
| T-12-11-ORMBUNDLE | mitigated | `reserve-actions.tsx` renders `result.error` and imports nothing from `checkout-lease.ts`. ⚠ A RAW grep for the constant returns **1** hit — the header paragraph forbidding the import, exactly the grep-versus-comment collision this phase has now met fourteen times. The checkable form is the IMPORT scan: `grep -n "^import.*CHECKOUT_IN_FLIGHT_MESSAGE\|checkout-lease" ` returns two prose lines and no import statement |
| T-12-11-REDIRECTNAME | mitigated | The client NAMES `PayMongo` and never constructs a URL; `confirmBooking` mints and redirects. The un-automatable tail is routed to human UAT and the spec says so rather than faking it |
| T-12-11-HIDDENTOTAL | mitigated, and the mitigation was watched failing | The Total is outside the collapsible, asserted by ANCESTRY at 375px with the region collapsed, and the bar's amount contains it byte-for-byte. Watched red D |
| T-12-11-STICKYHEADER | mitigated, and the rule is now mechanical | `elevation-z.test.ts` asserts the product set is exactly two, and READS each file to prove it anchors to `bottom-0` and carries no top anchor — replacing a prose claim about which files those are |

## Known Stubs

None. Every figure the disclosure, the breakdown and the bar render is server-supplied: the frozen `quotedTotalCents` / `spacePriceCents` / `serviceFeeCents` off the booking row, formatted once in `book/page.tsx` by a single `formatMoney` call whose output is threaded to both the breakdown and the bar. `PriceDisclosure` reads no money value at all — its only input is a line COUNT. The `itemsDisclosure` default of `false` is the shipped behaviour for every non-checkout surface, not a placeholder.

## Threat Flags

None. No new network endpoint, no new auth path, no new file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire green inside `npm run build`). GATE-05 untouched: no money computation moved, the AST zero-arithmetic scan is unchanged and green over `price-breakdown.tsx`, and the one new money-bearing surface receives a finished string and formats nothing.

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 41 design test files, 749 passed / 3 skipped, `✓ Compiled successfully in 19.6s`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` (whole suite) | **1278 passed / 4 skipped, 139 files** |
| `npx vitest run tests/booking/reserve-actions.test.tsx` | **6 passed** (3 shipped + the 3 BFLOW-07 cases) |
| `npx playwright test e2e/mobile-booker-path.spec.ts` | **8 passed** (6 shipped + the 2 checkout cases) |
| `npx playwright test e2e/overflow-320.spec.ts e2e/price-parity.spec.ts` | **19 passed / 8 skipped** |
| `npx playwright test e2e/price-parity.spec.ts` | **1 passed**; `grep -c "process.env"` still **1** |
| `npx playwright test e2e/open-capacity.spec.ts` | **6 passed** |
| `npx playwright test e2e/shell.spec.ts` | **19 passed**, including SHELL-03's one-anchor case |
| `npx playwright test open-capacity + shell + search-and-book` | **28 passed** — matches 12-06 / 12-07 / 12-08 / 12-09 / 12-10 exactly |
| `npx playwright test --project=chromium` (full) | 111 passed / 2 failed / 8 skipped / 4 did not run — the draft-404 standing red and one contention flake, both accounted for above |
| `git diff --stat HEAD~3 HEAD -- package.json package-lock.json` | **empty** |
| `grep -n "@radix-ui/react-" src/components/ui/collapsible.tsx` | **no matches** |
| `components.json` `registries` | **`{}`** |
| `dark:` pins in `tests/design/dark-scope.test.ts` | **44 occurrences / 13 files, before and after — delta 0** |
| `shadow-sticky` class call sites under `src/` | **2** (`booking-sticky-bar.tsx:167`, `checkout-sticky-bar.tsx:80`) + `/dev/theme`'s ladder row + the `globals.css` token |
| `data-testid="price-disclosure"` / `"checkout-sticky-bar"` in `src/` | **exactly 1 each**, both string literals in JSX attributes |
| `grep -rn "confirmBooking" src/components/booking/` | **one call site** (`reserve-actions.tsx:106`) and one import; every other hit is prose |
| `src/components/ui/sheet.tsx` | **absent** |
| `ls drizzle/*.sql \| sort \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| port 3000 after the run | **clear** (no LISTENING socket) |

## Next Phase Readiness

- **12-12 / 12-13 (GATE-03's file count)** — `DeclaredFileCountIsNine` is **untouched**. This plan added a component (`checkout-sticky-bar.tsx`) that renders no live region: the bar's confirm shares `ReserveActions`' one `role="status"`, which is already declared. 12-10's predicted ladder (Ten in 12-12, Eleven in 12-13) still holds.
- **`shadow-sticky` is CLOSED at two product surfaces**, asserted as an equality plus a per-file bottom-anchor check. A third bar is now a deliberate inventory edit with a mechanical rule to satisfy, not a free choice. `z-(--z-sticky)` is at 13 and `--z-sheet` still at zero.
- **Anyone editing `PriceBreakdown`** — `surface` still selects exactly two things and `itemsDisclosure` selects exactly one, which is whether the derivation can be closed. If a future surface needs the region open by default, thread a `defaultOpen` from the RSC; do not fork the component and do not widen `surface`.
- **Anyone writing booker-facing copy that embeds a value** — write it as ONE template literal. Finding 1 is a space that vanished into a JSX line wrap on a sentence naming an amount, invisible to every source gate.
- **Anyone changing shipped copy** — run the suite; do not trust a grep. Four assertions this plan had to move were spelled in regex forms a literal search could not find.
- **Visual baselines** — the three including `/listings/[id]` were already stale after 12-10; `/listings/[id]/book` now joins them (a new fixed bar, a collapsed price region, a moved heading, 80px of bottom clearance). Still **not minted locally** (`updateSnapshots: "none"` unconditional, the `visual` project not created off Linux — D-28/D-29). Regenerate in the pinned Linux dispatch job.
- **Human UAT owns the redirect tail.** Everything up to and including "the booker is told the amount, the rails and the destination" is asserted. What PayMongo shows them next, and whether the return lands where the copy promises, is not automatable from Playwright and is not pretended to be.

**No blockers.** Two pre-existing reds remain logged; neither was introduced or aggravated here.

## Self-Check: PASSED

- Files: `12-11-SUMMARY.md`, `src/components/ui/collapsible.tsx`, `src/components/booking/price-disclosure.tsx`, `src/components/booking/checkout-sticky-bar.tsx`, `e2e/helpers/overflow.ts`, `src/components/booking/price-breakdown.tsx`, `src/components/booking/reserve-actions.tsx`, `src/components/booking/reserve-view.tsx`, `src/app/listings/[id]/book/page.tsx`, `src/app/listings/[id]/book/loading.tsx`, `src/lib/design/selector-contract.ts`, `tests/design/leak.test.ts`, `tests/design/elevation-z.test.ts`, `tests/design/brand-recipe.test.ts`, `tests/booking/reserve-actions.test.tsx`, `tests/booking/partial-grant-notice.test.tsx`, `e2e/mobile-booker-path.spec.ts`, `e2e/overflow-320.spec.ts` — **18/18 FOUND**
- Commits: `26ddcf8`, `b3256c6`, `0719761` — **3/3 FOUND**
- Artifact `contains` checks: `price-disclosure` string literal in `price-disclosure.tsx` ✓ · `checkout-sticky-bar` string literal in `checkout-sticky-bar.tsx` ✓ · both declared in `SELECTOR_CONTRACT` with `owner: "12-11"` ✓
- Key links: `reserve-actions.tsx` → `src/app/actions/booking.ts` via `confirmBooking`, with `PayMongo` named in both the pressed label and the at-rest line ✓ · `price-disclosure.tsx` → `ui/collapsible.tsx` via `Collapsible` / `CollapsibleTrigger` / `CollapsibleContent` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
