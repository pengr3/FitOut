// D-165 / T-16-14..T-16-16 — the `persistPhoto` provenance guard, as a pure unit.
//
// WHY THIS FILE EXISTS SEPARATELY FROM `tests/listing/photos.test.ts`. The integration file drives
// the real server action against a real Postgres and therefore proves the guard is WIRED. It cannot
// enumerate the attacker set cheaply — every case there costs a signup, a listing insert and a
// session. This file is the enumeration, and it drives the pure function directly.
//
// STRUCTURE COPIED FROM `tests/security/safe-callback-url.test.ts`: two describes — everything that
// is not ours is rejected, and everything the real pipeline actually produces is preserved. The
// second half matters as much as the first. A provenance guard that rejected the widget's own
// `secure_url` would break every host's upload, and the failure would look like Cloudinary's fault.
//
// ⚠ NOTHING HERE READS `process.env`, AND THAT IS THE POINT (16-RESEARCH §C10).
// `.github/workflows/ci.yml:151` and `:875` both record that the test jobs hold no Cloudinary
// credential, and `.env.local` is gitignored — so `process.env.CLOUDINARY_CLOUD_NAME` is `undefined`
// in every CI run. A guard that read it ambiently and skipped when absent would be DEAD in the only
// place it runs continuously, and every test of it would pass vacuously. That is the same defect
// shape as the `"use server"` incident `tests/use-server-exports.test.ts` exists to prevent: a green
// suite over a feature that does not run. So the cloud name is an ARGUMENT in every case below, and
// the last describe asserts over the module's own SOURCE that it stayed that way.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { isOwnCloudinaryAsset } from "@/lib/listing/cloudinary-provenance";

const CLOUD = "testcloud";
const LISTING = "L1";

/** The shape the widget actually returns for `folder: "fitout/listings/L1"` (16-RESEARCH §C9/§C10). */
const GOOD_URL = `https://res.cloudinary.com/${CLOUD}/image/upload/v1734/fitout/listings/${LISTING}/one.jpg`;
const GOOD_ID = `fitout/listings/${LISTING}/one`;

/** Drive the guard with one field swapped, holding every other field at a legitimate value. */
function check(over: Partial<Parameters<typeof isOwnCloudinaryAsset>[0]>): boolean {
  return isOwnCloudinaryAsset({
    url: GOOD_URL,
    publicId: GOOD_ID,
    listingId: LISTING,
    cloudName: CLOUD,
    ...over,
  });
}

describe("D-165 — the guard rejects everything the real pipeline could not have produced", () => {
  // ── the url, parsed ───────────────────────────────────────────────────────────────────────────
  it("rejects a SUFFIX host — `res.cloudinary.com.evil.tld`", () => {
    // THE FINDING, as an assertion first: a naive substring test accepts this, and the path is
    // deliberately legitimate so the ONLY thing that can reject it is the hostname comparison.
    const attack = `https://res.cloudinary.com.evil.tld/${CLOUD}/image/upload/v1734/fitout/listings/${LISTING}/one.jpg`;
    expect(attack.indexOf("res.cloudinary.com")).toBeGreaterThan(-1);
    expect(new URL(attack).hostname).toBe("res.cloudinary.com.evil.tld");
    expect(new URL(attack).pathname.startsWith(`/${CLOUD}/image/upload/`)).toBe(true);

    expect(check({ url: attack })).toBe(false);
  });

  it("rejects a foreign host carrying our host in the QUERY STRING", () => {
    const attack = `https://evil.tld/?x=https://res.cloudinary.com/${CLOUD}/image/upload/`;
    expect(attack.indexOf("res.cloudinary.com")).toBeGreaterThan(-1);
    expect(new URL(attack).hostname).toBe("evil.tld");

    expect(check({ url: attack })).toBe(false);
  });

  it("rejects a foreign host wearing our exact PATH plus a decoy query", () => {
    // The sharpest of the three: protocol, path prefix and query all look right, so the hostname
    // comparison is the only check standing between this and a public `<img src>`.
    const attack = `https://evil.tld/${CLOUD}/image/upload/v1734/fitout/listings/${LISTING}/one.jpg?x=https://res.cloudinary.com/`;
    expect(new URL(attack).pathname.startsWith(`/${CLOUD}/image/upload/`)).toBe(true);

    expect(check({ url: attack })).toBe(false);
  });

  it("rejects `http:` — mixed content on a PUBLIC listing page", () => {
    expect(check({ url: GOOD_URL.replace("https:", "http:") })).toBe(false);
  });

  it("rejects opaque schemes and unparseable strings", () => {
    for (const attack of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
      "//res.cloudinary.com/testcloud/image/upload/x.jpg",
      "res.cloudinary.com/testcloud/image/upload/x.jpg",
      "not a url at all",
      "",
      " ",
    ]) {
      expect(check({ url: attack }), JSON.stringify(attack)).toBe(false);
    }
  });

  it("rejects a URL under a DIFFERENT cloud name — another tenant on the same host", () => {
    const attack = `https://res.cloudinary.com/someoneelse/image/upload/v1734/fitout/listings/${LISTING}/one.jpg`;
    expect(new URL(attack).hostname).toBe("res.cloudinary.com");

    expect(check({ url: attack })).toBe(false);
  });

  it("rejects a URL on our host that is not an image DELIVERY url", () => {
    for (const attack of [
      `https://res.cloudinary.com/${CLOUD}/raw/upload/v1734/fitout/listings/${LISTING}/x.svg`,
      `https://res.cloudinary.com/${CLOUD}/image/fetch/https://evil.tld/x.jpg`,
      `https://res.cloudinary.com/${CLOUD}/`,
      `https://res.cloudinary.com/`,
    ]) {
      expect(check({ url: attack }), attack).toBe(false);
    }
  });

  // ── the public id, scoped ─────────────────────────────────────────────────────────────────────
  it("rejects the right SHAPE against the wrong LISTING", () => {
    // The IDOR spelling that survives every url check: a legitimate asset of ours, filed under
    // someone else's listing folder.
    expect(check({ publicId: "fitout/listings/L2/one" })).toBe(false);
  });

  it("rejects TRAVERSAL inside an otherwise legitimate prefix", () => {
    // THE FINDING first (16-RESEARCH §C9): this string satisfies `startsWith(prefix)` and still
    // names an asset outside the folder. A prefix check alone is not a scope check.
    const attack = `fitout/listings/${LISTING}/../../avatars/victim`;
    expect(attack.startsWith(`fitout/listings/${LISTING}/`)).toBe(true);

    expect(check({ publicId: attack })).toBe(false);
    expect(check({ publicId: "../fitout/listings/L1/one" })).toBe(false);
    expect(check({ publicId: `fitout/listings/${LISTING}/a..b` })).toBe(false);
  });

  it("rejects a public id that is ONLY the prefix, and the prefix without its slash", () => {
    expect(check({ publicId: `fitout/listings/${LISTING}/` })).toBe(false);
    expect(check({ publicId: `fitout/listings/${LISTING}` })).toBe(false);
    expect(check({ publicId: "" })).toBe(false);
    expect(check({ publicId: "one" })).toBe(false);
  });

  it("rejects a leading slash, a backslash, and a scheme separator", () => {
    expect(check({ publicId: `/fitout/listings/${LISTING}/one` })).toBe(false);
    expect(check({ publicId: `fitout\\listings\\${LISTING}\\one` })).toBe(false);
    expect(check({ publicId: `fitout/listings/${LISTING}/one\\two` })).toBe(false);
    expect(check({ publicId: "https://evil.tld/one" })).toBe(false);
    expect(check({ publicId: `fitout/listings/${LISTING}/a:b` })).toBe(false);
  });

  // ── the fail-closed case, which is R1's whole content ─────────────────────────────────────────
  it("FAILS CLOSED when the cloud name is absent — undefined and empty alike", () => {
    // An app with no cloud name configured cannot legitimately be persisting a Cloudinary URL. The
    // alternative — skipping the check — is the CI fail-open this whole design exists to refuse.
    expect(check({ cloudName: undefined })).toBe(false);
    expect(check({ cloudName: "" })).toBe(false);
    expect(check({ cloudName: "   " })).toBe(false);
  });

  it("fails closed when the listing id is absent", () => {
    // Without it the prefix degenerates to `fitout/listings//`, which is not a scope.
    expect(check({ listingId: "" })).toBe(false);
    expect(check({ listingId: "   " })).toBe(false);
  });
});

