---
phase: quick-260811-elm
verified: 2026-08-11T11:35:00Z
status: human_needed
score: 11/11 must-haves verified
overrides_applied: 0
human_verification:
  - test: "Load the search grid at 320px and at desktop width, in BOTH themes, with a drop-in listing and an exclusive listing in the same result set."
    expected: "The new explainer line is muted, wraps rather than truncates, sits between the type+badge line and the price; the exclusive card looks exactly as it did before this task."
    why_human: "Visual appearance/rendering is inherently a human-eyes check. PLAN.md tags this item <manual> (not <automated>). The executor's SUMMARY documents a Playwright-driven self-check with specific measurements (40px/2-lines at 320px, 20px/1-line at desktop, distinct computed `lab()` colours per theme, no line-clamp/whitespace-nowrap) which is strong supporting evidence and was independently corroborated structurally (the `<p>` carries only `text-sm text-muted-foreground`, no truncate/line-clamp/whitespace-nowrap class), but no human has yet looked at the rendered page for this change."
---

# Quick Task 260811-elm: Explain Drop-in on the Search Card Verification Report

**Task Goal:** Close the COPY clause of v1.0 milestone-audit item #6 — add
`Day pass · shared space, any time they're open` to drop-in search cards so a booker knows what they are
buying. The SECOND clause (small-cap scarcity chip, OC-11) is an operator-accepted design decision and must
stay open.

**Verified:** 2026-08-11
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths (from PLAN.md `must_haves.truths`)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Booker learns from the search card alone that a drop-in space is shared and sold as a day pass (D-ELM-01) | VERIFIED | `src/components/search/search-result-card.tsx:236-240` — `{isDropIn && (<p className="text-sm text-muted-foreground">{"Day pass · shared space, any time they're open"}</p>)}` renders between the type+badge line and the price. Test case (7) asserts `getByText(BLURB)` resolves and order `indexOf("Drop-in") < indexOf(BLURB) < indexOf("₱367.50/person")`, reproduced independently — passes. |
| 2 | The copy compresses `date-pass-picker.tsx:230`'s tail verbatim, not a second vocabulary (D-ELM-02) | VERIFIED | Read `src/components/availability/date-pass-picker.tsx:230` — tail `any time they're open` matches the shipped card literal byte-for-byte. Code comment at `search-result-card.tsx:205-211` cites the source. |
| 3 | Sharing fact attached to SPACE, never PASS (D-ELM-02) | VERIFIED | Literal reads `shared space`, never `shared pass`/`shared day pass`. Comment at lines 213-218 states the group-booking misread rationale. |
| 4 | Vocabulary rule obeyed; `open capacity`/`occupancy mode` absent, proven non-vacuous by mutation (D-ELM-06) | VERIFIED | `FORBIDDEN = /open capacity\|occupancy mode/i` asserted in cases (7)/(8)/(9). Independently reproduced M2 (`Day pass`→`Open capacity`): both (7)/(8) reddened, but on the `getByText(BLURB)` throw, NOT on `FORBIDDEN` — confirms the SUMMARY's claim that M2 alone does not discharge D-ELM-06. Independently reproduced M2b (literal untouched + separate `<p>Sold in occupancy mode</p>` node): (7)/(8) reddened exactly on `not.toMatch(FORBIDDEN)`, (9) stayed green — output matched the test-file header verbatim. |
| 5 | New line cannot reintroduce O2's hour-lie; CLOCK_TIME/`Available ` assertions run over whole card (D-ELM-02) | VERIFIED | Independently reproduced M3 (`any time they're open`→`any time 6:00 AM – 10:00 PM`): 4 cases reddened — (2),(3),(7),(8) — matching the SUMMARY's claim exactly, including that (2)/(3) are the pre-existing, previously-unpinned O2 cases. |
| 6 | Exclusive card byte-identical, pinned by exact equality composed from server helper, never hardcoded peso (D-ELM-05) | VERIFIED | Case (9), lines 389-397: `expected` array built from `row.title`, `SPACE_TYPE_LABELS.pickleball_court`, `row.allInRateParts.join(" · ")`, literals, joined and compared with `.toBe()`. Independently reproduced M1 (guard deleted): (9) reddened with the exact predicted/observed diff text, case (6) (named-string check) stayed green — proves (9), not (6), carries the byte-identity claim. |
| 7 | No new import/primitive/tooltip; one `<p className="text-sm text-muted-foreground">`, wraps not truncates at 320px (D-ELM-04) | VERIFIED (structural) + see human_verification | No new imports in the diff (`git show 1f754ca` — only the guarded `<p>` added). Class list has no `truncate`/`line-clamp`/`whitespace-nowrap`. Actual wrap-not-truncate behaviour at 320px was not independently re-measured by this verifier (see human_verification item below); executor's Playwright measurement is documented in SUMMARY with concrete numbers. |
| 8 | `drop-in-badge.tsx`, listing page, reserve page BYTE-UNTOUCHED (D-ELM-03) | VERIFIED | `git diff 7d1a50d -- src/components/listing/drop-in-badge.tsx src/app` → empty. No diff anywhere under `src/app`. |
| 9 | `SpotsLeftChip`, `lowStockThreshold`, `OPEN_LOW_STOCK_MAX`, all OC-11 files byte-untouched (D-ELM-07) | VERIFIED | `git diff 7d1a50d --stat -- src/components/availability/spots-left-chip.tsx src/lib/availability/open-capacity.ts src/lib/booking/all-in-rate.ts package.json package-lock.json` → empty (reproduced independently). |
| 10 | Audit item #6 amended HALF closed, item as a whole stated NOT closed (D-ELM-07) | VERIFIED | `.planning/v1.0-MILESTONE-AUDIT.md:420-458` — item 6's original sentence is intact, never struck through (contrast with item 7, which IS struck through). Amendment reads "**HALF CLOSED 2026-08-11**", "**THIS ITEM AS A WHOLE IS THEREFORE NOT CLOSED — read both halves before quoting either**", and Clause 2 explicitly "STILL AN EXPLICITLY ACCEPTED DESIGN DECISION, NOT DEBT". No sentence anywhere implies the whole item is done. |
| 11 | No schema change, no migration, no new dependency (D-ELM-04) | VERIFIED | `ls drizzle/*.sql \| tail -1` → `drizzle/0024_audit_table.sql` (unchanged). `git diff 7d1a50d --stat -- package.json package-lock.json` → empty. |

