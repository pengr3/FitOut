import { marketingFixture, assertMarketingSafety } from "./marketing-fixtures";
// Shared with the guarded isolated Preview seed; no app UI is mocked or replaced.
import { seedMarketingSpaces } from "../../scripts/lib/marketing-spaces.mjs";

export async function marketingGallery() {
  assertMarketingSafety();
  const fixture = await marketingFixture();
  let listingIds: string[] = [];
  try {
    listingIds = await fixture.sql.begin(async (sql) => seedMarketingSpaces(sql, fixture.hostId, { firstListingId: fixture.listingId }));
  } catch (error) { await fixture.cleanup(); throw error; }
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
      await fixture.sql`DELETE FROM notification WHERE booking_id IN (SELECT id FROM booking WHERE listing_id IN ${fixture.sql(listingIds)})`;
      await fixture.sql`DELETE FROM booking WHERE listing_id IN ${fixture.sql(listingIds)}`;
      await fixture.sql`DELETE FROM listing WHERE id IN ${fixture.sql(listingIds)}`;
      await fixture.cleanup();
    },
  };
}
