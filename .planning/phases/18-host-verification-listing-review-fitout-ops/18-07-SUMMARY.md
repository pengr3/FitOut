---
phase: 18-host-verification-listing-review-fitout-ops
plan: 07
subsystem: payments
tags: [inngest, cron, postgres, drizzle, payouts, suspension, enforcement, vitest]

# Dependency graph
requires:
  - phase: 18-02
    provides: "`host_verification` table + `host_verification_status` enum (incl. `suspended`), and `makeVerifiedHost`'s `verificationStatus` fixture dimension"
  - phase: 18-03
    provides: "the sell-gate's `COALESCE(hv.status::text,'unverified')` SQL shape — the expression this plan deliberately INVERTS the polarity of, at the opposite question"
  - phase: 05
    provides: "`payout-sweep.ts` (queryDuePayouts / payOne, the claim INSERT) and `payout-reconcile.ts` (queryProcessingLedger / reconcileOne / alertStuckHeld)"
provides:
  - "ENF-02: a suspended host's due payouts are excluded BEFORE the claim, so no `host_payout_ledger` row is ever created and no operator is ever paged about a deliberately frozen payout"
  - "A FOURTH numbered invariant in `payout-sweep.ts`'s header contract: the suspension freeze is a pre-claim predicate, not a branch"
  - "A narrow crash-window mirror in `alertStuckHeld` — the only `held` row a suspended host can own"
  - "A pinned NEGATIVE: a stuck `processing` row on a suspended host still pages, and a test fails loudly if anyone extends the mirror onto it"
  - "tests/payments/payout-suspension-freeze.test.ts — 8 cases, both ENF-02 clauses, both mutation-proved"
