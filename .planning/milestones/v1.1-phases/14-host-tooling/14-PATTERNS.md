# Phase 14: Host Tooling — Pattern Map

**Mapped:** 2026-08-23
**Files analyzed:** 41 (6 genuinely new source artifacts · 22 modified source files · 13 new test files)
**Analogs found:** 40 / 41 (one file — the two-zone VR fixture block — has a partial analog only)

> ⚠ **Prose safety, inherited from `14-RESEARCH.md:10-16`.** This file lives in `.planning/`, outside every
> scanned tree (`leak.test.ts` reads `src/` only; `globals.css`'s `source("../")` narrows Tailwind's scan to
> `src/`), so class names are quoted here for precision. **That licence does not travel.** Any sentence
> copied from here into a source comment must name tokens descriptively — three plans in this repo have been
> burned by a comment tripping the grep that forbids the thing the comment forbids.

> **This is a POLISH phase on a shipped app.** For most files the closest analog is a **sibling in the same
> directory**, and that is the correct answer rather than a shortcut: the repository's conventions are
> per-directory and mechanically enforced by 48 committed design gates. Where an analog is a sibling, the
> row says *which* sibling and *why that one*.

> **Do not re-derive what `14-RESEARCH.md` measured.** The day-boundary predicate, the wizard's line map, the
> gate traps, M1–M5 and the flake pattern are all measured there. This document is the
> **file → analog → excerpt** mapping only.

---

## File Classification

### A. The genuinely new artifacts

