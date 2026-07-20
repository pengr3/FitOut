---
phase: 06-full-booking-payment-integration
plan: 08
subsystem: host-inbox-booker-states
tags: [request-to-book, host-inbox, owner-scope, idor, countdown, pay-on-approval, pending-nudge, confirmation-states, calm-tone]

# Dependency graph
requires:
  - phase: 06-full-booking-payment-integration
    plan: 01
    provides: "requested/approved booking statuses + APPROVAL_SLA_HOURS / APPROVAL_PAYMENT_WINDOW_HOURS config the inbox subhead + booker copy + countdown reference"
  - phase: 06-full-booking-payment-integration
    plan: 07
    provides: "approveRequest/declineRequest server actions wired to the inbox buttons + the EXACT owner-scope READ predicate (WHERE listing.host_id=<host> AND status='requested' ORDER BY expires_at ASC) the inbox page consumes, proven by a committed cross-host isolation test"
provides:
  - "RequestCountdown — an hours-scale, display-only expiry countdown (per-minute tick, DB now() is the authority) reused on the host inbox SLA + the booker approved payment-window"
  - "/host/requests — an owner-scoped (host) RSC inbox of pending (requested) bookings with venue-local window, server-frozen quote, expiry countdown, and Approve (inline) / Decline (confirm-dialog) actions"
  - "RequestRow + RequestActions — the mobile card + the client Approve/Decline control wiring the 06-07 actions (sonner toasts + revalidatePath freshness)"
  - "Pending-count nudge (D-65) — a neutral secondary count badge (hidden at 0) in the (host) dashboard action row + the (host) header nav"
  - "/bookings/[id] requested + approved (+ calm declined) booker confirmation states (BOOK-06, D-66)"
affects: [06-09, request-to-book, host-inbox, booker-confirmation]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "An hours-scale countdown clones hold-countdown.tsx's timer discipline exactly (setInterval-only setState, onExpire ref-synced in its own effect, suppressHydrationWarning digits, role=timer aria-live=off, threshold+expiry-only announcements) but ticks per-MINUTE — the horizon is 24h"
    - "A (host) inbox RSC clones /host/earnings: defense-in-depth session+canHost re-gate, an owner-scoped read (route group is NOT the gate), desktop shadcn table + mobile card responsive split, container max-w-4xl, no coral"
    - "The inbox read reuses the EXACT owner-scope predicate 06-07's committed isolation test asserts (WHERE listing.hostId=session.user.id AND booking.status='requested' ORDER BY expires_at ASC) — a display JOIN to the booker never changes the isolation predicate"
    - "The confirmation page branches on booking.status with calm lifecycle badges (icon+text, never color-only): requested=secondary/Hourglass, approved=outline/CalendarCheck (NOT --success), declined=muted/XCircle; the one coral CTA is the approved-state Pay now"

key-files:
  created:
    - src/components/booking/request-countdown.tsx
    - src/components/host/request-row.tsx
    - src/app/(host)/host/requests/page.tsx
  modified:
    - src/app/(host)/host/page.tsx
    - src/app/(host)/host/layout.tsx
    - src/app/bookings/[id]/page.tsx

