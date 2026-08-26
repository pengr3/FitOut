// The ONE way phase 16.1 reads source text for an assertion.
//
// ── THE SINGLE REASON THIS EXISTS ────────────────────────────────────────────────────────────────
// This phase asserts two PROHIBITIONS over source, and in both cases the CORRECT file necessarily
// NAMES the forbidden token in a comment: `src/app/api/cloudinary/sign/route.ts` will carry a
// warning that quotes the very key it must never sign, and `src/app/actions/listing-photo.ts`
// discusses provenance and destruction in prose above the code that must not do either on the
// rejection path. A whole-file `expect(SOURCE).not.toContain(token)` is therefore falsely RED
// against a correct tree.
//
// That is not a hypothesis. `scripts/verify-workflows.mjs:24-32` MEASURED it and wrote it down:
//
//     THE MIRROR FAILURE WAS MEASURED TOO, and it matters because the fix looks like a bug. A naive
//     PROHIBITION spelled the same way — "the string `secrets.` appears nowhere in this file" —
//     reports RED against the CORRECT file, because the paragraph forbidding credentials
//     necessarily names the thing it forbids. Substring checks are wrong in both directions on a
//     documented file: falsely green for requirements, falsely red for prohibitions.
//
// 16.1-PATTERNS § S-2 names two precedented ways out — strip the comments, or narrow the assertion
// to a parsed region. **This phase picks comment-stripping**, and uses it for both prohibitions,
// because it needs no TypeScript AST walk and applies unchanged to a `.ts` route module, a `.ts`
// server action and a `.tsx` component. (Where a property is STRUCTURAL rather than textual — "this
// module has no directive prologue" — the AST is still the right tool and
// `tests/design/upload-policy.test.ts` uses it there. Stripping is for tokens, not for shapes.)
//
// ── THE KNOWN LIMITATION, STATED RATHER THAN PAPERED OVER ────────────────────────────────────────
// This is a regex pass, NOT a parser. It does not know about string literals, so a `//` inside one —
// most obviously a url — takes the rest of that line with it. Teaching it to skip string literals
// was considered and is deliberately out of scope: it is most of a tokeniser, and the two callers in
// this phase both narrow to a region where the limitation cannot bite. A caller asserting over a
// file that embeds urls in CODE (not in comments) must narrow first or use a different tool. If a
// third caller ever cannot narrow, replace this with a real tokeniser rather than growing special
// cases here — a half-parser that is right most of the time is the shape that produces a green suite
// over a broken prohibition, which is the exact failure the header above is about.
//
// ── IT IS NOT A SPEC, AND THE FILENAME IS LOAD-BEARING ───────────────────────────────────────────
// `vitest.config.ts` collects `tests/**/*.test.ts(x)` and `vitest.design.config.ts` collects
// `tests/design/**/*.test.ts(x)`. This file must never end in `.test.ts`, or one of them would run
// it as a suite with no tests in it.
//
// ── IT IS SELF-TESTED, IN BOTH DIRECTIONS ────────────────────────────────────────────────────────
// `tests/design/upload-policy.test.ts` exercises it against a fixture whose token appears ONLY in a
// comment (must be stripped) AND a fixture whose token appears in CODE (must survive), because a
// stripper that silently returned the empty string would make every prohibition built on it pass
// vacuously — the same both-directions rule `tests/design/avatar-zoom.test.ts:247-258` applies to
// its directive detector.

/**
 * Remove `/* … *\/` block comments and `//` line comments, returning the remaining code text.
 *
 * Block comments go first, so a `//` that lives inside one is already gone by the time the line
 * pass runs. Neither pass is aware of string literals — see the limitation in the header.
 *
 * @param source the file's text, as read by `readFileSync(…, "utf8")`
 * @returns the same text with comment content removed (line structure is otherwise preserved)
 */
export function stripComments(source: string): string {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
}
