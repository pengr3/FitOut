# Phase 09 — Deferred Items

Out-of-scope discoveries logged during execution. Both items below came out of the **09-16 human
walkthrough** (2026-07-31) — the phase's last gate, and the only test that can answer "does this read clearly
to somebody without product knowledge?"

Neither is a defect. Item 1 is a **copy gap**; item 2 is an **accepted design decision**, recorded here with
the option that was declined so a later reader knows it was a choice and not an oversight.

> **They are two halves of one question, and should be revisited together.** Both are cases where the drop-in
> surface tells a booker *less* than they need to build the mental model: item 1 withholds what a drop-in
> **is**, item 2 withholds how many are **left**. Each is individually defensible (there is no room on a
> search card; an always-on counter is invented urgency). Whether they are *jointly* defensible is a product
> question no automated test can settle — the first person to touch drop-in comprehension copy should hold
> both in view at once.

---

## 1. "Drop-in" is unexplained on the search card — the word carries the whole mental model with no room to define it

**Found during:** 09-16 Task 2, step 7 (search / OC-12) — the human walkthrough. Operator's words:
**"users don't know what a 'drop-in' is."**

**What.** The search card names the mode with a single-word `Drop-in` badge (`search-result-card.tsx`, shipped
09-14) alongside `₱…/person` and `Service fee included`, and deliberately renders **no time range at all**
(O2 — a pass is a day, and a clock range on the card would promise hours the pass does not reserve). That
absence is correct and is asserted in `e2e/open-capacity.spec.ts` case 3. The consequence is that **the badge
is the only thing on the card carrying the concept**, and the concept is not self-evident: a first-time booker
reading `Drop-in · ₱367.50/person · Service fee included` with no start/end time has to guess whether they are
buying a class, a time slot, or something else. The explanation exists — the listing page says
`Pick a day — your pass is good any time they're open.` and `Your pass covers the whole day — come any time
while they're open.` (both verified verbatim in step 2) — but a booker only reaches it **after** deciding the
card is worth a click.

**Why it matters.** Search is the top of the demand funnel and this is a NEW mode. A card the booker cannot
classify is a card they skip; the drop-in supply then looks unpopular for a reason that has nothing to do with
the supply. This is a conversion question, not a correctness one.

**Why not fixed here.** 09-16 declares `files_modified: []` and is a human-verification plan. More
importantly, the fix is a **copy/product decision with real constraints**, not a one-liner: the card has no
room for a sentence, the phrase has to survive at mobile width, and the honest candidates trade off against
each other —
- rename the badge to something self-describing (`Day pass`, `Book a day`, `Drop-in day pass`) — costs the
  industry-standard word the benchmark apps (Gympass, Hussle) actually use;
- keep `Drop-in` and add a micro-line under the price (`Any time they're open`) — costs vertical space on
  every card in the grid;
- keep `Drop-in` and explain it once at the top of results when any drop-in card is present — costs nothing
  per card but is easy to miss;
- keep `Drop-in` and explain it on hover/tap — invisible on mobile, which is the primary surface.

**When to close.** Whenever drop-in comprehension copy is next revisited — ideally with item 2, and ideally
after real bookers have used the surface, since "does the word land?" is the kind of question a handful of
sessions answers better than a debate. Note that changing the badge text touches an asserted literal in
`e2e/open-capacity.spec.ts` case 3 and `tests/search/search-card-open.test.tsx`.

---

## 2. Small-cap scarcity is invisible until the last spot — `lowStockThreshold` never fires early on a cap of 2–3 — **ACCEPTED DESIGN (operator decision, 2026-07-31)**

> **This is not an open defect.** The operator was offered three dispositions on 2026-07-31 and chose
> **"accepted design — record and move on"**. It is logged here so the behaviour is discoverable by whoever
> next reads a bug report that sounds like "the counter is broken", and so the declined option is on the
> record. **No `src/` change was made.**

**Found during:** 09-16 Task 2, step 4 (spots decrement across bookers / OPEN-04). Operator's words:
**"i dont see chip auto deducting or what."**

**What.** `lowStockThreshold(cap) = clamp(floor(cap / 2), 1, OPEN_LOW_STOCK_MAX)`
(`src/lib/availability/open-capacity.ts:32`), and `SpotsLeftChip` shows an exact figure **only** in the `low`
state, i.e. only once `remaining <= lowStockThreshold(cap)`. On the walkthrough's **cap-3** listing the
threshold is therefore **1**, so:

| remaining | state | chip |
|---|---|---|
| 3 | `open` | `Spots available` |
| 2 | `open` | `Spots available` ← **no visible change from 3** |
| 1 | `low` | `Only 1 left` |
| 0 | `full` | `Fully booked` |

**A human buying one pass at a time on a cap-3 listing crosses 3 → 2 first and sees nothing happen at all.**
The count is moving correctly the whole time — live data from the walkthrough: 2026-07-31 → cap 3, taken 3,
remaining 0, `full`; 2026-08-03 → cap 3, taken 0, remaining 3, `open`. Every claim decremented. **The display
rule is what hides it**, and at cap 2 the effect is the same (threshold 1: the only visible states are
`Spots available` and `Only 1 left`).

