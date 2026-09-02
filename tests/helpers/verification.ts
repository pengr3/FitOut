// THE SHARED `host_verification` SEED, declared once so ~a dozen fixtures import it instead of
// re-inventing it (plan 18.1-07, for plan 18.1-12).
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS A HELPER AND NOT A LOCAL FUNCTION IN EACH FILE
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `tests/ops/ops-audit.test.ts:99-116` already has this function, called `seedHost`, and this module
// is that shape lifted out. The reason to lift it is arriving: D-255 puts a host-verification gate
// in front of `createDraftListing`, so plan 18.1-12 has to seed an APPROVED host for roughly a dozen
// existing `createDraftListing` fixtures across several files. A dozen copies of "insert a user,
// then insert a verification row" is a dozen places to get the fail-closed default wrong — and
// getting it wrong is silent, because a fixture that seeds `approved` where it meant `unverified`
// produces a test that passes for the wrong reason.
//
// ⚠ THE ONE RULE THIS ENCODES: **`null` MEANS NO VERIFICATION ROW AT ALL**, which is NOT the same
// thing as a row at `unverified` even though the product must read them identically.
// `src/lib/host/verification-status.ts`'s header states the rule — "NO ROW MEANS `unverified`, NEVER
// VERIFIED, AND NEVER SUSPENDED" — and both states have to be seedable, separately, or the property
// that they agree is asserted rather than measured. `loadReviewQueue`'s `COALESCE(hv.status::text,
// 'unverified')` is the shipped code that depends on it.
//
// ⚠ IT WRITES NO SESSION AND NO CREDENTIAL. Better Auth owns `account` rows and password hashes; a
// case that needs to SIGN IN as the seeded host must create the user through `signUp`
// (tests/helpers/auth.ts) and then call this helper, which detects the existing row and updates it
// rather than colliding on the primary key. That split is deliberate: this helper is for fixtures
// that need a host to EXIST, and Better Auth is for fixtures that need a host to be LOGGED IN.

import { eq } from "drizzle-orm";

import { hostVerification, user, type HostVerificationStatus } from "@/lib/db/schema";
import type { TestDb } from "./db";

/** The Drizzle handle an isolated-schema test holds. Narrower than `DbConn` on purpose: this is a
 * test-only helper and taking `TestDb["db"]` means a caller cannot accidentally hand it the app's
 * singleton, which writes to `public` and past every schema isolation (tests/helpers/db.ts's
 * recorded incident). */
type SeedDb = TestDb["db"];

/**
 * What may be varied per fixture. Everything has a default that is SAFE rather than convenient:
 * `emailVerified` defaults to `true` because most fixtures are about something else and an
 * unconfirmed email would refuse them for the wrong reason, and it is settable to `false` because
 * D-269's gate has to be drivable.
 */
export type SeedHostVerificationOpts = {
  /** Display name; also the `first_name`. Defaults to the id, as `ops-audit.test.ts` does. */
  readonly name?: string;
  /** Defaults to `<id>@fitout.test`. */
  readonly email?: string;
  /** D-269's gate. Defaults to `true`. */
  readonly emailVerified?: boolean;
  /** D-268's field. Defaults to `null` — `user.phone` is NULLABLE and optional for bookers. */
  readonly phone?: string | null;
  /** Whether the seeded user may host. Defaults to `true`. */
  readonly canHost?: boolean;
  /**
   * `host_verification.provider`. Defaults to `'manual'` — the shipped ops provider, which is what
   * every existing fixture uses. Pass `'migration'` for a grandfathered row, matching
   * `drizzle/0026`.
   */
  readonly provider?: string;
  /**
   * `host_verification.vendor_ref` — the vendor's own handle for the check. Defaults to `null`, which
   * is what a `manual` row and a never-started row both carry.
   *
   * ⚠ APPLIED ON PRESENCE, NEVER ON TRUTHINESS, and that is why it is worth a paragraph. A BLANK
   * handle is a legal fixture and a load-bearing one: `''` and `'   '` are rows the reconciliation
   * sweep's candidate query cannot see (`btrim(NULL) <> ''` is NULL, which a WHERE treats as
   * not-true), so the submission path's resume is their only escape. A truthiness check here would
   * silently drop `'   '` and an explicit `null` and hand the case a row seeded at the DEFAULT — a
   * test that passes for the wrong reason, which is the exact defect this helper's header was written
   * about.
   */
  readonly vendorRef?: string | null;
  /** The verification row's `created_at` — the ops queue's ordering column. Defaults to `now()`. */
  readonly createdAt?: Date;
  /**
   * The verification row's `updated_at` — the column D-264's cooldown WHERE reads. Defaults to
   * `now()`. Seed it in the PAST to drive the cooldown, and FAR in the past to prove that a
   * structural refusal (D-266) is not merely a timing accident.
   */
  readonly updatedAt?: Date;
  /** The user row's own `created_at`, which the ops host row renders as the account age. */
  readonly userCreatedAt?: Date;
};

/**
 * Seed a host at a chosen verification status. Returns the id, so a caller can inline it.
 *
 * `status: null` ⇒ the user only, with NO `host_verification` row — see the header for why that is a
 * distinct fixture rather than a synonym for `unverified`.
 *
 * If the user already exists (typically because the caller created it through Better Auth so it can
 * sign in), the profile fields that were explicitly passed are UPDATED rather than re-inserted.
 * Nothing is silently overwritten with a default: only keys present in `opts` are applied.
 */
export async function seedHostVerification(
  db: SeedDb,
  userId: string,
  status: HostVerificationStatus | null,
  opts: SeedHostVerificationOpts = {},
): Promise<string> {
  const existing = await db.select({ id: user.id }).from(user).where(eq(user.id, userId));

  if (existing.length === 0) {
    await db.insert(user).values({
      id: userId,
      name: opts.name ?? userId,
      email: opts.email ?? `${userId}@fitout.test`,
      firstName: opts.name?.split(" ")[0] ?? "Seed",
      emailVerified: opts.emailVerified ?? true,
      phone: opts.phone ?? null,
      canHost: opts.canHost ?? true,
      ...(opts.userCreatedAt ? { createdAt: opts.userCreatedAt } : {}),
    });
  } else {
    // Only what the caller ASKED to change. A blanket `.set()` of the defaults would quietly
    // re-write a Better-Auth-created user's own email and name, which is how a fixture ends up
    // signing in as one identity and being read as another.
    const patch: Record<string, unknown> = {};
    if (opts.name !== undefined) patch.name = opts.name;
    if (opts.email !== undefined) patch.email = opts.email;
    if (opts.emailVerified !== undefined) patch.emailVerified = opts.emailVerified;
    if (opts.phone !== undefined) patch.phone = opts.phone;
    if (opts.canHost !== undefined) patch.canHost = opts.canHost;
    if (opts.userCreatedAt !== undefined) patch.createdAt = opts.userCreatedAt;
    if (Object.keys(patch).length > 0) {
      await db.update(user).set(patch).where(eq(user.id, userId));
    }
  }

  if (status !== null) {
    await db.insert(hostVerification).values({
      userId,
      status,
      provider: opts.provider ?? "manual",
      // PRESENCE, not truthiness — see the option's own docblock. `null` and `'   '` are both
      // fixtures this repo needs and both are falsy.
      ...(opts.vendorRef !== undefined ? { vendorRef: opts.vendorRef } : {}),
      ...(opts.createdAt ? { createdAt: opts.createdAt } : {}),
      ...(opts.updatedAt ? { updatedAt: opts.updatedAt } : {}),
    });
  }

  return userId;
}
