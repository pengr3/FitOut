// GATE-04 — THE structural-selector inventory. Every `data-testid` this milestone is allowed to render,
// each with the reason a role or label query cannot carry the assertion hung on it, and the plan that
// ships it.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A TYPED MODULE AND NOT A MARKDOWN DOC (D-31, superseding D-134's literal `SELECTOR-CONTRACT.md`)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// D-134 named the inventory as a markdown file. D-31 supersedes that name for a mechanical reason: a
// markdown inventory is the ONLY declared inventory in this repository that would not be type-checked,
// and its failure modes — a renamed heading, a reformatted table, a row that loses its second column —
// look *exactly* like the selector regressions the gate exists to catch. A doc that must be parsed to be
// trusted fails silently in the same shape as the thing it is guarding.
//
// So the inventory is a const tuple plus a TOTAL `Record` over the union it derives, the shape this repo
// has converged on for `contrast-pairs.ts`, `status-tones.ts` and every inventory since. Adding a name to
// `SELECTOR_IDS` without adding its row is a COMPILE error, not a review comment.
//
// OBSERVED RED — the compile gate, watched rather than asserted (13 August 2026). The `"panel-card"` row
// was deleted from `SELECTOR_CONTRACT` and nothing else changed. `npx tsc --noEmit` → exit code 2, one
// error, verbatim and unwrapped:
//
//   src/lib/design/selector-contract.ts(165,14): error TS2741: Property '"panel-card"' is missing in type
//   '{ "price-total": { why: string; owner: string; }; "skeleton-card-grid": { why: string; owner:
//   string; }; "skeleton-row-list": { why: string; owner: string; }; "skeleton-panel": { why: string;
//   owner: string; }; "result-card": { ...; }; ... 10 more ...; "legal-placeholder-notice": { ...; }; }'
//   but required in type 'Record<"price-total" | "skeleton-card-grid" | "skeleton-row-list" |
//   "skeleton-panel" | "result-card" | "row-card" | "panel-card" | "page-header" | "empty-state" |
//   "error-state" | ... 6 more ... | "legal-placeholder-notice", SelectorRow>'.
//
// Row restored → `npx tsc --noEmit` exit 0. TWO things in that output are the reason this shape was
// chosen over a lookup with a fallback. The error names the MISSING id in its first clause, so the fix is
// legible without reading the type; and the required type prints the union MEMBER BY MEMBER rather than
// as the alias `Record<SelectorId, SelectorRow>`, so the id is also visible in the expectation. A
// `Partial<Record<…>>` or an index signature would have compiled silently and shipped a hook nobody had
// declared a reason for.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// D-32 — "CHECKED" MEANS EXISTENCE PLUS A FLOOR, NEVER AN EQUALITY
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// One line: every declared id must actually appear in `src/`, and the accessible-query counts in `e2e/`
// may only go UP — `getByRole >= 92`, `getByLabel >= 30`, asserted as floors and never as equalities.
//
// Why a floor rather than the UI-SPEC AC#32's literal "unchanged in count": an equality pinned at 92/30
// goes red on every legitimate new assertion Phases 12-19 write, and the fix for that red is to bump the
// number. Bumping a number to make a gate green is the rubber-stamp reflex this whole phase exists to
// remove; it would arrive through the gate meant to prevent it. A floor is red only for the regression
// that matters — an accessible query converted into a brittle one.
//
// MEASURED IN `e2e/` ON 13 AUGUST 2026, over the 11 spec files plus `helpers/theme.ts`:
//
//   getByRole    92   ← the D-32 floor binds here
//   getByLabel   30   ← the D-32 floor binds here
//   getByText    63   ← recorded, deliberately NOT gated
//   .locator(    23   ← recorded, deliberately NOT gated (11-UI-SPEC § GATE-04 says 22; 23 is measured)
//
// `getByText` and `.locator(` are recorded and not gated on purpose. A `getByText` floor would freeze
// copy, and the copywriting contract in `11-UI-SPEC.md` changes copy on several surfaces this phase. A
// `.locator(` floor would be perverse — those 23 structural calls are the fragile selectors this phase is
// meant to REDUCE, and a floor on them would forbid the improvement.
//
// `src/` contained ZERO `data-testid` occurrences when this file landed (verified, not assumed), so every
// name below is net-new and every row's `owner` is a forward promise rather than a description.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SCOPE RULE (11-UI-SPEC § GATE-04) — READ THIS BEFORE ADDING A ROW
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • A `data-testid` is added ONLY where a role or label query cannot express the target: structural
//     containers, skeleton wrappers, state panels. Every INTERACTIVE element stays reachable by
//     `getByRole` / `getByLabel`.
//   • The shipped 92 `getByRole` and 30 `getByLabel` selectors are NEVER converted to test ids. Those
//     queries assert accessibility as a side effect — a button reachable by its role is a button a screen
//     reader can announce. Replacing one with a test id trades a real guarantee for a brittle one and
//     leaves every gate green while the guarantee is gone.
//   • Naming is kebab-case, `{surface}-{element}`. Nothing here is a template: the UI-SPEC's
//     `skeleton-{shape}` is expanded below into its three concrete shapes, because a scanner cannot check
//     a placeholder and a name a scanner cannot check is not in the inventory in any useful sense.
//
// The `why` column is MANDATORY and is not decoration — the same rule `contrast-pairs.ts` applies to its
// `note` field. A row whose reason is "so we can select it" is a row that should not exist: that is true
// of every element on every page, and an inventory that accepts it is a convention, not a contract.
//
// The `owner` column names the plan that SHIPS the id. It exists because this file declares 17 names that
// `src/` does not contain yet, and the gate that reads it (`tests/design/selector-contract.test.ts`)
// deliberately does NOT assert the forward direction — see that file's NOT COVERED footer, which hands
// the forward assertion to plan `11-22`. Without `owner` that hand-off is a promise nobody can audit;
// with it, an id that never lands is traceable to the plan that failed to land it.
//
// WHERE THIS FILE LIVES, AND WHY IT MATTERS. `src/lib/design/` is outside the DS-13 leak gate's scanned
// tree (`config/design-leak-patterns.mjs` → LEAK_SCAN_PREFIXES covers `src/app/**` and
// `src/components/**` only), the same reason `contrast-pairs.ts:11-14` gives for its own location. This
// module necessarily quotes strings that other gates count; keeping it outside the scanned tree means it
// can be honest without needing a per-line exemption.
//
// NOT COVERED — a real blind spot, stated so the next reader under-trusts this file:
//   • This is a DECLARATION. It proves nothing about the tree on its own. The undeclared-id ban in
//     `tests/design/selector-contract.test.ts` is what makes it binding in one direction, and plan
//     `11-22` owns the other.

