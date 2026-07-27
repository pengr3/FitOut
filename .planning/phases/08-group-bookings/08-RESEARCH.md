# Phase 8: Group Bookings - Research

**Researched:** 2026-07-27
**Domain:** RSVP coordination layered on a paid single-payer booking — pessimistic seat-claim concurrency, hybrid guest/account identity, pax-scaled pricing, tokenized public route
**Confidence:** HIGH (every claim below is anchored to an installed source file or a locked decision; the few open calls are flagged)

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions (D-107..D-122 — DO NOT relitigate)

- **D-107:** v1 group booking = **single-payer + exclusive-only, reusing the existing rail unchanged.** Organizer pays for ALL pax in exactly one payment → Phase-5 hold-until-session rail used verbatim. No cost-splitting, no per-attendee collection, no partial-payment state machine. One exclusive lock → the GiST `EXCLUDE` (D-21) is untouched. **This one-payer/one-lock invariant is load-bearing.**
- **D-108:** Unified exclusive pricing: `total = baseRate + max(0, pax − included) × extraHeadFee`. `extraHeadFee = 0` → flat rental, zero leak, backward-compatible default. `declaredPax` is an organizer input **at booking** that drives price **only when `extraHeadFee > 0`**.
- **D-109:** `occupancy_mode` is a first-class host-set per-listing property (3 modes). Phase 8 builds **exclusive only** and records the column, default `exclusive`. v1 never writes another value; no host toggle.
- **D-110:** Drop-in (Phase 9, capacity-counter) ≠ open play (GPAY-01, cost-split). Both out of Phase 8.
- **D-111:** RSVP hard cap = the listing's `maxOccupancy` (already a required publish field), **snapshotted onto the group at creation (`capacity_snapshot`)**; the RSVP path reads only the snapshot, never live `listing.maxOccupancy`. NULL-capacity branch is a defensive guard only, never a product path.
- **D-112:** No-overflow enforced by a **pessimistic `SELECT capacity_snapshot FROM group WHERE id=? FOR UPDATE`** seat-claim inside the RSVP transaction — count current 'yes' under the lock, insert only if `count < snapshot`, else reject "full". NOT an unlocked count-then-insert. Handles yes↔no uniformly. **Proven by a two-connection `makeRacingClients` race test — the plan's acceptance gate.** Denormalized counter deferred to Phase 9.
- **D-113:** Organizer is attendee #1 (counted in cap + declaredPax; pricing `included = 1` = organizer folded into base). Only a confirmed 'yes' consumes a seat; yes→no frees one; partial RSVP leaves the booking valid.
- **D-114:** `declaredPax` vs RSVP is a **signal, not a gate.** RSVP capped at `maxOccupancy`, NOT paid-pax. RSVP-yes exceeding declaredPax fires a **corroboration flag + top-up nudge** (only when `extraHeadFee > 0`), never a block. Leak caught at host check-in + top-up. Pax-decrease follows the Phase-7 cancellation ladder; pax-increase is a capacity-checked top-up (fast-follow).
- **D-115:** Each RSVP is its own row, payment-ready but unpriced (nullable `user_id`, no money columns) — the GPAY-01 foundation.
- **D-116:** RSVP identity = **HYBRID guest-or-login, ONE `rsvp` row (nullable `user_id`).** Only the **notification channel** branches on `user_id`; cap seat-claim, "who's coming" list, and organizer management stay single-path.
- **D-117:** Guest email is **OPTIONAL.** Blank → pure headcount, no comms, cannot toggle, no cancellation notice. Provided → RSVP confirmation + cancellation notice + self-serve manage link (no reminders). v1 simplifications: no guest email verification; no guest→account merge; **opt-in email guard** (only email an address that actively submitted an RSVP; rate-limit; de-dup by `user_id` / normalized email; name-only guests not de-dupable/toggle-able).
- **D-118:** Invites = **shareable link ONLY.** One reusable group link (crypto-random access token — reuse the `reference.ts` Crockford pattern; treat as a real access token). Per-recipient email invites deferred.
- **D-119:** Group creation entry = an **"Invite people" affordance on the confirmed booking detail page** (`/bookings/[id]`). Any confirmed (paid) booking qualifies (instant or request-to-book). Exclusive-mode only in v1.
- **D-120:** RSVP lifecycle: toggle yes/no until **RSVP closes at session start (`booking.startsAt`)**; one RSVP = one person, no +guests. Toggling works for accounts and guests-with-email; blank-email guests cannot toggle.
- **D-121:** On booking cancel/refund → auto-void all invites + notify reachable attendees. Organizer can revoke an invite, remove an attendee (frees a seat via the same D-112 claim), and resend/regenerate the link.
- **D-122:** No attendee reminders in v1. Attendee sees venue name + date/time + address per `listing.showExactAddress`. Organizer notified per RSVP (in-app + email); each attendee gets an RSVP confirmation (in-app/email for accounts; email for guests who gave one; on-screen only for blank-email guests). Adding group notification types is the **four-file compile-checked change** (pgEnum + TS union, Zod union, `sendForType`, `describeNotification`).

### Claude's Discretion (research recommends; planner decides)
- Group vs booking table shape (dedicated group entity is the likely shape).
- Seat-claim column layout — `FOR UPDATE` + `count(*)` (recommended) vs denormalized `confirmed_count`.
- Invite/rsvp token placement + length (reuse `reference.ts`).
- Group notification payload shapes (typed discriminated union, per D-86/07-14).
- `declaredPax` / `included` / `extraHeadFee` field placement in the Phase-2 wizard + Phase-4 quote.
- Host check-in headcount confirmation (record seam vs defer). Automated top-up charge is a fast-follow regardless.
- "Who's coming" view layout + organizer management surface — **UI-SPEC exists** (`08-UI-SPEC.md`, approved).

### Deferred Ideas (OUT OF SCOPE — do not build)
- Organizer-driven open play / cost-split (GPAY-01). Drop-in / open-capacity (Phase 9, OPEN-01..04). In-app top-up charge (fast-follow; v1 seam is a discrepancy record). Per-recipient email invites. Attendee reminders. +guests per RSVP. Guest→account merge & guest email verification. Waitlist (DISC-02). A host toggle for `occupancy_mode`.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GROUP-01 | Organizer can create a group booking on top of a paid booking (organizer pays the full booking) | New `booking_group` row minted from a `confirmed` booking via a server action on `/bookings/[id]` (D-119). Reuses the Phase-5 rail verbatim (D-107) — no payment code added. §Architecture Patterns, §Code Examples |
| GROUP-02 | Organizer can invite via a shareable link and/or email | Link-only branch (D-118): one crypto-random group access token minted with the `reference.ts` Crockford idiom (longer than the 8-char display reference). §Don't Hand-Roll, §Pitfall 4 |
| GROUP-03 | Invited attendees RSVP (yes/no) without a full account | Public `/invite/[token]` route outside `(app)`; hybrid guest-or-login (D-116); one `rsvp` row with nullable `user_id`. §Architecture Patterns, §Pitfall 5 |
| GROUP-04 | Organizer sees confirmed headcount + who is coming | Owner-gated RSC `/bookings/[id]/group`; `{yes count} of {capacity_snapshot}` + roster. §Architecture Patterns |
| GROUP-05 | Confirmed headcount validated against capacity (atomic, no overflow) | **The one genuinely new correctness surface.** Pessimistic `SELECT … FOR UPDATE` seat-claim inside `db.transaction`, proven by a `makeRacingClients` race test (D-112). §Architecture Patterns Pattern 1, §Validation Architecture, §Pitfall 1 |
</phase_requirements>

