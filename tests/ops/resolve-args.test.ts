// The `--by` requirement, measured where it actually lives (quick task 260811-fh6).
//
// WHY THIS FILE EXISTS AT ALL, rather than these being assertions on the CLI. `scripts/ops-alerts.ts`
// cannot be imported by a test: it opens a postgres.js client and calls `main()` at module load, so an
// `import` of it would connect to a database and run a command as a side effect of collection. So the
// policy — an explicit `--by` is REQUIRED and there is NO default — lives in a pure, DB-free
// `src/lib/ops/resolve-args.ts` that the script imports (D-FH6-08). That is not a testability fig leaf: a
// rule nothing can execute in isolation is a rule nothing can MUTATE in isolation either, and the whole
// value of M2a/M2b below is that they change one line and watch exactly one case go red.
//
// `parseDays` is deliberately NOT moved here. It is not this task's subject, moving it is scope creep, and
// its behaviour is already documented in runbook §6a.
//
// WHAT EACH CASE MEASURES, and why the obvious cheaper version of it would measure nothing:
//
//   - case 19 — the happy path, WITH padding. Trimming is not cosmetic: an untrimmed `"  Jane  "` stores a
//     value whose rendered cell is indistinguishable from a different operator's, which is the dishonest
//     render D-FH6-07 exists to forbid.
//   - case 20 — THE ONE THAT MEASURES D-FH6-03. A bare "missing --by is refused" would only prove that a
//     flag is required. It would stay green under a `process.env.USERNAME ?? "operator"` fallback, which is
//     the failure this decision is actually about: a silent default makes every discharge LOOK attributed
//     while attributing nothing. So the case plants `ghost-default` in BOTH `USERNAME` and `USER` and
//     asserts the string reaches the result NOWHERE. Mutation M2b installs exactly that fallback.
//   - case 21 — blank and whitespace-only are refused. `--by "   "` would otherwise store a value that
//     renders as an empty cell: attributed in the database, unattributed on the screen.
//   - case 22 — the `--by=<value>` form, and the flag placed BEFORE the positional. Flags are parsed FIRST
//     precisely so a `--by` VALUE can never be consumed as the audit id — the failure mode being an
//     operator's name silently becoming the row they discharge.
//   - case 23 — a missing id keeps the EXISTING `resolve needs an audit id.` wording even when `--by` is
//     present. Three distinct errors, because collapsing a typo and a policy violation into one message
//     makes them look like the same mistake.
//
// NO DATABASE: no `setupTestDb`, no `beforeAll`, no `DbConn`. `parseResolveArgs` is pure, and a test that
// stood up a schema to check argv parsing would be advertising a coupling that does not exist.
//
// ---------------------------------------------------------------------------------------------------
// CONFIRM-THEN-FIX — the RED for cases 19-23, recorded VERBATIM (2026-08-11).
// Written FIRST against UNCHANGED `src/`, `scripts/` and `drizzle/`; `git diff --exit-code` on all three
// was clean at this point. `npx vitest run tests/ops/resolve-args.test.ts`, bare, no DATABASE_URL exported:
//
// PREDICTION, recorded BEFORE the run so it can be scored rather than adjusted: a MODULE-LEVEL failure —
// the whole file failing to collect — and NOT the per-case `undefined` behaviour 260811-dj4 observed. The
// dj4 precedent (Vite resolving a missing NAMED EXPORT to `undefined` rather than throwing at import time)
// should NOT apply here, because `src/lib/ops/resolve-args.ts` does not exist as a FILE, so this is module
// resolution failing rather than a binding being absent from a module that loaded fine.
//
// OBSERVED, and the prediction was RIGHT — recorded as scored, not as re-written after the fact:
//
//     ❯ tests/ops/resolve-args.test.ts (0 test)
//
//    ⎯⎯⎯⎯⎯⎯ Failed Suites 1 ⎯⎯⎯⎯⎯⎯⎯
//
//     FAIL  tests/ops/resolve-args.test.ts [ tests/ops/resolve-args.test.ts ]
//    Error: Cannot find package '@/lib/ops/resolve-args' imported from C:/Users/Admin/Roaming/FitOut/tests/ops/resolve-args.test.ts
//     ❯ tests/ops/resolve-args.test.ts:52:1
//         50| import { describe, it, expect } from "vitest";
//         51|
//         52| import { parseResolveArgs } from "@/lib/ops/resolve-args";
//           | ^
//         53|
//         54| describe("parseResolveArgs", () => {
//
//     Test Files  1 failed (1)
//          Tests  no tests
//
// Note `Tests  no tests` and `(0 test)`: the five cases below did not fail INDIVIDUALLY, because the file
// never collected. That is the difference from 260811-dj4's RED and it is the reason the prediction was
// written down first — a missing FILE and a missing named EXPORT from a file that loads are different
// failures, and the dj4 record would have mis-set expectations here if it had been applied by analogy.
//
// ---------------------------------------------------------------------------------------------------
// MUTATION VERIFICATION for case 20 (anti-vacuity house standard). Applied to `src/`, `npx vitest run
// tests/ops` re-run bare with no DATABASE_URL exported, recorded VERBATIM, then reverted —
// `git diff --exit-code src/ scripts/ drizzle/` clean afterwards. M1/M3/M4 are recorded in
// tests/ops/alerts.test.ts's header, beside the cases they redden.
//
// >>> READ THIS FIRST: THE FIRST M2b RUN FOUND A HOLE IN CASE 20 ITSELF, and the hole was in the ASSERTION
// ORDER rather than in the source. As originally written the case asserted `expect(parsed.ok).toBe(false)`
// BEFORE the `ghost-default` check, so an OS-username fallback failed on ok-ness and the env assertion
// never executed. M2a and M2b therefore produced BYTE-IDENTICAL output:
//
//     AssertionError: expected true to be false // Object.is equality
//
// which means the case could NOT distinguish "a flag is required" (M2a) from "the machine fills the name
// in" (M2b) — precisely the distinction D-FH6-03 is about, and the one reason the env half exists at all.
// A case that cannot tell two mutations apart is not measuring the thing that separates them. The
// `ghost-default` assertion was moved ABOVE the `ok` narrowing and both mutations were RE-RUN against the
// corrected case; the records below are those re-runs. Recorded rather than quietly fixed, because the
// process fact is the useful one: this was found by RUNNING a mutation predicted to be redundant, not by
// reading the test.
//
// M2a — drop the missing-`--by` refusal so an absent flag yields a successful parse with an empty name.
//       VERBATIM:
//         FAIL  tests/ops/resolve-args.test.ts > parseResolveArgs > case 20 — a MISSING `--by` is refused, and the machine NEVER fills it in
//        AssertionError: expected true to be false // Object.is equality
//          Test Files  1 failed | 2 passed (3)
//               Tests  1 failed | 32 passed (33)
//       Proves the flag is REQUIRED. That is all it proves, which is why M2b exists.
//
// M2b — default the name to the OS username: `process.env.USERNAME ?? process.env.USER ?? "operator"`.
//       VERBATIM:
//         FAIL  tests/ops/resolve-args.test.ts > parseResolveArgs > case 20 — a MISSING `--by` is refused, and the machine NEVER fills it in
//        AssertionError: expected '{"ok":true,"id":"audit_abc123","by":"…' not to contain 'ghost-default'
//          Test Files  1 failed | 2 passed (3)
//               Tests  1 failed | 32 passed (33)
//       THE ONE THAT MEASURES D-FH6-03. The RED now NAMES `ghost-default` — the planted env value visibly
//       reaching the parsed result — so this mutation and M2a fail differently and the case has teeth
//       against both. A silent default is the dangerous failure, not a missing flag: it would make every
//       discharge look attributed while attributing nothing.
// ---------------------------------------------------------------------------------------------------

