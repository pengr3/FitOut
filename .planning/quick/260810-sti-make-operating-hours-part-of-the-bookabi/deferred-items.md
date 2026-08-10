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

**Why it is deferred rather than fixed.** After this task the sell-gate refuses the listing at gate (5),
so the *sell-gate route* to this copy is unreachable — a booker cannot arrive here from a bookable
listing. The string remains reachable by any other path that reaches gate (7) with a null day window, and
the honest position is that the copy is wrong wherever it is reached, not that the problem is gone.
Rewriting booker-facing refusal copy is also a UX-copy change with its own review surface, and widening
this task to include it would have put a copy edit inside a money-path security change.

**Shape of the fix (not prescriptive):** distinguish "this listing publishes no hours at all" from "this
listing is closed on the date you picked" at the point the day window resolves to null, and say the true
thing in each case. Worth checking whether the exclusive path has the same conflation.

**Not a regression introduced here.** Pre-existing behaviour, surfaced by writing a test that had never
been written for this state.
