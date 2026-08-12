---
phase: 10-design-system-foundation-theme-runtime
fixed_at: 2026-08-12
review_path: .planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md
iteration: 2
supersedes: "the first fix pass's report (git show 2ae81de:.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW-FIX.md)"
fix_range: 40d7cbe..ce155fe
findings_in_scope: 15
fixed: 15
skipped: 0
status: all_fixed
---

# Phase 10 — Code Review Fix Report (iteration 2)

**Fixed at:** 2026-08-12
**Source review:** `.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW.md` (the re-review of `0231949..2ae81de`)
**Iteration:** 2
**Commits:** `40d7cbe..ce155fe`, nine of them, one per finding group

**This file replaces the FIRST fix pass's report.** That report is not lost: it is preserved in git at
`2ae81de` and readable with
`git show 2ae81de:.planning/phases/10-design-system-foundation-theme-runtime/10-REVIEW-FIX.md`.
This one covers the 3 Critical and 12 Warning findings the re-review raised against that pass's work.

**Summary**

- Findings in scope: **15** (CR-01..CR-03, WR-01..WR-12)
- Fixed: **15**
- Skipped: **0**
- Out of scope by instruction, untouched: IN-01..IN-16

---

## The one thing this pass did differently

The re-review's headline was that the previous pass **repeatedly wrote a comment claiming a gate now
closed an escape, without ever running the escape against the hardened gate**. All three Criticals
were that failure.

So every gate hardened here was verified the same way, in this order:

1. Construct the evasion the finding describes, in the real tree.
2. Run the gate. **Observe it pass** — confirming the finding.
3. Apply the fix.
4. Run the same evasion again. **Observe it fail**, and check the failure message names the file.
5. Revert the evasion. Re-run everything.

Every "verified" claim below is step 4, not step 3. The observed numbers are quoted.

Two findings had nothing to evade (WR-04 is a false comment, WR-06 a missing env var). For those,
the *claim* was run instead: WR-04's "NOT COVERED" shape was applied to the tree and observed going
**red**, which is what proved the comment inverted.

---

## Verification

Run in the main repo (dependencies present), after every fix and again at the end.

| Command | Baseline (`40d7cbe`) | Final (`ce155fe`) |
|---|---|---|
| `npm run test:design` | 20 files / 405 tests passed | **21 files / 441 tests passed** |
| `npx tsc --noEmit` | clean (exit 0) | **clean (exit 0)** |
| `npm run lint` | 0 errors, 9 warnings | **0 errors, 9 warnings** (same 9, pre-existing) |
| `git status --porcelain` | `?? scope.tmp.txt` | **`?? scope.tmp.txt`** |

The test count rose by 36 across one new file and five existing ones. **No pre-existing assertion was
weakened, disabled or re-pinned to a looser number.** Every previously-pinned count — the 15 and 20
brand conversions, the per-file `EXPECTED_CONVERSIONS` map, the 8 surviving accents, the 54 dark
variants, the single legal filled-green site, the 6-site hand-rolled-height ceiling — is unchanged
and still green.

**`npm test` (the main unit suite) was NOT run.** It requires a provisioned Postgres that this
environment does not have. Non-design suites therefore remain unexercised by this pass, exactly as
they were by the previous one and by the review. The one new file added outside the design suite
(`tests/security/safe-callback-url.test.ts`, 9 tests) *was* executed here, via a throwaway
DB-free Vitest config, and both its green and its red state were observed — see WR-12.

Three changes deliberately alter gate behaviour and are intended, not weakening: WR-02 changes the
comment stripper, CR-02 restores `.css` coverage that a previous fix deleted, WR-04 rewrites a stale
header comment.

---

## Fixed Issues

### CR-01 — the retired-pairing gate was evadable by a `cn()` split

**Files:** `tests/design/status-vocab.test.ts` · **Commit:** `806436a`

The gate's unit was one string literal, and the doc comment claimed detecting the two classes
independently "removes every one of those escapes at once". It did not remove the `cn()`-split one.

