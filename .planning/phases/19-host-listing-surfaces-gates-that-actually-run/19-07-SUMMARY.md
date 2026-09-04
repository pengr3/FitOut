---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 07
subsystem: frontend
tags: [next-app-router, rsc, copywriting, searchparams, xss, vitest, jsdom]

requires:
  - phase: 18.1 (plan 18.1-12 / D-255 / D-265)
    provides: "the four refusing verification states routed to /host/verify BEFORE the action call — which is what makes this branch infrastructure-failure-only, and what the copy must not contradict"
  - phase: 19-host-listing-surfaces-gates-that-actually-run (plan 19-06)
    provides: "reuse-then-mint in createDraftListing — the other half of 'nothing was saved' being true"
provides:
  - "src/lib/listing/create-signal.ts — the third file in the shipped signal idiom, zero imports"
  - "the creation-failure sentence, rendered inline above the grid in BOTH grid states"
  - "one exported query token read by the origin redirect and the destination page"
  - "tests/listing/create-signal.test.ts — 28 cases; the forbidden-topic ban asserted against the constant AND the rendered output"
affects: [19-08, /host/listings, /host/listings/new, tests/host/verification-surface.test.ts]

actuals:
  tokens: 9651
  tasks: 3
  commits: 3

tech-stack:
  added: []
  patterns:
    - "A copy module with ZERO imports, so no runtime value can reach a sentence the host reads"
    - "One query token exported as a whole `key=value` pair and split ONCE at the destination — both halves come from the one constant"
    - "Allow-list narrowing of searchParams: one equality check, then render the module's own string"
    - "The forbidden-topic table applied twice — to the constant and to the rendered output"

key-files:
  created:
    - src/lib/listing/create-signal.ts
    - tests/listing/create-signal.test.ts
  modified:
    - src/app/(host)/host/listings/new/page.tsx
    - src/app/(host)/host/listings/page.tsx
    - tests/host/verification-surface.test.ts

key-decisions:
  - "The redirect is a CONCATENATION, not a template literal — two gates count the destination literal and a template would delete the token they count"
  - "LISTING_CREATE_FAILED_PARAM exports the whole `key=value` pair and the page splits it once, so the two sites cannot drift on the key either"
  - "CLAIM 4's bounce case in verification-surface.test.ts was NARROWED from the call to the destination — 18.1-12 wrote it as 'this plan does not widen into fixing it'; 19-07 is the plan that fixed it"
  - "The notice sits AFTER the suspended-host notice and BEFORE the fork — the two are mutually exclusive in practice, and the fork is the boundary that matters"

patterns-established:
  - "Watch the red for a security assertion by BOTH loosening the check and interpolating the value — the echo assertion is unreachable while the allow-list holds"

requirements-completed: [HSURF-02]

coverage:
  - id: D1
    description: "A host whose listing creation fails lands back on the grid with a sentence naming what happened and telling them they can try again — replacing the silent redirect (D-03)"
    requirement: HSURF-02
    verification:
      - kind: unit
        ref: "tests/listing/create-signal.test.ts#composes the state and the reason into the one sentence the contract specifies"
        status: pass
      - kind: integration
        ref: "tests/listing/create-signal.test.ts#renders the module's own sentence, and its way out, when the exported token is present"
        status: pass
      - kind: unit
        ref: "tests/host/verification-surface.test.ts#that bounce now CARRIES the failure signal — D-03 closed 18.1-UI-SPEC § NOT COVERED"
        status: pass
    human_judgment: false
  - id: D2
    description: "The sentence does NOT imply a verification problem and carries NO support clause — asserted at the constant AND at the render site"
    requirement: HSURF-02
    verification:
      - kind: unit
        ref: "tests/listing/create-signal.test.ts#the composed sentence names no forbidden topic (8 topics)"
        status: pass
      - kind: integration
        ref: "tests/listing/create-signal.test.ts#the RENDERED notice names no forbidden topic (8 topics)"
        status: pass
      - kind: other
        ref: "grep -c '^import' src/lib/listing/create-signal.ts -> 0; asserted by the module's own no-imports case"
        status: pass
    human_judgment: false
  - id: D3
    description: "The searchParams value is untrusted: one equality check against a known constant, the module's own string rendered, the query value never interpolated"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/create-signal.test.ts#never echoes a hostile value — no notice, and the value appears nowhere in the output"
        status: pass
      - kind: other
        ref: "watched-red: check loosened to `!== undefined` + raw value interpolated -> both assertions fired with their own diagnostic sentences"
        status: pass
      - kind: integration
        ref: "tests/listing/create-signal.test.ts#renders NOTHING for an arbitrary value on the same key"
        status: pass
    human_judgment: false
  - id: D4
    description: "The notice renders in BOTH the populated grid state and the zero state, in the HostingPausedNotice slot with its mb-8 offset, outside the populated-versus-empty fork"
    requirement: HSURF-02
    verification:
      - kind: integration
        ref: "tests/listing/create-signal.test.ts#renders in the ZERO-LISTINGS state, ABOVE the shipped empty state rather than instead of it"
        status: pass
      - kind: other
        ref: "source positions: <h1> :167, HostingPausedNotice :182, notice :196-205, `rows.length === 0 ?` fork :207"
        status: pass
    human_judgment: false
  - id: D5
    description: "The destination literal is byte-unchanged and its occurrence count in the origin file is unchanged; no brand call site added; no destructive variant"
    requirement: HSURF-02
    verification:
      - kind: other
        ref: "grep -c '\"/host/listings\"' new/page.tsx -> 1 at HEAD and 1 after; grep -c 'variant=\"brand\"' page.tsx -> 3 at HEAD and 3 after; grep -c 'variant=\"destructive\"' -> 0"
        status: pass
      - kind: other
        ref: "npm run test:design -> exit 0, 74 files, 1336 passed | 3 skipped"
        status: pass
    human_judgment: false

