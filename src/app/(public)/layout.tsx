// SHELL-01 — the PUBLIC composition, for `/` and `/invite/[token]`.
//
// ── WHY THIS GROUP EXISTS AT ALL (route groups do not change URLs) ────────────────────────────────
// `(public)` is a ROUTE GROUP: the parenthesised segment is erased from the URL, so `page.tsx` here
// still serves `/` and `invite/[token]/page.tsx` still serves `/invite/<token>`. Nothing about the
// public contract of either route moved. What moved is WHICH LAYOUT WRAPS THEM, which is the only
// way to give them chrome without also giving it to `(app)`, `(host)` and `(auth)` — all of which
// nest inside the root layout and already have their own headers.
//
// ── WHY THE CHROME LIVES IN A LAYOUT AND NOT IN THE PAGES ─────────────────────────────────────────
// A `loading.tsx` REPLACES its sibling page while the page's data resolves. Chrome rendered inside a
// page therefore VANISHES for the whole of that window — the header blinks out and back on every
// navigation that suspends. A layout persists across the loading state and across navigations within
// the group, so the header is rendered exactly once and never remounts.
//
// ── WHY NOT `src/app/layout.tsx` ──────────────────────────────────────────────────────────────────
// The root layout is the ancestor of EVERY route, `(app)` and `(host)` included. Chrome there would
// put a second header above the two shipped ones. The root layout keeps its single job: `<html>`,
// `<body>`, the theme provider, the favicon owner and the metadata.
//
// The wrapper below is `flex min-h-dvh flex-col` so plan `11-14`'s footer can hang off it with
// `mt-auto` and sit at the bottom of a short page without this file being touched again.

export default function PublicLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="flex min-h-dvh flex-col">{children}</div>;
}
