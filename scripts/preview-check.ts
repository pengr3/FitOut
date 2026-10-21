import { config } from "dotenv";
import postgres from "postgres";
import { assertPreviewDatabase, assertPreviewPaymentKey } from "../src/lib/preview-environment";

config({ path: ".env.preview.local", quiet: true });
const env = process.env;
const checks: Array<{ check: string; ok: boolean }> = [];
const check = (name: string, run: () => boolean) => {
  try { checks.push({ check: name, ok: run() }); }
  catch { checks.push({ check: name, ok: false }); }
};
check("Preview environment", () => env.VERCEL_ENV === "preview");
check("Event-driven jobs enabled",()=>env.BACKGROUND_EXECUTION_MODE === "events");
check("Explicit sandbox database", () => Boolean(assertPreviewDatabase(env.PREVIEW_DATABASE_URL)));
check("App database matches sandbox", () => {
  assertPreviewDatabase(env.DATABASE_URL);
  return new URL(env.DATABASE_URL!).pathname === new URL(env.PREVIEW_DATABASE_URL!).pathname;
});
check("PayMongo test credentials", () => {
  assertPreviewPaymentKey(env.PAYMONGO_SECRET_KEY ?? "");
  return Boolean(env.PAYMONGO_WEBHOOK_SECRET) && /^pk_test_/.test(env.PAYMONGO_PUBLIC_KEY ?? "");
});
check("Auth signing secret configured", () => (env.BETTER_AUTH_SECRET?.length ?? 0) >= 32);
check("Distinct preview origins", () => {
  const values = [env.BETTER_AUTH_URL, env.MARKETING_APP_URL, env.OPS_APP_URL];
  const urls = values.map((value) => new URL(value!));
  return env.BETTER_AUTH_URL === env.NEXT_PUBLIC_APP_URL &&
    urls.every((url) => url.protocol === "https:" && url.pathname === "/" && !url.search && !url.hash &&
      !url.username && !url.password && url.hostname !== "fitout.live" && !url.hostname.endsWith(".fitout.live")) &&
    new Set(urls.map((url) => url.host)).size === 3;
});
check("Isolated Inngest environment", () => Boolean(env.INNGEST_EVENT_KEY && env.INNGEST_SIGNING_KEY) &&
  /^preview[-/]/.test(env.INNGEST_ENV ?? "") && (!env.INNGEST_DEV || ["0","false"].includes(env.INNGEST_DEV)));
check("Live payouts held", () => env.PAYOUT_DISPATCH_MODE === "hold");
check("Didit sandbox configured", () => env.DIDIT_ENVIRONMENT === "sandbox" &&
  Boolean(env.DIDIT_API_KEY && env.DIDIT_WORKFLOW_ID && env.DIDIT_WEBHOOK_SECRET));
check("Email limited to testers", () => Boolean(env.RESEND_API_KEY && env.PREVIEW_EMAIL_RECIPIENTS));
check("Media uploads configured", () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY &&
  env.CLOUDINARY_API_SECRET && env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME && env.NEXT_PUBLIC_CLOUDINARY_API_KEY));

async function main() {
  const args = process.argv.slice(2);
  if (args.some((arg) => arg !== "--database") || args.length > 1) throw new Error("Unknown argument");
  if (args.includes("--database")) {
    const url = assertPreviewDatabase(env.PREVIEW_DATABASE_URL);
    const sql = postgres(url, { max: 1, connect_timeout: 10 });
    try {
      const [counts] = await sql`SELECT (SELECT count(*)::int FROM listing) AS listings, (SELECT count(*)::int FROM booking) AS bookings`;
      console.log(JSON.stringify({ databaseReachable: true, counts }));
    } catch {
      checks.push({ check: "Database reachable with current schema and quota", ok: false });
    } finally { await sql.end(); }
  }
  console.log(JSON.stringify({ checks, configured: checks.every((item) => item.ok),
    note: "Configuration checks do not prove provider mode, key separation, webhook registration or end-to-end booking success." }, null, 2));
  if (checks.some((item) => !item.ok)) process.exitCode = 1;
}
main().catch(() => {
  console.error("Preview check refused. Use the explicit sandbox connection and --database only for a read-only connectivity probe.");
  process.exitCode = 1;
});
