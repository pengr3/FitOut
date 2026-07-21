"use server";

// Notification mark-read server actions (MANAGE-03 · D-92). The write half of the notification centre:
// the bell reads through `listRecent`/`countUnread` (src/lib/notifications.ts, owner-scoped there) and
// writes back through exactly these two actions.
//
// Cloned from the host-requests.ts action skeleton — `requireUserId` -> owner-scope -> rateLimit -> audit
// -> scoped UPDATE -> calm 0-row path -> revalidate — with one deliberate simplification: there is no
// separate owner-gating SELECT. A notification carries no state worth pre-reading, so the ownership
// predicate lives directly in the UPDATE rather than in a load-then-check pair. Fewer round trips, and
// no window between the check and the write.
//
// SECURITY CONTRACT:
//   - SESSION: both actions require an authenticated session; there is no unauthenticated path.
//   - OWNER SCOPE IS IN THE QUERY, NEVER POST-FILTERED (T-07-82 / T-07-83 / Security V4). Every UPDATE
//     Every UPDATE below scopes on the recipient column inside its own WHERE, bound to the SESSION-
//     resolved user id and never to anything the caller supplied. This is not defence in depth over a
//     JS check — it IS the check. An IDOR here leaks the other party's booking details (space title,
//     session times, amounts) straight out of the durable payload, which is exactly the class of leak
//     Security V4 targets.
//   - NO ENUMERATION ORACLE: an owned id, a foreign id and a wholly nonexistent id all claim their rows
//     (0 or 1) through the same statement and return the SAME `{ ok: true }`. There is deliberately no
//     "not yours" branch and no row-count-derived result, so the read-state — indeed the EXISTENCE — of
//     a notification the caller does not own is unobservable. `{ ok: false }` means one thing only: no
//     session, or a rate-limit denial.
//   - IDEMPOTENT: both UPDATEs are additionally scoped to rows not yet read, so a double-click, a replay
//     or a retry is a 0-row no-op rather than a timestamp rewrite. Marking read twice is not an error.
//   - RATE LIMIT: `markAllNotificationsRead` is an UNBOUNDED write (it can touch every unread row the
//     caller owns), so it carries a budget. Generous — this is a cheap, non-money action — but not
//     unlimited. The single-row action is inherently bounded and needs none.
//   - AUDIT: only the rate-limit DENIAL is recorded. A routine mark-read is not a privileged,
//     money-adjacent act and an audit row per bell click would drown the signal WR-06 exists to surface.
//   - POST-ONLY: both are server actions invoked from a button, never a GET side-effect.

import { sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { recordAudit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

/** The single result shape. See the non-disclosure rule above: `ok:false` never means "not yours". */
export type MarkReadResult = { ok: boolean };

// A generous budget for the bulk write: 60 per 60s is far beyond any human bell usage, while still
// bounding a scripted caller that would otherwise sweep the table on a loop (T-07-85).
const MARK_ALL_RATE_LIMIT = { window: 60, max: 60 } as const;

/** Resolve the signed-in user's id, or null if there is no session (cloned from host-requests.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * Revalidate the surfaces that render the bell. Both layouts compute the unread count and the recent
 * list per request, so the two booking routes are what has to be re-rendered for the badge to move.
 */
function revalidateBellSurfaces(): void {
  revalidatePath("/bookings");
  revalidatePath("/host/bookings");
}

/**
 * Mark ONE notification read. The owner scope lives in the UPDATE's WHERE (T-07-83): a foreign or
 * missing id simply claims 0 rows and returns the identical calm result, so nothing about another
 * user's notifications — not their existence, not their read-state — is observable from here.
 */
export async function markNotificationRead(notificationId: string): Promise<MarkReadResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false };

  await db.execute(sql`
    UPDATE notification SET read_at = now()
    WHERE id = ${notificationId} AND recipient_id = ${userId} AND read_at IS NULL
  `);

  revalidateBellSurfaces();
  return { ok: true };
}

/**
 * Mark every unread notification the caller owns as read. Same owner scope, same calm shape; the only
 * `{ ok: false }` beyond a missing session is the rate-limit denial, which is audited.
 */
export async function markAllNotificationsRead(): Promise<MarkReadResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false };

  const limit = rateLimit(`mark-read:${userId}`, MARK_ALL_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "markAllNotificationsRead",
      outcome: "denied",
      meta: { reason: "rate_limit", retryAfter: limit.retryAfter },
    });
    return { ok: false };
  }

  await db.execute(sql`
    UPDATE notification SET read_at = now()
    WHERE recipient_id = ${userId} AND read_at IS NULL
  `);

  revalidateBellSurfaces();
  return { ok: true };
}