**Why it is deliberate.** OC-11 / 09-UI-SPEC § Spots-left / T-09-39. A flat "always show the number" would
mark a 6-person studio urgent from its FIRST booking, and a scarcity signal that is always on is noise; the
half-capacity clamp guarantees urgency can never fire while more than half the day's admissions are still
open, and `OPEN_LOW_STOCK_MAX` stops a 40-cap gym crying "18 left". Invented urgency is a dark pattern, and
the `open` state's *absence of a digit* is an executable rule (`tests/availability/spots-left-chip.test.tsx`,
and `e2e/open-capacity.spec.ts` case 2 asserts the chip carries no digit at all). The UI checker verified the
threshold behaviour 6/6.

**The option that was DECLINED.** Lower the floor so small caps disclose earlier — e.g.
`clamp(ceil(cap / 2), 1, MAX)` (cap 3 → 2, so `Only 2 left` appears after the first pass) or a special case
for `cap <= 3`. **Declined** because it re-introduces exactly the always-on urgency the clamp exists to
prevent: on a cap-3 listing every booker after the first would see a countdown, which is the dark-pattern
shape for the smallest, most intimate spaces — the ones where a countdown is most pressuring and least
informative. The operator's judgement was that a booker seeing an unchanged chip is a **smaller** harm than a
booker being pressured, and that the sold-out state (`Fully booked`, calm, muted, disabled) carries the real
information at the point it matters.

**What WAS done instead (09-16, no `src/` change).**
1. The invisible transition is now a **pinned contract**: `e2e/open-capacity.spec.ts` case 2 buys the two
   heads **one at a time** and asserts the chip still reads `Spots available` and still carries no digit at
   2 of 3 remaining, before the second head crosses to `Only 1 left`. Mutation-measured — forcing
   `lowStockThreshold` to `cap - 1` turns that assertion RED (`Expected: "Spots available" / Received:
   "Only 2 left"`), restored, `git diff --exit-code src/` = 0. What was an accidental blind spot in the suite
   is now an asserted decision.
2. The misleading truth-claim wording was corrected in place in `09-15-SUMMARY.md` (a Correction note) and
   `09-VALIDATION.md`, both of which said "the spots-left figure decrements between them" without naming the
   cap at which a decrement is actually **visible**.

**Why the automated proof missed it originally.** 09-15's case 2 used the same `CAP = 3` but moved **two heads
in one INSERT** (3 → 1), so the chip visibly changed. The truth claim was literally satisfied while the human
experience was "nothing happened." Worth remembering as a general shape: *a test that takes the shortcut a
user cannot take will confirm a claim the user will not experience.*

**When to reopen.** Only with real usage evidence — e.g. bookers reporting confusion, or a measurable drop-off
on small-cap listings. If it is reopened, the better lever is probably **copy** rather than the threshold
(saying *why* the number is withheld, or naming the cap: `Up to 3 people a day` already renders on the rail
and was confirmed in step 2), which is also why this should be looked at together with item 1.

---

## 3. `date-pass-picker.test.tsx` case 4 times out under multi-suite parallel load — **PRE-EXISTING, out of 09-17's scope**

**Found during:** 09-17 Task 1, running the plan's own regression gate
`npx vitest run tests/booking tests/payments tests/availability`.

**What.** `tests/availability/date-pass-picker.test.tsx > (4) picking a new date resets the pass count to 1
and re-bounds it (§ 2c)` fails with `Error: Test timed out in 5000ms` when the three suites are run together
(54 files, ~85s wall, ~226s of parallel import time). The same file passes **9/9 in ~13s** when run alone.

**Proven pre-existing, not a 09-17 regression.** The baseline was measured, not assumed: with
`src/app/actions/booking.ts` reverted to HEAD (`git checkout --`) **and** the new
`tests/booking/open-capacity-confirm.test.ts` moved out of the tree, the identical command still fails the
identical case — `Test Files 1 failed | 52 passed (53) · Tests 1 failed | 567 passed (568)`. With 09-17's
changes present the numbers are `53 passed (54)` / `570 passed (568+3)` and the **same single** failure. So
no pre-existing test is *newly* failing, which is the acceptance criterion 09-17 owes.

**Why it is out of scope.** It is a jsdom component test that mocks `getDayAvailability`; nothing in it
touches `confirmBooking`, the checkout-initiation cutoff, or any file 09-17 modifies. Per the executor scope
boundary, only issues directly caused by the current task's changes are auto-fixed.

**The likely cause and the likely fix.** The case awaits an async re-render after a date change against
vitest's default 5s `testTimeout`; under full-suite CPU contention on this box the wait is borderline. The
fix is a timeout/`waitFor` adjustment on that one case (or a raised global `testTimeout` in
`vitest.config.ts`), **not** a source change — the behaviour under test is correct, as the isolated 9/9 run
shows.

**When to close.** Next time `tests/availability` is touched, or during phase-09 verification if a fully
green single-command run is required to sign the phase off.

---

*Logged 2026-07-31 during 09-16 (items 1-2) and 09-17 (item 3). Path note: this file follows the shipped per-phase convention
(`.planning/phases/{phase}/deferred-items.md`, as in phases 04, 07 and 08); there is no repo-root
`.planning/deferred-items.md`.*