duration: 43 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 07: The Silent Bounce Gets a Sentence — Summary

**A zero-import copy module, one query token appended to an unchanged destination literal, and a calm muted notice on `/host/listings` that names the state, the reason and the way out — with the query value proven, by watched red, to be echoed nowhere.**

## Performance

- **Duration:** 43 min
- **Started:** 2026-09-04T03:50:00Z
- **Completed:** 2026-09-04T04:34:00Z
- **Tasks:** 3 of 3
- **Files:** 2 created, 3 modified

## Task Commits

1. **Task 1: the copy module** — `b5b973c` (feat) — `src/lib/listing/create-signal.ts` + 15 unit cases
2. **Task 2: the redirect gains a query string, the destination reads it** — `36ffc43` (feat)
3. **Task 3: the render and hostile-parameter assertions** — `cc56eab` (test) — 15 → 28 in the file

---

## What the plan asked this summary to record

### 1. The exact composed sentence, verbatim

> **We couldn't start your new listing. Something went wrong on our side, and nothing was saved.**

followed by the way out as an underlined text link: **Try again** → `/host/listings/new`.

Three separately named exports (`LISTING_CREATE_FAILED_STATE`, `…_REASON`, `…_CTA`) composed in
JavaScript by `composeListingCreateFailedSentence()` — never interleaved as JSX text, because SWC's
whitespace transform drops the leading space of text following an expression container, the defect
`(host)/host/page.tsx:75` records by name and `requests-signal.ts:66-77` composes around.

**What it does not say, and why each ban is load-bearing.** No verification, account-check or approval
wording: the four refusing states redirect to `/host/verify` *before* this branch, so such a sentence
would be copy about a check that never failed and would send the host to a page where nothing is
wrong. No deletion or removal: nothing was created, so nothing was removed. No support clause of any
kind: `SUPPORT_EMAIL` is `null` and a placeholder is forbidden, so the sentence stands alone. No
exclamation mark. And it is not a bare "Something went wrong." — the reason carries the two facts the
host actually needs (it was *our* side, and *nothing was saved*), which is what makes pressing the
button again safe rather than a gamble on a duplicate.

### 2. The destination literal's occurrence count in the origin file

| Reading | Command | Value |
|---|---|---|
| At HEAD (`495e340`) | `grep -c '"/host/listings"' "src/app/(host)/host/listings/new/page.tsx"` | **1** |
| After | same command | **1** |

**Unchanged, and the way that was achieved is a decision rather than a detail.** The redirect is a
**concatenation** — `redirect("/host/listings" + "?" + LISTING_CREATE_FAILED_PARAM)` — not the
template literal the UI-SPEC's illustrative snippet shows. A template would have folded the
double-quoted literal into a template chunk and driven that count to **0**: a correct tree read as a
broken one by the two gates that count it. The comment at the branch says so, so the next person does
not "tidy" it back.

