# Phase 13: Confirmation, Bookings & Trust — Pattern Map

**Mapped:** 2026-08-20
**Files analyzed:** 33 (11 net-new source files · 12 modified source files · 10 Wave-0 test files)
**Analogs found:** 30 / 33 (exact 14 · role-match 16 · none 3)

> **How to read this.** Every excerpt below is copied verbatim from a file that ships today, with its
> real path and line range. Where a decision forbids copying an analog wholesale (the nested `<main>`,
> the `?paid=1` gate, the "you haven't been charged" string), the excerpt is annotated **COPY THE SHAPE,
> NOT THE LINE** and the correction is stated inline. Planner: cite the analog path + line range in the
> plan action, not the word "follow the pattern".

---

## File Classification

### Net-new source files

| New file | Role | Data flow | Closest analog | Match |
|----------|------|-----------|----------------|-------|
| `src/components/booking/not-completed-state.tsx` (D-70) | component (server) | request-response, terminal render | `src/components/booking/hold-expired-state.tsx` | **exact** |
| `src/components/booking/money-statement.tsx` (D-73) | component (server, presentational) | transform (finished string → DOM) | `src/components/booking/refund-breakdown.tsx` | **exact** |
| `src/components/booking/support-path.tsx` (D-64) | component (server, guarded) | transform | `src/components/patterns/site-footer.tsx:185-196` | **exact** |
| `src/components/booking/trust-block.tsx` (D-67/D-68) | component (server) | request-response (props from RSC) | `src/components/booking/cancellation-policy-disclosure.tsx` | role-match |
| `src/components/booking/booking-reference.tsx` (D-78) | component (**client**) | event-driven (clipboard) | `src/components/group/share-link-box.tsx` | **exact** |
| `src/components/booking/consume-paid-param.tsx` (D-60/D-89) | component (**client**, effect-only) | event-driven (mount effect) | `src/components/booking/hold-expired-state.tsx:62-65` | role-match |
| `src/components/booking/confirmation-moment.tsx` (D-61/D-62/D-63) | component (server) | request-response | `bookings/[id]/page.tsx:579-624` (confirmed branch) | **exact** |
| `src/components/booking/receipt-lines.tsx` (D-76/D-77/D-86) | component (server, zero-arithmetic) | transform | `src/components/booking/refund-breakdown.tsx` | **exact** |
| `src/app/(app)/bookings/[id]/receipt/page.tsx` (D-74) | route (async RSC) | request-response, CRUD-read | `src/app/(app)/bookings/[id]/cancel/page.tsx` | **exact** |
| `src/app/(app)/bookings/[id]/receipt/loading.tsx` (Pitfall 6) | route skeleton | render-only | `src/app/(app)/bookings/[id]/cancel/loading.tsx` | **exact** |
| `src/lib/booking/refund-window.ts` (D-83) — *discretionary* | lib module (isomorphic constant) | transform | `src/lib/payments/refund-rail.ts` + `src/lib/site.ts` | role-match |

### Modified source files

| Modified file | Role | Data flow | What changes | Analog for the change |
|---------------|------|-----------|--------------|-----------------------|
| `src/app/(app)/bookings/[id]/page.tsx` (688 L) | route (async RSC) | request-response | D-60/61/62/63/67/78/87/89; select widening | itself (branch idiom at `:266`, `:404`, `:441`, `:579`) |
| `src/components/booking/payment-reversed-state.tsx` (46 L) | component | terminal render | D-83 copy branch + `main`→`div` (D-88.1) | `hold-expired-state.tsx` |
| `src/components/booking/pending-payment-state.tsx` (76 L) | component (client, poller) | polling | D-71 copy only + `main`→`div` (D-88.1) | itself — mechanics **frozen** |
| `src/components/booking/expired-approval-state.tsx` (160 L) | component (client) | terminal render | `main`→`div` only (D-88.1) | `bookings/[id]/loading.tsx:14-15` |
| `src/lib/paymongo.ts:318-332` | lib (HTTP client) | request-response (3rd-party) | D-84 widen `getCheckoutSession` + timeout | `expireCheckoutSession`'s probe (`:271-317`) |
| `src/lib/design/live-regions.ts` (834 L) | config/inventory | source-scan contract | D-88.2 — 10 exclusions → declarations | `LIVE_REGIONS["calendar-day-loading"]` (`:438-455`) |
| `src/app/(app)/bookings/[id]/cancel/page.tsx:356` | route | request-response | D-83 supersedes "within a few days" | `13-RESEARCH.md` Example 1 table |
| `src/app/(app)/bookings/[id]/group/page.tsx` | route | request-response | D-79 design-system pass only | Phase-11 patterns |
| `src/app/(public)/invite/[token]/page.tsx` | route | request-response | D-79 design-system pass only | `src/components/group/invite-card.tsx` |
| `src/components/patterns/site-chrome.tsx`, `site-footer.tsx` | component | render-only | `print:hidden` (Pattern 2) | RESEARCH Pattern 2 |
| `tests/design/loading-coverage.test.ts:181-183` | config pin | source-scan | 28/20/8 → 29/21/8 | itself |
| `e2e/shell.spec.ts:501-600` | test (e2e) | seed + assert | add a `pending` seed (D-88.1) | itself |

### Wave-0 test files (all net-new)

| New test | Role | Data flow | Closest analog | Match |
|----------|------|-----------|----------------|-------|
| `tests/design/trust-signals.test.ts` | test (design, source scan) | source-scan | `tests/design/price-surface.test.ts` (two-piece idiom) | **exact** |
| `tests/design/reversed-copy.test.ts` | test (design, source scan) | source-scan | `tests/design/price-surface.test.ts` | **exact** |
| `e2e/helpers/seed-payment-states.ts` | test helper | DB seed | `e2e/shell.spec.ts:544-570` + `e2e/helpers/booker-seed.ts` | role-match |
| `e2e/receipt-parity.spec.ts` | test (e2e) | DB-vs-DOM assert | `e2e/price-parity.spec.ts:262-334` | **exact** |
| `e2e/receipt-print.spec.ts` | test (e2e) | media emulation | `e2e/reduced-motion.spec.ts` | role-match |
| `e2e/confirmation-decay.spec.ts` | test (e2e) | URL-state assert | `e2e/shell.spec.ts` (seeded describe) | role-match |
| `e2e/tabular-figures.spec.ts` | test (e2e) | rendering measurement | `e2e/skeleton-geometry.spec.ts` | role-match |
| `tests/booking/payment-states.test.tsx` | test (RTL unit) | render assert | `tests/booking/hold-expired-state.test.tsx` | **exact** |
| `tests/booking/detail-completeness.test.tsx` | test (RTL unit) | render assert | `tests/booking/cancellation-copy.test.tsx` | **exact** |
| `tests/booking/reference-surface.test.tsx` | test (RTL unit) | render assert | `tests/booking/partial-grant-notice.test.tsx` | role-match |

---

## Pattern Assignments