| New file | Role | Data flow | Closest analog | Match | Gate obligation attached |
|---|---|---|---|---|---|
| `src/lib/booking/bookings-query.ts` → **`queryHostAgenda`** (extend, do not fork) | service / queryable | request-response (owner-scoped SELECT, two buckets) | `queryHostBookings` in the **same file** (`:289-339`) + `getOpenHoursLockState` (`src/lib/listing/hours-lock.ts:85-97`) for the venue-local predicate | **exact** | none — a SELECT, zero migrations (`git diff --stat drizzle/` must stay empty) |
| `src/components/host/host-agenda.tsx` (+ its row; decomposition is planning's call) | component (RSC, presentational) | request-response (props are pre-formatted server strings) | `src/components/host/host-booking-row.tsx:72-131` — same directory, same `RowCard` composition, same "props are pre-formatted, zero formatting here" rule | **exact** | `SELECTOR_IDS` +4 (`host-agenda`, `agenda-rows`, `agenda-next`, `agenda-none`); `brand-recipe.test.ts:824` host `variant="brand"` total must stay **5** |
| `src/lib/availability/week-strip.ts` — **`deriveWeekStrip`** | utility (pure, isomorphic, directive-free) | transform | `src/lib/availability/block-reason.ts` (whole file) — the repo's canonical "pure mapper the client editor imports"; secondary: `src/lib/booking/policy-disclosure.ts:50-53` for the *why a pure module exists* header | **exact** | none |
| `src/components/availability/week-strip.tsx` — the 7-column strip | component (client island inside the editor) | event-driven (re-renders from `useWatch`) | `src/components/availability/weekly-hours-editor.tsx:96-99` (its own live input) + `src/components/patterns/panel-card.tsx:85-178` (the container) | **exact** | `SELECTOR_IDS` +2 (`week-strip`, `week-strip-text`); `CARD_SURFACES` 13 → 15; `contrast-pairs.ts` two `reason` amendments |
| `src/components/host/publish-checklist.tsx` — extracted from the wizard | component (client, presentational over a passed array) | request-response (derives nothing; renders rows + `setStep`) | `src/app/(host)/host/listings/[id]/edit/wizard.tsx:1370-1434` — **the code being moved is its own best analog**; container from `panel-card.tsx` (`sticky` prop) | **exact** | ⚠ **FOUR inventory amendments in the same commit** — see § Gate-Amendment Obligations |
| The **save-state region** — stays **inside** `wizard.tsx` (nav row, `:1438-1467`) | component region (client) | event-driven (reads a server-action result) | `src/app/(app)/profile/profile-form.tsx:45-63, 248-265` — RHF + server action + `role="status"` + muted ink; naming from `src/components/group/share-link-box.tsx:109-171` | **exact** | `LIVE_REGIONS` row `wizard-save-state` names **`wizard.tsx`** as its file — extracting it into its own component moves that row |

### B. Modified source files — restyles and adoptions

| Modified file | Role | Data flow | Closest analog | Match | Note |
|---|---|---|---|---|---|
| `src/app/(host)/host/page.tsx` | route (RSC) | request-response | `src/app/(host)/host/requests/page.tsx:45-135` — the gate-2 + `readDbNow` + display-map shape D-140/D-141 must copy | **exact** | keep **both** `variant="brand"` sites (`:150`, `:193`) — G2 trap B |
| `src/app/(host)/host/loading.tsx` | route plate | — | `src/app/(host)/host/requests/loading.tsx` (whole file, 31 lines) | **exact** | its own header's "all nine host routes" arithmetic is stale — measured 11/11 |
| `src/app/(host)/host/requests/page.tsx` | route (RSC) | request-response | itself + `bookings/page.tsx`'s `PageHeader`-less shell; the plate above is the header/lede source of truth | **exact** | column re-order only; the read (`:60-89`) is untouched (06-07 IDOR test) |
| `src/components/host/request-row.tsx` | component (client) | event-driven | `src/components/booking/cancel-request-dialog.tsx:33-89` (the confirm-with-footer shape) → ported onto `ResponsiveDialog` (`src/components/booking/booking-sticky-bar.tsx:187-202` is the only real call-site example) | role-match | ⚠ `RequestActions` renders on **two** surfaces (`bookings/page.tsx:265-271`) |
| `src/components/booking/request-countdown.tsx` | component (client) | event-driven | **itself** — `finalHourEmphasis` (`:95-108`) is the precedent for adding `emphasis` as an opt-in prop | **exact** | ONE digits node in both arms — `phase13-surface-gates` counts LINES (`:262-270`, pinned at 1) |
| `src/app/(host)/host/bookings/page.tsx` | route (RSC) | request-response | `requests/loading.tsx` for the `PageHeader` hoist; itself for everything else | **exact** | the one `shadow-raised` `<select>` at `:175` is pinned by `elevation-z.test.ts:305-311` — do not swap it |
| `src/app/(host)/host/listings/[id]/edit/page.tsx` | route (RSC shell) | request-response | `src/app/(app)/bookings/**` shells that consume `BOOKING_SHELL` | role-match | **this** file gains `HOST_PANEL_SHELL` + `lg:max-w-5xl`, not `wizard.tsx` |
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` | component (client, 1472 lines) | event-driven | itself — every D-148/149/150 edit has an in-file precedent (see § Pattern Assignments) | **exact** | `persist()` (`:399-406`) must return the result, not a boolean |
| `src/app/(host)/host/listings/[id]/availability/page.tsx` | route (RSC) | request-response | `requests/page.tsx` for the `PageHeader` + shell-constant shape | **exact** | `PanelCard tone="muted"` for the two advisory `<p>`s |
| `src/components/availability/weekly-hours-editor.tsx` | component (client, RHF) | event-driven | `src/components/host/request-row.tsx` for the raw-`Card`→pattern swap idiom; `panel-card.tsx:48-84` for the props | **exact** | leaves `ALLOWED_RAW_CARD` |
| `src/components/availability/blocks-editor.tsx` | component (client) | CRUD | `empty-state.tsx:116-153` + `responsive-dialog.tsx:203-261` | **exact** | leaves `ALLOWED_RAW_CARD`; `ADOPTERS` 13 → 14 |
| `src/components/listing/address-autocomplete.tsx` | component (client) | event-driven | `src/components/group/share-link-box.tsx:109-171` — the **worked example of a discharge** (named `role="status"`, label ≠ sentence) | **exact** | `LIVE_REGION_EXCLUSIONS` 1 → 0 |
| `src/components/listing/photo-uploader.tsx:226` | component (client) | file-I/O | same as above — `share-link-box.tsx`'s naming rule | **exact** | Open Question 6: name it (4th `LIVE_REGIONS` row) **or** exclude it for Phase 16 — but then the list does not reach 0 |
| `src/app/(host)/host/earnings/page.tsx` | route (RSC) | request-response | `requests/page.tsx`'s `PageHeader` adoption, and **nothing else** | **exact** | HFLOW-05: shell constant + `PageHeader` + type roles only |
| `src/lib/design/measurements.ts` (+5) | config / inventory | — | `BOOKING_SHELL` (`:336-369`) and `PANEL_MIN_HEIGHT` (`:184-191`) — the two rows whose docblock shape the new five must copy | **exact** | derivation in the docblock, never at a call site |
| `src/lib/design/selector-contract.ts` (+9) | config / inventory | — | the tail rows `receipt-total` / `receipt` (`:795-836`) — the `why` + `owner` shape | **exact** | declared **and** rendered in the same commit (both directions asserted) |
| `src/lib/design/live-regions.ts` (rename + 3 rows + exclusion → 0) | config / inventory | — | plan 13-14's own discharge, recorded in the file header (`:337-374`) | **exact** | ⚠ `live-regions.test.tsx:491` must be rewritten in the same commit |
| `src/lib/design/accent-uses.ts` entry 7 `device` | config / inventory | — | entry 7 itself (`:148-157`) | **exact** | text only; nothing asserts it |
| `src/lib/design/contrast-pairs.ts` two `reason` fields | config / inventory | — | the `muted`/`background` and `muted`/`card` exclusion rows (`:454-467`) | **exact** | prose only; `CONTRAST_PAIRS` unchanged |
| `src/lib/design/visual-baselines.ts` (+9 rows, 6 blocked) | config / inventory | — | the 20 Phase-13 declared-and-blocked rows already in the file | **exact** | CI-only; never mint a baseline against a live clock |
| `scripts/seed-baseline-fixtures.ts` (Phase-14 block) | fixture / config | batch | its own `vrt_host_1` block (`:94`, `:189-200`, `:208-260`) | role-match | needs bookings at fixed instants + a host re-point — **not verifiable on win32** |
| `e2e/helpers/visual-drive.ts` — a `hostDrive` factory | test helper | — | the existing two-parameter drive signature 13-15 added for exactly this (`:840-852` `bookingNotFoundDrive`) | role-match | — |
| The three loading plates that share a shell constant (`bookings/`, `earnings/`, availability) | route plates | — | `requests/loading.tsx` | **exact** | page and plate import the **same** constant |

---

## Pattern Assignments

### 1. `queryHostAgenda` — the one new owner-scoped read (D-140 / D-141 / D-142)

**Home:** `src/lib/booking/bookings-query.ts`, exported from the same module. **Do not author a new module** —
that file's own header (`:1-3`) says it is *"the ONE place `/bookings` and `/host/bookings` get their rows
from, so the booker and host lists can never drift"*, and a second module recreates the three-copy problem
`when-label.ts:3-8` records.

**Analog A — `queryHostBookings` (`bookings-query.ts:289-339`).** Copy the projection, the JOIN set, the
owner predicate and the hydration boundary verbatim:

```ts
export async function queryHostBookings(
  dbConn: DbConn,
  args: { hostId: string; tab: BookingsTab; listingId: string | null; cursor: string | null; limit: number },
): Promise<BookingsPage> {
  const limit = clampLimit(args.limit);
  const cursor = parseCursor(args.cursor);
  // Applied INSIDE the host-scoped predicate — it can only narrow, never widen (T-07-30).
  const listingFilter = args.listingId ? sql`AND b.listing_id = ${args.listingId}` : sql``;

  const rows = (await dbConn.execute(sql`
    SELECT
      b.id,
      ${isoUtc("b.starts_at")} AS "startsAtIso",
      ${isoUtc("b.ends_at")}   AS "endsAtIso",
      b.status::text           AS "status",
      ${displayStatusExpr}     AS "displayStatus",
      b.cancelled_by::text     AS "cancelledBy",
      b.quoted_total_cents     AS "quotedTotalCents",
      b.full_day               AS "fullDay",
      b.open_capacity          AS "openCapacity",
      b.space_price_cents      AS "spacePriceCents",
      b.currency,
      l.id AS "listingId", l.title AS "listingTitle", l.timezone, l.city,
      l.day_rate_cents AS "dayRateCents",
      u.first_name AS "bookerFirstName"
    FROM booking b
    INNER JOIN listing l ON l.id = b.listing_id
    INNER JOIN "user" u ON u.id = b.booker_id
    WHERE l.host_id = ${args.hostId}
      ...
  `)) as unknown as RawBookingRow[];

  return toPage(rows, limit);
}
```

**Do not trim the projection.** `composeWhenLabelShort` requires `fullDay` and `openCapacity` as *required*
fields precisely so `tsc` enumerates every projection (`when-label.ts:60-76`).

**Analog B — the venue-local day predicate (`src/lib/listing/hours-lock.ts:85-97`).** The **exact** shape
D-141 needs already exists and is already tested (`tests/availability/hours-lock.test.ts`, 5 cases). Copy the
per-row-column zone, verbatim in form:

```ts
  const result = await dbConn.execute(sql`
    SELECT EXTRACT(DOW FROM (b.starts_at AT TIME ZONE l.timezone))::int AS dow,
           count(*)::int AS n,
           MAX(b.ends_at) AS unlocks_at
    FROM booking b
    JOIN listing l ON l.id = b.listing_id
    WHERE b.listing_id = ${listingId}
      ...
  `);
```

→ becomes (measured against live PG18 in `14-RESEARCH.md` § The "Today" Query):

```
(b.starts_at AT TIME ZONE l.timezone)::date = ($now::timestamptz AT TIME ZONE l.timezone)::date
```

**`starts_at`, not `ends_at`, decides the venue-local day** — `hours-lock.ts:60-63` settles it: *"a pass
belongs to the day it was BOUGHT for."* Two conventions for "which day is this session on" is the defect.

**Analog C — the bound-instant idiom (`bookings-query.ts:190-195`).** `readDbNow(db)` is read **once** and
its ISO string is passed **into** the statement, exactly as `keysetPredicate` already does:

```ts
function keysetPredicate(tab: BookingsTab, cursor: ParsedCursor | null) {
  if (!cursor) return sql``;
  return tab === "upcoming"
    ? sql`AND (b.starts_at, b.id) > (${cursor.startsAtIso}::timestamptz, ${cursor.id}::text)`
    : sql`AND (b.starts_at, b.id) < (${cursor.startsAtIso}::timestamptz, ${cursor.id}::text)`;
}
```

**Analog D — the status half (`bookings-query.ts:175-179`).** Reuse `tabPredicate("upcoming")`'s status
clause rather than minting a third status set; both UNION-ALL buckets must carry the identical one or a row
falls through both:

```ts
function tabPredicate(tab: BookingsTab) {
  return tab === "upcoming"
    ? sql`b.ends_at > now() AND b.status NOT IN ('cancelled','declined')`
    : sql`NOT (b.ends_at > now() AND b.status NOT IN ('cancelled','declined'))`;
}
```

**Analog E — the clock, and the hydration boundary (`bookings-query.ts:134-136`, `:209-234`).**

```ts
export function isoUtc(column: string) {
  return sql`to_char(${sql.raw(column)} AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"')`;
}

export async function readDbNow(dbConn: DbConn): Promise<Date> {
  const [row] = (await dbConn.execute(sql`
    SELECT ${isoUtc("now()")} AS "nowIso"
  `)) as unknown as { nowIso: string }[];
  return new Date(row.nowIso);
}
```

⚠ **`sql.raw()` takes a COLUMN NAME, never a value.** The agenda query must never pass user input through it
(Security V4, `14-RESEARCH.md` § Security Domain).

---

### 2. The agenda component and its three states (D-140, D-142, D-143)

**Analog:** `src/components/host/host-booking-row.tsx:72-131` — a sibling in the very same directory, and the
one that already answers *"what does a host row say, and who formats it"*.

**Props-are-pre-formatted contract** (`host-booking-row.tsx:35-55`) — copy this shape for the agenda row:

```ts
export type HostBookingRowData = {
  bookingId: string;
  spaceTitle: string;
  /** Booker first name, or "A guest" when withheld — matches RequestRow. */
  bookerLabel: string;
  /** Pre-formatted, venue-tz-safe window label "{date}, {time} ({City} time)". */
  whenLabel: string;
  /** Pre-formatted server-frozen total (formatMoney) — the UI does ZERO price arithmetic. */
  amountLabel: string;
  status: BookingDbStatus;
  cancelledBy: string | null;
  startsAt: Date; endsAt: Date;
  /** The DB clock, threaded from the page so the badge and the tab partition agree. */
  now: Date;
};
```

**Container + slots** (`host-booking-row.tsx:73-113`) — the agenda row is the same composition with
`actions` **absent** and `title` = the booker's first name (D-140's inversion):

```tsx
    <RowCard
      href={`/host/bookings/${row.bookingId}`}
      title={row.spaceTitle}
      meta={row.whenLabel}
      status={
        <BookingStatusBadge
          status={row.status} endsAt={row.endsAt} now={row.now}
          side="host" cancelledBy={row.cancelledBy}
        />
      }
    >
```

`RowCard`'s slot contract is at `src/components/patterns/row-card.tsx:73-133`; its render at `:136-226`.
Note `href` present → the title becomes a `<Link>` with an overlay `::after`; `href` absent → a `<p>`
(`:180-196`). The agenda row **has** an `href` (D-140's table), the request row does **not** (D-144).

**The withheld-booker fallback is already written twice** and must be the same third time —
`requests/page.tsx:117`:

```ts
    bookerLabel: r.bookerFirstName?.trim() || "A guest",
```

**State B (quiet day)** — `PanelCard tone="muted"` with one sentence. Analog for the container +
one-muted-sentence shape: `src/app/(host)/host/page.tsx:135-146`:

```tsx
      {missingHours.length > 0 && (
        <div className="mt-4">
          <PanelCard tone="muted">
            <p className="text-sm text-muted-foreground" data-hours-missing={missingHours.length}>
              {hoursNudge}{" "}
              <Link href={hoursNudgeHref} className="underline underline-offset-4">
                {HOURS_MISSING_CTA}
              </Link>
            </p>
          </PanelCard>
        </div>
      )}
```

**State C (nothing booked)** — `EmptyState`. Its props are a **discriminated union**
(`empty-state.tsx:81-115`): `tone="positive"` owns the glyph and `icon?: never`; `actions` is **required**
and a caller with nothing to offer passes `null` on purpose. Render at `:116-153`.

**The dashboard's own page shape** — analog `src/app/(host)/host/requests/page.tsx:45-135`, which is the
only host page that already reads the clock once and threads it:

```tsx
export default async function HostRequestsPage() {
  // Defense in depth: the (host) layout already gates, but never render the inbox without a real session.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) { redirect("/login"); }
  const u = session.user as typeof session.user & { canHost?: boolean };
  if (!u.canHost) { redirect("/"); }
  ...
  const now = await readDbNow(db);
```

**Loading plate** — redraw `(host)/host/loading.tsx` on `requests/loading.tsx`'s model (whole file, 31
lines): real `PageHeader`, then `RowListSkeleton label="…"`, inside the **shared shell constant**.
`RowListSkeleton` (`row-list-skeleton.tsx:17-46`) has **no height prop today** and hard-wires
`ROW_CARD_HEIGHT`; M2 recommends adding an optional height taking a **declared** `measurements.ts` constant
(`skeleton-measurements.test.ts:383-398` bans literals, not constants).

---

### 3. `deriveWeekStrip` — the pure half (D-152, D-153)

**Home:** `src/lib/availability/week-strip.ts`.
**Analog:** `src/lib/availability/block-reason.ts` — the whole file, 23 lines, and the *reason* it is
shaped that way is stated in its own header:

```ts
// Human copy for a block's reason (T9). ONE pure, directive-free mapper so the client blocks-editor can
// import it: it re-labels the single host-cancellation sentinel and passes a host's own free-text reason
// through untouched (trimmed). Directive-free on purpose — no "use client"/"use server" — so it stays
// isomorphic and testable.
```

That is exactly `deriveWeekStrip`'s situation: it must be importable by a `"use client"` editor **and**
unit-testable in the node environment. **No directive. No `@/lib/db` import. No clock read.**

**Secondary analog for the docblock** — `src/lib/booking/policy-disclosure.ts:50-53`, which states the "why a
pure module rather than an inline composition" argument the planner should reuse:

```
// PURE. No `@/lib/db` import, no clock read of its own — `now` is an argument, and every caller reads
// it from Postgres (the 07-06 boundary contract). No `server-only` guard either …
```

**Inputs it must reuse rather than re-declare** (`weekly-hours-editor.tsx:40-65`):

```ts
export type WeeklyHoursWindow = {
  dayOfWeek: number;
  openTime: string; // "HH:mm" (page normalizes the DB "HH:mm:ss" via .slice(0, 5))
  closeTime: string; // "HH:mm"
};

/** On-the-hour "HH:mm" options (00:00..23:00) — values line up with the shared schema's on-the-hour rule. */
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, h) => { … return { value, label: `${hour12}:00 ${period}` }; });

