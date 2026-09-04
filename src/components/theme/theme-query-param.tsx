"use client";

// D-08's second override path: `?theme=grove` honoured OUTSIDE production only.
//
// This exists so a reviewer can walk a REAL booking or hosting flow in grove — the whole point of a
// placeholder brand direction is that it gets judged on real screens, not on swatches. Renders null;
// it is an effect with a DOM presence of nothing.
//
// THE THREAT (T-10-02, ASVS V5). A query string is attacker-controllable input, and the value it
// carries ends up as `data-theme` on `document.documentElement`. So it is checked for MEMBERSHIP of
// the THEMES allowlist with `.includes()` before it is written anywhere. It is never cast with `as`,
// and never interpolated into a selector or a string. A cast is exactly what let sonner.tsx:8 ship a
// type lie for the whole life of this project: `theme as ToasterProps["theme"]` told the compiler the
// value was `light | dark | system` while the runtime value was the literal string "court". A cast
// silences the checker; it does not make the value safe.
//
// SECOND GUARD: the effect returns immediately in production. `process.env.NODE_ENV` is a build-time
// constant the bundler inlines, so the whole body is pruned from the production bundle rather than
// merely skipped at runtime. It is deliberately not an operator-settable env var — an env var can be
// flipped on a live deploy, a build-time constant cannot.
//
// WHY `window.location.search` AND NOT NEXT'S SEARCH-PARAMS HOOK: this component mounts in the ROOT
// layout, and root layouts receive no `searchParams` prop in the App Router. The hook would force
// every route to render dynamically or require a Suspense boundary — a real cost, paid on every page
// of the app, for an affordance that does not even exist in production. Reading
// `window.location.search` inside an effect sidesteps both, at the cost of one post-hydration frame
// that only a reviewer ever sees. (The hook is not spelled with its literal identifier anywhere in
// this file because its absence here is asserted by a grep.)

import { useEffect } from "react";
import { useTheme } from "next-themes";

import { THEMES } from "@/components/theme/theme-provider";

export function ThemeQueryParam() {
  const { setTheme } = useTheme();

  useEffect(() => {
    if (process.env.NODE_ENV === "production") return;

    const requested = new URLSearchParams(window.location.search).get("theme");
    // Allowlist membership, never a cast — the value reaches a DOM attribute.
    if (requested && (THEMES as readonly string[]).includes(requested)) {
      // Written through setTheme() rather than touching the attribute directly, so the query-param
      // path and the storage path agree and a reload keeps showing what the reviewer asked for.
      setTheme(requested);
    }
  }, [setTheme]);

  return null;
}
