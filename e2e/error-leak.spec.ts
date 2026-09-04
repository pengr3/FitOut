import { expect, test, type Page } from "@playwright/test";

import { SENTINEL_LEAK_PROBE } from "../src/app/dev/throw/page";

// AC#20 / T-11-ERRLEAK — a boundary handed a REAL error whose text is a known sentinel produces a
// rendered document containing that sentinel ZERO times.
//
// This is the assertion `src/components/patterns/error-state.tsx` explicitly refuses to claim for
// itself. Its prop type says what the component CAN be handed; it says nothing about what the five
// boundaries actually hand it, and nothing at all about what the framework puts in the HTML around
// them. Only a rendered boundary in a real browser closes that gap.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE MEASUREMENT THAT CHANGED THIS SPEC — READ THIS BEFORE "TIGHTENING" THE ASSERTION
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// The plan prescribed: *"`page.content()` contains `SENTINEL_LEAK_PROBE` ZERO times."* Run verbatim
// against `next dev` on 17 August 2026 that assertion is FALSE, and it is false for a reason that has
// nothing to do with this application's code. Measured, verbatim, from the served document:
//
//   <script>self.__next_f.push([1,"b6:E{\"digest\":\"1030820611\",\"name\":\"Error\",
//   \"message\":\"SENTINEL_LEAK_PROBE\",\"stack\":[[\"DevThrowPage\",
//   \"C:\\Users\\Admin\\Roaming\\FitOut\\.next\\dev\\server\\chunks\\ssr\\[root-of-the-server]__…
//   .js\",102,11,0,0,false]]…
//
// One occurrence, inside a React Flight payload script — Next's DEV-ONLY error serialization, which
// feeds the development error overlay. Note what travels with it: an absolute filesystem path. That
// is precisely the disclosure class T-11-ERRLEAK names, and pretending not to have seen it would be
// worse than the leak.
//
// SO THE SAME PROBE WAS RUN AGAINST A PRODUCTION BUILD, which is where the claim actually has to
// hold. The throw affordance 404s in production by construction, so the guard was temporarily lifted
// and the route forced dynamic, `npx next build && npx next start -p 3100`, one request to
// `/dev/throw`. Measured:
//
//   bytes: 16915
//   SENTINEL_LEAK_PROBE count: 0
//   the entire flight error record: <script>self.__next_f.push([1,"16:E{\"digest\":\"3530324580\"}\n"])
//
// A digest and NOTHING ELSE. No message, no name, no stack, no path. React redacts server errors in
// production builds; the plan's prescribed zero-count is exactly true where it ships, and is untrue
// only under the development server this spec is obliged to run against. The guard was restored and
// `/dev/throw` re-verified as a 404 on a production build afterwards.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS SPEC THEREFORE ASSERTS, AND WHY EACH CLAUSE IS NOT THE OTHERS
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
//   1. REACHABILITY FIRST. `[data-testid="error-state"]` is visible. Every zero-count below passes
//      perfectly against a blank page, a 404 or a page that never threw — the `expectReachable`
//      idiom `scroll-area-overflow.spec.ts:215` exists for, and the failure mode five prescribed
//      probes in this phase have already been caught by.
//   2. THE REAL CLAIM: zero occurrences in the RENDERED document — the markup with `<script>`
//      elements and the development overlay's portal removed. This is "no server error text reaches
//      the DOM": not in text, not in an attribute, not in a title, not in a comment.
//   3. ZERO in `document.body.innerText`, separately. Clause 2 reads markup; this reads what a person
//      and a screen reader actually get. They are different strings and a leak could be in either.
//   4. CLOSURE, so clause 2's exclusion cannot silently widen: EVERY whole-document occurrence must
//      lie inside a `<script>` whose text begins with `self.__next_f`. A leak into a second channel —
//      a `<template>`, a data attribute, an inline handler, a future framework mechanism — is not
//      excluded by clause 2 and fails here. This is the assertion that keeps the dev-only carve-out
//      honest, and it is why the carve-out is written as a named channel rather than as "ignore
//      scripts".
//   5. POSITIVE CONTROL: the digest DOES render, as `Reference <hash>`. Without it, clause 2 is also
//      satisfied by a boundary that received no error at all — which is the difference between "we
//      render only the hash" and "we render nothing and call it safe".
//   6. BOTH ACTIONS, keyboard-reachable. T-11-DEADEND: retry covers a transient fault, the route out
//      covers a persistent one, and a boundary reachable only by mouse is a dead end for anyone who
//      cannot use one.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — 17 AUGUST 2026. GREEN IS 3 PASSED (chromium).
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// Command: `npx playwright test e2e/error-leak.spec.ts --project=chromium`
//
//   (a) THE LEAK, INJECTED. `<p>{error.message}</p>` added inside `src/app/error.tsx`'s boundary —
//      one interpolation, the exact defect this file exists to catch. **2 failed / 1 passed**,
//      verbatim:
//
//        1) the boundary renders and no server error text reaches the DOM
//           Error: the rendered document contains the thrown error's text. … This figure EXCLUDES
//           the framework's dev-only flight scripts …
//           expect(received).toBe(expected) // Object.is equality
//           Expected: 0
//           Received: 1
//
//        2) every whole-document occurrence is confined to the dev-only flight channel
//           Error: the sentinel appears somewhere outside the framework's dev-only flight payload. …
//           expect(received).toBe(expected) // Object.is equality
//           Expected: 1   ← the framework's own record
//           Received: 2   ← plus ours
//
//      …and `npx vitest run --config vitest.design.config.ts tests/design/error-boundaries.test.ts`
//      failed in the SAME tree, naming the file and the line:
//      `+ [ "src/app/error.tsx:100 error.message" ]`. TWO layers, one edit, and neither can
//      substitute for the other — the source gate cannot see a rendering and this spec cannot see
//      the other four boundaries. Reverted → 3 passed here, 17 passed there.
//
//      Note which clause did NOT fire: the third test's two-action and digest assertions stayed
//      green, because a leak does not remove an action. Three tests, three different claims.
//
//   (b) VACUITY. The spec was pointed at `/dev/throw-nope`, a route that does not exist. **3 failed
//      / 0 passed**, and every failure is the reachability guard rather than a zero-count:
//
//        Error: /dev/throw-nope rendered NO [data-testid="error-state"]. Every zero-count in this
//        file passes vacuously against a page that never threw, so this is a failure, not a skip.
//        expect(locator).toBeVisible() failed
//        Error: element(s) not found
//
//      Without clause 1, all three zero-counts would have reported GREEN against a 404 page — and
//      clause 4's equality would have compared zero with zero, which is why the "the channel really
//      did carry it" assertion exists underneath it. That is the scan-of-nothing failure mode this
//      phase has now recorded six times. Reverted → 3 passed.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//   • ONE BOUNDARY, ONE ROUTE, ONE MESSAGE SHAPE. This drives `src/app/error.tsx` only. That the
//     other four boundaries and `global-error.tsx` are built the same way is asserted at the source
//     level by `tests/design/error-boundaries.test.ts`, which reads structure and cannot see a
//     rendering. Name each other's coverage: neither is sufficient, and the pairing is the point.
//   • IT CANNOT PROVE A *SERVER* ERROR'S TEXT NEVER REACHES ANY SURFACE. A server action that
//     returns `err.message` in a JSON response, a log shipped to a browser-visible console, an
//     email — all outside this instrument entirely.
//   • THE PRODUCTION NUMBER IS A RECORDED MEASUREMENT, NOT AN ASSERTION. It cannot be re-run from
//     here: the throw affordance 404s in production, which is T-11-THROWROUTE working. If React ever
//     stops redacting, this spec will not notice. Re-run the measurement in the header on any major
//     framework upgrade; that instruction is the mitigation.
//   • It says nothing about whether the boundary looks right. Plan 11-22 baselines these surfaces.

