// GATE-03 — THE declared live-region inventory. Every audited element that carries `aria-live`,
// `role="status"`, `role="alert"` or `role="timer"`, with the sentence it makes a screen reader say,
// the moment it says it, and the numbered rule its shape satisfies.
//
// ⚠ IT WAS "THE BOOKER PATH'S" INVENTORY UNTIL PLAN 14-14, AND THE HEADLINE ABOVE CHANGED WITH THE
// SET. The declared set now contains four SUPPLY-side files — a host's listing wizard, its address
// field, its photo step and the request row — so a title claiming the demand side would be a comment
// lying about a type. The rename is recorded at the set itself.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SET IS DECLARED LITERALLY, AND WHY THAT IS THE WHOLE POINT OF THE MODULE
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// GATE-03's text is *"the countdown timer and EVERY live status region announce once rather than per
// tick"*. "Every" is not a falsifiable quantifier until somebody says what it ranges over. A gate written
// over "every" that quietly means "the handful I happened to open" is green for exactly the reason it
// should be red, and nothing in a passing run distinguishes the two.
//
// The set was ELEVEN booker-path files with TEN deferred to Phase 13 and one to Phase 14. Plan 13-14
// discharged the ten (see the DISCHARGE section below), taking the set to SEVENTEEN with exactly one
// exclusion left. Plan 14-14 discharged that one: the set is TWENTY-EIGHT files and the exclusion list is
// EMPTY. It was TWENTY-ONE until plan 15-09 widened the membership rule past the host tooling to the
// ACCOUNT surfaces — the four `(auth)` screens and the profile form — which THE RENAME's rule had named
// as out of scope rather than excluded. Nothing was discharged to get there and nothing was excluded to
// pay for it: five files joined, seven rows landed, and the exclusion list is still empty.
//
// So the set is a const tuple, its exclusions are a sibling const with a `why` per entry, and the file
// count is pinned by a type-level assertion. Narrowing the gate's reach then costs a compile error and an
// edit somebody has to justify, instead of costing nothing.
//
// ⚠ AN EMPTY EXCLUSION LIST IS NOT THE SAME CLAIM AS A COMPLETE ONE, AND READING IT AS ONE IS THE ONE
// MISREADING THAT WOULD MAKE THIS FILE HARMFUL. Zero exclusions means every file this module KNOWS
// about is audited. It does not mean every live region in `src/` is: the membership rule below is what
// bounds the claim, and the NOT COVERED footer is what bounds it further. The list being empty is a
// state to be DEFENDED on the next widening, not a job that is finished.
//
// THE EXCLUSIONS WERE THIS MODULE'S MOST IMPORTANT CONTENT, and the eleven that are gone are the proof
// rather than a counter-example. They are the half a reader cannot reconstruct from the tree: "this file
// was looked at and deliberately left to a later phase" and "nobody has ever looked at this file"
// produce byte-identical scan results. Only one of them is a decision — and only a decision can be
// DISCHARGED, which is what the section below records happening to ten of the eleven and what plan
// 14-14 did to the last.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DISCHARGE (plan 13-14 · 13-UI-SPEC § Live Regions · D-88.2) — WHAT THE TEN EXCLUSIONS BECAME
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The footer below used to end with: *"THE EXCLUSIONS ARE A SCOPE BOUNDARY, NOT A VERDICT… Several are
// probably not [correct]."* Phase 13 owned that debt and no requirement ID named it, which is why
// 13-RESEARCH Pitfall 8 and 13-CONTEXT D-88.2 wrote it down. Each of the ten was audited against the
// seven rules and the verdict landed in code. The rule that decided six of them, in one sentence:
//
//     A LIVE REGION ANNOUNCES A CHANGE. A FRESHLY NAVIGATED PAGE IS NOT A CHANGE — IT IS A PAGE.
//
// On a fresh render a screen reader already reads from the top, so a region wrapped around static,
// server-rendered landing content announces either nothing or a duplicate of what was about to be read
// anyway. `ui/alert`'s hardcoded `role="alert"` is how that defect usually arrives (13-08 measured it on
// `top-up-nudge.tsx`: a static advisory announcing itself assertively on every navigation).
//
//   REMOVED — the region wrapped a page                    landed by
//   ─────────────────────────────────────────────────────  ─────────────────────────────────────────────
//   bookings/[id]/page.tsx   (declined + cancelled)         13-10
//   bookings/[id]/cancel/page.tsx                           13-06
//   bookings/[id]/group/page.tsx   (the load-failed card)   13-14 — and it could never have announced a
//                                                           change either: `RefreshGroupButton` runs
//                                                           `router.refresh()`, so a success UNMOUNTS
//                                                           the branch and a failure re-renders
//                                                           byte-identical text
//   payment-reversed-state.tsx                              13-04 — and NO focus move was added; the
//                                                           `<h1>` is already the first thing
//   expired-approval-state.tsx                              13-10
//   group/invite-card.tsx   (`InviteInactive`)              13-08
//
//   DECLARED — it genuinely changes under the user          rows below
//   ─────────────────────────────────────────────────────  ─────────────────────────────────────────────
//   pending-payment-state.tsx                               `pending-payment` (the one booking-detail
//                                                           surface that changes while you watch)
//   request-countdown.tsx                                   `request-countdown-digits` + `-threshold`
//   group/attendee-roster.tsx                               `group-attendee-removed`   ⎫ the two STATE-08
//   group/share-link-box.tsx                                `group-link-rotated`       ⎭ alerts
//   group/rsvp-confirmation.tsx                             `rsvp-recorded`
//   group/rsvp-form.tsx                                     `rsvp-refused`
//
// ⚠ TWO OF THE TEN NAMED A FILE THAT NO LONGER HOLDS THE REGION, AND THE ROWS ARE KEYED TO WHERE IT
// ACTUALLY IS. 13-UI-SPEC's table assigns "two STATE-08 alerts" to `bookings/[id]/group/page.tsx` and an
// "RSVP result" to `group/invite-card.tsx`. Measured, 13-05 put both alerts in the CLIENT ISLANDS that
// own the state that changes (`attendee-roster.tsx`, `share-link-box.tsx`) and the RSVP result lives in
// `rsvp-confirmation.tsx`, which `invite-card.tsx` does not render. A row describing a region its file
// does not have fails the scan's "no file is padding" assertion, so the declaration follows the markup.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE RENAME (plan 14-14) — WHY THE SET IS NO LONGER NAMED FOR THE BOOKER PATH
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 13-14 widened the set past the booker path and KEPT the old name, with the reason written down:
// three of its six additions were surfaces a booker never reaches (an organiser manages a group; an
// INVITEE, who may have no account at all, answers an RSVP), and renaming an exported symbol to widen a
// comment looked like churn. That reading survived exactly as long as the additions were still
// demand-side people on demand-side surfaces.
//
// Plan 14-14 added four SUPPLY-side files — the listing wizard's save state, its address field, its
// photo step and the host request row. A closed union that contains host files cannot keep a name
// asserting it contains none: this module's whole design is that its claims are compile-checked, and a
// name is a claim in a type position. So the set is `LIVE_REGION_FILES` and its derived union is
// `LiveRegionFile`, renamed in the same commit as the four additions, with every consumer moved with
// them.
//
// THE MEMBERSHIP RULE, which is what actually matters and is now stated without a side in it: *every
// file in `src/` that renders a live region on a journey this repository has audited — the demand-side
// journey (search, checkout and the post-booking lifecycle it hands off to), the supply-side host
// tooling Phase 14 owns, the account surfaces a person passes through to reach either, since
// plan 18-10 the INTERNAL FitOut Ops console, and — since plan 18.1-11 — the HOST-STANDING surfaces a
// host passes through to become supply at all.* What is left outside it is the `patterns/` skeletons
// that `tests/design/skeleton-a11y.test.tsx` gates instead. Those are OUT OF SCOPE rather than
// excluded, and the difference is the point: an exclusion is a decision recorded about a file this
// module knows about, and there are none left.
//
// ⚠ THE HOST-STANDING WIDENING IS THE SAME MOVE AGAIN, MADE A FOURTH TIME, AND THE CLAUSE IT REPLACES
// IS THE REASON IT WAS NEEDED. Until plan 18.1-11 the supply half of this rule named the host TOOLING
// — the wizard, the request row, the address field, the photo step — i.e. the surfaces a host uses to
// run a business they already have. `/host/verify` is upstream of all four: it is where a person ASKS
// to be allowed to sell, and its one region carries the sentence that says the ask was refused. A
// closed union that contains that file cannot keep a rule describing only the tooling downstream of
// it, for the reason the two widenings above give: this module's claims are compile-checked, and a
// membership rule is a claim in prose sitting on top of one.
//
// ⚠ THE OPS WIDENING IS THE SAME MOVE THE RENAME ABOVE RECORDS, MADE A THIRD TIME, AND IT IS NOT A
// FORMALITY. Phase 18 puts a live region on a STAFF-ONLY surface — a queue where a decision refused by
// the server has to be heard by the operator who took it. A closed union that contains an ops file
// cannot keep a rule asserting it contains none: this module's whole design is that its claims are
// compile-checked, and a membership rule is a claim in prose sitting on top of one. An internal tool is
// not exempt from any of the seven rules below, and 18-UI-SPEC says so in its own words — there is no
// "it's only for staff" carve-out anywhere in `tests/design/**` and this widening does not create one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SEVEN RULES (12-UI-SPEC § GATE-03), STATED ONCE SO NO ROW RE-DERIVES THEM
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1 the RESULT of something the user did      `role="status"` (implicitly polite). NEVER assertive.
//   2 a genuine failure needing a human         `role="alert"`. Occupancy, expiry and sold-out are NOT
//                                               failures and never get this role.
//   3 a ticking value                           `role="timer"` + `aria-live="off"` on the digits, plus a
//                                               SEPARATE polite region that changes only at declared
//                                               thresholds.
//   4 loading                                   `role="status" aria-busy="true"` with a non-empty
//                                               accessible name; every placeholder bar `aria-hidden`.
//   5 any live region                           has an accessible name, or is inside a region that does.
//   6 any outcome                               EXACTLY ONE live region announces it.
//   7 the whole booker path                     `aria-live="assertive"` is BANNED. Where an event must be
//                                               noticed the mechanism is *polite region + moved focus*.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// ⚠ THE MEASURED FACT EVERY `loading` ROW BELOW EXISTS BECAUSE OF
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `role="status"` is `nameFrom: author` in ARIA. A status region whose only child is an `sr-only` span
// therefore computes an accessible name of `""` — measured, not argued, in
// `tests/design/skeleton-a11y.test.tsx:150-166` and re-measured from scratch in
// `tests/design/live-regions.test.tsx`'s render half. The `aria-label` is the region's NAME; the
// `sr-only` child is the region's CONTENT. They are different mechanisms and a loading region wants
// both, because its visible content is a grid of `aria-hidden` placeholder bars — i.e. nothing.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THE NAME COMES FROM, AND WHY THAT IS DERIVED FROM `kind` RATHER THAN DECLARED PER ROW
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// 12-UI-SPEC's falsifiable claim #3 reads "every `role="status"` on that set resolves to a non-empty
// accessible name". Taken as a blanket universal that claim is FALSE of the tree the same document says
// to KEEP, and the contradiction is mechanical rather than a matter of taste:
//
//   `<p role="status">Someone else is confirming this time right now.</p>`   (reserve-actions.tsx)
//
// `status` takes no name from content, so that region's accessible name is `""` — and it is *correct*.
// Its CONTENT is the whole message; that content is what a screen reader speaks when the region appears.
// Bolting an `aria-label` onto it would name a region whose text already says everything, and on the
// VoiceOver/Safari pairing a named live region can be announced BY ITS NAME INSTEAD OF ITS CONTENT,
// which would replace a sentence the booker needs with a label nobody wrote for them. Making a gate green
// by degrading the thing it guards is the exact failure mode this milestone exists to remove.
//
// The property that is actually load-bearing is narrower and completely checkable:
//
//   A LIVE REGION WHOSE CONTENT IS DECORATIVE BY CONSTRUCTION MUST BE NAMED BY ITS AUTHOR.
//
// That is precisely the `loading` kind — its children are `aria-hidden` skeleton bars, so with no
// `aria-label` it announces the empty string to nobody, which is the defect
// `search-results.tsx:204-207` already records having fixed once. Every other kind carries its own
// sentence and is named by content.
//
// ⚠ …EXCEPT WHERE A REGION IS A WRAPPER, WHICH PHASE 13 SHIPPED FIVE OF AND PLAN 13-14 HAD TO ACCOUNT
// FOR RATHER THAN OUTLAW. `AUTHOR_NAMED_REGIONS` below is that account, and it is worth reading before
// deciding it is a loophole. The blanket ban this module used to hold — *a non-`loading` region carries
// NO author name* — was written over a tree in which every live region was a `<p>` holding one sentence.
// Phase 13 shipped five that are not: a `<div role="status">` whose announceable content is composed by
// a CHILD component (`MoneyStatement`, `PanelCard`, `AlertDescription`), sitting empty until an outcome
// lands. 13-02, 13-05 and 13-08 each named theirs, each recorded the same reason at the line, and
// `tests/booking/payment-states.test.tsx` pins one of the names with an assertion of its own.
//
// The property that is actually load-bearing survives intact, because the hazard the ban protects
// against is not "a name" but "a name that COMPETES with the sentence": on the VoiceOver/Safari pairing
// a named live region can be announced BY ITS NAME INSTEAD OF ITS CONTENT. All five names are two- or
// three-word LABELS ("Payment status", "Attendee removed", "Invite link updated", "RSVP recorded",
// "RSVP not saved") chosen so they neither duplicate nor paraphrase the sentence they sit on.
//
// So the ban became a CLOSED SET with a mandatory reason per entry — `LIVE_REGION_EXCLUSIONS`'s own
// mechanism, applied to the other axis — and the gate asserts it in BOTH directions: a named
// non-`loading` region that is not declared here fails, and a declaration whose region carries no name
// fails. Adding an `aria-label` to a content-named region still costs a compile-visible edit and a
// written argument; it is no longer impossible, which is the only honest state given five shipped,
// argued, test-pinned instances of it.
//
// So `kind` DECIDES the naming mechanism instead of a second field a row could set to whatever makes the
// scan pass:
//
//   kind          role          aria-live          aria-busy   name comes from
//   ───────────── ───────────── ────────────────── ─────────── ─────────────────────────────────────────
//   loading       status        (implicit polite)  "true"      REQUIRED `aria-label` — content is hidden
//   status        status        absent or polite   absent      its own text
//   alert         alert         absent             absent      its own text
//   timer         timer         "off"              absent      its own text (it never announces at all)
//   threshold     NONE          conditional polite absent      its own text
//
// and the gate asserts the mapping in BOTH directions: a `loading` row without an `aria-label` fails, and
// an element carrying `aria-busy="true"` that is declared as anything other than `loading` also fails —
// so the label requirement cannot be dodged by relabelling a skeleton as a `status`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// `threshold` IS A KIND BECAUSE A ROLE WOULD BREAK THE ONE PROPERTY GATE-03 IS NAMED FOR
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// There is exactly one region on this path that carries `aria-live` and NO role:
// `hold-countdown.tsx`'s `sr-only` span. Adding `role="status"` to it — which is what "every live region
// carries a role" would demand, and which matches the shipped idiom everywhere else — would DESTROY the
// announce-once property plan 12-03 measured in two layers.
//
// The mechanism, in one sentence: on expiry that span drops its `aria-live` attribute while KEEPING its
// text, so it stops being a live region without its text appearing to change. `role="status"` is a
// PERMANENT implicit `aria-live="polite"`, so a role on that element would keep it live after the
// attribute is gone — and `HoldExpiredState` would then be the second region announcing one event, which
// is rule 6's defect arriving through rule 5's fix. The role-less shape is load-bearing. It gets a named
// kind so that it is visibly a decision, and the type-level count keeps it at one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// HOW A ROW IS KEYED TO AN ELEMENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `file` + `kind` + `at`, where `at` is the 1-based ordinal among regions of the SAME KIND in the SAME
// FILE, in source order. `slot-picker.tsx` renders two `role="status"` regions and is the reason an
// ordinal exists at all.
//
// Keyed within a kind rather than across a file on purpose: adding a `role="alert"` to `slot-picker.tsx`
// then leaves both existing `status` rows keyed exactly as they were, so the scan reports ONE
// present-but-undeclared region instead of three cascading mismatches. A gate whose message is a
// cascade is a gate people learn to skim.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A TYPED MODULE — `selector-contract.ts`'s argument, unchanged
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A const tuple plus a TOTAL `Record` over the union it derives. Adding a name to `LIVE_REGION_IDS`
// without adding its row is a COMPILE error, not a review comment. `Partial<Record<…>>` and an index
// signature are both REFUSED here for the reason `selector-contract.ts:31-36` records: both compile
// silently and ship a live region nobody stated a reason for.
//
// OBSERVED RED (a) — THE MISSING ROW. Watched rather than assumed, 18 August 2026. The
// `"hold-countdown-threshold"` row was deleted from `LIVE_REGIONS` and nothing else changed.
// `npx tsc --noEmit` → exit code 2, ONE error, verbatim (wrapped here only for the 100-column margin;
// the line number is the one the probe reported, i.e. measured on the file with the row already gone):
//
//   src/lib/design/live-regions.ts(400,14): error TS2741: Property '"hold-countdown-threshold"' is
//   missing in type '{ "calendar-day-loading": { file: "src/components/availability/availability-
//   calendar.tsx"; kind: "loading"; at: number; announces: string; why: string; }; "calendar-day-error":
//   { file: "src/components/availability/availability-calendar.tsx"; kind: "alert"; at: number;
//   announces: string; why: string; }; ... 9 more .....' but required in type
//   'Record<"calendar-day-loading" | "calendar-day-error" | "date-pass-day-loading" |
//   "date-pass-day-error" | "slot-picker-pending-helper" | "slot-picker-gap-hint" | "spots-left-chip" |
//   ... 5 more ... | "search-results-fetch-error", LiveRegionRow>'.
//
// Row restored → `npx tsc --noEmit` exit 0. TWO things in that output are why this shape was chosen over
// a lookup with a fallback: the error names the MISSING id in its first clause, so the fix is legible
// without reading the type, and the required type prints the union MEMBER BY MEMBER rather than as the
// alias, so the id is visible in the expectation too.
//
// OBSERVED RED (b) — THE SHRINKING SET, which is the failure this module was written for.
// `"src/components/availability/spots-left-chip.tsx"` deleted from the declared file set (which carried
// its pre-14-14 name at the time — see THE RENAME above), nothing else changed. `npx tsc --noEmit` →
// exit 2, TWO errors, verbatim:
//
//   src/lib/design/live-regions.ts(489,5): error TS2820: Type
//   '"src/components/availability/spots-left-chip.tsx"' is not assignable to type
//   '"src/components/availability/availability-calendar.tsx" |
//   "src/components/availability/date-pass-picker.tsx" |
//   "src/components/availability/slot-picker.tsx" | "src/components/booking/book-cta.tsx" |
//   "src/components/booking/hold-countdown.tsx" | "src/components/booking/hold-expired-state.tsx" |
//   "src/components/bookin...'. Did you mean '"src/components/availability/slot-picker.tsx"'?
//   src/lib/design/live-regions.ts(622,3): error TS2344: Type 'false' does not satisfy the constraint
//   'true'.
//
// Restored → exit 0. THE SECOND ERROR IS THE ONE THAT MATTERS AND THE FIRST IS WHY IT CANNOT BE
// SILENCED CHEAPLY. Deleting a path fails at the count assertion, and deleting the path together with
// its rows STILL fails there — so the only way to shrink the audited set is to edit the alias, which is
// an edit whose whole content is the number somebody is lowering. That is the "deliberate, visible act"
// this gate exists to force. TS2820's "Did you mean" clause is also load-bearing in the ordinary case:
// a mistyped path in a row gets a spelling suggestion rather than a wall of union members.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// PLANS 12-12 AND 12-13 EACH ADD ONE FILE, IN THE SAME COMMIT AS THE COMPONENT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   12-12 → `src/components/search/relax-band.tsx`        (the named relaxation band, rule 1) — DONE
//   12-13 → `src/components/booking/collision-notice.tsx` (STATE-07's in-place notice, rules 1+6+7) — DONE
//
// Each lands its path in the declared file set, its row(s) in `LIVE_REGIONS`, and BUMPS the
// count alias — renaming it as it goes, so the number in the name and the number in the assertion can
// never disagree. The count moving is the signal; a count that silently tracks the tuple's length would
// assert nothing at all. 12-12 renamed `DeclaredFileCountIsNine` → `DeclaredFileCountIsTen` and moved
// `DECLARED_FILE_COUNT` in `tests/design/live-regions.test.tsx` with it, in one commit; 12-13 made it
// `…IsEleven` the same way. The line numbers quoted in the two observed reds above are from the
// nine-file tree and have not been re-measured since — the ERRORS are the record, not the offsets.
//
// 12-13 additionally owns rule 6's other half: `book-cta.tsx`'s notice and the collision notice must
// never be mounted together. Source-side that is now STRUCTURAL — `book-cta.tsx` renders its own notice
// only while no collision is set — but the claim is about a rendered DOCUMENT, so the measurement lives
// in `e2e/collision-in-place.spec.ts`, which sums `status` and `alert` across the whole document. See
// this module's NOT COVERED footer.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THIS FILE LIVES, AND WHY IT MATTERS HERE TOO
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/design/` is outside the DS-13 leak gate's scanned tree (`config/design-leak-patterns.mjs` →
// LEAK_SCAN_PREFIXES covers `src/app/**` and `src/components/**` only) — the same reason
// `measurements.ts:14-21`, `contrast-pairs.ts:11-14` and `selector-contract.ts:91-95` give for theirs.
// This module QUOTES markup: it names `aria-live="assertive"`, the banned value, and it quotes the exact
// `sr-only` sentences two components render. A home inside the scanned tree would need a per-line
// exemption to say any of that honestly.
//
// It is still inside Tailwind's source root (`globals.css`'s `@import "tailwindcss" source("../")`,
// rooted at `src/`), which costs nothing here — this module declares no classes — but is the reason the
// directory was chosen over `config/` in the first place.

// ---------------------------------------------------------------------------
// The declared set
// ---------------------------------------------------------------------------

/**
 * THE TWENTY-EIGHT FILES GATE-03 IS A CLAIM ABOUT.
 *
 * Ordered by surface — availability, then booking, then search, then the group lifecycle, then the host
 * tooling, then the account surfaces plan 15-09 added — rather than alphabetically, because the reading question this list gets asked is "does the
 * gate cover the checkout", not "where is X in the alphabet".
 *
 * ⚠ RENAMED FROM ITS BOOKER-PATH SPELLING BY PLAN 14-14, in the same commit as the four host files at
 * the bottom of the list. See THE RENAME in the header for why a comment could not carry that widening
 * a second time.
 *
 * Forward slashes, always. Every consumer normalises `path.relative`'s Windows backslashes before
 * comparing (`tests/design/sheet-absent.test.ts:249-256`'s idiom); without that, every prefix and
 * membership check here silently stops matching and each scan passes over an empty list. The wizard's
 * path contains a route group and a dynamic segment (`(host)`, `[id]`); both are ordinary characters to
 * every consumer here, and neither is a glob.
 */
