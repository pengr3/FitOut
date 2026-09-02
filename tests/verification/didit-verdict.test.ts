// HVER-07 / HVER-08 — the ONE translation from a Didit answer to a FitOut state change, measured.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS, AND WHY IT IS NOT OPTIONAL
// ════════════════════════════════════════════════════════════════════════════════════════════════
// `src/lib/verification/didit-verdict.ts` maps TEN VENDOR STRINGS onto FitOut state. Nothing in
// FitOut's schema knows those strings exist, so `tsc` cannot enumerate them the way it enumerates a
// pgEnum-derived union — the compiler can only check that the module's outcome table is total over
// the tuple the module itself declares. **THIS FILE IS THE OTHER HALF OF THE CENSUS.** It drives all
// ten in BOTH casings and asserts its own table's length against the tuple's, so a status added to
// the tuple without a decision recorded here is a RED rather than a silent fall-through.
//
// The four properties it measures, and the failure each one exists for:
//
//   - THE CENSUS (cases 1-20). Every documented status, in the documented casing AND upper-cased,
//     maps to the transition that was decided for it. The casing half is not decoration: the webhook
//     envelope spells a verdict in title case and the decision endpoint's own example spells it in
//     upper case, so a mapper that compared exactly would match one vendor surface and miss the
//     other. With D-262 auto-rejecting and D-263 giving a host no route to a human, the symptom
//     would be every host sitting at `pending` forever with nobody prompted — invisible, on the only
//     path a host has.
//   - FINDING F-3, PINNED BY NAME (cases 23-24). `Expired` and `Abandoned` return the row to
//     `unverified`. `/host/verify`'s `pending` panel offers NO WAY OUT — the hosted-flow URL is a
//     redirect target carrying a session token and is not storable — so that copy is honest ONLY
//     while an expired session releases the row. These two cases carry that sentence in their
//     failure messages, because whoever reddens them needs to know what breaks upstairs.
//   - THE UNKNOWN BRANCH (cases 25-27). A status Didit has never sent moves nothing and asks for an
//     audit row. It is asserted NOT to approve, positively, because "did not approve" and "did
//     something harmless" are different claims and only the first is the fail-closed property.
//   - THE ALLOW-LIST (cases 28-36). Only `log_type: "error"`, only an allow-listed `risk`, bounded
//     at `REJECT_NOTE_MAX`, never empty, and never carrying a detector threshold, a node identity or
//     a raw code.
//
// ⚠ WHAT THIS FILE CANNOT PROVE. It measures FitOut's reading of a vocabulary; it cannot prove Didit
// still speaks it. The ten spellings are transcribed from 18.1-RESEARCH § ADDENDUM A6 (2026-09-02,
// the vendor's own complete enumeration) and the warning shape from § R3. The real transcript is
// plan 18.1-14's sandbox walk.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// OBSERVED RED — THE ALLOW-LIST MUTATION, RUN AND SCORED (2026-09-02)
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Green against the shipped module proves the cases pass, not that any of them would NOTICE the
// defect they exist for. So the defect was installed: `POSSIBLE_DUPLICATED_USER: true` was added to
// `DIDIT_SAFE_RISKS` — i.e. the shape a well-meaning "give the host a real reason" edit actually
// takes, and the exact code that asserts a fact about a DIFFERENT FitOut account (a D-72 breach, not
// a copy problem).
//
//   `npx vitest run tests/verification/didit-verdict.test.ts` → Tests 2 failed | 39 passed (41).
//   Observed output, verbatim:
//
//     × case 29 — a decline carrying ONLY unsafe codes yields the canned sentence ALONE
//     × case 30 — T-18.1-0601: the two cross-user codes are absent from the allow-list BY NAME
//
//     AssertionError: HOST_REJECT_REASONS[0] IS D-265's canned fallback: when nothing survives the
//     allow-list, composeReason returns the product sentence alone. No new fallback string is
//     invented.: expected 'We couldn\'t confirm who this account…' to be 'We couldn\'t confirm who
//     this account…' // Object.is equality
//
//     Expected: "We couldn't confirm who this account belongs to."
//     Received: "We couldn't confirm who this account belongs to. Another document in your
//                application has matching DOB, issuing country, and name."
//
// Reverted → 41 passed. **THE FINDING IS WHICH CASES STAYED GREEN: the other thirty-nine.** The
// census still mapped all ten statuses in both casings, F-3 still held, the bound still held, and
// the canned-fallback cases on an EMPTY and an ABSENT decision were all still green — because none
// of them sends the offending code. A privacy leak through an allow-list is invisible to every case
// except the two written for it, which is why case 29 enumerates the unsafe codes by name instead of
// asserting "the reason looks reasonable", and why case 30 asserts membership directly rather than
// inferring it from a composed string.
//
// NO DATABASE. The module is pure — no connection, no network call, no clock — so nothing here
// touches Postgres and no case reaches for the isolated-schema helper the integration files open
// with. ⚠ That helper's NAME is deliberately not spelled: an acceptance check counts its occurrences
// in this file, and the sentence promising it is absent must not be what makes the count non-zero
// (drizzle/0021's rule, the collision this repo has closed seven times).

