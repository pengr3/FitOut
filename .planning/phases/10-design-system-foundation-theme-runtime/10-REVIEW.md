---
phase: 10-design-system-foundation-theme-runtime
reviewed: 2026-08-12
status: issues_found
depth: standard
kind: re-review
diff_base: ffbf6b5
fix_range: 0231949..2ae81de
files_changed: 109
files_reviewed: 88
reviewers: 2
supersedes: "the 2026-08-12 first-pass review (git show 0231949:.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md)"
findings:
  critical: 3
  warning: 12
  info: 16
  total: 31
---

# Phase 10 — Code Re-Review

This is a **re-review** of the tree after the 18 fixes in `0231949..2ae81de`. The first-pass review
(3 Critical / 15 Warning / 14 Info) is superseded by this file but preserved in git at
`0231949`. Its findings CR-01..CR-03 and WR-01..WR-15 are **not** re-reported; neither is its known
Info set IN-01..IN-14, none of which a fix made materially worse.

Reviewed at `standard` depth across two slices, 88 of the 109 changed files:

- **Slice A — authored logic, configuration, and every source file the fix pass touched** (44 files).
- **Slice B — the gate suite plus the mechanically-swept component surface** (44 files). 10 of the 21
  design test files were themselves rewritten by the fix pass, so the gates are re-reviewed as
  changed code, not as fixed infrastructure.

**Scope note.** As in the first pass, scoping came from the git diff, not from SUMMARY frontmatter.
The workflow's default SUMMARY scoping still yields 44 files here and still omits `globals.css`,
`button.tsx`, `utils.ts` and `layout.tsx`. That has not changed and should not be trusted next phase.

**Baseline, re-established on the developer machine before anything else** — `node_modules` was empty
until this session; the fix pass had verified only inside an isolated worktree. All three claims in
the fix report reproduce here:

| Command | Result |
|---|---|
| `npm run test:design` | **20 files / 405 tests passed** |
| `npx tsc --noEmit` | **clean** (exit 0) |
| `npm run lint` | **0 errors, 9 pre-existing warnings** |

`npm test` (the main unit suite) still requires a provisioned Postgres and did not run. Non-design
suites remain unexercised by both the fix pass and this review.

**Every finding below was produced by running something.** Each evasion was applied to the working
tree, run, and reverted; `git status --porcelain` is clean apart from the pre-existing untracked
`scope.tmp.txt`. Claims that could not be reproduced are recorded as such.

---

## The shape of this review

The fix pass was, on the whole, sound: its arithmetic reproduces to three decimal places, its one
contested deviation is correct, and eight of its hardenings genuinely close what they claim. What it
did *not* do reliably is verify that a hardening catches its own motivating case. **Three gates now
carry a comment asserting they closed an escape that they demonstrably did not close**, and one
hardening deleted coverage the pre-fix code had. A gate that reads as fixed and is not is worse than
the original hole, because the next author trusts the comment.

That is the through-line of all three Criticals, and it is the same defect class the first pass named
in its own WR-01 — *the gate's recorded justification is factually wrong* — reproduced by the pass
that fixed it.

---

## CRITICAL

### CR-01 — `status-vocab`'s retired-pairing gate is still evadable by a `cn()` split, and its own comment claims that escape closed

**`tests/design/status-vocab.test.ts:99-112`** (the claim), **`:336`** (the detection),
**`:597-614`** (the positive control that avoids the shape).

The first pass's WR-03 replaced an exact two-token adjacency with an independent-detection scheme.
The doc comment and commit `d483834` both enumerate the escapes and assert closure:

> *"The pairing renders identically — and the gate passes — if the classes are REORDERED,
> double-spaced, wrapped across lines by a formatter, **split across two `cn()` arguments**, or merely
> separated by any third class … Detecting the two classes INDEPENDENTLY within one class string and
> intersecting them **removes every one of those escapes at once**."*

It does not remove the `cn()`-split one. `classChunks` (`:198-221`) returns **one chunk per string
literal**, and `:336` requires both classes in the same chunk:

```ts
if (chunks.some((u) => u.has(RETIRED_FILL) && u.has(RETIRED_INK))) {
```

Two `cn()` arguments are two literals, hence two chunks, and neither holds both classes.

**Reproduced.** `src/components/booking/booking-row.tsx:59` changed from `<Card className="relative">`
to:

```tsx
<Card className={cn("relative bg-success", "text-success-foreground")}>
```

- `npx vitest run --config vitest.design.config.ts tests/design/status-vocab.test.ts` → **18/18 passed**
- `npm run test:design` → **20 files / 405 tests passed**

The retired 3.24:1 filled-green pairing — the one DS-10 exists to retire, the one
`contrast-pairs.ts:244` calls "ILLEGAL as text" — ships on the booker's booking card with the whole
suite green. `pair-drift.test.ts` cannot see it either: two literals, so `pairingsIn` never
cross-multiplies them.

Slice A independently lifted `classChunks` + `utilitiesIn` and ran them over five fixtures:

```
single string              -> CAUGHT
split across cn() args     -> MISSED
split across cva slots     -> MISSED
template with interp       -> MISSED
conditional cn             -> MISSED
```

Four of five real splitting shapes evade. The `:497-513` / `:597-614` positive controls exercise only
the four single-string shapes, so the gate cannot observe its own gap. The same shape applies to the
`positive`-recipe "surface and ink on ONE element" check at `:466-476` and to `soft-accent`'s at
`ecaee51`.