affects: [18-08 (ops cancel-and-refund — the D-235 fee-debit suppression lands on the same ledger), 18-13 (host-facing suspension signals — owner of the copy gap this plan records), host-earnings, payouts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pre-claim filtering as an alert-hygiene mechanism: suppress the WORK, not the SYMPTOM, so the alert channel needs no second rule"
    - "Control-paired absence assertions: every 'nothing happened' case seeds a second subject that DOES happen in the same call"

key-files:
  created:
    - tests/payments/payout-suspension-freeze.test.ts
  modified:
    - src/inngest/functions/payout-sweep.ts
    - src/inngest/functions/payout-reconcile.ts

key-decisions:
  - "The freeze went in `queryDuePayouts` BEFORE the claim, not in `payOne` after it — the placement is what makes ENF-02's second clause true by construction rather than by a second check"
  - "`state = 'processing'` is deliberately NOT frozen: that money has already left the platform wallet, so a stranded transfer must page whether or not its host is suspended"
  - "`<> 'suspended'` is the correct polarity and is NOT the sell-gate's `IN ('approved','grandfathered')`: a host with no verification row, and a `rejected` host, are still paid for sessions already delivered"
  - "No `frozen` ledger state was introduced — that would be an ALTER TYPE on a committed enum plus an edit to every existing predicate, to express what a WHERE clause already expresses"
  - "`alertStuckHeld`'s ledger table had to be ALIASED, not merely joined: `host_verification` also has a `created_at`, so the bare SELECT becomes ambiguous the moment the join lands"

patterns-established:
  - "Pattern 1: when a freeze could manufacture false alerts, move the freeze upstream of the write rather than teaching the alert to ignore rows"
  - "Pattern 2: assert the absence with a COUNT against the table, not with an empty result from the query you just changed — the COUNT is what separates pre-claim from post-claim"
  - "Pattern 3: pin the deliberate NON-coverage (here, `processing`) with a case that fails when a later reader 'completes' the mirror"

requirements-completed: [ENF-02]

# Metrics
duration: 22min
completed: 2026-09-01
---

# Phase 18 Plan 07: Payout Freeze Under Suspension Summary

**A suspended host's payouts freeze at the SELECT, before the claim — so no ledger row is ever written, and ENF-02's "a frozen row does not page an operator" clause holds by construction rather than by a second check.**

## Performance

- **Duration:** 22 min
- **Started:** 2026-08-31T23:50:00Z
- **Completed:** 2026-09-01T00:12:00Z
- **Tasks:** 2 (both auto)
- **Files modified:** 2 modified + 1 created

## Accomplishments

- **ENF-02 clause (a) — no payout leaves.** `queryDuePayouts` now excludes a host whose
  `host_verification.status` is `suspended`, inside the existing predicate scope, with the `kind = 'payout'`
  scoping untouched.
- **ENF-02 clause (b) — and it is the one that decided the design.** Because the filter sits BEFORE
  `payOne`'s claim `INSERT`, no `host_payout_ledger` row is ever created for a suspended host. There is
  nothing for `alertStuckHeld` to page about. A row that does not exist cannot read as stuck.
- **The trap avoided, and proved avoided.** The obvious implementation (claim the row, then refuse to
  transfer) satisfies (a) and breaks (b): it strands one `held` row per suspended booking, each firing a
  false `[payout-alert]` forever — the failure `alertStuckHeld`'s own comment already names for
  `host_cancel_fee` debits. Installing that implementation reddens two cases; see Mutation Proofs.
- **The crash-window mirror**, which is real new SQL rather than "one more AND": `alertStuckHeld` read
  `host_payout_ledger` with no host join at all.
- **The negative half pinned.** A stuck `processing` row on a suspended host STILL alerts, and a test fails
  loudly if a later reader extends the exclusion onto the `processing` poll.
- **A fourth numbered invariant** added to `payout-sweep.ts`'s header contract, where the other three
  correctness rules live.

## Task Commits

Each task was committed atomically:

1. **Task 1: The freeze — a WHERE clause before the claim, and its mirror for the crash window** — `2ea8756` (feat)
2. **Task 2: ENF-02 measured — both halves, including the negative that matters** — `a485680` (test)

**Plan metadata:** see the `docs(18-07)` commit that carries this SUMMARY.

## The two predicates, verbatim

**`src/inngest/functions/payout-sweep.ts` — `queryDuePayouts`** (join + predicate, comments elided):

```sql
FROM booking b
JOIN listing l ON l.id = b.listing_id
JOIN host_payout hp ON hp.user_id = l.host_id
LEFT JOIN host_verification hv ON hv.user_id = l.host_id
LEFT JOIN host_payout_ledger p ON p.booking_id = b.id AND p.kind = 'payout'
WHERE ( … existing status / due / retry predicate, unchanged … )
  AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
ORDER BY b.ends_at ASC
```

**`src/inngest/functions/payout-reconcile.ts` — `alertStuckHeld`** (the mirror; note the ALIAS):

```sql
SELECT p.booking_id AS "bookingId", p.created_at AS "createdAt"
FROM host_payout_ledger p
LEFT JOIN host_verification hv ON hv.user_id = p.host_id
WHERE p.kind = 'payout' AND p.state = 'held'
  AND COALESCE(hv.status::text, 'unverified') <> 'suspended'
  AND p.created_at <= now() - make_interval(hours => …)
ORDER BY p.created_at ASC
LIMIT 200
```

The alias is not cosmetic: `host_verification` also carries a `created_at`, so the pre-existing bare
`SELECT created_at … FROM host_payout_ledger` becomes ambiguous the moment the join lands. This is the
concrete form of 18-PATTERNS' "budget for it being real new SQL" — the two sites did NOT take the same edit.

## `processing` is NOT frozen, and that is deliberate

`reconcileOne` polls transfers that have **already fired**. For a `processing` row the money has **already
left the platform wallet**. A stuck one is a genuinely stranded transfer and a real operator case whether or
not the host was suspended afterwards — suspending a host must never silence it. The freeze is on the `held`
predicate only.

This is written at the site: `queryProcessingLedger`'s docblock now carries a ⚠ that names the test which
fails if anyone "completes" the mirror, and `payout-reconcile.ts`'s file header carries a SUSPENSION SCOPING
paragraph next to the existing KIND SCOPING one. The test case asserts the QUERY still returns the row —
not merely that a hand-built `reconcileOne` call still alerts, which would stay green under the mutation.

## Mutation Proofs (both required by the plan; both observed and reverted)

**Mutation 1 — move the suspension predicate from `queryDuePayouts` into `payOne` as a post-claim `if`.**
Predicate removed from the query; a `SELECT COALESCE(hv.status::text,'unverified')` + early return inserted
immediately AFTER the claim `INSERT` (so the `held` row survives).

- Result: **5 failed / 3 passed** (baseline 8 passed).
- The two the plan named, with observed messages:
  - no-ledger-row case — `AssertionError: expected 1 to be +0 // Object.is equality` at
    `payout-suspension-freeze.test.ts:282` (`expect(await ledgerRowCount(suspended.bookingId)).toBe(0)`).
  - no-false-page case — `AssertionError: expected 1 to be +0` at `:314`, the same ledger COUNT, tripping
    before the `alertStuckHeld` assertion because the post-claim implementation writes the row first.
- Collaterally red (correctly): the freeze case, the zero-write un-freeze, and the polarity case's suspend
  half — all three read `queryDuePayouts`, which no longer excluded anything.
- Reverted with `git checkout -- src/inngest/functions/payout-sweep.ts`; `grep -c "COALESCE(hv.status"` back
  to 1 and `grep -c "MUTATION PROOF"` to 0.

**Mutation 2 — extend the reconciler's exclusion onto the `processing` predicate** (`queryProcessingLedger`
given the same join + `<> 'suspended'`).

