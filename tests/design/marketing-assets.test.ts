import { describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

const root = resolve("public/marketing/screenshots");
const names = ["search", "account", "verification", "listing", "bookable", "session", "booking"];
const manifest = JSON.parse(readFileSync(resolve(root, "manifest.json"), "utf8"));
const allowed = new Set(names.map((name) => `/marketing/screenshots/${name}.png`));

// Parse code, not explanatory comments. Include static image imports and image
// strings used by shared step data as well as direct JSX sources.
function imageSources(code: string) {
  const tree = ts.createSourceFile("marketing.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const sources: string[] = [];
  function visit(node: ts.Node) {
    if ((ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) && /\.(png|jpe?g|webp|gif|avif|svg)(?:[?#].*)?$/i.test(node.text)) sources.push(node.text);
    if (ts.isJsxAttribute(node) && node.name.getText(tree) === "src" && node.initializer && ts.isStringLiteral(node.initializer) && !sources.includes(node.initializer.text)) sources.push(node.initializer.text);
    ts.forEachChild(node, visit);
  }
  visit(tree);
  return [...new Set(sources)];
}

function marketingModules(directory: string): string[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = resolve(directory, entry.name);
    return entry.isDirectory() ? marketingModules(path) : /\.(tsx?|jsx?)$/.test(entry.name) ? [path] : [];
  });
}

describe("authentic marketing asset contract", () => {
  it("contains exactly seven inspected browser captures with matching PNG bytes and safe provenance", () => {
    expect(Object.keys(manifest.captures).sort()).toEqual([...names].sort());
    expect(readdirSync(root).filter((name) => name.endsWith(".png")).sort()).toEqual(names.map((name) => `${name}.png`).sort());
    for (const name of names) {
      const entry = manifest.captures[name];
      const bytes = readFileSync(resolve(root, `${name}.png`));
      expect(bytes.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
      expect(entry.path).toBe(`/marketing/screenshots/${name}.png`);
      expect(entry.sha256).toBe(createHash("sha256").update(bytes).digest("hex"));
      expect(entry.width).toBe(bytes.readUInt32BE(16));
      expect(entry.height).toBe(bytes.readUInt32BE(20));
      expect(entry.width).toBeGreaterThan(0);
      expect(entry.height).toBeGreaterThan(0);
      expect(entry.route).toMatch(/^\/(?:\?|[a-z]|$)/);
      expect(entry.route).not.toMatch(/(?:hold|token|email|account|session_id)=/i);
      expect(entry.assertedState.length).toBeGreaterThan(20);
      expect(entry.timezone).toBe("Asia/Manila");
      expect(entry.captureDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(entry.capturedAt))).toBe(false);
      const manilaDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Manila", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(entry.capturedAt));
      expect(entry.captureDate).toBe(manilaDate);
      expect(Array.isArray(entry.fixtureIds)).toBe(true);
      expect(entry.provenance).toMatchObject({ source: "actual-local-app-browser", fixture: "e2e/helpers/marketing-fixtures.ts", demoState: true, providersCalled: false, paymentConfirmed: false });
      expect(entry.provenance.imagery).toContain("No photographs");
      expect(entry.pixelReview.disposition).toBe("approved-safe");
      expect(entry.pixelReview.reviewedSha256).toBe(entry.sha256);
      expect(entry.pixelReview.reviewer).toMatch(/image viewer/i);
      expect(entry.pixelReview.notes.length).toBeGreaterThan(30);
      if (name === "session" || name === "booking") {
        expect(entry.sessionDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(entry.sessionDate > entry.captureDate).toBe(true);
        expect(Date.parse(entry.sessionDate) - Date.parse(entry.captureDate)).toBeLessThan(90 * 86400000);
      }
    }
  });

  it("published marketing image sources use only manifest screenshots", () => {
    const modules = [...marketingModules(resolve("src/app/marketing")), ...marketingModules(resolve("src/components/marketing"))];
    for (const file of modules) {
      for (const source of imageSources(readFileSync(file, "utf8"))) {
        expect(allowed.has(source), `${file}: unapproved image source ${source}`).toBe(true);
      }
    }
  });

  it("checks image syntax without treating comments as approved usage", () => {
    expect(imageSources('// Do not use sketch.png\n<Image src="/marketing/screenshots/search.png" />')).toEqual(["/marketing/screenshots/search.png"]);
    expect(imageSources('import photo from "./generated.png"; <img src="https://stock.example/photo.jpg" />')).toEqual(["./generated.png", "https://stock.example/photo.jpg"]);
    expect(imageSources('<img src="/sketch/unapproved" />')).toEqual(["/sketch/unapproved"]);
  });
});
