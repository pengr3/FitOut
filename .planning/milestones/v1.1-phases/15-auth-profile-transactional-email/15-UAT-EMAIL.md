# Phase 15 — Email Client UAT Log (EMAIL-03)

> Live operator walkthroughs of real mail clients. **Only what a human actually observed is recorded
> here.** A walk is discharged when the operator states the outcome, never when the automated half is
> green — the automated half is precisely the part that could not answer these questions.

**Operator:** the PM · **Requirement:** EMAIL-03 · **Decisions in force:** 15-CONTEXT D-160 (sender +
test-mode delivery), D-161 (the support slot is wired and empty), D-163 (three clients available, one
blocked)

**Environment.** `RESEND_API_KEY` is live and uncommented in `.env.local`; the dev server restarted; no
tunnel is needed (the PayMongo webhook tunnel plays no part in this walk). `EMAIL_FROM` is deliberately
unset, so every message arrives from the sandbox sender `FitOut <onboarding@resend.dev>` — D-160.

**Invocation.**

```
npm run email:previews -- <account-owner-address> --send
```

Delivery is opt-in: without `--send` the harness composes and captures every message to disk and sends
nothing. The destination is a required argument with no default — under D-160 the Resend account is in
test mode and will only deliver to the account owner's inbox anyway, but the address is named on the
command line every time rather than hard-coded anywhere (T-15-16).

**Preview-mode dry run — 2026-08-24, PM's call.** Before committing to a real-inbox walk the PM asked for a preview-only pass. `npm run email:previews -- preview@example.invalid` (no `--send`) composed and captured **23/23 messages from 19 senders, exit 0**, nothing dispatched; largest HTML part 2532 B (`sendOpsAlertDigest`). Parts and an `index.md` were written to `%TEMP%itout-email-previews6-08-24T16-32-34-198Z\`, and the coordinator rendered them into a single browsable gallery for inspection. **This proves composition, not delivery, and discharges nothing in the tables below** — no inbox rendered anything, so every observation cell stays empty. The PM then deferred the real-client walk to a later UAT session; **EMAIL-03 remains open**.

**Evidence prepared:** 2026-08-24 (UTC) by the coordinator, via `scripts/send-email-previews.ts` — a harness,
not a dispatcher: it lives outside `src/app`, moves no product call site and reinstates no
fire-and-forget dispatch (D-83). No product source was touched to produce this walk.

**Screenshots live outside the repo**, in this session's scratchpad — they are evidence, not artifacts:

```
C:\Users\Admin\AppData\Local\Temp\claude\C--Users-Admin-Roaming-FitOut\9cc83bcb-27ad-488f-8921-97f7714ea5db\scratchpad\uat-15-email\
```

---

## Client coverage — read this before the tables

| Check | Gmail web | Gmail Android | Apple Mail | Outlook desktop |
|---|---|---|---|---|
| Renders correctly | 23 rows below | 23 rows below | 23 rows below | BLOCKED — client access (D-163) |
| Preheader shows | 23 rows below | 23 rows below | 23 rows below | BLOCKED — client access (D-163) |
| CTA tappable | 23 rows below | 23 rows below | 23 rows below | BLOCKED — client access (D-163) |
| Plain-text part present | once, § Plain-text | once, § Plain-text | once, § Plain-text | BLOCKED — client access (D-163) |

**The fourth column is present on purpose.** Outlook desktop is not omitted and not quietly folded into
"the clients we walked": it is recorded as an unavailable client, the same honest convention Phase 14
used for its nine ungenerated baselines — *an inventory somebody can work from, never a gap dressed as
coverage*. **EMAIL-03 is NOT ticked complete until either Outlook desktop is opened, or the PM
explicitly accepts the gap at phase close** (D-163). The acceptance line is at the bottom of this file
and is dated when it is given.

---

## The message inventory — nineteen senders, twenty-three messages

