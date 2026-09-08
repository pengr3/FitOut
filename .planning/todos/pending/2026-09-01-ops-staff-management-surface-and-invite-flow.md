---
created: 2026-09-01T11:56:40.872Z
title: Ops staff management surface and invite flow
area: ops
resolves_phase: 20
files:
  - src/lib/ops/staff.ts
  - src/lib/ops/grant.ts
  - scripts/ops-grant.ts
  - src/app/(ops)/ops/layout.tsx
  - src/lib/auth.ts:112
  - package.json:27-29
---

## Problem

**Raised by the PM on 2026-09-01, brainstorming Phase 18's aftermath. Question as asked: "How can an
ops user or an APPROVER sign in and sign up? Can anybody as a registered user see /ops? How secure is
this?"**

### What ships today (measured, not recalled)

There is **no ops sign-up**, and that is D-217, not an oversight. An ops person signs up at `/signup`
as an ordinary user; someone with a shell and `DATABASE_URL` then runs
`npm run ops:grant -- <email> --by "Name"`. `npm run ops:revoke` and `npm run ops:staff` are the other
two verbs. There is **no HTTP path of any kind** that can write `user.role` — Better Auth's admin
plugin was evaluated and rejected because adding it publishes fifteen privileged endpoints in one
line, among them `set-role`, `impersonate-user`, `set-user-password` and `remove-user`
(`src/lib/ops/staff.ts` header).

**Can any registered user reach `/ops`? No.** The gate is `user.role === 'staff'`, enforced in three
independent layers — the layout (for the HTTP status line only), every page, and every server action.
A refused caller gets `notFound()`. 18-14 measured this under a production build of `8520721`:
`200 / 404 / 404 / 404`, with the three 404 bodies **byte-identical by sha256**, so a prober cannot
distinguish *not-staff* from *not-signed-in* from *no such route*. `role` is `input: false`
(`src/lib/auth.ts:112`), so no client body can set it. Revocation takes effect on the very next
request because `session.cookieCache` is deliberately unconfigured.

### The real gap: the account, not the authorization

The authorization boundary is strong. The **account** is not:

- Ops accounts are ordinary email+password accounts. No 2FA, no password policy, no IP allowlist.
- No step-up re-auth before a destructive ops action (ops-cancel of a paid booking, suspend-host).
- No staff-specific session TTL or idle timeout.
- A staff account is simultaneously an ordinary booker/host account.
- Bootstrapping requires production `DATABASE_URL` access — a second credential to protect.
- The grant CLI's `--by` is asserted, never authenticated (D-218, documented and accepted).

Blunt statement of the risk, recorded because the PM chose against mitigating it below: **a phished or
reused staff password today grants the full console, including ops-cancel of live paid bookings.**

## Decisions (PM, 2026-09-01 — ANSWERED, do not re-ask; record as D-numbers at discuss time)

### PM-A — Build the staff surface INSIDE /ops. Keep it simple. Keep it invisible.

The PM chose the **full staff admin screen** over roster-only and over the CLI-only status quo, with
the explicit qualifier: *"just make it simple. just a gateway for staffs, but ensure security we don't
want anyone peeping here."*

So: an `/ops/staff` screen that can **create, grant and revoke** staff — small and plain. Not a
permissions system, no tiers, no permission table. D-215 stands: there is exactly one staff role.

⚠ **This supersedes D-217** ("a role-grant HTTP path does not get to exist"). The supersede must be
written down as such at discuss time, with the compensating controls named, because D-217's reasoning
is still correct about what it feared — an arbitrary-target role-grant endpoint. The controls that
make the reversal survivable:

- The screen lives under `(ops)` and inherits the **whole three-layer guard**: layout assert, page
  `requireStaff()`, and `requireStaff()` in **every** staff-writing server action independently. The
  action guard is not optional and is not covered by the layout — per Next, server actions must be
  treated as public-facing endpoints.
- The 404-cloaking property is **non-negotiable and must be re-measured** once the route lands: a
  non-staff caller must get a byte-identical 404, and there must be **no `(ops)`-scoped
  `not-found.tsx`** (the same existence oracle wearing a different hat). Re-run 18-14's reading —
  `200 / 404 / 404 / 404` plus sha256 body equality — with `/ops/staff` added to the probe set.
- Every grant, revoke and invite writes an `audit` row with an **authenticated** `actorId` from
  `requireStaff()`. That is the genuine upgrade over the CLI's asserted `--by`.
