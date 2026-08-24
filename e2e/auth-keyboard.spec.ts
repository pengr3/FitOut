import { expect, test, type Page } from "@playwright/test";

import {
  DEV_OVERLAY_TAG,
  WALK_BOUND,
  partitionDevOverlay,
  resetFocusToTop,
  walkForward,
} from "./helpers/focus";
import { BASE_URL as BASE } from "./helpers/served-document";

// AUTHUI-03's KEYBOARD gate — the tab order of the six auth documents, WRITTEN DOWN rather than
// inferred, and re-checked by a command.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// AUTHUI-03 is conjunctive across five gates — 320px, keyboard, AA, designed states, a baseline —
// and the phase verification found the keyboard one unevidenced. The only keyboard evidence Phase 15
// had was plan 15-07's ten-press walk on `/reset-password?token=abc123`, and 15-07 says plainly what
// that walk is for: discharging T-15-25, the claim that the hidden token input never receives focus.
// That is one input on one route. Grepping `e2e/` for a Tab press returned `overflow-320.spec.ts`
// and nothing else, and that file is a GEOMETRY harness — its two focus assertions per route exist
// to prove a ring is painted, not to say what order anything comes in. `/login`, `/signup` and
// `/forgot-password` had no recorded keyboard walk at all.
//
// So this file widens 15-07's walk from one document to six and from one input to every stop,
// WITHOUT weakening the one thing that walk was built to prove. Task 2 of plan 15-12 adds the
// focus-visible half, the reverse walk and the hardened T-15-25 assertions on top of the sequences
// declared here.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT PROVES
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • A keyboard-only visitor reaches every control on all four auth routes — and on both
//     form-replacing branches — in an order this repository has written down as DATA.
//   • The wordmark is the first tab stop on every auth document.
//   • The 320px layout adds and removes no tab stop: the widest and tallest auth document reports
//     the same sequence at 320 as it does at the project's default viewport.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT IT DOES **NOT** PROVE — stated here so nobody reads more into a green run than it carries
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • ONE ENGINE. Chromium only. Firefox and WebKit differ on which elements are in the sequential
//     focus order at all (historically: links and radio groups), and this suite has one project.
//   • ONE THEME. The tab ORDER is a DOM fact and does not vary by theme, but the indicator readings
//     Task 2 measures are taken in whatever theme the default document loads in. `overflow-320.spec.ts`
//     runs its rows in both themes; this file does not, and that is a deliberate cost-vs-coverage
//     choice rather than an oversight.
//   • NOTHING ABOUT ANNOUNCEMENT ORDER. Tab order is not reading order and is not what a screen
//     reader narrates. `tests/design/live-regions.test.tsx` owns that claim; the two are independent
//     and a green run here says nothing about it.
//   • NOTHING ABOUT CONTRAST. Whether the indicator this walk measures has an accessible contrast
//     ratio against its ground is AUTHUI-03's AA gate, which plan 15-13 owns.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY REAL Tab PRESSES AND NEVER `.focus()`
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// DS-05's recipe is `focus-visible:*`, and a PROGRAMMATIC `.focus()` does not match `:focus-visible`
// in Chromium. A version of this walk that called `.focus()` would report every control as drawing
// nothing and would be red on a perfectly correct tree — and the version that "fixed" that by
// relaxing the assertion would be green on a tree with no focus styles at all. The shared focus
// helper this file imports carries the same paragraph over `expectRing`, which is the function that
// criterion lives in. (The module path is named descriptively rather than quoted, following
// `booking-row.tsx:112` — plan 15-12's acceptance scan counts that string here and expects to find
// exactly the import at the top of this file.)
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// TWO MEASURED FACTS ABOUT THE INSTRUMENT, recorded because both look like defects and neither is
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// 1. `next dev` PUTS A TAB STOP IN THE DOCUMENT THAT THE APP DOES NOT SHIP. The dev-tools indicator
//    mounts as a `<nextjs-portal>` custom element appended to `<body>` and takes the LAST stop on
//    every one of these documents — except when it has not finished mounting, which happened on the
//    first page load of a probe run on 25 August 2026 and is exactly why it cannot simply be declared
//    as stop N+1. It is filtered by `partitionDevOverlay`, and the filter is ASSERTED rather than
//    trusted: every dropped element must be a `nextjs-portal` and all of them must sit at the END of
//    the raw sequence, so the exclusion can never quietly swallow a product control.
//
// 2. THE POST-SUBMIT BRANCH IS REACHED BY REMOVING THE ELEMENT THAT HAS FOCUS. Clicking
//    `Send reset link` replaces the whole form, so Chromium's sequential-navigation starting point is
//    left where the submit button was and the next Tab resumes BELOW the wordmark. Probed: the
//    forward walk on that branch reported six stops beginning `a:Back to log in@main` with
//    `a:FitOut@main` absent, while the backward walk on the SAME document reached `a:FitOut@main` as
//    its final stop — the wordmark was in the order the whole time. `resetFocusToTop` puts the
//    starting point above the first stop with the keyboard before every walk, which makes the
//    sequence a fact about the DOCUMENT rather than about how the document was reached.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE RULE BEING ASSERTED (15-UI-SPEC § "The five hard gates, per screen", gate 2)
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   wordmark → (card, in DOM order) fields → inline links in source order → primary → secondary →
//   cross-links → footer links. Every control shows visible focus. No focus trap; the hidden token
//   input on reset is not tabbable — VERIFY, DO NOT ASSUME.
//
// The sequences below are that rule instantiated. They were derived from source and then CONFIRMED
// against a real browser; where the two disagreed, the browser won and the divergence is recorded
// above. No page was edited to make a sequence come true, and `git diff --exit-code src/` at the end
// of plan 15-12 is the proof.

