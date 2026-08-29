import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import { readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";

import { expectAxeClean } from "./helpers/axe";
import { BASE_URL as BASE, installTruncator } from "./helpers/served-document";
import { seedTheme } from "./helpers/theme";
// The hooks are IMPORTED, never retyped — 17-RESEARCH Pattern 4. `visual-baselines.ts` already
// carries a `hook` + `hookWhy` pair per surface, argued at the row, and those selectors are exactly
// the "tell" this sweep needs before a scan. A surface whose hook changes then moves in ONE place; a
// re-typed copy would go green the day the real one changed, which is the failure `overflow-320
// .spec.ts:17-31` states as its own import rule.
import { VISUAL_SURFACES } from "../src/lib/design/visual-baselines";
import type { ThemeName } from "../src/components/theme/theme-provider";

// GATE-02's automated half — AC#16/AC#17/AC#18/AC#2. A table-driven axe pass over the DECLARED
// production surface set, in court, at 320 and 1280.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHY A NEW FILE RATHER THAN A FOURTH TABLE IN `overflow-320.spec.ts` (17-RESEARCH Open Question 1)
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
// That file is 2,092 lines and its AC#29 half is DELIBERATELY seed-free — it discovers a listing id
// from the running catalogue and every other path is static, which is what lets 26 cases run with no
// database fixture. Mixing an axe pass into it would couple the cheapest gate in the suite to the
// flakiest fixtures, and a red in one half would stop the other from reporting at all.
//
// What is NOT duplicated is the inventory. The row shape, the reachability guard and the named-skip
// idiom below are that file's, copied on purpose; the tells come from `visual-baselines.ts`; and the
// row SET is asserted equal to the surface set derived from disk, so this is a second table over one
// inventory rather than a second inventory.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// THE THREE SCOPE DECISIONS, EACH WITH ITS REASON, BECAUSE EACH NARROWS WHAT A GREEN HERE MEANS
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. COURT ONLY (D-138, 2026-08-23). The other brand direction is a token-contract PROBE, not a
//      product theme, and no user can reach it — so a second-theme axe pass would audit a theme
//      nobody sees. What that costs is written out in `src/lib/design/contrast-pairs.ts` and
//      `e2e/helpers/theme.ts`: a cross-element pairing legal in court and sub-bar in the probe theme,
//      on a surface outside the four-surface swap contract, is NOT detected here.
//   2. TWO WIDTHS, 320 AND 1280. A responsive layout is two different accessibility trees — the app
//      hides one nav placement below `sm:`, swaps a table for a card stack at `md:`, and mounts the
//      booking view in a bottom sheet below `lg:` — so a desktop-only sweep audits half the product.
//   3. THE CONFORMANCE TAG SET, AND NOTHING ELSE. `helpers/axe.ts` owns it, in one call, and this file
//      passes NO configuration of its own. There is deliberately no per-row rule list and no per-row
//      exclusion: a rule deny-list and "silence the framework's overlay" are the same keystroke, and
//      only one of them is legitimate (AC#17).
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE DOES NOT COVER, STATED SO THE NEXT READER UNDER-TRUSTS IT
// ═════════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • THE 21 `loading.tsx` FILES ARE NOT THEIR OWN ROWS, and the reason is addressability rather than
//     scheduling. A loading state is a TRANSIENT state of its route's own document: there is no URL
//     that serves it, so a row pointed at one is a race against the dev server's compile, and the
//     tell that would prove it rendered is gone by the time a scan could read it. Exactly ONE of them
//     is deterministically reachable — the checkout's, through `installTruncator`, which re-serves the
//     pre-hydration document with every boundary still pending — and that one IS a measured row
//     below. The other twenty are covered as a CLASS by `tests/design/skeleton-a11y.test.tsx` (the
//     `role="status"` + `aria-busy` + `sr-only` label wrapper, which is the condition that makes the
//     1.09:1 skeleton fill exclusion legal) and by `tests/design/loading-coverage.test.ts`. That is a
//     source gate, not a rendered one, and saying so is the point of saying it.
//   • THE RESOLVED CHECKOUT IS NOT SCANNED. Its row measures the SERVED document; reaching the
//     resolved page needs a hold a POST minted, and this file mints no database rows — see the row.
//   • SC 2.5.8's 24px target floor is NOT covered here. Axe's rule for it is disabled by default in
//     axe-core and a tag filter does not enable a disabled rule; `expectTargets` in
//     `e2e/overflow-320.spec.ts` already owns that floor with its measured argument.
//   • Like the rest of `e2e/`, none of this runs in CI (D-24).

// ---------------------------------------------------------------------------
// The scope constants
// ---------------------------------------------------------------------------

/**
 * The one theme audited, spelled as a constant so the scope decision is a value rather than a habit.
 *
 * Typed to `ThemeName` on purpose: the day a third direction is added, this line still compiles and
 * still says court, which is the correct behaviour — widening the sweep is an amendment to D-138 and
 * has to be made deliberately, in the same change that argues for it.
 */
const THEME: ThemeName = "court";

/**
 * The two widths, and they are a MEASUREMENT of where this app's tree forks rather than a round pair.
 *
 * 320 is `FLOOR_PX` — the narrowest viewport the responsive contract names, and the width at which
 * the site nav collapses, the booking view moves into a bottom sheet and every `md:` table becomes a
 * card stack. 1280 is the width at which all three of those reverse. Both are already the widths
 * `VISUAL_BASELINES` shoots most surfaces at, so a finding here is legible against a picture.
 */
const WIDTHS = [320, 1280] as const;

/** Tall enough that a 320px column is not measured through a letterbox; the scan reads the DOM, not the fold. */
const VIEWPORT_HEIGHT = 900;

/**
 * The password every session in this file signs up with. One constant, and it is not a secret: these
 * accounts exist for the length of one run against a local dev database.
 */
const PASSWORD = "averylongpassword";

// ---------------------------------------------------------------------------
// The tell source
// ---------------------------------------------------------------------------

/**
 * A surface's declared reachability hook, read out of the shipped inventory (RESEARCH Pattern 4).
 *
 * Every hook it returns carries a `hookWhy` at its own row in `visual-baselines.ts` explaining why
 * that selector proves the surface rendered ITS OWN subject rather than merely loading. Rows below
 * that need a tell the inventory does not declare — because the inventory has no row for that
 * surface — spell theirs inline WITH the same argument, never without one.
 */
const hookOf = (id: keyof typeof VISUAL_SURFACES): string => VISUAL_SURFACES[id].hook;

// ---------------------------------------------------------------------------
// The row shape — `overflow-320.spec.ts:334-378`'s, with `file` added
// ---------------------------------------------------------------------------

/** Which signed-in identity the row needs. Absent means the row is driven anonymously. */
type SessionKind = "booker" | "host";

type SweepRow = {
  /**
   * THE ROW'S IDENTITY, AND THE FIELD THAT MAKES AC#2 MECHANICAL: the repo-relative path of the route
   * file that produces this document. `DECLARED_SURFACES` below is derived from disk over exactly
   * these five filenames, and the equality test asserts the two sets match — so a new `page.tsx`
   * landing in `src/app/` with no row here is a FAILING TEST, not a silent absence.
   */
  readonly file: string;
  /** How the row is named in titles, failures and skip messages. */
  readonly name: string;
  /**
   * `null` for a surface this harness cannot reach, in which case `skip` says why, IN THE MESSAGE.
   * A resolver rather than a literal wherever the path depends on the catalogue or on a fixture the
   * run itself creates.
   */
  readonly path: ((page: Page) => Promise<string | null>) | string | null;
  /** Why it is unreachable. Required whenever `path` is `null` — a silent skip is not a skip. */
  readonly skip?: string;
  /**
   * The declared selector that proves the route rendered ITS OWN surface.
   *
   * Pitfall 4's fix, and it is sharper for a scan than for a ruler: `.analyze()` over a page that
   * failed to load returns ZERO violations and reads exactly like a clean surface. The tell runs
   * before every scan; `expectAxeClean`'s two vacuity guards are what catch the caller who forgot.
   */
  readonly tell: string;
  /** The signed-in identity the row needs, or absent for an anonymous drive. */
  readonly session?: SessionKind;
  /** Serve the pre-hydration document instead of the hydrated one — see the checkout row. */
  readonly served?: boolean;
  /** An interaction performed after `goto` and before the scan, for a row whose subject is a state. */
  readonly open?: (page: Page) => Promise<void>;
};

// ---------------------------------------------------------------------------
// The fixture — two sign-ups and one draft listing, all through the shipped UI
// ---------------------------------------------------------------------------

type Cookies = Awaited<ReturnType<BrowserContext["cookies"]>>;

type Fixture = {
  readonly booker: Cookies;
  readonly host: Cookies;
  /** The id of the draft listing `/host/listings/new` minted for the host, or `null` if it did not. */
  readonly draftListingId: string | null;
};

/**
 * Sign an identity up through the shipped form — the idiom `mode-switch.spec.ts:20-37`,
 * `shell.spec.ts:168-182` and `host-headings.spec.ts:177-187` all use, not a fourth sign-up path.
 *
 * ⚠ THIS FILE OPENS NO `postgres()` CLIENT, AND THAT IS A DECISION RATHER THAN AN OVERSIGHT.
 * `deferred-items.md` warns by name against another DB-seeding spec sharing one Postgres with a
 * `postgres({max:1})` client apiece, and six specs already do it. So the reachable set here is
 * exactly what the shipped UI can produce from a fresh account — which turns out to be most of the
 * host tier, because `/host/listings/new` mints a real draft listing and redirects into the wizard.
 * Every surface that genuinely needs a seeded booking is a NAMED SKIP below that says which fixture
 * it wants, rather than a row quietly missing.
 *
 * ⚠ THE CLOCK IS IN THE EMAIL AND NOWHERE ELSE. `Date.now()` buys uniqueness against the unique-email
 * constraint across repeated runs; it never reaches a measured string. Stated because this repository
 * has shipped two time-bomb assertions seeded from `now()`.
 */
async function signUp(page: Page, intent: SessionKind, tag: string): Promise<void> {
  const email = `e2e.axe.${tag}.${Date.now()}.${Math.floor(Math.random() * 1e6)}@example.com`;
  await page.goto(`${BASE}/signup`);
  await page
    .getByRole("radio", { name: intent === "host" ? "Host a space" : "Book a space" })
    .click();
  await page.getByLabel("First name").fill(intent === "host" ? "Axelle" : "Axl");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page
    .getByRole("button", { name: intent === "host" ? /sign up to host/i : /sign up to book/i })
    .click();
  await page.waitForURL((url) => !url.pathname.startsWith("/signup"), { timeout: 60_000 });
}

/**
 * Mint the host's draft listing by driving `/host/listings/new`, and read its id back out of the URL.
 *
 * `src/app/(host)/host/listings/new/page.tsx` renders NOTHING — it creates an empty draft owned by the
 * caller and `redirect()`s into `/host/listings/{id}/edit`. That is what makes the wizard and the
 * availability editor reachable from a bare sign-up with no seeded row anywhere, and it is why this
 * file can measure nine host surfaces without a database client.
 */
async function mintDraftListing(page: Page): Promise<string | null> {
  await page.goto(`${BASE}/host/listings/new`);
  await page.waitForURL(/\/host\/listings\/[^/]+\/edit/, { timeout: 60_000 });
  return new URL(page.url()).pathname.split("/")[3] ?? null;
}

let fixture: Fixture;

/** The draft listing's path prefix, or a message that says why the row cannot resolve one. */
function draftPath(suffix: string): string | null {
  return fixture.draftListingId ? `/host/listings/${fixture.draftListingId}${suffix}` : null;
}

// ---------------------------------------------------------------------------
// The declared surface set — derived from disk, never listed by hand
// ---------------------------------------------------------------------------

/**
 * The five filenames under `src/app/` that produce something a browser renders.
 *
 * Measured against the tree rather than assumed: `src/app/` contains 29 `page.tsx`, 21 `loading.tsx`,
 * 8 `layout.tsx`, 5 `route.ts`, 5 `error.tsx`, 4 `not-found.tsx`, 3 `opengraph-image.tsx` and 1
 * `global-error.tsx`. The five below are every kind that renders a top-level response: `route.ts` is
 * an API handler, `layout.tsx` renders INSIDE its page's document, and `loading.tsx` is a transient
 * state of its own route rather than a separately addressable surface (see the file header).
 */
const SURFACE_FILENAMES = new Set([
  "page.tsx",
  "not-found.tsx",
  "error.tsx",
  "global-error.tsx",
  "opengraph-image.tsx",
]);

/**
 * The surfaces that are declared but are not files under `src/app/`.
 *
 * Exactly one entry, and a second must be ARGUED for rather than appended — the same rule
 * `THEME_SWAP_EXCLUSIONS` states for its own single entry. D-201 names four exclusions from the
 * production surface set; three of them (the dev instruments, the OG routes and `global-error`) ARE
 * route files and appear in the table through the derivation below. The fourth is not a route at all.
 */
const NON_ROUTE_DECLARED = ["src/lib/email.ts"] as const;

/** Every surface file under `src/app/`, repo-relative, forward-slashed, sorted. */
function declaredRouteFiles(): string[] {
  const appDir = resolve(process.cwd(), "src", "app");
  const found: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (SURFACE_FILENAMES.has(entry.name))
        found.push(relative(process.cwd(), full).replace(/\\/g, "/"));
    }
  };
  walk(appDir);
  return found.sort();
}