### 1. `src/components/booking/not-completed-state.tsx` (component, terminal render) — D-70

**Analog:** `src/components/booking/hold-expired-state.tsx` — the calm-recovery idiom. **This is the
template.** D-70's state is its sibling, not its duplicate: `HoldExpiredState` owns the *dead hold*,
`NotCompletedState` owns the *live hold that wasn't paid on*.

**Imports + core pattern** (`hold-expired-state.tsx:50-92`, verbatim):

```tsx
import * as React from "react";
import Link from "next/link";
import { TimerOffIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function HoldExpiredState({ listingId }: { listingId: string }) {
  const recoveryRef = React.useRef<HTMLAnchorElement | null>(null);
  React.useEffect(() => {
    recoveryRef.current?.focus();
  }, []);

  return (
    <Card>
      <CardContent role="status" className="flex flex-col items-center gap-4 py-10 text-center">
        <TimerOffIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        <div className="space-y-1">
          <h2 className="text-xl font-semibold">Your hold expired</h2>
          <p className="mx-auto max-w-prose text-sm text-muted-foreground">
            We released the slot so someone else could book it. It might still be free — check availability
            again.
          </p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          {/* The single coral recovery primary (UI-SPEC accent #3 — the one coral focal point here). */}
          <Button asChild variant="brand">
            <Link ref={recoveryRef} href={`/listings/${listingId}`}>
              Back to availability
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/">Search other spaces</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

**Copy exactly:** the icon-muted / `role="status"` / `max-w-prose` / one-coral-primary structure; the
`size-8 text-muted-foreground` icon treatment; **never `--destructive`**.

**Do NOT copy:** the icon (`TimerOffIcon` is the expired state's — RESEARCH § Supporting names a *muted*
glyph for not-completed, **never an alarm glyph**); the CTA target (D-70's primary is the retry link, not
`/listings/{id}`).

**Retry CTA** — route it through the shipped action, never a second minting path (RESEARCH Example 2):

```tsx
<Button asChild variant="brand" className="w-full">
  <Link href={`/listings/${listingId}/book?hold=${bookingId}`}>Try paying again</Link>
</Button>
```

That is byte-shape-identical to the `approved` branch's existing pay CTA at
`src/app/(app)/bookings/[id]/page.tsx:384-386`.

**Container:** this file is **not** on `ALLOWED_RAW_CARD`. Compose `PanelCard`, or add a row with a
>40-character reason in the same commit (see § Shared Pattern D).

---

### 2. `src/components/booking/support-path.tsx` (component, guarded) — D-64

**Analog:** `src/components/patterns/site-footer.tsx:185-196` — the **only** working `SUPPORT_EMAIL !== null`
guard in the tree.

**The guard, verbatim** (`site-footer.tsx:185-196`):

```tsx
{/* THE GUARD, AND IT HAS NO ELSE-BRANCH ON PURPOSE (D-26). While `SUPPORT_EMAIL` is
    `null` this renders nothing at all — not a placeholder, not a disabled link. The
    address is INTERPOLATED from the constant and never retyped, which is the half
    `tests/design/site-contacts.test.ts` checks structurally the moment the constant is
    set: exactly one such link, and it must read the constant rather than a literal. */}
{SUPPORT_EMAIL !== null ? (
  <li>
    <a href={`mailto:${SUPPORT_EMAIL}`} className={LINK_CLASS}>
      Support
    </a>
  </li>
) : null}
```

**Import line** (`site-footer.tsx:79`):

```tsx
import { SITE_TAGLINE, SUPPORT_EMAIL } from "@/lib/site";
```

**Three properties that make this the only correct shape** (RESEARCH Pattern 3 / Pitfall 4 — the scanner
walks each file's AST independently and matches literal offsets against guard ranges **in the same file**):

1. **The guard lives in the same file as the `mailto:`.** Taking `supportEmail` as a **prop** from a
   guarded parent leaves an unguarded literal and turns `unguardedMailto(scan)` red. This is the single
   most likely way to trip the gate.
2. **Conditional expression or `&&`, never an early return.** The scanner recognises
   `ts.isConditionalExpression` and `ts.isBinaryExpression` with `&&`. An `if (SUPPORT_EMAIL === null)
   return null;` is an `IfStatement` and registers **no guard at all**.
3. **The false branch is the bare `null` keyword** — `hasElseBranch` is
   `node.whenFalse.kind !== ts.SyntaxKind.NullKeyword`.

**`SUPPORT_LABEL` is `/\bSupport\b/`** — capitalised and word-bounded. Sentence-case *"Contact support"* in
body copy is invisible to the scan; a heading or button reading **`Support`** needs the guard.

**Verified safe to add many call sites:** the non-null branch counts `mailto:` usages in the **footer only**
(`mailtoUsages(FOOTER, footerSource)`), and the one-conditional/no-else assertions filter on `g.file ===
FOOTER`. `[VERIFIED: tests/design/site-contacts.test.ts:528-660 via 13-RESEARCH]`

**Constant it reads** (`src/lib/site.ts:70`) — the one line that ever changes:

```ts
export const SUPPORT_EMAIL: string | null = null;
```

⚠ **Never weaken, skip, invert or add an exclusion row to `tests/design/site-contacts.test.ts`.** D-64
forbids it in three separate sentences. Also do not introduce an address-shaped literal anywhere (a
placeholder example address in copy) — that needs an `EXCLUDED_ADDRESSES` row with a >40-char reason.

---

### 3. `src/components/booking/money-statement.tsx` (component, presentational) — D-73

**Analog:** `src/components/booking/refund-breakdown.tsx:1-45` — the pre-formatted-string prop contract.

**Header contract to restate in the new file** (`refund-breakdown.tsx:3-15`):

```
// THE ZERO-ARITHMETIC CONTRACT, inverted in direction from PriceBreakdown but identical in substance: every
// figure arrives as a PRE-FORMATTED, server-computed string. This component does not add, subtract, round,
// percentage, compare or format a single number. …
// If you find yourself wanting a `number` prop here, the arithmetic belongs in the RSC.
//
// Semantics: a `<dl>` with associated `<dt>`/`<dd>` pairs …
//
// Pure display, no hooks → a Server Component (no "use client").
```

**Prop shape** (`refund-breakdown.tsx:19-33`) — label strings, never cents:

```tsx
export type RefundBreakdownProps = {
  /** All-in amount charged (booking.quotedTotalCents), e.g. "₱1,050". */
  paidLabel: string;
  …
  /** Always "₱0" — the service fee is never refunded (D-74). A prop, not a literal, so currency follows. */
  serviceFeeRefundLabel: string;
};
```

**Apply to `MoneySentence`:** each of the three payment states supplies its own sentence as a **finished
string**; the component owns placement and prominence only (D-73). Keep it a Server Component — it has no
hooks. Render it **above the fold** in all three states (STATE-06).

---

### 4. `src/components/booking/receipt-lines.tsx` + the receipt route (money surface) — D-74/D-76/D-77/D-86

**Analog A — the itemisation shape:** `refund-breakdown.tsx:45-105` (`<dl>` + `<dt>`/`<dd>` pairs,
`flex items-baseline justify-between gap-4 text-sm`, `tabular-nums` on every value, `pl-4` for sub-lines):

```tsx
<dl className="space-y-3">
  <div className="space-y-1.5">
    <div className="flex items-baseline justify-between gap-4 text-sm">
      <dt className="font-medium">You paid</dt>
      <dd className="font-medium tabular-nums">{paidLabel}</dd>
    </div>
    <div className="flex items-baseline justify-between gap-4 pl-4 text-sm">
      <dt className="text-muted-foreground">Space price</dt>
      <dd className="tabular-nums text-muted-foreground">{spacePriceLabel}</dd>
    </div>
