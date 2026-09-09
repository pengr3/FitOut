# Phase 21: The Host Can See Where They Stand - Pattern Map

**Mapped:** 2026-09-09
**Files analyzed:** 19 new/modified files
**Analogs found:** 19 / 19

## File Classification

| New/Modified File | Role | Data Flow | Closest tracked analog | Match |
|---|---|---|---|---|
| `src/lib/host/verification-roadmap.ts` (new) | utility/view-model | transform | `src/lib/host/verification-signal.ts` | role/data-flow |
| `src/components/host/verification-roadmap.tsx` (new) | component | request-response | `src/components/host/verification-panel.tsx` | role-match |
| `src/lib/listing/review-history.ts` (new) | service/DTO | batch CRUD/transform | `src/app/(host)/host/listings/page.tsx` | data-flow |
| `src/app/(host)/host/page.tsx` | server page/controller | request-response + CRUD | same file | exact |
| `src/components/host/host-signals.tsx` | component | transform | same file | exact |
| `src/app/(host)/host/listings/page.tsx` | server page/controller | request-response + batch CRUD | same file | exact |
| `src/components/listing/listing-card.tsx` | client component | event-driven | same file (`ConfirmDialog`) | exact |
| `src/app/(host)/host/listings/[id]/edit/page.tsx` | server page/controller | request-response + CRUD | same file | exact |
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` | client component | event-driven | same file save-state path | exact |
| `src/app/actions/listing.ts` | server action/service | CRUD | same file | exact |
| `src/app/actions/listing-photo.ts` | server action/service | file-I/O + CRUD | same file | exact |
| `src/components/listing/photo-uploader.tsx` | client component | file-I/O + event-driven | same file | exact |
| `tests/host/verification-roadmap-state.test.ts` (new) | unit test | transform | `tests/host/verification-surface.test.ts` | exact style |
| `tests/host/verification-roadmap.test.tsx` (new) | component test | request-response | `tests/listing/listing-card.test.tsx` | role-match |
| `tests/listing/review-history.test.ts` (new) | integration test | batch CRUD | `tests/listing/material-edit.test.ts` | role-match |
| `tests/listing/listing-card.test.tsx` | component test | event-driven | same file | exact |
| `tests/listing/material-edit.test.ts` | integration test | CRUD | same file | exact |
| `tests/listing/wizard-save-state.test.tsx` | component/structural test | event-driven | same file | exact |
| `tests/design/card-pattern-coverage.test.ts` | structural test/config registry | transform | same file inventory | exact |

All analogs above were verified with `git ls-files`; no runtime/plugin mirror is named. `src/lib/listing/re-review.ts`, `src/components/ui/**`, loading plates, `src/lib/design/accent-uses.ts`, `src/lib/design/live-regions.ts`, and selector/one-tree registries are constraints, not edit targets unless a focused acceptance test proves an update is required. The re-review module is explicitly byte-frozen.

## Pattern Assignments

### `src/lib/host/verification-roadmap.ts` (utility, transform)

**Analog:** `src/lib/host/verification-signal.ts`

Copy the total-map and server-finished-display-value pattern. The compiler must force a decision for every persisted verification state:

```ts
// src/lib/host/verification-signal.ts:137-153,254-259
export const VERIFICATION_SIGNAL = {
  unverified: {
    state: "Get your account checked",
    reason: "...",
    wayOut: "Start the check",
  },
  // every other enum member is explicit
  grandfathered: {
    state: "There's nothing to do here",
    reason: "Your account can already create and publish listings.",
    wayOut: "Go to your listings",
  },
} as const satisfies Record<HostVerificationStatus, VerificationSignal>;
```

Copy the pure, positive allow-list authority call for final readiness; never derive readiness by counting completed cards:

```ts
// src/lib/bookability.ts:109-131
export function deriveBookable(listing: {...}, host: {...}): boolean {
  return listing.status === "published" && listing.hasOperatingHours &&
    (listing.reviewState === "approved" || listing.reviewState === "grandfathered") &&
    host.emailVerified && host.payoutsEnabled &&
    (host.verificationStatus === "approved" || host.verificationStatus === "grandfathered");
}
```

Reuse/export the established absolute formatter rather than browser formatting (`verification-signal.ts:367-412`): `Intl.DateTimeFormat("en-PH", { ... timeZone: "Asia/Manila" })`. Use the page's DB `now`; stale pending is exactly 30 minutes from the shipped reconciliation constant/authority.

### `src/components/host/verification-roadmap.tsx` (component, request-response)

**Analog:** `src/components/host/verification-panel.tsx`

Keep static roadmap rendering server-safe and accept finished serializable display props. Copy `PanelCard` state composition and action ownership:

```tsx
// src/components/host/verification-panel.tsx:156-165
if (status === "approved" || status === "grandfathered") {
  return (
    <PanelCard tone="muted" title={signal.state}>
      <p className={REASON_CLASS}>{signal.reason}</p>
      <p className={cn(SUPPORTING_CLASS, "mt-3")}>
        <Link href={LISTINGS_PATH} className="underline underline-offset-4">
          {signal.wayOut}
        </Link>
      </p>
    </PanelCard>
  );
}
```

The new surface differs intentionally: an ordered `<ol>` with four `<li>` cards in one-column / two-column CSS, explicit step numbers, text-visible Completed/Current/Waiting/Next states, and at most one real button. Waiting/Next have no disabled pseudo-controls. Carry `data-verification-owed={status}` on the Step 1 state root. When any listing is bookable, render one compact `PanelCard`, not the four cards.

### `src/app/(host)/host/page.tsx` and `src/components/host/host-signals.tsx`

**Analog:** their current implementations.

Preserve page-level auth/capability gates and owner scoping:

```ts
// src/app/(host)/host/page.tsx:98-122
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect("/login");
if (!(session.user as typeof session.user & { canHost?: boolean }).canHost) redirect("/");
const now = await readDbNow(db);
const [{ n } = { n: 0 }] = await db.select({ n: count() }).from(listing)
  .where(and(eq(listing.hostId, session.user.id), isNull(listing.deletedAt)));
```

Replace the count projection with the narrow fields needed for the per-listing `deriveBookable` call; reuse the existing `now`, verification, payout, and grouped missing-hours reads. Do not append a query or query in a render loop.

Remove only the verification prop/row from `HostSignals`; retain the other signals. The old row to replace is exactly:

```tsx
// src/components/host/host-signals.tsx:226-235
{checkOwed && (
  <PanelCard tone="muted">
    <p className="text-body text-muted-foreground" data-verification-owed={verificationStatus}>
      {verificationNudge} <Link href="/host/verify">{verificationCta}</Link>
    </p>
  </PanelCard>
)}
```

### `src/lib/listing/review-history.ts` and `src/app/(host)/host/listings/page.tsx`

**Analog:** current grouped rejection read in `src/app/(host)/host/listings/page.tsx`.

Keep the owner/non-deleted parent boundary in SQL and collapse one grid-level query into maps:

```ts
// src/app/(host)/host/listings/page.tsx:89-103,142-152
const rows = await db.select().from(listing)
  .where(and(eq(listing.hostId, session.user.id), isNull(listing.deletedAt)))
  .orderBy(desc(listing.updatedAt));
const ids = rows.map((r) => r.id);
// one grouped read, then:
const rejectionReasonByListing = new Map(rejectionRows.map((r) => [r.listingId, r.reason]));
```

Replace `rejectionRows` with one ranked query: inner `row_number() over (partition by listing_id order by submitted_at desc, id desc)`, outer `row_number <= 6`. Project only `listingId`, `state`, `reason`, `submittedAt`, `decidedAt`; never select or serialize staff/review/host IDs. Convert rows 1-5 into display DTOs and row 6 only into `hasOlder`. Format absolute timestamps on the server. A total state-label map must turn raw enums into Submitted → Waiting → terminal display copy; grandfathered gets dedicated capability copy.

### `src/components/listing/listing-card.tsx`

**Analog:** `ConfirmDialog` and the existing card footer in the same file.

Copy the controlled Radix dialog/focus-restoration composition:

```tsx
// src/components/listing/listing-card.tsx:172-200
const [open, setOpen] = useState(false);
return (
  <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{trigger}</DialogTrigger>
    <DialogContent>
      <DialogHeader><DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription></DialogHeader>
      <DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose></DialogFooter>
    </DialogContent>
  </Dialog>
);
```

For rejected only, replace the direct Edit link with `Fix and resubmit`, opening a no-mutation explanation dialog. Render material labels from `MATERIAL_FIELDS.map(field => MATERIAL_FIELD_LABELS[field])`; the label map must be total. `Continue to edit` is the sole forward action. Add a history dialog only when cycles exist and render an `<ol>` of already-resolved DTOs. Reasons remain React text (`listing-card.tsx:418-437`), never HTML.

Preserve footer wrapping/alignment:

```tsx
// src/components/listing/listing-card.tsx:471-478
<CardFooter className="gap-2 mt-auto flex-wrap">
  {editHref && <Button asChild variant="outline" size="sm">
    <Link href={editHref}><PencilIcon className="size-3.5" /> Edit</Link>
  </Button>}
</CardFooter>
```

Do not alter shipped Delete/Unlist dialogs.

### `src/app/(host)/host/listings/[id]/edit/page.tsx`

**Analog:** same file's ownership query and server-to-client projection.

Bind ownership and deletion in the query itself (strengthen the existing post-read owner guard) and include current review state/latest rejected reason without trusting search params:

```ts
// src/app/(host)/host/listings/[id]/edit/page.tsx:30-60
const session = await auth.api.getSession({ headers: await headers() });
if (!session?.user) redirect("/login");
const rows = await db.select().from(listing)
  .where(and(eq(listing.id, id), isNull(listing.deletedAt)));
const row = rows[0];
if (!row || row.hostId !== session.user.id) notFound();
const [photos, amenities, tags, lock] = await Promise.all([...]);
```

Pass a narrow serializable rejected-context/reason prop to the wizard. A query string must never create this context or authorize the receipt.

### `src/app/(host)/host/listings/[id]/edit/wizard.tsx`

**Analog:** its existing result-driven save state.

Copy the server-result-first flow:

```ts
// wizard.tsx:622-653
async function persist(): Promise<ListingResult> {
  return saveListingStep(listing.id, toPayload(form.getValues()));
}
const res = await persist();
setSaveState(saveStateFor(res));
if (res.ok) stepForward();
```

Add persistent rejected notice from the server prop and a latched receipt: only `rejectedContext && res.ok && res.flipped` sets it. On the first true result focus/scroll the `tabIndex={-1}` receipt exactly once. Suppress the generic success toast/navigation for that first true save long enough to display the receipt; false/non-material/error results never render it. Relay the same boolean from photo add/remove, not reorder.

### `src/app/actions/listing.ts` and `src/app/actions/listing-photo.ts`

**Analog:** existing in-transaction guarded-transition calls.

Capture and propagate, do not reinterpret, the existing transition result:

```ts
// src/app/actions/listing.ts:641-679
await db.transaction(async (tx) => {
  await tx.update(listing).set(patch)
    .where(and(eq(listing.id, listingId), eq(listing.hostId, userId)));
  if (materialEdit) {
    await markForReReview(tx, listingId, "listing_fields");
  }
});
return { ok: true, id: listingId };
```

Return `flipped` on successful field saves and photo add/remove results. Keep authentication/ownership re-checks in every Server Action. Next.js 16's installed Forms guide explicitly requires independent auth/authz inside each action. Preserve atomicity: field/photo mutation and re-review remain in one transaction.

Photo add/remove analogs are `listing-photo.ts:288-319` and `485-514`. Reorder is intentionally non-material (`382-450`) and must not gain `flipped: true` semantics.

### `src/components/listing/photo-uploader.tsx`

**Analog:** its existing optional count callback and result handling.

```tsx
// src/components/listing/photo-uploader.tsx:116-147,189-199
onCountChange?: (count: number) => void;
useEffect(() => { onCountChange?.(photos.length); }, [photos.length, onCountChange]);
const res = await persistPhoto(listingId, { publicId, url });
if (!res.ok) { toast.error(res.error); return; }
setPhotos((prev) => [...prev, res.photo]);
```

Add a narrow optional callback for server-confirmed re-review and invoke it only after successful add/remove results when `flipped` is true. Do not invoke it from `commitOrder`.

## Test Pattern Assignments

### Roadmap state/component tests

Use enum-to-map equality, not sampled states:

```ts
// tests/host/verification-surface.test.ts:216-236
const declared = Object.keys(VERIFICATION_SIGNAL).toSorted();
const enumerated = [...hostVerificationStatus.enumValues].toSorted();
expect(declared).toEqual(enumerated);
for (const status of enumerated) {
  const signal = VERIFICATION_SIGNAL[status as keyof typeof VERIFICATION_SIGNAL];
  expect(signal.state.trim().length).toBeGreaterThan(0);
}
```

For `verification-roadmap.test.tsx`, follow Testing Library role/name queries and the `makeListing` factory style from `tests/listing/listing-card.test.tsx:34-61,278-340`. Assert exact card order/count, one action maximum, no action for waiting/next, owed hook preservation, and four-cards XOR readiness receipt.

### Review-history/material integration tests

Use real DB fixtures and assert durable row truth like `tests/listing/material-edit.test.ts:237-261`: invoke the public action/read, then inspect state/rows. New history tests must prove owner scope, deleted-parent exclusion, deterministic newest-first tie-break, five-visible/sixth-sentinel behavior, and absence of staff/internal IDs in DTO shape.

Extend material-edit tests to assert returned `flipped` true only when the guarded transition moved; cover false for non-material, already-pending, failed, and reorder paths. Keep `MATERIAL_FIELDS` equality assertion (`material-edit.test.ts:212-235`).

### Listing-card and wizard tests

Extend the existing card tests rather than creating a second harness. Render operator reasons and assert exact-once plain text (`listing-card.test.tsx:321-340`); use role/name interactions for both dialogs and assert rejected-only replacement of Edit.

For the wizard, reuse mocked action results and source-slice guard conventions:

```ts
// tests/listing/wizard-save-state.test.tsx:285-333
actions.saveListingStep.mockResolvedValue({ ok: false, error: SAVE_REFUSAL });
mount();
await advance();
expect(regionText()).toContain(SAVE_REFUSAL);
actions.saveListingStep.mockResolvedValue({ ok: true });
await advance();
expect(regionText()).toBe(SAVE_STATE_SAVED_LABEL);
```

Add true/false result tests, photo callback tests, one-time focus/latch behavior, no query-authorized receipt, and save-as-draft behavior. Assert no duplicate success toast/live region.

### Design registry

Register the new roadmap component as a PanelCard adopter following `tests/design/card-pattern-coverage.test.ts:560-616`:

```ts
{
  file: "src/components/host/verification-roadmap.tsx",
  pattern: "panel-card",
  status: "adopted",
  why: "...four roadmap states share the declared panel container...",
}
```

Do not add a raw-card exemption or a fourth pattern.

## Shared Patterns

### Server/client boundary

Installed Next.js 16 docs (`node_modules/next/dist/docs/01-app/01-getting-started/05-server-and-client-components.md`) say pages/layouts are Server Components by default and Client Component props must be serializable. Therefore DB reads, owner/deleted filters, timestamps, and history formatting stay server-side; only dialogs, wizard state, and focus behavior cross into client islands. Do not pass Date objects or database rows to client components—pass narrow finished strings/DTOs.

### Authentication and authorization

Every page repeats session and `canHost` checks; every Server Action repeats authentication/ownership even when called from an authenticated page. Owner ID and `deletedAt IS NULL` belong in database predicates. Use `notFound()` for inaccessible listings to avoid existence disclosure.

### Error handling and disclosure

Actions return discriminated `{ ok: false, error }` results for host-actionable refusals and log bounded server context. Route read failures flow to the existing error boundary/digest. Never serialize SQL errors, staff identity, vendor refs, raw review codes, or internal IDs. Render operator reasons as text.

### One authority / one query

Reuse `deriveBookable`, `VERIFICATION_SIGNAL`, `MATERIAL_FIELDS`, cooldown/reconciliation constants, and `markForReReview`. Group grid data once and collapse it into maps/sets before rendering. No query inside `rows.map`, no browser clock, no countdown/poll, and no duplicate material-field list.

### Accessibility and responsive composition

Use semantic ordered lists for roadmap/history, heading order h1→h2→h3, visible state/action labels, decorative icons hidden, Radix Dialog title/description/close/focus restoration, dynamic viewport caps, wrapping plain text, and one responsive DOM tree. Keep the roadmap action at least 44px high; retain the listing footer's deliberate 28px `size="sm"` controls and `flex-wrap`.

## No Analog Found

None. The new files have strong tracked in-repository analogs. Research examples are needed only for the PostgreSQL per-parent window query syntax; the surrounding ownership, projection, mapping, and testing patterns all exist locally.

## Metadata

**Search scope:** `src/app/(host)/host`, `src/app/actions`, `src/components/host`, `src/components/listing`, `src/lib/host`, `src/lib/listing`, `tests/host`, `tests/listing`, `tests/design`, installed Next.js 16 docs.

**Tracked-source gate:** Passed for every named source analog via `git ls-files -- <path>`.

**Pattern extraction date:** 2026-09-09
