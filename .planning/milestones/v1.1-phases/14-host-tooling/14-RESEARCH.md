# Phase 14: Host Tooling — Research

**Researched:** 2026-08-23
**Domain:** Restyling five shipped host surfaces on an existing, gated design system. One genuinely new
read (the venue-local "today" agenda). Zero new packages, zero migrations.
**Confidence:** HIGH on everything measured in this session (marked `[VERIFIED: …]`); MEDIUM where the
answer needs a rendered route this box cannot reach.
**Tree measured at:** `e59f10e` (dev), working tree clean except `.planning/STATE.md` and `.claude/`.

> ⚠ **Prose safety.** This file lives in `.planning/`, which is outside every scanned tree
> (`leak.test.ts` reads `src/` only; `globals.css`'s `source("../")` narrows Tailwind's content scan to
> `src/`) — so class names are **quoted** here for precision. **That licence does not travel.** Any
> sentence copied from this file into a source comment must name tokens descriptively.
> `[VERIFIED: config/design-leak-patterns.mjs:205 LEAK_SCAN_GLOBS; tests/design/leak.test.ts:139;
> src/app/globals.css:1-20]`

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

> **Namespace.** Phase 13 ran 13-CONTEXT D-60…D-103; Phase 13.1 ran D-104…D-113. This phase starts at
> **D-140** to clear PROJECT.md's own D-127…D-138. Collisions with PROJECT.md numbering are pre-existing;
> always qualify a citation as **"14-CONTEXT D-140"** or **"PROJECT D-140"**.

#### The dashboard is an agenda, not a scoreboard (HFLOW-03)

- **D-140: `/host` leads with TODAY'S REAL SESSIONS — a list, not counts.**
  Each row: booker first name, space title, venue-local window, status. Beneath it, three compact signal
  rows — requests owed, payout state, and the published-without-hours signal — each linking to the page
  that already owns it. *PM-selected over a counts-and-links tile grid: a host with three sessions today
  must be able to see WHO is coming without a second click, which is the only reading of HFLOW-03's own
  success criterion that a tile grid does not satisfy.*
  Cost accepted: **one new owner-scoped read**. It is a read, not a write, and it changes no logic.

- **D-141: "Today" is resolved in VENUE-LOCAL time, from the DATABASE clock.**
  Never `new Date()` in the browser, never the server's local zone. The listing's `timezone` column is the
  authority — the same authority `composeWhenLabelShort` already renders against — and `readDbNow(db)` is
  read ONCE per request and threaded, exactly as `/host/requests` already does so a countdown and a badge
  can never disagree about what time it is. A host whose listings span two zones gets each row labelled in
  its own venue's time; **the day-boundary question is a planning question, and the answer must be written
  down and tested, not left to whichever `date-fns` call is convenient.**

- **D-142: A quiet day shows the NEXT upcoming session — never a dead screen.** *(Claude's discretion,
  recorded rather than asked.)*
  With nothing today, the agenda block reads *"Nothing today — next: Sat, Aug 29 · 10:00 AM · Court A"* and
  stays useful. With no upcoming bookings at all, it becomes the setup signals only and must read as
  **set up and waiting**, not as broken — the same rule HFLOW-01 states for inbox-zero, applied to the
  dashboard. This costs one extra bounded read (the soonest future session); if planning finds it cannot be
  had without a second query pass, the fallback is the calm no-sessions state, never an empty box.

- **D-143: The greeting survives but stops being the subject of the page.**
  *"Your hosting, {firstName}"* becomes a `PageHeader` title with the agenda directly beneath it. The
  shipped two-sentence explainer paragraph goes — a host who has listings does not need the product
  explained to them every visit. It is retained ONLY in the no-listings state, where it is genuinely
  orienting, alongside the existing `EmptyState`.

#### The requests inbox is a triage queue, and nothing else (HFLOW-01)

- **D-144: A request row is SELF-SUFFICIENT. There is no navigation off the inbox.**
  Everything needed to decide is on the row: booker first name, space, venue-local window, the
  server-frozen total, and the SLA countdown. **This closes Phase 11's open question** — `RowCard`'s
  optional `href` stays unused on `request-row.tsx`, and the row does not become navigable
  (`11-11-SUMMARY.md:283`). *PM-selected: a triage queue that browses is no longer a triage queue, and two
  places carrying approve/decline is two places that must be kept in agreement.*

- **D-145: Decline confirms; approve does not.**
  Decline is irreversible and refunds the booker — it gets `ResponsiveDialog` (Phase 11's pattern, already
  used by the host cancel dialog) naming the space, the window and the consequence. Approve is the
  expected, reversible-by-cancellation path and stays one press. **Neither action's server semantics
  change** — the 06-07 server actions are called exactly as they are called today (D-130).

- **D-146: The SLA countdown is the LOUDEST element on the row.**
  It outranks the money and the booker name in the visual hierarchy — that is the requirement's actual
  words and it is a hierarchy instruction, not a colour instruction. **The final-hour emphasis stays on
  this surface.** This discharges deferred item `[13-07]`: the emphasis was opted out for the *fifteen-minute*
  booker payment window, where the condition is true from first paint to last and therefore says nothing.
  On an hours-scale approval deadline it carries real information. The token's AA pairing is already
  measured in `contrast-pairs.ts`; if the hierarchy can be carried by weight and scale alone, prefer that.

- **D-147: Inbox-zero ADOPTS `EmptyState` and reads as *done*.**
  Not "no requests found" — something closer to *"You're all caught up."* No retry affordance, no error
  vocabulary, no alert tone. `11-16`'s `T-11-FALSEALARM` rule binds here: an absence must never be dressed
  as a failure.

#### The wizard stops surprising the host at the end (HFLOW-02)

- **D-148: The step rail is clickable BACKWARD to any VISITED step; forward steps stay inert.**
  *PM-selected over free jumping: each step autosaves independently, so free jumping is technically safe,
  but a first-time host can then land on a step whose earlier answers are blank — and the occupancy fork
  changes which steps even exist.* Visited-ness is tracked **by step KEY, never by numeric index** — the
  walked list is mode-dependent (`wizard.tsx:380`), and the file's existing rule is that nothing is
  addressed by index. The rail's markers are `<span>`s inside an `<ol>` today; they become real controls,
  which means a keyboard-operable name, a focus ring, and a 24px+ hit area at 320px.

- **D-149: The publish checklist becomes PERSISTENT, not an end-of-flow reveal.**
  A side panel from `lg` up; a collapsible summary above the form below `lg` (a host on a phone cannot
  afford a permanently-open nine-row panel above every field). The review step keeps the full checklist it
  has today. The rows already link back to their step by key (`wizard.tsx:484`) — that resolution logic is
  reused, not rewritten.

- **D-150: The save state is VISIBLE and TRUTHFUL.**
  The wizard already autosaves on every advance and the host is told nothing. It gains a saving → saved
  indicator driven by the **actual `saveListingStep` result** — never an optimistic string, never a timer.
  A failed save must be visible as a failure on the surface, not only as a toast that scrolls away.

- **D-151: The truthful step count across the occupancy fork ALREADY WORKS — do not regress it.**
  `wizard.tsx:380` filters the booking-mode step out of the walked list in drop-in mode, and the review
  step carries the one line explaining the removal. HFLOW-02 lists this as a deliverable; it is in fact a
  **no-regression obligation** with a test, not new work. Plan it as GATE-NOREG coverage.

#### The bookings table and the hours editor become the same product (HFLOW-04)

