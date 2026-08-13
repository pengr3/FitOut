# Deferred Items — Phase 11

Out-of-scope discoveries logged during execution. Not fixed by the plan that found them.

- **[11-02] `.planning/STATE.md` has 2 unbalanced `<details>` tags.** At HEAD (`7aed77e`) the file holds 16 `<details>` openers and 14 `</details>` closers; plan 11-02 preserved the delta (17/15) rather than closing it. Pre-existing, unrelated to this plan, and cosmetic — GitHub renders the trailing blocks as nested rather than sibling. Fix during the next STATE prune.
- **[11-02] The phase-wide GATE-06 check command is wrong.** `ls drizzle/ | tail -1` returns `meta` (the `meta/` directory sorts last), not `0025_audit_resolved_by.sql`, so read literally the criterion is red on a healthy tree. Use `ls drizzle/*.sql | tail -1`. Appears in the `<verification>` block of multiple Phase 11 plans.
