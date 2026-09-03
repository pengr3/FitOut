# Phase 15: Auth, Profile & Transactional Email - Research

**Researched:** 2026-08-24
**Domain:** Table-based transactional HTML email rendering + design-system adoption on four auth surfaces and one profile surface, inside an existing gated Next.js 16 / React 19 / Tailwind 4 repository
**Confidence:** HIGH

> **Read `15-UI-SPEC.md` first, and treat it as upstream truth.** It is APPROVED (gsd-ui-checker,
> 6/6 dimensions, 2026-08-24) and it already settles composition, copy, colour, typography, spacing,
> live regions, inventories, anti-patterns and the falsifiable acceptance set. **This document does
> not restate it and never contradicts it.** It adds only what a spec cannot: the measured state of
> the tree, the arithmetic the spec explicitly deferred (*"Measure the file's real counts before
> moving the aliases"*), the library facts, and the failure modes a plan author will otherwise walk
> into. Where this file corrects the spec it says so loudly and shows the measurement.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

> **Namespace.** Phase 14 ran 14-CONTEXT D-140…D-156. This phase starts at **D-160**. Qualify citations
> as "15-CONTEXT D-160" vs "PROJECT D-160" — the collision convention is unchanged.

**The sender identity (EMAIL-01/03)**

- **D-160: The sender stays `FitOut <onboarding@resend.dev>` — no domain exists yet.** *(PM-decided
  2026-08-24.)* No domain is bought or verified in this phase. Consequences accepted: Resend test mode
  delivers only to the account-owner inbox (pengr.clmc.3@gmail.com), and recipients would see a
  resend.dev address. The shell ships fully; swapping the sender later is one env var (`EMAIL_FROM`),
  and nothing in this phase may hard-code the sender anywhere a later env change would not reach.

**The support slot (EMAIL-01 footer)**

- **D-161: `SUPPORT_EMAIL` stays null; the shell's footer carries the slot WIRED BUT EMPTY.** *(PM-decided
  2026-08-24 — the same call as D-64, re-confirmed.)* The footer renders a support line only when
  `SUPPORT_EMAIL` is non-null, exactly like the app's payment-state support path. One line in
  `src/lib/site.ts` lights up both when a monitored inbox becomes real. No placeholder address, no
  "coming soon" copy.

**The auth screens' shape (AUTHUI-01)**

