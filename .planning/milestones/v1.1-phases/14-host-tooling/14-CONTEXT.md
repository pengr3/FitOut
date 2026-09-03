# Phase 14: Host Tooling - Context

**Gathered:** 2026-08-23
**Status:** Ready for planning

<domain>
## Phase Boundary

**A host opening FitOut sees what they owe today and can act on it, in the same product the booker side became.**

This is the host half of v1.1's polish milestone. Phases 12 and 13 rebuilt the booker path on the Phase-10
token contract and the Phase-11 pattern layer; the host surfaces have not moved since v1.0 and are the last
place in the app where the old shape is still visible.

**In scope — HFLOW-01…05, five surfaces:**
- `/host` — the dashboard becomes a **today** view (HFLOW-03)
- `/host/requests` — the inbox becomes scannable, SLA-first triage (HFLOW-01)
- `/host/listings/[id]/edit` + `/host/listings/new` — the wizard gets a clickable step rail, a visible
  save state, and a persistent publish checklist (HFLOW-02)
- `/host/bookings` + `/host/listings/[id]/availability` — design-system adoption, plus a
  week-at-a-glance preview in the hours editor (HFLOW-04)
- `/host/earnings` + the payout surfaces — **token pass only** (HFLOW-05)

**Out of scope — do not absorb:**
- **Availability "copy to all"** — Phase 19, net-new capability (PROJECT D-136). The hours editor is
  *restyled and previewed* here; it does not gain a new editing power.
- Search-results map — Phase 18 (PROJECT D-136).
- Auth screens, profile, the email shell — Phase 15. Image crop/framing — Phase 16.
- The full axe pass, the 320px sweep across every surface, flipping leak tests advisory→blocking — Phase 17.
- **Any change to booking, payment, capacity or availability LOGIC** (PROJECT D-130). Approve/decline,
  the SLA deadline, the GiST exclusion constraint, the frozen quote and the payout hold are untouchable.
- **Zero schema migrations.** `drizzle/` stays where it is. A migration proposed inside a Phase-14 plan is
  a scope alarm to be raised, not absorbed (PROJECT D-136).
- Restructuring earnings/payouts (HFLOW-05 is explicit: those numbers have never been real, because
  PayMongo `/v2` money movement is sales-gated).

</domain>

<inherited_and_not_re_decided>
## Carried forward — settled before this phase, not re-opened

| Inherited | Source | What it binds here |
|---|---|---|
| `court` (coral) is the SINGLE product theme; `grove` is a token-contract probe | PROJECT D-138 | New host surfaces get **court-only** baselines. No two-theme screenshot pairs. Grove's proof is the existing 24-name parity check, the contrast table, and the ONE fixed 4-surface contract spec — no Phase-14 surface owes it anything. |
| Five hard gates on every phase | PROJECT D-131 + D-134 | 320px-up · keyboard + WCAG AA contrast/focus · designed loading/empty/error on every async surface · Playwright VR baseline · **GATE-NOREG** (proof the previously-working thing still works). |
| Polish may reshape layout; it may not move logic client-side or weaken a v1.0 invariant | PROJECT D-130 | Owner-scoping stays **in the WHERE clause**, never in a page branch. Money stays the server-frozen quote. Time stays the DB clock. |
| Phase 11's pattern layer is **adopted, never re-decided** | `11-CONTEXT.md:25`, `11-UI-SPEC.md:665`, `11-16-SUMMARY.md:340` | `EmptyState`, `PanelCard`, `RowCard`, `PageHeader`, `ErrorState`, `ResponsiveDialog`, the skeletons and `RESULT_GRID_GAP` are consumed as-is. HFLOW-01's inbox-zero **adopts** `EmptyState`; it does not author a new one. |
| No coral on calm host workflow surfaces | shipped convention — `host/requests/page.tsx:15`, `host/bookings/page.tsx:21`, `host/earnings` | The accent stays on conversion. A host triage surface is not a funnel. The dashboard's single "Create listing" primary is the existing exception and stays. |
| Host and booker shells are DISTINCT compositions on one shared box | D-04 · `patterns/site-chrome.tsx` | Do not merge the two headers. "Same product as the booker side" means same tokens, same patterns, same states — not the same chrome. |
| The `Requests` nav badge and the notification bell are two badges with two meanings | `(host)/host/layout.tsx` | Do not merge them. |
| Earnings/payouts are structurally frozen | HFLOW-05 · `REQUIREMENTS.md:164` | Tokens only. No new numbers, no restructure, no new payout claim. |