**Verified.** `booking-row.tsx:59` changed to
`<Card className={cn("relative bg-success", "text-success-foreground")}>` →
`status-vocab.test.ts` **18/18 passed**, `pair-drift.test.ts` green too (34/34 across both). After
the fix, the same evasion → **1 failed / 22 passed**, the failure listing
`src/components/booking/booking-row.tsx` as a second filled `--success` surface.

The unit is now the **element**: `classSetsForElements` unions every literal beneath one `className`
JSX attribute, and separately beneath any `cn()`/`clsx()`/`twMerge()` call, keeping the per-literal
sets as well. A new positive control asserts five split shapes are invisible to the old unit and
caught by the new one, and a counter-test asserts a fill on a parent with an ink on a child is *not*
reported — the widening must not cry wolf.

**One escape is left open and is recorded as open, not claimed closed.** A pairing split across a
`cva` BASE and one of its VARIANTS is still invisible, because unioning a `cva()` call would merge
mutually-exclusive variants and report combinations no props can produce. There is an assertion
pinning that gap so it cannot silently become untrue, with a note saying to delete the test if a
future change closes it. The superlative sentence in the header is gone.

### CR-02 — the `.css` leg had been deleted from both focus pairing checks

**Files:** `tests/design/focus-recipe.test.ts` · **Commit:** `613a66e`

WR-02 of the first pass narrowed both checks from whole-file text to one class string, implemented
with the TypeScript AST walker — which returns nothing for a stylesheet. The `.css` leg was not
narrowed, it was dropped, and the justification written in its place contradicted the file's own
header.

**Verified.** `@apply focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2;`
added to `globals.css`'s `@layer base` body rule → **14/14 passed** while the stylesheet shipped
Tailwind's hardcoded `#fff` offset band on every focusable element. After the fix, the same line →
**2 failed / 17 passed**, both naming `src/app/globals.css:469` and quoting the missing
`focus-visible:ring-offset-background`.

A `cssDeclarations` walker now supplies the `.css` unit (a declaration, split on `;{}` and newline,
with line numbers), and both checks run over both legs. The `.css` leg is exercised by two fixtures
rather than argued for — one asserting the offending `@apply` is reported at the right line, one
asserting a correct sibling declaration cannot vouch for a broken one.

### CR-03 — DS-10's only call-site icon check read raw text

**Files:** `tests/design/status-vocab.test.ts` · **Commit:** `97ba8b5`

D-14's thesis is "green retreats to the icon", making the glyph the entire non-colour-only signal in
a status chip — and the only mechanical check that the hue reaches a call site read the raw file,
comments included.

**Verified.** `payout-banner.tsx:55` changed to `{/* the hue used to be text-success here */}` above
an unhued `<CheckCircle2 className="size-3" />` → **18/18 passed**. After the fix, the same edit →
**3 failed / 17 passed**, with `src/components/host/payout-banner.tsx missing text-success`.

Both reads now go through the shared stripper, as does `declaresIcon` — which was the same defect in
the same file and had also not been swept. A negative control asserts three comment shapes that name
the class do **not** satisfy the check while the real form still does, and a guard-the-guard asserts
the stripper did not eat the real hue from the four pinned sites.

**Landed after WR-02, as the review required** — the evasion uses a whole-line comment, and until
WR-02 the stripper was trailing-comment blind, so CR-03 applied first would have looked done.

### WR-01 — a checked + invalid Checkbox / RadioGroupItem had no error affordance

**Files:** `src/components/ui/checkbox.tsx`, `src/components/ui/radio-group.tsx`,
`src/components/ui/button.tsx`, `tests/design/focus-recipe.test.ts` · **Commit:** `563f91f`

**This was the first of the two judgement calls. Decision: APPLIED, with a gate.**

The reasoning: the state had **no error cue of any kind**, and the proposed fix restores one using a
token that is already a declared, measured row. Refining *how* a checked+invalid control should look
(e.g. whether the fill should also change) is a designer's call, but it is an additive one — shipping
a declared cue instead of none is not a design decision, it is a defect fix. So the review's proposal
was taken as written.

**The specificity claim was verified by compiling, not assumed.** Against the installed Tailwind:

