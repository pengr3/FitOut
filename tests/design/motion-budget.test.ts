// DS-04 — the motion budget, and the one global rule that honours a user who has asked for less
// of it. Plus the stylesheet half of DS-05.
//
// THE CAP, STATED HERE BECAUSE THIS IS WHERE THE NEXT READER WILL LOOK FOR IT:
//
//   No transition or enter/exit animation exceeds 320ms. CONTINUOUS LOADING INDICATORS
//   (`animate-spin`, `animate-pulse`) ARE EXEMPT BY DESIGN — a progress indicator's cycle is meant
//   to repeat, so capping it would be capping the wrong thing — and they are covered by the
//   reduced-motion reset instead.
//
// That exemption is not a loophole, it is what makes the cap testable at all: without it the
// budget test fails on the spinner and the only way to make it green is to weaken it.
//
// WHY THE RESET IS ASSERTED STRUCTURALLY, `!important` AND ALL. The tempting implementation is to
// redefine the motion tokens inside the media query. It passes any test that only reads token
// values, and it is wrong: it reaches utilities that read those variables and misses every
// KEYFRAME animation, so transitions stop while dialogs still zoom and slide. That is why this file
// asserts the presence of the universal `!important` rule and of `animation-iteration-count`
// specifically — the property no token-only implementation would ever produce. The claim that the
// reset actually silences a real Radix animation with the OS setting on is a HUMAN check, in the
// phase's verification plan; nothing reachable from a DB-free unit test can make it.
//
// NOT COVERED — real blind spots:
//   • This proves the tokens are inside the budget and the reset exists. It cannot see a component
//     that hardcodes `duration-500`; that is the leak gate's and the reviewer's job.
//   • It cannot prove the reset WINS the cascade in a browser. `!important` in a base layer beats
//     unweighted utility declarations, which is the whole argument, but only a real paint settles
//     it — see the human check above.
//   • `animate-spin` and `animate-pulse` are deliberately outside the cap. A genuinely runaway
//     continuous animation would not be caught here.

import { readFileSync } from "node:fs";

import { describe, it, expect } from "vitest";

import { readGlobalTokens, GLOBALS_CSS_PATH } from "./helpers/compile-css";

/** The cap, in milliseconds. Every named duration must sit at or below it. */
const MOTION_CAP_MS = 320;

/** The three named durations, in the order they must ascend. */
const DURATIONS = ["--motion-fast", "--motion-base", "--motion-slow"] as const;

/** Every property the reset must set, each with `!important`. */
const RESET_DECLARATIONS = [
  "animation-duration: 0.01ms !important",
  "animation-iteration-count: 1 !important",
  "transition-duration: 0.01ms !important",
  "scroll-behavior: auto !important",
] as const;

const globals = readGlobalTokens();
const css = readFileSync(GLOBALS_CSS_PATH, "utf8");

/**
 * The body of the block whose prelude is `opener`, found by walking braces rather than by regex — a
 * nested `@media` inside `@layer base` is exactly the shape a lazy `[^}]*` would truncate at the
 * first inner brace and then report as "not found".
 *
 * The prelude must be IMMEDIATELY followed by its opening brace. `globals.css` names `@layer base`
 * inside a comment further up the file (the motion budget points at the reset that lives there), so
 * a bare `indexOf` matches the prose and then walks the NEXT block it finds — which returns a real,
 * plausible, entirely unrelated body instead of failing.
 */
function blockBodyAt(source: string, opener: string): string {
  const escaped = opener.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = new RegExp(`${escaped}\\s*\\{`).exec(source);
  if (match === null) return "";
  const bodyStart = match.index + match[0].length - 1;
  let depth = 0;
  for (let i = bodyStart; i < source.length; i++) {
    if (source[i] === "{") depth++;
    else if (source[i] === "}") {
      depth--;
      if (depth === 0) return source.slice(bodyStart + 1, i);
    }
  }
  return "";
}

