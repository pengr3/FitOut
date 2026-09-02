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
//   - cases 1-6  — the fail-closed cases. Unknown, empty, `undefined`, `null`, and the
//                  PROTOTYPE-SHAPED names a bare `Record` lookup answers truthily (four of them
//                  from 18.1-05 on — `valueOf` joined the sweep with the second registry row).
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
//   - case 14    — THE ASYNC WIDENING, MEASURED. Plan 18.1-04 widened `verify` to return
//                  `VerificationResult | Promise<VerificationResult>` so a network vendor can live
//                  behind the SAME single branch point. An `async` `runVerification` flattens a
//                  returned promise whether or not it awaits, so "it is async" proves nothing on its
//                  own — the case therefore puts a genuinely promise-returning adapter behind the
//                  registry and asserts the resolved value is a plain four-key result, identical in
//                  shape to the synchronous one, with the fail-closed branch still closed.
//   - cases 15-19 — 18.1-05's REGISTRATION, and the properties a second row could have quietly
//                   cost. `didit` resolves to the Didit adapter and `manual` still resolves to the
//                   manual one (D-258 beside D-259, not instead of it); `migration` still resolves
//                   to nothing by every path; the prototype-shaped names are still refused with a
//                   second row present; the registry is EXACTLY TWO ROWS, read structurally out of
//                   port.ts's own source so a third provider has to be a decision rather than a
//                   drift; and the vendor's verdict comes back through `runVerification` as the
//                   same four keys the manual one does.
//
// ⚠ WHY EVERY `runVerification(...)` IS AWAITED FROM 18.1-04 ONWARD. It returns
// `Promise<VerificationResult | null>` now. An un-awaited call is TRUTHY for every input including
// the hostile ones, so a case that forgot the `await` would go GREEN against a port that verifies
// everybody — the precise inversion of what cases 1-6 and 11 exist to catch. `isVerified` stays
// SYNCHRONOUS for the same reason: the compiler refuses the un-awaited form outright.
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

import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

import {
  isVerified,
  resolveVerificationProvider,
  runVerification,
  type VerificationProvider,
  type VerificationResult,
} from "@/lib/verification/port";
import {
  MANUAL_PROVIDER_NAME,
  manualVerificationProvider,
} from "@/lib/verification/providers/manual";
import {
  DIDIT_PROVIDER_NAME,
  diditVerificationProvider,
} from "@/lib/verification/providers/didit";
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
  { label: "the prototype key `valueOf`", name: "valueOf" },
];

/**
 * The registry's OWN-PROPERTY COUNT, read structurally out of `port.ts` rather than through an
 * export.
 *
 * `PROVIDERS` is deliberately module-private — exporting it so a test could count it would open the
 * one branch point this whole file exists to keep closed, and a test that forces a widening of the
 * production surface is measuring its own edit. So the count is taken from the AST: the object
 * literal `PROVIDERS` is initialised with, counted by property.
 *
 * AST AND NOT A GREP, for tests/design/server-only-guards.test.ts's recorded reason — this file's
 * headers and port.ts's both discuss provider names at length, and a text search cannot tell a
 * registry row from a sentence about one. A parse miss returns -1 rather than 0, so a refactor that
 * moves the registry out of a plain object literal reddens LOUDLY instead of silently reporting
 * "zero rows, which is fewer than three, so nothing has drifted".
 */
