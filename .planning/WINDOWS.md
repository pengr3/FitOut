---
schema_version: 1
open_count: 6
waived_count: 0
fixed_count: 0
total_count: 6
last_updated: 2026-09-04T03:18:49.016Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 19 | deviation | src/components/listing/listing-card.tsx |  | Task 1 acceptance grep '>Unlist<' is unsatisfiable — the label is a multi-line JSX child at HEAD too; element left unchanged per UI-SPEC Surface Contract B | open |  | 2026-09-04T02:06:17.687Z |  |
| 2 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt |  | Task 3 fails_when 'contains failed' false-positives on the pre-existing NavDrawer hydration warning on WebServer stdout; capture kept verbatim, exit 0 / 3 passed | open |  | 2026-09-04T02:06:22.689Z |  |
| 3 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/archive-verification.19-04.txt |  | 19-04 Task 1 precondition literally UNMET: live .next/app-path-routes-manifest.json is gone and .next/dev was rewritten by 19-02/19-03; archive verified rather than re-taken, and the prod manifest mtime (Sep 3 15:57) is no longer independently verifiable | open |  | 2026-09-04T02:35:39.504Z |  |
| 4 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-RESEARCH.md |  | 19-RESEARCH 5.1 claims 'eleven other untouched drafts owned by other accounts'; measured at execution time it is 49 across 49 distinct hosts, pre-existing (earliest 2026-08-29), none from this phase | open |  | 2026-09-04T02:35:40.065Z |  |
| 5 | 19 | todo | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/orphan-drafts-delete-result.txt |  | OPEN PM question, unanswered: D-01's window and host id are LOCAL facts, so a production database may hold orphan drafts this phase does not touch; if a deployed environment exists the scope must be re-derived there, not copied | open |  | 2026-09-04T02:35:40.684Z |  |
| 6 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-prod.txt |  | 19-05 Task 2: under a production build the /ops 404 body is NOT byte-identical to the root not-found (25970 vs 29644 bytes). Status control held (404 in both matrices) and no ops-identifying string leaks; /ops renders LESS shared chrome. Pre-existing (files last changed in 18-12 and 11-14), deferred not fixed — belongs to whoever owns D-219. | open |  | 2026-09-04T03:18:49.016Z |  |

````json
[
  {
    "id": 1,
    "kind": "deviation",
    "phase": "19",
    "file": "src/components/listing/listing-card.tsx",
    "line": null,
    "description": "Task 1 acceptance grep '>Unlist<' is unsatisfiable — the label is a multi-line JSX child at HEAD too; element left unchanged per UI-SPEC Surface Contract B",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:06:17.687Z",
    "resolved_at": null
  },
  {
    "id": 2,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt",
    "line": null,
    "description": "Task 3 fails_when 'contains failed' false-positives on the pre-existing NavDrawer hydration warning on WebServer stdout; capture kept verbatim, exit 0 / 3 passed",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:06:22.689Z",
    "resolved_at": null
  },
  {
    "id": 3,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/archive-verification.19-04.txt",
    "line": null,
    "description": "19-04 Task 1 precondition literally UNMET: live .next/app-path-routes-manifest.json is gone and .next/dev was rewritten by 19-02/19-03; archive verified rather than re-taken, and the prod manifest mtime (Sep 3 15:57) is no longer independently verifiable",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:35:39.504Z",
    "resolved_at": null
  },
  {
    "id": 4,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/19-RESEARCH.md",
    "line": null,
    "description": "19-RESEARCH 5.1 claims 'eleven other untouched drafts owned by other accounts'; measured at execution time it is 49 across 49 distinct hosts, pre-existing (earliest 2026-08-29), none from this phase",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:35:40.065Z",
    "resolved_at": null
  },
  {
    "id": 5,
    "kind": "todo",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/orphan-drafts-delete-result.txt",
    "line": null,
    "description": "OPEN PM question, unanswered: D-01's window and host id are LOCAL facts, so a production database may hold orphan drafts this phase does not touch; if a deployed environment exists the scope must be re-derived there, not copied",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T02:35:40.684Z",
    "resolved_at": null
  },
  {
    "id": 6,
    "kind": "deviation",
    "phase": "19",
    "file": ".planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/probe-prod.txt",
    "line": null,
    "description": "19-05 Task 2: under a production build the /ops 404 body is NOT byte-identical to the root not-found (25970 vs 29644 bytes). Status control held (404 in both matrices) and no ops-identifying string leaks; /ops renders LESS shared chrome. Pre-existing (files last changed in 18-12 and 11-14), deferred not fixed — belongs to whoever owns D-219.",
    "status": "open",
    "reason": "",
    "recorded_at": "2026-09-04T03:18:49.016Z",
    "resolved_at": null
  }
]
````
