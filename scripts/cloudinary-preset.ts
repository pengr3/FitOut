// ============================================================================================
// cloudinary-preset — RECONCILE THE LISTING UPLOAD PRESET WITH THE COMMITTED DECLARATION, AND
// PROVE IT STILL MATCHES.
//
// ── WHAT IT RECONCILES, AND AGAINST WHAT ────────────────────────────────────────────────────────
// The Cloudinary upload preset named by `LISTING_UPLOAD_PRESET` is this phase's load-bearing
// security control: it carries the incoming transformation that bounds a stored asset in pixels and
// bytes and drops every metadata tag including the GPS IFD (D-182 + D-189), and it carries the
// format gate that refuses vector documents and multi-frame animations AT THE BOUNDARY, server-side
// and un-omittable by the client (D-184, 16.1-RESEARCH F-3). Its NAME is repo state. Its CONTENTS
// are account state and are not in git.
//
// 16.1-RESEARCH § R-1.6 calls this LAYER 4 of five, and states the rule that makes it worth having:
// both modes read ONLY `src/lib/listing/upload-policy.ts`. This script re-spells no number, no
// format and no transformation component — the declared transformation string is PARSED here, never
// retyped — so there is nothing for the preset and the repo to drift apart on. A reconciler that
// typed the transformation out again would be a second copy of it, which is precisely the rule-F2
// defect this phase exists to end, and would be worse than no reconciler at all.
// `tests/design/cloudinary-preset-script.test.ts` asserts that property over this file's own
// comment-stripped source.
//
// ── IT PRINTS WHAT IT CHECKED ───────────────────────────────────────────────────────────────────
// Every checked property echoes the value it read, and `--verify` prints the raw `settings` payload
// it received before it says anything about it. The contract is `scripts/verify-workflows.mjs:70-74`
// verbatim: "a checker that prints only PASS/FAIL asks you to trust it; one that prints the parsed
// value hands you the evidence." Here that matters more than usual, because the subject of the
// assertions is off-repo state that the reader cannot open in their editor — the printed payload IS
// the record, and 16.1-RESEARCH § R-1.6 layer 5 asks for it to be pasted into the phase UAT.
//
// Usage:  npm run cloudinary:preset -- --apply     create or update the preset from the declaration
//         npm run cloudinary:preset -- --verify    diff the account against the declaration
//         npx tsx scripts/cloudinary-preset.ts --verify
//
// Exit codes:
//   0  every checked property holds (or `--apply` reconciled successfully and the re-verify passed)
//   1  a property FAILED (drift), or a hard stop fired (no mode given, both modes given, an
//      unrecognised argument, the preset does not exist, an unrecognised vendor key, or — WR-05 —
//      an `--apply` WRITE THE API REFUSED: a POST/PUT answered 400/422/500 is the vendor declining
//      the reconciliation, so the preset was not written and the account is in whatever state it
//      was in. That is a failure, not an inability to look, and it is the one code an operator or a
//      CI wrapper must not read as "expected here, skip")
//   3  THE TOOL COULD NOT RUN — no credential, a rejected credential (401/403), or the Admin API did
//      not answer at all. NOT a drift finding. Reporting "I could not look" as "I looked and it is
//      broken" trains people to ignore the check, which is the same law as the vacuous-green rule
//      above, pointed the other way — and so does the reverse, which is why the write refusal above
//      is not filed here.
//
// ── `tsx` IS AN UNDECLARED TRANSITIVE, AND THAT IS RECORDED RATHER THAN ABSORBED ────────────────
// This file is `.ts` and runs through `tsx`, not `.mjs` through plain `node`, because plain `node`
// can neither `import` a `.ts` file nor resolve the `@/` alias — so a `.mjs` reconciler would have
// to re-spell the transformation string, and the paragraph above is the whole reason this script
// exists. `scripts/ops-alerts.ts` already imports `@/lib/ops/alerts` and runs as a tsx script, and
// `tsconfig.json:21-23` maps the `@/` alias onto `./src`, which tsx honours.
//
// ⚠ THAT SENTENCE IS DELIBERATELY NOT SPELLED WITH THE GLOB. `tests/helpers/source-text.ts` is a
// regex pass, not a parser, and its own header says so. A slash-star sequence inside a LINE comment
// opens a block comment as far as it is concerned and swallows everything up to the next close —
// which, measured here on 2026-08-26, ate this file's own import statement and made the rule-F2
// assertion in `tests/design/cloudinary-preset-script.test.ts` report that the declaration was
// never imported at all. A file that is asserted over must keep that sequence out of its prose.
//
// THE COST: `tsx` is NOT a declared devDependency. `npm ls tsx` resolves it at 4.22.4 via
// `drizzle-kit@0.31.10` and `vite@8.0.16`. Four shipped npm scripts — `db:seed`, `db:test:setup`,
// `email:previews`, `ops:alerts` — already rest on that same undeclared transitive, so this adds no
// new class of fragility; it inherits an existing one. Recorded here the way
// `scripts/verify-workflows.mjs:116-121` records `yaml`'s, and with the same rule: the day a
// hoisting change makes `tsx` unresolvable, THE FIX IS A DEPENDENCY DECISION TO RAISE, never the
// deletion of the reconciler.
//
// ── WHAT THIS TOOL CANNOT SEE, SAID OUT LOUD RATHER THAN IMPLIED AWAY ───────────────────────────
// `--verify` proves the preset matched AT THE MOMENT IT RAN. Between two runs a dashboard edit is
// UNDETECTABLE. Layer 4 does not make the preset repo state and nothing in this header should be
// read as claiming that it does; 16.1-RESEARCH § R-1.6 names it as the phase's one genuinely
// un-pinnable property, and threat T-16.1-06 accepts it explicitly rather than papering over it.
// This script prints that sentence in its own output, so the person reading a green does not have to
// have read this header to know what the green is worth.
//
// AND ONE DECLARED COMPONENT IS INVISIBLE TO IT ENTIRELY. The vendor APPLIES the format-conversion
// component but does not PERSIST it in the preset it hands back, so `--verify` can say nothing about
// whether it is set. That is measured, not assumed, and the measurement is written out in full beside
// `VENDOR_NORMALISES_AWAY` below. Anyone who sees a check that looks missing should read it there
// before "restoring" one: a check that fires on a correct account is an alarm nobody re-runs.
//
// ONE FREE PROPERTY MAKES THE RESIDUAL TOLERABLE: the mechanism fails CLOSED. Delete or rename the
// preset on the dashboard and Cloudinary answers `Upload preset not found` (measured, probe E7) —
// NO upload succeeds at all. There is no silent-degradation mode in which uploads keep working
// without the transformation. That is materially better than an ambient dependency whose failure
// mode is a guard that SKIPS, which is what `src/lib/listing/cloudinary-provenance.ts:43-51` refuses
// to depend on.
//
// ── WHAT IT DOES NOT TOUCH ──────────────────────────────────────────────────────────────────────
//   - NO DATABASE. It opens no connection, imports no schema and reads no `DATABASE_URL` (GATE-06).
//   - NO ASSET MUTATION. It calls preset endpoints only; there is no `destroy` path here and no
//     delete of anything but a preset field's previous value (threat T-16.1-02 is owned elsewhere).
//   - NO SECRET IN THE OUTPUT. `CLOUDINARY_API_SECRET` is used in one place, the Basic auth header,
//     and request headers are never echoed (threat T-16.1-14). The printed evidence is the parsed
//     `settings` payload and the drift lines.
//   - NO SDK. The `cloudinary@2.10.0` package is present and its Admin API would work, but three
//     `fetch` calls keep this script free of the SDK's global-config side effects.
// ============================================================================================

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  LISTING_ALLOWED_FORMATS,
  LISTING_INCOMING_TRANSFORMATION,
  LISTING_UPLOAD_PRESET,
} from "@/lib/listing/upload-policy";

