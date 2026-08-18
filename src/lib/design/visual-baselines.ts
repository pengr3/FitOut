// GATE-01 — THE declared visual-regression baseline inventory. Every screenshot this milestone is
// allowed to pin, each with the reason it is worth pinning, plus the ONE theme-swap exclusion carried
// as data with its argument attached.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY AN INVENTORY AT ALL — THE SAME ARGUMENT `contrast-pairs.ts` MAKES, IN A HARSHER DOMAIN
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// "We have visual regression" is not a checkable claim. A VR suite's coverage is exactly the set of
// baselines that happen to exist on disk, and that set is invisible: a baseline nobody shot and a
// baseline somebody deleted look identical in a green run — both are silence. `contrast-pairs.ts:5-9`
// makes this argument about colour pairs; it is worse here, because a missing PNG does not even leave
// a row behind to notice.
//
// So the set is DECLARED, in one typed place, and the specs iterate the declaration rather than the
// filesystem. A baseline that stops being shot is then a spec that stops running against a declared
// row, which is a failure with a name.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE SCOPING RULE — WHAT IT WAS, AND WHAT PHASE 12 DID TO IT (11-UI-SPEC / 12-UI-SPEC § GATE-01)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// **Phase 11 baselined ONLY DB-free surfaces.** A baseline that needs seeded data is flaky, and a
// flaky gate is retried until green — a rubber stamp with extra steps. So Phase 11 named Phases 12-15
// as the ones that would baseline product surfaces WITH THEIR OWN COMMITTED FIXTURES, and left a row
// blocked (`og-listing`) rather than shoot it against nothing.
//
// PLAN 12-14 DISCHARGED THAT FOR PHASE 12, and the rule it replaced the old one with is narrower
// rather than weaker: a baselined surface may read a SEEDED EPHEMERAL DATABASE and must need NOTHING
// ELSE. The fixture is `scripts/seed-baseline-fixtures.ts` — committed, deterministic (fixed ids,
// coordinates, rates, photo urls and a fixed collision window), idempotent, and secret-free; the one
// job that can write a baseline seeds it into a service container it also destroys
// (`.github/workflows/baselines.yml`, whose header carries the whole argument). A surface that needs a
// REAL credential has left GATE-01's scope, and the fix is this inventory, not a secret in the one job
// with `contents: write`.
//
// ONE OF THE 53 ROWS IS STILL BLOCKED (`global-error`, for a structural reason that has nothing to do
// with data), so a complete run commits 52 PNGs; anyone reading "53 baselines" as "53 files" is wrong
// by exactly that one, which is why the count is stated here and pinned in `surfaces.spec.ts`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE COMPILE GATES, AND WHY THEY ARE HERE RATHER THAN IN A TEST
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The specs that read this file live in the `visual` Playwright project, and `playwright.config.ts`
// does not construct that project off Linux (D-29). So on every developer machine in this project —
// all of which are Windows or macOS — NOTHING would check the two counts this file's acceptance
// rests on. A criterion checked only in an environment nobody runs is not a criterion.
//
// `BaselineCountIsFiftyThree` and `ThemeSwapExclusionCountIsOne` below are therefore type-level
// assertions, enforced by `npx tsc --noEmit` and by `next build`'s own type check — which runs inside
// `npm run build`, which is CI job 1. They fail on EVERY machine, in the build, before a browser is
// involved. Watched failing rather than assumed — three mutations, three distinct errors, recorded
// verbatim in the OBSERVED RED block that sits directly above the two aliases.
//
// The runtime half — that the exclusion is a surface the smoke would OTHERWISE have compared, and
// that the compared set is not empty — belongs to `e2e/visual/theme-swap.spec.ts`, because it is a
// claim about what a run did rather than about what this file says.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHERE THIS FILE LIVES — the same reason `contrast-pairs.ts:11-14` and `selector-contract.ts:91-95`
// give for theirs. `src/lib/design/` is outside the DS-13 leak gate's scanned tree
// (`config/design-leak-patterns.mjs` → LEAK_SCAN_PREFIXES covers `src/app/**` and
// `src/components/**` only), so this module can quote route paths and pixel widths honestly without
// needing a per-line exemption.

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** The two brand directions. Mirrors `THEMES` in `src/components/theme/theme-provider.tsx`. */
export type BaselineTheme = "court" | "grove";

/**
 * What kind of thing the surface IS, which decides whether a theme swap is even a question.
 *
 * `document` — an app page, served into a browser, whose `<html>` carries `data-theme`. A theme swap
 *   is observable, so the D-135 smoke applies and any surface that ignores it must be EXCLUDED with
 *   an argument.
 * `image`    — a server-rendered `opengraph-image` route. There is no user, no `data-theme` and no
 *   `prefers-color-scheme`: the scraper fetching it is not a browser session. A theme swap is not
 *   something these surfaces failed to do — it is something that cannot be asked of them, which is a
 *   different statement and is why they are a KIND rather than three more exclusions.
 *   (`src/app/opengraph-image.tsx`'s header states this from the route's side and names this plan.)
 */
export type SurfaceKind = "document" | "image";

/** One baselined surface. Every field is mandatory; `blocked` is `null` when the surface is shot. */
export type SurfaceRow = {
  readonly kind: SurfaceKind;
  /**
   * The path the spec drives, or `null` when nothing in this repository can reach the surface at all
   * (in which case `blocked` says so). A `null` here is never a shrug: it is paired with a reason.
   */
  readonly url: string | null;
  /**
   * A CSS selector that MUST match at least once before any pixel is compared.
   *
   * Trap 1 from `e2e/scroll-area-overflow.spec.ts:33-39`, in its most dangerous form yet. A
   * screenshot assertion against a blank page, a 404 or a 500 does not fail — it MINTS A BASELINE OF
   * THE WRONG PAGE, and every run afterwards compares against it and passes. That failure is
   * permanent and silent, which is worse than any of the vacuous scans this phase has recorded.
   */
  readonly hook: string;
  /** Why that selector proves the surface actually rendered its subject, rather than merely loading. */
  readonly hookWhy: string;
  /**
   * `null` when the surface is shot; otherwise the reason it CANNOT be, stated in full.
   *
   * The plan's instruction is verbatim: *"Any surface that cannot be reached is skipped with a NAMED
   * REASON, never silently."* An absent baseline and an argued block look the same in a green run,
   * and only one of them is a decision.
   */
  readonly blocked: string | null;
};