import { describe, expect, it } from "vitest";

import { HOST_REJECT_REASONS, REJECT_NOTE_MAX } from "@/lib/validation/ops";
import {
  composeDiditRejectReason,
  DIDIT_SAFE_RISKS,
  DIDIT_STATUSES,
  mapDiditStatus,
  type DiditDecision,
  type DiditStatus,
  type DiditTransition,
} from "@/lib/verification/didit-verdict";

/** The product sentence D-265 uses as its canned fallback. Read from the shipped constant, never retyped. */
const CANNED = HOST_REJECT_REASONS[0];

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CASE GROUP 1 — THE CENSUS
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The RULING, restated independently of the module so the two have to agree.
 *
 * ⚠ Deliberately hand-written rather than derived from the module's own table: a table imported from
 * the thing it measures agrees with itself by construction and would go green against any edit at
 * all. The guard-the-guard case below asserts this list covers `DIDIT_STATUSES` exactly, which is
 * what makes it a census rather than a sample.
 */
const CENSUS: readonly {
  status: DiditStatus;
  transition: DiditTransition;
  audit: boolean;
  carriesDecision: boolean;
  why: string;
}[] = [
  {
    status: "Not Started",
    transition: "none",
    audit: false,
    carriesDecision: false,
    why: "the link has not been opened; the check is genuinely still ahead of the host",
  },
  {
    status: "In Progress",
    transition: "none",
    audit: false,
    carriesDecision: false,
    why: "the host is mid-flow; nothing has been decided",
  },
  {
    status: "Awaiting User",
    transition: "none",
    audit: true,
    carriesDecision: false,
    why: "KYB-only and therefore unreachable — refused exactly as an unknown status (ADDENDUM A6)",
  },
  {
    status: "In Review",
    transition: "none",
    audit: true,
    carriesDecision: true,
    why: "Didit's OWN compliance reviewer has it; a check really is still running (FINDING F-3)",
  },
  {
    status: "Approved",
    transition: "approve",
    audit: true,
    carriesDecision: true,
    why: "D-261 — a vendor pass auto-approves the host, with no operator confirming it",
  },
  {
    status: "Declined",
    transition: "reject",
    audit: true,
    carriesDecision: true,
    why: "D-262 — a vendor fail auto-rejects the host, with no operator confirming it",
  },
  {
    status: "Resubmitted",
    transition: "none",
    audit: false,
    carriesDecision: false,
    why: "NOT a verdict: it carries resubmission instructions instead of a decision (ADDENDUM A6)",
  },
  {
    status: "Abandoned",
    transition: "reset-to-unverified",
    audit: true,
    carriesDecision: true,
    why: "FINDING F-3 — the host never finished, so nobody checked",
  },
  {
    status: "Expired",
    transition: "reset-to-unverified",
    audit: true,
    carriesDecision: false,
    why: "FINDING F-3 — the TTL elapsed before the link was opened, so nobody checked",
  },
  {
    status: "Kyc Expired",
    transition: "none",
    audit: true,
    carriesDecision: true,
    why: "unreachable while no expiration policy is configured (ADDENDUM B7); moves nothing, audits",
  },
];

const CASINGS = [
  { label: "the documented casing (the webhook envelope's)", spell: (s: string) => s },
  { label: "UPPER CASE (the decision endpoint's own example)", spell: (s: string) => s.toUpperCase() },
] as const;