```

**Analog B — the frozen figures and the total hook:** `src/components/booking/price-breakdown.tsx:334-380`.
The three columns are `booking.spacePriceCents` / `booking.serviceFeeCents` / `booking.quotedTotalCents`,
already selected by `bookings/[id]/page.tsx:161-163`. **`space + fee === total` is a server guarantee, not a
licence to compute downstream.**

```tsx
<Separator />

<div className="flex items-baseline justify-between gap-4">
  <span className="text-sm font-semibold">Total</span>
  …
  <span data-testid="price-total" className={TOTAL_VALUE_CLASS}>
    {formatMoney(quotedTotalCents, currency)}
  </span>
</div>
```

⚠ **The receipt needs its OWN `data-testid`, not `price-total`.** `price-breakdown.tsx:363-380` records why:
`e2e/price-parity.spec.ts` reads the hook, normalises to integer centavos and asserts equality — *"with two
matches it would silently parse whichever came first in the DOM"*. There are three literals today
(`price-total` / `rail-price-total` / `sheet-price-total`), one per surface, written as **sibling branches
with string literals** and sharing one class constant. Add a fourth (`receipt-price-total`) the same way, and
add its row to `src/lib/design/selector-contract.ts` (§ Shared Pattern E).

**Analog C — the per-head unit line (D-86), the positive-match idiom.** `bookings/[id]/page.tsx:250-252`:

```ts
const quoted = bk.quotedTotalCents ?? 0;
const fullDay =
  bk.fullDay ?? (lst.dayRateCents != null && (bk.spacePriceCents ?? quoted) === lst.dayRateCents);
```

The reasoning to carry over is at `page.tsx:246-249`:

```
// The fallback is for pre-0016 rows only (full_day IS NULL) and is a POSITIVE day-rate match rather than
// an inequality (the re-request.ts:234 idiom), so it can only ever ADD "Full day" on an exact match —
// nothing hourly can be mislabeled by it.
```

**D-86 applied:** render the per-head unit line only when
`perHeadPriceCents != null && declaredPax != null && perHeadPriceCents * declaredPax === spacePriceCents`
— computed **in the RSC**, never in the component (`price-surface.test.ts` bans `+ - * /` on money props in
the price surface). Fall back to a single space-cost line. **Never divide a frozen total to recover a unit.**
Exclusive group bookings (Phase 8) get the ordinary whole-space receipt, with no attendee names (D-77/D-86).

The label-formatting precedent for a unit line is `price-breakdown.tsx:236-241` (`runLabel`), which is
**formatting only** — nothing multiplies a rate by a count in the component.

**Analog D — the route itself:** `src/app/(app)/bookings/[id]/cancel/page.tsx`, and the owner gate at
`bookings/[id]/page.tsx:148-182`, verbatim:

```tsx
// A session is required to own a booking — no session can never be the owner (→ 404, reveal nothing).
const session = await auth.api.getSession({ headers: await headers() });
const userId = session?.user?.id;
if (!userId) notFound();

const [bk] = await db
  .select({ … })
  .from(booking)
  .where(eq(booking.id, id));

// Owner-gate (T-04-CONFIRMIDOR, D-43) — the route group is NOT the gate. Missing OR not-mine → the same 404.
if (!bk || bk.bookerId !== userId) notFound();
```

**Repeat this verbatim on the receipt route** (ASVS V4, T-04-CONFIRMIDOR): identical **bare 404** for a
missing row and a stranger's row.

**Analog E — server-side composition of derived labels:** `cancel/page.tsx:206-260` shows the shape —
`tierOrDefault` → `quoteRefund` → `rungBoundaries(tier, bk.startsAt)` → index math, all in the RSC, with the
component receiving finished values. Use the same shape for the receipt's date/rail/refund lines.

**Money formatter:** `formatMoney(cents, currency)` from `@/lib/money`, with `DISPLAY_CURRENCY` as the
fallback (`bookings/[id]/page.tsx:74`, `:259`). It is explicitly isomorphic and is the only formatter.

---

### 5. `src/app/(app)/bookings/[id]/receipt/loading.tsx` — Pitfall 6

**Analog:** `src/app/(app)/bookings/[id]/cancel/loading.tsx` — verbatim (the whole file, 22 lines):

```tsx
// STATE-01 — the loading state for `/bookings/[id]/cancel`.
// Convention: see `(app)/bookings/loading.tsx`.
//
// NO HEADING, AND THIS IS THE ROUTE WHERE THAT RULE EARNS ITS KEEP. …

import { PanelSkeleton } from "@/components/patterns/panel-skeleton";

export default function CancelBookingLoading() {
  return (
    // Container is `(app)/bookings/[id]/cancel/page.tsx`'s own, verbatim.
    <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
      <PanelSkeleton label="Loading your cancellation options" />
    </div>
  );
}
```

**The two rules it encodes, both load-bearing here** — `bookings/[id]/loading.tsx:14-15`:

```
// It renders as a `<div>`: `(app)/layout.tsx` already wraps `{children}` in `<main>`, and a second
// `<main>` inside the first is a landmark this file has no reason to add.
```

and the heading rule: no `<h1>` unless the resolved heading is a **fixed string**
(`group/loading.tsx` renders "Your group" because it is fixed; the other two render none). A receipt's
heading is arguably fixed — decide explicitly and write the reason in the header, as all three siblings do.

**Constant bump in the same commit** (`tests/design/loading-coverage.test.ts:181-183`):

```ts
const EXPECTED_PAGES = 28;
const EXPECTED_QUALIFYING = 20;
const EXPECTED_NON_QUALIFYING = 8;
```
→ `29 / 21 / 8`. The discriminator is `isAsyncDefaultExport`, not an `await` grep; the receipt route is an
async RSC so it **qualifies**.

---

### 6. `src/components/booking/booking-reference.tsx` (client, clipboard) — D-78/TRUST-02

**Analog:** `src/components/group/share-link-box.tsx:39-71` — the app's clipboard idiom.

**The presence-checked write** (`share-link-box.tsx:39-57`, verbatim):

```tsx
/**
 * Write to the clipboard, reporting success as a VALUE rather than by not throwing.
 *
 * The optional-call trap this exists to avoid: `await navigator.clipboard?.writeText(url)` resolves to
 * `undefined` when the API is missing, so a `try/catch` around it sees no error and the caller cheerfully
 * announces "Link copied" over an empty clipboard. Presence is therefore checked explicitly.
 */
