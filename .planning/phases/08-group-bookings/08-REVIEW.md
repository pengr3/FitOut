---
phase: 08-group-bookings
reviewed: 2026-07-28T03:04:48Z
depth: standard
files_reviewed: 50
files_reviewed_list:
  - drizzle/0017_group_bookings.sql
  - drizzle/0018_group_notification_types.sql
  - src/app/(app)/bookings/[id]/cancel/page.tsx
  - src/app/(app)/bookings/[id]/group/page.tsx
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(host)/host/listings/[id]/edit/page.tsx
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/app/actions/booking.ts
  - src/app/actions/cancel-booking.ts
  - src/app/actions/group.ts
  - src/app/actions/listing.ts
  - src/app/api/inngest/route.ts
  - src/app/invite/[token]/page.tsx
  - src/app/listings/[id]/book/page.tsx
  - src/components/booking/pax-stepper.tsx
  - src/components/booking/price-breakdown.tsx
  - src/components/group/attendee-roster.tsx
  - src/components/group/create-group-button.tsx
  - src/components/group/group-refresh.tsx
  - src/components/group/headcount-meter.tsx
  - src/components/group/regenerate-link-button.tsx
  - src/components/group/remove-attendee-button.tsx
  - src/components/group/rsvp-confirmation.tsx
  - src/components/group/rsvp-form.tsx
  - src/components/group/share-link-box.tsx
  - src/components/group/top-up-nudge.tsx
  - src/components/notifications/notification-item.tsx
  - src/inngest/functions/guest-email.ts
  - src/inngest/functions/notify.ts
  - src/lib/availability/units.ts
  - src/lib/booking/pricing.ts
  - src/lib/db/schema.ts
  - src/lib/email.ts
  - src/lib/group/guest-notify.ts
  - src/lib/group/rsvp.ts
  - src/lib/group/seat-claim.ts
  - src/lib/group/token.ts
  - src/lib/validation/booking.ts
  - src/lib/validation/group.ts
  - src/lib/validation/listing.ts
  - src/lib/validation/notification.ts
  - tests/group/group-lifecycle.test.ts
  - tests/group/group-owner-scope.test.ts
  - tests/group/guest-email-guard.test.ts
  - tests/group/rsvp-identity.test.ts
  - tests/group/seat-claim-race.test.ts
  - tests/group/seat-claim.test.ts
  - tests/notifications/guest-email.test.ts
  - tests/booking/pax-surcharge-hold.test.ts
  - tests/booking/pricing.test.ts
findings:
  critical: 4
  warning: 10
  info: 0
  total: 14
status: issues_found
---

# Phase 08: Code Review Report

**Reviewed:** 2026-07-28T03:04:48Z
**Depth:** standard
**Files Reviewed:** 50
**Status:** issues_found

## Summary

Phase 08 adds a `booking_group` + `rsvp` model, a pessimistic seat-claim, pax-scaled pricing, a
guest-email channel, an organizer management surface, and the app's first unauthenticated public page.

The two areas the phase spent the most design energy on hold up under adversarial reading. The
seat-claim (`src/lib/group/seat-claim.ts`) genuinely holds `SELECT capacity_snapshot … FOR UPDATE` on
the single group row across the read-count-decide-write window inside one transaction, and
`removeAttendee` takes the same lock, so toggles and removals serialise correctly. Owner scope is in
the WHERE (not post-filtered) on every organizer read and inside every organizer mutation's own
WHERE. The token is 100-bit crypto-random, the unknown/voided/regenerated states genuinely collapse
onto one frozen value, guest names render as escaped React text and `escapeHtml`'d email fields, and
notifications are emitted after the claim transaction resolves.

What does not hold up is the surrounding money and messaging plumbing that the pax surcharge touched:

- **The surcharge silently breaks the app's single time formatter.** `composeWhenLabel` re-derives
  "full day" by comparing `spacePriceCents` to `hourlyRate × hours`. D-108 folds the surcharge *into*
  `spacePriceCents`, so every per-head-priced hourly booking now renders **"Full day"** on 18
  surfaces — including the public invite page, both RSVP emails and both group notifications. The
  plan authors identified this exact hazard and removed the derivation from two page files (with grep
  tripwires), but left it in the shared module all those pages' emails go through.
- **`declaredPax` is unclamped at the primary booking entry point.** `updateDeclaredPax` clamps to
  `maxOccupancy`; `placeHold` → `createPendingHold` does not clamp at all, contradicting the contract
  written in `pax-stepper.tsx`. A crafted POST puts an arbitrary multiplier into the frozen price and
  can overflow the `int4` money columns into a raw 500.
