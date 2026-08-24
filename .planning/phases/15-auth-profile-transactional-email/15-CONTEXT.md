# Phase 15: Auth, Profile & Transactional Email - Context

**Gathered:** 2026-08-24
**Status:** Ready for planning

<domain>
## Phase Boundary

**The first screens a new user ever sees, and every email FitOut sends, carry the same identity as the
app — with no send trigger moved.**

**In scope — AUTHUI-01..03 + EMAIL-01..03:**
- The four auth screens — `src/app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx` plus
  `(auth)/layout.tsx` and `error.tsx` — get the design system and hold all five gates (AUTHUI-01/03).
- The profile page (`src/app/(app)/profile/`) gets the design-system pass (AUTHUI-02). The avatar
  *upload* control already exists there; the **removal affordance is Phase 16's CROP-03** — this phase
  restyles, it does not add that control.
- **All 19 existing sends** in `src/lib/email.ts` render through ONE shared branded shell — 600px,
  single column, table-based, inline hex from the generated token module, a preheader, a text wordmark,
  a plain-text part (EMAIL-01) — with **not a single send trigger moving**.
- Email colours generated from the same token contract as the app (`src/lib/design/tokens.generated.ts`,
  DS-12), so a theme swap cannot leave the emails behind (EMAIL-02).
- Real-client verification of the shell (EMAIL-03) — scoped by D-163 below.

**Out of scope — do not absorb:**
- **AUTHFB-01/02 stay in the backlog** (thin auth emails' content/flow enrichment + the silent
  post-reset landing). The verification and reset sends ARE two of the 19 existing sends and get the
  shell like every other send — but no content, flow, or trigger change beyond it. If the shell work
  makes AUTHFB-01 near-free in passing, that is a roadmap amendment to PROPOSE, not scope to absorb
  (REQUIREMENTS.md:142).
- **No new email stack** (D-66): no React Email, no MJML, no templating library. The shell is built the
  way `email.ts` already builds markup.
- Avatar removal and any crop/framing UI — Phase 16.
- The full axe pass and cross-cutting sweeps — Phase 17.
- **Any change to what triggers a send, when, or to whom** (success criterion 3 / D-130). The
  fire-and-forget call sites in `auth.ts` and the notification layer are untouchable.
- Zero schema migrations. No new env-var requirement that breaks the shipped dev fallback.

</domain>

<inherited_and_not_re_decided>
## Carried forward — settled before this phase, not re-opened

| Inherited | Source | What it binds here |
|---|---|---|
| Five hard gates on every surface | PROJECT D-131 + D-134 | 320px · keyboard + AA + visible focus · designed loading/empty/error · court-only VR baseline · GATE-NOREG. Auth screens explicitly named by AUTHUI-03. |
| `court` is the single product theme | PROJECT D-138 | Court-only baselines for the auth screens and profile. |
| No raw hex under `src/components/**` / `src/app/**` | DS-13 leak gate | **Emails are the sanctioned exception by construction:** inline hex in email markup comes ONLY from `tokens.generated.ts` (DS-12), which is the generated, drift-checked duplicate. `src/lib/email.ts` is outside the gate's globs; keep it that way rather than widening an allowlist. |
| `escapeHtml()` on every interpolated URL | ROADMAP Phase-15 constraint · WR-01 | Do not weaken `tests/auth/email-escaping.test.ts`. Every value the shell interpolates inherits the same treatment. |
| The dev fallback's logging guard | `email.ts` WR-02 | `RESEND_API_KEY` absent in production fails loudly WITHOUT logging token-bearing links; dev logs the full body. The shell must not alter this behaviour. |
| Send call sites are fire-and-forget | `email.ts` header / RESEARCH Pitfall 4 | Never `await` from `auth.ts`; timing side-channel + response speed. |
| Support-address discipline | PROJECT D-64 / `site.ts` D-26 block | Nothing renders a support contact while `SUPPORT_EMAIL` is null; no fabricated address, ever. |
| Phase 11's patterns are adopted, never re-authored | 11-UI-SPEC | `PageHeader`, `EmptyState`, `ErrorState` (routeOut required), the skeletons. The `(auth)` shells are among `ALLOWED_RAW_CARD`'s named Phase-15 exemptions (`11-13-SUMMARY.md:131`) — spend them the way Phase 14 spent its two. |
| Geometry assertions never seed from the clock | Phase-14 `[14-16]` lesson, now in three docblocks | Any new baseline/geometry fixture uses absolute instants and fixed-length strings. |

