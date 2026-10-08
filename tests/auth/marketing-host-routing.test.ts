import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest, type NextResponse } from "next/server";

const APP = "https://app.example.test";
const MARKETING = "https://example.test";
let proxy: (request: NextRequest) => NextResponse;

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", APP);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", APP);
  vi.stubEnv("MARKETING_APP_URL", MARKETING);
  vi.stubEnv("OPS_APP_URL", "https://ops.example.test");
  vi.stubEnv("VERCEL_URL", "preview.example.vercel.app");
  vi.stubEnv("MARKETING_PREVIEW_URL", "https://marketing-preview.example.test");
  vi.resetModules();
  ({ proxy } = await import("@/proxy"));
});
afterAll(() => vi.unstubAllEnvs());

function route(path: string, method = "GET", host = "example.test", extra: Record<string, string> = {}) {
  return proxy(new NextRequest(new URL(path, MARKETING), { method, headers: { host, ...extra } }));
}

describe("marketing route and method policy", () => {
  it.each(["/", "/hosts", "/players", "/about", "/faq", "/contact"])("rewrites only visible marketing page %s", (path) => {
    expect(route(path).headers.get("x-middleware-rewrite")).toBe(`${MARKETING}/marketing${path === "/" ? "" : path}`);
    expect(route(path, "HEAD").headers.get("x-middleware-rewrite")).toBe(`${MARKETING}/marketing${path === "/" ? "" : path}`);
    expect(route(path, "POST").status).toBe(405);
    if (path !== "/") expect(route(path, "GET", "app.example.test").status).toBe(404);
  });
  it.each(["/login", "/signup", "/forgot-password", "/reset-password", "/auth/session-check", "/profile", "/bookings", "/bookings/id/receipt", "/listings/id/book", "/host/payouts/return", "/invite/token", "/start-hosting", "/terms", "/privacy"])("preserves complete legacy deep link %s", (path) => {
    const query = "?token=a%2Bb&paid=1&key=x&key=y&callbackURL=%2Fhost%3Fresume%3D1";
    for (const method of ["GET", "HEAD"]) {
      const response = route(path + query, method);
      expect(response.status).toBe(307);
      expect(response.headers.get("location")).toBe(APP + path + query);
    }
    for (const method of ["POST", "PUT", "PATCH", "DELETE", "OPTIONS"]) expect(route(path + query, method).status).toBe(405);
  });
  it.each(["lat", "lng", "category", "partySize", "locationLabel", "radius", "priceMax", "date", "start", "end"])("routes nonempty root search discriminator %s without dropping campaign/repeated keys", (key) => {
    const path = `/?${key}=anything&key=1&key=2&utm_source=x&_rsc=123&page=2`;
    expect(route(path).headers.get("location")).toBe(APP + path);
    expect(route(path, "POST").status).toBe(405);
    expect(route(`/?${key}=`).headers.get("location")).toBeNull();
    expect(route(`/?${key}=&${key}=yes`).headers.get("location")).toBe(`${APP}/?${key}=&${key}=yes`);
  });
  it.each(["?page=2&utm_source=x", "?sort=price&relax=1", "?_rsc=123&gclid=a&fbclid=b", "?category=%20%20"])("keeps campaign-only or empty search root %s on marketing", (query) => {
    expect(route("/" + query).headers.get("location")).toBeNull();
    expect(route("/" + query).headers.get("x-middleware-rewrite")).toBe(MARKETING + "/marketing" + query);
  });
  it.each(["/login-evil", "/hosts/extra", "/api/cloudinary/sign", "/api/auth/get-session", "/dev/theme", "/dev-throw-app", "/unknown"])("denies nonenumerated marketing path %s", (path) => {
    expect(route(path).status).toBe(404);
    expect(route(path, "POST").status).toBe(path.startsWith("/api/") ? 405 : 404);
  });
  it.each(["/api/paymongo/webhook", "/api/didit/webhook", "/api/inngest"])("keeps signed receiver %s direct on both app and marketing", (path) => {
    for (const host of ["example.test", "app.example.test"]) {
      const response = route(path, "POST", host);
      expect(response.headers.get("x-middleware-next")).toBe("1");
      expect(response.headers.get("location")).toBeNull();
      expect(response.headers.get("x-middleware-rewrite")).toBeNull();
      expect(route(path, "DELETE", host).status).toBe(405);
    }
    expect(route(path + "/extra", "POST").status).toBe(405);
  });
  it("preserves Inngest GET/PUT and rejects other webhook methods", () => {
    for (const method of ["GET", "HEAD", "PUT"]) expect(route("/api/inngest", method).headers.get("x-middleware-next")).toBe("1");
    expect(route("/api/paymongo/webhook").status).toBe(405);
    expect(route("/api/didit/webhook").status).toBe(405);
  });
  it("permits Contact POST only on marketing", () => {
    expect(route("/api/contact", "POST").headers.get("x-middleware-next")).toBe("1");
    expect(route("/api/contact").status).toBe(405);
    for (const host of ["app.example.test", "ops.example.test", "unknown.test"]) {
      const response = route("/api/contact", "POST", host);
      expect(response.status === 404 || response.headers.get("x-middleware-rewrite")?.endsWith("/ops-gateway")).toBe(true);
    }
  });
  it("reserves exact screenshot assets without exposing namespace pages", () => {
    expect(route("/marketing/screenshots/search.png").headers.get("x-middleware-next")).toBe("1");
    expect(route("/marketing/screenshots/evil.png").status).toBe(404);
    expect(route("/marketing/screenshots/search.png", "GET", "app.example.test").status).toBe(404);
    for (const path of ["/marketing", "/marketing/contact", "/marketing/screenshots/manifest.json"]) expect(route(path).status).toBe(404);
  });
  it("does not derive trust from forwarded Host and removes private routing markers", () => {
    expect(route("/", "GET", "unknown.test", { "x-forwarded-host": "example.test" }).status).toBe(404);
    const response = route("/profile", "GET", "app.example.test", {
      "x-fitout-ops-gateway-source": "/ops", "x-fitout-ops-gateway-handoff": "forged", "x-fitout-marketing-source": "/contact",
    });
    for (const name of ["x-fitout-ops-gateway-source", "x-fitout-ops-gateway-handoff", "x-fitout-marketing-source"]) expect(response.headers.get(`x-middleware-request-${name}`)).toBeNull();
  });
});

