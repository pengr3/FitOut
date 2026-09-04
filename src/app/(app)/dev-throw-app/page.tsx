// THE DELIBERATE THROW, INSIDE THE `(app)` ROUTE GROUP — one of the four plan 17-12 added.
//
// `src/app/dev/throw/page.tsx` is the original and this is a copy of it, deliberately. Read that
// file first: it carries the argument for why a throw affordance exists at all, why it is a route
// rather than a query parameter, and why the guard below is written the way it is. What follows here
// is only what is DIFFERENT about this copy.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY FOUR FILES AND NOT ONE PARAMETERISED ROUTE — THE CORRECTION THAT MADE THIS PLAN
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// WHICH BOUNDARY CATCHES A THROW IS A PROPERTY OF THE THROWING FILE'S PATH. Not of its URL, not of a
// segment parameter it is handed, not of anything decidable at request time. `src/app/dev/` sits
// under no route group, so the only boundary the original can ever reach is `src/app/error.tsx` —
// which is why four of the five shipped boundaries had NO way in at all and `e2e/overflow-320.spec
// .ts` carried four named skips saying exactly that.
//
// 17-UI-SPEC's `[11-21]` row proposes one `src/app/dev/throw-in/[group]/page.tsx`. That file would
// sit under no route group EITHER, so every value of `[group]` would reach the root boundary and
// close nothing — a "covered" row whose rendered copy is the root's copy is worse than the skip it
// replaces, because it reports success. The corrected shape is one file per group, each inheriting
// that group's real layout stack, which is the composition a booker actually meets.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHICH BOUNDARY CATCHES THIS ONE: `src/app/(app)/error.tsx`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file is a child segment of `(app)`, so that group's boundary is the nearest one above it.
// CONFIRMED BY DRIVING THE ROUTE AND READING THE RENDERED COPY, not inferred from the file tree —
// the same standard the original's header sets for its own claim. Measured 30 August 2026 at 320px:
// the document carries the route out `Your bookings`, which ONLY `(app)/error.tsx` renders. The root
// boundary's route out is `Back to search`; it is nowhere in the document. The e2e row's `tell`
// asserts that same string for that same reason.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT INHERITS: THE BLOCKING SESSION GATE, AND THAT IS THE POINT RATHER THAN THE PRICE
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `(app)/layout.tsx` reads the session and redirects to `/login` without one, and that redirect runs
// to completion BEFORE the layout returns any JSX (T-04-06; `tests/design/blocking-session-gate
// .test.ts` asserts it over the AST). So an anonymous request to this route never reaches the throw
// at all — the layout answers first, with a redirect. Reaching this boundary therefore costs a
// session, and the e2e row pays it by signing a booker up through the shipped form.
//
// That is not a cost worth engineering around. A throw route that somehow skipped the gate would
// render its error inside a shell no signed-out person can see, i.e. it would measure a composition
// nobody meets. The gate is part of the subject.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT MUST NOT EXIST IN PRODUCTION (T-17-61), AND THE GUARD IS THE ORIGINAL'S, UNCHANGED
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The first statement of the body compares the BUILD-TIME environment constant and hands off to
// Next's built-in not-found. Both properties the original names carry over: the bundler can prune the
// branch, and there is NO operator-settable variable anywhere in the path — no env flag, no config
// value, no dashboard toggle and no leaked `.env` can turn a forced-500 affordance back on. The
// noindex metadata sits on top of that.
//
// VERIFIED BY PROBE, NOT BY READING THE SOURCE. `npx next build && npx next start -p 3100`, then a
// request to `/dev-throw-app` CARRYING A REAL SESSION — because an anonymous one is answered by the
// layout's redirect above and would prove nothing about this file. Measured 30 August 2026:
//
//   anonymous        307 → /login     the session gate, answering first
//   with a session   **404**          the root not-found document, no boundary, no sentinel
//
// ⚠ ONE OF THE FOUR DOES NOT READ 404, and it is not this one — see `(host)/host/dev-throw/page.tsx`,
// where an inherited `loading.tsx` flushes the shell before the guard's `notFound()` can set the
// status. `(app)` has no group-level `loading.tsx`, which is why this reading is the hard one. All
// eight readings are in plan 17-12's SUMMARY.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// ITS COST TO `tests/design/loading-coverage.test.ts`, STATED SO IT IS NOT DISCOVERED LATER
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// It is one of four new `page.tsx` files, so that gate's pinned counts move 29→33 and 8→12. Its own
// comment asks for exactly this — *"a change here means a ROUTE WAS ADDED and needs a decision"* —
// and the decision is the same one the original recorded: the default export below is SYNC and throws
// immediately, so the page component can never suspend and a `loading.tsx` beside it could never
// render. All four join the non-qualifying side, and `EXPECTED_QUALIFYING` does NOT move.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { SENTINEL_LEAK_PROBE } from "@/app/dev/throw/page";

/** Noindex, following `/dev/theme`, `invite/[token]` and the original. The guard already 404s it. */
export const metadata: Metadata = {
  title: "Deliberate throw · (app)",
  robots: { index: false, follow: false },
};

export default function DevThrowAppPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // A SERVER-RENDER throw, as the original: in development Next hands the boundary an error whose
  // message is this string verbatim, and in production it redacts it, so the dev run is the stronger
  // test. The sentinel is IMPORTED and never retyped — `e2e/error-leak.spec.ts` asserts a string
  // appears ZERO times, so a typo on either side would make that assertion pass against a page that
  // is leaking.
  throw new Error(SENTINEL_LEAK_PROBE);
}
