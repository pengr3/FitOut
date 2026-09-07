---
phase: "20"
slug: "ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboarding"
status: draft
shadcn_initialized: true
preset: "radix-nova (components.json; baseColor neutral; cssVariables true; lucide; registries {})"
created: "2026-09-08"
extends:
  - ".planning/phases/18-host-verification-listing-review-fitout-ops/18-UI-SPEC.md"
  - ".planning/phases/18.1-close-phase-18-verification-submission-didit-listing-gate/18.1-UI-SPEC.md"
requirements: [OPS-07, OPS-08, OPS-09, OPS-10, OPS-11, OPS-12]
---

# Phase 20 — UI Design Contract

> Visual and interaction contract for the dedicated FitOut Ops host, staff authentication and
> recovery, invitation acceptance, and the staff-management panel on the existing `/ops` page.

---

## Scope and visual direction

Phase 20 adds one quiet staff gateway and one management panel. It does not redesign the shipped
review queue, create a second ops page, add a second identity system, or turn the internal console
into a new visual brand.

The ops-auth surfaces are structurally familiar because they reuse the established auth shell,
`PanelCard`, field, validation, and button patterns. They are unmistakably staff-facing through the
identity `FitOut Ops` and direct copy, not through a new palette, logo, illustration, security boast,
or dramatic dashboard chrome. The console keeps the shipped muted ops shell and adds Staff management
below the entire queue. Active staff and Pending invitations are always separate visible sections.

Sources of truth: `20-CONTEXT.md` D-01 through D-20, ROADMAP Phase 20 success criteria, REQUIREMENTS
OPS-07 through OPS-12, the installed Next.js 16.2.7 Proxy and route-group documentation, and the
existing Phase 18/18.1 ops design contracts.

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn, initialized; `components.json` is present |
| Preset | Resolved checked-in style `radix-nova`, base color `neutral`, CSS variables enabled, subtle menu accent, no prefix |
| Component library | Radix through checked-in shadcn primitives in `src/components/ui/` |
| Icon library | `lucide-react@1.17.0`; icons are optional decoration and never the only state cue |
| Font | Geist Sans + Geist Mono through `next/font/google`; all Phase 20 UI uses Geist Sans |
| Styling | Tailwind CSS 4.3.0 with tokens in `src/app/globals.css`; no `tailwind.config.*` |
| Themes | `court` and `grove` remain token-compatible; court is the product screenshot theme |
| Pattern layer | Reuse `PanelCard`, `PageHeader`, `ResponsiveDialog`, `ErrorState`, `RowListSkeleton`, `SiteChrome`, and `SiteFooter`; no fourth card pattern or second overlay mechanism |

No token, primitive, theme, radius, elevation, motion, or package change belongs in this phase.
The local `shadcn info` command was attempted on 2026-09-08 but requires registry access unavailable
in this environment; the checked-in configuration and vendored inventory below are the authoritative
offline state. The shadcn initialization gate is therefore satisfied by the existing
`components.json`; no initialization or preset mutation is permitted.

## Component Inventory

Enumerated by `powershell -NoProfile -Command "$c=Get-ChildItem -LiteralPath src/components/ui -File -Filter '*.tsx'; $v=(Get-Content -LiteralPath node_modules/shadcn/package.json -Raw | ConvertFrom-Json).version; \"$($c.Count) shadcn@$v\""` — 32 components — `shadcn@4.10.0` — 2026-09-08.

Installed set: `alert`, `aspect-ratio`, `avatar`, `badge`, `button`, `calendar`, `card`, `checkbox`,
`collapsible`, `command`, `dialog`, `dropdown-menu`, `form`, `input-group`, `input`, `label`,
`popover`, `progress`, `radio-group`, `scroll-area`, `select`, `separator`, `skeleton`, `slider`,
`sonner`, `switch`, `table`, `tabs`, `textarea`, `toggle-group`, `toggle`, `tooltip`.

The table is a non-exhaustive list of known-good components for this phase, not a closed allowlist.
An executor may check and use another installed primitive, but may not fetch a block or add a package.

