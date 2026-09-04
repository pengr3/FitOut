// STATE-04 / AC#23 / AC#24 — ONE empty shell, adopted everywhere, with the `border-dashed` scope
// question ANSWERED IN DATA rather than answered by widening a regex.
//
// The 11-UI-SPEC's falsifiable claim is *"zero `border-dashed` empty blocks survive outside
// `patterns/empty-state.tsx`"*. Taken literally over the tree that sentence is red, and it is red on
// files this phase never touches. This file is what makes the claim true by SAYING WHAT IT MEANS.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE SCOPE DECISION, IN PLAIN WORDS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `border-dashed` is not a synonym for "empty state". It is a decorative edge, and the tree uses it
// for three different jobs:
//
//   1. AN EMPTY-LIST PANEL — "there is nothing in this list yet". THAT is STATE-04's subject, and
//      after plan 11-16 there is exactly ONE of them: `patterns/empty-state.tsx`.
//   2. AN AVAILABILITY STATE PANEL — the day-detail rail's four mutually exclusive answers ("couldn't
//      load this day", "no availability yet", "nothing open on Tuesday", "closed for today"). Those
//      are facts about a DAY, not about a list, and they are Phase 12's surface.
//   3. A DROPZONE — "drop or select here". A dashed edge there is an invitation, and it is the one
//      place in the tree where the border genuinely carries meaning.
//
// So the assertion below is NOT "no file may contain `border-dashed`". It is the stronger, checkable
// pair: **every surviving dashed call site in `src/**` is either the one shell or a DECLARED row with
// a written reason, and the total is pinned.** A twelfth dashed panel appearing anywhere — including
// inside a file already on the list — goes red and has to come here and write a sentence.
//
// A hole that is declared with a reason is a contract. A hole that is merely convenient is how a gate
// rots (`card-pattern-coverage.test.ts`'s `ALLOWED_RAW_CARD`, same idiom, same argument).
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE INVENTORY IS 10, NOT THE 11 THE PLAN ASKED FOR — AND THE ARITHMETIC IS THE FINDING
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Plan 11-16 said: 19 dashed sites, 8 of them convertible, "the 11 extras" declared here. Measured
// with the AST scan below rather than read off the plan, on 17 August 2026:
//
//   at HEAD (16009c3 + 11-14/11-19)      20 dashed call sites   (the plan said 19)
//   converted by plan 11-16               9                     (the plan said 8)
//   surviving                            11 = 1 shell + 10 declared
//
// Every one of those three numbers differs from the plan's, and each difference is a measurement:
//
//   • **+1 at HEAD.** `patterns/error-state.tsx` landed in plan 11-09 — AFTER 11-16 was written —
//     and it carries the same dashed shell by construction, because it was extracted FROM the same
//     shipped markup. The plan could not have counted it.
//   • **+1 converted, twice over, −2 declared.** The plan listed `(host)/host/earnings/page.tsx` and
//     `(host)/host/page.tsx` as out-of-scope dashed sites to EXCLUDE, and separately listed
//     `/host/earnings` as a surface with "no empty state today" that needed one AUTHORED. Both are
//     wrong in the same direction: each of those two files has shipped a real empty-list panel since
//     Phase 5. They are conversions, not exclusions and not authorings. `(host)/host/page.tsx` was
//     also a THIRD shell variant the UI-SPEC's two-shell table never named — `rounded-lg` like shell
//     B but `p-8` like shell A, with a body that had no `mx-auto max-w-prose` and so ran the full
//     panel width. Leaving it would have left a dashed empty block inside AC#23's own scope.
//   • **−1 converted, +1 declared.** `search-results.tsx`'s first dashed block is the one the plan
//     counted as `search-results.tsx:170`. It is not an empty state — it is the shipped inline
//     ERROR (`role="alert"`, "Something went wrong loading spaces", one "Try again"), and
//     `patterns/error-state.tsx:57` names those exact lines as the markup `ErrorState` was extracted
//     from. Rendering a failure through `EmptyState` would say "there is nothing here" about a search
//     that never ran — the precise inversion of the T-11-FALSEALARM rule this same gate enforces on
//     `/host/requests` one describe below. It is carried as a declared row instead.
//
// The plan's own list of "the 11 extras" summed to 10 items as written, so the target number was
// already off by one before any of this was measured. Both totals are pinned separately below, and
// the reason each is pinned separately is `card-pattern-coverage.test.ts`'s probe (c): an inventory
// that silently empties satisfies every `toEqual([])` in the file perfectly.
//
// TWO MORE INVENTORIES WERE WRONG ON THE FIRST RUN OF THIS FILE, and both are recorded where they
// live rather than only here, because both are the same recurring shape:
//
//   • **13 `<EmptyState>` call sites, not the 11 plan 11-16 creates.** Plan 11-19 landed two
//     not-found routes on this shell after 11-16 was written. See `ADOPTERS`.
//   • **`bg-success` cannot be banned tree-wide.** The first run went red on
//     `src/lib/design/contrast-pairs.ts:250` — the `note:` string that DECLARES the rule this
//     assertion enforces. See `BG_SUCCESS_SCOPE` for why the ban is the rendering layer only.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS AN AST SCAN AND NOT A GREP
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 11 has now been tripped ELEVEN times by a prescribed text grep that a correct file's own
// explanation satisfies. This file would have been the twelfth in the most direct way available:
// `patterns/empty-state.tsx`'s header EXPLAINS the dashed-border exclusion at length and therefore
// contains the string four times, and every converted call site in plan 11-16 carries a comment
// naming the class it removed. A `grep -c "border-dashed"` over the tree counts prose.
//
// Everything below therefore reads STRING LITERALS AND JSX ATTRIBUTE VALUES off the TypeScript AST.
// A `//` comment, a `/* */` block and a JSDoc are invisible to it, by construction rather than by a
// stripping pass that can be fooled by a string containing `*/`.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — SIX PROBES, ALL RUN, ALL REVERTED. 17 August 2026. GREEN IS 31 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`), and
// Phase 11 has caught ten-plus prescribed probes being VACUOUS — passing against a broken tree
// because an absence assertion over an empty scan is perfectly satisfied. Command for all six:
// `npx vitest run --config vitest.design.config.ts tests/design/empty-state-adoption.test.ts`
//
//   (a) AC#23 — A CONVERTED BLOCK REVERTED. `src/app/(host)/host/listings/page.tsx` restored from
//       `git show f822329:…`, i.e. the raw shell-B block it shipped before this plan.
//       **5 failed / 26 passed**, every one of them a real assertion naming the file:
//
//         AssertionError: the tree's total `border-dashed` call-site count moved. Expected 11 = the
//         ONE shell + 10 declared exclusions. Found: src/app/(host)/host/listings/page.tsx:92, …:
//         expected 12 to be 11
//         AssertionError: a `border-dashed` panel survives that is neither the one shell nor a
//         declared row. STATE-04 says ONE empty shell; a raw dashed panel is either an adoption that
//         was reverted or a twelfth site that needs a written reason.
//         Undeclared dashed call sites:
//         src/app/(host)/host/listings/page.tsx:92: expected [ Array(1) ] to deeply equal []
//         AssertionError: a surface plan 11-16 converted no longer imports EmptyState. An absence
//         assertion cannot see this: a deleted empty state has no border either.
//         src/app/(host)/host/listings/page.tsx — imports nothing from
//         @/components/patterns/empty-state: expected [ Array(1) ] to deeply equal []
//         AssertionError: an adopter's <EmptyState> call-site count moved:
//         src/app/(host)/host/listings/page.tsx: declared 1, measured 0
//         AssertionError: the tree's total <EmptyState> call-site count moved. Expected 13 across 11
//         surfaces.: expected 12 to be 13
//
//       That five assertions fire on one edit is the property worth having: an adoption cannot be
//       undone in a way that satisfies this file from any direction — the dashed shell coming BACK
//       and the `<EmptyState>` going AWAY are separately caught, and either alone would be enough.
//       `git checkout --` → 31 passed.
//
//   (b) AC#23 — A TWELFTH DASHED SITE, IN A FILE ALREADY ON THE LIST. A fourth
//       `<div className="rounded-xl border border-dashed p-6 text-center">` added to
//       `src/components/availability/availability-calendar.tsx`, which is a DECLARED row with
//       `sites: 3`. This is the failure a flat list of eleven LINE NUMBERS would not catch and a
//       per-file COUNT does. **2 failed / 29 passed**:
//
//         AssertionError: the tree's total `border-dashed` call-site count moved. Expected 11 = the
//         ONE shell + 10 declared exclusions. Found: …:265, …:273, …:280, …:287, …: expected 12 to
//         be 11
//         AssertionError: a declared exclusion row's site count moved. The row is still legal; the
//         file grew a dashed panel nobody wrote a reason for.
//         src/components/availability/availability-calendar.tsx: declared 3, measured 4: expected
//         [ Array(1) ] to deeply equal []
//
//       Removed → 31 passed.
//
//   (c) AC#24 — THE POSITIVE TONE FLIPPED. `/host/requests`' `tone="positive"` changed to
//       `tone="neutral"`, WITH `icon={InboxIcon}` added — because 11-09's discriminated union makes
//       the neutral-without-an-icon form a compile error, which is the union earning its keep inside
//       a probe. **2 failed / 29 passed**:
//
//         AssertionError: STATE-04's inbox-zero clause is not satisfied: `/host/requests` renders its
//         empty state without tone="positive". An emptied work queue is an ACHIEVEMENT, not an
//         absence.: expected 'neutral' to be 'positive'
//         AssertionError: the tree holds a number of tone="positive" empty states other than the one
//         AC#24 pins: : expected +0 to be 1
//
//       `git checkout --` → 31 passed.
//
//   (d) AC#24 — A `bg-success` ADDED. `className="mt-8 bg-success"` on the wrapper `<div>` in
//       `src/app/(host)/host/requests/page.tsx` — i.e. exactly the "make the good news look good"
//       edit D-14 exists to refuse. **1 failed / 30 passed**:
//
//         AssertionError: `bg-success` appears outside the ONE glyph-only marker Phase 10 pinned.
//         D-14: green retreats to the ICON; the filled bg-success/text-success-foreground badge
//         measured 3.24 and is retired by DS-10.
//         Unlisted bg-success call sites: src/app/(host)/host/requests/page.tsx:139: expected
//         [ Array(1) ] to deeply equal []
//
//       `git checkout --` → 31 passed. NOTE THE LINE NUMBER, because it is the whole argument for the
//       AST: that page's own comment stating there is no `bg-success` on it sits at **:152**, and it
//       is NOT what fired. The scanner saw the className at :139 and never saw the prose.
//
//   (e) VACUITY — THE SCANNER BLINDED. `SRC_DIR` re-pointed at `src-nope`, so the walk opens nothing.
//       This is the probe that matters most, and it measured the thing Phase 11 keeps finding:
//       **16 failed / 15 passed — and among the 15 that PASSED is the file's headline assertion**,
//       `leaves NO dashed panel that is neither the one shell nor a declared row`, because a filter
//       over an empty list is empty. So are all seven self-tests, both render assertions and all four
//       inventory-size pins. Read alone, that assertion is worthless; it is only worth something
//       because the three guard-the-guard tests run FIRST and fail LOUDLY:
//
//         AssertionError: the scanner walked 0 files. Every absence assertion in this file is
//         satisfied perfectly by a scan that opened nothing.: expected 0 to be greater than or equal
//         to 100
//         AssertionError: expected [] to include 'src/components/search/search-results.…'
//         AssertionError: expected 0 to be greater than 0
//         AssertionError: the tree's total `border-dashed` call-site count moved. Expected 11 = the
//         ONE shell + 10 declared exclusions. Found: : expected +0 to be 11
//         AssertionError: a declared exclusion row names a file the walk never found — the row is
//         stale, or the scanner is blind.
//         AssertionError: the tree's total <EmptyState> call-site count moved. Expected 13 across 11
//         surfaces.: expected +0 to be 13
//         AssertionError: the scan found NO bg-success at all in src/app or src/components — the
//         allow-listed wizard marker should be there, so the matcher has gone blind: expected +0 to
//         be 1
//         AssertionError: the pattern was marked `use client`. The composition adapts to the
//         boundary; the pattern does not.: expected undefined to be false
//
//       Reverted → 31 passed.
//
//   (f) VACUITY — THE INVENTORY EMPTIED. `NON_EMPTY_STATE_DASHED` replaced with `[]` (the rows kept
//       alive under an unused binding, so the probe measured an EMPTY INVENTORY and not a compile
//       error), which is what a future "clean-up of a list nobody understands" looks like.
//       **2 failed / 29 passed** — and unlike `card-pattern-coverage.test.ts`'s probe (c), the
//       headline assertion DID fire, because closure here is stated as *every dashed site must be
//       declared* rather than *every declared site must be dashed*. Direction is the whole design:
//
//         AssertionError: a `border-dashed` panel survives that is neither the one shell nor a
//         declared row. …
//         AssertionError: the declared exclusion inventory is not the size the measurement records.
//         An inventory that silently emptied satisfies every closure assertion in this file.:
//         expected +0 to be 5
//
//       Restored → 31 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THIS GATE PROVES THE SHELL, NOT THE SENTENCE. It knows `/host/earnings` renders an
//     `<EmptyState>`; it cannot tell you the body blames the host, names no next step, or describes
//     the wrong payout model. The copywriting contract is reviewed by humans and, from plan 11-21,
//     seen in a browser. Nothing here reads copy for meaning.
//   • IT SAYS NOTHING ABOUT SURFACES PHASES 12–15 ADD. The inventories describe the tree as it stood
//     in August 2026. HFLOW-01 (Phase 14) **adopts** this component and does not re-decide it — that
//     is the near-overlap `REQUIREMENTS.md` records between STATE-04 and HFLOW-01 — so a Phase-14
//     host-tooling surface is expected to EXTEND `ADOPTERS` in its own commit. That is the gate
//     working, not the gate being wrong.
//   • A HAND-ROLLED EMPTY PANEL WITH A SOLID BORDER IS INVISIBLE HERE. Somebody determined to ship a
//     second shell can write `border border-muted` and this file will never see it. `border-dashed`
//     is the shape the shipped drift actually had, and pinning the `<EmptyState>` call-site COUNT is
//     the second half that catches a surface quietly dropping the pattern; neither alone is complete.
//   • IT DOES NOT PROVE ANY SURFACE EVER REACHES ITS ZERO STATE. Every assertion here is static. That
//     three list surfaces render `[data-testid="empty-state"]` against a seeded account with no
//     payouts, no attendees and no notifications was verified by hand and recorded in the plan's
//     SUMMARY; it is not re-checkable from this file.
//   • THE `bg-success` HALF IS A CLASSNAME SCAN, not a computed-style one. A token indirection
//     (`bg-[var(--success)]`, a CVA variant that resolves to the same fill) would slip past it.
//     `leak.test.ts` and `contrast-pairs.ts` police the token-level half.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { InboxIcon } from "lucide-react";
import ts from "typescript";

