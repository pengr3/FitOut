import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { fork, type ChildProcess } from "node:child_process";
import { request as httpRequest } from "node:http";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, dirname, basename } from "node:path";
import { build } from "esbuild";
import { createHmac } from "node:crypto";
import { sql } from "drizzle-orm";
import { setupTestDb, teardownTestDb, type TestDb } from "../helpers/db";
import { testDatabaseUrl } from "../helpers/test-db-url";
import { contactQuota } from "@/lib/db/schema";

const secret = "contact-instances-test-secret-at-least-32-characters";
const trustedIp = "203.0.113.17";
const ipKey = "contact:ip:v1:" + createHmac("sha256", secret).update("fitout/contact-quota/ip/v1\0").update(trustedIp).digest("hex");
type Instance = { child: ChildProcess; port: number; pid: number; databasePid: number };
let fixture: TestDb;
let directory: string;
let bundle: string;
const instances: Instance[] = [];
async function stop(instance: Instance) {
  if (instance.child.exitCode !== null) return;
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => { instance.child.kill(); reject(new Error("Child shutdown timed out")); }, 5000);
    instance.child.once("exit", () => { clearTimeout(timeout); resolve(); });
    instance.child.send("stop");
  });
}
async function start(disabled = false): Promise<Instance> {
  // Whitelist env: no Resend, production DB, Inngest or other inherited credentials.
  const child = fork(bundle, [], { execArgv: [], silent: true, env: {
    SystemRoot: process.env.SystemRoot,
    NODE_PATH: resolve(process.cwd(), "node_modules"),
    NODE_ENV: disabled ? "production" : "test",
    VERCEL: "1", VERCEL_ENV: disabled ? "production" : "preview",
    VERCEL_URL: "contact-instance-test.vercel.app",
    CONTACT_PRODUCTION_ENABLED: "false",
    BETTER_AUTH_URL: "http://app.localhost", NEXT_PUBLIC_APP_URL: "http://app.localhost",
    MARKETING_APP_URL: "http://marketing.localhost", OPS_APP_URL: "http://ops.localhost",
    DATABASE_URL: testDatabaseUrl(), CONTACT_TEST_SCHEMA: fixture.schema, BETTER_AUTH_SECRET: secret,
  } });
  return await new Promise<Instance>((resolve, reject) => {
    let diagnostics = "";
    child.stderr?.on("data", chunk => { diagnostics += String(chunk); });
    const timeout = setTimeout(() => { child.kill(); reject(new Error("Child startup timed out: " + diagnostics)); }, 10000);
    child.once("error", error => { clearTimeout(timeout); reject(error); });
    child.once("exit", code => { clearTimeout(timeout); reject(new Error("Child exited: " + code + " " + diagnostics)); });
    child.once("message", message => {
      clearTimeout(timeout);
      const data = message as Omit<Instance, "child">;
      const instance = { ...data, child };
      instances.push(instance);
      resolve(instance);
    });
  });
}
async function submit(instance: Instance, sequence: number, ip: string | null = trustedIp) {
  const email = "instance-" + sequence + "@example.invalid";
  return await new Promise<{ status: number; retry: number; body: { retryAfter?: number } }>((resolve, reject) => {
    // Raw HTTP preserves Host; Node fetch replaces it with the connection authority.
    const request = httpRequest({ hostname: "127.0.0.1", port: instance.port, path: "/api/contact",
    method: "POST", signal: AbortSignal.timeout(10000),
    headers: {
      Host: "marketing.localhost", Origin: "http://marketing.localhost", "Content-Type": "application/json",
      ...(ip ? { "x-vercel-forwarded-for": ip } : {}),
      "x-forwarded-for": "198.51.100." + (sequence + 1), "x-real-ip": "192.0.2." + (sequence + 1),
    },
    }, response => {
      let body = "";
      response.on("data", chunk => { body += String(chunk); });
      response.on("error", reject);
      response.on("end", () => {
        try { resolve({ status: response.statusCode!, retry: Number(response.headers["retry-after"]), body: JSON.parse(body) }); }
        catch (error) { reject(error); }
      });
    });
    request.on("error", reject);
    request.end(JSON.stringify({ name: "Synthetic instance test", email, confirmEmail: email, mobile: "", message: "No-mail shared quota test", website: "" }));
  });
}
async function meta(instance: Instance) {
  return await (await fetch("http://127.0.0.1:" + instance.port + "/meta", { signal: AbortSignal.timeout(5000) })).json() as { requests: number; transportAttempts: number };
}
beforeAll(async () => {
  fixture = await setupTestDb();
  directory = await mkdtemp(resolve(tmpdir(), "fitout-contact-instances-"));
  bundle = resolve(directory, "server.cjs");
  const adapter = resolve(process.cwd(), "tests/helpers/contact-instance-db.ts");
  await build({ entryPoints: [resolve(process.cwd(), "tests/helpers/contact-instance-server.ts")], outfile: bundle,
    bundle: true, platform: "node", format: "cjs", packages: "external", alias: { "@": resolve(process.cwd(), "src") },
    plugins: [{ name: "isolated-contact-boundaries", setup(builder) {
      builder.onResolve({ filter: /^(@\/lib\/db|@\/lib\/email)$/ }, () => ({ path: adapter }));
      builder.onResolve({ filter: /^server-only$/ }, () => ({ path: resolve(process.cwd(), "tests/helpers/server-only.stub.ts") }));
    } }],
  });
});
beforeEach(async () => {
  await Promise.all(instances.splice(0).map(stop));
  await fixture.db.delete(contactQuota);
});
afterAll(async () => {
  await Promise.all(instances.splice(0).map(stop));
  if (fixture) await teardownTestDb(fixture);
  // mkdtemp supplies a unique test-owned directory; never delete a caller-supplied path.
  if (directory) {
    const target = resolve(directory);
    if (dirname(target) !== resolve(tmpdir()) || !basename(target).startsWith("fitout-contact-instances-")) throw new Error("Refusing unexpected cleanup target");
    await rm(target, { recursive: true, force: true });
  }
});
describe("Contact HTTP quota across independent processes (isolated, no mail)", () => {
  it("caps a shared IP at five under contention and retains the cap after a process restart", async () => {
    const servers = await Promise.all([start(), start(), start()]);
    expect(new Set(servers.map(s => s.pid)).size).toBe(3);
    expect(new Set(servers.map(s => s.databasePid)).size).toBe(3);
    const responses = await Promise.all(Array.from({ length: 8 }, (_, index) => submit(servers[index % 3], index)));
    // 503 here means the reservation reached the deliberately disabled transport.
    // Verify that using transport counters and real persisted reservations, never status alone.
    expect(responses.filter(r => r.status === 503)).toHaveLength(5);
    const limited = responses.filter(r => r.status === 429);
    expect(limited).toHaveLength(3);
    for (const result of limited) {
      expect(result.retry).toBeGreaterThan(0);
      expect(result.retry).toBeLessThanOrEqual(900);
      expect(result.body.retryAfter).toBe(result.retry);
    }
    const counters = await Promise.all(servers.map(meta));
    expect(counters.reduce((sum, r) => sum + r.transportAttempts, 0)).toBe(5);
    expect(counters.every(r => r.requests <= 3)).toBe(true); // No process-local IP cap could have fired.
    const rows = await fixture.db.select().from(contactQuota);
    expect(rows).toHaveLength(2);
    expect(rows.find(r => r.key === ipKey)?.attempts).toHaveLength(5);
    expect(rows.find(r => r.key === "contact:global:v1")?.attempts).toHaveLength(5);
    expect(JSON.stringify(rows)).not.toContain(trustedIp);
    await stop(servers[0]);
    const restarted = await start();
    expect(restarted.pid).not.toBe(servers[0].pid);
    expect(restarted.databasePid).not.toBe(servers[0].databasePid);
    expect((await submit(restarted, 8)).status).toBe(429);
    expect((await meta(restarted)).transportAttempts).toBe(0);
    // Client XFF and X-Real-IP cannot create a fresh identity; a missing trusted identity fails closed.
    expect((await submit(restarted, 9, null)).status).toBe(403);
    expect((await submit(restarted, 10, "203.0.113.18")).status).toBe(503);
    expect((await meta(restarted)).transportAttempts).toBe(1);
    const clock = await fixture.db.execute<{ now: string }>(sql`SELECT floor(extract(epoch FROM clock_timestamp()) * 1000)::text AS now`);
    const old = Number(clock[0].now) - 900001;
    await fixture.db.execute(sql`UPDATE contact_quota SET attempts = ${JSON.stringify(Array(5).fill(old))}::jsonb WHERE key = ${ipKey}`);
    expect((await submit(restarted, 11)).status).toBe(503);
    const finalRows = await fixture.db.select().from(contactQuota);
    expect(finalRows.find(r => r.key === ipKey)?.attempts).toHaveLength(1);
    expect(finalRows.find(r => r.key === "contact:global:v1")?.attempts).toHaveLength(7);
    console.log(JSON.stringify({ proof: "isolated-contact-http-instances", processes: 3, distinctDatabaseBackends: 3,
      processIds: servers.map(s => s.pid), databaseProcessIds: servers.map(s => s.databasePid), restartedProcessId: restarted.pid,
      concurrentAttempts: 8, admittedReservations: 5, sharedDenials: 3, restartDenied: true,
      missingTrustedIdentityDenied: true, independentIpAdmitted: true, rollingExpiryAdmitted: true, actualEmailsSent: 0 }));
  });
  it("keeps production-disabled requests ahead of quota and transport", async () => {
    const disabled = await start(true);
    expect((await submit(disabled, 0)).status).toBe(503);
    expect(await fixture.db.select().from(contactQuota)).toHaveLength(0);
    expect((await meta(disabled)).transportAttempts).toBe(0);
  });
});
