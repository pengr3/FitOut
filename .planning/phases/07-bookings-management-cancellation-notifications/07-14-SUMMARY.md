---
phase: 07-bookings-management-cancellation-notifications
plan: 14
subsystem: notifications
tags: [notifications, ui, security, idor, xss, polling, manage-03, d-92, d-84]
requires:
  - countUnread
  - listRecent
  - NOTIFICATIONS_MAX_LIMIT
  - NotificationRow
  - NotificationPayload
  - readDbNow
  - rateLimit
  - recordAudit
provides:
  - markNotificationRead
  - markAllNotificationsRead
  - MarkReadResult
  - NotificationBell
  - NotificationItem
  - NotificationItemData
  - describeNotification
  - toNotificationItems
  - formatTimeAgo
  - safeHref
affects:
  - src/app/(app)/layout.tsx
  - src/app/(host)/host/layout.tsx
tech-stack:
  added: []
  patterns:
    - "Render-side URL scheme allow-list as the counterpart to a write-side one (durable rows outlive their writer's guard)"
    - "Bounded hidden-aware poller: document.hidden PAUSES rather than skips, so the attempt budget is not spent while nobody is looking"
    - "Client component that fetches nothing — server layout computes owner-scoped props and passes them down"
    - "Exhaustive discriminated-union switch closed by a trailing `never` weld (07-07 convention), no default clause"
    - "First jsdom component test in the repo, using the pragma the vitest config was already written for"
key-files:
  created:
    - src/app/actions/notifications.ts
    - src/components/notifications/notification-bell.tsx
    - src/components/notifications/notification-item.tsx
    - tests/security/notification-owner-scope.test.ts
    - tests/notifications/notification-render.test.tsx
  modified:
    - src/app/(app)/layout.tsx
    - src/app/(host)/host/layout.tsx
    - .planning/phases/07-bookings-management-cancellation-notifications/deferred-items.md
decisions:
  - "The render path re-validates the href scheme independently of 07-07's write guard — a durable row outlives the guard that wrote it"
  - "A refused href degrades the row to static, readable content rather than dropping it or substituting a destination"
  - "document.hidden PAUSES the poller (no attempt burned) rather than skipping, so a backgrounded tab does not come back permanently stale"
  - "Both layouts wrap the notification read in try/catch: an ambient convenience must never take down the shell that carries the session gate"
  - "Relative time labels are composed server-side against the DB clock; no Date crosses to the client"
metrics:
  duration: ~45m
  completed: 2026-07-21
  tasks: 3
  commits: 3
---

# Phase 7 Plan 14: In-App Notification Centre Summary

A bell with an unread badge mounted in both headers, a `popover` panel of the 20 most recent notifications with owner-scoped mark-read actions, and a bounded `router.refresh()` poller that pauses when the tab is hidden — closing the in-app half of MANAGE-03 that 07-07 built the layer for and 07-10 started feeding.

## What Was Built

**Task 1 — the write half** (`845fc24`). `src/app/actions/notifications.ts`: `markNotificationRead` and `markAllNotificationsRead`, both scoping on `recipient_id` inside the UPDATE's own WHERE. Both are idempotent by construction (additionally scoped to not-yet-read rows, so a replay claims 0 rows and does not rewrite the timestamp). The bulk action is rate-limited at 60/60s and audits only the denial.

**Task 2 — the read half** (`6474ce9`). `notification-item.tsx` carries the exhaustive `NotificationPayload → { Icon, title, body }` switch (no `default`, closed by a `never` weld), the `safeHref` allow-list, `formatTimeAgo`, and `toNotificationItems` — the one mapping both layouts share. `notification-bell.tsx` is the `"use client"` popover: ghost 44×44 trigger, `secondary` badge hidden at 0 and capped at `9+`, `w-80 sm:w-96` / `max-h-96` panel with an internal `ScrollArea`, `Mark all as read` shown only when unread > 0, no `View all` link, and the bounded hidden-aware poller.

**Task 3 — the mounts and the proof** (`bbc8fb2`). One `NotificationBell` in both inline headers with server-computed owner-scoped props. Two test files: the owner-scope integration file the plan named, plus a render-safety file (see Deviation 2).

## The Security Claims, and How Each Was Actually Proven

