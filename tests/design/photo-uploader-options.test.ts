// The six option changes on `<CldUploadWidget>`, pinned as SOURCE — because source is the only
// honest thing to pin here.
//
// ── THE HONEST LIMIT ON WHAT THIS FILE CAN PROVE, STATED UP FRONT ────────────────────────────────
// The widget's actual behaviour lives in a CROSS-ORIGIN IFRAME OF VENDOR CODE. What happens when a
// host picks a 12 MB file, or a vector document, or a HEIC, is decided by Cloudinary's widget inside
// that iframe — not by anything in this repository. CI cannot drive it: it holds no Cloudinary
// credential BY DESIGN (`T-11-CISECRET`, `.github/workflows/ci.yml:151` and `:875`), so there is no
// version of this file that watches a real refusal happen.
//
// What IS provable, completely and cheaply, is WHICH OPTIONS WE PASS. That is the property this file
// owns, and it is worth owning: every one of the six changes is a value that renders identically to
// a wrong one, and five of the six are the sort of thing a later "tidy" removes without any test
// going red. The behavioural halves — an `.svg` picked in the widget showing the wrong-format
// sentence, an over-size file showing the too-big sentence, a HEIC that uploads AND renders — are
// NAMED HUMAN STEPS in plan 16.1-07's UAT. Writing an acceptance criterion no executor could satisfy
// would be worse than naming the gap, so the gap is named.
//
// ── IT READS THE SOURCE; IT DOES NOT IMPORT THE COMPONENT ───────────────────────────────────────
// `vitest.design.config.ts` has NO `setupFiles` and NO `globalSetup`, by design (see its header).
// The component's import graph reaches `next-cloudinary`, `@dnd-kit`, `sonner` and the server-action
// module — so importing it here would drag vendor code into a config with no DOM setup and no mocks,
// to assert a property that is textual anyway. `tests/design/cloudinary-preset-script.test.ts` and
// `tests/listing/cloudinary-sign.test.ts` both take the same route for the same reason.
//
// Comments are STRIPPED before every assertion, and that is load-bearing rather than tidy: the
// correct file necessarily NAMES `url`, the webcam source and the old ten-megabyte sentence in order
// to explain that they are gone. A whole-file prohibition would be falsely RED against the correct
// file — the mirror failure `scripts/verify-workflows.mjs:24-32` measured and
// `tests/helpers/source-text.ts` exists to answer.
//
// ── WHY IT LIVES IN `tests/design/`, WITH THE COST STATED ───────────────────────────────────────
// Every assertion here is a string comparison over a file on disk: no network, no credential, no
// DOM, no database. 16.1-PATTERNS § C-2 and the `tests/design/avatar-zoom.test.ts:13-20` precedent
// put such a file here, which buys build-blocking (`npm run build` is `lint && test:design && next
// build`) with no Postgres preflight. The cost, so nobody rediscovers it: `npx vitest run
// tests/listing` does NOT collect this file, and neither does `npm test`. `npm run test:design` does.
//
// ── OBSERVED RED — the three ways these options could silently regress ─────────────────────────
// A gate that has never been watched failing is a rubber stamp. All three mutations below were
// applied to `src/components/listing/photo-uploader.tsx`, run, transcribed and reverted with the
// diff verified empty afterwards. MUTATIONS 1 and 2: 2026-08-26. MUTATION 3: 2026-08-28.
//
// MUTATION 1 — the preset moved from the PROP into `options`. This is the regression the ordering
// hazard in the component's own comment describes, and NOTHING ELSE IN THE REPO WOULD SEE IT: the
// name is still there, still imported, still spelled once. Two independent reds:
//
//    ❯ tests/design/photo-uploader-options.test.ts (16 tests | 2 failed) 70ms
//        × D-194 — the preset is a TOP-LEVEL PROP, passed from the imported constant 17ms
//        × the preset is NEVER an `options` key — the prop-vs-options ordering hazard 26ms
//
//    AssertionError: the preset must be the top-level prop `uploadPreset={LISTING_UPLOAD_PRESET}`,
//    exactly once — it is what puts the preset key into the widget's own paramsToSign, which the
//    sign route now refuses to mint a signature without: expected +0 to be 1 // Object.is equality
//
//    AssertionError: `uploadPreset:` appears as an options key. `next-cloudinary` spreads `options`
//    LAST, so a key there silently WINS over the prop — and the failure is invisible until the
//    widget stops sending the preset the sign route requires.
//
// MUTATION 2 — the remote-address source re-added to `sources`. Also two reds, and the second is the
// one that matters, because a THIRD source added later would slip past a `toContain` alone:
//
//    ❯ tests/design/photo-uploader-options.test.ts (16 tests | 2 failed) 78ms
//        × D-185 — `sources` is local files only 47ms
//        × neither the remote-address source nor the webcam source is offered 9ms
//
//    AssertionError: expected '"use client";\r\n\r\n\r\n\r\n\r\n\r\n…' to contain 'sources: ["local"]'
//
//    AssertionError: the widget must not offer the remote-address source (T-16.1-15): it hands
//    Cloudinary an arbitrary address to fetch, leaving NO LOCAL FILE TO MEASURE, so the byte ceiling
//    and the format list are both defeated by construction rather than by a bug:
//    expected '"use client";\r\n\r\n\r\n\r\n\r\n\r\n…' not to match /["']url["']/
//
// The received value rendering as a field of newlines is `stripComments` working exactly as
// designed — this component is now mostly argument. It is also the demonstration, on this phase's
// own file, of the falsely-GREEN half of the `verify-workflows.mjs:24-32` finding: an unstripped
// whole-file prohibition would have been green under mutation 2, because the correct component
// necessarily NAMES the remote-address source in prose in order to explain that it is gone.
//
// MUTATION 3 — ⟨TRANSCRIPT PENDING: task 2 applies `transformation: "c_limit,w_4096"` inside the
// widget's `options`, runs, transcribes it here, and reverts.⟩

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  LISTING_ALLOWED_FORMATS,
  LISTING_MAX_BYTES,
  LISTING_MAX_PHOTOS,
  LISTING_UPLOAD_PRESET,
} from "@/lib/listing/upload-policy";
import { stripComments } from "../helpers/source-text";

