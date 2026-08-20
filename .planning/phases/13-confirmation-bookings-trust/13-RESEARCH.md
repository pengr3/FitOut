# Phase 13: Confirmation, Bookings & Trust - Research

**Researched:** 2026-08-20
**Domain:** Post-payment booker surfaces in Next.js 16 App Router — RSC status branching, URL-param consumption, print CSS under Tailwind v4, PayMongo refund semantics
**Confidence:** HIGH on the code facts and the PayMongo refund table; MEDIUM on Geist tabular figures; the two blockers below are HIGH-confidence findings, not speculation.

## Summary

This phase is almost entirely a **read-and-render** problem over data that already exists, which is what makes 13-CONTEXT D-80's zero-migration constraint achievable. Every trust signal D-68 names maps to a live column; the receipt's itemisation (`spacePriceCents` / `serviceFeeCents` / `quotedTotalCents`) is already frozen on the booking row and already rendered by `PriceBreakdown`; the reference is already derived deterministically from the booking id. The mechanisms for the two hardest asks — consuming `?paid=1` and printing without a PDF pipeline — are both first-class, documented platform features (`window.history.replaceState` integrated into the Next.js router; Tailwind's `print:` variant), not workarounds.

Three findings change the shape of the plan, and all three are about the **reversed-payment state (13-CONTEXT D-69)** rather than about the receipt or the confirmation moment:

1. **The refund window per rail is now a verified fact** (PayMongo's own docs table, reproduced verbatim below). D-69 can ship a real number for GCash/Maya/card. But
2. **on a reversed booking the row does not know which rail was used** — `booking.payment_method` and `booking.payment_id` are written only by the *successful* confirm UPDATE, and a reversal is by definition the branch where that UPDATE claimed zero rows. Both columns are NULL on every reversed row. And
3. **on QRPh — FitOut's flagship rail — the D-58 backstop issues no refund at all.** It raises an operator alert and the money stays held. The shipped copy ("you haven't been charged") is not merely the wrong *state's* copy as D-69 says; on the QRPh path it is the exact inverse of the truth in two directions at once.

None of these needs a column. Two zero-migration routes to the rail exist (a live `getCheckoutSession` probe, or an additive `auto_refund_ok` audit row), and one honest copy variant needs neither. They are laid out in Pitfall 1 and Code Example 3.

**Primary recommendation:** Treat the reversed state as the phase's highest-risk surface and plan it first — it is the only one where a locked decision (D-69's per-rail window) collides with a data gap, and the only one where the shipped copy is actively contradicted by what the code does. Everything else — the confirmation moment, the receipt, the trust block, the reference — is prescriptive assembly over existing columns and existing patterns.

## User Constraints (from 13-CONTEXT.md)

### Locked Decisions

> **Decision-ID namespace.** Phase 13 runs **D-60…D-80**, colliding with PROJECT.md's own D-numbers at **D-62**, **D-66**, **D-75**, **D-79**. When citing any number in that range, say which namespace: "13-CONTEXT D-62" or "PROJECT D-62". Never a bare number.

> **Governing principle carried forward — 12-CONTEXT D-59:** when two options both satisfy a requirement, choose the one that costs the booker less.

**The confirmation moment (BFLOW-08)**

- **D-60: `?paid=1` is CONSUMED, not persisted.** The booker returns to `/bookings/{id}?paid=1`, sees the full confirmation moment, and the client then rewrites the URL to `/bookings/{id}` (history replace). A cookie and a DB column were both rejected. ⚠ PROJECT D-57 unchanged and binding: `?paid=1` is a UX signal ONLY. ⚠ Nothing important may live ONLY in the moment.
- **D-61: The moment is a full-page first screen inside the SAME route;** the ordinary detail continues below it. No `/bookings/[id]/confirmation` route. Not a banner.
- **D-62 (13-CONTEXT): "What happens next" BRANCHES ON `listing.bookingMode`.** `instant` → lead with arrival (venue, full address, venue-local date/time with named timezone). `request` → lead with the host's approval deadline AND the money answer (charged now, refunded in full automatically if the host declines).
- **D-63: The confirmation states the FULL email address** it was sent to. Masking rejected.

**Trust signals (TRUST-01, TRUST-04)**

- **D-64: The support path is BUILT COMPLETE but GUARDED.** Build the entire support path behind the existing `SUPPORT_EMAIL !== null` guard, exactly as the footer does. The unfilled address is carried as a named `human_needed` item. **NEVER weaken, skip, or invert `tests/design/site-contacts.test.ts`.** ⚠ TRUST-01 and STATE-05 are **partially satisfied at phase close** — code-complete, address-pending.
- **D-65: "Payout onboarding complete" is a PLATFORM GUARANTEE, not a host badge** — *"FitOut holds your payment until after your session"*.
- **D-66 (13-CONTEXT): "Host since {Month YYYY}" from `user.createdAt`, with NO newness badge.**
- **D-67: Full trust block on the booking detail page for EVERY status;** a condensed version inside the confirmation moment.
- **D-68: The four signals are a CLOSED set** — `user.createdAt`, `listing.publishedAt`, `host_payout.onboarding_complete` (via D-65's reframing), `listing.bookingMode`. ⚠ No response-rate column exists. Response times, verification badges, superhost chrome, ratings and reviews are **forbidden**.

**Payment states (STATE-05, STATE-06, STATE-08)**

- **D-69: The reversed state must state the MONEY TRUTH, and the shipped copy is WRONG.** Replace with: the exact amount charged, that it is refunded in full, roughly when it reappears per rail, the booking reference, and the support path. ⚠ **The reappearance window is a FACT TO VERIFY, NOT A NUMBER TO INVENT.** If it cannot be verified, the copy says so honestly.
- **D-70: The not-completed state is NET-NEW.** State plainly that the booker has not been charged, and — if the 15-minute hold is still alive — let them pay again **on that same hold**, with the alternative rails offered inline. ⚠ If the hold has already expired, this is NOT the not-completed state; `hold-expired-state.tsx` owns that.
- **D-71 (13-CONTEXT): Pending settlement keeps its poll and gains a promise.** Poll discipline preserved verbatim. Add: the booking is safe, they will be emailed the moment it confirms. Past a longer threshold, surface the support path with the reference. ⚠ **Never an error affordance at any point.**
- **D-72: On the reversed state the primary action stays REBOOK.** Support is the quieter secondary.
- **D-73: STATE-06's money sentence is ONE shared, named component** rendered above the fold in every payment state.

**Receipt (TRUST-05)**

- **D-74: A dedicated `/bookings/[id]/receipt` route, styled for screen AND print.** Browser print dialog produces the PDF. No PDF dependency, no server-side render pipeline, no font debugging.
- **D-75 (13-CONTEXT): This is an INFORMAL booking receipt and must never present as an official one.** Space cost, service fee, total, method, date paid, reference. No serial numbers, no TIN fields, no "Official Receipt" wording, no BIR styling.
- **D-76: A receipt exists wherever MONEY MOVED** — including cancelled and refunded bookings, where it shows the original charge and the refund as separate lines. No receipt for unpaid holds.
- **D-77: A group receipt itemises per-head rate × confirmed headcount + service fee + total, issued to the ORGANISER.** Attendee names are NOT listed.

**Reference, and the Phase 15 seam (TRUST-02, TRUST-03)**

- **D-78: The booking reference is copyable, rendered in tabular figures, and present on EVERY status.** This phase specifies the email contract and does not reach into it. ⚠ **Do not move or add an email SEND TRIGGER in this phase.**

**Cross-cutting scope**

- **D-79 (13-CONTEXT): The group surfaces get the DESIGN-SYSTEM PASS ONLY.** No net-new group capability.
- **D-80: ZERO schema migrations.** `drizzle/` stays at `0025_audit_resolved_by.sql`.

### Claude's Discretion

> Component decomposition, file layout, server/client boundaries (subject to GATE-05), test strategy, how the URL rewrite is performed, the exact poll thresholds, and print-CSS mechanics.

> **Not at discretion:** the decay mechanism (D-60), the mode branch (D-62), the guarded support path (D-64), the closed signal set (D-68), the corrected reversed copy (D-69), the no-invented-refund-window rule (D-69), the informal-receipt boundary (D-75), and zero migrations (D-80).

### Deferred Ideas (OUT OF SCOPE)

- **Official BIR receipt** — an open business question for the PM and their accountant. Not Phase 13 work.
- **A monitored support inbox** — the operational prerequisite for D-64. A `human_needed` item, not a code task.
- **Net-new group capability** — D-136 territory, needs its own phase.
- **Host-side booking surfaces** — Phase 14.
- **The email shell, and the reference in the subject line** — Phase 15. This phase defines the contract only.

## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BFLOW-08 | Post-payment view is a distinct confirmation moment that decays into the normal booking-detail page | Pattern 1 (native History API consumption) + Pitfall 2 (the poller interaction). All eight facts the requirement enumerates are already read by `page.tsx`; only `listing.streetAddress`/`user.email` need adding to the select. |
| TRUST-01 | Every booking detail page states status + meaning, venue, address, venue-local time, host, itemised payment, cancellation deadline with today's refund, reference, support path | Pattern 3 (the guarded support component) + Pattern 5 (existing `CancellationPolicyDisclosure` + `rungBoundaries`). Closes **code-complete, address-pending** per D-64. |
| TRUST-02 | Reference copyable, tabular figures, every status, email subject line | Pattern 6 (`bookingReference` is `node:crypto` → server-derived, passed as a prop). Open Question 1: `tabular-nums` on a Crockford base32 string only affects the digits. |
| TRUST-03 | Cancellation policy disclosed on confirmation and in confirmation email with concrete dates | `cancellation-policy-disclosure.tsx` already derives every rung from `LADDER` and takes server-computed boundaries. On-screen half only; email half is Phase 15 (D-78). |
| TRUST-04 | Only real trust signals; no invented verification or superhost chrome | Architectural Responsibility Map + Anti-Patterns. Every D-68 signal is a live column; the absence of a response-rate column is verified. |
| TRUST-05 | View and print an itemised receipt for a paid booking | Pattern 2 (print CSS) + Pattern 4 (reusing the frozen breakdown) + Pitfall 3 (backgrounds drop when printing). |
| STATE-05 | Three distinct payment states, never conflated | Pitfall 1 (the reversed-state data gap) + Pattern 7 (`getCheckoutSession` as the not-completed discriminator). |
| STATE-06 | Every payment state states where the money is, above the fold | D-73's shared component. The money figure is `quotedTotalCents`, already frozen and already selected. |
| STATE-08 | Terminal success = full page; non-terminal = toast; must-read = in-page alert | Phase 10's closed four-tone status vocabulary + `live-regions.ts` rules 1–7. |

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Booking status branching | API/Backend (RSC) | — | PROJECT D-57: the webhook is the sole confirm authority; every branch reads DB status. Already true in `page.tsx`; must stay true. |
| Money itemisation (receipt, breakdown) | API/Backend (RSC + `server-only` modules) | Browser (render only) | GATE-05 / D-130. `service-fee.ts` carries `import "server-only"`; `all-in-table.ts` is server-only by transitivity. A client component may receive a *finished* figure, never the inputs. |
| `?paid=1` consumption | Browser / Client | — | It is a URL-state operation with no security or money meaning. Doing it server-side would require a redirect, which costs a navigation (12-CONTEXT D-59) and would race the poller. |
| Payment-rail identification (for D-69 copy) | API/Backend | — | Requires either a PayMongo GET or an `audit` read. Never a client-visible input. |
| Print rendering | Browser | — | D-74: the browser's own print dialog is the PDF pipeline. No server tier involved by decision. |
| Venue-local time formatting | API/Backend (RSC) | — | `@date-fns/tz` + `venueTzNote` run in the RSC; a client clock must never influence a boundary (T-07-92, already enforced by `composeDeadlineLabel`). |
| Confirmed headcount (group) | API/Backend | — | `getHeadcount` is organizer-scoped inside its own SQL (08-06). A foreign roster must be unreadable, not merely unrendered. |
| Support-path affordance | Browser (render) | Isomorphic constant | `src/lib/site.ts` is deliberately isomorphic (no `server-only`); the guard is lexical and must live in the same file as the affordance — see Pitfall 4. |

## Standard Stack

No new runtime dependency is required or recommended for this phase. Everything below is already installed and already in use.

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| next | ^16.2.7 | App Router, RSC, native History API integration | `[VERIFIED: package.json]`. Docs consulted at 16.3.1 `[CITED: nextjs.org/docs/app/getting-started/linking-and-navigating]`. |
| react | ^19.2.7 | UI | `[VERIFIED: package.json]` |
| tailwindcss | ^4.3.0 | Styling, including the `print:` variant | `[VERIFIED: package.json]`; `print:` documented `[CITED: tailwindcss.com/docs/hover-focus-and-other-states]` |
| drizzle-orm | (installed) | Typed reads over the existing schema | `[VERIFIED: src/lib/db/schema.ts in use]` |
| date-fns + @date-fns/tz | 4.x | Venue-local formatting via `tz()` | `[VERIFIED: imported in bookings/[id]/page.tsx]` |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | ^1.17.0 | Icons for the new states | Reuse the established idiom: `Undo2Icon` (reversed), `TimerOffIcon` (expired), `Loader2Icon` (pending). Pick a **muted** icon for not-completed; never an alarm glyph. |
| shadcn `Card` / `Separator` / `Badge` / `Button` | vendored | Containers and controls | Prefer `patterns/panel-card.tsx` — see Pitfall 5 on `ALLOWED_RAW_CARD`. |
| sonner | vendored, mounted at `(app)/layout.tsx` | Non-terminal success toasts only | STATE-08: a refund amount, a reduced headcount or a voided invite is **never** a toast. |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.history.replaceState` | `router.replace('/bookings/{id}')` | **Rejected.** `router.replace` performs a real client-side navigation and re-fetches the RSC payload; the server would then render without `?paid=1` and the confirmation moment would vanish on the frame it appeared. See Pitfall 2. |
| Browser print dialog (D-74) | `@react-pdf/renderer`, `puppeteer`, `pdfkit` | **Locked out by D-74.** Also each adds a font-embedding problem and a server render path that GATE-05 would have to re-police. |
| Tailwind `print:` utilities | A `@media print` block in `globals.css` | `print:` is zero-risk to `token-drift.test.ts` (which byte-compares the generated token module against a brace-depth parse of `globals.css`). Use `globals.css` only for the one rule that has no utility — see Pattern 2. |
| `tabular-nums` on the reference | `font-mono` (Geist Mono, already loaded, zero call sites) | Open Question 1. The reference mixes letters and digits; `tabular-nums` normalises only the digits. |
| Reading the rail from a new column | `getCheckoutSession` probe **or** an additive `auto_refund_ok` audit row | D-80 forbids the column. Both alternatives are viable; tradeoffs in Pitfall 1. |

**Installation:** none. This phase adds no packages.

## Package Legitimacy Audit

**Not applicable — this phase installs no external packages.**

The recommended approach is deliberately dependency-free: D-74 rules out a PDF library, D-78 rules out an email library (PROJECT D-66 bans a new email stack outright), and every UI primitive the phase needs is already vendored under `src/components/ui/` or built as a Phase-11 pattern. If any plan proposes an install, that is a scope alarm to raise explicitly — the same reflex GATE-06 applies to migrations.

## Architecture Patterns

### System Architecture Diagram

```
                       ┌──────────────────────────┐
   PayMongo hosted     │  PayMongo hosted checkout│
   page (off-site)     └────────┬─────────┬───────┘
                                │         │
              success_url       │         │  cancel_url
   /bookings/{id}?paid=1 ───────┘         └────────► /listings/{lid}/book?hold={id}
                │                                     (existing reserve page)
                ▼
   ┌────────────────────────────────────────────────────────────────────┐
   │  RSC  (app)/bookings/[id]/page.tsx      OWNER GATE: bookerId===me   │
   │                                          else notFound()            │
   │  reads: booking row · listing row · readDbNow() · getAvailability   │
   └───────┬────────────────────────────────────────────────────────────┘
           │ branch on booking.status  (DB is the ONLY authority — D-57)
           │
   ┌───────┼──────────┬──────────┬───────────┬───────────┬──────────────┐
   │       │          │          │           │           │              │
pending  pending   requested  approved   confirmed   cancelled     declined
+paid=1  no paid                        (+ derived                  │
   │       │                             completed)                 │
   ▼       ▼                                 │            ┌─────────┴────────┐
Pending  ★NOT-                               │            │                  │
settling COMPLETED                           │      reversed?           lapsed / party
(D-71)   (D-70 net-new)                      │      ★needs rail         (existing)
   │       │                                 │      discriminator
   │       │  ┌── hold alive? ──┐            │            │
   │       │  yes            no │            ▼            ▼
   │       │   │               ▼      ┌─────────────────────────────┐
   │       │   │        HoldExpired   │ ★ MoneySentence (D-73)      │
   │       │   ▼         State        │   one owner, above the fold │
   │       │  retry via confirmPay    └─────────────────────────────┘
   │       │  (expire-before-create)
   ▼       ▼
┌────────────────────────────────────────────────────────────────────┐
│  ★ Confirmation moment (D-61) — full-page first screen, SAME route │
│    then client consumes ?paid=1 via window.history.replaceState    │
└─────────────────────┬──────────────────────────────────────────────┘
                      │  (moment decays; ordinary detail continues below)
                      ▼
┌────────────────────────────────────────────────────────────────────┐
│  Ordinary booking detail — EVERY status                            │
│  ★ trust block (D-67/D-68) · ★ reference (D-78) · policy (TRUST-03)│
│  ★ support path behind SUPPORT_EMAIL !== null (D-64)               │
└─────────────────────┬──────────────────────────────────────────────┘
                      │ link
                      ▼
┌────────────────────────────────────────────────────────────────────┐
│  ★ RSC /bookings/[id]/receipt  — same owner gate, same frozen      │
│    figures, print:-styled. Refund shown as a SEPARATE line (D-76). │
└────────────────────────────────────────────────────────────────────┘

★ = net-new or rewritten in this phase
```

### Component Responsibilities

| File | Responsibility | Status |
|------|---------------|--------|
| `src/app/(app)/bookings/[id]/page.tsx` | Status branching, owner gate, DB clock, all reads | Exists (688 lines) — extended, not rewritten |
| `src/components/booking/pending-payment-state.tsx` | Poll discipline, "payment received" | Exists — copy extended per D-71, mechanics frozen |
| `src/components/booking/payment-reversed-state.tsx` | Reversal landing | Exists — copy **replaced** per D-69 |
| `src/components/booking/hold-expired-state.tsx` | Expired-hold recovery, focus move | Exists — untouched; D-70 must not duplicate it |
| `src/components/booking/not-completed-state.tsx` | D-70's net-new state | **New** |
| `src/components/booking/money-sentence.tsx` | D-73's single owner of STATE-06's sentence | **New** |
| `src/components/booking/booking-reference.tsx` | Copyable reference (client), tabular/mono figures | **New** |
| `src/components/booking/trust-block.tsx` | D-67/D-68 four signals, full + condensed | **New** |
| `src/components/booking/support-path.tsx` | D-64's guarded affordance — the guard lives **here** | **New** |
| `src/app/(app)/bookings/[id]/receipt/page.tsx` + `loading.tsx` | D-74's route | **New** |
| `src/lib/design/live-regions.ts` | 10 Phase-13 files move from exclusions to declarations | Exists — **handover owed** |

### Recommended Project Structure

```
src/
├── app/(app)/bookings/[id]/
│   ├── page.tsx            # extended: address, host, email, trust block, ref
│   ├── receipt/
│   │   ├── page.tsx        # D-74 — RSC, owner-gated, print-styled
│   │   └── loading.tsx     # REQUIRED — see Pitfall 6
│   └── group/page.tsx      # D-79 design-system pass only
├── components/booking/     # the state family + new shared pieces
└── lib/design/live-regions.ts  # the Phase-13 handover
```

### Pattern 1: Consuming `?paid=1` with the native History API (D-60)

**What:** Next.js integrates `window.history.pushState`/`replaceState` into its own router, so calling them updates `usePathname`/`useSearchParams` **without a server request**.

**When to use:** Exactly once, on the confirmed branch only, after the confirmation moment has painted.

```tsx
// Source: nextjs.org/docs/app/getting-started/linking-and-navigating § "Native History API"
// Docs verbatim: "Next.js allows you to use the native window.history.pushState and
// window.history.replaceState methods to update the browser's history stack without reloading
// the page. pushState and replaceState calls integrate into the Next.js Router, allowing you to
// sync with usePathname and useSearchParams."
"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/** D-60: show the moment once, then strip the param so a refresh renders the ordinary page. */
export function ConsumePaidParam() {
  const pathname = usePathname();
  React.useEffect(() => {
    // replaceState, not pushState: the booker must not be able to Back into the moment.
    window.history.replaceState(null, "", pathname);
  }, [pathname]);
  return null;
}
```

**Why an effect and not a render-time call:** `history.replaceState` is a side effect on a browser global; calling it during render breaks under React's double-invoked render in StrictMode and has no defined behaviour during SSR. A mount effect is the established idiom in this repo (`hold-expired-state.tsx`'s focus move carries the same argument in its header).

**Where it must NOT be mounted:** the `pending` branch. See Pitfall 2 — this is the single most likely way to ship a bug that only appears under a slow webhook.

### Pattern 2: Print CSS under Tailwind v4 (D-74)

**What:** The `print:` variant compiles to `@media print`. Documented verbatim: *"Use the `print` variant to conditionally add styles that only apply when the document is being printed"* `[CITED: tailwindcss.com/docs/hover-focus-and-other-states]`.

**When to use:** For everything the receipt needs. It requires no CSS-file edit, which keeps `token-drift.test.ts` and `leak.test.ts` entirely out of the blast radius.

```tsx
// Suppress app chrome on the printed page. These utilities emit ONLY inside @media print,
// so every one of GATE-VRT's 52 screen baselines is byte-identical after this change.
<header className="print:hidden">…</header>   // patterns/site-chrome.tsx
<footer className="print:hidden">…</footer>   // patterns/site-footer.tsx

// The receipt itself
<article className="mx-auto w-full max-w-2xl px-4 py-8 print:max-w-none print:px-0 print:py-0">
  {/* A print-only line the screen never shows — the reverse direction works too */}
  <p className="hidden print:block text-xs text-muted-foreground">
    Booking record · not an official receipt
  </p>
</article>
```

**The one rule with no utility:** `print-color-adjust`. Tailwind v4 ships `forced-color-adjust` utilities but no `print-color-adjust` utility `[CITED: tailwindcss.com/docs]`. If a background must survive printing, either use the arbitrary-property form `[print-color-adjust:exact]` or add one `@media print` rule to `globals.css`. **Prefer designing so it is unnecessary** — see Pitfall 3, where the correct answer is to *drop* filled surfaces on print rather than force them.

⚠ If a `@media print` block is added to `globals.css`, re-run `npm run design:tokens` and `npm run test:design` before trusting it: `config/design-tokens-source.mjs` parses that stylesheet with a brace-depth parser, and a new nesting level is exactly the shape of input that could confuse it. Declaring no custom properties inside the block is the safe form.

### Pattern 3: The guarded support affordance (D-64) — the guard must be lexical and local

**What:** `tests/design/site-contacts.test.ts` computes "guarded" by walking the AST of **each file independently** and collecting the character ranges of the true-branch of a `SUPPORT_EMAIL` conditional. A literal is guarded iff its start offset falls inside a range **in the same file**.

**When to use:** Any surface that renders a `mailto:` or the capitalised word `Support`.

```tsx
// src/components/booking/support-path.tsx
// The guard, the `mailto:` and the "Support" label ALL live in this one file, so the scanner's
// per-file range check sees them as guarded. Callers render <SupportPath/> unconditionally.
import { SUPPORT_EMAIL } from "@/lib/site";

export function SupportPath({ reference }: { reference: string }) {
  return SUPPORT_EMAIL !== null ? (
    <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Booking ${reference}`)}`}>
      Support
    </a>
  ) : null;
}
```

Three properties make this the only correct shape:

1. **The child file must hold the guard.** Passing `supportEmail` down as a prop from a guarded parent leaves the `mailto:` literal in an unguarded file and turns `unguardedMailto(scan)` red.
2. **It must be a conditional expression or a `&&`, never an early return.** The scanner recognises `ts.isConditionalExpression` and `ts.isBinaryExpression` with `&&`. An `if (SUPPORT_EMAIL === null) return null;` is an `IfStatement` and registers **no guard at all** — the mailto below it reads as unguarded and the null branch goes red.
3. **The false branch must be the bare `null` keyword.** `hasElseBranch` is `node.whenFalse.kind !== ts.SyntaxKind.NullKeyword`. This is currently asserted only over the footer, but matching it keeps D-26's "absent, never disabled" rule true everywhere.

**Verified safe:** the non-null branch of the gate counts `mailto:` usages **in the footer only** (`mailtoUsages(FOOTER, footerSource)`), and the "exactly one conditional / no else-branch" assertions filter on `g.file === FOOTER`. So Phase 13 may add as many guarded support affordances as it likes without breaking the day-the-address-arrives branch. `[VERIFIED: tests/design/site-contacts.test.ts:528-660]`

**Also verified:** `SUPPORT_LABEL` is `/\bSupport\b/` — capitalised and word-bounded. Lowercase "support" in body copy is invisible to the scan, and "Supported" does not match. Sentence-case copy like *"Contact support"* needs no guard; a heading or button label reading *"Support"* does.

### Pattern 4: Reusing the real frozen breakdown on the receipt (D-76, GATE-05)

**What:** The booking row carries the three frozen figures the receipt must itemise. Do not recompute, do not re-derive one from the other two.

```tsx
// The three columns, all integer centavos, all frozen at hold time:
//   booking.spacePriceCents   — the listing-priced portion (host payout basis)
//   booking.serviceFeeCents   — platform revenue (D-74/PROJECT), default 0
//   booking.quotedTotalCents  — the all-in amount actually charged (D-49)
// Invariant guaranteed by all-in-table.ts: space + fee === total. That is a property the server
// guarantees, NOT a licence to compute downstream.
//
// D-76's refund line reads booking.refundCents (nullable; NULL on a hold that was never paid).
// PROJECT D-79 governs its wording and is cited at bookings/[id]/page.tsx:169.
```

⚠ `tests/design/price-surface.test.ts` walks the AST of the price surface and asserts there is **no `+`, `-`, `*` or `/`** applied to money props. Reuse `PriceBreakdown` where the shape fits; where the receipt needs a different shape (charge line **and** refund line), build a receipt-specific component that also performs zero arithmetic and takes finished figures.

⚠ `formatMoney(cents, currency)` from `@/lib/money` is explicitly isomorphic and is the only formatter. `DISPLAY_CURRENCY` is the fallback.

### Pattern 5: The cancellation deadline with today's refund (TRUST-01, TRUST-03)

`cancellation-policy-disclosure.tsx` already exists and already satisfies the hard part: every percentage, every hour figure and the rung order are **derived from `LADDER`**, the same constant `quoteRefund` evaluates, and `tests/booking/cancellation-policy.test.ts` asserts the disclosure and the quote agree at every rung boundary. Concrete instants come from `rungBoundaries(tier, startsAt)` called server-side and arrive pre-formatted via `composeDeadlineLabel`.

**So TRUST-03's on-screen half is a composition task, not a build task.** Render the existing component on the confirmation moment and on the detail page. Do not hand-type a percentage anywhere — that is the exact drift the component's header forbids.

The booking's tier is the **snapshot** `booking.cancellation_policy` (PROJECT D-67), not the listing's current tier. A host re-tiering the listing must never rewrite an existing booking's terms.

### Pattern 6: The reference (D-78, TRUST-02)

`bookingReference(bookingId)` is a SHA-256 of the opaque booking id → 8 Crockford base32 symbols → `FIT-XXXXXXXX`. It is **deterministic** (survives refresh), **non-enumerable** (one-way from the id), and uses `node:crypto` — so it is server-only in practice and must be **passed to the copy button as a prop**, never recomputed client-side.

**The canonical format to hand Phase 15 (D-78's contract, not a send):**

```ts
// src/lib/booking/reference.ts already exports bookingReference(bookingId): `FIT-` + 8 Crockford
// symbols (alphabet omits I, L, O, U so it survives being read aloud or copied by hand).
// The contract Phase 15 consumes: subject lines interpolate this exact string, never a retyped one.
```

### Anti-Patterns to Avoid

- **A fifth trust signal.** D-68 is closed and there is **no response-rate or response-time column** in `src/lib/db/schema.ts` `[VERIFIED: grep]`. "Responds within an hour", verification badges, superhost chrome, ratings and reviews are the invented signals TRUST-04 exists to prevent.
- **Branching any UI on `?paid=1`'s presence beyond the moment itself.** PROJECT D-57. The param is forgeable; the DB status is not.
- **A toast for a refund amount.** STATE-08 is explicit: anything the user must actually read is an in-page alert.
- **An error affordance on the pending state.** D-71: never, at any threshold. The webhook is still the outstanding authority.
- **`aria-live="assertive"`.** Banned across the whole booker path by GATE-03 rule 7, and `hold-expired-state.tsx`'s header is the reason it has a name. The replacement mechanism is *polite region plus moved focus*.
- **A second `<main>` landmark.** See Pitfall 7 — three branches on this very route still ship one today.
- **Re-deriving the per-head unit price by dividing a frozen total.** See Open Question 2.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Removing a query param without a re-render | A `router.replace` + a `useState` flag to keep the moment visible | `window.history.replaceState` | Documented, router-integrated, one line, no state to desync. The flag approach re-introduces the exact "two sources of truth" D-60 rejected the cookie for. |
| PDF generation | Any PDF library or headless-browser render | The browser's print dialog | D-74. Also removes font embedding, page-break maths and a server render path GATE-05 would have to re-police. |
| Print styles | A hand-written `@media print` stylesheet | Tailwind `print:` variants | Zero risk to `token-drift.test.ts`'s brace-depth parse of `globals.css`; zero raw values for `leak.test.ts` to flag. |
| Money formatting | `Intl.NumberFormat` at a call site | `formatMoney` from `@/lib/money` | One owner; already isomorphic; already the formatter every other surface uses. |
| Venue-local date/time | A fifth date format | `composeWhenLabel` / `composeDateLabel` / `composeDeadlineLabel` / `venueTzNote` | Four formats already exist and 07-02 owns them. A fifth is how the page and the notification start disagreeing about the same session. |
| Cancellation-policy copy | Hand-typed percentages and hours | `CancellationPolicyDisclosure` (derives from `LADDER`) | Disclosure must equal enforcement. Hand-typed copy drifts the first time a rung moves — and this is precisely the surface where drift becomes a refund dispute. |
| Refund timing copy | An invented "3–5 business days" | The verified per-rail table below | D-69 makes this explicit. The shipped string *"Refunds usually land back on your original payment method within a few days"* appears in three places today and is unsourced. |
| Re-minting a checkout session for D-70's retry | A fresh `createCheckoutSession` call | The existing `confirmBooking` action | It already acquires a compare-and-swap checkout lease, **expires the recorded session before minting a new one**, and records the new id. PayMongo does **not** honour `Idempotency-Key` on `POST /v1/checkout_sessions` — probed live, two identical POSTs returned two independently payable sessions, and a UAT booker was double-charged ₱1,470 against a ₱735 booking on an unrefundable rail. Expire-before-create is the only real guard. `[VERIFIED: src/lib/paymongo.ts:170-180 + memory/paymongo-idempotency-not-honored.md]` |

**Key insight:** every "custom solution" temptation in this phase is a temptation to re-state a fact that already has exactly one owner in this codebase. The repository's whole design discipline is one-owner-per-fact (`site.ts` for the tagline, `LADDER` for the refund rungs, `all-in-table.ts` for the price, `reference.ts` for the reference, `live-regions.ts` for the announcements). A second spelling is the bug.

## Runtime State Inventory

Not a rename/refactor/migration phase — the section is omitted by its own trigger condition. The one adjacent concern (durable state that a UI change could contradict) is covered under Pitfall 1.

## Common Pitfalls

### Pitfall 1 — THE BLOCKER: a reversed booking does not know which rail it was paid on, and on QRPh it was never refunded

**What goes wrong:** D-69 requires per-rail refund-window copy. The reversed row cannot supply the rail, and for the most likely PH rail no refund was issued at all.

**Why it happens — three verified facts:**

1. `booking.payment_method` and `booking.payment_id` are written by exactly one statement: the confirm `UPDATE … SET status='confirmed', payment_id=…, payment_method=… WHERE id=… AND status IN ('pending','approved')`. A reversal is **by definition** the branch where that UPDATE returned zero rows. `handleGoneSlot` sets only `status='cancelled'`. **Both columns are NULL on every reversed row.** `[VERIFIED: src/app/api/paymongo/webhook/route.ts:433-451, 144-195]`
2. On an unrefundable rail — `qrph`, `dob_ubp`, or an unrecognised value (`isApiRefundable` fails closed) — `handleGoneSlot` **calls no refund API at all**. It writes a `needs_attention` audit row (`action: "auto_refund_manual"`) and a `[PAYMENT_ALERT]` console line, then cancels the booking. The money remains on the platform wallet pending a human. `[VERIFIED: webhook/route.ts:178-190]`
3. QRPh is genuinely not API-refundable as observed by this project: `POST /v1/refunds` returned HTTP 400 `"Refunds are not allowed for payments with source type qrph."` on 2026-07-23. `[VERIFIED: src/lib/payments/refund-rail.ts, verbatim probe log]` ⚠ **This contradicts PayMongo's current published docs**, which list QR Ph as refundable (partial not allowed, real-time under ₱50K). Treat the observed 400 as authoritative for FitOut's behaviour — the code branches on it — and treat the docs row as a re-verification item for UAT, not as a reason to change copy.

**How to avoid:** pick one of three, in descending order of honesty-per-cost.

| Option | Mechanism | Cost | Verdict |
|--------|-----------|------|---------|
| **A. Rail-free honest copy** | Say the range: *"within 24 hours for GCash, Maya or GrabPay; up to 30 days for a card, depending on your bank"* — plus a distinct branch for the manual path | Zero new reads, zero new writes | **Satisfies D-69 as written.** The decision says "roughly when it reappears per rail", not "detect the rail". Naming all rails lets the booker recognise their own. |
| **B. Live probe** | `getCheckoutSession(booking.checkoutSessionId)` widened to return `payments[0].source.type` and `attributes.status` | One PayMongo GET per reversed-page render; needs a timeout + fallback to (A) | Exact per-rail copy. Also solves D-70's discriminator (Pattern 7) and the "date paid" gap (Open Question 3), so the cost amortises across three problems. |
| **C. Additive audit row** | Add `recordAudit({ action: "auto_refund_ok", outcome: "ok", meta: { bookingId, method, amountCents } })` to the success branch of `handleGoneSlot`; read `audit` by `meta->>'bookingId'` | One line in a money-path file; no migration (the `audit` table exists at `0025`) | Makes every **future** reversal durably rail-accurate and durably detectable. Does nothing for existing rows. ⚠ It edits the webhook route — flag it, review it, do not bundle it with copy work. |

**Whichever is chosen, the copy must branch on the two money truths, because they are opposites:**

- *Automatic refund issued* → "We've refunded ₱X in full. It should be back with you {window}."
- *Manual path (QRPh / UBP / unknown / failed refund)* → **not** "refunded". Something closer to: "We've cancelled this booking and flagged your ₱X for return. Because of how this payment was made we have to send it back by hand, so please contact us with reference FIT-XXXXXXXX." The support path is not a quiet secondary here; it is the only route to the money. D-72 keeps *Back to availability* as the coral primary, which is compatible — but the support link must be unmissable, not decorative.

**Warning signs:** any copy draft that says "you haven't been charged" (the shipped string, and STATE-05's language for the *not-completed* state); any single refund sentence that does not branch; any number in the copy that cannot be traced to the table below.

**Also verified and useful:** `booking.refundCents` is **NULL** on the D-58 reversal path (nothing writes it there), so the "exact amount charged" must come from `booking.quotedTotalCents` — which is present, frozen, and already selected by `page.tsx`. The refund is full by design, so charged-amount and refund-amount are the same figure. D-69 is satisfiable on this point with zero new reads.

### Pitfall 2 — Consuming `?paid=1` on the pending branch sends the booker to the reserve page mid-poll

**What goes wrong:** the confirmation moment appears, the URL is cleaned, and a few seconds later the booker is silently bounced to a checkout page for a booking they already paid for.

**Why it happens:** `page.tsx` has this exact shape today:

```
if (bk.status === "pending") {
  if (paid === "1") return <PendingPaymentState />;
  redirect(`/listings/${bk.listingId}/book?hold=${bk.id}`);   // ← the trap
}
```

`PendingPaymentState` calls `router.refresh()` on an interval (8 × 2500ms). `router.refresh()` *"Refresh[es] the current route. Making a new request to the server, re-fetching data requests, and re-rendering Server Components"* `[CITED: nextjs.org/docs/app/api-reference/functions/use-router]`. After a `replaceState` to `/bookings/{id}`, the "current route" no longer carries `paid=1` — so the very next poll re-renders the RSC without it, falls into the `redirect`, and navigates away while the webhook is still in flight.

**How to avoid:**

- Mount the consumer **only on the confirmed branch** (terminal success), never inside or above `PendingPaymentState`.
- Note this interacts with D-70: if the `pending`-without-`paid` redirect is replaced by the net-new not-completed state, the failure mode changes from "bounced to checkout" to "shown *you haven't been charged* while the payment is settling" — which is worse, because it is a false money statement. **Whichever landing the `pending`-no-param branch gets, the poller must not be able to reach it.** The cleanest resolution is to let the poller own its own URL state: consume the param only after the DB says `confirmed`.

**Other verified behaviours of the mechanism:**

- `replaceState` replaces the current history entry, so Back goes to the PayMongo hosted page (cross-origin) — the same as today. `pushState` would let the booker Back *into* the moment, which D-60 rules out.
- The route is already dynamic (it awaits `params`, `searchParams`, `headers()` and the DB), so none of `useSearchParams`'s prerender/Suspense caveats apply.
- `router.bfcacheId` *"stays the same for back/forward navigations, `router.refresh()`, and search-param- or hash-only navigations"* `[CITED: nextjs.org/docs/app/api-reference/functions/use-router]` — so a param-only change does not reset Client Component state. Useful to know; not needed here.

### Pitfall 3 — The receipt prints with its backgrounds dropped, and filled elements go invisible

**What goes wrong:** a status badge or a `variant="brand"` button that is near-white text on a near-black fill prints as near-white text on **white paper**. Invisible.

**Why it happens:** `print-color-adjust`'s initial value is `economy`, under which *"the user agent is allowed to make adjustments … For example, when printing, a browser might opt to leave out all background images and to adjust text colors"* `[CITED: developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust]`. Chrome's "Background graphics" checkbox is off by default. Both FitOut themes are light-background (`court` `--background: oklch(1 0 0)`, `grove` `oklch(0.988 0.006 190)`) and `.dark` is dormant by D-129, so **the dark-receipt-prints-black scenario is not live today** — but the inverted-fill scenario is, on every badge.

**How to avoid:** design the printed receipt as **ink on white**. Concretely:

- `print:hidden` every filled control (buttons, the status badge chrome, the cancel entry, the trust block, the group entry).
- Where a status must survive to paper, print the **word**, not the pill: `<span className="hidden print:inline">Confirmed</span>` beside a `print:hidden` badge.
- Prefer `print:bg-transparent print:text-foreground print:ring-0 print:shadow-none` over forcing `[print-color-adjust:exact]`. Forcing exact colours costs the booker ink and buys nothing on a document whose job is to be legible.
- The `PanelCard` container's `bg-card` is white in `court` and white in `grove` (`--card: oklch(1 0 0)` in both), so it degrades correctly with no intervention. Its `ring-1` should still be `print:ring-0`.

**Warning signs:** a printed page where the reference or the total is missing; a print preview that looks correct only with "Background graphics" ticked.

**Design-gate interaction, verified:** `tests/design/leak.test.ts` scans only `.ts`/`.tsx` under `src/` and bans raw hex, colour functions and arbitrary px. `print:` utility class names contain none of those, so print styling is gate-neutral. `globals.css` is **not** scanned by that gate — but is byte-compared by `token-drift.test.ts` via a brace-depth parser, which is the reason to prefer utilities.

### Pitfall 4 — A support component that takes the address as a prop turns the inverted gate red

Covered in full under Pattern 3. Restated here because it is the single most likely way to trip `site-contacts.test.ts`, and because the instinct on that red — loosen the scan, add an exclusion row, or "temporarily" set `SUPPORT_EMAIL` to a placeholder — is exactly what D-64 forbids in three separate sentences. **The fix is always to move the guard into the file that holds the literal.**

Second most likely trip: an `EXCLUDED_ADDRESSES` row. If any new file gains an address-shaped literal (an example address in placeholder text, say), the null branch goes red until a row **with a reason over 40 characters** is added. Do not loosen `ADDRESS`.

### Pitfall 5 — A new file rendering a raw `<Card>` fails the card-pattern gate

`tests/design/card-pattern-coverage.test.ts` runs an inverse half: every raw `<Card>` outside `src/components/patterns/` that is not in `ALLOWED_RAW_CARD` is a violation. `EXPECTED_SURFACES = 12` is pinned.

**How to avoid:** compose `PanelCard` (`src/components/patterns/panel-card.tsx`) for the receipt and the new states. It takes `title`, `description`, `footer`, `sticky`, `tone`, renders `data-testid="panel-card"`, and its `CardContent` padding is the panel's only padding — do not add your own. If a raw `<Card>` is genuinely right for a surface, add the file to `ALLOWED_RAW_CARD` **with a reason**, in the same commit.

⚠ Related trap the gate's own header records: nesting a `PanelCard` inside a container that already supplies `bg-card ring-1 rounded-xl` pays the block padding twice (measured at 112px vs 80px). `PriceBreakdown` is deliberately a bare `div` for this reason — do not "finish the adoption" by wrapping it.

### Pitfall 6 — A new route without a `loading.tsx` fails a gate with pinned counts

`tests/design/loading-coverage.test.ts` pins `EXPECTED_PAGES = 28`, `EXPECTED_QUALIFYING = 20`, `EXPECTED_NON_QUALIFYING = 8`, measured 17 August 2026, and asserts exact equality. Its discriminator is `isAsyncDefaultExport`, not an `await` grep.

`/bookings/[id]/receipt` will be an async RSC → it **qualifies**, so it needs a `loading.tsx`, and the constants become 29 / 21 / 8. Copy the container from the sibling `loading.tsx`, which already renders a `div` rather than a `main` and says why.

### Pitfall 7 — Three branches of this very route still ship two nested `<main>` landmarks

**Live defect, verified today.** The 20 Aug 2026 quick task (`260820-nested-main-landmarks`) converted **nine page-level return branches** across `page.tsx`, `cancel/page.tsx` and `group/page.tsx` from `<main>` to `<div>`. It did **not** touch the three components those pages *return directly*, each of which opens its own `<main>`:

- `src/components/booking/pending-payment-state.tsx:52`
- `src/components/booking/payment-reversed-state.tsx:19`
- `src/components/booking/expired-approval-state.tsx:100`

`(app)/layout.tsx:96` already wraps `{children}` in the route's one `<main>`, so `/bookings/{id}?paid=1` on a pending booking, the reversed landing, and the lapsed-approval landing each render `document.querySelectorAll("main").length === 2` today. `e2e/shell.spec.ts` seeds a **`confirmed`** booking, so none of the three is covered by the assertion that caught the original defect.

**Why this lands in Phase 13's lap:** D-69 rewrites `payment-reversed-state.tsx`, D-71 extends `pending-payment-state.tsx`, and D-70 adds a fourth sibling that will be copied from one of them. Shipping the new state by copying the wrong container propagates the defect rather than fixing it. Convert all three to `div` and extend the e2e to seed a `pending` row.

### Pitfall 8 — The live-region handover is a named, checkable debt this phase owes

`src/lib/design/live-regions.ts` carries `LIVE_REGION_EXCLUSIONS` with **ten entries explicitly deferred to Phase 13**, each with a `why` naming this phase's requirement IDs:

`bookings/[id]/page.tsx`, `bookings/[id]/cancel/page.tsx`, `bookings/[id]/group/page.tsx`, `expired-approval-state.tsx`, `payment-reversed-state.tsx`, `pending-payment-state.tsx`, `request-countdown.tsx`, `group/invite-card.tsx`, `group/rsvp-confirmation.tsx`, `group/rsvp-form.tsx`.

The module's own "NOT COVERED" note says it plainly: *"THE EXCLUSIONS ARE A SCOPE BOUNDARY, NOT A VERDICT. Nine excluded files carry `aria-live` today and this module makes no claim that any of them is correct. Several are probably not — Phase 13's `request-countdown.tsx` is a second ticking region and rule 3 applies to it identically."*

Auditing these against GATE-03's seven rules and moving them into `LIVE_REGIONS` is Phase-13 work that no requirement ID mentions and that a plan will therefore miss unless it is written down. The file count is pinned by a type-level assertion, so moving entries is a compile-visible edit — good.

Rules that will bite: rule 3 (a ticking value needs `role="timer"` + `aria-live="off"` on the digits plus a separate polite region changing only at declared thresholds), rule 6 (exactly one region announces one outcome), rule 7 (`assertive` banned; use polite + moved focus).

### Pitfall 9 — Cross-checking a locked decision against the schema: D-77's group receipt

See Open Question 2. Stated here as a pitfall because the failure is silent: a group receipt showing per-head × RSVP-headcount would print a number that **never equals what was charged** for an exclusive-occupancy group booking, and no existing gate would catch it (GATE-05's price-parity e2e stops at the reserve page).

## Code Examples

### Example 1: The verified per-rail refund window (D-69's fact)

```
Source: docs.paymongo.com/docs/payment-acceptance-refunds (fetched 2026-08-20)
Cross-verified against paymongo.help "Refunding payments" via search snippet.

| Payment Method                     | Partial | Window   | TIME TO REFLECT                                  |
|------------------------------------|---------|----------|--------------------------------------------------|
| Debit/Credit Card                  | Yes*    | 60 days  | Up to 30 days                                    |
| GCash                              | Yes     | 180 days | Within 24 hours                                  |
| GrabPay                            | Yes     | 90 days  | Within 24 hours                                  |
| Maya                               | Yes**   | 12 months| Within 24 hours                                  |
| ShopeePay                          | Yes     | 365 days | Within 24 hours                                  |
| BPI Online Banking                 | Yes     | 30 days  | At least 3 banking days                          |
| BillEase                           | Yes     | 60 days  | Within 24 hours                                  |
| BDO/Metrobank/Landbank (Brankas)   | Yes     | 30 days  | Up to 5 banking days                             |
| QR Ph                              | No      | 30 days  | Real time (<PHP 50K); Next banking day (>PHP 50K)|
| UBP Online Banking                 | —       | —        | CANNOT BE REFUNDED                               |

*  full only for installments
** full refunds only same-day; partial refunds start 12:00 AM the next day

Also verbatim: "Refunds for already-paid-out transactions are deducted from your next payout."
```

FitOut's live rail set is `["card", "gcash", "paymaya", "qrph"]` `[VERIFIED: src/lib/paymongo.ts:210]`, so only four rows matter: **card = up to 30 days; GCash = within 24 hours; Maya = within 24 hours; QR Ph = see Pitfall 1, the docs row does not describe what FitOut does.**

⚠ The doc's QR Ph row and this project's observed `HTTP 400 "Refunds are not allowed for payments with source type qrph"` (2026-07-23) disagree. Do not resolve that disagreement in copy. Copy must describe FitOut's behaviour, which is the manual-return path.

### Example 2: D-70's not-completed retry — route it through the existing action

```tsx
// The retry CTA is a LINK to the reserve page for the same hold, exactly as the `approved`
// branch's "Pay now" already does. That page's Confirm & pay runs confirmBooking, which:
//   1. claims a compare-and-swap checkout lease (refuses a concurrent double-click), then
//   2. EXPIRES the persisted booking.checkout_session_id before minting a new session, then
//   3. records the new session id on the row before redirecting.
// Do not add a second minting path. PayMongo does NOT honour Idempotency-Key on
// POST /v1/checkout_sessions; expire-before-create is the only double-charge guard that works.
<Button asChild variant="brand" className="w-full">
  <Link href={`/listings/${listingId}/book?hold=${bookingId}`}>Try paying again</Link>
</Button>
```

**On "the alternative rails offered inline" (D-70 / STATE-05):** `createCheckoutSession` hardcodes `payment_method_types: ["card", "gcash", "paymaya", "qrph"]`, so the hosted page already offers all four on every attempt. Two readings, both zero-migration:

- **Name them in the copy** (recommended): *"You can pay with GCash, Maya, card or QR Ph — a failed GCash payment doesn't cost you your slot."* Zero code on the money path.
- **Pre-select a rail** by threading an optional `paymentMethodTypes` through `createCheckoutSession` and `confirmBooking`. Genuinely inline, but it is an additive parameter on the charge call — a money-path change for a UX gain. 12-CONTEXT D-59 (cost to the booker) does not clearly favour it: the hosted page's own rail picker is one tap either way.

### Example 3: Discriminating the three payment states without a column

```ts
// getCheckoutSession(id) currently returns { id, status }. `status` is "active" while payable and
// "expired" once retired; the expire helper's own docs note "paid" is a reachable value and is
// never swallowed. That is already a three-way discriminator for D-70 and Pitfall 1:
//
//   booking.status === 'pending'   + session "active"  + hold alive  → NOT COMPLETED (retry in place)
//   booking.status === 'pending'   + session "expired"               → HoldExpiredState (existing)
//   booking.status === 'cancelled' + session "paid"                  → REVERSED (money moved)
//   booking.status === 'cancelled' + session "expired"               → swept unpaid hold (not reversed)
//
// Widening the return to include payments[0].source.type and paid_at also answers the rail
// question (Pitfall 1 option B) and the "date paid" question (Open Question 3) from one call.
//
// ⚠ Verified: there is NO row-level signal that separates a reversed booking from a swept unpaid
// hold. Both land status='cancelled', cancelled_by=NULL, payment_id=NULL, and both may carry a
// non-null checkout_session_id. The in-tx stale-hold sweep writes exactly that shape
// (src/lib/availability/units.ts:484-490). So this probe — or the audit row of option C — is not
// an optimisation; without one of them, D-60's decay makes the reversed state unreachable on a
// refresh and the money truth disappears with the ?paid=1 param.
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `shallow: true` | Native `window.history.pushState`/`replaceState`, router-integrated | Next 14.1; still the documented answer at 16.3 | The only supported way to change the URL without a server round-trip in the App Router. |
| `export const dynamic = 'force-dynamic'` | `connection()` | Next 15 | Not needed here — the route is already dynamic via `params`/`headers()`. |
| `-webkit-print-color-adjust` | `print-color-adjust` (Baseline 2025) | May 2025 | Standard property is now broadly available; the prefix is legacy. |
| Trusting a provider's `Idempotency-Key` header | Expire-before-create | 2026-07-28, probed live | Cost a real ₱735 double-charge on an unrefundable rail before it was found. Any "the key makes this safe" reasoning about PayMongo checkout sessions is false. |

**Deprecated/outdated in this repo:**

- `payment-reversed-state.tsx`'s *"you haven't been charged"* — D-69 corrects it; Pitfall 1 shows it is wrong in two directions on the QRPh path.
- *"Refunds usually land back on your original payment method within a few days"* — appears at `bookings/[id]/page.tsx:522`, `bookings/[id]/cancel/page.tsx:356` and `src/lib/email.ts:341`. Unsourced. The verified table above supersedes it. ⚠ `email.ts` is Phase 15's shell and D-78 forbids touching send triggers — changing a *copy string* is not a trigger, but flag it and let the planner decide whether it lands here or is handed over.

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | Geist as served by `next/font/google` actually applies `tnum`; one source says the Google Fonts build "does not ship the complete OT table" | Open Question 1 | `tabular-nums` is a silent no-op on every money figure in the app, not just the reference. Cheap to measure in a browser; do not assume either way. |
| A2 | PayMongo's published QR Ph refund row reflects a capability change since 2026-07-23 rather than an account-gated feature | Pitfall 1 / Example 1 | If QRPh became API-refundable, `refund-rail.ts` and the D-72 destination form are stale — a bigger finding than this phase, and out of scope to change. Copy must follow observed behaviour regardless. |
| A3 | Placing `/bookings/[id]/receipt` inside the `(app)` group raises no Next.js routing ambiguity | Pattern 2 / structure | `page.tsx`'s header warns that declaring `bookings` in two route groups is "an avoidable routing ambiguity". Different paths should be fine, but this is a `next build` question, not a reasoning question — verify before committing to a layout. |
| A4 | Adding `print:hidden` to `site-chrome.tsx` and `site-footer.tsx` leaves all 52 GATE-VRT baselines byte-identical | Pattern 2 | `print:` compiles only inside `@media print`, so screen rendering is unchanged — but the claim is worth one baseline run rather than one sentence. |
| A5 | Reading the `audit` table from a booker-facing RSC is acceptable | Pitfall 1 option C | It is an operator table by design. The read would be owner-gated and would expose no PII (`meta` is contractually secret-free), but it is a new coupling a reviewer may reject. |

## Open Questions

1. **Does `tabular-nums` do anything under the Google-Fonts build of Geist — and is it the right tool for a Crockford reference anyway?**
   - What we know: `tabular-nums` is applied on ~20 files already, including the reference itself at `bookings/[id]/page.tsx:590`. Geist is documented as supporting tabular figures, and one source claims its figures are tabular by default at the OS/2 level. `Geist_Mono` is already loaded (`--font-mono: var(--font-geist-mono)`) with **zero call sites**.
   - What's unclear: (a) whether the Google Fonts build ships the `tnum` table at all; (b) that `tabular-nums` normalises only **digits** — a `FIT-9K3MP7QZ` reference is mostly letters, so tabular figures alone do not make it fixed-width.
   - Recommendation: measure, don't assume. A Playwright assertion comparing the rendered width of `"11111111"` and `"00000000"` in `font-sans` settles (a) in one test, and it is the same *rendering assertion* shape GATE-STATES already demands. For (b), TRUST-02's intent — a reference that lines up and is easy to read back over the phone — is better served by `font-mono` on the reference specifically. That is a discretionary call (13-CONTEXT lists print/typography mechanics as executor's discretion) but it should be a **decided** call with the measurement attached, not a default.

2. **D-77's "per-head rate × confirmed headcount" applies to open-capacity bookings, not to exclusive-occupancy group bookings — confirm the reading before building it.**
   - What we know: two different things are called "group" in this codebase. **Open-capacity** (Phase 9): `booking.openCapacity = true`, `booking.declaredPax` is *always* the granted head count, `listing.perHeadPriceCents` is the rate, and `quoteOpenCapacity({perHeadPriceCents, heads})` is exactly `perHead × heads`. That receipt is real. **Exclusive group bookings** (Phase 8, D-119): the organiser pays the whole-space price; the RSVP table has **no money column** (`schema.ts:1004`, D-115); headcount is a coordination number that changes after payment.
   - What's unclear: nothing technical — but D-77's wording ("per-head rate × confirmed headcount, issued to the organiser") reads as though it covers both, and its own justification ("RSVP state can change after payment so the list would not match what was charged") is the argument for it covering only the open-capacity case.
   - Recommendation: build the per-head itemisation for `openCapacity = true` rows, using `declaredPax` (the granted passes — what was actually charged), **never** the live RSVP count. For an exclusive group booking, the receipt is the ordinary whole-space receipt issued to the organiser, with no attendee names. Surface this reading to the PM as a one-line confirmation, since it is a product statement rather than a technical one. ⚠ Additional wrinkle: the booking row does **not** store the per-head rate at hold time; `listing.perHeadPriceCents` is the current rate. Render the unit line only on a **positive match** (`perHead × declaredPax === spacePriceCents`), the same idiom `page.tsx` already uses for the pre-0016 `fullDay` fallback, and fall back to a single space-cost line otherwise. Never divide a frozen total to recover a unit.

3. **"Date paid" (D-75) has no column.**
   - What we know: the booking table carries `createdAt` (hold creation), `expiresAt`, `checkoutLockAt` and `cancelledAt` — but **no `paidAt` and no `updatedAt`**. `host_payout_ledger.paidAt` is the host payout, not the booker's charge. `paymongo_event.processedAt` exists but the table stores only `{id, type, processedAt}` with no booking reference, so it cannot be joined.
   - What's unclear: which honest substitute the PM prefers.
   - Recommendation, cheapest first: (a) label the line **"Booked"** and use `booking.createdAt` — truthful, zero cost, and never more than the 15-minute hold TTL away from the charge; (b) fetch `payments[0].attributes.paid_at` via the widened `getCheckoutSession` (Pitfall 1 option B) if the receipt is going to make that call anyway; (c) omit the line. Do **not** label `createdAt` as "Date paid" — on a request-to-book booking it can be days off, and a receipt that misstates a payment date is exactly the "looks official but isn't" failure D-75 is guarding against.

4. **Does the reversed state need to survive `?paid=1`'s removal, and is that in scope?**
   - What we know: D-60 says nothing important may live only in the moment, and D-67 requires the trust block on every status. But the reversed state is currently gated on `status === 'cancelled' && paid === '1'`. Once the param is consumed — or on any later visit — a reversed booking renders the generic `cancelled` branch with no money statement at all (`refundCents` is NULL there), or, for a request-mode booking, the lapsed-approval branch, which the code's own header already flags as a "KNOWN EDGE".
   - Recommendation: treat this as in scope. D-60's own safety argument ("everything it states is repeated on the ordinary detail page") is what makes consuming the param safe, and it is currently false for the reversed state. Example 3 gives the discriminator.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node | build, tests | ✓ | v24.13.0 | — |
| npm | build, tests | ✓ | 11.8.0 | — |
| Playwright | GATE-STATES / GATE-VRT / e2e | ✓ | 1.60.0 | — |
| Vitest | design gates, unit | ✓ | ^4.1.8 (`npm run test:design`) | — |
| PostgreSQL (local, Docker) | every RSC read; e2e seeds | ✓ (per project memory: local env + UAT seed) | 18 + PostGIS | — |
| PayMongo test key | only if Pitfall 1 option B (live probe) is chosen | ✗ in CI by design | — | Rail-free copy (option A) needs no key |
| A monitored support inbox | D-64's `SUPPORT_EMAIL` | ✗ | — | Guarded build + `human_needed` — the decision's own plan |
| Linux VRT image | baseline generation | ✗ locally (Windows) | — | Baselines are generated only in the pinned CI image (D-29); no `/bookings` route is currently baselined |

**Missing dependencies with no fallback:** none. This phase can be planned and executed end-to-end on this machine.

**Missing dependencies with fallback:**
- Support inbox → the guarded-build path is the decision (D-64), not a workaround.
- PayMongo key in CI → GATE-05's price-parity spec is deliberately scoped so its only environment input is `DATABASE_URL`. If a new receipt e2e needs a PayMongo secret, **it has left D-35's boundary and must be split** — the CI job must not be granted the secret. Seed a `confirmed` booking with its frozen money columns directly instead, the way `scripts/seed-baseline-fixtures.ts` already seeds `confirmed` rows.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest ^4.1.8 (unit + design), Playwright 1.60.0 (e2e + VRT) |
| Config file | `vitest.config.ts`, `vitest.design.config.ts`, `playwright.config.ts` |
| Quick run command | `npm run test:design` |
| Full suite command | `npm test && npm run test:design && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BFLOW-08 | `?paid=1` shows the moment once, then the URL is `/bookings/{id}` and a reload renders the ordinary page | e2e | `npx playwright test e2e/confirmation-decay.spec.ts` | ❌ Wave 0 |
| BFLOW-08 | The poller never navigates away after the param is consumed | e2e | same spec, pending-seeded case | ❌ Wave 0 |
| TRUST-01 | Every status renders status + meaning, venue, address, time, host, itemised total, deadline, reference | unit (RTL) | `npx vitest run tests/booking/detail-completeness.test.tsx` | ❌ Wave 0 |
| TRUST-01/STATE-05 | Zero support affordances while `SUPPORT_EMAIL === null`; the new components are guarded correctly | design | `npx vitest run --config vitest.design.config.ts tests/design/site-contacts.test.ts` | ✅ exists — must stay green **unmodified** |
| TRUST-02 | Reference present on every status; copy button writes the exact `FIT-` string | unit | `npx vitest run tests/booking/reference-surface.test.tsx` | ❌ Wave 0 |
| TRUST-02 | `tabular-nums` (or `font-mono`) actually renders fixed-width | e2e (rendering assertion) | `npx playwright test e2e/tabular-figures.spec.ts` | ❌ Wave 0 — see Open Question 1 |
| TRUST-03 | On-screen policy shows concrete dates derived from `LADDER` | unit | `npx vitest run tests/booking/cancellation-policy.test.ts` | ✅ exists — extend to the new call sites |
| TRUST-04 | No forbidden trust string renders (`superhost`, `verified`, `responds within`, `rating`) | design (source scan) | `npx vitest run --config vitest.design.config.ts tests/design/trust-signals.test.ts` | ❌ Wave 0 |
| TRUST-05 | Receipt totals equal the DB's frozen centavos; refund is a separate line | e2e | `npx playwright test e2e/receipt-parity.spec.ts` | ❌ Wave 0 |
| TRUST-05 | Print stylesheet suppresses chrome and leaves the reference + total visible | e2e (`emulateMedia({media:'print'})`) | `npx playwright test e2e/receipt-print.spec.ts` | ❌ Wave 0 |
| STATE-05 | Three states are visibly distinct; not-completed never appears for an expired hold | unit + e2e | `npx vitest run tests/booking/payment-states.test.tsx` | ❌ Wave 0 |
| STATE-05 | Reversed copy never contains the not-completed sentence | design (grep tripwire, two-piece idiom) | `npx vitest run --config vitest.design.config.ts tests/design/reversed-copy.test.ts` | ❌ Wave 0 |
| STATE-06 | The money sentence renders above the fold in all three states, from one component | unit | included in `payment-states.test.tsx` | ❌ Wave 0 |
| STATE-08 | No `toast()` call on any must-read outcome in `bookings/**` | design (AST scan) | extend `tests/design/status-vocab.test.ts` | ✅ exists — extend |
| (cross) | Exactly one `main` landmark on the pending / reversed / lapsed branches | e2e | extend `e2e/shell.spec.ts` with a `pending` seed | ✅ exists — extend (Pitfall 7) |
| (cross) | Every Phase-13 live region is declared, none excluded | design | `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx` | ✅ exists — the 10 exclusions must move (Pitfall 8) |
| (cross) | `drizzle/` still ends at `0025_audit_resolved_by.sql` | design | `npx vitest run --config vitest.design.config.ts tests/design/infra.test.ts` (or a new one-line assertion) | ⚠ verify — GATE-06 is a Phase-17 exit condition but binds from Phase 10 |

### Sampling Rate

- **Per task commit:** `npm run test:design`
- **Per wave merge:** `npm test && npm run test:design && npm run build`
- **Phase gate:** full suite green + the five hard gates for every touched surface, before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `e2e/helpers/seed-payment-states.ts` — seed `pending`, `pending`+live-hold, `cancelled`-reversed and `confirmed`-with-frozen-money rows. Every payment-state test depends on it; today only `confirmed` rows are seeded anywhere.
- [ ] `tests/design/trust-signals.test.ts` — the TRUST-04 forbidden-string scan. Must use the two-piece string idiom (`price-surface.test.ts`'s rule) so the test cannot disarm its own grep.
- [ ] `tests/design/reversed-copy.test.ts` — same idiom, for the D-69 sentence.
- [ ] `e2e/confirmation-decay.spec.ts`, `e2e/receipt-parity.spec.ts`, `e2e/receipt-print.spec.ts`, `e2e/tabular-figures.spec.ts`
- [ ] `tests/booking/payment-states.test.tsx`, `tests/booking/detail-completeness.test.tsx`, `tests/booking/reference-surface.test.tsx`
- [ ] Constant bumps that are part of the work, not chores: `loading-coverage.test.ts` 28/20/8 → 29/21/8; `live-regions.ts` exclusion count; `selector-contract.ts` rows for any new `data-testid`; `ALLOWED_RAW_CARD` if a raw `<Card>` is used.

## Security Domain

`security_enforcement: true`, `security_asvs_level: 1`, `security_block_on: "high"`.

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | yes | Better Auth session via `auth.api.getSession({ headers })`. Unchanged — the new receipt route must repeat the pattern, not invent one. |
| V3 Session Management | no (unchanged) | No session behaviour changes in this phase. |
| V4 Access Control | **yes — the load-bearing one** | **T-04-CONFIRMIDOR.** The receipt route is a new money surface and must repeat the owner gate verbatim: load the booking, `notFound()` unless `booking.bookerId === session.user.id`, and return the **same bare 404** for a missing row and a stranger's row. The route group is *not* the gate. The group page's header states this rule for its own route and is the model to copy. |
| V5 Input Validation | yes | Only two inputs: the opaque `id` path param (used as an equality key, never interpolated into raw SQL by hand) and `?paid=1` (compared to the literal `"1"`, never rendered). If a `mailto:` subject interpolates the reference, `encodeURIComponent` it. |
| V6 Cryptography | yes | `bookingReference` is a one-way SHA-256 over the opaque id, non-sequential and non-enumerable (T-04-ENUMID). Do not "improve" it into anything reversible, and do not put the reference in a URL as an access key — the opaque UUID is the token, the reference is a label. |
| V7 Error Handling & Logging | yes | The `audit` table's `meta` is contractually secret-free and PII-free (D-72: *"no account name, no BIC — not in this audit meta, not in any log line, not in any column"*). If Pitfall 1 option C is taken, the new `auto_refund_ok` meta must carry only `{bookingId, method, amountCents}`. |
| V8 Data Protection | yes | D-63 renders the booker's **own** full email on their **own** owner-gated page — exposure is nil by construction. D-77 forbids attendee names on a printable financial document. The organiser roster reads are already organizer-scoped inside their own SQL; never filter a foreign roster in JS after reading it. |

### Known Threat Patterns for Next.js RSC + PayMongo

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| IDOR on the new receipt route | Elevation of Privilege | Owner gate in the RSC; identical bare 404 for missing and foreign rows (T-04-CONFIRMIDOR). |
| Booking-id enumeration | Information Disclosure | Opaque `randomUUID` in the URL; the `FIT-` reference is display-only and one-way derived (T-04-ENUMID). |
| Trusting `?paid=1` as proof of payment | Spoofing | PROJECT D-57 — the webhook is the sole confirm authority. Consuming the param must not move any branch off DB status. |
| Money computation crossing to the client | Tampering | GATE-05 / D-130. `service-fee.ts` carries `import "server-only"`; the AST boundary test plus the DB-vs-DOM price e2e are the two halves. A client may receive money as a pre-formatted string, never the inputs to compute one. |
| Double-charge on a retry (D-70) | Tampering / financial | Expire-before-create in `confirmBooking` + the checkout lease. `Idempotency-Key` is **not** a guard on `POST /v1/checkout_sessions` — probed. |
| Held money with no queryable record | Repudiation | `audit` rows with `outcome: "needs_attention"` are the operator queue. If a UI change makes a held-money case *look* resolved to the booker while no row exists, that is a regression in the money trail, not a copy change. |
| Fabricated support contact | Spoofing (of the business) | D-26/D-64 and the inverted gate. A published address nobody reads is worse than none. |

## Sources

### Primary (HIGH confidence)

- `docs.paymongo.com/docs/payment-acceptance-refunds` (and its `.md` form) — the per-method refund table: partial-refund eligibility, refund window, **time to reflect**; the payout-deduction note; the UBP restriction. Fetched 2026-08-20.
- `nextjs.org/docs/app/getting-started/linking-and-navigating` § Native History API (docs version 16.3.1, lastUpdated 2026-08-18) — `pushState`/`replaceState` integrate into the Next.js Router and sync with `usePathname`/`useSearchParams`.
- `nextjs.org/docs/app/api-reference/functions/use-router` (16.3.1) — `router.refresh()` semantics; `bfcacheId` behaviour on search-param-only navigations.
- `developer.mozilla.org/en-US/docs/Web/CSS/print-color-adjust` — initial value `economy`; UA may drop backgrounds and adjust text colour when printing; Baseline 2025.
- `tailwindcss.com/docs/hover-focus-and-other-states` — the `print:` variant compiles to `@media print`; no `print-color-adjust` utility exists.
- **The FitOut codebase itself**, read directly: `src/app/(app)/bookings/[id]/page.tsx`, `src/app/api/paymongo/webhook/route.ts`, `src/lib/paymongo.ts`, `src/lib/payments/refund-rail.ts`, `src/lib/db/schema.ts`, `src/lib/booking/{reference,all-in-table,pricing}.ts`, `src/lib/site.ts`, `src/lib/design/{live-regions,selector-contract,visual-baselines,status-tones}.ts`, `tests/design/{site-contacts,leak,token-drift,card-pattern-coverage,loading-coverage,price-surface}.test.ts`, `e2e/{shell,price-parity}.spec.ts`, `src/app/globals.css`, `src/app/actions/booking.ts`, `src/lib/availability/units.ts`.
- Project memory `paymongo-idempotency-not-honored.md` — the live probe and the ₱1,470 double-charge that produced the expire-before-create rule.

### Secondary (MEDIUM confidence)

- `paymongo.help` "Refunding payments" (via search snippet) — independently corroborates card = up to 30 days, e-wallets = within 24 hours, BPI = at least 3 banking days, BDO/Metrobank/Landbank = up to 5 banking days.
- `lexingtonthemes.com/blog/geist-opentype-features` / `fontcompressor.com/blog/geist-font-guide` (via search snippets) — Geist supports `tnum` and its figures are tabular at the OS/2 level; **the Google Fonts build may not ship the complete OT table**. This is the source of Assumption A1 and is exactly why Open Question 1 asks for a measurement.

### Tertiary (LOW confidence)

- General community guidance on App Router shallow routing (GitHub discussions #48110/#18072, various blog posts). Used only to confirm that the official Native History API section is the current answer; nothing is asserted on their authority alone.

## Metadata

**Confidence breakdown:**

- Standard stack: **HIGH** — no new packages; every recommendation is a file already in the repo, read directly.
- Refund timing (D-69's fact): **HIGH** for card/GCash/Maya from PayMongo's own docs, cross-verified against their help centre. **HIGH** on the finding that QRPh's documented row does not describe FitOut's actual behaviour, because the contradicting evidence is a verbatim HTTP 400 recorded in this repo.
- `?paid=1` mechanism: **HIGH** — official Next.js docs at 16.3.1, and the failure mode is derived from `router.refresh()`'s documented semantics plus the shipped poller's source.
- Print CSS: **HIGH** on the mechanism (`print:` variant, `print-color-adjust: economy`); **MEDIUM** on the claim that the 52 VR baselines are unaffected (A4 — one run settles it).
- Design-gate constraints: **HIGH** — every rule was read from the test source, including the AST predicates that decide "guarded", "raw Card", and "qualifying route".
- Data gaps (rail, paidAt, reversed-vs-swept): **HIGH** — each verified by reading the writing statement, not by absence of a grep hit.
- Tabular figures: **MEDIUM** — the mechanism is certain, the font's behaviour under the Google Fonts build is not.

**Research date:** 2026-08-20
**Valid until:** 2026-09-19 for the Next.js/Tailwind/MDN facts (stable). **7 days for the PayMongo refund table** — it is provider-published, already disagrees with this project's own live probe on one row, and is the single most consequential input to D-69.