- No PII in `audit.meta` (D-72): ids and enum-shaped values only, never the email typed in.
- The CLI (`ops:grant` / `ops:revoke` / `ops:staff`) **stays**. It is the bootstrap for the first
  staff member — who by definition cannot reach the console they are being let into — and the
  break-glass path if the console is broken. Retiring it is out of scope.
- Sub-decision to settle at discuss: **may a staff member revoke themselves, or the last remaining
  staff?** Locking every human out of the console is a real failure mode. Suggested: refuse both, as a
  `WHERE`-clause no-op rather than a branch (the `cancel-booking.ts` discipline).

### PM-B — Onboarding is "the same as regular FitOut sign-up, with email confirmation." No 2FA.

Asked which hardening to commit to, the PM answered: *"just a similar system login with email
confirmation just like in regular sign up here in fitout."*

Ruled: the staff-creation flow mirrors the signup + email-verification mechanics already shipped in
Phase 15. An ops user creates the account from `/ops/staff`; the invitee receives a confirmation
email, sets their own password, and signs in through the ordinary `/login`. Reuse `src/lib/email.ts`
and the existing verification flow — do not invent a second auth path.

**Explicitly declined, and recorded as accepted risk rather than deferred work:**

- 2FA/TOTP for staff (Better Auth ships a `twoFactor` plugin) — **declined**.
- Step-up re-auth before destructive ops actions — **declined**.
- Shorter staff session TTL / idle timeout — **declined**.
- An ops-only identity policy (staff may not book or host) — **declined**.

> **Superseded by D-14 and project decision D-275 (2026-09-08).** The declined-policy sentence
> above is retained as decision history, but it is no longer the active rule. Staff identities and
> marketplace capabilities are now mutually exclusive: invitations require a separate staff email,
> ordinary CLI grants refuse capability-bearing accounts, and only the explicit
> `--convert-marketplace-account` break-glass flag may atomically clear both capabilities and grant
> staff.

The SWE raised each of these before the ruling; the PM decided. This section exists so the decision is
legible later, not to relitigate it. If the risk is ever revisited, **2FA-for-staff is the single
highest-value item on that list.**

## Solution

Sketch, to be firmed at plan time:

1. `/ops/staff` route under `(ops)` — page plus `loading.tsx` (the build-blocking loading-coverage
   gate requires one beside any async page), with the layout's existing `assertStaff()` still above
   the Suspense boundary. The page calls `requireStaff()` in its own right.
2. Roster read: **reuse `listStaff()`** from `src/lib/ops/grant.ts`. It already exists, is positive
   equality on `role` (so the roster cannot disagree with the gate), and returns
   `{id, email, createdAt}` oldest-first.
3. Three server actions — invite/create, grant, revoke — each with its own `requireStaff()`, its own
   Zod parse, an `audit` row on **both** the ok and denied branches, and a rate limit
   (`src/lib/rate-limit.ts`, keyed on the authenticated staff id, per the `activate*` precedent).
4. The write goes through **Drizzle, never Better Auth's `updateUser`** — `role` is `input: false`, so
   `parseInputData` throws `FIELD_NOT_ALLOWED` and then the route rejects the emptied body.
   `src/lib/ops/grant.ts` already holds this policy in injectable, testable form: **give it a second
   caller, not a second copy.**
5. Invite email through the existing Phase-15 verification mechanics.
6. Re-measure the 404 cloaking with `/ops/staff` in the probe set, and extend
   `tests/design/ops-guard-coverage.test.ts` so the new page and every new action are inside its AST
   walk — that file exists precisely because `blocking-session-gate.test.ts` polices only two named
   files and is blind to a third.

## Related

- Blocked-by: nothing. Independent of the open KYC vendor decision.
- Siblings: `2026-09-01-host-verification-submission-path-and-listing-creation-gate.md`,
  `2026-09-01-reveal-host-contact-details-in-ops-queue.md`.

## 2026-09-08 local environment remediation

Phase 20's D-14 / project D-275 reversal has now been exercised through the shipped staff-management
surface in the local environment. A separate staff-only identity was invited, accepted, signed in to
`/ops`, and verified before the legacy combined test identity lost only its staff role. The legacy
identity retained host capability. `scripts/verify-ops-local-state.mjs --require-separated-host`
then reported at least one staff identity, zero capability-bearing staff identities, and the expected
separated legacy-host state without emitting addresses or authentication material. Nonlocal state was
not changed; any production conflict remains owned by the Phase 20 live-service checkpoint.
