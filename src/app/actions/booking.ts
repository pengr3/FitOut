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
//   - OWNERSHIP / IDOR (T-04-HOLDIDOR / T-05-13): confirmBooking owner-gates booking.bookerId ===
//     session.userId before ANY state transition or charge — the opaque URL id is never the gate.
//   - CONFIRM AUTHORITY (D-57): confirmBooking NO LONGER flips pending→confirmed — the
//     checkout_session.payment.paid webhook (Plan 04) is the SOLE confirm authority. This action instead
//     EXTENDS the hold (D-58, now()+PAYMENT_WINDOW so the sweep can't take the slot mid-payment) and
//     creates a hosted PayMongo checkout, then redirects off-site to pay.
//   - CHARGE INTEGRITY (D-49 / T-05-11): the charge amount is read from booking.quotedTotalCents
//     SERVER-SIDE; confirmBooking takes only holdId, so a client can never inject a charge amount.
//   - IDEMPOTENCY (D-42 / T-05-14): a re-confirm of the caller's OWN already-'confirmed' booking is a
//     no-op SUCCESS (redirect to the confirmation) — short-circuited BEFORE the charge, never a second
//     checkout; the stable Idempotency-Key checkout:<bookingId> makes even a race reuse the same session.
//   - POST-ONLY (T-04-GETHOLD): placeHold mints the hold via this POST server action + redirect, never a
//     GET render side-effect (Pitfall 2 — a GET duplicates holds on prefetch/refresh/Back).

import { and, eq, inArray, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { booking, listing, user, hostPayout } from "@/lib/db/schema";
import { deriveBookable } from "@/lib/bookability";
import { bookingCreateSchema, openHoldSchema } from "@/lib/validation/booking";
import { createPendingHold, createOpenCapacityHold } from "@/lib/availability/units";
import { loadOpenDayWindow } from "@/lib/availability/open-capacity";
import { parsePickedDate } from "@/lib/search/query";
import { quoteWindow } from "@/lib/booking/pricing";
import { computeServiceFee } from "@/lib/payments/service-fee";
import { createCheckoutSession, expireCheckoutSession } from "@/lib/paymongo";
import { PAYMENT_WINDOW_MINUTES, APPROVAL_SLA_HOURS } from "@/lib/payments/config";
import { bookingReference } from "@/lib/booking/reference";
import { composeDeadlineLabel, composeWhenLabel } from "@/lib/booking/when-label";
import { emitNotify } from "@/lib/notifications";
import { formatMoney, DISPLAY_CURRENCY } from "@/lib/money";
import { rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

/** placeHold failure shapes (success redirects to the reserve page, so it never returns ok:true). */
export type PlaceHoldResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "activate-booking"; error: string }
  | { ok: false; reason: "not-bookable"; error: string }
  | { ok: false; reason: "invalid"; error: string; fieldErrors?: Record<string, string[]> }
  | { ok: false; reason: "taken"; error: string }
  /** OC-13 race loss on a shared date. Distinct from `taken` so the CTA can use the drop-in copy and still
   *  refresh the calendar through the shipped notice path (09-UI-SPEC § 3). */
  | { ok: false; reason: "sold-out"; error: string };

/**
 * confirmBooking failure shapes (SUCCESS redirects — off-site to the hosted checkout on a fresh pay, or to
 * the confirmation page on an idempotent already-confirmed re-entry). `checkout` is the calm "couldn't
 * start checkout / going too fast" retry state (the hold is still active — never a red error).
 */
export type ConfirmResult =
  | { ok: false; reason: "sign-in"; error: string }
  | { ok: false; reason: "denied"; error: string }
  | { ok: false; reason: "expired"; error: string }
  | { ok: false; reason: "checkout"; error: string };

/** updateDeclaredPax failure shapes. Every one is a calm, retryable sentence — nothing here is red. */
export type UpdatePaxResult = { ok: true } | { ok: false; error: string };

// WR-06: money-adjacent budget — mirrors the payout-onboarding action (5/60s per authenticated identity).
const CONFIRM_PAY_RATE_LIMIT = { window: 60, max: 5 } as const;

/** The pax stepper is a HELD-ROW re-price, not a charge, and a booker legitimately taps +/− several times
 *  in a row — so the budget is looser than confirm-pay's 5/60s while still bounding the write. */
const REPRICE_PAX_RATE_LIMIT = { window: 60, max: 30 } as const;

/** Shape-only guard for the stepper's headcount. The real bound is the LISTING's maxOccupancy, re-read and
 *  clamped server-side below — this only refuses obvious junk before a DB round trip. */
const declaredPaxSchema = z.coerce.number().int().min(1).max(10_000);

/** 09-UI-SPEC § 6, "step-up disallowed by design" row (D-126). The one sentence a drop-in booker sees if
 *  they ever reach the re-price path — a next step, not a rejection. */
const PASSES_FIXED_MESSAGE = "To add more passes, book them separately.";

/** Resolve the signed-in user's id, or null if there is no session (cloned from blocks.ts). */
async function requireUserId(): Promise<string | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user?.id ?? null;
}

/**
 * placeHold — the entering-checkout mutation (D-39/SC#3). A POST server action, NEVER a GET side-effect
 * (Pitfall 2). Gates on a signed-in canBook user (D-41) + a server re-derivation of deriveBookable
 * (Security V4), then FORKS on the listing's SERVER-READ bookingMode (D-61 / BOOK-04 / BOOK-05):
 *   - instant  → mints a pending 15-min hold and redirects to the reserve/pay page (unchanged);
 *   - request  → mints a `requested` hold (APPROVAL_SLA_HOURS TTL) with NO charge (D-63 pay-on-approval),
 *                EMITS the booker/host notifications post-commit via `fitout/notify` (D-83), and redirects
 *                to /bookings/<id>.
 * A double-submit (same idempotency key / window) returns the SAME booking (delegated to createPendingHold).
 */
