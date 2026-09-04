# Phase 19 — Deferred Items

Out-of-scope discoveries logged during execution. Per the executor's SCOPE BOUNDARY rule these are
**not** fixed by the plan that found them: each was proved pre-existing / unrelated before being
deferred.

---

## D1 — Hydration mismatch in the site nav's `NavDrawer` during e2e sign-up

**Found during:** 19-02, Task 3 (the pre-fix guard run).

**What was observed.** The Playwright run's `[WebServer]` stream carried, twice (once per worker that
signed a host up), a React hydration error:

```
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
  ...
    <div className="mx-auto fl...">
      <LinkComponent>
      <nav data-testid="site-nav" className="flex items...">
        <Suspense fallback={[...]}>
          <div>
          <div className="md:hidden">
            <NavDrawer>
              <ResponsiveDialog title="Menu" hideTitle={true} trigger={<button>}>
                <Dialog open={undefined} onOpenChange={undefined}>
```

It is captured verbatim in `evidence/guards-pre-fix.txt` (lines 9-70 and 71-132) alongside the guard
reds, because the evidence file is the whole run's output and was not filtered.

**Why it is deferred and not auto-fixed.**

- **It is pre-existing and unrelated.** The named components — `site-nav`, `NavDrawer`,
  `ResponsiveDialog` — are the app shell. Plan 19-02 touched exactly two files, both under `e2e/`,
  and changed no component, no route and no server code. The mismatch is in the shell React renders
  on `/signup`, which the fixture drives on its way to a session.
- **It does not affect the measurement.** `/host/listings` is server-rendered and both guards read
  geometry after the grid's `<h1>` is visible. The three bands measured the same numbers a human sees
  on the shipped surface, and the numbers are internally consistent across bands (guard B reports the
  same `scrollWidth` of 332 at all three).
- Auto-fixing it would mean editing shell components on a plan whose entire remit is to build an
  instrument before a fix — exactly the scope creep the boundary rule exists to stop.

**What a future phase should check first.** The `md:hidden` wrapper and `Dialog open={undefined}`
in the trace suggest a viewport- or `open`-state-dependent branch rendering differently on the server
than on the client. It is NOT the `NEXT_DEV_ALLOWED_ORIGINS` class: the origin here is `localhost`.

---

## D2 — `/ops` 404 body is not byte-identical to the root not-found under a production build

**Found during:** 19-05, Task 2 (the production-build probe).

**What was measured.** Under `next build` + `next start`, with stable (repeatable) output:

```
/ops            fetch #1  sha256 537253f5a87aafb61aff4ab929a95ca2375a8a476b26e84b8360c070fbcd9a64
/ops            fetch #2  sha256 537253f5a87aafb61aff4ab929a95ca2375a8a476b26e84b8360c070fbcd9a64
/zzz-nonroute-a           sha256 d4de59d19358a5cf5f2dbcaf652e184564fe664d2d5988cd40fabd92ca405032
/zzz-nonroute-b           sha256 d4de59d19358a5cf5f2dbcaf652e184564fe664d2d5988cd40fabd92ca405032
sizes: /ops 25970 bytes;  both plain non-routes 29644 bytes  (delta 3674)
```

`19-RESEARCH § 1.1` describes D-219's cloak as having been "measured at 18-14 with sha256 body
equality". Under this build the two bodies are **not** equal.

**What the difference actually is** (measured, not assumed): both bodies carry the identical
`<title>Page not found · FitOut</title>`, and **no ops-identifying content leaks** — case-insensitive
counts are equal across both bodies (`Ops` 1 and 1) and `ops-console` / `Console` / `staff` / `Staff`
/ `wordmark` / `Dashboard` are **zero in both**. The ops wordmark that `(ops)/ops/layout.tsx`'s own
docblock warns would "tell a prober the console is real" is absent. The difference is that the plain
non-route additionally renders site chrome (the "We couldn't find that page" `h2`, and the footer nav
"Product" / "Legal & support") which the `/ops` body does not. **`/ops` is smaller, not larger** —
nothing extra is disclosed; some shared chrome is missing.

**Why it is deferred and not auto-fixed.**

- **The status control held.** The halt condition 19-05 and `T-19-22` define is a status other than
  `404`. `/ops` reported `404` in both the dev and the production matrix.
- **It is pre-existing and not caused by phase 19.** The complete set of non-`.planning/` files
  changed by every `19-*` commit is `ci.yml`, `e2e/helpers/booker-seed.ts`,
  `e2e/host-listing-grid.spec.ts`, `scripts/verify-workflows.mjs`,
  `src/components/listing/listing-card.tsx` and `tests/design/listing-card-merge-order.test.ts`.
  None renders `/ops` or the not-found. `src/app/(ops)/ops/layout.tsx` last changed in 18-12
  (`04c523f`, 2026-09-01); `src/app/not-found.tsx` in 11-14 (`a74341c`, 2026-08-14). Both predate
  this phase.
- The SCOPE BOUNDARY forbids fixing a pre-existing condition in files unrelated to the current task.

**No claim is made in either direction** — not that the cloak is broken, not that it is intact. Only
the measurement is recorded. **What a future phase should settle:** whether byte-equality is still
D-219's intended property, or whether the 18-14 measurement was taken under different conditions
(e.g. a dev server, where this comparison is provably invalid — `/ops` fetched twice differs from
itself in `next dev`). The security-relevant properties tested here — 404 status, identical title, no
ops-identifying strings — all hold. This is Phase 20 / ops-surface territory.

---

## D3 — The new routing guard went red once, and the discriminating status was NOT captured

**Recorded by:** plan 19-06, at plan-level verification
**File:** `e2e/host-route-reachability.spec.ts`
**Disposition:** `OPEN — evidence lost, no cause named`

**What happened.** During the plan's own `<verification>` step 3, one run of the newly-shipped
routing guard reported **3 of 4 routes failing** — `/host/listings/new`,
`/host/listings/route-reachability/edit` and `/host/listings/route-reachability/availability` — with
`/host/listings` passing. Every other run of that file in this plan was green: **six consecutive
green runs** (three before, three after), plus two further attempts that deliberately restaged the
one condition that differed (an `npx tsc --noEmit` immediately preceding, in the same shell
invocation). **Not reproduced.**

**⚠ THE STATUS WAS NOT CAPTURED, AND THAT IS THE FAILURE HERE.** The command's `grep` filter was
`^  ok|^  x|passed|failed`, which prints the per-test result lines but NOT the guard's own
`… answered NNN. Expected 307.` line — the single datum that discriminates a 404 (the subject of
this whole phase) from a 500, a connection reset, or a boot race. Playwright's `test-results/`
artifacts for that run were cleared by the next run before they were read.

**No cause is named** (D-11, and 19-RESEARCH Pitfall 3). It is not recorded as a reproduction of the
phantom 404, because nothing measured says it was one. It is recorded as **an observation whose
discriminating value was destroyed by how it was observed** — which is, with some irony, the same
class of loss D-11 exists to prevent, one level up: the instrument fired and the reading was not
taken.

**What the next reader must do if this guard goes red.** Read the full failure message — do not
filter it. Then, BEFORE re-running anything: capture the status per route, `next dev`'s stdout, and
`.next/dev/server/app-paths-manifest.json` before and after the request. Per `19-FINDING-404.md § 8`
that capture is **verdict B**, the scarcest thing in this investigation, and the only thing that can
close unproven items (a) and (c). A re-run destroys it.

Also logged to `.planning/WINDOWS.md` (entry 7).
