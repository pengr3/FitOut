# Phase 20: Ops Gets Its Own Front Door — the `ops.` Host, Sign-In & Staff Onboarding - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-09-08
**Phase:** 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboarding
**Areas discussed:** Ops sign-in experience, Invitation lifecycle, Existing-account conflicts, Roster and revocation flow

---

## Ops sign-in experience

| Decision point | Options presented | Selected |
|----------------|-------------------|----------|
| Sign-in methods | Email/password only; email/password + Google; Google only | **Email/password only** |
| Visual relationship to marketplace auth | Clearly ops but structurally familiar; nearly identical; fully distinct console styling | **Clearly ops, structurally familiar** |
| Secondary routes | Password recovery + Back to FitOut; password recovery only; no secondary links | **Password recovery only** |
| Successful destination | Safe requested ops path, else `/ops`; always `/ops`; always `/ops/staff` | **Safe requested ops path, else `/ops`** |
| Valid credentials without staff access | Neutral refusal and clear session; cloaked `/ops` 404; name the non-staff role | **Neutral refusal and clear the ops-host session** |
| Recovery host | Entirely on ops; marketplace recovery; request on ops/reset on marketplace | **Entirely on the ops host** |
| Copy tone | Plain and explicit; minimal; restricted-system warning | **Plain and explicit** |
| Sign-out destination | Ops sign-in with confirmation; ops sign-in silently; separate signed-out page | **Ops sign-in with confirmation** |

**User's choices:** Email/password only; reuse the familiar auth-card structure with distinct FitOut
Ops identity; show password recovery but no marketplace exit or signup; keep all recovery on the ops
host; return safely to the requested ops route; neutrally refuse and clear non-staff sessions; use
plain staff-specific copy; confirm explicit logout on the ops sign-in page.

**Notes:** The user requested a second set of sign-in questions before closing the area. Google and
marketplace signup language were deliberately left off the staff entrance even though the existing
marketplace login ships both.

---

## Invitation lifecycle

| Decision point | Options presented | Selected |
|----------------|-------------------|----------|
| Lifetime | 24 hours; 72 hours; 7 days | **24 hours** |
| Pending controls | Resend + cancel; resend only; cancel only | **Resend and cancel** |
| Recipient sequence | One focused setup form; two-step confirmation; full marketplace signup | **One focused setup form** |
| Inactive-link behavior | One identical neutral state; name the exact reason; global 404 | **One identical neutral state** |

**User's choices:** Invitations expire after 24 hours. Resend rotates and invalidates the old link;
Cancel invalidates without replacement. The active recipient sees one form with fixed email, name and
password, and acceptance occurs only on submit. Expired, cancelled, used, malformed and unknown links
all render the same neutral inactive state.

**Notes:** Single-use at the database and no acceptance on GET were already locked by the roadmap and
were not reopened. The neutral inactive state preserves useful recovery guidance without becoming a
token-existence oracle.

---

## Existing-account conflicts

| Decision point | Options presented | Selected |
|----------------|-------------------|----------|
| Invite targets an existing booker/host | Refuse and require separate staff email; explicit UI conversion; automatic capability removal | **Refuse and require a separate staff email** |
| Invite targets active staff | Refuse as already staff; treat as resend; silently succeed | **Refuse as already staff** |
| Invite targets an active pending invite | Refuse and point to the existing row; automatically resend; create another invitation | **Refuse and point to the existing row** |
| CLI grant targets a capability-bearing account | Explicit atomic conversion flag; always refuse; automatic capability removal | **Explicit atomic conversion flag** |

**User's choices:** The ordinary invitation path never converts marketplace users. Existing
booker/host accounts must use a separate staff email; active staff and active pending invites are
refused with useful operator feedback. `ops:grant` refuses by default but retains a deliberate
break-glass conversion flag that atomically removes both marketplace capabilities and grants staff.

**Notes:** An assistant summary mentioned the explicit CLI flag before it had been asked. The error
was called out, the decision was presented as its own question, and the user then explicitly selected
the flag-gated conversion option.

---

## Roster and revocation flow

| Decision point | Options presented | Selected |
|----------------|-------------------|----------|
| Roster structure | Separate active/pending sections; active staff only; one combined list | **Separate active and pending sections** |
| Row detail | Operational essentials; email only; full account detail | **Operational essentials** |
| Confirmation policy | Confirm revoke/cancel, resend immediately; confirm everything; confirm revoke only | **Confirm revoke and cancel; resend immediately** |
| Protected revoke | Visible disabled control + reason; allow click then refuse; hide control | **Visible disabled control with reason** |
| Ordering | Active oldest-first/pending newest-first; both newest-first; alphabetical | **Active oldest-first; pending newest-first** |
| Success feedback | Persistent in-page confirmation; toast; no explicit confirmation | **Persistent in-page confirmation** |
| Empty pending state | Visible neutral sentence; hide section; large empty-state card | **Visible neutral sentence** |
| In-scope placement | Below the queue; side-by-side; behind a disclosure | **Below the operational queue** |

**User's choices:** Staff management is a clearly separated panel below the operational queue on the
one `/ops` page. Active staff and pending invites have separate sections, purposeful ordering and only
the details needed to act. Revoke and Cancel require confirmation; Resend runs immediately. Outcomes
persist in-page. Protected revocations are explained before action and independently refused by the
server with the same reason. The pending section remains visible when empty.

**Notes:** During the second roster question set, the user proposed a more complete role structure
with `super_admin` as the only inviter and a dedicated staff-management page. Because this adds a
permission model and conflicts with the phase's locked one-role/one-`/ops`-page boundary, it was
preserved as a deferred future capability. The in-scope panel was chosen as an evolvable first step.

---

## the agent's Discretion

The user did not choose a generic “you decide” option. CONTEXT.md leaves only implementation-detail
discretion: exact component composition and wording within the selected behavior, invitation-state
representation on the existing schema, and exact audit/CLI flag names.

## Deferred Ideas

- Design a tiered ops authorization model with a `super_admin` role as the only role allowed to
  invite staff.
- Promote staff management from the `/ops` panel into its own page when that authorization model is
  planned as a separate capability phase.
