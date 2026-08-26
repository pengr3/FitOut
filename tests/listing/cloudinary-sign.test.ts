// LIST-02 / RESEARCH Pitfall 3 — the Cloudinary signed-upload endpoint (POST /api/cloudinary/sign).
//
// GREEN as of Plan 04. The endpoint mints an upload signature server-side (api_secret NEVER leaves the
// server) and MUST: (1) require a session (401 otherwise), (2) verify the target listing belongs to
// the session user before signing (cross-host upload guard → 403), (3) sign ONLY the allowed, minimal
// param set (the folder `fitout/listings/<listingId>`, the timestamp, the widget's `source`, and the
// upload preset) — the signed params must exactly match the client params or Cloudinary 401s
// (Pitfall 3), (4) never echo the api_secret, and (5) be rate-limited (WR-06 carry-forward).
// Harness = tests/profile/profile.test.ts: mock next/headers + doMock @/lib/auth + @/lib/db to the
// isolated test schema, then drive the REAL exported POST handler. The global setup (tests/setup.ts)
// mocks `cloudinary` so api_sign_request returns "mock-signature".
//
// EXTENDED BY 16.1-02 (D-194) with the requirement the allow-list cannot express: the upload preset
// must be PRESENT and must EQUAL the repo constant, or nothing is signed at all. See the two
// describes at the foot of this file.

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { stripComments } from "../helpers/source-text";
import { listing } from "@/lib/db/schema";
import { LISTING_UPLOAD_PRESET } from "@/lib/listing/upload-policy";

let testDb: TestDb;
let testAuth: TestAuth;
let POST: (typeof import("@/app/api/cloudinary/sign/route"))["POST"];
let signSpy: Mock;

// Mutable holder so the (hoisted) next/headers mock can pick up the per-test session cookie.
const sessionHeaders: { cookie: string } = { cookie: "" };
vi.mock("next/headers", () => ({
  headers: async () => new Headers({ cookie: sessionHeaders.cookie }),
}));

beforeAll(async () => {
  testDb = await setupTestDb();
  testAuth = makeTestAuth(testDb);
  vi.doMock("@/lib/auth", () => ({ auth: testAuth }));
  vi.doMock("@/lib/db", () => ({ db: testDb.db }));
  vi.resetModules();
  ({ POST } = await import("@/app/api/cloudinary/sign/route"));
  // Grab the SAME mocked cloudinary instance the route resolved after resetModules, so we can assert
  // exactly which params were signed (Pitfall 3). api_sign_request is stubbed to return a fixed value.
  const cloudinary = await import("cloudinary");
  signSpy = cloudinary.v2.utils.api_sign_request as unknown as Mock;
});

afterAll(async () => {
  vi.doUnmock("@/lib/auth");
  vi.doUnmock("@/lib/db");
  await teardownTestDb(testDb);
});

/** Sign up + sign in a host; stash the session cookie for the next/headers mock. Returns the id. */
async function signInHost(email: string): Promise<string> {
  const res = (await signUp(testAuth, {
    email,
    password: "averylongpassword",
    name: "Host",
    firstName: "Host",
    intent: "host",
  })) as { user: { id: string } };
  const signIn = await testAuth.api.signInEmail({
    body: { email, password: "averylongpassword" },
    asResponse: true,
  });
  const setCookie = signIn.headers.get("set-cookie");
  sessionHeaders.cookie = setCookie ? setCookie.split(";")[0] : "";
  return res.user.id;
}

/** Insert a bare draft listing owned by `hostId`, return its id. */
async function makeListing(hostId: string): Promise<string> {
  const id = randomUUID();
  await testDb.db
    .insert(listing)
    .values({ id, hostId, status: "draft", bookingMode: "request" });
  return id;
}

/** Build a POST Request for the sign endpoint with a JSON body. */
function signRequest(body: Record<string, unknown>): Request {
  return new Request("http://localhost/api/cloudinary/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

/**
 * Build a POST Request for the REAL <CldUploadWidget> path (5a): listingId travels in the
 * `?listingId=` query string and the body carries only `{ paramsToSign }` (no top-level listingId).
 */
function signParamsRequest(
  listingId: string,
  paramsToSign: Record<string, unknown>,
): Request {
  return new Request(
    "http://localhost/api/cloudinary/sign?listingId=" + encodeURIComponent(listingId),
    {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ paramsToSign }),
    },
  );
}