describe("exact origin authorities", () => {
  it.each([
    ["example.test", "marketing"], ["EXAMPLE.TEST:443", "marketing"], ["app.example.test", "app"],
    ["app.example.test:443", "app"], ["app.example.test:444", "unknown"], ["example.test:80", "unknown"],
    ["marketing-preview.example.test", "marketing"], ["preview.example.vercel.app", "app"],
    ["example.test.evil", "unknown"], ["example.test@evil", "unknown"], ["example.test:", "unknown"],
    ["example.test:65536", "unknown"], [" example.test", "unknown"], ["example.test,app.example.test", "unknown"],
  ])("classifies authority %s as %s", async (host, expected) => {
    const { classifyRequestHost } = await import("@/lib/app-origins");
    expect(classifyRequestHost(host)).toBe(expected);
  });
});

describe("checked origin configuration", () => {
  afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); });
  async function configuredOrigins(overrides: Record<string, string | undefined> = {}) {
    const environment = {
      NODE_ENV: "test", BETTER_AUTH_URL: "", NEXT_PUBLIC_APP_URL: "", OPS_APP_URL: "", MARKETING_APP_URL: "",
      MARKETING_PREVIEW_URL: "", VERCEL_URL: "", VERCEL_ENV: "", VERCEL: "", ...overrides,
    };
    for (const [key, value] of Object.entries(environment)) vi.stubEnv(key, value);
    vi.resetModules();
    return import("@/lib/app-origins");
  }
  it("uses distinct exact local authorities including their ports", async () => {
    const origins = await configuredOrigins();
    expect(origins.APP_ORIGIN).toBe("http://localhost:3000");
    expect(origins.MARKETING_ORIGIN).toBe("http://marketing.localhost:3000");
    expect(origins.OPS_APP_ORIGIN).toBe("http://ops.localhost:3000");
    expect(origins.classifyRequestHost("localhost:3000")).toBe("app");
    expect(origins.classifyRequestHost("localhost")).toBe("unknown");
    expect(origins.classifyRequestHost("localhost:3001")).toBe("unknown");
    expect(origins.AUTH_ALLOWED_HOSTS).not.toContain("marketing.localhost:3000");
    expect(origins.AUTH_TRUSTED_ORIGINS).not.toContain(origins.MARKETING_ORIGIN);
    expect(() => origins.absoluteAppUrl("//evil.test/path")).toThrow();
  });
  it("rejects conflicting app auth and browser origins", async () => {
    await expect(configuredOrigins({ BETTER_AUTH_URL: APP, NEXT_PUBLIC_APP_URL: "https://evil.test" })).rejects.toThrow("same app origin");
  });
  it.each(["https://app.test/path", "https://app.test/../", "https://user:pass@app.test", "https://app.test?x=1", "https://app.test#fragment", "ftp://app.test", "https://app.test\\path", "https://%61pp.test"])("rejects unsafe origin input %s", async (value) => {
    await expect(configuredOrigins({ BETTER_AUTH_URL: value })).rejects.toThrow();
  });
  it.each(["app", "marketing", "ops"])("requires explicit production %s configuration", async (missing) => {
    await expect(configuredOrigins({ NODE_ENV: "production", BETTER_AUTH_URL: missing === "app" ? "" : APP, MARKETING_APP_URL: missing === "marketing" ? "" : MARKETING, OPS_APP_URL: missing === "ops" ? "" : "https://ops.example.test" })).rejects.toThrow();
  });
  it("requires an explicit marketing preview origin and never infers production", async () => {
    await expect(configuredOrigins({ VERCEL_ENV: "preview", VERCEL_URL: "branch.vercel.app", OPS_APP_URL: "https://ops-preview.test" })).rejects.toThrow("MARKETING_APP_URL");
    const origins = await configuredOrigins({ VERCEL_ENV: "preview", VERCEL_URL: "branch.vercel.app", OPS_APP_URL: "https://ops-preview.test", MARKETING_APP_URL: "https://marketing-preview.test" });
    expect(origins.APP_ORIGIN).toBe("https://branch.vercel.app");
    expect(origins.classifyRequestHost("another.vercel.app")).toBe("unknown");
    expect(origins.classifyRequestHost("fitout.live")).toBe("unknown");
  });
  it.each([
    { BETTER_AUTH_URL: APP, MARKETING_APP_URL: APP },
    { BETTER_AUTH_URL: APP, OPS_APP_URL: APP },
    { MARKETING_APP_URL: MARKETING, OPS_APP_URL: MARKETING },
    { BETTER_AUTH_URL: APP, MARKETING_PREVIEW_URL: APP },
    { BETTER_AUTH_URL: APP, MARKETING_APP_URL: MARKETING, OPS_APP_URL: "https://ops.example.test", VERCEL_URL: "example.test" },
  ])("rejects cross-purpose authority collisions %j", async (environment) => {
    await expect(configuredOrigins(environment)).rejects.toThrow("distinct authorities");
  });
});