/** "HH:mm" (or "HH:mm:ss") → integer hour 0..23, for the client-side overlap math. */
const toHour = (t: string) => parseInt(t.slice(0, 2), 10);
```

`HOUR_OPTIONS`'s labels are what D-153 requires the sr-only sentence to be formatted with ("glyph for
glyph"), so the label map must be **exported and shared**, not re-derived. `toHour` is the positioner.
Days are `0=Sun … 6=Sat`, the convention `hours-lock.ts:32-42` records as agreed by three independent
authorities — **do not "correct" it to ISO 1=Mon..7=Sun.**

**The strip draws; it does not judge.** `occupiedRanges` / `otherRangesOnDay`
(`weekly-hours-editor.tsx:102-132`) owns overlap math and `weeklyHoursSchema`
(`src/lib/validation/availability.ts:68`) owns validation. A second overlap check is GATE-NOREG 6.

---

### 4. The week-strip component — the rendered half (D-152, D-153)

**Analog A — its live input already exists** (`weekly-hours-editor.tsx:96-99`). Feed the strip from **this**
value, not from `initialWindows` and not from a re-read after save:

```ts
  // Live window values, for the client-side overlap math below. The server action still
  // re-validates every write with the SAME weeklyHoursSchema — this only makes an overlap
  // impossible to *express* in the UI (never trust the client; the check is a safety net).
  const liveWindows = (useWatch({ control: form.control, name: "windows" }) ?? []) as Array<
    WeeklyHoursWindow | undefined
  >;
