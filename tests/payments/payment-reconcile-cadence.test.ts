// D-107 AS AN INEQUALITY, NOT A COMMENT — plus D-111's epoch, pinned the same way.
//
// The sweep's 5-minute cadence is DERIVED, not preferred: three passes fit inside a 15-minute hold, so a
// lost webhook is reconciled *while the booker's own hold still occupies the slot* under the GiST EXCLUDE
// (`drizzle/0005_booking_exclusion.sql`). Lengthen the interval past the hold TTL and the sweep still runs,
// still confirms, still looks healthy — and just arrives after the slot was swept out from under the person
// who paid for it. Nothing in the system would say a word. 13.1-CONTEXT D-107 asks for that relationship to
// be an ASSERTION for exactly that reason, and this file is it.
//
// NO DATABASE. Everything here is the REAL constants imported from the REAL modules — `HOLD_TTL_MINUTES`
// comes from `@/lib/availability/units`, never a literal 15 retyped into this spec, because a retyped
// literal would keep passing on the day someone changed the hold.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// THE DELIBERATE BREAKS — TWO OF THEM, OBSERVED 2026-08-22 (13.1-02 Task 2)
// ═══════════════════════════════════════════════════════════════════════════════════════════════════════
// A guard that has never been seen to fail has not been proven. Both modules were restored from saved
// copies in the scratchpad afterwards — never `git checkout --`, which has destroyed a probe's own
// uncommitted work in this repo before.
//
// ── BREAK 1: the interval is lengthened past the hold TTL ───────────────────────────────────────────────
// `RECONCILE_INTERVAL_MINUTES` raised from 5 to 20 in `src/inngest/functions/payment-reconcile.ts`.
// Observed RED — ONE case, verbatim:
//
//    ❯ tests/payments/payment-reconcile-cadence.test.ts (6 tests | 1 failed) 39ms
//        × (2) worst-case reconcile latency is strictly under HOLD_TTL_MINUTES 8ms
//
//   ⎯⎯⎯⎯⎯⎯⎯ Failed Tests 1 ⎯⎯⎯⎯⎯⎯⎯
//    FAIL  tests/payments/payment-reconcile-cadence.test.ts > D-107 — the cadence is an inequality over the
//    REAL hold TTL > (2) worst-case reconcile latency is strictly under HOLD_TTL_MINUTES
//   AssertionError: D-107 IS BROKEN. Worst-case reconcile latency is 22 min (min-age 2 + interval 20), but
//   the hold TTL is 15 min. A lost webhook is now reconciled AFTER the booker's own hold stopped occupying
//   the slot under the GiST EXCLUDE, so the slot they paid for can be taken by someone else before the
//   sweep ever looks at it. The guarantee that a booker who paid keeps their slot has silently died — the
//   sweep still runs and still confirms, it just arrives too late. Do NOT fix this by editing the
//   assertion.: expected 22 to be less than 15
//    ❯ tests/payments/payment-reconcile-cadence.test.ts:140:7
//
// ⚠ THE 13.1-02 PLAN PREDICTED **TWO** REDS HERE — cases (2) and (3) — AND THAT PREDICTION IS WRONG, for a
// reason that is worth stating rather than smoothing over. Case (3) compares the shipped cron's step
// against `RECONCILE_INTERVAL_MINUTES`, and the plan ALSO required the cron to be DERIVED from that same
// constant. Those two instructions cannot both be honoured and still produce a red: deriving the string
// makes the two sides move together, so raising the constant to 20 simply ships `2-59/20` and case (3)
// keeps passing. The prediction and the design are in direct contradiction, and the design is the right
// half to keep — a derived schedule is what makes case (2) guard the interval that actually runs.
//
// ── BREAK 2: what case (3) IS for, since break 1 could not red it ───────────────────────────────────────
// A case that cannot be made to fail is a case nobody has proven. So it was proven against the drift it
// actually detects — a HAND-WRITTEN cron string decoupled from the constant. `reconcileCron()`'s body was
// replaced with a hardcoded `return "TZ=Asia/Manila 2-59/10 * * * *";` while the constant stayed at 5.
// Observed RED, verbatim:
//
//    ❯ tests/payments/payment-reconcile-cadence.test.ts (6 tests | 1 failed) 43ms
//        × (3) the SHIPPED cron string's minute step IS RECONCILE_INTERVAL_MINUTES 16ms
//
//   AssertionError: the shipped cron "TZ=Asia/Manila 2-59/10 * * * *" steps every 10 min while
//   RECONCILE_INTERVAL_MINUTES says 5 — the schedule and the number the inequality above protects have
//   drifted apart, so case (2) would be guarding an interval nothing actually runs on: expected 10 to be 5
//   // Object.is equality
//    ❯ tests/payments/payment-reconcile-cadence.test.ts:152:7
//
// So the two cases cover two DIFFERENT mistakes: (2) catches "the cadence was lengthened", (3) catches
// "the schedule stopped being the cadence". Neither is redundant, and neither is vacuous.

import { describe, it, expect, vi } from "vitest";

