// Narrow an unknown thrown value to a Postgres error with a specific SQLSTATE `code`
// (postgres.js surfaces SQLSTATE on err.code). Used to catch 23P01 (exclusion_violation),
// 40P01 (deadlock_detected), 23505 (unique_violation), etc. and map them to clean user-facing
// results — never string-match error text (locale-fragile).
//
// Drizzle wraps every driver error in a `DrizzleQueryError` ("Failed query: …") whose `.cause`
// holds the original postgres.js error that actually carries the SQLSTATE. A raw postgres.js throw
// (e.g. from the exclusion-race harness) exposes `.code` at the top level, but a Drizzle-issued
// query (createPendingHold's savepoint insert, mapBookingError's input) exposes it one level down on
// `.cause`. Walk the cause chain so BOTH shapes are detected identically — otherwise a wrapped 23P01
// slips past the catch, aborts the outer tx, and surfaces the raw 500 the whole WR-03 design prevents.
// Bounded depth guards against a pathological cause cycle.
export function isPgError(e: unknown, code: string): e is { code: string } {
  for (let cur: unknown = e, depth = 0; cur != null && depth < 10; depth++) {
    if (typeof cur === "object" && "code" in cur && (cur as { code?: unknown }).code === code) {
      return true;
    }
    cur = (cur as { cause?: unknown }).cause;
  }
  return false;
}
