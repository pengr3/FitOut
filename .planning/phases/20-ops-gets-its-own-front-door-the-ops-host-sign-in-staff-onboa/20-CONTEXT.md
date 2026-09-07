# Phase 20: Ops Gets Its Own Front Door — the `ops.` Host, Sign-In & Staff Onboarding - Context

**Gathered:** 2026-09-08
**Status:** Ready for planning

<domain>
## Phase Boundary

This phase gives FitOut staff a host-isolated front door: the configured `ops.` host, a dedicated
staff sign-in and recovery journey, one-time email invitation and account setup, and a small staff
management panel inside the existing `/ops` page. It also preserves the CLI bootstrap/break-glass
path and re-measures the byte-identical 404 cloak after every new ops route exists.

The phase keeps **one `user` table and one `staff` role**. Ops and marketplace sessions remain
host-scoped and deliberately do not carry across hosts. Staff accounts cannot also book or host.
The proxy routes by configured Host but never authorizes; the shipped three-layer ops guard remains
the security boundary.

**Out of scope:** tiered ops permissions, a `super_admin` role, a second staff page, a second identity
store, 2FA, step-up authentication, a staff-specific session lifetime, new runtime dependencies, or
schema migrations.

</domain>

<decisions>
## Implementation Decisions

### Ops sign-in and recovery

- **D-01:** The ops sign-in page offers **email and password only**. It has no Google control and no
  public staff-signup link; staff onboarding begins only from an invitation.
- **D-02:** The screen is **clearly FitOut Ops but structurally familiar**: reuse the established auth
  card, field, validation and button patterns, while giving it a distinct `FitOut Ops` identity.
  The copy is plain and explicit: `FitOut Ops` and `Sign in with your staff account.` It makes no
  security boast and carries no marketplace-oriented signup language.
- **D-03:** Password recovery is the sign-in card's **only secondary route**. The request page,
  email link, password-reset page and return to sign-in all remain on the ops host; the journey must
  not create a marketplace session.
- **D-04:** A successful sign-in returns to the originally requested route only when it is a safe
  ops-host path; otherwise it lands at `/ops`. A cross-origin or non-ops callback never survives.
- **D-05:** Correct credentials for an account without staff access leave the caller on the sign-in
  surface with a **neutral access refusal**. Do not name the account's booker/host classification,
  and clear the just-created ops-host session immediately.
- **D-06:** Explicit sign-out returns to the ops sign-in page and shows a brief confirmation that the
  staff session ended. No separate signed-out route is added.

### Invitation lifecycle and recipient journey

- **D-07:** A staff invitation is valid for **24 hours** and exactly one successful acceptance.
- **D-08:** Pending invitations expose **Resend** and **Cancel**. Resend rotates the credential and
  invalidates the previous link immediately; Cancel invalidates without replacement. At most one
  live invitation exists for an email.
- **D-09:** An active link opens **one focused setup form**. The invited email is fixed and cannot be
  changed; the recipient supplies their name and password. The form's POST performs acceptance, and
  success routes to ops sign-in. A GET never consumes the invitation.
- **D-10:** Expired, cancelled, already-used, malformed and unknown invitation links render the
  **same neutral inactive state** and the same recovery direction: ask the FitOut staff member who
  invited you for a new invitation. The public surface does not reveal which token ever existed.

### Existing-account conflicts

- **D-11:** If the invited email already belongs to a booker or host, refuse the invitation and ask
  for a **separate staff email**. Do not modify the marketplace account, its capabilities or its
  history from the invitation flow.
- **D-12:** If the email already belongs to active staff, refuse with `Already a staff member` and
  send no email.
- **D-13:** If the email already has an active pending invitation, refuse the duplicate and direct
  the operator to that row's Resend control. Do not rotate a credential as a side effect of pressing
  Invite and never create two live credentials for the same future account.
- **D-14:** `ops:grant` also refuses a capability-bearing account by default. Break-glass conversion
  is available only behind an **explicit conversion flag** that atomically removes both marketplace
  capabilities and grants the staff role. An ordinary grant command never strips access implicitly.

### Staff roster and revocation

- **D-15:** The staff management panel contains two visibly separate sections: **Active staff** and
  **Pending invitations**. It sits below the operational queue on the existing `/ops` page and is
  not a second route or a hidden disclosure.
