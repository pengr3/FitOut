// D-18, applied to bytes instead of text — THIS TEST *IS* THE CI CHECK for `e2e/fixtures/`. There is
// no CI in this repository, so `npm run test:design` (which `package.json` wires into `build`) is the
// only place a regen-diff gate can live.
//
// WHAT IT CATCHES THAT NOTHING ELSE WOULD: A FIXTURE EDITED BY HAND.
//
// `scripts/generate-image-fixtures.mjs` exists so that the EXIF Orientation byte in
// `exif-orientation-6.jpg` is AUDITABLE — written by a line of code with a paragraph above it
// explaining what 6 means — rather than magic bytes a reader has to take on faith. The moment one of
// these eleven files can be opened in an editor, re-saved by a tool, "fixed" by hand or replaced with
// a photo somebody had lying around, that guarantee is gone and the generator is decoration. Nothing
// else in the repository would notice: the files are binary, so a review diff shows `Bin 4890 -> 5133
// bytes` and nothing more; the Playwright specs that consume them would keep passing right up until
// the day the substituted file happened to disagree, and then they would fail somewhere else.
//
// WHAT IT ASSERTS, in three blocks:
//   1. GUARD-THE-GUARD FIRST. Every assertion in block 2 is an equality between two byte strings, and
//      the cheapest way for both sides to agree is for both to be EMPTY. So the RENDER is checked for
//      substance independently of what is on disk — signatures, chunk types, markers, and the EXIF
//      orientation value re-parsed by this file's own IFD reader rather than by the generator's.
//   2. THE DRIFT COMPARISON. Eleven byte-for-byte equalities between the committed file and a fresh
//      in-memory render. One `it()` each, so a failure names the file that moved instead of reporting
//      the whole gate as broken.
//   3. TRACKING. `git ls-files e2e/fixtures` returns exactly the twelve paths that belong there, and
//      none of them collides with the two `.gitignore` platform-baseline rules (D-29).
//
// IT IMPORTS THE RENDERERS AND NEVER CALLS `main()`, ON PURPOSE. `main()` writes to disk. A test that
// invoked it would repair the very file it was checking and then pass — the drift gate would be a
// regeneration step wearing a test's clothes. Importing the module has no side effect, because the
// generator guards its entry point on `import.meta.main`.
//
// IF THIS FILE IS RED, RUN `npm run fixtures:images`. Do not edit a fixture to match, and do not edit
// this test. Both are downstream of the generator; the generator is the only editable source. Every
// failure message below says so, because the instinct on a red byte-comparison is to make the two
// sides agree rather than to ask which one is authored.
//
// NOT COVERED — real blind spots, listed so the next reader under-trusts this file:
//   • That the fixtures are CORRECT — that 320x320 with an opaque top-left block is the right input
//     for the white-matte proof, or that Chromium honours the orientation tag the way the generator's
//     comment claims. This asserts the committed bytes are the generator's output; if the generator
//     were wrong, both sides would be wrong together. The cross-check is a real browser, and it lives
//     in plans 16-13 and 16-14, which load these files into Chromium and assert on decoded pixels.
//   • That the DEFLATE streams inside the PNGs would be identical on a Node built against a different
//     zlib. `DEFLATE_OPTIONS` pins every parameter that affects the output, but not the
//     implementation. If this ever goes red on a machine where nobody edited anything, that is the
//     reason, and the remedy is a regeneration commit that says so — never a normalising comparison.
//   • That the fixtures are actually USED. A fixture nothing loads would pass here forever.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";

import { FIXTURES } from "../../scripts/generate-image-fixtures.mjs";

const REPO_ROOT = process.cwd();

/** The directory pathspec block 3 asks git about, and the prefix every fixture path must carry. */
const FIXTURE_DIR = "e2e/fixtures";

/**
 * Eleven generated fixtures plus the provenance README. The count is spelled out rather than derived
 * from `FIXTURES.length + 1` so that adding a fixture without documenting it fails HERE, in the file
 * whose whole subject is that these bytes are accounted for.
 */
const EXPECTED_TRACKED_PATHS = 12;