import { EmptyState } from "@/components/patterns/empty-state";
import { STATUS_TONE_RECIPES } from "@/lib/design/status-tones";

/** The scanned tree, as one constant — probe (e) above is a one-line edit here. */
const SRC_DIR = resolve(process.cwd(), "src");

/** The one file allowed to render a dashed EMPTY panel. STATE-04's whole sentence, as a path. */
const PATTERN_FILE = "src/components/patterns/empty-state.tsx";

/** The module every adopter must import the shell from. */
const PATTERN_MODULE = "@/components/patterns/empty-state";

/** Matched as a CLASS TOKEN, so `sm:border-dashed` counts and a hypothetical `border-dashed-x` does not. */
const DASHED = /(?:^|[\s:])border-dashed(?![\w-])/;
const BG_SUCCESS = /(?:^|[\s:])bg-success(?![\w-])/;

type DashedRow = {
  /** Repo-relative, forward-slashed. */
  readonly file: string;
  /** How many dashed call sites this file is allowed. Per-FILE rather than per-LINE on purpose: a
   *  line number rots on every edit above it, and probe (b) shows a count still catches the twelfth
   *  panel appearing inside a file that is already declared. */
  readonly sites: number;
  /** What the dashed edge MEANS on this surface, and which phase owns it. Measured, not assumed. */
  readonly why: string;
};

/**
 * EVERY SURVIVING `border-dashed` CALL SITE THAT IS NOT THE ONE SHELL, WITH THE REASON AND THE PHASE.
 *
 * Enumerated by the AST scan below rather than read off the plan — see the arithmetic in the header
 * for the five ways the plan's list was wrong. Ten sites across five files.
 */
