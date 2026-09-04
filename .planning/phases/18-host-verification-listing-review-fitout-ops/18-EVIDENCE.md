# Phase 18 — probe evidence

**This file is this phase's permanent probe-transcript record.** It plays for Phase 18 the role
`.planning/phases/17.1-close-phase-17-escalations-sticky-bar-clearance-soft-404-pro/17.1-EVIDENCE.md`
plays for 17.1: every number a plan in this phase measures lands here **verbatim, as a number on a
named route in a named build**, not paraphrased into a SUMMARY sentence (D-14).

Two rules this file inherits unchanged:

1. **The prediction is written BEFORE the reading, in the same section.** A prediction written after a
   measurement is a description.
2. **Corrections are APPENDED, never substituted.** If a later drive contradicts a reading recorded
   here, the original stays byte-identical and the correction is added beneath it with its date.

| § | Probe | Requirement | Written by | Status |
|---|---|---|---|---|
| **P1** | The `/ops` status-line audit under `next build && next start` — four readings, one of them a nonexistent-route control | **OPS-02** | plan **18-14** | **recorded — three of four as predicted, plus ONE FINDING** |

---

## § P1 — `/ops` under `next build && next start` (OPS-02, assumption `[A8]`)

**Driven by:** plan **18-14**, Task 1, on **2026-09-01**. Manual-only by design — **no automated
instrument in this repository can read an HTTP status line**, and `tests/design/soft-404-status.test.ts:31-39`
says so in its own words: *"The e2e spec is the ONLY instrument in this repo that can see an HTTP status
line."* D-24 then keeps every e2e spec but one out of CI. The four `curl` codes below **are** the
deliverable.

### The question, and why a dev-server reading could not settle it

OPS-02's last clause is *"a non-staff caller cannot distinguish an ops route from a route that does not
exist"*. That is a claim about **numbers**, and it had never been read on this route tree.

It also could not be read under `next dev`. `src/app/(ops)/ops/page.tsx` reads the database, so it is an
async page, so `tests/design/loading-coverage.test.ts` (build-blocking) requires a `loading.tsx` beside
it — and a `loading.tsx` is a `<Suspense>` boundary, which commits **200** the moment the shell flushes.
A page-level `notFound()` inside that boundary is therefore too late to set a status line. The whole of
18-12's design rests on `assertStaff()` running in the **layout**, above the boundary, where the status
line is still open. Dev and production differ on exactly this streaming behaviour, so the reading had to
be taken under a production build.

### The prediction, written before the drive

**200 / 404 / 404 / 404** (staff / non-staff / signed-out / nonexistent control), per 18-RESEARCH § F2b
and D-219.

**The nonexistent-route control is mandatory and it is the fourth reading.** Without it the other three
prove nothing about *indistinguishability* — three 404s on a route that answers 404 to everything, or an
app that is 404ing wholesale, would read identically. **The equality of readings 2, 3 and 4 IS the
OPS-02 claim**; reading 1 differing is what makes the route real.

**A 200 on reading 2 or 3 would be a REAL FINDING, not a transcript to tune** — it would mean the layout
assert is not winning the status line.

### The mechanism under test (shipped by 18-12, unchanged by this plan)

`src/app/(ops)/ops/layout.tsx` awaits `assertStaff()` before returning any JSX, inside no boundary of
any kind. `src/app/(ops)/ops/page.tsx` calls `requireStaff()` itself (layer 2, D-216/D-247), and every
ops server action calls it too (layer 3). The layout exists for the status line and **is not the
security boundary** — its own header says so, in `src/middleware.ts:1`'s words.

### Build provenance

| | |
|---|---|
| commit the build was made from | **`852072141b6ec1bbd6277f8e3664675af68d32d2`** (`8520721`, `fix(18-14): listing_review.listing_id cascades — D-254`) |
| branch | `dev` |
| working tree at build time | **clean** — `git status --short` returned nothing |
| `.next/` | **cleared** (`rm -rf .next`) before building. No dev server was running against it (`netstat -ano \| grep LISTENING` on `:3000` and `:3100` was empty before the clear), so § P1's operational rule from 17.1 had nothing to act on |
| build command | `npm run build` (= `npm run lint && npm run test:design && next build`) — **exit 0** |
| server version line, verbatim | `▲ Next.js 16.2.7` |
| server ready | `✓ Ready in 288ms` |

### The exact `next start` invocation

```
PLATFORM_WALLET_NUMBER=09170000000 PLATFORM_WALLET_NAME="local" \
  node ./node_modules/next/dist/bin/next start -p 3100
```

The three operational facts 17.1 § P1 recorded carry over unchanged and for the same reasons:

- **The wallet values are throwaway literals**, passed inline on that one process. `src/lib/paymongo.ts:39-48`
  refuses to boot in production without them and is exempted only for `NEXT_PHASE=phase-production-build`
  — which is why `npm run build` is green while `npm start` is not. Both vars are **absent from
  `.env.local` and stayed absent**. No payout path is exercised by a status-line read.
