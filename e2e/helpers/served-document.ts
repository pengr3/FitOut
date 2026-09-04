// The seam that makes a STREAMED page's two states measurable without a stopwatch.
//
// WHY IT EXISTS, AND WHY IT IS A HELPER RATHER THAN TWO COPIES. Two specs need it — `shell.spec.ts`
// (AC#3's pending→resolved comparison, AC#5's checkout composition) and `overflow-320.spec.ts` (the
// checkout composition again, at 320px). Both depend on ONE string: the marker React writes when a
// `<Suspense>` boundary's real contents arrive. Two literals in two files are two things that drift,
// and here the drift is silent in the worst way — a marker that stops matching makes "pending" and
// "resolved" the SAME document, so every equality asserted over the pair passes against a page
// compared with itself. `src/app/dev/throw/page.tsx:70-78` records the identical argument for its own
// sentinel. One constant, one interceptor, one place to change.
//
// ── WHAT IT DOES, IN ONE PARAGRAPH ────────────────────────────────────────────────────────────────
// Next streams: the browser gets the shell — header, layout, every `<Suspense>` fallback — and then,
// on the same response, a series of `<div hidden id="S:n">…</div>` payloads plus the scripts that
// swap each one into place. Truncating the body at the FIRST of those payloads therefore yields the
// exact prefix the browser paints first, produced by the real server from the real request (cookies
// included — `route.fetch()` replays it). Nothing is mocked and nothing is timed.
//
// ── WHY NOT A DELAY, WHICH IS THE OBVIOUS SPELLING ───────────────────────────────────────────────
// MEASURED, not assumed. The session read these boundaries wait on is
// `auth.api.getSession({ headers: await headers() })`, called ON THE SERVER inside the boundary
// (`src/components/site/public-header.tsx:87`, and both group layouts). The browser issues ONE
// request — the document — so there is no session request to intercept, and delaying the document
// moves both states later by the same amount. On `/`, 17 August 2026: 106,723 bytes, first marker at
// 26,866; the prefix holds `AuthSlotSkeleton` and not the string "Log in", the whole document holds
// both.
//
// ── THE TWO PROPERTIES A CALLER MUST NOT FORGET ──────────────────────────────────────────────────
//   1. A TRUNCATED DOCUMENT DOES NOT HYDRATE — the bundle tags sit after the cut. That is correct for
//      geometry (it is the pre-hydration paint, which is exactly when a layout shift is visible), and
//      wrong for anything that needs an event handler.
//   2. `cut` MUST BE ASSERTED. If the marker is ever absent, this helper serves the full document in
//      both modes and says nothing about it. Callers assert `state.cut > 0` — see `expectTruncated`
//      in `shell.spec.ts`, which carries the vacuity argument in its failure message.

import type { Page } from "@playwright/test";

/** Every route these specs drive is served by the dev server Playwright boots on :3000. */
export const BASE_URL = "http://localhost:3000";

/**
 * React's first streamed-boundary COMPLETION segment.
 *
 * Everything before it is the shell with every fallback still in place; everything from it on
 * replaces a fallback with its resolved contents.
 */
export const COMPLETION_MARKER = '<div hidden id="S:';

export type TruncatorState = {
  /** Byte offset of the marker in the last document served, or `-1` when it was not found. */
  cut: number;
  /** The last document's full length, so a failure message can say "…in a N-byte document". */
  length: number;
};

export type Truncator = {
  /** Await this before the first `goto`, so the interceptor is installed. */
  readonly ready: Promise<unknown>;
  /** `true` serves the prefix (every boundary pending); `false` serves the whole document. */
  set(truncate: boolean): void;
  readonly state: TruncatorState;
};

/**
 * Install the document interceptor on `page`.
 *
 * Only `resourceType() === "document"` requests are rewritten; every asset, RSC payload and API call
 * continues untouched, which is what keeps the stylesheet and the fonts real.
 */
export function installTruncator(page: Page): Truncator {
  const state: TruncatorState & { truncate: boolean } = {
    truncate: true,
    cut: -1,
    length: 0,
  };
  const ready = page.route(`${BASE_URL}/**`, async (route) => {
    if (route.request().resourceType() !== "document") return route.continue();
    const response = await route.fetch();
    const body = await response.text();
    state.cut = body.indexOf(COMPLETION_MARKER);
    state.length = body.length;
    await route.fulfill({
      status: response.status(),
      headers: { "content-type": "text/html; charset=utf-8" },
      body: state.truncate && state.cut !== -1 ? body.slice(0, state.cut) : body,
    });
  });
  return {
    ready,
    set(truncate: boolean) {
      state.truncate = truncate;
    },
    state,
  };
}
