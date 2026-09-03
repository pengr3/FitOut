---
phase: 15-auth-profile-transactional-email
plan: 05
subsystem: tooling
tags: [email, uat, harness, script, email-03, manual-verification]
status: CHECKPOINT — awaiting the PM's real-client walk (Task 3 of 3)

# Dependency graph
requires:
  - phase: 15-auth-profile-transactional-email
    plan: 04
    provides: "tests/helpers/email-fixtures.ts — one totality-typed argument list per exported sender"
  - phase: 15-auth-profile-transactional-email
    plan: 03
    provides: "src/lib/email.ts — every sender composing renderEmail; send(to, subject, html, text)"
  - phase: 15-auth-profile-transactional-email
    plan: 01
    provides: "src/lib/email-shell.ts — renderEmail, the preheader, the plain-text twin"
provides:
  - "scripts/send-email-previews.ts — one command puts one of each send into a named inbox, from outside the product's dispatch graph"
  - "npm run email:previews — the one added package.json line"
  - "15-UAT-EMAIL.md — the empty EMAIL-03 checklist, with Outlook desktop visible as an unavailable client"
  - "the M3 input measured rather than guessed: the ops digest at its real 200-row cap is 34,839 B"
affects: [15-11, any phase that adds a transactional send and needs to see it in an inbox]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A preview harness reads the SAME fixture module the injection probe reads — one owner, two readers, never a forked argument list"
    - "A script that must observe what a fire-and-forget transport swallowed wraps globalThis.fetch and reads the request body, rather than counting resolved promises"
    - "Irreversible delivery is opt-in (--send); the default mode runs the identical code path and forwards nothing"

key-files:
  created:
    - scripts/send-email-previews.ts
    - .planning/phases/15-auth-profile-transactional-email/15-UAT-EMAIL.md
  modified:
    - package.json

key-decisions:
  - "Delivery is opt-in behind --send; PREVIEW is the default because the default should never be the irreversible one. The destination stays a required argument with no default either way (T-15-16)"
  - "The harness OBSERVES the transport instead of trusting it: send() swallows provider errors, so a harness counting resolved promises would print '23 sent' over an empty inbox"
  - "The email module is reached through a DYNAMIC import: it memoises RESEND_API_KEY at module-evaluation time, and a static import would hoist above the harness's own environment setup"
  - "23 messages, not the plan's 20: four senders carry two fixture calls each, not one"
  - "The M3 byte sizes are COMPUTED and labelled as computed; the clipping observation they feed is left to the operator"

requirements-advanced: [EMAIL-03]
requirements-completed: []

# Metrics
duration: ~40 min (23:52 → 00:32 local, 2026-08-24/25)
completed: null
---

# Phase 15 Plan 05: The EMAIL-03 Harness and Walk Record Summary

**One command now composes all twenty-three messages the nineteen senders produce and puts them in a
named inbox — reading the same fixture argument lists the injection probe reads, from outside the
product's dispatch graph — and `15-UAT-EMAIL.md` is the empty checklist the PM works through, in which
the one unavailable client is visible as an unavailable client rather than quietly absent.**

**This plan is NOT complete.** Tasks 1 and 2 are done and committed. Task 3 is the checkpoint: the
real-client walk itself, which is a human act by construction. EMAIL-03 is **not** ticked.

## Task Commits

| Task | Name | Commit | Files |
| ---- | ---- | ------ | ----- |
| 1 | The dev-only preview harness | `7ca2aaa` (feat) | `scripts/send-email-previews.ts`, `package.json` |
| 1 | …its TS narrowing fix | `c4b2ac5` (fix) | `scripts/send-email-previews.ts` |
| 1 | …the typed sender lookup | `28b2da0` (refactor) | `scripts/send-email-previews.ts` |
| 2 | The walk checklist artifact | `8b20142` (docs) | `15-UAT-EMAIL.md` |
| 3 | The real-client walk | — | **CHECKPOINT — awaiting the PM** |

## What shipped

### Task 1 — `scripts/send-email-previews.ts`

