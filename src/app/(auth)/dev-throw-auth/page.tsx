// THE DELIBERATE THROW, INSIDE THE `(auth)` ROUTE GROUP — one of the four plan 17-12 added.
//
// `src/app/dev/throw/page.tsx` is the original and this is a copy of it. Read that file first for
// why a throw affordance exists at all and why the guard below is written the way it is; and read
// `src/app/(app)/dev-throw-app/page.tsx` for the four-files-not-one-route argument, written out once
// rather than four times. What follows is only what is different about THIS copy.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH BOUNDARY CATCHES IT: `src/app/(auth)/error.tsx`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file is a child segment of `(auth)`, so that group's boundary is the nearest one above it.
// CONFIRMED BY DRIVING THE ROUTE AND READING THE RENDERED COPY. Measured 30 August 2026 at 320px:
// the document carries the route out `Back to log in`, which only this boundary renders — the root's
// is `Back to search` and it is nowhere in the document.
//
// ⚠ THE URL SEGMENT IS `dev-throw-auth` AND NOT `dev-throw`, AND THAT IS NOT A NAMING PREFERENCE.
// `(app)` and `(auth)` are both route GROUPS at the root of the URL namespace, so a page named
// `dev-throw` in each would be two parallel pages resolving to the same `/dev-throw` and Next fails
// the build. Four distinct segments is what makes four files legal at once.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT INHERITS: NOTHING THAT GATES
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(auth)/layout.tsx` is purely presentational — a centred column, the wordmark and the one `main`
// landmark — and its own header says so in as many words: the real auth gate is the per-page session
// read and the optimistic redirect in `src/proxy.ts`, NOT that layout. Verified rather than
// taken from the comment: there is no session read and no `redirect()` in that file. So this route
// needs no fixture at all, which makes it and `(legal)` the two cheapest rows in the set.
//
// ⚠ `src/proxy.ts` matches `/login` and `/signup` and does not match this path, so a SIGNED-IN
// visitor reaches this route too and sees the same boundary. That is worth one sentence because the
// group's own layout header records the same asymmetry for `/forgot-password` and `/reset-password`.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT MUST NOT EXIST IN PRODUCTION (T-17-61), AND THE GUARD IS THE ORIGINAL'S, UNCHANGED
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The first statement of the body compares the BUILD-TIME environment constant and hands off to
// Next's built-in not-found: the bundler can prune the branch, and there is NO operator-settable
// variable anywhere in the path. The noindex metadata sits on top of that.
//
// VERIFIED BY PROBE, NOT BY READING THE SOURCE. `npx next build && npx next start -p 3100`, then a
// request to `/dev-throw-auth`. Measured: **404**, and unlike the two gated routes in this set that
// reading is unambiguous — nothing above this page could have answered instead of it. The four status
// codes are in plan 17-12's SUMMARY.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ITS COST TO `tests/design/loading-coverage.test.ts`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// One of four new `page.tsx` files, so that gate's pinned counts move 29→33 and 8→12. The decision
// its comment asks for is the original's: the default export below is SYNC and throws immediately, so
// the page component can never suspend and a `loading.tsx` beside it could never render. It joins the
// non-qualifying side and `EXPECTED_QUALIFYING` does not move. ⚠ That matters more here than
// anywhere: the four `(auth)` pages are the gate's own worked example of routes whose asynchronous
// work sits in event handlers rather than in the default export, so a fifth `(auth)` route landing on
// the WRONG side of that classifier is the specific mistake this file could have made.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SENTINEL_LEAK_PROBE } from "@/app/dev/throw/page";

/** Noindex, following `/dev/theme`, `invite/[token]` and the original. The guard already 404s it. */
export const metadata: Metadata = {
  title: "Deliberate throw · (auth)",
  robots: { index: false, follow: false },
};

export default function DevThrowAuthPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // A SERVER-RENDER throw, as the original. The sentinel is IMPORTED and never retyped —
  // `e2e/error-leak.spec.ts` asserts a string appears ZERO times, so a typo on either side would make
  // that assertion pass against a page that is leaking.
  throw new Error(SENTINEL_LEAK_PROBE);
}