const NON_EMPTY_STATE_DASHED: readonly DashedRow[] = [
  {
    file: "src/components/availability/availability-calendar.tsx",
    sites: 3,
    why:
      "NOT EMPTY-LIST PANELS — the hourly day-detail rail's three non-slot answers, measured: a " +
      "`role=\"alert\"` fetch failure (\"Couldn't load this day\"), a no-hours-set state, and a " +
      "nothing-open-on-this-day state. Two of the three are OCCUPANCY facts about one date and the " +
      "third is an error, so `EmptyState` would misreport all three: it would say \"there is nothing " +
      "here\" about a day that is fully booked, which is the T-11-FALSEALARM inversion this same file " +
      "asserts against one describe down. The rail is Phase 12's surface (checkout + availability) " +
      "and its four states are one design decision — the plan's guess that these were \"calendar " +
      "day-cell placeholders\" where a dashed edge means \"select here\" does not survive reading them.",
  },
  {
    file: "src/components/availability/date-pass-picker.tsx",
    sites: 4,
    why:
      "The open-capacity twin of the row above, and the same argument with a fourth state: fetch " +
      "failure, no-hours-set, closed-on-this-day, and closed-for-today (the venue's closing instant " +
      "for the date has already passed). Three occupancy facts and one error. Same surface, same " +
      "phase, same reason.",
  },
  {
    file: "src/components/listing/photo-uploader.tsx",
    sites: 1,
    why:
      "A DROPZONE, and the one place in the tree where the dashed edge genuinely carries meaning: it " +
      "says \"drop or select here\", not \"there is nothing here\". It also boxes an upload widget " +
      "rather than a list, and its heading is already a real `<h2>`. Converting it would put a " +
      "list-empty shell around an input affordance. Phase 14 (HFLOW) owns the listing wizard.",
  },
  {
    file: "src/components/patterns/error-state.tsx",
    sites: 1,
    why:
      "THE OTHER pattern, landed by plan 11-09 AFTER 11-16 was written, which is why the plan's count " +
      "of 19 was one short. It carries this shell BY CONSTRUCTION — it was extracted from the same " +
      "shipped markup, and its header points at `empty-state.tsx`'s decorative-border argument rather " +
      "than restating it. Two patterns sharing one geometry is the drift ENDING, not the drift.",
  },
  {
    file: "src/components/search/search-results.tsx",
    sites: 1,
    why:
      "THE ERROR BLOCK PLAN 11-16 LISTED AS ONE OF ITS EIGHT CONVERSIONS, DELIBERATELY NOT CONVERTED. " +
      "It is `role=\"alert\"` with \"Something went wrong loading spaces\" and one \"Try again\" — " +
      "`patterns/error-state.tsx` names these exact lines as the shape `ErrorState` was extracted " +
      "FROM. Through `EmptyState` it would announce \"there is nothing here\" about a search that " +
      "never ran. It is not converted to `ErrorState` here either, and as of plan 11-18 that is " +
      "PERMANENT rather than pending: `routeOut` is required because a BOUNDARY replaces the whole " +
      "screen and needs a way out, whereas this block sits inside a working page whose header, " +
      "filters and search form are the way out — and its only candidate destination is `/`, the page " +
      "the user is already on. Re-opening this row needs an argument against that, not just a note " +
      "that the adoption count could be higher. Full reasoning in the phase's deferred-items.md " +
      "under [11-18].",
  },
];

/** Pinned separately from every assertion over the inventory — see probe (f). */
const EXPECTED_DECLARED_FILES = 5;
const EXPECTED_DECLARED_SITES = 10;

/**
 * The total the tree is allowed. `EXPECTED_DECLARED_SITES` + the ONE shell.
 *
 * Pinned as its own number rather than derived, so that a row added to the inventory to silence a
 * new dashed panel still has to move a second constant deliberately.
 */
const EXPECTED_DASHED_TOTAL = 11;

type Adopter = {
  readonly file: string;
  /** How many `<EmptyState>` call sites this surface renders. */
  readonly sites: number;
  readonly why: string;
};

/**
 * EVERY SURFACE COMPOSING THE ONE SHELL — THIRTEEN FILES, SIXTEEN BLOCKS.
 *
 * The forward half. A gate that only asserted "no raw dashed panel survives" is satisfied perfectly
 * by a tree where somebody deleted the empty state entirely — an absent panel has no border.
 *
 * NINE are plan 11-16's conversions. TWO ARE PLAN 11-19'S NOT-FOUND ROUTES and the twelfth is plan
 * 11-21'S `/dev/theme` PREVIEW, and all three are the reason this inventory is enumerated by an AST
 * scan rather than by reading a plan: each landed after 11-16 was written and would have been
 * invisible to any list copied out of it. Every plan in Phase 11 that trusted its own surface
 * inventory found it wrong; this is the sixteenth instance.
 */