Not contrived: `booking-status-badge.tsx:58` and `payout-state-badge.tsx:42` are one literal today
purely by convention, and the phase's own `cn("gap-1", className)` idiom sits at both call sites.

**Fix.** Union the utility sets of every literal beneath one `className` JSX attribute, rather than
treating each literal as an element:

```ts
function classSetsForElements(path: string, text: string): Set<string>[] {
  const sf = ts.createSourceFile(path, text, ts.ScriptTarget.Latest, true, kind);
  const out: Set<string>[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isJsxAttribute(node) && node.name.getText(sf) === "className") {
      const bag = new Set<string>();
      const collect = (n: ts.Node) => {
        if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) ||
            ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
          for (const u of utilitiesIn(n.text)) bag.add(u);
        }
        ts.forEachChild(n, collect);
      };
      collect(node);
      out.push(bag);
    }
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return [...out, ...classChunks(path, text).map(utilitiesIn)];
}
```

Then add the `cn()`-split shape to the `:597` control — by this phase's own standard, a gate never
observed failing on a form is not a gate for that form. If the union is not wanted, delete the
"removes every one of those escapes" sentence and record the split-argument case as a stated blind
spot, the way `:471-474` already handles its known gap.

---

### CR-02 — the WR-02 fix deleted `.css` from both focus pairing checks; `globals.css` can now ship a hardcoded white offset band with the suite green

**`tests/design/focus-recipe.test.ts:253`** (the new gate), **`:255-270`** (the two checks inside it),
**`:28-31`** (the header that argues the opposite).

Pre-fix (`git show d271ee2^:tests/design/focus-recipe.test.ts`), both checks ran over the raw text of
**every** collected file — `.ts`, `.tsx` **and `.css`**. Post-fix both sit inside
`if (!name.endsWith(".css")) {`. The justification at `:252` — *"the stylesheet composes no focus
recipe of its own — it declares the tokens the recipe names"* — is **asserted nowhere**, and it
contradicts this file's own header:

> *"The `.css` leg is load-bearing rather than decorative: `src/app/globals.css` was the site of the
> stylesheet's own half-alpha outline colour … a walker that collected only TypeScript would report a
> clean tree while the stylesheet still shipped it."*

`globals.css` **does** use `@apply` (`:465`, `:468`, `:471`), so the shape is one line away.

**Reproduced.** Added to `globals.css`'s `@layer base` body rule:

```css
@apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;
```

- `npx vitest run --config vitest.design.config.ts tests/design/focus-recipe.test.ts` → **14/14 passed**
- `npm run test:design` → **20 files / 405 tests passed**

Tailwind's `--tw-ring-offset-color` defaults to a literal white, so the stylesheet ships a hardcoded
`#fff` band on every focusable element — the exact "raw colour reaching the screen from a framework
default" that `PREFIXED_OFFSET_WIDTH` (`:194-202`) exists to prevent, and visibly wrong on grove's
tinted background.

**This is a coverage regression caused by the fix.** The gate was strictly stronger before `d271ee2`.

**Fix.** Keep the AST walk for `.ts`/`.tsx` and fall back to a line-oriented scan for `.css`, so the
stylesheet keeps what it had. A CSS declaration is the element-equivalent unit:

```ts
const units: string[] = name.endsWith(".css")
  ? text.split(/[;{}\n]/)
  : classChunks(name, text).map((c) => c.chunk);

for (const chunk of units) {
  for (const m of chunk.matchAll(PREFIXED_OFFSET_WIDTH)) { … }
  if (chunk.includes("focus-visible:ring-ring") &&
      !chunk.includes("focus-visible:ring-offset-background")) { … }
}
```

Then add a fixture asserting an `@apply focus-visible:ring-ring;` with no offset colour is reported,
so the `.css` leg is *observed* working rather than argued.

---

### CR-03 — DS-10's only call-site icon check reads raw text; the positive tone's hue can be deleted and replaced with a comment naming it

**`tests/design/status-vocab.test.ts:339`** (`positiveIconSites`), **`:512`** (the set equality),
**`:537`** (the per-site check), **`:576`** (the `soft-accent` twin).

```ts
if (usesClass(text, STATUS_TONE_RECIPES.positive.icon)) scan.positiveIconSites.push(name);   // :339
…
expect(usesClass(body, icon), `${site} missing ${icon}`).toBe(true);                         // :537
```

`text` / `body` are `scan.text.get(name)` — the **raw** file, comments included. This is the same
grep-versus-comment collision the file's own header calls *"this phase's recurring"* one, and which
commit `9283617` fixed **in this same file, one commit earlier**, for the payout guard (`:491` now
runs `stripCommentLines` first). The icon checks were not swept with it.

D-14's thesis is *"green retreats to the icon"* — the icon is the entire non-colour-only signal in a
status chip, and this is the only mechanical check that the recipe's hue reaches a call site.

**Reproduced.** `src/components/host/payout-banner.tsx:55` changed from

```tsx
<CheckCircle2 className="size-3 text-success" aria-hidden="true" />
```

to

```tsx
{/* the hue used to be text-success here */}
<CheckCircle2 className="size-3" aria-hidden="true" />
```

→ **18/18 passed**. Both `:512`'s "re-treats exactly the four shipped status chips" set equality and
`:537`'s per-site `usesClass` are satisfied by the comment. The "Payouts enabled" badge becomes an
unhued glyph — the colour-only-to-no-colour regression DS-10 was written to prevent — and nothing in
405 tests notices.