/**
 * The attribute the whole contract is expressed in.
 *
 * `data-testid` is Playwright's DEFAULT `testIdAttribute`, so `page.getByTestId("site-header")` resolves
 * against it with no `playwright.config.ts` change. Exported as a constant rather than repeated as a
 * literal so the gate, the inventory and any future spec read one string — a renamed attribute becomes
 * one edit instead of a silent partial migration.
 */
export const SELECTOR_ATTRIBUTE = "data-testid";

/**
 * Every structural hook Phase 11 is allowed to render. Closed, ordered by the plan that ships it, and the
 * source of the `SelectorId` union below.
 *
 * Ordered by owning plan (11-06 → 11-15) rather than alphabetically, because the reading question this
 * file gets asked is "has the plan that owns this id run yet", not "where is X in the alphabet".
 */
export const SELECTOR_IDS = [
  // 11-06 — GATE-05's e2e half.
  "price-total",
  // 11-07 — the three skeleton shapes.
  "skeleton-card-grid",
  "skeleton-row-list",
  "skeleton-panel",
  // 11-08 — the card patterns and the page header.
  "result-card",
  "row-card",
  "panel-card",
  "page-header",
  // 11-09 — the state panels and the one overlay primitive.
  "empty-state",
  "error-state",
  "responsive-dialog",
  // 11-10 — the app shell's header composition.
  "site-header",
  "site-brand",
  "site-nav",
  "site-auth-slot",
  // 11-14 — the footer.
  "site-footer",
  // 11-15 — the legal placeholder.
  "legal-placeholder-notice",
  // 12-03 — the checkout header's hold countdown slot.
  "hold-countdown",
  // 12-04 — the listing rail's total, once ONE component renders both price surfaces.
  "rail-price-total",
  // 12-07 — the full-screen photo lightbox.
  "photo-lightbox",
] as const;