describe("D-165 — the guard preserves every url the real pipeline actually produces", () => {
  it("accepts the widget's own `secure_url` + `public_id` pair", () => {
    expect(check({})).toBe(true);
  });

  it("accepts a delivery url carrying a TRANSFORMATION segment", () => {
    expect(
      check({
        url: `https://res.cloudinary.com/${CLOUD}/image/upload/f_auto,q_auto/v1734/fitout/listings/${LISTING}/one.jpg`,
      }),
    ).toBe(true);
  });

  it("accepts a delivery url with NO `v<digits>` version segment", () => {
    // Not what the upload response returns, but valid and harmless — the guard does not police it
    // (16-RESEARCH §C10), because policing it would break a hand-built url that is still ours.
    expect(
      check({
        url: `https://res.cloudinary.com/${CLOUD}/image/upload/fitout/listings/${LISTING}/one.jpg`,
      }),
    ).toBe(true);
  });

  it("accepts a real uuid listing id and a nested asset name", () => {
    const listingId = "6f1b0a2c-3d4e-4f50-8a9b-0c1d2e3f4a5b";
    expect(
      isOwnCloudinaryAsset({
        url: `https://res.cloudinary.com/${CLOUD}/image/upload/v1755102030/fitout/listings/${listingId}/gym-wide_ab12cd.jpg`,
        publicId: `fitout/listings/${listingId}/gym-wide_ab12cd`,
        listingId,
        cloudName: CLOUD,
      }),
    ).toBe(true);
  });

  it("accepts any cloud name it is GIVEN — the value is never assumed", () => {
    expect(
      isOwnCloudinaryAsset({
        url: `https://res.cloudinary.com/da8uglpk6/image/upload/v1/fitout/listings/${LISTING}/one.jpg`,
        publicId: GOOD_ID,
        listingId: LISTING,
        cloudName: "da8uglpk6",
      }),
    ).toBe(true);
  });
});

describe("D-165 — the module cannot regrow an ambient read", () => {
  const SOURCE = readFileSync(
    resolve(process.cwd(), "src/lib/listing/cloudinary-provenance.ts"),
    "utf8",
  );

  it("reads no environment variable, in source", () => {
    // R1. This is the assertion that keeps the design decision alive through a later refactor: the
    // moment someone "helpfully" defaults `cloudName` from the environment, this goes red and the
    // reviewer is pointed at the CI-fail-open reasoning rather than left to rediscover it.
    expect(SOURCE).not.toContain("process.env");
  });

  it("compares the host with `===`, never a substring match", () => {
    // A substring test is the shape that admits both the suffix host and the query-string host. It
    // appears NOWHERE in the module — the public-id rejections are anchored patterns for the same
    // reason (`src/lib/safe-callback-url.ts:22-25`: prefix matching cannot fix this).
    expect(SOURCE).not.toContain("includes(");
    expect(SOURCE).toContain('"res.cloudinary.com"');
  });
});
