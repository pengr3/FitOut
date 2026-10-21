import { RetryAfterError } from "inngest";

/** Drizzle wraps driver errors; inspect bounded causes without exposing query text. */
export function databaseCapacityExhausted(error: unknown): boolean {
  const pending: unknown[] = [error];
  const seen = new Set<unknown>();
  for (let inspected = 0; pending.length && inspected < 12; inspected++) {
    const current = pending.shift();
    if (!current || typeof current !== "object" || seen.has(current)) continue;
    seen.add(current);
    const item = current as { message?: unknown; cause?: unknown; errors?: unknown };
    if (typeof item.message === "string" && /account or project has exceeded the quota|exceeded (?:the )?(?:compute(?: time)?|database) quota/i.test(item.message)) return true;
    if (item.cause) pending.push(item.cause);
    if (Array.isArray(item.errors)) pending.push(...item.errors.slice(0, 4));
  }
  return false;
}

/** A quota needs restored capacity, so rapid retries only consume another provider's allowance. */
export async function withBackgroundRetry<T>(work: () => Promise<T>): Promise<T> {
  try { return await work(); }
  catch (error) {
    if (databaseCapacityExhausted(error)) {
      // Do not attach the original cause: it can contain SQL and private query parameters.
      throw new RetryAfterError("Database capacity is exhausted; persisted work will retry in one hour.", "1h");
    }
    throw error;
  }
}
