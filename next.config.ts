import type { NextConfig } from "next";

// The @better-auth/kysely-adapter version mismatch (its UNUSED sqlite dialects import constants
// kysely@0.29 no longer exports) is fixed at the source by scripts/patch-kysely-adapter.mjs, which
// runs on postinstall. No bundler aliasing is needed here as a result. See that script for details.
const nextConfig: NextConfig = {
  /* config options here */
};

export default nextConfig;