key-decisions:
  - "The inbox read owner-scopes with the EXACT predicate 06-07's non-optional isolation test asserts (WHERE listing.hostId=session.user.id AND booking.status='requested' ORDER BY expires_at ASC). It JOINs the booker user only for the display name — the WHERE/ORDER BY isolation predicate is unchanged. The (host) route group is NOT the gate; the page re-checks session+canHost (defense in depth, mirrors /host/earnings)."
  - "Approve = neutral solid inline (disable-on-click → 'Approving…'); Decline = neutral outline opening a confirm dialog ('Decline this request?' → 'Decline request' / 'Keep it') before firing — the D-65 discretionary lock (only the irreversible 'no' gets a dialog; both stay neutral, never destructive-red). Freshness is via the actions' revalidatePath (no polling); a 0-row lapsed/already-actioned result surfaces the calm 'no longer pending' toast, never a red 500."
  - "RequestCountdown is a display cue only — the DB now() vs expires_at guard (06-07 approve / 06-06 sweep) is the sole authority. It ticks per-minute (24h horizon) and flips to an 'Expired' / 'Payment window closed' label on reaching 0; the row is removed on the next revalidatePath, it does not silently vanish."
  - "approved deliberately uses a neutral OUTLINE badge (CalendarCheck), NOT --success — it is positive but not terminal (not paid yet), keeping green reserved for confirmed. The coral Pay now (→ /listings/[id]/book?hold=<id>, the SAME Phase-5 reserve/checkout) + the payment-window countdown carry the emphasis."
  - "requested labels the amount 'You'll pay if approved' (NOT 'Total charged') and says 'you haven't been charged — you'll only pay if the host approves' (D-63, nothing charged at request time); it has NO pay CTA."
  - "Added a calm declined landing (muted secondary/XCircle badge + coral 'Find another space') over a bare 404 — the plan's recommended-but-optional graceful landing, mirroring HoldExpiredState/PaymentReversedState. confirmed / pending-interstitial / cancelled+?paid reversed branches are unchanged. cancelled-without-?paid + completed still resolve to the same bare owner-gated 404 (Phase-7 owns cancellation landings)."
  - "The pending-count nudge reuses the owner-scope count() idiom (booking JOIN listing WHERE hostId AND status='requested') in BOTH the (host) dashboard action row (neutral outline Requests button) and the (host) header nav (neutral Requests link) with a neutral secondary badge hidden at 0 and aria-label '{n} requests to review' (D-65) — never coral, never destructive-red."
  - "Money is server-frozen throughout (quotedTotalCents via formatMoney, zero arithmetic); every displayed time names the venue timezone (SC#2, composed identically to composeWhenLabel / the confirmation page)."

requirements-completed: []  # HOST-01 / BOOK-05 / BOOK-06 stay In-progress — the visible request-to-book surface ships here, but completion is validated at the 06-09 human-verify checkpoint / phase transition, per the 06-01..07 cross-cutting precedent.

# Metrics
duration: ~28min
completed: 2026-07-20
---

# Phase 6 Plan 08: Host Request Inbox + Booker Requested/Approved States Summary

**The visible request-to-book surface (HOST-01 · BOOK-05 · BOOK-06). Ships `RequestCountdown` (an hours-scale display-only clone of hold-countdown.tsx — per-minute tick, DB clock is the authority), the owner-scoped `/host/requests` inbox (RSC cloning /host/earnings + `RequestRow`/`RequestActions` wiring the 06-07 approve/decline actions), a pending-count nudge in the (host) dashboard + header (D-65), and the booker `requested` / `approved` (+ a calm `declined` landing) confirmation states on `/bookings/[id]` (D-66). The inbox read reuses the EXACT owner-scope predicate 06-07's committed isolation test asserts; all lifecycle states are calm (never red, never green until confirmed); the one coral CTA is the approved-state Pay now → the Phase-5 checkout.**

## Performance
- **Duration:** ~28 min
- **Started:** 2026-07-20
- **Completed:** 2026-07-20
- **Tasks:** 2
- **Files modified:** 6 (3 created, 3 modified)

