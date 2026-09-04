// `global-error.tsx` — THE ONE SURFACE A THEME CANNOT REACH (11-UI-SPEC § global-error.tsx).
//
// This file is what renders when `src/app/layout.tsx` itself throws. Next documents the consequence
// outright: it replaces the root layout, so it must render its OWN `<html>` and `<body>`, and it
// receives NONE of the app's global styles. Everything unusual below follows from that one fact,
// and none of it is a stylistic preference.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// NO UTILITY CLASSES ANYWHERE — THE STYLESHEET THAT WOULD DEFINE THEM IS NOT LOADED
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// A utility class here is not "a different way to write the same thing"; it is a string that names
// nothing, and the page paints as unstyled HTML. So every declaration is an inline style object, and
// `tests/design/global-error.test.ts` asserts the count of class attributes in this file is zero —
// because the failure mode of getting this wrong is invisible until the day the root layout breaks,
// which is precisely the day nobody wants to be finding out.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// EVERY COLOUR COMES FROM `THEME_TOKENS.court`, AND THIS IS *WHY* THAT MODULE EXISTS
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `src/lib/design/tokens.generated.ts`'s own header names this exact use case verbatim — *"a
// document-level error page that renders before the stylesheet … They need a literal — and a literal
// typed by hand drifts."* This is the sanctioned duplicate DS-12 / D-18 exists for. Not one colour
// is typed here; each is read from the generated module, which is byte-compared against
// `globals.css` on every test run, so this page cannot show a colour the product no longer uses.
//
// The DS-13 leak gate already scans `src/app/**`, so a hand-typed colour in this file fails the
// build TODAY, without a new assertion. That is half of the falsifiability paid for in advance; the
// half the new gate adds is that the module is actually IMPORTED, which is the only legal way this
// document can have a colour at all.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// COURT, UNCONDITIONALLY — RECORDED AS DATA RATHER THAN AS SILENCE
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The theme switcher sets a `data-theme` attribute on the app's document. This page IS a different
// document — it renders its own `<html>` — so that attribute has never been set when this code runs,
// and there is no request-time signal to read either. Painting in grove is therefore not an omission
// that could be fixed by trying harder; it is impossible by construction.
//
// CONSEQUENCE FOR PLAN 11-22, stated here so that plan does not have to rediscover it: `global-error`
// is the SINGLE baselined surface EXCLUDED from the theme-swap smoke. That gate's whole premise is
// `court.png !== grove.png` — an identical pair normally means a surface ignored the tokens — and
// here an identical pair is CORRECT. The exclusion must be carried in the `EXCLUDED_PAIRS` idiom, as
// data with this reason attached, never as a baseline that is quietly absent. An absent baseline and
// an argued exclusion look the same in a green run, and only one of them is a decision.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// FONT, LINK AND CHROME
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// FONT: a system stack literal. Geist is loaded by the root layout as a CSS custom property, and
// that property is not defined in this document — referencing it would fall back to the browser
// default silently. A font stack is also not a DS-13 pattern: that gate bans hex, colour functions
// and arbitrary px type sizes, and a family list is none of the three. This is the one design value
// in this file that is written by hand, and it is written by hand because there is nothing to read
// it from.
//
// LINK: a plain anchor, not the framework's client-side link component. The client router lives
// inside the tree that just failed; a routing transition here is a request to re-enter it. A full
// document load is the point, not a regression.
//
// MEASURED, AND IT COSTS ONE DISABLE. `npm run lint` fails this file on
// `@next/next/no-html-link-for-pages` — *"Do not use an `<a>` element to navigate to `/`"* — which
// is an ergonomics rule written for pages whose router works. It is disabled by name on the single
// line that needs it, with the reason beside it, rather than by widening the ESLint config: a
// config-level exemption would silently cover the whole file (and the next file added to the same
// glob), and this is a one-line exception with a one-line argument.
//
// NO HEADER AND NO FOOTER. Both are app components carrying utility classes that do not exist here,
// and both are compositions that belong to a working shell. The two actions are the whole surface.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// IT REACHES NO DATABASE, AND THAT IS A BUILD PROPERTY, NOT A STYLE POINT
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The generated token module is the only import besides React's type. It imports nothing else and
// reaches nothing else. `/_not-found` is prerendered today, so a style-less document that reached
// the persistence layer on a prerenderable path would make `next build` try to open a connection —
// which is CI job 1's DB-free property gone, the job that exists to prove the app builds with no
// infrastructure. Falsified in the working direction: the build was re-run with an unreachable
// database URL with this file in the tree and exited 0, route table unchanged.
//
// ══════════════════════════════════════════════════════════════════════════════════════════════════
// KNOWN GAP, RECORDED RATHER THAN QUIETLY LEFT: THIS DOCUMENT HAS NO `<title>`
// ══════════════════════════════════════════════════════════════════════════════════════════════════
//
// The root layout's title template cannot reach this document any more than its stylesheet can, and
// a client component cannot export metadata. WCAG 2.4.2 (Level A) wants a titled page. It is NOT
// invented here because Next assembles the head for this file and the only honest way to choose
// between the available spellings is to render one and look — which needs a forced root-layout
// failure that no test in this repository can currently produce. Written up in `deferred-items.md`
// for plan 11-22, which is the plan that will have this surface in a real browser.
//
// TODO(next@16.3): retry()
// `next@16.2.7`'s `ErrorInfo` is `{ error: Error; reset: () => void; unstable_retry: () => void }`;
// a bare `retry` does not exist at this version. "Reload" is bound to `reset()` for the same reason
// the five route boundaries bind "Try again" to it — see `src/app/error.tsx`.