```css
.aria-invalid\:border-destructive           { &[aria-invalid="true"] { … } }            /* (0,2,0) */
.aria-invalid\:aria-checked\:border-primary { &[aria-invalid="true"] {
                                              &[aria-checked="true"] { … } } }          /* (0,3,0) */
.data-checked\:border-primary               { &:where([data-state="checked"]) { … } }   /* (0,1,0) */
```

The nested rule wins on specificity regardless of source order, and `data-checked:` sits inside
`:where()` so it never competed. Radix sets `aria-checked` on both roots. Confirmed.

Both primitives now point the state-scoped rule at `border-destructive`. `button.tsx:50-51`'s note —
which said the destructive border "already carries the error meaning", true of seven primitives and
false of these two — is corrected and now carries the carve-out the review asked for.

**Gated, so it cannot regress.** A new scan asserts every colour utility whose variant chain mentions
the invalid state names the destructive token, read from stripped code so the notes explaining the
decision neither satisfy nor trip it. **Verified**: re-introducing `aria-invalid:aria-checked:border-primary`
on `checkbox.tsx` → **1 failed / 20 passed**, naming the file and the class.

### WR-02 — `stripCommentLines` blanked only WHOLE-LINE comments

**Files:** `tests/design/helpers/strip-comments.ts` (new), `tests/design/strip-comments.test.ts`
(new), `brand-recipe.test.ts`, `status-vocab.test.ts`, `type-scale.test.ts`, `dark-scope.test.ts`
· **Commit:** `d39a1d6`

**Verified.** `book-cta.tsx:219` changed to
`variant="secondary" /* was variant="brand" before the regression */` → `brand-recipe.test.ts`
**21/21 passed** with the primary booker CTA no longer coral and all six pinned counts green. After
the fix, the same edit → **3 failed / 18 passed**: the 15 total (`expected 14 to be 15`), the
per-file map, and the repo-wide 20 (`expected 19 to be 20`).

There were **four** copies of the stripper, not three — `dark-scope.test.ts` had a fourth. All four
are gone, replaced by one shared quote-aware scanner.

**It is a character scanner, not an `indexOf`, and that is load-bearing.** The two hazards the old
strippers were line-anchored *for* are real shapes in this tree: `accept="image/*"` (a naive block
open eats 86 lines) and `"https://…"` (a `//` inside a string). Both are handled by tracking quote
state and recognising a comment opener only outside a string, and both are fixtures.

**Measured before adoption rather than argued.** The new stripper was run over every `.ts`/`.tsx`/`.css`
file under `src/` alongside the old one: every token the phase pins a count on came back with an
**identical count in every file**, and the comment-dense modules that shrink most under stripping
(`src/lib/utils.ts` 45→9 non-blank lines, `globals.css` 472→239) produced **byte-identical output**
under both. The change adds coverage and removes nothing.

Quote state resets at each newline; block state does not. The asymmetry is the safety property: a
stray apostrophe in JSX prose costs at most one un-stripped comment on its own line, which
over-counts, and over-counting fails a pinned assertion **loudly**. It can never under-count, which
is the silent direction that shipped a grey CTA.

### WR-03 — `focus-recipe`'s per-chunk checks had no positive control

**Files:** `tests/design/focus-recipe.test.ts` · **Commit:** `613a66e` (with CR-02, as the review advised)

**Verified.** Replacing the unit-source condition with `if (false)` → **14/14 passed** with both
checks inspecting zero files. After the fix, zeroing the unit source → **2 failed / 17 passed**
(`expected 0 to be greater than 500` and `expected 0 to be greater than 100`).

The scan now counts what it inspected and records a **non-empty** expectation — the recipe must be
seen in `button.tsx` — modelled on `status-vocab.test.ts`'s sibling. The `.css` units are counted
separately, because `.css` is one file among 200+ and a silently-zeroed `.css` leg would move the
overall count by a rounding error.

### WR-04 — `pair-drift`'s "NOT COVERED" list was factually inverted

**Files:** `tests/design/pair-drift.test.ts` · **Commit:** `df05826`

