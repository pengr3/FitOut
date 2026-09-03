---
quick_id: 260831-ndc
slug: availability-copy-to-all
phase: quick-260831-ndc
plan: 01
type: execute
wave: 1
depends_on: []
created: 2026-08-31
source: Phase 19 (Availability Copy-to-All) demoted to a quick task by the PM on 2026-08-31 — the infrastructure it needs already shipped in Phase 14
autonomous: true
requirements: [HOURS-01, HOURS-02]

files_modified:
  - src/lib/availability/copy-hours.ts
  - src/components/availability/copy-hours-dialog.tsx
  - src/components/availability/weekly-hours-editor.tsx
  - tests/availability/copy-hours.test.ts
  - tests/availability/copy-hours-editor.test.tsx
  - tests/design/live-regions.test.tsx
  - .planning/PROJECT.md
  - .planning/REQUIREMENTS.md
  - .planning/ROADMAP.md
  - .planning/STATE.md

must_haves:
  truths:
    - "A host can copy one weekday's operating hours onto other weekdays instead of re-entering them (HOURS-01)."
    - "Before the copy applies, the host is told by name which selected days already have hours and will be REPLACED (HOURS-02 · D-137 — an overwrite a host cannot see coming is exactly the surprise the requirement exists to prevent)."
    - "After the copy applies and before Save, the host can undo it, and the undo restores the prior schedule exactly — including multi-window days (D-25) and closed days."
    - "Copying a day that has several open/close windows copies ALL of them, and copying a CLOSED day onto an open day closes that day and is shown as a change (D-25)."
    - "The copy is a client-side form-state edit only: it constructs no server call, and the copied windows reach the database through the unchanged Save path, re-parsed by the same weeklyHoursSchema (D-130)."
    - "src/app/actions/operating-hours.ts is byte-unchanged and drizzle/ gains no migration (D-130 · GATE-06)."
    - "The new surfaces compose the declared pattern layer and vendored primitives — no raw card, no hand-rolled box, no new colour pairing (D-155)."
    - "The copy control, the day selection, the confirm and the undo are all reachable and operable by keyboard alone, with visible focus (GATE-A11Y · D-168 — the overlay opens with no DialogTrigger, so close-time focus is steered explicitly)."
    - "Nothing that previously worked moved: seven day rows, multi-window add/remove, the overlap message, the live week strip and Save all behave as before (GATE-NOREG · D-152 · D-153)."
  artifacts:
    - path: "src/lib/availability/copy-hours.ts"
      provides: "The ONE pure, directive-free derivation: live windows + source day + target days -> the next windows array AND the two sentences that describe it. No DB, no clock, no schema runtime import — the week-strip.ts precedent (D-152)."
      exports: ["deriveCopyPlan", "CopyHoursPlan"]
    - path: "src/components/availability/copy-hours-dialog.tsx"
      provides: "The day-picker overlay: composes ResponsiveDialog + vendored Checkbox + Button, renders the overwrite warning, confirms. Zero live regions, zero alarm tone (D-155)."
    - path: "src/components/availability/weekly-hours-editor.tsx"
      provides: "The per-day copy control, the snapshot/restore undo, and the focus steering. Save path and overlap math untouched (D-130)."
    - path: "tests/availability/copy-hours.test.ts"
      provides: "The table over the transformation — multi-window source, closed source, already-matching target, untouched-day preservation (D-25)."
    - path: "tests/availability/copy-hours-editor.test.tsx"
      provides: "The rendered wiring — the warning names the right days, apply mutates form state without calling the server action, undo restores exactly (D-130 · D-137)."
  key_links:
    - from: "src/components/availability/weekly-hours-editor.tsx"
      to: "src/lib/availability/copy-hours.ts"
      via: "deriveCopyPlan called on confirm, its nextWindows handed to useFieldArray replace"
      pattern: "deriveCopyPlan"
    - from: "src/components/availability/copy-hours-dialog.tsx"
      to: "src/components/patterns/responsive-dialog.tsx"
      via: "the ONE overlay primitive — never a second focus trap (D-155)"
      pattern: "ResponsiveDialog"
    - from: "src/components/availability/copy-hours-dialog.tsx"
      to: "src/lib/availability/week-strip.ts"
      via: "deriveWeekStrip for each day's current-hours label, so the picker and the strip say the same words (D-153)"
      pattern: "deriveWeekStrip"
    - from: "src/components/availability/weekly-hours-editor.tsx"
      to: "src/app/actions/operating-hours.ts"
      via: "the UNCHANGED submit path — the copy adds no second route to the server (D-130)"
      pattern: "saveOperatingHours"
    - from: "tests/design/live-regions.test.tsx"
      to: "src/components/availability/copy-hours-dialog.tsx"
      via: "PHASE_14_SURFACE_FILE_COUNT 19 -> 20, the new file named in the same commit"
      pattern: "PHASE_14_SURFACE_FILE_COUNT"

user_setup: []
---

<objective>
A host stops re-entering the same operating hours seven times.

They pick a weekday whose hours are already right, choose which other days should match it, are told
by name which of those days already have hours and will be replaced, apply it, and — before they
save — can put it back exactly as it was.