async function writeToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) return false;
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
```

**The success/failure handling** (`share-link-box.tsx:61-72`) — `toast.success` on success (sonner announces
it to AT), focus+select fallback plus `toast.error` when the API is absent. **Copy is neutral, not coral**
(`share-link-box.tsx:22-24`: *"Copying is plumbing"*).

**The reference value must arrive as a prop.** `bookingReference` uses `node:crypto`
(`src/lib/booking/reference.ts:10`) → server-only in practice. The RSC already computes it at
`bookings/[id]/page.tsx:540`:

```ts
const reference = bookingReference(bk.id);
```

**Existing render treatment to reuse** (`bookings/[id]/page.tsx:592-597`):

```tsx
<div className="space-y-0.5">
  <p className="text-sm text-muted-foreground">Booking reference</p>
  <p className="text-2xl font-semibold tracking-tight tabular-nums sm:text-display">
    {reference}
  </p>
</div>
```

⚠ **STATE-08 boundary:** a copy confirmation is non-terminal success → a toast is correct here. A refund
amount, a reduced headcount or a voided invite is **never** a toast.

⚠ **Open Question 1 is a decided call, not a default:** `tabular-nums` normalises only the digits of
`FIT-9K3MP7QZ`. `Geist_Mono` is loaded with zero call sites. Measure via `e2e/tabular-figures.spec.ts` before
choosing.

---

### 7. `src/components/booking/consume-paid-param.tsx` (client, mount effect) — D-60/D-89

**Analog for the effect discipline:** `hold-expired-state.tsx:35-42` + `:62-65`. That file's header states
the argument this new file inherits:

```
// It is a mount effect and NOT a render-time call, and it is the reason this file carries `use client`
// (the RSC path above renders it across the boundary).
```

**The component** (RESEARCH Pattern 1 — Next 16.3 native History API, router-integrated):

```tsx
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

⚠ **THE TRAP — D-89 / Pitfall 2. Mount it on the CONFIRMED branch ONLY.** The shipped shape at
`bookings/[id]/page.tsx:186-192` is the reason:

```tsx
if (bk.status === "pending") {
  if (paid === "1") return <PendingPaymentState />;
  // Abandoned pending hold (no ?paid) → back to the reserve page to finish checkout (Phase-4 behavior).
  redirect(`/listings/${bk.listingId}/book?hold=${bk.id}`);   // ← the trap
}
```

`PendingPaymentState` calls `routerRef.current.refresh()` on an interval
(`pending-payment-state.tsx:40-47`). After a `replaceState` the "current route" has no `paid=1`, so the next
poll re-renders the RSC into that `redirect` and bounces the booker to checkout mid-webhook.

⚠ **Never `router.replace`** — it performs a real client-side navigation and re-fetches the RSC payload, so
the moment would vanish on the frame it appeared (RESEARCH § Alternatives Considered).

---

### 8. `src/components/booking/trust-block.tsx` (component) — D-67/D-68

**Analog for prop discipline:** `src/components/booking/cancellation-policy-disclosure.tsx:201-241` — every
derived value arrives as a **server-computed, already-formatted** prop; the component performs no date math
(its header rule) and a required-not-optional boolean forces every call site to answer.

```tsx
export type CancellationPolicyDisclosureProps = DeadlineAnchorInput & {
  tier: CancellationTier | null | undefined;
  /**
   * REQUIRED, never optional … an optional flag lets a surface silently keep rendering the future-date
   * refund promise for a pass that is already non-refundable — and still typecheck.
   */
  windowAlreadyOpen: boolean;
  /** Present ⇒ concrete mode. Index-aligned with `LADDER[tier]`, already formatted venue-local. */
  boundaryLabels?: readonly string[];
  bestRungIndex?: number;
};
```

Copy the **null-renders-nothing** discipline too (`:243-256`): *"A disclosure that disagrees with
`quoteRefund` is worse than no disclosure."*

**The four columns D-68 closes over, verified in `src/lib/db/schema.ts`:**

| Signal | Column | Line |
|--------|--------|------|
| Host since {Month YYYY} | `user.createdAt` | `schema.ts:38` |
| Listing published | `listing.publishedAt` | `schema.ts:223` |
| "FitOut holds your payment until after your session" (D-65 reframing) | `host_payout.onboardingComplete` (+ `payoutsEnabled`) | `schema.ts:290-291` |
| Request-to-book behaviour | `listing.bookingMode` | `schema.ts:199` |

⚠ **There is no response-rate/response-time column.** Response times, verification badges, superhost chrome,
ratings and reviews are forbidden (TRUST-04). A fifth signal is answered "no", not with a column (D-80).

⚠ `listing.streetAddress` and `user.email` are **not** in the page's current select
(`bookings/[id]/page.tsx:153-179` and `:206-223`) — BFLOW-08/D-63 need both added, plus the host join.

---

### 9. `src/lib/paymongo.ts` — D-84 widen `getCheckoutSession`

**Analog:** the function itself (`paymongo.ts:318-332`, verbatim):

```ts
export type CheckoutSessionState = { id: string; status: string };

/**
 * Read a hosted Checkout Session (GET /v1/checkout_sessions/{id}). Returns the id + the provider's
 * `attributes.status` ("active" while payable, "expired" once retired). …
 */
export async function getCheckoutSession(id: string): Promise<CheckoutSessionState> {
  const json = await paymongoFetch<{ data: { id: string; attributes: { status?: string } } }>(
    `/v1/checkout_sessions/${id}`,
  );
  return { id: json.data.id, status: json.data.attributes.status ?? "" };
}
```

**Widen to** `payments[0].attributes.source.type` and `attributes.paid_at`, keeping the `?? ""` /
`?? null` defensive-default idiom the line above uses.

⚠ **`paymongoFetch` sets NO timeout — plain `fetch`, no `AbortSignal`** (`paymongo.ts:74-101`). The repo
already records this as a known gap at `src/lib/payments/config.ts:101-109`:

```
 *     UPDATEs. `paymongoFetch` sets NO timeout — plain fetch, no AbortSignal — so a degraded provider can
 *  can still be overtaken; adding an AbortSignal.timeout to `paymongoFetch` is the follow-up that would make …
```

D-84 requires a timeout **and** a rail-free fallback. There is **no existing timeout analog in `src/`** —
`address-autocomplete.tsx:104-123` uses an `AbortController` for a *user-typing* cancel, not a deadline.
Treat `AbortSignal.timeout(…)` on the receipt/reversed probe as net-new, and keep it **opt-in per call site**
so the money path's behaviour is unchanged.

