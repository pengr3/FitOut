# Phase 14 — Deferred Items

Out-of-scope discoveries made while executing this phase's plans. Logged, not fixed.

---

## `[14-03]` The `status` column does not shrink, and the D-99 reason line is the widest thing that can land in it

**Found during:** 14-03 Task 2, moving the SLA countdown into `RowCard`'s `status` slot.
**Owner:** **14-06** — it owns `src/app/(host)/host/requests/page.tsx` and `e2e/host-inbox-hierarchy.spec.ts`,
which is where the 320px measurement actually runs.

`row-card.tsx:200-210` renders the `status`/`trailing` column as
`<div className="flex shrink-0 flex-col items-end gap-1">`. `shrink-0` means that column keeps its
max-content width no matter how narrow the viewport is; the title column beside it is `min-w-0 flex-1` and
absorbs the whole squeeze by truncating.

That is correct and unremarkable for the countdown itself (`Expires in` over `23h 45m` — narrow). It is
worth a measurement for the **D-99 cap-shortened reason line**, which 14-UI-SPEC puts in the same slot and
which is a full sentence: *"Session starts in under an hour — respond soon."* At 320px the card's content
box is ~288px, so on a capped row the space title can be truncated hard.

**Why it was not fixed here:** 14-03's `files_modified` is four files and `row-card.tsx` is not one of them.
Relaxing `shrink-0` is a change to **all four** RowCard adopters, and the fix that does not touch the
pattern — a width cap on the status content — would mint an undeclared box measurement, which is exactly
what `measurements.ts` exists to prevent.

**What 14-06 should do:** measure it at 320px on a row that actually renders the reason line, and if the
truncation is unacceptable, either (a) declare the cap in `measurements.ts` with its derivation and apply
it to the status content, or (b) record that a capped row truncating its title at 320px is acceptable
because the deadline is the thing being triaged. Either is fine; discovering it in a Playwright failure is
not.

**Not a regression this plan introduced:** the reason line rendered beneath the countdown before 14-03 too.
What changed is which column it renders in, and therefore which neighbour pays for its width.
