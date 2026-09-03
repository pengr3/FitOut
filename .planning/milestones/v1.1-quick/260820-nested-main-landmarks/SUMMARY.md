---
quick_id: 260820-nested-main-landmarks
slug: nested-main-landmarks
date: 2026-08-20
status: complete
commits:
  - d800ccd  # fix(quick-260820-nested-main-landmarks): one main landmark per document
files_modified:
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(app)/bookings/[id]/cancel/page.tsx
  - src/app/(app)/bookings/[id]/group/page.tsx
  - e2e/shell.spec.ts
follow_ups: []
---

# Quick Task 260820-nested-main-landmarks — One `main` per document, not two

## What was wrong

`src/app/(app)/layout.tsx:96` wraps every child of the `(app)` group in `<main className="flex flex-1
flex-col">`. Three pages under that layout returned their **own** `main` inside it, across nine
return branches, so those routes shipped two nested `main` landmarks —
`document.querySelectorAll("main").length === 2`, measured on `/bookings/[id]`.

At most one `main` belongs in a document's accessibility tree. The extras are dropped by some
assistive tech and announced as duplicates by others, which is worse than either outcome alone
because it varies by tool — and the landmark a screen-reader user lands on first is the layout shell,
not the page's content.

**The rule was already written down in this route's own directory and already obeyed one file over.**
`(app)/bookings/[id]/loading.tsx:14-15` says the skeleton renders as a `div` because the layout
already wraps children in `main`, and "a second `<main>` inside the first is a landmark this file has
no reason to add" — while its container comment says it copies the page's classes verbatim. The
skeleton was right; the page it mirrors was wrong.

## What changed

### 1. Nine containers downgraded, and nothing else touched

| File | Branches | What each one is |
|---|---|---|
| `(app)/bookings/[id]/page.tsx` | 5 | `requested`, `approved`, `declined`, `cancelled`, confirmed/completed |
| `(app)/bookings/[id]/cancel/page.tsx` | 2 | the "already started / already ended" refusal, and the live review screen |
| `(app)/bookings/[id]/group/page.tsx` | 2 | the load-failed state, and the organizer's roster |

Each inner `<main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">` became a `<div>` with the
**identical** className, and each matching `</main>` became `</div>`. The edit was made by one `sed`
substitution per file precisely so nothing else could ride along: no restyling, no re-indent, no
container-class "improvement". The code half of the diff is 9 open + 9 close tag lines and nothing
more.

Tag balance was verified per file rather than trusted from the plan's table (which was correct at
5 / 2 / 2). An unbalanced tag would have been a build error — the good failure mode; a missed *pair*
would have been a silent half-fix on one branch, which is what the per-file grep ruled out.

### 2. One header note per file, not nine per branch

Each file now records the rule once in its header block: the layout owns the landmark, the container
is a `div`, `loading.tsx` is the shape to copy when a sixth branch is added, and the e2e gate that
pins it. `page.tsx` carries the full argument — it is where the defect was measured — and the two
siblings cite it rather than restate it.

**The notes deliberately avoid the literal string `<main`**, so the verification grep below stays a
true zero rather than a zero a future comment could quietly break.

### 3. The invariant is pinned — `e2e/shell.spec.ts`

A new describe, "AC#4's sibling — one `main` landmark on the booking routes", sits directly after
AC#4 (one navigation landmark), whose shape and argument it mirrors and cites. It seeds a confirmed
booking plus a group row, then visits all three routes at **320px and 1280px** — the widths AC#4
already uses.

Two things about how it is written, both forced by THE STREAMING-BUFFER RULE
(`e2e/search-and-book.spec.ts:230-283`, cited in the spec rather than restated):

- **The matcher is part of the assertion.** `getByRole("main")` is buffer-**immune**: React's
  `<div hidden id="S:N">` staging copy is `display:none` and therefore out of the accessibility tree,
  so a role query counts the live tree only. That file *measured* the staged copy carrying this very
  route's container (`class="mx-auto w-full max-w-2xl …"`), so a CSS `locator("main")` here would
  have counted 2 during the ~100 ms overlap and failed against a document no user ever sees.
