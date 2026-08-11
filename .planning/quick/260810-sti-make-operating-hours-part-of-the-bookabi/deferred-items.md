# Deferred items — discovered during quick task 260810-sti, deliberately NOT fixed here

## D1 — Gate 7's "pick another date" copy is false for a listing with no operating hours at all

**Discovered:** while writing the `L_OPEN_NOHOURS` RED anchor. The plan predicted that a published,
payout-activated, `open_capacity` listing with zero `operating_hours` rows would MINT a hold pre-fix.
It did not. `placeOpenHold` was rescued three gates later: step (7) derives the day window from the
listing's own hours and returns null when there are none, refusing with

```
This space isn't open that day. Pick another date.
```

on a listing that has **no dates at all**. The advice cannot be followed — no date will work — and the
sentence misattributes a listing-wide condition to the single date the booker happened to choose.

**This was NOT a mis-built fixture, and that was checked rather than assumed.** A wrong occupancy mode
refuses at gate (6) with `OPEN_ON_EXCLUSIVE`, not gate (7)'s `CLOSED_THAT_DAY`; the fixture carried a real
`maxOccupancy` and `perHeadPriceCents` (a NULL cap would have failed closed and passed for the wrong
reason). Gates 1-6, bookability included, genuinely passed. The anchor now asserts the exact error string
so the two `invalid` sources stay distinguishable.

**Why it was deferred rather than fixed.** Rewriting booker-facing refusal copy is a UX-copy change with
its own review surface, and widening this task to include it would have put a copy edit inside a
money-path security change.

---

### **CLOSED 2026-08-10 — NO CODE CHANGE NEEDED. This task already fixed it, and this entry originally
### overstated the residual.**

Re-examined when the operator asked for the copy to be fixed. The original entry claimed the string
"remains reachable by any other path that reaches gate (7) with a null day window." **That is wrong, and
the correction is worth more than the fix would have been.**

`loadOpenDayWindow` (`src/lib/availability/open-capacity.ts:316-330`) returns null in exactly two cases:
the listing row does not exist, or **there are no `operating_hours` rows for the PICKED WEEKDAY**
(`hoursRows.length === 0` — "venue closed that weekday"). Availability blocks are handled elsewhere
(`BLOCKED_DATE_MESSAGE`), not here.

Since gate (5) now requires `hasOperatingHours` — an `EXISTS` over the listing's hours with **no day
filter** — a listing reaching gate (7) is guaranteed to have hours on *some* weekday. So a null window at
gate (7) can now mean only one thing: **the venue is open on other days and closed on the one the booker
picked.** For that case `"This space isn't open that day. Pick another date."` is exactly true and exactly
actionable. The zero-hours listing that made it a lie is refused earlier, at gate (5), with its own correct
copy: `"This space isn't accepting bookings right now."`

The string is an inline literal at ONE site (`src/app/actions/booking.ts:470`), inside `placeOpenHold`,
and gate (5) always precedes it in that same function. There is no second route. `read-model.ts:360` calls
the same helper but renders a closed day rather than emitting this sentence.

**Residual, stated rather than hidden:** a TOCTOU window of microseconds — a host deleting their last
hours row between the gate-(5) read (`booking.ts:440`) and the gate-(7) read (`:468`) inside one request
would produce the false sentence once. A retry gets the correct message. Not worth a code change; recorded
so the claim "unreachable" is not overstated a second time.

**The lesson worth keeping:** the fix for the misleading copy was making the misleading STATE unreachable,
not rewording the sentence. The sentence was only ever wrong because a listing could reach it in a
condition it did not describe.