const ADOPTERS: readonly Adopter[] = [
  {
    file: "src/components/search/search-results.tsx",
    sites: 2,
    why: "Zero-result-after-filtering (D-31, three escape hatches) and cold-start (D-30, deliberately `actions={null}` — every escape hatch is a filter control, and offering one to a city with no supply is a button that cannot work). Shell A: this file's geometry is what the pattern adopted, so nothing here changed shape; the `<p className=\"font-semibold\">` titles became real `h2`s.",
  },
  {
    file: "src/app/(app)/bookings/page.tsx",
    sites: 2,
    why: "The booker's Upcoming and Past tabs. Shell B — the off-ladder 40px padding lands on 32px. The `variant=\"brand\"` \"Find a space\" CTA survives verbatim (Phase 10's accent list is closed).",
  },
  {
    file: "src/app/(host)/host/requests/page.tsx",
    sites: 1,
    why: "The host request inbox at zero — STATE-04's inbox-zero clause and the ONE deliberate copy change in the plan. Asserted in full by the AC#24 describe below.",
  },
  {
    file: "src/app/(host)/host/listings/page.tsx",
    sites: 1,
    why: "The host listing grid at zero. The `variant=\"brand\"` \"Create your first listing\" CTA survives verbatim; its `mt-4` is dropped because the pattern's actions row owns the offset.",
  },
  {
    file: "src/app/(host)/host/bookings/page.tsx",
    sites: 1,
    why: "The host's bookings list — ONE call site rendering both tabs, because both strings were already JS literals forked on `tab`. The icon forks with them.",
  },
  {
    file: "src/app/(host)/host/earnings/page.tsx",
    sites: 1,
    why: "The payouts ledger at zero. A CONVERSION, not the authoring the plan called for: the shipped sentence already explains the hold-until-session payout model (D-72), which is the harder version of \"must not imply a failure\" and is not something to re-invent.",
  },
  {
    file: "src/app/(host)/host/page.tsx",
    sites: 1,
    why: "The host dashboard's no-listings state — the NINTH conversion site, and a THIRD shell variant the UI-SPEC's two-shell table never named (`rounded-lg` + `p-8`, and a body with no prose measure). Same copy as `/host/listings`' grid by design: one product decision rendered twice, now through one shell.",
  },
  {
    file: "src/components/group/attendee-roster.tsx",
    sites: 1,
    why: "The organizer's roster at zero. THE PLAN NAMED `(app)/bookings/[id]/group/page.tsx`; that page renders `<AttendeeRoster>` and owns no zero-branch of its own, and this is the roster's only call site. `titleAs=\"h3\"` — it sits under the card's own `<h2>Who's coming</h2>`.",
  },
  {
    file: "src/components/notifications/notification-bell.tsx",
    sites: 1,
    why: "The notification panel at zero. `titleAs=\"h3\"` under the panel's `<h2>Notifications</h2>`, and `tone=\"neutral\"` despite the matching copy — see the AC#24 describe for why exactly one positive empty state is pinned.",
  },

  // ─── NOT PLAN 11-16'S. Landed by plan 11-19, found by the scan, declared here. ────────────────────
  {
    file: "src/app/not-found.tsx",
    sites: 1,
    why: "The root 404. NOT a list-empty state at all — it is an unmatched URL — and it composes the shell anyway, deliberately: the copywriting contract forbids \"404\" and \"error\" for a mistyped link, so the panel must read in the same neutral voice as every other empty surface. Plan 11-19's, listed here because the scan found it and a forward inventory copied out of plan 11-16 would not have.",
  },

  // ─── NOT PLAN 11-16'S EITHER. Landed by plan 13-10, and deferred to it BY NAME. ──────────────────
  {
    file: "src/app/(app)/bookings/[id]/not-found.tsx",
    sites: 1,
    why: "The booking-detail boundary, which 11-UI-SPEC explicitly deferred to Phase 13 (13-CONTEXT D-93 accepted it). Same argument as the two not-found rows above — a stale link is a normal thing to have — plus one this inventory has no other instance of: this page is what the OWNER GATE returns for BOTH a missing booking and a booking that belongs to somebody else (T-04-CONFIRMIDOR), so its copy is a security property. `ErrorState` was refused on two independent grounds: it paints the alarm token, which 13-UI-SPEC § Color bans across this whole phase, and it requires an `onRetry` for a page where there is nothing to retry.",
  },

  // ─── NOT PLAN 11-16'S EITHER. Landed by plan 14-05, and predicted by this file's own NOT COVERED
  //     note: "a Phase-14 host-tooling surface is expected to EXTEND `ADOPTERS` in its own commit.
  //     That is the gate working, not the gate being wrong." This is that commit. ───────────────────
  {
    file: "src/components/host/host-agenda.tsx",
    sites: 1,
    why: "The /host dashboard agenda's third state — a host with nothing booked at all (14-CONTEXT D-142). THE FIRST ROW IN THIS INVENTORY THAT IS A COMPONENT RATHER THAN A ROUTE, because the agenda's three states are one component the dashboard composes; the surface is where the shell is rendered, not where the URL is. `tone` is left NEUTRAL deliberately and that is the AC#24 boundary restated: an emptied work queue is an achievement, but a host who has not been booked yet has achieved nothing, so the positive set stays at the request inbox. `actions={null}` on purpose — every setup step genuinely outstanding is named by the signal rows beneath this block, and the host's spaces may already be live, so there is no next step this panel can honestly name.",
  },

  // ─── NOT PLAN 11-16'S EITHER. Landed by plan 14-13, the second Phase-14 extension and the same
  //     NOT COVERED note's prediction holding twice. ───────────────────────────────────────────────
  {
    file: "src/components/availability/blocks-editor.tsx",
    sites: 1,
    why: "The blocked-dates list at zero, on `/host/listings/{id}/availability` (HFLOW-04 · D-155). A GENUINE EMPTY LIST, and that is the distinction the editor beside it does NOT satisfy: `weekly-hours-editor.tsx`'s guidance box stayed a muted panel because its seven day rows always render, so it is an advisory about a form that is fully present rather than an absence — `card-pattern-coverage.test.ts` carries that argument from the other side. Copy is the shipped sentence word for word; `titleAs=\"h3\"` under the page's own `<h2>Blocked dates</h2>`; `tone` neutral, because an unblocked calendar is the normal state of a working listing and dressing it as an achievement would be as wrong as dressing it as a failure. `actions={null}` on purpose — the `Add block` control is already adjacent and above, and a second copy inside the panel is one affordance rendered twice.",
  },

  // ─── NOT PLAN 11-16'S EITHER. Landed by plan 18-12, and the FIRST STAFF-ONLY ROW IN THIS
  //     INVENTORY. It is declared on the same terms as every other row rather than exempted: the
  //     UI-SPEC states plainly that there is no "it's only for staff" carve-out anywhere under
  //     `tests/design/**`, so the ops surface is INSIDE the audited set, not beside it. ─────────────
  {
    file: "src/app/(ops)/ops/page.tsx",
    sites: 1,
    why: "The FitOut Ops review queue at zero (OPS-04 · D-246). THE SECOND SURFACE IN THIS INVENTORY TO EARN `tone=\"positive\"`, and it earns it by the same test the host inbox passes rather than by resemblance: an ops reviewer who has cleared the queue has FINISHED something, and every row that left did so because a person decided. Copy is 18-UI-SPEC § Empty verbatim — \"The queue is clear\" over \"Nothing is waiting on FitOut right now. New hosts and new listings land here the moment they're submitted, oldest first.\" — with the word `new` load-bearing in the page's lede for D-210's reason and deliberately not repeated in this body, which describes what ARRIVES rather than what the gate covers. `titleAs=\"h2\"` under the `PageHeader`'s `<h1>`. `actions={null}` on purpose and it is a decision the pattern forces: an ops reviewer cannot make a host submit a listing, and D-246 holds the console at one page, so there is no second ops destination a CTA could point at — a button here would be a control that does not act on this state.",
  },

  // ─── NOT A PRODUCT SURFACE. The design-review preview, landed by plan 11-21. ──────────────────────
  {
    file: "src/app/dev/theme/page.tsx",
    sites: 2,
    why: "THE ONLY NON-PRODUCT ROW IN THIS INVENTORY, and it is here because the scan found it rather than because a plan promised it. `/dev/theme` section 11 renders BOTH tones side by side inside each theme pane, which is what makes D-14's green-retreats-to-the-glyph rule comparable across themes instead of merely asserted; the route 404s in production and reads nothing from a database. Its two call sites are authored with inline JSX attributes rather than spread from a fixture constant ON PURPOSE — the parser above only reads `JsxAttribute` nodes, so a spread-authored panel is invisible to every `tone`/`title`/`titleAs` assertion in this file, and a preview that stayed green by not being seen would be the exact rubber stamp Phase 11 exists to remove.",
  },
];

/**
 * Pinned separately, for the same reason `EXPECTED_DECLARED_SITES` is.
 *
 * 12 → 13 files and 15 → 16 sites in plan 13-10's own commit, which is the only way these numbers are
 * ever allowed to move: `bookings/[id]/not-found.tsx` arrived with a row above it. A count that moved
 * without a row would mean the scan found a surface nobody wrote down.
 *
 * 13 → 14 files and 16 → 17 sites in plan 14-05's own commit, by the same rule and for the reason this
 * file's NOT COVERED section predicted in writing: HFLOW-01/HFLOW-03 ADOPT this component rather than
 * re-deciding it, so a Phase-14 host surface extends the inventory instead of authoring a shell. The
 * count was observed moving first — `expected 17 to be 16` — and the row was added to answer it.
 *
 * 14 → 15 files and 17 → 18 sites in plan 14-13's own commit, the SECOND Phase-14 extension and the
 * same rule a third time: `blocks-editor.tsx`'s no-blocked-dates box is a genuine empty list, so the
 * surface adopts the shell in the commit that converts it rather than authoring a second one. It is
 * the second row in this inventory that is a COMPONENT rather than a route, for `host-agenda.tsx`'s
 * reason — the shell is rendered by the editor the availability page composes, not by the page.
 *
 * ── 15 → 14 files and 18 → 17 sites in plan 17.1-02's own commit. THE FIRST DECREMENT IN THIS LIST ──
 * Every movement above is a GROWTH — a surface adopted the shell and extended the inventory in the
 * commit that converted it. This one runs the other way, and the distinction that makes it legal is
 * the whole reason this docblock exists: **the surface was DELETED, not "no longer found by the
 * scan"**. The `not-found.tsx` under `src/app/listings/[id]/(detail)/` was `git rm`'d, in this
 * commit, because it was UNREACHABLE IN EVERY STATE — `(detail)/layout.tsx` raises `notFound()` from
 * a LAYOUT, so the PARENT segment's boundary wins, and `src/app/listings/[id]/` has none, so a
 * missing listing falls all the way to the root not-found (`[17-D3]`; measured 404, with that
 * boundary's own copy — "This space isn't available" — appearing 0 times).
 *
 * (⚠ THE DELETED PATH IS DELIBERATELY NOT SPELLED AS ONE STRING ANYWHERE ABOVE, INCLUDING IN PROSE.
 * Plan 17.1-02's acceptance criterion greps the tree for it and expects the count this file now has:
 * zero. `price-breakdown.tsx`'s GREP TRIPWIRE rule, applied to a deletion instead of an identifier —
 * a reader who "tidies" the phrasing back into one path silently breaks that count.)
 *
 * A count that drops because a file left the tree and a count that drops because the WALK went blind
 * are the same two numbers and completely different events, and only the second is a defect: a
 * parser that silently stops seeing a construct empties this inventory one row at a time while every
 * assertion in this file stays green, which is `[17-D20]`'s class exactly. That is why this entry
 * says which of the two happened, in as many words, rather than only recording that 15 became 14.
 *
 * The order was watched, not assumed. With the file deleted and the row left standing, THREE clauses
 * in the AC#23-forward block below go red, named by TITLE rather than by line because writing this
 * block moves every line number under it:
 *
 *   • "has every adopter importing EmptyState from the pattern module" — the strongest of the three,
 *     and the one whose own message says why: "an absence assertion cannot see this".
 *   • "has every adopter rendering the declared number of blocks" — "declared 1, measured 0".
 *   • "holds the pinned total of `<EmptyState>` call sites across the tree" — "expected 17 to be 18".
 *
 * In that state `npm run build` cannot reach `next build` at all. Transcript verbatim in
 * `.planning/phases/17.1-close-phase-17-escalations-sticky-bar-clearance-soft-404-pro/17.1-EVIDENCE.md`
 * § W1. The fourth pin (`ADOPTERS.length`, below) stays green in that state and reds in the opposite
 * one — constants moved, row left — which is why both move together or neither moves.
 *
 * ── 14 → 15 files and 17 → 18 sites in plan 18-12's own commit. THE FIRST STAFF-ONLY ADOPTER ───────
 * `src/app/(ops)/ops/page.tsx`, and it is a GROWTH of the ordinary kind: a surface adopted the shell
 * in the commit that created it. The count was observed moving FIRST and the row was added to answer
 * it — verbatim, `AssertionError: the tree's total <EmptyState> call-site count moved. Expected 17
 * across 14 surfaces.: expected 18 to be 17`.
 *
 * ⚠ THE PLAN AND THE UI-SPEC BOTH NAMED THE WRONG CONSTANTS FOR THIS MOVE, and the correction is
 * recorded here rather than silently applied. Both said `EXPECTED_DECLARED_FILES` 5 → 6,
 * `EXPECTED_DECLARED_SITES` 10 → 11 and `EXPECTED_DASHED_TOTAL` 11 → 12. Those three pin the
 * NON-`EmptyState` dashed-border exclusions — surfaces that draw a dashed panel WITHOUT adopting the
 * shell — and an adopter moves none of them: the ops page composes `EmptyState`, whose own
 * `border-dashed` is the ONE shell already counted in `EXPECTED_DASHED_TOTAL`. All three were
 * asserted UNCHANGED across this commit, and the run says so by staying green on them.
 */
