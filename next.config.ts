import type { NextConfig } from "next";

// The @better-auth/kysely-adapter version mismatch (its UNUSED sqlite dialects import constants
// kysely@0.29 no longer exports) is fixed at the source by scripts/patch-kysely-adapter.mjs, which
// runs on postinstall. No bundler aliasing is needed here as a result. See that script for details.

// allowedDevOrigins — WHO IS ALLOWED TO TALK TO YOUR DEV SERVER'S INTERNALS.
//
// `next dev` refuses cross-origin requests to /_next/* and, decisively, to the /_next/webpack-hmr
// websocket. That guard is doing real work: without it any page you happen to have open in another
// tab could reach into a dev server bound on your machine and read your source, your bundles and
// your HMR stream. `localhost` and `*.localhost` are always allowed, which is why nobody working
// the normal way has ever had to think about this.
//
// THE SYMPTOM, WHEN IT BITES — worth naming, because it does not look like a security block.
// Reaching the dev server from any OTHER origin — an ngrok/cloudflared tunnel or a LAN IP like
// 192.168.1.50, both of which you need to test on a real phone — is cross-origin, so the HMR
// websocket upgrade is dropped. Every HTTP asset still returns 200. The page paints, looks perfect,
// and then IGNORES EVERY CLICK, because React never hydrates: a form submit falls through to a
// native GET. Measured on an iPhone over a tunnel: 37x 200 / 87x 304 / zero failed assets, and 27
// websocket upgrades with NO RESPONSE. The dev server does say so in its log ("Blocked cross-origin
// request to Next.js dev resource /_next/webpack-hmr"), but on a phone you never see that log.
// If you are searching for "dev server loads but nothing is interactive on my phone" — this is it.
//
// SO WHY IS THIS EMPTY. The allow-list is machine-specific: your tunnel domain is yours, rotates,
// and your LAN IP is yours. Committing either would widen everyone's dev server for one person's
// afternoon. EMPTY IS THE DEFAULT AND MUST STAY THE DEFAULT — with the env var unset this whole
// block contributes nothing and dev behaves exactly as it always has. Widening it is a DELIBERATE,
// LOCAL choice: put your host in `.env.local` (gitignored), documented in `.env.example`.
// DO NOT "tidy" this into a hardcoded array.
//
// Format is the hostname ONLY — no scheme, and NO PORT. Next compares against
// `new URL(origin).hostname`, which strips the port, so "192.168.1.50:3000" is not a stricter
// version of "192.168.1.50", it is an entry that can never match anything. Subdomain wildcards
// ("*.ngrok-free.dev") work; a bare "*" is rejected by Next on purpose.
//
// The NODE_ENV gate: `allowedDevOrigins` is read only by the dev server, so in production it is
// inert either way. We gate anyway so that a value left set in a deployed environment cannot even
// appear in a production build's resolved config — a security relaxation should be impossible to
// carry across the dev/prod line by accident, not merely harmless. `next` sets NODE_ENV per command
// before it imports this file, so the branch is decided correctly at config-evaluation time.
const devAllowedOrigins =
  process.env.NODE_ENV !== "production"
    ? (process.env.NEXT_DEV_ALLOWED_ORIGINS ?? "")
        .split(",")
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0)
    : [];

const nextConfig: NextConfig = {
  // Spread in ONLY when non-empty, so the unset case leaves the key absent entirely rather than
  // present-and-empty. Same effective behaviour, but it keeps "no one configured this" visible.
  ...(devAllowedOrigins.length > 0 ? { allowedDevOrigins: devAllowedOrigins } : {}),
};

export default nextConfig;