**Verified — the claim was run.** `booking-row.tsx:59` → `<Card className="relative bg-destructive
text-destructive">`, the exact shape the header called a hole, → **1 failed / 13 passed**:
`destructive on destructive — not in CONTRAST_PAIRS; 1 site(s), e.g. src/components/booking/booking-row.tsx:59`.

The bullet is replaced with what is now true (WR-05 put both opacities in the key, and the named
shape is caught — with the reproduction recorded so the next reader runs it rather than trusting the
sentence) and what is **still** a hole: `pairKey` drops `alpha.over`, so the two `destructive/10`
rows collapse to one key and a row measured over `card` legalises the tint over any surface (IN-11).
That one is inherent to same-string analysis — the class string carries no information about what is
behind it — and is stated as such. The `pairKey` docstring, which acknowledged the header was stale
without fixing it, is corrected to match.

### WR-05 — `resolveMetadataBase` accepted any scheme

**Files:** `src/app/layout.tsx` · **Commit:** `151f5e2`

**Verified.** Probed against this Node, reproducing the review exactly:

```
"example.com"         -> canParse false -> falls back           (the case the comment names)
"localhost:3000"      -> canParse TRUE, protocol "localhost:",  origin null
"fitout.ph:443"       -> canParse TRUE, protocol "fitout.ph:",  origin null
"javascript:alert(1)" -> canParse TRUE, protocol "javascript:", origin null
new URL("/og.png", new URL("localhost:3000"))  ->  THREW: TypeError Invalid URL
```

The guard now requires `http:` or `https:`. Re-probed after the fix: all four fall back to localhost,
`https://fitout.ph` and `http://fitout.ph:8080` still resolve, `HTTPS://FitOut.ph` normalises and
passes, `file:///etc/passwd` falls back, and every case resolves `/og.png` without throwing.

Latent — no route in `src/` declares `openGraph`, `twitter` or `alternates` metadata today — so this
is a guard rather than a live bug fix, and it is recorded that way in the code.

### WR-06 — `NEXT_PUBLIC_APP_URL` was a new, undocumented second origin variable

**Files:** `.env.example` · **Commit:** `151f5e2`

Added beside `BETTER_AUTH_URL`, stating that the two must match, why one carries the `NEXT_PUBLIC_`
prefix (it is inlined into the browser bundle **at build time**, so it must be set when you build),
what silently goes wrong if it is missing (metadataBase pins to localhost in production and Next does
not warn — setting `metadataBase` is precisely what suppresses that warning), and that a scheme-less
`host:port` parses but is rejected by the WR-05 guard.

### WR-07 / WR-08 / WR-09 — one root cause: the accent scan was token-scoped and there were two role lists

**Files:** `config/design-leak-patterns.mjs`, `tests/design/brand-recipe.test.ts`,
`src/lib/design/contrast-pairs.ts` · **Commit:** `09c5df7` (one change, as the review advised)

**Both measurements were reproduced with the suite's own arithmetic before anything was declared:**

| composite | court | grove | review said |
|---|---|---|---|
| `foreground/60` on `muted` | **5.111** (ink `#686868`) | **4.812** (ink `#616c6b`) | 5.11 / 4.81 ✓ |
| `destructive/40` over `card` | **2.126** | **2.126** | 2.126 ✓ |

**WR-08** — `COLOUR_ROLE` is now **exported** from `config/design-leak-patterns.mjs` and the accent
scan is built from it, so the two lists cannot disagree because there is one list. **Verified**:
`border-b-brand/40` added to `spots-left-chip.tsx` — a directional edge the old hand-written
alternation missed — → **red**, naming the file.

**WR-07** — a new repo-wide scan inventories **every** diluted colour utility, whatever token it
names. **Verified**: `bg-accent/35` added to `booking-row.tsx` → **red**, listing `accent/35` as a
composite nothing has measured.

