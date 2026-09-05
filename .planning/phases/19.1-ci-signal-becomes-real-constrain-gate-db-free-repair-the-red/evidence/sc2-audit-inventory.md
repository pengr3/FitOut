# SC2 — the axis-versus-property audit of `scripts/verify-workflows.mjs`

**Plan 19.1-06. Every anchoring and presence site in the checker, with a verdict.**

A site with no row in this table is a site nobody looked at. That distinction is the entire reason
this document exists: after three verification rounds, the thing that could not be recovered from the
code was *which predicates had already been examined and deliberately left alone*. Rounds 2, 3 and 4
each closed the mutation last measured, and each was defeated one token further out — not because the
fixes were wrong, but because nothing recorded the difference between "audited and correct" and "not
yet read".

Line references are against the checker **as repaired by this plan** (post-`971bd30`, plus Task 3's
two additional repairs). Every transcript cited is in `guards-06-pre-fix.txt` and
`guards-06-post-fix.txt` in this directory, under the heading named in the row.

## The verdict vocabulary — exactly three values, one per row

| verdict | what it commits the author to |
|---|---|
| **REPAIRED** | The vector was reproduced GREEN on the tracked file before the change and RED after, with an md5 pair and a clean-revert proof, and a standing case now remembers it. |
| **CORRECT AS IS** | The site was examined and left alone, with the **reason it is correct** written out — the *property*, never the mere assertion that it is fine. A row that says only "looks fine" is an unvisited row wearing a verdict. |
| **CARRIED** | Still open. The row names what remains open, why it was not closed here, and what mitigates it today. A carry is a decision; a silent omission is not. |

## The asymmetry every row below is judged against

> Substring matching over a `run:` body is **safe** when it makes a check MORE likely to fire — a
> deny-direction count that must be zero, where over-matching produces a false red and therefore
> fails closed. It is **dangerous** when it is used to LOCATE the subject of a positive assertion,
> because a `run:` body is free text and locating by it hands the choice of subject to whoever wrote
> that text.

Both directions appear in this file, deliberately. Nine rows below are the safe direction and are
**CORRECT AS IS with that reason stated**, so a later audit does not "fix" them into locators and
break them.

---

## The inventory

### Rows 1–10 — the sites 19.1-RESEARCH.md inventoried

