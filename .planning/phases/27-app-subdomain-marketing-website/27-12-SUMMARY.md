---
phase: 27-app-subdomain-marketing-website
plan: "12"
status: complete
subsystem: verification
requires: ["27-11"]
provides: ["portable ops proof loading", "safe sequential exact-source gate runner"]
requirements-completed: []
requirements-affected: ["DOMAIN-02", "DOMAIN-03", "CONTACT-01"]
actuals: {tokens: 6062, tasks: 2, commits: 2}
key-files:
  created: ["scripts/run-phase27-gates.mjs", "tests/scripts/phase27-runner.test.mjs"]
  modified: ["scripts/verify-ops-cloak.mjs", "tests/auth/ops-cloak-probe.test.ts"]
completed: 2026-10-09
---

# Plan 27-12 complete

The shared checkout's 11 probe cases passed unchanged; the b91eeb31 nested export
reproduced all 11 failures. A computed file-URL import failed under the Vitest
loader; an explicit module-relative import loads the actual probe correctly.
The historical Partition reading IS already committed. Its JSON fence uses CRLF
in the Windows export, which the LF-only reader wrongly called missing. Normalize
Markdown separators before extracting the same real rows; do not change controls,
response bytes, status checks, hashes or historical observations. Add LF and CRLF
regressions against the genuine eight-row transcript. All 13 cases now pass in
both the shared checkout and the previously failing export augmented only with
the two repair files. The augmented export is diagnosis, not a fresh clean candidate.
Commit 452cc303008c884734b8a3d2d415cff72c2c1157.

No historical evidence was invented or promoted. The unrelated 26-line dirty
Phase20 service-setup follow-up remains unstaged. Earlier missing-transcript
attribution is corrected here; its original failed logs remain intact.

New runner CLI: node scripts/run-phase27-gates.mjs --revision HEAD --stage full.
It requires the current committed runner, archives exact source, copies installed
dependencies, uses an export-only index and canonical typegen, then runs unit,
design, types, lint, build and owned Chromium sequentially. Unique directories,
exclusive logs, a PID-bearing global lock, pre/post source captures, typed terminal
totals and log/source hashes retain each outcome. Source drift, unknown summaries,
extra skips and timeouts refuse acceptance. Only preexisting full-unit/design skip
ceilings (5/6) are permitted. Timed-out owned Windows process trees are stopped by
the exact spawned PID; no blanket teardown. Provider keys are not inherited, mail
and Contact stay disabled, Google/build placeholders are inert, local Inngest uses
dev mode and DB is guarded fitout_test. Credential-pattern filtering is explicit.
No report automatically writes acceptance or changes existing evidence history.
Runner/test commit: bfadac0d311f68e578ca56fef23f4d65e64fb220.

Twelve offline checks pass: actual serial children, overwrite and overlap refusal,
genuine failed exits, dirty/revision/source-drift guards, hung-child timeout, new-skip
rejection, split-output credential filtering, safe environments and CLI restrictions.
Scoped lint passes for probe and runner files. Existing full gates are not rerun yet.

## Retained logs

```json
[
  {
    "path": "playwright/.cache/phase27-08/gap12-probe-before.log",
    "sha256": "417c21b6dad365adf9ff02f67f7b70839d1153f687db7ea85544bd9536500373"
  },
  {
    "path": "playwright/.cache/phase27-08/gap12-export-probe-before.log",
    "sha256": "2037acf24777c5e4abaf35df6edb9416a4219932036a2445910e7bd4b1275dca"
  },
  {
    "path": "playwright/.cache/phase27-08/gap12-probe-loader.log",
    "sha256": "029b07cb7d25532234776891c6c6b05eac2167af6ae16906b010e4b856f264c1"
  },
  {
    "path": "playwright/.cache/phase27-08/gap12-export-probe-after.log",
    "sha256": "4428d07a439f757fbf1f1f35e487cb8b366592342db44c056a08d64b2ff98260"
  },
  {
    "path": "playwright/.cache/phase27-08/gap12-runner-node.log",
    "sha256": "bcd4f1374ad269698f5ee047625246ba0d5e7d28600faaf9cd317e17c34a0341"
  }
]
```

G13 is repaired with focused portability proof. Remaining design/UI/runtime gaps
and six full clean gates are pending. Original 08/09, every requirement, real account
proof, Contact and release HOLDs remain pending. Inline execution/review; no
independent agent is claimed. Self-check: both code commits and all four files exist;
probe13/13 and runner12/12 pass; old logs and unrelated dirty work remain preserved.
