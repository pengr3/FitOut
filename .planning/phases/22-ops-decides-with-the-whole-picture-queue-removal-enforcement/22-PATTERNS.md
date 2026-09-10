# Phase 22: Ops Decides With the Whole Picture — Pattern Map

**Mapped:** 2026-09-10  
**Files analyzed:** 7  
**Analogs found:** 7 / 7

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/app/(ops)/ops/page.tsx` | route / server component | request-response, transform | itself | exact |
| `src/lib/ops/review-queue.ts` | service / read model | CRUD, transform | itself | exact |
| `src/lib/ops/cancel-impact.ts` | service / read model | batch, transform | `loadOpsCancelImpact` in itself | role-match |
| `src/components/ops/ops-queue-row.tsx` | client component | event-driven, request-response | itself | exact |
| `tests/ops/queue-query.test.ts` | integration test | CRUD | itself | exact |
| `tests/ops/ops-queue-row.test.tsx` | component test | event-driven | itself | exact |
| `e2e/ops-queue.spec.ts` | E2E test | request-response, event-driven | `e2e/ops-auth.spec.ts` | role-match |

## Pattern Assignments

### `src/app/(ops)/ops/page.tsx` (route, request-response / transform)

**Analog:** `src/app/(ops)/ops/page.tsx` (tracked), lines 130-170.

**Guard and parallel-read pattern** (lines 130-136):

```tsx
await requireStaff();

const [items, now, staffSnapshot] = await Promise.all([
  loadReviewQueue(db),
  readDbNow(db),
  readStaffManagementSnapshot(db),
]);
```

Keep page-level `requireStaff()` first. Add the set-based impact read to this pre-map batch. Do not use the current per-item `await loadOpsCancelImpact(...)` inside the row mapper (lines 145-169); Phase 22 replaces that with a lookup from a completed `Map`.

**Pure row-shaping pattern** (lines 146-169):

```tsx
const shared = {
  waitLabel: formatWait(item.submittedAt, now),
  submittedLabel: formatSubmitted(item.submittedAt),
};
return { ...item, ...shared, priceLabel: formatPrice(item), impact };
```

The final `items.map` may only format existing fields and read a precomputed impact. It must have no database call or `await`.

### `src/lib/ops/review-queue.ts` (read-model service, CRUD / transform)

**Analog:** `src/lib/ops/review-queue.ts` (tracked), lines 129-153 and 255-323.

**Explicit DTO and nullable aggregate normalization** (lines 129-153, 193-196, 314-323):

```ts
export type OpsQueueListingItem = {
  kind: "listing";
  listingId: string;
  // explicit projected fields only
  hostVerificationStatus: HostVerificationStatus;
  photos: OpsQueuePhoto[];
  submittedAt: Date;
};

...listingRows.map(({ photos, ...rest }): OpsQueueListingItem => ({
  ...rest,
  kind: "listing",
  submittedAt: toDate(rest.submittedAt),
  photos: photos ?? [],
}))
```

Add nullable `description` and a normalized `amenities: string[]` to this typed listing DTO; do not widen the host DTO or select identity-document fields.

**Lateral ordered JSON aggregate and fail-closed join** (lines 273-300):

```sql
COALESCE(hv.status::text, 'unverified') AS "hostVerificationStatus",
LEFT JOIN LATERAL (
  SELECT json_agg(
    json_build_object('id', p.id, 'url', p.url, 'position', p.position)
    ORDER BY p.position ASC
  ) AS photos
  FROM listing_photo p
  WHERE p.listing_id = l.id
) ph ON true
```

Copy this shape for amenities: a lateral aggregate, deterministic order, typed alias, then `?? []` after querying. Preserve the existing fail-closed status COALESCE exactly.

### `src/lib/ops/cancel-impact.ts` (read-model service, batch / transform)

**Analog:** `loadOpsCancelImpact` in `src/lib/ops/cancel-impact.ts` (tracked), lines 101-105 and 188-240.

**One policy expression and finished display DTO** (lines 101-105, 223-240):

```ts
const refundCents = opsRefundBasisCents({
  spacePriceCents: agg?.spaceCents ?? 0,
  quotedTotalCents: totalCents,
});

return {
  cancellableCount,
  cancellableBookingIds: agg?.cancellableBookingIds ?? [],
  refundTotal: formatMoney(refundCents, currency),
  retainedTotal: formatMoney(Math.max(0, totalCents - refundCents), currency),
  hostPaid: "Nothing",
  notCancellableCount,
  notCancellableReason: PAYOUT_ALREADY_LEFT_REASON,
};
```

Add a server-only set-based loader that accepts known listing IDs and returns `Map<string, OpsCancelImpact>`. Reuse `OpsCancelImpact`, `PAYOUT_ALREADY_LEFT_REASON`, `opsRefundBasisCents`, and the exact booking/payout predicates; do not recreate money arithmetic in the page or browser.

### `src/components/ops/ops-queue-row.tsx` (client component, event-driven)

**Analog:** `src/components/ops/ops-queue-row.tsx` (tracked), lines 1-8, 158-204, and 206-282.

**Terminal RowCard composition and one decision widget** (lines 216-252):

```tsx
<RowCard
  title={title}
  meta={meta}
  status={<p className={ROW_LEAD_CLASS}>{row.waitLabel}</p>}
  actions={
    <OpsDecisionActions subject={/* narrowed listing or host subject */} />
  }
>
```

Keep `href` absent. For listing rows, preserve exactly one `OpsDecisionActions` in the existing `actions` slot; position the disclosure in `children`, after controls, so expanded content adds below that decision boundary. Host-row rendering remains untouched.

**Total-status and neutral-fallback pattern** (lines 158-204, 265-268):

```ts
const HOST_VERIFICATION_LABEL: Record<HostVerificationStatus, string> = {
  unverified: "not checked yet",
  pending: "waiting on a decision",
  approved: "checked",
  rejected: "not approved",
  grandfathered: "never checked",
  suspended: "hosting paused",
};