`npm run email:previews -- <address> [--send]`. It imports the senders from `@/lib/email` and the
argument lists from `tests/helpers/email-fixtures.ts` — the module 15-04 built for exactly two readers —
substitutes the supplied address into each call's declared `recipient` path, invokes every call of every
fixture with a spacing delay, and prints an ordered list of sender · variant · subject · byte size the
operator can hold against the inbox. No data layer at all: `grep -c 'postgres'` is 0.

**It is a harness, not a dispatcher (D-83, T-15-15).** It lives outside `src/app`, moves no product call
site and reinstates no fire-and-forget dispatch; the header says so in the register `ops-alerts.ts` uses
for its own boundary. `grep -cE '\bvoid send'` is 0.

Four things the plan did not specify, each argued in the file's header:

1. **Delivery is opt-in.** Without `--send` the harness runs in PREVIEW mode: same code path, every
   message captured, the HTML and text parts written to a timestamped directory **outside the
   repository**, and nothing forwarded — in preview mode any outbound call, to the provider or
   anywhere else, throws. The destination remains a required argument with no default in both modes
   (T-15-16), so the two guards compose rather than replace one another.
2. **The transport is observed, not trusted.** `send()` in `src/lib/email.ts` logs `resend error` and
   returns: it resolves identically whether the provider accepted one message or rejected all
   twenty-three. A harness that counted resolved promises would report a clean run over an empty
   inbox — the precise shape of "absence dressed as coverage" this plan exists to forbid. So the
   harness wraps `globalThis.fetch`, reads the composed payload on the way out (subject, recipient,
   both parts) and the provider's status on the way back, reports per message, and **exits non-zero if
   any message did not reach the provider**, naming it.
3. **The email module is imported dynamically.** `src/lib/email.ts` reads `RESEND_API_KEY` at
   module-evaluation time. A static import is hoisted above every statement in the script, so the
   module would capture the environment *before* the harness populated it and take the dev-fallback
   branch forever. `tsx` does not load `.env.local` — the same fact `ops-alerts.ts` records for the
   database URL, with a sharper edge because this read is memoised. The harness therefore parses an
   **allow-listed two keys** (`RESEND_API_KEY`, `EMAIL_FROM`) out of `.env.local` without overriding
   the shell, and only then `await import("@/lib/email")`. A type-only
   `import type * as EmailSenders from "@/lib/email"` (erased at runtime) keeps the sender lookup a
   typed index into the module's real exports.
4. **Twenty-three messages, not twenty.** The plan expected 20 for 19 senders on the assumption that
   only `sendGuestRsvpEmail` branches. The fixture module actually carries two calls for **four**
   senders — `sendRequestDeclined` (declined / expired), `sendHostCancellationRecord` (fee / no fee),
   `sendGroupRsvpReceived` (yes / no), `sendGuestRsvpEmail` (confirmed / cancelled). The harness sends
   every call of every fixture and names the four in its header and its output, which is the plan's
   intent generalised rather than its arithmetic reproduced.

Measured, preview mode, 2026-08-24: **23/23 composed and captured from 19 senders, exit 0**, zero
network calls.

### Task 2 — `15-UAT-EMAIL.md`

356 lines, on `14-UAT-LOG.md`'s conventions: the discharge rule first (a walk is discharged when the
operator states the outcome, never when the automated half is green), then the header block, then the
statement that screenshots live outside the repository with the absolute scratchpad path quoted.

- **The message inventory** — 23 rows carrying the subject and HTML byte size the transport actually
  carried, read off the request body. A fact, not an observation.
- **The walk** — one row per send per client, four columns (*renders correctly · preheader shows · CTA
  tappable · plain-text part present*), across Gmail web, Gmail Android and Apple Mail. **Every
  observation cell is empty**: `grep -c '✓\|PASS'` returns 0. The digest's *CTA tappable* cell is
  pre-filled `n/a — no CTA by design`, because it renders none — a design fact stated so the operator
  does not record a missing button as a defect.
- **Outlook desktop is present as a column AND as 23 rows**, every cell reading
  `BLOCKED — client access (D-163)` — 30 occurrences in the file. The prose states that EMAIL-03 is not
  ticked until Outlook is opened or the gap is explicitly accepted, and the acceptance line at the foot
  of the file has a date column that is filled when the statement is given.