export const LIVE_REGION_FILES = [
  // ─── availability ───────────────────────────────────────────────────────────────────────────────
  "src/components/availability/availability-calendar.tsx",
  "src/components/availability/date-pass-picker.tsx",
  "src/components/availability/slot-picker.tsx",
  "src/components/availability/spots-left-chip.tsx",
  // ─── booking ────────────────────────────────────────────────────────────────────────────────────
  "src/components/booking/book-cta.tsx",
  "src/components/booking/collision-notice.tsx",
  "src/components/booking/hold-countdown.tsx",
  "src/components/booking/hold-expired-state.tsx",
  "src/components/booking/pending-payment-state.tsx",
  "src/components/booking/request-countdown.tsx",
  "src/components/booking/reserve-actions.tsx",
  // ─── search ─────────────────────────────────────────────────────────────────────────────────────
  "src/components/search/search-results.tsx",
  "src/components/search/search-experience.tsx",
  // ─── the group lifecycle (plan 13-14's discharge — see the header) ──────────────────────────────
  "src/components/group/attendee-roster.tsx",
  "src/components/group/rsvp-confirmation.tsx",
  "src/components/group/rsvp-form.tsx",
  "src/components/group/share-link-box.tsx",
  // ─── the host tooling (plan 14-14's discharge — see THE RENAME in the header) ────────────────────
  "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
  "src/components/host/request-row.tsx",
  "src/components/listing/address-autocomplete.tsx",
  "src/components/listing/photo-uploader.tsx",
  // ─── the auth surfaces + profile (plan 15-09) ───────────────────────────────────────────────────
  //
  // TWO REGIONS WERE REMOVED RATHER THAN DECLARED, and a reader who comes here looking for them
  // should find out why instead of concluding the inventory missed them. Plan 15-07 deleted the
  // `ResetNotice` region on the login page and the reset page's missing-token notice. Both were
  // static-on-arrival content wrapped in a region, and the rule is the one the header's DISCHARGE
  // section states once for the whole module:
  //
  //     A LIVE REGION ANNOUNCES A CHANGE. A FRESHLY NAVIGATED PAGE IS NOT A CHANGE — IT IS A PAGE.
  //
  // A screen reader already reads a fresh render from the top, so a region around server-rendered
  // arrival content announces either nothing or a duplicate of what was about to be read anyway.
  // That is the third and fourth time this repository has found the same defect (13-14 removed six,
  // 14-14 found a seventh), which is why the rule is stated rather than re-derived per surface.
  //
  // Note what these five files are NOT: they were named as OUT OF SCOPE by THE RENAME's membership
  // rule ("what is left outside it is the auth/profile forms…"), not excluded. Plan 15-09 widens
  // the rule rather than discharging an exclusion — `LIVE_REGION_EXCLUSIONS` was empty before this
  // block and is empty after it. The membership rule now reads: *every file in `src/` that renders
  // a live region on a journey this repository has audited — the demand-side journey, the
  // supply-side host tooling, and the account surfaces a person passes through to reach either.*
  "src/app/(auth)/login/page.tsx",
  "src/app/(auth)/signup/page.tsx",
  "src/app/(auth)/forgot-password/page.tsx",
  "src/app/(auth)/reset-password/page.tsx",
  "src/app/(app)/profile/profile-form.tsx",
  // ─── the avatar framing step (plan 16-09) ───────────────────────────────────────────────────────
  //
  // Same membership rule, same journey: the account surface a person passes through to give
  // themselves a face. The crop dialog is opened FROM the profile form's avatar block, and it
  // carries the one announcement that block cannot make on its behalf — a save that failed AFTER
  // the person confirmed their framing, which has to be heard inside the overlay that is still
  // open rather than behind it.
  //
  // ⚠ TWENTY-SEVEN WAS A DELIBERATE PASS-THROUGH, AND PLAN 16-10 CLOSED IT. 16-UI-SPEC's
  // declared-inventory budget says 26 -> 28, because Phase 16 authors alerts in TWO new files. The
  // dialog arrived alone in plan 16-09 (27) and `avatar-field.tsx` joined it here (28). Each file's
  // row lands in the same commit as its element, which is the rule that makes this inventory worth
  // having — the intermediate rename is the cost of that rule, and it is named here so a reader who
  // finds the one-file-short spelling of the count alias in the history does not read it as a
  // miscount. (The obsolete alias NAME is described rather than spelled, here and in the rename
  // chain below: plan 16-10's acceptance greps this module to prove the old name is gone, and a
  // comment that spelled it would fail the very check it is explaining. Same resolution, and the
  // same reason, as this module's other worked-around tokens.)
  //
  // The FIELD carries the four pre-dialog refusals — wrong type, over the size cap, undecodable,
  // too small — every one of which is announced on the page with no overlay ever opening. The
  // DIALOG carries the one announcement the field cannot make on its behalf: a save that failed
  // after the person confirmed their framing, which has to be heard inside the overlay that is
  // still open rather than behind it. Between plan 16-10 and plan 16-11 the avatar refusal exists
  // in `profile-form.tsx` AND here, and both are declared; that is correct rather than duplicated,
  // because the block does not LEAVE the form until 16-11's extraction and a row moves in the same
  // commit as the code that moved it.
  "src/components/profile/avatar-field.tsx",
  "src/components/profile/image-crop-dialog.tsx",
  // ─── the internal ops console (plan 18-10 — see THE OPS WIDENING in the header) ─────────────────
  //
  // The queue row's decision controls. ONE region, shared by approve and reject, carrying the server
  // action's own refusal sentence — a lapsed decision another operator already took, a listing that
  // left `pending` while the queue was open, a booking whose payout left between paint and press.
  //
  // ⚠ THE SUCCESS PATH DELIBERATELY OWES NO REGION. A recorded decision takes the row off the queue,
  // so there is no surface left to write on by the time the report is due and the toast is the only
  // possible one. A refusal leaves the row exactly where it was, and the sentence belongs on it.
  "src/components/ops/ops-decision-actions.tsx",
  // ─── the host-standing surface (plan 18.1-11 — see THE HOST-STANDING WIDENING in the header) ────
  //
  // `/host/verify`'s submission form. ONE region, shared by every branch the action can refuse with —
  // an unconfirmed email, a phone outside the bound, the burst guard, the calm 0-row no-op that
  // covers five source states at once, and a checking partner that would not answer. A press can only
  // ever have refused one thing, so one slot is the whole requirement.
  //
  // ⚠ THE SUCCESS PATH OWES NO REGION HERE EITHER, AND FOR A DIFFERENT REASON THAN THE OPS ROW'S. A
  // successful ask does not take the surface away — it takes the HOST away, into the partner's hosted
  // flow on another origin. There is no moment at which an announcement could be heard, which is a
  // stronger absence than the ops row's and is recorded rather than assumed.
  "src/components/host/verification-panel.tsx",
  // ─── the ops contact reveal (plan 18.1-13 — the second step of the phase's 29 -> 31 budget) ─────
  //
  // The queue row's host-contact affordance (OPS-06 / D-257 / D-271). ONE region, carrying the
  // reveal action's own refusal sentence — a read that failed, or the burst guard. Same membership
  // half as the decision controls one file up: the internal ops console.
  //
  // ⚠ AND THIS IS THE FILE WHERE THE SUCCESS PATH OWES NO REGION FOR THE THIRD DISTINCT REASON IN
  // THIS SET, which is worth naming because "no success region" has now been the right answer three
  // times for three different mechanisms. The ops decision row: the surface DISAPPEARS. The host
  // verification panel: the HOST disappears, to another origin. Here NEITHER happens — the row stays
  // and the operator stays — and the announcement is the MOVED FOCUS (GATE-03 rule 7): the revealed
  // `Email` value takes focus, which speaks the anchor and its `<dt>` context and lands the caret on
  // the operator's next action in one move. A polite region saying "contact shown" beside a focus
  // move would be two announcements for one outcome, which is the shape rule 6 forbids.
  "src/components/ops/ops-contact-reveal.tsx",
] as const;

/** The closed union every row's `file` is typed against. */
export type LiveRegionFile = (typeof LIVE_REGION_FILES)[number];

/** One excluded file. `why` is mandatory and names the OWNING phase — a row without one is not a row. */
export type LiveRegionExclusion = {
  readonly file: string;
  readonly why: string;
};

/**
 * The floor an exclusion's `why` must clear, in characters.
 *
 * MEASURED, not chosen: `tests/design/live-regions.test.tsx`'s probe (0) fired on the first run against
 * an unmutated tree, over a row whose entire `why` read `"Phase 13's RSVP form (BFLOW-08)."` — 33
 * characters, a TAG rather than a reason. The floor sits above that and below every real sentence any
 * of the eleven exclusions ever carried.
 */
export const MIN_EXCLUSION_REASON_CHARS = 40;

/**
 * IS THIS EXCLUSION'S REASON TOO THIN TO BE ONE? — the rule, as a function rather than as a regex the
 * gate restates.
 *
 * Two conditions, and both matter for the same reason. It must NAME A PHASE, because "this file was
 * looked at and deliberately left to a later phase" is the entire content of an exclusion and an
 * unowned exclusion is just a file somebody chose not to check. And it must be a SENTENCE rather than
 * a tag, which is what the character floor above is for.
 *
 * ⚠ THE PHASE PATTERN IS GENERAL (`Phase <digits>`) AND USED TO BE SPECIFIC (`Phase 13` or `Phase 14`).
 * It was narrowed to the two phases that happened to own rows, which was safe only while rows existed;
 * with the list at zero a two-phase pattern is a pattern with nothing left to match and it would have
 * to be widened by whoever added the next row — at which point widening it and satisfying it are the
 * same edit, done by the same person, and the check has stopped being one.
 *
 * EXPORTED so `tests/design/live-regions.test.tsx` reads the rule instead of restating it — a second
 * copy of this predicate is a second place for it to be wrong — and, since plan 14-14 emptied the list,
 * so the gate can keep the rule EXERCISED against a fixture row. A filter run over an empty list is a
 * filter that has never been run.
 */
export function exclusionReasonIsThin(row: LiveRegionExclusion): boolean {
  return !/Phase\s+\d+/.test(row.why) || row.why.length < MIN_EXCLUSION_REASON_CHARS;
}