const EXPECTED_ADOPTER_FILES = 15;
const EXPECTED_EMPTY_STATE_SITES = 18;

/**
 * THE ONE LEGAL `bg-success` IN THE TREE, pinned by name.
 *
 * `contrast-pairs.ts:250` states the rule: a non-text GLYPH on a filled `--success` surface (the
 * publish checklist's done marker, a progress indicator rather than a status badge). It is ILLEGAL as
 * text — the filled `bg-success`/`text-success-foreground` badge measured 3.24 and is retired by
 * DS-10. AC#24 asserts the count has not grown.
 *
 * ── RE-POINTED BY PLAN 14-10, IN THE SAME COMMIT AS THE MOVE ─────────────────────────────────────
 * The key was `src/app/(host)/host/listings/[id]/edit/wizard.tsx` until D-149 made the checklist
 * PERSISTENT rather than an end-of-flow reveal. Three placements over one row array means the markup
 * is a component, and the marker went with it. The count did not grow and the RULE did not change —
 * one entry before, one entry after — so this is the inventory following its subject, not an
 * exemption bought to make a refactor pass. If a SECOND key ever appears here, that is the growth
 * AC#24 is watching for and it needs the measured argument the original had.
 */
const ALLOWED_BG_SUCCESS: Readonly<Record<string, string>> = {
  "src/components/host/publish-checklist.tsx":
    "The done marker in the listing wizard's publish checklist — a checkmark GLYPH on a filled success surface, which is the one pairing contrast-pairs.ts declares legal for --success-foreground. Phase 10 pinned it by name at its old address inside the wizard route file; plan 14-10 lifted the checklist into this component so the same rows can render from a side panel, a collapsible summary and the review step without three copies of the marker, and moved this row with it. The span still holds a glyph and nothing else, which is the entire reason the pairing is legal.",
};

/**
 * THE TREES THE `bg-success` ZERO-COUNT APPLIES TO — the RENDERING layer, which is what AC#24 names.
 *
 * `src/lib/**` is deliberately outside it, and the reason was MEASURED rather than assumed: the first
 * run of this gate went red on `src/lib/design/contrast-pairs.ts:250`, whose `note:` field is the
 * sentence *declaring the rule this assertion enforces* — "the filled bg-success/text-success-
 * foreground badge measured 3.24 and is retired by DS-10". That string is documentation inside a
 * design-token module; it renders nothing, and a gate that forced the rule's own written reason off
 * the page would be the grep-versus-comment collision arriving through a `note` field instead of a
 * `//`. Widening the ban to `src/lib/**` would buy nothing and cost the only place the rule is
 * written down.
 */
const BG_SUCCESS_SCOPE = ["src/app/", "src/components/"] as const;

/** Repo-relative, forward-slashed. See `leak.test.ts:157-165` for why the normalisation matters. */
function label(file: string): string {
  return relative(process.cwd(), file).split("\\").join("/");
}

function collectSourceFiles(dir: string, out: string[] = []): string[] {
  // `Dirent<string>[]`, spelled out rather than inferred — see sticky-offset.test.ts:191 for the
  // @types/node overload that makes the inferred form fail to compile.
  let entries: Dirent<string>[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    // `[]` rather than a throw — 11-02's rule: a broken scan surfaces as ONE named guard-the-guard
    // failure, not as a stack trace that buries which gate went quiet.
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) collectSourceFiles(full, out);
    else if (/\.tsx?$/.test(entry.name)) out.push(full);
  }
  return out;
}

type EmptyStateSite = {
  readonly line: number;
  /** `"positive"`, `"neutral"`, or `null` when the prop is absent (the union's default). */
  readonly tone: string | null;
  /** The `title` prop's value when it is a plain string literal; `null` when it is an expression. */
  readonly title: string | null;
  readonly titleAs: string | null;
};

type Parsed = {
  readonly dashedLines: readonly number[];
  readonly bgSuccessLines: readonly number[];
  readonly importsPattern: boolean;
  readonly emptyStateSites: readonly EmptyStateSite[];
  /** True when the module opens with a `"use client"` directive prologue. */
  readonly isClientModule: boolean;
};

/**
 * Parse one module's TEXT.
 *
 * `(path, text)` rather than `(path)` ON PURPOSE: the self-tests at the bottom feed it fixtures that
 * are never written to disk, so the code path the real assertions run is the same one the fixtures
 * prove (`leak.test.ts:208-212`'s rule).
 *
 * Only STRING LITERALS and JSX ATTRIBUTE VALUES are read. Comments are not part of the AST's
 * expression tree at all, so the eleven-times-repeated grep-versus-comment collision cannot happen
 * here — and it is not avoided by a regex stripping pass, which any string containing a block-comment
 * terminator defeats. (Written that way round because the FIRST draft of this docblock spelled the
 * terminator literally, ended itself four words early, and failed to parse. Twelfth instance.)
 */
function parse(path: string, text: string): Parsed {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const dashedLines: number[] = [];
  const bgSuccessLines: number[] = [];
  const emptyStateSites: EmptyStateSite[] = [];
  // The LOCAL binding(s) the shell is imported under. Resolved rather than assumed, so
  // `import { EmptyState as Blank }` is still seen and a component called `EmptyState` from some
  // other module is not.
  const localNames = new Set<string>();
  let importsPattern = false;

  const lineOf = (node: ts.Node): number =>
    sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1;

  const readClassish = (value: string, node: ts.Node): void => {
    if (DASHED.test(` ${value} `)) dashedLines.push(lineOf(node));
    if (BG_SUCCESS.test(` ${value} `)) bgSuccessLines.push(lineOf(node));
  };

  const visit = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      if (node.moduleSpecifier.text === PATTERN_MODULE) {
        const bindings = node.importClause?.namedBindings;
        if (bindings && ts.isNamedImports(bindings)) {
          for (const el of bindings.elements) {
            const imported = (el.propertyName ?? el.name).text;
            if (imported === "EmptyState") {
              importsPattern = true;
              localNames.add(el.name.text);
            }
          }
        }
      }
    }

    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      readClassish(node.text, node);
    } else if (
      ts.isTemplateHead(node) ||
      ts.isTemplateMiddle(node) ||
      ts.isTemplateTail(node)
    ) {
      readClassish(node.text, node);
    }

    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName.getText(sf);
      if (localNames.has(tag)) {
        const attr = (name: string): string | null => {
          for (const a of node.attributes.properties) {
            if (!ts.isJsxAttribute(a) || a.name.getText(sf) !== name) continue;
            const init = a.initializer;
            if (init && ts.isStringLiteral(init)) return init.text;
            if (
              init &&
              ts.isJsxExpression(init) &&
              init.expression &&
              (ts.isStringLiteral(init.expression) ||
                ts.isNoSubstitutionTemplateLiteral(init.expression))
            ) {
              return init.expression.text;
            }
            return null;
          }
          return null;
        };
        emptyStateSites.push({
          line: lineOf(node),
          tone: attr("tone"),
          title: attr("title"),
          titleAs: attr("titleAs"),
        });
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(sf);

  // The directive prologue, read structurally. `empty-state.tsx`'s own header QUOTES the directive
  // in order to say it does not use it, so a text search on that file returns a non-zero count
  // against a correct file — 11-07 and 11-08 both recorded the same finding.
  const first = sf.statements[0];
  const isClientModule =
    !!first &&
    ts.isExpressionStatement(first) &&
    ts.isStringLiteral(first.expression) &&
    first.expression.text === "use client";

  return { dashedLines, bgSuccessLines, importsPattern, emptyStateSites, isClientModule };
}

