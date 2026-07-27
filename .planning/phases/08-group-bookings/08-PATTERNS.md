# Phase 8: Group Bookings - Pattern Map

**Mapped:** 2026-07-27
**Files analyzed:** 27 (new + modified) across schema, seat-claim, tokens, RSVP surfaces, notifications, pricing, tests
**Analogs found:** 25 with a concrete analog / 27 total (2 net-new-shape: the public `/invite/[token]` route and the guest-email-only Inngest fn — both compose from close cousins, noted inline)

> Every excerpt below was read from the live file this session. Line numbers are current as of the read. The planner should reference the analog file + line range directly in each plan's action section — do not paraphrase the pattern, copy it.

---

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|-------------------|------|-----------|----------------|---------------|
| `src/lib/group/seat-claim.ts` (NEW) | service | transaction / CRUD | `src/lib/availability/units.ts` (`createPendingHold`) | role-match (tx idiom exact; FOR UPDATE is net-new but same driver contract) |
| `src/lib/group/token.ts` (NEW) | utility | transform (crypto) | `src/lib/booking/reference.ts` | exact |
| `src/lib/group/rsvp.ts` (NEW) | service | CRUD read | `src/lib/notifications.ts` (`listRecent`) + `src/lib/booking/bookings-query.ts` (isoUtc boundary) | role-match |
| `src/lib/validation/group.ts` (NEW) | validation | request-response | `src/lib/validation/notification.ts` + `src/lib/validation/listing.ts` | exact |
| `src/inngest/functions/guest-email.ts` (NEW) | service (background) | event-driven | `src/inngest/functions/notify.ts` | role-match (envelope clone; no durable row) |
| `src/app/actions/group.ts` (NEW: createGroup / rsvp / removeAttendee / regenerateLink) | route (server action) | request-response | `src/app/actions/cancel-booking.ts` | exact |
| `src/app/(app)/bookings/[id]/group/page.tsx` (NEW) | component (RSC) | request-response | `src/app/(app)/bookings/[id]/cancel/page.tsx` + `src/app/(app)/bookings/[id]/page.tsx` | exact (owner-gated nested route) |
| `src/app/invite/[token]/page.tsx` (NEW) | component (public RSC) | request-response | `src/app/listings/[id]/page.tsx` (root, public) | partial (public-route shape; token-gate is net-new) |
| `src/lib/db/schema.ts` (MODIFY) | model | — | its own `notification`/`booking`/`listing`/`cancellationPolicy` blocks | exact (self-analog) |
| `src/lib/booking/pricing.ts` (MODIFY) | service | transform | `quoteWindow` (self) | exact |
| `src/lib/validation/notification.ts` (MODIFY) | validation | — | self (four-file change) | exact |
| `src/lib/validation/listing.ts` (MODIFY) | validation | — | self (`cancellationPolicy` add) | exact |
| `src/lib/email.ts` (MODIFY) | service | file-I/O (SMTP) | self (`sendBooking*` family) | exact |
| `src/inngest/functions/notify.ts` (MODIFY) | service (background) | event-driven | self (`sendForType`) | exact (four-file change) |
| `src/components/notifications/notification-item.tsx` (MODIFY) | component | — | self (`describeNotification`) | exact (four-file change) |
| `src/components/booking/price-breakdown.tsx` (MODIFY) | component | — | self | exact |
| `src/app/(app)/bookings/[id]/page.tsx` (MODIFY) | component (RSC) | request-response | self (confirmed branch, cancel-entry precedent) | exact |
| `src/app/listings/[id]/book/page.tsx` (MODIFY) | component (RSC) | request-response | self (`fullDay` derivation @ :152) | exact |
| `src/app/actions/booking.ts` (MODIFY: `placeHold` declaredPax) | route (server action) | request-response | self (`placeHold`) | exact |
| `src/app/(host)/host/listings/[id]/edit/wizard.tsx` (MODIFY: pricing step) | component | request-response | existing pricing-step fields | role-match |
| `src/app/(app)/bookings/[id]/cancel/page.tsx` (MODIFY: group-consequence line) | component (RSC) | request-response | self | exact |
| `drizzle/0017…0019_*.sql` (NEW) | migration | — | `0010` (enum split), `0016` (ADD COLUMN), `0005` (btree_gist/EXCLUDE) | exact |
| `tests/group/seat-claim-race.test.ts` (NEW) | test | — | `tests/availability/exclusion-race.test.ts` + `tests/helpers/db.ts` | exact |
| `tests/group/group-owner-scope.test.ts` (NEW) | test | — | `tests/security/bookings-owner-scope.test.ts` | exact |
| `tests/group/{seat-claim,rsvp-identity,guest-email-guard,group-lifecycle}.test.ts` (NEW) | test | — | `tests/booking/*` + `tests/helpers/{db,mocks}.ts` | role-match |
| Components: `CreateGroupButton`, `ShareLinkBox`, `HeadcountMeter`, `AttendeeRoster`/`AttendeeRow`, `RemoveAttendeeButton`, `RegenerateLinkButton`, `TopUpNudge`, `RsvpForm`, `RsvpConfirmation`, `PaxStepper` (NEW) | component | — | see UI-SPEC §Component Inventory (RequestRow/PayoutRow, PendingPaymentState, CancelRequestDialog, `input-group`, `alert`) | role-match |