describe("cloudinary sign endpoint (LIST-02)", () => {
  it("returns 401 when there is no session", async () => {
    sessionHeaders.cookie = ""; // no session cookie
    const res = await POST(signRequest({ listingId: "anything" }));
    expect(res.status).toBe(401);
  });

  it("returns 403 when the session user does not own the target listing (cross-host guard)", async () => {
    // Owner A creates a listing.
    const ownerId = await signInHost("sign.owner@example.com");
    const listingId = await makeListing(ownerId);

    // A DIFFERENT host B signs in and tries to get a signature for A's listing.
    await signInHost("sign.attacker@example.com");
    const res = await POST(signRequest({ listingId }));
    expect(res.status).toBe(403);
  });

  it("returns 403 when the listing does not exist (no existence leak)", async () => {
    await signInHost("sign.ghost@example.com");
    const res = await POST(signRequest({ listingId: randomUUID() }));
    expect(res.status).toBe(403);
  });

  it("signs the allowed param set INCLUDING the upload preset (path 5b, F-1 closed) for the owner", async () => {
    // CHANGED BY 16.1-02, and the change is the whole point of the case rather than an adjustment
    // to it. This case used to assert the signed set was exactly { folder, timestamp } — and it was,
    // which is precisely what RESEARCH F-1 named as a live bypass. Path 5b handed any signed-in
    // owner a signature with no preset on it, and therefore no incoming transformation and no format
    // gate: everything needed to POST straight to Cloudinary and store an asset of any size, any
    // format, with the source's EXIF intact. The session, rate-limit, ownership and folder gates all
    // held while it did; none of them bounds the stored asset. The preset is now signed here too, so
    // the assertion is three keys, and the response tells the caller the name it signed.
    const ownerId = await signInHost("sign.ok@example.com");
    const listingId = await makeListing(ownerId);
    signSpy.mockClear();

    const res = await POST(signRequest({ listingId }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signature: string;
      timestamp: number;
      folder: string;
      uploadPreset?: string;
      apiKey?: string;
      cloudName?: string;
    };

    // Response carries the signature + folder scoped to the owned listing (D-04 folder convention).
    expect(body.signature).toBe("mock-signature");
    expect(typeof body.timestamp).toBe("number");
    expect(body.folder).toBe(`fitout/listings/${listingId}`);
    // …and the preset NAME, so a direct caller knows the exact set it must post. Omitting it from
    // the POST is a 401 at Cloudinary (probe E10), which is what makes the transformation stick.
    expect(body.uploadPreset).toBe(LISTING_UPLOAD_PRESET);

    // Pitfall 3 / T-04-SIGMATCH: the SIGNED param set is EXACTLY these three — nothing else.
    expect(signSpy).toHaveBeenCalledTimes(1);
    const signedParams = signSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(signedParams).sort()).toEqual([
      "folder",
      "timestamp",
      "upload_preset",
    ]);
    expect(signedParams.folder).toBe(`fitout/listings/${listingId}`);
    expect(signedParams.timestamp).toBe(body.timestamp);
    expect(signedParams.upload_preset).toBe(LISTING_UPLOAD_PRESET);
  });

  it("never exposes CLOUDINARY_API_SECRET in the response body", async () => {
    const ownerId = await signInHost("sign.secret@example.com");
    const listingId = await makeListing(ownerId);

    const res = await POST(signRequest({ listingId }));
    expect(res.status).toBe(200);
    const raw = await res.text();
    const body = JSON.parse(raw) as Record<string, unknown>;

    // The signing secret is never a response field, under any casing.
    expect(body).not.toHaveProperty("api_secret");
    expect(body).not.toHaveProperty("apiSecret");
    expect(body).not.toHaveProperty("secret");
    // And its value never appears anywhere in the serialized body.
    const secret = process.env.CLOUDINARY_API_SECRET;
    if (secret) expect(raw).not.toContain(secret);
  });

  it("is rate-limited on repeated calls (WR-06 carry-forward, 30/60s per user)", async () => {
    const ownerId = await signInHost("sign.ratelimit@example.com");
    const listingId = await makeListing(ownerId);

    // The first 30 signatures in the window succeed; the 31st is throttled.
    let throttled = 0;
    let firstStatus = 0;
    for (let i = 0; i < 31; i++) {
      const res = await POST(signRequest({ listingId }));
      if (i === 0) firstStatus = res.status;
      if (res.status === 429) throttled++;
    }
    expect(firstStatus).toBe(200);
    expect(throttled).toBeGreaterThanOrEqual(1);
  });

  // --- Path 5a: the live <CldUploadWidget> path (body = { paramsToSign }, listingId in query) ------

  it("rejects a paramsToSign body with a key outside the {folder, source, timestamp, upload_preset} allow-list (T-04-SIGMATCH)", async () => {
    const owner = await signInHost("sign.tamper@example.com");
    const listingId = await makeListing(owner);

    // Any Cloudinary upload key beyond the fixed allow-list must be rejected — and NO signature minted.
    //
    // ⚠ THE LAST THREE ROWS ARE THE REGRESSION THIS CASE EXISTS FOR (D-194 / probe E11), and they are
    // sent ALONGSIDE a perfectly correct preset precisely so a passing preset gate cannot excuse
    // them. Cloudinary MERGES incoming transformations rather than letting the preset's win: a
    // client-supplied `transformation` CHAINS AFTER it. Measured 2026-08-26 on this account, a preset
    // capped at a 2048px long edge plus a client `c_scale,w_4000` stored a 4000x6000 asset of
    // 292,487 bytes — the ceiling was not merely bypassed, it was upscaled through. `allowed_formats`
    // is the same shape aimed at the SVG refusal, and `eager` is the shape that derives a tidy extra
    // asset while leaving the original stored at full size with its EXIF intact. Admitting any of
    // them "for flexibility" hands the bound back to the caller, so each must 400 here forever.
    const forbiddenParams: ReadonlyArray<readonly [string, string]> = [
      ["public_id", "attacker/evil"],
      ["notification_url", "https://evil.example/hook"],
      ["transformation", "c_scale,w_4000"],
      ["allowed_formats", "svg"],
      ["eager", "c_limit,w_4000"],
    ];
    for (const [forbidden, value] of forbiddenParams) {
      signSpy.mockClear();
      const res = await POST(
        signParamsRequest(listingId, {
          folder: `fitout/listings/${listingId}`,
          source: "uw",
          timestamp: 1700000000,
          upload_preset: LISTING_UPLOAD_PRESET, // a VALID preset — the extra key must still be fatal
          [forbidden]: value,
        }),
      );
      expect(res.status).toBe(400);
      expect(signSpy).not.toHaveBeenCalled(); // no signature was ever minted for the tampered body
      expect(await res.text()).not.toContain("mock-signature");
    }
  });

  it("signs a clean paramsToSign of exactly {folder, source, timestamp, upload_preset} for the owned listing (widget happy path)", async () => {
    // The four keys are not a guess. Read out of a live Chromium (probe E7) with `uploadPreset` set
    // on the widget, `paramsToSign` was { timestamp, folder, upload_preset, source: "uw" } — so this
    // is the exact set the shipped uploader will present once 16.1-04 passes the prop.
    const owner = await signInHost("sign.widgetok@example.com");
    const listingId = await makeListing(owner);
    signSpy.mockClear();

    const res = await POST(
      signParamsRequest(listingId, {
        folder: `fitout/listings/${listingId}`,
        source: "uw",
        timestamp: 1700000000,
        upload_preset: LISTING_UPLOAD_PRESET,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { signature: string };
    expect(body.signature).toBe("mock-signature");

    // The signed set is EXACTLY the allow-listed keys, scoped to the owned listing's folder, and
    // the preset is the one the repo declares rather than any name that merely parses.
    expect(signSpy).toHaveBeenCalledTimes(1);
    const signedParams = signSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(signedParams).sort()).toEqual([
      "folder",
      "source",
      "timestamp",
      "upload_preset",
    ]);
    expect(signedParams.folder).toBe(`fitout/listings/${listingId}`);
    expect(signedParams.upload_preset).toBe(LISTING_UPLOAD_PRESET);
  });

  it("returns 403 when paramsToSign.folder points outside the owned listing's folder (path-5a folder scope holds)", async () => {
    const owner = await signInHost("sign.scope@example.com");
    const listingId = await makeListing(owner); // caller OWNS this listing (ownership gate passes)
    signSpy.mockClear();

    // Only allow-listed keys, but the folder targets a DIFFERENT listing → must 403 (not 400, not 200).
    const res = await POST(
      signParamsRequest(listingId, {
        folder: `fitout/listings/${randomUUID()}`,
        source: "uw",
        timestamp: 1700000000,
      }),
    );
    expect(res.status).toBe(403);
    expect(signSpy).not.toHaveBeenCalled();
  });

  // --- D-194: the preset is a REQUIRED-KEY EQUALITY GATE, not an allow-list entry ------------------
  //
  // These two cases are the ones that distinguish the fix from the vulnerability that looks like it.
  // An allow-list answers "may this key be signed"; it says nothing about whether the key has to be
  // there. A change that only added "upload_preset" to the Set would leave the body below earning a
  // perfectly valid signature — and a signature with no preset on it is a signature with no incoming
  // transformation, no pixel ceiling and no format gate behind it. RESEARCH names that exact diff
  // (Pitfall 1: "a diff that touches only the Set literal") as the way this phase fails while looking
  // finished. So both cases assert the strong form: not just the 400, but that `api_sign_request` was
  // never reached at all.

  it("refuses to mint ANY signature for a paramsToSign with no upload_preset (D-194 required-key gate)", async () => {
    const owner = await signInHost("sign.nopreset@example.com");
    const listingId = await makeListing(owner);
    signSpy.mockClear();

    // Every key here is allow-listed and the folder is correctly scoped — under the pre-D-194 route
    // this body returned 200 and a usable signature. That is the whole bypass, in three keys.
    const res = await POST(
      signParamsRequest(listingId, {
        folder: `fitout/listings/${listingId}`,
        source: "uw",
        timestamp: 1700000000,
      }),
    );
    expect(res.status).toBe(400);
    expect(signSpy).not.toHaveBeenCalled();
    expect(await res.text()).not.toContain("mock-signature");
  });

  it("refuses to mint ANY signature for a FOREIGN upload_preset name (D-194 equality, not membership)", async () => {
    const owner = await signInHost("sign.foreignpreset@example.com");
    const listingId = await makeListing(owner);
    signSpy.mockClear();

    // A preset that exists on the account but is not ours (`ml_default` is real on this cloud and is
    // signed-upload capable) carries whatever transformation and format policy someone else set — or
    // none. Presence is not the property being checked; identity is.
    const res = await POST(
      signParamsRequest(listingId, {
        folder: `fitout/listings/${listingId}`,
        source: "uw",
        timestamp: 1700000000,
        upload_preset: "ml_default",
      }),
    );
    expect(res.status).toBe(400);
    expect(signSpy).not.toHaveBeenCalled();
    expect(await res.text()).not.toContain("mock-signature");
  });
});

// --- RESEARCH § R-1.6 LAYER 2 — the exclusion, asserted over the route's own source ----------------
//
// This is the assertion that keeps the design decision alive through a later refactor, in the
// technique `tests/listing/cloudinary-provenance.test.ts:305-320` established for the same reason.
// The behavioural cases above prove what the route DOES today. They cannot prove what it must never
// GROW: the moment someone "helpfully" widens `ALLOWED_SIGN_KEYS` with `transformation` — a one-token
// diff that reads as a convenience and passes review — every behavioural case above still goes green,
// because a widened allow-list rejects nothing. The stored ceiling would simply stop being a ceiling.
// So this describe reads the file and goes red instead, pointing the reviewer at probe E11 rather
// than leaving them to rediscover a 4000x6000 asset in production.
//
// ⚠ WHY THE SOURCE IS COMMENT-STRIPPED FIRST, and this is mandatory rather than tidy. The CORRECT
// route file necessarily NAMES every token this prohibits — its declaration comment has to explain
// which keys are excluded and why, or the exclusion is a bare literal nobody dares touch. A whole-file
// `expect(SOURCE).not.toContain("transformation")` is therefore falsely RED against a correct tree.
// `scripts/verify-workflows.mjs:24-32` measured exactly that: "Substring checks are wrong in both
// directions on a documented file: falsely green for requirements, falsely red for prohibitions."
// `stripComments` (tests/helpers/source-text.ts) is this phase's single agreed answer; do not
// hand-roll a second stripper.
//
// ── OBSERVED RED, TWICE, 2026-08-26 (a gate never seen failing is a rubber stamp) ────────────────
// (1) `"transformation"` temporarily added to ALLOWED_SIGN_KEYS, then reverted:
//
//     × rejects a paramsToSign body with a key outside the {…} allow-list  → expected 200 to be 400
//     × the route's CODE never admits transformation, allowed_formats, eager or overwrite
//         AssertionError: `transformation` must not appear in src/app/api/cloudinary/sign/route.ts's code
//     × ALLOWED_SIGN_KEYS has EXACTLY four entries
//         + "transformation"  (received 5, expected 4)
//
// (2) the equality gate's `LISTING_UPLOAD_PRESET` temporarily replaced by the string literal, reverted:
//
//     × compares the preset against the IMPORTED identifier, never a string literal
//         AssertionError: expected '\n\n\n…' not to contain 'fitout_listing_v1'
//
// The received value being a field of newlines in both is `stripComments` working as designed: this
// route is mostly argument, so its stripped code is a handful of statements in a long blank field. A
// whole-file `toContain` would have been GREEN in (1), because the declaration comment immediately
// above the Set has to name `transformation` to explain the exclusion — the falsely-red half of the
// verify-workflows finding, demonstrated on this phase's own file.
describe("D-194 layer 2 — sign/route.ts cannot regrow the allow-list", () => {
  const ROUTE_PATH = "src/app/api/cloudinary/sign/route.ts";
  const SOURCE = readFileSync(resolve(process.cwd(), ROUTE_PATH), "utf8");
  const CODE = stripComments(SOURCE);

  it("the stripper itself works in BOTH directions (detector self-test)", () => {
    // Without this, an over-eager stripper that returned "" would make every prohibition below pass
    // vacuously — a green suite over a gate that does not run, which is the defect shape
    // `tests/use-server-exports.test.ts` and `cloudinary-provenance.ts:43-51` both exist to prevent.
    // Same both-directions rule `tests/design/avatar-zoom.test.ts:247-258` applies to its own detector.
    const onlyInAComment = `// never sign a transformation\nconst KEYS = new Set(["folder"]);\n`;
    const inActualCode = `const KEYS = new Set(["folder", "transformation"]);\n`;
    expect(stripComments(onlyInAComment)).not.toContain("transformation");
    expect(stripComments(inActualCode)).toContain("transformation");
  });

  it("the route's CODE signs the upload preset", () => {
    expect(CODE).toContain("upload_preset");
  });

  it("the route's CODE never admits transformation, allowed_formats, eager or overwrite", () => {
    // E11, restated where it bites: preset c_limit,w_2048 + client c_scale,w_4000 → a stored
    // 4000x6000 asset. `format` is included because RESEARCH § R-1.6 layer 2 names it and because it
    // is the shortest spelling any of the format keys could come back under.
    for (const forbidden of [
      "transformation",
      "allowed_formats",
      "eager",
      "overwrite",
      "format",
    ]) {
      expect(CODE, `\`${forbidden}\` must not appear in ${ROUTE_PATH}'s code`).not.toContain(
        forbidden,
      );
    }
  });

  it("compares the preset against the IMPORTED identifier, never a string literal", () => {
    // Layer 2's other half. A re-spelled name is a second declaration by another route: the
    // reconciler (16.1-03) would then apply settings to one preset while this gate admitted another,
    // and nothing in CI could see the disagreement. It also makes the identifier greppable, which is
    // what lets the assertion above exist at all.
    expect(CODE).toContain("LISTING_UPLOAD_PRESET");
    expect(CODE).not.toContain("fitout_listing_v1");
  });

  it("ALLOWED_SIGN_KEYS has EXACTLY four entries", () => {
    // Narrowed to the declaration before counting, so an unrelated `new Set` elsewhere in the file
    // could never satisfy this — the same discipline `verify-workflows.mjs` applies by parsing rather
    // than searching. The count is the load-bearing part: the set gained exactly one key, and the
    // three it did not gain are the reason the preset is a bound rather than a suggestion.
    const declaration = CODE.match(/const ALLOWED_SIGN_KEYS\s*=\s*new Set\(\[([\s\S]*?)\]\)/);
    expect(declaration, `${ROUTE_PATH} must declare ALLOWED_SIGN_KEYS as a Set literal`).not.toBeNull();
    const entries = (declaration![1].match(/"[^"]*"/g) ?? []) as string[];
    expect(entries.map((e) => e.slice(1, -1)).sort()).toEqual([
      "folder",
      "source",
      "timestamp",
      "upload_preset",
    ]);
  });
});
