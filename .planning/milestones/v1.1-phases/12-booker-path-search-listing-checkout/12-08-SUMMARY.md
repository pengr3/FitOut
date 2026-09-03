---
phase: 12-booker-path-search-listing-checkout
plan: 08
subsystem: ui
tags: [information-architecture, hydration, discriminator, rsc, dl-markup, pii-allow-list, jsdom, playwright, bflow-02]

# Dependency graph
requires:
  - phase: 12-booker-path-search-listing-checkout
    plan: 02
    provides: "the availability provider on this route and the `notFound()`-returns-200 finding, which this plan's discriminator re-measured against a production build"
  - phase: 12-booker-path-search-listing-checkout
    plan: 06
    provides: "GATE-03's typed declared set and the `availability.spec.ts:261` standing red with its hydration-mismatch log entry — the red this plan's deletion turned green"
  - phase: 12-booker-path-search-listing-checkout
    plan: 07
    provides: "the photo lightbox island (used here as the hydration PROOF before an absence assertion), the AspectRatio-removal precedent, and the 'expectation table in the test, never the component's helper' rule"
  - phase: 11-quality-gates-pattern-layer-app-shell
    provides: "selector-contract.ts (const tuple + TOTAL Record compile gate, bidirectional scan), patterns/panel-card.tsx's `sticky` boolean, SiteFooter (whose own two <h2>s are why the order assertion is scoped)"
provides:
  - "The listing page's six sections in BFLOW-02's order, with availability above the map and cancellation as a section of its own"
  - "key-facts.tsx — the <dl> strip with the 1-of-N unit rule, per-cell border classes computed from index+total, and a >=700px column count as a lookup"
  - "host-block.tsx — a zero-JS host block whose props are a `Pick` of `PublicProfile`, making the D-09 allow-list a COMPILE-TIME fact"
  - "The `[11-13]` discriminator, run both ways on one listing with the site restored AND deleted — a 2x2 matrix rather than a claim"
  - "e2e/public-listing.spec.ts cases (7) and (8): the six headings as ONE ordered array, and a hydration listener guarded by a proof that the page hydrated"
  - "The `listing-key-facts` selector row"
affects: [12-09, 12-10, 12-11, 12-12, 12-13, 12-14]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Run the dev-vs-prod discriminator on the MUTATED tree as well as the fixed one — a 2x2 matrix distinguishes 'the fix worked' from 'the defect was never there in production'"
    - "Two related standing reds on one route are not automatically one investigation: measure each against the discriminator before merging their diagnoses"
    - "Props typed as a `Pick` of the PII allow-list type, so a private column cannot be passed even by accident"
    - "Class logic for a two-layout element computed per cell from index+total, not as ternaries in JSX — the cases interact"
    - "A new spec case declared ABOVE a file's logged serial-blocking red, with the reason at the site, so it is collected rather than reported as 'did not run'"

key-files:
  created:
    - "src/components/listing/key-facts.tsx"
    - "src/components/listing/host-block.tsx"
    - "tests/listing/key-facts.test.tsx"
  modified:
    - "src/app/listings/[id]/(detail)/page.tsx"
    - "src/lib/design/selector-contract.ts"
    - "e2e/public-listing.spec.ts"
    - ".planning/phases/12-booker-path-search-listing-checkout/deferred-items.md"

key-decisions:
  - "The `Cancellation policy` SECTION is gated on the tier, exactly as the rail's line already was. An unconditional heading would print `Cancellation policy` over nothing on a legacy null-tier row, and gating both sites on one value is what keeps them ONE disclosure rendered twice rather than two disclosures that can disagree."
  - "`host-block.tsx` renders a plain image element rather than `ui/avatar.tsx`. The vendored Radix avatar carries the client directive, so importing it would turn static host prose into a client island on the one rail-adjacent route whose streamed/hydrated split this plan was measuring. Same call, same reason, as 12-07 dropping `<AspectRatio>`."
  - "The unit noun map lives in `key-facts.tsx`, not in `listing-vocab.ts`. That module is the authority for values and labels the wizard, the Zod schemas and the search filters all share; this noun has exactly one consumer and exists to make one sentence read like English. A second space-type word list in the shared vocabulary with one caller is the drift risk that module prevents, not a use of it."
  - "`Spots a day` is the FOURTH drop-in cell, not the third. The plan's Task 2 action text says third; its own `<interfaces>` block, the 12-UI-SPEC table and the Copywriting Contract all say fourth, and the acceptance criterion states no ordinal. Three-to-one, and the test asserts the whole label sequence so the choice is visible rather than implied."
  - "The two new e2e cases are declared ABOVE the file's logged draft-404 red. The file is `mode: \"serial\"`, so below it they would be collected, skipped and reported as `did not run` in every whole-file invocation — indistinguishable from a spec nobody wrote."

