# Phase 13 — deferred items

Out-of-scope discoveries made while executing this phase's plans. Nothing here was fixed by the plan
that found it; each row names the plan that found it and why it was left.

| Found by | Item | Why deferred |
|---|---|---|
| 13-05 | `refund-destination-form.tsx`'s `toast.warning(res.notice)` — the D-72 manual-transfer branch. A `notice` means the cancellation succeeded but the transfer could not be dispatched (a rail failure or a ceiling). By STATE-08's own test — "is this a fact the booker must retain?" — that is arguably an in-page alert rather than a toast: it says money the booker is owed did not move automatically. | The sentence is composed **server-side** and arrives as `res.notice`, so it is not a string literal and the STATE-08 AST scan cannot see it either way (recorded as a stated blind spot in `tests/design/status-vocab.test.ts`). Deciding its surface means deciding its **copy** — which of D-83's two money truths it states, and whether it belongs beside the reversed state's manual-return branch. That is a copy decision on a surface plan 13-05 does not own, and 13-05's scope is STATE-08's three named examples. |
| 13-07 | `request-countdown.tsx` still carries the alarm-colour token in its source, for its final-hour emphasis on the two HOURS-scale call sites (the host inbox SLA and the booker payment window). 13-UI-SPEC § Color's falsifiable form is a source scan for `text-destructive` over `src/components/booking/**`, and 13-15 owns writing it — that scan will report this file. | 13-07 needed the emphasis GONE on a fifteen-minute horizon (where the condition is true from the first paint to the last) and got there with an opt-out prop, which is the smallest change that leaves both shipped call sites byte-identical in behaviour. Whether the emphasis should exist at all on an hours-scale window is a design question about surfaces this plan does not own, and `request-countdown.tsx` is plan 13-14's file. Recorded so 13-15 does not read its own scan as a regression this plan introduced: the token was there before, and `tests/booking/payment-states.test.tsx` asserts the rendered tree of both 13-07 states is free of it. |
| 13-07 | `request-countdown.tsx` ticks once a MINUTE (its horizon is 24h), so the not-completed state's fifteen-minute hold display steps `15m → 14m → …` rather than counting seconds. | 13-UI-SPEC names this component by name for that slot ("one owner for a countdown display"), and retuning the tick changes behaviour on the two shipped hours-scale call sites. A per-minute cue is honest — the DB clock is the authority and this is a display cue everywhere it renders — so the cost is cosmetic. `hold-countdown.tsx` is the per-second clone if a later plan decides the checkout-scale display should match it. |
| 13-08 | The two group confirm overlays — `remove-attendee-button.tsx` and `regenerate-link-button.tsx` — compose `@/components/ui/dialog` DIRECTLY rather than the Phase-11 `ResponsiveDialog` pattern. 13-UI-SPEC § The Group Surfaces says "any confirm overlay (remove attendee, regenerate link) is `ResponsiveDialog`", so this is the one row of that table plan 13-08 did not discharge. | The falsifiable half of that row IS satisfied and was run: `tests/design/sheet-absent.test.ts` is green, no `sheet` block was fetched, `package.json` is byte-unchanged and there is exactly ONE overlay mechanism in the app — `ResponsiveDialog` composes the same vendored `Dialog` these two files compose. What is missing is only its `max-sm:` bottom-sheet PRESENTATION. Against that: **neither file is in 13-08's `<files>` list or its `files_modified` frontmatter**, both were touched by plan 13-05 for the STATE-08 outcome plumbing (`onRemoved`, the deleted success toast), and converting them is a structural edit to a confirm flow rather than a container swap — which 13-08's own scope note calls the signal that a design pass has ended. Whichever plan next opens those two files should take the conversion with it; it is ~15 lines each and needs `tests/group/state08-alerts.test.tsx` (which drives the remove dialog by role) re-run. |
| 13-08 | `src/lib/design/live-regions.ts`'s header states a MEASURED count of the tree's `aria-live` sites — "19 files; EIGHT of them declared, ELEVEN excluded here", re-measured 18 Aug 2026. Plan 13-08 removed the live region from `invite-card.tsx`'s static inactive state, so that grep now returns 18. | The two lists still PARTITION the tree and every assertion in `live-regions.test.tsx` is green: the exclusions are only checked for a reason naming their owning phase and for non-overlap with the declared set, never for a region actually existing in the file. What drifted is prose arithmetic. `live-regions.ts` is plan **13-14**'s file — that plan owns this phase's live-region inventory and takes `LIVE_REGION_EXCLUSIONS` from 10 to 0 — so re-measuring the header there costs it nothing and editing it here would have put two plans in one inventory. |

| 13-14 | `/bookings/[id]/group`'s load-failure branch now announces NOTHING when `Try again` fails a second time. The button runs `router.refresh()`; a success unmounts the branch and a repeat failure re-renders byte-identical text, so a screen-reader user pressing it twice gets no confirmation that anything happened. By GATE-03 rule 1 the RESULT of a press arguably deserves a region. | The region that was there could not have reported it either — it wrapped the whole branch, so its text never changed. Reporting a repeat failure needs a MECHANISM this surface does not have (the retry is a full server re-render, not a client state transition), which means either a client island holding an attempt counter or a distinct second-failure sentence. Both are new behaviour on a surface 13-14 is auditing rather than building, and D-79 caps the group surfaces at a design-system pass with no net-new capability. The correct region is `RefreshGroupButton`'s, and whichever plan next opens that file should take it. |

## Resolved — recorded so a later plan does not redo it

**13-08's `aria-live` count drift is CLOSED by 13-14, and the number is neither 19 nor 18.** The row
above predicted the grep would return 18. Re-measured from scratch on 21 Aug 2026 against the tree
13-14 produced: `grep -rln aria-live src/ --include=*.tsx` returns **13**, and an AST walk finds the
attribute on the elements of only **7** files. The gap between the two is prose — five declared files
explain regions they hold under a ROLE rather than the attribute, and `invite-card.tsx` appears on the
strength of the comment explaining why 13-08 removed its region. Both numbers, and the reason they
differ, are now in `live-regions.ts`'s `LIVE_REGION_EXCLUSIONS` doc comment. **Do not carry any of these
figures forward without re-reading the tree** — that is exactly how 18 got predicted.


**13-12's open-capacity receipt recommendation is CLOSED by 13-13, not deferred.** `13-12-SUMMARY.md`
§ Deferred item 1 reads *"Recommend a seeded open-capacity receipt case in 13-15"*, and 13-15-PLAN.md
never picked it up. 13-13 closed it instead: `seed-payment-states.ts` gained an `openCapacity` option
(every shape seeded with `open_capacity` + `declared_pax`, against a listing the caller seeds
`occupancy: "open_capacity"`), and `e2e/receipt-parity.spec.ts` case (3) drives a real request at
`/bookings/[id]/receipt` and asserts that the rendered per-head unit MULTIPLIED BY the rendered pass
count equals `booking.space_price_cents` read back from Postgres.

Both of D-86's failure modes were watched red: the line going silently absent (predicate inverted), and
the line rendering a plausible wrong figure (`₱262.50/person × 4 passes`, from the division D-86
explicitly rejects, against a frozen space cost of ₱1,000.00).

**13-15 owes nothing here.** What 13-15 still owns from 13-12's list is item 2 — the GATE-VRT baseline
run for Assumption A4, which is Linux-container-only and cannot be done on this machine.
