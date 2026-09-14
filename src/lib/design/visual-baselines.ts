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
// TWENTY-ONE OF THE 51 ROWS ARE BLOCKED (`global-error` for a structural reason that has nothing to
// do with data, and twenty Phase-13 rows on a credential boundary and a missing fixture), so a
// complete run commits 30 PNGs; anyone reading "51 baselines" as "51 files" is wrong by exactly
// those twenty-one, which is why the count is stated here and pinned in `surfaces.spec.ts`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE COMPILE GATES, AND WHY THEY ARE HERE RATHER THAN IN A TEST
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// The specs that read this file live in the `visual` Playwright project, and `playwright.config.ts`
// does not construct that project off Linux (D-29). So on every developer machine in this project —
// all of which are Windows or macOS — NOTHING would check the three counts this file's acceptance
// rests on. A criterion checked only in an environment nobody runs is not a criterion.
//
// `BaselineCountIsEightyFive`, `ThemeSwapExclusionCountIsOne` and `ThemeContractSurfaceCountIsFour`
// below are therefore type-level
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

// The crop dialog's title, IMPORTED so this declaration and the shipped copy cannot drift (WR-07).
// `@/lib/avatar` is a directive-free leaf — `e2e/overflow-320.spec.ts` reads it for the same reason.
import { AVATAR_CROP_TITLE } from "@/lib/avatar";

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
  // ─── 12-14 + 24-08 — the booker path and progressive-search states ──────────────────────────────
  "search-idle-pill",
  "search-activity-step",
  "search-location-step",
  "search-party-step",
  "search-results",
  "search-empty",
  "listing-detail",
  "listing-lightbox",
  "listing-sheet",
  "checkout",
  "collision-notice",
  // ─── 13-15 — the confirmation, payment-state, receipt and group surfaces ─────────────────────────
  //
  // ⚠ TWELVE IDS FOR AN ELEVEN-ROW TABLE, AND THE TWELFTH IS THE FINDING. 13-UI-SPEC § Visual
  // Baselines names eleven surfaces and two of them are the reversed state's `auto` and `manual`
  // branches. Plan 13-10 then added a THIRD branch — D-96's `indeterminate` — for a row whose probe
  // learns nothing, which is every row this repository can seed and every row CI can produce. The
  // spec's table predates it. Baselining only the two named branches would have declared coverage of
  // a surface no environment renders while leaving the one every environment DOES render undeclared,
  // so the third branch is its own id here and the two named ones keep theirs, blocked, with the
  // reason attached.
  "booking-moment",
  "booking-confirmed",
  "payment-pending",
  "payment-not-completed",
  "payment-reversed-auto",
  "payment-reversed-manual",
  "payment-reversed-indeterminate",
  "receipt-screen",
  "receipt-print",
  "booking-group",
  "invite-active",
  "booking-not-found",
  // ─── 14-16 — the five host surfaces, in 14-UI-SPEC § Visual Baselines' table order ───────────────
  //
  // ⚠ ALL NINE ARE BLOCKED, AND NOT ONE OF THEM WAS GENERATED. `playwright.config.ts:39` constructs
  // the `visual` project ONLY on Linux, so on the machine this phase ran on the command does not
  // exist — there is no `--project=visual` to select and no screenshot assertion reachable by
  // accident. That is stated at the top of the block rather than left to nine `blocked` strings,
  // because the honest summary of this addition is *an inventory somebody can work from*, not
  // coverage. Nothing in `e2e/visual/surfaces.spec.ts-snapshots/` moved and nothing was added.
  //
  // ⚠ EVERY ONE OF THE NINE SHARES ONE STRUCTURAL BLOCKER BEFORE ITS OWN: `e2e/helpers/visual-drive
  // .ts`'s `DRIVES` map has NO HOST ENTRY, so a host row falls through to the default — a plain
  // `goto` of its declared URL with no session. Every host route redirects an unauthenticated
  // visitor, so the default drive would photograph `/login` NINE TIMES, and nine identical baselines
  // of the sign-in page is the single worst outcome available here: it is permanent, silent, and
  // green. The per-surface reasons below name what each row needs ON TOP of that.
  "host-dashboard-agenda",
  "host-dashboard-quiet",
  "host-dashboard-none",
  "host-requests-triage",
  "host-requests-zero",
  "host-bookings-upcoming",
  "host-wizard-rail",
  "host-availability-strip",
  "host-earnings",
  // ─── 15-11 — three more auth documents and the profile, in 15-UI-SPEC § Visual Baselines' order ──
  //
  // ⚠ FOUR IDS FOR A FIVE-ROW TABLE, AND THE FIFTH IS `auth-login`, WHICH IS ALREADY ABOVE. Phase 11
  // declared it, so 15-UI-SPEC's five-row table is four ADDITIONS and one EDIT — its own inventory
  // note hedges "measure the file's real counts before moving the aliases", and the measured truth is
  // 37 → 41 rather than the 37 → 42 the prose arithmetic guessed. Adding a fifth id here would not
  // even compile (`auth-login` twice is a duplicate key on `VISUAL_SURFACES`), which is the one place
  // this file's totality gate catches the mistake for free.
  //
  // ⚠ THREE OF THE FOUR ARE SHOT AND THE FOURTH IS NOT, and the split is the honest headline of this
  // block rather than something to infer from two `blocked` strings. `auth-signup`, `auth-forgot` and
  // `auth-reset` are anonymous static forms — no session, no seed, no clock, no fixture date — which
  // is the cheapest a baseline row gets and is why they arrive `blocked: null`. `profile` is behind
  // the session gate and needs TWO things this phase does not ship, both named at its row.
  //
  // ⚠ AND `auth-login`'S TWO COMMITTED PNGs ARE STALE AS OF PLAN 15-06, NOT AS OF THIS BLOCK. D-162
  // took the public header composition out of `(auth)/layout.tsx` and put a wordmark above one card
  // on the quiet ground; the surface row's hook named the header, so from that commit forward the
  // shot would have TIMED OUT rather than drifted. The hook and all three of its prose claims are
  // rewritten below. The two files are deliberately NOT deleted here — deleting a reference by hand
  // is the second half of the same authority problem `baselines.yml` exists to solve, and the
  // `workflow_dispatch` run that replaces them is the only thing permitted to write one.
  "auth-signup",
  "auth-forgot",
  "auth-reset",
  "profile",
  // ─── 16-15 — the crop dialog and the wizard's cover preview ──────────────────────────────────────
  //
  // ⚠ TWO IDS, BOTH BLOCKED, AND NEITHER IS A NEW ROUTE. Both are STATES of documents this inventory
  // already knows: `avatar-crop-dialog` is `/profile` one interaction in, and `wizard-cover-preview`
  // is the same wizard `host-wizard-rail` names, walked to its photos step. They are their own ids
  // rather than extra widths on those two rows for the reason the Phase-13 block gives for D-96's
  // third branch — a state that needs a different drive and carries a different blocker is a
  // different surface, and folding it into its parent's row hides both facts.
  //
  // ⚠ BOTH ARE BLOCKED, AND THE TWO BLOCKS ARE NOT THE SAME SIZE, which is the useful half of this
  // block. `avatar-crop-dialog` inherits `profile`'s two blockers whole and adds a third of its own
  // (a staged file). `wizard-cover-preview` inherits the Phase-14 host block's ONE structural blocker
  // and adds a second — and notably does NOT need what a reader would assume it needs, because the
  // seed fixture already commits eight local photo assets for this listing. Each row says so.
  //
  // ⚠ NEITHER WAS GENERATED, and neither could have been: `playwright.config.ts:39` constructs the
  // `visual` project only on Linux, and plan 16-15 ran on win32. Same standing as the Phase-14 block —
  // an inventory to work FROM, never a claim of coverage.
  "avatar-crop-dialog",
  "wizard-cover-preview",
] as const;

/** The closed union every baseline row and every exclusion is typed against. */
export type SurfaceId = (typeof SURFACE_IDS)[number];