Live risk in this exact file: `payout-banner.tsx:48` already carries prose explaining *"the
CheckCircle2 glyph that carries the hue"*. One edit that quotes the class instead of describing it
and the assertion is permanently satisfied by documentation. (All four pinned sites checked —
`booking-status-badge.tsx:59`, `payout-state-badge.tsx:43`, `payout-banner.tsx:55`,
`listing-card.tsx:267` — none is comment-backed today.)

**Fix.** Route both reads through the comment-stripped text and add the negative control the sibling
assertion already has (a fixture where only a comment names the class must not count):

```ts
const code = stripCommentLines(text);
if (usesClass(code, STATUS_TONE_RECIPES.positive.icon)) scan.positiveIconSites.push(name);
…
expect(usesClass(stripCommentLines(body), icon), `${site} missing ${icon}`).toBe(true);
```

Note this fix depends on WR-02 — `stripCommentLines` does not currently blank trailing comments, and
the evasion above uses a whole-line one, so CR-03's fix is only complete once WR-02 lands.

---

## WARNING

### WR-01 — CR-01's fix removed the only error affordance from a *checked* Checkbox / RadioGroupItem, and its recorded justification is false for those two primitives
**`src/components/ui/checkbox.tsx:17`**, **`src/components/ui/radio-group.tsx:29`**; justification at
**`src/components/ui/button.tsx:50-51`**.

`button.tsx:50` records why dropping the ring outright was safe: *"`aria-invalid:border-destructive`
already carries the error meaning."* True for Input, Textarea, Select, Switch, Toggle, Badge and
Button. **False** for Checkbox and RadioGroupItem, which both carry
`aria-invalid:aria-checked:border-primary` immediately after. Compiled with the installed Tailwind:

```css
.aria-invalid\:border-destructive           { &[aria-invalid="true"] { … } }                          /* (0,2,0) */
.aria-invalid\:aria-checked\:border-primary { &[aria-invalid="true"] { &[aria-checked="true"] { … } } }/* (0,3,0) — wins */
```

Radix sets `aria-checked` on both roots, so a **checked and invalid** control renders
`border-primary bg-primary` — no destructive cue of any kind. Before `7cb5d56` that state still had
`aria-invalid:ring-3 aria-invalid:ring-destructive/20` (confirmed against
`git show 7cb5d56^:src/components/ui/checkbox.tsx`) — a poor indicator at 1.44:1, but the only one.
The fix replaced it with nothing and recorded that it had replaced it with a border it does not get.

**Latent:** no call site currently puts either primitive under `FormControl` (`form.tsx:118`, what
sets `aria-invalid`); the three `<Checkbox>` and five `<RadioGroupItem>` sites are hand-wired. A
defect in the primitive's contract, not a shipping WCAG failure — hence Warning.

**Fix.**
```diff
- aria-invalid:border-destructive aria-invalid:aria-checked:border-primary
+ aria-invalid:border-destructive aria-invalid:aria-checked:border-destructive
```
(`destructive` on `background`/`card` is already a declared, measured row at 5.76:1.) If the primary
border is wanted for the checked state, that state needs its own solid cue and `button.tsx:50-51`
needs a carve-out naming these two files.

### WR-02 — `stripCommentLines` blanks only WHOLE-LINE comments, so the exact failure WR-04 was fixed for is still live
**`tests/design/brand-recipe.test.ts:282-320`/`:330-333`**, consumed at `:470`, `:474`, `:481`,
`:485`, `:502`, `:512`; duplicated verbatim at **`status-vocab.test.ts:240-278`** and
**`type-scale.test.ts:438`**.

*(Found independently by both slices.)* The first pass's WR-04 existed to stop the pinned counts
depending on "an unenforceable authoring convention (comments must *describe*, never *quote*, the
class)". The adopted stripper tests `/^\s*\/\//` and `/^\s*\{?\s*\/\*/` — both **line-anchored**. A
trailing comment survives, and trailing comments are the dominant habit in this codebase
(`theme-provider.tsx:59-65` has seven in a row).

Slice A's fixture probe:

```
full-line // comment       bg-brand hits: 0   variant="brand" hits: 0
trailing // comment        bg-brand hits: 1   variant="brand" hits: 0   <-- COUNTED
trailing /* */ comment     bg-brand hits: 1   variant="brand" hits: 0   <-- COUNTED
full-line block            bg-brand hits: 0   variant="brand" hits: 1   <-- COUNTED
```

Slice B reproduced it on a real surface — `src/components/booking/book-cta.tsx:219`:

```tsx
variant="secondary" /* was variant="brand" before the regression */
```

→ `brand-recipe.test.ts` **21/21 passed**, `npm run test:design` **405/405 passed**. The primary
booker CTA ("Book this space") is no longer coral and **all six** pinned counts stay green — the 15
total, the per-file `EXPECTED_CONVERSIONS` map, the 20 repo-wide total, the 5 host conversions, and
the `:538` positive control (also raw text). D-21's "coral appears on exactly the 20 buttons someone
asked for it" is satisfied by prose.

**Fix.** Strip trailing comments too, guarding the two hazards the existing comment already records
(`"https://…"`, `accept="image/*"`):

