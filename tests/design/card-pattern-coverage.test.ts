// DS-11 / AC#25 — "every card surface in the app renders one of three declared containers", turned
// from a review instruction into a test.
//
// DS-11's first clause ("three named card patterns exist") was closed by plan 11-08 and is checkable
// by `ls`. Its SECOND clause is the one that decays: nothing stops plan 11-19, or Phase 12, or a
// hotfix, from hand-rolling a fourth boxed shape — and "a fourth container is a scope alarm" is only
// an alarm if something rings. This file is the bell, and it rings in BOTH directions:
//
//   FORWARD  — every surface the UI-SPEC names as an adopter actually composes the pattern it was
//              assigned. Catches an adoption that got reverted, half-done, or never done.
//   INVERSE  — every `<Card>` rendered outside `src/components/patterns/**` is on a named, reasoned
//              allow-list. Catches the fourth shape: a NEW file that boxes something by hand.
//
// The inverse direction is the one that does the real work. A forward-only gate is satisfied by a
// tree where all twelve named surfaces adopted AND somebody added a thirteenth container yesterday.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS AN AST IMPORT/JSX SCAN AND NOT A GREP
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Phase 11 has now been tripped NINE times by a prescribed text grep that a correct file's own
// explanation satisfies — 11-08's `lg:top-8`, 11-09's `vh]`, 11-11's `ring-offset`, 11-12's
// `<Suspense>`, and, as the ninth, plan 11-13's own `grep -c "attention\|destructive"` criterion on
// `(host)/host/page.tsx`. That one is worth the extra sentence because it took TWO passes: the count
// went 1 → 2 when a comment explained which tone was refused, and stayed at 2 after a first fix that
// quoted the SHIPPED sentence it was paraphrasing. A comment cannot safely mention either half of the
// string its own file is grepped for. Both halves here are therefore structural:
//
//   • FORWARD asks the AST "does this module have an ImportDeclaration whose specifier is
//     `@/components/patterns/panel-card` and whose named bindings include `PanelCard`". A file that
//     merely MENTIONS `PanelCard` in a comment — as `price-breakdown.tsx` now does, at length —
//     does not satisfy it.
//   • INVERSE resolves the LOCAL BINDING first: it collects the local names imported as `Card` from
//     `@/components/ui/card`, then looks for JSX opening elements whose tag is one of those names.
//     A `<Card>` from some other module, a `Card` type annotation, and the word "Card" in prose are
//     all invisible to it, and an aliased `import { Card as Box }` is NOT.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — FOUR PROBES, ALL RUN. 14 August 2026. GREEN IS 11 PASSED.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A gate that has never been watched failing is not a gate (`tests/design/infra.test.ts:5-9`).
// Command for all four: `npx vitest run --config vitest.design.config.ts
// tests/design/card-pattern-coverage.test.ts`
//
//   (a) FORWARD — AN ADOPTER REVERTED. `src/components/host/payout-summary.tsx` restored from
//       `git show 2fe2ddd:…` to the raw `<Card><CardContent className="space-y-1 p-6">` it shipped
//       before plan 11-13. **3 failed / 8 passed** — all three real assertions, on one edit:
//
//         AssertionError: a surface the 11-UI-SPEC names as a card adopter does not compose the
//         pattern it was assigned. …: expected [ Array(1) ] to deeply equal []
//         +   "src/components/host/payout-summary.tsx — expected `panel-card`, which means importing
//         +    { PanelCard } from \"@/components/patterns/panel-card\"; the module imports nothing
//         +    from @/components/patterns/",
//
//         AssertionError: a `<Card>` is rendered outside `src/components/patterns/**` by a file that
//         is not on ALLOWED_RAW_CARD. … Unlisted raw `<Card>` call sites:
//         src/components/host/payout-summary.tsx:24, src/components/host/payout-summary.tsx:32:
//         expected [ …(2) ] to deeply equal []
//
//         AssertionError: the adopted surfaces stopped composing their patterns: expected
//         [ Array(9) ] to deeply equal [ …(10) ]
//
//       That all three fire together on ONE edit is the property worth having: an adoption cannot be
//       undone in a way that satisfies the gate from any direction. Restored → 11 passed.
//
//   (b) INVERSE — THE FOURTH SHAPE, AND THE ONE THE FORWARD HALF CANNOT SEE. A brand-new
//       `src/components/host/gsd1113-probe-stat-card.tsx` containing
//       `import { Card, CardContent } from "@/components/ui/card"` and a `<Card className="p-6">` —
//       i.e. exactly the "just one more little boxed thing" edit DS-11 exists to notice.
//       **1 failed / 10 passed**, and the FORWARD half stayed green throughout, because all twelve
//       named surfaces were still perfectly correct. That is the entire argument for having an
//       inverse half:
//
//         AssertionError: a `<Card>` is rendered outside `src/components/patterns/**` by a file that
//         is not on ALLOWED_RAW_CARD. DS-11 says THREE card containers; a fourth boxed shape is a
//         scope alarm, not a style preference. … Unlisted raw `<Card>` call sites:
//         src/components/host/gsd1113-probe-stat-card.tsx:5: expected [ Array(1) ] to deeply equal []
//
//       File deleted → 11 passed.
//
//   (c) VACUITY — THE INVENTORY EMPTIED. `CARD_SURFACES` replaced with `[]` (the declarations kept
//       alive under an unused binding so the probe measured the EMPTY INVENTORY and not a compile
//       error), which is what a future "clean-up" of a gate nobody understands looks like.
//       **2 failed / 9 passed — AND BOTH REAL ASSERTIONS PASSED**, because `toEqual([])` is satisfied
//       perfectly by a list nothing was ever added to. Only guard-the-guard and the positive control
//       fired:
//
//         AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three
//         `Replaces` lists describe. A coverage gate whose inventory silently emptied passes every
//         one of its own assertions.: expected +0 to be 12
//         AssertionError: expected [] to have a length of 10 but got +0
//
//       Same shape plan 11-02's probe (d) and `sticky-offset.test.ts`'s probe (c) measured. It is why
//       the guards are asserted FIRST and why the positive control exists. Restored → 11 passed.
//
//   (d) VACUITY — THE SCANNER BLINDED. `SRC_DIR` re-pointed at `src-nope`, so the walk opens nothing.
//       **5 failed / 6 passed.** The FORWARD half reports all twelve surfaces as un-adopted rather
//       than reporting a clean tree, and the allow-list's own existence check names the first file it
//       can no longer find:
//
//         AssertionError: the scanner walked 0 files. Both real assertions in this file are "a list
//         was empty", and a scan that opened nothing satisfies them perfectly.: expected 0 to be
//         greater than or equal to 50
//         AssertionError: expected [] to include 'src/components/booking/reserve-view.t…'
//         AssertionError: ALLOWED_RAW_CARD names src/app/(auth)/login/page.tsx, which the walk never
//         found: expected false to be true
//         AssertionError: a surface the 11-UI-SPEC names as a card adopter does not compose the
//         pattern it was assigned. …: expected [ …(12) ] to deeply equal []
//         AssertionError: the adopted surfaces stopped composing their patterns: expected [] to
//         deeply equal [ …(10) ]
//
//       THE INVERSE HALF PASSED ON NOTHING, exactly as an absence assertion over an empty scan must —
//       which is the whole reason it is not the only assertion in the file. Reverted → 11 passed.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • THIS GATE PROVES THE CONTAINER, NOT THE RENDERING. It knows that `search-result-card.tsx`
//     imports `ResultCard`; it cannot tell you the component was handed the wrong `meta` order, an
//     empty `price`, or a `title` that should have been a heading. Nothing here renders anything. The
//     rendered assertions live in the per-component suites and in plan 11-21's Playwright pass.
//   • IT SAYS NOTHING ABOUT SURFACES PHASES 12–15 ADD. `CARD_SURFACES` is the inventory the
//     11-UI-SPEC's three `Replaces` lists name, and those lists describe the tree as it stood in
//     August 2026. A Phase-12 checkout redesign that introduces two new panels is expected to EXTEND
//     this inventory in its own commit — that is the gate working, not the gate being wrong.
//   • IT ONLY POLICES THE `Card` CONTAINER, not `CardHeader` / `CardContent` / `CardFooter`. A file
//     could import `CardContent` alone and use it as a padding box with no `Card` around it. That is
//     a weird enough shape to be worth a review comment rather than a rule, and policing it would
//     flag every legitimate composition inside `patterns/`.
//   • A RAW `<div className="bg-card ring-1 rounded-xl">` IS INVISIBLE HERE. Somebody determined to
//     ship a fourth container can hand-roll one without touching `ui/card.tsx` at all. `leak.test.ts`
//     and `elevation-z.test.ts` police the token-level half of that; this file polices the component
//     -level half. Neither alone is complete.
//   • THE ALLOW-LIST IS A LIST OF FILES, NOT OF CALL SITES. A file already on `ALLOWED_RAW_CARD` can
//     grow a sixth `<Card>` without this gate noticing. Pinning per-file COUNTS was considered and
//     rejected: it would go red on every unrelated edit to `bookings/[id]/page.tsx`, and a gate that
//     cries wolf is one people stop reading. The count IS reported in the failure message, so a
//     reviewer who wants it has it.