| Component | Import path | Phase 20 contract |
|-----------|-------------|-------------------|
| `PanelCard` | `@/components/patterns/panel-card` | One card per ops-auth document and one Staff management container; never nest a second card inside it |
| `Form` family | `@/components/ui/form` | Labelled email, name, and password controls with shared React Hook Form/Zod validation |
| `Input` | `@/components/ui/input` | Email, name, and password inputs; the fixed invited email is rendered as text, not a disabled input |
| `Button` | `@/components/ui/button` | Neutral primary, outline secondary, destructive-confirm treatment, and the explicit 44px touch size |
| `Badge` | `@/components/ui/badge` | Neutral `You` marker only; no role hierarchy or colored authorization badge |
| `ResponsiveDialog` | `@/components/patterns/responsive-dialog` | Revoke and Cancel confirmations; bottom sheet below `sm`, centered dialog from `sm` upward |
| `Separator` | `@/components/ui/separator` | Separates Invite staff, Active staff, and Pending invitations inside one panel |
| `RowListSkeleton` | `@/components/patterns/row-list-skeleton` | Existing single announced route-loading region; do not mount a second simultaneous loading announcer |
| `ErrorState` | `@/components/patterns/error-state` | Protected ops-console boundary with retry and an absolute public-host route out |
| `SiteChrome` / `SiteFooter` | `@/components/patterns/*` | Existing shell geometry; every marketplace/legal destination on the ops host is an absolute public-origin link |

## Spacing Scale

Declared Phase 20 values; every spacing token resolves to the standard set 4, 8, 16, 24, 32, 48,
or 64px:

| Token | Value | Usage in Phase 20 |
|-------|-------|-------------------|
| xs | 4px | Tight metadata pairs and inline icon gaps |
| sm | 8px | Label/control pairs, button clusters, badge gap |
| compact | 8px | Existing row and compact-form rhythm only; alias of `sm` |
| md | 16px | Card padding at mobile, form field rhythm, row padding |
| lg | 24px | Card padding from `sm`, separation within a management section |
| xl | 32px | Separation among Invite staff, Active staff, and Pending invitations |
| 2xl | 48px | Gap from the operational queue to Staff management |
| 3xl | 64px | Existing page-level breathing room only |

Exceptions: the inherited 44px interactive-control floor (`size="touch"` / `h-11`) applies to every
new action in this phase—Sign in, Send reset link, Set new password, Create staff account, Send
invitation, Revoke access, Resend invitation, Cancel invitation, and both dialog decisions. It is an
accessibility exception to the named spacing ladder, not permission to introduce another arbitrary
value.

Layout measurements:

- Ops-auth cards retain the auth column `w-full max-w-sm` with `px-4 py-12`; the wordmark-to-card gap
  remains 24px.
- The existing console retains `OPS_QUEUE_SHELL = "mx-auto w-full max-w-5xl px-4 py-10"`.
- Staff management starts 48px below the queue region, including when the queue is empty.
- `PanelCard` owns its existing `p-4 sm:p-6`; call sites add no duplicate card padding.
- Within Staff management, sections are 32px apart and rows are 16px apart vertically.
- At 320px all form controls and row actions stack full-width. At `sm` the invite input/button may
  become `minmax(0,1fr) auto`; at `md` roster actions may sit in a right-hand column.

## Typography

Exactly four semantic sizes and exactly two weights, inherited unchanged:

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 regular | 1.5 |
| Label | 14px | 400 regular | 1.43 |
| Heading | 20px | 600 semibold | 1.3 |
| Display | 28px | 600 semibold | 1.15 |

Usage rules:

- Each ops-auth `PanelCard` title is the document's only `<h1>` at Heading.
- The existing `/ops` `PageHeader` remains the only `<h1>` on the console. `Staff management` is an
  `<h2>` at Heading; `Invite staff`, `Active staff`, and `Pending invitations` are `<h3>` at Body
  size with semibold weight.
- Row facts, dates, inviter, refusal reasons, field help, and result copy use Label. Email addresses
  remain regular weight and may wrap; no staff email is promoted into display type.
- Dates and times use `tabular-nums`. All people-facing timestamps are formatted server-side; the UI
  receives finished strings and performs no date arithmetic.
- Buttons and links use the existing Label-sized control recipe. No 12px control label is introduced.

## Color