```ts
const lineComment = line.indexOf("//");
if (lineComment !== -1 && !insideStringAt(line, lineComment)) line = line.slice(0, lineComment);
const blockOpen = line.indexOf("/*");
if (blockOpen !== -1) {
  const blockClose = line.indexOf("*/", blockOpen + 2);
  line = blockClose === -1 ? (inBlock = true, line.slice(0, blockOpen))
                           : line.slice(0, blockOpen) + line.slice(blockClose + 2);
}
```

Add both hazards as fixtures. Better still, route the count paths through the AST literal walker the
suite already has two copies of (`focus-recipe.test.ts:150-185`), which sees only string literals and
therefore no comments at all — that also removes the three-way duplication rather than growing it.

### WR-03 — `focus-recipe`'s two per-chunk checks have no positive control and can be disarmed to zero files while reporting 14/14
**`tests/design/focus-recipe.test.ts:253-271`**, asserted at **`:359`** and **`:364`**.

Both assertions are `expect(list).toEqual([])`. The guard-the-guard block (`:284-298`) guards
`scan.scanned.length > 200`, but `scanned` is pushed at `:238` — *before* the `.css` gate — so it
says nothing about how many files the pairing checks inspected. The walker guard at `:402-410` calls
`classChunks` freshly on `button.tsx`; it never asserts `scanSrc()` used it.

**Reproduced.** `if (!name.endsWith(".css")) {` → `if (false) {` → **14/14 passed** with both checks
inspecting **zero files**. This is the first pass's WR-06 shape ("the assertion's anchor moved so the
check silently disarmed"), reintroduced by the WR-02 fix. Contrast `status-vocab.test.ts:508`, whose
equivalent assertion is `toEqual([LEGAL_FILLED_PAIRING_SITE])` — a non-empty expectation a zeroed
scan cannot satisfy.

**Fix.** Count what was inspected and pin a known-carrying file, the way the sibling does:

```ts
scan.chunksInspected += 1;
if (chunk.includes("focus-visible:ring-ring")) scan.recipeSites.push(`${name}:${line}`);

it("actually inspected class strings, so the empty lists mean something", () => {
  expect(scan.chunksInspected).toBeGreaterThan(500);
  expect(scan.recipeSites.some((s) => s.startsWith("src/components/ui/button.tsx:"))).toBe(true);
});
```

Do this with CR-02 — it is ~6 lines and it is what stops the next narrowing from being silent.

### WR-04 — `pair-drift`'s "NOT COVERED" list is now factually inverted, naming as a hole the exact shape the gate catches
**`tests/design/pair-drift.test.ts:79-82`**

The header still reads *"The lookup is ALPHA-BLIND … A component writing `bg-destructive
text-destructive` solid passes on the strength of the `/10` rows."* WR-05 removed that property:
`pairKey` (`:182-187`) now carries both opacities. Its own docstring at `:166` **acknowledges the
header is stale** without removing it, leaving the file self-contradicting.

**Reproduced.** `booking-row.tsx:59` → `<Card className="relative bg-destructive text-destructive">`:

```
× renders no foreground/background pairing the inventory does not declare
+   "destructive on destructive — not in CONTRAST_PAIRS; 1 site(s) …"
Tests  1 failed | 13 passed (14)
```

The named shape is caught, and `:501-512` asserts the opposite of the header in the same file. This
is the defect class the first pass's WR-01 raised, reintroduced by the fix that made the
justification obsolete.

**Fix.** Replace the bullet with what is now true and what is still a hole — `pairKey` drops
`alpha.over`, so a row measured `over: card` also legalises the same tint over any other surface
(see IN-11). That one is inherent to same-string analysis, not a fixable narrowing.

### WR-05 — `resolveMetadataBase` accepts *any* scheme, so `NEXT_PUBLIC_APP_URL=localhost:3000` still produces an unusable base
**`src/app/layout.tsx:73-77`**, comment at **`:66`**.

The guard is `configured && URL.canParse(configured)`. `URL.canParse` returns `true` for anything with
a scheme, and a scheme-less `host:port` *is* a scheme to the parser. Probed:

```
"example.com"         -> FALLBACK(localhost)   ← the case the comment names, handled
"localhost:3000"      -> localhost:3000        ← protocol "localhost:", origin null
"fitout.ph:443"       -> fitout.ph:443         ← protocol "fitout.ph:", origin null
"javascript:alert(1)" -> javascript:alert(1)

new URL("/og.png", new URL("localhost:3000")) -> THREW: TypeError Invalid URL
```

The `host:port` shape — what a person types when they forget the protocol, and the literal spelling
of `DEFAULT_APP_URL` minus `http://` — reinstates the same `TypeError` class WR-12 fixed, moved from
module evaluation to metadata resolution. The recorded promise *"A misconfigured origin degrades to
localhost"* is false for those inputs.

**Latent:** no route in `src/` declares `openGraph`, `twitter` or `alternates` metadata today, so
nothing resolves a relative URL against this base.

**Fix.** Require an HTTP(S) scheme:
```ts
if (configured && URL.canParse(configured)) {
  const url = new URL(configured);
  if (url.protocol === "http:" || url.protocol === "https:") return url;
}
return new URL(DEFAULT_APP_URL);
```

### WR-06 — `NEXT_PUBLIC_APP_URL` is a new, undocumented second origin variable; unset in production it silently pins `metadataBase` to localhost
**`src/app/layout.tsx:52`, `:74`**; **`.env.example`** (absent).

