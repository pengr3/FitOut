"use server";

// Booking mutations (BOOK-01/02/03, D-40/D-41/D-42/D-44). Clones the blocks.ts server-action skeleton
// (session → gate → Zod re-validate → mutate → revalidate) but swaps the HOST-ownership guard for a
// BOOKER-CAPABILITY guard (canBook, D-41) + a server RE-DERIVATION of deriveBookable (the reserve route
// group is NEVER the gate — Security V4). Both actions end in a redirect (next/navigation), not a JSON ok.
//
// SECURITY CONTRACT:
//   - SESSION (D-41): placeHold/confirmBooking require an authenticated session — an unauthenticated
//     caller gets a calm sign-in result (the return-to-checkout callbackURL is threaded by the CTA in
//     Plan 07), never a hold.
//   - CAPABILITY (T-04-BOOKCAP): placeHold re-reads the booker's canBook AND re-derives deriveBookable for
//     the listing+host server-side. The route group / a client flag is never trusted (Security V4, D-41).
//   - OWNERSHIP / IDOR (T-04-HOLDIDOR): confirmBooking owner-gates booking.bookerId === session.userId
//     before ANY state transition — the opaque URL id is never the gate.
//   - EXPIRY AUTHORITY (T-04-COUNTDOWNBYPASS): confirmBooking re-checks status='pending' AND
//     expires_at > now() SERVER-SIDE in one atomic UPDATE (never the client countdown). A lapsed hold
//     yields a calm expiry result, never a silent confirm.
//   - IDEMPOTENCY (D-42): a re-confirm of the caller's OWN already-'confirmed' booking is a no-op SUCCESS
//     (redirect to the confirmation) — short-circuited BEFORE the expiry check, never a false "expired".
//   - POST-ONLY (T-04-GETHOLD): placeHold mints the hold via this POST server action + redirect, never a
//     GET render side-effect (Pitfall 2 — a GET duplicates holds on prefetch/refresh/Back).

import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user, hostPayout } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { bookingCreateSchema } from "@/lib/validation/booking";
import { createPendingHold, mapBookingError } from "@/lib/availability/units";

/** placeHold failure shapes (success redirects to the reserve page, so it never returns ok:true). */
export type PlaceHoldResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "activate-booking"; error: string }
  | { ok: false; reason: "not-bookable"; error: string }
  | { ok: false; reason: "invalid"; error: string; fieldErrors?: Record<string, string[]> }
  | { ok: false; reason: "taken"; error: string };

/** confirmBooking failure shapes (success redirects to the confirmation page). */
export type ConfirmResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "denied"; error: string }
  | { ok: false; reason: "expired"; error: string };

/** Resolve the signed-in user's id, or null if there is no session (cloned from blocks.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * placeHold — the entering-checkout mutation (D-39/SC#3). A POST server action, NEVER a GET side-effect
 * (Pitfall 2). Gates on a signed-in canBook user (D-41) + a server re-derivation of deriveBookable
 * (Security V4), then mints a pending hold via createPendingHold and redirects to the reserve page. A
 * double-submit (same idempotency key / window) returns the SAME booking (delegated to createPendingHold).
 */
