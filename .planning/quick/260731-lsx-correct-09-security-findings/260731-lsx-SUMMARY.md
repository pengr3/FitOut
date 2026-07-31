---
quick_id: 260731-lsx
slug: correct-09-security-findings
type: quick
gap_closure: false
docs_only: true
status: complete
completed: 2026-07-31
subsystem: security-audit-record
tags: [security-audit, threat-register, retraction, accepted-risk, docs-only, phase-09]
key-files:
  modified:
    - .planning/phases/09-open-capacity-bookings/09-SECURITY.md
commits:
  - f2a2b2e docs(09) add dated Corrections block to 09-SECURITY
  - 68853f8 docs(09) apply the ten in-body retractions in 09-SECURITY
---

# Quick 260731-lsx: Retract three erroneous findings in 09-SECURITY

`09-SECURITY.md` no longer tells the 09-17…09-25 executor to break a correct tripwire, re-file an
accepted risk that never needed rejecting, or chase a threat mapping that already exists in two plan
frontmatters — while the audit's verdict (93 threats · 58 closed · 35 open · 27 live · `issues_found` ·
ship **BLOCKED**) is byte-for-byte what it was.

## What was done

### Task 1 — dated Corrections block above the register (`f2a2b2e`)

Inserted `## ⚠️ Corrections (2026-07-31, entered by quick 260731-lsx) — three findings retracted` as its
own `---`-delimited section between the intro blockquote and `## Audit Scope and Method` (now line 24;
`## Audit Scope and Method` moved to line 86), so a reader meets all three retractions before the
register. Lead paragraph restates the unchanged verdict and states that no threat was re-audited and no
count moved. Three `### Correction N —` subsections each name the file:line evidence that overturns the
finding.

**The one re-derivation the plan permitted came back exactly as predicted:**

```
grep -v '^\s*//' src/app/actions/cancel-booking.ts | grep -c "AND starts_at > now()"   → 2
grep -c "AND starts_at > now()" src/app/actions/cancel-booking.ts                      → 4
```

The unfiltered 4 resolves to real guards at `:568` (booker flip) and `:991` (host flip) plus comment
lines at `:551` and `:968` that quote the guard — which is precisely where the audit's "4 times" came
from. No other verification was re-run.

### Task 2 — ten in-body retractions (`68853f8`)

**Fix 1 — T-09-91 (3 sites).** Struck the ⚠️ "mis-specified / Fix the gate before 09-25 runs" sentence in
the register row (kept the VERIFIED-by-inaction sentence, kept `closed`), appended the comment-filtered
gate with its `2`→`1` calibration; appended the same point to the "Gap-plan mitigations already present"
row; struck the standalone **"Plan-gate defect found:"** paragraph and followed it with
**"Plan-gate re-verified — no defect (2026-07-31)."**, ending in **"Leave the gate exactly as written."**

**Fix 2 — T-09-86 / AR-16 (4 sites).** Evidence cell became `**ABSENT (pending 09-24).**` citing
`09-24-PLAN.md:194` as the plan that adds the clamp, with the server-only observation retained and
`**LIVE**, alongside its twin T-09-84`; Status stayed `**open**` and Disposition stayed `accept
(bounded)`. AR-16 was un-struck in the Accepted Risks Log and restored as **Pending — takes effect when
09-24 lands** (`09-24 planner` / `2026-07-31`), carrying an `(Un-rejected 2026-07-31 …)` marker. Two
sign-off lines recounted to **0 rejected** / **16 accepted — AR-16 pending 09-24**.

The register-convention argument is verbatim-checkable: the three sibling rows in the same table use the
same post-mitigation present tense and were not rejected —
`09-24-PLAN.md:284` "The envelope **is** reduced over real instants", `:285` "The ceiling **is**
validated and falls back to the documented default", `:286` "A zero-or-negative cap **now** returns every
in-month date as unavailable".

**Fix 3 — UF-01 (2 sites).** Flag cell retitled *(downgraded 2026-07-31 — tracking note, NOT an
unregistered flag)*; the clause "the `cancel-booking.ts` half appears in no gap plan's register" struck
and replaced with both `closes:` citations (`09-17-PLAN.md:13` `[CR-01, NT-01-booking-half]`,
`09-25-PLAN.md:17` `[WR-05, NT-01]`, objective `:44`, split restated `:52-54`), plus the clause that
explains the miss (NT-01 is a review-finding ID, not a `T-09-NN` register ID). Sign-off line updated.
UF-02 and UF-03 untouched.

**Consequential fix.** The `operator env → OPEN_LOW_STOCK_MAX` trust-boundary row keeps its accurate
"**unvalidated** `Number(env)`" wording and gains only "; the clamp arrives with 09-24" so it cannot be
read as a permanent posture.