/** The whole tree, scanned ONCE at module level; the `it()` blocks only assert. */
function scanTree() {
  const walked: string[] = [];
  const dashed: string[] = [];
  const dashedByFile = new Map<string, number>();
  const bgSuccess: string[] = [];
  const parsedByFile = new Map<string, Parsed>();
  let emptyStateSiteCount = 0;

  for (const full of collectSourceFiles(SRC_DIR)) {
    const file = label(full);
    walked.push(file);
    const parsed = parse(file, readFileSync(full, "utf8"));
    parsedByFile.set(file, parsed);

    if (parsed.dashedLines.length > 0) {
      dashedByFile.set(file, parsed.dashedLines.length);
      for (const line of parsed.dashedLines) dashed.push(`${file}:${line}`);
    }
    for (const line of parsed.bgSuccessLines) bgSuccess.push(`${file}:${line}`);
    emptyStateSiteCount += parsed.emptyStateSites.length;
  }

  return { walked, dashed, dashedByFile, bgSuccess, parsedByFile, emptyStateSiteCount };
}

const TREE = scanTree();

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// Guard the guard FIRST (T-10-06). Five assertions in this file are "a list was empty", and probe
// (e) measured that every one of them passes against a scan that opened nothing.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
describe("guard-the-guard — the scanner really walked the tree", () => {
  it("walks at least 100 source files", () => {
    expect(
      TREE.walked.length,
      "the scanner walked 0 files. Every absence assertion in this file is satisfied perfectly by a scan that opened nothing.",
    ).toBeGreaterThanOrEqual(100);
  });

  it("finds the two surfaces AC#23 is named over, by path", () => {
    expect(TREE.walked).toContain("src/components/search/search-results.tsx");
    expect(TREE.walked).toContain("src/app/(app)/bookings/page.tsx");
  });

  it("positive control: the scan actually finds dashed call sites and EmptyState call sites", () => {
    // Not a tautology with the pinned totals below: this fires when the MATCHERS break (a regex
    // typo, a JSX-tag resolution change) while the walk itself is healthy — which the pinned
    // totals would report as "the tree changed" rather than "the scanner stopped seeing".
    expect(TREE.dashed.length).toBeGreaterThan(0);
    expect(TREE.emptyStateSiteCount).toBeGreaterThan(0);
  });
});

describe("AC#23 — one dashed empty shell, and every other dashed panel is declared", () => {
  it("holds the pinned total of `border-dashed` call sites", () => {
    expect(
      TREE.dashed.length,
      `the tree's total \`border-dashed\` call-site count moved. Expected ${EXPECTED_DASHED_TOTAL} = the ONE shell + ${EXPECTED_DECLARED_SITES} declared exclusions. Found: ${TREE.dashed.join(", ")}`,
    ).toBe(EXPECTED_DASHED_TOTAL);
  });

  it("leaves NO dashed panel that is neither the one shell nor a declared row", () => {
    const declared = new Set(NON_EMPTY_STATE_DASHED.map((r) => r.file));
    const undeclared = TREE.dashed.filter((site) => {
      const file = site.slice(0, site.lastIndexOf(":"));
      return file !== PATTERN_FILE && !declared.has(file);
    });
    expect(
      undeclared,
      "a `border-dashed` panel survives that is neither the one shell nor a declared row. STATE-04 says ONE empty shell; a raw dashed panel is either an adoption that was reverted or a twelfth site that needs a written reason.\nUndeclared dashed call sites:\n" +
        undeclared.join(", "),
    ).toEqual([]);
  });

  it("renders the shell in `patterns/empty-state.tsx` — the one file allowed to", () => {
    // The other direction of the same claim: a tree where the pattern lost its dashed border would
    // satisfy every absence assertion above.
    expect(TREE.dashedByFile.get(PATTERN_FILE)).toBe(1);
  });

  it("matches every declared row's site count", () => {
    const drifted = NON_EMPTY_STATE_DASHED.filter(
      (row) => (TREE.dashedByFile.get(row.file) ?? 0) !== row.sites,
    ).map((row) => `${row.file}: declared ${row.sites}, measured ${TREE.dashedByFile.get(row.file) ?? 0}`);
    expect(
      drifted,
      "a declared exclusion row's site count moved. The row is still legal; the file grew a dashed panel nobody wrote a reason for.\n" +
        drifted.join("\n"),
    ).toEqual([]);
  });

  it("names no file the walk never found (a rotted row)", () => {
    const missing = NON_EMPTY_STATE_DASHED.filter((row) => !TREE.walked.includes(row.file)).map(
      (row) => row.file,
    );
    expect(
      missing,
      "a declared exclusion row names a file the walk never found — the row is stale, or the scanner is blind.\n" +
        missing.join(", "),
    ).toEqual([]);
  });

  it("gives every declared row a non-empty reason", () => {
    // A row with an empty `why` is the shape this whole inventory exists to prevent: a hole that
    // looks declared. The 60-character floor is a crude proxy for "a sentence".
    for (const row of NON_EMPTY_STATE_DASHED) {
      expect(row.why.length, `${row.file} is declared with no reason`).toBeGreaterThan(60);
    }
  });

  it("pins the inventory's own size, separately from every assertion over it", () => {
    // Probe (f): an inventory replaced with `[]` still satisfies the per-row assertions above
    // perfectly, because there are no rows to check.
    expect(
      NON_EMPTY_STATE_DASHED.length,
      "the declared exclusion inventory is not the size the measurement records. An inventory that silently emptied satisfies every closure assertion in this file.",
    ).toBe(EXPECTED_DECLARED_FILES);
    expect(NON_EMPTY_STATE_DASHED.reduce((n, r) => n + r.sites, 0)).toBe(EXPECTED_DECLARED_SITES);
  });
});

describe("AC#23 forward — the twelve surfaces composing the shell still compose it", () => {
  it("has every adopter importing EmptyState from the pattern module", () => {
    const unadopted = ADOPTERS.filter(
      (a) => !TREE.parsedByFile.get(a.file)?.importsPattern,
    ).map((a) => `${a.file} — imports nothing from ${PATTERN_MODULE}`);
    expect(
      unadopted,
      "a surface plan 11-16 converted no longer imports EmptyState. An absence assertion cannot see this: a deleted empty state has no border either.\n" +
        unadopted.join("\n"),
    ).toEqual([]);
  });

  it("has every adopter rendering the declared number of blocks", () => {
    const drifted = ADOPTERS.filter(
      (a) => (TREE.parsedByFile.get(a.file)?.emptyStateSites.length ?? 0) !== a.sites,
    ).map(
      (a) =>
        `${a.file}: declared ${a.sites}, measured ${TREE.parsedByFile.get(a.file)?.emptyStateSites.length ?? 0}`,
    );
    expect(drifted, "an adopter's <EmptyState> call-site count moved:\n" + drifted.join("\n")).toEqual([]);
  });

  it("holds the pinned total of `<EmptyState>` call sites across the tree", () => {
    expect(
      TREE.emptyStateSiteCount,
      `the tree's total <EmptyState> call-site count moved. Expected ${EXPECTED_EMPTY_STATE_SITES} across ${EXPECTED_ADOPTER_FILES} surfaces.`,
    ).toBe(EXPECTED_EMPTY_STATE_SITES);
  });

  it("pins the adopter inventory's own size", () => {
    expect(ADOPTERS.length).toBe(EXPECTED_ADOPTER_FILES);
    expect(ADOPTERS.reduce((n, a) => n + a.sites, 0)).toBe(EXPECTED_EMPTY_STATE_SITES);
  });

  it("renders every title through a heading element, never a `<p>`", () => {
    // The shell-A defect, asserted at the type level by the pattern and here at the call sites:
    // `titleAs` is `"h2" | "h3"`, so an explicit value can only be one of the two — what this
    // catches is a call site passing something the type would reject in a future widening.
    const bad = ADOPTERS.flatMap((a) =>
      (TREE.parsedByFile.get(a.file)?.emptyStateSites ?? [])
        .filter((s) => s.titleAs !== null && s.titleAs !== "h2" && s.titleAs !== "h3")
        .map((s) => `${a.file}:${s.line} titleAs="${s.titleAs}"`),
    );
    expect(bad, "an empty state renders its title as something other than h2/h3:\n" + bad.join("\n")).toEqual([]);
  });
});

