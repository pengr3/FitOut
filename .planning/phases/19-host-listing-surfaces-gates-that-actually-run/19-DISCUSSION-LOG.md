# Phase 19: Host Listing Surfaces & Gates That Actually Run - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-04
**Phase:** 19-host-listing-surfaces-gates-that-actually-run
**Areas discussed:** Orphan drafts + create shape, CI scope + the Resend guard, Footer controls at 320px, How hard the 404 gate bites

---

## Area selection

All four offered gray areas were selected. Todo cross-reference produced four keyword matches, none folded — see CONTEXT.md `<deferred>` § Reviewed Todos.

---

## Orphan drafts + create shape

### Q1 — Fate of the four existing orphan drafts

| Option | Description | Selected |
|--------|-------------|----------|
| Delete them | The defect's residue; empty, no pricing, photos or bookings. One-off scripted delete scoped by host and creation window. | ✓ |
| Leave them for the host | They have a working Delete control on the grid; costs nothing to leave, but makes the host clean up after our bug. | |
| Show me them first | List the four rows with ids and timestamps before deciding. | |

**User's choice:** Delete them
**Notes:** Orchestrator added a condition not in the option text — verify emptiness per row rather than trusting the time window, since the window is how they were found, not proof of contents.

### Q2 — How creation should work so a failed destination can't strand a row

| Option | Description | Selected |
|--------|-------------|----------|
| Reuse the host's empty draft | Idempotent create: reuse an existing untouched draft before minting. Kills the orphan class at source. No migration. | ✓ |
| Defer the row until first save | No GET-writes at all, but touches the wizard's autosave contract and contradicts shipped D-01 draft-first. | |
| Keep as-is, just report failures | Cheapest; a failed redirect still strands a row, it just says so. | |

**User's choice:** Reuse the host's empty draft
**Notes:** This is what makes Q1's delete a genuine one-off rather than the first of many. Open sub-question handed to the planner: the precise predicate for "untouched", so a draft the host has started editing is never silently reused.

### Q3 — What the host sees when creation genuinely fails

| Option | Description | Selected |
|--------|-------------|----------|
| Grid + a sentence naming it | Land back on the grid with a message naming the failure and the way out; matches the shipped signal rule. | ✓ |
| A retry on an error surface | Dedicated error state with retry; more deliberate but a new surface for a rare branch. | |
| You decide | Follow the shipped signal patterns. | |

**User's choice:** Grid + a sentence naming it
**Notes:** Replaces the silent bounce at `new/page.tsx:83`, already recorded as a known blind spot in `18.1-UI-SPEC § NOT COVERED`.

---

## CI scope + the Resend guard

### Q1 — What the new gate-e2e job runs

| Option | Description | Selected |
|--------|-------------|----------|
| All 37, measure, then decide | Full set per PR, record wall-clock, shard only if the number justifies it. | ✓ |
| Subset on PR, full on main | Fast PRs, but a regression can land on main first — a shape this repo has already paid for. | |
| Full suite, nightly only | Cheapest minutes; decouples the gate from the change that broke it. | |

**User's choice:** All 37, measure, then decide
**Notes:** Measurement before optimisation. The wall-clock is to be recorded in the phase summary either way.

### Q2 — Enforcing the Resend key

| Option | Description | Selected |
|--------|-------------|----------|
| Fail closed on the key | Job asserts `RESEND_API_KEY` unset and fails loudly if set. | ✓ |
| Rely on it staying unset | Correct today; silently wrong the first time someone adds the secret. | |
| Mock Resend in the seam | Stronger, but `instrumentation.ts` argues explicitly against folding Resend in. | |

**User's choice:** Fail closed on the key
**Notes:** Grounded in `[17-D28]` — 14 real `POST api.resend.com/emails` per suite run when the key is set. Mocking was declined for this phase and recorded as a deferred idea; `[17-D28]` stays OPEN.

### Q3 — Whether a failing spec blocks merge

| Option | Description | Selected |
|--------|-------------|----------|
| Yes — required check | A gate that reports but cannot block is the shape D-24 already left behind. | ✓ |
| Report first, require later | Safer against a noisy first week; risks never being flipped. | |

**User's choice:** Yes — required check
**Notes:** Orchestrator attached a prerequisite: made required only after it has been *watched failing*, which is success criterion 4 regardless.

---

## Footer controls at 320px

| Option | Description | Selected |
|--------|-------------|----------|
| Wrap to a second row | Controls wrap, card grows; nothing hidden. | |
| Overflow menu for destructive | Unlist + Delete behind a `…` menu; adds a component and an extra press. | |
| Icon-only when narrow | Drop labels below a breakpoint. | |
| **Other (free text)** | **"replace delete with just an icon it will make the space much smaller"** | ✓ |

**User's choice:** *(free text)* — Delete alone becomes icon-only; Unlist keeps its label.
**Notes:** Two corrections the orchestrator recorded after checking the tree:
1. The 44px mis-tap concern raised in the question was **wrong for this cluster**. `e2e/overflow-320.spec.ts:3146-3150` declares `touch: []` with the written argument that these controls are `size="sm"` by design and *"asserting 44 on any of them would be red against reviewed code"*. The real bar is the 24px `expectTargets` scan.
2. **No test or spec locates the Delete control by its text**, so icon-only breaks no locator — provided the accessible name survives as `sr-only`. Dropping the name is the failure mode, and it would be silent and screen-reader-only.
The existing `ConfirmDialog` makes icon-only safe from mis-taps and is therefore not optional.

---

## How hard the 404 gate bites

| Option | Description | Selected |
|--------|-------------|----------|
| Guard + written finding | Close as a dev artifact but leave a spec that fails if a host-facing route stops resolving, plus the manifest evidence. | ✓ |
| Written finding only | Record evidence and reproduction steps; add no test. | |
| Keep digging until root-caused | Don't close until the manifest-entry removal is identified; unbounded. | |

**User's choice:** Guard + written finding
**Notes:** Weighted by the fact that this class has been re-diagnosed from scratch twice on this machine — phantom `tsc` errors from a half-written `.next/dev/types/routes.d.ts`, and this phantom 404 — and neither left anything behind.

---

## Claude's Discretion

- Exact copy of the creation-failure sentence, following shipped signal patterns.
- The predicate defining an "untouched" draft.
- The icon for the Delete control, consistent with the existing footer icon idiom.
- Whether the 404 guard is a Playwright spec or a structural test.

## Deferred Ideas

- Mocking `api.resend.com` in `instrumentation.ts` — declined for this phase; `[17-D28]` stays OPEN as the largest known un-fixed exposure in the suite.
- Sharding the e2e suite — gated on the wall-clock measurement.
- An overflow menu for destructive card actions — the next option if the cluster grows past four controls.
- Moving three shipped-but-still-pending todos to `completed/` — a records change flagged for the PM, not made.
