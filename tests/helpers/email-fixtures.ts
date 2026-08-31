// ONE ARGUMENT LIST PER EXPORTED SENDER — the shared fixture set for the email layer.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// BUILT ONCE, ON PURPOSE, FOR TWO READERS
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
//   • `tests/auth/email-injection.test.ts` drives ONE adversarial payload through every string in
//     every list below and asserts it appears nowhere raw in any rendered HTML (15-UI-SPEC AC#16).
//   • plan 15-05's `scripts/send-email-previews.ts` reads the SAME lists to deliver one of each send
//     for the EMAIL-03 inbox walk.
//
// If you need a third reader, import this module. Do NOT write a second copy of these argument lists:
// two sets drift, and the set that drifts is always the one the probe reads, so the drift is silent.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// A MISSING SENDER IS A COMPILE ERROR, NOT A SILENTLY UNPROBED SENDER
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `SenderName` is DERIVED from the email module's own exported function type — it is not a hand-kept
// list that a new sender can be added beside. `as const satisfies Record<SenderName, SenderFixture>`
// then makes the record TOTAL: adding a twentieth `sendXxx` to `src/lib/email.ts` without a fixture
// here fails `npx tsc --noEmit`, at this file, with the missing key named. This is the
// `visual-baselines.ts:216-230` idiom (`as const` for the literal paths, `satisfies` for totality),
// applied to a union the compiler computes rather than one a human types.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THE PROBE DERIVES ITS STRING SET RATHER THAN READING A DECLARED ONE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// `stringPathsIn()` WALKS an argument list and returns every string-valued path in it. So the set of
// strings the probe drives the payload through is computed from the arguments themselves; a parameter
// added to a sender and to its fixture below cannot be left off a hand-written list of "the ones we
// test". What each entry DOES declare is the information a walker cannot derive — the three
// classifications on `SenderCall` that change what the probe may ASSERT about a given string:
//
//   `recipient` — the envelope address. Substituted like any other string, but it is handed to the
//                 transport rather than rendered, so no escaped form can be expected in the body.
//   `urls`      — must stay URL-shaped, so the payload is APPENDED rather than substituted, and the
//                 call stays a realistic one.
//   `variants`  — a string that SELECTS COPY rather than being rendered (`"yes" | "no"`, `kind`).
//                 The payload cannot appear escaped in the body because it was never interpolated at
//                 all; only the absence assertion applies.
//
// ⚠ EVERY INSTANT BELOW IS AN ABSOLUTE LITERAL. Never `new Date()` — the Phase-14 rule that geometry
// and fixtures never seed from the clock. A fixture that reads the clock makes a red depend on the
// hour it ran, and the hour it ran is the one thing a failure report never carries.

/** The email module's shape, read as a type so a new export lands in the union below automatically. */
type EmailModule = typeof import("@/lib/email");

/** Every exported FUNCTION of the email module. Type-only exports never appear in a `typeof import`. */
type EmailFunctionName = {
  [K in keyof EmailModule]-?: EmailModule[K] extends (...args: never[]) => unknown ? K : never;
}[keyof EmailModule];

/**
 * The senders. `renderOpsAlertDigest` is excluded by name because it is a PURE RENDERER rather than a
 * send — it returns the two projections and never reaches the transport, so it has no recipient and
 * nothing for a probe to capture. `tests/ops/alert-digest.test.ts` reads it directly instead.
 */
export type SenderName = Exclude<EmailFunctionName, "renderOpsAlertDigest">;

/** One realistic call of one sender. */
export type SenderCall = {
  /** What this argument list produces. The preview harness names its delivery with it. */
  readonly label: string;
  /** The argument list, exactly as a caller passes it. */
  readonly args: readonly unknown[];
  /** Dotted path to the envelope recipient — substituted, never rendered into a body. */
  readonly recipient: string;
  /** Dotted paths that must stay URL-shaped: the probe APPENDS its payload rather than replacing. */
  readonly urls: readonly string[];
  /** Dotted paths whose string SELECTS copy rather than being rendered. */
  readonly variants: readonly string[];
};

export type SenderFixture = {
  /** One line: what this send is for, and why the argument list below is the plausible one. */
  readonly why: string;
  /** At least one call. More when the sender branches on a copy variant. */
  readonly calls: readonly SenderCall[];
};

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// Shared literals. Deliberately `.invalid` / `.test` reserved names — a fixture that names a domain
// somebody owns is one misconfigured harness away from mailing a stranger.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

const TO = "fixture@fitout.invalid";
const APP = "https://fitout.test";
const SPACE = "Sunrise Court — Bay 2";
const WHEN = "Sat 12 Sep, 6:00–7:00 PM (Manila time)";

