// IC-05 — the avatar zoom bound, asserted against the shipped module.
//
// WHAT THIS CATCHES THAT NOTHING ELSE WOULD. Every other gate in Phase 16 looks at what the crop
// dialog RENDERS: the mask, the ring, the disabled zoom row, the touch target. None of them can see
// the arithmetic behind `maxZoom`, and a `maxZoom` computed against a hard-coded `400` instead of
// `AVATAR_OUTPUT_PX` renders identically to a correct one — every render assertion in the phase stays
// green. It only becomes visible the day D-172's output size moves, at which point the bound silently
// stops being derived and starts permitting a crop drawn from fewer real source pixels than the
// output: a blurry avatar, shipped by a suite that was fully green. The rows below are therefore
// asserted with `toBe` against the exported function, and the constants with `toBe` against the
// exported constants, so a drift between the two is a red and not a rendering that looks fine.
//
// WHY THIS SPEC IS AT `tests/design/` AND NOT `tests/profile/`. `16-VALIDATION.md` places it at
// `tests/profile/avatar-zoom.test.ts` and calls it "design config, no DB". Those two are not
// compatible: `vitest.design.config.ts:53` includes `tests/design/**` and nothing else, so a spec at
// `tests/profile/` is collected by `vitest.config.ts`, which declares
// `globalSetup: ["tests/global-setup.ts"]` and hard-FAILS the whole run — even a single-file run —
// when Postgres is unreachable. That would make a pure-arithmetic assertion about a module with no
// imports pay a database preflight, and it would keep this gate out of `npm run build`, whose chain
// is `lint && test:design && next build`. The repo's only previous answer to that squeeze was a
// throwaway root config deleted after use (`tests/security/safe-callback-url.test.ts:20-24`), which
// is a workaround and not a standing gate.
//
// The zoom bound is a CONTRACT asserted against a pure module — structurally the same kind of thing
// `tests/design/` already holds — so it lives here: DB-free, a couple of seconds, and
// build-blocking. It carries no jsdom environment pragma either: it touches no DOM, and the design
// config's environment is already `node`. (The pragma's literal spelling is deliberately not written
// anywhere in this file — the phase's acceptance criterion counts that token, and a mention inside a
// comment explaining its absence returns a non-zero count against a correct file. Same shape as the
// directive-prologue trap asserted structurally at the bottom.)
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// OBSERVED RED. Written and run BEFORE `src/lib/avatar.ts` existed, so the nine rows below are a
// watched failure and not a description of code already written. 2026-08-25,
// `npx vitest run tests/design/avatar-zoom.test.ts --config vitest.design.config.ts`:
//
//    ❯ tests/design/avatar-zoom.test.ts (0 test)
//
//   ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/design/avatar-zoom.test.ts [ tests/design/avatar-zoom.test.ts ]
//   Error: Cannot find package '@/lib/avatar' imported from
//   C:/Users/Admin/Roaming/FitOut/tests/design/avatar-zoom.test.ts
//    ❯ tests/design/avatar-zoom.test.ts:9:1
//
//    Test Files  1 failed (1)
//         Tests  no tests
//
//   EXIT=1
//
// Recorded honestly: that red is a RESOLUTION failure, which is the only red a brand-new module can
// produce and is weaker evidence than a wrong-value red. The rows are therefore backed up by the
// swept invariant below, which no table of nine points can satisfy by coincidence.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import ts from "typescript";

import {
  avatarMaxZoom,
  AVATAR_ALLOWED_TYPES,
  AVATAR_MAX_ZOOM_CEILING,
  AVATAR_MIN_SOURCE_PX,
  AVATAR_OUTPUT_PX,
} from "@/lib/avatar";

/** Repo-relative so the failure message names the file a reader can open. */
const MODULE_FILE = "src/lib/avatar.ts";

type ZoomRow = {
  /** `min(naturalWidth, naturalHeight)` of the decoded source. */
  readonly shorter: number;
  readonly expected: number;
  /** The 999.2 IC-05 row this comes from, so a failure names its source. */
  readonly source: string;
};