</inherited_and_not_re_decided>

<decisions>
## Implementation Decisions

> **Namespace.** Phase 13 ran 13-CONTEXT D-60…D-103; Phase 13.1 ran D-104…D-113. This phase starts at
> **D-140** to clear PROJECT.md's own D-127…D-138. Collisions with PROJECT.md numbering are pre-existing;
> always qualify a citation as **"14-CONTEXT D-140"** or **"PROJECT D-140"**.

### The dashboard is an agenda, not a scoreboard (HFLOW-03)

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

### The requests inbox is a triage queue, and nothing else (HFLOW-01)

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

### The wizard stops surprising the host at the end (HFLOW-02)

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

### The bookings table and the hours editor become the same product (HFLOW-04)

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

### Earnings and payouts (HFLOW-05)

- **D-156: Tokens only. Zero structural change, zero new numbers.**
  No new payout claim, no new state, no restructure of a surface whose figures have never moved real money.
  If a plan proposes changing what the earnings page *says*, that is a scope alarm.

### Claude's Discretion — decided here, recorded, not escalated

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

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Milestone-level decisions (PROJECT.md)
- `.planning/PROJECT.md` — Key Decisions table. Binding rows for this phase: **D-130** (polish may not move
  logic client-side or weaken a v1.0 invariant), **D-131** (four hard gates), **D-134** (GATE-NOREG as the
  fifth), **D-136** (copy-to-all and the map are their OWN phases; v1.1 ships zero migrations),
  **D-138** (`court` is the single product theme; grove is a probe — no two-theme baselines).
- `.planning/REQUIREMENTS.md` §"Host tooling (HFLOW)" lines 76–82; the trade-off row at line 164
  (why earnings/payouts are frozen); the near-overlap note at line 275 (STATE-04 authors the empty state,
  HFLOW-01 adopts it).
- `.planning/ROADMAP.md` §"Phase 14: Host Tooling" lines 422–436 — goal, the five success criteria, `UI hint: yes`.

### The pattern layer this phase consumes (Phase 11)
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-UI-SPEC.md` — the three containers, the
  `EmptyState` contract at §665 ("HFLOW-01 adopts this component; it does not re-decide it").
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-13-SUMMARY.md:234-235` — the
  `ALLOWED_RAW_CARD` exemptions this phase is expected to spend.
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-11-SUMMARY.md:283` — the row-navigability
  question D-144 now closes.
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/deferred-items.md` — `[11-08]` row heights,
  `[11-16]` the host tile fork.

### The booker precedent this phase is asked to match (Phases 12–13)
- `.planning/phases/12-booker-path-search-listing-checkout/12-UI-SPEC.md` — the visual language
  "the same product as the booker side" refers to; `RESULT_GRID_GAP` at §117.
- `.planning/phases/13-confirmation-bookings-trust/13-UI-SPEC.md` — status vocabulary, the calm-surface
  colour rules, the countdown treatment.
- `.planning/phases/13-confirmation-bookings-trust/deferred-items.md` — `[13-07]`, the hours-scale
  countdown emphasis that D-146 resolves.
- `src/lib/design/live-regions.ts` — the declared live-region set; `address-autocomplete.tsx` is the last
  exclusion and this phase discharges it.

### The surfaces being changed
- `src/app/(host)/host/page.tsx` · `requests/page.tsx` · `bookings/page.tsx` ·
  `listings/[id]/edit/wizard.tsx` · `listings/[id]/availability/page.tsx` · `earnings/page.tsx`
- `src/components/host/*` — `request-row.tsx`, `host-booking-row.tsx`, `payout-*`, `request-countdown-reason.tsx`
- `src/components/availability/weekly-hours-editor.tsx` · `blocks-editor.tsx`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets (use these; do not re-author)
- **`patterns/`** — `EmptyState`, `PanelCard` (`tone="muted"` is the calm advisory tone), `RowCard`
  (optional `href`, `media`, `actions`, `children`), `PageHeader`, `ErrorState` (its `routeOut` is
  **required** — a host error surface must decide where it sends people), `ResponsiveDialog`,
  `RowListSkeleton` / `CardGridSkeleton` / `PanelSkeleton`.
