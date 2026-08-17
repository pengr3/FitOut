// SHELL-04 — the ONE place an Open Graph card is turned into an HTTP response, and the one place the
// two committed font binaries are read.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS FILE EXISTS AT ALL: `new ImageResponse(...)` CANNOT FAIL SAFELY BY ITSELF
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// `next/og`'s `ImageResponse` extends `Response`, and its body is a `ReadableStream` whose `start()`
// is what actually runs satori. Read `node_modules/next/dist/server/og/image-response.js`: the
// constructor returns immediately, having already committed the status line and the headers, and the
// render happens LATER inside the stream. So a route that does
//
//     return new ImageResponse(<Card />, size)     // ← the shape every tutorial shows
//
// has no way to catch a satori failure: by the time the throw happens the response is already on the
// wire, and what the client receives is a truncated body under a 200, or a framework-level 500,
// depending on how far the stream got. A `try`/`catch` around that expression catches nothing,
// because nothing has been rendered yet when it returns.
//
// `renderOgCard` below therefore AWAITS the bytes (`.arrayBuffer()`) before it commits to anything,
// and hands back a fresh `Response` built from those bytes. That is the only shape in which "this
// route never returns non-2xx" is a property rather than an intention (T-11-OG5XX).
//
// A 500 on an unfurl is a uniquely bad failure: no card appears, nothing is logged on the sharer's
// side, and it is discovered only by a person pasting a link into a chat and seeing a bare URL. It
// degrades silently, in someone else's product, weeks after the deploy that broke it.
//
// ── THREE RUNGS, EACH WITH A SMALLER FAILURE SURFACE THAN THE ONE ABOVE IT ────────────────────────
//
//   1. the route's own card, painted with the two committed Geist binaries;
//   2. the route's fallback card, rendered with NO `fonts` option — which makes satori fall back to
//      the Geist Regular that `next/og` already ships inside `node_modules`
//      (`next/dist/compiled/@vercel/og/Geist-Regular.ttf`, 125,956 bytes). Rung 2 therefore shares
//      no I/O with rung 1: it reads no file this repository owns;
//   3. `BLANK_PNG` — a 1×1 transparent PNG constant. It is a poor card and a fine response: a valid
//      `image/png` under a 200. The alternative at this rung is a 5xx, which the must-have forbids,
//      and the trade (a broken-looking thumbnail vs. no card at all) is recorded here rather than
//      left to be rediscovered. Rung 3 can only be reached if the OG runtime itself is broken.
//
// ── WHY THE FALLBACK CARD MUST NOT NAME A FONT FAMILY ─────────────────────────────────────────────
//
// Rung 2 passes no `fonts`, so the only family loaded is whatever `@vercel/og` registers its bundled
// binary under. A `fontFamily` naming ours would be a family satori has not been given. Measured
// rather than assumed (probe C below): satori falls back to the first available font instead of
// throwing — so this is a legibility note, not a correctness cliff. Fallback cards here set no
// `fontFamily`.
//
// ═════════════════════════════════════════════════════════════════════════════════════════════════
// THE RUNGS, WATCHED FIRING (17 August 2026, `next dev`, Next 16.2.7). NONE IS ARGUED.
// ═════════════════════════════════════════════════════════════════════════════════════════════════
//
// A guard that has never been seen catching anything is a comment. Each probe was applied, measured,
// and reverted; `git status` was clean afterwards.
//
//   (A) RUNG 2 — the font read fails. `readFile(fileURLToPath(url))` → `readFile(… + ".probe-missing")`,
//       which fails at RUNTIME rather than at module resolution (renaming the source `.ttf` would
//       fail the Turbopack asset lookup instead, i.e. it would test the bundler, not this code):
//
//         [og] card failed, serving the fallback: ENOENT: no such file or directory, open
//         '…\.next\dev\server\assets\Geist-Regular.40nwhrotoqrlc.ttf.probe-missing'
//         GET /listings/seed_listing_1/opengraph-image  →  200 image/png  25,149 B  1200 × 630
//         GET /opengraph-image                          →  200 image/png  25,149 B  1200 × 630
//
//       Both routes answered 200 with a legible card. The two byte counts being EQUAL is the second
//       finding: the listing route's fallback and the root card are the same card, so a reader
//       cannot tell which route degraded.
//
//   (B) RUNG 3 — the fallback card itself fails. Probe A still applied, plus a `throw` where rung 2
//       renders:
//
//         [og] fallback card failed, serving a blank card: probe B: the fallback card itself failed
//         GET /listings/seed_listing_1/opengraph-image  →  200 image/png  70 B  1 × 1
//
//       70 bytes, PNG magic `89504e470d0a1a0a`, IHDR 1 × 1. Not a good card; not a 500 either.
//
//   (C) THE `fontFamily` CLAIM ABOVE. Probe A applied and the root card's FALLBACK switched to
//       `withFont` — i.e. naming "Geist" while satori has been given no `fonts` at all:
//
//         GET /opengraph-image  →  200 image/png  25,149 B
//
//       Byte-identical to the no-`fontFamily` fallback. Satori resolves an unknown family to the
//       first available font rather than throwing, which is why the rule above is a legibility note.
//
//   Not probed, and it is a real hole: a SYNTAX ERROR in this module (or in a route that imports it)
//   is a 500, because the route never loads at all. Observed by accident while writing this file —
//   a `**/` inside a block comment closed the comment early, and the route answered 500 with a
//   Turbopack parse error. Nothing in a route can guard against its own module failing to parse;
//   `npm run build` is what catches that.
//
// ── WHAT IS DELIBERATELY NOT IN THIS FILE ─────────────────────────────────────────────────────────
//
// No colours and no layout. Every card's paint lives in its own `opengraph-image.tsx`, which imports
// `THEME_TOKENS` and reads hex values from it, because satori resolves no CSS custom properties and
// parses no `oklch()`. A shared card component here would take that import — and with it the thing
// `tests/design/og-routes.test.ts` asserts per route — out of the routes themselves.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { ImageResponse } from "next/og";
import type { ReactElement } from "react";