- **D-152: The week-at-a-glance is a SEVEN-COLUMN BAR STRIP of the weekly PATTERN, live from form state.**
  Each column draws that weekday's open windows against a 24-hour scale, updating **as the host edits and
  before they save**, so a mistyped window is visible immediately. *PM-selected over a per-day text
  summary (which only repeats the fields above it) and over a bars+real-dates overlay (which conflates "my
  weekly pattern" with "this specific week" the moment a one-off block exists).*
  **Date-specific blocks and closures are NOT overlaid** — they are what `BlocksEditor` below controls, and
  the preview must describe exactly what the editor above it sets.

- **D-153: The strip carries a text equivalent; the bars are decoration.**
  Bars `aria-hidden`, one accessible per-day sentence from the SAME derivation that draws them, so the seen
  and the announced can never drift. This follows 12-06's live-region and naming rules
  (`src/lib/design/live-regions.ts`) rather than inventing a convention.

- **D-154: `/host/bookings` gets the design system and NOT a new information architecture.**
  The tab partition, the `?listing=` filter, the page size and `queryHostBookings`'s owner-scoped WHERE are
  untouched (T-07-30). What changes is the container, the row, the type scale, the status vocabulary and
  the 320px behaviour. Adding host-side filtering or sorting would be a new capability and is out of scope.

- **D-155: The two availability editors LEAVE `ALLOWED_RAW_CARD`.**
  `11-13-SUMMARY.md:234-235` lists `weekly-hours-editor.tsx` and `blocks-editor.tsx` as Phase 14's
  exemptions, held open precisely because HFLOW-04 is structural. This phase spends them.

#### Earnings and payouts (HFLOW-05)

- **D-156: Tokens only. Zero structural change, zero new numbers.**
  No new payout claim, no new state, no restructure of a surface whose figures have never moved real money.
  If a plan proposes changing what the earnings page *says*, that is a scope alarm.

### Claude's Discretion

- **The host listing tile stays as it is, and the UI-SPEC is corrected instead.**
  Deferred item `[11-16]` (`11/deferred-items.md:74`) left Phase 14 a fork: either drop `listing-card.tsx`
  from `ResultCard`'s *Replaces* list, or make the host tile one big anchor and move Edit / Availability /
  Delete off the card. Taking option (a): the host tile is a **management** tile carrying four controls, and
  a tile that is one anchor cannot hold interactive children without nested-interactive a11y problems. This
  is a spec correction, not a container swap, and **no fourth container is added** — DS-11 says three.
- **`address-autocomplete.tsx`'s live-region exclusion is DISCHARGED here.** It is the last remaining entry
  in `LIVE_REGION_EXCLUSIONS` (`13-14-SUMMARY.md:358`), and Phase 13 left a worked example of what
  discharging one looks like.
- **Re-measure row heights at adoption.** `[11-08]` records that shipped rows render 112px against an 80px
  skeleton because `ui/card.tsx` pays block padding twice; the shrink is a pure win at adoption, but
  `RowCard`'s `actions` slot changes the resting height — and every host row here has actions.
- Everything below the product line — file layout, component decomposition, query shape, test strategy,
  server/client boundaries, how many plans this splits into — is mine and is not brought back to the PM.

### Deferred Ideas (OUT OF SCOPE)

- **Availability copy-to-all** — Phase 19 (PROJECT D-136). It will land on the editor this phase restyles;
  leave the editor's structure friendly to a per-day action, but add no such action here.
- **Host-side filtering/sorting on `/host/bookings`** — a new capability, not a token pass. Not this phase.
- **Making the host listing tile navigable** (moving Edit/Availability/Delete off the card) — rejected in
  favour of correcting the UI-SPEC's *Replaces* list; recorded in case a future phase wants to revisit.
- **The drop-in month grid's 28×28 hit area and its in-flight month read** (`[12-10]`, `[12-09](a)/(b)`) —
  booker surfaces, Phase 17's sweep or whichever plan next opens `date-pass-picker.tsx`.
- **`NEXT_PUBLIC_APP_URL` is unset**, so share URLs resolve to localhost (`[11-14]`). Environment, not
  Phase 14.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description (`.planning/REQUIREMENTS.md:76-82`) | Research support |
|----|---|---|
| **HFLOW-01** | The host requests inbox is scannable with the SLA countdown as the loudest element, approve/decline as the only actions, and a designed inbox-zero | § The Requests Inbox As It Is Today · § Gate G3 (`phase13-surface-gates`) · § Gate G7 (`empty-state-adoption`) · § Testing Seams (approve/decline + IDOR) · M1 row heights |
| **HFLOW-02** | The listing wizard shows a truthful step count across the occupancy fork, allows back-navigation from a clickable step rail, shows its save state, and surfaces the publish checklist as a persistent panel rather than an end-of-flow surprise | § The Wizard's Real Structure (line-range map) · § Gate G2 (`brand-recipe`) · § Gate G5 (`status-vocab` — the checklist-extraction trap) · § Testing Seams (`wizard-occupancy` cases 3+4 = D-151) · M3, M5 |
| **HFLOW-03** | The host dashboard is a "today" view — today's bookings, requests owed, payout state, and any published-without-hours signal — rather than a greeting and a CTA | § The "Today" Query — Measured · § The Dashboard As It Is Today · § Gate G2 (the second brand-recipe trap) · M1 (agenda row height) |
| **HFLOW-04** | The host bookings table and availability editor carry the design system, and the editor shows a week-at-a-glance preview of what was set | § The Bookings Table · § The Availability Editors · § Gate G4 (`elevation-z` shadow pin) · § Gate G6 (`card-pattern-coverage`) · M4 (strip geometry) |
| **HFLOW-05** | Earnings and payouts receive a token pass only, with no restructure, because that data has never been real | § Earnings · § Gate G8 (`type-scale` DISPLAY_INVENTORY — the spec/reality discrepancy) · § Destructive-token census |
</phase_requirements>

---

<project_constraints>
## Project Constraints (from CLAUDE.md)

**Root `C:\Users\Admin\CLAUDE.md` and `./CLAUDE.md` both carry the GSD workflow rule:** file-changing tools
run only inside a GSD command (`/gsd:quick`, `/gsd:debug`, `/gsd:execute-phase`). Plans must not instruct
free-hand edits outside an executing plan.

**Stack directives binding on this phase** (from `./CLAUDE.md` § Technology Stack):

| Directive | How Phase 14 must honour it |
|---|---|
| PostgreSQL is the correctness authority; double-booking is prevented by the GiST exclusion constraint | The new "today" read is a **SELECT**. It touches no constraint, no `unit`, no admissions counter. |
| Store all times as `timestamptz` (UTC); convert at the edges with `@date-fns/tz` | The day-boundary predicate converts **in SQL** (`AT TIME ZONE l.timezone`) and the label converts **in TS** (`composeWhenLabelShort` → `tz()`). Both are edges; neither is a naive timestamp. |
| Drizzle's `sql` template keeps raw Postgres constructs type-aware | The predicate goes through `dbConn.execute(sql\`…\`)`, the same seam `queryHostBookings` and `getOpenHoursLockState` already use. |
| Never trust the client for price/time | Money on every host surface stays the server-frozen `quotedTotalCents` through `formatMoney`. Zero arithmetic. |
| Zod schemas shared client/server | The week strip derives from the **same** `windows` array `weeklyHoursSchema` validates. No second validation path. |
| Avoid: application-level double-booking checks, naive timestamps, rolling your own calendar | None of the three is proposed. |

**Project skills:** `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`,
`.codex/skills/` — **none exist.** `[VERIFIED: filesystem, this session]`
</project_constraints>

---

## Summary

Phase 14 is a **restyle of five shipped surfaces plus exactly one new SQL read**. Nothing here needs a new
package, a new pattern, a new container or a migration. What it needs is precision about (a) what the five
files actually contain today, (b) how to express one venue-local day-boundary predicate, and (c) which of
the **48 committed design gates** a given edit turns red — because in this repository a gate going red for
a non-design reason is the single most common way a plan loses a day.

The research found **five gates the approved UI-SPEC does not name** that a straightforward reading of its
own decisions will trip: `live-regions.test.tsx:491` (asserts the exclusion list is **non-empty**, which the
UI-SPEC takes to zero), `status-vocab.test.ts:654` + `:662` and `empty-state-adoption.test.ts:458` (all three
pin the success-marker by the **file path** `wizard.tsx`, which D-149's checklist extraction moves),
`brand-recipe.test.ts:824` (pins host `variant="brand"` at **5**, and the dashboard's two branches are two
of them), and `elevation-z.test.ts:306` (pins `/host/bookings` at **one** raised shadow, which is the
`?listing=` `<select>`). Each is a one-line inventory amendment — but only if the plan budgets it.

The **"today" predicate is solved and measured against live Postgres 18**. `(b.starts_at AT TIME ZONE
l.timezone)::date = ($now::timestamptz AT TIME ZONE l.timezone)::date` is correct for a two-zone host, is
precedented at `src/lib/listing/hours-lock.ts:86`, and needs **no index and no migration**. It cannot be
index-sought — not because the function is volatile (it is IMMUTABLE, measured) but because the expression
spans two tables — and it does not need to be: the row set is already bounded by `listing.host_id = $1`. The
next-session read (D-142) fits in the **same statement** as a `UNION ALL` bucket, so D-142 costs zero extra
round trips.

**Primary recommendation:** plan the phase as *inventory edits + surface edits*, and make every plan that
touches a design-gated file name the gate row it moves in the same task. Read § Committed Gates before
writing a single task.

---

## Architectural Responsibility Map

| Capability | Primary tier | Secondary tier | Rationale |
|---|---|---|---|
| Owner-scoping every host read | **Database (SQL `WHERE`)** | API/RSC re-gate | `queryHostBookings`'s `WHERE l.host_id = $1` is the boundary; the page's `canHost` re-check is defence in depth. A branch can be bypassed by a crafted parameter; a `WHERE` cannot (`bookings-query.ts:7-13`). |
| Deciding which sessions are "today" | **Database** | — | The predicate needs the DB clock *and* the per-row `listing.timezone`. Doing it in TS means shipping every row to the server and filtering there — and re-introducing a second clock. |
| Rendering a venue-local window label | **API / RSC (server)** | — | `composeWhenLabelShort` runs server-side in the RSC and hands a string down. No client ever formats a booking time. |
| The SLA countdown's ticking digits | **Browser / Client** | Database (authority) | `RequestCountdown` is `"use client"` and ticks per minute; the DB `expires_at > now()` guard is the authority. Display cue only (`request-countdown.tsx:7-10`). |
| Wizard step state, visited-ness, save state | **Browser / Client** | API (authority) | One RHF form in a client component. `saveListingStep` re-validates server-side with the same `draftSchema`; the indicator reads its **result**. |
| Week-strip derivation (`deriveWeekStrip`) | **Browser / Client** | — | It must update from live form state *before* a save (D-152). Pure function, no I/O — so it is also unit-testable in Node. |
| The publish gate | **API (server action)** | Client (telling only) | `publishListing` re-runs `publishSchema`. The checklist only *names* what is missing (`wizard.tsx:490-496`). |
| Payout state, hours-missing signal | **Database** | RSC | `derivePayoutStatus` and `loadPublishedListingsMissingHours` are the single authorities, already rendered on two surfaces each. |
| Pending-request count | **Database** | Three RSC consumers | One predicate, three call sites — see § The Three-Consumer Predicate. |

**Nothing in this phase moves a tier.** That is D-130 restated as a table.

---

## Standard Stack

**Zero new dependencies.** Everything Phase 14 needs is already installed and already used somewhere in
`src/`.

### Core (already installed — versions read from `package.json` this session)

| Library | Declared range | Purpose in this phase | `[VERIFIED: package.json]` |
|---|---|---|---|
| `next` | `^16.2.7` | RSC surfaces, `loading.tsx` plates, server actions | ✓ |
| `react` | `^19.2.7` | The wizard's client island, the strip | ✓ |
| `drizzle-orm` | `^0.45.2` | The `sql` template for the today predicate | ✓ |
| `tailwindcss` | `^4.3.0` | `@theme inline`, `source("../")` narrowed to `src/` | ✓ |
| `react-hook-form` | `^7.77.0` | `useWatch` on `windows` (the strip's live input); the wizard's one form | ✓ |
| `zod` | `^4.4.3` | `weeklyHoursSchema`, `draftSchema`, `publishSchema` — all shared | ✓ |
| `date-fns` + `@date-fns/tz` | `^4.4.0` / `^1.5.0` | `composeWhenLabelShort`'s `format(..., { in: tz(timezone) })` | ✓ |
| `lucide-react` | (installed) | `CheckIcon`, `MinusIcon`, `ChevronDownIcon`, `CalendarOffIcon` | ✓ |

### Vendored primitives this phase composes

31 primitives under `src/components/ui/**`. Phase 14 composes `card`, `button`, `badge`, `separator`,
`skeleton`, `dialog`, `select`, `table`, `progress`, `form`, `alert`, `sonner`, and — first host call site —
`collapsible`. **`collapsible.tsx` is confirmed vendored and already scanned by the leak gate**
`[VERIFIED: tests/design/leak.test.ts:339 — expect(VENDORED_PRIMITIVES).toContain("src/components/ui/collapsible.tsx")]`.

**No new block is fetched.** `components.json` declares `"registries": {}`.

### Alternatives considered

| Instead of | Could use | Tradeoff |
|---|---|---|
| A new `queryHostAgenda()` module | Extend `queryHostBookings` with an optional `today` mode | Extending keeps one owner for the host row shape and reuses the `RawBookingRow` hydration + `isoUtc` mask. **Recommended** — see § The "Today" Query. |
| `bg-foreground` percentage bars in `style` | 24 arbitrary `top-[N%]` / `h-[N%]` classes | 48 undeclared arbitrary values. `style` carries no colour and no type size, so it is outside all five leak patterns by construction. **Inline style wins** `[VERIFIED: config/design-leak-patterns.mjs:132-190 — the five patterns are hex, colour functions, `text-[NNpx]`, numbered palette, white/black]`. |
| A `sheet` block for the mobile decline overlay | `ResponsiveDialog` (already carries `max-sm:` bottom-sheet classes) | `sheet-absent.test.ts` (533 lines) exists to keep `sheet` unfetched. Refused four times. |

**Installation:** none. `npm install` runs zero new packages for this phase.

---

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.**

`slopcheck` was not run because there is nothing to check: the Standard Stack above is entirely
already-installed dependencies read out of the repository's own committed `package.json`, and the UI-SPEC's
Registry Safety section forbids fetching a new shadcn block (`14-UI-SPEC.md:1152-1157`). A plan that proposes
`npm install <anything>` or `npx shadcn add <anything>` in this phase is a scope alarm.

If a later plan does need a package, run the Package Legitimacy Gate first: `npm view <pkg> version`,
`npm view <pkg> scripts.postinstall`, and `slopcheck install <pkg> --json`.

---

## Architecture Patterns — the five surfaces as they are today

### System architecture diagram — the host request path

```
                    ┌──────────────────────────────────────────────────────────┐
  browser ─────────▶│ (host)/host/layout.tsx    GATE 1: session + canHost      │
   GET /host/*      │   :52  if (!u.canHost) redirect("/")                     │
                    │   :95  <Suspense fallback={SiteNav}> AmbientHostNav ─────┼──▶ pending count
                    │   :114 <Suspense fallback={BellSlot}> AmbientNotif ──────┼──▶ unread count
                    └───────────────┬──────────────────────────────────────────┘
                                    │ children
                    ┌───────────────▼──────────────────────────────────────────┐
                    │ page.tsx                  GATE 2: session + canHost again│
                    │   (a layout is not an authorization boundary for DATA)   │
                    └───────────────┬──────────────────────────────────────────┘
                                    │
             ┌──────────────────────┼───────────────────────┬─────────────────────┐
             ▼                      ▼                       ▼                     ▼
     readDbNow(db)          owner-scoped SELECT      derivePayoutStatus   loadPublishedListings
     ONE clock per          GATE 3: WHERE            (hostPayout row)     MissingHours(db,userId)
     request, threaded      listing.host_id = $1
             │                      │                       │                     │
             └──────────────────────┴───────────┬───────────┴─────────────────────┘
                                                ▼
                            composeWhenLabelShort({ …, timezone, city })
                            formatMoney(quotedTotalCents)      ← ZERO arithmetic
                                                ▼
                            RowCard / PanelCard / EmptyState / PageHeader
                                                ▼
                            client islands: RequestActions, RequestCountdown,
                                            ListingWizard, WeeklyHoursEditor
                                                │
                                    approve/decline ──▶ server action
                                                        atomic `expires_at > now()` guard
                                                        revalidatePath ──▶ row disappears
```

### `/host` — the dashboard · `src/app/(host)/host/page.tsx` (202 lines)

| Lines | Region | What it does |
|---|---|---|
| 34-46 | Gate 2 | `getSession` → `/login`; `!u.canHost` → `/` |
| 48-52 | Read 1 | `count()` non-deleted listings → `hasListings` |
| 56-61 | Read 2 | **pending-request count** — `booking ⋈ listing WHERE host_id AND status='requested'` |
| 64-68 | Read 3 | `hostPayout` row → `derivePayoutStatus` |
| 73 | Read 4 | `loadPublishedListingsMissingHours(db, userId)` |
| 79-88 | Derive | `hoursNudge` sentence (one-vs-many fork) + `hoursNudgeHref` |
| 91 | Shell | `mx-auto w-full max-w-3xl px-4 py-12` + `data-host-dashboard` |
| 92-99 | Header | Hand-rolled `<h1 className="text-2xl …>` + the two-sentence explainer `<p>` |
| 102-104 | Signal 2 | `<PayoutBanner status={payoutStatus} />` |
| 135-146 | Signal 3 | `PanelCard tone="muted"` + `<p data-hours-missing={n}>` |
| 148-174 | CTA cluster | 4 buttons: `Create listing` (**brand**) · `Your listings` · `Earnings` · `Requests {N}` |
| 176-199 | No-listings | `EmptyState` + `Create your first listing` (**brand**) |

**There is no `readDbNow` on this page today, and no booking read at all.** D-140 adds both.

`(host)/host/loading.tsx` (27 lines) renders one `PanelSkeleton` in the same
`mx-auto w-full max-w-3xl px-4 py-12` shell. Its header comment claims "all nine host routes ship their
own" — **measured: 11 `page.tsx` and 11 `loading.tsx` under `src/app/(host)/`**, so the comment's arithmetic
has drifted (the UI-SPEC says "twelve"; both are wrong).
`[VERIFIED: find src/app/(host) -name loading.tsx | wc -l → 11; -name page.tsx → 11]`

### `/host/requests` — the inbox · `src/app/(host)/host/requests/page.tsx` (226 lines)

| Lines | Region | Notes |
|---|---|---|
| 45-54 | Gate 2 | Same shape as the dashboard |
| 60-89 | The read | `booking ⋈ listing ⋈ user`, `WHERE listing.hostId = $1 AND booking.status = 'requested'`, `ORDER BY expires_at ASC`. **This exact predicate is what 06-07's IDOR read test asserts** (`:56-59`) |
| 98 | Clock | `const now = await readDbNow(db)` — the one clock, threaded into every `RequestCountdownReason` |
| 100-129 | Display map | `composeWhenLabelShort` (`openCapacity: false` — hard-coded, argued at `:109-111`), `formatMoney`, `expiresAt` as ISO |
| 132 | Shell | `mx-auto w-full max-w-4xl px-4 py-10` (hand-typed) |
| 133-137 | Header | Hand-rolled `<h1 className="text-xl …>` + lede with `{APPROVAL_SLA_HOURS}` |
| 140-171 | Inbox-zero | `EmptyState tone="positive"` — **already exactly what D-147 asks for, byte-for-byte** |
| 174-213 | Desktop table | `hidden md:block`; column order `Space · When · Guest · Guest pays · Expires · Actions` |
| 216-220 | Mobile | `space-y-3 md:hidden` → `<RequestRow>` |

`requests/loading.tsx` (31 lines) already uses `PageHeader` + `RowListSkeleton label="Loading your requests"`
in the same hand-typed shell.

**`src/components/host/request-row.tsx` (212 lines)**

| Lines | What |
|---|---|
| 65-160 | `RequestActions` — client. Approve is `<Button size="sm">`; Decline opens a **raw `ui/dialog`** (`:132-157`) |
| 86-88 / 105 | The two success toasts |
| 90 / 108 | **The two `toast.error(res.error)` refusal paths the UI-SPEC replaces with an in-row `role="status"`** |
| 171-212 | `RequestRow` — the mobile `RowCard`. No `href` (`:180-181`), no `media`, `<dl>` in `children` (`:192-201`), countdown in `children` (`:206-209`) |

⚠ **`RequestActions` is rendered on TWO surfaces** — `/host/requests` (`page.tsx:203`) *and*
`/host/bookings`'s desktop table for `requested` rows (`bookings/page.tsx:265-271`). Changing its button
size from `size="sm"` (h-7) to `size="touch"` (h-11) changes both.

### `/host/bookings` — the table · `src/app/(host)/host/bookings/page.tsx` (298 lines)

| Lines | Region | Notes |
|---|---|---|
| 61-63 | `parseTab` | Attacker-controlled `?tab=`; anything but `past` → `upcoming` |
| 66-74 | `refundLabelFor` | D-79's two sentences |
| 97 | Clock | `readDbNow(db)` |
| 101-105 | Filter options | Owner-scoped `listing` select for the `?listing=` dropdown |
| 107-113 | The read | `queryHostBookings(db, {hostId, tab, listingId, cursor, limit: BOOKINGS_PAGE_SIZE})` |
| 117-142 | Display map | `composeWhenLabelShort` with the real `openCapacity`; `formatMoney`; `now` threaded per row |
| 154 | Shell | `mx-auto w-full max-w-4xl px-4 py-10` (hand-typed) |
| 155-158 | Header | Hand-rolled `<h1 className="text-xl …>` + `<p>` — **identical strings to `bookings/loading.tsx`** |
| 160-189 | Tabs + filter | `BookingsTabs` + a plain GET `<form>` with a raw `<select className="… shadow-raised …">` at `:175` |
| 192-211 | Empty | `EmptyState` forked by tab |
| 214-277 | Desktop table | `Guest · Space · When · Status · Payout · Actions` (last header is `sr-only`) |
| 280-284 | Mobile | `HostBookingRow` (already `RowCard`) |
| 287-293 | Pager | `Load more` keyset link |

⚠ **`:175`'s `<select>` carries the ONE `shadow-raised` this file is allowed** — see § Gate G4.

### The wizard · `src/app/(host)/host/listings/[id]/edit/wizard.tsx` (1472 lines)

**Region map — the answer to "which line ranges change for D-148/D-149/D-150".**
`[VERIFIED: grep -n over the file, this session]`

| Lines | Region | Phase-14 relevance |
|---|---|---|
| 1-18 | File header (the OPEN-01 fork explained) | update prose |
| 20-100 | Imports | `CheckIcon`, `ChevronLeftIcon`, `MinusIcon` already imported (`:26-30`) |
| 102-141 | `export type WizardListing` | — |
| **143-162** | **`const STEPS = [...] as const`** — 9 entries, keys `type · details · location · photos · occupancy · pricing · booking · cancellation · review` | D-148/D-151 read this |
| 164 | `type StepKey = (typeof STEPS)[number]["key"]` | the union `visitedKeys: Set<StepKey>` types against |
| 174-201 | `CANCELLATION_TIERS` | — |
| 202-226 | `OCCUPANCY_MODE_CARDS` | — |
| 227-252 | `ModeLockDisplay` | — |
| 253-306 | `hasChosenMode` / `currencySymbol` / `toPayload` | — |
| **308-319** | Component signature — props `listing`, `hostEmail`, `emailVerified`, `modeLock` | — |
| **321-327** | State: `step`, `saving`, `tagPickerOpen`, `photoCount` | **D-148 adds `visitedKeys`; D-150 adds `saveState`** |
| 329-363 | `useForm({ resolver: zodResolver(draftSchema), defaultValues })` | D-150 reads `form.formState.isDirty` |
| 365 | `const values = form.watch()` | — |
| 369 | `const openMode = values.occupancyMode === "open_capacity"` | the fork |
| **380** | **`const steps = openMode ? STEPS.filter(s => s.key !== "booking") : STEPS`** | **D-151's whole mechanism** |
| **393** | **`const stepIndex = (key: StepKey) => steps.findIndex(s => s.key === key)`** | D-149 reuses verbatim |
| 396 | `const CANCELLATION_STEP = stepIndex("cancellation")` | — |
| **399-406** | **`async function persist(): Promise<boolean>`** — calls `saveListingStep`; on `!res.ok` fires `toast.error(res.error)` and returns `false` | **D-150's source of truth. Note it DISCARDS `res.error` after the toast** — the indicator needs the sentence, so `persist` must return the result rather than a boolean |
| 408-416 | `saveAndContinue` — `setSaving(true)` → `persist()` → `toast.success("Saved")` → `setStep(s+1)` | **D-150 removes the success toast** |
| 418-426 | `saveAsDraft` — toast `Draft saved` then `router.push` | **survives** (precedes a navigation) |
| 428-443 | `handlePublish` — `persist()` then `publishListing`; toast `Your listing is live!` then push | **survives** |
| 445-455 | `resendVerification` | — |
| 457-480 | `applyResolvedAddress`, `toggleTag`, `toggleAmenity` | — |
| **484-543** | **`const checklist: {label, done, step, action?}[]`** — 9 or 10 rows; the mode fork is a spread at `:497-526` | **D-149 lifts this** |
| 544 | `const publishEligible = checklist.every(c => c.done)` | — |
| 554-565 | `openSummaryLine` | — |
| 578-582 | `stepInList` (clamped), `currentKey`, `progress`, `advanceLabel` | D-148 needs `stepInList` for `i < currentIndex` |
| **588-641** | **The stepper block** — `<p>Step {n} of {m}</p>` (`:590-592`), `<Progress value={progress}/>` (`:593`), `<ol className="flex flex-wrap gap-2" aria-label="Listing steps">` (`:594-640`). Markers are `<span className={cn("flex size-6 …", (state==="current"\|\|state==="done") && "bg-brand text-brand-foreground", state==="future" && "bg-muted text-muted-foreground")}>` at **`:599-636`**, with a 30-line comment at `:602-629` explaining the accent decision | **D-148's entire surface. `:630-631` is the ONE `bg-brand` occurrence the gate counts** |
| **643** | `<h1 className="text-2xl font-semibold tracking-tight">{steps[stepInList].title}</h1>` | UI-SPEC type rule 1 replaces this with `PageHeader` |
| 645-647 | `<Form {...form}><form onSubmit={e => e.preventDefault()} className="space-y-8">` | — |
| 649-743 | step `type` | — |
| 744-840 | step `details` | — |
| 841-894 | step `location` (renders `AddressAutocomplete`) | live-region discharge lands here |
| 895-919 | step `photos` (renders `PhotoUploader`) | ⚠ carries an unnamed `role="status"` — see § Unbudgeted live regions |
| 920-1003 | step `occupancy` (the mode fork + lock notice) | — |
| 1004-1081 | step `pricing`, drop-in branch | — |
| 1082-1242 | step `pricing`, whole-space branch | — |
| 1243-1304 | step `booking` | the step D-151 removes in drop-in |
| 1305-1344 | step `cancellation` | — |
| **1345-1436** | **step `review`** — `openMode` note (`:1359-1364`), eligible box (`:1365-1369`), **the inline checklist** (`:1370-1434`) with the `bg-success text-success-foreground` done marker at **`:1388-1399`** and the `Fix` link calling `setStep(c.step)` at `:1403-1413` | **D-149 lifts `:1374-1426`. ⚠ moving `:1391` out of this file trips three gates — see § Gate G5** |
| **1438-1467** | **The nav row** — `Back` ghost (`:1440-1447`), then the three-way advance (`:1449-1466`): `Save and continue` \| `Publish listing` (**`variant="brand"` at `:1456`**) \| `Save as draft` | **D-150's indicator goes here (left of the advance control)** |

**Entry points into the wizard:**
- `src/app/(host)/host/listings/new/page.tsx` (28 lines) — creates a draft then `redirect(\`/host/listings/${id}/edit\`)`. **It renders no UI at all**, so "the wizard's `new` page" has no shell to change; `new/loading.tsx` (48 lines) is the only visible artifact of that route.
- `src/app/(host)/host/listings/[id]/edit/page.tsx` (131 lines) — the RSC shell. `:122` is
  `<div className="mx-auto w-full max-w-3xl px-4 py-8">` wrapping `<ListingWizard …/>`. **This is the file
  that gains `HOST_PANEL_SHELL` + `lg:max-w-5xl`**, not `wizard.tsx`.

### `/host/listings/[id]/availability` · `page.tsx` (200 lines)

| Lines | Region |
|---|---|
| 100-101 | `getOpenHoursLockState` (open-capacity listings only) |
| 105-109 | `initialWindows` — Postgres `time` `"HH:mm:ss"` normalised to `"HH:mm"` |
| 119-134 | `cityLabel`, `gmtLabel`, `lockNotice` (one assembled string) |
| **137** | Shell: `mx-auto w-full max-w-3xl space-y-8 px-4 py-8` |
| 140 | `<Toaster />` — mounted **once** at the shared ancestor (WR-04) |
| 142-176 | Hand-rolled `<h1 className="text-2xl …>`, lede `<p>`, the drop-in note `<p>` (`:155-160`), the CR-03 lock notice `<p>` (`:168-175`) |
| 178-186 | `<section>` `<h2 className="text-xl font-semibold">Weekly hours</h2>` + `<WeeklyHoursEditor …/>` |
| 188-197 | `<section>` `<h2>Blocked dates</h2>` + `<BlocksEditor …/>` |

**`src/components/availability/weekly-hours-editor.tsx` (290 lines)**

| Lines | What | D-155 |
|---|---|---|
| 38 | `import { Card, CardContent } from "@/components/ui/card"` | **deleted** |
| 44-54 | `WEEKDAY_LABELS` (`0=Sun … 6=Sat`) | reused by the strip |
| **57-62** | **`HOUR_OPTIONS`** — 24 entries `{value:"HH:00", label:"h:00 AM/PM"}`. ⚠ **00:00…23:00 only — a venue can never close at midnight** | the strip's label map (D-153) |
| 65 | `const toHour = (t: string) => parseInt(t.slice(0,2), 10)` | the strip's positioner |
| 85-94 | `useForm({ defaultValues: { windows: initialWindows } })` + `useFieldArray({name:"windows"})` | — |
| **96-99** | **`const liveWindows = useWatch({control, name:"windows"}) ?? []`** | **D-152's exact input — already present** |
| 102-132 | `occupiedRanges(day, selfIndex)` — client-side overlap math | strip must NOT duplicate this |
| 134-148 | `onSubmit` → `saveOperatingHours` | untouched (GATE-NOREG 6) |
| **160-172** | The `hasNoWindows` guidance box: raw `<Card><CardContent className="space-y-1">` + `<h3>` | → `PanelCard tone="muted"` |
| **174-273** | The seven-day editor box: raw `<Card><CardContent className="divide-y">` | → `PanelCard`, `divide-y` preserved |
| **276** | `<p className="text-sm text-destructive" role="alert">` — the overlap error | ⚠ an alarm-shaped region on a Phase-14 surface; see § Unbudgeted live regions |

**`src/components/availability/blocks-editor.tsx` (457 lines)**

| Lines | What | D-155 |
|---|---|---|
| 48 | `import { Card, CardContent }` | **deleted** |
| 50-57 | `import { Dialog, DialogClose, DialogContent, … } from "@/components/ui/dialog"` | → `ResponsiveDialog` |
| **116-124** | "No blocked dates" — raw `<Card><CardContent className="space-y-1">` + `<h3>` | → `EmptyState` (`ADOPTERS` 13 → 14) |
| **126-147** | The block list — raw `<Card><CardContent className="divide-y p-0">` | → `PanelCard` |
| 174+ | `AddBlockDialog` — raw `<Dialog>` | → `ResponsiveDialog` |
| **319** | `<p className="text-sm text-muted-foreground" role="alert">` — the date field error | ⚠ see § Unbudgeted live regions |

### `/host/earnings` · `page.tsx` (274 lines)

| Lines | What | HFLOW-05 permits |
|---|---|---|
| 150 | Shell `mx-auto w-full max-w-4xl px-4 py-10` | → `HOST_LIST_SHELL` |
| 151 | `<h1 className="text-xl font-semibold tracking-tight">Earnings</h1>` | → `PageHeader title="Earnings"` |
| 160-172 | `<PayoutSummary …/>` | **untouched** — and it carries **2 declared display-scale headings**; see § Gate G8 |
| 175-178 | The 10% commission sentence | **untouched, byte-for-byte** |
| 200+ | `EmptyState` | **untouched** |
| 266 | `<PayoutRow>` (already `RowCard`) | re-measured only |

### The three-consumer pending-request predicate

`booking ⋈ listing WHERE listing.host_id = $userId AND booking.status = 'requested'` is written **three
times** and must stay identical:

1. `src/components/patterns/ambient-notifications.tsx:167-170` — the streamed nav badge
2. `src/app/(host)/host/page.tsx:56-60` — the dashboard's count
3. `src/app/(host)/host/requests/page.tsx:88` — the inbox's own list

`[VERIFIED: grep, this session]`. D-140's signal row is consumer #2 reshaped, not a fourth.

---

## The "Today" Query — measured against live Postgres

> This is the phase's one genuinely new piece of logic and the UI-SPEC's Open Question 6.
> **Every claim below was executed against the running `postgis/postgis:18-3.6` container on this box.**

### The precedent already in the tree

There are exactly **three** `AT TIME ZONE` sites in `src/`:

| Site | Shape | Relevance |
|---|---|---|
| `src/lib/booking/bookings-query.ts:135` | `to_char(<col> AT TIME ZONE 'UTC', …)` — the `isoUtc` boundary mask | the hydration convention, reuse it |
| `src/lib/availability/read-model.ts:506` | `to_char((b.starts_at AT TIME ZONE ${timezone}::text)::date, 'YYYY-MM-DD')` — a **bound parameter** zone | the "venue-local calendar date" convention, per CR-03 |
| **`src/lib/listing/hours-lock.ts:86`** | **`EXTRACT(DOW FROM (b.starts_at AT TIME ZONE l.timezone))`** — a **per-row column** zone from a joined `listing l` | **the exact shape D-141 needs.** It already exists and is already tested (`tests/availability/hours-lock.test.ts`, 5 cases) |

`hours-lock.ts:60-63` also settles a question the UI-SPEC leaves open: **`starts_at`, not `ends_at`, decides
the venue-local day.** *"A split-shift or overnight venue's closing instant can land on the NEXT calendar
day, and a pass belongs to the day it was BOUGHT for."* The agenda must use the same rule or the product
will have two conventions for "which day is this session on".

### The predicate, and the proof it is right

```sql
(b.starts_at AT TIME ZONE l.timezone)::date = ($now::timestamptz AT TIME ZONE l.timezone)::date
```

Executed against three venues sharing one instant `2026-08-23T15:30:00Z`, with the clock at
`2026-08-23T16:10:00Z`: `[VERIFIED: psql, this session]`

| Venue zone | venue-local session date | venue-local today | `is_today` |
|---|---|---|---|
| `Asia/Manila` | 2026-08-23 | **2026-08-24** | **false** |
| `America/Los_Angeles` | 2026-08-23 | 2026-08-23 | **true** |
| `Pacific/Auckland` | **2026-08-24** | 2026-08-24 | **true** |

That is precisely the two-zone case D-141 names, and precisely the one a single server-side date literal
would get wrong. **The Manila row is the falsifying case a test fixture must carry.**

### Which clock parameter to use — and why NOT `now()`

`queryHostBookings` uses SQL `now()` inside the statement *and* the page separately calls `readDbNow(db)`
for the badges (`bookings/page.tsx:97`) — two readings of the transaction clock, microseconds apart, which
that page tolerates. **D-141 asks for better than tolerance.**

**Recommendation: read `readDbNow(db)` once, then pass its ISO string INTO the statement as a bound
parameter cast to `timestamptz`.** That idiom is already in the file — `keysetPredicate` does exactly
`${cursor.startsAtIso}::timestamptz` (`bookings-query.ts:193-194`). The result is **one instant** driving
the predicate, the badge and the countdown. Measured working. `[VERIFIED: psql EXPLAIN ANALYZE]`

### One query, both buckets — D-142 costs zero extra round trips

```sql
SELECT … , 'today' AS bucket FROM (…today predicate… ORDER BY b.starts_at ASC LIMIT 20) t
UNION ALL
SELECT … , 'next'  AS bucket FROM (…b.starts_at > $now… ORDER BY b.starts_at ASC LIMIT 1) u
```

Executed successfully; the plan is an `Append` over two `Limit`s. `[VERIFIED: psql EXPLAIN ANALYZE]`

Both subqueries must carry the **identical status predicate**, or a row can fall through both buckets.
Recommendation: reuse `tabPredicate("upcoming")`'s status half —
`b.status NOT IN ('cancelled','declined')` — rather than minting a third status set. The `next` bucket then
needs only `b.starts_at > $now`: in State B the today bucket is empty by definition, so any strictly-future
row is necessarily not today.

### Indexing — the honest answer

**No index seeks this predicate, no index can, and none is needed.**

- `timezone(text, timestamptz)` is **IMMUTABLE**, not stable — measured:
  `SELECT proname, provolatile FROM pg_proc WHERE proname='timezone'` returns `i` for the
  `(text, timestamp with time zone)` overload. `[VERIFIED: psql, PG18]` So volatility is **not** the reason
  an index is impossible.
- The reason is **cross-table**: the expression reads `booking.starts_at` and `listing.timezone`. A
  Postgres expression index on `booking` cannot reference a column of `listing`. `EXPLAIN` confirms the
  predicate lands as a post-join **`Join Filter`**, never an `Index Cond`. `[VERIFIED: psql EXPLAIN ANALYZE]`
- **The row set is already bounded** by `WHERE l.host_id = $1`, which `listing_host_idx (host_id)` covers,
  and `booking_listing_idx (listing_id)` covers the join back. For a v1 single-city host this is tens of
  rows. Existing indexes: `booking_listing_idx`, `booking_booker_idx (booker_id, starts_at DESC)`,
  `booking_idem_uq` (partial), `listing_host_idx`, `listing_status_idx`, `listing_location_gist`.
  `[VERIFIED: src/lib/db/schema.ts:232-234, 909-915]`

> ### 🚩 SCOPE ALARM — stated explicitly per the brief
> **No new index should be added, and none is required.** If a plan proposes one it is a migration, and
> `drizzle/` does not move (PROJECT D-136). If the host back-catalogue ever grows enough to matter, the
> **correctness-preserving** mitigation is a bounded UTC pre-filter, not an index — see below.

### The optional, provably-safe pre-filter

Adding `AND b.starts_at >= $now::timestamptz - interval '26 hours' AND b.starts_at < $now::timestamptz +
interval '26 hours'` narrows the candidate set to something an index range can seek, **without changing the
result**.

**Why 26h is provably sufficient:** for any zone, the clock instant `$now` and every instant in that zone's
"today" both lie inside the *same* half-open local day, so their difference is strictly less than the length
of that day — 24h normally, 25h across a fall-back DST transition. Measured across the extreme zones
(`Pacific/Kiritimati` UTC+14, `Etc/GMT+12`, `Asia/Manila`, `America/Los_Angeles`, `Pacific/Chatham`
UTC+13:45), the largest one-sided excursion observed was **23.00 h**. `[VERIFIED: psql, this session]`

With that pre-filter present, `SET enable_seqscan=off` shows Postgres willing to take
`Index Scan using booking_booker_idx … Index Cond: (starts_at >= … AND starts_at < …)`.
`[VERIFIED: psql EXPLAIN]` So the shape is index-narrowable if it ever needs to be.

### Where the code should live

**Recommendation: extend `src/lib/booking/bookings-query.ts` rather than author a new module.**
That file's own header states it is *"the ONE place `/bookings` and `/host/bookings` get their rows from, so
the booker and host lists can never drift"* (`:1-3`). A `queryHostAgenda(dbConn, {hostId, now})` **exported
from the same module** reuses `isoUtc`, `RawBookingRow`, the `Date` hydration boundary and the
`displayStatusExpr` derivation. Writing a second module re-creates exactly the three-copy problem
`when-label.ts:3-8` records.

The projection needs: `id`, `startsAtIso`, `endsAtIso`, `status`, `displayStatus`, `cancelledBy`,
`fullDay`, `openCapacity`, `spacePriceCents`, `quotedTotalCents`, `dayRateCents`, `currency`,
`listingTitle`, `timezone`, `city`, `bookerFirstName` — i.e. exactly `BookingListRow`'s host variant. **Do
not trim it**: `composeWhenLabelShort` requires `fullDay` and `openCapacity` as *required* fields precisely
so `tsc` enumerates every projection (`when-label.ts:60-76`).

---

## Committed Gates — what a Phase-14 edit must do to keep each green

**Baseline measured this session:** `npm run test:design` → **48 files, 816 passed, 3 skipped, 0 failed,
47.8s.** `npx tsc --noEmit` → **exit 0.**
`npx vitest run tests/listing tests/host tests/booking tests/availability tests/security` → **98 files,
1031 passed, 0 failed, 116s.** `[VERIFIED: run this session]`

### G1 — The DS-13 leak gate · `tests/design/leak.test.ts` + `eslint.config.mjs`

Scope: `src/app/**` and `src/components/**`, **including all 31 vendored primitives** (D-17 refuses an
exemption). Five patterns, all in `config/design-leak-patterns.mjs`:

| # | Pattern (line) | Catches |
|---|---|---|
| 1 | `:132` | raw hex, including inside a Tailwind arbitrary value and inside a `style` string |
| 2 | `:147` `/\b(?:rgba?\|hsla?\|oklch\|oklab\|lab\|lch)\(/i` | colour functions |
| 3 | `:178` `/text-\[(?:length:)?[0-9.]+[pP][xX]\]/` | arbitrary pixel type size |
| 4 | `:184` | numbered palette (`bg-red-500`) |
| 5 | `:190` | `bg-white` / `text-black` |

**Implication for the week strip:** `style={{ top: "25%", height: "4.17%" }}` carries no colour and no type
size and matches **none** of the five. The inline-percentage design is safe by construction. **Twenty-four
`top-[N%]` classes would be safe too** (pattern 3 is px-only) — but they would be 48 undeclared values
against the UI-SPEC's own rule, so the recommendation stands on design grounds, not gate grounds.

⚠ **A comment containing a banned spelling trips the scan.** `strip-comments.ts` is applied by
`brand-recipe`, `status-vocab` and `phase13-surface-gates` — but the **leak** gate scans raw text with an
exemption mechanism (`eslint-disable-next-line fitout/no-raw-design-value`), not a comment stripper. Three
plans in this repo have been burned. Name tokens descriptively in source prose.

### G2 — `tests/design/brand-recipe.test.ts` (1019 lines) — **TWO traps, the UI-SPEC names one**

**Trap A (named by the UI-SPEC).** `EXPECTED_SURVIVING_ACCENT_LINES` at `:143-152` pins
`"src/app/(host)/host/listings/[id]/edit/wizard.tsx": 1`. The scan (`:601-604`) is
`[...stripComments(code).matchAll(/[^\s"'\`]*bg-brand(\/\d+)?/g)].length` — **occurrences, not lines**
(changed by WR-15, `:595-600`). The file's one occurrence is `wizard.tsx:631`.

- Narrowing `(state === "current" || state === "done")` → `(state === "current")` keeps it at **1** ✓
- Converting the marker to `<Button variant="brand">` takes it to **0** ✗
- Splitting into two `bg-brand`-bearing branches takes it to **2** ✗

Also asserted: total across all six files is **8** (`:848`) and there are exactly **6** files (`:849`).

**Trap B — NOT named by the UI-SPEC.** `:820-825`:
```
const host = Object.entries(scan.adoption).filter(([f]) => f.startsWith("src/app/(host)/"))…
expect(host).toBe(5);
```
`scan.adoption` counts `variant="brand"` per file. Measured today: `listings/page.tsx` = 2 (`:89`, `:113`),
`host/page.tsx` = 2 (`:150`, `:193`), `wizard.tsx` = 1 (`:1456`). **Total 5.**
`[VERIFIED: grep 'variant="brand"' src/app/(host)/, this session]`

> **The dashboard's two accent buttons are two of that five.** D-143 restructures `/host` and keeps both
> branches (`Create listing` in the has-listings state, `Create your first listing` in the no-listings
> state). A plan that folds them into one drops the host total to **4** and `brand-recipe.test.ts:824`
> goes red for a reason with nothing to do with the design contract. **Keep both `variant="brand"` call
> sites in `host/page.tsx`.**

### G3 — `tests/design/phase13-surface-gates.test.ts` (614 lines)

`ROOTS = ["src/app/(app)/bookings", "src/components/booking", "src/components/group"]` (`:107`). **Host
files are outside it** — so `request-row.tsx` can be edited freely here. What IS in scope is
`src/components/booking/request-countdown.tsx`, pinned at `count: 1` (`:262-270`).

The counter is `findBanned` (`:210-220`), which counts **LINES containing the needle**, per banned spelling.
The file's one line is `request-countdown.tsx:167`:
```tsx
className={cn("tabular-nums", finalHour && finalHourEmphasis && "text-destructive")}
```

> **Implementation constraint for the `emphasis="lead"` prop (D-146):** the two-line `lead` layout must
> **wrap** that same `<span>` rather than duplicate it. A second digits element with its own `cn(...)`
> alarm-token expression takes the count to 2 and the gate red. The safe shape is a branch on the *layout
> container* (`<span className="inline-flex …">` vs a two-line block) with **one** digits node in both arms.

`ACCENT_USES` is also asserted here: `toHaveLength(10)` (`:500`), unique ids (`:501`), and every entry's
`site` must open (`:535`). Entry 7's `site` is `"src/app/(host)/host/listings/[id]/edit/wizard.tsx"`
(`accent-uses.ts:152`). **Amending entry 7's `device` string is safe** — nothing asserts its text.

### G4 — `tests/design/elevation-z.test.ts` (1252 lines) — **not named by the UI-SPEC**

`RAISED_INVENTORY` at `:305-311` pins **`"src/app/(host)/host/bookings/page.tsx": 1`**. That one is the
`?listing=` `<select className="… shadow-raised …">` at `bookings/page.tsx:175`.

> A design-system pass that swaps the raw `<select>` for a shadcn `Select`, or that adds any raised surface
> to `/host/bookings`, moves this number. D-154 says the filter is untouched — good — but a plan should
> say so explicitly rather than discover it.

### G5 — `tests/design/status-vocab.test.ts` (1681 lines) — **the biggest unbudgeted trap**

Three assertions anchor the success marker to the **file path** `wizard.tsx`:

| Assertion | Line | What it pins |
|---|---|---|
| `expect(scan.retiredPairingSites).toEqual([LEGAL_FILLED_PAIRING_SITE])` | `:654` | `LEGAL_FILLED_PAIRING_SITE = "src/app/(host)/host/listings/[id]/edit/wizard.tsx"` (`:137`) |
| `expect([...scan.positiveIconSites].sort()).toEqual([...SUCCESS_HUE_SITES].sort())` | `:662` | `POSITIVE_CALL_SITES` (`:149-154`) ∪ `SUCCESS_GLYPH_SITES` (`:184`) — a **closed set of five files** |
| `expect(scan.scanned).toContain(LEGAL_FILLED_PAIRING_SITE)` | `:501` | the file was actually read |

And a fourth, in a different file: `tests/design/empty-state-adoption.test.ts:458-461`
`ALLOWED_BG_SUCCESS` names `wizard.tsx` as **the one legal `bg-success` in the tree**, scoped to
`src/app/` + `src/components/` (`:475`).

> **D-149 extracts `wizard.tsx:1374-1426` — including the `bg-success text-success-foreground` done marker
> at `:1391` — into a shared component.** The moment that markup lands in
> `src/components/host/publish-checklist.tsx`, all four assertions go red simultaneously, and none of the
> failures says "you moved a component".
>
> **The plan must budget four inventory amendments in the same commit as the extraction:**
> 1. `status-vocab.test.ts:137` — `LEGAL_FILLED_PAIRING_SITE` → the new path
> 2. `status-vocab.test.ts:149-154` — `POSITIVE_CALL_SITES` gains/loses the path
> 3. `empty-state-adoption.test.ts:458` — `ALLOWED_BG_SUCCESS` key → the new path, with its reason
> 4. `src/lib/design/contrast-pairs.ts:250` — the `note` says "the wizard's completed-step marker"; prose
>    only, but it should stay true
>
> **The alternative** — keep the done-marker markup physically inside `wizard.tsx` and pass the rendered
> node into the shared component — avoids all four edits at the cost of a contorted API. **Recommendation:
> take the four amendments.** They are exactly the "add or amend a row in the declared inventory, with its
> reason" shape the UI-SPEC endorses, and hiding the marker behind a render prop would make the one legal
> green surface harder to find, not easier.

### G6 — `tests/design/card-pattern-coverage.test.ts` (769 lines)

- `EXPECTED_SURFACES = 13` (`:353`), asserted twice (`:598`, `:616`). D-155 adds the two availability
  editors as declared adopters → **13 → 15**, in both places.
- `ALLOWED_RAW_CARD` (`:355-411`) carries the two Phase-14 rows at `:403-406` — **delete both**.
  `:409-410` keeps `listing-card.tsx` (Claude's-discretion item confirms this stays).
- Every row's `why` must exceed 40 chars (`:631`, `:634`).
- `PATTERNS` must stay at 3 (`:625`) — DS-11's "no fourth container", enforced.
- Every `data-testid` a surface declares must be in `SELECTOR_IDS` (`:623`).

### G7 — `tests/design/empty-state-adoption.test.ts` (1068 lines)

- `EXPECTED_ADOPTER_FILES = 13` (`:447`) → **14** for `blocks-editor.tsx`.
- `EXPECTED_EMPTY_STATE_SITES = 16` (`:448`) → **17** (one new call site).
- Both asserted at `:784-785`.
- The file's own NOT-COVERED footer at `:218-222` says in as many words that *"a Phase-14 host-tooling
  surface is expected to EXTEND `ADOPTERS` in its own commit. That is the gate working."*
- `ALLOWED_BG_SUCCESS` — see G5.

### G8 — `tests/design/type-scale.test.ts` (763 lines) — a spec/reality discrepancy

`DISPLAY_INVENTORY` at `:523-535` pins **`"src/components/host/payout-summary.tsx": 2`**.

> `14-UI-SPEC.md:156` states *"Display … **Nowhere.** No host surface in this phase carries a display-scale
> heading."* **Measured: false.** `PayoutSummary` renders on `/host/earnings` (`earnings/page.tsx:160`) and
> carries two declared display-scale headings. D-156 freezes that file, so nothing needs to change — but a
> plan that reads the UI-SPEC's sentence as an instruction and "fixes" `payout-summary.tsx` turns this gate
> red **and** violates HFLOW-05. Record the discrepancy; change nothing.

### G9 — `src/lib/design/live-regions.ts` + `tests/design/live-regions.test.tsx` (965 lines)

| Artifact | Today | Phase 14 |
|---|---|---|
| `BOOKER_PATH_LIVE_REGION_FILES` (`live-regions.ts:305-327`) | 17 files | **rename → `LIVE_REGION_FILES`, +3 host files → 20** |
| `export type DeclaredFileCountIsSeventeen` (`:1093-1095`) | `extends 17` | **rename → `…IsTwenty`, `extends 20`.** The alias NAME carries the number *on purpose* (`:1078-1086`) |
| `DECLARED_FILE_COUNT = 17` (`live-regions.test.tsx:207`) | 17 | **→ 20.** Pinned in TWO places by design (`:460`) |
| `LIVE_REGION_EXCLUSIONS` (`:374-383`) | 1 row (`address-autocomplete.tsx`) | **→ 0** |
| `LIVE_REGIONS` rows | — | **+3**: `address-lookup-result`, `wizard-save-state`, `request-action-refusal` |
| The header's measured `aria-live` arithmetic (`:344-368`) | 13 by text / 7 by AST | **re-measure** — 13-08 recorded that this arithmetic drifts |

> ### 🚩 **`live-regions.test.tsx:491` goes RED when the exclusion list reaches zero.**
> ```js
> expect(LIVE_REGION_EXCLUSIONS.length).toBeGreaterThan(0);
> ```
> The UI-SPEC's falsifiable #1 is `LIVE_REGION_EXCLUSIONS.length === 0`. **These two cannot both hold.**
> The test at `:488-506` ("declares an exclusion list, and every exclusion names its owning phase") must be
> rewritten in the same commit: the vacuity guard it was protecting (a gutted list making the `why` filter
> trivially green) needs a different expression once the correct state is empty — e.g. assert the list is
> empty **and** that the reason-shape filter still works against a fixture. `:492-493`'s regex
> `/Phase\s+1[34]/` also stops having anything to match.

⚠ **Unbudgeted live regions on Phase-14 surfaces.** Two exist today and neither is in the declared set nor
the exclusion list: `[VERIFIED: grep over the four trees, this session]`

| Site | Shape | Why it matters |
|---|---|---|
| `src/components/listing/photo-uploader.tsx:226` | `<p role="status">` with **no accessible name** | Renders on the wizard's `photos` step — a Phase-14 surface. UI-SPEC falsifiable #2 (*"every `role="status"` on the Phase-14 surfaces resolves to a non-empty accessible name"*) catches it. `role="status"` is nameFrom:author, so it needs an `aria-label`. |
| `src/components/availability/blocks-editor.tsx:319` | `<p role="alert">` | `role="alert"` is **implicitly assertive**. UI-SPEC falsifiable #3 bans `aria-live="assertive"` on the five surfaces; a plan writing that as an attribute-only grep will miss it, and a plan writing it honestly will catch it. |
| `src/components/availability/weekly-hours-editor.tsx:276` | `<p className="text-sm text-destructive" role="alert">` | Same. Also the availability tree's one alarm-token occurrence — see the census below. |

**Neither is in the UI-SPEC's `LIVE_REGIONS` +3 budget.** The plan must either widen the budget or scope
the falsifiable assertions so they say what they actually check.

### G10 — `tests/design/selector-contract.test.ts` (536 lines)

Two directions, both asserted:
- Every `data-testid` rendered anywhere in `src/` must be in `SELECTOR_IDS` — **an undeclared hook is a
  failure, not a review comment**.
- Every declared id must be rendered somewhere in `src/` (`:442-462`) — a declared-but-absent id fails.

`SELECTOR_IDS` holds **41** ids today `[VERIFIED: node count of the const tuple]`; the floor is 17
(`:359`). The UI-SPEC's 9 new ids must be **declared and rendered in the same commit**, each with a `why`
and an `owner` (`selector-contract.ts:210-226`).

Also pinned: `GET_BY_ROLE_FLOOR = 92`, `GET_BY_LABEL_FLOOR = 30` over `e2e/` (`:228-229`) — **floors, so
coverage may only go up.** New host e2e specs help; deleting role queries hurts.

### G11 — `tests/design/skeleton-measurements.test.ts` (521 lines)

Scoped to `src/components/patterns/*skeleton*.tsx`. **Every height/width/size/aspect in those three files
must come from `src/lib/design/measurements.ts`; a literal is a failure** (`:383-398`). So if M1/M2 conclude
that `RowListSkeleton` needs a second height, the constant goes in `measurements.ts` — never inline.

`RowListSkeleton` today takes `label` and `rows` (default 4) and hard-wires
`cn(ROW_CARD_HEIGHT, "w-full rounded-xl")` (`row-list-skeleton.tsx:17-40`). **It has no height prop.**

### G12 — `tests/design/loading-coverage.test.ts` (680 lines)

`EXPECTED_PAGES = 29`, `EXPECTED_QUALIFYING = 21`, `EXPECTED_NON_QUALIFYING = 8` (`:204-206`). This phase
adds **no route**, so all three stay. ✓

### G13 — `tests/design/contrast.test.ts` (287 lines) + `src/lib/design/contrast-pairs.ts`

The UI-SPEC's one edit is **amending two `reason` fields** on the `muted`/`background` (`:451-457`) and
`muted`/`card` (`:458-464`) exclusion rows to name the hours-strip track as a second non-informational
fill. **`CONTRAST_PAIRS` is unchanged and `contrast.test.ts` needs no edit.**

### G14 — `tests/design/blocking-session-gate.test.ts` (629 lines)

`:179` pins `{ label: "src/app/(host)/host/layout.tsx", redirects: 2, canHostGuard: true }`. This phase
does not touch the layout — but it also asserts (`:95-107`) that the three ambient reads are **not** inlined
back into the layout. A D-140 read added in the layout instead of the page would fail here.

### G15 — Others confirmed green and untouched

`sheet-absent.test.ts` (533) · `focus-recipe.test.ts` (840, 0 host references) ·
`price-surface.test.ts` (902, 0 host references) · `pending-copy.test.ts` (407, 0) ·
`reversed-copy.test.ts` (561, 0) · `sticky-offset.test.ts` (491 — pins the `lg:sticky lg:top-20` site count
at **1**, which is `panel-card.tsx`; D-149 uses PanelCard's `sticky` prop, so it stays 1) ·
`theme-tokens.test.ts` · `error-boundaries.test.ts:193` (pins `src/app/(host)/host/error.tsx`).

### The destructive-token census — the true baseline

The UI-SPEC's acceptance #39 reads *"Zero **new** `destructive` tokens under `src/app/(host)/**`,
`src/components/host/**` and `src/components/availability/**`; **the two pre-existing occurrences** are
unchanged."* **Measured, comments stripped with the repo's own `stripComments`:** `[VERIFIED: this session]`

| File | `text-destructive` | `border-destructive` | `variant="destructive"` |
|---|---|---|---|
| `src/app/(host)/**` | **0** | 0 | 0 |
| `src/components/host/payout-banner.tsx` | 2 | 0 | 1 |
| `src/components/host/payout-state-badge.tsx` | 1 | 1 | 1 |
| `src/components/host/host-cancel-dialog.tsx` | 1 | 0 | 0 |
| `src/components/availability/weekly-hours-editor.tsx` | 1 | 0 | 0 |
| **Total in the three named trees** | **5** | **1** | **2** = **8 spellings, 4 files** |

Outside those trees but on Phase-14 surfaces: `listing/photo-uploader.tsx` 2 ·
`listing/address-autocomplete.tsx` 1 (the UI-SPEC's discharge explicitly keeps it) ·
`listing/listing-card.tsx` 1 · `booking/request-countdown.tsx` 1.

> **A plan writing acceptance #39 as a zero-count scan over those three trees goes red on the first run.**
> Write it as a **pinned per-file map**, the shape `EXPECTED_SURVIVING_ACCENT_LINES` and
> `DECLARED_SITES` already use, with the eight measured occurrences as the baseline.

### Direct `ui/dialog` composers — and a CONTEXT correction

`[VERIFIED: grep -rln 'from "@/components/ui/dialog"' src/, this session]`

| File | Phase-14 disposition |
|---|---|
| `src/components/host/request-row.tsx` | **converted** (D-145) |
| `src/components/availability/blocks-editor.tsx` | **converted** (D-155) |
| `src/components/listing/listing-card.tsx` (a local `ConfirmDialog`, two triggers) | ⛔ **not named for conversion** — host tile, Claude's-discretion says it stays as it is |
| `src/components/host/host-cancel-dialog.tsx` | ⛔ **not named for conversion** |
| `src/components/booking/cancel-request-dialog.tsx` | booker |
| `src/components/group/{regenerate-link,remove-attendee}-button.tsx` | deferred `13-08`'s pair |
| `src/components/listing/photo-lightbox.tsx` | deliberate (lightbox) |
| `src/components/ui/command.tsx` | vendored |

> ⚠ **14-CONTEXT D-145 says `ResponsiveDialog` is "already used by the host cancel dialog". Measured: it is
> not.** `src/components/host/host-cancel-dialog.tsx:37` imports `ui/dialog` directly. There is **no
> host-side `ResponsiveDialog` precedent today** — `request-row.tsx` will be the first. The booker-side
> adopters (`booking-panel.tsx`, `booking-sticky-bar.tsx`, `service-fee-popover.tsx`, `key-facts.tsx`,
> `photo-gallery.tsx`, `photo-lightbox.tsx`, `site-chrome.tsx`) are the worked examples to copy from.

---

## Measurements Owed — M1…M5, measured

**Method:** `[11-08]`'s own harness, reproduced — `compileGlobalsCss()` / `compileGlobalsCssWith()` from
`tests/design/helpers/compile-css.ts` for the real stylesheet, class strings passed through the repo's own
`cn()` so tailwind-merge decides which utility survives, rendered in Playwright Chromium **148.0.7778.96**.

**Harness validated:** the "pre-11-08 shape with 48px media + status + trailing" case measures **112px** at
every width — byte-for-byte the number `[11-08]` and `row-card.tsx:152` publish. A harness that reproduces
the one published figure is a harness whose other figures can be trusted.

### M1 / M2 — row heights vs the 80px skeleton

| Case | 320px | ≥640px | vs `ROW_CARD_HEIGHT` (80px) |
|---|---|---|---|
| Bare `RowCard` (title + meta only) | 72 | **72** | −8 |
| **(a) Agenda row** — `status`, no `actions`, no body | **92** | **72** | **+12 at 320, −8 at desktop** |
| Booker booking row — 48px `media` + `status` + `trailing`, no body | 92 | **80** | **0 ✓** |
| **(c) Host booking row** — `status` + `trailing` + `<dl>` + `sm` actions | **190** | **174** | **+94** |
| **(b) Request row, as shipped** — `<dl>` + inline countdown + `sm` actions | **206** | **206** | **+126** |
| **(b′) Request row, Phase-14 shape** — `lead` countdown in `status` + `<dl>` + `touch` actions | **206** | **186** | **+106** |
| Pre-11-08 media row (the `[11-08]` control) | 112 | 112 | — |
| `RowListSkeleton` bar | 80 | 80 | — |

**What this changes about the phase's own reading of `[11-08]`.**
`[11-08]`'s *"pure win at adoption"* is true **only of the 48px-media resting configuration**, and its own
closing note says so. The three host rows **have already adopted** `RowCard` (`request-row.tsx:179`,
`host-booking-row.tsx:74`, `payout-row.tsx:46`) and `RowCard` already carries `py-0`
(`row-card.tsx:166`) — so the 112-vs-80 defect is **already discharged on the host side**. The live
mismatch is the opposite one and it is much larger: **a shipped host row with a body and actions is 174–206px
against an 80px skeleton.** `requests/loading.tsx:27` and `bookings/loading.tsx` both draw that 80px bar.

**M2's answer:** one 80px skeleton cannot serve three shapes that differ by 134px. Options, in preference
order:
1. Give `RowListSkeleton` an optional `height` prop taking a **declared** `measurements.ts` constant
   (`HOST_REQUEST_ROW_HEIGHT`, `HOST_BOOKING_ROW_HEIGHT`), and pass it from each `loading.tsx`.
   `skeleton-measurements.test.ts` permits this — it bans *literals*, not constants.
2. Reduce `rows` on the host plates so total plate height ≈ total list height (cheaper, less honest).
3. Accept and **record** the delta with the measured numbers in a test. The UI-SPEC's own falsifiable
   (`|rendered − skeleton| ≤ 4px`) is **not satisfiable** at 174–206px without option 1.

⚠ **Fidelity caveat.** Cases (a), the media row and the pre-11-08 control are exact reconstructions of
shipped markup. Cases (b), (b′) and (c) reconstruct the `<dl>`, the countdown and the action buttons from
their real class recipes (`ui/button.tsx:104` `size="sm"` = `h-7`; `:113-114` `size="touch"` = `h-11`;
`ui/badge.tsx:19` = `h-5`) but are not the components themselves. **Treat ±8px as the error bar and
re-measure against the rendered route before writing the numbers into a test.**

### M3 — does the 9-marker rail wrap at 320px?

**No.** `[VERIFIED: Playwright, this session]`

| Viewport | `<ol>` width | `<ol>` height | marker box | wrapped? |
|---|---|---|---|---|
| 320 | 288px | **24px** | 24×24 | **false** |
| 360 | 328px | 24px | 24×24 | false |
| 768 / 1024 / 1280 | 736px | 24px | 24×24 | false |

9 × 24 + 8 × 8 = **280px** against 288px of content width inside `max-w-3xl px-4`. It fits with 8px to
spare, on one line, at the 320px floor. No collision with the `Progress` bar above it. **The `flex-wrap`
second-line contingency the UI-SPEC hedges about does not arise.**

### M4 — the strip's per-column width at 320px

**The UI-SPEC's arithmetic is off, because it forgot the panel's own horizontal padding.**
`[VERIFIED: Playwright, this session]`

| Viewport | grid width | column width | track height | one-hour bar |
|---|---|---|---|---|
| **320** | **256px** | **33.14px** | 160px | **6.66px** |
| 360 | 296px | 38.84px | 160px | 6.66px |
| ≥768 | 704px | 97.14px | 160px | 6.66px |

The UI-SPEC predicts `(288 − 24) ÷ 7 ≈ 37.7px`. Measured: **33.14px** — the strip sits inside a `PanelCard`,
whose `CardContent` adds `px-4` (32px) on top of the shell's `px-4`. So at 320px the smallest thing the
strip draws is **33.14 × 6.66px**. That is a visible mark, but it is 12% narrower than the spec assumed.
**Whether it is *legible* is a human call and belongs in manual UAT, not in a number.**

Two further facts the plan should know:
- `HOUR_OPTIONS` is `00:00`…`23:00` only (`weekly-hours-editor.tsx:57-62`), so **no window can close at
  midnight** and the tallest possible bar is 23/24 = 95.8% of the track. The strip never fills a column.
- All times are on the hour (`hourOnly` in `weeklyHoursSchema`), so every `top`/`height` percentage is
  `n/24 × 100` for integer `n`. No sub-hour arithmetic.

### M5 — the wizard's form column at exactly 1024px

`[VERIFIED: Playwright, this session]` — **form column = 672px, aside = 288px.** Exactly the UI-SPEC's
arithmetic (1024 − 32 − 288 − 32). Confirmed at the `lg` boundary itself (Tailwind `lg` = 64rem = 1024px,
so the two-column grid engages at 1024 inclusive).

**Not measured:** whether the address step's two-column fields survive 672px. That needs the real form
rendered with real field widths, which needs a running app and a seeded draft listing. **Flagged, not
estimated.**

### A tooling limitation the plan will hit

`compileGlobalsCssWith`'s safelist character check (`tests/design/helpers/compile-css.ts:213`) is
`/^-?[a-z0-9][a-z0-9:/._()[\]%-]*$/` — **it rejects a comma**. So
`lg:grid-cols-[minmax(0,1fr)_18rem]` **cannot be safelisted**, and any design test that wants to assert the
wizard's grid template against the compiled stylesheet must either widen that regex (with the security
argument the docstring at `:196-211` demands) or assert the class string in source rather than in CSS.
`[VERIFIED: the helper threw on it, this session]`

---

## The visual-regression baseline situation — declared and blocked, but less blocked than 13-15 was

### What `e2e/visual/` contains today `[VERIFIED: ls, this session]`

```
e2e/visual/
├── freeze.css
├── surfaces.spec.ts
├── theme-swap.spec.ts
└── surfaces.spec.ts-snapshots/   ← 30 committed PNGs, ALL "-court-visual-linux"
```

The 30 committed baselines cover: auth-login (2), booking-not-found, checkout (2), collision-notice,
dev-theme (3), listing-detail (3), listing-lightbox, listing-sheet, og-{invite,listing,root},
privacy (3), root-not-found (2), search-relax-band (2), search-results (3), terms (3).
**Zero host surfaces are baselined today.**

### How baselines are generated

| Fact | Evidence |
|---|---|
| `updateSnapshots: "none"` | `playwright.config.ts:78` |
| The `visual` project is **not constructed off Linux** | `playwright.config.ts:39` `RUN_VISUAL_PROJECT = process.platform === "linux"`; this box is **win32**, so `--project=visual` does not exist here |
| Pinned image | `mcr.microsoft.com/playwright:v1.60.0-noble` (`playwright.config.ts:29`). Local CLI is **1.60.0** ✓ |
| Projects are disjoint | `chromium` matches `e2e/*.spec.ts` (top level only); `visual` matches `e2e/visual/**` (`:94`, `:104`) |
| Retries | `process.env.CI ? 2 : 0` (`:82`) |

### What the fixture already gives Phase 14 — and this is the good news

`scripts/seed-baseline-fixtures.ts` (347 lines) **already seeds a host.**
`[VERIFIED: read, this session]`

| Already there | Line |
|---|---|
| `VRT_HOST_ID = "vrt_host_1"`, first name **"Vera"**, `can_host = true`, `email_verified = true` | `:94`, `:189-193` |
| An **activated** `host_payout` row (`activation_status='activated'`, `payouts_enabled=true`) | `:197-200` |
| **5 published listings** owned by that host, with photos, operating hours and activity tags | `:159-170`, `:208-260` |
| A **frozen clock** `VRT_CLOCK_ISO = "2026-09-15T04:00:00Z"` the spec must install | `:75` |
| Fixed-literal ids throughout; `reset()` deletes every `vrt_%` row FK-safely | `:11-16`, `:181-187` |
| Committed local photo assets under `public/vrt/photo-{0..7}.svg` | `:30-37` |
| An auth path a drive can reuse — `signUpBooker(page, seed)` inside `bookingNotFoundDrive` | `visual-drive.ts:840-852` |
| A **host** UI-signup helper already written | `e2e/shell.spec.ts:168-182` `signUp(page, "host")` |

### What a Phase-14 host fixture still needs

| Missing | Shape |
|---|---|
| **The signed-in user must BE `vrt_host_1`** | The `13-15` recipe, mirrored: sign up a host through the UI, then `UPDATE listing SET host_id = <new id> WHERE id LIKE 'vrt_%'` (and the `host_payout` row), restoring both in `cleanup()`. Cheaper than the booker case because no FK-restricted `booking.booker_id` is involved on the listing side. |
| **Bookings with fixed literal instants** | `starts_at` inside `VRT_CLOCK_ISO`'s venue-local day for `host-dashboard-agenda`; a later fixed date for `host-dashboard-quiet`; **and a Manila-vs-other-zone pair straddling midnight** so the day-boundary test has a falsifying case |
| **A `requested` booking with a fixed `expires_at`** | for `host-requests-triage`, at a fixed remaining duration under the Playwright clock |
| **A booker identity that is a fixed literal** | agenda rows print the booker's **first name** (D-140), and `signUpBooker` mints a random email; the first name is what is in frame, so a fixed `first_name` on a seeded booker row is enough — **easier than the Phase-13 case, which printed the email** |
| **A listing with hours and one without** | for `host-availability-strip` and the hours-missing signal. `seedListing()` already writes `operating_hours` (`:254`); a `photos:0 / hours:none` variant is a new row in `LISTINGS` |

### Honest verdict

**Buildable, but not inside a single plan, and not verifiable on this machine.**

- The fixture work is real: a Phase-14 block in `seed-baseline-fixtures.ts`, a `hostDrive` factory in
  `e2e/helpers/visual-drive.ts` (which already has the two-parameter signature `13-15` added for exactly
  this), and nine rows in `src/lib/design/visual-baselines.ts`.
- **Nothing about it can be run here.** `playwright.config.ts:39` means the `visual` project does not exist
  on win32. Every step is verified in CI or not at all.
- **Recommendation, matching the UI-SPEC's own fallback:** declare all nine rows in `visual-baselines.ts`.
  Ship the **three that need no clock** unblocked if a fixture plan lands (`host-dashboard-none`,
  `host-requests-zero`, `host-availability-strip` — the strip is a pure function of saved hours, and
  inbox-zero needs no data at all). Declare the six clock-dependent rows **`blocked`** with the `13-15`
  reason per surface. **Do not commit a baseline captured against a live clock** — that is the failure
  `playwright.config.ts`'s D-28 comment exists to prevent, and `13-16` records a phase closing over a red
  GATE-01 because nobody noticed.

---

## Testing Seams

### Existing coverage of the five surfaces `[VERIFIED: grep + file reads, this session]`

| File | Lines | Covers | Phase-14 impact |
|---|---|---|---|
| **`tests/listing/wizard-occupancy.test.tsx`** | 349 | 10 cases. **(3) drop-in walks 8 steps** (`:219-228`), **(4) whole-space walks 9** (`:230-237`), (5) the review explanation, (6)/(7) the checklist mode fork, (8)/(9) the mode lock, (10) unchosen mode | **THIS IS D-151's GATE-NOREG COVERAGE.** It already exists and already passes. ⚠ Its helpers `heading()` (`:156-158`) use `getByRole("heading", { level: 1 })` — **which throws on multiple h1s** — and `advance()` (`:161-166`) queries `getByRole("button", {name: /Get started\|Save and continue/})`. Both survive `PageHeader` adoption (PageHeader emits one `<h1>`), but a second h1 anywhere breaks all 10 cases. |
| `tests/security/bookings-owner-scope.test.ts` | 255 | T-07-28 booker scope (`:140`), **T-07-28 host scope** (`:171`), T-07-29/30 independence + **`?listing=` cannot widen** (`:226`), empty-set case (`:238`) | GATE-NOREG 1 and 4. Untouched by a restyle; **re-run it** as proof. |
| `tests/booking/host-requests.test.ts` | 249 | `approveRequest` D-94 payment-window cap (2 cases), D-93 minimum-approve-window guard (3 cases) | GATE-NOREG 3. The server actions must be called identically. |
| `tests/booking/request-lifecycle.test.ts` | — | the request lifecycle | GATE-NOREG 3 |
| `tests/booking/host-booking-row.test.tsx` | 91 | T6 the host card's anchor + **"a `requested` row STILL renders Approve and Decline"** (`:72`); T8 cancelled-by truthfulness | Directly touched by any `HostBookingRow` edit. |
| `tests/availability/hours-lock.test.ts` | 432 | CR-03 layer 2, 5 cases | GATE-NOREG 7. Also the `AT TIME ZONE l.timezone` precedent's test. |
| `tests/booking/when-label.test.ts` | — | `composeWhenLabelShort` | GATE-NOREG 10 |
| `tests/booking/views.test.ts` · `booking-status.test.ts` | — | `queryHostBookings`, `deriveDisplayStatus` | The agenda's status derivation reuses these. |
| `tests/payments/earnings-view.test.ts` · `host-cancel.test.ts` | — | earnings + host cancel | HFLOW-05 freeze proof. |
| `tests/host/cancellation-fee-notice.test.tsx` | — | the fee notice | — |
| `tests/listing/listing-card.test.tsx` | — | the host tile | The Claude's-discretion "leave it alone" item. |
| `e2e/mode-switch.spec.ts` | — | `[data-host-dashboard]` visible (`:51`), `heading /your hosting/i` (`:52`), `[data-mode-switch]` (`:55`), booker redirected off `/host` (`:58`) | **D-143 must keep `data-host-dashboard` and a heading matching `/your hosting/i`.** |
| `e2e/shell.spec.ts` | — | `/host` header geometry per theme/width (`:385-405`), nav landmark count = 1, `signUp(page,"host")` helper (`:168`) | Host-shell geometry — untouched. |
| `e2e/overflow-320.spec.ts` | — | `TARGET_FLOOR_PX = 24` (`:554`); `(host)/host/error.tsx` in the route list (`:348`); a host signup path | **The 24px target-size floor the UI-SPEC's `STEP_MARKER_BOX` leans on.** |

### What is NOT covered today, and therefore what this phase must author

- **No test renders `/host` at all** beyond `mode-switch.spec.ts`'s two assertions. The agenda's three
  states, the day-boundary predicate and the "same N in three places" claim have **zero** existing coverage.
- **No test exercises the wizard's step rail** — `wizard-occupancy.test.tsx` walks forward via the advance
  button only. D-148's backward navigation, visited-by-key tracking and mode-switch case are all new.
- **No test asserts the save state** — the wizard's `persist()` failure path is untested end-to-end.
- **No test renders `WeeklyHoursEditor`** — `tests/availability/` covers the schema and the lock, not the
  editor component. `deriveWeekStrip` and its sr-only equivalent are entirely new coverage.
- **No test asserts the refusal path** of approve/decline in the DOM (only the server action's result).

---

## Local Verification Reality

### How the suites actually run here

| Command | What it is | Measured this session |
|---|---|---|
| `npm run test:design` | `vitest run --config vitest.design.config.ts` — **DB-free by design** (no `globalSetup`, no `setupFiles`) | **48 files, 816 passed / 3 skipped / 0 failed, 47.8s** |
| `npm test` | `vitest run` — `tests/**` minus `tests/design/**`; **requires Docker Postgres** (`globalSetup: tests/global-setup.ts` preflights `fitout_test`) | subset run: **98 files, 1031 passed, 116s** |
| `npm run build` | `lint && test:design && next build` — so a leak, an undeclared hook or a moved pin **fails the build** | — |
| `npx tsc --noEmit` | | **exit 0** |
| `npm run test:e2e` | `playwright test` — `chromium` project only on this box | see the flake note below |
| `--project=visual` | **does not exist on win32** (`playwright.config.ts:39`) | — |

**Timeouts are deliberately generous and the reasons are documented:** `hookTimeout: 120_000` (78 files
replaying migrations into isolated schemas share one Postgres) and `testTimeout: 20_000` (a jsdom re-render
was observed at 5384ms under multi-suite load) — `vitest.config.ts:44-64`. **Do not lower them to "make a
test fail faster".**

**Isolation is two layers** (`vitest.config.ts:14-27`): `tests/setup.ts` forces `DATABASE_URL` onto
`fitout_test`, and `tests/helpers/db.ts` gives each file its own `test_<pid>_<worker>_<n>` schema.
`global-setup.ts` prints a loud end-of-run report if anything escaped. **This session's run reported
`[test-db] clean: no writes escaped the per-file schema isolation this run.`**

### The DB-contention flake pattern — what a plan must say about its own verification

`[VERIFIED: .planning/phases/12-booker-path-search-listing-checkout/deferred-items.md, items 12-02, 12-03,
12-06, 12-10, 12-12]`

**The mechanism.** Five e2e spec files seed directly into one Postgres, each with its own
`postgres({ max: 1 })` client, under `fullyParallel: true`. Each is `serial` within itself but not across
files. The ceiling has been hit twice with `sorry, too many clients already`.

**The symptom family** — and it is timing-shaped, so it *reads* like a product defect:
- `write CONNECTION_ENDED`
- `toBeVisible` timeouts in **unrelated shipped specs** (`availability.spec.ts:261`,
  `hold-countdown.spec.ts`, `shell.spec.ts:558`)
- `<html …> intercepts pointer events` / `element was detached from the DOM` inside the **shared helper**
  `openSeededListing`, where it reads like a helper defect

**The measured signature** (`[12-03]`): four consecutive invocations of the *same* command with **no code
change** went `23 passed → 1 failed → 1 failed → 23 passed`, the last immediately after
`docker restart fitout-db-1`. Three different tests failed across those runs, two of them shipped and
untouched.

**Rules a Phase-14 plan should write into its own verification steps:**
1. **Name the exact spec files in the invocation.** Never `npx playwright test` bare when the result is
   going to be reported as a pass/fail on this phase's work.
2. **Cap it at ~3 DB-seeding spec files per invocation.** Adding a host-seeding spec makes six.
3. **A failure in a spec this plan did not touch is a flake until proven otherwise.** Re-run that file
   alone. If it passes alone, say so and move on.
4. **`docker restart fitout-db-1` is the documented reset.** Check connection count after.
5. ⚠ **`e2e/availability.spec.ts:261` is a STANDING RED, pre-existing, not a flake** — `[12-06]` measured it
   failing on three consecutive **isolated** invocations of its own file. `[12-08]` later concluded it is a
   **dev-mode artefact** that the production build does not have. **Do not report it as a Phase-14
   regression.**
6. `e2e/public-listing.spec.ts` is `mode: "serial"` with a known red near the top, so its later tests
   **skip**. Use `--grep` when that matters (`[12-02]`, `[12-08]`).

**The real fix, still unattempted:** a shared pool for the seeding specs, or `fullyParallel: false` scoped
to them (`[12-03]`, `[12-12]`). It is a change to `playwright.config.ts` and four shipped fixtures —
**out of scope for Phase 14**, but if a plan adds a sixth seeding spec it should say so in its summary.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---|---|---|---|
| "Is this session today?" | A JS date comparison in the RSC after fetching rows | The SQL predicate at `hours-lock.ts:86`'s shape | Two clocks, and it ships every row to filter it. |
| A venue-local window label | `format(startsAt, …)` at a new call site | `composeWhenLabelShort` | It was three verbatim duplicates before Phase 7 and `when-label.ts:36-40` carries a grep tripwire against a fourth. |
| "What time is it?" | `new Date()` | `readDbNow(db)`, once per request, threaded | GATE-NOREG 9; `hours-lock.ts:70-74` explains why a drifting server clock must not be able to unfreeze a weekday. |
| A pending-request count | A fourth query | The one predicate, already at three call sites | The nav badge, the signal row and the inbox must report the same N. |
| A responsive confirm overlay | `ui/dialog` + `max-sm:` classes at the call site | `ResponsiveDialog` | It already composes the same vendored Dialog and owns the bottom-sheet presentation. `sheet-absent.test.ts` exists to stop the alternative. |
| A "no rows" panel | A `border-dashed` box | `EmptyState` | `empty-state-adoption.test.ts` scans for `border-dashed` **and** pins the `<EmptyState>` call-site count, precisely because either alone is incomplete. |
| A page title block | `<h1>` + `<p>` | `PageHeader` | It guarantees exactly one `<h1>`, a wrapping (never truncating) title, and a wrapping actions cluster at 320px (`page-header.tsx:11-19`). |
| A card box | `<div className="bg-card ring-1 rounded-xl">` | One of the three patterns | A hand-rolled box is **invisible** to `card-pattern-coverage.test.ts` — the same defect wearing a disguise. |
| Hours validation in the strip | A second overlap check | `weeklyHoursSchema` + `occupiedRanges` | GATE-NOREG 6: one authority. The strip **draws**; it does not judge. |
| A skeleton height | `h-24` in the skeleton file | A constant in `measurements.ts` | `skeleton-measurements.test.ts:383-398` fails on a literal — and `:39-58` records that inlining the constant's *value* was caught. |
| Money arithmetic | `total - fee` on a host surface | `formatMoney(quotedTotalCents)` | `price-surface.test.ts` walks the AST for `+ − × ÷` on a money prop. |

**Key insight:** in this repository, "hand-rolling" is not a style failure — it is how a plan discovers, at
the end, that it has to modify a gate to make its own work pass. Every listed alternative exists because a
committed gate is already watching the shortcut.

---

## Common Pitfalls

### Pitfall 1 — a gate goes red for a reason with nothing to do with the design

**What goes wrong:** an obviously-correct refactor (extract a component, merge two branches, rename a
constant) moves a value a pinned inventory addresses **by file path**.
**Why it happens:** the gates deliberately pin per-file rather than per-total, because a bare total is
satisfiable by doing the right thing in the wrong place.
**How to avoid:** before writing a task that moves markup between files, grep the four inventory modules
(`accent-uses.ts`, `contrast-pairs.ts`, `live-regions.ts`, `selector-contract.ts`) and the five
path-pinning tests (`brand-recipe`, `status-vocab`, `empty-state-adoption`, `elevation-z`, `type-scale`)
for the source path. **Five such traps are named in § Committed Gates.**
**Warning signs:** a failure message about a count you did not think you changed.

### Pitfall 2 — a comment containing a banned token trips the grep that forbids it

**What goes wrong:** you write *"never use `bg-brand` here"* in a comment and the scan reads 2.
**Why it happens:** `brand-recipe`, `status-vocab` and `phase13-surface-gates` strip comments — but the
**leak** gate and ESLint do not, and `strip-comments.ts` is line-anchored in ways WR-02 had to fix.
**How to avoid:** name tokens descriptively in source prose. `wizard.tsx:602-607` and
`host/page.tsx:118-129` are the two worked examples in the tree — the second records that it took **two
passes** to get right.
**Warning signs:** a count that is exactly one higher than expected, in a file you only commented.

### Pitfall 3 — the day-boundary answered in TypeScript

**What goes wrong:** rows are fetched, then filtered in the RSC with `date-fns`.
**Why it happens:** it looks simpler, and `@date-fns/tz` is right there.
**How to avoid:** the filter must be in the `WHERE`. Two reasons, both hard: (1) the clock must be the DB's,
and a JS filter re-introduces a second one; (2) an unfiltered fetch of a host's whole booking history to
show three rows is a read that grows without bound. **The predicate is written and measured in this
document — copy it.**
**Warning signs:** `startsAt.toDateString()` anywhere near the agenda.

### Pitfall 4 — the skeleton and the row disagree by more than anyone expected

**What goes wrong:** `RowListSkeleton` draws 80px bars over a list of 174–206px rows and the page jumps.
**Why it happens:** `[11-08]`'s "pure win at adoption" note is scoped to the **resting media** row, and
every host row in this phase has a `<dl>` and actions.
**How to avoid:** M1/M2 above. Do not assume 80px.
**Warning signs:** a plan that says "the skeleton already matches".

### Pitfall 5 — `RequestActions` is edited for one surface and changes two

**What goes wrong:** `size="sm"` → `size="touch"` for the inbox also grows the buttons in
`/host/bookings`'s desktop table.
**Why it happens:** `bookings/page.tsx:265-271` renders the same component for `requested` rows.
**How to avoid:** decide deliberately. `tests/booking/host-booking-row.test.tsx:72` asserts the host card
still renders both controls, so the coupling has a test.
**Warning signs:** a plan whose `files_modified` lists `request-row.tsx` but not `bookings/page.tsx`.

### Pitfall 6 — two announcements for one outcome

**What goes wrong:** an in-row `role="status"` is added **and** the `toast.error` is left in place.
**Why it happens:** deleting a shipped toast feels like scope creep.
**How to avoid:** GATE-03 rule 6. The UI-SPEC is explicit: `request-row.tsx:90` and `:108` are removed;
`wizard.tsx:402` and `:413` are removed; the four toasts that **precede a navigation** survive.
**Warning signs:** a falsifiable that says "renders one `role="status"`" without also asserting **zero**
`toast.error` calls.

### Pitfall 7 — the wizard's `persist()` throws away the sentence D-150 needs

**What goes wrong:** the save-state region shows a generic "Couldn't save".
**Why it happens:** `persist()` returns `boolean` (`wizard.tsx:399-406`) and fires the toast itself, so
`res.error` is gone by the time the caller sees `false`.
**How to avoid:** change `persist()` to return the `ListingResult` and let the three callers decide. That
is a three-line signature change plus three call-site updates (`:410`, `:420`, `:430`).
**Warning signs:** a task that adds the region without touching `persist`'s return type.

---

## Runtime State Inventory

> Included because Phase 14 is a refactor of shipped surfaces, not greenfield. **Every category below was
> checked; none is left blank.**

| Category | Items found | Action required |
|---|---|---|
| **Stored data** | **None.** Phase 14 writes nothing new. The agenda read is a `SELECT`; `saveListingStep`, `saveOperatingHours`, `approveRequest` and `declineRequest` keep their exact current semantics (D-130). No column, no enum value, no row shape changes. `[VERIFIED: the phase adds one read and zero writes]` | none |
| **Live service config** | **None.** No n8n workflow, no Inngest function, no cron and no webhook endpoint touches these five surfaces. `checkout-retire-sweep` and the request-expiry function are Phase 13.1's and are untouched. | none |
| **OS-registered state** | **None.** No Task Scheduler entry, pm2 process or systemd unit references a host UI surface. | none |
| **Secrets / env vars** | **None new.** `NEXT_PUBLIC_APP_URL` is unset (deferred `[11-14]`) but affects share URLs, not host tooling. The design suite is DB-free and secret-free by construction (`vitest.design.config.ts:11-24`). | none |
| **Build artifacts / committed binaries** | ⚠ **30 committed baseline PNGs** under `e2e/visual/surfaces.spec.ts-snapshots/`. None is a host surface, so **no existing baseline should move**. If one does after a Phase-14 commit, that is a regression on a **booker** surface, not a Phase-14 deliverable — investigate rather than re-mint. `[13-16]` records a phase closing over a red GATE-01 with nobody noticing. | verify-only; never re-mint to green |
| **Stylesheet output** | The compiled CSS is a function of what `src/` uses. Retiring the wizard's `done`-marker accent branch **removes nothing** from the sheet (`bg-brand` still ships for the current marker); adding `h-40` **adds** one utility. Neither is asserted anywhere. `[VERIFIED: compileGlobalsCss emits only used utilities — the h-40 probe returned 0 height until safelisted]` | none |

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node | everything | ✓ | v24.13.0 | — |
| npm | everything | ✓ | 11.8.0 | — |
| Docker | the integration suite's Postgres | ✓ | 29.6.1 | — |
| PostgreSQL + PostGIS | `tests/**` (not `tests/design/**`) | ✓ | `postgis/postgis:18-3.6`, container `fitout-db-1`, **up 46h** | — |
| `fitout` + `fitout_test` databases | dev + test | ✓ | both present | `npm run db:test:setup` |
| Playwright CLI | e2e | ✓ | **1.60.0** — matches the pinned CI image exactly | — |
| Playwright **chromium** browser | e2e + the measurement harness | ✓ | 148.0.7778.96 | — |
| `--project=visual` | GATE-01 baselines | ✗ | — | **None. Linux-only by design** (`playwright.config.ts:39`). CI is the only place. |
| `psql` binary on the host | ad-hoc SQL | ✗ | — | `docker exec fitout-db-1 psql -U fitout -d fitout` (used throughout this research) |
| `@tailwindcss/cli` | — | ✗ | — | `tests/design/helpers/compile-css.ts` compiles via `@tailwindcss/postcss` in-process |
| ngrok / cloudflared | PayMongo webhooks | not checked | — | irrelevant — this phase touches no payment path |

**Missing with no fallback:** the `visual` Playwright project. **Every visual-regression claim in this phase
must be verified in CI, never locally.** A plan that says "run the baselines" as a local verification step
is unexecutable on this machine.

**Missing with a fallback:** `psql` (use `docker exec`), a Tailwind CLI (use the in-repo compiler).

---

## Validation Architecture

### Test framework

| Property | Value |
|---|---|
| Unit / integration / component | **Vitest 4.1.8**, `vitest.config.ts` (node env; jsdom per-file via `// @vitest-environment jsdom`) |
| Design gate | **Vitest**, `vitest.design.config.ts` — **DB-free, build-blocking** |
| E2E | **Playwright 1.60.0**, `playwright.config.ts`, project `chromium` |
| Visual regression | **Playwright**, project `visual` — **Linux-only, CI-only** |
| Quick run (design) | `npm run test:design` — **47.8s, 816 tests** |
| Quick run (a touched dir) | `npx vitest run tests/listing` |
| Full suite | `npm test` (needs Docker) · `npm run test:design` · `npx tsc --noEmit` |
| Build gate | `npm run build` = `lint && test:design && next build` |

### Phase requirements → test map

| Req | Behaviour to validate | Type | Automated command | Exists? |
|---|---|---|---|---|
| HFLOW-03 | The venue-local `today` predicate is right for a two-zone host straddling midnight | integration (real Postgres) | `npx vitest run tests/booking/agenda-query.test.ts` | ❌ **Wave 0** |
| HFLOW-03 | The agenda read is owner-scoped in the `WHERE`; a foreign host's rows are unselectable | integration / security | `npx vitest run tests/security/bookings-owner-scope.test.ts` (extend) | ⚠ extend |
| HFLOW-03 | D-142's "next" row comes from the same statement (one round trip) | integration | same file as the predicate test | ❌ Wave 0 |
| HFLOW-03 | Three states render, each with its own hook, none absent | component (jsdom) | `npx vitest run tests/host/agenda-states.test.tsx` | ❌ Wave 0 |
| HFLOW-03 | Exactly one accent-filled element on `/host`; `variant="brand"` host total stays 5 | design gate | `npm run test:design -- brand-recipe` | ✅ (pin must not move) |
| HFLOW-03 | The nav badge, the signal row and the inbox report the same N | e2e | `npx playwright test e2e/host-dashboard.spec.ts --project=chromium` | ❌ Wave 0 |
| HFLOW-01 | Countdown digits are strictly the largest computed `font-size` in the row at 320/768/1280 | e2e | `npx playwright test e2e/host-inbox-hierarchy.spec.ts --project=chromium` | ❌ Wave 0 |
| HFLOW-01 | Zero `<a>` / `[role=link]` inside a request row (D-144) | component | `npx vitest run tests/host/request-row.test.tsx` | ❌ Wave 0 |
| HFLOW-01 | `RequestCountdown` base rendering is byte-identical; the `lead` branch adds no alarm token | unit + design gate | `npx vitest run tests/booking/request-countdown.test.tsx` + `npm run test:design -- phase13-surface-gates` | ✅ both exist |
| HFLOW-01 | A refused approve renders one `role="status"` with the server's sentence and **zero** `toast.error` | component | `npx vitest run tests/host/request-refusal.test.tsx` | ❌ Wave 0 |
| HFLOW-01 | Approve/decline server semantics unchanged | integration | `npx vitest run tests/booking/host-requests.test.ts tests/booking/request-lifecycle.test.ts` | ✅ |
| HFLOW-01 | Inbox-zero adopts `EmptyState`, one `text-success` glyph, zero `bg-success` | design gate | `npm run test:design -- empty-state-adoption` | ✅ |
| HFLOW-02 | **D-151 — 8 markers / `of 8` drop-in; 9 / `of 9` whole-space** | component | `npx vitest run tests/listing/wizard-occupancy.test.tsx` | ✅ **cases (3)+(4)** |
| HFLOW-02 | Visited-by-**key** survives a mid-flow mode switch | component | `npx vitest run tests/listing/wizard-rail.test.tsx` | ❌ Wave 0 |
| HFLOW-02 | Exactly one accent marker per render, never a `<button>`; `brand-recipe` unedited | component + design gate | `npx vitest run tests/listing/wizard-rail.test.tsx` + `npm run test:design -- brand-recipe` | ⚠ half |
| HFLOW-02 | Every visited marker has a non-empty accessible name and a ≥24×24 box; zero future markers in tab order | component (`dom-accessibility-api`) | `npx vitest run tests/listing/wizard-rail.test.tsx` | ❌ Wave 0 |
| HFLOW-02 | `publish-checklist` appears **exactly once** per document at every step, both modes, 3 widths | component + e2e | `npx vitest run tests/listing/publish-checklist.test.tsx` | ❌ Wave 0 |
| HFLOW-02 | Save state reads the real result; **zero `setTimeout` on the save path**; failure shows the server's sentence | component | `npx vitest run tests/listing/wizard-save-state.test.tsx` | ❌ Wave 0 |
| HFLOW-04 | `deriveWeekStrip` returns 7 entries for every input incl. `[]`; `segments.length` matches the ranges in `sentence`; `sentence` ends in `closed` iff empty | **unit (pure, fast)** | `npx vitest run tests/availability/week-strip.test.ts` | ❌ Wave 0 |
| HFLOW-04 | Changing one `openTime` changes that day's sr-only sentence with **zero network calls** | component | `npx vitest run tests/availability/week-strip.test.tsx` | ❌ Wave 0 |
| HFLOW-04 | Strip grid computes `aria-hidden="true"`; a11y tree has 7 sentences and 0 bars | component | same file | ❌ Wave 0 |
| HFLOW-04 | `ALLOWED_RAW_CARD` loses both rows; `CARD_SURFACES` 13 → 15; `ADOPTERS` 13 → 14 | design gate | `npm run test:design -- card-pattern-coverage empty-state-adoption` | ✅ (pins move) |
| HFLOW-04 | Tab partition, `?listing=`, page size, cursor and the owner-scoped `WHERE` unchanged | integration | `npx vitest run tests/security/bookings-owner-scope.test.ts tests/booking/views.test.ts` | ✅ |
| HFLOW-04 | `saveOperatingHours` overlap + on-the-hour validation unchanged | integration | `npx vitest run tests/availability` | ✅ |
| HFLOW-05 | Only the shell constant, `PageHeader` and type-role classes changed; **every string literal unchanged** | design gate (AST) | `npm run test:design -- earnings-freeze` | ❌ Wave 0 |
| Cross | Exactly one `<h1>` per document on all five surfaces, every state, both modes; all five compute the same `font-size` | e2e | `npx playwright test e2e/host-headings.spec.ts --project=chromium` | ❌ Wave 0 |
| Cross | `scrollWidth <= clientWidth` at 320px; every control ≥ 24px; every primary ≥ 44px | e2e | `npx playwright test e2e/overflow-320.spec.ts --project=chromium` (extend `ROUTES`) | ⚠ extend |
| Cross | `LIVE_REGION_EXCLUSIONS.length === 0`; every `role="status"` on the five surfaces has a name; zero assertive | design gate | `npm run test:design -- live-regions` | ⚠ **test at `:491` must be rewritten** |
| Cross | Row heights within the measured tolerance of the skeleton | e2e | `npx playwright test e2e/skeleton-geometry.spec.ts --project=chromium` (extend) | ⚠ extend |
| Cross | `drizzle/` unchanged; `HOST_NAV_IDS` unchanged; `loading-coverage` at 29/21/8 | design gate + `git diff --stat drizzle/` | `npm run test:design -- loading-coverage` | ✅ |
| Cross | Nine baselines | **visual, CI-only** | `--project=visual` in the pinned Linux image | ❌ **blocked/declared** |

### Sampling rate

- **Per task commit:** `npm run test:design` (48s) **+** `npx vitest run <the touched dir>`. If the task
  touched a gated inventory, name the specific gate: `npm run test:design -- <name>`.
- **Per wave merge:** `npx tsc --noEmit` **+** `npm run test:design` **+**
  `npx vitest run tests/listing tests/host tests/booking tests/availability tests/security`
  (measured baseline: **98 files / 1031 tests / 116s**).
- **Per wave merge, e2e:** at most **three** named spec files per Playwright invocation (see § the flake
  pattern). Never a bare `npx playwright test`.
- **Phase gate:** `npm run build` green (which runs lint + the design suite + `next build`), the full
  `npm test` green, and a **CI** run for GATE-01. A phase must not close on a locally-green design suite
  alone — `[13-16]` is the record of what that costs.

### Wave 0 gaps

- [ ] `tests/booking/agenda-query.test.ts` — the day-boundary predicate against real Postgres, **including
      the two-zone straddling-midnight fixture** (HFLOW-03 / D-141)
- [ ] `tests/host/agenda-states.test.tsx` — the three agenda states + their hooks (HFLOW-03)
- [ ] `tests/host/request-row.test.tsx` — D-144 terminality, D-146 hierarchy in the DOM (HFLOW-01)
- [ ] `tests/host/request-refusal.test.tsx` — one region, zero error toasts (HFLOW-01)
- [ ] `tests/listing/wizard-rail.test.tsx` — visited-by-key, accessible names, tab order, mode switch (HFLOW-02)
- [ ] `tests/listing/publish-checklist.test.tsx` — exactly one instance per document (HFLOW-02)
- [ ] `tests/listing/wizard-save-state.test.tsx` — real result, no timer (HFLOW-02)
- [ ] `tests/availability/week-strip.test.ts` — the pure derivation (HFLOW-04)
- [ ] `tests/availability/week-strip.test.tsx` — the rendered strip + sr-only equivalent (HFLOW-04)
- [ ] `tests/design/earnings-freeze.test.ts` — the AST string-literal freeze (HFLOW-05)
- [ ] `e2e/host-inbox-hierarchy.spec.ts` — computed `font-size` comparison at three widths (HFLOW-01)
- [ ] `e2e/host-dashboard.spec.ts` — the three-consumer N and the agenda without a second click (HFLOW-03)
- [ ] `e2e/host-headings.spec.ts` — one `<h1>` per document, five surfaces (cross-cutting)
- [ ] **Inventory amendments** (not tests, but Wave-0-shaped because everything else depends on them):
      `measurements.ts` +5, `selector-contract.ts` +9, `live-regions.ts` rename + 3 rows + exclusion → 0 +
      the type-alias rename, `accent-uses.ts` entry 7 `device`, `contrast-pairs.ts` two `reason` fields
- [ ] **Framework install:** none — Vitest and Playwright are both present and current

---

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"`
`[VERIFIED: .planning/config.json]`

### Applicable ASVS categories

| Category | Applies | Standard control in this codebase |
|---|---|---|
| **V2 Authentication** | yes (inherited) | Better Auth sessions in Postgres. `auth.api.getSession({headers})` on every host page. **Unchanged by this phase.** |
| **V3 Session Management** | yes (inherited) | Same. The `(host)` layout redirects twice: no session → `/login`, no `canHost` → `/` (`blocking-session-gate.test.ts:179` pins `redirects: 2`). |
| **V4 Access Control** | **YES — the live one** | **Two independent gates + the `WHERE`.** Every new read D-140/D-142 adds inherits all three. The layout is **not** an authorization boundary for data (`bookings-query.ts:7-13`, T-06-23 / T-07-29). |
| **V5 Input Validation** | yes | `zod ^4.4.3` shared client/server: `draftSchema`, `publishSchema`, `weeklyHoursSchema`. `parseTab` and `parseCursor` treat `?tab=` / `?cursor=` as attacker-controlled and fail to a boring default (`bookings-query.ts:147-161`). |
| **V6 Cryptography** | no | Nothing in this phase touches a secret, a signature or a token. PayMongo's `Paymongo-Signature` path is untouched. |
| V7 Error handling / logging | yes | `(host)/host/error.tsx` is the shared boundary for all 11 host routes; `error-boundaries.test.ts:193` pins it. The refusal sentences come from the server action, never re-authored client-side. |
| V12 File upload | out of scope | `photo-uploader.tsx` is restyled at most; its signing path is untouched. |
| V13 API | yes | Server actions only; no new route handler. |

### Known threat patterns for this stack

| Pattern | STRIDE | Standard mitigation — and where it lives here |
|---|---|---|
| **IDOR via a crafted `?listing=`** | Information disclosure | The filter is applied **inside** the already-host-scoped predicate, so it can only narrow (`bookings-query.ts:301-302`, T-07-30). Tested at `tests/security/bookings-owner-scope.test.ts:226`. **The agenda read must follow the same shape.** |
| **Ownership moved from the `WHERE` to a page branch** | Elevation of privilege | Explicitly rejected once already (D-101). `14-UI-SPEC.md:1292-1294` names it as an anti-pattern. |
| **A layout treated as the data gate** | Elevation of privilege | Both gates required, per page. A new read added in `layout.tsx` would also fail `blocking-session-gate.test.ts`. |
| SQL injection | Tampering | Drizzle's `sql` template parameterises. ⚠ **`sql.raw()` exists in this tree** (`isoUtc` at `bookings-query.ts:135` takes a **column name**, not a value) — the agenda query must never pass user input through `sql.raw`. |
| **Stale/withheld PII leaking into a new surface** | Information disclosure | The agenda renders the booker's **first name only**, with `"A guest"` as the withheld fallback — the same fallback `request-row.tsx` and `host-booking-row.tsx` already use. No email, no surname, no phone. |
| **Client-trusted money** | Tampering | `quotedTotalCents` is server-frozen and every host surface does zero arithmetic on it. `price-surface.test.ts` walks the AST. |
| **Client-trusted time** | Tampering | The DB clock, read once. A drifting server clock must not change what "today" means. |
| Undeclared `data-testid` leaking structure | Information disclosure (minor) | `selector-contract.ts` is a closed set; an undeclared hook is a compile/gate error. |

**No new attack surface.** This phase adds one owner-scoped `SELECT` and zero endpoints, zero writes, zero
new inputs. The `?listing=`, `?tab=` and `?cursor=` parameters are the only attacker-controlled inputs on
these surfaces and none of them changes.

---

## Phase boundary — do NOT absorb

Mirrors `12-RESEARCH.md`'s section. Each item below is a **named later phase**, not a judgement call.

| Do not absorb | Owner | Why it is not this phase |
|---|---|---|
| **The search-results map** | **Phase 18** | PROJECT D-136. Net-new capability. `listing-map.tsx` / `listing-map-panel.tsx` exist; leave them. |
| **Availability copy-to-all** | **Phase 19** | PROJECT D-136. It lands on the per-day row this phase restyles. **Leave the row's action area able to hold a per-day control; add no such control.** |
| **Auth screens, the profile page, the transactional-email shell** | **Phase 15** | AUTHUI-01/02/03, EMAIL-*. `card-pattern-coverage.test.ts:369-376` keeps four `ALLOWED_RAW_CARD` rows for the auth shells **for Phase 15** — do not spend them. TRUST-02's email-subject half and TRUST-03's confirmation-email half are also Phase 15's. |
| **Image crop / framing, avatar removal** | **Phase 16** | CROP-01…04. `photo-uploader.tsx` may be *restyled* if the wizard's photos step needs it; its **cropping** does not arrive here. |
| **The full axe pass · the 320px sweep across EVERY surface · flipping the leak tests advisory→blocking · the milestone audit** | **Phase 17** | GATE-*. This phase asserts 320px on **its own five surfaces** only. `[13-15]`'s `site-chrome.tsx` 16×16 `ProfileLink` finding is Phase 11 shell work and stays Phase 17's. |
| **The Phase-13 booking-surface baselines** | still `13-15`'s deferred item | Twenty `visual-baselines.ts` rows are declared-and-blocked on the Phase-13 fixture. **Do not build that fixture here** — build the *host* one if a plan takes it, and leave the booker rows blocked. |
| **The two group confirm overlays** (`regenerate-link-button.tsx`, `remove-attendee-button.tsx`) | deferred `13-08` | They are `ui/dialog` composers like `request-row.tsx`, and it is tempting to sweep all four. They are **group** surfaces. |
| **`e2e/playwright.config.ts`'s parallelism fix** (shared pool / `fullyParallel: false` for seeding specs) | `[12-03]` / `[12-12]`, unowned | Real and worth doing. It is a change to the config and four shipped fixtures. |
| **`e2e/availability.spec.ts:261`'s standing red** | `[12-06]` / `[12-08]`, dev-mode artefact | Do not chase it; do not report it as a Phase-14 regression. |
| **Making the host listing tile navigable** | rejected, recorded | Claude's discretion took option (a): correct the UI-SPEC's *Replaces* list. `listing-card.tsx` keeps its raw `<Card>` and its `ALLOWED_RAW_CARD` row. |
| **Restructuring earnings/payouts, a chart, a filter, a date range, a second payout state** | never (HFLOW-05 / D-156) | Those numbers have never moved real money; PayMongo `/v2` is sales-gated. `globals.css` deliberately removed the five `--color-chart-*` aliases so `npx shadcn add chart` would have to re-add a token family first. |
| **`NEXT_PUBLIC_APP_URL`** | environment, `[11-14]` | Not a code change. |

### 🚩 The zero-migration rule, restated as an executable check

**`drizzle/` does not move.** PROJECT D-136. `14-UI-SPEC.md:1249-1250` calls a proposed migration a **scope
alarm to be raised, not absorbed**.

Every plan in this phase should carry `git diff --stat drizzle/` returning **empty** as a verification step,
and any task that reaches for `drizzle-kit generate` should stop and escalate. The measured consequence of
the rule: the "today" predicate **cannot** be index-supported, and that is **accepted**, not worked around
(§ The "Today" Query).

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | The request row's `<dl>` + countdown + actions markup I reconstructed is faithful enough for the M1 heights (±8px) | M1/M2 | The skeleton-height decision uses a number ~8px off. **Mitigation:** the plan re-measures against the rendered route before writing numbers into a test — which the UI-SPEC already requires. |
| A2 | Extending `bookings-query.ts` (rather than a new module) is the right home for `queryHostAgenda` | § The "Today" Query | A larger module. Reversible; the argument is the file's own header. |
| A3 | The agenda's status set should be `NOT IN ('cancelled','declined')` — i.e. `tabPredicate("upcoming")`'s status half | § The "Today" Query | A cancelled session appearing on today's agenda, or a `pending` hold being hidden. **This is a product call the PM may want** — flagged in Open Questions. |
| A4 | Re-running the existing suites is sufficient GATE-NOREG proof for the untouched server actions | § Testing Seams | Under-proof. Low: the actions genuinely are not edited. |
| A5 | A host fixture can reuse `signUp(page,"host")` + an `UPDATE listing SET host_id` re-point | § Visual baselines | The drive is more complex than estimated. **Cannot be verified on this box at all** (`--project=visual` is Linux-only). |
| A6 | `role="alert"` on `blocks-editor.tsx:319` and `weekly-hours-editor.tsx:276` is in scope for the live-region work | § G9 | Either scope creep (if left) or an unbudgeted task (if taken). Measured, not assumed — the decision is the plan's. |
| A7 | 26 hours is a comfortable envelope for the optional UTC pre-filter | § The "Today" Query | A session on the far edge of a 25-hour DST day is missed. Very low: the maximum one-sided excursion measured was 23.00h, and the pre-filter is **optional** — the phase can ship without it. |

**Everything else in this document is `[VERIFIED]` against the tree, the running database or a rendered
browser in this session, or `[CITED]` to a committed planning artifact.**

---

## Open Questions (ALL RESOLVED — see the resolving plan/task on each)

> Resolved during planning on 2026-08-23. Q1 status set -> **14-02 T2**. Q2 the exclusion-list guard
> rewrite -> **14-14 T2**. Q3 the skeleton height prop -> **14-01 T1**. Q4 bar legibility at 320px ->
> **manual UAT**, recorded in `14-VALIDATION.md` § Manual-Only Verifications. Q5 the 672px form column
> -> **14-10 T2**'s M5 measurement obligation. Q6 `photo-uploader.tsx`'s unnamed region -> **14-14 T1**
> (fixed in this phase, which is what takes the exclusion list to zero). Q7 confirmed unchanged.

1. **Which booking statuses belong on the agenda?**
   - *What we know:* the row renders `BookingStatusBadge side="host"`, which implies more than `confirmed`.
     `queryHostBookings`'s upcoming tab uses `status NOT IN ('cancelled','declined')`.
   - *What's unclear:* whether a `pending` (unpaid hold) or `requested` (unapproved) session belongs in
     *"who is coming today"*. A `requested` row is also on `/host/requests` three inches below.
   - *Recommendation:* use `NOT IN ('cancelled','declined')` — one predicate, reused, and the badge already
     tells the truth about each. **Write it down and test it** (D-141's own instruction, applied to the
     status set as well as the day boundary).

2. **`live-regions.test.tsx:491` — what replaces the non-empty guard?**
   - *What we know:* `expect(LIVE_REGION_EXCLUSIONS.length).toBeGreaterThan(0)` was a vacuity guard: an
     emptied list would make the `why`-shape filter trivially green.
   - *What's unclear:* the correct expression once **empty is the right state**.
   - *Recommendation:* assert `.length === 0` **and** keep the `why`-shape filter exercised against a local
     fixture row, so the guard still guards. Say so in the test's own comment — this file's culture is that
     a gate explains itself.

3. **Does `RowListSkeleton` grow a height prop, or do the host plates change `rows`?**
   - *What we know:* the delta is 94–126px per row (measured), not the 32px `[11-08]` anticipated.
   - *What's unclear:* whether a second declared height is worth the inventory entry.
   - *Recommendation:* the height prop. `skeleton-measurements.test.ts` explicitly permits constants and
     bans literals, so this is the sanctioned shape; `rows`-fiddling makes the plate lie about the list's
     structure.

4. **Is a 33×6.66px bar legible at 320px?** (M4)
   - *What we know:* the exact geometry, measured. The UI-SPEC's `HOURS_STRIP_TRACK` derivation assumed
     37.7px columns; the real figure is 33.14px because the panel pays its own `px-4`.
   - *What's unclear:* legibility is a human judgement.
   - *Recommendation:* route it to manual UAT at 320px. If it fails, the fix is `HOURS_STRIP_TRACK`
     re-derived — **not** a gridline, not a colour, not a horizontal re-orientation (D-152's own rule).

5. **Do the address step's two-column fields survive 672px?** (M5)
   - *What we know:* the column is exactly 672px at the `lg` boundary. Measured.
   - *What's unclear:* the fields' own behaviour — needs the real form.
   - *Recommendation:* measure it in the plan that widens the shell, before `WIZARD_CHECKLIST_COL` is
     treated as settled.

6. **Should `photo-uploader.tsx:226`'s unnamed `role="status"` be fixed here?**
   - *What we know:* it renders on the wizard's photos step and has no accessible name.
   - *What's unclear:* whether Phase 16 (crop) will rewrite that component anyway.
   - *Recommendation:* fix the `aria-label` here (one attribute) and record it in `LIVE_REGIONS` as a
     fourth row, or explicitly add it to `LIVE_REGION_EXCLUSIONS` naming Phase 16 — **but then the
     exclusion list does not reach zero and D-155's discretion item is not discharged.** This is a real
     fork the plan must take deliberately.

7. **The `(host)` error boundary's `routeOut` is `/host`, a self-link on the dashboard.**
   - Recorded by the UI-SPEC (Open Question 3) and confirmed: `error-boundaries.test.ts:193` pins the file
     and it is the shared boundary for all 11 host routes. **Not changed here.**

---

## Sources

### Primary (HIGH confidence) — executed or read in this session

- **Live PostgreSQL 18** (`postgis/postgis:18-3.6`, container `fitout-db-1`) — `pg_proc.provolatile` for
  `timezone()`; the two-zone `AT TIME ZONE` correctness probe; `EXPLAIN (ANALYZE, BUFFERS)` on the today
  predicate, the UNION-ALL two-bucket shape and the pre-filtered index path; the maximum-excursion probe
  across five extreme zones.
- **Playwright Chromium 148.0.7778.96** + `tests/design/helpers/compile-css.ts` — M1…M5. Harness validated
  against `[11-08]`'s published 112px.
- **The repository at `e59f10e`** — every `file:line` citation in this document was read this session:
  `src/app/(host)/host/{page,requests/page,bookings/page,earnings/page,layout,loading}.tsx`,
  `src/app/(host)/host/listings/{page,new/page,[id]/edit/{page,wizard},[id]/availability/page}.tsx`,
  `src/components/host/{request-row,host-booking-row,payout-row,payout-banner,host-cancel-dialog}.tsx`,
  `src/components/availability/{weekly-hours-editor,blocks-editor}.tsx`,
  `src/components/listing/{listing-card,address-autocomplete,photo-uploader}.tsx`,
  `src/components/patterns/{row-card,page-header,panel-card,row-list-skeleton,responsive-dialog,ambient-notifications}.tsx`,
  `src/components/booking/{request-countdown,booking-status-badge}.tsx`,
  `src/components/ui/{card,button,badge}.tsx`,
  `src/lib/booking/{bookings-query,when-label}.ts`, `src/lib/listing/{hours-lock,hours-signal}.ts`,
  `src/lib/availability/read-model.ts`, `src/lib/validation/availability.ts`, `src/lib/db/schema.ts`,
  `src/lib/nav.ts`,
  `src/lib/design/{measurements,selector-contract,live-regions,accent-uses,contrast-pairs,visual-baselines}.ts`,
  `config/design-leak-patterns.mjs`, `eslint.config.mjs`, `vitest.config.ts`, `vitest.design.config.ts`,
  `playwright.config.ts`, `scripts/seed-baseline-fixtures.ts`, `e2e/helpers/{visual-drive,booker-seed}.ts`,
  and 14 files under `tests/design/`.
- **Test runs, this session:** `npm run test:design` (48/816/3-skipped/0-failed, 47.8s);
  `npx vitest run tests/listing tests/host tests/booking tests/availability tests/security`
  (98/1031/0-failed, 116s); `npx tsc --noEmit` (exit 0).

### Secondary (HIGH-MEDIUM) — committed planning artifacts

- `.planning/phases/14-host-tooling/14-CONTEXT.md` (312 lines) — D-140…D-156, verbatim above.
- `.planning/phases/14-host-tooling/14-UI-SPEC.md` (1472 lines, **APPROVED** 2026-08-23, 6/6 dimensions).
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — `[11-08]`, `[11-11]`.
- `.planning/phases/12-booker-path-search-listing-checkout/deferred-items.md` — `[12-02]`, `[12-03]`,
  `[12-06]`, `[12-08]`, `[12-10]`, `[12-12]` (the DB-contention family).
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — `[13-07]`, `[13-08]`, `[13-15]`,
  `[13-16]`.
- `.planning/REQUIREMENTS.md:76-82, 164, 275` · `.planning/ROADMAP.md:422-436` · `.planning/STATE.md`
  (frontmatter + head only) · `./CLAUDE.md` · `.planning/config.json`.

### Tertiary (LOW) — none

**No WebSearch and no Context7 lookup was performed, and none was needed.** This phase installs nothing,
adopts no new API, and the two API questions the brief allowed for (a Radix a11y contract, a `@date-fns/tz`
detail) were both answerable from the repository itself: the a11y contract is already encoded in
`ResponsiveDialog` and `live-regions.ts`, and the timezone question turned out to be a **SQL** question,
answered against the running database rather than against documentation.

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| The five surfaces as they are today | **HIGH** | Every line range read this session; nothing inferred. |
| The "today" query | **HIGH** | Predicate, correctness, volatility, plan shape and index behaviour all executed against live PG18. |
| The wizard's structure | **HIGH** | Line-exact map from `grep -n`; region boundaries verified by reading each. |
| Committed gates | **HIGH** | Assertion text read directly; the design suite was run to a measured baseline. Five unbudgeted traps found and each verified against its assertion line. |
| M1 / M2 row heights | **MEDIUM-HIGH** | Harness validated against the one published figure; the `<dl>`/countdown/action reconstructions are close but not the components. ±8px error bar declared. |
| M3 / M5 | **HIGH** | Exact reconstructions; simple geometry. |
| M4 | **HIGH** on the numbers, **LOW** on legibility | 33.14 × 6.66px is measured; "is that legible" is a human call routed to UAT. |
| Visual baselines | **HIGH** on what exists, **MEDIUM** on cost | `e2e/visual/` and the fixture were read; the host-drive estimate is reasoned, and **nothing about it can be run on win32**. |
| Testing seams | **HIGH** | Every named test file opened; case titles quoted. |
| The flake pattern | **HIGH** | Five deferred items with measured run-by-run evidence. |

**Research date:** 2026-08-23
**Valid until:** ~2026-09-22 for the codebase claims (they are facts about a commit, and go stale the moment
a Phase-14 plan executes — re-verify the gate pins after each wave). The Postgres semantics
(`AT TIME ZONE`, IMMUTABLE volatility, the 24-hour envelope proof) do not expire.
