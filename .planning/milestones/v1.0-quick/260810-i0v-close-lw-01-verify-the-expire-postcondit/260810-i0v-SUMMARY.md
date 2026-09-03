---
phase: quick-260810-i0v
plan: 01
subsystem: payments
tags: [paymongo, money-path, fail-closed, mutation-testing, LW-01, NT-01]
requires:
  - src/lib/paymongo.ts (getCheckoutSession, CheckoutSessionState)
provides:
  - "expireCheckoutSession tolerance verified from the provider, not from its error prose"
affects:
  - src/app/actions/booking.ts (call sites — BYTE-UNCHANGED, behaviour preserved)
tech-stack:
  added: []
  patterns:
    - "postcondition verification: read the fact back from the third party instead of inferring it from an error sentence"
    - "single allow-value + fall-through throw, never an enumerated reject-list, so provider enum drift fails closed"
key-files:
  created: []
  modified:
    - src/lib/paymongo.ts
    - tests/payments/paymongo-calls.test.ts
    - tests/paymongo/checkout-idempotency-real.test.ts
    - .planning/phases/08-group-bookings/08-REVIEW-gaps.md
    - .planning/phases/08-group-bookings/08-SECURITY.md
    - .planning/phases/08-group-bookings/deferred-items.md
    - .planning/v1.0-MILESTONE-AUDIT.md
decisions:
  - "Tolerance keyed on the provider's reported status === 'expired', never on error text — a PayMongo reword can no longer re-open the T-08-84 recovery livelock."
  - "Single expired-only allow with a fall-through throw; enumerating rejected statuses is forbidden because it silently tolerates every status PayMongo adds later (measured by mutation M3)."
  - "The probe's own error is discarded, never wrapped/chained/cause-attached/logged — the ORIGINAL expire error is rethrown so provider prose gains no new route into an audit row or booker response."
  - "src/app/actions/booking.ts left byte-unchanged; a stale comment there was deliberately NOT refreshed rather than break the money-path byte-gate."
metrics:
  duration: ~35 min
  completed: 2026-08-10
  tasks: 3
  commits: 3
  tests_added: 4
requirements: [LW-01, NT-01, v1.0-AUDIT-5]
---

# Quick Task 260810-i0v: Close LW-01 — Verify the Expire Postcondition Summary

`expireCheckoutSession` now proves a superseded PayMongo checkout session is retired by asking the
provider — one `getCheckoutSession(id)` re-probe, tolerate only on `status === "expired"` — instead of
string-matching PayMongo's 400 prose, with all five fail-closed rules mutation-measured and the change
confirmed live against the `sk_test_` API.

## What Was Built

**The money-path change (`src/lib/paymongo.ts`).** The catch of `expireCheckoutSession` previously
tolerated a repeat expire as success only when the thrown message matched BOTH `/\(400\)/` and
`/already\b.*\bexpired/i`. That inferred a money-path fact from a third party's sentence: a reword, a
localization, or a status-code change would silently stop matching, the fail-closed catch would revert to
genuine-failure behaviour, and the T-08-84 recovery livelock would reappear with no automated detector.

The catch now does exactly ONE re-probe and resolves only when the provider itself reports the session
`expired`. Everything else — `active`, `paid`, unknown, empty, and a probe that itself fails — rethrows the
ORIGINAL expire error into the callers' `recordAudit(needs_attention)` refusal. The implementation is a
single `expired`-only allow with a fall-through `throw`, deliberately NOT an enumerated reject-list.

**The test block (`tests/payments/paymongo-calls.test.ts`).** Rewritten from 4 cases to 8, every case
mocking BOTH the expire POST and the probe GET through a new branching `fetch` stub. `mockResolvedValue` is
no longer valid for any case reaching the probe — it hands back one Response instance whose body can be read
only once, so the probe would fail and the test would pass for the wrong reason. File is now 17 passed.

## Key Implementation Details

- **`getCheckoutSession` is declared BELOW `expireCheckoutSession`** (`src/lib/paymongo.ts:289` before the
  change). Function declarations hoist, so calling it from the catch above is legal; the file was not
  reordered.
- **Strict equality on the raw status string** — no trimming, no `toLowerCase()`, no `includes`. Any
  normalization widens the tolerance; a differently-cased or padded status is drift and fails closed.
- **The success path is untouched**: one fetch, no probe, `return { id: json.data.id }`, Idempotency-Key
  still `checkout-expire:${id}`. Pinned by case 7 asserting `fetchMock.mock.calls` has length exactly 1.
- **Cost**: one extra GET, on the error path only.

## Mutation Measurement

Five mutations of `src/lib/paymongo.ts` (never the test file), each observed RED, each recorded VERBATIM in
the file's MUTATION-VERIFY header, each restored with `git checkout --` before the next. Every rule has its
OWN dedicated case AND its OWN dedicated mutant — no rule borrows another's RED.

