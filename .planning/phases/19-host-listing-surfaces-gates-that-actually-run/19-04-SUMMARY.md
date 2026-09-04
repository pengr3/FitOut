---
phase: 19-host-listing-surfaces-gates-that-actually-run
plan: 04
subsystem: database
tags: [postgres, evidence-archive, orphan-drafts, hard-delete, nextjs-manifest, d-01]

requires:
  - phase: 19-03
    provides: The HSURF-01 call-site fix; this plan is wave 4 and runs after it
  - phase: 19-02
    provides: The early `.next/dev` archive capture that this plan verifies rather than re-takes
provides:
  - The `.next/dev` evidence archive, verified against all seven of 19-RESEARCH § 1.0's measurements
  - A per-row, per-cascade-table emptiness record for the four orphan drafts, with executable re-INSERT statements
  - Four orphan `listing` rows deleted from the local `fitout` database, exactly four, in a transaction
  - The production-scope question raised and recorded as OPEN, not absorbed
affects: [19-05, 19-06, v1.2-ship, deployment]

actuals:
  tokens: 13600
  tasks: 3
  commits: 4

tech-stack:
  added: []
  patterns:
    - "Destructive DB statements run inside a transaction with a GET DIAGNOSTICS row-count gate that RAISEs on any count other than the verified one — a wrong scope cannot partially apply"
    - "The record survives the rows: a costly delete is preceded by a full column dump plus executable re-INSERT statements, on disk, committed"

key-files:
  created:
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/orphan-drafts-delete-result.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/orphan-drafts-before-delete.txt
    - .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/archive-verification.19-04.txt
  modified: []

key-decisions:
  - "PM chose option 1 of Task 3's decision checkpoint: the scoped hard DELETE as D-01 is written and locked, not a soft delete and not a deferral"
  - "Task 1 VERIFIED the pre-existing archive instead of re-running its four copy commands — re-copying would have overwritten the preserved Sep 3 19:33 capture with one produced by 19-02/19-03's own dev sessions, destroying the evidence"
  - "The delete window was NOT widened. 49 untouched empty drafts owned by other accounts sit in the same database and were deliberately left alone"

patterns-established:
  - "Row-count-gated destructive transaction: DELETE, GET DIAGNOSTICS, RAISE EXCEPTION on any unexpected count, so COMMIT becomes a rollback"
  - "A measurement that differs from the research is recorded as a finding, never smoothed toward the expected value"

requirements-completed: [HSURF-02]

coverage:
  - id: D1
    description: "The `.next/dev` evidence — stale dev manifest, complete production manifest, artifact mtimes — is archived under evidence/ and survives the clean that plan 19-05 will run"
    requirement: "HSURF-02"
    verification:
      - kind: other
        ref: "ls -la .planning/phases/19-.../evidence/ — 4 archive outputs present, all non-zero"
        status: pass
      - kind: other
        ref: "node -e require(app-paths-manifest.19-33.json) → entries=16"
        status: pass
      - kind: other
        ref: "grep -c 'listings/[id]/edit' app-path-routes-manifest.prod.json → 1"
        status: pass
    human_judgment: false
  - id: D2
    description: "Each of the four orphan drafts was re-verified EMPTY per row at execution time — untouched, empty_columns, and zero rows in all six child tables"
    requirement: "HSURF-02"
    verification:
      - kind: integration
        ref: "psql: rows in window failing the emptiness condition → 0"
        status: pass
      - kind: integration
        ref: "psql: count(*) in window → 4"
        status: pass
      - kind: other
        ref: "grep -c of the four uuids in orphan-drafts-before-delete.txt → 20 (≥4)"
        status: pass
    human_judgment: false
  - id: D3
    description: "Exactly four listing rows deleted, host-scoped and window-scoped, with the affected-row count confirmed inside the transaction before commit"
    requirement: "HSURF-02"
    verification:
      - kind: integration
        ref: "psql NOTICE: D-01 affected_rows=4, then COMMIT"
        status: pass
      - kind: integration
        ref: "post-delete window count → 0"
        status: pass
      - kind: integration
        ref: "post-delete count by the four literal uuids → 0"
        status: pass
      - kind: other
        ref: "ls drizzle/*.sql | tail -1 → drizzle/0029_listing_review_cascade.sql (no migration appeared)"
        status: pass
      - kind: other
        ref: "git status --porcelain package.json → empty (zero dependency changes)"
        status: pass
    human_judgment: false
  - id: D4
    description: "The production-scope question is raised as an OPEN item rather than absorbed — D-01's window and host id are LOCAL facts"
    verification: []
    human_judgment: true
    rationale: "The question was put to the PM and NOT answered. Whether a deployed environment exists, and what the scope would be there, is a judgment only the PM can supply — no command in this repository can settle it, and 19-VALIDATION § Negative Space explicitly places it outside what this phase validates."