This is deliberately a **pinned inventory, not a zero-violations assertion**, and the reasoning is
recorded in the file. Twenty distinct diluted shapes ship today; asserting zero would have meant
writing twenty exemptions I had not measured, which is the same "a comment asserts what nobody
checked" failure this whole review exists to correct. Each shipped shape is named with its status —
`declared` / `exempt` / `inert` (second-colour-scheme only) / `recorded` — and a shape appearing that
the map does not name goes red at the file that introduced it. The brand family stays at **zero**
through the narrower scan. *(The gate immediately proved itself by catching `brand/30`, which I had
omitted from my own first draft of the map.)*

**WR-09** — `foreground` on `muted` at `fgAlpha: 0.6` is now a declared `CONTRAST_PAIRS` row.
**Verified it is genuinely measured, not merely present**: dropping the alpha to `0.3` → **2 failed**,
one per theme, with the composited hexes in the message.

**WR-07's exemption** — `destructive-40 on card` is now an `EXCLUDED_PAIRS` row with
`measured: "2.13 (court) / 2.13 (grove)"` and the container-edge reason, alongside `--border` and
`--input`. The `fg` names the composite rather than the raw token, because the solid
`destructive on card` at 5.76 is a separate, passing row and the two must not collide.

### WR-10 — nothing gated a bare ring WIDTH with no ring COLOUR

**Files:** `tests/design/focus-recipe.test.ts` · **Commit:** `df05826`

CR-01's deviation deleted `aria-invalid:ring-3`'s width as well as its colour, because Tailwind v4
gives `--tw-ring-color` no initial value and an uncoloured ring falls back to `currentcolor`. The
alpha scan enforces "no colour on a state variant"; nothing enforced the other half.

Mirrored from `PREFIXED_OFFSET_WIDTH`, per variant prefix. **0 offenders today**, so this is a
regression guard. **Verified it fires**: `aria-invalid:ring-3` re-added to `input.tsx` → **1 failed /
22 passed**, `src/components/ui/input.tsx:11: aria-invalid:ring-3 without aria-invalid:ring-<colour>`.
A positive control pins both directions, including that `ring-0`, `ring-offset-*`, `ring-inset` and
an arbitrary `ring-[…]` colour are all correctly spared, and that one prefix's colour cannot vouch
for another's.

### WR-11 — the hex leak pattern missed a hex preceded by a space

**Files:** `config/design-leak-patterns.mjs`, `tests/design/leak.test.ts` · **Commit:** `df05826`

**Verified against the shipped `findDesignLeaks`** — all four shapes returned `[]`:
`"0 1px 2px #00000010"`, `"1px solid #ccc"`, `"inset 0 0 4px #000000"`, `"0 2px 8px #0000001a"`.

**The review's suggested anchor does not work, and I did not use it.** It proposed admitting a space
preceded by "a digit, `)`, `%` or `,`". Measured: the character before the space in `2px #00000010`,
`solid #ccc` and `4px #000000` is `x`, `d` and `x` — all word characters, exactly like the `see ` in
`see #3388 for details`. That anchor catches **2 of the 4** shapes the finding itself names. A single
preceding character cannot separate CSS from prose here.

What can is the preceding **token**: a length with a unit, a percentage, a `)`, a `,`, or a
border/shadow keyword. Measured against both sets: **11/11 CSS shapes matched, 7/7 prose negatives
still clean**, including landmine L14's real `see #3388 for details` at `schema.ts:730`, `Closes #123`,
`the PR #4021 landed`, and the phase's own `bg-[color-mix(…)]` idiom.

**Verified end-to-end through the other half of D-16**, since both consumers share the list:
`style={{ boxShadow: "0 2px 8px #0000001a" }}` in a scratch component → `npx eslint` reports
`Raw design value "8px #0000001a" — use a design token (DS-13 / D-15)  fitout/no-raw-design-value`.
All four shapes and four prose negatives are now fixtures in `leak.test.ts`.

### WR-12 — the open-redirect guard was defeated by a backslash

**Files:** `src/lib/safe-callback-url.ts` (new), `src/app/(auth)/login/page.tsx`,
`tests/security/safe-callback-url.test.ts` (new) · **Commit:** `ce155fe`

**This was the second judgement call. Decision: APPLIED, with unit-test coverage of the bypass
vectors — and the security ticket is still worth filing.**

