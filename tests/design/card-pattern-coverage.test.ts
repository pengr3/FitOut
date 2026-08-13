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
    file: "src/app/(public)/invite/[token]/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why: "The invite page's `InviteCard` shell, which every one of that route's states renders inside. Copy, RSVP behaviour and the noindex/no-referrer metadata are untouched by the swap.",
  },
  {
    file: "src/app/(host)/host/page.tsx",
    pattern: "panel-card",
    status: "adopted",
    why:
      "The hours-missing notice, as `tone=\"muted\"`. The spec says \"the hours-missing notices\", plural; " +
      "an AST scan for the three HOURS_MISSING_* constants finds exactly two sites and only this one is a " +
      "PANEL. The other, `listing/listing-card.tsx:210`, is an inline meta line inside a tile's " +
      "CardContent — a card inside a card is not what the clause means.",
  },
];

/**
 * How many rows the inventory has. Pinned SEPARATELY from every assertion over it, because probe (c)
 * measured that an emptied inventory satisfies both real assertions perfectly.
 *
 * TWELVE = ResultCard's 2 + RowCard's 5 + PanelCard's 5, which is the 11-UI-SPEC's three `Replaces`
 * lists counted. A change to this number should arrive with a change to those lists, or with the
 * phase that adds the surface.
 */
const EXPECTED_SURFACES = 12;

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
  "src/app/(auth)/login/page.tsx":
    "The auth form shell. Phase 15 owns login/signup/forgot/reset as one designed set, and the 11-UI-SPEC does not list any of the four under a `Replaces` line — extracting an auth-card pattern from Phase 11 would be inventing a fourth shape to satisfy a gate.",
  "src/app/(auth)/signup/page.tsx":
    "Same shell as login, plus the book/host intent radio group. Phase 15. Pattern-ising the four auth cards together is that phase's call, not this one's.",
  "src/app/(auth)/forgot-password/page.tsx":
    "The same auth shell again, one field wide. Phase 15 criterion 1 requires all four auth screens to hold the same five gates, which is an argument for designing them together rather than swapping one container now.",
  "src/app/(auth)/reset-password/page.tsx":
    "The fourth auth shell, and the one carrying the token-bearing URL. Phase 15; its box changes when the set does.",

  // ── Phase 13 — Confirmation, Bookings & Trust (owns /bookings/** and the group surfaces) ───────
  "src/app/(app)/bookings/[id]/page.tsx":
    "The booking detail page — 5 call sites, and the surface Phase 13's success criteria 2 and 4 rewrite end to end (status meaning, itemised payment, cancellation deadline, the three distinct payment-failure states). Container decisions here are that redesign's, not a swap's.",
  "src/app/(app)/bookings/[id]/cancel/page.tsx":
    "The cancel confirmation, including the refund-ladder box. Phase 13 (TRUST-04 / STATE-05 — a refund amount is explicitly an in-page alert, never a toast), so its boxes are decided there.",
  "src/app/(app)/bookings/[id]/group/page.tsx":
    "The organizer's group management page. Phase 13's scope note folds the group surfaces in by name.",
  "src/components/group/attendee-roster.tsx":
    "The RSVP roster rendered by the group page above. Same phase, same reason; it is also a candidate for RowCard rather than a panel, and guessing which in a container-swap plan is how a pattern gets adopted wrongly.",
  "src/components/booking/expired-approval-state.tsx":
    "One of the four calm full-page booking states rendered from the booking detail page. Phase 13 criterion 4 names these three-plus-one states as things that must become visibly different from each other — a shared container is plausibly the wrong answer for them.",
  "src/components/booking/payment-reversed-state.tsx":
    "Same family. Phase 13 criterion 4 requires this one to make an explicit money statement with a support path, so its box is part of that design, not a swap.",
  "src/components/booking/pending-payment-state.tsx":
    "Same family — the settling state, which criterion 4 says must offer NO error affordance at all while the webhook is still the authority.",
  "src/components/booking/hold-expired-state.tsx":
    "Same family, but reached from CHECKOUT (`listings/[id]/book`) as well as from the reversed state — so it straddles Phase 12 and Phase 13. Deliberately not swapped by plan 11-13, which was scoped to container-only edits on surfaces the spec names.",

  // ── Phase 14 — Host Tooling (HFLOW-04 names the availability editor) ──────────────────────────
  "src/components/availability/weekly-hours-editor.tsx":
    "The weekly-hours editor's two boxes. HFLOW-04 says the editor must read as the same product as the booker side AND gain a week-at-a-glance preview — a structural change, so Phase 14 decides the container.",
  "src/components/availability/blocks-editor.tsx":
    "The date-block editor beside it, same surface and same phase.",

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
    expect(adopted).toHaveLength(10);
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