| # | site | current shape | verdict | evidence |
|---|---|---|---|---|
| 1 | `:754` the `ci.yml` trigger check | Was key membership only: `ciTriggers.includes("push") && ciTriggers.includes("pull_request")`. Now additionally: the `pull_request` filter must be `null`/absent, and the `push` filter must REACH both branches (unfiltered reaches all; a filter must name both and carry no other key). | **REPAIRED** (CR-01) | pre: VECTORS CR-01(a),(b),(c) — three edits, none deleting a key, each exit 0 with all 55 holding. post: all three RED on this invariant. Cases 25, 26, 27. |
| 2 | `:402` `triggersOf` | Handled the scalar and mapping spellings; `Object.keys` over an array returned the array INDICES, so the documented sequence form `on: [push, pull_request]` yielded `["0","1"]`. Now returns names for all three spellings, with `triggerFilterOf` (`:418`) normalising the filter across them. | **REPAIRED** (WR-02) | pre: VECTOR WR-02 — a CORRECT file, exit 1, naming this invariant. post: exit 0 at the unchanged total. Case 28, a GREEN control. |
| 3 | `:1225` Invariant A's refusal-step anchor | `stepNamed(e2e, CI_E2E_MAIL_STEP)` — exact equality over the parsed `name:` scalar. | **CORRECT AS IS** | It is **the model** — the shape 19.1-PATTERNS.md §F names as the only one permitted for a new positive assertion, and the shape every repair in this plan converges on. The property: `name:` is a label a reviewer reads in the diff and an attacker must forge exactly; `run:` is free text. This plan additionally made it the *only* place that decides which step the refusal step is (see row 4). |
| 4 | `:1355` Invariant C's ordering index | Located the SAME step a SECOND time, by `findIndex(s => run.includes(<script path>))`. Now `e2eSteps.indexOf(e2eMailStep)` — the position of the object row 3 already anchored — plus a new `e2ePrecede.length > 0` conjunct. | **REPAIRED** (CR-02) | pre: VECTOR CR-02-DECOY-ONLY (exit 0; the decoy captured the anchor and was therefore sliced out of its own preceding set) and VECTOR CR-02 (exit 0 with the real refusal step running *after* the whole suite). Also VECTOR VACUOUS-PRECEDE, found by reading: `[].every(…)` is TRUE, so the refusal step promoted to FIRST satisfied "only these three may precede" by having nothing precede it — before `actions/checkout`, so the script is not even on disk. post: all three RED. Cases 29, 31, 34. |
| 5 | `:1199` the `gate-e2e` ordering indices (`iE2eSeed`, `iE2ePlay`, `iE2eMigrate`) | Were `e2eRuns.findIndex(r => r.includes("db:seed" \| "db:migrate" \| "playwright test"))`. Now `stepIndexNamed(e2e, …)` for each, all on the FULL-step scale. | **REPAIRED** — and **the vector REPRODUCED**, which is the point of this row | 19.1-RESEARCH.md flagged this row **NOT YET REPRODUCED** and the plan required reproduction before a decision. pre: VECTOR ROW-5 — a decoy naming `db:seed` after the refusal step, with the real seed moved after the suite: exit 0, all 55 holding, with this invariant printed `ok`. The functional suite would have run against an empty catalogue, and five of its specs say so in their own messages. post: RED. Case 32. |
| 6 | `:1675` `runsVisualProject` and `:1700` the `gate-visual` ordering indices | Were a job-wide existential over run bodies, and three `visualRuns.findIndex(…)`. Now both anchored on the step named `Playwright — visual regression (GATE-01)` and its siblings. | **REPAIRED** — **both halves reproduced**, and the project half is the worst single result in this plan | pre: VECTOR VISUAL-PROJECT — a decoy naming `--project=visual` with the real invocation switched to `--project=chromium`: exit 0, **ALL 55 REPORTED HOLDING**, with GATE-01's comparison not running at all and 52 committed baselines uncompared. VECTOR VISUAL-ORDER — the ordering invariant stayed GREEN; the only red came from an unrelated `cross` check that happened to pick the same decoy, which is an accident, not coverage. post: both RED on the invariants that NAME the properties. Case 33. |
| 7 | `:990` `buildJobs` — T-11-DBFREE's locator | `ciRunsByJob.filter(([, rs]) => rs.some(r => r.includes("npm run build")))`, across all jobs. **Unchanged**, with a 20-line rationale block added at the site. | **CARRIED** | **What is open:** it is literally the CR-02 idiom, and `19.1-PATTERNS.md` §F forbids that idiom for positive assertions. Logged as **D-19.1-C** by plan 19.1-05. **Why it is not closed here:** its DANGEROUS DIRECTION is the opposite of every other row. The predicate's property is "the job that builds declares no services"; OVER-matching adds a *phantom* job to `buildJobs`, and if that phantom declares services the check goes RED. A false red on a safety property fails closed, and a spurious extra entry can never make this check pass. Under-matching would be the danger, and a containment test cannot under-match. Re-anchoring it by job key would also defeat its own stated purpose — the heading says it is spelled by what the job DOES precisely so it survives a rename. **What mitigates it today:** plan 19.1-05's build-step invariant, which owns the claim that `gate-db-free` runs the build, anchored by exact `name:` with a trimmed exact-equality invocation. Before that invariant existed, deleting the build step went red HERE by accident; `npm run build --decoy` and `if: false` on that step both left this predicate GREEN (19.1-05 MUTATIONS 5 and 6). The site's new comment states in full that this predicate is **not** coverage of the build step, so the accident cannot be mistaken for an invariant again. |
| 8 | `:774` (and `:547`) the concurrency-group test | `ciGroup.includes("github.event_name")` over the parsed `concurrency.group` VALUE. | **CORRECT AS IS** | The property: the subject is a **single string value read at a fixed path**, not an element selected out of a collection. There is nothing to impersonate — no second `concurrency.group` can exist in a YAML mapping — so containment here asks "does this one value contain the required term", which is exactly the claim. 11-04 measured the *whole-file* substring version green because the word survived in a comment; this version reads the parse, where comments do not exist. |
| 9 | `:1362` the `E2E_PRECEDE_USES_OK` prefix test | `E2E_PRECEDE_USES_OK.some(u => String(s?.uses ?? "").startsWith(`${u}@`))`. | **CORRECT AS IS** | The property: an action reference is `owner/repo@ref`, so a prefix ending in `@` matches the whole `owner/repo` segment and nothing longer. The trailing `@` is load-bearing and present — without it, `actions/checkout-and-exfiltrate@v1` would be admitted. It is also an **allow-list**, so an action nobody has heard of is denied by default. Additionally strengthened this plan, one level up: the list it quantifies over may no longer be empty (row 4). |
| 10 | `:855` the mail environment-key scan | Walks workflow `env`, job `env` and step `env`. Does **not** walk `container.env` or `services.*.env`. | **CARRIED** | **What is open:** finding IN-04. A provider-named key placed in a job's `container.env` or in a service's `env` map is not seen by this scan, and `container.env` is precisely the hole `ci.yml`'s own header once named and then leaned on the (inert) refusal step to cover. **Why it is not closed here:** it is a scan-coverage question rather than an anchoring one — it is on this list because it is a *presence* site, not because it locates a subject by substring — and closing it means extending the walk to two more parse paths in a section this plan otherwise does not touch. It has no reproduction in this plan's evidence and would need its own watched-red pair. **What mitigates it today:** the RAW-TEXT scan in the `cross` section (`:1866`), which asserts the provider token appears **zero times anywhere under `.github/workflows/`** — over raw bytes, so it sees `container.env`, `services.*.env`, and a well-meant comment alike. That is strictly broader than the parse scan for this token; what the parse scan adds is a *diagnosable location*, and it is that diagnosis, not the detection, that is incomplete. |