/**
 * Every surface's row. `as const satisfies Record<…>` rather than a plain annotation, and both halves
 * are load-bearing: `satisfies` keeps this a TOTAL record (adding a name to `SURFACE_IDS` without a
 * row is a compile error, exactly as in `selector-contract.ts`), while `as const` preserves the
 * literal `kind` values that `DocumentSurfaceId` below is derived from. An annotation alone would
 * widen `kind` to `SurfaceKind` and silently make that derivation return every id.
 *
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
 * ⚠ PLAN 17-13 WALKED ALL 24 BLOCKED ROWS ON 2026-08-30 AND UNBLOCKED **ZERO**. Recorded here rather
 * than left to be re-derived, because "nobody unblocked anything" and "nobody looked" are the same
 * shape in a diff, and 17-UI-SPEC § GATE-01 clause 5 is explicit that a blocked row whose reason has
 * gone stale is WORSE than a blocked row — it reads as a considered decision and is a forgotten one.
 *
 * The walk expected several rows to have come free after twelve plans of Phase-17 work. MEASURED,
 * they had not, and the measurement is one command:
 *
 *   git diff --stat e439bf9..HEAD -- e2e/helpers/visual-drive.ts scripts/seed-baseline-fixtures.ts
 *   → EMPTY. Both files are byte-identical across the whole of Phase 17.
 *
 * Those two files are where every one of the 24 blockers actually lives, so nothing could have come
 * free. Concretely, against the three changes a reader would expect to have helped:
 *
 *   • **The four new dev-throw affordances (plan 17-12) do NOT reach `global-error`.** They reach
 *     each ROUTE GROUP's own boundary — `src/app/(app)/error.tsx`, `(auth)/error.tsx`,
 *     `(legal)/error.tsx`, `(host)/host/error.tsx` — which is what 17-12 built them to measure. The
 *     count of throw affordances went 1 -> 5 and the number that can make the ROOT LAYOUT throw is
 *     still 0. That row's reason is corrected below, because the sentence it used to carry is now
 *     false in its details even though its conclusion is unchanged.
 *   • **The `[16-D9]` sheet fix (plan 17-06) touched no blocked row.** It scoped
 *     `e2e/overflow-320.spec.ts`'s sheet measurement to the dialog box. The baseline surface
 *     `listing-sheet` was already SHOT and stays shot; there is no blocked row on that account.
 *   • **The seven host routes plan 17-11 brought into the 320px sweep did NOT bring a host into
 *     THIS one.** Its fixture is spec-local — written in `beforeAll` and deleted in `afterAll` — and
 *     the nine Phase-14 rows are blocked on committed seed data in `scripts/seed-baseline-fixtures.ts`
 *     plus a `hostDrive` in `e2e/helpers/visual-drive.ts` that lets a capture BE `vrt_host_1`.
 *     `grep -c 'hostDrive' e2e/helpers/visual-drive.ts` is still 0 and the `DRIVES` map still keys
 *     exactly six surfaces, none of them a host one.
 *
 * So `EXPECTED_BLOCKED` in `e2e/visual/surfaces.spec.ts` still names 24 entries, `EXPECTED_BASELINE_COUNT`
 * is still 78, and plan 17-14's dispatch should mint **NO new PNG from this file**. A minted PNG is a
 * finding, not an outcome.
 *
 * ⚠ WHAT PHASE 17 *DID* CHANGE FOR THIS FILE IS A PIXEL, NOT A BLOCKER. D-196 (plan 17-06) padded
 * `ProfileLink` from 16x16 to 28x28, which is +12px at EVERY width in all three signed-in
 * compositions. That is invisible to the 24 rows below — they are blocked — but it is NOT invisible
 * to `booking-not-found`, which is shot and renders the signed-in shell. A 12px-wider Profile control
 * is the EXPECTED delta on that row at 17-14's comparison dispatch; anything else, anywhere else, is
 * a finding. Written up in full at `[17-D6]` in this phase's `deferred-items.md`.
 * ─────────────────────────────────────────────────────────────────────────────────────────────────
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
      "`/dev/throw` throws inside a PAGE, and a page throw is caught by the nearest route boundary " +
      "above it, never by this one. ⚠ THAT CLAUSE IS AMENDED BY PLAN 17-13 (2026-08-30) AND THE " +
      "PREVIOUS WORDING IS QUOTED RATHER THAN DELETED, because it is now false in its details while " +
      "its conclusion is unchanged. It used to read *'`src/app/error.tsx` — the root route boundary " +
      "— catches every page throw in the tree'*. Plan 17-12 added FOUR more throw affordances — " +
      "`/dev-throw-app`, `/host/dev-throw`, `/dev-throw-auth`, `/dev-throw-legal` — and MEASURED " +
      "that each is caught by its own ROUTE GROUP's boundary (`(app)/error.tsx`, " +
      "`(host)/host/error.tsx`, `(auth)/error.tsx`, `(legal)/error.tsx`), not by the root one. So " +
      "the affordance count went 1 -> 5, the root boundary is one catcher of five rather than the " +
      "only one, and the number of affordances that can make the ROOT LAYOUT throw is still ZERO. " +
      "`global-error.tsx` renders only when the ROOT LAYOUT " +
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
    // ⚠ EDITED BY PLAN 15-11, NOT ADDED BY IT. This hook was the public header's selector until
    // D-162 (plan 15-06) took that composition out of `(auth)/layout.tsx`. A hook naming an element
    // the page no longer renders does not drift — the reachability assertion TIMES OUT and the whole
    // surface goes red — so this row was a scheduled failure from 15-06's commit forward. The
    // replacement is the pattern container's declared id, which is what the layout now wraps every
    // one of these four documents in.
    hook: '[data-testid="panel-card"]',
    hookWhy:
      "`(auth)/layout.tsx` now renders a wordmark above ONE `PanelCard` on a quiet ground (D-162), " +
      "and that card IS the composition this baseline exists to pin — the header it used to name " +
      "left this layout in the same change. ⚠ THE SECOND CLAIM THIS ROW USED TO MAKE IS DELIBERATELY " +
      "NOT RE-MADE, and that is a decision rather than an omission: the old hook said it would fail " +
      "loudly if the anonymous session read ever started reaching the database, keeping this surface " +
      "inside GATE-01's DB-free scope. A card the page renders unconditionally cannot fail that way, " +
      "so carrying the sentence forward would have left a guarantee nothing checks — the exact shape " +
      "this file's header calls worse than no gate at all. THE PROPERTY DID NOT GO AWAY, IT MOVED: " +
      "all four `(auth)` routes now build `○ Static`, a request-time database read is precisely what " +
      "would flip one to `ƒ Dynamic`, and that marker is asserted per route in " +
      "`tests/design/loading-coverage.test.ts`. That is the stronger instrument of the two anyway — " +
      "it fails inside `npm run build` on every machine, rather than only inside the one Linux job " +
      "that shoots baselines.",
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

  "search-idle-pill": {
    kind: "document",
    url: "/",
    hook: 'section[aria-label="Space search"] button[aria-label="Start your search"]',
    hookWhy:
      "the real progressive-search trigger after the route has settled. The streaming loading shell " +
      "is deliberately aria-hidden, so this semantic hook cannot be satisfied by its inert geometry " +
      "or by a page that has already advanced into a later search step.",
    blocked: null,
  },

  "search-activity-step": {
    kind: "document",
    url: "/",
    hook: '[data-slot="command-input"][aria-label="Search for activity or type"]',
    hookWhy:
      "the command input that only appears after the user activates the idle pill. It rejects both " +
      "the idle state and the later address/party states, so this capture cannot quietly baseline the " +
      "wrong step of the journey.",
    blocked: null,
  },

  "search-location-step": {
    kind: "document",
    url: "/",
    hook: 'section[aria-label="Space search"] [role="combobox"][aria-label="Search for your address"]',
    hookWhy:
      "the address combobox that appears only after a catalogue activity is selected. A structural " +
      "section prefix keeps it distinct from any unrelated combobox a later route could add.",
    blocked: null,
  },

  "search-party-step": {
    kind: "document",
    url: "/",
    hook: 'section[aria-label="Space search"] #group-party-size',
    hookWhy:
      "the group-size input, not merely the party-step heading: it exists only after the user chooses " +
      "For a group, so the baseline fails if the drive stops at the generic party choice state.",
    blocked: null,
  },

  "search-results": {
    kind: "document",
    url: "/?category=martial_arts_boxing&lat=14.5547&lng=121.0244&locationLabel=2%20Real%20Street%2C%20Makati%2C%20Metro%20Manila%2C%20Philippines&partySize=1",
    hook: '[data-testid="search-results-region"] [data-testid="result-card"]',
    hookWhy:
      "a real result tile inside the settled result region. The region scopes the proof to the completed " +
      "progressive search, while the tile rejects the empty state and any loading plate.",
    blocked: null,
  },

  "search-empty": {
    kind: "document",
    url: "/?category=martial_arts_boxing&lat=14.5547&lng=121.0244&locationLabel=2%20Real%20Street%2C%20Makati%2C%20Metro%20Manila%2C%20Philippines&partySize=1000",
    hook: '[data-testid="search-results-region"] [data-testid="empty-state"]',
    hookWhy:
      "the explicit empty state inside the settled result region. A 1,000-person group is valid but " +
      "exceeds every seeded venue capacity, so this hook rejects a result grid and any pre-submit state " +
      "without encoding availability, remaining-place, or legacy refinement claims.",
    blocked: null,
  },

  "listing-detail": {
    kind: "document",
    // ⚠ `?date=` IS NOT DECORATION, IT IS WHAT MAKES THIS BASELINE DETERMINISTIC. Without it the page
    // renders `todayLocal` (`(detail)/page.tsx` → `initialDate`), so the month grid, the highlighted
    // day and the set of disabled past days all change WITH THE WALL CLOCK — a baseline that goes red
    // tomorrow for no reason, which is the flake that gets a threshold widened. The date is the
    // fixture's own collision day, so the hour grid underneath it also shows the seeded conflict's
    // two struck-through hours: a picture of real availability, not of an empty day. `today` is its
    // sibling pin: without it the opening month, disabled past days and ring move with the dispatch
    // clock. The fixture-contract assertion checks both literals against the seed's exported values.
    url: "/listings/vrt_listing_exclusive?date=2026-09-16&today=2026-09-15",
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
    // `today` pins the same opening month, disabled set and ring as listing-detail above. Dropping it
    // makes this reference clock-dependent again; the spec checks its VALUE, not mere presence.
    url: "/listings/vrt_listing_exclusive?date=2026-09-16&today=2026-09-15",
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

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // PHASE 13 — THE CONFIRMATION, PAYMENT-STATE, RECEIPT AND GROUP SURFACES (plan 13-15)
  //
  // ⚠ ELEVEN OF THESE TWELVE ARE BLOCKED, THAT IS THE OPPOSITE OF WHAT THE PLAN EXPECTED, AND IT IS
  // THE HONEST STATE RATHER THAN A SHORTFALL BEING DRESSED UP. There are exactly TWO blockers and
  // they are independent of each other; every row below names which one (or both) applies to it.
  //
  // BLOCKER A — THE CREDENTIAL BOUNDARY (D-35). Three of the spec's surfaces are not reachable by any
  // fixture this repository is allowed to build. `page.tsx` reaches the not-completed state only when
  // `readPaymentState(status, session) === "not-completed"`, and the reversed state's branch is
  // `session === null ? "indeterminate" : isApiRefundable(rail) ? "auto" : "manual"` — so all three
  // presuppose a checkout session PayMongo has CONFIRMED. `probeCheckoutSession` returns null for a
  // session the provider does not know, which every fixture id is, and it returns null WITHOUT A
  // REQUEST when no key is configured, which is the state of the one job allowed to write baselines.
  // Minting a real hosted session inside the suite is what D-35 forbids and what
  // `receipt-parity.spec.ts`'s header refuses by name. MEASURED 21 August 2026 against a seeded row
  // per shape: not-completed REDIRECTS to `/listings/{id}/book?hold=…`, and a seeded reversed row
  // renders the INDETERMINATE branch.
  //
  // BLOCKER B — DETERMINISM. A per-run seed cannot produce a stable screenshot, and every one of the
  // following is IN FRAME on at least one surface below:
  //
  //   • the booking REFERENCE. `bookingReference` is a SHA-256 over the booking id, and
  //     `seedPaymentStates` suffixes every id with `randomUUID()` — a different `FIT-XXXXXXXX` every
  //     run, rendered on every status branch by TRUST-02.
  //   • the ARRIVAL LINE and the receipt's `Booked` date. `starts_at`, `ends_at` and `created_at` are
  //     all `now()`-relative in that fixture, so they move daily.
  //   • the BOOKER'S OWN EMAIL. `signUpBooker` mints `e2e.booker.{Date.now()}.{rand}@example.com`, and
  //     BOTH the confirmation moment (D-63's typo-catching line) and the pending state's escalated
  //     sentence render it verbatim.
  //   • the LISTING TITLE. `seedBookableListing` puts a run id in it.
  //   • the INVITE URL. The group's access token is minted per run and is rendered in a read-only
  //     field on `/bookings/[id]/group`.
  //
  // The fix is a Phase-13 block in `scripts/seed-baseline-fixtures.ts` shaped like the Phase-12 one —
  // fixed booking ids, fixed literal instants, a fixed group token, and a fixed booker identity the
  // drive adopts. That is a plan-sized item against a file outside 13-15's scope, and none of it is
  // runnable on a developer machine (the `visual` project is not constructed off Linux, D-29). It is
  // carried in `deferred-items.md` with this plan named as the finder. THE ROWS ARE DECLARED ANYWAY,
  // blocked, for this module's founding reason: *a baseline nobody shot and a baseline somebody
  // deleted look identical in a green run.* An argued block is a decision somebody can find and work
  // from; an absent row is silence.
  //
  // `booking-not-found` is the ONE that is neither: it renders no booking, no money, no date and no
  // identity — an `EmptyState` inside the signed-in shell — so it is shot.
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════

  "booking-moment": {
    kind: "document",
    url: "/bookings/{confirmed}?paid=1",
    hook: '[data-testid="confirmation-moment"]',
    hookWhy:
      "the moment's own container, and the ONE hook that separates the before-picture from the " +
      "after: the same URL WITHOUT `?paid=1` renders the ordinary confirmed detail, which carries " +
      "`booking-detail` instead and photographs perfectly well. Moot while the row is blocked.",
    blocked:
      "BLOCKER B (determinism). This surface renders three things that differ on every run: the " +
      "TRUST-02 reference (a SHA-256 of a `randomUUID()`-suffixed booking id), the arrival line (from " +
      "a `now()`-relative `starts_at`), and D-63's line, which prints the booker's own email address " +
      "verbatim — `signUpBooker` mints a new one every time. A baseline of any of them is a reference " +
      "the next dispatch disagrees with, which is the flake that gets a threshold widened. Needs the " +
      "committed Phase-13 fixture; see this block's header.",
  },
  "booking-confirmed": {
    kind: "document",
    url: "/bookings/{confirmed}",
    hook: '[data-testid="booking-detail"]',
    hookWhy:
      "the detail shell, which the moment does NOT render — so this row cannot be satisfied by the " +
      "row above, and neither can be satisfied by the route's own `loading.tsx` plate. Moot while " +
      "the row is blocked.",
    blocked:
      "BLOCKER B (determinism): the reference, the arrival line and the money row's frozen date all " +
      "move per run. Needs the committed Phase-13 fixture.",
  },
  "payment-pending": {
    kind: "document",
    url: "/bookings/{pending}?paid=1",
    hook: '[data-testid="payment-state-pending"]',
    hookWhy:
      "the pending container. All three payment states are role-less sectioning `div`s — " +
      "`selector-contract.ts` records why each needs its own box — and the same row without the " +
      "query redirects to checkout, so the query and this hook together are what pin the surface.",
    blocked:
      "BLOCKER B (determinism), plus a SECOND hazard this row is the only one to carry and which is " +
      "worth recording separately because it is invisible until a picture is taken. The escalated " +
      "sentence prints the booker's per-run email; that is blocker B. AND the surface polls — D-71's " +
      "`router.refresh()` every 2500ms — so it must be captured against a driven clock, and a driven " +
      "clock on THIS page leaves the previous tree attached to `<body>` inside a `hidden` container. " +
      "Measured 21 August 2026 by loading it twice in one run: clock off, one `money-statement`; " +
      "clock on, two, the second 0x0 under `div(hidden)`. It paints nothing, so it does not affect " +
      "the pixels — but any assertion this drive makes about element counts has to be stated on " +
      "VISIBLE elements, which is what `e2e/overflow-320.spec.ts` now does.",
  },
  "payment-not-completed": {
    kind: "document",
    url: "/bookings/{pending}",
    hook: '[data-testid="payment-state-incomplete"]',
    hookWhy:
      "the not-completed container, which must never be satisfied by `hold-expired-state.tsx` — D-70 " +
      "gives that landing to the expired hold one navigation away. Moot while the row is blocked.",
    blocked:
      "BLOCKER A (the credential boundary) AND blocker B. `page.tsx`'s pending branch renders this " +
      "state only when the D-84 probe answers `active`, and its fallback direction is deliberate and " +
      "argued in that file: a probe that learns nothing REDIRECTS rather than claiming 'you have not " +
      "been charged' over a payment that may be settling. Measured: a seeded row lands on " +
      "`/listings/{id}/book?hold=…`. Reaching it needs a real hosted checkout session, which D-35 " +
      "keeps out of the one job that can write baselines. The rendered tree is covered instead by " +
      "`tests/booking/payment-states.test.tsx`.",
  },
  "payment-reversed-auto": {
    kind: "document",
    url: "/bookings/{reversed}",
    hook: '[data-testid="payment-state-reversed"]',
    hookWhy: "the reversed container. Moot while the row is blocked — see below for which branch it renders.",
    blocked:
      "BLOCKER A (the credential boundary) AND blocker B. The branch is `session === null ? " +
      "'indeterminate' : isApiRefundable(rail) ? 'auto' : 'manual'`, so `auto` presupposes both a " +
      "provider-confirmed session and a refundable rail. A seeded row has neither and renders the " +
      "indeterminate branch. Declared rather than dropped because the spec asked for it and the gap " +
      "is worth being able to find.",
  },
  "payment-reversed-manual": {
    kind: "document",
    url: "/bookings/{reversed}",
    hook: '[data-testid="payment-state-reversed"]',
    hookWhy:
      "the reversed container. The 320 row is where 13-UI-SPEC proves the support control's " +
      "above-the-fold claim, which is why this surface has a narrow width at all. Moot while blocked.",
    blocked:
      "BLOCKER A (the credential boundary) AND blocker B, plus a THIRD that is independent of both " +
      "and outlives them: `SUPPORT_EMAIL` is null (D-26/D-64), so the control this surface exists to " +
      "photograph renders NOTHING. Even with a real session on a QR Ph rail, the 320 capture would be " +
      "a picture of the panel without its support path — a baseline of the state the requirement " +
      "forbids, filed under the name of the state it requires. `e2e/overflow-320.spec.ts` carries the " +
      "ordering assertion in the same shape: skipped, with both blockers named, running the day " +
      "either is fixed.",
  },
  "payment-reversed-indeterminate": {
    kind: "document",
    url: "/bookings/{reversed}",
    hook: '[data-testid="payment-state-reversed"]',
    hookWhy:
      "the reversed container, reached with NO query string — D-87's own falsifiable form, since the " +
      "state used to be gated on `?paid=1` and would have vanished when 13-11's moment consumed it.",
    blocked:
      "BLOCKER B (determinism) ONLY — this is the one reversed branch a seed genuinely reaches, and " +
      "it is the branch every environment without a live PayMongo session renders, CI included. It " +
      "prints the TRUST-02 reference and the D-96 sentence; the reference moves per run. Needs the " +
      "committed Phase-13 fixture and nothing else. It is the highest-value row in this block: the " +
      "reversed state is the phase's sharpest surface and this is the shape of it that ships.",
  },
  "receipt-screen": {
    kind: "document",
    url: "/bookings/{confirmed}/receipt",
    hook: '[data-testid="receipt"]',
    hookWhy:
      "the receipt shell. The route's loading plate carries no `receipt` id, and a row the D-76 " +
      "predicate refuses lands on the not-found boundary, which carries none either.",
    blocked:
      "BLOCKER B (determinism): the receipt prints the reference, the session window and D-85's " +
      "`Booked` date, which is `created_at` — `now()` in the fixture. Needs the committed fixture.",
  },
  "receipt-print": {
    kind: "document",
    url: "/bookings/{confirmed}/receipt",
    hook: '[data-testid="receipt"]',
    hookWhy:
      "the same shell, captured under `emulateMedia({ media: 'print' })`. The mechanism is already " +
      "proved by `e2e/receipt-print.spec.ts` (13-13, this repository's first print-media spec); what " +
      "is missing here is the fixture, not the media emulation.",
    blocked:
      "BLOCKER B (determinism), identical to the screen row — same document, same three moving " +
      "figures. The theme-swap smoke still applies to this row once it is unblocked: D-135 holds in " +
      "print because the two themes differ by type scale and radius even with every fill dropped.",
  },
  "booking-group": {
    kind: "document",
    url: "/bookings/{confirmed}/group",
    hook: "#invite-link",
    hookWhy:
      "the share box's own input, and the heading would have been the trap: `group/loading.tsx` " +
      "renders `<h1>Your group</h1>` byte-identically to the resolved page, so an `h1` hook is " +
      "satisfied by the skeleton. The load-FAILURE branch renders neither. Measured while writing " +
      "`e2e/overflow-320.spec.ts`'s Phase-13 sweep.",
    blocked:
      "BLOCKER B (determinism): the field this row's own hook points at RENDERS THE ACCESS TOKEN, " +
      "which is minted per run — the single most obviously unstable string in the phase. Needs the " +
      "committed fixture's fixed token.",
  },
  "invite-active": {
    kind: "document",
    url: "/invite/{token}",
    hook: "h1",
    hookWhy:
      "⚠ WEAKER THAN EVERY OTHER HOOK IN THIS FILE, AND SAID SO RATHER THAN LEFT TO BE DISCOVERED. " +
      "This route has no declared id anywhere on the active branch, and its two neighbours both " +
      "render an `h1`: `invite/[token]/loading.tsx` is a SEARCH-PAGE skeleton reading 'Find a space " +
      "to play' (measured — a curl of this route returns exactly that), and every inactive, " +
      "malformed, voided or regenerated token folds onto `InviteInactive` under a different heading. " +
      "A bare `h1` therefore proves only that SOMETHING rendered. The drive must assert the heading's " +
      "TEXT — `/^You(’|')re invited to /` — the way `e2e/overflow-320.spec.ts` does, and this row " +
      "should be revisited with a declared hook when the fixture lands.",
    blocked:
      "BLOCKER B (determinism): the card prints the listing title (which carries a run id), the " +
      "session window (a `now()`-relative instant) and the headcount. Needs the committed fixture.",
  },
  "booking-not-found": {
    kind: "document",
    // A literal that must never become a real id, in the shape `root-not-found` already uses and for
    // its stated reason: a short one is a value somebody might later seed, and the day it exists this
    // baseline silently starts pinning a real booking.
    url: "/bookings/a-booking-id-that-must-never-exist-13-15",
    hook: '[data-testid="empty-state"]',
    hookWhy:
      "the `EmptyState` this boundary composes. `bookings/[id]/not-found.tsx` deliberately uses " +
      "`EmptyState` rather than `ErrorState` on two grounds it records — a stale link is a STATE and " +
      "not a fault, and `ErrorState` paints its glyph with the alarm token this phase renders " +
      "nowhere — so the id is the boundary's signature. It also rejects the two documents this URL " +
      "can otherwise produce: the route's `loading.tsx` plate carries no `empty-state`, and an " +
      "unauthenticated visit is redirected to `/login`, which carries none either.",
    blocked: null,
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // 14-16 — THE FIVE HOST SURFACES. NINE ROWS, ALL NINE BLOCKED, NINE DIFFERENT REASONS.
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  //
  // COURT ONLY (PROJECT D-138). No Phase-14 surface owes a second-theme pair: grove's proof is the
  // 24-name key-set parity check, the declared contrast table and the FIXED four-surface contract set
  // in `theme-swap.spec.ts`. None of the nine joins that four, and a fifth member is an amendment to
  // D-138 rather than a row to append.
  //
  // WHAT THE FIXTURE ALREADY GIVES THIS BLOCK, so the reasons below can name what is MISSING rather
  // than restating what is absent (`scripts/seed-baseline-fixtures.ts`, read):
  //   • `VRT_HOST_ID` = "vrt_host_1", first name "Vera", `can_host`, `email_verified`
  //   • an ACTIVATED `host_payout` row — `activation_status='activated'`, `payouts_enabled=true`
  //   • FIVE published listings owned by that host, with photos, operating hours and activity tags
  //   • `VRT_CLOCK_ISO` = "2026-09-15T04:00:00Z" — noon Asia/Manila — which the spec installs
  //   • fixed literal ids throughout, and a `reset()` that deletes every `vrt_%` row FK-safely
  //
  // WHAT IT DOES NOT GIVE, and this is the whole of the shared work:
  //   • THE SIGNED-IN USER IS NOT `vrt_host_1`. The 13-15 recipe, mirrored: sign a host up through the
  //     UI, then `UPDATE listing SET host_id = <new id> WHERE id LIKE 'vrt_%'` and repoint the
  //     `host_payout` row, restoring both in `cleanup()`. Cheaper than the booker case, because no
  //     FK-restricted `booking.booker_id` is involved on the listing side.
  //   • NO `booking` ROWS AT ALL. Six of the nine are about bookings.
  //   • NO BOOKER IDENTITY with a fixed `first_name`, which D-140 puts in the agenda row's TITLE.
  //   • NO LISTING WITHOUT HOURS, which is what the published-without-hours signal is about.
  //
  // 14-RESEARCH's verdict on the whole item, quoted rather than paraphrased: **"Buildable, but not
  // inside a single plan, and not verifiable on this machine."** This plan took the declaration and
  // did not take the fixture, and says so here rather than implying otherwise.
  //
  // ⚠ THE CLOCK ARITHMETIC IS 5 AND 4, NOT 6 AND 3. Plan 14-16's own text says "the six clock-
  // dependent rows" and "the three that need no clock". Counted against 14-UI-SPEC § Visual
  // Baselines' Determinism column, which is the measurement: FIVE carry a clock-freeze mark
  // (`agenda`, `quiet`, `triage`, `upcoming`, `earnings`) and FOUR do not (`none`, `zero`,
  // `wizard-rail`, `availability-strip`). The recommendation in 14-RESEARCH names three of those four
  // and is silent on `host-wizard-rail`, which is where the missing one went. Recorded rather than
  // rounded, because the next reader will count them too.

  "host-dashboard-agenda": {
    kind: "document",
    url: "/host",
    hook: '[data-testid="agenda-rows"]',
    hookWhy:
      "the agenda's POPULATED branch. The container and its heading render in all three booking " +
      "states by design, so an `h1`, the section or a `page-header` hook would each be satisfied by " +
      "the quiet day and by the empty one — three different pictures under one row's name. This id " +
      "exists on exactly one of the three.",
    blocked:
      "BLOCKED ON SEEDED BOOKINGS AT FIXED LITERAL INSTANTS, AND ON A FIXED BOOKER NAME. " +
      "`scripts/seed-baseline-fixtures.ts` contains no `booking` block at all — it seeds a host, a " +
      "payout wallet and five listings and stops. This surface needs at least two CONFIRMED bookings " +
      "whose `starts_at` falls inside `VRT_CLOCK_ISO`'s venue-local day (noon Asia/Manila on " +
      "2026-09-15), written as LITERALS: a `now()`-relative seed puts a different window in frame on " +
      "every dispatch, and the row prints that window. It also needs a booker row with a FIXED " +
      "`first_name`, because D-140 makes the booker's first name the row's TITLE and the shipped " +
      "sign-up helpers mint a random identity per run. Neither exists.",
  },
  "host-dashboard-quiet": {
    kind: "document",
    url: "/host",
    hook: '[data-testid="agenda-next"]',
    hookWhy:
      "D-142's quiet-day branch, which is the ONE of the three that renders a sentence about a FUTURE " +
      "session. It cannot be satisfied by the row above (that branch renders a list) nor by the one " +
      "below (that branch renders an empty state).",
    blocked:
      "BLOCKED ON A SECOND FIXTURE STATE OF ONE SURFACE, which is a different problem from the row " +
      "above rather than the same one twice. This branch renders IFF today has zero sessions and " +
      "something later exists — so it and `host-dashboard-agenda` are mutually exclusive states of " +
      "the same route, and `scripts/seed-baseline-fixtures.ts` has one all-or-nothing `seed()` with " +
      "no per-surface variant. Reaching both in one dispatch needs either a second host or a " +
      "per-surface seed step, and that shape does not exist in the file today. On top of that, D-142's " +
      "sentence prints the next session's venue-local weekday, date and time, so its `starts_at` must " +
      "be a literal keyed to `VRT_CLOCK_ISO` rather than an offset from `now()`.",
  },
  "host-dashboard-none": {
    kind: "document",
    url: "/host",
    hook: '[data-testid="agenda-none"]',
    hookWhy:
      "the absence branch. It is an `EmptyState`, so a bare `empty-state` hook would ALSO match the " +
      "no-listings state this route renders instead of the agenda for a host with none — two " +
      "different pictures, one of which is not this surface. The agenda-specific id separates them.",
    blocked:
      "NO CLOCK IS NEEDED AND NO BOOKING IS NEEDED — this row is blocked on the HOST FIXTURE RE-POINT " +
      "alone, which makes it the cheapest of the nine and the right one to unblock first. It requires " +
      "only that the signed-in browser session BE `vrt_host_1`, whose five published listings the " +
      "fixture already writes and against which no booking exists. The re-point is 13-15's recipe " +
      "mirrored into `scripts/seed-baseline-fixtures.ts` plus a `hostDrive` factory in " +
      "`e2e/helpers/visual-drive.ts` — real work this phase did not take, and work that cannot be " +
      "verified on this machine at all, because the `visual` project is not constructed off Linux.",
  },
  "host-requests-triage": {
    kind: "document",
    url: "/host/requests",
    hook: '[data-testid="row-card"]',
    hookWhy:
      "a request row in the MOBILE tree. ⚠ WEAKER THAN IT LOOKS AT 1280, and said so rather than left " +
      "to be discovered: this route renders a `hidden md:block` table beside a `md:hidden` card " +
      "stack, so at the desktop width the card subtree exists in the DOM but is not visible. " +
      "`expectReachable` asserts VISIBILITY, so the 1280 row would fail on this hook and the drive " +
      "must address the table instead. Revisit this hook when the fixture lands.",
    blocked:
      "BLOCKED ON A `requested` BOOKING WITH A FIXED `expires_at`, and this is the row where the clock " +
      "is not a nicety. The SLA countdown is the loudest element on the surface by design (D-146) and " +
      "it TICKS: a deadline seeded as `now() + 20 hours` renders different digits in the capture and " +
      "in every later dispatch, so the picture disagrees with itself by construction. What is owed is " +
      "an `expires_at` LITERAL placed at a chosen remaining duration under the Playwright clock pinned " +
      "to `VRT_CLOCK_ISO`, plus a decision about whether the seeded row is the D-99 cap-shortened one " +
      "— that variant renders the reason sentence, which `[14-03]`/`[14-06]` measured as the widest " +
      "thing the status column can hold at 320px, and it is the row worth photographing.",
  },
  "host-requests-zero": {
    kind: "document",
    url: "/host/requests",
    hook: '[data-testid="empty-state"]',
    hookWhy:
      "inbox-zero's own container. The route's `loading.tsx` plate composes the same `PageHeader` with " +
      "the same two strings and carries no empty state, and the populated branch carries row cards " +
      "instead — so this id separates the surface from both of its neighbours.",
    blocked:
      "IT NEEDS NO CLOCK, NO BOOKING AND NO ROW — WHICH IS EXACTLY WHY IT IS BLOCKED ON SOMETHING THE " +
      "OTHERS ARE NOT: an inbox that is genuinely empty ON THE SAME HOST that `host-requests-triage` " +
      "needs a live request for. One host cannot be in both states in one dispatch, and " +
      "`scripts/seed-baseline-fixtures.ts` seeds exactly one host. Unblocking this row means either a " +
      "SECOND fixture host with no requests, or a per-surface seed step — the same shape the quiet-day " +
      "row needs, arriving from the opposite direction. The missing host drive applies here too.",
  },
  "host-bookings-upcoming": {
    kind: "document",
    url: "/host/bookings?tab=upcoming",
    hook: '[data-testid="row-card"]',
    hookWhy:
      "a booking row in the MOBILE tree, with the same desktop caveat as the triage row above: this " +
      "route also renders two trees and hides one per width. The `?tab=upcoming` in the URL is not " +
      "decoration — `parseTab` resolves anything else to this default, so the query is what makes the " +
      "row name the tab it claims rather than inheriting it.",
    blocked:
      "BLOCKED ON THE BADGE, WHICH IS `now`-DERIVED IN SQL. D-102 computes the displayed status as " +
      "`CASE WHEN status='confirmed' AND ends_at <= now() THEN 'completed' ELSE status END`, evaluated " +
      "against the DATABASE clock — which the Playwright clock does not control. So a booking seeded " +
      "relative to `now()` can photograph as `Upcoming` today and `Completed` on the dispatch that " +
      "compares, with no code change. What is owed in `scripts/seed-baseline-fixtures.ts` is a " +
      "`starts_at`/`ends_at` pair as fixed literals bracketing `VRT_CLOCK_ISO`, and — 14-RESEARCH asks " +
      "for this specifically — a Manila-vs-other-zone PAIR straddling midnight, so the venue-local day " +
      "boundary has a falsifying case rather than a coincidence.",
  },
  "host-wizard-rail": {
    kind: "document",
    // The fixture's own exclusive listing, by its literal id — `scripts/seed-baseline-fixtures.ts`'s
    // `VRT_IDS.exclusive`. Named directly for the reason that file's header gives: `visual-baselines.ts`
    // lives in `src/` and cannot import the seed script (it pulls in `postgres`, and `src/` is inside
    // `next build`'s graph), so the two spellings are kept in agreement by hand and by the URL-contract
    // test in `e2e/visual/surfaces.spec.ts`. ⚠ That test currently filters on `/listings/`, so it does
    // NOT see this row or the availability one; widening it is a job for the plan that unblocks them.
    url: "/host/listings/vrt_listing_exclusive/edit",
    hook: '[data-testid="wizard-step-rail"]',
    hookWhy:
      "the rail itself, which only the resolved wizard renders. An `h1` would be the trap here: every " +
      "step of the wizard renders one, and so does every other host route — so a heading hook would be " +
      "satisfied by any of them, including the route this drive would land on unauthenticated.",
    blocked:
      "BLOCKED ON A DRIVE THAT WALKS, not on data — which makes it the odd one of the nine. The wizard " +
      "holds its position in React state (`useState(0)`), there is no `?step=` and the rail moves " +
      "strictly backward (D-148), so a plain navigation photographs step one: ONE current marker and " +
      "eight future ones, which is the least informative frame this surface has and shows none of the " +
      "three marker states the row exists to pin. What is owed is a `hostDrive` in " +
      "`e2e/helpers/visual-drive.ts` that presses the advance control to a DECLARED step so the frame " +
      "carries done, current and future markers at once — on top of the host re-point every row here " +
      "needs.",
  },
  "host-availability-strip": {
    kind: "document",
    // The same fixture listing, by the same literal id — see the wizard row's note above.
    url: "/host/listings/vrt_listing_exclusive/availability",
    hook: '[data-testid="week-strip"]',
    hookWhy:
      "D-152's week-at-a-glance preview, which exists on no other route. ⚠ It carries " +
      "`aria-hidden=\"true\"` by design (the bars are decoration; the seven sentences beside them are " +
      "the meaning), so this hook is reachable by a CSS locator and is NOT reachable by a role query — " +
      "which is correct for a pixel comparison and worth knowing before somebody 'improves' it into an " +
      "accessible-name query and finds nothing.",
    blocked:
      "BLOCKED ON THE HOURS BEING A DECLARED FIXTURE VALUE RATHER THAN AN INCIDENTAL ONE. The strip is " +
      "a pure function of saved hours, so it needs no clock — but `scripts/seed-baseline-fixtures.ts` " +
      "writes `operating_hours` as a uniform 06:00-21:00 across all five listings, chosen so the " +
      "BOOKER'S hour grid is populated. A seven-identical-bar week photographs as a solid block and " +
      "would pin nothing about segment placement, the touching-endpoint case D-153 cares about, or the " +
      "closed-day sentence. What is owed is a deliberately UNEVEN week on the addressed listing, plus " +
      "14-RESEARCH's `photos:0 / hours:none` listing variant so the published-without-hours signal has " +
      "a subject at all.",
  },
  "host-earnings": {
    kind: "document",
    url: "/host/earnings",
    hook: '[data-testid="panel-card"]',
    hookWhy:
      "⚠ THE WEAKEST HOOK IN THIS BLOCK, AND STATED AS SUCH RATHER THAN LEFT TO BE DISCOVERED. " +
      "`panel-card` is the declared pattern's own id and it resolves on EVERY panel on the page — and " +
      "on panels on four other host routes. It proves a panel rendered, not that this surface did. " +
      "14-UI-SPEC § Visual Baselines names it, so it is recorded as given; the plan that unblocks this " +
      "row should replace it with a hook only the earnings page produces.",
    blocked:
      "BLOCKED ON A PAYOUT LEDGER WITH FIXED DATES — and this row carries a second, unusual constraint " +
      "the other eight do not. On determinism: the surface prints payout dates that are `now`-relative, " +
      "and the fixture seeds an ACTIVATED wallet with NO ledger rows behind it, so the page has nothing " +
      "to photograph until `scripts/seed-baseline-fixtures.ts` grows a `host_payout`-ledger block with " +
      "literal instants. On scope: this row's whole job is to prove HFLOW-05 changed NOTHING — and " +
      "there is no pre-phase baseline to compare it against, because this surface was never baselined, " +
      "so a picture taken now would establish the reference rather than check it. D-156 and plan " +
      "14-01's string-literal freeze are what actually carry that proof today. This declaration was " +
      "written from 14-UI-SPEC's table and the seed script's contents WITHOUT opening the route or any " +
      "`payout-*` file, which the earnings freeze forbids this plan to touch. ⚠ THAT LAST SENTENCE IS " +
      "NO LONGER THE CURRENT TRUTH, AMENDED BY PLAN 17-13 (2026-08-30) AND KEPT RATHER THAN DELETED " +
      "because it is the provenance of everything above it: plan 17-11 has since DRIVEN this route at " +
      "320px in both themes, and what it measured changes what a baseline of it would be a picture " +
      "OF. `/host/earnings` polled ZERO non-shell interactive controls for a full 15 seconds on a " +
      "correct tree — the `payouts_enabled` fixture state suppresses `PayoutBanner`, `payout-row.tsx` " +
      "takes no `href` by design, and the zero-ledger branch passes `actions={null}`. So the surface " +
      "this row is waiting on a ledger to photograph is, in its CURRENT fixture state, a page with no " +
      "action of its own at all, and whether that is correct is an open PRODUCT question recorded as " +
      "`[17-D16]` in Phase 17's `deferred-items.md`. Whoever unblocks this row should read that first: " +
      "if the answer is that the surface should have a route out, the frame changes and a baseline " +
      "minted before the answer is a reference to the wrong page. The blockers themselves are " +
      "UNCHANGED — still the ledger with literal instants, still the missing host drive.",
  },

  // ─── 15-11 — the three remaining auth documents, and the profile ─────────────────────────────────
  //
  // All four share ONE hook, and it is the same one `auth-login` moved to above: D-162 gives every
  // `(auth)` document one card on the quiet ground, and `/profile` renders the pattern container too.
  // ⚠ THAT MAKES IT A WEAK HOOK ON ITS OWN — `panel-card` resolves on advisories and panels across
  // most of the product, so it proves A PANEL RENDERED, not that THIS surface did (the same caveat
  // `host-earnings` above states about itself). What makes it sufficient HERE and not there: each of
  // these URLs is a distinct static document with no redirect and no data dependency, so the only two
  // outcomes are "this page, with its card" and "a 404/500 with no card at all", and the second is
  // what the hook rejects. `/profile` is the one where that argument does NOT hold, because an
  // unauthenticated visit redirects to `/login` — which renders a `panel-card` and would satisfy this
  // hook. That is the whole of why its row is blocked below rather than merely undriven.
  "auth-signup": {
    kind: "document",
    url: "/signup",
    hook: '[data-testid="panel-card"]',
    hookWhy:
      "the signup card, and the reason to pin this surface at all: it is the tallest of the four " +
      "auth documents (name, email, password, confirm, the terms sentence and the brand-filled " +
      "submit), so it is the one whose column geometry the 320px floor can actually break. A 404 or " +
      "a boot failure renders no card and is rejected before a pixel is compared.",
    blocked: null,
  },
  "auth-forgot": {
    kind: "document",
    url: "/forgot-password",
    hook: '[data-testid="panel-card"]',
    hookWhy:
      "the request-a-link card in its FIRST state — one field and one button. This is the surface " +
      "whose success state is deliberately identical for a known and an unknown address (the " +
      "enumeration rule), so the row pins the state a visitor arrives on rather than the state they " +
      "leave on; a driven second capture is a different row and a different plan.",
    blocked: null,
  },
  "auth-reset": {
    kind: "document",
    // ⚠ THE TOKEN IN THIS PATH IS A FIXTURE LITERAL AND NOT A CREDENTIAL, which is the one thing to
    // read before copying it. The page reads `?token=` and seeds the shared reset schema with it; the
    // schema requires only NON-EMPTINESS client-side, so any literal renders the FORM. A tokenless
    // visit renders the "this reset link is missing its token" notice instead — a different document,
    // and the one this row would silently photograph if the query string were dropped. The literal is
    // therefore load-bearing, and it is spelled here rather than derived because nothing in `src/`
    // may import a seed script (see the Phase-12 rows' note). It authenticates nothing: no row in any
    // database matches it, and the surface never submits.
    url: "/reset-password?token=vrt-reset-token-fixture",
    hook: '[data-testid="panel-card"]',
    hookWhy:
      "the set-a-new-password card, which only the WITH-token branch renders — the tokenless branch " +
      "renders a notice paragraph instead. So this hook does a second job here that it does not do " +
      "on the other three: it distinguishes the two documents this one URL can produce, and the " +
      "wrong one is exactly what a dropped query string would give.",
    blocked: null,
  },
  profile: {
    kind: "document",
    url: "/profile",
    hook: '[data-testid="panel-card"]',
    hookWhy:
      "the public/private pair of panels this surface splits into (D-09/D-10). ⚠ AND ON THIS ROW THE " +
      "HOOK IS NOT A REACHABILITY PROOF, which is why the row is blocked rather than merely undriven: " +
      "`/login` renders a `panel-card` too, so an unauthenticated capture would satisfy this hook " +
      "while photographing the sign-in page. The hook is declared now so the row is complete when the " +
      "drive lands; it is not what makes the row safe.",
    blocked:
      "BLOCKED ON TWO THINGS, AND NEITHER IS DATA CORRECTNESS — this row is complete apart from them, " +
      "and both are named so the next plan can work FROM this rather than rediscover it. (1) A DRIVE. " +
      "`e2e/helpers/visual-drive.ts`'s `DRIVES` map keys six surfaces and has no entry for this one, " +
      "so it falls through to the default: a plain `goto` with no session. `/profile` redirects an " +
      "unauthenticated visitor to `/login`, and `/login` renders a `panel-card` — so the default " +
      "drive would mint two baselines of the SIGN-IN PAGE, they would satisfy the hook, and every run " +
      "afterwards would compare against them and pass. Permanent, silent and green, which is the " +
      "identical failure the Phase-14 host block records for all nine of its rows and the reason this " +
      "one is not declared shootable on the strength of its data being easy. (2) A SEEDED USER WITH " +
      "LITERAL FIELDS. `scripts/seed-baseline-fixtures.ts` creates listings and windows, not an " +
      "account this surface can be viewed as. What is owed is a `vrt_%` user with a FIXED literal " +
      "`createdAt`, a fixed first and last name, and NO avatar so the fallback initials are a function " +
      "of the fixed name. ⚠ NOTE WHAT IS *NOT* OWED, because it is the trap on this surface and the " +
      "answer is counter-intuitive: NO CLOCK CONTROL. The member-since line is derived from " +
      "`createdAt` and never from `now`, so a fixed literal in the seed makes the frame " +
      "date-independent by construction — the `[14-16]` rule is satisfied by the fixture, and " +
      "installing a clock here would be ceremony that pins nothing.",
  },

  // ─── 16-15 — the avatar crop dialog, and the wizard's cover-frame preview ────────────────────────
  "avatar-crop-dialog": {
    kind: "document",
    // The same route as `profile` above. The state is one interaction in, not a second URL — the crop
    // flow has no path of its own and never will: `ResponsiveDialog` is a portal over `/profile`.
    url: "/profile",
    hook: `[data-testid="responsive-dialog"]:has-text("${AVATAR_CROP_TITLE}")`,
    hookWhy:
      "the overlay's own box, narrowed by the crop dialog's title — and BOTH halves are load-bearing. " +
      "`responsive-dialog` alone is also rendered by this route's removal confirm and by the booking " +
      "sheet on another route, so the bare hook names a primitive rather than a surface. ⚠ AND THIS " +
      "HOOK IS THE ONE THING THIS ROW HAS THAT `profile` DOES NOT: it is a genuine reachability proof. " +
      "An undriven capture of `/profile` lands on `/login`, which renders a `panel-card` and would " +
      "satisfy that row's hook while photographing the sign-in page; `/login` renders no dialog at " +
      "all, so the same mistake here TIMES OUT instead of minting a permanent picture of the wrong " +
      "document. ⚠ THE TITLE IS INTERPOLATED FROM `AVATAR_CROP_TITLE`, NOT RESPELLED (WR-07). It " +
      "was a literal, justified as \"this module is a declaration and cannot import from `e2e/`\" — " +
      "but the string was never in `e2e/`. It lives in `src/lib/avatar.ts`, a directive-free leaf " +
      "this module may read as freely as `e2e/overflow-320.spec.ts` does (and that spec says so). " +
      "So the literal was a second spelling of a pinned copy string with nothing holding the two " +
      "in agreement — the rule-F2 hazard this phase enforces everywhere else.",
    blocked:
      "BLOCKED ON THREE THINGS, AND THE FIRST TWO ARE `profile`'S, INHERITED WHOLE — this surface IS " +
      "`/profile`, one interaction in. (1) A DRIVE. `e2e/helpers/visual-drive.ts`'s `DRIVES` map has " +
      "no entry for `/profile` and none for this state, so both fall through to the default plain " +
      "`goto` with no session, and an unauthenticated visitor is redirected to `/login`. (2) A SEEDED " +
      "USER WITH FIXED LITERALS, and on THIS row it is load-bearing in a way it is not on its parent, " +
      "because an overlay is captured `viewport` rather than `fullPage` (the lightbox and the sheet " +
      "are the precedent) — so the profile document behind the scrim is IN FRAME, member-since line " +
      "and fallback initials and all. An ad-hoc signup would put a `Member since <this month>` string " +
      "into a committed reference image, which is the time-bomb class this repository has already " +
      "shipped twice. What is owed is the same `vrt_%` user `profile`'s row names: a fixed literal " +
      "`createdAt`, a fixed first and last name, and no avatar. (3) A STAGED FILE, which is the one " +
      "blocker genuinely new here: this dialog does not exist until an image has passed all four " +
      "pre-dialog guards in `avatar-field.tsx`, so the drive must `setInputFiles` a committed fixture " +
      "and wait for the stage. ⚠ THAT THIRD ONE IS THE CHEAP HALF — `e2e/fixtures/square-400.png` is " +
      "generator-produced and gated byte-for-byte by `tests/design/image-fixtures.test.ts`, so the " +
      "pixels inside the crop circle are already as fixed as a literal. What is missing is a drive " +
      "that hands it over, not bytes to hand.",
  },
  "wizard-cover-preview": {
    kind: "document",
    // The fixture's own exclusive listing, by its literal id — `VRT_IDS.exclusive`, the same spelling
    // `host-wizard-rail` uses and for the same reason its comment gives (this module lives in `src/`
    // and cannot import the seed script). ⚠ The URL-contract test in `e2e/visual/surfaces.spec.ts`
    // filters on `/listings/`, so it does NOT see this row either — the same standing gap that row
    // records, now on a third surface.
    url: "/host/listings/vrt_listing_exclusive/edit",
    hook: 'figure:has-text("Listing page")',
    hookWhy:
      "the 16:9 frame, addressed through the caption the host actually reads. It proves two things at " +
      "once, which is why it is the caption and not the block's heading: the preview rendered, AND " +
      "the wizard is on the photos step WITH at least one photo — `photo-uploader.tsx` returns its " +
      "bespoke empty state before this block exists, so a frame cannot be on screen with an empty " +
      "gallery. ⚠ WHAT IT DOES NOT PROVE, said here rather than discovered later: that the PHOTOGRAPH " +
      "decoded. A `<figure>` renders perfectly around a broken image, and a baseline of eight " +
      "broken-image glyphs is exactly the failure `scripts/seed-baseline-fixtures.ts`'s determinism " +
      "paragraph was written after. What closes that is the fixture, not the hook: the seeded rows " +
      "carry committed local urls (`/vrt/photo-{i}.svg`), and `public/vrt/photo-0.svg`'s own header " +
      "is the authority on why each index looks different.",
    blocked:
      "BLOCKED ON TWO THINGS, AND THE FIRST IS THE PHASE-14 HOST BLOCK'S ONE STRUCTURAL BLOCKER, " +
      "SHARED VERBATIM: `e2e/helpers/visual-drive.ts`'s `DRIVES` map has no host entry, so this row " +
      "falls through to the default plain `goto` with no session — and every host route redirects an " +
      "unauthenticated visitor, so the default drive photographs `/login`. The fixture's own host " +
      "(`VRT_HOST_ID` = `vrt_host_1`, `can_host`) exists and owns this listing; what does not exist " +
      "is any way for a drive to BE that user, which is the same missing piece all nine Phase-14 rows " +
      "name. (2) A DRIVE THAT WALKS TO THE PHOTOS STEP. The wizard's step is CLIENT state — " +
      "`wizard.tsx` holds it in `stepInList` and there is no query parameter and no per-step route — " +
      "so no URL reaches this block and `?step=` would be an invention rather than a path. The drive " +
      "has to click through the rail, which is precisely what `host-wizard-rail`'s own blocked string " +
      "says is owed. ⚠ AND WHAT IS *NOT* OWED, because it is the assumption a reader will arrive " +
      "with and it is wrong: NO CLOUDINARY ROUND TRIP AND NO PHOTO FIXTURE. The uploader's widget is " +
      "how a host adds a photo, but the seed already commits EIGHT rows for this listing with local " +
      "urls under `public/vrt/`, and both the tiles and the preview render `photo.url` rather than " +
      "deriving anything from the Cloudinary-shaped `public_id`. The pixels are committed; the " +
      "session and the walk are not. " +
      "⚠ AND A THIRD THING STANDS IN THE WAY TODAY THAT IS NOT TECHNICAL, ADDED BY PLAN 17-13 " +
      "(2026-08-30) — read this one FIRST, because it is the reason a reader who clears blockers (1) " +
      "and (2) must still stop. UNBLOCKING THIS ROW IS THE PM'S TO SCHEDULE, NOT A SIDE EFFECT. " +
      "17-UI-SPEC § GATE-01 says of every other blocked row *'where this phase unblocks one it " +
      "unblocks it and shoots it'*, and this is the single row where that rule must NOT be reflexive. " +
      "Plan 16-15 recorded why as `[16-D10]`, and plan 17-13 re-affirmed it and deliberately left the " +
      "row blocked rather than taking it: flipping this `blocked` to `null` moves " +
      "`EXPECTED_BLOCKED` in `e2e/visual/surfaces.spec.ts` from 24 named entries to 23 AND makes the " +
      "next dispatch MINT a new court PNG — a 37th committed reference image. A binary reference " +
      "committed to this repository is a milestone artefact somebody has to look at and accept, not " +
      "an output an audit produces on its way past. `13-16` records that a phase can COMPLETE with " +
      "GATE-01 red and nothing notices, and `15-11` records ten references re-minted without anyone " +
      "reading the diff; both are what this clause exists to prevent a third time. WHEN THE PM " +
      "SCHEDULES IT: flip this field to `null`, remove the name from `EXPECTED_BLOCKED` IN THE SAME " +
      "COMMIT (or the visual gate goes red for the wrong reason), run a GENERATION dispatch in the " +
      "pinned Linux image (D-27/D-29 — no machine off Linux can do it), and READ the minted PNG " +
      "before committing it.",
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
// The 85 baselines
// ---------------------------------------------------------------------------

/**
 * Every baseline, in the UI-SPEC tables' own order and adding up to their own totals. COURT ONLY,
 * one shot per width, since D-138.
 *
 * ⚠ THIS TABLE WAS STALE IN TWO DIFFERENT WAYS UNTIL PLAN 16-15 REWROTE IT, and both are worth a
 * sentence, because a stale count inside a gate's own file is the defect class Phase 15 exists to
 * repair and this one sat two lines above the array it describes. (1) It stopped at Phase 12: plans
 * 13-15, 14-16 and 15-11 each added rows BELOW it and moved only the alias's docblock, so it read
 * `TOTAL 53` against an array of 74. (2) Every number in it was a TWO-THEME number — `both themes`,
 * `SUBTOTAL 27` — from before D-138 made `court` the single product theme, so even its Phase-11 half
 * was wrong by ten. It is rewritten from the array rather than amended, and the per-surface counts
 * below were MEASURED off the rows (`surface` + `width` extracted and tallied) rather than carried
 * over from any prose.
 *
 *   ── 11-UI-SPEC § GATE-01 (plan 11-22) ──────────────────────────────────────────────────────
 *   /dev/theme          320 / 768 / 1280   both themes in one frame; see its rows        3
 *   /terms              320 / 768 / 1280                                                 3
 *   /privacy            320 / 768 / 1280                                                 3
 *   root not-found      320 / 1280                                                       2
 *   global-error        1280               BLOCKED — nothing can throw from the root     1
 *   (auth) login        320 / 1280         hook + all three claims rewritten by 15-11    2
 *   root / listing / invite OG   1200 × 630   one each                                   3
 *                                                                         SUBTOTAL     17
 *
 *   ── 12-UI-SPEC § Visual Baselines (plan 12-14) ─────────────────────────────────────────────
 *   progressive search idle/activity/location/party/results/empty  375 / 1280           12
 *   /listings/[id]      320 / 768 / 1280                                                 3
 *   listing lightbox    1280               overlay, captured `viewport`                  1
 *   listing sheet       375                overlay, captured `viewport`                  1
 *   /listings/[id]/book 320 / 1280                                                       2
 *   collision notice    1280                                                             1
 *                                                                         SUBTOTAL     20
 *
 *   ── 13-UI-SPEC § Visual Baselines (plan 13-15) — 11 of the 12 BLOCKED ──────────────────────
 *   booking-moment      320 / 768 / 1280                                                 3
 *   booking-confirmed   320 / 1280                                                       2
 *   payment-pending     1280                                                             1
 *   payment-not-completed        320 / 1280                                              2
 *   payment-reversed-auto        1280                                                    1
 *   payment-reversed-manual      320 / 1280                                              2
 *   payment-reversed-indeterminate  320 / 1280   D-96's third branch; see SURFACE_IDS    2
 *   receipt-screen      320 / 1280                                                       2
 *   receipt-print       1280                                                             1
 *   booking-group       320 / 1280                                                       2
 *   invite-active       320 / 1280                                                       2
 *   booking-not-found   1280               the one that is SHOT                          1
 *                                                                         SUBTOTAL     21
 *
 *   ── 14-UI-SPEC § Visual Baselines (plan 14-16) — ALL NINE BLOCKED ──────────────────────────
 *   host-dashboard-agenda        320 / 1280                                              2
 *   host-dashboard-quiet         1280                                                    1
 *   host-dashboard-none          1280                                                    1
 *   host-requests-triage         320 / 1280                                              2
 *   host-requests-zero           1280                                                    1
 *   host-bookings-upcoming       320 / 1280                                              2
 *   host-wizard-rail             320 / 768 / 1280                                        3
 *   host-availability-strip      320 / 1280                                              2
 *   host-earnings                1280                                                    1
 *                                                                         SUBTOTAL     15
 *
 *   ── 15-UI-SPEC § Visual Baselines (plan 15-11) ─────────────────────────────────────────────
 *   (auth) signup       320 / 1280                                                       2
 *   (auth) forgot-password       320 / 1280                                              2
 *   (auth) reset-password        320 / 1280   WITH-token branch, by a fixture literal    2
 *   /profile            320 / 1280         BLOCKED — a drive and a seeded user           2
 *                                                                         SUBTOTAL      8
 *
 *   ── 16-UI-SPEC § Delta-16 (plan 16-15) — BOTH BLOCKED ──────────────────────────────────────
 *   avatar-crop-dialog  320 / 1280         bottom sheet at 320, centred 384px box at 1280   2
 *   wizard-cover-preview         320 / 1280   the frames are `w-32` at 320 and `w-40` above  2
 *                                                                         SUBTOTAL      4
 *                                                                            TOTAL     85
 *
 * The eighth row of 12-UI-SPEC's table — the listing OG card — is NOT in the Phase-12 subtotal. It is
 * the `og-listing` row already counted in the 17: plan 12-14 UNBLOCKED it with a fixture rather than
 * adding it, so counting it twice is the one arithmetic mistake this table exists to prevent. The
 * same shape recurs at Phase 15 (`auth-login` is an EDIT, not a fifth addition) and at Phase 16,
 * where BOTH surfaces are states of documents already in this table and neither is a new route.
 *
 * The `{arg}` each row produces is `{surface}-{width}-{theme}.png` (see `baselineArg`), which
 * Playwright expands to `{arg}-visual-linux.png` — the ONLY filename shape `.gitignore` permits to be
 * committed, and the shape `tests/design/gitignore-baselines.test.ts` polices the complement of.
 */