/**
 * EVERY FILE IN `src/` THAT CARRIES `aria-live` AND IS DELIBERATELY NOT AUDITED HERE, WITH ITS REASON.
 *
 * ZERO ROWS, as of plan 14-14. It was ELEVEN — ten of them Phase 13's, discharged by the audit the
 * header describes, and then ONE, whose own stated reason named Phase 14 as its owner: auditing the
 * host wizard early would have frozen markup that phase was about to rewrite. That markup is rewritten,
 * so the reason expired and the row went with it. `address-autocomplete.tsx` is in the declared set
 * above, with two of the four rows this plan added.
 *
 * ⚠ EMPTY IS A STATE, NOT AN ACHIEVEMENT. It says every file this module knows about is audited; it does
 * not say every live region in `src/` is. The header's membership rule is what bounds the claim and the
 * NOT COVERED footer bounds it further. The next widening either brings its file inside the set or adds
 * a row here with a real sentence — and `exclusionReasonIsThin` above is still the shape that sentence
 * has to have, kept exercised against a fixture by the gate for exactly as long as this list is empty.
 *
 * ⚠ THE ARITHMETIC, RE-MEASURED FROM SCRATCH on 23 August 2026 against the tree plan 14-14 produces, and
 * NOT carried forward from the note this paragraph replaces — that note recorded its own predecessor
 * having drifted, which is the reason neither number is ever inherited. The two ways of counting
 * disagree, which is why both are given, and the commands that produced them are in `14-14-SUMMARY.md`:
 *
 *   • BY MARKUP, which is what the gate actually reads. An AST walk of every `.tsx` under `src/` finds
 *     `aria-live` on the elements of SEVEN files and TEN elements: `slot-picker.tsx` (×2),
 *     `spots-left-chip.tsx`, `hold-countdown.tsx` (×2), `request-countdown.tsx` (×2),
 *     `rsvp-confirmation.tsx`, `rsvp-form.tsx` and `address-autocomplete.tsx`. ALL SEVEN ARE NOW
 *     DECLARED — which is what an empty exclusion list means at this scale, and it is why the sentence
 *     this paragraph replaced ("the two lists partition the attribute exactly") no longer describes two
 *     lists. The file count is unmoved from the previous measurement; the ELEMENT count is the honest
 *     one, because two of those files carry the attribute twice (a `timer` at the silent politeness
 *     level plus its separate `threshold` region — rule 3's pair, once per ticking value).
 *   • BY TEXT, which is what `grep -rl aria-live src/ --include=*.tsx` reports: THIRTEEN files — it was
 *     19 at plan 12-13's measurement and 13 at 13-14's. The extra SIX are PROSE, and the composition is
 *     unchanged from 13-14's reading. Five are declared files explaining regions they hold under a ROLE
 *     rather than the attribute (`availability-calendar.tsx`, `date-pass-picker.tsx`,
 *     `collision-notice.tsx`, `hold-expired-state.tsx`, `search-results.tsx`), and the sixth is
 *     `invite-card.tsx`, which appears in the grep on the strength of the comment explaining why 13-08
 *     REMOVED its region — the one file in the tree that a text scan reports and the declared set
 *     rightly omits. A text scan cannot tell an explanation from a declaration, which is why
 *     `tests/design/live-regions.test.tsx` strips comments before its own text scan and why this module
 *     lives outside the DS-13 leak gate's scanned tree.
 *
 * The declared SET is twenty-eight files, which is larger than either count because a `role="status"`,
 * `role="alert"` or `role="timer"` IS a live region without carrying the attribute at all —
 * `book-cta.tsx`, `reserve-actions.tsx`, `relax-band.tsx`, `collision-notice.tsx`,
 * `pending-payment-state.tsx`, `attendee-roster.tsx`, `share-link-box.tsx`, `wizard.tsx`,
 * `request-row.tsx` and `photo-uploader.tsx` are all in that shape. THREE OF THE FOUR FILES PLAN 14-14
 * ADDED ARE IN IT, which is why widening the set moved neither measured number.
 *
 * ⚠ AND THE ONE FILE PLAN 16-09 ADDED IS IN IT AS WELL, so neither measured number moved a third
 * time either. `image-crop-dialog.tsx` renders a bare `role="alert"` on a `<p>` and carries the
 * attribute nowhere, so the AST walk still finds seven files and ten elements and the text grep still
 * finds thirteen. The declared set is twenty-eight.
 *
 * ⚠ ALL FIVE FILES PLAN 15-09 ADDED ARE IN IT TOO, so neither measured number moved a second time.
 * Every one of the seven account-surface regions is a bare `role="alert"` or `role="status"` on a `<p>`
 * — not one of them carries the attribute — so an AST walk for `aria-live` still finds seven files and
 * ten elements, and the text grep still finds thirteen. The two counts above are therefore CARRIED
 * rather than re-measured for this widening, which is the one case where carrying a number forward is
 * honest: the reason they did not move is stated, and it is checkable in five files.
 */
export const LIVE_REGION_EXCLUSIONS: readonly LiveRegionExclusion[] = [];

// ---------------------------------------------------------------------------
// The rows
// ---------------------------------------------------------------------------

/**
 * The SHAPE a region has, which decides every attribute the gate demands of it.
 *
 * `loading` is not "a status region that happens to be busy" — it is the one kind whose visible content
 * is `aria-hidden` by construction, which is why it and only it must be named by its author. See the
 * header's mapping table; the gate asserts it in both directions.
 *
 * `threshold` is the role-less polite region, and there is exactly one. See the header for why giving it
 * a role would break the property this whole gate is named for.
 */
export type LiveRegionKind = "status" | "alert" | "timer" | "loading" | "threshold";

/**
 * The kinds whose accessible name MUST come from an author-supplied attribute rather than from content.
 *
 * Exported so `tests/design/live-regions.test.tsx` reads the rule instead of restating it — a second copy
 * of this list is a second place for it to be wrong.
 */
export const AUTHOR_NAMED_KINDS: readonly LiveRegionKind[] = ["loading"];

/**
 * One region whose author-supplied name is a DECLARED exception to "every other kind is named by its
 * content". `why` is mandatory and must say why this region has no content of its own to be named by —
 * a row without one is not a row.
 */
export type AuthorNamedRegion = {
  readonly id: LiveRegionId;
  /** The exact label the markup renders, so a reader can check the LABEL-not-a-copy rule by eye. */
  readonly name: string;
  readonly why: string;
};

/** One declared live region. Every field is mandatory; none has a default. */
export type LiveRegionRow = {
  /** The file that renders it, as a forward-slash path from the repo root. */
  readonly file: LiveRegionFile;
  /** Its shape. Decides the required attributes AND where its accessible name comes from. */
  readonly kind: LiveRegionKind;
  /**
   * 1-based ordinal among regions of the SAME KIND in the SAME FILE, in source order.
   *
   * `slot-picker.tsx` is the reason this field exists: two `role="status"` regions, mutually exclusive
   * at runtime but both present in the source the scan reads.
   */
  readonly at: number;
  /**
   * WHAT text change a screen reader hears, and WHEN.
   *
   * A sentence, not a noun. "the pending state" is not an answer to either half of that question, and a
   * row that cannot say what the user hears is a row describing markup rather than an announcement.
   */
  readonly announces: string;
  /**
   * WHICH of the seven numbered rules this shape satisfies, and why this shape rather than another.
   *
   * `contrast-pairs.ts`'s rule, applied here: a row whose reason is "so it announces" is a row that
   * should not exist — that is true of every live region ever written, and an inventory that accepts it
   * is a convention rather than a contract.
   */
  readonly why: string;
};

/**
 * Every region on the declared set, one id per REGION (not per file). Ordered by file, matching
 * `LIVE_REGION_FILES`, then by source order within the file.
 *
 * THIRTY-EIGHT today (sixteen until plan 13-14's discharge added seven, twenty-three until plan
 * 14-14's added four, then twenty-seven until plan 15-09's five account surfaces added seven, and one
 * each from plans 16-09, 16-10, 18-10, 18.1-11 and 18.1-13).
 *
 * ⚠ THIS PROSE READ "THIRTY-FOUR" AGAINST A LIST OF THIRTY-SEVEN, and the drift is corrected here
 * rather than carried: the last three single-region plans each added an id without moving this
 * sentence, which is exactly the failure the file-count alias exists to make impossible for FILES and
 * which nothing makes impossible for IDS. See the note below on why that is tolerable —
 * The number is deliberately NOT pinned by a type-level assertion, unlike the file
 * count: `tests/design/live-regions.test.tsx`'s SCAN 2 asserts this set equals the set of regions
 * actually present in the tree, which is strictly stronger than agreeing with a literal. A count
 * assertion beside a set assertion would only ever fail at the same moment, one line earlier and with
 * less information.
 */
export const LIVE_REGION_IDS = [
  // availability-calendar.tsx
  "calendar-day-loading",
  "calendar-month-loading",
  "calendar-day-error",
  // date-pass-picker.tsx
  "date-pass-day-loading",
  "date-pass-day-error",
  // slot-picker.tsx
  "slot-picker-pending-helper",
  "slot-picker-gap-hint",
  // spots-left-chip.tsx
  "spots-left-chip",
  // book-cta.tsx
  "book-cta-notice",
  // collision-notice.tsx
  "collision-notice",
  // hold-countdown.tsx
  "hold-countdown-digits",
  "hold-countdown-threshold",
  // hold-expired-state.tsx
  "hold-expired-state",
  // pending-payment-state.tsx
  "pending-payment",
  // request-countdown.tsx
  "request-countdown-digits",
  "request-countdown-threshold",
  // reserve-actions.tsx
  "reserve-actions-notice",
  // search-results.tsx
  "search-results-fetch-error",
  // search-experience.tsx
  "search-progress",
  // attendee-roster.tsx
  "group-attendee-removed",
  // rsvp-confirmation.tsx
  "rsvp-recorded",
  // rsvp-form.tsx
  "rsvp-refused",
  // share-link-box.tsx
  "group-link-rotated",
  // wizard.tsx
  "wizard-save-state",
  // request-row.tsx
  "request-action-refusal",
  // address-autocomplete.tsx
  "address-lookup-result",
  // photo-uploader.tsx
  "photo-uploader-requirement",
  // (auth)/login/page.tsx
  "login-form-error",
  // (auth)/signup/page.tsx
  "signup-form-error",
  // (auth)/forgot-password/page.tsx
  "forgot-request-result",
  // (auth)/reset-password/page.tsx
  "reset-form-error",
  // (app)/profile/profile-form.tsx — ONE alert and one status since plan 16-11 extracted the avatar
  // block, so the save refusal is now the file's only `alert` and its ordinal is 1.
  "profile-form-error",
  "profile-save-result",
  // profile/avatar-field.tsx — one region, one kind, so one ordinal.
  "avatar-field-refusal",
  // profile/image-crop-dialog.tsx — one region, one kind, so one ordinal.
  "avatar-crop-save-error",
  // ops/ops-decision-actions.tsx — one region, one kind, so one ordinal.
  "ops-decision-refusal",
  // host/verification-panel.tsx — one region, one kind, so one ordinal. The form is written ONCE and
  // rendered from two of the six panels, which is what keeps this singular: two copies of that markup
  // would be two regions in one file, and the count is a claim about the DOM rather than about what
  // is visible at a given moment.
  "host-verification-refusal",
  // ops/ops-contact-reveal.tsx — one region, one kind, so one ordinal. The island renders EITHER the
  // control (with this slot beneath it) or the two revealed values, never both, so there is exactly
  // one `role="status"` in the source however many rows the queue holds.
  "ops-contact-refusal",
] as const;

/** The closed union every row is typed against. */
export type LiveRegionId = (typeof LIVE_REGION_IDS)[number];

/**
 * Every region's row. A TOTAL `Record` over the closed union on purpose — this is the compile gate, and
 * the OBSERVED RED in the header is it being watched.
 */
