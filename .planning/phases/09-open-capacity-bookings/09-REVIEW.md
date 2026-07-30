---
phase: 09-open-capacity-bookings
reviewed: 2026-07-30T18:16:40Z
depth: standard
files_reviewed: 41
files_reviewed_list:
  - src/lib/availability/units.ts
  - src/lib/availability/open-capacity.ts
  - src/lib/availability/read-model.ts
  - src/lib/booking/pricing.ts
  - src/lib/booking/when-label.ts
  - src/lib/booking/bookings-query.ts
  - src/lib/booking/all-in-rate.ts
  - src/lib/listing/mode-lock.ts
  - src/lib/search/query.ts
  - src/lib/validation/booking.ts
  - src/lib/validation/listing.ts
  - src/lib/group/rsvp.ts
  - src/lib/db/schema.ts
  - src/app/actions/booking.ts
  - src/app/actions/cancel-booking.ts
  - src/app/actions/listing.ts
  - src/app/actions/availability.ts
  - src/app/actions/group.ts
  - src/app/actions/operating-hours.ts
  - src/app/api/paymongo/webhook/route.ts
  - src/app/listings/[id]/book/page.tsx
  - src/app/listings/[id]/page.tsx
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(app)/bookings/[id]/cancel/page.tsx
  - src/app/(app)/bookings/[id]/group/page.tsx
  - src/app/(host)/host/listings/[id]/availability/page.tsx
  - src/app/(host)/host/listings/[id]/edit/wizard.tsx
  - src/inngest/functions/reminders.ts
  - src/inngest/functions/request-expiry.ts
  - src/components/availability/availability-calendar.tsx
  - src/components/availability/date-pass-picker.tsx
  - src/components/availability/spots-left-chip.tsx
  - src/components/booking/book-cta.tsx
  - src/components/booking/pass-stepper.tsx
  - src/components/booking/stepper-control.tsx
  - src/components/booking/partial-grant-notice.tsx
  - src/components/booking/cancellation-policy-disclosure.tsx
  - src/components/booking/reserve-view.tsx
  - drizzle/0020_open_capacity_enum.sql
  - drizzle/0021_open_capacity_columns.sql
  - drizzle/0022_booking_exclusion_v3.sql
  - e2e/open-capacity.spec.ts
  - tests/availability/open-capacity-race.test.ts
findings:
  critical: 6
  warning: 5
  info: 3
  total: 14
status: issues_found
---

# Phase 9: Code Review Report

**Reviewed:** 2026-07-30T18:16:40Z
**Depth:** standard
**Files Reviewed:** 41 (of 74 in scope — see "Where I went deep vs. skimmed")
**Status:** issues_found

## Summary

The admissions claim itself is the strongest part of this phase. `createOpenCapacityHold` takes
`pg_advisory_xact_lock` as its literal first statement, sweeps lapsed holds and SUMs heads *inside* the
lock, reads cap/rate/tier/clock in one in-transaction statement, and freezes money for the **granted**
heads only. `openTakenSql` is genuinely shared with the read model, `booking.open_capacity` is projected in
every raw SQL site I checked (`bookings-query.ts` ×2, `reminders.ts`), both mutations refuse the other
occupancy mode from the persisted listing row, `updateDeclaredPax` refuses open rows before the flat-listing
short-circuit, and host-cancel correctly skips the `availability_block`. I attacked the counter (lock scope,
counted set, reads outside the lock, replay, webhook confirm-after-lapse) and could not break it *on the
inputs it was designed for*.

Every defect I found is at a **seam** — where the new date-shaped booking meets machinery that was written
for window-shaped bookings, and where the counter's key (derived from mutable operating hours) meets code
that can change it.

The six blockers, shortest first:

1. **A same-day drop-in pass can be held but never paid for.** `confirmBooking` still refuses once
   `starts_at <= now()`, and a pass's `starts_at` is the venue's *opening* instant. The claim and the
   calendar both explicitly allow today. The walk-in case — the headline use of a drop-in pass — dead-ends
   at "Confirm & pay".
2. **Host "Blocked dates" do nothing on a drop-in listing.** `getOpenDay` never reads `availability_block`
   and neither does the claim, while the host page still renders the Blocked-dates editor and 09-UI-SPEC
   § 1g states "blocks still zero a date". A host closes a date; passes keep selling.