### 3. The notice sits outside the populated-versus-empty fork, and renders in both states

Source positions in `src/app/(host)/host/listings/page.tsx`:

| Element | Line |
|---|---|
| `<h1>Your listings</h1>` header row | 167 |
| `HostingPausedNotice` slot (`mb-8` wrapper) | 180–184 |
| **the creation-failure notice (`mb-8` wrapper)** | **196–205** |
| `rows.length === 0 ? EmptyState : grid` fork | 207 |

Textually between the header row and the fork, in neither branch — exactly the `HostingPausedNotice`
placement and for the same reason: a host whose *very first* creation failed has no grid to hang a
message on and needs the sentence most.

Proven rather than asserted in prose: the render tests stub every read to its empty answer, so the
page lands in the **zero-listings state**, and the case measures that the notice's index in the
rendered text is *less than* the index of `No listings yet`. The shipped `EmptyState` — heading, body
and *Create your first listing* action — is unchanged and still renders beneath it.

### 4. The hostile-parameter assertion's result

```
it("never echoes a hostile value — no notice, and the value appears nowhere in the output")
  value: "><script>alert(1)</script>
  → no notice rendered
  → "alert(1)" absent from container.textContent AND from container.innerHTML
  → "<script" absent from the HTML
  PASS
```

**Watched red, because an assertion nobody has seen fail is a decoration.** The check was loosened to
`rawCreate !== undefined` *and* the raw value interpolated into the sentence
(`… nothing was saved. (code: {String(rawCreate)})`). Two assertions fired, each with its own
diagnostic sentence:

```
AssertionError: A NON-MATCHING VALUE PRODUCED THE NOTICE. The contract is ONE equality check
against the module's own exported token; anything else renders nothing.

Received: "Your listingsWe couldn't start your new listing. Something went wrong on our side, and
nothing was saved. (code: something-else) Try againNo listings yet…"
```

```
AssertionError: THE QUERY VALUE WAS ECHOED INTO THE PAGE. `searchParams` is UNTRUSTED INPUT
(T-19-31). The contract is one equality check against a known constant, after which the page
renders THE MODULE'S OWN STRING. Interpolating the value — to make the message more specific, to
name a failed id, to echo the token back — is exactly what this assertion exists to catch. That
React would escape it is not the point: it must not be there at all.
```

⚠ **The second red required removing the first assertion to observe, and that is a property of the
design rather than a gap in the test.** While the allow-list holds, a hostile value never reaches the
notice at all, so the echo is *unreachable* — it becomes reachable only when someone loosens the
check, which is precisely the two-step regression the pair is written to catch. Both mutations were
reverted; `git diff --stat` afterwards showed the page file byte-identical, and 28/28 green.

### 5. No brand call site added, and `npm run test:design` is green

| Reading | At HEAD | After |
|---|---|---|
| `grep -c 'variant="brand"' "src/app/(host)/host/listings/page.tsx"` | 3 | **3** |
| `grep -c 'variant="destructive"' "src/app/(host)/host/listings/page.tsx"` | 0 | **0** |

The way out is a **text link** (`underline underline-offset-4`), byte-identical in treatment to the
shipped hours notice and review notice on the card — calm muted information, never an alert variant
and never red. A 21st brand call site would have reddened `brand-recipe.test.ts`, which is
build-blocking (`"build": "npm run lint && npm run test:design && next build"`).

```
$ npm run test:design
 Test Files  74 passed (74)
      Tests  1336 passed | 3 skipped (1339)
```

---

## Decisions Made

1. **The exported token is the whole `key=value` pair, split once at the destination.** A
   value-only token would have left the KEY spelled independently at each end — a second place for
   the two sites to drift, which is the one thing the constant exists to prevent. `page.tsx` does
   `const [CREATE_FAILED_KEY = "", CREATE_FAILED_VALUE = ""] = LISTING_CREATE_FAILED_PARAM.split("=")`
   at module scope, so both halves of the match come out of the single constant. The empty-string
   defaults are load-bearing rather than tidy: without them a malformed constant would yield
   `undefined`, and `undefined === undefined` would render the notice on a page nobody navigated to
   with a parameter at all.