describe("AC#24 — an emptied WORK QUEUE is a POSITIVE state, and green stays on the glyph", () => {
  const REQUESTS = "src/app/(host)/host/requests/page.tsx";

  /**
   * ⚠ THE SECOND PRODUCT SURFACE, ADDED BY PLAN 18-12, AND THE TITLE ABOVE MOVED WITH IT.
   *
   * This describe used to be named "host inbox-zero" and the clause below used to assert the product
   * count was exactly ONE. Both were true when they were written and both are now false, so both are
   * amended rather than left standing beside a carve-out — `venue-clock-scope.ts`'s rule, applied to
   * a gate's own name: a rule that has been superseded must not stay on the books as if it were still
   * true.
   *
   * WHAT DID NOT CHANGE IS THE RULE ITSELF, and that is the point. AC#24 was never "one surface"; it
   * was **an emptied WORK QUEUE is an achievement, an absence anywhere else is not**. `/ops` is a work
   * queue by the same test the host inbox passes — an ops reviewer who has cleared it has finished
   * something, and every row that leaves it left because somebody decided. `host-agenda.tsx`'s row in
   * `ADOPTERS` states the boundary from the other side and is UNCHANGED: a host who has not been
   * booked yet has achieved nothing, so that panel stays neutral, and so does the bell.
   *
   * THERE IS NO STAFF-SURFACE CARVE-OUT HERE. `/ops` is inside the audited set on exactly the same
   * terms as every booker and host surface — the same tone vocabulary, the same one-pixel-of-green
   * rule, the same `bg-success` zero-count. It is declared, not exempted.
   */
  const OPS_QUEUE = "src/app/(ops)/ops/page.tsx";

  /**
   * The PRODUCT surfaces allowed a positive empty state — a SET, so a failure names the offending
   * file rather than reporting a number that moved.
   */
  const PRODUCT_POSITIVE_SURFACES = [OPS_QUEUE, REQUESTS].sort();

  it("renders `/host/requests`' empty state with tone=\"positive\"", () => {
    const sites = TREE.parsedByFile.get(REQUESTS)?.emptyStateSites ?? [];
    expect(sites).toHaveLength(1);
    expect(
      sites[0]?.tone,
      'STATE-04\'s inbox-zero clause is not satisfied: `/host/requests` renders its empty state without tone="positive". An emptied work queue is an ACHIEVEMENT, not an absence.',
    ).toBe("positive");
  });

  it("carries the one deliberate copy change, verbatim", () => {
    const sites = TREE.parsedByFile.get(REQUESTS)?.emptyStateSites ?? [];
    expect(sites[0]?.title).toBe("You're all caught up");
  });

  /**
   * EVERY FILE ALLOWED A `tone="positive"` EMPTY STATE, with the reason. TWO product surfaces and ONE
   * preview — a SET rather than a count, so a failure names the offending file instead of a number.
   *
   * `/dev/theme` was added by plan 11-21 and is not a weakening of AC#24. It renders BOTH tones side
   * by side so the green-retreats-to-the-glyph rule is comparable across the two themes, which is a
   * DESIGN-REVIEW surface rather than a product state: the route 404s in production, discloses
   * nothing, and its panel is one of a pair whose whole point is the contrast. The product claim is
   * asserted separately below — the two WORK QUEUES, and nothing else.
   */
  const POSITIVE_SITES: Readonly<Record<string, string>> = {
    [REQUESTS]:
      "STATE-04's inbox-zero clause. An emptied work queue is an ACHIEVEMENT, not an absence — the " +
      "first product surface in the app where 'there is nothing here' is good news.",
    [OPS_QUEUE]:
      "The FitOut Ops review queue at zero (plan 18-12 / 18-UI-SPEC § Empty). The SAME clause as the " +
      "host inbox above and the second surface to satisfy it: an ops reviewer who has cleared the " +
      "queue has finished something, and every row that left it left because a person decided. " +
      "`actions={null}` for a reason this file already recognises — an ops reviewer cannot make a " +
      "host submit a listing, and D-246 means there is no second ops destination to point at.",
    "src/app/dev/theme/page.tsx":
      "Plan 11-21's section 11: the two tones rendered side by side in both themes, so D-14 (green " +
      "retreats to the icon) is COMPARABLE rather than asserted. Authored with inline JSX attributes " +
      "rather than a spread constant precisely so this gate can see it — a spread attribute is not a " +
      "`JsxAttribute`, so the extractor above reads `null` for every prop delivered through one, and " +
      "a preview authored that way would have kept this assertion green by being invisible to it.",
  };

  it("pins tone=\"positive\" to the declared set, and to nothing else", () => {
    // Scope, asserted rather than assumed. `notification-bell.tsx` ships the SAME sentence at zero
    // and is deliberately `neutral`: a bell at zero is ambient — nobody achieved it — and a green
    // check in a 320px popover is a second accent decision belonging to whoever redesigns that
    // panel. If a later phase wants a third positive empty state, it adds a row here and says why.
    const positives = [...TREE.parsedByFile.entries()].flatMap(([file, p]) =>
      p.emptyStateSites.filter((s) => s.tone === "positive").map((s) => `${file}:${s.line}`),
    );
    expect(
      [...new Set(positives.map((s) => s.slice(0, s.lastIndexOf(":"))))].sort(),
      `the tree's tone="positive" empty states are not the declared set: ${positives.join(", ")}`,
    ).toEqual(Object.keys(POSITIVE_SITES).sort());
    // One per declared file, so a SECOND positive panel inside an already-declared file is still red.
    expect(positives.length, `sites: ${positives.join(", ")}`).toBe(
      Object.keys(POSITIVE_SITES).length,
    );
  });

  it("keeps the PRODUCT claim at exactly the two work queues", () => {
    // The half AC#24 is actually about. `/dev/theme` is excluded BY PATH rather than by trust: it is
    // the route both other dev-surface gates already treat as non-product (it 404s in production),
    // and naming the exclusion here means a positive empty state appearing on any real surface is red
    // even though the declared set above has grown.
    //
    // ⚠ ASSERTED AS A SET AND NOT AS A COUNT, which is the shape this clause should always have had.
    // It read `toBe(1)` plus a `startsWith` on the first element until plan 18-12; a bare count is
    // satisfied by a tree where the positive panel MOVED to some other surface, which is the one
    // failure this clause exists to catch. With two members that hole is no longer theoretical.
    const productPositives = [...TREE.parsedByFile.entries()]
      .filter(([file]) => !file.startsWith("src/app/dev/"))
      .flatMap(([file, p]) =>
        p.emptyStateSites.filter((s) => s.tone === "positive").map((s) => `${file}:${s.line}`),
      );
    expect(
      [...new Set(productPositives.map((s) => s.slice(0, s.lastIndexOf(":"))))].sort(),
      "the PRODUCT surfaces rendering a positive empty state are not the two declared work queues " +
        `(the host request inbox and the ops review queue): ${productPositives.join(", ")}. An ` +
        "emptied WORK QUEUE is an achievement; an absence anywhere else is not, and dressing one as " +
        "good news is the T-11-FALSEALARM rule running backwards.",
    ).toEqual(PRODUCT_POSITIVE_SURFACES);
    // One per surface, so a SECOND positive panel inside an already-declared file is still red.
    expect(productPositives.length, `sites: ${productPositives.join(", ")}`).toBe(
      PRODUCT_POSITIVE_SURFACES.length,
    );
  });

  it("gives every declared positive site a non-empty reason, and names no file the walk missed", () => {
    for (const [file, why] of Object.entries(POSITIVE_SITES)) {
      expect(why.trim().length, `${file} has an empty reason`).toBeGreaterThan(40);
      expect(TREE.parsedByFile.has(file), `${file} is declared here but the walk never found it`).toBe(
        true,
      );
    }
  });

  it("puts the green on the ICON and nowhere else — rendered, not grepped", () => {
    // THE ONLY ASSERTION IN THIS FILE THAT RENDERS ANYTHING. `renderToStaticMarkup` rather than a
    // DOM: `EmptyState` is a pure function component with no hooks and no client APIs, so the
    // server renderer produces the real markup with no jsdom and no `@vitest-environment` pragma —
    // which keeps this file a `.test.ts` and keeps the design config's node environment intact.
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        tone: "positive",
        titleAs: "h2",
        title: "You're all caught up",
        body: "When a guest requests one of your request-to-book spaces, it shows up here.",
        actions: null,
      }),
    );

    expect(html).toContain('data-testid="empty-state"');
    // The glyph carries the hue.
    expect(html).toMatch(/<svg[^>]*class="[^"]*text-success/);
    // The heading does NOT. D-14: --success measures 4.00 court / 3.86 grove — legal against a 3.0
    // non-text bar, illegal against 4.5 text.
    const heading = html.match(/<h2[^>]*class="([^"]*)"/)?.[1] ?? "";
    expect(heading, "the positive empty state's heading is missing --foreground ink").toContain(
      "text-foreground",
    );
    expect(heading, "D-14 violated: the tone reached the TEXT, not just the glyph").not.toContain(
      "text-success",
    );
    // No fill, anywhere.
    expect(html, "the positive empty state renders a green FILL").not.toMatch(BG_SUCCESS);
  });

  it("renders the neutral tone with no green at all", () => {
    // A REAL `LucideIcon` rather than a hand-rolled stub, and that is not laziness: the union types
    // `icon` as `LucideIcon`, so a bare `(props) => <svg/>` does not satisfy it (measured — TS2769,
    // `$$typeof` missing). Casting past that would test a shape the pattern cannot actually receive.
    const html = renderToStaticMarkup(
      createElement(EmptyState, {
        tone: "neutral",
        icon: InboxIcon,
        titleAs: "h3",
        title: "Nothing here yet",
        body: "One sentence.",
        actions: null,
      }),
    );
    expect(html).toMatch(/<svg[^>]*class="[^"]*text-muted-foreground/);
    expect(html).not.toContain("text-success");
    expect(html).toMatch(/<h3[^>]*class="[^"]*text-foreground/);
  });

  it("reads its hues from the status vocabulary rather than restating them", () => {
    // The `key_links` edge: a change to D-14's recipes must reach this panel instead of leaving it
    // as a fifth place that agrees with the vocabulary by coincidence.
    expect(STATUS_TONE_RECIPES.positive.icon).toBe("text-success");
    expect(STATUS_TONE_RECIPES.positive.text).toBe("text-foreground");
    expect(STATUS_TONE_RECIPES.neutral.icon).toBe("text-muted-foreground");
  });

  it("leaves `bg-success` to the ONE glyph-only marker Phase 10 pinned", () => {
    const inScope = TREE.bgSuccess.filter((site) =>
      BG_SUCCESS_SCOPE.some((prefix) => site.startsWith(prefix)),
    );
    const unlisted = inScope.filter(
      (site) => !(site.slice(0, site.lastIndexOf(":")) in ALLOWED_BG_SUCCESS),
    );
    expect(
      unlisted,
      "`bg-success` appears outside the ONE glyph-only marker Phase 10 pinned. D-14: green retreats to the ICON; the filled bg-success/text-success-foreground badge measured 3.24 and is retired by DS-10.\nUnlisted bg-success call sites: " +
        unlisted.join(", "),
    ).toEqual([]);
    // Positive control on the same scan: the allow-listed site is still THERE. A scan that stopped
    // seeing `bg-success` entirely would pass the absence assertion above.
    expect(
      inScope.length,
      "the scan found NO bg-success at all in src/app or src/components — the allow-listed wizard marker should be there, so the matcher has gone blind",
    ).toBe(1);
  });
});