describe("DS-04 — every named duration is inside the 320ms budget", () => {
  it.each(DURATIONS)("%s is a millisecond value at or below the cap", (token) => {
    const raw = globals[token];
    expect(raw, `the global block is missing ${token}`).toBeDefined();
    // The unit is asserted, not assumed. `0.5s` would parse to 0.5 and slip under a bare numeric
    // comparison while being 500ms of real motion.
    expect(raw, `${token} must be written in ms`).toMatch(/^\d+(\.\d+)?ms$/);
    expect(Number.parseFloat(raw)).toBeLessThanOrEqual(MOTION_CAP_MS);
  });

  it("ascends strictly from fast to slow", () => {
    const values = DURATIONS.map((token) =>
      Number.parseFloat(globals[token] ?? "NaN"),
    );
    for (let i = 1; i < values.length; i++) {
      expect(
        values[i],
        `${DURATIONS[i]} must be slower than ${DURATIONS[i - 1]}`,
      ).toBeGreaterThan(values[i - 1]);
    }
  });

  it("declares a real easing curve, not a keyword", () => {
    expect(globals["--motion-ease-standard"]).toContain("cubic-bezier(");
  });

  it("keeps motion global — no theme may blow the cap (D-05)", () => {
    // Motion is a budget, not a brand expression. If a later plan moves a motion token into a
    // theme block, one theme becomes able to make the whole app feel broken.
    for (const token of [...DURATIONS, "--motion-ease-standard"]) {
      expect(globals[token], `${token} must live in the global block`).toBeDefined();
    }
  });
});

describe("DS-04 — one global reduced-motion reset, in @layer base", () => {
  const baseLayer = blockBodyAt(css, "@layer base");

  it("declares the media query at all", () => {
    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("puts the reset inside @layer base, not floating at the top level", () => {
    expect(baseLayer, "no @layer base block was found").not.toBe("");
    expect(baseLayer).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it.each(RESET_DECLARATIONS)("sets `%s`", (declaration) => {
    const reset = blockBodyAt(css, "@media (prefers-reduced-motion: reduce)");
    expect(reset, "no reduced-motion block was found").not.toBe("");
    expect(reset).toContain(declaration);
  });

  it("targets pseudo-elements too, so decorative motion is covered", () => {
    const reset = blockBodyAt(css, "@media (prefers-reduced-motion: reduce)");
    expect(reset).toContain("*::before");
    expect(reset).toContain("*::after");
  });

  it("is the only reduced-motion block in the stylesheet (DS-04 says ONE reset)", () => {
    const matches = css.match(/prefers-reduced-motion/g) ?? [];
    expect(matches.length).toBe(1);
  });
});

describe("DS-05 — the base outline colour is solid", () => {
  it("no longer carries the half-alpha modifier", () => {
    // It set outline-color only, so it rendered nothing on its own — but it is the colour source
    // for the 3 `focus-visible:outline-1` sites and composited to 1.54:1 against white. No value
    // of --ring fixes the half-alpha form, which is why the alpha had to go rather than the token.
    expect(css).not.toContain("outline-ring/50");
    expect(css).toContain("outline-ring");
  });

  it("has no base-layer focus-visible outline fallback (considered and rejected)", () => {
    // shadcn's base recipe sets `outline-none` in the utilities layer, which outranks anything
    // declared in @layer base. A fallback here would be dead code that reads like a safety net.
    expect(css).not.toMatch(/focus-visible\s*\{/);
  });
});

// ---------------------------------------------------------------------------
// Guard the guard (T-10-06). Almost every assertion above is a substring check
// against a file read. An empty or truncated read makes the `not.toContain`
// assertions pass for free, and this section is what stops that.
// ---------------------------------------------------------------------------
describe("guard-the-guard", () => {
  it("read a stylesheet that is actually the stylesheet", () => {
    expect(css.length).toBeGreaterThan(3000);
    expect(css).toContain("@layer base");
  });

  it("parsed a global block with real content", () => {
    expect(Object.keys(globals).length).toBeGreaterThanOrEqual(8);
  });

  it("the brace walker finds a nested block, not the first inner brace", () => {
    // The positive control for `blockBodyAt`: @layer base contains nested rules, so a walker that
    // stopped at the first `}` would return a fragment that still contains the `*` rule and would
    // silently make the "reset is inside @layer base" assertion vacuous.
    const baseLayer = blockBodyAt(css, "@layer base");
    expect(baseLayer).toContain("@apply bg-background text-foreground");
    expect(baseLayer).toContain("scroll-behavior: auto !important");
    expect(blockBodyAt(css, "@nonexistent-at-rule")).toBe("");
  });
});
