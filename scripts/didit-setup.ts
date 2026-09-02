// ============================================================================================
// didit-setup — RECONCILE THE DIDIT WORKFLOW AND WEBHOOK DESTINATION WITH THE COMMITTED
// DECLARATION, AND PROVE THEY STILL MATCH.
//
// ── WHY THIS FILE EXISTS AT ALL ─────────────────────────────────────────────────────────────────
// Plan 18.1-04 Task 1 is a `checkpoint:human-action` that hands the operator a Didit Console and a
// list of things to click. `18.1-RESEARCH.md § ADDENDUM A2` retired most of that: the workflow and
// the webhook destination are BOTH creatable over the v3 API. What genuinely cannot be automated is
// an account and an API key. Everything after those two is this script.
//
// The shape is `scripts/cloudinary-preset.ts`, deliberately and almost line for line, because it is
// the same problem: a vendor object whose NAME is repo state and whose CONTENTS are account state
// and are not in git. That script's rule is the rule here — a checker that prints only PASS/FAIL
// asks you to trust it; one that prints the parsed value it read lets you check it yourself.
//
// ── WHAT THE DECLARATION IS, AND THE ONE WAY IT DIFFERS FROM THE CLOUDINARY PRECEDENT ───────────
// `cloudinary-preset.ts` IMPORTS its declaration from `src/lib/listing/upload-policy.ts` and retypes
// no value, so there is nothing for the preset and the repo to drift apart on. `DECLARED_WORKFLOW`
// below is spelled HERE instead, for one reason: the module that should own it,
// `src/lib/verification/providers/didit.ts`, is plan 18.1-05's file and does not exist yet.
// ⚠ WHEN 18.1-05 LANDS THAT ADAPTER, MOVE THIS CONSTANT INTO IT AND IMPORT IT HERE. Leaving a
// second copy behind is exactly the rule-F2 two-authorities defect this repo keeps closing.
//
// ── WHY THE COMPOSITION IS THE THREE MODULES IT IS ──────────────────────────────────────────────
//   · OCR + LIVENESS + FACE_MATCH, and nothing else.
//   · NO `AML` — 18-REGULATORY-BRIEF § 1: FitOut is not an AMLA covered person and not
//     BSP-supervised. Enabling a watchlist screen buys a compliance obligation nobody asked for and
//     introduces `review_aml_possible_match`, an In Review state D-262/D-263 have no operator path
//     for. (RESEARCH § Pitfall 8.)
//   · NO KYC expiration policy — it would silently un-approve live hosts and flip `deriveBookable`
//     on a live catalogue with no operator signal. Not expressible in this payload; asserted in
//     `verify` by reading the workflow back. Its absence is also what keeps the `Kyc Expired`
//     status unreachable (RESEARCH § ADDENDUM A6).
//   · NO `IP_ANALYSIS` — the vendor's own bundle includes it; 18.1-04's plan says three modules and
//     its $0.03 buys nothing this phase reads.
//   · `face_liveness_method: "PASSIVE"`, NOT `ACTIVE_3D` / `FLASHING`. RESEARCH § ADDENDUM A1: the
//     free tier is 500/month PER FEATURE, and active liveness has NO free tier. Passive is the
//     difference between $0.00 and ~$0.15 per check at FitOut's entire launch volume, and it drops
//     a host-facing interaction step. This is the vendor's own default for the core KYC bundle.
//
// ── WHAT IT REFUSES TO PRINT ────────────────────────────────────────────────────────────────────
// The API key is read into one header and dies there. The webhook signing secret is returned by the
// vendor EXACTLY ONCE, at creation, and is therefore written STRAIGHT INTO `.env.local` rather than
// to stdout — a terminal scrollback, a CI log and an agent transcript are all places a shared secret
// must not land. The script prints its LENGTH so the write is checkable without the value.
//
// ── USAGE ───────────────────────────────────────────────────────────────────────────────────────
//   npx tsx scripts/didit-setup.ts verify
//   npx tsx scripts/didit-setup.ts apply --webhook-url https://<public-host>/api/didit/webhook
//
// `verify` is READ-ONLY and is the default. `apply` creates what is missing and never edits what
// exists — a workflow whose composition has drifted is REPORTED, never silently rewritten, because
// a workflow version is what live sessions are pinned to.
// ============================================================================================

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