patterns-established:
  - "When two symptoms sit on one route and a prior plan calls them 'plausibly one investigation', the discriminator is what tests that claim — here it split them"
  - "A whole-text negative assertion must be probed against the CONCATENATED shape `textContent` really produces; `\\b` before a digit does not match after a letter"
  - "An acceptance criterion phrased as a directory grep is wider than the property it names — measure it, report both dispositions, and do not delete another plan's surface to make it green"

requirements-completed: [BFLOW-02]

# Metrics
duration: 132min
completed: 2026-08-18
---

# Phase 12 Plan 08: The Order a Booker Expects, a Cell That Cannot Be Misread, and a Hydration Error That Was Never in Production — Summary

**BFLOW-02's six sections now render in the conventional marketplace order with the refund terms reaching a phone for the first time, the key-facts strip states `1 of 4 courts` where a bare `4 courts` would have been a claim the product does not make — and the `[11-13]` discriminator was run FOUR ways rather than two, which is what turned "we fixed a hydration bug" into two separate, more useful findings: the mismatch was a dev-mode artefact that production never had, and the OTHER standing red on this route, which 12-02 and 12-06 both guessed was the same investigation, survives a production build and is real.**

## Performance

- **Duration:** ~132 min
- **Tasks:** 3
- **Files:** 3 created, 4 modified

## Task Commits

1. **Task 1: The order, the cancellation section, and the host block** — `be121b2` (feat)
2. **Task 2: The key-facts strip and its correctness rule** — `f5da3db` (feat)
3. **Task 3: Measure [11-13] before fixing it, delete its site, and pin the order** — `ab83bff` (fix)

## THE DISCRIMINATOR — run before the fix, and run four ways

The plan's non-negotiable: *"a claim of 'fixed' without those two lines is rejected."* Here are more than two, because two would have produced the wrong finding.

**The instrument.** A durable published-but-not-payable listing was seeded from `e2e/availability.spec.ts`'s own `seedListing` recipe (published, email-verified host, **no** `host_payout` row, weekly 06:00–21:00 hours) so the SAME row could be loaded under both servers. A Chromium probe seeded `localStorage.theme = "court"` — matching `seedTheme`, and this turned out to be load-bearing — attached `console` and `pageerror` listeners **before** navigating, waited 4s past `networkidle`, and counted messages containing `Hydration failed`. The dev server's own stdout was grepped with the same string as a second, independent channel.

**Exact commands.**

```
# production half
npm run build && PLATFORM_WALLET_NUMBER=… PLATFORM_WALLET_NAME=… npm start
node <probe>.mjs tmp1308_nopay          # counts msgs.filter(m => m.includes("Hydration failed"))

# dev half
npm run dev
node <probe>.mjs tmp1308_nopay
grep -c "Hydration failed" <dev-server-stdout>
```

**The matrix.** Same listing, same theme seed, same probe; the only variables are the server and whether the `TooltipProvider` site is present.

| tree | `npm run dev` | `npm run build && npm start` |
|---|---|---|
| the `[11-13]` site PRESENT (what shipped) | `Hydration failed` **× 1** | **0** |
| the site DELETED (this plan) | **0** | **0** |

**Verbatim, dev, site present** (browser console, captured by the same listener e2e case (8) uses):

```
Hydration failed because the server rendered HTML didn't match the client. As a result this tree will be
regenerated on the client. This can …
```

**Verbatim, dev, site present** (dev-server stdout, `grep -c "Hydration failed"` → **1**), with the tree diff that names the offset:

