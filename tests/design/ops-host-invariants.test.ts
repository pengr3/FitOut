import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, type Dirent } from "node:fs";
import { join, relative, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import ts from "typescript";

const ROOT = process.cwd();
const PROXY_PATH = "src/proxy.ts";
const AUTH_PATH = "src/lib/auth.ts";
const APP_ORIGINS_PATH = "src/lib/app-origins.ts";
const CLOAK_PATH = "src/app/_ops-cloak/page.tsx";
const ROOT_NOT_FOUND_PATH = "src/app/not-found.tsx";
const ROOT_NOT_FOUND_SHA256 = "fdd295e842fc7719738c9795231a3b89bf3d1066ec931f9f6a06b1f5157d226d";
const EXPECTED_INTERNAL_ROUTE_PAGES = [
  "src/app/(ops-auth)/_ops-auth/forgot-password/page.tsx",
  "src/app/(ops-auth)/_ops-auth/invite/[token]/page.tsx",
  "src/app/(ops-auth)/_ops-auth/login/page.tsx",
  "src/app/(ops-auth)/_ops-auth/reset-password/page.tsx",
  CLOAK_PATH,
];
const INVITE_PAGE_PATH = "src/app/(ops-auth)/_ops-auth/invite/[token]/page.tsx";
const INVITE_LOADING_PATH = "src/app/(ops-auth)/_ops-auth/invite/[token]/loading.tsx";
const INVITE_FORM_PATH =
  "src/app/(ops-auth)/_ops-auth/_components/staff-invite-setup-form.tsx";

function source(path: string): string {
  return readFileSync(resolve(ROOT, path), "utf8");
}

function relativePath(path: string): string {
  return relative(ROOT, path).replace(/\\/g, "/");
}

function collect(dir: string, basename: string, out: string[] = []): string[] {
  let entries: Dirent[];
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) collect(path, basename, out);
    else if (entry.name === basename) out.push(relativePath(path));
  }
  return out;
}

function internalOpsPages(): string[] {
  return collect(resolve(ROOT, "src/app"), "page.tsx")
    .filter((path) => path.split("/").some((segment) => segment.startsWith("_ops")))
    .sort();
}

function scopedNotFoundFiles(): string[] {
  return ["src/app/(ops)", "src/app/(ops-auth)"]
    .flatMap((path) => collect(resolve(ROOT, path), "not-found.tsx"))
    .sort();
}

function sha256(text: string): string {
  return createHash("sha256").update(text.replace(/\r\n/g, "\n")).digest("hex");
}

