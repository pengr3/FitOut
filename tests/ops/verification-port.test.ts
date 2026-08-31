// HVER-01 / D-206 — the verification port: ONE branch point, and it FAILS CLOSED.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// WHAT THIS FILE IS ACTUALLY MEASURING
// ════════════════════════════════════════════════════════════════════════════════════════════════
// The port's whole reason to exist is that swapping in a real KYC vendor later must be a provider
// REGISTRATION plus a config change, not a re-architecture — and the only way that claim is worth
// anything is if the registry is genuinely the only branch point AND an unregistered name can never
// produce a verified outcome. Both halves are properties of code paths, not of return values, so
// this file asserts them as paths:
//
//   - cases 1-6  — the fail-closed cases. Unknown, empty, `undefined`, `null`, and the two
//                  PROTOTYPE-SHAPED names a bare `Record` lookup answers truthily.
//   - case 7     — `"manual"` resolves, and to the manual adapter specifically.
//   - cases 8-10 — the manual provider's contract: `vendorRef: null`, `provider: "manual"`, a
//                  non-null `checkedAt`, and the `result` it was GIVEN (never a hardcoded verdict).
//   - case 11    — THE FAIL-CLOSED PROOF. `runVerification` is the one path from a decision to a
//                  persistable result, and for every unregistered name it returns `null` — there is
//                  no object for a caller to write, which is strictly stronger than "returns a
//                  failing one". Swept over the whole hostile-name set, and paired with a POSITIVE
//                  CONTROL so the case cannot pass against a port that refuses everybody.
//   - case 12    — the storage contract as a KEY-SET equality: exactly four keys, never a fifth. A
//                  document url added "just for debugging" reddens here before it reaches a column.
//   - case 13    — the `server-only` split, structurally: the guard is on the IMPLEMENTATION and
//                  NOT on the directive-free contract module (src/lib/payments/fees.ts:1-30's rule).
//                  Read over COMMENT-STRIPPED source, because both files' headers discuss the
//                  specifier at length and a raw-text grep cannot tell prose from a directive — the
//                  exact collision tests/design/server-only-guards.test.ts:140-150 records biting
//                  this repo twelve times.
//
// ════════════════════════════════════════════════════════════════════════════════════════════════
// MUTATION, RUN AND SCORED (2026-09-01) — recorded in 18-05-SUMMARY.md
// ════════════════════════════════════════════════════════════════════════════════════════════════
// Green against the shipped port proves the cases pass, not that any of them would NOTICE the defect
// they exist for. So the defect was installed: `resolveVerificationProvider` was made to return the
// manual adapter for an unknown name (the "helpful default" a future reader is most likely to add).
// The observed RED is transcribed in the summary. It reddens cases 1-6 and 11 and leaves 7-10 green
// — i.e. the four HAPPY-PATH cases about the manual provider cannot see this defect at all, which is
// why the fail-closed cases are the ones written first.
//
// NO DATABASE. Nothing here touches Postgres: the port is pure and the manual provider is pure. The
// four columns this contract maps onto are asserted against `information_schema` by
// tests/ops/verification-schema.test.ts (plan 18-02), which is the right instrument for that half.

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
  isVerified,
  resolveVerificationProvider,
  runVerification,
  type VerificationResult,
} from "@/lib/verification/port";
import {
  MANUAL_PROVIDER_NAME,
  manualVerificationProvider,
} from "@/lib/verification/providers/manual";
import { stripComments } from "../helpers/source-text";

const ROOT = process.cwd();
const PORT_PATH = "src/lib/verification/port.ts";
const MANUAL_PATH = "src/lib/verification/providers/manual.ts";

/**
 * Every name that must NOT resolve. The first four are the plan's four; the last two are the ones a
 * plain `PROVIDERS[name]` would answer TRUTHILY, because they are inherited `Object.prototype`
 * members rather than absent keys. A registry that fails closed only for names somebody thought to
 * try is not failing closed.
 */
const UNREGISTERED: ReadonlyArray<{ label: string; name: string | null | undefined }> = [
  { label: "an unknown vendor nobody registered", name: "acme-kyc" },
  { label: "a near-miss misspelling of the real one", name: "manaul" },
  { label: "the empty string", name: "" },
  { label: "undefined", name: undefined },
  { label: "null", name: null },
  { label: "the prototype key `constructor`", name: "constructor" },
  { label: "the prototype key `__proto__`", name: "__proto__" },
  { label: "the prototype key `toString`", name: "toString" },
];