```

**Analog B — the container.** `PanelCard title="Your week at a glance"`, `tone="default"`
(`panel-card.tsx:48-84` props, `:85-178` render). The panel takes **no `className`** by design — geometry
belongs to the pattern, and `HOURS_STRIP_TRACK` belongs to `measurements.ts`.

**Analog C — bar geometry as inline `style`, decided on design grounds and safe on gate grounds.**
`config/design-leak-patterns.mjs`'s five patterns are hex, colour functions, `text-[NNpx]`, numbered palette,
white/black — a `style` object carrying two computed percentages matches **none**. State that in the source
comment descriptively; do not "fix" it into arbitrary classes.

**Analog D — the aria-hidden-decoration + sr-only-equivalent pairing.** The nearest shipped instance of
"the bars carry no information, the text does" is `row-list-skeleton.tsx:29-45`:

```tsx
    <div role="status" aria-busy="true" aria-label={label} data-testid="skeleton-row-list">
      <span className="sr-only">{label}</span>
      …
          <Skeleton key={i} aria-hidden="true" className={cn(ROW_CARD_HEIGHT, "w-full rounded-xl")} />
```

⚠ **The strip renders ZERO live regions** (UI-SPEC § Accessibility, falsifiable 4). The sr-only list is
static text that re-renders with the form. `spots-left-chip.tsx:89` is what a live region looks like — the
strip must **not** copy it.

---

### 5. The extracted publish checklist (D-149) — and its four-gate obligation

**Analog:** the code being moved, `wizard.tsx:1370-1434`. Lift it, do not rewrite it.

```tsx
                  <ul className="space-y-1.5">
                    {checklist.map((c) => (
                      <li key={c.label} className="flex items-center gap-2 text-sm">
                        <span
                          className={cn(
                            "flex size-5 items-center justify-center rounded-full",
                            c.done ? "bg-success text-success-foreground" : "bg-muted",
                          )}
                        >
                          {c.done ? (
                            <CheckIcon className="size-3" aria-hidden="true" />
                          ) : (
                            <MinusIcon className="size-3 text-muted-foreground" aria-hidden="true" />
                          )}
                        </span>
                        <span className={cn(c.done && "text-muted-foreground line-through")}>{c.label}</span>
                        {!c.done && c.step !== null && (
                          <Button type="button" variant="link" size="sm" className="h-auto p-0"
                            onClick={() => setStep(c.step as number)}>
                            Fix
                          </Button>
                        )}
```

**The row array and its step resolution are reused verbatim** (`wizard.tsx:484-543`, resolved through
`stepIndex` at `:393`):

```ts
  const stepIndex = (key: StepKey) => steps.findIndex((s) => s.key === key);
  const checklist: { label: string; done: boolean; step: number | null; action?: () => void }[] = [
    { label: "Title", done: Boolean(values.title), step: stepIndex("details") },
    …
```

**Container for the `lg` placement:** `PanelCard sticky title="Ready to publish?"` — `sticky` already emits
the derived 80px offset (`panel-card.tsx:158-176`), so no surface re-derives it and
`sticky-offset.test.ts`'s pinned site count stays **1**.

**Below `lg`:** `ui/collapsible` — confirmed vendored and already scanned by the leak gate
(`tests/design/leak.test.ts:339`). **First host call site**; no new block is fetched.

> ### 🚩 Gate-Amendment Obligation attached to THIS file
> The done-marker markup at `wizard.tsx:1391` is pinned **by the file path `wizard.tsx`** in four places.
> The moment it lands in `src/components/host/publish-checklist.tsx` all four go red simultaneously, and
> **none of the failures says "you moved a component"**:
>
> | # | Site | What it pins |
> |---|---|---|
> | 1 | `tests/design/status-vocab.test.ts:137` (`LEGAL_FILLED_PAIRING_SITE`), asserted at `:654` | the one legal filled-success pairing site |
> | 2 | `tests/design/status-vocab.test.ts:149-154` (`POSITIVE_CALL_SITES`), asserted at `:662` | a closed set of five files |
> | 3 | `tests/design/empty-state-adoption.test.ts:458` (`ALLOWED_BG_SUCCESS`) | the one legal `bg-success` in the tree |
> | 4 | `src/lib/design/contrast-pairs.ts:250` — `note` says "the wizard's completed-step marker" | prose only, but it should stay true |
>
> **Take the four amendments in the same commit as the extraction.** The alternative (keep the marker
> physically in `wizard.tsx` and pass the node in as a render prop) avoids all four at the cost of a
> contorted API and makes the one legal green surface harder to find. `14-RESEARCH.md` § G5 recommends
> the amendments; this row exists so the plan budgets them rather than discovers them.

---

### 6. The step rail becomes controls (D-148)

**Analog:** the rail itself, `wizard.tsx:588-641`. Everything about the geometry is retained; only the
*element* changes for the `visited` state.

```tsx
        <ol className="flex flex-wrap gap-2" aria-label="Listing steps">
          {steps.map((s, i) => {
            const state = i < stepInList ? "done" : i === stepInList ? "current" : "future";
            return (
              <li key={s.key} aria-current={state === "current" ? "step" : undefined}>
                <span
                  className={cn(
                    "flex size-6 items-center justify-center rounded-full text-xs font-medium",
                    (state === "current" || state === "done") && "bg-brand text-brand-foreground",
                    state === "future" && "bg-muted text-muted-foreground",
                  )}
                >
                  {state === "done" ? <CheckIcon className="size-3.5" /> : i + 1}
                </span>
```

**Two constraints the excerpt itself encodes:**
- `wizard.tsx:630-631` is the **one** accent occurrence `brand-recipe.test.ts:143-152` counts. Narrowing the
  condition to `(state === "current")` keeps it at **1** ✓. Converting the marker to
  `<Button variant="brand">` takes it to **0** ✗; splitting into two accent-bearing branches takes it to
  **2** ✗.
- The 30-line comment at `:602-629` is the in-tree worked example of naming a token **descriptively** so a
  counting gate is not tripped by its own explanation. Copy that discipline, not the words.

**Mode-dependence is why visited-ness is keyed, not indexed** (`wizard.tsx:380`):

```ts
  const steps = openMode ? STEPS.filter((s) => s.key !== "booking") : STEPS;
```

`StepKey` is already the union to type `Set<StepKey>` against (`wizard.tsx:164`). **M3 measured the rail
does not wrap at 320px** (9 × 24 + 8 × 8 = 280px inside 288px of content) — the `flex-wrap` second-line
contingency does not arise.

---

### 7. The save state (D-150)

**Analog A — the state machine and its region:** `src/app/(app)/profile/profile-form.tsx`. Same stack (RHF +
zodResolver + a server action returning `{ok} | {ok:false, error}`), same conclusion, already shipped:

```ts
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  …
  async function onSubmit(values: ProfileInput) {
    setFormError(null);
    setSaved(false);
    const result = await updateProfile(values);
    if (!result.ok) {
      setFormError(result.error);
      return;
    }
    setSaved(true);
    router.refresh();
  }
```

```tsx
          {saved && (
            <p role="status" className="text-sm text-muted-foreground">
              Profile saved.
            </p>
          )}

          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving…" : "Save profile"}
          </Button>
```

Note what this analog already gets right and the wizard must copy: **no timer**, **no optimistic string**,
**secondary ink rather than a green fill** (the file's own comment at `:252-258` argues that colour was
decoration). D-150 differs in two ways only: the region **persists** (renders the empty string at `idle`
rather than unmounting) and it carries the server's own sentence on failure.

**Analog B — naming the region:** `src/components/group/share-link-box.tsx:109-171`:

```ts
/**
 * `role="status"` is `nameFrom: author` in ARIA — a status region takes NO name from its own text — so
 * without this attribute the accessible name is the empty string. …
 * ⚠️ IT IS A LABEL, NOT A SECOND COPY OF THE SENTENCE …
 */
const LINK_ROTATED_REGION_NAME = "Invite link updated";
…
        <div role="status" aria-label={LINK_ROTATED_REGION_NAME}>
```

**Analog C — the signature change `persist()` needs** (`wizard.tsx:399-416`, the shape to REPLACE):

```ts
  /** Autosave the current form state. Returns true on success. */
  async function persist(): Promise<boolean> {
    const res = await saveListingStep(listing.id, toPayload(form.getValues()));
    if (!res.ok) {
      toast.error(res.error);
      return false;
    }
    return true;
  }

  async function saveAndContinue() {
    setSaving(true);
    const ok = await persist();
    setSaving(false);
    if (ok) {
      toast.success("Saved");
      if (step < steps.length - 1) setStep((s) => s + 1);
    }
  }
```

⚠ **`persist()` discards `res.error` after the toast**, so the sentence D-150 needs is gone by the time the
caller sees `false`. Return the `ListingResult` and let the three callers (`:410`, `:420`, `:430`) decide —
a three-line signature change plus three call-site updates (Pitfall 7). The two toasts here are removed; the
two that **precede a navigation** (`Draft saved`, `Your listing is live!`) survive.

---

### 8. The request row and its decline overlay (D-144, D-145, D-146)

**Analog A — the file itself** (`request-row.tsx:171-212`). D-144 changes nothing about `href` — the
comment at `:180-181` already says Phase 14 owns the decision, and the decision is *stay terminal*:

```tsx
    <RowCard
      /* NO `href`, like PayoutRow. The inbox row is terminal today; Phase 14 owns whether it becomes
         navigable, and this plan changes the box and nothing else. */
      title={row.spaceTitle}
      meta={row.whenLabel}
      actions={<RequestActions … />}
    >
      <dl className="space-y-1.5 text-sm">
        <div className="flex items-baseline justify-between gap-4">
          <dt className="text-muted-foreground">Guest</dt>
          <dd>{row.bookerLabel}</dd>
        </div>
        …
      <div className="space-y-0.5">
        <RequestCountdown expiresAt={row.expiresAt} label="Expires in" />
        {countdownReason}
      </div>
```

The countdown moves into `RowCard`'s **`status`** slot with `emphasis="lead"`; money moves into the `<dl>`.

**Analog B — the opt-in prop precedent** (`request-countdown.tsx:95-108`). `emphasis` is added the same way
`finalHourEmphasis` was, with the same "defaults to today's behaviour" docblock:

```ts
  /**
   * Whether the digits take the final-hour emphasis. DEFAULTS TO TODAY'S BEHAVIOUR, so both shipped
   * call sites (the host inbox SLA and the booker payment window) are unchanged in every respect.
   * ⚠ WHY IT EXISTS (plan 13-07). …
   */
  finalHourEmphasis?: boolean;
```

⚠ **One digits node in both layout arms.** The alarm token appears on exactly one line today
(`request-countdown.tsx:167`) and `phase13-surface-gates.test.ts:262-270` counts **lines containing the
needle**, pinned at 1. Branch on the *layout container*, never duplicate the digits `<span>`.

**Analog C — the refusal region replacing a toast** (`request-row.tsx:78-116`, the shape to REPLACE):

```ts
      const res = await approveRequest(requestId);
      if (res.ok) {
        toast.success(`Request approved. We've asked ${bookerLabel} to pay — …`);
      } else {
        toast.error(res.error);
        setApproving(false);
      }
```

Both `toast.error(res.error)` paths (`:90`, `:108`) become **one** in-row `role="status"` carrying the
server's own sentence; the success toasts stay (the row revalidates away, so the toast is the only possible
report). **Not two announcements for one outcome** (GATE-03 rule 6).

**Analog D — the `ResponsiveDialog` conversion.** There is **no host-side precedent today** —
`host-cancel-dialog.tsx:37` imports `ui/dialog` directly, correcting 14-CONTEXT D-145's claim. The overlay
being replaced is `request-row.tsx:132-157`; the confirm-with-footer *content* shape to preserve is
`src/components/booking/cancel-request-dialog.tsx:61-88`; the only real `ResponsiveDialog` call site to copy
the API from is `src/components/booking/booking-sticky-bar.tsx:187-202`:

```tsx
        <ResponsiveDialog
          title={SHEET_TITLE}
          closeLabel={SHEET_CLOSE_LABEL}
          onCloseAutoFocus={restoreFocusToAction}
          trigger={ … }
        >
          {sheet}
        </ResponsiveDialog>
```

Props at `responsive-dialog.tsx:150-201`: `title` is **required** (WCAG 4.1.2), `footer` renders through the
vendored `DialogFooter`, and `onCloseAutoFocus` should be left undefined when the trigger is stable —
`request-row.tsx`'s trigger is stable, so leave it undefined.

⚠ **`RequestActions` renders on TWO surfaces** — `/host/requests` (`page.tsx:203`) *and*
`/host/bookings`'s desktop table (`bookings/page.tsx:265-271`). A plan whose `files_modified` lists
`request-row.tsx` but not `bookings/page.tsx` has missed Pitfall 5.

---

### 9. The two availability editors leave `ALLOWED_RAW_CARD` (D-155)

**Analog for the swap idiom:** `request-row.tsx:16-25` — the header that records what a container swap is
allowed to change (*"the CONTAINER is `patterns/row-card.tsx`, and NOTHING ELSE about this file moved"*).
Write the same sentence for these two files.

**The two raw boxes being replaced** (`weekly-hours-editor.tsx:160-172` and `:174-273`):

```tsx
      {hasNoWindows && (
        <Card>
          <CardContent className="space-y-1">
            <h3 className="text-base font-semibold">Set your weekly hours</h3>
            <p className="text-sm text-muted-foreground">…</p>
          </CardContent>
        </Card>
      )}
      …
          <Card>
            <CardContent className="divide-y">
              {WEEKDAYS.map((label, day) => { … })}
```

→ `PanelCard tone="muted"` and `PanelCard` respectively, `divide-y` preserved. **The guidance box is NOT an
`EmptyState`** — the seven day rows always render, so it is an advisory about a present form, not an absent
list. `blocks-editor.tsx:116-124` **is** a genuine empty list and takes `EmptyState`
(`icon={CalendarOffIcon}`, `actions={null}`).

⚠ `weekly-hours-editor.tsx:276` and `blocks-editor.tsx:319` are `role="alert"` regions — **implicitly
assertive**, which UI-SPEC falsifiable 3 bans on these surfaces, and neither is in the declared set nor the
exclusion list. Assumption A6: the plan must take this deliberately, not discover it.

---

### 10. The inventories

**`measurements.ts` +5.** Copy the docblock shape of the two rows that already argue for themselves —
`PANEL_MIN_HEIGHT` (`:184-191`) for a box value, `BOOKING_SHELL` (`:336-369`) for a promoted layout string:

```ts
/**
 * The booking routes' page container: centred, `max-w-2xl`, `px-4`, `py-8` rising to `py-12` at `sm:`.
 *
 * A LAYOUT STRING PROMOTED OUT OF ITS CALL SITES, exactly as `RESULT_GRID_GAP` was in Phase 12 …
 * NOTHING ABOUT THE RENDERING CHANGES. Every value in the string is already a declared ladder step …
 */
export const BOOKING_SHELL = "mx-auto w-full max-w-2xl px-4 py-8 sm:py-12";
```

`HOST_LIST_SHELL` / `HOST_PANEL_SHELL` are the identical argument at 6 and 3 copies. Only `/host` renders
differently (loses its outlier vertical rhythm) — say so, as `BOOKING_SHELL` says the opposite.

**`selector-contract.ts` +9.** Row shape at `:209-227` (`why` and `owner`, both mandatory, no defaults);
the two tail rows `:795-836` are the length and specificity to match. `why` must answer *why a role or label
query cannot carry the assertion* — `week-strip` is the clearest case in the file (the subtree is
deliberately absent from the accessibility tree). **Declared and rendered in the same commit**: both
directions are asserted (`selector-contract.test.ts:442-462`).

**`live-regions.ts`.** Row type at `:420-448`; existing rows from `:511`. The rename
`BOOKER_PATH_LIVE_REGION_FILES` → `LIVE_REGION_FILES` (`:305`) and the numeric type-alias rename
(`DeclaredFileCountIsSeventeen`, `:1093`) are one commit — the alias **name carries the number on purpose**
(`:1078-1086`), and `12-12`'s `…IsNine` → `…IsTen` rename (`:264`) is the worked precedent.
`LIVE_REGION_EXCLUSIONS` (`:374-383`) goes to **0**, which makes `live-regions.test.tsx:491`'s
`toBeGreaterThan(0)` unsatisfiable — rewrite it in the same commit (Open Question 2).

**`accent-uses.ts` entry 7** (`:148-157`) — amend `device` only; nothing asserts its text.
**`contrast-pairs.ts`** — the two `reason` fields on the `muted`/`background` and `muted`/`card` exclusions
(`:454-467`) gain the hours-strip track as a second non-informational fill. Those rows' existing prose is the
model: a conditional exclusion states its **mechanical** condition, not a promise.

---

## Shared Patterns

### S1 · Two independent gates plus the `WHERE` — every new host read inherits all three
**Source:** `src/app/(host)/host/requests/page.tsx:45-54` (gate 2) · `src/lib/booking/bookings-query.ts:7-13`
(the argument) · `tests/security/bookings-owner-scope.test.ts` (the proof)
**Apply to:** the agenda read and every page that renders it.

```
//   1. OWNER SCOPING LIVES IN THE `WHERE`, NEVER IN A POST-FILTER (Security V4 / T-07-28). … The `(host)`
//      route group is NOT the gate — it is a layout, and a layout cannot scope a row set. A foreign row must
//      be UNSELECTABLE, not merely unrendered …
```

⚠ A read added in `(host)/host/layout.tsx` instead of the page also fails
`tests/design/blocking-session-gate.test.ts:95-107`.

### S2 · One clock, read once, threaded
**Source:** `bookings-query.ts:224-234` (`readDbNow`) · `requests/page.tsx:98` (the threading)
**Apply to:** `/host` (new), `/host/requests`, `/host/bookings`.
Never `new Date()` in the browser; never the server's local zone. The reason is written at
`hours-lock.ts:70-74` — a drifting server clock must not be able to change what a day means.

### S3 · The venue-local window label has exactly one formatter
**Source:** `composeWhenLabelShort` (`src/lib/booking/when-label.ts`), call site
`requests/page.tsx:100-129`
**Apply to:** every host surface rendering a booking window.
It was three verbatim duplicates before Phase 7 and `when-label.ts:36-40` carries a grep tripwire against a
fourth. `fullDay` and `openCapacity` are **required** props on purpose.

### S4 · Money is the frozen quote, rendered by `formatMoney`, with zero arithmetic
**Source:** `requests/page.tsx:118` · `host-booking-row.tsx:42-43`
**Apply to:** every host surface. `tests/design/price-surface.test.ts` walks the AST for `+ − × ÷` on a
money prop.

### S5 · The three-consumer pending-request predicate
**Source:** `src/components/patterns/ambient-notifications.tsx:167-170` ·
`src/app/(host)/host/page.tsx:56-60` · `src/app/(host)/host/requests/page.tsx:88`
**Apply to:** D-140's signal row, which is consumer #2 **reshaped**, not a fourth.

```ts
  const [{ p } = { p: 0 }] = await db
    .select({ p: count() })
    .from(booking)
    .innerJoin(listing, eq(booking.listingId, listing.id))
    .where(and(eq(listing.hostId, session.user.id), eq(booking.status, "requested")));
```

### S6 · The three containers, never a fourth, never a hand-rolled box
**Source:** `patterns/row-card.tsx:73-226` · `patterns/panel-card.tsx:48-178` ·
`patterns/empty-state.tsx:81-153` · `patterns/page-header.tsx:25-50`
**Apply to:** every surface in this phase.
A hand-rolled `<div className="bg-card ring-1 rounded-xl">` is **invisible** to
`card-pattern-coverage.test.ts` — the same defect wearing a disguise. `PATTERNS` must stay at **3**
(`:625`).

`PageHeader` (whole file, 50 lines) carries two rules the surfaces are adopting it for:

```tsx
export function PageHeader({ title, lede, actions }: PageHeaderProps) {
  return (
    <div data-testid="page-header" className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {lede ? <p className="max-w-prose text-sm text-muted-foreground">{lede}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
```

⚠ `wizard-occupancy.test.tsx`'s `heading()` helper uses `getByRole("heading", { level: 1 })`, **which
throws on multiple h1s** — one `<h1>` per document is load-bearing for 10 existing cases.

### S7 · A named live region, and never two for one outcome
**Source:** `share-link-box.tsx:109-171` (the label-is-not-the-sentence rule) ·
`row-list-skeleton.tsx:29-31` (loading regions) · `live-regions.ts:400-448` (the row contract)
**Apply to:** the wizard save state, the request-action refusal, the address-lookup result.
`role="status"` is **nameFrom:author** — the element's own text does not name it. GATE-03 rule 6: adding a
region while leaving the toast in place is the defect, not the fix.

### S8 · A comment containing a banned spelling trips the grep that forbids it
**Source:** `wizard.tsx:602-629` and `host/page.tsx:118-129` — the two worked examples in the tree; the
second records that it took **two passes** to get right.
**Apply to:** every source comment written in this phase. `brand-recipe`, `status-vocab` and
`phase13-surface-gates` strip comments; the **leak** gate and ESLint do **not**. Name tokens descriptively.

### S9 · An inventory row states its reason, and a row without one is not a row
**Source:** `contrast-pairs.ts:99-116` (the origin of the rule) · `selector-contract.ts:209-227` ·
`live-regions.ts:411-448`
**Apply to:** all five inventory edits. The reason is what travels into the failure message when the gate
goes red.

---

## Test File Analogs (Wave 0 — `14-VALIDATION.md:76-97`)

| New test file | Env pragma | Closest existing analog | Why that one | What to copy |
|---|---|---|---|---|
| `tests/booking/agenda-query.test.ts` | node (default) | **`tests/availability/hours-lock.test.ts`** (432 lines, 5 cases) | It is the test for the **same SQL construct** (`AT TIME ZONE l.timezone` over a joined `listing l`) against real Postgres | Its clock-relative-fixture rule (`:19-22` — *"EVERY FIXTURE DATE IS CLOCK-RELATIVE, never a calendar literal"*), its "assert the persisted rows first, the sentence second" discipline, and its executed-mutation record in the header. **The Manila-vs-other-zone straddling-midnight case is the falsifying fixture** (`14-RESEARCH.md` § The predicate). Secondary: `tests/booking/views.test.ts` for `queryHostBookings` invocation shape |
| `tests/security/bookings-owner-scope.test.ts` (**extend**) | node | itself | The agenda read is a third owner-scoped queryable in the same module | The crossed fixture (`:8-17`) and the `for (const tab …) for (const withCursor …)` matrix (`:171-200`). Add the agenda to the same file rather than a new one |
| `tests/host/agenda-states.test.tsx` | **`// @vitest-environment jsdom`** | **`tests/booking/host-booking-row.test.tsx`** (91 lines) | Same directoryless problem, same component class (a host `RowCard` adopter), and it already stubs exactly what an agenda row pulls in | Its `next/link` → plain-anchor stub (`:23-35`), its `@/app/actions/host-requests` + `sonner` stubs (`:37-42`), and its header's "why a render test" argument (`:3-17`) |
| `tests/host/request-row.test.tsx` | jsdom | same as above | D-144 terminality is a *rendered* fact (zero `<a>` / `[role=link]` inside `row-card`) | Same stubs; assert against `[data-testid="row-card"]` |
| `tests/host/request-refusal.test.tsx` | jsdom | same as above, plus `tests/listing/wizard-occupancy.test.tsx:51-58` for the action-stub pattern | It needs `approveRequest` stubbed to **refuse**, and `toast.error` asserted at **zero calls** | `vi.mock("@/app/actions/host-requests", () => ({ approveRequest: vi.fn(), declineRequest: vi.fn() }))` + `vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }))` — then assert the spy was not called |
| `tests/listing/wizard-rail.test.tsx` | **jsdom** | **`tests/listing/wizard-occupancy.test.tsx`** (349 lines) | Same component, same mount, same stub set; its 10 cases are D-151's GATE-NOREG coverage and must keep passing | The whole preamble: the `ResizeObserver` stub (`:41-49`), all six `vi.mock`s (`:51-58`), `mount()`, `heading()` (`:156-158`), `advance()` (`:161-166`), `advanceTo()` (`:169-176`). The mode-switch case walks `pricing` → back to `occupancy` → switch to drop-in |
| `tests/listing/publish-checklist.test.tsx` | jsdom | same | `document.querySelectorAll('[data-testid="publish-checklist"]').length === 1` at every step, both modes | `advanceTo()` to walk every step; cases (6)/(7) of the analog already exercise the checklist's mode fork |
| `tests/listing/wizard-save-state.test.tsx` | jsdom | same | It needs `saveListingStep` stubbed to **fail**, which the analog already stubs to succeed | `vi.mock("@/app/actions/listing", () => ({ saveListingStep: vi.fn(async () => ({ ok: true as const })), publishListing: … }))` — invert it per case. Assert **zero `setTimeout` on the save path** and zero `toast.error` calls |
| `tests/availability/week-strip.test.ts` | node | **`tests/availability/block-reason.test.ts`** (whole file) | The only pure-mapper test in `tests/availability/`; identical shape (pure module, client-importable, table of cases) | Its four-case structure and its one-line header naming the module and the rule. Secondary: `tests/booking/when-label.test.ts:1-26` for a table-driven header that pins **exact rendered strings** — which is what "segments match the sentence" needs |
| `tests/availability/week-strip.test.tsx` | **jsdom** | `tests/availability/date-pass-picker.test.tsx` / `spots-left-chip.test.tsx` (same directory, both jsdom) | Same directory convention, same "render an availability client component" problem | The pragma and the render/cleanup preamble. Assert `aria-hidden="true"` computes on the grid, 7 sentences in the a11y tree, **zero network calls** on a select change |
| `tests/design/earnings-freeze.test.ts` | node (design config — DB-free) | **`tests/design/price-surface.test.ts`** (902 lines) | The repo's canonical AST-walking copy-freeze gate, and its header argues exactly why a scan beats a comment | Its imports (`:176-181` — `ts`, `readFileSync`, `resolve/relative`, `stripComments`) and its `ts.createSourceFile(rel, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)` + `ts.forEachChild` walk (`:438-448`). Compare **string literals** before/after over `host/earnings/**` and `components/host/payout-*` |
| `e2e/host-dashboard.spec.ts` | Playwright `chromium` | **`e2e/mode-switch.spec.ts`** | The only spec that reaches `/host` today; it owns the host-signup drive and the two assertions D-143 must not break | Its `signUp(page, email, "host")` helper (`:20-37`), its `uniqueEmail()` (`:16-18`), and its two pins: `[data-host-dashboard]` visible and `getByRole("heading", { name: /your hosting/i })` (`:51-52`) — **both must survive D-143** |
| `e2e/host-inbox-hierarchy.spec.ts` | Playwright | **`e2e/tabular-figures.spec.ts`** | The repo's one **text-measurement** spec — it already argues that box geometry and glyph metrics are different questions | Its `page.evaluate` + `getComputedStyle` comparison idiom and its "(b) is the assertion; (a) and (c) make it falsifiable" structure. Compare computed `font-size` inside the row at 320/768/1280 |
| `e2e/host-headings.spec.ts` | Playwright | **`e2e/overflow-320.spec.ts`** | The route-table-driven cross-surface sweep; it already loops a `ROUTES` array with per-row `skip` reasons | Its route-row shape (`{ name, path, skip, tell }`, `:340-360`), its `TARGET_FLOOR_PX = 24` (`:554`) and `collectControls`'s WCAG-exception handling (`:560-600`). **Extend its `ROUTES` too** rather than duplicating the sweep |
| `e2e/skeleton-geometry.spec.ts` (**extend**) | Playwright | itself | It already puts a placeholder and the real row on one page and measures both | Its two-layer argument (`:6-26`) and its recorded deviation from `--project=visual` (`:28-40`). M1 measured host rows at **174–206px** against an 80px bar — the `≤4px` falsifiable is unsatisfiable without a declared second height |

**Conventions that bind every new test file:**
- `// @vitest-environment jsdom` is a **first-line pragma**, above the header comment
  (`wizard-occupancy.test.tsx:1`, `host-booking-row.test.tsx:1`).
- Design tests live under `tests/design/` and run under `vitest.design.config.ts` — **DB-free by
  construction**, build-blocking.
- Integration tests take an isolated schema via `setupTestDb` / `teardownTestDb` from `../helpers/db`
  (`bookings-owner-scope.test.ts:27`).
- Every new test header states **why the test exists and what silent failure it catches** — that is the
  repository's strongest per-directory convention and the planner should require it.
- **E2E: at most three named spec files per Playwright invocation.** A bare `npx playwright test` exhausts
  the Postgres connection ceiling and reds shipped, untouched specs.

---

## No Analog Found

| File | Role | Data flow | Reason |
|---|---|---|---|
| The Phase-14 block in `scripts/seed-baseline-fixtures.ts` — **bookings at fixed literal instants across two timezones straddling midnight** | fixture | batch | `vrt_host_1` exists with listings, hours and an activated payout wallet (`:94`, `:189-260`), and `13-15` left a re-point recipe — but **no existing fixture seeds bookings at fixed instants in two zones**, which is what the agenda's day-boundary baseline needs. The nearest analog is `seedListing()` + `13-15`'s `UPDATE listing SET host_id` recipe, and it covers the *host* half only. **Not verifiable on this machine at all** (`--project=visual` does not exist on win32). Plan it as declared-and-blocked unless a fixture plan is taken. |

**Partial-analog note (not a gap):** the `Collapsible` mobile placement of the publish checklist has **no
host call site today** — `ui/collapsible.tsx` is vendored and leak-scanned (`leak.test.ts:339`) but
unadopted on this side of the app. The pattern to copy is the vendored primitive's own API; there is no
in-tree composition to mirror.

---

## Metadata

**Analog search scope:** `src/lib/booking/`, `src/lib/listing/`, `src/lib/availability/`,
`src/lib/design/`, `src/lib/validation/`, `src/components/host/`, `src/components/availability/`,
`src/components/booking/`, `src/components/patterns/`, `src/components/group/`, `src/components/listing/`,
`src/app/(host)/host/**`, `src/app/(app)/profile/`, `tests/{booking,listing,availability,security,host,design}/`,
`e2e/`.

**Files scanned:** 94 (file listings + targeted reads). **Files read for excerpts:** 31.

**Ranking rule applied:** same role AND same data flow first; then same role; then same data flow. Where two
candidates tied, the **sibling in the directory the new file will live in** won — this is a polish phase, and
the per-directory convention is what the executor must not re-invent.

**Cross-references — read these rather than re-deriving them:**
- `14-RESEARCH.md` § *The five surfaces as they are today* — the line-exact region map for all five files.
- `14-RESEARCH.md` § *The "Today" Query* — the predicate, its live-Postgres proof, and why no index.
- `14-RESEARCH.md` § *Committed Gates* (G1–G15) — the five traps the UI-SPEC does not name.
- `14-RESEARCH.md` § *Measurements Owed* (M1–M5) — row heights, rail wrap, strip geometry, wizard column.
- `14-VALIDATION.md` § *Wave 0 Requirements* — the 13 test files this map assigns analogs to.

**Pattern extraction date:** 2026-08-23 (tree at `e59f10e`, dev). Re-verify gate pins after each wave —
they are facts about a commit and go stale the moment a Phase-14 plan executes.
