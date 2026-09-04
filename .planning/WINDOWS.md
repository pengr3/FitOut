---
schema_version: 1
open_count: 2
waived_count: 0
fixed_count: 0
total_count: 2
last_updated: 2026-09-04T02:06:22.689Z
---

# Broken Windows Ledger

> Cross-phase defect register. With `workflow.windows_enforce` enabled, `/gsd-ship` blocks while `open_count > 0`.
> Waive with `gsd-tools windows waive <id> "<reason>"` (reason required).
> Mark fixed with `gsd-tools windows fixed <id>`.

| id | phase | kind | file | line | description | status | reason | recorded_at | resolved_at |
|----|-------|------|------|------|-------------|--------|--------|-------------|-------------|
| 1 | 19 | deviation | src/components/listing/listing-card.tsx |  | Task 1 acceptance grep '>Unlist<' is unsatisfiable — the label is a multi-line JSX child at HEAD too; element left unchanged per UI-SPEC Surface Contract B | open |  | 2026-09-04T02:06:17.687Z |  |
| 2 | 19 | deviation | .planning/phases/19-host-listing-surfaces-gates-that-actually-run/evidence/guards-post-fix.txt |  | Task 3 fails_when 'contains failed' false-positives on the pre-existing NavDrawer hydration warning on WebServer stdout; capture kept verbatim, exit 0 / 3 passed | open |  | 2026-09-04T02:06:22.689Z |  |

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
  }
]
````