export async function placeHold(input: unknown): Promise<PlaceHoldResult> {
  // (1) Session gate (D-41). The CTA (Plan 07) threads the return-to-checkout callbackURL; here we only
  // report that sign-in is required.
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to book this space." };
  }

  // (2) Capability gate (T-04-BOOKCAP) — re-read canBook from the DB (canBook is input:false, so the row
  // is the source of truth; a client flag is never trusted).
  const [me] = await db.select({ canBook: user.canBook }).from(user).where(eq(user.id, userId));
  if (!me?.canBook) {
    return { ok: false, reason: "activate-booking", error: "Turn on booking to reserve this space." };
  }

  // (3) Re-validate the untrusted selection SHAPE (T-04 input validation). The stronger invariants
  // (on-the-hour, inside operating hours, a free unit, the frozen price) are re-derived inside
  // createPendingHold — the client is never trusted for price/time.
  const parsed = bookingCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      error: "Please check your selection and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { listingId, startUtc, endUtc, fullDay, idempotencyKey } = parsed.data;

  // (4) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate). Mirrors
  // the listing page's deriveBookable call (listings/[id]/page.tsx:113-119): published + host emailVerified
  // + host payoutsEnabled. Keep this join in sync with bookability.ts (Pitfall 5).
  const [lr] = await db
    .select({
      status: listing.status,
      emailVerified: user.emailVerified,
      payoutsEnabled: hostPayout.payoutsEnabled,
    })
    .from(listing)
    .innerJoin(user, eq(listing.hostId, user.id))
    .leftJoin(hostPayout, eq(hostPayout.userId, user.id))
    .where(and(eq(listing.id, listingId), isNull(listing.deletedAt)));
  const bookable =
    !!lr &&
    deriveBookable(
      { status: lr.status },
      { emailVerified: lr.emailVerified, payoutsEnabled: lr.payoutsEnabled ?? false },
    );
  if (!bookable) {
    return { ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." };
  }

  // (5) Mint the pending hold (the WR-03 transaction: SAVEPOINT + outer-retry + in-tx sweep + own-hold
  // idempotency). createPendingHold returns a mapped calm result on a conflict — it never throws for a race.
  const res = await createPendingHold(db, {
    listingId,
    bookerId: userId,
    startsAt: startUtc,
    endsAt: endUtc,
    fullDay,
    idempotencyKey: idempotencyKey ?? null,
  });
  if ("error" in res) {
    return { ok: false, reason: "taken", error: res.error }; // "That time was just taken." (SC#4)
  }

  // (6) The pending hold immediately occupies the slot in the calendar + search (both treat pending as
  // occupying), so revalidate BOTH before redirecting to the reserve page.
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  redirect(`/listings/${listingId}/book?hold=${res.id}`);
}

/**
 * confirmBooking — flip a pending hold to confirmed (D-40, the Phase-5 payment seam; NO charge here).
 * Owner-gated (IDOR), server-authoritative on expiry (never the client countdown), and idempotent on a
 * re-confirm of the caller's OWN already-confirmed booking (D-42). Redirects to the durable confirmation.
 */
export async function confirmBooking(holdId: string): Promise<ConfirmResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to confirm your booking." };
  }

  // Owner-gated load (T-04-HOLDIDOR). A missing row OR a different booker both return the SAME calm
  // "can't show this booking" so a leaked/guessed id reveals nothing (owner-gate, D-43).
  const [bk] = await db
    .select({ bookerId: booking.bookerId, status: booking.status })
    .from(booking)
    .where(eq(booking.id, holdId));
  if (!bk || bk.bookerId !== userId) {
    return { ok: false, reason: "denied", error: "We can't show this booking." };
  }

  // Confirm path — ONLY when not already confirmed. An already-'confirmed' own booking falls straight
  // through to the redirect below as an idempotent no-op SUCCESS (D-42): it is NEVER routed through the
  // expiry check or mapBookingError, so a double-submit / Back-then-Confirm can never false-"expire".
  if (bk.status !== "confirmed") {
    let flipped: { id: string }[] = [];
    try {
      // The server is the SOLE expiry authority (T-04-COUNTDOWNBYPASS): flip pending→confirmed in ONE
      // atomic UPDATE guarded by expires_at > now() (the DB clock). 0 rows ⇒ the hold lapsed / was swept
      // before confirm → a calm expiry result, never a silent confirm.
      flipped = (await db.execute(sql`
        UPDATE booking SET status = 'confirmed', expires_at = NULL
        WHERE id = ${holdId} AND booker_id = ${userId}
          AND status = 'pending' AND expires_at > now()
        RETURNING id`)) as unknown as { id: string }[];
    } catch (e) {
      // Defense in depth: a concurrent DB conflict maps to the calm copy, never a raw 500 (mapBookingError
      // re-throws anything that isn't a known booking conflict, so genuine failures still surface).
      return { ok: false, reason: "expired", error: mapBookingError(e).error };
    }
    if (flipped.length === 0) {
      return {
        ok: false,
        reason: "expired",
        error: "Your hold expired. We released the slot — it might still be free, so check availability again.",
      };
    }
    revalidatePath(`/bookings/${holdId}`);
  }

  // Success: a fresh confirm, or the idempotent already-confirmed no-op → the durable confirmation page.
  redirect(`/bookings/${holdId}`);
}