**Score:** 11/11 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/components/search/search-result-card.tsx` | Explainer line inside `isDropIn &&` guard, between type+badge line and price | VERIFIED | Present at lines 236-240; `grep -c "any time they're open"` = 1; `grep -v "^\s*//" \| grep -c "isDropIn && ("` = 1. Diff from base is 45 insertions, 0 deletions, purely additive. |
| `tests/search/search-card-open.test.tsx` | Cases 7/8/9 + verbatim RED/mutation record, appended to existing 6-case harness | VERIFIED | 9/9 cases present and pass (reproduced). Verbatim RED and 4-mutation record (M1, M2, M2b, M3) present in file header and each independently reproduced with matching output. |
| `.planning/v1.0-MILESTONE-AUDIT.md` | Item 6 amended — copy clause CLOSED, scarcity clause accepted-as-designed, whole item still open | VERIFIED | Diff is +37 lines, additive only. Content matches the required framing (see Truth #10). |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `search-result-card.tsx` | the `isDropIn` fork | `isDropIn && (` guard | WIRED | Confirmed present exactly once (grep gate) and confirmed functionally: removing the guard (M1) leaks the line onto the exclusive card and reddens case (9). |
| `search-result-card.tsx` | `date-pass-picker.tsx:230` | shared tail `any time they're open` | WIRED | Byte-for-byte tail match confirmed by direct read of both files. |
| `search-card-open.test.tsx` | `src/lib/booking/all-in-rate.ts` | `allInRateParts` composition, not a literal peso figure | WIRED | Case (9)'s expected string is built from `row.allInRateParts.join(" · ")`, confirmed by direct read; no hardcoded peso figure present. |

### Behavioral Spot-Checks (Mutation Reproduction)

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| Task 1 "confirm-then-fix" RED reproduced (explainer block removed, simulating pre-task `src/`) | `npx vitest run tests/search/search-card-open.test.tsx` on src with the explainer block stripped | 2 failed (7, 8) / 7 passed (1-6, 9) — matches header verbatim | PASS |
| M1 — guard deleted | same, guard removed only | 1 failed (9) / 8 passed; exact expected/received diff text matched SUMMARY verbatim | PASS |
| M2 — `Day pass` → `Open capacity` | same | 2 failed (7, 8), both on `getByText(BLURB)` throw, NOT on `FORBIDDEN` — confirms claim (a) | PASS |
| M2b — literal untouched + separate forbidden node | same | 2 failed (7, 8), both on `not.toMatch(FORBIDDEN)`; (9) green — confirms D-ELM-06 non-vacuous | PASS |
| M3 — `any time they're open` → `any time 6:00 AM – 10:00 PM` | same | 4 failed: (2), (3), (7), (8); (6)/(9) green — confirms claim (b), including that (2)/(3) predate this task | PASS |
| Full suite | `npx vitest run` (bare, no `DATABASE_URL`) | 1187 passed / 4 skipped / 0 failed | PASS |
| `tsc` | `npx tsc --noEmit` | exit 0 | PASS |
| `lint` | `npm run lint` | 0 errors, 9 warnings, none in either changed file | PASS |
| Seed row restoration | Direct query against live dev DB for `seed_listing_4` | `occupancy_mode: "exclusive"`, `hourly_rate_cents: 35000`, `day_rate_cents: 200000`, `per_head_price_cents/included/extra_head_fee: null` — matches `scripts/seed.ts`'s literal values and schema default exactly | PASS |
| Stray harness files | `git status --porcelain`, `find` for playwright/harness scripts | Working tree clean except the (expected, uncommitted) SUMMARY.md itself; no stray scripts found | PASS |

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| — | — | No `TBD`/`FIXME`/`XXX`/`TODO`/`HACK`/`PLACEHOLDER` or stub-language matches in either changed file | — | none |

### Notes on SUMMARY Self-Reported Accuracy

One self-reported verification-gate number in the SUMMARY does not reproduce exactly as stated, though the
underlying goal it was checking for still holds on direct inspection:

- **SUMMARY claims:** `grep -c "not closed\|NOT closed"` in the audit doc = **5**, "one of them adjacent to
  item 6".
- **Reproduced independently (case-sensitive, exact command from PLAN.md's `<verify>` block):** the count is
  **4** (lines 345, 376, 512, 578) — none of which are adjacent to item 6. Item 6's own "NOT CLOSED" text
  (line 424) is written in a case (`NOT CLOSED`, all-caps `CLOSED`) that the case-sensitive pattern
  `"not closed\|NOT closed"` does not match (it matches `not closed` and `NOT closed`, not `NOT CLOSED`).
  A case-insensitive count (`grep -ic`) does return 5 and does include item 6's own text.
- **Consequence for the goal:** none. Direct reading of `.planning/v1.0-MILESTONE-AUDIT.md:420-458`
  independently confirms item 6 is correctly stated as HALF closed / not closed as a whole (Truth #10 above,
  VERIFIED by direct text read, not by this grep gate). The PLAN's own automated gate
  (`MUST be >= 1 near item 6`) is numerically satisfied either way (4 ≥ 1), just not for the reason the
  SUMMARY states.
- This is flagged as a documentation-accuracy discrepancy in the executor's self-report, not a gap in the
  deliverable — the goal (item #6 correctly amended as HALF closed) is independently verified true.

### Scrutiny Items — Explicit Findings

**(a) M2 did not discharge D-ELM-06, M2b was added — CONFIRMED, and no other new case shares the defect.**
Reproduced M2 and M2b exactly (see Behavioral Spot-Checks). Reviewed cases (7), (8), (9) line by line for
the "assertion after a throwing query is unreachable" shape: (7) and (8) both open with
`screen.getByText(BLURB)` (a throwing query) followed by `not.toMatch(FORBIDDEN)` — the defect the SUMMARY
names. Case (9) uses `screen.queryByText(BLURB)` (non-throwing, returns `null` on absence) before its
`FORBIDDEN` check, so it does not share the defect. No other new case exhibits this shape.

**(b) M3 stronger than predicted — CONFIRMED.** Cases (2) and (3) exist in the pre-task file
(`git show 7d1a50d:tests/search/search-card-open.test.tsx`), are unpinned (`not.toMatch(CLOCK_TIME)` over
the whole rendered card text, no literal string comparison), and reproducing M3 independently reddens
exactly (2), (3), (7), (8) with (6)/(9) staying green — matching the SUMMARY's claimed output verbatim.

**(c) Manual render check — the data-touching claim (seed restoration) is CONFIRMED; the visual measurement
claim is not independently re-verifiable by this verifier and is routed to human verification.**
`seed_listing_4` was queried directly against the live local dev database and its `occupancy_mode`,
`hourly_rate_cents`, `day_rate_cents`, `per_head_price_cents`, `included`, and `extra_head_fee` all match
the values `scripts/seed.ts` and the schema default would produce — the row is genuinely restored, not left
in the temporarily-flipped `open_capacity` state. `git status --porcelain` is clean and no stray Playwright
harness script or scratch file was found anywhere in the repo. The specific pixel/line-count/colour
measurements in the SUMMARY were not re-run by this verifier (would require starting `npm run dev` and a
fresh Playwright session); they are plausible and structurally consistent with the shipped CSS classes, but
per PLAN.md's own `<manual>` tag this check calls for a human look, so it is surfaced below rather than
silently accepted.

**Audit item #6 half-closed framing — CONFIRMED.** No sentence in the amendment or in the SUMMARY implies
item #6 as a whole is closed; the "as a whole... NOT closed" statement is explicit and unambiguous, and the
original bullet text is preserved (qualified/appended, not struck through, unlike item 7 which genuinely is
struck through). Commit shas cited in the audit doc (`936118d`, `1f754ca`) match the actual commits exactly;
the doc's own commit (`9b7bb61`) is correctly NOT self-cited.

### Human Verification Required

### 1. Visual render of the drop-in explainer at 320px / desktop, both themes

**Test:** Load the search results grid with a drop-in listing and an exclusive listing in the same result
set. View at 320px width and at desktop width, in both light and dark theme.
**Expected:** The new `Day pass · shared space, any time they're open` line is muted (not accent), sits
directly beneath the `Gym · [Drop-in]` line and above the price, wraps to two lines at 320px rather than
truncating, renders as one line at desktop width, and the exclusive card's layout is visually unchanged
from before this task.
**Why human:** Rendering/appearance is inherently a human-eyes check, and PLAN.md's own `<verify>` block
tags this item `<manual>` rather than `<automated>`. The executor's SUMMARY documents a Playwright-driven
self-check with specific numeric evidence (40px/2 lines at 320px both themes, 20px/1 line at desktop both
themes, distinct computed `lab()` colours per theme, `whiteSpace: normal` / no `line-clamp`) which is
credible supporting evidence and matches the shipped CSS structurally (no `truncate`/`line-clamp`/
`whitespace-nowrap` classes on the new `<p>`), but no independent human eyes have confirmed the rendered
page for this specific change.

### Gaps Summary

No gaps found. All 11 must-have truths are independently verified against the codebase: the copy shipped
verbatim inside its own guard with a byte-unchanged surrounding ternary; the exclusive card's byte-identity
pin and all four mutations (M1, M2, M2b, M3) reproduce exactly as the SUMMARY describes, including the two
places its predictions were wrong and were correctly reported as observed rather than adjusted to fit; every
scope-guard file (badge, chip, threshold, rate helper, package.json/lock, drizzle/) is genuinely
byte-unchanged from base; the full suite is 1187/4/0, tsc and lint are clean; the audit doc correctly states
item #6 as HALF closed and explicitly not closed as a whole, with both commit shas cited correctly; and the
one claim that touched real data (the `seed_listing_4` flip-and-restore) is confirmed restored by a direct
database query.

The only reason status is `human_needed` rather than `passed` is the PLAN's own `<manual>` visual-render
verification item, which by definition requires a human look regardless of how strong the executor's
automated supporting evidence is. A secondary, non-blocking note: one self-reported grep-gate number in the
SUMMARY's verification table (5 vs. actual 4, "adjacent to item 6" vs. actually none of the 4) does not
reproduce exactly, though the substantive truth it was checking — item 6 stated as not closed — is
independently confirmed true by direct reading of the audit doc.

---

_Verified: 2026-08-11T11:35:00Z_
_Verifier: Claude (gsd-verifier)_