/** The two `.gitignore` platform-baseline rules (D-29) the new directory must never collide with. */
const FORBIDDEN_PLATFORM_RULES = ["*-win32.png", "*-darwin.png"] as const;

/**
 * A control for block 3, chosen to exercise THE SAME machinery — a bare DIRECTORY pathspec — rather
 * than merely to prove `git` is installed. If `git ls-files <dir>` ever stopped resolving that way,
 * `git ls-files e2e/fixtures` would return nothing and the count assertion would fail loudly; this
 * control is what stops the SET assertion below from being satisfied by an empty answer.
 */
const CONTROL_PATHSPEC = {
  pathspec: "scripts",
  mustInclude: "scripts/generate-image-fixtures.mjs",
} as const;

const REGENERATE =
  "run `npm run fixtures:images` — do NOT edit a fixture by hand, and do NOT edit this test";

/**
 * The result of asking git what it tracks. A discriminated union rather than a bare `string[]`, so
 * that "git could not answer" is impossible to confuse with "git answered: nothing" — the same
 * distinction `tests/design/gitignore-baselines.test.ts` draws, for the same reason.
 */
type LsFiles =
  | { readonly ok: true; readonly paths: readonly string[] }
  | { readonly ok: false; readonly reason: string };

/** `git ls-files <pathspec…>`, with every failure mode converted into ONE named reason. */
function lsFiles(...pathspecs: readonly string[]): LsFiles {
  try {
    const stdout = execFileSync("git", ["ls-files", ...pathspecs], {
      cwd: REPO_ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return {
      ok: true,
      paths: stdout
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0),
    };
  } catch (error) {
    const err = error as NodeJS.ErrnoException & {
      status?: number | null;
      stderr?: Buffer | string | null;
    };
    const detail =
      err.code === "ENOENT"
        ? "`git` is not on PATH"
        : `git exited ${err.status ?? "(no status)"}: ${String(err.stderr ?? err.message).trim()}`;
    return {
      ok: false,
      reason:
        `\`git ls-files ${pathspecs.join(" ")}\` could not be run from ${REPO_ROOT} — ${detail}. ` +
        `This is NOT a pass: an unavailable git returns nothing, and nothing is exactly what an ` +
        `untracked fixture directory looks like, so block 3 would go vacuously green.`,
    };
  }
}

/** Where two byte strings first disagree, phrased for a failure message. */
function describeMismatch(committed: Buffer, rendered: Buffer): string {
  if (committed.length !== rendered.length) {
    return `${committed.length} bytes committed vs ${rendered.length} bytes rendered`;
  }
  for (let i = 0; i < committed.length; i++) {
    if (committed[i] !== rendered[i]) {
      const hex = (n: number | undefined) => `0x${(n ?? 0).toString(16).padStart(2, "0")}`;
      return `same length (${committed.length}), first difference at byte ${i}: committed ${hex(committed[i])} vs rendered ${hex(rendered[i])}`;
    }
  }
  return "identical";
}

/**
 * Read the EXIF Orientation out of a JPEG, with THIS file's own little-endian IFD reader.
 *
 * Deliberately not the generator's `exifOrientationApp1` run backwards: a decoder written from the
 * same misunderstanding as the encoder agrees with it perfectly. This walks the bytes the way a
 * browser would — find APP1, check the TIFF header, read IFD0, find tag 0x0112.
 */
function exifOrientationOf(jpeg: Buffer): number | null {
  const app1 = jpeg.indexOf(Buffer.from("Exif", "ascii"));
  if (app1 < 0 || app1 + 14 > jpeg.length) return null;
  const tiff = app1 + 6;
  if (jpeg.toString("ascii", tiff, tiff + 2) !== "II") return null;
  if (jpeg.readUInt16LE(tiff + 2) !== 42) return null;
  const ifd = tiff + jpeg.readUInt32LE(tiff + 4);
  const entries = jpeg.readUInt16LE(ifd);
  for (let i = 0; i < entries; i++) {
    const entry = ifd + 2 + i * 12;
    if (jpeg.readUInt16LE(entry) === 0x0112) return jpeg.readUInt16LE(entry + 8);
  }
  return null;
}

const startsWith = (bytes: Buffer, prefix: readonly number[]): boolean =>
  prefix.every((byte, i) => bytes[i] === byte);

// Rendered ONCE at module level. Every block below reads these; the `it()` blocks only assert.
const rendered = new Map<string, Buffer>(
  FIXTURES.map((fixture) => [fixture.name, Buffer.from(fixture.render())]),
);
const tracked = lsFiles(FIXTURE_DIR);
const control = lsFiles(CONTROL_PATHSPEC.pathspec);

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 1. Guard the guard. An empty render must not be able to match an empty file.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("guard-the-guard: the generator renders substance, and git answered", () => {
  it("exports eleven fixtures with distinct names", () => {
    expect(FIXTURES.length, "scripts/generate-image-fixtures.mjs must export eleven fixtures").toBe(
      11,
    );
    expect(new Set(FIXTURES.map((f) => f.name)).size).toBe(11);
  });

  it("git actually answered, and a control directory pathspec resolves", () => {
    expect(tracked.ok, tracked.ok ? "" : tracked.reason).toBe(true);
    expect(control.ok, control.ok ? "" : control.reason).toBe(true);
    expect(
      control.ok ? control.paths : [],
      `\`git ls-files ${CONTROL_PATHSPEC.pathspec}\` did not return ${CONTROL_PATHSPEC.mustInclude}, ` +
        `so a bare directory pathspec is not resolving the way block 3 assumes and an empty answer ` +
        `there would mean nothing`,
    ).toContain(CONTROL_PATHSPEC.mustInclude);
  });

  it("renders non-trivial bytes for every fixture", () => {
    for (const [name, bytes] of rendered) {
      expect(bytes.length, `${name} rendered ${bytes.length} bytes`).toBeGreaterThan(40);
    }
  });

  it("renders real PNGs, a real APNG, real JPEGs, a real GIF and a real SVG", () => {
    // Each of these is a property of the RENDER, not of the file on disk, so a truncated or missing
    // committed file cannot satisfy it by being equally empty.
    const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    for (const name of ["transparent.png", "square-400.png", "small-300.png", "tiny-150.png"]) {
      expect(startsWith(rendered.get(name) as Buffer, png), `${name} is not a PNG`).toBe(true);
    }

    const apng = rendered.get("animated.png") as Buffer;
    expect(startsWith(apng, png), "animated.png is not a PNG").toBe(true);
    // acTL declares the animation and fdAT carries frame two. Without BOTH, Chromium renders a still
    // image and the "saved bytes are frame ONE" assertion in 16-14 would pass for the wrong reason.
    expect(apng.includes(Buffer.from("acTL", "ascii")), "animated.png has no acTL").toBe(true);
    expect(apng.includes(Buffer.from("fdAT", "ascii")), "animated.png has no fdAT").toBe(true);

    for (const name of [
      "exif-orientation-6.jpg",
      "panorama-4000x500.jpg",
      "portrait-strip-500x4000.jpg",
      "corrupt.jpg",
    ]) {
      const jpeg = rendered.get(name) as Buffer;
      expect(startsWith(jpeg, [0xff, 0xd8]), `${name} has no SOI`).toBe(true);
    }

    const gif = rendered.get("tiny.gif") as Buffer;
    expect(gif.toString("ascii", 0, 6), "tiny.gif is not a GIF89a").toBe("GIF89a");

    const svg = rendered.get("tiny.svg") as Buffer;
    expect(svg.toString("utf8"), "tiny.svg is not an SVG document").toContain("<svg");
  });

  it("renders an EXIF Orientation of exactly 6, read back by an independent IFD parser", () => {
    // THE ONE BYTE THIS WHOLE PLAN EXISTS FOR. Orientation 6 means the stored 480x320 raster displays
    // as 320x480 portrait with the generator's stored-top-left block in the displayed TOP-RIGHT.
    expect(
      exifOrientationOf(rendered.get("exif-orientation-6.jpg") as Buffer),
      "exif-orientation-6.jpg does not carry Orientation = 6 — the fixture's entire purpose",
    ).toBe(6);

    // And the control: a JPEG with no APP1 must read as null, or the parser above would report 6 for
    // anything.
    expect(exifOrientationOf(rendered.get("panorama-4000x500.jpg") as Buffer)).toBeNull();
  });

  it("renders a corrupt.jpg that is a plausible JPEG and provably not a whole one", () => {
    const corrupt = rendered.get("corrupt.jpg") as Buffer;
    expect(startsWith(corrupt, [0xff, 0xd8]), "corrupt.jpg must still open with SOI").toBe(true);
    expect(
      corrupt[corrupt.length - 2] === 0xff && corrupt[corrupt.length - 1] === 0xd9,
      "corrupt.jpg ends with EOI, so it is a complete file and cannot exercise the onerror branch",
    ).toBe(false);
    // The intact JPEGs must end with EOI, or the assertion above would be satisfied by an encoder
    // that never wrote one.
    for (const name of ["exif-orientation-6.jpg", "panorama-4000x500.jpg"]) {
      const whole = rendered.get(name) as Buffer;
      expect(
        whole[whole.length - 2] === 0xff && whole[whole.length - 1] === 0xd9,
        `${name} does not end with EOI`,
      ).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 2. The drift comparison — one `it()` per fixture, so a failure names the file that moved.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("D-18 — every committed fixture is the generator's output, byte for byte", () => {
  for (const fixture of FIXTURES) {
    it(`e2e/fixtures/${fixture.name} matches a fresh in-memory render`, () => {
      const path = resolve(REPO_ROOT, FIXTURE_DIR, fixture.name);
      const committed = readFileSync(path);
      const fresh = rendered.get(fixture.name) as Buffer;
      expect(
        Buffer.compare(committed, fresh),
        `e2e/fixtures/${fixture.name} has drifted from scripts/generate-image-fixtures.mjs ` +
          `(${describeMismatch(committed, fresh)}) — ${REGENERATE}`,
      ).toEqual(0);
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// 3. Tracking. A fixture that is not committed is not a fixture — a Playwright spec on a fresh clone
//    would fail on a missing file, and the drift comparison above would fail first with a confusing
//    ENOENT rather than a sentence about tracking.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("the fixture directory is tracked, complete, and free of platform baselines", () => {
  it(`git tracks exactly ${EXPECTED_TRACKED_PATHS} paths under ${FIXTURE_DIR}`, () => {
    const paths = tracked.ok ? tracked.paths : [];
    expect(
      paths.length,
      `expected eleven fixtures plus README.md under ${FIXTURE_DIR}; git tracks ${paths.length}: ` +
        `${paths.join(", ") || "(nothing)"}`,
    ).toBe(EXPECTED_TRACKED_PATHS);
  });

  it("tracks exactly the eleven generated fixtures and the provenance README", () => {
    const expected = [...FIXTURES.map((f) => `${FIXTURE_DIR}/${f.name}`), `${FIXTURE_DIR}/README.md`]
      .slice()
      .sort();
    const paths = (tracked.ok ? tracked.paths : []).slice().sort();
    expect(paths, `the tracked set under ${FIXTURE_DIR} is not the generated set — ${REGENERATE}`)
      .toEqual(expected);
  });

  it("commits no file that the .gitignore platform-baseline rules would claim (D-29)", () => {
    // `*-win32.png` / `*-darwin.png` are gitignored, so a fixture named that way could never be
    // committed without `git add -f` — and would then be invisible to a fresh clone on CI. Naming is
    // the only defence and it costs one assertion.
    const offenders = (tracked.ok ? tracked.paths : []).filter((path) =>
      FORBIDDEN_PLATFORM_RULES.some((rule) => path.endsWith(rule.replace("*", ""))),
    );
    expect(
      offenders,
      `these fixtures collide with a .gitignore platform-baseline rule and would vanish on a fresh ` +
        `clone: ${offenders.join(", ")}`,
    ).toEqual([]);
  });
});
