// OPS-07 / T-20-14-02 — a copied staff cookie is not authority to dispatch an ops action elsewhere.
//
// This is deliberately an action-dispatch probe, not a cookie-jar test. It captures the real
// `next-action` id and serialized payload emitted by the rendered ops queue, aborts that browser
// request before it reaches the server, and replays the bytes with the ops session cookie explicitly
// present on both authorities. The action's own Host+Origin guard must be what separates the results.

import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";
import { hashPassword } from "better-auth/crypto";
import postgres from "postgres";

const E2E_PORT = process.env.FITOUT_OPS_E2E_PORT ?? "3000";
const PUBLIC_HOST = `localhost:${E2E_PORT}`;
const OPS_HOST = `ops.localhost:${E2E_PORT}`;
const PUBLIC_ORIGIN = `http://${PUBLIC_HOST}`;
const OPS_ORIGIN = `http://${OPS_HOST}`;
const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgresql://fitout:fitout@localhost:5432/fitout";
const PASSWORD = "averylongpassword";

type CapturedAction = {
  readonly body: Buffer;
  readonly headers: Record<string, string>;
};

test("terminates the ops session and returns to the bounded signed-out notice", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  const suffix = randomUUID();
  const staffId = `e2e_ops_signout_${suffix}`;
  const staffEmail = `e2e.ops.signout.${suffix}@example.test`;
  const opsContext = await browser.newContext({ baseURL: OPS_ORIGIN });

  try {
    const passwordHash = await hashPassword(PASSWORD);
    await sql`
      INSERT INTO "user"
        (id, name, first_name, email, email_verified, can_book, can_host, role, created_at, updated_at)
      VALUES
        (${staffId}, ${"Ops"}, ${"Ops"}, ${staffEmail}, true, false, false, ${"staff"}, now(), now())
    `;
    await sql`
      INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
      VALUES (${randomUUID()}, ${staffId}, ${"credential"}, ${staffId}, ${passwordHash}, now(), now())
    `;

    const signInResponse = await opsContext.request.post(
      `${OPS_ORIGIN}/api/auth/sign-in/email`,
      {
        headers: { host: OPS_HOST, origin: OPS_ORIGIN },
        data: { email: staffEmail, password: PASSWORD },
        failOnStatusCode: false,
      },
    );
    expect(signInResponse.status(), "ops-host Better Auth sign-in failed").toBe(200);

    const priorCookies = await opsContext.cookies(OPS_ORIGIN);
    const priorCookieHeader = priorCookies
      .map((cookie) => `${cookie.name}=${cookie.value}`)
      .join("; ");
    expect(priorCookieHeader, "the staff sign-in did not issue an ops-host cookie").not.toBe("");

    const page = await opsContext.newPage();
    await page.goto(`${OPS_ORIGIN}/ops`);
    await page.getByRole("button", { name: "Sign out", exact: true }).click();

    await expect(page).toHaveURL(`${OPS_ORIGIN}/login?signedOut=1`);
    await expect(page.getByText("Staff session ended.", { exact: true })).toBeVisible();

    const replay = await opsContext.request.get(`${OPS_ORIGIN}/ops`, {
      headers: { host: OPS_HOST, cookie: priorCookieHeader },
      failOnStatusCode: false,
    });
    expect(replay.status(), "a destroyed staff session reopened the cloaked console").toBe(404);
  } finally {
    await opsContext.close();
    await sql`DELETE FROM "user" WHERE id = ${staffId}`;
    await sql.end();
  }
});

test("cross-host exits use exact configured origins without carrying source cookies", async ({
  browser,
}) => {
  const marketplaceContext = await browser.newContext({ baseURL: PUBLIC_ORIGIN });
  const opsContext = await browser.newContext({ baseURL: OPS_ORIGIN });

  try {
    await marketplaceContext.addCookies([
      { name: "public-source-session", value: "public-only", url: PUBLIC_ORIGIN },
    ]);
    const marketplacePage = await marketplaceContext.newPage();
    await marketplacePage.goto(PUBLIC_ORIGIN);
    await marketplacePage.getByRole("link", { name: "FitOut Ops" }).click();
    await expect(marketplacePage).toHaveURL(`${OPS_ORIGIN}/login`);
    expect(new URL(marketplacePage.url()).search).toBe("");
    expect(
      (await marketplaceContext.cookies(OPS_ORIGIN)).some(
        (cookie) => cookie.name === "public-source-session",
      ),
    ).toBe(false);

    await opsContext.addCookies([
      { name: "ops-source-session", value: "ops-only", url: OPS_ORIGIN },
    ]);
    const opsPage = await opsContext.newPage();
    await opsPage.goto(`${OPS_ORIGIN}/login`);
    await opsPage.getByRole("link", { name: "Back to FitOut" }).click();
    await expect(opsPage).toHaveURL(`${PUBLIC_ORIGIN}/`);
    expect(new URL(opsPage.url()).search).toBe("");
    expect(
      (await opsContext.cookies(PUBLIC_ORIGIN)).some(
        (cookie) => cookie.name === "ops-source-session",
      ),
    ).toBe(false);
  } finally {
    await marketplaceContext.close();
    await opsContext.close();
  }
});

test("keeps the protected error recovery neutral and inside the approved ops shell", () => {
  const source = readFileSync("src/app/(ops)/ops/error.tsx", "utf8");

  expect(source).toContain('title="FitOut Ops didn\'t load"');
  expect(source).toContain(
    'body="We hit a problem loading the ops console. Trying again usually fixes it."',
  );
  expect(source).toContain("onRetry={reset}");
  expect(source).toContain("Back to FitOut");
  expect(source).not.toMatch(/error\.(?:message|stack|cause)|authorization|account type/i);
});

