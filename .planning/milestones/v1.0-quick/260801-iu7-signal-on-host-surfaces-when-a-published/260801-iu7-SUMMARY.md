---
quick_id: 260801-iu7
slug: signal-on-host-surfaces-when-a-published
type: quick
gap_closure: true
docs_only: false
status: complete
completed: 2026-08-01
subsystem: host-listing-management
tags: [host-surfaces, operating-hours, audit-finding-4, signal-not-gate, copy-constants, idor-scope]
requirements: ["v1.0-AUDIT-4"]
dependency-graph:
  requires:
    - src/lib/db/schema.ts (listing, operatingHours)
    - src/lib/availability/read-model.ts (DbConn)
  provides:
    - src/lib/listing/hours-signal.ts (loadPublishedListingsMissingHours + the three copy constants)
    - ListingCard hoursMissing prop
  affects:
    - /host/listings
    - /host
tech-stack:
  added: []
  patterns:
    - "correlated NOT EXISTS via drizzle notExists(), one grouped read per render (coverByListing idiom)"
    - "copy constants defined exactly once in the owning module so surfaces and tests cannot drift"
    - "non-client shared module (no \"use client\") so Server Components can call it"
key-files:
  created:
    - src/lib/listing/hours-signal.ts
    - tests/listing/hours-signal.test.ts
  modified:
    - src/components/listing/listing-card.tsx
    - src/app/(host)/host/listings/page.tsx
    - src/app/(host)/host/page.tsx
    - tests/listing/listing-card.test.tsx
decisions:
  - "The hours check is a host-side SIGNAL, not a publish gate — deriveBookable stays pure and byte-unchanged so the TS predicate cannot desync from its inlined SQL twin in search Stage-1."
  - "status = 'published' is part of the predicate: a draft or unlisted listing with no hours is not yet a broken promise to anyone, so signalling on it would be noise."
  - "The copy constants live in src/lib/listing/hours-signal.ts, not src/lib/validation/, because validation modules hold REJECT copy and this signal has no schema and no refusal."
  - "The card's render guard is `hoursMissing && availabilityHref`, making the host-only signal structurally unreachable from a Phase-4 search card rather than merely conventionally absent."
  - "The dashboard NAMES the listing when exactly one is affected and COUNTS when several are, linking to the availability editor or the grid respectively — no third route invented."
metrics:
  duration: 10m31s
  tasks: 3
  commits: 5
  files-changed: 6
  tests-added: 9
commits:
  - e512472 test(quick-260801-iu7) add failing integration test for the host hours signal
  - f957f20 feat(quick-260801-iu7) add the shared hours-signal read + copy module
  - 68cad72 test(quick-260801-iu7) add failing card cases for the no-hours notice
  - e3cd0a0 feat(quick-260801-iu7) surface the no-hours notice on the host listings grid
  - b37b6a3 feat(quick-260801-iu7) surface the no-hours signal on the host dashboard
---

# Quick 260801-iu7: Tell the host when a live listing has no weekly hours

v1.0 audit finding #4 is closed on the host side: a published listing with zero `operating_hours` rows
now names itself on `/host/listings` and on `/host`, says why it matters, and links into the availability
editor — while `deriveBookable`, `publishListing`, search, and every badge are byte-for-byte what they
were.

## What was done

### Task 1 — the shared read + copy module (`e512472` RED, `f957f20` GREEN)

`src/lib/listing/hours-signal.ts` is the single authority for both the state and the words for it:

- `loadPublishedListingsMissingHours(dbConn, hostId)` — one owner-scoped query returning
  `{ id, title }[]` for the caller's own non-deleted, `published` listings with zero hours rows. Built
  as a correlated `notExists` subquery on `operating_hours` (index-backed by
  `operating_hours_listing_idx`, short-circuits on the first row), ordered `desc(listing.updatedAt)` so
  it agrees with the grid's own ordering about which listing is "first".
- `HOURS_MISSING_STATE` / `HOURS_MISSING_REASON` / `HOURS_MISSING_CTA` — the state, the reason and the
  way out (rule O7), each defined exactly once.

Takes `DbConn` from `@/lib/availability/read-model` exactly as `hours-lock.ts` does, and carries no
`"use client"` / `"use server"` directive, so both Server Components and the integration test pass their
own handle. The module header records why this is a signal rather than a gate, why `status = 'published'`
is in the predicate, and why the copy does not live under `src/lib/validation/`.

`tests/listing/hours-signal.test.ts` (189 lines) proves it against a real isolated schema with all
migrations applied: `seedSearchListings` supplies the five with-hours positive controls, and five extra
fixtures cover published-without-hours, draft, unlisted, soft-deleted, and a second host.

**Mutation measurement — applied, observed, reverted.** Recorded verbatim in the test header. Two of the
three killed *more* cases than the plan predicted, because case (2)'s `toEqual([PUBLISHED_NO_HOURS])` is
an exact-set assertion and therefore catches anything that widens the result:

| Mutation | Predicted RED | Observed RED | Result |
|---|---|---|---|
| delete `eq(listing.status, "published")` | (3), (4) | (2), (3), (4) | 3 failed / 3 passed |
| delete `eq(listing.hostId, hostId)` | (6) | (2), (6) | 2 failed / 4 passed |
| flip `notExists` → `exists` | (1), (2) | (1), (2), (6) | 3 failed / 3 passed |