- **The amount-scoped PayMongo idempotency key can create two simultaneously payable checkout
  sessions for one booking**, with no mechanism to retire the superseded one.
- **The first unauthenticated write path grows the in-memory rate-limit `Map` on attacker-chosen
  keys**, unbounded and never evicted.

Plus ten quality/correctness warnings, including a cancellation email whose CTA is dead by
construction, a confirmation screen that claims an email was sent when the send was suppressed, and
an off-by-one in the D-114 over-RSVP nudge.

Per the reviewer brief, the already-logged `seat-claim-race.test.ts` inlined-SQL gap
(`deferred-items.md` item 4) is **not** re-reported here.

---

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: The pax surcharge makes every surcharged hourly booking render "Full day" everywhere

**Severity:** BLOCKER
**File:** `src/lib/booking/when-label.ts:65-67` (defect site) · `src/lib/booking/pricing.ts:128` ·
`src/lib/availability/units.ts:511` · `src/app/actions/group.ts:161-171` ·
`src/app/invite/[token]/page.tsx:144-152` · `src/app/(app)/bookings/[id]/group/page.tsx:106-114`

**Issue:**
`quoteWindow` returns `totalCents: baseCents + surchargeCents` (`pricing.ts:128`) and
`createPendingHold` freezes that into `spacePriceCents` (`units.ts:511`). The shared venue-local
formatter then does:

```ts
// when-label.ts:65-67
const spaceCents = input.spacePriceCents ?? input.quotedTotalCents ?? 0;
const hourlyTotal = input.hourlyRateCents != null ? input.hourlyRateCents * hours : null;
const fullDay = hourlyTotal == null || spaceCents !== hourlyTotal;
```

For an **hourly** booking with `extraHeadFee > 0` and `declaredPax > included`,
`spaceCents = hourlyRate × hours + surcharge`, which by construction `!== hourlyRate × hours`. The
formatter therefore concludes `fullDay = true` and renders **"Full day"** instead of
`8:00 AM – 10:00 AM`.

`composeWhenLabel` / `composeWhenLabelShort` has 18 call sites. Every Phase-8 surface is downstream
of it:
- the **public invite page** headline window (`invite/[token]/page.tsx:144`)
- `group_rsvp_received` / `group_rsvp_confirmed` in-app rows **and** emails (`group.ts:162`)
- the guest RSVP email and the `group_cancelled` guest email (`cancel-booking.ts:367`)
- the organizer management page subhead (`group/page.tsx:106`)
- the cancel review screen (`bookings/[id]/cancel/page.tsx:121`)
- plus `/bookings`, `/host/bookings`, `/host/requests`, reminders, request-expiry and the
  payment webhook's `booking_confirmed` receipt.

