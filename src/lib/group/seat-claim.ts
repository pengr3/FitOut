// The pessimistic per-group RSVP seat-claim (D-112, GROUP-05/SC#4) — the ONE genuinely new correctness
// surface of Phase 8. No-overflow is enforced by a `SELECT capacity_snapshot ... FOR UPDATE` row lock on
// the single booking_group row, then a count of confirmed 'yes' UNDER that lock, then a conditional write.
// The row lock is the atomic authority — the app NEVER adjudicates the cap (the CLAUDE.md count-then-insert
// anti-pattern), exactly mirroring how the GiST EXCLUDE constraint — not app code — arbitrates the
// double-book (src/lib/availability/units.ts). Proven race-free by tests/group/seat-claim-race.test.ts, the
// phase acceptance gate (mutation-verified: delete FOR UPDATE → red → restore).
//
// A →yes that would exceed the snapshot loses the race and resolves to a calm { ok:false, reason:"full" }
// (the UI's "just filled up" copy), never a crash. Freeing mutations (yes→no) still take the lock so a
// concurrent →yes observes a consistent count. The cap is capacity_snapshot ONLY, never live
// listing.maxOccupancy (D-111) — a host lowering capacity after confirmations cannot over-cap.
//
// NO notification crosses this transaction boundary — emitting inside a tx pins a connection across a
// network hop and a rollback would send an event for a row that never committed. The caller emits
// post-commit (08-06), per the notifications.ts emitNotify contract.

import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { isPgError } from "@/lib/pg";
import type { DbConn } from "@/lib/availability/read-model";

export type ClaimResult =
  | { ok: true; rsvpId: string; status: "yes" | "no" }
  | { ok: false; reason: "full" };

// Contention here is on ONE row so a deadlock is rare, but keep the bounded 40P01 retry idiom from units.ts
// (postgres.js does not auto-retry an aborted transaction).
const MAX_TX_RETRIES = 3;

/**
 * Claim (or free) a seat for one attendee in a group, atomically. Bind the TRANSACTIONAL db — the lock
 * must span count→write. De-dup is single-path (D-116/D-117): an account by user_id, a guest-with-email by
 * normalized email; a name-only guest (both null) is never de-duped.
 */
export async function claimSeat(
  db: DbConn,
  args: {
    groupId: string;
    answer: "yes" | "no";
    userId: string | null;
    guestEmailNorm: string | null;
    name: string;
  },
): Promise<ClaimResult> {
  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<ClaimResult> => {
        // (1) LOCK the single booking_group row — the atomic no-overflow authority (D-112). A missing or
        //     voided group matches nothing → fail closed with a courtesy "full", never an over-cap.
        const [g] = (await tx.execute(sql`
          SELECT capacity_snapshot FROM booking_group
          WHERE id = ${args.groupId} AND voided_at IS NULL
          FOR UPDATE
        `)) as unknown as { capacity_snapshot: number }[];
        if (!g) return { ok: false, reason: "full" };

        // (2) De-dup SINGLE-PATH: an account matches by user_id, a guest-with-email by normalized email; a
        //     name-only guest (both null) matches the `false` predicate → always a fresh row (D-117).
        const identityMatch =
          args.userId != null
            ? sql`user_id = ${args.userId}`
            : args.guestEmailNorm != null
              ? sql`guest_email_norm = ${args.guestEmailNorm}`
              : sql`false`;
        const [existing] = (await tx.execute(sql`
          SELECT id, status FROM rsvp
          WHERE group_id = ${args.groupId} AND (${identityMatch})
          LIMIT 1
        `)) as unknown as { id: string; status: string }[];

        // (3) Count confirmed 'yes' UNDER the lock — drift-free (D-112 recommended layout, not a counter).
        const [{ yes }] = (await tx.execute(sql`
          SELECT count(*)::int AS yes FROM rsvp WHERE group_id = ${args.groupId} AND status = 'yes'
        `)) as unknown as { yes: number }[];

        // A →yes that would exceed the snapshot loses. An already-'yes' row re-affirming 'yes' is a no-op for
        // the count (one rsvp = one row, D-120), so exclude it from the ceiling check.
        const alreadyYes = existing?.status === "yes";
        if (args.answer === "yes" && !alreadyYes && yes >= g.capacity_snapshot) {
          return { ok: false, reason: "full" };
        }

        // (4) UPDATE the existing identity row, else INSERT a fresh rsvp. NO money column (D-115).
        if (existing) {
          await tx.execute(sql`UPDATE rsvp SET status = ${args.answer}, updated_at = now() WHERE id = ${existing.id}`);
          return { ok: true, rsvpId: existing.id, status: args.answer };
        }
        const id = randomUUID();
        await tx.execute(sql`
          INSERT INTO rsvp (id, group_id, user_id, guest_name, guest_email_norm, status)
          VALUES (${id}, ${args.groupId}, ${args.userId}, ${args.name}, ${args.guestEmailNorm}, ${args.answer})
        `);
        return { ok: true, rsvpId: id, status: args.answer };
      });
    } catch (e) {
      if (isPgError(e, "40P01") && txAttempt < MAX_TX_RETRIES - 1) continue;
      throw e;
    }
  }
}
