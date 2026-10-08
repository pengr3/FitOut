import "server-only";

export type RequestHostClass = "app" | "marketing" | "ops" | "unknown";

function configured(value: string | undefined): string | undefined {
  return value?.trim() || undefined;
}

function parseOrigin(value: string | undefined, key: string, fallback?: string): URL {
  const candidate = configured(value) ?? fallback;
  if (!candidate || /[\\\s]/.test(candidate)) throw new Error(`${key} must be configured as an absolute http(s) origin`);
  let parsed: URL;
  try { parsed = new URL(candidate); }
  catch { throw new Error(`${key} must be configured as an absolute http(s) origin`); }
  if (!/^https?:$/.test(parsed.protocol) || parsed.username || parsed.password ||
      parsed.pathname !== "/" || parsed.search || parsed.hash) {
    throw new Error(`${key} must contain only an absolute http(s) origin`);
  }
  return new URL(parsed.origin);
}

/** Normalize the complete authority, never a forwarded header or a domain suffix. */
function authority(raw: string | null | undefined): string | null {
  if (!raw || /[\s\\/@,?#%]/.test(raw) || !/^(?:\[[0-9a-fA-F:]+\]|[^:]+)(?::[0-9]+)?$/.test(raw)) return null;
  try {
    const parsed = new URL(`http://${raw}`);
    // Retain an explicitly supplied port; the configured origin owns its authority.
    const explicitPort = raw.match(/:(\d+)$/)?.[1];
    if (explicitPort && Number(explicitPort) > 65535) return null;
    return `${parsed.hostname.toLowerCase()}${explicitPort ? `:${Number(explicitPort)}` : ""}`;
  } catch { return null; }
}

const vercelEnv = configured(process.env.VERCEL_ENV);
const deployed = process.env.NODE_ENV === "production" ||
  Boolean(configured(process.env.VERCEL) || vercelEnv || configured(process.env.VERCEL_URL));
const rawPreview = configured(process.env.VERCEL_URL);
if (rawPreview && !authority(rawPreview)) throw new Error("VERCEL_URL must be one exact deployment authority");
const appPreview = rawPreview ? parseOrigin(`https://${rawPreview}`, "VERCEL_URL") : null;
const authApp = configured(process.env.BETTER_AUTH_URL);
const publicApp = configured(process.env.NEXT_PUBLIC_APP_URL);
if (authApp && publicApp && parseOrigin(authApp, "BETTER_AUTH_URL").origin !==
    parseOrigin(publicApp, "NEXT_PUBLIC_APP_URL").origin) {
  throw new Error("BETTER_AUTH_URL and NEXT_PUBLIC_APP_URL must name the same app origin");
}
const app = parseOrigin(authApp ?? publicApp, "BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL",
  vercelEnv === "preview" ? appPreview?.origin : deployed ? undefined : "http://localhost:3000");
const marketing = parseOrigin(process.env.MARKETING_APP_URL, "MARKETING_APP_URL",
  deployed ? undefined : "http://marketing.localhost:3000");
const ops = parseOrigin(process.env.OPS_APP_URL, "OPS_APP_URL",
  deployed ? undefined : "http://ops.localhost:3000");
const marketingPreview = configured(process.env.MARKETING_PREVIEW_URL)
  ? parseOrigin(process.env.MARKETING_PREVIEW_URL, "MARKETING_PREVIEW_URL") : null;

const appAuthorities = new Set([app.host.toLowerCase(), appPreview?.host.toLowerCase()].filter((host): host is string => host !== undefined));
const marketingAuthorities = new Set([marketing.host.toLowerCase(), marketingPreview?.host.toLowerCase()].filter((host): host is string => host !== undefined));
const opsAuthority = ops.host.toLowerCase();
if ([...appAuthorities].some((host) => marketingAuthorities.has(host) || host === opsAuthority) ||
    marketingAuthorities.has(opsAuthority)) throw new Error("App, marketing and OPS_APP_URL must use distinct authorities");

export const APP_ORIGIN = app.origin;
export const MARKETING_ORIGIN = marketing.origin;
export const OPS_APP_ORIGIN = ops.origin;
/** Compatibility names always refer to the application. */
export const PUBLIC_APP_ORIGIN = APP_ORIGIN;
export const AUTH_ALLOWED_HOSTS = [...new Set([...appAuthorities, opsAuthority])];
export const AUTH_TRUSTED_ORIGINS = [...new Set([APP_ORIGIN, OPS_APP_ORIGIN, appPreview?.origin].filter((origin): origin is string => origin !== undefined))];

export function classifyRequestHost(rawHost: string | null | undefined): RequestHostClass {
  const host = authority(rawHost);
  if (!host) return "unknown";
  if (host === opsAuthority) return "ops";
  if (appAuthorities.has(host)) return "app";
  if (marketingAuthorities.has(host)) return "marketing";
  return "unknown";
}

function absoluteUrl(origin: string, pathname: `/${string}`): string {
  const result = new URL(pathname, `${origin}/`);
  if (!pathname.startsWith("/") || pathname.startsWith("//") || result.origin !== origin) {
    throw new Error("Absolute URL helpers require an app-relative path");
  }
  return result.toString();
}
export function absoluteAppUrl(pathname: `/${string}`): string { return absoluteUrl(APP_ORIGIN, pathname); }
export function absoluteMarketingUrl(pathname: `/${string}`): string { return absoluteUrl(MARKETING_ORIGIN, pathname); }
export function absoluteOpsUrl(pathname: `/${string}`): string { return absoluteUrl(OPS_APP_ORIGIN, pathname); }
export const absolutePublicUrl = absoluteAppUrl;
