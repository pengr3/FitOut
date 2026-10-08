import type { RequestHostClass } from "@/lib/app-origins";

export const MARKETING_PAGES = new Set(["/", "/hosts", "/players", "/about", "/faq", "/contact"]);
const LEGACY_PAGES = new Set(["/login", "/signup", "/forgot-password", "/reset-password", "/auth/session-check", "/profile", "/start-hosting", "/terms", "/privacy"]);
const LEGACY_TREES = ["/bookings", "/listings", "/host", "/invite"];
const SEARCH_DISCRIMINATORS = ["lat", "lng", "category", "partySize", "locationLabel", "radius", "priceMax", "date", "start", "end"];
const BRAND_ASSETS = new Set(["/favicon.ico", "/icon-court.svg", "/icon-grove.svg"]);
const MARKETING_METADATA = new Set(["/opengraph-image", "/robots.txt", "/sitemap.xml"]);
const SCREENSHOTS = new Set(["search", "account", "verification", "listing", "bookable", "session", "booking"].map((name) => `/marketing/screenshots/${name}.png`));
const RECEIVERS: Record<string, readonly string[]> = {
  "/api/paymongo/webhook": ["POST"],
  "/api/didit/webhook": ["POST"],
  "/api/inngest": ["GET", "HEAD", "POST", "PUT"],
};

export function isPathSegment(pathname: string, segment: string): boolean {
  return pathname === segment || pathname.startsWith(`${segment}/`);
}

export function isMarketingScreenshot(pathname: string): boolean { return SCREENSHOTS.has(pathname); }

export type HostRouteDecision =
  | { kind: "next" }
  | { kind: "rewrite"; pathname: string }
  | { kind: "redirect-app" }
  | { kind: "deny"; status: 404 | 405; allow?: string };

/** Routing only: authentication and signature verification remain in server receivers/guards. */
export function hostRoutePolicy(host: RequestHostClass, pathname: string, method: string, query: URLSearchParams): HostRouteDecision {
  const read = method === "GET" || method === "HEAD";
  if (host === "unknown") return { kind: "deny", status: 404 };
  if (isPathSegment(pathname, "/marketing")) {
    if (host === "marketing" && isMarketingScreenshot(pathname)) {
      return read ? { kind: "next" } : { kind: "deny", status: 405, allow: "GET, HEAD" };
    }
    return { kind: "deny", status: 404 };
  }
  if (pathname === "/api/contact") {
    if (host !== "marketing") return { kind: "deny", status: 404 };
    return method === "POST" ? { kind: "next" } : { kind: "deny", status: 405, allow: "POST" };
  }
  const receiverMethods = RECEIVERS[pathname];
  if (receiverMethods && (host === "app" || host === "marketing")) {
    return receiverMethods.includes(method) ? { kind: "next" } : { kind: "deny", status: 405, allow: receiverMethods.join(", ") };
  }
  if (host === "app") {
    return pathname !== "/" && MARKETING_PAGES.has(pathname) ? { kind: "deny", status: 404 } : { kind: "next" };
  }
  // Ops is handled by its unchanged gateway policy in Proxy.
  if (host === "ops") return { kind: "deny", status: 404 };
  const legacySearch = pathname === "/" && SEARCH_DISCRIMINATORS.some((key) => query.getAll(key).some((value) => value.trim() !== ""));
  if (legacySearch || LEGACY_PAGES.has(pathname) || LEGACY_TREES.some((tree) => isPathSegment(pathname, tree))) {
    return read ? { kind: "redirect-app" } : { kind: "deny", status: 405, allow: "GET, HEAD" };
  }
  if (MARKETING_PAGES.has(pathname)) {
    return read ? { kind: "rewrite", pathname: `/marketing${pathname === "/" ? "" : pathname}` } : { kind: "deny", status: 405, allow: "GET, HEAD" };
  }
  if (MARKETING_METADATA.has(pathname)) {
    return read ? { kind: "rewrite", pathname: `/marketing${pathname}` } : { kind: "deny", status: 405, allow: "GET, HEAD" };
  }
  if (isPathSegment(pathname, "/_next") || BRAND_ASSETS.has(pathname)) {
    return read ? { kind: "next" } : { kind: "deny", status: 405, allow: "GET, HEAD" };
  }
  // Legacy APIs are never replayed/redirected. Only the named signed receivers survive cutover.
  return { kind: "deny", status: !read && isPathSegment(pathname, "/api") ? 405 : 404 };
}
