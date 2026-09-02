// @vitest-environment jsdom

// GATE-03 — THE DECLARED LIVE REGIONS, AUDITED OVER A SET THAT SAYS WHAT IT IS.
//
// ⚠ IT WAS "THE BOOKER PATH'S" UNTIL PLAN 14-14, WHICH ADDED FOUR HOST FILES AND RENAMED THE SET THEY
// LIVE IN (`LIVE_REGION_FILES`). A title claiming the demand side would now be a comment disagreeing
// with the constant three lines below it.
//
// Three source scans plus one render fixture. `src/lib/design/live-regions.ts` is the declaration; this
// file is what makes it binding, and the render half is what makes SCAN 3 an argument rather than a
// preference.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE SCANS AND THE RENDER LIVE IN ONE FILE (a planner call, recorded so it is not re-litigated)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// A `.ts` source scan CANNOT compute an accessible name — there is no document, no ARIA implementation
// and nothing to hand `dom-accessibility-api`. A render test CANNOT read the tree it is auditing, because
// the nine components reach server modules, product data and a booking context, while
// `vitest.design.config.ts` is DB-free by construction. The two jobs are genuinely incompatible in one
// mechanism, and splitting them across two files would put the SCAN's premise in one place and its
// JUSTIFICATION in another, where the next person to relax the scan will not find it.
//
// So: one `.tsx` file with `// @vitest-environment jsdom` on line 1 — `skeleton-a11y.test.tsx` is the
// precedent that a `tests/design/**` file may do this and still run under the DB-free config. The scan
// half reads source with `node:fs` and asserts STRUCTURE. The render half renders two three-line
// fixtures, imports no domain component, and asserts the MECHANISM the structure stands in for.
//
// `dom-accessibility-api` IS NOT IMPORTED, HERE OR ANYWHERE IN THIS REPOSITORY. It is reached through
// `@testing-library`'s `{ name }` option, which is the engine behind every `getByRole(…, { name })` in
// the tree. Adding the direct import would be a new dependency edge for a capability already present
// (T-12-06-SC).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FIVE PROBES, ALL RUN, ALL REVERTED (18 August 2026). GREEN WAS 20 PASSED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// ⚠ GREEN WAS 21 PASSED as of plan 13-14, which widened the set from eleven files to seventeen and
// added one case ("every declared name is the string the markup actually renders"). FOUR MORE PROBES
// were run and reverted on 21 August 2026; they are recorded in `13-14-SUMMARY.md` rather than
// transcribed here, because this header is already the longest thing in the file and the five below are
// the ones that explain the DESIGN. In one line each: a declared author-name row deleted → SCAN 3 names
// the region that lost its exemption; the row list padded with an unnamed region → SCAN 3 names the
// hollow row; the `full` advisory in `rsvp-form.tsx` made a region again → SCAN 2's ordinal displacement
// report (probe (b)'s shape, on a real edit); a resolved name emptied → the new case reports BOTH the
// empty name and the drift from the recorded string.
//
// ⚠ PLAN 14-14 REWROTE THE EXCLUSION GUARD, AND THE REWRITE WAS WATCHED FAILING IN BOTH DIRECTIONS
// BEFORE IT WAS TRUSTED. A guard that becomes unsatisfiable when the code is right has to be rewritten,
// never deleted, and a rewrite that cannot fail is not a guard. Two probes on 23 August 2026, both run,
// both reverted, both 1 failed / 20 passed; the full messages are in `14-14-SUMMARY.md`:
//   (e) THE FIXTURE'S REASON BLANKED. The passing fixture row's `why` set to `""` →
//       `exclusionReasonIsThin` returns true where the case expects false, and the message says a rule
//       that rejects the only legal shape rejects everything and the list can never be re-opened.
//   (f) AN EXCLUSION COMES BACK. One row re-added to `LIVE_REGION_EXCLUSIONS` → the empty assertion
//       prints the whole row and tells the reader to restore the pre-14-14 shape (a non-empty floor
//       plus the filter over the REAL list) so the vacuity guard returns with the rows.
//
// ⚠ SCAN 4 WAS WATCHED RED TOO, and its two probes are the reason it is trusted. GREEN IS 26 PASSED as
// of plan 14-14 (21 before it: five new cases, one of which is SCAN 4's own guard-the-guard). Both run
// and reverted on 23 August 2026; the full messages are in `14-14-SUMMARY.md`:
//   (g) A NAMED REGION LOSES ITS NAME. `aria-label` removed from `photo-uploader.tsx`'s requirement
//       region. 3 failed / 23 passed — SCAN 3's hollow-row check, SCAN 3's recorded-string check AND
//       SCAN 4's naming assertion, which is what three independent readings of one defect looks like.
//       SCAN 4's message names the file, the line, the tag and the fix:
//         "src/components/listing/photo-uploader.tsx:246 — the <p> carrying role=\"status\" has NO
//          aria-label. That role is nameFrom:author, so its accessible name is the empty string and the
//          region is unreachable by name. …"
//   (h) A NEW INTERRUPTING REGION SHIPS. `<p role="alert">Probe</p>` added to `host-signals.tsx` — a
//       file on a Phase-14 surface and deliberately NOT in the declared set, so this is the hole SCAN 4
//       exists to close. 1 failed / 25 passed, and the diff is the census itself:
//         + "src/components/host/host-signals.tsx × 1"
//       Note what did NOT fire: SCAN 1 stayed green, because that role carries no attribute to find.
//

// Command for all five:
// `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx`
//
//   (0) THE UNPLANNED ONE, AND IT FIRED ON THE FIRST RUN AGAINST A TREE NOBODY HAD MUTATED. The
//       exclusion-reason floor went red on a row whose `why` read `"Phase 13's RSVP form (BFLOW-08)."`
//       — 33 characters, a TAG rather than a reason. 1 failed / 19 passed:
//
//         AssertionError: an excluded file's `why` does not name the phase that owns it. "Phase 13
//         owns these" is the whole content of an exclusion; without it the list is a set of files
//         somebody chose not to check.: expected [ Array(1) ] to deeply equal []
//         + [ "src/components/group/rsvp-form.tsx" ]
//
//       Fixed by writing the three group rows a real sentence each, NOT by lowering the floor. Worth
//       recording precisely because it is the failure mode the whole module is about: the row existed,
//       it looked complete in review, and it said nothing a reader could check.
//
//   (a) THE BANNED POLITENESS LEVEL COMES BACK. `aria-live="assertive"` restored on
//       `hold-expired-state.tsx`'s `CardContent`. 3 failed / 17 passed — SCAN 1 from both sides plus
//       the per-kind shape check, which is why each is asserted separately. The three received arrays,
//       verbatim:
//
//         + [ "src/components/booking/hold-expired-state.tsx:37 — aria-live=\"assertive\"" ]
//         + [ "src/components/booking/hold-expired-state.tsx:37 (status#1) aria-live=\"assertive\"" ]
//         + [ "src/components/booking/hold-expired-state.tsx:37 (status#1) is role=\"status\" with
//              aria-live=\"assertive\"" ]
//
//       File AND line AND the region's key, because "somewhere on the booker path" is not an
//       actionable failure. Reverted → 20 passed.
//
//   (b) AN UNDECLARED REGION SHIPS, AND THE FINDING IS *WHICH* ELEMENT GOT NAMED. A bare
//       `<div role="status">Probe</div>` inserted between `slot-picker.tsx`'s pending helper and its
//       gap hint. 1 failed / 19 passed:
//
//         AssertionError: GATE-03's inventory disagrees with the tree.
//           PRESENT BUT UNDECLARED (a live region shipped with no stated reason):
//           src/components/availability/slot-picker.tsx:290 — status#3 on <div> (role="status")
//           src/components/availability/slot-picker.tsx renders, in source order:
//             :281 status#1 <p> → slot-picker-pending-helper
//             :286 status#2 <div> → slot-picker-gap-hint
//             :290 status#3 <div> → NO ROW
//           One of each is normally ONE rename. An INSERTION shows up as one displaced region at the
//           end of a file's sequence — read the sequence above, not just the line number. …
//
//       READ THE SEQUENCE, BECAUSE THE REPORTED LINE IS THE INNOCENT ONE. Line 286 is the PROBE — it
//       took `slot-picker-gap-hint`'s key by sitting at that ordinal — and line 290 is the real gap
//       hint, displaced and reported as having no row. An ordinal identifies a POSITION, not an
//       element, and an insertion among same-kind siblings therefore accuses the last sibling. The
//       full-sequence block in the message exists because of this probe and did not exist before it;
//       without it the failure points a developer at correct markup.
//
//       Inserting a region of a DIFFERENT kind cannot displace anything, which is why the ordinal is
//       per-kind rather than per-file — probed separately with `<div role="alert">Probe</div>` in the
//       same position, 1 failed / 19 passed, and the report names the insertion itself:
//
//         + [ "  src/components/availability/slot-picker.tsx:286 — alert#1 on <div> (role=\"alert\")" ]
//
//       Both reverted → 20 passed.
//
//   (c) A LOADING REGION LOSES ITS NAME — the probe that matters most, because the failure LOOKS
//       correct in review: the `sr-only` sentence is still right there in the markup. `aria-label`
//       removed from `availability-calendar.tsx`'s day skeleton. 1 failed / 19 passed:
//
//         + [ "src/components/availability/availability-calendar.tsx:408 (loading#1) has no aria-label
//              or aria-labelledby. Its children are aria-hidden placeholders, so with no
//              author-supplied name it announces the empty string. role=\"status\" is nameFrom:author
//              — see the render fixture below." ]
//
//       Reverted → 20 passed.
//
//   (d) GUARD-THE-GUARD / VACUITY. `SCAN_FILES` re-pointed at
//       `src/components/booking/hold-expired-state-nope.tsx` in place of the real path. 4 failed /
//       16 passed:
//
//         FAIL  … > every declared file exists and is non-empty
//         + [ "src/components/booking/hold-expired-state-nope.tsx — ENOENT" ]
//         FAIL  … > found at least one live region in EVERY declared file — no file is padding
//         + [ "src/components/booking/hold-expired-state-nope.tsx" ]
//         FAIL  … > reports declared-but-absent and present-but-undeclared together
//         + [ "  hold-expired-state — declared at
//              src/components/booking/hold-expired-state.tsx#status#1" ]
//         FAIL  … > every declared row's file is in the declared set, and every key is unique
//
//       BUT SCAN 1 AND SCAN 3 BOTH STAYED GREEN — over a file the walker never opened they reported a
//       perfectly clean result, indistinguishable from a real one, and would have stayed that way
//       forever. That is the entire argument for the guards running first, and it is the third time
//       this repository has measured it (`sheet-absent.test.ts` probe (d),
//       `selector-contract.test.ts`). Reverted → 20 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • IT CANNOT SAY HOW MANY TIMES A SCREEN READER SPEAKS. This file reads source and renders two
//     synthetic fixtures. Announcement is browser + AT behaviour, not a DOM property. The announce-once
//     COUNT is `e2e/hold-countdown.spec.ts`'s clock-driven `toBe(1)` over a fifteen-minute hold (and
//     its jsdom twin in `tests/booking/hold-countdown.test.tsx`); RULE 6's one-region-per-outcome claim
//     belongs to `e2e/collision-in-place.spec.ts` (plan 12-13). Whether a real reader utters them in
//     the intended ORDER is a listening test, routed to human UAT in Phase 17.
//   • IT READS AUTHORED SOURCE. A `role` or an `aria-live` composed at runtime is invisible to the AST
//     walk — which is why literal-valued `role` and `aria-busy` are asserted directly below, closing
//     the hole in the one direction it can be closed from here.
//   • THE RENDER HALF IS SYNTHETIC ON PURPOSE. It proves what `role="status"` does with a name and
//     without one. It does NOT prove that any product component renders that shape — SCAN 3 is what
//     says that, and this is what says SCAN 3 is asking for the right attribute.
//   • THERE ARE NO EXCLUSIONS LEFT, AND THAT IS NOT THE SAME AS FULL COVERAGE. It was NINE files, then
//     ONE (`address-autocomplete.tsx`, deferred to Phase 14 by name), and plan 14-14 discharged it. The
//     paragraph is kept because this is the file whose green run is most likely to be read as coverage:
//     zero exclusions means every file the declaration KNOWS about is audited, over a set bounded by
//     `live-regions.ts`'s membership rule. The auth/profile forms and the `patterns/` skeletons are
//     outside that set entirely — the skeletons are gated by `tests/design/skeleton-a11y.test.tsx`
//     instead — and nothing here says a word about them.
//   • THE NINE AUTHOR-NAMED EXCEPTIONS ARE CHECKED FOR EXISTENCE AND FOR THEIR EXACT STRING, NOT FOR
//     QUALITY. SCAN 3 asserts that every named non-`loading` region is declared, that every declaration
//     is really named, and that each recorded name is the string the markup renders. Whether a given
//     `aria-label` is a LABEL or a paraphrase that would REPLACE the sentence it sits on — the property
//     the whole exception turns on — is a reading, and `live-regions.ts` records the exact string per
//     row so that reading is possible without opening nine files. ⚠ SINCE 14-14 TWO OF THE NINE HAVE
//     TEXT OF THEIR OWN (`request-action-refusal`, `photo-uploader-requirement`), so for those two the
//     reading is load-bearing rather than tidy: a name announced instead of the content costs a real
//     sentence. Both rows state that trade and what bounds it.
//   • `announces` AND `why` ARE PROSE. Nothing can tell a true sentence from a plausible one. The
//     assertions below check that the columns are non-trivially populated, which is a floor, not a
//     verification.

