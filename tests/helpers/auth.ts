// Test-scoped Better Auth instance.
//
// The production `auth` (src/lib/auth.ts) is bound to the dev `db` (public schema). Integration
// tests must run against the ISOLATED `test` schema (tests/helpers/db.ts) so they never touch dev
// data. This helper rebuilds a Better Auth instance that reuses the EXACT production options
// (auth.options — session sizing, revokeSessionsOnPasswordReset, additionalFields/input:false,
// soft gate, etc.) but swaps in a drizzleAdapter bound to the test-schema db.
//
// Because we spread auth.options, every config invariant under test (D-12 session, D-13 reset-revoke,
// the input:false escalation guard, the D-07 soft gate) is the SAME object the app ships — these
// tests would go red if the corresponding line were removed from src/lib/auth.ts.

import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { auth as prodAuth } from "@/lib/auth";
import * as schema from "@/lib/db/schema";
import type { TestDb } from "./db";

/** Build a Better Auth instance using the production options against the test-schema db. */
export function makeTestAuth(testDb: TestDb) {
  const options = (prodAuth as unknown as { options: Record<string, unknown> }).options;
  return betterAuth({
    ...options,
    // Override the database to point at the isolated test schema. The test db is created
    // via drizzle(client) WITHOUT a bound schema, so we pass the schema to the adapter
    // explicitly so it can resolve the user/session/account/verification models.
    database: drizzleAdapter(testDb.db, { provider: "pg", schema }),
    // Plugins from production options are reused as-is (nextCookies is a no-op outside a
    // Next request context, which is fine for these server-API-level tests).
  });
}

export type TestAuth = ReturnType<typeof makeTestAuth>;

// The rebuilt test auth loses the production additionalFields generic (we spread the resolved
// options through `Record<string, unknown>`), so its signUpEmail body type is the base shape
// (name/email/password) and does not statically include firstName/canHost/etc. The RUNTIME
// accepts and enforces them correctly (input:false strips the privileged ones). This typed
// helper keeps the test call sites honest without scattering casts: callers pass the profile +
// (optionally) smuggled privileged fields, and we widen to the runtime-accepted body.
export type SignUpBody = {
  email: string;
  password: string;
  name: string;
  firstName?: string;
  // Transport-only: the signup capability intent. NOT an additionalField/column — the production
  // databaseHooks.user.create.before hook reads it off the body to grant the chosen capability
  // ATOMICALLY in the user-creation insert (CR-02). Tests thread it so the test-schema auth
  // (rebuilt from prod options, so it carries the same hook) reproduces the real grant.
  intent?: "book" | "host";
  // Privileged fields a malicious client might smuggle (must be stripped by input:false).
  canBook?: boolean;
  canHost?: boolean;
  role?: string;
};

export function signUp(auth: TestAuth, body: SignUpBody) {
  // The runtime accepts the full additionalFields body; the rebuilt instance's static type is the
  // base shape, so we widen through the API method's parameter type.
  const call = auth.api.signUpEmail as unknown as (args: { body: SignUpBody }) => ReturnType<
    TestAuth["api"]["signUpEmail"]
  >;
  return call({ body });
}
