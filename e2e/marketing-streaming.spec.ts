import { expect, test } from "@playwright/test";
import { appendFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { marketingFixture } from "./helpers/marketing-fixtures";

test("cold and warm approved-host entry create a real owned draft without a streaming exception", async ({ browser }, testInfo) => {
  test.setTimeout(180_000);
  const runDir = process.env.FITOUT_STREAMING_RUN_DIR!;
  const port = Number(process.env.FITOUT_STREAMING_PORT ?? "3127");
  const origin = `http://localhost:${port}`;
  const fixture = await marketingFixture();
  const failures: string[] = [];
  const requests = join(runDir, "requests.jsonl");
  try { for (const temperature of ["cold", "warm"] as const) {
    const context = await browser.newContext({ baseURL: origin });
    const page = await context.newPage();
    const record = (value: object) => appendFileSync(requests, JSON.stringify({ at: new Date().toISOString(), temperature, ...value }) + "\n");
    page.on("request", (request) => { const url = new URL(request.url()); if (url.hostname.endsWith("localhost")) record({ event: "request", method: request.method(), path: url.pathname }); });
    page.on("response", (response) => { const url = new URL(response.url()); if (url.hostname.endsWith("localhost")) record({ event: "response", status: response.status(), path: url.pathname }); });
    try {
      const owner = await fixture.account(page, "host");
      await fixture.readyHost(owner);
      await page.goto(`http://marketing.localhost:${port}/hosts`);
      await page.getByRole("link", { name: "Start hosting", exact: true }).click();
      await expect(page).toHaveURL(/\/host$/, { timeout: 15_000 });
      record({ event: "new-start" });
      const response = await page.goto(`${origin}/host/listings/new`);
      expect(response?.status(), `${temperature} approved-host creation response`).toBe(200);
      await expect(page).toHaveURL(/\/host\/listings\/[^/]+\/edit$/, { timeout: 5_000 });
      await expect(page.getByRole("heading", { name: "What kind of space is it?", exact: true })).toBeVisible();
      const draftId = new URL(page.url()).pathname.split("/")[3];
      const [draft] = await fixture.sql`SELECT host_id, status FROM listing WHERE id = ${draftId}`;
      expect(draft).toMatchObject({ host_id: owner, status: "draft" });
      expect(context.pages()).toEqual([page]);
      record({ event: "draft-confirmed", owned: draft.host_id === owner, status: draft.status });
    } catch (error) {
      // Run the warm observation even if the cold one fails, then fail with BOTH results.
      failures.push(`${temperature}: ${error instanceof Error ? error.message : String(error)}`);
      record({ event: "failed" });
    } finally { await context.close(); }
  } } finally { await fixture.cleanup(); }
  const logs = ["server-stderr.log", "server-stdout.log", "exceptions.jsonl"].map((name) => existsSync(join(runDir, name)) ? readFileSync(join(runDir, name), "utf8") : "").join("\n");
  if (logs.includes("transformAlgorithm is not a function")) failures.push("The native streaming TypeError was observed; a passing navigation does not waive it.");
  await testInfo.attach("request-correlation", { path: requests, contentType: "application/x-ndjson" });
  expect(failures, "all cold/warm assertions and the streaming-exception census must pass").toEqual([]);
});
