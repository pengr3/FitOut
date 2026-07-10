// LIST-02 / RESEARCH Pitfall 3 — the Cloudinary signed-upload endpoint (POST /api/cloudinary/sign).
//
// GREEN as of Plan 04. The endpoint mints an upload signature server-side (api_secret NEVER leaves the
// server) and MUST: (1) require a session (401 otherwise), (2) verify the target listing belongs to
// the session user before signing (cross-host upload guard → 403), (3) sign ONLY the allowed, minimal
// param set (timestamp + folder `fitout/listings/<listingId>`) — the signed params must exactly match
// the client params or Cloudinary 401s (Pitfall 3), (4) never echo the api_secret, and (5) be
// rate-limited (WR-06 carry-forward). Harness = tests/profile/profile.test.ts: mock next/headers +
// doMock @/lib/auth + @/lib/db to the isolated test schema, then drive the REAL exported POST handler.
// The global setup (tests/setup.ts) mocks `cloudinary` so api_sign_request returns "mock-signature".

import { describe, it, expect, beforeAll, afterAll, vi, type Mock } from "vitest";
import { randomUUID } from "node:crypto";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { makeTestAuth, signUp, type TestAuth } from "../helpers/auth";
import { listing } from "@/lib/db/schema";

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

  it("signs ONLY the allowed param set (timestamp + folder fitout/listings/<listingId>) for the owner", async () => {
    const ownerId = await signInHost("sign.ok@example.com");
    const listingId = await makeListing(ownerId);
    signSpy.mockClear();

    const res = await POST(signRequest({ listingId }));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      signature: string;
      timestamp: number;
      folder: string;
      apiKey?: string;
      cloudName?: string;
    };

    // Response carries the signature + folder scoped to the owned listing (D-04 folder convention).
    expect(body.signature).toBe("mock-signature");
    expect(typeof body.timestamp).toBe("number");
    expect(body.folder).toBe(`fitout/listings/${listingId}`);

    // Pitfall 3 / T-04-SIGMATCH: the SIGNED param set is EXACTLY { timestamp, folder } — nothing else.
    expect(signSpy).toHaveBeenCalledTimes(1);
    const signedParams = signSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(signedParams).sort()).toEqual(["folder", "timestamp"]);
    expect(signedParams.folder).toBe(`fitout/listings/${listingId}`);
    expect(signedParams.timestamp).toBe(body.timestamp);
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

  it("rejects a paramsToSign body with a key outside the {folder, source, timestamp} allow-list (T-04-SIGMATCH)", async () => {
    const owner = await signInHost("sign.tamper@example.com");
    const listingId = await makeListing(owner);

    // Any Cloudinary upload key beyond the fixed allow-list must be rejected — and NO signature minted.
    for (const forbidden of ["public_id", "notification_url"] as const) {
      signSpy.mockClear();
      const res = await POST(
        signParamsRequest(listingId, {
          folder: `fitout/listings/${listingId}`,
          source: "uw",
          timestamp: 1700000000,
          [forbidden]: forbidden === "public_id" ? "attacker/evil" : "https://evil.example/hook",
        }),
      );
      expect(res.status).toBe(400);
      expect(signSpy).not.toHaveBeenCalled(); // no signature was ever minted for the tampered body
      expect(await res.text()).not.toContain("mock-signature");
    }
  });

  it("signs a clean paramsToSign of exactly {folder, source, timestamp} for the owned listing (widget happy path)", async () => {
    const owner = await signInHost("sign.widgetok@example.com");
    const listingId = await makeListing(owner);
    signSpy.mockClear();

    const res = await POST(
      signParamsRequest(listingId, {
        folder: `fitout/listings/${listingId}`,
        source: "uw",
        timestamp: 1700000000,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { signature: string };
    expect(body.signature).toBe("mock-signature");

    // The signed set is EXACTLY the allow-listed keys, scoped to the owned listing's folder.
    expect(signSpy).toHaveBeenCalledTimes(1);
    const signedParams = signSpy.mock.calls[0][0] as Record<string, unknown>;
    expect(Object.keys(signedParams).sort()).toEqual(["folder", "source", "timestamp"]);
    expect(signedParams.folder).toBe(`fitout/listings/${listingId}`);
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
});