- **D-16:** Active rows show email, staff-since date and a `You` marker for the current operator.
  Pending rows show email, sent date, **absolute expiry**, and inviter. Internal ids stay off screen.
- **D-17:** Active staff remain oldest-first, matching the shipped `listStaff()` order. Pending
  invitations are newest-first.
- **D-18:** Revoke and Cancel require confirmation. Resend runs immediately and states that the
  prior link was invalidated. Successful invite, resend, cancel and revoke outcomes appear as
  persistent in-page confirmation rather than a transient toast.
- **D-19:** Self-revoke and last-staff revoke render a visible disabled control with the applicable
  reason beside it. The server independently refuses direct or stale requests with the **same
  reason**; the disabled UI is explanation, never the enforcement boundary.
- **D-20:** The Pending invitations section remains visible when empty and renders a neutral sentence
  rather than disappearing or becoming a large promotional empty state.

### the agent's Discretion

- Exact component composition, responsive spacing and typography within the established auth and ops
  patterns.
- Exact neutral error and confirmation wording, provided it preserves the disclosure and recovery
  rules above and uses one declaration where body equality or shared refusal semantics depend on it.
- The internal representation of invitation state using the existing schema, including how the
  installed Better Auth verification machinery is adapted without a migration.
- Exact names for the explicit CLI conversion flag and staff-invitation audit actions.

### Folded Todos

- **Ops staff management surface and invite flow**
  (`.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md`) — folds into
  Phase 20 as the source problem: onboarding staff should no longer require routine production
  `DATABASE_URL` access. Its original `/ops/staff` and ordinary-signup sketches are superseded by
  the milestone's one-`/ops`-page invariant, the dedicated ops-host auth surface, and the decisions
  above. Its security controls, CLI retention, shared grant policy and authenticated audit actor are
  retained.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase scope and decisions of record

- `.planning/ROADMAP.md` § `Phase 20: Ops Gets Its Own Front Door` — phase goal, success criteria,
  mandatory proxy-first sequence, host routing, auth-origin configuration, invite invariants,
  OPS-11 reversal, 404 probes, streaming trap and cross-host link repairs.
- `.planning/ROADMAP.md` § `Milestone invariants — every v1.2 plan is bound by these` — zero runtime
  dependencies, zero migrations, one `/ops` page, config-driven fail-closed Host matching, and proxy
  routing never substituting for authorization.
- `.planning/REQUIREMENTS.md` § `OPS — Ops as its own surface, with its own identity` — OPS-07 through
  OPS-12, including host-only sessions, invite/onboard, revoke safety, account exclusivity and the
  final 404-cloak reading.
- `.planning/PROJECT.md` § `D-275` — the adopted one-table/one-role ops-subdomain decision,
  supersession of D-217, rejection of a second Better Auth instance, retained CLI and non-negotiable
  cloak re-measurement.

### Carried ops decisions and source problem

- `.planning/todos/pending/2026-09-01-ops-staff-management-surface-and-invite-flow.md` — original PM
  request, measured current security boundary, D-217 supersession rationale, audit and rate-limit
  expectations, and the routine production-credential problem this phase closes.
- `.planning/phases/18-host-verification-listing-review-fitout-ops/18-CONTEXT.md` — D-215's single
  staff role, D-216/D-219 guard and 404 policy, D-217's original CLI-only grant decision, and the
  ops-surface constraints Phase 20 amends without discarding their threat model.
- `.planning/phases/18-host-verification-listing-review-fitout-ops/18-14-SUMMARY.md` — production-build
  `200 / 404 / 404 / 404` cloak measurement and byte-hash evidence that OPS-12 must reproduce with
  the expanded route set.
- `.planning/phases/18.1-close-phase-18-verification-submission-didit-listing-gate/18.1-CONTEXT.md` —
  the prior review of the staff-management todo, retained one-role policy, authenticated ops-action
  conventions, and D-72 audit metadata boundary.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets

- `src/app/(auth)/login/page.tsx` — established `PanelCard`, form validation, generic credential
  error, button hierarchy and safe callback pattern. Reuse its structure, not its marketplace copy,
  Google button, signup link or `/` destination.
- `src/lib/auth.ts` — the single Better Auth instance and shared `user` table. Cookies are already
  host-only because cross-subdomain cookies are not enabled. Phase 20 changes dynamic `baseURL` and
  trusted origins while keeping global soft email verification, session duration and plugin order.