3. **Editing operating hours re-keys the admissions counter**, orphaning every existing pass on affected
   dates and letting up to a second full cap be sold for the same day.
4. **A published listing can go live in drop-in mode with no per-person price**, because the wizard's
   occupancy step precedes pricing and `saveListingStep` writes to a published row with no publish re-gate.
   The resulting booker click raises an uncaught `Error` (raw 500), not a calm refusal.
5. **`createGroup` has no occupancy-mode guard**, so the "groups are exclusive by construction" premise that
   four files hard-code `openCapacity: false` on is unenforced.
6. **A booker cannot buy a second set of passes for a date they already hold**, silently — which is exactly
   what the app's own copy tells them to do.

The five warnings are smaller: an unscoped idempotency-key match, a split-shift envelope bug, an
unvalidated env threshold, an int4 overflow claim the schema comment does not actually deliver, and the
cancellation start-guard's twin of blocker 1.

**Acknowledged, not re-reported** (recorded as accepted by the operator): the cap-3 `lowStockThreshold`
invisibility, the host tile's `/hr`-beside-per-person asymmetry, and `?date=` not seeding the picked date.

---

## Critical Issues

### CR-01: A same-day drop-in pass can be held but can never be paid for

**File:** `src/app/actions/booking.ts:721-729` (with `src/lib/availability/units.ts:731-741`, `:812` and
`src/lib/availability/read-model.ts:369`)

**Issue:** `createOpenCapacityHold` deliberately diverges from D-94 and caps the hold at **ends_at**, with a
long comment explaining exactly why: a pass's `starts_at` is the venue's *opening* instant, so capping at
`starts_at` "would be ALREADY IN THE PAST for any same-day claim made after opening". Its own date guard is
`day_open_ok = (dayClose > now())`, and the read model agrees (`bookable = dayCloseUtc > now`). Same-day
drop-in is therefore an explicitly supported, advertised path.

`confirmBooking` never got the same divergence:

```ts
if (bk.startsAt.getTime() <= nowFromDb.getTime()) {
  return { ok: false, reason: "expired",
    error: "This session has already started, so it can't be paid for now. Check availability again." };
}
```

`bk.startsAt` for an open row is the opening instant.

