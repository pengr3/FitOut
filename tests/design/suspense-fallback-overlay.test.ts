// CI-01 / SHELL-01 — THE PROPERTY 19.1-16 ACTUALLY REPAIRED, PINNED SO THE NEXT ROUND ARRIVES WITH
// A MEMORY OF THIS ONE.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// THE FILENAME IS A FOSSIL OF THE HYPOTHESIS, AND THE PROPERTY IS THE MEASUREMENT. READ THIS FIRST.
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// This file is named for the shape plan 19.1-13 named and plan 19.1-16 was written around: *a
// streaming boundary's fallback and its resolved child both mounting the app's one overlay primitive,
// disagreeing about a per-render generated identity attribute.* That shape was MEASURED and it is NOT
// the mechanism. The transcript is
// `.planning/phases/19.1-…/evidence/triage-host-hydration.txt`; the three readings that settle it:
//
//   1. The fallback was changed to mount NO overlay. `HYDRATION-COUNT` stayed at 1, and the generated
//      id in React's diff was byte-identical to the pre-change run. Two renders disagreeing about an
//      id do not produce the same id after one of them stops existing.
//   2. The SERVED document for `/host` held `<div class="md:hidden"></div>` — the drawer placement
//      EMPTY — and contained no `aria-label="Menu"` button anywhere, in the fallback or in the
//      resolved boundary. The client rendered the button into a div the server left empty. React's
//      own diff had said so from the start by printing the whole node as `+` (client-only); what was
//      missing was the reason.
//   3. `ResponsiveDialog` forwards its `trigger` prop into `DialogTrigger asChild`, and `asChild` is
//      Radix's `Slot` — which CLONES an element rather than rendering one. `site-chrome.tsx` is a
//      Server Component, so the trigger element crossed the RSC boundary and could not be cloned
//      during the SSR pass. Every OTHER adopter of `ResponsiveDialog` in the tree was already a
//      client module. One exception, one route reporting the mismatch.
//
// So the property this file pins is the one that was repaired:
//
//   ⇒ AN ELEMENT HANDED TO `ResponsiveDialog`'s `trigger` PROP MUST BE CREATED IN A CLIENT MODULE.
//
// The boundary property the plan asked for is pinned too, second, because the host layout now
// satisfies it and the shape is a real hazard even though it was not this defect:
//
//   ⇒ A `<Suspense>` FALLBACK AND ITS RESOLVED CHILD MUST NOT BOTH MOUNT THE OVERLAY PRIMITIVE.
//
// NEITHER PROPERTY IS "DO NOT STREAM A NAV SLOT". The host nav slot still streams, its links still
// render before the count lands, and one of the green controls below exists precisely to stop the
// second property being read that way.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WHY THIS IS AN EXPORT-LEVEL RENDER GRAPH AND NOT AN IMPORT GRAPH
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Measured while writing this file, and it changed the design. `auth-slot-skeleton.tsx` IMPORTS
// `NavLinks` from `site-chrome.tsx`, and `site-chrome.tsx` renders the overlay-bearing drawer. An
// import-reachability walk therefore reports the box-reserving PLACEHOLDER as an overlay mount, and
// the second property above would be red on a tree that satisfies it perfectly. Module granularity
// is too coarse for this claim. The walk below resolves each JSX tag to a `file#export` and follows
// RENDER edges only, which is the granularity the property is actually about.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// WATCHED RED — THE DEFECT PUT BACK ON A MUTATED COPY, NOT ON THE TREE
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//
// Every mutation case below runs the SHIPPED scanner (`analyse`) over a copy of the real tree with
// one file's text replaced, and asserts the replacement DIFFERED FROM ITS INPUT before asserting
// anything about the result. That last assertion is the one that matters: a mutation whose anchor has
// drifted applies nothing, and a case that then reports the defect "caught" is measuring its own
// no-op. This phase has already watched a case survive the deletion of its own conjunct.
//
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
// NOT COVERED — stated so the next reader under-trusts this file
// ═══════════════════════════════════════════════════════════════════════════════════════════════════
//   • IT READS STRUCTURE, NOT BEHAVIOUR. It cannot prove a page hydrates. That is
//     `e2e/shell.spec.ts`'s host-composition case, which reads the served bytes and the browser's own
//     console, and the pairing is named here so it is legible rather than assumed.
//   • THE RENDER GRAPH IS SYNTACTIC. A component reached through a prop, a `React.createElement` call
//     or a dynamic import is invisible to it. Every adopter in the tree today is a plain JSX tag.
//   • IT KNOWS ONE OVERLAY PRIMITIVE BY NAME. `tests/design/sheet-absent.test.ts` is what keeps that
//     from becoming two.

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, posix, resolve } from "node:path";
import ts from "typescript";