- **D-162: One centered card on a quiet background.** *(PM-selected over a split-screen brand panel and
  over a product-page overlay.)* Wordmark above the card, the form inside it, coral on the primary
  action only — the app's one-accent restraint applied to its front door. All four screens share one
  composition; forgot/reset are the same card with different fields. This is also the cheapest shape to
  hold at 320px, under keyboard traversal, and in a visual baseline.
  - The split-screen option was rejected partly because there is no brand photography — a placeholder
    panel in a placeholder-design milestone is work that gets redone (D-127's logic).

**EMAIL-03's verification scope**

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

### Claude's Discretion

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

### Deferred Ideas (OUT OF SCOPE)

- **AUTHFB-01/02** (auth email content enrichment + post-reset landing) — backlog, by standing choice.
  If the shell makes AUTHFB-01 near-free, propose the roadmap amendment; do not absorb.
- **Domain purchase + Resend domain verification** — deferred until the PM has a domain. When it
  happens: DNS records, `EMAIL_FROM` env change, and re-running the EMAIL-03 walk with outside
  recipients. Nothing in this phase should make that harder than an env change.
- **Outlook desktop verification** — blocked on client access (D-163); revisit alongside the domain.
- **Avatar removal** — Phase 16 (CROP-03).
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| **AUTHUI-01** | The auth screens (login, signup, forgot, reset) carry the design system and read as the same product as the app | § The Auth Surfaces — measured; `ALLOWED_RAW_CARD` verified at 9 entries with the four auth rows carrying explicit Phase-15 reasons; `PanelCard.titleAs` verified as `"h2" \| "h3"`; `BRAND_CLASS` verified as a **non-exported** `const` at `site-chrome.tsx:95` (export is a required edit) |
| **AUTHUI-02** | The profile page carries the design system, and avatar removal is possible | § The Profile Surface — `BOOKING_SHELL` verified; the `py-10` duplication verified at `page.tsx:36` + `loading.tsx:18`; the plate's own docblock verified as agreeing with the spec's argument. Removal itself is CROP-03/Phase 16 (REQUIREMENTS.md:274) |
| **AUTHUI-03** | The auth screens hold the same five gates — 320px, keyboard, AA, designed states, and a baseline | § Pitfall 1 + § Visual Baselines Arithmetic — **`auth-login` already exists** as a baseline surface AND as one of only four `THEME_SWAP_SURFACES`; the spec's row arithmetic is off by two rows and one surface |
| **EMAIL-01** | All 19 sends render through one shared branded shell, no send trigger moving | § The Email Shell — 19 exported senders / 20 `send()` call sites verified by enumeration; Resend v6.12.4 `html`+`text` co-existence VERIFIED against installed types; `renderOpsAlertDigest` verified as a pure exported renderer with a PII contract |
| **EMAIL-02** | Email colour values generated from the same token contract as the app | § The Theme Wire — `THEME_TOKENS` verified (7 keys all distinct in both themes); `src/lib/**` verified outside the leak gate by an explicit test; `DEFAULT_THEME` verified to live in a `"use client"` module with **zero current server-side readers** |
| **EMAIL-03** | Verified in real Gmail (web + Android), Outlook desktop, Apple Mail — one in dark mode | § Environment Availability — **`RESEND_API_KEY` is already live in `.env.local`** (contradicts CONTEXT.md's read of the tree); § Pitfall 6 — Gmail **Android** clips well below the 102KB desktop threshold |
</phase_requirements>

---

## Summary

This phase has an unusually favourable research profile: **it introduces no new dependency, no new
service, no schema change and no new external integration.** Everything it needs is already installed,
already generated, already gated. `resend@6.12.4` is present, `THEME_TOKENS` is generated and
drift-checked, `PanelCard`/`PageHeader`/`PanelSkeleton` are shipped, `BOOKING_SHELL` exists, and
`src/lib/**` already sits outside the DS-13 leak gate *by an explicit, tested exclusion*. The
15-UI-SPEC is approved and prescriptive to the level of individual pixel constants and byte-identical
copy. The genuine risk in this phase is therefore **not** "what should we build" — it is **"what will
silently break while we build it."**

Research found four things a plan author would otherwise walk into. **(1)** The canonical Outlook-safe
email boilerplate everybody reaches for — the XHTML DOCTYPE and `xmlns="http://www.w3.org/1999/xhtml"` —
would silently break three shipped auth tests, because `mockResend.lastLink()` returns the **first**
`https?://` match in the body and those tests feed it to `new URL(...)` to extract a reset token.
**(2)** `auth-login` is **already** a declared baseline surface *and* one of only four
`THEME_SWAP_SURFACES` (D-138's fixed theme-contract set) — with two committed PNGs and a hook
(`[data-testid="site-header"]`) that the spec's own `PublicHeader` removal deletes from the page. The
spec's inventory arithmetic (37→42 surfaces, 66→76 rows) is consequently wrong; the true figures are
**37→41 and 66→74, plus one edited row**. **(3)** The design-test config deliberately loads **no**
`setupFiles`, so the global `vi.mock("resend")` does not exist there — the EMAIL-02 hex gate must
therefore assert against a **pure exported renderer**, not a captured send, which is the same shape
`renderOpsAlertDigest` already uses for its PII assertion. **(4)** `RESEND_API_KEY` is **already set
and uncommented** in `.env.local`, so the dev server currently *sends real mail* rather than logging
it — good for the EMAIL-03 walk, a live-delivery trap for anyone exercising auth flows in dev.

The email half is a pure-function refactor of one 688-line module behind an unchanged `send()`
signature; the app half is a pattern-adoption pass over five files whose own docblocks already argue
for exactly the changes the spec prescribes. Both halves are proved by tests that must pass
*unmodified* — which makes the plan's hardest job bookkeeping, not construction.

**Primary recommendation:** Build the shell as a **pure, exported, dependency-free renderer**
(`EmailContent → { html, text }`) in its own module under `src/lib/`, reading its palette lazily from
`THEME_TOKENS[DEFAULT_THEME]` at call time with `DEFAULT_THEME` relocated to a pure module; emit **zero
absolute `http(s)` URLs before the CTA href** (no XHTML DOCTYPE, no `xmlns`); and treat the visual-
baseline inventory as an **edit-plus-add** operation, not an add-only one.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Email HTML/text rendering | **Node server library** (`src/lib/**`) | — | Pure string construction. No React, no DOM, no request context. Must be importable by Inngest functions, server actions **and** a DB-free Vitest design config — which rules out any client-module or `server-only` dependency in its graph |
| Email colour resolution (EMAIL-02) | **Node server library** (reads `src/lib/design/tokens.generated.ts`) | — | The generated module is already pure and isomorphic. The email tier reads hex; the app tier reads CSS custom properties. One generator, two consumers |
| The product-theme name (`DEFAULT_THEME`) | **Pure shared module** (new) | Client (`theme-provider.tsx` re-exports) | Currently a `"use client"` export with zero server readers. The email tier is the first server reader; a shared pure owner is the only way to have "one owner, two readers" without dragging `next-themes` into the Inngest graph |
| Email delivery | **Resend (external)** via the existing private `send()` | — | Unchanged. The shell slots *beneath* `send()`; no trigger, subject, recipient or call site moves |
| Send triggering | **Inngest functions + `auth.ts` fire-and-forget** | — | **Untouched by construction** (D-83 / SC#3). Research confirms 8 consumer modules import `src/lib/email`; none needs an edit |
| Auth screen composition | **Next.js route-group layout** (`(auth)/layout.tsx`) | Page components | D-162 puts the wordmark above the card, i.e. in the layout, so it is present in every state including the error boundary. The `<main>` landmark belongs here for the same reason |
| Auth security gates | **Per-page `getSession()` + `src/middleware.ts`** | — | Explicitly *not* the layout (the layout's own docblock says so). Removing `PublicHeader` moves no security boundary |
| Profile save state | **Client component** (`profile-form.tsx`) + **server action** | — | Restyled around, never rewritten. The state machine is the repo's reference truthful-save model (14-CONTEXT D-150 copied it) |
| Visual baseline capture | **GitHub Actions (`baselines.yml`, `workflow_dispatch` only)** | — | Verified: the only thing in the repo that may write a baseline, and it is manual-dispatch-only. **Cannot be run locally on this Windows machine** — an operator step, not a task step |

---

## Project Constraints (from CLAUDE.md)

| Directive | Source | Effect on this phase |
|---|---|---|
| Start work through a GSD command; no direct repo edits outside a GSD workflow | `~/CLAUDE.md` + repo `CLAUDE.md` | Execution proceeds via `/gsd:execute-phase`; research writes only `15-RESEARCH.md` |
| **PostgreSQL / Drizzle / exclusion-constraint stack** | repo `CLAUDE.md` § Technology Stack | **Not reached.** PROJECT D-136 binds zero migrations; `drizzle/` is asserted unchanged (UI-SPEC GATE-NOREG #12) |
| **Never store local/naive timestamps; `timestamptz` + `@date-fns/tz` at the edges** | repo `CLAUDE.md` § What NOT to Use | Relevant only to `formatMemberSince` on `/profile`, which is **untouched**. The email shell formats no times — every send receives a **pre-composed** `whenLabel` (verified in `email.ts`'s contract header) |
| **Do not roll your own calendar/date-picker** | repo `CLAUDE.md` | Not reached; no Phase-15 surface renders a calendar |
| **Type safety end-to-end for a money-handling marketplace** | repo `CLAUDE.md` | `sendRefundIssued` interpolates `ALL_RAILS_REFUND_WINDOW` and `sendOpsAlertDigest` carries money-alert rows — both keep their existing type-level PII/disclosure contracts (see § Security Domain) |
| Zero third-party shadcn registries | `components.json` (re-verified 2026-08-24) | Holds — this phase fetches no block |

**No project skills directory exists.** `.claude/skills/`, `.agents/skills/`, `.cursor/skills/`,
`.github/skills/` and `.codex/skills/` are all absent — verified 2026-08-24.

---

## Standard Stack

### Core — everything required is already installed

| Library | Installed version | Purpose | Why standard |
|---------|-------------------|---------|--------------|
| `resend` | **6.12.4** [VERIFIED: `node_modules/resend/package.json`] | The transport. `emails.send({ from, to, subject, html, text })` | Already the sole transport; D-66 forbids adding another email stack |
| `next` | 16.2.7 [VERIFIED: package.json] | App Router; `(auth)` route group + layout | Shipped |
| `react` | 19.2.7 [VERIFIED] | Auth/profile components | Shipped |
| `vitest` | 4.1.8 [VERIFIED] | Unit + design gates (two disjoint configs) | Shipped |
| `@playwright/test` | 1.60.0 [VERIFIED: `npx playwright --version`] | 320px, e2e and visual baselines | Shipped |
| `next-themes` | 0.4.6 [VERIFIED] | The theme runtime — **relevant only as the current home of `DEFAULT_THEME`** | Shipped |
| `tailwindcss` | 4.3.0 [VERIFIED] | App surfaces only. **The email shell uses zero Tailwind** | Shipped |

### Supporting — repo-internal modules this phase consumes

| Module | Purpose | Verified fact |
|--------|---------|---------------|
| `src/lib/design/tokens.generated.ts` | EMAIL-02's only colour source | `THEME_TOKENS: Record<"court" \| "grove", Record<string, TokenValue>>`; `TokenValue = { oklch, hex }`. All **seven** required keys present, and all seven hex values **distinct within each theme** (checked both) — so a "set equals exactly seven values" assertion is well-formed |
| `src/lib/site.ts` | `SUPPORT_EMAIL` (`string \| null`, currently `null`) + `SITE_TAGLINE` | Pure/isomorphic, no `server-only` guard, explicitly documented as safe for any consumer |
| `src/lib/design/measurements.ts` | `BOOKING_SHELL = "mx-auto w-full max-w-2xl px-4 py-8 sm:py-12"` | Verified at line 402; already adopted by `bookings/[id]/cancel` and `.../group` page+plate pairs |
| `src/components/patterns/panel-card.tsx` | The card container | `titleAs?: "h2" \| "h3"`, default `"h2"` — the spec's `"h1"` union widening is a genuine one-member extension |
| `src/components/patterns/page-header.tsx` | `/profile`'s `<h1>` | Renders `<h1 className="text-xl font-semibold tracking-tight">`, props `{ title, lede?, actions? }` |
| `src/components/patterns/site-chrome.tsx` | `BRAND_CLASS` | **`const`, NOT exported**, at line 95. Exporting it is a required (and spec-sanctioned) edit |

### Alternatives Considered

| Instead of | Could use | Tradeoff — and why it is rejected here |
|------------|-----------|----------------------------------------|
| Hand-built table markup | React Email / MJML / Handlebars | **Forbidden by name** — D-66, restated by the ROADMAP constraint block and by 15-UI-SPEC § Registry Safety. Not a live option |
| Lazy `THEME_TOKENS[DEFAULT_THEME]` read at call time | Module-level `const PALETTE = THEME_TOKENS[DEFAULT_THEME]` | The module-level form is marginally faster and **cannot satisfy AC#18** ("flipping the owner to `grove` in a test scope flips every rendered hex"), because the value is frozen at import. Use the call-time read, or an optional theme parameter defaulting to the owner |
| Relocating `DEFAULT_THEME` to a new pure module | Importing it from `theme-provider.tsx` | The provider is `"use client"` and imports `next-themes` at module top level. Importing it into `src/lib/email.ts` drags a React-context library into the Inngest and design-test graphs for one string literal. **Relocate + re-export** (see § Pitfall 3) |
| Asserting the hex set on a pure renderer | Asserting it on a captured `mockResend` send | The design config loads **no** `setupFiles`, so `vi.mock("resend")` is absent there. A send-based gate cannot run inside `npm run build` (see § Pitfall 4) |

**Installation:** *(none — this phase installs nothing)*

```bash
# Deliberately empty. Zero new packages. Verified: every module this phase needs is already
# present in package.json or in src/.
```

---

## Package Legitimacy Audit

**This phase installs ZERO external packages.** The Package Legitimacy Gate is therefore **not
applicable** and no `slopcheck` run is required.

| Package | Registry | Disposition |
|---------|----------|-------------|
| *(none)* | — | **No installs in this phase** |

**Packages removed due to slopcheck `[SLOP]` verdict:** none — nothing was proposed.
**Packages flagged as suspicious `[SUS]`:** none.

> **This is a hard constraint, not an observation.** 15-UI-SPEC § Registry Safety names the exact
> package a plan author will be tempted by ("a React Email / MJML starter for the shell") and refuses
> it under D-66. **A Phase-15 plan containing an `npm install` line has misread the phase.** If a plan
> proposes one, that is a blocker for plan-check, not a discretionary call.

---

## Architecture Patterns

### System Architecture Diagram

```
                    ┌─────────────────── TRIGGER TIER (UNTOUCHABLE — SC#3 / D-83) ─────────────────┐
                    │                                                                              │
  auth.ts ──void──> │  sendVerificationEmail / sendResetPassword                                   │
                    │                                                                              │
  Inngest           │                                                                              │
   notify.ts ─────> │  sendForType → 15 booking/request/cancel/reminder/group sends                │
   guest-email.ts ─>│  sendGuestRsvpEmail  (2 body variants → 2 send() calls)                      │
   ops-digest.ts ──>│  sendOpsAlertDigest                                                          │
                    └──────────────────────────────┬───────────────────────────────────────────────┘
                                                   │  19 exported senders · 20 send() call sites
                                                   │  (subjects · recipients · args BYTE-IDENTICAL)
                                                   ▼
                            ┌──────────── each sender composes ────────────┐
                            │        EmailContent  (the ONE derivation)    │
                            │  { preheader? · heading · paragraphs[]       │
                            │    cta? {label, href} · tableHtml? tableText?}│
                            └────────────────────┬─────────────────────────┘
                                                 │
                                 ┌───────────────▼────────────────┐
                                 │   renderEmail(content)         │   ◄── PURE. No I/O. No React.
                                 │   ── the ONE choke point ──    │       No `server-only`. No DOM.
                                 └───┬────────────────────────┬───┘
                    escapeHtml() ────┤                        ├──── raw strings (text/plain)
                    on heading,      │                        │
                    paragraphs,      ▼                        ▼
                    cta.label,   ┌────────┐              ┌────────┐
                    cta.href,    │  html  │              │  text  │
                    AND the      │        │              │        │
                    DERIVED      │ 600px  │              │heading │
                    preheader ◄──┤ table  │              │paras   │
                    (§ Pitfall 2)│ shell  │              │label:  │
                                 └───┬────┘              │ raw url│
                                     │                   └───┬────┘
              palette read LAZILY ───┤                       │
              THEME_TOKENS[          │                       │
                DEFAULT_THEME ]      │                       │
              → exactly 7 hex ───────┘                       │
                                     │                       │
                                     └───────────┬───────────┘
                                                 ▼
                             ┌──────────────────────────────────────┐
                             │  private send(to, subject, html,     │
                             │               text)                  │
                             │                                      │
                             │  if (!resend):                       │
                             │    prod  → console.error, NO link  ──┼─► WR-02 guard
                             │    dev   → console.log full html     │   AST-UNCHANGED
                             │  else:                               │
                             │    resend.emails.send({from,to,      │
                             │      subject, html, text})           │
                             └──────────────────┬───────────────────┘
                                                ▼
                                       Resend 6.12.4  ──►  account-owner inbox only (D-160)
                                                            │
                              ┌─────────────────────────────┴──────────────────────────┐
                              ▼                ▼                 ▼                     ▼
                        Gmail web       Gmail Android      Apple Mail            Outlook desktop
                        (~102KB clip)   (LOWER clip —      (+ dark walk)         DECLARED BLOCKED
                                         § Pitfall 6)                             (D-163)
```

**How to read this:** the trigger tier is frozen — nothing above the `EmailContent` line moves. The
only new component is `renderEmail`, and it sits *between* the senders and the unchanged `send()`.
`escapeHtml` moves from 19 scattered call sites to one choke point **without being deleted from
`renderOpsAlertDigest`**, whose output enters through the pre-escaped `tableHtml` slot.

### Recommended Project Structure

```
src/lib/
├── email.ts                    # 19 senders + private send(). Loses its inline markup,
│                               #   keeps its signatures, its docblocks and its WR-02 guard.
├── email-shell.ts              # NEW. renderEmail(content) → { html, text }. PURE.
│                               #   Zero imports outside tokens.generated + site + the theme owner.
├── design/
│   ├── tokens.generated.ts     # UNTOUCHED (token-drift.test.ts passes with zero edits)
│   └── theme.ts                # NEW (or equivalent). The pure home of THEMES / ThemeName /
│                               #   DEFAULT_THEME / THEME_STORAGE_KEY. See § Pitfall 3.
└── site.ts                     # UNTOUCHED (SUPPORT_EMAIL stays null — D-161)

src/components/theme/
└── theme-provider.tsx          # re-exports from design/theme.ts so its 8 existing importers
                                #   (1 app, 2 client, 1 design test, 5 e2e files) need ZERO edits

src/app/(auth)/
├── layout.tsx                  # the composition: <main> + bg-muted + wordmark + column
├── error.tsx                   # UNCHANGED
└── {login,signup,forgot-password,reset-password}/page.tsx   # raw <Card> → PanelCard titleAs="h1"

src/app/(app)/profile/
├── page.tsx                    # BOOKING_SHELL + PageHeader
├── loading.tsx                 # BOOKING_SHELL + PageHeader + TWO PanelSkeletons
└── profile-form.tsx            # restyled AROUND; state machine byte-identical in behaviour

scripts/
└── send-email-previews.ts      # NEW, dev-only harness for the EMAIL-03 walk (a harness,
                                #   NOT a trigger — lives outside src/app, moves no call site)
```

### Pattern 1: One derivation, two projections (the anti-drift shape)

**What:** A single `EmailContent` value is projected into HTML *and* plain text by one function. No
send authors a second copy of any string.
**When to use:** Always. This is the spec's contract and the reason a plain-text part cannot drift.
**Why it matters here:** the repo already learned this lesson twice — the week-strip, and
`ALL_RAILS_REFUND_WINDOW` (a booker's screen and their inbox stating different refund windows was
graded *"a disclosure defect on a money path, not a copy nit"* in `email.ts`'s own docblock).

```typescript
// Source: 15-UI-SPEC § The content type; shape verified against the 19 senders in src/lib/email.ts
type EmailContent = {
  preheader?: string;   // DEFAULT: first sentence of the text part — so it cannot drift
  heading: string;      // RAW in; renderer escapes for HTML, verbatim in text
  paragraphs: string[]; // RAW in; renderer escapes for HTML, verbatim in text
  cta?: { label: string; href: string };
  tableHtml?: string;   // PRE-ESCAPED. Ops digest ONLY. Requires tableText alongside.
  tableText?: string;
};
```

### Pattern 2: Escaping as structure, not as discipline

**What:** `renderEmail` HTML-escapes every interpolated string at one place. A send *cannot* forget.
**Current state (verified):** all 19 senders call `escapeHtml` per field, correctly, today — 100%
compliance maintained by review discipline across ~20 call sites and four phases. Moving it to a choke
point converts that discipline into a structural guarantee.
**Critical addition research found:** the **derived preheader** is a fifth escape site the spec's
escaping sentence does not name (it lists heading, paragraphs, CTA label, CTA href). Because the
preheader defaults to the first sentence of the *raw* text part and is injected into HTML, it **must**
be escaped. See § Pitfall 2.

### Pattern 3: Lazy palette read (what makes AC#18 achievable)

```typescript
// Source: verified against src/lib/design/tokens.generated.ts (THEME_TOKENS shape)
// The read is INSIDE the function, not at module scope — a module-scope const is frozen at
// import time and AC#18's "flip the owner in a test scope" becomes impossible to satisfy.
function palette(theme: ThemeName = DEFAULT_THEME) {
  const t = THEME_TOKENS[theme];
  return {
    ground: t["--muted"].hex,
    surface: t["--card"].hex,
    ink: t["--foreground"].hex,
    quietInk: t["--muted-foreground"].hex,
    rule: t["--border"].hex,
    accent: t["--brand"].hex,
    accentInk: t["--brand-foreground"].hex,
  };
}
```

> ⚠ `tsconfig.json` sets `strict: true` but **not** `noUncheckedIndexedAccess` [VERIFIED]. So
> `t["--brnad"]` (a typo) **compiles**, yields `undefined`, and renders the literal string
> `"undefined"` into a style attribute. The EMAIL-02 hex-set gate catches this — the rendered set
> gains a non-hex member — which is a good reason to write that gate **before** the seventh token is
> wired, not after.

### Anti-Patterns to Avoid

15-UI-SPEC § Anti-Patterns is the authoritative list and is not repeated here. Research adds three
that are specific to *how this repo's tests are wired*:

- **Emitting an XHTML DOCTYPE or `xmlns` in the shell.** Standard advice; **breaks three shipped auth
  tests** here. See § Pitfall 1.
- **Putting the EMAIL-02 gate in `tests/design/**` while asserting on a captured send.** The design
  config has no `setupFiles`, so `vi.mock("resend")` is not installed there. See § Pitfall 4.
- **Treating the visual-baseline change as add-only.** `auth-login` already exists, is already
  committed as two PNGs, and is one of the four theme-contract surfaces. See § Pitfall 5.

---

## Don't Hand-Roll

| Problem | Don't build | Use instead | Why |
|---------|-------------|-------------|-----|
| HTML escaping | A second escaper, a regex, or a "this string is safe" convention | The **existing** `escapeHtml` in `email.ts`, moved to the choke point | It is named untouchable by the ROADMAP; `tests/auth/email-escaping.test.ts` must pass with **zero edits**; the five-character replacement chain is already correct and reviewed |
| Colour literals in email | Any hand-typed hex, any `rgb()`, any colour name | `THEME_TOKENS[DEFAULT_THEME][key].hex` | DS-12 exists *because* a hand-typed coral drifted from `--brand` and nothing in the repo could tell. `src/lib/**` is outside the leak gate — the gate that would have caught it cannot reach here, so discipline is the only guard and a generated read removes the need for discipline |
| The product theme name | `"court"` typed into `email.ts` | The one `DEFAULT_THEME` owner | Explicitly the drift EMAIL-02 exists to prevent (15-UI-SPEC § Anti-Patterns) |
| The support address | A placeholder, a "coming soon", an unguarded `mailto:` | `SUPPORT_EMAIL !== null` guard, no else-branch | D-64/D-161. `tests/design/site-contacts.test.ts` scans **all of `src/`** (not just app/components — the widening is deliberate and documented) and will find an unguarded `mailto:` in `src/lib/` |
| The tagline | Retyping "Book gyms, courts and studios by the hour." | `import { SITE_TAGLINE }` | One sentence, one owner; `scaffold-residue.test.ts` pins its value via `metadata.description` |
| The card container | An extracted `AuthCard` or a fifth boxed shape | `PanelCard` × 4 call sites | DS-11 says three containers; `card-pattern-coverage.test.ts` has an inverse half that fires on a brand-new card file even when all named surfaces are correct |
| The page shell | A new `PROFILE_SHELL` constant, or retyping the classes | `BOOKING_SHELL` | Already the shared owner for the two other booker page+plate pairs |
| Plain-text generation | `html.replace(/<[^>]+>/g, "")` or any HTML-stripper | Project `EmailContent` directly to text | A stripper re-introduces the drift the one-derivation pattern exists to remove, and would emit escaped entities (`&amp;`) into `text/plain`, which is a defect |
| A preview/dev harness | A new route, a new trigger, a `void sendX()` call | A `scripts/*.ts` file run with `tsx` | D-83 forbids a second dispatcher. A script outside `src/app` moves no call site — the spec explicitly sanctions this shape |

**Key insight:** every "don't hand-roll" item here is defended by a *test that already exists*. This
phase's custom-solution risk is not that a hand-rolled thing would be worse — it is that a hand-rolled
thing turns a green gate red in a file the phase was told not to edit.

---

## Runtime State Inventory

> Included because EMAIL-01 is a refactor of a shipped module and the auth pass changes rendered
> output that other systems have already recorded.

| Category | Items found | Action required |
|----------|-------------|-----------------|
| **Stored data** | **None.** No database row stores email markup, a theme name, or an auth-screen string. Rendered email bodies are not persisted — `notification` rows carry a type + payload, not HTML (verified: `notify.ts` dispatches by type; `email.ts` receives pre-composed labels). PROJECT D-136 binds zero migrations | **None** — verified by reading the notify dispatcher and confirming `drizzle/` is asserted unchanged (GATE-NOREG #12) |
| **Live service config** | **Resend account (external):** in test mode under D-160, delivery is restricted to the account-owner inbox. No domain, no DNS, no verified sender — deliberately (D-160). **No** dashboard-side template, webhook or suppression config exists to update | **None in-phase.** Deferred item: domain purchase + verification, which is DNS + one env var |
| **OS-registered state** | **None.** No Windows Task Scheduler entry, no pm2 process, no launchd/systemd unit references email markup or the auth screens | **None** — verified: `package.json` scripts are all foreground npm/tsx invocations; the only scheduled send is the Inngest ops-digest cron, which is code, not OS state |
| **Secrets / env vars** | **`RESEND_API_KEY` — present, uncommented, with a value in `.env.local`** [VERIFIED, value not read]. **`EMAIL_FROM` — absent**, so `FROM` uses the sandbox fallback exactly as D-160 describes. **`BETTER_AUTH_URL`** feeds `APP_URL` for the one CTA without a caller-supplied link | **No key renames.** ⚠ Consequence: the dev server **sends real mail** today rather than logging. See § Pitfall 7 |
| **Build artifacts / committed binaries** | **30 committed baseline PNGs** in `e2e/visual/surfaces.spec.ts-snapshots/`, including `auth-login-320-court-visual-linux.png` and `auth-login-1280-court-visual-linux.png` [VERIFIED by listing]. Both become stale the moment `PublicHeader` leaves the `(auth)` layout | **Regeneration required**, and it **cannot be done on this machine**: `.github/workflows/baselines.yml` is `workflow_dispatch`-only and is documented as *"THE ONLY THING IN THIS REPOSITORY THAT CAN WRITE A VISUAL-REGRESSION BASELINE"*. This is an **operator step**, not a task step |

---

## Common Pitfalls

### Pitfall 1 — The standard Outlook boilerplate silently breaks three shipped auth tests ⚠ HIGHEST RISK

**What goes wrong:** The plan adds the canonical email-safe document preamble —

```html
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN"
  "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
```

— and `tests/auth/login-reachable-after-reset.test.ts`, `tests/auth/reset-revokes-sessions.test.ts`
and `tests/auth/stale-session-selfheal.test.ts` all start failing with a confusing "invalid token"
error rather than anything that names the cause.

**Why it happens:** `tests/helpers/mocks.ts` extracts the reset link like this [VERIFIED, quoted]:

```typescript
const body = `${email.html ?? ""} ${email.text ?? ""}`;
const match = body.match(/https?:\/\/[^\s"'<>)]+/);
return match ? match[0] : null;
```

It returns the **first** `http(s)` URL in the concatenated body. The three tests feed that to
`tokenFromLink`, which does `new URL(link)` then `searchParams.get("token") ?? url.pathname.split("/").pop()`.
Handed `http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd`, `new URL` **succeeds**, there is no
`token` param, and the fallback returns `"xhtml1-transitional.dtd"` as the reset token. The failure
surfaces three layers away from its cause.

**How to avoid:** **Emit no absolute `http(s)` URL anywhere before the CTA href.** Concretely:
- `<!DOCTYPE html>` (HTML5, no PUBLIC identifier) — not the XHTML transitional doctype.
- `<html lang="en">` — no `xmlns` attribute. (`xmlns:v="urn:schemas-microsoft-com:vml"` and
  `xmlns:o="urn:...:office"` are `urn:` schemes and would *not* match the regex, but they are only
  needed for VML backgrounds, which the spec forbids anyway — zero images.)
- The wordmark is **text, not a link** (15-UI-SPEC § The 600px skeleton renders it as a text block).
  Linking it to `APP_URL` would put an app URL ahead of the CTA and reproduce the same failure.
- No footer links, no "view in browser" link, no tracking pixel.

**Warning signs:** any of the three named tests failing with a token/session error while
`email-escaping.test.ts` stays green. That combination means the body renders and escapes correctly
but `lastLink()` is pointing at the wrong URL.

**Secondary note:** hardening `extractLink` is *also* a valid fix and is not forbidden by any
"zero edits" rule (those name `email-escaping.test.ts` and the trigger-graph assertions specifically,
not `tests/helpers/mocks.ts`). But it is the weaker fix: it repairs the probe rather than the
property, and a linked wordmark would still put an app URL where a mail client's "first link"
heuristics can find it. Prefer the construction rule; treat the helper edit as a fallback the plan
records rather than takes by default.

---

### Pitfall 2 — The derived preheader is an unnamed escape site

**What goes wrong:** The preheader defaults to "the first sentence of the text part". The text part
holds **raw**, unescaped strings by design (escaping `text/plain` would be a defect — the spec says
so). That raw string is then injected into an HTML `<div>`. If it is not escaped on the way in, the
shell has a fresh injection sink in the one place nobody looks.

**Why it happens:** 15-UI-SPEC § The content type enumerates the escape targets as "`heading`, every
paragraph, the CTA label and the CTA href". The preheader is derived *after* that list and is easy to
read as already-covered — it is not, because it is derived from the **text** projection, not the HTML one.

**How to avoid:** derive the preheader from the content, then run it through the same `escapeHtml`
before it enters the `<div>`. In practice: derive from `content.heading` (or the first paragraph) and
escape, rather than from the already-assembled text string. The new all-sender injection probe
(AC#16) will catch a miss **only if** it inspects the whole HTML document including the preheader div
— write it that way.

**Warning signs:** the injection probe passes for the CTA and body but the raw payload appears in the
first ~150 characters of the rendered HTML.

**Related, verified:** the preheader's hiding recipe conventionally includes `color: #ffffff`
[CITED: emailonacid.com, litmus.com]. **Do not type that hex.** `--card` is `#ffffff` in court and
`#ffffff` in grove, so reading it from `THEME_TOKENS` produces the identical output *and* keeps the
EMAIL-02 seven-value assertion true. A hand-typed `#ffffff` produces an eighth literal and fails AC#18.

---

### Pitfall 3 — `DEFAULT_THEME` lives in a `"use client"` module with zero server readers

**What goes wrong:** `src/lib/email.ts` imports `DEFAULT_THEME` from
`@/components/theme/theme-provider`, and a React-context library (`next-themes`) plus a `"use client"`
boundary enter the import graph of every Inngest function and every DB-free design test that touches
email.

**Why it happens:** the spec permits the direct import as the first option ("If importing it from the
client module into server code proves impractical..."). Research measured it: **`theme-provider.tsx`
has no server-side reader today.** Its importers are `src/app/layout.tsx` (the provider component
itself), two client components (`favicon-swap.tsx`, `theme-query-param.tsx`), one design test, and
five e2e files [VERIFIED by grep]. The email module would be the first, and it would be importing
*through* a `"use client"` directive and a top-level `import { ThemeProvider as NextThemes } from "next-themes"`.

**How to avoid:** take the spec's second option immediately — **move `THEMES` / `ThemeName` /
`DEFAULT_THEME` / `THEME_STORAGE_KEY` to a pure module** (e.g. `src/lib/design/theme.ts`) and have
`theme-provider.tsx` **re-export** them. Because all eight existing importers name the same symbols
from the same path, a re-export keeps every one of them compiling with **zero edits** — including the
five e2e files and `tests/design/theme-provider.test.tsx`.

**Warning signs:** a design test failing at module resolution; `next-themes` appearing in an Inngest
function's bundle; or (worse) nothing failing, and a client library shipping in the server graph unnoticed.

**Do NOT** solve this by adding the theme name to `tokens.generated.ts` — that file is generated, and
`token-drift.test.ts` must pass with zero edits (AC#19).

---

### Pitfall 4 — The design config loads no `setupFiles`, so the Resend mock does not exist there

**What goes wrong:** the EMAIL-02 hex gate is written in `tests/design/` (correct — it is a design
gate and belongs in the build-blocking suite), asserts on `mockResend.last()?.html`, and fails because
`mockResend` was never installed.

**Why it happens:** `vitest.design.config.ts` deliberately declares **no `globalSetup` and no
`setupFiles`** [VERIFIED, and the file's own docblock says *"Adding either one — even 'just to share a
helper' — silently reintroduces the Docker dependency"*]. The global `vi.mock("resend", ...)` lives in
`tests/setup.ts`, which only the **main** config loads. The main config in turn requires a live
`fitout_test` Postgres via `globalSetup`.

**How to avoid:** **assert on a pure exported renderer, not on a captured send.** Export `renderEmail`
(and, if useful, a fixture-driven `renderAllSends()` helper) so a design test can call it directly.
This is exactly the shape `renderOpsAlertDigest` already uses, and its docblock states the reason
verbatim: *"exported on purpose: the PII assertion reads this body DIRECTLY rather than only through
the transport, so the guarantee is pinned at the point the string is built."* Follow that precedent.

**Verified as safe:** the import chain is DB-free. `src/lib/email.ts` imports only `resend` and
`@/lib/booking/refund-window`, which imports `@/lib/payments/refund-rail`, which imports **nothing**
[VERIFIED]. `new Resend(key)` is only constructed when `RESEND_API_KEY` is set, and constructing it
performs no I/O. So a design test *can* import the email module — but a **shell module with no
`resend` import at all** is cleaner still and is what the structure above recommends.

**Split rule for the planner:**
- `tests/design/**` — the hex-set gate, the shell's structural assertions (one preheader, one 600px
  table, zero flex/grid/img/class/`<style>`), the typography-size gate, the footer-guard gate. All
  pure. All run inside `npm run build`.
- `tests/auth/**`, `tests/booking/**`, `tests/notifications/**` — the escaping regression, the
  all-sender injection probe, the html/text parity assertion, the trigger-graph assertions. These
  need `mockResend` and therefore the main config (and Docker).

---

### Pitfall 5 — `auth-login` already exists; the baseline arithmetic is add-**and-edit**, not add-only

**What goes wrong:** the plan appends five surfaces and ten rows per 15-UI-SPEC's inventory table,
moves the count alias to 76, and `npx tsc --noEmit` fails on a type-level assertion whose error names
only the alias's own line — the documented weakness of that gate.

**Why it happens:** 15-UI-SPEC § Inventories states *"`VISUAL_BASELINES` **66 → 76 rows expected**"*
and *"`SURFACE_IDS` 37 → 42"* — and then, correctly, hedges: *"**Measure the file's real counts before
moving the aliases**."* Research did the measurement:

| Fact | Measured value |
|---|---|
| `SURFACE_IDS.length` | **37** [VERIFIED by parse] |
| `VISUAL_BASELINES.length` | **66** [VERIFIED by parse; alias `BaselineCountIsSixtySix` confirms] |
| `auth-login` in `SURFACE_IDS`? | **YES** — already declared |
| `auth-login`'s existing rows | **2** — 320 and 1280, court, `blocked: null` |
| `auth-login`'s existing hook | **`[data-testid="site-header"]`** |
| `auth-login` in `THEME_SWAP_SURFACES`? | **YES** — it is one of the fixed four (`search-results`, **`auth-login`**, `terms`, `root-not-found`), pinned by `ThemeContractSurfaceCountIsFour` |
| Committed PNGs for it | **2** — `auth-login-{320,1280}-court-visual-linux.png` |
| Is there a `SURFACE_IDS` count alias? | **No** — only `BaselineCountIsSixtySix`, `ThemeSwapExclusionCountIsOne`, `ThemeContractSurfaceCountIsFour` exist |

**Corrected arithmetic:**

| Inventory | Spec said | Measured truth |
|---|---|---|
| `SURFACE_IDS` | 37 → 42 | **37 → 41** (+4: `auth-signup`, `auth-forgot`, `auth-reset`, `profile`. `auth-login` is already there) |
| `VISUAL_BASELINES` | 66 → 76 | **66 → 74** (+8 = 4 new surfaces × 2 widths) **plus one EDITED row pair** |
| Count alias | `…IsSeventySix` | **`BaselineCountIsSixtySix` → `BaselineCountIsSeventyFour`** |

**And three consequences the spec's table does not carry:**
1. **`auth-login`'s `hook` must change** from `[data-testid="site-header"]` to
   `[data-testid="panel-card"]`. The header is leaving the `(auth)` layout, so the current hook
   selects an element that will not exist and the shot will time out.
2. **`auth-login`'s `hookWhy` prose becomes false.** It currently reads *"`(auth)/layout.tsx` renders
   `PublicHeader` + `SiteFooter`; the header is the composition this baseline exists to pin. It also
   fails loudly if the anonymous session read ever starts reaching the database."* Both sentences stop
   being true — and the second one names a real property (DB-free scope) that the new hook must
   preserve or the row must stop claiming.
3. **`auth-login` is a theme-contract surface.** `e2e/visual/theme-swap.spec.ts` compares its court
   and grove renderings and pins the *members* of `THEME_SWAP_SURFACES`, not just the count. The auth
   composition rewrite therefore lands on one of only four surfaces that carry the two-theme drift
   check. Keeping `auth-login` in that set is the right call (its ground, card, ink and one accent are
   all tokens), but the plan must state it deliberately rather than discover it.

**How to avoid:** treat the baseline work as *edit two rows, add eight, move one alias* and write the
arithmetic into the plan. Note also that `theme-swap.spec.ts` lives in the `visual` Playwright
project, which `playwright.config.ts` **does not construct off Linux** — so it never executes on this
machine and its red would only appear in CI.

**Warning signs:** `npx tsc --noEmit` exiting 2 with a single `TS2344: Type 'false' does not satisfy
the constraint 'true'` line pointing at `visual-baselines.ts` — that is the count alias and nothing else.

---

### Pitfall 6 — Gmail **Android** clips far below the 102KB desktop threshold

**What goes wrong:** M3 measures the ops digest against ~102KB, passes, and the walk then finds the
message clipped in the Gmail Android app — one of the three clients D-163 makes available, and
therefore a real EMAIL-03 row rather than a hypothetical.

**Why it happens:** the 102KB figure is the **desktop** Gmail threshold. Mobile Gmail clips lower —
reported around ~20KB on the iOS app and ~75KB on other mobile clients, inconsistently applied
[CITED: emailtooltester.com; litmus.com]. The limit counts **raw HTML bytes** (text, style attributes,
URLs), not images — and an inline-styled table shell is byte-expensive by construction: every cell
repeats its font stack and colour declarations.

**How to avoid:**
- Measure M3 against the **Gmail Android** threshold, not the desktop one — that is the strictest
  client in D-163's available set.
- Declare the shell's font stack and repeated declarations as few times as correctness allows (the
  spec already says "declared ONCE in the shell, never per send" for the font stack — that constraint
  is a size decision as much as a consistency one).
- The fix for an over-size digest is trimming shell whitespace, **never** trimming the table's content
  (the spec is explicit, and D-J3Z-09's honest "N+ unresolved — showing the N newest" line exists
  precisely so a truncated list is never silently rendered as a whole queue).

**Warning signs:** "[Message clipped] View entire message" in the walk. Note this hides the **footer**
and therefore the plain-text link and the (currently absent) support line — i.e. it silently defeats
the parts of EMAIL-01 the phase is being graded on.

**Confidence:** MEDIUM on the exact mobile numbers (secondary sources, inconsistently applied by
Google's own account); HIGH on the direction (mobile clips earlier than desktop) and HIGH on the
102KB desktop figure, which multiple independent sources agree on.

---

### Pitfall 7 — `RESEND_API_KEY` is already live, so dev **sends** rather than logs

**What goes wrong:** a developer exercises signup or password-reset locally to eyeball a screen, and
real mail lands in the PM's inbox. Or: someone reads CONTEXT.md's *"`.env.local` has no
`RESEND_API_KEY` by default — dev logs instead of sending"*, expects `[email:dev]` console output,
sees none, and concludes the shell is broken.

**Why it happens:** CONTEXT.md's § Constraints from the tree describes the historical state.
**Measured 2026-08-24: `.env.local` contains an uncommented `RESEND_API_KEY` with a non-empty value**
[VERIFIED; value not read]. `EMAIL_FROM` is absent, so `FROM` correctly falls back to the sandbox
address exactly as D-160 requires.

**How to avoid / exploit:**
- **Good news for EMAIL-03:** the walk's env prerequisite is already satisfied. The only remaining
  step is a dev-server restart. No env recipe, no tunnel (PayMongo's webhook tunnel is explicitly not
  needed for this walk).
- **For WR-02 work:** `tests/auth/email-dev-fallback.test.ts` sets `NODE_ENV` and asserts on console
  spies with the Resend client mocked — it does **not** depend on the real key, so it is unaffected.
- **Warn in the plan:** any manual dev-server exercise of an auth flow now delivers. If a task needs
  the logging path, it must comment the key out for that task and restore it.

---

### Pitfall 8 — Copy and placeholders that other gates have already declared

**What goes wrong:** the auth restyle "tidies" an input placeholder or a sentence, and a gate in a
file the phase never opened turns red.

**Why it happens:** `tests/design/site-contacts.test.ts` declares an `EXCLUDED_ADDRESSES` map keyed
`file — literal`, and **three of its five rows are auth pages** [VERIFIED]:
`src/app/(auth)/{login,signup,forgot-password}/page.tsx — you@example.com`, each excused as *"the
`placeholder` on the email INPUT."* Changing or removing a placeholder makes its declared row a row
that never fires; adding a placeholder to a fourth file adds an undeclared address-shaped literal.

**How to avoid:** keep the three `you@example.com` placeholders byte-identical. More generally, treat
15-UI-SPEC § Copywriting Contract's "shipped copy, byte-for-byte" as covering placeholders and
`aria-label`s, not only visible sentences.

**Related, verified:** the `EXCLUDED_ADDRESSES` key for the sender is
`"src/lib/email.ts — onboarding@resend.dev"` — **keyed by file and literal, not by line number** — so
reshaping `email.ts` cannot break it as long as the sandbox address stays in that file and stays
singular. That is also exactly what D-160's falsifiable claim ("exactly one occurrence in `src/`")
asks for, and this gate already enforces it.

---

### Pitfall 9 — A comment containing a banned token trips the design greps

**What goes wrong:** the shell's docblock explains its colour choices by naming a hex or a Tailwind
class, and a source-scanning gate flags it.

**Why it happens:** 15-UI-SPEC opens with this warning and states *"Three plans have been burned."*
The repo has a dedicated comment-stripper (`tests/design/strip-comments.test.ts`) whose own cases
record the evasions and hazards it was hardened against — including *"blanks a whole-line comment that
names a class — the CR-03 evasion"*. The stripper protects the app tree; the email shell sits in
`src/lib/`, outside the leak gate's scanned prefixes — but `site-contacts.test.ts` scans **all** of
`src/`, and future gates may too.

**How to avoid:** name tokens **descriptively** in prose — "the quiet-ground token", "the accent
fill", "the muted ink" — never by hex value or class name. This applies to comments inside the email
shell, which the spec calls out by name.

---

### Pitfall 10 — `renderOpsAlertDigest`'s two contracts must survive the refactor

**What goes wrong:** the ops digest is folded into the shell, and either (a) its `escapeHtml` calls
are removed as "now redundant" — but its output enters through the **pre-escaped** `tableHtml` slot,
which the renderer does *not* escape, so removing them creates the injection sink; or (b) it stops
being a pure exported function, and the PII assertion that reads its body directly loses its subject.

**Why it happens:** the module's own header carries a long, explicit contract [VERIFIED, quoted in
part]: the `meta` column is **absent by type** so that re-exporting booking ids / transfer ids /
masked last-4s across the email trust boundary is *"a TYPE ERROR at the renderer rather than something
a reviewer has to notice."* And its docblock explains the export: *"the PII assertion reads this body
DIRECTLY... so the guarantee is pinned at the point the string is built, not merely at the point it is
handed to Resend."*

**How to avoid:** keep `renderOpsAlertDigest` exported and pure; keep its per-field `escapeHtml`;
keep `OpsDigestRow` free of a `meta` field. Split its current output at the natural seam — the two
runbook `<p>` blocks and the truncation note become `paragraphs`; the `<table>` becomes `tableHtml`
with a matching `tableText`. The digest renders **zero** CTAs (15-UI-SPEC § Visual Hierarchy) — the
shell must not add one.

---

## Code Examples

### Verified: Resend v6 accepts `html` and `text` together

The single external-library fact this phase depends on. `send()` gains a `text` parameter and passes
both — and research verified that is type-valid rather than assuming it.

```typescript
// Source: node_modules/resend/dist/index.d.mts (installed resend@6.12.4), lines 236 / 490 / 589
type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> & Partial<Pick<T, Exclude<keyof T, K>>>
}[keyof T];

interface EmailRenderOptions { react: React.ReactNode; html: string; text: string; }

type CreateEmailOptions =
  | ((RequireAtLeastOne<EmailRenderOptions> & CreateEmailBaseOptions) & { template?: never })
  | ((EmailTemplateOptions & CreateEmailBaseOptionsWithTemplate) & {
      react?: never; html?: never; text?: never;   // ← the `never`s belong to the TEMPLATE branch only
    });
```

`RequireAtLeastOne` makes each union member require **one** of `{react, html, text}` and leave the
others `Partial` — so `{ from, to, subject, html, text }` satisfies the `html`-required member with
`text` present and optional. **`html` + `text` together is valid.** The `text?: never` seen on a
casual grep belongs exclusively to the *template* branch (where content comes from a stored template),
which this repo does not use.

### Verified: the test mock already captures `text` — no helper edit needed

```typescript
// Source: tests/helpers/mocks.ts (shipped)
type CapturedEmail = {
  from: string;
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;        // ← ALREADY PRESENT. The html/text parity assertion needs no mock change.
};
```

### The shape of the 19 adopters (verified by enumeration)

19 exported senders, **20** `send()` call sites — `sendGuestRsvpEmail` branches on `kind` and calls
`send` twice, which is why 15-UI-SPEC's adopter table lists it as row 18 "(both variants)".

```
 1 sendVerificationEmail          11 sendRefundIssued
 2 sendResetPassword              12 sendReminderPreExpiry
 3 sendBookingConfirmed           13 sendReminderPreSession
 4 sendRequestReceived            14 sendReminderPreSla
 5 sendRequestApproved            15 sendGroupRsvpReceived
 6 sendRequestDeclined            16 sendGroupRsvpConfirmed
 7 sendNewRequestToHost           17 sendGroupCancelled
 8 sendBookingCancelledByBooker   18 sendGuestRsvpEmail    ← 2 send() calls
 9 sendBookingCancelledByHost     19 sendOpsAlertDigest    ← via pure renderOpsAlertDigest
10 sendHostCancellationRecord
```

Every one of 3–18 already has the identical body shape — `<p><strong>heading</strong></p>` +
`<p>body</p>` + `<p><a href="url">label</a></p>` — which maps onto `EmailContent` mechanically. Rows
1–2 are the outliers (`Verify: <a href="{url}">{url}</a>`), and they are the spec's one acknowledged
copy change.

### The escaping test that must pass with zero edits — and why it will

```typescript
// Source: tests/auth/email-escaping.test.ts (shipped, must not be weakened)
const evil = 'https://fitout.app/reset?token=abc"><script>alert(1)</script>';
await sendResetPassword("victim@example.com", evil);
const html = mockResend.last()?.html ?? "";
expect(html).not.toContain('"><script>');
expect(html).toContain("&quot;");
expect(html).toContain("&lt;script&gt;");
```

**Analysis:** under the shell, the URL stops being the anchor *text* (the label becomes
`Reset password`) but remains the escaped `href`. `&quot;` and `&lt;script&gt;` still appear — inside
the attribute rather than in body text — and the raw payload still appears nowhere. The third case
(`token=abc&amp;redirect=/profile` present, `token=abc&redirect` absent) holds for the same reason.
**Zero edits is achievable** provided the raw href does not leak into the plain-text part *inside the
HTML document* — it does not, because `text` is a separate field the mock stores separately and this
test reads only `.html`.

---

## State of the Art

| Old approach | Current approach | When changed | Impact here |
|---|---|---|---|
| XHTML 1.0 Transitional doctype + `xmlns` on every email | `<!DOCTYPE html>` + `<html lang>` is sufficient for all mainstream clients; the XHTML preamble is legacy cargo | Gradual; universally optional by the mid-2020s | **Decisive** — the legacy form is what breaks three tests here (§ Pitfall 1). The modern form is both correct and safe |
| `<style>` blocks with classes, relying on client CSS support | Inline styles remain the only universally safe mechanism for table-based transactional mail | Unchanged — this is the stable state of the art, not a new development | The spec's "zero `<style>` blocks, zero classes" is current best practice, not conservatism |
| Spacer GIFs, VML backgrounds, image-based wordmarks | Text wordmarks, padding-based spacing, no images at all | Gradual | Aligns exactly with D-127 (no logo asset) — the constraint and the best practice point the same way |
| Authored `prefers-color-scheme` dark palettes in email | Still fragmented; client auto-inversion handles high-contrast dark-on-light best | Ongoing | Supports the spec's "authored: none, asserted: legibility under inversion" posture. Authoring an email dark theme ahead of the app would be a second identity (DSFUT-02 defers dark mode product-wide) |
| Gmail desktop 102KB clip as *the* size limit | Mobile Gmail clips earlier and inconsistently | Long-standing but under-documented | § Pitfall 6 — M3 must measure against the mobile threshold |

**Deprecated / outdated in this context:**
- **React Email / MJML** — not deprecated in the ecosystem, but **forbidden here by D-66** and named
  in 15-UI-SPEC § Registry Safety as the block someone will propose. Treat any mention as a red flag.
- **`mso-hide: all`** — still required for Outlook preheader suppression [CITED: emailonacid.com] and
  therefore *not* an "MSO conditional" in the sense the spec restricts (it is an inline property, not
  a `<!--[if mso]>` block). The spec pre-authorises it by naming it in the preheader mechanics.

---

## Assumptions Log

| # | Claim | Section | Risk if wrong |
|---|---|---|---|
| A1 | Gmail Android's clipping threshold is ~75KB (and iOS ~20KB), i.e. materially below desktop's 102KB | § Pitfall 6 | LOW. The *direction* is well-attested and the mitigation (measure against the strictest available client) is correct regardless of the exact number. If wrong, M3 is merely conservative |
| A2 | Constructing `new Resend(key)` performs no network I/O at import time | § Pitfall 4 | LOW. Standard SDK behaviour and consistent with the module being imported freely today by 8 modules including test files. If wrong, the recommended shell-with-no-resend-import structure sidesteps it entirely |
| A3 | Re-exporting `THEMES`/`ThemeName`/`DEFAULT_THEME`/`THEME_STORAGE_KEY` from `theme-provider.tsx` keeps all 8 existing importers compiling unchanged | § Pitfall 3 | LOW-MEDIUM. Verified that all 8 import by name from that path; a re-export preserves the names. `tests/design/theme-provider.test.tsx` may assert on module shape — the plan should read it before the move |
| A4 | No committed baseline exists for `theme-swap.spec.ts` (its snapshot dir is empty), so the theme-contract check compares within a run rather than against committed PNGs | § Pitfall 5 | LOW. Listed and found empty. Affects only *how loudly* the auth-login rewrite shows up in CI, not whether it must be handled |
| A5 | `notification` rows store a type + payload rather than rendered email markup | § Runtime State Inventory | LOW-MEDIUM. Inferred from `notify.ts`'s `sendForType` dispatch shape and the pre-composed-label contract, not from reading the table DDL. If wrong, stored bodies would be stale after the shell lands — but they are historical records, not re-rendered output, so the impact is cosmetic |

---

## Open Questions (RESOLVED — both closed by the plans, 2026-08-24)

15-UI-SPEC § Open Questions carries five PM-deferrable items (PublicHeader leaving `(auth)`; the
verify/reset CTA labels; `BOOKING_SHELL` on `/profile`; the ops digest wearing the shell; forgot/reset
having no Google button). Those are **not** re-opened here. Research adds two.

1. **Does `auth-login` stay in `THEME_SWAP_SURFACES` after the rewrite?**
   **RESOLVED:** yes — 15-11 states the theme-contract decision deliberately (`auth-login` stays one
   of the four), exactly per the recommendation below.
   - What we know: it is one of the fixed four today, pinned by count *and* by members in
     `theme-swap.spec.ts`. Its new composition (muted ground, card, `--foreground` ink, one `--brand`
     button, `SiteFooter`) is if anything a **better** theme-contract subject than the header-led
     composition it replaces.
   - What's unclear: nothing blocking — but the spec's inventory table omits `THEME_SWAP_SURFACES`
     entirely, so a plan could edit `auth-login`'s row without noticing it is a contract surface.
   - **Recommendation:** keep it in the four, and have the plan say so explicitly with the reason.
     Removing it would need a `THEME_SWAP_EXCLUSIONS` row (currently `[]`, and AC#30 pins it at one
     exclusion) — larger and worse.

2. **Where does the all-sender injection probe live, given it needs 19 fixture argument lists?**
   **RESOLVED:** sender-level in the main config with a shared fixture module, per the recommendation
   below — implemented by 15-04 Task 2.
   - What we know: it needs `mockResend` (main config, Docker) if it drives the senders, but it could
     be pure if it drives `renderEmail` with adversarial `EmailContent` instead.
   - What's unclear: AC#16 says "through **every string parameter of all 19 senders**", which argues
     for the sender-level version and therefore the main config.
   - **Recommendation:** write it at sender level in `tests/auth/` or `tests/notifications/` (main
     config), and additionally assert the choke point in a pure design test. The two are cheap
     together and the sender-level one is what AC#16 actually asks for. The fixture argument lists it
     needs are the same ones `scripts/send-email-previews.ts` needs — **build them once, in a shared
     fixture module, and let both read it.**

---

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---|---|---|
| Node.js | everything | ✓ | v24.13.0 | — |
| `resend` SDK | EMAIL-01 transport | ✓ | 6.12.4 | — |
| `RESEND_API_KEY` | EMAIL-03 real-client walk | ✓ **already set & uncommented in `.env.local`** | — | dev-log fallback (comment the key out) |
| `EMAIL_FROM` | D-160 sender override | ✗ (absent — **correct**) | — | sandbox fallback in `email.ts`, which is D-160's intent |
| Docker | main Vitest config (`globalSetup` preflights `fitout_test`) | ✓ | 29.6.1 | none — required for `tests/auth/**`, `tests/booking/**` |
| Playwright | 320px + e2e + visual | ✓ | 1.60.0 | — |
| Playwright `visual` project | `theme-swap.spec.ts`, `surfaces.spec.ts` | ✗ **not constructed off Linux** (this is Windows) | — | CI only — the visual project never runs on this machine |
| Baseline regeneration | AUTHUI-03 (2 edited + 8 new rows) | ✗ **locally impossible by design** | — | **`.github/workflows/baselines.yml`, `workflow_dispatch` only.** An operator step |
| Gmail web / Gmail Android / Apple Mail | EMAIL-03 | ✓ (PM-stated, D-163) | — | — |
| Outlook desktop | EMAIL-03 | ✗ | — | **DECLARED BLOCKED** (D-163) — recorded honestly, not dressed as coverage |
| ngrok / cloudflared tunnel | — | n/a | — | **Not needed.** The PayMongo webhook tunnel plays no part in the email walk |

**Missing dependencies with no fallback:**
- **Outlook desktop** — blocked by D-163, already decided, recorded as a gap. Not a planning blocker.
- **Local baseline regeneration** — structural (D-27/D-29). The plan must route the 2 edited + 8 new
  baseline rows through a CI dispatch and treat it as `human_needed`, exactly as STATE.md § Operator
  Next Steps already does for the Phase-12 baselines.

**Missing dependencies with fallback:**
- `EMAIL_FROM` is absent, which is the *desired* state under D-160 — the fallback literal is the
  feature, not a gap.

---

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest **4.1.8** (two disjoint configs) + Playwright **1.60.0** |
| Config — main | `vitest.config.ts` — `globalSetup: tests/global-setup.ts` (**requires Postgres/Docker**), `setupFiles: tests/setup.ts` (installs `vi.mock("resend")`), excludes `tests/design/**` |
| Config — design | `vitest.design.config.ts` — `include: tests/design/**`, environment `node`, **no `globalSetup`, no `setupFiles`**, DB-free by contract |
| Quick run (design) | `npm run test:design` |
| Quick run (scoped unit) | `npx vitest run tests/auth/email-escaping.test.ts` (needs Docker up) |
| Full suite | `npm test` (Docker required) · `npm run test:e2e` (Playwright) |
| Build gate | `npm run build` = `lint && test:design && next build` — **the design suite is build-blocking** |

### Phase Requirements → Test Map

| Req | Behaviour | Type | Automated command | File exists? |
|---|---|---|---|---|
| AUTHUI-01 | Four routes render one composition: one `main`, wordmark above one `PanelCard`, `bg-muted` | unit (jsdom) | `npx vitest run tests/design/auth-composition.test.tsx --config vitest.design.config.ts` | ❌ Wave 0 |
| AUTHUI-01 | `ALLOWED_RAW_CARD` loses the four auth rows; `CARD_SURFACES` gains four adopters | unit | `npx vitest run tests/design/card-pattern-coverage.test.ts --config vitest.design.config.ts` | ✅ (edit in place) |
| AUTHUI-01 | Repo-wide `variant="brand"` 24 → 28; scoped 19 and surviving-8 unchanged | unit | `npx vitest run tests/design/brand-recipe.test.ts --config vitest.design.config.ts` | ✅ (edit in place) |
| AUTHUI-01/03 | `LIVE_REGION_FILES` 21 → 26, +7 rows, `LIVE_REGION_EXCLUSIONS` stays `[]` | unit | `npx vitest run tests/design/live-regions.test.tsx --config vitest.design.config.ts` | ✅ (edit in place) |
| AUTHUI-03 | 320px: `scrollWidth <= clientWidth` on all four routes in all states | e2e | `npx playwright test e2e/overflow-320.spec.ts` | ✅ (extend ROUTES) |
| AUTHUI-03 | Auth e2e flows pass **unmodified** (GATE-NOREG #1) | e2e | `npx playwright test e2e/password-reset.spec.ts e2e/login-persistence.spec.ts` | ✅ **zero edits** |
| AUTHUI-03 | Court-only baselines, 4 surfaces × 2 widths | visual | `baselines.yml` **workflow_dispatch** — CI only | ✅ (2 rows edited, 8 added) |
| AUTHUI-02 | `/profile`: one `<h1>` at 20px, exactly two `panel-card`, zero accent, zero destructive | unit (jsdom) | `npx vitest run tests/design/profile-pass.test.tsx --config vitest.design.config.ts` | ❌ Wave 0 |
| AUTHUI-02 | Save-state machine behaviourally unchanged (no timer on the save path) | unit | `npx vitest run tests/profile/ --config vitest.config.ts` | ✅ (extend) |
| AUTHUI-02 | `loading-coverage` unchanged at 29/21/8, zero edits | unit | `npx vitest run tests/design/loading-coverage.test.ts --config vitest.design.config.ts` | ✅ **zero edits** |
| EMAIL-01 | Shell structure: one preheader, one 600px table, zero flex/grid/img/class/`<style>` | unit (pure) | `npx vitest run tests/design/email-shell.test.ts --config vitest.design.config.ts` | ❌ Wave 0 |
| EMAIL-01 | html ↔ text parity: every paragraph in `text` appears escaped in `html` and vice versa | unit (pure) | `npx vitest run tests/design/email-shell.test.ts --config vitest.design.config.ts` | ❌ Wave 0 |
| EMAIL-01 | All-sender injection probe: one payload through every string param of all 19 senders | unit (mock) | `npx vitest run tests/auth/email-injection.test.ts` (Docker) | ❌ Wave 0 |
| EMAIL-01 | `escapeHtml` regression passes with **zero edits** | unit (mock) | `npx vitest run tests/auth/email-escaping.test.ts` (Docker) | ✅ **zero edits** |
| EMAIL-01 | WR-02 guard behaviour unchanged | unit (mock) | `npx vitest run tests/auth/email-dev-fallback.test.ts` (Docker) | ✅ **zero edits** |
| EMAIL-01 | Trigger graph unmoved (SC#3) | unit (mock) | `npx vitest run tests/booking/notify-emission.test.ts` (Docker) | ✅ **trigger assertions unmodified** |
| EMAIL-01 | Ops-digest PII assertion still reads the pure body directly | unit (pure) | `npx vitest run tests/ops/` | ✅ (extend) |
| EMAIL-02 | Hex-literal set in any rendered email == the seven `THEME_TOKENS[DEFAULT_THEME]` values | unit (pure) | `npx vitest run tests/design/email-tokens.test.ts --config vitest.design.config.ts` | ❌ Wave 0 |
| EMAIL-02 | `tokens.generated.ts` + `token-drift.test.ts` untouched; leak gate globs unwidened | unit | `npx vitest run tests/design/token-drift.test.ts tests/design/leak.test.ts --config vitest.design.config.ts` | ✅ **zero edits** |
| EMAIL-01/D-161 | Footer support line renders IFF `SUPPORT_EMAIL !== null`; shell's guarded site declared | unit | `npx vitest run tests/design/site-contacts.test.ts --config vitest.design.config.ts` | ✅ (extend null-branch inventory) |
| EMAIL-03 | Real-client walk, 3 available clients + 1 dark, Outlook BLOCKED | **manual UAT** | `15-UAT-EMAIL.md` — PM-initialed, screenshots. **Not self-certifiable** | ❌ Wave 0 (artifact + `scripts/send-email-previews.ts`) |

### Sampling Rate

- **Per task commit:** `npm run test:design` (DB-free, fast, build-blocking) + `npx tsc --noEmit`
  (the only thing that catches the count-alias moves).
- **Per wave merge:** `npm test` (Docker up) + `npm run lint`.
- **Phase gate:** `npm run build` green + `npm run test:e2e` + the CI baseline dispatch + the
  PM-initialed `15-UAT-EMAIL.md` before `/gsd:verify-work`.

### Wave 0 Gaps

- [ ] `src/lib/design/theme.ts` (or equivalent pure module) — the `DEFAULT_THEME` relocation
      (§ Pitfall 3). **Blocks EMAIL-02.**
- [ ] `src/lib/email-shell.ts` — `renderEmail`, exported and pure. **Blocks EMAIL-01/02.**
- [ ] `tests/design/email-shell.test.ts` — structure + html/text parity — covers EMAIL-01
- [ ] `tests/design/email-tokens.test.ts` — the seven-hex-set gate — covers EMAIL-02
- [ ] `tests/auth/email-injection.test.ts` — all-sender probe — covers EMAIL-01 (AC#16)
- [ ] Shared sender-fixture module — 19 argument lists, read by both the injection probe and the
      preview script (§ Open Question 2)
- [ ] `tests/design/auth-composition.test.tsx` — covers AUTHUI-01/03
- [ ] `tests/design/profile-pass.test.tsx` — covers AUTHUI-02
- [ ] `scripts/send-email-previews.ts` — the EMAIL-03 harness (dev-only, outside `src/app`)
- [ ] `15-UAT-EMAIL.md` — the walk checklist artifact, 14-UAT-LOG's convention
- [ ] Export `BRAND_CLASS` from `site-chrome.tsx` — currently a private `const` at line 95

*Framework install: none needed — Vitest, Playwright and both configs are in place.*

---

## Security Domain

**`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: high`** [VERIFIED:
`.planning/config.json`].

### Applicable ASVS Categories

| ASVS category | Applies | Standard control in this phase |
|---|---|---|
| **V2 Authentication** | yes — **but as a NON-REGRESSION obligation only** | Better Auth owns the mechanism. This phase restyles the surfaces. GATE-NOREG #2/#3/#4/#5 pin the four invariants: anti-enumeration branches, `safeCallbackPath`, `revokeSessionsOnPasswordReset`, server-assigned `canBook`/`canHost`. **PROJECT D-130: polish may reshape layout; it may not move logic** |
| **V3 Session Management** | yes (non-regression) | Reset revokes sessions; the `/login?reset=1` redirect is unchanged. `tests/auth/reset-revokes-sessions.test.ts` and `stale-session-selfheal.test.ts` are the proof — and both are **direct casualties of Pitfall 1**, which is what makes that pitfall a security-relevant finding rather than a test-hygiene one |
| **V4 Access Control** | yes (non-regression) | The `(auth)` layout is explicitly **not** the security boundary (its own docblock, and `middleware.ts` + per-page `getSession()`). Removing `PublicHeader` moves no gate. `/profile`'s `publicProfile()` server boundary is untouched |
| **V5 Input Validation / Output Encoding** | **yes — the phase's primary security surface** | `escapeHtml` at the choke point, applied to heading, paragraphs, CTA label, CTA href **and the derived preheader** (§ Pitfall 2). `tableHtml` is the one pre-escaped slot and its producer keeps its own per-field escaping (§ Pitfall 10) |
| **V6 Cryptography** | no | No new crypto. Token generation and comparison stay in Better Auth |
| **V7 Error Handling / Logging** | yes | **WR-02 is a credential-leak guard**: production-without-key must fail loudly *without* logging the token-bearing link. The shell makes the logged body larger; the guard's statements must be AST-unchanged (AC#17) |
| **V8 Data Protection / Privacy** | yes | The ops digest's `meta`-absent contract — booking ids, transfer ids and masked last-4s must never cross the email boundary. Enforced **by type**, and that enforcement must survive the refactor (§ Pitfall 10) |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation — as applied here |
|---|---|---|
| HTML injection via an interpolated URL into `href` | Tampering | `escapeHtml` at the one choke point; `tests/auth/email-escaping.test.ts` unmodified; the new all-sender probe widens the same guarantee to every string parameter |
| HTML injection via the **derived preheader** | Tampering | ⚠ **Newly identified.** Escape the derived value before it enters the `<div>`; make the injection probe inspect the whole document, preheader included |
| Injection via a "trusted because we wrote it" free-text column (`action`, `actorId`) | Tampering | Already correct and explicitly reasoned in `email.ts`: *"not because a call site is expected to be hostile, but because 'trusted because we wrote it' is the assumption that makes an injection sink."* Preserve it |
| PII / financial-identifier leakage across an external trust boundary | Information disclosure | `OpsDigestRow` has no `meta` field, so re-exporting it is a compile error. Keep the type narrow |
| Credential leakage into production logs | Information disclosure | The WR-02 guard, AST-unchanged |
| Account enumeration via differential auth responses | Information disclosure | Uniform forgot-password sentence, generic login refusal. The state redesign must introduce **no** branch on account existence (GATE-NOREG #2) |
| Timing side-channel on auth responses | Information disclosure | `auth.ts` fires sends `void`-style. **Never `await` them** — 15-UI-SPEC lists "helpfully awaiting a `void` call" as an anti-pattern, and `email.ts`'s header names it as the original reason |
| Open redirect via a reset callback | Tampering | `safeCallbackPath` guards `router.push` and the social `callbackURL`; module and tests untouched (GATE-NOREG #3) |
| Phishing-shaped email construction | Spoofing | No images, no external resources, no tracking pixel, one CTA whose href is a caller-supplied absolute app URL. The sandbox sender under D-160 is a *deliverability* limitation, not a new security exposure — and delivery is restricted to one inbox |

**Net assessment:** this phase **reduces** injection risk (discipline across ~20 call sites becomes a
structural choke point) and introduces exactly one new sink (the derived preheader) which is closed by
escaping it. No ASVS L1 control is weakened. No `security_block_on: high` finding was identified.

---

## Sources

### Primary (HIGH confidence)

- **`node_modules/resend/dist/index.d.mts`** (installed `resend@6.12.4`) — `CreateEmailOptions`,
  `RequireAtLeastOne`, `EmailRenderOptions`. Settles the `html`+`text` question definitively.
- **Repository source, read directly** — `src/lib/email.ts` (688 lines, all 19 senders),
  `src/lib/site.ts`, `src/lib/design/tokens.generated.ts`, `src/lib/design/visual-baselines.ts`,
  `src/lib/design/live-regions.ts`, `src/lib/design/measurements.ts`, `src/lib/design/selector-contract.ts`,
  `src/components/theme/theme-provider.tsx`, `src/components/patterns/{panel-card,page-header,site-chrome}.tsx`,
  `src/app/(auth)/layout.tsx`, `src/app/(app)/profile/{page,loading}.tsx`, `src/app/globals.css`.
- **Repository tests, read directly** — `tests/auth/{email-escaping,email-dev-fallback}.test.ts`,
  `tests/helpers/mocks.ts`, `tests/setup.ts`, `tests/design/{card-pattern-coverage,brand-recipe,site-contacts,leak,strip-comments,type-scale}.test.ts`,
  `vitest.design.config.ts`, `e2e/overflow-320.spec.ts`, `.github/workflows/baselines.yml`.
- **Measured counts** — `SURFACE_IDS` 37, `VISUAL_BASELINES` 66, `ALLOWED_RAW_CARD` 9,
  `LIVE_REGION_FILES` 21, `THEME_SWAP_SURFACES` 4, committed baseline PNGs 30. All by parse or listing.
- **Environment probes** — Node v24.13.0, Docker 29.6.1, Playwright 1.60.0, `.env.local` key presence.
- **`15-UI-SPEC.md`** (APPROVED, gsd-ui-checker 2026-08-24) — the upstream design contract.
- **`15-CONTEXT.md`** (D-160…D-163) — the locked PM decisions.
- **`.planning/REQUIREMENTS.md`** — AUTHUI-01..03, EMAIL-01..03, the AUTHFB adjacency note (line ~142),
  the AUTHUI-02/CROP-03 boundary note (line ~274).
- **`.planning/config.json`** — `nyquist_validation: true`, `security_enforcement: true`, ASVS L1.

### Secondary (MEDIUM confidence)

- Gmail 102KB desktop clipping threshold — corroborated across Litmus, Mailchimp, ActiveCampaign,
  EmailToolTester and Dyspatch; multiple independent sources agree on the figure and on "raw HTML
  bytes, images excluded."
- Preheader suppression recipe (`display:none` + `font-size:1px` + `overflow:hidden` + `mso-hide:all`
  + `&zwnj;`/`&nbsp;` padding) — Email on Acid, Litmus community snippet, Taxi for Email. Consistent
  across all three.

### Tertiary (LOW confidence — flagged, not relied upon)

- Gmail **mobile** clipping thresholds (~20KB iOS app, ~75KB other mobile) — single-source-family,
  described as "inconsistently applied." Recorded as **A1** in the Assumptions Log. The mitigation
  does not depend on the exact number.

**Sources:**
- [How to Keep Gmail from Clipping Your Emails — Litmus](https://www.litmus.com/blog/how-to-keep-gmail-from-clipping-your-emails)
- [Why Gmail Clips Your Emails (and How To Prevent Clipping) — EmailToolTester](https://www.emailtooltester.com/en/blog/gmail-clipping/)
- [Gmail is clipping my email — Mailchimp](https://mailchimp.com/help/gmail-is-clipping-my-email/)
- [Email Preheader Coding Tips — Email on Acid](https://www.emailonacid.com/blog/article/email-development/tips-for-coding-email-preheaders/)
- [Hidden Preheader Text — Litmus Community](https://litmus.com/community/snippets/1-hidden-preheader-text)
- [Hidden Preheader — Taxi for Email](https://taxiforemail.com/code/snippets/hidden-preheader/)

---

## Metadata

**Confidence breakdown:**

| Area | Level | Reason |
|---|---|---|
| Standard stack | **HIGH** | Zero new packages. Every version read from the installed tree, not from training data. The one external-library question (`html` + `text`) settled by reading the shipped `.d.mts`, not by assuming |
| Architecture | **HIGH** | The UI-SPEC is approved and prescriptive; research verified its structural claims against source and confirmed all of them except the baseline arithmetic, which the spec itself flagged for measurement |
| Inventory arithmetic | **HIGH** | Every count parsed from the file rather than read from prose. The `auth-login`/`THEME_SWAP_SURFACES` finding is a direct measurement with the row quoted |
| Pitfalls | **HIGH** for 1–5 and 7–10 (each traced to a specific shipped line of code or test), **MEDIUM** for 6 (external client behaviour, exact mobile thresholds unverifiable without the walk) |
| Security | **HIGH** | ASVS mapping derived from the repo's own documented invariants (GATE-NOREG, WR-01, WR-02, D-72, D-83) rather than from a generic checklist |
| Validation architecture | **HIGH** | Both Vitest configs read in full; the DB-free / setupFiles split is documented in the config's own header and confirmed by grep |

**What I might have missed, stated honestly:**
- I did not read all four `(auth)/*/page.tsx` files line by line — the UI-SPEC's per-screen copy table
  is byte-level and checker-verified, and re-deriving it would duplicate approved work. The planner
  should diff against those files directly when writing the conversion tasks.
- I did not read `profile-form.tsx` in full. Its save-state machine is explicitly out of scope for
  change and is the repo's reference model; the restyle works around it.
- I did not enumerate every one of the ~40 design tests for incidental coupling to the auth or
  profile trees. The ones the UI-SPEC names, plus the ones that appeared in targeted greps
  (`site-contacts`, `leak`, `card-pattern-coverage`, `brand-recipe`, `live-regions`, `type-scale`,
  `strip-comments`, `visual-baselines`), are covered. A full `npm run test:design` after the first
  conversion commit is the cheapest way to surface the rest.
- **A5** (notification rows do not store rendered markup) is inferred rather than read from DDL.

**Research date:** 2026-08-24
**Valid until:** 2026-09-23 (30 days — the stack is stable, nothing is pre-release, and the only
external moving part is mail-client behaviour, which changes slowly). The repository measurements are
valid only against the current `dev` HEAD (`5c636b7`); re-measure the counts if other work lands first.