- `src/lib/ops/staff.ts` — request-cached `readStaff()`, `requireStaff()` and `assertStaff()` over the
  one positive `role === "staff"` predicate. The absence of session cookie caching is load-bearing
  because revocation must apply on the next request.
- `src/lib/ops/grant.ts` — shared `writeRole()` policy, injected database connection, audit write and
  oldest-first `listStaff()`. Add authenticated UI callers to the shared policy rather than copying
  the privileged write.
- The shipped Crockford group-invite credential shape and inactive-invite wording pattern — reuse
  the ~100-bit token approach and single inactive state rather than inventing a weaker credential or
  a token-existence oracle.

### Established Patterns

- `src/middleware.ts` is renamed to `src/proxy.ts` **first and in its own commit**, preserving the
  `_sc` loop guard and `/login` + `/signup` deferral byte-for-byte before Host logic is added.
- The proxy remains database-free, auth-free routing. Authorization stays three-layered:
  layout-level `assertStaff()` above streaming, page-level `requireStaff()`, and `requireStaff()` as
  the first statement of every ops server action.
- Privileged outcomes are enforced atomically in database predicates, then explained in the UI.
  Self/last revoke, single-use acceptance and credential rotation must remain correct under stale
  clients and concurrent requests.
- Audit metadata contains ids and enum-shaped values only, never email addresses, tokens or other
  PII. UI actions derive the authenticated `actorId` from `requireStaff()`.
- The global 404 is prerendered static. Do not add an `(ops)`-scoped `not-found.tsx` or make the root
  404 Host-dependent.
- Gates run alone. This phase adds no runtime dependency and no file under `drizzle/`.

### Integration Points

- `src/proxy.ts` after the mandatory rename — config-driven production/preview Host partition,
  public-host fail-closed behavior, and ops-auth/ops-console rewrites.
- `src/app/(ops)/ops/layout.tsx` and `src/app/(ops)/ops/page.tsx` — preserve the status-line guard and
  compose Staff management beneath the existing queue on the one `/ops` page.
- A sibling ops-auth route group — sign-in, recovery, reset and invitation setup must be reachable on
  the ops host without inheriting the `(ops)` layout that cloaks signed-out callers.
- `src/app/api/auth/[...all]/route.ts` plus `src/lib/auth.ts` — add the ops origin deliberately so
  auth POSTs do not leak an `INVALID_ORIGIN` distinction, while preserving one auth instance.
- `scripts/ops-grant.ts`, `scripts/ops-revoke.ts` and `scripts/ops-staff.ts` — retain bootstrap and
  break-glass operation; extend grant with an explicit atomic conversion path and no implicit
  capability downgrade.
- `tests/design/ops-guard-coverage.test.ts`, auth configuration tests and the production-build cloak
  probe set — cover every new page/action/host route, plus the forbidden cookie-cache and
  cross-subdomain-cookie settings.

</code_context>

<specifics>
## Specific Ideas

- The sign-in screen should read as a quiet staff gateway, not a second consumer signup surface:
  `FitOut Ops` / `Sign in with your staff account.`
- The Staff management panel is visibly named and self-contained below the operational queue so it
  can later be promoted into a richer administration surface without pretending Phase 20 already
  has a role system.
- Invitation and refusal times shown to people are absolute instants, including the pending row's
  expiry.
- Raw spike and sketch manifests exist, but no packaged `spike-findings-*` or `sketch-findings-*`
  skill was available; uncurated artifacts were therefore not treated as canonical input.

</specifics>

<deferred>
## Deferred Ideas

- **Tiered ops authorization** — design a more complete role model with a `super_admin` role as the
  only role allowed to invite staff, then promote staff management to its own page. This is a future
  capability phase because it contradicts Phase 20's locked one-role and one-`/ops`-page boundaries.

### Reviewed Todos (not folded)

- **Reveal host contact details in ops queue** — already delivered and closed in Phase 18.1; no Phase
  20 work remains.
- **Host verification submission path and listing-creation gate** — Phase 18.1 scope, already
  implemented and verified.
- **Phase 18 PM decision follow-through** — completed Phase 18/18.1 work; retained only as historical
  context, not folded into this phase.

</deferred>

---

*Phase: 20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboarding*
*Context gathered: 2026-09-08*
