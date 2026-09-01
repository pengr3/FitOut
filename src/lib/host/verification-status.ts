// THE HOST'S OWN VERIFICATION STATE — read once per surface, owner-scoped, by the three host surfaces
// that need it (phase 18 · D-224 / D-243 / D-252).
//
// WHY THIS IS A SHARED READ WHILE THE SELL-GATE'S RE-STATEMENTS ARE NOT (D-227). The rule that forbids
// folding `placeHold` / `placeOpenHold`'s re-derived bookability terms into one helper governs REFUSALS
// on the money path: if one copy of a refusal drifts, the other still refuses, so duplication there is
// strictly safer. This is neither a refusal nor a derivation — it is one owner-scoped SELECT that three
// surfaces need the same answer from, and a host told "your hosting is paused" on one page while
// another quietly disagrees is the drift worth preventing. `re-review.ts`'s header draws the same line
// for the same reason.
//
// ⚠ NO ROW MEANS `unverified`, NEVER VERIFIED, AND NEVER SUSPENDED. The row is not created with the
// user — it is written by the ops console's decisions, by the manual provider and by the drizzle/0026
// grandfather backfill — so ABSENCE is the ordinary state of a host nobody has checked yet. It must
// fail the sell-gate (which is why `deriveBookable` receives `unverified`) and it must NOT raise a
// suspension notice (which is why `suspended` is a POSITIVE literal below). Both directions matter and
// they are not the same direction.
//
// ⚠ D-253 — THE COLUMN THIS READS HAS NO COMPILER CENSUS. `host_verification.status` is also read by
// two RAW-SQL predicates on the money path (`payout-sweep.ts`'s `queryDuePayouts` and
// `payout-reconcile.ts`'s `alertStuckHeld`), and `tsc` can see neither. This module is the THIRD
// reader, and it is a DISPLAY reader rather than a money one: it decides what a host is told, never
// whether a peso moves. It is nevertheless coupled to those two — the notice says payouts are on hold,
// and that sentence is only true while the freeze holds — so
// `tests/payments/payout-suspension-freeze.test.ts` gained a case in the same commit that pins the two
// answers as agreeing across every value of the enum, per D-253's standing instruction.
//
// NON-CLIENT MODULE — no directive prologue, no client-only import, for the reason
// `src/components/host/payout-status.ts` records: a "use client" module's exports become client
// references when a Server Component imports them and cannot be invoked server-side, which crashed
// /host in UAT once already. All three call sites are Server Components.

import { eq } from "drizzle-orm";
import type { DbConn } from "@/lib/availability/read-model";
import { hostVerification, type HostVerificationStatus } from "@/lib/db/schema";

/**
 * One host's verification state, in the shape the three surfaces actually consume.
 *
 * `suspended` is a derived boolean rather than a comparison left to each caller: three call sites
 * spelling the same literal is three chances to spell it as a negation, and a negated spelling would
 * raise the paused notice for `rejected`, `pending` and every value added after them.
 */
export type HostVerificationState = {
  /** The sell-gate's sixth term (D-224). `unverified` when there is no row at all. */
  readonly status: HostVerificationStatus;
  /** The operator's host-readable sentence — present only on a rejection or a suspension (D-243). */
  readonly reason: string | null;
  /** ENF-01/ENF-02's state, positively spelled: hosting is paused and payouts are frozen (D-233). */
  readonly suspended: boolean;
};

/**
 * The signed-in host's own verification row — ONE query, owner-scoped BY ARGUMENT.
 *
 * Owner-scoped by an argument every call site fills from `session.user.id`, never from anything a
 * client can send: there is no id parameter to tamper with and no path where a search param reaches
 * this function, so one host can never be shown another host's decision or another host's reason
 * (T-18-1302). The table is keyed 1:1 to user, so this is a primary-key lookup returning at most one
 * row — cheap enough to be read once per surface, and it must never be read per card.
 */
export async function loadHostVerification(
  dbConn: DbConn,
  hostId: string,
): Promise<HostVerificationState> {
  const rows = await dbConn
    .select({ status: hostVerification.status, reason: hostVerification.reason })
    .from(hostVerification)
    .where(eq(hostVerification.userId, hostId));

  const status = rows[0]?.status ?? "unverified";
  const suspended = status === "suspended";
  return {
    status,
    // The reason column also carries a REJECTION's sentence. It is returned as-is; the surfaces decide
    // which of them has a sentence to show, and the suspension notice reads it only inside its own
    // `suspended` branch. Blanking it here would make this helper the wrong owner of that decision.
    reason: rows[0]?.reason ?? null,
    suspended,
  };
}