function registryRowCount(portSource: string): number {
  const sf = ts.createSourceFile(PORT_PATH, portSource, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  for (const stmt of sf.statements) {
    if (!ts.isVariableStatement(stmt)) continue;
    for (const decl of stmt.declarationList.declarations) {
      if (!ts.isIdentifier(decl.name) || decl.name.text !== "PROVIDERS") continue;
      const init = decl.initializer;
      if (init && ts.isObjectLiteralExpression(init)) return init.properties.length;
    }
  }
  return -1;
}

/**
 * Narrow a provider's WIDENED return to its synchronous branch — asserting, never assuming.
 *
 * 18.1-04 widened `VerificationProvider.verify` to
 * `VerificationResult | Promise<VerificationResult>`, so the compiler no longer knows which branch
 * any one adapter hands back. The manual provider is still synchronous and cases 8-10 still measure
 * it as such; this is where that claim is CHECKED rather than cast away. An adapter that quietly
 * became async would keep satisfying the interface while silently breaking every reader that takes a
 * field off its return — including `checkedAt`'s before/after bracket in case 8.
 *
 * The `throw` is unreachable: the `expect` above it has already failed the test. It exists so the
 * narrowing is done by `instanceof` rather than by an `as`, because an `as` here would assert
 * exactly the thing this helper is for.
 */
function syncResult(out: VerificationResult | Promise<VerificationResult>): VerificationResult {
  expect(out, "a synchronous provider must not hand back a promise").not.toBeInstanceOf(Promise);
  if (out instanceof Promise) throw new Error("unreachable — the assertion above has already failed");
  return out;
}

describe("HVER-01 — the verification port fails CLOSED on anything unregistered", () => {
  for (const { label, name } of UNREGISTERED) {
    it(`resolves NO provider for ${label}`, () => {
      expect(resolveVerificationProvider(name)).toBeNull();
    });
  }

  it("case 11 — THE FAIL-CLOSED PROOF: no unregistered name yields a verified outcome, by any path", async () => {
    for (const { label, name } of UNREGISTERED) {
      // The port exposes exactly one way to turn a decision into a persistable result. For an
      // unregistered name it returns null, so there is no object to write to host_verification —
      // stronger than returning a failing one, because a failing one could still be misread.
      // AWAITED: `runVerification` returns a promise from 18.1-04 on, and an un-awaited one is
      // truthy for every name here — the whole sweep would go green against a port that verifies
      // everybody.
      const produced = await runVerification(name, { result: "pass" });
      expect(produced, label).toBeNull();
      expect(isVerified(produced), label).toBe(false);

      // And the resolve half agrees, so a caller that resolves first cannot find a back door.
      const provider = resolveVerificationProvider(name);
      expect(provider, label).toBeNull();
    }

    // POSITIVE CONTROL — without this the whole sweep above would pass against a port hardcoded to
    // refuse everybody, which would be a different bug wearing this test's green.
    const real = await runVerification(MANUAL_PROVIDER_NAME, { result: "pass" });
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
    const out = syncResult(manualVerificationProvider.verify({ result: "pass" }));
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
    expect(syncResult(manualVerificationProvider.verify({ result: "pass" })).result).toBe("pass");
    expect(syncResult(manualVerificationProvider.verify({ result: "fail" })).result).toBe("fail");
    expect(isVerified(syncResult(manualVerificationProvider.verify({ result: "fail" })))).toBe(false);
  });

  it("case 10 — runVerification is the same adapter reached through the port", async () => {
    const direct = syncResult(manualVerificationProvider.verify({ result: "fail" }));
    const viaPort = await runVerification("manual", { result: "fail" });
    expect(viaPort).not.toBeNull();
    expect(viaPort!.result).toBe(direct.result);
    expect(viaPort!.provider).toBe(direct.provider);
    expect(viaPort!.vendorRef).toBe(direct.vendorRef);
  });
});

describe("D-206 — the storage contract is four fields, and there is no fifth", () => {
  it("case 12 — the produced result's KEY SET is exactly {result, vendorRef, checkedAt, provider}", async () => {
    const out = (await runVerification("manual", { result: "pass" }))!;

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

describe("18.1-04 — an ASYNCHRONOUS provider goes through the SAME single branch point", () => {
  it("case 14 — a promise-returning adapter resolves through runVerification exactly as a sync one does", async () => {
    // WHY THIS REACHES FOR THE MODULE REGISTRY INSTEAD OF A LOCAL VARIABLE. `runVerification` takes
    // a provider NAME, never a provider — that IS property 1, and it is the property worth keeping.
    // So the only honest way to put an async adapter behind the port is to re-import the port over a
    // replaced implementation module: the same module the registry keys itself from. Scoped to this
    // case and undone in the `finally`, so every other case in this file keeps measuring the real
    // manual adapter.
    //
    // AND IT IS NOT CEREMONY. An `async` function flattens a returned promise whether or not its
    // body writes `await`, so "runVerification is async now" proves nothing on its own. What has to
    // be measured is that an adapter handing back a PROMISE produces a plain, four-key, fully-formed
    // result at the caller — because the failure mode on the other side of that is a `Promise`
    // object written into `host_verification`, i.e. a verified-looking row for a check nobody read.
    const CHECKED_AT = new Date("2026-09-02T04:05:06.000Z");
    let calls = 0;

    // The annotation is the COMPILE-TIME half of the widening: before 18.1-04 an implementation
    // returning `Promise<VerificationResult>` did not satisfy this interface at all.
    const asyncProvider: VerificationProvider = {
      name: "manual",
      verify: async (decision) => {
        calls += 1;
        // A real task-queue boundary, so a missing `await` in the port cannot be papered over by a
        // promise that happened to be settled already at the moment it was returned.
        await new Promise((resolve) => setTimeout(resolve, 0));
        return {
          result: decision.result,
          vendorRef: "fixture-session-id",
          checkedAt: CHECKED_AT,
          provider: "manual",
        };
      },
    };

    try {
      vi.resetModules();
      vi.doMock("@/lib/verification/providers/manual", () => ({
        MANUAL_PROVIDER_NAME: "manual",
        manualVerificationProvider: asyncProvider,
      }));

      const port = await import("@/lib/verification/port");

      // The port's own return is THENABLE, so a caller that forgets to await gets an object that is
      // truthy for every input — which is why the two ops call sites were changed in the same
      // commit and why every case in this file awaits.
      const pending = port.runVerification("manual", { result: "pass" });
      expect(pending).toBeInstanceOf(Promise);

      const produced = await pending;
      // ONE await is enough: the port unwrapped the adapter's promise rather than nesting it.
      expect(produced).not.toBeInstanceOf(Promise);
      expect(produced).not.toBeNull();
      expect(produced!.result).toBe("pass");
      expect(produced!.vendorRef).toBe("fixture-session-id");
      expect(produced!.checkedAt).toEqual(CHECKED_AT);
      expect(produced!.provider).toBe("manual");
      expect(port.isVerified(produced)).toBe(true);

      // "EXACTLY AS A SYNC ONE DOES" — case 12's storage contract, re-measured over the async path.
      // The widening changed WHEN a result arrives and must not have changed WHAT one is.
      expect(Object.keys(produced!).sort()).toEqual(
        ["checkedAt", "provider", "result", "vendorRef"].sort(),
      );

      // Both directions, for case 9's reason: an adapter hardcoded to "pass" marks every rejected
      // host verified, and threading a value through a promise is exactly the kind of edit that
      // loses the input on one branch.
      const failed = await port.runVerification("manual", { result: "fail" });
      expect(failed).not.toBeNull();
      expect(failed!.result).toBe("fail");
      expect(port.isVerified(failed)).toBe(false);

      // AND THE FAIL-CLOSED BRANCH IS STILL CLOSED with an async provider registered. Resolution
      // happens before anything is awaited, so a hostile name never reaches an adapter at all —
      // asserted by the call counter rather than inferred from the null.
      for (const { label, name } of UNREGISTERED) {
        const refused = await port.runVerification(name, { result: "pass" });
        expect(refused, label).toBeNull();
        expect(port.isVerified(refused), label).toBe(false);
      }
      expect(calls, "no unregistered name may reach the adapter").toBe(2);
    } finally {
      vi.doUnmock("@/lib/verification/providers/manual");
      vi.resetModules();
    }
  });
});

describe("D-258 / D-259 — the registry is EXACTLY TWO ROWS: the ops override and the vendor", () => {
  it("case 15 — 'didit' resolves to the Didit adapter, and 'manual' still resolves to the manual one", () => {
    // D-258. Identity, not truthiness — case 7's reason, applied to the second row: a registry that
    // answered with *something* for "didit" would satisfy a `toBeTruthy()` while pointing anywhere.
    expect(resolveVerificationProvider("didit")).toBe(diditVerificationProvider);
    expect(DIDIT_PROVIDER_NAME).toBe("didit");

    // D-259, and this half is the one a "we have a real vendor now" tidy-up would delete. The manual
    // provider is the OPS OVERRIDE: a vendor outage, a document the workflow cannot read, or an
    // appeal still has to be decidable by a named member of staff, and `provider = 'manual'` is what
    // keeps those rows distinguishable from a vendor verdict in the audit trail.
    expect(resolveVerificationProvider("manual")).toBe(manualVerificationProvider);
    expect(MANUAL_PROVIDER_NAME).toBe("manual");

    // The two names are DIFFERENT and each adapter reports its own — one constant per adapter is
    // what stops the registered name and the persisted `host_verification.provider` value drifting.
    expect(diditVerificationProvider.name).not.toBe(manualVerificationProvider.name);
  });

  it("case 16 — 'migration' is STILL unregistered, by every path, permanently", async () => {
    // drizzle/0026's grandfathered rows carry this string because NOTHING WAS CHECKED on them. There
    // is no adapter that could have produced them, so registering one would be a lie about history —
    // and would make a row nobody ever looked at re-runnable through the verdict path.
    expect(resolveVerificationProvider("migration")).toBeNull();

    const produced = await runVerification("migration", { result: "pass" });
    expect(produced, "no adapter may exist for a check nobody ran").toBeNull();
    expect(isVerified(produced)).toBe(false);
  });

  it("case 17 — the prototype-shaped names are still refused with a SECOND row in the registry", async () => {
    // `Object.hasOwn` is what makes this hold, and a second row is exactly the kind of edit that
    // gets rewritten as a `PROVIDERS[name] ?? null` on the way past. `"constructor"`, `"toString"`,
    // `"valueOf"` and `"__proto__"` are inherited members, so a bare index answers TRUTHILY for all
    // four and a caller-influenced provider name would resolve to a function that is not a provider.
    for (const name of ["constructor", "toString", "valueOf", "__proto__"]) {
      expect(resolveVerificationProvider(name), name).toBeNull();
      expect(await runVerification(name, { result: "pass" }), name).toBeNull();
    }
  });

  it("case 18 — the registry has EXACTLY TWO rows, so a third provider is a decision and not a drift", () => {
    const portSrc = readFileSync(resolve(ROOT, PORT_PATH), "utf8");
    const rows = registryRowCount(portSrc);

    expect(
      rows,
      "PROVIDERS was not found as a plain object literal in port.ts — the structural read missed it",
    ).not.toBe(-1);

    // TWO, counted at the SOURCE, because the runtime cannot be asked: `PROVIDERS` is private and
    // must stay private. A third row is not forbidden — it is a decision, and this is the assertion
    // that makes somebody take it deliberately (and update D-258/D-259's docblock while they do).
    expect(rows, "the registry is manual + didit; a third row needs a recorded decision").toBe(2);

    // AND THE TWO ARE THESE TWO — the count alone would be satisfied by two rows pointing anywhere.
    expect(resolveVerificationProvider(MANUAL_PROVIDER_NAME)).toBe(manualVerificationProvider);
    expect(resolveVerificationProvider(DIDIT_PROVIDER_NAME)).toBe(diditVerificationProvider);
  });

  it("case 19 — the vendor's verdict comes back through the port as the SAME four keys", async () => {
    const produced = await runVerification(DIDIT_PROVIDER_NAME, { result: "pass" });
    expect(produced).not.toBeNull();

    // Case 12's storage contract, re-measured over the second adapter. The vendor holds the document,
    // the selfie and the ID number; what crosses into FitOut is four fields and there is no fifth —
    // in particular the hosted session URL comes back from `beginDiditVerification` BESIDE the
    // result and never inside it (tests/verification/didit-session.test.ts case 2).
    expect(Object.keys(produced!).sort()).toEqual(
      ["checkedAt", "provider", "result", "vendorRef"].sort(),
    );
    expect(produced!.provider).toBe("didit");
    expect(produced!.result).toBe("pass");
    expect(isVerified(produced)).toBe(true);

    // ⚠ `vendorRef: null` ON THE VERDICT PATH DOES NOT MEAN "THERE IS NO HANDLE" — it means THIS
    // CALL CARRIES NO NEW ONE. The session id was written when the check was STARTED and it is
    // still the right one, so the verdict write must PRESERVE `vendor_ref` rather than overwrite it
    // with this null (plan 18.1-08 asserts that at the row). Do not "fix" this into an overwrite:
    // the handle is the only pointer FitOut keeps at the vendor's copy of the evidence.
    expect(produced!.vendorRef).toBeNull();

    // Both directions, for case 9's reason: an adapter hardcoded to "pass" marks every declined host
    // verified, and a vendor adapter is where that would be least visible.
    const declined = await runVerification(DIDIT_PROVIDER_NAME, { result: "fail" });
    expect(declined!.result).toBe("fail");
    expect(isVerified(declined)).toBe(false);
  });
});
