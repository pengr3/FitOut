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

| 13-15 | `src/components/patterns/site-chrome.tsx`'s `ProfileLink` is a **16x16** pointer target below `sm:`. The label is `hidden sm:inline` (a measured responsive-budget decision — the signed-in cluster fits 226px only without it), leaving a bare `size-4` glyph with no padding, so at the 320px floor the control that reaches a user's own account is 8px under the WCAG 2.5.8 AA minimum and 28px under this app's own declared `size="touch"`. Measured by `e2e/overflow-320.spec.ts`'s new Phase-13 sweep, which reported `a[Profile] 16x16` on the first surface it visited. | It is the **Phase-11 app shell**, on no Phase-13 surface list, and it renders on every signed-in route in the product — so a fix changes the header everywhere and re-opens the 226px budget its own docstring records (the obvious `p-2` costs 16px of width in the exact cluster the label was dropped from). Letting it fail would have made twenty-two Phase-13 cases red for one Phase-11 element; dropping the assertion would have hidden it. The scan is therefore scoped to each surface's own content, with the measurement and this reasoning written into `collectControls`'s docstring, and the row lives here. Whichever plan next opens `site-chrome.tsx` should take it — the likely shape is padding on the link plus a re-measure of the cluster, not a bigger glyph. |
| 13-15 | `src/components/search/search-bar.tsx:134` renders `border-brand/30` — accent entry 9's decorative EDGE without entry 9's surface, glyph or ink. The new `src/lib/design/accent-uses.ts` maps the accent recipes rendered under the three Phase-13 trees and this one is outside them, so nothing asserts anything about it either way. | Adjudicating it means deciding whether a bare tinted edge IS entry 9, is an eleventh entry, or is a leak — a design decision on a **Phase-12** surface, and `accent-uses.ts`'s NOT COVERED section already states that the module audits only the Phase-13 trees. 13-15's scope is Phase 13's own colour contracts; widening the map to all of `src/` in the same commit that first creates it would have put an unrelated adjudication inside a gate nobody had reviewed yet. |
| 13-15 | **Baselining any Phase-13 booking surface needs a COMMITTED fixture, and there is not one.** A per-run seed cannot produce a stable screenshot: `seedPaymentStates` mints ids with `randomUUID()` (so the rendered `FIT-XXXXXXXX` reference, a SHA-256 of the id, differs every run), computes `starts_at`/`created_at` from `now()` (so the arrival line and the receipt's `Booked` date move daily), `seedBookableListing` puts a run id in the listing title, and `signUpBooker` mints a random email that the confirmation moment and the pending state both RENDER. Every one of those is in frame. | The fix is a Phase-13 block in `scripts/seed-baseline-fixtures.ts` in the shape the Phase-12 block already has — fixed booking ids, fixed literal instants, a fixed group token, and a fixed booker identity the drive can adopt (sign up, then `UPDATE "user" SET email = <literal>`, then re-point the fixed rows' `booker_id`, restoring both in cleanup). That is a plan-sized piece of work against a file outside 13-15's `<files>` list, none of it runnable on a developer machine (the `visual` Playwright project is not constructed off Linux, D-29), and getting it wrong ships baselines that go red on every dispatch — which trains people to re-mint, the exact failure `playwright.config.ts`'s D-28 comment exists to prevent. `visual-baselines.ts` now carries every Phase-13 row DECLARED AND BLOCKED with this reason per surface, so the gap is an inventory somebody can work from rather than an absence. |
| 13-16 | **A phase can COMPLETE with GATE-01 red, and nothing notices.** Measured at phase close: run `32274691204` on `bcdc7ec` — the **phase-12 completion commit** — reported `gate-visual: 9 failed / 1 skipped / 1 did not run / 57 passed`, on `collision-notice-1280-court`, `listing-detail-{320,768,1280}-{court,grove}` and `listing-sheet-375-{court,grove}` (the tenth, `collision-notice-1280-grove`, is the `did not run`, stopped by the failure ceiling). Phase 12 closed anyway; **Phase 13 inherited the red and closed it**, and the `d6cffb6` dispatch's ten regenerated PNGs are that inherited drift rather than anything Phase 13 rendered. Phase 13's only shared-chrome edits are `print:`-media utilities and comments (`site-chrome.tsx` +10/−0, `site-footer.tsx` +7/−1, `panel-card.tsx` +30/−0, `listing-public.ts` +192/−0 insertions-only), none of which can move a screen render — so 13-12's Assumption A4 prediction (*"all 52 GATE-VRT baselines are unmoved"*) was never falsified; it only looked falsified from the generation commit alone. | **It is a gate-DESIGN gap, not a Phase-13 defect, and it belongs to whichever phase owns the completion criteria** — most likely **Phase 17**, whose milestone audit leans on GATE-01. `gate-visual` failing is visible in a run; a phase *completing over it* is visible nowhere. The likely shape is a close-out assertion that the phase's head commit has a **green comparison run** (not merely a generation run — D-27), which is exactly the artifact 13-16 was made to produce by hand. Recorded with the run ids so nobody has to re-derive it: the first green `ci` on `dev` since `2546937` (2026-08-19 15:37Z) is `32449945840`, nine runs later. |

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

