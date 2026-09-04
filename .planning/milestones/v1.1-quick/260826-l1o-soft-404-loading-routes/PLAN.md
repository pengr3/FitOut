---
quick_id: 260826-l1o
slug: soft-404-loading-routes
date: 2026-08-26
status: planned
requirements: []
decisions_cited: [D-13]
---

# Quick: restore the real 404 on `/listings/[id]`

## The defect

`/listings/<draft|unlisted|missing>` answers **HTTP 200** carrying the not-found page.
`page.tsx:251` cites **D-13** — *"Draft/unlisted/missing → 404 to the public"* — and
`e2e/public-listing.spec.ts:385` asserts `404`. The code intends 404 and silently delivers 200.
This closes the gap between the stated contract and the behaviour; it does not invent a requirement.

## Cause — measured, not inferred

`loading.tsx` wraps the page in a Suspense boundary, so Next flushes the shell — committing the
`200` status line — before the page body runs `notFound()`. The not-found UI then streams in
underneath an already-sent 200.

Three measurements pin it:

| Experiment | Result |
| --- | --- |
| draft id, unmodified route | 200 |
| **nonexistent** id, same route | 200 — so it is the ROUTE, not the draft status |
| bogus path on a route with no `loading.tsx` | 404 |
| `notFound()` added to `generateMetadata` | **still 200** — the metadata hook is not early enough |
| `loading.tsx` temporarily removed | **404** ← cause confirmed |
| check hoisted into `layout.tsx`, `loading.tsx` kept | **404**, published still 200 ← the fix |

## Why not just delete `loading.tsx`

`tests/design/loading-coverage.test.ts` is a **build-blocking** gate (it runs inside
`npm run test:design`, which `npm run build` and CI's `gate-db-free` both run). Its rule: every page
that awaits on the server MUST have a `loading.tsx`, and dead ones are also a failure. Deleting the
file trades a status-code bug for a red gate and a lost loading state.

## Scope — ONE route, and the reasoning is recorded so it is not re-litigated

Nine routes call `notFound()` under a `loading.tsx`, so nine carry this defect. Only one has an
observable consequence. Measured anonymously, no cookies:

| Route(s) | Anonymous result | Verdict |
| --- | --- | --- |
| `listings/[id]` | **200 + real content** on a published listing | **FIX** — genuinely public and indexable |
| `listings/[id]/book` | 200, content withheld | skip — reached ONLY by `redirect()` from a server action (`actions/booking.ts:351,513`); no `<a href>` points to it and the URL needs an unguessable `?hold=<uuid>`, so no crawler can discover it |
| 7 × `bookings/[id]*`, `host/*` | **307 → `/login`** | skip — the page never renders for an anonymous client, so its status is unobservable from outside a session |

The seven also carry `T-04-CONFIRMIDOR`-class owner-gates their own headers mark MUST-NOT-SKIP, and
none owns a layout (they share `(app)` / `(host)/host`, which wrap many routes). Hoisting those
means new layouts at dynamic segments plus reworking security guards on money surfaces — for a
status code no crawler can observe. **Deliberately not done. Recorded as accepted.**

## What the fix is worth, stated honestly

**No data leaks today** — measured: on a draft, the listing's title is absent from the response body
and the gate at `page.tsx:252` fires correctly. No security issue, no user-visible bug. The value is
**index hygiene**: a listing that is unpublished or deleted was previously crawlable, and only a 404
removes it from Google's index — a 200 keeps it, so bookers keep landing on dead listings. There is
no `sitemap.ts` / `robots.ts` / `noindex` in the app today, so the exposure is **latent**, which is
exactly why it is cheap now and expensive later.

## Tasks

### Task 1 — one rule, one place, then hoist it above the boundary

- Add `src/lib/listing/public-listing.ts`:
  - `isPubliclyViewable(status, deletedAt)` — the D-13 predicate as ONE expression.
  - `assertPublicListing(id)` — a `cache()`d PK lookup that calls `notFound()` unless viewable.
    `cache()` is load-bearing: the layout and any later caller share one query per request.
- `listings/[id]/(detail)/layout.tsx` becomes `async`, takes `params`, and calls
  `assertPublicListing(id)` — the layout renders in the SHELL, above the Suspense boundary, so this
  blocks the flush and the status is still settable.
- `listings/[id]/(detail)/page.tsx` keeps its own guard (it must, for type narrowing on the joined
  row) but expresses it through `isPubliclyViewable`, so the rule cannot drift between the two.

**Cost, acknowledged:** the header/footer no longer stream until one indexed PK lookup resolves.
That is the price of a settable status line, and it is one cached query.

### Task 2 — prove it, including the negative

- `curl` matrix: draft → 404, nonexistent → 404, published → 200 **with content present**.
- `e2e/public-listing.spec.ts` green (`:385` is the pre-existing regression gate; `:390` covers unlisted).
- Watch it RED first: revert the layout hoist, confirm `:385` fails with `expected 404, received 200`.
- Gates: `tsc`, `npm run test:design` (loading-coverage must stay green — an awaiting LAYOUT is a new
  shape for that gate), `npm run build`.

## Acceptance

1. `/listings/<draft>` and `/listings/<missing>` return **404**.
2. `/listings/<published>` returns **200** and still renders its content.
3. `loading.tsx` still exists and loading-coverage is green.
4. `e2e/public-listing.spec.ts` passes, and was watched failing before the fix.
5. The eight skipped routes are recorded as accepted, with the reason, where the next reader will find it.