import * as React from "react";
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { readFileSync, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";
import {
  LIVE_REGION_FILES,
  LIVE_REGION_EXCLUSIONS,
  LIVE_REGION_IDS,
  LIVE_REGIONS,
  LIVE_REGION_KEYS,
  AUTHOR_NAMED_KINDS,
  AUTHOR_NAMED_REGIONS,
  MIN_EXCLUSION_REASON_CHARS,
  exclusionReasonIsThin,
  liveRegionKey,
  type LiveRegionExclusion,
  type LiveRegionKind,
} from "@/lib/design/live-regions";
// The one PRODUCT constant this gate imports, and it is imported for the self-test of the import hop
// rather than for an assertion about a surface: the hop's whole claim is that it reads this value off
// disk, so the expectation has to be the value itself and not a copy of it.
import { HOST_VERIFICATION_REGION_NAME } from "@/lib/host/verification-signal";

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The set under audit, taken as a PARAMETER everywhere so probe (d) is a one-line edit and so the
// self-tests below run the same code path the real assertions run (`leak.test.ts:208-212`'s rule).
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const SCAN_FILES: readonly string[] = LIVE_REGION_FILES;

/**
 * The declared file count, pinned HERE as well as at `DeclaredFileCountIsThirty`.
 *
 * Two places on purpose. The type alias fails the build; this fails the gate that reads the set, with a
 * message. Plans 12-12, 12-13, 13-14, 14-14, 15-09, 16-09 and 16-10 each moved BOTH, in the commit that added
 * their component — a set that widened in one place and not the other is the exact drift T-12-06-SETDRIFT
 * names.
 *
 * TEN as of plan 12-12, which added `src/components/search/relax-band.tsx` (STATE-03's relaxation band,
 * `role="status"`, one announcement on arrival). ELEVEN as of plan 12-13, which added
 * `src/components/booking/collision-notice.tsx` (STATE-07's in-place collision notice, `role="status"`
 * plus a focus move — rules 1, 6 and 7).
 *
 * SEVENTEEN as of plan 13-14, which discharged the ten Phase-13 exclusions: six regions were REMOVED
 * because they wrapped a freshly navigated page, and six FILES joined the set carrying seven regions
 * between them — `pending-payment-state.tsx`, `request-countdown.tsx` (two: the digits and the
 * threshold), `attendee-roster.tsx`, `rsvp-confirmation.tsx`, `rsvp-form.tsx`, `share-link-box.tsx`.
 * The membership was MEASURED off an AST walk of the tree, not taken from 13-UI-SPEC's table, which
 * named two files that turned out not to hold the regions it assigned them.
 *
 * TWENTY-ONE as of plan 14-14, which discharged the LAST exclusion and took the list to zero. Four host
 * files joined carrying one region each — `wizard.tsx` (the save state), `request-row.tsx` (the action
 * refusal), `address-autocomplete.tsx` (the lookup result, which is the discharge itself) and
 * `photo-uploader.tsx` (the photos-step requirement). 14-UI-SPEC's table budgeted THREE and twenty; the
 * fourth is the photo uploader, whose unnamed region was FIXED here rather than excluded to Phase 16,
 * because an exclusion there would have traded one row for another and left the list at one. The number
 * was measured off the tree, not taken from the document — the same discipline, for the same reason.
 *
 * TWENTY-SIX as of plan 15-09, which widened the MEMBERSHIP RULE rather than discharging anything. The
 * four `(auth)` screens and `(app)/profile/profile-form.tsx` were named as OUT OF SCOPE by
 * `live-regions.ts`'s rename note — "what is left outside it is the auth/profile forms…" — which is a
 * different thing from an exclusion: nobody had ever decided about them, so nothing could be
 * discharged. Five files joined carrying seven regions (two alerts on the auth screens' submit
 * failures, the reset page's third, the forgot page's uniform result, and the profile form's three:
 * two alerts and one save line). `LIVE_REGION_EXCLUSIONS` was empty before and is empty after.
 *
 * TWENTY-SEVEN as of plan 16-09, which added ONE file — `src/components/profile/image-crop-dialog.tsx`,
 * the avatar framing step — carrying one region: the save failure that renders INSIDE the dialog,
 * because rule F5 forbids closing an overlay to report that its confirm did not work. It was a
 * deliberate pass through that number: 16-UI-SPEC's budget is 26 -> 28, but each file's row lands in
 * the same commit as its element, so the set moves once per plan rather than once per phase.
 *
 * TWENTY-EIGHT as of plan 16-10, which closed that pass-through with the OTHER half of the same
 * surface — `src/components/profile/avatar-field.tsx`, the field that opens the dialog — carrying one
 * region: the single refusal slot the four pre-dialog guards share. All four refuse BEFORE any overlay
 * opens, so nothing else on the page changes to carry the news; without the region, picking a rejected
 * file and picking an accepted one are indistinguishable to a listener.
 *
 * ⚠ THIS LITERAL MOVING IS WHY TASK 1 OF PLAN 15-09 TOUCHED THIS FILE AT ALL, AND WHY PLANS 16-09 AND
 * 16-10 DID TOO. All three named `src/lib/design/live-regions.ts` as their only inventory file; the
 * docblock above is the standing instruction that says both pins move together, and a widened set with
 * a stale literal here fails this gate with the message three lines below. The instruction beat the
 * file list three times now, which is the same precedence call plan 15-08 recorded when a gate and a
 * plan disagreed.
 *
 * TWENTY-NINE as of plan 18-10, which added `src/components/ops/ops-decision-actions.tsx` — the
 * decision controls on the internal FitOut Ops review queue — carrying ONE region: the single refusal
 * slot Approve and Reject share, holding the server action's own sentence verbatim.
 *
 * ⚠ IT IS THE FIRST STAFF-ONLY FILE IN THE SET, so plan 18-10 widened the MEMBERSHIP RULE in
 * `live-regions.ts`'s header in the same commit as this literal. An internal tool is not exempt from
 * any of the seven rules — 18-UI-SPEC states that there is no "it's only for staff" carve-out anywhere
 * in `tests/design/**` and that Phase 18 does not create one — so the ops console is INSIDE the
 * audited set rather than beside it. A count that moved while the rule still asserted the set held no
 * ops file would be the same drift in prose that T-12-06-SETDRIFT names in code.
 *
 * THIRTY AS OF PLAN 18.1-11, which added `src/components/host/verification-panel.tsx` — the host's own
 * account-check surface — carrying ONE region: the single refusal slot every branch of the submission
 * action shares, holding the server's own sentence verbatim.
 *
 * ⚠ IT IS THE FIRST FILE IN THE SET ABOUT A HOST'S OWN STANDING RATHER THAN ABOUT THEIR WORK, so the
 * MEMBERSHIP RULE in `live-regions.ts`'s header moved in the same commit as this literal. The supply
 * half of that rule named the host TOOLING — the surfaces a host uses to run a business they already
 * have — and `/host/verify` is upstream of all of it: it is where somebody asks to be allowed to sell.
 *
 * ⚠ AND IT IS THE FIRST STEP OF A TWO-STEP BUDGET. 18.1-UI-SPEC row 7 reads 29 -> 31 because the phase
 * authors a region in two new files; plan 18.1-13 takes this to 31 when the ops contact-reveal island
 * exists. Both cannot be declared at once, because every declared file must exist and must contain its
 * region — the same pass-through 16-UI-SPEC's 26 -> 28 budget made, for the same reason.
 */
const DECLARED_FILE_COUNT = 30;

/** A file this size is a stub or a truncated read; every declared file is far larger. */
const MIN_FILE_BYTES = 200;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The collector
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** One attribute value, plus whether it was a literal the scan can actually read. */
type AttrValue = { readonly raw: string; readonly literal: boolean };

type FoundRegion = {
  readonly file: string;
  readonly line: number;
  readonly kind: LiveRegionKind;
  /** 1-based ordinal among regions of the SAME kind in the SAME file, in source order. */
  readonly at: number;
  readonly key: string;
  readonly role: AttrValue | null;
  readonly ariaLive: AttrValue | null;
  readonly ariaBusy: AttrValue | null;
  readonly named: boolean;
  /**
   * The region's author-supplied NAME as a string, or null when it has none or the scan cannot read it.
   *
   * Resolved through `resolveModuleStringConsts` below, so `aria-label={REFUSAL_REGION_NAME}` is read
   * as its value rather than as "computed, unknowable". That is the one direction this hole can be
   * closed from a source scan, and it is what makes `AUTHOR_NAMED_REGIONS`'s `name` column a checked
   * fact instead of a comment.
   */
  readonly label: string | null;
  /** The JSX tag, for failure messages — `div`, `p`, `CardContent`. */
  readonly tag: string;
};

/** The attributes that make an element a live region, or that decide its shape. */
const WATCHED = new Set(["role", "aria-live", "aria-busy", "aria-label", "aria-labelledby"]);

function attrValue(attr: ts.JsxAttribute, sf: ts.SourceFile): AttrValue {
  const init = attr.initializer;
  // A bare attribute (`<div hidden />`) has no initializer; treat it as the empty literal.
  if (init === undefined) return { raw: "", literal: true };
  if (ts.isStringLiteral(init)) return { raw: init.text, literal: true };
  if (ts.isJsxExpression(init)) {
    const expr = init.expression;
    if (expr !== undefined && ts.isStringLiteral(expr)) return { raw: expr.text, literal: true };
    if (expr !== undefined && ts.isNoSubstitutionTemplateLiteral(expr)) {
      return { raw: expr.text, literal: true };
    }
    // Anything else — a ternary, an identifier, a template with substitutions. The raw text is kept
    // so SCAN 1 can still look inside it; `literal: false` is what stops the shape checks pretending
    // they know the value.
    return { raw: init.getText(sf), literal: false };
  }
  return { raw: init.getText(sf), literal: false };
}

/**
 * Classify an element into one of the five declared kinds.
 *
 * `aria-busy` FIRST, and that ordering is the anti-dodge: an element carrying `aria-busy="true"` is a
 * `loading` region no matter what else it says, so a skeleton cannot be relabelled as a plain `status`
 * to escape SCAN 3's `aria-label` requirement. It would simply key as `#loading#N` and be reported by
 * SCAN 2 as present-but-undeclared while its row was reported as declared-but-absent.
 */
function classify(role: string | null, ariaBusy: string | null): LiveRegionKind | null {
  if (ariaBusy === "true") return "loading";
  if (role === "alert") return "alert";
  if (role === "timer") return "timer";
  if (role === "status") return "status";
  return "threshold";
}

/**
 * Every module-level `const NAME = "literal"` in one source file.
 *
 * The four group/booking regions name themselves through a hoisted constant rather than an inline
 * string, and each of those files says at the declaration WHY the name is a label rather than a copy of
 * the sentence. A scan that gave up at the identifier would report those four as "named, value unknown"
 * and `aria-label={""}` would pass — so the ONE hop that is statically decidable is taken.
 *
 * Deliberately module-level only, and deliberately no expression evaluation: a name assembled from a
 * template, a ternary or a prop stays unresolved and is reported as such, which is honest.
 */
function resolveModuleStringConsts(sf: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  for (const statement of sf.statements) {
    if (!ts.isVariableStatement(statement)) continue;
    for (const decl of statement.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.initializer === undefined) continue;
      const init = decl.initializer;
      if (ts.isStringLiteral(init) || ts.isNoSubstitutionTemplateLiteral(init)) {
        out.set(decl.name.text, init.text);
      }
    }
  }
  return out;
}