**The fallback discipline analog** (`cancel/page.tsx:262-273`) — a third-party read that must not fail the
page:

```ts
let institutions: ReceivingInstitution[] = [];
if (needsDestination) {
  try {
    institutions = await listReceivingInstitutions();
  } catch {
    institutions = [];
  }
}
const destinationFormReady = needsDestination && institutions.length > 0;
```

Same shape for the rail probe: `try { … } catch { rail = null }`, then branch to rail-free copy naming all
four rails. **⚠ Do not let a third-party call fail the page — this surface exists to explain a failure.**

**Also verified and binding (D-81):** `REFUNDABLE_RAILS` at `src/lib/payments/refund-rail.ts:42` must **not**
be widened. `isApiRefundable(rail)` (`:52-54`) is the existing discriminator for D-83's manual-return branch,
and `cancel/page.tsx:262` already calls it — reuse it, do not restate it.

---

### 10. `src/components/booking/payment-reversed-state.tsx` — D-83 + D-88.1

**Analog:** itself, plus `hold-expired-state.tsx` for structure. **COPY THE SHAPE, NOT THE LINES.**

**What ships today** (`payment-reversed-state.tsx:16-45`) — three defects in one file:

```tsx
export function PaymentReversedState({ listingId }: { listingId: string }) {
  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">   {/* ← DEFECT 1: nested <main> */}
      <Card>
        <CardContent role="status" aria-live="polite" …>
          <Undo2Icon className="size-8 text-muted-foreground" aria-hidden="true" />
          <div className="space-y-1">
            <h1 className="text-xl leading-tight font-semibold">We couldn&apos;t complete this booking</h1>
            <p className="mx-auto max-w-prose text-sm text-muted-foreground">
              Your payment was reversed — you haven&apos;t been charged for a slot we couldn&apos;t confirm.
              {/*                          ↑ DEFECT 2: STATE-05's NOT-COMPLETED language (D-69/D-83) */}
```

**DEFECT 3** is upstream, at `bookings/[id]/page.tsx:195-197` — the state is gated on the param:

```tsx
if (bk.status === "cancelled" && paid === "1") {
  return <PaymentReversedState listingId={bk.listingId} />;
}
```

D-87: once D-60 consumes the param, a reversed booking falls into the generic `cancelled` branch
(`page.tsx:441-534`) with **no money statement at all** — the page's own header already flags this as a
"KNOWN EDGE" at `:450-454`. RESEARCH Example 3's `getCheckoutSession` status is the replacement
discriminator (`cancelled` + session `paid` → reversed; `cancelled` + session `expired` → swept unpaid hold).

**The landmark fix** — one line, and its precedent is `bookings/[id]/loading.tsx:14-15` quoted above, plus
`bookings/[id]/page.tsx:53-61`:

```
// ── ONE `main` LANDMARK PER DOCUMENT, SO THE CONTAINER ON EVERY BRANCH IS A `div` (fixed 20 Aug 2026). ───
// `(app)/layout.tsx:96` already wraps `{children}` in this route's one `main` landmark. …
// Pinned by `e2e/shell.spec.ts` — one `main` landmark on this route at 320px and at 1280px.
```

Same one-line change in `pending-payment-state.tsx:52` and `expired-approval-state.tsx:99`.

**D-72 / D-83 CTA hierarchy stays:** `Back to availability` remains the single coral primary
(`payment-reversed-state.tsx:35-37`), with `<SupportPath />` as the quieter secondary — but on the **manual
path** the support link must be unmissable rather than decorative (D-83).

**The only numbers permitted in this copy** (13-RESEARCH § Example 1, D-83): card **up to 30 days**;
GCash / Maya **within 24 hours**. On the manual path, **never the word "refunded"** — say the booking is
cancelled and the amount is flagged for return by hand, and carry the reference. Phrase it *"not reversed
automatically"*, never *"cannot be reversed"* (D-82).

**Supersede these three shipped call sites of the unsourced string:**
- `src/app/(app)/bookings/[id]/page.tsx:522`
- `src/app/(app)/bookings/[id]/cancel/page.tsx:356`
- `src/lib/email.ts:341` — ⚠ Phase-15 shell. A copy string is **not** a send trigger (D-78 bans moving/adding
  triggers), but flag it explicitly and let the planner decide whether it lands here or is handed over.

**The exact amount** comes from `booking.quotedTotalCents` — already selected at `page.tsx:161`.
`booking.refundCents` is **NULL** on the D-58 reversal path.

---

### 11. `src/components/booking/pending-payment-state.tsx` — D-71 (copy only)

**Analog:** itself. **The poll discipline is FROZEN VERBATIM** (`pending-payment-state.tsx:22-49`):

```tsx
const POLL_INTERVAL_MS = 2500;
const MAX_ATTEMPTS = 8; // ~20s of auto-refresh before we fall back to the manual "taking longer" copy

export function PendingPaymentState() {
  const router = useRouter();
  const [slow, setSlow] = React.useState(false);

  // router is read through a ref so a new router identity each render never re-subscribes the interval.
  const routerRef = React.useRef(router);
  React.useEffect(() => { routerRef.current = router; }, [router]);

  React.useEffect(() => {
    let count = 0;
    const id = window.setInterval(() => {
      count += 1;
      routerRef.current.refresh();
      if (count >= MAX_ATTEMPTS) { window.clearInterval(id); setSlow(true); }
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, []);
```

**What D-71 changes:** the two copy strings at `:61-64` gain the promise (*the booking is safe; we'll email
you the moment it confirms*), and a longer threshold surfaces `<SupportPath />` with the reference attached.

⚠ **Never an error affordance at any threshold.** The webhook is still the outstanding authority (STATE-05).
The existing `aria-live="polite"` at `:60` and the neutral `Loader2Icon` at `:56` stay.

⚠ Adding a third threshold makes this a **second** state change in one polite region — GATE-03 rule 6 says
exactly one region announces one outcome. Audit against `live-regions.ts` rules 3/6/7 while discharging the
exclusion (§ Shared Pattern F).

---

### 12. `tests/design/trust-signals.test.ts` and `tests/design/reversed-copy.test.ts` — the two-piece idiom

**Analog:** `tests/design/price-surface.test.ts` — extract **verbatim**.

**The type** (`price-surface.test.ts:256-261`):

```ts
type Forbidden = {
  /** The phrase, split mid-word so neither fragment reads as it. Joined at runtime, never written. */
  readonly pieces: readonly [string, string];
  /** WHY it is banned. Travels into the failure message — a row without a reason is not a row. */
  readonly why: string;
};
```

**A row** (`price-surface.test.ts:273-283`):

```ts
const TAX_BUNDLE: readonly Forbidden[] = [
  {
    pieces: ["Tax", "es and fees"],
    why:
      "bundles the platform's service fee under a tax-sounding label. It is revenue, not a levy — " +
      "D-73 assigns this line the exact label `Service fee` and forbids re-bundling it.",
  },
];
```