```
                                  <RailRateHeadline>
                                  <p>
                                  <RailSelectionSummary>
                                  <TooltipProvider>
+                                 <p className="text-center text-xs text-muted-foreground">
-                                 <span
-                                   tabindex="0"
-                                   className="inline-block w-full"
-                                   data-state="closed"
-                                   data-slot="tooltip-trigger"
-                                 >
    at PublicListingPage (src\app\listings\[id]\(detail)\page.tsx:692:13)
```

**Production, site present:** `HYDRATION-FAILED MESSAGES: 0`, `not-bookable button: 1`. Same after the deletion, in both modes.

### Finding 1 — `[11-13]` was a DEV-MODE ARTEFACT, and the fix is still right

The production build never had the mismatch. `[11-13]`, `[11-03]`, `[11-11](a)` and `[11-14]` are therefore **one class and it is a dev-mode class** — Phase 11's four instances resolve together, and its standing hypothesis ("if the mismatch disappears in a production build, the fix is in the specs' locators, not in the pages") is now **ruled in**.

The deletion is still correct on its own merits, and those merits were never the hydration error: a hover-only explanation of why a button is dead is an explanation roughly half this traffic — touch — never receives, which is why D-39 and D-ELM-01 had already refused a tooltip on this path. What is **not** claimed is a production defect repaired.

### Finding 2 — the two standing reds are NOT one investigation, and that is the more valuable half

`deferred-items.md`'s `[12-02]` and `[12-06]` entries both suggest the draft-404 red and the hydration mismatch are *"plausibly one investigation"* of this route's streaming behaviour. The same discriminator, pointed at the other red, came back the other way:

| check | `npm run dev` | `npm run build && npm start` |
|---|---|---|
| `curl -o /dev/null -w "%{http_code}"` on a real DRAFT listing | **200** | **200** |
| the same on an unmatched URL (`/nope-not-a-route`), as the control | 404 | 404 |
| `playwright … public-listing.spec.ts` → `a draft listing 404s to the public` | `Expected 404 / Received 200` | **identical** |

The body is `(detail)/not-found.tsx` in both modes, so T-05-NONPUB's substance holds and it stays a status-line defect. But it **survives the production build**, so it is a real rendering-strategy question that nothing fixing a hydration boundary can close. Both dispositions are written into `deferred-items.md`.

### Finding 3 — what the deletion DID repair, measured

`e2e/availability.spec.ts:261` — *"published-but-not-payable listing: calendar renders read-only"* — has been a **standing red since 12-06**, failing on three consecutive isolated invocations there and again in 12-07's full run. It is **green now**: `npx playwright test e2e/availability.spec.ts --project=chromium` → **4 passed**, and it passed inside the full-suite run too. The mechanism is exactly what the tree diff shows — in dev the regenerated subtree left the `Not bookable yet` button off the hydrated tree, so the spec's locator found nothing. Delete the node, delete the mismatch, delete the symptom.

**The honest framing, stated once:** a dev-only mismatch was making a real test red. The test is now green and the production build is unchanged, because it was never affected.

### Finding 4 — the theme seed is what reproduces it, and a naive probe is green