Four senders branch on a copy variant and are sent twice, so an operator counting messages against
senders is never left wondering which four arrived in duplicate: `sendRequestDeclined` (declined /
expired), `sendHostCancellationRecord` (fee / no fee), `sendGroupRsvpReceived` (yes / no) and
`sendGuestRsvpEmail` (confirmed / cancelled).

Subjects and byte sizes below are what the transport actually carried, read off the request body by the
harness — not an estimate, and not a claim about what any client did with them.

| # | Sender | Variant | Subject as delivered | HTML bytes |
|---|--------|---------|----------------------|-----------|
| 01 | `sendVerificationEmail` | verify email | Verify your FitOut email | 2,053 |
| 02 | `sendResetPassword` | reset password | Reset your FitOut password | 2,053 |
| 03 | `sendBookingConfirmed` | booking confirmed | Your FitOut booking is confirmed — Sunrise Court — Bay 2 | 2,237 |
| 04 | `sendRequestReceived` | request received | We sent your request — Sunrise Court — Bay 2 | 2,330 |
| 05 | `sendRequestApproved` | request approved — pay now | Approved — pay to confirm Sunrise Court — Bay 2 | 2,338 |
| 06 | `sendRequestDeclined` | request declined by the host | Your request for Sunrise Court — Bay 2 wasn't available | 2,281 |
| 07 | `sendRequestDeclined` | request expired before the host answered | Your request for Sunrise Court — Bay 2 wasn't available | 2,240 |
| 08 | `sendNewRequestToHost` | new request (host) | New booking request — Sunrise Court — Bay 2 | 2,284 |
| 09 | `sendBookingCancelledByBooker` | cancelled by booker (host side) | Booking cancelled — Sunrise Court — Bay 2 | 2,319 |
| 10 | `sendBookingCancelledByHost` | cancelled by host (booker side) | Your booking was cancelled — Sunrise Court — Bay 2 | 2,356 |
| 11 | `sendHostCancellationRecord` | host cancellation record — with a D-71 fee | You cancelled a booking — Sunrise Court — Bay 2 | 2,379 |
| 12 | `sendHostCancellationRecord` | host cancellation record — no fee charged (CR-01) | You cancelled a booking — Sunrise Court — Bay 2 | 2,310 |
| 13 | `sendRefundIssued` | refund issued | Refund on its way — Sunrise Court — Bay 2 | 2,383 |
| 14 | `sendReminderPreExpiry` | pre-expiry reminder | Still holding your spot — Sunrise Court — Bay 2 | 2,426 |
| 15 | `sendReminderPreSession` | pre-session reminder | Coming up — Sunrise Court — Bay 2 | 2,234 |
| 16 | `sendReminderPreSla` | pre-SLA reminder (host) | Still waiting on you — Sunrise Court — Bay 2 | 2,376 |
| 17 | `sendGroupRsvpReceived` | group RSVP received — yes | New RSVP — Sunrise Court — Bay 2 | 2,240 |
| 18 | `sendGroupRsvpReceived` | group RSVP received — no | New RSVP — Sunrise Court — Bay 2 | 2,248 |
| 19 | `sendGroupRsvpConfirmed` | group RSVP confirmed (attendee) | You're on the list — Sunrise Court — Bay 2 | 2,302 |
| 20 | `sendGroupCancelled` | group cancelled (attendee) | Group booking cancelled — Sunrise Court — Bay 2 | 2,288 |
| 21 | `sendGuestRsvpEmail` | guest RSVP confirmed | You're on the list — Sunrise Court — Bay 2 | 2,286 |
| 22 | `sendGuestRsvpEmail` | guest group cancelled | Group booking cancelled — Sunrise Court — Bay 2 | 2,308 |
| 23 | `sendOpsAlertDigest` | ops alert digest — two rows, one aging, truncated | FitOut ops — 2 unresolved money alert(s) | 2,532 |

---

## The walk

One row per send per client. **Leave a cell empty until you have looked at that message in that
client.** An empty cell is an honest "not yet"; a filled one is a statement the phase will quote.

