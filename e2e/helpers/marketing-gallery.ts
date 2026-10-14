import { marketingFixture, assertMarketingSafety } from "./marketing-fixtures";
// Shared with the guarded isolated Preview seed; no app UI is mocked or replaced.
import { seedMarketingSpaces } from "../../scripts/lib/marketing-spaces.mjs";

export async function marketingGallery({ isolateCatalog = false } = {}) {
  assertMarketingSafety();
  const fixture = await marketingFixture();
  let listingIds: string[] = [];
  let hiddenListingIds: string[] = [];
  async function restoreCatalog() {
    assertMarketingSafety();
    if (hiddenListingIds.length) {
      await fixture.sql`UPDATE listing SET status = 'published' WHERE id IN ${fixture.sql(hiddenListingIds)} AND status = 'draft'`;
      hiddenListingIds = [];
    }
  }
  try {
    listingIds = await fixture.sql.begin(async (sql) => seedMarketingSpaces(sql, fixture.hostId, { firstListingId: fixture.listingId }));
    if (isolateCatalog) {
      // The capture owns an exclusive single-worker window on the guarded test DB.
      // Preserve exact ambient published IDs; restore only those rows in cleanup.
      hiddenListingIds = await fixture.sql.begin(async (sql) => {
        const rows = await sql<{ id: string }[]>`SELECT id FROM listing WHERE status = 'published' AND id NOT IN ${sql(listingIds)} FOR UPDATE`;
        const ids = rows.map((row) => row.id);
        if (ids.length) await sql`UPDATE listing SET status = 'draft' WHERE id IN ${sql(ids)}`;
        return ids;
      });
    }
  } catch (error) {
    try { await restoreCatalog(); } finally { await fixture.cleanup(); }
    throw error;
  }
  return {
    ...fixture,
    listingIds,
    title: "Courtside Basketball",
    async readyHost(userId: string) {
      await fixture.readyHost(userId);
      await fixture.sql`UPDATE listing SET host_id=${userId} WHERE id IN ${fixture.sql(listingIds)}`;
    },
    async cleanup() {
      assertMarketingSafety();
      try {
        await fixture.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id IN ${fixture.sql(listingIds)})`;
        await fixture.sql`DELETE FROM booking WHERE listing_id IN ${fixture.sql(listingIds)}`;
        await fixture.sql`DELETE FROM listing WHERE id IN ${fixture.sql(listingIds)}`;
      } finally {
        try { await restoreCatalog(); } finally { await fixture.cleanup(); }
      }
    },
  };
}
