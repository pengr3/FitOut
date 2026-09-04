---
created: 2026-09-01T11:56:40.872Z
title: Reveal host contact details in ops queue
area: ops
files:
  - src/lib/ops/review-queue.ts:101-124
  - src/lib/ops/review-queue.ts:232-290
  - src/components/ops/ops-queue-row.tsx:273-306
  - src/lib/db/schema.ts:48
  - src/lib/audit.ts
---

## Problem

**Raised by the PM on 2026-09-01: "in /ops, host details are really minimal — no way to contact them
regarding their listing, no number, no email. So if ops has a question for the host there is no way to
contact them. Messaging between parties is not yet allowed — a future feature for sure — but for now
let's have the host's contact information displayed for easier comms."**

Confirmed. Today the ops **host** row shows exactly four facts — Name, Account since, Email confirmed,
Listings waiting — plus the submitted-at wait clock (`src/lib/ops/review-queue.ts:101-124`). The
**listing** row shows the host's name and current verification status and nothing else. **No email
address and no phone number appear anywhere in `/ops`.**

The data exists and the change is small: `user.email` (with its `email_verified` flag, already
selected) and `user.phone` (`src/lib/db/schema.ts:48`). Both SELECTs in `review-queue.ts` name every
column explicitly — the projection type's docblock literally says *"NOTHING ELSE"* — so this is two
column additions plus a `<dl>` change in `ops-queue-row.tsx`.

⚠ **Phone is optional, self-entered and never verified** (`src/app/actions/profile.ts`), and is not
required anywhere today. Most hosts will have none. See the sibling todo — the SWE assumption there is
that phone becomes required at verification submission, which is what would actually make this field
useful rather than usually-empty.

### The friction is policy, not plumbing

D-72 forbids an email address in `audit.meta`, in any log line, in any column. That rule is about
**durable storage and log surfaces**, not about what an authenticated staff member may read on a
404-cloaked screen. So this is a "yes, and write the boundary down" rather than a conflict — but the
boundary does need writing down, because the phase drew it deliberately and a future reader will
otherwise read the addition as a violation.

## Decisions (PM, 2026-09-01 — ANSWERED, do not re-ask; record as D-numbers at discuss time)

### PM-E — Reveal-on-click, with an audit row per reveal.

Chosen over always-visible and over the email-always/phone-on-reveal split.

- Email and phone sit behind a **"Show contact"** control on the row; they are not rendered in the
  open.
- **Each reveal writes an `audit` row** — authenticated `actorId` from `requireStaff()`, the target
  host's **id**, and an action name. This makes staff access to host PII non-repudiable, which is the
  whole reason to prefer reveal over always-visible.
- ⚠ **The audit row must carry ids and enum-shaped values only — never the email itself** (D-72). The
  row records *that* staff member X looked at host Y's contact details, never *what* those details
  were. `src/lib/ops/grant.ts`'s header states this rule and its consequence; follow it exactly.

Details to settle at discuss:

- **Where the reveal lives.** The PM picked the host-row option, but ops questions are usually about a
  specific *listing*. Recommend putting the same reveal on the **listing** row too — the contact needs
  to be where the subject of the question is. Flag if that widens scope unacceptably.
- **`mailto:` or plain text.** A `mailto:` link leaks nothing and saves a copy-paste. Recommend
  `mailto:` for email, plain text for phone (`tel:` is meaningless on a desktop ops console).
- **Missing phone** renders as an explicit "Not provided", never a blank row. An empty `<dd>` reads as
  a rendering bug; the row's existing `addressOf()` helper already makes this exact choice for an
  unfinished address ("No address on the listing") and is the precedent to copy.
- ⚠ **A fact block, not a "Contact host" button.** The ops shell deliberately mounts no notification
  bell because ops notifications do not exist, and `ops-queue-row.tsx` is asserted TERMINAL — zero
  anchors, zero link-role elements — by its own test. An affordance implying in-app messaging exists
  is the same defect one level up. A `mailto:` is a hand-off to the operator's own mail client, not a
  FitOut messaging channel, and the copy should not suggest otherwise.
- The reveal must not break the row's single-tree-at-every-width property or its terminal-ness
  assertions. Check `tests/` for the row's existing anchor/link-role assertions before adding a
  `mailto:` anchor — that assertion may need an explicit, documented exemption rather than deletion.

## Solution

TBD at plan time. Shape:

1. Add `email` and `phone` to both projections in `src/lib/ops/review-queue.ts` (host branch and
   listing branch), naming the columns explicitly as the file already does.
2. A reveal control in `ops-queue-row.tsx` whose action is a server action under `requireStaff()`
   that returns the contact values **and writes the audit row in the same call** — so the reveal
   cannot happen without the record. Do not ship the values in the initial RSC payload behind a
   CSS/`hidden` toggle: that is a reveal with no audit, and the payload is readable.
3. Extend `tests/design/ops-guard-coverage.test.ts`'s AST walk to cover the new action.

## Related

- Depends-on (soft): the phone-required-at-submission assumption in
  `2026-09-01-host-verification-submission-path-and-listing-creation-gate.md`. Without it this field
  is usually empty.
- Sibling: `2026-09-01-ops-staff-management-surface-and-invite-flow.md`.
- Future: in-app messaging between parties. Explicitly NOT this todo — this is the stopgap the PM
  asked for, and the copy must not pre-announce the feature.
