import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { eq } from "drizzle-orm";
import type { TestAuth } from "../helpers/auth";
import type { TestDb } from "../helpers/db";

const PUBLIC_ORIGIN = "https://app.example.test";
const OPS_ORIGIN = "https://ops.example.test";
const PREVIEW_ORIGIN = "https://fitout-git-preview.example.vercel.app";
const FORGED_ORIGIN = "https://ops.example.test.attacker.invalid";
const PASSWORD = "averylongpassword";

const actionRequest = vi.hoisted(() => ({
  host: "ops.example.test" as string | null,
  origin: "https://ops.example.test" as string | null,
  cookie: "" as string,
}));

vi.mock("next/headers", () => ({
  headers: async () => {
    const value = new Headers({ cookie: actionRequest.cookie });
    if (actionRequest.host !== null) value.set("host", actionRequest.host);
    if (actionRequest.origin !== null) value.set("origin", actionRequest.origin);
    return value;
  },
}));

vi.mock("next/navigation", () => ({
  notFound: () => {
    throw new Error("NEXT_HTTP_ERROR_FALLBACK;404");
  },
  redirect: (to: string) => {
    throw new Error(`NEXT_REDIRECT;${to}`);
  },
}));

let testDb: TestDb;
let auth: TestAuth;
let userId: string;
let requestSequence = 82;

type ProductionAuthOptions = {
  baseURL?: unknown;
  trustedOrigins?: unknown;
  session?: { cookieCache?: unknown };
  advanced?: {
    crossSubDomainCookies?: unknown;
    trustedProxyHeaders?: boolean;
  };
};

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", PUBLIC_ORIGIN);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", PUBLIC_ORIGIN);
  vi.stubEnv("OPS_APP_URL", OPS_ORIGIN);
  vi.stubEnv("VERCEL_URL", new URL(PREVIEW_ORIGIN).host);
  const [{ setupTestDb }, { makeTestAuth, signUp }] = await Promise.all([
    import("../helpers/db"),
    import("../helpers/auth"),
  ]);
  testDb = await setupTestDb();
  auth = makeTestAuth(testDb, { enforceOriginCheck: true });

  const created = (await signUp(auth, {
    email: "ops.host.auth@example.com",
    password: PASSWORD,
    name: "Ops Host Auth",
    firstName: "Ops",
    intent: "book",
  })) as { user: { id: string } };
  userId = created.user.id;
});

afterAll(async () => {
  vi.unstubAllEnvs();
  const { teardownTestDb } = await import("../helpers/db");
  await teardownTestDb(testDb);
});

beforeEach(() => {
  actionRequest.host = new URL(OPS_ORIGIN).host;
  actionRequest.origin = OPS_ORIGIN;
  actionRequest.cookie = "";
  vi.restoreAllMocks();
});

function options(): ProductionAuthOptions {
  return (auth as unknown as { options: ProductionAuthOptions }).options;
}

function sessionCookie(setCookie: string | null): string {
  if (setCookie === null) return "";
  const entry = setCookie
    .split(/,(?=\s*[^;,=]+=[^;,]+)/)
    .find((value) => value.includes("better-auth.session_token="));
  return entry?.split(";")[0]?.trim() ?? "";
}

async function signInAt(origin: string): Promise<Response> {
  return auth.handler(
    new Request(`${origin}/api/auth/sign-in/email`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host: new URL(origin).host,
        origin,
        "x-forwarded-for": `203.0.113.${origin === OPS_ORIGIN ? "81" : "80"}`,
      },
      body: JSON.stringify({ email: "ops.host.auth@example.com", password: PASSWORD }),
    }),
  );
}

async function requestResetAt(
  requestOrigin: string,
  host = new URL(requestOrigin).host,
  extraHeaders: Record<string, string> = {},
) {
  const { mockResend } = await import("../helpers/mocks");
  mockResend.reset();

  const response = await auth.handler(
    new Request(`${requestOrigin}/api/auth/request-password-reset`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        host,
        origin: requestOrigin,
        "x-forwarded-for": `203.0.113.${requestSequence++}`,
        ...extraHeaders,
      },
      body: JSON.stringify({
        email: "ops.host.auth@example.com",
        redirectTo: `${requestOrigin}/reset-password`,
      }),
    }),
  );

  expect(response.status).toBe(200);
  await vi.waitFor(() => expect(mockResend.lastLink()).not.toBeNull());
  return new URL(mockResend.lastLink()!);
}

async function rejectedOriginResponse(hostOrigin: string): Promise<Response> {
  const signIn = await signInAt(hostOrigin);
  const cookie = sessionCookie(signIn.headers.get("set-cookie"));
  expect(cookie).toContain("better-auth.session_token=");

  return auth.handler(
    new Request(`${hostOrigin}/api/auth/sign-out`, {
      method: "POST",
      headers: {
        cookie,
        host: new URL(hostOrigin).host,
        origin: FORGED_ORIGIN,
      },
    }),
  );
}

