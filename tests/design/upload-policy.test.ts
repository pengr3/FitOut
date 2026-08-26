// 16.1 layer 1 — the upload declaration, asserted against the shipped module.
//
// WHAT THIS CATCHES THAT NOTHING ELSE WOULD. Every other gate in this phase looks at BEHAVIOUR: the
// sign route refuses a foreign preset, a refused file never reaches `persistPhoto`, the reconciler
// reports a diff. None of them can see the ARITHMETIC behind the byte ceiling, and the wrong value
// renders identically to the right one — a round decimal million and `10 * 1024 * 1024` are
// indistinguishable to a reviewer reading a diff, and they differ by 485,760 bytes at a vendor
// boundary that was probed to the byte (16.1-RESEARCH § R-3.1: `Maximum is 10485760`). Written the
// round way, FitOut would refuse files Cloudinary accepts, the declared limit and the enforced limit
// would be two different numbers again, and every behavioural test in the phase would stay green —
// because refusing early is not a behaviour any of them assert. That is roadmap defect U1 walking
// back in through a rounding convention, which is the whole thing D-180 exists to end. So the
// ceiling is asserted BOTH as the arithmetic and as the vendor's number, and the transformation is
// asserted to be BUILT from the edge constant rather than to merely contain the digits 2048.
//
// WHY THIS SPEC IS AT `tests/design/` AND NOT `tests/listing/`. 16.1-RESEARCH § Validation
// Architecture places it at `tests/listing/upload-policy.test.ts`; 16.1-PATTERNS § C-2 corrects it,
// and the repo already litigated the identical question at `tests/design/avatar-zoom.test.ts:13-20`:
// `vitest.design.config.ts:53` includes `tests/design/**` and nothing else, so a spec at
// `tests/listing/` is collected by `vitest.config.ts`, which declares
// `globalSetup: ["tests/global-setup.ts"]` and hard-FAILS the whole run — even a single-file run —
// when Postgres is unreachable. This file is pure: constants, one array, one AST read, no mock, no
// DB. Putting it there would make it pay a database preflight and would keep the gate OUT of
// `npm run build`, whose chain is `lint && test:design && next build`.
//
// THE CONSEQUENCE OF THAT PLACEMENT, STATED SO NO LATER PLAN IS SURPRISED: `npx vitest run
// tests/listing` does NOT collect this file. The command that does is `npm run test:design`. And
// `tests/setup.ts` does not run here, so `mockCloudinary` is absent — which costs nothing, because
// nothing below mocks anything.
//
// ─────────────────────────────────────────────────────────────────────────────────────────────────
// OBSERVED RED. Taken on 2026-08-26 by temporarily editing ONLY the declaration line in
// `src/lib/listing/upload-policy.ts` to the round decimal spelling and re-running this file, then
// reverting (`git checkout --`, diff verified empty). Verbatim, less the diff bodies:
//
//    ❯ tests/design/upload-policy.test.ts (17 tests | 2 failed) 113ms
//        × LISTING_MAX_BYTES is the arithmetic AND the vendor's number 22ms
//        × the ceiling is SPELLED as the arithmetic, never as a round decimal million 16ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 2 ⎯⎯⎯⎯⎯⎯⎯
//
//    FAIL  tests/design/upload-policy.test.ts > D-180 / D-182 — the derived values are DERIVED >
//    LISTING_MAX_BYTES is the arithmetic AND the vendor's number
//   AssertionError: expected 10000000 to be 10485760 // Object.is equality
//
//    ❯ tests/design/upload-policy.test.ts:203:31
//       203|     expect(LISTING_MAX_BYTES).toBe(10 * 1024 * 1024);
//          |                               ^
//
// (That `203|` pointer is as-run — this transcript replaced a shorter placeholder afterwards, so the
// assertion now sits a few lines lower. Same shape as `tests/use-server-exports.test.ts`'s note
// about its own recorded `367|`.)
//
//    FAIL  tests/design/upload-policy.test.ts > D-180 / D-182 — the derived values are DERIVED >
//    the ceiling is SPELLED as the arithmetic, never as a round decimal million
//   AssertionError: expected '\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\n\…' to contain '10 * 1024 * 1024'
//
//    Test Files  1 failed (1)
//         Tests  2 failed | 15 passed (17)
//
// TWO INDEPENDENT REDS FOR ONE EDIT, which is the point of pinning the value and the spelling
// separately: the value assertion catches the number moving, the source assertion catches a reader
// being misled about which number it is. Note what the second one's actual/received value is — a run
// of newlines. That is `stripComments` working: the module is nearly all argument, so its stripped
// code is a handful of declarations in a long field of blank lines, and the assertion is reading the
// CODE rather than the prose that discusses the hazard. A whole-file `toContain` would have been
// green here, because the docblock right above the declaration argues about the arithmetic at
// length.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";
import ts from "typescript";

import {
  LISTING_ALLOWED_FORMATS,
  LISTING_INCOMING_TRANSFORMATION,
  LISTING_MAX_BYTES,
  LISTING_MAX_EDGE_PX,
  LISTING_MAX_PHOTOS,
  LISTING_UPLOAD_PRESET,
} from "@/lib/listing/upload-policy";
import {
  AVATAR_MAX_BYTES,
  AVATAR_TOO_LARGE_MESSAGE,
} from "@/lib/validation/profile";