## Accomplishments
- **`src/components/booking/request-countdown.tsx` (new)** — an HOURS-scale expiry countdown, a direct structural clone of `hold-countdown.tsx` retuned from a 15-min to a 24-h horizon. Per-MINUTE `setInterval` (60_000ms), format `{N}h {M}m` (under 1h → `{M}m`), optional `--destructive` numerals in the final hour, and an `Expired` / `Payment window closed` flip at 0. Keeps the exact timer discipline: the interval callback is the ONLY setState site (dodges `react-hooks/set-state-in-effect`), `onExpire` read through a ref synced in its own effect, `suppressHydrationWarning` on the digits, `role="timer" aria-live="off"`, and threshold+expiry-only sr-only announcements. Props `{ expiresAt, label, expiredLabel?, onExpire? }` — `label="Expires in"` (host SLA) / `label="Pay within"` (booker payment window). Display cue only.
- **`src/components/host/request-row.tsx` (new)** — `RequestRow` (mobile stacked card mirroring `PayoutRow`: space title 600 + venue-local window meta + `Guest` + `Guest pays {₱total}` tabular-nums + the `Expires in …` countdown) + a `"use client"` `RequestActions`: Approve (neutral solid, inline, disable-on-click → `Approving…`) and Decline (neutral outline opening a confirm dialog → `Decline request` / `Keep it`). Both call the 06-07 `approveRequest`/`declineRequest`, toast via `sonner`, and rely on the actions' `revalidatePath` for freshness; a 0-row `no longer pending` surfaces as a calm error toast. `aria-label`s on both buttons (checker Dimension-1 recommendation).
- **`src/app/(host)/host/requests/page.tsx` (new, RSC)** — clones `/host/earnings`: defense-in-depth session + canHost re-check, then the OWNER-SCOPED read `booking JOIN listing JOIN user(booker) WHERE listing.hostId = session.user.id AND booking.status = 'requested' ORDER BY expires_at ASC` — the EXACT predicate 06-07's non-optional owner-scope READ isolation test asserts (T-06-23/Security V4; the route group is NOT the gate). Venue-tz-safe window (`composeWhenLabel` discipline, fullDay re-derived from the frozen quote), desktop shadcn table (`Space · When · Guest · Guest pays · Expires · Actions`, real `<th scope="col">`) + mobile `RequestRow` cards, the `No requests right now` empty state, `max-w-4xl` container, no coral. Money is the frozen `quotedTotalCents` via `formatMoney` (zero arithmetic).
- **`src/app/(host)/host/page.tsx` + `layout.tsx` (modified)** — a pending-request `count()` (booking JOIN listing owner-scoped, `status='requested'`) drives a neutral `Requests` nudge in BOTH the dashboard action row (outline `Button asChild Link`) and the header nav (underline `Link`), each with a neutral `secondary` count badge hidden at 0 and `aria-label="{n} requests to review"` (D-65). Never coral.
- **`src/app/bookings/[id]/page.tsx` (modified)** — branches on the new statuses before the final `notFound()`: `requested` (`Awaiting host` secondary/Hourglass badge; window venue-local; amount labeled `You'll pay if approved`; the `you haven't been charged / usually within {APPROVAL_SLA_HOURS} hours` reassurance; NO pay CTA), `approved` (`Approved` outline/CalendarCheck badge — NOT `--success`; a `Pay within {Nh Mm}` payment-window `RequestCountdown`; coral `Pay now` → `/listings/${bk.listingId}/book?hold=${bk.id}`), and a calm `declined` landing (muted XCircle badge + coral `Find another space`). `confirmed` / pending-interstitial / `cancelled+?paid` reversed are unchanged (the confirmed render was hoisted onto a shared listing-fetch + `totalLabel`, byte-identical output).

## Task Commits
Each task was committed atomically:

1. **Task 1: RequestCountdown + owner-scoped /host/requests inbox (page + RequestRow + RequestActions)** — `bcecf13` (feat)
2. **Task 2: pending-count nudge (dashboard + header) + booker requested/approved states** — `407cdaf` (feat)

## Files Created/Modified
- `src/components/booking/request-countdown.tsx` (created) — hours-scale display-only countdown.
- `src/components/host/request-row.tsx` (created) — `RequestRow` card + `"use client"` `RequestActions` (Approve inline / Decline confirm-dialog).
- `src/app/(host)/host/requests/page.tsx` (created) — owner-scoped host request inbox RSC.
- `src/app/(host)/host/page.tsx` (modified) — pending-count query + neutral Requests nudge button.
- `src/app/(host)/host/layout.tsx` (modified) — pending-count query + neutral Requests header nav link.
- `src/app/bookings/[id]/page.tsx` (modified) — requested/approved/declined booker states + expiresAt selected + shared totalLabel hoist.

