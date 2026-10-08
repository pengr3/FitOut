import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--group" || !["hero", "hosts", "players"].includes(args[1])) {
  throw new Error("Usage: node scripts/capture-marketing.mjs --group hero|hosts|players");
}
// Never inherit an operator's database or provider/mail configuration.
const result = spawnSync(process.execPath, ["node_modules/@playwright/test/cli.js", "test", "e2e/marketing-captures.spec.ts", "--project=chromium", "--workers=1", "--retries=0", "--grep", `@${args[1]}`], {
  cwd: fileURLToPath(new URL("../", import.meta.url)),
  stdio: "inherit",
  env: { ...process.env, DATABASE_URL: "postgresql://fitout:fitout@localhost:5432/fitout_test", RESEND_API_KEY: "", FITOUT_E2E_REAL_EMAIL: "0", FITOUT_CAPTURE_MARKETING: "1", PAYMONGO_SECRET_KEY: "", DIDIT_API_KEY: "" },
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