export const LIVE_REGIONS: Record<LiveRegionId, LiveRegionRow> = {
  // ─── availability-calendar.tsx ──────────────────────────────────────────────────────────────────
  "calendar-day-loading": {
    file: "src/components/availability/availability-calendar.tsx",
    kind: "loading",
    at: 1,
    announces:
      '"Loading times for Friday, Aug 21" — once, at the moment the day panel swaps to its skeleton ' +
      "after a day is picked. It says nothing again; the arriving slots are not a live update, they " +
      "replace the region entirely.",
    why:
      "RULE 4 + RULE 5, and it is the correction this plan exists for. It shipped as a bare " +
      '`aria-live="polite" aria-busy="true"` on a `<div>` with no role and no name, wrapping eight ' +
      "skeleton chips — a live region whose entire announceable content was placeholder bars, i.e. a " +
      "region that announced the empty string. `role=\"status\"` is nameFrom:author, so the " +
      "`aria-label` is what gives it a name and the `sr-only` child is what gives it something to say; " +
      "both are present and they are byte-identical. Every bar is `aria-hidden` so a decorative 1.09:1 " +
      "placeholder is not read out as content.",
  },
  "calendar-month-loading": {
    file: "src/components/availability/availability-calendar.tsx",
    kind: "loading",
    at: 2,
    announces:
      '"Loading the calendar" — once, when a surface mounts `CalendarMonthSkeleton` as its own busy ' +
      "region while the month grid does not exist yet. It says nothing again; the arriving grid " +
      "replaces the plate rather than updating it.",
    why:
      "RULE 4 + RULE 5, the same shape as the day plate above it: `role=\"status\"` is nameFrom:author, " +
      "so the `aria-label` names the region and the `sr-only` child gives it something to say, both " +
      "from ONE binding, with every placeholder bar `aria-hidden` so a decorative 1.09:1 fill is never " +
      "read as content. " +
      "⚠ ITS ONE SHIPPED CALL SITE ANNOUNCES NOTHING, AND THAT IS RULE 6 RATHER THAN AN OVERSIGHT. " +
      "`src/app/listings/[id]/(detail)/loading.tsx` already renders `PanelSkeleton` as that route's " +
      "one busy region for one wait, so it mounts this plate inside an `aria-hidden` wrapper — the " +
      "same treatment, for the same reason, that its mosaic plate has carried since 12-07. The row " +
      "exists anyway because the REGION exists in this file's source and SCAN 2 compares source " +
      "against declarations; and because 12-10's booking sheet is a surface that will mount it as its " +
      "own region, at which point the contract above is what it inherits. A row that quietly said " +
      '"announced on the listing page" would be the kind of stated-reason-gone-false this module was ' +
      "written to prevent.",
  },
  "calendar-day-error": {
    file: "src/components/availability/availability-calendar.tsx",
    kind: "alert",
    at: 1,
    announces:
      '"Couldn\'t load this day / Something went wrong fetching availability. Pick the day again to ' +
      'retry." — once, when the day fetch rejects.',
    why:
      "RULE 2, and it is KEPT rather than softened. A fetch that FAILED is a genuine failure needing a " +
      "human: the booker is looking at a day whose availability is unknown, and the next action is " +
      "theirs. This is the one shape on the whole declared set that earns `alert` — occupancy, expiry " +
      "and sold-out are all normal states and none of them gets this role.",
  },

  // ─── date-pass-picker.tsx ───────────────────────────────────────────────────────────────────────
  "date-pass-day-loading": {
    file: "src/components/availability/date-pass-picker.tsx",
    kind: "loading",
    at: 1,
    announces:
      '"Loading availability for Friday, Aug 21" — once, when the day panel swaps to its single panel ' +
      "skeleton after a day is picked.",
    why:
      "RULE 4 + RULE 5, the same correction as the calendar's and for the same measured reason. The " +
      "SENTENCE differs deliberately: a drop-in listing sells a DAY PASS, so there are no times " +
      "arriving and announcing \"Loading times\" would promise a control this surface never renders. " +
      "One panel skeleton rather than eight chips, `aria-hidden`, because one answer is coming.",
  },
  "date-pass-day-error": {
    file: "src/components/availability/date-pass-picker.tsx",
    kind: "alert",
    at: 1,
    announces:
      '"Couldn\'t load this day / Something went wrong fetching availability. Pick the day again to ' +
      'retry." — once, when the day fetch rejects.',
    why: "RULE 2. KEPT, identical argument to the calendar's day error — the same failure, same words.",
  },

  // ─── slot-picker.tsx ────────────────────────────────────────────────────────────────────────────
  "slot-picker-pending-helper": {
    file: "src/components/availability/slot-picker.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Start selected — pick an end hour." — once, the moment a start hour is anchored and no end has ' +
      "been chosen yet. It disappears without a second announcement when the run completes.",
    why:
      "RULE 5, and this is the second correction. It shipped as a bare `aria-live=\"polite\"` on a " +
      "`<p>` with no role; adding `role=\"status\"` makes it a named KIND of region rather than an " +
      "anonymous one, and matches the gap hint two elements below it so one file does not carry two " +
      "idioms. RULE 1 governs the content: the anchor is a RESULT of the booker's own tap, and the " +
      "start anchor is deliberately not a pressed toggle, so this sentence is the only way a screen " +
      "reader learns the picker is mid-selection.",
  },
  "slot-picker-gap-hint": {
    file: "src/components/availability/slot-picker.tsx",
    kind: "status",
    at: 2,
    announces:
      '"{9:00 AM} is {booked} — pick a later start for a block after it." — once, when a full-day or ' +
      "run fill truncates at a busy hour.",
    why:
      "RULE 1. KEPT exactly as shipped, redundant `aria-live=\"polite\"` and all: `role=\"status\"` is " +
      "already implicitly polite, so the attribute changes nothing, and it is the idiom " +
      "`spots-left-chip.tsx` also uses. Rewriting shipped, correct markup to remove a harmless " +
      "attribute is churn that costs a review and buys nothing. It is a RESULT, never an error — " +
      "occupancy is a normal state and this note is brand-tinted rather than red.",
  },

  // ─── spots-left-chip.tsx ────────────────────────────────────────────────────────────────────────
  "spots-left-chip": {
    file: "src/components/availability/spots-left-chip.tsx",
    kind: "status",
    at: 1,
    announces:
      '"{3} spots left" / "Spots available" / "Fully booked" — once per change, when a shared-space ' +
      "slot's remaining capacity is refetched under the booker.",
    why:
      "RULE 1. KEPT. Occupancy changing under the booker is the RESULT of the world moving, not a " +
      "failure, so it is polite and never `alert`. The element is a `<span>` and not a `<div>` for an " +
      "unrelated but load-bearing reason recorded at the call site (`<p>` accepts phrasing content " +
      "only, and `result-card.tsx` wraps every meta line in one) — `role` and `aria-live` are " +
      "element-agnostic, so the announcement is unaffected by that choice.",
  },

  // ─── book-cta.tsx ───────────────────────────────────────────────────────────────────────────────
  "book-cta-notice": {
    file: "src/components/booking/book-cta.tsx",
    kind: "status",
    at: 1,
    announces:
      "the hold-refusal sentence the server returned — once, after the booker presses the primary CTA " +
      "and the hold is refused.",
    why:
      "RULE 1. KEPT. It appears strictly AFTER an action the booker took, which is the definition of a " +
      "status. Muted and never red, because a slot someone else took first is not this booker's error. " +
      "RULE 6 binds it to plan 12-13: the collision notice supersedes this one as the NAMED result, " +
      "and the two must never be mounted together — a claim about a rendered document, asserted in " +
      "`e2e/collision-in-place.spec.ts` rather than here.",
  },

  // ─── collision-notice.tsx ───────────────────────────────────────────────────────────────────────
  "collision-notice": {
    file: "src/components/booking/collision-notice.tsx",
    kind: "status",
    at: 1,
    announces:
      '"9:00–11:00 AM was just taken / Someone booked it while you were choosing, so nothing was ' +
      'charged. The times below are up to date — the closest free windows are outlined." — ONCE, at ' +
      "the moment the hold is refused for a slot somebody else took first. It says nothing again: the " +
      "refreshed grid arriving beneath it is not a live update, and a SECOND collision REMOUNTS this " +
      "region (the call site keys it on the collision's ordinal) rather than mutating its text, which " +
      "is what makes a second loss announced exactly once too. The drop-in twin is the same region " +
      'with the same shape: "Fri, Aug 21 just sold out / The last spots went while you were ' +
      'choosing…".',
    why:
      "RULE 1, RULE 6 and RULE 7, and the third one is the part worth checking rather than skimming.\n" +
      "\n" +
      "RULE 1: it is the RESULT of something the booker did — they pressed the primary CTA and the " +
      "constraint ruled against them. `role=\"status\"`, implicit polite, never `assertive`. It carries " +
      "NO `aria-label`: `status` is nameFrom:author, and on the VoiceOver/Safari pairing a named live " +
      "region can be announced BY ITS NAME INSTEAD OF ITS CONTENT — i.e. the sentence naming the lost " +
      "window would be replaced by a label nobody wrote for them.\n" +
      "\n" +
      "RULE 2 EXPRESSLY DOES NOT APPLY. Losing a race fairly is a normal marketplace outcome, not a " +
      "failure needing a human, so this is never `alert`, never red and never a dialog. The one shape " +
      "on this whole set that earns `alert` is a fetch that FAILED (`calendar-day-error`).\n" +
      "\n" +
      "RULE 6 — ONE REGION PER OUTCOME, AND ITS OTHER HALF IS THE ROW ABOVE. `book-cta.tsx`'s plain " +
      "notice reports the SAME refusal, so this region supersedes it: that call site renders its own " +
      "notice only while no collision is set, which makes the exclusion structural rather than a state " +
      "invariant a later edit could break silently. Neither the struck-through chips nor the outlined " +
      "free windows announce anything — they are evidence, and evidence is looked at rather than read " +
      "out. The browser half of the claim is `e2e/collision-in-place.spec.ts`, which sums `status` AND " +
      "`alert` across the WHOLE document and asserts the total is 1.\n" +
      "\n" +
      "RULE 7 — THE FOCUS MOVE IS WHAT EARNS THE ABSENCE OF `assertive`, and it is load-bearing rather " +
      "than decoration, exactly as `hold-expired-state`'s row records for its own. The region carries " +
      "`tabIndex={-1}` and focuses itself on mount, so the event is impossible to miss without " +
      "interrupting whatever was being read, and a keyboard user lands one Tab from the corrected " +
      "grid. Removing the focus move would make this row's argument false.",
  },

  // ─── hold-countdown.tsx ─────────────────────────────────────────────────────────────────────────
  "hold-countdown-digits": {
    file: "src/components/booking/hold-countdown.tsx",
    kind: "timer",
    at: 1,
    announces:
      "NOTHING, ever. `aria-live=\"off\"` means the mm:ss redraws once a second and announces none of " +
      "those 900 updates. The `sr-only` \"Time left to confirm\" beside the digits is read only when a " +
      "user navigates to the element deliberately.",
    why:
      "RULE 3, and this is THE MODEL every other row is measured against — brought to it by plan 12-03 " +
      "and NOT re-decided here. A naive `aria-live` on ticking numerals speaks over the booker every " +
      "second for fifteen minutes, which is the specific defect GATE-03 is named for. The digits carry " +
      "the role so the value is identifiable, and `off` so it is silent.",
  },
  "hold-countdown-threshold": {
    file: "src/components/booking/hold-countdown.tsx",
    kind: "threshold",
    at: 1,
    announces:
      '"One minute left to confirm your booking." — EXACTLY ONCE across a fifteen-minute hold, when a ' +
      "tick first lands inside the final minute. Measured as a text-change count of `toBe(1)` in both " +
      "`tests/booking/hold-countdown.test.tsx` and `e2e/hold-countdown.spec.ts`.",
    why:
      "RULE 3's separate polite region, and the reason `threshold` is a kind. The message LATCHES — set " +
      "once, never cleared — because the shipped one-second window went \"\" → message → \"\", and that " +
      "second change is a live-region update to empty. On expiry the span KEEPS its text and DROPS its " +
      "`aria-live`, so it goes silent without its text appearing to change; a role here would be a " +
      "permanent implicit polite region and would defeat exactly that, leaving `HoldExpiredState` as a " +
      "SECOND region announcing one event (RULE 6).",
  },

  // ─── hold-expired-state.tsx ─────────────────────────────────────────────────────────────────────
  "hold-expired-state": {
    file: "src/components/booking/hold-expired-state.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Your hold expired / We released the slot so someone else could book it. It might still be free ' +
      '— check availability again." — once, when the interstitial replaces the reserve content.',
    why:
      "RULE 7, and this is the correction the whole ban exists for: it shipped `aria-live=\"assertive\"` " +
      "and now carries none, because `role=\"status\"` is already implicitly polite. Assertive " +
      "INTERRUPTS whatever is being read — including, on a slow connection, the price the booker was " +
      "part-way through hearing. The mechanism that replaces it is polite region PLUS MOVED FOCUS: the " +
      "parent moves focus to the primary recovery CTA, which is what makes the event impossible to miss " +
      "and simultaneously puts the keyboard user on the way out. That focus move is not decoration " +
      "here — it is the half of the pair that earns dropping `assertive`, and removing it would make " +
      "this row's argument false. WHERE IT LIVES, added after the 12 review found the argument had been " +
      "paid for with code that did not exist (CR-01): the mount effect is in `HoldExpiredState` itself " +
      "rather than in `ReserveView`, because that state has TWO mounts — the live-expiry swap and " +
      "`book/page.tsx`'s direct render for a hold already dead on arrival — and a move owned by one " +
      "parent fires on one of them. This registry is a SOURCE SCAN and cannot see a focus move at all, " +
      "which is why it stayed green; `tests/booking/hold-expired-state.test.tsx` renders both mounts and " +
      "asserts `document.activeElement`, and it is what keeps this sentence honest. RULE 2 does not " +
      "apply: an expired hold is a normal, expected end to a timer and is never rendered red.",
  },

  // ─── pending-payment-state.tsx ──────────────────────────────────────────────────────────────────
  "pending-payment": {
    file: "src/components/booking/pending-payment-state.tsx",
    kind: "status",
    at: 1,
    announces:
      'The money panel\'s DETAIL line, twice at most across one wait. "This page updates on its own ' +
      '— you don\'t need to refresh it." is on the first paint and is not announced. At the poll cap ' +
      'the detail becomes "It\'s taking longer than usual. We\'ll email you at {address} the moment ' +
      'it\'s confirmed." — that is the first announcement. At the escalation threshold ONE line is ' +
      'added: "Your reference is FIT-XXXXXXXX — we\'ve recorded it against this booking." The ' +
      'heading, the indicator and the L1 sentence — "We\'re waiting on your payment provider to ' +
      'confirm it.", which D-102 rewrote so that nothing on this surface asserts a payment the ' +
      'webhook has not confirmed — are OUTSIDE the region and never move.',
    why:
      "RULE 1 + RULES 4/5, and it is the ONE Phase-13 booking-detail region that survived plan " +
      "13-14's audit. Every other status this phase renders is a landing a booker navigates to; this " +
      "one genuinely changes while they watch it, because a poller is refreshing the RSC underneath " +
      "and two timers move the copy past two thresholds. It is a RESULT — they paid, and the system " +
      "is reporting what happened to the money — so `status`, implicitly polite, never `alert`: " +
      "waiting on a settlement is a normal state and D-71 bans failure-shaped copy on this surface " +
      "outright.\n" +
      "\n" +
      "THE ROLE IS ON A WRAPPER, WHICH IS WHY IT CARRIES AN `aria-label` AND IS DECLARED IN " +
      "`AUTHOR_NAMED_REGIONS`. `MoneyStatement` is shared with three states that are static on " +
      "arrival and its contract is that it carries no region at all, so the region is the div around " +
      'it — a wrapper whose own text content is nothing. "Payment status" is a two-word LABEL that ' +
      "neither duplicates nor paraphrases any of the three sentences below it.\n" +
      "\n" +
      "RULE 6 — ONE REGION, AND THE ESCALATION IS A TEXT CHANGE INSIDE IT rather than a second " +
      "region appearing beside it. `tests/booking/payment-states.test.tsx` case (4) counts " +
      "`[role=\"status\"], [role=\"alert\"], [aria-live]` across the whole rendered state at the third " +
      "threshold and asserts the total is 1, then asserts that one has a non-empty name.",
  },

  // ─── request-countdown.tsx ──────────────────────────────────────────────────────────────────────
  "request-countdown-digits": {
    file: "src/components/booking/request-countdown.tsx",
    kind: "timer",
    at: 1,
    announces:
      "NOTHING, ever. `aria-live=\"off\"` means the \"{N}h {M}m\" redraws once a minute — up to 1,440 " +
      "times across a 24-hour window — and announces none of them. The prefix beside the digits " +
      '("Expires in" / "Pay within" / "Slot held for") is read only when a user navigates to the ' +
      "element deliberately.",
    why:
      "RULE 3, applied to the SECOND ticking region on this tree — the one this module's own footer " +
      "named for a year as probably wrong. `hold-countdown.tsx` is the model and was not re-decided " +
      "here. The role is on the TICKING branch only: an expired window counts nothing, and a " +
      "`role=\"timer\"` on a frozen \"Expired\" announces the element as a live timer that will never " +
      "move again.",
  },
  "request-countdown-threshold": {
    file: "src/components/booking/request-countdown.tsx",
    kind: "threshold",
    at: 1,
    announces:
      '"Under one hour left." — AT MOST ONCE in this component\'s whole life, when a tick first ' +
      "lands inside the final hour of a window that was ABOVE that line when it mounted. Zero times " +
      "otherwise: an hours-scale countdown that ARRIVES with forty minutes left says nothing at all, " +
      "and neither does the fifteen-minute reuse in `not-completed-state.tsx`. Measured as a " +
      "text-change count of `toBe(1)` and `toBe(0)` against a driven clock in " +
      "`tests/booking/request-countdown.test.tsx`, with the digit-change count beside it so the " +
      "zero cannot be green over a dead component.",
    why:
      "RULE 3's separate polite region, and the second reason `threshold` is a kind. The message " +
      "LATCHES — set once, never cleared — because the shipped one-MINUTE window went \"\" → message " +
      "→ \"\", and that second change is a live-region update to empty. On expiry the span KEEPS its " +
      "text and DROPS its `aria-live`, so it goes silent without its text appearing to change.\n" +
      "\n" +
      "RULE 6 OWNS THE TWO DELETIONS THAT MATTER. The expiry arm (\"This window has closed.\") is " +
      "gone: every surface mounting this component replaces ITSELF when the window closes — " +
      "`ExpiredApprovalState` on the booker's detail page, the `holdOver` copy in " +
      "`not-completed-state.tsx`, the row `revalidatePath` drops from the host inbox — so the arm was " +
      "a second region reporting one event. And a countdown that mounts below the line stays silent, " +
      "because the fact that it is inside its last hour arrived WITH the page, and a page is not a " +
      "change.",
  },

  // ─── reserve-actions.tsx ────────────────────────────────────────────────────────────────────────
  "reserve-actions-notice": {
    file: "src/components/booking/reserve-actions.tsx",
    kind: "status",
    at: 1,
    announces:
      "the checkout-lease sentence — once, when the booker presses `Confirm & pay` and another of " +
      "their own attempts already holds the lease.",
    why:
      "RULE 1. KEPT. It follows the booker's own press, so it is a status; it is muted and never an " +
      "alert variant because nothing went wrong — their other tab is winning. `role=\"alert\"` here " +
      "would tell the booker something failed at the exact moment their booking is proceeding normally " +
      "somewhere else, which is RULE 2's reserved role spent on a non-failure.",
  },

  // ─── search-results.tsx ─────────────────────────────────────────────────────────────────────────
  "search-results-fetch-error": {
    file: "src/components/search/search-results.tsx",
    kind: "alert",
    at: 1,
    announces:
      '"Something went wrong loading spaces / We couldn\'t load spaces just now. Try again." — once, ' +
      "when the search request rejects.",
    why:
      "RULE 2. KEPT. A search that never ran is a genuine failure and the recovery is a human pressing " +
      '"Try again". This file carries NO `aria-live` attribute of its own — its loading region is ' +
      "`patterns/card-grid-skeleton.tsx`'s `role=\"status\" aria-busy=\"true\" aria-label=\"Loading " +
      "spaces\"`, which lives in the pattern layer and is gated by " +
      "`tests/design/skeleton-a11y.test.tsx` rather than here. That split is why this file has one row " +
      "and not two, and it is the reason the scan keys rows to the file that RENDERS the attribute.",
  },
  // ─── search-experience.tsx ──────────────────────────────────────────────────────────────────────
  "search-progress": {
    file: "src/components/search/search-experience.tsx",
    kind: "status",
    at: 1,
    announces:
      'The next question after a committed activity or successful location, or one calm browser-location recovery outcome.',
    why:
      'RULE 5 + RULE 6. This one mounted status stays empty at idle and changes only for coordinator-owned transitions or geolocation outcomes. AddressAutocomplete owns its own resolved-address announcement, so this region never repeats it.',
  },

  // ─── attendee-roster.tsx ────────────────────────────────────────────────────────────────────────
  "group-attendee-removed": {
    file: "src/components/group/attendee-roster.tsx",
    kind: "status",
    at: 1,
    announces:
      '"{Ana} removed — {5} coming, {2 spots free}." — once, when the organizer confirms a removal ' +
      "and the server returns the two figures the sentence quotes. It says nothing again; the roster " +
      "row disappearing beneath it is not a live update, and a SECOND removal replaces this " +
      "sentence with the next one, which is one announcement per removal.",
    why:
      "RULE 1 and RULE 5. STATE-08's rule is that a fact an organizer must READ never travels in a " +
      "toast, so 13-05 moved this one to an in-page alert above the list it describes — and an " +
      "alert nobody hears is the same defect one wall further on, which is why it is a region. It is " +
      "the RESULT of the organizer's own confirm, so `status` and never `alert`: taking someone off " +
      "a roster is ordinary housekeeping and the seat goes straight back in the pool.\n" +
      "\n" +
      "THE ROLE IS ON A WRAPPER AROUND `PanelCard`, which takes no `role` of its own, so the region's " +
      'own text content is nothing and its name must be author-supplied — "Attendee removed", a ' +
      "two-word LABEL declared in `AUTHOR_NAMED_REGIONS` with the VoiceOver reason. RULE 2 does not " +
      "apply and RULE 7 is satisfied without a focus move: the sentence sits directly above the list " +
      "it is about, and the control that produced it still has focus.",
  },

  // ─── rsvp-confirmation.tsx ──────────────────────────────────────────────────────────────────────
  "rsvp-recorded": {
    file: "src/components/group/rsvp-confirmation.tsx",
    kind: "status",
    at: 1,
    announces:
      '"You\'re in — see you there." (or "Thanks for letting us know." for a decline), followed by ' +
      "either the change-your-answer line or the G3 disclosure that this screen is the only " +
      "confirmation. ONCE, at the moment the server’s answer replaces the two choice buttons in " +
      "place. It does not announce for a RETURNING account, whose recorded answer is the first paint.",
    why:
      "RULE 1 and RULE 6. It is the RESULT of the invitee's own press and it REPLACES the control " +
      "they pressed — a swap a sighted person sees and a screen-reader user would otherwise have to " +
      "go hunting for, which is the one shape on the group surfaces that genuinely earns a region. " +
      "One region for one outcome: `rsvp-form.tsx`'s refusal region and this one are mutually " +
      "exclusive by construction (a submit either records or refuses), so the two can never announce " +
      "the same submit.\n" +
      "\n" +
      "It carries an `aria-label` and is declared in `AUTHOR_NAMED_REGIONS`; the name covers BOTH " +
      'answers deliberately — "RSVP recorded" is true of a "can\'t make it" too, and a name that ' +
      "said otherwise would be wrong half the time.",
  },

  // ─── rsvp-form.tsx ──────────────────────────────────────────────────────────────────────────────
  "rsvp-refused": {
    file: "src/components/group/rsvp-form.tsx",
    kind: "status",
    at: 1,
    announces:
      "the refusal sentence the SERVER composed, verbatim — the group just filled up, RSVPs have " +
      "closed, the invite is no longer active, or a plain \"We couldn't save your RSVP. Try again.\" " +
      "— once, after the invitee presses one of the two answer buttons and `submitRsvp` refuses it.",
    why:
      "RULE 1. It appears strictly AFTER an action the invitee took. `status` and never `alert`: the " +
      "group filling up is somebody else's good news, not this person's error, and the whole surface " +
      "renders no alarm colour by contract.\n" +
      "\n" +
      "IT IS NOW THE ONLY REGION IN THIS FILE, WHICH IS PLAN 13-14'S VERDICT ON THE OTHER TWO. The " +
      "`full` and `closed` advisories shipped as `role=\"status\"` — a deliberate 13-08 climb-down " +
      "from `ui/alert`'s hardcoded `role=\"alert\"` — and both are decided SERVER-SIDE from a prop, " +
      "so both are on the first paint or are never there at all. Neither could ever announce a " +
      "change. They now take `role=\"note\"`, the ARIA role for parenthetical content: deleting the " +
      "override would have restored the interrupting role, and the other shipped answer (swap the " +
      "box for `PanelCard tone=\"muted\"`, as `top-up-nudge.tsx` did) nests a panel inside " +
      "`InviteCard`'s panel and pays the block padding twice.\n" +
      "\n" +
      'The `aria-label` is "RSVP not saved" — a LABEL, declared in `AUTHOR_NAMED_REGIONS`, never a ' +
      "copy of the server's sentence, which is rendered verbatim as the content.",
  },

  // ─── share-link-box.tsx ─────────────────────────────────────────────────────────────────────────
  "group-link-rotated": {
    file: "src/components/group/share-link-box.tsx",
    kind: "status",
    at: 1,
    announces:
      '"The old invite link no longer works. Copy the new one below and share it again." — once, at ' +
      "the moment the box notices the `inviteUrl` it renders is not the one it rendered last. NOT on " +
      "a fresh mount, and not on any of the poller's refreshes that hand down the same URL.",
    why:
      "RULE 1 and RULE 5, and the announcement is DERIVED rather than pushed, which is what makes " +
      "the row's first sentence checkable. `RegenerateLinkButton` lives in a different subtree; this " +
      "box compares the prop it renders against the one it last rendered, so a refused or " +
      "rate-limited regeneration leaves the URL alone and announces nothing — the announcement is a " +
      "function of the thing announced and cannot outlive its truth. It is the RESULT of the " +
      "organizer's own press, so `status`; rotating a leaked link is the fix, not the incident, so " +
      "never `alert` and never the destructive variant.\n" +
      "\n" +
      'A wrapper around `PanelCard` again, hence the author-supplied "Invite link updated" declared ' +
      "in `AUTHOR_NAMED_REGIONS` — three words that say which region this is, with the sentence left " +
      "as the content.",
  },

  // ─── wizard.tsx (plan 14-14's discharge — the host tooling) ─────────────────────────────────────
  "wizard-save-state": {
    file: "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Saving…" while a step is being persisted, then "Saved" when the server confirms it — or ' +
      '"Couldn\'t save — " followed by the server\'s own refusal sentence, rendered verbatim. AT MOST ' +
      "ONE announcement per press. NOTHING on arrival (the element is mounted and its text is empty " +
      "at idle) and nothing when the host edits a field again, because returning to idle empties the " +
      "text rather than writing a second sentence into it.",
    why:
      "RULE 1, RULE 5 and RULE 6, and D-150 is what put it here: the wizard used to report a save in " +
      "a TOAST, which is the half of a report that is gone on refresh. A save is the RESULT of " +
      "something the host did, so `status` and implicitly polite; a refused save is not a failure " +
      "needing a human either, because the host is still on the step with the form intact and the " +
      "next press is the retry.\n" +
      "\n" +
      "IT IS MOUNTED AT ALL TIMES AND EMPTY AT IDLE, WHICH IS THE PART A LATER EDIT WILL WANT TO " +
      "'TIDY'. An element that mounts and unmounts is a different region to assistive technology each " +
      "time, and a test cannot hold on to it between presses. That is also why it carries an " +
      "`aria-label` and is declared in `AUTHOR_NAMED_REGIONS`: for most of a session it has no text " +
      "to be named by, so with no author-supplied name it is nameless exactly when it is quiet.\n" +
      "\n" +
      "RULE 6 — THE PUBLISH GATE'S REFUSAL DELIBERATELY DOES NOT COME HERE. `handlePublish` saves and " +
      "then publishes; when the publish is refused the draft above it SAVED, and routing that sentence " +
      "into a region named for the save state would overwrite a true \"Saved\" with a \"couldn't " +
      "save\" that never happened. That is a second outcome with its own action behind it, and it " +
      "keeps the one announcement it has always had.",
  },

  // ─── request-row.tsx ────────────────────────────────────────────────────────────────────────────
  "request-action-refusal": {
    file: "src/components/host/request-row.tsx",
    kind: "status",
    at: 1,
    announces:
      "the refusal sentence the SERVER composed, verbatim — the request is no longer pending, or it " +
      "could not be found and is not this host's to manage — once, after the host presses Approve or " +
      "Decline and the action refuses. NOTHING on the success path: the row revalidates away, so the " +
      "outcome is the surface disappearing rather than a sentence about it.",
    why:
      "RULE 1, RULE 5 and RULE 6. It appears strictly AFTER an action the host took, so `status` and " +
      "never `alert`: a request another tab already answered, or an SLA that lapsed while the inbox " +
      "was open, is an expected outcome and not a fault of the host's. It carries no alarm ink for the " +
      "same reason, and no retry affordance — the row's OWN two controls are the retry.\n" +
      "\n" +
      "RULE 6 IS WHY IT EXISTS AT ALL: plan 14-03 DELETED the two `toast.error` calls that carried " +
      "these sentences and put this region in their place, in one edit, with the toast spy asserted at " +
      "zero calls so the region cannot quietly JOIN the toast instead of replacing it. Both refusal " +
      "paths share ONE region — a second refusal replaces this sentence with the next one, which is " +
      "one announcement per press. The success path keeps its own toast, and that is the per-PATH " +
      "decision rather than a per-component one: a refusal leaves the surface on screen and belongs on " +
      "it, while a success revalidates the surface away and has nowhere else to go.\n" +
      "\n" +
      "IT IS MOUNTED ONLY WHILE A REFUSAL EXISTS, following `share-link-box.tsx`'s shipped shape, " +
      "because the UI-SPEC requires zero regions on the success path. ⚠ IT HAS TEXT OF ITS OWN AND IS " +
      "NAMED ANYWAY — see its `AUTHOR_NAMED_REGIONS` row, which states what that trade costs rather " +
      "than pretending the wrapper argument applies to it.",
  },

  // ─── address-autocomplete.tsx ───────────────────────────────────────────────────────────────────
  "address-lookup-result": {
    file: "src/components/listing/address-autocomplete.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Location set. Guests see an approximate area until you choose to show the exact address." — ' +
      "or, when the geocoder cannot be reached or a picked suggestion arrives with no coordinates, " +
      "the failure sentence instead. ONCE per resolved lookup, at the moment a suggestion resolves or " +
      "a lookup fails. NOTHING on arrival: the region is mounted and EMPTY until something resolves — " +
      "including on an EDIT of a listing that already has an address, which is the case that used to " +
      "be the exception and is not one any more (see WR-04 in the `why` below). On that path the " +
      "located sentence still appears, as a plain paragraph outside any region.",
    why:
      "RULE 1, RULE 5 and RULE 6, and this row IS the discharge of the last exclusion this module " +
      "carried — whose own stated reason named Phase 14 as its owner, on the grounds that auditing " +
      "host markup that phase was about to rewrite would produce an audit nobody could reuse.\n" +
      "\n" +
      "WHAT WAS WRONG, AND IT WAS THE ONE DEFECT THE HEADER'S RULE IS NAMED FOR. It shipped as a bare " +
      "polite element with NO role and NO accessible name whose FIRST-PAINT content was a STATIC HINT " +
      '("Pick a suggestion so we can place you on the map."). A live region announces a CHANGE, and a ' +
      "freshly rendered page is not a change — it is a page. So the hint moved OUT and is a plain " +
      "paragraph read in document order like every other hint on the step, and the region kept only " +
      "the resolved outcome.\n" +
      "\n" +
      "RULE 6 — ONE REGION, NOT TWO. The located outcome and the failure outcome are the two outcomes " +
      "of a single lookup, so a second region for the failure would be two regions reporting one " +
      "action. The failure branch keeps the alarm ink it already carried; that occurrence is " +
      "pre-existing and the discharge explicitly keeps it, because a geocoder that cannot be reached " +
      "IS a failure the host has to act on.\n" +
      "\n" +
      "RULE 5 — IT IS MOUNTED AT ALL TIMES AND EMPTY UNTIL A LOOKUP RESOLVES, which is why it carries " +
      "an `aria-label` and is declared in `AUTHOR_NAMED_REGIONS`. The redundant polite attribute " +
      "beside the role is KEPT for the reason `slot-picker-gap-hint` keeps its own: the role is " +
      "already implicitly polite, so rewriting shipped, correct markup to remove a harmless attribute " +
      "costs a review and buys nothing.\n" +
      "\n" +
      "⚠ RULE 1 AGAIN, AND THIS ROW WAS WRONG ABOUT IT FOR ONE PHASE (code review WR-04, 24 Aug 2026). " +
      "The 'EMPTY until a lookup resolves' clause above was TRUE of a fresh draft and FALSE of an " +
      "edit. The region's located branch read the component's `located`, which is " +
      "`hasCoordinates || selectedLabel.length > 0`, and `wizard.tsx` seeds BOTH off the stored " +
      "listing — so on any edit of a listing that already had an address, which is most edits, the " +
      "region mounted with its sentence already in it. That is content at first paint, from a prop: " +
      "the same rule-1 defect this row is the discharge of, arriving a second time by a different " +
      "route. THE CODE WAS CHANGED, NOT THIS REASON: the located branch now reads an `outcome` value " +
      "that only a resolution on the screen writes and no prop can seed, and the already-located fact " +
      "renders as a plain paragraph beside the static hint — a fact about the listing, read in " +
      "document order, rather than an announcement of something that did not happen. The failure " +
      "branch needed nothing; `error` was never seeded.\n" +
      "\n" +
      "AND IT WAS UNFALSIFIABLE, WHICH IS WHY IT LASTED. This module's gate reads SOURCE through an " +
      "AST walk: it can see that the region exists and that it is named, and it structurally cannot " +
      "see what the element CONTAINS at mount, because that is a runtime value. The component was " +
      "also `vi.mock`'d to a null render in all four wizard tests, so nothing in the repository had " +
      "ever mounted it. `tests/listing/address-autocomplete.test.tsx` now does, and reads this " +
      "region's text at mount with `hasCoordinates` both true and false. A future row claiming " +
      "anything about what a region HOLDS needs a render behind it; this gate cannot supply one.",
  },

  // ─── photo-uploader.tsx ─────────────────────────────────────────────────────────────────────────
  "photo-uploader-requirement": {
    file: "src/components/listing/photo-uploader.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Add 2 more photos to publish (minimum 3)." — the COUNT changes in place each time an upload ' +
      "or a removal lands, so the host hears one sentence per photo rather than a running commentary " +
      "on the grid. It says nothing on arrival, and it stops existing once the minimum is met, which " +
      "is the announcement that the requirement is discharged.",
    why:
      "RULE 1 and RULE 5. It is the RESULT of the host's own upload or removal — the grid changed and " +
      "the requirement moved with it — so `status` and implicitly polite. RULE 2 does not apply: a " +
      "listing that is not yet publishable is a listing mid-creation, not a failure, and this line " +
      "carries no alarm ink.\n" +
      "\n" +
      "⚠ IT WAS SHIPPED WITH NO ACCESSIBLE NAME AND IS FIXED HERE RATHER THAN EXCLUDED, WHICH IS WHAT " +
      "LETS THE EXCLUSION LIST REACH ZERO. The alternative on the table was a row in " +
      "`LIVE_REGION_EXCLUSIONS` naming Phase 16 (which may rewrite this component for cropping) — and " +
      "that would have traded the address field's exclusion for a photo step's, leaving the list at " +
      "one and the discretion item undischarged. One attribute was the cheaper honest answer.\n" +
      "\n" +
      "⚠ IT HAS TEXT OF ITS OWN AND IS NAMED ANYWAY. Its `AUTHOR_NAMED_REGIONS` row states what that " +
      "trade costs and names the second place the same count is carried, rather than borrowing the " +
      "wrapper argument the four Phase-13 rows make — it does not apply here and pretending it did " +
      "would widen the exception for the next reader.",
  },

  // ─── (auth)/login/page.tsx ──────────────────────────────────────────────────────────────────────
  "login-form-error": {
    file: "src/app/(auth)/login/page.tsx",
    kind: "alert",
    at: 1,
    announces:
      '"Invalid email or password." — once, at the moment a submit comes back refused. It is the ' +
      "same sentence for a wrong password, an unknown address and a disabled account, so what a " +
      "screen-reader user hears is byte-identical to what a sighted one reads, which is the whole " +
      "point of the sentence. It says nothing again until the next submit is refused.",
    why:
      "RULE 2, and it is the one shape on this surface that earns `alert`. A credential the person " +
      "just typed came back rejected: the next action is theirs and the form they are standing in is " +
      "the thing that failed. RULE 7 is satisfied WITHOUT the banned politeness level — the role is " +
      "the whole mechanism, and the value this module names once in its own header appears nowhere " +
      "in the file.\n" +
      "\n" +
      "⚠ IT IS NAMED BY ITS CONTENT AND MUST STAY THAT WAY. The sentence IS the message, so an " +
      "`aria-label` here would give a reader a label where a reason belongs — the VoiceOver hazard " +
      "the header's naming section describes. There is no `AUTHOR_NAMED_REGIONS` row for it and " +
      "adding one would be a regression, not a widening.\n" +
      "\n" +
      "⚠ THIS FILE USED TO CARRY A SECOND REGION AND PLAN 15-07 REMOVED IT. `ResetNotice` — the " +
      "post-reset confirmation shown when the login page is reached with `?reset=1` — was wrapped in " +
      "a region although it is present on the FIRST paint of that URL. See the note at the file " +
      "block above: a freshly navigated page is not a change.",
  },

  // ─── (auth)/signup/page.tsx ─────────────────────────────────────────────────────────────────────
  "signup-form-error": {
    file: "src/app/(auth)/signup/page.tsx",
    kind: "alert",
    at: 1,
    announces:
      "The `signup` server action's own refusal sentence, verbatim and once, at the moment the submit " +
      "comes back with `ok: false` — the duplicate-account sentence, the weak-password sentence or " +
      "the provider's failure, whichever the action returned. The region is absent from the DOM until " +
      "then and is cleared again at the top of the next submit, so one refusal is one announcement.",
    why:
      "RULE 2, for the login refusal's reason: a form the person just submitted came back rejected " +
      "and the next action is theirs. RULE 5 is satisfied by its own text — the sentence is the " +
      "SERVER's and is rendered verbatim, which is exactly why it must not be named: a label " +
      "announced instead of the content would replace a specific reason with three generic words, " +
      "and the reason is the only thing that tells the person what to change.\n" +
      "\n" +
      "⚠ THE INTENT PAIR ABOVE IT IS A `radiogroup`, NOT A REGION, and that is worth stating because " +
      "a scan looking for `role=` finds three roles in this file and only one of them is a live " +
      "region. `radiogroup` and `radio` are widget roles with no implicit politeness; picking an " +
      "intent announces nothing, and should not.",
  },

  // ─── (auth)/forgot-password/page.tsx ────────────────────────────────────────────────────────────
  "forgot-request-result": {
    file: "src/app/(auth)/forgot-password/page.tsx",
    kind: "status",
    at: 1,
    announces:
      '"If an account exists for that email, a reset link is on its way." — once, at the moment the ' +
      "form is REPLACED by it. The same sentence lands whether the address is registered or not, " +
      "which is the anti-enumeration property: a listener can no more tell the two apart than a " +
      "reader can. It never updates in place, because the branch is mounted once per submit.",
    why:
      "RULE 1 — the RESULT of something the person just did, so `status` and implicitly polite, never " +
      "`alert`: a reset request that was accepted is not a failure, and interrupting for it would say " +
      "otherwise. RULE 6 holds structurally rather than by inspection: the ternary REPLACES the form " +
      "instead of sitting beside it, so at no point are a form-level refusal and this sentence both " +
      "mounted.\n" +
      "\n" +
      'IT IS THE ONE `status` ON THE FOUR AUTH PAGES AND IT IS AUTHOR-NAMED ("Reset request result"), ' +
      "which is a declared exception with its own `AUTHOR_NAMED_REGIONS` row rather than a default. " +
      "Read that row before copying the shape onto a refusal region — the alerts on these surfaces " +
      "are named by their content and must stay that way.",
  },

  // ─── (auth)/reset-password/page.tsx ─────────────────────────────────────────────────────────────
  "reset-form-error": {
    file: "src/app/(auth)/reset-password/page.tsx",
    kind: "alert",
    at: 1,
    announces:
      '"That reset link is invalid or has expired. Request a new one." — once, when a submit carrying ' +
      "a token the server will not accept comes back refused. The second half is the recovery, in the " +
      "same sentence, because a listener who hears only the first half has been told they are stuck " +
      "rather than what to do about it.",
    why:
      "RULE 2. It is also the contrast this file was converted to make legible, and the file says so " +
      "at the line: this sentence appears in response to a submit the person just made, which is a " +
      "CHANGE, so it keeps its role — while the missing-token notice higher up the same file is " +
      "present on the first paint of a malformed URL, which is a PAGE, so plan 15-07 removed its " +
      "region. Two paragraphs that look alike, one rule, opposite answers.",
  },

  // ─── (app)/profile/profile-form.tsx ─────────────────────────────────────────────────────────────
  //
  // TWO REGIONS, TWO KINDS, SO TWO SEQUENCES OF EXACTLY ONE. It carried THREE until plan 16-11: the
  // avatar block that used to sit in the public panel — with the refusal alert that was this file's
  // `alert#1` — is now one `<AvatarField />` element, and the refusal is declared against
  // `src/components/profile/avatar-field.tsx` below. The row was DELETED here rather than retired
  // anywhere, because the element it described did not disappear; it moved, and the row that
  // describes it moved with it. Ordering the rows the way the file orders the elements is what makes
  // `at` checkable by eye.
  "profile-form-error": {
    file: "src/app/(app)/profile/profile-form.tsx",
    kind: "alert",
    at: 1,
    announces:
      "The `updateProfile` server action's refusal sentence, verbatim and once, when a save comes " +
      "back with `ok: false`. It is cleared at the top of the next submit, so the person hears the " +
      "refusal that belongs to the attempt they just made and never a stale one.",
    why:
      "RULE 2, and it is the SAVE's failure rather than a field's — the per-field messages are " +
      "`FormMessage`'s and carry no region at all, which is RULE 6 held by construction: one save " +
      "produces one announcement from one element. Named by its own content, for the reason every " +
      "server sentence on these surfaces is: the refusal is the actionable half.\n" +
      "\n" +
      "⚠ ITS ORDINAL BECAME 1 BECAUSE A SIBLING LEFT THE FILE, NOT BECAUSE IT MATTERS MORE. It was " +
      "`alert#2` until plan 16-11 lifted the avatar block out into `avatar-field.tsx`; this element " +
      "did not move one line, and nothing about what it announces changed. `at` counts regions of " +
      "the same KIND in the same FILE in source order, so removing the alert above it re-keyed this " +
      "one by arithmetic alone. That is the whole reason the ordinal is worth stating: the day a " +
      "later plan puts a second alert back above it, this row is what goes red first.",
  },
  "profile-save-result": {
    file: "src/app/(app)/profile/profile-form.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Profile saved." — once per SUCCESSFUL save, at the moment the action returns. It is set from ' +
      "the real result rather than from a timer, and cleared at the top of the next submit, so it " +
      "cannot announce a save that did not happen and cannot go on claiming an old one.",
    why:
      "RULE 1 — the RESULT of the person's own submit, so `status` and implicitly polite. RULE 6 with " +
      "the refusal above it: the two are mutually exclusive at runtime because `saved` is cleared " +
      "before every attempt, so one save is announced by exactly one region.\n" +
      "\n" +
      'IT IS AUTHOR-NAMED ("Save state") and has an `AUTHOR_NAMED_REGIONS` row saying why. The short ' +
      "version: the string is the wizard's precedent reused verbatim, two words that say WHICH line " +
      "moved rather than a paraphrase of the sentence inside it.",
  },

  // ─── profile/avatar-field.tsx ───────────────────────────────────────────────────────────────────
  //
  // ONE REGION FOR FOUR REFUSALS, THE SAVE FAILURE AND THE REMOVAL FAILURE, SO ONE ORDINAL. The
  // field holds a single refusal slot rather than one per outcome, because a field that can only
  // ever have refused ONE thing rendering two regions is the shape rule 6 forbids. The slot is spent
  // in exactly one place at a time: on the page while nothing is open, inside the crop dialog while
  // a file is staged, and inside the removal confirm while that is open — which is why this row and
  // `avatar-crop-save-error` below describe elements that are never mounted together.
  //
  // ⚠ AND THE ELEMENT IS WRITTEN ONCE IN THAT FILE AND GIVEN TWO POSSIBLE PARENTS, rather than
  // written twice. Plan 16-12 added the removal failure to this slot; a second element would have
  // been an undeclared `alert#2` in a declared file, which the scan keys by ordinal and would
  // report — whether or not the two could ever be on screen together.
  "avatar-field-refusal": {
    file: "src/components/profile/avatar-field.tsx",
    kind: "alert",
    at: 1,
    announces:
      "Whichever refusal the person earned, verbatim and once. Four of them are pre-dialog and are " +
      "about the FILE — the wrong-type sentence, the over-5-MB sentence, the undecodable sentence " +
      "or the too-small sentence — and each names what to pick INSTEAD rather than only what was " +
      "wrong, so a listener is told what to do next and not merely that they failed. The other two " +
      "are about an attempt that was made and did not land: a save that failed after the framing " +
      "was confirmed, and (since CROP-03) a removal that failed, each announced from inside the " +
      "overlay that is still open on it. It is cleared at the top of the next attempt, so a second " +
      "refusal is a second announcement rather than a silent no-op.",
    why:
      "RULE 2. An upload the person started came back refused and the FILE THEY CHOSE is the thing " +
      "that has to change, so it is a genuine failure needing a human rather than a state that will " +
      "resolve itself. RULE 5 by its own text: the sentence names which constraint was missed, and " +
      "a label announced in its place would leave a person re-picking the same file.\n" +
      "\n" +
      "⚠ NOTHING ELSE ON THIS SURFACE CARRIES THE NEWS, which is why the region is not optional " +
      "decoration. All four refusals happen BEFORE any overlay opens: no dialog appears, no page " +
      "navigates, the avatar in the circle does not change, and the picker closes exactly as it " +
      "does on success. To anyone not watching that one line, choosing a rejected file and choosing " +
      "an accepted one look identical.\n" +
      "\n" +
      "Named by its CONTENT, like every other refusal on the account surfaces. The component " +
      "authors none of these sentences — each is an imported literal, and the two failure sentences " +
      "are the SERVER'S OWN, passed through verbatim — which is what keeps the thing announced " +
      "identical to the thing the contract says.",
  },

  // ─── profile/image-crop-dialog.tsx ──────────────────────────────────────────────────────────────
  //
  // ONE REGION, ONE KIND, SO ONE ORDINAL, and the file is a composite rather than a page: the crop
  // dialog is mounted only while a file is staged and unmounted the instant it is not, so this row
  // describes an element that exists for the length of one framing decision.
  "avatar-crop-save-error": {
    file: "src/components/profile/image-crop-dialog.tsx",
    kind: "alert",
    at: 1,
    announces:
      "The save-failure sentence the avatar action returned, verbatim and once, when a save the " +
      "person started from inside the crop dialog comes back refused — and the SAME sentence when " +
      "the framing could not be turned into bytes at all, because to the person those are one " +
      "outcome and not two. It is cleared at the top of the next attempt, so a second failure is a " +
      "second announcement rather than a silent no-op.",
    why:
      "RULE 2. The person pressed a confirm and the photo is not saved, so it is a genuine failure " +
      "needing a human — they have to press it again, re-frame, or pick another file — rather than " +
      "a state that will resolve itself. RULE 5 by its own text: the sentence names what went " +
      "wrong, and a label announced in its place would leave a person staring at an unchanged " +
      "dialog with no idea whether anything happened.\n" +
      "\n" +
      "⚠ IT IS AN ALERT BECAUSE THE DIALOG STAYS OPEN, WHICH IS THE WHOLE REASON THE ROW EXISTS. " +
      "Rule F5 forbids close-then-report: a failure never closes this overlay and never disturbs " +
      "the framing, so nothing about the screen changes except this one line appearing inside a " +
      "modal the person is already focused within. There is no navigation, no toast and no " +
      "re-render of the surface behind it to carry the news — without the region the interruption " +
      "is silent for anyone not looking at that corner of the sheet.\n" +
      "\n" +
      "Named by its CONTENT, like every other server sentence on the account surfaces. The dialog " +
      "authors none of this text: the sentence arrives as a prop and is rendered unmodified, which " +
      "is what keeps the thing announced identical to the thing the action actually said.",
  },

  // ─── ops/ops-decision-actions.tsx (plan 18-10 — the internal ops console) ───────────────────────
  "ops-decision-refusal": {
    file: "src/components/ops/ops-decision-actions.tsx",
    kind: "status",
    at: 1,
    announces:
      "the refusal sentence the SERVER composed, verbatim — the host or listing is no longer " +
      "awaiting a decision, another operator got there first, the operator is acting faster than " +
      "the ops budget allows, or a booking's payout left FitOut between the figures being painted " +
      "and the confirm being pressed — once, after the operator presses Approve or confirms a " +
      "rejection and the action refuses. NOTHING on the success path: a recorded decision takes the " +
      "row off the queue, so the outcome is the surface disappearing rather than a sentence about it.",
    why:
      "RULE 1, RULE 5 and RULE 6. It appears strictly AFTER something the operator did, so `status` " +
      "and never `alert`: a listing another operator already decided, or a stale impact snapshot, is " +
      "an expected outcome on a shared queue and not a fault of this operator's. It carries no alarm " +
      "ink for the same reason, and no retry affordance — the row's OWN two controls are the retry, " +
      "and a second button that re-presses the first one is a control that acts on nothing.\n" +
      "\n" +
      "RULE 6 — ONE REGION FOR BOTH PATHS. Approve and Reject share a single refusal slot because a " +
      "row can only ever have refused one thing; a second refusal replaces this sentence with the " +
      "next, which is one announcement per press. The success path keeps its toast, and that is a " +
      "per-PATH decision rather than a per-component one: a refusal leaves the surface on screen and " +
      "belongs on it, while a success takes the surface away and has nowhere else to go.\n" +
      "\n" +
      "⚠ THE MONEY PATH IS WHY THE VERBATIM RULE IS NOT STYLISTIC HERE. The escalation cancels real " +
      "bookings and sends real money back, and the server re-derives every figure the dialog showed. " +
      "A mismatch comes back as a calm typed refusal carrying the action's OWN sentence; a client " +
      "re-wording of it would be a second account of what happened to somebody's money, kept in " +
      "agreement with the first by nothing at all.\n" +
      "\n" +
      "IT HAS TEXT OF ITS OWN AND IS NAMED ANYWAY — see its `AUTHOR_NAMED_REGIONS` row, which states " +
      "what that trade costs rather than pretending the wrapper argument applies to it.",
  },

  // ─── host/verification-panel.tsx ────────────────────────────────────────────────────────────────
  "host-verification-refusal": {
    file: "src/components/host/verification-panel.tsx",
    kind: "status",
    at: 1,
    announces:
      "The submission action's own sentence, verbatim, at the moment a press comes back refused — " +
      "an unconfirmed email, a phone outside the permissive bound, the burst guard, the one calm " +
      "no-op that covers five source states at once, or a checking partner that would not answer. " +
      "The element is absent from the document until a refusal lands and disappears again on the " +
      "next press, so what a listener hears is one sentence per press and never a re-read of the " +
      "last one. NOTHING on the success path: the host leaves for another origin, so there is no " +
      "moment at which an announcement could be heard.",
    why:
      "RULE 1, RULE 5 and RULE 6. It appears strictly AFTER something the host did, so `status` and " +
      "never `alert`: an unconfirmed email and a cooldown that has not elapsed are ordinary states " +
      "of an account, not faults needing a person, and this surface's whole tone ruling is that a " +
      "host shown the elevated role for ordinary states stops believing it when it matters. It " +
      "carries no alarm ink for the same reason, and no retry affordance — the form's OWN control is " +
      "the retry, and a second button that re-presses the first one acts on nothing.\n" +
      "\n" +
      "RULE 6 — ONE REGION FOR EVERY BRANCH. The action has six refusals and this is one slot, " +
      "because a press can only ever have refused one thing. That is also a PRIVACY property rather " +
      "than an economy: the 0-row sentence deliberately collapses five conditions — suspended, " +
      "already pending, already approved, grandfathered, and a cooldown still running — into one " +
      "calm sentence, so a suspended host cannot learn from the SHAPE of a refusal that they are " +
      "distinguishable from a host who simply asked too soon. A per-branch region would hand that " +
      "distinction back through the markup.\n" +
      "\n" +
      "⚠ THE SENTENCE IS THE SERVER'S AND THE CLIENT RE-AUTHORS NONE OF IT. A second wording of a " +
      "refusal is a second thing to keep in agreement with the code that refused, and one of these " +
      "sentences is about a person's own standing on the platform.\n" +
      "\n" +
      "IT HAS TEXT OF ITS OWN AND IS NAMED ANYWAY — see its `AUTHOR_NAMED_REGIONS` row, which states " +
      "what that trade costs on a surface a host meets once.",
  },

  // ─── ops/ops-contact-reveal.tsx ─────────────────────────────────────────────────────────────────
  "ops-contact-refusal": {
    file: "src/components/ops/ops-contact-reveal.tsx",
    kind: "status",
    at: 1,
    announces:
      "The reveal action's own sentence, verbatim, at the moment a press comes back refused — the " +
      "read failed (a malformed id, a host row that left the queue between paint and press, or a " +
      "query that threw), or the burst guard fired. The element is absent from the document until a " +
      "refusal lands and is cleared on the next press, so a listener hears one sentence per press " +
      "and never a re-read of the last one. NOTHING on the success path: the two revealed values " +
      "appear and FOCUS MOVES onto the revealed email VALUE — a programmatically-focusable " +
      "plain-text node, not a control (D-274) — and that move is the announcement.",
    why:
      "RULE 1, RULE 5 and RULE 6, plus RULE 7 for the half this region deliberately does NOT carry.\n" +
      "\n" +
      "RULE 1 / RULE 5 — it appears strictly AFTER something the operator did, so `status` and never " +
      "`alert`: a queue that has moved on since it was painted is the normal state of a shared " +
      "console, not a fault of this operator's. No alarm ink, and no retry affordance — the control " +
      "returns to idle and IS the retry.\n" +
      "\n" +
      "RULE 6 — ONE REGION, ONE OUTCOME, and here that means one region for the FAILURE PATH ONLY. " +
      "The success path's announcement is rule 7's *polite region + moved focus* mechanism reduced " +
      "to its second term: the outcome of a successful reveal is CONTENT APPEARING ELSEWHERE IN THE " +
      "LIST — the `Contact` fact is replaced by `Email` and `Phone` — and moving focus onto the " +
      "revealed VALUE speaks the address, its `<dt>` context and the thing the operator pressed to " +
      "read, in one move. A second polite region saying so beside that focus move would be two " +
      "announcements for one outcome. ⚠ SO NO SUCCESS REGION MAY BE ADDED HERE, and the reason is a " +
      "mechanism rather than an economy: it is the third distinct reason this set has had for owing " +
      "no success region (the ops decision row's surface disappears, the host panel's host " +
      "disappears, and this one's outcome is audible because focus moved), which is why each is " +
      "written at its own site.\n" +
      "\n" +
      "⚠ AND D-274 (2026-09-03) MADE THAT SENTENCE STRONGER RATHER THAN STALE. The focus target was " +
      "the compose anchor plan 18.1-13 shipped; the PM ruled the revealed contact must be plain, " +
      "copy-pasteable text, so it is now a `tabIndex={-1}` text node inside the same `<dd>` the " +
      "anchor occupied. That is rule 7's second term reduced FURTHER STILL — an announcement carried " +
      "by a value rather than by anything operable — and the properties it depends on are structural: " +
      "the `<dt>` context comes from the target's POSITION and the spoken value is its own text. A " +
      "region was weighed against it and refused on this paragraph's own terms, plus three costs the " +
      "module can measure: `LIVE_REGION_IDS` +1, an `AUTHOR_NAMED_REGIONS` row, and " +
      "`tests/ops/ops-queue-row.test.tsx`'s assertion that the refusal region is the ONLY " +
      "`[role=\"status\"]` on the row. The shipped shape moves no count in this file.\n" +
      "\n" +
      "⚠ AND THE SENTENCE IS THE SERVER'S, UNALTERED. This action returns PII and refuses for " +
      "reasons an operator must be able to act on; a client re-wording would be a second account of " +
      "why a disclosure did not happen, kept in agreement with the first by nothing at all.\n" +
      "\n" +
      "IT HAS TEXT OF ITS OWN AND IS NAMED ANYWAY — see its `AUTHOR_NAMED_REGIONS` row, which states " +
      "what that trade costs on a row that holds two other named controls.",
  },
};