const COMPONENT_FILE = "src/components/listing/photo-uploader.tsx";

/** The component's source with every comment removed — the text every assertion below reads. */
const CODE = stripComments(
  readFileSync(resolve(process.cwd(), COMPONENT_FILE), "utf8"),
);

/** Occurrences of `needle` in `haystack`. Used where "at least once" is not the property. */
function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

/**
 * The `options={{ … }}` object literal, isolated.
 *
 * Narrowed because one prohibition — "no bare copy of the photo cap survives in the options" —
 * cannot be asserted over the whole file: `delayDuration={200}` further down contains those digits
 * as a substring, so a whole-file check would be falsely RED against a correct component. Narrowing
 * to a region is 16.1-PATTERNS § S-2's other precedented way out, used here alongside stripping.
 */
function optionsRegion(code: string): string {
  const match = /options=\{\{([\s\S]*?)\}\}/.exec(code);
  if (!match) {
    throw new Error(
      `Could not find the options object in ${COMPONENT_FILE}. If the widget was restructured, ` +
        `this narrowing must be rewritten — it must never silently match nothing.`,
    );
  }
  return match[1];
}

describe("the file was really read, and the strip really stripped", () => {
  // Without these two the whole file could pass vacuously: a typo in COMPONENT_FILE makes
  // readFileSync throw, but a stale read, an empty file, or a stripper that returned "" would make
  // every PROHIBITION below green while proving nothing. Same both-directions rule
  // `tests/design/avatar-zoom.test.ts:247-258` applies to its directive detector.
  it("the stripped source is the uploader's, and still contains code", () => {
    expect(CODE).toContain("CldUploadWidget");
    expect(CODE).toContain("export function PhotoUploader");
  });

  it("stripComments removes a token that lives ONLY in a comment, and keeps one in code", () => {
    // The fixture's only occurrence of the webcam source is inside a comment — exactly the shape
    // this component now has, since its comments name what they forbid in order to explain it.
    const onlyInAComment =
      'const sources = ["local"];\n' +
      '// the webcam source "camera" is named here, in prose, precisely because it is gone\n';
    expect(stripComments(onlyInAComment)).not.toContain('"camera"');
    expect(stripComments(onlyInAComment)).toContain('["local"]');

    // A block comment too — the stripper runs that pass first, and both passes must work or the
    // prohibitions below inherit a hole.
    const onlyInABlockComment =
      'const sources = ["local"];\n' + "/* not offered: \"camera\" */\n";
    expect(stripComments(onlyInABlockComment)).not.toContain('"camera"');

    // The other direction, which is the half that stops a silently-empty stripper passing
    // everything: a token in CODE must SURVIVE.
    const inCode = "// a plain comment\nconst sources = [\"camera\"];\n";
    expect(stripComments(inCode)).toContain('"camera"');
  });
});