- **`composeWhenLabelShort()`** (`src/lib/booking/when-label.ts`) — the shared venue-timezone window
  formatter. It was one of three verbatim duplicates before Phase 7 and must never be re-inlined.
- **`readDbNow(db)`** (`src/lib/booking/bookings-query.ts`) — the DB clock, read once and threaded.
- **`queryHostBookings`** — owner-scoped in the WHERE, already tab-partitioned and paged.
- **`loadPublishedListingsMissingHours(db, userId)`** + `HOURS_MISSING_STATE/REASON/CTA`
  (`src/lib/listing/hours-signal.ts`) — one authority, already rendered on two surfaces.
- **`derivePayoutStatus` / `PayoutBanner`** — the payout state the dashboard already shows.
- **`formatMoney`** — all money is the frozen `quotedTotalCents`; these pages do ZERO arithmetic.
- **`weeklyHoursSchema`** (`src/lib/validation/availability.ts`) — shared client/server; the strip should
  derive from the same `windows` array the form holds, so the preview cannot disagree with what saves.

### Established patterns that constrain this phase
- **Two independent gates on every host page** — the `(host)` layout gates `canHost`, AND the page
  re-checks session + `canHost`, AND ownership lives in the query's WHERE. A layout is not an
  authorization boundary for data (T-06-23 / T-07-29 / Security V4). Any new read added by D-140/D-142
  inherits all three.
- **Desktop table / mobile card split** — the shipped responsive idiom on `/host/requests`,
  `/host/bookings`, `/host/earnings`. Keep it; do not invent a third.
- **Design gates that will fail the build** — no raw hex/`rgb(`/`oklch(`/arbitrary `text-[NNpx]` under
  `src/components/**` or `src/app/**`; the brand-recipe scan pins accent backgrounds across named files;
  skeleton measurements ban literal box classes in `patterns/*skeleton*.tsx`. **A comment containing a
  banned token trips these greps** — this repo has burned three plans on that. Name tokens descriptively
  in comments.
- **`RowCard` heights** — see `[11-08]`; re-measure rather than trusting 80px.

### Integration points
- The `(host)` layout's `Suspense`-streamed nav badge reads the same pending-request count the dashboard
  and inbox do — three consumers, one predicate. Keep them identical.
- `saveListingStep` is the wizard's autosave authority and re-validates server-side; D-150's indicator
  reads its result and adds no second write path.
- `AmbientNotifications` mounts in the host shell — the bell and the `Requests` badge stay separate (D-92).

</code_context>

<specifics>
## Specific Ideas

- The dashboard sentence the PM's choice implies, concretely: a host with sessions today should be able to
  answer *"who is coming and when"* without leaving `/host`. That is the acceptance test for D-140.
- The quiet-day line has a shape: **"Nothing today — next: {weekday}, {date} · {time} · {space}"**.
- Inbox-zero should read like *"You're all caught up"* — a state of completion, not of emptiness.
- The hours strip's whole point is that a mistyped window is visible **before** saving. If the preview only
  updates after a save round-trip, it has failed its own purpose.

</specifics>

<deferred>
## Deferred Ideas

- **Availability copy-to-all** — Phase 19 (PROJECT D-136). It will land on the editor this phase restyles;
  leave the editor's structure friendly to a per-day action, but add no such action here.
- **Host-side filtering/sorting on `/host/bookings`** — a new capability, not a token pass. Not this phase.
- **Making the host listing tile navigable** (moving Edit/Availability/Delete off the card) — rejected in
  favour of correcting the UI-SPEC's *Replaces* list; recorded in case a future phase wants to revisit.
- **The drop-in month grid's 28×28 hit area and its in-flight month read** (`[12-10]`, `[12-09](a)/(b)`) —
  booker surfaces, Phase 17's sweep or whichever plan next opens `date-pass-picker.tsx`.
- **`NEXT_PUBLIC_APP_URL` is unset**, so share URLs resolve to localhost (`[11-14]`). Environment, not
  Phase 14.

</deferred>

---

*Phase: 14-Host Tooling*
*Context gathered: 2026-08-23*
