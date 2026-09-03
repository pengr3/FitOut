---
phase: 13-confirmation-bookings-trust
plan: 02
subsystem: ui
tags: [design-system, components, accessibility, clipboard, selector-contract, guarded-affordance, money]

# Dependency graph
requires:
  - phase: 11-design-system-foundation
    provides: "PanelCard (DS-11's third container, `tone=\"muted\"` as the declared in-page advisory surface), selector-contract.ts's typed inventory + its two-directional gate, site-footer.tsx:185-196 (the only working SUPPORT_EMAIL guard in the tree), site.ts's D-26 block and the inverted site-contacts gate"
  - phase: 08-group-bookings
    provides: "share-link-box.tsx:39-57 — the presence-checked clipboard write and the optional-call trap it exists to avoid"
  - phase: 13-confirmation-bookings-trust
    plan: 01
    provides: "BOOKING_SHELL / CONFIRMATION_MOMENT_MIN_H and the payment-state seed helper — neither consumed here; 13-01's operational finding (never run the two vitest configs concurrently) WAS applied"
provides:
  - "MoneyStatement — STATE-06's single owner of every 'where is your money' sentence on /bookings/**, PanelCard tone=muted, finished-string props only, zero arithmetic, no live region"
  - "SupportPath — D-64's guarded affordance, code-complete and rendering nothing while SUPPORT_EMAIL is null; the guard, the mail link and the label all in ONE file"
  - "BookingReference — TRUST-02's copyable FIT- string in `font-mono tabular-nums`, the repo's FIRST Geist Mono call site, with a clipboard write that cannot announce a copy it did not make"
  - "Three declared selector rows (support-path, money-statement, booking-reference), each with the reason a role query cannot carry it"
  - "Two RTL suites: 12 new cases, 4 of them watched failing"
affects: [13-03, 13-04, 13-06, 13-07, 13-08, 13-09, 13-10, 13-11, 13-12, 13-13, 13-14, 13-15, 13-16]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A guard whose TRUE-BRANCH builds the guarded literal and hands it down as a finished string — the only way to have two presentations share one scheme literal without moving it outside the conditional's character range"
    - "Geist Mono's first call site in the repository (`font-mono tabular-nums` on a mostly-alphabetic reference)"
    - "A `data-testid` on a bare wrapper around PanelCard, so the measured box INCLUDES the panel's padding (the `(legal)/terms/page.tsx:147-152` shape, applied to a measurement rather than to a presence check)"
    - "A Range-based select-the-text fallback where the share-link idiom had an input to `select()`"

key-files:
  created:
    - "src/components/booking/support-path.tsx"
    - "src/components/booking/money-statement.tsx"
    - "src/components/booking/booking-reference.tsx"
    - "tests/booking/money-statement.test.tsx"
    - "tests/booking/booking-reference.test.tsx"
  modified:
    - "src/lib/design/selector-contract.ts"

key-decisions:
  - "The mail href is built INSIDE the guard's true-branch and passed down as a finished string, so the file holds exactly ONE scheme literal and it is inside the guard's range — a `const` above the return would have been unguarded, which is the correct-looking refactor that turns the gate red"
  - "`SupportPath` gained a `term` prop on its `trust-row` arm only (a discriminated union): a `<dt>` with no term is not a `<dl>` row, and a row whose term repeats its own description is two copies of one string"
  - "`MoneyStatement`'s line 2 is a `<div>`, not a `<p>` — the slot is SPECIFIED to carry flow content (the guarded control, the reference), and a paragraph silently closes around it and reparents the control out of the panel"
  - "`card-pattern-coverage.test.ts` was NOT modified: its inventory is defined as the 11-UI-SPEC's three `Replaces` lists, and Phase 12 set the precedent by NOT adding `availability/booking-panel.tsx` (a PanelCard adopter) to it. The plan's instruction was conditional and the condition is false"
  - "Three greps in this plan's own acceptance criteria could only be satisfied by NOT spelling the thing being checked — the attribute, the deriver's name, the capitalised label. All three are named descriptively, per `booking-row.tsx:112`, and each file records that it is deliberate"

patterns-established:
  - "A `why` string in `selector-contract.ts` is a string LITERAL, not a comment, and is therefore VISIBLE to every AST-based source scan — prose in that file can trip gates that prose in a `//` comment never could"
  - "`price-surface.test.ts` being green is NOT evidence about a file it does not scan: its scope is a three-file declared list, and a new money surface has to carry its zero-arithmetic property structurally instead"