import { stripComments } from "./helpers/strip-comments";

/** The scanned tree, as one constant — the vacuity probe is a one-line edit here. */
const SRC_DIR = resolve(process.cwd(), "src");

/** The app's ONE overlay primitive, as a `file#export` key. `sheet-absent.test.ts` keeps it one. */
const OVERLAY = "src/components/patterns/responsive-dialog.tsx#ResponsiveDialog";

/**
 * Every module that hands an element to `ResponsiveDialog`'s `trigger` prop, and therefore to Radix's
 * `Slot`. THE COUNT IS PINNED AND THE MEMBERSHIP IS PINNED — a tenth adopter reddens this file BY
 * NAME until a human confirms it is a client module.
 *
 * Each entry says why it is in the set, because the set is the whole argument: nine of ten are client
 * modules already and always were, and the tenth was the one route in the app reporting a hydration
 * mismatch.
 */
const TRIGGER_ADOPTERS: Readonly<Record<string, string>> = {
  "src/components/availability/blocks-editor.tsx": "the date/time block editor's own dialog",
  "src/components/booking/booking-sticky-bar.tsx": "RESP-02's below-`lg:` booking sheet",
  "src/components/host/request-row.tsx": "the decline-with-reason dialog on the requests inbox",
  "src/components/ops/ops-reject-dialog.tsx": "the ops queue's reject-with-reason dialog",
  "src/components/ops/staff-action-dialog.tsx":
    "the client-owned revoke/cancel confirmation dialog in staff management",
  "src/components/patterns/nav-drawer-shell.tsx":
    "the below-`md:` nav drawer — the module 19.1-16 created, and the reason this file exists",
  "src/components/profile/avatar-field.tsx": "the avatar upload's crop entry point",
  "src/app/dev/theme/page.tsx":
    "the /dev/theme preview's overlay demo — SEE `SERVER_ADOPTER_EXEMPTIONS`, this one is NOT a " +
    "client module and it carries the same latent defect",
};

/**
 * NOT IN THE SET ABOVE, AND THE DISTINCTION IS THE PROPERTY RATHER THAN AN OVERSIGHT.
 *
 * Nine modules in `src/` render `ResponsiveDialog`; only SEVEN hand it an element through `trigger`.
 * The other three — `availability/copy-hours-dialog.tsx`, `listing/photo-lightbox.tsx` and
 * `profile/image-crop-dialog.tsx` — are CONTROLLED overlays opened from their caller's state with no
 * trigger element at all, and each says so in its own docblock. They never reach Radix's `Slot`, so
 * nothing is cloned and the defect this file pins cannot occur in them.
 *
 * ⚠ THIS WAS MEASURED, AND IT CORRECTED THIS PLAN'S OWN FIRST CENSUS. 19.1-16 Task 2 derived its
 * adopter list from a text grep for `ResponsiveDialog` and reported nine adopters and one server
 * module. The AST says seven adopters, and it also found a SECOND server-side one the grep list had
 * printed and the prose had skipped over (`/dev/theme`). A grep counts mentions; the property is
 * about a prop.
 */
const CONTROLLED_NON_ADOPTERS = [
  "src/components/availability/copy-hours-dialog.tsx",
  "src/components/listing/photo-lightbox.tsx",
  "src/components/profile/image-crop-dialog.tsx",
] as const;

/**
 * The ONE adopter that is not a client module, exempted BY NAME with a measurement rather than a
 * judgement — and it is a DEFERRAL, not an acquittal.
 *
 * MEASURED, 2026-09-06, same session as the `/host` repair:
 *
 *   $ fetch /dev/theme            STATUS 200  LEN 435458
 *     "Open the overlay"                 3   (all three in the RSC flight payload)
 *     data-slot="dialog-trigger"         0   ← the trigger button is NOT in the served HTML
 *
 * So `/dev/theme` has the same defect, confirmed, not suspected. It is deferred rather than repaired
 * here for two reasons, both stated so the next reader can disagree with them: it is a DEV-ONLY
 * preview surface (D-09 / D-10) that no booker or host reaches, and repairing it needs an API
 * decision — a generic client-side trigger on the `ResponsiveDialog` pattern — which is a product
 * question rather than a bug fix, i.e. D-02's shape exactly. It is recorded in
 * `deferred-items.md` with its first instrument.
 *
 * ⚠ AN EXEMPTION IS NOT A QUARANTINE. This entry is not a failing test being hidden; it is a latent
 * defect this file DISCOVERED, named, and refuses to let disappear. Deleting the entry without
 * repairing the file turns this test red, which is the whole point of listing it here rather than
 * filtering it out of the walk.
 */