import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, type Dirent } from "node:fs";
import { resolve, join, relative } from "node:path";
import ts from "typescript";

import { SELECTOR_IDS } from "@/lib/design/selector-contract";

/** The scanned tree, as one constant — probe (d) above is a one-line edit here. */
const SRC_DIR = resolve(process.cwd(), "src");

/** The two trees the rule applies to, read as prefixes of a repo-relative label. */
const GATE_TREE = ["src/app/", "src/components/"] as const;

/** The vendored primitive whose `Card` export is the only container this gate can see. */
const UI_CARD_MODULE = "@/components/ui/card";

/** The one directory allowed to render a raw `<Card>` by PATH rather than by name. */
const PATTERNS_DIR = "src/components/patterns/";

/**
 * The three declared containers, each keyed by the id `selector-contract.ts` already owns for it.
 *
 * KEYED BY SELECTOR ID ON PURPOSE — this is the `key_links` edge plan 11-13 declares from this file
 * to `src/lib/design/selector-contract.ts`. The union below is checked against `SELECTOR_IDS` at run
 * time, so renaming `panel-card` in the contract without renaming it here is a named failure rather
 * than two files quietly describing different systems.
 */
const PATTERNS = {
  "result-card": { module: "@/components/patterns/result-card", binding: "ResultCard" },
  "row-card": { module: "@/components/patterns/row-card", binding: "RowCard" },
  "panel-card": { module: "@/components/patterns/panel-card", binding: "PanelCard" },
} as const;

type PatternId = keyof typeof PATTERNS;

type CardSurface = {
  /** Repo-relative, forward-slashed. */
  readonly file: string;
  /** The container the 11-UI-SPEC's `Replaces` list assigns to this surface. */
  readonly pattern: PatternId;
  /**
   * `"adopted"` — the file must import the pattern.
   * `"refused"` — the file must NOT, and `why` must say what was MEASURED, not what was preferred.
   *
   * A refused row is not an exemption from the rule; it is the rule's second outcome, recorded so
   * the next reader does not re-run an experiment somebody already ran. Both directions are
   * asserted, which means a future phase that legitimately makes a refused surface adoptable gets a
   * RED here and has to come and read the reason before deleting it. That is the intended cost.
   */
  readonly status: "adopted" | "refused";
  readonly why: string;
};

/**
 * THE DECLARED CARD-SURFACE INVENTORY — the twelve files the 11-UI-SPEC's three `Replaces` lists
 * name, in spec order (ResultCard 2, RowCard 5, PanelCard 5).
 *
 * Two rows are `"refused"`, and both refusals were MEASURED by plan 11-11 with an HTML parser rather
 * than argued in review. They are written up at length in the phase's `deferred-items.md`; the short
 * form is in `why` below. Do NOT resolve either by inventing a fourth container — DS-11 says three.
 *
 * Where a row's `file` differs from the spec's wording, the spec is describing a surface and this is
 * naming the module that actually owns the box. Both cases are called out in `why`.
 */