/**
 * IC-05's seven worked rows, verbatim, plus the clamp's two arms.
 *
 * The `180 x 240` row of IC-05 is deliberately absent as a zoom row: its shorter side is 180, below
 * `AVATAR_MIN_SOURCE_PX`, so it is refused before the dialog opens and `avatarMaxZoom` is never
 * called on it. Asserting a zoom for it would assert behaviour the product does not have. The
 * boundary it describes is asserted instead, at `AVATAR_MIN_SOURCE_PX` itself.
 */
const ZOOM_ROWS: readonly ZoomRow[] = [
  { shorter: 3000, expected: 3, source: "IC-05 · 3000 x 4000 — ceiling" },
  { shorter: 900, expected: 2.25, source: "IC-05 · 1200 x 900" },
  { shorter: 600, expected: 1.5, source: "IC-05 · 600 x 800" },
  {
    shorter: 400,
    expected: 1,
    source: "IC-05 · 400 x 400 — zoom row disabled + soft note",
  },
  {
    shorter: 300,
    expected: 1,
    source: "IC-05 · 300 x 300 — clamped up; output upscales 300 -> 400",
  },
  { shorter: 500, expected: 1.25, source: "IC-05 · 4000 x 500" },
  {
    shorter: 4000,
    expected: 3,
    source: "IC-05 · ceiling holds — 4000 gives 3, not 10",
  },
  {
    shorter: 0,
    expected: 1,
    source: "clamp lower arm — nonsense input must not return 0",
  },
  {
    shorter: -1,
    expected: 1,
    source: "clamp lower arm — a negative must not return a negative",
  },
  {
    // IN-02. The sweep covered 0 and -1 and missed the one nonsense value that ESCAPED both clamp
    // arms: every comparison against NaN is false, so `Math.min(Math.max(NaN, 1), 3)` is NaN and a
    // NaN max-zoom hands the slider a degenerate range. No consumer can produce it today, which is
    // why it went unnoticed — the docblock claimed both arms clamped "for nonsense input" and this
    // is the input that made the claim untrue.
    shorter: Number.NaN,
    expected: 1,
    source: "clamp lower arm — NaN escapes both arms without the `|| 1` (IN-02)",
  },
];

describe("IC-05 — avatarMaxZoom reproduces every worked row", () => {
  for (const { shorter, expected, source } of ZOOM_ROWS) {
    it(`avatarMaxZoom(${shorter}) === ${expected}  (${source})`, () => {
      expect(avatarMaxZoom(shorter)).toBe(expected);
    });
  }

  it("avatarMaxZoom(AVATAR_MIN_SOURCE_PX) === 1 — the soft-source boundary D-173 describes", () => {
    // 200..399 opens the dialog with the zoom row DISABLED and AVATAR_SOFT_SOURCE_NOTE beneath it
    // (rule F8). "Disabled" is a maxZoom of exactly 1, not a hidden control.
    expect(avatarMaxZoom(AVATAR_MIN_SOURCE_PX)).toBe(1);
  });
});