### Rows 11–12 — sites the research inventory did not list, found by scanning for the shape

The audit was carried out as a scan of the whole file for the *shape* — every `.includes(`, `.some(`,
`.find(`, `.findIndex(`, `.startsWith(` — and not as a walk of the ten rows above. These two are what
that difference bought. Both are in sections the plan's task text never mentions.

| # | site | current shape | verdict | evidence |
|---|---|---|---|---|
| 11 | `:631` the baseline staging tripwire | Was `runs.some(r => r.includes('git add -- "*-visual-linux.png"'))` — an existential over every run body in the regeneration job. Now anchored on the step named `Stage the regenerated baselines`, with the containment asked of that step's own run body. | **REPAIRED** | pre: VECTOR STAGE-GLOB — a decoy block scalar merely PRINTING the staging command, with the real staging step changed to a glob matching nothing: exit 0, all 55 holding. The regeneration job would have staged nothing, committed nothing and reported success — and noticing what that commit contains is this tripwire's entire purpose. post: RED. Case 35. |
| 12 | `:1810`, `:1820` the `cross` byte-identity comparisons | Was `pick = (runs, needle) => runs.find(r => r.includes(needle))`, applied to BOTH jobs. Now both sides anchored by exact `name:`, and the seed comparison additionally asserts the shared command NAMES the seed script — a fact it previously inferred from the locator it no longer uses. | **REPAIRED** — the nastiest vector in the plan | A decoy in ONE job makes the two picks differ and goes red, which is exactly why this site looked safe on inspection. IDENTICAL decoys in BOTH jobs make the picks identical *to each other* — they are the same `echo` — and the byte-identity comparison then holds between two strings that are neither job's real command. pre: VECTOR CROSS-PICK — exit 0, all 55 holding, with one job migrating `--baselines-only` and the other `--ci-only`. The machine that COMPARES would migrate differently from the machine that SHOT: exactly what D-27 exists to prevent, and what run 32216145319 already cost once, reported green by the invariant whose printed name is that guarantee. post: RED. Case 36. |

### Rows 13–24 — the remaining anchoring and presence sites, all examined, all left alone

