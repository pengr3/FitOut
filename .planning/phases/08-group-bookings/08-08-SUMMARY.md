---
phase: 08-group-bookings
plan: 08
subsystem: ui
tags: [group-bookings, rsvp, public-route, guest-identity, token-credential, rsc, react-hook-form, zod, accessibility]

# Dependency graph
requires:
  - phase: 08-group-bookings (08-06)
    provides: submitRsvp (the public session-less write) + getGroupByToken's single frozen GROUP_INACTIVE state + rsvpSchema
  - phase: 08-group-bookings (08-02)
    provides: claimSeat — the D-112 FOR UPDATE seat-claim this page reports on but never re-implements
  - phase: 04-booking-flow
    provides: listings/[id]/page.tsx (the root, header-less, session-optional public-route shape) + composeWhenLabel / venueTzNote
provides:
  - "src/app/invite/[token]/page.tsx: the public token-credentialed RSVP RSC, at the ROOT, session-read-not-required"
  - "ONE inactive branch: malformed = unknown = regenerated = voided = cancelled render the same two sentences with the same 200"
  - "src/components/group/rsvp-form.tsx: the D-116 guest-or-login fork with the D-117 optional-email-as-benefit and no head-count control"
  - "src/components/group/rsvp-confirmation.tsx: the calm post-RSVP state incl. the G3 blank-email-guest disclosure"
  - "getMyRsvpStatus: a self-scoped read powering the D-120 change-answer state for a returning account"