// The Admin API origin. Deliberately alone on its own line: `tests/helpers/source-text.ts` strips
// `//` without knowing about string literals, so the `//` in a scheme takes the rest of ITS line
// with it. Keeping nothing else on this line means the stripper eats only whitespace.
const ADMIN_API_ORIGIN = "https://api.cloudinary.com";

/**
 * The credential this script may read, and the ONLY environment it may read. Allow-listed exactly
 * like `scripts/send-email-previews.ts:238`, and deliberately narrow: the widget's silent
 * `NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET` fallback is NOT read here and must stay unset — the preset
 * name is a repo constant (threat T-16.1-09).
 */
const CREDENTIAL_KEYS = [
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

// ── THE CANONICALISATION TABLE, WRITTEN ONCE AND USED FOR BOTH SIDES OF THE DIFF ────────────────
// Probe E12 measured the Admin API returning `settings.transformation` as a PARSED ARRAY of objects
// with long keys, while the declaration is the vendor's short-prefix string. One side has to be
// converted to the other, and doing it with one table used in both directions is what stops the
// diff from silently comparing a thing to itself.
//
// ⚠ THE `f` ROW WAS THE ONE NOT CONFIRMED AGAINST A LIVE GET, AND IT HAS NOW BEEN MEASURED — the
// answer was not a rename. Probe E12's preset predated the format-conversion component, so the long
// key the vendor uses for it was never seen. Plan 16.1-07's live `--apply` + `--verify` run on
// 2026-08-27 settled it: the vendor returns NO key for that component at all. The persisted preset
// carries exactly four keys and the format-conversion component is absent from every one of them.
// The row below stays, because the DECLARATION still spells that component and this table is what
// parses it — and because if the vendor ever starts persisting the key, it must be recognised rather
// than reported as an unknown vendor key. What changed is not this table but what ABSENCE means; see
// `VENDOR_NORMALISES_AWAY` below.
//
// The hard-stop rule is unchanged and still absolute: an unknown short prefix, or a returned long key
// this table does not know, is a HARD FAILURE with the raw payload printed — never a skip.

/** short prefix → the long key the Admin API returns for it. */
export const TRANSFORMATION_KEYS: Readonly<Record<string, string>> = {
  c: "crop",
  w: "width",
  h: "height",
  q: "quality",
  f: "fetch_format",
};

/** The two components whose value the vendor returns as a NUMBER rather than a string. */
const NUMERIC_KEYS: ReadonlySet<string> = new Set(["width", "height"]);

/** Every long key this script is willing to recognise on a remote transformation object. */
export const KNOWN_LONG_KEYS: ReadonlySet<string> = new Set(
  Object.values(TRANSFORMATION_KEYS),
);

/**
 * ── THE ONE THING THIS TOOL CANNOT CHECK, AND THE MEASUREMENT THAT PROVES WHY ───────────────────
 *
 * Declared components that Cloudinary APPLIES at upload but does NOT PERSIST in the preset it hands
 * back from `GET /upload_presets/<name>`. Their ABSENCE from the returned object is not drift; a
 * PRESENT value that disagrees with the declaration still is.
 *
 * ⚠ DO NOT "RESTORE" THE MISSING CHECK. It looks like a hole. It was measured, and the measurement
 * is why the hole is the honest answer.
 *
 * WHAT WAS OBSERVED (16.1-07 UAT, 2026-08-27, against the real account). The preset was created from
 * this repo's declaration and immediately read back. The returned transformation object carried
 * exactly FOUR keys — the crop mode, the two dimensions and the quality — and the format-conversion
 * component was absent from it under NO spelling at all. Not renamed. Gone.
 *
 * WHY THAT COULD NOT BE READ CHARITABLY. "The vendor drops a key it still honours" and "the
 * transformation you believe you applied was never applied" produce an IDENTICAL GET, and they have
 * opposite consequences: the second one means an image format that browsers cannot render is stored
 * and delivered as-is, and this phase's whole render-side guarantee is silently false. So it was
 * settled by experiment, not by assumption.
 *
 * THE EXPERIMENT (six probe uploads, ALL SIX DESTROYED afterwards, zero residue on the account). The
 * decisive pair is E and F: the same real source file, through the same endpoint, differing only in
 * whether this preset's transformation was applied. WITH the preset, the stored asset's format was
 * CHANGED. WITHOUT any transformation — the control — the stored asset kept the source's own format.
 * Four further probes established that the effect is not visible on an input the optimiser has no
 * reason to convert, which is why the control pair, and not a single upload, is what decides.
 *
 * CONCLUSION. The transformation IS applied at upload and the format conversion DOES happen. The
 * component missing from the GET is a VERIFIER-ONLY false alarm — the vendor normalises it out of the
 * persisted representation while still honouring it.
 *
 * WHAT THIS COSTS, SAID OUT LOUD RATHER THAN IMPLIED AWAY. This tool no longer proves that the format
 * conversion is present on the preset, because the vendor gives it no way to. What proves it is the
 * UAT's product check — a real file of that format uploads AND renders on a human's screen. That is a
 * weaker mechanism than a scripted diff, and pretending otherwise by keeping a check that fires on a
 * correct account would be worse: an alarm that always fires is an alarm nobody re-runs, which is the
 * same law as the vacuous-green rule, pointed the other way.
 */
export const VENDOR_NORMALISES_AWAY: ReadonlySet<string> = new Set([TRANSFORMATION_KEYS.f]);

/** Base class so a caller can catch every parse refusal without enumerating the subclasses. */
export class TransformationParseError extends Error {}

/**
 * The fail-closed throw. A component whose prefix this table does not know cannot be compared, and
 * a comparison that silently skipped it would let a vendor rename produce a green `--verify` that
 * checked nothing — the exact vacuous green `scripts/verify-workflows.mjs:53-56` exists to remove.
 */
export class UnknownTransformationKeyError extends TransformationParseError {
  constructor(
    readonly token: string,
    readonly prefix: string,
  ) {
    super(
      `Unrecognised transformation component "${token}" (prefix "${prefix}"). ` +
        `Known prefixes: ${Object.keys(TRANSFORMATION_KEYS).join(", ")}. ` +
        `This is a hard failure, never a skip — see the table's warning in this file.`,
    );
    this.name = "UnknownTransformationKeyError";
  }
}

/** A dimension component whose value is not a number the vendor could have returned. */
export class MalformedTransformationValueError extends TransformationParseError {
  constructor(
    readonly token: string,
    readonly longKey: string,
  ) {
    super(
      `Transformation component "${token}" maps to "${longKey}", which the Admin API returns as a ` +
        `number, but its value is not numeric.`,
    );
    this.name = "MalformedTransformationValueError";
  }
}

/** A remote transformation component object, in the long-key shape the Admin API returns. */
export type CanonicalTransformation = Record<string, string | number>;

/**
 * Turn the declared short-prefix transformation string into the long-key object shape the Admin API
 * returns, so both sides of the diff speak one language.
 *
 * @param spec a comma-separated transformation string, e.g. the declared incoming transformation
 * @returns the same components keyed by their long names, dimensions coerced to numbers
 * @throws UnknownTransformationKeyError on a prefix the table does not know
 * @throws MalformedTransformationValueError on a non-numeric dimension
 */
export function canonicalizeTransformation(spec: string): CanonicalTransformation {
  const canonical: CanonicalTransformation = {};
  for (const raw of spec.split(",")) {
    const token = raw.trim();
    if (token === "") continue;
    const cut = token.indexOf("_");
    const prefix = cut === -1 ? token : token.slice(0, cut);
    const value = cut === -1 ? "" : token.slice(cut + 1);
    const longKey = TRANSFORMATION_KEYS[prefix];
    if (longKey === undefined) throw new UnknownTransformationKeyError(token, prefix);
    if (NUMERIC_KEYS.has(longKey)) {
      const numeric = Number(value);
      if (value === "" || !Number.isFinite(numeric)) {
        throw new MalformedTransformationValueError(token, longKey);
      }
      canonical[longKey] = numeric;
    } else {
      canonical[longKey] = value;
    }
  }
  return canonical;
}

/** The declaration, in the shape the diff wants it. Every field comes from the one declaration. */
export interface DeclaredPreset {
  readonly name: string;
  readonly transformation: string;
  readonly allowedFormats: readonly string[];
}

/**
 * The only place this script decides what the preset should contain — and it decides nothing. Every
 * field is an import.
 */
export const DECLARED_PRESET: DeclaredPreset = {
  name: LISTING_UPLOAD_PRESET,
  transformation: LISTING_INCOMING_TRANSFORMATION,
  allowedFormats: LISTING_ALLOWED_FORMATS,
};

/** What `GET /upload_presets/<name>` returns, typed as loosely as it actually arrives. */
export interface RemotePreset {
  name?: unknown;
  unsigned?: unknown;
  settings?: {
    transformation?: unknown;
    allowed_formats?: unknown;
  };
}

/**
 * Diff a preset as the account returned it against the declaration.
 *
 * @returns a list of human-readable difference lines. EMPTY means no drift; anything else is exit 1.
 *
 * Pure: no network, no credential, no clock. That is what lets the whole arithmetic half of this
 * tool be pinned in CI on a machine that structurally cannot hold a Cloudinary credential
 * (T-11-CISECRET).
 */
export function presetDrift(remote: RemotePreset, declared: DeclaredPreset): string[] {
  const lines: string[] = [];

  if (remote.name !== declared.name) {
    lines.push(
      `name: account has ${JSON.stringify(remote.name)}, declaration says ` +
        `${JSON.stringify(declared.name)}`,
    );
  }

  // `!== false`, not `=== true`. An absent field, a string, or anything else the vendor might hand
  // back is NOT a signed preset as far as this check is concerned. An unsigned preset is a standing
  // upload hole (threat T-16.1-08) and "we could not tell" must land on the refusing side.
  if (remote.unsigned !== false) {
    lines.push(
      `unsigned: account has ${JSON.stringify(remote.unsigned)}, and it must be exactly false — ` +
        `an unsigned preset accepts uploads from anyone who knows its name`,
    );
  }

  const expected = canonicalizeTransformation(declared.transformation);
  const remoteTransformation = remote.settings?.transformation;
  if (!Array.isArray(remoteTransformation)) {
    lines.push(
      `transformation: account has ${JSON.stringify(remoteTransformation)}, expected an array of ` +
        `exactly one component object`,
    );
  } else if (remoteTransformation.length !== 1) {
    lines.push(
      `transformation: account carries ${remoteTransformation.length} component object(s); the ` +
        `declaration is exactly one. A chained component is drift, not an addition — it can widen ` +
        `the ceiling the single declared component exists to impose`,
    );
  } else if (
    typeof remoteTransformation[0] !== "object" ||
    remoteTransformation[0] === null
  ) {
    lines.push(
      `transformation: account's single component is ${JSON.stringify(remoteTransformation[0])}, ` +
        `expected an object`,
    );
  } else {
    const component = remoteTransformation[0] as Record<string, unknown>;
    for (const [key, want] of Object.entries(expected)) {
      if (!(key in component)) {
        // Absent AND known to be normalised away by the vendor is not drift — measured, see
        // `VENDOR_NORMALISES_AWAY`. Absent for any other key still is.
        if (VENDOR_NORMALISES_AWAY.has(key)) continue;
        lines.push(
          `transformation.${key}: ABSENT on the account, declaration says ${JSON.stringify(want)}`,
        );
        continue;
      }
      if (component[key] !== want) {
        lines.push(
          `transformation.${key}: account has ${JSON.stringify(component[key])}, declaration says ` +
            `${JSON.stringify(want)}`,
        );
      }
    }
    for (const key of Object.keys(component)) {
      if (KNOWN_LONG_KEYS.has(key)) continue;
      lines.push(
        `transformation.${key}: UNRECOGNISED vendor key (value ${JSON.stringify(component[key])}). ` +
          `This script does not know what it means, so it will not report agreement about it. ` +
          `Add the row to the table with the evidence in hand, or remove the component`,
      );
    }
  }

  const remoteFormats = remote.settings?.allowed_formats;
  if (!Array.isArray(remoteFormats)) {
    lines.push(
      `allowed_formats: account has ${JSON.stringify(remoteFormats)}, expected an array`,
    );
  } else {
    const have = new Set(remoteFormats.map((entry) => String(entry)));
    const want = new Set(declared.allowedFormats);
    const absent = [...want].filter((entry) => !have.has(entry));
    const extra = [...have].filter((entry) => !want.has(entry));
    if (absent.length > 0) {
      lines.push(
        `allowed_formats: MISSING [${absent.join(", ")}] — the account refuses a format the picker ` +
          `offers, which is a user-visible split`,
      );
    }
    if (extra.length > 0) {
      lines.push(
        `allowed_formats: EXTRA [${extra.join(", ")}] — the account accepts a format the ` +
          `declaration does not, which is how a scriptable document or a multi-frame animation ` +
          `gets in`,
      );
    }
  }

  return lines;
}

// ============================================================================================
// EVERYTHING BELOW THIS LINE TALKS TO THE NETWORK. It runs only when this module is the process
// entry point, so importing the pure half above costs nothing and starts nothing.
// ============================================================================================

/** Thrown when the tool could not look, which is exit 3 and is NOT a drift finding. */
class CouldNotRunError extends Error {
  constructor(
    message: string,
    readonly detail: readonly string[] = [],
  ) {
    super(message);
    this.name = "CouldNotRunError";
  }
}

/**
 * Thrown when the API ANSWERED AND REFUSED — exit 1, a hard stop, and emphatically not a "could not
 * look" (WR-05).
 *
 * ⚠ THE DISTINCTION IS THE WHOLE POINT OF HAVING TWO CLASSES. A `POST`/`PUT` that comes back 400,
 * 422 or 500 is the Admin API talking: it received the write, it declined it, and the preset is in
 * whatever state it was in before. That is a FAILED RECONCILIATION of this phase's load-bearing
 * security control. Reporting it as 3 tells the operator — and any CI wrapper following this file's
 * own header, which instructs them to read 3 as "no credential here, expected, skip" — that nothing
 * was checked and nothing is wrong. Nothing is a worse outcome for a checker than a failure that
 * reads as a routine skip; it is the same law as the vacuous-green rule, pointed a third way.
 *
 * Credential rejections (401/403) and network silence stay on `CouldNotRunError`, because those are
 * genuinely "I could not look".
 */
class HardStopError extends Error {
  constructor(
    message: string,
    readonly detail: readonly string[] = [],
  ) {
    super(message);
    this.name = "HardStopError";
  }
}

const USAGE = [
  "Usage:",
  "  npm run cloudinary:preset -- --apply     create or update the preset from the declaration",
  "  npm run cloudinary:preset -- --verify    diff the account against the declaration",
  "",
  "Exit codes:  0 = every checked property holds   1 = drift or a hard stop   3 = could not run",
];

function printUsage(): void {
  for (const line of USAGE) console.error(line);
}

/**
 * Read an allow-listed pair out of `.env.local` without overriding what the shell already exported.
 * Dependency-free and deliberately narrow, copied in structure from
 * `scripts/send-email-previews.ts:216-238`: this script has no business importing the rest of that
 * file's contents.
 */
function loadFromEnvLocal(keys: readonly string[]): void {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) return;
  for (const raw of readFileSync(path, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (line === "" || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    if (!keys.includes(key) || process.env[key]) continue;
    process.env[key] = line
      .slice(eq + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
  }
}

interface AdminContext {
  readonly collectionUrl: string;
  readonly presetUrl: string;
  /** Base64 of `<api key>:<api secret>`. Used in exactly one place and NEVER printed. */
  readonly authorization: string;
}

interface AdminResponse {
  readonly status: number;
  readonly body: unknown;
  readonly raw: string;
}

/**
 * One Admin API call. The Authorization header is built here and dies here — no caller receives it
 * and no code path echoes request headers (threat T-16.1-14).
 */
async function adminFetch(
  ctx: AdminContext,
  method: string,
  url: string,
  payload?: unknown,
): Promise<AdminResponse> {
  const headers: Record<string, string> = { Authorization: `Basic ${ctx.authorization}` };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch (cause) {
    throw new CouldNotRunError("THE ADMIN API DID NOT ANSWER.", [
      `${method} ${url}`,
      `network said   ${cause instanceof Error ? cause.message : String(cause)}`,
      "",
      "Nothing about the preset has been checked, in either direction.",
    ]);
  }
  const raw = await response.text();
  let body: unknown;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    body = undefined;
  }
  if (response.status === 401 || response.status === 403) {
    throw new CouldNotRunError("THE CREDENTIAL WAS REJECTED.", [
      `${method} ${url} → ${response.status}`,
      "",
      "This is NOT a drift finding — nothing about the preset has been checked. Confirm the three",
      `${CREDENTIAL_KEYS.join(", ")} values, then re-run.`,
    ]);
  }
  return { status: response.status, body, raw };
}

const CHECK_INDENT = "          ";

/**
 * How many pages of the preset list the account-wide scan will read before it gives up (WR-06).
 *
 * At `max_results=500` a page each, this is more presets than any plausible account holds — the cap
 * is not a limit on the account, it is a limit on US: it bounds the request count and it terminates
 * a vendor that hands back the same `next_cursor` forever. Reaching it is a FAILED check, never a
 * silently partial one.
 */
const MAX_SCAN_PAGES = 20;

function reportCheck(failures: string[], property: string, ok: boolean, evidence: string): void {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${property}`);
  console.log(`${CHECK_INDENT}${evidence}`);
  if (!ok) failures.push(property);
}

/**
 * The verify path. `--apply` re-runs this one, so `--apply` can never report success against a
 * preset it did not actually leave matching.
 *
 * @returns the list of failed property names. Empty means exit 0.
 */
async function runVerify(ctx: AdminContext): Promise<string[]> {
  const failures: string[] = [];
  const declared = DECLARED_PRESET;

  console.log(`\n── preset "${declared.name}" ${"─".repeat(60)}`);
  const got = await adminFetch(ctx, "GET", ctx.presetUrl);

  if (got.status === 404) {
    // NOT "nothing to compare". A missing preset is the whole control being absent, and — because
    // the mechanism fails closed — it also means every upload through the widget is failing right
    // now with `Upload preset not found`.
    reportCheck(
      failures,
      "the preset exists on the account",
      false,
      `GET returned 404. The preset "${declared.name}" DOES NOT EXIST. Run this script with ` +
        `--apply to create it from the declaration.`,
    );
    return failures;
  }
  if (got.status < 200 || got.status >= 300) {
    throw new CouldNotRunError("THE ADMIN API RETURNED AN UNEXPECTED STATUS.", [
      `GET ${ctx.presetUrl} → ${got.status}`,
      `body           ${got.raw.slice(0, 500)}`,
      "",
      "Nothing about the preset has been checked, in either direction.",
    ]);
  }

  const remote = (got.body ?? {}) as RemotePreset;

  // The raw payload comes FIRST, before any verdict about it. This is the evidence half of the
  // printed-what-it-checked contract, and it is what plan 16.1-07 pastes into the phase record.
  console.log(`${CHECK_INDENT}raw settings   ${JSON.stringify(remote.settings)}`);

  reportCheck(
    failures,
    "name",
    remote.name === declared.name,
    `account=${JSON.stringify(remote.name)}  declared=${JSON.stringify(declared.name)}`,
  );
  reportCheck(
    failures,
    "unsigned is exactly false",
    remote.unsigned === false,
    `account=${JSON.stringify(remote.unsigned)}`,
  );

  const expected = canonicalizeTransformation(declared.transformation);
  const remoteTransformation = Array.isArray(remote.settings?.transformation)
    ? (remote.settings?.transformation as unknown[])
    : [];
  const component =
    remoteTransformation.length === 1 &&
    typeof remoteTransformation[0] === "object" &&
    remoteTransformation[0] !== null
      ? (remoteTransformation[0] as Record<string, unknown>)
      : null;
  for (const [key, want] of Object.entries(expected)) {
    const have = component === null ? undefined : component[key];
    // The echo must agree with `presetDrift` about what absence means, or the printed row and the
    // authoritative drift list would contradict each other on a correct account.
    const normalisedAway = have === undefined && VENDOR_NORMALISES_AWAY.has(key);
    reportCheck(
      failures,
      `transformation.${key}`,
      component !== null && (normalisedAway || have === want),
      normalisedAway
        ? `NOT PERSISTED by the vendor, and that is expected — declared=${JSON.stringify(want)}. ` +
            `It IS applied at upload; this tool cannot see it. Measured 2026-08-27, see this ` +
            `script's note. Do not restore a check here.`
        : `account=${JSON.stringify(have)}  declared=${JSON.stringify(want)}`,
    );
  }

  const remoteFormats = Array.isArray(remote.settings?.allowed_formats)
    ? (remote.settings?.allowed_formats as unknown[]).map((entry) => String(entry))
    : null;
  reportCheck(
    failures,
    "allowed_formats",
    remoteFormats !== null &&
      remoteFormats.length === declared.allowedFormats.length &&
      declared.allowedFormats.every((entry) => remoteFormats.includes(entry)),
    `account=${JSON.stringify(remoteFormats)}  declared=${JSON.stringify(declared.allowedFormats)}`,
  );

  // The drift list is computed independently of the property echoes above, and it is the authority.
  // It catches what a per-property echo structurally cannot: a key the account carries that the
  // declaration never mentioned, and an unrecognised vendor key.
  const drift = presetDrift(remote, declared);
  if (drift.length > 0) {
    console.log("");
    console.log(`  ${drift.length} difference(s) against the declaration:`);
    for (const line of drift) console.log(`    - ${line}`);
    if (!failures.includes("no drift against the declaration")) {
      failures.push("no drift against the declaration");
    }
  }

  // ── THE ACCOUNT-WIDE INVARIANT (16.1-RESEARCH § I-4, threat T-16.1-08) ────────────────────────
  // An unsigned preset ANYWHERE on the account is a standing upload hole, whatever this one preset
  // says. `ml_default` was checked on 2026-08-26 and was `unsigned: false`; this re-proves it rather
  // than inheriting a research note.
  // ⚠ THIS SCAN READS THE SAME PROPERTY AS `presetDrift`'S `unsigned` CHECK AND MUST AGREE WITH IT
  // ABOUT WHAT ABSENCE MEANS (WR-06). That check states the rule out loud — "An absent field, a
  // string, or anything else the vendor might hand back is NOT a signed preset as far as this check
  // is concerned … 'we could not tell' must land on the refusing side" — and tests `!== false`. This
  // one used to test `=== true`, which is the same sentence with the polarity inverted: if the LIST
  // endpoint ever omits the field, or returns it as the STRING "true", every entry would count as
  // signed and the check would print an empty list — a green indistinguishable from a real one, on
  // the control this file calls a standing upload hole. The two spellings of one rule in one file
  // are now the same spelling.
  //
  // AND IT FOLLOWS THE CURSOR. `max_results=500` with no follow-up silently never sees preset 501,
  // so a large account's unsigned preset would sit outside the scan and the tool would report
  // nothing about it. The page cap below bounds both the request count and a vendor that hands back
  // the same cursor forever; hitting it FAILS the check rather than reporting on a partial read,
  // which is the same "we could not tell must refuse" rule applied to our own enumeration.
  console.log(`\n── account-wide preset scan ${"─".repeat(56)}`);
  const presets: RemotePreset[] = [];
  let cursor: string | undefined;
  let pages = 0;
  let truncated = false;
  do {
    const pageUrl =
      `${ctx.collectionUrl}?max_results=500` +
      (cursor === undefined ? "" : `&next_cursor=${encodeURIComponent(cursor)}`);
    const listed = await adminFetch(ctx, "GET", pageUrl);
    if (listed.status < 200 || listed.status >= 300) {
      throw new CouldNotRunError("THE PRESET LIST COULD NOT BE READ.", [
        `GET ${ctx.collectionUrl} → ${listed.status}`,
        `page           ${pages + 1}`,
        `body           ${listed.raw.slice(0, 500)}`,
      ]);
    }
    const page = listed.body as { presets?: unknown; next_cursor?: unknown };
    if (Array.isArray(page?.presets)) presets.push(...(page.presets as RemotePreset[]));
    cursor =
      typeof page?.next_cursor === "string" && page.next_cursor !== ""
        ? page.next_cursor
        : undefined;
    pages += 1;
    if (cursor !== undefined && pages >= MAX_SCAN_PAGES) {
      truncated = true;
      break;
    }
  } while (cursor !== undefined);

  // The evidence is the RAW per-entry value, not a filtered list of names. The old line printed
  // `unsigned=[]` and nothing else, so the one output that mattered — what the vendor actually said
  // about each preset — was the one thing the reader could not see.
  const notProvablySigned = presets
    .filter((entry) => entry?.unsigned !== false)
    .map((entry) => `${String(entry?.name)}=${JSON.stringify(entry?.unsigned)}`);
  reportCheck(
    failures,
    "every preset on the account is provably signed",
    notProvablySigned.length === 0 && !truncated,
    `pages=${pages}  presets=${JSON.stringify(
      presets.map((entry) => [String(entry?.name), entry?.unsigned]),
    )}` +
      (notProvablySigned.length === 0
        ? ""
        : `  NOT PROVABLY SIGNED=${JSON.stringify(notProvablySigned)}`) +
      (truncated
        ? `  ⚠ TRUNCATED after ${MAX_SCAN_PAGES} pages and the account had more — the presets ` +
          `beyond this point were NOT scanned, so this check cannot pass`
        : ""),
  );

  return failures;
}