export async function placeHold(input: unknown): Promise<PlaceHoldResult> {
  // (1) Session gate (D-41). The CTA (Plan 07) threads the return-to-checkout callbackURL; here we only
  // report that sign-in is required.
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to book this space." };
  }

  // (2) Capability gate (T-04-BOOKCAP) — re-read canBook from the DB (canBook is input:false, so the row
  // is the source of truth; a client flag is never trusted). Email + display name come along in the same
  // pass so the request branch can send the booker their request-received receipt without a second read.
  const [me] = await db
    .select({ canBook: user.canBook, email: user.email, firstName: user.firstName, name: user.name })
    .from(user)
    .where(eq(user.id, userId));
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
  const { listingId, startUtc, endUtc, fullDay, idempotencyKey, declaredPax } = parsed.data;

  // (4) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate). Mirrors
  // the listing page's deriveBookable call (listings/[id]/page.tsx:113-119): published + host emailVerified
  // + host payoutsEnabled. Keep this join in sync with bookability.ts (Pitfall 5).
  const [lr] = await db
    .select({
      status: listing.status,
      // D-61: the booking MODE is read SERVER-SIDE from the listing row here (never a client flag —
      // T-06-09 elevation). The request branch below forks on it; the reserve route group is not the gate.
      bookingMode: listing.bookingMode,
      // D-123: the OCCUPANCY mode, read from the same row for the same reason. The refusal just below is
      // what keeps this mutation to exclusive listings only.
      occupancyMode: listing.occupancyMode,
      title: listing.title,
      timezone: listing.timezone,
      city: listing.city,
      // The listing's DAY rate, for the SHARED whenLabel formatter's pre-0016 positive-match fallback
      // only (07-02 / 08-15). The mode itself comes from the persisted snapshot, never from a rate.
      dayRateCents: listing.dayRateCents,
      // The host's user id — the notification RECIPIENT for the new-request alert (T-07-56). Taken from the
      // listing row this action already read server-side; never anything the caller supplied.
      hostId: listing.hostId,
      hostEmail: user.email, // the join reaches the host via listing.hostId = user.id — reuse it for the alert
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
  if (!lr || !bookable) {
    return { ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." };
  }

  // (4a) Phase-9 (Security V4, threat T-09-23). The occupancy mode is read from the LISTING ROW, never from
  // the payload. This branch is load-bearing, not defensive tidying: drizzle/0022 removed open-capacity rows
  // from booking_no_overlap, so a hold minted here on a drop-in listing would be arbitrated by NOTHING — not
  // the EXCLUDE (it no longer sees open rows) and not the admissions counter (this path never takes the
  // advisory lock). An exclusive-shaped payload against a drop-in listing is therefore refused outright, and
  // `placeOpenHold` carries the exact mirror of this guard: each mutation admits exactly one mode.
  if (lr.occupancyMode === "open_capacity") {
    return { ok: false, reason: "invalid", error: "This space sells day passes — pick a day to book." };
  }

  // (4b) Fork on the SERVER-READ booking mode (D-61 / BOOK-04 / BOOK-05). A `request` listing mints a
  // `requested` hold that holds the slot for the APPROVAL_SLA_HOURS window with NO money moved (D-63
  // pay-on-approval): nothing is charged now; the charge happens later, when the host approves and the
  // booker pays via the SAME Phase-5 hosted checkout (06-07). Instant falls through to the byte-for-byte
  // unchanged pending-hold path below (BOOK-04). The mode is a creation-time snapshot on the booking row,
  // so a later listing.bookingMode edit never rewrites an in-flight request (D-61 new-bookings-only).
  if (lr.bookingMode === "request") {
    const res = await createPendingHold(db, {
      listingId,
      bookerId: userId,
      startsAt: startUtc,
      endsAt: endUtc,
      fullDay,
      idempotencyKey: idempotencyKey ?? null,
      holdStatus: "requested",
      ttlMs: APPROVAL_SLA_HOURS * 60 * 60 * 1000, // the 24h approval SLA (config-tunable) — never hardcoded
      bookingMode: "request",
      declaredPax, // D-108: drives the pax surcharge server-side, but ONLY when the listing charges per head
    });
    if ("error" in res) {
      return { ok: false, reason: "taken", error: res.error }; // same calm "just taken" as instant (SC#4)
    }

    // NO checkout, NO charge at request time (D-63 / T-06-11). Both sides are told via the D-83
    // `fitout/notify` event — 07-10 replaced the old fire-and-forget pair (the request-received and
    // new-request-to-host sends, each `void`ed at this call site). Emitting buys retry, backoff, per-run
    // observability and the durable in-app notification row at parity (D-91); `emitNotify` swallows its own
    // transport errors, so a notification outage can never reject this action or strand a hold that the
    // database has already committed (MANAGE-03 / T-07-57).
    //
    // EMITTED AFTER `createPendingHold` HAS RETURNED — i.e. after its WR-03 transaction committed, never
    // inside it. `inngest.send` is an outbound HTTP call, and a rollback would leave an event already sent
    // for a booking that does not exist (T-07-58).
    //
    // ── T11: SUPPRESSED ON AN IDEMPOTENT REPLAY (`!res.replayed`), mirroring re-request.ts:299 ──────────
    // A double-submit (a double-click, or a same-window resubmit) resolves to the SAME booking via
    // createPendingHold's D-42 own-hold match, which returns `replayed:true`. The FIRST submit already told
    // both sides; re-emitting here would send the host a duplicate new-request alert/email for a request
    // they have already seen. So the label composition and BOTH emissions are guarded — a replay notifies
    // nobody. The hold, the revalidate and the redirect below stay OUTSIDE the guard: a replay must still
    // land the booker on their existing request (/bookings/<id>) exactly as the first submit did.
    if (!res.replayed) {
      // The money labels come from the values `createPendingHold` read straight back OUT of its own insert
      // (the D-74 frozen triple), so the numbers here are always the SAME frozen numbers that were quoted —
      // never a recompute, and never a second read that could observe a different row.
      const [q] = await db
        .select({ currency: booking.currency })
        .from(booking)
        .where(eq(booking.id, res.id));
      const currency = q?.currency ?? DISPLAY_CURRENCY;
      // The SHARED venue-local formatter (07-02), composed from exactly the same inputs, by exactly the
      // same code, as every other time surface in the app. 08-15 / CR-01: the mode is no longer re-derived
      // from a price — it is `fullDay ?? false`, byte-identical to what `createPendingHold` just froze into
      // `booking.full_day` (units.ts applies the same `?? false`), i.e. the persisted snapshot itself.
      const whenLabel = composeWhenLabel({
        startsAt: new Date(startUtc),
        endsAt: new Date(endUtc),
        timezone: lr.timezone,
        city: lr.city,
        fullDay: fullDay ?? false,
        // This is the `bookingMode === "request"` branch, and the only path that can mint an open row is
        // `placeOpenHold`, never `createPendingHold`. Open capacity is INSTANT-ONLY, so a request is
        // exclusive by construction — a literal, not a projection (OC-10).
        openCapacity: false,
        spacePriceCents: res.spacePriceCents,
        quotedTotalCents: res.quotedTotalCents,
        dayRateCents: lr.dayRateCents,
      });
      // The host's SLA deadline, from the row's own `expires_at`. Under D-96 a session-start cap splits the
      // remaining time proportionally, so this is frequently NOT `APPROVAL_SLA_HOURS` out — rendering the
      // config constant would be wrong on precisely the short-notice requests where the deadline matters.
      const respondByLabel =
        res.expiresAt === null
          ? "as soon as possible"
          : composeDeadlineLabel(res.expiresAt, lr.timezone, lr.city);
      const totalLabel = formatMoney(res.quotedTotalCents ?? 0, currency);
      const bookerLabel = me.firstName ?? me.name ?? "A guest";
      const title = lr.title ?? "your space";
      // Absolute hrefs: one payload string feeds BOTH channels (D-91), and a root-relative href is a dead
      // link in an email client. Preserves the exact URLs the pre-migration sends used.
      const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
      await emitNotify({
        type: "request_received",
        recipientId: userId,
        bookingId: res.id,
        email: me.email,
        payload: {
          type: "request_received",
          listingTitle: title,
          whenLabel,
          totalLabel,
          href: `${base}/bookings/${res.id}`,
        },
      });
      await emitNotify({
        type: "new_request_to_host",
        recipientId: lr.hostId,
        bookingId: res.id,
        email: lr.hostEmail,
        payload: {
          type: "new_request_to_host",
          listingTitle: title,
          whenLabel,
          bookerLabel,
          totalLabel,
          respondByLabel,
          href: `${base}/host/requests`,
        },
      });
    }

    // A `requested` hold occupies the slot immediately in the calendar + search (06-01 EXCLUDE + the 06-02
    // read model), so revalidate BOTH before redirecting to the request-received surface (06-08 renders the
    // `requested` state; the redirect target must exist today). OUTSIDE the T11 guard: a replayed
    // double-submit must still revalidate and land on the existing request.
    revalidatePath(`/listings/${listingId}`);
    revalidatePath("/");
    redirect(`/bookings/${res.id}`);
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
    declaredPax, // D-108: the surcharge is re-derived server-side and folds into spacePriceCents (A1), fee>0 only
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
 * placeOpenHold — the OPEN-CAPACITY entering-checkout mutation (OPEN-02 / OC-02 / OC-06, D-123). The
 * drop-in sibling of `placeHold`: a booker picks a DATE and a number of passes, and the admissions claim
 * grants `min(requested, remaining)` under the per-(listing, date) advisory lock (09-RESEARCH Pattern 2).
 *
 * A POST server action, never a GET side-effect (Pitfall 2). It repeats `placeHold`'s gates IN THE SAME
 * ORDER, and deliberately by RE-STATEMENT rather than extraction: the two payload shapes differ, and the
 * gates ARE the security surface — they belong where they are enforced, not behind a shared helper whose
 * next edit would silently move both mutations at once.
 *
 * The gates, in order:
 *   1. SESSION (D-41)                — no session ⇒ the same calm sign-in result `placeHold` returns.
 *   2. CAPABILITY (T-04-BOOKCAP)     — canBook re-read from the DB row; a client flag is never trusted.
 *   3. SHAPE (openHoldSchema)        — a date + a pass count and nothing else; a smuggled window is
 *                                      stripped by Zod (T-09-26), so it cannot reach the claim.
 *   4. DATE (parsePickedDate)        — the attacker-controlled `YYYY-MM-DD` is canonicalized and
 *                                      round-trip-guarded before any instant is derived.
 *   5. BOOKABILITY (Security V4)     — the same deriveBookable join, re-derived server-side.
 *   6. OCCUPANCY MODE (T-09-23)      — the mirror of placeHold's refusal: this mutation admits ONLY
 *                                      `open_capacity`, so neither payload shape can cross into the other
 *                                      listing's arbitration.
 *   7. THE CLAIM                     — createOpenCapacityHold owns the cap, the price and the window
 *                                      instants; this action supplies none of them.
 *
 * MONEY: this action never computes, accepts or echoes an amount. The frozen triple is written inside the
 * claim's transaction from the LISTING's own `per_head_price_cents` × the GRANTED heads (OC-07/OC-08).
 */
export async function placeOpenHold(input: unknown): Promise<PlaceHoldResult> {
  // (1) Session gate (D-41) — same copy as placeHold; the CTA threads the return-to-booking callbackURL.
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to book this space." };
  }

  // (2) Capability gate (T-04-BOOKCAP) — re-read from the user ROW. Only the capability is selected here:
  // the open path emits no notification (see the tail of this action), so there is no name/email to carry.
  const [me] = await db.select({ canBook: user.canBook }).from(user).where(eq(user.id, userId));
  if (!me?.canBook) {
    return { ok: false, reason: "activate-booking", error: "Turn on booking to reserve this space." };
  }

  // (3) Re-validate the untrusted payload SHAPE. There are no window fields to validate — that is the point
  // (T-09-26): the entry window comes from the listing's own operating hours in step (7), not the client.
  const parsed = openHoldSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      reason: "invalid",
      error: "Please check your selection and try again.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { listingId, requestedPasses, idempotencyKey } = parsed.data;

  // (4) Canonicalize the picked calendar day with the STRICT parser search already uses for exactly this
  // attacker-controlled shape. It round-trip-guards impossible days (2026-02-31) that the schema's regex
  // deliberately lets through, so nothing malformed can reach the day-window derivation or SQL.
  const picked = parsePickedDate(parsed.data.date);
  if (!picked) {
    return { ok: false, reason: "invalid", error: "Pick a day to book." };
  }

  // (5) Re-derive bookability SERVER-SIDE (Security V4 — the reserve route group is NOT the gate): the same
  // published + host emailVerified + host payoutsEnabled join placeHold uses, plus the occupancy mode.
  const [lr] = await db
    .select({
      status: listing.status,
      occupancyMode: listing.occupancyMode,
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
  if (!lr || !bookable) {
    return { ok: false, reason: "not-bookable", error: "This space isn't accepting bookings right now." };
  }

  // (6) The MIRROR of placeHold's refusal (T-09-23) — each mutation admits exactly ONE occupancy mode, both
  // decided from the persisted listing row. Refusing here matters less for arbitration (an exclusive listing
  // is still covered by the EXCLUDE) and more for shape: a date-only payload against an hourly listing has
  // no window to book, and minting the venue's whole operating day as an exclusive booking would sell out a
  // court for the price of one drop-in pass.
  if (lr.occupancyMode !== "open_capacity") {
    return { ok: false, reason: "invalid", error: "This space is booked by the hour — pick a time to book." };
  }

  // (7) The OC-03 entry window for the picked date, derived from the LISTING's own operating hours. Null =
  // the venue is closed that weekday, so there is no pass to sell (never a crash, never a guessed window).
  const win = await loadOpenDayWindow(db, listingId, picked);
  if (!win) {
    return { ok: false, reason: "invalid", error: "This space isn't open that day. Pick another date." };
  }

  // (8) THE CLAIM (D-123). Everything that decides money or capacity lives inside its transaction: the cap
  // (listing.max_occupancy) and the rate (listing.per_head_price_cents) are read there under the advisory
  // lock, against the live admissions SUM. This action passes a head REQUEST, never a bound (T-09-05). A
  // past/out-of-horizon date is refused in there too, against the DB clock (Security V4).
  // The window instants say what the pass COVERS (persisted as starts_at/ends_at); the day bounds + date key
  // say what it COUNTS AGAINST (the lock, the sweep and the heads SUM — never a column). Both come from the
  // SAME OpenDayWindow step (7) loaded, so an hours edit can move the former without touching the latter
  // (CR-03). This action still supplies no cap, no price and no bound of any kind.
  const res = await createOpenCapacityHold(db, {
    listingId,
    bookerId: userId,
    dayOpenUtc: win.dayOpenUtc,
    dayCloseUtc: win.dayCloseUtc,
    dayStartUtc: win.dayStartUtc,
    dayEndUtc: win.dayEndUtc,
    dateKey: win.dateKey,
    requestedHeads: requestedPasses,
    idempotencyKey: idempotencyKey ?? null,
  });
  if ("error" in res) {
    // OC-13's race loss gets its OWN reason so the CTA can render the drop-in copy and refresh the calendar;
    // every other refusal (a closed/past date, an unknown listing) reuses the shipped calm `taken` branch.
    return res.soldOut
      ? { ok: false, reason: "sold-out", error: res.error }
      : { ok: false, reason: "taken", error: res.error };
  }

  // NO notification is emitted here, and that is deliberate — not an omission. Open capacity is instant-only
  // (OC-10): there is no host to alert and no approval to await, the booker is looking at the page they will
  // be redirected to, and the confirmation receipt is the EXISTING payment-paid webhook's (BOOK-06).

  // (9) The pending hold occupies its heads immediately in BOTH the day calendar and search, so revalidate
  // both before redirecting to the reserve page.
  revalidatePath(`/listings/${listingId}`);
  revalidatePath("/");
  // `requested` is carried ONLY so the reserve page can render the OC-07 reduction notice, and it is
  // DISPLAY-ONLY (threat T-09-24): the CHARGE is the frozen `quoted_total_cents` on the row, which the claim
  // computed for the GRANTED heads. The reserve page recomputes both figures server-side and clamps
  // `requested` before rendering it (09-13), so a crafted value can move a caption and nothing else.
  const partial = res.granted < res.requested ? `&requested=${res.requested}` : "";
  redirect(`/listings/${listingId}/book?hold=${res.id}${partial}`);
}

/**
 * updateDeclaredPax — the PaxStepper's re-quote (GROUP-01/GROUP-05 · D-108, 08-UI-SPEC § 5 / Open Q5).
 *
 * The one job: change the organizer's declared headcount on a LIVE, UNPAID hold and RE-FREEZE the D-74
 * triple from it. The client sends a headcount and NOTHING ELSE — no price, no fee, no total. Every money
 * input (`included`, `extra_head_fee`, both rates) is re-read from the LISTING row here, and the whole
 * quote is recomputed by the same `quoteWindow` + `computeServiceFee` pair `createPendingHold` uses, so a
 * tampered pax can move the charge only in the way the host's own pricing says it should (T-08-12).
 *
 * Guards, in order:
 *   - SESSION + OWNERSHIP (T-04-HOLDIDOR): a missing row and someone else's row return the SAME calm
 *     sentence — a leaked id reveals nothing.
 *   - OPEN CAPACITY IS REFUSED OUTRIGHT (D-126): a drop-in booking's head count is FIXED at hold time,
 *     because it IS the capacity claim. See the guard's own note below for why both directions go.
 *   - LIVE + UNPAID ONLY: `pending` (instant) or `approved` (pay-on-approval) with `expires_at > now()`,
 *     evaluated against the POSTGRES clock inside the UPDATE's own WHERE. A `confirmed` booking has already
 *     been charged and can NEVER be re-priced here — the top-up for an over-subscribed group is D-114's
 *     deferred fast-follow, deliberately not this action.
 *   - FLAT LISTINGS ARE INERT: with `extra_head_fee` absent/0 this returns success having written nothing,
 *     so `declared_pax` stays NULL and the frozen price is untouched (D-108 zero-leak).
 *   - CAP: the headcount is clamped to the listing's own `maxOccupancy` server-side. The stepper's `max`
 *     attribute is a courtesy; this is the gate (Security V4).
 *
 * `fullDay` comes from the PERSISTED `booking.full_day` snapshot (WR-06), never re-derived from the frozen
 * price — re-deriving it here would be the 07-17 anti-pattern squared, because the surcharge this very
 * action folds in is what makes `space != hourlyRate × hours` for an ordinary hourly booking.
 */
export async function updateDeclaredPax(holdId: string, pax: number): Promise<UpdatePaxResult> {
  const userId = await requireUserId();
  if (!userId) return { ok: false, error: "Sign in to change your booking." };

  const parsed = declaredPaxSchema.safeParse(pax);
  if (!parsed.success) return { ok: false, error: "That headcount doesn't look right." };

  const limit = rateLimit(`reprice-pax:${userId}`, REPRICE_PAX_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "reprice_pax",
      outcome: "denied",
      meta: { reason: "rate_limit", holdId, retryAfter: limit.retryAfter },
    });
    return { ok: false, error: "You're going a little fast. Please try again in a moment." };
  }

  // Owner-gated load. The listing's pricing facts ride along on the SAME round trip (the units.ts idiom):
  // they are the server's own numbers, and reading them here keeps the quote consistent with the row.
  const [row] = await db
    .select({
      bookerId: booking.bookerId,
      status: booking.status,
      listingId: booking.listingId,
      startsAt: booking.startsAt,
      endsAt: booking.endsAt,
      // WR-06 pricing-mode snapshot — the SAME flag the original quote was frozen with.
      fullDay: booking.fullDay,
      // D-123 arbitration snapshot — read here so the D-126 guard below can refuse a drop-in row.
      openCapacity: booking.openCapacity,
      declaredPax: booking.declaredPax,
      // CR-02: the session this booking last sent a booker to pay at, or NULL if it never reached checkout
      // (a legitimate, expected state — never an error). Read here so the expire gate below has an id.
      checkoutSessionId: booking.checkoutSessionId,
      hourlyRateCents: listing.hourlyRateCents,
      dayRateCents: listing.dayRateCents,
      included: listing.included,
      extraHeadFee: listing.extraHeadFee,
      maxOccupancy: listing.maxOccupancy,
    })
    .from(booking)
    .innerJoin(listing, eq(listing.id, booking.listingId))
    .where(eq(booking.id, holdId));
  if (!row || row.bookerId !== userId) {
    return { ok: false, error: "We can't show this booking." };
  }

  // ── D-126 (RESEARCH Open Question 2, planner's call): open-capacity holds are NOT re-priceable. ───────
  // For a drop-in booking the head count IS the capacity claim: it was granted under the advisory lock
  // against the day's live admissions SUM. This action re-quotes WITHOUT re-entering that claim, so
  // allowing it here would let a booker raise declared_pax past the cap after the fact — an overbook AND a
  // price change, on the money path, through a single server action (T-09-25). Stepping DOWN is harmless
  // but has no shipped surface (the pass stepper is PRE-hold for open listings, 09-UI-SPEC § 2c), so both
  // directions are refused with one guard rather than half a mechanism. More passes = another booking.
  //
  // This must precede the flat-listing short-circuit below: an open listing has no extra_head_fee, so that
  // branch would report success and the booker would never learn the count cannot move.
  if (row.openCapacity) {
    return { ok: false, error: PASSES_FIXED_MESSAGE };
  }

  // D-108 zero-leak: a listing that does not charge per head has no surcharge machinery at all. Report
  // success and write nothing — there is no declared_pax to record and no price that could move.
  if ((row.extraHeadFee ?? 0) <= 0) return { ok: true };

  // The cap is the LISTING's, applied here rather than trusted from the stepper (Security V4).
  const cap = row.maxOccupancy != null && row.maxOccupancy > 0 ? row.maxOccupancy : parsed.data;
  const declared = Math.min(parsed.data, cap);

  let quote;
  try {
    quote = quoteWindow({
      startUtc: row.startsAt,
      endUtc: row.endsAt,
      fullDay: row.fullDay ?? false,
      hourlyRateCents: row.hourlyRateCents,
      dayRateCents: row.dayRateCents,
      included: row.included ?? undefined,
      extraHeadFee: row.extraHeadFee ?? undefined,
      declaredPax: declared,
    });
  } catch {
    // A listing missing the rate its own booking needs is a mis-configuration, not a booker error — refuse
    // calmly rather than freeze a price the quote engine would not stand behind.
    return { ok: false, error: "We couldn't update your booking. Please try again." };
  }
  const fee = computeServiceFee(quote.totalCents);

  // ── THE EXPIRE GATE (CR-02). ORDER IS EXPIRE → RE-FREEZE, AND THAT ORDER IS THE WHOLE FIX. ─────────────
  // A per-head booking's checkout Idempotency-Key is scoped to the frozen AMOUNT (D-108), so the moment the
  // amount below moves, a later "Confirm & pay" mints a genuinely NEW session — while the one this booker
  // may still have open in another tab or one Back away stays payable at the OLD total. The confirm webhook
  // keys purely on `reference_number` and confirms on `status='pending'` alone (D-57): it cannot tell the
  // two apart, so a stale payment is captured and never refunded. So the superseded session is retired
  // FIRST, and only then is the new amount frozen.
  //
  // ⚠️ DO NOT REORDER THIS INTO "re-freeze first, expire best-effort". That is the exact CR-02 defect: a
  // failed expire would leave the booking quoted at ₱Y with a live session payable at ₱X, money captured
  // against a total the row no longer claims, no refund and no alert. Expire-first fails the other way — the
  // booking keeps its PREVIOUS amount, which is precisely the amount the still-live session charges, so the
  // row and the payable session never disagree. Refusing costs a booker one retry (T-08-45, accepted);
  // proceeding costs an unrefunded double capture.
  //
  // NULL is normal, not an error: a hold that never reached checkout has no session to retire, and calling
  // PayMongo for it would be a fabricated request (08-12 contract 2).
  if (row.checkoutSessionId != null) {
    try {
      await expireCheckoutSession(row.checkoutSessionId);
    } catch {
      // The session id belongs in this audit meta precisely BECAUSE an operator needs it to retire the
      // session by hand — it is an API resource identifier, not a bearer credential (unlike the group invite
      // token, which is deliberately never audited). PayMongo's own error text stays out of both the audit
      // and the response (T-05-15 / T-08-44): the booker gets the same calm retryable sentence every other
      // transient failure in this action returns.
      await recordAudit({
        actorId: userId,
        action: "checkout_expire_failed",
        outcome: "needs_attention",
        meta: { holdId, checkoutSessionId: row.checkoutSessionId },
      });
      return { ok: false, error: "We couldn't update your booking. Please try again." };
    }
  }

  // The re-freeze. Scoped to (id, owner, live-and-unpaid) so it can never touch a confirmed row, and the
  // expiry is compared against the POSTGRES clock in the same statement that writes — the same authority
  // every other expiry decision in the system uses. Zero rows back = the hold lapsed while they stepped.
  const written = await db
    .update(booking)
    .set({
      declaredPax: declared,
      // The D-74 triple, re-frozen TOGETHER. quoted == space + fee still holds exactly, by construction.
      spacePriceCents: quote.totalCents,
      serviceFeeCents: fee.serviceFeeCents,
      quotedTotalCents: fee.allInCents,
      // The row stops claiming a live session in the SAME write that moves the amount — the session named
      // here was just expired, and the next "Confirm & pay" will name its replacement. Clearing it in a
      // later statement would leave a window where a retry expires an already-dead id.
      checkoutSessionId: null,
    })
    .where(
      and(
        eq(booking.id, holdId),
        eq(booking.bookerId, userId),
        inArray(booking.status, ["pending", "approved"]),
        sql`${booking.expiresAt} > now()`,
      ),
    )
    .returning({ id: booking.id });
  if (written.length === 0) {
    return { ok: false, error: "Your hold is no longer active. Check availability again." };
  }

  revalidatePath(`/listings/${row.listingId}/book`);
  return { ok: true };
}

/**
 * confirmBooking — "Confirm & pay" (D-57). The Phase-4 synchronous pending→confirmed flip is RETIRED: the
 * booking confirms ONLY when the checkout_session.payment.paid webhook lands (Plan 04 — the single confirm
 * authority). This action instead:
 *   1. owner-gates the hold (IDOR, T-05-13) and reads the SERVER-FROZEN amount (D-49);
 *   2. short-circuits an already-'confirmed' own booking to the confirmation (idempotent, D-42);
 *   3. EXTENDS the hold to now()+PAYMENT_WINDOW so the sweep can't take the slot mid-payment (D-58);
 *   4. creates a hosted PayMongo Checkout Session charging EXACTLY booking.quotedTotalCents;
 *   5. redirects off-site to pay.
 * Rate-limited + audited (WR-06). Any PayMongo failure returns a calm retry result — never a raw 500 or a
 * leaked secret (T-05-15).
 */
export async function confirmBooking(holdId: string): Promise<ConfirmResult> {
  const userId = await requireUserId();
  if (!userId) {
    return { ok: false, reason: "sign-in", error: "Sign in to confirm your booking." };
  }

  // Owner-gated load (T-04-HOLDIDOR / T-05-13). A missing row OR a different booker both return the SAME
  // calm "can't show this booking" so a leaked/guessed id reveals nothing (owner-gate, D-43). The frozen
  // amount + currency + listing are read HERE — the charge is server-side only (the action takes no amount).
  const [bk] = await db
    .select({
      bookerId: booking.bookerId,
      status: booking.status,
      listingId: booking.listingId,
      startsAt: booking.startsAt,
      // CR-01 — the two facts the checkout-initiation cutoff below forks on: the PERSISTED occupancy mode,
      // and the instant this booking's own session ENDS. Both come from the drizzle schema object (never a
      // raw SQL alias), so `tsc` types them and a dropped column is a compile error, not a silent
      // `undefined → falsy` that would render a drop-in pass as a 16-hour reservation.
      openCapacity: booking.openCapacity,
      endsAt: booking.endsAt,
      quotedTotalCents: booking.quotedTotalCents,
      currency: booking.currency,
      // D-108 — read ONLY to scope the Idempotency-Key below. NULL on every flat-priced booking.
      declaredPax: booking.declaredPax,
      // The session (if any) this booking already named on a PRIOR confirmBooking submission — the expire-
      // before-create gate below retires it before minting the next, mirroring updateDeclaredPax.
      checkoutSessionId: booking.checkoutSessionId,
    })
    .from(booking)
    .where(eq(booking.id, holdId));
  if (!bk || bk.bookerId !== userId) {
    return { ok: false, reason: "denied", error: "We can't show this booking." };
  }

  // Idempotent short-circuit (D-42 / T-05-14): an already-'confirmed' OWN booking is a no-op SUCCESS —
  // redirect to the confirmation WITHOUT creating a second checkout. Must precede the rate-limit + charge.
  if (bk.status === "confirmed") {
    redirect(`/bookings/${holdId}`);
  }

  // A live hold to pay for is either a `pending` instant hold OR an `approved` request (pay-on-approval,
  // PAY-05 / D-63 — the host approved, the booker now pays via this SAME Phase-5 checkout). Any other
  // status (cancelled/declined/requested-not-yet-approved/…) has no live hold left to pay for.
  if (bk.status !== "pending" && bk.status !== "approved") {
    return {
      ok: false,
      reason: "expired",
      error: "Your hold is no longer active. Check availability again.",
    };
  }

  // ── D-94, FORKED ON THE PERSISTED OCCUPANCY MODE (CR-01). ────────────────────────────────────────────
  // Pay is refused once this booking's OWN SESSION is over. This is the CHECKOUT-INITIATION guard — the
  // safe place to refuse, BEFORE any money moves. `now` is read from POSTGRES, not the JS clock, so it is
  // the same clock every other expiry decision in the system uses (a skewed process clock must never decide
  // whether a session has begun).
  //
  // WHICH instant ends the session is NOT the same in both occupancy modes. An EXCLUSIVE booking's session
  // begins at its `starts_at`, so that is its cutoff and it is unchanged here. A DROP-IN PASS's `starts_at`
  // is the venue's OPENING instant and the session it buys runs until CLOSING (OC-03) — so an open row's
  // cutoff is `ends_at`. Comparing an open row against `starts_at` refused every same-day pass from the
  // moment the venue opened: holdable all day, payable never, with each retry silently occupying a spot for
  // the hold TTL. That was CR-01.
  //
  // This is the SAME divergence `createOpenCapacityHold` already applies to `expires_at`
  // (src/lib/availability/units.ts — LEAST(now() + ttl, dayClose) rather than LEAST(now() + ttl, starts_at)),
  // for the identical reason, so the invariant is PRESERVED, not weakened: no hold and no payment ever
  // outlives its own session; only where that session ends moved. The exclusive sentence and comparison
  // below are byte-for-byte what they were, and case 2 of tests/booking/open-capacity-confirm.test.ts
  // refuses an exclusive booking past its own start — so this fork can never silently become a deletion.
  //
  // The mode is read from the PERSISTED `open_capacity` column and from nothing else: never inferred from a
  // null rate, a null `declared_pax` or `full_day`. A drop-in listing may legally still carry
  // `hourly_rate_cents` / `day_rate_cents` (OC-17 lets a host switch modes without wiping them).
  //
  // ⚠️ The mirror of this guard does NOT belong in the payment webhook (D-57 / Pitfall 4), and this fork
  // does not put one there — src/app/api/paymongo/webhook/route.ts is untouched and must stay so. That
  // handler confirms on `status='pending'` ALONE because payment is the confirm authority; ANY start-time
  // or end-time condition there would take the booker's money and leave the booking unconfirmable. A
  // payment that lands past the window anyway is handled by the existing handleGoneSlot auto-refund
  // backstop (D-58).
  const nowRows = (await db.execute(sql`SELECT now() AS "now"`)) as unknown as { now: Date | string }[];
  const nowFromDb = new Date(nowRows[0].now);
  const cutoff = bk.openCapacity ? bk.endsAt : bk.startsAt;
  if (cutoff.getTime() <= nowFromDb.getTime()) {
    return {
      ok: false,
      reason: "expired",
      error: bk.openCapacity
        ? "This day's passes are no longer available. Check availability again."
        : "This session has already started, so it can't be paid for now. Check availability again.",
    };
  }

  // WR-06: bound the money-adjacent action per identity; audit the denial (non-repudiable). Reuses the
  // paymongo-connect.ts pattern (session → rateLimit → recordAudit on denial → calm result).
  const limit = rateLimit(`confirm-pay:${userId}`, CONFIRM_PAY_RATE_LIMIT);
  if (!limit.ok) {
    await recordAudit({
      actorId: userId,
      action: "confirm_pay",
      outcome: "denied",
      meta: { reason: "rate_limit", holdId, retryAfter: limit.retryAfter },
    });
    return { ok: false, reason: "checkout", error: "You're going a little fast. Please try again in a moment." };
  }

  // Charge-integrity guard (D-49): a mis-frozen (null) quote must NEVER charge 0 — bail calmly.
  if (bk.quotedTotalCents == null) {
    await recordAudit({
      actorId: userId,
      action: "confirm_pay",
      outcome: "error",
      meta: { reason: "no_quote", holdId },
    });
    return { ok: false, reason: "checkout", error: "We couldn't start checkout. Please try again." };
  }

  // EXTEND the hold BEFORE creating the checkout (D-58 / T-05-16): push expires_at out (DB clock) so the
  // lazy-expiry sweep can't free — and someone else can't take — the slot while the booker pays. Scoped to
  // the owner + a still-live hold ('pending' instant OR 'approved' pay-on-approval) so it can never touch a
  // confirmed/other row (T-06-10). GREATEST guarantees a fresh 24h `approved` payment window is never
  // SHRUNK to the 60-min instant window (Pitfall 6) — we only ever push expires_at forward, never back.
  await db.execute(sql`
    UPDATE booking
    SET expires_at = GREATEST(expires_at, now() + make_interval(mins => ${PAYMENT_WINDOW_MINUTES}))
    WHERE id = ${holdId} AND booker_id = ${userId} AND status IN ('pending','approved')`);

  // ── EXPIRE-BEFORE-CREATE (deferred item 5 — the double-charge BLOCKER). ─────────────────────────────
  // PayMongo does NOT honor the Idempotency-Key on POST /v1/checkout_sessions (probed against sk_test_:
  // two byte-identical POSTs mint two DIFFERENT, independently payable session ids). So a plain
  // double-submit of "Confirm & pay" — or a Back-then-retry — would mint a SECOND payable session and
  // charge the booker twice, unrefundable on a qrph rail. The confirm webhook keys purely on
  // reference_number and confirms on status='pending' alone (D-57), so it cannot tell the two apart. The
  // ONLY real retirement mechanism is expire, so any session this booking already named is retired FIRST.
  // This mirrors updateDeclaredPax's gate and protects BOTH per-head and flat bookings — the flat
  // checkout:<bookingId> key was believed to be a double-charge guard and is not one.
  //
  // ⚠️ FAIL-CLOSED on a GENUINE failure: a thrown expire REFUSES the new checkout rather than leaking a
  // second payable session. An operator retires the old session by hand from the needs_attention audit.
  // NULL is normal — a hold that never reached checkout has nothing to retire, and calling PayMongo for it
  // would be a fabricated request.
  //
  // NOT-TRAPPED RECOVERY: if createCheckoutSession fails AFTER this expire succeeds, the column still names
  // the (now-expired) old id. On the booker's retry, this block expires that id AGAIN — and a repeat expire
  // returns HTTP 400 "already expired" (08-19 case 4, probed live — NOT a replayed 200; the Idempotency-Key
  // is not honored on the expire endpoint either). expireCheckoutSession TOLERATES exactly that 400 as
  // success (the session is already non-payable), so the retry RESOLVES here and proceeds to mint a fresh
  // session — never a permanent fail-closed loop. A genuine expire failure (500 / network / any other 400)
  // still throws and still refuses below.
  //
  // ⚠️ CONCURRENCY RESIDUAL (T-08-79, ACCEPTED): this read-then-act gate is UNLOCKED, so two truly
  // simultaneous confirmBooking calls for one holdId can both read a stale/NULL checkoutSessionId, both
  // skip the expire, and both mint a payable session. NOT closed here on purpose — a SELECT … FOR UPDATE
  // spanning expire+create would hold a DB row lock across two external PayMongo HTTP round-trips (a worse
  // anti-pattern) and would diverge from the accepted updateDeclaredPax shape (CR-02, verified 08-13). This
  // gate covers the SEQUENTIAL double-submit (the observed UAT failure), not a concurrent double-click.
  if (bk.checkoutSessionId != null) {
    try {
      await expireCheckoutSession(bk.checkoutSessionId);
    } catch {
      await recordAudit({
        actorId: userId,
        action: "checkout_expire_failed",
        outcome: "needs_attention",
        meta: { holdId, checkoutSessionId: bk.checkoutSessionId },
      });
      return { ok: false, reason: "checkout", error: "We couldn't start checkout. Please try again." };
    }
  }

  // Create the hosted checkout for the SERVER-FROZEN amount (D-49).
  //
  // ⚠️ The Idempotency-Key is NOT a double-submit guard here: PayMongo does not honor it on
  // POST /v1/checkout_sessions (probed — two identical POSTs return two different payable session ids).
  // The guard is the expire-before-create ABOVE, which retires any session this row already named.
  //
  // ── D-108: THE KEY IS AMOUNT-SCOPED **ONLY** WHEN A HEADCOUNT WAS DECLARED. ────────────────────────────
  // `declared_pax` is non-NULL exactly on a per-head-priced booking (units.ts writes it only when the
  // listing charges per head), and such a booking's frozen quote CAN legitimately move after this session
  // would first be created: the booker can leave the hosted checkout, land back on the reserve page via
  // `cancelUrl`, step the headcount, and pay again. With a bookingId-only key that second attempt replays
  // the FIRST session and charges the OLD amount — the displayed total would not be the charged total,
  // which is precisely the trust failure `price-breakdown.tsx` is written to prevent. Folding the frozen
  // amount into the key makes a re-priced hold mint a session for the price actually agreed. A double-click
  // at the SAME amount resolves to the same KEY — but PayMongo mints a new session regardless (the key is
  // not honored on checkout-session creation), so the expire-before-create above is what retires the
  // superseded session on a SEQUENTIAL resubmission (a concurrent double-click is the accepted T-08-79
  // residual).
  //
  // ⚠️ THE ONE-LIVE-SESSION INVARIANT IS **NOT** HELD BY THIS KEY (CR-02). Precisely because the key is
  // amount-scoped, a re-priced hold mints a genuinely NEW session — and the SUPERSEDED one stays payable in
  // a second tab or the browser Back stack unless something retires it. What holds "at most one payable
  // session per booking" is `updateDeclaredPax`: it EXPIRES the persisted `checkout_session_id` BEFORE it
  // freezes the new amount, and REFUSES the re-price if that expire fails. This action's half of that
  // contract is the write further down — every session created here is NAMED on its own booking row before
  // the booker leaves the app, or there would be nothing for the re-price to expire.
  //
  // Flat-priced bookings keep the byte-identical `checkout:<bookingId>` key they have today — their quote
  // is immutable once frozen, so there is nothing for an amount to disambiguate, and the shipped
  // double-charge guard (and the tests pinning it) is untouched.
  const base = process.env.BETTER_AUTH_URL ?? "http://localhost:3000";
  const ref = bookingReference(holdId);
  let checkout: { id: string; checkoutUrl: string };
  try {
    checkout = await createCheckoutSession({
      amountCents: bk.quotedTotalCents,
      currency: bk.currency ?? "php",
      name: `Booking ${ref}`,
      referenceNumber: holdId,
      metadata: { booking_id: holdId },
      successUrl: `${base}/bookings/${holdId}?paid=1`,
      cancelUrl: `${base}/listings/${bk.listingId}/book?hold=${holdId}`,
      idempotencyKey:
        bk.declaredPax == null
          ? `checkout:${holdId}`
          : `checkout:${holdId}:${bk.quotedTotalCents}`,
    });
  } catch {
    // A PayMongo failure is surfaced as a calm retryable result — never a raw 500 or a leaked secret.
    await recordAudit({
      actorId: userId,
      action: "confirm_pay",
      outcome: "error",
      meta: { reason: "paymongo_error", holdId },
    });
    return { ok: false, reason: "checkout", error: "We couldn't start checkout. Please try again." };
  }

  // NAME the session we just created on its own booking row (CR-02). This is the only place a checkout
  // session enters the system, so it is the only place that can record which one is live — and it has to
  // happen BEFORE the redirect, which throws by design (nothing after it ever runs). `updateDeclaredPax`
  // reads this column to expire the superseded session before re-freezing a new amount; a session that was
  // never written here can never be retired.
  //
  // Scoped exactly like every other write in this action — owner + a still-live hold — so it can never
  // touch a confirmed or terminal row (T-06-10).
  //
  // ⚠️ ZERO ROWS IS NOT A FAILURE, AND MUST NOT BECOME ONE. If the hold lapsed between the extension above
  // and this write, the booker is ALREADY on their way to a real, payable session; refusing here would
  // strand them mid-payment with money about to move and no page to move it on. The existing expiry /
  // handleGoneSlot machinery (D-58) is what resolves that case. Say nothing to the client, and do not
  // "harden" this into a refusal.
  await db
    .update(booking)
    .set({ checkoutSessionId: checkout.id })
    .where(
      and(
        eq(booking.id, holdId),
        eq(booking.bookerId, userId),
        inArray(booking.status, ["pending", "approved"]),
      ),
    );

  await recordAudit({ actorId: userId, action: "confirm_pay", outcome: "ok", meta: { holdId } });
  // The webhook (Plan 04) — NOT this browser return — is the confirm authority (D-57); we only send the
  // booker off-site to pay. On return, /bookings/[id]?paid=1 renders the "finalizing…" interstitial.
  redirect(checkout.checkoutUrl);
}