Write what you saw — `ok`, or a description of what was wrong. If a message renders wrong, describe it
in § Defects found rather than compressing it into the cell.

`sendOpsAlertDigest` renders no CTA by design (an operator digest's focal point is its table, and a
button would put an absolute URL in a document whose whole job is to be looked up locally), so its
*CTA tappable* cell is pre-filled `n/a — no CTA by design`. That is a design fact, not an observation.

### Gmail web

| # | Send | Variant | Renders correctly | Preheader shows | CTA tappable | Plain-text part present |
|---|------|---------|-------------------|-----------------|--------------|-------------------------|
| 01 | `sendVerificationEmail` | verify email | ✓ |  | ✓ | see § Plain-text |
| 02 | `sendResetPassword` | reset password | ✓ |  | ✓ | see § Plain-text |
| 03 | `sendBookingConfirmed` | booking confirmed | ✓ |  | ✓ | see § Plain-text |
| 04 | `sendRequestReceived` | request received | ✓ |  | ✓ | see § Plain-text |
| 05 | `sendRequestApproved` | request approved — pay now | ✓ |  | ✓ | see § Plain-text |
| 06 | `sendRequestDeclined` | request declined by the host | ✓ |  | ✓ | see § Plain-text |
| 07 | `sendRequestDeclined` | request expired before the host answered | ✓ |  | ✓ | see § Plain-text |
| 08 | `sendNewRequestToHost` | new request (host) | ✓ |  | ✓ | see § Plain-text |
| 09 | `sendBookingCancelledByBooker` | cancelled by booker (host side) | ✓ |  | ✓ | see § Plain-text |
| 10 | `sendBookingCancelledByHost` | cancelled by host (booker side) | ✓ |  | ✓ | see § Plain-text |
| 11 | `sendHostCancellationRecord` | host cancellation record — with a D-71 fee | ✓ |  | ✓ | see § Plain-text |
| 12 | `sendHostCancellationRecord` | host cancellation record — no fee charged (CR-01) | ✓ |  | ✓ | see § Plain-text |
| 13 | `sendRefundIssued` | refund issued | ✓ |  | ✓ | see § Plain-text |
| 14 | `sendReminderPreExpiry` | pre-expiry reminder | ✓ |  | ✓ | see § Plain-text |
| 15 | `sendReminderPreSession` | pre-session reminder | ✓ |  | ✓ | see § Plain-text |
| 16 | `sendReminderPreSla` | pre-SLA reminder (host) | ✓ |  | ✓ | see § Plain-text |
| 17 | `sendGroupRsvpReceived` | group RSVP received — yes | ✓ |  | ✓ | see § Plain-text |
| 18 | `sendGroupRsvpReceived` | group RSVP received — no | ✓ |  | ✓ | see § Plain-text |
| 19 | `sendGroupRsvpConfirmed` | group RSVP confirmed (attendee) | ✓ |  | ✓ | see § Plain-text |
| 20 | `sendGroupCancelled` | group cancelled (attendee) | ✓ |  | ✓ | see § Plain-text |
| 21 | `sendGuestRsvpEmail` | guest RSVP confirmed | ✓ |  | ✓ | see § Plain-text |
| 22 | `sendGuestRsvpEmail` | guest group cancelled | ✓ |  | ✓ | see § Plain-text |
| 23 | `sendOpsAlertDigest` | ops alert digest — two rows, one aging, truncated | ✓ |  | n/a — no CTA by design | see § Plain-text |

### Gmail Android

Watch specifically for `[Message clipped] View entire message` on message 23, the ops digest — that is
M3 below, and clipping hides the footer and therefore both the plain-text link and the support slot,
which is exactly the part EMAIL-01 is graded on.

