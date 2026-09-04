// D-186 / D-193 — `listingUploadRefusal`, as a pure unit, enumerated against the strings Cloudinary
// actually sends.
//
// WHY THIS FILE EXISTS SEPARATELY. The uploader's integration surface proves the matcher is WIRED —
// that the widget's error handler calls it and that a toast carries the result. It cannot enumerate
// the input set cheaply, because every case there costs a signup, a listing insert, a session and a
// browser. This file is the ENUMERATION, and it drives the pure function directly: no DB, no mock,
// no network, no fixture image. Structure copied from `tests/listing/cloudinary-provenance.test.ts`
// and, through it, from `tests/security/safe-callback-url.test.ts` — two describes, everything the
// real pipeline produces maps correctly, then everything else lands on the safe fallback. The second
// half matters as much as the first.
//
// ⚠ THE HONEST LIMIT, UP FRONT RATHER THAN DISCOVERED LATER. The discriminator is a THIRD PARTY'S
// ENGLISH. `<CldUploadWidget>` hands its error handler an object with no error code, no enum and no
// discriminant field — 16.1-RESEARCH § I-2 read the real objects out of a real browser on
// 2026-08-26, and the reason a file was refused survives only inside a sentence Cloudinary wrote.
// This is the first place in this repository that matches on a vendor's prose, and § Pitfall 8 names
// the fragility rather than hiding it. The three fixtures below are quoted VERBATIM from that
// measurement; they are not invented, and re-deriving them means re-measuring in a browser, not
// guessing.
//
// WHY THIS SPEC IS AT `tests/design/`. Same reason as its sibling
// `tests/design/upload-policy.test.ts`, argued in full there: `vitest.config.ts` declares a
// `globalSetup` that hard-fails a run when Postgres is unreachable, and this file has no business
// paying a database preflight to compare three strings. Here it also runs inside `npm run build`
// (`lint && test:design && next build`), which is the whole point. The consequence:
// `npx vitest run tests/listing` does NOT collect it — `npm run test:design` does.
//
// SEQUENCING WORTH KNOWING WHILE READING THE CASES (§ I-2): for BOTH client-side refusals the widget
// still requests a signature from our endpoint, but makes NO post to Cloudinary. So a file refused
// for size or for format never reaches the vendor and never reaches `persistPhoto` — these sentences
// are the only record the host gets from us that anything happened.

import { describe, expect, it } from "vitest";

import {
  LISTING_TOO_LARGE_MESSAGE,
  LISTING_UPLOAD_FAILED_MESSAGE,
  LISTING_WRONG_FORMAT_MESSAGE,
  listingUploadRefusal,
} from "@/lib/listing/upload-policy";

/**
 * The three reasons, MEASURED in a real browser on 2026-08-26 by feeding files into the widget's own
 * cross-origin iframe (16.1-RESEARCH § I-2). Quoted exactly as delivered.
 */
const MEASURED = {
  tooBig: "File size (93.75 KB) exceeds maximum allowed (1000 Bytes)",
  wrongFormat: "File format not allowed",
  uploadFailed: "Invalid Signature deadbeef. String to sign - '…'",
} as const;

/**
 * The shape the widget ACTUALLY delivers: an object carrying the same sentence in both fields. The
 * union's other two members (a bare string and `null`) are both real too and are exercised below.
 */
function asWidgetError(status: string) {
  return { status, statusText: status };
}

/** Every input this file drives, so the totality case at the bottom can sweep the whole set. */
const EVERY_INPUT: readonly unknown[] = [
  asWidgetError(MEASURED.tooBig),
  asWidgetError(MEASURED.wrongFormat),
  asWidgetError(MEASURED.uploadFailed),
  MEASURED.tooBig,
  MEASURED.wrongFormat,
  MEASURED.uploadFailed,
  "File size (11.42 MB) exceeds maximum allowed (10485760 Bytes)",
  null,
  undefined,
  "",
  {},
  { statusText: MEASURED.tooBig },
  asWidgetError(""),
  { status: 413, statusText: MEASURED.tooBig },
  { status: null },
  "The file you picked is too large.",
  "That kind of file cannot be uploaded here.",
  0,
  false,
  [],
];

describe("D-186 — each measured reason lands on its own sentence", () => {
  it("too big → the size sentence, in both real shapes of the union", () => {
    expect(listingUploadRefusal(asWidgetError(MEASURED.tooBig))).toBe(
      LISTING_TOO_LARGE_MESSAGE,
    );
    expect(listingUploadRefusal(MEASURED.tooBig)).toBe(LISTING_TOO_LARGE_MESSAGE);
  });

  it("wrong format → the format sentence, in both real shapes of the union", () => {
    expect(listingUploadRefusal(asWidgetError(MEASURED.wrongFormat))).toBe(
      LISTING_WRONG_FORMAT_MESSAGE,
    );
    expect(listingUploadRefusal(MEASURED.wrongFormat)).toBe(
      LISTING_WRONG_FORMAT_MESSAGE,
    );
  });

  it("a failed upload → the upload-failed sentence, in both real shapes of the union", () => {
    // The measured spelling is a signature failure, which is the one the phase can produce on
    // purpose. Anything the vendor says that is neither of the two patterns lands here too — see
    // the second describe, where that is the design rather than a leftover.
    expect(listingUploadRefusal(asWidgetError(MEASURED.uploadFailed))).toBe(
      LISTING_UPLOAD_FAILED_MESSAGE,
    );
    expect(listingUploadRefusal(MEASURED.uploadFailed)).toBe(
      LISTING_UPLOAD_FAILED_MESSAGE,
    );
  });

  it("the size match is on the PHRASE, not on the numbers and not on the word File", () => {
    // Two halves to this. A different size sentence — other file size, other ceiling, both realistic
    // for the shipped 10 MB limit — must still be the size sentence, so the matcher is not keyed to
    // the measured digits. And `File format not allowed` ALSO begins with "File", so if the matcher
    // were keyed on that word the format case above would already be reporting the wrong sentence.
    expect(
      listingUploadRefusal(
        "File size (11.42 MB) exceeds maximum allowed (10485760 Bytes)",
      ),
    ).toBe(LISTING_TOO_LARGE_MESSAGE);
    expect(MEASURED.wrongFormat.startsWith("File")).toBe(true);
    expect(listingUploadRefusal(MEASURED.wrongFormat)).not.toBe(
      LISTING_TOO_LARGE_MESSAGE,
    );
  });
});