| Mutant | Edit | Target case | Observed |
|--------|------|-------------|----------|
| M1 tolerate-on-`active` | allow → `probed.status !== "paid"` | 3 | RED (3 + 8 collaterally) |
| M2 tolerate-on-`paid` | allow → `probed.status !== "active"` | 4 | RED (4 + the retained `paid` pin + 8) |
| M3 enumerated reject-list | allow → `!== "active" && !== "paid"` | 8 | RED — **case 8 ONLY**, 3 and 4 GREEN |
| M4 tolerate-on-probe-failure | probe catch `throw err` → `return { id }` | 6 | RED (6 only) |
| M5 revert to string-match | original two-regex implementation restored | 2 | RED (7 cases) |

**M3 landed exactly as specified** — one failure, case 8, with cases 3 and 4 staying green. That split *is*
the measurement: an enumerated reject-list still handles every status it names and silently tolerates every
status it does not, so `active`/`paid` keep throwing while `""` and `"voided"` start resolving.

**M5 surfaced a substantive finding beyond the planned claim.** Case 2 reddened as predicted (the reworded
400 "This checkout session has already lapsed and can no longer be paid" contains "already" but never
"expired", so the old regex could not match). But cases 3 and 4 ALSO reddened — by *resolving*
(`promise resolved "{ id: 'cs_live' }" instead of rejecting`). Under the old string-match, a session the
provider still reported `active`, and worse one it reported `paid`, was tolerated as a clean expire whenever
PayMongo's 400 prose happened to read "already expired". The old implementation had no way to distinguish
them because it never asked. This is recorded in the header and is a stronger justification for the change
than LW-01 originally claimed.

`git diff --exit-code -- src/` exits 0 after the last restore.

## Live-API Proof — RUN, NOT SKIPPED

`RUN_LIVE_PAYMONGO_PROBE=1 npx vitest run tests/paymongo/checkout-idempotency-real.test.ts` →
**4 passed** against the real PayMongo test-mode API (`sk_test_` key present in `.env.local`, 2026-08-10).

Provider-reported evidence, verbatim from the run:

```
[case2] pre-expire status=active
[case2] post-expire status=expired
[case3] superseded=cs_541266aeb17dbaafd51c29d8:expired replacement=cs_c3eb245310ae9850c6facc9a:active
[case4] repeat-expire of cs_c2b0093a6a92bd4d91fb37be RESOLVED (wrapper tolerated the underlying 400)
```

Case 4 is the load-bearing one: under the NEW implementation the repeat expire can only resolve if the GET
came back `expired`. The assumption the whole change rests on — that PayMongo reports `status: "expired"` on
the GET after a repeat-expire 400 — is therefore confirmed against the live API, not assumed.

## Deviations from Plan

### Auto-fixed / adjusted

**1. [Rule 3 - Blocking] `errorResponse` hoisted to module scope**
- **Found during:** Task 2
- **Issue:** The plan said to "reuse the existing module-level `errorResponse`" helper, but it was actually
  declared *inside* the 08-21 describe block. Task 2(d) needed it from the earlier CR-02 describe block.
- **Fix:** Moved `errorResponse` next to `jsonResponse` at module level and added the new
  `stubExpireAndProbe` branching stub there too, so both describe blocks share one implementation instead of
  duplicating it.
- **Commit:** `cd10687`

**2. [Rule 3 - Blocking] The `already\b` token removed from the expire docblock**
- **Found during:** Task 1
- **Issue:** My first docblock draft quoted the removed regexes literally (`/already\b.*\bexpired/i`), which
  kept the token the plan's `grep -n "already\\b" src/lib/paymongo.ts` gate targets inside
  `expireCheckoutSession`.
- **Fix:** Reworded to describe the old regexes ("a `(400)` status-code regex ANDed with a regex over the
  error sentence's wording") and pointed at git history + mutation M5 for the exact text. The region is now
  clean; the two surviving `already` hits in the file (lines 385, 480) are pre-existing and in
  `createRefund`/unrelated code, untouched by this task.
- **Commit:** `2130ff2`

**3. Task 1's expected-GREEN branch did not hold — the plan's documented alternative was taken**
- **Found during:** Task 1 verification
- **Issue:** The plan predicted `paymongo-calls.test.ts` would still pass after the source change. It did
  not: case (a) went RED, verbatim —
  `AssertionError: promise rejected "Error: PayMongo POST /v1/checkout_session…" instead of resolving` /
  `Caused by: Error: PayMongo POST /v1/checkout_sessions/cs_x/expire failed (400): Checkout session is
  already expired`. Cause: case (a) used `mockResolvedValue`, so the probe received the same
  already-consumed Response, its body read threw, and the ORIGINAL error was correctly rethrown. The plan
  anticipated this only for the `:158-170` "already paid" case, but it applied to case (a) too.
- **Fix:** Per the plan's own `<done>` instruction, the output was recorded and the case fixed in Task 2 (it
  became case 1 on the branching stub). **The source was NOT weakened to make it green.**

