# Plan 20 first full attempt — retained, not accepted

Revision `4d31a45ed4748d9f9e6efe3f1b4e7d38f59530c1`, manifest
`4236a0980aebd6dd98f0acbe7252623b6c3875677799754e9b0035335a9c1c5c`.
Exact archive, Node 24.19.0 with successful native preflight, six sequential
commands. Every pre/post source guard passed. Report:
`playwright/.cache/phase27-08/full-4d31a45e-d72a7808-3a97-4da7-b37c-dbc0e1bb06a3/gates/report.json`.

| Gate | Actual result |
|---|---|
| Unit | Exit1; 3357 passed, 2 failed, 5 existing skips; one failing file |
| Design | Exit0; 1510 passed, 6 existing skips |
| Types | Exit0; no diagnostics |
| Lint | Exit0; zero errors, 33 existing warnings |
| Build | Exit1; Google Fonts connection failures for Geist and Geist Mono |
| Browser | Exit1 before tests; successful-build precondition refused server startup |

The two failures in `tests/auth/hosting-intent.test.tsx` were a transition-readiness
race and subsequent queued-mock leakage. The repair waits for error plus enabled
retry control together and resets only the activation mock between tests. Existing
deadlines and product behavior are preserved. Focused verification passes9/9.
The font fetch failed under restricted networking; rerun with the build's normal
font network access. No font fallback/mock or missing-browser result is accepted.

Raw report, six records/logs, pre/post source snapshots, initial source and native
preflight are retained. Incomplete browser output must be preserved as a hashed
failed-attempt artifact rather than inventing terminal test totals. A future
candidate replacement binds those artifacts and the older full gate history;
all six fresh complete passes are still required.

No Preview deployment or alias assignment occurred. Previous accepted local
candidate remains596b4746; this attempt cannot replace it. Production quota
migration, Contact enablement, original08/09, all requirements and all HOLDs remain.