- **Port 3100, never 3000**, so no later Playwright run can adopt this server.
- **`node ./node_modules/next/dist/bin/next`**, so the shell owns the real server PID rather than an
  `npm`/`npx` wrapper.

### The accounts — resolved on this run, not copied from any planning document

```
$ npm run ops:grant -- host@fitout.test --by "18-14 executor (OPS-02 status-line audit)"
host@fitout.test was ALREADY staff (AcW4AhUfkMexEvvEUa8KjsngD7ubMoZy) — nothing changed, attempt recorded.
```

| Reading | Account | `user.role` | Session |
|---|---|---|---|
| 1 | `host@fitout.test` | **`staff`** | live, expires `2026-10-01T05:16:19.405Z` |
| 2 | `pengr.clmc.3@gmail.com` | **`user`** | live, expires `2026-09-09T04:25:43.192Z` |
| 3 | — | — | **none sent** |
| 4 | — | — | none sent |

Session cookies were minted from **existing live `session` rows** rather than by typing a password into
the login form (the shipped local-UAT idiom): cookie value = `` `${token}.${base64(HMAC_SHA256(BETTER_AUTH_SECRET, token))}` ``,
cookie name `better-auth.session_token`. Both rows were verified `expires_at > now()` in the same query
that read them.

### THE READING — four status codes

```
$ printf '%-46s -> ' '/ops              (STAFF session)'
  curl -s -o /dev/null -w '%{http_code}\n' --cookie "$STAFF"    http://localhost:3100/ops
$ printf '%-46s -> ' '/ops              (NON-STAFF session)'
  curl -s -o /dev/null -w '%{http_code}\n' --cookie "$NONSTAFF" http://localhost:3100/ops
$ printf '%-46s -> ' '/ops              (NO session)'
  curl -s -o /dev/null -w '%{http_code}\n'                      http://localhost:3100/ops
$ printf '%-46s -> ' '/ops/xyz          (route does not exist)'
  curl -s -o /dev/null -w '%{http_code}\n'                      http://localhost:3100/ops/xyz

/ops              (STAFF session)              -> 200
/ops              (NON-STAFF session)          -> 404
/ops              (NO session)                 -> 404
/ops/xyz          (route does not exist)       -> 404
```

| # | Route | Caller state | Status | Predicted |
|---|---|---|---|---|
| 1 | `/ops` | **staff** session | **200** | 200 ✔ |
| 2 | `/ops` | **non-staff** session | **404** | 404 ✔ |
| 3 | `/ops` | **no** session | **404** | 404 ✔ |
| 4 | `/ops/xyz` | route does not exist — **the CONTROL** | **404** | 404 ✔ |

**Second pass, same server, immediately after — identical: 200 / 404 / 404 / 404.** No 5xx appeared on
any route on either pass, so these are status-line readings and not a boot-guard failure.

**Readings 2, 3 and 4 are the same number and reading 1 differs. That equality is OPS-02's last clause,
measured.**

### The body check for readings 2–4

The plan required this separately: a prober must not be shown an "Ops" header on a page claiming not to
exist.

```
b1   bytes=38487    occurrences-of-Ops=2    title=<title>FitOut</title>
b2   bytes=25970    occurrences-of-Ops=0    title=<title>Page not found · FitOut</title>
b3   bytes=25970    occurrences-of-Ops=0    title=<title>Page not found · FitOut</title>
b4   bytes=29644    occurrences-of-Ops=0    title=<title>Page not found · FitOut</title>

$ sha256sum b2.html b3.html
e23b91098aac45a9976d7f4fd69cc0bf796ea36f1ca18abe33fdbb1cf7cdb365 *b2.html
e23b91098aac45a9976d7f4fd69cc0bf796ea36f1ca18abe33fdbb1cf7cdb365 *b3.html
$ cmp b2.html b3.html && echo IDENTICAL
IDENTICAL
```

- **The ops chrome is absent from every 404 body.** `SiteChrome`'s brand renders `FitOut · Ops`; the
  string `Ops` occurs **twice** in the staff body and **zero** times in all three 404 bodies. The
  blocking `await assertStaff()` above the Suspense boundary is doing exactly the job its header claims.
- **Readings 2 and 3 are byte-identical (same SHA-256).** A prober cannot tell *"you are signed in but
  not staff"* from *"you are not signed in"* — which is a second indistinguishability OPS-02 does not
  ask for and gets anyway.
