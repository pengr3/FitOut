---
phase: 08-group-bookings
plan: 07
subsystem: group-bookings
tags: [group-bookings, organizer-ui, rsc, owner-gate, idor, clipboard, confirm-dialog, accessibility, d-114, d-118, d-119, d-121]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-06)
    provides: createGroup / removeAttendee / regenerateLink server actions + getOwnedGroupByBooking / getRoster / getHeadcount owner-scoped reads
  - phase: 08-group-bookings (08-05)
    provides: shares src/app/(app)/bookings/[id]/page.tsx (the confirmed-branch forward-action slot)
  - phase: 07-bookings-management
    provides: the booking-detail session-first owner gate, /bookings/[id]/cancel nested-RSC precedent, PendingPaymentState's D-84 bounded poller, CancelRequestDialog's confirm pattern, composeWhenLabel / venueTzNote
provides:
  - "The D-119 group entry on the confirmed booking detail: coral `Invite people` → neutral `Manage group · {N} coming`, with `Find another space` demoted to ghost"
  - "/bookings/[id]/group — the owner-gated organizer management RSC (GROUP-04): focal headcount, invite-link share box, organizer-only roster, bounded poller"
  - "Neutral D-121 management actions: RemoveAttendeeButton (per yes-row) + RegenerateLinkButton, both confirm-dialog gated, neither red"
  - "TopUpNudge — the D-114/A3 over-RSVP signal behind a visible double guard, record/nudge only"
  - "The D-121 group-consequence prose line on the cancel review"