Not asserted — each was verified by breaking the control and watching the suite go red, then restoring.

| Mutation applied | Result |
|---|---|
| Drop `WHERE n.recipient_id = …` from `listRecent` | **3 of 8 failed** |
| Drop `recipient_id = …` from `countUnread` | **3 of 8 failed** |
| Drop `AND recipient_id = …` from `markNotificationRead` | **2 of 8 failed** |
| Drop `AND recipient_id = …` from `markAllNotificationsRead` | **1 of 8 failed** |
| Render `item.payload.href` instead of `safeHref(item.payload.href)` | **6 of 13 failed** |
| (all restored) | **8/8 and 13/13 pass** |

**The positive controls are the load-bearing half.** Every isolation assertion in the file is vacuous against an implementation that denies or returns nothing, so the file deliberately also asserts the affirmative:
- `countUnread(alice)` is **exactly 3** and `countUnread(bob)` is **exactly 2** — not "greater than zero", and explicitly not the table total of 5.
- `listRecent(alice)` returns the **exact expected id set** (read rows included — it is a history list, not an inbox), so "contains none of Bob's" cannot pass by returning `[]`.
- Alice genuinely **can** mark her own row read (`read_at` flips, verified by reading the table directly, never through the code under test), and a second call is a no-op that does **not** rewrite the timestamp.
- Bob demonstrably **has** unread rows to lose immediately before `markAllNotificationsRead` runs.

**Mark-read is owner-scoped and is not an oracle.** Marking a foreign id and marking a nonexistent id return byte-identical results — asserted with `toEqual` between the two calls rather than each against a literal, so a future edit cannot let them quietly diverge while both still "match". Bob's row is checked unread by a direct table read afterwards.

**A `javascript:` href never reaches a rendered anchor.** Six hostile shapes are covered — `javascript:`, mixed-case `JavaScript:`, whitespace-prefixed `  javascript:`, `data:text/html`, `vbscript:`, and protocol-relative `//evil.example` (the case a naive `startsWith("/")` waves straight through). Each asserts zero anchors in the subtree *and* that the string appears nowhere in `innerHTML` as any attribute value. Positive controls confirm a legitimate root-relative and an `https://` href both **do** render one anchor with the exact expected `href`.

## Key Decisions

| Decision | Choice | Why |
|---|---|---|
| Where href scheme validation lives | Both ends — 07-07's write boundary **and** a render-side allow-list | A durable row outlives the guard that wrote it. Rows written before 07-07 landed, rows from a future emitter that skips the shared boundary, and rows edited in the DB by hand all arrive at this renderer unexamined. 07-07's own summary names this component as the surface it was defending in advance; defence at one end of a durable pipe is not defence. |
| What a refused href does | Row degrades to **static, readable content** — no anchor, not dropped, no substitute destination | Dropping it hides a notification the user is entitled to read. Substituting `/bookings` fabricates a link the writer never wrote. Rendering it inert is the only option that neither lies nor loses information — and it is what makes "no anchor exists" a clean, testable property. |
| `document.hidden` handling | **Pause** (no attempt burned), not skip | Skipping while still counting means a tab backgrounded for 20 minutes exhausts its budget unseen and comes back permanently stale — the poller would have "worked" while delivering nothing. Pausing is what makes the bound behave. |
| Relative time (`2h ago`) | Composed **server-side against the DB clock**; no `Date` crosses to the client | The repo timestamp contract's natural next victim. A viewer with a skewed machine clock would read "in 3 hours" on a notification that just arrived. `readDbNow` is the clock every other Phase-7 time surface already trusts. |
| Layout failure handling | Both notification reads wrapped in `try/catch`, degrading to the panel's error copy | A notification is an ambient convenience. The `(host)` layout is *also* the T-04-02 capability gate and `(app)` is the session gate — a throw there is an availability incident for every page in the group. See Deviation 1. |
| Panel primitive | `popover` | Recorded inline: `dropdown-menu` carries `menuitem` semantics, implying a command surface with roving-tabindex arrow navigation. This is links plus a button. Cosmetically identical; the difference is entirely in what AT is told. |
| Unread signalling | `bg-muted` tint **and** a 6px brand dot **and** an `sr-only "Unread"` | Two visual signals per UI-SPEC, plus the third the spec implies but does not state: a coloured dot conveys nothing to a screen reader, so the unread state also reaches AT as a word. |
| Badge vs. `aria-label` | Badge is `aria-hidden`, display capped at `9+`; the label carries the **true** count | `aria-label="Notifications, 27 unread"` is more useful than "9+", and a duplicated numeral announced twice is noise. |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Correctness] Both layouts wrap the notification read in `try/catch` — an `error` prop was added to `NotificationBell`**
- **Found during:** Task 3, mounting into the layouts
- **Issue:** The plan specifies an error state (`We couldn't load your notifications. Try again.`) but no path that reaches it. As written — two bare `await`s at the top of each layout — a notification-query failure throws inside the layout, and a layout that throws takes down *every page in its route group*. `(host)/host/layout.tsx` is the real T-04-02 capability gate and `(app)/layout.tsx` is the session gate, so a transient failure in an ambient convenience would have become a full availability incident on the two authenticated shells. The specified error state would have been dead code.
- **Fix:** Both reads (`countUnread`, `listRecent`, `readDbNow`, in one `Promise.all`) are wrapped; on failure the layout logs `[notifications] bell_read_failed` and renders `<NotificationBell error />` with a zero badge. `NotificationBell` gained an `error?: boolean` prop, defaulting false. The shell, the session gate and every page render normally.
- **Files modified:** `src/app/(app)/layout.tsx`, `src/app/(host)/host/layout.tsx`, `src/components/notifications/notification-bell.tsx`
- **Commits:** `6474ce9`, `bbc8fb2`