describe("the constants the bound is derived FROM", () => {
  // `toBe`, never `toBeGreaterThan`. These are a contract with five downstream consumers, not a
  // range: the encoder's canvas, the zoom bound, the pre-dialog guard, the picker's `accept` and the
  // Zod schema all read them, and "at least 400" would let two of those disagree and stay green.

  it("AVATAR_OUTPUT_PX is 400 — the one output size (D-172)", () => {
    expect(AVATAR_OUTPUT_PX).toBe(400);
  });

  it("AVATAR_MIN_SOURCE_PX is 200 — the soft floor (D-173, 999.2 Open Q1)", () => {
    expect(AVATAR_MIN_SOURCE_PX).toBe(200);
  });

  it("AVATAR_MAX_ZOOM_CEILING is 3 — the hard ceiling (D-173, 999.2 Open Q2)", () => {
    expect(AVATAR_MAX_ZOOM_CEILING).toBe(3);
  });

  it("AVATAR_ALLOWED_TYPES is exactly the three MIME types, in order", () => {
    // ORDER is asserted because this array is read straight into the file input's `accept`
    // attribute, which is user-visible in the OS picker's filter row.
    expect([...AVATAR_ALLOWED_TYPES]).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});

describe("the invariant behind the rows", () => {
  it("avatarMaxZoom stays within [1, AVATAR_MAX_ZOOM_CEILING] across 1..5000", () => {
    // The property, not the points. Nine rows can be satisfied by nine special cases; this cannot.
    // A future edit that drops either clamp arm — or reintroduces a hard-coded divisor — fails here
    // even if it still happens to hit all nine table values.
    const offenders: string[] = [];
    for (let shorter = 1; shorter <= 5000; shorter += 1) {
      const zoom = avatarMaxZoom(shorter);
      if (!(zoom >= 1 && zoom <= AVATAR_MAX_ZOOM_CEILING)) {
        offenders.push(`avatarMaxZoom(${shorter}) = ${zoom}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the bound is derived from AVATAR_OUTPUT_PX, not from a hard-coded divisor", () => {
    // Sampled in the unclamped band only — between the output size and the ceiling, where the
    // division is actually observable. `shorter / AVATAR_OUTPUT_PX` is recomputed here from the
    // exported constant, so a module that divides by a literal 400 while AVATAR_OUTPUT_PX says
    // something else goes red.
    const band = [
      AVATAR_OUTPUT_PX + 1,
      Math.round(AVATAR_OUTPUT_PX * 1.5),
      AVATAR_OUTPUT_PX * 2,
      AVATAR_OUTPUT_PX * AVATAR_MAX_ZOOM_CEILING,
    ];
    for (const shorter of band) {
      expect(avatarMaxZoom(shorter)).toBe(shorter / AVATAR_OUTPUT_PX);
    }
  });
});

describe("T-16-04 — the contract module is not a server module", () => {
  // The F3 trap, ASSERTED rather than assumed. A value exported from a `"use server"` module makes
  // Next reject the WHOLE module at evaluation, which once left avatar upload dead in the browser
  // for an entire phase while the tests stayed green. `tests/use-server-exports.test.ts` guards the
  // `src/app/actions/` side; this guards the other side — that the constants' home never acquires a
  // directive of its own and becomes ineligible to be imported by a client component.
  //
  // Read STRUCTURALLY, over the AST, and this is load-bearing: the module's own header QUOTES both
  // directives in order to explain that it uses neither, so `grep -c '"use client"'` on a CORRECT
  // file returns a non-zero number. `empty-state-adoption.test.ts:655-663` records the identical
  // finding and the identical fix.
  const source = readFileSync(resolve(process.cwd(), MODULE_FILE), "utf8");

  /** The module's directive prologue, or `null` when it has none. */
  function directivePrologue(path: string, text: string): string | null {
    const sf = ts.createSourceFile(
      path,
      text,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      ts.ScriptKind.TS,
    );
    const first = sf.statements[0];
    if (
      first &&
      ts.isExpressionStatement(first) &&
      ts.isStringLiteral(first.expression)
    ) {
      return first.expression.text;
    }
    return null;
  }

  it(`${MODULE_FILE} has no directive prologue`, () => {
    expect(
      directivePrologue(MODULE_FILE, source),
      `${MODULE_FILE} acquired a directive prologue. It must stay importable from BOTH a client ` +
        `component and a server action, and a "use server" file may export nothing but async ` +
        `functions — see the module's own header.`,
    ).toBeNull();
  });

  it("the detector reads the prologue and not the prose (both directions)", () => {
    // Without this, a detector that silently matched nothing would pass the assertion above against
    // any file at all. `leak.test.ts:208-212`'s rule: the fixtures exercise the same code path.
    expect(directivePrologue("probe.ts", '"use client";\nexport const a = 1;\n')).toBe("use client");
    expect(directivePrologue("probe.ts", '"use server";\nexport async function a() {}\n')).toBe("use server");
    expect(
      directivePrologue(
        "probe.ts",
        '// this file is NOT "use client" and NOT "use server"\nexport const a = 1;\n',
      ),
    ).toBeNull();
  });

  it("the module under test really was read, and is the one that exports the bound", () => {
    // Guards the path: a typo in MODULE_FILE would make readFileSync throw, but a stale or empty
    // read would make the prologue assertion vacuous.
    expect(source).toContain("export function avatarMaxZoom");
  });
});