affects: [08-09 (UAT — the cross-session RSVP walkthrough this plan's states were built for)]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "A public page whose URL carries a bearer credential declares `robots: noindex` + `referrer: no-referrer` in its own metadata — the two leak paths a URL-borne token has that a header-borne one does not"
    - "A calm denial renders from ONE branch over ONE pair of constants, so no later edit can make two failure classes differ"
    - "A client form renders the server's error string VERBATIM when the server owns the invariant — no client-side second opinion on a value only a row lock can know"
    - "The answer a multi-choice form submits is carried by the control that submitted it (handleSubmit closure), not by a ref read during render"

key-files:
  created:
    - src/app/invite/[token]/page.tsx
    - src/components/group/rsvp-form.tsx
    - src/components/group/rsvp-confirmation.tsx
  modified:
    - src/lib/group/rsvp.ts

key-decisions:
  - "Commit order was reversed relative to the plan's task order (components, then the page) so that EVERY commit type-checks and builds in isolation — the page imports the components, so committing it first would have left a broken tree at that revision"
  - "Added getMyRsvpStatus to 08-06's read layer: the plan's Task 2 requires a returning attendee to see their current answer, and no read existed — without it the change-answer state would only have worked within a single page session, which is a stub"
  - "There is deliberately NO guest equivalent of getMyRsvpStatus: recognising a returning guest on a plain GET would mean looking an RSVP up by an address they have not typed, which is an oracle over who was invited"
  - "The 'we've emailed you a copy' sentence is gated on answer === 'yes', not on `reachable` — submitRsvp only emits the attendee confirmation for a yes, so claiming a send on a decline would be a false statement"
  - "The FitOut wordmark on the invite card is NOT coral: 08-UI-SPEC §Color assigns the page's one coral to `Yes, I'm coming`, and a coral wordmark would put two of them on a surface whose whole job is a single decision"
  - "The page mounts no Toaster and raises no toast: every failure is an inline neutral alert, because the root layout has no Toaster and a public page must not depend on chrome it does not own"

patterns-established:
  - "Grep tripwire extended to a third absence: the D-120 head-count control's own names are unspelled in rsvp-form.tsx, comments included, alongside the alarm-colour token and the browser logger"
  - "The malformed-token case is FOLDED onto the same value the unknown case resolves to (GROUP_INACTIVE) rather than handled, so a shape check can never become a probe"
  - "Route-param-derived credentials are re-emitted from the RESOLVED row (group.accessToken), never from the raw param"

requirements-completed: [GROUP-02, GROUP-03]

# Metrics
duration: 26min
completed: 2026-07-28
---

# Phase 8 Plan 08: Public Invite & RSVP Page Summary

**A stranger with a link and no FitOut account can now open `/invite/[token]`, see the session in venue-local time at an address the host actually agreed to share, and answer yes or no with a name and an email they are free to leave blank — while every dead, full, closed and unknown link resolves to the same calm sentence, and the server's seat-claim stays the only thing that decides what "full" means.**

## Performance

- **Duration:** ~26 min
- **Started:** 2026-07-28T01:37:00Z
- **Completed:** 2026-07-28T02:03:00Z
- **Tasks:** 2
- **Files:** 4 (3 created, 1 modified)

## Accomplishments

- **The route is at the ROOT and the build proves it.** `next build` lists `ƒ /invite/[token]` as a sibling of `/listings/[id]`, not under `/bookings/...` — there is no `(app)`/`(host)` segment in its path, so `(app)/layout.tsx`'s `redirect("/login")` cannot reach it. The page calls `auth.api.getSession` and then never branches on its absence: a null session is the *expected* case, and there is no `redirect` and no `notFound` anywhere in the file (T-08-24 / Pitfall 5 / GROUP-03).
- **The token oracle was closed and then measured.** `getGroupByToken` already collapses unknown / regenerated / voided / cancelled onto one frozen value (08-06); this page folds the *malformed* case onto that same value, so there is exactly ONE inactive branch and one pair of sentences. Fetched live against the dev server, a well-formed-unknown token, a malformed token, a second unknown token and a genuinely voided group returned **HTTP 200 with byte-identical rendered content** — the only differences in the payload were Next's per-request `__next_r` nonce and its internal RSC chunk numbering, which vary between two requests for the *same* token.
- **The bearer credential is fenced in on the two paths a URL-borne token leaks by.** `robots: { index: false }` (an indexed invite link is a public one) and `referrer: "no-referrer"` (so the token cannot ride out in a `Referer` header). Neither file contains a logging call of any kind. The one place the token is re-emitted is the `callbackURL` on `Log in instead` — which is mandated by D-116, is same-origin, is composed from the *resolved* `group.accessToken` rather than the raw route param, and is independently refused by the login page unless it is a relative path.
- **The guest path genuinely works with no account and no address (D-116/D-117/G1/G2).** Logged out, the form asks for a name and offers an email whose *label* says `(optional)` and whose helper says what the person gets by filling it in. `Log in instead` is a ghost link below the fields — the alternative, not the expectation. Nothing on the page says "sign up", nothing re-asks, and a blank email submits a complete RSVP that counts toward the headcount like any other.
- **The UI's "full" is a courtesy and behaves like one.** The page computes `confirmedYes >= capacity_snapshot` server-side and disables Yes with a neutral `role="status"` alert while `Can't make it` stays live. A submit that loses the race renders **`submitRsvp`'s own sentence, verbatim** — the client never composes a "full" message and never re-checks the cap, because a second opinion that disagreed with the row lock could only ever be the wrong one (D-112 / GROUP-05).
- **`closed` is Postgres's answer, not the browser's.** `rsvpClosed` arrives already computed from `now() >= b.starts_at` inside `getGroupByToken`'s query; `grep -c "new Date(" page.tsx` returns **0** (D-120).
- **The withheld address stays withheld.** Rendered strictly per `listing.showExactAddress`, with an area-plus-who-to-ask fallback — verified live against the seeded `show_exact_address = false` listing, which rendered `Approximate area — Makati. The organizer has the exact address.` and `Times shown in Makati time (GMT+8)` (D-09 / D-122 / G7).
- **The roster does not leak to the link holder.** With a real attendee row present, the attendee's name appears **nowhere** in the invite page's HTML (Open Q4 — the roster is organizer-only).
- **Full suite green:** `npx vitest run` → **92 files / 792 tests, exit 0**. `npx tsc --noEmit` clean. `npx eslint src tests` → **0 errors** (7 pre-existing warnings, all in files this plan did not touch). `npm run build` → **exit 0**, no env workaround.

## Task Commits

1. **Task 2 — `RsvpForm` (guest-or-login fork) + `RsvpConfirmation`, wired to `submitRsvp`** — `550412e` (feat)
2. **Task 1 — the public `/invite/[token]` RSC + the `getMyRsvpStatus` read** — `f892335` (feat)

*(Committed in that order deliberately — see Deviations.)*

## Files Created/Modified

- `src/app/invite/[token]/page.tsx` (235 lines) — the public RSC. Awaits `params`, shape-checks the token, resolves the group, reads (never requires) the session, computes `open | full | closed` server-side, and renders the wordmark → event summary → `RsvpForm` inside `mx-auto w-full max-w-lg px-4 py-8 sm:py-12`.
- `src/components/group/rsvp-form.tsx` (350 lines) — the identity block and the RSVP choice. Client-side RHF + `zodResolver` over `rsvpSchema.omit({ answer: true })`, so the inline message a guest sees cannot drift from the rule the action enforces.
- `src/components/group/rsvp-confirmation.tsx` (77 lines) — the calm post-RSVP state and the G3 disclosure. No directive: pure presentation, rendered from inside the client form.
- `src/lib/group/rsvp.ts` — **+1 export**, `getMyRsvpStatus`. Nothing existing was touched; 08-06's eight mutation-verified predicates are unchanged.

## Live State Verification

The plan defers the cross-session RSVP walkthrough to the 08-09 checkpoint, but every *rendered state* was driven against a running dev server and a real row, then the scratch data was removed and the seed restored (`booking_group` and `rsvp` are back to 0 rows; `cccc3333-…`'s window is back to `2026-07-25 08:00–09:00+00`).

| State | How it was forced | What rendered |
|---|---|---|
| **unknown** (well-formed) | `/invite/0123456789ABCDEFGHJK` | 200 · `This invite is no longer active` / `Ask the organizer for the latest link.` |
| **malformed** | `/invite/not-a-real-token` | 200 · identical content to the above |
| **unknown #2** | `/invite/ZZZZZZZZZZZZZZZZZZZZ` | 200 · identical content to the above |
| **voided** | `voided_at = now()` on a real group | 200 · identical content to the above |
| **closed** | real group on a booking that already started | `RSVPs have closed` / `This session has already started.`, **no choice buttons** |
| **open (guest)** | booking moved forward, group live | title + `Saturday, …, 4:00 PM – 5:00 PM (Makati time)` + approximate address + name field + `Email (optional)` + the benefit helper + `Log in instead` carrying `callbackURL=%2Finvite%2F…` |
| **full** | `capacity_snapshot = 1` + one `yes` row | `This group is full` in a `role="status"` alert; Yes rendered `disabled=""` `aria-disabled="true"` with `bg-brand`; `Can't make it` `aria-disabled="false"`, neutral outline |

The one token echo in the HTML is Next's own router state (`"c":["","invite","<token>"]`), present identically for every token class and already in `location.pathname` — framework behaviour, not an emission of this code, and not a distinguisher.

## Acceptance Criteria — Measured

| Criterion | Command | Result |
|---|---|---|
| Route at the root, no `(app)`/`(host)` segment | `ls "src/app/invite/[token]/page.tsx"` · path grep | file exists · **0** |
| Session read, never required | `grep -n "getSession\|redirect(\|notFound(" page.tsx` | one `getSession`; **no** `redirect(`/`notFound(` call |
| Unknown ≡ voided | one `if (!group.active)` branch | **1** occurrence of `group.active` |
| States computed server-side | `grep -Ec "rsvpClosed\|capacitySnapshot"` · `grep -c "new Date("` | **3** · **0** |
| `submitRsvp` wired | `grep -c "submitRsvp" rsvp-form.tsx` | **5** |
| No head-count control | `grep -Eci 'stepper\|quantity\|\+1\|party.?size\|\+guests\|declaredPax' rsvp-form.tsx` | **0** |
| G3 line present | `grep -c "only confirmation" rsvp-confirmation.tsx` | **1** |
| No alarm colour | `grep -ci "destructive"` over both components **and** the page | **0 / 0 / 0** |
| No logging | `grep -c "console"` over all three files | **0 / 0 / 0** |
| `role="status"` on the calm states | `grep -c 'role="status"'` | **4** (form) · **1** (confirmation) · page's inactive branch |
| Types / lint / build | `tsc --noEmit` · `eslint … --max-warnings=0` on changed paths · `npm run build` | clean · clean · **exit 0** |
| Tests | `npx vitest run tests/group/` · `npx vitest run` | 6 files / 60 tests · **92 files / 792 tests**, exit 0 |

## Deviations from Plan

### Deliberate Interpretation

**1. Commit order reversed (Task 2's components before Task 1's page).**

- **Why:** the page imports `RsvpForm`. Committing Task 1 first would have produced a revision whose `tsc --noEmit` — Task 1's own `<verify>` — could not pass, and left a non-building commit in `dev`'s history for anyone bisecting. Building the components first means **both** commits type-check, lint and build in isolation.
- **Effect on content:** none. Every file, every criterion and both tasks' `<done>` conditions are unchanged.

### Auto-added Functionality

**2. [Rule 2 — Missing critical functionality] `getMyRsvpStatus` added to `src/lib/group/rsvp.ts`**

- **Found during:** Task 2, implementing the D-120 change-answer state.
- **Issue:** Task 2's `<action>` and 08-UI-SPEC §Screen/State Contract both require "returning + change-answer" — a returning attendee seeing the answer already on record. 08-06 exposes no read for it (`getGroupByToken` returns the group, never the viewer's own row). Without one, "Change my answer" would only have worked in the same page session as the submit, and a returning account would have been offered `Yes, I'm coming` again as though their earlier answer never landed.
- **Fix:** a 10-line self-scoped read — `WHERE r.group_id = $groupId AND r.user_id = $userId` — keyed on the group id the page has *already* resolved from the token the caller presented. It can only ever return the caller's own row and cannot be used to probe anything they have not already proven possession of. Deliberately no guest equivalent (see Key Decisions).
- **Files:** `src/lib/group/rsvp.ts`
- **Commit:** `f892335`

**3. [Rule 2 — Missing critical functionality] `noindex` + `no-referrer` metadata on the invite route**

- **Found during:** Task 1.
- **Issue:** the plan and the UI spec both establish that the token is a bearer credential that must never leak, but neither names the two leak paths specific to a credential that lives in a *URL*: a crawler indexing the page makes the link public, and any navigation away sends the whole URL in a `Referer` header.
- **Fix:** `robots: { index: false, follow: false }` and `referrer: "no-referrer"` in the route's `metadata`. Two lines, and both unfixable after the fact.
- **Files:** `src/app/invite/[token]/page.tsx`
- **Commit:** `f892335`

### Auto-fixed Issues

**4. [Rule 1 — Bug] The submitted answer was carried by a ref read during render**

- **Found during:** Task 2, first `eslint --max-warnings=0` run.
- **Issue:** the first draft stamped which button was pressed into a `useRef` and read `answerRef.current` in the button labels to show "Saving…". `react-hooks/refs` flagged it as an error, and correctly: a ref read during render is exactly what makes a button label lag a click by one paint.
- **Fix:** the in-flight answer is now `useState<"yes" | "no" | null>`, and each button submits through its own `form.handleSubmit((v) => onSubmit(v, "yes" | "no"))` closure, so the answer travels with the control that submitted it and no ref exists. The `<form onSubmit>` still binds the primary choice, so Enter in the identity fields means what the page's one coral CTA promises.
- **Files:** `src/components/group/rsvp-form.tsx`
- **Commit:** `550412e`

**5. [Rule 1 — Bug] Comments would have tripped the plan's own grep criteria**

- **Found during:** Task 2, running the acceptance greps.
- **Issue:** the header comments explained the two absences by *naming* them — "no quantity control, no +1, no party-size stepper" and "puts `--destructive` nowhere". Both made `grep -c` return non-zero on files whose criterion is zero, disarming the exact checks the plan relies on.
- **Fix:** the 07-04 tripwire discipline from `share-link-box.tsx` / `top-up-nudge.tsx`, extended to a third absence: the head-count control's names, the alarm-colour token and the browser logger are now unspelled anywhere in these files, comments included, with a note saying so and saying why.
- **Files:** `src/components/group/rsvp-form.tsx`, `src/components/group/rsvp-confirmation.tsx`
- **Commit:** `550412e`

## Requirements Completed

- **GROUP-02** — the invite link resolves to a real, working page; a rotated or dead one dies quietly.
- **GROUP-03** — a person with no FitOut account can RSVP: name required, email optional, no login anywhere on the path.

## Known Stubs

None. Every state on this surface is wired to a real server read or a real action result, and each was rendered against live data (see Live State Verification).

Two absences are **decisions**, not stubs, and are documented in the code that omits them:

1. **A returning *guest* is not recognised on arrival** (D-116/D-117). They change their answer by answering again with the same address, which the `rsvp_group_email_uq` partial unique index resolves onto their existing row. Recognising them on a plain GET would require an address they have not typed.
2. **A blank-email guest gets no change-answer toggle** — the confirmation they just read told them plainly they would not get one (G3/D-117).

## Threat Flags

None. Every file this plan touched is inside the declared `<threat_model>` surface, and each `mitigate` disposition is implemented and evidenced above: T-08-23 (the oracle — four token classes measured identical), T-08-24 (root placement — confirmed in the build's route table), T-08-25 (the raced yes — the server's sentence is rendered verbatim, with no client cap check), T-08-26 (the withheld address — verified against a `show_exact_address = false` listing), T-08-27 (input validation — `rsvpSchema` re-parsed server-side; the client copy is UX only).

## Notes for the Next Plan (08-09 UAT)

1. **The organizer's `Copy link` toast will not appear.** The root layout mounts no `<Toaster />` and neither `(app)/layout.tsx` nor `/bookings/[id]/group` mounts one — only the three host pages do. So `ShareLinkBox`'s `Link copied` / `Couldn't copy` toasts and `CreateGroupButton`'s error toast are currently silent. **Pre-existing to this plan** (08-07 surface, out of scope here — logged to `deferred-items.md`), but it is the first thing a UAT walkthrough of the organizer flow will hit. The invite page deliberately raises no toast at all for this reason.
2. **The seed has no future-dated confirmed booking.** Every confirmed row starts before today (`2026-07-25` / `2026-07-20`), so a freshly created group lands straight in the `closed` state. Move a booking's `starts_at`/`ends_at` forward (or seed a new one) before walking the RSVP flow.
3. **`getMyRsvpStatus` is account-only.** The "returning attendee sees their answer" state is reachable by logging in and re-opening the invite; a guest-with-email must re-enter the same address to land on their existing row.
4. **The change-answer toggle is hidden once RSVPs close**, even for an account — there is no answer left to change after the session starts (D-120).

## Self-Check: PASSED

All 3 created files and the 1 modified file exist on disk; both task commits (`550412e`, `f892335`) are present in the repository history.