"use client";

import type { CSSProperties } from "react";

import { THEME_TOKENS } from "@/lib/design/tokens.generated";

/** The only theme this document can have. See the header — this is a fact, not a default. */
const COURT = THEME_TOKENS.court;

/**
 * The one design value written by hand in this file, and the reason is in the header: there is no
 * custom property to read it from, and a family list is not a DS-13 pattern.
 */
const SYSTEM_FONT_STACK =
  'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

const PAGE: CSSProperties = {
  margin: 0,
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  backgroundColor: COURT["--background"].hex,
  color: COURT["--foreground"].hex,
  fontFamily: SYSTEM_FONT_STACK,
  lineHeight: 1.5,
};

const PANEL: CSSProperties = {
  width: "100%",
  maxWidth: "32rem",
  textAlign: "center",
};

const TITLE: CSSProperties = {
  margin: 0,
  fontSize: "1.5rem",
  fontWeight: 600,
  letterSpacing: "-0.01em",
  color: COURT["--foreground"].hex,
};

const BODY_TEXT: CSSProperties = {
  margin: "8px auto 0",
  maxWidth: "40ch",
  fontSize: "0.875rem",
  color: COURT["--muted-foreground"].hex,
};

const ACTIONS: CSSProperties = {
  marginTop: "20px",
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  justifyContent: "center",
  gap: "8px",
};

/** Both actions share a 44px minimum touch target — the same floor the app's buttons carry. */
const ACTION_BASE: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "0 16px",
  borderRadius: "10px",
  borderWidth: "1px",
  borderStyle: "solid",
  fontSize: "0.875rem",
  fontWeight: 500,
  textDecoration: "none",
  cursor: "pointer",
};

/** Action 1 — the retry, in court's neutral fill. */
const RELOAD: CSSProperties = {
  ...ACTION_BASE,
  backgroundColor: COURT["--secondary"].hex,
  color: COURT["--secondary-foreground"].hex,
  borderColor: COURT["--border"].hex,
};

/** Action 2 — the route out, outlined, matching the five route boundaries' second action. */
const ROUTE_OUT: CSSProperties = {
  ...ACTION_BASE,
  backgroundColor: COURT["--background"].hex,
  color: COURT["--foreground"].hex,
  borderColor: COURT["--border"].hex,
};

const REFERENCE: CSSProperties = {
  marginTop: "16px",
  fontSize: "0.75rem",
  fontVariantNumeric: "tabular-nums",
  color: COURT["--muted-foreground"].hex,
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  // The SAME rule as the five route boundaries: the opaque hash crosses and nothing else does. There
  // is no shared pattern to enforce it here — this document cannot render one — so the rule is
  // enforced by this being the only line that touches the error object at all.
  const digest = (error as Error & { digest?: string }).digest;

  return (
    <html lang="en">
      {/* No live-region role: a document that IS the error announces nothing by changing, because
          there is no earlier state for it to have changed from. The heading is the announcement. */}
      <body style={PAGE}>
        <main style={PANEL}>
          <h1 style={TITLE}>FitOut hit an unexpected error</h1>
          <p style={BODY_TEXT}>
            The page couldn&apos;t load. Reloading usually fixes it — if it doesn&apos;t, come back
            in a few minutes.
          </p>
          <div style={ACTIONS}>
            <button type="button" onClick={reset} style={RELOAD}>
              Reload
            </button>
            {/* THE PLAIN ANCHOR IS THE POINT, AND IT COSTS ONE NARROW DISABLE — see the header's
                LINK section for the measurement. `@next/next/no-html-link-for-pages` is an
                ergonomics rule that assumes a working client router; here the router is inside the
                tree that just threw, and a full document load is the recovery. The disable names
                exactly that one rule on exactly this one line, so it exempts nothing else — in
                particular NOT the DS-13 leak rule, whose exemption comments carry its own rule id
                (`tests/design/leak.test.ts:199`), which is why this line is still scanned for raw
                design values. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={ROUTE_OUT}>
              Back to FitOut
            </a>
          </div>
          {digest ? <p style={REFERENCE}>Reference {digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