**Failure scenario (no crafting, shipped UI):** Venue open 06:00–22:00 Manila. At 15:00 a booker opens the
listing, picks **today** (the calendar offers it — `dayClose > now`), picks 1 pass, clicks *Book this space*.
`placeOpenHold` succeeds; a `pending` row is minted with `starts_at = today 06:00`, `expires_at = now+15min`.
They land on the reserve page, see the correct total, and press **Confirm & pay** → `confirmBooking` returns
`reason: "expired"` → `ReserveView.handleResult` flips the whole page to `HoldExpiredState` ("your hold
expired"), seconds after it was created. Retrying reproduces it forever. The booker cannot buy a pass for
today at any time after opening; the hold silently occupies a spot for 15 minutes each attempt.

Neither the e2e spec (which books `offset >= 3` days out, `e2e/open-capacity.spec.ts:109-114`) nor any unit
test drives `confirmBooking` with an open row, so nothing catches it.

**Fix:** Fork the guard on the persisted mode, exactly as the claim forked the expiry cap. Read
`booking.open_capacity` in the same select and compare against the correct end of the session:

```ts
const [bk] = await db.select({ /* … */ openCapacity: booking.openCapacity, endsAt: booking.endsAt, /* … */ })
// …
// D-94: an exclusive booking may not be paid for after it starts; a drop-in pass's session runs until the
// venue CLOSES (OC-03), which is the same divergence createOpenCapacityHold applies to expires_at.
const cutoff = bk.openCapacity ? bk.endsAt : bk.startsAt;
if (cutoff.getTime() <= nowFromDb.getTime()) {
  return { ok: false, reason: "expired", error: bk.openCapacity
    ? "This day's passes are no longer available. Check availability again."
    : "This session has already started, so it can't be paid for now. Check availability again." };
}
```

Add a test that mints an open hold for **today** with an opening instant in the past and asserts
`confirmBooking` reaches checkout.

---

### CR-02: Host "Blocked dates" have no effect whatsoever on a drop-in listing

**File:** `src/lib/availability/read-model.ts:323-386` (and `:213-240`, `src/lib/availability/units.ts:790-828`,
`src/app/(host)/host/listings/[id]/availability/page.tsx:130-139`)

**Issue:** `availability_block` is read in exactly one place in the codebase — `read-model.ts:220-224` —
which sits *after* the Phase-9 fork at `read-model.ts:196`:

```ts
if (lr.occupancyMode === "open_capacity") {
  return getOpenDay(dbConn, listingId, dayLocal, lr, now);   // ← blocks are never queried below this line
}
```

`getOpenDay` computes `remaining = cap − openTakenSql(...)` and nothing else; `getOpenMonthAvailability`
likewise; `createOpenCapacityHold` reads only `listing` + the heads SUM. Meanwhile the host availability
page renders the `BlocksEditor` **unchanged** for a drop-in listing, under the heading "Blocked dates" and
the page subtitle "block off any dates you can't host". 09-UI-SPEC § 1g states the page is unchanged for
open listings because "operating hours still define the OC-03 entry window; **blocks still zero a date**" —
so this is an implementation gap against the spec, not a recorded deferral.

**Failure scenario:** A gym host is closed for a public holiday. They open
`/host/listings/{id}/availability`, add a whole-day block for that date, see it listed, and stop worrying.
The public calendar keeps showing `Spots available` for the date, search keeps returning the listing for it,
and `createOpenCapacityHold` keeps granting and charging passes. The host either honours a day they closed
or cancels every pass and pays the D-71 host-cancel fee on each one. This is precisely the
"stale-availability is an unacceptable failure mode" case CLAUDE.md names.

**Fix:** Teach the open path the same block semantics the exclusive path has. In `getOpenDay`, before
computing `remaining`, check for any block overlapping `[dayOpenUtc, dayCloseUtc)` on the listing (whole-
listing `unit IS NULL` or the sentinel `unit = 1`) and force `remaining = 0` / `state = "full"` /
`bookable = false`; return the same "closed" panel state the calendar already renders. Enforce it
**server-side in the claim too** (the picker is never the gate) — add to `createOpenCapacityHold`'s single
cap/rate statement:

```sql
NOT EXISTS (SELECT 1 FROM availability_block ab
            WHERE ab.listing_id = l.id
              AND (ab.unit IS NULL OR ab.unit = 1)
              AND tstzrange(ab.starts_at, ab.ends_at, '[)')
                  && tstzrange(${openIso}::timestamptz, ${closeIso}::timestamptz, '[)')) AS not_blocked
```

and refuse with a calm date-unavailable message when false. If blocking a drop-in date is genuinely out of
scope for v1, the editor must be hidden (or hard-disabled with an explanation) on open listings instead —
silently accepting a block that does nothing is the worst of the three options.

---

### CR-03: Editing operating hours re-keys the admissions counter — up to 2× cap can be sold for one date

**File:** `src/lib/availability/open-capacity.ts:74-80` and `:144-172`, with
`src/lib/availability/units.ts:761-762`, `:780-784`, `:794` and `src/app/actions/operating-hours.ts:79-95`

**Issue:** The counter's identity for a date is the venue's **opening instant**, derived at request time from
the listing's *current* operating hours:

* lock key: `hashtextextended(listing_id || ':' || openIso, 0)` (`units.ts:761-762`)
* counted set: `b.starts_at = ${dayOpenIso}::timestamptz` (`open-capacity.ts:78`)
* sweep scope: `starts_at = ${openIso}` (`units.ts:784`)
* month grid: `GROUP BY b.starts_at` (`read-model.ts:429-438`)

`saveOperatingHours` (`operating-hours.ts:81-84`) deletes and reinserts every window for a listing with no
awareness of live bookings, and `getModeLockState` only guards a change of `occupancy_mode` — not hours.
Existing open bookings keep the `starts_at` they were minted with.

**Failure scenario (inputs → wrong outcome):** Listing cap = 20, hours Mon 06:00–22:00. Ten bookers buy
passes for next Monday → ten rows with `starts_at = Mon 06:00`. The host then changes Monday's opening time
to 07:00 (a routine edit — new class schedule).

* `loadOpenDayWindow` now returns `dayOpenUtc = Mon 07:00`.
* `openTakenSql(listing, Mon 07:00)` matches **zero** rows → `remaining = 20 − 0 = 20`.
* The public calendar advertises the full cap; search returns the date; the day panel shows
  `Spots available`.
* `createOpenCapacityHold` takes a **different advisory lock key** and grants up to 20 more passes.
* Net: **30 paid admissions on a 20-person day**, with no constraint violation, no error, and nothing in
  the month grid showing the date as full (the two `starts_at` groups are each compared against `cap`
  separately, `read-model.ts:441`).

The exclusive path is immune to this class because the GiST EXCLUDE keys on the booking's own stored range,
not on a value re-derived from mutable host config. Phase 9 introduced the derived key without a
corresponding guard.

**Fix:** Two layers, both cheap:

1. **Anchor the counter on stored data, not re-derived data.** Count by *venue-local date* rather than by
   the exact opening instant, e.g. add a generated/stored `open_date date` on open bookings (or compare
   `(b.starts_at AT TIME ZONE l.timezone)::date = ${pickedIso}::date`) and key the advisory lock on
   `listing_id || ':' || pickedIso`. Then an hours edit changes what a pass *covers*, never which pass rows
   count.
2. **Guard the edit** the way OC-17 guards the mode: in `saveOperatingHours`, if the listing is
   `open_capacity` and `getModeLockState()` reports live bookings, refuse a change to any weekday that has
   upcoming open bookings (with an "you can change these after {date}" message, reusing `ModeLockNotice`).

Until one of these lands, treat every hours edit on a live drop-in listing as an overbooking event.

---

### CR-04: A published listing can be switched to drop-in mode with no per-person price — the booker gets a raw 500

**File:** `src/app/actions/listing.ts:156-205` (with
`src/app/(host)/host/listings/[id]/edit/wizard.tsx:143-162`, `:397-417`, `src/lib/booking/pricing.ts:163-169`,
`src/lib/availability/units.ts:834`, `:893-897`)

**Issue:** `publishSchema`'s open branch correctly requires `per_head_price_cents`, `maxOccupancy`,
`bookingMode === "instant"` and `unitCount === 1`. But `saveListingStep` writes `occupancyMode` (and every
other field) straight to the live row and **never re-runs `publishSchema`** for a `published` listing — the
only edit-path re-gate that exists is the HG-01 surcharge-reachability check at `listing.ts:133-144`, which
was added for exactly this reason and was not extended to the Phase-9 fields. The mode lock only fires when
bookings are still ahead (`listing.ts:156-165`), so any published listing with a clear calendar can be
switched instantly.

The wizard makes this the *normal* path, not an edge case: `STEPS` puts `occupancy` **before** `pricing`
(`wizard.tsx:153-155`), and `saveAndContinue` persists the whole form on every step (`wizard.tsx:397-417`).

**Failure scenario:** A host with a published, bookable gym opens the editor, reaches "How do you want people
to use your space?", picks **Drop-in passes**, and clicks *Save and continue*. The listing is now
`status = 'published'`, `occupancy_mode = 'open_capacity'`, `per_head_price_cents = NULL` (they set the price
on the *next* screen), and still bookable. During that window:

* The listing page renders `DatePassPicker` and advertises `remaining = max_occupancy` spots per date;
  `allInRateParts` returns `[]` so no price is shown at all.
* A booker picks a date and clicks *Book this space* → `createOpenCapacityHold` reaches
  `quoteOpenCapacity({ perHeadPriceCents: null })` which **throws** →
  `mapBookingError` re-throws anything that is not `NoUnitAvailableError`/23P01/40P01 → the exception escapes
  `placeOpenHold` → an unhandled server-action error (Next.js error digest / 500), not a calm
  `PlaceHoldResult`. That is the exact `T-03-500` outcome `mapBookingError`'s own docblock promises never
  happens.

The same bypass also lets a `request`-mode, `unitCount = 3` listing become `open_capacity` (both are publish
requirements that the edit path does not re-impose); neither `placeOpenHold` nor the claim re-checks them.

**Fix:** Two parts.

1. **Gate the edit.** In `saveListingStep`, extend the existing published-row guard to the mode fork —
   compute the effective post-save values (incoming `??` persisted, the HG-01 idiom) and refuse a save that
   would leave a **published** listing in `open_capacity` without a positive `perHeadPriceCents`, or with
   `bookingMode !== 'instant'` / `unitCount !== 1`, reusing the exported constants
   (`PER_HEAD_PRICE_REQUIRED_MESSAGE`, `DROP_IN_INSTANT_ONLY_MESSAGE`, `DROP_IN_SINGLE_SPACE_MESSAGE`) so
   there is still exactly one copy of each sentence. (Draft rows stay permissive — `publishListing` catches
   them.)
2. **Fail closed, not loudly, at the claim.** In `createOpenCapacityHold`, treat a NULL `per_head` the way a
   NULL `cap` is already treated — a calm refusal rather than a throw:

```ts
if (perHead == null || perHead <= 0) return { error: SOLD_OUT_MESSAGE, soldOut: true }; // or a "not bookable" message
```

   Add an integration case: published open listing with `per_head_price_cents = NULL` → `placeOpenHold`
   returns a structured `{ ok: false }`, never rejects.

---

### CR-05: `createGroup` never checks occupancy mode — the "groups are exclusive by construction" premise is unenforced

**File:** `src/app/actions/group.ts:226-299` (premise asserted at `group.ts:186-188`,
`src/app/(app)/bookings/[id]/group/page.tsx:116-118`, `src/lib/group/rsvp.ts:87-91`,
`src/app/invite/[token]/page.tsx:152`, `src/app/(app)/bookings/[id]/page.tsx:549-556`)

**Issue:** Four files hard-code `openCapacity: false` into `composeWhenLabel` on the strength of "a group can
only ever be created on an exclusive booking (D-110)". The only thing implementing that rule is a **UI
condition** on the booking detail page (`groupEligible = … && lst.occupancyMode === "exclusive"`), whose own
comment claims the server re-checks:

> "ALL THREE ARE COURTESIES. `createGroup` re-checks ownership and confirmation server-side before it writes
> anything, so a hand-crafted POST that skipped this UI gains nothing (Security V4)."

`createGroup`'s gate (`group.ts:236-243`) and its defence-in-depth INSERT predicate (`:292-296`) check
`booker_id`, `status = 'confirmed'` and `max_occupancy >= 2`. **Neither checks `occupancy_mode`.** So the
quoted sentence is false for one of the three conditions, and it is the one this phase added.

**Failure scenario:** Booker buys **one** drop-in pass on a gym with `max_occupancy = 30` and pays. They
invoke `createGroup(bookingId)` directly (a server action POST — the threat model this codebase explicitly
defends against everywhere else). The insert succeeds with
`capacity_snapshot = GREATEST(max_occupancy − 1, 0) = 29` — the **daily admissions cap**, which has nothing
to do with the one pass that was paid for. Then:

* Up to 29 people RSVP "yes" through the public invite link and are told they are coming.
* Every group surface renders the pass through `composeWhenLabel({ openCapacity: false })`, i.e.
  "Thursday, Aug 6, 6:00 AM – 10:00 PM (Makati time)" — the sixteen-hour-reservation lie that 09-08 forked
  the formatter to prevent, now sent to third parties by email.
* The venue sees 30 people arrive against 1 paid admission; the counter never saw any of them.

**Fix:** Enforce the premise where it is claimed. Add `AND l.occupancy_mode = 'exclusive'` to **both** the
pre-read gate and the INSERT's `WHERE` in `createGroup` (returning the shared `DENIED` sentence, which is
already the no-oracle answer for "this booking can't host a group"), and add a test that a confirmed
open-capacity booking cannot mint a group. Optionally make the four `openCapacity: false` literals
projections of the real column so the compiler notices if the rule is ever relaxed — but the guard is the
part that must ship.

