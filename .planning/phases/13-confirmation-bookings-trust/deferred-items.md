# Phase 13 — deferred items

Out-of-scope discoveries made while executing this phase's plans. Nothing here was fixed by the plan
that found it; each row names the plan that found it and why it was left.

| Found by | Item | Why deferred |
|---|---|---|
| 13-05 | `refund-destination-form.tsx`'s `toast.warning(res.notice)` — the D-72 manual-transfer branch. A `notice` means the cancellation succeeded but the transfer could not be dispatched (a rail failure or a ceiling). By STATE-08's own test — "is this a fact the booker must retain?" — that is arguably an in-page alert rather than a toast: it says money the booker is owed did not move automatically. | The sentence is composed **server-side** and arrives as `res.notice`, so it is not a string literal and the STATE-08 AST scan cannot see it either way (recorded as a stated blind spot in `tests/design/status-vocab.test.ts`). Deciding its surface means deciding its **copy** — which of D-83's two money truths it states, and whether it belongs beside the reversed state's manual-return branch. That is a copy decision on a surface plan 13-05 does not own, and 13-05's scope is STATE-08's three named examples. |