2. **The raw value is never interpolated — not even into the comparison.** The obvious alternative
   (`` `create=${raw}` === LISTING_CREATE_FAILED_PARAM ``) is safe, but it puts an interpolation of
   untrusted input into the very file whose test exists to catch interpolations of untrusted input.
   The split-and-index form has no interpolation anywhere.
3. **`searchParams` is typed as the framework types it** — `Promise<Record<string, string | string[] |
   undefined>>` rather than `{ create?: string }`. A repeated key arrives as an **array**; pretending
   otherwise is how a `string` assumption becomes a runtime surprise. An array never equals the
   value, so a repeated key renders nothing.
4. **The redirect is a concatenation.** See § 2. Behaviour identical, and it keeps the two gates that
   count the destination literal honest.
5. **The notice renders after the suspended-host notice, before the fork.** The two are mutually
   exclusive in practice — a suspended host is redirected to `/host/verify` before this branch can be
   reached — so the ordering between them decides nothing; the boundary that matters is the fork, and
   the notice is outside it.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking issue] A shipped gate asserted the exact thing this plan had to change**

- **Found during:** Task 2, before the first edit
- **Issue:** `tests/host/verification-surface.test.ts` CLAIM 4 held a case titled *"keeps the
  infrastructure-failure bounce it already had — **this plan does not widen into fixing it**"*,
  asserting that the string `redirect("/host/listings")` — including its closing paren — appears
  exactly once. Plan 19-07 is the plan that fixes it. Appending anything to that call drives the
  count to 0, so the gate would have gone red on a correct tree.
- **Fix:** the case was **narrowed, not deleted**: it now counts `redirect("/host/listings"` — the
  DESTINATION, which is what 18.1-12 actually cared about (exactly one bounce, to exactly this grid)
  and the half that survives the fix. Its failure message now also tells a future author to append to
  the query and leave the literal alone. A **second case was added** asserting the bounce now carries
  `LISTING_CREATE_FAILED_PARAM` and still appends to the unchanged literal — so the closing of
  18.1-UI-SPEC § NOT COVERED is itself pinned and cannot silently regress back to a silent bounce.
