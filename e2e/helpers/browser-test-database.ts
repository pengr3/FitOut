// Browser fixtures may use only the fixed local test database or the exact
// ephemeral GitHub Actions service configured in the committed workflows.
// CI alone never authorizes an inherited database; real credentials/hosts are refused.
export function browserTestDatabase(env: Partial<NodeJS.ProcessEnv> = process.env): string {
  const local = "postgresql://fitout:fitout@localhost:5432/fitout_test";
  if (env.GITHUB_ACTIONS !== "true" || env.CI !== "true") return local;
  const service = "postgres://fitout:fitout@postgres:5432/fitout_test";
  if (env.DATABASE_URL !== service) {
    throw new Error("Browser CI requires the exact ephemeral postgres/fitout_test service.");
  }
  return service;
}
