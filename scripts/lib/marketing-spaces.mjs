import { randomUUID } from "node:crypto";

// Synthetic venue content only. Photographs are licensed reference images, not actual partners.
export const marketingSpaces = [
  { key: "basketball", title: "Courtside Basketball", type: "basketball_court", tag: "basketball", rate: 85000, capacity: 16, description: "An indoor court for a game with friends. Bring your ball and book the court for your group." },
  { key: "tennis", title: "The Afternoon Court", type: "tennis_court", tag: "tennis", rate: 65000, capacity: 4, description: "A blue outdoor tennis court with room for singles or doubles. Bring your rackets and enjoy a session together." },
  { key: "badminton", title: "Bluebird Sports Hall", type: "multi_sport_court", tag: "badminton", rate: 45000, capacity: 8, description: "Indoor badminton courts with high ceilings and bright lighting. A space for your next doubles game or practice." },
  { key: "gym", title: "The Training Floor", type: "gym_fitness_floor", tag: "weightlifting", rate: 70000, capacity: 6, description: "A fitness floor with weights, benches and training machines. Make time for a workout with your training partners." },
  { key: "studio", title: "Daylight Movement Studio", type: "dance_studio", tag: "dance", rate: 60000, capacity: 12, description: "A light-filled mirrored studio for movement and dance practice. An open floor to work on your next routine." },
];

export const referenceImages = {
  basketball: "https://images.pexels.com/photos/4946389/pexels-photo-4946389.jpeg?auto=compress&cs=tinysrgb&w=1800",
  tennis: "https://images.unsplash.com/photo-1678734491865-d4dc8a5f5399?auto=format&fit=crop&w=1800&q=85",
  badminton: "https://images.unsplash.com/photo-1775993167393-f2add1f8eec2?auto=format&fit=crop&w=1800&q=85",
  gym: "https://images.unsplash.com/photo-1561214078-f3247647fc5e?auto=format&fit=crop&w=1800&q=85",
  studio: "https://images.pexels.com/photos/7319683/pexels-photo-7319683.jpeg?auto=compress&cs=tinysrgb&w=1800",
};
export async function seedMarketingSpaces(sql, hostId, { firstListingId, assetOrigin = "", remotePhotos = false, prefix = "marketing_gallery" } = {}) {
  const ids = [];
  for (const [index, space] of marketingSpaces.entries()) {
    const id = index === 0 && firstListingId ? firstListingId : `${prefix}_${space.key}_${randomUUID()}`;
    if (index === 0 && firstListingId) {
      await sql`UPDATE listing SET title=${space.title}, description=${space.description}, primary_space_type=${space.type}, hourly_rate_cents=${space.rate}, day_rate_cents=NULL, max_occupancy=${space.capacity}, cancellation_policy='flexible' WHERE id=${id} AND host_id=${hostId}`;
      await sql`DELETE FROM listing_activity_tag WHERE listing_id=${id} AND listing_id IN (SELECT id FROM listing WHERE host_id=${hostId})`;
    } else {
      await sql`INSERT INTO listing (id, host_id, title, description, primary_space_type, address_line1, city, region, postal_code, country, neighborhood, location, show_exact_address, max_occupancy, unit_count, timezone, hourly_rate_cents, occupancy_mode, currency, booking_mode, cancellation_policy, status, review_state, published_at, created_at, updated_at) VALUES (${id}, ${hostId}, ${space.title}, ${space.description}, ${space.type}, 'Preview venue address', 'Makati', 'Metro Manila', '1210', 'Philippines', 'Poblacion', ST_SetSRID(ST_MakePoint(${121.03076 + index * 0.002}, ${14.56546 + index * 0.002}),4326), false, ${space.capacity}, 1, 'Asia/Manila', ${space.rate}, 'exclusive', 'php', 'instant', 'flexible', 'published', 'approved', now(), now(), now())`;
      for (let day = 0; day < 7; day++) await sql`INSERT INTO operating_hours (id, listing_id, day_of_week, open_time, close_time, created_at) VALUES (${randomUUID()}, ${id}, ${day}, '06:00', '21:00', now())`;
    }
    await sql`INSERT INTO listing_activity_tag (listing_id, tag) VALUES (${id}, ${space.tag}) ON CONFLICT DO NOTHING`;
    await sql`INSERT INTO listing_photo (id, listing_id, public_id, url, position) VALUES (${randomUUID()}, ${id}, ${`preview-reference-${space.key}`}, ${remotePhotos ? referenceImages[space.key] : `${assetOrigin}/marketing/photos/${space.key}.jpg`}, 0)`;
    for (const amenity of ["restrooms", "drinking_water"]) await sql`INSERT INTO listing_amenity (listing_id, amenity) VALUES (${id}, ${amenity}) ON CONFLICT DO NOTHING`;
    ids.push(id);
  }
  return ids;
}
