---
phase: 27-app-subdomain-marketing-website
plan: "14"
status: complete
subsystem: search-ui
requires: ["27-13"]
provides: ["anchored single-tree responsive search", "functional anonymous search group", "hydration-safe controls", "source-bound responsive and handoff proof"]
requirements-completed: []
requirements-affected: ["DOMAIN-01", "MKT-01", "MKT-02"]
actuals: {tasks: 2, code_commits: 6}
completed: 2026-10-09
---

# Plan 27-14 complete within its search scope

Search uses one ResponsiveDialog and one mounted input tree. Additive content/trigger
refs, presentation classes and close-control choice preserve other dialog adopters.
CSS owns the breakpoint; geometry-only measurement keeps Phase24 D-09 desktop
trigger anchoring. Mobile remains full-screen. Private viewport hook and obsolete
mobile/desktop selector aliases are removed without widening either census.
The legitimate existing heading/focus-return behavior is an explicit, guarded
adopter exception. Escape, Cancel, input-node identity across resize, long URL
answers, browser Back and overflow are tested at 320/375/768/1440px.

The committed progressive controls receive a real Search spaces group and bounded
long-text handling. The separate dirty independent-fields search redesign is not
promoted. Browser diagnosis observed hasReactProps=false/closed/empty progress
at the ignored click. Existing login/marketing hydration guard now keeps real
search buttons disabled until client handlers attach. Native POST and disabled
credentials remain asserted; static production signup instead has no credential
or submit controls under the installed Next useSearchParams/Suspense contract.
JS-enabled signup/return cases still require the actual form. This is no real
login/OAuth/provider proof.

## Actual verification and limits

Shared-tree design66 and overlay unit1 pass. Fresh c5353509 export: unit37,
typecheck exit0, canonical Next build exit0 (46 static pages), design96 pass.
Built production browser: final owned marketing/search17 and existing one-tree
search/host6 pass with zero skips, clean pre/post source and stable manifests.
Browser revision is 73991abb; build is c5353509. Only two owned e2e files changed
between them. test-only-refresh2.json proves every other scoped file byte is
identical; this focused proof is not six full same-revision acceptance gates.
The retained explicit production harness config extends the guarded base, uses
existing installed CLI/dependencies, inert PayMongo boot marker, disabled mail,
Contact off, owned listener and no snapshot writes. No real provider call was driven.

All failed attempts remain. The first dev broad run was stopped after705 seconds
of repeated failures by its verified own child PID; buffered log and source records
were retained, terminal totals are unavailable and acceptance is refused. Dev also
changed generated next-env and Chromium produced an untracked debug.log. No source
guard was loosened. The bounded network-enabled diagnostic is honestly augmented.
Two harness loader/cwd failures precede actual production tests. An initial 5-fail
browser run measured entrance animation mid-frame; resting bounds and original
five-second assertions now poll without sleeps or wider timeout. No-JS search counts
the actual hidden streamed SSR control. Final focused8, then owned17+6, pass.

The complete broad production run initially reports5 failed/28 passed/2 skipped/
4 did not run. PAYMONGO_SECRET_KEY absence caused listing500s; an inert boot marker
restores those cases. Full unchanged one-tree then reports1 failed/19 passed/2
preexisting declared unreachable skips. P27-G17 is the remaining global Menu
count (two controls at320px); no assertion or source label is changed. This is a
separately owned baseline observation under the user's keep-scope/log-gaps request.
The complete broad suite is not green. Its targeted existing search/host rows pass6.
Plan verification disposition is amended explicitly, not an assertion waiver.

G09/G15 have owned repair proof. G11/G16 causal runtime work, all six full gates,
external08/09 and all seven requirements remain pending. Contact and money/legal
HOLDs remain. Source/fixture changes outside scope are preserved unstaged.
Inline execution/review; no independent-agent assurance.

Code commits: 799856f3, 88db7ff4, 5ad7f5fa, e1b43556, f13ef92d, 73991abb.

## Retained proof references

```json
[
  {
    "path": "playwright/.cache/phase27-08/gap14-88db7ff4-ae1f3922-39ee-45b1-aac6-a41b8fb8ba13/gates/design-record.json",
    "sha256": "d461ac633391bbd9eac4e56e912b141a01a03c2dba93c0ce78f6ba7d41ac480d"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14-88db7ff4-ae1f3922-39ee-45b1-aac6-a41b8fb8ba13/gates/browser-record.json",
    "sha256": "7c157b6ca44706b855eb1044d461914f3c2525952d1e0ea7a73117a58caa3686"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14-network-diagnostic.json",
    "sha256": "22cdf02abe7ea2cf9093aaf91af93dffb3d74a49938f1d8c2d73dcfe0ac48fdd"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14-overlay-unit.json",
    "sha256": "0a5f40d31949194640ba65da4fb7ee9e7d7afa9c90a696245a123eb7fae94934"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/unit-record.json",
    "sha256": "eff26b06c35ab898236c112a7937b5cc0fee3aefefb0278f35051bfe9c2c0fc3"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/types-record.json",
    "sha256": "23d8d6d7d0e1d98bbef9ccbfd56ea070dec7a8bf8ec30d5ef30f46d841132a36"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/build-record.json",
    "sha256": "09b3a9dd71d6af351c4b2d0c9a72fbf6d2ded4a1b0f3921f586d8997036a96d1"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/design-record.json",
    "sha256": "84ea7c1741053ed1f3a3708ab1889e219f8fd3f512c81a06b87465fc6fa71ee2"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/gates/browser-record.json",
    "sha256": "e30f63ba08ecb3e266c34681d4eb0670e5a7154807b46aa2c9d4f40a64011f38"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-retry/browser-record.json",
    "sha256": "b89a323c35566d0cc3e346ff6f6c52bd7e904969d239a23c71f7a93b599ed44a"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-retry2/browser-record.json",
    "sha256": "9455f86bfd586db7871666c997fbdadce0276e56b446d9cde3326c32d84af5be"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-retry3/browser-record.json",
    "sha256": "c2007a8dbaca9f7ee073008a9997b3f36eb639d065f69398d02accad9284ba20"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-wide/browser-record.json",
    "sha256": "eb4d00b22a4d5c6942dd595bc847ffe9b7ae1dc9d1b22b329e56c0df22fe6ea0"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-wide-inert/browser-record.json",
    "sha256": "1dd874eeedaee659dc4af30f76dbf5ad0af5e5c2db7eb312395670695f4ba5a1"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-owned/browser-record.json",
    "sha256": "4d012974327265e38a3bf59a59da02596d6f5659ec38e9e1f677242322c3be61"
  },
  {
    "path": "playwright/.cache/phase27-08/gap14b-c5353509-08b8dacd-6ebb-464a-9cbd-3108b3fab153/browser-owned/one-tree-owned-record.json",
    "sha256": "134d9c551408587e84b67b577f34fd64553899b022a2097ade566a710c67ccc7"
  }
]
```

Self-check: all six code commits exist; final owned cases pass without skips;
source guards hold; product byte identity is recorded for test-only refreshes;
broad failures and historical records remain; no external mutation/phase acceptance.