return parts.length > 0 ? parts.join(", ") : "No address on the listing";
```

Use the same explicit `Not set` rendering for missing description and amenities. Preserve this total host-standing map and render the host fact inside expanded listing evidence.

**Reused evidence primitives:** `PhotoGallery` from `src/components/listing/photo-gallery.tsx` (tracked), lines 176-238; it accepts ordered DTOs and owns both the no-photo state and lightbox. Map known amenity keys through `AMENITY_LABELS` from `src/lib/listing-vocab.ts` (tracked), lines 68-89; preserve raw fallback for unknown keys.

### `tests/ops/queue-query.test.ts` (integration test, CRUD)

**Analog:** `tests/ops/queue-query.test.ts` (tracked), lines 344-386.

**Assert the returned DTO, not implementation internals:**

```ts
const q = await loadReviewQueue(testDb.db);
const b = q.find((i) => idOf(i) === "q_listing_b")!;
expect(b.kind).toBe("listing");
if (b.kind !== "listing") return;

expect(b.hostVerificationStatus).toBe("approved");
expect(b.photos.map((p) => p.id)).toEqual(["q_ph_b1", "q_ph_b2"]);
```

Extend the fixture/assertion style for description, ordered amenity keys, empty amenities, and fail-closed standing. Add a batch-impact equivalence case using isolated `testDb` data; it must compare the batch loader’s map entries to the established single-loader contract.

### `tests/ops/ops-queue-row.test.tsx` (component test, event-driven)

**Analog:** `tests/ops/ops-queue-row.test.tsx` (tracked), lines 159-223, 237-263, and 453-520.

**Factory plus semantic rendering helpers** (lines 175-223):

```tsx
function listingRow(over: Partial<OpsQueueListingRow> = {}): OpsQueueListingRow {
  return { kind: "listing", /* complete defaults */, ...over };
}

function renderRow(row: OpsQueueHostRow | OpsQueueListingRow): HTMLElement {
  const { container } = render(<OpsQueueRow row={row} />);
  return container.querySelector('[data-testid="row-card"]') as HTMLElement;
}
```

Extend the existing complete listing fixture with description and amenities. Test the initial collapsed state, click the native named button, then assert `aria-expanded`, its one `section`, evidence ordering/fallbacks, a single existing decision widget, and retained focus.

**Terminality assertion** (lines 237-263):

```tsx
expect(Array.from(card.querySelectorAll("a")).map((a) => a.getAttribute("href"))).toEqual([]);
expect(card.querySelectorAll('[role="link"]')).toHaveLength(0);
```

Run these exact assertions for listing collapsed and listing expanded as well as the unmodified host row. Do not weaken the unfiltered anchor selector.

### `e2e/ops-queue.spec.ts` (E2E test, request-response / event-driven)

**Analog:** `e2e/ops-auth.spec.ts` (tracked), lines 14-45 and 81-90.

**Local-only seed and staff browser-context pattern** (lines 14-45):

```ts
const OPS_HOST = `ops.localhost:${E2E_PORT}`;
const OPS_ORIGIN = `http://${OPS_HOST}`;

function assertLocalDatabase(): void {
  const hostname = new URL(DATABASE_URL).hostname.toLowerCase();
  expect(["localhost", "127.0.0.1", "::1", "db"]).toContain(hostname);
}

const operatorContext = await browser.newContext({ baseURL: OPS_ORIGIN });
```

Follow this exact host/origin and local-database safety envelope. Seed one pending listing with photos, description, amenities, and host verification; sign in via the existing Ops auth endpoint; visit `/ops`; open the disclosure with its accessible name; assert evidence, unchanged URL, terminality, one decision widget, and controls within viewport at 320px and desktop.

## Shared Patterns

### Authorization and server/client boundary

**Sources:** `src/app/(ops)/ops/page.tsx:130-136`; `src/components/ops/ops-queue-row.tsx:1-8`.

Staff authorization remains page-level. All evidence is read server-side and passed as serializable props; only disclosure state belongs in the existing `"use client"` row.

### Decision controls and errors

**Source:** `src/components/ops/ops-decision-actions.tsx:273-310`.

```tsx
<div className="flex flex-wrap items-center gap-2">
  <Button size="touch" onClick={handleApprove}>Approve</Button>
  <OpsRejectDialog trigger={<Button variant="outline" size="touch">Reject</Button>} />
</div>
```

Do not add a new action, dialog, decision widget, or error channel. Preserve the existing protected action callers and named refusal behavior.

### Terminal composition

**Source:** `src/components/patterns/row-card.tsx:184-217`.

`RowCard` becomes navigable only when passed `href`; without it the title is plain text and no overlay link exists. Continue omitting `href` for all queue rows.

### Design-system evidence

**Sources:** `src/components/listing/photo-gallery.tsx:176-238`; `src/lib/listing-vocab.ts:68-89`.

Reuse `PhotoGallery` once inside expanded evidence and `AMENITY_LABELS` for noninteractive neutral badges. Use `Not set` for absent description/amenities and the existing photo zero state.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| — | — | — | Every required change has a close, tracked in-code analog. |

## Metadata

**Analog search scope:** `src/app/(ops)/ops`, `src/lib/ops`, `src/components/ops`, `src/components/listing`, `src/components/patterns`, `src/lib`, `tests/ops`, `e2e`  
**Files scanned:** 11  
**Pattern extraction date:** 2026-09-10