/** Create the preset if it is absent, update it if it is present. Sends `unsigned: false` always. */
async function runApply(ctx: AdminContext): Promise<void> {
  const declared = DECLARED_PRESET;
  const payload = {
    name: declared.name,
    unsigned: false,
    transformation: declared.transformation,
    allowed_formats: declared.allowedFormats.join(","),
  };

  console.log(`\n── apply ${"─".repeat(74)}`);
  console.log(`${CHECK_INDENT}sending        ${JSON.stringify(payload)}`);

  const probe = await adminFetch(ctx, "GET", ctx.presetUrl);
  const creating = probe.status === 404;
  const written = creating
    ? await adminFetch(ctx, "POST", ctx.collectionUrl, payload)
    : await adminFetch(ctx, "PUT", ctx.presetUrl, payload);

  console.log(
    `${CHECK_INDENT}${creating ? "created" : "updated"}        ${written.status} ` +
      `${written.raw.slice(0, 300)}`,
  );

  if (written.status < 200 || written.status >= 300) {
    // EXIT 1, NOT 3 (WR-05). The API answered and refused — see `HardStopError`. `runVerify` is not
    // reached, so nothing downstream corrects this verdict; it is the only thing the operator gets.
    throw new HardStopError("THE PRESET COULD NOT BE WRITTEN.", [
      `${creating ? "POST" : "PUT"} → ${written.status}`,
      `body           ${written.raw.slice(0, 500)}`,
      "",
      "The API ANSWERED and declined the write. This is NOT a 'could not look': the preset was NOT",
      "reconciled and the account is in whatever state it was in before this ran. Re-verify with",
      "--verify once the cause above is fixed.",
    ]);
  }
}

