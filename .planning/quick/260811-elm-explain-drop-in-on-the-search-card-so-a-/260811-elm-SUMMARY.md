---
phase: quick-260811-elm
plan: 01
subsystem: search
tags: [copy, search-card, open-capacity, audit-item-6, ui]
requires:
  - src/components/search/search-result-card.tsx
  - src/components/availability/date-pass-picker.tsx
  - src/lib/booking/all-in-rate.ts
provides:
  - "A drop-in search card that states what a drop-in IS: the unit is a day, the space is shared"
affects:
  - .planning/v1.0-MILESTONE-AUDIT.md
tech-stack:
  added: []
  patterns:
    - "Booker-facing copy on a results tile is a COMPRESSION of the surface it links to, never a second vocabulary — the tail is lifted verbatim from the listing page's framing line"
    - "A whole-card `textContent` EXACT-equality pin, composed from the same server helper the card renders from, is what carries a byte-identity claim; named-string assertions do not"
    - "An absence assertion is vacuous until a mutation reddens it — and if the mutation dies on an earlier assertion, add one that isolates it rather than reordering the assertions"
key-files:
  created: []
  modified:
    - src/components/search/search-result-card.tsx
    - tests/search/search-card-open.test.tsx
    - .planning/v1.0-MILESTONE-AUDIT.md
decisions:
  - "D-ELM-02 shipped verbatim: `Day pass · shared space, any time they're open` — `shared space` and never `shared pass`, because group bookings ship and a pass-shared-with-a-friend reading is the adjacent feature"
  - "M2 did not produce the predicted RED; reported as observed and answered with an added M2b rather than by loosening the literal pin"
  - "M3 produced a STRONGER result than predicted — the pre-existing O2 cases (2)/(3) caught the hour, not the new case (8)"
requirements: [AUDIT-06-COPY]
metrics:
  duration_minutes: 42
  completed: 2026-08-11
  tasks: 2
  commits: 3
  tests_added: 3
  full_suite: "1187 passed / 4 skipped / 0 failed"
---

# Quick Task 260811-elm: Explain Drop-in on the Search Card Summary

A drop-in search card now says what a drop-in IS — one muted 46-character line, `Day pass · shared space, any time they're open`, whose tail is lifted verbatim from the listing page it links to; the exclusive card is pinned byte-identical and a mutation proves that pin bites.

## What Shipped

Before, a drop-in card read `Gym · [Drop-in]` / `₱367.50/person` / `Service fee included`. Every line was true and none answered *what is this?* — the booker never learned that the space is **shared with other people** or that they buy a **pass for a day** rather than a reserved window. `/person` hints; it does not state.

One `<p className="text-sm text-muted-foreground">` now sits between the type+badge line and the price, inside a separate `isDropIn &&` guard:

```
Day pass · shared space, any time they're open
```