Purpose: HOURS-01 and HOURS-02, the last two requirements in v1.1's scope.
Output: one pure derivation module, one overlay component, a wired editor, two test files, and the
docs reconciliation that retires Phase 19 from the roadmap's progress table.
</objective>

<what_this_is>
This was **Phase 19**. The PM demoted it to a quick task on 2026-08-31 because the infrastructure it
needs already exists — measured, not assumed:

- `useFieldArray` sits over a FLAT `windows` array, so a copy is a pure client form-state edit.
- `saveOperatingHours` is already a full-set replace with an ownership re-check and a
  `weeklyHoursSchema` re-parse. **Zero server work is required.**
- `WeekStrip` already draws the week from live watched form state (D-152, Phase 14) — that is
  already the "what they will change to" half of HOURS-02.
- Undo is a snapshot of the `windows` array and a restore. It is an unsaved client form.

**HOURS-02 IS READ MINIMALLY, AND THAT IS A DECIDED SCOPE CALL, NOT AN OPEN QUESTION.** What is
ADDED is the honest overwrite warning. A full before/after diff table is explicitly OUT of scope —
it is what pushed this back toward phase-sized.
</what_this_is>

<hard_constraints>
Each has a source and a test that goes red if it is broken.

1. **ZERO server changes.** `src/app/actions/operating-hours.ts` must be byte-unchanged (`git diff
   --exit-code` on it is a verify step in Task 2). D-130: the client form is NEVER the authority.
2. **ZERO schema migrations.** GATE-06 — `drizzle/` stays at `0025_audit_resolved_by.sql`. A
   migration here is a scope alarm, not something to absorb.
3. **`weeklyHoursSchema` stays the ONE authority** for the rule and its wording, on both sides. The
   copy must produce window objects the SAME schema accepts; it must not bypass, pre-empt or
   fast-path validation.
4. **NO HAND-ROLLED BOXES.** `weekly-hours-editor.tsx` deliberately LEFT `ALLOWED_RAW_CARD` in plan
   14-12 (D-155): a row for a file with no raw box left is not harmless — it would quietly license
   the next box somebody adds. Compose the declared pattern layer and the vendored primitives, and
   read tone recipes by name rather than restating their classes.
5. **NAMING DISCIPLINE — read the editor's own docblock before writing prose into it.** Several
   design gates read source text, and some of them strip comments while others do not. Describe
   things by name; do not write a class string, a utility name or an accessibility attribute into a
   comment. This has already turned gates red twice in this file's history.
6. **Days hold MULTIPLE windows (D-25).** A day is not one open/close pair. Copying a source day
   onto a target REPLACES that target's whole window array.
7. **A day with zero windows is closed** — and copying a closed day onto an open day is a real,
   meaningful operation that must work and must be reported as a change.
</hard_constraints>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@.planning/STATE.md

Read before touching anything:
@src/components/availability/weekly-hours-editor.tsx
@src/lib/availability/week-strip.ts
@src/components/availability/week-strip.tsx
@src/lib/validation/availability.ts
@src/components/patterns/responsive-dialog.tsx
@src/components/patterns/panel-card.tsx
@src/lib/design/status-tones.ts

<interfaces>
<!-- The contracts the executor needs. Extracted from the tree; no exploration required. -->

From `src/lib/availability/week-strip.ts` (the ONE owner of weekday names, hour options and the
hour parser — do NOT declare a second copy of any of them):
```ts
export type WeeklyHoursWindow = WeeklyHoursInput["windows"][number]; // { dayOfWeek; openTime; closeTime }
export type WeekStripInput = ReadonlyArray<Partial<WeeklyHoursWindow> | undefined | null>;
export type WeekStripDay = { dayOfWeek: number; dayLabel: string; segments: WeekStripSegment[]; sentence: string };
export const WEEKDAY_NAMES: readonly string[];       // "Sunday" … "Saturday", 0=Sun
export const WEEKDAY_SHORT_NAMES: readonly string[];
export const HOUR_OPTIONS: { value: string; label: string }[];
export const CLOSED_WORD = "closed";
export function hourLabel(hour: number): string | null;
export function toHour(time: string): number;        // strict: needs a two-digit prefix
export function deriveWeekStrip(windows: WeekStripInput): WeekStripDay[]; // ALWAYS seven entries
```

From `src/lib/validation/availability.ts` (the ONE authority on what may be saved):
```ts
export const hoursWindowSchema; // dayOfWeek 0..6, on-the-hour open/close, close > open
export const weeklyHoursSchema; // { windows: [...] }, no same-day overlap ('[)' half-open)
export type WeeklyHoursInput;
```

From `src/components/patterns/responsive-dialog.tsx` (THE overlay primitive — one focus trap in the
whole app; `src/components/ui/sheet.tsx` does not exist and a gate asserts it):
```ts
export type ResponsiveDialogProps = {
  open?: boolean; onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;               // REQUIRED, no default
  hideTitle?: boolean; description?: string;
  children?: ReactNode; footer?: ReactNode; closeLabel?: string;
  onOpenAutoFocus?: (event: Event) => void;   // ⚠ DO NOT USE — see Task 2
  onCloseAutoFocus?: (event: Event) => void;  // ✅ this is the one this feature needs
};
```