**The two-pass scanner** (`price-surface.test.ts:317-345`) — raw text **plus** a whitespace-collapsed copy,
because a formatter wraps JSX prose mid-sentence and the rendered text is contiguous even when the source is
not:

```ts
function findPhrases(file: Opened, phrases: readonly Forbidden[]): string[] {
  const hits: string[] = [];
  const lines = file.raw.split("\n");
  const collapsed = file.raw.replace(/\s+/g, " ").toLowerCase();

  for (const phrase of phrases) {
    const needle = phrase.pieces.join("").toLowerCase();

    let foundOnALine = false;
    lines.forEach((line, index) => {
      if (line.toLowerCase().includes(needle)) {
        foundOnALine = true;
        hits.push(`${file.rel}:${index + 1} — ${phrase.why}`);
      }
    });

    if (!foundOnALine && collapsed.includes(needle)) { … }
```

**The failure message that states the rule** (`price-surface.test.ts:741-746`):

```
`The phrase must not appear in the file AT ALL, comments included, because `
`a grep that matches its own prohibition stops being a guard. Encode it in two pieces if you `
`must refer to it.`
```

**The both-sides shape** (`price-surface.test.ts:749-760`) — assert the ban **and** assert the required
string still renders. *"a file with no fee line at all satisfies the ban perfectly, and 'we deleted the
disclosure' is the opposite of the recorded decision."*