export const VISUAL_BASELINES = [
  // ─── /dev/theme — 3 ─────────────────────────────────────────────────────────────────────────────
  // ONE shot per width — which is now the rule everywhere (D-138), but was this surface's own
  // exception first, and the reason is why `/dev/theme` is NOT in the D-138 contract set. The page
  // renders court and grove SIDE BY SIDE in nested `[data-theme]` panes, so both themes are already
  // in every frame and the seeded theme paints only the header strip and the page background. A
  // hard-coded colour inside a pattern component would therefore appear IDENTICALLY in both panes
  // under either seed — the surface with the most components in the repository is the wrong
  // instrument for the swap question, not the obvious right one.
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

  // ─── /terms and /privacy — 6 ────────────────────────────────────────────────────────────────────
  {
    surface: "terms",
    width: 320,
    height: 720,
    theme: "court",
    why: "long-form prose at the floor: the measure, the type ladder and the notice must survive 320px.",
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
    width: 1280,
    height: 800,
    theme: "court",
    why: "the desktop reading view — the measure, the header and the footer in one frame.",
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
    width: 768,
    height: 1024,
    theme: "court",
    why: "the measure-constrained width.",
  },
  {
    surface: "privacy",
    width: 1280,
    height: 800,
    theme: "court",
    why: "desktop reading view.",
  },

  // ─── root not-found — 2 ─────────────────────────────────────────────────────────────────────────
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
    width: 1280,
    height: 800,
    theme: "court",
    why: "desktop. The 768 width is deliberately absent — the UI-SPEC asks for two widths here, and this page has no layout change between them.",
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

  // ─── (auth) login — 2, BOTH `why` STRINGS REWRITTEN BY PLAN 15-11 ───────────────────────────────
  //
  // The COUNT is unchanged and that is deliberate: 15-UI-SPEC's table lists this surface at the same
  // two widths it has had since Phase 11, so 15-11 is an edit here and an addition elsewhere. What
  // changed is what the two rows are pictures OF — both `why` strings described a header-led
  // composition that D-162 removed (plan 15-06), and a `why` that is false is worse than a missing
  // one, because the next reader takes it as the record of a decision.
  //
  // ⚠ AND THE TWO COMMITTED PNGs ARE STALE RIGHT NOW — `auth-login-320-court-visual-linux.png` and
  // `auth-login-1280-court-visual-linux.png`, both pinning a header this layout no longer renders.
  // They are neither deleted nor regenerated here. `.github/workflows/baselines.yml` is
  // `workflow_dispatch`-only and is the only thing in this repository permitted to write a baseline,
  // and `playwright.config.ts` constructs the `visual` project only on Linux, so no developer machine
  // in this project can produce a replacement. The dispatch must REPLACE these two rather than merely
  // add siblings; a run that leaves them untouched means the hook edit above did not take.
  {
    surface: "auth-login",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the 320px floor, and since D-162 that is a picture of the whole composition rather than of a " +
      "shell around it: the wordmark, ONE card on the quiet ground, the footer. This is the width at " +
      "which the column's `max-w-sm` stops constraining anything and the card's own padding is the " +
      "only gutter left, so it is where the form's labels and the brand-filled submit are closest to " +
      "the viewport edge.",
  },
  {
    surface: "auth-login",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop: the same three elements, with the card centred in a viewport four times its column's " +
      "width. The ground is most of the frame here and the card is a small object on it, which makes " +
      "this the row where the quiet surface's own token and the card's elevation are visible at all — " +
      "at the floor they are almost entirely covered by the card.",
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
  // PHASE 12 — 13 ROWS (plan 12-14, halved by D-138). Every one reads the committed fixture; four
  // are driven to a state.
  //
  // THIS BLOCK WAS WRITTEN AS PAIRS AND IS NO LONGER ONE. Under D-135 each surface was shot in both
  // themes and the smoke was `court.png !== grove.png`; D-138 makes `court` the single product theme
  // and moves that proof to a fixed four-surface contract spec, so what remains here is one theme per
  // surface per width. The identical-content argument the pairs rested on has NOT gone away, it has
  // moved: `e2e/visual/theme-swap.spec.ts` renders its four surfaces twice, and two captures that
  // differ in CONTENT — two different booking windows, two different bookers, two different days —
  // would diverge without the tokens moving a pixel. That is why the contract set is four PLAIN
  // NAVIGATIONS with no drive and no minted row. The drives below are still keyed to the SAME fixed
  // window per surface and the drivers still serialize the rows that share one
  // (`e2e/helpers/visual-drive.ts` § slot allocation) — that machinery is about two runs of the same
  // row agreeing across time, which one theme needs exactly as much as two did.
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════

  // ─── Progressive search — six production states at mobile and desktop widths ────────────────────
  {
    surface: "search-idle-pill",
    width: 375,
    height: 812,
    theme: "court",
    why: "the untouched first impression at the narrow product viewport, including the single search-entry pill.",
  },
  {
    surface: "search-idle-pill",
    width: 1280,
    height: 800,
    theme: "court",
    why: "the same entry state at desktop, where the surrounding browse layout has room to settle beside it.",
  },
  {
    surface: "search-activity-step",
    width: 375,
    height: 812,
    theme: "court",
    why: "the catalogue step at the narrow viewport, where search input, catalogue groups, and navigation controls stack.",
  },
  {
    surface: "search-activity-step",
    width: 1280,
    height: 800,
    theme: "court",
    why: "the activity catalogue at desktop, pinning the expanded first question without a synthetic route state.",
  },
  {
    surface: "search-location-step",
    width: 375,
    height: 812,
    theme: "court",
    why: "the address question at the narrow viewport after a real catalogue selection.",
  },
  {
    surface: "search-location-step",
    width: 1280,
    height: 800,
    theme: "court",
    why: "the address question at desktop, including the production autocomplete control before an address is chosen.",
  },
  {
    surface: "search-party-step",
    width: 375,
    height: 812,
    theme: "court",
    why: "the group branch at the narrow viewport, where the party input and submit action wrap together.",
  },
  {
    surface: "search-party-step",
    width: 1280,
    height: 800,
    theme: "court",
    why: "the group branch at desktop after deterministic activity and address answers have been retained.",
  },
  {
    surface: "search-results",
    width: 375,
    height: 812,
    theme: "court",
    why:
      "the completed one-person journey at the narrow viewport, with real seeded cards rather than a URL-only result grid.",
  },
  {
    surface: "search-results",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "the completed one-person journey at desktop, retaining `search-results` in the theme-swap contract set.",
  },
  {
    surface: "search-empty",
    width: 375,
    height: 812,
    theme: "court",
    why:
      "the valid but over-capacity group journey at the narrow viewport, pinning the explicit empty state without inventing capacity copy.",
  },
  {
    surface: "search-empty",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "the same valid no-match journey at desktop, proving the rendered empty state rather than a legacy relaxation branch.",
  },

  // ─── `/listings/[id]` — 3 ───────────────────────────────────────────────────────────────────────
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
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the most load-bearing row of this phase's six: the strip, the mosaic, the six " +
      "`<h2>` sections in their required order, the sticky rail with its own total, the availability " +
      "grid showing the seeded conflict's struck-through hours, and the map panel — all pinned at once.",
  },

  // ─── `/listings/[id]` lightbox open — 1 ─────────────────────────────────────────────────────────
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
      "dialog rather than the RESP-01 pattern, so nothing else in the set pins that composition. " +
      "Carried over from the grove row D-138 dropped, because it is the observation that made the " +
      "pair worth shooting and it is still true of the surface: a full-screen overlay is where a " +
      "vendored component's own palette survives longest, since there is no themed page around it " +
      "to look wrong against. This baseline pins the scrim; it cannot prove the scrim reads a token.",
  },

  // ─── `/listings/[id]` sheet open — 1 ────────────────────────────────────────────────────────────
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

  // ─── `/listings/[id]/book` — 2 ──────────────────────────────────────────────────────────────────
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
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop checkout: SHELL-03's minimal header carrying the one countdown at 14:52, the summary, " +
      "the disclosure and the frozen quote. The only baseline in the set that pins a money surface, " +
      "and the only one that pins a rendered clock.",
  },

  // ─── collision notice — 1 ───────────────────────────────────────────────────────────────────────
  {
    surface: "collision-notice",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "STATE-07 / D-55: the window that went, named in the venue's own zone, above a refreshed picker " +
      "in which those hours are already struck through. It is baselined because the requirement is a " +
      "LOOK as much as a behaviour — the sketch's own `What it must never become` section is about " +
      "whether this reads as a normal outcome or as a failure, and nothing but a picture can hold " +
      "that. Carried over from the grove row D-138 dropped: this is the phase's one status surface " +
      "with a tone, and that tone comes from `status-tones.ts` rather than from a literal.",
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // PHASE 13 — 21 ROWS ACROSS 12 SURFACES (plan 13-15, halved by D-138). ELEVEN OF THE TWELVE ARE
  // BLOCKED.
  //
  // 13-UI-SPEC § Visual Baselines' table, row for row, at the widths it names — in `court` only,
  // because D-138 makes court the single product theme and the table's second-theme column is gone —
  // plus the reversed state's THIRD branch, which the table predates (see `SURFACE_IDS`). A reader
  // comparing this block against that table will find half the rows and no theme column; that is the
  // decision, not a transcription error. The blocked rows are
  // declared rather than omitted for this module's founding reason, and each surface's `blocked`
  // field carries which of the two blockers applies and why.
  //
  // ⚠ THE 320px ROWS ARE CAPTURED AT 320x568, NOT AT THE 320x720 PHASE 11 USED. Two reasons and both
  // are this phase's: 568 is the viewport AC#22 names for the money statement's above-the-fold claim,
  // and `CONFIRMATION_MOMENT_MIN_H` is `calc(100svh - header)`, so on the moment the viewport HEIGHT
  // is part of the composition rather than merely the initial scroll position of a full-page stitch.
  // A 720px capture would pin a taller moment than any phone renders.
  // ─── booking-moment — 3 ────────────────────────────────────────────────────────────────
  {
    surface: "booking-moment",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the 320x568 floor — AC#22's own viewport, and the one the moment is most constrained at: " +
      "`CONFIRMATION_MOMENT_MIN_H` is `calc(100svh - header)`, so the height is not decoration " +
      "here, it decides the composition.",
  },
  {
    surface: "booking-moment",
    width: 768,
    height: 800,
    theme: "court",
    why:
      "the tablet step, where the heading takes its wider Display step and the " +
      "single-column stack stops being the only option. THE DISPLAY TOKEN IS DELIBERATELY NOT " +
      "SPELLED IN THIS SENTENCE: `tests/design/type-scale.test.ts` pins the Display call sites BY " +
      "FILE and reads string LITERALS rather than comments, so naming it in a `why` adds this module " +
      "to that inventory. Measured — the first draft did, and the gate went red with " +
      "`src/lib/design/visual-baselines.ts: 2` in the received map.",
  },
  {
    surface: "booking-moment",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop. The before-picture of the decay: this frame and `booking-confirmed` at the same " +
      "width are the pair that shows what the moment adds and what it gives back.",
  },
  // ─── booking-confirmed — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "booking-confirmed",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the floor. The after-picture, and the frame that catches the moment failing to decay — a " +
      "confirmed detail that still carried the moment's chrome would be visible here as a diff " +
      "against nothing else changing.",
  },
  {
    surface: "booking-confirmed",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, paired with the moment's own 1280 frame.",
  },
  // ─── payment-pending — 1 ────────────────────────────────────────────────────────────────
  {
    surface: "payment-pending",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width only: the surface is a settling interstitial with no responsive claim of its " +
      "own, and the reason it is baselined at all is D-71 — no error-shaped affordance at ANY " +
      "threshold, which is a thing a picture can hold and a predicate cannot.",
  },
  // ─── payment-not-completed — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "payment-not-completed",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the floor, where the retry action and the hold display share a 288px column.",
  },
  {
    surface: "payment-not-completed",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the second half of the pair. A surface baselined at one width proves nothing " +
      "about the other, and each of these compositions changes shape at `lg:` — the booking shell " +
      "takes its wider column, the group page's share row goes inline, and the invite card stops " +
      "stacking. The 320 row is where they are constrained; this one is where they are laid out.",
  },
  // ─── payment-reversed-auto — 1 ────────────────────────────────────────────────────────────────
  {
    surface: "payment-reversed-auto",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width: the automatic branch's claim is its COPY (a refund was issued, on a rail with " +
      "a verified window), and the layout is the manual branch's, which is baselined at both " +
      "widths.",
  },
  // ─── payment-reversed-manual — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "payment-reversed-manual",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the phase's sharpest frame — 13-UI-SPEC names this exact capture as where the support " +
      "control's above-the-fold claim is proved.",
  },
  {
    surface: "payment-reversed-manual",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, so the pair shows that the layout does not reshuffle between branches.",
  },
  // ─── payment-reversed-indeterminate — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "payment-reversed-indeterminate",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the floor. This is the branch a seeded row and a CI run actually render, and 320x568 is " +
      "where its money panel was measured at 570.94px in grove before plan 13-15's fix — the " +
      "frame most worth pinning in the whole block.",
  },
  {
    surface: "payment-reversed-indeterminate",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the second half of the pair. A surface baselined at one width proves nothing " +
      "about the other, and each of these compositions changes shape at `lg:` — the booking shell " +
      "takes its wider column, the group page's share row goes inline, and the invite card stops " +
      "stacking. The 320 row is where they are constrained; this one is where they are laid out.",
  },
  // ─── receipt-screen — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "receipt-screen",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the floor. A receipt is a table of figures in a 288px column, which is where a money " +
      "surface wraps badly first.",
  },
  {
    surface: "receipt-screen",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the control frame for the print capture below: the two differ only by " +
      "media, so a diff between them is the print contract itself.",
  },
  // ─── receipt-print — 1 ────────────────────────────────────────────────────────────────
  {
    surface: "receipt-print",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "print media via `emulateMedia`. Print is where a fill-based theme signal disappears and " +
      "only type scale and radius are left to carry it, which is the property the print contract " +
      "is built on. This surface is NOT in the D-138 contract set — under D-135 the swap smoke " +
      "compared every document surface and therefore this one; it now compares a fixed four, and " +
      "print is not among them.",
  },
  // ─── booking-group — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "booking-group",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the floor, where the share field, its copy control and the roster stack.",
  },
  {
    surface: "booking-group",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the second half of the pair. A surface baselined at one width proves nothing " +
      "about the other, and each of these compositions changes shape at `lg:` — the booking shell " +
      "takes its wider column, the group page's share row goes inline, and the invite card stops " +
      "stacking. The 320 row is where they are constrained; this one is where they are laid out.",
  },
  // ─── invite-active — 2 ────────────────────────────────────────────────────────────────
  {
    surface: "invite-active",
    width: 320,
    height: 568,
    theme: "court",
    why:
      "the floor. The app's most-shared public surface, and the one whose two controls shipped " +
      "as 22px pointer targets until plan 13-15 measured them.",
  },
  {
    surface: "invite-active",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the second half of the pair. A surface baselined at one width proves nothing " +
      "about the other, and each of these compositions changes shape at `lg:` — the booking shell " +
      "takes its wider column, the group page's share row goes inline, and the invite card stops " +
      "stacking. The 320 row is where they are constrained; this one is where they are laid out.",
  },
  // ─── booking-not-found — 1 ────────────────────────────────────────────────────────────────
  {
    surface: "booking-not-found",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width, and the ONLY Phase-13 row that is shot today: it renders no booking, no " +
      "money, no date and no identity, so it is the one surface in this block a per-run seed " +
      "cannot destabilise.",
  },

  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  // 14-16 — THE FIVE HOST SURFACES. FIFTEEN ROWS, ALL FIFTEEN BLOCKED, ZERO PICTURES ADDED.
  // ═══════════════════════════════════════════════════════════════════════════════════════════════════
  //
  // Court only (D-138). The widths are 14-UI-SPEC § Visual Baselines' own, and every one of them is
  // there for a stated reason rather than because it is a familiar number — a row whose width is
  // plausible but wrong compiles, which is this file's own recorded blind spot.
  //
  // ⚠ NOT ONE OF THESE WAS GENERATED, AND THE INVENTORY SAYS SO WHERE A READER WILL SEE IT. The
  // `visual` project is not constructed off Linux (`playwright.config.ts:39`), and the machine plan
  // 14-16 ran on is win32 — so `--project=visual` does not exist there, `updateSnapshots` is `"none"`
  // unconditionally anyway (`:78`), and the thirty committed pictures under
  // `e2e/visual/surfaces.spec.ts-snapshots/` are byte-for-byte untouched. A complete run still commits
  // THIRTY files after this addition, not forty-five. Anyone reading "66 baselines" as "66 files" will
  // be wrong by thirty-six.

  // ─── /host — the dashboard's three agenda states — 4 ────────────────────────────────────────────
  {
    surface: "host-dashboard-agenda",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, where the agenda row is at its tallest: the meta line — space title, venue-local " +
      "day, window and city suffix — wraps to four lines and the row measures 132px against the 72px " +
      "it settles at by the small breakpoint (plan 14-15 measured both). This is the width where the " +
      "row's wrap behaviour is the layout rather than a detail of it.",
  },
  {
    surface: "host-dashboard-agenda",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, where the same row is 72px and the heading row lays out its route-out beside the " +
      "second-level heading rather than beneath it. Two widths and not three: the agenda has no " +
      "tablet-specific composition, and the row height is already at its floor by 639px.",
  },
  {
    surface: "host-dashboard-quiet",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width. D-142's fallback is a single muted advisory carrying one sentence; it has no layout " +
      "change between the floor and desktop that the agenda rows above do not already pin, and a 320 " +
      "row would be a second picture of a wrapped sentence.",
  },
  {
    surface: "host-dashboard-none",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width, and the row that pins the ABSENCE tone: an `EmptyState` with no retry affordance, " +
      "no alerting role and no alarm colour. It is the cheapest of the nine to unblock and the one " +
      "whose regression — a normal state dressed as a failure — a screenshot catches better than any " +
      "source scan can.",
  },

  // ─── /host/requests — the inbox's two states — 3 ────────────────────────────────────────────────
  {
    surface: "host-requests-triage",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, and the most load-bearing of the fifteen. D-146's whole claim is a HIERARCHY — the " +
      "SLA countdown reading louder than the money and the guest name — and 320 is where the card " +
      "tree renders, where the D-99 reason line fills the status column and where the two 44px " +
      "actions and the truncating title compete for 288px. `e2e/host-inbox-hierarchy.spec.ts` " +
      "measures the type scale; only a picture shows the result.",
  },
  {
    surface: "host-requests-triage",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, where the route swaps trees entirely: the card stack is hidden and a six-column table " +
      "renders, with the deadline as its FIRST column. It is not a wider version of the row above — " +
      "it is a different composition of the same facts, which is exactly the pair a baseline is for.",
  },
  {
    surface: "host-requests-zero",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width. Inbox-zero reads as DONE rather than as empty (D-147) — the positive tone, one " +
      "`aria-hidden` success glyph, zero actions — and that reading is a colour-and-spacing decision " +
      "no source scan can check. It has no per-width composition.",
  },

  // ─── /host/bookings — 2 ────────────────────────────────────────────────────────────────────────
  {
    surface: "host-bookings-upcoming",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, where the list is a card stack and a resting row measures 196px against the 37px " +
      "its desktop table row occupies (plan 14-15's numbers). The tab strip, the row's description " +
      "list and its status badge all stack here.",
  },
  {
    surface: "host-bookings-upcoming",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, the table tree — the second of the two routes that swap composition at the medium " +
      "breakpoint. The pair is what makes the swap visible; either alone photographs half a surface.",
  },

  // ─── the wizard's step rail — 3 ─────────────────────────────────────────────────────────────────
  // ⚠ THE ONLY SURFACE IN THE INVENTORY WITH THREE WIDTHS, and the middle one is the reason. See the
  // 768 row: `lg` is 1024, so 768 and 1280 photograph two DIFFERENT placements of the publish
  // checklist, and a pair at 320/1280 would miss the collapsed one entirely.
  {
    surface: "host-wizard-rail",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, where the rail's nine markers must lay out without wrapping past the declared " +
      "marker box and the checklist is a closed disclosure. `measurements.ts` carries the arithmetic " +
      "for why nine markers fit at this width; this is the picture of it holding.",
  },
  {
    surface: "host-wizard-rail",
    width: 768,
    height: 1024,
    theme: "court",
    why:
      "LOAD-BEARING, AND NOT A THIRD COPY OF EITHER NEIGHBOUR. The publish checklist's placement " +
      "changes at `lg` (1024px), so 768 is the widest width at which it is still the COLLAPSED " +
      "disclosure beneath the form rather than a persistent side panel. A 320/1280 pair photographs " +
      "the two ends of that fork and never the fork itself.",
  },
  {
    surface: "host-wizard-rail",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "above `lg`, where D-149's checklist takes its own column beside the step's form and the rail " +
      "spans the top. This is the composition the persistent-checklist decision is about: the " +
      "checklist stops being an end-of-flow surprise precisely because it is readable here at every " +
      "step.",
  },

  // ─── the availability week strip — 2 ────────────────────────────────────────────────────────────
  {
    surface: "host-availability-strip",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, where seven day columns share 288px — the width at which the strip's bars are " +
      "narrowest and its day captions closest to colliding. The strip is a pure function of saved " +
      "hours, so this row pins geometry and nothing else, which is what makes it cheap and stable.",
  },
  {
    surface: "host-availability-strip",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, where the strip sits above the day editor with room to breathe and the segment " +
      "placement is legible enough for a reader to check it against the hours beneath. Two widths, " +
      "not three: nothing about this component changes at the tablet width.",
  },

  // ─── /host/earnings — 1 ────────────────────────────────────────────────────────────────────────
  {
    surface: "host-earnings",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "one width, and its job is to prove HFLOW-05 changed NOTHING. ⚠ That job is not yet doable and " +
      "the row says so at the surface: there is no pre-phase picture to compare against, so a first " +
      "capture would establish a reference rather than check one. The claim is carried today by " +
      "D-156's freeze and plan 14-01's AST scan over every string literal in the earnings and payout " +
      "files — which is a stronger check of 'nothing changed' than a screenshot, and is the reason " +
      "this row is the least urgent of the fifteen.",
  },

  // ═══ 15-11 — EIGHT ROWS, SIX OF WHICH ARE SHOOTABLE TODAY ═══════════════════════════════════════
  //
  // Stated at the top rather than left to two `blocked` strings, because the Phase-13 and Phase-14
  // blocks above both had to learn that lesson: `auth-signup`, `auth-forgot` and `auth-reset` need
  // NOTHING — no session, no seed, no drive, no clock, no fixture date — and are the cheapest rows in
  // this file. `profile` needs a drive and a seeded user, and is blocked at its surface with both
  // named. So this block is +6 pictures on the next dispatch, not +8, and the two `auth-login`
  // replacements bring that dispatch to 36 committed PNGs against 74 declared rows.
  //
  // COURT ONLY (D-138), like everything below Phase 12. Two widths each, and the reason is the same
  // for all four surfaces: the 320px floor is where the shared `max-w-sm` column stops constraining
  // and the desktop width is where the ground around the card is most of the frame. Nothing in this
  // group reflows at the tablet width, so a third row would be a duplicate with a different filename.

  // ─── (auth) signup — 2 ──────────────────────────────────────────────────────────────────────────
  {
    surface: "auth-signup",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor on the TALLEST of the four auth documents — four fields, the terms sentence and the " +
      "submit — so it is the one where the card's vertical rhythm and the label/control spacing have " +
      "the least room to be wrong in. If the 320px column breaks anywhere in this group it breaks " +
      "here first, which is why this row is worth more than the login pair it resembles.",
  },
  {
    surface: "auth-signup",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, and the pair's purpose is the COMPARISON with the login row at the same width: the " +
      "two documents share a layout, a wordmark and a card, and D-162's claim is that they read as " +
      "one composition. Two baselines at one width is how a drift between them becomes visible.",
  },

  // ─── (auth) forgot-password — 2 ─────────────────────────────────────────────────────────────────
  {
    surface: "auth-forgot",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor on the SHORTEST of the four — one field, one button — which makes it the opposite " +
      "end of the same column from signup. A card this short is where the layout's vertical centring " +
      "is actually exercised: it is the only one of the four with meaningful empty ground above and " +
      "below it at this height.",
  },
  {
    surface: "auth-forgot",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop. The row pins the FIRST state deliberately — after submission this surface shows a " +
      "sent-confirmation that is identical for a known and an unknown address, and photographing that " +
      "state needs an interaction, which would make this the only driven row in the group for no " +
      "gain the enumeration tests do not already give.",
  },

  // ─── (auth) reset-password — 2 ──────────────────────────────────────────────────────────────────
  {
    surface: "auth-reset",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, on the WITH-token branch — the fixture literal in the surface's URL is what selects " +
      "it, and the tokenless branch is a different document (a notice paragraph, no form). Worth " +
      "pinning at this width because the password field carries a reveal control inside its own box, " +
      "which is the one control in this group whose hit area competes with its input at 320px.",
  },
  {
    surface: "auth-reset",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop. ⚠ THIS ROW IS THE GROUP'S ONE STANDING RISK AND IT IS NOT A DATE: the URL carries a " +
      "literal token string, so if the page ever starts VALIDATING that token before rendering the " +
      "form, this row silently becomes a picture of the missing-token notice instead. That would not " +
      "fail the hook — the notice renders inside the same card — so nothing here would catch it. The " +
      "check that would is a `why`-level fact stated once: the form, not the notice, is the subject.",
  },

  // ─── /profile — 2, BLOCKED ──────────────────────────────────────────────────────────────────────
  {
    surface: "profile",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, where the public and private panels stack and the avatar/initials block sits above " +
      "the name fields. Currently BLOCKED — see the surface's `blocked` reason, which names a drive " +
      "and a seeded user and explicitly says no clock is owed.",
  },
  {
    surface: "profile",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, where the booker shell's declared container width is what holds the two panels rather " +
      "than the viewport, so this row is the one that would pin `BOOKING_SHELL` on this surface. " +
      "Currently BLOCKED for the same two reasons as its pair — and blocked is the honest state: an " +
      "undriven capture here photographs `/login`, which renders a card and satisfies the hook.",
  },

  // ─── the avatar crop dialog — 2, BLOCKED ────────────────────────────────────────────────────────
  {
    surface: "avatar-crop-dialog",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, where this overlay is a BOTTOM SHEET rather than a centred box — a different " +
      "composition, not the same one narrowed, which is the whole reason the surface earns two widths " +
      "instead of one. What only this width pins: the crop stage at its `dvh`-capped size " +
      "(`min(320px, 100vw - 2rem, 40dvh)`, which at this viewport resolves to the 288px content box " +
      "and leaves the stage nothing to spare), the action bar reversed into a column, and the mask " +
      "ring drawn over a circle that fills its container edge to edge. Currently BLOCKED — see the " +
      "surface's `blocked` reason, which names a drive, a seeded user and a staged file, and says " +
      "which of the three is already solved.",
  },
  {
    surface: "avatar-crop-dialog",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, where the same dialog is a CENTRED 384px box on a scrim — measured 384 wide against " +
      "the 320px row's 320, i.e. the overlay is wider than the whole viewport its other row uses. " +
      "What only this width pins: the primitive's declared max-width actually holding (the 320 row " +
      "cannot see it, because there the viewport is the constraint), the scrim around it, and the " +
      "action bar in its row direction rather than its column one. Currently BLOCKED for the same " +
      "three reasons as its pair.",
  },

  // ─── the wizard's cover-frame preview — 2, BLOCKED ──────────────────────────────────────────────
  {
    surface: "wizard-cover-preview",
    width: 320,
    height: 720,
    theme: "court",
    why:
      "the floor, and the one width where the preview's layout can actually fail: the two frames are " +
      "`w-32` here, so 128 + the `gap-2` gutter + 128 = 264px has to fit inside the wizard's content " +
      "box, and if it does not they wrap and the block stops being a side-by-side comparison — which " +
      "is the only thing it is for. Currently BLOCKED — see the surface's `blocked` reason, which " +
      "names a host session and a walk to the photos step, and says why no photo fixture is owed.",
  },
  {
    surface: "wizard-cover-preview",
    width: 1280,
    height: 800,
    theme: "court",
    why:
      "desktop, where the `sm:` branch takes over and both frames are `w-40` — a DIFFERENT pair of " +
      "boxes rather than the same pair with more room, which is why one shot cannot stand for both. " +
      "This is also the width at which the two aspect ratios are far enough apart to read as the " +
      "comparison the block is making: the 16:9 hero frame and the squarer 4:3 card frame side by " +
      "side, both cropping the same photograph. Currently BLOCKED for the same two reasons as its pair.",
  },
] as const satisfies readonly BaselineRow[];