From `src/components/patterns/panel-card.tsx`:
```ts
export type PanelCardProps = {
  title?: string; titleAs?: "h1" | "h2" | "h3"; description?: string;
  footer?: ReactNode; sticky?: boolean; tone?: "default" | "muted"; children?: ReactNode;
}; // takes NO className, by design
```

From `src/components/availability/weekly-hours-editor.tsx` (what already exists and stays):
```ts
const form = useForm<WeeklyHoursInput>({ resolver: zodResolver(weeklyHoursSchema), defaultValues: { windows: initialWindows }, mode: "onChange" });
const { fields, append, remove } = useFieldArray({ control: form.control, name: "windows" });
const liveWindows = useWatch({ control: form.control, name: "windows" }) ?? [];
// `replace` is NOT destructured today — add it to the same destructuring.
```

`src/components/ui/checkbox.tsx`, `label.tsx` and `button.tsx` are vendored and available.
`Button` sizes include `touch` (44px, DS-09 / D-22). `Button` variants include `brand` — **do not
use it**, a gate pins the coral adoption count. `destructive` is likewise forbidden here (see the
alarm-census note in Task 2).
</interfaces>
</context>

<source_audit>
Every item from every source, with the task that covers it. No item is deferred and none is
simplified — see `<what_this_is>` for the one scope call, which is the PM's, not the planner's.

| Source | Item | Covered by | Status |
|--------|------|-----------|--------|
| GOAL (ROADMAP §19) | "A host stops re-entering the same operating hours seven times" | Tasks 1+2 | COVERED |
| GOAL SC-1 | Copy one day's hours onto other days | Tasks 1+2 | COVERED |
| GOAL SC-2 | Before it applies, sees which days change and what to; can undo before saving | Task 2 (warning + the shipped WeekStrip + undo) | COVERED |
| GOAL SC-3 | A day that already has hours is shown as a change, never overwritten invisibly | Tasks 1+2 (`replacedDays` → the named warning) | COVERED |
| REQ | HOURS-01 | Tasks 1+2 | COVERED |
| REQ | HOURS-02 | Task 2 | COVERED |
| CONTEXT | D-25 — multiple windows per day; a closed day is a real value | Task 1 (transformation + table) | COVERED |
| CONTEXT | D-130 / GATE-05 — no client-side authority, no server change | Tasks 1+2 (`git diff --exit-code`, pure module, no lock pre-check) | COVERED |
| CONTEXT | D-137 — never surprise them; never leave a screen with no next action | Task 2 (the named overwrite warning; the undo control) | COVERED |
| CONTEXT | D-155 — no hand-rolled boxes; pattern layer only | Task 2 | COVERED |
| CONTEXT | GATE-06 — zero migrations | Task 2 verify | COVERED |
| CONTEXT | D-142 recorded; HOURS-01/02 marked satisfied; Phase 19 reconciled | Task 3 | COVERED |
| CONTEXT | GATE-A11Y / GATE-RESP / GATE-STATES / GATE-NOREG | Task 2 verify + the seven keyed design tests | COVERED |

