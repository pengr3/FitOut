# Phase 17: Cross-Cutting Audit — Themes, Responsive, A11y & Baselines - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-29
**Phase:** 17-cross-cutting-audit-themes-responsive-a11y-baselines
**Areas discussed:** All four presented areas resolved by wholesale delegation to the SWE's stated defaults

---

## How the discussion went

Four gray areas were presented (multi-select). The PM first dismissed the picker and asked for a
plain-language explanation of what the phase is ("i don't understand what we are going to discuss,
what is this phase about? you are my swe"). After the SWE explained the phase — the closing
inspection that turns the five per-phase quality bars into milestone-wide machine-checked proof —
and stated a concrete default for each of the four areas, the PM answered **"alright the wheel is
yours go ahead"**, delegating all four to the stated defaults.

---

## Three inherited policy calls

| Option | Description | Selected |
|--------|-------------|----------|
| Deep-dive each now | Discuss slider semantics, ProfileLink budget, radio group individually | |
| Decide at measurement time | Batch recommendations when each is measured | |
| Take the spec's suggested fix on all three | ProfileLink: padding + budget re-open; slider: `aria-disabled` per AC#23; radio group: keep, record why | ✓ (default) |

**User's choice:** Delegated — defaults accepted (→ D-196, D-197, D-198).

## Escalation cadence & closure bar

| Option | Description | Selected |
|--------|-------------|----------|
| Batch at phase end | One deferred-items list, reviewed once; interrupt only for GATE-06 alarms or AC-unreachable findings | ✓ (default) |
| Mid-phase checkpoints | PM reviews findings as they land | |

**User's choice:** Delegated — batch (→ D-199); phase may close green with recorded escalations (→ D-200).

## Surface inventory boundary

| Option | Description | Selected |
|--------|-------------|----------|
| Product routes only | Enumerated from `src/app/**/page.tsx`; dev routes/emails/OG excluded with recorded reasons | ✓ (default) |
| Include emails/dev surfaces | Widen the audit subject list | |

**User's choice:** Delegated — product routes only (→ D-201).

## Endgame & human verification

| Option | Description | Selected |
|--------|-------------|----------|
| Machine evidence only | Green comparison run on head commit, run id recorded; baselines regenerated last via CI | ✓ (default) |
| Add a hands-on UAT walkthrough | 16.1-style operator walk | |

**User's choice:** Delegated — machine evidence is the whole bar (→ D-202).

## Claude's Discretion

Everything execution-shaped: plan sequencing, per-finding fix-vs-escalate classification within the
UI-SPEC's two remediation tables, instrument design details, route-table mechanics.

## Deferred Ideas

None raised.