/**
 * THE FOURTEEN REGIONS WHOSE NAME COMES FROM AN `aria-label` DESPITE NOT BEING `loading`, EACH WITH
 * THE REASON IT CARRIES ONE.
 *
 * ⚠ NINE UNTIL PLAN 15-09, which added the two account-surface rows at the bottom: the reset-request
 * result and the profile save line. Both are case (a) and neither widens the exception's shape — the
 * five alerts the same plan declared carry their server sentences and are named by their content, as
 * every refusal on those surfaces must be. Then twelve — plans 18-10 (the ops decision row) and
 * 18.1-11 (the host verification panel) — and FOURTEEN with plan 18.1-13's ops contact reveal.
 *
 * ⚠ THIS COUNT READ "ELEVEN" AGAINST A LIST OF THIRTEEN, and it is corrected here rather than
 * carried. The count is prose and nothing checks it, unlike the file-count alias — but a stated
 * number that is wrong is worse than no number, because the both-directions membership assertion
 * below is what a reader is being invited to trust and a stale count invites them to believe the list
 * was audited more recently than it was.
 *
 * See the header's naming section for why this exists at all instead of the blanket ban it replaced.
 *
 * ⚠ THE ONE-LINE SUMMARY THIS DOCBLOCK USED TO CARRY WAS "every one of these is a WRAPPER", AND PLAN
 * 14-14 RETIRED IT RATHER THAN STRETCHING IT. That sentence was true of the five Phase-13 rows and it
 * was read as the rule; it was never the rule. `status` is `nameFrom: author` in ARIA, so a region
 * carrying that role computes an accessible name of `""` WITHOUT a label whether its text is composed
 * by a child or written into the element itself. The wrapper shape decided nothing; it was what Phase
 * 13 happened to ship. The rows now split into two kinds, and each row says in its first clause which
 * kind it is:
 *
 *   (a) NOTHING TO BE NAMED BY. Nine rows. Either the role sits on a wrapper whose announceable
 *       content is composed by a child (`MoneyStatement`, `PanelCard`, `AlertDescription`), or the
 *       element is mounted at all times and its TEXT IS EMPTY until an outcome lands. Both are the same
 *       defect `loading` carries and the same fix: a region named by text it does not have has no name.
 *
 *   (b) TEXT OF ITS OWN, NAMED ANYWAY, WITH THE COST STATED. Two rows, both added by plan 14-14 on the
 *       host surfaces: `request-action-refusal` and `photo-uploader-requirement`. 14-UI-SPEC's
 *       falsifiable #2 requires every `status` region on those surfaces to resolve to a non-empty name,
 *       and the VoiceOver hazard below is REAL for these two rather than absent. They are here, not
 *       hidden: each row names what the trade costs and where the same fact is carried a second time,
 *       so a reader can weigh it. ⚠ THIS IS NOT A GENERAL LICENCE. The booker path's content-named
 *       regions — `collision-notice`, `book-cta-notice`, `reserve-actions-notice`, `search-relax-band`,
 *       `spots-left-chip`, both `slot-picker` hints — carry NO label and MUST NOT be given one; their
 *       rows say so individually and their sentences are the message.
 *
 * ⚠ THE RULE THE NAMES THEMSELVES OBEY, which nothing here can check and every reviewer must: a name
 * is a two- or three-word LABEL saying WHICH region this is, never a copy or a paraphrase of the
 * sentence inside it. On the VoiceOver/Safari pairing a named live region can be announced BY ITS NAME
 * INSTEAD OF ITS CONTENT, so a name that duplicated the sentence would read it twice and a name that
 * paraphrased it would replace it with a worse version. `name` is recorded per row so that check is a
 * reading rather than a hunt through nine files.
 *
 * The GATE asserts membership in BOTH directions — a named non-`loading` region missing from this list
 * fails, and a row here whose region carries no name fails — so the list can neither be padded nor
 * quietly bypassed. It also reads each `name` back off the markup, so a row whose recorded string has
 * drifted from the constant the component renders fails too.
 */
