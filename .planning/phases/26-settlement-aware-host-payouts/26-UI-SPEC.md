---
phase: "26"
slug: "settlement-aware-host-payouts"
status: draft
shadcn_initialized: true
preset: radix-nova
created: "2026-09-29"
---

# Phase 26 — UI Design Contract

> Visual and interaction contract for settlement-aware host earnings. Phase 25.1 production payout release remains HOLD; a design, test fixture, or status label is not evidence that money has moved.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | shadcn, already initialized |
| Preset | `radix-nova`, neutral base, CSS variables, React Server Components |
| Component library | Radix primitives through project-local shadcn components |
| Icon library | Lucide |
| Font | Geist Sans through `--font-sans`; heading aliases the same family |
| Styling | Tailwind v4 and Court semantic tokens in `src/app/globals.css` |

Source: `components.json`, `src/app/globals.css`, `src/app/(host)/host/earnings/page.tsx`, `26-RESEARCH.md`, and the Court-only decision in `26-CONTEXT.md` / PROJECT.md D-279. Retain `HOST_LIST_SHELL`, `PageHeader`, `PanelCard`, `EmptyState`, desktop `Table`, mobile `RowCard`, `RowListSkeleton`, and the existing payout setup and hosting-paused notices. Court is the only design and verification target; legacy alternate-theme code may remain until scoped cleanup. No new theme, token, font, package, route, or payment control is needed. The installed shadcn CLI `info` command was attempted locally on 2026-09-29 but returned no result before it was stopped; the checked-in configuration and installed package establish the preset.

---

## Component Inventory

Enumerated by `$count = (Get-ChildItem -LiteralPath 'src/components/ui' -File -Filter '*.tsx').Count; $version = (Get-Content -LiteralPath 'node_modules/shadcn/package.json' -Raw | ConvertFrom-Json).version; "$count components — shadcn@$version"` — 32 components — shadcn@4.10.0 — 2026-09-29.

This is a non-exhaustive list of known-good local components, never a closed allowlist. Check the installed component before using one outside this table.

| Component | Import path | Phase-26 use |
|-----------|-------------|--------------|
| Table family | `@/components/ui/table` | Existing desktop earnings columns and semantic headers |
| Badge | `@/components/ui/badge` | Calm icon-and-text payout statuses |
| Alert | `@/components/ui/alert` | Genuine needs-attention message and existing host notices |
| Button | `@/components/ui/button` | Existing payout setup CTA and explicit retry on an error boundary only |
| Card | `@/components/ui/card` | Already composed by `PanelCard` and `RowCard`; do not nest a new card around each status |
| Skeleton | `@/components/ui/skeleton` | Already composed by `RowListSkeleton` |
| RowCard | `@/components/patterns/row-card` | Existing terminal mobile earnings row; no invented link |
| PanelCard | `@/components/patterns/panel-card` | Existing two summary figures |
| EmptyState | `@/components/patterns/empty-state` | No confirmed earnings |
| PageHeader | `@/components/patterns/page-header` | Existing Earnings heading |
| PayoutBanner | `@/components/host/payout-banner` | Existing setup and paused-account action, separate from booking settlement |

---

## Spacing Scale

Reuse the existing multiples-of-four scale. Do not add a spacing token or disturb the page shell.

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Icon-to-status-label gap |
| sm | 8px | Row metadata and money breakdown rhythm |
| md | 16px | Card padding, table cells, status-to-explanation gap |
| lg | 24px | Notice and summary separation |
| xl | 32px | Summary-to-list lead-in |
| 2xl | 48px | Existing summary-to-history section break |
| 3xl | 64px | Existing page-level desktop rhythm |

Exceptions: preserve the existing `HOST_LIST_SHELL` and component-derived spacing even when its utility is an intermediate multiple of four; any actionable control retains the project 44×44px touch-target floor. The 44px target is a hit-area constraint, not a new spacing token.

---

## Typography

Use exactly Court's four existing semantic roles and two weight roles. Named `text-*` roles carry their own leading and tracking, so do not add a competing line-height utility.

