---
phase: 27-app-subdomain-marketing-website
plan: "15"
status: complete
subsystem: listing-policy-and-fixture-reconciliation
requires: ["27-14"]
provides: ["hourly-required day-optional publish policy", "corrected preserved boundary fixture", "explicit dirty-source ownership dispositions"]
requirements-completed: []
requirements-affected: ["DOMAIN-01", "MKT-02"]
actuals: {tasks: 3, code_commits: 2}
completed: 2026-10-09
---

# Plan 27-15 complete within the approved reconciliation scope

Implement direct-user D-21/D-27-G01: whole-space publishing requires a positive
integer hourly rate; day pricing is optional but, if supplied, stays a positive
integer rate. Host-facing copy asks for hourly pricing. The mode-specific gate,
price/cap/surcharge constraints, cancellation tier and open-capacity rules remain.
Only approved HEAD schema hunks are committed, preserving unrelated geolocation
and nullable draft edits. No frozen quote, cancellation, payout, deriveBookable or
checkout authorization change. Commits8355697f and c5353509. Shared tests36 pass;
fresh committed c5353509 also passes all36 (37 with overlay regression). Missing
hourly/day-only, missing both, invalid supplied day, legacy occupancy and unchanged
drop-in rules retain negative coverage. Initial obsolete assertion failure remains.

The untracked boundary fixture is corrected in place and passes5: existing Court
muted fill/brand ring/readable disabled state, semantic selected endpoint, unchanged
charged one-hour interval, no-day full-day control absence, unavailable-start
negative and final checkout boundary. It intentionally stays untracked because its
underlying SlotPicker/selection feature is also uncommitted and outside this task.
No algorithm is adopted. The ownership discovery and fixture hash are recorded in
27-15-FIXTURE-DISPOSITION.md; task2 action was amended explicitly. This is targeted
shared-tree fixture proof, not release of that feature or its standalone test.

The strict live-region detector remains byte-unchanged: clean committed census30
passes within design96; dirty shared census29pass/1fail reports21 expected versus22
reached. The extra untracked map authors no live region, but its dynamic reach,
keyboard/map behavior and wizard integration need the independent feature owner.
G07 remains a separately owned dirty-source observation. No count or exemption
is widened and no map/import change is silently adopted.

All three planned reconciliation tasks have actual proof/disposition. Only task1
is a committed product policy; task2 preserves the untracked feature/fixture;
task3 explicitly retains the dirty ownership gap. Inline execution/review.
All seven requirements, six full same-revision gates, streaming causality, original
08/09 and external/account acceptance remain pending. Contact stays off; payment,
payout and legal HOLDs remain. No real provider/mail action or phase completion.

## Retained proof references

```json
[
  {
    "path": "playwright/.cache/phase27-08/gap15-pricing.json",
    "sha256": "41a158e09298155d23ccdf64541382b220b7e3bbd5b05dc740cefaeac7914e50"
  },
  {
    "path": "playwright/.cache/phase27-08/gap15-pricing-green.json",
    "sha256": "4848e0c0aca83340a551e4e5ef6d1b157cad313c12e50e2e337c121cb833ae57"
  },
  {
    "path": "playwright/.cache/phase27-08/gap15-boundary.json",
    "sha256": "a894b5fdef8cbb21d966c95872c1217c90126010ee7ad1bf0607ca7a0be14166"
  },
  {
    "path": "playwright/.cache/phase27-08/gap15-live-dirty.json",
    "sha256": "12732ca31ad54348dc03494f3d4e6f8579fb6a30fedd85259381519f8fd791f3"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/unit-record.json",
    "sha256": "eff26b06c35ab898236c112a7937b5cc0fee3aefefb0278f35051bfe9c2c0fc3"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/design-record.json",
    "sha256": "84ea7c1741053ed1f3a3708ab1889e219f8fd3f512c81a06b87465fc6fa71ee2"
  }
]
```

Self-check: both code commits and clean schema proof exist; fixture hash matches
preserved file; no new fixture tracking, map promotion or detector modification;
failed and dirty observations remain visible with separate source contexts.