All values come from project tokens; implementation uses semantic utilities, never raw literals.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--background`: court `#ffffff`, grove `#f7fcfc` | Ops console page ground and document ground outside the muted auth column |
| Secondary (30%) | `--card`: `#ffffff`; `--muted` / `--secondary`: court `#f5f5f5`, grove `#eaf3f2` | Auth ground, cards, separators, neutral notices, `You` badge, row hover/disabled surfaces |
| Accent (10%) | `--brand`: court `#da2d34`, grove `#13807c` | No Phase 20 occurrence; reserved to the existing ten declared product devices |
| Destructive | `--destructive`: `#cd0916` | Text/icon on the final Revoke and Cancel confirmation controls and inline destructive failures only |

Accent reserved for: the ten existing entries in `src/lib/design/accent-uses.ts` only. Phase 20 adds
zero entries and `AccentUseCountIsTen` must remain true. In particular, Sign in, Send invitation,
Resend, and any staff-role control are neutral. An internal authorization surface is not a conversion
funnel, and color must never nudge an operator toward granting or retaining access.

Destructive color never carries meaning alone. Row-level `Revoke access` and `Cancel invitation`
entry controls stay neutral outline buttons; the final dialog action uses the existing destructive
treatment and names the action in text. Disabled self/last-staff controls use ordinary disabled
styling plus a visible reason, never red and never a tooltip-only explanation. Success confirmations
use ordinary foreground ink on muted surface—no green fill, no check icon requirement, and no new
status tone.

## Copywriting Contract

Locked copy and the recommended exact wording for discretionary states:

| Element | Copy |
|---------|------|
| Primary CTA | `Send invitation` on the protected `/ops` surface |
| Ops identity | `FitOut Ops` |
| Sign-in title / description | `Sign in` / `Sign in with your staff account.` |
| Sign-in primary CTA | `Sign in`; in flight `Signing in…` |
| Credential error | `Invalid email or password.` |
| Nonstaff refusal | `This account does not have access to FitOut Ops.` |
| Signed-out confirmation | `Staff session ended.` |
| Invitation-accepted confirmation | `Staff account created. Sign in to continue.` |
| Recovery title / description | `Reset your password` / `Enter your staff email and we'll send you a reset link.` |
| Recovery CTA / success | `Send reset link`; in flight `Sending…`; `If a staff account exists for that email, a reset link is on its way.` |
| Reset title / CTA | `Set a new password`; `Set new password`; in flight `Saving…` |
| Reset-link refusal | `That reset link is invalid or has expired. Request a new one.` |
| Invitation setup title / description | `Create your staff account` / `Set your name and password to join FitOut Ops.` |
| Fixed invitation fact | Label `Staff email`; value is the server-derived invited email |
| Invitation setup CTA | `Create staff account`; in flight `Creating account…` |
| Inactive invitation heading | `This invitation is no longer active` |
| Inactive invitation body | `Ask the FitOut staff member who invited you to send a new invitation.` |
| Staff panel title / description | `Staff management` / `Invite staff and manage access to FitOut Ops.` |
| Invite form title / CTA | `Invite staff`; `Send invitation`; in flight `Sending invitation…` |
| Already-staff refusal | `Already a staff member.` |
| Marketplace-account refusal | `Use a separate email for staff access.` |
| Duplicate invitation refusal | `An invitation is already pending for this email. Use Resend invitation on the pending invitation.` |
| Invite success | `Invitation sent to {email}.` |
| Delivery failure | `We couldn't send the invitation. It remains pending so you can use Resend invitation to try again.` |
| Active roster heading | `Active staff` |
| Current operator marker | `You` |
| Visible roster actions | `Revoke access`; `Resend invitation`; `Cancel invitation` |
| Self-revoke reason | `You can't revoke your own staff access.` |
| Last-staff reason | `You can't revoke the last staff account.` |
| Pending roster heading | `Pending invitations` |
| Empty state heading | `Pending invitations` remains visible; no nested promotional heading is added |
| Empty state body | `No pending invitations.` |
| Error state | `FitOut Ops didn't load` / `We hit a problem loading the ops console. Trying again usually fixes it.` with `Try again` and `Back to FitOut` |
| Destructive confirmation | `Revoke staff access?` and `Cancel invitation?`; exact dialog copy appears in the table below |
| Resend success | `A new invitation link was sent to {email}. The previous link no longer works.` |
| Cancel success | `Invitation for {email} was cancelled.` |
| Revoke success | `{email} no longer has staff access.` |
| Stale-action error | `This staff record changed before the action completed. Refresh the page and try again.` |
| Console error state | `FitOut Ops didn't load` / `We hit a problem loading the ops console. Trying again usually fixes it.` |

