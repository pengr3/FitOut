---
phase: 13-confirmation-bookings-trust
plan: 09
subsystem: ui
tags: [trust, privacy, information-disclosure, design-system, closed-set, selector-contract, grep-tripwire, purity]

# Dependency graph
requires:
  - phase: 02-listing-creation
    provides: "publicListing() and THE PRIVACY RULE (D-09) — the anonymous-viewer boundary this plan opens ONE audited exception to, without moving a line of it"
  - phase: 11-design-system-foundation
    provides: "PanelCard (DS-11's boxed panel) and selector-contract.ts's typed, bidirectional inventory"
  - phase: 13-confirmation-bookings-trust
    plan: 02
    provides: "SupportPath — mounted here for the FIRST time in its `trust-row` presentation, the arm 13-02 built the `term` prop for; and the finding that a `why` in selector-contract.ts is a scannable string literal"
  - phase: 13-confirmation-bookings-trust
    plan: 07
    provides: "the finding this plan's second gate is built on — a source scan cannot see what a source scan was not told to look for, so a set-closure claim must be asserted over the RENDERED tree as a count"
provides:
  - "TrustBlock — TRUST-04's closed four-signal set in `full` and `condensed` variants, `data-testid=\"trust-block\"`, every prop server-computed and finished"
  - "bookedListingAddress() — D-91's post-payment address boundary beside publicListing(): the ONE route to a booked listing's exact street, and the composer of the display lines so no call site ever names an address column"
  - "tests/design/trust-signals.test.ts — twelve forbidden tokens in the two-piece idiom over the Phase-13 file set, with a four-part positive control"
  - "The booking detail page's widened listing select (address columns, the toggle, publishedAt, the listing's booking mode) + an inner join to the host, feeding the trust block on all five inline branches"
  - "One declared selector row (trust-block), shipped in the same commit as its literal"
