import { expect, test, type Page } from "@playwright/test";

import {
  DEV_OVERLAY_TAG,
  WALK_BOUND,
  expectRing,
  indicatorOf,
  partitionDevOverlay,
  probeCandidateStops,
  resetFocusToTop,
  sameIndicator,
  walkBackward,
  walkForward,
  type Indicator,
  type StopProbe,
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
// THREE WATCHED REDS — 25 August 2026, each applied, run, transcribed VERBATIM, and REVERTED
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// This phase has already shipped three assertions that could not fail. A new gate with no red-proof
// is how a fourth lands, so every non-trivial claim below was watched failing before it was believed.
// Command for all three: `npx playwright test e2e/auth-keyboard.spec.ts --project=chromium`.
//
// ── M-A · THE SEQUENCE ASSERTION IS REAL ─────────────────────────────────────────────────────────
// MUTATION: `tabIndex={-1}` added to the wordmark `<Link>` in `src/app/(auth)/layout.tsx`.
// RESULT: **7 failed / 0 passed** — every case, which is the correct blast radius: the wordmark is
// stop 1 on all six documents and the seventh case is `/signup` repeated at 320. Anything smaller
// than "all seven" would have meant the walk was not seeing the layout at all.
//
//     Error: /login: the recorded tab order is not the one this file declares. If the page is
//     right and the declaration is stale, fix the declaration and say why in the summary — never
//     edit the page to make the sequence come true.
//
//     expect(received).toEqual(expected) // deep equality
//
//     - Expected  - 1
//     + Received  + 0
//
//     @@ -1,7 +1,6 @@
//       Array [
//     -   "a:FitOut@main",
//         "input[email]:Email",
//         "a:Forgot password?@main",
//         "input[password]:Password",
//         "button[submit]:Log in",
//         "button[button]:Continue with Google",
//
// REVERTED. `git diff --exit-code src/app/(auth)/layout.tsx` exits 0.
//
// ── M-B · T-15-25 IS NOT VACUOUS ─────────────────────────────────────────────────────────────────
// MUTATION: the reset token input changed from `type="hidden"` to `type="text"` in
// `src/app/(auth)/reset-password/page.tsx`.
// RESULT: **1 failed / 6 passed** — exactly the one document that renders the input. The
// missing-token branch does not render it at all and no other auth document has one.
//
//     Error: /reset-password · with token (T-15-25): the token input is no longer `type="hidden"`.
//
//     expect(received).toBe(expected) // Object.is equality
//
//     Expected: "hidden"
//     Received: "text"
//
// ⚠ THE FIRST RUN OF M-B FOUND A DEFECT IN THIS FILE, which is the second reason to watch a red.
// With the T-15-25 block placed AFTER the sequence assertion — its natural reading order — the
// mutation failed on the tab-order `toEqual` instead: right case, right count, and a message that
// said only that an array differed. A token-exposure leak reported as "the recorded tab order is not
// the one this file declares" is a leak somebody triages as a stale declaration and closes by editing
// the declaration. The block was moved BEFORE the sequence assertion and the mutation re-run to get
// the transcript above. REVERTED; `git diff --exit-code src/app/(auth)/reset-password/page.tsx`
// exits 0.
//
// ── M-B′ · THE *WALK* HALF OF T-15-25 IS NOT VACUOUS EITHER ──────────────────────────────────────
// M-B proves the re-measurement of `type="hidden"` can fail. It does NOT prove the assertion that
// carries the threat — "no stop in either walk is the token input" — can fail, because the type
// check short-circuits first. So it was isolated: M-B still applied, `expectTokenNeverFocused`
// temporarily hoisted above `expectTokenInputInert`, one run, then both restored.
// RESULT: **1 failed / 6 passed**, and the walk itself caught it.
//
//     Error: /reset-password · with token (T-15-25 — INFORMATION DISCLOSURE): the reset token
//     input RECEIVED FOCUS while walking forward. That token is a single-use credential for
//     changing a password; an input that can be focused can be tabbed to, captured in a
//     screenshot, announced by a screen reader and copied. 1 token input(s) were reached walking
//     forward, and the only acceptable number is zero.
//
//     expect(received).toEqual(expected) // deep equality
//
//     - Expected  - 1
//     + Received  + 3
//
//     - Array []
//     + Array [
//     +   "input[text]:",
//     + ]
//
// The recorded descriptor is the token input itself — matched on its registered field NAME, which is
// why an input that stopped being hidden is still caught. Order restored, mutation reverted, seven
// cases green.
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
  /** Set on the ONE document that renders the reset token input. Turns on the T-15-25 block. */
  readonly hasResetToken?: true;
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
    // ⚠ PHASE 17 LOOKED, AND DELIBERATELY DID NOT CONVERT — 17-CONTEXT **D-198**. (Cited with the
    // document name because PROJECT.md keeps its own D-numbered rows and a bare "D-198" would be
    // ambiguous against them.) The audit considered converting this radio group to the roving-tabindex
    // pattern and recorded the reasoning here rather than doing it:
    //
    //   1. WCAG **2.1.1 (Keyboard) is SATISFIED as shipped.** Every radio is reachable by Tab and
    //      operable by Space/Enter — measured by this very file, whose walk visits both intent-radio
    //      stops declared below and asserts an indicator on each. So the divergence from the
    //      WAI-ARIA authoring practice is a question of AUTHORING PRACTICE, not of CONFORMANCE, and
    //      there is no accessibility defect to repair.
    //   2. **Converting would churn the declaration in this file for zero conformance gain.** The
    //      arithmetic, MEASURED off the run rather than estimated: `/signup` declares 15 stops (the 10
    //      panel entries below plus `FOOTER_TAIL`'s 5), 2 of which are these radios. Roving tabindex
    //      collapses those 2 into 1, so `/signup` goes 15 -> 14, this file's six-document total goes
    //      60 -> 59, and the seven cases it actually walks go 75 -> 73 (`/signup · 320x568` walks the
    //      same document a second time). Rewriting a declared, measured sequence to adopt a pattern
    //      that buys no conformance is a REWRITE MOVE INSIDE AN AUDIT — the one thing 17-CONTEXT says
    //      this phase does not do.
    //
    // Phase 17 therefore changed nothing on `/signup`: not a stop, not an assertion, not a byte of
    // the page. This comment is the deliverable, and the 59 stops above and below it are untouched.
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
      "input[password]:Confirm password",
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
    hasResetToken: true,
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
 * Partition the dev overlay off a raw walk, ASSERTING that it can only ever have taken the far edge.
 *
 * `edge` is where the overlay is allowed to sit: `"end"` for a forward walk (the portal is appended
 * to `<body>`, so it is last), `"start"` for the reverse walk (the same element, reached first). If a
 * dropped element ever turns up anywhere else, the filter would be hiding a product control and this
 * fails instead — which is the difference between excluding the dev server's furniture and narrowing
 * a check until a number matches.
 */
function partitionAsserted(raw: StopProbe[], where: string, edge: "start" | "end") {
  const { stops, overlay } = partitionDevOverlay(raw);
  expect(
    overlay.map((s) => s.tag),
    `${where}: something other than the \`${DEV_OVERLAY_TAG}\` dev-tools host was dropped from the ` +
      "walk. Only the dev server's own furniture may be excluded.",
  ).toEqual(overlay.map(() => DEV_OVERLAY_TAG));

  const withoutEdge =
    edge === "end" ? raw.slice(0, stops.length) : raw.slice(overlay.length);
  expect(
    withoutEdge.map((s) => s.descriptor),
    `${where}: a dropped \`${DEV_OVERLAY_TAG}\` stop was not at the ${edge} of the sequence, so the ` +
      "filter would be hiding part of the real tab order rather than the dev overlay.",
  ).toEqual(stops.map((s) => s.descriptor));

  return stops;
}

/** Walk the document forward and return the product stops, the overlay partitioned off under assertion. */
async function recordForwardWalk(page: Page, where: string): Promise<StopProbe[]> {
  await resetFocusToTop(page);
  const raw = await walkForward(page);

  expect(
    raw.length,
    `${where}: the forward walk hit its ${WALK_BOUND}-press bound without focus ever leaving the ` +
      "document. That is what a focus trap looks like from here, and the bound is why it is an " +
      "assertion instead of a hang.",
  ).toBeLessThan(WALK_BOUND);

  return partitionAsserted(raw, `${where} (forward)`, "end");
}

/**
 * THE INDICATOR IS ACTUALLY PAINTED — a strictly stronger claim than `expectRing`, and it is here
 * because `expectRing` alone has a hole this walk would otherwise report green through.
 *
 * `expectRing` accepts any `box-shadow` that is not the string `none`. Tailwind's `ring-*` compiles
 * to a FIVE-LAYER shadow of which three layers are fully transparent placeholders, so a tree whose
 * ring COLOUR had gone transparent would still hand `expectRing` a long, non-`none` string and pass
 * — and the focused-vs-unfocused difference check below would pass too, because the unfocused
 * reading is `none`. Two assertions agreeing about a surface that draws nothing is exactly the
 * unfailable-gate shape this phase has already shipped three of.
 *
 * MEASURED, so the check is calibrated against the real value rather than an imagined one. A focused
 * `<Input>` on `/login`, 25 August 2026:
 *
 *   rgba(0, 0, 0, 0) 0px 0px 0px 0px, rgba(0, 0, 0, 0) 0px 0px 0px 0px,
 *   lab(100 0 0) 0px 0px 0px 2px, lab(36.2 0 0.00000596046) 0px 0px 0px 4px,
 *   rgba(0, 0, 0, 0) 0px 0px 0px 0px
 *
 * The 2px `lab(100 0 0)` is DS-05's ring OFFSET against the background and the 4px
 * `lab(36.2 …)` is the ring itself. Strip every fully-transparent layer and something with a colour
 * must remain. A bare link satisfies the claim the other way — a real UA outline, `auto 1px`, with no
 * shadow at all — which is `(auth)/layout.tsx`'s deliberate choice and not a gap.
 */
const FULLY_TRANSPARENT = /rgba\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*,\s*0\s*\)/g;
const A_COLOUR = /(rgb|rgba|hsl|hsla|lab|lch|oklab|oklch|color)\(|#[0-9a-f]{3}/i;

/**
 * T-15-25's two halves, factored out so the SECURITY claim can be asserted before the sequence
 * equality and again after the reverse walk.
 *
 * ⚠ THE ORDER IS THE FINDING, and it was found by running the mutation rather than by reasoning.
 * With `type="text"` on the token input, the first draft of this file failed on the tab-order
 * `toEqual` — correct, one case, right blast radius, and a failure message that said only that an
 * array differed. A token-exposure leak reported as "the recorded tab order is not the one this file
 * declares" is a leak somebody triages as a stale declaration and fixes by editing the declaration.
 * The forward half therefore runs FIRST, before the sequence assertion, so the threat is what the
 * reader sees.
 */
function expectTokenInputInert(candidates: StopProbe[], where: string): void {
  // MATCHED ON THE REGISTERED FIELD NAME, NOT ON `type`. An input that stopped being hidden would
  // still be the token input and still needs to be caught; matching on `type="hidden"` would make
  // the assertion true BY the very property whose loss it exists to detect.
  const tokenInputs = candidates.filter((c) => c.fieldName === "token");
  expect(
    tokenInputs.length,
    `${where} (T-15-25): the reset form rendered no input named \`token\` at all, so every ` +
      "assertion about it would be vacuously true. Either the form did not render or the field was " +
      "renamed — in both cases this gate is measuring nothing.",
  ).toBe(1);

  // 15-07's two measured facts, RE-MEASURED here rather than cited. A hidden input has no layout
  // box, and an element with no layout box is not rendered and therefore not focusable.
  expect(
    tokenInputs[0].typeAttr,
    `${where} (T-15-25): the token input is no longer \`type="hidden"\`.`,
  ).toBe("hidden");
  expect(
    tokenInputs[0].noLayoutBox,
    `${where} (T-15-25): the token input has a layout box (\`offsetParent\` is not null), which ` +
      "means it is rendered — and a rendered input is a focusable one.",
  ).toBe(true);
}

function expectTokenNeverFocused(
  walked: StopProbe[],
  where: string,
  direction: "forward" | "backward",
): void {
  const reached = walked.filter((s) => s.fieldName === "token");
  expect(
    reached.map((s) => s.descriptor),
    `${where} (T-15-25 — INFORMATION DISCLOSURE): the reset token input RECEIVED FOCUS while ` +
      `walking ${direction}. That token is a single-use credential for changing a password; an ` +
      "input that can be focused can be tabbed to, captured in a screenshot, announced by a screen " +
      `reader and copied. ${reached.length} token input(s) were reached walking ${direction}, and ` +
      "the only acceptable number is zero.",
  ).toEqual([]);
}

function expectIndicatorPaints(stop: StopProbe, where: string): void {
  const hasOutline = stop.outlineStyle !== "none" && parseFloat(stop.outlineWidth) > 0;
  const opaqueShadow =
    stop.boxShadow !== "none" && A_COLOUR.test(stop.boxShadow.replace(FULLY_TRANSPARENT, ""));
  expect(
    hasOutline || opaqueShadow,
    `${where}: focus is here and NOTHING WITH A COLOUR is drawn. outline: ${stop.outlineStyle} ` +
      `${stop.outlineWidth}; box-shadow: ${stop.boxShadow}. A ring whose every layer is fully ` +
      "transparent is a `box-shadow` that is not the string `none` and paints nothing — it would " +
      "satisfy `expectRing` and the focused-vs-unfocused difference check while a keyboard user saw " +
      "no indicator at all.",
  ).toBe(true);
}

test.describe("AUTHUI-03 keyboard — the auth surface's tab order, recorded", () => {
  // 60s rather than the default 30s, for `overflow-320.spec.ts`'s reason: every case waits on a route
  // the dev server may still be compiling, and one of them submits a form first.
  test.describe.configure({ timeout: 60_000 });

  for (const row of CASES) {
    test(`${row.caseName} — ${row.stops.length} stops, in order`, async ({ page }) => {
      if (row.viewport !== undefined) await page.setViewportSize(row.viewport);
      await arm(page, row);

      // ── THE UNFOCUSED BASELINE, taken BEFORE a key is pressed ─────────────────────────────────
      // Keyed by the SAME descriptor the walk produces, which is why both readings come out of one
      // projection in the shared helper: a descriptor computed one way here and another way there
      // would miss on every lookup and the difference check below would silently measure nothing.
      const candidates = await probeCandidateStops(page);
      const unfocused = new Map<string, Indicator>();
      for (const candidate of candidates) {
        if (!unfocused.has(candidate.descriptor)) {
          unfocused.set(candidate.descriptor, indicatorOf(candidate));
        }
      }

      const stops = await recordForwardWalk(page, row.caseName);

      // ── PART C (i) — T-15-25, ASSERTED BEFORE THE SEQUENCE ────────────────────────────────────
      // FIRST, deliberately. A token input that has become tabbable also changes the sequence, so
      // whichever assertion runs first is the one the reader sees — and "an array differs" is a
      // report that gets triaged as a stale declaration. See `expectTokenInputInert`'s header: this
      // ordering is the finding from mutation M-B, not a preference.
      //
      // ⚠ A NOTE 15-07 LEFT AND THIS FILE MUST KEEP, because without it the next reader re-opens a
      // closed question: the input's `tabIndex` IDL property reads `0`, which looks alarming and
      // means nothing. `0` is the default value on every `<input>` in the DOM; it is not an
      // author-supplied attribute and it does not put a hidden input into the tab order. What
      // settles the question is the WALK, not the property.
      if (row.hasResetToken === true) {
        expectTokenInputInert(candidates, row.caseName);
        expectTokenNeverFocused(stops, row.caseName, "forward");
      }

      // ONE `toEqual` OVER THE WHOLE ARRAY, not a per-stop loop. A loop reports "stop 4 differs" and
      // sends the reader counting; the array form prints both sequences side by side and shows an
      // INSERTED or REMOVED stop for what it is.
      expect(
        stops.map((s) => s.descriptor),
        `${row.caseName}: the recorded tab order is not the one this file declares. If the page is ` +
          "right and the declaration is stale, fix the declaration and say why in the summary — " +
          "never edit the page to make the sequence come true.",
      ).toEqual([...row.stops]);

      // ── PART A — AN INDICATOR ON EVERY STOP, not two per route ────────────────────────────────
      // `overflow-320.spec.ts` measures the first tab stop and the first in-surface control. That
      // answers "does this route have focus styles". This answers the question AUTHUI-03 actually
      // asks: does EVERY control a keyboard user can reach on this document draw something.
      stops.forEach((stop, i) => {
        const where = `${row.caseName} stop ${i + 1}/${stops.length} \`${stop.descriptor}\``;

        expect(
          stop.focusVisible,
          `${where}: the element has focus after a REAL Tab press but does not match ` +
            "`:focus-visible`, so DS-05's `focus-visible:*` recipe cannot apply to it. Every " +
            "indicator assertion below would be measuring the resting style.",
        ).toBe(true);

        expectRing(stop, where);
        expectIndicatorPaints(stop, where);

        const before = unfocused.get(stop.descriptor);
        expect(
          before,
          `${where}: this stop has no entry in the unfocused baseline, so the difference check has ` +
            "nothing to compare against. The stop projection and the candidate scan disagree about " +
            "the same element, which is a defect in the instrument, not in the page.",
        ).toBeDefined();
        expect(
          sameIndicator(indicatorOf(stop), before as Indicator),
          `${where}: the focused and unfocused readings are IDENTICAL — outline ` +
            `${stop.outlineStyle} ${stop.outlineWidth}, box-shadow ${stop.boxShadow}. Whatever is ` +
            "drawn here is drawn all the time, so it is decoration rather than an indicator: a " +
            "keyboard user cannot tell from it where focus is.",
        ).toBe(false);
      });

      // ── PART B — THE WORDMARK IS FIRST, AND KEEPS THE BROWSER DEFAULT ─────────────────────────
      // `(auth)/layout.tsx` makes this claim in prose: "The wordmark is the first tabbable element
      // on these documents and keeps the BROWSER-DEFAULT focus indicator. The DS-05 ring recipe is
      // for controls that override their own outline … this link overrides nothing, so adding a ring
      // here would be a new inconsistency dressed as a fix." These three assertions are that
      // paragraph, turned into something that can fail.
      const wordmark = stops[0];
      const wm = `${row.caseName} stop 1 (the wordmark)`;
      expect(
        wordmark.descriptor,
        `${wm}: the first tab stop on an auth document is not the layout's wordmark.`,
      ).toBe("a:FitOut@main");
      expect(
        wordmark.outlineStyle !== "none" && parseFloat(wordmark.outlineWidth) > 0,
        `${wm}: the browser-default focus ring is not being drawn — outline ` +
          `${wordmark.outlineStyle} ${wordmark.outlineWidth}. This link carries no DS-05 ring by ` +
          "design, so the UA outline is the ONLY indicator it has; suppressing it (an `outline-none` " +
          "in a later layer, a `cn()` precedence accident) leaves the first stop on every auth " +
          "document with nothing at all.",
      ).toBe(true);
      expect(
        /(^|\s)ring-/.test(wordmark.classes),
        `${wm}: the wordmark has grown a \`ring-\` utility (class="${wordmark.classes}"). This is ` +
          "deliberate absence, not an oversight — quoting `(auth)/layout.tsx`: \"The DS-05 ring " +
          "recipe is for controls that override their own outline … this link overrides nothing, so " +
          'adding a ring here would be a new inconsistency dressed as a fix." If the wordmark should ' +
          "get a ring, change the layout's argument first and this assertion second.",
      ).toBe(false);

      // ── PART D (i) — NO POSITIVE `tabindex` ANYWHERE ON THE DOCUMENT ──────────────────────────
      // A positive tabindex is the one construct that makes a written-down sequence unmaintainable:
      // it reorders the document without appearing anywhere IN the document's order, so the file
      // above would be wrong in a way reading the markup could not reveal. Zero of them is what
      // makes the declared sequences a fact about DOM order.
      expect(
        candidates
          .filter((c) => c.tabindex !== null && (c.tabindex as number) > 0)
          .map((c) => `${c.descriptor} tabindex=${c.tabindex}`),
        `${row.caseName}: an element carries a POSITIVE tabindex. It jumps the sequential order ` +
          "ahead of everything with tabindex 0, which is both a WCAG 2.4.3 focus-order smell and " +
          "the thing that would make every sequence declared in this file quietly wrong.",
      ).toEqual([]);

      // ── PART D (ii) — THE REVERSE WALK: no trap, and the order is symmetric ───────────────────
      // Run straight on from the forward walk: focus is now past the END of the document, so the
      // first Shift+Tab lands on the last stop. MEASURED across all seven cases before it was relied
      // on. A focus trap shows up here and nowhere else — forward, a trap looks like a walk that
      // ends; backward, it looks like a sequence that is not the mirror of the forward one.
      const rawReverse = await walkBackward(page);
      expect(
        rawReverse.length,
        `${row.caseName}: the reverse walk hit its ${WALK_BOUND}-press bound. Bounded so a focus ` +
          "trap reports as an assertion rather than a hang.",
      ).toBeLessThan(WALK_BOUND);
      const reverse = partitionAsserted(rawReverse, `${row.caseName} (reverse)`, "start");
      expect(
        reverse.map((s) => s.descriptor),
        `${row.caseName}: Shift+Tab does not retrace Tab. An asymmetric order is a focus trap, a ` +
          "positive tabindex, or a control that is reachable one way only — all three are defects " +
          "a forward-only walk cannot see.",
      ).toEqual([...stops.map((s) => s.descriptor)].reverse());

      // ── PART C (ii) — T-15-25 GOING BACKWARD, which is strictly more than 15-07 asserted ──────
      // 15-07 walked forward, once, ten presses. A control can be reachable one way only — that is
      // what a positive tabindex and a mis-ordered `tabindex=0` island both look like — so the
      // reverse pass is not a restatement of the forward one.
      if (row.hasResetToken === true) {
        expectTokenNeverFocused(reverse, row.caseName, "backward");
      }
    });
  }
});
