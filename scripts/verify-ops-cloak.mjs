#!/usr/bin/env node

import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const STAGES = new Set(["partition", "final"]);
const PARTITION_DENIAL_IDS = new Set([
  "marketplace-ops",
  "ops-missing",
  "ops-nonstaff",
  "ops-signed-out",
]);
const SELECTED_HEADERS = [
  "cache-control",
  "content-length",
  "content-type",
  "vary",
  "x-nextjs-cache",
];
const UNSAFE_EVIDENCE =
  /(?:"(?:authorization|cookie|database_url|password|secret|set-cookie|token)"\s*:)|(?:\bBearer\s+[A-Za-z0-9._~-]+)|(?:[\w.+-]+@[\w.-]+\.[A-Za-z]{2,})/i;

const PARTITION_CONTROLS = Object.freeze([
  { id: "marketplace-login", surface: "public", path: "/login", actor: "signed-out", expectedStatus: 200 },
  { id: "marketplace-ops", surface: "public", path: "/ops", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-auth-api", surface: "ops", path: "/api/auth/get-session", actor: "signed-out", expectedStatus: 200 },
  // The partition reading deliberately precedes the ops-auth pages. The visible path is already
  // isolated to the ops host, but its internal target does not exist until later Phase 20 plans.
  { id: "ops-login", surface: "ops", path: "/login", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-missing", surface: "ops", path: "/ops/definitely-missing", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-nonstaff", surface: "ops", path: "/ops", actor: "nonstaff", expectedStatus: 404 },
  { id: "ops-signed-out", surface: "ops", path: "/ops", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-staff", surface: "ops", path: "/ops", actor: "staff", expectedStatus: 200 },
]);

const OPS_AUTH_SOURCE_ROOT = resolve("src/app/(ops-auth)/%5Fops-auth");
const EXPECTED_OPS_AUTH_SOURCE_ROUTES = Object.freeze([
  "forgot-password",
  "invite/[token]",
  "login",
  "reset-password",
]);
const UNKNOWN_INVITE = "00000000000000000000";
const FINAL_CONTROLS = Object.freeze([
  { id: "marketplace-login", surface: "public", path: "/login", actor: "signed-out", expectedStatus: 200 },
  { id: "marketplace-ops", surface: "public", path: "/ops", actor: "signed-out", expectedStatus: 404 },
  { id: "marketplace-ops-auth-login", surface: "public", path: "/_ops-auth/login", actor: "signed-out", expectedStatus: 404 },
  { id: "marketplace-ops-auth-forgot-password", surface: "public", path: "/_ops-auth/forgot-password", actor: "signed-out", expectedStatus: 404 },
  { id: "marketplace-ops-auth-reset-password", surface: "public", path: "/_ops-auth/reset-password", actor: "signed-out", expectedStatus: 404 },
  { id: "marketplace-ops-auth-invite", surface: "public", path: `/_ops-auth/invite/${UNKNOWN_INVITE}`, actor: "signed-out", expectedStatus: 404 },
  { id: "marketplace-auth-session", surface: "public", path: "/api/auth/get-session", actor: "signed-out", expectedStatus: 200 },
  { id: "ops-login", surface: "ops", path: "/login", actor: "signed-out", expectedStatus: 200 },
  { id: "ops-forgot-password", surface: "ops", path: "/forgot-password", actor: "signed-out", expectedStatus: 200 },
  { id: "ops-reset-password", surface: "ops", path: "/reset-password", actor: "signed-out", expectedStatus: 200 },
  { id: "ops-invite", surface: "ops", path: `/invite/${UNKNOWN_INVITE}`, actor: "signed-out", expectedStatus: 200 },
  { id: "ops-direct-auth-login", surface: "ops", path: "/_ops-auth/login", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-direct-auth-forgot-password", surface: "ops", path: "/_ops-auth/forgot-password", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-direct-auth-reset-password", surface: "ops", path: "/_ops-auth/reset-password", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-direct-auth-invite", surface: "ops", path: `/_ops-auth/invite/${UNKNOWN_INVITE}`, actor: "signed-out", expectedStatus: 404 },
  { id: "ops-auth-session", surface: "ops", path: "/api/auth/get-session", actor: "signed-out", expectedStatus: 200 },
  { id: "ops-missing", surface: "ops", path: "/ops/definitely-missing", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-nonstaff", surface: "ops", path: "/ops", actor: "nonstaff", expectedStatus: 404 },
  { id: "ops-signed-out", surface: "ops", path: "/ops", actor: "signed-out", expectedStatus: 404 },
  { id: "ops-staff", surface: "ops", path: "/ops", actor: "staff", expectedStatus: 200 },
]);
const FINAL_DENIAL_IDS = new Set([
  ...PARTITION_DENIAL_IDS,
  "marketplace-ops-auth-login",
  "marketplace-ops-auth-forgot-password",
  "marketplace-ops-auth-reset-password",
  "marketplace-ops-auth-invite",
  "ops-direct-auth-login",
  "ops-direct-auth-forgot-password",
  "ops-direct-auth-reset-password",
  "ops-direct-auth-invite",
]);

function discoverOpsAuthSourceRoutes(dir = OPS_AUTH_SOURCE_ROOT, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) discoverOpsAuthSourceRoutes(path, out);
    else if (entry.name === "page.tsx") {
      out.push(relative(OPS_AUTH_SOURCE_ROOT, dir).replaceAll("\\", "/"));
    }
  }
  return out.sort();
}

export function requiredControls(stage) {
  assertStage(stage);
  if (stage === "partition") return PARTITION_CONTROLS.map((control) => ({ ...control }));

  const discoveredRoutes = discoverOpsAuthSourceRoutes();
  if (discoveredRoutes.length === 0) throw new Error("final ops-auth source census is empty");
  if (JSON.stringify(discoveredRoutes) !== JSON.stringify(EXPECTED_OPS_AUTH_SOURCE_ROUTES)) {
    throw new Error(
      `final ops-auth source census changed: expected ${EXPECTED_OPS_AUTH_SOURCE_ROUTES.join(", ")}; ` +
        `received ${discoveredRoutes.join(", ")}`,
    );
  }
  return FINAL_CONTROLS.map((control) => ({ ...control }));
}

export function sortRows(rows) {
  return [...rows].sort(
    (left, right) =>
      String(left.host).localeCompare(String(right.host)) ||
      String(left.path).localeCompare(String(right.path)) ||
      String(left.actor).localeCompare(String(right.actor)),
  );
}

function assertStage(stage) {
  if (!STAGES.has(stage)) {
    throw new Error(`--stage must be one of: ${[...STAGES].join(", ")}`);
  }
}

function isSha256(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}

function unsafeEvidenceText(value) {
  return UNSAFE_EVIDENCE.test(value);
}

function withoutBodyPreview(row) {
  const persisted = { ...row };
  delete persisted.bodyPreview;
  return persisted;
}

export function validateRows(rows, { stage }) {
  assertStage(stage);
  const errors = [];
  const expected = requiredControls(stage);

  if (!Array.isArray(rows) || rows.length === 0) {
    return { ok: false, errors: ["route census must be non-empty"] };
  }

  const byId = new Map();
  for (const row of rows) {
    if (typeof row?.id !== "string" || row.id === "") {
      errors.push("every row must have a stable id");
      continue;
    }
    if (byId.has(row.id)) errors.push(`duplicate control ${row.id}`);
    byId.set(row.id, row);
  }

  for (const control of expected) {
    const row = byId.get(control.id);
    if (!row) {
      errors.push(`missing required control ${control.id}`);
      continue;
    }
    if (row.status !== control.expectedStatus) {
      errors.push(`${control.id} expected status ${control.expectedStatus}, received ${String(row.status)}`);
    }
    if (!Number.isInteger(row.bytes) || row.bytes < 0) {
      errors.push(`${control.id} has an invalid byte length`);
    }
    if (!isSha256(row.sha256)) {
      errors.push(`${control.id} has an invalid SHA-256 digest`);
    }
    if (typeof row.host !== "string" || typeof row.path !== "string" || typeof row.actor !== "string") {
      errors.push(`${control.id} is missing host/path/actor facts`);
    }
    if (typeof row.bodyPreview === "string" && row.bodyPreview.includes("INVALID_ORIGIN")) {
      errors.push(`${control.id} returned INVALID_ORIGIN`);
    }
  }

  const denialIds = stage === "final" ? FINAL_DENIAL_IDS : PARTITION_DENIAL_IDS;
  const denialRows = [...denialIds].map((id) => byId.get(id)).filter(Boolean);
  if (denialRows.length === denialIds.size) {
    const hashes = new Set(denialRows.map((row) => row.sha256));
    const byteLengths = new Set(denialRows.map((row) => row.bytes));
    if (hashes.size !== 1 || byteLengths.size !== 1) {
      errors.push(
        `required denial responses must be byte-identical (${denialRows
          .map((row) => `${row.id}=${row.status}/${row.bytes}/${row.sha256}`)
          .join(", ")})`,
      );
    }
  }

  const safeRows = rows.map(withoutBodyPreview);
  if (unsafeEvidenceText(JSON.stringify(safeRows))) {
    errors.push("probe rows contain a credential or PII field");
  }

  return { ok: errors.length === 0, errors };
}

function sectionTitle(stage) {
  return stage === "partition" ? "Partition reading" : "Final cloak reading";
}

export function renderEvidence(rows, metadata, { stage }) {
  const validation = validateRows(rows, { stage });
  if (!validation.ok) throw new Error(validation.errors.join("\n"));

  const requiredMetadata = ["commit", "date", "nextVersion", "runtime", "publicHost", "opsHost"];
  for (const key of requiredMetadata) {
    if (typeof metadata[key] !== "string" || metadata[key].trim() === "") {
      throw new Error(`missing evidence metadata ${key}`);
    }
  }

  const persistedRows = sortRows(rows).map(withoutBodyPreview);
  const block = [
    `## ${sectionTitle(stage)}`,
    "",
    `- Commit: \`${metadata.commit}\``,
    `- Date: \`${metadata.date}\``,
    `- Next.js: \`${metadata.nextVersion}\``,
    `- Runtime: \`${metadata.runtime}\``,
    `- Public host: \`${metadata.publicHost}\``,
    `- Ops host: \`${metadata.opsHost}\``,
    "",
    "```json",
    JSON.stringify({ stage, rows: persistedRows }, null, 2),
    "```",
    "",
  ].join("\n");

  if (unsafeEvidenceText(block)) {
    throw new Error("rendered evidence contains credential or PII material");
  }
  return block;
}

function extractEvidence(document, stage) {
  if (unsafeEvidenceText(document)) {
    throw new Error("evidence contains credential or PII material");
  }
  const title = `## ${sectionTitle(stage)}`;
  const start = document.indexOf(title);
  if (start < 0) throw new Error(`missing ${title}`);
  const nextSection = document.indexOf("\n## ", start + title.length);
  const section = document.slice(start, nextSection < 0 ? document.length : nextSection);
  const jsonStart = section.indexOf("```json\n");
  const jsonEnd = section.indexOf("\n```", jsonStart + 8);
  if (jsonStart < 0 || jsonEnd < 0) throw new Error(`${title} is missing its JSON transcript`);
  const payload = JSON.parse(section.slice(jsonStart + 8, jsonEnd));
  if (payload.stage !== stage || !Array.isArray(payload.rows)) {
    throw new Error(`${title} has the wrong stage or row shape`);
  }
  return payload.rows;
}

function selectedHeaders(headers) {
  return Object.fromEntries(
    SELECTED_HEADERS.flatMap((name) => {
      const value = headers.get(name);
      return value === null ? [] : [[name, value]];
    }),
  );
}

async function readResponse(control, config) {
  const host = control.surface === "ops" ? config.opsHost : config.publicHost;
  const requestHeaders = new Headers();
  if (control.actor === "staff") requestHeaders.set("cookie", config.staffCookie);
  if (control.actor === "nonstaff") requestHeaders.set("cookie", config.nonstaffCookie);

  // Use the actual authority in the request URL. Browser/undici implementations may protect the
  // Host header from caller overrides; a probe that connected to 127.0.0.1 and merely asked for a
  // different Host could therefore measure the public partition while labelling it ops.
  const requestUrl = new URL(control.path, config.baseUrl);
  requestUrl.host = host;

  const response = await fetch(requestUrl, {
    headers: requestHeaders,
    redirect: "manual",
  });
  const bytes = Buffer.from(await response.arrayBuffer());
  const bodyPreview = bytes.toString("utf8");

  return {
    id: control.id,
    host,
    path: control.path,
    actor: control.actor,
    status: response.status,
    headers: selectedHeaders(response.headers),
    bytes: bytes.byteLength,
    sha256: createHash("sha256").update(bytes).digest("hex"),
    bodyPreview,
  };
}

export async function probeStage(config, { stage }) {
  assertStage(stage);
  if (!config.staffCookie || !config.nonstaffCookie) {
    throw new Error("isolated staff and nonstaff browser contexts are required");
  }
  const rows = [];
  for (const control of requiredControls(stage)) rows.push(await readResponse(control, config));
  const validation = validateRows(rows, { stage });
  if (!validation.ok) throw new Error(validation.errors.join("\n"));
  return sortRows(rows);
}

function argumentValue(args, name, fallback) {
  const index = args.indexOf(name);
  if (index < 0) return fallback;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${name} requires a value`);
  return value;
}

function upsertEvidence(path, block, stage) {
  const current = (() => {
    try {
      return readFileSync(path, "utf8");
    } catch (error) {
      if (error?.code === "ENOENT") return "# Phase 20 Ops Host Evidence\n\n";
      throw error;
    }
  })();
  const title = `## ${sectionTitle(stage)}`;
  const start = current.indexOf(title);
  if (start < 0) {
    writeFileSync(path, `${current.trimEnd()}\n\n${block}`, "utf8");
    return;
  }
  const nextSection = current.indexOf("\n## ", start + title.length);
  const end = nextSection < 0 ? current.length : nextSection + 1;
  writeFileSync(path, `${current.slice(0, start)}${block}${current.slice(end)}`, "utf8");
}

function currentCommit() {
  return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
}

async function main() {
  const args = process.argv.slice(2);
  const stage = argumentValue(args, "--stage");
  assertStage(stage);

  if (args.includes("--check-evidence")) {
    const path = argumentValue(args, "--check-evidence");
    const rows = extractEvidence(readFileSync(path, "utf8"), stage);
    const result = validateRows(rows, { stage });
    if (!result.ok) throw new Error(result.errors.join("\n"));
    console.log(`PASS ${stage}: ${rows.length} deterministic response rows validated`);
    return;
  }

  if (!args.includes("--probe")) {
    throw new Error("choose --probe or --check-evidence <path>");
  }

  const publicHost = argumentValue(args, "--public-host", process.env.OPS_PROBE_PUBLIC_HOST ?? "localhost:3100");
  const opsHost = argumentValue(args, "--ops-host", process.env.OPS_PROBE_OPS_HOST ?? "ops.localhost:3100");
  const rows = await probeStage(
    {
      baseUrl: argumentValue(args, "--base-url", process.env.OPS_PROBE_BASE_URL ?? "http://127.0.0.1:3100"),
      publicHost,
      opsHost,
      staffCookie: process.env.OPS_PROBE_STAFF_COOKIE,
      nonstaffCookie: process.env.OPS_PROBE_NONSTAFF_COOKIE,
    },
    { stage },
  );
  const metadata = {
    commit: currentCommit(),
    date: new Date().toISOString().slice(0, 10),
    nextVersion: JSON.parse(readFileSync("node_modules/next/package.json", "utf8")).version,
    runtime: "next start",
    publicHost,
    opsHost,
  };
  const evidence = renderEvidence(rows, metadata, { stage });
  const evidencePath = argumentValue(args, "--evidence");
  if (evidencePath) upsertEvidence(evidencePath, evidence, stage);
  console.log(JSON.stringify({ stage, rows: rows.map(withoutBodyPreview) }, null, 2));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