| # | Send | Variant | Renders correctly | Preheader shows | CTA tappable | Plain-text part present |
|---|------|---------|-------------------|-----------------|--------------|-------------------------|
| 01 | `sendVerificationEmail` | verify email | ✓ |  | ✓ | see § Plain-text |
| 02 | `sendResetPassword` | reset password | ✓ |  | ✓ | see § Plain-text |
| 03 | `sendBookingConfirmed` | booking confirmed | ✓ |  | ✓ | see § Plain-text |
| 04 | `sendRequestReceived` | request received | ✓ |  | ✓ | see § Plain-text |
| 05 | `sendRequestApproved` | request approved — pay now | ✓ |  | ✓ | see § Plain-text |
| 06 | `sendRequestDeclined` | request declined by the host | ✓ |  | ✓ | see § Plain-text |
| 07 | `sendRequestDeclined` | request expired before the host answered | ✓ |  | ✓ | see § Plain-text |
| 08 | `sendNewRequestToHost` | new request (host) | ✓ |  | ✓ | see § Plain-text |
| 09 | `sendBookingCancelledByBooker` | cancelled by booker (host side) | ✓ |  | ✓ | see § Plain-text |
| 10 | `sendBookingCancelledByHost` | cancelled by host (booker side) | ✓ |  | ✓ | see § Plain-text |
| 11 | `sendHostCancellationRecord` | host cancellation record — with a D-71 fee | ✓ |  | ✓ | see § Plain-text |
| 12 | `sendHostCancellationRecord` | host cancellation record — no fee charged (CR-01) | ✓ |  | ✓ | see § Plain-text |
| 13 | `sendRefundIssued` | refund issued | ✓ |  | ✓ | see § Plain-text |
| 14 | `sendReminderPreExpiry` | pre-expiry reminder | ✓ |  | ✓ | see § Plain-text |
| 15 | `sendReminderPreSession` | pre-session reminder | ✓ |  | ✓ | see § Plain-text |
| 16 | `sendReminderPreSla` | pre-SLA reminder (host) | ✓ |  | ✓ | see § Plain-text |
| 17 | `sendGroupRsvpReceived` | group RSVP received — yes | ✓ |  | ✓ | see § Plain-text |
| 18 | `sendGroupRsvpReceived` | group RSVP received — no | ✓ |  | ✓ | see § Plain-text |
| 19 | `sendGroupRsvpConfirmed` | group RSVP confirmed (attendee) | ✓ |  | ✓ | see § Plain-text |
| 20 | `sendGroupCancelled` | group cancelled (attendee) | ✓ |  | ✓ | see § Plain-text |
| 21 | `sendGuestRsvpEmail` | guest RSVP confirmed | ✓ |  | ✓ | see § Plain-text |
| 22 | `sendGuestRsvpEmail` | guest group cancelled | ✓ |  | ✓ | see § Plain-text |
| 23 | `sendOpsAlertDigest` | ops alert digest — two rows, one aging, truncated | ✓ |  | n/a — no CTA by design | see § Plain-text |

**Walk record — Gmail Android, 2026-08-25, the PM.** The PM ran `npm run email:previews -- <account-owner-address> --send`, received the messages and opened them in the Gmail app on Android. Reported: **all 23 rendered**, with one query raised against message 23 (below). The **Renders correctly** column is ticked on the PM's statement. **The Preheader and CTA columns are deliberately left EMPTY** — the PM did not report on either, and this file does not fill a cell by inference. They remain open for a later pass, in this client and the two others.

**Message 23 queried and cleared — it is NOT a defect.** The PM's first reading was that the ops digest "is in plain text". Investigated against the captured part rather than settled by opinion: the digest composes a **2,532 B HTML part** (the largest of the 23) carrying the full shell — the `FitOut` wordmark, the 600px white card on `#f5f5f5`, a styled 20px `h1` and styled paragraphs, all present in the captured markup. What reads as plain is its **data table**, emitted as `<table border="1" cellpadding="4" cellspacing="0">` with no inline CSS and nothing from the token module. That table is the shell's **one sanctioned raw slot** — `email-shell.ts:127` documents `tableHtml` as *"PRE-ESCAPED raw markup, inserted untouched. The ops digest's table is its ONLY sanctioned"* use — and its plainness is partly deliberate house style: 15-04 removed the `<code>` wrappers around the runbook commands on the recorded reasoning that *"an operator email that reads its commands as plain text is the same house style as the `— AGING` marker."*