export const AUTHOR_NAMED_REGIONS = [
  {
    id: "search-progress",
    name: "Search progress",
    why:
      "The coordinator status remains mounted and empty until an answer transition or a browser-location outcome, so it has no stable text from which to derive its accessible name at idle. The name identifies the changing line without restating its outcome.",
  },
  {
    id: "pending-payment",
    name: "Payment status",
    why:
      "The role is on a wrapper around `MoneyStatement`, which is shared with three states that are " +
      "static on arrival and whose own contract is that it carries no region. The wrapper has no text " +
      "of its own, and the three sentences it holds are the component's, not the region's.",
  },
  {
    id: "group-attendee-removed",
    name: "Attendee removed",
    why:
      "A wrapper around `PanelCard`, which takes no `role` — the bare-wrapper shape " +
      "`money-statement.tsx` established so the announced box is the panel, padding included. It is " +
      "absent from the DOM until a removal lands, so there is nothing there to take a name from.",
  },
  {
    id: "group-link-rotated",
    name: "Invite link updated",
    why:
      "The same wrapper-around-`PanelCard` shape as the removal alert beside it, and absent until the " +
      "box notices the URL it renders has moved. 13-05 chose the label over the sentence explicitly.",
  },
  {
    id: "rsvp-recorded",
    name: "RSVP recorded",
    why:
      "A wrapper whose children are an icon, a heading and a paragraph — `status` is nameFrom:author, " +
      "so none of them names it. The label covers both answers, because a decline is as recorded as " +
      "an acceptance.",
  },
  {
    id: "rsvp-refused",
    name: "RSVP not saved",
    why:
      "An `<Alert>` wrapper around `AlertDescription`, mounted only while the server's refusal " +
      "sentence exists. That sentence is the SERVER's and is rendered verbatim; the region's name has " +
      "to come from somewhere else or it is the empty string.",
  },
  {
    id: "wizard-save-state",
    name: "Save state",
    why:
      "(a) NOTHING TO BE NAMED BY — and by a route none of the four rows above takes, which is why " +
      "this `why` could not be borrowed from any of them. It is not a wrapper: the role sits on the " +
      "element that holds the text. But D-150 requires it to be MOUNTED AT ALL TIMES WITH ITS TEXT " +
      "EMPTY AT IDLE, so that the save state changes in place rather than the element coming and " +
      "going, and idle is most of a wizard session. A region named by its own text has no name at all " +
      "for all of that time. Two words that say which line moved; the saving label, the saved label " +
      "and the failure prefix plus the server's sentence all stay the content.",
  },
  {
    id: "request-action-refusal",
    name: "Request not actioned",
    why:
      "(b) TEXT OF ITS OWN, NAMED ANYWAY. This region holds the server's refusal sentence directly, " +
      "so the VoiceOver hazard is real for it: a reader who hears the name instead of the content " +
      "hears three words where a reason belonged. It is named because 14-UI-SPEC's falsifiable #2 " +
      "requires every `status` region on the Phase-14 surfaces to resolve to a non-empty name, and " +
      "because an unnamed one is unreachable by name to a host navigating the inbox deliberately. " +
      "WHAT THE TRADE COSTS IS BOUNDED: the refusal never disappears with the announcement — it stays " +
      "rendered in the row, at ordinary ink, until the host acts again — so a lost announcement costs " +
      "a re-read rather than the fact. The label is three words and names neither of the two server " +
      "sentences it can carry.",
  },
  {
    id: "address-lookup-result",
    name: "Address lookup",
    why:
      "(a) NOTHING TO BE NAMED BY, the same route as the wizard's save state: mounted at all times and " +
      "EMPTY until a lookup resolves, which on the address step is most of the time a host spends " +
      "there. It persists rather than mounting per outcome so its text changes in place, which is what " +
      "makes one lookup one announcement. Two words that name the region and paraphrase neither the " +
      "located sentence nor the failure sentence it can hold.\n" +
      "\n" +
      "⚠ THE EMPTINESS THIS CASE RESTS ON WAS FALSE ON THE EDIT PATH FOR ONE PHASE, and case (a) is " +
      "the ONLY thing holding this row out of case (b) — so it is worth saying where the emptiness " +
      "now comes from rather than assuming it. The region's located branch used to read a value the " +
      "wizard SEEDS from the stored listing, so on an edit it mounted full; it now reads an outcome " +
      "only a resolution writes. Case (a) is therefore earned by the state's shape, not by the step " +
      "usually being quiet. Verified by a render — `tests/listing/address-autocomplete.test.tsx` — " +
      "because this module's own gate reads source and cannot see a mounted element's text. Full " +
      "argument in the `LIVE_REGIONS` row (code review WR-04).",
  },
  {
    id: "photo-uploader-requirement",
    name: "Photo requirement",
    why:
      "(b) TEXT OF ITS OWN, NAMED ANYWAY, and this is the row a reader should be most sceptical of. " +
      "The region is a REQUIREMENT METER on the wizard's photos step and its content is a count that " +
      "changes under the host; naming it accepts the VoiceOver risk that the label is read instead of " +
      "the count. It is accepted for two stated reasons rather than one. First, the alternative was an " +
      "exclusion row naming Phase 16, which would have left `LIVE_REGION_EXCLUSIONS` at one — a row " +
      "traded for a row, and the discharge undone. Second, THE COUNT IS CARRIED A SECOND TIME AND " +
      "LIVE: the publish checklist's \"3+ photos\" row is driven by the same `photoCount` state on the " +
      "same step, so a reader who hears the label instead of the sentence has not lost the only copy " +
      "of the fact. Two words that name the line without restating the number.",
  },
  {
    id: "forgot-request-result",
    name: "Reset request result",
    why:
      "(a) NOTHING TO BE NAMED BY — by the wrapper route rather than the empty-at-idle one, and the " +
      "wrapper here is the CARD. The region is the paragraph the reset form is REPLACED by, so it is " +
      "absent from the document until a submit lands and there is nothing on the page to take a name " +
      "from before then. `status` is nameFrom:author, so without a label it resolves to the empty " +
      "string and is announced as an unlabelled region. Three words that say which result this is; " +
      "the anti-enumeration sentence stays the content, unparaphrased, because the whole property of " +
      "that sentence is that it is the SAME one either way and a name that hinted otherwise would " +
      "undo it.",
  },
  {
    id: "profile-save-result",
    name: "Save state",
    why:
      "(a) NOTHING TO BE NAMED BY — the wizard's precedent reused verbatim, and deliberately the same " +
      "STRING as `wizard-save-state` because it is the same job on the other side of the account: two " +
      "words that say WHICH line moved. The region is mounted only while `saved` is true, so for " +
      "every other moment of a profile session there is no element to be named by its text; and when " +
      "it is mounted its text is two words of its own, which a name must therefore not paraphrase. " +
      "\"Profile saved.\" stays the content.",
  },
  {
    id: "ops-decision-refusal",
    name: "Decision not recorded",
    why:
      "(b) TEXT OF ITS OWN, NAMED ANYWAY — the `request-action-refusal` row's shape, on the other " +
      "side of the marketplace and for the same reason. This region holds the server's refusal " +
      "sentence directly, so the VoiceOver hazard is real for it: an operator who hears the name " +
      "instead of the content hears three words where a reason belonged. It is named because a " +
      "`status` region takes no name from its own text, and an unnamed one is unreachable by name to " +
      "an operator navigating a queue of rows deliberately — on a surface where several rows can each " +
      "carry one, an unlabelled region is also indistinguishable from its neighbours.\n" +
      "\n" +
      "WHAT THE TRADE COSTS IS BOUNDED, AND THAT IS THE ONLY REASON IT IS ACCEPTABLE ON A MONEY " +
      "SURFACE: the refusal never disappears with the announcement — it stays rendered on the row, at " +
      "ordinary ink, until the operator acts again — so a lost announcement costs a re-read rather " +
      "than the fact. The label is three words, it names the OUTCOME rather than the cause, and it " +
      "paraphrases none of the several server sentences it can carry.",
  },
  {
    id: "host-verification-refusal",
    name: "Check not started",
    why:
      "(b) TEXT OF ITS OWN, NAMED ANYWAY — the `ops-decision-refusal` row's shape, on the other side " +
      "of the same console. This region holds the action's refusal sentence directly, so the " +
      "announced-by-name hazard is real for it rather than absent: a host who hears the label " +
      "instead of the content hears three words where a reason belonged. It is named because a " +
      "`status` region takes no name from its own text, and because this one sits inside a form " +
      "beside two field labels and two supporting lines — an unlabelled region on that surface is " +
      "unaddressable by name to somebody navigating a form deliberately.\n" +
      "\n" +
      "WHAT THE TRADE COSTS IS BOUNDED, AND ON A ONCE-EVER SURFACE THAT MATTERS MORE THAN USUAL: " +
      "the refusal never disappears with the announcement — it stays rendered beneath the control, " +
      "at ordinary ink, until the host presses again — so a lost announcement costs a re-read rather " +
      "than the fact. A host who missed why their ask was refused, on a page they visit once, would " +
      "otherwise be left pressing a button that keeps saying nothing.\n" +
      "\n" +
      "THE NAME IS A LABEL AND NOT A PARAPHRASE, and the rule bites hardest here because ONE of the " +
      "sentences it can carry collapses five conditions on purpose. Three words naming the OUTCOME " +
      "cannot leak which of the five it was; three words naming a CAUSE would have to pick one, and " +
      "picking one is the privacy property this region's row exists to protect.",
  },
  {
    id: "ops-contact-refusal",
    name: "Contact not shown",
    why:
      "(b) TEXT OF ITS OWN, NAMED ANYWAY. The region carries the reveal action's sentence, and the " +
      "VoiceOver hazard above is REAL for it rather than absent. It is named because of WHERE it " +
      "sits: this region is inside a `<dl>` on a queue row that already holds two other " +
      "author-named controls (`Approve {name}`, `Reject {name}`) and, once revealed, two more values " +
      "under their own `<dt>`s. An unlabelled region on THAT surface is unaddressable by name to an " +
      "operator working the row deliberately — and the row it sits in is one of many identical rows, " +
      "so \"the status region\" is not a way to find anything.\n" +
      "\n" +
      "WHAT THE TRADE COSTS IS BOUNDED. The sentence never disappears with the announcement — it " +
      "stays rendered beneath the control, at ordinary ink, until the operator presses again — so a " +
      "name read instead of the content costs a re-read rather than the fact. Both sentences this " +
      "region can hold also end in the same instruction (try again), so an operator who hears only " +
      "the label still knows the reveal did not happen.\n" +
      "\n" +
      "THE NAME IS A LABEL AND NOT A PARAPHRASE: three words naming the OUTCOME (the contact was not " +
      "shown), never the cause. Naming a cause would have to pick between a failed read and a burst " +
      "guard, and the action deliberately answers a malformed id, a vanished host and a thrown query " +
      "with ONE sentence so a caller cannot learn from the shape of a refusal which ids resolve.",
  },
] as const satisfies readonly AuthorNamedRegion[];