const SERVER_ADOPTER_EXEMPTIONS: Readonly<Record<string, string>> = {
  "src/app/dev/theme/page.tsx":
    "dev-only preview surface; same defect, measured; deferred with a named follow-up",
};

/** The layouts the boundary property is asserted over. A third gated layout means a line here. */
const LAYOUTS = ["src/app/(app)/layout.tsx", "src/app/(host)/host/layout.tsx"] as const;

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// The scanner. One function, driven by a plain `{ path: text }` tree, so the real assertions and the
// mutation fixtures run THE SAME CODE PATH — `blocking-session-gate.test.ts`'s stated reason for the
// same shape.
// ───────────────────────────────────────────────────────────────────────────────────────────────────

export type Tree = Record<string, string>;

type Component = {
  readonly key: string;
  readonly file: string;
  /** JSX tag names this component renders, last segment only, in source order. */
  readonly renders: readonly string[];
  /** True when this component renders `<ResponsiveDialog … trigger={…}>`. */
  readonly passesTrigger: boolean;
};

type Boundary = {
  readonly file: string;
  readonly line: number;
  readonly fallbackTags: readonly string[];
  readonly childTags: readonly string[];
};

export type Analysis = {
  readonly files: readonly string[];
  readonly clientModules: ReadonlySet<string>;
  readonly components: ReadonlyMap<string, Component>;
  /** localName -> `file#export`, per file. */
  readonly bindings: ReadonlyMap<string, ReadonlyMap<string, string>>;
  readonly boundaries: readonly Boundary[];
  /** Files that hand an element to `ResponsiveDialog`'s `trigger` prop. */
  readonly triggerAdopters: readonly string[];
  mountsOverlay(key: string): boolean;
  /** Resolve a JSX tag name used inside `file` to a `file#export` key, or null. */
  resolveTag(file: string, tag: string): string | null;
};

/** `@/x` -> `src/x`; `./x` / `../x` -> normalised against the importer. Extension-resolved. */
function resolveSpecifier(fromFile: string, spec: string, tree: Tree): string | null {
  let base: string | null = null;
  if (spec.startsWith("@/")) base = posix.join("src", spec.slice(2));
  else if (spec.startsWith(".")) base = posix.normalize(posix.join(posix.dirname(fromFile), spec));
  if (base === null) return null;
  for (const candidate of [base, `${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`]) {
    if (candidate in tree) return candidate;
  }
  return null;
}

/** The last segment of a JSX tag name, so `React.Suspense` and `Suspense` are the same tag. */
function tagOf(node: ts.JsxTagNameExpression, sf: ts.SourceFile): string {
  return node.getText(sf).split(".").pop() ?? "";
}

function jsxTagsIn(node: ts.Node, sf: ts.SourceFile): string[] {
  const tags: string[] = [];
  const walk = (n: ts.Node): void => {
    if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) tags.push(tagOf(n.tagName, sf));
    ts.forEachChild(n, walk);
  };
  walk(node);
  return tags;
}

