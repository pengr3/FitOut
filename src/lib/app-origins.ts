import "server-only";

export type RequestHostClass = "ops" | "public" | "unknown";

const LOCAL_PUBLIC_ORIGIN = "http://localhost:3000";
const LOCAL_OPS_ORIGIN = "http://ops.localhost:3000";

function configuredValue(...values: Array<string | undefined>): string | undefined {
  return values.map((value) => value?.trim()).find((value) => value !== undefined && value !== "");
}

function parseOrigin(value: string | undefined, key: string, localFallback?: string): URL {
  const candidate = configuredValue(value) ?? localFallback;
  if (candidate === undefined) {
    throw new Error(`${key} must be configured as an absolute http(s) origin`);
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(`${key} must be configured as an absolute http(s) origin`);
  }

  if (
    !["http:", "https:"].includes(parsed.protocol) ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error(`${key} must contain only an absolute http(s) origin`);
  }

  return new URL(parsed.origin);
}

const opsUrl = parseOrigin(
  process.env.OPS_APP_URL,
  "OPS_APP_URL",
  process.env.NODE_ENV === "production" ? undefined : LOCAL_OPS_ORIGIN,
);

export const OPS_APP_ORIGIN = opsUrl.origin;

const OPS_APP_HOSTNAME = opsUrl.hostname.toLowerCase();

function hostnameFromAuthority(rawHost: string | null | undefined): string | null {
  const authority = rawHost?.trim();
  if (
    !authority ||
    /[\s\\/@,]/.test(authority) ||
    authority.includes("?") ||
    authority.includes("#")
  ) {
    return null;
  }

  try {
    return new URL(`http://${authority}`).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function configuredPreviewUrl(): URL | null {
  const authority = configuredValue(process.env.VERCEL_URL);
  if (hostnameFromAuthority(authority) === null) return null;

  // Vercel supplies VERCEL_URL as one exact deployment authority without a scheme. Preview
  // authentication is HTTPS-only; no suffix or wildcard is inferred from this value.
  return new URL(`https://${authority}`);
}

const previewUrl = configuredPreviewUrl();
const PREVIEW_APP_HOSTNAME = previewUrl?.hostname.toLowerCase() ?? null;

const vercelEnvironment = configuredValue(process.env.VERCEL_ENV);
const isVercelDeployment =
  configuredValue(process.env.VERCEL, vercelEnvironment, process.env.VERCEL_URL) !== undefined;
const configuredPublicOrigin = configuredValue(
  process.env.BETTER_AUTH_URL,
  process.env.NEXT_PUBLIC_APP_URL,
);
const publicFallback =
  vercelEnvironment === "preview"
    ? previewUrl?.origin
    : isVercelDeployment
      ? undefined
      : LOCAL_PUBLIC_ORIGIN;

const publicUrl = parseOrigin(
  configuredPublicOrigin,
  "BETTER_AUTH_URL or NEXT_PUBLIC_APP_URL",
  publicFallback,
);

if (publicUrl.hostname.toLowerCase() === opsUrl.hostname.toLowerCase()) {
  throw new Error("OPS_APP_URL must use a hostname distinct from the public application origin");
}

export const PUBLIC_APP_ORIGIN = publicUrl.origin;
const PUBLIC_APP_HOSTNAME = publicUrl.hostname.toLowerCase();

/** Exact authorities Better Auth may derive a request-specific base URL from. */
export const AUTH_ALLOWED_HOSTS = Array.from(
  new Set(
    [publicUrl.host.toLowerCase(), opsUrl.host.toLowerCase(), previewUrl?.host.toLowerCase()].filter(
      (host): host is string => host !== undefined,
    ),
  ),
);

/** Exact browser origins accepted for Better Auth mutation and callback validation. */
export const AUTH_TRUSTED_ORIGINS = Array.from(
  new Set(
    [PUBLIC_APP_ORIGIN, OPS_APP_ORIGIN, previewUrl?.origin].filter(
      (origin): origin is string => origin !== undefined,
    ),
  ),
);

/**
 * Classifies only exact configured hostnames. The request Host is attacker-controlled, so this
 * function deliberately has no suffix, wildcard, substring, or inferred-preview branch.
 */
export function classifyRequestHost(rawHost: string | null | undefined): RequestHostClass {
  const hostname = hostnameFromAuthority(rawHost);
  if (hostname === null) return "unknown";
  if (hostname === OPS_APP_HOSTNAME) return "ops";
  if (hostname === PUBLIC_APP_HOSTNAME || hostname === PREVIEW_APP_HOSTNAME) return "public";
  return "unknown";
}

export function absolutePublicUrl(pathname: `/${string}`): string {
  return new URL(pathname, `${PUBLIC_APP_ORIGIN}/`).toString();
}

export function absoluteOpsUrl(pathname: `/${string}`): string {
  return new URL(pathname, `${OPS_APP_ORIGIN}/`).toString();
}