const CARD_SURFACES: readonly CardSurface[] = [
  // ─── ResultCard — 11-UI-SPEC § ResultCard `Replaces` ────────────────────────────────────────────
  {
    file: "src/components/search/search-result-card.tsx",
    pattern: "result-card",
    status: "adopted",
    why: "The marketplace tile. Adopted by plan 11-11; the whole-card link, the hover pair and the AspectRatio wrapper all moved into the pattern.",
  },
  {
    file: "src/components/listing/listing-card.tsx",
    pattern: "result-card",
    status: "refused",
    why:
      "MEASURED REFUSAL (plan 11-11, jsdom's real HTML parser). It is a MANAGEMENT tile: its CardFooter " +
      "carries an Edit link, an Availability link and two ConfirmDialog buttons, and ResultCard wraps the " +
      "whole card in one <Link>. Fed that markup the adoption-agency algorithm reports `anchors parsed: 6` " +
      "and `outer anchor child count: 0` — the tile stops being a link at all. A `footer` prop cannot fix " +
      "it: the footer must be inside Card and outside Link, which needs Card as the OUTER element, which " +
      "kills `group-hover:` because the group must be an ANCESTOR. This is a UI-SPEC correction, not a " +
      "coding task — see deferred-items.md [11-11].",
  },

  // ─── RowCard — 11-UI-SPEC § RowCard `Replaces` ──────────────────────────────────────────────────
  {
    file: "src/components/booking/booking-row.tsx",
    pattern: "row-card",
    status: "adopted",
    why: "The booker's bookings list row. Adopted by plan 11-11; the overlay-link form and the DS-05 exception now live in the pattern.",
  },
  {
    file: "src/components/host/host-booking-row.tsx",
    pattern: "row-card",
    status: "adopted",
    why: "The host's bookings list row — the same container as the booker's, which is the point of extracting one.",
  },
  {
    file: "src/components/host/request-row.tsx",
    pattern: "row-card",
    status: "adopted",
    why: "The host request inbox row. Terminal (no href), which is what forced RowCard's href to become optional in plan 11-11.",
  },
  {
    file: "src/components/host/payout-row.tsx",
    pattern: "row-card",
    status: "adopted",
    why: "The earnings payout row. Also terminal, and also has no thumbnail — the pair that forced `media` to be optional as a whole box.",
  },
  {
    file: "src/components/notifications/notification-item.tsx",
    pattern: "row-card",
    status: "refused",
    why:
      "MEASURED REFUSAL (plan 11-11), on four independent grounds: (1) its `href` is nullable BY SECURITY " +
      "DESIGN — `safeHref` refuses `javascript:` / `data:` / protocol-relative and degrades to " +
      "non-navigable content, so satisfying a required href means fabricating a destination; (2) it is not " +
      "a card — it is a `divide-y` row inside a `PopoverContent p-0`, where 20 ringed rounded boxes is a " +
      "regression; (3) unread state is a tint on the ROW root plus a 2px dot rail, and RowCard exposes no " +
      "root className; (4) `onSelect` must ride on the link, and the pattern's Link takes no handler. " +
      "Forcing it would produce a fourth container wearing the third one's name.",
  },

  // ─── PanelCard — 11-UI-SPEC § PanelCard `Replaces` ──────────────────────────────────────────────
  {
    file: "src/app/listings/[id]/(detail)/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "The listing page's sticky booking rail. Adopted by plan 11-13 with `sticky` as a BOOLEAN, which is " +
      "what moved the 80px offset out of this file — see sticky-offset.test.ts, whose pinned count went " +
      "3 → 1 in the same commit.",
  },
  {
    file: "src/components/booking/reserve-view.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE SPEC SAYS `booking/price-breakdown.tsx`'s CONTAINER, AND THIS IS IT. `price-breakdown.tsx`'s " +
      "own root is a bare `<div className=\"space-y-3\">` and always has been; the box that gives it a " +
      "background, radius, ring and padding is the checkout rail here, and `<PriceBreakdown>` has exactly " +
      "one call site, which renders it into this rail. Boxing the breakdown inside its own file would have " +
      "nested two cards and paid the block padding twice. This was also the SECOND shipped `lg:sticky` " +
      "site, which is why it is a plan 11-13 surface at all.",
  },
  {
    file: "src/components/host/payout-summary.tsx",
    pattern: "panel-card",
    status: "adopted",
    why: "The two earnings summary figures. Container swap ONLY — HFLOW-05 is deliberately a token pass, because those numbers have never been real (PayMongo /v2 is sales-gated).",
  },
  {
    file: "src/components/group/invite-card.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "The invite route's `InviteCard` shell, which every one of that route's states renders inside. " +
      "Copy, RSVP behaviour and the noindex/no-referrer metadata were untouched by 11-13's swap. THE " +
      "ROW MOVED IN PLAN 11-19, WITH THE COMPONENT, and it moved for the reason the forward half's " +
      "failure message names: `InviteCard` was module-private inside " +
      "`src/app/(public)/invite/[token]/page.tsx` until that plan added a not-found boundary beside " +
      "the page which must render a byte-identical inactive surface (T-11-ORACLE). Two files that " +
      "have to keep looking alike is a security property maintained by policy; one component with two " +
      "call sites is one maintained by construction. The page still renders the shell — it imports it " +
      "now instead of declaring it.",
  },
  {
    file: "src/components/host/host-signals.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "The hours-missing notice, as `tone=\"muted\"`. The spec says \"the hours-missing notices\", plural; " +
      "an AST scan for the three HOURS_MISSING_* constants finds exactly two sites and only this one is a " +
      "PANEL. The other, `listing/listing-card.tsx:210`, is an inline meta line inside a tile's " +
      "CardContent — a card inside a card is not what the clause means. " +
      "THE ROW MOVED IN PLAN 14-08, WITH THE NOTICE, exactly as `invite-card.tsx`'s did in 11-19 and " +
      "for the same reason: the notice was declared inline in `src/app/(host)/host/page.tsx` until " +
      "D-140 turned that page into a today view, at which point the three signal rows — requests owed, " +
      "payout state, published-without-hours — became one component rendered below the agenda. The " +
      "dashboard still renders this panel; it composes `HostSignals` now instead of assembling it. The " +
      "second `PanelCard` in that component is the requests-owed advisory, which is the SAME declared " +
      "surface at the same tone and therefore adds no row — this inventory declares files, not sites.",
  },

  // ─── Phase 13 — the surface the 11-UI-SPEC could not name, because it did not exist in this shape ──
  {
    file: "src/app/(app)/bookings/[id]/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE BOOKING DETAIL PAGE, AND IT ARRIVES HERE FROM THE ALLOW-LIST RATHER THAN FROM THE UI-SPEC. " +
      "Its row said Phase 13's redesign owned the container decision and that a swap should not " +
      "pre-empt it. Plan 13-10 is that redesign, and the decision it took is the one this half exists " +
      "to record: every branch's outer `<Card>` is GONE, and the page is a stack of PanelCards on the " +
      "page ground. The outer card had to go rather than merely gain panels inside it — a `PanelCard` " +
      "nested in a container that already supplies `bg-card ring-1 rounded-xl` pays the block padding " +
      "twice (112px against 80px, this file's own header records the measurement for the row card's " +
      "twin of the problem). Its ALLOWED_RAW_CARD row was DELETED in the same commit, so the inverse " +
      "half now polices this file too: a raw `<Card>` reappearing here is a failure rather than an " +
      "exemption, which a stale allow-list row would have made it permanently (13-08's finding — an " +
      "allow-list row exempts a file in BOTH directions, forever).",
  },

  // ─── Phase 14 — HFLOW-04 / D-155, the exemptions 11-13 held open for this phase ────────────────────
  {
    file: "src/components/availability/weekly-hours-editor.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE WEEKLY-HOURS EDITOR'S TWO BOXES, AND THIS ROW ARRIVES FROM THE ALLOW-LIST RATHER THAN FROM " +
      "THE 11-UI-SPEC — the second instance of the transition `bookings/[id]/page.tsx` made above, and " +
      "for the same recorded reason. Its exemption said HFLOW-04 was structural and that Phase 14 would " +
      "decide the container; D-155 is that decision and plan 14-12 spent it. The advisory box is now " +
      "`tone=\"muted\"` and the seven-day editor is the default tone, with the dividing rule kept on the " +
      "LIST inside the panel rather than on the panel — the pattern takes no class name, and the rule " +
      "between day rows is a property of the rows. Its ALLOWED_RAW_CARD row was DELETED in the same " +
      "commit, so the inverse half polices this file now: a raw `<Card>` reappearing here is a failure " +
      "rather than an exemption, which a stale row would have made it permanently (13-08's finding). " +
      "The advisory is NOT an `EmptyState` and that is a considered call rather than an oversight: the " +
      "seven day rows always render, so it is an advisory about a form that is fully present, not the " +
      "absence of a list. `blocks-editor.tsx` beside it kept its exemption until plan 14-13, the plan " +
      "that owns it, took the row and declared the file below — the sentence that used to stand here " +
      "said the exemption was still open, and leaving it would have been this inventory describing a " +
      "list it no longer has.",
  },
  {
    file: "src/components/availability/week-strip.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE WEEK-AT-A-GLANCE PREVIEW (HFLOW-04 · D-152), AND IT IS A ROW BECAUSE THE BOX MOVED — the " +
      "same bookkeeping `invite-card.tsx`'s row records from 11-19 and `host-signals.tsx`'s from 14-08. " +
      "14-UI-SPEC puts this panel on the hours editor's own site list, but the strip is a component of " +
      "its own, so the file that actually renders the box is this one and this inventory declares files. " +
      "It carries the strip's title and gives the muted track a card ground to be visible against, which " +
      "is why it is the default tone and not the muted one the advisory above uses — a muted fill on a " +
      "muted panel is an empty column nobody can see. Declared rather than left to the inverse half " +
      "alone: the inverse half only notices a raw box, so a strip that quietly stopped composing the " +
      "pattern and hand-rolled its own container would pass it, and the forward half is what catches " +
      "that.",
  },
  {
    file: "src/components/availability/blocks-editor.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE BLOCKED-DATES LIST, AND THIS ROW COMPLETES THE PAIR — the second and last of the two " +
      "exemptions `11-13-SUMMARY.md:234-235` held open for HFLOW-04, spent by plan 14-13 exactly as " +
      "14-12 spent the first. The dense date list is ONE panel's contents rather than N row cards: a " +
      "row card is a card per item, and twenty ringed boxes for twenty blocked dates is the shape the " +
      "`divide-y` list already refused. The dividing rule stays on the LIST inside the panel — the " +
      "pattern takes no class name, and the rule between date rows is a property of the rows. Its " +
      "ALLOWED_RAW_CARD row was DELETED in the same commit, so the inverse half polices this file now: " +
      "a raw `<Card>` reappearing here is a failure rather than an exemption, which a stale row would " +
      "have made it permanently (13-08's finding). The file's OTHER box went the other way and is not " +
      "this row's business: the no-blocked-dates absence is a genuine empty LIST and took " +
      "`EmptyState`, which `empty-state-adoption.test.ts` declares in the same commit.",
  },

  // ─── Phase 15 — the four auth screens (AUTHUI-01 · AUTHUI-03 · 15-CONTEXT D-162) ──────────────────
  //
  // FOUR ROWS ARRIVE HERE FROM THE ALLOW-LIST, which is the third and largest instance of the
  // transition `bookings/[id]/page.tsx` made in 13-10 and the two availability editors made in
  // 14-12/14-13. All four exemptions said the same thing in four different sentences — *Phase 15 owns
  // login/signup/forgot/reset as one designed set, so its box changes when the set does* — and 15-UI-SPEC
  // § The Auth Composition is that decision, taken with the whole surface in front of it.
  //
  // NO `AuthCard` PATTERN WAS EXTRACTED, and the refusal is the allow-list rows' own argument honoured
  // rather than overruled. Their warning was that satisfying this gate by inventing a fourth boxed shape
  // would be worse than the exemption; DS-11 says three containers. What makes the four screens one
  // composition is four `PanelCard` call sites sharing ONE layout (`(auth)/layout.tsx`, plan 15-06) —
  // same ground, same column width, same wordmark, same heading role, one coral each.
  //
  // ONE ROW PER FILE, FOUR FILES, and each carries the two facts a reader needs: that the card is now
  // the pattern, and that the `<h1>` these documents previously did not have at all is the pattern's
  // own title at `titleAs="h1"` (`CardTitle` is a `<div>`; before plan 15-07 no auth document had a
  // heading element anywhere in it).
  {
    file: "src/app/(auth)/login/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE LOGIN CARD, ARRIVING FROM THE ALLOW-LIST (plan 15-07). Its exemption said the 11-UI-SPEC lists " +
      "none of the four auth screens under a `Replaces` line and that extracting an auth-card pattern from " +
      "Phase 11 would be inventing a fourth shape to satisfy a gate — both halves still true, and neither " +
      "is what happened: the page composes the THIRD declared container, and the composition lives in the " +
      "route group's layout rather than in a new component. The pattern supplies the document's `<h1>` via " +
      "`titleAs=\"h1\"`, the widening plan 15-06 made for exactly this call. Its ALLOWED_RAW_CARD row was " +
      "DELETED in the same commit, so the inverse half polices this file now — a raw `<Card>` reappearing " +
      "here is a failure rather than an exemption, which a stale row would have made it permanently " +
      "(13-08's finding).",
  },
  {
    file: "src/app/(auth)/forgot-password/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE RESET-REQUEST CARD (plan 15-07), converted in the same commit as login for the reason its own " +
      "exemption gave: AUTHUI-03 requires all four auth screens to hold the same five gates, which is an " +
      "argument for designing them together rather than swapping one container at a time. Both of its " +
      "branches — the form and the post-submit uniform sentence that REPLACES it — render inside this one " +
      "panel, so the `<h1>` is present in both, which is the property that made the conversion worth doing " +
      "on a one-field screen. GATE-NOREG #2: the branching and the sentence are byte-identical across the " +
      "swap; this row asserts a container, never a state machine. Its ALLOWED_RAW_CARD row was DELETED in " +
      "the same commit (13-08's finding, as above).",
  },
  {
    file: "src/app/(auth)/signup/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE ACCOUNT-CREATION CARD (plan 15-07). Its exemption said pattern-ising the four auth cards " +
      "together was Phase 15's call rather than plan 11-13's, and this row is that call recorded: the " +
      "container is the pattern, the heading is the pattern's title at `titleAs=\"h1\"`, and the " +
      "book/host intent radio group its exemption named as the complication is UNTOUCHED — it keeps the " +
      "neutral control fill (D-21) rather than gaining the accent, because a selected intent is a choice " +
      "already made and not the action the page is asking for. GATE-NOREG #5: `intent` still posts to the " +
      "`signup` server action and the capability flags stay server-assigned; this row asserts a " +
      "container, never a trust boundary. Its ALLOWED_RAW_CARD row was DELETED in the same commit " +
      "(13-08's finding — an allow-list row exempts a file in BOTH directions, permanently).",
  },
  {
    file: "src/app/(auth)/reset-password/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "THE TOKEN-BEARING CARD, AND THE FOURTH AND LAST OF THE AUTH EXEMPTIONS (plan 15-07). Its row said " +
      "\"its box changes when the set does\"; the set changed in two commits and this is the second. The " +
      "panel sits OUTSIDE the Suspense boundary on purpose, which is what makes the `<h1>` present in " +
      "all three of that document's states — the token-read fallback, the missing-token notice and the " +
      "form — rather than appearing and disappearing as the token resolves. GATE-NOREG #4: the hidden " +
      "token input, `resetSchema`, the `newPassword` mapping and the `/login?reset=1` redirect are " +
      "unchanged. Its ALLOWED_RAW_CARD row was DELETED in the same commit, which EMPTIES the Phase-15 " +
      "block below — the second block in this file to be kept as a comment that says why it is empty.",
  },
];