---

## From 13-18 — an untracked `.claude/` directory at the repo root (NOT this plan's to fix)

`git status --short` reports `?? .claude/` on a tree that is otherwise clean. Its contents are agent
tooling and a leftover Claude Code worktree from an unrelated session (`launch.json`, and
`worktrees/product-roadmap-presentation-8ec4cd/` holding an HTML/PDF/PPTX deck). None of it is source,
none of it is this plan's, and none of it is generated by any npm script in this repository.

Left alone DELIBERATELY, under the scope boundary: 13-18 touches the cancellation money path, and a
`.gitignore` edit is neither caused by that work nor verifiable by it. The two honest options — ignore
the path, or delete the stale worktree — are both operator calls about tooling, and picking one inside
a money-path commit would bury it. Recorded here so the next reader knows it is known rather than
unnoticed.

---

## From 13-19 — four `checkout` visual baselines need regeneration on CI (D-101.2)

D-101.2 changes the checkout's way-back control from `variant="ghost"` to `variant="outline"` — a
deliberate visual change, because the defect was that the control was invisible. `checkout` is one of
the sixteen baselined surfaces in `e2e/visual/surfaces.spec.ts-snapshots/`, and it is `kind:
"document"`, so all four of its PNGs move:

    checkout-320-court-visual-linux.png    checkout-1280-court-visual-linux.png
    checkout-320-grove-visual-linux.png    checkout-1280-grove-visual-linux.png

**Nothing else moves.** Every other Phase-13 surface this plan touched — `booking-moment`,
`booking-confirmed`, `payment-pending`, `payment-reversed-*`, `booking-group` — is BLOCKED in
`src/lib/design/visual-baselines.ts` and has no baseline to break. Checked file-by-file against the
snapshot directory rather than assumed: the sixteen ids on disk are `auth-login`, `booking-not-found`,
`checkout`, `collision-notice`, `dev-theme`, `listing-detail`, `listing-lightbox`, `listing-sheet`,
`og-{invite,listing,root}`, `privacy`, `root-not-found`, `search-relax-band`, `search-results`,
`terms`, and `checkout` is the only one this plan's diff can reach.

**Why it is not done here.** Baselines are Linux-container artefacts minted by the `baselines.yml`
`workflow_dispatch` job; the phase's standing invariant is that **no baseline is ever minted locally**
on this machine, and this executor was instructed not to push. The regeneration is one dispatch after
the branch lands.

⚠ **The comparison run is the deliverable, never the generation run** — 13-16 recorded this and it
applies again: `baselines.yml` emits `::warning::These baselines have NOT been verified` about its own
output. Dispatch `baselines.yml`, then read the next `ci` run's `gate-visual` job. Until that happens,
`gate-visual` reports a diff on exactly those four PNGs and on nothing else, and that is the expected
state rather than a regression.
