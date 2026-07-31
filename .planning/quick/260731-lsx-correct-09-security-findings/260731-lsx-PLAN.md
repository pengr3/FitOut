---
quick_id: 260731-lsx
slug: correct-09-security-findings
type: quick
gap_closure: false
docs_only: true
source: >-
  `/gsd:secure-phase 9` committed `09-SECURITY.md` (825c4ea). Its verdict is sound
  (93 threats · 58 closed · 35 open · BLOCKED) and stands. Three FINDINGS recorded alongside that
  verdict were re-verified by the orchestrator against the plans and shipped code and are factually
  wrong. Finding 1 in particular instructs a future executor to "fix" an acceptance gate that is
  already correct, which would BREAK it.
files_modified:
  - .planning/phases/09-open-capacity-bookings/09-SECURITY.md
---

<objective>
Retract three erroneous findings in `.planning/phases/09-open-capacity-bookings/09-SECURITY.md`, in the
style this phase already used for the same situation (`09-15-SUMMARY.md:61` and `09-VALIDATION.md:89,91`
carry dated Correction notes with the original left standing).

1. **T-09-91 "plan-gate defect"** — WRONG, retract. 09-25's acceptance gate is comment-filtered and
   correctly calibrated. The audit greped without the filter and quoted the register PROSE, not the gate.
2. **T-09-86 "acceptance rationale not satisfied" / AR-16 REJECTED** — WRONG, restore the accept as
   pending. The rationale uses the register's post-mitigation present tense (three sibling rows in the
   SAME table use the identical voice and were not rejected); the clamp is absent because 09-24 is the
   unexecuted plan that ADDS it.
3. **UF-01 "no threat mapping"** — WRONG, downgrade. NT-01 is owned by BOTH halves in plan frontmatter
   (`09-17-PLAN.md:13` and `09-25-PLAN.md:17`).

Purpose: `09-SECURITY.md` is the working document for whoever executes gap plans 09-17…09-25. Left
as-is it sends that executor to break a correct tripwire, to re-file an accepted risk that never needed
rejecting, and to chase a threat mapping that already exists in two places.

Output: one edited markdown file. Nothing else.
</objective>

<scope_lock>
**DOCS-ONLY. HARD.** No file under `src/`, `drizzle/`, `tests/` or `e2e/` may be created, edited or
deleted. Reading those files to spot-check a grep is fine and expected; writing to them is out of scope.

**FROZEN REGIONS of `09-SECURITY.md` — do not touch:**
- Frontmatter, lines 1-13. `threats_total: 93`, `threats_closed: 58`, `threats_open: 35`,
  `status: issues_found`, `block_on: high` must be **byte-unchanged**.
- The entire Population-1 register table (T-09-01 … T-09-49).
- Every Population-2 register row EXCEPT T-09-86 and T-09-91.
- `## Security Audit Trail` (93 / 58 / 27 / 8).
- `## Ship Gate` in full — including the `| 09-24 | T-09-83, T-09-84, T-09-85, T-09-86 |` row, which
  stays exactly as written because T-09-86 remains a **live**-open blocker.

**Do NOT re-audit anything.** The 27 live-open blockers and their evidence stay verbatim. The only
permitted re-derivation is the read-only spot-check named in Task 1.

**The counts do not move.** T-09-86 was already counted open and stays open — open *pending 09-24*, and
still counted among the **27 live**-open (not the 8 deferred), because the unvalidated value is live in
shipped code today, exactly as its twin T-09-84 records. Totals stay 58 closed / 35 open / 93 total.
</scope_lock>

<tasks>

<task id="1" type="docs">
**Spot-check the one re-derivable claim, then insert the dated Corrections block.**

- files: `.planning/phases/09-open-capacity-bookings/09-SECURITY.md`
- spot-check first (read-only, ~30 seconds — this is the only re-derivation in the whole plan):
  - Run `grep -v '^\s*//' src/app/actions/cancel-booking.ts | grep -c "AND starts_at > now()"`.
    It MUST print `2`. That is 09-25's actual gate and the pre-fix value the plan predicts
    (`09-25-PLAN.md:209` says "prints `1` (was `2`…)"). If it prints anything else, STOP and report —
    the correction text below assumes `2`.
  - Run the same grep WITHOUT the `grep -v` filter. It prints `4`. That is where the audit's "4 times"
    came from: it also catches the comment lines at `:551` and `:968` that quote the guard.