import { describe, it, expect } from "vitest";

import { parseResolveArgs } from "@/lib/ops/resolve-args";

describe("parseResolveArgs", () => {
  it("case 19 — an id plus `--by` parses to the id and the TRIMMED name", () => {
    const parsed = parseResolveArgs(["audit_abc123", "--by", "  Jane Ops  "]);

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) throw new Error("unreachable");
    expect(parsed.id).toBe("audit_abc123");
    expect(parsed.by).toBe("Jane Ops");
  });

  it("case 20 — a MISSING `--by` is refused, and the machine NEVER fills it in", () => {
    const savedUsername = process.env.USERNAME;
    const savedUser = process.env.USER;
    try {
      // If any fallback to the OS user existed, THIS is the value it would reach for.
      process.env.USERNAME = "ghost-default";
      process.env.USER = "ghost-default";

      const parsed = parseResolveArgs(["audit_abc123"]);

      // THIS ASSERTION COMES FIRST, AND THE ORDER IS LOAD-BEARING — it was moved here after mutation M2b
      // was run and came back with output BYTE-IDENTICAL to M2a's. With `expect(parsed.ok).toBe(false)`
      // first, an OS-username fallback failed on ok-ness and this line never executed, so the two
      // mutations were indistinguishable and the env half of this case measured NOTHING. Asserting the
      // absence of the env value BEFORE narrowing on `ok` is what makes M2b (a silent default) produce a
      // different, correctly-named RED from M2a (no requirement at all).
      expect(JSON.stringify(parsed)).not.toContain("ghost-default");

      expect(parsed.ok).toBe(false);
      if (parsed.ok) throw new Error("unreachable");
      expect(parsed.error).toContain("--by");
    } finally {
      // Restored even on failure — a leaked env var would silently change every case that runs after this
      // one in the same worker.
      if (savedUsername === undefined) delete process.env.USERNAME;
      else process.env.USERNAME = savedUsername;
      if (savedUser === undefined) delete process.env.USER;
      else process.env.USER = savedUser;
    }
  });

  it("case 21 — an empty `--by` and a whitespace-only `--by` are both refused as blank", () => {
    const empty = parseResolveArgs(["audit_abc123", "--by", ""]);
    expect(empty.ok).toBe(false);
    if (empty.ok) throw new Error("unreachable");
    expect(empty.error).toContain("--by");

    const spaces = parseResolveArgs(["audit_abc123", "--by", "   "]);
    expect(spaces.ok).toBe(false);
    if (spaces.ok) throw new Error("unreachable");
    expect(spaces.error).toContain("--by");
  });

  it("case 22 — the `--by=<value>` form parses, and a flag placed BEFORE the positional never eats the id", () => {
    const equalsForm = parseResolveArgs(["audit_abc123", "--by=Jane Ops"]);
    expect(equalsForm.ok).toBe(true);
    if (!equalsForm.ok) throw new Error("unreachable");
    expect(equalsForm.id).toBe("audit_abc123");
    expect(equalsForm.by).toBe("Jane Ops");

    // Flags FIRST, positionals second. A naive `argv[0]` would make the id `--by` here, and a naive
    // "first non-flag token" would make it `Jane Ops` — an operator's own name becoming the row they
    // discharge is a money-path write against an arbitrary id.
    const flagFirst = parseResolveArgs(["--by", "Jane Ops", "audit_abc123"]);
    expect(flagFirst.ok).toBe(true);
    if (!flagFirst.ok) throw new Error("unreachable");
    expect(flagFirst.id).toBe("audit_abc123");
    expect(flagFirst.by).toBe("Jane Ops");
  });

  it("case 23 — a missing id is refused with the EXISTING wording, even when `--by` is present", () => {
    const parsed = parseResolveArgs(["--by", "Jane Ops"]);

    expect(parsed.ok).toBe(false);
    if (parsed.ok) throw new Error("unreachable");
    // Byte-identical to what the CLI printed before this task — an operator who has seen this message
    // before must not have to re-learn it because the flag parsing moved modules.
    expect(parsed.error).toContain("resolve needs an audit id.");
  });
});