duration: 29 min
completed: 2026-09-04
status: complete
---

# Phase 19 Plan 04: Archive the Evidence, Clear the Residue Summary

**The `.next/dev` archive verified against all seven research measurements (six MATCH, one no longer independently verifiable), the four orphan drafts proven empty per row and per cascade table, then deleted — exactly four rows, in a transaction, with the production-scope question left standing as open.**

## Performance

- **Duration:** 29 min
- **Started:** 2026-09-04T02:06:09Z
- **Completed:** 2026-09-04T02:35:12Z
- **Tasks:** 3
- **Files created:** 3 (plus 3 archive artifacts carried forward from 19-02's early capture)

## Accomplishments

- **The evidence base survives.** Every artifact `rm -rf .next` would destroy is on disk under `evidence/`, and the archive is now the ONLY surviving copy of the production manifest anywhere on this machine.
- **Emptiness was re-measured, not trusted.** All four rows re-verified at execution time against six child tables, not the three the plan named.
- **Four rows deleted, exactly four**, host-scoped and window-scoped, with an in-transaction row-count gate that would have rolled back on any other number.
- **The scope held under proof.** The host's other eight rows all survive — including an untouched empty draft from 2026-08-24 spared purely by falling outside the window.
- **One question raised rather than answered.** The production-scope question is on the record as OPEN, in the plan's own wording.

## Task Commits

1. **Task 1: verify the `.next/dev` evidence archive** — `d4bbff7` (docs)
2. **Task 2: re-verify the four orphan drafts EMPTY, per row** — `220b000` (docs)
3. **Task 3: delete the four orphan drafts, raise the production-scope question** — `5431dc7` (docs)

**Plan metadata:** see the final `docs(19-04)` commit.

## Files Created/Modified

- `evidence/archive-verification.19-04.txt` — the seven measurements re-taken against the archive, plus two observations handed to 19-05
- `evidence/orphan-drafts-before-delete.txt` — per-row verification, all six cascade tables, full column dump, executable re-INSERT statements; **the reversal path**
- `evidence/orphan-drafts-delete-result.txt` — the statement, its affected-row count, the four post-delete checks, scope containment, and the open PM question
- `evidence/app-paths-manifest.19-33.json`, `app-path-routes-manifest.prod.json`, `dev-artifact-mtimes.txt` — the archive itself (captured early by 19-02, verified here)

**Runtime state changed, recorded because no file in the repo records it:** four `listing` rows deleted from the local `fitout` database.

---

## 1. The seven `.next/dev` measurements, re-taken

| # | Measurement | Expected (19-RESEARCH § 1.0) | Measured | Verdict |
|---|---|---|---|---|
| 1 | dev manifest entry count | 16 | 16 | MATCH |
| 2 | dev manifest `grep -c '[id]/edit'` | 0 | 0 | MATCH |
| 3 | dev manifest `grep -c '[id]/availability'` | 0 | 0 | MATCH |
| 4 | compiled `edit/page.js` present + mtime | present, Sep 3 15:18 | present, 6496 B, 15:18:04.957 | MATCH |
| 5 | compiled `availability/page.js` | absent | absent (`[id]/` holds only `edit/`) | MATCH |
| 6 | prod manifest `grep -c '[id]/edit'` | 1 | 1 | MATCH |
| 6b | prod manifest mtime | Sep 3 15:57 | **not re-measurable** | **UNVERIFIABLE** |
| 7 | `.next/dev` session markers: `package.json` / `prerender-manifest.json` / `routes-manifest.json` / `types/` | 18:09 | 18:09:29 / :30 / :30 / :31 | MATCH |
| 7b | `.next/dev` session markers: `server/` / `build-manifest.json` / `trace` | 19:33 | 19:33:43 / :41 / :45 | MATCH |

**The one that differs is measurement 6's MTIME, not its count.** `dev-artifact-mtimes.txt` lists only `.next/dev`, so it never captured the production manifest's own mtime; the archived copy carries its copy time; and the live file is now deleted. `Sep 3 15:57` therefore survives only as 19-RESEARCH's own measured read. **Its `grep -c` of 1 IS confirmed — and that is the part the reframing rests on.**

**The live tree no longer holds the subject.** `.next/app-path-routes-manifest.json` is gone; every `.next/dev` mtime is 2026-09-04 09:37–10:02, i.e. entirely rewritten by the 19-02 and 19-03 dev sessions. This retroactively vindicates 19-02's deviation: had that plan followed its own text instead of capturing early, this evidence would not exist.

## 2. The four rows — contents and emptiness

All four owned by `AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy`, `status = draft`, `review_state = pending`, `updated_at = created_at`.

| uuid | created_at (UTC) | untouched | empty_columns | photos | amenities | bookings |
|---|---|---|---|---|---|---|
| `3e224ec0-f015-4d18-a58b-ad08ce165d18` | 2026-09-03 10:51:56.033772+00 | t | t | 0 | 0 | 0 |
| `3b22e548-762b-484e-a828-5d0b52b4904f` | 2026-09-03 10:52:13.556143+00 | t | t | 0 | 0 | 0 |
| `485e4843-8b5c-4059-aec0-43b30971e40c` | 2026-09-03 10:52:27.302846+00 | t | t | 0 | 0 | 0 |
| `e6ca32d0-41c1-4fbf-9cee-79402b962c51` | 2026-09-03 10:52:39.933788+00 | t | t | 0 | 0 | 0 |

**Every column, identical across all four rows** except `id` and the timestamps: `title`, `description`, `primary_space_type`, `address_line1`, `address_line2`, `city`, `region`, `postal_code`, `country`, `neighborhood`, `location`, `max_occupancy`, `hourly_rate_cents`, `day_rate_cents`, `per_head_price_cents`, `published_at`, `deleted_at`, `cancellation_policy`, `included`, `extra_head_fee` — **all NULL**. Defaults only: `currency = php`, `booking_mode = instant`, `unit_count = 1`, `timezone = Asia/Manila`, `occupancy_mode = exclusive`, `show_exact_address = f`. Nothing was lost.

**All six cascade child tables, zero for all four rows** — `listing_photo`, `listing_amenity`, `listing_activity_tag`, `operating_hours`, `availability_block`, `booking`. The plan named three; the check was extended to all six the hard DELETE actually cascades to, which is the second, independent reason that check is not optional.

## 3. The delete

```sql
BEGIN;
DO $$ DECLARE n integer; BEGIN
  DELETE FROM listing
   WHERE host_id = 'AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy'
     AND deleted_at IS NULL
     AND created_at BETWEEN '2026-09-03 10:51:56Z' AND '2026-09-03 10:52:40Z';
  GET DIAGNOSTICS n = ROW_COUNT;
  RAISE NOTICE 'D-01 affected_rows=%', n;
  IF n <> 4 THEN RAISE EXCEPTION 'AFFECTED ROW COUNT % IS NOT 4 - ROLLING BACK', n; END IF;
END $$;
COMMIT;
```

**Affected rows: 4.** Expected exactly 4 — MATCH, committed. The gate is not decoration: any other count raises, which aborts the transaction, which turns the `COMMIT` into a rollback. A wrong scope could not have partially applied. Window literals are UTC and byte-identical to Task 2's, because `listing.created_at` is `timestamptz`.

| Post-delete check | Required | Result |
|---|---|---|
| Task 2's window query, re-run | 0 | **0** PASS |
| count by the four literal uuids | 0 | **0** PASS |
| `ls drizzle/*.sql \| tail -1` | `0029_listing_review_cascade.sql` | unchanged PASS |
| `git status --porcelain package.json` | no output | empty PASS |

**Scope containment, proven after the fact.** The D-01 host keeps all eight of its other rows: three published listings with real titles (`Sunlit Yoga Studio`, `CLMC Yoga Space`, `CLMC Pickleball Court`), one titled draft (`KAI Sports Center`), one **untouched empty draft from 2026-08-24** outside the window and therefore correctly NOT deleted, and three already soft-deleted drafts excluded by `deleted_at IS NULL`. That 2026-08-24 row is the sharpest proof available that the window did its job — it satisfies every emptiness predicate and was spared purely by falling outside the window.

**The 49 out-of-scope drafts were deliberately left alone**, re-counted at 49 after the delete (unchanged). The window was not widened "while we were in here".

---

## ⚠ OPEN PM QUESTION — raised, not absorbed, NOT answered

> **D-01's window and host id are LOCAL facts, so a production database may hold orphan drafts this phase does not touch; if a deployed environment exists, the scope must be re-derived there, not copied.**

This was put to the PM alongside the option choice. **The option choice was answered; this was not.** That silence is recorded as silence — it is specifically NOT read as "no production database exists", and no search for one was undertaken beyond what the plan specifies. 19-RESEARCH found no deployment configuration in the tree and `PITFALLS.md § Pitfall 6` records the same absence independently, which is an absence of evidence, not evidence of absence.

19-VALIDATION § Negative Space already states this phase deliberately does NOT validate that the delete is safe in any production database. **Status: OPEN.** Recorded in the broken-windows ledger as entry 5.

## Decisions Made

- **Option 1 of Task 3's decision checkpoint** — the scoped hard DELETE, D-01 as written and as locked. Not the soft delete (option 2, which diverges from D-01's literal text) and not the deferral (option 3). Rationale: the per-row verification was on disk and unambiguous, and the reversal path exists.
- **Verify the archive rather than re-take it** (Task 1). Re-running the four copy commands would have overwritten the preserved Sep 3 19:33 capture with one produced by 19-02/19-03's own dev sessions. The plan's text said copy; the plan's purpose said preserve; preserve won.
- **Extend the emptiness check from three child tables to six.** The hard DELETE cascades to all six; checking three would have left three cascades unproven.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 1's precondition is literally UNMET; verified the archive instead of re-taking it**
- **Found during:** Task 1
- **Issue:** The precondition requires both `.next/dev/server/app-paths-manifest.json` and `.next/app-path-routes-manifest.json` to still exist. The latter is gone from disk, and all of `.next/dev` was rewritten by the 19-02/19-03 dev sessions — the file at the dev path today is a NEW file from those sessions, not the Sep 3 capture. Following the plan's four copy commands verbatim would have **destroyed** the evidence they exist to preserve.
- **Fix:** Task 1 verified the archive taken early by 19-02 (commit `3f95b17`) rather than re-copying. The precondition's *purpose* — an unreconstructable archive — was already retired by that early capture; its literal text was not.
- **Verification:** All seven measurements re-taken against the archive; six MATCH, one recorded as no longer independently verifiable.
- **Committed in:** `d4bbff7`