/** `[data-testid="panel-card"]` — the composition all four auth documents share since D-162. */
const PANEL = '[data-testid="panel-card"]';

/**
 * The token fixture, and its two properties are `overflow-320.spec.ts`'s reasoning REUSED rather than
 * re-derived: FIXED, because nothing here may be seeded from the clock, and never checked against the
 * database, because the page branches on the token's PRESENCE (the shared `resetSchema` asks only for
 * a non-empty string) and nothing in this file submits the form.
 *
 * A DISTINCT LITERAL from that file's `e2e-overflow-320-fixed-token`, deliberately: a grep for either
 * string says which harness is speaking.
 */
const RESET_TOKEN = "e2e-auth-keyboard-fixed-token";

/**
 * The forgot-password fixture, same borrowed reasoning: a FIXED literal address with NO ACCOUNT
 * behind it. The post-submit branch is reached identically whether the account exists or not — that
 * uniformity is T-03-02's whole point — so an address with no user attached means no email is even
 * attempted and this case cannot depend on the dev environment's mail configuration.
 */
const FORGOT_ADDRESS = "e2e.auth-keyboard.no-account@example.com";

/**
 * The five stops the footer contributes, identical on all six documents.
 *
 * FIVE AND NOT SIX: `SUPPORT_EMAIL` is `null` (D-26/D-161), so `site-footer.tsx`'s mailto row renders
 * nothing at all — not a placeholder, not a disabled link. The day that constant is set this tail
 * grows a sixth entry and all six sequences go red at once, which is the correct blast radius for a
 * change that adds a control to every page in the app.
 */
const FOOTER_TAIL = [
  "a:FitOut@contentinfo",
  "a:Find a space@contentinfo",
  "a:Host your space@contentinfo",
  "a:Terms@contentinfo",
  "a:Privacy@contentinfo",
] as const;

type AuthDocument = {
  readonly name: string;
  readonly path: string;
  /** Reaches a state the plain path cannot. Runs AFTER the panel is confirmed and BEFORE `tell`. */
  readonly open?: (page: Page) => Promise<void>;
  /** A selector only this document produces — TRAP 1, borrowed from `overflow-320.spec.ts`. */
  readonly tell: string;
  /** The expected focus sequence, as data. Stop descriptors, in order, first press to last. */
  readonly stops: readonly string[];
};

/**
 * SIX DOCUMENTS, 59 STOPS, WRITTEN OUT.
 *
 * Descriptor format (the shared focus helper imported above produces these):
 *   links    `a:<trimmed text>@<landmark>`     e.g. `a:FitOut@main`, `a:Terms@contentinfo`
 *   inputs   `input[<type>]:<label text>`      e.g. `input[email]:Email`
 *   buttons  `button[<type or role>]:<text>`   e.g. `button[submit]:Log in`
 *
 * The landmark suffix on links is load-bearing and not decoration: the layout's wordmark and the
 * footer's wordmark are the same tag with the same text and the same href, and a projection without a
 * landmark would report them as one indistinguishable string in two places in every sequence.
 */
