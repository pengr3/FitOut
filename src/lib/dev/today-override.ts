// D-08's "outside production" idiom, applied to the SERVER (17-D26, plan 17-14).
//
// WHY THIS EXISTS. `/listings/[id]` renders its availability calendar from venue-local TODAY: the RSC
// computes `todayLocal` from `new Date()` and hands `startMonth`, `endMonth` and `disabled` down from
// it. That makes the calendar a function of the wall clock, which makes every GATE-01 baseline that
// photographs it expire at the next venue-local day-rollover. Measured (17-D26): the committed
// references were minted on 2026-08-26 and `gate-visual` went red on 2026-08-27 for that reason
// alone, and nobody noticed because nothing was pushed for four days. A gate whose baselines expire
// within a day trains its readers to expect red.
//
// WHAT THE SEAM REACHES, MEASURED BY PLAN 19.1-19. The override moves the month bounds, the disabled
// matchers and the opening day. Until that plan, it did NOT reach the today ring: when its prop was
// absent, the vendored react-day-picker layer injected its own wall-clock today. Both availability
// calendar twins now pass the venue-local instant explicitly, completing the seam that was originally
// built to keep the four listing-detail references from expiring at the day rollover.
//
// ⚠ WHY IT IS A SERVER SEAM AND NOT A PLAYWRIGHT CLOCK — MEASURED, AND THE FIRST PRESCRIPTION WAS
// WRONG. `[17-D26]`'s first draft prescribed `page.clock.install()` on the three calendar-bearing
// visual drives. Probed before it was written: with the browser clock moved to 2026-11-05, the
// in-page `new Date()` DID move, and the rendered calendar did NOT — `data-today` stayed 30, the
// caption stayed August 2026, the disabled count stayed 29. `page.clock` emulates time in the
// BROWSER; `todayLocal` is computed in the Node process before the HTML is sent, so nothing the
// browser believes about the date can reach it. `checkoutDrive` is a real `page.clock` precedent for
// a client-side `setInterval`, and that resemblance is exactly what made the wrong fix look right.
//
// ── THE THREAT, AND THE TWO GUARDS (T-10-02 / T-12-02-PARAMTAMPER, ASVS V5) ───────────────────────
//
// This reads a QUERY PARAMETER — attacker-controllable input — on a PUBLIC route, and its value
// steers date arithmetic that reaches a database read. Both guards below are load-bearing:
//
//   1. THE PRODUCTION GUARD IS FIRST AND IT IS A BUILD-TIME CONSTANT. `process.env.NODE_ENV` is
//      inlined by the bundler, so in a production build this function is `return null` and the parse
//      below is dead code — pruned, not merely skipped at runtime. It is deliberately NOT an
//      operator-settable env var: an env var can be flipped on a live deploy, a build-time constant
//      cannot. Same reasoning, same spelling, as `theme-query-param.tsx`.
//   2. THE VALUE IS PARSED, NEVER CAST. `parsePickedDate` is the SAME strict parser the searched-window
//      contract already uses for the same `YYYY-MM-DD` shape — regex-anchored, range-checked and
//      round-trip guarded so `2026-02-31` is rejected. Reusing it is the point: this file introduces
//      no second date idiom, and a garbage value degrades to `null`, which restores the ordinary
//      wall-clock behaviour. There is no input that throws and none that 404s.
//
// A NOTE ON WHAT THIS DOES *NOT* WIDEN. It returns a date and nothing else. It cannot select a
// listing, cannot reach a price, cannot authorise a hold, and cannot make a non-public listing
// render — every one of those is decided elsewhere and re-derived server-side (D-130). The worst a
// caller can do outside production is look at their own calendar on a different day.

import { parsePickedDate } from "@/lib/search/window-params";

/** The venue-local day shape the listing RSC uses. Structurally the `PickedDate` triple, minus `iso`. */
export type TodayOverride = { year: number; month: number; day: number };

/**
 * The `?today=YYYY-MM-DD` override, honoured OUTSIDE production only.
 *
 * Returns `null` in production ALWAYS — before the value is even looked at — and `null` outside
 * production for anything that is not a real calendar date. A `null` return means "no override", and
 * the caller falls back to venue-local today exactly as it did before this seam existed.
 */
export function devTodayOverride(raw: string | undefined): TodayOverride | null {
  // GUARD 1 — must stay the first statement in this function. See the header.
  if (process.env.NODE_ENV === "production") return null;

  // GUARD 2 — parsed by the shared strict parser, never cast.
  const picked = parsePickedDate(raw);
  if (picked === null) return null;

  return { year: picked.year, month: picked.month, day: picked.day };
}