affects: [13-10, 13-11, 13-12, 13-13, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A closed-set claim asserted as an exact ROW COUNT over the rendered tree, beside a token ban — measured to be strictly stronger: the token scan stayed GREEN on a real fifth signal (`Trusted host`) that the count caught"
    - "A forbidden-string scan over AUTHORED COPY (StringLiteral / template chunks / JsxText via an AST walk) rather than raw source — measured, because a raw scan reports ten hits on a clean tree and all ten are comments"
    - "A projection that composes its own DISPLAY LINES, so the column names it guards appear in exactly two places in the product: the projection, and a SELECT clause"
    - "Handing a whole selected row to a boundary (`bookedListingAddress(lst, …)`) instead of picking it apart, so structural typing keeps the column names inside the select"
    - "A test-file self-assertion that re-reads its own source and proves its two-piece encoding holds — which caught the header's ordinary-English use of a banned word on the first run"

key-files:
  created:
    - "src/components/booking/trust-block.tsx"
    - "tests/design/trust-signals.test.ts"
    - "tests/booking/trust-block.test.tsx"
    - "tests/listing/booked-address.test.ts"
  modified:
    - "src/lib/listing-public.ts"
    - "src/app/(app)/bookings/[id]/page.tsx"
    - "src/lib/design/selector-contract.ts"

key-decisions:
  - "The forbidden-signal scan reads AUTHORED COPY, not raw source. Measured first: a raw-text scan of the three roots reports ten hits for one of the twelve tokens and every one is a comment explaining a checked refund window or a guard shape. A gate with a 100% false-positive rate on a clean tree is a gate somebody deletes"
  - "The closed set is enforced TWICE, and the second gate was measured to be necessary: with a fifth `Trusted host` row spliced into the component, `trust-signals.test.ts` reported 6 passed. Only the row COUNT caught it"
  - "`bookedListingAddress()` DUPLICATES publicListing()'s allow-list rather than sharing a helper — because the plan's own verification is that not one line of publicListing moves, and editing the anonymous-viewer boundary in the commit that opens an exception to it is how a privacy rule acquires an exception nobody agreed to. The duplication is pinned by a field-for-field equality assertion across 8 statuses x 2 toggle positions"
  - "The boundary composes the display LINES as well as the fields. Without that, the page would have to name `addressLine1`/`postalCode` at a render site and 'the street is only reachable through this function' would go back to being a convention"
  - "The `trust-block` selector row shipped in TASK 2's commit, not Task 3's as the plan scheduled — the contract is bidirectional and went red the moment the literal existed"
  - "The trust block reads `listing.booking_mode`, NOT the already-selected `booking.booking_mode`: the sentence is a statement about how the SPACE behaves today, not about this booking's creation-time snapshot"
  - "No join was added for the booker's email (D-63). It is the SESSION user's own address and `session.user.email` was already read on this page at line 214"

patterns-established:
  - "A `why` in selector-contract.ts is a string literal — restated here from 13-02 because this plan's OTHER scan does not reach that module, and 'comments are invisible' does not generalise to 'prose is invisible'"
  - "A single-code-point ban cannot use the two-piece idiom (there is no mid-word to split at); a code-point ESCAPE gives the same disarm-proof property, and the encoding assertion proves it rather than assuming it"

requirements-completed: []  # NONE. See "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 31min
completed: 2026-08-20
---

# Phase 13 Plan 09: The Trust Block and the Address Boundary Summary

**The booker-facing trust set is now closed at four signals by two gates that were each measured against the other — the token ban stayed green on a real fifth signal that only the row count caught — and the host's exact street is reachable through exactly one named, pure function that yields the public projection field-for-field on all eight non-booked renders.**

## Performance

- **Duration:** ~31m
- **Started:** 2026-08-20T10:00Z (18:00 +0800)
- **Completed:** 2026-08-20T10:37Z (18:37 +0800)
- **Tasks:** 3 / 3
- **Files:** 4 created, 3 modified

## Accomplishments

- **TRUST-04 is enforced by two gates, and the second one is not redundant — that was measured, not argued.** With a fifth row (`Trusted host`) spliced into the shipped component, `tests/design/trust-signals.test.ts` reported **6 passed**. The token list cannot see a signal nobody thought to list, which is the realistic shape of an invented signal; the exact row COUNT in `tests/booking/trust-block.test.tsx` went red on it immediately. Both directions are recorded in both files' headers so the next author does not "consolidate" them.
- **The forbidden-string scan reads authored copy, and the reason is a measurement.** A raw-text scan of the three Phase-13 roots reports **ten** hits for one of the twelve tokens — `money-statement.tsx:43`/`:99`, `payment-reversed-state.tsx:19`/`:45`/`:157`/`:181`, `support-path.tsx:17`/`:44`, `bookings/[id]/page.tsx:575`, `cancel/page.tsx:413` — and **all ten are comments** saying that a refund window, a webhook behaviour or a guard shape was checked against its source. An AST walk over string literals, template chunks and JSX text is what 13-UI-SPEC actually specifies, and it is clean on this tree.
- **The scan proves it reached something, four ways:** no declared root is empty, every root contributed a non-zero number of `.tsx` files (8 / 34 / 11), the collector extracted more than 100 copy units and reached multi-word JSX text, and **every one of the twelve rows was proved to find its own decoy** in both passes — with the fixtures built from the encoding so the file still spells none of them.
- **`bookedListingAddress()` is the one route to a booked street, and `publicListing()` is byte-unchanged.** The diff on `src/lib/listing-public.ts` is a single additive hunk (`@@ -154,0 +155,192 @@`) with **zero deleted lines**. All eight non-booked renders return the public projection **field for field**, asserted for both positions of the host's toggle.
- **The page names an address column in exactly one place — its SELECT.** `grep -c 'addressLine1\|streetAddress\|postalCode'` returns **2**, both inside the select clause (lines 318, 320), and the render sites consume only `address.lines`, which the boundary composes.
- **The trust block renders on every branch this file renders inline** (`requested`, `approved`, `declined`, `cancelled`, `confirmed`/derived-`completed`) — including the ones that look wrong, which is D-67 — from **one** element built once, so five branches cannot drift into five trust blocks.
- **`SupportPath` gets its first `trust-row` call site.** The arm 13-02 built the `term` prop for is now mounted, unconditionally and without this file testing `SUPPORT_EMAIL` — so the guarded literal stays in the one file that holds the guard. `site-contacts.test.ts` is **green and byte-unchanged**.
- **Zero packages. Zero migrations. Zero new `ALLOWED_RAW_CARD` rows. `ACCENT_USES` untouched. No JS clock read added.**

## Task Commits

1. **Task 1: the TRUST-04 forbidden-signal scan, with a positive control** — `379619b` (test)
2. **Task 2 (TDD): the trust block's closed-set cases, before the component exists** — `04fea57` (test, RED)
3. **Task 2 (TDD): TrustBlock — four signals, two variants, no fifth** — `1f8cb55` (feat, GREEN)
4. **Task 3 (TDD): the address boundary's ten renders, before the boundary exists** — `8ab198e` (test, RED)
5. **Task 3 (TDD): `bookedListingAddress()` and the trust block on every inline branch** — `db9adac` (feat, GREEN)

Neither TDD task needed a REFACTOR commit: the GREEN implementations are the shape the tests were written against.

## Files Created/Modified

- `tests/design/trust-signals.test.ts` — **new**, 6 assertions. Twelve `Forbidden` rows in the two-piece idiom; an AST collector over `StringLiteral` / `NoSubstitutionTemplateLiteral` / template head-middle-tail / `JsxText`; two passes (line-wise, then whitespace-collapsed per file); a four-part positive control; and a self-assertion that re-reads this file and proves the encoding holds.
- `src/components/booking/trust-block.tsx` — **new.** Server Component composing `PanelCard`. `<dl data-testid="trust-block">` with `<dt>`/`<dd>` rows, `text-label` on both sides, `text-muted-foreground` / `text-foreground` ink and **no verdict colour anywhere**. Props required, not optional. Ends with the guarded `<SupportPath variant="trust-row"/>`.
- `tests/booking/trust-block.test.tsx` — **new**, 8 cases. The four copy strings are **retyped from the Copywriting Contract**, not imported, so the test pins the copy instead of comparing the component to itself.
- `tests/listing/booked-address.test.ts` — **new**, 9 cases over all **ten** renders 13-UI-SPEC enumerates, plus a compile-time mutual-assignability gate between the two status unions.
- `src/lib/listing-public.ts` — **+192 lines, −0.** `BookedAddressStatus`, `BookedListingAddressInput`, `BookedListingAddress`, `BOOKED_STATUSES` and `bookedListingAddress()`, under a boundary block that quotes the host-facing control's own sentence.
- `src/app/(app)/bookings/[id]/page.tsx` — widened listing select + inner join to `user`; one derivation block (`displayStatus`, `address`, `hostSinceLabel`, `listingPublishedLabel`, `trustBlock`, `addressRow`); five trust-block mounts; three address rows.
- `src/lib/design/selector-contract.ts` — **+1 row** (`trust-block`, `owner: "13-09"`) with the reason a role query cannot carry it.

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run concurrently** (13-01's operational finding), and no `DATABASE_URL` override was passed.

**Task 1**

| Criterion | Result |
|---|---|
| `npx vitest run --config vitest.design.config.ts tests/design/trust-signals.test.ts` | **6 passed**, exit 0 |
| Positive control asserts a non-zero file count | **per root**: `src/app/(app)/bookings` 8 · `src/components/booking` 34 · `src/components/group` 11 |
| Watched red — a banned literal in `trust-block.tsx` | **observed**, verbatim below. Named the file, **the line** and the `why` |
| `grep -ci 'superhost' tests/design/trust-signals.test.ts` | `0` |
| `grep -c '★' tests/design/trust-signals.test.ts` | `0` (the glyph is a code-point escape) |
| `npx tsc --noEmit` / `npx eslint` | exit 0 / exit 0 |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/trust-block.test.tsx` | **8 passed**, asserting the exact row COUNT for both variants |
| A fifth row must fail the test | **observed** — 4 of 8 cases red; verbatim below |
| `grep -c 'onboardingComplete\|payoutsEnabled' src/components/booking/trust-block.tsx` | `0` |
| `grep -c 'formatMemberSince' src/components/booking/trust-block.tsx` | `0` (see Deviation 2) |
| `npx vitest run --config vitest.design.config.ts tests/design/trust-signals.test.ts` | **6 passed** |
| `tests/design/card-pattern-coverage.test.ts` | passes, **ZERO** new `ALLOWED_RAW_CARD` rows — the file is byte-unchanged |
| `tests/design/site-contacts.test.ts` | **23 passed / 3 skipped**, byte-unchanged |

**Task 3**

| Criterion | Result |
|---|---|
| `npx vitest run tests/listing/booked-address.test.ts` | **9 passed**, including the eight-absent case and the field-for-field equality |
| `grep -c 'addressLine1\|streetAddress\|postalCode' 'src/app/(app)/bookings/[id]/page.tsx'` | `2` — **both inside the select** (lines 318, 320). **Zero outside it** |
| `grep -c 'from "@/lib/db"' src/lib/listing-public.ts` | `0` — the module stays pure |
| `grep -cE 'new Date\(\)\|Date\.now\(\)' 'src/app/(app)/bookings/[id]/page.tsx'` | `0` — the DB-clock rule is intact |
| `tests/design/selector-contract.test.ts` | passes. `Declared-but-absent: [none]` — see the honesty note |
| `npm run build` | **exit 0** |
| `npx tsc --noEmit` | **exit 0** |
| Watched red — the boundary inverted to leak on `approved` | **observed**, verbatim below |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **151 files passed / 1 skipped; 1410 passed / 4 skipped** — exit 0. (13-08 closed at 149 / 1393; **+2 files and +17 tests is exactly this plan's two suites**: 8 + 9.) |
| `npm run test:design` | **45 files, 782 passed / 3 skipped** — exit 0. (13-08 closed at 44 / 776; **+1 file and +6 tests is exactly this plan's one design suite**.) |
| `npm run build` (lint + design gate + next build) | **exit 0** |
| `git diff --stat drizzle/` | **empty**; `ls drizzle/*.sql \| tail -1` → `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git diff --stat package.json package-lock.json` | **empty — zero packages** (T-13-09-SC discharged) |
| `git diff --stat` on `site-contacts.test.ts`, `site.ts`, `card-pattern-coverage.test.ts` | **empty — zero changes to all three** |
| `git diff src/lib/listing-public.ts` | one additive hunk, **zero deleted lines**; `publicListing` untouched |
| Deletion audit over the whole plan | **one** deleted line in five commits — `import { booking, listing } from "@/lib/db/schema";`, replaced by the widened import. **Zero files deleted.** |
| `npx eslint` on all seven touched files | 0 errors |

## The Watched Reds — verbatim

Five reds were observed. Four were deliberate probes; one was real and is the most useful finding in this plan.

### 1. Task 1's required probe — a banned literal in the component the criterion names (deliberate)

A temporary file was created at `src/components/booking/trust-block.tsx` rendering `<dd>Superhost</dd>` and nothing else:

```
 ❯ tests/design/trust-signals.test.ts (6 tests | 1 failed) 72ms
     × renders none of the twelve forbidden signals anywhere in the Phase-13 file set 51ms

 FAIL  tests/design/trust-signals.test.ts > TRUST-04 / D-68 — the trust signal set is closed at four,
       and nothing invents a fifth > renders none of the twelve forbidden signals anywhere in the
       Phase-13 file set
AssertionError: an invented trust signal reached a booker surface: [
  "src/components/booking/trust-block.tsx:7 — tier chrome — the closed-up spelling. FitOut operates
   no host tier programme, so the badge would stand for nothing at all. D-68 closes the set at four
   signals and each of the four names a column; this one names none."
]
```

Three things this proves beyond "it went red". The failure names the **file, the line and the `why`**, so the walk genuinely reached a new file rather than reporting a stale zero. **Only one of the six assertions moved** — all four guard-the-guard checks and the encoding self-check stayed green in the same run, which is what shows the red is about the copy and not about the scan breaking. And the line number (`:7`) is the `<dd>`'s JSX text, which is the node shape the collector exists for. The probe file was **deleted** (never `git checkout`) → 6 passed.

### 2. Task 1's UNPLANNED red — the file's own honesty note tripped its own encoding assertion

This was not a probe. The header paragraph recording that the schema has no responsiveness column originally opened with the past participle of row 4, in the ordinary English sense of *"checked against the source"*:

```
 FAIL  tests/design/trust-signals.test.ts > TRUST-04 — the scan reaches what it claims to police
       > declares twelve rows, each with a reason, and never spells one of them
AssertionError: this test file spells ["verif","ied"] contiguously somewhere. Encode it in two
pieces (or, for a single glyph, as a code-point escape) — see the header.: expected true to be false
```

**Why this is worth recording rather than just fixing.** This is the **tenth** instance in Phase 13 of a criterion colliding with the prose that explains it (`booking-row.tsx:112` is the precedent), and it is the first one that a test caught **at authoring time instead of a human catching it at review time**. Four of the twelve tokens are ordinary English words — one of them is the word this repository uses constantly to mean "I checked this against the source" — so the collision was not avoidable by care, only by a check. The assertion re-reads the file's own bytes and compares against `pieces.join("")`, which is exactly the property a comment saying *"remember not to"* cannot have. The sentence was rewritten with a different verb and **every word of the reasoning survived**.

A second, smaller red followed from the same assertion and is recorded because the fix is a real distinction: the single-glyph row failed *"a piece of ["★",""] is the whole phrase — split it mid-word"*. A single code point has no interior to split at, so its disarm-proofing is a **code-point escape** rather than a two-piece split — and the exemption is about the MECHANISM only, because the preceding assertion still proves the glyph itself does not appear in the source.

### 3. Task 2's required probe — a fifth row, and the finding that came with it

A fifth `<TrustRow term="Reputation">Trusted host</TrustRow>` was spliced into the shipped component:

```
 ❯ tests/booking/trust-block.test.tsx (8 tests | 4 failed) 153ms
     × (1) `full` renders EXACTLY four signal rows — a fifth fails this assertion whatever it says
     × (2) `condensed` renders EXACTLY two rows, and they are signals 1 and 4 — not the first two
     × (3) a null published label removes the row — no placeholder, no em dash, no empty cell
     × (8) mounts the guarded support row and nothing else — zero of them while the constant is null

AssertionError: D-68 closes the booker-facing signal set at four, each mapped to a real column. A
fifth row is a defect, not a design decision — there is no column to back it and D-80 forbids adding
one this phase.: expected [ <div …(1)>…(2)</div>, …(4) ] to have a length of 4 but got 5
```

**And then the same tree was run against the design scan, which is the part worth keeping:**

```
 Test Files  1 passed (1)
      Tests  6 passed (6)
```

`trust-signals.test.ts` is **green on a real invented trust signal**, because `Trusted host` is not one of the twelve tokens and no word list could have contained it. That is the measured argument for two gates: the ban catches the signal somebody spells the obvious way, and the **count** catches the one nobody listed. Restored from the saved copy → 8 passed.

### 4. Task 2's real red — the bidirectional selector contract, one task early

Not a probe either. `selector-contract.test.ts` was run before committing the component:

```
AssertionError: the ids declared and the ids rendered are not the same set. Declared-but-absent:
[none]. Rendered-but-undeclared: [trust-block]. One of each is almost always ONE RENAME, and the fix
is a single edit rather than the two unrelated ones the other assertions' messages suggest in
isolation.: expected [ 'booking-panel', …(35) ] to deeply equal [ 'booking-panel', …(34) ]
```

The plan scheduled the `trust-block` row in **Task 3**; the contract is bidirectional and the literal shipped in **Task 2**, so the row moved forward into the same commit as the literal. See Deviation 1.

### 5. Task 3's probe — the boundary inverted so it leaks on an unpaid hold

`"approved"` was added to `BOOKED_STATUSES` and nothing else changed:

```
 FAIL  tests/listing/booked-address.test.ts > bookedListingAddress — the post-payment address
       boundary (D-91 / TRUST-01) > (1) reveals the exact street on EXACTLY the two booked renders,
       and on no other
AssertionError: approved (unpaid hold) must NOT carry the street: expected '88 Kalayaan Avenue' to
be null

 FAIL  … > (2) fuzzes the point on the eight, and hands back the exact point on the two
AssertionError: approved (unpaid hold): expected 14.653889 to be 14.65
```

Four cases went red, and the two above are the ones that matter: the **street** and the **coordinate** are independent leaks, and a probe that only moved the first would have left the map pin unguarded. The failure names the RENDER (`approved (unpaid hold)`) rather than the enum value, which is the reason the ten-row table exists — D-91's ⚠ list is written against surfaces. Restored from the saved copy → 9 passed.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] The `trust-block` selector row shipped one task early**

- **Found during:** Task 2, before the GREEN commit.
- **Issue:** The plan assigns the `SELECTOR_IDS` / `SELECTOR_CONTRACT` row to Task 3. `selector-contract.test.ts` is a **bidirectional** gate — 13-02 records the rule as *"each row ships in the same commit as its literal"* — so the moment `data-testid="trust-block"` existed in `src/`, the gate went red on `Rendered-but-undeclared: [trust-block]`. Committing Task 2 as planned would have left the repository red between two commits.
- **Fix:** The row moved into Task 2's commit (`1f8cb55`) with `owner: "13-09"` and the `why` 13-UI-SPEC gives, plus a `SELECTOR_IDS` comment recording that the schedule was corrected by the gate rather than by opinion. Task 3 shipped no selector change.
- **Commit:** `1f8cb55`.

**2. [Rule 3 — Blocking] Task 2's action instruction and its acceptance criterion contradict each other**

- **Found during:** Task 2, after the GREEN run.
- **Issue:** The action says *"Row 2 is `Host since {formatMemberSince(createdAt)}`, computed in the RSC and passed as a string"*, and the acceptance criterion says `grep -c 'formatMemberSince'` on the component must return `0`. Documenting the prop the obvious way made the required grep return `1` against a correct file. This is the same shape as 13-01 Deviation 1, 13-02 Deviations 2 and 3, and this plan's own Watched Red 2 — the eleventh instance in the phase.
- **Fix:** The formatter is named **descriptively** (*"the shipped member-since formatter"*), following `booking-row.tsx:112`'s precedent, and the prop doc carries an explicit ⚠ GREP TRIPWIRE block naming the module it lives in (`src/lib/profile.ts`), the shipped call site that already uses it (`host-block.tsx:115`) and the reason a fifth date format would be a defect — *"Do not 'helpfully' spell it out."* `grep -c 'formatMemberSince'` returns `0`; every word of the reason survives.
- **Commit:** `1f8cb55`.

**3. [Rule 2 — Missing critical functionality] The boundary composes the display lines, which the plan did not specify**

- **Found during:** Task 3.
- **Issue:** The plan requires `grep -c 'addressLine1\|streetAddress\|postalCode'` on the page to return **0 outside the select**. A page that composed the address string itself — the obvious implementation — would have to name `addressLine1` and `postalCode` at a render site and would fail that criterion. More importantly it would fail the criterion's *purpose*: "the exact street is only reachable through this function" would go back to being a convention, and the next surface would copy the composition rather than call the boundary.
- **Fix:** `BookedListingAddress` gained a `lines: string[]` field, composed inside the boundary from the **same `exact` decision** as the fields, so the two can never disagree about what was disclosed. `tests/listing/booked-address.test.ts` case (5b) asserts per render that the lines carry the street on the two and never on the eight — an assertion with real teeth, because a correct `addressLine1: null` beside lines built from the raw row would leak to all eight while every field assertion stayed green. The page consumes **only** `address.lines`.
- **Commit:** `db9adac`.

**4. [Rule 1 — Corrected plan detail] `listing.hostId`, not `listing.userId`**

- **Found during:** Task 3.
- **Issue:** The plan's action says *"the host join (`listing.userId` → `user`, …)"*. There is no `userId` column on `listing`; the FK is `hostId` (`schema.ts:175-177`, NOT NULL, `onDelete: cascade`).
- **Fix:** `innerJoin(user, eq(listing.hostId, user.id))`, with a note at the join recording that NOT NULL + FK is why an INNER join cannot drop a row the un-joined query would have returned — so the shipped `if (!lst) notFound()` guard is unchanged in meaning.
- **Commit:** `db9adac`.

### Recorded judgements

**A. The forbidden scan reads authored copy, not raw source — and the alternative was measured before it was rejected.**

`price-surface.test.ts`'s two grep tripwires deliberately scan raw text **including comments**, and its header gives the reason: there the hazard is *"the phrase EXISTS in this file"*, because the enforcement is a future grep that would match its own prohibition. Copying that shape here was measured first:

```
verified => 10        (all ten on comment lines)
superhost, super host, top host, verification, responds within, response rate,
response time, star rating, out of 5, reviews, ★  =>  0
```

Every one of the ten is a file recording that a refund window, a webhook behaviour or a guard shape was **checked against its source** — `money-statement.tsx:43` and `:99`, `payment-reversed-state.tsx:19`/`:45`/`:157`/`:181`, `support-path.tsx:17`/`:44`, `bookings/[id]/page.tsx:575`, `cancel/page.tsx:413`. 13-UI-SPEC says the scan reads *"string literals"*, and that word is load-bearing: the hazard TRUST-04 names is a signal a **booker reads**, and a booker does not read comments. The disarm-proofing that the raw scan buys is bought here instead by the two-piece encoding plus the self-assertion that proves it (Watched Red 2). The scope decision, the measurement and the ten file:line pairs are recorded in the test's own header.

**B. The trust block mounts on the five branches this page renders INLINE; 13-10 carries it to the rest.**

D-67 requires the block on every status. `bookings/[id]/page.tsx` renders five branches inline and delegates four more to components owned by other plans — `PendingPaymentState`, `NotCompletedState` (13-07), `PaymentReversedState` (13-04) and `ExpiredApprovalState` (07-12). Two facts decided the boundary rather than an opinion:

- **13-10 explicitly owns it.** `13-10-PLAN.md:121` reads *"`<TrustBlock variant="full"/>` on every branch (D-67)"* as part of the one-shell rebuild, and `13-11-PLAN.md:186` owns the `condensed` mount in the confirmation moment. This plan's `files_modified` lists none of those components.
- **Two of the four return BEFORE the listing is read.** The `pending` branch returns at `page.tsx:212` and `:259`, above the listing SELECT at `:292`. Feeding them a trust block would mean moving a database read above a branch that often ends in a `redirect()` — a restructure, not a mount, and precisely the kind of thing a shell rebuild should decide.

**C. No join was added for the booker's email (D-63), and that is the plan's own ⚠ answered.**

The plan flags it: *"the booker's email is the SESSION user's own address. Prefer reading it from the already-loaded session rather than adding a second join, and record which you chose and why."* The session was chosen, and the work was already done — `page.tsx:214` has passed `session?.user?.email ?? null` to `PendingPaymentState` since 13-07. A second join would read the same row Better Auth already loaded for the owner gate, and would introduce a second source for one fact on a page whose entire security model is *this booking belongs to this session*. Nothing was added.

**D. `card-pattern-coverage.test.ts` was NOT modified, and its inventory did not move.** `TrustBlock` composes `PanelCard` rather than opening a raw `<Card>`, so the inverse half of that gate never fires, and `CARD_SURFACES` is defined as the 11-UI-SPEC's three `Replaces` lists — which a Phase-13 component is not in. 13-02 recorded and measured this precedent; this plan follows it with **zero** rows added and **zero** lines changed. The acceptance criterion (*passes with zero new `ALLOWED_RAW_CARD` rows*) is satisfied with the file byte-unchanged.

**E. The trust block has no heading.** 13-UI-SPEC's Copywriting Contract is defined as *"every string this phase renders or changes"*, and it lists no heading for this block — only the four row strings. Authoring one would ship unlisted copy on the phase's most scrutinised surface, so `PanelCard` is composed without its optional `title`. The `<dl>` is self-describing and the RTL suite asserts no `heading` role rides along.

**F. The `<dt>` terms for rows 1 and 4 were authored; rows 2 and 3 were not.** The contract's own wording already contains the split for signals 2 and 3 — the term is `Host since` / `Listing published` and the description is the month, so the rendered and announced sentence is character-for-character the contract's. Signals 1 and 4 are whole sentences with no term inside them and each got the minimal category word (`Your payment`, `Booking`). The alternative — a `<dt>` repeating its own `<dd>` — is the exact defect 13-02 recorded when `SupportPath` gained its `term` prop: not a row, two copies of one string.

### Honesty notes — three greens that say less than they appear to

**1. `Declared-but-absent: [none]` was observed in a RED, not in the green.** The plan's Task-3 criterion asks that `selector-contract.test.ts` *report* that string. It is part of a **failure message** and is printed only when the assertion fails, so a green run prints nothing at all — the criterion as worded is unobservable in the state it describes. The string was nonetheless observed **verbatim**, in Watched Red 4, at the moment the row was missing: `Declared-but-absent: [none]. Rendered-but-undeclared: [trust-block]`. The green that follows means the declared set and the rendered set are the same set, which entails the empty left-hand side. This is the second time in the phase (13-06 was the first) that a plan's named proof has been narrower than its wording.

**2. No test renders the assembled page, so the per-status address claim rests on two measurements rather than on one assertion.** `tests/listing/booked-address.test.ts` proves the boundary per render (ten renders, two booked). The page-level half — *this page has no other route to the street* — is a **measurement**, not a test: `bookedListingAddress` is called exactly once (`page.tsx:414`), the object it returns is dereferenced at exactly two sites and both read `address.lines` (`:450`, `:454`), and a grep for the raw column names finds them only inside the select. Those three facts together entail the claim; an assembled-page test would assert it directly, and 13-10 — which rebuilds this page into one shell — is where that belongs.

**3. The address renders on three of the five inline branches, because only three have a facts `<dl>`.** `requested`, `approved` and `confirmed`/`completed` carry one and now carry a `Where` row; `declined` and `cancelled` are centred text cards with no definition list, and giving them one is the shell rebuild's job. The privacy property is unaffected in the safe direction — both are non-booked, so the boundary would yield the approximate area anyway, and rendering nothing discloses strictly less. TRUST-01's *"full address on every booking detail page"* clause is therefore **not** closed by this plan; 13-10 closes it.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no schema change and no trust boundary beyond the three its own register names.

- **T-13-09-ADDRLEAK** (Information Disclosure) — **mitigated and proved.** One named pure function is the only route to the exact street; it returns it for `confirmed` and derived `completed` only; a per-render test asserts absence for the other eight, in the fields **and** in the composed lines **and** in the coordinates; no call site reads a raw address column (measured: 2 occurrences, both in the select). The mitigation was inverted and the leak was observed (Watched Red 5).
- **T-13-09-EMAILEXPOSE** (Information Disclosure) — **accepted, and nothing was added.** No email column was joined; the address rendered anywhere on this page is the SESSION user's own, on their own owner-gated booking (ASVS V8).
- **T-13-09-FAKETRUST** (Spoofing) — **mitigated twice, and the second mitigation was measured to be necessary.** Twelve tokens scanned with a four-part positive control, plus an exact row COUNT that catches the signal no token list anticipated (Watched Red 3).
- **T-13-09-PAYOUTBADGE** (Spoofing) — **mitigated.** `grep -c 'onboardingComplete\|payoutsEnabled'` on the component returns `0`; both columns keep their bookability-gate role, and the booker-facing statement is about the payout model.
- **T-13-09-CLOCKSKEW** (Tampering) — **mitigated.** The display status feeding the address gate is derived from `readDbNow(db)`; `grep -cE 'new Date\(\)|Date\.now\(\)'` on the page returns `0`.
- **T-13-09-IDOR** (Elevation of Privilege) — **accepted, unchanged.** The owner gate at `page.tsx:199-200` is byte-identical; missing row and foreign row still return the same bare 404.
- **T-13-09-SC** (supply chain) — **discharged trivially. Zero packages installed**; `package.json` and `package-lock.json` are byte-unchanged.

## Known Stubs

None — but three deliberate absences, none of which is a stub:

1. **`TrustBlock variant="condensed"` has no call site.** It is built, tested (two rows, and they are signals 1 and 4 rather than the first two) and unmounted. `13-11-PLAN.md:186` owns the confirmation moment that mounts it.
2. **`hostFirstName` is selected and not rendered.** The JOIN is the cost and it is already paid; 13-10's facts panel renders the host's name. Recorded at the select line so it reads as a handoff rather than as dead code.
3. **`SupportPath` renders nothing at runtime** — D-64, not incompleteness. `src/lib/site.ts:70` is the one line that changes and it is an operator action. The trust block's final row therefore does not appear today, which is why the RTL row-count helper excludes `support-path` **now** rather than the day it matters.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [TRUST-04, TRUST-01]`, and **neither was marked complete** — the eighth consecutive plan in this phase to defer, and for reasons specific to each:

- **TRUST-04** is owned by **this plan alone**, and it is the phase's strongest candidate: the negative half (*"no invented verification or superhost chrome behind which no program exists"*) is now enforced product-wide by two complementary gates, and the four real signals render. It is nonetheless **not yet observable on five of the ten renders** (13-10) or in the confirmation moment (13-11), and its wording names *"payout onboarding complete"* as a signal where D-65 deliberately ships the platform guarantee instead. Marking it done would put `Complete` in the traceability table against surfaces that do not exist yet **and** would quietly ratify a copy reframing the PM has not seen. It should close at phase end, once 13-10 and 13-11 have landed.
- **TRUST-01** is carried by nine plans in this phase and **cannot close fully at all**: 13-UI-SPEC § The Support Path states it closes **PARTIAL** — code-complete, address-pending — as a named `human_needed` item, because `SUPPORT_EMAIL` is `null` (D-64). This plan delivers its address clause on three branches; the *"every booking detail page"* half is 13-10's.

## For the PM — the flagged product call (13-UI-SPEC § Open Questions 2)

**This plan ships the behaviour that reveals a host's exact street address to a booker who has paid, on a listing where the host chose "approximate".**

It is standard marketplace behaviour, TRUST-01 and BFLOW-08 both require it, and D-91's reasoning is that the host-facing control at `host/listings/[id]/edit/wizard.tsx:878` already promises exactly this in the host's own words — *"Off by default — guests see an approximate area until they book."* Nothing host-facing changed and no column changed.

But it is a **host-facing promise, and the PM owns those**. The reversal is genuinely one line: `BOOKED_STATUSES` in `src/lib/listing-public.ts`. Emptying it makes every render approximate, `tests/listing/booked-address.test.ts` names the two renders that changed, and nothing else in the product moves — which is the entire reason D-91 insisted on a named boundary rather than a condition at the call site.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `src/components/booking/trust-block.tsx` — FOUND
- `tests/design/trust-signals.test.ts` — FOUND
- `tests/booking/trust-block.test.tsx` — FOUND
- `tests/listing/booked-address.test.ts` — FOUND
- `src/lib/listing-public.ts` — FOUND (modified, +192 / −0)
- `src/app/(app)/bookings/[id]/page.tsx` — FOUND (modified)
- `src/lib/design/selector-contract.ts` — FOUND (modified, +1 row)

Commits claimed, verified in `git log`:

- `379619b` — FOUND
- `04fea57` — FOUND
- `1f8cb55` — FOUND
- `8ab198e` — FOUND
- `db9adac` — FOUND