| # | site | current shape | verdict | the reason, as a property |
|---|---|---|---|---|
| 13 | `:797` the `ci` snapshot-update counter | `rs.filter(r => r.includes(SNAPSHOT_UPDATE_FLAG))`, asserted `=== 0` | **CORRECT AS IS** | **The SAFE direction, and its over-matching IS the property.** A false positive here — a comment-like `echo` mentioning the flag — produces a RED, i.e. it fails closed, and a human then reads one line of diff. Under-matching is what would be catastrophic (a `ci.yml` run command that mints baselines), and a containment test cannot under-match. **A future audit must not convert this into a locator**: there is no subject to locate, only a population to count, and narrowing it to "the step named X" would create exactly the blind spot the counter exists to remove. |
| 14 | `:589` the `baselines` snapshot-update counter | `runs.filter(r => r.includes(SNAPSHOT_UPDATE_FLAG))`, asserted `=== 1` | **CORRECT AS IS** | Same direction, with the count pinned rather than zeroed. Over-matching pushes the count to 2 and reddens; under-matching is impossible. The *exactly one* form is stronger than a presence test here because this is the write path, where an ADDED occurrence is the danger. |
| 15 | `:1850` the `cross` write-path carrier census | Counts carriers across **every** file in `.github/workflows/`, asserts exactly one and that it is in `baselines.yml` | **CORRECT AS IS** | Same direction again, and deliberately quantified over the directory rather than the two files the checker knows by name — a third workflow added later with the flag in it is precisely the edit this must catch. Narrowing its subject would be the defeat. |
| 16 | `:1835` `buildsBeforePlaywright` | `findIndex` over run bodies for `npm run build` and `playwright test`, used as `!buildsBeforePlaywright(…)` | **CORRECT AS IS** | **Deny direction.** The assertion is that NEITHER visual job builds before its Playwright step, so a phantom index from an `echo` can only make the predicate *think* a build happened earlier — which reddens. A decoy cannot hide a real build here, only invent one. Fails closed. |
| 17 | `:439` `secretHitsIn` | `typeof value === "string" && value.includes("secrets.")` over every reachable `env`/`run`/`with` VALUE | **CORRECT AS IS** | Deny direction over an exhaustively-walked value set. Over-matching (a literal string containing `secrets.`) reddens; there is no subject being selected. The walk, not the match, is where this predicate's strength lives, and the walk is total over the parsed tree. |
| 18 | `:1481`, `:1530` the checker-step and build-step anchors | `checkerSteps.find(s => String(s?.name ?? "") === CHECKER_STEP_NAME)` and the same for `BUILD_STEP_NAME` | **CORRECT AS IS** | The model shape (row 3), applied by plan 19.1-01 and 19.1-05 when those invariants were written. Both are additionally ANDed with a trimmed **exact-equality** comparison of the `run:` value and a key-surface allow-list, so neither presence nor containment stands alone. Case 16 is the standing GREEN control proving the anchor is not capturable by a decoy. |
| 19 | `:942` the service-label match in the addressing rule | `services.find(([label]) => label === host)` | **CORRECT AS IS** | Exact equality over a YAML mapping KEY. Mapping keys are unique by construction, so there is nothing to impersonate — this is the same class as row 8, one container over. |
| 20 | `:785` (and `:595`) the third-party `uses:` filter | `filter(u => !u.startsWith("actions/"))`, asserted empty | **CORRECT AS IS** | Deny direction, and an allow-list in disguise: everything not first-party is collected and the collection must be empty. Over-matching would *shrink* the offender list, which is the one thing worth checking here — and it cannot, because the prefix is the narrower string. A `uses:` value that merely begins with `actions/` and is not the real org is an org-squatting question GitHub owns, not one a parse can answer. |
| 21 | `:901` the service-image test | `!image.startsWith("postgis/postgis:") \|\| /^postgis\/postgis:\d+$/.test(image)`, asserted empty | **CORRECT AS IS** | Deny direction over a specific value at a fixed path, with the bare-major case denied by an anchored regex. Not a locator: `serviceImages` is built by walking every job's `services` map exhaustively, so nothing selects a subject. |
| 22 | `:883` (and `:565`) the `--ipc=host` test | `String(j.container.options ?? "").includes("--ipc=host")` | **CORRECT AS IS** | Containment over a single value at a fixed path — row 8's class. `options` is a flag string and containment is the correct question to ask of one. The quantifier beside it (`containerJobs.length > 0`) is what stops it holding vacuously over zero containerized jobs, which is the failure this row would otherwise have. |
| 23 | `:1296` Invariant B's source-text conjuncts | `refusalSource.includes(MAIL_KEY_PREFIX_DECL.source)` and `!refusalSource.includes(MAIL_KEY_PREFIX)` | **CORRECT AS IS** | Raw-text containment over **one named file read from disk**, not a search for which file to read. The second conjunct is a deny (`holds no copy`) where over-matching fails closed. Together with `declMatches` they assert that the prefix is spelled once and read twice — a drift property, not a location property. |
| 24 | `:1265`–`:1268` Invariant A's `includes` conjuncts | `e2eMailRun.includes(MAIL_REFUSAL_SCRIPT)` and `!e2eMailRun.includes("${{")` | **CORRECT AS IS** | Both are asked of the run body of the step row 3 already anchored, and both are ANDed with `e2eMailRun.trim() === MAIL_REFUSAL_RUN`. Once that equality holds the string is fully determined, so neither containment can discriminate — they are documentation of intent rather than load-bearing conjuncts, and the site's own comment says exactly that (finding IN-01, which is why they are not counted separately). Containment over a subject already selected is never the defect this audit is about. |

