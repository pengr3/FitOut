---
type: quick
quick_id: 260825-61f
slug: wr05-harness-url-and-req-ticks
completed: 2026-08-25
source: .planning/phases/15-auth-profile-transactional-email/15-VERIFICATION.md (re-verification, status human_needed, gaps: []) — warnings W-2 (WR-05) and W-3
duration: ~20m
tasks: 2
outcome: WR-05 closed before the EMAIL-03 walk — the two `sendRequestDeclined` messages now carry an absolute CTA, and an unset BETTER_AUTH_URL refuses the run instead of degrading it. AUTHUI-01 and AUTHUI-03 ticked in both REQUIREMENTS.md representations.
commits:
  - 3494fba  fix(quick) — hydrate BETTER_AUTH_URL in the email preview harness (WR-05)
  - 2b15d59  docs(quick) — tick AUTHUI-01 and AUTHUI-03 complete (W-3)
files_created:
  - .planning/quick/20260825-wr05-harness-url-and-req-ticks/SUMMARY.md
files_modified:
  - scripts/send-email-previews.ts
  - .planning/REQUIREMENTS.md
  - .planning/STATE.md   (Quick Tasks Completed row only)
files_untouched_by_design:
  - src/lib/email.ts          (EMAIL-01's guarantee — `git diff --exit-code` exits 0)
  - .planning/ROADMAP.md      (quick tasks live in STATE.md; `15-05` stays `[ ]`)
  - tests/design/auth-contrast.test.ts  (W-1 — a PM scope decision, out of scope here)
  - .planning/phases/15-auth-profile-transactional-email/15-UAT-EMAIL.md
decisions:
  - The loader was HOISTED above the `if (live)` branch rather than duplicated into both arms — one call site cannot drift from the other
  - The guard refuses on BOTH paths, not just `--send` — a preview that renders a different link than the send would is not a preview
  - Fixed in the harness ONLY. The review's WR-05 also proposed dropping the CTA in `src/lib/email.ts` when APP_URL is empty; that half is product surface and is deliberately not taken here
  - AUTHUI-02 stays Pending against W-3's literal wording — its second clause is CROP-03's, in Phase 16
---

# Close WR-05 before the EMAIL-03 walk, and tick the two closed AUTHUI requirements — Summary

The preview harness hydrated `RESEND_API_KEY` and `EMAIL_FROM` from `.env.local` and nothing else, so
`src/lib/email.ts`'s `APP_URL` resolved to the empty string and the one CTA with no caller-supplied
link composed the bare href `"/"`. Two of the 23 messages queued for the PM's EMAIL-03 walk carried
it. Both now render `http://localhost:3000/`, and a run without `BETTER_AUTH_URL` refuses with a
message that names the consequence instead of shipping the dead link quietly. The two Phase-15
requirements the re-verification closed but deliberately left unticked are now Complete in both
places REQUIREMENTS.md records them.

---

## Task 1 — WR-05: the harness's own environment was the defect

**Commit:** `3494fba` · **File:** `scripts/send-email-previews.ts` (+39 / −1)

### What changed

Three edits, all in the harness:

1. **`BETTER_AUTH_URL` added to the allow-list.** `loadFromEnvLocal(["RESEND_API_KEY", "EMAIL_FROM",
   "BETTER_AUTH_URL"])`.
2. **The loader was hoisted, not duplicated.** It was called from *inside* the `if (live)` arm, so
   preview mode — the default, and the mode that produces the parts an operator reads — never loaded
   anything at all. The call now sits at **line 238, unconditionally, above the `if (live)` at line
   240 and its `else` at line 247**, so a single call site serves both paths and the two cannot drift
   apart. The `--send` arm keeps only its own `RESEND_API_KEY` refusal; the preview arm keeps only its
   `PREVIEW_MODE_KEY` install.
3. **A guard at line 265** that refuses, on either path, when `BETTER_AUTH_URL` is unset or empty.

`EMAIL_FROM` is absent from `.env.local` (checked — the file carries 16 keys and that is not one of
them), so hydrating it on the preview path too is a no-op and D-160's "the sender address falls back
to the sandbox literal" fact is unmoved.

### The watched red — the guard was made to fire

Applied the condition by commenting the key out of `.env.local` in the repo cwd (`sed -i
's/^BETTER_AUTH_URL=/# WATCHED-RED-TEMP BETTER_AUTH_URL=/'`), with the shell variable confirmed unset
beforehand so `.env.local` was the only source in play. Then:

```
$ npx tsx scripts/send-email-previews.ts owner@example.com --out=<tmp>/preview-red
exit: 1
```

Failure text, transcribed verbatim from stderr:

```

email:previews — BETTER_AUTH_URL is not set and was not found in .env.local. Without it src/lib/email.ts resolves APP_URL to the empty string and sendRequestDeclined composes href="/" — a dead link in an email, which has no document base URL to resolve it against. 2 of the 23 messages carry that CTA (declined / expired), and the EMAIL-03 walk would record them as a product defect when the fault is this harness. Uncomment or export BETTER_AUTH_URL (e.g. http://localhost:3000), then re-run.
```

(The standard `USAGE` block follows it, as it does for every other `fail()`.) The refusal is total,
not cosmetic: stdout was **empty**, and the `--out` directory **was never created** — `ls` on it
returned `No such file or directory`. Nothing was composed, so there is no half-built walk to mistake
for a real one.

**Restore, recorded.** `sed -i` reversed the comment; `.env.local` then hashed
`93db2888f22051fe408018f2f168efedd2c5a0063112e43f863fdab1f5b85849`, **byte-identical to the pre-red
hash** taken before the edit, and `cmp` against a pre-red backup returned clean. The backup (which
held real credentials) was deleted immediately after the comparison. `.env.local` is gitignored, so
this is verified by hash rather than by `git diff`.

### The green, after the restore

```
$ npx tsx scripts/send-email-previews.ts owner@example.com --out=<tmp>/preview-green2
  23/23 composed and captured, from 19 senders.
exit: 0
```

The rendered CTA in message 06 (`sendRequestDeclined` — request declined by the host):

```html
href="http://localhost:3000/"
```

Message 07 (the expired variant) renders the identical href. Their plain-text parts, which were the
half this phase newly made visible, now read:

```
Find another space: http://localhost:3000/
```

A scan of all 23 captured HTML parts for `href="/"` returns **none**.

### Acceptance criteria

| Criterion | Result |
|---|---|
| `grep -c "BETTER_AUTH_URL" scripts/send-email-previews.ts` >= 2 | **8** |
| `loadFromEnvLocal` invoked on both paths | Line **238**, hoisted above `if (live)` (240) / `else` (247) |
| Preview run composes 23/23 with an absolute declined CTA | 23/23; `href="http://localhost:3000/"` |
| Unset `BETTER_AUTH_URL` exits non-zero with the new message | exit **1**, transcribed above |
| `git diff --exit-code src/lib/email.ts` | exits **0** |
| `npx tsc --noEmit` | exits **0** |
| `npx eslint scripts/send-email-previews.ts` (not required, run anyway) | exits **0** |

---

## Task 2 — W-3: AUTHUI-01 and AUTHUI-03 ticked, in both places

**Commit:** `2b15d59` · **File:** `.planning/REQUIREMENTS.md` (+4 / −4)

`- [ ]` to `- [x]` on lines 86 and 88, and `Pending` to `Complete` on traceability rows 225 and 227.
Four edits for two requirements, which is the point: the prior verification pass checked the checkbox
list against the table and found no drift, and a change to one representation without the other is
precisely the drift it was looking for.

**Both representations were re-read after the edit and agree for all six Phase-15 requirements:**

| Requirement | Checkbox (86-94) | Table (225-230) |
|---|---|---|
| AUTHUI-01 | `- [x]` | Complete |
| AUTHUI-02 | `- [ ]` | Pending |
| AUTHUI-03 | `- [x]` | Complete |
| EMAIL-01 | `- [x]` | Complete |
| EMAIL-02 | `- [x]` | Complete |
| EMAIL-03 | `- [ ]` | Pending |

**AUTHUI-02 was deliberately left Pending**, which departs from W-3's literal wording ("tick
AUTHUI-01, AUTHUI-02 and AUTHUI-03"). The requirement is conjunctive — "The profile page carries the
design system, **and** avatar removal is possible" — and only the first clause is Phase 15's.
`REQUIREMENTS.md:274` and ROADMAP Phase-15 SC #2 both assign the removal affordance to CROP-03 in
Phase 16, and the verification's own coverage table records row 2b as "Correctly NOT attempted" and
scores the requirement as `AUTHUI-02[phase-15 scope]`. Ticking it would claim a clause nothing has
built. The plan called this out explicitly and it is followed.

No completion counters elsewhere in the file needed updating — the Coverage block counts requirements
per category, not per status.

---

## Deviations from plan

None. Both tasks executed as written, and the out-of-scope fence held: `src/lib/email.ts`,
`tests/design/auth-contrast.test.ts`, `15-UAT-EMAIL.md`, ROADMAP.md and every 15-12/13/14 test file
are untouched.

One judgement call worth naming rather than burying: the 15-REVIEW's WR-05 entry proposed a **two
part** fix, and the second part — `cta: APP_URL ? {...} : undefined` in `src/lib/email.ts`, so a
missing env yields a CTA-less message instead of a dead one — was **not** taken. It is product
surface, and this plan's fence forbids touching that file at all. The harness guard means the walk
cannot be affected either way; the product-side fallback remains as WR-05 originally described it,
open for the PM.

## Tooling note

Per the plan's known hazard, **no `gsd-sdk` state verb was run.** STATE.md's Quick Tasks Completed
table was edited by hand and diffed. ROADMAP.md was not opened for writing: `15-05` remains `[ ]`,
and `completed_plans: 105` / `total_plans: 105` are unchanged.

## Follow-ups left open (not regressions)

- **EMAIL-03** — the PM's real-client walk over the 23 previews. Now safe to run.
- **W-1** — `auth-contrast.test.ts`'s completeness census keys on token, role and state separately
  rather than on the rendered pair. A future-drift weakness, explicitly a PM scope decision.
- **WR-05, product half** — `src/lib/email.ts`'s `APP_URL ?? ""` fallback still composes `href="/"`
  if `BETTER_AUTH_URL` is ever missing in a real deployment. Out of scope here by the plan's fence.
- **CR-01** — `email.ts:54-55` swallows provider rejections. Pre-existing backlog item.

## Self-Check: PASSED

- Files present: `scripts/send-email-previews.ts`, `.planning/REQUIREMENTS.md`,
  `.planning/quick/20260825-wr05-harness-url-and-req-ticks/SUMMARY.md`, `.planning/STATE.md`
- Commits present in history: `3494fba`, `2b15d59`
- `git diff --exit-code src/lib/email.ts` exits **0**
- `git diff --exit-code .planning/ROADMAP.md` exits **0**; `ROADMAP.md:527` still reads
  `- [ ] 15-05-PLAN.md`
- `STATE.md` frontmatter unchanged: `total_plans: 105`, `completed_plans: 105`. The hand-edit added
  **exactly one line** — the Quick Tasks Completed row at line 1303 — confirmed by diffing against a
  pre-write copy.