- Result: **1 failed / 7 passed** — exactly the negative case, and nothing else.
- Observed message: `AssertionError: expected undefined to be defined` at `:378`
  (`expect(row).toBeDefined()` after `queryProcessingLedger` no longer returns the stranded row).
- Reverted with `git checkout -- src/inngest/functions/payout-reconcile.ts`; greps confirm 1 × `COALESCE(hv.status`
  and 0 × `MUTATION PROOF`.

Both mutations were run **after** the code was committed, following 18-06's carried lesson that
`git checkout --` on an uncommitted file destroys the edit it is meant to restore.

## Test coverage — 8 cases, and why each exists

| # | Case | What would pass without it |
|---|------|----------------------------|
| 1 | Suspending removes the booking from `queryDuePayouts` (control host still returned) | — |
| 2 | A whole sweep pass leaves `COUNT(*) = 0` on `host_payout_ledger` (control host paid) | a post-claim refusal |
| 3 | `alertStuckHeld` returns 0 and no `needs_attention` audit row, however old the frozen booking gets | a post-claim refusal |
| 4 | Un-freeze with ZERO intervening writes — booking row byte-identical, ledger still 0 | a freeze that needed a repair to lift |
| 5 | **A stuck `processing` row on a SUSPENDED host still alerts** (query returns it AND `reconcileOne` pages) | an over-broad mirror |
| 6 | The crash-window `held` row does NOT page, while an unsuspended host's does, in the same call | a mirror that suppressed everything, or nothing |
| 7 | A host with **no** `host_verification` row is still paid | inverted polarity |
| 8 | A **`rejected`** host is still paid; the same host suspended freezes | the sell-gate's `IN (…)` shape copied across |

**Anti-vacuity.** Six of the eight assert an ABSENCE, and a fail-closed guard returning nothing for the wrong
reason would pass all of them. Each is therefore paired with a CONTROL in the SAME call — a second host still
selected by the same `queryDuePayouts`, still paid by the same sweep pass, still alerted on by the same
`alertStuckHeld`. Case 2 additionally asserts the control's ledger row exists (count 1) and that every
transfer that fired addressed the control's wallet, so "the loop ran and could have written a row" is
measured rather than assumed.

