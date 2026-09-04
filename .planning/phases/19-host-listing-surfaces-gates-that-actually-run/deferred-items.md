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
