import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

import {
  DESIGN_LEAK_PATTERNS,
  LEAK_DISABLE_RULE_ID,
  LEAK_SCAN_GLOBS,
} from "./config/design-leak-patterns.mjs";

// The rule id, DERIVED from the shared constant rather than respelled here (WR-14).
//
// `LEAK_DISABLE_RULE_ID` is documented as "the id both consumers report under, so a violation reads
// the same from either gate" — but only the Vitest half imported it. This file re-typed the plugin
// name and the rule name as two separate string literals in three places, so the constant described
// an agreement it did not enforce. Rename the plugin key and every
// `// eslint-disable-next-line fitout/no-raw-design-value` in the tree silently becomes a no-op in
// ESLint while the Vitest gate still honours it — the two halves of D-16 disagreeing about
// EXEMPTIONS, which is the one outcome D-16 exists to prevent. Splitting the single constant is what
// makes the plugin key and the rule name un-typo-able.
//
// THE ARITY IS ASSERTED, BECAUSE THE DERIVATION IS THE WHOLE POINT (IN-07). `split("/")` on an id
// with any number of segments other than two produces a plugin key and a rule key that do not
// reassemble into the id the `rules` entry names, and ESLint then reports something that points
// nowhere near the cause. Both shapes were run against the installed ESLint 9.39.4:
//
//   "@fitout/design/no-raw-design-value"  ->  'could not find plugin "@fitout/design"'
//                                             (registered "@fitout"; the middle segment vanished)
//   "no-raw-design-value"                 ->  TypeError: Could not find "no-raw-design-value"
//                                             in plugin "@"  — a plugin named nowhere in this file
//
// Neither message mentions the split. A scoped plugin name is legal ESLint, so if one is ever
// genuinely wanted, register it deliberately rather than relaxing this check.
const LEAK_ID_SEGMENTS = LEAK_DISABLE_RULE_ID.split("/");
if (LEAK_ID_SEGMENTS.length !== 2) {
  throw new Error(
    `LEAK_DISABLE_RULE_ID must be exactly "<plugin>/<rule>", but is ` +
      `"${LEAK_DISABLE_RULE_ID}" (${LEAK_ID_SEGMENTS.length} segment(s)). ` +
      `eslint.config.mjs derives the plugin key and the rule name by splitting it, and any other ` +
      `arity silently desynchronises them from the rules entry — which surfaces as an unrelated ` +
      `"could not find plugin/rule" error. Fix the constant in config/design-leak-patterns.mjs.`,
  );
}
const [LEAK_PLUGIN_NAME, LEAK_RULE_NAME] = LEAK_ID_SEGMENTS;

// The DS-13 leak rule, defined inline as a flat-config plugin.
//
// WHY INLINE AND NOT A PACKAGE (T-10-36): the rule is ~20 lines over a repo-local pattern list, so
// publishing or vendoring a plugin would add npm supply-chain surface for no capability. Verified
// working against this repository's installed ESLint 9 (RESEARCH § Pattern 7).
//
// WHY BOTH THIS AND A VITEST GATE (D-16): this half is the squiggle at the moment of typing — it
// tells an author which literal is wrong, in the editor, before a commit. `tests/design/leak.test.ts`
// is the authoritative half and the one wired into `build`. Both read the SAME exported list, so
// there is exactly one answer to "what counts as a raw design value" and no way for the two to
// drift apart.
//
// THE ESCAPE HATCH IS THE REPO'S EXISTING ONE. A genuinely-unavoidable literal is exempted with
// `// eslint-disable-next-line fitout/no-raw-design-value`, the same mechanism already used at
// `src/components/listing/listing-card.tsx:234` for `@next/next/no-img-element`. Do not invent a
// second marker: a bespoke comment token would be invisible to ESLint and would need re-teaching to
// every future gate.
const noRawDesignValue = {
  meta: {
    type: "problem",
    docs: {
      description:
        "Ban raw design values (hex, colour functions, arbitrary px type sizes, numbered palette classes, white/black classes) in app and component source.",
    },
    schema: [],
    messages: {
      rawDesignValue:
        'Raw design value "{{match}}" — use a design token (DS-13 / D-15).',
    },
  },
  create(context) {
    /** Test one chunk of string content against every pattern and report each class that matches. */
    function check(node, text) {
      if (typeof text !== "string" || text === "") return;
      for (const entry of DESIGN_LEAK_PATTERNS) {
        const match = entry.pattern.exec(text);
        if (match === null) continue;
        context.report({
          node,
          messageId: "rawDesignValue",
          data: { match: match[0].trim() },
        });
      }
    }

    return {
      // String literals: `const C = "#E8484E"`, `className="bg-zinc-50"`, `fill="#fff"`.
      // `node.value` is a RegExp for regex literals and a number for numeric ones, so the type
      // guard inside `check` is load-bearing rather than defensive.
      Literal(node) {
        check(node, node.value);
      },
      // Template chunks: the literal text either side of a `${…}` in a `cn(\`…\`)` class string.
      // The interpolations themselves are expressions and are deliberately not inspected — this
      // rule reads text, not values.
      TemplateElement(node) {
        check(node, node.value.raw);
      },
    };
  },
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated build output anywhere in the tree, plus stale git worktrees: the default
    // `.next/**` only matches the ROOT .next, so a nested `.claude/worktrees/<name>/.next`
    // full of generated Turbopack JS would otherwise flood lint with thousands of errors.
    ".claude/worktrees/**",
    "**/.next/**",
  ]),
  // DS-13 / D-15 / D-16 — the raw-design-value rule, scoped to the two trees the gate polices.
  //
  // THE SCOPE IS IMPORTED, NOT RETYPED, so the ESLint half and the Vitest half cannot disagree
  // about WHERE the rule applies any more than they can about WHAT it bans. Without the scope the
  // rule fires on the gate's own synthetic fixtures under `tests/design/**` (which must name the
  // banned shapes in order to ban them) and on `src/lib/db/schema.ts:730`'s GitHub issue
  // references. `src/components/ui/**` is INSIDE this scope on purpose — D-17, no vendored
  // exemption.
  {
    files: [...LEAK_SCAN_GLOBS],
    plugins: { [LEAK_PLUGIN_NAME]: { rules: { [LEAK_RULE_NAME]: noRawDesignValue } } },
    rules: { [LEAK_DISABLE_RULE_ID]: "error" },
  },
]);

export default eslintConfig;