## Files Created/Modified

- `src/inngest/functions/payout-sweep.ts` — a FOURTH numbered invariant in the header contract; a
  `LEFT JOIN host_verification` beside the existing `host_payout` join; the pre-claim exclusion with its
  placement argument and its polarity warning written at the predicate.
- `src/inngest/functions/payout-reconcile.ts` — a SUSPENSION SCOPING paragraph in the file header; the
  crash-window mirror in `alertStuckHeld` (aliased ledger + new join); a ⚠ on `queryProcessingLedger`
  stating that its predicate carries no suspension exclusion and must not.
- `tests/payments/payout-suspension-freeze.test.ts` — 8 integration cases against an isolated schema.

## Decisions Made

- **Pre-claim, not post-claim.** See Mutation 1 — this is the plan's own thesis and it is now measured.
- **No `frozen` ledger state.** An `ALTER TYPE` on a committed enum plus an edit to every existing predicate,
  to express something a `WHERE` clause already expresses. `grep -ci frozen src/lib/db/schema.ts` is
  unchanged at 7 (all pre-existing prose about the *commission* freeze).
- **The mirror is narrow on purpose.** It covers only the CR-01 crash-window row — one that was already
  `held` when the suspension landed. With a pre-claim freeze there is no other `held` row a suspended host
  can own.
- **Polarity stated at both sites.** The sell-gate asks "is this host APPROVED?" and fails closed on a
  missing row; this asks "is this host SUSPENDED?" and a missing row means NOT suspended. Both comments say
  so explicitly, because the two `COALESCE`s look alike and mean opposite things.
- **`rejected` hosts are still paid.** Rejection stops a host SELLING (the gate); it does not cancel money
  already earned on a delivered session. Only D-222's `suspended` freezes — which is why the predicate names
  one value rather than a set. Asserted (case 8) so nobody "consistently" converts it to the gate's shape.

## Deviations from Plan

None — plan executed exactly as written. No auto-fixes were needed; no CLAUDE.md directive required an
adjustment; no package was installed.

## Verification

