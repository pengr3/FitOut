import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

import { describe, expect, it } from "vitest";

const PROBE_PATH = "scripts/verify-ops-cloak.mjs";
const EVIDENCE_PATH =
  ".planning/phases/20-ops-gets-its-own-front-door-the-ops-host-sign-in-staff-onboa/20-EVIDENCE.md";

type ProbeModule = {
  requiredControls(stage: "partition" | "final"): Array<{
    id: string;
    actor: string;
    expectedStatus: number;
  }>;
  sortRows<T extends { host: string; path: string; actor: string }>(rows: T[]): T[];
  validateRows(
    rows: Array<Record<string, unknown>>,
    options: { stage: "partition" | "final" },
  ): { ok: boolean; errors: string[] };
  renderEvidence(
    rows: Array<Record<string, unknown>>,
    metadata: Record<string, string>,
    options: { stage: "partition" | "final" },
  ): string;
};

async function loadProbe(): Promise<ProbeModule | null> {
  if (!existsSync(PROBE_PATH)) return null;
  return import(pathToFileURL(PROBE_PATH).href) as Promise<ProbeModule>;
}

const SHA_404 = "a".repeat(64);
const SHA_200 = "b".repeat(64);

function validPartitionRows(): Array<Record<string, unknown>> {
  return [
    { id: "ops-staff", host: "ops.localhost", path: "/ops", actor: "staff", status: 200, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 411, sha256: SHA_200 },
    { id: "ops-nonstaff", host: "ops.localhost", path: "/ops", actor: "nonstaff", status: 404, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 233, sha256: SHA_404 },
    { id: "ops-signed-out", host: "ops.localhost", path: "/ops", actor: "signed-out", status: 404, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 233, sha256: SHA_404 },
    { id: "ops-missing", host: "ops.localhost", path: "/ops/definitely-missing", actor: "signed-out", status: 404, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 233, sha256: SHA_404 },
    { id: "marketplace-ops", host: "fitout.localhost", path: "/ops", actor: "signed-out", status: 404, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 233, sha256: SHA_404 },
    { id: "ops-login", host: "ops.localhost", path: "/login", actor: "signed-out", status: 404, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 377, sha256: "c".repeat(64) },
    { id: "marketplace-login", host: "fitout.localhost", path: "/login", actor: "signed-out", status: 200, headers: { "content-type": "text/html; charset=utf-8" }, bytes: 381, sha256: "d".repeat(64) },
    { id: "ops-auth-api", host: "ops.localhost", path: "/api/auth/get-session", actor: "signed-out", status: 200, headers: { "content-type": "application/json" }, bytes: 4, sha256: "e".repeat(64) },
  ];
}

describe("ops cloak production probe", () => {
  it("defines the complete final ops route census on both host classes", async () => {
    const probe = await loadProbe();
    expect(probe, `${PROBE_PATH} must exist`).not.toBeNull();
    if (!probe) return;

    const ids = probe.requiredControls("final").map((control) => control.id);
    expect(ids).toEqual([
      "marketplace-login",
      "marketplace-ops",
      "marketplace-ops-auth-login",
      "marketplace-ops-auth-forgot-password",
      "marketplace-ops-auth-reset-password",
      "marketplace-ops-auth-invite",
      "marketplace-auth-session",
      "ops-login",
      "ops-forgot-password",
      "ops-reset-password",
      "ops-invite",
      "ops-direct-auth-login",
      "ops-direct-auth-forgot-password",
      "ops-direct-auth-reset-password",
      "ops-direct-auth-invite",
      "ops-auth-session",
      "ops-missing",
      "ops-nonstaff",
      "ops-signed-out",
      "ops-staff",
    ]);
  });

  it("defines a non-empty partition census with one staff 200 control", async () => {
    const probe = await loadProbe();
    expect(probe, `${PROBE_PATH} must exist`).not.toBeNull();
    if (!probe) return;

    const controls = probe.requiredControls("partition");
    expect(controls.length).toBeGreaterThan(0);
    expect(controls.filter((control) => control.actor === "staff" && control.expectedStatus === 200)).toHaveLength(1);
  });

  it("sorts equivalent rows by host, path, then actor without mutating input", async () => {
    const probe = await loadProbe();
    expect(probe).not.toBeNull();
    if (!probe) return;

    const input = [
      { host: "ops.localhost", path: "/ops", actor: "staff" },
      { host: "fitout.localhost", path: "/ops", actor: "signed-out" },
      { host: "ops.localhost", path: "/login", actor: "signed-out" },
      { host: "ops.localhost", path: "/ops", actor: "nonstaff" },
    ];
    const snapshot = structuredClone(input);

    expect(probe.sortRows(input)).toEqual([
      snapshot[1],
      snapshot[2],
      snapshot[3],
      snapshot[0],
    ]);
    expect(input).toEqual(snapshot);
    expect(probe.sortRows([...input].reverse())).toEqual(probe.sortRows(input));
  });

  it.each([
    ["empty census", [], "non-empty"],
    ["missing control", validPartitionRows().filter((row) => row.id !== "marketplace-ops"), "marketplace-ops"],
    ["streamed 200 denial", validPartitionRows().map((row) => row.id === "ops-nonstaff" ? { ...row, status: 200 } : row), "expected status 404"],
    ["invalid origin", validPartitionRows().map((row) => row.id === "ops-login" ? { ...row, bodyPreview: "INVALID_ORIGIN" } : row), "INVALID_ORIGIN"],
    ["unequal denial bytes", validPartitionRows().map((row) => row.id === "ops-missing" ? { ...row, sha256: "f".repeat(64) } : row), "byte-identical"],
  ])("rejects %s", async (_name, rows, errorFragment) => {
    const probe = await loadProbe();
    expect(probe).not.toBeNull();
    if (!probe) return;

    const result = probe.validateRows(rows, { stage: "partition" });
    expect(result.ok).toBe(false);
    expect(result.errors.join("\n")).toContain(errorFragment);
  });

  it("accepts the complete partition census only after independent status and hash checks", async () => {
    const probe = await loadProbe();
    expect(probe).not.toBeNull();
    if (!probe) return;

    expect(probe.validateRows(validPartitionRows(), { stage: "partition" })).toEqual({ ok: true, errors: [] });
  });

  it("renders deterministic evidence without credential or PII fields", async () => {
    const probe = await loadProbe();
    expect(probe).not.toBeNull();
    if (!probe) return;

    const evidence = probe.renderEvidence(
      [...validPartitionRows()].reverse(),
      {
        commit: "deadbee",
        date: "2026-09-08",
        nextVersion: "16.2.7",
        runtime: "next start",
        publicHost: "fitout.localhost",
        opsHost: "ops.localhost",
      },
      { stage: "partition" },
    );

    expect(evidence).toContain("## Partition reading");
    expect(evidence).toContain("deadbee");
    expect(evidence).toContain("16.2.7");
    expect(evidence).toContain(SHA_404);
    expect(evidence).not.toMatch(/cookie|token|password|database_url|bearer|@/i);
  });

  it("stores a machine-valid immediate partition reading before later ops routes land", () => {
    expect(existsSync(EVIDENCE_PATH), `${EVIDENCE_PATH} must exist`).toBe(true);
    if (!existsSync(EVIDENCE_PATH)) return;

    expect(() =>
      execFileSync(
        process.execPath,
        [PROBE_PATH, "--check-evidence", EVIDENCE_PATH, "--stage", "partition"],
        { encoding: "utf8", stdio: "pipe" },
      ),
    ).not.toThrow();
  });
});