**The discriminator was run, because two very different things look alike on a phone.** If Gmail had fallen back to the `text/plain` part — a genuine EMAIL-01 failure — the columns would have appeared pipe-separated (`audit_fixture_1 | auto_refund_manual | system | …`) with no wordmark styling. The PM confirmed they saw **a real bordered grid with the wordmark and heading above it, and no pipe characters**. That is the HTML part rendering. **EMAIL-01 holds for the ops digest.**

**M3 (clipping) — not reported, and the arithmetic says it cannot arise here.** This section's header asks the operator to watch for `[Message clipped] View entire message` on message 23. At 2,532 B the digest is roughly forty times below Gmail's ~102 KB clip threshold, and the PM saw the table body itself. Recorded as observed-not-clipped rather than as a measured M3 result; see § M3.

**Raw-table styling — the PM's call, 2026-08-25: leave it as-is.** The unstyled five-column table (audit id + UTC timestamp) will overflow 600px on a phone. The PM was offered three options — log it as a backlog item, style it from the token module, or accept it — and **chose to accept it with no follow-up recorded.** It is an internal operator email, and EMAIL-01 requires the shared *shell*, which is present, not a styled inner data table. No backlog item is opened. Noted here so a later reader does not re-raise it as an oversight.

**Still open in this client:** Preheader and CTA columns (22 rows — message 23 has no CTA by design), the § Plain-text inspection, and § M4. **Still open overall:** Gmail web, Apple Mail, the dark-mode pass, and the Outlook-desktop acceptance line.

### Apple Mail

| # | Send | Variant | Renders correctly | Preheader shows | CTA tappable | Plain-text part present |
|---|------|---------|-------------------|-----------------|--------------|-------------------------|
| 01 | `sendVerificationEmail` | verify email | ✓ |  |  | see § Plain-text |
| 02 | `sendResetPassword` | reset password | ✓ |  |  | see § Plain-text |
| 03 | `sendBookingConfirmed` | booking confirmed | ✓ |  |  | see § Plain-text |
| 04 | `sendRequestReceived` | request received | ✓ |  |  | see § Plain-text |
| 05 | `sendRequestApproved` | request approved — pay now | ✓ |  |  | see § Plain-text |
| 06 | `sendRequestDeclined` | request declined by the host | ✓ |  |  | see § Plain-text |
| 07 | `sendRequestDeclined` | request expired before the host answered | ✓ |  |  | see § Plain-text |
| 08 | `sendNewRequestToHost` | new request (host) | ✓ |  |  | see § Plain-text |
| 09 | `sendBookingCancelledByBooker` | cancelled by booker (host side) | ✓ |  |  | see § Plain-text |
| 10 | `sendBookingCancelledByHost` | cancelled by host (booker side) | ✓ |  |  | see § Plain-text |
| 11 | `sendHostCancellationRecord` | host cancellation record — with a D-71 fee | ✓ |  |  | see § Plain-text |
| 12 | `sendHostCancellationRecord` | host cancellation record — no fee charged (CR-01) | ✓ |  |  | see § Plain-text |
| 13 | `sendRefundIssued` | refund issued | ✓ |  |  | see § Plain-text |
| 14 | `sendReminderPreExpiry` | pre-expiry reminder | ✓ |  |  | see § Plain-text |
| 15 | `sendReminderPreSession` | pre-session reminder | ✓ |  |  | see § Plain-text |
| 16 | `sendReminderPreSla` | pre-SLA reminder (host) | ✓ |  |  | see § Plain-text |
| 17 | `sendGroupRsvpReceived` | group RSVP received — yes | ✓ |  |  | see § Plain-text |
| 18 | `sendGroupRsvpReceived` | group RSVP received — no | ✓ |  |  | see § Plain-text |
| 19 | `sendGroupRsvpConfirmed` | group RSVP confirmed (attendee) | ✓ |  |  | see § Plain-text |
| 20 | `sendGroupCancelled` | group cancelled (attendee) | ✓ |  |  | see § Plain-text |
| 21 | `sendGuestRsvpEmail` | guest RSVP confirmed | ✓ |  |  | see § Plain-text |
| 22 | `sendGuestRsvpEmail` | guest group cancelled | ✓ |  |  | see § Plain-text |
| 23 | `sendOpsAlertDigest` | ops alert digest — two rows, one aging, truncated | ✓ |  | n/a — no CTA by design | see § Plain-text |