describe("T-11-CLIENTCREEP — the pattern is still a Server Component", () => {
  it("has no `use client` directive prologue in `patterns/empty-state.tsx`", () => {
    // Structural, because the file's own header QUOTES the directive to explain that it does not
    // use one — a text count on this file returns non-zero against a correct file.
    expect(
      TREE.parsedByFile.get(PATTERN_FILE)?.isClientModule,
      "the pattern was marked `use client`. The composition adapts to the boundary; the pattern does not.",
    ).toBe(false);
  });

  it("records that two client adopters import it, which is legal and is not the same thing", () => {
    // `search-results.tsx` and `notification-bell.tsx` are both `"use client"`, so the shell is
    // compiled into their bundles. That is a bundling fact, not a boundary violation: the pattern's
    // whole transitive graph (react types, lucide-react, status-tones.ts, utils.ts) is isomorphic
    // and reaches no `server-only` module, no database and no request headers. Asserted so a future
    // reader does not "fix" it by adding a directive to the pattern.
    expect(TREE.parsedByFile.get("src/components/search/search-results.tsx")?.isClientModule).toBe(true);
    expect(
      TREE.parsedByFile.get("src/components/notifications/notification-bell.tsx")?.isClientModule,
    ).toBe(true);
  });
});

describe("self-tests — the scanner, in both directions", () => {
  it("FLAGS a raw dashed empty block", () => {
    const fixture = `
      export function Probe() {
        return (
          <div className="rounded-lg border border-dashed p-10 text-center">
            <h2 className="text-lg font-medium">No listings yet</h2>
          </div>
        );
      }
    `;
    expect(parse("probe.tsx", fixture).dashedLines).toHaveLength(1);
  });

  it("does NOT flag a surface that composes the shell", () => {
    const fixture = `
      import { EmptyState } from "@/components/patterns/empty-state";
      export function Probe() {
        return <EmptyState icon={X} titleAs="h2" title="No listings yet" body="One sentence." actions={null} />;
      }
    `;
    const parsed = parse("probe.tsx", fixture);
    expect(parsed.dashedLines).toEqual([]);
    expect(parsed.importsPattern).toBe(true);
    expect(parsed.emptyStateSites).toHaveLength(1);
    expect(parsed.emptyStateSites[0]?.title).toBe("No listings yet");
    expect(parsed.emptyStateSites[0]?.titleAs).toBe("h2");
    expect(parsed.emptyStateSites[0]?.tone).toBe(null);
  });

  it("does NOT flag `border-dashed` mentioned in a line comment", () => {
    // The eleven-times-repeated collision, pinned. Every converted call site in plan 11-16 carries a
    // comment explaining the shell it replaced.
    const fixture = `
      // The old block was border-dashed p-10; the pattern owns the geometry now.
      export const x = 1;
    `;
    expect(parse("probe.ts", fixture).dashedLines).toEqual([]);
  });

  it("does NOT flag `border-dashed` mentioned in a block comment", () => {
    const fixture = `
      /* border-dashed reads --border, a declared decorative exclusion. bg-success is illegal as text. */
      export const x = 1;
    `;
    const parsed = parse("probe.ts", fixture);
    expect(parsed.dashedLines).toEqual([]);
    expect(parsed.bgSuccessLines).toEqual([]);
  });

  it("matches `border-dashed` as a CLASS TOKEN, not as a substring", () => {
    const responsive = `export const c = "sm:border-dashed";`;
    expect(parse("probe.ts", responsive).dashedLines).toHaveLength(1);
    const lookalike = `export const c = "border-dashedish";`;
    expect(parse("probe.ts", lookalike).dashedLines).toEqual([]);
  });

  it("resolves the LOCAL binding, so an alias is seen and a look-alike is not", () => {
    const aliased = `
      import { EmptyState as Blank } from "@/components/patterns/empty-state";
      export const P = () => <Blank title="x" body="y" actions={null} tone="positive" />;
    `;
    const parsedAlias = parse("probe.tsx", aliased);
    expect(parsedAlias.emptyStateSites).toHaveLength(1);
    expect(parsedAlias.emptyStateSites[0]?.tone).toBe("positive");

    const impostor = `
      import { EmptyState } from "@/components/somewhere/else";
      export const P = () => <EmptyState title="x" body="y" actions={null} />;
    `;
    const parsedImpostor = parse("probe.tsx", impostor);
    expect(parsedImpostor.importsPattern).toBe(false);
    expect(parsedImpostor.emptyStateSites).toEqual([]);
  });

  it("reads the directive prologue structurally, not by counting the string", () => {
    const client = `"use client";\nexport const x = 1;`;
    expect(parse("probe.ts", client).isClientModule).toBe(true);
    const explains = `// This file has no "use client" directive, deliberately.\nexport const x = 1;`;
    expect(parse("probe.ts", explains).isClientModule).toBe(false);
  });
});
