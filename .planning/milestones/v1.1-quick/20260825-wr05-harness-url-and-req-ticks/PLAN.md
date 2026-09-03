---
quick_id: 260825-61f
slug: wr05-harness-url-and-req-ticks
date: 2026-08-25
type: quick
autonomous: true
files_modified:
  - scripts/send-email-previews.ts
  - .planning/REQUIREMENTS.md
source: .planning/phases/15-auth-profile-transactional-email/15-VERIFICATION.md (re-verification, status human_needed, gaps: [])
---

# Quick: close WR-05 before the EMAIL-03 walk, and tick the two closed AUTHUI requirements

Two follow-ups from the Phase 15 re-verification. Neither is a gap — the phase verified with
`gaps: []` — but the first would corrupt the one task the PM still has to do, and the second is
bookkeeping the re-verification pass explicitly deferred to itself.

## Task 1 — WR-05: the preview harness ships a dead CTA (verifier finding W-2)

**The defect.** `scripts/send-email-previews.ts` calls `loadFromEnvLocal(["RESEND_API_KEY",
"EMAIL_FROM"])`. `BETTER_AUTH_URL` is **not** on that allow-list, so it is never hydrated from
`.env.local` — even though it is present there. `src/lib/email.ts:120` reads
`const APP_URL = process.env.BETTER_AUTH_URL ?? ""`, so `APP_URL` is the empty string and
`email.ts:213`'s CTA renders as `href="/"`.

Two of the 23 preview messages carry that CTA (the two `requestDeclined` variants — expired and
unavailable). During the EMAIL-03 walk the operator would tap a dead link and record it against
the *product*, when it is an artefact of the *harness*. That is grading the wrong thing.

**A second half.** `loadFromEnvLocal` is called **only inside the `if (live)` branch**. Preview
mode never calls it at all, so preview output carries the same `href="/"`. Fix both paths, not
just the `--send` one.

<task>
  <files>scripts/send-email-previews.ts</files>

  <read_first>
    - `scripts/send-email-previews.ts` — the whole file, but especially `loadFromEnvLocal` and the
      `if (live) { … } else { … }` block that follows it. Note that the `else` branch sets
      `PREVIEW_MODE_KEY` and never loads from `.env.local`.
    - `src/lib/email.ts` lines 118-122 (the `APP_URL` constant and its `?? ""` fallback) and lines
      205-216 (`requestDeclined`, the one CTA with no caller-supplied link). **Do not modify
      `src/lib/email.ts`** — EMAIL-01's guarantee is that no send trigger, subject, recipient or
      call site moved, and the re-verification asserts `git diff --exit-code src/lib/email.ts`.
    - `.planning/phases/15-auth-profile-transactional-email/15-REVIEW.md` — the WR-05 entry, for
      the finding as originally written.
  </read_first>

  <action>
    Add `BETTER_AUTH_URL` to the `loadFromEnvLocal` allow-list, and call the loader on **both**
    paths so preview mode hydrates it too — not only the `live` branch.

    Then make the failure loud instead of silent. After loading, if `process.env.BETTER_AUTH_URL`
    is unset or empty, `fail(...)` with a message that names the concrete consequence: `APP_URL`
    resolves to the empty string, the `requestDeclined` CTA renders `href="/"`, and the two
    affected messages of 23 would be graded as a product defect during the EMAIL-03 walk. Tell the
    operator to uncomment or export `BETTER_AUTH_URL` and re-run.

    A silent empty-string fallback is precisely the shape this phase has been correcting all wave —
    a check that cannot report the thing it exists to protect. Do not preserve it here.
  </action>

  <acceptance_criteria>
    - `grep -c "BETTER_AUTH_URL" scripts/send-email-previews.ts` returns at least 2 (the allow-list
      entry and the guard)
    - `loadFromEnvLocal` is invoked on both the `live` and the preview path — confirm by reading the
      control flow, and state in the summary which lines now call it
    - Running the harness in preview mode with `BETTER_AUTH_URL` present in `.env.local` composes
      23/23 and the two `requestDeclined` messages carry an absolute CTA href, not `/`. Quote the
      rendered `href` for one of them in the summary.
    - Running it with `BETTER_AUTH_URL` deliberately unset exits non-zero with the new message.
      **Transcribe that failure text verbatim in the summary** — this is the phase's watched-red
      convention and it is the only proof the guard can fire.
    - `git diff --exit-code src/lib/email.ts` exits 0 — the product source is untouched
    - `npx tsc --noEmit` exits 0
  </acceptance_criteria>

  <verify>npx tsc --noEmit &amp;&amp; git diff --exit-code src/lib/email.ts</verify>