export function analyse(tree: Tree, options: { strip?: boolean } = {}): Analysis {
  const strip = options.strip ?? true;
  const files = Object.keys(tree).sort();
  const clientModules = new Set<string>();
  const components = new Map<string, Component>();
  const bindings = new Map<string, Map<string, string>>();
  const boundaries: Boundary[] = [];
  const triggerAdopters = new Set<string>();

  for (const file of files) {
    const code = strip ? stripComments(tree[file]) : tree[file];
    const sf = ts.createSourceFile(
      file,
      code,
      ts.ScriptTarget.Latest,
      /* setParentNodes */ true,
      file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );

    const first = sf.statements[0];
    if (
      first !== undefined &&
      ts.isExpressionStatement(first) &&
      ts.isStringLiteral(first.expression) &&
      first.expression.text === "use client"
    ) {
      clientModules.add(file);
    }

    const local = new Map<string, string>();
    for (const statement of sf.statements) {
      if (!ts.isImportDeclaration(statement) || statement.importClause === undefined) continue;
      if (!ts.isStringLiteral(statement.moduleSpecifier)) continue;
      const target = resolveSpecifier(file, statement.moduleSpecifier.text, tree);
      if (target === null) continue;
      const clause = statement.importClause;
      if (clause.name !== undefined) local.set(clause.name.text, `${target}#default`);
      const named = clause.namedBindings;
      if (named !== undefined && ts.isNamedImports(named)) {
        for (const element of named.elements) {
          const exported = element.propertyName?.text ?? element.name.text;
          local.set(element.name.text, `${target}#${exported}`);
        }
      }
    }
    bindings.set(file, local);

    // Every top-level function is a candidate component — exported or not, because a locally
    // declared helper component is rendered by name exactly like an imported one.
    //
    // ⚠ BOTH DECLARATION FORMS, AND THAT IS MEASURED RATHER THAN THOROUGH. The first draft of this
    // walk collected `function X() {}` only, and reported SEVEN adopters instead of ten: three of
    // this app's overlay adopters (`copy-hours-dialog`, `photo-lightbox`, `image-crop-dialog`) are
    // written `export const X = (…) => …`. A census that silently misses a third of its population
    // is the vacuity failure one level in.
    const declarations: Array<{ name: string; body: ts.Node }> = [];
    for (const statement of sf.statements) {
      if (ts.isFunctionDeclaration(statement) && statement.body !== undefined) {
        const modifiers = ts.getModifiers(statement) ?? [];
        const isDefault = modifiers.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
        const name = isDefault ? "default" : (statement.name?.text ?? "");
        if (name !== "") declarations.push({ name, body: statement.body });
        continue;
      }
      if (ts.isVariableStatement(statement)) {
        for (const declaration of statement.declarationList.declarations) {
          if (!ts.isIdentifier(declaration.name) || declaration.initializer === undefined) continue;
          const initializer = declaration.initializer;
          if (ts.isArrowFunction(initializer) || ts.isFunctionExpression(initializer)) {
            declarations.push({ name: declaration.name.text, body: initializer.body });
          }
        }
      }
    }

    for (const statement of declarations) {
      const name = statement.name;
      const renders = jsxTagsIn(statement.body, sf);
      let passesTrigger = false;
      const seekTrigger = (n: ts.Node): void => {
        if (ts.isJsxOpeningElement(n) || ts.isJsxSelfClosingElement(n)) {
          if (tagOf(n.tagName, sf) === "ResponsiveDialog") {
            for (const attribute of n.attributes.properties) {
              if (ts.isJsxAttribute(attribute) && attribute.name.getText(sf) === "trigger") {
                passesTrigger = true;
              }
            }
          }
        }
        ts.forEachChild(n, seekTrigger);
      };
      seekTrigger(statement.body);
      if (passesTrigger) triggerAdopters.add(file);

      components.set(`${file}#${name}`, { key: `${file}#${name}`, file, renders, passesTrigger });
    }

    // The `<Suspense>` boundaries, with their fallback expression and their children kept apart.
    const seekBoundary = (n: ts.Node): void => {
      if (ts.isJsxElement(n) && tagOf(n.openingElement.tagName, sf) === "Suspense") {
        const fallbackTags: string[] = [];
        for (const attribute of n.openingElement.attributes.properties) {
          if (
            ts.isJsxAttribute(attribute) &&
            attribute.name.getText(sf) === "fallback" &&
            attribute.initializer !== undefined
          ) {
            fallbackTags.push(...jsxTagsIn(attribute.initializer, sf));
          }
        }
        const childTags = n.children.flatMap((child) => jsxTagsIn(child, sf));
        boundaries.push({
          file,
          line: sf.getLineAndCharacterOfPosition(n.getStart(sf)).line + 1,
          fallbackTags,
          childTags,
        });
      }
      ts.forEachChild(n, seekBoundary);
    };
    seekBoundary(sf);
  }

  const resolveTag = (file: string, tag: string): string | null => {
    const imported = bindings.get(file)?.get(tag);
    if (imported !== undefined) return imported;
    if (components.has(`${file}#${tag}`)) return `${file}#${tag}`;
    return null;
  };

  const memo = new Map<string, boolean>();
  const mountsOverlay = (key: string, seen: Set<string> = new Set()): boolean => {
    if (key === OVERLAY) return true;
    const cached = memo.get(key);
    if (cached !== undefined) return cached;
    if (seen.has(key)) return false;
    seen.add(key);
    const component = components.get(key);
    if (component === undefined) return false;
    let result = false;
    for (const tag of component.renders) {
      if (tag === "ResponsiveDialog") {
        result = true;
        break;
      }
      const target = resolveTag(component.file, tag);
      if (target !== null && mountsOverlay(target, seen)) {
        result = true;
        break;
      }
    }
    memo.set(key, result);
    return result;
  };

  return {
    files,
    clientModules,
    components,
    bindings,
    boundaries,
    triggerAdopters: [...triggerAdopters].sort(),
    mountsOverlay: (key: string) => mountsOverlay(key),
    resolveTag,
  };
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// The two violation reporters. Both return a LIST, and both list entries are strings a reader can act
// on without opening the scanner.
// ───────────────────────────────────────────────────────────────────────────────────────────────────

export function serverSideTriggerViolations(analysis: Analysis, exempt: Readonly<Record<string, string>>): string[] {
  return analysis.triggerAdopters
    .filter((file) => !analysis.clientModules.has(file) && !(file in exempt))
    .map(
      (file) =>
        `${file} — hands an element to ResponsiveDialog's \`trigger\` prop from a SERVER module. ` +
        "`trigger` is forwarded into `DialogTrigger asChild`, which is Radix's `Slot` — a CLONE, not " +
        "a render — and an element created across the RSC boundary cannot be cloned during SSR, so " +
        "the control is absent from the served HTML and appears only on the client. React then " +
        "regenerates the tree. Author the trigger in a `\"use client\"` module, as " +
        "`src/components/patterns/nav-drawer-shell.tsx` does; do NOT delete this assertion and do " +
        "NOT turn `asChild` off (Radix's own button carries neither the caller's accessible name nor " +
        "its box).",
    );
}

export function doubleMountedBoundaryViolations(analysis: Analysis): string[] {
  const violations: string[] = [];
  for (const boundary of analysis.boundaries) {
    const mounting = (tags: readonly string[]): string[] =>
      tags.filter((tag) => {
        const key = analysis.resolveTag(boundary.file, tag);
        return key !== null && analysis.mountsOverlay(key);
      });
    const fallback = mounting(boundary.fallbackTags);
    const child = mounting(boundary.childTags);
    if (fallback.length > 0 && child.length > 0) {
      violations.push(
        `${boundary.file}:${boundary.line} — the <Suspense> slot's fallback <${fallback[0]}> AND its ` +
          `resolved child <${child[0]}> BOTH mount the app's one overlay primitive. Give the fallback ` +
          "a placeholder that reserves the control's box without mounting the overlay — " +
          "`NavSlotSkeleton` in `src/components/patterns/auth-slot-skeleton.tsx` is the shipped one — " +
          "or narrow the boundary so the overlay mounts once, outside it. This is NOT a ban on " +
          "streaming the slot: a fallback that streams a box-reserving placeholder is green here.",
      );
    }
  }
  return violations;
}

// ───────────────────────────────────────────────────────────────────────────────────────────────────
// The real tree.
// ───────────────────────────────────────────────────────────────────────────────────────────────────

function readTree(dir: string): Tree {
  const tree: Tree = {};
  const walk = (absolute: string): void => {
    let entries: string[];
    try {
      entries = readdirSync(absolute);
    } catch {
      return;
    }
    for (const entry of entries) {
      const child = join(absolute, entry);
      if (statSync(child).isDirectory()) {
        walk(child);
        continue;
      }
      if (!/\.tsx?$/.test(entry)) continue;
      const key = posix.join("src", child.slice(SRC_DIR.length + 1).split(/[\\/]/).join("/"));
      tree[key] = readFileSync(child, "utf8");
    }
  };
  walk(dir);
  return tree;
}

const TREE = readTree(SRC_DIR);
const ANALYSIS = analyse(TREE);

/** The text-level candidate pre-filter. It is what the comment stripping is load-bearing FOR. */
function candidates(tree: Tree, strip: boolean): string[] {
  return Object.keys(tree)
    .filter((file) => (strip ? stripComments(tree[file]) : tree[file]).includes("ResponsiveDialog"))
    .sort();
}

describe("CI-01 — an element handed to Radix's `asChild` is created on the client side of the boundary", () => {
  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // GUARD THE GUARD, ASSERTED FIRST. Both real clauses below are `toEqual([])`, which a scanner that
  // opened nothing satisfies perfectly. `blocking-session-gate.test.ts` probe (d) measured exactly
  // that failure on this repository, over four absence clauses at once.
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  it("the walk opened a real tree, found the overlay primitive, and found both group layouts", () => {
    expect(
      ANALYSIS.files.length,
      "the source walk opened fewer than 200 files. Every clause below is \"a list was empty\", and " +
        "a scan that opened nothing satisfies all of them perfectly.",
    ).toBeGreaterThan(200);
    expect(
      ANALYSIS.components.has(OVERLAY),
      `the walk did not find ${OVERLAY}. The overlay primitive is the ROOT of the render graph — ` +
        "without it `mountsOverlay` is false for everything and both clauses below are vacuous.",
    ).toBe(true);
    expect(
      LAYOUTS.filter((layout) => layout in TREE),
      "a declared group layout is missing from the tree, so the boundary clause polices fewer " +
        "layouts than it claims to.",
    ).toEqual([...LAYOUTS]);
    expect(
      ANALYSIS.boundaries.length,
      "the walk found NO <Suspense> boundary anywhere in src/. The boundary clause would then be an " +
        "assertion about an empty list.",
    ).toBeGreaterThan(0);
  });

  it("fails on a tree it cannot open, naming the walk rather than reporting a clean tree", () => {
    // The vacuity probe as a permanent fixture: `SRC_DIR` re-pointed at nothing. The four counts in
    // the guard above are what fail; the two absence clauses below would both report a perfect `[]`,
    // and that is not fixable — an absence assertion cannot notice it was handed nothing.
    const empty = analyse({});
    expect(empty.files).toEqual([]);
    expect(empty.components.has(OVERLAY)).toBe(false);
    expect(empty.boundaries).toEqual([]);
    expect(serverSideTriggerViolations(empty, {})).toEqual([]);
    expect(doubleMountedBoundaryViolations(empty)).toEqual([]);
  });

  it("strips comments, and the stripping is load-bearing rather than decorative", () => {
    const stripped = candidates(TREE, true);
    const raw = candidates(TREE, false);
    const extra = raw.filter((file) => !stripped.includes(file));

    expect(
      raw.length,
      "the unstripped candidate set is not larger than the stripped one, so the stripping this file " +
        "performs changes nothing and the pinned count below is pinned to the wrong number.",
    ).toBeGreaterThan(stripped.length);
    // NAMED, not merely counted: these are the files whose PROSE discusses the overlay primitive —
    // the layout whose falsified comment 19.1-16 replaced, the skeleton module that explains why it
    // does NOT mount one, and the two design inventories that catalogue the pattern by name. Every
    // one of them would join the candidate set unstripped, and the pinned membership below would
    // then be a pin on a list of comments.
    expect(extra.length, "no file was excluded by the stripping").toBeGreaterThan(0);
    expect(extra).toContain("src/components/patterns/site-chrome.tsx");
    expect(extra).toContain("src/components/patterns/auth-slot-skeleton.tsx");
  });

  it("pins the discovered set of `trigger` adopters, by name", () => {
    expect(
      ANALYSIS.triggerAdopters,
      "the set of modules handing an element to ResponsiveDialog's `trigger` prop has changed. Every " +
        "member must be a `\"use client\"` module (see the next case), so a new one is a decision " +
        "somebody has to make rather than a line to add here reflexively.",
    ).toEqual(Object.keys(TRIGGER_ADOPTERS).sort());
    expect(
      ANALYSIS.triggerAdopters.length,
      "the pinned adopter count moved. The number is the record of a decision; the entry and its " +
        "reason are written first.",
    ).toBe(8);

    // The other half of the same claim: the three CONTROLLED overlays are really in the tree and
    // really are not adopters. Without this, "seven" could equally mean the walk stopped seeing three
    // files, which is the vacuity shape one level in.
    for (const file of CONTROLLED_NON_ADOPTERS) {
      expect(file in TREE, `${file} is gone from the tree; the non-adopter note is stale`).toBe(true);
      expect(
        ANALYSIS.triggerAdopters,
        `${file} now hands an element to \`trigger\` and has joined the population this file " +
          "polices. Move it into TRIGGER_ADOPTERS with a reason.`,
      ).not.toContain(file);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // THE REAL CLAUSES.
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  it("lets no SERVER module hand an element to Radix's `asChild`", () => {
    expect(serverSideTriggerViolations(ANALYSIS, SERVER_ADOPTER_EXEMPTIONS)).toEqual([]);
  });

  it("lets no <Suspense> fallback and its resolved child BOTH mount the overlay", () => {
    expect(doubleMountedBoundaryViolations(ANALYSIS)).toEqual([]);
  });

  it("keeps every exemption a NAMED deferral that is really in the adopter set", () => {
    // An exemption for a file that is no longer an adopter is a stale filter, and a stale filter is
    // how a real violation walks back in behind a name nobody re-read.
    for (const file of Object.keys(SERVER_ADOPTER_EXEMPTIONS)) {
      expect(
        ANALYSIS.triggerAdopters,
        `${file} is exempted here but no longer hands a trigger to ResponsiveDialog. Delete the ` +
          "exemption in the same commit that removed the adopter.",
      ).toContain(file);
      expect(
        ANALYSIS.clientModules.has(file),
        `${file} is exempted here but IS now a client module. The exemption is spent — delete it, ` +
          "and delete its entry in deferred-items.md with it.",
      ).toBe(false);
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // PUT THE DEFECT BACK. Each mutation asserts it APPLIED before it asserts anything about the
  // result, because a mutation whose anchor drifted applies nothing and then "passes".
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  it("goes RED when the host layout's nav slot streams a second live nav (the pre-repair shape)", () => {
    const file = "src/app/(host)/host/layout.tsx";
    const before = TREE[file];
    const after = before.replace(
      "<Suspense fallback={<NavSlotSkeleton links={HOST_NAV_LINKS} />}>",
      "<Suspense fallback={<SiteNav links={HOST_NAV_LINKS} />}>",
    );
    expect(
      after,
      "APPLIED=false — the mutation anchor has drifted and the pre-repair shape was never put back, " +
        "so everything asserted below this line is a measurement of a no-op.",
    ).not.toBe(before);

    // The pre-repair layout also imported `SiteNav` rather than `NavSlotSkeleton`; without the
    // binding the tag resolves to nothing and the mutation would be defanged by an import line.
    const mutated = after.replace(
      'import { ProfileLink, SiteChrome } from "@/components/patterns/site-chrome";',
      'import { ProfileLink, SiteChrome, SiteNav } from "@/components/patterns/site-chrome";',
    );
    expect(mutated, "APPLIED=false — the import anchor drifted").not.toBe(after);

    const violations = doubleMountedBoundaryViolations(analyse({ ...TREE, [file]: mutated }));
    expect(violations, "the defect was put back and the scanner did not see it").toHaveLength(1);
    expect(violations[0]).toContain("src/app/(host)/host/layout.tsx");
    expect(violations[0]).toContain("<SiteNav>");
    expect(violations[0]).toContain("<AmbientHostNav>");
    expect(violations[0]).toContain("overlay primitive");
  });

  it("goes RED when the drawer's trigger is authored back in the SERVER module", () => {
    const file = "src/components/patterns/site-chrome.tsx";
    const before = TREE[file];
    // ⚠ THE ANCHOR IS JOINED WITH THE FILE'S OWN EOL, NEVER WITH A BARE `\n`. `.gitattributes`
    // declares `* text=auto` and this working tree checks the app source out with CRLF; a multi-line
    // anchor written with line feeds matches nothing, the mutation silently applies nothing, and
    // without the APPLIED assertion below the case would report the defect "caught". Measured on the
    // first run of this file. `tests/design/workflow-invariants.test.ts:216` records the same rule.
    const eol = before.includes("\r\n") ? "\r\n" : "\n";
    const mutated = before.replace(
      [
        "    <NavDrawerShell>",
        '      <NavLinks links={links} badges={badges} orientation="stacked" />',
        "    </NavDrawerShell>",
      ].join(eol),
      [
        '    <ResponsiveDialog title="Menu" hideTitle trigger={<Button aria-label="Menu" />}>',
        '      <NavLinks links={links} badges={badges} orientation="stacked" />',
        "    </ResponsiveDialog>",
      ].join(eol),
    );
    expect(
      mutated,
      "APPLIED=false — the mutation anchor has drifted and the server-side trigger was never put " +
        "back, so the assertion below is a measurement of a no-op.",
    ).not.toBe(before);

    const withImport = mutated.replace(
      'import { NavDrawerShell } from "@/components/patterns/nav-drawer-shell";',
      [
        'import { ResponsiveDialog } from "@/components/patterns/responsive-dialog";',
        'import { Button } from "@/components/ui/button";',
      ].join(eol),
    );
    expect(withImport, "APPLIED=false — the import anchor drifted").not.toBe(mutated);

    const violations = serverSideTriggerViolations(
      analyse({ ...TREE, [file]: withImport }),
      SERVER_ADOPTER_EXEMPTIONS,
    );
    expect(violations, "the defect was put back and the scanner did not see it").toHaveLength(1);
    expect(violations[0]).toContain("src/components/patterns/site-chrome.tsx");
    expect(violations[0]).toContain("asChild");
    expect(violations[0]).toContain("nav-drawer-shell.tsx");
  });

  // ─────────────────────────────────────────────────────────────────────────────────────────────
  // THE GREEN CONTROLS. Two of them, each with its own reason, because a green a decoy can
  // counterfeit is not a green — `calendar-plate-month.test.tsx`'s control case is the precedent.
  // ─────────────────────────────────────────────────────────────────────────────────────────────

  it("CONTROL (asserts GREEN): an UNMUTATED copy of the tree reports nothing", () => {
    // WHY THIS CASE ASSERTS GREEN WHEN THE TWO REAL CLAUSES ALREADY DO. Those two run over `ANALYSIS`,
    // computed once at module load. This one runs the SAME analysis over a fresh spread of the same
    // tree — the exact expression the two mutation cases above use, with nothing replaced. Without
    // it, a mutation case that silently analysed a DIFFERENT tree (a spread that dropped a key, a
    // memo leaking across calls) would produce its red for a reason unrelated to the mutation, and
    // nothing would notice. This is the null run of the mutation harness itself.
    const analysis = analyse({ ...TREE });
    expect(serverSideTriggerViolations(analysis, SERVER_ADOPTER_EXEMPTIONS)).toEqual([]);
    expect(doubleMountedBoundaryViolations(analysis)).toEqual([]);
  });

  it("CONTROL (asserts GREEN): a layout that streams a slot behind a box-reserving placeholder", () => {
    // WHY THIS CASE ASSERTS GREEN, AND IT IS THE MOST IMPORTANT ONE IN THE FILE. Without it the
    // boundary property reads as "do not stream a nav slot", and the next author closes a real red by
    // deleting a `<Suspense>` — which would put four database reads back on the host layout's
    // critical path and make every `loading.tsx` under `(host)` useless again (STATE-01, plan 11-12).
    // The property is about MOUNTING THE OVERLAY ON BOTH SIDES, not about streaming.
    const file = "src/app/(host)/host/fake-streamed-layout.tsx";
    const layout = [
      'import { Suspense } from "react";',
      'import { NavSlotSkeleton } from "@/components/patterns/auth-slot-skeleton";',
      'import { AmbientHostNav } from "@/components/patterns/ambient-notifications";',
      'import { HOST_NAV_LINKS } from "@/lib/nav";',
      "export default function FakeStreamedLayout() {",
      "  return (",
      "    <Suspense fallback={<NavSlotSkeleton links={HOST_NAV_LINKS} />}>",
      '      <AmbientHostNav userId="u" />',
      "    </Suspense>",
      "  );",
      "}",
    ].join("\n");

    const analysis = analyse({ ...TREE, [file]: layout });
    // The fixture really did reach the walk, and its boundary really was collected — otherwise the
    // green below is the green of a file nobody opened.
    expect(analysis.boundaries.filter((b) => b.file === file)).toHaveLength(1);
    // …and the resolved child really does mount the overlay, so this control is a control over a
    // boundary that COULD have been reported and was not, rather than over an inert one.
    expect(
      analysis.mountsOverlay(
        analysis.resolveTag(file, "AmbientHostNav") ?? "",
      ),
      "the fixture's streamed child does not reach the overlay, so this control proves nothing",
    ).toBe(true);
    expect(
      analysis.mountsOverlay(analysis.resolveTag(file, "NavSlotSkeleton") ?? ""),
      "the box-reserving placeholder is being read as an overlay mount — the render graph has " +
        "regressed to import reachability, and the property has become a ban on streaming",
    ).toBe(false);

    expect(doubleMountedBoundaryViolations(analysis)).toEqual([]);
  });
});