Destructive confirmations:

| Action | Title | Body | Safe action | Final action |
|--------|-------|------|-------------|--------------|
| Revoke | `Revoke staff access?` | `Revoke {email}'s access to FitOut Ops. They will lose access on their next request. This does not delete the account.` | `Keep staff access` | `Revoke access`; in flight `Revoking…` |
| Cancel | `Cancel invitation?` | `Cancel the invitation for {email}. Its current link will stop working immediately.` | `Keep invitation` | `Cancel invitation`; in flight `Cancelling…` |

Copy constraints:

- Do not mention whether a refused sign-in belongs to a booker or host.
- Malformed, unknown, expired, cancelled, and used invitation tokens render the exact same inactive
  heading, body, structure, status, and actions. No token-specific noun or retry detail may vary.
- Recovery request success never confirms that an account exists.
- No security boast (`secure portal`, `verified staff`, `protected account`) appears.
- No marketplace signup, Google sign-in, host/booker mode, or support-email copy appears.
- Dates are absolute. Pending rows use a finished form such as `Sep 9, 2026, 4:30 PM PHT`; never
  `tomorrow`, `in 24 hours`, or a client-computed countdown.

## Surface 1 — Ops authentication and recovery

### Host and route identity

The visible ops-host routes are `/login`, `/forgot-password`, `/reset-password`, and the invitation
setup URL. They live in a sibling ops-auth route group and are reached through Proxy rewrites to
non-conflicting internal paths; they do not inherit `(ops)/ops/layout.tsx`, because that layout
cloaks signed-out callers before a sign-in page could render. The installed Next.js 16.2.7 route-group
rule means two route groups cannot both resolve a page to the same visible path without a conflict.

Proxy only selects the host/path surface. It never changes the following visual contract and never
acts as authorization. Marketplace-host requests for the ops paths render the common cloak, not an
ops-themed error or redirect.

### Ops-auth shell

- One `<main>` fills the viewport, centers a `w-full max-w-sm` column on `bg-muted`, and preserves the
  existing auth shell's 16px horizontal / 48px vertical padding.
- The first visual item is the `FitOut Ops` wordmark. It links to the ops-host `/login`, not `/`, and
  keeps the browser-default focus indicator.
- One `PanelCard` follows at 24px. The card title is the only `<h1>`.
- The shared footer may remain, but every marketplace/legal link receives an absolute URL from the
  configured public origin. No root-relative public destination is permitted on the ops host.
- The shell contains no public header, nav landmark, theme switch, profile link, signup action,
  marketplace mode switch, notification bell, or Google control.

### Sign-in form

The card order is: optional arrival notice; Email; Password with `Forgot password?` aligned on the
label row; inline form result; full-width Sign in button. The recovery link is the card's only
secondary journey. There is no divider and no text below the button inviting account creation.

Email uses `type="email"` and `autocomplete="email"`; password uses `type="password"` and
`autocomplete="current-password"`. Submit disables only while the current request is in flight and
changes its label to `Signing in…`. On validation failure, focus moves to the first invalid field.
Credential and nonstaff refusals appear in the same inline result position with `role="alert"` and
destructive text; the difference is copy only. A nonstaff session is cleared before the refusal is
shown.

`Staff session ended.` and `Staff account created. Sign in to continue.` are arrival notices: plain
muted panels that mount with the page, not live regions. They are selected from a bounded result enum,
not arbitrary query-string copy.

### Recovery and reset

Recovery preserves the established enumeration-safe shape: one email field, one neutral primary
button, one success sentence, and one underlined `Back to sign in` link. The success sentence replaces
the form after submission and is identical whether delivery occurred or the account exists.

Reset preserves one new-password field, its established password rules, inline refusal, and
`Back to sign in`. Missing, malformed, and expired reset tokens use the same refusal and offer the
recovery route. Every recovery/reset link is relative only within the ops host; email URLs are built
from the validated ops origin.

## Surface 2 — Staff invitation setup