- **Plain-text** is checked once per client, not once per message — 15-UI-SPEC § EMAIL-03's own
  instruction, so the 23 rows point at that section instead of asking for 69 identical inspections.
- **Dark mode** — the Apple Mail walk under client auto-inversion, asserting *legibility* of wordmark,
  heading, body, CTA label and footer and that the CTA still reads as a button. It states that no
  baseline is taken of a darkened rendering and that the phase authors no `prefers-color-scheme` block,
  because DSFUT-02 defers dark mode product-wide and an email dark theme ahead of the app would be a
  second identity.
- **M3 and M4**, then the screenshot table, a defects table, and the `Walk | Requirement | PM verdict |
  What changes` verdict table with every verdict cell empty.

### M3 — measured rather than left to the walk

The byte size is a deterministic fact, so the harness and one throwaway measurement settle it; the
*clipping* half stays with the operator. Recorded in the log as computed:

| Digest shape | HTML bytes |
| --- | --- |
| The 2-row fixture, as delivered in this walk | 2,532 |
| At 20 rows | 5,517 |
| **At its real cap, `DEFAULT_ALERT_LIMIT = 200`** | **34,839 (34.0 KB)** |

Comfortably under Gmail's ~102KB desktop clip threshold, but the Android app clips lower and that is
the question the walk answers. ⚠ **15-UI-SPEC § Measurements Owed M3 says "the ops digest at its 20-row
cap"; `src/lib/ops/alerts.ts:70` says 200.** The spec figure is stale. Recorded in the UAT log rather
than silently corrected — the 200-row number is the one that matters.

## Verification

| Check | Result |
| ----- | ------ |
| `npx tsc --noEmit` | exit 0 |
| `npm run build` (`lint && test:design && next build`) | exit 0 — 54 files, **908 passed / 3 skipped**, 0 lint errors |
| Lint warnings attributable to the new script | **0** (the 25 warnings are pre-existing and elsewhere) |
| `npm run email:previews -- <addr>` (preview mode) | **23/23 composed and captured from 19 senders**, exit 0, no network |
| `npx tsx scripts/send-email-previews.ts` with no address | exit **1** with the usage message |
| `git diff package.json` | exactly **one** added line |
| `node -e "…scripts['email:previews']"` | `tsx scripts/send-email-previews.ts` |
| `grep -c 'postgres' scripts/send-email-previews.ts` | **0** — no data layer |
| `grep -c 'D-83' scripts/send-email-previews.ts` | **3** |
| `grep -cE '\bvoid send' scripts/send-email-previews.ts` | **0** |
| `grep -c 'email-fixtures' scripts/send-email-previews.ts` | **3** — the shared module, not a fork |
| `grep -c 'from "@/lib/email"' scripts/send-email-previews.ts` | **1** |
| `grep -c 'BLOCKED — client access' 15-UAT-EMAIL.md` | **30** |
| `grep -c '✓\|PASS' 15-UAT-EMAIL.md` | **0** — the phase self-certifies no row |
| Product source touched | **none** — `src/` is byte-identical to `a980b4d` |

## Deviations from Plan

### Auto-fixed issues

**1. [Rule 2 — Safety] Real delivery was put behind an explicit `--send` flag.**

- **Found during:** Task 1, writing the harness.
- **Issue:** the plan's design has one guard against unintended delivery — a required destination
  argument. `RESEND_API_KEY` is live in `.env.local`, so the first correct invocation is also
  irreversible, and there is no dry way to check the script itself works before spending real sends on
  a real mailbox.
- **Fix:** PREVIEW is the default. `--send` opts in. Preview mode installs a synthetic key so the
  module builds a client, intercepts every request, writes the parts to a directory outside the
  repository, forwards nothing, and throws on any attempted network call. The required-destination
  guard is unchanged and both apply in both modes.
- **Consequence for the walk:** the operator's command carries `--send` — recorded in
  `15-UAT-EMAIL.md`'s invocation block and in the checkpoint message.
- **Commit:** `7ca2aaa`.