describe("D-179 … D-195 — every option value the widget passes is imported", () => {
  it("reads the one declaration, by import specifier", () => {
    // The property behind every assertion in this describe. A value that agrees with the
    // declaration today but was typed out here is indistinguishable at runtime from an import —
    // which is why the pins below name IDENTIFIERS and forbid the literals they evaluate to.
    expect(CODE).toContain("@/lib/listing/upload-policy");
  });

  it("D-180 — `maxFileSize` is the imported ceiling, never the number", () => {
    expect(CODE).toContain("maxFileSize: LISTING_MAX_BYTES");
    expect(
      CODE,
      "the byte ceiling must be the imported identifier, not its digits — the declaration owns " +
        "the arithmetic AND the reason the spelling is load-bearing",
    ).not.toContain(String(LISTING_MAX_BYTES));
  });

  it("D-184 — `clientAllowedFormats` is a SPREAD of the same array the preset is built from", () => {
    // The spread, not a hand-typed copy: `avatar-field.tsx:461` is this repo's counter-example, and
    // it is what makes `validation/profile.ts:21-23`'s claim that the picker "reads it here"
    // aspirational rather than literal. The picker cannot offer what the boundary refuses only if
    // there is ONE array (RESEARCH F-3).
    expect(CODE).toContain("clientAllowedFormats: [...LISTING_ALLOWED_FORMATS]");
  });

  it("D-185 — `sources` is local files only", () => {
    expect(CODE).toContain('sources: ["local"]');
  });

  it("D-194 — the preset is a TOP-LEVEL PROP, passed from the imported constant", () => {
    // Not merely present: present EXACTLY ONCE and in prop position. `next-cloudinary` composes the
    // widget's options with the preset from this prop and then spreads `options` LAST over the
    // result, so the position is as load-bearing as the value.
    expect(
      count(CODE, "uploadPreset={LISTING_UPLOAD_PRESET}"),
      "the preset must be the top-level prop `uploadPreset={LISTING_UPLOAD_PRESET}`, exactly once — " +
        "it is what puts the preset key into the widget's own paramsToSign, which the sign route " +
        "now refuses to mint a signature without",
    ).toBe(1);
  });

  it("D-195 — `maxFiles` derives from the remaining count, inside the clamp", () => {
    // The clamp is part of the property, not incidental: the subtraction reaches 0 on a full
    // listing and 0 is falsy in an options object whose vendor semantics for it are UNMEASURED.
    expect(CODE).toContain("Math.max(1, LISTING_MAX_PHOTOS - photos.length)");
  });

  it("D-186 — the refusal sentence comes from the matcher, in `onError`", () => {
    expect(CODE).toContain("onError={(error) => toast.error(listingUploadRefusal(error))}");
  });
});

