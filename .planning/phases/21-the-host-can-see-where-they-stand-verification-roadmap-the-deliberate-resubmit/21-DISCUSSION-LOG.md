# Phase 21: The Host Can See Where They Stand — Verification Roadmap & the Deliberate Resubmit - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-09
**Phase:** 21-The Host Can See Where They Stand — Verification Roadmap & the Deliberate Resubmit
**Areas discussed:** Verification roadmap, Fix-and-resubmit journey, Review-cycle history

---

## Todo cross-reference

| Option | Description | Selected |
|--------|-------------|----------|
| None; reference only | Do not fold any matched todo into Phase 21; keep relevant records as background | ✓ |
| Fold matching verification todo | Add the older submission/gate todo to this phase's scope | |
| Review matches individually | Decide each matched todo separately | |

**User's choice:** None; reference only.
**Notes:** Four pending todos were reviewed. None changes Phase 21's boundary.

---

## Verification roadmap

### Roadmap location

| Option | Description | Selected |
|--------|-------------|----------|
| Host dashboard | Put the complete four-gate journey where the host decides what needs attention | ✓ |
| Verification page | Keep the journey on the focused account-check destination | |
| Both | Duplicate the complete roadmap on both surfaces | |

**User's choice:** Host dashboard.
**Notes:** `/host/verify` remains the focused identity-check destination.

### Roadmap composition

| Option | Description | Selected |
|--------|-------------|----------|
| Vertical step list | One bordered container with four stacked rows | |
| Separate cards | Four independent state cards in a responsive grid | ✓ |
| Responsive stepper | Compact connected steps with different desktop/mobile geometry | |

**User's choice:** Separate cards, after requesting a spike.
**Notes:** Three runnable variants were compared. Separate cards won, then passed the follow-up
state-stress spike at 8/8 checks with no 320px overflow.

### Mixed portfolio completion

| Option | Description | Selected |
|--------|-------------|----------|
| First live listing completes the journey | Keep rejected sibling work on that listing's own card | ✓ |
| Any rejection keeps the journey incomplete | Treat account onboarding as incomplete while any listing needs review work | |
| Separate roadmap per listing | Duplicate the four-step onboarding journey for every listing | |

**User's choice:** First live listing completes the journey.
**Notes:** Account onboarding and listing maintenance have separate action ownership.

### Completed-roadmap treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Compact ready summary | Collapse to one “Ready to take bookings” receipt | ✓ |
| Keep all cards | Leave all four completed cards expanded | |
| Hide the roadmap | Remove the roadmap with no readiness receipt | |

**User's choice:** Compact ready summary.
**Notes:** Keeps confirmation while returning dashboard space.

---

## Fix-and-resubmit journey

The user asked to take the recommended default for every remaining decision.

### Rejected-card action

| Option | Description | Selected |
|--------|-------------|----------|
| Replace `Edit` with `Fix and resubmit` | Give the rejected state one explicit primary route into the wizard | ✓ |
| Show both actions | Put `Edit` and `Fix and resubmit` beside each other | |
| Keep `Edit` plus nearby explanation | Preserve the generic label and explain re-review in text | |

**User's choice:** Recommended default.
**Notes:** Non-rejected cards keep their normal edit action.

### Before-edit explanation

| Option | Description | Selected |
|--------|-------------|----------|
| Entry dialog plus wizard reminder | Explain material fields before navigation and preserve context in the wizard | ✓ |
| Wizard notice only | Explain the consequence only after entering the editor | |
| Listing-card copy only | Put the complete material-field explanation directly in the card body | |

**User's choice:** Recommended default.
**Notes:** Labels derive from `MATERIAL_FIELDS`; direct wizard navigation still receives the reminder.

### Re-review trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Existing material-save transition | Re-queue only after a successful material edit | ✓ |
| Standalone resubmit action | Allow an unchanged listing to re-enter review | |
| New final submission step | Add a second authority after the wizard's existing saves | |

**User's choice:** Recommended default.
**Notes:** The shipped re-review module stays byte-unchanged; no appeal-shaped action is added.

### Acknowledgement

| Option | Description | Selected |
|--------|-------------|----------|
| In-page receipt plus persistent pending state | Confirm the server transition immediately and keep the durable state visible | ✓ |
| Toast only | Rely on a transient client notification | |
| Email only | Move confirmation off the active host surface | |

**User's choice:** Recommended default.
**Notes:** Acknowledgement follows server-confirmed material re-review, not navigation intent.

---

## Review-cycle history

The user asked to take the recommended default for every remaining decision.

### History location

| Option | Description | Selected |
|--------|-------------|----------|
| Listing-card dialog | Keep history attached to its listing without changing grid height or adding a page | ✓ |
| Inline card expansion | Expand cycles directly inside one grid card | |
| Edit wizard only | Require entering the editor to inspect history | |

**User's choice:** Recommended default.
**Notes:** Reuse the existing accessible dialog dependency and render no control when there is no history.

### Cycle representation

| Option | Description | Selected |
|--------|-------------|----------|
| Stacked lifecycle records | Show submitted → waiting → decided for each cycle, newest first | ✓ |
| Dense table | Put cycles and timestamps into rows and columns | |
| Raw event feed | Expose each state change as an independent event | |

**User's choice:** Recommended default.
**Notes:** Open cycles stop at Waiting; rejected cycles include the operator's sentence.

### History bound

| Option | Description | Selected |
|--------|-------------|----------|
| Latest five | Show enough recurrence to be useful while keeping the dialog finite | ✓ |
| Latest three | Favor the shortest possible history | |
| Latest ten | Favor deeper history at greater reading cost | |

**User's choice:** Recommended default.
**Notes:** No pagination or infinite feed; disclose when older cycles are omitted.

### Timestamp style

| Option | Description | Selected |
|--------|-------------|----------|
| Absolute date and time | Give stable submitted and decided instants in the established locale | ✓ |
| Relative age only | Show phrases such as “two days ago” | |
| Date only | Omit time of day | |

**User's choice:** Recommended default.
**Notes:** Staff identity and internal rejection codes remain hidden.

---

## the agent's Discretion

- Exact supporting copy, iconography, token-level emphasis, and focus/spacing treatment.
- Server composition details that preserve one authority per gate and grouped, owner-scoped reads.
- Exact stale-pending label and threshold presentation within the shipped rescue/cooldown contract.
- Loading, empty, and error-state details within established host patterns.

## Deferred Ideas

- None introduced. Appeals remain backlog 999.6 and outside the deliberate-edit flow.
