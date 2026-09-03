# Phase 15: Auth, Profile & Transactional Email - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-24
**Phase:** 15-Auth, Profile & Transactional Email
**Areas discussed:** Email sender identity · Support address · Auth-screen shape · EMAIL-03 client access

**Format:** one batched turn, four questions, per the PM/SWE operating contract. Three of the four were
business facts only the PM could supply (domain ownership, support inbox existence, mail-client access);
one was a product-taste fork (auth layout). Recommendations were taken on the three that carried one.

---

## Email sender identity (EMAIL-01/03)

| Option | Description | Selected |
|--------|-------------|----------|
| Verify a real domain in Resend | Real sender identity, deliverable to anyone; needs a domain + DNS records. | |
| Stay on resend.dev — no domain yet | Shell ships fully; delivery limited to the account-owner inbox; sender swap later is one env var. | ✓ |
| Buy a domain now | Needed for launch eventually; adds DNS-propagation delay before EMAIL-03. | |

**User's choice:** No domain yet — stay on resend.dev.
**Notes:** Recorded as 15-CONTEXT D-160. Nothing may hard-code the sender beyond `EMAIL_FROM`'s reach.

---

## Support address (the standing D-64 slot)

| Option | Description | Selected |
|--------|-------------|----------|
| Provide the address now | One line in `site.ts`; lights up the Phase-13 support path and the new email footer. Must be a monitored inbox. | |
| Keep it null | Footer slot wired but empty; nothing false promised; still one line when real. | ✓ |

**User's choice:** Not yet — keep it null.
**Notes:** Recorded as 15-CONTEXT D-161. This is the second explicit confirmation of D-64's posture.

---

## Auth-screen shape (AUTHUI-01)

| Option | Description | Selected |
|--------|-------------|----------|
| Centered card, calm | One card, quiet background, wordmark above, coral on the primary only. Cheapest to hold at 320px/AA/keyboard/baseline. | ✓ |
| Split screen with brand panel | More presence, but a second responsive layout and no brand photography exists — placeholder art in a placeholder milestone. | |
| Overlay on the product page | Integrated look, but couples auth to a data-bearing page; slower first paint on screens that must feel instant. | |

**User's choice:** Centered card, calm.
**Notes:** Recorded as 15-CONTEXT D-162. All four screens share one composition.

---

## EMAIL-03 client access (multiselect)

**Available:** Gmail web ✓ · Gmail on Android ✓ · Apple Mail ✓ · **Outlook desktop ✗**

**Notes:** Recorded as 15-CONTEXT D-163. Because D-160 restricts delivery to the account-owner Gmail
inbox anyway, the three available clients can all open that same inbox — so three of EMAIL-03's four
clients close in-phase (dark mode via Apple Mail), and the Outlook-desktop quarter is DECLARED BLOCKED
on client access, following the visual-baselines convention. The requirement stays unticked until
Outlook is opened or the PM accepts the gap at phase close.

---

## Claude's Discretion

- One shell function composed by all 19 sends; subjects, recipients and call sites do not move.
- Preheader copy, text-wordmark rendering, plain-text derivation (from the same content as the HTML).
- Outlook-safe construction (tables, no flex/grid) even while Outlook verification is blocked.
- Auth loading/error states, profile pass composition, test strategy, file layout, plan count.

## Deferred Ideas

- AUTHFB-01/02 — backlog by standing choice; propose a roadmap amendment if the shell makes AUTHFB-01
  near-free, never absorb.
- Domain purchase + Resend verification + outside-recipient re-walk — when a domain exists.
- Outlook desktop verification — with the domain, or whenever the client is available.
- Avatar removal — Phase 16 (CROP-03).