// ---------------------------------------------------------------------------
// The one theme-swap exclusion
// ---------------------------------------------------------------------------

/**
 * ⚠ THIS IS NO LONGER THE MEMBERSHIP MECHANISM, AND SAYING SO IS THE POINT OF THIS PARAGRAPH.
 *
 * Under D-135 the compared set was DERIVED — every document surface MINUS these — so an entry here
 * was the only way to keep a surface out, and this list decided what the smoke looked at. Under
 * D-138 the compared set is an explicit allow-list of four (`THEME_SWAP_SURFACES` below), so
 * twenty-three document surfaces are outside the smoke without appearing here at all. Leaving the
 * old claim standing would be the stale-reason failure this repository keeps recording.
 *
 * WHAT IT IS NOW, and both halves are worth keeping:
 *
 *   1. THE RECORDED ARGUMENT. `global-error` renders its own document and receives no global styles,
 *      so an app-level `data-theme` never reaches it and an identical court/grove pair is CORRECT
 *      there. That was true when it was written and it is true now. Deleting an argument is not the
 *      same as it becoming false, and a reader who later asks "why isn't `global-error` in the
 *      contract set?" should meet the answer rather than a silence — `contrast-pairs.ts`'s
 *      `EXCLUDED_PAIRS` idiom, for the same reason.
 *   2. BELT AND BRACES. `theme-swap.spec.ts` asserts at runtime that no entry here appears in the
 *      compared set. That assertion is trivially satisfied today because the four are written out by
 *      hand — which is exactly when a guard is cheap and worth keeping, rather than a reason to drop
 *      it.
 *
 * A SECOND ENTRY MUST STILL BE ARGUED FOR, NOT APPENDED. `ThemeSwapExclusionCountIsOne` below makes
 * adding one a compile error on every machine, so the argument has to be made in the same change
 * that bumps the number — which is the only moment anybody will ever read it.
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
// Compile gates — the three counts, checked on every machine by tsc and by `next build`
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
 * The three UI-SPECs' totals, as a type — COURT ONLY, since D-138.
 *
 *   11-UI-SPEC § GATE-01 (plan 11-22)          3 + 6 + 2 + 1 + 2 + 3           = 17
 *   12-UI-SPEC § Visual Baselines (12-14)      3 + 2 + 3 + 1 + 1 + 2 + 1       = 13
 *   13-UI-SPEC § Visual Baselines (13-15)      3 + 2 + 1 + 2 + 1 + 2 + 2
 *                                              + 2 + 1 + 2 + 2 + 1             = 21
 *   14-UI-SPEC § Visual Baselines (14-16)      2 + 1 + 1 + 2 + 1 + 2 + 3
 *                                              + 2 + 1                         = 15
 *   15-UI-SPEC § Visual Baselines (15-11)      2 + 2 + 2 + 2                   =  8
 *   16-UI-SPEC § Delta-16 (plan 16-15)         2 + 2                           =  4
 *                                                                        TOTAL = 78
 *
 * ⚠ 15-UI-SPEC's TABLE HAS FIVE ROWS AND THIS SUBTOTAL IS FOUR SURFACES, AND THE DIFFERENCE IS AN
 * EDIT RATHER THAN A LOSS. The fifth is `auth-login`, declared in Phase 11 and still carrying its
 * original two rows above — plan 15-11 rewrote that surface's hook and all three of its prose claims
 * for D-162's composition instead of adding it twice. 15-UI-SPEC's own inventory note says 37 → 42
 * and 66 → 76 and then hedges "measure the file's real counts before moving the aliases"; the
 * measured truth is 37 → 41 and 66 → 74 plus one edited row pair, and the hedge is what saved it.
 *
 * ⚠ THIS NUMBER WAS 95 AND IS NOW 51 BECAUSE OF D-138, NOT BECAUSE 44 BASELINES WERE LOST. `court`
 * (coral) is FitOut's SINGLE product theme and `grove` is demoted to a token-contract PROBE, so the
 * second theme's 44 rows are gone from this inventory and 24 grove PNGs were deleted from
 * `surfaces.spec.ts-snapshots/`. NO SURFACE LOST ITS LAST ROW — every one of the 28 is still
 * baselined, at every width it was baselined at. What grove still proves it proves in three cheap
 * places instead: `tests/design/theme-tokens.test.ts` (24-name key-set parity),
 * `contrast-pairs.ts` + `tests/design/contrast.test.ts` (both themes' declared pairs), and
 * `e2e/visual/theme-swap.spec.ts`, which renders a FIXED FOUR surfaces in both themes and requires
 * the frames to differ. The reason is stated at the number so a reader meeting a 51 that used to be
 * a 95 finds it here rather than in a commit message.
 *
 * THE PHASE-13 SUBTOTAL IS 21 AGAINST A TABLE THAT ADDS TO 19, AND THE TWO ARE THE REVERSED STATE'S
 * THIRD BRANCH. 13-UI-SPEC's table was written before plan 13-10 added D-96's `indeterminate` arm —
 * the one a probe that learns nothing lands on, which is every environment GATE-01 can produce. Its
 * two rows carry the widths the table gave the manual branch, because it is the branch that renders.
 * See `SURFACE_IDS` for the argument and each surface's `blocked` field for what stands in the way.
 *
 * ⚠ ELEVEN OF THE TWELVE PHASE-13 SURFACES ARE BLOCKED, SO 20 OF THESE 21 ROWS SHOOT NOTHING TODAY.
 * That is stated here as well as at the rows because a reader who takes 66 for a file count will be
 * wrong by 36.
 *
 * ⚠ AND ALL NINE PHASE-14 SURFACES ARE BLOCKED, SO ALL 15 OF ITS ROWS SHOOT NOTHING EITHER. The
 * arithmetic, spelled out because it is the honest headline of this file: 66 declared, 36 blocked
 * (1 structural + 20 Phase-13 + 15 Phase-14), 30 shot. **A COMPLETE RUN COMMITS THIRTY PNGs — THE
 * SAME THIRTY AS BEFORE PHASE 14.** The host block added declarations and not one picture, and it did
 * not generate any: `playwright.config.ts:39` constructs the `visual` project only on Linux, and the
 * machine that wrote these rows is win32, so the command to shoot them does not exist there. Every
 * host row's `blocked` string names the fixture file and the specific missing piece, so the inventory
 * is something a later plan can work FROM rather than an absence somebody has to rediscover.
 *
 * PHASE 15 IS THE FIRST BLOCK SINCE PHASE 12 THAT MOVES THE PICTURE COUNT, AND IT MOVES IT BY SIX.
 * Re-stated in full rather than amended, because the two paragraphs above are now the history and
 * this is the current number: **74 declared, 38 blocked (1 structural + 20 Phase-13 + 15 Phase-14 +
 * 2 Phase-15), 36 shot.** The six are `auth-signup`, `auth-forgot` and `auth-reset` at two widths
 * each — anonymous static forms needing no session, no seed, no drive and no clock, which is why
 * they are `blocked: null` where nineteen of the last twenty-four additions were not. The two
 * `profile` rows are blocked on a drive and a seeded user, both named at the surface.
 *
 * ⚠ 36 SHOT IS NOT 36 NEW FILES: two of them REPLACE `auth-login-{320,1280}-court-visual-linux.png`,
 * which have pinned a departed header since plan 15-06 and are stale on disk as this is written. A
 * dispatch that adds six files and leaves those two untouched has not done the job — it means the
 * hook edit on `auth-login` did not take, and the surface is still being shot against a selector the
 * page does not render.
 *
 * ⚠ AND THIS BLOCK WAS ALSO WRITTEN ON win32, so like Phase 14's it generated nothing. The rows are
 * a declaration; `.github/workflows/baselines.yml` under `workflow_dispatch` is the only thing that
 * can turn six of them into pictures, and until that runs the honest reading of this file is still
 * "an inventory somebody can work from".
 *
 * PHASE 16 ADDS FOUR ROWS AND MOVES THE PICTURE COUNT BY NOTHING. Current number, re-stated in full
 * for the same reason the Phase-15 paragraph re-stated its own: **85 declared, 42 blocked (1
 * structural + 20 Phase-13 + 15 Phase-14 + 2 Phase-15 + 4 Phase-16), 43 shot.** The twelve
 * progressive-search rows replace five retired search rows, leaving the blocked set unchanged.
 * The four are
 * `avatar-crop-dialog` and `wizard-cover-preview` at 320 and 1280, court only, one shot per width
 * (D-138), and both surfaces are blocked at the surface with their reasons.
 *
 * ⚠ AND THE PHASE-15 DISPATCH HAS SINCE RUN, WHICH CHANGES WHAT THE PARAGRAPHS ABOVE MEAN. Generation
 * run `32751407382`, comparison run `32752143309`, `gate-visual` green; **36 files on disk, measured
 * here by `git ls-files 'e2e/visual/surfaces.spec.ts-snapshots/*-visual-linux.png' | wc -l` → 36**, so
 * the 36-shot arithmetic above is now a fact rather than a projection. The half worth carrying to
 * Phase 16 is the other one STATE.md records verbatim: **both `profile` rows correctly produced
 * nothing.**
 *
 * ⚠ SO PHASE 16 INVALIDATES NO COMMITTED `profile` BASELINE, BECAUSE THERE IS NONE. A phase brief
 * reading `profile` in `SURFACE_IDS` will assume the avatar-field restyle made its references stale;
 * the measured answer is that the row is declared, blocked, and has never been shot. And it follows
 * that **16-15's dispatch is expected to add ZERO files** — all four of its rows are blocked, so a
 * dispatch that adds any is a dispatch that shot something it was told it could not reach.
 *
 * THE NAME CARRIES THE NUMBER ON PURPOSE, AND IT IS RENAMED IN THE SAME COMMIT AS THE ROWS. The alias
 * was `BaselineCountIsTwentySeven`, then `BaselineCountIsFiftyThree`, then `BaselineCountIsNinetyFive`,
 * then `BaselineCountIsFiftyOne`. A gate whose name says 51 while its constraint says 66 is a gate that
 * reads correct and is not, and this file's whole argument is that a count nobody restates is a count
 * nobody checks. `tsc` cannot catch a stale NAME, which is exactly why it has to move by hand.
 *
 * OBSERVED RED — 21 August 2026, plan 13-15, UNFORCED: inserting the 42 rows with the alias still
 * reading 53 produced exactly one error, `npx tsc --noEmit` exit 2:
 *
 *   src/lib/design/visual-baselines.ts(1739,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
 *
 * — the same shape probe (a) recorded in 2026, arriving on its own rather than being staged. Renaming
 * to 95 in this same commit returned it to exit 0.
 *
 * OBSERVED RED AGAIN — 24 August 2026, plan 14-16, FORCED (and said to be forced, because 13-15's
 * entry above was not and the difference is the evidence): with the fifteen host rows in place the
 * constraint was set back to `51` — the exact state the file would have been left in had the rows been
 * added and the number not moved. `npx tsc --noEmit`, EXIT=2, and the whole of stdout was one line:
 *
 *   src/lib/design/visual-baselines.ts(1917,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
 *
 * RESTORED to 66 → exit 0. Note again what it did NOT do, which is this gate's standing weakness: the
 * error names the alias's own line and not the fifteen rows, which is why the arithmetic is spelled
 * out in prose above rather than left implicit in the literal.
 *
 * OBSERVED RED A THIRD TIME — 25 August 2026, plan 15-11, UNFORCED. The eight Phase-15 rows were
 * inserted with the constraint still reading `66`, `npx tsc --noEmit` run bare (not through a pipe —
 * `| tail` reports tail's status, not tsc's), EXIT=2, and the whole of stdout was one line:
 *
 *   src/lib/design/visual-baselines.ts(2181,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
 *
 * Renamed to `…IsSeventyFour` and moved to 74 in the same commit → exit 0. UNFORCED like 13-15's and
 * unlike 14-16's, which matters to how much the entry is worth: this is the gate arriving on its own
 * in the ordinary course of adding rows, which is the only evidence that it fires when nobody is
 * staging it.
 *
 * OBSERVED RED A FOURTH TIME — 26 August 2026, plan 16-15, UNFORCED, and this time BOTH literals were
 * watched. The four Phase-16 rows were inserted with the alias still reading `74`; `npx tsc --noEmit`
 * run bare, EXIT=2, and the whole of stdout was one line:
 *
 *   src/lib/design/visual-baselines.ts(2477,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
 *
 * Renamed to `…IsSeventyEight` and moved to 78 → exit 0. And then the SECOND literal, the one this
 * docblock's last paragraph says nothing will remind you about, was watched separately: with
 * `e2e/visual/surfaces.spec.ts` still on 74, `npx vitest run tests/design/… ` says nothing (it is not
 * a vitest file) and `tsc` says nothing (it is a `const`) — the failure only appears where the
 * paragraph says it appears, inside a dispatch. So it was moved in the SAME COMMIT as this one rather
 * than in a later one, which is the change plan 15-11's split invited and 16-15 made: `git show --stat`
 * on that commit lists both files. ⚠ THE PAIRING IS NOW A RECORD RATHER THAN A WARNING — if you add
 * rows, move `src/lib/design/visual-baselines.ts` and `e2e/visual/surfaces.spec.ts` together, and
 * `EXPECTED_BLOCKED` in that same file if any of the new surfaces is blocked (16-15's two both were,
 * which is a third place the 15-11 note did not name).
 *
 * ⚠ AND THE THIRD SIGHTING OF THE SAME STANDING WEAKNESS, plus one NEW one worth more than it. The
 * old weakness: the error names the alias's own line (2181) and not one of the eight rows, which is
 * why the arithmetic is spelled out in prose above. The NEW one, measured in the same run: this gate
 * did NOT see the RUNTIME twin of itself go stale. `e2e/visual/surfaces.spec.ts` carries its own
 * `EXPECTED_BASELINE_COUNT` literal — deliberately a SECOND literal in a SECOND file, so that an edit
 * to one without the other fails loudly — but it is a `const`, not a type, so `tsc` reads it as a
 * number and says nothing. The failure it produces is worse than a compile error and arrives later:
 * the `baselines` dispatch runs `surfaces.spec.ts`, the inventory test fails on the stale count, the
 * Playwright step exits non-zero, and the stage/commit steps never run — a dispatch that shoots every
 * surface and commits NOTHING, reported as a test failure rather than as a stale literal. Plan 15-11
 * moved that literal in a separate commit for exactly this reason; if you add rows here, that file is
 * the second place to look and nothing will remind you.
 */