/**
 * How many rows the inventory has. Pinned SEPARATELY from every assertion over it, because probe (c)
 * measured that an emptied inventory satisfies both real assertions perfectly.
 *
 * TWELVE was ResultCard's 2 + RowCard's 5 + PanelCard's 5 — the 11-UI-SPEC's three `Replaces` lists
 * counted. A change to this number should arrive with a change to those lists, or with the phase that
 * adds the surface.
 *
 * THIRTEEN since plan 13-10, and it is the second case rather than the first: `bookings/[id]/page.tsx`
 * moved OFF `ALLOWED_RAW_CARD` and ONTO the inventory in one commit, which is the transition the
 * allow-list's own preamble describes ("a list of files whose boxes have not been pattern-ised YET,
 * each with the phase whose scope note claims the surface"). Phase 13 claimed it and pattern-ised it.
 *
 * FIFTEEN since plan 14-12, and the two rows arrive by the two different routes this inventory has:
 * `weekly-hours-editor.tsx` made the same allow-list → inventory move (D-155 spent the exemption
 * `11-13-SUMMARY.md:234-235` held open for HFLOW-04), and `week-strip.tsx` is a surface that did not
 * exist when the 11-UI-SPEC's three `Replaces` lists were written. The header's "SAYS NOTHING ABOUT
 * SURFACES PHASES 12–15 ADD" note is the standing instruction for the second kind: a new panel EXTENDS
 * this inventory in its own commit.
 *
 * SIXTEEN SINCE PLAN 14-13, and the sixteenth is the allow-list → inventory move again:
 * `blocks-editor.tsx` was the SECOND of the two rows `11-13-SUMMARY.md:234-235` held open for this
 * phase, and D-155 is now spent in full — neither availability editor is on the allow-list any more.
 * Both halves of that transition landed in one commit, which is the rule 13-08's finding makes
 * necessary rather than tidy: an allow-list row exempts a file in BOTH directions, permanently, so a
 * row left behind after a conversion licenses the next box somebody adds to a file that was just
 * pattern-ised.
 *
 * EIGHTEEN SINCE PLAN 15-07, and the pair is the allow-list → inventory move a third time — the
 * transition this list has now made five times in three phases (13-10, 14-12, 14-13, and the two
 * here). `login/page.tsx` and `forgot-password/page.tsx` compose `PanelCard` and their exemptions are
 * gone from the block below, in the same commit as the conversions.
 *
 * THE RED WAS WATCHED BEFORE THIS NUMBER MOVED, which is the procedure the whole pairing depends on.
 * With the two rows added and this constant still reading 16, the gate said, verbatim:
 *
 *   AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three
 *   `Replaces` lists describe. A coverage gate whose inventory silently emptied passes every one of
 *   its own assertions.: expected 18 to be 16 // Object.is equality
 *
 * and the positive half beside it said `expected [ … ] to have a length of 14 but got 16`. Both are
 * the pin doing its job. A number moved first would have made the conversion unfalsifiable.
 *
 * TWENTY SINCE THAT PLAN'S SECOND TASK, which converted `signup/page.tsx` and
 * `reset-password/page.tsx` and EMPTIED the Phase-15 allow-list block — all four auth pages are
 * declared surfaces now and none of them is exempt from the inverse half any more. Its red was
 * watched the same way, with the two rows in and this constant still reading 18:
 *
 *   AssertionError: the declared card-surface inventory is not the size the UI-SPEC's three
 *   `Replaces` lists describe. A coverage gate whose inventory silently emptied passes every one of
 *   its own assertions.: expected 20 to be 18 // Object.is equality
 *
 * and beside it `expected [ … ] to have a length of 16 but got 18`.
 *
 * IT REACHES 21 IN PLAN 15-08, when `profile-form.tsx` joins. It is deliberately left at 20 here:
 * moving a count ahead of the rows that justify it is the one thing this file's procedure forbids,
 * and 15-08's own commit is where that row and that number belong together.
 */
