import { beforeEach, describe, expect, it, vi } from "vitest";

const fixture = vi.hoisted(() => ({
  calls: [] as { text: string; values: unknown[] }[],
  cleanup: vi.fn(), failDelete: false, failSeed: false,
}));
vi.mock("../../e2e/helpers/marketing-fixtures", () => {
  function query(strings: TemplateStringsArray | string[], ...values: unknown[]) {
    if (!("raw" in strings)) return strings;
    const text = strings.join("?").replace(/\s+/g, " ").trim();
    fixture.calls.push({ text, values });
    if (text.startsWith("SELECT id")) return Promise.resolve([{ id: "ambient-published" }]);
    if (fixture.failDelete && text.startsWith("DELETE FROM notification")) return Promise.reject(new Error("owned cleanup refused"));
    return Promise.resolve([]);
  }
  const sql = Object.assign(query, { begin: async (callback: (tx: typeof query) => Promise<unknown>) => callback(query) });
  return { assertMarketingSafety: vi.fn(), marketingFixture: async () => ({ sql, hostId: "owned-host", listingId: "owned-listing", cleanup: fixture.cleanup }) };
});
vi.mock("../../scripts/lib/marketing-spaces.mjs", () => ({
  seedMarketingSpaces: async () => {
    if (fixture.failSeed) throw new Error("owned seed refused");
    return ["owned-listing", "owned-listing-2"];
  },
}));
import { marketingGallery } from "../../e2e/helpers/marketing-gallery";

beforeEach(() => { fixture.calls.length = 0; fixture.cleanup.mockReset(); fixture.failDelete = false; fixture.failSeed = false; });
describe("marketing capture catalog restoration", () => {
  it("does not hide ambient listings for ordinary gallery users", async () => {
    const gallery = await marketingGallery(); await gallery.cleanup();
    expect(fixture.calls.some((call) => call.text.startsWith("UPDATE listing SET status"))).toBe(false);
    expect(fixture.cleanup).toHaveBeenCalledOnce();
  });
  it("restores exactly the captured ambient IDs after a failed owned cleanup", async () => {
    const gallery = await marketingGallery({ isolateCatalog: true });
    fixture.failDelete = true;
    await expect(gallery.cleanup()).rejects.toThrow("owned cleanup refused");
    const restore = fixture.calls.find((call) => call.text.startsWith("UPDATE listing SET status = 'published'"));
    expect(restore?.values).toEqual([["ambient-published"]]);
    expect(restore?.text).toContain("AND status = 'draft'");
    expect(fixture.cleanup).toHaveBeenCalledOnce();
  });
  it("closes the owned fixture when gallery seeding fails before a snapshot exists", async () => {
    fixture.failSeed = true;
    await expect(marketingGallery({ isolateCatalog: true })).rejects.toThrow("owned seed refused");
    expect(fixture.calls.some((call) => call.text.startsWith("UPDATE listing SET status"))).toBe(false);
    expect(fixture.cleanup).toHaveBeenCalledOnce();
  });
});