const EXPECTED_SEQUENCES: readonly AuthDocument[] = [
  {
    name: "/login",
    path: "/login",
    tell: `${PANEL} a[href="/signup"]`,
    // ⚠ THE THIRD STOP IS THE NON-OBVIOUS ONE AND IT IS NOT A DEFECT. `Forgot password?` renders
    // inside the PASSWORD FIELD'S LABEL ROW (`login/page.tsx`'s `flex items-center justify-between`
    // div, above the password `Input`), so in DOM order it precedes the input it sits above. That is
    // exactly 15-UI-SPEC gate 2's "inline links in source order". Recorded, not reordered — moving
    // the link to satisfy an intuition about visual order would restyle a shipped screen to make a
    // test read better, which is the inversion this whole plan exists to avoid.
    stops: [
      "a:FitOut@main",
      "input[email]:Email",
      "a:Forgot password?@main",
      "input[password]:Password",
      "button[submit]:Log in",
      "button[button]:Continue with Google",
      "a:Create an account@main",
      ...FOOTER_TAIL,
    ],
  },
  {
    name: "/signup",
    path: "/signup",
    tell: `${PANEL} [role="radiogroup"]`,
    // ⚠ BOTH INTENT RADIOS ARE TAB STOPS, and this is an OBSERVATION rather than a finding to fix.
    // They are native `<button type="button" role="radio">` elements with no roving tabindex, so each
    // is independently focusable. WAI-ARIA authoring practice would prefer one stop plus arrow keys;
    // WCAG 2.1.1 is satisfied either way (every control is keyboard reachable), and plan 15-07 froze
    // that pair's markup byte-identical while restyling everything around it. Adding roving tabindex
    // or arrow-key handling here would be a behaviour change with no mandate — see
    // `.planning/phases/15-auth-profile-transactional-email/deferred-items.md`, where it is logged
    // for a future look rather than done quietly inside a test-only plan.
    //
    // ⚠ THE SUBMIT LABEL IS INTENT-DEPENDENT (`Sign up to book` / `Sign up to host`). The declared
    // sequence names the DEFAULT, which is what the page renders on load, so the walk must not click
    // a radio before walking — and it does not: nothing in this row's case interacts before the Tab
    // presses begin.
    stops: [
      "a:FitOut@main",
      "button[radio]:Book a space",
      "button[radio]:Host a space",
      "input[text]:First name",
      "input[email]:Email",
      "input[password]:Password",
      "button[submit]:Sign up to book",
      "button[button]:Continue with Google",
      "a:Log in@main",
      ...FOOTER_TAIL,
    ],
  },
  {
    name: "/forgot-password",
    path: "/forgot-password",
    tell: `${PANEL}:has-text("Send reset link")`,
    stops: [
      "a:FitOut@main",
      "input[email]:Email",
      "button[submit]:Send reset link",
      "a:Back to log in@main",
      ...FOOTER_TAIL,
    ],
  },
  {
    name: "/forgot-password · post-submit",
    path: "/forgot-password",
    open: async (page) => {
      await page.getByLabel("Email").fill(FORGOT_ADDRESS);
      await page.getByRole("button", { name: /send reset link/i }).click();
    },
    // THE BRANCH'S OWN ACCESSIBLE NAME, not the panel — the panel is present in BOTH branches, so the
    // plainer selector would be satisfied by a submit that did nothing at all. `Reset request result`
    // is the name plan 15-07 gave the region and plan 15-09 declared in `live-regions.ts`.
    tell: '[aria-label="Reset request result"]',
    // THE BRANCH REPLACES THE FORM: no field, no submit, and (15-07 measured this) zero
    // accent-filled elements. Two stops in the card, and one of them is the layout's.
    stops: ["a:FitOut@main", "a:Back to log in@main", ...FOOTER_TAIL],
  },
  {
    name: "/reset-password · with token",
    path: `/reset-password?token=${RESET_TOKEN}`,
    // NOT the bare panel. The form sits inside a `<Suspense>` boundary whose fallback is a `Loading…`
    // line, and the panel renders in BOTH states — so the plain hook would let the walk start against
    // the fallback and report a short sequence, intermittently. The password field is the resolved
    // branch and nothing else.
    tell: `${PANEL} input[type="password"]`,
    // THIS IS 15-07's WALK, RE-RECORDED — nine stops, same order. If it ever stops reproducing them,
    // something regressed between that plan and this one and THAT is the finding.
    stops: [
      "a:FitOut@main",
      "input[password]:New password",
      "button[submit]:Set new password",
      "a:Back to log in@main",
      ...FOOTER_TAIL,
    ],
  },
  {
    name: "/reset-password · missing token",
    path: "/reset-password",
    // THE ROUTE OUT, which only this branch renders — the token branch's only link is `Back to log
    // in`. Scoped through the panel so it cannot be satisfied by a link elsewhere in the shell.
    tell: `${PANEL} a[href="/forgot-password"]`,
    stops: [
      "a:FitOut@main",
      "a:Request a new link@main",
      "a:Back to log in@main",
      ...FOOTER_TAIL,
    ],
  },
];

type WalkCase = AuthDocument & {
  readonly caseName: string;
  readonly viewport?: { readonly width: number; readonly height: number };
};

const SIGNUP = EXPECTED_SEQUENCES.find((d) => d.name === "/signup") as AuthDocument;