import { stripComments } from "../helpers/source-text";

const MODULE_FILE = "src/lib/listing/upload-policy.ts";
const SOURCE = readFileSync(resolve(process.cwd(), MODULE_FILE), "utf8");
const CODE = stripComments(SOURCE);

describe("T-16.1-09 — the declaration is not a server module and never acquires a directive", () => {
  // The same trap `tests/design/avatar-zoom.test.ts:205-264` asserts for `src/lib/avatar.ts`, for
  // the same reason: a value exported from a `"use server"` module makes Next reject the WHOLE
  // module at evaluation, which once left avatar upload dead in the browser for an entire phase
  // while the tests stayed green. `tests/use-server-exports.test.ts` guards the `src/app/actions/`
  // side; this guards the other side — that the contract's home never acquires a directive of its
  // own and becomes ineligible to be imported by the client uploader or by a plain Node script.
  //
  // Read STRUCTURALLY, over the AST, and that is load-bearing: the module's own header QUOTES both
  // directives in order to explain that it uses neither, so a grep on a CORRECT file returns a
  // non-zero count. `avatar-zoom.test.ts:212-215` and `empty-state-adoption.test.ts:655-663` record
  // the identical finding and the identical fix.

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
      directivePrologue(MODULE_FILE, SOURCE),
      `${MODULE_FILE} acquired a directive prologue. It must stay importable from the sign route, ` +
        `from the "use client" uploader AND from a plain Node script, and a "use server" file may ` +
        `export nothing but async functions — see the module's own header.`,
    ).toBeNull();
  });

  it("the detector reads the prologue and not the prose (both directions)", () => {
    // Without this, a detector that silently matched nothing would pass the assertion above against
    // any file at all. `leak.test.ts:208-212`'s rule: the fixtures exercise the same code path.
    expect(
      directivePrologue("probe.ts", '"use client";\nexport const a = 1;\n'),
    ).toBe("use client");
    expect(
      directivePrologue("probe.ts", '"use server";\nexport async function a() {}\n'),
    ).toBe("use server");
    expect(
      directivePrologue(
        "probe.ts",
        '// this file is NOT "use client" and NOT "use server"\nexport const a = 1;\n',
      ),
    ).toBeNull();
  });

  it("the module under test really was read, and is the one that declares the preset", () => {
    // Guards the path: a typo in MODULE_FILE would make readFileSync throw, but a stale or empty
    // read would make every assertion in this file vacuous.
    expect(SOURCE).toContain("export const LISTING_UPLOAD_PRESET");
    expect(LISTING_UPLOAD_PRESET).toBe("fitout_listing_v1");
  });
});

describe("D-181 / T-16.1-09 — the declaration reads nothing ambient", () => {
  it("stripComments removes a token that lives only in a comment", () => {
    // Direction 1 of the helper's self-test — the whole reason it exists
    // (`scripts/verify-workflows.mjs:24-32`): the correct file NAMES the thing it forbids.
    expect(stripComments('// mentions process.env\nconst a = 1;\n')).not.toContain(
      "process.env",
    );
    expect(
      stripComments('/**\n * mentions process.env\n */\nconst a = 1;\n'),
    ).not.toContain("process.env");
  });

  it("stripComments keeps a token that lives in CODE", () => {
    // Direction 2, and it is not optional. A stripper that returned the empty string would make
    // every prohibition built on it pass vacuously — the same both-directions rule the directive
    // detector above follows.
    expect(stripComments('const a = process.env.X; // a comment\n')).toContain(
      "process.env",
    );
    expect(stripComments('const a = 1;\n')).toContain("const a = 1;");
  });

  it("reads no environment variable, in stripped source", () => {
    // 16.1-PATTERNS § S-3: this is the correct application here of the fail-closed pattern at
    // `listing-photo.ts:111-129` — there is nothing to fail closed ON, and that is the point. The
    // preset name is a repo constant, so `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` (a silent fallback
    // inside next-cloudinary) never becomes load-bearing. Stripped, because the module's own header
    // names that variable in order to say it must stay unset.
    expect(CODE).not.toContain("process.env");
  });

  it("imports neither the Cloudinary SDK nor Zod — it is a leaf", () => {
    expect(CODE).not.toContain('from "cloudinary"');
    expect(CODE).not.toContain('from "zod"');
  });

  it("throws at no depth, module scope included", () => {
    // NOT a style preference. `next build` sets NODE_ENV=production and arms every module-scope boot
    // guard while it collects page data, and `.github/workflows/ci.yml:608-635` records
    // `Failed to collect page data for /api/cloudinary/sign` as a real, build-breaking failure. This
    // module is imported by that route, so a boot guard here breaks the BUILD, not a request.
    expect(CODE).not.toMatch(/\bthrow\b/);
  });
});