An active invitation renders one focused `PanelCard` in the ops-auth shell:

1. `<h1>Create your staff account</h1>` and the locked description.
2. A `Staff email` description-list fact. The value wraps and cannot be focused or edited as a form
   control. Email and user id are absent from the submitted payload; the token selects the invite.
3. `Name` with `autocomplete="name"`.
4. `Password` with `autocomplete="new-password"` and the shared minimum/maximum help and validation.
5. A full-width neutral `Create staff account` button.

GET displays the form but never consumes the invitation. POST owns acceptance. While submitting, all
form controls are disabled, the button reads `Creating account…`, and the card does not optimistically
claim success. A successful POST routes to `/login` with the bounded acceptance confirmation.

Every inactive token class renders one identical card with the inactive heading and body, plus one
`Back to sign in` outline link. It has no form, token echo, email, expiry, Resend invitation action, or visual clue
about whether the token once existed. Because this is a freshly rendered page state, it is not an
alert/live region.

## Surface 3 — Staff management on `/ops`

The existing review queue remains first and byte-for-byte retains its PageHeader, ordered list,
queue-empty state, row visuals, and decision controls. After its data region, add exactly one
`PanelCard`:

```text
Review queue (existing h1 and queue)
  [48px separation]
Staff management (h2, one PanelCard)
  Invite staff (h3 + form)
  --------------------------------
  Active staff (h3 + oldest-first list)
  --------------------------------
  Pending invitations (h3 + newest-first list or sentence)
```

There is no `/ops/staff` page, tab, accordion, disclosure, sidebar, or hidden settings route. The
management panel is visible below both a populated queue and the queue-clear state.

### Invite staff

The invite form has one email field and one `Send invitation` button. At 320px they stack full-width;
from `sm`, the field consumes remaining width and the touch-sized button remains intrinsic. The form
does not collect role level, permissions, personal name, or an account-conversion choice.

Server outcomes replace neither roster section. They render persistently in one result slot below the
form and above Active staff until the next staff-management action or navigation. That slot renders
exactly one mechanism for the current outcome: Invite/Resend success uses one polite status region and
keeps focus on the invoking control; a failed submission uses one alert region; successful
Cancel/Revoke uses a plain `tabIndex={-1}` focus target because its trigger disappeared. There is never
both a toast and an in-page result, or both a focus move and a live-region announcement, for the same
action.

After invite success, clear the email field only after the server confirms the row and delivery result.
On delivery failure, retain the pending row, clear no authoritative roster data, and use the exact
delivery-failure copy directing the operator to Resend invitation. Duplicate Invite never rotates the token and
focuses or scrolls to the existing Pending invitations row after the refusal is announced.

### Active staff

Render a semantic `<ul>` in oldest-first order. Each `<li>` is a responsive two-zone row inside the
parent panel, not its own card:

- Facts: email as the leading value; `Staff since {absolute date}`; neutral `You` badge when current.
- Action: one touch-sized outline `Revoke access` button, or the same disabled button plus its visible reason.

The email and date wrap and are never truncated. Internal id, capability booleans, audit actor id,
and role literal stay off screen. One eligible staff member reads naturally without singular/plural
summary copy; many rows repeat the same padding and separator. Zero active staff is an invariant
failure, not an empty state: the protected page must route to its error boundary rather than claim no
one administers the session currently viewing it.

The self-revoke and last-staff reasons come from the same shared server-owned declarations returned
for direct/stale requests. The UI uses them in `aria-describedby` for the disabled button and renders
the sentence visibly beside it. Disabled is explanation only; server refusal remains authoritative.

### Pending invitations

The section heading is always present. At zero rows, render only `No pending invitations.` in muted
Label text—no icon, dashed promotional panel, CTA duplication, or hidden section.

At one or many rows, render a semantic `<ul>` newest-first. Each row shows:

- email;
- `Sent {absolute instant}`;
- `Expires {absolute instant}`;
- `Invited by {staff email or display name chosen by the read model}`;
- touch-sized outline `Resend invitation` and `Cancel invitation` controls.

Internal invite id, row version, token/digest, and database timestamps used for concurrency remain
server-bound and off screen. Long emails and inviter values use `min-w-0` plus anywhere wrapping;
actions wrap beneath facts at 320px and never cause horizontal page scroll.