**2. [Rule 2 - Missing Critical] Emptiness check extended from three cascade tables to six**
- **Found during:** Task 2
- **Issue:** The plan's `<verify>` checks `listing_photo`, `listing_amenity` and `booking`. A hard DELETE also cascades to `listing_activity_tag`, `operating_hours` and `availability_block`, which the plan's own `⚠` names but its query does not check.
- **Fix:** Verified all six per row. All zero for all four rows.
- **Committed in:** `220b000`

**3. [Documented finding] The research's "eleven other untouched drafts" is 49**
- **Found during:** Task 2
- **Issue:** 19-RESEARCH § 5.1 states there are "eleven other untouched drafts owned by other accounts". Measured at execution time: **49, across 49 distinct hosts.**
- **Assessment:** NOT growth from this phase — a count of untouched empty drafts created on or after 2026-09-04 returns 0, and the earliest in the set dates to 2026-08-29. This is a pre-existing population the research read more narrowly. It changes **nothing** about D-01's scope, which is host-scoped and window-scoped and touches none of them. It **strengthens D-02's case**: the orphan class is larger than the phase's framing assumed, which is an argument for killing it at the source rather than cleaning up after it.
- **Recorded rather than smoothed over**, per the plan's own instruction.
- **Committed in:** `220b000`