describe("HVER-01 — the verification port fails CLOSED on anything unregistered", () => {
  for (const { label, name } of UNREGISTERED) {
    it(`resolves NO provider for ${label}`, () => {
      expect(resolveVerificationProvider(name)).toBeNull();
    });
  }

  it("case 11 — THE FAIL-CLOSED PROOF: no unregistered name yields a verified outcome, by any path", () => {
    for (const { label, name } of UNREGISTERED) {
      // The port exposes exactly one way to turn a decision into a persistable result. For an
      // unregistered name it returns null, so there is no object to write to host_verification —
      // stronger than returning a failing one, because a failing one could still be misread.
      const produced = runVerification(name, { result: "pass" });
      expect(produced, label).toBeNull();
      expect(isVerified(produced), label).toBe(false);

      // And the resolve half agrees, so a caller that resolves first cannot find a back door.
      const provider = resolveVerificationProvider(name);
      expect(provider, label).toBeNull();
    }

    // POSITIVE CONTROL — without this the whole sweep above would pass against a port hardcoded to
    // refuse everybody, which would be a different bug wearing this test's green.
    const real = runVerification(MANUAL_PROVIDER_NAME, { result: "pass" });
    expect(real).not.toBeNull();
    expect(isVerified(real)).toBe(true);
  });
});

describe("HVER-01 — the ops-manual provider is REGISTERED and is a real provider", () => {
  it("case 7 — 'manual' resolves to the manual adapter, not merely to something truthy", () => {
    expect(resolveVerificationProvider("manual")).toBe(manualVerificationProvider);
    expect(MANUAL_PROVIDER_NAME).toBe("manual");
  });

  it("case 8 — verify() returns vendorRef null, provider 'manual', and a non-null checkedAt", () => {
    const before = Date.now();
    const out = manualVerificationProvider.verify({ result: "pass" });
    const after = Date.now();

    // No vendor ⇒ no reference. A synthetic id here would look exactly like a vendor handle to every
    // later reader and would be a lie in a compliance column.
    expect(out.vendorRef).toBeNull();
    expect(out.provider).toBe("manual");
    expect(out.checkedAt).toBeInstanceOf(Date);
    expect(out.checkedAt!.getTime()).toBeGreaterThanOrEqual(before);
    expect(out.checkedAt!.getTime()).toBeLessThanOrEqual(after);
  });

  it("case 9 — verify() returns the result it was GIVEN, both ways", () => {
    // Both directions, because a provider hardcoded to "pass" passes a one-sided test and would mark
    // every rejected host verified.
    expect(manualVerificationProvider.verify({ result: "pass" }).result).toBe("pass");
    expect(manualVerificationProvider.verify({ result: "fail" }).result).toBe("fail");
    expect(isVerified(manualVerificationProvider.verify({ result: "fail" }))).toBe(false);
  });

  it("case 10 — runVerification is the same adapter reached through the port", () => {
    const direct = manualVerificationProvider.verify({ result: "fail" });
    const viaPort = runVerification("manual", { result: "fail" });
    expect(viaPort).not.toBeNull();
    expect(viaPort!.result).toBe(direct.result);
    expect(viaPort!.provider).toBe(direct.provider);
    expect(viaPort!.vendorRef).toBe(direct.vendorRef);
  });
});

describe("D-206 — the storage contract is four fields, and there is no fifth", () => {
  it("case 12 — the produced result's KEY SET is exactly {result, vendorRef, checkedAt, provider}", () => {
    const out = runVerification("manual", { result: "pass" })!;

    // SET EQUALITY, never a membership check — the tests/ops/verification-schema.test.ts allow-list
    // reasoning applied one layer up. A deny-list naming `document`/`idNumber`/`image` passes
    // cheerfully the day somebody picks a fourth word; this reddens for any new key, named anything.
    expect(Object.keys(out).sort()).toEqual(
      ["checkedAt", "provider", "result", "vendorRef"].sort(),
    );

    // The type-level half, so the compiler carries the same contract the runtime just asserted.
    const contract: VerificationResult = out;
    expect(contract.provider).toBe("manual");
  });
});

describe("GATE-05 shape — the guard is on the implementation, not on the contract module", () => {
  it("case 13 — manual.ts carries `import \"server-only\"`; port.ts does not", () => {
    // Comment-stripped, because BOTH files' headers discuss the specifier at length. A raw-text
    // search would find the prose in port.ts and report a guard that is not there — the exact
    // collision tests/design/server-only-guards.test.ts:140-150 records as this repo's default
    // outcome rather than an edge case.
    const guard = /^\s*import\s+["']server-only["']\s*;?\s*$/m;

    const manualSrc = stripComments(readFileSync(resolve(ROOT, MANUAL_PATH), "utf8"));
    const portSrc = stripComments(readFileSync(resolve(ROOT, PORT_PATH), "utf8"));

    expect(guard.test(manualSrc), `${MANUAL_PATH} must carry the guard`).toBe(true);
    expect(guard.test(portSrc), `${PORT_PATH} must stay directive-free`).toBe(false);
  });
});