Resend runs immediately. During its request, both controls on that row are disabled and the label is
`Resending…`; other rows remain usable. Success replaces the server-rendered expiry/sent values and
persists the exact invalidation confirmation. No optimistic timestamp or token rotation appears.

Cancel opens the confirmation dialog. On success the row disappears only after server confirmation.
The persistent success line becomes a `tabIndex={-1}` programmatic focus target because its trigger no
longer exists; for that outcome the line is not also a live region, preventing a double announcement.

### Revoke and Cancel dialogs

Both use `ResponsiveDialog`, the one installed overlay mechanism. The title and description are always
visible. At 320px the dialog is a bottom sheet capped by dynamic viewport height and scrolls internally;
from `sm`, it remains the vendored centered dialog.

- Initial focus lands on the safe action, never the destructive action.
- Escape, overlay click, the visible close control, and the safe action all close without mutation.
- While submitting, both footer actions are disabled and the destructive label changes to its in-flight
  copy. Escape/overlay dismissal is disabled only for the active request, not before it.
- A stale or server refusal remains in the dialog as one alert with the server reason; the dialog does
  not close or remove the row.
- On ordinary close, focus returns to the trigger. On successful Cancel/Revoke the trigger unmounts,
  so `onCloseAutoFocus` moves focus to the persistent result line; focus must never fall to `<body>`.
- The destructive action is text-labelled and uses destructive ink/tint. No trash icon is required.

## Navigation and session interaction contract

- The protected ops shell keeps one destination and no primary nav. Its action cluster is exactly one
  touch-sized `Sign out` control; the old root-relative `ProfileLink` is removed from this composition.
- Sign out is a server-confirmed action, returns to ops-host `/login?signedOut=1`, and renders the
  bounded `Staff session ended.` arrival notice. It never redirects to the marketplace host.
- The ops wordmark links to `/ops`; ops-auth wordmark links to `/login`.
- `Back to FitOut`, footer `Find a space`, `Host your space`, Terms, and Privacy are absolute links to
  the configured public origin. Their labels remain unchanged.
- A safe callback may return only to `/ops` or an `/ops/...` descendant on the same ops origin. In this
  phase only `/ops` exists, so any other, cross-origin, marketplace, or malformed callback falls back
  to `/ops` without surfacing an error.
- Session isolation has no visual exception: an authenticated marketplace user sees the normal ops
  sign-in surface on the ops host; a staff session on the ops host does not make the marketplace host
  signed in. Signing in twice is expected behavior.

## Loading, error, and partial-state contract

- Route loading keeps one announced region. The existing `/ops` `RowListSkeleton` remains that region;
  do not add a simultaneous `PanelSkeleton` announcer for Staff management. The staff panel is below
  the primary queue and may arrive only with the resolved page.
- Button-level pending state is local: only the submitting form or affected row disables, except a
  destructive dialog whose two footer actions disable together.
- The ops invitation lookup may use one `PanelSkeleton` named `Loading your staff invitation`; its
  bars are decorative and it renders inside the same max-width auth column.
- Staff and pending reads resolve as one authoritative protected-page snapshot. Missing/malformed
  required row facts do not render blank labels or guessed `Unknown` values; they route to the ops
  error boundary.
- The protected error boundary broadens from queue-only copy to the console copy in the Copywriting
  Contract and keeps `Try again`. Its route-out button is `Back to FitOut` with an absolute public URL.
- Error boundaries display only Next's opaque digest, never raw server error, email, token, invite id,
  or capability values.
- Action failures preserve the current input and authoritative rows. No failed Invite, Resend, Cancel,
  or Revoke silently navigates, closes, removes a row, or shows success.

## Responsive and accessibility contract

- Acceptance widths are 320px and 1280px. No Phase 20 surface may create horizontal viewport overflow.
- Forms and action groups are single-column at 320px. Buttons hold at least 44px height and do not
  compress their labels; desktop may place actions inline without changing DOM order.
- Emails, inviter values, and confirmation copy wrap. Page/card/dialog headings wrap and never truncate.
  Internal ids and bearer tokens never become a visible overflow problem because they never render.
- Every form field has a persistent visible label and associated message. Placeholder text is a hint,
  never the label. Invalid submission focuses the first invalid field.