---

### CR-06: A booker cannot buy a second set of passes for a date they already booked — silently

**File:** `src/lib/availability/units.ts:666-712` and `:764-774` (with
`src/app/actions/booking.ts:88-90`, `src/app/listings/[id]/book/page.tsx:113-114`)

**Issue:** `findOwnOpenHold` matches "the booker's own active open hold" as
`open_capacity = true AND (status = 'confirmed' OR (status = 'pending' AND expires_at > now()))
AND booker_id = … AND starts_at = …`. For an open row `starts_at` **is the whole date**, so this matches any
prior booking that booker has for that day — including a fully **confirmed and paid** one. The pre-check
runs before the cap read, and a match returns `{ ok: true, replayed: true, granted: <the old count> }`.

On the exclusive path the equivalent match is on the exact `(starts_at, ends_at)` window, so booking a
different slot is unaffected. On the open path there is only one "window" per date, so **all** purchases for
a date collapse into the first one. OC-18 explicitly says there is deliberately no per-booker head cap, so
this is idempotency machinery producing a policy nobody chose.

**Failure scenario:** Booker buys 2 passes for Saturday and pays (row `confirmed`, `declared_pax = 2`). Two
friends decide to come; the booker returns, picks Saturday, sets the stepper to 2, clicks *Book this space*.
`placeOpenHold` → `findOwnOpenHold` returns the confirmed booking → `granted = 2`, `requested = 2` so
`partial = ""` → redirect to `/listings/{id}/book?hold={old id}` → the reserve page sees `status ===
'confirmed'` and redirects to `/bookings/{old id}`. The booker lands on the booking they already had, with
**no message of any kind**, no new hold, and no way to buy more passes for that day. Meanwhile the app's own
copy for this situation is `PASSES_FIXED_MESSAGE = "To add more passes, book them separately."` — following
that instruction is what triggers the silent no-op. Revenue is lost and the counter under-reports the real
attendance.