/** The route whose whole purpose is to throw. Dev-only: it returns 404 in a production build. */
const PAGE = "/dev/throw";

/** The framework's dev-only error carrier, named rather than described — see clause 4. */
const FLIGHT_CHANNEL_PREFIX = "self.__next_f";

function occurrences(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * Clause 1. Assert the page rendered the thing under test before asserting anything about it.
 *
 * A spec that greps a blank page for a string passes perfectly, and so does one pointed at a 404.
 * This runs FIRST and its message says so, because the failure it prevents is a green run.
 */
async function expectReachable(page: Page) {
  await expect(
    page.getByTestId("error-state"),
    `${PAGE} rendered NO [data-testid="error-state"]. Every zero-count in this file passes ` +
      "vacuously against a page that never threw, so this is a failure, not a skip.",
  ).toBeVisible();
}

/**
 * The document split into what a person receives and what the framework's dev instrumentation
 * carries, measured in the page rather than reconstructed from a string.
 *
 * `<script>` contents and the development overlay's custom element are removed from `rendered`; both
 * are counted separately in `inFlightScripts` so nothing goes missing between the two figures.
 */
async function readDocument(page: Page) {
  return page.evaluate((prefix) => {
    const clone = document.documentElement.cloneNode(true) as HTMLElement;
    let scriptText = "";
    let flightText = "";
    for (const el of Array.from(clone.querySelectorAll("script"))) {
      const text = el.textContent ?? "";
      scriptText += text;
      if (text.trimStart().startsWith(prefix)) flightText += text;
      el.remove();
    }
    // The dev overlay renders inside a custom element with a shadow root; its contents are not in
    // `outerHTML` anyway, but the host element is removed so the figure means what it says.
    for (const el of Array.from(clone.querySelectorAll("nextjs-portal"))) el.remove();
    return {
      whole: document.documentElement.outerHTML,
      rendered: clone.outerHTML,
      scriptText,
      flightText,
      innerText: document.body.innerText,
    };
  }, FLIGHT_CHANNEL_PREFIX);
}

test.describe("AC#20 — no server error text reaches the DOM", () => {
  test("the boundary renders and no server error text reaches the DOM", async ({ page }) => {
    await page.goto(PAGE);
    await expectReachable(page);

    const doc = await readDocument(page);

    // Clause 2 — THE REAL CLAIM.
    expect(
      occurrences(doc.rendered, SENTINEL_LEAK_PROBE),
      "the rendered document contains the thrown error's text. Server error text carries table " +
        "names, file paths and connection strings; only `digest` may cross (T-11-ERRLEAK). This " +
        "figure EXCLUDES the framework's dev-only flight scripts, which is measured and argued in " +
        "this file's header — it does not exclude anything this application renders.",
    ).toBe(0);

    // Clause 3 — the string a person and a screen reader actually receive.
    expect(
      occurrences(doc.innerText, SENTINEL_LEAK_PROBE),
      "the visible text of the error page contains the thrown error's message",
    ).toBe(0);
  });

  test("every whole-document occurrence is confined to the dev-only flight channel", async ({
    page,
  }) => {
    await page.goto(PAGE);
    await expectReachable(page);

    const doc = await readDocument(page);
    const whole = occurrences(doc.whole, SENTINEL_LEAK_PROBE);
    const inFlight = occurrences(doc.flightText, SENTINEL_LEAK_PROBE);
    const inScripts = occurrences(doc.scriptText, SENTINEL_LEAK_PROBE);

    // Clause 4 — CLOSURE. Not "ignore scripts": every occurrence anywhere in the document must be
    // inside the ONE named channel. A leak into a second script kind, a template, an attribute or a
    // future framework mechanism fails here even though clause 2 might not see it.
    expect(
      whole,
      "the sentinel appears somewhere outside the framework's dev-only flight payload. That payload " +
        `(scripts beginning "${FLIGHT_CHANNEL_PREFIX}") is React's development error serialization ` +
        "and is redacted to a bare digest in a production build — measured, see the header. Any " +
        "other carrier is this application's, and is a leak.",
    ).toBe(inFlight);
    expect(inScripts, "a script carried it that is not the flight channel").toBe(inFlight);

    // …and the channel really did carry it, so the equality above is not two zeros agreeing. This is
    // what makes the clause a measurement rather than a tautology: under `next dev` the framework
    // DOES serialize the message, and that is the fact the production measurement is contrasted with.
    expect(
      inFlight,
      "the development server did not serialize the error message at all, which means this clause " +
        "compared zero with zero and proved nothing. Either the run is against a production build " +
        "(where the affordance 404s) or the framework changed — re-run the header's measurement.",
    ).toBeGreaterThan(0);
  });

  test("offers two actions, both keyboard-reachable", async ({ page }) => {
    await page.goto(PAGE);
    await expectReachable(page);

    const panel = page.getByTestId("error-state");
    const retry = panel.getByRole("button", { name: "Try again" });
    const routeOut = panel.getByRole("link", { name: "Back to search" });

    // T-11-DEADEND. Two actions, always: retry for a transient fault, a route out for a persistent
    // one. `ErrorState.routeOut` is a required prop, so a one-button boundary does not compile —
    // this is the rendered half of that same guarantee.
    await expect(retry).toBeVisible();
    await expect(routeOut).toBeVisible();
    await expect(routeOut).toHaveAttribute("href", "/");

    // Clause 5 — POSITIVE CONTROL. The boundary really was handed an error, and chose the hash.
    await expect(
      panel.getByText(/^Reference \S+$/),
      "the boundary rendered no digest, so the zero-counts above are also satisfied by a boundary " +
        "that received nothing at all",
    ).toBeVisible();

    // Keyboard reachability, measured by focusing rather than asserted from markup.
    await retry.focus();
    await expect(retry).toBeFocused();
    await routeOut.focus();
    await expect(routeOut).toBeFocused();
  });
});