describe("D-180 / D-182 — the derived values are DERIVED", () => {
  it("LISTING_MAX_BYTES is the arithmetic AND the vendor's number", () => {
    // Both, deliberately. The first pins the spelling's meaning; the second pins it to the ceiling
    // measured against the live account, `File size too large. Got 10797728. Maximum is 10485760.`
    expect(LISTING_MAX_BYTES).toBe(10 * 1024 * 1024);
    expect(LISTING_MAX_BYTES).toBe(10485760);
  });

  it("the ceiling is SPELLED as the arithmetic, never as a round decimal million", () => {
    // The value assertion above cannot see the spelling, and the spelling is what a reviewer reads.
    // Asserted over STRIPPED source so that the module's own docblock — which has to discuss the
    // hazard — cannot make a correct file report red (`verify-workflows.mjs:24-32`).
    expect(CODE).toContain("10 * 1024 * 1024");
    expect(CODE).not.toMatch(/10_000_000|10000000/);
  });

  it("the transformation is BUILT from LISTING_MAX_EDGE_PX, not typed out", () => {
    expect(LISTING_INCOMING_TRANSFORMATION).toContain(`w_${LISTING_MAX_EDGE_PX}`);
    expect(LISTING_INCOMING_TRANSFORMATION).toContain(`h_${LISTING_MAX_EDGE_PX}`);
  });

  it("the interpolation still agrees with the constant across a band of candidate edge values", () => {
    // The band assertion in `avatar-zoom.test.ts:186-202`'s shape, adapted from a function to a
    // string: EXACTLY ONE candidate may produce the shipped transformation, and it must be the one
    // LISTING_MAX_EDGE_PX names. Move the constant while leaving a literal in the template and the
    // matching arm compares against the wrong width and goes red — which a `toContain("2048")`
    // could never do.
    const candidates = [512, 1024, 1600, 2048, 3072, 4096];
    expect(candidates).toContain(LISTING_MAX_EDGE_PX);
    const matched = candidates.filter(
      (px) =>
        LISTING_INCOMING_TRANSFORMATION === `c_limit,w_${px},h_${px},q_auto,f_auto`,
    );
    expect(matched).toEqual([LISTING_MAX_EDGE_PX]);
  });

  it("the transformation carries c_limit, q_auto and f_auto", () => {
    // `f_auto` is the F-2 requirement, not decoration: without a format conversion a HEIC upload is
    // stored and delivered as a content type Chrome and Firefox cannot render, and all eight render
    // sites are a plain <img src>.
    const components = LISTING_INCOMING_TRANSFORMATION.split(",");
    expect(components).toContain("c_limit");
    expect(components).toContain("q_auto");
    expect(components).toContain("f_auto");
  });

  it("the transformation carries no upscaler, no eager derivation and no rotate", () => {
    // `c_scale` would upscale — the E11 shape. `eager` derives an extra asset and leaves the
    // ORIGINAL stored, failing criteria 3 and 5, and its derived url carries transformation
    // components `isOwnCloudinaryAsset` rejects by design. The rotate components are absent because
    // Cloudinary applies the orientation BEFORE dropping the metadata (§ R-2.2) — measured, so no
    // explicit component is needed and adding one would be cargo.
    for (const banned of ["c_scale", "eager", "a_ignore", "angle"]) {
      expect(LISTING_INCOMING_TRANSFORMATION).not.toContain(banned);
    }
  });

  it("LISTING_ALLOWED_FORMATS is one array of exactly six, with the two absences intact", () => {
    const formats: readonly string[] = LISTING_ALLOWED_FORMATS;
    expect(formats).toHaveLength(6);
    expect(formats).toContain("heic");
    expect(formats).toContain("heif");
    // D-184's two refusals. A vector document is a scriptable document rather than a photo and
    // survives the re-encode verbatim; a multi-frame animation is the one input the re-encode makes
    // BIGGER (measured 1,887 B → 2,634 B). Neither is closed by the transformation, so the array is
    // the only thing closing them.
    for (const absent of ["svg", "gif", "tif", "tiff"]) {
      expect(formats).not.toContain(absent);
    }
  });

  it("LISTING_MAX_PHOTOS is the cap the widget and the server both read", () => {
    // It left `src/app/actions/listing-photo.ts` because that module opens "use server" and could
    // never export it (16.1-PATTERNS § C-1). Pinned here so the move is not silently undone.
    expect(LISTING_MAX_PHOTOS).toBe(20);
  });
});

describe("D-183 — two ceilings stand, and the avatar one is not collateral", () => {
  it("AVATAR_MAX_BYTES and AVATAR_TOO_LARGE_MESSAGE are unchanged", () => {
    // This test exists to make a REGRESSION of D-183 LOUD. The listing ceiling moving is not licence
    // to move the avatar one — they are different surfaces doing different jobs, and an avatar
    // becomes a 400x400 circle, so 5 MB is already absurdly generous there. The sentence is pinned
    // by 16-UI-SPEC as SHIPPED copy, so it is asserted byte-for-byte rather than by shape.
    expect(AVATAR_MAX_BYTES).toBe(5 * 1024 * 1024);
    expect(AVATAR_TOO_LARGE_MESSAGE).toBe("Image must be 5 MB or smaller.");
  });
});