</inherited_and_not_re_decided>

<decisions>
## Implementation Decisions

> **Namespace.** Phase 14 ran 14-CONTEXT D-140…D-156. This phase starts at **D-160**. Qualify citations
> as "15-CONTEXT D-160" vs "PROJECT D-160" — the collision convention is unchanged.

### The sender identity (EMAIL-01/03)

- **D-160: The sender stays `FitOut <onboarding@resend.dev>` — no domain exists yet.** *(PM-decided
  2026-08-24.)* No domain is bought or verified in this phase. Consequences accepted: Resend test mode
  delivers only to the account-owner inbox (pengr.clmc.3@gmail.com), and recipients would see a
  resend.dev address. The shell ships fully; swapping the sender later is one env var (`EMAIL_FROM`),
  and nothing in this phase may hard-code the sender anywhere a later env change would not reach.

### The support slot (EMAIL-01 footer)

- **D-161: `SUPPORT_EMAIL` stays null; the shell's footer carries the slot WIRED BUT EMPTY.** *(PM-decided
  2026-08-24 — the same call as D-64, re-confirmed.)* The footer renders a support line only when
  `SUPPORT_EMAIL` is non-null, exactly like the app's payment-state support path. One line in
  `src/lib/site.ts` lights up both when a monitored inbox becomes real. No placeholder address, no
  "coming soon" copy.

### The auth screens' shape (AUTHUI-01)

- **D-162: One centered card on a quiet background.** *(PM-selected over a split-screen brand panel and
  over a product-page overlay.)* Wordmark above the card, the form inside it, coral on the primary
  action only — the app's one-accent restraint applied to its front door. All four screens share one
  composition; forgot/reset are the same card with different fields. This is also the cheapest shape to
  hold at 320px, under keyboard traversal, and in a visual baseline.
  - The split-screen option was rejected partly because there is no brand photography — a placeholder
    panel in a placeholder-design milestone is work that gets redone (D-127's logic).

### EMAIL-03's verification scope

- **D-163: Three of four clients close in-phase; Outlook desktop is DECLARED BLOCKED on client access.**
  *(PM-stated availability 2026-08-24: Gmail web ✓, Gmail Android ✓, Apple Mail ✓, Outlook desktop ✗.)*
  Because D-160 keeps delivery restricted to the account-owner Gmail inbox anyway, and that one inbox
  can be opened in Gmail web, the Gmail Android app, and Apple Mail (the account added to Mail.app),
  the three available clients cover the three deliverable surfaces — including the dark-mode check,
  easiest in Apple Mail. The Outlook-desktop quarter of EMAIL-03 is recorded as blocked-on-client-access
  in the phase's verification artifacts, the same honest convention as the nine visual baselines. It is
  NOT dressed as coverage, and the requirement is NOT ticked complete until either Outlook is opened or
  the PM explicitly accepts the gap at phase close.
  - Planning note: the walk itself is a **manual UAT** (the PM opens the inboxes); the phase produces
    the sends and a checklist, the PM states the outcome — 13/14's UAT-log convention.

### Claude's Discretion — decided by engineering, recorded, not escalated

- **The shell is one function, not nineteen edits of markup.** Every send composes
  `renderEmailShell({...})` (name illustrative) and passes its body; subjects, recipients, and call
  sites do not move. The 19 adoptions are mechanical and diffable.
- **Preheader copy per send, the text wordmark's rendering, the plain-text part's derivation** — all
  engineering. The plain-text part must be derived from the same content as the HTML so the two cannot
  drift (the week-strip lesson applied to email).
- **Outlook-safe construction even though Outlook verification is blocked** — tables, no flex/grid, no
  background images, MSO conditionals only if measured necessary. Building to the known constraints of
  the client we cannot open is cheaper than rebuilding when a domain and an Outlook appear.
- **Auth screens' loading/error states, profile's design pass composition, test strategy, file layout,
  plan count** — mine.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements and milestone decisions
- `.planning/ROADMAP.md` § Phase 15 — goal, five success criteria, the merged-phase rationale, and the
  backlog-999.1 constraint block (AUTHFB stays out; no React Email; escapeHtml; the named test).
- `.planning/REQUIREMENTS.md` — AUTHUI-01..03 (lines ~86-88), EMAIL-01..03 (lines ~92-94), the
  AUTHFB adjacency note (line ~142), the AUTHUI-02/CROP-03 boundary note (line ~274).
- `.planning/PROJECT.md` — Key Decisions: D-130, D-131, D-134, D-138; D-64 (support address).

### The surfaces and the send layer
- `src/lib/email.ts` — all 19 sends, `escapeHtml`, the WR-02 dev-fallback guard, the fire-and-forget
  contract. **688 lines; the single file EMAIL-01 reshapes.**
- `src/app/(auth)/` — layout, error boundary, four pages.
- `src/app/(app)/profile/` — page, loading, `profile-form.tsx` (the D-150 save-state analog lives here).
- `src/lib/site.ts` — the D-26/D-64 block and `SUPPORT_EMAIL`.
- `src/lib/design/tokens.generated.ts` — DS-12's generated hex module, EMAIL-02's single colour source.
- `tests/auth/email-escaping.test.ts` — must not be weakened.

### Prior-phase artifacts that bind
- `.planning/phases/11-quality-gates-pattern-layer-app-shell/11-13-SUMMARY.md:131` — the four auth
  shells' `ALLOWED_RAW_CARD` exemptions, held for this phase.
- `.planning/phases/14-host-tooling/14-UAT-LOG.md` — the UAT-log convention (walks discharged only by
  the operator) that D-163's Outlook gap and mail-client walks follow.
- `C:\Users\Admin\.claude\...\memory/local-env-and-uat-seed.md` (operator memory, not repo) — Resend
  test-mode delivery constraint and the `RESEND_API_KEY` env recipe for real sends.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable assets
- `src/lib/email.ts` already centralises ALL sends behind one `send()` — the shell slots in beneath it
  without touching a signature.
- `tokens.generated.ts` exists, is drift-checked, and already carries hex fallbacks (DS-12 closed the
  BRAND_CORAL drift with it). EMAIL-02 is mostly wiring, not generation work.
- `profile-form.tsx` is the repo's model for truthful save-state (Phase 14's D-150 copied it).
- The `(auth)` route group already has its own layout and error boundary from Phase 11.