/** An absolute instant, and the only one in this file. See the clock rule in the header. */
const CREATED_AT = new Date("2026-08-01T02:30:00.000Z");

/**
 * EVERY EXPORTED SENDER, WITH A PLAUSIBLE CALL.
 *
 * `as const` keeps the literal paths in `recipient` / `urls` / `variants` narrow enough for the
 * runtime walker's error messages to be worth reading; `satisfies` is what makes the record total.
 */
export const SENDER_FIXTURES = {
  sendVerificationEmail: {
    why: "Better Auth's verification link. `paragraphs: []` is the AUTHFB-01 boundary (15-03).",
    calls: [
      {
        label: "verify email",
        args: [TO, `${APP}/api/auth/verify-email/fx_verify_token_1`],
        recipient: "0",
        urls: ["1"],
        variants: [],
      },
    ],
  },
  sendResetPassword: {
    why: "Better Auth's reset link. The token sits in the PATH, so 15-02's &-in-href trap does not bite.",
    calls: [
      {
        label: "reset password",
        args: [TO, `${APP}/reset-password/fx_reset_token_1`],
        recipient: "0",
        urls: ["1"],
        variants: [],
      },
    ],
  },
  sendBookingConfirmed: {
    why:
      "Fires after a successful confirm (webhook payment.paid), instant and pay-on-approval alike. " +
      "The sixth argument is TRUST-03's policy sentence — a FIXTURE literal, not product copy: the " +
      "real one arrives finished from composePolicyEmailLine, so nothing here is a second source.",
    calls: [
      {
        label: "booking confirmed",
        args: [
          TO,
          SPACE,
          WHEN,
          "FIT-8QK2M4RA",
          `${APP}/bookings/bk_fixture_1`,
          "Free cancellation until Fri 11 Sep, 6:00 PM (Manila time)",
        ],
        recipient: "0",
        urls: ["4"],
        variants: [],
      },
    ],
  },
  sendRequestReceived: {
    why: "placeHold's request branch. States NO deadline by design (CR-02).",
    calls: [
      {
        label: "request received",
        args: [TO, SPACE, WHEN, `${APP}/bookings/bk_fixture_2`],
        recipient: "0",
        urls: ["3"],
        variants: [],
      },
    ],
  },
  sendRequestApproved: {
    why: "approveRequest. `payByLabel` is the ROW's real D-96-capped deadline, pre-composed venue-local.",
    calls: [
      {
        label: "request approved — pay now",
        args: [
          TO,
          SPACE,
          WHEN,
          "₱1,240.00",
          "Fri 11 Sep, 9:00 PM (Manila time)",
          `${APP}/listings/ls_fixture_1/book?hold=hd_fixture_1`,
        ],
        recipient: "0",
        urls: ["5"],
        variants: [],
      },
    ],
  },
  sendRequestDeclined: {
    why: "declineRequest AND the SLA auto-decline sweep. Two wordings, one document (15-03).",
    calls: [
      {
        label: "request declined by the host",
        args: [TO, SPACE, WHEN],
        recipient: "0",
        urls: [],
        variants: [],
      },
      {
        label: "request expired before the host answered",
        args: [TO, SPACE, WHEN, { expired: true }],
        recipient: "0",
        urls: [],
        variants: [],
      },
    ],
  },
  sendNewRequestToHost: {
    why: "placeHold's request branch, host side. `bookerLabel` is display-name text and untrusted.",
    calls: [
      {
        label: "new request (host)",
        args: [
          TO,
          SPACE,
          WHEN,
          "Marisol A.",
          "₱1,240.00",
          "Fri 11 Sep, 9:00 PM (Manila time)",
          `${APP}/host/requests`,
        ],
        recipient: "0",
        urls: ["6"],
        variants: [],
      },
    ],
  },
  sendBookingCancelledByBooker: {
    why: "Booker cancelled → the HOST is told who cancelled and that the window is free again (D-81).",
    calls: [
      {
        label: "cancelled by booker (host side)",
        args: [TO, SPACE, WHEN, "Marisol A.", `${APP}/bookings/bk_fixture_3`],
        recipient: "0",
        urls: ["4"],
        variants: [],
      },
    ],
  },
  sendBookingCancelledByHost: {
    why: "Host cancelled → the BOOKER gets the money answer first (D-70: always a full refund).",
    calls: [
      {
        label: "cancelled by host (booker side)",
        args: [TO, SPACE, WHEN, "₱1,240.00", `${APP}/bookings/bk_fixture_4`],
        recipient: "0",
        urls: ["4"],
        variants: [],
      },
    ],
  },
  sendHostCancellationRecord: {
    why: "The canceller's OWN record (WR-04). `feeLabel: null` OMITS the sentence — never a ₱0 (CR-01).",
    calls: [
      {
        label: "host cancellation record — with a D-71 fee",
        args: [TO, SPACE, WHEN, "₱1,240.00", "₱124.00", `${APP}/host/bookings`],
        recipient: "0",
        urls: ["5"],
        variants: [],
      },
      {
        label: "host cancellation record — no fee charged (CR-01)",
        args: [TO, SPACE, WHEN, "₱1,240.00", null, `${APP}/host/bookings`],
        recipient: "0",
        urls: ["5"],
        variants: [],
      },
    ],
  },
  sendRefundIssued: {
    why: "The refund is on its way. Carries ALL_RAILS_REFUND_WINDOW from its one owner (D-92).",
    calls: [
      {
        label: "refund issued",
        args: [TO, SPACE, WHEN, "₱1,240.00", `${APP}/bookings/bk_fixture_5`],
        recipient: "0",
        urls: ["4"],
        variants: [],
      },
    ],
  },
  sendReminderPreExpiry: {
    why: "D-85 #1 — approved but unpaid. Tone is load-bearing (C6): a lapse costs a slot, never money.",
    calls: [
      {
        label: "pre-expiry reminder",
        args: [
          TO,
          SPACE,
          WHEN,
          "₱1,240.00",
          "Fri 11 Sep, 9:00 PM (Manila time)",
          `${APP}/listings/ls_fixture_1/book?hold=hd_fixture_2`,
        ],
        recipient: "0",
        urls: ["5"],
        variants: [],
      },
    ],
  },
  sendReminderPreSession: {
    why: "D-85 #2/#3 — ONE side-neutral send serving both booker and host.",
    calls: [
      {
        label: "pre-session reminder",
        args: [TO, SPACE, WHEN, `${APP}/bookings/bk_fixture_6`],
        recipient: "0",
        urls: ["3"],
        variants: [],
      },
    ],
  },
  sendReminderPreSla: {
    why: "D-85 #4 — the host is sitting on a pending request; the deadline is pre-composed, never counted.",
    calls: [
      {
        label: "pre-SLA reminder (host)",
        args: [
          TO,
          SPACE,
          WHEN,
          "Marisol A.",
          "Fri 11 Sep, 9:00 PM (Manila time)",
          `${APP}/host/requests`,
        ],
        recipient: "0",
        urls: ["5"],
        variants: [],
      },
    ],
  },
  sendGroupRsvpReceived: {
    why: "An attendee answered → the ORGANIZER. `attendeeLabel` is guest-typed and untrusted (T-08-08).",
    calls: [
      {
        label: "group RSVP received — yes",
        args: [TO, SPACE, WHEN, "Dodong R.", "yes", `${APP}/g/gr_fixture_1`],
        recipient: "0",
        // `answer` picks the sentence ("is coming" / "can't make it"); the string itself never renders.
        variants: ["4"],
        urls: ["5"],
      },
      {
        label: "group RSVP received — no",
        args: [TO, SPACE, WHEN, "Dodong R.", "no", `${APP}/g/gr_fixture_1`],
        recipient: "0",
        variants: ["4"],
        urls: ["5"],
      },
    ],
  },
  sendGroupRsvpConfirmed: {
    why: "An ATTENDEE with an account is on the list. Group v1 is organizer-pays: nothing to settle.",
    calls: [
      {
        label: "group RSVP confirmed (attendee)",
        args: [TO, SPACE, WHEN, `${APP}/g/gr_fixture_1`],
        recipient: "0",
        urls: ["3"],
        variants: [],
      },
    ],
  },
  sendGroupCancelled: {
    why: "The group booking is off, told to a reachable confirmed attendee so nobody turns up.",
    calls: [
      {
        label: "group cancelled (attendee)",
        args: [TO, SPACE, WHEN, `${APP}/g/gr_fixture_1`],
        recipient: "0",
        urls: ["3"],
        variants: [],
      },
    ],
  },
  sendGuestRsvpEmail: {
    why: "The email-only guest path (RESEARCH Pitfall 2): no account, so no durable notification row.",
    calls: [
      {
        label: "guest RSVP confirmed",
        args: [
          {
            to: TO,
            kind: "rsvp_confirmed",
            listingTitle: SPACE,
            whenLabel: WHEN,
            href: `${APP}/g/gr_fixture_1?invite=iv_fixture_1`,
          },
        ],
        recipient: "0.to",
        // `kind` selects which of the two EmailContent values is built; it is never rendered.
        variants: ["0.kind"],
        urls: ["0.href"],
      },
      {
        label: "guest group cancelled",
        args: [
          {
            to: TO,
            kind: "group_cancelled",
            listingTitle: SPACE,
            whenLabel: WHEN,
            href: `${APP}/g/gr_fixture_1?invite=iv_fixture_1`,
          },
        ],
        recipient: "0.to",
        variants: ["0.kind"],
        urls: ["0.href"],
      },
    ],
  },
  sendOpsAlertDigest: {
    why:
      "The daily 08:50 operator digest. Its body is a data TABLE entering the shell's one PRE-ESCAPED " +
      "slot, and `action` / `actorId` are free-text audit columns written from ~20 recordAudit call " +
      "sites — which is exactly why the probe must reach them (T-15-03).",
    calls: [
      {
        label: "ops alert digest — two rows, one aging, truncated",
        args: [
          TO,
          [
            {
              id: "audit_fixture_1",
              action: "auto_refund_manual",
              actorId: "system",
              createdAt: CREATED_AT,
              ageHours: 30,
              aging: true,
            },
            {
              id: "audit_fixture_2",
              action: "refund_after_payout",
              actorId: "usr_fixture_1",
              createdAt: CREATED_AT,
              ageHours: 3,
              aging: false,
            },
          ],
          { truncated: true, limit: 200 },
        ],
        recipient: "0",
        urls: [],
        variants: [],
      },
    ],
  },
} as const satisfies Record<SenderName, SenderFixture>;