| Role | Size / line height | Weight role | Usage |
|------|--------------------|-------------|-------|
| Label | 14px / 1.43 | regular | Status explanations, date metadata, table labels |
| Body | 16px / 1.5 | regular | Schedule explanation, empty and error body |
| Heading | 20px / 1.3 | emphasis | Empty/error headings only |
| Display | 28px / 1.15 | emphasis | Existing page heading and summary figures |

The only weight roles are regular (400) and emphasis (600), resolved from Court's existing tokens. Preserve `tabular-nums` on every amount and date. Use `text-foreground` for status meaning and `text-muted-foreground` for supporting copy; no meaning relies on weight or color alone. Source: `src/app/globals.css`, `26-CONTEXT.md` decision 6, PROJECT.md D-279, and the existing Phase-22 UI contract.

---

## Color

Use Court's existing 60/30/10 contract, resolved through CSS variables. Values below identify existing tokens, not new colors.

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `--background`: `oklch(1 0 0)`; `--card`: `oklch(1 0 0)` | Page canvas and earnings surfaces |
| Secondary (30%) | `--muted` / `--secondary`: `oklch(0.97 0 0)` | Summary panels, neutral badges, row separation and explanatory notices |
| Accent (10%) | `--brand`: Court coral `oklch(0.58 0.208 25)` | Existing site brand CTA outside the earnings status area only |
| Destructive | `--destructive`: `oklch(0.535 0.215 27.325)` | Genuine failed-transfer or account-blocking attention; never ordinary settlement waiting |

Accent reserved for: existing opt-in brand primary actions elsewhere in FitOut. This earnings view has no new brand CTA. Paid uses the existing `--success` icon on a neutral badge with full-contrast text; waiting, scheduled, processing, and refunded are neutral with distinct icon and text. A missed cutoff or platform funding delay uses a neutral attention treatment until an actual failure is confirmed. Focus remains the existing neutral `--ring`, never brand. Source: `src/app/globals.css`, `payout-state-badge.tsx`, and Phase-22 UI contract.

---

## Copywriting Contract

Use plain host-facing language: “payment clearing,” “payout,” and “Friday,” while omitting provider IDs, Wallet balances, transfer fees, raw account details, and internal incident causes. Every amount and date is produced server-side. The 24-hour period is a minimum review window, not the payment date or a chargeback guarantee. Source: `26-CONTEXT.md` decisions 1–4 and HPAY-05/06.

| Element | Copy |
|---------|------|
| Page heading | `Earnings` |
| Schedule explanation | `We send eligible payouts on Fridays after the booking payment reaches FitOut and at least 24 hours after the session ends.` |
| Primary CTA | `Set up payouts` only in the existing not-started setup banner; `Finish payout setup` or `Review payout details` remain the existing contextual labels. No action CTA appears on an otherwise healthy earnings row. |
| Summary caption, pending | `Pending earnings` |
| Summary qualifier | `Includes estimated amounts for confirmed bookings that have not reached payout processing. Cancellations or fees may change them.` Show only if at least one estimate is included. |
| Summary caption, paid | `Paid out` |
| Confirmed, session not yet ended | `Session upcoming` / `Your payout can be reviewed after the session ends.` |
| Confirmed, review window still open | `Review window` / `Your session has ended. Payout review continues for at least 24 hours.` |
| Confirmed, settlement unverified | `Payment clearing` / `The guest's payment is confirmed. We're waiting for it to reach FitOut before scheduling your payout.` |
| Verified settlement, eligible future Friday | `Scheduled` / `Next eligible release: {Fri, Mon D, YYYY} at 12:00 Manila time.` Add `Subject to final payout checks.` as adjacent muted text. |
| Verified settlement, missed current Friday cutoff | `Scheduled` / `Next eligible release: {next Fri, Mon D, YYYY} at 12:00 Manila time.` Use only if the next cohort is backed by a current deposited observation. |
| Post-claim transfer awaiting terminal read-back | `Processing` / `We're sending your payout. We'll update this page when it's confirmed.` No expected-arrival date. |
| Provider-confirmed terminal success | `Paid` / `Paid {Mon D, YYYY}` using the actual paid instant. Do not use “Paid” for a created or in-flight transfer. |
| Refunded booking, no host payout | `Refunded` / `This booking was refunded — no payout.` Show actual refund date only when known. |
| Failed transfer or unresolved payout exception | `Needs attention` / `We're checking a delay with this payout. You don't need to request it again.` If the host must update their payout destination, use the existing `Review payout details` route action. |
| Preclaim amount label | `Estimated payout` with the server-derived amount and estimate qualifier; after ledger claim, `Your payout` with the frozen ledger amount. If a defensible estimate is unavailable, show `Amount being confirmed` and omit that row from the pending total. |
| Empty state heading | `No earnings yet` |
| Empty state body | `Confirmed bookings will appear here. Eligible payouts are sent on Fridays after the session review window and after the payment reaches FitOut.` No empty-state CTA; payout setup already has its own banner. |
| Error state | `We couldn't load your earnings. Try again.` with a neutral `Try again` button that retries the earnings route. Do not render stale totals as fresh. |
| Destructive confirmation | None. This phase adds no host-facing destructive payout action. Existing cancellation/refund confirmations retain their own contract. |