`git log -S` confirms this variable was introduced by this phase (`1ce8756`, plan 10-05), with one
consumer in the whole repo. It is **not** in `.env.example` — the committed file whose first line is
"Copy to .env.local and fill in" — nor in `.env.local`. Meanwhile `.env.example:28` already documents
`BETTER_AUTH_URL` as *"Base URL of the app … Set this to your real deployed origin in production"*.

A deploy that sets `BETTER_AUTH_URL=https://fitout.ph` and nothing else — the shape every existing
document points at — gets `metadataBase = http://localhost:3000` in production, with no warning from
Next (setting `metadataBase` is precisely what stops Next warning) and no gate. Two origin variables
that can disagree, one undocumented, is the drift class D-16 and D-18 exist to prevent elsewhere in
this phase.

**Fix.** Add `NEXT_PUBLIC_APP_URL` to `.env.example` beside `BETTER_AUTH_URL`, stating that the two
must match and why one is `NEXT_PUBLIC_` (it is inlined into the browser bundle) — or read
`BETTER_AUTH_URL` and delete the second name.

### WR-07 — the widened accent-alpha scan is token-scoped to `brand`, so `border-destructive/40` is still "neither measured nor exempted"
**`tests/design/brand-recipe.test.ts:255-256`**; shipping site
**`src/components/host/payout-state-badge.tsx:65`**; inventory header
**`src/lib/design/contrast-pairs.ts:22-36`**.

`10-REVIEW-FIX.md:104` records the CR-03 gate half as *"`UNMEASURED_ACCENT_ALPHA` policed `bg-` only
and now covers every colour role"*. It covers every *role* — for the token names `brand` and
`brand-foreground` only:

```
border-brand/30          -> HIT
text-brand-foreground/80 -> HIT
border-destructive/40    -> miss
bg-destructive/20        -> miss
```

`border-destructive/40` is a live, shipping composite (every host with a failed payout), measured
with the suite's own arithmetic at **2.126 : 1** over `--card` in both themes against a 3.0 non-text
bar. Not a `CONTRAST_PAIRS` row, not an `EXCLUDED_PAIRS` row, not matched by any scan — precisely the
third state `contrast-pairs.ts:34-36` says must not exist. This was the third item of the first
pass's IN-05; the other two were resolved, and it is reported now because *the widening that was
supposed to catch it exists and does not*.

**Fix.** It is very likely legal — like `--border` it is a container edge, never the sole boundary
(the Alert also carries `text-destructive` at 5.76 and a solid destructive glyph). Add it to
`EXCLUDED_PAIRS` with `measured: "2.13 (court) / 2.13 (grove)"` and that reason, and generalise the
scan's token alternation beyond the brand family. See WR-08 and WR-09 — same root cause.