- **Vacuity was the real hazard.** `toHaveCount(1)` goes green while the page body is still staged,
  satisfied by the *shell's* landmark alone — green against the exact document in which a nested
  landmark would still be sitting in the buffer. So each route is gated on a resolved-only signal
  first, taken from that route's own `loading.tsx`: the detail and cancel skeletons render **no h1**
  (their headers say why), so an h1 proves the body landed; the group skeleton **does** render
  `Your group`, so that route is gated on the `Copy link` button, which only the resolved page mounts.

One theme, not two: AC#2/AC#3 loop `THEMES` because they measure pixels and a token can move them. A
landmark count is structural and cannot vary by theme.

## Watched red — recorded verbatim

`(app)/bookings/[id]/page.tsx:580/686` (the confirmed branch — the one the defect was originally
measured on) reverted to the nested landmark, the other eight left fixed:

```
npx playwright test e2e/shell.spec.ts --project=chromium --workers=1 -g "landmark on the booking routes"
```

**1 failed**, on the FIRST route at the FIRST width:

```
Error: /bookings/e2e_landmark_booking_50bf5961-adae-476b-97f9-0d657bc5f71b · court · 320px: the
document exposes a number of `main` landmarks other than one. `(app)/layout.tsx:96` wraps every child
in the ONE main landmark this group gets, so a page under it that opens its own nests a second inside
the first — the defect this describe exists for. …

expect(locator).toHaveCount(expected) failed

Locator:  getByRole('main')
Expected: 1
Received: 2
Timeout:  5000ms

Call log:
  - waiting for getByRole('main')
    14 × locator resolved to 2 elements
       - unexpected value "2"
```

**The call log is the load-bearing half**, and it is what makes this red evidence rather than a
number: 14 consecutive polls across the 5s timeout all saw 2. The streaming buffer's overlap is
~100 ms (`search-and-book.spec.ts`'s own measurement), so no buffer artifact could hold for 14
samples — this is the live tree holding two landmarks. Restored; green.

## Verification

| Gate | Result |
|---|---|
| `grep -c "<main"` on all three pages | **0**, **0**, **0** |
| `grep -c "<main"` on `(app)/layout.tsx` | **2 lines** — the tag at `:96` plus a prose mention inside the SHELL-02 comment at `:97`. Element count (`grep -c "<main className"`) is **1**, unchanged. The plan predicted 1; the extra line is a pre-existing comment, not a second landmark. |
| `npx playwright test e2e/shell.spec.ts --project=chromium --workers=1` | **20 passed (1.4m)**, run twice consecutively — both green. The streaming defect is warmth-dependent, so a single green would have proved little. |
| `npx tsc --noEmit` | 0 errors |
| `npx vitest run` | **141 files passed / 1 skipped · 1307 tests passed / 4 skipped** — identical to the HEAD baseline |
| `npm run build` | **0 errors, 12 warnings** — the same 12 known warnings as HEAD |

**Baselines were checked before starting, not assumed.** No `/bookings/…` route appears in
`src/lib/design/visual-baselines.ts`, so this DOM change cannot invalidate Phase 12's 52 baselines
and no re-mint is needed. `e2e/visual/`, `.github/workflows/` and the baseline module were not
touched, and the `baselines` workflow was not dispatched.

`e2e/hold-countdown.spec.ts`, `e2e/open-capacity.spec.ts` and `e2e/search-and-book.spec.ts` were read
(the streaming-buffer rule lives in the third) and **not modified** — the sweep that just closed on
them stands.

## Notes for the next reader

- **The seeded describe cleans up in an order the shared helper cannot.** `booking_group.booking_id`
  is `ON DELETE RESTRICT` (`schema.ts:970-975` — "a booking that owns a group cannot be
  hard-deleted"), so `afterAll` deletes the group row *before* `seed.teardown()` deletes the booking.
  Without that the whole seed is undeletable and the failure reads as a teardown bug rather than as a
  missing DELETE.
- **The booking is seeded 10 hours before its session on purpose.** That is what makes `…/cancel`
  render its live review branch rather than the "this session has already started" refusal, so the
  container under test is the one a booker actually reaches.
- **A sixth return branch on the detail page must copy its container from `loading.tsx`**, never from
  a sibling page that owns its own landmark. That is exactly the regression this test now catches,
  and before it nothing in `e2e/` or `tests/` counted landmarks at all.