// ---------------------------------------------------------------------------
// The table
// ---------------------------------------------------------------------------

/**
 * ONE ROW PER DECLARED SURFACE — 42 route files on disk plus the one non-route class below, and the
 * equality test underneath this table is what keeps that sentence true.
 *
 * THE ORDER IS THE ROUTE TREE'S, not the owning plan's. This table's reading question is "is this
 * document audited", which is asked from a file path; `overflow-320.spec.ts` orders by owning plan
 * because its question is "has the phase that owns this surface run yet".
 *
 * THE FOUR D-201 EXCLUSIONS APPEAR **IN** THIS TABLE WITH THEIR REASONS, NEVER AS ABSENCES — the dev
 * instruments, the OG image routes, the email templates and `global-error`. An argued row is a
 * decision somebody can find; a missing row is silence, and the whole point of the assertion below is
 * that silence stops being available.
 */
const ROWS: readonly SweepRow[] = [
  // ─── the public tier ─────────────────────────────────────────────────────────────────────────────
  {
    file: "src/app/(public)/page.tsx",
    name: "/ (search)",
    path: "/",
    // The footer rather than the search bar, and it is Pitfall 4's exact trap: `/` streams, and its own
    // `loading.tsx` renders a SECOND `SearchBar` — `#search-category` genuinely resolves to two
    // elements while the boundary is unresolved. Every piece of chrome at the TOP of this page is
    // present in the pending shell too. The footer is below the streamed boundary and is not.
    tell: '[data-testid="site-footer"]',
  },
  {
    file: "src/app/listings/[id]/(detail)/page.tsx",
    name: "/listings/[id]",
    // Discovered from the running catalogue rather than hard-coded, so the row does not depend on a
    // fixture id. If the local catalogue is empty the row fails with that message, not with an axe one.
    path: async (page) => {
      await page.goto(`${BASE}/`);
      return page.getByTestId("result-card").first().getAttribute("href", { timeout: 30_000 });
    },
    // The key-facts strip, imported from the inventory: only the RESOLVED page renders it, and this
    // route's `loading.tsx` renders a skeleton whose `<h1>` is byte-identical to the resolved page's.
    tell: hookOf("listing-detail"),
  },
  {
    file: "src/app/listings/[id]/(detail)/not-found.tsx",
    name: "/listings/[id] · not found",
    // A literal that must never become a real id, in `visual-baselines.ts`'s own shape and for its
    // stated reason: a SHORT one is a value somebody might later seed, and the day it exists this row
    // silently starts auditing a real listing page instead of the boundary it names.
    path: "/listings/a-listing-id-that-must-never-exist-17-07",
    tell: '[data-testid="empty-state"]',
  },
  {
    file: "src/app/listings/[id]/book/page.tsx",
    name: "/listings/[id]/book · served shell + loading skeleton",
    path: async (page) => {
      await page.goto(`${BASE}/`);
      const href = await page
        .getByTestId("result-card")
        .first()
        .getAttribute("href", { timeout: 30_000 });
      return href ? `${href}/book` : null;
    },
    // ⚠ THE ONE ROW MEASURED PRE-HYDRATION, AND IT IS ALSO THIS FILE'S ONLY DETERMINISTIC LOADING
    // STATE. `overflow-320.spec.ts`'s equivalent row records the mechanism: without a minted hold the
    // checkout calls `notFound()`, and after hydration the client replaces the whole tree with the
    // ROOT not-found — a different composition, which another row already audits. Served, the document
    // is `book/layout.tsx`'s shell plus `book/loading.tsx`'s skeleton, which is a real designed state
    // with a real accessibility tree of its own (`role="status"`, `aria-busy`, an `sr-only` name).
    //
    // ⚠ WHAT THIS ROW DOES NOT COVER, stated rather than left to be discovered: the RESOLVED checkout.
    // The fixed 64px confirm bar, the price disclosure and the breakdown are all on the resolved body
    // and none is in this document. Reaching them needs a hold a POST minted, which needs a session, a
    // bookable listing and an open slot — a database fixture this file deliberately does not open (see
    // `signUp`). That gap is real and is recorded here rather than implied away by a green.
    served: true,
    tell: '[data-testid="skeleton-panel"]',
  },
  {
    file: "src/app/(public)/invite/[token]/page.tsx",
    name: "/invite/[token] · active",
    path: null,
    skip: "an ACTIVE invite is a state of a seeded GROUP BOOKING, not a URL: `(public)/invite/[token]/page.tsx` resolves the token against a booking row with open capacity and an unexpired access token, and every one of those is minted per run by `seedPaymentStates`. This file opens no `postgres()` client on purpose (see `signUp`), so the row is named rather than reached. What it needs is the committed Phase-13 fixture `visual-baselines.ts` describes at `invite-active` — fixed booking ids, a fixed group token and fixed literal instants — after which this row becomes a literal path with no resolver at all. The INACTIVE twin is audited by the row below, and plan 11-19 built that surface to be a byte-identical composition, so the shell, the card and the chrome are covered; what is not covered is the active card's own copy and its RSVP controls.",
    tell: "h1",
  },
  {
    file: "src/app/(public)/invite/[token]/not-found.tsx",
    name: "/invite/[token] · not found",
    // A DELIBERATELY UNMATCHED TOKEN, and it is not a shortcut: plan 11-19 built this boundary to be a
    // byte-identical INACTIVE twin of the invite surface (T-11-ORACLE) — the same `InviteCard` in the
    // same public shell — so for a tree-shape audit it is the same document, and it needs no seed.
    path: "/invite/deadbeefdeadbeefdeadbeef",
    tell: "h1",
  },
  {
    file: "src/app/(legal)/terms/page.tsx",
    name: "/terms",
    path: "/terms",
    tell: hookOf("terms"),
  },
  {
    file: "src/app/(legal)/privacy/page.tsx",
    name: "/privacy",
    path: "/privacy",
    tell: hookOf("privacy"),
  },
  {
    file: "src/app/not-found.tsx",
    name: "root not-found",
    path: "/this-path-matches-no-route-and-must-never-become-one",
    // The header, imported from the inventory: `not-found.tsx` composes its OWN chrome because the root
    // layout carries none, so the header is the proof that the not-found PAGE rendered rather than the
    // framework's bare fallback.
    tell: hookOf("root-not-found"),
  },

  // ─── the auth tier ───────────────────────────────────────────────────────────────────────────────
  //
  // All four are anonymous static forms — no session, no seed, no clock, no fixture date — which makes
  // them the cheapest rows in the table and, since plan 15-07 put all four on ONE composition, the
  // place a shared-composition defect would show up four times.
  {
    file: "src/app/(auth)/login/page.tsx",
    name: "/login",
    path: "/login",
    tell: hookOf("auth-login"),
  },
  {
    file: "src/app/(auth)/signup/page.tsx",
    name: "/signup",
    path: "/signup",
    tell: hookOf("auth-signup"),
  },
  {
    file: "src/app/(auth)/forgot-password/page.tsx",
    name: "/forgot-password",
    path: "/forgot-password",
    tell: hookOf("auth-forgot"),
  },
  {
    file: "src/app/(auth)/reset-password/page.tsx",
    name: "/reset-password",
    // The token is in the URL because the page BRANCHES on its presence, and a fixed literal is a
    // deterministic fixture rather than a shortcut: the shared schema requires a non-empty string and
    // nothing more, so any non-empty value renders the same form the real link renders. Nothing is
    // submitted, so the token is never checked against the database.
    path: "/reset-password?token=e2e-axe-sweep-fixed-token",
    tell: hookOf("auth-reset"),
  },

  // ─── the booker tier ─────────────────────────────────────────────────────────────────────────────
  {
    file: "src/app/(app)/profile/page.tsx",
    name: "/profile",
    path: "/profile",
    session: "booker",
    // ⚠ THE TELL IS NARROWED, AND THIS IS THE ROW WHERE THAT MATTERS. `(app)/profile/page.tsx`
    // redirects an anonymous visitor to `/login`, and `/login` renders `panel-card` — so the plain hook
    // would be satisfied by the exact failure the tell mechanism exists to catch, and this row would
    // have audited the login page twice and reported `/profile` as covered. The private-group sentence
    // is pinned byte-for-byte by `tests/design/profile-pass.test.tsx`.
    tell: '[data-testid="panel-card"]:has-text("Private account info")',
  },
  {
    file: "src/app/(app)/bookings/page.tsx",
    name: "/bookings · empty",
    path: "/bookings",
    session: "booker",
    // The booker signed up in `beforeAll` has no bookings, so this is the designed EMPTY state — a
    // different tree from the populated list, and the one a brand-new booker actually meets. The
    // populated list is named as not covered at `/bookings/[id]` below, for the same fixture reason.
    tell: '[data-testid="empty-state"]',
  },
  {
    file: "src/app/(app)/bookings/[id]/page.tsx",
    name: "/bookings/[id] · confirmed / pending / reversed",
    path: null,
    skip: "every state of this route is a particular combination of columns on a seeded booking row — confirmed, the post-payment moment behind `?paid=1`, pending, and the reversed branch — and `seedPaymentStates` is the only thing in this repository that writes them. This file opens no `postgres()` client (see `signUp`), so all four are named here rather than reached. `e2e/overflow-320.spec.ts`'s Phase-13 block already drives them for geometry with exactly that fixture, and the cheapest correct shape for this row is to reuse it: one seeded booking, one booker session, four paths. What is lost meanwhile is real — the money statement, the TRUST-02 reference and the payment-state panels are the phase's sharpest copy and none of them is scanned. The route's NOT-FOUND boundary IS audited, in its own row below.",
    tell: '[data-testid="booking-detail"]',
  },
  {
    file: "src/app/(app)/bookings/[id]/not-found.tsx",
    name: "/bookings/[id] · not found",
    // The literal `visual-baselines.ts` already declares for `booking-not-found`, reused rather than
    // invented so the two gates name the same non-existent id. The route redirects an anonymous
    // visitor to `/login`, which is why this row carries a session even though it renders no booking.
    path: "/bookings/a-booking-id-that-must-never-exist-13-15",
    session: "booker",
    tell: hookOf("booking-not-found"),
  },
  {
    file: "src/app/(app)/bookings/[id]/receipt/page.tsx",
    name: "/bookings/[id]/receipt",
    path: null,
    skip: "the receipt exists only for a booking the D-76 predicate admits — a confirmed booking with a settled payment — so it needs the same seeded row `/bookings/[id]` needs, plus a payment. It is additionally the surface with the most per-run strings in the phase: the TRUST-02 reference is a SHA-256 over a randomised booking id, and D-85's `Booked` line is `created_at`. Neither of those affects an axe scan, which reads structure rather than text, so the ONLY thing standing between this row and a measurement is the fixture — which makes it the cheapest of the four booking rows to unblock once one exists. Its print composition is a second document again (`receipt-print.spec.ts` drives it under `emulateMedia`), and that one is not covered here either.",
    tell: hookOf("receipt-screen"),
  },
  {
    file: "src/app/(app)/bookings/[id]/cancel/page.tsx",
    name: "/bookings/[id]/cancel",
    path: null,
    skip: "the cancel confirmation is a state of a CANCELLABLE booking — the page reads the booking, derives the refund from the cancellation policy against the clock, and renders a different disclosure per outcome — so it needs a seeded booking whose window sits at a chosen distance from now. `e2e/cancel.spec.ts` already builds exactly that and is one of the six specs already holding a Postgres client; this row wants the same fixture, not a new one. Recorded rather than dropped because the surface carries a money statement and a destructive action, which is the pairing an accessibility audit most wants to see and this sweep currently does not.",
    tell: '[data-testid="panel-card"]',
  },
  {
    file: "src/app/(app)/bookings/[id]/group/page.tsx",
    name: "/bookings/[id]/group",
    path: null,
    skip: "the group surface exists only for a booking with open capacity, and it renders the invite link — an access token minted per run — in a read-only field that is also its declared hook. So it needs a seeded group booking, which is the same fixture `invite-active` above names and the same one `visual-baselines.ts` blocks four Phase-13 rows on. Not reached here for the reason every booking row gives: this file opens no database client. The RSVP controls and the share box are the parts an audit would most want, and they are unscanned.",
    tell: hookOf("booking-group"),
  },

  // ─── the host tier ───────────────────────────────────────────────────────────────────────────────
  //
  // ⚠ NINE OF THE ELEVEN HOST SURFACES ARE MEASURED HERE WITH NO DATABASE FIXTURE AT ALL, which is
  // worth a sentence because `visual-baselines.ts` blocks all nine of ITS host rows and a reader
  // arriving from that file will expect the same here. The difference is what each gate needs. A
  // baseline needs a FIXED picture, so it needs fixed ids, fixed instants and a fixed booker name; a
  // scan needs a rendered TREE, and the empty state of `/host/requests` has one. A bare sign-up plus
  // the draft listing `/host/listings/new` mints is enough for all nine. The two that need a real
  // booking are named skips below.
  {
    file: "src/app/(host)/host/page.tsx",
    name: "/host · dashboard",
    path: "/host",
    session: "host",
    // The dashboard's own marker attribute, which `mode-switch.spec.ts` also reads. It is on the
    // RESOLVED page and on nothing else — `host/loading.tsx` draws the same box without it — so it
    // rejects the skeleton, the `/login` redirect an anonymous visitor gets and the `/` bounce a
    // non-host gets. It is deliberately branch-INDEPENDENT: the host here owns a draft listing, so the
    // agenda branch renders, but the row must not go red the day that ordering changes.
    tell: "[data-host-dashboard]",
  },
  {
    file: "src/app/(host)/host/requests/page.tsx",
    name: "/host/requests · inbox zero",
    path: "/host/requests",
    session: "host",
    // Inbox zero, which is the state a host with no requests meets. The route's `loading.tsx` composes
    // the same `PageHeader` with the same two strings and carries no empty state, so this id separates
    // the surface from its own skeleton.
    tell: hookOf("host-requests-zero"),
  },
  {
    file: "src/app/(host)/host/bookings/page.tsx",
    name: "/host/bookings · empty",
    path: "/host/bookings?tab=upcoming",
    session: "host",
    // `?tab=upcoming` is not decoration — `parseTab` resolves anything else to this default, so the
    // query is what makes the row name the tab it claims rather than inheriting it.
    tell: '[data-testid="empty-state"]',
  },
  {
    file: "src/app/(host)/host/bookings/[id]/page.tsx",
    name: "/host/bookings/[id]",
    path: null,
    skip: "the host's booking detail needs a BOOKING on a listing this host owns, and a draft listing minted through the wizard has none — there is no way to place one without either a second signed-up booker driving the whole booker path against a published listing with open hours, or a direct database write. Both are fixtures this file declines to build (see `signUp`). `e2e/host-inbox-hierarchy.spec.ts` and `e2e/overflow-320.spec.ts`'s AC#36 block each already seed this shape, and either is the right thing to reuse. What goes unscanned is the host-side money statement and the accept/decline controls, which is the same class of surface the booker-side skips name.",
    tell: '[data-testid="booking-detail"]',
  },
  {
    file: "src/app/(host)/host/listings/page.tsx",
    name: "/host/listings",
    path: "/host/listings",
    session: "host",
    // The host owns exactly one listing here — the draft `/host/listings/new` minted in `beforeAll` —
    // so this is the POPULATED list. The empty branch is a different tree and is not covered; it is
    // the same `EmptyState` composition the `/host` no-listings branch renders, which
    // `tests/design/empty-state-adoption.test.ts` gates and which the `/host` row scans in passing.
    //
    // ⚠ THE TELL IS A CARD'S OWN EDIT LINK, AND THE FIRST TWO CANDIDATES WERE BOTH WRONG — recorded
    // rather than silently replaced, because both are the mistake a reader would make next. (1)
    // `row-card` is the MOBILE row primitive `/host/requests` and `/host/bookings` render; this grid
    // renders `ListingCard`, which carries no declared id at all, so the row went red at its tell on
    // the first sweep with `33 x locator resolved to 0 elements`. (2) An `h1` hook would have been
    // WORSE THAN RED — it would have passed against the skeleton, because `host/listings/loading.tsx`
    // composes `<PageHeader title="Your listings" />` byte-identically to the resolved page. The edit
    // link is rendered only by a populated card, only on this route, and by neither neighbour.
    tell: 'a[href^="/host/listings/"][href$="/edit"]',
  },
  {
    file: "src/app/(host)/host/listings/new/page.tsx",
    name: "/host/listings/new",
    path: null,
    skip: "this route renders NO DOCUMENT AT ALL, and that is a structural fact rather than a fixture gap: `new/page.tsx` mints an empty draft owned by the caller and `redirect()`s straight into `/host/listings/{id}/edit`. There is no rendered tree here for a scan to read — every branch of the file ends in a redirect — so a row with a measurement would be auditing the wizard and reporting it under this route's name, which is exactly the mis-attribution the tell mechanism exists to prevent. The document it produces IS audited, under `/host/listings/[id]/edit` below, and this run reaches that row by driving this route, so the redirect itself is exercised on every invocation.",
    tell: '[data-testid="wizard-step-rail"]',
  },
  {
    file: "src/app/(host)/host/listings/[id]/edit/page.tsx",
    name: "/host/listings/[id]/edit · wizard",
    path: () => Promise.resolve(draftPath("/edit")),
    session: "host",
    tell: hookOf("host-wizard-rail"),
  },
  {
    file: "src/app/(host)/host/listings/[id]/availability/page.tsx",
    name: "/host/listings/[id]/availability",
    path: () => Promise.resolve(draftPath("/availability")),
    session: "host",
    tell: hookOf("host-availability-strip"),
  },
  {
    file: "src/app/(host)/host/earnings/page.tsx",
    name: "/host/earnings",
    path: "/host/earnings",
    session: "host",
    // The panel card the earnings composition wraps its figures in. A host with no settled bookings
    // still renders the panel with its zero state, which is the tree this row audits.
    tell: hookOf("host-earnings"),
  },
  {
    file: "src/app/(host)/host/payouts/return/page.tsx",
    name: "/host/payouts/return",
    path: "/host/payouts/return",
    session: "host",
    // ⚠ THE TELL IS THE HEADING'S TEXT, not a declared id, because this surface has none — it is a
    // hand-composed landing rather than a pattern composition. The text is what separates it from the
    // refresh landing next door, which renders the same shape under a different sentence, and from the
    // `/host` dashboard the page's own button links back to. A host with no payout row renders the
    // "we're confirming your details" branch, which is the branch a fresh sign-up reaches.
    tell: 'h1:has-text("submitted")',
  },
  {
    file: "src/app/(host)/host/payouts/refresh/page.tsx",
    name: "/host/payouts/refresh · fallback",
    path: "/host/payouts/refresh",
    session: "host",
    // ⚠ THIS ROW AUDITS THE FALLBACK BRANCH, AND THE REASON IS D-35 RATHER THAN CONVENIENCE. The page
    // re-mints a single-use onboarding link and `redirect()`s into it when the provider answers; with
    // no live key configured the call cannot succeed, so the rendered document is the retry fallback.
    // That is the branch every environment without a live key produces, CI included, and it is the
    // only one this suite is permitted to reach — minting a real hosted link inside the suite is what
    // D-35 forbids. If a key is ever configured locally this row goes red at its tell rather than
    // quietly auditing a redirect target, which is the correct direction for it to fail in.
    tell: 'h1:has-text("pick up where you left off")',
  },

  // ─── the error boundaries ────────────────────────────────────────────────────────────────────────
  //
  // ONE OF FIVE IS REACHABLE, and the asymmetry is the finding rather than a shortfall. Plan 11-18
  // shipped exactly one dev throw affordance and `src/app/dev/` sits under no route group, so it can
  // only ever reach the ROOT boundary. What covers the other four instead: each renders
  // `patterns/error-state.tsx` inside its group's shell, the shells are audited by the reachable rows
  // above, and the panel itself is rendered by the dev theme page — which is an audit instrument and
  // not an audit subject, so that half is a source claim rather than a scanned one.
  {
    file: "src/app/error.tsx",
    name: "error boundary · root",
    // Reached through plan 11-18's dev throw affordance, which 404s in production (T-11-THROWROUTE).
    // The route is the INSTRUMENT here, not the subject: what is audited is the boundary's rendered
    // document, and `src/app/dev/throw/page.tsx` has its own row saying it is not a subject.
    path: "/dev/throw",
    tell: '[data-testid="error-state"]',
  },
  {
    file: "src/app/(app)/error.tsx",
    name: "error boundary · (app)",
    path: null,
    skip: "no dev throw affordance exists inside the (app) route group — plan 11-18 shipped one route, at `src/app/dev/throw`, and because `src/app/dev/` sits under no route group that route reaches the ROOT boundary only. Reaching this one needs a new `page.tsx` inside (app), which moves `tests/design/loading-coverage.test.ts`'s pinned 29/21/8 counts and adds a route to the production route table — a source change no acceptance criterion in this phase asks for, and one that file's own comment says must be a decision rather than a bumped number. What IS covered is both halves separately: the (app) shell by `/profile` and `/bookings` above, and `ErrorState` itself by the root boundary row.",
    tell: '[data-testid="error-state"]',
  },
  {
    file: "src/app/(auth)/error.tsx",
    name: "error boundary · (auth)",
    path: null,
    skip: "same structural reason as (app): there is no dev throw affordance inside the (auth) route group, and adding one moves the pinned route counts. This boundary is additionally the hardest of the five to reach even in principle — every route under (auth) is a form that renders successfully with no server read that can fail, so there is no input that makes it throw either. The (auth) shell is audited four times over by the four form rows above, and `ErrorState` by the root boundary row; what is unaudited is only the composite.",
    tell: '[data-testid="error-state"]',
  },
  {
    file: "src/app/(host)/host/error.tsx",
    name: "error boundary · (host)",
    path: null,
    skip: "same structural reason as (app), plus one this boundary alone carries: it sits behind the canHost capability gate, so reaching it needs a signed-up host as well as a new throw route inside the group. This file already has a host session, so the marginal cost here is exactly the route file — which is the part that moves `loading-coverage.test.ts`'s pinned counts and is therefore the part that is out of scope. The (host) shell is audited by nine host rows above and `ErrorState` by the root boundary row.",
    tell: '[data-testid="error-state"]',
  },
  {
    file: "src/app/(legal)/error.tsx",
    name: "error boundary · (legal)",
    path: null,
    skip: "same structural reason as (app): no dev throw affordance inside the (legal) route group. `/terms` and `/privacy` are static prose with no data path that can fail, which makes them the two routes in the app least able to reach their own boundary — the same property that makes them the cheapest rows in this table makes this row the most stubborn. Both halves are covered separately (the legal shell by the two prose rows, `ErrorState` by the root boundary row) and the composite is not.",
    tell: '[data-testid="error-state"]',
  },
  {
    file: "src/app/global-error.tsx",
    name: "global-error · THE ONE DECLARED ROUTE-LEVEL EXCLUSION",
    path: null,
    // ⚠ THE REASON IS CORRECTED HERE, NOT COPIED. 17-UI-SPEC § GATE-02 justifies excluding this route
    // by axe's landmark rule for page structure — but that rule is `best-practice`-tagged, carries no
    // `wcag*` tag, and is therefore excluded by the declared conformance tag filter, so it can never
    // fire on any surface in this sweep and cannot justify anything. This row's reason supersedes that
    // sentence (17-RESEARCH Pitfall 1, resolution 4).
    skip: "this surface renders its own document, and nothing in this repository can make it render at all. `global-error.tsx` REPLACES the root layout by construction — it is reached only when the ROOT LAYOUT itself throws, and `/dev/throw` throws inside a PAGE, which `src/app/error.tsx` catches first. It receives no global styles either, so no app-level theme attribute reaches it and it cannot be themed; it is already the single entry in `THEME_SWAP_EXCLUSIONS` for exactly that reason, and this row is the same decision applied to the same surface by a second instrument. The two ways to manufacture one are both refused rather than taken quietly: reading a request signal in the root layout makes EVERY route dynamic and destroys the only static routes in the build, and rendering the component inside a dev page nests a second document in the root layout's, producing a tree that is not the one that ships. Both are architectural, and neither is scoped here.",
    tell: "h1",
  },

  // ─── the D-201 instruments — in the table, with their reason, never as absences ───────────────────
  {
    file: "src/app/dev/theme/page.tsx",
    name: "/dev/theme · AUDIT INSTRUMENT, NOT AN AUDIT SUBJECT",
    path: null,
    skip: "this route is one of the instruments the audit is conducted WITH, and auditing it would be measuring the ruler. It exists to render every pattern in both brand directions side by side so a human can compare them, it is gated out of production by a build-time environment check, and no user can reach it — so a violation on it is not a violation of the product. It is deliberately listed here rather than omitted: D-201 enumerates the production surface set as `src/app/**/page.tsx` MINUS `src/app/dev/**`, and an enumeration whose exclusions are invisible is indistinguishable from one that forgot them. The compositions it renders are audited where they actually ship, on the rows above.",
    tell: 'div[data-theme]',
  },
  {
    file: "src/app/dev/throw/page.tsx",
    name: "/dev/throw · AUDIT INSTRUMENT, NOT AN AUDIT SUBJECT",
    path: null,
    skip: "the same D-201 exclusion as the dev theme page, plus a structural fact that makes a measurement impossible even if the exclusion were lifted: this route renders no document of its own because its whole body is a server-side throw. The document it produces is `src/app/error.tsx`'s, which is audited under its own row above and reaches that row BY DRIVING THIS ROUTE — so this file is exercised on every invocation of the sweep while never being its subject. Listed rather than omitted for the reason the row above gives: an invisible exclusion and a forgotten surface look identical.",
    tell: '[data-testid="error-state"]',
  },

  // ─── the OG image routes — in the table, with their reason, never as absences ─────────────────────
  //
  // Three routes, one reason, three rows. They are `image` in `visual-baselines.ts`'s own kind system
  // for precisely this reason: there is no user, no theme attribute and no interaction, because the
  // scraper fetching one is not a browser session. A theme swap is not something they failed to do —
  // it is something that cannot be asked of them, and the same is true of an accessibility tree.
  {
    file: "src/app/opengraph-image.tsx",
    name: "OG card · root",
    path: null,
    skip: "this route returns a PNG, not a document. There is no DOM to walk, no focus order, no accessible name and no contrast pairing a browser ever computes — the response is decoded by a link-preview scraper that is not a browser session at all, which is why `visual-baselines.ts` types these three as a different KIND rather than as three more exclusions. What they are actually gated on is their own suite: `tests/design/og-routes.test.ts` for the route shape and `e2e/visual/surfaces.spec.ts` for a 1200x630 decode check on the bytes. Listed here rather than omitted so the enumeration's exclusions are visible.",
    tell: "img",
  },
  {
    file: "src/app/listings/[id]/opengraph-image.tsx",
    name: "OG card · listing",
    path: null,
    skip: "the same reason as the root card: an image response, not a browser document, so there is nothing for an accessibility scan to read. This one additionally carries an assertion no scan could make anyway — its captured bytes must differ in length from the fallback card's and from the root card's read in the same run, because the fallback is itself a valid 1200x630 PNG and a decode check cannot tell them apart. That belongs to the visual suite and `og-routes.test.ts`, which is where it lives. Listed here so the enumeration's exclusions are visible rather than inferred.",
    tell: "img",
  },
  {
    file: "src/app/(public)/invite/[token]/opengraph-image.tsx",
    name: "OG card · invite",
    path: null,
    skip: "the same reason as the other two cards: an image response rather than a browser document. This one reads no token and returns the same bytes for every one (T-11-OGCRED), so there is not even a per-token variant for a scan to have an opinion about. Its route path additionally carries a six-character hash suffix Next appends whenever a parent segment is a route group, which `visual-baselines.ts` records at its own row and which is the sort of fact a silently-absent surface would have taken with it. Listed here so the enumeration's exclusions are visible.",
    tell: "img",
  },

  // ─── the one non-route surface class ─────────────────────────────────────────────────────────────
  {
    file: NON_ROUTE_DECLARED[0],
    name: "email templates · NOT BROWSER DOCUMENTS",
    path: null,
    skip: "the transactional email templates are not routes and not browser documents: they are composed server-side into an inlined-style HTML string and handed to a mail provider, and the tree that finally renders is the recipient's mail client's, which no browser in this suite can be. Every mechanism this sweep depends on is absent there — no stylesheet cascade, no focus order, no live announcement channel, and no guarantee that a semantic element survives the client's own rewriting. They are gated instead by `tests/design/email-shell.test.ts` and `tests/design/email-tokens.test.ts`, which assert the shell and the token values at the source. This row exists because D-201 names email templates as one of its four exclusions, and an exclusion nobody can find is the same defect as a forgotten surface.",
    tell: "body",
  },
];