/** Every FitOut share card, at the size every scraper expects (1200 × 630, the 1.91:1 ratio). */
export const OG_SIZE = { width: 1200, height: 630 } as const;

/** The `contentType` every OG route re-exports. `next/og` renders PNG and nothing else. */
export const OG_CONTENT_TYPE = "image/png";

/**
 * The family name the two committed binaries are registered under, and the ONLY string a card's
 * `fontFamily` may name. Shared so a card and the loader cannot disagree about it — a mismatch is
 * not a crash, it is a card that silently renders in a different face.
 */
export const OG_FONT_FAMILY = "Geist";

/** What satori is handed for each weight. `ArrayBuffer` is what `next/og` accepts for `data`. */
type LoadedFont = {
  readonly name: string;
  readonly data: ArrayBuffer;
  readonly weight: 400 | 600;
  readonly style: "normal";
};

/**
 * The two font binaries, read once per server process.
 *
 * `next/font/google` exposes no buffer — it emits CSS and a `woff2`, and satori reads neither CSS
 * nor `woff2` — so the renderer needs its own copy of the family the app already ships. The two
 * binaries are committed under `src/app/fonts/` and referenced through
 * `new URL(..., import.meta.url)`, which is the form Turbopack rewrites into an EMITTED ASSET: at
 * runtime the URL points at `.next/<build>/server/assets/Geist-Regular.<hash>.ttf`, not at `src/`.
 * That indirection is what makes the read survive a production build, where this module runs from
 * `.next/` and `src/` may not be deployed at all.
 *
 * ⚠ THE OFFICIALLY DOCUMENTED SPELLING OF THIS DOES NOT WORK ON THE NODE RUNTIME, AND FAILS QUIETLY.
 * Next's own `opengraph-image` docs (and this plan's own instructions) say to load the buffer with
 *
 *     fetch(new URL("./Geist-Regular.ttf", import.meta.url)).then((r) => r.arrayBuffer())
 *
 * Measured here on Next 16.2.7 / Node 24, dev and production build alike: `new URL(...)` resolves to
 * a `file://` URL, and Node's `fetch` (undici) does not implement the `file:` scheme. The call
 * rejects with the maximally unhelpful message `fetch failed`, the custom fonts never load, and —
 * without the fallback rung in this file — the card renders in the wrong face or not at all. The
 * probe, verbatim:
 *
 *     [og][probe] font url: file:///C:/…/.next/dev/server/assets/Geist-Regular.40nwhrotoqrlc.ttf
 *     [og] card failed, serving the fallback: fetch failed
 *
 * So the URL is kept (it is what makes the asset be emitted and hashed) and the READ is done with
 * `fs.readFile`, which is a filesystem path away and has no scheme opinions.
 *
 * MEMOISING A REJECTED PROMISE WOULD POISON THE ROUTE FOR THE LIFETIME OF THE PROCESS — one
 * transient failure and every later request falls to rung 2 forever, with no way back but a restart.
 * So the slot is cleared on failure and the next request retries.
 */