Reverted; re-run clean at 6 passed (6). Every mutation was killed by at least the case written for it —
no case was found redundant, and no mutation survived.

### Task 2 — the per-card notice on `/host/listings` (`68cad72` RED, `e3cd0a0` GREEN)

`ListingCard` gains exactly one optional prop, `hoursMissing?: boolean` (default `false`). The notice is
a `text-sm text-muted-foreground` paragraph at the end of `<CardContent>` — the shipped calm-muted idiom,
not an alert and never red — with the CTA as an underlined `<Link>` reusing the `availabilityHref` the
card already receives. The sentence is composed as ONE JS string with an explicit `{" "}` before the
link, per the SWC JSX-whitespace rule that once shipped "₱300.00in cancellation fees".

The render guard is `hoursMissing && availabilityHref`. That second half is load-bearing: a Phase-4
search card supplies neither prop, so a host-management signal is *structurally* unable to appear on a
booker-facing surface (T-IU7-02), which is what test case (9) pins.

`statusBadge()`, the price line, the aspect ratio, the footer actions and every existing className are
untouched — a listing with no hours still reads "Live" if it is otherwise bookable, and case (7) asserts
that badge is still present alongside the notice.

The page reads the signal ONCE for the whole grid into a `Set`, mirroring the `coverByListing` idiom
directly above it, and passes `hoursMissing={missingHours.has(r.id)}` down. Never inside `rows.map`.

### Task 3 — the dashboard nudge (`b37b6a3`)

`/host` calls the same helper next to the existing pending-request and payout reads, and renders a muted
paragraph immediately below `<PayoutBanner />`, hidden entirely at zero and carrying
`data-hours-missing={missingHours.length}` as a stable hook. It pluralises honestly: exactly one affected
listing is **named** by title (because "1 listing" would send the host hunting for which), several are
**counted**. The link resolves to `/host/listings/{id}/availability` for one and `/host/listings` for
many — both existing routes.

## Verification

| Gate | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npx vitest run tests/listing` | 12 files, 95 passed |
| `npx vitest run` (full suite) | **1096 passed / 4 skipped**, up from the 1087/4 baseline (+9 = 6 + 3 new) |
| `npx eslint` on all four touched source files | clean |
| `git diff --exit-code` on `bookability.ts`, `search/query.ts`, `actions/listing.ts`, `validation/listing.ts`, `components/availability/` | byte-unchanged |
| grep gate: helper imported AND called on both surfaces | count=4, ≥4 required |
| each copy constant's literal text in `src/` | exactly 1 occurrence apiece, all in `hours-signal.ts` |

Zero regressions: no pre-existing test moved, and the +9 delta is exactly the nine cases added here.

## Success criteria

- [x] A published listing with zero hours shows the signal on its own `/host/listings` card and on
      `/host`, linking to `/host/listings/{id}/availability`
- [x] A published listing WITH hours shows the signal on neither surface (case 1, case 8)
- [x] A draft or unlisted listing with no hours shows the signal on neither surface (cases 3, 4 — and by
      construction, since the helper filters upstream of the render)
- [x] A second host's hours-less published listing appears in neither of the first host's surfaces
      (case 6, both directions)
- [x] No badge, no bookability value, no publish outcome, and no search result changes
- [x] One hours query per host-surface render

## Deviations from Plan

None — the plan executed exactly as written. The only thing recorded differently from the plan's text is
the mutation measurement, which the plan asked to be reported as *observed*: two of the three mutations
killed one case more than predicted, and that is written into the test header rather than smoothed over.

## Threat coverage

| Threat ID | Disposition | How it landed |
|---|---|---|
| T-IU7-01 | mitigated | The helper takes `hostId` and is called only with `session.user.id` on both surfaces; there is no listing-id or search-param path into it. Test case (6) asserts both directions. |
| T-IU7-02 | mitigated | `hoursMissing && availabilityHref` guard; search cards pass neither. Test case (9). |
| T-IU7-03 | mitigated | `bookability.ts` and `search/query.ts` gated byte-unchanged by `git diff --exit-code` in Tasks 1 and 3. |
| T-IU7-04 | mitigated | One correlated `NOT EXISTS` per render, collapsed into a `Set`; never called inside `rows.map`. |
| T-IU7-05 | n/a | No packages installed. |

## Known stubs

None.

## Threat flags

None — no new network endpoint, auth path, file access pattern, or schema change. The one new read is
owner-scoped and reaches only tables the two host surfaces already query.

## What remains open

The gate half of audit finding #4 is deliberately still open by decision, not by omission: `publishListing`
still permits going Live with an empty calendar. This work makes that state *visible and recoverable* on
both host surfaces; making it *impossible* would require touching the publish gate, which constraint #2
forbids and which would say nothing to hosts who are already live. The booker-facing side of the dead end
(what a booker sees on a listing whose every date reads Closed) is untouched and out of scope.

## Self-Check: PASSED

All six claimed files exist on disk; all five claimed commit hashes are present in `git log`.