/** One baseline: a surface at a width in a theme. `why` is mandatory — a row without one is not a row. */
export type BaselineRow = {
  readonly surface: SurfaceId;
  readonly width: number;
  /**
   * The viewport height. Every document baseline is captured `fullPage`, so this sets the initial
   * viewport (and therefore anything sized in `vh`) rather than the image height.
   */
  readonly height: number;
  readonly theme: BaselineTheme;
  readonly why: string;
};

/** One theme-swap exclusion. `surface` is typed to DOCUMENT surfaces — see `DocumentSurfaceId`. */
export type ThemeSwapExclusion = {
  readonly surface: DocumentSurfaceId;
  readonly reason: string;
};

// ---------------------------------------------------------------------------
// The surfaces
// ---------------------------------------------------------------------------

/**
 * Every surface with at least one baseline. Ordered as the UI-SPEC tables order them — 11-UI-SPEC
 * § GATE-01 first, then 12-UI-SPEC § Visual Baselines — so the lists can be read side by side.
 *
 * ⚠ `og-listing` IS NOT IN THE PHASE-12 BLOCK EVEN THOUGH 12-UI-SPEC's TABLE ENDS WITH IT. The row
 * already existed (blocked, for want of a published listing), and plan 12-14 UNBLOCKS it rather than
 * adding it. Moving the id down to match a table's order would have read as a new surface and hidden
 * the one fact worth seeing: this is the row Phase 11 deferred, arriving with a fixture.
 */
export const SURFACE_IDS = [
  // ─── 11-22 — the chrome, the legal group and the three share cards ───────────────────────────────
  "dev-theme",
  "terms",
  "privacy",
  "root-not-found",
  "global-error",
  "auth-login",
  "og-root",
  "og-listing",
  "og-invite",
  // ─── 12-14 — the booker path's seven product surfaces, in 12-UI-SPEC's table order ───────────────
  "search-results",
  "search-relax-band",
  "listing-detail",
  "listing-lightbox",
  "listing-sheet",
  "checkout",
  "collision-notice",
] as const;

/** The closed union every baseline row and every exclusion is typed against. */
export type SurfaceId = (typeof SURFACE_IDS)[number];

/**
 * Every surface's row. `as const satisfies Record<…>` rather than a plain annotation, and both halves
 * are load-bearing: `satisfies` keeps this a TOTAL record (adding a name to `SURFACE_IDS` without a
 * row is a compile error, exactly as in `selector-contract.ts`), while `as const` preserves the
 * literal `kind` values that `DocumentSurfaceId` below is derived from. An annotation alone would
 * widen `kind` to `SurfaceKind` and silently make that derivation return every id.
 */
