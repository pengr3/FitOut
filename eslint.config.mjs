import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

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
]);

export default eslintConfig;
