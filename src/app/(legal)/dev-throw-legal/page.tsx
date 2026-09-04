// THE DELIBERATE THROW, INSIDE THE `(legal)` ROUTE GROUP — one of the four plan 17-12 added.
//
// `src/app/dev/throw/page.tsx` is the original and this is a copy of it. Read that file first for
// why a throw affordance exists at all and why the guard below is written the way it is; and read
// `src/app/(app)/dev-throw-app/page.tsx` for the four-files-not-one-route argument, written out once
// rather than four times. What follows is only what is different about THIS copy.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH BOUNDARY CATCHES IT: `src/app/(legal)/error.tsx`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file is a child segment of `(legal)`, so that group's boundary is the nearest one above it.
// CONFIRMED BY DRIVING THE ROUTE AND READING THE RENDERED COPY. Measured 30 August 2026 at 320px:
// the document carries the route out `Back to FitOut`, which only this boundary renders — the root's
// is `Back to search` and it is nowhere in the document.
//
// ⚠ THIS ROUTE IS THE ONLY WAY INTO THAT BOUNDARY, AND THE GROUP'S OWN LAYOUT EXPLAINS WHY. `/terms`
// and `/privacy` are static prose that reach no data store and no request state — which is
// T-11-STATICLEAK's whole mitigation and the reason the group is statically prerendered — so there is
// no input that can make either of them throw. `(legal)/layout.tsx` records that `(legal)/error.tsx`
// exists because STATE-02 wants one boundary per group *"even where it should never fire"*. A
// boundary that should never fire is still a boundary a booker can meet on a bad day, and until this
// file existed it was the one surface in the app with no route into it at all.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT INHERITS: NOTHING THAT GATES
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(legal)/layout.tsx` renders the presentational shell with the anonymous actions cluster and a
// `max-w-prose` measure, and reads nothing: no session, no request state, no data store. Verified
// rather than taken from the comment. So this route needs no fixture, and like `(auth)` it is one of
// the two cheapest rows in the set.
//
// ⚠ ONE CONSEQUENCE WORTH NAMING: the group is statically prerendered precisely because nothing in it
// reaches a dynamic API, and this page reaches none either — the guard below reads a build-time
// constant, which is not a bailout. The original measured exactly this question for `/dev/theme` and
// found the whole route table came back byte-identical.
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
// request to `/dev-throw-legal`. Measured: **404**, and like `(auth)` that reading is unambiguous —
// nothing above this page could have answered instead of it. The four status codes are in plan
// 17-12's SUMMARY.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ITS COST TO `tests/design/loading-coverage.test.ts`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// One of four new `page.tsx` files, so that gate's pinned counts move 29→33 and 8→12. The decision
// its comment asks for is the original's: the default export below is SYNC and throws immediately, so
// the page component can never suspend and a `loading.tsx` beside it could never render. It joins the
// non-qualifying side and `EXPECTED_QUALIFYING` does not move. That is also why this file gets no
// `loading.tsx` even though it is the first route added to a group whose layout header explains at
// length why the group has none.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SENTINEL_LEAK_PROBE } from "@/app/dev/throw/page";

/** Noindex, following `/dev/theme`, `invite/[token]` and the original. The guard already 404s it. */
export const metadata: Metadata = {
  title: "Deliberate throw · (legal)",
  robots: { index: false, follow: false },
};

export default function DevThrowLegalPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // A SERVER-RENDER throw, as the original. The sentinel is IMPORTED and never retyped —
  // `e2e/error-leak.spec.ts` asserts a string appears ZERO times, so a typo on either side would make
  // that assertion pass against a page that is leaking.
  throw new Error(SENTINEL_LEAK_PROBE);
}