Never use `Expected {date}` for a preclaim or unverified-settlement row, and never derive an exact Friday from `endsAt + 24 hours` alone. When settlement is returned, stale, inaccessible, or contradicted, remove a previously displayed future Friday and return to `Payment clearing` or `Needs attention` as the evidence permits. Never show a provider payout's deposit as a host `Paid` event. The 24-hour copy in the current earnings empty state and `Held until after the session` helper must be replaced across desktop and mobile. Preserve “FitOut commission (10%)” rather than booker-facing “service fee.” The preclaim `No payout yet` cell in `/host/bookings` and `/host/bookings/[id]` must not contradict a pending earnings row for a confirmed booking; use the same projected status vocabulary there when those routes show payout status.

---

## Interaction Contract

1. `/host/earnings` remains a server-rendered, owner-scoped status page. Include each confirmed booking before `host_payout_ledger` has a payout claim. Merge its projected row with any later ledger row by booking ID so one booking appears once. Newest booking first; existing desktop table at `md` and mobile stacked `RowCard` remain the layout. Rows stay terminal and are not links.
2. Keep the visible hierarchy: `PageHeader`; existing hosting-paused notice when applicable; existing payout setup banner when applicable; two summary panels; commission/schedule explanation; earnings list. The primary visual anchor is the `Pending earnings` amount in the first summary panel, using the existing display role and tabular numerals; `Paid out` is its secondary peer. The notices explain independent gates and must not hide confirmed earnings. Cancellation-fee notice remains next to totals.
3. Replace desktop `Expected` column with `Payout timing`. Its cell shows the same status-specific text as mobile. Render one status badge/alert and one adjacent explanation per row in both layouts. For an evidence-backed future Friday, display full day, month, year and `12:00 Manila time`; a venue-local booking date remains separate and cannot be mistaken for the Manila release clock.
4. The `Pending earnings` total may combine server-projected preclaim estimates and frozen held/processing amounts, but must label its estimate qualification and exclude refunded, failed, and amount-unknown rows. `Paid out` sums only provider-confirmed paid ledger rows. Host-debit netting and partial cancellations must affect the displayed estimate or freeze as the money model allows; the UI never recomputes a percentage. Preserve gross, commission, and net breakdown for frozen rows. A projected row must not masquerade as a frozen ledger record.
5. Review window, clearing, scheduled, processing, paid, refunded, and needs-attention labels map from authoritative booking/settlement/ledger evidence, not from elapsed time alone. Unknown Wallet funds, unverified destination, suspension, or an unresolved provider read cannot produce a `Paid` label or an off-cycle date. Only a terminal transfer read-back can produce `Paid`.
6. A verified deposited observation and an account-validated Friday release policy support the next eligible Friday, subject to the hold and Friday-noon cohort gate. Friday 12:00–23:00 retries apply to that cohort only. A booking crossing the hold or settling after noon joins the following Friday; an after-23:00 deposit cannot silently move into an off-cycle payout. When proof is lost or reversed, withdraw the date and leave a durable ops exception without leaking its raw cause to the host.
7. No new “Pay now,” “Release payout,” “Retry transfer,” or refresh polling control is exposed to hosts. Existing `PayoutBanner` actions still route to `/host/payouts` only for setup/destination issues. A genuine failed earnings route load has the one neutral `Try again` action. Status updates appear on a subsequent navigation or server refresh; no live-money animation or optimistic `Paid` state.
8. The terms page is currently a nonbinding placeholder with a source/test gate (`src/app/(legal)/terms/page.tsx`, `tests/design/legal-copy.test.ts`). Do not put an operative payout clause into that placeholder or remove its notice alone. Before launch, an approved published terms replacement must say the Friday-after-receipt rule and review hold and pass that separate legal publication gate. Until then, the placeholder and Phase 25.1 HOLD stay explicit; Phase 26 copy must not assert that a binding clause already exists.