// ---------------------------------------------------------------------------
// AC#2 — the row set IS the declared surface set, asserted rather than promised
// ---------------------------------------------------------------------------

test.describe("AC#2 — no surface can be silently absent from the axe table", () => {
  test("the table's row set equals the declared surface set", () => {
    const declared = [...declaredRouteFiles(), ...NON_ROUTE_DECLARED].sort();
    const tabled = ROWS.map((r) => r.file).sort();

    const missing = declared.filter((f) => !tabled.includes(f));
    const extra = tabled.filter((f) => !declared.includes(f));
    const duplicated = tabled.filter((f, i) => tabled.indexOf(f) !== i);

    expect(
      { missing, extra, duplicated },
      "the axe table's row set is not the declared surface set. `missing` lists surfaces that exist " +
        "on disk and are absent from the table — an absent surface is the one failure this " +
        "assertion exists to make impossible, because a surface nobody scanned and a surface that " +
        "scanned clean look identical in a green run. `extra` lists rows naming a file that is not " +
        "on disk (a rename, or a row left behind by a deleted route). `duplicated` lists a file " +
        "claimed by two rows, which would let one of them be quietly dropped. A new route is NOT a " +
        "number to bump: add a row with a measurement, or a row with a named `skip` paragraph " +
        "saying what fixture it needs.",
    ).toEqual({ missing: [], extra: [], duplicated: [] });
  });

  test("every unreachable row carries a reason long enough to act on", () => {
    const unreasoned = ROWS.filter((r) => r.path === null).filter(
      (r) => (r.skip ?? "").length < 80,
    );
    expect(
      unreasoned.map((r) => r.name),
      "a row with no path and no reason is a silent absence wearing a row's clothes. Every skip " +
        "below throws its reason into the run's own output, so the cost of not measuring a surface " +
        "is paid where somebody reads it. A phrase is not a reason: say which fixture is missing, " +
        "what the surface would have shown, and what the cheapest correct fix is.",
    ).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// The sweep
// ---------------------------------------------------------------------------

/**
 * TRAP 1 — assert the route rendered ITS OWN surface before scanning it.
 *
 * `overflow-320.spec.ts:741-753`'s guard, unchanged, and the argument transfers with a sharper edge:
 * an axe scan of a blank page, a 404 or a redirect to `/login` reports ZERO violations, which is
 * byte-for-byte what a clean surface reports. The 15s allowance is that file's measured one — the dev
 * server compiles routes on demand and a reachability guard that flakes is a guard people ignore.
 */
async function expectReachable(page: Page, row: SweepRow, where: string): Promise<void> {
  await expect(
    page.locator(row.tell),
    `${where}: the route rendered no \`${row.tell}\`, so it is not the surface this row names. An ` +
      "axe scan is satisfied by a page with nothing on it, which is why this check runs first and " +
      "is a failure rather than a skip.",
  ).not.toHaveCount(0, { timeout: 15_000 });
}

test.describe(`AC#16 — zero axe violations in ${THEME} at ${WIDTHS.join(" and ")}px`, () => {
  // ⚠ SEQUENTIAL, IN ONE WORKER, AND NOT FOR SPEED. `mode: "default"` overrides the config's
  // `fullyParallel`, which matters here for a reason that has nothing to do with contention: the
  // sign-ups below run in `beforeAll`, `beforeAll` runs once PER WORKER, and `/sign-up/email` is rate
  // limited to five per sixty seconds (`src/lib/auth.ts:182`). Three workers is six sign-ups, and the
  // resulting failure reads exactly like a product bug on the page under test. `default` rather than
  // `serial` is also deliberate: a serial block stops reporting after its first red, and this file's
  // whole job is to enumerate every violation in one run.
  //
  // 90s rather than the default 30s. Two rows resolve their path from the running app, every row
  // waits on a route the dev server may still be compiling, and a scan is a full flattened-DOM walk
  // on top of the navigation AC#29 already needed 60s for.
  test.describe.configure({ mode: "default", timeout: 90_000 });

  test.beforeAll(async ({ browser }) => {
    // Longer than the per-test budget on purpose: this hook drives two full sign-ups and one draft
    // creation against a dev server that may be compiling every route it touches for the first time.
    test.setTimeout(240_000);

    const bookerContext = await browser.newContext({ baseURL: BASE });
    const bookerPage = await bookerContext.newPage();
    await signUp(bookerPage, "booker", "bk");
    const booker = await bookerContext.cookies();
    await bookerContext.close();

    const hostContext = await browser.newContext({ baseURL: BASE });
    const hostPage = await hostContext.newPage();
    await signUp(hostPage, "host", "ht");
    const draftListingId = await mintDraftListing(hostPage);
    const host = await hostContext.cookies();
    await hostContext.close();

    fixture = { booker, host, draftListingId };
  });

  for (const row of ROWS) {
    for (const width of WIDTHS) {
      const title = `${row.name} · ${THEME} · ${width}px`;

      if (row.path === null) {
        // NAMED, never silent. The reason travels into the run's own output, which is what makes a
        // gap in this sweep something a reader meets rather than something they have to notice.
        test.skip(title, () => {
          throw new Error(`not measured: ${row.skip}`);
        });
        continue;
      }

      const resolvePath = row.path;

      test(title, async ({ page }) => {
        // On the CONTEXT and before the first navigation (D-06/D-08): next-themes' inline pre-paint
        // script reads the value on the very first paint, so there is no flash of another theme and
        // no post-hydration switch to wait out. Court is the default a user gets, and seeding it
        // explicitly is what makes the court-only scope a value in this file rather than an omission.
        await seedTheme(page.context(), THEME);
        if (row.session) await page.context().addCookies([...fixture[row.session]]);
        await page.setViewportSize({ width, height: VIEWPORT_HEIGHT });

        const path = typeof resolvePath === "string" ? resolvePath : await resolvePath(page);
        expect(
          path,
          `${title}: this row resolves its path from the running app, and the app produced none. ` +
            "For the catalogue rows, seed the local database (`npm run db:seed`) before reading " +
            "this as an accessibility failure; for the host rows, the draft listing the fixture " +
            "mints did not resolve and the hook above is what failed, not the page.",
        ).toBeTruthy();

        // The interceptor is installed only for the row that asks for it — installed unconditionally
        // the root error boundary never renders, because `/dev/throw` throws on the SERVER and the
        // boundary is delivered through the flight channel, which re-serving the body loses.
        if (row.served) {
          const truncator = installTruncator(page);
          await truncator.ready;
          truncator.set(true);
        }

        await page.goto(`${BASE}${path}`);
        await page.evaluate(() => document.fonts.ready);

        if (row.open) {
          await row.open(page);
          await page.evaluate(() => document.fonts.ready);
        }

        // THE TELL BEFORE THE SCAN, ALWAYS AND WITHOUT A BRANCH. `expectAxeClean`'s two vacuity
        // guards catch a caller who forgot; this is the caller not forgetting.
        await expectReachable(page, row, title);

        await expectAxeClean(page, title);
      });
    }
  }
});