/** The nineteen names, in declaration order. */
export const SENDER_NAMES = Object.keys(SENDER_FIXTURES) as SenderName[];

/** How many senders this repository has. Asserted by the probe so a silent shrink is a red. */
export const SENDER_COUNT = 19;

// ─────────────────────────────────────────────────────────────────────────────────────────────────
// PATH HELPERS. A dotted path addresses one value inside an argument list: `"1"` is `args[1]`,
// `"0.href"` is `args[0].href`, `"1.0.action"` is `args[1][0].action`.
// ─────────────────────────────────────────────────────────────────────────────────────────────────

/** True for a value the walker may descend into: a plain array or a plain object. Never a Date. */
function isTraversable(value: unknown): value is Record<string, unknown> | unknown[] {
  if (Array.isArray(value)) return true;
  if (value === null || typeof value !== "object") return false;
  // A Date, a Map, a class instance — its own value, not a bag of fields. Skipped deliberately.
  return Object.getPrototypeOf(value) === Object.prototype;
}

/**
 * Every string-valued path in an argument list, in walk order.
 *
 * THIS IS WHY THE PROBE'S COVERAGE CANNOT SILENTLY SHRINK: it is computed from the arguments rather
 * than declared beside them, so a parameter added to a fixture above is probed the moment it is added.
 */