export type BaselineCountIsEightyFive = Assert<
  (typeof VISUAL_BASELINES)["length"] extends 85 ? true : false
>;

/** D-135 / AC#30: exactly one exclusion. Probe (b) above. */
export type ThemeSwapExclusionCountIsOne = Assert<
  (typeof THEME_SWAP_EXCLUSIONS)["length"] extends 1 ? true : false
>;

/**
 * D-138: the token-contract set is a FIXED FOUR, and this is the half of that claim that runs on a
 * developer machine.
 *
 * `theme-swap.spec.ts` pins the same number and the same members at runtime, and those pins are the
 * ones with the good failure messages — but they live in the `visual` Playwright project, which
 * `playwright.config.ts` does not construct off Linux, so on every machine in this project they
 * never execute. The same argument the two aliases above rest on, for a set whose whole purpose is
 * to stop growing: a count checked only where nobody runs it is not a count.
 *
 * This fires on `THEME_SWAP_SURFACES` above, which is why that list is `as const satisfies` rather
 * than annotated — an annotation widens `.length` to `number` and `4 extends number` is not what
 * this asks, so the alias would compile forever and check nothing.
 *
 * OBSERVED RED — 23 August 2026, quick task 260823-frp, FORCED. A fifth id appended to
 * `THEME_SWAP_SURFACES`: `privacy`, which is the PLAUSIBLE version of the mistake rather than a
 * nonsense one — a real document surface, unblocked, that genuinely re-skins, and one that was in
 * the derived set until this change. Command `npx tsc --noEmit`, EXIT=2, and the whole of stdout was
 * one line:
 *
 *   src/lib/design/visual-baselines.ts(1514,3): error TS2344: Type 'false' does not satisfy the
 *   constraint 'true'.
 *
 * RESTORED (fifth id removed) → `npx tsc --noEmit` exit 0.
 *
 * Note what it did NOT do, which is this gate's honest weakness and the same one probes (a) and (b)
 * above record: the error names the ALIAS's own line, not the id that was appended. That is why the
 * membership argument is spelled out in prose at `THEME_SWAP_SURFACES` rather than left implicit in
 * the literal `4`, and why `theme-swap.spec.ts` pins the MEMBERS as well as the count. Recorded
 * verbatim because a type-level gate is the easiest kind to write in a shape that can never fail,
 * and this file already carries three OBSERVED RED entries saying so.
 */