**Fix:** Narrow the replay to what it is for — a double-submit — instead of "any booking on this date":

* Prefer the explicit token: match on `idempotency_key` when one is supplied (and have `BookCta` send a
  per-submit token for the open payload, as `openHoldSchema` already allows).
* For the tokenless fallback, restrict the own-hold match to a **live `pending` hold created within the last
  few seconds/minutes** (`status = 'pending' AND expires_at > now()`), and drop `status = 'confirmed'` from
  `findOwnOpenHold` entirely — a confirmed pass is not a hold being re-entered.
* Add a test: booker with a confirmed pass on date D claims again → a **new** booking row is created (or a
  calm, explicit refusal is returned) — never a silent redirect to the old one.

---

## Warnings

### WR-01: `findOwnOpenHold`'s idempotency-key match is not scoped to the booker

**File:** `src/lib/availability/units.ts:684-687`

**Issue:** The predicate is
`(idempotency_key = ${key} OR (booker_id = … AND starts_at = …))` — the key branch carries **no
`booker_id`**. `openHoldSchema` accepts a client-supplied `idempotencyKey` up to 200 chars, and
`booking_idem_uq` is a global unique index, so keys are not namespaced per user either. (The exclusive
`findOwnActiveHold` at `:265` has the same shape; this is a new copy of it, so it is worth fixing in both.)

