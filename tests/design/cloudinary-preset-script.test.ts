// The reconciler's pure half, and the property that is the entire reason the reconciler is worth
// having.
//
// ── WHAT THE SCRIPT IS FOR, STATED SO THE THIRD DESCRIBE READS AS THE POINT AND NOT AS PEDANTRY ──
// `scripts/cloudinary-preset.ts` exists so that the Cloudinary upload preset and this repository
// CANNOT DISAGREE (rule F2, 16.1-RESEARCH § R-1.6 layer 4). The preset carries the incoming
// transformation that bounds a stored asset and drops its GPS IFD, and the format list that refuses
// a vector document at the boundary. Those settings live on the account, not in git — so the script
// is the committed bridge between the declaration and the account.
//
// A SCRIPT THAT RE-TYPED THE TRANSFORMATION WOULD BE WORSE THAN NO SCRIPT AT ALL. It would be a
// SECOND COPY of the value, wearing the costume of a consistency tool: `--verify` would pass while
// comparing the account against the script's own private spelling rather than against the
// declaration, and the day `LISTING_MAX_EDGE_PX` moved, the reconciler would confidently report
// agreement with a preset that no longer matched the repo. That is a green that means nothing —
// the failure mode `scripts/verify-workflows.mjs:53-56` names one layer up. Describe 3 is what
// keeps it impossible.
//
// ── WHY IT LIVES IN `tests/design/`, WITH THE CONSEQUENCE STATED ────────────────────────────────
// Every assertion here is pure: no network, no credential, no clock, no database. 16.1-PATTERNS C-2
// and the `tests/design/avatar-zoom.test.ts:13-20` precedent put such a file here, which buys two
// things — it runs inside `npm run build` (`lint && test:design && next build`), so the rule-F2
// property is build-blocking; and it pays no Postgres preflight, so it holds on a machine with no
// Docker. The cost, so nobody rediscovers it: `npx vitest run tests/listing` does NOT collect this
// file, and neither does `npm test`. `npm run test:design` does.
//
// ⚠ THIS FILE MUST NOT REACH `src/lib/cloudinary.ts`. `vitest.design.config.ts` has no
// `setupFiles` by design, so there is no cloudinary mock here. The module under test imports
// exactly one repo module — the declaration — and node builtins, which is what keeps that true.
//
// ── IMPORTING THE SCRIPT MUST NOT RUN THE SCRIPT ────────────────────────────────────────────────
// `scripts/cloudinary-preset.ts` ends in an entry-point guard: the CLI runs only when
// `process.argv[1]` resolves to the module's own path. Under Vitest it never does. Without that
// guard, the import at the top of THIS file would parse `process.argv` (the vitest runner's), find
// no `--apply` or `--verify`, print a usage banner and `process.exit(1)` — a unit test file that
// kills its own runner. The behavioural proof of the guard is that this suite runs at all; the
// structural proof is in describe 3.
//
// ── OBSERVED RED — WR-05 AND WR-06, THE TWO DESCRIBES CLOSING THE REVIEW'S GAPS ─────────────────
// All six mutations below were applied to `scripts/cloudinary-preset.ts`, run, transcribed, then
// reverted with `git checkout --` and the diff verified empty afterwards. Taken 2026-08-28.
//
// MUTATION 1 — the `--bogus` branch's `process.exitCode = 1;` changed to `= 2;`. One red, and only
// the parameterized case for that branch — the other two hard stops stayed green, which is the
// point of exercising all three rather than trusting one to stand for the contract:
//
//    ❯ tests/design/cloudinary-preset-script.test.ts (28 tests | 1 failed) 23ms
//        × main() exits 1, never exit 3's 'could not run', on an unrecognised argument 8ms
//
//    AssertionError: expected 2 to be 1 // Object.is equality
//
// MUTATION 2 — a dead `if (false) process.exit(2);` line added inside `printUsage`. Never reached at
// runtime, and every behavioural test stayed green — proving the prohibition really is a SOURCE
// property, not a reachability one:
//
//    ❯ tests/design/cloudinary-preset-script.test.ts (28 tests | 1 failed) 51ms
//        × never calls process.exit() — only process.exitCode — so a mid-fetch socket close cannot
//          corrupt the exit status 14ms
//
//    AssertionError: expected '\n\n\n\n\n…' not to match /process\.exit\(/
//
// MUTATION 3 — the scan's predicate flipped from `entry?.unsigned !== false` to
// `entry?.unsigned === true`, i.e. WR-06's exact original bug reintroduced:
//
//    ❯ tests/design/cloudinary-preset-script.test.ts (28 tests | 1 failed) 26ms
//        × the predicate is `unsigned !== false`, never `unsigned === true` — WR-06's exact
//          regression 10ms
//
//    AssertionError: expected '\n  let cursor: string | undefined;\n…' to contain
//    'entry?.unsigned !== false'
//
// MUTATION 4 — the cursor-follow assignment collapsed to a flat `cursor = undefined;`, so the scan
// can no longer see a preset past the first page:
//
//    ❯ tests/design/cloudinary-preset-script.test.ts (28 tests | 1 failed) 24ms
//        × follows `next_cursor` — a preset past the first page is not invisible to the scan 8ms
//
//    AssertionError: expected '\n  let cursor: string | undefined;\n…' to contain 'page?.next_cursor'
//
// MUTATION 5 — `reportCheck`'s ok argument narrowed from `notProvablySigned.length === 0 &&
// !truncated` to `notProvablySigned.length === 0`, dropping the truncation flag from the verdict:
//
//    ❯ tests/design/cloudinary-preset-script.test.ts (28 tests | 1 failed) 25ms
//        × MAX_SCAN_PAGES bounds the loop, and hitting it FAILS the check rather than passing on a
//          partial read 11ms
//
//    AssertionError: expected '\n  let cursor: string | undefined;\n…' to contain
//    'notProvablySigned.length === 0 && !truncated'
//
// MUTATION 6 (supplementary — the OTHER anchor in the same `it`) — the page-cap condition replaced
// with `if (false) {`, removing the bound entirely rather than only the AND clause:
//
//    ❯ tests/design/cloudinary-preset-script.test.ts (28 tests | 1 failed) 65ms
//        × MAX_SCAN_PAGES bounds the loop, and hitting it FAILS the check rather than passing on a
//          partial read 25ms
//
//    AssertionError: expected '\n  let cursor: string | undefined;\n…' to contain
//    'pages >= MAX_SCAN_PAGES'
//
// Nothing else went red under any of the six — each mutation reddened exactly the test built to
// catch it, and reverting brought `git diff --exit-code scripts/` back to exit 0 every time.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";