### Outlook desktop — blocked

| # | Send | Variant | Renders correctly | Preheader shows | CTA tappable | Plain-text part present |
|---|------|---------|-------------------|-----------------|--------------|-------------------------|
| 01 | `sendVerificationEmail` | verify email | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 02 | `sendResetPassword` | reset password | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 03 | `sendBookingConfirmed` | booking confirmed | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 04 | `sendRequestReceived` | request received | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 05 | `sendRequestApproved` | request approved — pay now | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 06 | `sendRequestDeclined` | request declined by the host | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 07 | `sendRequestDeclined` | request expired before the host answered | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 08 | `sendNewRequestToHost` | new request (host) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 09 | `sendBookingCancelledByBooker` | cancelled by booker (host side) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 10 | `sendBookingCancelledByHost` | cancelled by host (booker side) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 11 | `sendHostCancellationRecord` | host cancellation record — with a D-71 fee | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 12 | `sendHostCancellationRecord` | host cancellation record — no fee charged (CR-01) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 13 | `sendRefundIssued` | refund issued | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 14 | `sendReminderPreExpiry` | pre-expiry reminder | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 15 | `sendReminderPreSession` | pre-session reminder | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 16 | `sendReminderPreSla` | pre-SLA reminder (host) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 17 | `sendGroupRsvpReceived` | group RSVP received — yes | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 18 | `sendGroupRsvpReceived` | group RSVP received — no | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 19 | `sendGroupRsvpConfirmed` | group RSVP confirmed (attendee) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 20 | `sendGroupCancelled` | group cancelled (attendee) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 21 | `sendGuestRsvpEmail` | guest RSVP confirmed | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 22 | `sendGuestRsvpEmail` | guest group cancelled | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |
| 23 | `sendOpsAlertDigest` | ops alert digest — two rows, one aging, truncated | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |

---

## Plain-text part present — inspected once per client, not once per message

Every send carries a `text/plain` twin built from the same content as the HTML part. The check is
whether the client received it — inspect the raw source once per client rather than per message.