const EXPECTED_SURFACES = 20;

/**
 * EVERY FILE OUTSIDE `patterns/` ALLOWED TO RENDER A RAW `<Card>`, WITH THE REASON AND THE PHASE
 * THAT OWNS IT.
 *
 * This is not a list of files that are *fine*; it is a list of files whose boxes have not been
 * pattern-ised YET, each with the phase whose scope note claims the surface. It is deliberately
 * enumerated rather than expressed as a directory rule: a directory rule grows silently, and the
 * whole value of this half is that a NEW file cannot join without somebody writing a sentence.
 *
 * Enumerated by an AST scan rather than by reading the UI-SPEC — 15 files, 22 call sites at the time
 * of writing. Every plan in Phase 11 that trusted its own surface inventory found it wrong.
 */
const ALLOWED_RAW_CARD: Readonly<Record<string, string>> = {
  // ── Phase 15 — Auth, Profile & Transactional Email (AUTHUI-01..03) ────────────────────────────
  //
  // TWO ROWS LEFT THIS BLOCK IN PLAN 15-07, IN THE COMMIT THAT CONVERTED THEIR FILES.
  // `login/page.tsx` and `forgot-password/page.tsx` are declared `panel-card` surfaces above and
  // neither renders a raw `<Card>` any more. Their exemptions were the two whose sentences said the
  // 11-UI-SPEC names no auth screen under a `Replaces` line, and that AUTHUI-03's five-gates
  // criterion is an argument for designing the four screens together rather than swapping one
  // container at a time. 15-UI-SPEC § The Auth Composition is that design, and the two rows above
  // record what it decided — the pattern, not a fourth shape.
  //
  // THE DELETIONS ARE NOT A TIDY-UP, and this block is now the third place that sentence is written.
  // 13-08's finding is that an allow-list row exempts a file in BOTH directions, permanently: a row
  // surviving its own conversion goes on licensing the next box somebody hand-rolls in a file that
  // had just been pattern-ised, and the inverse half stays green over it forever. The rule the Phase
  // 14 block below leaves behind is the pairing — a conversion and its row deletion are ONE commit —
  // and it was watched go red here before the count moved.
  //
  // THE OTHER TWO LEFT IN THE SECOND COMMIT OF THE SAME PLAN. `signup/page.tsx` and
  // `reset-password/page.tsx` are declared `panel-card` surfaces above too, so THIS BLOCK IS NOW
  // EMPTY — the second block in this file that is, after Phase 14's. It is kept as a comment rather
  // than removed with its rows for the reason that one gives: an empty section that says why it is
  // empty is what stops the next Phase-15 surface quietly re-opening it. The profile page's box is
  // plan 15-08's and joins the inventory above in its own commit; it does not come back here.
  //
  // WHAT THE FOUR DELETIONS BUY, stated once: the inverse half now polices all four auth pages. A
  // raw `<Card>` reappearing in any of them is a failure rather than an exemption — which is exactly
  // what a surviving row would have made it, permanently and in both directions.

  // ── Phase 13 — Confirmation, Bookings & Trust (owns /bookings/** and the group surfaces) ───────
  //
  // FOUR ROWS LEFT THIS BLOCK IN PLAN 13-10, AND THE DELETION IS THE POINT RATHER THAN THE TIDY-UP.
  // `bookings/[id]/page.tsx` (now a declared `panel-card` surface above), `expired-approval-state.tsx`
  // (13-10 removed its outer card), `payment-reversed-state.tsx` (13-04) and `pending-payment-state.tsx`
  // (13-07) render no raw `<Card>` at all any more. A row for a file with no card left is not harmless:
  // 13-08's finding is that an allow-list row exempts a file in BOTH directions, permanently — so the
  // row would have gone on quietly licensing the next raw box somebody added to those files, and the
  // inverse half would have stayed green over it forever.
  //
  // THREE STALE ROWS REMAIN BELOW ON PURPOSE — `cancel/page.tsx`, `group/page.tsx` and
  // `attendee-roster.tsx` also render no raw card today, but this plan touches none of those files and
  // deleting an exemption for a surface you have not read is how a gate acquires a hole nobody meant.
  // Recorded here so the plans that own those surfaces (13-12 / 13-13 / 13-14) find it rather than
  // re-derive it.
  "src/app/(app)/bookings/[id]/cancel/page.tsx":
    "The cancel confirmation, including the refund-ladder box. Phase 13 (TRUST-04 / STATE-05 — a refund amount is explicitly an in-page alert, never a toast), so its boxes are decided there.",
  "src/app/(app)/bookings/[id]/group/page.tsx":
    "The organizer's group management page. Phase 13's scope note folds the group surfaces in by name.",
  "src/components/group/attendee-roster.tsx":
    "The RSVP roster rendered by the group page above. Same phase, same reason; it is also a candidate for RowCard rather than a panel, and guessing which in a container-swap plan is how a pattern gets adopted wrongly.",
  "src/components/booking/hold-expired-state.tsx":
    "Same family, but reached from CHECKOUT (`listings/[id]/book`) as well as from the reversed state — so it straddles Phase 12 and Phase 13. Deliberately not swapped by plan 11-13, which was scoped to container-only edits on surfaces the spec names.",

  // ── Phase 14 — Host Tooling: THIS BLOCK IS EMPTY, AND THAT IS THE RECORD OF D-155 BEING SPENT ──
  //
  // TWO ROWS LEFT THIS BLOCK, ONE PER PLAN, EACH IN THE COMMIT THAT CONVERTED ITS FILE.
  // `weekly-hours-editor.tsx` left in plan 14-12 and `blocks-editor.tsx` left in plan 14-13; both are
  // declared `panel-card` surfaces above and neither renders a raw `<Card>` any more. Those were the
  // two exemptions `11-13-SUMMARY.md:234-235` held open for exactly this phase, because HFLOW-04 is
  // structural — D-155 is the decision that spends them and it is now spent in full.
  //
  // NEITHER DELETION WAS A TIDY-UP. 13-08's finding is that an allow-list row exempts a file in BOTH
  // directions, permanently: a row surviving its own conversion would go on licensing the next box
  // somebody hand-rolls in a file that had just been pattern-ised, and the inverse half would stay
  // green over it forever. The rule this block leaves behind is the pairing — a conversion and its
  // row deletion are ONE commit, and 14-12 recorded the deletion being watched go red against a
  // reintroduced raw box rather than trusting that it would.
  //
  // The block is kept as a comment rather than removed with its rows: an empty section that says why
  // it is empty is what stops the next Phase-14 surface quietly re-opening it.

  // ── Phase 11's own measured refusal ───────────────────────────────────────────────────────────
  "src/components/listing/listing-card.tsx":
    "The measured refusal above, from the other direction: the host management tile keeps its raw Card BECAUSE ResultCard's whole-card <Link> shatters its footer into six anchors. Listed here so the inverse half does not report a file the forward half already explains.",
};

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