- action: Insert a new top-level section into `09-SECURITY.md` **immediately after the intro blockquote**
  (the "Verification mode: **evidence-required**…" paragraph) and its following `---`, i.e. directly
  BEFORE `## Audit Scope and Method`, so a reader meets it before the register. Insert it as its own
  `---`-delimited section, matching the file's existing section rhythm. Content, verbatim in substance:

  Heading: `## ⚠️ Corrections (2026-07-31, entered by quick 260731-lsx) — three findings retracted`

  Lead paragraph: state that the audit's VERDICT is unchanged — 93 threats · 58 closed · 35 open
  (27 live, 8 deferred) · `status: issues_found` · ship gate BLOCKED — that no threat was re-audited and
  no count moved, and that what follows retracts three *findings* recorded alongside that verdict. Say
  that the original wording is left standing (struck through or marked in place) because this is a
  committed audit artifact.

  `### Correction 1 — T-09-91's "plan-gate defect" is retracted. 09-25's gate is correct.`
  The audit read the mitigation PROSE in 09-25's threat register (`09-25-PLAN.md:331`, "still appears
  exactly once") and greped `AND starts_at > now()` with no comment filter, getting 4 hits — `:568` and
  `:991` in code plus `:551` and `:968` in comments that quote the guard. 09-25's ACTUAL acceptance gate,
  stated twice at `09-25-PLAN.md:209` and `:341`, is
  `grep -v '^\s*//' src/app/actions/cancel-booking.ts | grep -c "AND starts_at > now()"` — it filters
  those comments on purpose so the tripwire measures code. Re-run against current
  `src/app/actions/cancel-booking.ts` it prints `2`, exactly the pre-fix value the plan predicts
  ("was `2`"), from the booker flip at `:568` (which 09-25 forks) and the host flip at `:991` (which
  09-25 deliberately leaves). After the fork it becomes `1`. **The gate is correctly specified and
  correctly calibrated — do not change it.** T-09-91 remains `closed`; that half of the finding was right.

  `### Correction 2 — T-09-86's rationale is the register's present tense, not a false claim. AR-16 restored.`
  The audit rejected AR-16 because the rationale reads "…is now clamped to a finite integer ≥ 1" while
  `open-capacity.ts:27` is a bare `Number(process.env.OPEN_LOW_STOCK_MAX ?? 5)`. The clamp is absent
  because **09-24 is the unexecuted plan that ADDS it** — `09-24-PLAN.md:194` specifies exactly that
  parse-then-validate (finite, ≥ 1, floored, else the documented default of 5). Every GSD threat
  register's `Mitigation Plan` column is written in the post-mitigation present tense, and the three
  sibling rows in the SAME table prove the convention: T-09-83 "the envelope **is** reduced over real
  instants", T-09-84 "the ceiling **is** validated and falls back to the documented default", T-09-85
  "a zero-or-negative cap **now** returns every in-month date as unavailable". None of those was
  rejected. T-09-86 stays **open** and stays counted among the **27 live**-open — open pending 09-24
  like every other unexecuted gap-plan threat — but the "acceptance rationale not satisfied / not
  acceptable as written" verdict is withdrawn, and AR-16 is restored as a pending accepted risk that
  takes effect when 09-24 lands. The audit's one genuinely new observation stands: the value is
  server-only with no `NEXT_PUBLIC_` prefix (verified), so the disclosure half of the rationale already
  holds today.

  `### Correction 3 — UF-01 is not an unregistered flag. NT-01 is registered in both halves.`
  UF-01 recorded that the `cancel-booking.ts` half of review finding NT-01 "appears in no gap plan's
  register". It is explicitly owned by both halves, declared in plan frontmatter: `09-17-PLAN.md:13`
  `closes: [CR-01, NT-01-booking-half]`, with the body at `:48-50` handing the `cancel-booking.ts` half
  to 09-25; and `09-25-PLAN.md:17` `closes: [WR-05, NT-01]`, with the objective at `:44` ("Close
  **WR-05** and the `cancel-booking.ts` half of **NT-01**") and the body at `:52-54` restating the split.
  NT-01 is a review-finding ID rather than a `T-09-NN` register ID, which is presumably what a
  register-scoped search missed. UF-01 is downgraded from an unregistered flag to a tracking note.
  **UF-02 and UF-03 were re-checked and are accurate — untouched.**

- verify:
  - `grep -c "⚠️ Corrections (2026-07-31, entered by quick 260731-lsx)" .planning/phases/09-open-capacity-bookings/09-SECURITY.md` → `1`
  - `grep -c "^### Correction [123] —" .planning/phases/09-open-capacity-bookings/09-SECURITY.md` → `3`
  - The block sits above `## Audit Scope and Method`:
    `grep -n "Corrections (2026-07-31\|## Audit Scope and Method" …` shows the Corrections line first.
- done: A reader opening `09-SECURITY.md` meets all three retractions before reaching the register, and
  each retraction names the file:line evidence that overturns it.
</task>

<task id="2" type="docs">
**Apply the ten in-body retractions. Match on CONTENT, not line number — offsets shift as Task 1's
insert lands.**

- files: `.planning/phases/09-open-capacity-bookings/09-SECURITY.md`
- action: Edit each site below. Where a reader would otherwise wonder what changed, keep the original
  visible with `~~strikethrough~~` and append the correction; where the original is a bare inaccuracy
  in a summary cell, replace it and append a dated `*(Corrected 2026-07-31 — see Correction N)*` marker.
  Every site must carry a pointer to its Correction section.

  **FIX 1 — T-09-91 (three sites).**
  1. *Trust-boundary-adjacent register row* — the `| T-09-91 |` row in the Population-2 table. KEEP
     "**VERIFIED (by inaction).** The host flip retains `AND starts_at > now()` at
     `cancel-booking.ts:991`." Strike through the whole ⚠️ sentence that follows ("The plan's acceptance
     grep … is **mis-specified** … Fix the gate before 09-25 runs.") and append a parenthetical: the
     gate is `grep -v '^\s*//' … | grep -c "AND starts_at > now()"` (`09-25-PLAN.md:209`, `:341`), prints
     `2` today and `1` after the fork — correctly specified, do not change it. See Correction 1. The
     Status cell stays `closed`.
  2. *"Gap-plan mitigations already present" table, T-09-91 row* — keep the existing sentence and append:
     ", and 09-25's comment-filtered acceptance grep measures it correctly (see Correction 1)."
  3. *The standalone "**Plan-gate defect found:**" paragraph below that table* — strike the entire
     paragraph through (all three sentences, ending "Scope the grep to the host UPDATE statement.") and
     follow it with a replacement paragraph headed **"Plan-gate re-verified — no defect (2026-07-31)."**
     restating the filtered gate, its `2`→`1` calibration, the two real guards at `:568`/`:991`, the two
     filtered comments at `:551`/`:968`, and the instruction **"Leave the gate exactly as written."**

  **FIX 2 — T-09-86 (four sites).**
  4. *The `| T-09-86 |` register row, Evidence cell* — replace "**ACCEPTANCE RATIONALE NOT SATISFIED.**
     … Not acceptable as written." with: **ABSENT (pending 09-24).** No clamp exists yet —
     `open-capacity.ts:27` is a bare `Number(env)`; 09-24 is the plan that adds it
     (`09-24-PLAN.md:194`). The value IS server-only (no `NEXT_PUBLIC_` prefix — verified), so the
     disclosure half of the rationale already holds. **LIVE**, alongside its twin T-09-84. Then the
     dated marker: the original cell rejected the acceptance on wording that is the register's
     post-mitigation present tense — see Correction 2. **The Status cell stays `**open**` and the
     Disposition cell stays `accept (bounded)`.**
  5. *`## Accepted Risks Log`, the `| ~~AR-16~~ | ~~T-09-86~~ |` row* — un-strike both IDs. Rationale
     cell becomes: **Pending — takes effect when 09-24 lands.** The threshold env value is clamped to a
     finite integer ≥ 1 by 09-24 (`09-24-PLAN.md:194`); it is already server-only with no
     `NEXT_PUBLIC_` prefix, so the disclosure half holds today. Append
     *(Un-rejected 2026-07-31 — the original row was struck through and marked REJECTED on a misreading
     of the register's post-mitigation present tense. See Correction 2.)*. "Verified against code" cell:
     `open-capacity.ts:27` — clamp pending 09-24; no `NEXT_PUBLIC_` prefix. "Accepted By": `09-24 planner`.
     "Date": `2026-07-31`. Do not renumber any other AR row.
  6. *`## Sign-Off`, the "Every `accept` threat's rationale re-checked…" line* — replace
     "(one rejected: T-09-86)" with a note that the single rejection (T-09-86 / AR-16) was retracted
     2026-07-31 and the count is now 0 rejected. Keep the `- [x]`.
  7. *`## Sign-Off`, the "Accepted risks documented…" line* — "(15 accepted, 1 rejected)" becomes
     "(16 accepted — AR-16 pending 09-24; 0 rejected)". Keep the `- [x]`.

  **FIX 3 — UF-01 (two sites).**
  8. *`## Unregistered Flags` table, the UF-01 row* — retitle the Flag cell to mark it downgraded
     2026-07-31 to a tracking note (not an unregistered flag). In the Detail cell: keep the NT-01
     description and the `booking.ts:726-728` sentence, add that that half is declared at
     `09-17-PLAN.md:13` (`closes: [CR-01, NT-01-booking-half]`), strike through the clause "the
     `cancel-booking.ts` half appears in no gap plan's register", and state that the
     `cancel-booking.ts` half is declared at `09-25-PLAN.md:17` (`closes: [WR-05, NT-01]`; objective
     `:44`; split restated `:52-54`). Add the one clause that explains the miss: NT-01 is a
     review-finding ID, not a `T-09-NN` register ID. Point to Correction 3.
  9. *`## Sign-Off`, the "Unregistered flags logged (UF-01 … UF-03)" line* — becomes
     "(UF-02, UF-03; UF-01 downgraded 2026-07-31 to a tracking note — see Correction 3)". Keep `- [x]`.

  **Consequential accuracy fix.**
  10. *`## Trust Boundaries`, the `operator env → OPEN_LOW_STOCK_MAX` row* — the "**unvalidated**
      `Number(env)`" wording is accurate TODAY and stays. Append only "; the clamp arrives with 09-24"
      so the row cannot be read as a permanent posture. The `see T-09-84 / T-09-86` pointer stays.

- verify:
  - `grep -c "^| ~~AR-16~~" …/09-SECURITY.md` → `0`; `grep -c "^| AR-16 " …` → `1`
  - `grep -c "Plan-gate re-verified — no defect" …` → `1`
  - `grep -c "Leave the gate exactly as written" …` → `1`
  - The T-09-86 row still ends in an `**open**` status cell:
    `grep -c '^| T-09-86 .*| \*\*open\*\* |' …` → `1`
  - The T-09-91 row still ends `| closed |`: `grep -c '^| T-09-91 .*| closed |' …` → `1`
  - `grep -c "downgraded 2026-07-31" …` → `≥ 1` (the UF-01 row)
  - Every fix site points at its Correction: `grep -c "Correction 1\|Correction 2\|Correction 3" …`
    → `≥ 9` (3 headings + ≥ 6 in-body pointers)
- done: No passage in the file still instructs anyone to change 09-25's gate, to treat AR-16 as
  rejected, or to register NT-01's `cancel-booking.ts` half — and every one of those reversals is
  visibly dated rather than silently rewritten.
</task>

<task id="3" type="verify">
**Prove nothing else moved.**

- files: none (verification only)
- action: Run the frozen-region and docs-only gates below. If any fails, fix the edit — do NOT relax
  the gate. Do not re-run any threat verification; do not open `src/` except read-only.
- verify:
  - **Docs-only:** `git status --short -- src/ drizzle/ tests/ e2e/` prints nothing.
  - **One file touched:** `git status --short` lists only
    `.planning/phases/09-open-capacity-bookings/09-SECURITY.md` (plus this plan's own directory).
  - **Frontmatter byte-unchanged:**
    `git diff -U0 -- .planning/phases/09-open-capacity-bookings/09-SECURITY.md | grep -cE '^[+-](phase:|slug:|status:|threats_|asvs_level:|block_on:|created:|audited_by:|register_origin:)'`
    → `0`.
  - **Counts intact:** the file still contains `threats_total: 93`, `threats_closed: 58`,
    `threats_open: 35`, `status: issues_found`, `block_on: high`; the audit-trail row
    `| 2026-07-31 | 93 | 58 | 27 | 8 |` is present exactly once; `grep -c "27 live-open threats" …` → `1`.
  - **Ship gate intact:** `grep -c "| 09-24 | T-09-83, T-09-84, T-09-85, T-09-86 |" …` → `1`; the
    `**Approval:** pending` line and both unchecked `- [ ]` sign-off lines are unchanged.
  - **No collateral register edits:** `git diff -U0 -- …/09-SECURITY.md | grep -E '^[+-]\| T-09-' `
    shows changed rows for T-09-86 and T-09-91 ONLY.
  - **Population-1 untouched:** that same diff shows no `T-09-0*`/`T-09-1*`…`T-09-49` row.
- done: The audit's verdict, counts, ship gate and 27 live-open blockers are provably byte-identical;
  only the three retracted findings and their sign-off/trust-boundary consequences changed.
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| corrected audit doc → gap-plan executor | `09-SECURITY.md` is read as remediation instruction for 09-17…09-25; a wrong sentence here becomes a wrong code change there |
| this edit → committed security record | the file is a signed-off audit artifact; silent rewriting destroys its evidentiary value |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-QF-01 | Tampering | the 27 live-open blockers / frontmatter counts | mitigate | Task 3 gates the frontmatter, the audit-trail row, the ship-gate table and the T-09-* diff surface; only T-09-86 and T-09-91 rows may change |
| T-QF-02 | Repudiation | a committed audit silently rewritten | mitigate | Every reversal is struck-through-plus-dated and points at a `### Correction N` section, matching `09-15-SUMMARY.md:61` precedent |
| T-QF-03 | Tampering | implementation code touched by a docs task | mitigate | `<scope_lock>` forbids writes to `src/`, `drizzle/`, `tests/`, `e2e/`; Task 3 asserts `git status --short` for those paths is empty |
| T-QF-SC | Tampering | npm/pip/cargo installs | mitigate | **No package is installed by this plan.** No dependency change is in scope; any install would be out of scope by `<scope_lock>` |
</threat_model>

<verification>
- `git status --short -- src/ drizzle/ tests/ e2e/` → empty (the hard gate).
- `09-SECURITY.md` frontmatter diff is empty; 93 / 58 / 35 / `issues_found` / `block_on: high` all stand.
- Audit-trail row `| 2026-07-31 | 93 | 58 | 27 | 8 |` present exactly once.
- All three Correction sections present; all three erroneous findings retracted in place with dated
  markers; UF-02 and UF-03 untouched.
- `git diff` on the register shows exactly two changed threat rows: T-09-86 and T-09-91.
</verification>

<success_criteria>
- Nobody executing 09-25 is told to "fix" a gate that is already correct — the retraction says
  explicitly what the gate is, that it prints `2` today and `1` after the fork, and to leave it alone.
- AR-16 reads as a pending accepted risk owned by 09-24, not as a rejection needing re-filing.
- UF-01 reads as a tracking note recording NT-01's 09-17/09-25 split, with both `closes:` citations.
- The audit's verdict — 93 · 58 closed · 35 open (27 live, 8 deferred), `issues_found`, ship BLOCKED —
  is byte-for-byte what it was, and a reader can see exactly what changed and when.
</success_criteria>

<output>
Edited: `.planning/phases/09-open-capacity-bookings/09-SECURITY.md`
Commit: `docs(09): retract three erroneous findings in 09-SECURITY (T-09-91 gate, T-09-86/AR-16, UF-01)`
</output>