This is the exact hazard the plan documented and defended against in `listings/[id]/book/page.tsx:150-158`
and `bookings/[id]/page.tsx:227-235` ("THE OLD DERIVATION IS GONE, AND MUST NOT COME BACK
(08-RESEARCH Pitfall 3) … the surcharge is folded INTO spacePriceCents (A1), so a perfectly ordinary
hourly booking with one extra guest no longer matches the plain hourly run total"). Those two pages
were fixed by formatting inline; the shared module every *email* and *notification* uses was not.

`tests/booking/when-label.test.ts` has no case with a surcharge, so nothing fails.

**Fix:** stop re-deriving `fullDay`. The persisted `booking.full_day` snapshot (drizzle 0016) already
exists and is what both fixed pages use. Make it a required input and delete the price comparison:

```ts
// when-label.ts
export type WhenLabelInput = {
  startsAt: Date;
  endsAt: Date;
  timezone: string;
  city: string | null;
  /** The PERSISTED booking.full_day snapshot (drizzle 0016). Never re-derived from a price:
   *  the D-108 surcharge is folded into spacePriceCents, so `space !== hourly × hours` is
   *  true of ordinary surcharged hourly bookings. */
  fullDay: boolean | null;
  /** Legacy pre-0016 fallback ONLY: a POSITIVE day-rate match, never an inequality. */
  spacePriceCents: number | null;
  quotedTotalCents: number | null;
  dayRateCents: number | null;
};

function compose(input: WhenLabelInput, dateFormat: string): string {
  const spaceCents = input.spacePriceCents ?? input.quotedTotalCents ?? 0;
  const fullDay =
    input.fullDay ?? (input.dayRateCents != null && spaceCents === input.dayRateCents);
  // …unchanged below
}
```

Then thread `b.full_day` through `getGroupByToken` / `OwnedGroup` / `loadBookingRow` / the other 15
call sites, and add a `when-label.test.ts` case pinning
`hourly 2h + extraHeadFee surcharge ⇒ "8:00 AM – 10:00 AM"`.

---

### CR-02: A re-priced hold mints a SECOND payable PayMongo checkout session that is never retired

**Severity:** BLOCKER
**File:** `src/app/actions/booking.ts:563-566` · `src/app/actions/booking.ts:553` ·
`src/app/actions/booking.ts:401-421`

**Issue:**
D-108 changed the checkout Idempotency-Key from the stable `checkout:<bookingId>` to an
**amount-scoped** key whenever `declared_pax` is non-null:

```ts
// booking.ts:563-566
idempotencyKey:
  bk.declaredPax == null
    ? `checkout:${holdId}`
    : `checkout:${holdId}:${bk.quotedTotalCents}`,
```

`updateDeclaredPax` re-freezes `quotedTotalCents` on any live `pending`/`approved` hold
(`booking.ts:401-418`), and the checkout's own `cancelUrl` sends the booker straight back to the
reserve page where the stepper lives (`booking.ts:562`). So the documented round trip is:
`Confirm & pay` → session **A** at ₱X → abandon → back on reserve → step pax → `Confirm & pay` →
session **B** at ₱Y.

Session **A** is never expired. `createCheckoutSession` returns `{ id, checkoutUrl }`
(`src/lib/paymongo.ts:213`) but `booking.ts:553` discards `checkout.id`, nothing persists it, and
there is no expire/cancel call anywhere. Both sessions stay payable, and session A's URL is still in
the booker's history / a second tab / the browser Back stack.

The confirm webhook keys purely on `reference_number` (the booking id) with no amount check: the
first payment flips the row to `confirmed`; the second lands, matches 0 rows, and the gone-slot
backstop returns immediately on `current.status === "confirmed"` — so **the second payment is
captured, never refunded, and raises no alert**. The comment at `booking.ts:536` still asserts "makes
a double-click / retry reuse the SAME session — never a second charge", which was true under the
single stable key and is no longer true.

**Fix:** keep exactly one live session per booking. Persist the session id and expire the previous
one before minting a new one, or (simpler, and it preserves the original invariant) do not create a
second session at all — expire the hold's session whenever `updateDeclaredPax` writes a new amount:

```ts
// booking.ts — inside updateDeclaredPax, after the successful re-freeze
if (written.length > 0 && row.checkoutSessionId) {
  // PayMongo: POST /v1/checkout_sessions/{id}/expire — a superseded session must not stay payable.
  try { await expireCheckoutSession(row.checkoutSessionId); }
  catch { await recordAudit({ actorId: userId, action: "checkout_expire_failed",
                              outcome: "needs_attention", meta: { holdId } }); }
}
```
plus `checkoutSessionId: text("checkout_session_id")` on `booking`, written in `confirmBooking` right
after `createCheckoutSession` resolves. Until that lands, revert `idempotencyKey` to the stable
`checkout:${holdId}` and refuse `updateDeclaredPax` once a session exists — one guaranteed-correct
amount beats two payable ones.

---

### CR-03: `placeHold` never clamps client-supplied `declaredPax`; it multiplies straight into the frozen price

**Severity:** BLOCKER
**File:** `src/lib/validation/booking.ts:101` · `src/app/actions/booking.ts:130,184,290` ·
`src/lib/availability/units.ts:438-450` · `src/lib/db/schema.ts:710`

**Issue:**
`bookingCreateSchema` accepts an **unbounded** headcount:

```ts
// validation/booking.ts:101 — no .max(), by explicit choice
declaredPax: z.coerce.number().int().min(1).optional(),
```

`placeHold` forwards it verbatim (`booking.ts:184` and `booking.ts:290`), and `createPendingHold`
passes it straight into the quote with **no cap check at all** — `units.ts` never even selects
`listing.maxOccupancy`:

```ts
// units.ts:438-450
const quote = quoteWindow({ …, included: included ?? undefined,
                            extraHeadFee: extraHeadFee ?? undefined,
                            declaredPax: input.declaredPax });
const declaredPaxToPersist = (extraHeadFee ?? 0) > 0 ? (input.declaredPax ?? null) : null;
```

This directly contradicts the contract the phase wrote for itself in
`src/components/booking/pax-stepper.tsx:20-21`: *"the server clamps the value against the listing's
own maxOccupancy on every call, so a crafted POST cannot declare 400 people."* That clamp exists only
on the **other** entry point (`booking.ts:376-378`, plus `declaredPaxSchema`'s `.max(10_000)` at
`booking.ts:81`) — never on the one that actually creates the booking.

Consequences on a listing with `extra_head_fee > 0`:
1. `spacePriceCents = base + (declaredPax − included) × extraHeadFee` is attacker-shaped. It is the
   **payout gross basis**, the **service-fee basis** and the **refundable basis** (`units.ts:511-513`,
   `cancel-booking.ts:502`).
2. `booking.space_price_cents` / `service_fee_cents` / `quoted_total_cents` are all `integer` (int4,
   `schema.ts:710-712`). `declaredPax` in the millions overflows int4, Postgres raises `22003`,
   `mapBookingError` re-throws anything that is not `NoUnitAvailableError`/`23P01`/`40P01`
   (`units.ts:581-586`), and the server action 500s — the raw-500 outcome T-03-500 exists to prevent.
3. `booking.declared_pax` is persisted above the listing's own occupancy, which then feeds
   `TopUpNudge`, `PriceBreakdown` and `PaxStepper` with an out-of-range value.

`tests/booking/pax-surcharge-hold.test.ts` only exercises `declaredPax` values of 1–12 on a
`maxOccupancy`-less fixture, so nothing catches it.

**Fix:** bound the shape, and clamp against the listing inside the transaction that already reads it:

```ts
// validation/booking.ts
declaredPax: z.coerce.number().int().min(1).max(10_000).optional(),
```

```ts
// units.ts — add maxOccupancy to the in-tx listing select, then:
const { unitCount, hourlyRateCents, dayRateCents, included, extraHeadFee,
        maxOccupancy, leadOk } = listingRows[0];

// The cap is the LISTING's, applied server-side — mirrors updateDeclaredPax (Security V4).
const cap = maxOccupancy != null && maxOccupancy > 0 ? maxOccupancy : 1;
const declaredPax =
  input.declaredPax == null ? undefined : Math.min(Math.max(1, input.declaredPax), cap);

const quote = quoteWindow({ …, declaredPax });
const declaredPaxToPersist = (extraHeadFee ?? 0) > 0 ? (declaredPax ?? null) : null;
```

---

### CR-04: Unauthenticated, unbounded growth of the in-memory rate-limit map keyed on attacker-chosen tokens

**Severity:** BLOCKER
**File:** `src/app/actions/group.ts:313-314,326` · `src/lib/rate-limit.ts:29,37-56`

**Issue:**
`submitRsvp` is the first server action in the app reachable with **no session**. It rate-limits on
the raw token *before* the token is resolved against the database:

```ts
// group.ts:313-314 — SHAPE check only, never an existence check
const parsedToken = inviteTokenSchema.safeParse(token);
if (!parsedToken.success) return { ok: false, error: INVITE_INACTIVE };
…
// group.ts:326 — the key is an unauthenticated, caller-chosen string
const linkBudget = rateLimit(`rsvp:${parsedToken.data}`, RSVP_RATE_LIMIT);
…
// group.ts:333 — the group is only resolved AFTER the bucket has been created
const group = await getGroupByToken(db, parsedToken.data);
```

`rateLimit` stores every key in a module-level `Map` that is **never evicted** — entries are
overwritten on a repeat hit but nothing ever deletes them (`rate-limit.ts:29`, `:43-46`). Every
previous caller keyed on an authenticated `userId`, so the key space was bounded by the user table.
Here it is `32^20` attacker-selectable values.

An unauthenticated attacker sending distinct well-formed tokens (`/^[0-9A-HJKMNP-TV-Z]{20}$/`) adds a
permanent ~150-200 byte `Map` entry per request, with no session, no group, and no DB row to show for
it. On the container host CLAUDE.md prescribes this is a straight memory-exhaustion DoS against the
whole app — and it takes the booking path down with it, which is the core value.

`guest-email:${guestEmailNorm}` (`group.ts:407`) has the same unbounded-key shape, gated behind a
valid token.

**Fix:** two changes, both small.

1. Key the link budget on the **resolved** group id, so the key space is bounded by real groups, and
   put a coarse pre-resolution budget in front:

```ts
// group.ts — resolve first, then budget on a bounded key
const group = await getGroupByToken(db, parsedToken.data);
if (!group.active) return { ok: false, error: INVITE_INACTIVE };
if (group.rsvpClosed) return { ok: false, error: RSVP_CLOSED };

const linkBudget = rateLimit(`rsvp:${group.groupId}`, RSVP_RATE_LIMIT);
if (!linkBudget.ok) return { ok: false, error: TOO_FAST };
```
   (Resolving first costs one indexed lookup and leaks nothing: unknown and voided already return the
   same `INVITE_INACTIVE` sentence.)

2. Bound the store itself so no future caller can reintroduce this:

```ts
// rate-limit.ts
const MAX_BUCKETS = 50_000;

function sweepExpired(now: number): void {
  for (const [k, b] of buckets) if (now >= b.resetAt) buckets.delete(k);
}

export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  if (buckets.size > MAX_BUCKETS) sweepExpired(now);
  // …unchanged
}
```

---

## Warnings

### WR-01: The group-cancellation email links attendees to an invite the same function just killed

**Severity:** WARNING
**File:** `src/app/actions/cancel-booking.ts:355-369` · `src/lib/group/rsvp.ts:156` ·
`src/app/invite/[token]/page.tsx:71-72`

**Issue:** `voidGroupAndNotifyAttendees` voids the group and *then* composes the fan-out CTA from the
token it just invalidated:

```ts
// cancel-booking.ts:356-360
UPDATE booking_group SET voided_at = now() WHERE booking_id = … AND voided_at IS NULL
…
// cancel-booking.ts:369
const href = `${appBaseUrl()}/invite/${group.accessToken}`;
```

`getGroupByToken` filters `g.voided_at IS NULL` (`rsvp.ts:156`), so that URL is **guaranteed** to
render the inactive state. Every reachable "yes" attendee receives "The booking … is no longer
happening — you don't need to go. **[View the details]**", and the link says *"This invite is no
longer active — Ask the organizer for the latest link."* (`invite/[token]/page.tsx:71-72`). That is
the opposite instruction: it tells someone who was just told not to come that they need a fresh link
to come.

**Fix:** send attendees somewhere that still resolves, or send no CTA. The cheapest correct option is
to drop the link for the cancellation kind and let the copy stand alone; alternatively point account
attendees at their own `/bookings` and give guests a bare listing URL:

```ts
const href = `${appBaseUrl()}/listings/${row.listingId}`; // a page that still exists
```

### WR-02: "We've emailed you a copy" is shown when no email was sent

**Severity:** WARNING
**File:** `src/app/actions/group.ts:357,407-424,429-433` ·
`src/components/group/rsvp-confirmation.tsx:59-63`

**Issue:** `reachable` is computed *before* any send is attempted and never reflects whether one
happened:

```ts
// group.ts:357
const reachable = userId != null || guestEmailNorm != null;
```

The guest send is then conditional on a budget that can refuse it:

```ts
// group.ts:407-424
const emailBudget = rateLimit(`guest-email:${guestEmailNorm}`, GUEST_EMAIL_RATE_LIMIT);
if (emailBudget.ok) { await emitGuestEmail({…}); }
else { await recordAudit({ …, action: "guest_email_suppressed" }); }
```

and the whole block sits inside a `try { … } catch {}` (`group.ts:358`, `:429`) that can skip the
attendee send entirely if the earlier organizer emit throws. Meanwhile the confirmation renders:

```tsx
// rsvp-confirmation.tsx:61
{answer === "yes" ? "We've emailed you a copy. " : ""}
```

A guest who changes their answer a fourth time in an hour is told an email was sent that the server
deliberately suppressed — and is also promised "You can change your answer any time", which their
suppressed budget currently prevents them from confirming.

**Fix:** report what actually happened rather than what was possible. Return the send outcome and
gate the sentence on it:

```ts
// group.ts
let emailed = false;
…
if (emailBudget.ok) { await emitGuestEmail({…}); emailed = true; }
…
return { ok: true, status: claim.status, reachable, emailed };
```
```tsx
// rsvp-confirmation.tsx — `emailed`, not `reachable`, gates the claim
{emailed ? "We've emailed you a copy. " : ""}
```

### WR-03: The seat cap excludes the organizer, so a group can seat `maxOccupancy + 1` people

**Severity:** WARNING
**File:** `src/app/actions/group.ts:242` · `src/lib/group/seat-claim.ts:80` ·
`src/components/group/attendee-roster.tsx:33-35,96-108` ·
`src/components/booking/pax-stepper.tsx:125`

**Issue:** `capacity_snapshot` is the listing's raw `max_occupancy`:

```sql
-- group.ts:242
SELECT ${groupId}, b.id, l.max_occupancy, ${accessToken}
```

and the claim admits that many **RSVP rows**:

```ts
// seat-claim.ts:80
if (args.answer === "yes" && !alreadyYes && yes >= g.capacity_snapshot) return { ok:false, reason:"full" };
```

But the organizer is defined as an attendee who is *not* an RSVP row — `attendee-roster.tsx:33-35`
states it outright: *"THE ORGANIZER ROW IS NOT COUNTED HERE, AND MUST NOT BE"*, and row #1 is a
hand-written display fixture (`:96-105`). The pricing side uses the opposite convention:
`pax-stepper.tsx:125` renders *"This includes you. Up to {maxOccupancy}."*

Net effect: on a `maxOccupancy = 12` listing, 12 attendees can say yes and the organizer makes 13
people in a space the host rated for 12.

The mirror-image defect is also live: `submitRsvp` explicitly supports the organizer RSVPing to their
own link (`group.ts:365`, and `tests/group/group-lifecycle.test.ts:589-601` pins it). When they do,
`getRoster` returns their row and `AttendeeRoster` renders it *underneath* the "You" fixture — the
same person listed twice on the surface whose entire job is an accurate headcount.

**Fix:** pick one convention and enforce it in both places. Since D-113 says the organizer is
attendee #1 and the base rate already covers them, the snapshot should reserve their seat:

```sql
-- group.ts — the organizer occupies one of the listing's places (D-113)
SELECT ${groupId}, b.id, GREATEST(l.max_occupancy - 1, 0), ${accessToken}
```
and exclude the organizer's own row from the roster so they cannot be rendered twice:

```sql
-- rsvp.ts:getRoster
WHERE r.group_id = ${args.groupId}
  AND b.booker_id = ${args.organizerId}
  AND (r.user_id IS NULL OR r.user_id <> b.booker_id)
```

### WR-04: The D-114 over-RSVP nudge is off by one and never fires at the first over-subscription

**Severity:** WARNING
**File:** `src/components/group/top-up-nudge.tsx:60-62` · `src/lib/group/rsvp.ts:408`

**Issue:** the two numbers compared use different bases. `declaredPax` **includes** the organizer
(`pax-stepper.tsx:125`, "This includes you"); `confirmedYes` is `count(*) … WHERE status='yes'`
(`rsvp.ts:408`), which **excludes** them unless they happened to RSVP:

```tsx
// top-up-nudge.tsx:60-62
if (declaredPax == null || confirmedYes <= declaredPax) return null;
const extra = confirmedYes - declaredPax;
```

With `declaredPax = 3` (organizer + 2 friends) and 3 friends saying yes, actual attendance is 4
against a booking quoted for 3 — but `3 <= 3`, so the nudge stays silent on exactly the first case it
exists to catch. Once it does fire, `extra` understates the gap by one, so the organizer is told they
may owe for fewer heads than they will.

**Fix:** compare like with like at the call site, and pass the organizer-inclusive figure:

```tsx
// bookings/[id]/group/page.tsx — the organizer is attendee #1 (D-113)
<TopUpNudge
  confirmedYes={counts.confirmed + 1}
  declaredPax={group.declaredPax}
  extraHeadFee={group.extraHeadFee}
/>
```
(and rename the prop to `attendingTotal` so the base is stated rather than inferred). Note this must
be resolved consistently with WR-03 — the two findings share one convention.

### WR-05: Any link holder can have FitOut email an arbitrary third-party address

**Severity:** WARNING
**File:** `src/app/actions/group.ts:401-415` · `tests/group/guest-email-guard.test.ts:219-235`

**Issue:** the D-117 guard is "only an address submitted on **this request**" — which is not the same
property as "only an address whose owner opted in". Nothing proves the submitter controls the
address:

```ts
// group.ts:401-415
} else if (guestEmailNorm) {
  const emailBudget = rateLimit(`guest-email:${guestEmailNorm}`, GUEST_EMAIL_RATE_LIMIT);
  if (emailBudget.ok) { await emitGuestEmail({ to: guestEmailNorm, kind: "rsvp_confirmed", … }); }
```

The test suite demonstrates the behaviour directly: five distinct never-verified addresses
(`gina@`, `carl@`, `mia@`, `rita@`, `dana@`) each receive a "You're on the list" email from the
platform domain purely because a string was typed into a public form
(`guest-email-guard.test.ts:219-260`).

The per-address budget (3/hour) bounds repeats to *one* inbox but does not bound total volume: the
per-link budget is 30/60s (`group.ts:119`), and `removeAttendee` (20/60s, `group.ts:113`) lets an
organizer recycle seats indefinitely. An actor who creates their own group holds an unlimited supply
of links. That is enough unsolicited mail from a shared sending domain to damage the deliverability
every booking confirmation depends on.

**Fix:** cheapest meaningful control is a global send budget alongside the per-address one, plus
per-group distinct-address accounting, so one link cannot address an unbounded set of inboxes:

```ts
const GUEST_EMAIL_GROUP_LIMIT = { window: 3600, max: 25 } as const; // ~ one group's worth per hour
…
const perAddress = rateLimit(`guest-email:${guestEmailNorm}`, GUEST_EMAIL_RATE_LIMIT);
const perGroup   = rateLimit(`guest-email-group:${group.groupId}`, GUEST_EMAIL_GROUP_LIMIT);
if (perAddress.ok && perGroup.ok) { await emitGuestEmail({…}); }
```
Longer term the honest fix is a one-click unsubscribe/`List-Unsubscribe` header on the guest send,
since the recipient never consented to anything.

### WR-06: The public, session-less token read returns the organizer's email address

**Severity:** WARNING
**File:** `src/lib/group/rsvp.ts:69-70,154,172-174` · `src/app/invite/[token]/page.tsx:112`

**Issue:** `getGroupByToken` is the resolver for the app's one unauthenticated page, and it joins the
organizer's user row to select their address:

```sql
-- rsvp.ts:154
JOIN "user" u ON u.id = b.booker_id
…
u.email AS "organizerEmail",
```

It is returned on the `GroupByToken` view (`:69-70`) that the public RSC holds
(`invite/[token]/page.tsx:112`). Today nothing spreads that object into a client component, so
nothing leaks — but the same file's own privacy header argues (correctly, at `rsvp.ts:25-28`) that
the roster returns `hasEmail: boolean` *specifically* so an address is never carried on a surface
that has no use for it. The invite page never reads `organizerEmail`, `organizerId` or `bookingId`;
only `submitRsvp` does. One `<Component {...group} />` puts a real person's address into the RSC
payload of a page any stranger can open.

**Fix:** split the read so the public page cannot hold what it does not need:

```ts
/** The PUBLIC projection — no addresses, no ids the page does not render. */
export type GroupByTokenPublic = Omit<
  Extract<GroupByToken, { active: true }>, "organizerEmail" | "organizerId" | "bookingId"
> | { active: false };

export async function getGroupByTokenPublic(dbConn: DbConn, token: string): Promise<GroupByTokenPublic>;
```
and keep the full projection private to `submitRsvp`.

### WR-07: The invite token is copied into `/login`'s query string, which carries no referrer policy

**Severity:** WARNING
**File:** `src/app/invite/[token]/page.tsx:22-25,186` · `src/app/(auth)/login/page.tsx`

**Issue:** the page header claims the token *"cannot ride out in a `Referer` header on any navigation
away from this page"* (`:24-25`) on the strength of `referrer: "no-referrer"` (`:63`). But the
"Log in instead" affordance hands the token to a *different* page:

```ts
// invite/[token]/page.tsx:186
const loginHref = `/login?callbackURL=${encodeURIComponent(`/invite/${group.accessToken}`)}`;
```

`/login` is the only remaining consumer, and it sets no metadata and no referrer policy at all (grep
for `referrer` across `src/app` returns only the invite page). It also renders a "Continue with
Google" control that performs a cross-origin navigation. Modern browsers default to
`strict-origin-when-cross-origin`, which happens to strip the query string — so the claim survives on
a browser default rather than on anything this codebase asserts. A webview or configuration with a
laxer default sends `https://…/login?callbackURL=%2Finvite%2F{TOKEN}` to the identity provider, and
the token also lands in `/login`'s history entry and any access log that records query strings.

**Fix:** state the policy where the credential goes, rather than relying on a default:

```ts
// src/app/(auth)/login/layout.tsx (or convert login/page.tsx to a server shell)
export const metadata: Metadata = { referrer: "no-referrer" };
```
Better still, keep the token out of a query string entirely — set a short-lived HttpOnly
`invite_return` cookie on the invite page and have the login flow read it back.

### WR-08: A vacuous assertion and a stale capture hide a real gap in the guest-email guard test

**Severity:** WARNING
**File:** `tests/group/guest-email-guard.test.ts:314-323`

**Issue:**

```ts
const received = notifies("group_rsvp_received");   // captured BEFORE mockClear()
inngestSend.mockClear();
await submitRsvp(TOKEN_ACCOUNT, { name: "Totally Someone Else", answer: "no" });
const payload = notifies("group_rsvp_received")[0].data.payload as { attendeeLabel: string };
expect(payload.attendeeLabel).toBe("Ada Account");
expect(received.length).toBeGreaterThanOrEqual(0); // fixture sanity, no assertion on the earlier batch
```

`expect(x.length).toBeGreaterThanOrEqual(0)` is a tautology — an array length is never negative, so
this line passes for every possible implementation. `received` is read from the mock *before*
`mockClear()` and is then never meaningfully used, so the two lines together are dead weight that
reads like coverage. The one assertion that matters (the account name overrides the client-supplied
one) is fine.

**Fix:** delete both lines, or make the earlier batch a real assertion:

```ts
inngestSend.mockClear();
await submitRsvp(TOKEN_ACCOUNT, { name: "Totally Someone Else", answer: "no" });
const received = notifies("group_rsvp_received");
expect(received).toHaveLength(1);
expect((received[0].data.payload as { attendeeLabel: string }).attendeeLabel).toBe("Ada Account");
```

### WR-09: A published listing's `max_occupancy` can be autosaved to 0 or negative, and it flows into `capacity_snapshot`

**Severity:** WARNING
**File:** `src/lib/validation/listing.ts:44` · `src/app/actions/listing.ts:136` ·
`src/app/actions/group.ts:227-235,248-252` · `src/components/booking/pax-stepper.tsx:59`

**Issue:** `draftSchema` has no positivity bound (`publishSchema` does, but `saveListingStep` never
re-runs it):

```ts
// validation/listing.ts:44
maxOccupancy: z.number().int().optional(),   // 0 and -5 are accepted
// actions/listing.ts:136 — written to a PUBLISHED listing with no re-gate
maxOccupancy: d.maxOccupancy,
```

Phase 8 gives that column two new consumers. `createGroup` guards it in the **pre-read**
(`group.ts:227-235`, `maxOccupancy == null || < 1` → denied) but the INSERT that actually freezes the
snapshot only requires non-null:

```sql
-- group.ts:248-252
WHERE b.id = … AND b.booker_id = … AND b.status = 'confirmed'
  AND l.max_occupancy IS NOT NULL
```

A host edit landing between the two writes `capacity_snapshot = 0`, which is immutable (D-111) and
produces a group nobody can ever join, with no error path. Independently, `PaxStepper` clamps against
the same value (`pax-stepper.tsx:59`, `Math.min(Math.max(1, next), maxOccupancy)`), so a `0` cap
yields `clamped = 0`, which `declaredPaxSchema.min(1)` then rejects with "That headcount doesn't look
right" — a dead control with a misleading message.

**Fix:** both ends.

```ts
// validation/listing.ts — a capacity is a count, at every save
maxOccupancy: z.number().int().positive().optional(),
```
```sql
-- group.ts — the snapshot guard belongs in the write, not only in the pre-read
AND l.max_occupancy IS NOT NULL AND l.max_occupancy >= 1
```

### WR-10: The bearer invite token is written into a durable notification row and an email body

**Severity:** WARNING
**File:** `src/app/actions/group.ts:386-400` · `src/lib/notifications.ts:81-95` ·
`src/lib/email.ts:468-484`

**Issue:** the phase is scrupulous about the token everywhere else — `createGroup`'s audit meta
deliberately omits it (`group.ts:280`), `regenerateLink`'s audit omits both tokens (`:574`),
`ShareLinkBox` and `RsvpForm` carry no logger at all. Then the account attendee's confirmation puts
it in a durable database row and an outbound email:

```ts
// group.ts:398
href: inviteUrl(group.accessToken),
```

`insertNotification` persists that `href` verbatim into `notification.payload` jsonb
(`notifications.ts:87-93`), and `sendGroupRsvpConfirmed` renders it into an `<a href>`
(`email.ts:476-482`). Two consequences:

1. `regenerateLink` rotates the credential precisely because it leaked — but the copy in
   `notification.payload` is outside that rotation's reach and is never revisited, so the
   notification panel keeps a permanently dead link the D-92 renderer will happily present as live.
2. A shared group credential now exists in a table that has no retention policy and in a mail
   provider's stored message body, which is the exposure surface the token discipline elsewhere is
   built to avoid.

**Fix:** link account attendees at a surface that resolves from their own session rather than from a
bearer token:

```ts
// group.ts — an account attendee has an identity; they do not need the shared credential
href: `${base}/bookings/${group.bookingId}`,   // owner/attendee-gated, survives a rotation
```
If the invite page must remain the destination for attendees, add a per-rsvp `manage_token` (the
column already exists, `schema.ts:822`) so what is persisted is a single-attendee credential the
organizer's rotation can also revoke — not the group-wide one.

---

_Reviewed: 2026-07-28T03:04:48Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
