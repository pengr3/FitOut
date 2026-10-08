import { APP_ORIGIN, MARKETING_ORIGIN, absoluteAppUrl } from "@/lib/app-origins";
import { safeCallbackPath } from "@/lib/safe-callback-url";

export type LegacyAuthLinkDecision =
  | { kind: "redirect"; url: string }
  | { kind: "deny"; status: 404 | 405 }
  | null;

/** Callback values are untrusted even when carried by a genuine bearer-token link. */
function checkedCallback(raw: string): string | null {
  if (!raw || /[\\\u0000-\u0020\u007f]/.test(raw) || /%(?:0[0-9a-f]|1[0-9a-f]|7f|5c)/i.test(raw)) return null;
  let relative = raw;
  if (!raw.startsWith("/")) {
    try {
      const target = new URL(raw);
      if (target.origin !== MARKETING_ORIGIN || target.username || target.password) return null;
      relative = `${target.pathname}${target.search}${target.hash}`;
    } catch { return null; }
  }
  const checked = safeCallbackPath(relative, APP_ORIGIN);
  if (checked === "/" && relative !== "/") return null;
  try {
    const decoded = decodeURIComponent(new URL(checked, APP_ORIGIN).pathname);
    if (decoded.startsWith("//") || /[\\\u0000-\u0020\u007f]/.test(decoded) ||
        ["/ops", "/_ops-auth", "/ops-gateway", "/_ops-cloak"].some((path) => decoded === path || decoded.startsWith(`${path}/`))) return null;
  } catch { return null; }
  return checked;
}

/** Exact old GET links only. OAuth state is host-only, so exchange must restart on app. */
export function legacyAuthLinkDecision(pathname: string, method: string, query: URLSearchParams): LegacyAuthLinkDecision {
  const oauth = pathname === "/api/auth/callback/google";
  const verify = pathname === "/api/auth/verify-email";
  const reset = /^\/api\/auth\/reset-password\/[^/]+$/.test(pathname);
  const resetUi = pathname === "/reset-password" && query.has("token");
  if (!oauth && !verify && !reset && !resetUi) return null;
  if (method !== "GET" && method !== "HEAD") return { kind: "deny", status: 405 };
  const callbacks = query.getAll("callbackURL");
  const callback = callbacks.length === 1 ? checkedCallback(callbacks[0]) : null;
  if (oauth) {
    const target = new URL(absoluteAppUrl("/login"));
    target.searchParams.set("moved", "1");
    if (callback) target.searchParams.set("callbackURL", callback);
    return { kind: "redirect", url: target.toString() };
  }
  if (callbacks.length > 1 || (callbacks.length === 1 && !callback)) return { kind: "deny", status: 404 };
  if ((verify || resetUi) && (query.getAll("token").length !== 1 || !query.get("token"))) return { kind: "deny", status: 404 };
  if (reset && !callback) return { kind: "deny", status: 404 };
  const target = new URL(absoluteAppUrl(pathname as `/${string}`));
  target.search = query.toString();
  if (callback) target.searchParams.set("callbackURL", callback);
  return { kind: "redirect", url: target.toString() };
}