describe("D-186 — everything else is upload-failed, and that is the design", () => {
  it("null and undefined — both real, and `null` is in the widget's own type", () => {
    expect(listingUploadRefusal(null)).toBe(LISTING_UPLOAD_FAILED_MESSAGE);
    expect(listingUploadRefusal(undefined)).toBe(LISTING_UPLOAD_FAILED_MESSAGE);
  });

  it("an empty string, and an object whose status is empty", () => {
    expect(listingUploadRefusal("")).toBe(LISTING_UPLOAD_FAILED_MESSAGE);
    expect(listingUploadRefusal(asWidgetError(""))).toBe(
      LISTING_UPLOAD_FAILED_MESSAGE,
    );
  });

  it("an object with no `status`, and one whose `status` is not a string", () => {
    // The type says `status: string`, but the type is the vendor's and it is not enforced at
    // runtime. A numeric HTTP status in that field is the most plausible drift, and it must not
    // throw on the way to the fallback — note the `statusText` here DOES carry the size phrase, so a
    // matcher that reached for the wrong field would report the size sentence and be wrong about a
    // shape it never measured.
    expect(listingUploadRefusal({})).toBe(LISTING_UPLOAD_FAILED_MESSAGE);
    expect(listingUploadRefusal({ statusText: MEASURED.tooBig })).toBe(
      LISTING_UPLOAD_FAILED_MESSAGE,
    );
    expect(
      listingUploadRefusal({ status: 413, statusText: MEASURED.tooBig }),
    ).toBe(LISTING_UPLOAD_FAILED_MESSAGE);
    expect(listingUploadRefusal({ status: null })).toBe(
      LISTING_UPLOAD_FAILED_MESSAGE,
    );
  });

  it("a PLAUSIBLE REWORD of either vendor sentence degrades to upload-failed, deliberately", () => {
    // THE CASE THAT CARRIES THE ARGUMENT, and it is deliberately NOT special-cased. Both strings
    // below say exactly what the two matched sentences say, in words a vendor could reasonably
    // switch to tomorrow, and both land on the fallback. That is the DESIGNED degradation, not an
    // oversight: the discriminator is Cloudinary's English (§ Pitfall 8), so when Cloudinary rewords
    // it, the host gets a true-ish sentence — "that photo didn't upload" — instead of a wrong one.
    // The alternative, a growing blocklist of paraphrases against prose we do not control, is the
    // shape `cloudinary-provenance.test.ts:216-225` already declines for the same reason.
    //
    // The day someone wants to add a second pattern, they should find this reasoning here rather
    // than assume a gap. The thing to check first is whether the vendor has since exposed a code —
    // matching on one of those instead would delete this whole class of fragility.
    expect(listingUploadRefusal("The file you picked is too large.")).toBe(
      LISTING_UPLOAD_FAILED_MESSAGE,
    );
    expect(
      listingUploadRefusal("That kind of file cannot be uploaded here."),
    ).toBe(LISTING_UPLOAD_FAILED_MESSAGE);
  });

  it("the matcher is TOTAL over the whole fixture set — three sentences, no throw, no undefined", () => {
    // A refusal path that threw would replace a toast with a blank screen, and one that returned
    // `undefined` would render an empty toast — both worse than the vendor's own English, which the
    // host is already seeing inside the widget's iframe. Swept over every input this file drives,
    // including the non-union junk at the end of EVERY_INPUT, because `onError` is typed by the
    // vendor and typed is not the same as enforced.
    const sentences = [
      LISTING_TOO_LARGE_MESSAGE,
      LISTING_WRONG_FORMAT_MESSAGE,
      LISTING_UPLOAD_FAILED_MESSAGE,
    ];
    const offenders: string[] = [];
    for (const input of EVERY_INPUT) {
      let result: unknown;
      try {
        result = listingUploadRefusal(input);
      } catch (err) {
        offenders.push(`threw on ${JSON.stringify(input) ?? String(input)}: ${String(err)}`);
        continue;
      }
      if (typeof result !== "string" || !sentences.includes(result)) {
        offenders.push(
          `${JSON.stringify(input) ?? String(input)} -> ${String(result)}`,
        );
      }
    }
    expect(offenders).toEqual([]);
    // …and the three sentences are three distinct strings, so "total over three" is not vacuously
    // true because two of them collapsed into one.
    expect(new Set(sentences).size).toBe(3);
  });
});