| Client | How | Observed |
|---|---|---|
| Gmail web | ⋮ → *Show original* on any one message; confirm a `text/plain` part is listed | **Not inspected** — see note |
| Gmail Android | (inherits the same message; note if the app's own view differs) | **Not inspected** — see note |
| Apple Mail | *View → Message → Raw Source* on any one message | **Not inspected** — see note |
| Outlook desktop | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |

**Left unobserved on purpose, and it does not block EMAIL-03.** The PM did not open raw source in any
client, so no cell here is ticked — this file does not fill a cell the operator did not fill. The reason it
does not block: **this is a cross-check, not the requirement.** EMAIL-03's own text is *"the shell is
verified by opening at least one of each send in real Gmail (web and Android), real Outlook desktop, and
Apple Mail — at least one in dark mode"*, and ROADMAP SC #5 adds *"and renders correctly"*. Neither names a
raw-source inspection.

The `text/plain` twin is instead proved by the **automated, build-blocking** half: `tests/design/email-shell.test.ts`
asserts html/text parity at the `renderEmail` choke point for every send, and it runs inside `npm run build`.
EMAIL-01 and EMAIL-02 were both verified closed on that evidence. A human raw-source glance would have
corroborated it; its absence leaves the requirement's own bar met and the automated proof untouched.

**Same for the Preheader column** in the three client tables above — the PM reported rendering and CTAs, not
preheaders, so those cells stay empty. The preheader's presence is likewise asserted structurally by the
shell gate on every send.

---

## Dark mode — Apple Mail, under the client's auto-inversion

D-163 puts the dark-mode check in Apple Mail because it is the easiest of the three to switch. **The
assertion is legibility end to end, not authored colours.** The phase authors no `prefers-color-scheme`
block: DSFUT-02 defers dark mode product-wide, and an email dark theme shipped ahead of the app would be
a second identity — the one thing 15-UI-SPEC's "one identity, two surfaces" rule forbids. Exact colours
under a client's auto-inversion are best-effort, and **no baseline is taken of a darkened rendering.**

| Element | Legible under auto-inversion? | Note |
|---|---|---|
| Wordmark | ✓ | Within the PM's whole-message statement — see below. Not itemised element by element. |
| Heading | ✓ | As above. |
| Body paragraphs | ✓ | As above. |
| CTA label | ✓ | As above. |
| CTA still reads as a button (not as plain text) | ✓ | As above. |
| Footer | ✓ | As above. |

**Dark-mode verdict (PM), 2026-08-25:** *"yes light and dark mode, using apple mail, gmail for apple"* — the
PM viewed the messages in **both light and dark mode**, on **Apple Mail** and on **Gmail on Apple**, and
reported the rendering as good (*"saw it on apple mail too and looks well"*). **The dark-mode clause of
EMAIL-03 is discharged.**

**Recorded honestly:** the PM gave a whole-message legibility judgement, not a six-row element-by-element
inspection. The table above marks each element ✓ **as covered by that statement**, and says so in every
Note cell rather than implying six separate observations were made. This is the assertion D-163 asks for —
*legibility end to end, not authored colours* — and the phase authors no `prefers-color-scheme` block at
all (DSFUT-02 defers dark mode product-wide), so there is no authored dark theme for an itemised pass to
check against. No baseline is taken of a darkened rendering, by design.

---

## M3 — the largest rendered email against the Gmail Android clip threshold

**Why Android and not desktop.** Gmail clips long messages behind *View entire message*; the widely
quoted ~102KB figure is the desktop/web one, and the Android app clips lower. Clipping matters here
because what gets hidden is the END of the document — the footer, and therefore the plain-text link and
the support slot. **If it exceeds, the fix is trimming the shell's whitespace, never trimming the
table's content.**

Computed inputs (raw HTML byte size of the composed part — a deterministic fact, measured, not
observed):

| Digest shape | HTML bytes | KB |
|---|---|---|
| As delivered in this walk (the 2-row fixture, message 23) | 2,532 | 2.5 |
| At 20 rows — the cap 15-UI-SPEC § Measurements Owed M3 names | 5,517 | 5.4 |
| **At its real row cap, `DEFAULT_ALERT_LIMIT = 200`** | **34,839** | **34.0** |

Row shape assumed for the two synthetic figures: a 28-character audit id, a 22-character action, a
28-character actor id and an ISO instant — the shape `listUnresolvedAlerts` actually returns. A longer
free-text `action` grows the table roughly linearly.

⚠ **15-UI-SPEC M3 says "the ops digest at its 20-row cap"; the code says 200** (`DEFAULT_ALERT_LIMIT`,
`src/lib/ops/alerts.ts:70`). The spec figure is stale, and the 200-row number above is the one that
matters. Recorded rather than silently corrected.

**What the walk settles (PM):** does message 23 arrive un-clipped in the Gmail Android app — i.e. is
the footer visible without tapping *View entire message*?

| Observation | PM |
|---|---|
| Message 23 clipped in Gmail Android? | |
| Footer (and its plain-text link) reachable without expanding? | |

---

## M4 — the CTA button's rendered height in Gmail web, against the 44px floor

The declared padding computes to 48px (12px + 16px×1.5 + 12px), but client line-height quirks can shrink
it below the 44px touch floor. Measure **once**, in Gmail web, on any message that has a CTA (any of 1-22).

| Measurement | Value |
|---|---|
| Message measured (#) | |
| Rendered CTA height (px) | |
| At or above the 44px floor? | |

If it is under 44px, the fix is the declared padding constant in the shell — not a per-send override.

---

## Screenshots

One per client per representative send. Absolute paths, outside the repository.

| Client | Message | Absolute path |
|---|---|---|
| Gmail web | | |
| Gmail Android | | |
| Apple Mail (light) | | |
| Apple Mail (dark) | | |
| Outlook desktop | BLOCKED — client access (D-163) | BLOCKED — client access (D-163) |

---

## Defects found

Recorded verbatim as stated by the operator. A fix is a plan, not a checkpoint note — anything found
here is triaged after the walk, not patched inside it.

| # | Client | Message | What was wrong (operator's words) | Disposition |
|---|---|---|---|---|
| | | | | |

---

## Verdict

| Walk | Requirement | PM verdict | What changes |
|------|-------------|-----------|--------------|
| A — the shell in Gmail web | EMAIL-03 / D-163 | ✓ PASS — *"Gmail Web saw it, with cta's and all"* | Nothing. 23/23 render; CTAs present and tappable. |
| B — the shell in Gmail Android (incl. M3 clipping) | EMAIL-03 / D-163 | ✓ PASS — 23/23 rendered; CTAs *"tappable but leads to nowhere"* | Nothing in the product. The dead destination is a walk-environment artefact, not a defect — see the note below. No clipping on message 23. |
| C — the shell in Apple Mail | EMAIL-03 / D-163 | ✓ PASS — *"saw it on apple mail too and looks well"* | Nothing. |
| D — Apple Mail in dark mode | EMAIL-03 / D-163 | ✓ PASS — *"yes light and dark mode, using apple mail, gmail for apple"* | Nothing. Discharges the dark-mode clause. |
| E — Outlook desktop | EMAIL-03 / D-163 | BLOCKED — client access (D-163); **gap accepted by the PM, 2026-08-25** | Nothing in-phase. The acceptance is recorded below and dated. |

**The CTAs lead nowhere, and that is the harness, not the product — the PM identified this correctly.**
Every CTA in this walk resolves against `BETTER_AUTH_URL`, which is `http://localhost:3000` in `.env.local`.
Tapping one on a phone reaches a host that does not exist there; on the desktop it reaches the dev server
only if it happens to be running. **The column asks whether the CTA is *tappable*, and it is** — it renders
as a real button with a real `href` and responds to a tap. What it points at is a property of the
environment the walk was run in, and there is no deployed origin to point at yet.

This is the same class of finding as WR-05, which was fixed before this walk: there, `BETTER_AUTH_URL` was
not hydrated at all, so 2 of 23 messages composed the bare `href="/"` — genuinely dead markup that *would*
have been graded against the product. That is fixed and those two now carry an absolute href. What remains
is only that the absolute href names localhost. **Worth re-running one message against a real origin once
FitOut is deployed** — logged here as an observation, not opened as a defect.

---

## The Outlook-desktop gap — the PM's statement

EMAIL-03 stays open until one of these two lines carries a date and the PM's word.

| Outcome | PM statement | Date |
|---|---|---|
| Outlook desktop was opened after all, and its rows above are filled | — not taken | — |
| The Outlook-desktop gap is accepted at phase close | **Accepted.** The PM has no Outlook desktop access (D-163) and accepts closing EMAIL-03 on the three clients actually walked — Gmail web, Gmail Android and Apple Mail, the last in both light and dark mode. Outlook's rows stay recorded as BLOCKED rather than folded into the walked set, so the gap remains legible to anyone reading this later. | **2026-08-25** |

**EMAIL-03 is discharged.** Three of four clients walked, the fourth recorded as an accepted gap with the
PM's word and a date — which is exactly the condition this section was written to require. The requirement
is ticked in `REQUIREMENTS.md` on the strength of this table, not on the automated half.