/**
 * SEVEN CASES OVER SIX DOCUMENTS: each document once at the project's default viewport, plus
 * `/signup` repeated at 320x568.
 *
 * WHY ONE NARROW REPEAT AND NOT FOURTEEN. The claim a narrow repeat can falsify is "the responsive
 * layout adds or removes a tab stop below the `sm:` breakpoint" — a control hidden by a `hidden
 * sm:block`, or a mobile-only affordance appearing. That is a property of the LAYOUT, not of each
 * route, and `/signup` is the auth document with the most layout to get wrong: plan 15-07 measured it
 * as the tallest card (544px) with the only multi-column construct on the surface (the intent pair,
 * `grid-cols-2`, 124px x 38px per button inside a 256px inner box). If any auth layout changes its
 * control set at 320px, this is the case that says so. Repeating all six would multiply the run time
 * by two to re-measure the same shared layout, and a suite people stop running proves nothing.
 */
const CASES: readonly WalkCase[] = [
  ...EXPECTED_SEQUENCES.map((doc) => ({ ...doc, caseName: doc.name })),
  { ...SIGNUP, caseName: "/signup · 320x568", viewport: { width: 320, height: 568 } },
];

/**
 * TRAP 1, borrowed whole from `overflow-320.spec.ts`: assert the document rendered ITS OWN surface
 * before asserting anything about its tab order.
 *
 * Every assertion in this file would pass against a blank page, a 404 or a redirect to `/login` if
 * the expected sequence happened to be empty, and it would fail confusingly if it did not — so the
 * reachability check runs first and is a FAILURE rather than a skip.
 *
 * 15s, not the default 5s, and it is a MEASURED allowance rather than a hedge: the dev server
 * compiles routes on demand, and `overflow-320.spec.ts` recorded a route missing its own
 * server-rendered `h1` inside 5s while under load. A reachability guard that flakes is a guard people
 * learn to ignore.
 */
async function expectReachable(page: Page, selector: string, where: string): Promise<void> {
  await expect(
    page.locator(selector),
    `${where}: the document rendered no \`${selector}\`, so it is not the surface this row names.`,
  ).not.toHaveCount(0, { timeout: 15_000 });
}

/** Navigate, confirm the auth composition, run the row's resolver, confirm the row's own surface. */
async function arm(page: Page, row: WalkCase): Promise<void> {
  await page.goto(`${BASE}${row.path}`);
  await expectReachable(page, PANEL, `${row.caseName} (before the resolver)`);
  if (row.open !== undefined) await row.open(page);
  await expectReachable(page, row.tell, row.caseName);
}

/**
 * Walk the document forward and return the product stops, with the dev-server overlay partitioned off
 * and the partition asserted.
 */
async function recordForwardWalk(page: Page, where: string) {
  await resetFocusToTop(page);
  const raw = await walkForward(page);

  expect(
    raw.length,
    `${where}: the forward walk hit its ${WALK_BOUND}-press bound without focus ever leaving the ` +
      "document. That is what a focus trap looks like from here, and the bound is why it is an " +
      "assertion instead of a hang.",
  ).toBeLessThan(WALK_BOUND);

  const { stops, overlay } = partitionDevOverlay(raw);
  expect(
    overlay.map((s) => s.tag),
    `${where}: something other than the \`${DEV_OVERLAY_TAG}\` dev-tools host was dropped from the ` +
      "walk. Only the dev server's own furniture may be excluded.",
  ).toEqual(overlay.map(() => DEV_OVERLAY_TAG));
  expect(
    raw.slice(0, stops.length).map((s) => s.descriptor),
    `${where}: a dropped \`${DEV_OVERLAY_TAG}\` stop appeared BEFORE a product control, so the ` +
      "filter would be hiding part of the real tab order rather than the dev overlay's tail.",
  ).toEqual(stops.map((s) => s.descriptor));

  return { stops, raw };
}

test.describe("AUTHUI-03 keyboard — the auth surface's tab order, recorded", () => {
  // 60s rather than the default 30s, for `overflow-320.spec.ts`'s reason: every case waits on a route
  // the dev server may still be compiling, and one of them submits a form first.
  test.describe.configure({ timeout: 60_000 });

  for (const row of CASES) {
    test(`${row.caseName} — ${row.stops.length} stops, in order`, async ({ page }) => {
      if (row.viewport !== undefined) await page.setViewportSize(row.viewport);
      await arm(page, row);

      const { stops } = await recordForwardWalk(page, row.caseName);

      // ONE `toEqual` OVER THE WHOLE ARRAY, not a per-stop loop. A loop reports "stop 4 differs" and
      // sends the reader counting; the array form prints both sequences side by side and shows an
      // INSERTED or REMOVED stop for what it is.
      expect(
        stops.map((s) => s.descriptor),
        `${row.caseName}: the recorded tab order is not the one this file declares. If the page is ` +
          "right and the declaration is stale, fix the declaration and say why in the summary — " +
          "never edit the page to make the sequence come true.",
      ).toEqual([...row.stops]);
    });
  }
});