describe("OPS-08 Better Auth exact-host authority", () => {
  it("uses one dynamic exact-host configuration with public fallback and no proxy-header override", () => {
    expect(options().baseURL).toEqual({
      allowedHosts: [
        new URL(PUBLIC_ORIGIN).host,
        new URL(OPS_ORIGIN).host,
        new URL(PREVIEW_ORIGIN).host,
      ],
      fallback: PUBLIC_ORIGIN,
      protocol: "auto",
    });
    expect(options().trustedOrigins).toEqual([PUBLIC_ORIGIN, OPS_ORIGIN, PREVIEW_ORIGIN]);
    expect(options().advanced?.trustedProxyHeaders).toBe(false);
    expect(JSON.stringify(options().baseURL)).not.toMatch(/[?*]/);
  });

  it.each([
    [PUBLIC_ORIGIN, PUBLIC_ORIGIN],
    [OPS_ORIGIN, OPS_ORIGIN],
    [PREVIEW_ORIGIN, PREVIEW_ORIGIN],
  ])("mints reset URLs for only the requesting allowed origin %s", async (origin, expected) => {
    const resetUrl = await requestResetAt(origin);
    expect(resetUrl.origin).toBe(expected);
  });

  it("falls a forged Host back to public without minting a forged or ops URL", async () => {
    const resetUrl = await requestResetAt(PUBLIC_ORIGIN, new URL(FORGED_ORIGIN).host);
    expect(resetUrl.origin).toBe(PUBLIC_ORIGIN);
    expect(resetUrl.origin).not.toBe(FORGED_ORIGIN);
    expect(resetUrl.origin).not.toBe(OPS_ORIGIN);
  });

  it("ignores a forged forwarded host instead of minting an ops URL", async () => {
    const resetUrl = await requestResetAt(PUBLIC_ORIGIN, new URL(PUBLIC_ORIGIN).host, {
      "x-forwarded-host": new URL(OPS_ORIGIN).host,
      "x-forwarded-proto": "https",
    });
    expect(resetUrl.origin).toBe(PUBLIC_ORIGIN);
    expect(resetUrl.origin).not.toBe(OPS_ORIGIN);
  });

  it("rejects an untrusted Origin identically on public and ops hosts", async () => {
    const [publicResponse, opsResponse] = await Promise.all([
      rejectedOriginResponse(PUBLIC_ORIGIN),
      rejectedOriginResponse(OPS_ORIGIN),
    ]);
    const [publicBody, opsBody] = await Promise.all([publicResponse.text(), opsResponse.text()]);

    expect(publicResponse.status).toBe(403);
    expect(opsResponse.status).toBe(403);
    expect(opsBody).toBe(publicBody);
    expect(opsBody).not.toContain(OPS_ORIGIN);
    expect(opsBody).not.toContain(PUBLIC_ORIGIN);
  });
});

describe("OPS-08 host-only sessions", () => {
  it("sets no Domain attribute and a browser-scoped cookie is absent on the other host both ways", async () => {
    const publicResponse = await signInAt(PUBLIC_ORIGIN);
    const opsResponse = await signInAt(OPS_ORIGIN);
    const publicSetCookie = publicResponse.headers.get("set-cookie");
    const opsSetCookie = opsResponse.headers.get("set-cookie");

    expect(publicSetCookie).not.toMatch(/(?:^|;)\s*Domain=/i);
    expect(opsSetCookie).not.toMatch(/(?:^|;)\s*Domain=/i);

    const publicJar = new Map([[new URL(PUBLIC_ORIGIN).host, sessionCookie(publicSetCookie)]]);
    const opsJar = new Map([[new URL(OPS_ORIGIN).host, sessionCookie(opsSetCookie)]]);
    const publicCookieSentToOps = publicJar.get(new URL(OPS_ORIGIN).host) ?? "";
    const opsCookieSentToPublic = opsJar.get(new URL(PUBLIC_ORIGIN).host) ?? "";
    expect(publicCookieSentToOps).toBe("");
    expect(opsCookieSentToPublic).toBe("");

    expect(
      await auth.api.getSession({
        headers: new Headers({
          cookie: publicCookieSentToOps,
          host: new URL(OPS_ORIGIN).host,
        }),
      }),
    ).toBeNull();
    expect(
      await auth.api.getSession({
        headers: new Headers({
          cookie: opsCookieSentToPublic,
          host: new URL(PUBLIC_ORIGIN).host,
        }),
      }),
    ).toBeNull();
  });

  it("re-reads role standing on the next request after grant and revoke", async () => {
    const { user } = await import("@/lib/db/schema");
    const response = await signInAt(OPS_ORIGIN);
    const cookie = sessionCookie(response.headers.get("set-cookie"));
    const headers = new Headers({ cookie, host: new URL(OPS_ORIGIN).host });

    await testDb.db.update(user).set({ role: "staff" }).where(eq(user.id, userId));
    const granted = await auth.api.getSession({ headers });
    expect((granted?.user as { role?: string } | undefined)?.role).toBe("staff");

    await testDb.db.update(user).set({ role: "user" }).where(eq(user.id, userId));
    const revoked = await auth.api.getSession({ headers });
    expect((revoked?.user as { role?: string } | undefined)?.role).toBe("user");
    expect(options().session?.cookieCache).toBeUndefined();
  });
});