for (const casing of CASINGS) {
  describe(`HVER-07 — the ten-status census in ${casing.label}`, () => {
    it.each(CENSUS)("`$status` -> $transition — $why", (row) => {
      const outcome = mapDiditStatus(casing.spell(row.status));

      expect(
        outcome.transition,
        `Didit's \`${row.status}\` must map to \`${row.transition}\` — ${row.why}. Read in ` +
          `${casing.label}, because the two vendor surfaces disagree on case and a mapper that ` +
          "matched only one would leave every host at `pending` with nobody prompted.",
      ).toBe(row.transition);

      expect(
        outcome.status,
        "a recognised status resolves to its CANONICAL vendor spelling, whatever casing arrived",
      ).toBe(row.status);

      expect(
        outcome.audit,
        `an audit row for \`${row.status}\` is ${row.audit ? "required" : "deliberately not written"}`,
      ).toBe(row.audit);

      expect(
        outcome.carriesDecision,
        `\`${row.status}\` ${row.carriesDecision ? "carries" : "does NOT carry"} a decision object ` +
          "(ADDENDUM A6) — a caller reads this instead of knowing the exception",
      ).toBe(row.carriesDecision);
    });
  });
}

describe("HVER-07 — the census is a census, not a sample", () => {
  it("case 21 — the table covers `DIDIT_STATUSES` exactly, member for member", () => {
    expect(
      CENSUS.map((row) => row.status),
      "a status added to DIDIT_STATUSES without a decision recorded in this table would otherwise " +
        "fall into the unknown branch silently. tsc cannot see this: the statuses are vendor " +
        "strings, not a pgEnum-derived union.",
    ).toEqual([...DIDIT_STATUSES]);

    expect(CENSUS).toHaveLength(DIDIT_STATUSES.length);
    expect(DIDIT_STATUSES, "ADDENDUM A6's complete enumeration is ten").toHaveLength(10);
  });

  it("case 22 — the two casings produce IDENTICAL outcomes for all ten", () => {
    for (const status of DIDIT_STATUSES) {
      expect(
        mapDiditStatus(status.toUpperCase()),
        `\`${status}\` and \`${status.toUpperCase()}\` are the SAME answer from the vendor wearing ` +
          "two spellings; normalisation happens once, at the top of the mapper",
      ).toEqual(mapDiditStatus(status));
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CASE GROUP 2 — FINDING F-3, NAMED
// ════════════════════════════════════════════════════════════════════════════════════════════════

const F3_MESSAGE =
  "FINDING F-3, settled in didit-verdict.ts: this status must return the row to `unverified`. " +
  "18.1-UI-SPEC's `/host/verify` PENDING panel says the check is with the checking partner and " +
  "offers NO WAY OUT, because the hosted-flow URL is not storable. That copy is honest ONLY while " +
  "this holds — leave the row at `pending` and a host who closed the tab reads, forever, a sentence " +
  "about a session that will never answer.";

describe("FINDING F-3 — a session nobody finished releases the row", () => {
  it("case 23 — `Expired` returns the row to `unverified`", () => {
    const outcome = mapDiditStatus("Expired");
    expect(outcome.transition, F3_MESSAGE).toBe("reset-to-unverified");
    expect(outcome.transition, "and it is never an approval").not.toBe("approve");
    expect(
      mapDiditStatus("EXPIRED").transition,
      `${F3_MESSAGE} (and it holds in the decision endpoint's casing too)`,
    ).toBe("reset-to-unverified");
  });

  it("case 24 — `Abandoned` returns the row to `unverified`", () => {
    const outcome = mapDiditStatus("Abandoned");
    expect(outcome.transition, F3_MESSAGE).toBe("reset-to-unverified");
    expect(outcome.transition, "and it is never an approval").not.toBe("approve");
    expect(
      mapDiditStatus("ABANDONED").transition,
      `${F3_MESSAGE} (and it holds in the decision endpoint's casing too)`,
    ).toBe("reset-to-unverified");
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CASE GROUP 3 — THE UNKNOWN BRANCH
// ════════════════════════════════════════════════════════════════════════════════════════════════

describe("HVER-07 — an unrecognised status moves NOTHING", () => {
  it("case 25 — a status Didit has never sent moves nothing and asks for an audit row", () => {
    const outcome = mapDiditStatus("Teleported");

    expect(
      outcome.transition,
      "an eleventh vendor status, a typo and a truncated string all land here. There is no " +
        "permissive default: the honest answer to a spelling nobody has seen is to move nothing.",
    ).toBe("none");
    expect(outcome.transition, "and above all it must never approve").not.toBe("approve");
    expect(
      outcome.status,
      "`status: null` is the fail-closed marker — the ONLY value meaning `Didit said something " +
        "FitOut has never heard of`",
    ).toBeNull();
    expect(outcome.audit, "a person has to be able to see this happened").toBe(true);
    expect(
      outcome.carriesDecision,
      "nothing may be read out of a payload FitOut does not recognise",
    ).toBe(false);
  });

  it("case 26 — an absent, empty or whitespace-only status is not a verdict", () => {
    for (const raw of [null, undefined, "", "   ", "\t\n"]) {
      const outcome = mapDiditStatus(raw);
      expect(
        outcome.transition,
        `\`${JSON.stringify(raw)}\` is not a status. A body that carries no status at all must not ` +
          "resolve to one.",
      ).toBe("none");
      expect(outcome.status).toBeNull();
    }
  });

  it("case 27 — PROTOTYPE-SHAPED status strings resolve to nothing", () => {
    // The port's property one module along: a bare index on an object literal answers TRUTHILY for
    // these four inherited members, so a status that arrived from a vendor payload could resolve to
    // a function that is not a status at all. `Object.hasOwn` is the difference.
    for (const hostile of ["constructor", "toString", "valueOf", "__proto__"]) {
      const outcome = mapDiditStatus(hostile);
      expect(
        outcome.status,
        `\`${hostile}\` is an inherited Object.prototype member, not a Didit status. A bare ` +
          "`INDEX[name]` lookup would answer truthily for it.",
      ).toBeNull();
      expect(outcome.transition).toBe("none");
      expect(outcome.transition).not.toBe("approve");
    }
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CASE GROUP 4 — THE WARNINGS
// ════════════════════════════════════════════════════════════════════════════════════════════════

/**
 * The FULL vendor warning object — six fields, transcribed from 18.1-RESEARCH § R3.
 *
 * ⚠ It is deliberately WIDER than `DiditWarning`, which models only the three fields FitOut is
 * allowed to look at. Building fixtures at the vendor's real width and casting at the boundary is
 * the point: the module's narrow type is an exclusion, and these cases prove the unmodelled fields
 * cannot reach a host even when they are genuinely present in the payload.
 */
type VendorWarning = {
  feature: string;
  risk: string;
  additional_data: unknown;
  log_type: string;
  short_description: string;
  long_description: string;
  node_id: string;
};

const NODE_ID = "first_id_verification";

/** A decision at the vendor's real width, cast at the boundary the module reads it through. */
function decisionOf(warnings: readonly Partial<VendorWarning>[]): DiditDecision {
  return {
    id_verifications: [{ node_id: NODE_ID, status: "Declined", warnings }],
    liveness_checks: null,
    face_matches: null,
  } as unknown as DiditDecision;
}

function warning(over: Partial<VendorWarning>): Partial<VendorWarning> {
  return {
    feature: "ID_VERIFICATION",
    log_type: "error",
    additional_data: null,
    long_description: "Internal prose the host never sees.",
    node_id: NODE_ID,
    ...over,
  };
}

describe("D-265 / HVER-08 — the rejection sentence a host actually reads", () => {
  it("case 28 — safe warnings survive, behind the product taxonomy sentence", () => {
    const reason = composeDiditRejectReason(
      decisionOf([
        warning({ risk: "DOCUMENT_EXPIRED", short_description: "Document expired" }),
        warning({ risk: "IMAGE_TOO_BLURRY", short_description: "Document image is too blurry" }),
      ]),
    );

    expect(
      reason.startsWith(CANNED),
      "the vendor's string occupies the NOTE slot; the product taxonomy sentence is prepended by " +
        "composeReason, exactly as an operator's rejection composes today",
    ).toBe(true);
    expect(reason).toContain("Document expired");
    expect(reason).toContain("Document image is too blurry");
  });

  it("case 29 — a decline carrying ONLY unsafe codes yields the canned sentence ALONE", () => {
    const unsafe = [
      { risk: "SCREEN_CAPTURE_DETECTED", short_description: "Screen capture detected" },
      { risk: "POSSIBLE_DUPLICATED_USER", short_description: "Another document in your application has matching DOB, issuing country, and name" },
      { risk: "DOCUMENT_NAME_DIFFERENT_FROM_OTHER_APPROVED_DOCUMENTS", short_description: "Name differs from another approved document" },
      { risk: "MRZ_VALIDATION_FAILED", short_description: "MRZ is not valid" },
      { risk: "LOW_LIVENESS_SCORE", short_description: "Low liveness score" },
    ];

    const reason = composeDiditRejectReason(decisionOf(unsafe.map((w) => warning(w))));

    expect(
      reason,
      "HOST_REJECT_REASONS[0] IS D-265's canned fallback: when nothing survives the allow-list, " +
        "composeReason returns the product sentence alone. No new fallback string is invented.",
    ).toBe(CANNED);
    expect(reason.length, "a host told `no` with an empty reason is the defect one level up").toBeGreaterThan(0);

    for (const w of unsafe) {
      expect(
        reason,
        `\`${w.risk}\` is off the allow-list and neither its code nor its sentence may reach a host`,
      ).not.toContain(w.short_description);
      expect(reason).not.toContain(w.risk);
    }
  });

  it("case 30 — T-18.1-0601: the two cross-user codes are absent from the allow-list BY NAME", () => {
    for (const code of [
      "POSSIBLE_DUPLICATED_USER",
      "DOCUMENT_NAME_DIFFERENT_FROM_OTHER_APPROVED_DOCUMENTS",
    ]) {
      expect(
        Object.hasOwn(DIDIT_SAFE_RISKS, code),
        `\`${code}\` asserts a fact about a DIFFERENT FitOut account. Rendering it is a D-72 ` +
          "privacy breach, not a copy problem.",
      ).toBe(false);
    }
  });

  it("case 31 — an empty warnings array, an absent decision and a null one all yield the canned sentence", () => {
    expect(composeDiditRejectReason(decisionOf([]))).toBe(CANNED);
    expect(composeDiditRejectReason(null)).toBe(CANNED);
    expect(composeDiditRejectReason(undefined)).toBe(CANNED);
    expect(
      composeDiditRejectReason({ id_verifications: null, liveness_checks: null, face_matches: null }),
      "a feature block is `null` until that feature has run (ADDENDUM A8); a decline can arrive " +
        "before every feature did, and that must not throw",
    ).toBe(CANNED);
  });

  it("case 32 — T-18.1-0602: no threshold, no node identity and no raw code reaches a host", () => {
    const reason = composeDiditRejectReason(
      decisionOf([
        warning({
          risk: "DOCUMENT_EXPIRED",
          short_description: "Document expired",
          additional_data: { score: 42.1, threshold: 70 },
        }),
      ]),
    );

    expect(reason, "the safe sentence itself is kept").toContain("Document expired");
    expect(reason, "the detector's threshold is a tuning oracle").not.toContain("70");
    expect(reason, "so is its score").not.toContain("42.1");
    expect(reason, "a node identity is vendor-internal and means nothing to a person").not.toContain(NODE_ID);
    expect(reason, "the risk code is a CODE; it selects, it is never rendered").not.toContain("DOCUMENT_EXPIRED");
    expect(reason, "the long form is internal prose").not.toContain("Internal prose");
  });

  it("case 33 — only `log_type: \"error\"` is kept, even for an allow-listed code", () => {
    for (const level of ["warning", "information", "", "ERROR"]) {
      const reason = composeDiditRejectReason(
        decisionOf([
          warning({
            risk: "DOCUMENT_EXPIRED",
            short_description: "Document expired",
            log_type: level,
          }),
        ]),
      );
      expect(
        reason,
        `a \`${level}\` log did not cause the decline. Keeping one would tell a host that something ` +
          "they cannot act on is why they were refused.",
      ).toBe(CANNED);
    }
  });

  it("case 34 — the composed reason is bounded by the taxonomy sentence plus REJECT_NOTE_MAX", () => {
    const flood = Array.from({ length: 60 }, (_, i) =>
      warning({
        risk: "DOCUMENT_EXPIRED",
        short_description: `Document expired ${i} ${"x".repeat(40)}`,
      }),
    );

    const reason = composeDiditRejectReason(decisionOf(flood));

    expect(
      reason.length,
      "the 280 ceiling is on the NOTE slot, not on the whole stored string: composeReason prepends " +
        "the taxonomy sentence and joins with one space, exactly as an operator's rejection does",
    ).toBeLessThanOrEqual(CANNED.length + 1 + REJECT_NOTE_MAX);
  });

  it("case 35 — D-272: an exhausted per-module retry is never rendered as `no tries left`", () => {
    // The account allows SEVEN attempts per SEVEN days; the per-module caps (two document attempts,
    // three liveness, three face match) bound retries WITHIN ONE SESSION and were deliberately not
    // raised. So a host can burn a session's document attempts while still holding most of their
    // weekly allowance — and a sentence about having no tries left would be FALSE as they read it,
    // and would send them looking for a support address D-263 says does not exist.
    const reason = composeDiditRejectReason(
      decisionOf([
        warning({ risk: "MAX_ATTEMPTS_REACHED", short_description: "No attempts left" }),
        warning({ risk: "ID_VERIFICATION_MAX_RETRY_ATTEMPTS", short_description: "You have used all your tries" }),
      ]),
    );

    expect(
      reason,
      "an attempts-exhausted code is off the allow-list and no replacement sentence is written; " +
        "D-264 owns what a host is told about retrying, and it says it with a timestamp",
    ).toBe(CANNED);
    expect(reason).not.toMatch(/attempt/i);
    expect(reason).not.toMatch(/tries/i);
  });

  it("case 36 — `Resubmitted` is not a verdict, and reading one out of it does not throw", () => {
    const outcome = mapDiditStatus("Resubmitted");

    expect(
      outcome.carriesDecision,
      "ADDENDUM A6: this status carries resubmission instructions INSTEAD of a decision object. A " +
        "mapper that reached for the decision unconditionally would throw on the one status that " +
        "means `the host is still working`.",
    ).toBe(false);
    expect(outcome.transition).toBe("none");

    // The resubmit-shaped payload, at the vendor's real width: no decision anywhere in it.
    const resubmitShaped = {
      resubmit_info: {
        nodes_to_resubmit: [{ node_id: NODE_ID, feature: "ID_VERIFICATION" }],
        reasons: { [NODE_ID]: "Document image is too blurry" },
      },
    } as unknown as DiditDecision;

    expect(() => composeDiditRejectReason(resubmitShaped)).not.toThrow();
    expect(composeDiditRejectReason(resubmitShaped)).toBe(CANNED);
  });
});

// ════════════════════════════════════════════════════════════════════════════════════════════════
// CASE GROUP 5 — PROTOTYPE-SHAPED RISK CODES
// ════════════════════════════════════════════════════════════════════════════════════════════════

describe("T-18.1-0605 — a vendor-supplied `risk` reaching an object lookup", () => {
  it.each(["constructor", "toString", "valueOf", "__proto__"])(
    "case 37 — `%s` is NOT on the allow-list and its sentence is NOT kept",
    (hostile) => {
      expect(
        Object.hasOwn(DIDIT_SAFE_RISKS, hostile),
        `\`${hostile}\` is an inherited Object.prototype member. A bare ` +
          "`DIDIT_SAFE_RISKS[risk]` index would answer TRUTHILY for it, and the vendor supplies " +
          "this value — this is the port's own hazard, one domain over, and it is measured rather " +
          "than assumed.",
      ).toBe(false);

      const reason = composeDiditRejectReason(
        decisionOf([warning({ risk: hostile, short_description: `leaked via ${hostile}` })]),
      );

      expect(reason, "nothing selected by a prototype name may reach a host").toBe(CANNED);
      expect(reason).not.toContain(hostile);
    },
  );

  it("case 38 — a non-string `risk` is not kept either", () => {
    const reason = composeDiditRejectReason(
      // The vendor's types are documentation, not a runtime guarantee; the composer narrows.
      decisionOf([
        { log_type: "error", short_description: "Should never appear" } as Partial<VendorWarning>,
        { log_type: "error", risk: 7, short_description: "Nor this" } as unknown as Partial<VendorWarning>,
      ]),
    );

    expect(reason).toBe(CANNED);
    expect(reason).not.toContain("Should never appear");
    expect(reason).not.toContain("Nor this");
  });
});
