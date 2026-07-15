---
phase: 04-booking-core-search-no-payment
plan: 07
subsystem: booking
tags: [next-app-router, rsc, server-actions, better-auth, idor, drizzle, postgres, react, venue-timezone]

# Dependency graph
requires:
  - phase: 04-06
    provides: placeHold + confirmBooking server actions (discriminated-union results) + PriceBreakdown/HoldCountdown/HoldExpiredState/ReserveActions atoms
  - phase: 04-04
    provides: createPendingHold + quoteWindow (frozen PHP quote) + FIT- reference generator (makeBookingReference)
  - phase: 04-02
    provides: slotSelectionSchema (window shape re-validation) + DISPLAY_CURRENCY ("php")
  - phase: 03
    provides: BookingSelectionProvider/RailSelectionSummary + availability calendar + SlotPicker (the lifted selection the CTA reads)
  - phase: 02
    provides: deriveBookable sell-gate + public listing detail page
  - phase: 01
    provides: Better Auth session + canBook capability + activateBooking action + login page
provides:
  - reserve page (/listings/[id]/book) — owner-gated hold READ (never creates), summary + frozen breakdown + live countdown + Confirm; D-42 confirmed→redirect, D-44 calm expiry
  - confirmation page (/bookings/[id]) — durable, owner-gated (bookerId===userId else notFound), FIT- reference + details
  - BookCta — the listing "Book this space" client seam wiring the lifted selection to placeHold (POST, never GET) + D-41 sign-in resume
  - src/lib/venue-time.ts — shared gmtLabelFor/cityLabelFor (extracted from the listing page so reserve/confirmation/listing share one source)
affects: [04-08, phase-5-payments, phase-7-bookings-management, phase-8-group-bookings]

# Tech tracking
tech-stack:
  added: []  # no new runtime deps
  patterns:
    - "Owner-gated RSC hold READ (reserve page never mints a hold — GET-side-effect duplication is designed out; hold creation lives only in the placeHold POST): missing row | other-booker | no-session all notFound() (bare 404 reveals nothing — T-04-RESERVEIDOR)"
    - "Durable confirmation surface: reads persisted booking state (bookerId===userId else notFound; status must be 'confirmed'); opaque randomUUID id in the URL, FIT- reference is display-only (T-04-ENUMID) — survives refresh, independent of any ephemeral hold/countdown"
    - "Book CTA as a client seam calling a threaded placeHold server action (POST) rather than <form action> — needed to branch the discriminated-union result (sign-in → callbackURL+resume=1 | activate-booking | taken→calendar refresh) which a raw form action cannot"
    - "Open-redirect-guarded sign-in resume: safeCallbackUrl honors only a same-origin relative '/…' path (rejects '//host'); read from window at call time (no extra useSearchParams/Suspense boundary)"

key-files:
  created:
    - src/app/listings/[id]/book/page.tsx
    - src/app/bookings/[id]/page.tsx
    - src/components/booking/reserve-view.tsx
    - src/components/booking/book-cta.tsx
    - src/lib/venue-time.ts
  modified:
    - src/app/listings/[id]/page.tsx
    - src/app/(auth)/login/page.tsx
    - src/components/availability/availability-calendar.tsx
    - src/lib/booking/reference.ts

key-decisions:
  - "Reserve page is a pure READ of the hold (owner-gated) — hold creation stays exclusively in the placeHold POST action so a GET render / prefetch / back-button can never duplicate a hold (D-39 / Pitfall 2)"
  - "An already-confirmed OWN hold revisited at the reserve page REDIRECTS to the durable confirmation (D-42) — a booked user is never shown a false 'your hold expired'"
  - "Book CTA implemented as a client component calling a threaded placeHold (not a bare <form action={placeHold}>) so it can map each discriminated-union failure to the exact UI-SPEC state and drive the D-41 auto-resume; the key-link intent (listing page → placeHold) is preserved"
  - "gmtLabelFor/cityLabelFor extracted to src/lib/venue-time.ts so the listing, reserve, and confirmation surfaces share ONE venue-tz label source and cannot drift; DISPLAY_CURRENCY import swapped for the same reason"

patterns-established:
  - "Every booking-owned surface (reserve, confirmation) gates on session → owner → state server-side and notFound()s on any miss — the route path is never the gate (V4/IDOR)"
  - "Sign-in resume threads the selected window through a same-origin, open-redirect-guarded callbackURL so a single Book click round-trips through auth without re-selecting the slot (D-41)"

requirements-completed: [BOOK-01, BOOK-03]  # user-facing reserve/book + durable confirmation; BOOK-02 already Complete (04-04)

# Metrics
duration: ~30min (executor Tasks 1-2; Task 3 finished inline by orchestrator after a mid-task spend-limit termination)
completed: 2026-07-15
---