- **Not new copy.** The tail is the verbatim tail of `src/components/availability/date-pass-picker.tsx:230` (`Pick a day — your pass is good any time they're open.`) and the sibling of `composeWhenLabel`'s `any time {open} – {close}` (`when-label.ts:112`). The card is a compression of the surface it links to.
- **`shared space`, never `shared pass`.** FitOut ships group bookings — an organizer reserves and invites friends — so "a shared pass" reads as *a pass you share with someone*. The sharing is attached to the SPACE. This is also the first time the sharing fact appears in booker-facing copy anywhere; it previously existed only in the host wizard.
- **46 characters, no digit, no `Available `, no substring `left`.** That is why the shipped whole-card assertions (`/\d:/`, `not.toContain("Available ")`, case (1)'s `not.toContain("left")`) now police the new line instead of being routed around it.
- **A separate guard, not a third ternary branch** — leaves the shipped type-line ternary byte-unchanged and makes the drop-in condition a single removable token, which is what lets mutation M1 measure it. The `src/` diff is **45 insertions, 0 deletions**.

Three cases appended to the existing harness (`tests/search/search-card-open.test.tsx`, now 9): (7) the line renders in the right place with the price/fee pair still contiguous; (8) it coexists with O2 under a searched start/end; (9) the exclusive card's whole `textContent` by EXACT equality, composed from `allInRateParts` + `SPACE_TYPE_LABELS`, never a hardcoded peso figure.

## Task Commits

| Task | Name | Commit |
|------|------|--------|
| 1 | RED anchors, written against unchanged `src/` | `936118d` |
| 2a | The explainer line + four mutations recorded verbatim | `1f754ca` |
| 2b | Audit item #6 amended as HALF closed | `9b7bb61` |

## Confirm-Then-Fix: the Observed RED

Cases (7)/(8) were written first against unchanged `src/` and both failed:

```
TestingLibraryElementError: Unable to find an element with the text: Day pass · shared
space, any time they're open. …
 Test Files  1 failed (1)
      Tests  2 failed | 7 passed (9)
```

**Cases (1)-(6) AND case (9) were GREEN in that same run.** That contrast is the evidence (9) is a regression pin of today's exclusive card rather than a restatement of the new assertions. Full verbatim output is pasted into the test-file header.

## Mutations — Four Run, Two Reported As Observed Rather Than As Predicted

All four applied to `src/` alone, all reverted, `git diff --exit-code src/` clean after each. Verbatim REDs are in the test-file header.

**M1 — the `isDropIn` guard deleted. PREDICTED and OBSERVED.** Case (9) RED, case (6) GREEN:

```
Expected: "No photos yetSunset CourtPickleball court₱322.88/hrService fee includedAvailable 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time"
Received: "No photos yetSunset CourtPickleball courtDay pass · shared space, any time they're open₱322.88/hrService fee includedAvailable 9:00 AM–11:00 AM on Fri, Aug 8 · Makati time"
```

This is the whole point of case (9): case (6) — which checks *named strings* on the exclusive card — stayed green through a mutation that put an entire extra paragraph on it.

**M2 — `Day pass` → `Open capacity`. PREDICTION WRONG about which assertion bit.** (7) and (8) did go RED, but on `getByText(BLURB)`, which **throws** — so execution never reached `not.toMatch(FORBIDDEN)`. **M2 does not, on its own, discharge D-ELM-06.** The literal pin was NOT reordered or loosened to fit the prediction (that would trade a stronger assertion for a tidier story).

**M2b — added to isolate the vocabulary assertion.** The shipped literal left exactly as-is, plus a separate drop-in-guarded `<p>Sold in occupancy mode</p>`. `getByText(BLURB)` and the order/contiguity assertions all still pass, so `FORBIDDEN` is the only thing left to fail — and it did:

```
× (7) … → expected 'No photos yetIron RepublicGym / fitne…' not to match /open capacity|occupancy mode/i
× (8) … → expected 'No photos yetIron RepublicGym / fitne…' not to match /open capacity|occupancy mode/i
✓ (9) REGRESSION: the exclusive card's whole rendered text is byte-identical to today
```

The vocabulary assertion is non-vacuous. D-ELM-06 discharged — by M2b, not M2.

**M3 — `any time they're open` → `any time 6:00 AM – 10:00 PM`. STRONGER than predicted.** Four cases red, not one. (7)/(8) died on the literal pin again, but **cases (2) and (3) — shipped since 09-14, carrying no literal pin — reddened on exactly `/\d:/`.** That is the claim M3 exists to establish, discharged by assertions written before this line existed: the new copy sits INSIDE O2's guard, not beside it.

## Manual Verification — Performed, Not Claimed

Rendered live and **measured** (Playwright against `npm run dev`, seeded dev DB), with a drop-in card and exclusive cards in the same result set:

| Viewport | Theme | Explainer height | Lines | Clipped | `whiteSpace` / `line-clamp` |
|----------|-------|------------------|-------|---------|------------------------------|
| 320px | light | 40px | 2 | no | `normal` / `none` |
| 320px | dark | 40px | 2 | no | `normal` / `none` |
| 1440px | light | 20px | 1 | no | `normal` / `none` |
| 1440px | dark | 20px | 1 | no | `normal` / `none` |

- Computed colour differs between themes (`lab(48.496 …)` light, `lab(66.128 …)` dark), so the muted token genuinely resolves in both.
- Render order confirmed on the live DOM: `Gym / fitness floor [Drop-in]` → the explainer → `₱367.50/person` → `Service fee included`.
- Exclusive cards in the same grid read `Alabang Multi-Sport Court / Multi-sport court / ₱735.00/hr · ₱4,410.00/day / Service fee included` — no explainer, no badge.
- At 320px the line wraps after `they're`, leaving `open` alone on the second line. That is wrapping, not truncation, and it is the behaviour the 46-character budget was chosen to produce.

Setup was reverted: `seed_listing_4` was temporarily flipped to `open_capacity` (no drop-in listing existed in dev) and restored to its exact original values afterwards; the two Playwright harness scripts were deleted and never staged. `git status --porcelain` is empty.

## Verification

| Gate | Result |
|------|--------|
| `tests/search/search-card-open.test.tsx` | **9/9** |
| Full `npx vitest run` (bare, no `DATABASE_URL`) | **1187 passed / 4 skipped / 0 failed** (1184 baseline + exactly 3) |
| `npx tsc --noEmit` | exit **0** |
| `npm run lint` | **0 errors**, 9 warnings — none in either changed file, baseline unchanged |
| `git diff --exit-code src/` after every mutation revert | clean (45 insertions, **0 deletions**) |
| `grep -c "any time they're open"` in the card | **1** |
| `grep -v '^\s*//' … \| grep -c "isDropIn && ("` | **1** |
| `git status --porcelain` over `drop-in-badge.tsx`, `spots-left-chip.tsx`, `open-capacity.ts`, `all-in-rate.ts`, `package.json`, `package-lock.json` | **empty** |
| `ls drizzle/*.sql \| tail -1` | `drizzle/0024_audit_table.sql` — no migration added |
| ~~`grep -c "not closed\|NOT closed"` in the audit doc~~ | ~~**5**, one of them adjacent to item 6~~ **CORRECTED 2026-08-11 by the verifier: this gate does NOT reproduce.** The real case-sensitive count is **4**, and none of the four sits adjacent to item 6 — item 6 writes it all-caps as `NOT CLOSED`, which this pattern cannot match. The gate was miscounted AND mis-cased, so it never measured the thing it names. The underlying claim is nonetheless TRUE and was confirmed by direct reading of `v1.0-MILESTONE-AUDIT.md:420-458`: item 6 is stated HALF closed with the item as a whole explicitly not closed. Recorded rather than quietly re-run with a fixed pattern, because a gate whose number nobody checked is the same failure this task already hit once with mutation M2. |

The 1184 → 1187 delta reconciles exactly: three new cases, no case removed, no case renamed.

## Audit Item #6 — HALF Closed, Explicitly Not Closed

`.planning/v1.0-MILESTONE-AUDIT.md` item 6 amended in the house qualify-and-append style used by items 4 and 5 — the original text is intact and never struck through:

- **Clause 1 (copy): CLOSED 2026-08-11** by `260811-elm`, citing both code shas, the exact shipped string, and the byte-identity pin.
- **Clause 2 (small-cap scarcity chip): still an explicitly accepted OC-11 design decision, not debt.** `lowStockThreshold(cap) = clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX)` (09-UI-SPEC:137), argued at 09-UI-SPEC:149, decided by the operator in the Phase-9 human walkthrough, verified 6/6. **No OC-11 file was touched.**
- **The item AS A WHOLE is stated to be NOT closed**, in those words, at the head of the amendment.

## Deviations from Plan

### 1. [Rule 3 — blocking] M2 did not discharge D-ELM-06; an M2b was added

- **Found during:** Task 2, step B.
- **Issue:** the plan predicted M2 would redden (7)/(8) *on `FORBIDDEN`*. It reddened them on `getByText(BLURB)`, which throws — so `not.toMatch(FORBIDDEN)` never executed. D-ELM-06 requires the vocabulary assertion be *proven* non-vacuous, and M2 as specified did not prove it.
- **Fix:** reported M2 as observed and added **M2b**, which leaves the shipped literal untouched and adds a separate forbidden-vocabulary node, so `FORBIDDEN` is the only assertion that can fail. It reddened exactly as required.
- **Not done:** the assertions were NOT reordered to make M2 work. The plan forbids adjusting an assertion to fit a prediction, and the literal pin is the stronger of the two.
- **Commit:** `1f754ca`.

### 2. M3 produced a stronger result than predicted — recorded as observed

- **Found during:** Task 2, step B.
- **Observed:** four cases red, not one. (7)/(8) died on the literal pin; **(2) and (3) — shipped, unpinned — reddened on `/\d:/`**. Nothing was changed in response; the claim M3 exists to prove is discharged, by better evidence than the plan anticipated.

### 3. Task 2 split into two commits

- **Issue:** the plan asked for one commit carrying code + audit doc, *and* asked the audit doc to cite "both commit shas". A commit cannot contain its own sha.
- **Fix:** code in `1f754ca`, audit doc in `9b7bb61` citing `936118d` + `1f754ca`. This matches the house pattern already in the repo (`260810-sti` and `260811-dj4` both land their doc amendment as a separate `docs(...)` commit after the feat).

## Known Stubs

None. The line is a static string literal with no props, no interpolation and no data source to wire.

## Threat Flags

None. `T-ELM-01` holds by construction — the new node takes no props and interpolates nothing, so no host- or booker-controlled data can reach it. No new endpoint, auth path, file access or schema surface.

## Self-Check

- `src/components/search/search-result-card.tsx` — FOUND
- `tests/search/search-card-open.test.tsx` — FOUND
- `.planning/v1.0-MILESTONE-AUDIT.md` — FOUND
- Commit `936118d` — FOUND
- Commit `1f754ca` — FOUND
- Commit `9b7bb61` — FOUND

## Self-Check: PASSED