**Failure scenario:** Mallory posts `placeOpenHold` with an `idempotencyKey` equal to Alice's. The claim
returns `{ ok: true, replayed: true }` carrying **Alice's** booking id, and `placeOpenHold` redirects Mallory
to `/listings/{id}/book?hold={Alice's booking id}`. The reserve page is owner-gated so she sees a 404 — but
she has a confirmed-existence oracle for a booking id, and her own purchase was silently swallowed (no hold,
no error). Impact is currently limited because `BookCta` never sends a key.

**Fix:** Scope the key branch to the caller: `(idempotency_key = ${key} AND booker_id = ${bookerId})`, in
both `findOwnOpenHold` and `findOwnActiveHold`. A key is a de-dup token for *one caller's* submits, never a
lookup handle.

---

### WR-02: Split-shift days that cross midnight get a truncated pass window

**File:** `src/lib/availability/open-capacity.ts:158-170` (with `:119`)

**Issue:** `loadOpenDayWindow` takes `MIN(open_time)` / `MAX(close_time)` across the weekday's rows to build
"the outer envelope". `MAX` on a wall-clock `time` cannot express a shift that rolls past midnight.

**Failure scenario:** A gym stores Saturday as two rows: `06:00–12:00` and `18:00–02:00`. `MIN(open) =
06:00`, `MAX(close) = 12:00` (because `'12:00' > '02:00'`), so `rollsPastMidnight` is false and the pass
window becomes **06:00–12:00**. The evening session vanishes: the day panel says "Open 6:00 AM – 12:00 PM",
`ends_at` is noon, and — because `expires_at = LEAST(now + 15min, ends_at)` — an afternoon claim mints a
hold that is already expired (`ends_at` in the past → the row is born unpayable), while the
`day_open_ok` guard refuses claims after noon on a day the venue is open until 2 AM.

