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
  // 12-08 — the listing page's key-facts strip.
  "listing-key-facts",
  // 12-09 — the month grid's loading plate.
  "skeleton-calendar",
  // 12-10 — RESP-02's one booking panel in two placements, the sheet placement's own total, and the
  // listing page's sticky bottom bar.
  "booking-panel",
  "sheet-price-total",
  "booking-sticky-bar",
  // 12-11 — BFLOW-06's checkout: the collapsible that hides how the price was built, and the bottom
  // bar that keeps what it IS on screen.
  "price-disclosure",
  "checkout-sticky-bar",
  // 12-12 — STATE-03's relaxation band: the sentence that names the one constraint that gave.
  "search-relax-band",
  // 12-13 — STATE-07's in-place collision notice: the window that went, above the refreshed picker.
  "collision-notice",
  // 13-02 — the three shared domain components every later Phase-13 surface composes.
  "support-path",
  "money-statement",
  "booking-reference",
  // 13-04 — STATE-05's third payment state, and the one D-87 has to reach without a query string.
  "payment-state-reversed",
  // 13-07 — the other two payment states, so the distinctness claim has three boxes to compare. Each
  // row ships in the same commit as its literal: the contract is bidirectional, so a declared id with
  // no call site is as red as a call site with no declaration.
  "payment-state-incomplete",
  "payment-state-pending",
  // 13-09 — TRUST-04's closed four-signal set. Declared here in the SAME commit as the component,
  // which is the bidirectional rule above being obeyed rather than restated: the plan scheduled this
  // row a task later, and the gate went red on `Rendered-but-undeclared: [trust-block]` the moment the
  // literal shipped.
  "trust-block",
  // 13-10 — the ordinary booking detail, one shell rendered eight ways. It is the sibling every
  // "nothing important lives only in the moment" assertion has to name, so it ships with the shell.
  "booking-detail",
  // 13-11 — BFLOW-08's post-payment first screen. Declared in the SAME commit as the component, one
  // task earlier than this plan scheduled it, for the reason 13-09's `trust-block` row records: the
  // contract is bidirectional, so the gate went red on `Rendered-but-undeclared: [confirmation-moment]`
  // the moment the literal shipped.
  "confirmation-moment",
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

  // ─── 12-08 ─────────────────────────────────────────────────────────────────────────────────────────
  "listing-key-facts": {
    why:
      "A `<dl>` has no implicit ARIA role in any browser, so there is no role query that can address " +
      "the strip at all — and a NAME query is worse than unavailable, it is wrong: the assertions hung " +
      "on this element are about the SET of pairs it renders (how many, in which order, and — the one " +
      "that is a correctness rule rather than a layout preference — that the `Units` value reads " +
      "`1 of 4 courts` and never a bare `4 courts`). A set assertion needs the container, because its " +
      "whole content is the claim; addressing any individual `<dt>` by its text would be green for a " +
      "strip that had silently lost the other three. The page also renders definition-free label/value " +
      "prose elsewhere (the rail's price lines, the host block), so scoping by tag alone would collect " +
      "the wrong nodes the moment either of those grows a description list of its own.",
    owner: "12-08",
  },

  // ─── 12-09 ─────────────────────────────────────────────────────────────────────────────────────────
  "skeleton-calendar": {
    why:
      "The fourth member of the `role=\"status\"` skeleton family, and the argument the other three " +
      "rows make binds harder here rather than more weakly. `getByRole(\"status\")` matches every " +
      "skeleton shape and cannot say which one mounted — and on `/listings/[id]` the loading state " +
      "mounts TWO of them in one document (`PanelSkeleton` and this plate), so a role query would " +
      "resolve whichever came first and the ±2px geometry assertion would be comparing the panel's " +
      "box against the calendar's. Nor is a NAME query a substitute: this plate is wrapped in " +
      "`aria-hidden` at that call site (rule 6 — `PanelSkeleton` owns the route's one busy region), " +
      "so it computes no accessible name in the document the spec measures, which is precisely the " +
      "state a hook has to survive.",
    owner: "12-09",
  },

  // ─── 12-10 ─────────────────────────────────────────────────────────────────────────────────────────
  "booking-panel": {
    why:
      "RESP-02's declared duplication needs a handle on the DUPLICATE ITSELF, and every accessible " +
      "query available here is a query about one of its contents rather than about the mount. The " +
      "panel is a `<div>` with no role, no heading of its own and no accessible name — its children " +
      "carry all of those — so `getByRole` cannot address it even in principle. Nor would a name " +
      "query be a substitute if one existed: the assertion this hook exists for is a COUNT ACROSS " +
      "PLACEMENTS (`/listings/[id]` mounts this component twice by design, and a THIRD mount is the " +
      "regression), and counting a role its children share with the rail's other panels, the sheet's " +
      "own chrome and the checkout breakdown would be counting something else. ⚠ IT IS DELIBERATELY " +
      "NOT THE HOOK THE `Book`-button ASSERTION USES: `hidden` is what removes the inactive copy from " +
      "the accessibility tree, and a `getByTestId` query finds a hidden element — so the one-of-" +
      "anything-reachable condition is asserted with ROLE queries and this hook answers the different " +
      "question of how many copies are MOUNTED.",
    owner: "12-10",
  },
  "sheet-price-total": {
    why:
      "The third surface of the same no-role-for-a-number argument `price-total` and " +
      "`rail-price-total` both record, and the reason it may not reuse either of them is sharper " +
      "here than it was for the rail. `BookingPanel` is mounted TWICE in ONE document on " +
      "`/listings/[id]`, so a shared id would put two matches on the page a booker is actually " +
      "looking at rather than across two routes — and `e2e/price-parity.spec.ts` normalises a hook's " +
      "textContent back to integer centavos and would resolve whichever came first in the DOM, on " +
      "the one CI-gated money spec. One id per surface is what keeps every document holding exactly " +
      "one match per hook, which is a structural fact rather than a discipline. 12-04 recorded this " +
      "row as owed and 12-05 restated it; the literal lands in `price-breakdown.tsx` in the same " +
      "commit as this row.",
    owner: "12-10",
  },
  "booking-sticky-bar": {
    why:
      "The assertion this hook carries is that a BOX is where it says it is: 64px tall, its bottom " +
      "edge on the viewport's, fully inside the viewport at `scrollY === 0`, and holding a child " +
      "whose own box is at least 44 × 44. None of that is addressable through the accessible tree. " +
      "The bar is a `<div>` with no role and no accessible name — a `toolbar` role would be a lie " +
      "about a container holding one control, and naming it would put a label in a screen reader's " +
      "element list for a box whose entire content is already announced by its two children. Its " +
      "ACTION stays on a role query (`getByRole(\"button\", { name: /^Book/ })` is the RESP-02 count, " +
      "and this hook is deliberately not a substitute for it), and the RATE LINE has no role either: " +
      "the wrap assertion compares a rendered `clientHeight` against a one-line reference, which " +
      "needs the element and not its text. The bar is also the one surface on this route that is " +
      "`position: fixed`, so a query that resolved to something else would be comparing an in-flow " +
      "box against a viewport-anchored expectation and failing for the wrong reason.",
    owner: "12-10",
  },

  // ─── 12-11 ─────────────────────────────────────────────────────────────────────────────────────────
  "price-disclosure": {
    why:
      "Every assertion hung on this hook is about the COLLAPSED-versus-EXPANDED STATE OF A SPECIFIC " +
      "REGION, and no accessible query addresses a region — they address the control that toggles it. " +
      "The trigger IS reachable by role and deliberately stays so (`getByRole(\"button\", { name: " +
      "/Price details/ })` is how a spec presses it), but the claims BFLOW-06 makes are that the run, " +
      "surcharge and fee lines are not on screen while the Total is, and that expanding reveals them " +
      "without pushing the Total out of view. Those are statements about the CONTENT REGION's box and " +
      "its contents, and the region is a `<div>` with no role and no accessible name — when it is " +
      "doing its job it is not in the accessibility tree at all, which is precisely the state that has " +
      "to be measurable. Radix's own `[data-state]` is not a substitute either: `data-state=\"open\"` " +
      "is carried by every collapsible, dialog, popover, select and toggle in the tree, so a state " +
      "query would resolve against whichever of them mounted first on a route that holds several. And " +
      "the negative half — `price-total` is NOT inside this region — is an ancestry assertion, which " +
      "needs a handle on the ancestor rather than on anything it announces.",
    owner: "12-11",
  },
  "checkout-sticky-bar": {
    why:
      "The same box-is-where-it-says-it-is argument `booking-sticky-bar` records, plus the reason it " +
      "may not reuse that hook. Both bars are `<div>`s with no role and no accessible name — a " +
      "`toolbar` role would be a lie about a container holding one control, and naming the box would " +
      "put a label in a screen reader's element list for content its two children already announce — " +
      "and the assertions are geometric: 64px tall, bottom edge on the viewport's, holding an action " +
      "whose own box is at least 44 x 44, with neither line wrapping at 320px. A `position: fixed` " +
      "element measured through a query that resolved to something in flow fails for the wrong " +
      "reason. THE SEPARATE ID IS NOT COSMETIC: `e2e/overflow-320.spec.ts` and " +
      "`e2e/mobile-booker-path.spec.ts` drive `/listings/[id]` and `/listings/[id]/book` in one run " +
      "and assert on both bars, and the checkout bar's amount is compared byte-for-byte against the " +
      "checkout Total while the listing bar's is compared against the sheet's — one shared id would " +
      "let either comparison read the other route's bar and pass. Its ACTION stays on a role query " +
      "(`getByRole(\"button\", { name: /Confirm & pay/ })` is how the one-reachable-confirm-per-width " +
      "count is taken), and this hook is deliberately not a substitute for it: `hidden` is what makes " +
      "the duplication safe, and a testid query finds a hidden element.",
    owner: "12-11",
  },

  // ─── 12-12 ─────────────────────────────────────────────────────────────────────────────────────────
  "search-relax-band": {
    why:
      "Every assertion this hook carries is about the band's PRESENCE OR ABSENCE as a whole, and the " +
      "one accessible query that addresses it is unusable for that. The band is `role=\"status\"`, " +
      "and `getByRole(\"status\")` on `/` is not specific to it: the search page mounts " +
      "`CardGridSkeleton`'s own `role=\"status\" aria-busy` plate on every pending navigation, so a " +
      "role query resolves against whichever of the two is up at the moment it runs — which on a " +
      "transition is precisely the ambiguity the assertion is trying to resolve. The band also has NO " +
      "accessible name to disambiguate it by, and that is deliberate rather than an omission: " +
      "`status` is nameFrom:author, so naming it risks a screen reader announcing the LABEL instead " +
      "of the sentence, and the sentence is the entire content (see its `live-regions.ts` row). " +
      "THE ABSENCE HALF IS WHY A TEXT QUERY WILL NOT DO EITHER: `e2e/zero-result-relax.spec.ts` case " +
      "(c) asserts the band's count is ZERO after `Undo`, and case (e) asserts the cold-start page " +
      "renders neither the band nor any escape hatch — a `getByText` for copy that varies by rung " +
      "cannot state \"none of the four\" without restating all four, and a spec that has to enumerate " +
      "the copy would go green the day a fifth rung is added. Its two inner hooks are deliberately " +
      "BARE `data-*` attributes and not declared ids: `data-relax-changed` and `data-relax-value` " +
      "address text INSIDE this element, and the contract's scope rule is structural hooks, not " +
      "substrings.",
    owner: "12-12",
  },

  // ─── 12-13 ─────────────────────────────────────────────────────────────────────────────────────────
  "collision-notice": {
    why:
      "THE ASSERTION THIS HOOK CARRIES IS A SAME-PAINT ONE, AND THAT IS WHY NO ACCESSIBLE QUERY CAN " +
      "CARRY IT. `e2e/collision-in-place.spec.ts` case (a) reads, inside ONE `page.evaluate`, that " +
      "this element is on screen AND that the two hours the booker just lost already carry " +
      "`aria-disabled` plus a line-through computed style — because a notice that arrives one paint " +
      "BEFORE the corrected grid is the defect D-55 exists to prevent, and two awaited Playwright " +
      "assertions cannot tell that apart from the feature. A `page.evaluate` needs a selector, not a " +
      "locator. " +
      "AND THE ROLE QUERY IS THE ASSERTION'S OWN SUBJECT, so it cannot also be its handle: the " +
      "requirement is that EXACTLY ONE live region is mounted during the collision, counted as " +
      "`status` plus `alert` across the whole document. Addressing this notice by `getByRole(\"status\")` " +
      "would mean the element under test and the population being counted were found by the same " +
      "query — green whenever the count is 1 for the WRONG reason (the day skeleton, `book-cta`'s own " +
      "notice, the picker's gap hint are all `role=\"status\"` on this route). " +
      "NOR IS A NAME QUERY AVAILABLE: `status` is nameFrom:author and this region deliberately carries " +
      "no `aria-label` — naming it risks a screen reader announcing the label instead of the sentence " +
      "(the argument recorded at six regions in `live-regions.ts`) — so it computes no accessible name " +
      "at all. A text query is worse than unavailable, it is circular: line 1 is composed from the " +
      "booker's own selection, so a spec matching on it would have to know the window in order to find " +
      "the element that proves the window was named.",
    owner: "12-13",
  },

  // ─── 13-02 ─────────────────────────────────────────────────────────────────────────────────────────
  "support-path": {
    why:
      "THE ASSERTION THIS HOOK CARRIES IS AN ABSENCE, AND WHILE `SUPPORT_EMAIL` IS NULL THERE IS NO " +
      "ELEMENT FOR A ROLE QUERY TO FIND. D-64 renders this component as nothing at all in the unfilled " +
      "state, so the thing that has to be measurable is \"zero of these anywhere in the document\" — " +
      "and the moment the constant is set, \"exactly one per surface, in the presentation that surface " +
      "asked for\". A `getByRole(\"link\")` count cannot state either: the booking surfaces this mounts " +
      "on already render several links (the listing, the receipt, the group page, the footer's own " +
      "entry once the constant is set), so a role count moves for reasons that have nothing to do with " +
      "this affordance. Its accessible NAME is no handle either — the label arrives as a prop and " +
      "differs per call site by design (the money panel's control and the trust block's row are not " +
      "the same sentence), so a name query would have to enumerate the copy in order to find the " +
      "element, and would go green the day a surface changes its wording. " +
      "THE ID IS LOWER-CASE DELIBERATELY, AND THAT IS VERIFIED RATHER THAN INCIDENTAL: " +
      "`tests/design/site-contacts.test.ts:238` bans an unguarded label matching `/\\bSupport\\b/` — " +
      "capitalised and word-bounded — so a hyphenated lower-case hook is invisible to that scan by " +
      "construction. A capitalised spelling of the hook would make the inverted gate red against the " +
      "very component built to satisfy it. " +
      "⚠ AND THIS ROW LEARNED THAT THE HARD WAY: its first draft QUOTED the capitalised spelling in " +
      "this very sentence, and the gate went red on `selector-contract.ts` itself — the scan walks all " +
      "of `src/**`, this module is inside it, and a `why` is a string LITERAL rather than a comment, " +
      "so unlike prose it is visible to the AST walk. Do not re-introduce the word here to explain it.",
    owner: "13-02",
  },
  "money-statement": {
    why:
      "A SENTENCE HAS NO ROLE, and this one is deliberately not given a name either. STATE-06's " +
      "assertion is geometric — at 320x568 and 1280x800, in both themes, on all three payment states, " +
      "this element's `boundingBox()` must satisfy `y + height <= viewport.height` with zero scrolling " +
      "— and a box is what has to be addressed, not the text inside it. A text query is worse than " +
      "unavailable here, it is circular: the sentence is composed by the server and varies per state " +
      "and per rail (nine specified wordings), so a spec matching on the copy would have to know which " +
      "sentence it was measuring in order to find the element that proves the sentence was shown, and " +
      "would go green the day a tenth wording is added. `getByRole(\"paragraph\")` is not a substitute " +
      "either: every payment state renders several paragraphs, and the panel's own padding — the part " +
      "of the height most likely to push the bottom edge off a 568px viewport — is OUTSIDE the " +
      "paragraph. It carries no live region and therefore no `status`/`alert` role to query (13-UI-SPEC " +
      "§ Live Regions), which is the property that makes the geometric assertion necessary rather than " +
      "incidental. THE HOOK IS ON A WRAPPER, NOT ON `PanelCard`: that pattern owns its own " +
      "`panel-card` id and takes no pass-through props, and this collector only sees JSX attributes " +
      "whose value is a STRING LITERAL — the shape `(legal)/terms/page.tsx:147-152` already records.",
    owner: "13-02",
  },
  "booking-reference": {
    why:
      "THE HOOK TARGETS THE STRING, NOT THE CONTROL BESIDE IT, and the split is the whole reason it " +
      "exists. `e2e/tabular-figures.spec.ts` measures the reference's `boundingBox().width` and " +
      "compares two references of equal character length, plus reads the resolved `font-family` off " +
      "that same element — both are properties of a TEXT NODE, and a text node has no role and no " +
      "accessible name. A `getByText` would be circular in the exact way this contract's other " +
      "money-adjacent rows describe: the spec would have to know the reference in order to find the " +
      "element that proves the reference was rendered legibly, and the reference is a per-booking " +
      "SHA-256 derivation the spec cannot predict from a fixture id without re-implementing the " +
      "deriver. THE COPY CONTROL DELIBERATELY GETS NO ID — GATE-04's scope rule keeps every " +
      "interactive element on an accessible query, and this one is reachable as " +
      "`getByRole(\"button\", { name: \"Copy booking reference\" })`, which asserts the accessible " +
      "name as a side effect. Giving the button a hook would trade that guarantee for a brittle one " +
      "and leave every gate green while the guarantee was gone.",
    owner: "13-02",
  },

  // ─── 13-04 ─────────────────────────────────────────────────────────────────────────────────────────
  "payment-state-reversed": {
    why:
      "STATE-05'S DISTINCTNESS IS AN ASSERTION BETWEEN THREE CONCRETE CONTAINERS, and a role query " +
      "cannot address any of them: all three payment states are plain sectioning `div`s with no role, " +
      "and the property being asserted is that no two of them ever co-render in one document. That is " +
      "a statement about ELEMENTS, not about text — `expect(a).toHaveCount(1)` beside " +
      "`expect(b).toHaveCount(0)` — so each state needs its own addressable box. Matching on the " +
      "heading instead would be circular in the way this contract's money-adjacent rows describe: the " +
      "three headings are exactly the copy under revision, so a spec keyed to them goes green the day " +
      "one is reworded, which is the day it most needs to fail. " +
      "AND D-87 NEEDS THIS ONE BY NAME. Until this plan the state was reachable only from a query " +
      "parameter, so the moment the confirmation moment consumes that parameter a reversed booking " +
      "would fall through to the generic cancelled branch with no money statement at all. The " +
      "falsifiable form of the fix is: seed a reversed row, load `/bookings/{id}` with NO query " +
      "string, assert this hook renders and carries its money statement. Both halves of that sentence " +
      "are element counts, and neither is expressible as a role or an accessible name.",
    owner: "13-04",
  },

  // ─── 13-07 ─────────────────────────────────────────────────────────────────────────────────────────
  "payment-state-incomplete": {
    why:
      "THE SAME THREE-CONTAINER DISTINCTNESS ASSERTION THE REVERSED ROW DESCRIBES — all three payment " +
      "states are plain sectioning `div`s with no role, and the property is that no two of them ever " +
      "co-render, which is `expect(a).toHaveCount(1)` beside `expect(b).toHaveCount(0)` and therefore " +
      "needs a box per state. Keying on the heading instead would be circular: the three headings are " +
      "the copy under revision, so a spec pinned to them goes green the day one is reworded. " +
      "AND THE HARD BOUNDARY NEEDS THIS ONE BY NAME. D-70 says this state must NEVER render for a hold " +
      "that has already lapsed, because `hold-expired-state.tsx` owns that landing one navigation away " +
      "and two surfaces for one fact is two surfaces to keep true. The falsifiable form of a `never` is " +
      "a count of ZERO against a seeded expired-hold row at the same URL that renders ONE against a " +
      "live-hold row — an absence, which no role or accessible-name query can express, because when the " +
      "assertion holds there is nothing in the document to query for.",
    owner: "13-07",
  },
  "payment-state-pending": {
    why:
      "THE THIRD BOX OF THE SAME THREE-WAY COMPARISON, and the one whose assertions are almost all " +
      "NEGATIVE — which is precisely why it needs a container of its own rather than a role query. " +
      "D-71 says this state offers no failure-shaped affordance at ANY threshold, and the falsifiable " +
      "form of that is a scoped count of ZERO inside this element after the poll has backed off and " +
      "again after the escalation timer has fired. A document-wide count would be answered by the app " +
      "shell (the header's own controls) and a role query cannot express \"none of these, inside this " +
      "box\" at all. " +
      "IT IS ALSO NOT ADDRESSABLE BY ITS OWN LIVE REGION, even though it carries the one region this " +
      "phase keeps: `getByRole(\"status\")` on this route resolves against whichever region is up at " +
      "the moment it runs — the route's loading plate carries one too — and on a page that re-renders " +
      "itself every 2.5s that ambiguity is exactly what the assertion is trying to resolve. Matching " +
      "the heading instead would be circular in the way this contract's other payment-state rows " +
      "describe: the three headings are the copy under revision.",
    owner: "13-07",
  },

  // ─── 13-09 ─────────────────────────────────────────────────────────────────────────────────────────
  "trust-block": {
    why:
      "IT IS A `<dl>` CONTAINER, AND A DEFINITION LIST HAS NO ROLE ANY QUERY CAN REACH FOR. Both of " +
      "this block's assertions are about the BOX rather than about anything inside it. " +
      "THE CLOSED-SET ASSERTION IS A COUNT SCOPED TO THIS ELEMENT: D-68 fixes the booker-facing signal " +
      "set at FOUR, each mapped to a real column, so the falsifiable form of \"closed\" is `exactly " +
      "four rows inside this container` — and a fifth row fails it whatever the fifth row says, which " +
      "is the whole point, because the realistic invented signal is the one no word list anticipated. " +
      "A document-wide row count cannot express it: every status branch of `/bookings/[id]` already " +
      "renders a second `<dl>` (Space / When / Total), so counting `dt` elements across the page " +
      "answers about the wrong list. Nor can the copy carry it — matching on the four sentences would " +
      "be circular in the way this contract's money-adjacent rows describe, since those sentences ARE " +
      "the thing under revision, and one of the four is chosen per `booking_mode` so a text query " +
      "would have to know the listing's mode in order to find the element that proves the mode was " +
      "stated. " +
      "THE PER-STATUS PRESENCE ASSERTION IS THE OTHER HALF, AND IT IS THE REASON THE HOOK CANNOT BE " +
      "SKIPPED: D-67 requires this block on EVERY status, including the ones that look wrong, because " +
      "trust matters most when something has. That is one count of ONE per branch across eight " +
      "renders, and the branches share no heading, no landmark and no accessible name to key on. " +
      "THE HOOK SITS ON THE `<dl>` AND NOT ON THE SURROUNDING PATTERN: `PanelCard` owns its own " +
      "`panel-card` id and takes no pass-through props, so a second id on it is not expressible — the " +
      "shape `money-statement` already records from the other side.",
    owner: "13-09",
  },

  // ─── 13-10 ─────────────────────────────────────────────────────────────────────────────────────────
  "booking-detail": {
    why:
      "IT IS A `<section>` WITH NO ROLE, and it is the SIBLING every BFLOW-08 assertion has to address " +
      "rather than the thing they are about. A `<section>` acquires the `region` role only when it " +
      "carries an accessible name, and naming this one would put a landmark inside the layout's `main` " +
      "for no reader's benefit — the `<h1>` immediately inside it already says what the page is. " +
      "THE TWO ASSERTIONS THAT NEED IT ARE BOTH GEOMETRIC OR ABOUT ABSENCE. D-60's decay is falsifiable " +
      "as: on the confirmation moment's first paint this element starts BELOW the fold (its " +
      "`boundingBox().y` is greater than the viewport height), and on a later visit with no query " +
      "string the moment is ABSENT while this renders alone. A box is what has to be measured for the " +
      "first, and an element count for the second — neither is expressible as a role or a name, and a " +
      "text query would be circular in the way this contract's money-adjacent rows describe, since the " +
      "copy inside varies across all ten status renders. " +
      "IT IS ALSO NOT ADDRESSABLE BY THE SHELL AROUND IT: `BOOKING_SHELL` is a className shared with " +
      "`cancel/page.tsx`, `group/page.tsx`, three `loading.tsx` files and the four payment/lapse state " +
      "components, so a container query keyed on it resolves on routes this hook has nothing to say " +
      "about. THE HOOK SITS ON THE SECTION AND NOT ON THE SHELL `div` for exactly that reason.",
    owner: "13-10",
  },

  // ─── 13-11 ─────────────────────────────────────────────────────────────────────────────────────────
  "confirmation-moment": {
    why:
      "IT IS A `<section>` WITH NO ROLE, and both assertions it exists for are about its BOX and its " +
      "ABSENCE rather than about anything inside it. A `<section>` acquires the `region` role only " +
      "when it carries an accessible name, and naming this one would put a landmark inside the " +
      "layout's `main` for no reader's benefit — the `<h1>` immediately inside it already says what " +
      "the screen is. " +
      "THE FIRST ASSERTION IS A MEASUREMENT, AND IT IS WHAT MAKES BFLOW-08 FALSIFIABLE. The " +
      "requirement asks for a *distinct* confirmation moment, which is an adjective; the executable " +
      "form is a height on THIS element of at least the viewport minus the header, beside " +
      "`booking-detail`'s own top edge sitting at or past the viewport height — the ordinary page " +
      "starts below the fold. Neither is expressible as a role, a name or a text query, and a box has " +
      "to be addressed before it can be measured. " +
      "THE SECOND IS AN ABSENCE, WHICH IS THE DECAY ITSELF (D-60). After the client rewrites the URL " +
      "in place, a reload must render `booking-detail` and ZERO of this element. An element COUNT is " +
      "the only form that expresses it: a role query would resolve against the detail's own content " +
      "and report a pass on the very document the assertion is trying to distinguish. " +
      "A TEXT QUERY WOULD ALSO BE CIRCULAR in the way this contract's copy-adjacent rows describe — " +
      "the `<h1>` is one of two strings chosen per booking mode, so matching on it would require " +
      "knowing the mode in order to find the element that proves the mode was stated. " +
      "IT IS NOT ADDRESSABLE BY ITS SHELL EITHER: `BOOKING_SHELL` is a className shared with the " +
      "detail branches, `cancel/page.tsx`, `group/page.tsx`, three `loading.tsx` files and the four " +
      "payment/lapse state components, so a container query keyed on it resolves on routes this hook " +
      "has nothing to say about.",
    owner: "13-11",
  },
};