Exclusions (not gaps): a before/after diff table — the PM ruled it out of scope; multi-day *source*
selection (copy from many days at once) — not in HOURS-01, not proposed; any change to
`BlocksEditor` — a different requirement.
</source_audit>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: The copy transformation, as ONE pure derivation with its table</name>
  <files>src/lib/availability/copy-hours.ts, tests/availability/copy-hours.test.ts</files>
  <behavior>
    Drive these from `tests/availability/copy-hours.test.ts` FIRST, as a plain table, in a node
    environment — no DOM, no render. This is `week-strip.ts`'s argument applied again: an inline
    derivation inside a client component is reachable only through a rendered DOM, so the table that
    actually pins this contract would have to be a render test. Pulled out, it is a plain function
    and the table is a plain table.

    - Copying a source day with THREE windows onto two targets gives each target all three, with
      `dayOfWeek` rewritten to the target and the times carried across unchanged (D-25).
    - Copying a source day with ZERO windows (closed) onto a target that has hours leaves that
      target with zero windows, and reports it as a change (hard constraint 7).
    - Every window belonging to a day that is NEITHER the source NOR a target survives, unchanged
      and in its original relative order.
    - The source day's own windows survive unchanged; the source day is never its own target even
      if it is passed in the target list.
    - `replacedDays` lists exactly the target days that currently hold at least one window — those
      are the days HOURS-02 must name before the copy applies.
    - `changedDays` lists the target days whose resulting window set DIFFERS from what they hold
      now; a target that already matches the source is not a change and is not named as one.
    - An empty target list is a no-op: `nextWindows` deep-equals the input set and both day lists
      are empty.
    - The input is TOLERATED the way `deriveWeekStrip` tolerates it: a live RHF array legitimately
      emits an undefined row or a window missing a time mid-edit. Skip those rows; never throw.
      Skipping is not a verdict on validity — the form owns its message and the shared schema owns
      the refusal.
    - Every produced window is an object of exactly the three fields `hoursWindowSchema` names, so
      `weeklyHoursSchema.safeParse({ windows: plan.nextWindows })` succeeds for any input set that
      already parsed. Assert this directly in the table with the real schema imported.
    - The two sentences come out of the SAME call as the arrays, for the reason `week-strip.ts`
      states about its own pair: a component that computed from one derivation and described from
      another would be one refactor away from showing one thing and saying another.
  </behavior>
  <action>
    Create `src/lib/availability/copy-hours.ts` as a **directive-free** module — no rendering-environment
    pragma of either kind, exactly like `week-strip.ts` and `block-reason.ts` next door, so a client
    component can import it AND a node-environment test can drive it. **No database import. No clock
    read. No schema import at runtime** (type-only, as `week-strip.ts` does it). It reads nothing about
    bookings, passes, prices or the hours lock.

    Export one function and its result type:

    `deriveCopyPlan(input: { windows: WeekStripInput; sourceDay: number; targetDays: readonly number[] }): CopyHoursPlan`

    where `CopyHoursPlan` carries: `nextWindows: WeeklyHoursWindow[]`, `replacedDays: number[]`,
    `changedDays: number[]`, `targetDays: number[]` (normalised — deduped, source removed, sorted
    Sunday-first), `warningSentence: string | null` and `appliedSentence: string`.

    The transformation, stated precisely so it is deterministic:
      1. Normalise `targetDays`: drop anything outside 0..6, drop duplicates, drop the source day,
         sort ascending.
      2. Collect the source day's windows from the input, in input order, skipping unusable rows.
      3. `nextWindows` = every input window whose day is NOT a normalised target, in its original
         relative order, FOLLOWED BY, for each target day in order, a fresh clone of each source
         window with `dayOfWeek` set to that target. Clone — never share the object identity, or an
         undo that restores a snapshot would restore aliased rows.
      4. `replacedDays` = the normalised targets that currently hold at least one usable window.
      5. `changedDays` = the normalised targets whose current window set, compared by day-sorted
         open/close pairs, differs from the source day's set.

    Reuse `WEEKDAY_NAMES`, `WeeklyHoursWindow` and `WeekStripInput` from
    `@/lib/availability/week-strip`. **Do not declare a second weekday list, a second hour parser or
    a second hour-label map anywhere** — that file is their one owner since plan 14-12, and this
    module joining them is how "one owner" stays true by import rather than by inspection.

    The two sentences:
      - `warningSentence` is `null` when `replacedDays` is empty. Otherwise it names the days
        plainly, e.g. *"Tuesday, Wednesday, and Friday already have hours. Copying replaces them."*
        Comma-separated with an "and" before the last, which is the join grammar `week-strip.ts`
        already uses for its ranges. This sentence is HOURS-02's added half.
      - `appliedSentence` reports what just happened, e.g. *"Copied Monday's hours to Tuesday,
        Wednesday, and Friday."* When the source day is closed, say so in the same shape rather than
        claiming hours were copied — a closed source is a real operation, not an empty one.
      - The list-joining helper is LOCAL to this module. Do not reach into `week-strip.ts`'s private
        joiner and do not export a third copy of the availability route's own name-joiner: what must
        not be duplicated is a SENTENCE, and neither of those is one of ours.

    Write the module's docblock the way its neighbours are written — say what it owns, say what it
    deliberately does not judge, and name things descriptively. Per hard constraint 5, do not write
    a class string or an accessibility attribute into any comment in this feature's files.
  </action>
  <verify>
    <automated>npx vitest run tests/availability/copy-hours.test.ts</automated>
    <automated>npx tsc --noEmit</automated>
  </verify>
  <done>
    `tests/availability/copy-hours.test.ts` was watched RED against the absent/incomplete module
    before it went green (a gate that has never been watched failing is not a gate —
    `tests/design/infra.test.ts:5-9`), and the whole table now passes. `deriveCopyPlan` is the only
    export that computes anything; `src/lib/availability/copy-hours.ts` imports no database module,
    reads no clock, and imports the validation module for types only.
  </done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: The day picker, the honest overwrite warning, and the undo</name>
  <files>src/components/availability/copy-hours-dialog.tsx, src/components/availability/weekly-hours-editor.tsx, tests/availability/copy-hours-editor.test.tsx, tests/design/live-regions.test.tsx</files>
  <behavior>
    Drive `tests/availability/copy-hours-editor.test.tsx` (jsdom) alongside the component. Follow
    `tests/availability/week-strip.test.tsx`'s harness verbatim where it applies: mock
    `@/app/actions/operating-hours` and `sonner`, and stub `ResizeObserver` — Radix's select and
    dialog both measure themselves with an observer jsdom does not implement.

    - Opening the copy control on a day whose neighbours already have hours renders the warning
      naming exactly those days, and no others. **Assert the warning is present BEFORE anything is
      applied** — that is HOURS-02's "before it applies" clause, and a test that only checks it
      after would pass on a product that surprises the host.
    - Confirming the copy changes what the seven day rows and the week strip's sentences say, and
      `saveOperatingHours` is called ZERO times. Both halves together: a copy that quietly saved
      would pass a weaker test while breaking D-130.
    - The undo control appears only after a copy has been applied, and activating it restores the
      exact prior schedule — assert it against a fixture with a MULTI-WINDOW day and a CLOSED day,
      because those are the two shapes a naive restore gets wrong.
    - Copying a closed day onto a day that had hours leaves that day reading as closed, and the
      warning named it beforehand.
    - Save stays pressable throughout. It is disabled only while a save is in flight, and it must
      not become gated on client validity — `week-strip.test.tsx` case (12) already fails on that
      and this feature must not reintroduce it (D-130).
    - Every control this task adds is reachable by keyboard: the per-day copy trigger, each day
      checkbox, the confirm, the cancel and the undo.
  </behavior>
  <action>
    **(a) `src/components/availability/copy-hours-dialog.tsx`** — a client component that composes
    `ResponsiveDialog` from the pattern layer. It is a controlled overlay with **no `trigger` prop**:
    the trigger lives in the day row, in the editor.

    Props: the source day (or null when closed), the live windows array, an open-change handler, an
    apply handler that receives the `CopyHoursPlan`, and a close-focus handler forwarded straight to
    the pattern's `onCloseAutoFocus`.

    - Title: names the source day, e.g. *"Copy Monday's hours"*. The pattern requires a non-empty
      title and has no default.
    - Description: one line saying the picked days will take these hours and that anything already
      set on them is replaced.
    - Body: the other six weekdays as vendored `Checkbox` + `Label` rows in a single column. Each
      row's label is **that day's own sentence from `deriveWeekStrip`** — so the picker and the
      strip above the editor say the same words about the same day, by construction rather than by
      two lists happening to agree (D-153). Do not compose a new sentence for a day's current hours.
    - Below the list, the warning from `deriveCopyPlan(...).warningSentence`, rendered only when it
      is non-null, recomputed as the selection changes.
    - Footer: a cancel control and a confirm control, both at the touch size from the button size
      vocabulary. The confirm is disabled while nothing is selected. Label the confirm with the
      count of selected days.

    ⚠ **TONE.** The warning is **neutral, calm information** — nothing has gone wrong; the host is
    being told what their own action will do. `src/components/availability/` is inside the tree
    `tests/design/host-tone-census.test.ts` counts, and a file absent from its map must render the
    alarm role ZERO times. **Do not use the alarm button variant and do not paint the warning in the
    alarm ink.** Read `STATUS_TONE_RECIPES` by name if you need a tone; do not restate its classes.
    Likewise do not use the accent button variant — `brand-recipe.test.ts` pins its adoption count.

    ⚠ **THIS COMPONENT RENDERS NO LIVE REGION OF ANY KIND** — no assertive role, no polite role, no
    live attribute. `live-regions.test.tsx` pins the assertive-role census on the Phase-14 surfaces
    at two occurrences (one per availability editor, both native field-validation messages) and
    asserts the total. Adding one here moves that pin and, per that gate's own failure message,
    would require a declaration in `src/lib/design/live-regions.ts`. The outcome is announced by
    MOVED FOCUS instead — see (b).

    ⚠ **DO NOT PASS `onOpenAutoFocus`.** `tests/design/responsive-dialog-autofocus.test.tsx` derives
    its adopter census from the tree and asserts that every adopter outside its `DELIBERATE` set does
    not mention that prop. `onCloseAutoFocus` is not policed by that loop and is the hook this
    feature actually needs.

    ⚠ **NO NEW `data-testid`.** `src/lib/design/selector-contract.ts` is a typed inventory and an
    undeclared identifier is a compile error, not a review comment. Query by role and by accessible
    name in the test; the pattern already renders its own declared identifier on the dialog content.

    **(b) `src/components/availability/weekly-hours-editor.tsx`** — the smallest wiring that works.
    Add `replace` to the existing `useFieldArray` destructuring; change nothing else about the form,
    the resolver, the watched value, the overlap math, the selects, the validation message or the
    submit handler.

    - In each day row, beside the existing add-hours control, add a copy control naming the action
      for that day. Put the two controls in a wrapping flex row with a gap so they wrap rather than
      overflow at the 320px floor (GATE-RESP). Both at the same control height as the existing row
      controls.
    - Editor state: the open source day, an undo record holding a deep-cloned snapshot of the
      windows array plus the plan's applied sentence, a ref to the copy control that opened the
      overlay, and a ref to the undo control.
    - On apply: snapshot the current live windows (deep clone — a snapshot that aliases the live
      rows is not a snapshot), call `replace(plan.nextWindows)`, store the undo record, close the
      overlay.
    - The undo affordance renders only while an undo record exists, between the day-editor panel and
      the save row: the applied sentence as muted text, plus an undo control. **It is not a new
      box** — no card, no panel, no bordered container — for D-155's reason: this file left the
      raw-box allow-list in plan 14-12, and a box added here is a failure rather than an exemption.
      It is text and a control inside the stack that is already there.
    - On undo: `replace(snapshot)`, clear the undo record, return focus to the copy control that
      started it.
    - **Focus steering (GATE-A11Y · D-168's mitigation shape).** Because the overlay has no
      `DialogTrigger`, Radix suppresses the browser's own focus restore and then aims at a trigger
      ref that was never populated — so `Escape` would drop focus to the document body and the next
      Tab would restart the page. Pass `onCloseAutoFocus`, prevent the default, and place focus
      deliberately: after an apply, on the **undo control**; after a cancel or `Escape`, on the
      **copy control** that opened it. Wire the undo control's accessible description to the applied
      sentence so that focus landing on it announces WHAT was copied — that is how the outcome
      reaches a screen-reader host without a live region. Note that the undo control has not mounted
      yet at the moment the close handler runs; defer the focus call by one frame or drive it from a
      pending-focus effect.
    - **DO NOT filter locked weekdays out of the picker and do not add a client-side hours-lock
      check.** The hours lock is `saveOperatingHours`' rule, evaluated against the PERSISTED
      occupancy mode and the real bookings; the route already renders its own advisory naming the
      frozen weekdays, and the server's refusal already reaches this form through the existing toast
      and the field error pinned onto the windows path. A client-side pre-check would be a second
      authority on what may be saved, which is exactly what hard constraint 3 forbids.
    - When adding prose to this file, obey its own docblock: name things descriptively, never quote
      a class string or an accessibility attribute.

    **(c) `tests/design/live-regions.test.tsx`** — the new component is inside
    `src/components/availability/`, which is one of that gate's owned trees, and the editor imports
    it, so the derived Phase-14 closure grows by one file. Move `PHASE_14_SURFACE_FILE_COUNT` from
    `19` to `20` **in this same commit** and name the new file in the constant's docblock beside the
    existing 18→19 note, stating that it authors no live region so the inventory itself is unchanged
    and `src/lib/design/live-regions.ts` is not edited. That constant's own docblock says this is
    exactly what it is for: the reach changed and somebody said so. **Watch it red first** — with the
    new import in place and the constant still at 19, run
    `npx vitest run --config vitest.design.config.ts tests/design/live-regions.test.tsx` and record
    the message in the SUMMARY. **The config flag is not optional on any `tests/design/*` file:**
    `vitest.config.ts:72` excludes that whole directory (its globalSetup preflights Postgres, which
    the design suite is deliberately kept free of), so the bare command finds no test files and exits
    1 — which reads exactly like a gate that ran and passed nothing. A number moved first would make the addition unfalsifiable.

    **(d) Headings.** If any new surface carries a heading, it renders at the third level.
    `week-strip.test.tsx` case (7) asserts the availability section contains exactly one
    second-level heading, and a new second-level sibling fails it (WR-03).
  </action>
  <verify>
    <automated>git diff --exit-code -- src/app/actions/operating-hours.ts</automated>
    <automated>git status --porcelain -- drizzle/ package.json package-lock.json</automated>
    <automated>npx vitest run tests/availability/</automated>
    <automated>npx vitest run --config vitest.design.config.ts tests/design/card-pattern-coverage.test.ts tests/design/host-tone-census.test.ts tests/design/live-regions.test.tsx tests/design/empty-state-adoption.test.ts tests/design/avatar-copy.test.tsx tests/design/responsive-dialog-autofocus.test.tsx tests/design/selector-contract.test.ts tests/design/brand-recipe.test.ts</automated>
    <automated>npx vitest run</automated>
    <automated>npm run build</automated>
  </verify>
  <done>
    The first two commands exit 0 with empty output — the server action is byte-unchanged, `drizzle/`
    gained no migration (GATE-06), and no dependency was added. `tests/availability/` is green
    including `week-strip.test.tsx`'s twelve pre-existing cases and `hours-lock.test.ts` (GATE-NOREG).
    The seven design tests keyed to this file are green, with `PHASE_14_SURFACE_FILE_COUNT` moved to
    20 and its red watched first. `npx vitest run` and `npm run build` (lint + the design suite +
    next build) both pass. A host can copy a day's hours, is told by name which days will be
    replaced before it applies, and can undo it before saving — all by keyboard alone.
  </done>
</task>

<task type="auto">
  <name>Task 3: Retire Phase 19 from the record and mark HOURS-01/02 satisfied</name>
  <files>.planning/PROJECT.md, .planning/REQUIREMENTS.md, .planning/ROADMAP.md, .planning/STATE.md</files>
  <action>
    Reconcile the planning record so nothing still describes Phase 19 as work that has not started.

    **`.planning/PROJECT.md` § Key Decisions** — append **D-142** after D-141, in the table's
    established three-column shape (decision / why / status). The decision: *the availability
    copy-to-all capability (HOURS-01, HOURS-02) is DEMOTED from its own phase to a quick task.* The
    reason, stated as the measurement it is rather than as a preference: D-136 gave it its own phase
    so net-new capability could never fold into a surface-polish phase, and that rule held and did
    its job — but the phase's own infrastructure had already shipped in Phase 14, so what remained
    was not phase-sized. Name the four things that were already there: `useFieldArray` over a flat
    windows array (a copy is a client form-state edit), `saveOperatingHours` already a full-set
    replace with an ownership re-check and a `weeklyHoursSchema` re-parse (zero server work),
    `WeekStrip` already drawing the week from live watched form state under D-152 (already the
    "what they will change to" half of HOURS-02), and undo being a snapshot-and-restore of an
    unsaved client form. Record what D-142 does NOT do: it does not weaken D-136 — the capability
    still ships with its own REQ IDs and its own gates, it simply ships as a quick task rather than
    as a phase. Record the one scope call: HOURS-02 ships as the overwrite warning plus the shipped
    live strip; a full before/after diff table was ruled out of scope, which is what had pushed the
    work back toward phase-sized. Status: **Adopted — PM decision, 2026-08-31**. Also update the two
    forward-looking bullets near the top of the Requirements section that still list the copy-to-all
    capability as an unchecked "own phase — D-136" item, and add the usual one-paragraph note to
    § Evolution with the date.

    **`.planning/REQUIREMENTS.md`** — tick `HOURS-01` and `HOURS-02` in the Availability copy (HOURS)
    section; change their rows in the traceability table from `Phase 19 | Pending` to name this quick
    task and read `Satisfied`; update the per-phase-counts row for 19 the same way; and re-state the
    Coverage block so the mapped/unmapped arithmetic still reconciles against 71 in-scope
    requirements. Keep the section heading's D-136 provenance — it is the record of why the
    capability was never allowed to fold into a polish phase, and that is still true.

    **`.planning/ROADMAP.md`** — three places, all of which currently describe Phase 19 as ahead of
    us. (1) The phase checklist line near the top: tick it and note it shipped as this quick task.
    (2) The `### Phase 19: Availability Copy-to-All` block: keep the goal, the requirements and the
    three success criteria verbatim — they are the contract this work was built against — and add a
    line above them recording the D-142 demotion, the quick-task directory, and which of the three
    criteria the shipped work satisfies. (3) The Progress table row `| 19. Availability Copy-to-All
    | v1.1 | 0/? | Not started | - |`: it can no longer sit there as a not-started phase. Give it the
    shape the other completed rows use, marking it shipped as a quick task under D-142 with the
    date. Also reconcile the execution-order line that ends `… → 17 → 19`.

    **`.planning/STATE.md`** — add a row to the § Quick Tasks Completed table: id `260831-ndc`,
    the description, the date `2026-08-31`, the commit, status left for the verifier, and the
    directory link in the same relative form the neighbouring rows use.

    Write the commit hash into the STATE.md row after the code commit exists; if the docs land in
    the same commit, use that hash.
  </action>
  <verify>
    <automated>grep -c "D-142" .planning/PROJECT.md</automated>
    <automated>grep -n "HOURS-01\|HOURS-02" .planning/REQUIREMENTS.md</automated>
    <automated>grep -n "Not started" .planning/ROADMAP.md | grep -c "Availability Copy-to-All" || true</automated>
    <automated>grep -c "260831-ndc" .planning/STATE.md</automated>
  </verify>
  <done>
    D-142 is recorded in PROJECT.md § Key Decisions with its reason and its explicit non-weakening
    of D-136. HOURS-01 and HOURS-02 read as satisfied in REQUIREMENTS.md and the coverage arithmetic
    reconciles. ROADMAP.md carries no line describing Phase 19 as not started — the third grep
    returns 0 — and its Phase 19 block keeps the original goal and success criteria alongside the
    demotion record. STATE.md's Quick Tasks Completed table carries the `260831-ndc` row.
  </done>
</task>

</tasks>

<threat_model>
## Trust Boundaries

| Boundary | Description |
|----------|-------------|
| browser form state → `saveOperatingHours` | The ONLY boundary this feature touches, and it is unchanged. Untrusted window data crosses here on submit. |
| `saveOperatingHours` → `operating_hours` rows | Server-side; byte-unchanged by this work. |
| *(none added)* | The copy introduces **no new trust boundary**: it constructs no request, adds no route, and calls no action. |

## STRIDE Threat Register

| Threat ID | Category | Component | Disposition | Mitigation Plan |
|-----------|----------|-----------|-------------|-----------------|
| T-19-01 | Elevation of Privilege | copied windows submitted against a listing the host does not own | mitigate | Unchanged: `assertOwnership(listingId, userId)` runs server-side before any write and the writes are re-scoped inside the transaction on the owner's listing id (RESEARCH Security V4). Ownership is re-checked on save and remains the ONLY ownership authority. Verified mechanically by `git diff --exit-code -- src/app/actions/operating-hours.ts` in Task 2. |
| T-19-02 | Tampering | copied windows treated as pre-validated and fast-pathed past the schema | mitigate | `deriveCopyPlan` writes plain objects into the SAME `windows` field array the selects write into; they reach the server through the identical submit handler and are re-parsed by `weeklyHoursSchema.safeParse` exactly like hand-entered ones. No special case, no fast path, no second submit route. Task 1's table asserts the produced set parses under the real schema. |
| T-19-03 | Tampering / Information Disclosure | "copy hours" drifting into deriving AVAILABILITY client-side (D-130 / GATE-05) | mitigate | `src/lib/availability/copy-hours.ts` is form-state manipulation and nothing else: no database import, no clock read, no price, no booking or pass data, no read-model call. It never answers "is this slot bookable" — only "what array does the form hold next". The AST client/server-boundary gate stays green because nothing crosses it. |
| T-19-04 | Tampering | client-side pre-emption of the CR-03 hours lock, becoming a second authority on what may be saved | mitigate | Deliberately NOT implemented. Locked weekdays are not filtered out of the picker and no client-side lock check is added; the server's refusal reaches the host through the existing toast and the field error already pinned onto the windows path. Stated as an explicit instruction in Task 2 so it is not "helpfully" added later. |
| T-19-05 | Denial of Service | an unbounded copy inflating the saved set | accept | Bounded by construction: at most six target days times the source day's windows, and the save is a full-set replace inside one transaction. No new amplification over what the add-hours control already permits. |
| T-19-06 | Repudiation | an overwrite the host did not know they were authorising | mitigate | This is HOURS-02 and the reason the feature has a warning at all: the days that will be replaced are named BEFORE the copy applies, and the copy is reversible before save (D-137). |
| T-19-SC | Tampering | npm / pip / cargo installs | mitigate | **Zero new dependencies.** Every primitive used — `ResponsiveDialog`, `Checkbox`, `Label`, `Button`, lucide icons — is already vendored. `git status --porcelain -- package.json package-lock.json` returning empty is a verify step in Task 2, so a package added quietly fails the task. No package-legitimacy checkpoint is required because no install occurs; if one becomes necessary, that is a scope alarm to raise, not to absorb. |
</threat_model>

<verification>
The gates that must be green at the end. Any of these going red is a failed task, not an acceptable
trade.

- The **seven design tests keyed to this file**: `tests/design/card-pattern-coverage.test.ts`,
  `tests/design/host-tone-census.test.ts`, `tests/design/live-regions.test.tsx`,
  `tests/design/empty-state-adoption.test.ts`, `tests/design/avatar-copy.test.tsx`,
  `tests/availability/week-strip.test.tsx`, `tests/availability/hours-lock.test.ts`.
- **GATE-A11Y** — the copy control, each day checkbox, the confirm, the cancel and the undo are
  reachable and operable by keyboard alone, with visible focus, in the `court` theme. Focus never
  lands on the document body after the overlay closes.
- **GATE-RESP** — 320px up, nothing wraps badly or overflows: the day row's two controls wrap, and
  the overlay is the bottom-sheet presentation below the small breakpoint.
- **GATE-STATES** — designed states. Note this is a FORM, not an async surface: there is no loading
  state to design here and no error state beyond the shared schema's own message.
- **GATE-NOREG** — the previously working thing still works: the seven day rows, the multi-window
  add and remove, the overlap message, the live strip, and Save.
- **GATE-06** — zero migrations; `drizzle/` stays at `0025_audit_resolved_by.sql`.
- Whole suite: `npx vitest run` and `npm run build`.

⚠ **Any command naming a `tests/design/*` file directly needs `--config vitest.design.config.ts`.**
`vitest.config.ts:72` excludes `tests/design/**` from the main project, so the bare form collects
nothing and exits 1. `npm run build` calls the `test:design` npm script, which already carries the
flag — leave it alone.

**Manual walk (route to the SUMMARY as a human-verify note, not a blocking checkpoint):** on
`/host/listings/{id}/availability`, set Monday to two windows, leave Tuesday closed and give
Wednesday one window; copy Monday onto Tuesday and Wednesday and confirm the warning named Wednesday
and not Tuesday; apply, check both days show two windows and the strip agrees; undo and check
Wednesday is back to its single window and Tuesday is closed again; then copy Tuesday (closed) onto
Monday and check Monday reads closed and the warning named it.
</verification>

<success_criteria>
- HOURS-01: a host copies one day's operating hours onto other days instead of re-entering them.
- HOURS-02: before it applies they are told by name which days already have hours and will be
  replaced, and after it applies and before Save they can undo it — restoring multi-window days and
  closed days exactly.
- `src/app/actions/operating-hours.ts` is byte-unchanged; `drizzle/` gains no migration;
  `package.json` and `package-lock.json` are unchanged.
- `weeklyHoursSchema` is still the one authority for the rule and its wording on both sides.
- The seven keyed design tests, `npx vitest run` and `npm run build` are all green, with
  `PHASE_14_SURFACE_FILE_COUNT` moved from 19 to 20 and its red watched first.
- D-142 is on the record, HOURS-01/02 read as satisfied, and no line anywhere describes Phase 19 as
  a phase that has not started.
</success_criteria>

<output>
Create `.planning/quick/260831-ndc-availability-copy-to-all/260831-ndc-SUMMARY.md` when done.

Record in it, at minimum: the watched-red evidence for `tests/availability/copy-hours.test.ts` and
for `PHASE_14_SURFACE_FILE_COUNT`; the exact focus mechanism chosen for the overlay's close and the
reason; anything measured that contradicts this plan (say so plainly and fix the real thing rather
than building on the plan's guess); and the manual walk's result.
</output>