- All three 404 bodies carry the same `<title>` and the same visible strings (`Page not found`, the
  root chrome's `Find a space` / `Host your space` / `Log in` / `Sign up`). **Rendered, they are the
  same document.**

Reading 1's body was captured only to count the string `Ops` and measure its length; **no ops queue
content is transcribed into this file.**

---

### ⚠ THE FINDING — the four numbers are right, and a fifth number is not

Reading 4 is **29644 bytes** and readings 2/3 are **25970**. That difference is stable across three
consecutive repetitions, and it is not cosmetic — it comes with **different response headers**:

```
$ curl -s -D - -o /dev/null http://localhost:3100/ops
HTTP/1.1 404 Not Found
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
Transfer-Encoding: chunked

$ curl -s -D - -o /dev/null http://localhost:3100/ops/xyz
HTTP/1.1 404 Not Found
Cache-Control: private, no-cache, no-store, max-age=0, must-revalidate
x-nextjs-cache: HIT
x-nextjs-prerender: 1
x-nextjs-prerender: 1
x-nextjs-stale-time: 300
Content-Length: 29644
```

```
rep1  /ops(nonstaff)=25970  /ops(signed-out)=25970  /ops/xyz=29644
rep2  /ops(nonstaff)=25970  /ops(signed-out)=25970  /ops/xyz=29644
rep3  /ops(nonstaff)=25970  /ops(signed-out)=25970  /ops/xyz=29644
```

**A path with no matching route is served from the PRERENDERED static 404** (`x-nextjs-prerender: 1`,
`x-nextjs-cache: HIT`, a fixed `Content-Length`). **A matched route that throws `notFound()` is served
DYNAMICALLY** (`Transfer-Encoding: chunked`, no `x-nextjs-*` headers at all). One request pair therefore
still tells a prober that *something is routed at `/ops`* — read off the headers rather than the status
line.

**It is not ops-specific, it is not new, and 18-12 did not introduce it.** The same signature was
measured on the shipped route 17.1 § P1 blessed, and on two unrouted controls:

```
/listings/a-listing-that-must-never-exist-18-14    HTTP/1.1 404 Not Found  Transfer-Encoding: chunked
/xyz                                               HTTP/1.1 404 Not Found  x-nextjs-prerender: 1  Content-Length: 29644
/a/b/c                                             HTTP/1.1 404 Not Found  x-nextjs-prerender: 1  Content-Length: 29644
/ops                                               HTTP/1.1 404 Not Found  Transfer-Encoding: chunked
```

`/listings/[id]` — a route that has answered a hard 404 to the public since `89fb451`, and whose
production reading is 17.1 § P1's whole subject — behaves **identically** to `/ops`. This is a property
of how Next 16.2.7 serves a matched-route `notFound()` versus an unmatched path, app-wide.

**Why it was not caught before:** 17.1 § P1 deliberately captured **no bodies** (`curl -o /dev/null`,
status line only — that was T-17.1-01's mitigation), so this class of signal has never been measured on
this codebase until now. It is new *information*, not a new *defect*.

**What it does and does not cost OPS-02.** OPS-02's last clause is operationalised in this project as a
claim about the **status line** — that is what 18-VALIDATION § Manual-Only Verifications specifies, what
`tests/design/ops-guard-coverage.test.ts` pins the structure of, and what the four readings above
settle. At that level the requirement is **met**. Read at its most literal — *cannot distinguish*, full
stop — it is **not** met at the transport level, and no ops-side change can meet it: a `not-found.tsx`
under `(ops)` would change which body is rendered, not whether the response is prerendered.

**Not fixed here, and deliberately so.** It is app-wide (every dynamic route in FitOut has it), it is
out of this plan's scope boundary, and the honest repair is a framework-level or edge-level one
(normalising the 404 response shape for every route at the same time). **Filed as a finding for the PM
and the roadmap, not as a Phase-18 defect.** The ops data itself does not leak: the status line, the
rendered document, and the absence of ops chrome are all as required, and readings 2 and 3 are
byte-identical to each other.

---

### What this transcript settles, and what it does not

It settles two things, both under a production build of `8520721` on Next.js 16.2.7, and neither of them
under `next dev`:

1. **The status line.** `/ops` answers **200** to staff and **404** to everyone else, and that 404 is
   the *same number* an unrouted path answers.
2. **The body.** All three 404 bodies are the root not-found document, carry no ops chrome and no `Ops`
   string, and the two `/ops` 404s are byte-identical to each other.

It does **not** settle, and must never be read as settling:

- **It is a ONE-TIME AUDIT, not a gate.** Nothing re-runs it. **Pitfall 9 — believing a Playwright or
  manual assertion is a gate.** The ONGOING, per-commit, build-blocking instrument is
  **`tests/design/ops-guard-coverage.test.ts`**, which pins that `assertStaff()` is CALLED in the layout
  and `requireStaff()` in the page and in every ops action. The structural test pins what the guard IS;
  this transcript records what it RETURNED, once, on this build. Deleting either because the other
  exists is the mistake this paragraph is here to stop.
- **It says nothing about the header-level oracle above**, which the four numbers cannot see and which
  no ops-side change can close.

### Server teardown

| | |
|---|---|
| **real Windows listener PID on :3100** | **`20872`** (`netstat -ano` while serving) |
| after kill | `taskkill /PID 20872 /T /F` → `SUCCESS`; `tasklist /FI "PID eq 20872"` → *No tasks are running which match the specified criteria* |
| port 3100 | no LISTENING socket; `curl --max-time 3 http://localhost:3100/` → **exit 7, connection refused** |

**No production server was left holding a port.** No dev server was running before this drive and none
was started by it — `:3000` is as it was found.

### Source untouched

```
$ git diff --exit-code src/     (after the readings)
```

The audit changed no source file. The only source change in plan 18-14 is D-254's FK, committed as
`8520721` **before** this build — which is why the build provenance above names it.
