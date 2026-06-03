// Patch @better-auth/kysely-adapter's UNUSED sqlite dialect bundles.
//
// ROOT CAUSE: @better-auth/kysely-adapter@1.6.x ships sqlite dialect modules that import
// `DEFAULT_MIGRATION_TABLE` / `DEFAULT_MIGRATION_LOCK_TABLE` as named exports from `kysely`, but
// kysely@0.29 no longer exports those symbols. The adapter is reached transitively from
// better-auth/context/init even though we use the DRIZZLE + Postgres adapter and NEVER Kysely, so
// the code is dead at runtime — but bundlers (Turbopack) and Next's externals tracer statically
// resolve the named imports and fail (500 every route in dev; broken `next build`).
//
// This rewrites those import statements to (a) drop the two missing names from the kysely import
// and (b) declare them as local consts with their canonical default values. No runtime behavior
// changes (the dialects are never executed). Runs on postinstall so it survives `npm install`.
// Idempotent: re-running on an already-patched file is a no-op.

import { readFileSync, writeFileSync, existsSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const DIST = resolve(
  process.cwd(),
  "node_modules/@better-auth/kysely-adapter/dist",
);

const LOCAL_DEFS =
  '\nconst DEFAULT_MIGRATION_TABLE = "kysely_migration";' +
  '\nconst DEFAULT_MIGRATION_LOCK_TABLE = "kysely_migration_lock";\n';

const MARKER = "/* fitout-kysely-patch */";

function patchFile(file) {
  let src = readFileSync(file, "utf8");
  if (src.includes(MARKER)) return false; // already patched
  if (
    !src.includes("DEFAULT_MIGRATION_TABLE") &&
    !src.includes("DEFAULT_MIGRATION_LOCK_TABLE")
  ) {
    return false; // nothing to do
  }

  // Strip the two missing names out of any `import { ... } from "kysely"` statement.
  src = src.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']kysely["'];?/g,
    (full, names) => {
      const kept = names
        .split(",")
        .map((n) => n.trim())
        .filter(
          (n) =>
            n &&
            n !== "DEFAULT_MIGRATION_TABLE" &&
            n !== "DEFAULT_MIGRATION_LOCK_TABLE",
        );
      const importLine = kept.length
        ? `import { ${kept.join(", ")} } from "kysely";`
        : "";
      return `${importLine}${LOCAL_DEFS}`;
    },
  );

  writeFileSync(file, `${MARKER}\n${src}`);
  return true;
}

function main() {
  if (!existsSync(DIST)) {
    // Adapter not installed (or different layout) — nothing to patch.
    return;
  }
  const targets = readdirSync(DIST).filter(
    (f) => /sqlite-dialect.*\.mjs$/.test(f),
  );
  let patched = 0;
  for (const f of targets) {
    if (patchFile(resolve(DIST, f))) patched++;
  }
  console.log(
    `[patch-kysely-adapter] patched ${patched}/${targets.length} sqlite dialect file(s).`,
  );
}

main();