**2. [Rule 1 — Bug] The harness reports what the transport actually did.**

- **Found during:** Task 1, reading `send()` at `src/lib/email.ts:96`.
- **Issue:** `send()` swallows provider errors — it resolves identically whether the message was
  accepted or rejected. A harness that awaited the senders and printed a count would have reported a
  successful run over an empty inbox, and the operator would have gone looking for messages that were
  never accepted.
- **Fix:** the `globalThis.fetch` wrapper described above; per-message outcome, and a non-zero exit
  naming every message that did not reach the provider.
- **Commit:** `7ca2aaa`.

**3. [Rule 3 — Blocking] A static import of `@/lib/email` cannot work here.**

- **Found during:** Task 1.
- **Issue:** the module memoises `RESEND_API_KEY` at evaluation time and `tsx` does not load
  `.env.local`; a hoisted static import would permanently take the dev-fallback branch.
- **Fix:** allow-listed env load, then `await import("@/lib/email")`, with a type-only static import
  retained so the sender lookup stays typed. Both are written up in the file header as TRAP A.
- **Commit:** `7ca2aaa`, typing refined in `28b2da0`.

**4. [Rule 1 — Bug] The message count is 23, not 20.**

- **Found during:** Task 1, counting the fixture calls.
- **Issue:** the plan states 20 messages for 19 senders. Four senders carry two fixture calls, not one.
- **Fix:** the harness sends every call of every fixture, names the four two-variant senders in its
  header and its output, and the checklist is built for 23 rows per client.
- **Commit:** `7ca2aaa` / `8b20142`.

**5. [Rule 3 — Blocking] Seven `TS2339`s against `never`.**

- **Found during:** Task 1 verification.
- **Issue:** TypeScript's control-flow analysis does not know that awaiting a sender runs the fetch
  wrapper, so reading the module-level observation bindings directly left them narrowed to the `null`
  they were reset to a line earlier.
- **Fix:** the three observations are read through functions, which return the declared type. The
  reason is written beside them so a later reader does not "tidy" them back to direct reads.
- **Commit:** `c4b2ac5`.

### Stated, not incidental

- **`15-UI-SPEC` M3's "20-row cap" is stale** against `DEFAULT_ALERT_LIMIT = 200`. Recorded in
  `15-UAT-EMAIL.md` § M3 with both numbers. No source was changed.
- **The M3 byte sizes are pre-filled in the checklist.** They are computed facts, labelled as computed;
  the observation they feed — whether Gmail Android clips message 23 — is left empty for the operator.
  No client observation cell is pre-filled anywhere in the file.

## Requirements

**EMAIL-03 is NOT complete and is not ticked.** Its text requires opening real Gmail (web and Android),
real Outlook desktop and Apple Mail, at least one in dark mode. This plan produced the two things that
make that walk possible; nothing here proves an inbox renders anything. Under D-163, Outlook desktop is
blocked on client access, so EMAIL-03 cannot close until the PM either opens it or explicitly accepts
the gap at phase close — and that statement, with its date, is the last table in `15-UAT-EMAIL.md`.

## Known Stubs

None. `15-UAT-EMAIL.md` ships with empty observation cells by design — that is the artifact's contract,
not an unfinished implementation, and the file says so in its own opening paragraph.

## Threat Flags

None. No new network endpoint, auth path or schema change. The one new outbound surface — a script that
can dispatch mail — is inside the `<threat_model>`'s declared boundaries and carries both of its
declared mitigations (T-15-15: outside `src/app`, no reinstated call site, D-83 cited in the header;
T-15-16: destination is a required argument with no default, plus the added opt-in gate).

## Notes for the verifier

- **Phase completion is not claimed, and neither is plan completion.** Task 3 is an open checkpoint.
- The ROADMAP phase checkbox and phase status were not touched.
- Preview artifacts (the 23 `.html`/`.txt` parts and an `index.md`) are written outside the repository,
  under the system temp directory; the run that produced this summary's numbers is at
  `C:\Users\Admin\AppData\Local\Temp\fitout-email-previews\2026-08-24T15-56-35-471Z\`.
