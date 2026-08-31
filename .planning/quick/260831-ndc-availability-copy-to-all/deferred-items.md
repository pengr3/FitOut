# Deferred items — quick task 260831-ndc

Out-of-scope discoveries made while executing this task. Nothing here was fixed; each is logged so it
is not lost, and each is named with the measurement that found it.

---

## D-1 — ~~`npm run build` fails at its LINT step on 36 pre-existing errors~~ — **FIXED by the orchestrator**

> **RESOLVED 2026-08-31, after this task's commits, by the orchestrator rather than the executor.**
> The executor was right to refuse it: the repair changes what the project's build gate covers, which
> is not a call a feature quick task gets to make. The orchestrator made that call because the
> breakage was **its own** — the Phase-18 spike commits earlier in the same session are what put
> `.js` files under `.planning/`.
>
> Applied exactly the repair suggested below: `".planning/**"` added to `globalIgnores` in
> `eslint.config.mjs`, with the reasoning stated in the file. Verified both directions —
> `npx eslint .` went **36 errors → 0** (25 warnings, all pre-existing in `src`/`e2e`), `src/` is
> still linted (guarding against over-ignoring), and **`npm run build` now exits 0**.
>
> The record below is kept as written, because the diagnosis is what made the fix a one-liner.

**Severity:** blocks a gate the whole project relies on. Not caused by this task.

**Measured:**

```
$ npm run lint  ; echo EXIT
✖ 427 problems (37 errors, 390 warnings)     # 37 while this task's own error was still present
EXIT:1

$ npm run build ; echo EXIT
EXIT:1                                        # stops at lint; `next build` never runs
```

After this task's own lint error was fixed, the remainder is **36 errors, all of them in
`.planning/spikes/**/*.js`**:

```
$ npx eslint src tests
✖ 22 problems (0 errors, 22 warnings)

$ npx eslint .planning
✖ 401 problems (36 errors, 365 warnings)
```

Per file: `@typescript-eslint/no-require-imports` × 35 across ten spike scripts, plus one
`@typescript-eslint/no-this-alias` in `003-bbox-vs-radius/leaflet.js` (a vendored Leaflet bundle).

**It predates this task, proven rather than assumed:**

```
$ git diff --stat d054761 -- .planning/spikes/ eslint.config.mjs package.json
(empty)
```

`d054761` is the commit immediately before this task's first commit, so the files ESLint reads for
those 36 errors are byte-identical to what they were before any of this work existed.

**How it got in:** `ab33c69` / `5cceb28` committed the four Phase-18 spikes under `.planning/spikes/`
as runnable CommonJS `.js` demos. `eslint.config.mjs`'s `globalIgnores` list covers `.next/**`,
`out/**`, `build/**`, `next-env.d.ts`, `.claude/worktrees/**` and `**/.next/**` — it does **not**
cover `.planning/**`, so ESLint lints spike scripts as if they were application source. Apparently
nothing ran `npm run build` between that commit and this task.

**Not fixed here, and why:** the fix is a repo-wide ESLint config decision (ignore `.planning/**`, or
scope the lint script to `src tests`, or convert the spikes to ESM) that touches a file this task has
no business editing and that changes what the project's build gate covers. That is a PM/architecture
call, not something to absorb inside a feature quick task.

**What was done instead:** the two halves of `npm run build` that this task can be judged on were run
directly and both pass —

```
$ npm run test:design
 Test Files  70 passed (70)
      Tests  1286 passed | 3 skipped (1289)

$ npx next build
✓ Compiled successfully in 21.2s
✓ Generating static pages using 7 workers (29/29) in 1379ms
```

**Suggested repair (one line, but it is a decision):** add `".planning/**"` to the `globalIgnores`
array in `eslint.config.mjs`, with a comment saying that planning artifacts and spike demos are not
application source. Re-run `npm run build` afterwards; it should reach `next build`.

---

## D-2 — Two quick-task rows have leaked out of STATE.md's Quick Tasks table into Deferred Items

**Severity:** cosmetic/tracking. Not caused by this task.

`.planning/STATE.md`'s `### Quick Tasks Completed` table ends with the `260831-9qx` row. Two further
quick-task rows — `260826-l1o` and `260828-q1x` — sit **below** the `## Deferred Items` heading,
inside that section's `| # | Category | Item | Status | Deferred At |` table, where their six columns
do not match its five and they render as malformed rows in a table about something else.

Left alone: moving rows between two tables in STATE.md during a feature task is exactly the kind of
silent edit that makes a later `git blame` on the tracking file useless. Worth a one-line fix in a
tracking pass.

---

## D-3 — The host shell's nav drawer throws a hydration mismatch on every host page

**Severity:** escalate. A React hydration failure in the shell every host page renders inside.

**Found** while driving the 320px keyboard walk for this task (the walk itself passed). The dev
server logged, on `/host/listings/[id]/availability`:

```
Uncaught Error: Hydration failed because the server rendered HTML didn't match the client.
As a result this tree will be regenerated on the client.
    at Button           (src/components/ui/button.tsx:143:5)
    at DialogTrigger    (src/components/ui/dialog.tsx:19:10)
    at ResponsiveDialog (src/components/patterns/responsive-dialog.tsx:250:18)
    at NavDrawer        (src/components/patterns/site-chrome.tsx:308:5)
    at SiteNav          (src/components/patterns/site-chrome.tsx:342:9)
    at AmbientHostNav   (src/components/patterns/ambient-notifications.tsx:176:10)
    at HostLayout       (src/app/(host)/host/layout.tsx:96:13)
```

**Not caused by this task, proven rather than assumed.** Two independent checks:

1. **Every file in that stack trace is untouched today.** `git log --since=2026-08-31` is empty for
   `site-chrome.tsx`, `ambient-notifications.tsx`, `(host)/host/layout.tsx`, `responsive-dialog.tsx`,
   `ui/dialog.tsx` and `ui/button.tsx`. This task changed six files and none of them is in that list.
2. **It reproduces on a page with no availability editor at all.** A throwaway probe loaded `/host`
   at 320px as a freshly-signed-up host and the same mismatch appeared. The availability route is not
   required to trigger it — the host *shell* is.

**Why it matters beyond a dev warning.** React discards the server tree and re-renders that subtree on
the client. The affected subtree is the host navigation drawer, which is the mobile navigation for the
entire host side of the product, and it is reached through `ResponsiveDialog` — the same overlay
primitive this task's copy dialog composes. It also means the host shell is doing work twice on every
host page load at small widths.

**Not investigated further** — it is outside this task's scope and outside the surface it touched. The
obvious first hypothesis, stated as a hypothesis and not a diagnosis: `AmbientHostNav` streams a
pending-request count, so a server/client disagreement about that value (or about the drawer's open
state) at first paint would produce exactly this. Rule that in or out before building on it.

**Reproduce:** run the app, sign up a host, set `can_host`, load `/host` at a 320px viewport, and read
the dev-server console.