- The fixed invited email is a `<dt>/<dd>` fact, not a disabled control, so it does not imply it can be
  edited and remains available to assistive technology.
- Lists use `<ul>/<li>`; headings preserve `h1 → h2 → h3`; row actions have email-specific accessible
  names `Revoke staff access for {email}`, `Resend invitation to {email}`, and
  `Cancel invitation for {email}`, while their visible labels are `Revoke access`,
  `Resend invitation`, and `Cancel invitation`.
- The `You` marker and disabled reason are text, not color-only cues. Absolute expiry includes timezone.
- Every `ResponsiveDialog` has an accessible title/description, safe initial focus, Escape behavior,
  visible close control, and deterministic focus restoration.
- Reduced-motion behavior is inherited from the global reset. No new animation or spinner is added.
- No new `data-testid` is authorized where a role/name query or existing pattern id can select the
  element. If a structural hook is genuinely required, it must first enter `selector-contract.ts` with
  a reason and a measured count.

## UI Considerations

Applicable state considerations resolved: **50 applicable — 34 covered, 16 backstop, 0 unresolved**.
The autonomous kind-confirmation used explicit unions for forms, list collections, interactive
controls, static content, and navigation. The 16 overflow/long-text readings remain visual backstops
because source structure cannot prove rendered wrapping at both acceptance widths.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| Empty | Sign-in, recovery/reset, invite setup, staff panel, Active staff, Pending invitations | ✅ covered | Blank auth forms render their labelled controls; inactive invitation has its canonical state; Pending invitations always renders `No pending invitations.`; zero Active staff throws to the protected boundary |
| Loading | All eight probed surfaces | ✅ covered | One route-level announced skeleton, one invite lookup `PanelSkeleton`, local in-flight button labels, and no duplicate loading announcers are specified |
| Error | All eight probed surfaces | ✅ covered | Inline form/action refusals preserve data; inactive tokens share one state; protected load failures use `ErrorState`; cross-host failures never render ops UI |
| Populated | Staff management, Active staff, Pending invitations | ✅ covered | One parent panel contains separate semantic lists in locked order with the exact fact/action inventory above |
| Partial | Auth forms and all roster surfaces | ✅ covered | First-invalid-field behavior is specified; authoritative roster facts resolve together; malformed required facts route to the boundary rather than blank or guessed content |
| Zero / one / many | Staff management, Active staff, Pending invitations | ✅ covered | Pending zero keeps its section and sentence; one/many reuse identical list rows; Active zero is an invariant failure |
| Overflow | All eight probed surfaces | 🧪 backstop | Verify no horizontal viewport overflow and correct dialog internal scrolling at 320px and 1280px; implementation structure is specified but rendered pixels require browser evidence |
| Long text | All eight probed surfaces | 🧪 backstop | Verify long emails, inviter labels, timezone dates, headings, buttons, dialogs, and absolute public links wrap/reflow without clipping or action displacement |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | None fetched; all required primitives are already vendored | not required |
| third-party | None; `components.json` has `"registries": {}` | not applicable — zero third-party blocks declared |

A new registry block or runtime dependency is a scope alarm. Do not use `shadcn add`, `npm install`,
or a copied external auth/admin block. This phase handles credentials, bearer links, and privileged
role changes; its UI must remain inside the audited checked-in component tree.

## Design-gate impact

| Gate / inventory | Required Phase 20 result |
|------------------|--------------------------|
| `src/lib/design/accent-uses.ts` | Unchanged at 10; every Phase 20 auth/ops file contains zero brand-accent recipe occurrences |
| `tests/design/card-pattern-coverage.test.ts` | Every new card-bearing file is declared as a `panel-card` adopter; `ALLOWED_RAW_CARD` gains no row; counts move only after enumeration |
| `src/lib/design/live-regions.ts` | Add only the staff-management result region(s) actually rendered, with rule/reason and same-commit count rename; arrival and inactive page states are not regions |
| `tests/design/loading-coverage.test.ts` | Enumerate any new async ops-auth page and ship its loading fallback in the same commit; do not guess count deltas in advance |
| `tests/design/responsive-dialog-autofocus.test.tsx` | Revoke and Cancel adopter(s) enter the derived census; safe initial focus and trigger-unmount focus restoration are tested |
| `src/lib/design/selector-contract.ts` | Unchanged unless a role/name query is proven insufficient; no speculative test id |
| `src/lib/design/measurements.ts` | `OPS_QUEUE_SHELL` and existing skeleton measurements remain; add no measurement unless browser geometry requires and records one |
| `src/app/not-found.tsx` and ops cloak gates | Byte-unchanged and host-independent; no `(ops)`-scoped or ops-auth-scoped `not-found.tsx` |
| `tests/design/one-tree.test.ts` | One DOM tree at all widths; CSS reflow only, no viewport-conditional JSX |
| `src/components/ui/**` | No vendored primitive edit; compose public APIs from ops-domain components |