### Constraints from the tree
- 19 sends today: 2 auth (verification, reset), plus booking/request/cancellation/refund/reminder/group
  families. Some carry structured bodies (tables of facts, refund windows) — the shell must wrap them
  without flattening their content.
- `ALL_RAILS_REFUND_WINDOW` is imported by `email.ts` as a COPY CONSTANT with its own boundary note —
  the shell must not disturb that import's asserted-unmoved status.
- `.env.local` has no `RESEND_API_KEY` by default — dev logs instead of sending. The EMAIL-03 walk
  needs the key set and the dev server restarted (operator memory).

### Integration points
- `auth.ts` fires verification/reset sends `void`-style — the shell changes nothing about when or how
  they fire.
- The Inngest notification layer calls the booking-family sends — same rule.

</code_context>

<specifics>
## Specific Ideas

- The auth card's register: quiet, few words, the wordmark as text (the email shell's text wordmark and
  the auth card's should be the same treatment — one identity, two surfaces).
- The email footer's shape when `SUPPORT_EMAIL` is null: the product line and the wordmark, nothing
  else. No dead "contact us" text pointing nowhere.
- EMAIL-03's walk artifact: a checklist the PM works through per client with a screenshot each —
  modelled on 14-UAT-LOG's evidence-pack pattern.

</specifics>

<deferred>
## Deferred Ideas

- **AUTHFB-01/02** (auth email content enrichment + post-reset landing) — backlog, by standing choice.
  If the shell makes AUTHFB-01 near-free, propose the roadmap amendment; do not absorb.
- **Domain purchase + Resend domain verification** — deferred until the PM has a domain. When it
  happens: DNS records, `EMAIL_FROM` env change, and re-running the EMAIL-03 walk with outside
  recipients. Nothing in this phase should make that harder than an env change.
- **Outlook desktop verification** — blocked on client access (D-163); revisit alongside the domain.
- **Avatar removal** — Phase 16 (CROP-03).

</deferred>

---

*Phase: 15-Auth, Profile & Transactional Email*
*Context gathered: 2026-08-24*