/** The closed union every declared hook is typed against. */
export type SelectorId = (typeof SELECTOR_IDS)[number];

/** One declared hook. Both fields are mandatory; neither has a default. */
export type SelectorRow = {
  /**
   * WHY a role or label query cannot carry the assertion this hook exists for.
   *
   * Mandatory, and load-bearing rather than documentation. `contrast-pairs.ts:99-116` established the
   * rule this follows: a row without a reason is not a row. The reason is what a reviewer checks the
   * scope rule against, and it is what travels into the failure message when the gate goes red.
   */
  readonly why: string;
  /**
   * The plan that SHIPS this id into `src/`, as `11-NN`.
   *
   * The forward direction — "every declared id actually appears in `src/`" — is owned by plan `11-22`,
   * not by the gate that reads this file. This column is what makes that hand-off auditable: an id still
   * missing at the end of the phase names the plan that owed it.
   */
  readonly owner: string;
};

/**
 * Every id's row. A TOTAL `Record` over the closed union on purpose — this is the compile gate, and the
 * OBSERVED RED in the header is it being watched.
 */
export const SELECTOR_CONTRACT: Record<SelectorId, SelectorRow> = {
  // ─── 11-06 ─────────────────────────────────────────────────────────────────────────────────────────
  "price-total": {
    why:
      "The DB-vs-DOM parity spec reads ONE number out of the checkout and compares it to the quote the " +
      "database froze. The breakdown renders three other money figures in the same markup shape, so the " +
      "only text-based way to reach the total is to match its formatted amount — and a selector that has " +
      "to know the answer in order to find the element cannot prove the answer. There is no role for a " +
      "number and no label for a total that is not an input.",
    owner: "11-06",
  },

  // ─── 11-07 ─────────────────────────────────────────────────────────────────────────────────────────
  "skeleton-card-grid": {
    why:
      "All three skeleton shells render `role=\"status\" aria-busy=\"true\"`, which is the correct " +
      "accessible markup and is therefore identical across them. `getByRole(\"status\")` matches all " +
      "three and cannot say WHICH shape mounted; the geometry spec measures this shape's box against the " +
      "shared measurement constants, so it must address one shape and not the family.",
    owner: "11-07",
  },
  "skeleton-row-list": {
    why:
      "Same `role=\"status\"` as the other two shells — the role is the family, not the member. This is " +
      "the shape asserted to match the row-card's height so a list does not shift when data arrives, and " +
      "that assertion is meaningless if the selector might have picked the grid.",
    owner: "11-07",
  },
  "skeleton-panel": {
    why:
      "Third member of the same `role=\"status\"` family. It is also the shape most likely to render " +
      "beside one of the others on a split route, which is exactly when a role query silently returns " +
      "the wrong element instead of failing.",
    owner: "11-07",
  },

  // ─── 11-08 ─────────────────────────────────────────────────────────────────────────────────────────
  "result-card": {
    why:
      "A card container. Its interactive content — the title link, the CTA — stays on role queries; this " +
      "hook marks the CARD so that counting results counts results. `getByRole(\"link\")` counts LINKS, " +
      "and a card that gains a second link (a host name, a map pin) changes that count without changing " +
      "the number of spaces on screen.",
    owner: "11-08",
  },
  "row-card": {
    why:
      "The same container argument with a sharper edge: a booking row renders zero to three action " +
      "buttons depending on lifecycle state, so ANY role-based count of rows moves when an action " +
      "appears or a state changes. The row count has to be stable across states to be worth asserting.",
    owner: "11-08",
  },
  "panel-card": {
    why:
      "A boxed panel with no role, and several of its five adopters render no heading at all (the price " +
      "breakdown has none). Its entire contract is the box — padding, radius, border, sticky offset — " +
      "so there is nothing semantic to select even in principle.",
    owner: "11-08",
  },
  "page-header": {
    why:
      "The title inside it is an `<h1>` and stays reachable by `getByRole(\"heading\", { level: 1 })`. " +
      "The hook is on the WRAPPER, which has no role: it carries the title/description/actions three-slot " +
      "geometry and the 320px wrap-rather-than-truncate rule. A heading query reaches the text; nothing " +
      "reaches the box that must not truncate.",
    owner: "11-08",
  },

  // ─── 11-09 ─────────────────────────────────────────────────────────────────────────────────────────
  "empty-state": {
    why:
      "A state panel. The assertion is 'this surface is in its EMPTY state' — a claim about which of four " +
      "mutually exclusive families rendered. Every heading here is per-surface copy that the copywriting " +
      "contract changes in this very phase (`/host/requests` becomes \"You're all caught up\"), so a " +
      "role-plus-name query pins the assertion to a string designed to move.",
    owner: "11-09",
  },
  "error-state": {
    why:
      "Same family argument, and the reason it is a separate row rather than a shared one: the empty " +
      "panel and the error panel both render a heading, a body and a button, so role queries cannot tell " +
      "'nothing here yet' from 'this failed to load' without matching on copy. Mistaking one for the " +
      "other is precisely the regression GATE-04 exists to catch.",
    owner: "11-09",
  },
  "responsive-dialog": {
    why:
      "The pattern wraps the vendored dialog, so it renders `role=\"dialog\"` in BOTH presentations — and " +
      "so does every hand-rolled dialog already in the tree. The assertion is 'this surface uses THE one " +
      "overlay primitive rather than a second mechanism', which is what makes `--z-sheet`'s zero true; a " +
      "role query cannot distinguish the pattern from a look-alike with the same role.",
    owner: "11-09",
  },

  // ─── 11-10 ─────────────────────────────────────────────────────────────────────────────────────────
  "site-header": {
    why:
      "`<header>` is a `banner` landmark, so a role query can FIND it. What it cannot be is the stable " +
      "handle for three GEOMETRY claims: height 56 at 375px and 64 at 640px+, an unchanged bounding box " +
      "across the auth slot's pending→resolved swap, and zero `<a href>` anywhere in this subtree on the " +
      "checkout route. Those are structural facts about a box; hanging them on `banner` couples a layout " +
      "regression to a semantic one so neither failure names itself.",
    owner: "11-10",
  },
  "site-brand": {
    why:
      "The brand is a link home whose accessible name is the product name — and the footer ships a second " +
      "link home with the same name, so `getByRole(\"link\", { name: \"FitOut\" })` is ambiguous by " +
      "construction. The assertion is that this box does not move when the auth slot resolves, which " +
      "needs a handle that is unique by construction rather than by current copy.",
    owner: "11-10",
  },
  "site-nav": {
    why:
      "The header nav and the footer nav are both `navigation` landmarks. The load-bearing assertion here " +
      "is an ABSENCE — the checkout composition renders no primary nav at all — and an absence asserted " +
      "through a role query that also matches the footer's nav is green for the wrong reason on the one " +
      "route it is supposed to be checking.",
    owner: "11-10",
  },
  "site-auth-slot": {
    why:
      "A wrapper `<div>` with no role and no accessible name whose entire job is to RESERVE space while " +
      "the session resolves. When it is doing that job it is empty, so there is nothing for a role or " +
      "label query to match — the element under test is, by definition, a box with no content.",
    owner: "11-10",
  },

  // ─── 11-14 ─────────────────────────────────────────────────────────────────────────────────────────
  "site-footer": {
    why:
      "The assertion is a per-route COUNT that includes a zero: exactly one footer on six routes and none " +
      "on the checkout. Counting the `contentinfo` landmark is a weaker statement than counting the " +
      "component the shell mounts — a `<footer>` element nested inside a card would make the landmark " +
      "count two with nothing actually wrong, which turns a real gate into noise.",
    owner: "11-14",
  },

  // ─── 11-15 ─────────────────────────────────────────────────────────────────────────────────────────
  "legal-placeholder-notice": {
    why:
      "The notice is a `PanelCard` whose whole purpose is to say these are not FitOut's real terms. It " +
      "has no role, and it sits inside long-form prose made of the same headings and paragraphs it is " +
      "built from. The gate asserts string equality on the sentinel copy and exactly one notice per legal " +
      "page — both need a handle on the notice itself, not on the prose around it.",
    owner: "11-15",
  },

  // ─── 12-03 ─────────────────────────────────────────────────────────────────────────────────────────
  "hold-countdown": {
    why:
      "The assertion this hook carries is that a BOX does not move: the checkout header's countdown " +
      "slot must measure identically with the slot empty, at 14:52, at 0:09 and at \"Hold expired\", " +
      "which is exactly what HOLD_COUNTDOWN_BOX reserves. `role=\"timer\"` cannot be that handle, for " +
      "two reasons either of which alone is fatal. It matches the DIGITS INSIDE the box rather than " +
      "the box, and the digits are type-sized — \"14:52\" and \"0:09\" are different widths, so the " +
      "assertion would go red on a header that never moved. And the timer is ABSENT in two of the four " +
      "states: before the page publishes a deadline, and after expiry, where D-49 removes both the " +
      "role and the live region. A role query therefore cannot address the very states the reservation " +
      "exists for. Nor is there an accessible name on an empty reserved box — when it is doing its job " +
      "it holds nothing.",
    owner: "12-03",
  },

  // ─── 12-04 ─────────────────────────────────────────────────────────────────────────────────────────
  "rail-price-total": {
    why:
      "The same no-role-for-a-number argument `price-total` records, plus the reason it may NOT simply " +
      "reuse that hook. D-38 makes ONE component render the breakdown on both the listing rail and " +
      "checkout, and 12-10 then mounts a second booking view in a SHEET — so a single document can hold " +
      "two totals. `e2e/price-parity.spec.ts` reads the hook's textContent, normalises it back to " +
      "integer centavos and asserts equality with `booking.quoted_total_cents`; with two elements " +
      "carrying one id it would resolve whichever came first in the DOM and be green for the wrong " +
      "element, on the one CI-gated money spec. A per-surface id makes each match exactly one element " +
      "per document, which is a structural fact rather than a discipline. `sheet-price-total` is " +
      "deliberately NOT declared here — plan 12-10 renders it, and a declared row with no literal in " +
      "`src/` fails this contract's forward assertion.",
    owner: "12-04",
  },

  // ─── 12-07 ─────────────────────────────────────────────────────────────────────────────────────────
  "photo-lightbox": {
    why:
      "`getByRole(\"dialog\")` cannot distinguish this dialog from the booking sheet, and on this route " +
      "BOTH are reachable in one document: the listing page renders the gallery and, from 12-10, a " +
      "second booking view in a `ResponsiveDialog`. A role query would resolve whichever mounted first. " +
      "Nor is a NAME query a substitute for the hook, and that is the sharper half. The spec this id " +
      "exists for asserts two things at once — that the element computing the name `Photos of {title}` " +
      "IS this component, and that it does NOT also carry `responsive-dialog`. The second is a claim " +
      "about WHICH OVERLAY MECHANISM rendered, which is precisely the claim `responsive-dialog`'s own " +
      "row records a role query being unable to make; asserting it needs two distinguishable hooks, " +
      "because an absence assertion against a role is satisfied by any element in the document. D-45 " +
      "makes the lightbox a raw full-screen `ui/dialog` rather than the RESP-01 pattern, and this pair " +
      "of ids is what stops that decision quietly reverting to \"some dialog opened\".",
    owner: "12-07",
  },
};