## Decisions Made
- **The inbox read predicate is kept byte-identical to 06-07's tested SELECT** (`WHERE listing.hostId=session.user.id AND booking.status='requested' ORDER BY expires_at ASC`). The booker-name JOIN is display-only and does not touch the isolation predicate — so the committed read-path IDOR test continues to cover the real page (Security V4/T-06-23). The page re-gates session+canHost (defense in depth; the route group is not the gate).
- **Approve inline, Decline behind a confirm dialog** (D-65 discretionary lock) — only the irreversible "no" gets a confirming dialog; both stay neutral (a decline is a normal outcome, not destructive-red). No coral on the inbox (mirrors /host/earnings' calm surface).
- **`approved` uses a neutral outline badge, NOT `--success`** — positive but not terminal; green stays reserved for `confirmed`. The coral Pay now + payment-window countdown carry the emphasis, routing to the SAME Phase-5 reserve/checkout (`/book?hold=<id>`; the webhook remains the sole confirm authority, T-06-25).
- **Added the optional calm `declined` landing** (recommended over a bare 404). `cancelled`-without-`?paid` + `completed` still resolve to the same owner-gated 404 to avoid overreaching into Phase-7 cancellation semantics.
- **HOST-01/BOOK-05/BOOK-06 stay In-progress** — the visible surface ships here, but completion is validated at the 06-09 human-verify checkpoint / phase transition, per the 06-01..07 cross-cutting precedent.

## Deviations from Plan
None — plan executed exactly as written. The `declined` graceful landing was explicitly offered as optional by the plan/UI-SPEC and was taken. One structural note (not a behavior change): the confirmation page's listing fetch + `totalLabel` were hoisted above a `RENDERABLE` status gate so the requested/approved/declined/confirmed branches share them; the `confirmed` render is byte-identical output.

## Issues Encountered
- **`process.env.APPROVAL_PAYMENT_WINDOW_HOURS` in the client `RequestActions`** — the toast copy imports `APPROVAL_PAYMENT_WINDOW_HOURS` from the isomorphic `@/lib/payments/config`. On the client the non-`NEXT_PUBLIC_` env var is `undefined`, so the constant resolves to its documented default (24) — the correct copy value; no build/runtime issue. Documented so a future env override of the window is known to affect server copy only (host inbox toast shows the default) — acceptable for a reassurance toast.
- Ran `npx vitest run` with NO `DATABASE_URL` shell override per the machine convention (`.env.local` is the source; Docker up).

## Verification
- `npx tsc --noEmit` — exit 0 (clean) after each task.
- `npx eslint` — 0 errors on all six new/modified files (the pre-existing `react-hooks/set-state-in-effect` error at `src/components/listing/address-autocomplete.tsx:110` is out-of-scope and untouched).
- `npx vitest run tests/booking tests/paymongo tests/payments` — **131 passed** (18 files; no regressions vs the 06-07 baseline). The 06-07 owner-scope READ isolation test (the predicate this page consumes) stays green.
- Acceptance greps: `hostId` owner-scope WHERE in the inbox page; `role="timer"` + `60_000` per-minute interval in RequestCountdown; `approveRequest`/`declineRequest` wired in request-row (Decline behind a confirm dialog); the pending-count `status='requested'` query in both the dashboard + header; the approved-state coral `Pay now` → `/book?hold=`; requested (secondary/Hourglass) has no pay CTA; approved (outline/CalendarCheck) is not `bg-success`.
- Visual/interaction verification is deferred to the 06-09 human-verify checkpoint (per the plan).

## Threat Model Coverage
- **T-06-23 (Elevation / IDOR — /host/requests read):** mitigated — the read is owner-scoped with the EXACT tested predicate; the RSC re-checks session+canHost (defense in depth); the route group is not the gate.
- **T-06-24 (Information Disclosure — booker confirmation states):** mitigated — the requested/approved/declined branches read the SAME owner-gated row (`bookerId===userId → same 404 for missing vs not-mine`); no new read path.
- **T-06-25 (Spoofing — approved-state Pay now):** mitigated — Pay now routes to the existing reserve/Confirm-&-pay page; confirmation stays the webhook's sole authority (06-05); the countdown is display-only and the client never fabricates a confirmed state.

## Known Stubs
None. The inbox renders real owner-scoped data and the actions are the live 06-07 server actions; the booker states read the real persisted booking row.

## Threat Flags
None — this plan adds no new network endpoint, auth path, or schema surface beyond the owner-scoped read already modeled in the threat register.

## Next Phase Readiness
- **06-09 (human-verify checkpoint)** — end-to-end pay-on-approval against PayMongo test mode: place a request → host approves in `/host/requests` → booker `Pay now` from the approved state → webhook confirms → confirmed email + confirmation page; plus the inbox countdown, the pending-count nudge, and the requested/declined states.
- **Downstream reminder still in force:** any NEW read/occupancy predicate must mirror the occupying set `{pending,confirmed,requested,approved}` (or the complement) or a request-held slot reads as free.

## Self-Check: PASSED
- All three created files exist on disk: `src/components/booking/request-countdown.tsx`, `src/components/host/request-row.tsx`, `src/app/(host)/host/requests/page.tsx`.
- Both task commits present in git history: `bcecf13` (Task 1 feat), `407cdaf` (Task 2 feat).
- Acceptance markers verified via grep (owner-scope WHERE, role="timer" + 60_000, approveRequest/declineRequest + confirm dialog, pending `status='requested'` in both nudge files, approved coral `book?hold` Pay now, requested/approved/declined badges icon+text).
- Suites green: booking+paymongo+payments 131 passed; tsc exit 0; eslint clean on all six files.

---
*Phase: 06-full-booking-payment-integration*
*Completed: 2026-07-20*