# Phase 4 Plan 07: Reserve + confirmation pages + Book-CTA wiring Summary

**The two booking pages (owner-gated reserve READ + durable owner-gated confirmation with the FIT- reference) and the listing "Book this space" CTA wired to placeHold with D-41 sign-in resume — the user-facing surfaces that complete BOOK-01/BOOK-03.**

## Performance

- **Duration:** ~30 min (Tasks 1-2 by the gsd-executor; Task 3 completed inline by the orchestrator)
- **Completed:** 2026-07-15
- **Tasks:** 3
- **Files:** 5 created, 4 modified

## Accomplishments

- **Reserve page `/listings/[id]/book`** (`57c816f`) — an RSC that READS the hold `placeHold` minted (arriving as `?hold=<id>`); it NEVER creates one, so a GET render / prefetch / back-button cannot duplicate a hold (D-39 / Pitfall 2 / T-04-GETDUP). Owner-gated: no session, a missing row, or a hold owned by a different booker all `notFound()` (a bare 404 reveals nothing about another booker's hold — T-04-RESERVEIDOR). D-42: an already-`confirmed` OWN hold revisited here REDIRECTS to `/bookings/[id]` — never a false expiry. D-44: a genuinely expired/cancelled (non-confirmed) hold renders the calm `HoldExpiredState`. Composes the venue-tz window summary + `PriceBreakdown` (frozen quote) + `reserve-view` (client `HoldCountdown` + `ReserveActions`).
- **Confirmation page `/bookings/[id]`** (`134236c`) — a durable, owner-gated surface: session required (else `notFound`), `booking.bookerId === session.userId` else `notFound`, `status` must be `confirmed`. The URL uses the opaque `randomUUID` booking id (unguessable — T-04-ENUMID); the `FIT-XXXXXXXX` reference is display-only. "Durable" = it reads persisted booking state and survives a refresh, independent of any countdown/ephemeral hold.
- **Book CTA wiring** (`487bda7`) — the listing "Book this space" bookable-branch becomes `<BookCta listingId placeHold resumeWindow>`, a client seam that turns the lifted `BookingSelectionProvider` selection into the `placeHold` POST (mints the hold on entering checkout, then placeHold redirects to the reserve page). It maps each discriminated-union failure to the UI-SPEC state: `sign-in` → `/login?callbackURL=…&resume=1` (window threaded through so checkout resumes without re-picking, D-41), `activate-booking` → the Phase-1 "Start booking" action, `taken`/`not-bookable`/`invalid` → a calm neutral notice + a calendar refresh. On return from sign-in the page re-parses the window (`slotSelectionSchema.safeParse`) and `BookCta` auto-resumes the hold exactly once (ref-guarded).
- **Shared venue-time module** (`src/lib/venue-time.ts`) — `gmtLabelFor`/`cityLabelFor` extracted from the listing page so the listing, reserve, and confirmation surfaces share one venue-tz label source; the listing page's `DISPLAY_CURRENCY` was swapped to the shared `@/lib/money` export for the same anti-drift reason.

## Task Commits

Each task was committed atomically:

1. **Task 1: Reserve page — owner-gated hold read + breakdown + countdown + Confirm** — `57c816f` (feat) — also created `reserve-view.tsx` + `venue-time.ts`
2. **Task 2: Durable owner-gated confirmation page (FIT- reference)** — `134236c` (feat) — also enhanced `reference.ts` (`bookingReference` formatter)
3. **Task 3: Wire listing Book CTA to placeHold + sign-in resume (D-39/D-41)** — `487bda7` (feat) — `book-cta.tsx` + listing/login/calendar wiring

**Plan metadata:** _(this commit)_ (docs: complete plan)

## Files Created/Modified

- `src/app/listings/[id]/book/page.tsx` — reserve RSC (owner-gated hold read, D-42 confirmed→redirect, D-44 calm expiry, PriceBreakdown + reserve-view).
- `src/app/bookings/[id]/page.tsx` — durable owner-gated confirmation (bookerId===userId else notFound, status='confirmed', FIT- reference).
- `src/components/booking/reserve-view.tsx` — client wrapper composing `HoldCountdown` + `ReserveActions` for the reserve RSC.
- `src/components/booking/book-cta.tsx` — client Book seam calling `placeHold`, discriminated-union mapping, D-41 auto-resume.
- `src/lib/venue-time.ts` — shared `gmtLabelFor`/`cityLabelFor`.
- `src/app/listings/[id]/page.tsx` — Book CTA wired to `BookCta`/`placeHold`, `searchParams` resume parse, `DISPLAY_CURRENCY`/venue-time imports.
- `src/app/(auth)/login/page.tsx` — `safeCallbackUrl()` open-redirect-guarded post-sign-in resume (form + Google).
- `src/components/availability/availability-calendar.tsx` — export `useBookingSelection` (consumed by the CTA).
- `src/lib/booking/reference.ts` — `bookingReference` display formatter alongside the generator.

## Decisions Made

- **Reserve page is a pure READ** — hold creation stays exclusively in `placeHold` (POST); no GET side-effect can duplicate a hold (D-39).
- **Already-confirmed own hold → redirect to confirmation** at the reserve page (D-42), never a false "expired".
- **Book CTA is a client component calling a threaded `placeHold`** rather than a bare `<form action={placeHold}>` — required to branch the discriminated-union result (sign-in / activate-booking / taken) and to drive the D-41 auto-resume; the plan's listing→placeHold key-link intent is preserved (placeHold is imported and invoked at the listing seam).
- **Venue-tz labels + DISPLAY_CURRENCY centralized** so the three booking-adjacent surfaces can't drift.

## Deviations from Plan

- **Task 3 completed inline by the orchestrator, not the gsd-executor.** The executor committed Tasks 1-2 (`57c816f`, `134236c`) and had fully written Task 3's code (BookCta + listing/login/calendar wiring) but hit a monthly API spend-limit before staging/committing it and before writing this SUMMARY. The orchestrator verified the uncommitted Task-3 work (tsc + eslint clean, all cross-file deps — `venue-time.ts`, `slotSelectionSchema` — resolve), committed it atomically (`487bda7`), and authored this SUMMARY + tracking updates. No code was changed from what the executor produced; only the commit + bookkeeping were finished.
- **`<form action={placeHold}>` realized as a client CTA** calling `placeHold` (see Decisions) — an intentional, better fit for the result-branching + resume requirements; not a scope change.

## Issues Encountered

- **Executor spend-limit termination mid-Task-3** (see Deviations) — recovered without loss: the partial working-tree changes were complete and verifiable, so the plan was finished inline rather than re-run (avoiding duplicate commits and extra spend).

## Verification

- `npx tsc --noEmit` → exit 0 (project-wide, including the uncommitted-then-committed Task-3 changes).
- `npx eslint` on the 4 Task-3 files (`book-cta.tsx`, listing/login/availability-calendar) → exit 0.
- `npx vitest run` → **283 passed (46 files)** — no regression from the CTA wiring.
- `PAYMONGO_SECRET_KEY=<dummy> npx next build` → exit 0; the route table now includes `ƒ /listings/[id]/book` and `ƒ /bookings/[id]` (both new routes compile), alongside `ƒ /`.
- Grep confirms: reserve page `notFound`/`redirect` + `?hold=` read; confirmation page `bookerId !== userId → notFound` + `status='confirmed'` + `bookingReference`; listing page `BookCta` + `placeHold`; login `safeCallbackUrl` guard.

**Pre-existing / out-of-scope (NOT this plan — in deferred-items.md; a follow-up task chip was spawned):** `npm run build` trips the Phase-2 `paymongo.ts` production guard when `PAYMONGO_SECRET_KEY` is unset (the dummy key above bypasses it); `npm run lint` (whole-repo) reports a pre-existing `react-hooks/set-state-in-effect` error in Phase-2 `src/components/listing/address-autocomplete.tsx:110`. Neither was touched; all 04-07 files are tsc + eslint clean.

## Known Stubs

None. The reserve page renders the real frozen quote + live countdown + Confirm; the confirmation page renders real persisted booking state. No hardcoded/placeholder values flow to the UI. The Phase-5 payment insert seam remains where 04-06 documented it (`confirmBooking`'s `pending→confirmed` flip).

## Threat Flags

None beyond the plan's `<threat_model>`, all mitigated: T-04-RESERVEIDOR (reserve page owner-gates the hold read → notFound), T-04-HOLDIDOR/ENUMID (confirmation owner-gates + opaque UUID id, FIT- display-only), T-04-GETDUP (hold minted only by the POST action, reserve page is read-only), D-41 open-redirect (login `safeCallbackUrl` honors only same-origin relative paths). No new packages, endpoints, or schema changes.

## Next Phase Readiness

- **Ready for 04-08 (wave 5):** the full search → listing → Book → reserve (countdown/breakdown) → Confirm → durable confirmation path exists end-to-end for the Playwright spec + human-verify checkpoint against 04-UI-SPEC.
- **Phase 5 seam:** unchanged — the charge lands immediately before `confirmBooking`'s `pending→confirmed` flip (D-40); `PriceBreakdown`'s reserved fee slot holds the commission rows.

## Self-Check: PASSED

All 5 created + 4 modified files exist on disk; all three task commits (`57c816f`, `134236c`, `487bda7`) exist in git history; tsc + eslint + vitest + next build all green.

---
*Phase: 04-booking-core-search-no-payment*
*Completed: 2026-07-15*