**2. [Rule 2 - Security] Added `tests/notifications/notification-render.test.tsx` — OUT of `files_modified`**
- **Found during:** Task 2
- **Issue:** The plan's only XSS control is `grep -rc "dangerouslySetInnerHTML" src/components/notifications/` returns 0. That grep does not test the actual hazard. React escapes *text*; it does **not** sanitise a *URL*, and `escapeHtml` does not touch a scheme — so `javascript:alert(1)` survives every escaping layer in the codebase perfectly intact and lands in `<a href>` without complaint. 07-07 flagged exactly this and explicitly named this plan's renderer as the surface it was pre-emptively defending. A grep for an absent API cannot prove a present one is safe.
- **Fix:** 13 cases asserting against the **rendered DOM**, not against `safeHref`'s return value — because "the helper returns null" and "no hostile href reaches the DOM" are only the same statement if the component calls the helper on the anchor-building path, and that wiring is what a refactor breaks. Mutation-verified (6 of 13 fail when the guard is bypassed).
- **Infrastructure note:** this is the repo's **first jsdom component test**, but not new infrastructure — `vitest.config.ts` documents the `// @vitest-environment jsdom` pragma explicitly, and `@testing-library/react`, `jsdom` and `@vitejs/plugin-react` were all already installed for it. `next/link` is stubbed to a plain `<a>`; it requires an App-Router context absent in jsdom, and for this question the stub is faithful — Link's entire contribution here *is* emitting `<a href>`.
- **Files created:** `tests/notifications/notification-render.test.tsx`
- **Commit:** `bbc8fb2`

**3. [Rule 2 - Robustness] `safeHref` refuses protocol-relative URLs explicitly**
- **Found during:** Task 2
- **Issue:** The obvious implementation of "allow root-relative paths" is `href.startsWith("/")`. `//evil.example/steal` passes that check and is read by every browser as an absolute cross-origin URL. It is the one bypass that looks like the allowed form.
- **Fix:** The `//` case is checked *before* the root-relative case, and is a named hostile input in the render test.
- **Files modified:** `src/components/notifications/notification-item.tsx`
- **Commit:** `6474ce9`

