---
phase: 18-host-verification-listing-review-fitout-ops
plan: 13
subsystem: host-surfaces
tags: [copy-module, compiler-census, design-gate, mutation-testing, suspension, frozen-surface, uat]

# Dependency graph
requires:
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 02
    provides: "`listing.review_state` / `host_verification.status` pgEnums and `host_verification.reason` — the columns every sentence here is about"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 03
    provides: "the review state as the FIFTH `deriveBookable` term — which is what makes `Live` and the review chip structurally unable to disagree"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 06
    provides: "D-249's `approved | grandfathered | rejected → pending` flip on a material edit — the ONLY thing that makes the `rejected` way-out an honest offer"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 07
    provides: "the PRE-CLAIM payout freeze — the reason `/host/earnings` shows a suspended host nothing at all, and therefore the reason D-252 exists"
  - phase: 18-host-verification-listing-review-fitout-ops
    plan: 09
    provides: "`hostSuspendedPayload` / the rejection payloads — the other owner of these sentences (D-245: host-surface status is IN ADDITION, never instead)"
provides:
  - "`src/lib/listing/review-signal.ts` — `REVIEW_SIGNAL`, `SILENT_REVIEW_STATES`, `SUSPENDED_HOST_SIGNAL`, `reviewSignalFor`, and the two composers that append the operator's sentence verbatim"
  - "LVER-02's THIRD clause: the host sees its own listing, its review status and any rejection reason — on the HOST surfaces, with `assertPublicListing` byte-unchanged and still session-free"
  - "`statusBadge()` extended to a REQUIRED third parameter, and `reviewState` as a REQUIRED field on `ListingCardData` — two compiler censuses, both watched red"
  - "D-252: a suspended host is told on `/host`, `/host/listings` AND `/host/earnings`, through ONE component and ONE owner-scoped read"
  - "`src/lib/host/verification-status.ts` — the third reader of `host_verification.status`, pinned against the two money-path predicates per D-253"
  - "`tests/design/host-tone-census.test.ts`'s SECOND declared set — host-facing state sentences measured at ZERO alarm occurrences"
