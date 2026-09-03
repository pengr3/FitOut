---
phase: quick-260806-gwt
verified: 2026-08-06T09:30:23Z
status: passed
score: 8/8 must-haves verified
overrides_applied: 0
---

# Quick 260806-gwt: Sweep the 6 Tier-1 date time bombs — Verification Report

**Task goal:** Eliminate 6 Tier-1 date time bombs across 5 test files by deriving their booking windows from
real `now()` via a new shared `tests/helpers/dates.ts`, WITHOUT hollowing out what any of those tests prove.

**Verified:** 2026-08-06T09:30:23Z
**Status:** passed
**Re-verification:** No — initial verification

## Central Question: Independent Mutation Reproduction

Reproduced 3 of the 7 claimed mutations, spanning 3 different files/tasks. All three went RED exactly as
claimed, all three were restored, and `src/` was confirmed byte-clean before and after.

| # | File | Mutation applied (independently, in this verification) | Expected RED (from SUMMARY) | Actual RED observed | Match |
|---|------|----------------------------------------------------------|------------------------------|----------------------|-------|
| 1 | `tests/booking/pending-hold.test.ts` | `units.ts:299` — inserted `AND false` into `findOwnActiveHold`'s WHERE (D-42 own-hold gate) | "idempotency (own-hold)" `expected false to be true` at `expect(isOk(second)).toBe(true)`; SUMMARY also predicted the "concurrent same key" case would ALSO redden | Both "idempotency (own-hold)" AND "idempotency (concurrent same key)" failed, `AssertionError: expected false to be true` at `expect(isOk(second)).toBe(true)` (L144) and `expect(values.every(isOk)).toBe(true)` (L168) respectively | ✓ EXACT (message + case name match; in-file header line numbers are stale — see Anti-Patterns) |
| 2 | `tests/booking/state-machine.test.ts` | `booking.ts:811-814` — deleted the D-58 extend UPDATE | "extend-hold" `expected false to be true` at `expect(future).toBe(true)` | `AssertionError: expected false to be true` at `expect(future).toBe(true)` (L246), only that one case failed (6 passed / 1 failed) | ✓ EXACT (line-number in header is stale — see Anti-Patterns) |
| 3 | `tests/booking/request-expiry.test.ts` | `request-expiry.ts:103` — flipped `requested`-branch terminal target `'declined'` → `'cancelled'` | "SLA auto-decline" RED at the DB readback (L196 in SUMMARY's numbering), NOT at the return-value `toEqual` assertion — the SUMMARY's headline divergence claim | "SLA auto-decline" failed at `expect(await readStatus(row.id)).toBe("declined")` (L218) with `expected 'cancelled' to be 'declined'`; "each sweep is idempotent" also failed at the same readback pattern (L268). The return-value assertion `expect(res).toEqual({ status: "declined", notified: true })` (L215) did NOT fail. | ✓ EXACT — confirms the SUMMARY's most significant claim (see below) |

All three mutations were restored by editing the line back (never `git checkout`); `git status --porcelain -- src/` and `git diff --exit-code -- src/` were both clean before and after this verification's probe cycle. The three probed test files were re-run green (16/16 passed) after restoration.

**Verdict: the central question is answered — these conversions are NOT vacuous.** Each reproduced mutation broke exactly the behavior claimed, on a case that genuinely consumes the derived window (traced below), and none came back green.

## Data-Flow Trace: Does the case genuinely consume the derived window?

| File | Case targeted by mutation | Traced consumption of derived window |
|------|---------------------------|----------------------------------------|
| `pending-hold.test.ts` | "idempotency (own-hold)" | Both `createPendingHold` calls pass `startsAt: START, endsAt: END` where `START/END = W.startUtc/endUtc`, `W = venueWindow({ hour: 10, minDaysOut: 3 })` (line 61) — genuine. |
| `state-machine.test.ts` | "extend-hold" | `place("L_exp")` → `placeHold({..., startUtc: START, endUtc: END})` where `START/END = W.startUtc/endUtc` (line 82-84) — genuine. |
| `request-expiry.test.ts` | "SLA auto-decline" | `seedHold({ hourUtc: 4, ... })` → `windowAt(4)` → `instantAt(BASE.day, 4)`, `BASE = venueWindow({ hour: 2, minDaysOut: 3 })` (line 99, 107-109) — genuine. |
| `request-lifecycle.test.ts` (HOLD_W family, not independently re-mutated but read-verified) | "mints a REQUESTED hold…" (line 349-368) | Uses `startsAt: START, endsAt: END` = `HOLD_W.startUtc/endUtc` (line 161-163) directly — genuine. |
| `request-lifecycle.test.ts` (HR_W family, read-verified) | "(b) SLA guard" (line 788-798) | `seedRequest` inserts `startsAt: new Date(HR_START), endsAt: new Date(HR_END)` where `HR_W = venueWindow({ hour: 10, minDaysOut: 5 })` (line 679-681, 708-709) — genuine. |
| `notify-emission.test.ts` (read-verified) | "(7) a first request emits ONE pair…" (line 532+) | `placeHold({..., startUtc: START, endUtc: END})` where `START/END = W.startUtc/endUtc`, `W = venueWindow({ hour: 10, minDaysOut: 3 })` declared inside the same `describe` (line 525-529) — genuine. |

No case targeted by a mutation is reddening for a reason unrelated to the derived fixture — each traces cleanly to a `venueWindow(...)` call.

## The Most Significant Finding — `expireOne`'s hardcoded return literal (pre-existing weakness, confirmed)

**Confirmed against the real source, independently.** `src/inngest/functions/request-expiry.ts` lines 99-114:

```ts
export async function expireOne(dbConn: DbConn, row: ExpiredBooking): Promise<ExpireOneResult> {
  if (row.status === "requested") {
    const flipped = (await dbConn.execute(sql`
      UPDATE booking SET status = 'declined', expires_at = NULL
      WHERE id = ${row.id} AND status = 'requested'
      RETURNING id
    `)) as unknown as { id: string }[];
    if (flipped.length === 0) return { status: "noop" };
    const notified = await emitDeclinedNotice(dbConn, row.id);
    return { status: "declined", notified };   // <-- hardcoded, not read back from the UPDATE
  }
  ...
```

The `RETURNING id` clause returns only the row id, not the status it wrote. The `{ status: "declined", ... }`
literal is a compile-time constant tied to the `row.status === "requested"` branch, not a readback of what
the UPDATE actually set. When I flipped the SQL literal to `'cancelled'` (Mutation 3 above), the DB genuinely
wrote `cancelled`, but `expireOne`'s return value still reported `declined` — so
`tests/booking/request-expiry.test.ts:215`'s `expect(res).toEqual({ status: "declined", notified: true })`
**passed anyway**. Only the separate DB readback at line 218 (`expect(await readStatus(row.id)).toBe("declined")`)
caught the mutation.

**This is a genuine pre-existing weakness, not introduced by this task.** It means the return-value assertion
at line 215 gives false confidence about the terminal-status contract that `expireOne` shares with the in-tx
sweep (Warning-1 reconciliation, referenced in `request-lifecycle.test.ts`'s header). It does not block this
task's goal (the SUMMARY records it accurately as a divergence, not a smoothed-over claim), but it should be
tracked as a follow-up: either make `expireOne` read back the actual written status via `RETURNING status`,
or accept that line 215 is decorative and line 218 is the load-bearing assertion.

## `tests/helpers/dates.ts` Correctness (Step 3 checklist)

| Property | Verified | Evidence |
|---|---|---|
| (a) Roll-forward loop is bounded (max 8 iterations, then throws) | ✓ YES | Lines 116-124: `for (let i = 0; ...; i++) { if (i >= 8) throw new Error(...); d = plusDays(d, step, tz); }` — throws with a diagnostic, never returns silently. |
| (b) Derivation clears `MIN_LEAD_INSTANT_MINUTES` / `MIN_LEAD_REQUEST_HOURS` at ANY time of day, including a 23:59 venue-local run | ✓ YES | `LEAD_CLEARANCE_MS = max(30min, 2h) = 2h` is the CONSERVATIVE (larger) bound, checked in step (3)'s loop against `Date.now()`, not just assumed from `minDaysOut`. Worked through the 23:59 edge case: even if `minDaysOut=1` and `hour=0` land only 1 minute out at run time, step (3)'s check-and-roll-forward (not just the initial offset) pushes the date out until clearance is genuinely satisfied. |
| (c) `\|\| 7` / `minDaysOut >= 1` preserved (a run on the target weekday never targets today) | ✓ YES | Line 103: `let d = plusDays(venueDateOf(new Date(), tz), Math.max(1, opts.minDaysOut ?? 1), tz);` — floor of `today+1` unconditionally. |
| (d) No hand-rolled UTC offset (`+8`, `28800`) anywhere in executable code | ✓ YES | Grep across `tests/helpers/dates.ts` and all 6 converted files: the only `+8` hit is inside a comment (`dates.ts:19`, explaining why NOT to hand-roll one). All instant construction goes through `TZDate` (`@date-fns/tz`). |

## Extraction Faithfulness (`hold-expiry.test.ts`)

- Imports `VENUE_TZ, venueWindow, assertBookableWindow` from `../helpers/dates` (line 49) — no local date math remains.
- `beforeAll` calls `assertBookableWindow(W, { weekday: MONDAY })` (line 107) in place of the four hand-written `expect` lines the file used to carry.
- Line count: 233 lines (baseline commit `3d7a88d`) → 197 lines now — a genuine 36-line net reduction from the extraction. (The SUMMARY's own text says "~50 net lines"; actual is 36. Minor narrative overstatement, does not affect the extraction's correctness — noted under Anti-Patterns as an info-level inaccuracy.)
- MUTATION A was NOT independently re-run in this verification pass (the 3-mutation quota was met across pending-hold/state-machine/request-expiry, deliberately chosen to span different files/tasks per the verification brief). Its recorded evidence (header lines 39-44) is internally consistent with the file's current content and the already-established baseline (orchestrator confirmed `npx vitest run` 0 failures and `src/` byte-unchanged), and the file's own case 1(b) at line 151 (`expect("ok" in res && res.ok).toBe(true)`) is the exact assertion the record names.

## Observable Truths (from PLAN.md must_haves)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | TIER1-01..06: no Tier-1 hold window is a calendar literal any more | ✓ VERIFIED | Comment-stripped grep across all 6 files returns only the 3 Tier-2 anchor lines in `request-lifecycle.test.ts`; all 6 files import `venueWindow` and pass derived `startUtc`/`endUtc` to `createPendingHold`/`placeHold`. |
| 2 | `hold-expiry.test.ts` imports the shared derivation, still passes, MUTATION A record intact | ✓ VERIFIED | File reads clean; imports helper; MUTATION A re-run record present and internally consistent (see above). |
| 3 | Each of the 5 converted files has a NEW verbatim RED recorded in its header | ✓ VERIFIED (with a caveat) | All 5 headers carry dated mutation records with verbatim assertion messages. 3 were independently reproduced and matched the recorded assertion text exactly. Caveat: the in-header LINE NUMBERS cited (e.g. "line 125", "line 149", "line 228") are stale relative to the current file — actual lines are +18/+19 higher in every case checked. This is a documentation-accuracy issue, not a functional one (see Anti-Patterns). |
| 4 | `src/` is byte-unchanged at the end | ✓ VERIFIED | `git status --porcelain -- src/` and `git diff --exit-code -- src/` both clean, confirmed independently before and after this verification's own mutation probes. |
| 5 | Tier 2/3 untouched — `request-lifecycle.test.ts`'s read-model anchor byte-identical | ✓ VERIFIED | Lines 146-150 (`DAY`, `NOW`, `SLOT_0600_START`, `AVAIL_S`, `AVAIL_E`) match the comment-stripped scan's only 3 surviving literal hits; already-established orchestrator diff confirms no +/- lines touching these values. |
| 6 | `request-expiry.test.ts` still templates windows by hour (no `booking_no_overlap` collision) | ✓ VERIFIED | `windowAt(hour)` templates off `BASE.day` via `instantAt`; hours 2/4/5/6/7/8 remain six distinct venue-local windows on one day. |
| 7 | `npx tsc --noEmit` exits 0 and `npx vitest run` reports 0 failures | ✓ VERIFIED | Already established by orchestrator (1123 passed/4 skipped/0 failures, tsc exit 0); re-confirmed on the 3 probed files after restoration (16/16 passed). |
| 8 | `deferred-items.md` records Tier 1 CLOSED, Tier 2 open, helper makes Tier-2 trivial | ✓ VERIFIED | File read in full; Tier 1 marked "✅ CLOSED by quick task 260806-gwt"; Tier 2 marked "STILL OPEN, and still deliberately unfixed" with the trigger condition stated; "landed pattern" section documents the helper. |

**Score:** 8/8 truths verified.

### Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `tests/helpers/dates.ts` | New file, ≥90 lines, exports all 10 names | ✓ VERIFIED | 165 lines. All of `VENUE_TZ, LocalDate, venueDateOf, instantAt, venueDow, plusDays, LEAD_CLEARANCE_MS, VenueWindow, venueWindow, assertBookableWindow` present and exported. |
| `tests/booking/hold-expiry.test.ts` | Consumes the helper | ✓ VERIFIED | `import { VENUE_TZ, venueWindow, assertBookableWindow } from "../helpers/dates"` (line 49). |
| `tests/booking/pending-hold.test.ts` | TIER1-01 converted + mutation recorded | ✓ VERIFIED | `W = venueWindow({ hour: 10, minDaysOut: 3 })`; mutation record present and independently reproduced. |
| `tests/booking/state-machine.test.ts` | TIER1-02 converted + mutation recorded | ✓ VERIFIED | Same shape; mutation record present and independently reproduced. |
| `tests/booking/request-expiry.test.ts` | TIER1-04 converted, hour-templating preserved + mutation recorded | ✓ VERIFIED | `BASE = venueWindow({ hour: 2, minDaysOut: 3 })`, `windowAt` templates off `BASE.day`; mutation record present and independently reproduced. |
| `tests/booking/notify-emission.test.ts` | TIER1-06 converted + mutation recorded | ✓ VERIFIED | `W = venueWindow({ hour: 10, minDaysOut: 3 })` scoped inside the target `describe`; case (7) traced to consume it. |
| `tests/booking/request-lifecycle.test.ts` | TIER1-03 + -05 converted, Tier-2 anchor untouched, 2 mutations recorded | ✓ VERIFIED | `HOLD_W` (line 161) and `HR_W` (line 679) both derived; Tier-2 anchor (lines 146-150) byte-identical; both cases traced to consume their respective windows. |

### Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| all 6 `tests/booking/*.test.ts` | `tests/helpers/dates.ts` | `import ... from "../helpers/dates"` | ✓ WIRED | `grep -l 'helpers/dates'` returns all 6 files. |
| `tests/helpers/dates.ts` | `src/lib/payments/config.ts` + `src/lib/availability/slots.ts` | imports `MIN_LEAD_INSTANT_MINUTES`, `MIN_LEAD_REQUEST_HOURS`, `BOOKING_HORIZON_DAYS` | ✓ WIRED | Lines 28-29 import the real constants; `assertBookableWindow` asserts against them, never copied numbers. |
| `tests/helpers/dates.ts` | `@date-fns/tz` `TZDate` | the `slotsForWindow` idiom | ✓ WIRED | `venueDateOf`, `instantAt`, `venueDow`, `plusDays` all construct via `TZDate`; no hand-rolled offset anywhere in executable code (only in an explanatory comment). |

### Anti-Patterns Found

| File | Line(s) | Pattern | Severity | Impact |
|---|---|---|---|---|
| `pending-hold.test.ts`, `state-machine.test.ts`, `hold-expiry.test.ts` | header mutation records (e.g. "line 125", "line 149", "line 228", "line 144") | Stale line-number references in in-file mutation records — actual current lines are offset (e.g. real line 144 vs recorded 125, real 168 vs recorded 149, real 246 vs recorded 228) | ℹ️ Info | Cosmetic/documentation only. Independently reproduced the exact same assertion messages and case names in every instance checked — the mutations are real and the claims are accurate; only the pinpoint line citation is stale, most likely because later comment edits in the same task shifted line numbers without updating the record. |
| `hold-expiry.test.ts` (via SUMMARY.md prose) | n/a | SUMMARY claims "~50 net lines" shrinkage from the extraction; actual is 36 lines (233→197, verified against baseline commit `3d7a88d`) | ℹ️ Info | Narrative overstatement in SUMMARY.md, not in the code. Does not affect correctness of the extraction. |
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` markers found in any of the 7 modified files | — | Clean. |

## Requirements Coverage

TIER1-01 through TIER1-06 are quick-task-local requirement IDs declared in the PLAN frontmatter; they are not
tracked in `.planning/REQUIREMENTS.md` (expected — this is an ad-hoc quick task, not a roadmap phase). All six
map cleanly to the 6 converted sites verified above.

## Human Verification Required

None. This is a pure test-fixture/tooling change with no UI, visual, or user-flow surface — every claim is
mechanically verifiable via source reading, grep, and test execution, all of which were performed.

## Gaps Summary

None. All 8 must-have truths verified, all 7 required artifacts present and wired, all key links confirmed,
`src/` confirmed byte-unchanged both before and after this verification's own independent mutation probes
(3 mutations, spanning 3 different files, all reproduced the exact claimed RED). The one genuinely notable
finding — `expireOne`'s hardcoded return literal making `request-expiry.test.ts:215` a weaker guard than it
looks — is a pre-existing weakness correctly surfaced by the SUMMARY's own divergence log, not a defect
introduced by this task. Two info-level documentation staleness items (stale line-number citations in mutation
records; a line-count overstatement in SUMMARY prose) are noted but do not block the phase goal.

---

_Verified: 2026-08-06T09:30:23Z_
_Verifier: Claude (gsd-verifier)_