/** Parsed string-const tables, keyed by resolved path, so a shared copy module is read once. */
const importedConstCache = new Map<string, Map<string, string>>();

/**
 * Resolve one `@/`-aliased module specifier to a file on disk, or null.
 *
 * The alias is the repository's own — `@/x` is `src/x` in both Vitest configs and in the bundler — so
 * this is a rewrite rather than a module resolution. The four candidate suffixes are the only shapes
 * `src/` actually contains; a specifier that resolves to none of them returns null and the caller
 * simply learns nothing, which is the same outcome as before this hop existed.
 */
function resolveAliasedModule(specifier: string): string | null {
  if (!specifier.startsWith("@/")) return null;
  const base = resolve(process.cwd(), "src", specifier.slice(2));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

/**
 * ONE MORE STATICALLY DECIDABLE HOP: a named IMPORT of a module-level string const (plan 18.1-11).
 *
 * ⚠ THE HOP EXISTS BECAUSE THE ALTERNATIVES ARE BOTH DEFECTS, AND THAT WAS MEASURED RATHER THAN
 * ARGUED. `src/components/host/verification-panel.tsx` names its region from
 * `HOST_VERIFICATION_REGION_NAME`, which is EXPORTED BY THE COPY MODULE that owns every other word
 * that panel renders. With only the same-file hop, this gate said, verbatim:
 *
 *   host-verification-refusal (src/components/host/verification-panel.tsx:395) has an aria-label
 *   this scan cannot resolve to a string. Inline it, or hoist it to a module-level
 *   `const NAME = "…"` the way the other four do — a name nothing can read is a name nothing can
 *   check against its sentence.
 *
 * Both remedies that message offers are wrong for that file. INLINING the literal would make a
 * presentation component the author of a host-visible string, which is exactly what its own
 * acceptance greps forbid and what `hosting-paused-notice.tsx:7-11`'s rule is about. HOISTING a local
 * copy would put the same three words in two files with nothing keeping them equal — the drift this
 * inventory's `name` column exists to catch, reintroduced in order to satisfy the check that catches
 * it. So the SCAN is what had to widen.
 *
 * ⚠ IT IS ONE HOP AND IT DOES NOT RECURSE, deliberately. A re-export chain stays unresolved and is
 * reported as such, which is honest and is the same bound the same-file hop already accepts: this
 * resolves `import { NAME } from "@/lib/…"` where the target declares `export const NAME = "literal"`
 * and nothing else. No expression evaluation, no template, no ternary, no barrel walking.
 *
 * ⚠ NOTHING WAS RELAXED. The name still has to resolve to a NON-EMPTY string and still has to equal
 * the string `AUTHOR_NAMED_REGIONS` records, in both directions — so a rename in the copy module
 * reddens this gate exactly as a rename of a local const does. The set of files that can satisfy the
 * check grew; the check did not shrink.
 */
function resolveImportedStringConsts(sf: ts.SourceFile): Map<string, string> {
  const out = new Map<string, string>();
  for (const statement of sf.statements) {
    if (!ts.isImportDeclaration(statement)) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
    const bindings = statement.importClause?.namedBindings;
    if (bindings === undefined || !ts.isNamedImports(bindings)) continue;

    const target = resolveAliasedModule(statement.moduleSpecifier.text);
    if (target === null) continue;

    let consts = importedConstCache.get(target);
    if (consts === undefined) {
      try {
        const text = readFileSync(target, "utf8");
        consts = resolveModuleStringConsts(
          ts.createSourceFile(target, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS),
        );
      } catch {
        consts = new Map<string, string>();
      }
      importedConstCache.set(target, consts);
    }

    for (const element of bindings.elements) {
      // `import { A as B }` — the EXPORTED name is what the target declares and the LOCAL name is
      // what the markup writes, so the lookup and the key are different sides of the same element.
      const exported = (element.propertyName ?? element.name).text;
      const value = consts.get(exported);
      if (value !== undefined) out.set(element.name.text, value);
    }
  }
  return out;
}

/**
 * Walk one module's JSX and collect every live region in it, in source order.
 *
 * `(file, text)` rather than `(file)` so the self-tests can feed fixtures that are never written to
 * disk and still exercise this exact function.
 */
function collectFrom(file: string, text: string): FoundRegion[] {
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const out: FoundRegion[] = [];
  const perKind = new Map<LiveRegionKind, number>();
  // The file's OWN consts win over an imported one of the same name, which is what a shadowing local
  // declaration does at runtime too.
  const stringConsts = new Map([
    ...resolveImportedStringConsts(sf),
    ...resolveModuleStringConsts(sf),
  ]);

  /** `aria-label="x"` → `"x"`; `aria-label={NAME}` → the module const's value; anything else → null. */
  const nameOf = (attrs: Map<string, AttrValue>): string | null => {
    const attr = attrs.get("aria-label");
    if (attr === undefined) return null;
    if (attr.literal) return attr.raw;
    const ident = /^\{\s*([A-Za-z_$][\w$]*)\s*\}$/.exec(attr.raw);
    if (ident === null) return null;
    return stringConsts.get(ident[1]) ?? null;
  };

  const visitElement = (node: ts.JsxOpeningElement | ts.JsxSelfClosingElement): void => {
    const attrs = new Map<string, AttrValue>();
    for (const property of node.attributes.properties) {
      if (!ts.isJsxAttribute(property)) continue;
      const name = property.name.getText(sf);
      if (!WATCHED.has(name)) continue;
      attrs.set(name, attrValue(property, sf));
    }

    const role = attrs.get("role") ?? null;
    const ariaLive = attrs.get("aria-live") ?? null;
    const ariaBusy = attrs.get("aria-busy") ?? null;

    // A live region is an element with `aria-live`, or with one of the three roles that IS one.
    const roleIsRegion =
      role !== null && role.literal && ["status", "alert", "timer"].includes(role.raw);
    if (ariaLive === null && !roleIsRegion) return;

    const kind = classify(
      role !== null && role.literal ? role.raw : null,
      ariaBusy !== null && ariaBusy.literal ? ariaBusy.raw : null,
    );
    if (kind === null) return;

    const at = (perKind.get(kind) ?? 0) + 1;
    perKind.set(kind, at);

    out.push({
      file,
      line: sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1,
      kind,
      at,
      key: liveRegionKey({ file, kind, at }),
      role,
      ariaLive,
      ariaBusy,
      named: attrs.has("aria-label") || attrs.has("aria-labelledby"),
      label: nameOf(attrs),
      tag: node.tagName.getText(sf),
    });
  };

  const visit = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) visitElement(node);
    ts.forEachChild(node, visit);
  };
  visit(sf);

  return out;
}