// ---------------------------------------------------------------------------
// Compile gate — the declared file count, checked on every machine by tsc and by `next build`
// ---------------------------------------------------------------------------

/** `T` must be exactly `true`; anything else is a compile error at the alias that uses it. */
type Assert<T extends true> = T;

/**
 * THE DECLARED SET IS THIRTY-ONE FILES. `visual-baselines.ts`'s idiom, for the same reason it uses it:
 * a declaration whose size nothing checks can shrink without leaving a trace, and a gate that quietly
 * covers less than it claims is worse than one that covers nothing, because it is trusted.
 *
 * The alias NAME carries the number so that MOVING the set forces renaming it — it was
 * `DeclaredFileCountIsNine` until plan 12-12 added `relax-band.tsx`, `…IsTen` until plan 12-13 added
 * `collision-notice.tsx`, `…IsEleven` until plan 13-14's discharge added six at once
 * (`pending-payment-state.tsx`, `request-countdown.tsx`, `attendee-roster.tsx`,
 * `rsvp-confirmation.tsx`, `rsvp-form.tsx`, `share-link-box.tsx`), and `…IsSeventeen` until plan
 * 14-14's discharge added four (`wizard.tsx`, `request-row.tsx`, `address-autocomplete.tsx`,
 * `photo-uploader.tsx`), `…IsTwentyOne` until plan 15-09 added five account surfaces — the four
 * route-group auth pages and the profile form, spelled out at the set itself because a glob written
 * inside a block comment closes it — `…IsTwentySix` until plan 16-09 added the avatar crop dialog,
 * and the one-file-short spelling of the present name (described, not spelled — see the note at the
 * set itself) until plan 16-10 added the avatar FIELD that opens it, closing the pass-through
 * 16-UI-SPEC's 26 -> 28 budget always described as two moves, and `…IsTwentyNine` until plan 18-10
 * added the ops console's decision controls, then the thirty-file spelling of this name until plan
 * 18.1-13 added the ops contact-reveal island.
 *
 * ⚠ PHASE 18.1'S BUDGET WAS ANOTHER TWO-STEP ONE, AND THE SEQUENCE IS RECORDED HERE — NOW COMPLETE —
 * SO IT READS AS A DECISION RATHER THAN AS AN OVERSHOOT. 18.1-UI-SPEC § Gate Amendments row 7 budgets
 * 29 -> 31, because Phase 18.1 authors a region in TWO new files: the host verification panel and the
 * ops contact-reveal island. They cannot be declared together — this gate requires every declared file
 * to EXIST and to CONTAIN its region, so a path declared a plan early fails on both counts. So:
 *
 *   29 -> 30   plan 18.1-11, `src/components/host/verification-panel.tsx`
 *   30 -> 31   plan 18.1-13, `src/components/ops/ops-contact-reveal.tsx` (this name) — DONE
 *
 * That is the identical shape 16-UI-SPEC's 26 -> 28 budget took, for the identical reason, and the
 * rename in between is the cost of the rule that a file's row lands in the same commit as its element.
 *
 * ⚠ THE SECOND STEP COST ONE RED, NOT TWO, AND THE DIFFERENCE IS THE HOP 18.1-11 ADDED. That plan
 * watched the count fail AND its region's `aria-label` fail to resolve, because the host panel names
 * its region from a constant exported by the copy module. The ops island declares
 * `OPS_CONTACT_REGION_NAME` in the file that renders it — the same shape `ops-decision-actions.tsx`
 * uses, and correct here for the reason the panel's was not: this string is INTERNAL console copy
 * with no host-visible twin and no copy module that owns it. So the same-file hop resolved it and only
 * the count reddened. The widened hop is still exercised by the host panel and by its own self-test.
 *
 * A `length extends number`
 * assertion would compile forever and
 * read exactly like this one; that is the failure mode a type-level gate is easiest to write. The friction IS the
 * mechanism: adding a live region to the audited set costs a rename, a row and a second literal in
 * `tests/design/live-regions.test.tsx`, and none of those can be done by accident.
 *
 * ⚠ THE NUMBER IS MEASURED, NOT PLANNED. 13-UI-SPEC's table predicted a different membership for two
 * of the six (see the header's TWO OF THE TEN note), so the set was read off an AST walk of the tree
 * this commit produces rather than off the document that scheduled the work. Watched failing under the
 * old number on 21 August 2026 — see `13-14-SUMMARY.md` for the verbatim `tsc` output. 14-UI-SPEC
 * predicted THREE additions and twenty; the fourth is `photo-uploader.tsx`, whose unnamed region was
 * fixed rather than excluded, so the measured number is twenty-one and the document was one short.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * OBSERVED RED (c) — PLAN 15-09'S FIVE, WATCHED BEFORE THE NUMBER MOVED. 24 August 2026.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * The procedure this docblock records from plan 14-14, run again rather than assumed: the five account
 * surfaces were written into `LIVE_REGION_FILES` and their seven rows into `LIVE_REGIONS`, the alias was
 * left reading `extends 21`, and `npx tsc --noEmit` was run bare (never piped — a pipe reports the LAST
 * command's exit code, which is this repository's standing trap). Exit code 2, ONE error, verbatim and
 * complete — this is the whole of stdout:
 *
 *   src/lib/design/live-regions.ts(1627,3): error TS2344: Type 'false' does not satisfy the constraint
 *   'true'.
 *
 * Then `21` → `26` and the alias renamed → exit 0.
 *
 * ⚠ IT IS ONE ERROR, NOT TWO, AND THE DIFFERENCE FROM OBSERVED RED (b) IN THE HEADER IS THE WHOLE
 * READING. Red (b) — a path DELETED from the set — produced a TS2820 at the orphaned row as well,
 * because a row naming a file the union no longer contains cannot type. WIDENING produces no such
 * companion: every new row names a path that is now in the union, so the ONLY thing that fails is the
 * count. That is the assertion doing exactly the job it was written for. Without it, adding five files
 * and seven rows to this module would have compiled silently, and the audited set would have grown by
 * a quarter with nothing in the diff saying so out loud.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * OBSERVED RED (d) — PLAN 16-09'S ONE, AND THE ORDER THE RED ONLY EXISTS IN. 25 August 2026.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * Same procedure, one file: `src/components/profile/image-crop-dialog.tsx` was written into
 * `LIVE_REGION_FILES` with NO row and the alias left reading `extends 26`, and `npx tsc --noEmit` was
 * run bare (never piped). Exit code 2, ONE error, verbatim and complete:
 *
 *   src/lib/design/live-regions.ts(1663,3): error TS2344: Type 'false' does not satisfy the constraint
 *   'true'.
 *
 * `tests/design/live-regions.test.tsx` failed twice in the same state — the count guard, and SCAN 2
 * reporting `image-crop-dialog.tsx:404 — alert#1 on <p> (role="alert")` as PRESENT BUT UNDECLARED.
 * Then the row, `26` → `27`, and the rename → exit 0, 26 tests passed.
 *
 * ⚠ THE STEP ORDER IS NOT CEREMONY, AND PLAN 16-09 EXPECTED THE WRONG RED UNTIL IT WAS MEASURED. A
 * `role="alert"` added to a file that is NOT yet in this array produces NO failure of any kind:
 * `tests/design/live-regions.test.tsx:228` sets `SCAN_FILES = LIVE_REGION_FILES`, so the walker never
 * opens an undeclared file and cannot report what it never read. "Present but undeclared" is therefore
 * reachable only for a file already inside the set — which means the path goes in FIRST, alone, and
 * the red is watched THEN. A plan that writes the path, the row and the number in one edit has not
 * skipped a formality; it has never been in the state where the gate could speak.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * OBSERVED RED (e) — PLAN 16-10'S ONE, AND THE FIRST TIME (d)'S NOTE WAS USED RATHER THAN REDISCOVERED.
 * 25 August 2026.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * `src/components/profile/avatar-field.tsx` was created with its `role="alert"` and the suite was run
 * FIRST, before this module was touched at all: `1 passed (1) / 26 passed (26)`. That is (d)'s claim
 * re-measured on a second file rather than taken on trust — a region in an undeclared file is
 * invisible to this gate. The path then went into `LIVE_REGION_FILES` ALONE, no row, alias left
 * reading `extends 27`. `npx tsc --noEmit`, run bare — exit code 2, ONE error, the whole of stdout:
 *
 *   src/lib/design/live-regions.ts(1742,3): error TS2344: Type 'false' does not satisfy the constraint
 *   'true'.
 *
 * `tests/design/live-regions.test.tsx` failed twice in that same state — the count guard ("the
 * declared set is 28 files, not 27"), and SCAN 2 reporting `avatar-field.tsx:296 — alert#1 on <p>
 * (role="alert")` as PRESENT BUT UNDECLARED. Then the row, `27` → `28`, the rename, and the second
 * pin in the test → exit 0, 26 tests passed.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * OBSERVED RED (f) — PLAN 18-10'S ONE, THE INTERNAL OPS CONSOLE. 1 September 2026.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚠ THE PROCEDURE WAS RUN IN A DIFFERENT ORDER FROM (d) AND (e), AND THE DIFFERENCE IS RECORDED RATHER
 * THAN GLOSSED. Here the path, the row and the two `AUTHOR_NAMED_REGIONS`/`LIVE_REGION_IDS` entries
 * went in together and the TWO PINS were then STALED BACK to 28 to watch them speak — the inverse of
 * (e)'s order, and it measures the same property: whether a widened set with a stale literal fails.
 * What it does NOT measure is (d)'s claim about SCAN 2 reporting a present-but-undeclared region, so
 * that half is NOT claimed here. It was measured twice already and nothing about it changed.
 *
 * With the alias staled to `extends 28`, `npx tsc --noEmit` run bare (never piped — a pipe reports the
 * LAST command's exit code, this repository's standing trap): exit code 2, ONE error, the whole of
 * stdout:
 *
 *   src/lib/design/live-regions.ts(1910,3): error TS2344: Type 'false' does not satisfy the constraint
 *   'true'.
 *
 * With `DECLARED_FILE_COUNT` staled to 28 as well, `tests/design/live-regions.test.tsx` reported
 * 1 failed / 25 passed, verbatim:
 *
 *   AssertionError: the declared set is 29 files, not 28. … expected 29 to be 28
 *
 * Then both pins back to `29` → `tsc` exit 0, 26 tests passed.
 *
 * ⚠ THE WIDENING IS A MEMBERSHIP CHANGE AS WELL AS A COUNT, WHICH THE FIVE REDS ABOVE WERE NOT. Every
 * previous addition sat inside a journey the rule already named; this one is the first STAFF-ONLY
 * surface in the set, so the header's membership paragraph moved in the same commit. A count that
 * moved while the rule kept asserting the set contained no ops file would be the drift this module
 * exists to make impossible, one layer up from the type system.
 *
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 * OBSERVED RED (g) — PLAN 18.1-11'S ONE, THE HOST-STANDING SURFACE. 2 September 2026.
 * ═══════════════════════════════════════════════════════════════════════════════════════════════════
 *
 * ⚠ 18.1-UI-SPEC § Gate Amendments ROW 7 BUDGETS 29 -> 31 IN ONE MOVE, AND THIS IS 30. That is the
 * same deliberate pass-through 16-UI-SPEC's 26 -> 28 budget made, for the same mechanical reason: the
 * gate requires every declared file to EXIST and to CONTAIN its region, so two files that land in two
 * different plans cannot be declared in one step. Plan 18.1-11 adds
 * `src/components/host/verification-panel.tsx` here; plan **18.1-13** adds the ops contact-reveal
 * island and takes this to **31**. The intermediate rename is the cost of the rule that each file's
 * row lands in the same commit as its element, and the sequence is written down here so a reader who
 * finds the thirty-file spelling in the history reads it as a decision rather than as a miscount.
 *
 * The order was (f)'s: the path, the row and the two `LIVE_REGION_IDS`/`AUTHOR_NAMED_REGIONS` entries
 * went in together and BOTH pins were left stale at 29 to watch them speak. `npx tsc --noEmit` run
 * bare (never piped — a pipe reports the LAST command's exit code, this repository's standing trap):
 * exit code 2, ONE error, the whole of stdout:
 *
 *   src/lib/design/live-regions.ts(2005,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
 *
 * and `tests/design/live-regions.test.tsx` reported 2 failed / 24 passed, verbatim:
 *
 *   AssertionError: the declared set is 30 files, not 29. … expected 30 to be 29
 *   AssertionError: host-verification-refusal (…verification-panel.tsx:395) has an aria-label this
 *   scan cannot resolve to a string. …
 *
 * ⚠ THE SECOND OF THOSE TWO IS A FINDING RATHER THAN A STALE NUMBER, AND IT IS WHY THE GATE'S SCANNER
 * MOVED IN THIS COMMIT. Until now every author-named region took its name from a const declared in
 * the SAME file, and the resolver could only take that one hop. This region's name is
 * `HOST_VERIFICATION_REGION_NAME`, exported by the copy module that owns every other word the panel
 * renders — so the two remedies the failure message offers (inline it, or hoist a local copy) are
 * both defects on that surface: the first makes a presentation component the author of host-visible
 * copy, and the second puts one name in two files with nothing keeping them equal. The SCAN was
 * widened by exactly one more statically decidable hop instead; see its own docblock in the test for
 * what that does and does not now resolve. Nothing was relaxed — the name must still be non-empty
 * and must still equal the string recorded below.
 */