---

## Pattern Assignments

### `src/lib/group/seat-claim.ts` (service, transaction) — GROUP-05, the acceptance gate

**Analog:** `src/lib/availability/units.ts` → `createPendingHold` (the ONLY live `db.transaction` in the codebase). The seat-claim's `SELECT … FOR UPDATE` is net-new SQL but rides the exact same postgres.js + Drizzle transaction contract.

**Transaction shape + retry envelope** (`units.ts:296`, `:357-359`):
```ts
export async function createPendingHold(db: DbConn, input: CreatePendingHoldInput): Promise<HoldResult> {
  // ...
  for (let txAttempt = 0; ; txAttempt++) {
    try {
      return await db.transaction(async (tx): Promise<HoldResult> => {
        // ...all statements bound to `tx`, never the outer `db`...
      });
    } catch (e) { /* 40P01 deadlock → re-run the whole tx, bounded; see :135-145 */ }
  }
}
```
Key facts the planner must carry into seat-claim.ts:
- `db.transaction(async (tx) => …)` opens a real BEGIN/COMMIT on ONE pooled connection; a nested `tx.transaction` is a SAVEPOINT (`units.ts:459`). Bind EVERY statement to `tx` — the lock must span count→write.
- postgres.js `begin()` does NOT auto-retry a 40P01 deadlock; the OUTER `for` loop does (`units.ts:135-145`). The seat-claim contends on ONE group row, so deadlock is far less likely than the hold path, but keep the same bounded-retry envelope.
- `DbConn` is the injected type from `@/lib/availability/read-model` — reuse it (`units.ts` imports it) so an integration test can bind an isolated schema.

**Raw `sql` + `tx.execute` + `::int` cast idiom** (the house style for locks/counts — `notifications.ts:144-151`):
```ts
const [row] = (await dbConn.execute(sql`
  SELECT count(*)::int AS "unread"
  FROM notification
  WHERE recipient_id = ${recipientId} AND read_at IS NULL
`)) as unknown as { unread: number }[];
```
`count(*)` returns bigint (postgres.js hands it back as a string) → cast `::int` in SQL, never coerce in JS. The seat-claim's `SELECT count(*)::int AS yes FROM rsvp …` follows this verbatim (RESEARCH Pattern 1 already drafts it).

**Post-commit notify contract (do NOT emit inside the tx)** (`notifications.ts:98-118`): `emitNotify` is an outbound HTTP call — inside a transaction it pins a connection across a network hop, and a rollback would send an event for a row that never committed. The seat-claim RETURNS a `ClaimResult`; the caller emits after `db.transaction` resolves.

---

### `tests/group/seat-claim-race.test.ts` (test) — the non-negotiable GROUP-05 proof

**Analog:** `tests/availability/exclusion-race.test.ts` + `tests/helpers/db.ts` (`makeRacingClients`).

**The genuine-race harness** (`db.ts:59-67`):
```ts
export function makeRacingClients(schema: string, n: number) {
  return Array.from({ length: n }, () =>
    postgres(baseUrl(), { max: 1, onnotice: () => {}, connection: { search_path: `${schema},public` } }),
  );
}
```
Each client is an INDEPENDENT pool → separate backend → true concurrency. The shared `max:1` `testDb.client` serializes and proves nothing (`db.ts:52-58` caveat).

