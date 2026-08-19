---
type: quick
slug: nested-main-landmarks
created: 2026-08-20
files_modified:
  - src/app/(app)/bookings/[id]/page.tsx
  - src/app/(app)/bookings/[id]/cancel/page.tsx
  - src/app/(app)/bookings/[id]/group/page.tsx
  - e2e/shell.spec.ts
---

# One `<main>` per document, not two

## Why

`src/app/(app)/layout.tsx:96` renders `<main className="flex flex-1 flex-col">{children}</main>`.
Three pages under that layout return their own `<main>` inside it, so those routes ship **two nested
`main` landmarks**:

| File | Opening `<main>` tags |
|------|----------------------|
| `(app)/bookings/[id]/page.tsx` | 5 (lines 258, 319, 397, 491, 570 — every return branch) |
| `(app)/bookings/[id]/cancel/page.tsx` | 2 |
| `(app)/bookings/[id]/group/page.tsx` | 2 |

Nine branches. `document.querySelectorAll("main").length === 2` on `/bookings/[id]`, measured.

This is a real assistive-technology defect, not a tidiness question. A screen-reader user navigating
by landmark gets two "main" regions on one page, and the outer one is not the content — it is the
layout shell. The HTML spec permits at most one `main` in the accessibility tree per document; the
extras are ignored or announced as duplicates depending on the AT, which is worse than either
outcome alone because it varies by tool.

**The rule is already written down in this route's own directory, and already obeyed one file over.**
`(app)/bookings/[id]/loading.tsx:14-15` says:

> It renders as a `<div>`: `(app)/layout.tsx` already wraps `{children}` in `<main>`, and a second
> `<main>` inside the first is a landmark this file has no reason to add.

and its container comment adds "Container is `(app)/bookings/[id]/page.tsx`'s own, verbatim" — so the
skeleton copies the page's classes and correctly downgrades the element. The page it mirrors does not.
The skeleton is right and the page is wrong.

## Task 1: downgrade the nested landmarks and pin the invariant

**The change is mechanical and must stay mechanical.** In each of the nine branches, replace the inner
`<main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">` with a `<div>` carrying the identical
className, and its matching `</main>` with `</div>`. Do not restyle, do not re-indent surrounding
markup, do not "improve" the container classes — a diff that touches layout while claiming to fix a
landmark is a diff nobody can review. `loading.tsx` is already the target shape; match it.

Check each file for its true branch count rather than trusting the table above — grep for `<main`
per file and confirm every opening tag has its matching close changed. An unbalanced tag is a build
error, which is the good failure mode, but a missed *pair* is a silent half-fix.

**Then pin it, because nothing currently asserts it.** `e2e/shell.spec.ts` already carries AC#4 —
"exactly ONE navigation landmark at every width" — with a worked argument about counting the right
thing ("0 is not 1 for the wrong reason — or, worse, 1 is 1 against some other landmark"). Add the
`main` equivalent in the same file, in that shape and citing it: exactly one `main` landmark on the
routes this touches, asserted at the widths AC#4 already uses.

Without the test this regresses the moment someone adds a sixth return branch by copying the fifth,
and no gate in the repo would notice — the same silent-regression shape as CR-01's missing focus move.

## Verify

- `grep -c "<main" src/app/\(app\)/bookings/\[id\]/page.tsx` and the two sibling pages return **0**;
  `(app)/layout.tsx` still returns 1.
- The new e2e assertion **watched failing first**: revert one branch to `<main>`, run it, record the
  failure verbatim, restore, record green. A landmark test that has never failed is not a gate.
- `npx tsc --noEmit`, `npx vitest run`, `npm run build` stay green (141 files / 1307 tests, 0 errors,
  12 known lint warnings at HEAD).
- `npx playwright test e2e/shell.spec.ts --project=chromium --workers=1` green.

## Out of scope

Do not touch `e2e/hold-countdown.spec.ts` or `e2e/open-capacity.spec.ts` — a separate streaming-buffer
sweep owns those files. Do not touch `e2e/visual/`, `.github/workflows/` or
`src/lib/design/visual-baselines.ts`; Phase 12's 52 baselines are green and a DOM change under a
baselined surface would invalidate them.

**Check before starting:** none of the three pages is a baselined visual surface. `/bookings/[id]` is
not in `VISUAL_BASELINES`. Confirm that rather than assuming it — if any of these routes IS baselined,
stop and report, because the fix would require a re-mint and that is the operator's dispatch.