### WR-08 — the phase now carries two hand-written "colour role" lists that can drift — the defect WR-07's own fix removed, reproduced one file over
**`config/design-leak-patterns.mjs:65-66`** (`COLOUR_ROLE`) vs
**`tests/design/brand-recipe.test.ts:255-256`** (the accent scan's inline alternation).

`9c9d641` correctly introduced `COLOUR_ROLE` as *"one shared regex fragment … so the two cannot drift
apart on which roles they police"*, naming directional edges and prefixed roles as the missed
families. `d67cfe3`, landing two hours earlier in the same pass, wrote a second, shorter role list by
hand into the accent scan without those families:

```
border-b-brand/30    -> accent-alpha: miss
border-t-brand/40    -> accent-alpha: miss
divide-x-brand/50    -> accent-alpha: miss
```

So `border-b-gray-200` is banned by the leak gate while `border-b-brand/40` — a diluted accent edge,
the exact shape `border-brand/30` had to be measured and exempted for — is invisible. Zero instances
today; latent, as WR-07 was.

**Fix.** Export `COLOUR_ROLE` from `config/design-leak-patterns.mjs` and build
`UNMEASURED_ACCENT_ALPHA` from it, the way the palette and white/black patterns now do.

### WR-09 — `text-foreground/60` is a shipped, undeclared, unmeasured diluted ink at two sites
**`src/components/booking/bookings-tabs.tsx:52`** and **`src/components/ui/tabs.tsx:66`**

```ts
const TRIGGER_IDLE = "text-foreground/60 hover:text-foreground";
```

Both paint the inactive tab label on the `bg-muted` list track. This is exactly CR-03's shape from
the first pass — a diluted **ink** on a filled surface — and it sits in the third state
`contrast-pairs.ts:22-36` says must not exist: neither an `fgAlpha` row nor an `EXCLUDED_PAIRS` row.

| theme | `--foreground` | `--muted` | composited ink | ratio |
|---|---|---|---|---|
| court | `#0a0a0a` | `#f5f5f5` | `#686868` | **5.11 : 1** |
| grove | `#051211` | `#eaf3f2` | `#616c6b` | **4.81 : 1** |

Both clear 4.5 + 0.05, so this is **not** a shipped WCAG failure — hence Warning. It is a coverage
finding: nothing measures it, and grove's 4.81 has 0.26 of headroom against a token free to move.
Invisible because the ink and fill are on two different elements (`pair-drift`'s documented blind
spot) and because the widened scan is brand-scoped (WR-07).

**Fix.** Declare it, since it passes:
```ts
{ fg: "foreground", bg: "muted", bar: TEXT_BAR, fgAlpha: 0.6,
  note: "Inactive tab label on the segmented control's muted track (bookings-tabs.tsx:52, ui/tabs.tsx:66). 5.11 court / 4.81 grove." },
```

### WR-10 — nothing gates the hazard CR-01's deviation is argued on: a bare ring WIDTH with no ring COLOUR
**`tests/design/focus-recipe.test.ts:152-161`**

`PREFIXED_OFFSET_WIDTH` reports any ring-**offset** width whose matching offset **colour** is missing
at the same variant prefix, because Tailwind's default offset is a hardcoded white. Exactly right —
and there is no counterpart for the ring itself, even though `7cb5d56` established (and this review
independently confirmed) that an uncoloured ring falls back to `currentcolor`.

`button.tsx:52-53` closes with *"Do not reintroduce a ring colour on a STATE variant here."* True —
but the deviation's *other* half, the reason the width had to go too, has no gate at all.
`aria-invalid:ring-3` can be re-added tomorrow, ship a 3px near-black halo on every invalid field,
and the suite stays at 405 green. Probe over every string literal in `src/`: **0 offenders today**.

**Fix.** Mirror the existing check:
```ts
const PREFIXED_RING_WIDTH = /(^|[\s"'`])((?:[^\s"'`]*:)?)ring-([1-9]\d*)(?![\w./-])/g;
// violation when the same chunk has no `${prefix}ring-<letter…>` and no `${prefix}ring-[`
```

### WR-11 — the hex leak pattern misses a hex preceded by a space, the shape inside every multi-value CSS string
**`config/design-leak-patterns.mjs:91-92`**

CR-02 correctly added `[` and `_` for the Tailwind arbitrary form. A plain space is deliberately
absent so `see #3388 for details` does not match — but a space is what separates the parts of an
inline `style` value, an SVG attribute, or a CSS shorthand. Probed against the shipped
`findDesignLeaks`:

```
"#E8484E"                      -> ["raw-hex"]
"bg-[#E8484E]"                 -> ["raw-hex"]
"shadow-[0_1px_2px_#00000010]" -> ["raw-hex"]
"0 1px 2px #00000010"          -> []   <-- box-shadow in a style object
"1px solid #ccc"               -> []   <-- border shorthand
"inset 0 0 4px #000000"        -> []
```

Both halves of D-16 share the hole (`eslint.config.mjs:57` runs the same list against `node.value`).
`style={{ boxShadow: "0 2px 8px #0000001a" }}` is a frozen colour surviving a theme switch — the
single failure DS-13 exists to prevent — invisible to `npm run lint` **and** `npm run test:design`.
Latent: three inline `style` props in the tree today, none carrying a colour.

**Fix.** Admit a space anchored on what actually distinguishes CSS from prose (a digit, `)`, `%` or
`,` before it, versus a word character in prose), and add all four probed shapes to the `:348`
fixture block — the CR-02 commit's own standard.

### WR-12 — the open-redirect guard is defeated by a backslash (`/\evil.com`) — pre-existing, not this phase
**`src/app/(auth)/login/page.tsx:65-69`**

```ts
return raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
```

The WHATWG URL parser treats `\` as `/` for special schemes, so `/\evil.com` passes both conditions:

```
"//evil.com"  -> guard: "/"          -> resolves: https://fitout.example/
"/\\evil.com" -> guard: "/\\evil.com"-> resolves: https://evil.com/        <-- bypass
```

The value reaches `router.push(safeCallbackUrl())` (`:92`) and
`authClient.signIn.social({ callbackURL: safeCallbackUrl() })` (`:98`), the latter surviving a full
OAuth round-trip.

**Recorded honestly: end-to-end exploitability was NOT verified.** Whether Next's App Router
navigates cross-origin on a `pushState`-shaped href, and whether Better Auth's `trustedOrigins`
rejects the social `callbackURL`, both need a running browser + auth server this environment lacks.
What is proven is that the guard does not do what its own comment says, on a link an attacker fully
controls.

**Pre-existing** — `git log -L` puts it at `487bda7` (phase 4); phase 10 only restyled this file.
Reported because the file is in the reviewed slice. **Worth a separate security ticket** rather than
folding into a design-system fix pass, and it wants the end-to-end verification this environment
could not do.

**Fix.** Parse rather than prefix-match, and reject anything whose origin moves:
```ts
const url = URL.parse?.(raw, window.location.origin);
if (!url || url.origin !== window.location.origin) return "/";
return `${url.pathname}${url.search}${url.hash}`;
```

---

## INFO

- **IN-01** — `slot-picker.tsx:234` records "Solid measures 4.57 / 4.53". Grove's `brand-foreground`
  on `brand` is **4.572**, not 4.53 (court 4.566). Matters because `AA_EPSILON = 0.05` puts the
  threshold at 4.55: as written the comment says the CR-03 fix lands *below* the phase's own bar on
  grove, while the `CONTRAST_PAIRS` row for the same pairing is green. The error came across from the
  first review's CR-03 table.
- **IN-02** — `input-group.tsx:131`, `:147` still carry `aria-invalid:ring-0` on `InputGroupInput` /
  `InputGroupTextarea`. Those zeroed the invalid ring CR-01 deleted; there is nothing left to zero.
  Dead code that reads as live intent, and its `focus-visible:ring-0` neighbour *is* load-bearing.
- **IN-03** — `src/app/dev/theme/fixtures.ts:305-306` still says the invalid-field fixture "is what
  puts the destructive border treatment **and the error ring** on a REAL control". CR-01 removed the
  ring. `page.tsx:276`'s twin note was updated; this one was missed — and `/dev/theme` §6 is the one
  place a reviewer looks at the invalid state.
- **IN-04** — `10-REVIEW-FIX.md:270-272` lists `badge.tsx`'s destructive link-hover as one of "two
  changes visible in the product". Not reachable: zero `<Badge variant="destructive">` call sites (the
  two hits are `<Alert>`s), zero `<Badge asChild>`, and the compiled `[a]:` variant is `&:is(a)` —
  self-referential, so the Badge itself must be the anchor. The fix is right; the claim that it
  changed a rendered surface is not supportable.
- **IN-05** — `type-scale.test.ts:96-109` slices `css.slice(css.indexOf("@theme inline"))` to **end of
  file**, not to the block's closing brace, while the comment describes it as reading "the `@theme
  inline` block". Over-report direction only (a red test, not a silent pass). Separately, a role
  spelled `--text-caption: var(--fs-caption-sm)` fails the `m[1] === m[2]` test and is silently missed.
- **IN-06** — both widened scans match only a **numeric** opacity modifier (`\/\d+`). Unmatched:
  `bg-brand/[0.34]`, `ring-brand/[.5]`, `ring-destructive/[20%]`. Tailwind accepts all three and
  `pair-drift.test.ts:246` explicitly handles the arbitrary form (keying `NaN`, fail-closed) — so one
  of three gates knows the shape exists and two do not. Zero instances in the tree.
- **IN-07** — `eslint.config.mjs:21` destructures `LEAK_DISABLE_RULE_ID.split("/")` without asserting
  there were exactly two segments. A scoped id silently drops a segment; an id with no slash yields
  `undefined` as the rule key while the rules entry still names the full string, surfacing as an
  unrelated ESLint "could not find rule" error. The derivation is WR-14's whole point; it needs a
  one-line arity guard.
- **IN-08** — `config/design-leak-patterns.mjs:115`: WR-07 made `color-function` case-insensitive but
  left `arbitrary-text-px` case-sensitive. `findDesignLeaks("text-[14PX]")` → `[]`. One `i` flag.
- **IN-09** — `leak.test.ts:178` and `eslint.config.mjs:58` both use `pattern.exec(text)`, so only the
  **first** match per pattern per literal is reported. A class string with two hexes names one; the
  second surfaces only after the first is fixed.
- **IN-10** — `pair-drift.test.ts:236-241`: the `edge` role (`border-`/`ring-`) is classified, stored
  on every `ClassUse`, and consumed by nothing. Dead in the production path, alive only in the `:468`
  fixture.
- **IN-11** — `pair-drift.test.ts:182`: `pairKey` drops `alpha.over`, so the inventory's two
  `destructive/10` rows (over `background`, over `card`) collapse to one key and a row measured
  `over: card` also legalises the tint over any other surface. Inherent to same-string analysis, but
  no longer stated anywhere now that the "alpha-blind" bullet is wrong (WR-04).
- **IN-12** — `pair-drift.test.ts:156`: `alphaSuffix` rounds to an integer percent, so a future row
  with `alpha.value: 0.125` keys `@13%` and can never match a Tailwind `/12` modifier — a silently
  unmatchable declaration rather than a loud one.
- **IN-13** — `focus-recipe.test.ts:166` / `status-vocab.test.ts:198`: template literals are visited as
  separate head/middle/tail chunks, so a recipe split across an interpolation on one element reports
  as unpaired. False-positive direction (safe); none present today.
- **IN-14** — `notification-bell.tsx:150`: `<ScrollArea className="max-h-96">` puts a *max*-height on
  the Radix Root while the Viewport is `size-full`. A percentage height against a parent with only
  `max-height` resolves to `auto`, so the panel may overflow instead of scrolling; the shadcn idiom is
  a definite height. **Not reproduced** — needs a real browser, the class of thing the design gates
  explicitly say they cannot see.
- **IN-15** — `tests/booking/booking-status.test.ts:120-121`, `:126-127`: `expect(view.tone).toBe("neutral")`
  immediately followed by `expect(view.tone).not.toBe("positive")`. The second is subsumed and cannot
  fail independently.
- **IN-16** — `dialog.tsx:86-87`: `<XIcon />` carries no `aria-hidden="true"`, unlike every other
  lucide glyph in the tree. The `<span className="sr-only">Close</span>` supplies the accessible name,
  so impact is nil today; the inconsistency is the finding.

---

## Verified sound

Stated explicitly so the above is not read as a verdict on the fix pass.

**The contested deviation was correct.** The fixer overrode the first review's suggested CR-01 fix,
dropping `aria-invalid:ring-3`'s **width** as well as its colour on the argument that Tailwind v4
gives `--tw-ring-color` no initial value. Confirmed against the compiled stylesheet
(`@tailwindcss/postcss` 4.3.0, `@source inline("aria-invalid:ring-3")`):

```css
.ring-3 { --tw-ring-shadow: … var(--tw-ring-color, currentcolor); }
@property --tw-ring-color { syntax: "*"; inherits: false; }   ← no initial-value
```

An unfocused invalid control would have painted a 3px `currentcolor` (near-black) halo. The
deviation is justified and the argument is reproducible.

**The recorded arithmetic reproduces**, re-implementing `contrast.test.ts:70-95` against
`tokens.generated.ts`: CR-03's 3.381/3.509, the anchor ring's 2.227/2.030, `border-brand/30`'s
1.595/1.491, `destructive-foreground` 5.517. All match to the recorded precision (one exception,
IN-01).

**Narrowing A′ — the one coverage *narrowing* in the fix pass — could not be abused.** The reason is
structural, not luck: `stateOverridesOpposite` returns `false` when `fg.chain === bg.chain`
(`pair-drift.test.ts:310`), and `"" === ""`, so an unconditional × unconditional pairing is
unskippable. A mixed-chain skip fires only when the same chain string declares the opposing role —
i.e. when that state genuinely overrides the resting half, in which case the state's own pairing is
checked on the equal-chain path. Recorded as **could not reproduce**.

**Eight hardenings genuinely close their motivating case,** each probed rather than read:
- **WR-02's `.tsx` half** — a second element on `booking-row.tsx` with `focus-visible:ring-offset-2`
  and no offset colour → 2 failures naming the exact line. (The `.css` half is CR-02.)
- **WR-05** — the solid form of a declared `/10` pairing is now reported by key.
- **WR-06** — both `indexOf` anchors asserted before `slice`, with failure messages that say to
  re-point rather than delete. `generateMetadata` → loud failure; `} satisfies Metadata;` → loud failure.
- **WR-10** — `ROLES` parsed from `@theme inline`, `TYPE_ROLES` exported, the two compared, with a
  guard-the-guard floor so an empty derivation cannot pass.
- **WR-11** — `hexOf` probed over 9 values: throws on the recorded out-of-gamut value, on a barely-out
  chroma 0.236, on alpha, on garbage; correct hex for all six shipped tokens; importing runs no `main()`.
- **WR-13** — branches on `state === "failed"`, cast gone, `BADGE_RECIPES` keyed
  `Exclude<PayoutLedgerState, "failed">` so a new state fails to compile. `9283617`'s gate half asserts
  the derived-value form is **absent** — that negative is what holds the line, and it does.
- **WR-14** — plugin key, rule name and rules entry all computed from the one constant; a rename cannot
  desynchronise the two halves.
- **CR-02 (first pass)** — `bg-[#E8484E]`, `text-[#fff]`, `border-[#000]`, `shadow-[0_1px_2px_#00000010]`
  all flag; the `#3388` prose negative and the phase's own `bg-[color-mix(…)]` still do not; the rule
  fires end-to-end through ESLint. (Its residual gap is WR-11.)

**Other composites on the swept surface were re-measured and none fails:** the alert description's
`text-destructive/90` on `--background` (5.24 / 5.11), `muted-foreground` on `bg-muted/40` and `/50`
over both card and background (5.03–5.68), `foreground` on `bg-muted/40` (19.13 / 18.17). Only
`text-foreground/60` (WR-09) is close, and it clears.

**`contrast.test.ts`'s `fgAlpha` compositing order is correct** — the ink composites over the
*already composited* background (`:176`), the only order that is right when a row carries both
`alpha` and `fgAlpha`.

**`vitest.design.config.ts` / `vitest.config.ts` are correctly disjoint** — the design suite declares
no `globalSetup`/`setupFiles` and the main config excludes `tests/design/**`, so the design gate
genuinely cannot reach for Postgres.

**No regression in the numbers:** 405/405, `tsc` clean, 0 lint errors, 9 pre-existing warnings.

---

## Recommended order

1. **CR-03** — one-line change (`stripCommentLines` on two reads) protecting the assertion that
   carries DS-10's entire a11y claim. Land **WR-02 first**, or the stripper it depends on is still
   trailing-comment blind.
2. **WR-02** — fix the stripper once and re-copy to `status-vocab.test.ts:244` /
   `type-scale.test.ts:438`, with the `accept="image/*"` and `https://` fixtures the existing comment
   already argues for. This unblocks CR-03 and closes a live evasion on the primary booker CTA.
3. **CR-02 + WR-03** — a coverage regression the fix pass introduced, plus the positive control that
   stops the next narrowing from being silent. ~6 lines together; do them as one change.
4. **CR-01** — the union-per-`className` walk. Larger than the others, and it should land with the
   `cn()`-split shape added to the `:597` control.
5. **WR-01** — the checked+invalid border. One class each in two primitives, plus correcting the note
   in `button.tsx:50-51` that is currently false for them.
6. **WR-07, WR-08, WR-09** — one root cause: the accent scan is token-scoped to `brand` and there are
   now two hand-written role lists. Fix as one change: export `COLOUR_ROLE`, build the scan from it,
   generalise the token side, then declare `text-foreground/60` and exempt `border-destructive/40`
   with their measured numbers.
7. **WR-05, WR-06** — the `metadataBase` scheme guard and the undocumented env var. Both cheap; WR-06
   is the one that bites a real production deploy.
8. **WR-04, WR-10, WR-11** — documentation truth, one mirrored ring check, one regex plus fixtures.
9. **WR-12** — pre-existing and outside this phase's edit. Separate security ticket; it wants the
   end-to-end verification this environment could not do.

`/gsd-code-review 10 --fix` will attempt the mechanical ones. CR-01's AST walk and WR-01's choice of
checked-state cue involve judgement and are better done deliberately.

---

_Reviewed: 2026-08-12 · standard depth · 2 slices · re-review of `0231949..2ae81de`_
_Every evasion above was applied to the working tree, run, and reverted. `git status` is clean._
