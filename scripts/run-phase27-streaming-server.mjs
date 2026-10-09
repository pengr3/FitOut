import { spawn } from "node:child_process";
import { createWriteStream, existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve, relative, isAbsolute, join } from "node:path";
import { StringDecoder } from "node:string_decoder";
import { pathToFileURL } from "node:url";
import { safeEnvironment, sanitizeLog } from "./run-phase27-gates.mjs";
import { probeStreamingRuntime } from "./probe-phase27-streaming-runtime.mjs";

const root = process.cwd();
const mode = process.env.FITOUT_STREAMING_SERVER;
const port = Number(process.env.FITOUT_STREAMING_PORT ?? "3127");
const runDir = resolve(process.env.FITOUT_STREAMING_RUN_DIR ?? "");
const cache = resolve(root, "playwright/.cache/phase27-08");
const within = relative(cache, runDir);
if (!["dev", "production"].includes(mode) || !Number.isInteger(port) || port < 1024 || port > 65535 || !within || within.startsWith("..") || isAbsolute(within) || !existsSync(runDir)) {
  throw new Error("Explicit mode, valid port and unique existing local diagnostic directory required.");
}
if (mode === "production") {
  const build = JSON.parse(readFileSync(process.env.FITOUT_STREAMING_BUILD_RECORD, "utf8"));
  if (build.exitCode !== 0 || build.command !== "node node_modules/next/dist/bin/next build" || !existsSync(join(root, ".next/BUILD_ID"))) {
    throw new Error("Successful canonical build record and BUILD_ID required.");
  }
}
if (process.env.FITOUT_STREAMING_DIAGNOSTICS !== "1") {
  const runtime = await probeStreamingRuntime();
  writeFileSync(join(runDir, "runtime-preflight.json"), JSON.stringify(runtime, null, 2), { flag: "wx" });
  if (runtime.internalTypeErrors) throw new Error(`Node ${process.version} fails the native cancellation-race precondition. Use an already-installed fixed runtime; no automatic installation is performed.`);
}
const env = safeEnvironment(mode === "production" ? "build" : "setup");
Object.assign(env, {
  BETTER_AUTH_URL: `http://localhost:${port}`, NEXT_PUBLIC_APP_URL: `http://localhost:${port}`,
  MARKETING_APP_URL: `http://marketing.localhost:${port}`, OPS_APP_URL: `http://ops.localhost:${port}`,
  MARKETING_PREVIEW_URL: "", VERCEL_URL: "", VERCEL_ENV: "", VERCEL: "",
});
if (process.env.FITOUT_STREAMING_DIAGNOSTICS === "1") {
  Object.assign(env, { FITOUT_STREAMING_DIAGNOSTICS: "1", FITOUT_STREAMING_RUN_DIR: runDir,
    NODE_OPTIONS: `--import="${pathToFileURL(resolve(root, "scripts/phase27-streaming-inspector.mjs"))}"` });
}
const child = spawn(process.execPath, ["node_modules/next/dist/bin/next", mode === "dev" ? "dev" : "start", "--hostname", "0.0.0.0", "--port", String(port)],
  { cwd: root, env, windowsHide: true, shell: false, stdio: ["ignore", "pipe", "pipe"] });
writeFileSync(join(runDir, "server.json"), JSON.stringify({ mode, port, node: process.version, pid: child.pid, diagnostics: env.FITOUT_STREAMING_DIAGNOSTICS === "1", startedAt: new Date().toISOString() }, null, 2), { flag: "wx" });
for (const name of ["stdout", "stderr"]) {
  const log = createWriteStream(join(runDir, `server-${name}.log`), { flags: "wx" });
  const decoder = new StringDecoder("utf8");
  let pending = "";
  const emit = (line) => {
    const safe = `${new Date().toISOString()} ${sanitizeLog(line)}\n`;
    log.write(safe);
    process[name].write(safe);
  };
  child[name].on("data", (chunk) => {
    pending += decoder.write(chunk);
    const lines = pending.split(/\r?\n/);
    pending = lines.pop();
    lines.forEach(emit);
  });
  child[name].on("end", () => { pending += decoder.end(); if (pending) emit(pending); log.end(); });
}
child.on("error", (error) => { console.error(sanitizeLog(error.message)); process.exitCode = 1; });
child.on("exit", (code) => { process.exitCode = code ?? 1; });
process.on("SIGTERM", () => child.kill());
process.on("SIGINT", () => child.kill());