**Fix:** Compute the envelope in TS from the fetched rows rather than in SQL: select all windows for the
weekday, take the earliest open, and take the close whose *instant* is latest after applying the
`close <= open ⇒ next day` roll per row. Add a case to the open-capacity read-model test with an overnight
shift.

---

### WR-03: `OPEN_LOW_STOCK_MAX` is an unvalidated `Number(env)` — a typo silently disables the `low` state

**File:** `src/lib/availability/open-capacity.ts:27-34`

**Issue:** `export const OPEN_LOW_STOCK_MAX = Number(process.env.OPEN_LOW_STOCK_MAX ?? 5);` — no
`Number.isFinite`, no positivity check. `Math.min(x, NaN)` is `NaN`, and `remaining <= NaN` is always false.

**Failure scenario:** An operator sets `OPEN_LOW_STOCK_MAX=five` (or leaves a trailing space / an empty
string that coerces to `0`). `lowStockThreshold` returns `NaN` (or `0`), `spotsState` never returns `"low"`,
and **every** date renders the digit-free "Spots available" chip right up to the moment it flips to "Fully
booked" — the scarcity feature is silently off, on a server-only constant nobody looks at.

**Fix:**

```ts
const parsed = Number(process.env.OPEN_LOW_STOCK_MAX);
export const OPEN_LOW_STOCK_MAX = Number.isFinite(parsed) && parsed >= 1 ? Math.floor(parsed) : 5;
```

---

### WR-04: The `.max(10_000)` shape ceiling does not bound the money product it claims to bound

**File:** `src/lib/validation/booking.ts:125-136` (with `src/lib/availability/units.ts:824-834`)

**Issue:** The docblock states the ceiling "exists so no accepted value can multiply through
`per_head_price_cents × passes` into the `integer` money columns and raise a Postgres 22003 that
`mapBookingError` would re-throw as a raw 500". It does not: `granted` is bounded by
`remaining = cap − taken`, and `cap` is the **host's** `max_occupancy` (only `.int().positive()` at publish),
while `per_head_price_cents` is likewise unbounded above.

**Failure scenario:** A host sets `max_occupancy = 12000` (a stadium-style open session) and
`per_head_price_cents = 300000` (₱3,000). A booker requests 10,000 passes: `granted = 10_000`,
`space_price_cents = 3_000_000_000` > int4 max → Postgres `22003` on the insert → not 23P01/40P01/
`NoUnitAvailableError` → `mapBookingError` re-throws → unhandled server-action error. Contrived, but the
comment asserts a protection that is not there, which is how the next reader stops thinking about it.

**Fix:** Either bound the *product* where it is computed (refuse/clamp when
`perHead * granted > MAX_MONEY_CENTS`, returning the existing calm error), or bound `max_occupancy` and
`per_head_price_cents` in `publishSchema`/`draftSchema`, and correct the comment to say which bound is real.

---

### WR-05: A drop-in pass is uncancellable from the moment the venue opens, with no disclosure

**File:** `src/app/actions/cancel-booking.ts:557-570` (and `:111-116`, `:266-275`)