async function captureApproveAction(page: Page, targetName: string): Promise<CapturedAction> {
  let captured: CapturedAction | null = null;

  await page.route("**/*", async (route) => {
    const request = route.request();
    const requestHeaders = request.headers();
    if (request.method() !== "POST" || requestHeaders["next-action"] === undefined) {
      await route.continue();
      return;
    }

    const body = request.postDataBuffer();
    expect(body, "the rendered approve control emitted no Server Function payload").not.toBeNull();
    if (body === null) {
      await route.abort();
      return;
    }

    const replayHeaders = Object.fromEntries(
      Object.entries(requestHeaders).filter(
        ([name]) =>
          name === "accept" ||
          name === "content-type" ||
          name.startsWith("next-") ||
          name === "rsc",
      ),
    );
    captured = { body, headers: replayHeaders };
    await route.abort("blockedbyclient");
  });

  await page.getByRole("button", { name: `Approve ${targetName}` }).click();
  await expect.poll(() => captured, { message: "no real next-action request was captured" }).not.toBeNull();
  await page.unroute("**/*");

  return captured!;
}

test("refuses marketplace-host action dispatch even with an ops staff cookie", async ({
  browser,
}) => {
  test.setTimeout(180_000);

  const sql = postgres(DATABASE_URL, { max: 1, onnotice: () => {} });
  const suffix = randomUUID();
  const staffId = `e2e_ops_staff_${suffix}`;
  const targetId = `e2e_ops_target_${suffix}`;
  const staffEmail = `e2e.ops.staff.${suffix}@example.test`;
  const targetEmail = `e2e.ops.target.${suffix}@example.test`;
  const targetName = `Plan 20 14 target ${suffix.slice(0, 8)}`;
  const opsContext = await browser.newContext({ baseURL: OPS_ORIGIN });

  try {
    const passwordHash = await hashPassword(PASSWORD);
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO "user"
          (id, name, first_name, email, email_verified, can_book, can_host, role, created_at, updated_at)
        VALUES
          (${staffId}, ${"Ops"}, ${"Ops"}, ${staffEmail}, true, false, false, ${"staff"}, now(), now()),
          (${targetId}, ${targetName}, ${"Target"}, ${targetEmail}, true, false, true, ${"user"}, now(), now())
      `;
      await tx`
        INSERT INTO account (id, account_id, provider_id, user_id, password, created_at, updated_at)
        VALUES (${randomUUID()}, ${staffId}, ${"credential"}, ${staffId}, ${passwordHash}, now(), now())
      `;
      await tx`
        INSERT INTO host_verification (user_id, status, provider, created_at, updated_at)
        VALUES (${targetId}, ${"pending"}::host_verification_status, ${"manual"}, now(), now())
      `;
    });

    const signInResponse = await opsContext.request.post(
      `${OPS_ORIGIN}/api/auth/sign-in/email`,
      {
        headers: { host: OPS_HOST, origin: OPS_ORIGIN },
        data: { email: staffEmail, password: PASSWORD },
        failOnStatusCode: false,
      },
    );
    expect(signInResponse.status(), "ops-host Better Auth sign-in failed").toBe(200);

    const page = await opsContext.newPage();
    await page.goto(`${OPS_ORIGIN}/ops`);

    const captured = await captureApproveAction(page, targetName);
    expect(captured.headers["next-action"], "the request carried no real action id").toBeTruthy();

    const cookies = await opsContext.cookies(OPS_ORIGIN);
    const cookieHeader = cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
    expect(cookieHeader.length, "the ops-host sign-in produced no session cookie").toBeGreaterThan(0);

    const snapshot = async () => {
      const [state] = await sql<{ status: string }[]>`
        SELECT status::text AS status FROM host_verification WHERE user_id = ${targetId}
      `;
      const [trail] = await sql<{ count: number }[]>`
        SELECT count(*)::int AS count
          FROM audit
         WHERE action = ${"ops_approve_host"}
           AND meta ->> 'userId' = ${targetId}
      `;
      return { status: state.status, auditCount: trail.count };
    };

    const before = await snapshot();
    const marketplaceResponse = await opsContext.request.fetch(`${PUBLIC_ORIGIN}/`, {
      method: "POST",
      headers: {
        ...captured.headers,
        host: PUBLIC_HOST,
        origin: PUBLIC_ORIGIN,
        cookie: cookieHeader,
      },
      data: captured.body,
      failOnStatusCode: false,
    });

    // Next's streamed Server Function envelope keeps HTTP 200 even when `notFound()` terminates
    // the action. The non-vacuous proof is the unchanged target/audit snapshot followed by the
    // same captured bytes succeeding below when only Host+Origin change to the exact ops authority.
    await marketplaceResponse.body();
    expect(marketplaceResponse.status()).toBe(200);
    expect(await snapshot()).toEqual(before);

    const opsResponse = await opsContext.request.fetch(`${OPS_ORIGIN}/ops`, {
      method: "POST",
      headers: {
        ...captured.headers,
        host: OPS_HOST,
        origin: OPS_ORIGIN,
        cookie: cookieHeader,
      },
      data: captured.body,
      failOnStatusCode: false,
    });

    expect(opsResponse.status()).toBe(200);
    const after = await snapshot();
    expect(after.status).toBe("approved");
    expect(after.auditCount).toBe(before.auditCount + 1);
  } finally {
    await opsContext.close();
    await sql`DELETE FROM notification WHERE recipient_id = ${targetId}`;
    await sql`DELETE FROM audit WHERE actor_id = ${staffId} OR meta ->> 'userId' = ${targetId}`;
    await sql`DELETE FROM host_verification WHERE user_id = ${targetId}`;
    await sql`DELETE FROM "user" WHERE id IN (${staffId}, ${targetId})`;
    await sql.end();
  }
});