The first probe run — fresh context, no theme — reported **0** hydration errors in dev on a listing whose e2e sibling was failing in the same minute. Seeding `localStorage.theme = "court"` (what `seedTheme` does, and what `next-themes`' pre-paint script reads) reproduced it every time. A discriminator run without it would have concluded "not reproducible" and the plan would have shipped a fix for a defect it had never seen. Recorded because the naive probe and the correct one are one line apart.

## The other measured findings

### 5. This plan's own negative assertion was VACUOUS, and only the mutation showed it

`tests/listing/key-facts.test.tsx` case (8) scans the whole rendered text for a bare `{N} {noun}`. The obvious spelling was `/(?<!1 of )\b\d+ (courts|rooms|spaces)\b/`. Under the mutation that removes the `1 of ` prefix, **five positive cases went red and case (8) stayed green.**

`textContent` concatenates siblings with no separator, so the strip's real text reads `…Units4 courts` — and there is **no word boundary between the `s` of the label and the `4` of the value**, so `\b\d+` never matches. The pattern is now `(?<!1 of )(?<!\d)\d+\s+(courts|rooms|spaces)\b`, and case (7) pins the concatenated shape itself so the hole cannot reopen. Re-run: **6 failed**, case (8) among them, naming the text it saw.

### 6. A plan acceptance criterion that is a directory grep is wider than the property it names

Task 3 asks that `grep -rln "components/ui/tooltip" src/components/{search,listing,availability,booking} src/app/listings` return nothing, and 12-UI-SPEC's anti-pattern list says *"D-56 deletes the last one."* Measured after the listing page's site was deleted, it returns **two** files:

- **`src/components/listing/photo-uploader.tsx`** — a **HOST** surface (the wizard's photo step), not the booker path at all. The glob is wider than the sentence.
- **`src/components/availability/slot-picker.tsx:169-211`** — genuinely booker path, genuinely a tooltip: every unavailable hour chip is a `TooltipTrigger` whose content is the short reason **plus the notice requirement when there is one**.

**Not deleted here**, and the reasons compound: the file is outside this plan's `files_modified`; the chips already carry the short reason in their `aria-label`, so only sighted pointer users would lose anything; and the notice-requirement half has **nowhere to go** on a wrapping grid of 44px chips — a static line per chip is not a layout that exists. Replacing it is a copy/placement decision on a surface **12-09 already owns** (it opens that file for `SLOT_CHIP_BOX`). Logged with the question stated. So the criterion is **NOT met as written**, and *"D-56 deletes the last one"* is true only of the listing page.

### 7. Two documents disagree about the drop-in strip, three-to-one

Task 2's action text says *"the drop-in variant's third label is `Spots a day`"*. The same plan's `<interfaces>` block, 12-UI-SPEC § The key-facts strip and the Copywriting Contract all place it **fourth** (`Space` · `Booking` · `Day pass` · `Spots a day`), and the acceptance criterion names no ordinal. The fourth position ships, and case (9) asserts the **whole label sequence** rather than one ordinal, so the resolution is visible in the test rather than buried in a diff.

### 8. The heading assertion had to be scoped, and the reason is a shipped component

`SiteFooter` renders its own `<h2>Product</h2>` and `<h2>Legal &amp; support</h2>` inside this route's layout, so an unscoped `<h2>` query on `/listings/[id]` returns **eight** names. Measured: `["About this space","Amenities","Availability","Location","Cancellation policy","Your host","Product","Legal & support"]`. Case (7) scopes to `main` and guards `main` at exactly 1 first, which is also the vacuity check — an empty array cannot silently satisfy an equality against six names.

## Watched reds (all run, all reverted, tree clean after each)

| # | Gate | Mutation | Observed |
|---|---|---|---|
| A | selector-contract, bidirectional | rendered literal → `listing-key-facts-box` | **3 failed / 4 passed**, the set message naming *"Declared-but-absent: [listing-key-facts]. Rendered-but-undeclared: [listing-key-facts-box]"* |
| B | selector-contract, compile pin | the `listing-key-facts` row deleted | `tsc --noEmit` exit 2, one TS2741 naming the id |
| C | `key-facts.test.tsx` | `1 of ${unitCount} ${noun}` → `${unitCount} ${noun}` | **before the regex fix: 5 failed and case (8) GREEN** (finding 5). After: **6 failed**, case (8) printing the concatenated text |
| D | e2e case (7) | the expectation's `Availability` / `Location` swapped | 1 failed, printing BOTH sequences with the one-line diff |
| E | e2e case (8) | the whole `TooltipProvider` + `tabIndex` span restored | 1 failed — and it failed at the CTA-visible guard, which is itself the symptom (finding 3) |
| E2 | the case-(8) listener itself | the same restored tree, probed directly with the theme seeded | `HYDRATION-FAILED MESSAGES: 1` — proof the listener can fail, since E aborted before reaching it |

**A, verbatim:**

```
AssertionError: the ids declared and the ids rendered are not the same set. Declared-but-absent:
[listing-key-facts]. Rendered-but-undeclared: [listing-key-facts-box]. One of each is almost always ONE
RENAME, and the fix is a single edit rather than the two unrelated ones the other assertions' messages
suggest in isolation.
```

**C, after the fix — the message that was silent before it:**

```
AssertionError: the strip rendered "CapacityUp to 12SpacePickleball courtBookingInstantUnits4 courts" —
a unit count without the "1 of " prefix tells a booker the booking includes every unit, which is false of
every listing on this surface: expected 'CapacityUp to 12SpacePickleball court…' not to match
/(?<!1 of )(?<!\d)\d+\s+(courts|rooms|…/
```

## Accomplishments

- **Six sections, measured in a browser, in order.** `["About this space","Amenities","Availability","Location","Cancellation policy","Your host"]` — availability above the map, cancellation as its own section, amenities inside the description slot with the break after the pair.
- **Refund terms reach a phone for the first time.** `CancellationPolicyDisclosure` resolves **twice** on a desktop viewport (`<details>` count = 2, measured) and once below `lg:` where the rail does not exist. Both sites carry the D-46 reason, and both are gated on the same tier value so they can never disagree.
- **The strip collapses where the contract says.** Measured on a real listing at four widths: `w=1280 rows=1 cols="145.5px ×4"` · `w=720 rows=1 cols="171.5px ×4"` · `w=600 rows=2 cols="283px ×2"` · `w=375 rows=2 cols="170.5px ×2"`. The `min-[700px]` arbitrary variant — the first in `src/` — compiles.
- **`1 of N` on real data.** `seed_listing_5` → `Units / 1 of 3 courts`; `seed_listing_1` → `1 of 2 courts`; `uat_listing_bookable` (single unit) → three cells and no `Units` at all.
- **The PII allow-list is a compile-time fact.** `HostBlockProps` is `Pick<PublicProfile, "avatarUrl" | "firstName" | "bio" | "createdAt">`. The imported fields, checked against D-09's list (`avatarUrl`, `firstName`, `bio`, `city`, `createdAt`): **four of five taken, `city` deliberately not** — the listing's own Location section already answers it, and an unread prop is an invitation. `lastName`, `email`, `phone`, `role`, `avatarPublicId` are not on the type this component accepts.
- **No number about the host anywhere.** `grep -rn "APPROVAL_SLA_HOURS" src/components/listing/ "src/app/listings/[id]/(detail)/page.tsx"` → **no matches**, and the constant is not spelled in the comment explaining why (12-07's recorded hazard, seventh site).
- **Zero JavaScript added to the page.** Neither new component carries a client directive or a hook; `grep -c '"use client"' src/components/listing/host-block.tsx` → **0**, same for `key-facts.tsx`. The tooltip deletion **removes** a client boundary from the rail.
- **`grep -n "lucide-react" src/components/listing/key-facts.tsx` → no matches.** The first draft scored 1, on the sentence saying there are no icons.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] The plan's own negative assertion was green for the defect it names**

- **Found during:** Task 2, watched red C. Full analysis in finding 5.
- **Issue:** `\b\d+` cannot match after a letter, and `textContent` produces `Units4 courts` with no separator. Five positive cases fired; the one case written specifically for the bare claim did not.
- **Fix:** `(?<!\d)` in place of the leading `\b`, plus a guard-the-guard line pinning the concatenated shape the strip actually renders, plus the measurement written at the pattern.
- **Files:** `tests/listing/key-facts.test.tsx`
- **Committed in:** `f5da3db`

**2. [Rule 1 - Bug] The `<img>` suppression comment added two lint warnings**

- **Found during:** Task 1, first `npm run build` after the host block landed (9 warnings → 11).
- **Issue:** an `eslint-disable-next-line … -- reason` whose reason continued onto further `//` lines applies the directive to the next COMMENT line, so ESLint reported both an unused directive and the original rule.
- **Fix:** the explanation is prose above; the suppression is its own line immediately before the element, with the mechanism recorded there. Back to the 9 pre-existing warnings.
- **Files:** `src/components/listing/host-block.tsx`
- **Committed in:** `be121b2`

**3. [Rule 3 - Blocking] The new e2e cases were declared into a serial block that skips them**

- **Found during:** Task 3, first whole-file run.
- **Issue:** the file is `mode: "serial"` and carries a logged standing red (`a draft listing 404s to the public`). Declared after it, both new cases were collected, skipped and reported as `did not run` — in CI indistinguishable from cases nobody wrote.
- **Fix:** the block is declared ABOVE that red, with the whole reason at the site including how to undo it once the red is fixed. No shipped case changed order relative to any other, and nothing is suppressed — the red still fails, and the three D-59 cases still need `--grep` exactly as before.
- **Files:** `e2e/public-listing.spec.ts`
- **Committed in:** `ab83bff`

### Scope adjustments recorded rather than absorbed

- **Task 3's tooltip grep criterion is NOT met, deliberately.** Two files still import the primitive; finding 6 gives each its disposition and `deferred-items.md` names **12-09** as the owner of the one that matters. Deleting `slot-picker.tsx`'s tooltip would have removed the notice-requirement text from every sighted user on another plan's surface, to make a directory glob green.
- **`e2e/public-listing.spec.ts`'s seed gained one `UPDATE`** setting `cancellation_policy = 'standard'` on the published listing. Case (7) needs six headings and the seed rows predate the D-77 tier gate; the shipped `INSERT` is byte-unchanged so the addition reads as the dependency it is.
- **The `Cancellation policy` section is tier-gated**, which the plan does not specify. An unconditional heading would print over nothing on a legacy null-tier row, and gating both sites on one value is what keeps the two placements one disclosure.
- **`host-block.tsx` renders a plain image element**, not `ui/avatar.tsx` — see key-decisions. The plan says "presentational, no hooks, no client directive"; importing the vendored avatar would have satisfied the letter and added a client island beside the node this plan was measuring.
- **`keyFactCells` and `keyFactCellClass` are exported** though the plan names no helpers. The first exists so case (17) can tie the derivation to the literal table exactly once; the second so the two-layout border rules are assertable as strings in jsdom, where no CSS compiles.
- **`deferred-items.md` is outside `files_modified`** and was appended to for findings 2 and 6, and to mark `availability.spec.ts:261` resolved so the three older entries treating it as open are not read as current.

**Total deviations:** 3 auto-fixed (two Rule 1, one Rule 3). **No new dependency, no migration, no change to booking/payment/capacity/availability logic, no product copy removed except the duplicated trailing line D-56 names.**

## Issues Encountered

- **`npx playwright test --project=chromium` (full): 91 passed / 3 failed / 6 did not run.** All three accounted for, none caused by this plan:
  - `public-listing.spec.ts:385` — the draft-404 **standing red**, now measured to be real rather than dev-only (finding 2). Its serial scope is what accounts for the 6 that did not run; the three D-59 cases pass under `--grep "D-59"` (**3 passed**).
  - `shell.spec.ts:289` and `price-one-fact.spec.ts:304` — the **cross-file DB-contention flakes** 12-03, 12-05, 12-06 and 12-07 have all logged. Targeted: `open-capacity + shell + search-and-book` → **28 passed** (byte-identical to 12-06's and 12-07's figure); `price-one-fact + hold-countdown + price-parity` → **8 passed** (identical to 12-06's).
  - **`availability.spec.ts:261` is NOT in this list** — it passed inside the full run for the first time since 12-06 logged it.
- **`src/lib/design/measurements.ts` shows as modified in `git status` with an empty diff** — the line-ending artefact 12-06 and 12-07 both recorded. Not staged, not touched.
- **Running `npm start` locally needs `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` inline** (the fail-closed PayMongo guard, exempted only for the build phase). Throwaway values were passed per-process and never written to `.env.local`.

## Threat register disposition

| Threat ID | Disposition | Where it landed |
|---|---|---|
| T-12-08-PII | mitigated, and the mitigation is COMPILE-TIME | `HostBlockProps` is a `Pick` of `PublicProfile`, so a private column is not a name the component accepts. Imported fields vs the D-09 allow-list: `avatarUrl` ✓ `firstName` ✓ `bio` ✓ `createdAt` ✓ `city` **deliberately unused**; `lastName`/`email`/`phone`/`role`/`avatarPublicId` are not on the type |
| T-12-08-FALSECLAIM | mitigated, and the mitigation was REPAIRED before it shipped | Positive `/^1 of \d+ /` across six unit counts, plus a whole-text negative across six variants — whose first spelling was green for the defect and is now pinned against the concatenated shape (finding 5). Watched red C |
| T-12-08-SLAFICTION | mitigated | `grep -rn "APPROVAL_SLA_HOURS" src/components/listing/ "src/app/listings/[id]/(detail)/page.tsx"` → no matches; both reasons (D-96's proportional cap, and no request row on this page) are at the file, with the constant described rather than spelled |
| T-12-08-HYDRATION | mitigated — the producing node is DELETED, not patched | No `TooltipProvider`/`TooltipTrigger` survives in the page; e2e case (8) asserts an empty `Hydration failed` list over a full load, after opening and closing the lightbox to prove hydration ran. Watched reds E and E2. The production-vs-dev discriminator was run FIRST, both ways, on both trees |
| T-12-08-TOOLTIP | mitigated on this page, PARTIAL on the path, and the gap is named | The explanation is a static line asserted `toBeVisible()` with no interaction; the duplicated second line is gone (`getByText(/you can browse now/i)` → 0). `slot-picker.tsx` still imports the primitive — finding 6, deferred to 12-09 with the design question stated |
| T-12-08-SC | mitigated | `git diff --stat package.json` **empty**; zero packages installed |

## Known Stubs

None. Every value the new surfaces render comes from the listing row or the host row: the strip's cells from `occupancyMode` / `bookingMode` / `primarySpaceType` / `maxOccupancy` / `unitCount`, and the host block from `publicProfile(row.user)`. No hardcoded empty values, no placeholder text, no component receiving mock data. The absent-cell cases (`Units` at one unit, `Capacity` with a null occupancy) are real states, not placeholders — the strip renders three cells rather than an empty fourth.

## Threat Flags

None. No new network endpoint, no new auth path, no new file-access pattern, no schema change. `drizzle/` is byte-identical at `0025_audit_resolved_by.sql` (26 `.sql` files; GATE-06's tripwire in `tests/design/infra.test.ts` green inside `npm run build`).

## Verification

| Check | Result |
|---|---|
| `npm run build` | **exit 0** — 41 design test files, 740 passed / 3 skipped, `✓ Compiled successfully`, 0 lint errors (9 pre-existing warnings) |
| `npx tsc --noEmit` | **exit 0** |
| `npx vitest run` (whole suite) | **1275 passed / 4 skipped, 139 files** |
| `npm run test:design` | **41 files, 740 passed / 3 skipped** |
| `npx vitest run tests/listing` | **147 passed / 14 files** |
| `npx vitest run tests/listing/key-facts.test.tsx` | **17 passed** |
| `npx playwright test e2e/public-listing.spec.ts --project=chromium` | 3 passed / 1 failed / 4 did not run — the failure is the logged draft-404 red; **both new cases pass** |
| `npx playwright test e2e/public-listing.spec.ts --grep "D-59"` | **3 passed** |
| `npx playwright test e2e/availability.spec.ts --project=chromium` | **4 passed** — `:261` green for the first time since 12-06 |
| `npx playwright test --project=chromium` (full) | 91 passed / 3 failed / 6 did not run — all accounted for above |
| `npx playwright test e2e/open-capacity.spec.ts e2e/shell.spec.ts e2e/search-and-book.spec.ts` | **28 passed** — matches 12-06's and 12-07's figure exactly |
| `npx playwright test e2e/price-one-fact.spec.ts e2e/hold-countdown.spec.ts e2e/price-parity.spec.ts` | **8 passed** — matches 12-06's figure exactly |
| `grep -rn "TooltipProvider\|TooltipTrigger" "src/app/listings/[id]/(detail)/page.tsx"` | **no matches** |
| `grep -rln "components/ui/tooltip" src/components/{search,listing,availability,booking} src/app/listings` | **2 files** — `photo-uploader.tsx` (host surface) and `slot-picker.tsx` (finding 6, deferred to 12-09) |
| `grep -rn "APPROVAL_SLA_HOURS" src/components/listing/ "…/(detail)/page.tsx"` | **no matches** |
| `grep -n "lucide-react" src/components/listing/key-facts.tsx` | **no matches** |
| `grep -c '"use client"'` in `key-facts.tsx` / `host-block.tsx` | **0 / 0** |
| `data-testid="listing-key-facts"` occurrences in `src/` | **1**, a string literal |
| `tests/design/sticky-offset.test.ts` | passes; the rail is still `<PanelCard sticky>` |
| `<h2>` sequence scoped to `main`, measured in a browser | `About this space · Amenities · Availability · Location · Cancellation policy · Your host` |
| `<details>` count on a desktop viewport | **2** — the section and the rail line (D-46) |
| strip geometry at 1280 / 720 / 600 / 375 | 1 row ×4 · 1 row ×4 · 2 rows ×2 · 2 rows ×2 |
| `git diff --stat package.json` | **empty** |
| `ls drizzle/*.sql \| sort \| tail -1` | `drizzle/0025_audit_resolved_by.sql` (26 files) |
| `grep -n "globalSetup\|setupFiles" vitest.design.config.ts` (comments excluded) | **no matches** |
| port 3000 after the run | **clear** |
| throwaway seed row | **torn down** (`tmp1308_host` and its cascade deleted) |

## Next Phase Readiness

- **12-09 (`SLOT_CHIP_BOX`)** — **owns the last booker-path tooltip.** `slot-picker.tsx:169-211` wraps every unavailable hour chip in a `TooltipTrigger`; the `aria-label` already carries the short reason, but the notice-requirement half exists only inside the hover. The question to answer, stated in `deferred-items.md`: one day-panel line naming the states present, or the `aria-label` expanded into visible text. Do not simply delete it — that removes information from every sighted pointer user.
- **12-11 (`e2e/mobile-booker-path.spec.ts`)** — the strip's 2×2 collapse is measured by a throwaway probe in this SUMMARY and by **no committed assertion**. jsdom compiles no Tailwind, so `tests/listing/key-facts.test.tsx` pins the class strings and nothing more. One `boundingBox()` row-count at 375 and one at 1280 closes it, alongside the mosaic gap 12-07 logged.
- **Anyone adding a section to `/listings/[id]`** — `e2e/public-listing.spec.ts` case (7) asserts the `<h2>` sequence as ONE array scoped to `main`. A new heading fails it by design; add the name to `REQUIRED_HEADINGS` in the same commit, and remember `SiteFooter` contributes two more outside `main`.
- **Anyone reading `deferred-items.md` for this route** — the `[12-02]`, `[12-03]`, `[12-06]` and `[12-07]` entries about `availability.spec.ts:261` are now **history**; two `[12-08]` entries at the top of that group carry the resolution and the split diagnosis. The draft-404 red is the one that is still real, and it is a Rule 4 rendering-strategy decision.
- **Anyone tempted to re-run the `[11-13]` discriminator** — seed the theme. Without `localStorage.theme` the mismatch does not reproduce at all, and a probe that skips it reports a clean page (finding 4).
- **Visual baselines** — the three `/listings/[id]` baselines 12-07 already marked stale are staler: the page's section order changed and a bordered strip was added. Still **not minted locally** (`updateSnapshots: "none"` is unconditional, the `visual` project is not created off Linux — D-28/D-29). Regenerate in the pinned Linux dispatch job.

**No blockers.**

## Self-Check: PASSED

- Files: `12-08-SUMMARY.md`, `src/components/listing/key-facts.tsx`, `src/components/listing/host-block.tsx`, `tests/listing/key-facts.test.tsx`, `src/app/listings/[id]/(detail)/page.tsx`, `src/lib/design/selector-contract.ts`, `e2e/public-listing.spec.ts`, `deferred-items.md` — **8/8 FOUND**
- Commits: `be121b2`, `f5da3db`, `ab83bff` — **3/3 FOUND**
- Artifact `contains` checks: `listing-key-facts` as a string literal in `key-facts.tsx`, exactly 1 occurrence in `src/` outside the contract ✓ · `// @vitest-environment jsdom` on line 1 of `key-facts.test.tsx` ✓ · the 1-of-N rule asserted positively AND negatively ✓ · `host-block.tsx` renders avatar, first name, `Host since {…}`, bio and one mode sentence, from the allow-list only ✓
- Key links: `(detail)/page.tsx` → `key-facts.tsx` via `KeyFacts`, fed from `row.listing` with no `PublicListing` projection change ✓ · `e2e/public-listing.spec.ts` → the page via the six `<h2>`s asserted in document order, containing `About this space` ✓

---
*Phase: 12-booker-path-search-listing-checkout*
*Completed: 2026-08-18*