The reasoning: the reviewer's case for deferring rested partly on being unable to verify end-to-end
exploitability without a browser and an auth server. That limit is real and is **unchanged** — but it
does not bear on whether the guard is defective. The guard demonstrably admits a string that resolves
to another origin while its own comment says it cannot, on an input an attacker fully controls, and
the correction is four lines and strictly tightening. Deferring a strict tightening of a security
guard because the *worst case* is unproven is the wrong default.

**What is fixed and verified:**

```
"//evil.com"  -> old guard "/"           -> resolves https://fitout.example/
"/\evil.com"  -> old guard "/\evil.com"  -> resolves https://evil.com/          <-- bypass
```

The guard is extracted to a pure `safeCallbackPath(raw, origin)` — it was untestable while it read
`window.location` directly, which is why it had no test. It now parses and compares origins rather
than prefix-matching, because closing the backslash spelling alone leaves `/\/`, a stripped tab or
newline, and percent-encodings.

**9 tests, and they were run.** The main suite needs Postgres and did not run, so this file was
executed here through a throwaway DB-free Vitest config: **9/9 passed**. It was then run against the
**old** guard restored in place → **4 failed / 5 passed**, on the backslash bypass, the other
spellings, the localhost-origin case and the unusable-origin case. The tests fail for the right
reason, which is the only thing that makes them worth having.

**Legitimate callbacks are not regressed**, and that is asserted rather than assumed: the real shapes
`book-cta.tsx:144`, `invite/[token]/page.tsx:190` and `rsvp-form.tsx` thread — paths with query
strings, fragments and percent-encoded values — all round-trip unchanged. One test asserts the fix
does not newly **accept** anything the old guard rejected (`"bookings"` without a leading slash
resolves same-origin and would be safe, but the old guard refused it, so this one does too): widening
a guard while fixing an open redirect would be a different bug.

**Still recommended as a separate security ticket**, for the part this environment genuinely could
not do: whether Next's App Router navigates cross-origin on a `pushState`-shaped href, and whether
Better Auth's `trustedOrigins` independently rejects the social `callbackURL`. Both need a running
browser and auth server. The code fix does not depend on either answer. Recorded in the module header
so the open question travels with the code.

**Pre-existing, not phase 10's** — `git log -L` puts the original guard at `487bda7` (phase 4).

---

## Skipped Issues

None. All 15 in-scope findings were fixed.

---

## Known gaps this pass did NOT close

Listed so this report is not read as claiming more than it did — the specific failure mode the
re-review exists to correct.

- **`pair-drift.test.ts` still cannot see a `cn()`-split pairing.** CR-01's fix changed the unit in
  `status-vocab.test.ts` only, which is what the finding's Fix section specified. `pair-drift`
  cross-multiplies foregrounds and backgrounds *within* a chunk, so unioning per element there would
  produce many new cross-products and needs its own analysis. The review noted the sibling gap as
  context rather than as part of the fix; it is carried forward here rather than quietly closed.
- **The `cva` base/variant split** remains open in `status-vocab.test.ts`, deliberately, with an
  assertion pinning it — see CR-01.
- **`pairKey` is still surface-blind** (`alpha.over` is dropped). Inherent to same-string analysis;
  now stated correctly in the header instead of the inverted claim — see WR-04 and IN-11.
- **Twenty diluted composites are `recorded`, not `declared` or `exempt`.** WR-07's new inventory
  makes them visible and pins them; measuring and classifying each is a design pass, not a fix.
- **IN-01..IN-16 were out of scope by instruction** and are untouched. Several are one-liners
  (IN-08's missing `i` flag, IN-02's dead `aria-invalid:ring-0`, IN-16's missing `aria-hidden`) and
  IN-01/IN-03 are stale comments of exactly the class this review is about.
- **Non-design suites remain unexercised.** `npm test` needs a provisioned Postgres. The one new
  non-design test file was run here out-of-band; every other suite outside `tests/design/**` has not
  been run by this pass, the previous pass, or the review.

---

_Fixed: 2026-08-12_
_Fixer: Claude (gsd-code-fixer)_
_Iteration: 2 · supersedes the report at `2ae81de`_