</task>

## Task 2 — W-3: tick AUTHUI-01 and AUTHUI-03

The re-verification closed both and left the tick to this pass. **AUTHUI-02 stays Pending** — its
second clause ("avatar removal is possible") is delivered by CROP-03 in Phase 16, as
`REQUIREMENTS.md:274` and ROADMAP Phase-15 SC #2 both already record.

<task>
  <files>.planning/REQUIREMENTS.md</files>

  <read_first>
    - `.planning/REQUIREMENTS.md` lines 84-94 (the checkbox list) and lines 223-230 (the
      traceability table) — the two places that must agree with each other
    - `.planning/REQUIREMENTS.md` line 274 (the AUTHUI-02 / CROP-03 conflicts note) — the reason
      AUTHUI-02 must NOT be ticked
    - `.planning/phases/15-auth-profile-transactional-email/15-VERIFICATION.md` — the frontmatter
      `score` line and the Requirements Coverage table, which state exactly what closed
  </read_first>

  <action>
    Set AUTHUI-01 and AUTHUI-03 to complete in **both** places: `- [ ]` → `- [x]` in the checkbox
    list, and `Pending` → `Complete` in the traceability table. Leave AUTHUI-02 Pending in both.

    The prior verification pass explicitly checked these two representations against each other and
    found no drift; keep it that way — a change to one without the other is the exact drift it was
    looking for.
  </action>

  <acceptance_criteria>
    - `grep -n "AUTHUI-01" .planning/REQUIREMENTS.md` shows `- [x]` in the checkbox list and
      `Complete` in the traceability table
    - Same for AUTHUI-03
    - AUTHUI-02 still shows `- [ ]` and `Pending` in both places
    - EMAIL-01 and EMAIL-02 remain Complete; EMAIL-03 remains Pending (the open human checkpoint)
    - The checkbox list and the traceability table agree for all six Phase-15 requirements —
      state that you checked both, and say so in the summary
  </acceptance_criteria>

  <verify>grep -nE "AUTHUI-0[123]" .planning/REQUIREMENTS.md</verify>
</task>

## Out of scope

Do not touch any of these:

- **W-1** (the `auth-contrast.test.ts` completeness census keying on token+role+state separately
  rather than on the pair). It is a real future-drift weakness the verifier found by probing, but
  it does not affect today's AA clause — every *rendered* pairing is measured and anchored. It is
  a scope decision for the PM, not a quick fix.
- `src/lib/email.ts` — EMAIL-01's guarantee, and CR-01 (`email.ts:54-55`, swallowed provider
  rejections) is a pre-existing backlog item confirmed via `git show cb26f72`.
- `15-UAT-EMAIL.md` — the walk checklist stays genuinely empty until the PM fills it.
- ROADMAP.md's `15-05` checkbox — stays `[ ]`; its Task 3 is open by the PM's deferral.
- Any test file added by 15-12, 15-13 or 15-14.

## Known tooling hazard

`gsd-sdk`'s state verbs corrupted `STATE.md` / `ROADMAP.md` on all four writes during the Phase 15
gap wave — twice re-ticking `15-05 [x]`, fabricating `completed_plans` (102→108, 103→108, 104→109),
and once returning `{"updated": false, "reason": "Progress field not found in STATE.md"}` against a
`progress:` block plainly present. **Take a pre-write copy, diff after any SDK state write, and
repair by hand.** Expected truth: `15-05` stays `[ ]`, `completed_plans: 105`, `total_plans: 105`.
This is a quick task, so it belongs in STATE.md's **Quick Tasks Completed** table — not ROADMAP.md.