import { HOLD_TTL_MINUTES } from "@/lib/availability/units";
import {
  RECONCILE_INTERVAL_MINUTES,
  RECONCILE_MIN_AGE_MINUTES,
  RECONCILE_EPOCH,
  RECONCILE_BATCH_LIMIT,
  reconcileCron,
} from "@/inngest/functions/payment-reconcile";

/**
 * The minute slots the five pre-existing crons occupy (`src/app/api/inngest/route.ts` header): the hourly
 * payout sweep :00, request expiry :15, payout reconcile :30, reminders :45, and the daily ops digest at
 * 08:50. Two crons on the same minute contend for the same database (Pitfall 4).
 */
const OCCUPIED_MINUTES = [0, 15, 30, 45, 50];

/**
 * THE TWO D-111 EVIDENCE BOOKINGS, with their `created_at` as MEASURED in dev on 2026-08-22 rather than as
 * described in prose. This matters: 13.1-CONTEXT's evidence table reports the later one as "2026-08-21
 * 18:17" and the 13.1-02 plan turned that into a bound of `2026-08-21T18:17:00+08:00` — but the row's
 * actual `created_at` is 18:17:12 **UTC**, which is EIGHT HOURS LATER than the plan's bound. An epoch
 * honouring the prose literally would have selected the very fixture D-111 exists to protect and confirmed
 * it. The bound below is the measurement.
 */
const EVIDENCE_ROWS = [
  { id: "09f32400-b636-46e1-973a-b930a073a936", createdAt: new Date("2026-08-21T18:17:12.839Z") },
  { id: "408e054a-cb5a-4dbb-9282-9883e0bfc628", createdAt: new Date("2026-08-18T02:28:36.473Z") },
];

/**
 * Pull the minute field out of the shipped cron string and read its start minute and step.
 *
 * THROWS rather than returning a default when the shape is not one it understands. A parser that quietly
 * answered `{ start: 0, step: 0 }` on an unrecognised string would make cases 3 and 4 assert against a
 * fiction — the exact vacuous-pass failure mode this project has paid for more than once.
 */
function parseCronMinute(cron: string): { start: number; step: number } {
  const fields = cron.trim().split(/\s+/);
  // The optional `TZ=…` prefix is part of Inngest's cron syntax, not a cron field.
  if (fields[0]?.startsWith("TZ=")) fields.shift();
  const minute = fields[0];
  if (!minute) throw new Error(`no minute field in cron string "${cron}"`);

  // `START-END/STEP` (the POSIX-safe step form the sweep ships) …
  const ranged = /^(\d+)-(\d+)\/(\d+)$/.exec(minute);
  if (ranged) return { start: Number(ranged[1]), step: Number(ranged[3]) };
  // … `START/STEP` (the Quartz spelling) …
  const stepped = /^(\d+)\/(\d+)$/.exec(minute);
  if (stepped) return { start: Number(stepped[1]), step: Number(stepped[2]) };
  // … and `*/STEP`, which starts at minute 0.
  const everyN = /^\*\/(\d+)$/.exec(minute);
  if (everyN) return { start: 0, step: Number(everyN[1]) };

  throw new Error(
    `the cron minute field "${minute}" (from "${cron}") is not a step expression this spec can read, ` +
      `so the cadence assertions below would prove nothing. Fix the parser or the cron — never delete the case.`,
  );
}