## Summary

Phase 8 is deliberately scoped so that **only one new correctness surface exists** — the per-group RSVP seat-claim (GROUP-05/D-112). Everything money-related (the organizer's booking, its hold-until-session payout, its cancellation ladder) reuses Phase 5–7 code **unchanged**, because the organizer's booking is a normal single-payer paid booking and RSVP is an informational layer bolted on top. Research confirms every file, function signature, and pattern the locked decisions rest on is present and behaves as CONTEXT.md claims.

**No new npm packages are required.** Every capability composes from installed dependencies (Drizzle 0.45 + postgres.js 3.4, Better Auth 1.6, Zod 4.4, Inngest 4.13, Resend 6, shadcn components already installed). The Package Legitimacy Audit is therefore trivially clean.

Three things need the planner's explicit attention because a locked decision meets a real code constraint:
1. **The guest-with-email notification path cannot flow through the shipped `fitout/notify` layer** — `notification.recipientId` is a `NOT NULL` FK to `user.id`, and `insertNotification` always writes a durable row. Guest attendees have no `user.id`. A separate email-only mechanism is needed (recommended: a small new Inngest email-only function that preserves the D-83 retry/`onFailure` envelope without a durable row). See §Pitfall 2 — this is the single most important finding.
2. **The pax-scaled surcharge (D-108) folds into `spacePriceCents`, which breaks the reserve/detail page's `fullDay` derivation** (`fullDay = spacePriceCents !== hourlyRate × hours`). Those two shipped pages must switch to reading the persisted `booking.fullDay` column (drizzle/0016) once a surcharge can exist. See §Pitfall 3.
3. **The table should be named `booking_group`, not `group`** — `GROUP` is a SQL reserved word and this codebase uses raw `sql\`...\`` templates pervasively, where an unquoted `group` fails. See §Pitfall 6.

**Primary recommendation:** Build in this order — (A) schema + migrations (`booking_group`, `rsvp`, `occupancy_mode` enum, `listing.included/extraHeadFee`, `booking.declaredPax`, group `notification_type` values via the two-migration enum split); (B) the pure seat-claim module + its `makeRacingClients` race test (red-first, the acceptance gate); (C) pax pricing seam (quote + wizard); (D) the RSVP/invite/management surfaces per 08-UI-SPEC; (E) notifications (four-file change for accounts + a guest-email-only path).

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Group creation from a paid booking | API / Server action | Database | Owner-gated write; snapshots `capacity_snapshot` transactionally at creation (D-111 mirrors the D-67 tier snapshot) |
| **RSVP seat-claim (no-overflow)** | **Database (`SELECT … FOR UPDATE` in a tx)** | API / Server action | The row lock on the single group row is the atomic authority — the app never adjudicates the cap (D-112, mirrors the GiST EXCLUDE philosophy) |
| Invite token minting/validation | API / Server (crypto) | — | Bearer credential; generated server-side with `node:crypto`, never client-derived (V6, D-118) |
| Public RSVP submission (guest or login) | API / Server action (public route) | Frontend (form) | Server re-validates identity + cap; the token is the sole credential; client is never trusted |
| "Who's coming" headcount + roster | Frontend Server (RSC) | Database | Owner-gated RSC read; live refresh via the D-84 bounded `router.refresh()` poller (no TanStack Query) |
| Pax-scaled quote | API / Server (pure `quoteWindow`) | Database (frozen on booking) | Server-authoritative money; client does zero arithmetic (CLAUDE.md; D-108) |
| RSVP notifications (accounts) | Background (Inngest `fitout/notify`) | Email (Resend) | Reuses the shipped fan-out; four-file type addition (D-122) |
| RSVP notifications (guests-with-email) | Background (NEW email-only Inngest fn) | Email (Resend) | No `user.id` → cannot write a `notification` row → email-only path (see §Pitfall 2) |

## Standard Stack

**No new libraries.** Phase 8 is built entirely from the installed, version-pinned stack. Verified against `package.json` (2026-07-27):

### Core (already installed — versions verified in package.json)
| Library | Installed | Purpose in Phase 8 | Why standard here |
|---------|-----------|--------------------|-------------------|
| drizzle-orm | `^0.45.2` | New tables/columns + the seat-claim tx | Codebase ORM; raw `sql` templates carry the `FOR UPDATE` (existing idiom) `[VERIFIED: package.json, src/lib/availability/units.ts]` |
| postgres (postgres.js) | `^3.4.9` | Transaction + row-lock driver; race harness | `db.transaction` maps to BEGIN/COMMIT; nested tx = SAVEPOINT; `begin()` does NOT auto-retry `[VERIFIED: units.ts:357-538]` |
| better-auth | `^1.6.14` | Session read on public invite route (guest-or-login) | `auth.api.getSession` returns null for guests — the guest branch (D-116) `[VERIFIED: src/lib/auth.ts, bookings/[id]/page.tsx:131]` |
| zod | `^4.4.3` | RSVP input + pax input + notification payload unions | **Zod 4, not Zod 3** (CLAUDE.md says v3 — stale). `z.email()`, `z.discriminatedUnion` in use `[VERIFIED: package.json, validation/notification.ts]` |
| inngest | `^4.13.0` | Notification fan-out (accounts) + new guest-email fn | 2-arg `createFunction(options, handler)` form; triggers in `options.triggers` `[VERIFIED: inngest/functions/notify.ts:244]` |
| resend | `^6.12.4` | Group RSVP/cancellation emails | `send(to, subject, html)` takes any address (guest path, D-117) `[VERIFIED: src/lib/email.ts:34]` |
| next | `^16.2.7` | App Router routes (`/invite/[token]`, `/bookings/[id]/group`) | Async `params`/`searchParams` (Promise) `[VERIFIED: book/page.tsx:44-47]` |
| react | `^19.2.7` | Client composites (RsvpForm, ShareLinkBox, poller) | Bundled with Next 16 |
| lucide-react | `^1.17.0` | Roster/notification icons (per UI-SPEC §4) | `UserRoundCheck`, `UserRoundX`, `CalendarCheck`, `CalendarX2`, `UserRoundMinus`, `RefreshCw` |
| sonner | `^2.0.7` | "Link copied" toast (ShareLinkBox) | Already used repo-wide |

### Supporting (installed shadcn/ui components — reuse, do NOT re-add)
`alert`, `badge`, `button`, `card`, `dialog`, `form`, `input`, `input-group`, `label`, `progress`, `separator`, `skeleton`, `sonner` — all present per 08-UI-SPEC §Component Inventory. `components.json` declares `registries: {}` (no third-party) — the registry vetting gate is **not triggered** this phase.

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Raw `sql\`SELECT … FOR UPDATE\`` | Drizzle `.for("update")` builder | Drizzle's `.for("update")` exists `[CITED: orm.drizzle.team/docs/select#lock]` but the codebase uses raw `sql` for every non-trivial read/lock; raw keeps the SAVEPOINT/error-code idioms consistent. **Recommend raw `sql`.** |
| `count(*)` under the lock | Denormalized `confirmed_count` column | Denormalized is a second writer + drift class; D-112 explicitly defers it to Phase 9. **Recommend `count(*)`** (drift-free). |
| New Inngest email-only fn for guests | Make `notification.recipientId` nullable | Nullable touches shipped owner-scoped queries (`countUnread`/`listRecent` WHERE `recipient_id`) + the FK; higher blast radius. **Recommend the new fn** (isolated, preserves D-83 envelope). |

**Installation:** none. Confirm nothing is missing with `npm ls drizzle-orm postgres better-auth zod inngest resend`.

## Package Legitimacy Audit

> Phase 8 installs **no external packages** — every capability reuses dependencies already pinned in `package.json` and previously vetted in Phases 1–7.

| Package | Registry | Disposition |
|---------|----------|-------------|
| (none — no new dependencies) | — | N/A |

**Packages removed due to slopcheck [SLOP] verdict:** none (nothing installed).
**Packages flagged as suspicious [SUS]:** none.

*slopcheck was not run because no package is being added. If the planner later decides a helper library is warranted (it should not be — every primitive exists), run the Package Legitimacy Gate before adding it.*

## Architecture Patterns

### System Architecture Diagram

```
                          ORGANIZER (account, booking.bookerId)
                                     │
              ┌──────────────────────┴───────────────────────┐
              │ 1. "Invite people" on /bookings/[id]          │  (D-119, confirmed booking only)
              │    server action: createGroup                 │
              ▼                                               │
   ┌─────────────────────────────────────┐                   │
   │ INSERT booking_group                 │                   │
   │  · bookingId (1:1)                   │                   │
   │  · capacity_snapshot = listing.maxOccupancy (D-111)      │
   │  · access_token (crypto-random, D-118)                   │
   └───────────────┬─────────────────────┘                   │
                   │ shareable link {origin}/invite/{token}   │
                   ▼                                           ▼
        ATTENDEE (guest OR account)              2b. Organizer views /bookings/[id]/group (RSC)
                   │                                 · {yes count} of {capacity_snapshot}  (GROUP-04)
   2a. GET /invite/[token]  (public, no session)     · roster (yes first, no collapsed)
        · guest-or-login fork (D-116)                · Copy/Regenerate link, Remove attendee
        · Yes / No                                   · top-up nudge if extraHeadFee>0 & yes>declaredPax
                   │
                   ▼   POST rsvp (server action)
   ┌───────────────────────────────────────────────────────────────┐
   │ db.transaction:                                                 │  ◄── THE ONE NEW
   │   SELECT capacity_snapshot FROM booking_group                   │      CORRECTNESS SURFACE
   │     WHERE id = ? FOR UPDATE        ── row lock (D-112) ──        │      (GROUP-05 / SC#4)
   │   SELECT count(*) FROM rsvp WHERE group_id=? AND status='yes'   │
   │   IF answer='yes' AND count >= snapshot → reject "full"         │
   │   ELSE upsert rsvp row (dedup by user_id / normalized email)    │
   └───────────────────────────────┬───────────────────────────────┘
                                    │ post-commit emitNotify (never inside tx)
                    ┌───────────────┴────────────────┐
                    ▼                                 ▼
        account recipient                  guest-with-email
     fitout/notify (in-app row + email)   NEW email-only Inngest fn (email, no row)
     · organizer: "RSVP received"          · attendee RSVP confirmation
     · attendee-account: confirmation      · (blank-email guest: on-screen ONLY, no send — D-117)
```

*File-to-implementation mapping is in the Code Examples and Integration Points sections, not the diagram.*

### Recommended Project Structure
```
src/
├── lib/group/
│   ├── seat-claim.ts        # NEW pure-ish module: claimSeat(tx, {groupId, ...}) — the FOR UPDATE tx (D-112)
│   ├── token.ts             # NEW crypto-random invite/rsvp token minting (Crockford idiom, longer than reference.ts)
│   └── rsvp.ts              # NEW read helpers: roster, headcount, group-by-token (owner/token scoped)
├── lib/booking/pricing.ts   # MODIFY quoteWindow: add included/extraHeadFee/declaredPax surcharge (D-108, backward-compat)
├── lib/db/schema.ts         # MODIFY: booking_group + rsvp tables; occupancy_mode + rsvp_status pgEnums;
│                            #         listing.included/extraHeadFee; booking.declaredPax; group notification_type values + payloads
├── lib/validation/
│   ├── notification.ts      # MODIFY: group payload members + type tuple (four-file change)
│   ├── listing.ts           # MODIFY: draft/publishSchema add occupancy_mode + optional included/extraHeadFee
│   └── group.ts             # NEW: rsvpSchema (guest name/email/answer), createGroupSchema
├── lib/email.ts             # MODIFY: group RSVP confirmation + cancellation sends (reuse private escapeHtml)
├── inngest/functions/
│   ├── notify.ts            # MODIFY: sendForType group cases (four-file change)
│   └── guest-email.ts       # NEW: email-only Inngest fn for guest-with-email attendees (no durable row)
├── components/notifications/notification-item.tsx  # MODIFY: describeNotification group cases (four-file change)
├── app/(app)/bookings/[id]/page.tsx                # MODIFY: D-119 "Invite people" affordance (confirmed branch)
├── app/(app)/bookings/[id]/group/                  # NEW: organizer management RSC + actions (owner-gated)
├── app/invite/[token]/                             # NEW: public RSVP route (OUTSIDE (app), like /listings/[id])
├── app/actions/booking.ts                          # MODIFY: placeHold captures declaredPax (D-108, fee>0 only)
└── app/(host)/host/listings/[id]/edit/wizard.tsx   # MODIFY: pricing step (step 4) gains extraHeadFee + included
drizzle/0017_*.sql … 0019_*.sql                     # NEW migrations (see §Pitfall 6 for the enum-split ordering)
tests/group/seat-claim-race.test.ts                 # NEW: the D-112 acceptance-gate race test (clone exclusion-race.test.ts)
```

### Pattern 1: The pessimistic seat-claim (D-112) — the acceptance gate

**What:** Serialize all seat-affecting mutations for a group on the single `booking_group` row via `SELECT … FOR UPDATE`, then count 'yes' rows under that lock, then conditionally write. The row lock is the atomic authority — no app-level count-then-insert race exists (the CLAUDE.md anti-pattern).

**When to use:** Every RSVP write that can consume a seat: guest/account `→yes`, `no→yes` toggle, and (freeing) `yes→no` + organizer "remove attendee". Freeing mutations still take the lock so a concurrent `→yes` observes a consistent count.

**Why it works with postgres.js + Drizzle:** `db.transaction(async (tx) => …)` opens a real BEGIN/COMMIT on one pooled connection (verified in `units.ts`). A `SELECT … FOR UPDATE` on the group row holds a row-level lock until COMMIT; a second concurrent transaction's `FOR UPDATE` on the same row blocks until the first commits, then re-reads the now-updated 'yes' count. Different groups lock different rows → no cross-group contention.

**Example:**
```ts
// src/lib/group/seat-claim.ts  (Source: pattern from src/lib/availability/units.ts createPendingHold)
import { sql } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import type { DbConn } from "@/lib/availability/read-model";

export type ClaimResult =
  | { ok: true; rsvpId: string; status: "yes" | "no" }
  | { ok: false; reason: "full" };

/** Bind the TRANSACTIONAL db (not an auto-commit conn) — the lock must span count→write. */
export async function claimSeat(
  db: DbConn,
  args: { groupId: string; answer: "yes" | "no"; userId: string | null; guestEmailNorm: string | null; name: string },
): Promise<ClaimResult> {
  return db.transaction(async (tx) => {
    // (1) LOCK the single group row — the atomic authority (D-112). Reserved word → quote "group"; we
    //     recommend the table be named booking_group to avoid this entirely (see Pitfall 6).
    const [g] = (await tx.execute(sql`
      SELECT capacity_snapshot FROM booking_group WHERE id = ${args.groupId} FOR UPDATE
    `)) as unknown as { capacity_snapshot: number }[];
    if (!g) return { ok: false, reason: "full" }; // unknown/voided group — courtesy fail-closed

    // (2) De-dup: an account (user_id) or guest-with-email (normalized email) updates their EXISTING row.
    const [existing] = (await tx.execute(sql`
      SELECT id, status FROM rsvp
      WHERE group_id = ${args.groupId}
        AND (${args.userId != null ? sql`user_id = ${args.userId}`
              : args.guestEmailNorm != null ? sql`guest_email_norm = ${args.guestEmailNorm}`
              : sql`false`})
      LIMIT 1
    `)) as unknown as { id: string; status: string }[];

    // (3) Count under the lock — drift-free (D-112 recommended layout, not a denormalized counter).
    const [{ yes }] = (await tx.execute(sql`
      SELECT count(*)::int AS yes FROM rsvp WHERE group_id = ${args.groupId} AND status = 'yes'
    `)) as unknown as { yes: number }[];

    // A →yes that would exceed the snapshot is rejected. An already-yes row toggling to yes is a no-op
    // for the count (one rsvp = one row, D-120), so exclude it from the ceiling check.
    const alreadyYes = existing?.status === "yes";
    if (args.answer === "yes" && !alreadyYes && yes >= g.capacity_snapshot) {
      return { ok: false, reason: "full" };
    }

    if (existing) {
      await tx.execute(sql`UPDATE rsvp SET status = ${args.answer} WHERE id = ${existing.id}`);
      return { ok: true, rsvpId: existing.id, status: args.answer };
    }
    const id = randomUUID();
    await tx.execute(sql`
      INSERT INTO rsvp (id, group_id, user_id, guest_name, guest_email_norm, status)
      VALUES (${id}, ${args.groupId}, ${args.userId}, ${args.name}, ${args.guestEmailNorm}, ${args.answer})
    `);
    return { ok: true, rsvpId: id, status: args.answer };
  });
}
```
Notes: (a) emit any organizer/attendee notification **after** this returns (post-commit, never inside the tx — `notifications.ts:emitNotify` contract). (b) The UI "full" state is a courtesy; this claim is the gate — a `→yes` that looked open but loses the race resolves to the calm "just filled up" copy (UI-SPEC §3), never a crash.

### Pattern 2: The two-connection race test (the D-112 proof) — clone `exclusion-race.test.ts`

**What:** Two INDEPENDENT postgres.js connections each run the full seat-claim **transaction** concurrently against a group whose `capacity_snapshot` is small (e.g. 1), with N > snapshot racers. Assert the number of committed 'yes' rows never exceeds the snapshot.

**Critical difference from `exclusion-race.test.ts`:** that test fires single autocommit INSERTs (the EXCLUDE constraint is atomic at statement level). The seat-claim is atomic only across `SELECT FOR UPDATE → count → INSERT`, so each racer must run a **full transaction**. Use `client.begin(async sql => …)` (postgres.js native) or `drizzle(client).transaction(…)` **per racing client** — a raw single INSERT would not exercise the lock.

**Mutation-verify it (Phase-3 SC#4 discipline):** deleting the `FOR UPDATE` (or the ceiling check) MUST turn the test red (two racers both commit 'yes' at snapshot=1). Restore. This is the non-negotiable acceptance gate for GROUP-05.

```ts
// tests/group/seat-claim-race.test.ts (Source: clone tests/availability/exclusion-race.test.ts + makeRacingClients)
const clients = makeRacingClients(testDb.schema, 3);           // 3 independent connections, one schema
const results = await Promise.allSettled(
  clients.map((c, i) => c.begin(async (sql) => {
    // inline the seat-claim SQL bound to THIS connection's tx (SELECT FOR UPDATE → count → conditional INSERT)
  }))
);
const [{ n }] = await testDb.client`SELECT count(*)::int AS n FROM rsvp WHERE group_id=${GID} AND status='yes'`;
expect(n).toBe(1);                                            // snapshot=1 → exactly one 'yes' survives, ever
```

### Pattern 3: Group vs booking table shape — a dedicated `booking_group` entity (RECOMMENDED)

**What:** A dedicated `booking_group` row (1:1 with `booking`), plus a `rsvp` child table. Rationale: invites + rsvps need a parent to hang off, `capacity_snapshot` and `access_token` are group-lifecycle (created after the booking, revocable, regenerable), and the seat-claim needs a single row to lock. Columns on `booking` would scatter group state across the financial record and make the `FOR UPDATE` target ambiguous.

**Recommended columns (planner refines):**
- `booking_group`: `id` (text uuid PK), `booking_id` (text, unique FK → booking, onDelete restrict — a group is history), `capacity_snapshot` (integer, notNull, D-111), `access_token` (text, unique, notNull, D-118), `voided_at` (timestamptz, nullable — set on cancel/regenerate, D-121), `created_at`.
- `rsvp`: `id` (text uuid PK), `group_id` (text FK → booking_group, onDelete cascade), `user_id` (text FK → user, **nullable**, D-115/D-116), `guest_name` (text, notNull — self-typed or account name), `guest_email_norm` (text, nullable — normalized, the de-dup + opt-in-email key, D-117), `manage_token` (text, nullable — per-rsvp self-serve token for guests-with-email, D-117/D-120), `status` (rsvp_status enum: `yes` | `no`), `created_at`, `updated_at`. **No money columns** (D-115). Suggested partial-unique indexes: one on `(group_id, user_id) WHERE user_id IS NOT NULL` and one on `(group_id, guest_email_norm) WHERE guest_email_norm IS NOT NULL` to enforce de-dup at the DB (name-only guests intentionally not de-duped).

### Anti-Patterns to Avoid
- **App-level count-then-insert without the row lock** — the exact CLAUDE.md race; two `→yes` both read `count=N`, both insert, cap overflows. Use `FOR UPDATE` (D-112).
- **Emitting notifications inside the seat-claim transaction** — `inngest.send`/Resend inside a tx pins a connection across a network hop and a rollback sends an event for a row that never committed (`notifications.ts:emitNotify` doc). Emit after commit.
- **Trusting `listing.maxOccupancy` at RSVP time** — read `capacity_snapshot` only (D-111), else a host lowering capacity retroactively over-caps confirmed attendees.
- **Naming the table `group`** — reserved word; breaks every raw `sql` query. Use `booking_group` (§Pitfall 6).
- **A `default:` clause in any of the four notification files** — it silently swallows an unhandled type; the exhaustive `never` weld is load-bearing (07-14).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| No-overflow concurrency | An app-level "check then insert" cap guard | `SELECT … FOR UPDATE` + count in `db.transaction` (D-112) | Race-free by DB row lock; app-level checks race exactly like the double-booking bug |
| Invite access token | An ad-hoc random string / sequential id | The `reference.ts` Crockford `randomBytes` idiom, minted longer (~100 bits) | Bias-free, non-enumerable, unguessable (V6); reuse the proven encoder |
| RSVP notification reliability | `void sendRsvpEmail(...)` fire-and-forget | Inngest fan-out (accounts: `fitout/notify`; guests: new email-only fn) | D-83 removed fire-and-forget for retry + `onFailure` visibility; do not reintroduce it |
| Guest name/email escaping | Custom sanitizer | `escapeHtml` (private in `email.ts`, same file) for email; React text-child escaping for roster | Guest name is attacker-controlled free text (G6); the shipped discipline already covers it |
| Pax surcharge math | Client-side price recompute | `quoteWindow` server-frozen (D-108) | Server-authoritative money; a client recompute can disagree with the charge (core-value trust failure) |
| Live headcount refresh | TanStack Query / websockets | The D-84 bounded `router.refresh()` poller (clone `pending-payment-state.tsx`) | TanStack Query is NOT installed and is not being added (UI-SPEC); the poller is the locked idiom |
| Venue-local time / address | New formatters | `venueTzNote`/`whenLabel`/`composeWhenLabel` + `listing.showExactAddress` | D-122/D-105/D-09 — reuse the exact shipped idioms |

**Key insight:** The only genuinely new engineering is one 30-line transactional function (`claimSeat`) and its race test. Everything else is composition of shipped, hardened parts. Resist any plan that reinvents payment, notification reliability, tokens, or time/money formatting.

## Common Pitfalls

### Pitfall 1: The seat-claim race test that proves nothing
**What goes wrong:** The race test fires autocommit inserts (like `exclusion-race.test.ts`) instead of full transactions, so the `SELECT FOR UPDATE → count → insert` window is never actually raced — the test passes even with a broken (unlocked) claim.
**Why it happens:** `exclusion-race.test.ts` is the template, and it uses single raw inserts because the EXCLUDE is statement-atomic. The seat-claim is *transaction*-atomic.
**How to avoid:** Each racing client runs the claim inside `client.begin(...)` (or `drizzle(client).transaction`). **Mutation-verify:** delete `FOR UPDATE`, confirm the test goes red at snapshot=1 with 2+ racers, restore.
**Warning signs:** The test is green before the seat-claim is even written; or it never opens more than one connection.

### Pitfall 2: Guests have no `notification.recipientId` — the shipped notify layer rejects them
**What goes wrong:** `notification.recipientId` is `text().notNull().references(user.id)` and `insertNotification` always writes a row first. Routing a guest-with-email RSVP confirmation through `fitout/notify` fails the FK (no `user.id`) and throws inside the Inngest step → retries → a `needs_attention` audit no operator can act on.
**Why it happens:** D-122 describes the four-file change for notification *types* but the account-oriented `notification` table predates the guest identity model (D-116/D-117).
**How to avoid:** Split the channel by `user_id` exactly as D-116 says: **account recipients** (organizer RSVP-received, attendee-account confirmation, attendee-account group-cancelled) use `fitout/notify` (four-file change). **Guest-with-email recipients** use a **new email-only Inngest function** (e.g. `fitout/guest-email`) that sends via Resend with the same `retries`/`onFailure` envelope as `notify` but writes **no** `notification` row. **Blank-email guests** get on-screen confirmation only — no send at all (D-117). Apply the opt-in guard + rate-limit at the emit site (reuse `src/lib/rate-limit.ts`).
**Warning signs:** A plan task says "emit `fitout/notify` for the guest confirmation" — that is the trap.

### Pitfall 3: The pax surcharge breaks the `fullDay` derivation on two shipped pages
**What goes wrong:** `book/page.tsx:152` and `(app)/bookings/[id]/page.tsx:214` derive `fullDay` as `spacePriceCents !== hourlyRate × hours`. Once D-108 folds a surcharge into `spacePriceCents`, that inequality is true for **every** surcharged hourly booking → every one mislabels as "Full day".
**Why it happens:** Those pages predate the persisted `booking.fullDay` column (drizzle/0016, WR-06) and still re-derive it; their own comments even say "fullDay is not persisted" (now stale).
**How to avoid:** When the surcharge lands, switch both pages to read the persisted `booking.fullDay` column instead of re-deriving from price. Decide up front whether the surcharge is part of `spacePriceCents` (recommended — it is host revenue, so it should be the payout basis and the service-fee basis) and document it, because `serviceFeeCents = computeServiceFee(spacePriceCents)` and the payout sweep grosses on `space_price_cents`.
**Warning signs:** A surcharged hourly booking shows "Full day"; a payout for a surcharged booking omits the surcharge.

### Pitfall 4: The invite token is too short if you reuse the 8-char display reference
**What goes wrong:** `makeBookingReference()` mints 8 Crockford chars (~40 bits, ≈10¹² space) — fine for a *display label* whose real access gate is the opaque booking id, but weak for a **bearer credential** that IS the access gate (D-118: "treat it as a real access token").
**Why it happens:** D-118 says "reuse the `reference.ts` Crockford pattern," which is about the *encoder*, not the 8-char length.
**How to avoid:** New `src/lib/group/token.ts` that reuses the bias-free `byte % 32` Crockford encoding but over ~16–20 bytes (~100+ bits). Same for the per-rsvp `manage_token`. Never log tokens (UI-SPEC §2). Unknown/revoked/voided tokens all render the SAME calm "no longer active" state (no enumeration oracle, UI-SPEC Open Q7).
**Warning signs:** The invite URL contains a `FIT-XXXXXXXX`-shaped 8-char code.

### Pitfall 5: A public route inside `(app)` bounces guests to login
**What goes wrong:** Placing `/invite/[token]` under `(app)` inherits that group's session redirect → a signed-out invited stranger is sent to `/login`, breaking GROUP-03 ("without a full account").
**Why it happens:** `(app)/layout.tsx` gates on a session (STATE.md 07-06 note; `/bookings/[id]` moved into `(app)` *because* it always required a session).
**How to avoid:** Put `/invite/[token]` at the **root** (`src/app/invite/[token]/`), OUTSIDE `(app)`/`(host)` — exactly where `/listings/[id]` and `/` live (header-less). Read the session with `auth.api.getSession` but do **not** require it; the "Log in instead" link threads the token via `callbackURL` so the user returns to the same invite. Group management (`/bookings/[id]/group`), by contrast, belongs in `(app)` and is organizer-owner-gated in the RSC (`booking.bookerId === session.user.id`).
**Warning signs:** `/invite/...` under `(app)`; a guest hitting the link sees the login page.

### Pitfall 6: `group` is a SQL reserved word
**What goes wrong:** `CREATE TABLE group (...)` and every raw `sql\`... FROM group ...\`` fail (syntax error) unless `group` is double-quoted everywhere. This codebase uses raw `sql` templates pervasively (units.ts, notifications.ts, bookings-query.ts).
**Why it happens:** D-112's phrasing (`FROM group WHERE id=?`) is shorthand, not a literal table name mandate.
**How to avoid:** Name the table `booking_group` (or `group_booking`). Drizzle's `pgTable("group")` would quote it in generated SQL, but the pervasive hand-written `sql` in this repo would not — one unquoted reference is a runtime failure. Sidestep the whole class.
**Warning signs:** A migration or query references bare `group`.

### Pitfall 7: Adding values to the EXISTING `notification_type` enum in one migration (55P04)
**What goes wrong:** `ALTER TYPE "notification_type" ADD VALUE 'group_rsvp_received'` and the FIRST USE of that value cannot share a transaction; drizzle-kit's migrator runs all pending migrations in ONE transaction → Postgres raises 55P04 "unsafe use of new enum value" on an already-migrated DB.
**Why it happens:** Documented in `schema.ts:526` and lived through in Phase 6 (0010/0012 split) and Phase 7.
**How to avoid:** For the **existing** `notification_type` enum, split across two hand-authored migrations: one file does only `ALTER TYPE … ADD VALUE IF NOT EXISTS …` (multiple values OK in one file), a **separate later** file first *uses* them. **Brand-new** enums (`occupancy_mode`, `rsvp_status`) may be `CREATE TYPE` + first use in one migration (per the `cancellation_policy` note, schema.ts:154). New columns/tables (`booking_group`, `rsvp`, `listing.included/extraHeadFee`, `booking.declaredPax`) are backfill-free `ADD COLUMN`/`CREATE TABLE` and go through `drizzle-kit generate` normally. Next migration number is **0017**; the enum split will consume two (e.g. 0017 add-values, 0018 tables/columns that use them, or interleave carefully). Confirm each file replays idempotently into the test harness (`IF NOT EXISTS`, unqualified type names — tests/helpers/db.ts rewrites `"public".`).
**Warning signs:** A single migration both `ADD VALUE`s and inserts/selects that value; a test schema fails to build.

### Pitfall 8: The four-file notification change is really four + a parity weld
**What goes wrong:** Adding a group notification type to only three files compiles until the render layer, or drifts the Zod mirror from the TS union.
**How to avoid:** Every new type touches all four: `schema.ts` (pgEnum value + `NotificationPayload` union member), `validation/notification.ts` (`notificationTypeValues` tuple + `notificationPayloadSchema` member), `notify.ts` (`sendForType` case), `notification-item.tsx` (`describeNotification` case). The `_PayloadUnionParity` assertion (validation/notification.ts:197) fails to compile if the Zod and TS unions disagree — keep it. No `default:` in any switch. Every group `href` is an ABSOLUTE URL (`${BETTER_AUTH_URL}/...`) and must pass `safeHref` (07-10/07-14 conventions). **Note the recipient constraint:** these types are for **account** recipients only (they write a `notification` row); guest emails go through the separate email-only fn (Pitfall 2).

## Code Examples

### Group notification type — the four-file change (account recipients)
```ts
// 1) src/lib/db/schema.ts — pgEnum value (via the two-migration split, Pitfall 7) + payload member
//    notificationType: add "group_rsvp_received", "group_rsvp_confirmed", "group_cancelled"
//    NotificationPayload: add e.g.
//      | { type: "group_rsvp_received"; listingTitle: string; whenLabel: string; attendeeLabel: string; href: string }

// 2) src/lib/validation/notification.ts — mirror in notificationTypeValues + notificationPayloadSchema (Zod 4)
//    (the _PayloadUnionParity assertion enforces set-equality with the TS union)

// 3) src/inngest/functions/notify.ts — sendForType case (NO default:)
//    case "group_rsvp_received": await sendGroupRsvpReceived(to, payload.listingTitle, payload.whenLabel,
//      payload.attendeeLabel, payload.href); return { sent: true };

// 4) src/components/notifications/notification-item.tsx — describeNotification case (NO default:)
//    case "group_rsvp_received": return { Icon: UserRoundCheckIcon, title: "New RSVP",
//      body: `${payload.attendeeLabel} is coming · ${payload.listingTitle}` };
```

### Guest-with-email email-only path (no durable row) — recommended new fn
```ts
// src/inngest/functions/guest-email.ts (Source: envelope cloned from inngest/functions/notify.ts)
export const GUEST_EMAIL_EVENT = "fitout/guest-email" as const;
export const guestEmail = inngest.createFunction(
  { id: "guest-email", retries: 4,
    triggers: [{ event: GUEST_EMAIL_EVENT }],
    onFailure: async ({ error, event }) => { /* recordAudit needs_attention — NEVER log the address (T-07-38) */ } },
  async ({ event, step }) => {
    const d = event.data as { to: string; kind: "rsvp_confirmed" | "group_cancelled"; listingTitle: string; whenLabel: string; href: string };
    return await step.run("send-email", () => sendGuestRsvpEmail(d)); // Resend; escapeHtml every field (G6)
  },
);
// Emit ONLY after the seat-claim tx commits, and ONLY for an address that actively submitted an RSVP
// (opt-in guard, D-117) — rate-limit via src/lib/rate-limit.ts; dedup by normalized email.
```

### Pax-scaled quote (D-108) — backward-compatible extension of quoteWindow
```ts
// src/lib/booking/pricing.ts (MODIFY — extraHeadFee defaults 0 ⇒ byte-identical to today)
export function quoteWindow(input: QuoteInput & {
  included?: number; extraHeadFee?: number; declaredPax?: number;
}): Quote {
  const base = /* existing hourly/day computation, unchanged */;
  const included = input.included ?? 1;
  const fee = input.extraHeadFee ?? 0;
  const pax = input.declaredPax ?? 1;
  const extraHeads = fee > 0 ? Math.max(0, pax - included) : 0;   // zero when flat (fee=0) — no leak
  const surchargeCents = extraHeads * fee;                        // integer centavos (Pitfall 5)
  return { ...base, totalCents: base.totalCents + surchargeCents, extraHeads, extraHeadCents: fee };
}
// createPendingHold (units.ts) reads listing.included/extraHeadFee alongside the rates and passes declaredPax
// (captured at placeHold from bookingCreateSchema). Surcharge folds into spacePriceCents (payout + fee basis).
// PriceBreakdown gets server-computed extraHeads/extraHeadCents props (UI-SPEC §5); it still sums nothing.
```

## Runtime State Inventory

**N/A — Phase 8 is additive greenfield feature work (new tables/columns/routes), not a rename, refactor, or migration of existing state.** No stored data, live-service config, OS-registered state, secrets, or build artifacts carry a value this phase renames. The only schema changes are backfill-free `CREATE TABLE`/`ADD COLUMN`/`ADD VALUE` (verified against the Phase-7 migration idioms, drizzle/0013–0016). *Confirmed by review of the CONTEXT.md scope and the schema — no existing string/key is being changed.*

## State of the Art

| Old Approach (elsewhere) | This codebase's approach | Impact |
|--------------------------|--------------------------|--------|
| Zod 3 (`z.string().email()`) | **Zod 4** (`z.email()`, `z.discriminatedUnion`) | CLAUDE.md's "Zod 3.x" is stale; use Zod 4 APIs (package.json `^4.4.3`, validation/notification.ts) |
| Optimistic count-then-insert seat counters | Pessimistic `FOR UPDATE` per-parent lock | D-112; correct-by-construction, proven under a race |
| `void sendXxx()` fire-and-forget email | Inngest fan-out with retry + `onFailure` | D-83 (Phase 7); reuse for accounts, extend (email-only) for guests |
| Re-deriving `fullDay` from price | Persisted `booking.fullDay` column (0016) | Required once the surcharge exists (Pitfall 3) |

**Deprecated/outdated in project docs:**
- CLAUDE.md "Zod 3.x" → actually Zod 4.4 installed.
- CLAUDE.md/CONTEXT canonical ref `src/app/bookings/[id]/page.tsx` → the file now lives at `src/app/(app)/bookings/[id]/page.tsx` (moved in Phase 7; URL unchanged). The D-119 "Invite people" affordance goes in its `confirmed` branch (~lines 558-568) and the container matches line 230's `mx-auto w-full max-w-2xl px-4 py-8 sm:py-12`.
- The reserve/detail pages' "fullDay is NOT persisted" comments are stale (0016 added the column).

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | The pax surcharge should fold into `spacePriceCents` (so it is the payout basis and the service-fee basis) | §Pitfall 3, §Code Examples | If it should be a *separate* non-payout line, the wizard/quote/payout wiring differs. Flag for user confirmation — economically the host earns the extra-head fee, so folding into space price (host revenue, commissionable) is the natural reading of D-108, but D-108 does not explicitly state the payout treatment. |
| A2 | A separate email-only Inngest fn is the right home for guest-with-email sends (vs. making `notification.recipientId` nullable) | §Pitfall 2, §Standard Stack Alternatives | If the planner prefers a nullable recipient, the blast radius (owner-scoped queries, FK) is larger but keeps one code path. Either satisfies D-116/D-117; this is an implementation call. |
| A3 | Invite token ~100 bits over the Crockford encoder; per-rsvp `manage_token` similarly | §Pitfall 4 | Too short → guessable bearer credential (security). Length is explicitly Claude's discretion per D-118. |
| A4 | `booking_group` (1:1 with booking) + `rsvp` child is the table shape | §Pattern 3 | Columns-on-booking is possible but complicates the `FOR UPDATE` target and scatters group state. D-115/D-116 strongly imply a parent entity. Planner decides (Claude's discretion). |
| A5 | Recommended new group notification type set: organizer `group_rsvp_received` (yes/no), attendee-account `group_rsvp_confirmed`, `group_cancelled` | §Code Examples | Exact type granularity (one type with a variant vs. separate types) is a payload-shape call (Claude's discretion, per D-86 pattern). |

**If a planner or discuss-phase pass wants to lock A1 and A2, surface them to the user** — they are the two places a locked decision meets an implementation fork with real consequences.

## Open Questions

1. **Does the pax surcharge enter the host payout / commission basis?** (A1)
   - What we know: `spacePriceCents` is the payout basis (payout-sweep grosses on it) and the service-fee basis; the surcharge is host-set revenue (D-108).
   - What's unclear: D-108 gives the *charge* formula but not the payout split treatment.
   - Recommendation: Fold surcharge into `spacePriceCents` (host earns it, commissionable, service-fee applies). Confirm with user before locking; document in the plan.

2. **Guest-email delivery mechanism** (A2) — new email-only Inngest fn (recommended) vs. nullable `notification.recipientId`.
   - Recommendation: new fn; smaller blast radius, preserves shipped owner-scoped queries.

3. **Host check-in headcount confirmation** (Claude's discretion, D-114) — build the v1 discrepancy-record seam now, or defer entirely?
   - Recommendation: defer the record seam unless the UI-SPEC top-up nudge needs a persisted `declaredPax` vs `yes` comparison beyond what the group row already gives. The nudge itself (UI-SPEC §2) needs only `declaredPax` + live yes-count, both available. The automated top-up *charge* is a fast-follow regardless.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| PostgreSQL (postgis/postgis:18) | Seat-claim tx, new tables, race test | ✓ | 18 | — (mandatory) |
| Inngest dev server | Notification + guest-email fns (local) | ✓ | `inngest-cli@latest` via `npm run dev:inngest` | Dev fallback logs (email:dev) |
| Resend | Group emails | ✓ (dev fallback if no key) | `resend@6` | `[email:dev]` console log when `RESEND_API_KEY` unset (email.ts:34) |
| Vitest | Unit/integration + the race test | ✓ | `^4.1.8` | — |
| Playwright | Optional e2e for the invite→RSVP flow | ✓ | `^1.60.0` | — |

**Missing dependencies with no fallback:** none.
**Local run reminder (from project memory):** Inngest locally needs TWO processes — `npm run dev` (app :3000) AND `npm run dev:inngest` (:8288). `npm run build` on a dev box needs env placeholders (`PLATFORM_WALLET_NUMBER=x PLATFORM_WALLET_NAME=x INNGEST_SIGNING_KEY=x`) unless `NEXT_PHASE==="phase-production-build"` (already exempted for plain `npm run build`, per STATE.md quick 260724-lmy). No PayMongo dependency this phase (D-107 adds no payment mechanism).

## Validation Architecture

> nyquist_validation is enabled (config.json). Section included.

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest `^4.1.8` (unit + integration against an isolated schema) + Playwright `^1.60.0` (e2e) |
| Config file | `vitest.config.ts` (present; documents `// @vitest-environment jsdom` pragma for component tests) |
| Quick run command | `npx vitest run tests/group/` |
| Full suite command | `npm test` (currently 78 files / 655 tests, exit 0 — Phase 7 baseline) |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GROUP-05 | Concurrent `→yes` never exceeds `capacity_snapshot` (atomic, no overflow) | integration (two-connection race) | `npx vitest run tests/group/seat-claim-race.test.ts` | ❌ Wave 0 (clone `exclusion-race.test.ts`) |
| GROUP-05 | yes→no frees a seat; a freed seat is re-claimable; partial RSVP leaves booking valid (D-113) | integration | `npx vitest run tests/group/seat-claim.test.ts` | ❌ Wave 0 |
| GROUP-05 | Cap reads `capacity_snapshot`, never live `maxOccupancy` (host lowers capacity after confirmations) | integration | same file | ❌ Wave 0 |
| GROUP-03 | Guest (no session) can RSVP; account can RSVP; one `rsvp` row with nullable user_id; de-dup by user_id/email | integration | `npx vitest run tests/group/rsvp-identity.test.ts` | ❌ Wave 0 |
| GROUP-03/D-117 | **Opt-in email guard**: only an address that submitted an RSVP is emailed; rate-limited; blank-email guest gets NO send | integration | `npx vitest run tests/group/guest-email-guard.test.ts` | ❌ Wave 0 |
| GROUP-04 | Owner-gated roster/headcount; non-organizer → 404 (no enumeration); token route unknown=revoked=voided (same state) | security | `npx vitest run tests/group/group-owner-scope.test.ts` | ❌ Wave 0 (clone `bookings-owner-scope.test.ts`) |
| GROUP-01/02 | createGroup only on a `confirmed` booking owned by the caller; token minted; regenerate kills the old token | integration | `npx vitest run tests/group/group-lifecycle.test.ts` | ❌ Wave 0 |
| D-108 | Surcharge = `max(0, pax−included) × extraHeadFee`; `extraHeadFee=0` ⇒ identical to today (zero leak) | unit | `npx vitest run tests/booking/pricing.test.ts` | ✅ extend existing |
| D-122 | Four-file group notification types render + dispatch; guest name escaped (G6); href absolute + `safeHref` | integration + component | `npx vitest run tests/notifications/` | ✅ extend `notify.test.ts` / `notification-render.test.tsx` |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/group/` (fast subset)
- **Per wave merge:** `npm test` (full suite green)
- **Phase gate:** full suite green + the GROUP-05 race test **mutation-verified** (delete `FOR UPDATE` → red → restore) before `/gsd:verify-work`.

### Wave 0 Gaps
- [ ] `tests/group/seat-claim-race.test.ts` — GROUP-05 (the acceptance gate; clone `tests/availability/exclusion-race.test.ts`, but each racer runs a FULL transaction via `client.begin`)
- [ ] `tests/group/seat-claim.test.ts` — GROUP-05 (toggle/free/re-claim, snapshot-not-live)
- [ ] `tests/group/rsvp-identity.test.ts` — GROUP-03 (guest vs account, de-dup)
- [ ] `tests/group/guest-email-guard.test.ts` — D-117 opt-in guard + rate-limit + blank-email-no-send
- [ ] `tests/group/group-owner-scope.test.ts` — GROUP-04 owner-gate + token-oracle (clone `bookings-owner-scope.test.ts`)
- [ ] `tests/group/group-lifecycle.test.ts` — GROUP-01/02/D-121 (create/regenerate/void/cancel-auto-void)
- [ ] Extend `tests/booking/pricing.test.ts` (D-108) and `tests/notifications/notify.test.ts` + `notification-render.test.tsx` (D-122)
- [ ] Shared fixtures: reuse `tests/helpers/db.ts` (`setupTestDb`/`makeRacingClients`) and `tests/helpers/mocks.ts` (`mockResend`) — no new harness needed.

## Security Domain

> security_enforcement=true, ASVS L1 (config.json). Section included.

### Applicable ASVS Categories
| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V1/V4 Access Control (IDOR, function-level) | **yes** | Organizer management gated in the RSC/action on `booking.bookerId === session.user.id` (never the route group — Security V4, mirrors booking-detail `T-04-CONFIRMIDOR`). Non-organizer + missing → the SAME bare 404 (no enumeration oracle). |
| V3 Session Management | yes (light) | `/invite/[token]` is public; the token is the sole credential. Better Auth session read but not required (guest branch, D-116). "Log in instead" threads token via `callbackURL`. |
| V5 Input Validation | **yes** | Zod 4 schema for guest name/email/answer + `declaredPax` (server re-validate, never trust client). Guest name/email are attacker-controlled free text. |
| V6/V13 Cryptography / Token | **yes** | Invite + per-rsvp tokens are `node:crypto` `randomBytes` (bias-free Crockford), unguessable, non-enumerable (reuse `reference.ts` idiom). Never logged. Unknown = revoked = voided render (no oracle). |
| V7 Error Handling / Logging | yes | `onFailure` audits must never log the guest email address (T-07-38 precedent). |
| Rate limiting / anti-abuse | **yes** | The opt-in email guard (D-117): only email an address that actively submitted an RSVP; rate-limit via `src/lib/rate-limit.ts` so a shared invite link can't be a spam cannon. |

### Known Threat Patterns for this stack
| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Guessing/enumerating invite tokens | Information Disclosure | ~100-bit crypto-random token; unknown/revoked/voided all render the same calm state (UI-SPEC Open Q7); never log tokens |
| Reading another organizer's roster (IDOR) | Elevation / Info Disclosure | Owner-gate in RSC/action on `bookerId`; non-owner → bare 404 (clone `bookings-owner-scope.test.ts`, mutation-verified) |
| Stored XSS via guest name in roster/email/notification | Tampering | React text-child escaping (roster); `escapeHtml` (email.ts, same file — G6); `safeHref` allow-list for invite hrefs in notifications; no `dangerouslySetInnerHTML` (T-07-84) |
| Invite link → spam cannon (mass RSVP emails) | Denial of Service / abuse | Opt-in email guard + rate-limit + de-dup by user_id/normalized email (D-117); blank-email guests get no send |
| Cap overflow under concurrent RSVP | Tampering (integrity) | `SELECT … FOR UPDATE` seat-claim proven under a two-connection race (D-112 / GROUP-05) |
| Confirmed booking impersonation to create a group | Spoofing / Elevation | createGroup re-checks `status==='confirmed'` + `bookerId===session.user.id` server-side (D-119) |
| Client-supplied surcharge/price | Tampering | Server-frozen `quoteWindow`; client does zero math (D-108, CLAUDE.md) |

## Sources

### Primary (HIGH confidence — installed source, read this session)
- `src/lib/db/schema.ts` — notification table + enum + payload union; booking/listing columns; the 55P04 two-migration note; `maxOccupancy` nullable/positive-at-publish
- `src/lib/availability/units.ts` — `db.transaction`, SAVEPOINT via nested tx, postgres.js `begin()` no-auto-retry, `quoteWindow` freeze site, DB-clock authority
- `tests/availability/exclusion-race.test.ts` + `tests/helpers/db.ts` — `makeRacingClients` idiom (the seat-claim template) and its "single max:1 client proves nothing" caveat
- `src/inngest/functions/notify.ts`, `src/lib/notifications.ts`, `src/lib/validation/notification.ts`, `src/components/notifications/notification-item.tsx` — the four-file change, `insertNotification` FK constraint, `emitNotify` post-commit contract, `safeHref`
- `src/lib/email.ts` — `send`/`escapeHtml` (private, same-file reuse), Resend dev fallback, D-83 fire-and-forget prohibition
- `src/lib/booking/pricing.ts`, `src/components/booking/price-breakdown.tsx`, `src/app/listings/[id]/book/page.tsx`, `src/app/(app)/bookings/[id]/page.tsx` — the D-108 quote seam + the `fullDay` derivation pitfall
- `src/app/actions/booking.ts` — placeHold (declaredPax capture point) + emit-after-commit pattern
- `src/lib/auth.ts` — Better Auth session (guest = null), route-group gating implication
- `drizzle/0005`, `0010`, `0016` — EXCLUDE (btree_gist) hand-authoring, the enum ADD VALUE split, backfill-free ADD COLUMN; next migration = 0017
- `package.json` — verified versions (Drizzle 0.45.2, postgres 3.4.9, Better Auth 1.6.14, Zod 4.4.3, Inngest 4.13.0, Resend 6.12.4, Next 16.2.7, React 19.2.7)
- `.planning/phases/08-group-bookings/08-CONTEXT.md` + `08-UI-SPEC.md` — the locked design contract (D-107..D-122)

### Secondary (MEDIUM confidence)
- `.planning/STATE.md` — Phase-7 contracts (four-file notification change history, `db.execute` timestamptz-as-TEXT boundary, `(app)` route-group move, build-env notes)
- Drizzle `.for("update")` builder `[CITED: orm.drizzle.team/docs/select#lock]` — presented as the alternative to raw `sql` (codebase prefers raw)

### Tertiary (LOW confidence)
- none material — every load-bearing claim is anchored to installed source.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — versions read directly from package.json; no new deps.
- Architecture (seat-claim, tables, routes): HIGH — anchored to installed transaction idioms and the shipped race-test template.
- Notification/guest-email finding: HIGH — the FK constraint and `insertNotification` behavior are read directly; the remedy is an implementation call (A2).
- Pricing seam: HIGH on the seam location; the payout-treatment question (A1) is flagged for confirmation.
- Pitfalls: HIGH — each traces to a specific shipped file/line or a lived migration lesson.

**Research date:** 2026-07-27
**Valid until:** 2026-08-26 (stable stack; re-verify if package.json bumps Drizzle/postgres/Better Auth or if the notification table shape changes)