// ── THE DECLARATION ─────────────────────────────────────────────────────────────────────────────

/** Feature enum values are UPPERCASE and the v3 API rejects any unknown body field with 400. */
const DECLARED_WORKFLOW = {
  workflow_label: "FitOut Host Verification",
  features: [
    { feature: "OCR" },
    { feature: "LIVENESS", config: { face_liveness_method: "PASSIVE" } },
    { feature: "FACE_MATCH" },
  ],
} as const;

/** Exactly one subscription. `data.updated` carries no verdict FitOut acts on (ADDENDUM A2). */
const DECLARED_EVENTS = ["status.updated"] as const;

/** Features whose presence is a FAILURE, not a difference. See the header for why each is banned. */
const FORBIDDEN_FEATURES = ["AML", "IP_ANALYSIS", "KYB_REGISTRY", "KYB_DOCUMENTS", "KYB_KEY_PEOPLE"];

const VERIFICATION_API = "https://verification.didit.me";

/** The three variables plan 18.1-04 declares. Only the first is required to run this script. */
const API_KEY_VAR = "DIDIT_API_KEY";
const WORKFLOW_ID_VAR = "DIDIT_WORKFLOW_ID";
const WEBHOOK_SECRET_VAR = "DIDIT_WEBHOOK_SECRET";

const CHECK_INDENT = "        ";

const USAGE = [
  "usage: npx tsx scripts/didit-setup.ts <verify|apply> [--webhook-url <https url>]",
  "",
  "  verify   read-only. Lists the workflows and webhook destinations this API key can see,",
  "           prints what it read, and checks them against the declaration in this file.",
  "  apply    creates the declared workflow and/or webhook destination if absent. Never edits",
  "           an existing one. Writes DIDIT_WORKFLOW_ID and DIDIT_WEBHOOK_SECRET into .env.local.",
  "",
  `  ${API_KEY_VAR} is read from the shell or from .env.local. It is never printed.`,
  "  --webhook-url is required by `apply` and must be public HTTPS — Didit refuses localhost and",
  "  private CIDRs (SSRF guard), so a local run needs a tunnel. There is no Didit CLI.",
];

// ── ERRORS ──────────────────────────────────────────────────────────────────────────────────────

/** A condition under which NOTHING has been checked — distinct from "checked and it failed". */
class CouldNotRunError extends Error {
  constructor(
    message: string,
    readonly detail: readonly string[],
  ) {
    super(message);
    this.name = "CouldNotRunError";
  }
}

// ── ENV ─────────────────────────────────────────────────────────────────────────────────────────

/**
 * Read an allow-listed pair out of `.env.local` without overriding what the shell already exported.
 * Dependency-free and deliberately narrow, copied in structure from `scripts/cloudinary-preset.ts`.
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

/**
 * Set one key in `.env.local`, in place if present and appended otherwise.
 *
 * ⚠ This is how the webhook signing secret reaches the machine WITHOUT passing through stdout. The
 * vendor returns `secret_shared_key` exactly once, at creation; printing it would put a shared
 * secret into terminal scrollback and into whatever is reading this process's output.
 */
function writeToEnvLocal(key: string, value: string): "created" | "updated" | "appended" {
  const path = resolve(process.cwd(), ".env.local");
  if (!existsSync(path)) {
    writeFileSync(path, `${key}=${value}\n`, "utf8");
    return "created";
  }
  const original = readFileSync(path, "utf8");
  const eol = original.includes("\r\n") ? "\r\n" : "\n";
  const lines = original.split(/\r?\n/);
  const index = lines.findIndex((line) => line.trim().startsWith(`${key}=`));
  if (index === -1) {
    const needsEol = original.length > 0 && !/\r?\n$/.test(original);
    writeFileSync(path, `${original}${needsEol ? eol : ""}${key}=${value}${eol}`, "utf8");
    return "appended";
  }
  lines[index] = `${key}=${value}`;
  writeFileSync(path, lines.join(eol), "utf8");
  return "updated";
}

