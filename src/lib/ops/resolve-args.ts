// Argv parsing for the operator CLI's `resolve` verb — and, specifically, the rule that `--by` is
// REQUIRED (D-FH6-03, D-FH6-08).
//
// WHY THIS IS A MODULE AND NOT TWENTY LINES INSIDE `scripts/ops-alerts.ts`. That script cannot be imported
// by a test: it opens a postgres.js client and calls `main()` at module load, so importing it would connect
// to a database and run a command as a side effect of test collection. A policy that nothing can execute in
// isolation is a policy nothing can MUTATE in isolation either — and the `--by` requirement is exactly the
// kind of rule that rots into a default if nobody can measure it. So it lives here, pure and DB-free:
// no `@/lib/db`, no `postgres`, no I/O of any kind. Pinned by tests/ops/resolve-args.test.ts cases 19-23.
//
// `parseDays` is deliberately NOT moved here. It is not this task's subject, moving it is scope creep, and
// its behaviour is already documented in runbook §6a.
//
// THERE IS NO DEFAULT, SILENT OR OTHERWISE — and the absences are the design, not an oversight. Not the OS
// username, not `USER`, not `USERNAME`, not `OPS_OPERATOR`, not a config file. This module does not read
// `process.env` at ALL, which is the structural version of the rule rather than a promise about it.
//
//     A name a human deliberately typed is a stronger audit record than one the machine filled in, and a
//     silent default would make every discharge look attributed while attributing nothing.
//
// That second clause is the one that matters. A fallback would not leave the column empty — it would fill
// every row with something that LOOKS like an answer, so a reviewer in a dispute would find a name, believe
// it, and be wrong. An honest `unrecorded` is worth more than a confident guess. Measured by case 20, which
// plants `ghost-default` in both env vars and asserts it reaches the result nowhere; mutation M2b installs
// the fallback and must redden exactly that case.
//
// AND THE CAVEAT TRAVELS WITH THE VALUE: even a name that WAS typed is an ASSERTED identity, not an
// authenticated one. The CLI has no session, so anyone with `DATABASE_URL` can type anything. This module's
// job is to make sure a human chose the string — it cannot, and does not claim to, verify who that human is.

/**
 * The parsed `resolve` invocation, or the reason it was refused.
 *
 * A discriminated union rather than a nullable result plus a side-channel error: the caller must narrow
 * before it can reach `id`, so "refused" cannot be accidentally treated as "parsed with empty fields" —
 * which on this verb would mean a money-path write against an empty id.
 */
export type ParsedResolveArgs =
  | { ok: true; id: string; by: string }
  | { ok: false; error: string };

/** The `--by` flag's own help text, kept beside the rule it documents so the two cannot drift apart. */
export const BY_FLAG_HELP =
  `--by "<your name>" is REQUIRED and has no default — not your OS username, not any environment ` +
  `variable. A name you type is the record; a name the machine guesses is not. Note what it is worth: ` +
  `the CLI has no session, so this is an identity that is asserted, not authenticated — it records who ` +
  `CLAIMS to have discharged the row, and it is not proof of identity on its own.`;

/** Refusal wording, kept distinct on purpose — see `parseResolveArgs`. */
const ERR_NO_ID = "resolve needs an audit id.";
const ERR_NO_BY =
  `resolve needs --by "<your name>". There is deliberately no default: a name you type is the ` +
  `record, a name the machine fills in attributes nothing while making every discharge look attributed. ` +
  `(It is an identity that is asserted, not authenticated — the CLI has no session.)`;
const ERR_BLANK_BY = 'resolve needs a non-empty --by "<your name>" — a blank name records nothing.';

/**
 * Parse the arguments that follow the `resolve` verb.
 *
 * FLAGS ARE CONSUMED FIRST AND POSITIONALS SECOND, which is load-bearing rather than stylistic: with
 * positionals taken first, `--by Jane audit_x` would make the audit id `--by` (or, with a naive
 * "first non-flag token" rule, `Jane`) and the CLI would attempt a money-path write against whatever that
 * happened to name. Both flag forms are accepted — `--by <value>` and `--by=<value>` — because an operator
 * under pressure should not have to remember which one this tool wants.
 *
 * THREE DISTINCT REFUSALS, not one. Collapsing them would make a typo (no id), a policy violation (no
 * `--by`) and a slip (blank `--by`) print the same sentence, so the operator would have to guess which
 * mistake they made. The missing-id wording is byte-identical to what the CLI printed before this module
 * existed — an operator who has seen it before must not re-learn it because the parsing moved files.
 *
 * @param argv the tokens AFTER the verb, i.e. `process.argv.slice(3)`.
 */
export function parseResolveArgs(argv: string[]): ParsedResolveArgs {
  const positionals: string[] = [];
  let by: string | undefined;
  let sawByFlag = false;

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--by") {
      sawByFlag = true;
      // The NEXT token is the value, even if it is empty or whitespace — consuming it unconditionally is
      // what stops a blank name from silently falling through and being read as the positional id.
      by = argv[i + 1];
      i++;
      continue;
    }
    if (token.startsWith("--by=")) {
      sawByFlag = true;
      by = token.slice("--by=".length);
      continue;
    }
    positionals.push(token);
  }

  const id = positionals[0];
  if (!id) return { ok: false, error: ERR_NO_ID };

  if (!sawByFlag || by === undefined) return { ok: false, error: ERR_NO_BY };

  // Trimmed, and blank refused: an untrimmed or whitespace-only name stores a value that renders as an
  // empty cell — attributed in the database, unattributed on the screen, which is precisely the dishonest
  // render D-FH6-07 forbids.
  const trimmed = by.trim();
  if (trimmed.length === 0) return { ok: false, error: ERR_BLANK_BY };

  return { ok: true, id, by: trimmed };
}