affects: [08-08 (the public invite RSC is the attendee half of the same token), 08-09 (UAT walks this surface end to end)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A bearer credential returned by a server action is deliberately NOT read on the client — the refreshed owner-scoped RSC re-reads it, so the token's only client-side existence stays inside one read-only input"
    - "A conditional block's whole guard lives in the component and returns null, so 'absent' is structurally absent rather than an empty shell the caller must remember not to render"
    - "A confirm-dialog control is omitted where its locked copy would be a false statement, rather than reworded per-case"

key-files:
  created:
    - src/app/(app)/bookings/[id]/group/page.tsx
    - src/components/group/create-group-button.tsx
    - src/components/group/headcount-meter.tsx
    - src/components/group/share-link-box.tsx
    - src/components/group/attendee-roster.tsx
    - src/components/group/group-refresh.tsx
    - src/components/group/remove-attendee-button.tsx
    - src/components/group/regenerate-link-button.tsx
    - src/components/group/top-up-nudge.tsx
  modified:
    - src/app/(app)/bookings/[id]/page.tsx
    - src/app/(app)/bookings/[id]/cancel/page.tsx

key-decisions:
  - "The Remove control renders on `yes` rows ONLY. The locked confirm copy promises 'this frees up their spot', which is true of a seat-holder and a plain falsehood over a row in the collapsed 'Can't make it' list — tidying declines is not worth a dialog that misstates what it does. The UI-SPEC's only stated restriction (never the organizer's own row) is unaffected and is structural: row #1 is a display fixture with no rsvpId."
  - "RegenerateLinkButton deliberately does not read the `accessToken` that `regenerateLink` returns. Composing a toast or a URL from it would write a live bearer credential into a transient, screenshot-able surface; router.refresh() re-renders the share box from the owner-scoped server read instead."
  - "The top-up nudge renders no money figure at all. §Typography anticipates a tabular-nums amount, but the §2 locked copy has none and the amount owed is the host's to settle until the D-114 rail lands — quoting a client-side figure over money is exactly what G8 forbids."
  - "The top-up nudge guard is two separate early returns rather than one composed boolean: it narrows `declaredPax` for TypeScript without a non-null assertion and it makes the double guard greppable as two lines."
  - "The nudge says 'the extra {K} person/people' rather than the spec's bare 'the extra {K}' — at K=1 the literal reads 'the extra 1 at check-in'. The numeral and the sentence shape are preserved."

patterns-established:
  - "GREP TRIPWIRE, now three files deep in this phase: the forbidden identifier is never spelled anywhere in the file that forbids it, comments included, so the grep assertion cannot be tripped by its own rationale"
  - "The management RSC's manage-actions block sits below the roster behind a Separator — maintenance is never the point of the visit"

requirements-completed: [GROUP-01, GROUP-02, GROUP-04]

# Metrics
duration: 16min
completed: 2026-07-28
---

# Phase 8 Plan 07: Organizer Group Surface Summary

**The organizer side ships end to end: one coral `Invite people` on a confirmed booking opens an owner-gated management page whose focal figure is `{confirmed} of {capacity}`, with the invite link, the organizer-only roster, neutral Remove/Regenerate confirm dialogs and the fee-gated top-up nudge — and not one alarm colour anywhere in it.**

## Performance

- **Duration:** ~16 min of execution across two sessions (Tasks 1–2 on 2026-07-27, Task 3 resumed 2026-07-28)
- **Tasks:** 3
- **Files:** 11 (9 created, 2 modified)

## Accomplishments

- **One coral, and it is the differentiator's.** The confirmed branch gains `Invite people` (D-119, accent #1) and the shipped coral `Find another space` demotes to a ghost link, so one-primary-per-surface holds (Open Q3). Once a group exists the entry becomes a neutral `Manage group · {N} coming` — management is a calm return trip, not a headline action. The entry is gated on `confirmed` + session-ahead + exclusive occupancy, and `canCancel` was renamed `sessionAhead` so the cancel entry and the group entry are one predicate named once instead of two that can drift.
- **The owner gate is repeated, not inherited.** `/bookings/[id]/group` re-checks `booking.bookerId === session.user.id` itself — the `(app)` route group only proves somebody is signed in. A missing booking and a stranger's booking return the same bare `notFound()`, byte for byte, so walking booking ids is not an enumeration oracle (T-08-19). Behind that, every read is *already* owner-scoped in its own WHERE, which is the property `tests/group/group-owner-scope.test.ts` proves by mutation — the gate is belt-and-braces, not the only layer.
- **The token is rendered and never logged (D-118).** `ShareLinkBox` holds the absolute invite URL in a `readOnly` (not `disabled`) input so the manual copy path survives a missing clipboard API; `writeToClipboard` checks for the API's presence explicitly rather than optional-calling it, because `await navigator.clipboard?.writeText(url)` resolves to `undefined` and would announce "Link copied" over an empty clipboard. There is no browser-log call in that file, in `regenerate-link-button.tsx`, or in the RSC — including on the failure paths where logging the value you failed to copy is the obvious instinct.
- **Nothing in this phase is red.** `Remove attendee` and `Regenerate link` are neutral `outline` + confirm dialog, and both files pass a grep for the alarm variant's own name that their rationale comments deliberately do not spell. Removing frees a seat and the person can RSVP again; regenerating is a *security* action that preserves the whole roster. The full caption ("This group is full.") is muted, and the load-failure state is calm.
- **The top-up nudge is the shape of a deferred decision, honestly.** It renders only when the listing prices extra heads AND more people said yes than the booking declared, and it carries no money-moving control of any kind — no button, no link, no amount. The automated in-app top-up is an explicit fast-follow (A3/D-114), and a control promising to settle the difference in-app would take an organizer's intent to square up and drop it on the floor.
- **Freshness costs nothing visible.** `GroupPoller` is the D-84 bounded `router.refresh()`, paused on `document.hidden`, with no spinner — the headcount and the roster move together because both come from the same RSC render.

## Task Commits

1. **Task 1 — group entry point on the confirmed booking + cancel-review consequence line** — `760aab6` (feat)
2. **Task 2 — owner-gated `/bookings/[id]/group`: headcount, share link, roster, poller** — `a9d76ae` (feat)
3. **Task 3 — neutral Remove/Regenerate confirm dialogs + the D-114 top-up nudge** — `59b5d9b` (feat)

## Files Created/Modified

- `src/app/(app)/bookings/[id]/page.tsx` — the D-119 entry on the confirmed branch; `canCancel` → `sessionAhead`; `Find another space` coral → ghost (confirmed branch only — the declined and cancelled branches keep theirs); `occupancyMode` added to the listing select for the D-109 guard.
- `src/app/(app)/bookings/[id]/cancel/page.tsx` — one muted D-121 consequence line above the breakdown when the booking is a group. Prose only; the money is untouched.
- `src/components/group/create-group-button.tsx` — the coral `Invite people`; calls `createGroup` and routes to the management page. Never reads or forwards the returned access token.
- `src/app/(app)/bookings/[id]/group/page.tsx` — the owner-gated management RSC. Redirects (not 404s) to the booking when there is no group or the D-121 auto-void retired it: this visitor demonstrably owns the booking, so a dead page for arriving one step early would be the wrong answer.
- `src/components/group/headcount-meter.tsx` — the one Display-scale figure on the page, `tabular-nums`, `role="img"` + a complete `aria-label` with the visible caption `aria-hidden` so a screen reader hears the fact once. Does no arithmetic: even `full` arrives decided.
- `src/components/group/share-link-box.tsx` — read-only invite URL + neutral `Copy link` + the manual-select fallback.
- `src/components/group/attendee-roster.tsx` — organizer as row #1 (D-113, a display fixture that is deliberately *not* counted), `yes` rows next, `no` rows in a collapsed native `<details>`, icon+text Guest/Account badges. Names render as escaped React text (G6/T-08-20).
- `src/components/group/group-refresh.tsx` — the bounded poller + the `Try again` button for the calm error state.
- `src/components/group/remove-attendee-button.tsx` — neutral outline + confirm dialog, `aria-label` carrying both the action and the person so the `sm`-hidden label never leaves the control ambiguous.
- `src/components/group/regenerate-link-button.tsx` — neutral outline + confirm dialog; the returned new token is never touched client-side.
- `src/components/group/top-up-nudge.tsx` — neutral `alert` behind the two-line double guard; returns `null` otherwise.

## Deviations from Plan

### Auto-fixed / judgement calls

**1. [Rule 2 - Copy honesty] Remove control restricted to `yes` rows**
- **Found during:** Task 3, wiring `RemoveAttendeeButton` into `AttendeeRoster`
- **Issue:** The UI-SPEC assigns a per-attendee Remove control to every non-organizer row, but the locked confirm copy is "This frees up their spot." A declined row holds no spot, so the dialog would have made a false claim about what it was about to do.
- **Fix:** `AttendeeRow` takes a `removable` prop; `coming` rows pass it, `declined` rows do not. The organizer row is unaffected — it has no `rsvpId` and never had the control.
- **Files modified:** `src/components/group/attendee-roster.tsx`
- **Commit:** `59b5d9b`

**2. [Rule 1 - Grammar] "the extra {K}" → "the extra {K} person/people"**
- **Found during:** Task 3, top-up nudge copy
- **Issue:** The spec's literal renders "You may owe a bit more for the extra 1 at check-in." when exactly one person is over.
- **Fix:** The numeral and sentence shape are preserved; a pluralised noun is appended.
- **Files modified:** `src/components/group/top-up-nudge.tsx`
- **Commit:** `59b5d9b`

**3. [Rule 3 - Narrowing] Double guard written as two early returns**
- **Found during:** Task 3
- **Issue:** A single composed boolean (`extraHeadFee != null && … && confirmedYes > declaredPax`) does not reliably narrow `declaredPax` from `number | null` for the subtraction that follows, which would have needed a non-null assertion.
- **Fix:** Two sequential `if (…) return null;` guards. Also makes the double guard greppable as two distinct lines.
- **Files modified:** `src/components/group/top-up-nudge.tsx`
- **Commit:** `59b5d9b`

No architectural deviations (Rule 4). No packages added. No checkpoints or authentication gates were reached.

## Verification

All run on 2026-07-28 against the working tree at `59b5d9b`, with Postgres (`fitout-db-1`) up.

| Check | Command | Result |
|---|---|---|
| Types | `npx tsc --noEmit` | **exit 0**, no output |
| Lint | `npx eslint src/components/group "src/app/(app)/bookings/[id]/group" --max-warnings=0` | **exit 0**, no output |
| Owner scope | `npx vitest run tests/group/group-owner-scope.test.ts` | **1 file / 18 tests passed**, exit 0 |
| Build | `npm run build` | **exit 0**, 28 routes incl. `ƒ /bookings/[id]/group` — no env workaround needed |

### Hard-constraint greps (actual counts)

| Assertion | Command | Count |
|---|---|---|
| No alarm variant in either dialog | `grep -ci "destructive" src/components/group/remove-attendee-button.tsx src/components/group/regenerate-link-button.tsx` | `remove-attendee-button.tsx:0` · `regenerate-link-button.tsx:0` |
| No money-moving CTA in the nudge | `grep -ci "pay now\|charge\|/checkout" src/components/group/top-up-nudge.tsx` | **0** |
| The double guard is visible | `grep -n "extraHeadFee == null \|\| extraHeadFee <= 0\|declaredPax == null \|\| confirmedYes <= declaredPax" src/components/group/top-up-nudge.tsx` | 2 lines (58, 60) |
| Token never logged | `grep -cn "console" regenerate-link-button.tsx top-up-nudge.tsx share-link-box.tsx` | **0 / 0 / 0** |

Both confirm dialogs compose the shipped shadcn `Dialog`, so focus is trapped while open and returns to the trigger on close — reused rather than re-implemented for exactly that reason.

## Known Stubs

None. Every surface in this plan is wired to a real owner-scoped server read or a real server action.

The `TopUpNudge`'s missing charge control is **not** a stub — it is the deferred A3/D-114 decision recorded in the UI-SPEC (Open Q10), and the v1 copy is honest about resolving the difference at check-in rather than implying an in-app rail that does not exist.

## Threat Flags

None. Every threat in the plan's register (`T-08-19` owner gate, `T-08-20` escaped names, `T-08-21` token never logged, `T-08-22` organizer-only roster) is mitigated as specified, and no new network endpoint, auth path, file access pattern or schema change was introduced — this plan is entirely read + existing-action surface.

## For the Next Plan

- 08-08 builds `/invite/[token]`, the attendee half of the same token. The roster **must not** appear there (Open Q4) — the read that would leak it is `getRoster`, which requires an `organizerId` and is therefore not reachable from the public path by construction.
- `revalidateGroupSurfaces` already revalidates `/bookings/[id]` and `/bookings/[id]/group`; an RSVP submitted on the invite page will refresh the organizer's headcount without any further wiring.

## Self-Check: PASSED

All 11 source files and the SUMMARY exist on disk; all three task commits (`760aab6`, `a9d76ae`, `59b5d9b`) are present in the log. `tsc`, `eslint`, `vitest tests/group/group-owner-scope.test.ts` and `npm run build` all exited 0, and every hard-constraint grep returned its required count.