import {
  LISTING_ALLOWED_FORMATS,
  LISTING_INCOMING_TRANSFORMATION,
  LISTING_MAX_EDGE_PX,
  LISTING_UPLOAD_PRESET,
} from "@/lib/listing/upload-policy";
import { stripComments } from "../helpers/source-text";
import {
  canonicalizeTransformation,
  DECLARED_PRESET,
  main,
  MalformedTransformationValueError,
  presetDrift,
  UnknownTransformationKeyError,
  type RemotePreset,
} from "../../scripts/cloudinary-preset";

const SCRIPT_PATH = "scripts/cloudinary-preset.ts";

/**
 * The account-wide unsigned-preset scan inside `runVerify` (WR-06), isolated from the rest of the
 * file.
 *
 * Narrowed because the predicate under test — `unsigned !== false` — is not unique to the scan:
 * `presetDrift`'s own `unsigned` check (line ~326) uses the identical spelling for the identical
 * reason (WR-06's whole point is that the two must agree), so a whole-file assertion could not tell
 * "the scan carries the correct predicate" from "the scan happens to sit in a file that also
 * contains `presetDrift`'s line". Narrowing to the scan's own block — from its `presets` accumulator
 * to its final `return` — is what makes each prohibition below a statement about the SCAN.
 */
function accountScanRegion(code: string): string {
  const match = /const presets: RemotePreset\[\] = \[\];([\s\S]*?)return failures;/.exec(code);
  if (!match) {
    throw new Error(
      `Could not find the account-wide scan block in ${SCRIPT_PATH}. If runVerify was ` +
        `restructured, this narrowing must be rewritten — it must never silently match nothing.`,
    );
  }
  return match[1];
}

// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("canonicalizeTransformation — total over our own declaration, hostile to anything else", () => {
  it("parses every component of the declared transformation into the vendor's long-key shape", () => {
    // The INPUT is imported, never retyped — feed it a literal here and this test would pin a
    // string the script has never seen. The OUTPUT is spelled out, because the mapping is the thing
    // under test and asserting it against the table would be asserting the table against itself.
    const canonical = canonicalizeTransformation(LISTING_INCOMING_TRANSFORMATION);

    expect(canonical.crop).toBe("limit");
    expect(canonical.quality).toBe("auto");

    // NUMBERS, not strings. Probe E12 measured the Admin API returning the dimensions as numbers,
    // and `presetDrift` compares with `!==` — so a canonicaliser that left them as strings would
    // report drift against a perfectly correct preset, forever.
    expect(canonical.width).toBe(LISTING_MAX_EDGE_PX);
    expect(canonical.height).toBe(LISTING_MAX_EDGE_PX);
    expect(typeof canonical.width).toBe("number");
    expect(typeof canonical.height).toBe("number");

    // ⚠ THIS ROW IS NOW MEASURED, AND THE ANSWER WAS NOT A RENAME. Plan 16.1-07's live `--verify`
    // run on 2026-08-27 read the created preset back: the vendor returns NO key for the
    // format-conversion component at all. The persisted object carries four keys and this one is
    // absent from every one of them.
    //
    // THE PIN STAYS EXACTLY AS IT WAS, and that is the point rather than an oversight. This assertion
    // is about the PARSER, not about the account: the declaration still spells that component, so
    // `canonicalizeTransformation` must still turn it into something rather than throw — and if it
    // silently dropped it, the coverage assertion below would go red. What the measurement changed is
    // what the ABSENCE of this key on a remote preset MEANS, which lives in `VENDOR_NORMALISES_AWAY`
    // in the script and is pinned by the fixture below.
    expect(canonical.fetch_format).toBe("auto");
  });

  it("covers the declaration exactly — no component silently dropped, none invented", () => {
    // A canonicaliser that skipped a token it did not understand would produce a SHORTER object and
    // a `--verify` that checked fewer properties than it printed. Counting is how that is caught.
    const canonical = canonicalizeTransformation(LISTING_INCOMING_TRANSFORMATION);
    expect(Object.keys(canonical).sort()).toEqual([
      "crop",
      "fetch_format",
      "height",
      "quality",
      "width",
    ]);
    expect(Object.keys(canonical)).toHaveLength(
      LISTING_INCOMING_TRANSFORMATION.split(",").length,
    );
  });

  it("THROWS on an unknown short prefix rather than skipping it", () => {
    // THE THROW IS THE FAIL-CLOSED BEHAVIOUR, and it is the whole reason this function is not a
    // best-effort parser. A silent skip is the shape that lets a vendor rename — or a component
    // somebody adds in the dashboard — produce a GREEN `--verify` that checked nothing about it.
    // "I did not understand this" and "this agrees with the declaration" must never be the same
    // outcome; a checker that reports success after checking nothing is worse than one that fails,
    // because the green is indistinguishable from a real one (verify-workflows.mjs:53-56).
    expect(() => canonicalizeTransformation("x_nonsense")).toThrow(
      UnknownTransformationKeyError,
    );
    expect(() => canonicalizeTransformation("bogus")).toThrow(
      UnknownTransformationKeyError,
    );
    // Alongside a perfectly valid component, so a passing majority cannot excuse the unknown one.
    expect(() =>
      canonicalizeTransformation(`${LISTING_INCOMING_TRANSFORMATION},dpr_2.0`),
    ).toThrow(UnknownTransformationKeyError);
  });

  it("THROWS on a dimension whose value is not a number", () => {
    // `w_auto` is real Cloudinary grammar, so this is not a contrived input. It cannot be compared
    // against a numeric remote value, and coercing it to NaN would make every comparison false in a
    // way that reads as drift rather than as "this preset is not one this tool can check".
    expect(() => canonicalizeTransformation("w_auto")).toThrow(
      MalformedTransformationValueError,
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The single transformation component the Admin API ACTUALLY returns for our declaration. Built from
 * the IMPORTED edge cap, so a moved `LISTING_MAX_EDGE_PX` moves the fixture with it — and built from
 * LITERALS for the non-numeric keys, deliberately independent of `canonicalizeTransformation`, so
 * describe 2 is not asserting the parser against itself.
 *
 * ⚠ FOUR KEYS, NOT FIVE, AND `fetch_format` IS MISSING ON PURPOSE. Do not "complete" this fixture.
 * Probe E12's shape had five because E12 predated the format-conversion component; plan 16.1-07's
 * live run on 2026-08-27 created the preset from this repo's own declaration and read it straight
 * back, and what came back had exactly these four keys. The vendor APPLIES the format conversion at
 * upload — proven by a controlled pair of probe uploads, with and without the preset, on a real file
 * whose stored format changed only in the WITH case — but it does not PERSIST that component in the
 * preset it hands back.
 *
 * SO THIS FIXTURE IS THE MEASUREMENT, and the assertion that `presetDrift` returns `[]` for it is
 * what keeps the tool from crying wolf on a correct account. Add the fifth key back and this file
 * goes green while the real `--verify` reds — a fixture asserting the shape we wish the vendor used.
 * The script's `VENDOR_NORMALISES_AWAY` carries the full measurement and the reason.
 */
const MATCHING_COMPONENT: Record<string, string | number> = {
  crop: "limit",
  width: LISTING_MAX_EDGE_PX,
  height: LISTING_MAX_EDGE_PX,
  quality: "auto",
};

/** A remote preset that agrees with the declaration in every checked respect. */
function matchingRemote(): RemotePreset {
  return {
    name: LISTING_UPLOAD_PRESET,
    unsigned: false,
    settings: {
      transformation: [{ ...MATCHING_COMPONENT }],
      allowed_formats: [...LISTING_ALLOWED_FORMATS],
    },
  };
}

describe("presetDrift — reports the drift it should, and none it should not", () => {
  it("is EMPTY for a preset that matches the declaration", () => {
    // The other direction of the both-directions rule. Without this, a `presetDrift` that returned
    // a line for everything would make every case below pass while the tool cried wolf on a
    // correct account — and an alarm that always fires is an alarm nobody re-runs.
    expect(presetDrift(matchingRemote(), DECLARED_PRESET)).toEqual([]);
  });

  it("still reports a PRESENT `fetch_format` that disagrees — the exemption is absence-only", () => {
    // THE BOUNDARY OF THE ONE EXEMPTION, PINNED SO IT CANNOT WIDEN. `VENDOR_NORMALISES_AWAY` excuses
    // this key being ABSENT, because the vendor measurably drops it from the persisted preset while
    // still applying it. It excuses nothing else. An exemption whose edge is unpinned is how a
    // narrow, measured allowance becomes a blanket skip in a later edit — and a blanket skip here is
    // the vacuous green this whole file exists to make impossible.
    const remote = matchingRemote();
    remote.settings = {
      ...remote.settings,
      transformation: [{ ...MATCHING_COMPONENT, fetch_format: "not-what-we-declared" }],
    };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports a preset saved under a different name", () => {
    const remote = { ...matchingRemote(), name: `${LISTING_UPLOAD_PRESET}-copy` };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports `unsigned: true` — the standing upload hole (T-16.1-08)", () => {
    // An unsigned preset accepts uploads from anyone who knows its name, with no signature and
    // therefore no sign-route gate in front of it. 16.1-RESEARCH § R-1.6 layer 4 names this
    // explicitly as one of the three things `--verify` exists to catch.
    const remote = { ...matchingRemote(), unsigned: true };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports an absent or non-boolean `unsigned` rather than reading it as signed", () => {
    // `!== false`, not `=== true`. "The field was missing" must land on the refusing side.
    const remote = { ...matchingRemote(), unsigned: undefined };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports a CHAINED second transformation component", () => {
    // Two components is not "the declaration plus a harmless extra". Cloudinary applies them in
    // order, so a second component can undo the first — this is the dashboard-side shape of the
    // same widening that `tests/listing/cloudinary-sign.test.ts` refuses at the route boundary.
    const remote = matchingRemote();
    remote.settings = {
      ...remote.settings,
      transformation: [{ ...MATCHING_COMPONENT }, { crop: "scale", width: 4000 }],
    };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports a width above the declared cap — CRITERION 3's exact regression", () => {
    // Criterion 3 is "the stored photo is bounded in pixels and bytes, and the client cannot
    // influence it". The whole of criterion 3 and criterion 5 is carried by this one number living
    // on the preset. A dashboard edit that doubled it would leave every gate in the repo green —
    // the sign route still requires the preset, the widget still names it, uploads still succeed —
    // while the stored asset quietly stopped being bounded at the size the repo declares. THIS LINE
    // is the only thing in the codebase that can see that edit.
    const remote = matchingRemote();
    remote.settings = {
      ...remote.settings,
      transformation: [
        { ...MATCHING_COMPONENT, width: LISTING_MAX_EDGE_PX * 2, height: LISTING_MAX_EDGE_PX * 2 },
      ],
    };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports an UNRECOGNISED vendor key on the remote component — never a silent skip", () => {
    // The mirror of describe 1's throw, on the side the vendor controls. A returned long key this
    // script's table does not know cannot be compared, so reporting agreement about the object it
    // sits on would be a claim the tool has not earned. This is also the safety net under the
    // unconfirmed `f_` row: if the vendor's real spelling is something else, `--verify` says so
    // loudly with the raw payload printed rather than passing.
    const remote = matchingRemote();
    remote.settings = {
      ...remote.settings,
      transformation: [{ ...MATCHING_COMPONENT, angle: 90 }],
    };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports a format the declaration accepts that the account does not", () => {
    // The picker offering a format the boundary refuses is a user-visible split: the host picks a
    // photo the widget accepted and the upload fails at Cloudinary with a sentence FitOut did not
    // write. One array with two consumers is the only way that cannot happen (D-184, rule F2).
    const remote = matchingRemote();
    remote.settings = {
      ...remote.settings,
      allowed_formats: LISTING_ALLOWED_FORMATS.filter((format) => format !== "heic"),
    };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports a format the account accepts that the declaration does not — CRITERION 2's exact regression", () => {
    // Criterion 2 is "only real raster formats; SVG refused". The refusal is the PRESET's
    // `allowed_formats` and nothing else: probe E9 measured `400 Raw file format svg not allowed`
    // at the boundary, and probe E-SVG measured that a vector document survives the transformation
    // VERBATIM with its script element intact, because a re-encode does not touch it. Add the entry
    // back on the dashboard and criterion 2 is silently false while every test in the repo is
    // green. This is the assertion that makes the account's copy of that list checkable.
    const remote = matchingRemote();
    remote.settings = {
      ...remote.settings,
      allowed_formats: [...LISTING_ALLOWED_FORMATS, "svg"],
    };
    expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
  });

  it("reports a transformation that is not an array of one object at all", () => {
    // The vendor handing back a bare string, or nothing, is not "no drift to report".
    for (const transformation of [undefined, null, "c_limit,w_100", [], [null]]) {
      const remote = matchingRemote();
      remote.settings = { ...remote.settings, transformation };
      expect(presetDrift(remote, DECLARED_PRESET).length).toBeGreaterThan(0);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("rule F2 — the script re-spells nothing the declaration owns", () => {
  // Read ONCE, comment-stripped ONCE. Stripping is mandatory and not a nicety: the script's header
  // necessarily argues about the transformation, the preset and the formats in order to explain
  // what it reconciles, so a whole-file `not.toContain` would be RED against a correct file. That
  // is the falsely-red half of the finding `scripts/verify-workflows.mjs:24-32` measured, and
  // `tests/helpers/source-text.ts` is this phase's one agreed way around it.
  //
  // ⚠ MEASURED WHILE WRITING THIS FILE, 2026-08-26, and recorded because it cost a real debugging
  // pass: the stripper is a regex, not a parser, and a slash-star sequence inside a LINE comment
  // opens a block comment as far as it is concerned. The script's header originally spelled the
  // tsconfig path alias with its glob, which swallowed the file's own import statement and made the
  // first assertion below fail against a correct script. The fix was in the script's prose, not
  // here. Anyone adding a header paragraph to a file asserted over this way must keep that sequence
  // out of it.
  const CODE = stripComments(readFileSync(resolve(process.cwd(), SCRIPT_PATH), "utf8"));

  it("imports the declaration", () => {
    // The positive half. Without it, every prohibition below would pass vacuously against a script
    // that had simply deleted the import and hard-coded everything.
    expect(CODE).toContain("@/lib/listing/upload-policy");
  });

  it("the file really was read, and is the one that exports the diff", () => {
    // Guards the path and the strip. A typo in SCRIPT_PATH makes readFileSync throw, but a stale
    // read, an empty file, or a stripper that returned "" would make every assertion here vacuous —
    // the same both-directions rule `tests/design/avatar-zoom.test.ts:247-258` applies to its
    // directive detector.
    expect(CODE).toContain("presetDrift");
    expect(CODE).toContain("canonicalizeTransformation");
  });

  it("keeps the entry-point guard, so importing it here cannot run the CLI", () => {
    // The structural half of the note in this file's header. The behavioural half is that this
    // suite runs at all: an unguarded script would have printed a usage banner and exited 1 during
    // the import above, killing the runner before a single assertion.
    expect(CODE).toContain("process.argv[1]");
    expect(CODE).toContain("import.meta.url");
  });

  it("spells NONE of the values the declaration owns", () => {
    // THIS IS THE ASSERTION THE WHOLE FILE IS FOR. It is what keeps the one-declaration property
    // alive through a later "just hard-code it for clarity" edit — the reviewer who makes that edit
    // is pointed at rule F2 and at the reasoning in this file's header, rather than being left to
    // rediscover why a reconciler with its own private copy of the transformation is a lie.
    // `tests/listing/cloudinary-provenance.test.ts:305-320` establishes the technique; this is the
    // same idea aimed at a script instead of a module.
    expect(CODE).not.toContain(LISTING_UPLOAD_PRESET);
    expect(CODE).not.toContain("fitout_listing_v1");
    expect(CODE).not.toContain("c_limit");
    expect(CODE).not.toContain(String(LISTING_MAX_EDGE_PX));
    expect(CODE).not.toContain("2048");
    expect(CODE).not.toContain("10485760");
    expect(CODE).not.toContain(LISTING_INCOMING_TRANSFORMATION);
  });

  it("spells none of the six accepted formats", () => {
    // Separate from the case above so a failure names WHICH half regrew. The format list is the
    // one the widget's client-side hint reads from too; a second copy here is how the picker and
    // the boundary come to disagree about six strings.
    for (const format of LISTING_ALLOWED_FORMATS) {
      expect(CODE, `the script must not spell the format "${format}"`).not.toContain(format);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WR-05 — the exit-code contract. `main`'s three credential-free hard stops are placed BEFORE any
// credential work specifically so they are reachable with no environment at all (the script's own
// comment at `main`'s top says so), which is what makes this describe possible: no network, no
// credential, no database.
//
// ⚠ HAZARD, READ BEFORE TOUCHING THIS DESCRIBE. `main()` sets `process.exitCode` as a real side
// effect on the actual Node process running this test file. Left set, it would make the WHOLE
// `vitest run` process exit non-zero even with every test green — a global side effect from a "pure"
// unit test. Every case below saves the ambient value up front and restores it in `afterEach`, and
// `console.error`/`console.log` are spied and silenced because every hard-stop path in `main` prints
// a usage banner.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("WR-05 — main()'s credential-free hard stops exit 1, the code the contract reserves for drift-or-hard-stop", () => {
  const ambientExitCode = process.exitCode;

  afterEach(() => {
    process.exitCode = ambientExitCode;
    vi.restoreAllMocks();
  });

  it.each<[string, readonly string[]]>([
    ["an unrecognised argument", ["--bogus"]],
    ["no mode given at all", []],
    ["both modes given at once", ["--apply", "--verify"]],
  ])("main() exits 1, never exit 3's 'could not run', on %s", async (_label, argv) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "log").mockImplementation(() => {});
    process.exitCode = undefined;

    await main(argv);

    // Exit 3 is reserved for "the tool could not run" (no credential, a rejected one, a silent
    // Admin API) and is explicitly NOT what any of these three cases are: each is a hard stop the
    // script can and does detect with zero environment. Reading 1 here — not 3, not 0, not left
    // `undefined` — is the entire contract 16.1-03-PLAN Task 1's automated verify pins with
    // `test $? -eq 1`, and it is exercised behaviourally here rather than only by a human re-running
    // the CLI by hand.
    expect(process.exitCode).toBe(1);
  });

  it("never calls process.exit() — only process.exitCode — so a mid-fetch socket close cannot corrupt the exit status", () => {
    const code = stripComments(readFileSync(resolve(process.cwd(), SCRIPT_PATH), "utf8"));

    // ANCHOR FIRST. Without proving the read+strip actually found exit-code assignments, a stale
    // read or an over-eager strip could make the prohibition below pass over nothing.
    expect(code).toContain("process.exitCode = 1");
    expect(code).toContain("process.exitCode = 3");

    // THE PROHIBITION. `process.exit()` tears the process down synchronously; called while an undici
    // socket from a `fetch` above is still closing, it corrupts the exit status to 127 (measured on
    // this machine, per the script's own header) — and the branch it fired on that one time was the
    // one meaning THE SECURITY CONTROL IS MISSING. `process.exitCode` never matches this pattern,
    // because the regex requires the literal open-paren that only a call carries.
    expect(code).not.toMatch(/process\.exit\(/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// WR-06 — the account-wide unsigned scan fails CLOSED and follows the cursor. The scan lives inside
// `runVerify`, which is not exported and needs a live Admin API credential this design config
// structurally cannot hold (`T-11-CISECRET`) — so, per this phase's established pattern for exactly
// this situation (`tests/design/photo-uploader-options.test.ts`'s header), the inputs are pinned as a
// SOURCE assertion over the isolated scan block rather than left unpinned because the behaviour
// cannot be driven.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

describe("WR-06 — the account-wide unsigned scan fails CLOSED and follows the cursor", () => {
  // Read ONCE, comment-stripped ONCE, and then narrowed ONCE — matching describe 3's own convention
  // above, restated here because this describe reads the file independently of it.
  const CODE = stripComments(readFileSync(resolve(process.cwd(), SCRIPT_PATH), "utf8"));
  const SCAN = accountScanRegion(CODE);

  it("the scan block was really found, and still contains the check it reports", () => {
    // ANCHOR. Without this, a narrowing regex that silently matched the empty string — or matched
    // the wrong block after a refactor — would make every prohibition below pass vacuously, the same
    // both-directions rule this phase applies everywhere it strips or narrows source.
    expect(SCAN).toContain("reportCheck");
    expect(SCAN).toContain("every preset on the account is provably signed");
  });

  it("the predicate is `unsigned !== false`, never `unsigned === true` — WR-06's exact regression", () => {
    // The whole of WR-06 in one line. `presetDrift`'s own `unsigned` check states the rule out loud:
    // an absent, stringified or otherwise non-boolean `unsigned` must land on the REFUSING side,
    // because "we could not tell" must not read as "it is signed". `=== true` is the identical
    // sentence with the polarity inverted — if the list endpoint ever omits the field or returns it
    // as a string, every entry would count as signed and the check would print an empty list: a
    // green indistinguishable from a real one, on the control this file calls a standing upload hole.
    expect(SCAN).toContain("entry?.unsigned !== false");
    expect(SCAN).not.toContain("unsigned === true");
  });

  it("follows `next_cursor` — a preset past the first page is not invisible to the scan", () => {
    // Three anchors for one behaviour: the request carries the cursor forward, the response's cursor
    // is read back, and the loop condition is what makes it a loop rather than a single page. Any one
    // of the three going missing silently caps the scan at the first `max_results=500` page.
    expect(SCAN).toContain("page?.next_cursor");
    expect(SCAN).toContain("next_cursor=${encodeURIComponent(cursor)}");
    expect(SCAN).toContain("while (cursor !== undefined)");
  });

  it("MAX_SCAN_PAGES bounds the loop, and hitting it FAILS the check rather than passing on a partial read", () => {
    expect(SCAN).toContain("pages >= MAX_SCAN_PAGES");
    // The `truncated` flag must be ANDed into the boolean `reportCheck` uses to decide the exit code
    // — never merely printed as evidence beside a check that already reported `ok`. A truncated scan
    // that still passes would be exactly the vacuous green this whole file exists to prevent; this is
    // the one line that makes truncation a FAILURE rather than a footnote.
    expect(SCAN).toContain("notProvablySigned.length === 0 && !truncated");
  });
});