describe("the prohibitions — what the correct file names in prose and must not spell in code", () => {
  it("the preset is NEVER an `options` key — the prop-vs-options ordering hazard", () => {
    expect(
      CODE,
      "`uploadPreset:` appears as an options key. `next-cloudinary` spreads `options` LAST, so a " +
        "key there silently WINS over the prop — and the failure is invisible until the widget " +
        "stops sending the preset the sign route requires.",
    ).not.toContain("uploadPreset:");
  });

  it("neither the remote-address source nor the webcam source is offered", () => {
    expect(
      CODE,
      "the widget must not offer the remote-address source (T-16.1-15): it hands Cloudinary an " +
        "arbitrary address to fetch, leaving NO LOCAL FILE TO MEASURE, so the byte ceiling and the " +
        "format list are both defeated by construction rather than by a bug",
    ).not.toMatch(/["']url["']/);
    expect(CODE).not.toMatch(/["']camera["']/);
  });

  it("no `transformation` is passed from the client — the preset's ceiling stays the preset's", () => {
    // ANCHOR FIRST, because the read-guard at the top of this file does NOT cover this prohibition.
    // Its two anchors — `CldUploadWidget` and `export function PhotoUploader` — both sit OUTSIDE the
    // `options={{ … }}` body (`photo-uploader.tsx:205-263`), so a phantom block comment of the kind
    // 16.1-03 actually measured (a `/*` sequence inside a line comment, opening a block the stripper
    // then closes far below) could swallow the entire options object and leave that guard GREEN
    // while this prohibition passed over nothing. That is the falsely-GREEN half of the
    // `verify-workflows.mjs:24-32` finding. `optionsRegion` THROWS when it matches nothing, so
    // requiring it to still carry a real key makes a restructured widget report itself instead.
    expect(optionsRegion(CODE)).toContain("maxFiles:");

    // Then the prohibition — over the WHOLE stripped source, not over the region. Measured rather
    // than assumed: the raw component names `transformation` exactly ONCE, at `:211`, inside a `//`
    // comment saying the boundary is the transformation the PRESET carries, and `stripComments`
    // removes that occurrence completely — zero matches case-insensitively in `CODE`. So unlike the
    // photo-cap prohibition below, where `delayDuration={200}` puts those digits back outside any
    // comment and narrowing is forced, no narrowing is needed here; and the whole-file form is the
    // strictly stronger property, because it also catches a `transformation` grown on a second
    // widget, a helper or a prop rather than as an options key.
    expect(
      CODE,
      "the client must never pass a `transformation` (T-16.1-01). The stored-asset ceiling is the " +
        "PRESET's, and admitting this key hands it back to the caller — which is exactly what turns " +
        "the preset from a bound into a suggestion. The real boundary is `ALLOWED_SIGN_KEYS` " +
        "(`src/app/api/cloudinary/sign/route.ts:80` — four keys, this one deliberately absent, with " +
        "the reasoning at `:70-79`) plus the 400-before-the-signer gate at `:159-162`, so a key " +
        "regrown here would be REFUSED anyway. This pin is the second layer: without it that " +
        "refusal surfaces as an uploader broken in production instead of as a red test in CI.",
    ).not.toMatch(/transformation/i);
  });

  it("no flat photo cap survives — the widget and the server share ONE number", () => {
    expect(CODE).not.toContain("maxFiles: 20");
    expect(
      optionsRegion(CODE),
      "a bare copy of the photo cap is back in the options object — the rule-F2 violation D-195 " +
        "exists to close, where the widget and `listing-photo.ts` each held their own number",
    ).not.toContain(String(LISTING_MAX_PHOTOS));
  });

  it("no user-visible number and no user-visible sentence is authored in this component", () => {
    // The old toast promised a limit nothing in our code enforced (roadmap U1). Its replacement is
    // imported, and leaving the old sentence anywhere in the file would be a fourth copy of a number
    // the declaration now owns.
    expect(CODE).not.toContain("10MB");
    expect(CODE).not.toContain("10 MB");
    expect(CODE).not.toContain("didn't upload");
  });

  it("spells none of the six accepted formats, and not the preset name", () => {
    // Separate from the cases above so a failure names WHICH half regrew. A second copy of either
    // is how the picker's hint and the boundary's gate come to disagree.
    for (const format of LISTING_ALLOWED_FORMATS) {
      expect(
        CODE,
        `the component must not spell the format "${format}" — it spreads the imported array`,
      ).not.toMatch(new RegExp(`["']${format}["']`));
    }
    expect(CODE).not.toContain(LISTING_UPLOAD_PRESET);
    expect(CODE).not.toContain("fitout_listing_v1");
  });

  it("the widget's own localisation options stay unset", () => {
    // RESEARCH § I-2: `language` and `text` localise the widget's OWN strings — the English
    // sentences `listingUploadRefusal` matches on to tell the three refusal reasons apart. There is
    // no error code and no discriminant field, so rewriting that English silently collapses three
    // sentences into one. A cheap guard on a real coupling, not paranoia.
    expect(CODE).not.toContain("language:");
    expect(CODE).not.toContain("text:");
  });
});

describe("criterion 3 — confirm-unchanged, written as an assertion rather than a promise", () => {
  it("the render site is untouched: `src={photo.url}` appears exactly once", () => {
    // One of the eight render sites the phase must leave alone; the other seven are in files this
    // plan does not open. `f_auto` bakes the transformation into the STORED bytes, not into the
    // address, so the delivery url this renders is unchanged — and this file is the one place that
    // claim needs an assertion rather than a `git diff --exit-code`.
    expect(count(CODE, "src={photo.url}")).toBe(1);
  });
});