type Parsed = {
  /**
   * Every named import in the module, as `moduleSpecifier` → set of IMPORTED names (the name on the
   * left of `as`, i.e. what the module exports). This is what the FORWARD half asks.
   */
  readonly imports: ReadonlyMap<string, ReadonlySet<string>>;
  /** Lines of every JSX opening/self-closing element whose tag resolves to `ui/card`'s `Card`. */
  readonly rawCardLines: readonly number[];
};

/**
 * Parse one module's TEXT. `(path, text)` rather than `(path)` on purpose: the self-tests below feed
 * it fixtures that are never written to disk, so the thing the real assertions run is the same code
 * path the fixtures prove (`leak.test.ts:208-212`'s rule).
 */
export function parseModule(path: string, text: string): Parsed {
  const sf = ts.createSourceFile(
    path,
    text,
    ts.ScriptTarget.Latest,
    /* setParentNodes */ true,
    path.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const imports = new Map<string, Set<string>>();
  /** LOCAL names bound to `ui/card`'s `Card` — so `import { Card as Box }` is still caught. */
  const cardLocals = new Set<string>();

  const visitImports = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const specifier = node.moduleSpecifier.text;
      const bindings = node.importClause?.namedBindings;
      if (bindings && ts.isNamedImports(bindings)) {
        const set = imports.get(specifier) ?? new Set<string>();
        for (const element of bindings.elements) {
          // `propertyName` is the EXPORTED name when the import is aliased; `name` is the local one.
          const exported = (element.propertyName ?? element.name).text;
          set.add(exported);
          if (specifier === UI_CARD_MODULE && exported === "Card") {
            cardLocals.add(element.name.text);
          }
        }
        imports.set(specifier, set);
      }
      // A default import is recorded under the specifier too, so `imports.has(module)` means "this
      // module is imported at all" regardless of binding form.
      if (node.importClause?.name) {
        const set = imports.get(specifier) ?? new Set<string>();
        set.add("default");
        imports.set(specifier, set);
      }
    }
    ts.forEachChild(node, visitImports);
  };
  visitImports(sf);

  const rawCardLines: number[] = [];
  const visitJsx = (node: ts.Node): void => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tag = node.tagName;
      if (ts.isIdentifier(tag) && cardLocals.has(tag.text)) {
        rawCardLines.push(sf.getLineAndCharacterOfPosition(node.getStart(sf)).line + 1);
      }
    }
    ts.forEachChild(node, visitJsx);
  };
  visitJsx(sf);

  return { imports, rawCardLines };
}