**Issue:** `cancelBookingAsBooker`'s flip is scoped `AND starts_at > now()`. For a drop-in pass that instant
is the venue's *opening* time, so the entire day a pass is valid for is also a day on which it cannot be
cancelled or refunded — even though the pass is still fully usable and the ladder's lowest rung may still
be generous. Today this is masked by CR-01 (a same-day pass can't be bought at all); fixing CR-01 exposes
it directly: a pass bought at 15:00 for today is instantly non-cancellable and non-refundable.

The disclosure the booker reads is consistent for future dates ("Cancel at least N hours before the space
opens"), so this is arguably intended for *tomorrow's* pass — but it is not intended for one bought after
opening, and nothing on the reserve page says "this purchase is final".

**Fix:** Decide and encode it: either allow cancellation while the pass window is live (compare against
`ends_at` for open rows, letting the existing 0%-rung produce a no-refund cancellation), or keep the guard
and have the reserve page state plainly, for a same-day pass, that it cannot be cancelled once bought.
Either way the `PAST_START` copy needs the pass wording (see NT-01).

---

## Info

### NT-01: `PAST_START` copy says "session" to a drop-in booker

**File:** `src/app/actions/cancel-booking.ts:111-116` (also `src/app/actions/booking.ts:726-728`)

Both refusals read "This session has already started" — the exact framing 09-08 forked `when-label.ts` to
eliminate for passes, and the anchor `CancellationPolicyDisclosure` already renames ("before the space
opens"). Fork the sentence on `booking.open_capacity` alongside the CR-01/WR-05 fixes.

### NT-02: Month grid and day panel disagree when `max_occupancy` is NULL

**File:** `src/lib/availability/read-model.ts:410` vs `:362-377`

`getOpenMonthAvailability` uses `cap = maxOccupancy ?? 0` and marks a date full only when
`taken >= cap` — with `cap = 0`, a date with **no** bookings produces no row at all and stays *selectable*,
while `getOpenDay` computes `remaining = 0` and renders "Fully booked". A mis-configured (or mid-edit)
listing therefore offers dates the panel then refuses. Cheap fix: when `cap <= 0`, return every in-month
date as full (or short-circuit the whole month to "not bookable").

### NT-03: Acknowledged, previously-recorded items (not re-reported as new)

* `lowStockThreshold(3) = 1`, so a cap-3 listing shows no number until one spot remains — surfaced in UAT,
  recorded as accepted design.
* The host listing tile shows the all-in per-person rate beside a raw `/hr` rate (documented asymmetry).
* `?date=` does not seed the picked date on the listing page (matches shipped exclusive-calendar behaviour).

---

## Where I went deep vs. skimmed

**Deep (read in full, traced across files):** `units.ts` (`createOpenCapacityHold` line by line — lock
placement, sweep scope, counted set, grant arithmetic, insert, replay, retry/error mapping),
`open-capacity.ts`, `read-model.ts` (both branches + the month query), `booking.ts` (`placeHold`,
`placeOpenHold`, `updateDeclaredPax`, `confirmBooking`), `cancel-booking.ts`, `pricing.ts`, `when-label.ts`,
`bookings-query.ts` + `reminders.ts` (every raw projection checked for the `openCapacity` alias — all
present), `search/query.ts`, both validation modules, `mode-lock.ts`, `listing.ts`, `operating-hours.ts`,
the three migrations, `book/page.tsx`, and `open-capacity-race.test.ts` (both mutation layers are real and
the fixture identities are correct).

**Targeted (read the open-capacity paths only):** `group.ts`, `rsvp.ts`, the PayMongo webhook confirm path,
`request-expiry.ts`, `listings/[id]/page.tsx`, `availability-calendar.tsx`, `wizard.tsx`, the host
availability page, the cancel review page.

**Skimmed for real defects only (none found worth reporting):** `date-pass-picker.tsx`,
`spots-left-chip.tsx`, `pass-stepper.tsx`, `stepper-control.tsx`, `book-cta.tsx`, `partial-grant-notice.tsx`,
`cancellation-policy-disclosure.tsx`, `drop-in-badge.tsx`, `listing-card.tsx`, `search-result-card.tsx`,
`reserve-view.tsx`, `e2e/open-capacity.spec.ts`.

**Not opened:** `host-requests.ts`, `re-request.ts`, `invite/[token]/page.tsx`, `booking-row.tsx`,
`host-cancel-dialog.tsx`, `mode-lock-notice.tsx`, the four host/booker list pages, and 20 of the 22 test
files. Their `openCapacity` usages were verified by grep to be either the correct persisted projection or
the documented `false` literal — except the group-surface literals, which CR-05 covers.

---

_Reviewed: 2026-07-30T18:16:40Z_
_Reviewer: Claude (gsd-code-reviewer)_
_Depth: standard_