### Task 3 — frozen-region proof (verification only, no commit)

Every gate ran against the original audit commit `825c4ea`, not just the working tree.

| Gate | Result |
|---|---|
| `git status --short -- src/ drizzle/ tests/ e2e/` | empty |
| Files changed since `825c4ea` | `09-SECURITY.md` only |
| Frontmatter diff lines (`phase:`/`status:`/`threats_*`/`block_on:` …) | `0` |
| `threats_total: 93` / `threats_closed: 58` / `threats_open: 35` / `status: issues_found` / `block_on: high` | all present |
| Audit-trail row `\| 2026-07-31 \| 93 \| 58 \| 27 \| 8 \|` | present ×1 |
| `27 live-open threats` | present ×1 |
| Ship-gate row `\| 09-24 \| T-09-83, T-09-84, T-09-85, T-09-86 \|` | present ×1 |
| `**Approval:** pending` + both `- [ ]` sign-off lines | unchanged |
| Changed `T-09-*` rows in diff | T-09-86 and T-09-91 **only** |
| Population-1 rows (`T-09-01`…`T-09-49`) in diff | `0` |

All 11 removed lines audited individually and each maps to a planned fix site: trust-boundary row,
T-09-86 register row, T-09-91 register row, T-09-91 gap-plan row, 2 lines of the struck Plan-gate
paragraph (its middle line was untouched by the `~~` wrap), AR-16 row, UF-01 row, and 3 sign-off lines.

**Task 2 acceptance greps:** `^| ~~AR-16~~` → 0 · `^| AR-16 ` → 1 · "Plan-gate re-verified — no defect"
→ 1 · "Leave the gate exactly as written" → 1 · `^| T-09-86 .*| **open** |` → 1 ·
`^| T-09-91 .*| closed |` → 1 · "downgraded 2026-07-31" → 2 · Correction pointers → 11 (needed ≥ 9).

## Deviations from Plan

None — plan executed exactly as written. No package was installed; no file outside
`.planning/phases/09-open-capacity-bookings/09-SECURITY.md` was modified.

One thing worth recording for the next executor, since it bit me mid-verification and would bite anyone
re-running these gates: two of my *own* verification greps were wrong in a way that produced false
negatives, and both were caught rather than believed.

1. `grep -E '^-[^-]'` on the diff silently hides sign-off changes, because a removed `- [x] …` line
   renders as `-- [x] …`. First pass showed 8 removed lines against a diffstat of 11; the 3 sign-off
   lines were present and correct all along.
2. GNU `sed 's/\\|//g'` and `grep -o '\\|'` treat `\|` as BRE **alternation**, not an escaped pipe, so a
   column-integrity check reported the T-09-91 row as 8 delimiters. `grep -oF '\|'` confirmed 1 escaped
   pipe → 7 real delimiters → 6 columns, matching untouched rows. The escape is required: the corrected
   T-09-91 cell quotes a shell pipeline inside a markdown table.

## Markdown integrity note

The corrected T-09-91 register cell contains a literal shell pipe inside a table cell, written as `\|`
(GFM-escaped). Verified: 8 raw `|` characters minus 1 escaped = 7 delimiters, identical to untouched
6-column rows (e.g. T-09-85). AR-16 (7), UF-01 (3) and the trust-boundary row (4) all match their
untouched siblings. The Accepted Risks Log now has 16 `AR-NN` rows, matching the recounted sign-off line.

## What this deliberately did NOT do

- No threat was re-audited; the 27 live-open blockers and their evidence are verbatim.
- No count moved. T-09-86 was already counted open and stays open — open *pending 09-24*, still among the
  **27 live**-open (not the 8 deferred), because the unvalidated value is live in shipped code today,
  exactly as its twin T-09-84 records.
- Nothing was silently rewritten. Every reversal is struck-through-plus-dated and points at its
  `### Correction N`, matching the precedent this phase already set at `09-15-SUMMARY.md:61` and
  `09-VALIDATION.md:89,91`.
- Ship gate untouched — phase 09 remains **BLOCKED**, and the `| 09-24 |` row still lists T-09-86 because
  it remains a live-open blocker.

## Follow-ups

None. The next `/gsd:secure-phase 9` run after 09-17…09-25 execute will supersede this record.

## Self-Check: PASSED

- `.planning/phases/09-open-capacity-bookings/09-SECURITY.md` — FOUND (modified, committed)
- `.planning/quick/260731-lsx-correct-09-security-findings/260731-lsx-SUMMARY.md` — FOUND
- Commit `f2a2b2e` — FOUND in `git log`
- Commit `68853f8` — FOUND in `git log`
- No file under `src/`, `drizzle/`, `tests/`, `e2e/` created, modified or deleted — VERIFIED (empty
  `git status --short` for those paths)
