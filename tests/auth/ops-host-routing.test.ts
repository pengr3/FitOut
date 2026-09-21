import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { getRewrittenUrl, isRewrite } from "next/experimental/testing/server";

const PUBLIC_ORIGIN = "https://app.example.test";
const OPS_ORIGIN = "https://ops.example.test";
const PREVIEW_HOST = "fitout-git-preview.example.vercel.app";
const STALE = "better-auth.session_token=stale.but.validly-shaped";

type ProxyHandler = (request: NextRequest) => NextResponse;

let proxy: ProxyHandler;

beforeAll(async () => {
  vi.stubEnv("BETTER_AUTH_URL", PUBLIC_ORIGIN);
  vi.stubEnv("NEXT_PUBLIC_APP_URL", PUBLIC_ORIGIN);
  vi.stubEnv("OPS_APP_URL", OPS_ORIGIN);
  vi.stubEnv("VERCEL_URL", PREVIEW_HOST);
  vi.resetModules();
  ({ proxy } = await import("@/proxy"));
});

afterAll(() => {
  vi.unstubAllEnvs();
});

function request(
  pathname: string,
  host: string | null,
  options: { cookie?: string; origin?: string } = {},
): NextRequest {
  const headers = new Headers();
  if (host !== null) headers.set("host", host);
  if (options.cookie !== undefined) headers.set("cookie", options.cookie);
  return new NextRequest(new URL(pathname, options.origin ?? PUBLIC_ORIGIN), { headers });
}

function outcome(response: NextResponse): { kind: "next" | "redirect" | "rewrite"; path: string | null } {
  if (isRewrite(response)) {
    const rewritten = getRewrittenUrl(response);
    return {
      kind: "rewrite",
      path: rewritten === null ? null : `${new URL(rewritten).pathname}${new URL(rewritten).search}`,
    };
  }

  const location = response.headers.get("location");
  if (location !== null) {
    const url = new URL(location, PUBLIC_ORIGIN);
    return { kind: "redirect", path: `${url.pathname}${url.search}` };
  }

  return { kind: "next", path: null };
}

describe("OPS-07 exact host authority", () => {
  it("ships one validated server-only origin authority", async () => {
    const modulePath = resolve(process.cwd(), "src/lib/app-origins.ts");
    expect(existsSync(modulePath), "src/lib/app-origins.ts is the required authority").toBe(true);
    if (!existsSync(modulePath)) return;

    const origins = await import("@/lib/app-origins");
    expect(origins.PUBLIC_APP_ORIGIN).toBe(PUBLIC_ORIGIN);
    expect(origins.OPS_APP_ORIGIN).toBe(OPS_ORIGIN);
    expect(origins.absolutePublicUrl("/terms")).toBe(`${PUBLIC_ORIGIN}/terms`);
    expect(origins.absoluteOpsUrl("/login")).toBe(`${OPS_ORIGIN}/login`);
  });

  it.each([
    ["ops.example.test", "ops"],
    ["OPS.EXAMPLE.TEST", "ops"],
    ["ops.example.test:443", "ops"],
    ["app.example.test", "public"],
    ["APP.EXAMPLE.TEST:443", "public"],
    [PREVIEW_HOST, "public"],
    [`${PREVIEW_HOST}:443`, "public"],
    ["branch--fitout.example.vercel.app", "unknown"],
    ["ops.example.test.attacker.invalid", "unknown"],
    ["evilops.example.test", "unknown"],
    ["", "unknown"],
  ] as const)("classifies %j as %s without suffix or wildcard matching", async (host, expected) => {
    const modulePath = resolve(process.cwd(), "src/lib/app-origins.ts");
    expect(existsSync(modulePath), "src/lib/app-origins.ts is required before classification").toBe(true);
    if (!existsSync(modulePath)) return;

    const { classifyRequestHost } = await import("@/lib/app-origins");
    expect(classifyRequestHost(host)).toBe(expected);
  });
});

describe("OPS-07 explicit host/path route matrix", () => {
  const cases = [
    ["ops login", "/login", "OPS.EXAMPLE.TEST:443", "rewrite", "/_ops-auth/login"],
    ["ops recovery", "/forgot-password", "ops.example.test", "rewrite", "/_ops-auth/forgot-password"],
    ["ops reset", "/reset-password?token=abc", "ops.example.test", "rewrite", "/_ops-auth/reset-password?token=abc"],
    ["ops invitation", "/invite/ABC123", "ops.example.test", "rewrite", "/_ops-auth/invite/ABC123"],
    ["ops console", "/ops", "ops.example.test", "rewrite", "/ops-gateway"],
    ["ops console child", "/ops/review", "ops.example.test", "rewrite", "/ops-gateway"],
    ["ops auth API", "/api/auth/get-session", "ops.example.test", "next", null],
    ["ops Next asset", "/_next/static/chunk.js", "ops.example.test", "next", null],
    ["ops public asset", "/icon-court.svg", "ops.example.test", "next", null],
    ["ops marketplace page", "/spaces", "ops.example.test", "rewrite", "/ops-gateway"],
    ["ops direct internal auth", "/_ops-auth/login", "ops.example.test", "rewrite", "/ops-gateway"],
    ["ops direct legacy cloak", "/_ops-cloak", "ops.example.test", "rewrite", "/ops-gateway"],
    ["public ops root", "/ops", "app.example.test", "rewrite", "/ops-gateway"],
    ["public ops child", "/ops/review", "app.example.test", "rewrite", "/ops-gateway"],
    ["public adjacent path", "/opsfoo", "app.example.test", "next", null],
    ["public direct internal auth", "/_ops-auth/login", "app.example.test", "rewrite", "/ops-gateway"],
    ["public direct legacy cloak", "/_ops-cloak", "app.example.test", "rewrite", "/ops-gateway"],
    ["public marketplace login", "/login", "app.example.test", "next", null],
    ["public marketplace invite", "/invite/ABC123", "app.example.test", "next", null],
    ["preview marketplace login", "/login", PREVIEW_HOST, "next", null],
    ["preview ops root", "/ops", PREVIEW_HOST, "rewrite", "/ops-gateway"],
    ["unknown marketplace login", "/login", "random.example.test", "next", null],
    ["unknown ops root", "/ops", "random.example.test", "rewrite", "/ops-gateway"],
    ["missing Host ops root", "/ops", null, "rewrite", "/ops-gateway"],
  ] as const;

  it("contains a non-empty denial/pass/rewrite census", () => {
    expect(cases.length).toBeGreaterThan(20);
  });

  it.each(cases)("routes %s", (_label, pathname, host, kind, path) => {
    expect(outcome(proxy(request(pathname, host)))).toEqual({ kind, path });
  });

  it("preserves marketplace _sc deferral only on logged-out marketplace auth routes", () => {
    expect(outcome(proxy(request("/login", "app.example.test", { cookie: STALE })))).toEqual({
      kind: "redirect",
      path: "/auth/session-check?next=%2Flogin",
    });
    expect(
      outcome(proxy(request("/login?_sc=1", "app.example.test", { cookie: STALE }))),
    ).toEqual({ kind: "next", path: null });
    expect(outcome(proxy(request("/login", "ops.example.test", { cookie: STALE })))).toEqual({
      kind: "rewrite",
      path: "/_ops-auth/login",
    });
  });
});