---

## UI Considerations

The post-verification probe covers three surface kinds: the owner-scoped earnings list (`list-collection`); summary panels, notices, headings, badges, dates, and explanatory copy (`static-content`); and payout-setup links plus the route-error retry button (`interactive-control` and `nav`). There is no earnings-page form or media surface. All **13 applicable** considerations are resolved: **8 explicit**, **5 backstop**, **0 unresolved**. Empty and error copy remains in the Copywriting Contract above.

### Explicit truths

- Earnings list / empty — Zero confirmed bookings render `No earnings yet`; a confirmed booking without a payout-ledger claim renders a populated row.
- Earnings list / loading — The existing earnings `loading.tsx` renders `PageHeader` and `RowListSkeleton` without presenting totals as current data.
- Earnings list / error — A failed earnings read renders the neutral error copy and `Try again` control without stale totals or provider details.
- Earnings list / populated — Each confirmed booking appears once with owner-scoped status, supported amount, and timing in both the desktop table and mobile card.
- Earnings list / partial — Missing settlement proof removes the exact Friday; an unknown amount says `Amount being confirmed` and is excluded from the pending total.
- Earnings list / zero-one-many — Zero bookings use the empty state, one renders one row, and many remain newest-first with one row per booking.
- Earnings actions / loading — Before the earnings route resolves, the loading shell shows no payout or retry control and no optimistic payout action appears.
- Earnings actions / error — The earnings error control retries the route while the error remains visible until a fresh successful read; payout setup links go only to `/host/payouts` and never claim success.

### Backstop truths

- { statement: "Earnings list / overflow — Browser evidence at 320px in Court must show long space titles and statuses wrapping or truncating without horizontal page overflow, while amounts and dates remain readable.", verification: backstop }
- { statement: "Static information / overflow — Browser evidence at 320px in Court must show summary panels, notices, badges, and explanatory text inside the page shell without horizontal overflow.", verification: backstop }
- { statement: "Static information / long-text — Browser evidence must show long schedule explanations, notice text, and supported Friday labels wrapping without clipping amounts, statuses, or dates.", verification: backstop }
- { statement: "Earnings actions / overflow — Browser evidence at 320px in Court must show setup and retry controls retaining a 44px hit area inside the viewport without covering totals or rows.", verification: backstop }
- { statement: "Earnings actions / long-text — Browser evidence must show long setup and retry labels wrapping without clipping, hiding focus, or displacing the control outside the page shell.", verification: backstop }

Additional domain checks: every status badge or alert pairs a distinct icon with visible text, and `Paid` is determined by terminal transfer evidence. Booking dates use the venue timezone; release timing explicitly says `Manila time` and includes a full year when a Friday date is shown.

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | Existing local `Table`, `Badge`, `Alert`, `Button`, `Card`, `Skeleton`; no new block | Existing installed components; no new registry import on 2026-09-29 |
| Third-party | none (`components.json` has `registries: {}`) | Not applicable on 2026-09-29 |

---

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS
- [x] Dimension 7 Inventory Provenance: PASS

**Approval:** approved 2026-09-29
