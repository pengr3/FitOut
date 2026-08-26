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

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

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
  MalformedTransformationValueError,
  presetDrift,
  UnknownTransformationKeyError,
  type RemotePreset,
} from "../../scripts/cloudinary-preset";

const SCRIPT_PATH = "scripts/cloudinary-preset.ts";

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

    // ⚠ THE ONE ROW NOT CONFIRMED AGAINST A LIVE GET. E12's preset predates the format-conversion
    // component, so the long key the vendor returns for `f_` was never measured. `fetch_format` is
    // this script's explicit guess, and THIS LINE IS WHERE THE CORRECTION LANDS when plan 16.1-07's
    // real `--verify` run observes the true spelling. It is pinned rather than left loose precisely
    // so the change is deliberate and one line, made with the evidence in hand.
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
 * The single transformation component the Admin API should return for our declaration, in the shape
 * probe E12 measured. Built from the IMPORTED edge cap, so a moved `LISTING_MAX_EDGE_PX` moves the
 * fixture with it — and built from LITERALS for the non-numeric keys, deliberately independent of
 * `canonicalizeTransformation`, so describe 2 is not asserting the parser against itself.
 */
const MATCHING_COMPONENT: Record<string, string | number> = {
  crop: "limit",
  width: LISTING_MAX_EDGE_PX,
  height: LISTING_MAX_EDGE_PX,
  quality: "auto",
  fetch_format: "auto",
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