let fontsPromise: Promise<LoadedFont[]> | null = null;

async function readFont(url: URL, weight: 400 | 600): Promise<LoadedFont> {
  const bytes = await readFile(fileURLToPath(url));
  if (bytes.byteLength === 0) throw new Error(`font read returned 0 bytes: ${url.pathname}`);
  // A Node Buffer is a VIEW over a pooled ArrayBuffer, so handing satori `bytes.buffer` would hand
  // it every other small allocation sharing that pool. Slice to this buffer's own window.
  const data = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return { name: OG_FONT_FAMILY, data, weight, style: "normal" };
}

function loadFonts(): Promise<LoadedFont[]> {
  fontsPromise ??= Promise.all([
    readFont(new URL("./fonts/Geist-Regular.ttf", import.meta.url), 400),
    readFont(new URL("./fonts/Geist-SemiBold.ttf", import.meta.url), 600),
  ]).catch((error: unknown) => {
    fontsPromise = null;
    throw error;
  });
  return fontsPromise;
}

/**
 * A 1×1 transparent PNG — rung 3. Base64 rather than a generated buffer so this constant costs no
 * code path of its own: the rung that exists for "the renderer is broken" must not itself be able
 * to break. Decoded and asserted to be a valid 1×1 PNG in `tests/design/og-routes.test.ts`.
 */
const BLANK_PNG = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
  "base64",
);

/**
 * The response headers every rung answers with, so a scraper cannot tell the rungs apart by cache
 * behaviour. Values match what `next/og` sets for itself (`image-response.js`), which is what these
 * routes would have sent had they returned the `ImageResponse` directly.
 */
function ogHeaders(): Headers {
  return new Headers({
    "content-type": OG_CONTENT_TYPE,
    "cache-control":
      process.env.NODE_ENV === "development"
        ? "no-cache, no-store"
        : "public, max-age=0, must-revalidate",
  });
}

/** Render to BYTES before committing to a response. See this file's header for why that matters. */
async function toBufferedResponse(image: Response): Promise<Response> {
  const body = await image.arrayBuffer();
  if (body.byteLength === 0) throw new Error("the image renderer produced 0 bytes");
  return new Response(body, { status: 200, headers: ogHeaders() });
}

/**
 * Render a share card, and never answer with anything but a 2xx `image/png`.
 *
 * `primary` and `fallback` are FACTORIES rather than elements because building the primary card can
 * itself throw — a listing lookup that fails is the ordinary case, not an exotic one — and a factory
 * lets that failure be caught by the same guard that catches a render failure.
 *
 * The error MESSAGE is logged and the error OBJECT is not. The invite route's card is constant and
 * reads no token, so there is nothing token-shaped in scope here; keeping the log to a message is
 * what makes that true by construction rather than by inspection of whatever a stack happens to
 * carry (D-118 — the invite token is never logged, on any path).
 */
export async function renderOgCard(
  primary: () => ReactElement | Promise<ReactElement>,
  fallback: () => ReactElement,
): Promise<Response> {
  try {
    const [element, fonts] = await Promise.all([primary(), loadFonts()]);
    return await toBufferedResponse(new ImageResponse(element, { ...OG_SIZE, fonts }));
  } catch (error: unknown) {
    console.error(`[og] card failed, serving the fallback: ${messageOf(error)}`);
    try {
      // No `fonts`: rung 2 deliberately depends on nothing this repository ships.
      return await toBufferedResponse(new ImageResponse(fallback(), { ...OG_SIZE }));
    } catch (fallbackError: unknown) {
      console.error(`[og] fallback card failed, serving a blank card: ${messageOf(fallbackError)}`);
      return new Response(BLANK_PNG, { status: 200, headers: ogHeaders() });
    }
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