export type ThemeContractSurfaceCountIsFour = Assert<
  (typeof THEME_SWAP_SURFACES)["length"] extends 4 ? true : false
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

/**
 * THE TOKEN-CONTRACT SET — the four surfaces `e2e/visual/theme-swap.spec.ts` renders in BOTH themes
 * and requires to differ byte-wise. An ALLOW-LIST since D-138, and it is fixed.
 *
 * IT USED TO BE DERIVED — documents minus exclusions — and that is precisely the property D-138
 * removed. A derived set grows with the inventory: it was 5, then 12, then 24, and each growth
 * re-charged every future phase for a proof a fixed sample already gives. The four below are chosen
 * to move all four token families between them, and A FIFTH IS NOT A ROW TO APPEND. It is a claim
 * that these four cannot reach a token family, which amends D-138 and is argued in prose.
 *
 *   `search-results`   colour (badges, price, brand chrome), type scale (title + price), radius
 *                      (cards, badges), elevation (the result grid). The result tile is the most
 *                      re-skinned component in the product.
 *   `auth-login`       colour (brand button + link), type scale (heading, labels), radius (inputs,
 *                      buttons), elevation (the card against the quiet ground).
 *
 *                      ⚠ RE-ARGUED AND KEPT BY PLAN 15-11, DELIBERATELY RATHER THAN BY DEFAULT — it
 *                      is the one member of the four whose composition CHANGED under it. D-162 took
 *                      the public header out of `(auth)/layout.tsx` and left a wordmark above one
 *                      card on `bg-muted`, so the "elevation (…the header)" clause above was false
 *                      and is rewritten. The membership is better after the change than before: the
 *                      surface is now a small brand-filled control and foreground ink on a card, on
 *                      a large expanse of a semantic ground token — four token families with almost
 *                      no chrome in the way, and the ground alone is most of the 1280 frame, which
 *                      is exactly what a byte-difference probe wants. It also still satisfies the
 *                      membership RULE below (a plain navigation, no drive, no minted row, no
 *                      fixture date), which is the property a re-argument could have broken.
 *
 *                      AND REMOVING IT WOULD HAVE COST MORE THAN THE REVIEW. A surface leaving this
 *                      set needs a `THEME_SWAP_EXCLUSIONS` row to be a decision rather than a
 *                      deletion, and `ThemeSwapExclusionCountIsOne` pins that list at exactly one —
 *                      so the cheap-looking edit is a second exclusion, a moved alias, an amended
 *                      AC#30 and a fourth member to argue in. `ThemeContractSurfaceCountIsFour` and
 *                      the members list in `e2e/visual/theme-swap.spec.ts` are both unchanged.
 *   `terms`            the long-form type ladder — the widest type range on any surface — plus the
 *                      legal notice panel's radius, elevation and tone.
 *   `root-not-found`   the empty/error tone family, the brand link and the chrome: the state
 *                      patterns no other surface in this set renders.
 *
 * ALL FOUR ARE PLAIN NAVIGATIONS. No drive, no interaction, no minted database row, no fixture date.
 * That is a membership rule, not a coincidence: the smoke renders each surface TWICE, so a surface
 * whose two passes could claim different content (a different booking window, a different booker, a
 * different day) can pass this gate on a content difference with the tokens untouched.
 *
 * WHY NOT THE OBVIOUS CANDIDATES:
 *   • `/dev/theme` — the surface with the most components, and the WRONG instrument. It renders court
 *     and grove side by side in nested `[data-theme]` panes regardless of what is seeded, so the
 *     seeded theme paints only the header strip and the page background. A hard-coded colour inside
 *     a pattern component would appear IDENTICALLY in both panes and this probe would never see it.
 *   • `listing-detail` / `listing-lightbox` / `listing-sheet` — their URLs embed the fixture's
 *     `2026-09-16` collision day, which the NOT COVERED section below records as having a shelf
 *     life. A permanent fixed set must not carry a dated time bomb.
 *   • `checkout` / `collision-notice` — they mint database rows, and the probe runs each surface
 *     twice.
 *
 * `as const satisfies` AND NOT AN ANNOTATION. A `: readonly DocumentSurfaceId[]` annotation widens
 * `.length` to `number` and `ThemeContractSurfaceCountIsFour` silently stops working; the `satisfies`
 * clause is what keeps an image id from compiling.
 */
