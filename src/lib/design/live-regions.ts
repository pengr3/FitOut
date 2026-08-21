// GATE-03 — THE declared live-region inventory for the BOOKER PATH. Every element on that path that
// carries `aria-live`, `role="status"`, `role="alert"` or `role="timer"`, with the sentence it makes a
// screen reader say, the moment it says it, and the numbered rule its shape satisfies.
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
// discharged the ten (see the DISCHARGE section below): the set is SEVENTEEN files and exactly ONE
// exclusion remains.
//
// So the set is a const tuple, its exclusions are a sibling const with a `why` per entry, and the file
// count is pinned by a type-level assertion. Narrowing the gate's reach then costs a compile error and an
// edit somebody has to justify, instead of costing nothing.
//
// THE EXCLUSIONS ARE THIS MODULE'S MOST IMPORTANT CONTENT, and the ten that are gone are the proof
// rather than a counter-example. They are the half a reader cannot reconstruct from the tree: "this file
// was looked at and deliberately left to a later phase" and "nobody has ever looked at this file"
// produce byte-identical scan results. Only one of them is a decision — and only a decision can be
// DISCHARGED, which is what the section below records happening to ten of the eleven.
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
// ⚠ THE DECLARED SET IS NO LONGER ONLY THE BOOKER PATH, AND THE CONSTANT'S NAME IS KEPT ANYWAY. Three of
// the six additions are surfaces a BOOKER never reaches: an organiser manages a group, and an INVITEE —
// who may have no account at all — answers an RSVP. The name is one this repository's tests and this
// module's own prose refer to by that spelling, and renaming an exported symbol to widen a comment is
// churn; the membership RULE is what matters and it is stated once, here: *every file in `src/` that
// renders a live region on the demand-side journey — search, checkout, and the post-booking lifecycle
// that journey hands off to.* What is left outside it is the SUPPLY side (Phase 14's host wizard, the
// one remaining exclusion), the auth/profile forms, and the `patterns/` skeletons that
// `tests/design/skeleton-a11y.test.tsx` gates instead.
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
// `"src/components/availability/spots-left-chip.tsx"` deleted from `BOOKER_PATH_LIVE_REGION_FILES`,
// nothing else changed. `npx tsc --noEmit` → exit 2, TWO errors, verbatim:
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
// Each lands its path in `BOOKER_PATH_LIVE_REGION_FILES`, its row(s) in `LIVE_REGIONS`, and BUMPS the
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
 * THE SEVENTEEN FILES GATE-03 IS A CLAIM ABOUT.
 *
 * Ordered by surface — availability, then booking, then search, then the group lifecycle — rather than
 * alphabetically, because the reading question this list gets asked is "does the gate cover the
 * checkout", not "where is X in the alphabet".
 *
 * Forward slashes, always. Every consumer normalises `path.relative`'s Windows backslashes before
 * comparing (`tests/design/sheet-absent.test.ts:249-256`'s idiom); without that, every prefix and
 * membership check here silently stops matching and each scan passes over an empty list.
 */
export const BOOKER_PATH_LIVE_REGION_FILES = [
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
  "src/components/search/relax-band.tsx",
  "src/components/search/search-results.tsx",
  // ─── the group lifecycle (plan 13-14's discharge — see the header) ──────────────────────────────
  "src/components/group/attendee-roster.tsx",
  "src/components/group/rsvp-confirmation.tsx",
  "src/components/group/rsvp-form.tsx",
  "src/components/group/share-link-box.tsx",
] as const;

/** The closed union every row's `file` is typed against. */
export type BookerPathLiveRegionFile = (typeof BOOKER_PATH_LIVE_REGION_FILES)[number];

/** One excluded file. `why` is mandatory and names the OWNING phase — a row without one is not a row. */
export type LiveRegionExclusion = {
  readonly file: string;
  readonly why: string;
};

/**
 * EVERY FILE IN `src/` THAT CARRIES `aria-live` AND IS DELIBERATELY NOT AUDITED HERE, WITH ITS REASON.
 *
 * ONE ROW, as of plan 13-14. It was ELEVEN — ten of them Phase 13's, discharged by the audit the header
 * describes.
 *
 * ⚠ THE ARITHMETIC, RE-MEASURED FROM SCRATCH on 21 August 2026 and NOT carried forward from any earlier
 * note (13-08 recorded that its own change moved the count and left the re-measurement to this plan;
 * the number below is a fresh reading of the tree this commit produces, and the two ways of counting
 * disagree, which is why both are given):
 *
 *   • BY MARKUP, which is what the gate actually reads. An AST walk of every `.tsx` under `src/` finds
 *     `aria-live` on the elements of SEVEN files: `slot-picker.tsx` (×2), `spots-left-chip.tsx`,
 *     `hold-countdown.tsx`, `request-countdown.tsx`, `rsvp-confirmation.tsx`, `rsvp-form.tsx` — all
 *     declared — and `address-autocomplete.tsx`, the row below. The two lists PARTITION the attribute
 *     exactly; there is no third category.
 *   • BY TEXT, which is what `grep -rln aria-live src/ --include=*.tsx` reports: THIRTEEN files — it
 *     was 19 at plan 12-13's measurement, and 13-08 recorded that its own change moved the number and
 *     left the re-reading to this plan. The extra SIX are PROSE. Five are declared files explaining
 *     regions they hold under a ROLE rather than the attribute (`availability-calendar.tsx`,
 *     `date-pass-picker.tsx`, `collision-notice.tsx`, `hold-expired-state.tsx`, `search-results.tsx`),
 *     and the sixth is `invite-card.tsx`, which appears in the grep on the strength of the comment
 *     explaining why 13-08 REMOVED its region — the one file in the tree that a text scan reports and
 *     both lists rightly omit. A text scan cannot tell an explanation from a declaration, which is why
 *     `tests/design/live-regions.test.tsx` strips comments before its own text scan and why this module
 *     lives outside the DS-13 leak gate's scanned tree.
 *
 * The declared SET is seventeen files, which is larger than either count because a `role="status"`,
 * `role="alert"` or `role="timer"` IS a live region without carrying the attribute at all —
 * `book-cta.tsx`, `reserve-actions.tsx`, `relax-band.tsx`, `collision-notice.tsx`,
 * `pending-payment-state.tsx`, `attendee-roster.tsx` and `share-link-box.tsx` are all in that shape.
 *
 * The one remaining reason is not schedule pressure. Phase 14 owns the host wizard; auditing its region
 * here would absorb another phase's scope AND would freeze markup that phase is about to rewrite, so the
 * audit would be re-done rather than reused.
 */
export const LIVE_REGION_EXCLUSIONS = [
  // ─── Phase 14 — the host wizard ─────────────────────────────────────────────────────────────────
  {
    file: "src/components/listing/address-autocomplete.tsx",
    why:
      "A HOST surface, Phase 14's. Its live region reports geocoding suggestions during listing " +
      "creation; no booker ever reaches it. The booker path is the demand side, which is what makes " +
      "this exclusion a scope boundary rather than an oversight.",
  },
] as const satisfies readonly LiveRegionExclusion[];

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
  readonly file: BookerPathLiveRegionFile;
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
 * `BOOKER_PATH_LIVE_REGION_FILES`, then by source order within the file.
 *
 * Twenty-three today (sixteen until plan 13-14's discharge added seven). The number is deliberately NOT
 * pinned by a type-level assertion, unlike the file count: `tests/design/live-regions.test.tsx`'s SCAN 2
 * asserts this set equals the set of regions actually present in the tree, which is strictly stronger
 * than agreeing with a literal. A count assertion beside a set assertion would only ever fail at the
 * same moment, one line earlier and with less information.
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
  // relax-band.tsx
  "search-relax-band",
  // search-results.tsx
  "search-results-fetch-error",
  // attendee-roster.tsx
  "group-attendee-removed",
  // rsvp-confirmation.tsx
  "rsvp-recorded",
  // rsvp-form.tsx
  "rsvp-refused",
  // share-link-box.tsx
  "group-link-rotated",
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

  // ─── relax-band.tsx ─────────────────────────────────────────────────────────────────────────────
  "search-relax-band": {
    file: "src/components/search/relax-band.tsx",
    kind: "status",
    at: 1,
    announces:
      '"Showing 6 spaces with the distance filter widened." — ONCE, on arrival, when a zero-result ' +
      "search is answered by relaxing one constraint. That `sr-only` sentence is the region's FIRST " +
      "child and it is followed by the two visible lines, which are also announced: \"Nothing at " +
      '9–11 AM on Fri, Aug 21 within 10 km." and "Showing 6 badminton courts within 25 km instead — ' +
      'same day and time. Your other filters are unchanged." It says nothing again — not on scroll, ' +
      "not on a Load more, and not on any re-render carrying the same rung.",
    why:
      "RULE 1 and RULE 6, and the sr-only lead is the part worth checking rather than skimming.\n" +
      "\n" +
      "RULE 1: this is the RESULT of something the booker did — they searched, and the system answered " +
      "with a different search. `role=\"status\"`, implicit polite, never `assertive`: nothing has " +
      "gone wrong and nothing needs interrupting.\n" +
      "\n" +
      "WHY THE ANNOUNCEMENT IS NOT SIMPLY LINE 1. Line 1 is a NEGATIVE statement, and a live region " +
      "that opens with \"Nothing at 9–11 AM…\" tells a blind booker their search failed at the exact " +
      "moment it succeeded differently. The `sr-only` first child front-loads the OUTCOME; the visible " +
      "lines follow as the detail. That is a deliberate duplication and not a stray label — which is " +
      "also why this region carries NO `aria-label`: `status` is nameFrom:author, and on the " +
      "VoiceOver/Safari pairing a named live region can be announced BY ITS NAME INSTEAD OF ITS " +
      "CONTENT, i.e. the sentence the booker needs would be replaced by a label nobody wrote for them " +
      "(the argument this module records at `reserve-actions-notice` and the five regions beside it).\n" +
      "\n" +
      "RULE 6 — ONE REGION PER OUTCOME, AND THE OTHER HALF OF IT IS STRUCTURAL. `search-results.tsx` " +
      "renders this band and the zero-result `EmptyState` in MUTUALLY EXCLUSIVE branches of one " +
      "ternary: if a rung fired there is a band and no empty state, and if every rung was exhausted " +
      "there is an empty state and no band. The two can never announce the same event, because they " +
      "can never be mounted together. `e2e/zero-result-relax.spec.ts` case (c) is the browser half — " +
      "after `Undo` the band's count is 0.\n" +
      "\n" +
      "ANNOUNCE-ONCE IS A PROPERTY OF THE DOM STAYING STILL, not of a flag: the rendered strings are " +
      "held in a ref KEYED BY THE RUNG, so a re-render carrying the same outcome produces " +
      "byte-identical children, mutates no text node, and gives the region nothing to re-announce.",
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
};

/**
 * THE FIVE REGIONS WHOSE NAME COMES FROM AN `aria-label` DESPITE NOT BEING `loading`, EACH WITH THE
 * REASON IT HAS NO CONTENT OF ITS OWN TO BE NAMED BY.
 *
 * See the header's naming section for why this exists at all instead of the blanket ban it replaced.
 * In one line: every one of these five is a WRAPPER — the role sits on a `<div>` (or an `<Alert>`)
 * whose announceable content is composed by a child, and which is EMPTY until an outcome lands. A
 * region with no text of its own and no author name computes an accessible name of `""`, which is
 * the same defect `loading` carries and the same fix.
 *
 * ⚠ THE RULE THE NAMES THEMSELVES OBEY, which nothing here can check and every reviewer must: a name
 * is a two- or three-word LABEL saying WHICH region this is, never a copy or a paraphrase of the
 * sentence inside it. On the VoiceOver/Safari pairing a named live region can be announced BY ITS NAME
 * INSTEAD OF ITS CONTENT, so a name that duplicated the sentence would read it twice and a name that
 * paraphrased it would replace it with a worse version. `name` is recorded per row so that check is a
 * reading rather than a hunt through five files.
 *
 * The GATE asserts membership in BOTH directions — a named non-`loading` region missing from this list
 * fails, and a row here whose region carries no name fails — so the list can neither be padded nor
 * quietly bypassed.
 */
export const AUTHOR_NAMED_REGIONS = [
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
] as const satisfies readonly AuthorNamedRegion[];

// ---------------------------------------------------------------------------
// Compile gate — the declared file count, checked on every machine by tsc and by `next build`
// ---------------------------------------------------------------------------

/** `T` must be exactly `true`; anything else is a compile error at the alias that uses it. */
type Assert<T extends true> = T;

/**
 * THE DECLARED SET IS SEVENTEEN FILES. `visual-baselines.ts`'s idiom, for the same reason it uses it: a
 * declaration whose size nothing checks can shrink without leaving a trace, and a gate that quietly
 * covers less than it claims is worse than one that covers nothing, because it is trusted.
 *
 * The alias NAME carries the number so that MOVING the set forces renaming it — it was
 * `DeclaredFileCountIsNine` until plan 12-12 added `relax-band.tsx`, `…IsTen` until plan 12-13 added
 * `collision-notice.tsx`, `…IsEleven` until plan 13-14's discharge added six at once
 * (`pending-payment-state.tsx`, `request-countdown.tsx`, `attendee-roster.tsx`,
 * `rsvp-confirmation.tsx`, `rsvp-form.tsx`, `share-link-box.tsx`). A `length extends number` assertion
 * would compile forever and read exactly like this one; that is the failure mode a type-level gate is
 * easiest to write. The friction IS the mechanism: adding a live region to the audited set costs a
 * rename, a row and a second literal in `tests/design/live-regions.test.tsx`, and none of those can be
 * done by accident.
 *
 * ⚠ THE NUMBER IS MEASURED, NOT PLANNED. 13-UI-SPEC's table predicted a different membership for two
 * of the six (see the header's TWO OF THE TEN note), so the set was read off an AST walk of the tree
 * this commit produces rather than off the document that scheduled the work. Watched failing under the
 * old number on 21 August 2026 — see the SUMMARY for the verbatim `tsc` output.
 */
export type DeclaredFileCountIsSeventeen = Assert<
  (typeof BOOKER_PATH_LIVE_REGION_FILES)["length"] extends 17 ? true : false
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
//   • THE EXCLUSION IS A SCOPE BOUNDARY, NOT A VERDICT. There is ONE left and this module makes no
//     claim that it is correct. It used to read: *"Nine excluded files carry `aria-live` today and this
//     module makes no claim that any of them is correct. Several are probably not — Phase 13's
//     `request-countdown.tsx` is a second ticking region and rule 3 applies to it identically."* That
//     sentence was right: plan 13-14 audited the ten, REMOVED six regions that wrapped a page and
//     reshaped the countdown, so only four of the ten survived as regions at all. The paragraph is kept
//     rather than deleted because the general point outlives its instance — reading an exclusion list as
//     "audited and fine" is the one misreading that would make this file harmful, and
//     `address-autocomplete.tsx` is now the file that sentence is about.
//   • THE FIVE `AUTHOR_NAMED_REGIONS` NAMES ARE PROSE THE GATE CANNOT JUDGE. It checks THAT each of
//     those regions carries an author name and that no undeclared region does. Whether a given name is
//     a LABEL or a paraphrase of the sentence it sits on — the property the whole exception turns on —
//     is a reading, not a measurement, which is why each row records the exact string.
//   • `at` IS AN ORDINAL, SO IT ENCODES SOURCE ORDER. Two same-kind regions in one file swapping places
//     is invisible to the key comparison; only their `announces` text, which nothing mechanically
//     checks, would be wrong. `slot-picker.tsx` is the only file where that is possible today.
//   • THE `announces` AND `why` COLUMNS ARE PROSE. Nothing can tell a true sentence from a plausible
//     one. They are what a reviewer checks the seven rules against; they are not themselves checked.