// ── TRANSPORT ───────────────────────────────────────────────────────────────────────────────────

interface ApiResponse {
  readonly status: number;
  readonly body: unknown;
  readonly raw: string;
}

/**
 * One verification-API call. The `x-api-key` header is built here and dies here — no caller receives
 * it and no code path echoes request headers.
 *
 * ⚠ ADDENDUM A5: on these endpoints a missing, malformed, expired OR wrong-application key all
 * return 403 with the same body. There is no machine-readable discriminator, so this reports the
 * whole class as one credential fault rather than guessing which one it is.
 */
async function diditFetch(
  apiKey: string,
  method: string,
  path: string,
  payload?: unknown,
): Promise<ApiResponse> {
  const url = `${VERIFICATION_API}${path}`;
  const headers: Record<string, string> = { "x-api-key": apiKey };
  if (payload !== undefined) headers["Content-Type"] = "application/json";
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers,
      body: payload === undefined ? undefined : JSON.stringify(payload),
    });
  } catch (cause) {
    throw new CouldNotRunError("THE VERIFICATION API DID NOT ANSWER.", [
      `${method} ${url}`,
      `network said   ${cause instanceof Error ? cause.message : String(cause)}`,
      "",
      "Nothing has been checked or created, in either direction.",
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
    throw new CouldNotRunError("THE API KEY WAS REFUSED.", [
      `${method} ${url} -> ${response.status}`,
      `vendor said    ${raw.slice(0, 300)}`,
      "",
      "ADDENDUM A5: missing, malformed, expired and wrong-application keys are INDISTINGUISHABLE",
      "here — all four are 403 with the same body. Re-read the key from the Console application",
      `you intend to use and set ${API_KEY_VAR} in .env.local.`,
      "",
      "⚠ If this key belongs to a LIVE application, the sandbox walk cannot run against it:",
      "  `sandbox_scenario` is rejected on live applications, by design.",
    ]);
  }
  return { status: response.status, body, raw };
}

// ── READING ─────────────────────────────────────────────────────────────────────────────────────

interface RemoteWorkflow {
  readonly id: string;
  readonly label: string;
  readonly features: readonly { feature: string; config?: Record<string, unknown> }[];
  readonly raw: Record<string, unknown>;
}

/** The v3 list endpoints answer a paginated envelope `{count, next, previous, results}`. */
function resultsOf(body: unknown): readonly Record<string, unknown>[] {
  if (Array.isArray(body)) return body as Record<string, unknown>[];
  if (body && typeof body === "object" && Array.isArray((body as { results?: unknown }).results)) {
    return (body as { results: Record<string, unknown>[] }).results;
  }
  return [];
}

function asWorkflow(row: Record<string, unknown>): RemoteWorkflow {
  const rawFeatures = Array.isArray(row.features) ? row.features : [];
  return {
    id: String(row.workflow_id ?? row.uuid ?? row.id ?? ""),
    label: String(row.workflow_label ?? row.label ?? row.name ?? ""),
    features: rawFeatures.map((entry) => {
      const item = (entry ?? {}) as Record<string, unknown>;
      return {
        feature: String(item.feature ?? item.name ?? ""),
        config: (item.config ?? undefined) as Record<string, unknown> | undefined,
      };
    }),
    raw: row,
  };
}

function livenessMethodOf(workflow: RemoteWorkflow): string | undefined {
  const liveness = workflow.features.find((entry) => entry.feature === "LIVENESS");
  const method = liveness?.config?.face_liveness_method;
  return method === undefined ? undefined : String(method);
}

// ── CHECKING ────────────────────────────────────────────────────────────────────────────────────

function check(failures: string[], ok: boolean, property: string, evidence: string): void {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${property}`);
  console.log(`${CHECK_INDENT}${evidence}`);
  if (!ok) failures.push(property);
}

function checkWorkflow(failures: string[], workflow: RemoteWorkflow): void {
  console.log(`\n── workflow "${workflow.label}" ${"─".repeat(50)}`);
  console.log(`${CHECK_INDENT}workflow_id    ${workflow.id}`);
  console.log(`${CHECK_INDENT}raw features   ${JSON.stringify(workflow.features)}`);

  const names = workflow.features.map((entry) => entry.feature);
  const declared = DECLARED_WORKFLOW.features.map((entry) => entry.feature);

  check(
    failures,
    declared.every((name) => names.includes(name)),
    "the three declared modules are all present",
    `declared ${declared.join(" + ")} · found ${names.join(" + ") || "(none)"}`,
  );

  const forbidden = names.filter((name) => FORBIDDEN_FEATURES.includes(name));
  check(
    failures,
    forbidden.length === 0,
    "no forbidden module is enabled",
    forbidden.length === 0
      ? `none of ${FORBIDDEN_FEATURES.join(", ")} present`
      : `⚠ FOUND ${forbidden.join(", ")} — see this file's header for why each is banned`,
  );

  const extra = names.filter(
    (name) => !declared.includes(name as (typeof declared)[number]) && !forbidden.includes(name),
  );
  check(
    failures,
    extra.length === 0,
    "no undeclared module is enabled",
    extra.length === 0 ? "module set is exactly the declaration" : `extra: ${extra.join(", ")}`,
  );

  const method = livenessMethodOf(workflow);
  check(
    failures,
    method === "PASSIVE",
    "liveness is PASSIVE (the only method with a free tier)",
    method === undefined
      ? "face_liveness_method absent from the workflow's LIVENESS config"
      : `face_liveness_method = ${method}${
          method === "PASSIVE" ? "" : " — ADDENDUM A1: active liveness has NO free tier ($0.15/check)"
        }`,
  );

  // A KYC expiration policy is not part of this payload; its absence is asserted by reading back
  // whatever the vendor DOES expose, and printed so a human can see what was actually inspected.
  const expiryKeys = Object.keys(workflow.raw).filter((key) => /expir|retention|validity/i.test(key));
  const expiryValues = expiryKeys.map((key) => `${key}=${JSON.stringify(workflow.raw[key])}`);
  const expirySet = expiryKeys.some((key) => {
    const value = workflow.raw[key];
    return value !== null && value !== undefined && value !== false && value !== 0 && value !== "";
  });
  check(
    failures,
    !expirySet,
    "no KYC expiration policy is configured",
    expiryValues.length === 0
      ? "the workflow record exposes no expiry/retention/validity field at all"
      : expiryValues.join(" · "),
  );
}