/**
 * The CLI. Exported so the entry-point guard below is the ONLY thing that starts it — importing
 * this module for its pure half must not run a single check or print a single line.
 */
export async function main(argv: readonly string[]): Promise<void> {
  // ── WHY EVERY EXIT BELOW IS `process.exitCode` AND NEVER `process.exit()` ──────────────────────
  // MEASURED 16.1-07, 2026-08-27, Node v24.13.0 on Windows. This script's ONLY product is a
  // machine-readable exit code, so an exit code it never emits on purpose is a contract defect and
  // not a cosmetic one.
  //
  // `process.exit()` tears the process down SYNCHRONOUSLY. Called while an undici socket from a
  // `fetch` above is still closing, libuv aborts on a handle it is asked to close twice:
  //
  //     Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
  //
  // and the shell sees 127 — which conventionally means COMMAND NOT FOUND. Observed twice, on the
  // 404 branch specifically: that branch returns from the verify path BEFORE the account-wide scan,
  // so exactly one socket is mid-close when the exit fires. The verdict TEXT was correct every time.
  // Only the status was clobbered, which is the worst shape this bug could take — a human reading the
  // output sees the right answer and never suspects the number a script would have branched on.
  //
  // And the branch it fired on is the one that means THE SECURITY CONTROL IS MISSING.
  //
  // So: set the code, return, and let the event loop drain. Node exits with it once the last handle
  // is genuinely closed. Anyone adding a new exit path here must do the same — a bare
  // `process.exit()` after any network call reintroduces this exactly.

  // ── ARGUMENTS FIRST, BEFORE ANY CREDENTIAL WORK ────────────────────────────────────────────────
  // So every hard stop below is reachable with no environment at all, which is what makes them
  // testable and what makes a typo cheap to discover.
  const modes: string[] = [];
  for (const arg of argv) {
    if (arg === "--apply" || arg === "--verify") {
      modes.push(arg);
      continue;
    }
    console.error(`FATAL: unrecognised argument "${arg}".`);
    printUsage();
    console.error("");
    console.error("A misspelled flag must not run zero checks and exit 0 — that green would be a");
    console.error("lie, and indistinguishable from a real one. Hard stop.");
    process.exitCode = 1;
    return;
  }
  if (modes.length === 0) {
    console.error("FATAL: no mode given. This script does not default to either one.");
    printUsage();
    console.error("");
    console.error("--apply MUTATES live vendor state; --verify only reads. Guessing which one was");
    console.error("meant is not a kindness. Hard stop.");
    process.exitCode = 1;
    return;
  }
  if (modes.length > 1) {
    console.error(`FATAL: ${modes.length} modes given [${modes.join(", ")}]. Give exactly one.`);
    printUsage();
    console.error("");
    console.error("--apply already re-runs the verify path and exits on ITS result, so the pair is");
    console.error("never needed and asking for both hides which one was intended. Hard stop.");
    process.exitCode = 1;
    return;
  }
  const mode = modes[0];

  // ── THE CREDENTIAL. ITS ABSENCE IS EXIT 3, NOT A FINDING. ──────────────────────────────────────
  loadFromEnvLocal(CREDENTIAL_KEYS);
  const missing = CREDENTIAL_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    console.error("════════════════════════════════════════════════════════════════════════════════");
    console.error("FATAL: THE TOOL COULD NOT RUN. THIS IS *NOT* A DRIFT FINDING.");
    console.error("════════════════════════════════════════════════════════════════════════════════");
    console.error(`  missing        ${missing.join(", ")}`);
    console.error("");
    console.error("  Nothing about the preset has been checked, in either direction. Set the value(s)");
    console.error("  in .env.local (or export them) and re-run. CI structurally holds no Cloudinary");
    console.error("  credential (T-11-CISECRET), so this exit code is expected there and must never");
    console.error("  be read as drift.");
    process.exitCode = 3;
    return;
  }

  const cloudName = String(process.env.CLOUDINARY_CLOUD_NAME);
  const collectionUrl = `${ADMIN_API_ORIGIN}/v1_1/${cloudName}/upload_presets`;
  const ctx: AdminContext = {
    collectionUrl,
    presetUrl: `${collectionUrl}/${encodeURIComponent(DECLARED_PRESET.name)}`,
    authorization: Buffer.from(
      `${process.env.CLOUDINARY_API_KEY}:${process.env.CLOUDINARY_API_SECRET}`,
    ).toString("base64"),
  };

  console.log(`cloudinary-preset ${mode} — cloud "${cloudName}"`);
  console.log(`declaration       src/lib/listing/upload-policy.ts (every value below is imported)`);

  let failures: string[];
  try {
    if (mode === "--apply") await runApply(ctx);
    failures = await runVerify(ctx);
  } catch (cause) {
    // BEFORE the CouldNotRunError arm, deliberately: these two are printed the same way and differ
    // only in the code and the sentence, so the order is what keeps them from being merged one day.
    if (cause instanceof HardStopError) {
      console.error("");
      console.error("════════════════════════════════════════════════════════════════════════════");
      console.error(`FATAL: ${cause.message} THIS IS A HARD STOP, NOT A "COULD NOT RUN".`);
      console.error("════════════════════════════════════════════════════════════════════════════");
      for (const line of cause.detail) console.error(`  ${line}`);
      process.exitCode = 1;
      return;
    }
    if (cause instanceof CouldNotRunError) {
      console.error("");
      console.error("════════════════════════════════════════════════════════════════════════════");
      console.error(`FATAL: ${cause.message} THIS IS *NOT* A DRIFT FINDING.`);
      console.error("════════════════════════════════════════════════════════════════════════════");
      for (const line of cause.detail) console.error(`  ${line}`);
      process.exitCode = 3;
      return;
    }
    if (cause instanceof TransformationParseError) {
      console.error("");
      console.error(`FATAL: ${cause.message}`);
      process.exitCode = 1;
      return;
    }
    throw cause;
  }

  // ── WHAT THE VERDICT IS WORTH, PRINTED BESIDE THE VERDICT ─────────────────────────────────────
  // Not a footnote in a planning file. Whoever reads this line is the person who needs it.
  console.log("");
  console.log("  ⚠ WHAT THIS RUN DOES AND DOES NOT PROVE. It proves the preset matched the");
  console.log("    declaration AT THIS MOMENT. Preset contents are dashboard state, not repo state:");
  console.log("    a dashboard edit made between two runs of this script is UNDETECTABLE by it.");
  console.log("    The mechanism does fail CLOSED — a deleted or renamed preset means no upload");
  console.log("    succeeds at all — but that is a different guarantee from 'it is still correct'.");

  console.log("");
  if (failures.length > 0) {
    console.error(`${failures.length} checked propert(ies) FAILED:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log(`All checked properties hold for preset "${DECLARED_PRESET.name}".`);
}

// ── ENTRY POINT ─────────────────────────────────────────────────────────────────────────────────
// Run the CLI only when this module IS the process entry point. Without this guard, importing the
// pure half from a test would execute the whole script — print a usage banner and exit 1 — which is
// how a unit test file becomes a thing that kills the runner.
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath !== "" && invokedPath === resolve(fileURLToPath(import.meta.url))) {
  void main(process.argv.slice(2));
}