export type DeclaredFileCountIsThirtyOne = Assert<
  (typeof LIVE_REGION_FILES)["length"] extends 31 ? true : false
>;

// ---------------------------------------------------------------------------
// Derivations the gate reads
// ---------------------------------------------------------------------------

/**
 * The key a row and a scanned element are compared on: `{file}#{kind}#{at}`.
 *
 * A function rather than a literal in each row, so the two sides of SCAN 2 cannot drift into two
 * spellings of one key — the failure that would present as every region being both declared-but-absent
 * and present-but-undeclared at once.
 */
export function liveRegionKey(part: {
  file: string;
  kind: LiveRegionKind;
  at: number;
}): string {
  return `${part.file}#${part.kind}#${part.at}`;
}

/** Every declared key, mapped back to the id that declared it, for the scan's failure messages. */
export const LIVE_REGION_KEYS: ReadonlyMap<string, LiveRegionId> = new Map(
  LIVE_REGION_IDS.map((id) => [liveRegionKey(LIVE_REGIONS[id]), id] as const),
);

// ---------------------------------------------------------------------------
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ---------------------------------------------------------------------------
//
//   • THIS IS A DECLARATION. It proves nothing about the tree on its own.
//     `tests/design/live-regions.test.tsx` is what makes it binding, and that file reads SOURCE — so a
//     region composed at runtime (a `role` from a prop, an `aria-live` from a variable) is invisible to
//     both. That direction is safe for a BAN (it can miss a violation, never invent one) and it is a
//     real hole.
//   • IT SAYS NOTHING ABOUT HOW MANY TIMES A SCREEN READER SPEAKS. Announcement is browser + AT
//     behaviour, not a DOM property. The announce-once COUNT is `e2e/hold-countdown.spec.ts`'s
//     clock-driven `toBe(1)`; RULE 6's one-region-per-outcome claim is
//     `e2e/collision-in-place.spec.ts`'s (plan 12-13); and whether a real reader utters them in the
//     intended ORDER is a listening test, routed to human UAT in Phase 17.
//   • A LIVE REGION THIS REPOSITORY DID NOT AUTHOR IS MOUNTED ON `/listings/[id]` AT ALL TIMES, AND
//     THIS MODULE CANNOT SEE IT. Measured by plan 12-13: `react-day-picker@9` renders its month caption
//     as `<span role="status" aria-live="polite">August 2026</span>`
//     (`dist/esm/DayPicker.js:293` — on the `CaptionLabel` element itself). The scan reads the SOURCE of
//     the eleven declared files, and that role is written inside a library; `src/components/ui/calendar.tsx`
//     does not carry it either, so there is nothing to declare and nothing to edit — the vendored file is
//     byte-unchanged by contract (T-12-09-VENDORFORK).
//     CONSEQUENCE FOR ANY "EXACTLY ONE REGION" CLAIM ON THIS ROUTE: it is one word narrower than it
//     reads. The checkable property is *exactly one region REPORTS THE OUTCOME*; the caption reports the
//     MONTH and changes only when the month does. `tests/availability/availability-calendar.test.tsx`
//     case (5) and `e2e/collision-in-place.spec.ts` case (c) both exclude it BY NAME
//     (`.rdp-caption_label`) and both assert the exclusion is non-vacuous, so it can never widen into
//     "ignore some regions". Anyone widening the declared set to cover vendored trees should start here.
//   • THE EXCLUSION LIST IS EMPTY, AND AN EMPTY LIST IS NOT A CLEAN BILL OF HEALTH. It used to read:
//     *"Nine excluded files carry `aria-live` today and this module makes no claim that any of them is
//     correct. Several are probably not."* That sentence was right twice over — plan 13-14 audited ten
//     and REMOVED six regions that wrapped a page, and plan 14-14 audited the eleventh and found the
//     same defect a third time, a static hint sitting inside a region. The paragraph is kept rather
//     than deleted because the general point outlives its instances, and it now points the other way:
//     reading an exclusion list as "audited and fine" was the misreading that would have made this file
//     harmful, and reading an EMPTY one as "there is nothing left to find" is the same mistake with
//     nothing to look at. What zero means is bounded by the header's membership rule and by the two
//     bullets above and below this one — the auth/profile forms and the `patterns/` skeletons are
//     outside the set entirely, and a region composed at runtime is invisible to the scan either way.
//   • THE ELEVEN `AUTHOR_NAMED_REGIONS` NAMES ARE PROSE THE GATE CANNOT JUDGE. It checks THAT each of
//     those regions carries an author name, that no undeclared region does, and that each recorded
//     string is the one the markup renders. Whether a given name is a LABEL or a paraphrase of the
//     sentence it sits on — the property the whole exception turns on — is a reading, not a
//     measurement, which is why each row records the exact string. That reading matters MORE since plan
//     14-14: two of the nine have text of their own, so for those two a name read instead of the
//     content costs a real sentence rather than nothing.
//   • `at` IS AN ORDINAL, SO IT ENCODES SOURCE ORDER. Two same-kind regions in one file swapping places
//     is invisible to the key comparison; only their `announces` text, which nothing mechanically
//     checks, would be wrong. `slot-picker.tsx` is the only file where that is possible today.
//   • THE `announces` AND `why` COLUMNS ARE PROSE. Nothing can tell a true sentence from a plausible
//     one. They are what a reviewer checks the seven rules against; they are not themselves checked.