function checkDestination(failures: string[], row: Record<string, unknown>, expectedUrl: string): void {
  const url = String(row.url ?? "");
  const version = String(row.webhook_version ?? "");
  const events = Array.isArray(row.subscribed_events) ? row.subscribed_events.map(String) : [];

  console.log(`\n── webhook destination ${"─".repeat(56)}`);
  console.log(`${CHECK_INDENT}url            ${url}`);
  console.log(`${CHECK_INDENT}raw record     ${JSON.stringify(row)}`);

  check(failures, url === expectedUrl, "destination url matches the one asked for", `${url || "(none)"}`);
  check(failures, version === "v3", "webhook_version is v3 (plural-array decision contract)", `webhook_version = ${version || "(absent)"}`);
  check(
    failures,
    events.length === DECLARED_EVENTS.length && DECLARED_EVENTS.every((name) => events.includes(name)),
    "subscribed to status.updated and nothing else",
    `subscribed_events = ${JSON.stringify(events)} · declared ${JSON.stringify(DECLARED_EVENTS)}`,
  );
}

// ── MAIN ────────────────────────────────────────────────────────────────────────────────────────

function printUsage(): void {
  for (const line of USAGE) console.error(line);
}

export async function main(argv: readonly string[]): Promise<void> {
  // ── WHY EVERY EXIT BELOW IS `process.exitCode` AND NEVER `process.exit()` ──────────────────────
  // `process.exit()` tears the process down synchronously; called while an undici socket from the
  // fetch above is still settling, it can truncate output or drop the write to `.env.local`. This is
  // `scripts/cloudinary-preset.ts`'s rule and it holds for the same reason.
  const mode = argv[0] ?? "verify";
  if (mode !== "verify" && mode !== "apply") {
    printUsage();
    process.exitCode = 1;
    return;
  }

  const urlFlag = argv.indexOf("--webhook-url");
  const webhookUrl = urlFlag === -1 ? "" : (argv[urlFlag + 1] ?? "");
  if (webhookUrl !== "" && !webhookUrl.startsWith("https://")) {
    console.error(`--webhook-url must be https. Got: ${webhookUrl}`);
    console.error("Didit refuses localhost and private CIDRs (SSRF guard) — a local run needs a tunnel.");
    process.exitCode = 1;
    return;
  }

  loadFromEnvLocal([API_KEY_VAR, WORKFLOW_ID_VAR, WEBHOOK_SECRET_VAR]);
  const apiKey = process.env[API_KEY_VAR];
  if (!apiKey) {
    console.error(`${API_KEY_VAR} is not set, in the shell or in .env.local.`);
    console.error("");
    console.error("It comes from the Didit Console -> your application -> API keys. Use the SANDBOX");
    console.error("application's key: `sandbox_scenario` is rejected on live applications, so a live");
    console.error("key makes every test in this phase impossible to run.");
    process.exitCode = 3;
    return;
  }

  console.log(`didit-setup ${mode}`);
  console.log(`declaration  ${DECLARED_WORKFLOW.workflow_label} = ${DECLARED_WORKFLOW.features.map((f) => f.feature).join(" + ")} (liveness PASSIVE)`);
  console.log(`api          ${VERIFICATION_API}`);

  const failures: string[] = [];

  try {
    // ── WORKFLOWS ───────────────────────────────────────────────────────────────────────────────
    const listed = await diditFetch(apiKey, "GET", "/v3/workflows/");
    const workflows = resultsOf(listed.body).map(asWorkflow);
    console.log(`\n${workflows.length} workflow(s) visible to this key:`);
    for (const workflow of workflows) {
      console.log(
        `  · ${workflow.label || "(unlabelled)"} [${workflow.id}] — ${workflow.features.map((f) => f.feature).join(" + ") || "(no features)"}`,
      );
    }

    let target =
      workflows.find((workflow) => workflow.label === DECLARED_WORKFLOW.workflow_label) ??
      (workflows.length === 1 ? workflows[0] : undefined);

    if (!target && mode === "apply") {
      console.log(`\n── creating workflow ${"─".repeat(58)}`);
      console.log(`${CHECK_INDENT}sending        ${JSON.stringify(DECLARED_WORKFLOW)}`);
      const created = await diditFetch(apiKey, "POST", "/v3/workflows/", DECLARED_WORKFLOW);
      if (created.status !== 201 && created.status !== 200) {
        throw new CouldNotRunError("THE WORKFLOW WAS NOT CREATED.", [
          `POST /v3/workflows/ -> ${created.status}`,
          `vendor said    ${created.raw.slice(0, 400)}`,
          "",
          "The v3 API rejects ANY unknown body field with 400 and there is no `workflow_type`.",
        ]);
      }
      target = asWorkflow((created.body ?? {}) as Record<string, unknown>);
      console.log(`${CHECK_INDENT}created        ${target.id}`);
    }

    if (!target) {
      console.log("\nNo workflow matches the declaration and mode is `verify` — nothing created.");
      console.log(`Run \`apply\` to create "${DECLARED_WORKFLOW.workflow_label}".`);
      failures.push("a declared workflow exists");
    } else {
      checkWorkflow(failures, target);
      if (mode === "apply" && target.id) {
        const outcome = writeToEnvLocal(WORKFLOW_ID_VAR, target.id);
        console.log(`${CHECK_INDENT}.env.local     ${WORKFLOW_ID_VAR} ${outcome} (${target.id})`);
      }
    }

    // ── WEBHOOK DESTINATIONS ────────────────────────────────────────────────────────────────────
    const destinations = await diditFetch(apiKey, "GET", "/v3/webhook/destinations/");
    const rows = resultsOf(destinations.body);
    console.log(`\n${rows.length} webhook destination(s) visible to this key:`);
    for (const row of rows) {
      console.log(
        `  · ${String(row.url ?? "(no url)")} — ${String(row.webhook_version ?? "?")} ${JSON.stringify(row.subscribed_events ?? [])}`,
      );
    }

    if (webhookUrl === "") {
      console.log("\nNo --webhook-url given, so no destination was checked or created.");
      console.log("That is fine before plan 18.1-08 builds `/api/didit/webhook`.");
    } else {
      const existing = rows.find((row) => String(row.url ?? "") === webhookUrl);
      if (existing) {
        checkDestination(failures, existing, webhookUrl);
        console.log("");
        console.log(`  ⚠ The signing secret is returned ONLY at creation. This destination already`);
        console.log(`    existed, so ${WEBHOOK_SECRET_VAR} could not be re-read here — rotate the`);
        console.log(`    destination in the Console if the secret has been lost.`);
      } else if (mode === "apply") {
        const payload = {
          label: "FitOut host verification",
          url: webhookUrl,
          webhook_version: "v3",
          subscribed_events: [...DECLARED_EVENTS],
        };
        console.log(`\n── creating webhook destination ${"─".repeat(47)}`);
        console.log(`${CHECK_INDENT}sending        ${JSON.stringify(payload)}`);
        const created = await diditFetch(apiKey, "POST", "/v3/webhook/destinations/", payload);
        if (created.status !== 201 && created.status !== 200) {
          throw new CouldNotRunError("THE WEBHOOK DESTINATION WAS NOT CREATED.", [
            `POST /v3/webhook/destinations/ -> ${created.status}`,
            `vendor said    ${created.raw.slice(0, 400)}`,
            "",
            "The (application, url) pair must be unique — reposting the same url returns 400.",
          ]);
        }
        const row = (created.body ?? {}) as Record<string, unknown>;
        checkDestination(failures, row, webhookUrl);
        const secret = String(row.secret_shared_key ?? "");
        if (secret === "") {
          check(failures, false, "a signing secret came back", "secret_shared_key absent from the 201 body");
        } else {
          // ⚠ THE VALUE IS NEVER PRINTED. See this file's header.
          const outcome = writeToEnvLocal(WEBHOOK_SECRET_VAR, secret);
          console.log(`${CHECK_INDENT}.env.local     ${WEBHOOK_SECRET_VAR} ${outcome} (${secret.length} chars, value not printed)`);
        }
      } else {
        console.log(`\nNo destination registered for ${webhookUrl} and mode is \`verify\`.`);
        console.log("Run `apply` with the same --webhook-url to create it.");
        failures.push("a webhook destination exists for the given url");
      }
    }
  } catch (cause) {
    if (cause instanceof CouldNotRunError) {
      console.error("");
      console.error(cause.message);
      for (const line of cause.detail) console.error(`  ${line}`);
      process.exitCode = 3;
      return;
    }
    throw cause;
  }

  // ── WHAT THE VERDICT IS WORTH, PRINTED BESIDE THE VERDICT ─────────────────────────────────────
  console.log("");
  console.log("  ⚠ WHAT THIS RUN DOES AND DOES NOT PROVE. It proves the workflow and destination");
  console.log("    matched the declaration AT THIS MOMENT. Both are Console state, not repo state:");
  console.log("    an edit made between two runs is UNDETECTABLE by this script. It also cannot see");
  console.log("    which APPLICATION the key belongs to — a live key and a sandbox key look the");
  console.log("    same here, and only `sandbox_scenario` being refused will tell you the difference.");

  console.log("");
  if (failures.length > 0) {
    console.error(`${failures.length} checked propert(ies) FAILED:`);
    for (const failure of failures) console.error(`  - ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("All checked properties hold.");
}

// ── ENTRY POINT ─────────────────────────────────────────────────────────────────────────────────
// Run the CLI only when this module IS the process entry point, so importing the pure half from a
// test does not execute the whole script.
const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath !== "" && invokedPath === resolve(fileURLToPath(import.meta.url))) {
  void main(process.argv.slice(2));
}
