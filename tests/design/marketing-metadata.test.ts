import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const request = vi.hoisted(() => ({ host: "fitout.live" }));
vi.mock("next/headers", () => ({ headers: async () => new Headers({ host: request.host }) }));
vi.mock("next/font/google", () => ({ Geist: () => ({ variable: "sans" }), Geist_Mono: () => ({ variable: "mono" }) }));
const paths = ["/", "/hosts", "/players", "/about", "/faq", "/contact"];

beforeEach(() => {
  vi.resetModules();
  for (const [key, value] of Object.entries({ VERCEL: "1", VERCEL_ENV: "production", VERCEL_URL: "", BETTER_AUTH_URL: "https://app.fitout.live", NEXT_PUBLIC_APP_URL: "https://app.fitout.live", MARKETING_APP_URL: "https://fitout.live", OPS_APP_URL: "https://ops.fitout.live", MARKETING_PREVIEW_URL: "https://marketing-preview.example.test" })) vi.stubEnv(key, value);
  request.host = "fitout.live";
});
afterEach(() => vi.unstubAllEnvs());

describe("marketing metadata partition", () => {
  it("lists exactly six visible marketing canonical URLs", async () => {
    const { default: sitemap } = await import("@/app/marketing/sitemap");
    expect(sitemap().map((entry) => entry.url), "all six public marketing URLs must be listed").toEqual(paths.map((path) => `https://fitout.live${path}`));
  });
  it("exports public crawl rules and a real text route with no shared preview cache", async () => {
    const { default: robots } = await import("@/app/marketing/robots");
    expect(await robots()).toEqual({ rules: { userAgent: "*", allow: "/", disallow: ["/marketing", "/api/"] }, sitemap: "https://fitout.live/sitemap.xml" });
    const { GET } = await import("@/app/marketing/robots.txt/route");
    const response = await GET();
    expect(response.headers.get("content-type")).toContain("text/plain");
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(await response.text()).toBe("User-Agent: *\nAllow: /\nDisallow: /marketing\nDisallow: /api/\nSitemap: https://fitout.live/sitemap.xml\n");
  });
  it("disallows the exact configured preview and all explicit preview deployments", async () => {
    const { default: robots } = await import("@/app/marketing/robots");
    const { isMarketingPreviewRequest } = await import("@/lib/host-route-policy");
    expect(isMarketingPreviewRequest("MARKETING-PREVIEW.EXAMPLE.TEST:443")).toBe(true);
    for (const host of ["marketing-preview.example.test.attacker.test", "unconfigured.example.test", "app.fitout.live", "marketing-preview.example.test:444", null]) expect(isMarketingPreviewRequest(host)).toBe(false);
    request.host = "marketing-preview.example.test";
    expect(await robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    const { GET } = await import("@/app/marketing/robots.txt/route");
    expect(await (await GET()).text()).toBe("User-Agent: *\nDisallow: /\n");
    request.host = "fitout.live";
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(await robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
  it("exports each existing page canonical and OG URL with the approved screenshot", async () => {
    const modules = [await import("@/app/marketing/page"), await import("@/app/marketing/hosts/page"), await import("@/app/marketing/players/page"), await import("@/app/marketing/about/page"), await import("@/app/marketing/faq/page")];
    for (let i = 0; i < modules.length; i++) {
      expect(modules[i].metadata.alternates?.canonical).toBe(`https://fitout.live${paths[i]}`);
      expect(modules[i].metadata.openGraph).toEqual(expect.objectContaining({ url: `https://fitout.live${paths[i]}`, images: [expect.objectContaining({ url: "https://fitout.live/marketing/screenshots/search.png" })] }));
    }
    const { metadata } = await import("@/app/marketing/layout");
    expect(new URL(String(metadata.metadataBase)).origin).toBe("https://fitout.live");
    expect(metadata.twitter).toEqual(expect.objectContaining({ card: "summary_large_image", images: ["https://fitout.live/marketing/screenshots/search.png"] }));
  });
  it("keeps root app metadata and configured previews separated", async () => {
    const { metadata } = await import("@/app/layout");
    expect(new URL(String(metadata.metadataBase)).origin).toBe("https://app.fitout.live");
    vi.stubEnv("VERCEL_ENV", "preview");
    const { metadata: marketing } = await import("@/app/marketing/layout");
    expect(marketing.robots).toEqual({ index: false, follow: false });
  });
  it("rewrites public metadata while denying namespace requests on every host", async () => {
    const { hostRoutePolicy } = await import("@/lib/host-route-policy");
    for (const path of ["/robots.txt", "/sitemap.xml"]) {
      expect(hostRoutePolicy("marketing", path, "GET", new URLSearchParams())).toEqual({ kind: "rewrite", pathname: `/marketing${path}` });
      expect(hostRoutePolicy("app", path, "GET", new URLSearchParams())).toEqual({ kind: "next" });
      for (const host of ["marketing", "app", "ops", "unknown"] as const) expect(hostRoutePolicy(host, `/marketing${path}`, "GET", new URLSearchParams())).toEqual({ kind: "deny", status: 404 });
    }
  });
});