requirements-completed: []  # NONE. See "Requirements: deliberately NOT marked complete" below.

# Metrics
duration: 25min
completed: 2026-08-20
---

# Phase 13 Plan 02: The Three Shared Domain Components Summary

**One component now owns every "where is your money" sentence, one owns the guarded support affordance behind a lexical conditional the inverted gate was watched rejecting under the wrong shape, and one owns the copyable `FIT-` reference in the repository's first Geist Mono call site — with a clipboard write watched announcing a false success the moment its presence check was removed.**

## Performance

- **Duration:** ~25m
- **Started:** 2026-08-20T05:05Z (13:05 +0800)
- **Completed:** 2026-08-20T05:30Z (13:30 +0800)
- **Tasks:** 3 / 3
- **Files:** 5 created, 1 modified

## Accomplishments

- **`SupportPath` is code-complete and guarded lexically**, and the guard is the one shape the scanner accepts: a conditional expression whose false branch is the bare `null` keyword, in the same file as the literal it guards. It renders **nothing at all** today. The inverted gate is **green, UNMODIFIED** (`git diff --stat` on it is empty against 13-01's HEAD), and it was **watched going red** under an early-return guard, naming the exact literal it could no longer see inside a guard.
- **`MoneyStatement` exists with no `number` prop at all.** The zero-arithmetic property is carried structurally rather than by a scan — there is nothing on this component for arithmetic to be *performed on*. Its header carries D-94's boundary (four specified statuses; a fifth is a question, not a sentence) and the D-79/D-83 reconciliation (*"on its way"* vs *"We've refunded"*), so the next author finds the reasoning rather than the discrepancy.
- **`BookingReference` is Geist Mono's first call site in this repository.** 13-UI-SPEC's Typography rule 1 closed RESEARCH Open Question 1 as a *decided* call — `tabular-nums` normalises digits only, and a Crockford base32 reference is mostly letters — and this is where that decision lands.
- **The clipboard write cannot lie.** Its presence check was removed and case (5) went red: with no clipboard API at all, the component announced success. That is `T-13-02-SILENTCOPY` demonstrated rather than asserted.
- **Three selector rows declared**, each with the reason a role query cannot carry it, and the declared set and the rendered set are the same set on every commit — because each row shipped in the same commit as its literal.
- **Zero packages installed. Zero migrations. Zero new `ALLOWED_RAW_CARD` rows. `ACCENT_USES` untouched.**

## Task Commits

1. **Task 1: SupportPath — the guard, the mail link and the label in one file (D-64)** — `b04f9ae` (feat)
2. **Task 2: MoneyStatement — STATE-06's single owner (D-73, D-94)** — `b1f452d` (feat)
3. **Task 3: BookingReference — copyable, fixed-advance-width, server-derived (D-78)** — `75cb31e` (feat)

## Files Created/Modified

- `src/components/booking/support-path.tsx` — **new.** Server Component. One `SUPPORT_EMAIL !== null` conditional expression; the href built inside its true-branch; two presentations (`panel` → full-width `outline`/`touch` control, `trust-row` → `link`-weight `<dt>`/`<dd>` group) behind a discriminated union. Authors **no** visible copy: `label` and `term` are props, so the capitalised-word constraint lands on the caller's file, and the header says so.
- `src/components/booking/money-statement.tsx` — **new.** Server Component composing `PanelCard tone="muted"`. Props are `sentence: string` (finished) and `detail?: ReactNode`. The hook is on a bare wrapper so the measured box is the panel's, padding included.
- `src/components/booking/booking-reference.tsx` — **new.** Client Component (`"use client"`), the only one of the three. `font-mono tabular-nums`, size from a named type role, presence-checked clipboard write, Range-select fallback, `aria-label="Copy booking reference"` on a control that carries **no** hook.
- `tests/booking/money-statement.test.tsx` — **new**, 6 cases.
- `tests/booking/booking-reference.test.tsx` — **new**, 6 cases.
- `src/lib/design/selector-contract.ts` — **+3 rows** under a `13-02` banner, one per task, each shipped in the same commit as the literal it declares.

## Verification

Every acceptance criterion was run and its output observed. **The two vitest configs were never run concurrently** (13-01's operational finding).

**Task 1**

| Criterion | Result |
|---|---|
| `npx vitest run --config vitest.design.config.ts tests/design/site-contacts.test.ts` | **23 passed / 3 skipped**, exit 0 |
| `git diff --stat tests/design/site-contacts.test.ts` | **empty — zero lines changed** |
| `grep -c 'SUPPORT_EMAIL !== null ?'` | `1` |
| `grep -c 'if (SUPPORT_EMAIL'` | `0` |
| `grep -c 'mailto:'` | `1`, and that line is `` href={`mailto:${SUPPORT_EMAIL}?subject=…`} `` — the constant interpolated, not a literal |
| `grep -c 'encodeURIComponent'` | `2` (≥ 1) |
| Watched red under an early-return guard | **observed** — verbatim below |
| `npx tsc --noEmit` | exit 0 |

**Task 2**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/money-statement.test.tsx` | **6 passed** |
| arithmetic scan, comments stripped | **no match on any non-comment line**; and no operator adjacent to `sentence`/`detail` anywhere in the code |
| `grep -c 'from "@/components/ui/card"'` | `0` — it composes `PanelCard` |
| `grep -c 'aria-live'` | `0` |
| `card-pattern-coverage.test.ts` | passes, **ZERO** new `ALLOWED_RAW_CARD` rows (file untouched — see the recorded judgement) |
| `price-surface.test.ts` | green — **but see the honesty note below; it does not scan this file** |
| `npx tsc --noEmit` | exit 0 |

**Task 3**

| Criterion | Result |
|---|---|
| `npx vitest run tests/booking/booking-reference.test.tsx` | **6 passed**, including the absent-clipboard case and the rejected-write case |
| `grep -c 'font-mono'` / `grep -c 'tabular-nums'` | `4` / `4` (≥ 1) |
| `grep -c 'bookingReference'` | `0` — the value is a prop and the deriver is named descriptively |
| `grep -c 'data-testid'` | `1`, at line 149, on the `<p>` that holds the string — the button carries none (asserted in case (3)) |
| `npx vitest run --config vitest.design.config.ts` | **41 files, 749 passed / 3 skipped** — identical to 13-01's baseline, no pin moved |
| `npx tsc --noEmit` | exit 0 |

**Plan-level verification**

| Gate | Result |
|---|---|
| `npm test` | **143 files passed / 1 skipped; 1319 passed / 4 skipped** — exit 0. (13-01 closed at 141/1307; +2 files and +12 tests is exactly this plan's two suites.) |
| `npm run test:design` | 41 files, 749 passed / 3 skipped |
| `npm run build` (lint + design gate + next build) | **exit 0** |
| `git diff --stat` on `site-contacts.test.ts` and `site.ts` | **empty — zero changes to both** |
| `git diff --stat drizzle/` | **empty**; `ls drizzle/*.sql \| tail -1` → `drizzle/0025_audit_resolved_by.sql` (D-80 / GATE-06 intact) |
| `git diff --stat package.json package-lock.json` | **empty — zero packages** (T-13-02-SC discharged) |
| `grep -rn 'SUPPORT_EMAIL' src/components/booking/` | the import and the conditional in `support-path.tsx` **only**; four further hits are that file's own prose. **Never passed as a prop from anywhere.** |
| `npx eslint` on all six touched files | 0 errors |

## The Watched Reds — verbatim

Four reds were observed. Three were deliberate probes; one was real and is the most useful thing in this plan.

### 1. Task 1's required probe — the early-return guard (deliberate)

The conditional was rewritten as `if (SUPPORT_EMAIL === null) return null;` and nothing else changed:

```
 FAIL  tests/design/site-contacts.test.ts > D-26 (SUPPORT_EMAIL === null) — zero support
       affordances render anywhere > every `mailto:` in src/ sits inside a verified SUPPORT_EMAIL guard
AssertionError: expected [ Array(1) ] to deeply equal []

- Expected
+ Received

- []
+ [
+   "src/components/booking/support-path.tsx:165 — \"mailto:\"",
+ ]

 Test Files  1 failed (1)
      Tests  1 failed | 22 passed | 3 skipped (26)
```

Two things this proves beyond "it went red". The failure names the **literal and its line**, so the scanner genuinely reached the new file rather than reporting a stale zero. And **only one** of the twenty-three assertions moved — the guard-the-guard block, the positive control, the prose control and the one-conditional/no-else assertions on the footer all stayed green in the same run, which is what shows the red is about the guard SHAPE and not about the file existing. Restored via the saved copy → `23 passed | 3 skipped`.

### 2. Task 1's UNPLANNED red — the selector row's own reason tripped the gate it documents

This one was not a probe. The first draft of the `support-path` row's `why` explained the lower-case naming by **quoting the capitalised spelling**, and the gate went red *on `selector-contract.ts` itself*:

```
 FAIL  tests/design/site-contacts.test.ts > … > every `Support` label in src/ sits inside a verified
       SUPPORT_EMAIL guard
AssertionError: expected [ Array(1) ] to deeply equal []

- []
+ [
+   "src/lib/design/selector-contract.ts:576 — \"construction. A `Support-Path` spelling would make
+     the inverted gate red against the very\"",
+ ]
```

**Why this is worth recording rather than just fixing.** `site-contacts.test.ts` states in its own header that *"comments are invisible BY CONSTRUCTION"* — the walk visits literals, and comments produce no node. That guarantee is what lets `site.ts` and the footer discuss the decision at length. **It does not extend to `selector-contract.ts`**, because a `why` is a string LITERAL, not a comment. The inventory module is inside `src/`, inside the scan, and every sentence in it is a node. This is the same family as 13-01's Deviation 1 and the repo's earlier `empty-state.tsx` and `booking-row.tsx:112` findings, with a new twist: the file that exists to *document* hooks is the one file where documentation is scannable. The finding is now recorded **in the row itself**, so the next author does not re-discover it by tripping it.

### 3. Task 2 — the live-region assertion, proved able to fail

`aria-live="polite"` was added to the wrapper and nothing else changed:

```
 FAIL  tests/booking/money-statement.test.tsx > MoneyStatement — STATE-06's single owner (D-73)
       > (4) mounts NO live region on a fresh render
AssertionError: expected <div …(2)>…(1)</div> to have a length of +0 but got 1

- Expected
+ Received

- 0
+ 1
```

An absence assertion that has never been watched failing is indistinguishable from a query that matches nothing. This one matches. (The module-missing red before the component existed is recorded too — `Failed to resolve import "@/components/booking/money-statement"`, `0 test` — but it is a weak red: it proves the import path, not the assertions.)

### 4. Task 3 — the clipboard presence check, removed (T-13-02-SILENTCOPY)

`writeToClipboard` was rewritten as the optional-call trap the idiom exists to avoid — `await navigator.clipboard?.writeText(text); return true;` — and case (5), which runs with **no clipboard API at all**, went red:

```
 FAIL  tests/booking/booking-reference.test.tsx > BookingReference — TRUST-02 / D-78
       > (5) with NO clipboard API, announces no success — it says so and offers the manual route
AssertionError: expected "vi.fn()" to be called with arguments: [ Array(1) ]

Number of calls: 0
```

**Read what that says.** The failure is that the *failure* toast was never called — because the optional call resolved to `undefined`, the `try/catch` saw no error, and the component announced **"Reference copied"** over a clipboard that does not exist. That is the exact defect `share-link-box.tsx:39-57` was written to prevent, reproduced on demand in the new file. Restored → 6 passed.

## Deviations from Plan

### Auto-fixed

**1. [Rule 3 — Blocking] The `support-path` selector row's own reason tripped the inverted gate**

- **Found during:** Task 1, before the first commit.
- **Issue:** The row's `why` quoted the capitalised, word-bounded label in order to explain why the hook is lower-case. A `why` is a string literal in a file inside the scan, so the explanation became a violation. Full output in *Watched Red 2*.
- **Fix:** Rephrased to "a capitalised spelling of the hook", and the row now carries the finding itself with an explicit *"do not re-introduce the word here to explain it"*.
- **Commit:** `b04f9ae`.

**2. [Rule 3 — Blocking] `money-statement.tsx`'s own header failed the plan's `grep -c 'aria-live'` criterion**

- **Found during:** Task 2.
- **Issue:** The plan requires a `<div>`-level statement that the file carries no live region *and* requires `grep -c 'aria-live'` to return `0`. Writing the required sentence in the obvious way made the required grep return `1` against a correct file. This is 13-01 Deviation 1's exact shape, one plan later, on a different attribute.
- **Fix:** The attribute is named descriptively (`the politeness attribute`), following `booking-row.tsx:112`'s precedent, and the file records that the first draft quoted it and moved the count. `grep -c 'aria-live'` now returns `0`; every word of the reason survives.
- **Commit:** `b1f452d`.

**3. [Rule 3 — Blocking] Task 3's acceptance criterion contradicts Task 3's own action instruction**

- **Found during:** Task 3.
- **Issue:** The action says to *"record the Phase-15 seam (D-78) as a contract in the header: Phase 15's subject line interpolates the exact string `bookingReference(bookingId)` returns"*. The acceptance criterion says `grep -c 'bookingReference'` must return `0`. Writing the instruction as worded fails the criterion, because the grep counts prose.
- **Fix:** The seam is recorded in full, naming the module (`src/lib/booking/reference.ts`) and never the identifier, plus an explicit ⚠ block explaining that the omission is the grep-tripwire discipline (13-PATTERNS § H) and must not be "helpfully" fixed. The substance of the contract — *the exact string, never a retyped, reformatted, truncated or lower-cased variant* — is stated verbatim. `grep -c 'bookingReference'` returns `0`.
- **Commit:** `75cb31e`.

**4. [Rule 1 — Bug] A test of mine read a container RTL had already emptied**

- **Found during:** Task 2, on the first green run (1 failed / 5 passed).
- **Issue:** Case (6) captured a container, called `cleanup()`, then asserted on that container's `textContent`. RTL unmounts and **empties** the container on cleanup, so the read was `""`. Left alone it would have become the mirror failure — an assertion comparing two empty strings while looking real.
- **Fix:** The text is read **before** `cleanup()`, with the reason recorded at the line.
- **Commit:** `b1f452d`.

### Recorded judgements (plan instructions that were conditional, and the condition was false)

**A. `tests/design/card-pattern-coverage.test.ts` was NOT modified, and that is the answer to the plan's conditional.**

The plan says to *"re-measure `CARD_SURFACES` / `EXPECTED_SURFACES` **if** the `PanelCard` composition adds a declared surface"*. It does not, and the file is measured rather than assumed:

- `CARD_SURFACES` is defined in its own header as *"the twelve files the 11-UI-SPEC's three `Replaces` lists name"*, and the count assertion's failure message says the inventory *"is not the size the UI-SPEC's three `Replaces` lists describe"*. `money-statement.tsx` is a Phase-13 component and appears in no `Replaces` list, so adding it would make that message false.
- **The precedent was measured, not argued:** `grep -rln PanelCard src/` finds `src/components/availability/booking-panel.tsx` — a Phase-12 `PanelCard` adopter — and it is **not** in `CARD_SURFACES`, whose pin is still `12`. Phase 12 set this precedent and this plan follows it.
- Adding a row would have required moving **three** pinned numbers (`EXPECTED_SURFACES` 12→13, `adopted` 10→11, and the header's "TWELVE = 2 + 5 + 5" arithmetic) to record a surface neither gate needs: the forward half only checks declared rows, and the inverse half never fires because this component composes `PanelCard` rather than opening a raw `<Card>`.
- The acceptance criterion — *passes with ZERO new `ALLOWED_RAW_CARD` rows* — is satisfied either way, and is satisfied here with **zero** rows added and **zero** lines changed in that file.

**B. `SupportPath` gained a `term` prop on one arm of its union.** The plan names `reference`, `label` and `variant`. A `<dl>` row is a `<dt>` **and** a `<dd>`, so the trust-block presentation needs two strings; a `<dt>` holding a copy of its own `<dd>` is not a row, it is a duplicate. The props are therefore a discriminated union and `term` exists only on the `trust-row` arm, so the `panel` call sites cannot pass it and the `trust-row` call sites cannot omit it. The reason is recorded on the prop.

### Honesty note — one green that is NOT evidence

`tests/design/price-surface.test.ts` passes, and the plan lists it as a Task-2 criterion. **It does not scan `money-statement.tsx`.** Its scope is a declared three-file list (`PRICE_SURFACE_FILES` = `price-breakdown.tsx`, `availability-calendar.tsx`, `listings/[id]/book/page.tsx`), so its green says nothing whatsoever about the new component — it is a scan-of-nothing with respect to this plan, and reporting it as coverage would be exactly the vacuity this repository keeps finding. The zero-arithmetic property is instead carried **structurally**: there is no `number` prop on `MoneyStatement` for arithmetic to be performed on, and that absence is asserted by the type, not by a scan. If a later plan wants the AST gate to cover this file, the honest change is a row in `PRICE_SURFACE_FILES` — not a citation of today's green.

## Threat Flags

None. This plan introduces no network endpoint, no auth path, no schema change and no new trust boundary beyond the three the plan's own register names.

- **T-13-02-SUPCONTACT** (Spoofing) — mitigated. The address is read from `SUPPORT_EMAIL` and never retyped; while it is `null` the component renders nothing. The gate is green **UNMODIFIED** and was watched failing.
- **T-13-02-MAILTOINJ** (Tampering) — mitigated. The subject is `encodeURIComponent`-ed and carries the reference and nothing else. Verified by reading the single link line: no address, no amount, no venue, **no booking id**.
- **T-13-02-REFLEAK** (Information Disclosure) — mitigated. `grep -c 'bookingReference'` on the client component returns `0`; `node:crypto` never enters the bundle, and the opaque UUID remains the access token.
- **T-13-02-MONEYCROSS** (Tampering) — mitigated structurally: no `number` prop exists on `MoneyStatement`. See the honesty note above for what the AST gate does and does not cover.
- **T-13-02-SILENTCOPY** (Repudiation) — mitigated **and proved**: the mitigation was removed and the false success was observed (Watched Red 4).
- **T-13-02-SC** (supply chain) — discharged trivially. **Zero packages installed**; `package.json` and `package-lock.json` are byte-unchanged.

## Known Stubs

None — but one deliberate absence, which is not a stub:

**Nothing in `src/` mounts any of these three components yet, and that is the plan's explicit instruction** (*"No surface mounts them in this plan — that is deliberate"*). The contract is nonetheless satisfied on the commit that creates each file, because the source-scanning selector gate reads the `data-testid` literal out of the component's own file — which is why each row shipped in the same commit as its literal, and why the declared set and the rendered set are the same set at every commit rather than only at the end. Plans 13-04, 13-07, 13-08, 13-09 and 13-15 own the call sites.

`SupportPath` additionally renders nothing at RUNTIME, and that is D-64 rather than an incompleteness: the one line that changes is `src/lib/site.ts:70`, and it is an operator action.

## Requirements: deliberately NOT marked complete

The plan's frontmatter carries `requirements: [STATE-06, TRUST-01, TRUST-02, STATE-05]`, and **none of them was marked complete.** No surface mounts these components, so no requirement is *observable* yet, and every one of the four is carried by later plans in the same phase:

- **STATE-06** — also `13-04`, `13-07`, `13-10`, `13-15`.
- **TRUST-01** — also `13-06`, `13-09`, `13-10`, `13-14`, `13-15`, `13-16`.
- **TRUST-02** — also `13-04`, `13-08`, `13-10`, `13-12`, `13-13`.
- **STATE-05** — also `13-01`, `13-03`, `13-04`, `13-07`, `13-15`, `13-16`.

Checking a box now would put `Complete` in `REQUIREMENTS.md`'s traceability table for surfaces that do not exist. **And two of the four cannot close fully at all:** 13-UI-SPEC § The Support Path states that **TRUST-01 and STATE-05 close as PARTIAL at phase end** — code-complete, address-pending — carried as a named `human_needed` item, because `SUPPORT_EMAIL` is `null` (D-64). This plan is the reason the "code-complete" half of that sentence is now true; it is not the plan that closes either ID.

## Self-Check: PASSED

Files claimed created/modified, verified present on disk:

- `src/components/booking/support-path.tsx` — FOUND
- `src/components/booking/money-statement.tsx` — FOUND
- `src/components/booking/booking-reference.tsx` — FOUND
- `tests/booking/money-statement.test.tsx` — FOUND
- `tests/booking/booking-reference.test.tsx` — FOUND
- `src/lib/design/selector-contract.ts` — FOUND (modified, +3 rows)

Commits claimed, verified in `git log`:

- `b04f9ae` — FOUND
- `b1f452d` — FOUND
- `75cb31e` — FOUND
