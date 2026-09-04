// THE DELIBERATE THROW — the driver for `e2e/error-leak.spec.ts` (T-11-ERRLEAK / T-11-THROWROUTE).
//
// This route exists to make one assertion possible: that a boundary handed a REAL error whose text
// is a known sentinel produces a DOM containing that sentinel ZERO times. A prop type cannot claim
// that (`patterns/error-state.tsx`'s header says so about itself), and neither can a source scan.
// Only a rendered boundary can, and a rendered boundary needs something to have thrown.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT MUST NOT EXIST IN PRODUCTION (T-11-THROWROUTE), AND THE GUARD IS THE SAME ONE `/dev/theme` USES
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The first line of the body compares the BUILD-TIME environment constant and hands off to Next's
// built-in not-found. Two properties follow and both are the reason it is written this way: the
// bundler can prune the branch, and there is no operator-settable variable anywhere in the path — so
// no deploy, no dashboard toggle and no leaked `.env` can turn a forced-500 affordance back on. The
// noindex metadata sits on top of that, mirroring `/dev/theme` and `invite/[token]`.
//
// VERIFIED, not assumed: `npm run build && npm start` and a request to `/dev/throw` returns 404. The
// measurement is in this plan's SUMMARY.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A DEDICATED ROUTE AND NOT A QUERY PARAM ON `/dev/theme` — MEASURED, AND NOT FOR THE PREDICTED
// REASON
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 11-18 proposed `?throw=1` on `/dev/theme` first, and sanctioned this file only if that proved
// impractical. It was BUILT and measured rather than reasoned about, and the prediction was wrong in
// the interesting direction:
//
//   • PREDICTED: awaiting `searchParams` would flip `/dev/theme` from `○ Static` to `ƒ Dynamic` and
//     cost the build a static route. FALSE. Measured: `/dev/theme` stayed `○`, and the whole route
//     table came back byte-identical. The production guard runs BEFORE the dynamic API is touched,
//     so the prerender short-circuits into the 404 and never reaches `await searchParams`.
//
//   • WHAT ACTUALLY BIT: the page's default export had to become `async`, and
//     `tests/design/loading-coverage.test.ts` classifies on exactly that. Watched, verbatim:
//
//       AssertionError: these routes await on the server and have no loading.tsx …: expected
//       [ 'src/app/dev/theme' ] to deeply equal []
//       AssertionError: the routes that qualify changed. …: expected 21 to be 20
//
//     `/dev/theme` is one of the SEVEN routes that gate names as routes which must NOT have a
//     `loading.tsx`. Satisfying it would have meant adding a fallback that can never render (the page
//     is static fixtures in dev and a 404 in production) or weakening a shipped gate — either of
//     which is a worse trade than one twelve-line route. Reverted; `/dev/theme` is untouched.
//
// The cost of THIS file, stated plainly so it is not discovered later: it is a 28th `page.tsx`, so
// `loading-coverage.test.ts`'s pinned counts move 27→28 and 7→8. That gate's own comment asks for
// exactly this — *"a change here means a ROUTE WAS ADDED and somebody has to decide which side it is
// on"*. The decision: the default export is SYNC and throws immediately, so the page component can
// never suspend and a `loading.tsx` beside it could never render. It joins the non-qualifying seven.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT DISCLOSES NOTHING AND REACHES NOTHING
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// No database read, no network call, no dependence on the local UAT seed — the same properties that
// make `/dev/theme` the driver page for `scroll-area-overflow.spec.ts` and `reduced-motion.spec.ts`.
// The spec that drives this route therefore needs no seed and no secret, and it renders identically
// on a fresh clone.
//
// WHICH BOUNDARY CATCHES IT: `src/app/error.tsx`, the root one — `dev/` sits under no route group, so
// nothing nearer claims it. That was CONFIRMED by driving this route and reading the rendered copy,
// not inferred from the file tree; plan 11-17 measured that an own `loading.tsx` does not suppress an
// ancestor's, and boundaries nest by the same rules.

import type { Metadata } from "next";
import { notFound } from "next/navigation";

/**
 * The sentinel, exported so the e2e spec can import it rather than retype it.
 *
 * TWO LITERALS IN TWO FILES ARE TWO THINGS THAT DRIFT, and here the drift is silent in the worst
 * possible way: the spec asserts a string appears ZERO times, so a typo on either side makes the
 * assertion pass against a page that is leaking. A shared constant makes the zero-count a statement
 * about the same string that was thrown.
 */
export const SENTINEL_LEAK_PROBE = "SENTINEL_LEAK_PROBE";

/** Noindex, following `/dev/theme` and `invite/[token]`. The production guard already 404s it. */
export const metadata: Metadata = {
  title: "Deliberate throw",
  robots: { index: false, follow: false },
};

export default function DevThrowPage() {
  if (process.env.NODE_ENV === "production") notFound();

  // A SERVER-RENDER throw, deliberately, rather than a client-side one. In development Next hands
  // the boundary an error whose message is this string verbatim; in production it redacts it. So the
  // dev run is the STRONGER test — the boundary really is holding the sentinel when the spec asserts
  // the DOM does not contain it — and a spec that only ever ran against the redacted production
  // error would pass without proving anything about this app's code.
  throw new Error(SENTINEL_LEAK_PROBE);
}