- **Files modified:** `tests/host/verification-surface.test.ts` (not in the plan's `files_modified`)
- **Verification:** 11 passed (was 10); the whole suite green.
- **Commit:** `36ffc43`

**2. [Rule 1 — Stale comment that now lies] `new/page.tsx`'s header still announced the silent bounce**

- **Found during:** Task 2
- **Issue:** the file header stated *"THE `!res.ok` BRANCH BELOW KEEPS ITS SILENT BOUNCE … this plan
  deliberately does not widen into fixing it"*. After this change that paragraph is false, and a
  false comment at the top of a security-adjacent file is worse than no comment.
- **Fix:** rewritten to record that 19-07 closed it, that the bounce and its destination are unchanged,
  and — the part worth keeping loud — that the sentence must not imply a verification problem.
- **Commit:** `36ffc43`

### Recorded, not fixed

**3. One acceptance criterion is unachievable as written, and 2 is the correct value**

The plan asks that `grep -c "LISTING_CREATE_FAILED_PARAM" "src/app/(host)/host/listings/new/page.tsx"`
**returns 1**. It returns **2**: `grep -c` counts *lines*, and an imported token necessarily appears on
both the `import` line and the use site. A count of 1 would mean the token was **hand-typed at the
redirect with no import** — exactly the drift the plan's own rationale ("both sites read the one
exported token, so they cannot drift") forbids. The criterion's intent is met; its arithmetic is off
by the import. Same shape on the destination, where the criterion asks for "at least 1" and gets 2.

---

**Total deviations:** 2 auto-fixed (1 × Rule 3, 1 × Rule 1), 1 recorded criterion arithmetic error.
**Impact:** No scope creep. The one out-of-plan file is a test whose stated scope this plan
supersedes, and it came out of the change stronger — the closed blind spot is now pinned by a case of
its own.

## Issues Encountered

**⚠ `tests/host/verification-panel.test.tsx` went red on 2 of 4 full-suite runs — PRE-EXISTING, and
already on the books.**

Failing cases across the two reds: *"hands the typed phone to the action and locks the control while
the press is out"* and *"one press announces one thing: a second refusal REPLACES the first rather
than joining it"* — the set **moved between runs**, which is the signature of contention rather than a
defect. Solo: `npx vitest run tests/host/verification-panel.test.tsx` → **12 passed**. Two subsequent
full-suite runs were **fully green (2711 passed)**.

This is **deferred-items D8 of phase 18.1**, recorded verbatim as *"`tests/host/
verification-panel.test.tsx` IS FLAKY UNDER SUITE CONTENTION, AND THE FAILING CASE MOVES"*, with the
standing instruction to re-run solo before believing a suite-run red. Nothing in this plan touches
that file, that component or its actions. **Not re-logged** — a second ledger entry for one open item
would make the register say the defect happened twice.

**One thing this plan did NOT do, said plainly:** the render tests mock `@/lib/db` and therefore assert
**branch selection and the copy that results**, never the query. That is the correct division — the
grid's queries are proved elsewhere against real migrations — but it is worth writing down rather than
leaving a reader to infer the boundary.

## Known Stubs

None. `grep -nE "TODO|FIXME|placeholder|coming soon"` over the touched files returns **zero `TODO`s
and zero `FIXME`s**; the four `placeholder` hits are all prose *about the ban on placeholders*
(`SUPPORT_EMAIL` is `null` and a placeholder is forbidden — D-64/D-250) plus one pre-existing comment
about the loading skeleton, not stub markers. Recorded that way rather than as "returns nothing",
because a grep summarised instead of read is how a stub survives a scan.

No hardcoded empty values reach the UI: the notice's only inputs are the module's own constants.

## Threat Flags

None — no new security-relevant surface beyond the one the plan's register already names. The plan's
register is fully addressed:

| Threat | Disposition | Evidence |
|---|---|---|
| T-19-31 Tampering — reflected `searchParams` | mitigated | one equality check against a constant derived wholly from the exported token; hostile-value case **watched red both ways** |
| T-19-32 InfoDisclosure — infrastructure detail in the copy | mitigated | `grep -c '^import' src/lib/listing/create-signal.ts` → **0**, asserted by a test; the sentence is three fixed constants |
| T-19-33 Repudiation — copy about a check that never ran | mitigated | the forbidden-topic table runs against the constant AND the rendered output; the origin comment states why |
| T-19-34 InfoDisclosure — a half-rendered support clause | mitigated | `/support/i`, `/contact/i`, `/get in touch/i` banned at both layers; `SUPPORT_EMAIL` unreachable by construction |
| T-19-35 Tampering — the unchanged destination literal | mitigated | count 1 → 1; the concatenation decision (§ 2) is what preserves it |
| T-19-SC — package installs | not engaged | `git status --porcelain package.json package-lock.json` → **empty** |

## Verification Results

| # | Gate | Result |
|---|---|---|
| 1 | `npx tsc --noEmit` | **exit 0** |
| 2 | `npx vitest run` (whole suite) | **exit 0** — 217 files passed, 2 skipped; **2711 passed** (2682 → 2711, exactly +29: 28 new here, 1 new in verification-surface) |
| 3 | `npm run test:design` | **exit 0** — 74 files, 1336 passed / 3 skipped; `brand-recipe`, `loading-coverage` and `empty-state-adoption` all green |
| 4 | `grep -c '"/host/listings"' new/page.tsx` | **1** — unchanged from HEAD |
| 5 | Hostile parameter | **no notice, echoed nowhere**; both assertions watched red |
| 6 | `npx eslint` on all five touched files | **exit 0** |
| 7 | `git status --porcelain package.json package-lock.json` | **empty** |

## Requirements

**HSURF-02** — this plan is the LAST of the four (19-04, 19-05, 19-06, 19-07) to declare it.
`requirements.ready-ids` reports **1/1 ready**, so the shared-ID gate that held it blocked through
19-06 now releases it. Marked complete; not forced.

## Next Phase Readiness

- **Ready for 19-08**, the last plan in the phase. Nothing here is a dependency of it: no spec was
  added (`e2e/*.spec.ts` is still **39**), no migration, no dependency.
- **Nothing carried forward from this plan.** The one open observation in the phase remains 19-06's
  uncaptured red (deferred-items D3 / WINDOWS 7), untouched by this work.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Plan: 07*
*Completed: 2026-09-04*

## Self-Check: PASSED

All six key files verified present on disk. All three task commits verified in `git log --oneline
--all` (`b5b973c`, `36ffc43`, `cc56eab`). All seven plan-level verification gates re-run and passing.
`ls e2e/*.spec.ts | wc -l` → **39**, unchanged. No stubs introduced.