export const VISUAL_SURFACES = {
  // ─── the primary surface ────────────────────────────────────────────────────────────────────────
  "dev-theme": {
    kind: "document",
    url: "/dev/theme",
    // 11-21's finding, and it is not a style preference: `[data-theme="court"]` ALSO matches
    // `<html>`, because next-themes writes the attribute there. A pane locator must be scoped to the
    // element type or it silently matches the document element and reports two panes where there is
    // one. `grove` is used because the root is court by default (D-06), so a bare attribute match
    // would be ambiguous in the direction that reads as success.
    hook: 'div[data-theme="grove"]',
    hookWhy:
      "the grove PANE — the nested `[data-theme]` subtree whose re-skinning is the entire point of " +
      "this route (THEME-04). If `@theme inline` were ever dropped, this pane would render the root " +
      "theme and the page would still look plausible; the pane existing is the weakest thing worth " +
      "asserting before comparing pixels, and it is enough to reject a 404 or a blank compile.",
    blocked: null,
  },

  // ─── the legal group ────────────────────────────────────────────────────────────────────────────
  terms: {
    kind: "document",
    url: "/terms",
    hook: '[data-testid="legal-placeholder-notice"]',
    hookWhy:
      "the placeholder notice `tests/design/legal-copy.test.ts` pins by string equality. It is the " +
      "one element on this page that cannot be present by accident, and its absence is the exact " +
      "state AC#4 forbids (real-looking terms that are filler).",
    blocked: null,
  },
  privacy: {
    kind: "document",
    url: "/privacy",
    hook: '[data-testid="legal-placeholder-notice"]',
    hookWhy: "same notice, same argument as `/terms` — the two legal pages are one composition.",
    blocked: null,
  },

  // ─── the chrome-only surfaces ───────────────────────────────────────────────────────────────────
  "root-not-found": {
    kind: "document",
    // Any path that matches no route. Spelled as a sentence rather than something short, because a
    // short one is a path somebody might later add — and the day `/nope` becomes a route, this
    // baseline silently starts pinning that page instead.
    url: "/this-path-matches-no-route-and-must-never-become-one",
    hook: '[data-testid="site-header"]',
    hookWhy:
      "`src/app/not-found.tsx` composes its OWN chrome (`SiteChrome` + `AnonymousAuthActions`) " +
      "because the root layout carries none. The header is therefore the proof that the not-found " +
      "PAGE rendered rather than the framework's bare fallback, which carries no chrome at all.",
    blocked: null,
  },
  "global-error": {
    kind: "document",
    url: null,
    hook: "h1",
    hookWhy:
      "the document renders no `data-testid` at all — it renders no utility class either, because " +
      "the stylesheet that would define one is not loaded (see the file's header). Its `<h1>` is the " +
      "only stable handle it has. Moot while the row is blocked.",
    blocked:
      "NOTHING IN THIS REPOSITORY CAN RENDER THIS SURFACE, and plan 11-22's own instruction to " +
      "'drive it through the dev throw affordance plan 11-18 added' is not satisfiable: " +
      "`/dev/throw` throws inside a PAGE, and `src/app/error.tsx` — the root route boundary — " +
      "catches every page throw in the tree. `global-error.tsx` renders only when the ROOT LAYOUT " +
      "itself throws, and there is no affordance for that. `deferred-items.md:268-270` (plan 11-18) " +
      "reached the same conclusion independently and addressed the open `<title>` question to this " +
      "plan on the assumption a browser would have this surface; it does not. The two ways to " +
      "manufacture one are both refused here rather than taken quietly: reading a request signal in " +
      "`src/app/layout.tsx` makes EVERY route dynamic and destroys the only two `○ Static` routes in " +
      "the build (11-19 measured exactly that counterfactual), and rendering the component inside a " +
      "dev page nests a second `<html>` in the root layout's, producing a document that is not the " +
      "one that ships — a baseline of a fake. Both are architectural (deviation Rule 4) and neither " +
      "is scoped by this plan. The row stays declared so the gap is a decision somebody can find.",
  },
  "auth-login": {
    kind: "document",
    url: "/login",
    hook: '[data-testid="site-header"]',
    hookWhy:
      "`(auth)/layout.tsx` renders `PublicHeader` + `SiteFooter`; the header is the composition this " +
      "baseline exists to pin. It also fails loudly if the anonymous session read ever starts " +
      "reaching the database, which would take this surface out of the DB-free scope silently.",
    blocked: null,
  },

  // ─── the three share cards ──────────────────────────────────────────────────────────────────────
  "og-root": {
    kind: "image",
    url: "/opengraph-image",
    hook: "img",
    hookWhy:
      "the card is loaded into an `<img>` and its `naturalWidth`/`naturalHeight` are asserted to be " +
      "1200 × 630 before any pixel is compared — see `surfaces.spec.ts`. A 404, a 500 or an empty " +
      "body all decode to 0 × 0, so this is a stronger reachability check than any selector.",
    blocked: null,
  },
  "og-listing": {
    kind: "image",
    // ⚠ THE ID IN THIS PATH IS A FIXTURE CONSTANT SPELLED AS A LITERAL, AND THE SPEC PINS THE PAIR.
    // `scripts/seed-baseline-fixtures.ts` exports `VRT_IDS.exclusive`, and that module cannot be
    // imported here: it is a `postgres`-importing script, and this file is inside `src/` and therefore
    // inside `next build`'s graph. So the id is duplicated — which its own header warns about
    // ("renaming one orphans a declared surface, and `tsc` will not catch it, because a baseline row's
    // URL is a string"). `e2e/visual/surfaces.spec.ts` closes that with a runtime equality against the
    // exported constant, so a renamed fixture id fails a spec instead of silently baselining a 404.
    url: "/listings/vrt_listing_exclusive/opengraph-image",
    hook: "img",
    hookWhy:
      "same 1200 × 630 decode check as the root card — AND, for this row alone, two assertions no " +
      "selector can make (D-58). The captured PNG's byte length must not equal 25,844 and must not " +
      "equal the root card's length read in the SAME run, and the listing page's own `og:title` must " +
      "carry the seeded title. See the spec: the decode check cannot tell this card from the fallback, " +
      "because the fallback is a valid 1200 × 630 PNG.",
    blocked: null,
  },
  "og-invite": {
    kind: "image",
    // ⚠ The `-ikagei` suffix is NOT optional and NOT a typo. Next's `getMetadataRouteSuffix` appends
    // a 6-character djb2 hash of the parent path whenever any parent segment is a route group, and
    // plan 11-10's `(public)` group is what puts it there. The unsuffixed path is a 404 — measured in
    // 11-20 and recorded in `deferred-items.md:205`. `listings/[id]` has no group and so has no
    // suffix, which is why the row above looks different.
    url: "/invite/visual-baseline-probe-token/opengraph-image-ikagei",
    hook: "img",
    hookWhy:
      "same 1200 × 630 decode check. This route reads no token and returns the same bytes for every " +
      "one (T-11-OGCRED), so the token in the URL above is arbitrary by design — and the fact that " +
      "an arbitrary token produces a valid card is itself part of what this baseline pins.",
    blocked: null,
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // PHASE 12 — THE BOOKER PATH (plan 12-14). THE FIRST SURFACES IN THIS INVENTORY THAT READ A DATABASE.
  //
  // FOUR OF THE SEVEN CANNOT BE REACHED BY A `goto`, AND THAT IS WHY `e2e/helpers/visual-drive.ts`
  // EXISTS. A lightbox, a bottom sheet, a checkout and a refused hold are STATES, not URLs: the first
  // two are reached by an interaction, the third only exists behind a `?hold=` a POST minted, and the
  // fourth only exists for as long as a hold has just been refused. Each `url` below is still the path
  // the surface ends on — it is what the failure messages name and what a reader has to be able to
  // check — but the DRIVE is per-surface, and it is shared with `theme-swap.spec.ts` through a helper
  // module because a spec cannot import a spec (`visual-freeze.ts`'s header records the reason).
  //
  // EVERY HOOK HERE IS CHOSEN TO FAIL ON THE STATE ONE STEP BEFORE THE ONE BEING CAPTURED. That is a
  // stronger requirement than "the page loaded", and it is the requirement this phase's surfaces
  // actually need: a closed lightbox, an unopened sheet, a checkout still showing `book/loading.tsx`
  // and a collision that never fired all render perfectly plausible pages. A baseline of any of them
  // is a reference that is wrong forever and that every future run agrees with.
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════

  "search-results": {
    kind: "document",
    // The origin is the fixture's `VRT_ORIGIN` (Makati CBD). Four of the five seeded listings sit
    // inside the default radius; the fifth is the far tennis court the row below needs.
    url: "/?lat=14.5547&lng=121.0244",
    hook: '[data-testid="result-card"]',
    hookWhy:
      "a search TILE, which is the only thing on this route that cannot be present unless the query " +
      "ran and returned rows. `/` streams, and its own `loading.tsx` renders a second `SearchBar` " +
      "(measured in `e2e/helpers/booker-seed.ts`: `#search-category` appears twice while the boundary " +
      "resolves), so every piece of chrome on this page — the bar, the header, the page title — is " +
      "present in the PENDING shell too. A hook on any of them would be satisfied by the skeleton and " +
      "would baseline a grid of placeholder plates.",
    blocked: null,
  },

  "search-relax-band": {
    kind: "document",
    // Rung 1 of the ladder, driven from the URL. `tennis_court` is the ONLY category with no supply
    // inside 10 km — the fixture's far tennis court sits ~20 km out and is the whole point of the row
    // (see `scripts/seed-baseline-fixtures.ts`, which states the property rather than trusting the
    // distance to speak for itself). `RADIUS_PRESETS` is [2, 5, 10, 25], so 10 has exactly one rung
    // above it: zero results at 10 km, one at 25 km.
    url: "/?lat=14.5547&lng=121.0244&category=tennis_court&radius=10",
    hook: '[data-testid="search-relax-band"]',
    hookWhy:
      "the band ITSELF, which is the new surface — the grid beneath it is already covered by " +
      "`search-results`. It is `role=\"status\"`, and a role query would ALSO match " +
      "`CardGridSkeleton`'s `role=\"status\" aria-busy` plate on every pending navigation " +
      "(`selector-contract.ts` records exactly this ambiguity), so on a transition the hook would be " +
      "green for the plate. And the failure this hook must catch is the one that looks most like " +
      "success: if a future edit ever adds tennis supply inside 10 km, the query stops being " +
      "zero-result, the band never renders, and a baseline captured then is a picture of a normal " +
      "result list filed under the band's name.",
    blocked: null,
  },

  "listing-detail": {
    kind: "document",
    // ⚠ `?date=` IS NOT DECORATION, IT IS WHAT MAKES THIS BASELINE DETERMINISTIC. Without it the page
    // renders `todayLocal` (`(detail)/page.tsx` → `initialDate`), so the month grid, the highlighted
    // day and the set of disabled past days all change WITH THE WALL CLOCK — a baseline that goes red
    // tomorrow for no reason, which is the flake that gets a threshold widened. The date is the
    // fixture's own `VRT_COLLISION.dayIso`, so the hour grid underneath it also shows the seeded
    // conflict's two struck-through hours: a picture of real availability, not of an empty day.
    url: "/listings/vrt_listing_exclusive?date=2026-09-16",
    hook: '[data-testid="listing-key-facts"]',
    hookWhy:
      "the key-facts strip — BFLOW-02's `<dl>`, which only the RESOLVED page renders. This route has a " +
      "`loading.tsx` that renders a `PanelSkeleton` and a `skeleton-calendar` plate, and the trap is " +
      "sharper than it looks: `e2e/hold-countdown.spec.ts` measured a sibling route whose skeleton " +
      "renders the SAME `<h1>` as the resolved page, so a heading hook passed against a skeleton and " +
      "the assertion under it read as a component defect. The strip has no skeleton twin, and its " +
      "presence also proves the three-table join resolved rather than the not-found boundary rendering.",
    blocked: null,
  },

  "listing-lightbox": {
    kind: "document",
    url: "/listings/vrt_listing_exclusive?date=2026-09-16",
    hook: '[data-testid="photo-lightbox"]',
    hookWhy:
      "the lightbox's own hook, and it is the only handle that can prove the overlay OPENED. " +
      "`getByRole(\"dialog\")` cannot: from plan 12-10 this same document also mounts a booking view " +
      "in a `ResponsiveDialog`, so a role query resolves whichever mounted first (`selector-contract` " +
      "records this as the reason the id exists at all). Without this hook the capture of a lightbox " +
      "whose trigger click was LOST — the measured failure mode of a server-rendered control that is " +
      "clickable before React has attached its handler, this repository's fourth sighting — is a " +
      "baseline of the listing page with no overlay, filed under the lightbox's name, green forever.",
    blocked: null,
  },

  "listing-sheet": {
    kind: "document",
    url: "/listings/vrt_listing_exclusive?date=2026-09-16",
    // Scoped INSIDE the overlay on purpose. `booking-panel` alone resolves to TWO elements on this
    // route by design (RESP-02 mounts the panel in the rail and in the sheet), and `expectReachable`
    // reads `.first()` — so an unscoped hook is satisfied by the RAIL's panel on a page where the
    // sheet never opened. The descendant combinator is what makes the assertion about the sheet.
    hook: '[data-testid="responsive-dialog"] [data-testid="booking-panel"]',
    hookWhy:
      "RESP-02 and D-48 in one selector: the ONE overlay primitive is mounted, and the booking view " +
      "is INSIDE it rather than beside it. Both halves are load-bearing. The overlay alone would be " +
      "satisfied by any `ResponsiveDialog` on the route; the panel alone is satisfied by the rail's " +
      "copy at any width, including the widths where the sheet does not exist at all (the sticky bar " +
      "that opens it is `lg:hidden`, which is why this surface is baselined at 375 and nowhere else).",
    blocked: null,
  },

  checkout: {
    kind: "document",
    // ⚠ THIS PATH IS NOT NAVIGABLE, AND THE ROW IS STILL HONEST. `book/page.tsx` 404s without a
    // session AND without a `?hold=<id>` that the POST `placeHold` action minted — a GET render that
    // created a hold would duplicate it on every prefetch (T-04-GETDUP), so there is deliberately no
    // way to reach this surface by typing a URL. The driver signs a booker up, seeds the window from
    // the URL, presses the hold CTA and lands here; the query string it arrives with carries a
    // per-run hold id and is therefore NOT part of this literal.
    url: "/listings/vrt_listing_exclusive/book",
    hook: '[data-testid="price-total"]',
    hookWhy:
      "the checkout's ONE total, and the shipped reachability signal for this exact route " +
      "(`e2e/hold-countdown.spec.ts` uses it for the same reason, measured rather than chosen): " +
      "`book/loading.tsx` renders a `<h1>Confirm and pay</h1>` IDENTICAL to the resolved page's, so a " +
      "heading hook is satisfied by the skeleton. It also rejects the two other pages this URL can " +
      "legitimately produce — `HoldExpiredState` (D-44) carries no total and no `<main>`, and a " +
      "confirmed hold redirects away (D-42) — either of which would otherwise become the reference " +
      "for a surface whose whole subject is a LIVE hold.",
    blocked: null,
  },

  "collision-notice": {
    kind: "document",
    // The surface is a STATE of the listing page, not a route: a hold that was refused because the
    // hours went while the booker was looking at them. STATE-07 / D-55's requirement is that it lands
    // IN PLACE, so the URL is deliberately the listing page's own.
    url: "/listings/vrt_listing_exclusive?date=2026-09-16",
    hook: '[data-testid="collision-notice"]',
    hookWhy:
      "the notice, which exists ONLY after a hold has been refused. Everything weaker is satisfied by " +
      "the page one step earlier: the listing page with a priced selection and an enabled CTA is what " +
      "the booker was looking at a moment before, and it is a perfectly plausible frame. This is also " +
      "the one hook in this file whose ABSENCE has two different causes worth telling apart, and the " +
      "driver tells them apart rather than leaving them to a timeout — a hold that was GRANTED " +
      "navigates away (the seeded conflict did not take, so the fixture is measuring nothing), while " +
      "a hold that was refused down the plain-notice branch stays put with no notice (D-55 regressed).",
    blocked: null,
  },
} as const satisfies Record<SurfaceId, SurfaceRow>;

/**
 * The surfaces a theme swap can even be asked of, derived from `kind` rather than restated.
 *
 * This is what makes `THEME_SWAP_EXCLUSIONS` load-bearing instead of decorative. If exclusions were
 * typed as `SurfaceId`, excluding an OG card would compile — and it would look like a considered
 * decision while removing nothing, because an image was never a candidate. Typing the field to this
 * union means an exclusion can only ever name something the smoke would otherwise have compared.
 */
export type DocumentSurfaceId = {
  [Id in SurfaceId]: (typeof VISUAL_SURFACES)[Id]["kind"] extends "document" ? Id : never;
}[SurfaceId];

// ---------------------------------------------------------------------------
// The 53 baselines
// ---------------------------------------------------------------------------

/**
 * Every baseline, in the UI-SPEC tables' own order and adding up to their own totals:
 *
 *   ── 11-UI-SPEC § GATE-01 (plan 11-22) ──────────────────────────────────────────────────────
 *   /dev/theme          320 / 768 / 1280   one shot per width, both themes in frame     3
 *   /terms, /privacy    320 / 768 / 1280   both themes                                 12
 *   root not-found      320 / 1280         both themes                                  4
 *   global-error        1280               court only                                   1
 *   (auth) login        320 / 1280         both themes                                  4
 *   listing/invite/root OG   1200 × 630    court only                                   3
 *                                                                         SUBTOTAL     27
 *
 *   ── 12-UI-SPEC § Visual Baselines (plan 12-14) ─────────────────────────────────────────────
 *   / with results      320 / 768 / 1280   both themes                                  6
 *   / zero-result band  320 / 1280         both themes                                  4
 *   /listings/[id]      320 / 768 / 1280   both themes                                  6
 *   listing lightbox    1280               both themes                                  2
 *   listing sheet       375                both themes                                  2
 *   /listings/[id]/book 320 / 1280         both themes                                  4
 *   collision notice    1280               both themes                                  2
 *                                                                         SUBTOTAL     26
 *                                                                            TOTAL     53
 *
 * The eighth row of 12-UI-SPEC's table — the listing OG card — is NOT in the Phase-12 subtotal. It is
 * the `og-listing` row already counted in the 27: plan 12-14 UNBLOCKED it with a fixture rather than
 * adding it, so counting it twice is the one arithmetic mistake this table exists to prevent.
 *
 * The `{arg}` each row produces is `{surface}-{width}-{theme}.png` (see `baselineArg`), which
 * Playwright expands to `{arg}-visual-linux.png` — the ONLY filename shape `.gitignore` permits to be
 * committed, and the shape `tests/design/gitignore-baselines.test.ts` polices the complement of.
 */
export const VISUAL_BASELINES = [
  // ─── /dev/theme — 3 ─────────────────────────────────────────────────────────────────────────────
  // ONE shot per width rather than two. The page renders court and grove SIDE BY SIDE in nested
  // `[data-theme]` panes, so both themes are already in every frame; the seeded theme paints only the
  // header strip and the page background, which is what the theme-swap smoke reads. Shooting it twice
  // would double the largest baselines in the set to pin the same two panes again.
  {
    surface: "dev-theme",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the 320px floor, where the two panes stack single-column. This is the width the pattern " +
      "layer's wrap-rather-than-truncate rules are written for, and the one a regression reaches " +
      "first.",
  },
  {
    surface: "dev-theme",
    width: 768,
    height: 1024,
    theme: "court",
    why:
      "the tablet width — still single-column (the panes split at `lg`, 1024px), so this pins the " +
      "layout between the floor and the split rather than a third copy of either.",
  },
  {
    surface: "dev-theme",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "the two-column comparison view: all 14 sections, both panes, side by side. This is the " +
      "single most load-bearing baseline in the set — it is the only one that pins every pattern " +
      "component, both empty tones, the error state, both sheet presentations, the three skeleton " +
      "shapes and the auth-slot fallback in one image.",
  },

  // ─── /terms and /privacy — 12 ───────────────────────────────────────────────────────────────────
  {
    surface: "terms",
    width: 320,
    height: 720,
    theme: "court",
    why: "long-form prose at the floor: the measure, the type ladder and the notice must survive 320px.",
  },
  {
    surface: "terms",
    width: 320,
    height: 720,
    theme: "grove",
    why: "the same layout in the second brand direction — prose colour is where a token miss is most visible.",
  },
  {
    surface: "terms",
    width: 768,
    height: 1024,
    theme: "court",
    why: "the width at which `max-w-prose` (65ch) starts constraining rather than the viewport.",
  },
  {
    surface: "terms",
    width: 768,
    height: 1024,
    theme: "grove",
    why: "second theme at the measure-constrained width.",
  },
  {
    surface: "terms",
    width: 1280,
    height: 800,
    theme: "court",
    why: "the desktop reading view — the measure, the header and the footer in one frame.",
  },
  {
    surface: "terms",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop; the pair is what proves the group re-skins at all.",
  },
  {
    surface: "privacy",
    width: 320,
    height: 720,
    theme: "court",
    why: "the second legal page at the floor. It is a separate page with separate copy, so a shared layout regression can land on one and not the other.",
  },
  {
    surface: "privacy",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor.",
  },
  {
    surface: "privacy",
    width: 768,
    height: 1024,
    theme: "court",
    why: "the measure-constrained width.",
  },
  {
    surface: "privacy",
    width: 768,
    height: 1024,
    theme: "grove",
    why: "second theme at the measure-constrained width.",
  },
  {
    surface: "privacy",
    width: 1280,
    height: 800,
    theme: "court",
    why: "desktop reading view.",
  },
  {
    surface: "privacy",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── root not-found — 4 ─────────────────────────────────────────────────────────────────────────
  {
    surface: "root-not-found",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the surface every mistyped URL in the product reaches, at the floor. It composes its own " +
      "chrome, so it is the one page where a shell regression can land without touching any shell " +
      "route.",
  },
  {
    surface: "root-not-found",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor.",
  },
  {
    surface: "root-not-found",
    width: 1280,
    height: 800,
    theme: "court",
    why: "desktop. The 768 width is deliberately absent — the UI-SPEC asks for two widths here, and this page has no layout change between them.",
  },
  {
    surface: "root-not-found",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── global-error — 1 ───────────────────────────────────────────────────────────────────────────
  {
    surface: "global-error",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "COURT ONLY, and that is a documented impossibility rather than a missing row: this document " +
      "renders its own `<html>` and receives none of the app's global styles, so no `data-theme` " +
      "ever reaches it. One width, because the surface is a centred 32rem panel with nothing that " +
      "reflows. Currently BLOCKED — see the surface's `blocked` reason.",
  },

  // ─── (auth) login — 4 ───────────────────────────────────────────────────────────────────────────
  {
    surface: "auth-login",
    width: 320,
    height: 720,
    theme: "court",
    why: "the `(auth)` shell at the floor: `PublicHeader` + the form card + `SiteFooter`.",
  },
  {
    surface: "auth-login",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor.",
  },
  {
    surface: "auth-login",
    width: 1280,
    height: 800,
    theme: "court",
    why: "desktop: the header's auth slot resolved to the anonymous cluster, which is the state every visitor first sees.",
  },
  {
    surface: "auth-login",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── the three share cards — 3 ──────────────────────────────────────────────────────────────────
  // 1200 × 630 is the card's own natural size, not a viewport choice: `OG_SIZE` in
  // `src/app/og-render.ts`. Each is captured as an ELEMENT screenshot of the decoded `<img>`, so the
  // baseline is the card and not a browser's image-viewer chrome around it.
  {
    surface: "og-root",
    width: 1200,
    height: 630,
    theme: "court",
    why:
      "the card every FitOut link unfurls with unless a route overrides it. Court only: a " +
      "server-rendered image has no user and no `data-theme`, so there is no swap to observe " +
      "(`src/app/opengraph-image.tsx`'s header states this and names this plan).",
  },
  {
    surface: "og-listing",
    width: 1200,
    height: 630,
    theme: "court",
    why:
      "the space's own card — the one share surface that renders real listing facts, which is also " +
      "why it is the row this phase cannot shoot. Court only, same impossibility as the root card. " +
      "Currently BLOCKED — see the surface's `blocked` reason.",
  },
  {
    surface: "og-invite",
    width: 1200,
    height: 630,
    theme: "court",
    why:
      "the CONSTANT invite card. Pinning it pixel-for-pixel is a security assertion as much as a " +
      "visual one (T-11-OGCRED): if this card ever starts varying by token it becomes a probe " +
      "oracle, and a baseline shot against an arbitrary token is the cheapest standing check that " +
      "it does not.",
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // PHASE 12 — 26 ROWS (plan 12-14). Every one reads the committed fixture; four are driven to a state.
  //
  // THE PAIRS ARE THE POINT, AND THEY ONLY WORK IF THE CONTENT IS IDENTICAL. D-135's smoke is
  // `court.png !== grove.png`, and Task 3 asks a human to confirm the pair diverged byte-wise for
  // every surface. That assertion is VACUOUS if the two captures also differ in CONTENT — two
  // different booking windows, two different bookers, two different days would diverge without the
  // tokens moving a pixel. So every drive below is keyed to the SAME fixed window per surface, and the
  // drivers serialize the rows that share one (`e2e/helpers/visual-drive.ts` § slot allocation).
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════

  // ─── `/` with results — 6 ───────────────────────────────────────────────────────────────────────
  {
    surface: "search-results",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the demand-side front door at the floor, where BFLOW-01's grid is single-column and each " +
      "tile's price line — two rate parts plus `Service fee included` — has the least room to stay " +
      "on one line. This is the width a wrap regression reaches first.",
  },
  {
    surface: "search-results",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor; the tile is the most re-skinned component in the product (radius, elevation, display type all move).",
  },
  {
    surface: "search-results",
    width: 768,
    height: 1024,
    theme: "court",
    why: "the tablet width, where the grid is two columns — the only baseline that pins `RESULT_GRID_GAP`'s middle gutter rather than its floor or its desktop value.",
  },
  {
    surface: "search-results",
    width: 768,
    height: 1024,
    theme: "grove",
    why: "second theme at the two-column width.",
  },
  {
    surface: "search-results",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop: the search bar's five controls on one row, the sort control, and the full grid. The " +
      "one baseline in this phase that pins the bar's resolved layout rather than its stacked one.",
  },
  {
    surface: "search-results",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── `/` zero-result WITH the band — 4 ──────────────────────────────────────────────────────────
  // TWO WIDTHS, not three, exactly as 12-UI-SPEC's table asks. The band is a sentence plus an Undo
  // control; it has no layout change between 768 and 1280, and the grid beneath it is already pinned
  // at all three widths by `search-results`.
  {
    surface: "search-relax-band",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "STATE-03's band at the floor. It is the surface where the copywriting contract and the layout " +
      "collide hardest: the sentence names the one constraint that gave AND carries an inline Undo, " +
      "and at 320 that has to wrap without the Undo leaving the reading order.",
  },
  {
    surface: "search-relax-band",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor.",
  },
  {
    surface: "search-relax-band",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop: the band above the relaxed grid, with the widened radius control marked " +
      "`data-relaxed`. This is the frame that shows the whole mechanism at once — what gave, what it " +
      "found, and how to undo it.",
  },
  {
    surface: "search-relax-band",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── `/listings/[id]` — 6 ───────────────────────────────────────────────────────────────────────
  {
    surface: "listing-detail",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the listing at the floor: the mosaic collapses to its single-column template, the rail is " +
      "`max-lg:hidden` and the booking action is the sticky bottom bar. The whole of RESP-02's " +
      "below-`lg:` composition, in one frame.",
  },
  {
    surface: "listing-detail",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor.",
  },
  {
    surface: "listing-detail",
    width: 768,
    height: 1024,
    theme: "court",
    why:
      "the width where the mosaic switches to its `sm:` template and the `Show all 8 photos` control " +
      "appears (it renders iff N > 5 above `sm:`) — a control that exists at exactly two of the three " +
      "declared widths, which is why 768 is not a third copy of either neighbour.",
  },
  {
    surface: "listing-detail",
    width: 768,
    height: 1024,
    theme: "grove",
    why: "second theme at the mosaic's `sm:` template.",
  },
  {
    surface: "listing-detail",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the most load-bearing row of this phase's six: the strip, the mosaic, the six " +
      "`<h2>` sections in their required order, the sticky rail with its own total, the availability " +
      "grid showing the seeded conflict's struck-through hours, and the map panel — all pinned at once.",
  },
  {
    surface: "listing-detail",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── `/listings/[id]` lightbox open — 2 ─────────────────────────────────────────────────────────
  // ONE WIDTH, and captured as the VIEWPORT rather than `fullPage` — see the spec's `captureMode`. A
  // full-page stitch of a scroll-locked document is a picture of a scrolling artefact, not of an
  // overlay anchored to the viewport.
  {
    surface: "listing-lightbox",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "the ONE surface in the whole inventory with a scrim, which makes it the only baseline that can " +
      "see a `--z-*` regression or a scrim opacity change at all. D-45 makes it a raw full-screen " +
      "dialog rather than the RESP-01 pattern, so nothing else in the set pins that composition.",
  },
  {
    surface: "listing-lightbox",
    width: 1280,
    height: 800,
    theme: "grove",
    why:
      "second theme, and the pair is the only standing check that the scrim and the lightbox chrome " +
      "read the tokens — a full-screen overlay is exactly where a vendored component's own palette " +
      "survives longest, because there is no themed page around it to look wrong against.",
  },

  // ─── `/listings/[id]` sheet open — 2 ────────────────────────────────────────────────────────────
  // 375, and ONLY 375: the sticky bar that opens the sheet is `lg:hidden`, so at 1280 there is no
  // trigger and no sheet. 812 is `e2e/mobile-booker-path.spec.ts`'s `PHONE` height, reused rather
  // than invented so the two specs describe the same device.
  {
    surface: "listing-sheet",
    width: 375,
    height: 812,
    theme: "court",
    why:
      "RESP-02 and D-48 together, which is the pair 12-UI-SPEC names: the SAME `BookingPanel` " +
      "component the desktop rail renders, presented in the one overlay primitive, above the sticky " +
      "bar that opened it. A baseline of the rail can never show that the duplicate is the same thing.",
  },
  {
    surface: "listing-sheet",
    width: 375,
    height: 812,
    theme: "grove",
    why: "second theme in the sheet presentation.",
  },

  // ─── `/listings/[id]/book` — 4 ──────────────────────────────────────────────────────────────────
  // ⚠ EVERY ONE OF THESE FOUR REQUIRES THE FROZEN CLOCK. Phase 11 recorded in advance that the first
  // baselined surface rendering a clock must install one in the same change (`e2e/visual/freeze.css`'s
  // header names this phase's countdown), and a checkout baseline without one is a guaranteed flake —
  // the digits differ between the capture and every future run, so the gate is red on a correct tree
  // and somebody widens a threshold. The driver freezes the hold's own deadline to a fixed instant and
  // drives the page clock to exactly 14:52 remaining.
  {
    surface: "checkout",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "BFLOW-06 at the floor: the collapsed price disclosure, the Total, and the checkout's sticky " +
      "bar with `Confirm & pay` — the width at which neither of the bar's two lines may wrap, and the " +
      "one where the countdown's reserved box has the least room beside the brand.",
  },
  {
    surface: "checkout",
    width: 320,
    height: 720,
    theme: "grove",
    why: "second theme at the floor. Money type is where grove's 34/700 display ladder is most visible.",
  },
  {
    surface: "checkout",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop checkout: SHELL-03's minimal header carrying the one countdown at 14:52, the summary, " +
      "the disclosure and the frozen quote. The only baseline in the set that pins a money surface, " +
      "and the only one that pins a rendered clock.",
  },
  {
    surface: "checkout",
    width: 1280,
    height: 800,
    theme: "grove",
    why: "second theme at desktop.",
  },

  // ─── collision notice — 2 ───────────────────────────────────────────────────────────────────────
  {
    surface: "collision-notice",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "STATE-07 / D-55: the window that went, named in the venue's own zone, above a refreshed picker " +
      "in which those hours are already struck through. It is baselined because the requirement is a " +
      "LOOK as much as a behaviour — the sketch's own `What it must never become` section is about " +
      "whether this reads as a normal outcome or as a failure, and nothing but a picture can hold that.",
  },
  {
    surface: "collision-notice",
    width: 1280,
    height: 800,
    theme: "grove",
    why:
      "second theme. The notice is the phase's one status surface with a tone, so the pair is also the " +
      "standing check that its tone comes from `status-tones.ts` rather than from a literal.",
  },
] as const satisfies readonly BaselineRow[];

// ---------------------------------------------------------------------------
// The one theme-swap exclusion
// ---------------------------------------------------------------------------

/**
 * D-135's smoke: for every baselined DOCUMENT surface, `court.png !== grove.png` byte-wise, because
 * two identical two-theme screenshots mean that surface ignored the tokens.
 *
 * EXACTLY ONE exclusion, and it is carried here as data with its argument rather than as a baseline
 * that is quietly absent — `contrast-pairs.ts`'s `EXCLUDED_PAIRS` idiom, for the same reason: an
 * inventory that silently omits a failing case is the exact shape of the defect the gate exists to
 * remove. A zero that is asserted is a contract; a zero that is merely true is an invitation.
 *
 * A SECOND ENTRY MUST BE ARGUED FOR, NOT APPENDED. `ThemeSwapExclusionCountIsOne` below makes adding
 * one a compile error on every machine, so the argument has to be made in the same change that
 * bumps the number — which is the only moment anybody will ever read it.
 */
export const THEME_SWAP_EXCLUSIONS = [
  {
    surface: "global-error",
    reason:
      "it renders its own document and receives no global styles, so an app-level `data-theme` " +
      "attribute never reaches it; identical court/grove screenshots are CORRECT here. This is not a " +
      "surface that was missed and not one that could be fixed by trying harder — `global-error.tsx` " +
      "replaces the root layout by construction, which is Next's documented behaviour and the whole " +
      "reason that file inlines every style it uses.",
  },
] as const satisfies readonly ThemeSwapExclusion[];

// ---------------------------------------------------------------------------
// Compile gates — the two counts, checked on every machine by tsc and by `next build`
// ---------------------------------------------------------------------------

/** `T` must be exactly `true`; anything else is a compile error at the alias that uses it. */
type Assert<T extends true> = T;

// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// OBSERVED RED — 17 August 2026. THREE MUTATIONS, THREE FAILURES, ONE RESTORE. Recorded verbatim,
// because a gate nobody watched fail is not a gate — and a TYPE-LEVEL gate is the easiest kind to
// write in a shape that can never fail (a conditional that is `true` for every input compiles
// forever and reads exactly like this one).
//
// Command for all three: `npx tsc --noEmit`. GREEN is exit 0, no output.
//
//   (a) COUNT, DOWNWARD. The `og-invite` row deleted from `VISUAL_BASELINES`, nothing else changed.
//       EXIT=2, and the whole of stdout was one line:
//
//         src/lib/design/visual-baselines.ts(588,3): error TS2344: Type 'false' does not satisfy
//         the constraint 'true'.
//
//   (b) COUNT, UPWARD. A second row appended to `THEME_SWAP_EXCLUSIONS` (`terms`, with a reason
//       marked PROBE ONLY — i.e. the *plausible* version of this mistake, not a nonsense one).
//       EXIT=2:
//
//         src/lib/design/visual-baselines.ts(608,3): error TS2344: Type 'false' does not satisfy
//         the constraint 'true'.
//
//   (c) THE KIND GATE, which is the one that would otherwise be decorative. The single exclusion's
//       `surface` changed from `"global-error"` to `"og-root"` — excluding a surface that was never
//       a candidate, which reads as a considered decision and removes nothing. EXIT=2, and note
//       this failure is a DIFFERENT error at a DIFFERENT line, naming the id rather than a boolean:
//
//         src/lib/design/visual-baselines.ts(569,5): error TS2322: Type '"og-root"' is not
//         assignable to type 'DocumentSurfaceId'.
//
//   RESTORED → `npx tsc --noEmit` exit 0.
//
// WHAT DID NOT FAIL, which is what makes these gates rather than noise: nothing else in `src/` moved
// in any of the three runs, and each mutation produced exactly ONE error. (a) and (b) name the alias
// rather than the row — that is this gate's honest weakness, and it is why the arithmetic is spelled
// out in prose immediately below rather than left implicit in the literal `27`.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The two UI-SPECs' totals, as a type. (3 + 12 + 4 + 1 + 4 + 3) + (6 + 4 + 6 + 2 + 2 + 4 + 2) = 53.
 * Probe (a) above, and re-watched failing by plan 12-14 against the new number — see the SUMMARY.
 *
 * THE NAME CARRIES THE NUMBER ON PURPOSE, AND IT IS RENAMED IN THE SAME COMMIT AS THE ROWS. The alias
 * was `BaselineCountIsTwentySeven`. A gate whose name says 27 while its constraint says 53 is a gate
 * that reads correct and is not, and this file's whole argument is that a count nobody restates is a
 * count nobody checks. `tsc` cannot catch a stale NAME, which is exactly why it has to move by hand.
 */
export type BaselineCountIsFiftyThree = Assert<
  (typeof VISUAL_BASELINES)["length"] extends 53 ? true : false
>;

/** D-135 / AC#30: exactly one exclusion. Probe (b) above. */
export type ThemeSwapExclusionCountIsOne = Assert<
  (typeof THEME_SWAP_EXCLUSIONS)["length"] extends 1 ? true : false
>;

// ---------------------------------------------------------------------------
// Derivations the specs read
// ---------------------------------------------------------------------------

/**
 * The `{arg}` passed to `toHaveScreenshot`. Playwright expands it to
 * `{arg}-{projectName}-{platform}{ext}` (11-RESEARCH Finding 1, measured), so in the pinned Linux
 * container this becomes `{surface}-{width}-{theme}-visual-linux.png`.
 *
 * The theme is in the name even for the court-only rows. It costs nothing and it means a future
 * second-theme row cannot collide with an existing file — a collision that would present as two
 * different surfaces quietly comparing against one baseline.
 */
export function baselineArg(row: BaselineRow): string {
  return `${row.surface}-${row.width}-${row.theme}.png`;
}

/** Every surface the D-135 smoke compares: documents, minus the declared exclusions. */
export const THEME_SWAP_SURFACES: readonly DocumentSurfaceId[] = SURFACE_IDS.filter(
  (id): id is DocumentSurfaceId =>
    VISUAL_SURFACES[id].kind === "document" &&
    !THEME_SWAP_EXCLUSIONS.some((exclusion) => exclusion.surface === id),
);

/**
 * Every surface that cannot currently be shot, with its reason. ONE today, argued above.
 *
 * The specs PIN this set rather than merely skipping it: a surface that silently joins the blocked
 * list is a baseline that silently stopped existing, which is the failure mode this whole module is
 * built around.
 */
export function blockedSurfaces(): readonly { id: SurfaceId; reason: string }[] {
  return SURFACE_IDS.flatMap((id) => {
    const reason = VISUAL_SURFACES[id].blocked;
    return reason === null ? [] : [{ id, reason }];
  });
}

// ---------------------------------------------------------------------------
// NOT COVERED — real blind spots, stated so the next reader under-trusts this file
// ---------------------------------------------------------------------------
//
//   • THIS IS A DECLARATION. It proves nothing about what is on disk. `e2e/visual/surfaces.spec.ts`
//     is what turns a row into a comparison, and `tests/design/gitignore-baselines.test.ts` is what
//     stops a platform baseline being committed. Neither of them notices a row nobody reads.
//   • ONE OF THE 53 IS BLOCKED (`global-error`), so a complete run commits 52 PNGs, not 53. The
//     reason is above and it is structural rather than schedule pressure. Anyone reading "53
//     baselines" as "53 files" will be wrong by exactly that one.
//   • THE COUNTS ARE COMPILE-CHECKED; THE CONTENTS ARE NOT. Nothing here can tell a correct width
//     from a plausible one, and a row whose `why` is true but whose `width` is wrong compiles.
//   • ⚠ THE FIXTURE HAS A SHELF LIFE, AND SO THEREFORE DO SEVEN OF THESE SURFACES. Every Phase-12
//     URL above names `2026-09-16` — the fixture's own collision day — because the alternative is a
//     baseline whose month grid changes with the wall clock. `scripts/seed-baseline-fixtures.ts`
//     chose fixed literals over relative dates for the same reason, and the cost is the same: once
//     real time passes that day the seeded window is in the PAST, the server refuses to seed it, and
//     these surfaces stop being reachable. THE FAILURE IS LOUD — the drives' own guards and the hooks
//     above fail and name themselves — which is why the trade was taken; a relative date would have
//     been silently wrong instead (a different day every month, re-minted every time). When it fires,
//     the fix is the fixture's constants and a re-dispatch, not a threshold.
//   • FOUR SURFACES ARE STATES RATHER THAN URLS, so their `url` is where the surface ENDS and not
//     something a reader can paste into a browser. `e2e/helpers/visual-drive.ts` holds the drive for
//     each, and it is the file to read before trusting one of those four rows.
//   • IT SAYS NOTHING ABOUT WHETHER A SURFACE LOOKS RIGHT. A baseline pins what was shot, including
//     a defect that was present on the day it was shot. That is why the surfaces are ones whose
//     correctness is separately asserted (contrast, type scale, skeleton geometry, the 320px floor)
//     rather than surfaces whose only evidence would be their own screenshot.
