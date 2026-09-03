---
quick_id: 260826-l1o
slug: soft-404-loading-routes
date: 2026-08-26
status: complete
files_modified:
  - src/lib/listing/public-listing.ts          # new
  - src/app/listings/[id]/(detail)/layout.tsx
  - src/app/listings/[id]/(detail)/page.tsx
verification:
  tsc: "exit 0"
  e2e_public_listing: "8 passed (was 1 failed / 3 passed / 4 skipped by the serial abort)"
  test_design: "exit 0 · 59 files · 1140 passed | 3 skipped — loading-coverage unmoved"
  build: "exit 0 (lint + test:design + next build)"
  vitest: "exit 0 · 185 files · 2121 passed | 5 skipped"
  http_matrix: "draft 404 · nonexistent 404 · published 200 with content present"
decisions_cited: [D-13]
---

# Quick 260826-l1o — `/listings/[id]` answers a real 404 again

## What was wrong

`/listings/<draft|unlisted|missing>` returned **HTTP 200** carrying the not-found page.
`page.tsx:251` cites D-13 (*"Draft/unlisted/missing → 404 to the public"*) and
`e2e/public-listing.spec.ts:385` asserts `404`. The intent and the test both already said 404; only
the behaviour disagreed. **No data was ever exposed** — measured: on a draft the listing's title is
absent from the response body and the page's guard fires correctly. The defect was the status line,
which is the half machines read.

## The cause, and the two fixes that don't work

`loading.tsx` wraps the page in a Suspense boundary, so Next flushes the shell — committing `200` —
before the page body reaches `notFound()`. Every candidate was measured, not reasoned:

| Experiment | Result |
| --- | --- |
| draft id, unmodified | 200 |
| **nonexistent** id, same route | 200 — so the ROUTE is the variable, not the draft status |
| bogus path, route with no `loading.tsx` | 404 |
| `notFound()` added to `generateMetadata` | **200 — not early enough**, despite resolving before the head |
| `loading.tsx` temporarily deleted | 404 — confirms the cause, but is not available as a fix |
| check hoisted into `layout.tsx`, `loading.tsx` kept | **404**, published still 200 ← shipped |

**Deleting `loading.tsx` is not available.** `tests/design/loading-coverage.test.ts` is build-blocking
(inside `npm run test:design`, which `npm run build` and CI's `gate-db-free` both run) and requires a
`loading.tsx` on every page that awaits. It would trade a status bug for a red gate and a lost
loading state.

## What shipped

- **`src/lib/listing/public-listing.ts`** (new) — `isPubliclyViewable(status, deletedAt)` is D-13 as
  ONE expression, and `assertPublicListing(id)` is a `cache()`d PK lookup that calls `notFound()`.
  `deletedAt` is part of the rule, not a separate concern: a soft-deleted row keeps `published`, so a
  status-only test would serve deleted listings.
- **`(detail)/layout.tsx`** — now `async`, takes `params`, calls `assertPublicListing`. A layout
  renders in the shell, above the page's Suspense boundary, so awaiting here blocks the flush and the
  status is still settable.
- **`(detail)/page.tsx`** — keeps its guard (it narrows `row` for everything below) but expresses it
  through `isPubliclyViewable`, so the layout that sets the STATUS and the page that renders the BODY
  cannot drift apart.

**Cost, accepted deliberately:** the header and footer no longer stream until one indexed PK lookup
resolves. `cache()` makes it a single query per request regardless of caller count.

## Watched RED, and the discriminator

- **RED first:** before the fix, `public-listing.spec.ts:385` failed with exactly
  `Expected: 404 / Received: 200`.
- **The discriminator matters more.** The page was edited in the same change, so "it passes now" does
  not prove the LAYOUT is what fixed it. The layout call was commented out with the page edit left in
  place: **back to 200 on both the draft and the nonexistent id.** Restored: 404 / 404 / 200. The
  layout is load-bearing and the page edit is not doing the work.

## Scope — one route of nine, recorded so it is not re-litigated

Nine routes pair `loading.tsx` with `notFound()`, so nine carry this defect. Measured anonymously
(no cookies), only one has an observable consequence:

| Route(s) | Anonymous result | Verdict |
| --- | --- | --- |
| `listings/[id]` | **200 + real content** on a published listing | **FIXED** — public and indexable |
| `listings/[id]/book` | 200, content withheld | skipped — reached ONLY by `redirect()` from a server action (`actions/booking.ts:351,513`); no `<a href>` points to it and the URL needs an unguessable `?hold=<uuid>`, so no crawler can discover it |
| 7 × `bookings/[id]*`, `host/*` | **307 → `/login`** | skipped — the page never renders anonymously, so its status is unobservable from outside a session |

The seven also carry `T-04-CONFIRMIDOR`-class owner-gates their headers mark MUST-NOT-SKIP, and none
owns a layout (they share `(app)` / `(host)/host`, which wrap many routes). Fixing them means new
layouts at dynamic segments plus reworking security guards on money paths, for a status code no
crawler can observe. **Accepted, not overlooked** — and `public-listing.ts`'s header says so, so
anything that later makes one of them publicly reachable knows what to call.

## Why it was worth doing at all

Index hygiene, not security. A listing that is unpublished or deleted was previously crawlable, and
only a 404 removes it from a search index — a 200 keeps it, so bookers keep landing on dead listings
on the demand side. The app ships no `sitemap.ts`, no `robots.ts` and no `noindex`, so the exposure
is **latent**: cheap now at one route, expensive once dead URLs are indexed.
