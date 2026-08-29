// THE DELIBERATE THROW, INSIDE `(host)/host` — one of the four plan 17-12 added.
//
// `src/app/dev/throw/page.tsx` is the original and this is a copy of it. Read that file first for
// why a throw affordance exists at all and why the guard below is written the way it is; and read
// `src/app/(app)/dev-throw-app/page.tsx` for the four-files-not-one-route argument, which is the
// correction this whole plan turns on and is written out once rather than four times. What follows
// is only what is different about THIS copy.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH BOUNDARY CATCHES IT: `src/app/(host)/host/error.tsx`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file is a child segment of `host`, so that segment's boundary is the nearest one above it —
// note it is `(host)/host/error.tsx` and not `(host)/error.tsx`; the group directory carries no
// boundary of its own, and the URL segment does. CONFIRMED BY DRIVING THE ROUTE AND READING THE
// RENDERED COPY. Measured 30 August 2026 at 320px: the document carries the route out `Host
// dashboard`, which only this boundary renders. The root boundary's `Back to search` is nowhere in
// it, which is the check that separates a closed row from one that reached the wrong boundary.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT INHERITS: TWO BLOCKING GATES, WHICH IS ONE MORE THAN ANY OTHER ROUTE IN THIS SET
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(host)/host/layout.tsx` reads the session and redirects to `/login` without one, AND redirects a
// signed-in visitor without the host capability to `/` (D-04 / T-04-02). Both run to completion
// before the layout returns any JSX, and `tests/design/blocking-session-gate.test.ts` asserts that
// over the AST with `redirects: 2` and the capability guard declared for this file's layout
// specifically.
//
// So reaching this boundary costs a session AND the host capability. The e2e row pays for both by
// signing up through the shipped form with the host intent, which the server maps to the capability
// flag (the flag is `input: false`, so that is the only honest way to get it). An anonymous or
// booker-only request never reaches the throw at all — the layout answers first.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT MUST NOT EXIST IN PRODUCTION (T-17-61), AND THE GUARD IS THE ORIGINAL'S, UNCHANGED
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The first statement of the body compares the BUILD-TIME environment constant and hands off to
// Next's built-in not-found: the bundler can prune the branch, and there is NO operator-settable
// variable anywhere in the path. The noindex metadata sits on top of that.
//
// VERIFIED BY PROBE, NOT BY READING THE SOURCE — AND THE PROBE FOUND SOMETHING THE OTHER THREE DID
// NOT. `npx next build && npx next start -p 3100`, then a request to `/host/dev-throw` CARRYING A
// REAL HOST SESSION (an anonymous one is answered by the layout's redirect and would prove nothing
// about this file). Measured 30 August 2026, confirmed twice — once through Chromium and once through
// a bare `curl` with the session cookie, because the reading was surprising:
//
//   anonymous                 307 → /login          the session gate, answering first
//   host session              **200**, and the document is the ROOT not-found
//   the same request's body   `We couldn't find that page` · SENTINEL_LEAK_PROBE x0 ·
//                             error-state x0 · the host shell's own markup already flushed
//
// ⚠ THIS ROUTE ANSWERS A **SOFT 404** IN PRODUCTION WHILE THE OTHER THREE ANSWER A HARD ONE, and the
// cause is a file that has nothing to do with this one: `src/app/(host)/host/loading.tsx`. A
// `loading.tsx` at the `host` segment wraps every descendant in a Suspense boundary ABOVE this page,
// so the shell is flushed — and the 200 committed — before the page body runs and calls `notFound()`.
// That is the exact mechanism `src/app/listings/[id]/(detail)/layout.tsx` records for the listing
// route and moved its own assert into a LAYOUT to defeat. `(app)`, `(auth)` and `(legal)` have no
// group-level `loading.tsx`, which is the whole of why their three probes read 404.
//
// WHAT THE CONTROL ACTUALLY CLAIMS IS STILL TRUE, and it is worth separating the two. T-17-61 is
// about REACHABILITY: measured, the guard fires, the throw never happens, no boundary renders, and
// the sentinel appears ZERO times in the served bytes. What a visitor gets is the not-found document.
// The status line is wrong; the affordance is gone. Recorded rather than repaired because the repair
// is somebody else's file — deleting or relocating `(host)/host/loading.tsx` would take a shipped
// STATE-01 fallback with it — and because a status code nobody's fix depends on is not worth a
// product change made from inside an audit. Plan 17-12's SUMMARY carries all eight readings.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ITS COST TO `tests/design/loading-coverage.test.ts`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// One of four new `page.tsx` files, so that gate's pinned counts move 29→33 and 8→12. The decision
// its comment asks for is the original's: the default export below is SYNC and throws immediately, so
// the page component can never suspend and a `loading.tsx` beside it could never render. It joins the
// non-qualifying side and `EXPECTED_QUALIFYING` does not move.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SENTINEL_LEAK_PROBE } from "@/app/dev/throw/page";

/** Noindex, following `/dev/theme`, `invite/[token]` and the original. The guard already 404s it. */
export const metadata: Metadata = {
  title: "Deliberate throw · (host)/host",
  robots: { index: false, follow: false },
};

export default function DevThrowHostPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // A SERVER-RENDER throw, as the original. The sentinel is IMPORTED and never retyped —
  // `e2e/error-leak.spec.ts` asserts a string appears ZERO times, so a typo on either side would make
  // that assertion pass against a page that is leaking.
  throw new Error(SENTINEL_LEAK_PROBE);
}