export const THEME_SWAP_SURFACES = [
  "search-results",
  "auth-login",
  "terms",
  "root-not-found",
] as const satisfies readonly DocumentSurfaceId[];

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
//   • TWENTY-ONE OF THE 51 ARE BLOCKED, so a complete run commits 30 PNGs, not 51. One is structural
//     (`global-error`); twenty are Phase 13's and are blocked on a credential boundary and a missing
//     committed fixture, both argued at the rows. Anyone reading "51 baselines" as "51 files" will
//     be wrong by twenty-one. THE PHASE-13 BLOCK IS THE LARGEST DECLARED GAP IN THIS FILE'S HISTORY
//     and is deliberately visible rather than deferred to a plan nobody reads.
//   • THE SECOND THEME IS NO LONGER BASELINED AT ALL (D-138). Until 23 August 2026 every surface
//     here carried a `grove` row beside its `court` one, and the diff between the two was a standing
//     check that the surface read the tokens. That check now exists for FOUR surfaces only, in
//     `e2e/visual/theme-swap.spec.ts`, and for no other. A hard-coded colour on a surface outside
//     that four is caught by the DS-13 leak gate if it is inside the scanned tree and by nothing at
//     all if it is not — which is the cost D-138 accepted, stated here rather than left to be
//     discovered.
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
