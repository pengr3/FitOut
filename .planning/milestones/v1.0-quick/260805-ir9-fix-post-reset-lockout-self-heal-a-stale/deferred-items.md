# Deferred Items — quick-260805-ir9

Out-of-scope discoveries found while executing the post-reset lockout self-heal. Logged, NOT fixed
(scope boundary: only auto-fix issues directly caused by this plan's changes).

---

## DEF-IR9-01 — `tests/booking/hold-expiry.test.ts` is a hardcoded-date time bomb that has now expired

**Status:** Pre-existing failure, unrelated to this plan. 2 tests failing.

**Observed** (`npx vitest run tests/booking/hold-expiry.test.ts`, 2026-08-05):

```
 × a stale pending hold reads FREE (lazy) AND a new hold on it succeeds (sweep frees the slot)
   AssertionError: expected false to be true // Object.is equality
 × a LIVE (future-expiry) pending hold still occupies the slot AND blocks a new overlapping hold
   AssertionError: expected 'That start time is too soon to book. …' to match /just taken/i
   "That start time is too soon to book. Pick a time at least half an hour out."
 Tests  2 failed (2)
```

**Cause.** The file pins its slot to a fixed calendar date:

- `tests/booking/hold-expiry.test.ts:22` — `const NOW = new Date("2026-07-15T00:00:00.000Z")`
- `:25-27` — the slot is `2026-08-02T22:00Z → 23:00Z` (the 06:00 Asia/Manila slot on Mon Aug 3 2026)
- `:21` comment — "A fixed 'now' before the Aug 3 2026 (Monday) test day → the slot is future"

But `NOW` is only threaded into `getAvailability` (`:85`, `:123`), which takes an explicit now. The
file uses **no fake timers** (no `vi.useFakeTimers` / `setSystemTime`), so `createPendingHold` still
reads the REAL clock for its minimum-lead-time guard. As of 2026-08-05 the hardcoded slot is in the
past, the lead-time guard rejects it, and both cases fail. The file was destined to fail on every run
after 2026-08-02 regardless of any code change.

**Why it is not this plan's problem.** `tests/booking/hold-expiry.test.ts` imports
`@/lib/availability/read-model` and `@/lib/availability/units` only — it references neither
`src/middleware.ts`, `src/lib/session-check.ts`, nor the new route handler (`grep -nE
"middleware|session-check"` on the file returns nothing). The failure reproduces in isolation with
the same message.

**Note on the stated baseline.** The execution brief gave a baseline of "1112 passed / 4 skipped /
0 failures". That baseline predates the expiry date embedded in this file; it cannot hold on any run
dated after 2026-08-02.

**Suggested fix (for whoever picks this up).** Either derive the test day from the real clock (e.g.
the next Monday at least N days out) rather than hardcoding Aug 3 2026, or make `createPendingHold`'s
lead-time check accept an injected `now` the way `getAvailability` already does, and pass `NOW`. The
second is the better fix — it removes the whole class of wall-clock time bombs from the booking
suite — but it changes a production signature and is therefore squarely out of scope here.