### Not fixed — deliberate deferrals

**1. `src/app/actions/booking.ts:854-860`'s comment is now partially stale.** It reads
"`expireCheckoutSession` TOLERATES exactly that 400 as success (the session is already non-payable)". That
is still *substantively true* — that 400 is still tolerated in the real repeat-expire case — but it is no
longer the whole mechanism: the tolerance is now conditional on the re-probe reporting `expired`. It was
left as-is **deliberately**, because this plan's byte-unchanged gate on that file is a money-path safety gate
that outranks a comment refresh. **Logged as a follow-up-worthy wording refresh so it is a known deferral,
not a miss.** The same stale phrasing pattern appears near `:623-640` for `updateDeclaredPax`.

**2. T-08-74 untouched and left open** — QRPh captures are not API-refundable. Milestone-audit item 5 is
half-closed, not closed; see below.

## Tracking Documents

| Document | Change |
|----------|--------|
| `08-REVIEW-gaps.md` | LW-01 + NT-01 moved to Resolved in the HG-01 style (struck heading, close note with sha, original under a `<details>` fold). Frontmatter `low: 1→0`, `nit: 2→1`, `total: 3→1`, `resolved: 1→3`. `files_reviewed_list` NOT rewritten (it is the review's own scope). |
| `08-SECURITY.md` | LW-01 bullet struck and rewritten as closed, kept in Non-Blocking Review Notes. `threats_open` UNCHANGED — this closed a durability note, not a threat. |
| `deferred-items.md` | LW-01 + NT-01 struck as closed; NT-02 explicitly marked STILL OPEN. |
| `v1.0-MILESTONE-AUDIT.md` item 5 | Half-closed using the item-3 partial-close convention. |
| `checkout-idempotency-real.test.ts` | COMMENTS ONLY — case 4's prose now says the wrapper re-probes. No assertion, gate, or `it()` touched. |

**On milestone-audit item 5 specifically:** the item heading is NOT struck, no `~~strikethrough~~` spans
both halves, and no tally was decremented in a way implying the item is gone. T-08-74 is restated at the top
of the item as **STILL OPEN** with its rationale (a PayMongo rail limitation, not a code gap, tracked for a
separate follow-up quick task). `grep -rn "T-08-74" .planning/v1.0-MILESTONE-AUDIT.md
.planning/phases/08-group-bookings/ | grep -v "~~T-08-74"` returns all 13 mentions un-struck and reading as
open.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit 0 |
| `npx vitest run tests/payments/paymongo-calls.test.ts` | **17 passed** (13 baseline − 4 old cases + 8 new) |
| `npx vitest run` (full suite) | **1146 passed / 4 skipped / 0 failed** — baseline 1142, net **+4**, all in `paymongo-calls.test.ts` |
| DB-backed regressions (4 suites, live Docker Postgres) | 30 passed |
| `git diff --exit-code 3db3082 -- src/app/actions/booking.ts` | exit 0 at the end of every task |
| `git diff --exit-code -- src/` after all 5 mutations | exit 0 |
| `already\b` inside `expireCheckoutSession` | none |
| `getCheckoutSession(id)` inside `expireCheckoutSession` | present (`src/lib/paymongo.ts:289`) |
| Gated live PayMongo suite | **RUN — 4/4 passed** (not skipped) |

Note on the base commit: the plan hardcodes `7f46747` as the byte-unchanged base. `3db3082` was HEAD at
dispatch and the two intervening commits touched only `.planning/`, so both resolve identically for
`src/app/actions/booking.ts`. The gate was run against `3db3082`.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | `2130ff2` | Verify the expire postcondition from the provider, not from its prose |
| 2 | `cd10687` | 8 cases + 5 recorded mutation REDs; NT-01 title corrected |
| 3 | `950dcd7` | Close LW-01 + NT-01 in four tracking docs — T-08-74 left plainly OPEN |

## Known Stubs

None. No placeholder values, no unwired data sources, no TODO/FIXME introduced.

## Threat Flags

None. No new network endpoint, auth path, file access pattern, or schema change. The one new outbound call
is a GET to an endpoint the module already talks to, on an already-failing path, issued at most once. Every
disposition in the plan's threat register (T-i0v-01 … T-i0v-06) is mitigated as specified; T-i0v-04 (the
extra round-trip) was accepted and is bounded at one probe with no retry loop. No package was installed
(T-i0v-SC did not arise).

## Self-Check: PASSED

All 8 files verified present on disk; all 3 commit hashes verified in `git log`; the re-probe call verified
at `src/lib/paymongo.ts:289` inside `expireCheckoutSession`.