/** Does this module import `binding` from `module`? The FORWARD half's whole question. */
export function importsBinding(parsed: Parsed, module: string, binding: string): boolean {
  return parsed.imports.get(module)?.has(binding) === true;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// The scan, run ONCE at module level; the `it()` blocks only assert.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const walked: string[] = [];
const scanned: string[] = [];
const parsedByFile = new Map<string, Parsed>();

for (const file of collectSourceFiles(SRC_DIR)) {
  const name = label(file);
  walked.push(name);
  if (!GATE_TREE.some((prefix) => name.startsWith(prefix))) continue;
  scanned.push(name);
  parsedByFile.set(name, parseModule(name, readFileSync(file, "utf8")));
}

/** The forward half: every declared surface, checked against its assigned pattern. */
const forwardViolations: string[] = [];
for (const surface of CARD_SURFACES) {
  const parsed = parsedByFile.get(surface.file);
  const { module, binding } = PATTERNS[surface.pattern];
  if (!parsed) {
    forwardViolations.push(
      `${surface.file} — declared as a \`${surface.pattern}\` surface, but the scanner never parsed it. ` +
        `Either the file moved (update this inventory in the commit that moved it) or the walk is broken.`,
    );
    continue;
  }
  const adopts = importsBinding(parsed, module, binding);
  if (surface.status === "adopted" && !adopts) {
    const anyPattern = [...parsed.imports.keys()].filter((m) =>
      m.startsWith("@/components/patterns/"),
    );
    forwardViolations.push(
      `${surface.file} — expected \`${surface.pattern}\`, which means importing { ${binding} } from ` +
        `"${module}"; the module imports ${
          anyPattern.length ? `only ${anyPattern.join(", ")}` : "nothing"
        } from @/components/patterns/`,
    );
  }
  if (surface.status === "refused" && adopts) {
    forwardViolations.push(
      `${surface.file} — recorded as a MEASURED REFUSAL, but it now imports { ${binding} }. If the ` +
        `refusal has been overturned deliberately, change its row to "adopted" and delete the reason ` +
        `— after reading it. Reason on file: ${surface.why}`,
    );
  }
}

/** The inverse half: every raw `<Card>` outside `patterns/` that nobody has vouched for. */
const inverseViolations: string[] = [];
for (const [file, parsed] of parsedByFile) {
  if (parsed.rawCardLines.length === 0) continue;
  if (file.startsWith(PATTERNS_DIR)) continue;
  if (Object.hasOwn(ALLOWED_RAW_CARD, file)) continue;
  for (const line of parsed.rawCardLines) inverseViolations.push(`${file}:${line}`);
}

describe("DS-11 / AC#25 — every card surface renders one of three declared containers", () => {
  // ---------------------------------------------------------------------------------------------
  // GUARD THE GUARD, ASSERTED FIRST. Both real assertions are `toEqual([])`, which a scanner that
  // visited nothing and an inventory that emptied both satisfy perfectly. Probes (c) and (d).
  // ---------------------------------------------------------------------------------------------

  it("walked a real source tree rather than an empty one", () => {
    expect(
      walked.length,
      'the scanner walked 0 files. Both real assertions in this file are "a list was empty", and a ' +
        "scan that opened nothing satisfies them perfectly.",
    ).toBeGreaterThanOrEqual(50);
    expect(scanned.length).toBeGreaterThanOrEqual(50);
    // The walk is WIDER than the scope, which is what makes the scope mean something.
    expect(walked.length).toBeGreaterThan(scanned.length);
    // …and it found the vendored primitive being composed SOMEWHERE, or the inverse half is asserting
    // the absence of a thing it cannot see in the first place.
    const rawSites = [...parsedByFile.values()].reduce((n, p) => n + p.rawCardLines.length, 0);
    expect(rawSites, "the scanner resolved 0 raw `<Card>` call sites in a tree that has 25").toBeGreaterThan(0);
  });

  it(`declares exactly ${EXPECTED_SURFACES} card surfaces and parsed every one of them`, () => {
    expect(
      CARD_SURFACES.length,
      "the declared card-surface inventory is not the size the UI-SPEC's three `Replaces` lists " +
        "describe. A coverage gate whose inventory silently emptied passes every one of its own " +
        "assertions.",
    ).toBe(EXPECTED_SURFACES);

    // Named explicitly so a count of 12 cannot come from twelve other files, and so the two surfaces
    // that live in `src/app/**` (route-group paths, the shape most likely to break a walk) are
    // asserted by name.
    expect(scanned).toContain("src/components/booking/reserve-view.tsx");
    expect(scanned).toContain("src/app/listings/[id]/(detail)/page.tsx");
    expect(scanned).toContain("src/app/(public)/invite/[token]/page.tsx");

    const parsedSurfaces = CARD_SURFACES.filter((s) => parsedByFile.has(s.file));
    expect(
      parsedSurfaces.length,
      `the scanner parsed ${parsedSurfaces.length} of the ${CARD_SURFACES.length} declared card ` +
        "surfaces. A row whose file the walk never opened is silently exempt from the forward half. " +
        "Missing: " +
        CARD_SURFACES.filter((s) => !parsedByFile.has(s.file))
          .map((s) => s.file)
          .join(", "),
    ).toBe(EXPECTED_SURFACES);
  });

  it("keys its patterns off the ids selector-contract.ts already declares", () => {
    // The `key_links` edge. If `panel-card` is renamed in the contract and not here, this fires —
    // rather than two files quietly describing different systems.
    for (const id of Object.keys(PATTERNS)) {
      expect(SELECTOR_IDS, `\`${id}\` is not a declared selector id`).toContain(id);
    }
    expect(Object.keys(PATTERNS)).toHaveLength(3);
  });

  it("gives every allow-list entry and every surface a non-empty reason", () => {
    // `contrast-pairs.ts:99-116`'s rule, applied twice: a row without a reason is not a row.
    for (const [file, reason] of Object.entries(ALLOWED_RAW_CARD)) {
      expect(reason.trim().length, `ALLOWED_RAW_CARD["${file}"] has no reason`).toBeGreaterThan(40);
    }
    for (const surface of CARD_SURFACES) {
      expect(surface.why.trim().length, `${surface.file} has no reason`).toBeGreaterThan(40);
    }
    // An allow-list entry for a file that no longer exists is a reason nobody is reading any more.
    for (const file of Object.keys(ALLOWED_RAW_CARD)) {
      expect(parsedByFile.has(file), `ALLOWED_RAW_CARD names ${file}, which the walk never found`).toBe(
        true,
      );
    }
  });

  // ---------------------------------------------------------------------------------------------
  // The two real clauses.
  // ---------------------------------------------------------------------------------------------

  it("every declared card surface composes the pattern it was assigned", () => {
    expect(
      forwardViolations,
      "a surface the 11-UI-SPEC names as a card adopter does not compose the pattern it was " +
        "assigned. Each line is `file — expected pattern (module)`, and the fix is either to adopt " +
        "the pattern or to move the row to a REFUSED status with a measured reason.",
    ).toEqual([]);
  });

  it("no file outside patterns/ renders a raw <Card> without being on the allow-list", () => {
    expect(
      inverseViolations,
      "a `<Card>` is rendered outside `src/components/patterns/**` by a file that is not on " +
        "ALLOWED_RAW_CARD. DS-11 says THREE card containers; a fourth boxed shape is a scope alarm, " +
        "not a style preference. Either compose ResultCard / RowCard / PanelCard, or add the file to " +
        "ALLOWED_RAW_CARD with a reason that says which phase owns it. Unlisted raw `<Card>` call " +
        "sites: " +
        inverseViolations.join(", "),
    ).toEqual([]);
  });

  it("reports what the three patterns are actually worth today, positively", () => {
    // The positive half. Both assertions above are absences; this one fails if the adoptions
    // EVAPORATE — which `toEqual([])` cannot notice, because a tree with no adopters and no raw
    // cards satisfies both perfectly.
    const adopted = CARD_SURFACES.filter((s) => s.status === "adopted");
    const refused = CARD_SURFACES.filter((s) => s.status === "refused");
    // 14 adopted since 14-13 (+1: the blocked-dates list, the second and last of the two Phase-14
    // exemptions; 13 since 14-12's weekly-hours editor and the week strip it mounts; 11 since 13-10's
    // booking detail page). `refused` is unchanged — both refusals were MEASURED by plan 11-11 and
    // neither has been overturned, and the host listing tile's refusal is REAFFIRMED by 14-13 rather
    // than revisited: that plan corrects the 11-UI-SPEC's replaces-list instead of swapping the tile.
    //
    // 16 SINCE PLAN 15-07 (+2: the login and reset-request cards). This is the SECOND pin the two
    // rows moved, and the fact that it moved separately is the reason it exists: `EXPECTED_SURFACES`
    // counts the inventory and this counts its adopted half, so a conversion recorded as a REFUSAL
    // would satisfy the first and fail here. It was watched go red with the rows in and the number
    // still at 14 — `expected [ … ] to have a length of 14 but got 16` — before it was moved.
    // `refused` stays 2: no measured refusal was revisited by this phase.
    //
    // 18 SINCE THAT PLAN'S SECOND COMMIT (+2: the account-creation and token-bearing cards), red
    // watched again — `expected [ … ] to have a length of 16 but got 18`. All four auth pages are
    // adopters now and the Phase-15 allow-list block is empty.
    expect(adopted).toHaveLength(18);
    expect(refused).toHaveLength(2);

    const composing = adopted.filter((s) => {
      const parsed = parsedByFile.get(s.file);
      const { module, binding } = PATTERNS[s.pattern];
      return parsed ? importsBinding(parsed, module, binding) : false;
    });
    expect(
      composing.map((s) => s.file).sort(),
      "the adopted surfaces stopped composing their patterns",
    ).toEqual(adopted.map((s) => s.file).sort());
  });

  // ---------------------------------------------------------------------------------------------
  // Both-directions self-tests, over fixtures never written to disk.
  // ---------------------------------------------------------------------------------------------

  it("flags a raw <Card> outside patterns/ and spares a PanelCard composition", () => {
    const offender = parseModule(
      "fake-offender.tsx",
      [
        'import { Card, CardContent } from "@/components/ui/card";',
        'export const A = () => <Card className="p-6"><CardContent>x</CardContent></Card>;',
      ].join("\n"),
    );
    expect(offender.rawCardLines).toEqual([2]);

    const composer = parseModule(
      "fake-composer.tsx",
      [
        'import { PanelCard } from "@/components/patterns/panel-card";',
        "export const A = () => <PanelCard>x</PanelCard>;",
      ].join("\n"),
    );
    expect(composer.rawCardLines).toEqual([]);
    expect(importsBinding(composer, "@/components/patterns/panel-card", "PanelCard")).toBe(true);
  });

  it("does not mistake a Card named in a comment or a string for one rendered at a call site", () => {
    // THE REASON THIS IS AN AST WALK. `price-breakdown.tsx` now explains at length why it must NOT
    // grow a `Card`, and a text grep for `<Card` would read that explanation as the violation.
    const prose = parseModule(
      "fake-prose.tsx",
      [
        "// Do NOT wrap this in a <Card> — the rail already boxes it.",
        '/* <Card className="p-6"> would double the padding */',
        'export const NOTE = "<Card> is what the spec calls the container";',
        "export const A = () => <div>x</div>;",
      ].join("\n"),
    );
    expect(prose.rawCardLines).toEqual([]);

    // …and a file that names the pattern in prose has NOT adopted it.
    const mention = parseModule(
      "fake-mention.tsx",
      ["// PanelCard is the right container for this, one day.", "export const A = 1;"].join("\n"),
    );
    expect(importsBinding(mention, "@/components/patterns/panel-card", "PanelCard")).toBe(false);
  });

  it("resolves the local binding, so an aliased import is still a raw Card and a same-named import from elsewhere is not", () => {
    const aliased = parseModule(
      "fake-alias.tsx",
      [
        'import { Card as Box } from "@/components/ui/card";',
        "export const A = () => <Box>x</Box>;",
      ].join("\n"),
    );
    expect(aliased.rawCardLines, "an aliased ui/card Card is the same violation").toEqual([2]);

    const elsewhere = parseModule(
      "fake-elsewhere.tsx",
      ['import { Card } from "some-charting-lib";', "export const A = () => <Card>x</Card>;"].join("\n"),
    );
    expect(elsewhere.rawCardLines, "a `Card` from another package is not this gate's business").toEqual(
      [],
    );
  });

  it("treats CardContent-without-Card as out of scope, and says so", () => {
    // Stated as an executable NOT COVERED note rather than a paragraph: the blind spot is real, and
    // a reader who changes this behaviour should have to change an assertion.
    const partial = parseModule(
      "fake-partial.tsx",
      [
        'import { CardContent } from "@/components/ui/card";',
        "export const A = () => <CardContent>x</CardContent>;",
      ].join("\n"),
    );
    expect(partial.rawCardLines).toEqual([]);
  });
});