type OpsAuthActions = {
  signInOps: (input: {
    email: string;
    password: string;
    callbackURL?: string | null;
  }) => Promise<
    | { ok: true; redirectTo: string }
    | { ok: false; reason: "invalid-input" | "invalid-credentials" | "no-ops-access" }
  >;
};

async function loadOpsAuthActions(): Promise<OpsAuthActions | null> {
  try {
    return (await vi.importActual("@/app/actions/ops-auth")) as OpsAuthActions;
  } catch {
    return null;
  }
}

describe("OPS-08 origin-bound staff credential transition", () => {
  it("refuses marketplace authority before Better Auth receives credentials", async () => {
    const actions = await loadOpsAuthActions();
    expect(actions?.signInOps, "signInOps must be an origin-bound Server Function").toBeTypeOf(
      "function",
    );

    const { auth: productionAuth } = await import("@/lib/auth");
    const signIn = vi.spyOn(productionAuth.api, "signInEmail");
    const getSession = vi.spyOn(productionAuth.api, "getSession");
    const signOut = vi.spyOn(productionAuth.api, "signOut");
    actionRequest.host = new URL(PUBLIC_ORIGIN).host;
    actionRequest.origin = PUBLIC_ORIGIN;
    actionRequest.cookie = "better-auth.session_token=deliberately-presented";

    await expect(
      actions!.signInOps({
        email: "operator@example.test",
        password: PASSWORD,
        callbackURL: "/ops",
      }),
    ).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
    expect(signIn).not.toHaveBeenCalled();
    expect(getSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("returns only a normalized ops callback after a database-backed staff role read", async () => {
    const actions = await loadOpsAuthActions();
    expect(actions?.signInOps).toBeTypeOf("function");

    const { auth: productionAuth } = await import("@/lib/auth");
    vi.spyOn(productionAuth.api, "signInEmail").mockResolvedValue({
      headers: new Headers({
        "set-cookie": "better-auth.session_token=staff-token; Path=/; HttpOnly; Secure",
      }),
      response: {
        redirect: false,
        token: "staff-token",
        user: { id: "staff-1", role: "staff" },
      },
    } as never);
    const getSession = vi.spyOn(productionAuth.api, "getSession");
    const signOut = vi.spyOn(productionAuth.api, "signOut");

    await expect(
      actions!.signInOps({
        email: "operator@example.test",
        password: PASSWORD,
        callbackURL: "/ops/reviews?state=open#next",
      }),
    ).resolves.toEqual({ ok: true, redirectTo: "/ops/reviews?state=open#next" });
    expect(getSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });

  it("clears a just-created nonstaff session and returns one bounded neutral refusal", async () => {
    const actions = await loadOpsAuthActions();
    expect(actions?.signInOps).toBeTypeOf("function");

    const { auth: productionAuth } = await import("@/lib/auth");
    vi.spyOn(productionAuth.api, "signInEmail").mockResolvedValue({
      headers: new Headers({
        "set-cookie": "better-auth.session_token=nonstaff-token; Path=/; HttpOnly; Secure",
      }),
      response: {
        redirect: false,
        token: "nonstaff-token",
        user: { id: "user-1", role: "user", canBook: true },
      },
    } as never);
    vi.spyOn(productionAuth.api, "getSession").mockResolvedValue({
      session: { id: "session-2" },
      user: { id: "user-1", role: "user", canBook: true },
    } as never);
    const signOut = vi
      .spyOn(productionAuth.api, "signOut")
      .mockResolvedValue({ success: true } as never);

    await expect(
      actions!.signInOps({
        email: "booker@example.test",
        password: PASSWORD,
        callbackURL: "/ops",
      }),
    ).resolves.toEqual({ ok: false, reason: "no-ops-access" });
    expect(signOut).toHaveBeenCalledOnce();
    expect(new Headers(signOut.mock.calls[0]?.[0]?.headers).get("cookie")).toContain(
      "better-auth.session_token=nonstaff-token",
    );
    expect(JSON.stringify(signOut.mock.calls[0])).not.toMatch(/canBook|booker|host/i);
  });

  it("maps credential failures to one bounded non-enumerating result", async () => {
    const actions = await loadOpsAuthActions();
    expect(actions?.signInOps).toBeTypeOf("function");

    const { auth: productionAuth } = await import("@/lib/auth");
    vi.spyOn(productionAuth.api, "signInEmail").mockRejectedValue(
      new Error("USER_NOT_FOUND: operator@example.test"),
    );
    const getSession = vi.spyOn(productionAuth.api, "getSession");
    const signOut = vi.spyOn(productionAuth.api, "signOut");

    await expect(
      actions!.signInOps({
        email: "operator@example.test",
        password: "wrong-password",
        callbackURL: "/ops",
      }),
    ).resolves.toEqual({ ok: false, reason: "invalid-credentials" });
    expect(getSession).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