describe("D-107 — the cadence is an inequality over the REAL hold TTL", () => {
  // ─────────────────────────────────────────────────────────────────────────────────────────────────────
  // (1) GUARD-THE-GUARD, FIRST. If either import resolved to `undefined` — a renamed export, a moved
  //     module, a barrel that stopped re-exporting — the inequality below would compare `NaN`, and
  //     `NaN < NaN` is false, so it would fail for a reason that has nothing to do with cadence (or, with
  //     the operands the other way round, pass for one). The same discipline
  //     `tests/design/money-path-invariants.test.ts:44-49` uses for its directory read.
  // ─────────────────────────────────────────────────────────────────────────────────────────────────────
  it("(1) GUARD-THE-GUARD — every constant under assertion is a real, positive, finite number", () => {
    for (const [name, value] of [
      ["HOLD_TTL_MINUTES", HOLD_TTL_MINUTES],
      ["RECONCILE_INTERVAL_MINUTES", RECONCILE_INTERVAL_MINUTES],
      ["RECONCILE_MIN_AGE_MINUTES", RECONCILE_MIN_AGE_MINUTES],
      ["RECONCILE_BATCH_LIMIT", RECONCILE_BATCH_LIMIT],
    ] as const) {
      expect(
        Number.isFinite(value),
        `${name} did not import as a finite number (got ${String(value)}) — every assertion in this file ` +
          `below this line would be comparing NaN and proving nothing`,
      ).toBe(true);
      expect(value, `${name} must be greater than zero`).toBeGreaterThan(0);
    }
  });

  it("(2) worst-case reconcile latency is strictly under HOLD_TTL_MINUTES", () => {
    // Worst case: a webhook is lost for a booking that was created the instant AFTER a pass ran. It waits
    // out the min-age floor, then waits for the next tick.
    const worstCaseLatency = RECONCILE_MIN_AGE_MINUTES + RECONCILE_INTERVAL_MINUTES;

    expect(
      worstCaseLatency,
      `D-107 IS BROKEN. Worst-case reconcile latency is ${worstCaseLatency} min (min-age ` +
        `${RECONCILE_MIN_AGE_MINUTES} + interval ${RECONCILE_INTERVAL_MINUTES}), but the hold TTL is ` +
        `${HOLD_TTL_MINUTES} min. A lost webhook is now reconciled AFTER the booker's own hold stopped ` +
        `occupying the slot under the GiST EXCLUDE, so the slot they paid for can be taken by someone ` +
        `else before the sweep ever looks at it. The guarantee that a booker who paid keeps their slot ` +
        `has silently died — the sweep still runs and still confirms, it just arrives too late. ` +
        `Do NOT fix this by editing the assertion.`,
    ).toBeLessThan(HOLD_TTL_MINUTES);
  });

  it("(3) the SHIPPED cron string's minute step IS RECONCILE_INTERVAL_MINUTES", () => {
    const cron = reconcileCron();
    const { step } = parseCronMinute(cron);

    expect(
      step,
      `the shipped cron "${cron}" steps every ${step} min while RECONCILE_INTERVAL_MINUTES says ` +
        `${RECONCILE_INTERVAL_MINUTES} — the schedule and the number the inequality above protects have ` +
        `drifted apart, so case (2) would be guarding an interval nothing actually runs on`,
    ).toBe(RECONCILE_INTERVAL_MINUTES);
  });

  it("(4) the sweep's start minute collides with none of the five existing crons", () => {
    const cron = reconcileCron();
    const { start } = parseCronMinute(cron);

    expect(
      OCCUPIED_MINUTES,
      `the sweep starts at minute :${String(start).padStart(2, "0")}, which is already occupied ` +
        `(payout sweep :00, request expiry :15, payout reconcile :30, reminders :45, ops digest 08:50). ` +
        `Crons that tick together contend for the same database — Pitfall 4, the offset-minute discipline.`,
    ).not.toContain(start);
  });
});

describe("D-111 — NO BACKFILL: the epoch excludes both evidence fixtures", () => {
  it("(5) RECONCILE_EPOCH is strictly later than both evidence bookings were created", () => {
    for (const row of EVIDENCE_ROWS) {
      expect(
        RECONCILE_EPOCH.getTime(),
        `RECONCILE_EPOCH (${RECONCILE_EPOCH.toISOString()}) is not after booking ${row.id}, created ` +
          `${row.createdAt.toISOString()}.\n\n` +
          `D-111: the sweep reconciles SHIP-FORWARD only. The two bookings this whole phase exists ` +
          `because of — 09f32400-b636-46e1-973a-b930a073a936 (₱1,050.00, GCash) and ` +
          `408e054a-cb5a-4dbb-9282-9883e0bfc628 (₱2,100.00, GCash, unnoticed for three days) — are ` +
          `deliberately left 'pending' as FIXTURES by PM decision. Lowering this epoch sweeps them: it ` +
          `confirms them, destroys the evidence this phase is verified against, and moves money on rows ` +
          `nobody asked it to touch. If you are lowering it to "catch a few more", these are the rows ` +
          `you are about to catch.`,
      ).toBeGreaterThan(row.createdAt.getTime());
    }
  });

  it("(6) RECONCILE_EPOCH is a fixed Date literal and does NOT move with the environment", async () => {
    const pinned = RECONCILE_EPOCH.getTime();

    expect(RECONCILE_EPOCH).toBeInstanceOf(Date);
    expect(Number.isNaN(pinned), "RECONCILE_EPOCH is an Invalid Date").toBe(false);

    // Set every env var name a future reader might plausibly reach for, then RE-EVALUATE the module. A
    // fresh evaluation is the only thing that can detect an env read — re-reading the already-imported
    // binding would be unchanged even if the constant were `new Date(process.env.…)`.
    vi.stubEnv("RECONCILE_EPOCH", "2020-01-01T00:00:00Z");
    vi.stubEnv("PAYMENT_RECONCILE_EPOCH", "2020-01-01T00:00:00Z");
    vi.stubEnv("RECONCILE_EPOCH_ISO", "2020-01-01T00:00:00Z");
    vi.resetModules();
    const fresh = await import("@/inngest/functions/payment-reconcile");
    vi.unstubAllEnvs();

    expect(
      fresh.RECONCILE_EPOCH.getTime(),
      `RECONCILE_EPOCH moved when the environment did (${fresh.RECONCILE_EPOCH.toISOString()} vs the ` +
        `pinned ${RECONCILE_EPOCH.toISOString()}). D-111's scope must not be environment-driven: an unset ` +
        `variable would either backfill silently or disable the sweep silently, and both are worse than a ` +
        `constant somebody has to edit on purpose.`,
    ).toBe(pinned);
  });
});