**`trust-signals.test.ts` rows (TRUST-04/D-68):** `superhost`, `verified`, `responds within`, `rating` — each
split mid-word. **`reversed-copy.test.ts` rows (D-83):** the not-completed sentence (*"you haven't been
charged"*) must never appear in `payment-reversed-state.tsx`; the word *"refunded"* must never appear in the
manual-path branch. Both files also need the **positive half**: the money statement and the reference **do**
render.

⚠ Also extract the guard-the-guard fixture pattern (`price-surface.test.ts:660-666`) — the test's own
fixture is **built from the two-piece encoding** so the test file never spells a banned phrase either.

---

### 13. `e2e/shell.spec.ts` — the `pending` seed (D-88.1)

**Analog:** the shipped describe at `e2e/shell.spec.ts:501-600`. Extend it; do not fork it.

**The seed insert to clone** (`shell.spec.ts:544-558`):

```ts
const bookingId = `e2e_landmark_booking_${randomUUID()}`;
await seed.sql`
  INSERT INTO "booking" (
    id, listing_id, unit, booker_id, starts_at, ends_at, status, booking_mode,
    cancellation_policy, space_price_cents, service_fee_cents, quoted_total_cents,
    currency, payment_id, payment_method, created_at
  ) VALUES (
    ${bookingId}, ${seed.listingId}, ${1}, ${bookerId},
    now() + make_interval(hours => ${10}),
    now() + make_interval(hours => ${11}),
    ${"confirmed"}::booking_status, ${"instant"}::booking_mode,
    ${"standard"}::cancellation_policy, ${100000}, ${5000}, ${105000}, ${"php"},
    ${`pay_e2e_${randomUUID()}`}, ${"gcash"}, now()
  )
`;
```

**The route/resolved-marker table** (`shell.spec.ts:572-590`) — every route is gated on a **RESOLVED-only**
marker so the count is never measured against the skeleton:

```ts
const routes = [
  {
    url: `/bookings/${bookingId}`,
    resolved: () => page.getByRole("heading", { level: 1, name: "Booking confirmed" }),
    resolvedName: 'the h1 "Booking confirmed"',
  },
  …
];
```

**The matcher rule** (`shell.spec.ts:460-467`): `getByRole("main")` is buffer-immune; a CSS `locator("main")`
is not — *"green against the exact document in which a nested landmark would still be sitting in the
buffer."* Use the role query for the new `pending` case too.

**Add:** a `pending`-status booking (for `PendingPaymentState` at `?paid=1`), a `cancelled`-reversed booking
(for `PaymentReversedState`), and the lapsed-approval shape (`cancelled` + `cancelled_by` NULL +
`booking_mode='request'` + `payment_id` NULL — the conditions at `bookings/[id]/page.tsx:455-456`).

**Teardown ordering trap already documented** (`shell.spec.ts:511-519`): `booking_group.booking_id` is
`ON DELETE RESTRICT`, so group rows go **before** `teardown()`.

**Extract into `e2e/helpers/seed-payment-states.ts`.** It is the highest-leverage Wave-0 item: today only
`confirmed` rows are seeded anywhere.

---

### 14. `e2e/receipt-parity.spec.ts` — GATE-05's e2e half

**Analog:** `e2e/price-parity.spec.ts:212-334`.

```ts
const totalHook = page.getByTestId("price-total");
…
const [row] = await sql<{ quoted_total_cents: number | null }[]>`
  SELECT quoted_total_cents FROM booking WHERE id = ${holdId!} AND listing_id = ${listingId}
`;
…
expect(
  renderedCentavos,
  `PRICE PARITY BROKEN. The reserve page rendered ${renderedCentavos} centavos; ` +
    `booking.quoted_total_cents for hold ${holdId} is ${row.quoted_total_cents}. …`,
).toBe(row.quoted_total_cents);
```

Also copy the **exactly-one-hook guard** at `:212-225` (*"the reserve page rendered ${count} elements
carrying the price-total hook; expected exactly 1"*) — the receipt adds a fourth total literal to a document
that may also carry a breakdown.

⚠ **CI secret boundary (D-35):** GATE-05's price-parity spec is scoped so its only environment input is
`DATABASE_URL`. If the receipt spec needs a PayMongo secret, **it has left that boundary and must be split**.
Seed a `confirmed` booking with its frozen money columns directly instead.

---

### 15. `src/app/(app)/bookings/[id]/page.tsx` — the confirmation moment (D-61/D-62/D-63)

**Analog:** its own confirmed branch (`page.tsx:579-624`) — the badge/h1/reference header block and the
`<dl>` fact rows are the shape the moment leads with:

```tsx
<div className="flex flex-col items-center gap-3 text-center">
  <BookingStatusBadge status="confirmed" endsAt={bk.endsAt} now={now} side="booker" />
  <h1 className="text-2xl leading-tight font-semibold tracking-tight sm:text-display">
    {isCompleted ? "This session is done" : "Booking confirmed"}
  </h1>
  …
</div>
…
<dl className="space-y-3 text-sm">
  <div className="flex items-start justify-between gap-4">
    <dt className="text-muted-foreground">When</dt>
    <dd className="text-right">
      <span>{dateLabel}</span>
      <span className="block tabular-nums text-muted-foreground">{timeLabel}</span>
    </dd>
  </div>
```

**The clock rule (non-negotiable)** — `page.tsx:46-51` + `:262`:

```ts
// THE CLOCK. `now` is read from POSTGRES once, via `readDbNow`, and threaded into every status derivation …
// There is no JS clock read anywhere on this page.
const now = await readDbNow(db);
```

**The venue-local label helpers** (`page.tsx:66-68`, `:254-258`) — do not invent a fifth format:

```ts
import { format } from "date-fns";
import { tz } from "@date-fns/tz";
import { venueTzNote } from "@/lib/venue-time";
…
const inTz = tz(timezone);
const dateLabel = format(bk.startsAt, "EEEE, MMM d, yyyy", { in: inTz });
const tzNote = venueTzNote(lst.city, timezone);
```
Four formats already exist (`composeWhenLabel` / `composeDateLabel` / `composeDeadlineLabel` / `venueTzNote`)
and `src/lib/booking/when-label.ts` owns them.

**D-62's mode branch** reads `bk.bookingMode`, already selected at `page.tsx:175`. **D-63's email** needs
`user.email` added to the select; **BFLOW-08's address** needs `listing.streetAddress`.

**The branch-return container is a `div`, always** (`page.tsx:268`, `:329`, `:407`, `:501`, `:580`):

```tsx
<div className="mx-auto w-full max-w-2xl px-4 py-8 sm:py-12">
```

---

## Shared Patterns

### A. Owner gate — apply to the receipt route and every new RSC read

**Source:** `src/app/(app)/bookings/[id]/page.tsx:15-20` (the contract) and `:148-182` (the code).

```
//   - T-04-CONFIRMIDOR (a MUST-NOT-SKIP control): the booking is loaded owner-gated —
//     booking.bookerId === session.userId, else notFound(). A missing row and a row owned by a DIFFERENT
//     booker return the SAME bare 404, so guessing/leaking an id reveals nothing (V4/IDOR, D-43).
```

Group reads are **owner-scoped inside their own SQL** (`page.tsx:565-577`) — *"a foreign roster must be
UNREADABLE, not merely unrendered."* Never filter in JS after reading.

### B. `server-only` + GATE-05 — every money surface

`src/lib/booking/pricing.ts:1`, `all-in-rate.ts:1`, `availability/read-model.ts:1` all carry
`import "server-only"`. A client component may receive a **finished, formatted** figure, never the inputs.
`price-surface.test.ts` walks the AST and bans `+ - * /` applied to money props. The receipt is a money
surface: itemise in the RSC, render finished strings.

### C. The one-owner-per-fact rule

`13-RESEARCH.md` § Don't Hand-Roll states it: `site.ts` owns the tagline and the support address, `LADDER`
owns the refund rungs, `all-in-table.ts` owns the price, `reference.ts` owns the reference, `live-regions.ts`
owns the announcements, `formatMoney` owns money formatting, `when-label.ts` owns the four date formats.
**A second spelling is the bug.** Every "custom solution" temptation in this phase is a temptation to
re-state a fact that already has an owner.

### D. Card containers — `ALLOWED_RAW_CARD` (Pitfall 5)

**Source:** `tests/design/card-pattern-coverage.test.ts:343-380`, `:534-541`, `:598-612`.

Every raw `<Card>` outside `src/components/patterns/` that is **not** on `ALLOWED_RAW_CARD` is a violation.
The Phase-13 files **already have rows**, written in advance:

```ts
"src/app/(app)/bookings/[id]/page.tsx": "The booking detail page — 5 call sites, and the surface Phase 13's success criteria 2 and 4 rewrite end to end …",
"src/app/(app)/bookings/[id]/cancel/page.tsx": "…",
"src/app/(app)/bookings/[id]/group/page.tsx": "…",
"src/components/group/attendee-roster.tsx": "…",
"src/components/booking/expired-approval-state.tsx": "…",
"src/components/booking/payment-reversed-state.tsx": "…",
"src/components/booking/pending-payment-state.tsx": "…",
"src/components/booking/hold-expired-state.tsx": "…",
```

**Consequences for this phase:**
- Every **NEW** file (`not-completed-state.tsx`, `money-statement.tsx`, `trust-block.tsx`, `support-path.tsx`,
  `receipt/page.tsx`, `receipt-lines.tsx`) is **unlisted** → compose `PanelCard`, or add a row with a
  **>40-character** reason in the same commit (`:598-601`).
- Converting a listed file to `PanelCard` is safe — `parsedByFile` is keyed on every walked source file, so a
  stale row stays green (`:606-611`). **But if a listed file is deleted or moved, its row must go in the same
  commit.**
- `EXPECTED_SURFACES = 12` (`:329`) is the *adoption* inventory, not the allow-list. Adopting `PanelCard` on a
  new surface means adding a `CARD_SURFACES` row **and** bumping that constant.

**`PanelCard` usage** (`src/components/patterns/panel-card.tsx:84-148`): props are `title` / `description` /
`footer` / `sticky` / `tone`; it renders `data-testid="panel-card"`; **its `CardContent` `p-4 sm:p-6` is the
panel's only padding — do not add your own**, and do not nest it inside a container that already supplies
`bg-card ring-1 rounded-xl` (measured double-padding, 112px vs 80px). `PriceBreakdown` is a bare `<div>` for
exactly this reason (`price-breakdown.tsx:34-45`) — **do not "finish the adoption" by wrapping it.**

### E. `data-testid` declarations — `selector-contract.ts`

**Source:** `src/lib/design/selector-contract.ts:173-205`. Every new id needs a row; an undeclared id fails
the build (plan 11-02's ban).

```ts
export type SelectorRow = {
  /** WHY a role or label query cannot carry the assertion this hook exists for. */
  readonly why: string;
  /** The plan that SHIPS this id into `src/`, as `11-NN`. */
  readonly owner: string;
};
```

Model row for a money hook (`:197-206`):

```ts
"price-total": {
  why:
    "The DB-vs-DOM parity spec reads ONE number out of the checkout and compares it to the quote the " +
    "database froze. … There is no role for a number and no label for a total that is not an input.",
  owner: "11-06",
},
```

### F. Live regions — the D-88.2 handover

**Source:** `src/lib/design/live-regions.ts`.

**What a discharged entry becomes.** Today (`:266-330`) each of the ten Phase-13 files is an exclusion:

```ts
export type LiveRegionExclusion = {
  readonly file: string;
  readonly why: string;
};

export const LIVE_REGION_EXCLUSIONS = [
  {
    file: "src/components/booking/payment-reversed-state.tsx",
    why: "Phase 13's reversal state (TRUST-04) — a post-payment outcome, after this phase's redirect.",
  },
  …
];
```

After discharge each becomes **three coordinated edits**:

1. its path joins `BOOKER_PATH_LIVE_REGION_FILES` (`:222-238`, currently 11 entries);
2. a row lands in `LIVE_REGIONS`, shaped like `LiveRegionRow` (`:359-387`) — `file` / `kind` / `at` /
   `announces` / `why`, **every field mandatory, none with a default**. Model row (`:438-455`):

```ts
"calendar-day-loading": {
  file: "src/components/availability/availability-calendar.tsx",
  kind: "loading",
  at: 1,
  announces:
    '"Loading times for Friday, Aug 21" — once, at the moment the day panel swaps to its skeleton ' +
    "after a day is picked. It says nothing again; …",
  why:
    "RULE 4 + RULE 5, and it is the correction this plan exists for. …",
},
```

3. the **type-level count alias is renamed** (`:771-773`):

```ts
export type DeclaredFileCountIsEleven = Assert<
  (typeof BOOKER_PATH_LIVE_REGION_FILES)["length"] extends 11 ? true : false
>;
```
*"The alias NAME carries the number so that widening the set forces renaming it … The friction IS the
mechanism."* Ten new files → `DeclaredFileCountIsTwentyOne` (and a second literal in
`tests/design/live-regions.test.tsx`).

**Rules that will bite** (RESEARCH Pitfall 8): rule 3 (a ticking value needs `role="timer"` +
`aria-live="off"` on the digits plus a separate polite region changing only at declared thresholds — applies
to `request-countdown.tsx`); rule 6 (exactly one region announces one outcome); rule 7 (`assertive` is banned
— use **polite region plus moved focus**, and `hold-expired-state.tsx:8-46` is the file that gave that ban
its name).

**The `announces` field is a sentence, not a noun** (`:371-377`): *"'the pending state' is not an answer to
either half of that question."*

### G. Print CSS (D-74 / Pitfall 3) — Tailwind `print:` utilities only

Use `print:hidden` / `print:bg-transparent` / `print:text-foreground` / `print:ring-0` / `print:shadow-none`.
`print:` compiles only inside `@media print`, so `tests/design/leak.test.ts` (raw hex / `rgb(` / `oklch(` /
arbitrary `text-[NNpx]` under `src/**`) is gate-neutral and every VRT screen baseline is byte-identical.

⚠ **Design gates forbid raw hex / colour functions / arbitrary px under `src/components/**` and `src/app/**`
— including in print styles.** ⚠ Prefer designing the receipt as **ink on white** over forcing
`[print-color-adjust:exact]`. ⚠ If a `@media print` block is added to `globals.css`, re-run
`npm run design:tokens` and `npm run test:design` — `config/design-tokens-source.mjs` brace-depth-parses that
stylesheet and a new nesting level is exactly the input that could confuse it.

### H. The grep-tripwire comment discipline

Three shipped files record it, and every new copy-guarded file must obey it:
`price-breakdown.tsx:28-33`, `bookings/[id]/page.tsx:242-245`, `share-link-box.tsx:14-17`:

```
// ⚠️ GREP TRIPWIRE (the 07-04 payout-sweep idiom). … A grep is only a real guard if it cannot be tripped by
// the very comment forbidding the string — so NONE of those phrases is spelled contiguously anywhere in
// this file. If you are tempted to write one out "just in a comment", don't: it disarms the check for good.
```

---

## No Analog Found

| File / concern | Role | Data flow | Why no analog |
|----------------|------|-----------|---------------|
| The **timeout** on the D-84 PayMongo probe | lib (HTTP) | request-response | `paymongoFetch` sets no `AbortSignal` and `config.ts:101-109` records that as a **known open gap**. The only `AbortController` in `src/` (`listing/address-autocomplete.tsx:104-123`) is a user-typing cancel, not a deadline. Net-new; keep it opt-in per call site so the money path is unchanged. |
| `e2e/receipt-print.spec.ts` (`emulateMedia({media:'print'})`) | test (e2e) | media emulation | No spec in `e2e/` emulates print. `e2e/reduced-motion.spec.ts` is the nearest *media-emulation* shape (it emulates `prefers-reduced-motion`) — copy its `emulateMedia` + assert-both-directions structure, not its subject. |
| `e2e/tabular-figures.spec.ts` (rendering measurement) | test (e2e) | measurement | The repo measures **box geometry** (`e2e/skeleton-geometry.spec.ts`, `overflow-320.spec.ts`) but never **glyph advance width**. Open Question 1 asks for a width comparison of `"11111111"` vs `"00000000"` — a new assertion shape. It is the same *rendering-assertion* family GATE-STATES already demands. |

---

## Constant Bumps That Are Part Of The Work (not chores)

| Constant | File:line | From → To | Why |
|----------|-----------|-----------|-----|
| `EXPECTED_PAGES` / `EXPECTED_QUALIFYING` / `EXPECTED_NON_QUALIFYING` | `tests/design/loading-coverage.test.ts:181-183` | 28/20/8 → 29/21/8 | the receipt route is an async RSC → qualifies (D-88.3) |
| `DeclaredFileCountIsEleven` | `src/lib/design/live-regions.ts:771-773` | 11 → 21 (rename the alias) | D-88.2 discharge |
| `LIVE_REGION_EXCLUSIONS` | `src/lib/design/live-regions.ts:266-330` | 10 Phase-13 rows removed | D-88.2 |
| `SELECTOR_IDS` / `SELECTOR_CONTRACT` | `src/lib/design/selector-contract.ts:119`, `:196` | + one row per new `data-testid` | undeclared ids fail the build |
| `ALLOWED_RAW_CARD` | `tests/design/card-pattern-coverage.test.ts:343` | + a row **only if** a new file renders a raw `<Card>` | Pitfall 5 |
| `EXPECTED_SURFACES` | `tests/design/card-pattern-coverage.test.ts:329` | 12 → 12+N **only if** a `CARD_SURFACES` adoption row is added | pinned separately from every assertion over it |

## Hard Constraints Re-Checked Against The Analogs

- **ZERO schema migrations (D-80).** No analog mapped above adds a column. `booking.checkoutSessionId`
  (`schema.ts:811`), `booking.declaredPax` (`:891`), `booking.openCapacity` (`:905`),
  `listing.perHeadPriceCents` (`:221`), `listing.publishedAt` (`:223`), `user.createdAt` (`:38`) and
  `host_payout.onboardingComplete` (`:290-291`) all exist. `drizzle/` stays at `0025_audit_resolved_by.sql`.
- **`REFUNDABLE_RAILS` is not widened** (`src/lib/payments/refund-rail.ts:42`) — D-81, re-probed 2026-08-20.
- **`tests/design/site-contacts.test.ts` is never modified.** It must stay green **unmodified**.
- **No email send trigger is moved or added** (D-78). A copy string in `src/lib/email.ts:341` is not a
  trigger, but it is flagged for the planner's explicit decision.
- **No new package.** The phase installs nothing; any proposed install is a scope alarm.

---

## Metadata

**Analog search scope:** `src/app/(app)/bookings/**`, `src/app/(public)/invite/**`, `src/components/booking/**`,
`src/components/group/**`, `src/components/patterns/**`, `src/lib/{site,paymongo,money}.ts`,
`src/lib/booking/**`, `src/lib/payments/**`, `src/lib/design/**`, `src/lib/db/schema.ts`,
`tests/design/**`, `tests/booking/**`, `e2e/**`
**Files read in full or in targeted ranges:** 26
**Pattern extraction date:** 2026-08-20