| Gate | Result |
|------|--------|
| `npx tsc --noEmit` | exit **0** |
| `npx vitest run` payout-suspension-freeze + payout-sweep + payout-reconcile + ledger-freeze | **4 files / 31 passed** |
| `npm test` (run ALONE) | **201 files passed / 2 skipped · 2376 passed / 5 skipped** (baseline 200 / 2368 — the +1 file / +8 tests is exactly this plan's file) |
| `npm run test:design` (run ALONE) | **72 files / 1304 passed / 3 skipped** — byte-identical to baseline; this plan ships no UI |
| Mutation 1 (freeze moved post-claim) | **5F / 3P**, incl. both cases the plan named |
| Mutation 2 (exclusion extended to `processing`) | **1F / 7P**, exactly the negative case |

Acceptance greps (before → after):

- `COALESCE(hv.status` — sweep **1**, reconcile **1**
- `kind = 'payout'` — sweep 8 → **8**, reconcile 3 → **3** (added inside the scope, never in place of it)
- `'processing'` in reconcile — 7 → **7** (the `processing` predicate is untouched; new comments deliberately
  avoid the quoted literal so the count stays diagnostic)
- `grep -ci frozen src/lib/db/schema.ts` — 7 → **7** (no new ledger state)
- T-07-16 tripwire — the charged-total column name still appears only in the pre-existing two-piece
  self-documenting comment; the full literal returns **0**

The expected `[test-db] LEAKED WRITES` block naming `notify` and `guest-email` appeared, unchanged and
pre-existing. The three known-RED e2e specs in `deferred-items.md` were not touched and were not run.

## Issues Encountered

- **`alertStuckHeld` needed an alias, not just a join.** `host_verification.created_at` collides with
  `host_payout_ledger.created_at`; the join alone would have made the existing `SELECT created_at` ambiguous
  at runtime. Caught while writing rather than by a red test, because the query is raw SQL and `tsc` sees
  nothing here.
- **A `NOT EXISTS` form was considered and rejected.** It would have avoided the alias entirely, but the
  `COALESCE` is meaningless inside an `EXISTS` (a row that exists has a non-null status), and the plan's own
  acceptance criterion requires the `COALESCE(hv.status` shape in both files so the two sites read alike.

## Known Stubs

None. No hardcoded empty value, placeholder string or unwired data source was introduced.

## Threat Flags

None. No new network endpoint, auth path, file access pattern or schema change was introduced — this plan
adds two `WHERE` terms and one test file. The four `mitigate` dispositions in the plan's threat register
(T-18-0701/0702/0703/0704) are each implemented and each has a named test case; T-18-0705 (a suspension that
cannot be lifted without a manual data repair) is mitigated by the zero-write un-freeze case. T-18-SC holds:
no package was installed.

## Carried Forward

**1. `human_needed` — FOR THE PM, BESIDE D-236: a suspended host is told nothing.**
`/host/earnings` (`src/app/(host)/host/earnings/page.tsx:71-95`) renders `host_payout_ledger` rows scoped to
`kind = 'payout'`. With a pre-claim freeze **there is no row**, so a suspended host sees a delivered session
that simply never produces a payout line, with **no explanation anywhere**. This project states its own rule
on the matter — `src/lib/host/requests-signal.ts:56`: *"a signal names the state, the reason AND the way
out."* This plan does not meet it, deliberately and visibly:

- Nothing was invented to paper over it. **No appeal was promised** (appeals are backlog 999.6) and **no
  support address was invented** — `SUPPORT_EMAIL` is null (D-250 / D-64) and must stay null;
  `site-contacts.test.ts` asserts zero support affordances while it is.
- Whether a suspended host is told at all is a **product decision**, not an engineering one. It belongs with
  D-236 in the phase's PM summary.
- **18-13** (host-facing review & suspension signals) is the natural owner if the answer is yes. It already
  owns the rejection-reason surface, and `host_verification.reason` (D-243) already holds host-readable copy
  written by the ops suspend action — so the row the signal would need already exists.
- It does **not** hold this plan: the freeze ships and is correct either way.

**2. There is no compiler census for this rule.** Both predicates are raw-SQL restatements in two files.
Unlike D-224's `deriveBookable` census, `tsc` sees nothing, and there is no shared expression for a future
reader of suspension state on the money path to CALL (the 18-04 `og-facts.ts` lesson, in the one form where
the fix is unavailable). `tests/payments/payout-suspension-freeze.test.ts` is the only thing holding the two
sites together. Any third money-path reader of `host_verification.status` should extend that file in the
same commit that adds it.

## Next Plan Readiness

- **18-08 (ops cancel-and-refund)** is unblocked and touches the adjacent seam: D-235 suppresses the
  `host_cancel_fee` debit for an ops-forced cancellation, and this plan's own comments explain why netting a
  debit against an already-frozen payout would be meaningless. The `kind = 'payout'` scoping both files rely
  on is unchanged.
- No migration, no env var, no package. Nothing to deploy beyond the code.

## Self-Check: PASSED

- `src/inngest/functions/payout-sweep.ts` — FOUND (modified, contains `host_verification`)
- `src/inngest/functions/payout-reconcile.ts` — FOUND (modified, contains `host_verification`)
- `tests/payments/payout-suspension-freeze.test.ts` — FOUND (created, 8 cases passing)
- Commit `2ea8756` — FOUND in `git log`
- Commit `a485680` — FOUND in `git log`
- Working tree clean of mutation artifacts: `grep -c "MUTATION PROOF"` returns 0 in both source files

---
*Phase: 18-host-verification-listing-review-fitout-ops*
*Completed: 2026-09-01*