affects: [18-14 (the phase's last plan), host-surfaces, listing-card, earnings]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "a DECLARED-SILENT map whose total `Record<Exclude<Enum, keyof typeof SPOKEN>, string>` is a compiler census over the states that say nothing — the inverse of 18-04's required-parameter census, and it catches the case that one cannot"
    - "a banned-language gate that scans exported VALUES rather than source, so the patterns can be spelled in the test without the falsely-red collision this repo has now hit ten times"
    - "respecting a string-literal FREEZE by adding no literal to the frozen surface — the copy gets one owner and one presenter, and the frozen page decides only WHERE"
    - "a cross-layer agreement assertion (display reader vs money predicate) as the substitute for a compiler census that structurally cannot exist"

key-files:
  created:
    - src/lib/listing/review-signal.ts
    - src/lib/host/verification-status.ts
    - src/components/host/hosting-paused-notice.tsx
    - tests/listing/review-signal.test.ts
  modified:
    - src/components/listing/listing-card.tsx
    - src/app/(host)/host/listings/page.tsx
    - src/app/(host)/host/page.tsx
    - src/app/(host)/host/earnings/page.tsx
    - tests/listing/listing-card.test.tsx
    - tests/payments/payout-suspension-freeze.test.ts
    - tests/design/host-tone-census.test.ts
    - tests/design/live-regions.test.tsx

key-decisions:
  - "The way out is a LABEL, not an href — the grid already spells the wizard route for its Edit control, and a second spelling is a second place to be wrong."
  - "`status === 'published'` gates the review chip because `review_state` DEFAULTS to `pending`, so every DRAFT carries it."
  - "The reason line renders INSIDE the card, not beneath it: the grid is a CSS grid and a sibling `<p>` becomes its own grid item."
  - "`loadHostVerification` REPLACED the listings page's inline read rather than joining it — one fewer duplication, not one more."
  - "D-156's earnings freeze respected by adding NO host-readable literal to the frozen surface; the gate is unmodified and green."
  - "D-252's 'the way out is a FitOut ops review' read as a REASON, not as copy: no sentence was added beyond the locked UI-SPEC, because naming a forthcoming review is a promise of a reply in all but wording."

metrics:
  duration: ~66 min
  tasks: 3
  commits: 3
  completed: 2026-09-01
requirements: [OPS-05, LVER-02]
---

# Phase 18 Plan 13: Host-Facing Review & Suspension Signals Summary

The host is finally told what happened, on the surfaces they already visit — and offered a way out
only where one actually exists, which is exactly one of the four states.

## What Shipped

### The copy, as it stands

| State | Chip | Reason line | Way out |
|---|---|---|---|
| `pending` | **In review** (neutral) | *Someone at FitOut is checking this listing. It can't take bookings until that's done.* | **none** — a decision, not an omission |
| `rejected` | **Not approved** (neutral) | *FitOut checked this listing and didn't approve it. It won't take bookings.* + the operator's sentence, verbatim | **Edit this listing** → the wizard |
| `grandfathered` | nothing new | none | n/a |
| `approved` | nothing new | none | n/a |
| `withdrawn` | nothing new | none | n/a |

**Suspended host** (`/host`, `/host/listings`, `/host/earnings`):
STATE **Hosting paused** · REASON *FitOut has paused your hosting. Your spaces can't be booked, and
payouts are on hold.* + the operator's sentence, verbatim · WAY OUT **none**.

Byte-identical in substance to 18-09's `hostSuspendedPayload`, which is the point: D-245 says the
host-surface status is IN ADDITION to the notification, so the two channels must not say different
things.

### The two states with no way out, and why saying so beats inventing one

This is the part of the plan that needed a decision rather than a keystroke. `requests-signal.ts:56`
binds every signal to *state, reason AND way out*, and two of these states have none: a `pending`
listing (there is nothing the host can do) and a suspended host (contesting an ops decision is
backlog 999.6). `wayOut: null` is therefore recorded AS A DECISION at both sites, and the tests
assert its absence with the same force they assert the one presence. A control that acts on nothing
is worse than an admitted absence — a host who presses it and sees no change learns that this
product's affordances are decorative.

### `SILENT_REVIEW_STATES` — a compiler census over the states that say NOTHING

18-04's census was a required positional parameter, and its measured limit is that `tsc` counts
CALLERS. It cannot see a state that is silent by default. So the silence is declared:

```ts
} as const satisfies Record<Exclude<ListingReviewState, keyof typeof REVIEW_SIGNAL>, string>;
```

A sixth member of `listing_review_state` fails `tsc` here until somebody writes down, in the tree,
whether the host is told about it. `tests/listing/review-signal.test.ts` case (6) is the runtime half,
derived from the pgEnum, and it names the offending value in its failure message.

### One chip per card

The review state joined `statusBadge()` as a **required third positional parameter**, and `reviewState`
became a **required field on `ListingCardData`**. Both censuses were watched red:

```
src/app/(host)/host/listings/page.tsx(140,19): error TS2741: Property 'reviewState' is missing …
tests/listing/listing-card.test.tsx(48,3): error TS2322: … Type 'undefined' is not assignable to
  '"pending" | "approved" | "rejected" | "grandfathered" | "withdrawn"'
```

Two construction sites, both answered. `grep -c '<Badge' listing-card.tsx` is still **1**.

**The ordering rule, stated at the site:** a `published` listing that is `pending` or `rejected` shows
the REVIEW chip, because that names the CAUSE where *Published · not bookable* names the symptom.
`Live` still requires `bookable`, whose fifth term is the review state (18-03), so the chip and the
gate cannot disagree.

**⚠ `status === "published"` is load-bearing, not tidy.** `listing.review_state` DEFAULTS to `pending`
in the schema, so **every draft carries it**. Without that term, a draft would be badged *In review* —
telling a host that FitOut is checking something they never submitted. Case (13) pins it.

## The Scope That Was Ruled In After the Plan Was Written — D-252

18-07's payout freeze is **pre-claim**: a suspended host's due payouts are filtered out BEFORE the
`host_payout_ledger` row is written. `/host/earnings` renders ledger rows. So a suspended host's
delivered session produced **no payout line at all, with no explanation anywhere** — money quietly
ceasing to appear on the one page they would look at for why.

Shipped: `HostingPausedNotice`, ONE component for three surfaces, on `PanelCard tone="muted"` — the
DECLARED advisory surface the dashboard's requests and no-hours rows already take, and deliberately
NOT the alerting composition beside it. That distinction is the tone census's own: the alarm role is
for a payout account broken by something nobody chose; a suspension is a named person's deliberate
decision, and painting it red would make the one genuinely broken payout state indistinguishable from
a policy decision **on the very page where both can appear at once**.

### ⚠ D-156's earnings freeze was NOT weakened and NOT edited

`tests/design/earnings-freeze.test.ts` walks the AST of `/host/earnings` and every `payout-*`
component and pins **every string a host can read**. Adding a notice to that surface is exactly what
it exists to catch.

It stayed green **because this change adds no host-readable literal to it.** The sentence has one
owner (`review-signal.ts`) and one presenter (`HostingPausedNotice`); the page decides only WHERE it
goes, so what it gained is a module specifier (structurally excluded), a `className` (structurally
excluded), a drizzle read with no string literal in it, and a JSX element. Verified, not assumed:
`git diff --exit-code tests/design/earnings-freeze.test.ts` is clean and the gate passes.

The gate's own blind-spot list names *"copy relocated to a third directory is out of reach"*, so this
is recorded here rather than left to look clever. The honest reading is that one component for three
surfaces was the right shape independently — `requests-signal.ts`'s header argues it at length — and
the freeze is satisfied as a consequence rather than as a workaround.

### ⚠ D-253 honoured in the same commit

D-253 records that the payout freeze has **no compiler census**: both predicates are raw-SQL
restatements, `tsc` sees neither, and `tests/payments/payout-suspension-freeze.test.ts` is the sole
instrument holding them equal. Its standing instruction is that any third reader of
`host_verification.status` extends that test in the same commit.

`src/lib/host/verification-status.ts` is that third reader — a DISPLAY reader, not a money one. But it
is coupled to the two money predicates **by a sentence**: the notice says *payouts are on hold*, and
that clause is true only while the freeze holds. Two failure directions, neither symmetric:

- the reader says suspended and the sweep pays → FitOut tells a host their money is held while it is
  on its way to them (a lie in the calm direction, the one nobody reports);
- the sweep freezes and the reader says nothing → **D-252's defect, back through a different door.**

So section 8 asserts **agreement across the whole enum**, derived from the pgEnum, with anti-vacuity
controls in both directions (one subject frozen-and-told, one paid-and-silent) plus an owner-scoped
control proving one host never reads another's reason.

## Mutation Proof

Made the `grandfathered` branch of `statusBadge()` emit a chip:

```
× (12) `grandfathered` renders EXACTLY what it rendered yesterday — nothing new (D-211/D-212)
AssertionError: expected [ 'Grandfathered' ] to deeply equal [ 'Live' ]
   Tests  1 failed | 14 passed (15)
```

Reverted → **15/15 green**. D-211 makes `grandfathered` first-class in the DATA; the host experienced
no change, and telling them invites a question nobody at FitOut can answer.

## Manual Check — Transcribed

Dev server on :3000, the seeded host `host@fitout.test` set to `status='suspended'` with
`reason='Repeated no-shows reported by bookers at this space.'`, driven by `curl` with a real session
cookie (the login form was not used).

| Surface | HTTP | `Hosting paused` | `payouts are on hold` | operator sentence | way-out control |
|---|---|---|---|---|---|
| `/host` | 200 | 1 | 1 | 1 | none |
| `/host/listings` | 200 | 1 | 1 | 1 | none |
| `/host/earnings` | 200 | 1 | 1 | 1 | none |

The rendered notice, from `/host/earnings`:

```html
<p class="text-body text-muted-foreground" data-hosting-paused>FitOut has paused your hosting. Your
spaces can't be booked, and payouts are on hold. Repeated no-shows reported by bookers at this space.</p>
```

`grep -ciE "appeal|we.ll be in touch|reply to this|mailto:"` returned **0** on all three.

Then, un-suspended, with one listing set `rejected` (+ a `listing_review` row carrying an operator
sentence) and one set `pending`:

```html
FitOut checked this listing and didn&#x27;t approve it. It won&#x27;t take bookings. The photos do not
match the address on this listing.<!-- --> <a class="underline underline-offset-4"
href="/host/listings/uat_listing_bookable/edit">Edit this listing</a>
```

```html
Someone at FitOut is checking this listing. It can&#x27;t take bookings until that&#x27;s done.</p>
```

Three things worth naming in that output: the way-out anchor points at the **wizard route the card was
already given**; the `pending` paragraph closes with **no anchor after it**; and React escaped the
operator's apostrophes to `&#x27;` — which is the text-node proof T-18-1301 asks for, observed rather
than argued.

Chips on the grid, counted by the vendored Badge's own `data-slot`: **exactly one per card**, with the
grandfathered published listing still reading `Live`.

All dev-database changes were reverted and verified back to `grandfathered` / null.

## Pinned Inventories Moved — In the Same Commit as the Surface

**`tests/design/host-tone-census.test.ts` gained a SECOND declared set.** The existing map answers
*which files SPEND the alarm role*; a file rendering zero is simply absent from it, indistinguishable
from a file that does not exist. `DECLARED_NEUTRAL_SIGNALS` inventories the new host-facing state
sentences and asserts them at **zero**, with the same stripper, plus a per-file guard-the-guard (the
file exists AND >200 chars survive stripping). Strictly stronger: nothing relaxed, no exclusion added,
two more files policed.

**⚠ `listing-card.tsx` is deliberately NOT in that set, and that was measured.** It already spends the
alarm role once — on the per-card DELETE action, which is a destructive ACTION and not a state — and
that file is named in the census's own *"deliberately does not pin"* block for exactly that reason.
Adding it to a zero-set would go red against correct, shipped code, which is how a gate gets loosened
by whoever has to make it green again.

**`tests/design/live-regions.test.tsx`: `PHASE_14_SURFACE_FILE_COUNT` 20 → 21.** Watched red first,
inside `npm run build`'s design pass:

```
AssertionError: the walk reached 21 files inside the owned trees, not 20. … move the constant in the
same commit and name the file in the diff.: expected 21 to be 20
```

The new file is `hosting-paused-notice.tsx`, and the docblock records why it authors no live region: a
suspension does not happen while the host is looking at the page, so a region would interrupt a screen
reader to announce something that was already true when the document loaded. `live-regions.ts` is not
edited; only the REACH moved.

**Asserted byte-unchanged:** `src/lib/site.ts`, `tests/design/site-contacts.test.ts`,
`src/lib/design/status-tones.ts`, `src/lib/design/accent-uses.ts`, `src/lib/listing/public-listing.ts`.

## The Constraint That Shaped Everything — `assertPublicListing` Stays Session-Free

18-04's closing instruction was addressed to this plan by name: `src/app/not-found.tsx:29-45` records
that making a not-found-adjacent path session-aware once cost the whole build its prerendering (zero
static routes). D-230 is satisfied entirely on the HOST surfaces. `git diff --exit-code
src/lib/listing/public-listing.ts` succeeds, and `grep -c "getSession\|headers()"` on it is still 0.

## Deviations from Plan

**1. [Rule 2 — extra scope ruled in] D-252's `/host/earnings` notice**
- **Found during:** planning context (ruled into this plan after it was written)
- **Fix:** a third call site, a shared component and a shared read, adding zero literals to the frozen
  surface. Documented above.
- **Files:** `src/app/(host)/host/earnings/page.tsx`, `src/components/host/hosting-paused-notice.tsx`,
  `src/lib/host/verification-status.ts`
- **Commit:** `9e2b570`

**2. [Rule 2 — D-253 obligation] Two cases added to the payout freeze test**
- **Found during:** Task 3, on adding the third reader of `host_verification.status`
- **Fix:** section 8 of `tests/payments/payout-suspension-freeze.test.ts` — enum-wide agreement between
  the display reader and the money predicate, with anti-vacuity controls both ways.
- **Commit:** `9e2b570`

**3. [Rule 3 — plan task split adjusted] The reason line renders inside the card**
- **Found during:** Task 2
- **Issue:** the plan puts the reason line "beneath each affected card" in Task 3 (the page). The grid
  is a CSS grid; a sibling `<p>` after `<ListingCard>` becomes its own grid item and breaks the layout.
- **Fix:** rendered inside `CardContent`, beside the shipped hours notice, gated host-only by
  `availabilityHref` on the same T-IU7-02 discipline. The page supplies the operator's sentence and the
  wizard href it already builds.
- **Commit:** `ceabf9d`

**4. [Rule 3 — pinned inventory] `PHASE_14_SURFACE_FILE_COUNT` 20 → 21**
- **Found during:** the first `npm run build`
- **Fix:** moved with the file, red watched first, the reasoning written into the constant's docblock.
- **Commit:** `9e2b570`

**5. [Rule 1 — falsely-red acceptance grep, the TENTH instance] The notice's own prohibition comment**
- **Found during:** Task 3's acceptance greps
- **Issue:** `grep -riEc "appeal|…"` over the host pages returned non-zero against a **correct** file:
  `hosting-paused-notice.tsx`'s header named the banned word in the sentence forbidding it.
- **Fix:** reworded to describe the prohibition ("contesting an ops decision") and to point at
  `review-signal.test.ts`'s banned-language block, which may spell the patterns because it scans
  exported VALUES rather than source. This is the same trap 18-04 hit once and 18-05 hit three times;
  `tests/helpers/source-text.ts` exists for it.
- **Commit:** `9e2b570`

**6. [Scope boundary — logged, NOT fixed] Two e2e teardowns fail on a `listing_review` RESTRICT FK**
- **Found during:** the by-hand e2e re-run (D-24)
- **Issue:** `host-headings.spec.ts` and `keyboard-composites.spec.ts` both drive the edit wizard and
  then delete their host. 18-06's material-edit flip appends a `listing_review` row, whose
  `onDelete: "restrict"` (D-221) blocks the cascade. **Both assertions PASS**; only the teardown fails.
- **Why not fixed here:** the count is already two and the shape is generic — every fixture that
  materially edits then deletes its host has it, and `e2e/helpers/*`'s teardown contract is the place
  to answer it once. Patching the two that happened to be re-run would hide the pattern.
- **Logged:** `deferred-items.md` § D6, with both transcripts and the leaked-row evidence. Leaked dev
  rows cleaned by hand.

No architectural change was needed. No package was installed. No existing test or design gate was
weakened, skipped or given an exclusion row.

## ⚠ The D-250 Blocking Input Is Still Open — One PM Line Closes Three Items

`src/lib/site.ts:70` reads `export const SUPPORT_EMAIL: string | null = null`, and
`tests/design/site-contacts.test.ts` asserts ZERO support affordances anywhere under `src/` while it
is — inverting to *demanding* one the moment it is set.

**Every sentence shipped in this plan is complete and honest without an address**, which is how the
UI-SPEC wrote them and how they were verified. Nothing here is blocked.

**The one line, for the PM:** *does a real, monitored FitOut support inbox exist, and what is its
address?* Whether one exists is a business fact, not an engineering choice, and shipping an address
would quietly answer it on the PM's behalf. Setting that constant also closes the carried-forward
**`STATE-05`** and **`TRUST-01`**, which have waited on the same answer since Phase 11 — three items,
one line, and `src/lib/site.ts`'s own D-26 block already documents that nothing else needs editing.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | **0** (RED first at both construction sites — see above) |
| `npx vitest run tests/listing/review-signal.test.ts` | 13 passed |
| `npx vitest run tests/listing/listing-card.test.tsx` | 15 passed (was 10) |
| `npx vitest run tests/payments/payout-suspension-freeze.test.ts` | 10 passed (was 8) |
| `npx vitest run --config vitest.design.config.ts` — the six touched gates | 89 passed / 3 skipped |
| `npm run build` | **exit 0** |
| `npm test` — run **alone** | 207 files / **2485 passed** / 5 skipped (baseline 2465; **+20 = 13+5+2**, exactly this plan's) |
| `npm run test:design` — inside the build, run alone | 73 files / **1331 passed** / 3 skipped (baseline 1329; **+2**, exactly this plan's) |
| `npx eslint` on all 12 touched files | clean |
| e2e host-dashboard · host-headings · mode-switch · one-tree | 42 passed / 2 skipped / **1 teardown red (deferred D6)** |
| e2e overflow-320 · axe-sweep · shell · skeleton-geometry | **203 passed** / 46 skipped, exit 0 |
| e2e keyboard-composites | 6 passed / **1 teardown red (deferred D6)** |

The pre-existing `[test-db] LEAKED WRITES` block naming `notify` and `guest-email` appeared as
expected. The three pre-existing e2e reds (`cancel.spec.ts:232`, `calendar-hit-area.spec.ts` ×4,
`price-parity.spec.ts:287`) were not touched and not re-run.

## Known Stubs

None. `reviewSignalFor` returning `null` for three states is the specified behaviour and is declared
with its reason in `SILENT_REVIEW_STATES`; `wayOut: null` on two states is a recorded decision, not a
placeholder.

## Threat Flags

None. The plan's register was satisfied as written: T-18-1301 (operator free text → React text node,
`dangerouslySetInnerHTML` grep-asserted at 0 under `src/app/(host)/`, and observed escaped in the live
HTML), T-18-1302 (owner-scoped reads, with an explicit control case), T-18-1303 (`public-listing.ts`
byte-unchanged), T-18-1304 (banned-language assertion over every exported string), T-18-1305
(`site.ts` + `site-contacts.test.ts` byte-unchanged), T-18-1306 (grandfathered mutation-proved RED),
T-18-SC (no package installed). No new security surface was introduced — this plan adds reads,
sentences and tests.

## Carry Forward

- **The D-250 blocking input is the phase summary's `human_needed` item.** One line closes it plus
  `STATE-05` and `TRUST-01`.
- **`deferred-items.md` § D6** — two e2e teardowns, one known cause, one known fix, owned by whoever
  owns 18-06's re-review write's fixture contract.
- **`SILENT_REVIEW_STATES` is the census shape for the next signal.** 18-04 proved that a required
  parameter counts CALLERS; this proves that a total `Record` over the complement counts the states
  that say NOTHING. A phase that adds an enum value now fails `tsc` in both directions.
- **OPS-02's status-line audit is still owed** and is 18-14's first task, unchanged by this plan.

## Self-Check: PASSED

All four created files verified present on disk; all eight modified files verified present. All three
commits verified in `git log`: `49a349f` (feat, 2 files), `ceabf9d` (feat, 4 files), `9e2b570` (feat,
8 files). No unexpected deletions in any of the three (`git diff --diff-filter=D` empty each time).