type Scan = {
  /** `file — ENOENT` / `file — N bytes` for every declared path the walker could not use. */
  readonly unreadable: string[];
  /** Every file actually opened. */
  readonly opened: string[];
  readonly regions: FoundRegion[];
  /** `file:line — aria-live="assertive"` from the COMMENT-STRIPPED text of each file. */
  readonly assertiveText: string[];
};

/**
 * The banned politeness level, matched in either quote style, INCLUDING the closing delimiter so the
 * failure message quotes a whole attribute rather than a truncated one.
 *
 * It deliberately does not try to reach inside a JSX expression: `aria-live={x ? "assertive" : "polite"}`
 * is invisible to this regex and is caught by the AST assertion beside it, which is why SCAN 1 is
 * asserted from two sides rather than one.
 */
const ASSERTIVE = /aria-live\s*=\s*["'{][^"'}]*assertive[^"'}]*["'}]?/g;

function scan(files: readonly string[]): Scan {
  const result: Scan = { unreadable: [], opened: [], regions: [], assertiveText: [] };

  for (const file of files) {
    const abs = resolve(process.cwd(), file);
    if (!existsSync(abs)) {
      result.unreadable.push(`${file} — ENOENT`);
      continue;
    }
    const bytes = statSync(abs).size;
    if (bytes < MIN_FILE_BYTES) {
      result.unreadable.push(`${file} — ${bytes} bytes`);
      continue;
    }
    const text = readFileSync(abs, "utf8");
    result.opened.push(file);

    // COMMENTS STRIPPED FIRST for the text scan. Every one of these files explains its live region in
    // prose, and `live-regions.ts` quotes the banned value by name; a scan that counted prose would be
    // red against the tree that documents the decision correctly.
    stripComments(text)
      .split("\n")
      .forEach((line, index) => {
        for (const match of line.matchAll(ASSERTIVE)) {
          result.assertiveText.push(`${file}:${index + 1} — ${match[0]}`);
        }
      });

    result.regions.push(...collectFrom(file, text));
  }

  return result;
}

/** Scanned ONCE at module level; every `it()` below only asserts against this result. */
const scanned = scan(SCAN_FILES);

afterEach(() => {
  cleanup();
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// GUARD-THE-GUARD FIRST, on purpose: every zero below is worthless if the scan opened nothing.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard — the scan read the set it is asserting about", () => {
  it("every declared file exists and is non-empty", () => {
    expect(
      scanned.unreadable,
      "a declared path could not be read. SCAN 1 and SCAN 3 are ABSENCE assertions: over a file the " +
        "walker never opened they report a perfectly clean result, indistinguishable from a real one, " +
        "and they would stay that way forever.",
    ).toEqual([]);
    expect(scanned.opened).toHaveLength(SCAN_FILES.length);
  });

  it(`audits exactly ${DECLARED_FILE_COUNT} files, the number the type alias pins`, () => {
    expect(
      SCAN_FILES.length,
      `the declared set is ${SCAN_FILES.length} files, not ${DECLARED_FILE_COUNT}. This number is ` +
        "pinned in TWO places — `DeclaredFileCountIsThirty` in `src/lib/design/live-regions.ts` " +
        "fails the build, and this fails the gate with a message. Plans 12-12, 12-13, 13-14, 14-14, " +
        "15-09, 16-09, 16-10, 18-10 and 18.1-11 " +
        "each moved BOTH, in the same commit as the components they add. A set that widened in one " +
        "place and not the other is exactly the drift T-12-06-SETDRIFT names.",
    ).toBe(DECLARED_FILE_COUNT);
  });

  it("found at least one live region in EVERY declared file — no file is padding", () => {
    const barren = SCAN_FILES.filter((f) => !scanned.regions.some((r) => r.file === f));
    expect(
      barren,
      "a declared file contributes no live region at all. Either it lost its region (and its rows " +
        "should go with it) or it never had one, in which case the set is padded and the gate's " +
        "reach reads wider than it is.",
    ).toEqual([]);
  });

  it("pointed at a path that does not exist, reports it rather than passing over it", () => {
    // Probe (d) as a permanent assertion rather than a one-off. The realistic version of this failure
    // is a path renamed by a refactor, which never throws — it just quietly stops being audited.
    const empty = scan(["src/components/booking/hold-expired-state-nope.tsx"]);
    expect(empty.unreadable).toEqual([
      "src/components/booking/hold-expired-state-nope.tsx — ENOENT",
    ]);
    expect(empty.regions, "…and it reports zero regions over nothing").toEqual([]);
    expect(empty.assertiveText, "…and a perfectly clean SCAN 1").toEqual([]);
  });

  it("declares ZERO exclusions — and the reason-shape rule that guarded them is still exercised", () => {
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    // ⚠ THIS ASSERTION READ `expect(LIVE_REGION_EXCLUSIONS.length).toBeGreaterThan(0)` UNTIL PLAN
    //   14-14, AND THE REWRITE — NOT THE DELETION — IS THE WHOLE POINT OF THIS BLOCK.
    // ═══════════════════════════════════════════════════════════════════════════════════════════════
    //
    // WHY THE OLD LINE EXISTED. The `why`-shape filter below it is an ABSENCE assertion: it collects
    // the rows whose reason is too thin and asserts that collection is empty. Over an empty list it
    // collects nothing and passes — so an exclusion list that had been quietly gutted would have made
    // its own quality gate trivially green, and nothing in the run would have distinguished "every
    // reason is good" from "there are no reasons". The floor was the vacuity guard.
    //
    // WHY IT CANNOT SURVIVE THE CORRECT ANSWER. 14-UI-SPEC's falsifiable #1 is
    // `LIVE_REGION_EXCLUSIONS.length === 0`, and plan 14-14 discharged the last row by rewriting the
    // markup its reason was about. Empty is now the RIGHT state, and a non-empty floor asserts the
    // opposite of the specification. The two cannot both hold, so one of them had to be rewritten, and
    // it was not going to be the specification.
    //
    // WHY THE REPLACEMENT STILL GUARDS. Deleting the floor would leave the vacuity it was written
    // against — the filter would still be a filter over nothing. So the replacement asserts BOTH
    // halves: the list is empty (the state the spec requires), AND the reason-shape rule is run
    // against a LOCAL FIXTURE that exercises it in both directions. The rule itself is
    // `exclusionReasonIsThin`, exported from `live-regions.ts` rather than restated here, so the
    // fixture and any future real row are judged by one predicate and not by two spellings of it.
    //
    // ⚠ THE OLD FILTER'S `/Phase\s+1[34]/` HAS NOTHING LEFT TO MATCH and was not carried over. It had
    // been narrowed to the two phases that happened to own rows; with the list at zero, a pattern
    // scoped to two dead phases is a pattern nobody can satisfy without editing it, and an edit made
    // by the same person who has to pass it is not a check. The predicate now matches any `Phase <n>`,
    // and the fixture below is what proves it still rejects a reason that names no phase at all.
    expect(
      LIVE_REGION_EXCLUSIONS,
      "an exclusion is back. That is not forbidden — the mechanism exists precisely so a file can be " +
        "deliberately deferred WITH A REASON — but it is a decision, and this message is where it " +
        "gets announced. Plan 14-14 took the list to zero by discharging the last row rather than by " +
        "deleting it. If you are adding one: give it a sentence that names the owning phase, and move " +
        "this assertion to the shape it had before 14-14 (a floor plus the filter over the real list) " +
        "so the vacuity guard comes back with the rows.",
    ).toEqual([]);

    // ── THE RULE, STILL EXERCISED — against a fixture, because a filter over an empty list has never
    //    been run. Three rows: one that should pass, and one for each way a reason can fail.
    const GOOD: LiveRegionExclusion = {
      file: "src/components/example/fixture-only.tsx",
      why:
        "Phase 99 owns this surface and is about to rewrite the markup this region lives in, so an " +
        "audit taken here would be re-done rather than reused.",
    };
    /** Too short to be a sentence — probe (0)'s shape, the 33-character TAG that fired on a real row. */
    const A_TAG_NOT_A_REASON: LiveRegionExclusion = {
      file: "src/components/example/fixture-only.tsx",
      why: "Phase 99's listing form (LIST-02).",
    };
    /** Long enough, but owned by nobody — which is the half that makes an exclusion reconstructable. */
    const UNOWNED: LiveRegionExclusion = {
      file: "src/components/example/fixture-only.tsx",
      why:
        "This one is left alone for now because the surface is being reworked and nobody wants to " +
        "audit markup twice.",
    };

    expect(
      exclusionReasonIsThin(GOOD),
      "the reason-shape rule rejected a reason that names its owning phase AND is a sentence. It is " +
        "the only shape an exclusion is allowed to have, so a rule that rejects it rejects everything " +
        "and the list can never be re-opened.",
    ).toBe(false);
    expect(
      exclusionReasonIsThin(A_TAG_NOT_A_REASON),
      `the rule accepted a ${A_TAG_NOT_A_REASON.why.length}-character TAG as a reason. Probe (0) in ` +
        "this file's header fired on exactly that shape against a real row: it named a phase and a " +
        "requirement id and said nothing a reader could check. The floor is " +
        `MIN_EXCLUSION_REASON_CHARS (${MIN_EXCLUSION_REASON_CHARS}).`,
    ).toBe(true);
    expect(
      exclusionReasonIsThin(UNOWNED),
      "the rule accepted a reason that names no owning phase. \"Somebody chose not to check this\" " +
        "and \"this file was looked at and deliberately left to phase N\" produce byte-identical scan " +
        "results, and only the second one is a decision. Naming the owner is what makes an exclusion " +
        "dischargeable — which is how this list reached zero.",
    ).toBe(true);

    // ── …and the REAL list goes through the SAME predicate, so the fixture is not a second code path
    //    that happens to be the one under test. Vacuous today, by construction; not vacuous the moment
    //    a row comes back, which is the only moment it needs to bite.
    expect(
      LIVE_REGION_EXCLUSIONS.filter(exclusionReasonIsThin).map((row) => row.file),
      "an excluded file's `why` does not name the phase that owns it, or is too short to be a " +
        "sentence. That reason is the whole content of an exclusion; without it the list is a set of " +
        "files somebody chose not to check.",
    ).toEqual([]);

    // No path may be both declared and excluded — the two lists are a partition, not two opinions.
    const overlap = LIVE_REGION_EXCLUSIONS.map((row) => row.file).filter((file) =>
      (SCAN_FILES as readonly string[]).includes(file),
    );
    expect(overlap).toEqual([]);
  });

  it("every row's `announces` names a text change and every `why` names a rule", () => {
    // A floor on the prose columns, not a verification of them — see the NOT COVERED footer.
    const thin = LIVE_REGION_IDS.filter((id) => {
      const row = LIVE_REGIONS[id];
      return row.announces.length < 40 || !/RULE\s+[1-7]/i.test(row.why);
    });
    expect(
      thin,
      "a row's `announces` is too short to name both a text change and a moment, or its `why` cites " +
        "none of GATE-03's seven numbered rules. A row whose reason is \"so it announces\" is true of " +
        "every live region ever written and is a row that should not exist.",
    ).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 1 — the banned politeness level, from both sides.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("SCAN 1 — `aria-live=\"assertive\"` is banned on the declared set", () => {
  it("finds it in no declared file", () => {
    expect(
      scanned.assertiveText,
      "the interrupting politeness level is back on the booker path. It talks over whatever a screen " +
        "reader is currently speaking — on the checkout route, plausibly the price. GATE-03 rule 7: " +
        "where an event genuinely must be noticed, the mechanism is a POLITE region plus MOVED FOCUS, " +
        "which is what `hold-expired-state.tsx` does.",
    ).toEqual([]);
  });

  it("and no COLLECTED region carries it either — including inside a computed value", () => {
    // The text scan catches the literal. This catches `aria-live={x ? "assertive" : "polite"}`, which
    // is the spelling a text scan sees and a shape check would not, and it names the region's key.
    const offenders = scanned.regions
      .filter((region) => region.ariaLive !== null && region.ariaLive.raw.includes("assertive"))
      .map(
        (region) =>
          `${region.file}:${region.line} (${region.kind}#${region.at}) aria-live=${JSON.stringify(
            region.ariaLive?.raw,
          )}`,
      );
    expect(offenders).toEqual([]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 2 — the declared set and the rendered set are the SAME SET.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("SCAN 2 — every region has a row, and every row has a region", () => {
  it("reports declared-but-absent and present-but-undeclared together", () => {
    const found = new Map(scanned.regions.map((region) => [region.key, region] as const));

    const undeclared = scanned.regions
      .filter((region) => !LIVE_REGION_KEYS.has(region.key))
      .map(
        (region) =>
          `  ${region.file}:${region.line} — ${region.kind}#${region.at} on <${region.tag}> ` +
          `(role=${JSON.stringify(region.role?.raw ?? null)})`,
      );

    const absent = LIVE_REGION_IDS.filter((id) => !found.has(liveRegionKey(LIVE_REGIONS[id]))).map(
      (id) => `  ${id} — declared at ${liveRegionKey(LIVE_REGIONS[id])}`,
    );

    // THE WHOLE SEQUENCE FOR ANY FILE THAT DISAGREES, and this is not verbosity — it is the fix for a
    // measured weakness of ordinal keying. A new same-kind region INSERTED among existing ones takes
    // the identity of the row that used to sit at its ordinal and displaces the LAST one, so the
    // reported violation names an innocent element and the actual insertion is invisible. Probe (b)
    // measured exactly that. Printing the file's full sequence puts the shift on screen.
    const dirtyFiles = [
      ...new Set([
        ...scanned.regions.filter((r) => !LIVE_REGION_KEYS.has(r.key)).map((r) => r.file),
        ...LIVE_REGION_IDS.filter((id) => !found.has(liveRegionKey(LIVE_REGIONS[id]))).map(
          (id) => LIVE_REGIONS[id].file,
        ),
      ]),
    ];
    const context = dirtyFiles.map(
      (file) =>
        `  ${file} renders, in source order:\n` +
        scanned.regions
          .filter((region) => region.file === file)
          .map(
            (region) =>
              `    :${region.line} ${region.kind}#${region.at} <${region.tag}> → ` +
              `${LIVE_REGION_KEYS.get(region.key) ?? "NO ROW"}`,
          )
          .join("\n"),
    );

    // BOTH DIRECTIONS IN ONE MESSAGE, because one of each is almost always a single rename and two
    // separate failures make the reader do the join by hand.
    expect(
      [...undeclared, ...absent],
      "GATE-03's inventory disagrees with the tree.\n" +
        (undeclared.length > 0
          ? "  PRESENT BUT UNDECLARED (a live region shipped with no stated reason):\n" +
            undeclared.join("\n") +
            "\n"
          : "") +
        (absent.length > 0
          ? "  DECLARED BUT ABSENT (a row whose region is gone — usually the other half of a rename):\n" +
            absent.join("\n") +
            "\n"
          : "") +
        (context.length > 0 ? context.join("\n") + "\n" : "") +
        "  One of each is normally ONE rename. An INSERTION shows up as one displaced region at the " +
        "end of a file's sequence — read the sequence above, not just the line number. Add the row in " +
        "`src/lib/design/live-regions.ts` with the sentence the user hears and the numbered rule it " +
        "satisfies — never delete the row to make this green.",
    ).toEqual([]);
  });

  it("every declared row's file is in the declared set, and every key is unique", () => {
    for (const id of LIVE_REGION_IDS) {
      expect(SCAN_FILES, `${id} names a file outside the audited set`).toContain(
        LIVE_REGIONS[id].file,
      );
    }
    const keys = LIVE_REGION_IDS.map((id) => liveRegionKey(LIVE_REGIONS[id]));
    expect(
      new Set(keys).size,
      "two rows share a key, so one of them is asserting nothing and the set comparison above is " +
        "green with a region uncovered",
    ).toBe(keys.length);
    expect(LIVE_REGION_KEYS.size).toBe(LIVE_REGION_IDS.length);
  });

  it("reads markup and not prose, in both directions", () => {
    // Without this, the equality above is satisfiable by a collector that finds nothing at all.
    const flagged = collectFrom(
      "fixture.tsx",
      'export const A = () => <div role="status" aria-label="x">hi</div>;',
    );
    expect(flagged.map((r) => r.key)).toEqual(["fixture.tsx#status#1"]);

    const prose = collectFrom(
      "fixture.tsx",
      [
        '// <div role="status" aria-live="assertive" /> is what this used to be',
        '/* aria-live="assertive" is banned; see live-regions.ts */',
        "export const A = () => <div className=\"p-4\" />;",
      ].join("\n"),
    );
    expect(
      prose,
      "the collector counted a live region that exists only in a comment. These files explain their " +
        "regions in prose and a scan that counted the explanation would be red against a correct tree.",
    ).toEqual([]);
  });

  it("keys same-kind regions by their ordinal, which is why `slot-picker.tsx` needs one", () => {
    const two = collectFrom(
      "fixture.tsx",
      'export const A = () => (<div><p role="status">a</p><p role="status">b</p></div>);',
    );
    expect(two.map((r) => r.key)).toEqual(["fixture.tsx#status#1", "fixture.tsx#status#2"]);

    // A region of a DIFFERENT kind does not renumber them — the reason the ordinal is per-kind and
    // not per-file. Probe (b) measured the cascade that the per-file spelling would have produced.
    const mixed = collectFrom(
      "fixture.tsx",
      'export const A = () => (<div><p role="status">a</p><p role="alert">e</p><p role="status">b</p></div>);',
    );
    expect(mixed.map((r) => r.key)).toEqual([
      "fixture.tsx#status#1",
      "fixture.tsx#alert#1",
      "fixture.tsx#status#2",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 3 — the naming mechanism, and the shape each kind is required to have.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("SCAN 3 — the naming mechanism, per kind", () => {
  it("every `loading` region is named by its author", () => {
    // THE CLAIM 12-UI-SPEC's falsifiable #3 is really about, narrowed to where it is TRUE and
    // load-bearing. `role="status"` is nameFrom:author, so a region whose children are all
    // `aria-hidden` placeholders has NOTHING to announce without an author-supplied name. The render
    // fixture below is the measurement; this is the structural proxy for it.
    const offenders = scanned.regions
      .filter((region) => AUTHOR_NAMED_KINDS.includes(region.kind) && !region.named)
      .map(
        (region) =>
          `${region.file}:${region.line} (${region.kind}#${region.at}) has no aria-label or ` +
          "aria-labelledby. Its children are aria-hidden placeholders, so with no author-supplied " +
          'name it announces the empty string. role="status" is nameFrom:author — see the render ' +
          "fixture below.",
      );
    expect(offenders).toEqual([]);
  });

  it("and no OTHER kind mixes the two naming mechanisms, except the nine that DECLARE it", () => {
    // The other direction, and it is not symmetry for its own sake. Most non-`loading` regions on
    // this path carry their own sentence, and that sentence IS what a screen reader speaks when the
    // region updates. An `aria-label` on such a region names it with a second string nobody wrote for
    // the booker, and on at least one AT pairing a named live region is announced BY ITS NAME rather
    // than by its content — i.e. the message is replaced. Two mechanisms, one region, is the
    // ambiguity; the rule is which one wins being stated in markup rather than left to the reader.
    //
    // ⚠ THIS WAS A BLANKET BAN UNTIL PLAN 13-14, and it went from "impossible" to "declared" for a
    // measured reason rather than to make a widened set pass. Phase 13 ships five regions whose role
    // sits on a WRAPPER — a `<div>` or an `<Alert>` around a `PanelCard` / `MoneyStatement` /
    // `AlertDescription` — which have no text of their own to be named by and are absent from the DOM
    // until an outcome lands. `status` is nameFrom:author, so those five compute `""` without a
    // label; three separate plans named them for that reason and
    // `tests/booking/payment-states.test.tsx` asserts one of the names in its own right. The ban's
    // load-bearing half is not "no name" but "no name that COMPETES with the sentence", and that half
    // is a reading no scan can perform — so the list is closed, each entry carries a `why` and the
    // exact string, and this assertion runs in BOTH directions so the list can neither be padded nor
    // bypassed.
    //
    // ⚠ PLAN 14-14 TOOK IT FROM FIVE TO NINE AND RETIRED THE "ALL OF THEM ARE WRAPPERS" READING. Two
    // of its four additions are wrapper-equivalent by a different route (mounted at all times with
    // their text EMPTY at idle, so there is nothing to be named by for most of a session); two are
    // regions with text of their own, named because 14-UI-SPEC requires every `status` region on the
    // Phase-14 host surfaces to resolve to a non-empty name. Those two are the ones to be sceptical
    // about, which is why their rows state what the trade costs and where the same fact is carried a
    // second time. NOTHING ABOUT THE BOOKER PATH MOVED: its content-named regions still carry no label
    // and this assertion still fails if one acquires an undeclared name.
    const declared = new Set<string>(
      AUTHOR_NAMED_REGIONS.map((row) => liveRegionKey(LIVE_REGIONS[row.id])),
    );

    const undeclaredNames = scanned.regions
      .filter(
        (region) =>
          !AUTHOR_NAMED_KINDS.includes(region.kind) && region.named && !declared.has(region.key),
      )
      .map(
        (region) =>
          `${region.file}:${region.line} (${region.kind}#${region.at}) carries BOTH its own text and ` +
          "an author name, and is not in AUTHOR_NAMED_REGIONS. Either the region's own text IS the " +
          "message (drop the aria-label — a named live region can be announced by its NAME instead " +
          "of its content), or it is a wrapper with nothing to be named by, in which case add a row " +
          "in `src/lib/design/live-regions.ts` saying so and quoting the label.",
      );

    // …and the list cannot be padding: a row whose region carries no name is a claimed exception to a
    // rule that region is not breaking, which would quietly widen the exception for the next reader.
    const found = new Map(scanned.regions.map((region) => [region.key, region] as const));
    const hollowRows = AUTHOR_NAMED_REGIONS.filter((row) => {
      const region = found.get(liveRegionKey(LIVE_REGIONS[row.id]));
      return region === undefined || !region.named;
    }).map(
      (row) =>
        `${row.id} is declared as author-named but its region carries no aria-label/aria-labelledby ` +
        `(or is absent). An exception nothing is using is an exception the next region inherits.`,
    );

    expect([...undeclaredNames, ...hollowRows]).toEqual([]);

    // A floor on the exception's prose, the same shape the exclusion list gets: a `why` that does not
    // say what the region has instead of content is not a reason, and a `name` nobody recorded cannot
    // be checked against the sentence by a reviewer.
    const thin = AUTHOR_NAMED_REGIONS.filter(
      (row) => row.why.length < 40 || row.name.trim().length === 0,
    ).map((row) => row.id);
    expect(thin).toEqual([]);
  });

  it("every declared name is the string the markup actually renders, and none of them is empty", () => {
    // 13-UI-SPEC's falsifiable claim for this phase is that every `role="status"` on the Phase-13 set
    // "resolves to a NON-EMPTY accessible name". Presence of the attribute is not that claim —
    // `aria-label=""` has the attribute and computes the empty string — so the VALUE is read here,
    // through the one static hop `resolveModuleStringConsts` can take. This is also what stops the
    // `name` column being a comment: rename `REFUSAL_REGION_NAME`'s value and this goes red.
    //
    // The MECHANISM behind the claim — that an `aria-label` is what gives a `role="status"` a name at
    // all, and that an `sr-only` child does not — is measured in the render half at the bottom of this
    // file through `@testing-library`'s `{ name }` option, i.e. `dom-accessibility-api`. Two of the
    // five are additionally computed end-to-end against a real render in
    // `tests/group/state08-alerts.test.tsx` (`queryAllByRole("status", { name })`), and a third's
    // attribute is asserted in `tests/booking/payment-states.test.tsx` case (4).
    const found = new Map(scanned.regions.map((region) => [region.key, region] as const));
    const problems: string[] = [];

    for (const row of AUTHOR_NAMED_REGIONS) {
      const region = found.get(liveRegionKey(LIVE_REGIONS[row.id]));
      if (region === undefined) continue; // already reported by the assertion above
      if (region.label === null) {
        problems.push(
          `${row.id} (${region.file}:${region.line}) has an aria-label this scan cannot resolve to a ` +
            `string. Inline it, or hoist it to a module-level \`const NAME = "…"\` the way the other ` +
            `four do — a name nothing can read is a name nothing can check against its sentence.`,
        );
        continue;
      }
      if (region.label.trim().length === 0) {
        problems.push(
          `${row.id} (${region.file}:${region.line}) resolves to an EMPTY accessible name. The ` +
            `attribute being present is not the claim; the name being non-empty is.`,
        );
      }
      if (region.label !== row.name) {
        problems.push(
          `${row.id} renders ${JSON.stringify(region.label)} but AUTHOR_NAMED_REGIONS records ` +
            `${JSON.stringify(row.name)}. The recorded string exists so a reviewer can check the ` +
            `LABEL-not-a-paraphrase rule by reading one file; a stale copy defeats that silently.`,
        );
      }
    }
    expect(problems).toEqual([]);

    // Guard the guard: the resolver must actually resolve something, or every check above is vacuous.
    const resolved = AUTHOR_NAMED_REGIONS.filter((row) => {
      const region = found.get(liveRegionKey(LIVE_REGIONS[row.id]));
      return region?.label !== null && region?.label !== undefined;
    });
    expect(
      resolved.length,
      "the identifier resolver read no names at all, so the equality checks above compared nothing",
    ).toBe(AUTHOR_NAMED_REGIONS.length);
    // …and it resolves an IDENTIFIER, not just an inline literal — the harder half.
    expect(
      collectFrom(
        "fixture.tsx",
        [
          'const NAME = "Hoisted name";',
          'export const A = () => <div role="status" aria-label={NAME}>hi</div>;',
        ].join("\n"),
      )[0]?.label,
    ).toBe("Hoisted name");
    // A name it CANNOT resolve stays null rather than becoming a plausible-looking string.
    expect(
      collectFrom(
        "fixture.tsx",
        'export const A = ({ n }: { n: string }) => <div role="status" aria-label={n}>hi</div>;',
      )[0]?.label,
    ).toBeNull();

    // …and, since plan 18.1-11, it resolves an IMPORTED identifier — the hop a region named from the
    // module that OWNS its surface's copy needs. Read against a REAL module rather than a fixture,
    // because the whole content of the hop is that it goes to disk; a fixture would prove the parser
    // works and nothing about the resolution.
    expect(
      collectFrom(
        "fixture.tsx",
        [
          'import { HOST_VERIFICATION_REGION_NAME } from "@/lib/host/verification-signal";',
          'export const A = () => <div role="status" aria-label={HOST_VERIFICATION_REGION_NAME}>hi</div>;',
        ].join("\n"),
      )[0]?.label,
    ).toBe(HOST_VERIFICATION_REGION_NAME);

    // BOTH DIRECTIONS. An import of a name the target module does not export stays UNRESOLVED, so the
    // hop cannot invent a value — the failure mode that would make every name check above vacuous by
    // quietly succeeding on nothing.
    expect(
      collectFrom(
        "fixture.tsx",
        [
          'import { NO_SUCH_EXPORTED_NAME } from "@/lib/host/verification-signal";',
          'export const A = () => <div role="status" aria-label={NO_SUCH_EXPORTED_NAME}>hi</div>;',
        ].join("\n"),
      )[0]?.label,
    ).toBeNull();

    // And a specifier that is not the repository's own alias is not followed at all — no bare package
    // is read from disk by this scan.
    expect(
      collectFrom(
        "fixture.tsx",
        [
          'import { NAME } from "some-package";',
          'export const A = () => <div role="status" aria-label={NAME}>hi</div>;',
        ].join("\n"),
      )[0]?.label,
    ).toBeNull();
  });

  it("holds every kind to its declared attribute shape", () => {
    // `live-regions.ts`'s mapping table, as assertions. Without this, `kind` would be a label a row
    // could set to anything — and `loading` is the one kind that carries an obligation, so every
    // other kind is a place to hide from it.
    const problems: string[] = [];
    for (const region of scanned.regions) {
      const where = `${region.file}:${region.line} (${region.kind}#${region.at})`;
      const role = region.role;
      const live = region.ariaLive;

      if (role !== null && !role.literal) {
        problems.push(`${where} has a COMPUTED role (${role.raw}); this scan cannot read it`);
      }
      if (region.ariaBusy !== null && !region.ariaBusy.literal) {
        problems.push(`${where} has a COMPUTED aria-busy; this scan cannot read it`);
      }

      switch (region.kind) {
        case "loading":
          if (role?.raw !== "status") problems.push(`${where} is busy but not role="status"`);
          break;
        case "alert":
          if (live !== null) problems.push(`${where} is role="alert" and also sets aria-live`);
          break;
        case "timer":
          if (live?.raw !== "off") {
            problems.push(
              `${where} is role="timer" without aria-live="off". Ticking numerals inside a live ` +
                "region speak over the booker once a second for fifteen minutes — the specific " +
                "defect GATE-03 is named for.",
            );
          }
          break;
        case "status":
          if (live !== null && live.literal && live.raw !== "polite") {
            problems.push(`${where} is role="status" with aria-live=${JSON.stringify(live.raw)}`);
          }
          break;
        case "threshold":
          if (role !== null) {
            problems.push(
              `${where} is the role-less threshold region and has acquired role=` +
                `${JSON.stringify(role.raw)}. A role here is a PERMANENT implicit polite region, so ` +
                "the countdown's expiry would no longer be silent and `HoldExpiredState` would " +
                "become a SECOND region announcing one event (rule 6).",
            );
          }
          if (live === null || !live.raw.includes("polite")) {
            problems.push(`${where} is a threshold region that is not polite`);
          }
          break;
      }
    }
    expect(problems).toEqual([]);
  });

  it("exactly two `threshold` regions exist, and both are countdowns", () => {
    const thresholds = scanned.regions.filter((region) => region.kind === "threshold");
    expect(
      thresholds.map((region) => region.file),
      "`threshold` is the one shape on this path that carries `aria-live` with NO role, and it is a " +
        "deliberate exception with a measured reason (see `live-regions.ts`). A THIRD one is far " +
        "more likely to be an anonymous live region than a third countdown.\n" +
        "⚠ THIS PIN MOVED FROM ONE TO TWO IN PLAN 13-14, AS THE SCHEDULED CHANGE. There are exactly " +
        "two ticking values in this application, and rule 3 gives each of them a role-less polite " +
        "region that changes only at a declared threshold: the checkout hold (60 seconds, " +
        "`hold-countdown.tsx`) and the approval/payment window (60 minutes, " +
        "`request-countdown.tsx`). The second was the region `live-regions.ts`'s own footer named for " +
        "a year as probably wrong. The order is source order within the declared set.",
    ).toEqual([
      "src/components/booking/hold-countdown.tsx",
      "src/components/booking/request-countdown.tsx",
    ]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// SCAN 4 — THE PHASE-14 HOST SURFACES, as a set derived from the tree rather than typed out.
// ─────────────────────────────────────────────────────────────────────────────────────────────────
//
// The three scans above audit a DECLARED set: a file joins it by being written into
// `LIVE_REGION_FILES`, which is the friction that makes the inventory a contract. That mechanism has
// one hole, and `live-regions.ts`'s own header is written about it: a file nobody ever looked at scans
// identically to a file somebody audited. Adding a `role="status"` to a host component that is not in
// the declared set costs nothing and shows up nowhere — which is exactly what happened between plans
// 14-03 and 14-11, twice, with the whole design suite green.
//
// So this block audits a set DERIVED from the tree instead. It starts at the five surfaces 14-UI-SPEC
// names, walks their `@/…` imports transitively, and keeps whatever lands inside the four trees this
// phase owns. A new host component reached from any of the five is in scope the moment it is imported,
// with no inventory edit — which is the property the declared set deliberately does not have, and the
// reason both mechanisms are here rather than one.
//
// ⚠ WHAT THE WALK DELIBERATELY DOES NOT KEEP, because the rules below are not written for it:
//   • `src/components/booking/**` — `request-countdown.tsx`, `booking-status-badge.tsx` and
//     `bookings-tabs.tsx` are reached from the host inbox and the host bookings table, and their
//     regions are the BOOKER's contract. The countdown's `timer` and `threshold` rows are declared and
//     audited above; re-judging them under this phase's naming rule would be two owners for one region.
//   • `src/components/patterns/**` and `src/components/ui/**` — the pattern layer's busy regions are
//     `tests/design/skeleton-a11y.test.tsx`'s, and the vendored primitives are byte-unchanged by
//     contract.
// Neither is an exclusion in `live-regions.ts`'s sense: nothing here is unaudited, it is audited
// somewhere else, and the somewhere else is named.

/** The five surfaces 14-UI-SPEC names, as the roots of the walk. */
const PHASE_14_SURFACE_ROOTS: readonly string[] = [
  "src/app/(host)/host/page.tsx",
  "src/app/(host)/host/requests/page.tsx",
  "src/app/(host)/host/bookings/page.tsx",
  "src/app/(host)/host/listings/[id]/edit/wizard.tsx",
  "src/app/(host)/host/listings/[id]/availability/page.tsx",
];

/** The trees this phase owns. A reached file outside all four is another gate's, by name above. */
const PHASE_14_OWNED_TREES: readonly string[] = [
  "src/app/(host)/",
  "src/components/host/",
  "src/components/availability/",
  "src/components/listing/",
];

/**
 * The size of the derived closure, MEASURED in this commit (23 August 2026) and pinned so that a
 * change in REACH is visible even when it brings no new region with it.
 *
 * It is not a ban. A host component added to one of the five surfaces moves this number, and moving it
 * is a one-line edit with the new file named in the diff — which is the whole point: the reach changed
 * and somebody said so. Eighteen was the five roots plus three availability components (the two editors
 * and the week strip, which the hours editor mounts), eight host components and the two listing
 * components the wizard renders.
 *
 * ⚠ 18 → 19 ON 25 AUGUST 2026 (plan 16-06, CROP-02). THE NEW FILE IS
 * `src/components/listing/cover-frame-preview.tsx`, which `photo-uploader.tsx` now mounts below the
 * photo grid. It authors NO live region — it is a heading, a sentence and two captioned `<img>`s — so
 * the inventory itself is unchanged and `src/lib/design/live-regions.ts` is not edited by that plan.
 * What moved is only the REACH, which is exactly the change this constant exists to make visible.
 * (`photo-uploader.tsx`'s own `status#1` row does not move either: `at` is a 1-based ordinal among
 * regions of the same kind in the same file — `live-regions.ts:227-229` — never a line number, so
 * inserting markup ABOVE that region re-keys nothing.)
 *
 * ⚠ 19 → 20 ON 31 AUGUST 2026 (quick task 260831-ndc, HOURS-01 / HOURS-02). THE NEW FILE IS
 * `src/components/availability/copy-hours-dialog.tsx`, the copy-to-all day picker, which
 * `weekly-hours-editor.tsx` now mounts beside its day rows. It authors NO live region of any kind —
 * it is an overlay holding six checkbox rows, a calm one-line overwrite warning and two buttons, and
 * the copy's outcome is announced by MOVED FOCUS onto the editor's undo control rather than by a
 * region. So the inventory itself is unchanged and `src/lib/design/live-regions.ts` is not edited by
 * that task; what moved is only the REACH, which is exactly the change this constant exists to make
 * visible. Watched red at 19 with the import already in place, before the number moved:
 * *"the walk reached 20 files inside the owned trees, not 19"* — 1 failed / 25 passed.
 *
 * ⚠ 20 → 21 ON 1 SEPTEMBER 2026 (plan 18-13, D-243 / D-252). THE NEW FILE IS
 * `src/components/host/hosting-paused-notice.tsx`, the suspended host's notice, which `/host` and
 * `/host/listings` now mount above their content (and `/host/earnings`, which is not one of the five
 * roots). It authors NO live region of any kind: it is a `PanelCard` holding a heading and one
 * paragraph, rendered on the server from state that is fixed at request time. There is nothing
 * asynchronous about it and therefore nothing to announce — a suspension does not happen while the
 * host is looking at the page, so an assertive region would interrupt a screen reader to tell it
 * something that was already true when the document loaded. The inventory in
 * `src/lib/design/live-regions.ts` is therefore unchanged and is not edited by this plan; what moved
 * is only the REACH, which is exactly the change this constant exists to make visible. Watched red at
 * 20 with the imports already in place, before the number moved: *"the walk reached 21 files inside
 * the owned trees, not 20"* — 1 failed / 25 passed, inside `npm run build`'s design pass.
 */
const PHASE_14_SURFACE_FILE_COUNT = 21;

/** `from "@/x/y"` — the only import spelling this repository uses for its own modules. */
const ALIAS_IMPORT = /from\s+["']@\/([^"']+)["']/g;

/** The five roots plus every `.tsx` reachable from them, transitively, inside the owned trees. */
function phase14SurfaceClosure(): { files: string[]; outside: string[]; missingRoots: string[] } {
  const kept = new Set<string>();
  const outside = new Set<string>();
  const missingRoots: string[] = [];
  const queue = [...PHASE_14_SURFACE_ROOTS];

  for (const root of PHASE_14_SURFACE_ROOTS) {
    if (!existsSync(resolve(process.cwd(), root))) missingRoots.push(root);
  }

  while (queue.length > 0) {
    const file = queue.shift() as string;
    if (kept.has(file)) continue;
    const abs = resolve(process.cwd(), file);
    if (!existsSync(abs)) continue;
    kept.add(file);

    for (const match of readFileSync(abs, "utf8").matchAll(ALIAS_IMPORT)) {
      const base = `src/${match[1]}`;
      const candidate = [`${base}.tsx`, `${base}/index.tsx`].find((p) =>
        existsSync(resolve(process.cwd(), p)),
      );
      if (candidate === undefined) continue;
      if (!PHASE_14_OWNED_TREES.some((tree) => candidate.startsWith(tree))) {
        outside.add(candidate);
        continue;
      }
      if (!kept.has(candidate)) queue.push(candidate);
    }
  }

  return { files: [...kept].sort(), outside: [...outside].sort(), missingRoots };
}

const phase14 = phase14SurfaceClosure();
const phase14Scan = scan(phase14.files);

/**
 * THE IMPLICITLY-ASSERTIVE ROLE, PINNED PER FILE WITH ITS REASON — not scanned to zero.
 *
 * ⚠ `role="alert"` IS `aria-live="assertive"` WITH A DIFFERENT SPELLING. A gate that bans the banned
 * politeness level by looking for the ATTRIBUTE reports a clean zero over a tree that interrupts the
 * host twice, and reads exactly like a tree that does not. 14-RESEARCH § G9 flagged both of these as
 * unbudgeted; this is the deliberate take on that, and the take is NOT to convert them.
 *
 * WHY THEY STAY. Both are native form-field validation messages — the overlap error on the weekly
 * hours editor, the date-field error on the blocks editor — and that is the one canonical use the
 * assertive level has: a message the user's own submit produced, about the field they are standing in,
 * where being told immediately is the point. Neither fires on page load. Changing a validation
 * message's role is an accessibility BEHAVIOUR change, and there is no decision behind one; the
 * defensible act is to make them VISIBLE to the gate rather than invisible to it.
 *
 * The map is by FILE and by COUNT rather than by line, because 14-12 and 14-13 both moved these lines
 * without touching the elements — a line-number pin would have gone red on a reformat and green on a
 * third region added anywhere else in the file.
 *
 * MEASURED in this commit: two occurrences, one per file, zero anywhere else in the closure.
 */
const PHASE_14_ALERT_ROLE_SITES: ReadonlyMap<string, number> = new Map([
  ["src/components/availability/blocks-editor.tsx", 1],
  ["src/components/availability/weekly-hours-editor.tsx", 1],
]);

/** D-152: the week-at-a-glance strip announces NOTHING, and that is a decision with a reason. */
const WEEK_STRIP = "src/components/availability/week-strip.tsx";

describe("SCAN 4 — the Phase-14 host surfaces", () => {
  it("walked the five surfaces and reached the measured set — nothing below is over nothing", () => {
    // GUARD-THE-GUARD FIRST, for probe (d)'s reason: every assertion in this block is an ABSENCE
    // assertion, and over a closure that collapsed to five roots (a renamed component, a changed
    // import spelling) they would all report a perfectly clean result forever.
    expect(
      phase14.missingRoots,
      "a Phase-14 surface path does not exist. The walk starts here, so a stale root silently removes " +
        "a whole surface and everything reached only through it.",
    ).toEqual([]);
    expect(
      phase14Scan.unreadable,
      "a file in the derived closure could not be read or is below the stub floor",
    ).toEqual([]);
    expect(
      phase14.files.length,
      `the walk reached ${phase14.files.length} files inside the owned trees, not ` +
        `${PHASE_14_SURFACE_FILE_COUNT}. That is not a failure by itself — adding a component to one ` +
        "of the five surfaces is supposed to move this number — but the reach of every assertion " +
        "below just changed, so move the constant in the same commit and name the file in the diff.",
    ).toBe(PHASE_14_SURFACE_FILE_COUNT);
    // …and the walk really followed imports rather than stopping at the roots.
    expect(
      phase14.outside.length,
      "the walk resolved no import outside the owned trees at all, which means it resolved no " +
        "imports: every one of the five surfaces reaches the pattern layer or the vendored primitives.",
    ).toBeGreaterThan(0);
    expect(phase14Scan.regions.length).toBeGreaterThan(0);
  });

  it("every status-role element on the five surfaces resolves to a NON-EMPTY accessible name", () => {
    // 14-UI-SPEC § Live Regions, falsifiable #2. The role is `nameFrom: author` in ARIA — it takes no
    // name from its own text — so an unnamed one is silent to any query that asks for it by name, and
    // a `loading`-shaped one, whose children are `aria-hidden` by construction, announces the empty
    // string outright.
    //
    // ⚠ THIS RULE IS SCOPED TO THIS PHASE'S SURFACES ON PURPOSE AND MUST NOT BE WIDENED CASUALLY. On
    // the BOOKER path the opposite rule holds: `collision-notice.tsx`, `book-cta.tsx`,
    // `reserve-actions.tsx`, `relax-band.tsx`, `spots-left-chip.tsx` and both `slot-picker.tsx` hints
    // carry NO author name, because their own sentence IS the message and a named live region can be
    // announced BY ITS NAME INSTEAD OF ITS CONTENT on the VoiceOver/Safari pairing. Naming those to
    // make a wider version of this assertion green would degrade the thing it guards. The four regions
    // this rule covers are all declared in `AUTHOR_NAMED_REGIONS`, and the two of them that DO have
    // text of their own state what the trade costs on their rows.
    const offenders = phase14Scan.regions
      .filter((region) => region.role !== null && region.role.literal && region.role.raw === "status")
      .filter((region) => region.label === null || region.label.trim().length === 0)
      .map(
        (region) =>
          `${region.file}:${region.line} — the <${region.tag}> carrying role="status" ` +
          (region.named
            ? "has a name this scan cannot resolve to a string. Hoist it to a module-level " +
              '`const NAME = "…"` the way the four named regions on these surfaces do.'
            : "has NO aria-label. That role is nameFrom:author, so its accessible name is the empty " +
              "string and the region is unreachable by name. Add a name from a hoisted constant, and " +
              "a row in `AUTHOR_NAMED_REGIONS` saying why it needs one."),
      );
    expect(offenders).toEqual([]);

    // Guard the guard: this passes trivially if the closure holds no status region at all.
    const named = phase14Scan.regions.filter(
      (region) => region.role?.raw === "status" && region.label !== null,
    );
    expect(
      named.length,
      "the closure contains no resolvable status region, so the assertion above compared nothing",
    ).toBeGreaterThan(0);
  });

  it("renders the interrupting politeness level ZERO times on the five surfaces", () => {
    // 14-UI-SPEC falsifiable #3, and GATE-03 rule 7 applied to the supply side. It talks over whatever
    // is being read — on the wizard, plausibly the field the host is filling in. Where an event must
    // be noticed the mechanism is a POLITE region plus MOVED FOCUS.
    //
    // Asserted from BOTH sides, the same way SCAN 1 is: the text scan (comments stripped) catches the
    // literal, and the collected regions catch it inside a computed value such as a ternary.
    expect(phase14Scan.assertiveText).toEqual([]);
    const computed = phase14Scan.regions
      .filter((region) => region.ariaLive !== null && region.ariaLive.raw.includes("assertive"))
      .map((region) => `${region.file}:${region.line} (${region.kind}#${region.at})`);
    expect(computed).toEqual([]);
  });

  it("pins the implicitly-assertive alert role per file — TWO validation messages, no more", () => {
    // See `PHASE_14_ALERT_ROLE_SITES` above for why this is a pinned map rather than a zero-count
    // scan, and why the two shipped regions are NOT converted.
    const measured = new Map<string, number>();
    for (const region of phase14Scan.regions) {
      if (region.role?.raw !== "alert") continue;
      measured.set(region.file, (measured.get(region.file) ?? 0) + 1);
    }

    const asRows = (m: ReadonlyMap<string, number>): string[] =>
      [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([f, n]) => `${f} × ${n}`);

    expect(
      asRows(measured),
      "the alert-role census on the Phase-14 surfaces has moved. That role is IMPLICITLY ASSERTIVE — " +
        "it interrupts whatever a screen reader is speaking — so a new one is a new interruption, and " +
        "an attribute-only scan for the banned politeness level would not have seen it.\n" +
        "  If you ADDED one: the two pinned occurrences are native form-field validation messages, " +
        "user-initiated, about the field the host is standing in. That is the one canonical use. A " +
        "region reporting an outcome, a load failure or a page state is not it — use the status role " +
        "and declare it in `src/lib/design/live-regions.ts`.\n" +
        "  If you REMOVED one: converting a validation message's role is an accessibility behaviour " +
        "change and 14-14 deliberately did not make it. Move the pin and say why in the same commit.",
    ).toEqual(asRows(PHASE_14_ALERT_ROLE_SITES));

    // …and the pin is not a guess: the total is stated as a number too, so a file swapping one
    // occurrence for another somewhere else cannot net out to the same map.
    const total = [...measured.values()].reduce((a, b) => a + b, 0);
    expect(total, "the measured alert-role total on the five surfaces").toBe(2);
  });

  it("the week strip renders ZERO live regions of any kind", () => {
    // D-152, asserted here rather than left to review. The strip is a seven-column glance at the week
    // whose grid is `aria-hidden` and whose accessible equivalent is seven plain sentences. It updates
    // as the host edits the hours BELOW it — which is precisely why a "helpful" region added to it
    // would speak on every keystroke, and why the select the host just changed already announces its
    // own new value (GATE-03 rule 6: one outcome, one announcement).
    const onStrip = phase14Scan.regions.map((region) => region.file).filter((f) => f === WEEK_STRIP);
    expect(
      onStrip,
      `${WEEK_STRIP} has grown a live region. The strip is a derived VIEW of the editor beneath it: ` +
        "every change it shows was made by a control that reports itself, so a region here is a " +
        "second announcement of an outcome that already had one — and it would fire on every " +
        "keystroke, because the strip re-derives from the live form array rather than from a save.",
    ).toEqual([]);

    // Guard the guard: the file has to be IN the closure for that zero to mean anything.
    expect(
      phase14.files,
      "the week strip is not in the derived closure, so the zero above is over a file nobody opened",
    ).toContain(WEEK_STRIP);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// RENDER — THE MECHANISM. Why SCAN 3 demands the attribute instead of accepting the sr-only child.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("the mechanism — `role=\"status\"` takes NO accessible name from its content", () => {
  const LABEL = "Loading test content";

  it("computes an EMPTY name for a status region named only by an sr-only child", () => {
    // This markup is exactly what "carry an `sr-only` label naming what is loading" describes in
    // prose, and its accessible name is `""`. `status` is `nameFrom: author` in ARIA — name-from-
    // content is not permitted for it, so the child names nothing. Measured through
    // `@testing-library`'s `{ name }` option, which is `dom-accessibility-api`; NOT imported directly.
    render(
      <div role="status" aria-busy="true">
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    expect(screen.queryAllByRole("status")).toHaveLength(1);
    expect(
      screen.queryAllByRole("status", { name: LABEL }),
      "a status region named by its own content would make every aria-label on this path redundant, " +
        "and SCAN 3 would be asking for an attribute nothing needs",
    ).toHaveLength(0);
  });

  it("computes the label when the author supplies one — the same div, one attribute apart", () => {
    render(
      <div role="status" aria-busy="true" aria-label={LABEL}>
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    expect(screen.queryAllByRole("status", { name: LABEL })).toHaveLength(1);
  });

  it("keeps the sr-only child, because CONTENT and NAME are different mechanisms", () => {
    // Both are wanted and the gate demands both for a `loading` region: the `aria-label` is what the
    // region IS, the `sr-only` span is what it SAYS when it appears. Dropping the span as "redundant"
    // once the label exists would leave a named region with nothing to announce.
    const { container } = render(
      <div role="status" aria-busy="true" aria-label={LABEL}>
        <span className="sr-only">{LABEL}</span>
      </div>,
    );
    const srOnly = container.querySelectorAll(".sr-only");
    expect(srOnly).toHaveLength(1);
    expect(srOnly[0].textContent).toBe(LABEL);
  });

  it("shows the same is NOT true of a role whose name comes from content", () => {
    // The control that makes the three assertions above a fact about `status` rather than a fact
    // about `dom-accessibility-api`. A button IS nameFrom:content, and it computes its name from the
    // same markup shape that leaves a status region unnamed.
    render(<button type="button">{LABEL}</button>);
    expect(screen.queryAllByRole("button", { name: LABEL })).toHaveLength(1);
  });
});
