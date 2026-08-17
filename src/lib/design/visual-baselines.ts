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
// THE SCOPING RULE, WHICH IS WHY THIS LIST IS SHORT (11-UI-SPEC § GATE-01)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// **Phase 11 baselines ONLY DB-free surfaces.** A baseline that needs seeded data is flaky, and a
// flaky gate is retried until green — a rubber stamp with extra steps. Product surfaces get baselines
// in Phases 12-15 with their own fixtures. That rule is one of the two reasons a row below can carry
// a non-null `blocked` — read `VISUAL_SURFACES["og-listing"].blocked` for it in full. The other
// blocked row, `global-error`, is blocked for an unrelated and structural reason. TWO OF THE 27 ARE
// BLOCKED, so a complete run commits 25 PNGs; anyone reading "27 baselines" as "27 files" is wrong
// by exactly those two, which is why the count is stated here and pinned in `surfaces.spec.ts`.
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
// `BaselineCountIsTwentySeven` and `ThemeSwapExclusionCountIsOne` below are therefore type-level
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
 * Every surface with at least one baseline. Ordered as 11-UI-SPEC § GATE-01's table orders them, so
 * the two lists can be read side by side.
 */
export const SURFACE_IDS = [
  "dev-theme",
  "terms",
  "privacy",
  "root-not-found",
  "global-error",
  "auth-login",
  "og-root",
  "og-listing",
  "og-invite",
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
    // The id is a literal that names no listing on purpose; see `blocked`.
    url: "/listings/no-such-listing/opengraph-image",
    hook: "img",
    hookWhy: "same 1200 × 630 decode check as the root card. Moot while the row is blocked.",
    blocked:
      "THE LISTING CARD NEEDS A PUBLISHED LISTING, AND THIS PHASE'S SCOPING RULE FORBIDS SEEDED " +
      "DATA. Worse than merely unreachable: this route DOES answer 200 without a database. " +
      "`src/lib/listing/og-facts.ts` returns null for an unreadable listing and the route falls back " +
      "to its `GenericCard`, which plan 11-20 measured as BYTE-IDENTICAL to the root card " +
      "(25,844 bytes, both). So a baseline shot here would be a second copy of `og-root` wearing the " +
      "listing card's name — green forever, and reading in every review as coverage of a card it has " +
      "never seen. That is the exact defect this phase exists to remove, arrived at from the " +
      "opposite direction. Phases 12-15 baseline it with a fixture, which is where the UI-SPEC's own " +
      "scoping rule already puts product surfaces.",
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
// The 27 baselines
// ---------------------------------------------------------------------------

/**
 * Every baseline, in 11-UI-SPEC § GATE-01's own order and adding up to its own total:
 *
 *   /dev/theme          320 / 768 / 1280   one shot per width, both themes in frame     3
 *   /terms, /privacy    320 / 768 / 1280   both themes                                 12
 *   root not-found      320 / 1280         both themes                                  4
 *   global-error        1280               court only                                   1
 *   (auth) login        320 / 1280         both themes                                  4
 *   listing/invite/root OG   1200 × 630    court only                                   3
 *                                                                            TOTAL     27
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

/** 11-UI-SPEC § GATE-01's total, as a type. 3 + 12 + 4 + 1 + 4 + 3 = 27. Probe (a) above. */
export type BaselineCountIsTwentySeven = Assert<
  (typeof VISUAL_BASELINES)["length"] extends 27 ? true : false
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
 * Every surface that cannot currently be shot, with its reason. Two today, both argued above.
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
//   • TWO OF THE 27 ARE BLOCKED (`global-error`, `og-listing`), so a complete run commits 25 PNGs,
//     not 27. Both reasons are above and both are structural rather than schedule pressure. Anyone
//     reading "27 baselines" as "27 files" will be wrong by exactly those two.
//   • THE COUNTS ARE COMPILE-CHECKED; THE CONTENTS ARE NOT. Nothing here can tell a correct width
//     from a plausible one, and a row whose `why` is true but whose `width` is wrong compiles.
//   • IT SAYS NOTHING ABOUT WHETHER A SURFACE LOOKS RIGHT. A baseline pins what was shot, including
//     a defect that was present on the day it was shot. That is why the surfaces are ones whose
//     correctness is separately asserted (contrast, type scale, skeleton geometry, the 320px floor)
//     rather than surfaces whose only evidence would be their own screenshot.