export function stringPathsIn(args: readonly unknown[]): string[] {
  const out: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (typeof node === "string") {
      out.push(prefix);
      return;
    }
    if (!isTraversable(node)) return;
    if (Array.isArray(node)) {
      node.forEach((child, i) => walk(child, prefix === "" ? String(i) : `${prefix}.${i}`));
      return;
    }
    for (const [key, child] of Object.entries(node)) {
      walk(child, prefix === "" ? key : `${prefix}.${key}`);
    }
  };
  walk(args, "");
  return out;
}

/** Read the value at a dotted path, or `undefined` when the path does not resolve. */
export function readAt(args: readonly unknown[], path: string): unknown {
  let node: unknown = args;
  for (const segment of path.split(".")) {
    if (!isTraversable(node)) return undefined;
    node = (node as Record<string, unknown>)[segment];
  }
  return node;
}

/**
 * A COPY of the argument list with one path replaced. Structural along the path only — the fixtures
 * above are shared by two readers and a probe that mutated them in place would poison the previews.
 */
export function withValueAt(
  args: readonly unknown[],
  path: string,
  value: unknown,
): unknown[] {
  const segments = path.split(".");
  const set = (node: unknown, rest: string[]): unknown => {
    const [head, ...tail] = rest;
    if (Array.isArray(node)) {
      const copy = [...node];
      const index = Number(head);
      copy[index] = tail.length > 0 ? set(copy[index], tail) : value;
      return copy;
    }
    if (isTraversable(node)) {
      const copy = { ...(node as Record<string, unknown>) };
      copy[head] = tail.length > 0 ? set(copy[head], tail) : value;
      return copy;
    }
    throw new Error(`email-fixtures: path "${path}" does not resolve — stopped at "${head}"`);
  };
  return set(args, segments) as unknown[];
}
