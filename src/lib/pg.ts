// Narrow an unknown thrown value to a Postgres error with a specific SQLSTATE `code`
// (postgres.js surfaces SQLSTATE on err.code). Used to catch 23P01 (exclusion_violation)
// and map it to a clean user-facing message — never string-match error text (locale-fragile).
export function isPgError(e: unknown, code: string): e is { code: string } {
  return typeof e === "object" && e !== null && "code" in e && (e as { code?: unknown }).code === code;
}