**4. [Rule 2 - Correctness] The owner-scope test asserts a `Date`, not just an ordering**
- **Found during:** Task 3, writing case 5
- **Issue:** Case 5 asks for "newest first". A `createdAt` that came back as Postgres TEXT (the repo's documented `db.execute` hazard) would sort lexicographically on ISO-8601 and pass a naive ordering assertion **silently** — while handing the renderer a string that `formatTimeAgo` would turn into `NaN`.
- **Fix:** The test additionally asserts `rows[0].createdAt instanceof Date`, pinning 07-07's hydration boundary rather than trusting a sort that would lie.
- **Files modified:** `tests/security/notification-owner-scope.test.ts`
- **Commit:** `bbc8fb2`

### Deliberate Divergences from the Plan Text

**5. `toNotificationItems` lives in `notification-item.tsx`, not duplicated in both layouts.** The plan has each layout build its own item array. Since the mapping (unread derivation + relative-label composition) is identical and is exactly the thing that must not drift between the two headers, it is one exported function. Both layouts still perform their own owner-scoped reads, as specified — only the pure mapping is shared. This is the same "the bell is the shared thing" logic applied one level down.

**6. Three tests beyond the plan's five in the owner-scope file** (8 total): a stranger with no notifications sees nothing; the idempotency/positive-control case; and an unauthenticated caller can mark nothing read. The last is the one that matters — the plan's five cases all run *with* a session, so none of them would notice if `requireUserId`'s null guard were removed.

### Plan-Text Inaccuracies (no code impact)

- **Task 2 criterion** `grep -c "bg-brand" notification-bell.tsx` **returns 0**, not ≥1. The unread dot is in **`notification-item.tsx`** (where it returns 1), which is where the plan's own Task 2(a) specifies it — *"Unread rows carry TWO signals … a 6px `--brand` dot at the leading edge"* is written into the item-renderer paragraph. The criterion targets the wrong file. The substantive intent holds and is stronger than the grep: the dot is `bg-brand`, the badge is `variant="secondary"`, and `grep -c "bg-brand" notification-bell.tsx` returning **0** is a *better* proof that the badge is not brand-coloured than a ≥1 would have been.
- **Two greps initially matched their own explanatory comments** — `recipient_id = ${userId}` returned 3 (one in the SECURITY CONTRACT header) and `dangerouslySetInnerHTML` / `aria-live` returned 1 each (both in prohibition comments). Same class of issue 07-07 hit. Comments were reworded so every criterion now reads literally true without weakening the documentation.

## Verification Performed

| Check | Result |
|---|---|
| `npx tsc --noEmit` | exit 0 |
| `npx eslint` (all 7 touched files) | clean |
| `npm run build` | exit 0 — with the three documented env placeholders, see below |
| `npx vitest run tests/security/notification-owner-scope.test.ts` | **8 passed** |
| `npx vitest run tests/notifications/notification-render.test.tsx` | **13 passed** |
| `npx vitest run tests/security tests/notifications` | **7 files / 57 tests passed**, exit 0 |
| **`npm test` (full suite)** | **72 files / 581 tests, all passing** (was 70/560 — this plan adds 2 files / 21 tests) |
| Owner-scope mutation matrix (5 mutations) | every one caught; see the table above |
| `grep -c "recipient_id = ${userId}" src/app/actions/notifications.ts` | 2 |
| `grep -c "read_at IS NULL"` / `requireUserId` / `rateLimit(` / `SECURITY CONTRACT` | 2 / 4 / 1 / 1 |
| `grep -c "Popover"` / `"DropdownMenu"` in the bell | 7 / **0** |
| `grep -c "document.hidden"` / `"aria-live"` / `"View all"` in the bell | 1 / **0** / **0** |
| `grep -c "Showing your 20 most recent."` | 1 |
| `grep -rc "dangerouslySetInnerHTML" src/components/notifications/` | **0** (both files) |
| `grep -c "default:" notification-item.tsx` | **0** |
| `grep -rc "@tanstack/react-query" src/` | **0** (D-84 holds — not installed, not added) |
| `NotificationBell` / `countUnread` / `D-92` in both layouts | 2 / 2 / 3 in each |
| `pendingRequests` in the host layout | 4 — the D-65 badge is intact and untouched |

### On the build gate

`npm run build` fails on the same three **pre-existing** fail-closed env guards logged in `deferred-items.md` by 07-06 and reconfirmed by 07-07: `PLATFORM_WALLET_NUMBER` / `PLATFORM_WALLET_NAME` (`src/lib/paymongo.ts`, 05-02) and `INNGEST_SIGNING_KEY` (`api/inngest/route.ts`). Nothing in this plan touches them. With the three placeholders supplied the build completes clean and lists all 24 routes. **Third observation** — reconfirmed in `deferred-items.md` rather than fixed, since relaxing a fail-closed money guard is not a drive-by change. Noted there that this plan's build gate is more load-bearing than most, because a broken route-group layout breaks every page under it.

## Known Stubs

None. Every export is implemented and exercised.

**Scope note, stated plainly:** the bell renders real rows the moment they exist. 07-10 wired all five lifecycle sends to `fitout/notify`, so rows are being written today and the panel shows them. Two coverage boundaries remain, both by design and neither a stub:

1. **Reminder notifications** (`reminder_pre_expiry`, `reminder_pre_session`, `reminder_pre_sla`) have renderer copy and icons here but nothing emits them yet — Plan 13 owns that. The renderer is ready; the emitters are not written.
2. **Header coverage gap (the researcher's flagged residual).** `/` and `/listings/[id]` sit at the **root** and render no header at all, so a booker on those two routes sees no bell. Plan 06 moved `/bookings/[id]` into `(app)`, which closed the most consequential part of the gap named in UI-SPEC Open Question 1. Mounting a header on the remaining public routes is **out of scope for this phase** and partially undercuts D-92's "never invisible" intent — worth an explicit decision in a later phase rather than a silent acceptance.

## Threat Flags

None. No new endpoint, no migration, no new trust boundary — the two server actions are the only new surface and both are in the plan's register (T-07-82/83). Three mitigations landed **stronger** than specified:

- **T-07-84** gained the render-side href allow-list and a 13-case DOM-level test, where the plan asked only for a grep.
- **T-07-83** gained an unauthenticated-caller case and the timestamp-not-rewritten idempotency assertion.
- **T-07-85** — the poller PAUSES on hidden rather than skipping, so a backgrounded tab contributes exactly zero refreshes *and* keeps its budget.

One threat register entry is worth restating as still **accepted**, not closed: **T-07-87** (unread count via a shared cache) holds because both layouts read per-request from the authenticated session and there is no cache layer in this path. If a layout-level cache is ever introduced, this becomes a real leak and must be revisited.

## Commits

| Hash | Message |
|---|---|
| `845fc24` | feat(07-14): owner-scoped notification mark-read actions |
| `6474ce9` | feat(07-14): NotificationBell popover + exhaustive item renderer |
| `bbc8fb2` | feat(07-14): mount the bell in both headers + prove owner scoping |

## For Downstream Plans

- **Plan 13 (reminders):** the three reminder kinds already have icons, titles and bodies in `describeNotification`. Emit the payload the 07-07 Zod boundary requires and they render with no change here. `reminder_pre_sla`'s body reads `{bookerLabel} · {listingTitle} · respond by {respondByLabel}` — pass the **pre-composed venue-local deadline**, per 07-07's D-96 note.
- **Adding a notification type is now a FOUR-file change:** the `notificationType` pgEnum + `NotificationPayload` union (`schema.ts`), the Zod union (`validation/notification.ts`), the `sendForType` switch (`inngest/functions/notify.ts`), and now `describeNotification` (`notification-item.tsx`). Each omission is a **compile error**, not a silent gap. Do not add a `default:` clause to any of them to make it easier — that trades a build failure for a blank row in someone's panel.
- **Anyone emitting a notification:** `href` must be root-relative or `http(s)`. It is now enforced at **both** ends. A payload that slips a bad scheme past the writer renders as an inert, non-clickable row — visible in the panel, but not navigable.
- **Anyone touching either layout:** the two headers are still deliberately duplicated (D-04). The comment recorded in both files says so and says why. The **bell** is the shared thing, not the header — do not "fix" this by extracting a shared header.
- **Anyone adding another poller:** the hidden-pause pattern here is the one to copy, not `pending-payment-state.tsx`'s (which does not pause because a user waiting on a payment is, by definition, looking at the tab).
- **Future `/notifications` history page (deferred at D-92):** the panel's footer states the 20-item cap rather than linking anywhere. If that page is ever built, `listRecent`'s `NOTIFICATIONS_MAX_LIMIT` hard cap is the thing to relax — deliberately, and with paging, not by raising the constant.

## Self-Check: PASSED

All five created files verified present on disk; both modified layouts verified to contain `NotificationBell`; all three commit hashes verified in `git log`.