---

**Total deviations:** 3 (1 blocking, 1 missing-critical, 1 documented measurement difference)
**Impact on plan:** All three made the plan safer, not looser. Deviation 1 is the reason the evidence still exists at all. No scope creep — the delete window was never widened.

## Broken-Windows Ledger

Three entries appended to `.planning/WINDOWS.md` (ids 3, 4, 5): the unmet Task 1 precondition and the unverifiable prod-manifest mtime; the 11-vs-49 research difference; and the unanswered production-scope PM question.

## Issues Encountered

None beyond the deviations above. Every automated check in the plan passed on first run.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- **Ready for 19-05.** The archive is safe, which is the entire reason this plan is a separate wave. 19-05 may now run `rm -rf .next`.
- **Two observations handed to 19-05, which owns the diagnosis** (recorded as facts, no cause named — D-11 forbids it without evidence):
  1. `/(host)/host/listings/new/page` IS present in the stale dev manifest, yet 19-02 measured `/host/listings/new` returning 404 on a fresh process. A missing manifest entry is therefore neither necessary nor sufficient for the phantom 404.
  2. A per-route manifest fragment exists at `.next/dev/server/app/(host)/host/listings/[id]/edit/page/app-paths-manifest.json` (90 bytes, Sep 3 15:18:04.944) — the route's own fragment was written while the top-level session manifest omits it.
- **Blocker for ship, not for the phase:** the production-scope question is open and belongs to the PM.

---
*Phase: 19-host-listing-surfaces-gates-that-actually-run*
*Completed: 2026-09-04*

## Self-Check: PASSED

All key files verified present on disk; all four commits (`d4bbff7`, `220b000`, `5431dc7`, `951a0b5`) verified in git history.