function identifiers(text: string): string[] {
  const file = ts.createSourceFile(PROXY_PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const names: string[] = [];
  const visit = (node: ts.Node): void => {
    if (ts.isIdentifier(node)) names.push(node.text);
    ts.forEachChild(node, visit);
  };
  visit(file);
  return names;
}

function betterAuthOptions(text: string): ts.ObjectLiteralExpression | undefined {
  const file = ts.createSourceFile(AUTH_PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  let result: ts.ObjectLiteralExpression | undefined;
  const visit = (node: ts.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "betterAuth" &&
      node.arguments[0] !== undefined &&
      ts.isObjectLiteralExpression(node.arguments[0])
    ) {
      result = node.arguments[0];
      return;
    }
    ts.forEachChild(node, visit);
  };
  visit(file);
  return result;
}

function property(
  object: ts.ObjectLiteralExpression | undefined,
  name: string,
): ts.PropertyAssignment | undefined {
  return object?.properties.find(
    (member): member is ts.PropertyAssignment =>
      ts.isPropertyAssignment(member) && member.name.getText().replace(/["']/g, "") === name,
  );
}

describe("OPS-12 exact host partition invariants", () => {
  it("has a real, non-empty internal route census with one shared cloak target", () => {
    expect(EXPECTED_INTERNAL_ROUTE_PAGES.length).toBeGreaterThan(0);
    expect(internalOpsPages()).toEqual(EXPECTED_INTERNAL_ROUTE_PAGES);
    expect(existsSync(resolve(ROOT, CLOAK_PATH)), `${CLOAK_PATH} must exist`).toBe(true);
  });

  it("terminates the cloak page with root notFound() before any JSX can stream", () => {
    expect(existsSync(resolve(ROOT, CLOAK_PATH)), `${CLOAK_PATH} must exist`).toBe(true);
    if (!existsSync(resolve(ROOT, CLOAK_PATH))) return;

    const text = source(CLOAK_PATH);
    const file = ts.createSourceFile(CLOAK_PATH, text, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const importsNotFound = file.statements.some(
      (statement) =>
        ts.isImportDeclaration(statement) &&
        statement.moduleSpecifier.getText(file) === '"next/navigation"' &&
        statement.importClause?.namedBindings !== undefined &&
        ts.isNamedImports(statement.importClause.namedBindings) &&
        statement.importClause.namedBindings.elements.some(
          (element) => (element.propertyName ?? element.name).text === "notFound",
        ),
    );
    expect(importsNotFound, "cloak must use Next's root notFound() primitive").toBe(true);

    const defaultFunction = file.statements.find(
      (statement): statement is ts.FunctionDeclaration =>
        ts.isFunctionDeclaration(statement) &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword) === true,
    );
    expect(defaultFunction, "cloak must export one default page function").toBeDefined();
    const statements = defaultFunction?.body?.statements ?? [];
    expect(statements.length, "cloak page cannot be empty").toBeGreaterThan(0);
    expect(statements[0]?.getText(file)).toMatch(/^notFound\(\);?$/);
    expect(statements.some((statement) => ts.isReturnStatement(statement))).toBe(false);
  });

  it("keeps the root 404 byte-stable and adds no scoped 404 body", () => {
    expect(sha256(source(ROOT_NOT_FOUND_PATH))).toBe(ROOT_NOT_FOUND_SHA256);
    expect(scopedNotFoundFiles()).toEqual([]);
  });

  it("keeps one Proxy entry point database-free and authorization-free", () => {
    expect(existsSync(resolve(ROOT, PROXY_PATH))).toBe(true);
    expect(existsSync(resolve(ROOT, "src/middleware.ts"))).toBe(false);

    const text = source(PROXY_PATH);
    expect(text).toContain("export function proxy");
    expect(text).toContain('from "@/lib/app-origins"');
    expect(text).toContain('matcher: ["/:path*"]');
    expect(text).not.toMatch(/@\/lib\/(?:auth|db)(?:[\/"])/);
    expect(identifiers(text)).not.toEqual(
      expect.arrayContaining(["requireStaff", "assertStaff", "getSession", "auth", "db"]),
    );
  });

  it("keeps the existing layout, page, and action authorization layers intact", () => {
    expect(source("src/app/(ops)/ops/layout.tsx")).toMatch(/await\s+assertStaff\(\)/);
    expect(source("src/app/(ops)/ops/page.tsx")).toMatch(/await\s+requireStaff\(\)/);

    const actionFiles = readdirSync(resolve(ROOT, "src/app/actions"))
      .filter((name) => /^ops-.*\.ts$/.test(name))
      .map((name) => `src/app/actions/${name}`);
    expect(actionFiles.length, "the action guard census cannot be empty").toBeGreaterThan(0);
    for (const path of actionFiles) {
      if (path.endsWith("/ops-auth.ts")) {
        expect(source(path)).toContain("requireOpsMutationOrigin");
      } else {
        expect(source(path)).toContain("requireStaff");
      }
    }
  });

  it("keeps staff invitation GET read-only and every inactive token on one neutral surface", () => {
    expect(existsSync(resolve(ROOT, INVITE_PAGE_PATH)), `${INVITE_PAGE_PATH} must exist`).toBe(true);
    expect(existsSync(resolve(ROOT, INVITE_LOADING_PATH)), `${INVITE_LOADING_PATH} must exist`).toBe(
      true,
    );
    expect(existsSync(resolve(ROOT, INVITE_FORM_PATH)), `${INVITE_FORM_PATH} must exist`).toBe(true);
    if (
      !existsSync(resolve(ROOT, INVITE_PAGE_PATH)) ||
      !existsSync(resolve(ROOT, INVITE_LOADING_PATH)) ||
      !existsSync(resolve(ROOT, INVITE_FORM_PATH))
    ) {
      return;
    }

    const page = source(INVITE_PAGE_PATH);
    const loading = source(INVITE_LOADING_PATH);
    const form = source(INVITE_FORM_PATH);
    expect(page).toContain("inspectStaffInvitation");
    expect(page).not.toContain("acceptStaffInvitation(");
    expect(page).toContain("This invitation is no longer active");
    expect(page).toContain(
      "Ask the FitOut staff member who invited you to send a new invitation.",
    );
    expect(page).toContain('href="/login"');
    expect(form).toContain("acceptStaffInviteAction");
    expect(form).toContain('name="name"');
    expect(form).toContain('name="password"');
    expect(form).not.toContain('name="email"');
    expect(form).toContain('autoComplete="name"');
    expect(form).toContain('autoComplete="new-password"');
    expect(loading).toContain('label="Loading your staff invitation"');
  });

  it("pins one exact dynamic Better Auth origin authority with host-only uncached sessions", () => {
    const authSource = source(AUTH_PATH);
    const authOptions = betterAuthOptions(authSource);
    expect(authOptions, "src/lib/auth.ts must contain the one Better Auth instance").toBeDefined();
    expect(authSource.match(/\bbetterAuth\s*\(/g)).toHaveLength(1);

    const baseURL = property(authOptions, "baseURL")?.initializer;
    expect(baseURL !== undefined && ts.isObjectLiteralExpression(baseURL)).toBe(true);
    const dynamicBaseURL = baseURL && ts.isObjectLiteralExpression(baseURL) ? baseURL : undefined;
    expect(property(dynamicBaseURL, "allowedHosts")?.initializer.getText()).toBe(
      "AUTH_ALLOWED_HOSTS",
    );
    expect(property(dynamicBaseURL, "fallback")?.initializer.getText()).toBe("PUBLIC_APP_ORIGIN");
    expect(property(dynamicBaseURL, "protocol")?.initializer.getText()).toBe("\"auto\"");
    expect(property(authOptions, "trustedOrigins")?.initializer.getText()).toBe(
      "AUTH_TRUSTED_ORIGINS",
    );

    const session = property(authOptions, "session")?.initializer;
    expect(session !== undefined && ts.isObjectLiteralExpression(session)).toBe(true);
    expect(
      property(session && ts.isObjectLiteralExpression(session) ? session : undefined, "cookieCache"),
    ).toBeUndefined();

    const advanced = property(authOptions, "advanced")?.initializer;
    expect(advanced !== undefined && ts.isObjectLiteralExpression(advanced)).toBe(true);
    const advancedOptions =
      advanced && ts.isObjectLiteralExpression(advanced) ? advanced : undefined;
    expect(property(advancedOptions, "trustedProxyHeaders")?.initializer.getText()).toBe("false");
    expect(property(advancedOptions, "crossSubDomainCookies")).toBeUndefined();

    const originsSource = source(APP_ORIGINS_PATH);
    expect(originsSource).toContain("export const AUTH_ALLOWED_HOSTS");
    expect(originsSource).toContain("export const AUTH_TRUSTED_ORIGINS");
    expect(originsSource).not.toMatch(/["'`]\*[^"'`]*["'`]/);
  });
});