**The race assertion skeleton to clone** (`exclusion-race.test.ts:82-108`):
```ts
const [a, b] = makeRacingClients(testDb.schema, 2);
try {
  const results = await Promise.allSettled([ ins(a, …), ins(b, …) ]);
  expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(1);
  // …then re-count the surviving rows directly:
  const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM booking WHERE …`;
  expect(n).toBe(1);
} finally { await a.end(); await b.end(); }
```

**CRITICAL divergence (RESEARCH Pitfall 1 — do not copy blindly):** `exclusion-race.test.ts` fires single autocommit INSERTs because the EXCLUDE is statement-atomic. The seat-claim is atomic only across `SELECT FOR UPDATE → count → INSERT`, so each racer must run a FULL transaction via `client.begin(async (sql) => { …inline the 3 statements… })`. A raw single INSERT would never exercise the lock and the test would pass against a broken (unlocked) claim.

**Mutation-verify (Phase-3 SC#4 discipline, stated at `exclusion-race.test.ts:10-11`):** delete `FOR UPDATE` (or the ceiling check) → the test MUST go red at `capacity_snapshot=1` with 2+ racers → restore. This is the phase acceptance gate.

**Setup/teardown boilerplate** (`exclusion-race.test.ts:61-79`): `setupTestDb()` in `beforeAll`, insert `user` + `listing` fixtures via `testDb.db`, `teardownTestDb(testDb)` in `afterAll`.

---

### `src/lib/group/token.ts` (utility, crypto) — the shareable invite credential (D-118)

**Analog:** `src/lib/booking/reference.ts` — reuse the encoder, NOT the 8-char length (RESEARCH Pitfall 4).

**The bias-free Crockford encoder to reuse** (`reference.ts:10-23`):
```ts
import { randomBytes } from "node:crypto";
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // omits I,L,O,U; length 32 is load-bearing
function encodeReference(bytes: Uint8Array): string {
  let body = "";
  for (let i = 0; i < REFERENCE_LENGTH; i++) body += CROCKFORD[bytes[i] % CROCKFORD.length];
  return `FIT-${body}`;
}
```
`byte % 32` is bias-free because 256 = 8 × 32 (`reference.ts:16` comment). The invite token: same encoder over ~16-20 bytes (~100+ bits), NO `FIT-` display prefix (it is a bearer credential, not a label). The per-rsvp `manage_token` (D-117) uses the same generator. Draw from `randomBytes` (crypto), NEVER a sequential id or `Math.random` (Security V6). Never log a token (UI-SPEC §2).

> Note the reference.ts contrast the planner must NOT repeat: `bookingReference(id)` is a `sha256(id)`-DERIVED stable *label* (`reference.ts:42-44`). The invite token is the opposite — a random *access gate*, so mint it with `randomBytes` like `makeBookingReference()` (`:30-32`), not derived from the group id.

---

### `src/lib/group/rsvp.ts` (service, CRUD read) — roster / headcount / group-by-token

**Analog:** `src/lib/notifications.ts` (`listRecent` :164-196, `countUnread` :144-151) for the read shape; `bookings-query.ts` `isoUtc` for the timestamptz boundary.

- **Owner scope lives in the WHERE, never a post-filter** (`notifications.ts:144-151` doc + the `bookings-owner-scope.test.ts` contract): a foreign row must be UNREADABLE, not merely unread.
- **`db.execute` returns `timestamptz` as Postgres TEXT, not Date** (`notifications.ts:174-196`): select through the shared `isoUtc(...)` mask and hydrate to `Date` ONCE at the boundary (`new Date(r.createdAtIso)`). A `as unknown as` cast over a Date-typed projection compiles and then hands the renderer a string. The roster's `created_at`/`updated_at` follow this.
- **Hard-cap any list read** (`notifications.ts:169-173`, `NOTIFICATIONS_MAX_LIMIT = 20`): clamp a caller limit so a crafted value can't request an unbounded scan.
- **Group-by-token lookup** is a token-scoped WHERE (the token is the sole credential); unknown token returns the same calm "not active" shape as a voided one (UI-SPEC §3 Open Q7 — no enumeration oracle).

---

### `src/app/actions/group.ts` (server actions) — createGroup / submitRsvp / removeAttendee / regenerateLink

**Analog:** `src/app/actions/cancel-booking.ts` — the canonical owner-gated money/state action, itself cloned from `host-requests.ts` (`cancel-booking.ts:12-13`). All actions live in the flat `src/app/actions/` dir (NOT co-located under the route).

**The security skeleton every group action mirrors** (`cancel-booking.ts:15-33` contract, `:149`, `:218`, `:389`):
```ts
"use server";
// session → owner-gate → rate-limit → atomic status-scoped UPDATE → audit → notify → revalidate
const session = await auth.api.getSession({ headers: await headers() });   // :149
// load booking JOINed to listing+host+booker; verify BEFORE any write:
if (!row || row.bookerId !== userId) return null;                          // :218 — missing == not-mine (same calm denial)
const limit = rateLimit(`cancel-booking:${userId}`, CANCEL_RATE_LIMIT);    // :389
// …atomic UPDATE whose WHERE repeats the owner scope + status scope (defence in depth)…
```
Apply verbatim:
- **createGroup** re-checks `status === 'confirmed'` AND `bookerId === userId` server-side (D-119); a MISSING and a CROSS-USER booking return the SAME calm denial (`cancel-booking.ts:19-22`). Snapshot `capacity_snapshot = listing.maxOccupancy` transactionally at creation (mirrors the D-67 tier snapshot read INSIDE the tx, `units.ts:369-372`).
- **submitRsvp** is the public path — it does NOT require a session (guest branch, D-116), the TOKEN is the credential; it re-validates identity + calls `claimSeat`. Rate-limit + opt-in email guard here (see Shared Patterns).
- **removeAttendee / regenerateLink** are organizer-owner-gated exactly like cancel; removeAttendee frees a seat via the same `claimSeat` lock (D-121).

**Emit AFTER commit, revalidate the affected paths** (`cancel-booking.ts:292`, `:335-340`, and `re-request.ts:356-360`):
```ts
await emitNotify({ /* … */ });               // AFTER the tx commits, never inside; swallows its own transport errors
revalidatePath("/bookings");
revalidatePath(`/bookings/${bookingId}`);    // + `/bookings/${id}/group` for the group surface
```

**Redirect/rate-limit denial idiom** (`booking.ts:71`, `:361`; `capability.ts:64`): session → `rateLimit(\`key:${userId}\`, OPTS)` → `recordAudit` on denial → calm structured result (never a throw to the client).

---

### `src/app/(app)/bookings/[id]/group/page.tsx` (owner-gated RSC) — GROUP-04

**Analog:** the booking-detail RSC `src/app/(app)/bookings/[id]/page.tsx` (owner gate) + the nested-action route `src/app/(app)/bookings/[id]/cancel/page.tsx` (the precedent that a `/bookings/[id]/…` sub-route is a dedicated RSC).

**Async params + session-first owner gate** (`bookings/[id]/page.tsx:127-133`, `:161-162`):
```ts
const { id } = await params;                 // Next 16 params is a Promise
const session = await auth.api.getSession({ headers: await headers() });
const userId = session?.user?.id;
if (!userId) notFound();                      // no session can never be the owner → reveal nothing
// …load the booking…
if (!bk || bk.bookerId !== userId) notFound();  // route group is NOT the gate; missing == not-mine == 404
```
The group RSC repeats this on `booking.bookerId` (Security V4). A non-organizer gets the SAME bare 404 (no enumeration oracle, RESEARCH §Security V1/V4).

**Page container (match the shipped booking-detail width)** — `mx-auto w-full max-w-2xl px-4 py-8 sm:py-12` (`bookings/[id]/page.tsx:230`, `:510`, etc.; UI-SPEC §Spacing pins this for `/bookings/[id]/group`).

---

### `src/app/invite/[token]/page.tsx` (public RSC) — GROUP-02/03

**Analog:** `src/app/listings/[id]/page.tsx` (a ROOT, header-less, session-optional public route). This is a *shape* analog — the token-gate is net-new (RESEARCH Pitfall 5).

Rules the planner must honor (RESEARCH Pitfall 5, UI-SPEC §3):
- Place at `src/app/invite/[token]/` — the ROOT, OUTSIDE `(app)`/`(host)`. `(app)/layout.tsx` gates on a session; a public route inside it would bounce a signed-out invitee to `/login`, breaking GROUP-03.
- Read the session with `auth.api.getSession` but do NOT require it (the guest-or-login fork, D-116). Better Auth returns null for a guest.
- "Log in instead" threads the token via `callbackURL` so the user returns to the same invite.
- Container `mx-auto w-full max-w-lg px-4 py-8 sm:py-12` (UI-SPEC §Spacing — narrower than the booking page).
- Unknown = revoked = voided all render the SAME calm state (UI-SPEC §3; no oracle).

---

### `src/lib/db/schema.ts` (model) — tables, enums, columns, payload union

**Analog:** the file's own existing blocks. Copy these idioms:

**Brand-new enum may CREATE + first-use in one migration; ALTER-ADD-VALUE cannot** — the load-bearing distinction (`schema.ts:154-157`):
```ts
// D-67 … A brand-new CREATE TYPE — the 55P04 two-migration split (0010/0012) applies ONLY to
// ALTER TYPE … ADD VALUE on an EXISTING type, so this type and its first use may share one migration.
export const cancellationPolicy = pgEnum("cancellation_policy", ["flexible", "standard", "strict"]);
```
→ `occupancy_mode` (default `exclusive`) and `rsvp_status` (`yes`|`no`) are BRAND-NEW → single migration is fine. The GROUP notification values ADDED to the EXISTING `notificationType` pgEnum (`schema.ts:355-367`) MUST use the two-migration split (see migrations below).

**New nullable/defaulted columns are backfill-free ADD COLUMN** — `listing.maxOccupancy`/`unitCount` (`schema.ts:181-182`) and the whole Phase-7 block (`schema.ts:632`, `:659-685`) are the template for `listing.included`/`extraHeadFee` (nullable/`default 0`), `booking.declaredPax` (nullable), and the new tables.

**The discriminated-union payload + parity weld** — the four-file contract lives here (`schema.ts:352-462`). Add group members to `NotificationPayload` (each field a pre-composed display string, D-86; `href` absolute for email CTA parity). The `side`/`expired` fields (`:407-410`, `:435-443`) show how a copy-variant vs a display-label is modeled.

**`booking_group` / `rsvp` recommended columns** — RESEARCH Pattern 3 (§Architecture) spells them out; note the two partial-unique de-dup indexes `(group_id, user_id) WHERE user_id IS NOT NULL` and `(group_id, guest_email_norm) WHERE guest_email_norm IS NOT NULL` follow the `index(...).on(...).where(sql\`…\`)` idiom at `schema.ts:483`. Table name is `booking_group`, NEVER `group` (reserved word — RESEARCH Pitfall 6).

---

### `src/lib/booking/pricing.ts` (service, transform) — D-108 pax surcharge

**Analog:** `quoteWindow` itself (`pricing.ts:55-69`) — a PURE, no-I/O, isomorphic module (no `"use server"`).

Extend backward-compatibly: `extraHeadFee` defaults 0 → byte-identical to today. The existing throw-on-missing-rate guard (`pricing.ts:61,64`) is the money-correctness discipline to preserve — never freeze a $0 charge. Integer centavos only (`pricing.ts` + CLAUDE.md "integer minor units, never float"). RESEARCH §Code Examples drafts the exact signature. The caller (`units.ts:419` `quoteWindow({ … })`) reads `listing.included/extraHeadFee` alongside the rates and passes `declaredPax`; the surcharge folds into `spacePriceCents` (`units.ts:480`, the payout + service-fee basis — RESEARCH Assumption A1, flag for user confirmation).

---

### `src/components/booking/price-breakdown.tsx` (component) — the "Extra guests" line

**Analog:** the component itself — it already conditionally renders the service-fee row and "sums nothing" (`price-breakdown.tsx:94-99`):
```tsx
{serviceFeeCents > 0 && (
  <div className="flex items-baseline justify-between gap-4 text-sm">
    <span className="text-muted-foreground">Service fee</span>
    <span className="tabular-nums">{formatMoney(serviceFeeCents, currency)}</span>
  </div>
)}
```
Clone this exact shape for the `Extra guests ({K} × {₱fee})` line (UI-SPEC §5), between the run line and the service fee, rendered ONLY when the surcharge > 0. Both figures arrive as server-computed props (`extraHeads`, `extraHeadCents`); the component still performs ZERO arithmetic (`price-breakdown.tsx:10`, `:16-17`). Money via `formatMoney(cents, currency)`, `tabular-nums`.

---

### `src/app/(app)/bookings/[id]/page.tsx` (MODIFY) — D-119 "Invite people" + the fullDay fix

**Insertion site — the confirmed-branch forward-action slot** (`page.tsx:558-568`):
```tsx
<div className="space-y-4">
  <p className="text-sm text-muted-foreground">This page is your confirmation …</p>
  {/* At most one optional coral forward action (UI-SPEC accent #4); the badge stays --success. */}
  <Button asChild className="w-full bg-brand text-brand-foreground hover:bg-brand/90">
    <Link href="/">Find another space</Link>
  </Button>
</div>
```
Per UI-SPEC §1 + Open Q3: add the coral `Invite people` here (client `CreateGroupButton` → createGroup action → routes to `/bookings/[id]/group`); DEMOTE `Find another space` to a `ghost` link so one-primary-per-surface holds. If already a group, show neutral-outline `Manage group · {N} coming`. Gate on `bk.status === 'confirmed'` and session-ahead (mirror `canCancel` at `:507`).

**Cancel-entry precedent (structure to mirror for the new nested surfaces)** (`page.tsx:570-579`): a `<Separator />` + a `<Button asChild variant="outline">` link to `/bookings/[id]/cancel`. The group surface is the same nested-route move.

**Pitfall 3 fix (must land with the surcharge)** — this page RE-DERIVES `fullDay` from price (`page.tsx:206`, `:214`):
```ts
const fullDay = hourlyTotal == null || (bk.spacePriceCents ?? quoted) !== hourlyTotal;
```
Once D-108 folds a surcharge into `spacePriceCents`, this inequality is true for every surcharged hourly booking → mislabels as "Full day". Switch to the persisted `booking.fullDay` column (drizzle/0016; `schema.ts:632`). The reserve page has the identical bug (`book/page.tsx:152`).

---

### `src/app/listings/[id]/book/page.tsx` (MODIFY) — PaxStepper re-quote + fullDay fix

**Analog:** itself. The `fullDay` re-derivation (`book/page.tsx:136-152`) is the twin of the bug above — switch to persisted `booking.fullDay`. The reserve page already freezes a server quote and feeds `PriceBreakdown` (`book/page.tsx:151`, `:218-220`); the `PaxStepper` (an `input-group` +/− per UI-SPEC §5) re-fetches a server-frozen quote on change — client does ZERO price math (D-108). Session read at `book/page.tsx:55`.

---

### `src/app/actions/booking.ts` (MODIFY) — `placeHold` captures declaredPax

**Analog:** `placeHold` itself (`booking.ts:85`). It already validates input via a Zod schema, opens no tx (delegates to `createPendingHold`), emits after commit (`:227`, `:240`), revalidates + redirects (`:261-263`). Add `declaredPax` to the booking-create schema and thread it into `createPendingHold` (fee>0 only, D-108). No new failure shape.

---

### `src/lib/validation/{group,listing,notification}.ts` (MODIFY/NEW) — Zod 4

**Analog:** `validation/notification.ts` (discriminated union + parity weld) and `validation/listing.ts` (draft/publish split).

- **`group.ts` (NEW)** — `rsvpSchema` (guest name required, email optional, answer `yes|no`), `createGroupSchema`. Use Zod 4 APIs: `z.email()` (not `z.string().email()`), `z.discriminatedUnion` (`validation/notification.ts:19`, `:67`). Server re-validates; client never trusted (V5).
- **`listing.ts` (MODIFY)** — add `occupancy_mode` + optional `included`/`extraHeadFee` to BOTH `draftSchema` (all `.optional()`, `:25-48`) and `publishSchema`; but neither fee field is a publish requirement (UI-SPEC §6) — keep them optional in publishSchema like `postalCode` (`:64`), unlike the required `cancellationPolicy` (`:81`). Integer cents (`.int()`).
- **`notification.ts` (MODIFY)** — file #2 of the four-file change: add group members to `notificationTypeValues` (`:24-36`) AND `notificationPayloadSchema` (`:67`). The `_PayloadUnionParity` assertion (`:194-199`) fails to compile if the Zod and TS unions disagree — do not touch it, let it enforce parity.

---

### The four-file notification change (D-122) — copy the exact seams

All four must change together; each omission is a COMPILE error, which is the point (RESEARCH Pitfall 8). NO `default:` clause in any switch.

1. **`schema.ts`** — pgEnum value (via the two-migration split) + `NotificationPayload` member (`schema.ts:355-462`).
2. **`validation/notification.ts`** — `notificationTypeValues` tuple + `notificationPayloadSchema` member (`:24-36`, `:67`).
3. **`inngest/functions/notify.ts` → `sendForType`** — add a `case` per type, NO default; the `never` weld at `:195-198` breaks the build on omission. Copy an existing case shape (`notify.ts:76-84`).
4. **`components/notifications/notification-item.tsx` → `describeNotification`** — add a `case` returning `{ Icon, title, body }`, NO default; the `never` weld at `:214-215`. Copy a case (`notification-item.tsx:129-134`). Icons per UI-SPEC §4 (`UserRoundCheck`, `UserRoundX`, `CalendarCheck`, `CalendarX2`). All fields render as React text children (auto-escaped); `href` passes `safeHref` (`:97-108`).

> **Recipient constraint (RESEARCH Pitfall 2 — THE most important finding):** these four-file types are for ACCOUNT recipients ONLY — `insertNotification` writes a `notification` row whose `recipientId` is `NOT NULL → user.id` FK (`notifications.ts:81-95`; `schema.ts:468-470`). A guest has no `user.id`. Do NOT route a guest confirmation through `fitout/notify` — it fails the FK, throws in the Inngest step, burns retries, and raises a `needs_attention` audit no operator can act on. Guests use the separate email-only fn below.

---

### `src/inngest/functions/guest-email.ts` (NEW) — the email-only path for guests-with-email

**Analog:** `src/inngest/functions/notify.ts` — clone the ENVELOPE, drop the durable-row step.

**Function registration (Inngest 4.13 2-arg form)** (`notify.ts:247-262`):
```ts
export const notify = inngest.createFunction(
  { id: "notify", retries: 4, triggers: [{ event: NOTIFY_EVENT }],
    onFailure: async ({ error, event }) => { await notifyOnFailure({ … }); } },
  async ({ event, step }) => {
    await step.run("write-notification", () => insertNotification(db, data)); // ← DROP this step for guests
    return await step.run("send-email", () => sendForType(data));
  },
);
```
The guest fn keeps `retries: 4` + `onFailure` (→ `recordAudit` `needs_attention`, `notify.ts:227-241`) but has ONLY the `send-email` step and writes NO row. `onFailure` must NEVER log the guest email address (T-07-38; `notify.ts:224-225`, `:241`). RESEARCH §Code Examples drafts it. Emit ONLY after the seat-claim tx commits, ONLY for an address that actively submitted an RSVP (opt-in guard), rate-limited.

---

### `src/lib/email.ts` (MODIFY) — group RSVP confirmation + cancellation sends

**Analog:** the `sendBooking*` family (`email.ts:101-118`, and the Phase-7 block `:244-287`). Every new send is a thin plain-HTML `send(to, subject, html)` over the SAME private `send`/`escapeHtml` helpers — never a new stack.

**The escape discipline every field obeys** (`email.ts:25-32`, `:108-117`):
```ts
const space = escapeHtml(spaceTitle);
const when  = escapeHtml(whenLabel);
const url   = escapeHtml(bookingUrl);   // WR-01 — never interpolate a raw url into an href
return send(to, `…${spaceTitle}`, `<p>…${space}…${when}…</p><p><a href="${url}">…</a></p>`);
```
The GUEST name is attacker-controlled free text (G6) → `escapeHtml` it in every group email body. `send` already takes ANY address and has a dev fallback when `RESEND_API_KEY` is unset (`email.ts:34-52`) — the guest-with-email path needs no new integration. Group `href` is absolute (`${BETTER_AUTH_URL}/…`, the `APP_URL` convention at `:94`).

---

### `src/app/(app)/bookings/[id]/cancel/page.tsx` (MODIFY) — group-consequence line (D-121)

**Analog:** the shipped cancel review RSC. Per UI-SPEC §7: when the booking is a group, add ONE muted prose line (`This also cancels the group — we'll let the {N} people coming know.`) above the breakdown. Prose only, no new component, money breakdown unchanged.

---

## Shared Patterns

### Owner gate / IDOR (Security V4) — applies to createGroup, removeAttendee, regenerateLink, the group RSC
**Source:** `src/app/actions/cancel-booking.ts:15-33` (contract), `:218`; `src/app/(app)/bookings/[id]/page.tsx:161-162`; test `src/security/bookings-owner-scope.test.ts`.
The route group is NEVER the gate — re-check `booking.bookerId === session.user.id` in the RSC/action, and repeat the owner scope inside the mutation's WHERE (defence in depth). A missing row and a cross-user row return the SAME calm 404/denial. Clone `bookings-owner-scope.test.ts` (crossed A/B fixture, mutation-verified) as `tests/group/group-owner-scope.test.ts`.

### Post-commit notification emit — every action that notifies
**Source:** `src/lib/notifications.ts:98-118` (`emitNotify` doc), call sites `cancel-booking.ts:292`, `booking.ts:227`, `re-request.ts:324`.
`emitNotify` after the tx commits, never inside; it swallows its own transport errors so a notification failure can never roll back a money/state write. Account recipients → `fitout/notify`; guests-with-email → the new `fitout/guest-email` fn; blank-email guests → on-screen only, no send (D-117).

### Rate-limit + opt-in email guard (anti-spam-cannon, D-117)
**Source:** `src/lib/rate-limit.ts:37-57` (`rateLimit(key, { window, max })`), keyed on identity (`capability.ts:64`, `booking.ts:361`).
Key on the authenticated user for organizer actions; for the public RSVP path, only ever email an address that ACTIVELY submitted an RSVP on the link, rate-limited, de-duped by `user_id` / normalized email. `RateLimitResult` is `{ ok:true } | { ok:false, retryAfter }` — early-return a calm result, never throw.

### Server-authoritative money & time
**Source:** `pricing.ts` (pure quote), `units.ts:311-342` (`now()` = DB clock authority), `notification-item.tsx:44-56` (DB-clock relative time).
All pricing server-computed (client does zero arithmetic); RSVP-close-at-`startsAt` and "full" are evaluated against `now()` server-side, never a JS clock. The UI "full" state is a courtesy; the `FOR UPDATE` seat-claim is the gate (UI-SPEC §3).

### Migration authoring (drizzle/0017+)
**Source:** `drizzle/0010_booking_request_states.sql` (enum ADD VALUE split), `drizzle/0016_booking_full_day.sql` (backfill-free ADD COLUMN), `drizzle/0005_booking_exclusion.sql` (btree_gist / hand-authored constraint), `tests/helpers/db.ts:87-117` (replay harness).
- EXISTING `notification_type` gets group values in a migration that does ONLY `ALTER TYPE … ADD VALUE IF NOT EXISTS …` (multiple in one file OK — `0010`); a SEPARATE later file first USES them (55P04 split; `schema.ts:588-595`, RESEARCH Pitfall 7). Next number is **0017**.
- BRAND-NEW `occupancy_mode` / `rsvp_status` may `CREATE TYPE` + first-use in one migration (`schema.ts:154-157`).
- `booking_group`, `rsvp`, `listing.included/extraHeadFee`, `booking.declaredPax` are backfill-free `CREATE TABLE`/`ADD COLUMN` via `drizzle-kit generate` (`0016` template).
- Every hand-authored file must replay idempotently into the test harness: `IF NOT EXISTS`, UNQUALIFIED type/table names (the harness rewrites `"public".` → the isolated schema; `db.ts:99`, `0005:5-6`).

---

## No Analog Found

| File | Role | Data Flow | Reason / Guidance |
|------|------|-----------|-------------------|
| `src/lib/group/seat-claim.ts` (the `SELECT … FOR UPDATE` itself) | service | transaction | No existing `FOR UPDATE` in the repo — the exclusive lock is enforced by the GiST EXCLUDE, not a row lock. The transaction *envelope* is exact (`units.ts`); the lock statement is net-new. RESEARCH Pattern 1 provides the full drafted implementation; build it red-first behind the race test. |
| `src/app/invite/[token]/page.tsx` (the token-gate) | component (public RSC) | request-response | No public token-credentialed route exists yet (all public pages are id-in-URL, owner-gated or open catalog). `listings/[id]/page.tsx` is the closest *root/public/header-less* shape; the token validation + unknown=voided calm state is new (UI-SPEC §3, RESEARCH Pitfall 5). |

Both are "no analog" only in their one novel line; everything around them (tx envelope, public-route placement, calm-state rendering) has a direct analog above. Neither needs a RESEARCH.md fallback — RESEARCH already drafts both.

---

## Metadata

**Analog search scope:** `src/lib/**`, `src/app/(app)/bookings/**`, `src/app/actions/**`, `src/inngest/functions/**`, `src/components/{booking,notifications}/**`, `src/lib/validation/**`, `drizzle/*.sql`, `tests/**`
**Files scanned (read this session):** 22 source/test/migration files + the 3 phase docs
**Pattern extraction date:** 2026-07-27