## Falsifiable acceptance criteria

1. The ops sign-in document contains `FitOut Ops`, one `<h1>Sign in</h1>`, the exact locked
   description, Email and Password fields, one Forgot password link, and one neutral Sign in button;
   it contains no Google control, divider, signup link, public header, profile link, or mode switch.
2. Correct nonstaff credentials leave the caller on ops sign-in, clear the ops-host session, and show
   only `This account does not have access to FitOut Ops.`—no host/booker classification.
3. Sign-out returns to the ops-host sign-in surface and renders `Staff session ended.` as a bounded
   arrival notice, not arbitrary query-string content or a live region.
4. Recovery and reset remain on the ops host end to end, show the exact enumeration-safe success and
   reset refusal copy, and mint no marketplace-host URL/session.
5. Active invitation GET performs no write. Its fixed email is a fact, not an input; the POST payload
   cannot choose an email/user id; success returns to ops sign-in.
6. Malformed, unknown, expired, cancelled, and already-used invitation links render the same heading,
   body, actions, status, and DOM shape and reveal no email/token/expiry difference.
7. `/ops` still has one `PageHeader`/`h1`; Staff management is one PanelCard below the complete queue
   with visible h3 sections Invite staff, Active staff, and Pending invitations.
8. No `/ops/staff` page, staff tab, disclosure, sidebar, tier selector, or public staff-signup control
   exists.
9. Active staff renders oldest-first with email, server-formatted staff-since date, and text `You` for
   the current operator; pending invitations render newest-first with email, sent instant, absolute
   expiry with timezone, and inviter; neither renders an internal id, token, digest, or version.
10. Pending invitations at zero rows keeps its heading and renders exactly `No pending invitations.`
    without EmptyState, icon, CTA, or hidden section.
11. Invite duplicate, existing staff, and marketplace-account conflicts show the specified persistent
    refusal and do not rotate a token, send mail, or alter either roster optimistically.
12. Invite, Resend, Cancel, and Revoke successes remain visibly in-page after completion; no toast is
    the only evidence of an outcome.
13. Resend has no confirmation, disables only its row while pending, rotates only after server success,
    and states that the previous link no longer works.
14. Cancel and Revoke use ResponsiveDialog, focus the safe action first, disable both actions during
    submit, retain the dialog on refusal, and never drop focus to body when the successful trigger
    unmounts.
15. Self-revoke and last-staff revoke each show a disabled `Revoke access` control and the exact
    shared reason visibly and through `aria-describedby`; a direct/stale server request returns the
    same reason.
16. All new controls are at least 44px tall at 320px and 1280px. Forms/actions stack at 320px; emails,
    headings, timestamps, and dialog copy wrap with no horizontal viewport overflow.
17. Every marketplace/legal link rendered on the ops host is absolute to the configured public origin;
    ops sign-out, auth, recovery, reset, and invite links remain on the ops host.
18. `ACCENT_USES.length === 10`; Phase 20 adds no brand occurrence, new color pair, status tone, raw
    color literal, token, primitive, package, registry block, or schema migration.
19. The route-level loading UI contains exactly one announced loading region. Invite lookup uses at
    most one named PanelSkeleton. No page mounts two live regions announcing one pending state.
20. The production route census includes every new visible and internal ops route, checks staff 200 /
    nonstaff 404 / signed-out 404 / nonexistent 404, and proves the three 404 bodies byte-identical;
    no ops or ops-auth scoped not-found file exists.

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS
- [ ] Dimension 7 Inventory Provenance: PASS

**Approval:** pending