**Counts.** 24 rows. **8 REPAIRED** (rows 1, 2, 4, 5, 6, 11, 12 — row 6 being two predicates repaired
together), **14 CORRECT AS IS**, **2 CARRIED** (rows 7 and 10).

---

## How this audit was carried out

**The property was written down before the fix, in every case.** For each row, the question asked was
not "does the reproduction from the last review still work" but "what does this predicate's own
printed name claim, and what is the full set of edits that falsify that claim while satisfying the
code". Rows 1 and 6 are what that difference bought: CR-01's fix sketch named one modifier, and the
property named two on one trigger and a different one on the other; RESEARCH.md's row 6 named the
ordering indices, and the project-detection predicate beside them turned out to be the worse of the
two. Row 12 exists only because the question was asked of a section nobody had listed.

**At least three distinct mutations were enumerated for each repaired property, and each has a
standing case.** The trigger property has three (a nothing-matching branch list, an
everything-matching path filter, a dropped default branch) plus a GREEN control for the spelling it
must not redden. The step-identity property has four (a decoy ahead, a decoy with the real step
moved, the real step moved alone, and the real step promoted to first) plus a GREEN control proving
the repair did not degenerate into "no step may mention the script". Where a single mutation was all
that could be constructed, the property was rewritten rather than shipped narrow — which is what
happened to the push trigger: "the branch list contains both names" admits exactly one correct file,
and "push reaches both branches" admits the two that are actually correct, so the second is the
property and the first was a description of today's file.

**And every repair was proved twice, the second time against the standing suite itself.** A hand
mutation on the tracked file, green before and red after with an md5 pair and a clean-revert proof;
and then — because a suite that is green over an unmutated tree measures nothing — each of the six
repaired conjuncts was **loosened by hand back to its pre-19.1-06 shape** and the suite re-run. Six
loosenings, six failures, one case each, with the checker still exiting 0 on the unmutated tree every
time so that each revert is known to be faithful. The first attempt at that measurement loosened all
four Task 2 conjuncts at once, left two indices on incompatible scales, reddened everything and
measured nothing; it is written up in `guards-06-post-fix.txt` rather than discarded, because *a
revert that does not reproduce the prior behaviour is not a revert* is the kind of thing that is only
learned once if it is written down.

**The pitfall this guards against, by name: FIXING THE AXIS THAT WAS MEASURED.** Rounds 2, 3 and 4 of
Phase 19 each closed the exact mutation the previous round had demonstrated, and each was defeated by
the next token out — a different spelling of the same key, a different key on the same step, a
different level of the same file. The defect was never any single predicate. It was the authoring
habit of writing a check from the reproduction instead of from the property in the check's own
printed name.

**Its warning sign, and it is cheap to look for: A CHECK WHOSE PRINTED NAME IS BROADER THAN ITS
CONJUNCT LIST.** If only one mutation violates the stated property, the property was written too
narrowly and the name is a claim the code does not make. Every red in this plan was diagnosed by
reading a FAIL line and asking whether the sentence on it was actually true of the file — which is
how row 6 was found (`runs the visual project BY NAME`, printed `ok`, against a job running a
different project) and how row 12 was found (`byte-identical`, printed `ok`, against two jobs running
different commands). The names were the evidence. They were also the bug.

---

*Plan: 19.1-06 · Phase: 19.1-ci-signal-becomes-real-constrain-gate-db-free-repair-the-red*
*Companion transcripts: `guards-06-pre-fix.txt`, `guards-06-post-fix.txt`*
