// The Vitest resolve-alias target for the `server-only` specifier (D-34 / GATE-05).
//
// WHY IT EXISTS. `import "server-only"` is not a package this repo installs — Next ALIASES the specifier
// during its own build and declares the module type at node_modules/next/types/global.d.ts:57. Outside
// Next's bundler the specifier is unresolvable: `require.resolve("server-only")` throws MODULE_NOT_FOUND.
// Vitest runs outside Next's bundler, and ~35 shipped test files import modules that now carry the guard,
// so without this alias the whole suite (and therefore CI's test job) fails at RESOLUTION — not on an
// assertion, which would at least name a contract.
//
// An EMPTY module is the correct stub, and deliberately so: the real `server-only` package's entire job
// is to exist in the server condition and throw in the client one. In Vitest there is no client condition
// to distinguish, so the honest emulation is a module that loads and does nothing. It must NOT throw, and
// it must NOT assert anything — the enforcement this stands in for is Turbopack's, at `next build`, and
// tests/design/server-only-guards.test.ts is what keeps the guards themselves from being deleted.
//
// WHERE IT IS WIRED. `resolve.alias` in BOTH vitest.config.ts and vitest.design.config.ts. `resolve.alias`
// is neither `globalSetup` nor `setupFiles`, so the design config's DB-free guarantee (its header,
// lines 17-22) is untouched by this entry.

export {};
